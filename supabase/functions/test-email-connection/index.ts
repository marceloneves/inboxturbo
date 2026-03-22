import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";
import nodemailer from "npm:nodemailer@6.9.16";

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

    const { imap_host, imap_port, smtp_host, smtp_port, username, password } =
      await req.json();

    const results = { imap: false, smtp: false, imap_error: "", smtp_error: "" };

    // Test IMAP
    if (imap_host && username && password) {
      try {
        const client = new ImapFlow({
          host: imap_host,
          port: imap_port || 993,
          secure: true,
          auth: { user: username, pass: password },
          logger: false,
        });
        await client.connect();
        await client.logout();
        results.imap = true;
      } catch (e) {
        results.imap_error = e.message || "Falha na conexão IMAP";
      }
    }

    // Test SMTP
    if (smtp_host && username && password) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port: smtp_port || 587,
          secure: (smtp_port || 587) === 465,
          auth: { user: username, pass: password },
        });
        await transporter.verify();
        results.smtp = true;
      } catch (e) {
        results.smtp_error = e.message || "Falha na conexão SMTP";
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-connection error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao testar conexão" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
