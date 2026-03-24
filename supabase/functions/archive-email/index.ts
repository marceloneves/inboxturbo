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

    const { account_id, folder = "inbox", uid } = await req.json();

    if (!account_id || !uid) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: account_id, uid" }),
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

    // Map folder names to IMAP paths
    const folderMap: Record<string, string> = {
      inbox: "INBOX",
      sent: "[Gmail]/Enviados",
      trash: "[Gmail]/Lixeira",
      INBOX: "INBOX",
    };

    const imapFolder = folderMap[folder] || folder;
    let mailbox;
    try {
      mailbox = await client.mailboxOpen(imapFolder);
    } catch {
      const alternatives: Record<string, string[]> = {
        inbox: ["INBOX"],
        sent: ["Sent", "INBOX.Sent", "[Gmail]/Sent Mail", "Sent Items"],
        trash: ["Trash", "INBOX.Trash", "[Gmail]/Trash", "Deleted Items"],
      };
      const alts = alternatives[folder] || [];
      for (const alt of alts) {
        try {
          mailbox = await client.mailboxOpen(alt);
          break;
        } catch {
          continue;
        }
      }
      if (!mailbox) {
        await client.logout();
        return new Response(
          JSON.stringify({ error: "Pasta de origem não encontrada" }),
          { status: 404, headers: corsHeaders }
        );
      }
    }

    // Try to find the archive folder and move the message
    const archiveFolders = [
      "Archive",
      "INBOX.Archive",
      "Archives",
      "INBOX.Archives",
    ];

    let moved = false;
    for (const archiveFolder of archiveFolders) {
      try {
        await client.messageMove(uid.toString(), archiveFolder, { uid: true });
        moved = true;
        break;
      } catch {
        continue;
      }
    }

    if (!moved) {
      await client.logout();
      return new Response(
        JSON.stringify({ error: "Pasta de arquivo não encontrada no servidor de e-mail" }),
        { status: 404, headers: corsHeaders }
      );
    }

    await client.logout();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("archive-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao arquivar e-mail" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
