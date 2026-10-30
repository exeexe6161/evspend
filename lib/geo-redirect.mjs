// Cloudflare port of middleware.js (Vercel). Same rules; the country comes from the Workers runtime (request.cf.country).
// Cookie-free, no storage. Only used by functions/index.js and functions/verlauf.js.
export const MATCH = ['/', '/verlauf'];
const DOMESTIC_COUNTRIES = ['DE', 'AT', 'CH', 'LI', 'US', 'CA', 'MX', 'TR'];
const BOT_UA_REGEX = /bot|crawler|spider|googlebot|bingbot|yandex|duckduckgo|baidu|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot/i;

export function geoRedirect(request) {
  const url = new URL(request.url);
  if (!MATCH.includes(url.pathname)) return null;
  // Explicit market navigation wins over geo detection, without cookies.
  if (['de', 'us'].includes(url.searchParams.get('market'))) return null;
  const country = (request.cf && request.cf.country) || '';
  if (BOT_UA_REGEX.test(request.headers.get('user-agent') || '')) return null; // crawlers must reach all variants
  if (country === 'TR') {
    url.pathname = '/tr' + url.pathname;
    return Response.redirect(url.toString(), 302);
  }
  if (!DOMESTIC_COUNTRIES.includes(country)) {
    // Change only the path so query parameters survive.
    url.pathname = '/en-eu' + url.pathname;
    return Response.redirect(url.toString(), 302);
  }
  return null;
}
