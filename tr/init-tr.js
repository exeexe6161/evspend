// /tr/init-tr.js — TR-Market initialization (cookie-free).
// Mirror of /en-eu/init-eu.js: only writes localStorage on first visit.
// Visitor landed on /tr/ (geo-redirect or direct link) → TR intent.
(function() {
  try {
    if (!localStorage.getItem('eaf.market')) {
      localStorage.setItem('eaf.market', 'tr');
    }
  } catch (_) {
    // Private mode or localStorage disabled — silent fail.
  }
})();
