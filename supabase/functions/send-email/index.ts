import { createClient } from "npm:@supabase/supabase-js@2";
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

    const { account_id, to, cc, bcc, subject, body, in_reply_to, references } = await req.json();

    if (!account_id || !to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: account_id, to, subject, body" }),
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

    if (!account.smtp_host || !account.username || !account.password) {
      return new Response(
        JSON.stringify({ error: "Credenciais SMTP não configuradas" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port || 587,
      secure: (account.smtp_port || 587) === 465,
      auth: {
        user: account.username,
        pass: account.password,
      },
    });

    const mailOptions: Record<string, unknown> = {
      from: `"${account.friendly_name}" <${account.email_address}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      subject,
      html: body,
    };

    if (in_reply_to) mailOptions.inReplyTo = in_reply_to;
    if (references) mailOptions.references = references;

    const info = await transporter.sendMail(mailOptions);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar e-mail" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
