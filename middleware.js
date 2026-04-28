// middleware.js — Smart Hard-Redirect for EN-EU Market
// Phase 4: v2.0-en-eu-market

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
  const cookie = request.headers.get('cookie') || '';

  // 1. Bot? Skip redirect (SEO-Crawler must reach all variants)
  if (BOT_UA_REGEX.test(ua)) {
    return;
  }

  // 2. Cookie set? Respect user override
  const localeMatch = cookie.match(/evspend_locale=(de|us|tr|en-eu)/);
  if (localeMatch) {
    const locale = localeMatch[1];

    // User explicitly chose en-eu but is on / → redirect
    if (locale === 'en-eu' && !url.pathname.startsWith('/en-eu')) {
      return Response.redirect(
        new URL('/en-eu' + url.pathname, request.url),
        302
      );
    }

    // User chose domestic locale (de/us/tr) but is on /en-eu/ → redirect to /
    if (locale !== 'en-eu' && url.pathname.startsWith('/en-eu')) {
      const newPath = url.pathname.replace(/^\/en-eu/, '') || '/';
      return Response.redirect(new URL(newPath, request.url), 302);
    }

    return; // Cookie matches current location
  }

  // 3. First visit + non-domestic country?
  if (!DOMESTIC_COUNTRIES.includes(country) && !url.pathname.startsWith('/en-eu')) {
    return Response.redirect(
      new URL('/en-eu' + url.pathname, request.url),
      302
    );
  }
}
