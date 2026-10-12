/* Pre-paint theme boot + theme toggle + back-button wiring (all pages). */
(function () {
  var html = document.documentElement;

  // Sync iOS Safari URL/Status-Bar Farbe mit data-theme (nicht prefers-color-scheme).
  // Verhindert weißen Streifen oben wenn iOS hell ist aber App auf dunkel steht.
  function syncThemeColor() {
    var isDark = html.getAttribute("data-theme") === "dark";
    var color  = isDark ? "#0f1115" : "#f5f7fa";
    var metas  = document.querySelectorAll('meta[name="theme-color"]');
    if (!metas.length) {
      var m = document.createElement("meta");
      m.setAttribute("name", "theme-color");
      m.setAttribute("content", color);
      document.head.appendChild(m);
    } else {
      metas.forEach(function (m) {
        m.removeAttribute("media");
        m.setAttribute("content", color);
      });
    }
  }

  try {
    var saved = null;
    try { saved = localStorage.getItem("theme"); } catch (_) {}
    // Defensive: drop any legacy/invalid theme value
    if (saved && saved !== "dark" && saved !== "light") {
      try { localStorage.removeItem("theme"); } catch (_) {}
      saved = null;
    }
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) html.setAttribute("data-theme", "dark");
    else if (saved === "light") html.setAttribute("data-theme", "light");
    syncThemeColor();
  } catch (_) {}

  var MOON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN_SVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // Keep each former origin reachable for user-controlled backup recovery.
    // This notice neither reads nor transfers calculator data or URL parameters.
    if (location.hostname === "evspend.com" || location.hostname === "www.evspend.com") {
      var language = (html.lang || "de").split("-")[0];
      var copy = {
        de: ["Datenrettung nach dem Domainwechsel", "Diese frühere Adresse bleibt für deine lokal gespeicherten Daten erreichbar. Exportiere deinen Verlauf hier als JSON-Backup. Öffne danach www.evspendpure.com und importiere die Datei dort im Verlauf. Gespeicherte Notizen sind im Backup enthalten. Aktuelle Rechnerwerte und Einstellungen werden nicht übertragen. Lösche die bisherigen Websitedaten erst, wenn du die importierten Einträge geprüft hast.", "Verlauf auf dieser Adresse öffnen", "EVSpendPure öffnen"],
        en: ["Recover data after the domain change", "This former address remains available for your locally stored data. Export your history here as a JSON backup. Then open www.evspendpure.com and import the file in History. Saved notes are included in the backup. Current calculator inputs and settings are not transferred. Keep the old website data until you have checked the imported entries.", "Open history on this address", "Open EVSpendPure"],
        tr: ["Alan adı değişikliğinden sonra verileri kurtarma", "Bu eski adres, yerel olarak saklanan verilerin için açık kalır. Geçmişini burada JSON yedeği olarak dışa aktar. Ardından www.evspendpure.com adresini aç ve dosyayı Geçmiş bölümünde içe aktar. Kaydedilmiş notlar yedeğe dahildir. Güncel hesaplayıcı girdileri ve ayarlar aktarılmaz. İçe aktarılan kayıtları kontrol edene kadar eski web sitesi verilerini silme.", "Bu adreste geçmişi aç", "EVSpendPure'ı aç"]
      };
      var words = copy[language] || copy.en;
      var notice = document.createElement("aside");
      notice.id = "domain-migration-notice";
      notice.className = "card";
      notice.setAttribute("aria-labelledby", "domain-migration-title");
      var title = document.createElement("h2");
      title.id = "domain-migration-title";
      title.textContent = words[0];
      var explanation = document.createElement("p");
      explanation.textContent = words[1];
      var links = document.createElement("p");
      var historyLink = document.createElement("a");
      historyLink.href = /^\/(en-eu|tr)\//.test(location.pathname)
        ? "/" + location.pathname.split("/")[1] + "/verlauf" : "/verlauf";
      historyLink.textContent = words[2];
      var newSite = document.createElement("a");
      newSite.href = "https://www.evspendpure.com/";
      newSite.rel = "noreferrer";
      newSite.textContent = words[3];
      links.appendChild(historyLink);
      links.appendChild(document.createTextNode(" · "));
      links.appendChild(newSite);
      notice.appendChild(title);
      notice.appendChild(explanation);
      notice.appendChild(links);
      var container = document.querySelector("main") || document.body;
      container.insertBefore(notice, container.firstChild);
    }

    var btn = document.getElementById("themeBtn");
    function glyph() {
      if (!btn) return;
      var dark = html.getAttribute("data-theme") === "dark";
      btn.innerHTML = dark ? SUN_SVG : MOON_SVG;
      btn.setAttribute("aria-pressed", String(dark));
    }
    glyph();

    if (btn) {
      btn.addEventListener("click", function () {
        var next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (_) {}
        syncThemeColor();
        glyph();
        document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
      });
    }

    var back = document.querySelector('[data-action="back"]');
    if (back) back.addEventListener("click", function () { history.back(); });
  });
})();
