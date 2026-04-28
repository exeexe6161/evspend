// /lang-switch.js — Sets evspend_locale cookie + currentMarket localStorage
// before navigation. Phase 4 Etappe 3: v2.0-en-eu-market
// Strictly necessary cookie (ePrivacy Art. 5(3)) — no consent banner required.

(function() {
  // Locale → eaf.market mapping for script.js (loadI18nState) consistency.
  // Mapping ist technisch (User-transparent), siehe datenschutz.html Cookie Notice.
  // Phase 5: 'en-eu' Cookie sets market='eu' (EU-Market in MARKET_CONFIG since 5b).
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

      // 1. Cookie (middleware.js — Geo-Override, 1 year)
      document.cookie = 'evspend_locale=' + locale +
                       '; path=/; max-age=31536000; SameSite=Lax';

      // 2. localStorage eaf.market (script.js — UI language + currency + slider defaults)
      var market = LOCALE_TO_MARKET[locale];
      if (market) {
        try {
          localStorage.setItem('eaf.market', market);
        } catch (_) {}
      }
      // 3. Navigate
      window.location.href = target;
    });
  });
})();
