import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';

/**
 * YEARLY SUBSCRIPTION PROMO EMAIL (idempotent, resumable)
 *
 * Sends a promo email offering the yearly plan at €30 to confirmed users.
 *
 * Resend's free tier allows roughly 100 emails per day, so each call sends at
 * most `limit` users (default 90). Every successful send is recorded in the
 * `promo_email_log` table. On the next run the function reads that log and skips
 * anyone who already received the campaign, so:
 *   - re-running never double-sends to the same person
 *   - the order of listUsers no longer matters
 *   - you just call it once per day until `remaining` reaches 0
 *
 * POST body (all optional):
 *   {
 *     limit?: number,           // max sends this call (default 90, cap under Resend's ~100/day)
 *     dry_run?: boolean,        // list who WOULD be sent, send nothing, log nothing
 *     test_email?: string,      // send exactly ONE real email to this address, log nothing
 *     confirm_send_all?: boolean, // REQUIRED for a real mass send; without it nothing is sent
 *     campaign?: string,        // campaign key used for de-dup (default "yearly_promo_30eur")
 *     exclude_emails?: string[]
 *   }
 *
 * SAFETY: a real batch send only happens when confirm_send_all:true is passed.
 * A bare {} (or any call without that flag) sends NOTHING and just returns a
 * preview, so an accidental call can never blast the whole user base.
 *
 * Response includes `remaining` (how many confirmed users still have not received
 * it). When `remaining` is 0 you are done.
 *
 * Deploy (IMPORTANT: re-deploy after every edit, or the OLD code runs in cloud):
 *   supabase functions deploy send-yearly-promo
 *
 * 1) Test with ONE email to yourself first (real send, not logged):
 *   curl -X POST https://<ref>.supabase.co/functions/v1/send-yearly-promo \
 *     -H "Authorization: Bearer <anon_key>" -H "Content-Type: application/json" \
 *     -d '{"test_email": "you@example.com"}'
 *
 * 2) Dry run (see the list, send nothing):
 *   -d '{"dry_run": true}'
 *
 * 3) Real daily batch (sends up to 90 not-yet-sent users, logs them):
 *   -d '{"confirm_send_all": true}'
 */

const DEFAULT_LIMIT = 90;      // safely under Resend's ~100/day free-tier cap
const MAX_LIMIT = 100;
const DEFAULT_CAMPAIGN = 'yearly_promo_30eur';
const APP_URL = 'https://personal-finances.app';
const PRICING_URL = `${APP_URL}/pricing`;
const TERMS_URL = `${APP_URL}/terms`;
const PRIVACY_URL = `${APP_URL}/privacy`;

// Brand palette (forest green, 2026 repaint)
const BRAND_500 = '#17804F';
const BRAND_600 = '#0B5D3B';
const BRAND_700 = '#084C30';
const BRAND_50  = '#e9f6ef';
const BRAND_100 = '#d3ecdf';
const SURFACE_PAGE = '#FAFAF7';

interface EmailContent {
  subject: string;
  previewText: string;
  html: string;
}

function buildPromoEmail(language: 'en' | 'sq', username: string | null): EmailContent {
  const isSq = language === 'sq';
  const name = username ?? (isSq ? '' : 'there');

  const copy = {
    en: {
      subject: `🔒 Your finances, fully encrypted. Get the full plan for just €30/year`,
      previewText: 'End to end encrypted finances, every premium feature, one simple price.',
      preheader: 'End to end encryption. Full access. One price. No surprises.',
      greeting: `Hi ${name},`,
      hook: 'Your money data, encrypted end to end.',
      intro: `You\'re already using <strong>Personal Finance Tracker</strong> to manage your money, and we want to help you get even more out of it. You can unlock <strong>everything</strong> for just <strong>€30 per year</strong>.`,
      // Security spotlight (hero)
      securityBadge: 'End to end encryption',
      securityTitle: 'Only you can read your financial data',
      securityBody: 'Every amount you enter is <strong>encrypted on your device</strong> before it ever reaches our servers. We store only ciphertext, so nobody, not us, not anyone else, can read your balances, income, or spending. All calculations happen privately in your browser. Your finances stay yours alone.',
      securityPoints: [
        'Amounts encrypted on your device, never in plain text',
        'We store ciphertext only, we cannot read your numbers',
        'Private by design, powered by strong encryption',
      ],
      offerLabel: 'Best value',
      offerPrice: '€30',
      offerPer: '/ year',
      offerNote: 'That\'s just €2.50 per month, less than a coffee.',
      whatYouGet: 'Everything included:',
      features: [
        { icon: '🔒', title: 'End to end encryption', desc: 'Your financial data is encrypted on your device. Only you can read it.' },
        { icon: '∞', title: 'Unlimited transactions', desc: 'No monthly caps, ever.' },
        { icon: '🎯', title: 'Financial Goals', desc: 'Set targets, track progress, celebrate wins.' },
        { icon: '📅', title: 'Monthly Budgets', desc: 'Spending limits per category with live alerts.' },
        { icon: '🔁', title: 'Recurring Transactions', desc: 'Automate bills and regular income.' },
        { icon: '📊', title: 'Advanced Reports', desc: 'Full income and expense breakdowns by period.' },
        { icon: '🏦', title: 'Net Worth Tracker', desc: 'Assets, liabilities, and real time net worth.' },
        { icon: '❤️', title: 'Financial Health Score', desc: 'Monthly score with personalized insights.' },
        { icon: '🔔', title: 'Smart Notifications', desc: 'Budget alerts, goal milestones, and more.' },
      ],
      ctaText: 'Get the Yearly Plan for €30',
      ctaSubtext: 'Secure checkout',
      closingTitle: 'One simple price',
      closingBody: 'Everything you see here is included in a single plan: <strong>€30 per year, for everyone</strong>. No tiers, no hidden add ons, no price that jumps after the first year. Take full control of your finances with total privacy.',
      signoff: 'The Personal Finance Tracker team',
      footerCopyright: '© 2026 Personal Finance Tracker. All rights reserved.',
      footerTerms: 'Terms of Use',
      footerPrivacy: 'Privacy Policy',
      footerUnsubscribe: 'You received this because you have an account with Personal Finance Tracker.',
    },
    sq: {
      subject: `🔒 Financat tuaja, plotësisht të enkriptuara. Merrni planin e plotë për vetëm €30/vit`,
      previewText: 'Financa të enkriptuara skaj më skaj, çdo funksion premium, një çmim i thjeshtë.',
      preheader: 'Enkriptim skaj më skaj. Akses i plotë. Një çmim. Pa surpriza.',
      greeting: `Përshëndetje ${name},`,
      hook: 'Të dhënat tuaja financiare, të enkriptuara skaj më skaj.',
      intro: `Ju tashmë po përdorni <strong>Personal Finance Tracker</strong> për të menaxhuar financat tuaja, dhe ne duam t\'ju ndihmojmë të nxirrni edhe më shumë prej tij. Mund të zhbllokoni <strong>gjithçka</strong> për vetëm <strong>€30 në vit</strong>.`,
      // Security spotlight (hero)
      securityBadge: 'Enkriptim skaj më skaj',
      securityTitle: 'Vetëm ju mund t\'i lexoni të dhënat tuaja financiare',
      securityBody: 'Çdo shumë që ju vendosni <strong>enkriptohet në pajisjen tuaj</strong> përpara se të arrijë ndonjëherë në serverët tanë. Ne ruajmë vetëm tekst të enkriptuar, kështu që askush, as ne, as ndonjë tjetër, nuk mund t\'i lexojë bilancet, të ardhurat apo shpenzimet tuaja. Të gjitha llogaritjet ndodhin privatisht në shfletuesin tuaj. Financat tuaja mbeten vetëm tuajat.',
      securityPoints: [
        'Shumat enkriptohen në pajisjen tuaj, kurrë në tekst të thjeshtë',
        'Ne ruajmë vetëm tekst të enkriptuar, nuk mund t\'i lexojmë numrat tuaj',
        'Private nga vetë dizajni, mbështetur nga enkriptim i fortë',
      ],
      offerLabel: 'Vlera më e mirë',
      offerPrice: '€30',
      offerPer: '/ vit',
      offerNote: 'Vetëm €2.50 në muaj, më pak se një kafe.',
      whatYouGet: 'Gjithçka e përfshirë:',
      features: [
        { icon: '🔒', title: 'Enkriptim skaj më skaj', desc: 'Të dhënat tuaja financiare enkriptohen në pajisjen tuaj. Vetëm ju mund t\'i lexoni.' },
        { icon: '∞', title: 'Transaksione të pakufizuara', desc: 'Pa kufizime mujore, kurrë.' },
        { icon: '🎯', title: 'Qëllime Financiare', desc: 'Vendosni objektiva, gjurmoni progresin, festoni arritjet.' },
        { icon: '📅', title: 'Buxhete Mujore', desc: 'Kufij shpenzimesh për çdo kategori me sinjalizime.' },
        { icon: '🔁', title: 'Transaksione Periodike', desc: 'Automatizoni faturat dhe të ardhurat e rregullta.' },
        { icon: '📊', title: 'Raporte të Avancuara', desc: 'Analiza të plota të të ardhurave dhe shpenzimeve.' },
        { icon: '🏦', title: 'Pasuria Neto', desc: 'Aktive, detyrime dhe pasuria neto në kohë reale.' },
        { icon: '❤️', title: 'Shëndeti Financiar', desc: 'Rezultat mujor me sugjerime të personalizuara.' },
        { icon: '🔔', title: 'Njoftimet Inteligjente', desc: 'Alarme buxheti, arritje qëllimesh dhe shumë të tjera.' },
      ],
      ctaText: 'Merrni Planin Vjetor për €30',
      ctaSubtext: 'Pagesë e sigurt',
      closingTitle: 'Një çmim i thjeshtë',
      closingBody: 'Gjithçka që shihni këtu përfshihet në një plan të vetëm: <strong>€30 në vit, për të gjithë</strong>. Pa nivele, pa shtesa të fshehura, pa çmim që rritet pas vitit të parë. Merrni kontrollin e plotë të financave tuaja me privatësi totale.',
      signoff: 'Ekipi i Personal Finance Tracker',
      footerCopyright: '© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.',
      footerTerms: 'Kushtet e Përdorimit',
      footerPrivacy: 'Politika e Privatësisë',
      footerUnsubscribe: 'E morët këtë sepse keni një llogari në Personal Finance Tracker.',
    },
  };

  const c = isSq ? copy.sq : copy.en;

  const securityPoints = c.securityPoints.map(p => `
    <tr>
      <td style="padding: 6px 0; vertical-align: top; width: 26px;">
        <span style="font-size: 15px; color: ${BRAND_500}; line-height: 1.5;">✓</span>
      </td>
      <td style="padding: 6px 0; vertical-align: top;">
        <span style="font-size: 13px; color: #4b5563; line-height: 1.6;">${p}</span>
      </td>
    </tr>
  `).join('');

  const featureRows = c.features.map(f => `
    <tr>
      <td style="padding: 12px 16px; vertical-align: top; width: 40px;">
        <span style="font-size: 20px; line-height: 1;">${f.icon}</span>
      </td>
      <td style="padding: 12px 16px 12px 0; vertical-align: top; border-bottom: 1px solid #EDEDE8;">
        <span style="display: block; font-size: 14px; font-weight: 700; color: #111112; margin-bottom: 2px;">${f.title}</span>
        <span style="display: block; font-size: 13px; color: #6b7280; line-height: 1.5;">${f.desc}</span>
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
      .offer-box { padding: 24px 20px !important; }
      .price-num { font-size: 52px !important; }
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
              <p style="margin:0; font-size:15px; line-height:1.7; color:#4b5563;">${c.intro}</p>
            </td>
          </tr>

          <!-- ═══ SECURITY SPOTLIGHT (hero: end to end encryption) ═══ -->
          <tr>
            <td class="content-pad" style="padding: 28px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff; border:1px solid ${BRAND_100}; border-left:4px solid ${BRAND_600}; border-radius:12px;">
                <tr>
                  <td style="padding: 26px 28px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0" border="0"><tr>
                            <td style="background-color:${BRAND_50}; border-radius:10px; width:44px; height:44px; text-align:center; vertical-align:middle;">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${BRAND_600}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:11px auto;">
                                <rect x="4" y="11" width="16" height="10" rx="2"/>
                                <path d="M8 11 V7 a4 4 0 0 1 8 0 v4"/>
                              </svg>
                            </td>
                          </tr></table>
                        </td>
                        <td style="padding-left:14px; vertical-align:middle;">
                          <span style="display:inline-block; background:${BRAND_600}; color:#fff; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:3px 10px; border-radius:999px;">${c.securityBadge}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 10px; font-size:18px; font-weight:700; color:#111112; line-height:1.3;">${c.securityTitle}</p>
                    <p style="margin:0 0 16px; font-size:14px; line-height:1.7; color:#4b5563;">${c.securityBody}</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tbody>
                        ${securityPoints}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ OFFER BOX ═══ -->
          <tr>
            <td class="content-pad" style="padding: 28px 40px;">
              <table class="offer-box" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, ${BRAND_50} 0%, ${BRAND_100} 100%); border: 2px solid ${BRAND_600}; border-radius: 14px; padding: 32px 36px; text-align:center;">
                <tr>
                  <td>
                    <div style="display:inline-block; background:${BRAND_600}; color:#fff; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 14px; border-radius:999px; margin-bottom:20px;">${c.offerLabel}</div>
                    <div style="margin-bottom:6px;">
                      <span class="price-num" style="font-size:64px; font-weight:800; color:${BRAND_600}; letter-spacing:-2px; line-height:1;">${c.offerPrice}</span>
                      <span style="font-size:20px; font-weight:600; color:${BRAND_700}; vertical-align:middle; margin-left:4px;">${c.offerPer}</span>
                    </div>
                    <p style="margin:0 0 24px; font-size:14px; color:${BRAND_700}; font-style:italic;">${c.offerNote}</p>
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="background-color:${BRAND_600}; border-radius:10px; box-shadow:0 4px 14px rgba(11,93,59,0.35);">
                          <a href="${PRICING_URL}?utm_source=email&utm_medium=promo&utm_campaign=yearly_30eur" style="display:inline-block; padding:16px 40px; font-size:17px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:-0.2px;">${c.ctaText}</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0; font-size:12px; color:#6b7280;">${c.ctaSubtext}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ FEATURES ═══ -->
          <tr>
            <td class="content-pad" style="padding: 0 40px 32px;">
              <p style="margin:0 0 16px; font-size:15px; font-weight:700; color:#111112;">${c.whatYouGet}</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #EDEDE8; border-radius:10px; overflow:hidden;">
                <tbody>
                  ${featureRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- ═══ CLOSING ═══ -->
          <tr>
            <td class="content-pad" style="padding: 0 40px 36px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb; border-radius:10px; padding:24px; border-left:4px solid ${BRAND_600};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px; font-size:15px; font-weight:700; color:#111112;">${c.closingTitle}</p>
                    <p style="margin:0; font-size:14px; line-height:1.7; color:#4b5563;">${c.closingBody}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0; font-size:14px; color:#4b5563; line-height:1.7;">${c.signoff}</p>
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
              <p style="margin:0; font-size:11px; color:#9ca3af;">${c.footerUnsubscribe}</p>
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
    let body: {
      limit?: number;
      dry_run?: boolean;
      test_email?: string;
      confirm_send_all?: boolean;
      campaign?: string;
      exclude_emails?: string[];
    } = {};
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) body = await req.json();
    } catch { /* empty body is fine */ }

    const dryRun = body.dry_run === true;
    const testEmail = typeof body.test_email === 'string' ? body.test_email.trim() : '';
    const confirmSendAll = body.confirm_send_all === true;
    const campaign = (body.campaign || DEFAULT_CAMPAIGN).trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit ?? DEFAULT_LIMIT)));
    const excludeEmails = new Set((body.exclude_emails ?? []).map((e: string) => e.toLowerCase()));

    // ── Supabase & Resend ─────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const FROM = 'Personal Finance Tracker <noreply@personal-finances.app>';

    // ══════════════════════════════════════════════════════════════════════════
    // TEST MODE: send exactly ONE real email to the given address, log nothing.
    // Use this first to preview the email in your own inbox.
    // ══════════════════════════════════════════════════════════════════════════
    if (testEmail) {
      // Try to match the address to an existing user so language/name are realistic;
      // otherwise fall back to Albanian (the app default) with no username.
      let lang: 'en' | 'sq' = 'sq';
      let username: string | null = null;
      const { data: matched } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const u = matched?.users?.find((x: { email?: string; user_metadata?: Record<string, string> }) => x.email?.toLowerCase() === testEmail.toLowerCase());
      if (u) {
        lang = (u.user_metadata?.language === 'en' ? 'en' : 'sq');
        username = (u.user_metadata?.username as string) ?? null;
      }

      console.log(`🔬 TEST send to ${testEmail} (${lang}${username ? `, ${username}` : ''})`);
      const { subject, previewText, html } = buildPromoEmail(lang, username);
      const { data, error } = await resend.emails.send({
        from: FROM, to: testEmail, subject, html, text: previewText,
      });
      if (error) {
        return new Response(JSON.stringify({ success: false, test_email: testEmail, error: error.message ?? 'send failed' }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({
        success: true, mode: 'test', test_email: testEmail, language: lang, resend_id: data?.id,
        note: 'This was a one-off test send. It was NOT recorded in promo_email_log.',
      }, null, 2), { status: 200, headers: corsHeaders });
    }

    console.log(`🎯 Yearly promo: campaign="${campaign}", limit=${limit}${dryRun ? ' [DRY RUN]' : ''}`);

    // ── Fetch all confirmed users (paginated) ─────────────────────────────────
    const allUsers: Array<{ id: string; email: string; email_confirmed_at: string; user_metadata: Record<string, string> }> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        console.error('❌ listUsers error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch users', details: error }), { status: 500, headers: corsHeaders });
      }
      allUsers.push(...data.users as typeof allUsers);
      if (data.users.length < 1000) break;
      page++;
    }

    const confirmedUsers = allUsers.filter(u =>
      u.email && u.email_confirmed_at && !excludeEmails.has(u.email.toLowerCase())
    );

    // ── Load who already received THIS campaign (de-dup source of truth) ───────
    const { data: sentRows, error: logErr } = await supabase
      .from('promo_email_log')
      .select('user_id')
      .eq('campaign', campaign);
    if (logErr) {
      console.error('❌ promo_email_log read error:', logErr);
      return new Response(JSON.stringify({ error: 'Failed to read send log', details: logErr.message }), { status: 500, headers: corsHeaders });
    }
    const alreadySent = new Set((sentRows ?? []).map((r: { user_id: string }) => r.user_id));

    // Users who still need the email, capped to this run's limit.
    const pending = confirmedUsers.filter(u => !alreadySent.has(u.id));
    const batch = pending.slice(0, limit);

    console.log(`📋 Confirmed: ${confirmedUsers.length} | already sent: ${alreadySent.size} | pending: ${pending.length} | sending now: ${batch.length}`);

    if (batch.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        campaign,
        message: alreadySent.size >= confirmedUsers.length
          ? '🏁 All confirmed users have already received this campaign.'
          : 'No pending users to send in this run.',
        total_confirmed: confirmedUsers.length,
        already_sent: alreadySent.size,
        remaining: pending.length,
      }, null, 2), { status: 200, headers: corsHeaders });
    }

    // ── SAFETY GUARD ──────────────────────────────────────────────────────────
    // A real mass send must be explicitly confirmed with confirm_send_all:true.
    // Without it (and when not a dry run), we refuse and just report the preview.
    // This makes an accidental or malformed call (e.g. bare {}) harmless: it can
    // never blast the whole user base by mistake.
    if (!dryRun && !confirmSendAll) {
      console.log('🛑 Real send blocked: confirm_send_all not set. Returning preview only.');
      return new Response(JSON.stringify({
        success: false,
        blocked: true,
        reason: 'confirm_send_all_required',
        message: 'This is a REAL send. Nothing was sent. To actually send, pass "confirm_send_all": true. To preview safely, pass "dry_run": true, or "test_email": "you@example.com" to send one test.',
        campaign,
        limit,
        total_confirmed: confirmedUsers.length,
        already_sent: alreadySent.size,
        remaining: pending.length,
        would_send_this_run: batch.length,
      }, null, 2), { status: 200, headers: corsHeaders });
    }

    // ── Send emails ───────────────────────────────────────────────────────────
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const user = batch[i];
      const lang = (user.user_metadata?.language === 'en' ? 'en' : 'sq') as 'en' | 'sq';
      const username = user.user_metadata?.username ?? null;

      console.log(`${dryRun ? '🔍 [would send]' : `📤 [${i + 1}/${batch.length}]`} ${user.email} (${lang}${username ? `, ${username}` : ''})`);

      if (dryRun) { successCount++; continue; }

      try {
        const { subject, previewText, html } = buildPromoEmail(lang, username);
        const { data, error } = await resend.emails.send({
          from: FROM, to: user.email, subject, html, text: previewText,
        });
        if (error) {
          console.error(`❌ ${user.email}:`, error);
          errorCount++;
          errors.push(`${user.email}: ${error.message ?? 'Unknown error'}`);
        } else {
          // Record the send so future runs skip this user. Only on success.
          const { error: insErr } = await supabase.from('promo_email_log').insert({
            user_id: user.id, campaign, email: user.email, resend_id: data?.id ?? null,
          });
          if (insErr) {
            // The email went out but logging failed: warn loudly so it can be
            // reconciled; a UNIQUE-violation just means a concurrent run beat us.
            console.error(`⚠️  Sent but failed to log ${user.email}:`, insErr.message);
          }
          console.log(`✅ Sent id=${data?.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`💥 ${user.email}:`, err);
        errorCount++;
        errors.push(`${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Respect Resend rate limit (~2 req/s): 600ms gap between sends.
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    const remainingAfter = pending.length - (dryRun ? 0 : successCount);
    const result = {
      success: true,
      dry_run: dryRun,
      campaign,
      limit,
      sent_this_run: successCount,
      error_count: errorCount,
      total_confirmed: confirmedUsers.length,
      already_sent_before: alreadySent.size,
      remaining: Math.max(0, remainingAfter),
      done: remainingAfter <= 0,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('📊 YEARLY PROMO RUN COMPLETE');
    console.log(`✅ Sent this run: ${successCount}  ❌ Failed: ${errorCount}`);
    console.log(`📦 Remaining after run: ${Math.max(0, remainingAfter)} / ${confirmedUsers.length} confirmed`);
    console.log(remainingAfter <= 0 ? '🏁 Campaign complete!' : '➡️  Run again (e.g. tomorrow) to send the next batch.');
    console.log('══════════════════════════════════════════');

    return new Response(JSON.stringify(result, null, 2), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('💥 Fatal:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
