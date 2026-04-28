// /en-eu/init-eu.js — EU-Market initialization (cookie-free).
// Phase P Sprint 1: only writes localStorage on first visit. Cookie-based
// override removed alongside the matching middleware/lang-switch cookie.
//
// Behavior:
// - First visit (no eaf.market in localStorage): default to "eu" since the
//   visitor explicitly landed on /en-eu/ (either via geo-redirect or a
//   direct/back-link — both indicate EU intent).
// - Returning visitor: respect their existing eaf.market choice.

(function() {
  try {
    if (!localStorage.getItem('eaf.market')) {
      localStorage.setItem('eaf.market', 'eu');
    }
  } catch (_) {
    // Private mode or localStorage disabled — silent fail.
  }
})();
