/**
 * Device, Browser and OS Identification Service from User-Agent.
 */

function parseUserAgent(uaString) {
  const ua = String(uaString || '').trim();
  if (!ua) {
    return {
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      device_type: 'Desktop',
      is_bot: false
    };
  }

  // Detect Bots & Crawlers
  const botMatch = ua.match(/(Slackbot|Twitterbot|Discordbot|facebookexternalhit|WhatsApp|TelegramBot|Googlebot|bingbot|curl|Wget|Postman)/i);
  if (botMatch) {
    return {
      browser: botMatch[1],
      os: 'Automated Bot / Crawler',
      device_type: 'Bot',
      is_bot: true
    };
  }

  // Detect Operating System
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows Desktop';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Device Type
  let device_type = 'Desktop';
  if (/Mobile|Android|iPhone|iPod/i.test(ua) && !/iPad|Tablet/i.test(ua)) {
    device_type = 'Mobile';
  } else if (/iPad|Tablet/i.test(ua)) {
    device_type = 'Tablet';
  }

  // Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) browser = 'Apple Safari';

  return {
    browser,
    os,
    device_type,
    is_bot: false
  };
}

module.exports = {
  parseUserAgent
};
