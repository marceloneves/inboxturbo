import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";
import { simpleParser } from "npm:mailparser@3.7.2";
import { Buffer } from "node:buffer";

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

    const {
      account_id,
      folder = "INBOX",
      page = 1,
      limit = 50,
      uid,
    } = await req.json();

    // Get account credentials
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
    try {
      mailbox = await client.mailboxOpen(imapFolder);
    } catch {
      // Try common alternatives
      const alternatives: Record<string, string[]> = {
        sent: ["Sent", "INBOX.Sent", "[Gmail]/Sent Mail", "Sent Items"],
        archive: ["INBOX.Archive", "Archives", "INBOX.Archives"],
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
        mailbox = await client.mailboxOpen("INBOX");
      }
    }

    // If requesting a specific email by UID
    if (uid) {
      const rawSource = await client.download(uid.toString(), undefined, {
        uid: true,
      });
      const chunks: Uint8Array[] = [];
      for await (const chunk of rawSource.content) {
        chunks.push(chunk);
      }
      const buffer = new Uint8Array(
        chunks.reduce((acc, c) => acc + c.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      const parsed = await simpleParser(Buffer.from(buffer));

      await client.logout();

      const email = {
        uid,
        from: parsed.from?.text || "",
        from_email:
          parsed.from?.value?.[0]?.address || "",
        to: parsed.to
          ? (Array.isArray(parsed.to)
              ? parsed.to
              : [parsed.to]
            ).flatMap((t: { value: { address: string }[] }) =>
              t.value.map((v: { address: string }) => v.address)
            )
          : [],
        cc: parsed.cc
          ? (Array.isArray(parsed.cc)
              ? parsed.cc
              : [parsed.cc]
            ).flatMap((t: { value: { address: string }[] }) =>
              t.value.map((v: { address: string }) => v.address)
            )
          : [],
        subject: parsed.subject || "(sem assunto)",
        body: parsed.html || parsed.textAsHtml || parsed.text || "",
        date: parsed.date?.toISOString() || "",
        has_attachments: (parsed.attachments?.length || 0) > 0,
      };

      return new Response(JSON.stringify({ email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email list
    const total = mailbox.exists || 0;
    const emails: {
      uid: number;
      from: string;
      from_email: string;
      to: string[];
      subject: string;
      date: string;
      is_read: boolean;
      has_attachments: boolean;
      preview: string;
    }[] = [];

    if (total > 0) {
      const end = total;
      const start = Math.max(1, end - (page - 1) * limit - limit + 1);
      const rangeEnd = Math.max(1, end - (page - 1) * limit);

      for await (const msg of client.fetch(`${start}:${rangeEnd}`, {
        envelope: true,
        bodyStructure: true,
        flags: true,
        uid: true,
      })) {
        emails.push({
          uid: msg.uid,
          from:
            msg.envelope?.from?.[0]?.name ||
            msg.envelope?.from?.[0]?.address ||
            "",
          from_email: msg.envelope?.from?.[0]?.address || "",
          to:
            msg.envelope?.to?.map(
              (t: { address: string }) => t.address
            ) || [],
          subject: msg.envelope?.subject || "(sem assunto)",
          date: msg.envelope?.date?.toISOString() || "",
          is_read: msg.flags?.has("\\Seen") || false,
          has_attachments: hasAttachments(msg.bodyStructure),
          preview: "",
        });
      }
    }

    await client.logout();

    return new Response(
      JSON.stringify({
        emails: emails.reverse(),
        total,
        page,
        limit,
        account_id,
        account_name: account.friendly_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-emails error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao buscar e-mails" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function hasAttachments(bodyStructure: unknown): boolean {
  if (!bodyStructure) return false;
  const bs = bodyStructure as {
    type?: string;
    disposition?: string;
    dispositionParameters?: { filename?: string };
    childNodes?: unknown[];
  };
  // Only count explicit "attachment" disposition, ignore inline images (signatures, etc.)
  if (bs.disposition === "attachment") return true;
  if (bs.childNodes) {
    return bs.childNodes.some((child) => hasAttachments(child));
  }
  return false;
}
