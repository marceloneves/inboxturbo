import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MailboxInfo = {
  path: string;
  specialUse?: string | null;
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

    // Resolve source folder dynamically
    const sourceMailbox = await resolveMailboxPath(client, folder);
    if (!sourceMailbox) {
      await client.logout();
      return new Response(
        JSON.stringify({ error: "Pasta de origem não encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const isAlreadyInTrash = folder === "trash";

    if (isAlreadyInTrash) {
      // Permanently delete from trash
      await client.mailboxOpen(sourceMailbox);
      await client.messageFlagsAdd(uid.toString(), ["\\Deleted"], { uid: true });
      await client.messageDelete(uid.toString(), { uid: true });
      console.log(`Permanently deleted UID ${uid} from ${sourceMailbox}`);
    } else {
      // Move to trash using Copy + Delete (reliable strategy)
      const trashMailbox = await resolveMailboxPath(client, "trash");
      if (!trashMailbox) {
        await client.logout();
        return new Response(
          JSON.stringify({ error: "Pasta de lixeira não encontrada no servidor" }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`Moving UID ${uid} from ${sourceMailbox} to trash (${trashMailbox})`);

      // Copy to trash
      await client.mailboxOpen(sourceMailbox);
      await client.messageCopy(uid.toString(), trashMailbox, { uid: true });

      // Delete from source
      await client.mailboxOpen(sourceMailbox);
      await client.messageFlagsAdd(uid.toString(), ["\\Deleted"], { uid: true });
      await client.messageDelete(uid.toString(), { uid: true });

      console.log(`Successfully moved UID ${uid} to ${trashMailbox}`);
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

async function resolveMailboxPath(client: ImapFlow, folder: string): Promise<string | null> {
  const mailboxes = (await client.list()) as MailboxInfo[];
  const normalizedFolder = folder.toLowerCase();

  // Try special-use flags first (most reliable)
  const specialUseMap: Record<string, string> = {
    inbox: "\\Inbox",
    sent: "\\Sent",
    archive: "\\Archive",
    trash: "\\Trash",
  };

  const specialUse = specialUseMap[normalizedFolder];
  if (specialUse) {
    const bySpecialUse = mailboxes.find((m) => m.specialUse === specialUse);
    if (bySpecialUse) return bySpecialUse.path;
  }

  // Fallback to name matching
  const candidates: Record<string, string[]> = {
    inbox: ["inbox"],
    sent: ["sent", "sent items", "enviados"],
    archive: ["archive", "archives", "arquivo", "arquivados"],
    trash: ["trash", "deleted items", "deleted messages", "lixeira", "papelera"],
  };

  const excluded: Record<string, string[]> = {
    archive: ["all mail", "todos os e-mails"],
  };

  const folderCandidates = candidates[normalizedFolder] || [normalizedFolder];

  const byName = mailboxes.find((mailbox) => {
    const path = mailbox.path.toLowerCase();
    if (excluded[normalizedFolder]?.some((term) => path.includes(term))) return false;
    return folderCandidates.some(
      (c) => path === c || path.endsWith(`/${c}`) || path.endsWith(`.${c}`) || path.includes(c)
    );
  });

  return byName?.path ?? null;
}
