import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";
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

    const { account_id, folder = "INBOX", uid, part } = await req.json();

    if (!account_id || !uid || !part) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
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
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: corsHeaders }
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

    // Resolve mailbox
    const mailboxes = (await client.list()) as Array<{
      path: string;
      specialUse?: string | null;
    }>;
    const normalizedFolder = folder.toLowerCase();
    const specialUseMap: Record<string, string> = {
      inbox: "\\Inbox",
      sent: "\\Sent",
      archive: "\\Archive",
      trash: "\\Trash",
    };
    const specialUse = specialUseMap[normalizedFolder];
    let resolvedPath: string | null = null;
    if (specialUse) {
      const found = mailboxes.find((m) => m.specialUse === specialUse);
      if (found) resolvedPath = found.path;
    }
    if (!resolvedPath) {
      const found = mailboxes.find((m) =>
        m.path.toLowerCase().includes(normalizedFolder)
      );
      resolvedPath = found?.path || "INBOX";
    }

    await client.mailboxOpen(resolvedPath);

    // Get body structure to find the encoding
    const msg = await client.fetchOne(uid.toString(), {
      bodyStructure: true,
      uid: true,
    });

    const partInfo = findPartInfo(msg.bodyStructure, part);

    // Download the specific MIME part
    const rawSource = await client.download(uid.toString(), part, {
      uid: true,
    });
    const chunks: Uint8Array[] = [];
    for await (const chunk of rawSource.content) {
      chunks.push(chunk);
    }
    const rawBuffer = Buffer.concat(chunks);

    // Decode transfer encoding
    const encoding = (partInfo?.encoding || "base64").toLowerCase();
    let decoded: Buffer;
    if (encoding === "base64") {
      decoded = Buffer.from(
        rawBuffer.toString("ascii").replace(/\s/g, ""),
        "base64"
      );
    } else if (encoding === "quoted-printable") {
      const str = rawBuffer
        .toString("ascii")
        .replace(/=\r?\n/g, "")
        .replace(
          /=([0-9A-Fa-f]{2})/g,
          (_, hex) => String.fromCharCode(parseInt(hex, 16))
        );
      decoded = Buffer.from(str, "binary");
    } else {
      decoded = rawBuffer;
    }

    await client.logout();

    // Return as base64
    const base64Data = decoded.toString("base64");

    return new Response(
      JSON.stringify({
        data: base64Data,
        filename: partInfo?.filename || "attachment",
        contentType: partInfo?.contentType || "application/octet-stream",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("download-attachment error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error downloading attachment",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function findPartInfo(
  bs: unknown,
  targetPart: string
): {
  encoding?: string;
  filename?: string;
  contentType?: string;
} | null {
  if (!bs) return null;
  const node = bs as {
    type?: string;
    part?: string;
    encoding?: string;
    disposition?: string;
    dispositionParameters?: { filename?: string };
    parameters?: { name?: string };
    childNodes?: unknown[];
  };

  if (node.part === targetPart) {
    return {
      encoding: node.encoding,
      filename:
        node.dispositionParameters?.filename ||
        node.parameters?.name ||
        "attachment",
      contentType: node.type || "application/octet-stream",
    };
  }

  if (node.childNodes) {
    for (const child of node.childNodes) {
      const found = findPartInfo(child, targetPart);
      if (found) return found;
    }
  }

  return null;
}
