"use strict";

// Lang-detect: localStorage eaf.market -> fallback navigator.language -> de.
(function () {
  var lang = "de";

  try {
    var market = localStorage.getItem("eaf.market");
    if (market === "us" || market === "eu") {
      lang = "en";
    } else if (market === "tr") {
      lang = "tr";
    } else if (market === "de") {
      lang = "de";
    } else {
      var navLang = (navigator.language || "de").toLowerCase();
      if (navLang.startsWith("tr")) {
        lang = "tr";
      } else if (navLang.startsWith("en")) {
        lang = "en";
      }
    }
  } catch (_) {}

  var translations = {
    de: {
      title: "Seite nicht gefunden",
      text: "Die angeforderte Seite existiert nicht oder wurde verschoben.",
      cta: "Zurück zum Rechner",
      htmlLang: "de",
      pageTitle: "404 – Seite nicht gefunden | EVSpend"
    },
    en: {
      title: "Page not found",
      text: "The page you requested doesn’t exist or has been moved.",
      cta: "Back to calculator",
      htmlLang: "en",
      pageTitle: "404 – Page not found | EVSpend",
      href: "/en-eu/"
    },
    tr: {
      title: "Sayfa bulunamadı",
      text: "İstenen sayfa mevcut değil veya taşınmış.",
      cta: "Hesaplayıcıya dön",
      htmlLang: "tr",
      pageTitle: "404 – Sayfa bulunamadı | EVSpend"
    }
  };

  var copy = translations[lang] || translations.de;
  var title = document.getElementById("errTitle");
  var text = document.getElementById("errText");
  var cta = document.getElementById("errCta");

  document.documentElement.lang = copy.htmlLang;
  if (title) title.textContent = copy.title;
  if (text) text.textContent = copy.text;
  if (cta) {
    cta.textContent = copy.cta;
    if (copy.href) cta.setAttribute("href", copy.href);
  }
  document.title = copy.pageTitle;
})();
