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

    // Map folder names
    const folderMap: Record<string, string> = {
      inbox: "INBOX",
      sent: "[Gmail]/Enviados",
      archive: "Archive",
      trash: "[Gmail]/Lixeira",
      INBOX: "INBOX",
    };

    const imapFolder = folderMap[folder] || folder;
    let mailbox;
    let openedFolder = imapFolder;
    try {
      mailbox = await client.mailboxOpen(imapFolder);
    } catch (e) {
      console.log(`Could not open ${imapFolder}: ${e.message}`);
      const alternatives: Record<string, string[]> = {
        inbox: ["INBOX"],
        sent: ["Sent", "INBOX.Sent", "[Gmail]/Sent Mail", "Sent Items"],
        archive: ["INBOX.Archive", "Archives", "INBOX.Archives"],
        trash: ["Trash", "INBOX.Trash", "[Gmail]/Trash", "Deleted Items"],
      };
      const alts = alternatives[folder] || [];
      for (const alt of alts) {
        try {
          mailbox = await client.mailboxOpen(alt);
          openedFolder = alt;
          console.log(`Opened alternative folder: ${alt}`);
          break;
        } catch {
          continue;
        }
      }
      if (!mailbox) {
        await client.logout();
        return new Response(
          JSON.stringify({ error: "Pasta não encontrada" }),
          { status: 404, headers: corsHeaders }
        );
      }
    }

    console.log(`Folder opened: ${openedFolder}, exists: ${mailbox.exists}, deleting UID: ${uid}`);

    // Try to move to trash first, if not already in trash
    if (folder !== "trash") {
      const trashFolders = [
        "[Gmail]/Lixeira",
        "[Gmail]/Trash",
        "Trash",
        "INBOX.Trash",
        "Deleted Items",
        "Deleted Messages",
      ];

      let moved = false;
      for (const trashFolder of trashFolders) {
        try {
          const result = await client.messageMove(uid.toString(), trashFolder, { uid: true });
          console.log(`Moved UID ${uid} to ${trashFolder}, result: ${JSON.stringify(result)}`);

          // Some servers return false even when the command is accepted.
          // In these cases we still force removal from the source folder below.
          moved = true;
          break;
        } catch (e) {
          console.log(`Move to ${trashFolder} failed: ${e.message}`);
          continue;
        }
      }

      // Ensure the message is actually removed from the source folder.
      // This fixes providers where MOVE behaves like COPY or returns ambiguous results.
      try {
        await client.mailboxOpen(openedFolder);
        await client.messageFlagsAdd(uid.toString(), ["\\Deleted"], { uid: true });
        await client.messageDelete(uid.toString(), { uid: true });
        console.log(`Ensured source removal for UID ${uid} from ${openedFolder}`);
      } catch (e) {
        console.log(`Source removal skipped/failed for UID ${uid}: ${e.message}`);
      }

      if (!moved) {
        await client.logout();
        return new Response(
          JSON.stringify({ error: "Não foi possível mover o e-mail para a lixeira" }),
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      // Already in trash — permanently delete
      try {
        await client.messageFlagsAdd(uid.toString(), ["\\Deleted"], { uid: true });
        await client.messageDelete(uid.toString(), { uid: true });
        console.log(`Permanently deleted UID ${uid} from trash`);
      } catch (e) {
        console.error(`Permanent delete failed: ${e.message}`);
        throw e;
      }
    }

    await client.logout();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("delete-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao excluir e-mail" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
