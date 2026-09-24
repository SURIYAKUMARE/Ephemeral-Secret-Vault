/**
 * Scraper and Link-Preview Bot Defense Middleware
 *
 * Link preview generators (Slack, Discord, Twitter/X, Facebook, WhatsApp, etc.)
 * issue GET requests to links pasted in chats. If those requests accessed or burned
 * the secret, the secret would be consumed before the intended human recipient opens it.
 *
 * This module detects bots via User-Agent and renders a generic static shell with OpenGraph
 * metadata on GET requests without touching the database, and denies write operations with 403.
 */

const BOT_USER_AGENT_REGEX = /(?:bot|crawl|spider|slurp|slackbot|slack-imgproxy|facebookexternalhit|twitterbot|discordbot|whatsapp|telegrambot|linkedinbot|embedly|preview)/i;

/**
 * Checks if the given User-Agent is a known crawler, link expander, or preview bot.
 * Explicitly excludes curl so CLI and terminal requests work normally.
 *
 * @param {string|undefined} userAgent
 * @returns {boolean}
 */
function isBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }
  const trimmed = userAgent.trim();
  // curl is never blocked
  if (/^curl\//i.test(trimmed)) {
    return false;
  }
  return BOT_USER_AGENT_REGEX.test(trimmed);
}

/**
 * Generic static HTML shell returned to crawlers on GET /view/:id.
 * Zero database access occurs.
 */
const BOT_HTML_SHELL = `<!DOCTYPE html>
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
  <link rel="stylesheet" href="/style.css">
</head>
<body class="bot-view">
  <main class="card">
    <div class="badge">Protected Link</div>
    <h1>Ephemeral Secret Vault</h1>
    <p>A secure, self-destructing secret has been shared via this URL.</p>
    <p class="muted">Automated crawlers cannot access or preview vault contents.</p>
  </main>
</body>
</html>`;

/**
 * Fastify preHandler hook for bot defense.
 */
function botGateHook(request, reply, done) {
  const ua = request.headers['user-agent'];
  if (isBot(ua)) {
    if (request.method === 'GET' && request.url.startsWith('/view/')) {
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .header('X-Robots-Tag', 'noindex, nofollow, noarchive')
        .send(BOT_HTML_SHELL);
      return;
    }

    if (request.method === 'POST') {
      reply.code(403).type('text/plain').send('');
      return;
    }
  }
  done();
}

module.exports = {
  BOT_USER_AGENT_REGEX,
  isBot,
  BOT_HTML_SHELL,
  botGateHook
};
