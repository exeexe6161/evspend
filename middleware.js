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
  // Only the base calculator and history have matching regional shells.
  // Legal pages already link to their own canonical language destinations.
  matcher: ['/', '/verlauf'],
};

const DOMESTIC_COUNTRIES = ['DE', 'AT', 'CH', 'LI', 'US', 'CA', 'MX', 'TR'];
const BOT_UA_REGEX = /bot|crawler|spider|googlebot|bingbot|yandex|duckduckgo|baidu|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot/i;

export default function middleware(request) {
  const url = new URL(request.url);
  // Use the same allowlist even if the host invokes us on another path.
  if (!config.matcher.includes(url.pathname)) return;

  const country = request.headers.get('x-vercel-ip-country') || '';
  const ua = request.headers.get('user-agent') || '';

  // 1. Bot? Skip redirect (SEO-Crawler must reach all variants).
  if (BOT_UA_REGEX.test(ua)) {
    return;
  }

  // 2. Turkish IP → dedicated /tr/ market shell (parity with /en-eu/). Runs
  //    BEFORE the generic branch; TR stays in DOMESTIC_COUNTRIES so that branch
  //    can never grab it. Regional destinations are outside the allowlist.
  if (country === 'TR') {
    url.pathname = '/tr' + url.pathname;
    return Response.redirect(url, 302);
  }

  // 3. Other non-domestic country → redirect to /en-eu/.
  if (!DOMESTIC_COUNTRIES.includes(country)) {
    // Change only the path so history parameters and URL fragments survive.
    url.pathname = '/en-eu' + url.pathname;
    return Response.redirect(url, 302);
  }
}
