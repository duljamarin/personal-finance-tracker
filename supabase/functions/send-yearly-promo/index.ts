import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';

/**
 * YEARLY SUBSCRIPTION PROMO-BATCH EMAIL
 *
 * Sends a promotional email offering the yearly plan at €30 to all confirmed users.
 * Processes users in batches of 50 per invocation so the full list is covered
 * across multiple deploys / calls without hitting Resend rate limits.
 *
 * POST body (all optional):
 *   { offset?: number, dry_run?: boolean, exclude_emails?: string[] }
 *
 * offset=0  → sends to users 0–49
 * offset=50 → sends to users 50–99
 * … and so on until confirmedUsers.length is exhausted.
 *
 * The response includes `next_offset` so you know what to pass next.
 *
 * Deploy:
 *   supabase functions deploy send-yearly-promo
 *
 * Invoke (example-call once per batch):
 *   curl -X POST https://<ref>.supabase.co/functions/v1/send-yearly-promo \
 *     -H "Authorization: Bearer <anon_key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"offset": 0}'
 */

const BATCH_SIZE = 10_000; // effectively unlimited — all users sent in one call
const APP_URL = 'https://personal-finances.app';
const PRICING_URL = `${APP_URL}/pricing`;
const TERMS_URL = `${APP_URL}/terms`;
const PRIVACY_URL = `${APP_URL}/privacy`;

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

function buildPromoEmail(language: 'en' | 'sq', username: string | null): EmailContent {
  const isSq = language === 'sq';
  const name = username ?? (isSq ? 'mik' : 'there');

  const copy = {
    en: {
      subject: `🎉 Special offer: get the full Personal Finance Tracker for just €30/year`,
      previewText: 'Unlimited transactions, premium features, one simple price.',
      preheader: 'Unlimited access. One price. No surprises.',
      greeting: `Hi ${name},`,
      hook: 'We have a special offer just for you.',
      intro: `You\'re already using <strong>Personal Finance Tracker</strong> to manage your money - and we want to help you get even more out of it. For a limited time, you can unlock <strong>everything</strong> for just <strong>€30 per year</strong>.`,
      offerLabel: 'Limited-time offer',
      offerPrice: '€30',
      offerPer: '/ year',
      offerNote: 'That\'s less than €2.50 per month - less than a coffee.',
      whatYouGet: 'Everything included:',
      features: [
        { icon: '∞', title: 'Unlimited transactions', desc: 'No monthly caps, ever.' },
        { icon: '🎯', title: 'Financial Goals', desc: 'Set targets, track progress, celebrate wins.' },
        { icon: '📅', title: 'Monthly Budgets', desc: 'Spending limits per category with live alerts.' },
        { icon: '🔁', title: 'Recurring Transactions', desc: 'Automate bills and regular income.' },
        { icon: '📊', title: 'Advanced Reports', desc: 'Full income & expense breakdowns by period.' },
        { icon: '🏦', title: 'Net Worth Tracker', desc: 'Assets, liabilities, and real - time net worth.' },
        { icon: '❤️', title: 'Financial Health Score', desc: 'Monthly score with personalized insights.' },
        { icon: '🔔', title: 'Smart Notifications', desc: 'Budget alerts, goal milestones, and more.' },
      ],
      ctaText: 'Get the Yearly Plan - €30',
      ctaSubtext: 'Secure checkout',
      closingTitle: 'Why upgrade now?',
      closingBody: 'This offer is available to early members of our community. Lock in the €30/year rate before it changes - and take full control of your finances.',
      signoff: 'The Personal Finance Tracker team',
      footerCopyright: '© 2026 Personal Finance Tracker. All rights reserved.',
      footerTerms: 'Terms of Use',
      footerPrivacy: 'Privacy Policy',
      footerUnsubscribe: 'You received this because you have an account with Personal Finance Tracker.',
    },
    sq: {
      subject: `🎉 Ofertë speciale: merrni Personal Finance Tracker të plotë për vetëm €30/vit`,
      previewText: 'Transaksione të pakufizuara, funksione premium, çmim i thjeshtë.',
      preheader: 'Akses i plotë. Një çmim. Pa surpriza.',
      greeting: `Përshëndetje ${name},`,
      hook: 'Kemi një ofertë speciale vetëm për ju.',
      intro: `Ju tashmë po përdorni <strong>Personal Finance Tracker</strong> për të menaxhuar financat tuaja - dhe ne duam t\'ju ndihmojmë të nxirrni edhe më shumë prej tij. Për një kohë të kufizuar, mund të zhbllokoni <strong>gjithçka</strong> për vetëm <strong>€30 në vit</strong>.`,
      offerLabel: 'Ofertë me kohë të kufizuar',
      offerPrice: '€30',
      offerPer: '/ vit',
      offerNote: 'Kjo është më pak se €2.50 në muaj - më pak se një kafe.',
      whatYouGet: 'Gjithçka e përfshirë:',
      features: [
        { icon: '∞', title: 'Transaksione të pakufizuara', desc: 'Pa kufizime mujore, kurrë.' },
        { icon: '🎯', title: 'Qëllime Financiare', desc: 'Vendosni objektiva, gjurmoni progresin, festoni arritjet.' },
        { icon: '📅', title: 'Buxhete Mujore', desc: 'Kufij shpenzimesh për çdo kategori me sinjalizime.' },
        { icon: '🔁', title: 'Transaksione Periodike', desc: 'Automatizoni faturat dhe të ardhurat e rregullta.' },
        { icon: '📊', title: 'Raporte të Avancuara', desc: 'Analiza të plota të të ardhurave dhe shpenzimeve.' },
        { icon: '🏦', title: 'Pasuria Neto', desc: 'Aktive, detyrime dhe pasuria neto në kohë reale.' },
        { icon: '❤️', title: 'Shëndeti Financiar', desc: 'Rezultat mujor me sugjerime të personalizuara.' },
        { icon: '🔔', title: 'Njoftimet Inteligjente', desc: 'Alarme buxheti, arritje qëllimesh dhe shumë të tjera.' },
      ],
      ctaText: 'Merrni Planin Vjetor - €30',
      ctaSubtext: 'Pagesë e sigurt',
      closingTitle: 'Pse të abonoheni tani?',
      closingBody: 'Kjo ofertë është e disponueshme për anëtarët e hershëm të komunitetit tonë. Siguroni çmimin €30/vit para se të ndryshojë - dhe merrni kontrollin e plotë të financave tuaja.',
      signoff: 'Ekipi i Personal Finance Tracker',
      footerCopyright: '© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.',
      footerTerms: 'Kushtet e Përdorimit',
      footerPrivacy: 'Politika e Privatësisë',
      footerUnsubscribe: 'E morët këtë sepse keni një llogari në Personal Finance Tracker.',
    },
  };

  const c = isSq ? copy.sq : copy.en;

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

          <!-- ═══ OFFER BOX ═══ -->
          <tr>
            <td class="content-pad" style="padding: 28px 40px;">
              <table class="offer-box" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, ${BRAND_50} 0%, #d5f5ec 100%); border: 2px solid ${BRAND_600}; border-radius: 14px; padding: 32px 36px; text-align:center;">
                <tr>
                  <td>
                    <div style="display:inline-block; background:${BRAND_600}; color:#fff; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 14px; border-radius:999px; margin-bottom:20px;">${c.offerLabel}</div>
                    <div style="margin-bottom:6px;">
                      <span class="price-num" style="font-size:64px; font-weight:800; color:${BRAND_600}; letter-spacing:-2px; line-height:1;">${c.offerPrice}</span>
                      <span style="font-size:20px; font-weight:600; color:${BRAND_700}; vertical-align:middle; margin-left:4px;">${c.offerPer}</span>
                    </div>
                    <p style="margin:0 0 24px; font-size:14px; color:#0b5449; font-style:italic;">${c.offerNote}</p>
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="background-color:${BRAND_600}; border-radius:10px; box-shadow:0 4px 14px rgba(15,107,94,0.35);">
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
    let body: { offset?: number; dry_run?: boolean; exclude_emails?: string[] } = {};
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) body = await req.json();
    } catch { /* empty body is fine */ }

    const offset = Math.max(0, Number(body.offset ?? 0));
    const dryRun = body.dry_run === true;
    const excludeEmails = new Set((body.exclude_emails ?? []).map((e: string) => e.toLowerCase()));

    console.log(`🎯 Yearly promo batch-offset=${offset}, batch_size=${BATCH_SIZE}${dryRun ? ' [DRY RUN]' : ''}`);

    // ── Supabase & Resend ─────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // ── Fetch all confirmed users (paginated) ─────────────────────────────────
    const allUsers: Array<{ email: string; email_confirmed_at: string; user_metadata: Record<string, string> }> = [];
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

    console.log(`📋 Total confirmed users: ${confirmedUsers.length}`);

    // ── Slice the batch ───────────────────────────────────────────────────────
    const batch = confirmedUsers.slice(offset, offset + BATCH_SIZE);
    const nextOffset = offset + BATCH_SIZE;
    const hasMore = nextOffset < confirmedUsers.length;

    if (batch.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users in this batch range.',
        offset,
        total_confirmed: confirmedUsers.length,
        has_more: false,
        next_offset: null,
      }), { status: 200, headers: corsHeaders });
    }

    console.log(`📨 Processing batch ${offset}–${offset + batch.length - 1} (${batch.length} users)`);

    // ── Send emails ───────────────────────────────────────────────────────────
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const user = batch[i];
      const lang = (user.user_metadata?.language === 'en' ? 'en' : 'sq') as 'en' | 'sq';
      const username = user.user_metadata?.username ?? null;

      console.log(`${dryRun ? '🔍' : `📤 [${offset + i + 1}/${confirmedUsers.length}]`} ${user.email} (${lang}${username ? `, ${username}` : ''})`);

      if (!dryRun) {
        try {
          const { subject, previewText, html } = buildPromoEmail(lang, username);
          const { data, error } = await resend.emails.send({
            from: 'Personal Finance Tracker <noreply@personal-finances.app>',
            to: user.email,
            subject,
            html,
            text: previewText,
          });
          if (error) {
            console.error(`❌ ${user.email}:`, error);
            errorCount++;
            errors.push(`${user.email}: ${error.message ?? 'Unknown error'}`);
          } else {
            console.log(`✅ Sent-ID: ${data?.id}`);
            successCount++;
          }
        } catch (err) {
          console.error(`💥 ${user.email}:`, err);
          errorCount++;
          errors.push(`${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else {
        successCount++;
      }

      // Respect Resend rate limit (2 req/s)-600ms gap
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    const result = {
      success: true,
      dry_run: dryRun,
      offset,
      batch_size: batch.length,
      total_confirmed: confirmedUsers.length,
      success_count: successCount,
      error_count: errorCount,
      has_more: hasMore,
      next_offset: hasMore ? nextOffset : null,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('📊 YEARLY PROMO BATCH COMPLETE');
    console.log(`✅ Sent: ${successCount}  ❌ Failed: ${errorCount}`);
    console.log(`📦 Batch: ${offset}–${offset + batch.length - 1} / ${confirmedUsers.length}`);
    console.log(hasMore ? `➡️  Next offset: ${nextOffset}` : '🏁 All batches done!');
    console.log('══════════════════════════════════════════');

    return new Response(JSON.stringify(result, null, 2), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('💥 Fatal:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
