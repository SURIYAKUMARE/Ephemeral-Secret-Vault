/**
 * Crawler & Link Preview Bot Guard Middleware
 *
 * Prevents automated chat crawlers (Slack, Discord, Twitter/X, WhatsApp, etc.)
 * from consuming secrets or reading database state.
 */

const BOT_USER_AGENT_REGEX = /(?:bot|crawl|spider|slurp|slackbot|slack-imgproxy|facebookexternalhit|twitterbot|discordbot|whatsapp|telegrambot|linkedinbot|embedly|preview)/i;

const BOT_STATIC_SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="referrer" content="no-referrer">
  <meta property="og:title" content="Ephemeral Secret Vault">
  <meta property="og:description" content="This secure secret link will self-destruct once viewed.">
  <meta property="og:type" content="website">
  <title>Ephemeral Secret Vault</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body style="background:#0a0d14;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
  <div style="background:#121824;border:1px solid #243048;border-radius:12px;padding:2rem;max-width:480px;text-align:center;">
    <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">Ephemeral Secret Vault</h1>
    <p style="color:#94a3b8;font-size:0.95rem;">A secure, self-destructing secret has been shared via this URL.</p>
    <p style="color:#64748b;font-size:0.8rem;margin-top:1rem;">Automated crawlers cannot access or preview vault contents.</p>
  </div>
</body>
</html>`;

function isCrawler(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }
  const trimmed = userAgent.trim();
  // curl is strictly whitelisted for CLI and terminal requests
  if (/^curl\//i.test(trimmed)) {
    return false;
  }
  return BOT_USER_AGENT_REGEX.test(trimmed);
}

function botGuard(req, res, next) {
  const ua = req.headers['user-agent'];
  if (isCrawler(ua)) {
    if (req.method === 'GET' && req.path.startsWith('/view/')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.status(200).send(BOT_STATIC_SHELL);
    }

    if (req.method === 'POST') {
      return res.status(403).type('text/plain').send('');
    }
  }
  next();
}

module.exports = {
  botGuard,
  isCrawler,
  BOT_STATIC_SHELL
};
