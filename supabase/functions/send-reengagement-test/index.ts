import { Resend } from 'npm:resend@3';

/**
 * RE-ENGAGEMENT EMAIL - TEST VERSION
 * Sends a single test email to preview the re-engagement campaign
 *
 * Usage:
 * - POST ?test_email=you@example.com&lang=en&username=John
 * - POST JSON body: {"test_email":"you@example.com","lang":"en","username":"John"}
 *
 * Query Parameters:
 *   - test_email: Required. Email address to send the test to
 *   - lang:       Optional. 'en' or 'sq' (default: 'en')
 *   - username:   Optional. Personalise greeting with a name
 */

interface EmailContent {
  subject: string;
  previewText: string;
  html: string;
}

function buildEmailContent(language: 'en' | 'sq', username: string | null): EmailContent {
  const isEnglish = language === 'en';
  const greeting = username
    ? (isEnglish ? `Hi ${username}` : `Përshëndetje ${username}`)
    : (isEnglish ? 'Hi there' : 'Përshëndetje');

  const loginUrl = 'https://personal-finances.app';
  const termsUrl = 'https://personal-finances.app/terms';
  const privacyUrl = 'https://personal-finances.app/privacy';

  const content = {
    en: {
      subject: `💰 ${username || 'Your finances'} ${username ? ', your finances are' : 'are'} waiting — log back in`,
      previewText: 'Track spending, hit goals, and take control — it only takes a minute.',
      headline: 'We Miss You!',
      openingStrong: "It's been a while...",
      openingBody: "We noticed you haven't logged into your <strong>Personal Finance Tracker</strong> account recently. Your financial data is safe and ready for you — and we've added some powerful new features to help you take control.",
      featureTitle: "What's Waiting for You:",
      features: [
        { emoji: '📊', title: 'Dashboard & Charts', desc: 'Visualize your income, expenses, and trends at a glance' },
        { emoji: '🎯', title: 'Financial Goals', desc: 'Set savings targets, track debt payoff, and celebrate milestones' },
        { emoji: '🔁', title: 'Recurring Transactions', desc: 'Automate bills, subscriptions, and regular income' },
        { emoji: '🏦', title: 'Net Worth', desc: 'Monitor your assets and liabilities over time' },
        { emoji: '📅', title: 'Monthly Budgets', desc: 'Set spending limits per category and get alerted before you overspend' },
        { emoji: '❤️', title: 'Financial Health Score', desc: 'Get a monthly score with insights on how to improve your finances' },
        { emoji: '📈', title: 'Spending Benchmarks', desc: 'See how your spending compares to similar households' },
        { emoji: '🔔', title: 'Smart Notifications', desc: 'Stay on top of budget limits, goal milestones, and upcoming bills' },
        { emoji: '📋', title: 'Financial Reports', desc: 'Export detailed income and expense reports by category, date range, or tags' }
      ],
      ctaText: 'Log In Now →',
      trustLine: 'Your data is safe, secure, and waiting for you.',
      closingNote: 'Questions or feedback? We\'d love to hear from you. Thanks for being part of our community!',
      footerCopyright: '© 2026 Personal Finance Tracker. All rights reserved.',
      footerTerms: 'Terms of Use',
      footerPrivacy: 'Privacy Policy'
    },
    sq: {
      subject: `💰 ${username ? username + ', financat tuaja' : 'Financat tuaja'} po ju presin — hyni sërish`,
      previewText: 'Gjurmoni shpenzimet, arrini qëllimet — vetëm një minutë mjafton.',
      headline: 'Na Mungoni!',
      openingStrong: 'Ka kaluar kohë...',
      openingBody: 'Kemi vënë re se nuk keni hyrë në llogarinë tuaj të <strong>Personal Finance Tracker</strong> kohët e fundit. Të dhënat tuaja financiare janë të sigurta dhe të gatshme — dhe kemi shtuar veçori të reja për t\'ju ndihmuar të merrni kontrollin.',
      featureTitle: 'Çfarë ju Pret:',
      features: [
        { emoji: '📊', title: 'Dashboard & Grafikë', desc: 'Shikoni të ardhurat, shpenzimet dhe tendencat tuaja në një vështrim' },
        { emoji: '🎯', title: 'Qëllime Financiare', desc: 'Vendosni objektiva kursimi, gjurmoni shlyerjen e borxheve dhe festoni arritjet' },
        { emoji: '🔁', title: 'Transaksione Periodike', desc: 'Automatizoni faturat, abonimet dhe të ardhurat e rregullta' },
        { emoji: '🏦', title: 'Pasuria Neto', desc: 'Monitoroni aktivet dhe detyrimet tuaja me kalimin e kohës' },
        { emoji: '📅', title: 'Buxhete Mujore', desc: 'Vendosni kufij shpenzimesh për çdo kategori dhe merrni sinjalizime para tejkalimit' },
        { emoji: '❤️', title: 'Shëndeti Financiar', desc: 'Merrni një rezultat mujor me sugjerime për të përmirësuar financat tuaja' },
        { emoji: '📈', title: 'Krahasime Shpenzimesh', desc: 'Shikoni si krahasohen shpenzimet tuaja me familje të ngjashme' },
        { emoji: '🔔', title: 'Njoftimet Inteligjente', desc: 'Qëndroni të informuar për kufijtë e buxhetit, arritjet e qëllimeve dhe faturat e ardhshme' },
        { emoji: '📋', title: 'Raporte Financiare', desc: 'Eksportoni raporte të detajuara të të ardhurave dhe shpenzimeve sipas kategorisë, periudhës ose etiketave' }
      ],
      ctaText: 'Hyni në Llogari →',
      trustLine: 'Të dhënat tuaja janë të sigurta dhe po ju presin.',
      closingNote: 'Pyetje ose sugjerime? Do të donim t\'ju dëgjonim. Faleminderit që jeni pjesë e komunitetit tonë!',
      footerCopyright: '© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.',
      footerTerms: 'Kushtet e Përdorimit',
      footerPrivacy: 'Politika e Privatësisë'
    }
  };

  const c = isEnglish ? content.en : content.sq;

  const html = `
<!DOCTYPE html>
<html lang="${isEnglish ? 'en' : 'sq'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <style>
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
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
    .test-banner {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px dashed #f59e0b;
      padding: 16px;
      text-align: center;
      color: #92400e;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
    .header {
      background: linear-gradient(135deg, #2f7c31 0%, #1e4620 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background-color: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      margin-bottom: 20px;
    }
    .header-title {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 12px 0;
    }
    .opening-strong {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }
    .opening-body {
      font-size: 16px;
      color: #4b5563;
      margin: 0 0 30px 0;
      line-height: 1.7;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 30px 0 20px 0;
    }
    .feature-grid {
      display: block;
      margin: 20px 0;
    }
    .feature-card {
      background-color: #f9fafb;
      border-left: 4px solid #2f7c31;
      padding: 20px;
      margin-bottom: 16px;
      border-radius: 8px;
    }
    .feature-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .feature-emoji {
      font-size: 28px;
      margin-right: 12px;
    }
    .feature-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .feature-desc {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      line-height: 1.6;
    }
    .cta-section {
      text-align: center;
      margin: 35px 0;
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
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(47, 107, 53, 0.45);
    }
    .trust-line {
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      margin: 25px 0 0 0;
      font-style: italic;
    }
    .closing-note {
      font-size: 14px;
      color: #6b7280;
      margin: 30px 0 0 0;
      line-height: 1.7;
    }
    .footer {
      background-color: #f3f4f6;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-copyright {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 12px 0;
    }
    .footer-links {
      font-size: 13px;
    }
    .footer-links a {
      color: #2f7c31;
      text-decoration: none;
      font-weight: 600;
    }
    .footer-links a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .header-title {
        font-size: 26px;
      }
      .cta-button {
        padding: 14px 32px;
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="test-banner">
        🧪 TEST EMAIL — This is a preview. The actual email won't have this notice.
      </div>
      <div class="header">
        <div class="header-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 17 L10 11 L14 14 L20 6" />
            <path d="M15 6 L20 6 L20 11" />
          </svg>
        </div>
        <h1 class="header-title">${c.headline}</h1>
      </div>
      <div class="content">
        <p class="greeting">${greeting},</p>
        <p class="opening-strong">${c.openingStrong}</p>
        <p class="opening-body">${c.openingBody}</p>

        <h2 class="section-title">${c.featureTitle}</h2>
        <div class="feature-grid">
          ${c.features.map(f => `
          <div class="feature-card">
            <div class="feature-header">
              <span class="feature-emoji">${f.emoji}</span>
              <h3 class="feature-title">${f.title}</h3>
            </div>
            <p class="feature-desc">${f.desc}</p>
          </div>
          `).join('')}
        </div>

        <div class="cta-section">
          <a href="${loginUrl}" class="cta-button" style="color: #ffffff !important; text-decoration: none !important;">${c.ctaText}</a>
          <p class="trust-line"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg> ${c.trustLine}</p>
        </div>

        <p class="closing-note">${c.closingNote}</p>
      </div>
      <div class="footer">
        <p class="footer-copyright">${c.footerCopyright}</p>
        <p class="footer-links">
          <a href="${termsUrl}">${c.footerTerms}</a> •
          <a href="${privacyUrl}">${c.footerPrivacy}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject: c.subject,
    previewText: c.previewText,
    html
  };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    let body: { test_email?: string; lang?: 'en' | 'sq'; username?: string } = {};

    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = await req.json();
      }
    } catch {
      body = {};
    }

    const testEmail =
      url.searchParams.get('test_email') ||
      body.test_email ||
      'duljamarin@gmail.com';

    const rawLang =
      url.searchParams.get('lang') ||
      body.lang ||
      'en';

    const lang: 'en' | 'sq' = rawLang === 'sq' ? 'sq' : 'en';

    const username: string | null =
      url.searchParams.get('username') ||
      body.username ||
      null;

    if (!testEmail) {
      return new Response(
        JSON.stringify({
          error: 'Missing test email',
          usageQuery: '?test_email=you@example.com&lang=en&username=John',
          usageBody: '{"test_email":"you@example.com","lang":"en","username":"John"}'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY is not configured in function secrets.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const resend = new Resend(resendApiKey);

    console.log(`📧 Sending test re-engagement email to: ${testEmail} (lang: ${lang}${username ? `, username: ${username}` : ''})`);

    const { subject, previewText, html } = buildEmailContent(lang, username);

    const { data, error } = await resend.emails.send({
      from: 'Personal Finance Tracker <noreply@personal-finances.app>',
      to: testEmail,
      subject: '[TEST] ' + subject,
      html: html,
      text: previewText,
    });

    if (error) {
      console.error('❌ Failed to send test email:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to send test email',
          details: error
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Test email sent successfully:', { to: testEmail, lang, username, emailId: data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email sent to ${testEmail}`,
        language: lang,
        username,
        emailId: data?.id
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
