// /en-eu/init-eu.js — EU page hint (cookie-free, no storage access).
// Opening this page must NOT write a persistent market preference.
// It only tells script.js which market the current URL belongs to; script.js
// uses the hint when the visitor has no stored explicit choice. A persistent
// choice is written only by an explicit user action (market/language switch).
(function() {
  window.__EAF_PAGE_MARKET = 'eu';
})();
