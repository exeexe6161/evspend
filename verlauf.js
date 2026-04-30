(function () {
  const HIST_KEY = "eautofakten_history";
  const PERIOD_KEY = "eaf.verlauf.period";

  // ── Phase 3: Währungs-Darstellung im Verlauf ──────────────────────────────
  // Rohwerte werden NICHT umgerechnet (keine Wechselkurse). Lediglich die
  // Anzeigeformatierung folgt der aktuellen Währungseinstellung (EAF_I18N,
  // persistiert in localStorage["eaf.currency"]).
  //
  // Alte Einträge haben kein currencyMetadata — sie fallen weich auf EUR
  // zurück. Neue Einträge bekommen { code, symbol } in entry.currencyMetadata
  // und optional entry.language für künftige Darstellungslogik.
  const CURR_KEY = "eaf.currency";
  const LANG_KEY = "eaf.language";
  // Phase 6: Primärer Schlüssel — der Markt ist jetzt Single Source of Truth.
  const MARKET_KEY = "eaf.market";
  const CURRENCY_TABLE = {
    EUR: { code: "EUR", symbol: "€", locale: "de-DE" },
    USD: { code: "USD", symbol: "$", locale: "en-US" },
    TRY: { code: "TRY", symbol: "₺", locale: "tr-TR" }
  };

  // ── Phase 4: Wechselkurse (ab Phase 5 nicht mehr im Render-Pfad) ─────────
  // Raten bleiben als Nachschlagetabelle für künftige Admin-/Migrations-/
  // Export-Szenarien erhalten, werden aber vom Standard-Rendering nicht
  // genutzt — Rohwerte im Verlauf werden als bereits in ihrer jeweiligen
  // Markt-Währung gespeichert (Phase 5).
  const CURRENCY_RATES = { EUR: 1.0, USD: 1.17, TRY: 52.79 };

  // ── Phase 6/9: Markt-Konfiguration (Spiegel von script.js) ─────────────
  // Ergänzt um `units` für Entry-spezifische Darstellung — US-Einträge werden
  // in mi/mpg/gal/$, DE+TR-Einträge in km/L/kWh angezeigt.
  const MARKET_CONFIG = {
    de: { code: "de", label: "Deutschland", language: "de", locale: "de-DE", currency: "EUR", symbol: "€",
          units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" } },
    eu: { code: "eu", label: "Europa",      language: "en", locale: "en-IE", currency: "EUR", symbol: "€",
          units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" } },
    us: { code: "us", label: "USA",         language: "en", locale: "en-US", currency: "USD", symbol: "$",
          units: { distance: "mile", fuelVolume: "gallon", iceEfficiency: "mpg", evEfficiency: "kWh/100mi" } },
    tr: { code: "tr", label: "Türkiye",     language: "tr", locale: "tr-TR", currency: "TRY", symbol: "₺",
          units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" } }
  };

  // Phase 9: Exakte Unit-Konversionen (Spiegel von script.js). Einträge werden
  // metrisch gespeichert — für Anzeige in ihrer Entry-Marktwährung konvertiert.
  const UNIT_CONV = {
    MI_TO_KM: 1.609344,
    GAL_TO_L: 3.785411784,
    l100kmToMpg: (l) => (isFinite(l) && l > 0) ? 235.214583 / l : NaN
  };
  function _entryIsUs(entry) { return !!(entry && entry.marketCode === "us"); }
  function _entryDistanceUnit(entry)  { return _entryIsUs(entry) ? "mi"           : "km"; }
  function _entryIceEffUnit(entry)    { return _entryIsUs(entry) ? "mpg"          : "L/100 km"; }
  function _entryEvEffUnit(entry)     { return _entryIsUs(entry) ? "kWh/100 mi"   : "kWh/100 km"; }
  function _entryFuelVolumeUnit(entry){ return _entryIsUs(entry) ? "gal"          : "L"; }
  function _entryKmToDist(km, entry)        { return _entryIsUs(entry) ? km / UNIT_CONV.MI_TO_KM : km; }
  function _entryCostPer100(cPer100km, entry){ return _entryIsUs(entry) ? cPer100km * UNIT_CONV.MI_TO_KM : cPer100km; }
  function _entryIceCons(l100km, entry)     { return _entryIsUs(entry) ? UNIT_CONV.l100kmToMpg(l100km) : l100km; }
  function _entryEvCons(k100km, entry)      { return _entryIsUs(entry) ? k100km * UNIT_CONV.MI_TO_KM : k100km; }
  function _entryFuelPrice(pL, entry)       { return _entryIsUs(entry) ? pL * UNIT_CONV.GAL_TO_L : pL; }

  // Aktueller UI-Markt (für Stats-Aggregate): US → Konversion, sonst metrisch.
  function _currentIsUs() {
    try {
      const m = localStorage.getItem(MARKET_KEY);
      return m === "us";
    } catch (_) {}
    return false;
  }
  function _currentDistanceUnit()       { return _currentIsUs() ? "mi"         : "km"; }
  function _currentEvEffUnit()          { return _currentIsUs() ? "kWh/100 mi" : "kWh/100 km"; }
  function _currentIceEffUnit()         { return _currentIsUs() ? "mpg"        : "L/100 km"; }
  function _kmToCurrentDist(km)         { return _currentIsUs() ? km / UNIT_CONV.MI_TO_KM : km; }
  function _evConsToCurrent(k100km)     { return _currentIsUs() ? k100km * UNIT_CONV.MI_TO_KM : k100km; }
  function _iceConsToCurrent(l100km)    { return _currentIsUs() ? UNIT_CONV.l100kmToMpg(l100km) : l100km; }
  function _setStatUnit(el, unit) {
    if (!el) return;
    const u = el.nextElementSibling;
    if (u && u.classList && u.classList.contains("stats-cell-unit")) u.textContent = unit;
  }
  // Phase 10: Fuel-Preis in aktuelle UI-Markt-Einheit (für Meta-Chips im Verlauf).
  function _fuelPriceToCurrent(pL) {
    return _currentIsUs() ? pL * UNIT_CONV.GAL_TO_L : pL;
  }
  function _currentFuelVolumeUnit() { return _currentIsUs() ? "gal" : "L"; }

  // Phase 10: sprach-/marktneutraler Entry-Titel.
  // Keine hartcodierten deutschen Strings mehr im Render.
  // Rohwerte (metrisch gespeichert) werden in die aktuelle UI-Einheit
  // übersetzt, Symbol und Phrase folgen dem aktiven Markt/Sprache.
  function formatEntryTitle(entry) {
    if (!entry) return "";
    const lang  = _currentLanguage();
    const unit  = _currentDistanceUnit();
    const dist  = Math.round(_kmToCurrentDist(entry.km || 0));
    const cost  = entry.monthlyCost;
    const costStr = fmtMoneyEntry(cost, null, 0); // null → aktuelle UI-Währung, kein Entry-Currency-Lookup
    if (lang === "en") return `${costStr} for ${dist} ${unit}`;
    if (lang === "tr") return `${dist} ${unit} için ${costStr}`;
    return `${costStr} für ${dist} ${unit}`;
  }

  // Phase 8: Spiegel von script.js._detectMarketFromBrowser — nur als
  // Initial-Default, wenn der Nutzer die Verlauf-Seite als Erstes öffnet
  // und noch keine Markt-/Sprach-Preference gespeichert hat.
  function _detectMarketFromBrowser() {
    try {
      let list = [];
      if (navigator.languages && navigator.languages.length) {
        list = Array.prototype.slice.call(navigator.languages);
      } else if (navigator.language) {
        list = [navigator.language];
      }
      for (let i = 0; i < list.length; i++) {
        const L = String(list[i] || "").toLowerCase();
        if (L === "en-us" || L === "en_us") return "us";
        if (L === "tr" || L === "tr-tr" || L === "tr_tr" || L.indexOf("tr-") === 0) return "tr";
      }
    } catch (_) {}
    return null;
  }

  function getCurrentCurrency() {
    // Phase 6: primär den Markt lesen, Währung daraus ableiten.
    try {
      const m = localStorage.getItem(MARKET_KEY);
      if (m && MARKET_CONFIG[m]) {
        const code = MARKET_CONFIG[m].currency;
        if (CURRENCY_TABLE[code]) return CURRENCY_TABLE[code];
      }
    } catch (_) {}
    // Legacy-Fallback: alte getrennte Currency-Preference berücksichtigen.
    try {
      const c = localStorage.getItem(CURR_KEY);
      if (c && CURRENCY_TABLE[c]) return CURRENCY_TABLE[c];
    } catch (_) {}
    // Phase 8: Browser-Locale als letzter Initialwert.
    const auto = _detectMarketFromBrowser();
    if (auto && MARKET_CONFIG[auto]) {
      const code = MARKET_CONFIG[auto].currency;
      if (CURRENCY_TABLE[code]) return CURRENCY_TABLE[code];
    }
    return CURRENCY_TABLE.EUR;
  }
  // Phase 5: entry-lokale Währung bestimmt die Anzeige. Ein Eintrag, der
  // ursprünglich im DE-Markt (EUR) gespeichert wurde, bleibt auch dann in
  // EUR sichtbar, wenn der Nutzer später auf TR umschaltet — weil die
  // Rohwerte damals in EUR erhoben wurden (keine Wechselkurs-Umrechnung).
  // Neue TR-Einträge werden entsprechend direkt in TRY gerendert.
  // Alte Einträge ohne currencyMetadata fallen weich auf EUR.
  function _pickEntryCurrency(entry) {
    if (entry && entry.currencyMetadata && entry.currencyMetadata.code && CURRENCY_TABLE[entry.currencyMetadata.code]) {
      return CURRENCY_TABLE[entry.currencyMetadata.code];
    }
    return null;
  }

  // Geldwert-Formatter mit defensivem Fallback. Signatur:
  //   fmtMoneyEntry(value, entry?, decimals = 2)
  // 1. Wenn entry.currencyMetadata vorhanden → dessen Locale/Symbol.
  // 2. Ohne entry → aktuelle UI-Markt-Währung (z. B. Stats-Aggregat).
  // 3. Entry ohne Metadata → EUR-Default (Legacy-Einträge).
  function fmtMoneyEntry(value, entry, decimals) {
    if (!isFinite(value)) return "—";
    if (decimals == null) decimals = 2;
    const fromEntry = _pickEntryCurrency(entry);
    const cur = fromEntry || (entry ? CURRENCY_TABLE.EUR : getCurrentCurrency());
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: "currency",
        currency: cur.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } catch (_) {
      const fallbackSym = cur.symbol || "€";
      try {
        return value.toLocaleString("de-DE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + " " + fallbackSym;
      } catch (__) {
        return value.toFixed(decimals) + " " + fallbackSym;
      }
    }
  }

  // Helper für Input-Echo-Symbol (€/kWh vs ₺/kWh) aus dem Entry heraus.
  function _entrySymbol(entry) {
    const c = _pickEntryCurrency(entry);
    return (c && c.symbol) || "€";
  }

  // ── Phase 7: Inline-Übersetzungs-Dict (verlauf.html wird nicht von
  // script.js bedient → eigene Mini-Copy, nur Verlauf-relevante Keys).
  // Wenn Schlüssel fehlen, wird der Roh-Schlüssel als Fallback angezeigt.
  const VERLAUF_TRANSLATIONS = {
    de: {
      // Phase B — Markt-Pill auf Verlauf
      marketDe: "DE · €",
      marketEu: "EU · €",
      marketUs: "US · $",
      marketTr: "TR · ₺",
      verlaufTitle: "Verlauf",
      verlaufSub: "Deine persönlichen Berechnungen",
      verlaufTrust: "Basierend auf deinen berechneten Fahrten",
      verlaufPrivacy: "Alle Berechnungen werden ausschließlich lokal auf deinem Gerät gespeichert. Es erfolgt keine Übertragung oder Speicherung auf unseren Servern. Die Daten bleiben im Speicher deines Browsers und können jederzeit gelöscht werden. Bitte beachte, dass sie verloren gehen können, wenn du Browserdaten löschst oder ein anderes Gerät verwendest.",
      statsHeader: "Statistik",
      entriesHeader: "Einträge",
      searchPlaceholder: "Eintrag suchen…",
      pagerPrev: "← Zurück",
      pagerNext: "Weiter →",
      periodToday: "Heute",
      periodWeek: "Woche",
      periodMonth: "Monat",
      periodYear: "Jahr",
      yearly: "Jahre",
      statsInPeriod: "Einträge im Zeitraum",
      statsTotalKm: "Gesamt {unit}",
      statsTotalCost: "Gesamt Kosten",
      statsAvgCost: "Ø Kosten / 100 {unit}",
      statsAvgConsumption: "Ø Verbrauch",
      statsEmpty: "Noch keine Einzelberechnungen gespeichert",
      legacyLabel: "Alt-Einträge aus Vergleichsmodus",
      legacyClear: "Alt-Einträge löschen",
      clearAll: "Alle löschen",
      confirmClearAll: "Alle gespeicherten Einzelberechnungen löschen?",
      confirmClearLegacy: "Alle alten Vergleichs-Einträge löschen?",
      histEmptyNone: "Dein Verlauf ist leer. Starte mit deiner ersten Berechnung.",
      histEmptyCta: "Erste Fahrt berechnen",
      histEmptySearch: "Keine Einträge für diese Suche",
      histEntrySingular: "Eintrag",
      histEntryPlural: "Einträge",
      histEntryDelete: "Eintrag löschen",
      backToCalc: "Zurück zum Rechner",
      typeEv: "E-Auto",
      typeVb: "Verbrenner",
      legacyBadge: "Vergleich (alt)",
      legacyDiffSuffix: "/ Jahr",
      rideshareLine: "Fahrgemeinschaft · {n} Personen",
      verlaufFooterNote: "Gespeicherte Einträge bleiben nur lokal auf diesem Gerät.",
      chartToday: "Kosten heute",
      chartWeek:  "Kosten diese Woche",
      chartMonth: "Kosten diesen Monat",
      chartYear:  "Kosten dieses Jahr",
      chartAll:   "Gesamtkosten",
      chartAvgCost: "Durchschnittskosten",
      footerCalc: "Rechner",
      footerImpressum: "Impressum",
      footerDatenschutz: "Datenschutz",
      footerTerms: "AGB",
      footerHinweise: "Hinweise zur Nutzung",
      chartA11ySummary: "Verlaufsdiagramm mit {count} Einträgen vom {start} bis {end}. Durchschnittliche Kosten: {evCost} {currency} pro 100 {unit} beim E-Auto, {vbCost} {currency} pro 100 {unit} beim Verbrenner. Detaillierte Einträge folgen in der Tabelle.",
      chartA11yEmpty: "Keine Einträge im aktuellen Filter.",
      chartA11yFallback: "Verlaufsdiagramm verfügbar, Detaildaten konnten nicht geladen werden.",
      tableCaption: "Detaillierte Verlaufs-Daten",
      tableHeaderDate: "Datum",
      tableHeaderDistanceMetric: "Kilometer",
      tableHeaderDistanceImperial: "Meilen",
      tableHeaderType: "Typ",
      tableHeaderConsumption: "Verbrauch",
      tableHeaderPrice: "Preis",
      tableHeaderCostPer100: "Kosten pro 100",
      noteInlineLabel: "Notiz",
      footerBarrierefreiheit: "Barrierefreiheit"
    },
    en: {
      // Phase B — Market pill on Verlauf
      marketDe: "DE · €",
      marketEu: "EU · €",
      marketUs: "US · $",
      marketTr: "TR · ₺",
      verlaufTitle: "History",
      verlaufSub: "Your personal calculations",
      verlaufTrust: "Based on your calculated trips",
      verlaufPrivacy: "All calculations are stored exclusively on your device. Nothing is transmitted or saved on our servers. Data remains in your browser storage and can be deleted at any time. Note that data may be lost if you clear browser data or switch devices.",
      statsHeader: "Statistics",
      entriesHeader: "Entries",
      searchPlaceholder: "Search entry…",
      pagerPrev: "← Previous",
      pagerNext: "Next →",
      periodToday: "Today",
      periodWeek: "Week",
      periodMonth: "Month",
      periodYear: "Year",
      yearly: "Years",
      statsInPeriod: "Entries in period",
      statsTotalKm: "Total {unit}",
      statsTotalCost: "Total cost",
      statsAvgCost: "Avg. cost / 100 {unit}",
      statsAvgConsumption: "Avg. consumption",
      statsEmpty: "No single-calculations saved yet",
      legacyLabel: "Legacy compare entries",
      legacyClear: "Delete legacy entries",
      clearAll: "Clear all",
      confirmClearAll: "Delete all saved single calculations?",
      confirmClearLegacy: "Delete all legacy compare entries?",
      histEmptyNone: "Nothing saved yet. Start with your first calculation.",
      histEmptyCta: "Calculate first trip",
      histEmptySearch: "No entries for this search",
      histEntrySingular: "entry",
      histEntryPlural: "entries",
      histEntryDelete: "Delete entry",
      backToCalc: "Back to calculator",
      typeEv: "Electric",
      typeVb: "Combustion",
      legacyBadge: "Compare (legacy)",
      legacyDiffSuffix: "/ year",
      rideshareLine: "Carpool · {n} people",
      verlaufFooterNote: "Saved entries stay on this device only.",
      chartToday: "Costs today",
      chartWeek:  "Costs this week",
      chartMonth: "Costs this month",
      chartYear:  "Costs this year",
      chartAll:   "Total costs",
      chartAvgCost: "Average cost",
      footerCalc: "Calculator",
      footerImpressum: "Imprint",
      footerDatenschutz: "Privacy",
      footerTerms: "Terms",
      footerHinweise: "Usage notes",
      chartA11ySummary: "Historical chart with {count} entries from {start} to {end}. Average costs: {evCost} {currency} per 100 {unit} for electric vehicle, {vbCost} {currency} per 100 {unit} for combustion. Detailed entries follow in the table.",
      chartA11yEmpty: "No entries in current filter.",
      chartA11yFallback: "Historical chart available, detail data could not be loaded.",
      tableCaption: "Detailed history data",
      tableHeaderDate: "Date",
      tableHeaderDistanceMetric: "Kilometers",
      tableHeaderDistanceImperial: "Miles",
      tableHeaderType: "Type",
      tableHeaderConsumption: "Consumption",
      tableHeaderPrice: "Price",
      tableHeaderCostPer100: "Cost per 100",
      noteInlineLabel: "Note",
      footerBarrierefreiheit: "Accessibility"
    },
    tr: {
      // Phase B — Verlauf üzerinde Pazar Pill
      marketDe: "DE · €",
      marketEu: "EU · €",
      marketUs: "US · $",
      marketTr: "TR · ₺",
      verlaufTitle: "Geçmiş",
      verlaufSub: "Kişisel hesaplamalarınız",
      verlaufTrust: "Hesaplanan sürüşlerine göre",
      verlaufPrivacy: "Tüm hesaplamalar yalnızca cihazında yerel olarak saklanır. Sunucularımıza aktarım veya kayıt yapılmaz. Veriler tarayıcı belleğinde kalır ve istediğin zaman silinebilir. Tarayıcı verilerini temizlersen veya başka bir cihaz kullanırsan kaybolabileceklerini unutma.",
      statsHeader: "İstatistik",
      entriesHeader: "Girdiler",
      searchPlaceholder: "Girdi ara…",
      pagerPrev: "← Geri",
      pagerNext: "İleri →",
      periodToday: "Bugün",
      periodWeek: "Hafta",
      periodMonth: "Ay",
      periodYear: "Yıl",
      yearly: "Yıllar",
      statsInPeriod: "Dönemdeki girdi sayısı",
      statsTotalKm: "Toplam {unit}",
      statsTotalCost: "Toplam maliyet",
      statsAvgCost: "Ø maliyet / 100 {unit}",
      statsAvgConsumption: "Ø tüketim",
      statsEmpty: "Henüz kayıtlı tekli hesaplama yok",
      legacyLabel: "Eski karşılaştırma girdileri",
      legacyClear: "Eski girdileri sil",
      clearAll: "Tümünü sil",
      confirmClearAll: "Tüm kayıtlı tekli hesaplamaları silmek istiyor musunuz?",
      confirmClearLegacy: "Tüm eski karşılaştırma girdilerini silmek istiyor musunuz?",
      histEmptyNone: "Geçmişin boş. İlk hesabını kaydet ve takibe başla.",
      histEmptyCta: "İlk yolculuğu hesapla",
      histEmptySearch: "Bu arama için girdi yok",
      histEntrySingular: "girdi",
      histEntryPlural: "girdi",
      histEntryDelete: "Girdiyi sil",
      backToCalc: "Hesaplayıcıya dön",
      typeEv: "Elektrikli",
      typeVb: "Benzinli",
      legacyBadge: "Karşılaştırma (eski)",
      legacyDiffSuffix: "/ yıl",
      rideshareLine: "Ortak yolculuk · {n} kişi",
      verlaufFooterNote: "Kayıtlı girdiler yalnızca bu cihazda kalır.",
      chartToday: "Bugün maliyet",
      chartWeek:  "Bu hafta",
      chartMonth: "Bu ay",
      chartYear:  "Bu yıl",
      chartAll:   "Toplam maliyet",
      chartAvgCost: "Ortalama maliyet",
      footerCalc: "Hesaplayıcı",
      footerImpressum: "Künye",
      footerDatenschutz: "Gizlilik",
      footerTerms: "Şartlar",
      footerHinweise: "Kullanım notları",
      chartA11ySummary: "{start} ile {end} arasında {count} kayıtla geçmiş grafiği. Ortalama maliyetler: elektrikli için 100 {unit} başına {evCost} {currency}, benzinli için 100 {unit} başına {vbCost} {currency}. Ayrıntılı kayıtlar tabloda yer alır.",
      chartA11yEmpty: "Geçerli filtrede kayıt yok.",
      chartA11yFallback: "Geçmiş grafiği mevcut, ayrıntılı veriler yüklenemedi.",
      tableCaption: "Ayrıntılı geçmiş verileri",
      tableHeaderDate: "Tarih",
      tableHeaderDistanceMetric: "Kilometre",
      tableHeaderDistanceImperial: "Mil",
      tableHeaderType: "Tür",
      tableHeaderConsumption: "Tüketim",
      tableHeaderPrice: "Fiyat",
      tableHeaderCostPer100: "100 başına maliyet",
      noteInlineLabel: "Not",
      footerBarrierefreiheit: "Erişilebilirlik"
    }
  };

  // Aktuelle Sprache anhand des Marktes ableiten (Phase 6/7 Koppelung).
  function _currentLanguage() {
    try {
      const m = localStorage.getItem(MARKET_KEY);
      if (m && MARKET_CONFIG[m]) return MARKET_CONFIG[m].language;
      const l = localStorage.getItem(LANG_KEY);
      if (l && VERLAUF_TRANSLATIONS[l]) return l;
    } catch (_) {}
    // Phase 8: Browser-Locale als Fallback bei allererstem Besuch.
    const auto = _detectMarketFromBrowser();
    if (auto && MARKET_CONFIG[auto]) return MARKET_CONFIG[auto].language;
    return "de";
  }
  function _tv(key, subs) {
    const lang = _currentLanguage();
    const dict = VERLAUF_TRANSLATIONS[lang] || VERLAUF_TRANSLATIONS.de;
    let raw = dict[key] || VERLAUF_TRANSLATIONS.de[key] || key;
    if (!subs) return raw;
    return raw.replace(/\{(\w+)\}/g, (_m, name) => (subs[name] != null ? String(subs[name]) : ""));
  }
  function _applyTranslationsVerlauf() {
    try { document.documentElement.setAttribute("lang", _currentLanguage()); } catch (_) {}
    // Phase 9: common-subs für {unit}/{symbol}, analog script.js.
    const commonSubs = { unit: _currentDistanceUnit() };
    function sub(raw) {
      if (typeof raw !== "string") return raw;
      return raw.replace(/\{(\w+)\}/g, (m, name) => commonSubs[name] != null ? String(commonSubs[name]) : m);
    }
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      const v = _tv(k);
      if (typeof v === "string") el.textContent = sub(v);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const k = el.getAttribute("data-i18n-placeholder");
      const v = _tv(k);
      if (typeof v === "string") el.setAttribute("placeholder", sub(v));
    });
  }
  // Initial direkt einmal anwenden (script.js läuft auf verlauf.html nicht).
  _applyTranslationsVerlauf();
  function _clearAdjacentUnit(el) {
    if (!el) return;
    const u = el.nextElementSibling;
    if (u && u.classList && u.classList.contains("stats-cell-unit")) u.textContent = "";
  }

  // One-time migration from the legacy key used before v2.
  (function migrate() {
    try {
      const cur = localStorage.getItem(HIST_KEY);
      if (cur && cur !== "[]") return;
      const old = localStorage.getItem("eaf.history.v1");
      if (!old) return;
      const legacy = JSON.parse(old);
      if (!Array.isArray(legacy) || !legacy.length) { localStorage.removeItem("eaf.history.v1"); return; }
      const migrated = legacy.map(e => {
        const i = e.inputs || {}, r = e.results || {};
        const ts = e.id || (e.timestamp ? new Date(e.timestamp).getTime() : Date.now());
        return {
          date: ts,
          km: i.km_per_month,
          ev:   { consumption: i.ev_consumption,   price: i.electricity_price, costPer100: r.ev_cost_per_100km },
          fuel: { consumption: i.fuel_consumption, price: i.fuel_price,        costPer100: r.fuel_cost_per_100km },
          result: {
            yearlySaving:  Math.round(r.yearly_difference  ?? NaN),
            monthlySaving: Math.round(r.monthly_difference ?? NaN),
          },
        };
      });
      localStorage.setItem(HIST_KEY, JSON.stringify(migrated.slice(0, 50)));
      localStorage.removeItem("eaf.history.v1");
    } catch (e) {}
  })();

  const ITEMS_PER_PAGE = 10;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const listEl      = document.getElementById("histList");
  const actionsEl   = document.getElementById("histActions");
  const clearBtn    = document.getElementById("histClearBtn");
  const legacyWrap  = document.getElementById("legacyWrap");
  const legacyList  = document.getElementById("legacyList");
  const legacyCount = document.getElementById("legacyCount");
  const legacyClear = document.getElementById("legacyClearBtn");
  const periodBtns  = document.querySelectorAll(".period-btn");
  const searchInput = document.getElementById("searchInput");
  const pagerEl     = document.getElementById("histPager");
  const prevBtn     = document.getElementById("histPrevBtn");
  const nextBtn     = document.getElementById("histNextBtn");
  const pagerInfo   = document.getElementById("histPagerInfo");

  const statCount    = document.getElementById("statCount");
  const statsEmpty   = document.getElementById("statsEmpty");
  const statBlockEv  = document.getElementById("statBlockEv");
  const statBlockVb  = document.getElementById("statBlockVb");
  const statEvN       = document.getElementById("statEvN");
  const statEvKm      = document.getElementById("statEvKm");
  const statEvCons    = document.getElementById("statEvCons");
  const statEvCost    = document.getElementById("statEvCost");
  const statEvMonthly = document.getElementById("statEvMonthly");
  const statVbN       = document.getElementById("statVbN");
  const statVbKm      = document.getElementById("statVbKm");
  const statVbCons    = document.getElementById("statVbCons");
  const statVbCost    = document.getElementById("statVbCost");
  const statVbMonthly = document.getElementById("statVbMonthly");

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (v, d) => isFinite(v)
    ? v.toLocaleString("de-DE", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 })
    : "—";

  const fmtDate = ts => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  function avg(values) {
    const xs = values.filter(v => isFinite(v));
    if (!xs.length) return NaN;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }
  function sum(values) {
    const xs = values.filter(v => isFinite(v));
    if (!xs.length) return NaN;
    return xs.reduce((a, b) => a + b, 0);
  }

  // A v2 entry is a single-vehicle calculation saved by the user.
  const isV2 = e => e && e.schema === "v2" && (e.type === "ev" || e.type === "vb");
  // Legacy entries are the old compare snapshots (both ev + fuel keys).
  const isLegacy = e => e && !isV2(e);

  function loadAll() {
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch (e) {}
    return Array.isArray(arr) ? arr : [];
  }
  function saveAll(arr) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  // ── Period filter ──────────────────────────────────────────────────────────
  function periodStart(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "today") return today;
    if (period === "week") {
      const day = (now.getDay() + 6) % 7; // 0 = Monday
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - day);
      return weekStart;
    }
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "year")  return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }

  // ── Stats (v2 only, split by type) ─────────────────────────────────────────
  function renderStats(v2Entries, period) {
    const start = periodStart(period);
    const filtered = v2Entries.filter(e => new Date(e.date) >= start);
    const n = filtered.length;
    statCount.textContent = n;

    const evs = filtered.filter(e => e.type === "ev");
    const vbs = filtered.filter(e => e.type === "vb");

    if (!n) {
      statBlockEv.hidden = true;
      statBlockVb.hidden = true;
      if (statsEmpty) statsEmpty.hidden = false;
      return;
    }
    if (statsEmpty) statsEmpty.hidden = true;

    // Phase 9: Stats aggregieren Rohwerte metrisch und konvertieren für den
    // aktuellen UI-Markt. Gemischte DE/TR/US-Einträge: Stats zeigen die
    // Summen/Durchschnitte in der aktuell ausgewählten Markt-Einheit.
    const distUnit = _currentDistanceUnit();
    const evUnit   = _currentEvEffUnit();
    const iceUnit  = _currentIceEffUnit();
    if (evs.length) {
      statBlockEv.hidden = false;
      statEvN.textContent       = evs.length + " " + (evs.length === 1 ? _tv("histEntrySingular") : _tv("histEntryPlural"));
      statEvKm.textContent      = fmt(_kmToCurrentDist(sum(evs.map(e => e.km))), 0);
      _setStatUnit(statEvKm, distUnit);
      // Money-Werte nutzen aktuelle Währung; Unit-Span wird geleert.
      statEvMonthly.textContent = fmtMoneyEntry(sum(evs.map(e => Number(e.costPer100) * Number(e.km) / 100)), null, 0);
      _clearAdjacentUnit(statEvMonthly);
      statEvCost.textContent    = fmtMoneyEntry(_currentIsUs() ? avg(evs.map(e => e.costPer100)) * UNIT_CONV.MI_TO_KM : avg(evs.map(e => e.costPer100)), null, 2);
      _clearAdjacentUnit(statEvCost);
      statEvCons.textContent    = fmt(_evConsToCurrent(avg(evs.map(e => e.consumption))), 1);
      _setStatUnit(statEvCons, evUnit);
    } else {
      statBlockEv.hidden = true;
    }
    if (vbs.length) {
      statBlockVb.hidden = false;
      statVbN.textContent       = vbs.length + " " + (vbs.length === 1 ? _tv("histEntrySingular") : _tv("histEntryPlural"));
      statVbKm.textContent      = fmt(_kmToCurrentDist(sum(vbs.map(e => e.km))), 0);
      _setStatUnit(statVbKm, distUnit);
      statVbMonthly.textContent = fmtMoneyEntry(sum(vbs.map(e => Number(e.costPer100) * Number(e.km) / 100)), null, 0);
      _clearAdjacentUnit(statVbMonthly);
      statVbCost.textContent    = fmtMoneyEntry(_currentIsUs() ? avg(vbs.map(e => e.costPer100)) * UNIT_CONV.MI_TO_KM : avg(vbs.map(e => e.costPer100)), null, 2);
      _clearAdjacentUnit(statVbCost);
      // ICE: US integer, DE/TR 1 decimal
      const iceAvg = _iceConsToCurrent(avg(vbs.map(e => e.consumption)));
      statVbCons.textContent    = fmt(iceAvg, _currentIsUs() ? 0 : 1);
      _setStatUnit(statVbCons, iceUnit);
    } else {
      statBlockVb.hidden = true;
    }
  }

  // ── Shared: note rendering (label + trim + 60-char cap, single line). ───────
  // Returns true if a note was appended; callers can use that to skip fallbacks.
  function _appendNote(parentEl, rawNote) {
    var raw = (rawNote == null) ? "" : String(rawNote).trim();
    if (!raw) return false;
    var MAX = 60;
    var text = raw.length > MAX ? (raw.slice(0, MAX - 1) + "…") : raw;
    var label = _tv("noteInlineLabel") || "Note";
    var el = document.createElement("div");
    el.className = "hist-note";
    el.textContent = label + ": " + text;
    el.setAttribute("title", raw);
    parentEl.appendChild(el);
    return true;
  }

  // ── Rendering — v2 (single-mode) entries ───────────────────────────────────
  function renderV2Entry(e) {
    const wrap = document.createElement("div");
    wrap.className = "hist-item";

    const body = document.createElement("button");
    body.type = "button";
    body.className = "hist-item-body";
    body.addEventListener("click", () => {
      location.href = "./?id=" + encodeURIComponent(e.date);
    });

    const row = document.createElement("div");
    row.className = "hist-row";
    const date = document.createElement("span");
    date.className = "hist-date";
    date.textContent = fmtDate(e.date);
    const badge = document.createElement("span");
    const isEv = e.type === "ev";
    badge.className = "mode-badge " + (isEv ? "mode-badge--ev" : "mode-badge--vb");
    badge.textContent = isEv ? _tv("typeEv") : _tv("typeVb");
    row.appendChild(date);
    row.appendChild(badge);

    const headline = document.createElement("div");
    headline.className = "hist-diff";
    // Phase 10: sprach-/marktneutrale Render — folgt dem AKTUELLEN UI-Markt,
    // nicht dem gespeicherten Entry-Markt. Kein hartcodiertes "für" mehr.
    headline.textContent = formatEntryTitle(e);

    const meta = document.createElement("div");
    meta.className = "hist-meta";
    // Phase 10: Meta-Chips ebenfalls gegen aktuellen UI-Markt rendern,
    // damit keine gemischten Einheiten (km + mi) auf einer Seite erscheinen.
    const distUnit  = _currentDistanceUnit();
    const consUnit  = isEv ? _currentEvEffUnit() : _currentIceEffUnit();
    const currSym   = (function(){ var c = getCurrentCurrency(); return (c && c.symbol) || "€"; })();
    const priceUnit = isEv ? (currSym + " / kWh") : (currSym + " / " + _currentFuelVolumeUnit());
    const consDisp  = isEv ? _evConsToCurrent(e.consumption) : _iceConsToCurrent(e.consumption);
    const priceDisp = isEv ? e.price : _fuelPriceToCurrent(e.price);
    const consDec   = isEv ? 1 : (_currentIsUs() ? 0 : 1);
    const costPer100Disp = _currentIsUs() ? e.costPer100 * UNIT_CONV.MI_TO_KM : e.costPer100;
    const parts = [
      fmt(consDisp, consDec) + " " + consUnit,
      fmtMoneyEntry(costPer100Disp, null, 2) + " / 100 " + distUnit,
      fmt(priceDisp, 2) + " " + priceUnit,
    ];
    parts.forEach(p => {
      const s = document.createElement("span");
      s.textContent = p;
      meta.appendChild(s);
    });

    body.appendChild(row);
    body.appendChild(headline);
    const noteRendered = _appendNote(body, e.note);
    if (!noteRendered && e.ridesharing && e.persons > 1) {
      const rs = document.createElement("div");
      rs.className = "hist-rideshare";
      rs.textContent = _tv("rideshareLine", { n: e.persons });
      body.appendChild(rs);
    }
    body.appendChild(meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "hist-del";
    del.setAttribute("aria-label", _tv("histEntryDelete"));
    del.textContent = "×";
    del.addEventListener("click", ev => {
      ev.stopPropagation();
      deleteEntry(e.date);
    });

    wrap.appendChild(body);
    wrap.appendChild(del);
    return wrap;
  }

  // ── Rendering — legacy (compare snapshot) entries ──────────────────────────
  function renderLegacyEntry(e) {
    const wrap = document.createElement("div");
    wrap.className = "hist-item";

    const body = document.createElement("button");
    body.type = "button";
    body.className = "hist-item-body";
    body.addEventListener("click", () => {
      location.href = "./?id=" + encodeURIComponent(e.date ?? e.id);
    });

    const row = document.createElement("div");
    row.className = "hist-row";
    const date = document.createElement("span");
    date.className = "hist-date";
    date.textContent = fmtDate(e.date ?? e.id);
    const badge = document.createElement("span");
    badge.className = "mode-badge mode-badge--schnell";
    badge.textContent = _tv("legacyBadge");
    row.appendChild(date);
    row.appendChild(badge);

    const diffRaw = e.result?.yearlySaving;
    const diff = isFinite(diffRaw) ? diffRaw : 0;
    const diffEl = document.createElement("div");
    diffEl.className = "hist-diff " + (diff >= 0 ? "c-green" : "c-red");
    // Phase 10: Legacy-Diff in aktueller UI-Währung rendern (entry=null).
    diffEl.textContent = (diff >= 0 ? "+" : "−") + fmtMoneyEntry(Math.abs(diff), null, 0) + " " + _tv("legacyDiffSuffix");

    const meta = document.createElement("div");
    meta.className = "hist-meta";
    const ev   = e.ev   || {};
    const fuel = e.fuel || {};
    const parts = [];
    const kmEv = e.kmEv, kmVb = e.kmVb, km = e.km;
    // Phase 10: Legacy-Kosten-Chips ebenfalls in aktueller UI-Einheit.
    const distUnit2 = _currentDistanceUnit();
    const toCur = function (c) { return _currentIsUs() ? c * UNIT_CONV.MI_TO_KM : c; };
    const toDist = function (k) { return _currentIsUs() ? k / UNIT_CONV.MI_TO_KM : k; };
    if (isFinite(kmEv) && isFinite(kmVb) && kmEv !== kmVb) {
      parts.push(_tv("typeEv") + " " + fmt(toDist(kmEv), 0) + " · " + _tv("typeVb") + " " + fmt(toDist(kmVb), 0) + " " + distUnit2);
    } else if (isFinite(km) || isFinite(kmEv)) {
      parts.push(fmt(toDist(isFinite(km) ? km : kmEv), 0) + " " + distUnit2);
    }
    if (isFinite(ev.costPer100))   parts.push(_tv("typeEv") + " " + fmtMoneyEntry(toCur(ev.costPer100), null, 2) + " / 100 " + distUnit2);
    if (isFinite(fuel.costPer100)) parts.push(_tv("typeVb") + " " + fmtMoneyEntry(toCur(fuel.costPer100), null, 2) + " / 100 " + distUnit2);
    parts.forEach(p => {
      const s = document.createElement("span");
      s.textContent = p;
      meta.appendChild(s);
    });

    body.appendChild(row);
    body.appendChild(diffEl);
    _appendNote(body, e.note);
    body.appendChild(meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "hist-del";
    del.setAttribute("aria-label", _tv("histEntryDelete"));
    del.textContent = "×";
    del.addEventListener("click", ev => {
      ev.stopPropagation();
      deleteEntry(e.date ?? e.id);
    });

    wrap.appendChild(body);
    wrap.appendChild(del);
    return wrap;
  }

  // ── Search + Pagination ────────────────────────────────────────────────────
  function applySearch(entries, query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return entries;
    // Phase 10: Such-Labels über alle drei Sprachen matchen, damit der Filter
    // unabhängig vom aktiven Markt funktioniert. Gemeinsame Begriffe wie
    // "ev" / "electric" / "elektrikli" bzw. "verbrenner" / "combustion" / "benzinli".
    const EV_LABELS  = ["ev", "e-auto", "electric", "elektrikli"];
    const VB_LABELS  = ["vb", "verbrenner", "combustion", "benzinli"];
    return entries.filter(e => {
      const noteHit = (e.note || "").toLowerCase().includes(q);
      const typeHit = (e.type || "").toLowerCase().includes(q);
      const bag = e.type === "ev" ? EV_LABELS : VB_LABELS;
      const labelHit = bag.some(lbl => lbl.includes(q));
      return noteHit || typeHit || labelHit;
    });
  }

  function paginate(entries, page) {
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const cur   = Math.min(Math.max(1, page), pages);
    const start = (cur - 1) * ITEMS_PER_PAGE;
    return { slice: entries.slice(start, start + ITEMS_PER_PAGE), page: cur, pages, total };
  }

  function renderPager(info) {
    if (!pagerEl) return;
    if (info.total <= ITEMS_PER_PAGE) {
      pagerEl.setAttribute("hidden", "");
      return;
    }
    pagerEl.removeAttribute("hidden");
    if (pagerInfo) pagerInfo.textContent = `${info.page} / ${info.pages}`;
    if (prevBtn)   prevBtn.disabled = info.page <= 1;
    if (nextBtn)   nextBtn.disabled = info.page >= info.pages;
  }

  // ── List orchestration ─────────────────────────────────────────────────────
  function renderLists(v2Entries, legacyEntries) {
    while (listEl.firstChild)     listEl.removeChild(listEl.firstChild);
    while (legacyList.firstChild) legacyList.removeChild(legacyList.firstChild);

    const filtered = applySearch(v2Entries, state.search);
    const info = paginate(filtered, state.page);
    state.page = info.page;

    if (!v2Entries.length) {
      const empty = document.createElement("div");
      empty.className = "hist-empty hist-empty--first";
      const msg = document.createElement("p");
      msg.className = "hist-empty-msg";
      msg.textContent = _tv("histEmptyNone");
      empty.appendChild(msg);
      const cta = document.createElement("a");
      cta.className = "hist-empty-cta";
      cta.href = "./";
      cta.textContent = _tv("histEmptyCta");
      empty.appendChild(cta);
      listEl.appendChild(empty);
      if (actionsEl) actionsEl.setAttribute("hidden", "");
      if (pagerEl) pagerEl.setAttribute("hidden", "");
    } else if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "hist-empty";
      empty.textContent = _tv("histEmptySearch");
      listEl.appendChild(empty);
      if (actionsEl) actionsEl.removeAttribute("hidden");
      if (pagerEl) pagerEl.setAttribute("hidden", "");
    } else {
      if (actionsEl) actionsEl.removeAttribute("hidden");
      info.slice.forEach(e => listEl.appendChild(renderV2Entry(e)));
      renderPager(info);
    }

    if (!legacyEntries.length) {
      if (legacyWrap) legacyWrap.setAttribute("hidden", "");
    } else {
      if (legacyWrap) legacyWrap.removeAttribute("hidden");
      if (legacyCount) legacyCount.textContent = legacyEntries.length;
      legacyEntries.forEach(e => legacyList.appendChild(renderLegacyEntry(e)));
    }
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let state = { period: "today", all: [], search: "", page: 1 };

  function refresh() {
    state.all = loadAll();
    const v2     = state.all.filter(isV2).sort((a, b) => (b.date || 0) - (a.date || 0));
    const legacy = state.all.filter(isLegacy).sort((a, b) => ((b.date ?? b.id) || 0) - ((a.date ?? a.id) || 0));
    renderStats(v2, state.period);
    renderLists(v2, legacy);
    renderHistoryCostChart(v2, state.period);
  }

  function deleteEntry(id) {
    const next = state.all.filter(e => String(e.date ?? e.id) !== String(id));
    saveAll(next);
    refresh();
  }

  // Fade the chart out slightly, swap content, fade back in. Only runs when
  // the chart container is already visible — on cold load (wrap.hidden=true)
  // the callback runs immediately so first paint isn't delayed.
  function animateChartUpdate(callback) {
    const el = document.getElementById("chartWrap");
    if (!el || el.hidden) { callback(); return; }
    el.classList.add("chart-hidden");
    setTimeout(() => {
      callback();
      el.classList.remove("chart-hidden");
    }, 180);
  }

  function setPeriod(period) {
    state.period = period;
    periodBtns.forEach(b => {
      b.classList.toggle("period-btn--active", b.dataset.period === period);
      b.setAttribute("aria-selected", b.dataset.period === period ? "true" : "false");
    });
    try { localStorage.setItem(PERIOD_KEY, period); } catch (e) {}
    const v2 = state.all.filter(isV2);
    renderStats(v2, period);
    animateChartUpdate(() => renderHistoryCostChart(v2, period));
  }

  // ── History cost chart (EV vs ICE per day, scoped to active period) ────────
  // Uses Chart.js loaded via <script> in verlauf.html. Re-renders only on real
  // data changes (refresh / setPeriod) — never on slider UI events.
  let _chartInstance = null;

  function _filterChartEntries(entries, range) {
    const start = periodStart(range || state.period);
    return entries.filter(e => new Date(e.date) >= start);
  }

  // Smart display label for a bar — matches the active timeframe.
  function _formatLabel(date, range) {
    const d = (date instanceof Date) ? date : new Date(date);
    const lang = _currentLanguage();
    if (range === "today") {
      return d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    }
    if (range === "week") {
      return d.toLocaleDateString(lang, { weekday: "short" });
    }
    if (range === "month") {
      return String(d.getDate());
    }
    if (range === "year") {
      return d.toLocaleDateString(lang, { month: "short" });
    }
    if (range === "yearly") {
      return String(d.getFullYear());
    }
    // "all" — avoid cross-year ambiguity
    return d.toLocaleDateString(lang, { month: "short", year: "2-digit" });
  }

  // Bucket entries by timeframe. Returns Map keyed by sortable composite key
  // → { label, sum }. Sortable key prevents weekday/month collisions across
  // weeks or years (e.g. "Mon" in two different weeks must remain separate).
  function _groupByRange(entries, range) {
    const out = new Map();
    entries.forEach(e => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const c = Number(e.costPer100) * Number(e.km) / 100;
      if (!isFinite(c)) return;

      let key;
      if (range === "today") {
        // Each entry gets its own bar so multiple "today" entries stay visible.
        key = String(d.getTime()).padStart(15, "0");
      } else if (range === "week") {
        key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      } else if (range === "month") {
        key = String(d.getDate()).padStart(2, "0");
      } else if (range === "year") {
        key = String(d.getMonth()).padStart(2, "0");
      } else if (range === "yearly") {
        // One bucket per calendar year; sortable as plain YYYY string.
        key = String(d.getFullYear());
      } else { // "all"
        key = d.getFullYear() + "-" + String(d.getMonth()).padStart(2, "0");
      }

      const cur = out.get(key) || { label: _formatLabel(d, range), sum: 0 };
      cur.sum += c;
      out.set(key, cur);
    });
    return out;
  }

  function _buildChartSeries(entries, range) {
    const evMap  = _groupByRange(entries.filter(e => e.type === "ev"), range);
    const iceMap = _groupByRange(entries.filter(e => e.type === "vb"), range);
    const keys = Array.from(new Set([...evMap.keys(), ...iceMap.keys()])).sort();
    const labels  = keys.map(k => (evMap.get(k) || iceMap.get(k)).label);
    const evData  = keys.map(k => evMap.get(k)  ? evMap.get(k).sum  : null);
    const iceData = keys.map(k => iceMap.get(k) ? iceMap.get(k).sum : null);
    return { labels: labels, evData: evData, iceData: iceData };
  }

  function _updateChartTitle(range) {
    const el = document.getElementById("chartTitle");
    if (!el) return;
    const keyMap = { today:"chartToday", week:"chartWeek", month:"chartMonth", year:"chartYear", yearly:"yearly", all:"chartAll" };
    el.textContent = _tv(keyMap[range] || "chartAll");
  }

  // Currency long-form names per (market, language) — used in chartA11ySummary only.
  // Screen readers pronounce €/$/₺ inconsistently (some say "Dollarzeichen", some
  // "Dollars", some skip entirely); long names are unambiguous across NVDA/JAWS/VO.
  const CURRENCY_LONGFORM = {
    de: { de: "Euro",           en: "Euro",         tr: "Euro" },
    us: { de: "US-Dollar",      en: "Dollars",      tr: "ABD Doları" },
    tr: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }
  };
  function _currentMarket() {
    try { return localStorage.getItem(MARKET_KEY) || "de"; } catch (_) { return "de"; }
  }
  function _currencyLongform() {
    const m = _currentMarket(); const l = _currentLanguage();
    return (CURRENCY_LONGFORM[m] && CURRENCY_LONGFORM[m][l]) || "";
  }

  // Accessibility-Design-Entscheidung:
  // - Summary-Text (figcaption): Einheiten und Währungen ausschreiben, da Screenreader
  //   Symbole und Kürzel inkonsistent interpretieren.
  // - Tabellen-Zellen: Symbole und Kürzel zulässig, da Spaltenheader den Kontext
  //   liefert und Screenreader-Tabellen-Navigation den Header vor der Zelle vorliest.
  function _updateChartAccessibility(entries, range) {
    const cap = document.getElementById("chartCaption");
    const tbody = document.getElementById("chartDataTableBody");
    const distHeader = document.getElementById("chartTableHeaderDistance");
    if (!cap || !tbody) return;
    try {
      // Distance-Header is market-aware (not language-aware in single key).
      if (distHeader) {
        distHeader.textContent = _currentIsUs()
          ? _tv("tableHeaderDistanceImperial")
          : _tv("tableHeaderDistanceMetric");
      }

      if (!entries || !entries.length) {
        cap.textContent = _tv("chartA11yEmpty");
        tbody.innerHTML = "";
        return;
      }

      const market = _currentMarket();
      const cfg = MARKET_CONFIG[market] || MARKET_CONFIG.de;
      const locale = cfg.locale;
      const isUs = market === "us";
      const distLong = isUs ? _tv("tableHeaderDistanceImperial") : _tv("tableHeaderDistanceMetric");
      const currLong = _currencyLongform();
      const distAbbrev = isUs ? "mi" : "km";
      const fuelAbbrev = isUs ? "gal" : "L";
      const evEffAbbrev = isUs ? "kWh/100 mi" : "kWh/100 km";
      const iceEffAbbrev = isUs ? "mpg" : "L/100 km";
      const conv = isUs ? UNIT_CONV.MI_TO_KM : 1;

      // Locale-correct currency + number formatters (Intl handles symbol-position,
      // thousand-separators and decimal-separator per locale automatically).
      const moneyFmt = new Intl.NumberFormat(locale, {
        style: "currency", currency: cfg.currency,
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
      const numFmt2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const numFmt1 = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const intFmt  = new Intl.NumberFormat(locale);
      const dOpts = { day: "2-digit", month: "2-digit", year: "numeric" };

      // Aggregates — skip entries without valid costPer100.
      // Accessibility-Summary zeigt km-gewichteten Durchschnitt (tatsächliche
      // Kosten pro 100 Distance-Einheit über alle Einträge zusammen) statt
      // arithmetischem Mittel, da letzteres bei unterschiedlichen km-Längen
      // irreführend wäre. Das Chart zeigt Summen pro Zeitraum-Bucket, keinen
      // expliziter Durchschnitt — der km-gewichtete Wert ist die intuitive
      // "real ausgegeben"-Kennzahl.
      const evValid = entries.filter(e => e.type === "ev" && isFinite(Number(e.costPer100)) && isFinite(Number(e.km)) && Number(e.km) > 0);
      const vbValid = entries.filter(e => e.type === "vb" && isFinite(Number(e.costPer100)) && isFinite(Number(e.km)) && Number(e.km) > 0);
      const weightedAvg = (list) => {
        const totalKm = list.reduce((s, e) => s + Number(e.km), 0);
        if (!(totalKm > 0)) return NaN;
        const totalCost = list.reduce((s, e) => s + (Number(e.costPer100) * Number(e.km) / 100), 0);
        return (totalCost / totalKm) * 100 * conv;
      };
      const evAvg = evValid.length ? weightedAvg(evValid) : NaN;
      const vbAvg = vbValid.length ? weightedAvg(vbValid) : NaN;

      const dates = entries.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
      if (!dates.length || (!isFinite(evAvg) && !isFinite(vbAvg))) {
        cap.textContent = _tv("chartA11yFallback");
        tbody.innerHTML = "";
        return;
      }
      const startStr = dates[0].toLocaleDateString(locale, dOpts);
      const endStr   = dates[dates.length - 1].toLocaleDateString(locale, dOpts);

      cap.textContent = _tv("chartA11ySummary", {
        count: entries.length,
        start: startStr,
        end: endStr,
        evCost: isFinite(evAvg) ? numFmt2.format(evAvg) : "—",
        vbCost: isFinite(vbAvg) ? numFmt2.format(vbAvg) : "—",
        currency: currLong,
        unit: distLong
      });

      // Build table rows. Symbols/abbreviations are fine here (header context).
      const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rows = entries.map(e => {
        const dEntry = new Date(e.date);
        const dStr = !isNaN(dEntry.getTime()) ? dEntry.toLocaleDateString(locale, dOpts) : "";
        const km = Number(e.km) || 0;
        const distVal = isUs ? km / UNIT_CONV.MI_TO_KM : km;
        const distStr = intFmt.format(Math.round(distVal)) + " " + distAbbrev;
        const typeStr = e.type === "ev" ? _tv("typeEv") : _tv("typeVb");

        let consStr = "—";
        if (isFinite(Number(e.consumption))) {
          const cons = Number(e.consumption);
          if (e.type === "ev") {
            const v = isUs ? cons * UNIT_CONV.MI_TO_KM : cons;
            consStr = numFmt1.format(v) + " " + evEffAbbrev;
          } else if (isUs) {
            const mpg = UNIT_CONV.l100kmToMpg(cons);
            consStr = isFinite(mpg) ? intFmt.format(Math.round(mpg)) + " " + iceEffAbbrev : "—";
          } else {
            consStr = numFmt1.format(cons) + " " + iceEffAbbrev;
          }
        }

        let priceStr = "—";
        if (isFinite(Number(e.price))) {
          const price = Number(e.price);
          if (e.type === "ev") {
            priceStr = moneyFmt.format(price) + "/kWh";
          } else {
            const p = isUs ? price * UNIT_CONV.GAL_TO_L : price;
            priceStr = moneyFmt.format(p) + "/" + fuelAbbrev;
          }
        }

        let costStr = "—";
        if (isFinite(Number(e.costPer100))) {
          costStr = moneyFmt.format(Number(e.costPer100) * conv);
        }

        return "<tr><td>" + escHtml(dStr) + "</td><td>" + escHtml(distStr) + "</td><td>"
          + escHtml(typeStr) + "</td><td>" + escHtml(consStr) + "</td><td>"
          + escHtml(priceStr) + "</td><td>" + escHtml(costStr) + "</td></tr>";
      }).join("");
      tbody.innerHTML = rows;
    } catch (err) {
      try {
        cap.textContent = _tv("chartA11yFallback");
        tbody.innerHTML = "";
      } catch (_) {}
    }
  }

  function renderHistoryCostChart(entries, range) {
    const wrap   = document.getElementById("chartWrap");
    const canvas = document.getElementById("costChart");
    if (!wrap || !canvas || typeof window.Chart !== "function") return;

    const filtered = _filterChartEntries(entries || [], range);
    if (!filtered.length) {
      if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
      wrap.hidden = true;
      _updateChartAccessibility([], range);
      return;
    }

    const series = _buildChartSeries(filtered, range);
    if (!series.labels.length) {
      if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
      wrap.hidden = true;
      _updateChartAccessibility([], range);
      return;
    }

    if (_chartInstance) _chartInstance.destroy();

    const ctx2d = canvas.getContext("2d");
    const currencySym = (function () {
      try { var c = getCurrentCurrency(); return (c && c.symbol) || ""; } catch (_) { return ""; }
    })();

    // Soft vertical gradient for each bar — depth without noise. Hovered bar
    // jumps to full opacity; everything else sits at 0.6. Fades to transparent
    // at the baseline. Flat rgba fallback when chartArea isn't ready yet.
    function focusGradient(baseRgb) {
      return function (c) {
        const chart = c.chart;
        const area  = chart.chartArea;
        const topAlpha = c.active ? 1.0 : 0.6;
        if (!area) return "rgba(" + baseRgb + "," + topAlpha + ")";
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, "rgba(" + baseRgb + "," + topAlpha + ")");
        g.addColorStop(1, "rgba(" + baseRgb + ",0)");
        return g;
      };
    }

    // Phase D — konsistent mit Hauptseite: EV = Mint-Grün, ICE = Orange.
    const evBg  = focusGradient("34,197,94");
    const iceBg = focusGradient("245,158,11");

    // Phase Z Sprint Z3 — Dashboard-style grouped bars. Border-radius 4px
    // (statt 10), kleinere Bar-Thickness, dark tooltip mit Inter font,
    // legende mit kleinen Squares (boxWidth 10 → square statt point).
    var _isDarkTheme = (document.documentElement.getAttribute("data-theme") === "dark");
    var _gridColor   = _isDarkTheme ? "rgba(255,255,255,0.06)" : "rgba(17,24,39,0.06)";
    _chartInstance = new window.Chart(ctx2d, {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: _tv("typeEv"),
            data: series.evData,
            backgroundColor: evBg,
            hoverBackgroundColor: evBg,
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 14
          },
          {
            label: _tv("typeVb"),
            data: series.iceData,
            backgroundColor: iceBg,
            hoverBackgroundColor: iceBg,
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 14
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutCubic" },
        animations: { y: { duration: 600, easing: "easeOutQuart" } },
        interaction: { mode: "nearest", intersect: true },
        hover: { animationDuration: 150 },
        layout: { padding: { top: 8, bottom: 4 } },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "rect",
              boxWidth: 10,
              boxHeight: 10,
              padding: 16,
              font: { family: '"Inter", system-ui, sans-serif', size: 12 }
            }
          },
          tooltip: {
            mode: "nearest",
            intersect: true,
            backgroundColor: "rgba(20,20,20,0.95)",
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            titleFont: { family: '"Inter", system-ui, sans-serif', size: 12, weight: "600" },
            bodyFont:  { family: '"Inter", system-ui, sans-serif', size: 12 },
            callbacks: {
              title: function () { return ""; },
              label: function (c) {
                var v = Number(c.raw);
                if (!isFinite(v)) return "—";
                return v.toFixed(2) + (currencySym ? " " + currencySym : "");
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, font: { family: '"Inter", system-ui, sans-serif', size: 11 } }
          },
          y: {
            grid: { color: _gridColor },
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: { family: '"Inter", system-ui, sans-serif', size: 11 },
              callback: function (v) { return v + (currencySym ? " " + currencySym : ""); }
            }
          }
        }
      }
    });

    _updateChartTitle(range);
    wrap.hidden = false;
    _updateChartAccessibility(filtered, range);
  }

  periodBtns.forEach(btn => {
    btn.addEventListener("click", () => setPeriod(btn.dataset.period));
  });

  // Horizontal swipe on the chart container switches period. Accepts either
  // a long drag (> 50 px) or a fast flick (velocity > 0.5 px/ms). Vertical
  // gestures fall through to page scroll.
  (function initChartSwipe() {
    const swipeEl = document.getElementById("chartWrap");
    if (!swipeEl) return;
    const ORDER = ["today", "week", "month", "year", "all", "yearly"];
    const DIST_THRESHOLD = 50;
    const VELOCITY_THRESHOLD = 0.5; // px / ms
    let sx = 0, sy = 0, startTime = 0;
    swipeEl.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      startTime = Date.now();
      swipeEl.classList.add("swiping");
    }, { passive: true });
    swipeEl.addEventListener("touchend", (e) => {
      setTimeout(() => swipeEl.classList.remove("swiping"), 150);
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dy) > Math.abs(dx)) return;        // vertical scroll, ignore
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(dx) / elapsed;
      if (Math.abs(dx) < DIST_THRESHOLD && velocity < VELOCITY_THRESHOLD) return;
      const idx = ORDER.indexOf(state.period);
      if (idx < 0) return;
      const impact = () => {
        swipeEl.classList.add("impact");
        setTimeout(() => swipeEl.classList.remove("impact"), 120);
      };
      if (dx < 0 && idx < ORDER.length - 1) { impact(); setPeriod(ORDER[idx + 1]); }
      else if (dx > 0 && idx > 0)           { impact(); setPeriod(ORDER[idx - 1]); }
    }, { passive: true });
    swipeEl.addEventListener("touchcancel", () => {
      swipeEl.classList.remove("swiping");
    }, { passive: true });
  })();

  if (searchInput) {
    let debounceT;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceT);
      debounceT = setTimeout(() => {
        state.search = searchInput.value || "";
        state.page = 1;
        refresh();
      }, 120);
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (state.page > 1) { state.page -= 1; refresh(); }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      state.page += 1;
      refresh();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm(_tv("confirmClearAll"))) return;
      const remaining = state.all.filter(isLegacy);     // keep legacy
      saveAll(remaining);
      refresh();
    });
  }

  if (legacyClear) {
    legacyClear.addEventListener("click", () => {
      if (!confirm(_tv("confirmClearLegacy"))) return;
      const remaining = state.all.filter(isV2);         // keep v2
      saveAll(remaining);
      refresh();
    });
  }

  // ── Phase B/C: Markt-Pill init (konsistente Top-Bar Hauptseite + Verlauf) ──
  // Phase C-Fix: analog script.js — inline style.display überschreibt CSS
  // `.top-menu { display:flex }`, isOpen-Flag, touchstart für iOS-Quirk,
  // Escape-Key. Vorher: setAttribute("hidden") allein wirkungslos → Menü
  // war von Anfang an offen und schloss nicht.
  function _setMarketPillLabel() {
    const lbl = document.getElementById("marketSwitchLabel");
    if (!lbl) return;
    const m   = _currentMarket();
    const cfg = MARKET_CONFIG[m] || MARKET_CONFIG.de;
    lbl.textContent = m.toUpperCase() + " · " + (cfg.symbol || "");
  }
  function _updateMarketMenuActive() {
    const cur = _currentMarket();
    document.querySelectorAll("[data-market]").forEach((el) => {
      el.classList.toggle("top-menu-item--active", el.getAttribute("data-market") === cur);
    });
  }
  function _setMarketVerlauf(code) {
    const cfg = MARKET_CONFIG[code]; if (!cfg) return;
    try { localStorage.setItem(MARKET_KEY, code); } catch (_) {}
    try { localStorage.setItem(LANG_KEY, cfg.language); } catch (_) {}
    try { localStorage.setItem(CURR_KEY, cfg.currency); } catch (_) {}
    _setMarketPillLabel();
    _updateMarketMenuActive();
    document.dispatchEvent(new CustomEvent("eaf:marketchange", { detail: { market: code } }));
    document.dispatchEvent(new CustomEvent("eaf:languagechange", { detail: { language: cfg.language } }));
    document.dispatchEvent(new CustomEvent("eaf:currencychange", { detail: { currency: cfg.currency } }));
  }
  (function initMarketPillVerlauf() {
    const btn  = document.getElementById("marketSwitch");
    const menu = document.getElementById("marketMenu");
    if (!btn || !menu) return;
    let isOpen = false;
    function closeAll() {
      if (!isOpen) return;
      isOpen = false;
      menu.hidden = true;
      menu.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
    }
    function openMarket() {
      if (isOpen) return;
      isOpen = true;
      menu.hidden = false;
      menu.style.display = "";
      btn.setAttribute("aria-expanded", "true");
    }
    // Initial-Sync — `[hidden]` wird von `.top-menu { display:flex }` überstimmt,
    // daher inline display:none erzwingen.
    menu.style.display = "none";
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    _setMarketPillLabel();
    _updateMarketMenuActive();

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isOpen) closeAll(); else openMarket();
    });

    document.querySelectorAll("[data-market]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = item.getAttribute("data-market");
        closeAll();
        _setMarketVerlauf(code);
      });
    });

    document.addEventListener("click", (e) => {
      if (!isOpen) return;
      if (!e.target.closest(".top-pill-wrap")) closeAll();
    });

    // Touch-Outside deckt iOS-Edge-Cases ab, wo `click` auf Non-Interactive
    // Elementen nicht zuverlässig feuert.
    document.addEventListener("touchstart", (e) => {
      if (!isOpen) return;
      if (!e.target.closest(".top-pill-wrap")) closeAll();
    }, { passive: true });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeAll();
    });
  })();

  // ── Phase 3: Live-Update bei Währungs-/Sprachwechsel ──────────────────────
  // Cross-tab (z. B. Pille auf index umgestellt): storage-Event feuert nur in
  // anderen Tabs. Intra-tab (falls später Pills auf Verlauf kommen): Custom-
  // Event aus dem i18n-System. Beide Pfade sind defensiv — Fehler werden
  // verschluckt, um das Verlauf-Rendering nicht zu beschädigen.
  window.addEventListener("storage", (e) => {
    if (!e) return;
    // Phase 6: Markt-Key ist primär; Language/Currency-Keys bleiben für
    // Rückwärtskompatibilität mit älterem Browser-State beobachtbar.
    if (e.key === MARKET_KEY || e.key === CURR_KEY || e.key === LANG_KEY) {
      try { _applyTranslationsVerlauf(); } catch (_) {}
      try { refresh(); } catch (_) {}
    }
  });
  document.addEventListener("eaf:marketchange", () => {
    try { _applyTranslationsVerlauf(); } catch (_) {}
    try { _setMarketPillLabel(); } catch (_) {}
    try { _updateMarketMenuActive(); } catch (_) {}
    try { refresh(); } catch (_) {}
  });
  document.addEventListener("eaf:currencychange", () => {
    try { refresh(); } catch (_) {}
  });
  document.addEventListener("eaf:languagechange", () => {
    try { _applyTranslationsVerlauf(); } catch (_) {}
    try { _setMarketPillLabel(); } catch (_) {}
    try { refresh(); } catch (_) {}
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  let savedPeriod = "today";
  try { savedPeriod = localStorage.getItem(PERIOD_KEY) || "today"; } catch (e) {}
  if (!["today","week","month","year","yearly","all"].includes(savedPeriod)) savedPeriod = "today";
  state.period = savedPeriod;
  periodBtns.forEach(b => {
    b.classList.toggle("period-btn--active", b.dataset.period === savedPeriod);
    b.setAttribute("aria-selected", b.dataset.period === savedPeriod ? "true" : "false");
  });
  refresh();
})();
