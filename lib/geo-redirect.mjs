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

// Preserve the original response and all existing headers, including redirects.
export async function handleGeoRequest(context) {
  const response = geoRedirect(context.request) || await context.next();
  const host = new URL(context.request.url).hostname.toLowerCase();
  const pagesHost = host === 'pages.dev' || host.endsWith('.pages.dev');
  if (!pagesHost && context.env?.CF_NOINDEX !== '1') return response;
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
