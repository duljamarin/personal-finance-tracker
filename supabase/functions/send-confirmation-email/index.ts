// supabase/functions/send-confirmation-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// We only need RESEND_API_KEY and APP_BASE_URL for this hook.
// Supabase already generates the token/hash and metadata in the hook payload.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";

type Language = "en" | "sq";

// Payload shape for Supabase "Send Email" hooks (user.signup, etc.)
// See: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
interface SendEmailHookPayload {
  // Primary payload shape used by the Send Email hook
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      language?: Language;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string; // e.g. "signup"
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
    old_phone?: string;
    provider?: string;
    factor_type?: string;
    [key: string]: any;
  } | null;

  // Legacy / alternative shapes (kept for forward compatibility, but
  // not required for the current Send Email hook payload).
  type?: string;
  record?: {
    id: string;
    email: string;
    user_metadata?: {
      language?: Language;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  properties?: {
    action_link?: string | null;
    token?: string | null;
    [key: string]: any;
  } | null;
}

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      error: {
        http_code: status,
        message,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  let payload: SendEmailHookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON payload");
  }

  // Prefer explicit `user` from Send Email hook; fall back to `record` if present
  const user = payload.user ?? payload.record;
  if (!user || !user.email) {
    console.error("Missing user or email in send-email hook payload", payload);
    return jsonError(400, "Missing user/email in hook payload");
  }

  // Read language from user metadata (default to English)
  const language: Language = (user.user_metadata?.language as Language) || "en";
  const email = user.email;

  const emailData = payload.email_data;
  if (!emailData) {
    console.error("Missing email_data in send-email hook payload", payload);
    return jsonError(400, "Missing email_data in hook payload");
  }

  // Determine the email action type (signup, recovery, etc.)
  const emailActionType = emailData.email_action_type || "signup";
  
  // Prefer the full action link Supabase provides in the hook payload when available.
  // This link includes tokens/params that create a valid session on redirect.
  // See payload.properties.action_link or legacy properties.token/action_link.
  // Fallback to building a URL from token_hash only if the full action link is not present.
  let actionUrl: string | undefined;

  // payload.properties.action_link is provided by Supabase in many hook payloads
  // and contains the full confirmation/recovery URL (including tokens).
  if ((payload as any).properties?.action_link) {
    actionUrl = (payload as any).properties.action_link as string;
  }

  // Some payload shapes include action_link directly on email_data as well
  if (!actionUrl && (emailData as any).action_link) {
    actionUrl = (emailData as any).action_link as string;
  }

  // If no full action link was supplied, fall back to building a URL from token_hash
  if (!actionUrl && emailData.token_hash && emailData.email_action_type) {
    try {
      const url = new URL(APP_BASE_URL);
      if (emailActionType === "recovery") {
        url.pathname = "/reset-password";
      } else {
        url.pathname = "/auth/confirmed";
      }
      url.searchParams.set("token_hash", emailData.token_hash);
      url.searchParams.set("type", emailData.email_action_type);
      actionUrl = url.toString();
    } catch (e) {
      console.error("Error building action URL", e);
      return jsonError(500, "Failed to build action URL");
    }
  }

  // As a last resort, fall back to redirect_to if present so the
  // email at least contains a clickable link.
  if (!actionUrl && emailData.redirect_to) {
    actionUrl = emailData.redirect_to;
  }

  if (!actionUrl) {
    console.error("No action URL could be built from hook payload", payload);
    return jsonError(500, "Failed to generate action link");
  }

  console.log(`Processing ${emailActionType} for ${email} with language: ${language}`);

  try {
    // Build localized email based on action type
    const { subject, html } = buildEmail(language, actionUrl, email, emailActionType);

    // 4) Send email via Resend HTTP API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Personal Finance Tracker <noreply@personal-finances.app>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      console.error("Resend error:", resendResponse.status, body);
      return jsonError(502, "Failed to send email via Resend");
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error", err);
    return jsonError(500, "Internal error in send-email hook");
  }
});

const TERMS_URL = "https://personal-finances.app/terms";
const PRIVACY_URL = "https://personal-finances.app/privacy";

const EMAIL_CSS = `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f9fafb;
      padding: 20px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #2f7c31 0%, #1e4620 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header-emoji {
      font-size: 48px;
      margin-bottom: 16px;
      display: block;
    }
    .header-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .body-text {
      font-size: 16px;
      color: #4b5563;
      margin: 0 0 20px 0;
      line-height: 1.7;
    }
    .cta-section {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #4f8a4c 0%, #2f6b35 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      border-radius: 10px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 6px 14px rgba(47, 107, 53, 0.35);
    }
    .fallback-section {
      font-size: 13px;
      color: #6b7280;
      margin: 24px 0 0 0;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .fallback-section a {
      color: #2f7c31;
      word-break: break-all;
    }
    .warning-text {
      color: #dc2626;
      font-weight: 600;
      margin: 12px 0 0 0;
    }
    .footer {
      background-color: #f3f4f6;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-copyright {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 10px 0;
    }
    .footer-links {
      font-size: 13px;
    }
    .footer-links a {
      color: #2f7c31;
      text-decoration: none;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px; }
      .header { padding: 30px 20px; }
      .header-title { font-size: 22px; }
      .cta-button { padding: 14px 32px; font-size: 16px; }
    }
`;

function buildEmail(
  language: Language,
  actionUrl: string,
  email: string,
  actionType: string = "signup"
): { subject: string; html: string } {
  const isRecovery = actionType === "recovery";

  const content = {
    en: {
      signup: {
        subject: "Confirm your email address",
        title: "Welcome to Personal Finance Tracker",
        emoji: "💰",
        body: `To finish creating your account for <strong>${email}</strong>, please confirm your email address by clicking the button below.`,
        cta: "Confirm Email",
        fallbackLabel: "If the button doesn't work, copy and paste this link into your browser:",
        ignoreNote: "If you didn't request this email, you can safely ignore it.",
      },
      recovery: {
        subject: "Reset your password",
        title: "Reset Your Password",
        emoji: "🔑",
        body: `We received a request to reset the password for <strong>${email}</strong>. Click the button below to create a new password.`,
        cta: "Reset Password",
        fallbackLabel: "If the button doesn't work, copy and paste this link into your browser:",
        ignoreNote: "If you didn't request this password reset, you can safely ignore this email. Your password will not be changed until you click the link above.",
        warning: "This link expires in 60 minutes and can only be used once.",
      },
      footerCopyright: "© 2026 Personal Finance Tracker. All rights reserved.",
      footerTerms: "Terms of Use",
      footerPrivacy: "Privacy Policy",
    },
    sq: {
      signup: {
        subject: "Konfirmoni adresën tuaj të emailit",
        title: "Mirë se erdhët në Personal Finance Tracker",
        emoji: "💰",
        body: `Për të përfunduar krijimin e llogarisë për <strong>${email}</strong>, ju lutem konfirmoni adresën tuaj të emailit duke klikuar butonin më poshtë.`,
        cta: "Konfirmo Emailin",
        fallbackLabel: "Nëse butoni nuk funksionon, kopjoni dhe ngjisni këtë link në shfletuesin tuaj:",
        ignoreNote: "Nëse nuk e keni kërkuar ju këtë email, mund ta injoroni me siguri.",
      },
      recovery: {
        subject: "Rivendosni fjalëkalimin tuaj",
        title: "Rivendosni Fjalëkalimin",
        emoji: "🔑",
        body: `Kemi marrë një kërkesë për të rivendosur fjalëkalimin e llogarisë <strong>${email}</strong>. Klikoni butonin më poshtë për të krijuar një fjalëkalim të ri.`,
        cta: "Rivendos Fjalëkalimin",
        fallbackLabel: "Nëse butoni nuk funksionon, kopjoni dhe ngjisni këtë link në shfletuesin tuaj:",
        ignoreNote: "Nëse nuk e keni kërkuar këtë rivendosje, mund ta injoroni këtë email me siguri. Fjalëkalimi juaj nuk do të ndryshohet derisa të klikoni linkun më sipër.",
        warning: "Ky link skadon pas 60 minutave dhe mund të përdoret vetëm një herë.",
      },
      footerCopyright: "© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.",
      footerTerms: "Kushtet e Përdorimit",
      footerPrivacy: "Politika e Privatësisë",
    },
  };

  const lang = content[language];
  const c = isRecovery ? lang.recovery : lang.signup;
  const langCode = language === "sq" ? "sq" : "en";

  const html = `<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <title>${c.subject}</title>
  <style>${EMAIL_CSS}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <span class="header-emoji">${c.emoji}</span>
        <h1 class="header-title">${c.title}</h1>
      </div>
      <div class="content">
        <p class="body-text">${c.body}</p>
        <div class="cta-section">
          <a href="${actionUrl}" class="cta-button" style="color: #ffffff !important; text-decoration: none !important;">${c.cta}</a>
        </div>
        <div class="fallback-section">
          <p style="margin:0 0 8px 0;">${c.fallbackLabel}</p>
          <p style="margin:0 0 12px 0;"><a href="${actionUrl}">${actionUrl}</a></p>
          ${"warning" in c ? `<p class="warning-text">⚠️ ${c.warning}</p>` : ""}
          <p style="margin:12px 0 0 0;">${c.ignoreNote}</p>
        </div>
      </div>
      <div class="footer">
        <p class="footer-copyright">${lang.footerCopyright}</p>
        <p class="footer-links">
          <a href="${TERMS_URL}">${lang.footerTerms}</a> &bull;
          <a href="${PRIVACY_URL}">${lang.footerPrivacy}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject: c.subject, html };
}
