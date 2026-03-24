import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's email accounts
    const { data: accounts, error: accError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", user.id);

    if (accError) throw accError;
    if (!accounts?.length) {
      return new Response(JSON.stringify({ message: "No accounts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    for (const account of accounts) {
      try {
        // Fetch inbox emails for stats
        const { ImapFlow } = await import("npm:imapflow@1.0.195");
        const client = new ImapFlow({
          host: account.imap_host,
          port: account.imap_port || 993,
          secure: true,
          auth: {
            user: account.username || account.email_address,
            pass: account.password,
          },
          logger: false,
        });

        await client.connect();

        // Count inbox (received today)
        let receivedCount = 0;
        let sentCount = 0;
        const senderMap = new Map<string, number>();

        // INBOX stats
        const inboxLock = await client.getMailboxLock("INBOX");
        try {
          const sinceDate = new Date();
          sinceDate.setDate(sinceDate.getDate() - 1);

          for await (const msg of client.fetch(
            { since: sinceDate },
            { envelope: true }
          )) {
            receivedCount++;
            const fromAddr = msg.envelope?.from?.[0]?.address;
            if (fromAddr) {
              senderMap.set(fromAddr, (senderMap.get(fromAddr) || 0) + 1);
            }
          }
        } finally {
          inboxLock.release();
        }

        // Sent folder stats
        try {
          const sentFolders = ["Sent", "[Gmail]/Sent Mail", "INBOX.Sent", "Sent Items"];
          let sentFolder = "Sent";
          const mailboxes = await client.list();
          for (const mb of mailboxes) {
            const lower = mb.path.toLowerCase();
            if (lower.includes("sent")) {
              sentFolder = mb.path;
              break;
            }
          }

          const sentLock = await client.getMailboxLock(sentFolder);
          try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - 1);
            for await (const msg of client.fetch(
              { since: sinceDate },
              { envelope: true }
            )) {
              sentCount++;
            }
          } finally {
            sentLock.release();
          }
        } catch {
          // Sent folder may not exist
        }

        await client.logout();

        const topSenders = Array.from(senderMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([email, count]) => ({ email, count }));

        // Upsert stats
        await supabase
          .from("email_stats")
          .upsert(
            {
              user_id: user.id,
              account_id: account.id,
              stat_date: today,
              received_count: receivedCount,
              sent_count: sentCount,
              top_senders: topSenders,
            },
            { onConflict: "user_id,account_id,stat_date" }
          );
      } catch (err) {
        console.error(`Stats error for ${account.email_address}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("collect-stats error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
