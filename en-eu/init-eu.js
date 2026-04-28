// /en-eu/init-eu.js — Smart EU-Market initialization
// Phase 5e: Sets eaf.market="eu" on /en-eu/-pages with user-choice respect.
//
// Behavior:
// - New user (no LocalStorage): set "eu" as default
// - User clicked Lang-Switcher EU (cookie en-eu): ensure "eu" consistency
// - User manually chose other market on /en-eu/: respect choice
//
// Strictly necessary for UI consistency, no consent banner required.

(function() {
  try {
    var current = localStorage.getItem('eaf.market');
    var cookie = document.cookie || '';
    var hasEnEuCookie = cookie.indexOf('evspend_locale=en-eu') >= 0;

    // Set "eu" only if:
    // 1. LocalStorage is empty (new user)
    // 2. User explicitly chose EU via Lang-Switcher (cookie en-eu)
    if (!current || (hasEnEuCookie && current !== 'eu')) {
      localStorage.setItem('eaf.market', 'eu');
    }
    // Otherwise: respect user's manual market choice
  } catch (_) {
    // Private mode or localStorage disabled — silent fail
  }
})();
