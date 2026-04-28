// middleware.js — Geo-IP Hard-Redirect for EN-EU Market.
//
// Phase P Sprint 1: cookie-free. The previous `evspend_locale` cookie + its
// "respect user override" block were removed to align with Datenschutz
// "Verzicht auf Cookies". Manual market choice now lives in localStorage
// (purely client-side, read by script.js after page load). Trade-off: a
// non-domestic visitor who manually switches to / via the market pill will
// land on /en-eu/ again on the next session — JS then immediately switches
// the UI back to their stored market preference.

export const config = {
  matcher: [
    '/',
    '/((?!en-eu|api|_next|_vercel|fonts|favicon|robots.txt|sitemap.xml|manifest|.*\\..*).*)'
  ],
};

const DOMESTIC_COUNTRIES = ['DE', 'AT', 'CH', 'LI', 'US', 'CA', 'MX', 'TR'];
const BOT_UA_REGEX = /bot|crawler|spider|googlebot|bingbot|yandex|duckduckgo|baidu|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot/i;

export default function middleware(request) {
  const url = new URL(request.url);
  const country = request.headers.get('x-vercel-ip-country') || '';
  const ua = request.headers.get('user-agent') || '';

  // 1. Bot? Skip redirect (SEO-Crawler must reach all variants).
  if (BOT_UA_REGEX.test(ua)) {
    return;
  }

  // 2. Non-domestic country on / → redirect to /en-eu/.
  if (!DOMESTIC_COUNTRIES.includes(country) && !url.pathname.startsWith('/en-eu')) {
    return Response.redirect(
      new URL('/en-eu' + url.pathname, request.url),
      302
    );
  }
}
