import { Resend } from 'npm:resend@3';

/**
 * FAILED-PAYMENT RECOVERY EMAIL
 *
 * Sends a single, friendly "your payment didn't go through — here's how to
 * complete it" email to one user, with a Paddle transaction link that reopens
 * the checkout so they can retry.
 *
 * The Paddle link uses the `_ptxn` query param, which Paddle.js picks up on
 * page load to reopen the checkout overlay for that specific transaction:
 *   https://personal-finances.app?_ptxn=txn_xxx
 *
 * POST body:
 *   {
 *     "email":        "user@example.com",   // required
 *     "language":     "sq" | "en",          // optional, default "sq"
 *     "username":     "Marin",              // optional, personalises greeting
 *     "payment_link": "https://…?_ptxn=…"   // optional, defaults to DEFAULT_PAYMENT_LINK
 *   }
 *
 * Deploy:
 *   supabase functions deploy send-failed-payment
 *
 * Invoke:
 *   curl -X POST https://<ref>.supabase.co/functions/v1/send-failed-payment \
 *     -H "Authorization: Bearer <anon_key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"user@example.com","language":"sq","payment_link":"https://personal-finances.app?_ptxn=txn_01ktnx76h5cg3d95erz1tbj2k7"}'
 */

const APP_URL = 'https://personal-finances.app';
const TERMS_URL = `${APP_URL}/terms`;
const PRIVACY_URL = `${APP_URL}/privacy`;
const SUPPORT_EMAIL = 'support@personal-finances.app';

// Fallback payment link (reopens the Paddle checkout for the failed transaction)
const DEFAULT_PAYMENT_LINK = 'https://personal-finances.app?_ptxn=txn_01ktnx76h5cg3d95erz1tbj2k7';

// Brand palette
const BRAND_600 = '#0f6b5e';
const BRAND_700 = '#0b5449';
const BRAND_50  = '#eefbf7';
const SURFACE_PAGE = '#FAFAF7';

interface EmailContent {
  subject: string;
  previewText: string;
  html: string;
}

function buildFailedPaymentEmail(
  language: 'en' | 'sq',
  username: string | null,
  paymentLink: string,
): EmailContent {
  const isSq = language === 'sq';
  const name = username ?? (isSq ? 'mik' : 'there');

  const copy = {
    en: {
      subject: 'Your payment didn\'t go through - let\'s fix that',
      previewText: 'Your payment didn\'t complete. Finish it in a few seconds.',
      preheader: 'No charge was made. Complete your payment securely.',
      hook: 'We couldn\'t process your payment',
      greeting: `Hi ${name},`,
      intro: `We noticed that your recent attempt to upgrade <strong>Personal Finance Tracker</strong> didn\'t go through, so your payment was <strong>not completed</strong> and <strong>you were not charged</strong>.`,
      reassure: 'This usually happens for simple reasons - a card that needs confirmation, a temporary bank decline, or the checkout window closing early. It\'s quick to sort out.',
      noteTitle: 'Complete your payment',
      noteBody: 'Click the button below to securely reopen the checkout exactly where you left off. It only takes a few seconds.',
      ctaText: 'Complete my payment',
      ctaSubtext: 'Secure checkout · powered by Paddle',
      tipsTitle: 'A few things that might help:',
      tips: [
        'Double-check your card number, expiry date and CVC.',
        'Make sure your card allows online / international payments.',
        'If your bank asks for confirmation (3-D Secure), approve it in your banking app.',
        'Try a different card if the problem continues.',
      ],
      helpTitle: 'Still stuck?',
      helpBody: `Just reply to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_600}; font-weight:600; text-decoration:none;">${SUPPORT_EMAIL}</a> — we\'re happy to help you get set up.`,
      signoff: 'The Personal Finance Tracker team',
      footerCopyright: '© 2026 Personal Finance Tracker. All rights reserved.',
      footerTerms: 'Terms of Use',
      footerPrivacy: 'Privacy Policy',
      footerNote: 'You received this because you started a checkout with Personal Finance Tracker.',
    },
    sq: {
      subject: 'Pagesa juaj nuk u krye - ta rregullojmë së bashku',
      previewText: 'Pagesa juaj nuk përfundoi. Përfundojeni për pak sekonda.',
      preheader: 'Nuk u bë asnjë tarifim. Përfundoni pagesën në mënyrë të sigurt.',
      hook: 'Nuk arritëm ta procesojmë pagesën tuaj',
      greeting: `Përshëndetje ${name},`,
      intro: `Vumë re se përpjekja juaj e fundit për të kaluar në planin premium të <strong>Personal Finance Tracker</strong> nuk u krye, prandaj pagesa juaj <strong>nuk përfundoi</strong> dhe <strong>nuk u tarifuat</strong>.`,
      reassure: 'Kjo zakonisht ndodh për arsye të thjeshta - një kartë që kërkon konfirmim, një refuzim i përkohshëm nga banka, ose dritarja e pagesës që u mbyll shpejt. Rregullohet për pak çaste.',
      noteTitle: 'Përfundoni pagesën',
      noteBody: 'Klikoni butonin më poshtë për të rihapur pagesën në mënyrë të sigurt, pikërisht aty ku e latë. Ju merr vetëm pak sekonda.',
      ctaText: 'Përfundo pagesën time',
      ctaSubtext: 'Pagesë e sigurt · mundësuar nga Paddle',
      tipsTitle: 'Disa gjëra që mund të ndihmojnë:',
      tips: [
        'Kontrolloni numrin e kartës, datën e skadimit dhe CVC-në.',
        'Sigurohuni që karta juaj lejon pagesa online / ndërkombëtare.',
        'Nëse banka kërkon konfirmim (3-D Secure), miratojeni në aplikacionin e bankës.',
        'Provoni një kartë tjetër nëse problemi vazhdon.',
      ],
      helpTitle: 'Ende hasni vështirësi?',
      helpBody: `Thjesht përgjigjuni këtij emaili ose na shkruani te <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_600}; font-weight:600; text-decoration:none;">${SUPPORT_EMAIL}</a> — me kënaqësi ju ndihmojmë.`,
      signoff: 'Ekipi i Personal Finance Tracker',
      footerCopyright: '© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.',
      footerTerms: 'Kushtet e Përdorimit',
      footerPrivacy: 'Politika e Privatësisë',
      footerNote: 'E morët këtë sepse nisët një pagesë në Personal Finance Tracker.',
    },
  };

  const c = isSq ? copy.sq : copy.en;

  const tipRows = c.tips.map(tip => `
    <tr>
      <td style="padding: 6px 12px 6px 0; vertical-align: top; width: 22px;">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${BRAND_600}; margin-top:8px;"></span>
      </td>
      <td style="padding: 6px 0; vertical-align: top;">
        <span style="display: block; font-size: 14px; color: #4b5563; line-height: 1.6;">${tip}</span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="${isSq ? 'sq' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no">
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <title>${c.subject}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: ${SURFACE_PAGE}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    a { color: ${BRAND_600}; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .content-pad { padding: 28px 20px !important; }
      .cta-box { padding: 24px 20px !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${c.preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SURFACE_PAGE}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Email container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background-color:${BRAND_600}; padding: 36px 40px 32px; text-align: center;">
              <!-- Logo mark -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px;">
                <tr>
                  <td style="background-color:${BRAND_700}; border-radius: 12px; width:52px; height:52px; text-align:center; vertical-align:middle;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:12px auto;">
                      <path d="M4 17 L10 11 L14 14 L20 6"/>
                      <path d="M15 6 L20 6 L20 11"/>
                    </svg>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:rgba(255,255,255,0.65); margin-bottom:10px;">Personal Finance Tracker</div>
              <h1 style="margin:0; font-size:26px; font-weight:700; color:#ffffff; line-height:1.2; letter-spacing:-0.3px;">${c.hook}</h1>
            </td>
          </tr>

          <!-- ═══ INTRO ═══ -->
          <tr>
            <td class="content-pad" style="padding: 36px 40px 0;">
              <p style="margin:0 0 8px; font-size:17px; font-weight:600; color:#111112;">${c.greeting}</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#4b5563;">${c.intro}</p>
              <p style="margin:0; font-size:15px; line-height:1.7; color:#4b5563;">${c.reassure}</p>
            </td>
          </tr>

          <!-- ═══ CTA BOX ═══ -->
          <tr>
            <td class="content-pad" style="padding: 28px 40px;">
              <table class="cta-box" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, ${BRAND_50} 0%, #d5f5ec 100%); border: 2px solid ${BRAND_600}; border-radius: 14px; padding: 32px 36px; text-align:center;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px; font-size:17px; font-weight:700; color:#111112;">${c.noteTitle}</p>
                    <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#0b5449;">${c.noteBody}</p>
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="background-color:${BRAND_600}; border-radius:10px; box-shadow:0 4px 14px rgba(15,107,94,0.35);">
                          <a href="${paymentLink}" style="display:inline-block; padding:16px 40px; font-size:17px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:-0.2px;">${c.ctaText}</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0; font-size:12px; color:#6b7280;">${c.ctaSubtext}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ TIPS ═══ -->
          <tr>
            <td class="content-pad" style="padding: 0 40px 32px;">
              <p style="margin:0 0 12px; font-size:15px; font-weight:700; color:#111112;">${c.tipsTitle}</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tbody>
                  ${tipRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- ═══ HELP ═══ -->
          <tr>
            <td class="content-pad" style="padding: 0 40px 36px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb; border-radius:10px; border-left:4px solid ${BRAND_600};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px; font-size:15px; font-weight:700; color:#111112;">${c.helpTitle}</p>
                    <p style="margin:0; font-size:14px; line-height:1.7; color:#4b5563;">${c.helpBody}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0; font-size:14px; color:#4b5563; line-height:1.7;">— ${c.signoff}</p>
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background-color:#f3f4f6; border-top:1px solid #EDEDE8; padding:24px 40px; text-align:center;">
              <p style="margin:0 0 8px; font-size:12px; color:#9ca3af;">${c.footerCopyright}</p>
              <p style="margin:0 0 10px; font-size:12px;">
                <a href="${TERMS_URL}" style="color:${BRAND_600}; text-decoration:none; font-weight:600;">${c.footerTerms}</a>
                &nbsp;·&nbsp;
                <a href="${PRIVACY_URL}" style="color:${BRAND_600}; text-decoration:none; font-weight:600;">${c.footerPrivacy}</a>
              </p>
              <p style="margin:0; font-size:11px; color:#9ca3af;">${c.footerNote}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject: c.subject, previewText: c.previewText, html };
}

// ─── Edge Function handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { email?: string; language?: string; username?: string; payment_link?: string } = {};
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) body = await req.json();
    } catch { /* handled below */ }

    const email = (body.email ?? '').trim();
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'A valid `email` is required.' }), { status: 400, headers: corsHeaders });
    }

    const lang = (body.language === 'en' ? 'en' : 'sq') as 'en' | 'sq';
    const username = body.username?.trim() || null;
    const paymentLink = (body.payment_link ?? '').trim() || DEFAULT_PAYMENT_LINK;

    console.log(`📤 Failed-payment email → ${email} (${lang}${username ? `, ${username}` : ''})`);
    console.log(`🔗 Payment link: ${paymentLink}`);

    // ── Resend ────────────────────────────────────────────────────────────────
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { subject, previewText, html } = buildFailedPaymentEmail(lang, username, paymentLink);

    const { data, error } = await resend.emails.send({
      from: 'Personal Finance Tracker <noreply@personal-finances.app>',
      to: email,
      subject,
      html,
      text: previewText,
    });

    if (error) {
      console.error(`❌ ${email}:`, error);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: error.message ?? error }), { status: 502, headers: corsHeaders });
    }

    console.log(`✅ Sent — id: ${data?.id}`);

    return new Response(JSON.stringify({
      success: true,
      email,
      language: lang,
      payment_link: paymentLink,
      resend_id: data?.id ?? null,
    }, null, 2), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('💥 Fatal:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
