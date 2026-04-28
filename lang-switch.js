// /lang-switch.js — Persists market choice in localStorage before navigation.
// Phase P Sprint 1: cookie-free implementation (Datenschutz alignment).
//
// Why localStorage only:
//   The Datenschutzerklärung promises "Verzicht auf Cookies". Earlier versions
//   set a `evspend_locale` cookie for middleware-side override (kept user choice
//   across sessions for non-domestic IP-geo). That cookie is now removed.
//   The matching cookie-respect block in middleware.js is gone too — geo-IP
//   redirect remains the only middleware behaviour, and it only fires on the
//   first / load for non-domestic countries. Manual market switches are now
//   purely client-side via localStorage `eaf.market` (read by script.js).

(function() {
  // Locale → eaf.market mapping for script.js (loadI18nState) consistency.
  var LOCALE_TO_MARKET = {
    'de': 'de',
    'us': 'us',
    'tr': 'tr',
    'en-eu': 'eu'
  };

  document.querySelectorAll('[data-set-locale]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var locale = el.dataset.setLocale;
      var target = el.getAttribute('href');

      // localStorage eaf.market (script.js — UI language + currency + slider defaults)
      var market = LOCALE_TO_MARKET[locale];
      if (market) {
        try {
          localStorage.setItem('eaf.market', market);
        } catch (_) {}
      }
      window.location.href = target;
    });
  });
})();
