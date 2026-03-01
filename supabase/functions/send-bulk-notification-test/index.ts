import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';

/**
 * TEST VERSION - Sends to a single test email for preview
 * Usage: Pass ?test_email=your@email.com in the URL
 */
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

  try {
    const url = new URL(req.url);
    const testEmail = url.searchParams.get('test_email');

    if (!testEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing test_email parameter', 
          usage: 'Add ?test_email=your@email.com to the URL' 
        }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    console.log(`Sending test email to: ${testEmail}`);

    // Email template (same as production)
    const emailSubject = '✨ Rikthehuni në Personal Finance Tracker - Funksione të Reja!';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #2f7c31 0%, #1e4620 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background-color: #ffffff;
              padding: 40px 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .feature-box {
              background-color: #f3f4f6;
              border-left: 4px solid #2f7c31;
              padding: 15px 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .feature-box h3 {
              margin: 0 0 10px 0;
              color: #2f7c31;
              font-size: 16px;
            }
            .feature-box ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .feature-box li {
              margin: 5px 0;
              color: #4b5563;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #4caf50 0%, #2f7c31 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 25px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(47, 124, 49, 0.3);
            }
            .cta-section {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
            .emoji {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .test-notice {
              background-color: #fef3c7;
              border: 2px dashed #f59e0b;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 8px;
              text-align: center;
              color: #92400e;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="test-notice">
              🧪 TEST EMAIL - This is a preview. The actual email won't have this notice.
            </div>
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Mirë se u kthyet!</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #1f2937;"><strong>Lajme të Mira!</strong></p>
              <p>Jemi të lumtur t'ju njoftojmë se <strong>Personal Finance Tracker</strong> tani është plotësisht funksional me të gjitha integrimet e reja!</p>
              
              <div class="feature-box">
                <h3>🚀 Çfarë ka të re?</h3>
                <ul>
                  <li><strong>Sistem i ri pagesash</strong> - Pagesa të sigurta dhe të shpejta</li>
                  <li><strong>Planesh Premium</strong> - Më shumë veçori, pa kufizime</li>
                  <li><strong>Provë falas 5-ditore</strong> - Testoni të gjitha veçoritë premium</li>
                  <li><strong>Performancë e përmirësuar</strong> - Eksperiencë më e shpejtë</li>
                </ul>
              </div>

              <p>Të gjitha të dhënat tuaja janë të sigurta dhe të paprekura. Mund të vazhdoni menaxhimin e financave tuaja pikërisht ku e latë.</p>

              <div class="cta-section">
                <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">
                  Jemi të emocionuar që ju shohim përsëri!
                </p>
                <a href="https://personal-finances.app" class="button">
                  Hyni në Llogari ➜
                </a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Nëse keni pyetje ose sugjerime, na kontaktoni në çdo kohë. Faleminderit që jeni pjesë e komunitetit tonë!
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Personal Finance Tracker. Të gjitha të drejtat e rezervuara.</p>
              <p style="margin-top: 10px;">
                <a href="https://personal-finances.app/terms" style="color: #2f7c31; text-decoration: none;">Kushtet e Përdorimit</a> • 
                <a href="https://personal-finances.app/privacy" style="color: #2f7c31; text-decoration: none;">Politika e Privatësisë</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Personal Finance Tracker <noreply@personal-finances.app>',
      to: testEmail,
      subject: '[TEST] ' + emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send test email', 
          details: error 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Test email sent successfully to:', testEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Test email sent to ${testEmail}`,
        emailId: data?.id 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
