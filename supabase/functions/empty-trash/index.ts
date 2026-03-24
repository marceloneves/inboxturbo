import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } =
      await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { account_id } = await req.json();

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: "Campo obrigatório: account_id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: account, error: accError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", account_id)
      .single();

    if (accError || !account) {
      return new Response(
        JSON.stringify({ error: "Conta não encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!account.imap_host || !account.username || !account.password) {
      return new Response(
        JSON.stringify({ error: "Credenciais IMAP não configuradas" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port || 993,
      secure: true,
      auth: {
        user: account.username,
        pass: account.password,
      },
      logger: false,
    });

    await client.connect();

    // Try to open trash folder
    const trashFolders = [
      "[Gmail]/Lixeira",
      "[Gmail]/Trash",
      "Trash",
      "INBOX.Trash",
      "Deleted Items",
    ];

    let mailbox = null;
    for (const trashFolder of trashFolders) {
      try {
        mailbox = await client.mailboxOpen(trashFolder);
        break;
      } catch {
        continue;
      }
    }

    if (!mailbox) {
      await client.logout();
      return new Response(
        JSON.stringify({ error: "Pasta de lixeira não encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const total = mailbox.exists || 0;

    if (total > 0) {
      // Flag all messages as deleted and expunge
      await client.messageFlagsAdd("1:*", ["\\Deleted"]);
      await client.messageDelete("1:*");
    }

    await client.logout();

    return new Response(
      JSON.stringify({ success: true, deleted: total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("empty-trash error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao esvaziar lixeira" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
