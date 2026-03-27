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

    const resolvedMailbox = await resolveMailboxPath(client, folder);
    if (!resolvedMailbox) {
      await client.logout();
      return new Response(
        JSON.stringify({
          emails: [],
          total: 0,
          page,
          limit,
          account_id,
          account_name: account.friendly_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailbox = await client.mailboxOpen(resolvedMailbox);

    // If requesting a specific email by UID
    if (uid) {
      const msg = await client.fetchOne(
        uid.toString(),
        {
          bodyStructure: true,
          envelope: true,
          uid: true,
        },
        { uid: true }
      );

      const textPartInfo = findTextPart(msg.bodyStructure);
      const attachments = findAttachmentParts(msg.bodyStructure);

      let body = "";

      if (textPartInfo && textPartInfo.part) {
        // Download only the text part, skip attachments entirely
        const rawSource = await client.download(
          uid.toString(),
          textPartInfo.part,
          { uid: true }
        );
        const chunks: Uint8Array[] = [];
        for await (const chunk of rawSource.content) {
          chunks.push(chunk);
        }
        const rawBuffer = Buffer.concat(chunks);

        // Decode transfer encoding
        const encoding = (textPartInfo.encoding || "7bit").toLowerCase();
        let decoded: Buffer;
        if (encoding === "base64") {
          decoded = Buffer.from(
            rawBuffer.toString("ascii").replace(/\s/g, ""),
            "base64"
          );
        } else if (encoding === "quoted-printable") {
          decoded = Buffer.from(
            decodeQP(rawBuffer.toString("ascii")),
            "binary"
          );
        } else {
          decoded = rawBuffer;
        }

        // Decode charset
        const charset = (textPartInfo.charset || "utf-8").toLowerCase();
        try {
          const enc =
            charset === "iso-8859-1" || charset === "latin1"
              ? "windows-1252"
              : charset;
          body = new TextDecoder(enc).decode(decoded);
        } catch {
          body = new TextDecoder("utf-8").decode(decoded);
        }

        if (textPartInfo.type === "text/plain") {
          body = `<pre style="white-space:pre-wrap;font-family:inherit;">${body
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre>`;
        }
      } else {
        // Fallback for simple non-multipart messages
        const rawSource = await client.download(uid.toString(), undefined, {
          uid: true,
        });
        const chunks: Uint8Array[] = [];
        for await (const chunk of rawSource.content) {
          chunks.push(chunk);
        }
        const rawBuffer = Buffer.concat(chunks);
        const parsed = await simpleParser(rawBuffer);
        body = parsed.html || parsed.textAsHtml || parsed.text || "";
      }

      await client.logout();

      const email = {
        uid,
        from:
          msg.envelope?.from?.[0]?.name ||
          msg.envelope?.from?.[0]?.address ||
          "",
        from_email: msg.envelope?.from?.[0]?.address || "",
        to:
          msg.envelope?.to
            ?.map((t: { address: string }) => t.address)
            .filter(Boolean) || [],
        cc:
          msg.envelope?.cc
            ?.map((c: { address: string }) => c.address)
            .filter(Boolean) || [],
        subject: msg.envelope?.subject || "(sem assunto)",
        body,
        date: msg.envelope?.date?.toISOString() || "",
        has_attachments: attachments.length > 0,
        attachments,
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

// --- Helpers ---

type MailboxInfo = {
  path: string;
  specialUse?: string | null;
};

async function resolveMailboxPath(
  client: ImapFlow,
  folder: string
): Promise<string | null> {
  const mailboxes = (await client.list()) as MailboxInfo[];
  const normalizedFolder = folder.toLowerCase();

  const specialUseMap: Record<string, string> = {
    inbox: "\\Inbox",
    sent: "\\Sent",
    archive: "\\Archive",
    trash: "\\Trash",
  };

  const specialUse = specialUseMap[normalizedFolder];
  if (specialUse) {
    const bySpecialUse = mailboxes.find(
      (mailbox) => mailbox.specialUse === specialUse
    );
    if (bySpecialUse) {
      return bySpecialUse.path;
    }
  }

  const candidates: Record<string, string[]> = {
    inbox: ["inbox"],
    sent: ["sent", "sent items", "enviados"],
    archive: ["archive", "archives", "arquivo", "arquivados"],
    trash: [
      "trash",
      "deleted items",
      "deleted messages",
      "lixeira",
      "papelera",
    ],
  };

  const excluded: Record<string, string[]> = {
    archive: ["all mail", "todos os e-mails"],
  };

  const folderCandidates = candidates[normalizedFolder] || [normalizedFolder];

  const byName = mailboxes.find((mailbox) => {
    const path = mailbox.path.toLowerCase();

    if (excluded[normalizedFolder]?.some((term) => path.includes(term))) {
      return false;
    }

    return folderCandidates.some(
      (candidate) =>
        path === candidate ||
        path.endsWith(`/${candidate}`) ||
        path.endsWith(`.${candidate}`) ||
        path.includes(candidate)
    );
  });

  return byName?.path ?? null;
}

function hasAttachments(bodyStructure: unknown): boolean {
  if (!bodyStructure) return false;
  const bs = bodyStructure as {
    type?: string;
    disposition?: string;
    dispositionParameters?: { filename?: string };
    childNodes?: unknown[];
  };
  if (bs.disposition === "attachment") return true;
  if (bs.childNodes) {
    return bs.childNodes.some((child) => hasAttachments(child));
  }
  return false;
}

function findTextPart(
  bs: unknown
): {
  part?: string;
  type: string;
  charset?: string;
  encoding?: string;
} | null {
  if (!bs) return null;
  const node = bs as {
    type?: string;
    part?: string;
    parameters?: { charset?: string };
    encoding?: string;
    disposition?: string;
    childNodes?: unknown[];
  };
  const type = (node.type || "").toLowerCase();

  if (type === "text/html") {
    return {
      part: node.part,
      type,
      charset: node.parameters?.charset,
      encoding: node.encoding,
    };
  }
  if (type === "text/plain" && node.disposition !== "attachment") {
    return {
      part: node.part,
      type,
      charset: node.parameters?.charset,
      encoding: node.encoding,
    };
  }

  if (node.childNodes) {
    let plainPart: {
      part?: string;
      type: string;
      charset?: string;
      encoding?: string;
    } | null = null;
    for (const child of node.childNodes) {
      const found = findTextPart(child);
      if (found) {
        if (found.type === "text/html") return found;
        if (!plainPart) plainPart = found;
      }
    }
    return plainPart;
  }

  return null;
}

function findAttachmentParts(
  bs: unknown
): Array<{
  part: string;
  filename: string;
  contentType: string;
  size: number;
}> {
  if (!bs) return [];
  const node = bs as {
    type?: string;
    part?: string;
    size?: number;
    disposition?: string;
    dispositionParameters?: { filename?: string };
    parameters?: { name?: string };
    childNodes?: unknown[];
  };

  const results: Array<{
    part: string;
    filename: string;
    contentType: string;
    size: number;
  }> = [];

  if (node.disposition === "attachment") {
    results.push({
      part: node.part || "1",
      filename:
        node.dispositionParameters?.filename ||
        node.parameters?.name ||
        "attachment",
      contentType: node.type || "application/octet-stream",
      size: node.size || 0,
    });
  }

  if (node.childNodes) {
    for (const child of node.childNodes) {
      results.push(...findAttachmentParts(child));
    }
  }

  return results;
}

function decodeQP(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(
      /=([0-9A-Fa-f]{2})/g,
      (_, hex) => String.fromCharCode(parseInt(hex, 16))
    );
}
