import nodemailer from 'nodemailer'

function getMailConfig() {
  const host = process.env.SMTP_HOST || process.env.MAILTRAP_HOST
  const port = Number(process.env.SMTP_PORT || process.env.MAILTRAP_PORT || 2525)
  const user = process.env.SMTP_USER || process.env.MAILTRAP_USER
  const pass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465

  if (!host || !user || !pass) {
    throw new Error('Konfigurasi SMTP belum lengkap')
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass }
  }
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000'
}

export async function sendBuyerVerificationEmail({ to, nama, token }) {
  const transporter = nodemailer.createTransport(getMailConfig())
  const verifyUrl = `${getAppBaseUrl()}/register/verify?token=${encodeURIComponent(token)}`
  const from = process.env.MAIL_FROM || 'no-reply@kambing.local'

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content {
            padding: 40px 20px;
          }
          .content p {
            margin: 15px 0;
            font-size: 15px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 20px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }
          .verify-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 5px 0;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐐 Kambing Qurban</h1>
          </div>
          <div class="content">
            <div class="greeting">Halo ${nama},</div>
            <p>Terima kasih telah mendaftar di platform Kambing Qurban! Kami senang memiliki Anda sebagai bagian dari komunitas kami.</p>
            <p>Untuk menyelesaikan proses pendaftaran, silakan verifikasi email Anda dengan mengklik tombol di bawah ini:</p>
            
            <div class="button-container">
              <a href="${verifyUrl}" class="verify-button">Verifikasi Email Saya</a>
            </div>

            <p style="text-align: center; font-size: 14px; color: #999;">Atau copy dan paste link berikut di browser Anda:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 12px; color: #666;"><a href="${verifyUrl}" style="color: #667eea; text-decoration: none;">${verifyUrl}</a></p>

            <div class="warning">
              <strong>⏱️ Link ini berlaku selama 24 jam</strong>
              <p style="margin: 5px 0 0 0;">Jika Anda tidak melakukan pendaftaran ini, abaikan email ini atau hubungi tim support kami.</p>
            </div>

            <p>Pertanyaan? Hubungi tim support kami di <a href="mailto:support@kambing.local" style="color: #667eea; text-decoration: none;">support@kambing.local</a></p>
          </div>
          <div class="footer">
            <p><strong>© 2026 Kambing Qurban. All rights reserved.</strong></p>
            <p>Jangan forward email ini ke orang lain. Link verifikasi hanya untuk akun ini.</p>
          </div>
        </div>
      </body>
    </html>
  `

  await transporter.sendMail({
    from,
    to,
    subject: '✉️ Verifikasi Email Akun Pembeli - Kambing Qurban',
    text: `Halo ${nama}, silakan verifikasi akun pembeli kamu dengan klik link berikut: ${verifyUrl}`,
    html: htmlTemplate
  })
}