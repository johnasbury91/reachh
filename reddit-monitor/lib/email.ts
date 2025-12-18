import { Resend } from 'resend'

const getResend = () => new Resend(process.env.RESEND_API_KEY || 'dummy_key')

const FROM_EMAIL = 'Reachh <hello@reachh.com>'
const REPLY_TO = 'support@reachh.com'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: wrapInLayout(html),
      replyTo: replyTo || REPLY_TO,
    })

    if (error) {
      console.error('Email send error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reachh</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #fafafa;
      background-color: #09090b;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .logo {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      text-decoration: none;
      margin-bottom: 32px;
      display: block;
    }
    .content {
      background-color: #111113;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #fafafa;
    }
    p {
      margin: 0 0 16px 0;
      color: #a1a1aa;
    }
    .btn {
      display: inline-block;
      background-color: #ea580c;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 8px 0;
    }
    .btn:hover {
      background-color: #c2410c;
    }
    .btn-secondary {
      background-color: #27272a;
      color: #fafafa !important;
    }
    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 24px 0;
    }
    .stats-box {
      background-color: #0c0c0e;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .stats-row:last-child {
      border-bottom: none;
    }
    .stats-label {
      color: #52525b;
    }
    .stats-value {
      color: #fafafa;
      font-weight: 600;
    }
    .highlight {
      color: #ea580c;
    }
    .muted {
      color: #52525b;
      font-size: 14px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.06);
      text-align: center;
      color: #52525b;
      font-size: 12px;
    }
    .footer a {
      color: #52525b;
      text-decoration: underline;
    }
    .thread-card {
      background-color: #0c0c0e;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .thread-title {
      color: #fafafa;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .thread-meta {
      color: #52525b;
      font-size: 14px;
    }
    .success-badge {
      display: inline-block;
      background-color: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="https://reachh.com" class="logo">reachh</a>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>You're receiving this because you signed up for Reachh.</p>
      <p>
        <a href="{{unsubscribe_url}}">Unsubscribe</a> ·
        <a href="https://app.reachh.com/settings">Email preferences</a>
      </p>
      <p style="margin-top: 16px;">Reachh · London, UK</p>
    </div>
  </div>
</body>
</html>
`
}
