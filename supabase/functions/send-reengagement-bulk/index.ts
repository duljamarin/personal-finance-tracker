import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';

/**
 * RE-ENGAGEMENT EMAIL - BULK VERSION
 * Sends personalized re-engagement emails to all confirmed users
 * 
 * Usage: POST to this endpoint (no parameters needed)
 * 
 * Features:
 * - Auto-detects user language from user_metadata.language
 * - Personalizes with username from user_metadata.username
 * - Rate-limited to 600ms between sends (respects Resend 2 req/sec limit)
 * - Only sends to users with confirmed email addresses
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
        { emoji: '🔔', title: 'Smart Notifications', desc: 'Stay on top of budget limits, goal milestones, and upcoming bills' }
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
        { emoji: '🔔', title: 'Njoftimet Inteligjente', desc: 'Qëndroni të informuar për kufijtë e buxhetit, arritjet e qëllimeve dhe faturat e ardhshme' }
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
      <div class="header">
        <span class="header-emoji">💰</span>
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
          <p class="trust-line">🔒 ${c.trustLine}</p>
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    console.log('📧 Fetching all registered users...');
    
    // Fetch all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: error }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`📋 Found ${users.length} total users`);

    // Filter users with confirmed emails
    const confirmedUsers = users.filter(user => user.email && user.email_confirmed_at);
    console.log(`✅ Confirmed users to contact: ${confirmedUsers.length}`);

    // Send emails ONE AT A TIME to respect rate limits
    // Resend allows 2 requests per second, so we'll send 1 every 600ms to be safe
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const languageStats = { en: 0, sq: 0, default: 0 };

    console.log('📤 Starting bulk re-engagement email send...');
    
    for (let i = 0; i < confirmedUsers.length; i++) {
      const user = confirmedUsers[i];
      
      // Extract language and username from user metadata
      const userLanguage = user.user_metadata?.language || 'sq';
      const username = user.user_metadata?.username || null;
      const language = (userLanguage === 'en' ? 'en' : 'sq') as 'en' | 'sq';
      
      languageStats[language]++;
      
      console.log(`📨 Sending ${i + 1}/${confirmedUsers.length} to ${user.email} (${language}${username ? `, ${username}` : ''})`);
      
      try {
        const { subject, previewText, html } = buildEmailContent(language, username);
        
        const { data, error } = await resend.emails.send({
          from: 'Personal Finance Tracker <noreply@personal-finances.app>',
          to: user.email!,
          subject: subject,
          html: html,
          text: previewText, // Fallback plain text
        });

        if (error) {
          console.error(`❌ Failed to send to ${user.email}:`, error);
          errorCount++;
          errors.push(`${user.email}: ${error.message || 'Unknown error'}`);
        } else {
          console.log(`✅ Sent to ${user.email} (ID: ${data?.id})`);
          successCount++;
        }
      } catch (err) {
        console.error(`💥 Error sending to ${user.email}:`, err);
        errorCount++;
        errors.push(`${user.email}: ${err.message || 'Unknown error'}`);
      }

      // Wait 600ms between each email (allows ~1.67 emails/sec, under the 2/sec limit)
      if (i < confirmedUsers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    const result = {
      success: true,
      totalUsers: users.length,
      confirmedUsers: confirmedUsers.length,
      successCount,
      errorCount,
      languageStats,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RE-ENGAGEMENT CAMPAIGN COMPLETE');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📧 Total confirmed users: ${confirmedUsers.length}`);
    console.log(`🌍 Languages: EN=${languageStats.en}, SQ=${languageStats.sq}`);
    console.log('═══════════════════════════════════════════════');

    return new Response(
      JSON.stringify(result, null, 2),
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
