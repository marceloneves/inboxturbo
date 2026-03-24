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

    const { account_id, uid, folder = "INBOX" } = await req.json();

    if (!account_id || !uid) {
      return new Response(
        JSON.stringify({ error: "account_id e uid são obrigatórios" }),
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

    const folderMap: Record<string, string> = {
      inbox: "INBOX",
      sent: "[Gmail]/Enviados",
      trash: "[Gmail]/Lixeira",
      INBOX: "INBOX",
    };

    const imapFolder = folderMap[folder] || folder;
    try {
      await client.mailboxOpen(imapFolder);
    } catch {
      const alternatives: Record<string, string[]> = {
        sent: ["Sent", "INBOX.Sent", "[Gmail]/Sent Mail", "Sent Items"],
        trash: ["Trash", "INBOX.Trash", "[Gmail]/Trash", "Deleted Items"],
      };
      const alts = alternatives[folder] || [];
      let opened = false;
      for (const alt of alts) {
        try {
          await client.mailboxOpen(alt);
          opened = true;
          break;
        } catch {
          continue;
        }
      }
      if (!opened) {
        await client.mailboxOpen("INBOX");
      }
    }

    // Mark as seen
    await client.messageFlagsAdd({ uid: uid.toString() }, ["\\Seen"], { uid: true });

    await client.logout();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("mark-read error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao marcar como lido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
