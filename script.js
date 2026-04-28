const $ = id => document.getElementById(id);

// ── Utilities ─────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
// Phase P Sprint 4 (F1.1): the former `_calcDebounced` alias was removed —
// it was never debounced (just `() => calc()`) and the name misled readers.
// Slider input listeners and setter callbacks now call `calc()` directly.

// ── Persistence ──────────────────────────────────────────────────────────────
// kmMonat ist NICHT Teil von INPUT_IDS — wird ausschließlich über LT_KM_MONAT_KEY
// verwaltet (Single Source of Truth). Verhindert doppelte Listener / calc().
const INPUT_IDS = ["evVerbrauch","strompreis","benzinpreis","verbrauchVerbrenner","kmEv","kmVb","kmShared","batteryKwh"];
const LS_KEY       = "eaf.inputs.v2";
const RIDESHARE_KEY       = "eaf.rideshareActive";
const RIDESHARE_PERSONS_KEY = "eaf.ridesharePersons";
const LT_ACTIVE_KEY  = "eaf.longtermActive";
const LT_YEARS_KEY   = "eaf.longtermYears";
const LT_PREMIUM_KEY = "eaf.longtermPremium";
const LT_KM_MONAT_KEY = "eaf.longtermKmMonat";
const HIST_KEY     = "eautofakten_history";
const HIST_MAX     = 50;
const MODE_KEY     = "eaf.mode";
const TYPE_KEY     = "eaf.type";
const APP_VERSION     = "20260428-1";
const APP_VERSION_KEY = "eaf.appVersion";
const PURGE_DONE_KEY  = "eaf.legacyPurgeDone";
const PURGE_TRIES_KEY = "eaf.legacyPurgeTries";

// ── App-state migration (runs first, before any state is read) ───────────────
// Two layers:
//   1. Cleanup steps (always run on APP_VERSION change). Cheap localStorage
//      hygiene — drop known-dead keys, validate JSON blobs, etc.
//   2. Legacy hard-purge (unregister old SW + drop caches + reload). Runs at
//      most ONCE per browser, guarded by `eaf.legacyPurgeDone` in
//      localStorage (Phase P Sprint 4 / F1.6: was sessionStorage, which
//      could fail-loop in private modes). Additional reload-loop counter
//      bails out after 3 unsuccessful attempts.
(function migrateAppState() {
  let stored = null;
  try { stored = localStorage.getItem(APP_VERSION_KEY); } catch(_) {}
  if (stored === APP_VERSION) return;

  // Detect existing install (any app-state present → came from older version)
  const hasOldState = (() => {
    try {
      return !!(
        localStorage.getItem(MODE_KEY) ||
        localStorage.getItem(TYPE_KEY) ||
        localStorage.getItem(LS_KEY)   ||
        localStorage.getItem("eaf.history.v1") ||
        localStorage.getItem("eaf.inputs")     ||
        localStorage.getItem("eaf.inputs.v1")
      );
    } catch(_) { return false; }
  })();

  // 1. Clean known-legacy keys (safe to drop — unused by current code)
  ["eaf.inputs", "eaf.inputs.v1", "eaf.history.v0", "eaf.mode.v1", "eaf.ui", "eaf.prefs"]
    .forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });

  // 2. Validate current inputs blob; drop if malformed
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) localStorage.removeItem(LS_KEY);
    }
  } catch(_) { try { localStorage.removeItem(LS_KEY); } catch(__){} }

  // 3. Validate mode/type/theme — drop invalid values so defaults kick in
  try { const m = localStorage.getItem(MODE_KEY); if (m && m !== "compare" && m !== "single") localStorage.removeItem(MODE_KEY); } catch(_) {}
  try { const t = localStorage.getItem(TYPE_KEY); if (t && t !== "ev" && t !== "vb")          localStorage.removeItem(TYPE_KEY); } catch(_) {}
  try { const th = localStorage.getItem("theme"); if (th && th !== "light" && th !== "dark")  localStorage.removeItem("theme");   } catch(_) {}

  // 4. Validate history array (keep only well-formed entries — do NOT wipe)
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) localStorage.removeItem(HIST_KEY);
    }
  } catch(_) { try { localStorage.removeItem(HIST_KEY); } catch(__){} }

  // 5. Mark migration done
  try { localStorage.setItem(APP_VERSION_KEY, APP_VERSION); } catch(_) {}

  // 6. Legacy purge (one-shot, lifetime of the browser). Skipped when:
  //    - PURGE_DONE_KEY already set (already purged once before),
  //    - or no legacy state to clean,
  //    - or this is just an APP_VERSION bump for an already-tracked install
  //      (stored !== null means a previous Phase P sprint already migrated
  //      this browser; we record purge-done silently so future bumps skip).
  //    Reload-loop guard via PURGE_TRIES_KEY — if we already tried ≥ 3
  //    times without succeeding, give up and continue normally.
  let purgeDone = null, purgeTries = 0;
  try { purgeDone = localStorage.getItem(PURGE_DONE_KEY); } catch(_) {}
  if (!purgeDone && stored !== null) {
    try { localStorage.setItem(PURGE_DONE_KEY, "1"); } catch(_) {}
    return;
  }
  if (purgeDone === "1" || !hasOldState) return;
  try { purgeTries = parseInt(localStorage.getItem(PURGE_TRIES_KEY) || "0", 10) || 0; } catch(_) {}
  if (purgeTries >= 3) {
    try { localStorage.setItem(PURGE_DONE_KEY, "1"); } catch(_) {}
    return;
  }
  try { localStorage.setItem(PURGE_TRIES_KEY, String(purgeTries + 1)); } catch(_) {}

  const tasks = [];
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    tasks.push(
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister().catch(() => {}))))
        .catch(() => {})
    );
  }
  if (window.caches && caches.keys) {
    tasks.push(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k).catch(() => {}))))
        .catch(() => {})
    );
  }
  Promise.all(tasks).finally(() => {
    try { localStorage.setItem(PURGE_DONE_KEY, "1"); } catch(_) {}
    try { localStorage.removeItem(PURGE_TRIES_KEY); } catch(_) {}
    setTimeout(() => { try { location.reload(); } catch(_) {} }, 40);
  });
})();

// App mode state
let appMode   = "compare";                // "compare" | "single" — default: compare
let singleType = "ev";                    // "ev" | "vb" — default: ev
let rideshareActive = false;              // Fahrgemeinschaft an/aus — default: aus
let ridesharePersons = 1;                 // 1 bis 6 — default: 1
let longtermActive  = false;              // Langzeitanalyse an/aus — default: aus
let longtermYears   = 10;                 // 0 bis 20 Jahre — default: 10
let longtermPremium = 5000;               // Mehrpreis EV in € — default: 5000
let kmMonat         = 1000;               // Monatliche Fahrleistung — default: 1000 km
try {
  const m = localStorage.getItem(MODE_KEY); if (m === "compare" || m === "single") appMode = m;
  const t = localStorage.getItem(TYPE_KEY); if (t === "ev" || t === "vb") singleType = t;
  const rs = localStorage.getItem(RIDESHARE_KEY); if (rs === "1") rideshareActive = true;
  const rp = parseInt(localStorage.getItem(RIDESHARE_PERSONS_KEY), 10);
  if (isFinite(rp) && rp >= 1 && rp <= 6) ridesharePersons = rp;
  const la = localStorage.getItem(LT_ACTIVE_KEY); if (la === "1") longtermActive = true;
  const ly = parseInt(localStorage.getItem(LT_YEARS_KEY), 10);
  if (isFinite(ly) && ly >= 0 && ly <= 20) longtermYears = ly;
  // Phase 10: Bounds sind markt-spezifisch (US: 45k Premium, TR: 2M Premium;
  // US: 60 mi kmMonat). Hier nur auf finite + nicht-negativ prüfen — die
  // Setter-Funktionen und Slider-Attribute clampen später markt-korrekt.
  const lp = parseInt(localStorage.getItem(LT_PREMIUM_KEY), 10);
  if (isFinite(lp) && lp >= 0) longtermPremium = lp;
  const kmM = parseInt(localStorage.getItem(LT_KM_MONAT_KEY), 10);
  if (isFinite(kmM) && kmM >= 0) kmMonat = kmM;
} catch (_) {}

// One-time migration: legacy "eaf.history.v1" → new "eautofakten_history"
(function migrateHistory() {
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
    localStorage.setItem(HIST_KEY, JSON.stringify(migrated.slice(0, HIST_MAX)));
    localStorage.removeItem("eaf.history.v1");
  } catch(e) {}
})();
// Phase 6: war IIFE (lief auf Module-Top-Level vor MARKET_CONFIG-Anwendung).
// Jetzt benannte Funktion, wird in init() AUFGERUFEN nach applyMarketRanges,
// damit Clamping gegen korrekte Markt-Range stattfindet.
function loadInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    INPUT_IDS.forEach(id => {
      const el = $(id);
      if (!el || saved[id] == null || saved[id] === "") return;
      const num = parseFloat(saved[id]);
      if (!isFinite(num)) return;
      const min = parseFloat(el.min), max = parseFloat(el.max);
      const clamped = (isFinite(min) && isFinite(max))
        ? Math.min(max, Math.max(min, num))
        : num;
      el.value = clamped;
    });
    // Back-compat: old single "km" field → fill kmEv / kmVb / kmShared
    if (saved.km != null && saved.km !== "" && saved.kmEv == null && saved.kmVb == null) {
      if ($("kmEv")) $("kmEv").value = Math.min(1000, parseFloat(saved.km) || 500);
      if ($("kmVb")) $("kmVb").value = Math.min(1000, parseFloat(saved.km) || 500);
      if ($("kmShared")) $("kmShared").value = Math.min(5000, parseFloat(saved.km) || 1000);
    }
  } catch(e) {}
}

// Restore from Verlauf entry when ?id=<timestamp> is present
(function restoreFromHistoryParam() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    const entry = hist.find(e => String(e.date ?? e.id) === String(id));
    if (!entry) return;

    if (entry.schema === "v2" && (entry.type === "ev" || entry.type === "vb")) {
      // Single-mode entry → restore only the matching side and switch to single mode
      if (entry.type === "ev") {
        if ($("kmEv"))        $("kmEv").value        = entry.km;
        if ($("evVerbrauch")) $("evVerbrauch").value = entry.consumption;
        if ($("strompreis"))  $("strompreis").value  = entry.price;
      } else {
        if ($("kmVb"))                $("kmVb").value                = entry.km;
        if ($("verbrauchVerbrenner")) $("verbrauchVerbrenner").value = entry.consumption;
        if ($("benzinpreis"))         $("benzinpreis").value         = entry.price;
      }
      appMode   = "single";
      singleType = entry.type;
      try { localStorage.setItem(MODE_KEY, appMode); localStorage.setItem(TYPE_KEY, singleType); } catch(_){}
    } else {
      // Legacy compare entry → fill both sides, switch to compare mode
      const ev = entry.ev || {}, fuel = entry.fuel || {};
      const i  = entry.inputs || {};
      const legacyKm = entry.km ?? i.km_per_month;
      const sharedKm = legacyKm != null ? Math.min(5000, Math.max(50, parseFloat(legacyKm) || 1000)) : null;
      const map = {
        kmShared:            sharedKm,
        kmEv:                entry.kmEv         ?? legacyKm,
        kmVb:                entry.kmVb         ?? legacyKm,
        evVerbrauch:         ev.consumption     ?? i.ev_consumption,
        strompreis:          ev.price           ?? i.electricity_price,
        verbrauchVerbrenner: fuel.consumption   ?? i.fuel_consumption,
        benzinpreis:         fuel.price         ?? i.fuel_price,
      };
      Object.entries(map).forEach(([k, v]) => { if (v != null && $(k)) $(k).value = v; });
      appMode = "compare";
      try { localStorage.setItem(MODE_KEY, appMode); } catch(_){}
    }
    saveInputs();
    setTimeout(() => {
      applyMode();
      refreshSliderValues();
      refreshSliderFills();
      calc();
      const target = appMode === "single" ? $("singleResult") : $("compareResult");
      setTimeout(() => target?.scrollIntoView({behavior:"smooth",block:"start"}), 120);
    }, 0);
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  } catch(e) {}
})();

INPUT_IDS.forEach(id => {
  const el = $(id); if (!el) return;
  el.addEventListener("input", () => { saveInputs(); calc(); });
});

// "Show results" CTA — meaningful confirm action.
// On any input change inside .calc-section: mark result body as stale (dimmed)
// and glow the button. On click: recalculate, lift dim, clear glow.
// Auto-calc keeps running in the background (per existing input listeners) so
// the displayed numbers stay current; the stale state is purely the visual
// "you changed something, confirm with a click" cue.
(() => {
  const btn = $("calcBtn");
  if (!btn) return;
  const scope = document.querySelector(".calc-section") || document;
  const markStale = () => {
    btn.classList.add("active");
    document.body.setAttribute("data-result-stale", "true");
  };
  const clearStale = () => {
    btn.classList.remove("active");
    document.body.removeAttribute("data-result-stale");
  };
  scope.addEventListener("input",  markStale);
  scope.addEventListener("change", markStale);
  btn.addEventListener("click", () => {
    calc();
    clearStale();
    // Phase D/E — Smooth-Scroll. 100ms gibt calc() Zeit zu rendern.
    // Compare-Modus: scroll zu chartSection (Chart oben → Werte darunter →
    //                Sticky-Button = komplette Section auf einen Blick).
    // Single-Modus:  scroll zu singleResult (kein Chart vorhanden).
    setTimeout(() => {
      const target = appMode === "single"
        ? $("singleResult")
        : ($("chartSection") && !$("chartSection").hidden ? $("chartSection") : $("compareResult"));
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    // a11y: announce the freshly calculated result once (explicit user action,
    // not a drag artifact). Uses _resultSentence as single source of truth.
    try {
      const announcer = $("sliderAnnouncer");
      if (announcer) {
        const data = appMode === "single" ? _getSingleData() : _getCompareData();
        if (data) {
          const sentence = _resultSentence(data, appMode === "single" ? "single" : "compare", "user");
          announcer.textContent = _t("srResultUpdated", { value: sentence });
        }
      }
    } catch (_) {}
  });
})();

function saveInputs() {
  try {
    const data = {};
    INPUT_IDS.forEach(id => { const el = $(id); if (el) data[id] = el.value; });
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) {}
}

// ── Quick share / save (primary UI actions) ──────────────────────────────────
function _shareFallback(text, url) {
  const full = text + "\n" + url;
  const done = () => eafToast(_t("toastClipboard"), "var(--green)");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(full).then(done).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = full; ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); } catch(e) {}
      document.body.removeChild(ta); done();
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = full; ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch(e) {}
    document.body.removeChild(ta); done();
  }
}

function shareQuick() {
  // Vor Share: UI erzwingen, damit UI = Share = Calc identisch sind.
  calc();
  const d = _getCompareData();
  if (!d) { eafToast(_t("toastCalcFirst")); return; }
  const unit   = _distanceUnit();
  const per100 = _t("per100km", { unit: unit });
  const yrMoney = _fmtMoney(Math.round(Math.abs(d.yr)));
  const yearWord = _t("yearOther");
  const label = d.diff > 0 ? `${yrMoney} ${_t("shareSavings")} / ${yearWord}`
              : d.diff < 0 ? `${yrMoney} ${_t("extraCostFor", { km: "" }).trim()} / ${yearWord}`
                           : _t("costsEqual");
  const title = _t("shareCompareTitle");
  const text  =
    `${title}:\n` +
    `${_t("typeEv")}: ${_fmtMoney(_costPer100ToMarket(d.evCost))} ${per100}\n` +
    `${_t("typeVb")}: ${_fmtMoney(_costPer100ToMarket(d.vbCost))} ${per100}\n` +
    label;
  const url = location.href;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(err => {
      if (err?.name !== "AbortError") _shareFallback(text, url);
    });
  } else {
    _shareFallback(text, url);
  }
}

// Save only single-mode entries (v2 schema) — compare values are not stored.
function saveQuick() {
  if (appMode !== "single") {
    eafToast(_t("toastSaveSingleOnly"));
    return;
  }
  const isEv = singleType === "ev";
  const km          = isEv ? n("kmEv")        : n("kmVb");
  const consumption = isEv ? n("evVerbrauch") : n("verbrauchVerbrenner");
  const price       = isEv ? n("strompreis")  : n("benzinpreis");
  if (![km, consumption, price].every(v => isFinite(v) && v > 0)) {
    eafToast(_t("toastInvalidInput")); return;
  }
  const costPer100 = consumption * price;
  const yearlyCost = costPer100 * km * 12 / 100;
  const monthlyCost = yearlyCost / 12;
  const persons = rideshareActive ? Math.max(1, ridesharePersons) : 1;
  const ridesharing = rideshareActive && persons > 1;

  // Notiz: NUR explizite Nutzereingabe persistieren. Rideshare-Info wird
  // nicht als Text in entry.note hartcodiert (wäre sprachabhängig) — das
  // Verlauf-Rendering zeigt die lokalisierte Rideshare-Line dynamisch aus
  // entry.ridesharing / entry.persons.
  const noteEl = $("noteInput");
  const noteRaw = noteEl ? (noteEl.value || "").trim() : "";
  const note = noteRaw || "";

  // Phase 3 + 5: Markt-/Sprach-/Währungsmetadaten zur Speicherzeit mitschreiben.
  // Ab Phase 5 sind die Rohwerte (km, consumption, price, costPer100,
  // monthlyCost, yearlyCost) in der aktiven Markt-Währung — kein erzwungener
  // EUR-Fixpunkt mehr. currencyMetadata macht diese Währung beim späteren
  // Rendern explizit auslesbar.
  let _currencyMetadata = { code: "EUR", symbol: "€", locale: "de-DE" };
  let _entryLanguage = "de";
  let _marketCode = "de";
  try {
    if (window.EAF_I18N && typeof window.EAF_I18N.getCurrency === "function") {
      const _curCode = window.EAF_I18N.getCurrency();
      const _cfg = window.EAF_I18N.currencyConfig && window.EAF_I18N.currencyConfig[_curCode];
      if (_cfg) _currencyMetadata = { code: _cfg.code, symbol: _cfg.symbol, locale: _cfg.locale };
    }
    if (window.EAF_I18N && typeof window.EAF_I18N.getLanguage === "function") {
      const _lng = window.EAF_I18N.getLanguage();
      if (_lng) _entryLanguage = _lng;
    }
    // Phase 6: marketCode direkt aus dem i18n-Modul — nicht mehr aus der Sprache abgeleitet.
    if (window.EAF_I18N && typeof window.EAF_I18N.getMarketCode === "function") {
      const _mk = window.EAF_I18N.getMarketCode();
      if (_mk) _marketCode = _mk;
    }
  } catch (_) {}

  const entry = {
    date: Date.now(),
    schema: "v2",
    type: singleType,
    km, consumption, price,
    costPer100, monthlyCost, yearlyCost,
    ridesharing, persons,
    note,
    // Phase 3 meta-data (optional, additive) — nur für die Anzeige-Formatierung,
    // niemals für Wertekonvertierung.
    currencyMetadata: _currencyMetadata,
    language: _entryLanguage,
    // Phase 5: Markt-Kennung, zusätzlich zur Sprache, vorbereitet für
    // künftige Markt-spezifische Darstellungslogik (z. B. Slider-Ranges).
    marketCode: _marketCode,
    sourceLocale: _currencyMetadata.locale || "de-DE",
  };
  try {
    const arr = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    arr.unshift(entry);
    if (arr.length > HIST_MAX) arr.length = HIST_MAX;
    localStorage.setItem(HIST_KEY, JSON.stringify(arr));
    eafToast(_t("toastSaved"), "var(--green)");
    _flashVerlaufBtn();
    if (noteEl) noteEl.value = "";
  } catch(e) {
    eafToast(_t("toastSaveFailed"));
  }
}

// ── Save cooldown (1 min) ───────────────────────────────────────────────────
const SAVE_COOLDOWN = 60 * 1000;
function canSave() {
  const last = localStorage.getItem("lastSaveTime");
  if (!last) return true;
  return Date.now() - Number(last) > SAVE_COOLDOWN;
}
function saveEntrySafe() {
  if (!canSave()) {
    eafToast(_t("saveCooldown"));
    return;
  }
  saveQuick();
  try { localStorage.setItem("lastSaveTime", String(Date.now())); } catch (_) {}
}

function _flashVerlaufBtn() {
  const btn  = $("qVerlaufBtn");
  const hint = $("verlaufHint");
  if (btn) {
    btn.classList.remove("qc-btn--verlauf-pulse");
    void btn.offsetWidth;
    btn.classList.add("qc-btn--verlauf-pulse");
    clearTimeout(btn._pulseT);
    btn._pulseT = setTimeout(() => btn.classList.remove("qc-btn--verlauf-pulse"), 5000);
  }
  if (hint) {
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("show"));
    clearTimeout(hint._showT);
    hint._showT = setTimeout(() => {
      hint.classList.remove("show");
      setTimeout(() => { hint.hidden = true; }, 400);
    }, 4500);
  }
}

// ── Mode / Type (Vergleich vs. Einzelberechnung) ─────────────────────────────
function applyMode() {
  document.body.setAttribute("data-app-mode", appMode);
  document.body.setAttribute("data-single-type", singleType);
  const typeToggle = $("typeToggle"); if (typeToggle) typeToggle.hidden = (appMode !== "single");
  const mC = $("modeCompareBtn"), mS = $("modeSingleBtn");
  if (mC) { mC.classList.toggle("mode-btn--active", appMode === "compare"); mC.setAttribute("aria-selected", String(appMode === "compare")); }
  if (mS) { mS.classList.toggle("mode-btn--active", appMode === "single");  mS.setAttribute("aria-selected", String(appMode === "single")); }
  const tE = $("typeEvBtn"), tV = $("typeVbBtn");
  if (tE) { tE.classList.toggle("type-btn--active", singleType === "ev"); tE.setAttribute("aria-selected", String(singleType === "ev")); }
  if (tV) { tV.classList.toggle("type-btn--active", singleType === "vb"); tV.setAttribute("aria-selected", String(singleType === "vb")); }
  updateSaveButton();
}

function updateSaveButton() {
  const btn = $("qSaveBtn"), hint = $("saveHint"), imgBtn = $("qImgBtn");
  if (!btn) return;
  if (appMode === "compare") {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    if (hint) hint.hidden = true;
  } else {
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
    if (hint) hint.hidden = true;
  }
  // Image share is available in both modes
  if (imgBtn) {
    imgBtn.disabled = false;
    imgBtn.removeAttribute("aria-disabled");
  }
}

function setMode(m) {
  if (m !== "compare" && m !== "single") return;
  appMode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch(_) {}
  applyMode();
  applyLongterm();
  calc();
}
function setType(t) {
  if (t !== "ev" && t !== "vb") return;
  singleType = t;
  try { localStorage.setItem(TYPE_KEY, t); } catch(_) {}
  applyMode();
  calc();
}


// ── Helpers ──────────────────────────────────────────────────────────────────
// Phase 9: n() liefert stets INTERNE (metrische) Werte — im US-Markt wandelt
// sie Raw-Slider-Werte (mi, gal, mpg, kWh/100 mi) vor Rückgabe um. Dadurch
// rechnet die gesamte Calc-Kette unverändert in metrischen Einheiten.
function n(id) {
  const v = parseFloat($(id).value);
  if (!isFinite(v)) return NaN;
  return _rawToInternal(id, v);
}
// Raw-Wert ohne Konversion (für Anzeige-/Speicher-Zwecke, wenn der User-Wert
// direkt benötigt wird, z. B. beim Label-Rendering "300 mi").
function _nRaw(id) {
  const v = parseFloat($(id).value);
  return isFinite(v) ? v : NaN;
}

// ── Phase 7: Übersetzungs-Helper mit Platzhalter-Ersetzung ──────────────────
// Nutzt window.EAF_I18N.t() und ersetzt {placeholder} mit subs[placeholder].
// Fällt bei fehlendem i18n-Modul defensiv auf den Fallback-Wert zurück.
function _t(key, subs) {
  var raw = key;
  try {
    if (window.EAF_I18N && typeof window.EAF_I18N.t === "function") {
      raw = window.EAF_I18N.t(key) || key;
    }
  } catch (_) {}
  var common = {
    unit:   (typeof _distanceUnit   === "function") ? _distanceUnit()   : "km",
    symbol: (typeof _currencySymbol === "function") ? _currencySymbol() : "€"
  };
  return String(raw).replace(/\{(\w+)\}/g, function (m, name) {
    if (subs && subs[name] != null) return String(subs[name]);
    if (common[name] != null)       return common[name];
    return "";
  });
}

// Safety wrapper: returns "" when a key isn't translated (i18n not yet ready
// or key missing). Prevents raw keys like "costForKm" from ever reaching the UI.
function safeT(key, subs) {
  var out = _t(key, subs);
  return (out === key) ? "" : out;
}

// ── Phase 5/6: aktuelle Markt-Locale holen ──────────────────────────────────
// Wird für Zahlenformatierung (tausender-Trenner, Dezimalkomma) verwendet.
// Fällt defensiv auf "de-DE" zurück, wenn das i18n-Modul noch nicht da ist.
function _currentLocale() {
  try {
    if (window.EAF_I18N && typeof window.EAF_I18N.getMarket === "function") {
      var mk = window.EAF_I18N.getMarket();
      if (mk && mk.locale) return mk.locale;
    }
    if (window.EAF_I18N && window.EAF_I18N.currencyConfig && typeof window.EAF_I18N.getCurrency === "function") {
      var cfg = window.EAF_I18N.currencyConfig[window.EAF_I18N.getCurrency()];
      if (cfg && cfg.locale) return cfg.locale;
    }
  } catch (_) {}
  return "de-DE";
}

function fmt(v, d = 2) {
  if (!isFinite(v)) return "—";
  try {
    return v.toLocaleString(_currentLocale(), { minimumFractionDigits: d, maximumFractionDigits: d });
  } catch (_) {
    return v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
}

// ── Phase 9: US-Markt mit US-Einheiten ─────────────────────────────────────
// Intern rechnet die App weiter in metrischen Einheiten (km, L/100 km,
// kWh/100 km, €/L, €/kWh). Für den US-Markt werden Slider-Eingaben und
// Anzeigen in US-Einheiten dargestellt (mi, mpg, kWh/100 mi, $/gal) und an
// der I/O-Grenze konvertiert. DE und TR bleiben unverändert metrisch.
//
// Exakte Konstanten:
//   1 mi         = 1.609344 km
//   1 US gallon  = 3.785411784 L
//   L/100 km     = 235.214583 / mpg  (und umgekehrt)
//   kWh/100 mi ↔ kWh/100 km: Skalierung mit MI_TO_KM
const UNIT_CONV = {
  MI_TO_KM: 1.609344,
  GAL_TO_L: 3.785411784,
  MPG_TO_L100KM_FACTOR: 235.214583,
  mpgToL100km: function (m) { return (isFinite(m) && m > 0) ? 235.214583 / m : NaN; },
  l100kmToMpg: function (l) { return (isFinite(l) && l > 0) ? 235.214583 / l : NaN; }
};

// Aktiver Markt == USA?
function _isUsMarket() {
  try {
    return !!(window.EAF_I18N && typeof window.EAF_I18N.getMarketCode === "function" && window.EAF_I18N.getMarketCode() === "us");
  } catch (_) {}
  return false;
}
// User-seitige Einheiten-Strings
function _distanceUnit()   { return _isUsMarket() ? "mi"  : "km"; }
function _fuelVolumeUnit() { return _isUsMarket() ? "gal" : "L";  }
function _iceEffUnit()     { return _isUsMarket() ? "mpg"        : "L/100 km"; }
function _evEffUnit()      { return _isUsMarket() ? "kWh/100 mi" : "kWh/100 km"; }

// Internal → User-Display-Konvertierung (für Rendering)
function _kmToDist(km)             { return _isUsMarket() ? km / UNIT_CONV.MI_TO_KM : km; }
function _distToKm(d)              { return _isUsMarket() ? d  * UNIT_CONV.MI_TO_KM : d;  }
function _costPer100ToMarket(cPer100km) { return _isUsMarket() ? cPer100km * UNIT_CONV.MI_TO_KM : cPer100km; }
function _iceConsumptionToMarket(l100km) { return _isUsMarket() ? UNIT_CONV.l100kmToMpg(l100km) : l100km; }
function _evConsumptionToMarket(k100km)  { return _isUsMarket() ? k100km * UNIT_CONV.MI_TO_KM : k100km; }
function _fuelPriceToMarket(pPerL)       { return _isUsMarket() ? pPerL * UNIT_CONV.GAL_TO_L : pPerL; }

// Raw-Slider-Value → Internal (metrisch). Zentrale Konversions-Lookup für n().
// Nur im US-Markt wirksam; andere Märkte geben den Rohwert unverändert zurück.
function _rawToInternal(id, v) {
  if (!isFinite(v)) return NaN;
  if (!_isUsMarket()) return v;
  switch (id) {
    case "kmEv": case "kmVb": case "kmShared": case "kmMonat":
      return v * UNIT_CONV.MI_TO_KM;                   // mi → km
    case "benzinpreis":
      return v / UNIT_CONV.GAL_TO_L;                   // $/gal → $/L
    case "verbrauchVerbrenner":
      return UNIT_CONV.mpgToL100km(v);                 // mpg → L/100 km
    case "evVerbrauch":
      return v / UNIT_CONV.MI_TO_KM;                   // kWh/100 mi → kWh/100 km
    default:
      // strompreis ($/kWh), batteryKwh, longtermPremium, ridesharePersons, longtermYears
      // behalten ihre Einheit — keine Konversion nötig.
      return v;
  }
}

// ── Phase 5: Aktives Markt-Symbol holen ─────────────────────────────────────
// Liest das Symbol der aktuellen Marktwährung aus dem EAF_I18N-Modul. Fällt
// bei nicht verfügbarem Modul defensiv auf "€" zurück (Standard DE-Markt).
function _currencySymbol() {
  try {
    if (window.EAF_I18N && window.EAF_I18N.currencyConfig && typeof window.EAF_I18N.getCurrency === "function") {
      var cfg = window.EAF_I18N.currencyConfig[window.EAF_I18N.getCurrency()];
      if (cfg && cfg.symbol) return cfg.symbol;
    }
  } catch (_) {}
  return "€";
}

// ── Phase 2 / Phase 5: Markt-basierter Geldwert-Formatter ───────────────────
// Rohwerte sind seit Phase 5 immer in der aktiven Marktwährung — der
// Formatter lokalisiert sie nur, ohne Wechselkurs-Konversion.
function _fmtMoney(v, decimals) {
  if (!isFinite(v)) return "—";
  if (decimals == null) decimals = 2;
  var cfg = null;
  try {
    if (window.EAF_I18N && window.EAF_I18N.currencyConfig && typeof window.EAF_I18N.getCurrency === "function") {
      cfg = window.EAF_I18N.currencyConfig[window.EAF_I18N.getCurrency()];
    }
  } catch (_) {}
  if (!cfg) return fmt(v, decimals) + " " + _currencySymbol();
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(v);
  } catch (_) {
    return fmt(v, decimals) + " " + (cfg.symbol || "€");
  }
}

// Smart formatter: drop decimals on large TR-market totals (Savings, Longterm).
// Non-TR markets and small TR values keep the regular _fmtMoney output.
function _fmtMoneySmart(v) {
  if (!isFinite(v)) return "—";
  var useCompact = false;
  try { useCompact = (typeof _isUsMarket === "function") ? (!_isUsMarket() && window.EAF_I18N && window.EAF_I18N.getCurrency && window.EAF_I18N.getCurrency() === "TRY") : false; } catch (_) {}
  if (!useCompact) return _fmtMoney(v);
  return Math.abs(v) >= 1000 ? _fmtMoney(v, 0) : _fmtMoney(v, 2);
}

// ── Berechnungs-Validierung ─────────────────────────────────────────────────
// Invariant-Checks: warnen, wenn Ableitungen nicht mit Eingaben übereinstimmen.
// Toleranz 0,01 € (Rundungsrauschen). Kein UI-Blocker, nur console.error.
function _assertClose(label, expected, actual, tol = 0.01) {
  if (!isFinite(expected) || !isFinite(actual)) return true;
  if (Math.abs(expected - actual) > tol) {
    console.error(`[calc-validate] ${label}: expected ${expected}, got ${actual} (Δ ${expected - actual})`);
    return false;
  }
  return true;
}
function _validateSingle({ km, consumption, price, costPer100, monthlyCost, yearlyCost }) {
  _assertClose("costPer100 = Verbrauch × Preis", consumption * price, costPer100);
  _assertClose("monthlyCost = (km/100) × Verbrauch × Preis", (km / 100) * consumption * price, monthlyCost);
  _assertClose("yearlyCost = monthlyCost × 12", monthlyCost * 12, yearlyCost);
  _assertPlausible("single.costPer100", costPer100);
  _assertPlausible("single.monthlyCost", monthlyCost);
  _assertPlausible("single.yearlyCost", yearlyCost);
}
function _assertPlausible(label, v) {
  if (!isFinite(v)) { console.error(`[plausibility] ${label}: not finite (${v})`); return false; }
  if (v < 0)        { console.error(`[plausibility] ${label}: negative (${v})`); return false; }
  return true;
}
// Vor Share: bestätigt dass Share-Daten konsistent mit unified result sind.
function _assertShareSafe(d) {
  if (!d) return false;
  if (d.ridesharing) {
    const p = d.persons;
    if (!(p >= 2)) { console.error("[share] ridesharing true but persons < 2", p); return false; }
    if (d.costPerPerson != null) _assertClose("single.costPerPerson = totalCost / persons", d.totalCost / p, d.costPerPerson);
    if (d.eAutoPerPerson != null) {
      _assertClose("compare.eAutoPerPerson = eAutoTotal / persons", d.eAutoTotal / p, d.eAutoPerPerson);
      _assertClose("compare.verbrennerPerPerson = verbrennerTotal / persons", d.verbrennerTotal / p, d.verbrennerPerPerson);
      _assertClose("compare.savingsPerPerson = savingsTotal / persons", d.savingsTotal / p, d.savingsPerPerson);
    }
  } else {
    if (d.persons !== 1) { console.error("[share] persons must be 1 when not ridesharing", d.persons); return false; }
  }
  return true;
}
function _validateCompare({ kmJahr, ev, verb, yrEv, yrVb, diff100Sig, diffYrSig }) {
  _assertClose("EV yearly = (kmJahr/100) × EV_per100", (kmJahr / 100) * ev,   yrEv);
  _assertClose("VB yearly = (kmJahr/100) × VB_per100", (kmJahr / 100) * verb, yrVb);
  _assertClose("diff_per_100km = VB_per100 − EV_per100", verb - ev, diff100Sig);
  _assertClose("diff_yearly = yrVb − yrEv",               yrVb - yrEv, diffYrSig);
  _assertClose("diff_yearly = (kmJahr/100) × diff_per_100km",
               (kmJahr / 100) * diff100Sig, diffYrSig);
  _assertPlausible("compare.yrEv", yrEv);
  _assertPlausible("compare.yrVb", yrVb);
}

// Reichweite (km) = (Batterie / Verbrauch) × 100
function computeRange(batteryKwh, consumptionKwhPer100) {
  if (!isFinite(batteryKwh) || batteryKwh <= 0) return NaN;
  if (!isFinite(consumptionKwhPer100) || consumptionKwhPer100 <= 0) return NaN;
  const range = (batteryKwh / consumptionKwhPer100) * 100;
  _assertClose("range = (battery / consumption) × 100",
               (batteryKwh / consumptionKwhPer100) * 100, range);
  return range;
}
function updateRangeDisplay() {
  const dispEl = $("rangeDisplay");
  const boxEl  = $("rangeBox");
  const hintEl = $("rangeHint");
  if (!dispEl) return;
  const battery     = n("batteryKwh");
  const consumption = n("evVerbrauch");
  const range = computeRange(battery, consumption);
  if (isFinite(range)) {
    const km = Math.round(range);
    dispEl.textContent = _t("rangeText", { km: km.toLocaleString(_currentLocale()) });
    if (boxEl) boxEl.hidden = false;
    dispEl.hidden = false;
    if (hintEl) hintEl.hidden = true;
  } else {
    if (boxEl) boxEl.hidden = true;
    dispEl.hidden = true;
    if (hintEl) hintEl.hidden = false;
  }
}

// ── Fahrgemeinschaft ─────────────────────────────────────────────────────────
function applyRideshare() {
  const body   = $("rideshareBody");
  const valEl  = $("ridesharePersonsV");
  const slider = $("ridesharePersons");
  if (body)   body.hidden = !rideshareActive;
  if (slider) {
    slider.value = String(ridesharePersons);
    _updateSliderFill(slider);
  }
  if (valEl)  valEl.textContent = ridesharePersons.toString();
  document.body.setAttribute("data-rideshare", rideshareActive ? "on" : "off");
}
function setRideshareActive(v) {
  rideshareActive = !!v;
  if (!rideshareActive) {
    ridesharePersons = 1;
    try { localStorage.setItem(RIDESHARE_PERSONS_KEY, "1"); } catch (_) {}
    const pp1 = $("singlePerPerson"), pp2 = $("comparePerPerson");
    if (pp1) { pp1.textContent = ""; pp1.hidden = true; }
    if (pp2) { pp2.textContent = ""; pp2.hidden = true; }
  }
  try { localStorage.setItem(RIDESHARE_KEY, rideshareActive ? "1" : "0"); } catch (_) {}
  applyRideshare();
  calc();
}
function setRidesharePersons(v) {
  if (!isFinite(v)) return;
  v = Math.max(1, Math.min(6, Math.round(v)));
  ridesharePersons = v;
  try { localStorage.setItem(RIDESHARE_PERSONS_KEY, String(v)); } catch (_) {}
  const valEl = $("ridesharePersonsV");
  if (valEl) valEl.textContent = v.toString();
  calc();
}
function getRideshareDivisor() {
  return rideshareActive ? Math.max(1, ridesharePersons) : 1;
}

// ── Langzeitanalyse ─────────────────────────────────────────────────────────
function applyLongterm() {
  const body   = $("longtermBody");
  const yrSl   = $("longtermYears");
  const yrVal  = $("longtermYearsV");
  const prSl   = $("longtermPremium");
  const prVal  = $("longtermPremiumV");
  const kmSl   = $("kmMonat");
  const kmVal  = $("kmMonatV");
  const kmJahr = $("ltKmJahr");
  const kmWarn = $("ltKmWarn");
  if (body)  body.hidden = !longtermActive;
  if (yrSl)  { yrSl.value = String(longtermYears); _updateSliderFill(yrSl); }
  if (yrVal) yrVal.textContent = `${longtermYears} ${longtermYears === 1 ? _t("yearOne") : _t("yearOther")}`;
  if (yrSl && yrVal) yrSl.setAttribute("aria-valuetext", yrVal.textContent);
  if (prSl)  { prSl.value = String(longtermPremium); _updateSliderFill(prSl); }
  if (prVal) prVal.textContent = longtermPremium.toLocaleString(_currentLocale()) + " " + _currencySymbol();
  if (prSl && prVal) prSl.setAttribute("aria-valuetext", prVal.textContent);
  if (kmSl)  { kmSl.value = String(kmMonat); _updateSliderFill(kmSl); }
  if (kmVal) kmVal.textContent = Math.round(kmMonat).toLocaleString(_currentLocale()) + " " + _distanceUnit();
  if (kmJahr) kmJahr.textContent = _t("kmPerYearApprox", { km: Math.round(kmMonat * 12).toLocaleString(_currentLocale()) });
  if (kmWarn) kmWarn.hidden = !(kmMonat > 3000);
  document.body.setAttribute("data-longterm", longtermActive ? "on" : "off");
  const ltSwitch = $("ltSwitchBtn");
  if (ltSwitch) {
    ltSwitch.hidden = false;
    ltSwitch.disabled = !(appMode === "compare" && longtermActive);
  }
  const disable = (id) => { const el = $(id); if (el) el.disabled = longtermActive; };
  disable("qImgBtn");
  disable("qTxtBtn");
  disable("qSaveBtn");
  disable("qVerlaufBtn");
  disable("rideshareToggle");
  disable("modeSingleBtn");
  disable("modeCompareBtn");
  disable("typeEvBtn");
  disable("typeVbBtn");
}
function setLongtermActive(v) {
  longtermActive = !!v;
  try { localStorage.setItem(LT_ACTIVE_KEY, longtermActive ? "1" : "0"); } catch (_) {}
  // State-reset beim Wechsel: alte Werte des NICHT aktiven Modus auf Defaults setzen
  if (longtermActive) {
    // Einmalige Strecke auf Defaults zurücksetzen
    const ks = $("kmShared"), ke = $("kmEv"), kv = $("kmVb");
    if (ks) ks.value = "1000";
    if (ke) ke.value = "500";
    if (kv) kv.value = "500";
  } else {
    // Monatswerte zurücksetzen
    kmMonat = 1000;
    try { localStorage.setItem(LT_KM_MONAT_KEY, "1000"); } catch (_) {}
    const km = $("kmMonat"); if (km) km.value = "1000";
  }
  refreshSliderValues();
  refreshSliderFills();
  saveInputs();
  applyLongterm();
  calc();
}
function setKmMonat(v) {
  if (!isFinite(v)) return;
  // Phase 9: Slider-Ranges sind marktabhängig → Clamping aus DOM lesen.
  const slEl  = $("kmMonat");
  const minV  = slEl ? (parseFloat(slEl.min)  || 100) : 100;
  const maxV  = slEl ? (parseFloat(slEl.max)  || 5000) : 5000;
  const stepV = slEl ? (parseFloat(slEl.step) || 50)   : 50;
  v = Math.max(minV, Math.min(maxV, Math.round(v / stepV) * stepV));
  kmMonat = v;  // Raw-Wert (Markt-Einheit: km oder mi)
  try { localStorage.setItem(LT_KM_MONAT_KEY, String(v)); } catch (_) {}
  const valEl  = $("kmMonatV");
  const jahrEl = $("ltKmJahr");
  const warnEl = $("ltKmWarn");
  const unit = _distanceUnit();
  if (valEl)  valEl.textContent  = v.toLocaleString(_currentLocale()) + " " + unit;
  if (jahrEl) jahrEl.textContent = _t("kmPerYearApprox", { km: (v * 12).toLocaleString(_currentLocale()), unit: unit });
  // Warnschwelle marktabhängig: 3000 km oder 1900 mi ≈ entsprechender Bereich
  const warnThreshold = _isUsMarket() ? 1900 : 3000;
  if (warnEl) warnEl.hidden = !(v > warnThreshold);
  calc();
}
function setLongtermYears(v) {
  if (!isFinite(v)) return;
  v = Math.max(0, Math.min(20, Math.round(v)));
  longtermYears = v;
  try { localStorage.setItem(LT_YEARS_KEY, String(v)); } catch (_) {}
  const valEl = $("longtermYearsV");
  if (valEl) valEl.textContent = `${v} ${v === 1 ? _t("yearOne") : _t("yearOther")}`;
  calc();
}
function setLongtermPremium(v) {
  if (!isFinite(v)) return;
  // Phase 7: Min/Max/Step aus dem Slider-Element lesen, damit marktspezifische
  // Ranges (z. B. TR 0–2.000.000) korrekt geclampt werden. Fallback: DE-Range.
  const slEl = $("longtermPremium");
  const minV  = slEl ? (parseFloat(slEl.min)  || 0)     : 0;
  const maxV  = slEl ? (parseFloat(slEl.max)  || 40000) : 40000;
  const stepV = slEl ? (parseFloat(slEl.step) || 100)   : 100;
  v = Math.max(minV, Math.min(maxV, Math.round(v / stepV) * stepV));
  longtermPremium = v;
  try { localStorage.setItem(LT_PREMIUM_KEY, String(v)); } catch (_) {}
  const valEl = $("longtermPremiumV");
  if (valEl) valEl.textContent = v.toLocaleString(_currentLocale()) + " " + _currencySymbol();
  calc();
}

function animCount(el, to, d, col, prefix, suffix) {
  if (!isFinite(to)) { el.style.color = col; el.textContent = "—"; return; }
  prefix = prefix || ""; suffix = suffix || "";
  if (el._animRaf) cancelAnimationFrame(el._animRaf);
  const dur = 550, t0 = performance.now();
  function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.style.color = col;
    el.textContent = prefix + fmt(to * e, d) + suffix;
    if (p < 1) el._animRaf = requestAnimationFrame(step);
    else { el.textContent = prefix + fmt(to, d) + suffix; el._animRaf = null; }
  }
  el._animRaf = requestAnimationFrame(step);
}

// Phase 2: animierte Geldwert-Ausgabe, nutzt aktuelle Währung über _fmtMoney.
function _animCountMoney(el, to, col, prefix, suffix) {
  if (!el) return;
  if (!isFinite(to)) { el.style.color = col; el.textContent = "—"; return; }
  prefix = prefix || ""; suffix = suffix || "";
  if (el._animRaf) cancelAnimationFrame(el._animRaf);
  const dur = 550, t0 = performance.now();
  function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.style.color = col;
    el.textContent = prefix + _fmtMoney(to * e) + suffix;
    if (p < 1) el._animRaf = requestAnimationFrame(step);
    else { el.textContent = prefix + _fmtMoney(to) + suffix; el._animRaf = null; }
  }
  el._animRaf = requestAnimationFrame(step);
}

// ── Reset ────────────────────────────────────────────────────────────────────
function confirmReset() {
  if (confirm(_t("confirmReset"))) reset();
}

function reset() {
  $("evVerbrauch").value = 17;
  $("strompreis").value = 0.35;
  $("benzinpreis").value = 1.85;
  $("verbrauchVerbrenner").value = 7.0;
  $("kmEv").value = 500;
  $("kmVb").value = 500;
  if ($("kmShared")) $("kmShared").value = 1000;
  if ($("batteryKwh")) $("batteryKwh").value = 60;
  if ($("kmMonat")) { $("kmMonat").value = 1000; kmMonat = 1000; try { localStorage.setItem(LT_KM_MONAT_KEY, "1000"); } catch(_) {} }
  refreshSliderValues();
  updateRangeDisplay();
  refreshSliderFills();
  applyLongterm();
  try { localStorage.removeItem(LS_KEY); } catch(e) {}
  saveInputs();
  if ($("compareBody"))  $("compareBody").hidden  = true;
  if ($("compareEmpty")) $("compareEmpty").hidden = false;
  if ($("singleBody"))   $("singleBody").hidden   = true;
  if ($("singleEmpty"))  $("singleEmpty").hidden  = false;
  calc();
}

// ── Single-mode calculator ───────────────────────────────────────────────────
function calcSingle() {
  const badge = $("singleBadge"), body = $("singleBody"), empty = $("singleEmpty");
  const isEv  = singleType === "ev";
  if (badge) {
    badge.textContent = isEv ? _t("typeEv") : _t("typeVb");
    badge.className = "mode-badge " + (isEv ? "mode-badge--ev" : "mode-badge--vb");
  }
  const d = _getSingleData();
  if (!d) {
    if (body)  body.hidden  = true;
    if (empty) empty.hidden = false;
    return;
  }
  _validateSingle({
    km: d.km, consumption: d.consumption, price: d.price,
    costPer100: d.costPer100, monthlyCost: d.monthlyCost, yearlyCost: d.yearlyCost
  });

  const heroLblEl = $("singleHeroLbl"), heroValEl = $("singleHeroVal");
  const c100El = $("singleCost100"), metaEl = $("singleMeta");
  // Phase P Sprint 4 (F4.9): use the WCAG-AA text variants (not the brand
  // backgrounds). Same hue, dark enough against light --bg.
  const heroColor = isEv ? "var(--ev-text)" : "var(--orange-text)";

  // 1) Hero: Gesamtkosten (groß) + Subtitle "Kosten für X km/mi"
  if (heroValEl) _animCountMoney(heroValEl, d.monthlyCost, heroColor);
  if (heroLblEl) heroLblEl.textContent = _t("costForKm", { km: fmt(_kmToDist(d.km), 0) + " " + _distanceUnit() });

  // 2) Fahrgemeinschaft (nur wenn aktiv UND persons > 1)
  const ppEl = $("singlePerPerson");
  if (ppEl) {
    if (d.ridesharing) {
      ppEl.textContent = `${_fmtMoney(d.costPerPerson)} ${_t("perPerson")} (${d.persons} ${_t("persons")})`;
      ppEl.hidden = false;
    } else {
      ppEl.textContent = "";
      ppEl.hidden = true;
    }
  }

  // 3) Ø Kosten pro 100 km/mi (Markt-Einheit)
  if (c100El) _animCountMoney(c100El, _costPer100ToMarket(d.costPer100), "var(--l1)", "Ø ", " " + _t("per100km", { unit: _distanceUnit() }));

  if (metaEl) {
    // Phase 9: Single-Meta-Chips in Markt-Einheiten.
    const consDisp = isEv ? _evConsumptionToMarket(d.consumption) : _iceConsumptionToMarket(d.consumption);
    const priceDisp = isEv ? d.price : _fuelPriceToMarket(d.price);
    const consUnit  = " " + (isEv ? _evEffUnit() : _iceEffUnit());
    const priceUnit = isEv ? " " + _currencySymbol() + " / kWh"
                           : " " + _currencySymbol() + " / " + _fuelVolumeUnit();
    // Dezimalstellen: EV = 1; ICE = 1 (L/100km) oder 0 (mpg ist Integer)
    const consDec = isEv ? 1 : (_isUsMarket() ? 0 : 1);
    metaEl.innerHTML =
      `<span>${fmt(_kmToDist(d.km), 0)} ${_distanceUnit()}</span>` +
      `<span>${fmt(consDisp, consDec)}${consUnit}</span>` +
      `<span>${fmt(priceDisp, 2)}${priceUnit}</span>`;
  }

  if (empty) empty.hidden = true;
  if (body) {
    const wasHidden = body.hidden;
    body.hidden = false;
    if (wasHidden) { body.classList.remove("result-in"); void body.offsetWidth; body.classList.add("result-in"); }
  }
}

// ── Compare-mode calculator ──────────────────────────────────────────────────
function calcCompare() {
  const empty = $("compareEmpty"), body = $("compareBody");
  const d = _getCompareData();
  if (!d) {
    if (body)  body.hidden  = true;
    if (empty) empty.hidden = false;
    return;
  }

  const km  = d.kmEv;

  _validateCompare({
    kmJahr: d.kmJahr, ev: d.evCost, verb: d.vbCost,
    yrEv: d.yrEv, yrVb: d.yrVb,
    diff100Sig: d.vbCost - d.evCost,
    diffYrSig:  d.yrVb - d.yrEv
  });

  const badgeEl = $("compareBadge"), hlblEl = $("compareHeroLbl"), hvalEl = $("compareHeroVal");
  const moEl    = $("compareMonthly"), d100El = $("compareDiff100"), metaEl = $("compareMeta");

  // Phase 9: Distanz in Markt-Einheiten anzeigen (km oder mi).
  const kmLabel = `${fmt(_kmToDist(km), 0)} ${_distanceUnit()}`;
  // Phase P Sprint 4 (F4.9): hero/value colours use the WCAG-AA text variants.
  let color, badgeTxt, badgeCls, heroLbl;
  if (d.diffSig > 0) {
    color    = "var(--ev-text)";
    badgeTxt = _t("evCheaper");
    badgeCls = "mode-badge mode-badge--ev";
    heroLbl  = _t("savingsFor", { km: kmLabel });
  } else if (d.diffSig < 0) {
    color    = "var(--orange-text)";
    badgeTxt = _t("vbCheaper");
    badgeCls = "mode-badge mode-badge--vb";
    heroLbl  = _t("extraCostFor", { km: kmLabel });
  } else {
    color    = "var(--l2)";
    badgeTxt = _t("costsEqual");
    badgeCls = "mode-badge mode-badge--schnell";
    heroLbl  = _t("differenceFor", { km: kmLabel });
  }

  if (badgeEl) { badgeEl.textContent = badgeTxt; badgeEl.className = badgeCls; }
  if (hlblEl)  hlblEl.textContent = heroLbl;
  if (hvalEl)  _animCountMoney(hvalEl, d.savingsTotal, color);

  const moLblEl   = $("compareMonthlyLbl");
  const d100LblEl = $("compareDiff100Lbl");
  if (moLblEl)   moLblEl.textContent   = _t("costLabelEv");
  if (d100LblEl) d100LblEl.textContent = _t("costLabelVb");

  if (moEl) _animCountMoney(moEl, d.eAutoTotal, "var(--ev-text)");
  if (d100El) {
    d100El.style.color = "var(--orange-text)";
    d100El.textContent = _fmtMoney(d.verbrennerTotal);
  }
  const ppEl = $("comparePerPerson");
  if (ppEl) {
    if (d.ridesharing) {
      ppEl.textContent =
        `${_t("perPersonPrefix", { n: d.persons })}: ⚡ ${_fmtMoney(d.eAutoPerPerson)}  ·  ⛽ ${_fmtMoney(d.verbrennerPerPerson)}`;
      ppEl.hidden = false;
    } else {
      ppEl.textContent = "";
      ppEl.hidden = true;
    }
  }
  if (metaEl) {
    // Phase 9: Meta-Chips in Markt-Einheiten (mi/km, Kosten pro 100 Markteinheit).
    const per100 = _t("per100km", { unit: _distanceUnit() });
    metaEl.innerHTML =
      `<span>${fmt(_kmToDist(km), 0)} ${_distanceUnit()}</span>` +
      `<span>${_t("typeEv")} ${_fmtMoney(_costPer100ToMarket(d.evCost))} ${per100}</span>` +
      `<span>${_t("typeVb")} ${_fmtMoney(_costPer100ToMarket(d.vbCost))} ${per100}</span>`;
  }
  if (empty) empty.hidden = true;
  if (body) {
    const wasHidden = body.hidden;
    body.hidden = false;
    if (wasHidden) { body.classList.remove("result-in"); void body.offsetWidth; body.classList.add("result-in"); }
  }
  renderCostChart({ kmMax: km, ev: d.evCost, verb: d.vbCost });
  renderLongterm({ yrEv: d.yrEv, yrVb: d.yrVb });
}

// ── Langzeitanalyse Render ──────────────────────────────────────────────────
function renderLongterm({ yrEv, yrVb }) {
  const wrap = $("longtermWrap");
  if (!wrap) return;
  if (appMode !== "compare") return;

  const evEl = $("ltEvTotal"), vbEl = $("ltVbTotal");
  const lossBlock = $("ltBlockLoss"), lossVal = $("ltLossVal");
  const doneBlock = $("ltBlockDone"), doneVal = $("ltDoneVal");
  const beEl = $("ltBreakeven");

  // ── Eingaben absichern ────────────────────────────────────────────────
  const years   = Math.max(0, longtermYears);
  const premium = Math.max(0, longtermPremium);
  const safeEv  = Math.max(0, isFinite(yrEv) ? yrEv : 0);   // jährliche Kosten EV
  const safeVb  = Math.max(0, isFinite(yrVb) ? yrVb : 0);   // jährliche Kosten Verbrenner
  const monat   = Math.max(0, kmMonat);

  // ── Zentrale Berechnung (eine Quelle, keine Teilwerte) ─────────────────
  let kostenEv, kostenVb, betriebErsparnis, gesamtErsparnis, restMehrpreis, amortisiert;
  if (years === 0 || monat === 0) {
    kostenEv = 0;
    kostenVb = 0;
    betriebErsparnis = 0;
    gesamtErsparnis = 0;
    restMehrpreis = premium;
    amortisiert = false;
  } else {
    kostenEv = safeEv * years;
    kostenVb = safeVb * years;
    betriebErsparnis = kostenVb - kostenEv;
    if (betriebErsparnis >= premium) {
      amortisiert = true;
      gesamtErsparnis = betriebErsparnis - premium;
      restMehrpreis = 0;
    } else {
      amortisiert = false;
      gesamtErsparnis = 0;
      restMehrpreis = premium - betriebErsparnis;
    }
  }
  const jahresErsparnis = safeVb - safeEv;

  // Phase 2: nutzt currentCurrency, 0 Nachkommastellen wie zuvor
  const fmtEu = v => _fmtMoney(Math.round(Math.max(0, v)), 0);

  if (evEl) evEl.textContent = fmtEu(kostenEv);
  if (vbEl) vbEl.textContent = fmtEu(kostenVb);

  // ── Defensive: immer beide Texte schreiben (keine stale values) ────────
  if (lossVal) lossVal.textContent = fmtEu(restMehrpreis);
  if (doneVal) doneVal.textContent = _t("totalSavingsLabel", { val: fmtEu(gesamtErsparnis) });

  // ── Mutually exclusive: loss OR done (niemals beide) ───────────────────
  if (lossBlock && doneBlock) {
    if (amortisiert) {
      doneBlock.hidden = false;
      lossBlock.hidden = true;
    } else {
      lossBlock.hidden = false;
      doneBlock.hidden = true;
    }
  }

  // ── Break-Even (konsistent mit amortisiert-Flag) ───────────────────────
  if (beEl) {
    let txt;
    if (amortisiert) {
      if (premium <= 0) {
        txt = _t("profitableNow");
      } else if (jahresErsparnis > 0) {
        const yrsNeeded = premium / jahresErsparnis;
        const fmtYrs = yrsNeeded < 10
          ? yrsNeeded.toLocaleString(_currentLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : Math.round(yrsNeeded).toLocaleString(_currentLocale());
        const yrsUnit = yrsNeeded === 1 ? _t("yearOne") : _t("yearOther");
        txt = _t("breakevenAfter", { years: fmtYrs + " " + yrsUnit });
      } else {
        txt = _t("profitableNow");
      }
    } else {
      txt = _t("noBreakeven");
    }
    beEl.textContent = txt;
  }
}

// ── Kostenentwicklung Chart (Apple-clean line chart) ─────────────────────────
function _isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}
function renderCostChart({ kmMax, ev, verb }) {
  const section = $("chartSection");
  const canvas  = $("costChart");
  if (!section || !canvas) return;
  if (appMode !== "compare" || !isFinite(kmMax) || kmMax <= 0 || !isFinite(ev) || !isFinite(verb)) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 320;
  const cssH = 200;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const dark   = _isDark();
  const axisC  = dark ? "rgba(255,255,255,.10)" : "rgba(17,24,39,.08)";
  const tickC  = dark ? "rgba(235,235,245,.45)" : "rgba(107,114,128,.85)";
  // Phase E — EV-Linie konsistent mit EV-Theme: Mint-Grün statt Blau.
  const evC    = dark ? "#4ade80" : "#22c55e";
  const vbC    = dark ? "#fbbf24" : "#f59e0b";
  const evFill = dark ? "rgba(74,222,128,.10)" : "rgba(34,197,94,.08)";
  const vbFill = dark ? "rgba(251,191,36,.08)" : "rgba(245,158,11,.06)";

  const padL = 44, padR = 14, padT = 10, padB = 26;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  // Costs at kmMax (€, linear from 0)
  const evMax = ev   * kmMax / 100;
  const vbMax = verb * kmMax / 100;
  const yMax  = Math.max(evMax, vbMax) * 1.08 || 1;

  const xOf = km   => padL + (km / kmMax) * plotW;
  const yOf = cost => padT + plotH - (cost / yMax) * plotH;

  // Grid (horizontal, 4 lines)
  ctx.strokeStyle = axisC;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i) / 4;
    ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y);
  }
  ctx.stroke();

  // Y-ticks (€)
  ctx.fillStyle = tickC;
  ctx.font = "500 10.5px " + _CF;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const v = yMax * (1 - i / 4);
    const y = padT + (plotH * i) / 4;
    const lbl = v >= 100 ? Math.round(v).toLocaleString(_currentLocale()) : fmt(v, 1);
    ctx.fillText(lbl + " " + _currencySymbol(), padL - 6, y);
  }

  // X-ticks: 0, mid, max — label in current market distance unit.
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xTicks = [0, kmMax / 2, kmMax];
  const distUnit = _distanceUnit();
  xTicks.forEach(km => {
    ctx.fillText(Math.round(_kmToDist(km)).toLocaleString(_currentLocale()) + " " + distUnit, xOf(km), padT + plotH + 6);
  });

  // Line + area helper (linear: 2 points are enough for a straight line,
  // but we draw through several to allow for future curve)
  function drawSeries(costAt, color, fill) {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const km = (kmMax * i) / 20;
      pts.push([xOf(km), yOf(costAt * km / 100)]);
    }
    // filled area
    ctx.beginPath();
    ctx.moveTo(pts[0][0], padT + plotH);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], padT + plotH);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    // stroke
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
    ctx.stroke();
    // end dot
    const [ex, ey] = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  drawSeries(ev,   evC, evFill);
  drawSeries(verb, vbC, vbFill);
}
function _redrawChartIfCompare() {
  if (appMode !== "compare") return;
  const d = _getCompareData();
  if (d) renderCostChart({ kmMax: d.kmEv, ev: d.evCost, verb: d.vbCost });
}
window.addEventListener("resize", debounce(_redrawChartIfCompare, 150));
// Redraw on theme switch
new MutationObserver(_redrawChartIfCompare).observe(document.documentElement, {
  attributes: true, attributeFilter: ["data-theme"],
});

// ── Main calculator ──────────────────────────────────────────────────────────
function calc() {
  if (appMode === "single") calcSingle();
  else                      calcCompare();
}

// ── Share System ─────────────────────────────────────────────────────────────
const _CF = '"Inter", system-ui, sans-serif';

// ── Unified result objects (single source of truth for UI + Share) ──────────
// Fahrgemeinschaft: persons = 1 wenn inaktiv; perPerson = Total / persons (niemals doppelt).
//
// Naming caveat (Phase P Sprint 4 / F1.2):
//   `monthlyCost` is historically named but represents the cost for the
//   user-entered km value (a single trip), NOT a literal monthly figure.
//   `yearlyCost = monthlyCost * 12` therefore models "if you drove this
//   distance every month for a year". The name is preserved because the
//   localStorage entry schema (`schema: "v2"`) persists `monthlyCost` as
//   a field — renaming the variable without a migration would break
//   already-saved entries. Treat it as `tripCost` semantically; rename
//   when a v3 history schema is introduced.
const _getSingleData = () => {
  const isEv = singleType === "ev";
  const km          = isEv ? n("kmEv")        : n("kmVb");
  const consumption = isEv ? n("evVerbrauch") : n("verbrauchVerbrenner");
  const price       = isEv ? n("strompreis")  : n("benzinpreis");
  if (![km, consumption, price].every(x => isFinite(x) && x > 0)) return null;
  const costPer100  = consumption * price;
  const monthlyCost = costPer100 * km / 100;   // = trip cost (see header)
  const yearlyCost  = monthlyCost * 12;        // = trip × 12 (see header)

  const persons = rideshareActive ? Math.max(1, ridesharePersons) : 1;
  const ridesharing = rideshareActive && persons > 1;
  const totalCost     = monthlyCost;          // Kosten für die gewählten km
  const costPerPerson = totalCost / persons;  // EINZIGE Division durch persons

  return {
    type: singleType, isEv, km, consumption, price,
    costPer100, monthlyCost, yearlyCost,
    ridesharing, persons, totalCost, costPerPerson
  };
};

const _getCompareData = () => {
  const v = n("evVerbrauch"), p = n("strompreis");
  const b = n("benzinpreis"), vbV = n("verbrauchVerbrenner");
  let km = n("kmShared");
  // km ≤ 0 → alle Strecken-Kosten werden 0 (keine Division durch km im Code).
  if (!isFinite(km) || km < 0) km = 0;
  // Mode B (Langzeit aktiv): einmalige Strecke zählt nicht
  if (longtermActive) km = 0;
  const kmEv = km, kmVb = km;
  if (!isFinite(v)||v<=0||!isFinite(p)||p<=0||!isFinite(b)||b<=0||!isFinite(vbV)||vbV<=0) return null;

  const evCost = v * p, vbCost = b * vbV;                 // Kosten / 100 km
  const eAutoTotal      = evCost * kmEv / 100;            // Kosten für Strecke (E-Auto)
  const verbrennerTotal = vbCost * kmVb / 100;            // Kosten für Strecke (Verbrenner)
  const diffSig         = verbrennerTotal - eAutoTotal;   // +: E-Auto günstiger
  const savingsTotal    = Math.abs(diffSig);

  // Jahreswerte: nur im Langzeit-Modus sinnvoll (kmMonat × 12). Sonst = 0.
  // Phase 9: kmMonat ist Raw (Markt-Einheit, mi im US-Markt). Für die Rechnung
  // in metrische km umwandeln, bevor yrEv/yrVb gebildet werden.
  const kmMonatInternal = _rawToInternal("kmMonat", kmMonat);
  const kmJahr = longtermActive ? (Math.max(0, kmMonatInternal) * 12) : 0;
  const yrEv   = evCost * kmJahr / 100;
  const yrVb   = vbCost * kmJahr / 100;
  const diff   = yrVb - yrEv;
  const yr     = Math.abs(diff);

  // Ridesharing: persons=1 zählt NICHT als Fahrgemeinschaft (UI/Share konsistent).
  const persons = rideshareActive ? Math.max(1, ridesharePersons) : 1;
  const ridesharing = rideshareActive && persons > 1;
  const eAutoPerPerson      = eAutoTotal / persons;
  const verbrennerPerPerson = verbrennerTotal / persons;
  const savingsPerPerson    = savingsTotal / persons;

  return {
    evCost, vbCost, kmEv, kmVb,
    eAutoTotal, verbrennerTotal, diffSig, savingsTotal,
    kmJahr, yrEv, yrVb, diff, yr, mo: yr / 12,
    ridesharing, persons,
    eAutoPerPerson, verbrennerPerPerson, savingsPerPerson
  };
};

// ── Text formatting ──────────────────────────────────────────────────────────
const _fmtDE = (v, d = 2) => v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

// ── Canvas helpers ────────────────────────────────────────────────────────────
function _drawBg(ctx, w, h) {
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,"#0e0e15"); g.addColorStop(.55,"#11161f"); g.addColorStop(1,"#060a0f");
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
}
function _drawGlow(ctx, w, h, hex) {
  const g = ctx.createRadialGradient(w/2,0,0,w/2,0,w*.65);
  g.addColorStop(0,hex+"28"); g.addColorStop(1,hex+"00");
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
}
// Neutraler, weicher Glow — kein harter Farbkontrast (premium, minimal).
function _drawGlowDual(ctx, w, h) {
  const gTop = ctx.createRadialGradient(w*0.32, h*0.18, 0, w*0.32, h*0.18, w*0.75);
  gTop.addColorStop(0,"rgba(10,132,255,0.10)"); gTop.addColorStop(1,"rgba(10,132,255,0)");
  ctx.fillStyle = gTop; ctx.fillRect(0,0,w,h);
  const gBot = ctx.createRadialGradient(w*0.68, h*0.78, 0, w*0.68, h*0.78, w*0.75);
  gBot.addColorStop(0,"rgba(255,159,10,0.08)"); gBot.addColorStop(1,"rgba(255,159,10,0)");
  ctx.fillStyle = gBot; ctx.fillRect(0,0,w,h);
}
function _ct(ctx, text, x, y, color, size, weight) {
  ctx.fillStyle = color; ctx.textAlign = "center";
  ctx.font = `${weight||400} ${size}px ${_CF}`;
  ctx.fillText(text, x, y);
}
// One-line centered text with auto-shrink to maxWidth (down to minSize).
function _ctFitLine(ctx, text, x, y, color, baseSize, weight, maxWidth, minSize) {
  ctx.fillStyle = color; ctx.textAlign = "center";
  let size = baseSize;
  ctx.font = `${weight||400} ${size}px ${_CF}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight||400} ${size}px ${_CF}`;
  }
  ctx.fillText(text, x, y);
}
function _pill(ctx, text, cx, cy, size, weight, textColor, bgColor, padX, padY) {
  ctx.font = `${weight||600} ${size}px ${_CF}`;
  const tw = ctx.measureText(text).width;
  const pw = tw + padX * 2, ph = size + padY * 2;
  const rx = cx - pw / 2, ry = cy - size - padY;
  const r = ph / 2;
  ctx.fillStyle = bgColor;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(rx, ry, pw, ph, r); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx+pw, ry, rx+pw, ry+ph, r);
    ctx.arcTo(rx+pw, ry+ph, rx, ry+ph, r);
    ctx.arcTo(rx, ry+ph, rx, ry, r);
    ctx.arcTo(rx, ry, rx+pw, ry, r);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = textColor; ctx.textAlign = "center";
  ctx.fillText(text, cx, cy);
}

// ── Compare 9:16 (1080×1920) — premium, neutral, clean (konsumiert unified result)
function _drawCompare9x16(ctx, d) {
  const W = 1080, H = 1920;
  const {
    evCost, vbCost, eAutoTotal, verbrennerTotal, diffSig, savingsTotal, kmEv,
    ridesharing, persons, eAutoPerPerson, verbrennerPerPerson, savingsPerPerson
  } = d;

  _drawBg(ctx, W, H);
  _drawGlowDual(ctx, W, H);

  // Phase 11: markt-/sprach-konsistenter Share-Image-Render.
  const unit   = _distanceUnit();
  const per100 = _t("per100km", { unit: unit });

  // ── HEADER ────────────────────────────────────────────────────────────────
  _ct(ctx, _t("heroTitle"),           W/2, 240, "rgba(235,235,245,.85)", 44, 600);
  _ct(ctx, _t("shareImgSubCompare"),  W/2, 296, "rgba(235,235,245,.40)", 26, 500);
  ctx.fillStyle = "rgba(235,235,245,.08)";
  ctx.fillRect(W/2 - 120, 336, 240, 1);

  // ── MAIN VALUES ───────────────────────────────────────────────────────────
  const kmDisp = Math.round(Math.max(0, _kmToDist(kmEv))).toLocaleString(_currentLocale());
  const kmLbl  = kmDisp + " " + unit;
  const evMain = ridesharing ? eAutoPerPerson      : eAutoTotal;
  const vbMain = ridesharing ? verbrennerPerPerson : verbrennerTotal;
  const subTxt = ridesharing ? _t("shareImgPerPersonCtx", { km: kmLbl }) : kmLbl;

  _ct(ctx, _t("typeEv"),           W/2, 500, "rgba(10,132,255,.85)",   38, 600);
  _ct(ctx, _fmtMoney(evMain, 2),   W/2, 618, "#ffffff",                140, 800);
  _ct(ctx, subTxt,                 W/2, 676, "rgba(235,235,245,.50)",  26, 500);

  _ct(ctx, _t("typeVb"),           W/2, 840, "rgba(255,159,10,.85)",   38, 600);
  _ct(ctx, _fmtMoney(vbMain, 2),   W/2, 958, "#ffffff",                140, 800);
  _ct(ctx, subTxt,                 W/2, 1016,"rgba(235,235,245,.50)",  26, 500);

  // ── DIFFERENCE ────────────────────────────────────────────────────────────
  if (Math.abs(diffSig) > 0.005) {
    const val = ridesharing ? savingsPerPerson : savingsTotal;
    const label = diffSig >= 0 ? _t("shareImgSavings") : _t("shareImgDiff");
    const suffix = ridesharing ? " " + _t("sharePerPersonSuffix") : "";
    _ct(ctx, `${label}: ${_fmtMoney(val, 2)}${suffix}`,
        W/2, 1150, "rgba(235,235,245,.82)", 34, 600);
  }

  // ── RIDESHARE CONTEXT ─────────────────────────────────────────────────────
  let ctxY = 1230;
  if (ridesharing) {
    _ct(ctx, _t("rideshareLine", { n: persons }),
        W/2, ctxY, "rgba(235,235,245,.58)", 26, 500);
    _ct(ctx, _t("shareImgTotalCostsBoth", { ev: _fmtMoney(eAutoTotal, 2), vb: _fmtMoney(verbrennerTotal, 2) }),
        W/2, ctxY + 42, "rgba(235,235,245,.40)", 22, 500);
  }

  // ── COST PER 100 (Markt-Einheit) ──────────────────────────────────────────
  _ct(ctx, `${_t("typeEv")}: ${_fmtMoney(_costPer100ToMarket(evCost), 2)} ${per100}`,
      W/2, 1430, "rgba(235,235,245,.65)", 26, 500);
  _ct(ctx, `${_t("typeVb")}: ${_fmtMoney(_costPer100ToMarket(vbCost), 2)} ${per100}`,
      W/2, 1474, "rgba(235,235,245,.65)", 26, 500);

  // ── QUALIFIED RESULT SENTENCE (single line, auto-shrink to fit) ───────────
  _ctFitLine(ctx, _resultSentence(d, "compare", "share"),
      W/2, 1640, "rgba(235,235,245,.78)", 26, 500, 980, 18);

  // ── DISCLAIMER + SITE ─────────────────────────────────────────────────────
  _ct(ctx, _t("shareImgDisclaimer"),
      W/2, 1720, "rgba(235,235,245,.38)", 20, 400);
  _ct(ctx, "www.evspend.com",
      W/2, 1772, "rgba(235,235,245,.50)", 24, 600);
}

// ── Single 9:16 (1080×1920) — premium, neutral, clean (konsumiert unified result)
function _drawSingle9x16(ctx, d) {
  const W = 1080, H = 1920;
  const {
    isEv, km, costPer100, monthlyCost,
    ridesharing, persons, costPerPerson
  } = d;
  const accent = isEv ? "rgba(10,132,255,.85)" : "rgba(255,159,10,.85)";

  _drawBg(ctx, W, H);
  _drawGlowDual(ctx, W, H);

  // Phase 11: markt-/sprach-konsistenter Share-Image-Render.
  const unit   = _distanceUnit();
  const per100 = _t("per100km", { unit: unit });

  // ── HEADER ────────────────────────────────────────────────────────────────
  _ct(ctx, isEv ? _t("typeEv") : _t("typeVb"),
      W/2, 240, "rgba(235,235,245,.85)", 44, 600);
  _ct(ctx, _t("shareImgSubSingle"),
      W/2, 296, "rgba(235,235,245,.40)", 26, 500);
  ctx.fillStyle = "rgba(235,235,245,.08)";
  ctx.fillRect(W/2 - 120, 336, 240, 1);

  // ── MAIN VALUE ────────────────────────────────────────────────────────────
  const mainVal = ridesharing ? costPerPerson : monthlyCost;
  const kmDisp  = Math.round(Math.max(0, _kmToDist(km))).toLocaleString(_currentLocale());
  const kmLbl   = kmDisp + " " + unit;
  const subTxt  = ridesharing
    ? _t("shareImgPerPersonCtx", { km: kmLbl })
    : _t("shareImgCostFor",      { km: kmLbl });

  _ct(ctx, _fmtMoney(mainVal, 2),  W/2, 820, "#ffffff",                170, 800);
  _ct(ctx, subTxt,                 W/2, 892, "rgba(235,235,245,.55)",  28, 500);
  ctx.fillStyle = accent;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(W/2 - 60, 940, 120, 4, 2); ctx.fill();
  } else {
    ctx.fillRect(W/2 - 60, 940, 120, 4);
  }

  // ── RIDESHARE CONTEXT ─────────────────────────────────────────────────────
  let ctxY = 1110;
  if (ridesharing) {
    _ct(ctx, _t("rideshareLine", { n: persons }),
        W/2, ctxY, "rgba(235,235,245,.58)", 26, 500);
    _ct(ctx, _t("shareImgTotalCosts", { val: _fmtMoney(monthlyCost, 2) }),
        W/2, ctxY + 42, "rgba(235,235,245,.40)", 22, 500);
  }

  // ── COST PER 100 (Markt-Einheit) ──────────────────────────────────────────
  const unitTxt = isEv ? _t("typeEv") : _t("typeVb");
  _ct(ctx, `${unitTxt}: ${_fmtMoney(_costPer100ToMarket(costPer100), 2)} ${per100}`,
      W/2, 1450, "rgba(235,235,245,.65)", 26, 500);

  // ── QUALIFIED RESULT SENTENCE (single line, auto-shrink to fit) ───────────
  _ctFitLine(ctx, _resultSentence(d, "single", "share"),
      W/2, 1640, "rgba(235,235,245,.78)", 26, 500, 980, 18);

  // ── DISCLAIMER + SITE ─────────────────────────────────────────────────────
  _ct(ctx, _t("shareImgDisclaimer"),
      W/2, 1720, "rgba(235,235,245,.38)", 20, 400);
  _ct(ctx, "www.evspend.com",
      W/2, 1772, "rgba(235,235,245,.50)", 24, 600);
}

// ── Image share ───────────────────────────────────────────────────────────────
function _downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  eafToast(_t("toastImageReady"), "var(--green)");
}

// ── Text share ───────────────────────────────────────────────────────────────
// Central, legally qualified result sentence. Used by share text + share image.
// Reads only fields already on the unified data object — no new math.
// perspective: "user" (default) → "Du sparst…" / "Deine Kosten…"
//              "share"          → "Ich spare…" / "Meine Kosten…"  (DE only; EN/TR mirror)
function _resultSentence(d, mode, perspective) {
  const isShare = perspective === "share";
  const km     = (mode === "single") ? d.km : d.kmEv;
  const kmStr  = fmt(_kmToDist(km), 0) + " " + _distanceUnit();
  const carpool = d.ridesharing === true;
  const k = (base) => (isShare ? "share" : "sentence") + base;

  // Long-term mode (compare only): use dedicated sentence, skip per-trip values.
  if (mode === "compare" && longtermActive) {
    return _t(k("CompareLongterm"));
  }

  // Single + carpool: dedicated full sentence (no suffix appended).
  if (mode === "single" && carpool) {
    return _t(k("SingleCarpool"), { val: _fmtMoney(d.costPerPerson, 2), km: kmStr });
  }

  let sentence;
  if (mode === "single") {
    sentence = _t(k("Single"), { val: _fmtMoney(d.totalCost, 2), km: kmStr });
  } else {
    const sig = d.diffSig;
    const valRaw = carpool ? d.savingsPerPerson : d.savingsTotal;
    if (Math.abs(sig) <= 0.005) {
      sentence = _t(k("CompareEqual"), { km: kmStr });
    } else if (sig > 0) {
      sentence = _t(k("CompareSavings"), { val: _fmtMoney(valRaw, 2), km: kmStr });
    } else {
      sentence = _t(k("CompareExtra"),   { val: _fmtMoney(valRaw, 2), km: kmStr });
    }
  }
  // Compare + carpool: append per-person count suffix.
  if (mode === "compare" && carpool) {
    sentence += " " + _t("sentenceCarpoolSuffix", { n: d.persons });
  }
  return sentence;
}

// Phase B/C: Marketing-Style Share-Texte (multi-line, Markt-/Sprach-aware).
// {value}, {ev_value}, {ice_value}, {savings} sind Locale-Zahlen ohne Währung;
// Templates fügen explizit € (DE/TR) bzw. {currency} (EN) ein.
// Phase C: Fahrgemeinschaft-Zeile wird vor dem CTA injiziert wenn aktiv.
function _injectRideshareLine(text, d, perPerson) {
  if (!d || !d.ridesharing || !(d.persons > 1)) return text;
  const line = _t("shareRideshareLine", {
    n: d.persons,
    perPerson: fmt(perPerson, 2),
    currency: _currencySymbol()
  });
  const lines = text.split("\n");
  // Insert before last line (the CTA).
  lines.splice(lines.length - 1, 0, line);
  return lines.join("\n");
}
function buildShareTextSingle(d) {
  const kmDisp = Math.round(Math.max(0, _kmToDist(d.km))).toLocaleString(_currentLocale());
  const key = d.isEv ? "shareTextSingleEv" : "shareTextSingleVb";
  const text = _t(key, {
    km: kmDisp,
    value: fmt(d.totalCost, 2),
    currency: _currencySymbol()
  });
  // Single: Pro-Person-Wert sind die Kosten/Person.
  return _injectRideshareLine(text, d, d.costPerPerson);
}
function buildShareTextCompare(d) {
  const kmDisp = Math.round(Math.max(0, _kmToDist(d.kmEv))).toLocaleString(_currentLocale());
  const text = _t("shareTextCompare", {
    km: kmDisp,
    ev_value:  fmt(d.eAutoTotal, 2),
    ice_value: fmt(d.verbrennerTotal, 2),
    savings:   fmt(Math.abs(d.savingsTotal), 2),
    currency:  _currencySymbol()
  });
  // Compare: Pro-Person-Wert ist die Ersparnis/Person.
  return _injectRideshareLine(text, d, Math.abs(d.savingsPerPerson || 0));
}
async function shareText() {
  // Vor Share: UI erzwingen, damit UI = Share = Calc identisch sind.
  calc();
  let text, title;
  if (appMode === "single") {
    const data = _getSingleData();
    if (!data) { eafToast(_t("toastCalcFirst")); return; }
    _assertShareSafe(data);
    text = buildShareTextSingle(data);
    title = (data.isEv ? _t("typeEv") : _t("typeVb")) + " – " + _t("shareImgSubSingle");
  } else {
    const data = _getCompareData();
    if (!data) { eafToast(_t("toastCalcFirst")); return; }
    _assertShareSafe(data);
    text = buildShareTextCompare(data);
    title = _t("shareCompareTitle");
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    eafToast(_t("toastClipboard"), "var(--green)");
  } catch (_) {
    eafToast(_t("toastShareFailed"));
  }
}

function shareImageCanvas() {
  // Vor Share: UI erzwingen, damit UI = Share = Calc identisch sind.
  calc();
  const cvs = document.createElement("canvas");
  cvs.width  = 1080;
  cvs.height = 1920;
  const ctx = cvs.getContext("2d");
  let title;
  if (appMode === "single") {
    const data = _getSingleData();
    if (!data) { eafToast(_t("toastCalcFirst")); return; }
    _assertShareSafe(data);
    _drawSingle9x16(ctx, data);
    title = (data.isEv ? _t("typeEv") : _t("typeVb")) + " – " + _t("shareImgSubSingle");
  } else {
    const data = _getCompareData();
    if (!data) { eafToast(_t("toastCalcFirst")); return; }
    _assertShareSafe(data);
    _drawCompare9x16(ctx, data);
    title = _t("shareCompareTitle");
  }
  cvs.toBlob(blob => {
    if (!blob) { eafToast(_t("toastImageError")); return; }
    const file = new File([blob], "evspend.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title }).catch(err => {
        if (err?.name !== "AbortError") _downloadBlob(blob, "evspend.png");
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evspend.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, "image/png");
}

// ── Toast ────────────────────────────────────────────────────────────────────
function eafToast(msg, color) {
  let t = document.getElementById("eaf-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "eaf-toast";
    t.setAttribute("role", "alert");
    t.setAttribute("aria-live", "assertive");
    t.style.cssText = "position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);color:#fff;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:300;opacity:0;transition:opacity .2s;pointer-events:none;max-width:85%;text-align:center;";
    document.body.appendChild(t);
  }
  t.style.background = color || "var(--red)";
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = "0"; }, 2600);
}

// ── Validation + FAB ─────────────────────────────────────────────────────────
function eafMissing() {
  const ids = [];
  const check = id => { const v = parseFloat($(id).value); if (!isFinite(v) || v <= 0) ids.push(id); };
  if (appMode === "single") {
    if (singleType === "ev") ["kmEv","evVerbrauch","strompreis"].forEach(check);
    else                     ["kmVb","verbrauchVerbrenner","benzinpreis"].forEach(check);
  } else {
    ["kmShared","evVerbrauch","strompreis","benzinpreis","verbrauchVerbrenner"].forEach(check);
  }
  return ids;
}

function eafFlash(ids) {
  ids.forEach(id => {
    const el  = $(id); if (!el) return;
    const row = el.closest(".qc-row") || el.closest(".list-row");
    if (row && row.animate) {
      row.animate(
        [{ backgroundColor: "rgba(255,59,48,.18)" }, { backgroundColor: "transparent" }],
        { duration: 900, easing: "ease-out" }
      );
    }
  });
}

function _revealShareHint() {
  const hint = document.getElementById("shareHint");
  const imgBtn = document.getElementById("qImgBtn");
  const txtBtn = document.getElementById("qTxtBtn");
  if (!hint || (!imgBtn && !txtBtn)) return;
  const hasData = appMode === "single" ? !!_getSingleData() : !!_getCompareData();
  if (!hasData) return;
  setTimeout(() => {
    const stillValid = appMode === "single" ? !!_getSingleData() : !!_getCompareData();
    if (!stillValid) return;
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("show"));
    [imgBtn, txtBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.remove("qc-btn--share-glow");
      void btn.offsetWidth;
      btn.classList.add("qc-btn--share-glow");
    });
  }, 1000);
}

// ── Slider live values + fill ────────────────────────────────────────────────
// Phase 5/6/9: Preis-Echos nutzen aktives Markt-Symbol, Zahlen nutzen aktive
// Markt-Locale (de-DE, en-US, tr-TR). Einheiten folgen dem Markt:
//   DE/TR → km, L/100 km, kWh/100 km, €/L bzw. ₺/L
//   US    → mi, mpg,       kWh/100 mi, $/gallon
// Raw-Slider-Werte stehen bereits in Markt-Einheiten; die Konversion nach
// metrisch findet in n() statt (für die Rechnung).
const SLIDER_FMT = {
  kmShared:            v => Math.round(v).toLocaleString(_currentLocale()) + " " + _distanceUnit(),
  kmEv:                v => Math.round(v).toLocaleString(_currentLocale()) + " " + _distanceUnit(),
  kmVb:                v => Math.round(v).toLocaleString(_currentLocale()) + " " + _distanceUnit(),
  evVerbrauch:         v => v.toLocaleString(_currentLocale(), {minimumFractionDigits:1, maximumFractionDigits:1}) + " " + _evEffUnit(),
  verbrauchVerbrenner: v => {
    // US: mpg sind Integer (ganze Zahl); DE/TR: L/100 km mit 1 Dezimalstelle.
    if (_isUsMarket()) return Math.round(v).toLocaleString(_currentLocale()) + " " + _iceEffUnit();
    return v.toLocaleString(_currentLocale(), {minimumFractionDigits:1, maximumFractionDigits:1}) + " " + _iceEffUnit();
  },
  strompreis:          v => v.toLocaleString(_currentLocale(), {minimumFractionDigits:2, maximumFractionDigits:2}) + " " + _currencySymbol() + "/kWh",
  benzinpreis:         v => v.toLocaleString(_currentLocale(), {minimumFractionDigits:2, maximumFractionDigits:2}) + " " + _currencySymbol() + "/" + _fuelVolumeUnit(),
  batteryKwh:          v => Math.round(v).toLocaleString(_currentLocale()) + " kWh",
  ridesharePersons:    v => Math.round(v).toString(),
  kmMonat:             v => Math.round(v).toLocaleString(_currentLocale()) + " " + _distanceUnit(),
};
// Maps slider IDs to their i18n label key — used for screen-reader announcements.
const SLIDER_LABEL_KEY = {
  kmShared:            "labelKilometer",
  kmEv:                "labelKilometer",
  kmVb:                "labelKilometer",
  evVerbrauch:         "labelEvConsumption",
  verbrauchVerbrenner: "labelIceConsumption",
  strompreis:          "labelElectricityPrice",
  benzinpreis:         "labelGasPrice",
  batteryKwh:          "labelBatterySize",
  ridesharePersons:    "labelPersons",
  kmMonat:             "labelKmPerMonth",
  longtermYears:       "longtermPeriod",
  longtermPremium:     "longtermPremiumLabel",
};
function _updateSliderVal(id) {
  const el = $(id); const valEl = $(id + "V"); const fmtFn = SLIDER_FMT[id];
  if (!el || !valEl || !fmtFn) return;
  const v = parseFloat(el.value);
  if (isFinite(v)) {
    const txt = fmtFn(v);
    valEl.textContent = txt;
    // a11y: aria-valuetext mirrors the visible value (e.g. "17,0 kWh/100 km")
    el.setAttribute("aria-valuetext", txt);
  }
}
// Writes a single sentence into the polite live region for screen-reader users.
// Triggered on `change` (not `input`) so dragging doesn't spam announcements.
function _announceSlider(id) {
  const el = $(id); const valEl = $(id + "V");
  if (!el || !valEl) return;
  const announcer = $("sliderAnnouncer");
  if (!announcer) return;
  const labelKey = SLIDER_LABEL_KEY[id];
  const label = labelKey ? _t(labelKey) : id;
  announcer.textContent = _t("srSliderSetTo", { label: label, value: valEl.textContent });
}
function _updateSliderFill(el) {
  if (!el || el.type !== "range") return;
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 100;
  const val = parseFloat(el.value);
  if (!isFinite(val) || max === min) return;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  el.style.setProperty("--p", pct + "%");
}
function refreshSliderValues() { Object.keys(SLIDER_FMT).forEach(_updateSliderVal); }
function refreshSliderFills()  { Object.keys(SLIDER_FMT).forEach(id => _updateSliderFill($(id))); }
Object.keys(SLIDER_FMT).forEach(id => {
  const el = $(id); if (!el) return;
  const handler = () => {
    _updateSliderVal(id);
    _updateSliderFill(el);
    if (id === "batteryKwh" || id === "evVerbrauch") updateRangeDisplay();
  };
  el.addEventListener("input", handler);
  // a11y: announce final value on `change` (drag-end / keyboard-step / commit).
  el.addEventListener("change", () => _announceSlider(id));
  // Initial slider paint without touching translation-dependent UI.
  // updateRangeDisplay runs in initApp() once i18n is ready.
  _updateSliderVal(id);
  _updateSliderFill(el);
});

// ── Init ─────────────────────────────────────────────────────────────────────
// initApp() is called from the i18n IIFE's init() once applyTranslations()
// has run — guarantees all _t() calls resolve on first paint.
function initApp() {
  try { applyMode(); } catch (_) {}
  try { applyRideshare(); } catch (_) {}
  try { applyLongterm(); } catch (_) {}
  // Skip initial calc(): empty-state stays visible until first user interaction.
  // First input/slider event will trigger calc() and render the result.
  try { updateRangeDisplay(); } catch (_) {}
}

// ── PWA: Device detection ───────────────────────────────────────────────────
const PWA = (() => {
  const ua = navigator.userAgent;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS     = /iphone|ipod/i.test(ua);
  const isIPad    = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isCriOS   = /crios/i.test(ua);
  const isFxiOS   = /fxios/i.test(ua);
  const isSafari  = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChrome  = /chrome/i.test(ua) && !/edg|opr\//i.test(ua);
  const isMobile  = isIOS || isIPad || isAndroid || /mobile/i.test(ua);
  const isIOSSafari = (isIOS || isIPad) && isSafari && !isCriOS && !isFxiOS;
  const platform =
    isStandalone          ? 'standalone' :
    isIOSSafari           ? 'ios'        :
    isAndroid             ? 'android'    :
    !isMobile             ? 'desktop'    : 'other';
  return { isStandalone, isIOSSafari, isAndroid, isChrome, isMobile, platform };
})();

// ── PWA: Storage ────────────────────────────────────────────────────────────
const _PWA_VISITS_KEY    = 'eaf.pwa.visits';
const _PWA_DISMISSED_KEY = 'eaf.pwa.dismissed'; // permanent (X / installed)
const _PWA_SNOOZE_KEY    = 'eaf.pwa.snooze';    // timestamp (Später → 24h)
const _PWA_SNOOZE_MS     = 24 * 60 * 60 * 1000;

const _pwaVisits = (() => {
  const v = parseInt(localStorage.getItem(_PWA_VISITS_KEY) || '0', 10) + 1;
  try { localStorage.setItem(_PWA_VISITS_KEY, String(v)); } catch(e) {}
  return v;
})();

// ── PWA: State ──────────────────────────────────────────────────────────────
let _deferredPrompt = null;
let _pwaBarShown    = false;
let _pwaPopupShown  = false;
let _pwaWired       = false;
let _pwaAutoFired   = false;

function _pwaCanShow() {
  if (PWA.isStandalone) return false;
  if (PWA.platform === 'other') return false;
  if (localStorage.getItem(_PWA_DISMISSED_KEY) === '1') return false;
  const snoozeUntil = parseInt(localStorage.getItem(_PWA_SNOOZE_KEY) || '0', 10);
  if (Date.now() < snoozeUntil) return false;
  if (_pwaVisits < 2) return false;
  return true;
}

// ── PWA: Device-specific steps ──────────────────────────────────────────────
// Phase J Sprint 1 (F5.2): step copy is i18n-driven via _t(). Each translation
// returns a small HTML snippet (with <strong>) that we render through
// innerHTML on a span. Safe because the source is the in-app translations
// object (no user input flows into these strings).
function _pwaBuildSteps(platform) {
  const sets = {
    ios:     ['pwaStepIosShare', 'pwaStepIosHome', 'pwaStepIosAdd'],
    android: ['pwaStepAndroidMenu', 'pwaStepAndroidInstall'],
    desktop: ['pwaStepDesktopMenu', 'pwaStepDesktopInstall'],
  };
  const keys = sets[platform] || sets.desktop;
  const frag = document.createDocumentFragment();
  keys.forEach((key, i) => {
    const row = document.createElement('div');
    row.className = 'pwa-popup-step';
    const num = document.createElement('span');
    num.className = 'pwa-popup-step-num';
    num.textContent = String(i + 1);
    const body = document.createElement('span');
    body.innerHTML = _t(key);
    row.appendChild(num);
    row.appendChild(body);
    frag.appendChild(row);
  });
  return frag;
}

// ── PWA: Storage actions ────────────────────────────────────────────────────
function _pwaSnooze() {
  try { localStorage.setItem(_PWA_SNOOZE_KEY, String(Date.now() + _PWA_SNOOZE_MS)); } catch(e) {}
}
function _pwaPersistDismiss() {
  try { localStorage.setItem(_PWA_DISMISSED_KEY, '1'); } catch(e) {}
}

// ── PWA: Bar (stage 1) ──────────────────────────────────────────────────────
function pwaShowBar() {
  if (_pwaBarShown || _pwaPopupShown) return;
  const bar = document.getElementById('pwaBar');
  if (!bar) return;
  bar.classList.add('visible');
  bar.removeAttribute('aria-hidden');
  _pwaBarShown = true;
}

function pwaHideBar() {
  const bar = document.getElementById('pwaBar');
  if (!bar) return;
  bar.classList.remove('visible');
  bar.setAttribute('aria-hidden', 'true');
  _pwaBarShown = false;
}

function pwaBarLater() { _pwaSnooze(); pwaHideBar(); }
function pwaBarClose() { _pwaPersistDismiss(); pwaHideBar(); }

// Bar → Popup. IMPORTANT: kept sync so the user-gesture chain stays valid
// when "Alles klar" later calls _deferredPrompt.prompt() in the popup.
function pwaBarInstall() {
  pwaHideBar();
  pwaShowPopup();
}

// ── PWA: Popup (stage 2) ────────────────────────────────────────────────────
function pwaShowPopup() {
  if (_pwaPopupShown) return;
  const el      = document.getElementById('pwaPopup');
  const stepsEl = document.getElementById('pwaPopupSteps');
  if (!el || !stepsEl) return;

  stepsEl.replaceChildren(_pwaBuildSteps(PWA.platform));

  el.classList.add('visible');
  el.removeAttribute('aria-hidden');
  _pwaPopupShown = true;
}

function pwaHidePopup() {
  const el = document.getElementById('pwaPopup');
  if (!el) return;
  el.classList.remove('visible');
  el.setAttribute('aria-hidden', 'true');
  _pwaPopupShown = false;
}

function pwaPopupLater() { _pwaSnooze(); pwaHidePopup(); }
function pwaPopupClose() { _pwaPersistDismiss(); pwaHidePopup(); }

// "Alles klar" — triggers native install prompt if available,
// otherwise just closes (steps are already visible for manual install)
function pwaPopupConfirm() {
  if (_deferredPrompt) {
    const p = _deferredPrompt;
    _deferredPrompt = null;
    try {
      p.prompt();
      p.userChoice.then(choice => {
        if (choice && choice.outcome === 'accepted') {
          _pwaPersistDismiss();
          pwaHidePopup();
        } else {
          _pwaSnooze();
          pwaHidePopup();
        }
      }).catch(() => { _pwaSnooze(); pwaHidePopup(); });
    } catch(e) {
      _pwaSnooze();
      pwaHidePopup();
    }
    return;
  }
  // No native prompt (iOS / Firefox etc.): soft-dismiss; steps were shown
  _pwaSnooze();
  pwaHidePopup();
}

// ── PWA: Wiring (idempotent, one-time) ──────────────────────────────────────
function _pwaWire() {
  if (_pwaWired) return;
  _pwaWired = true;

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  // Bar
  bind('pwaBarInstall', pwaBarInstall);
  bind('pwaBarLater',   pwaBarLater);
  bind('pwaBarClose',   pwaBarClose);
  // Popup
  bind('pwaPopupAdd',      pwaPopupConfirm);
  bind('pwaPopupLater',    pwaPopupLater);
  bind('pwaPopupClose',    pwaPopupClose);
  bind('pwaPopupBackdrop', pwaPopupLater);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (_pwaPopupShown) pwaPopupLater();
    else if (_pwaBarShown) pwaBarLater();
  });
}
_pwaWire();

// ── PWA: Browser events ─────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  _deferredPrompt = null;
  _pwaPersistDismiss();
  pwaHidePopup();
  pwaHideBar();
});

// ── PWA: Auto-trigger bar (once per load, 7s delay) ─────────────────────────
setTimeout(() => {
  if (_pwaAutoFired) return;
  _pwaAutoFired = true;
  if (!_pwaCanShow()) return;
  pwaShowBar();
}, 7000);

// ── DOM event wiring (replaces legacy inline on* handlers) ──────────────────
(function wireDom() {
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

  on("qImgBtn",     "click", shareImageCanvas);
  on("qSaveBtn",    "click", saveEntrySafe);
  on("qVerlaufBtn", "click", () => { location.href = "./verlauf.html"; });
  on("resetBtn",    "click", confirmReset);

  on("modeCompareBtn", "click", () => setMode("compare"));
  on("modeSingleBtn",  "click", () => setMode("single"));
  on("typeEvBtn",      "click", () => setType("ev"));
  on("typeVbBtn",      "click", () => setType("vb"));

  on("qTxtBtn",        "click", shareText);

  const rsToggle = $("rideshareToggle");
  if (rsToggle) {
    rsToggle.checked = rideshareActive;
    rsToggle.addEventListener("change", () => setRideshareActive(rsToggle.checked));
  }
  const rsSlider = $("ridesharePersons");
  if (rsSlider) {
    rsSlider.value = String(ridesharePersons);
    rsSlider.addEventListener("input", () => {
      const v = parseInt(rsSlider.value, 10);
      setRidesharePersons(v);
    });
  }

  const ltToggle = $("longtermToggle");
  if (ltToggle) {
    ltToggle.checked = longtermActive;
    ltToggle.addEventListener("change", () => setLongtermActive(ltToggle.checked));
  }
  const ltSwitch = $("ltSwitchBtn");
  if (ltSwitch) {
    ltSwitch.addEventListener("click", () => {
      if (ltSwitch.disabled) return;
      setLongtermActive(false);
      const tog = $("longtermToggle");
      if (tog) tog.checked = false;
    });
  }
  const ltYears = $("longtermYears");
  if (ltYears) {
    ltYears.value = String(longtermYears);
    ltYears.addEventListener("input", () => {
      const v = parseInt(ltYears.value, 10);
      setLongtermYears(v);
      _updateSliderFill(ltYears);
    });
    ltYears.addEventListener("change", () => _announceSlider("longtermYears"));
  }
  const ltPrem = $("longtermPremium");
  if (ltPrem) {
    ltPrem.value = String(longtermPremium);
    ltPrem.addEventListener("input", () => {
      const v = parseInt(ltPrem.value, 10);
      setLongtermPremium(v);
      _updateSliderFill(ltPrem);
    });
    ltPrem.addEventListener("change", () => _announceSlider("longtermPremium"));
  }
  const ltKmMon = $("kmMonat");
  if (ltKmMon) {
    ltKmMon.value = String(kmMonat);
    ltKmMon.addEventListener("input", () => {
      const v = parseInt(ltKmMon.value, 10);
      setKmMonat(v);
      _updateSliderFill(ltKmMon);
    });
  }

  // Phase 2 + 5: bei Währungswechsel das komplette sichtbare Geld-Rendering
  // neu anstoßen. Phase 5 ergänzt die Slider-Echos (strompreis, benzinpreis,
  // longtermPremium) sowie das Langzeit-Premium-Echo, damit das Symbol live
  // umspringt (€ ↔ ₺), ohne dass Slider-Werte selbst angefasst werden.
  document.addEventListener("eaf:currencychange", () => {
    try { refreshSliderValues(); } catch (_) {}
    try { applyLongterm(); } catch (_) {}
    try { calc(); } catch (_) {}
  });
  // Phase 7: bei Sprach-/Marktwechsel alle dynamischen JS-Texte neu rendern
  // (z. B. Jahr/Jahre-Suffix, Range-Display, Longterm-Break-Even).
  document.addEventListener("eaf:languagechange", () => {
    try { refreshSliderValues(); } catch (_) {}
    try { applyLongterm(); } catch (_) {}
    try { updateRangeDisplay(); } catch (_) {}
    try { calc(); } catch (_) {}
  });
})();

/* ═══════════════════════════════════════════════════════════════════════
   i18n + Currency System (Phase 1 — prepare only, non-destructive)
   — Adds translation + currency-format helpers.
   — Does NOT modify existing calculation logic, result rendering, or
     history behavior. Existing German UI texts remain as fallback when
     a key is missing or translations aren't applied yet.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LANG_KEY = "eaf.language";
  var CURR_KEY = "eaf.currency";
  // Phase 6: Einzel-Schlüssel für den gewählten Markt (führt ab jetzt die Wahrheit).
  var MARKET_KEY = "eaf.market";

  var translations = {
    de: {
      heroTitle: "E-Auto vs. Verbrenner",
      heroSubtitle1: "Kosten",
      heroSubtitle2: "im direkten Vergleich",
      trustNoSignup: "Ohne Anmeldung",
      trustLocal: "Lokal gespeichert",
      disclaimer: "Basierend auf Durchschnittswerten. Ergebnisse können je nach Fahrweise, Strommix und Fahrzeug variieren. Wartung, Versicherung und Abschreibung sind nicht enthalten.",
      brandTagline: "Vergleich basierend auf deinen Eingaben",
      modeSingle: "Einzelberechnung",
      modeCompare: "Vergleich",
      typeEv: "E-Auto",
      typeVb: "Verbrenner",
      quickCalc: "Schnellrechner",
      sectionMileage: "Strecke",
      sectionEv: "E-Auto",
      sectionVb: "Verbrenner",
      labelKilometer: "Kilometer",
      labelKilometerUs: "Meilen",
      labelConsumption: "Verbrauch",
      labelEvConsumption: "Stromverbrauch",
      labelIceConsumption: "Spritverbrauch",
      hintEvConsumption: "E-Autos: meist 15–20 kWh/100 km",
      hintEvConsumptionUs: "E-Autos: meist 25–35 kWh/100 mi",
      hintIceConsumption: "Verbrenner: meist 5–8 L/100 km",
      hintIceConsumptionUs: "Verbrenner: meist 20–30 mpg",
      labelElectricityPrice: "Strompreis",
      labelBatterySize: "Batteriekapazität",
      labelGasPrice: "Benzinpreis",
      labelPersons: "Personen",
      rangeHintText: "Theoretische Berechnung (Batterie ÷ Verbrauch). Reale Reichweite je nach Fahrweise, Klima und Topographie deutlich abweichend. Keine WLTP-Angabe.",
      streckeHint: "Einmalige Fahrt für direkten Vergleich",
      rideshareLabel: "Fahrgemeinschaft",
      rideshareHint: "Kosten werden auf alle Personen aufgeteilt.",
      longtermLabel: "Langzeitanalyse",
      calculate: "Ergebnis aktualisieren",
      staleHint: "Eingaben geändert – bitte Ergebnis aktualisieren",
      shareImage: "Als Bild teilen",
      shareText: "Als Text teilen",
      saveToHistory: "Im Verlauf speichern",
      showHistory: "Verlauf anzeigen",
      reset: "Zurücksetzen",
      backToCompare: "Zurück zum direkten Vergleich",
      noteLabel: "Notiz zur Fahrt (optional)",
      noteInlineLabel: "Notiz",
      notePlaceholder: "z. B. Pendelstrecke, Ausflug oder Fahrt nach Frankfurt",
      emptyCompareTitle: "Kostendifferenz erscheint nach Berechnung",
      emptySingleTitle: "Kosten erscheinen nach Berechnung",
      emptyCompareSub: "Werte eingeben – Ergebnis erscheint sofort.",
      yourCosts: "Deine Kosten",
      hintCompareFoot: "Basierend auf deinen Eingaben und Durchschnittswerten. Abweichungen sind möglich.",
      hintSingleFoot: "Basierend auf deinen Eingaben und Durchschnittswerten. Abweichungen sind möglich.",
      calcInfoBlock: "<h3>Hinweis zur Berechnung</h3><p>Die angezeigten Werte basieren auf deinen Eingaben und durchschnittlichen Annahmen. Tatsächliche Kosten können je nach Fahrweise, Fahrzeug, Energiepreisen und Nutzung abweichen.</p><p><strong>So wird berechnet:</strong><br>Kosten = Verbrauch × Preis × Strecke</p><p>Der Rechner dient zur Orientierung und stellt keine Garantie oder Beratung dar.</p>",
      footerImpressum: "Impressum",
      footerDatenschutz: "Datenschutz",
      footerTerms: "AGB",
      footerHinweise: "Hinweise zur Nutzung",
      footerBarrierefreiheit: "Barrierefreiheit",
      srSliderSetTo: "{label} auf {value} gesetzt",
      srResultUpdated: "Neues Ergebnis: {value}",
      // Phase P Sprint 2 (F4.8) — Slider-aria-Labels mit Fahrzeug-Kontext
      ariaKmShared: "Kilometer für beide Fahrzeuge",
      ariaKmEv: "E-Auto Kilometer",
      ariaKmVb: "Verbrenner Kilometer",
      footerVerlauf: "Verlauf",
      footerNote: "Herstellerneutraler Kostenvergleich. Keine Werbung. Daten lokal gespeichert.",
      privacyNotice: "Daten werden lokal im Browser gespeichert. Es erfolgt keine Übertragung an Server.",
      monthlyCosts: "Monatliche Kosten",
      yearlyCosts: "Jährliche Kosten",
      result: "Ergebnis",
      langMenuLabel: "Sprache",
      currMenuLabel: "Währung",
      marketMenuLabel: "Markt",
      marketDe: "Deutschland",
      marketEu: "Europa",
      marketUs: "USA",
      marketTr: "Türkei",
      // Phase 7 — dynamische Ergebnis-/Aktionstexte
      evCheaper: "E-Auto im Vorteil — laut deinen Eingaben",
      vbCheaper: "Verbrenner im Vorteil — laut deinen Eingaben",
      costsEqual: "Kosten identisch",
      savingsFor: "Du sparst auf {km}",
      extraCostFor: "Du zahlst mehr auf {km}",
      differenceFor: "Differenz für {km}",
      costForKm: "Kosten für {km}",
      costPerPerson: "Kosten pro Person",
      personsCount: "{n} Personen",
      personOne: "{n} Person",
      perPersonPrefix: "Pro Person ({n})",
      perPersonInactive: "Pro Person nicht aktiv",
      perPerson: "pro Person",
      persons: "Personen",
      costLabelEv: "Kosten E-Auto",
      costLabelVb: "Kosten Verbrenner",
      per100km: "/ 100 {unit}",
      rangeText: "Ca. {km} {unit} Reichweite",
      rangeEmpty: "Ca. — {unit} Reichweite",
      rideshareFallback: "Fahrgemeinschaft ({n} Personen)",
      rideshareLine: "Fahrgemeinschaft · {n} Personen",
      // Longterm
      breakevenAfter: "Break-Even nach ca. {years}",
      yearOne: "Jahr",
      yearOther: "Jahre",
      profitableNow: "Ab sofort günstiger",
      noBreakeven: "Kein Break-Even im gewählten Zeitraum",
      totalSavingsLabel: "Berechnete Differenz nach Break-Even: {val}",
      kmPerYearApprox: "≈ {km} {unit} pro Jahr",
      // Toasts + confirms
      toastSaveSingleOnly: "Nur Einzelberechnungen werden gespeichert",
      toastInvalidInput: "Bitte gültige Werte eingeben",
      toastSaved: "Im Verlauf gespeichert",
      toastSaveFailed: "Speichern nicht möglich",
      saveCooldown: "Bitte einen Moment warten — erneutes Speichern ist nach kurzer Pause wieder möglich.",
      toastCalcFirst: "Bitte zuerst berechnen",
      toastImageReady: "Bild bereit zum Teilen",
      toastClipboard: "In Zwischenablage kopiert",
      toastShareFailed: "Teilen nicht möglich",
      toastImageError: "Fehler beim Erstellen des Bildes",
      confirmReset: "Möchtest du wirklich alles zurücksetzen?",
      // Longterm-Sektion (Main-Page)
      longtermInfoHint: "Langzeitanalyse aktiv – Fokus auf Gesamtkosten über Zeit",
      labelKmPerMonth: "Monatliche Fahrleistung",
      longtermKmMonthHint: "Durchschnittliche Nutzung pro Monat",
      longtermKmWarn: "Sehr hohe monatliche Fahrleistung – Ergebnisse können stark von typischer Nutzung abweichen.",
      longtermPeriod: "Zeitraum",
      longtermPremiumLabel: "Kaufpreis E-Auto (Mehrkosten)",
      longtermRemainingPremium: "Verbleibender Mehrpreis",
      longtermAmortized: "Break-Even-Punkt im Zeitraum erreicht",
      longtermBeHint: "Basierend auf deiner monatlichen Fahrleistung",
      longtermLossHint: "Differenz nach Betriebskosten im gewählten Zeitraum",
      longtermDoneHint: "Berechnet auf Basis Ihrer Eingaben",
      longtermFootnote: "Nur Betriebskosten. Anschaffung als Mehrpreis berücksichtigt.",
      // Feedback-Toast-Hints (Inline-Divs unter CTAs)
      verlaufHintText: "Deine Kosten sind jetzt im Verlauf",
      shareHintText: "Teile dein Ergebnis als Bild",
      saveHintText: "Nur Einzelberechnungen werden gespeichert",
      noscriptText: "Diese App benötigt JavaScript. Bitte aktiviere JavaScript in deinem Browser.",
      // Phase J Sprint 1 (F5.1 + F5.2) — PWA install copy
      pwaClose: "Schließen",
      pwaBarText: "App installieren für schnelleren Zugriff?",
      pwaInstall: "Installieren",
      pwaLater: "Später",
      pwaPopupTitle: "Zum Home-Bildschirm",
      pwaPopupSub: "So geht’s auf deinem Gerät:",
      pwaPopupAdd: "Alles klar",
      pwaStepIosShare:       "Tippe auf <strong>Teilen</strong> unten in Safari",
      pwaStepIosHome:        "<strong>Zum Home-Bildschirm</strong> auswählen",
      pwaStepIosAdd:         "Oben rechts <strong>Hinzufügen</strong> tippen",
      pwaStepAndroidMenu:    "Tippe auf das <strong>Menü (⋮)</strong> oben rechts",
      pwaStepAndroidInstall: "<strong>App installieren</strong> auswählen",
      pwaStepDesktopMenu:    "Öffne das <strong>Browser-Menü</strong>",
      pwaStepDesktopInstall: "Wähle <strong>„App installieren“</strong>",
      footerCalc: "Rechner",
      chartAxisX: "Kilometer",
      chartAxisY: "Kosten ({symbol})",
      // Share text templates (mit Platzhaltern)
      shareEvCostHeader: "E-Auto Kosten ⚡",
      shareVbCostHeader: "Verbrenner Kosten ⛽",
      shareRoute: "📍 Strecke:",
      shareCosts: "💰 Kosten:",
      shareCostsPerPerson: "💰 Kosten pro Person:",
      shareAverage: "📊 Durchschnitt:",
      sharePer100: "pro 100 {unit}",
      shareTotal: "gesamt",
      shareGroupPersons: "👥 {n} Personen",
      shareForKm: "für {km}",
      shareEvLine: "⚡ E-Auto:",
      shareVbLine: "⛽ Verbrenner:",
      shareSavings: "💰 Ersparnis:",
      shareSavingsArrow: "👉 Ersparnis: {val} ({winner})",
      sharePerPersonSuffix: "pro Person",
      shareCompareTitle: "E-Auto vs. Verbrenner Vergleich",
      shareCompareEmoji: "E-Auto vs. Verbrenner 🚗⚡",
      shareTry: "Teste selbst 👉 www.evspend.com",
      shareTryCompare: "Teste selbst 👉 www.evspend.com",
      // Share-Image (Canvas-PNG) — neue Keys Phase 11
      shareImgSubCompare: "Kostenvergleich",
      shareImgSubSingle: "Kostenberechnung",
      shareImgSavings: "Ersparnis",
      shareImgDiff: "Unterschied",
      shareImgCostFor: "Kosten für {km}",
      shareImgPerPersonCtx: "pro Person · {km}",
      shareImgTotalCosts: "Gesamtkosten: {val}",
      shareImgTotalCostsBoth: "Gesamtkosten: {ev} / {vb}",
      shareImgDisclaimer: "Basierend auf Durchschnittswerten – Ergebnisse können variieren",
      // Result sentence (legally qualified, "you" perspective — used in result + share image)
      sentenceCompareSavings:  "Laut deiner Berechnung sparst du {val} auf {km}",
      sentenceCompareExtra:    "Laut deiner Berechnung ist der Verbrenner um {val} günstiger auf {km}",
      sentenceCompareEqual:    "Laut deiner Berechnung sind beide Optionen ähnlich teuer",
      sentenceCompareLongterm: "Laut deiner Berechnung: Kostenunterschied über den gewählten Zeitraum",
      sentenceSingle:          "Laut deiner Berechnung betragen deine Kosten {val} für {km}",
      sentenceSingleCarpool:   "Laut deiner Eingabe betragen die Kosten pro Person {val} für {km}",
      sentenceCarpoolSuffix:   "(pro Person, {n} Personen)",
      // Share-text variant ("I" perspective — used only in share text bodies)
      shareCompareSavings:     "Laut meiner Berechnung spare ich {val} auf {km}",
      shareCompareExtra:       "Laut meiner Berechnung ist der Verbrenner um {val} günstiger auf {km}",
      shareCompareEqual:       "Laut meiner Berechnung sind beide Optionen ähnlich teuer",
      shareCompareLongterm:    "Laut meiner Berechnung: Kostenunterschied über den gewählten Zeitraum",
      shareSingle:             "Laut meiner Berechnung betragen meine Kosten {val} für {km}",
      shareSingleCarpool:      "Laut meiner Eingabe betragen die Kosten pro Person {val} für {km}",
      // Phase B — Marketing-Share-Texte (multi-line, mit www.evspend.com CTA)
      shareTextSingleEv: "Mein E-Auto-Kostenvergleich:\nBei {km} km berechnet www.evspend.com\n{value} € Stromkosten.\nBerechne deinen eigenen Vergleich auf\nwww.evspend.com",
      shareTextSingleVb: "Meine Verbrenner-Kosten:\nBei {km} km berechnet www.evspend.com\n{value} € Spritkosten.\nBerechne deinen eigenen Vergleich auf\nwww.evspend.com",
      shareTextCompare:  "Mein Kostenvergleich E-Auto vs. Verbrenner:\nE-Auto: {ev_value} € | Verbrenner: {ice_value} €\nErsparnis: {savings} € auf {km} km\nBerechnet auf www.evspend.com",
      shareRideshareLine: "Fahrgemeinschaft {n} Personen: {perPerson} € pro Person",
      // Verlauf (für verlauf.html + verlauf.js)
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
      statsTotalKm: "Gesamt km",
      statsTotalCost: "Gesamt Kosten",
      statsAvgCost: "Ø Kosten / 100 km",
      statsAvgConsumption: "Ø Verbrauch",
      statsEmpty: "Noch keine Einzelberechnungen gespeichert",
      legacyLabel: "Alt-Einträge aus Vergleichsmodus",
      legacyClear: "Alt-Einträge löschen",
      clearAll: "Alle löschen",
      confirmClearAll: "Alle gespeicherten Einzelberechnungen löschen?",
      confirmClearLegacy: "Alle alten Vergleichs-Einträge löschen?",
      histEmptyNone: "Keine gespeicherten Einzelberechnungen",
      histEmptySearch: "Keine Einträge für diese Suche",
      histEntrySingular: "Eintrag",
      histEntryPlural: "Einträge",
      histEntryDelete: "Eintrag löschen",
      backToCalc: "Zurück zum Rechner",
      legacyBadge: "Vergleich (alt)",
      legacyDiffSuffix: "/ Jahr",
      verlaufFooterNote: "Gespeicherte Einträge bleiben nur lokal auf diesem Gerät.",
      chartToday: "Kosten heute",
      chartWeek:  "Kosten diese Woche",
      chartMonth: "Kosten diesen Monat",
      chartYear:  "Kosten dieses Jahr",
      chartAll:   "Gesamtkosten",
      chartAvgCost: "Durchschnittskosten"
    },
    en: {
      heroTitle: "EV vs. Combustion Engine",
      heroSubtitle1: "Costs",
      heroSubtitle2: "in direct comparison",
      trustNoSignup: "No sign-up",
      trustLocal: "Stored locally",
      disclaimer: "Calculation is based on average values. Energy, fuel consumption and efficiency may vary depending on driving style, temperature and vehicle. Maintenance, insurance and depreciation are not included.",
      brandTagline: "Comparison based on your inputs",
      modeSingle: "Single calculation",
      modeCompare: "Comparison",
      typeEv: "Electric",
      typeVb: "Combustion",
      quickCalc: "Quick calculator",
      sectionMileage: "Distance",
      sectionEv: "Electric",
      sectionVb: "Combustion",
      labelKilometer: "Kilometres",
      labelKilometerUs: "Miles",
      labelConsumption: "Efficiency",
      labelEvConsumption: "Electric efficiency",
      labelIceConsumption: "Fuel efficiency",
      hintEvConsumption: "Most EVs: 15–22 kWh/100 km",
      hintEvConsumptionUs: "Most EVs: 25–35 kWh/100 mi",
      hintIceConsumption: "Most cars: 5–8 L/100 km",
      hintIceConsumptionUs: "Most cars: 20–30 mpg",
      labelElectricityPrice: "Electricity cost",
      labelBatterySize: "Battery size",
      labelGasPrice: "Gas price",
      labelPersons: "People",
      rangeHintText: "Theoretical calculation (battery ÷ consumption). Real-world range varies significantly depending on driving style, climate and topography. Not a WLTP figure.",
      streckeHint: "Single trip for direct comparison",
      rideshareLabel: "Carpool",
      rideshareHint: "Costs are split among all people.",
      longtermLabel: "Long-term analysis",
      calculate: "Update results",
      staleHint: "Inputs changed – please update results",
      shareImage: "Share as image",
      shareText: "Share as text",
      saveToHistory: "Save to history",
      showHistory: "Show history",
      reset: "Reset",
      backToCompare: "Back to direct comparison",
      noteLabel: "Trip note (optional)",
      noteInlineLabel: "Note",
      notePlaceholder: "e.g. commute, trip or drive to the city",
      emptyCompareTitle: "Cost difference appears after calculation",
      emptySingleTitle: "Costs appear after calculation",
      emptyCompareSub: "Enter your data – result appears instantly.",
      yourCosts: "Your costs",
      hintCompareFoot: "Results are based on your inputs and average values. Actual results may vary.",
      hintSingleFoot: "Results are based on your inputs and average values. Actual results may vary.",
      calcInfoBlock: "<h3>Calculation Notice</h3><p>The displayed values are estimates based on your inputs and average assumptions. Actual costs may vary depending on driving style, vehicle, energy prices, and usage.</p><p><strong>How it's calculated:</strong><br>Cost = consumption × price × distance</p><p>This tool is for informational purposes only and does not constitute advice or guarantee.</p>",
      footerImpressum: "Imprint",
      footerDatenschutz: "Privacy",
      footerTerms: "Terms",
      footerHinweise: "Usage notes",
      footerBarrierefreiheit: "Accessibility",
      srSliderSetTo: "{label} set to {value}",
      srResultUpdated: "New result: {value}",
      // Phase P Sprint 2 (F4.8) — Slider aria-labels with vehicle context
      ariaKmShared: "Distance for both vehicles",
      ariaKmEv: "EV distance",
      ariaKmVb: "Combustion distance",
      footerVerlauf: "History",
      footerNote: "Manufacturer-neutral cost comparison · No advertising",
      privacyNotice: "Data is stored locally in your browser. No data is transmitted to servers.",
      monthlyCosts: "Monthly costs",
      yearlyCosts: "Yearly costs",
      result: "Result",
      langMenuLabel: "Language",
      currMenuLabel: "Currency",
      marketMenuLabel: "Market",
      marketDe: "Germany",
      marketEu: "Europe",
      marketUs: "USA",
      marketTr: "Türkiye",
      // Phase 7 — dynamic result/action texts
      evCheaper: "EV advantage — based on your inputs",
      vbCheaper: "ICE advantage — based on your inputs",
      costsEqual: "Costs identical",
      savingsFor: "You save on {km}",
      extraCostFor: "You pay more on {km}",
      differenceFor: "Difference for {km}",
      costForKm: "Cost for {km}",
      costPerPerson: "Cost per person",
      personsCount: "{n} people",
      personOne: "{n} person",
      perPersonPrefix: "Per person ({n})",
      perPersonInactive: "Per person inactive",
      perPerson: "per person",
      persons: "people",
      costLabelEv: "Electric cost",
      costLabelVb: "Combustion cost",
      per100km: "/ 100 {unit}",
      rangeText: "Estimated range: {km} {unit}",
      rangeEmpty: "Estimated range: {km} {unit}",
      rideshareFallback: "Carpool ({n} people)",
      rideshareLine: "Carpool · {n} people",
      // Longterm
      breakevenAfter: "Break-even after approx. {years}",
      yearOne: "year",
      yearOther: "years",
      profitableNow: "Profitable right away",
      noBreakeven: "No break-even within this period",
      totalSavingsLabel: "Calculated difference after break-even: {val}",
      kmPerYearApprox: "≈ {km} {unit} per year",
      // Toasts + confirms
      toastSaveSingleOnly: "Only single calculations can be saved",
      toastInvalidInput: "Please enter valid values",
      toastSaved: "Saved to history",
      toastSaveFailed: "Save failed",
      saveCooldown: "Please wait a moment — saving again is possible after a short pause.",
      toastCalcFirst: "Please calculate first",
      toastImageReady: "Image ready to share",
      toastClipboard: "Copied to clipboard",
      toastShareFailed: "Sharing failed",
      toastImageError: "Error creating image",
      confirmReset: "Do you really want to reset everything?",
      // Longterm section
      longtermInfoHint: "Long-term analysis active – focus on total cost over time",
      labelKmPerMonth: "Monthly mileage",
      longtermKmMonthHint: "Average usage per month",
      longtermKmWarn: "Very high monthly mileage – results may deviate significantly from typical usage.",
      longtermPeriod: "Period",
      longtermPremiumLabel: "EV purchase price (extra cost)",
      longtermRemainingPremium: "Remaining extra cost",
      longtermAmortized: "Break-even point reached in period",
      longtermBeHint: "Based on your monthly mileage",
      longtermLossHint: "Difference after operating costs over the selected period",
      longtermDoneHint: "Calculated based on your inputs",
      longtermFootnote: "Only operating costs. Purchase price considered as premium.",
      // Feedback hints
      verlaufHintText: "Your costs are now in history",
      shareHintText: "Share your result as an image",
      saveHintText: "Only single calculations are saved",
      noscriptText: "This app requires JavaScript. Please enable JavaScript in your browser.",
      // Phase J Sprint 1 (F5.1 + F5.2) — PWA install copy
      pwaClose: "Close",
      pwaBarText: "Install the app for faster access?",
      pwaInstall: "Install",
      pwaLater: "Later",
      pwaPopupTitle: "Add to Home Screen",
      pwaPopupSub: "Here’s how on your device:",
      pwaPopupAdd: "Got it",
      pwaStepIosShare:       "Tap <strong>Share</strong> at the bottom of Safari",
      pwaStepIosHome:        "Choose <strong>Add to Home Screen</strong>",
      pwaStepIosAdd:         "Tap <strong>Add</strong> in the top right",
      pwaStepAndroidMenu:    "Tap the <strong>menu (⋮)</strong> in the top right",
      pwaStepAndroidInstall: "Choose <strong>Install app</strong>",
      pwaStepDesktopMenu:    "Open the <strong>browser menu</strong>",
      pwaStepDesktopInstall: "Pick <strong>“Install app”</strong>",
      footerCalc: "Calculator",
      chartAxisX: "{unit}",
      chartAxisY: "Cost ({symbol})",
      // Share text
      shareEvCostHeader: "Electric cost ⚡",
      shareVbCostHeader: "Combustion cost ⛽",
      shareRoute: "📍 Route:",
      shareCosts: "💰 Cost:",
      shareCostsPerPerson: "💰 Cost per person:",
      shareAverage: "📊 Average:",
      sharePer100: "per 100 {unit}",
      shareTotal: "total",
      shareGroupPersons: "👥 {n} people",
      shareForKm: "for {km}",
      shareEvLine: "⚡ Electric:",
      shareVbLine: "⛽ Combustion:",
      shareSavings: "💰 Savings:",
      shareSavingsArrow: "👉 Savings: {val} ({winner})",
      sharePerPersonSuffix: "per person",
      shareCompareTitle: "Electric vs. Combustion comparison",
      shareCompareEmoji: "Electric vs. Combustion 🚗⚡",
      shareTry: "Try it yourself 👉 www.evspend.com",
      shareTryCompare: "Try it yourself 👉 www.evspend.com",
      // Share-Image (Canvas-PNG)
      shareImgSubCompare: "Cost comparison",
      shareImgSubSingle: "Cost calculation",
      shareImgSavings: "Savings",
      shareImgDiff: "Difference",
      shareImgCostFor: "Cost for {km}",
      shareImgPerPersonCtx: "per person · {km}",
      shareImgTotalCosts: "Total cost: {val}",
      shareImgTotalCostsBoth: "Total cost: {ev} / {vb}",
      shareImgDisclaimer: "Based on average values – results may vary",
      // Result sentence (legally qualified, used in result/share/share-image)
      sentenceCompareSavings:  "You save {val} based on your inputs over {km}",
      sentenceCompareExtra:    "The combustion vehicle is cheaper by {val} over {km} based on your inputs",
      sentenceCompareEqual:    "Both options are similarly priced based on your inputs",
      sentenceCompareLongterm: "Cost difference over the selected period based on your inputs",
      sentenceSingle:          "Your calculated cost: {val} for {km}",
      sentenceSingleCarpool:   "Cost per person: {val} for {km} (based on your input)",
      sentenceCarpoolSuffix:   "(per person, {n} people)",
      // Share-text variant ("I" perspective)
      shareCompareSavings:     "Based on my inputs, I save {val} over {km}",
      shareCompareExtra:       "Based on my inputs, the combustion vehicle is cheaper by {val} over {km}",
      shareCompareEqual:       "Based on my inputs, both options are similarly priced",
      shareCompareLongterm:    "Based on my inputs, cost difference over the selected period",
      shareSingle:             "Based on my inputs, my calculated cost is {val} for {km}",
      shareSingleCarpool:      "Based on my inputs, cost per person is {val} for {km}",
      // Phase B — Marketing share text (multi-line, with www.evspend.com CTA)
      shareTextSingleEv: "My EV cost calculation:\nFor {km} km, www.evspend.com calculates\n{value} {currency} in electricity costs.\nCalculate your own comparison at\nwww.evspend.com",
      shareTextSingleVb: "My combustion engine costs:\nFor {km} km, www.evspend.com calculates\n{value} {currency} in fuel costs.\nCalculate your own comparison at\nwww.evspend.com",
      shareTextCompare:  "My EV vs combustion cost comparison:\nEV: {ev_value} | Combustion: {ice_value}\nSavings: {savings} for {km} km\nCalculated on www.evspend.com",
      shareRideshareLine: "Carpool {n} people: {perPerson} {currency} per person",
      // Verlauf
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
      statsTotalKm: "Total km",
      statsTotalCost: "Total cost",
      statsAvgCost: "Avg. cost / 100 km",
      statsAvgConsumption: "Avg. consumption",
      statsEmpty: "No single-calculations saved yet",
      legacyLabel: "Legacy compare entries",
      legacyClear: "Delete legacy entries",
      clearAll: "Clear all",
      confirmClearAll: "Delete all saved single calculations?",
      confirmClearLegacy: "Delete all legacy compare entries?",
      histEmptyNone: "No saved single calculations",
      histEmptySearch: "No entries for this search",
      histEntrySingular: "entry",
      histEntryPlural: "entries",
      histEntryDelete: "Delete entry",
      backToCalc: "Back to calculator",
      legacyBadge: "Compare (legacy)",
      legacyDiffSuffix: "/ year",
      verlaufFooterNote: "Saved entries stay on this device only.",
      chartToday: "Costs today",
      chartWeek:  "Costs this week",
      chartMonth: "Costs this month",
      chartYear:  "Costs this year",
      chartAll:   "Total costs",
      chartAvgCost: "Average cost"
    },
    tr: {
      heroTitle: "Elektrikli Araç & Benzinli Araç",
      heroSubtitle1: "Maliyet",
      heroSubtitle2: "doğrudan karşılaştırma",
      trustNoSignup: "Kayıt gerekmez",
      trustLocal: "Yerel olarak saklanır",
      disclaimer: "Hesaplama ortalama değerlere dayanır. Enerji, yakıt tüketimi ve verimlilik sürüş tarzına, hava koşullarına ve araca göre değişebilir. Bakım, sigorta ve değer kaybı dahil değildir.",
      brandTagline: "Girdilerinize dayalı karşılaştırma",
      modeSingle: "Tekli hesaplama",
      modeCompare: "Karşılaştırma",
      typeEv: "Elektrikli",
      typeVb: "Benzinli",
      quickCalc: "Hızlı hesaplayıcı",
      sectionMileage: "Mesafe",
      sectionEv: "Elektrikli",
      sectionVb: "Benzinli",
      labelKilometer: "Kilometre",
      labelKilometerUs: "Mil",
      labelEvConsumption: "Elektrik tüketimi",
      labelIceConsumption: "Yakıt tüketimi",
      hintEvConsumption: "Elektrikli: 15–20 kWh/100 km",
      hintEvConsumptionUs: "Elektrikli: 25–35 kWh/100 mi",
      hintIceConsumption: "Benzinli: 5–8 L/100 km",
      hintIceConsumptionUs: "Benzinli: 20–30 mpg",
      labelConsumption: "Tüketim",
      labelElectricityPrice: "Elektrik fiyatı",
      labelBatterySize: "Batarya kapasitesi",
      labelGasPrice: "Benzin fiyatı",
      labelPersons: "Kişi sayısı",
      rangeHintText: "Teorik hesaplama (batarya ÷ tüketim). Gerçek menzil sürüş tarzına, iklime ve topografyaya göre önemli ölçüde değişir. WLTP değeri değildir.",
      streckeHint: "Doğrudan karşılaştırma için tek sefer",
      rideshareLabel: "Ortak yolculuk",
      rideshareHint: "Maliyetler tüm kişilere bölünür.",
      longtermLabel: "Uzun vadeli analiz",
      calculate: "Sonucu güncelle",
      staleHint: "Girdiler değişti – sonucu güncelleyin",
      shareImage: "Resim olarak paylaş",
      shareText: "Metin olarak paylaş",
      saveToHistory: "Geçmişe kaydet",
      showHistory: "Geçmişi göster",
      reset: "Sıfırla",
      backToCompare: "Doğrudan karşılaştırmaya dön",
      noteLabel: "Yolculuk notu (isteğe bağlı)",
      noteInlineLabel: "Not",
      notePlaceholder: "ör. işe gidiş, gezi veya şehir yolculuğu",
      emptyCompareTitle: "Maliyet farkı hesaplamadan sonra görünür",
      emptySingleTitle: "Maliyet hesaplamadan sonra görünür",
      emptyCompareSub: "Verilerini gir, sonucu anında gör.",
      yourCosts: "Maliyetleriniz",
      hintCompareFoot: "Sonuçlar girdilerinize ve ortalama değerlere dayanır. Farklılık gösterebilir.",
      hintSingleFoot: "Sonuçlar girdilerinize ve ortalama değerlere dayanır. Farklılık gösterebilir.",
      calcInfoBlock: "<h3>Hesaplama Bilgisi</h3><p>Gösterilen değerler, girdilerinize ve ortalama varsayımlara dayalı tahminlerdir. Gerçek maliyetler sürüş tarzına, araç tipine, enerji fiyatlarına ve kullanıma göre değişebilir.</p><p><strong>Nasıl hesaplanır:</strong><br>Maliyet = tüketim × fiyat × mesafe</p><p>Bu araç yalnızca bilgilendirme amaçlıdır ve garanti veya danışmanlık sunmaz.</p>",
      footerImpressum: "Künye",
      footerDatenschutz: "Gizlilik",
      footerTerms: "Şartlar",
      footerHinweise: "Kullanım notları",
      footerBarrierefreiheit: "Erişilebilirlik",
      srSliderSetTo: "{label} {value} olarak ayarlandı",
      srResultUpdated: "Yeni sonuç: {value}",
      // Phase P Sprint 2 (F4.8) — Slider aria-labels with vehicle context
      ariaKmShared: "Her iki araç için mesafe",
      ariaKmEv: "Elektrikli araç mesafesi",
      ariaKmVb: "Benzinli araç mesafesi",
      footerVerlauf: "Geçmiş",
      footerNote: "Üreticiden bağımsız maliyet karşılaştırması · Reklam yok",
      privacyNotice: "Veriler yalnızca tarayıcınızda saklanır. Sunuculara aktarılmaz.",
      monthlyCosts: "Aylık maliyet",
      yearlyCosts: "Yıllık maliyet",
      result: "Sonuç",
      langMenuLabel: "Dil",
      currMenuLabel: "Para birimi",
      marketMenuLabel: "Pazar",
      marketDe: "Almanya",
      marketEu: "Avrupa",
      marketUs: "ABD",
      marketTr: "Türkiye",
      // Phase 7 — dinamik sonuç/aksiyon metinleri
      evCheaper: "Elektrikli avantajı — girdilerinize göre",
      vbCheaper: "Benzinli avantajı — girdilerinize göre",
      costsEqual: "Maliyetler aynı",
      savingsFor: "{km} için tasarruf ediyorsun",
      extraCostFor: "{km} için fazla ödüyorsun",
      differenceFor: "{km} için fark",
      costForKm: "{km} için maliyet",
      costPerPerson: "Kişi başı maliyet",
      personsCount: "{n} kişi",
      personOne: "{n} kişi",
      perPersonPrefix: "Kişi başı ({n})",
      perPersonInactive: "Kişi başı aktif değil",
      perPerson: "kişi başı",
      persons: "kişi",
      costLabelEv: "Elektrikli maliyeti",
      costLabelVb: "Benzinli maliyeti",
      per100km: "/ 100 {unit}",
      rangeText: "Tahmini menzil: {km} {unit}",
      rangeEmpty: "Yaklaşık — {unit} menzil",
      rideshareFallback: "Ortak yolculuk ({n} kişi)",
      rideshareLine: "Ortak yolculuk · {n} kişi",
      // Longterm
      breakevenAfter: "Break-even yaklaşık {years} sonra",
      yearOne: "yıl",
      yearOther: "yıl",
      profitableNow: "Hemen daha uygun",
      noBreakeven: "Seçilen süre içinde break-even yok",
      totalSavingsLabel: "Başabaş sonrası hesaplanan fark: {val}",
      kmPerYearApprox: "≈ {km} {unit} yıllık",
      // Toasts + confirms
      toastSaveSingleOnly: "Sadece tekli hesaplamalar kaydedilir",
      toastInvalidInput: "Lütfen geçerli değerler girin",
      toastSaved: "Geçmişe kaydedildi",
      toastSaveFailed: "Kaydedilemedi",
      saveCooldown: "Lütfen biraz bekleyin — kısa bir aradan sonra tekrar kaydetmek mümkün.",
      toastCalcFirst: "Önce hesaplama yapın",
      toastImageReady: "Resim paylaşıma hazır",
      toastClipboard: "Panoya kopyalandı",
      toastShareFailed: "Paylaşım başarısız",
      toastImageError: "Resim oluşturulamadı",
      confirmReset: "Tüm değerleri sıfırlamak istediğinize emin misiniz?",
      // Uzun vadeli bölüm
      longtermInfoHint: "Uzun vadeli analiz aktif – zaman içindeki toplam maliyete odaklanır",
      labelKmPerMonth: "Aylık kilometre",
      longtermKmMonthHint: "Aylık ortalama kullanım",
      longtermKmWarn: "Çok yüksek aylık kilometre – sonuçlar tipik kullanımdan önemli ölçüde sapabilir.",
      longtermPeriod: "Süre",
      longtermPremiumLabel: "Elektrikli araç alış bedeli (ek maliyet)",
      longtermRemainingPremium: "Kalan ek maliyet",
      longtermAmortized: "Dönemde başabaş noktasına ulaşıldı",
      longtermBeHint: "Aylık kilometrenize göre",
      longtermLossHint: "Seçilen dönemdeki işletme maliyetlerinden sonraki fark",
      longtermDoneHint: "Girdilerinize göre hesaplanmıştır",
      longtermFootnote: "Sadece işletme maliyetleri. Alış bedeli ek maliyet olarak dikkate alınır.",
      // Feedback
      verlaufHintText: "Maliyetleriniz artık geçmişte",
      shareHintText: "Sonucunuzu resim olarak paylaşın",
      saveHintText: "Yalnızca tekli hesaplamalar kaydedilir",
      noscriptText: "Bu uygulama JavaScript gerektirir. Lütfen tarayıcınızda JavaScript'i etkinleştirin.",
      // Phase J Sprint 1 (F5.1 + F5.2) — PWA kurulum metinleri
      pwaClose: "Kapat",
      pwaBarText: "Daha hızlı erişim için uygulamayı yükle?",
      pwaInstall: "Yükle",
      pwaLater: "Sonra",
      pwaPopupTitle: "Ana Ekrana Ekle",
      pwaPopupSub: "Cihazında şu şekilde yapılır:",
      pwaPopupAdd: "Tamam",
      pwaStepIosShare:       "Safari'nin altındaki <strong>Paylaş</strong> simgesine dokun",
      pwaStepIosHome:        "<strong>Ana Ekrana Ekle</strong> seçeneğini seç",
      pwaStepIosAdd:         "Sağ üstte <strong>Ekle</strong> seçeneğine dokun",
      pwaStepAndroidMenu:    "Sağ üstteki <strong>menüye (⋮)</strong> dokun",
      pwaStepAndroidInstall: "<strong>Uygulamayı yükle</strong> seçeneğini seç",
      pwaStepDesktopMenu:    "<strong>Tarayıcı menüsünü</strong> aç",
      pwaStepDesktopInstall: "<strong>„Uygulamayı yükle“</strong> seçeneğini tıkla",
      footerCalc: "Hesaplayıcı",
      chartAxisX: "Kilometre",
      chartAxisY: "Maliyet ({symbol})",
      // Share text
      shareEvCostHeader: "Elektrikli maliyet ⚡",
      shareVbCostHeader: "Benzinli maliyet ⛽",
      shareRoute: "📍 Rota:",
      shareCosts: "💰 Maliyet:",
      shareCostsPerPerson: "💰 Kişi başı maliyet:",
      shareAverage: "📊 Ortalama:",
      sharePer100: "100 {unit} başına",
      shareTotal: "toplam",
      shareGroupPersons: "👥 {n} kişi",
      shareForKm: "{km} için",
      shareEvLine: "⚡ Elektrikli:",
      shareVbLine: "⛽ Benzinli:",
      shareSavings: "💰 Tasarruf:",
      shareSavingsArrow: "👉 Tasarruf: {val} ({winner})",
      sharePerPersonSuffix: "kişi başı",
      shareCompareTitle: "Elektrikli & Benzinli karşılaştırması",
      shareCompareEmoji: "Elektrikli & Benzinli 🚗⚡",
      shareTry: "Sen de dene 👉 www.evspend.com",
      shareTryCompare: "Sen de dene 👉 www.evspend.com",
      // Share-Image (Canvas-PNG)
      shareImgSubCompare: "Maliyet karşılaştırması",
      shareImgSubSingle: "Maliyet hesaplaması",
      shareImgSavings: "Tasarruf",
      shareImgDiff: "Fark",
      shareImgCostFor: "{km} için maliyet",
      shareImgPerPersonCtx: "kişi başı · {km}",
      shareImgTotalCosts: "Toplam maliyet: {val}",
      shareImgTotalCostsBoth: "Toplam maliyet: {ev} / {vb}",
      shareImgDisclaimer: "Ortalama değerlere dayanır – sonuçlar değişebilir",
      // Result sentence (legally qualified, used in result/share/share-image)
      sentenceCompareSavings:  "{km} için girdilerine göre {val} tasarruf ediyorsun",
      sentenceCompareExtra:    "İçten yanmalı araç {km} için {val} daha ekonomik (girdilerine göre)",
      sentenceCompareEqual:    "Her iki seçenek girdilerine göre benzer maliyette",
      sentenceCompareLongterm: "Seçilen süre için maliyet farkı (girdilere göre)",
      sentenceSingle:          "{km} için hesaplanan maliyet: {val}",
      sentenceSingleCarpool:   "Kişi başı maliyet: {val} ({km} için, girdine göre)",
      sentenceCarpoolSuffix:   "(kişi başı, {n} kişi)",
      // Share-text variant ("I" perspective)
      shareCompareSavings:     "{km} için girdilerime göre {val} tasarruf ediyorum",
      shareCompareExtra:       "İçten yanmalı araç {km} için {val} daha ekonomik (girdilerime göre)",
      shareCompareEqual:       "Her iki seçenek girdilerime göre benzer maliyette",
      shareCompareLongterm:    "Seçilen süre için maliyet farkı (girdilerime göre)",
      shareSingle:             "{km} için hesaplanan maliyetim: {val}",
      shareSingleCarpool:      "Kişi başı maliyet: {val} ({km} için, girdime göre)",
      // Phase B — Marketing-Share-Metni (çok satır, www.evspend.com CTA ile)
      shareTextSingleEv: "Elektrikli araç maliyetim:\n{km} km için www.evspend.com\n{value} ₺ elektrik maliyeti hesaplıyor.\nKendi karşılaştırmanı www.evspend.com'da yap",
      shareTextSingleVb: "Benzinli maliyetim:\n{km} km için www.evspend.com\n{value} ₺ yakıt maliyeti hesaplıyor.\nKendi karşılaştırmanı www.evspend.com'da yap",
      shareTextCompare:  "E-otomobil ve benzinli maliyet karşılaştırmam:\nElektrikli: {ev_value} ₺ | Benzinli: {ice_value} ₺\nTasarruf: {savings} ₺ / {km} km\nwww.evspend.com'da hesaplandı",
      shareRideshareLine: "Araç paylaşımı {n} kişi: {perPerson} ₺ kişi başı",
      // Verlauf
      verlaufTitle: "Geçmiş",
      verlaufSub: "Kişisel hesaplamalarınız",
      verlaufTrust: "Hesaplanan sürüşlerine göre",
      verlaufPrivacy: "Tüm hesaplamalar yalnızca cihazınızda yerel olarak saklanır. Sunucularımıza aktarım veya kayıt yapılmaz. Veriler tarayıcı belleğinde kalır ve istediğiniz zaman silinebilir. Tarayıcı verilerini temizlerseniz veya başka bir cihaz kullanırsanız kaybolabileceklerini unutmayın.",
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
      statsTotalKm: "Toplam km",
      statsTotalCost: "Toplam maliyet",
      statsAvgCost: "Ø maliyet / 100 km",
      statsAvgConsumption: "Ø tüketim",
      statsEmpty: "Henüz kayıtlı tekli hesaplama yok",
      legacyLabel: "Eski karşılaştırma girdileri",
      legacyClear: "Eski girdileri sil",
      clearAll: "Tümünü sil",
      confirmClearAll: "Tüm kayıtlı tekli hesaplamaları silmek istiyor musunuz?",
      confirmClearLegacy: "Tüm eski karşılaştırma girdilerini silmek istiyor musunuz?",
      histEmptyNone: "Kayıtlı tekli hesaplama yok",
      histEmptySearch: "Bu arama için girdi yok",
      histEntrySingular: "girdi",
      histEntryPlural: "girdi",
      histEntryDelete: "Girdiyi sil",
      backToCalc: "Hesaplayıcıya dön",
      legacyBadge: "Karşılaştırma (eski)",
      legacyDiffSuffix: "/ yıl",
      verlaufFooterNote: "Kayıtlı girdiler yalnızca bu cihazda kalır.",
      chartToday: "Bugün maliyet",
      chartWeek:  "Bu hafta",
      chartMonth: "Bu ay",
      chartYear:  "Bu yıl",
      chartAll:   "Toplam maliyet",
      chartAvgCost: "Ortalama maliyet"
    }
  };

  var currencyConfig = {
    EUR: { symbol: "€", code: "EUR", locale: "de-DE" },
    USD: { symbol: "$", code: "USD", locale: "en-US" },
    TRY: { symbol: "₺", code: "TRY", locale: "tr-TR" }
  };

  // ── Phase 6/7: Markt-Konfiguration als Single Source of Truth ────────────
  // Drei Märkte — Deutschland / USA / Türkiye. Jeder Markt definiert Sprache,
  // Locale, Währung, Symbol, Pill-Label und seine eigenen Preis-Defaults
  // (inkl. Slider-Range). setMarket(code) ist der zentrale Einstiegspunkt.
  // Phase 9: MARKET_CONFIG erweitert um `units` (Metadaten) und komplette
  // Slider-Defaults. Beim Marktwechsel werden ALLE Slider auf die jeweiligen
  // Markt-typischen Werte gesetzt (nicht nur Preise) — so startet jeder Markt
  // in einem realistischen, fachlich korrekten Zustand.
  var MARKET_CONFIG = {
    de: {
      code: "de", label: "Deutschland", language: "de", locale: "de-DE", currency: "EUR", symbol: "€",
      units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" },
      defaults: {
        // DE-Marktdefaults (EUR, km, L, L/100 km, kWh/100 km) — manuell pflegbar
        strompreis:          { value: 0.37,   min: 0.10,  max: 1.00,    step: 0.01 },  // €/kWh
        benzinpreis:         { value: 1.85,   min: 1.00,  max: 3.00,    step: 0.01 },  // €/L
        verbrauchVerbrenner: { value: 7.0,    min: 3,     max: 20,      step: 0.1 },   // L/100 km
        evVerbrauch:         { value: 17,     min: 8,     max: 35,      step: 0.5 },   // kWh/100 km
        // Phase P Sprint 4 (F6.1): km* sliders harmonised at 0-10000 step 1
        // for consistent UX between single (kmEv/kmVb) and compare (kmShared)
        // mode — a "trip distance" means the same thing in both.
        kmEv:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km
        kmVb:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km
        kmShared:            { value: 1000,   min: 0,     max: 10000,   step: 1 },     // km
        kmMonat:             { value: 1000,   min: 100,   max: 5000,    step: 50 },    // km
        batteryKwh:          { value: 60,     min: 20,    max: 150,     step: 1 },     // kWh
        longtermPremium:     { value: 5000,   min: 0,     max: 40000,   step: 100 }    // €
      }
    },
    eu: {
      code: "eu", label: "EU", language: "en", locale: "en-IE", currency: "EUR", symbol: "€",
      units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" },
      defaults: {
        // EU-Marktdefaults (EUR, km, L, L/100 km, kWh/100 km) — EU-Average-Preise
        strompreis:          { value: 0.30,   min: 0.10,  max: 1.00,    step: 0.01 },  // €/kWh (EU-Schnitt; DE 0.37, FR 0.20, ES 0.30)
        benzinpreis:         { value: 1.70,   min: 1.00,  max: 3.00,    step: 0.01 },  // €/L (EU-Schnitt; DE 1.85, ES 1.50)
        verbrauchVerbrenner: { value: 6.5,    min: 3,     max: 20,      step: 0.1 },   // L/100 km (EU-Schnitt; DE 7.0)
        evVerbrauch:         { value: 17,     min: 8,     max: 35,      step: 0.5 },   // kWh/100 km (wie DE)
        kmEv:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmVb:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmShared:            { value: 1000,   min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmMonat:             { value: 1000,   min: 100,   max: 5000,    step: 50 },    // km
        batteryKwh:          { value: 60,     min: 20,    max: 150,     step: 1 },     // kWh
        longtermPremium:     { value: 5000,   min: 0,     max: 40000,   step: 100 }    // €
      }
    },
    us: {
      code: "us", label: "USA", language: "en", locale: "en-US", currency: "USD", symbol: "$",
      units: { distance: "mile", fuelVolume: "gallon", iceEfficiency: "mpg", evEfficiency: "kWh/100mi" },
      defaults: {
        // US-Marktdefaults (USD, mi, gal, mpg, kWh/100 mi) — manuell pflegbar
        strompreis:          { value: 0.16,   min: 0.05,  max: 0.60,    step: 0.01 },  // $/kWh (Haushaltsdurchschnitt)
        benzinpreis:         { value: 3.20,   min: 2.00,  max: 6.00,    step: 0.05 },  // $/gallon
        verbrauchVerbrenner: { value: 26,     min: 10,    max: 80,      step: 1 },     // mpg
        evVerbrauch:         { value: 30,     min: 15,    max: 50,      step: 0.5 },   // kWh/100 mi
        kmEv:                { value: 300,    min: 0,     max: 6000,    step: 1 },     // mi — F6.1 (≈10000 km)
        kmVb:                { value: 300,    min: 0,     max: 6000,    step: 1 },     // mi — F6.1
        kmShared:            { value: 600,    min: 0,     max: 6000,    step: 1 },     // mi — F6.1
        kmMonat:             { value: 1000,   min: 60,    max: 3100,    step: 50 },    // mi
        batteryKwh:          { value: 75,     min: 20,    max: 150,     step: 1 },     // kWh
        longtermPremium:     { value: 5500,   min: 0,     max: 45000,   step: 100 }    // USD
      }
    },
    tr: {
      code: "tr", label: "Türkiye", language: "tr", locale: "tr-TR", currency: "TRY", symbol: "₺",
      units: { distance: "km", fuelVolume: "liter", iceEfficiency: "l/100km", evEfficiency: "kWh/100km" },
      defaults: {
        // TR-Marktdefaults (TRY, km, L, L/100 km, kWh/100 km) — manuell pflegbar
        strompreis:          { value: 2.80,   min: 0.50,  max: 10.00,   step: 0.05 },  // ₺/kWh
        benzinpreis:         { value: 48.00,  min: 20.00, max: 80.00,   step: 0.50 },  // ₺/L
        verbrauchVerbrenner: { value: 7.0,    min: 3,     max: 20,      step: 0.1 },   // L/100 km
        evVerbrauch:         { value: 17,     min: 8,     max: 35,      step: 0.5 },   // kWh/100 km
        kmEv:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmVb:                { value: 500,    min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmShared:            { value: 1000,   min: 0,     max: 10000,   step: 1 },     // km — F6.1
        kmMonat:             { value: 1000,   min: 100,   max: 5000,    step: 50 },    // km
        batteryKwh:          { value: 60,     min: 20,    max: 150,     step: 1 },     // kWh
        longtermPremium:     { value: 250000, min: 0,     max: 2000000, step: 5000 }   // ₺
      }
    }
  };

  // Phase 7/9: wendet alle Markt-spezifischen Slider-Defaults + Ranges an.
  // Beim Marktwechsel werden sämtliche Eingabefelder auf die markt-typischen
  // Werte zurückgesetzt, damit jeder Markt in seinem eigenen realistischen
  // Einheitensystem startet (US: mi/mpg/gal; DE/TR: km/L).
  function applyMarketDefaults(mk) {
    if (!mk || !mk.defaults) return;
    function applyTo(id, cfg) {
      var el = document.getElementById(id);
      if (!el || !cfg) return;
      if (cfg.min  != null) el.min  = String(cfg.min);
      if (cfg.max  != null) el.max  = String(cfg.max);
      if (cfg.step != null) el.step = String(cfg.step);
      if (cfg.value != null) el.value = String(cfg.value);
      try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
    }
    ["strompreis", "benzinpreis", "verbrauchVerbrenner", "evVerbrauch",
     "kmEv", "kmVb", "kmShared", "kmMonat", "batteryKwh", "longtermPremium"
    ].forEach(function (id) {
      applyTo(id, mk.defaults[id]);
    });
  }

  // Phase 6: Init-Pfad — wendet NUR Slider-Ranges (min/max/step) an,
  // NIEMALS die Werte. Wird in init() VOR loadInputs() aufgerufen, damit
  // persistierte User-Werte beim Clamping gegen die korrekte Markt-Range
  // (statt HTML-Default = DE/EU) verglichen werden. Bewahrt das
  // "Stored locally"-Versprechen: User-Werte bleiben erhalten, auch bei
  // Markt ≠ DE/EU.
  function applyMarketRanges(mk) {
    if (!mk || !mk.defaults) return;
    function applyTo(id, cfg) {
      var el = document.getElementById(id);
      if (!el || !cfg) return;
      if (cfg.min  != null) el.min  = String(cfg.min);
      if (cfg.max  != null) el.max  = String(cfg.max);
      if (cfg.step != null) el.step = String(cfg.step);
    }
    ["strompreis", "benzinpreis", "verbrauchVerbrenner", "evVerbrauch",
     "kmEv", "kmVb", "kmShared", "kmMonat", "batteryKwh", "longtermPremium"
    ].forEach(function (id) {
      applyTo(id, mk.defaults[id]);
    });
  }

  // Phase P Sprint 4 (F1.5): hard-coded CURRENCY_RATES + convertFromEur /
  // convertToEur removed. They were last touched in Phase 4 and untouched by
  // every render path since Phase 5; the comment promised "future Admin /
  // Migration scenarios" but nothing ever consumed them. Removing them
  // eliminates the risk of someone wiring up the API later and getting
  // months-old exchange rates.

  var currentMarket   = "de";
  var currentLanguage = "de";
  var currentCurrency = "EUR";

  // Expose on window so other code can read state without re-deriving it.
  window.EAF_I18N = {
    translations: translations,
    currencyConfig: currencyConfig,
    market: MARKET_CONFIG,
    getLanguage: function () { return currentLanguage; },
    getCurrency: function () { return currentCurrency; },
    // Phase 6: Markt ist Single Source — liefert das volle Config-Objekt.
    getMarket: function () { return MARKET_CONFIG[currentMarket] || MARKET_CONFIG.de; },
    getMarketCode: function () { return currentMarket; },
    setLanguage: setLanguage,
    setCurrency: setCurrency,
    setMarket: setMarket,
    formatCurrency: formatCurrency,
    t: function (key) {
      // Phase J Sprint 1 (F1.3 / F1.4): use _resolveKey so callers like
      // _t("hintEvConsumption") get the US variant when market === "us".
      var dict = translations[currentLanguage] || translations.de;
      var val = _resolveKey(dict, translations.de, key);
      return (val != null) ? val : key;
    }
  };

  // Phase 8 / Phase P Sprint 2 (F6.3): Browser-Locale → Markt.
  //   de*  → de
  //   tr*  → tr
  //   en-us → us
  //   en-* (en-GB / en-IE / en-AU / en-CA / …) → eu
  //   anything else → eu  (server middleware redirects non-domestic to /en-eu/
  //                        anyway; EU is the right JS-side fallback too)
  // Only used when no eaf.market is persisted yet — explicit user choice
  // always wins.
  function _detectMarketFromBrowser() {
    try {
      var list = [];
      if (navigator.languages && navigator.languages.length) {
        list = Array.prototype.slice.call(navigator.languages);
      } else if (navigator.language) {
        list = [navigator.language];
      }
      for (var i = 0; i < list.length; i++) {
        var L = String(list[i] || "").toLowerCase().replace(/_/g, "-");
        if (L === "de" || L.indexOf("de-") === 0) return "de";
        if (L === "tr" || L.indexOf("tr-") === 0) return "tr";
        if (L === "en-us") return "us";
        if (L === "en" || L.indexOf("en-") === 0) return "eu";
      }
    } catch (_) {}
    return "eu";
  }

  // Phase 6/8: liest primär den Markt; fällt bei Bedarf auf ältere Phase-1–5-
  // Zustände zurück; erkennt bei erster Nutzung den Markt aus dem Browser-Locale;
  // Default DE, wenn nichts passt.
  function loadI18nState() {
    try {
      var m = localStorage.getItem(MARKET_KEY);
      if (m && MARKET_CONFIG[m]) {
        currentMarket = m;
        currentLanguage = MARKET_CONFIG[m].language;
        currentCurrency = MARKET_CONFIG[m].currency;
        return;
      }
      // Legacy-Fallback: altes Lang/Currency-Paar → bestmöglicher Markt.
      var l = localStorage.getItem(LANG_KEY);
      var derived = null;
      if (l === "de") derived = "de";
      else if (l === "tr") derived = "tr";
      else if (l === "en") derived = "us";
      if (derived && MARKET_CONFIG[derived]) {
        currentMarket = derived;
        currentLanguage = MARKET_CONFIG[derived].language;
        currentCurrency = MARKET_CONFIG[derived].currency;
        return;
      }
      // Phase 8: Erster Besuch ohne jeden State → aus Browser-Locale ableiten.
      // Nur als Initialwert; sobald der Nutzer eine Auswahl trifft, persistiert
      // setMarket() die explizite Wahl und überschreibt die Auto-Erkennung.
      var autoMk = _detectMarketFromBrowser();
      if (autoMk && MARKET_CONFIG[autoMk]) {
        currentMarket = autoMk;
        currentLanguage = MARKET_CONFIG[autoMk].language;
        currentCurrency = MARKET_CONFIG[autoMk].currency;
        return;
      }
      // Phase P Sprint 2 (F6.3): EU is the safer fallback than US, since the
      // server middleware also redirects unknown / non-domestic countries to
      // /en-eu/. Keeps client default in sync with server intent.
      currentMarket = "eu";
      currentLanguage = "en";
      currentCurrency = "EUR";
    } catch (_) {
      currentMarket = "eu";
      currentLanguage = "en";
      currentCurrency = "EUR";
    }
  }

  // Phase J Sprint 1 (F1.3 / F1.4): US-market override resolver. If the
  // active market is "us", a translation may provide a `${key}Us` variant
  // that takes precedence — used for distance labels and consumption hints
  // where the EU-formulated base copy uses km/L and the US copy uses mi/mpg.
  // For every other market the base key is returned. Falls back to the DE
  // dict if the active language doesn't define the key at all.
  function _resolveKey(dict, fallback, key) {
    if (currentMarket === "us") {
      var usKey = key + "Us";
      if (dict[usKey] != null) return dict[usKey];
      if (fallback[usKey] != null) return fallback[usKey];
    }
    return (dict && dict[key] != null) ? dict[key] : (fallback[key] != null ? fallback[key] : undefined);
  }

  function applyTranslations() {
    var dict = translations[currentLanguage] || translations.de;
    var fallback = translations.de;
    // Phase 9: automatische Platzhalter-Ersetzung für gängige Markt-Tokens,
    // damit z. B. "Ca. — {unit} Reichweite" in US zu "Approx. — mi range" wird,
    // ohne dass die aufrufende Stelle subs übergeben muss.
    var commonSubs = {
      unit: (typeof _distanceUnit === "function") ? _distanceUnit() : "km",
      symbol: (typeof _currencySymbol === "function") ? _currencySymbol() : "€"
    };
    function sub(raw) {
      if (typeof raw !== "string") return raw;
      return raw.replace(/\{(\w+)\}/g, function (m, name) {
        return commonSubs[name] != null ? String(commonSubs[name]) : m;
      });
    }
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = _resolveKey(dict, fallback, key);
      if (typeof val === "string") el.textContent = sub(val);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      var val = _resolveKey(dict, fallback, key);
      if (typeof val === "string") el.innerHTML = sub(val);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var val = _resolveKey(dict, fallback, key);
      if (typeof val === "string") el.setAttribute("placeholder", sub(val));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      var val = _resolveKey(dict, fallback, key);
      if (typeof val === "string") el.setAttribute("aria-label", sub(val));
    });
  }

  // Phase 6: interne Low-Level-API. Die UI-Pill ruft setMarket(), welches
  // setLanguage + setCurrency orchestriert. Der alte Auto-Cascade aus Phase 5
  // (Sprache → passende Währung) ist entfernt, weil jetzt der Markt die
  // Entscheidung trägt.
  function _onLanguageApplied() {
    try { _refreshMarketPillLabel(); } catch (_) {}
  }
  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLanguage = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
    try { document.documentElement.setAttribute("lang", lang); } catch (_) {}
    applyTranslations();
    _onLanguageApplied();
    document.dispatchEvent(new CustomEvent("eaf:languagechange", { detail: { language: lang } }));
  }

  function setCurrency(curr) {
    if (!currencyConfig[curr]) return;
    currentCurrency = curr;
    try { localStorage.setItem(CURR_KEY, curr); } catch (_) {}
    document.dispatchEvent(new CustomEvent("eaf:currencychange", { detail: { currency: curr } }));
  }

  // Phase 6/7: zentraler Marktwechsel — setzt Sprache, Währung, Locale,
  // aktualisiert die Pill, wendet Markt-Preis-Defaults inkl. Slider-Range an
  // und dispatcht eaf:marketchange plus abhängige language/currency-Events.
  function _marketLabelText(code, mk) {
    var key  = "market" + code.charAt(0).toUpperCase() + code.slice(1);
    var name = _t(key) || (mk.label || code.toUpperCase());
    return name + " " + (mk.symbol || "");
  }
  function _refreshMarketPillLabel() {
    var lbl = document.getElementById("marketSwitchLabel");
    if (!lbl) return;
    var mk = MARKET_CONFIG[currentMarket]; if (!mk) return;
    lbl.textContent = _marketLabelText(currentMarket, mk);
  }
  function setMarket(code) {
    var mk = MARKET_CONFIG[code];
    if (!mk) return;
    currentMarket = code;
    try { localStorage.setItem(MARKET_KEY, code); } catch (_) {}
    // Phase P Sprint 1 (F6.2): currency MUST be set before language, because
    // setLanguage() runs applyTranslations() which substitutes {symbol} into
    // chart-axis labels (and any future symbol-based translation). Without
    // this order, switching markets renders the previous currency on the
    // chart axis until the next translation pass.
    setCurrency(mk.currency);
    setLanguage(mk.language);
    // Phase 7: marktabhängige Slider-Ranges + Preis-Defaults anwenden.
    applyMarketDefaults(mk);
    _refreshMarketPillLabel();
    updateMenuActive();
    document.dispatchEvent(new CustomEvent("eaf:marketchange", { detail: { market: code } }));
  }

  // Phase 5: direktes Lokalisieren des Rohwerts in der aktiven
  // Marktwährung. Keine Wechselkurs-Konversion — Rohwerte sind bereits in
  // der aktiven Währung (die Berechnung läuft im aktiven Markt).
  function formatCurrency(value) {
    var cfg = currencyConfig[currentCurrency] || currencyConfig.EUR;
    if (value == null || !isFinite(Number(value))) {
      return "";
    }
    try {
      return new Intl.NumberFormat(cfg.locale, {
        style: "currency",
        currency: cfg.code,
        maximumFractionDigits: 2
      }).format(Number(value));
    } catch (_) {
      return Number(value).toFixed(2) + " " + cfg.symbol;
    }
  }

  // Phase 6: nur noch ein aktives Menü (Markt).
  function updateMenuActive() {
    document.querySelectorAll("[data-market]").forEach(function (el) {
      el.classList.toggle("top-menu-item--active", el.getAttribute("data-market") === currentMarket);
    });
  }

  function initTopControls() {
    var mkBtn  = document.getElementById("marketSwitch");
    var mkMenu = document.getElementById("marketMenu");
    if (!mkBtn || !mkMenu) return;

    // Phase 10: interner Open-Flag verhindert Doppel-Open/Doppel-Close
    // und macht das UX robuster.
    var isOpen = false;

    function closeAll() {
      if (!isOpen) return;
      isOpen = false;
      mkMenu.hidden = true;
      // Inline-Style überschreibt jede `.top-menu { display: flex }`-Regel mit
      // höherer Spezifität als das UA-`[hidden]`-Stylesheet. Ohne das bleibt
      // das Dropdown sichtbar trotz `hidden`-Attribut.
      mkMenu.style.display = "none";
      mkBtn.setAttribute("aria-expanded", "false");
    }
    function openMarket() {
      if (isOpen) return;
      isOpen = true;
      mkMenu.hidden = false;
      // Inline-Style zurücksetzen → CSS-Klasse (`display: flex`) greift wieder.
      mkMenu.style.display = "";
      mkBtn.setAttribute("aria-expanded", "true");
    }

    // Phase 10: Initial-Sync — HTML trägt `hidden`, CSS-Klasse würde es aber
    // überschreiben. Einmal explizit inline schließen, damit der Startzustand
    // zuverlässig stimmt (kein Flicker beim Laden).
    mkMenu.style.display = "none";
    mkMenu.hidden = true;
    mkBtn.setAttribute("aria-expanded", "false");

    // Toggle-Klick auf die Pill
    mkBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isOpen) closeAll(); else openMarket();
    });

    // Optionen-Klick: Markt setzen + Dropdown SOFORT schließen
    document.querySelectorAll("[data-market]").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        var code = item.getAttribute("data-market");
        closeAll();
        setMarket(code);
      });
    });

    // Click außerhalb des Top-Pill-Wraps schließt
    document.addEventListener("click", function (e) {
      if (!isOpen) return;
      if (!e.target.closest(".top-pill-wrap")) closeAll();
    });

    // Touch-Outside deckt Edge-Cases ab, die "click" auf iOS manchmal nicht feuert
    document.addEventListener("touchstart", function (e) {
      if (!isOpen) return;
      if (!e.target.closest(".top-pill-wrap")) closeAll();
    }, { passive: true });

    // Escape schließt
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) closeAll();
    });
  }

  // Init: run immediately (script is at end of body, DOM is ready)
  function init() {
    loadI18nState();
    // Phase 6: Markt-Ranges VOR loadInputs anwenden, damit persistierte
    // User-Werte gegen die KORREKTE Markt-Range geclampt werden (Smart-Fix
    // für US-/EU-User: "Stored locally" bleibt erhalten).
    try { applyMarketRanges(MARKET_CONFIG[currentMarket]); } catch (_) {}
    try { loadInputs(); } catch (_) {}
    try { document.documentElement.setAttribute("lang", currentLanguage); } catch (_) {}
    applyTranslations();
    // Reflect initial state in the single market pill.
    var mkLbl = document.getElementById("marketSwitchLabel");
    if (mkLbl) {
      var _mk = MARKET_CONFIG[currentMarket];
      mkLbl.textContent = currentMarket.toUpperCase() + " · " + ((_mk && _mk.symbol) || "");
    }
    updateMenuActive();
    initTopControls();
    // First UI paint — only now are translations, market and currency ready,
    // so _t() calls inside calc / updateRangeDisplay resolve on first paint
    // (no more "costForKm" / "rangeText" raw keys leaking through).
    try { if (typeof initApp === "function") initApp(); } catch (_) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ── Print safety: hide heavy canvases during print to prevent crashes ───────
window.addEventListener("beforeprint", () => {
  document.body.classList.add("printing");
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing");
});

// ── Service Worker registration (Phase P Sprint 3) ──────────────────────────
// Registers /sw.js for offline caching + faster revisits. Defers to `load` so
// the SW install never competes with the first paint. Failures are silent —
// the app works fully without a SW; the SW is only an enhancement layer.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
