import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { createLockManager } from "./history-locks.mjs";

function createRuntime(options = {}) {
  const elements = new Map();
  const storage = new Map(Object.entries(options.storage || {}));
  const domEvents = new Map();
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  };
  function element(id, value = "") {
    const attributes = new Map();
    const el = {
      id,
      value: String(value),
      min: "",
      max: "",
      step: "",
      checked: false,
      hidden: false,
      disabled: false,
      textContent: "",
      innerHTML: "",
      style: {},
      dataset: {},
      files: [],
      offsetParent: {},
      className: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, appendChild() {},
      replaceChildren() {}, remove() {}, focus() {}, select() {}, click() {}, scrollIntoView() {},
      querySelectorAll() { return []; },
      setAttribute(name, val) { attributes.set(name, String(val)); },
      removeAttribute(name) { attributes.delete(name); },
      hasAttribute(name) { return attributes.has(name); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      getContext() { return null; },
      get offsetWidth() { return 100; },
    };
    elements.set(id, el);
    return el;
  }
  const documentElement = element("documentElement");
  const body = element("body");
  const document = {
    body,
    documentElement,
    activeElement: null,
    readyState: "loading",
    visibilityState: "visible",
    getElementById: id => elements.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(name, fn) { domEvents.set(name, [...(domEvents.get(name) || []), fn]); },
    removeEventListener() {},
    dispatchEvent(event) { for (const fn of domEvents.get(event.type) || []) fn(event); },
    createElement: tag => element(`created-${tag}-${elements.size}`),
    createDocumentFragment: () => element(`fragment-${elements.size}`),
    execCommand() { return true; },
  };
  const navigator = {
    locks: createLockManager(), userAgent: "test", platform: "MacIntel", maxTouchPoints: 0,
    language: options.language || "de-DE", languages: options.languages || [options.language || "de-DE"]
  };
  const windowObject = {
    document, localStorage, sessionStorage: localStorage, navigator, crypto: webcrypto,
    location: { search: options.search || "", pathname: options.pathname || "/", href: "https://www.evspend.com/" },
    history: { replaceState() {} },
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
  };
  windowObject.window = windowObject;
  const context = vm.createContext({
    window: windowObject, document, localStorage, sessionStorage: localStorage,
    location: windowObject.location, history: windowObject.history, navigator,
    URL, URLSearchParams, Blob, Intl, Date, Math, JSON, Number, String, Object,
    Array, Map, Set, Promise, console, Uint8Array,
    File: class File {}, FileReader: class FileReader {},
    MutationObserver: class MutationObserver { observe() {} disconnect() {} },
    ResizeObserver: class ResizeObserver { observe() {} disconnect() {} },
    Image: class Image {}, CustomEvent: class CustomEvent {}, Event: class Event {},
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, performance: { now: () => 0 },
    alert() {}, confirm: () => true,
  });
  for (const [id, value] of Object.entries(options.inputs || {})) element(id, value);
  const script = process.env.EVSPEND_TEST_MINIFIED === "1" ? "script.min.js" : "script.js";
  vm.runInContext(fs.readFileSync(new URL("../history-store.js", import.meta.url), "utf8"), context);
  vm.runInContext(fs.readFileSync(new URL(`../${script}`, import.meta.url), "utf8"), context);
  const run = expression => vm.runInContext(expression, context);
  const setInputs = values => {
    for (const [id, value] of Object.entries(values)) {
      const el = elements.get(id) || element(id);
      el.value = String(value);
    }
  };
  return {
    context, elements, element, localStorage, navigator, run, setInputs,
    dispatchDom(name) { for (const fn of domEvents.get(name) || []) fn({type: name}); }
  };
}

function metricInputs(rt, overrides = {}) {
  rt.setInputs({
    evVerbrauch: 20, strompreis: 0.30, benzinpreis: 1.80,
    verbrauchVerbrenner: 7, kmEv: 50, kmVb: 50,
    kmShared: 1000, batteryKwh: 60, kmMonat: 1000,
    ...overrides,
  });
}

test("direkter Vergleich berechnet Kosten und Differenz", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const d = rt.run("longtermActive=false; _getCompareData()");
  assert.equal(d.evCost, 6);
  assert.equal(d.vbCost, 12.6);
  assert.equal(d.eAutoTotal, 60);
  assert.equal(d.verbrennerTotal, 126);
  assert.equal(d.diffSig, 66);
});

test("Einzelberechnung EV und Verbrenner nutzt reale Produktlogik", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const ev = rt.run("singleType='ev'; _getSingleData()");
  const fuel = rt.run("singleType='vb'; _getSingleData()");
  assert.equal(ev.costPer100, 6);
  assert.equal(ev.totalCost, 3);
  assert.equal(fuel.costPer100, 12.6);
  assert.equal(fuel.totalCost, 6.3);
});

test("Nullstrecke ist stabil und negative Kerneingaben werden abgewiesen", () => {
  const rt = createRuntime();
  metricInputs(rt, { kmShared: 0 });
  assert.equal(rt.run("_getCompareData().savingsTotal"), 0);
  metricInputs(rt, { evVerbrauch: -1 });
  assert.equal(rt.run("_getCompareData()"), null);
});

test("gleiche Kosten und Mehrkosten behalten das Vorzeichen", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 20, strompreis: 0.30, verbrauchVerbrenner: 5, benzinpreis: 1.20 });
  assert.equal(rt.run("_getCompareData().diffSig"), 0);
  metricInputs(rt, { evVerbrauch: 30, strompreis: 0.50, verbrauchVerbrenner: 5, benzinpreis: 1.20 });
  assert.ok(rt.run("_getCompareData().diffSig") < 0);
});

test("US Einheiten ergeben unabhängige Kontrollwerte", () => {
  const rt = createRuntime();
  rt.run("window.EAF_I18N.getMarketCode=()=> 'us'; window.EAF_I18N.getMarket=()=>({locale:'en-US'}); window.EAF_I18N.getCurrency=()=> 'USD'");
  rt.setInputs({ evVerbrauch: 30, strompreis: 0.16, benzinpreis: 3.20, verbrauchVerbrenner: 26, kmShared: 600 });
  const d = rt.run("longtermActive=false; _getCompareData()");
  assert.equal(rt.run("_costPer100ToMarket(_getCompareData().evCost).toFixed(2)"), "4.80");
  assert.equal(rt.run("_costPer100ToMarket(_getCompareData().vbCost).toFixed(2)"), "12.31");
  assert.equal(rt.run("_kmToDist(_getCompareData().kmEv)"), 600);
  assert.ok(Math.abs(d.savingsTotal - (600 / 26 * 3.2 - 28.8)) < 1e-10);
  assert.equal(rt.run("fmt(_getCompareData().savingsTotal)"), "45.05");
});

test("L1 US Formelhinweis entspricht den sichtbaren Einheiten und der Produktionsformel", () => {
  const rt = createRuntime();
  const notice = rt.element("calculationNotice");
  notice.setAttribute("data-i18n-html", "calcInfoBlock");
  rt.context.document.querySelectorAll = selector => selector === "[data-i18n-html]" ? [notice] : [];
  rt.run("window.EAF_I18N.setMarket('us')");

  const formulas = {
    de: "E-Auto: Kosten = (Verbrauch in kWh/100 mi × Strompreis pro kWh × Strecke in mi) ÷ 100<br>Verbrenner: Kosten = (Strecke in mi ÷ Effizienz in mpg) × Preis pro US-Gallone",
    en: "EV cost = (consumption in kWh/100 mi × electricity price per kWh × distance in mi) ÷ 100<br>Combustion cost = (distance in mi ÷ efficiency in mpg) × fuel price per US gallon",
    tr: "Elektrikli maliyeti = (kWh/100 mi cinsinden tüketim × kWh başına elektrik fiyatı × mi cinsinden mesafe) ÷ 100<br>İçten yanmalı maliyeti = (mi cinsinden mesafe ÷ mpg cinsinden verimlilik) × ABD galonu başına yakıt fiyatı"
  };
  for (const language of ["de", "en", "tr"]) {
    rt.run(`window.EAF_I18N.setLanguage('${language}')`);
    assert.ok(notice.innerHTML.includes(formulas[language]), language);
    const dict = rt.context.window.EAF_I18N.translations[language];
    const formula = /<br>(.*?)<\/p>/;
    assert.equal(notice.innerHTML.replace(formula, "<br>FORMULA</p>"), dict.calcInfoBlock.replace(formula, "<br>FORMULA</p>"), `${language}: existing qualifications preserved`);
  }

  rt.setInputs({evVerbrauch: 30, strompreis: 0.16, benzinpreis: 3.2, verbrauchVerbrenner: 26, kmEv: 100, kmVb: 100});
  assert.ok(Math.abs(rt.run("singleType='ev'; _getSingleData().totalCost") - (30 * 0.16 * 100 / 100)) < 1e-10);
  assert.ok(Math.abs(rt.run("singleType='vb'; _getSingleData().totalCost") - (100 / 26 * 3.2)) < 1e-10);

  for (const market of ["de", "eu", "tr"]) {
    rt.run(`window.EAF_I18N.setMarket('${market}')`);
    const dict = rt.context.window.EAF_I18N.translations[rt.context.window.EAF_I18N.getLanguage()];
    assert.equal(notice.innerHTML, dict.calcInfoBlock, `${market}: metric notice unchanged`);
    assert.doesNotMatch(notice.innerHTML, /mpg|US.gallon|US-Gallone|ABD galonu/);
  }
});

test("EVS-001 Geldwerte behalten Präzision bis zur Ausgabe", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 17, strompreis: 0.37, kmEv: 50 });
  const d = rt.run("singleType='ev'; _getSingleData()");
  assert.equal(d.costPer100, 6.29);
  assert.equal(d.totalCost, 3.145);
  assert.equal(d.yearlyCost, 37.74);
  assert.equal(rt.run("fmt(_getSingleData().totalCost)"), "3,15");
});

test("große zulässige Werte bleiben endlich", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 35, strompreis: 10, verbrauchVerbrenner: 20, benzinpreis: 80, kmShared: 10000 });
  const d = rt.run("_getCompareData()");
  assert.ok(Object.values(d).filter(v => typeof v === "number").every(Number.isFinite));
});

test("Fahrgemeinschaft teilt genau einmal durch Personenzahl", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const d = rt.run("rideshareActive=true; ridesharePersons=4; _getCompareData()");
  assert.equal(d.eAutoPerPerson, 15);
  assert.equal(d.verbrennerPerPerson, 31.5);
  assert.equal(d.savingsPerPerson, 16.5);
});

test("Langzeitwerte werden aus Monatsstrecke und Jahren kumuliert", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const summary = rt.run("longtermActive=true; kmMonat=1000; longtermYears=5; longtermPremium=5000; _getLongtermSummary(_getCompareData())");
  assert.equal(summary.evEnergyCost, 3600);
  assert.equal(summary.fuelCost, 7560);
  assert.equal(summary.operatingDifference, 3960);
  assert.equal(summary.netDifference, -1040);
  assert.equal(summary.distance, 60000);
});

test("Langzeit mit null Jahren berücksichtigt nur den Mehrpreis", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const summary = rt.run("longtermActive=true; kmMonat=1000; longtermYears=0; longtermPremium=5000; _getLongtermSummary(_getCompareData())");
  assert.equal(summary.evEnergyCost, 0);
  assert.equal(summary.fuelCost, 0);
  assert.equal(summary.netDifference, -5000);
});

test("Langzeit Break Even zieht den Mehrpreis genau einmal ab", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const summary = rt.run("longtermActive=true; kmMonat=1000; longtermYears=10; longtermPremium=5000; _getLongtermSummary(_getCompareData())");
  assert.equal(summary.operatingDifference, 7920);
  assert.equal(summary.netDifference, 2920);
});

test("teurerer EV Betrieb erhöht den verbleibenden Nachteil", () => {
  const rt = createRuntime();
  for (const id of ["longtermWrap", "ltEvTotal", "ltVbTotal", "ltBlockLoss", "ltLossVal", "ltBlockDone", "ltDoneVal", "ltBreakeven"]) rt.element(id);
  rt.run("longtermYears=5; longtermPremium=5000; kmMonat=1000; renderLongterm({yrEv:1800,yrVb:1200})");
  assert.match(rt.elements.get("ltLossVal").textContent, /8[.\s]000/);
});

test("Langzeit Teilen enthält keine Nullstrecke und keine Nullkosten", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const text = rt.run("longtermActive=true; kmMonat=1000; longtermYears=5; longtermPremium=5000; buildShareTextCompare(_getCompareData())");
  assert.match(text, /60[.\s]000 km/);
  assert.match(text, /3[.\s]600/);
  assert.doesNotMatch(text, /für 0 km/);
  assert.match(text, /www\.evspend\.com/);
});

test("DE Langzeit Ergebnistext nutzt neutrale Formulierung statt guenstiger, EN/TR unveraendert", () => {
  const rt = createRuntime();
  metricInputs(rt);
  const text = rt.run("longtermActive=true; kmMonat=1000; longtermYears=5; longtermPremium=1000; buildShareTextCompare(_getCompareData())");
  assert.doesNotMatch(text, /günstiger/);
  assert.match(text, /E-Auto rechnerisch niedriger/);
  assert.equal(rt.context.window.EAF_I18N.translations.en.shareLongtermEvAdvantage, "EV is lower in this calculation");
  assert.equal(rt.context.window.EAF_I18N.translations.tr.shareLongtermEvAdvantage, "Bu hesaplamada elektrikli daha düşük");
});

test("Teilen verwendet nach Eingabeänderung den neuen Wert", () => {
  const rt = createRuntime();
  metricInputs(rt, { kmShared: 1000 });
  const first = rt.run("longtermActive=false; buildShareTextCompare(_getCompareData())");
  rt.elements.get("kmShared").value = "2000";
  const second = rt.run("buildShareTextCompare(_getCompareData())");
  assert.notEqual(first, second);
  assert.match(second, /2[.\s]000/);
});

test("Moduswechsel bewahrt Direkt und Langzeiteingaben", () => {
  const rt = createRuntime();
  metricInputs(rt, { kmShared: 4321 });
  rt.run("kmMonat=1750; setLongtermActive(true); setLongtermActive(false)");
  assert.equal(rt.elements.get("kmShared").value, "4321");
  assert.equal(rt.run("kmMonat"), 1750);
});

test("Reset nutzt US Marktstandards und setzt Zustände zurück", () => {
  const rt = createRuntime();
  for (const id of ["rideshareToggle", "ridesharePersons", "longtermToggle", "longtermYears", "longtermPremium", "kmMonat", "noteInput"]) rt.element(id);
  metricInputs(rt);
  rt.run("window.EAF_I18N.getMarket=()=>window.EAF_I18N.market.us; appMode='single'; rideshareActive=true; longtermActive=true; reset()");
  assert.equal(rt.elements.get("strompreis").value, "0.16");
  assert.equal(rt.elements.get("benzinpreis").value, "3.2");
  assert.equal(rt.elements.get("verbrauchVerbrenner").value, "26");
  assert.equal(rt.run("appMode"), "compare");
  assert.equal(rt.run("longtermActive"), false);
});

test("fehlgeschlagenes Speichern startet keine Sperrzeit", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: -1 });
  rt.run("appMode='single'; singleType='ev'; saveEntrySafe()");
  assert.equal(rt.localStorage.getItem("lastSaveTime"), null);
});

test("beschädigte gespeicherte Eingaben werden verworfen oder begrenzt", () => {
  const rt = createRuntime();
  const slider = rt.element("evVerbrauch");
  slider.min = "8";
  slider.max = "35";
  rt.localStorage.setItem("eaf.inputs.v2", JSON.stringify({ evVerbrauch: 999, strompreis: "kaputt" }));
  rt.run("loadInputs()");
  assert.equal(String(slider.value), "35");
});

test("bewusster Share Abbruch löst keinen Fallback Fehler aus", async () => {
  const rt = createRuntime();
  metricInputs(rt);
  let clipboardCalls = 0;
  rt.navigator.share = async () => { const e = new Error("cancel"); e.name = "AbortError"; throw e; };
  rt.navigator.clipboard = { writeText: async () => { clipboardCalls += 1; } };
  await rt.run("longtermActive=false; appMode='compare'; shareText()");
  assert.equal(clipboardCalls, 0);
});

test("Share Fallback kopiert bei technischem Fehler", async () => {
  const rt = createRuntime();
  metricInputs(rt);
  let clipboardCalls = 0;
  rt.navigator.share = async () => { throw new Error("technical"); };
  rt.navigator.clipboard = { writeText: async () => { clipboardCalls += 1; } };
  await rt.run("longtermActive=false; appMode='compare'; shareText()");
  assert.equal(clipboardCalls, 1);
});

function loadHistoryTest(rt = createRuntime()) {
  let source = fs.readFileSync(new URL("../verlauf.js", import.meta.url), "utf8");
  const needle = "  if (migrationPending) migration.then(() => { refresh(); if (migrationError) mutationFailure(migrationError); });\n  else { refresh(); if (migrationError) mutationFailure(migrationError); }\n})();";
  assert.ok(source.includes(needle));
  source = source.replace(needle, "  window.__historyTest = { sanitize: _sanitizeImportEntry, loadAll, fmtMoneyEntry, numCell: _numCell };\n})();");
  vm.runInContext(source, rt.context, { filename: "verlauf.js" });
  return rt;
}

test("Verlauf Import berechnet manipulierte Ergebnisfelder neu", () => {
  const rt = loadHistoryTest();
  const entry = rt.context.window.__historyTest.sanitize({
    schema: "v2", type: "ev", date: 1, km: 100, consumption: 20, price: 0.3,
    costPer100: 999999, monthlyCost: 999999, yearlyCost: 999999,
  });
  assert.equal(entry.costPer100, 6);
  assert.equal(entry.monthlyCost, 6);
  assert.equal(entry.yearlyCost, 72);
});

test("Verlauf verwirft ungültige Einträge und begrenzt beschädigten Speicher", () => {
  const rt = loadHistoryTest();
  assert.equal(rt.context.window.__historyTest.sanitize({ schema: "v2", type: "ev", date: 1, km: -1, consumption: 20, price: 0.3 }), null);
  const entries = Array.from({ length: 80 }, (_, i) => ({ schema: "v2", type: "ev", date: i + 1 }));
  rt.localStorage.setItem("eautofakten_history", JSON.stringify(entries));
  assert.equal(rt.context.window.__historyTest.loadAll().length, 50);
});

test("EVS-009 Reichweite konvertiert erst für die Ausgabe und übersteht Eingabespeicherung", () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    const rt = createRuntime();
    metricInputs(rt, { batteryKwh: 75, evVerbrauch: 30 });
    rt.element("rangeDisplay");
    rt.run(`window.EAF_I18N.getMarketCode=()=> '${market}'; saveInputs(); updateRangeDisplay()`);
    const first = rt.elements.get("rangeDisplay").textContent;
    assert.match(first, market === "us" ? /250 mi/ : /250 km/);
    const stored = rt.localStorage.getItem("eaf.inputs.v2");
    assert.equal(JSON.parse(stored).evVerbrauch, "30");
    assert.equal(JSON.parse(stored).batteryKwh, "75");
    metricInputs(rt, { batteryKwh: 1, evVerbrauch: 1 });
    rt.run("loadInputs(); updateRangeDisplay()");
    assert.equal(rt.elements.get("rangeDisplay").textContent, first);
    assert.equal(rt.localStorage.getItem("eaf.inputs.v2"), stored);
    assert.ok(Math.abs(rt.run("computeRange(n('batteryKwh'), n('evVerbrauch'))") -
      (market === "us" ? 402.336 : 250)) < 1e-10);
    metricInputs(rt, { batteryKwh: 75, evVerbrauch: 0 });
    rt.run("updateRangeDisplay()");
    assert.equal(rt.elements.get("rangeDisplay").hidden, true);
  }
});

test("EVS-001 Auditfälle A und B bleiben unverändert korrekt", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 18, strompreis: .3, verbrauchVerbrenner: 6.5, benzinpreis: 1.8 });
  const a = rt.run("longtermActive=true; kmMonat=1250; _getCompareData()");
  for (const [key, expected] of Object.entries({evCost: 5.4, vbCost: 11.7, yrEv: 810, yrVb: 1755, diff: 945, kmJahr: 15000})) {
    assert.ok(Math.abs(a[key] - expected) < 1e-10, key);
  }
  metricInputs(rt, { evVerbrauch: 25, strompreis: .8, verbrauchVerbrenner: 6.5, benzinpreis: 1.8 });
  const b = rt.run("_getCompareData()");
  assert.equal(b.yrEv, 3000);
  assert.ok(Math.abs(b.diff - (-1245)) < 1e-10);
  assert.equal(rt.run("fmt(_getCompareData().diff)"), "-1.245,00");
});

test("EVS-001 Auditfall verwendet 971,25 pro Jahr und ungerundete Mehrjahreswerte", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 17.5, strompreis: .37, kmEv: 500, kmShared: 500 });
  const single = rt.run("_getSingleData()");
  const compare = rt.run("_getCompareData()");
  assert.equal(single.costPer100, 6.475);
  assert.equal(single.totalCost, 32.375);
  assert.equal(compare.eAutoTotal, single.totalCost);
  assert.equal(rt.run("fmt(_getSingleData().totalCost)"), "32,38");
  const annual = rt.run("longtermActive=true; kmMonat=1250; longtermYears=3; longtermPremium=1000; _getCompareData()");
  assert.equal(annual.yrEv, 971.25);
  assert.equal(rt.run("_getLongtermSummary(_getCompareData()).evEnergyCost"), 2913.75);
  assert.match(rt.run("buildShareTextCompare(_getCompareData())"), /2\.913,75/);
  rt.run("longtermActive=false; rideshareActive=true; ridesharePersons=3");
  assert.equal(rt.run("_getSingleData().costPerPerson"), 32.375 / 3);
});

test("EVS-001 Speichern Laden und Import erhalten rohe Kosten und v2 Kompatibilität", async () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    for (const type of ["ev", "vb"]) {
      const rt = createRuntime();
      metricInputs(rt, { evVerbrauch: 17.5, strompreis: .37, kmEv: 500, kmVb: 500 });
      rt.run(`window.EAF_I18N.getMarketCode=()=> '${market}'; window.EAF_I18N.getCurrency=()=> '${market === "us" ? "USD" : market === "tr" ? "TRY" : "EUR"}'; appMode='single'; singleType='${type}'`);
      const data = rt.run("_getSingleData()");
      assert.equal(await rt.run("saveQuick()"), true);
      const storage = rt.localStorage.getItem("eautofakten_history");
      const saved = JSON.parse(storage)[0];
      loadHistoryTest(rt);
      const history = rt.context.window.__historyTest;
      const imported = history.sanitize(saved);
      const loaded = history.loadAll()[0];
      for (const key of ["km", "consumption", "price", "costPer100", "monthlyCost", "yearlyCost"]) {
        assert.equal(saved[key], data[key], `${market}/${type}/${key}: saved`);
        assert.equal(imported[key], data[key], `${market}/${type}/${key}: imported`);
        assert.equal(loaded[key], data[key], `${market}/${type}/${key}: loaded`);
      }
      assert.equal(saved.schema, "v2");
      assert.equal(rt.localStorage.getItem("eautofakten_history"), storage);
      assert.equal(history.fmtMoneyEntry(imported.monthlyCost, imported), rt.run("_fmtMoney(_getSingleData().totalCost)"));
      // Previously rounded and metadata-free entries remain readable, without a rewrite.
      const legacy = JSON.stringify([{schema: "v2", type, date: 1, km: 500, consumption: 17.5, price: .37, costPer100: 6.48, monthlyCost: 32.4, yearlyCost: 388.8}]);
      rt.localStorage.setItem("eautofakten_history", legacy);
      assert.equal(history.loadAll()[0].monthlyCost, 32.4);
      assert.equal(history.fmtMoneyEntry(history.loadAll()[0].monthlyCost, history.loadAll()[0]), "32,40 €");
      assert.equal(rt.localStorage.getItem("eautofakten_history"), legacy);
    }
  }
});

test("EVS-001 Halbcentgrenzen sind in Rechner Verlauf und CSV identisch", () => {
  const rt = loadHistoryTest();
  const history = rt.context.window.__historyTest;
  for (const [value, expected] of [[23 * .35 * 50 / 100, "4,03"], [8.5 * .29, "2,47"], [8.5 * .35, "2,98"], [4.024999999, "4,02"], [4.025000001, "4,03"], [-4.025, "-4,03"], [-.0001, "0,00"]]) {
    rt.context.roundingInput = value;
    assert.equal(rt.run("fmt(roundingInput)"), expected);
    assert.equal(rt.run("_fmtMoney(roundingInput)"), expected + " €");
    assert.equal(history.fmtMoneyEntry(value), expected + " €");
    assert.equal(history.numCell(value, 2), expected);
  }
  assert.equal(rt.run("fmt(4.499999999999999, 0)"), "5");
  assert.equal(rt.run("fmt(1.23445, 4)"), "1,2345");
  assert.equal(rt.run("_roundForDisplay(Number.MAX_VALUE)"), Number.MAX_VALUE);
  assert.equal(rt.run("Object.is(_roundForDisplay(-.0001), -0)"), false);
});

test("EVS-001 US mpg Halbcentbetrag nutzt den vollständigen Umrechnungsfaktor", () => {
  const rt = createRuntime();
  metricInputs(rt, { verbrauchVerbrenner: 16, benzinpreis: 3, kmVb: 50 });
  rt.run("window.EAF_I18N.getMarketCode=()=> 'us'; window.EAF_I18N.getCurrency=()=> 'USD'; singleType='vb'");
  assert.ok(Math.abs(rt.run("_getSingleData().totalCost") - 9.375) < 1e-12);
  assert.equal(rt.run("_fmtMoney(_getSingleData().totalCost)"), "$9.38");
  assert.ok(Math.abs(rt.run("_iceConsumptionToMarket(n('verbrauchVerbrenner'))") - 16) < 1e-12);
});

test("EVS-001 Centdarstellung bestimmt Gleichstand und Vorzeichen der Ergebnistexte", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 20, strompreis: .3, verbrauchVerbrenner: 5, benzinpreis: 1.2, kmShared: 1 });
  rt.element("compareBadge");
  for (const [delta, equal] of [[.004, true], [.005, false], [-.005, false]]) {
    rt.elements.get("benzinpreis").value = String((6 + delta * 100) / 5);
    rt.run("calcCompare()");
    const badge = rt.elements.get("compareBadge").textContent;
    const sentence = rt.run("_resultSentence(_getCompareData(), 'compare', 'user')");
    assert.equal(badge === rt.run("_t('costsEqual')"), equal);
    if (!equal) assert.match(sentence, /0,01/);
  }
});

test("EVS-001 Dezimalreferenzmatrix prüft echte Produktionskosten ohne Zwischenrundung", () => {
  // Independent decimal-rational oracle from the audit, using integer arithmetic.
  const rational = value => {
    const [whole, fraction = ""] = String(value).split(".");
    return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
  };
  const rt = createRuntime();
  for (let i = 1; i <= 20; i++) {
    const consumption = 8 + i * .5, price = (10 + i * 3) / 100, km = 17 * i;
    const [num, den] = [consumption, price, km].map(rational).reduce(([a,b],[c,d]) => [a*c,b*d], [1n,100n]);
    const cents = (2n * num * 100n + den) / (2n * den);
    const expected = `${cents / 100n},${String(cents % 100n).padStart(2, "0")}`;
    metricInputs(rt, { evVerbrauch: consumption, strompreis: price, kmEv: km });
    assert.equal(rt.run("fmt(_getSingleData().totalCost)"), expected, `case ${i}`);
  }
});

test("EVS-001 Halbcentdifferenzen berücksichtigen die Genauigkeit der Kostenoperanden", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 20, strompreis: .5, verbrauchVerbrenner: 7, benzinpreis: 1.43, kmShared: 50 });
  rt.element("compareBadge");
  rt.run("calcCompare()");
  assert.equal(rt.run("_compareDifferenceForDisplay(_getCompareData())"), .01);
  assert.equal(rt.elements.get("compareBadge").textContent, rt.run("_t('evCheaper')"));
  assert.match(rt.run("_resultSentence(_getCompareData(), 'compare', 'user')"), /0,01/);
  assert.match(rt.run("buildShareTextCompare(_getCompareData())"), /0,01/);
  rt.run("rideshareActive=true; ridesharePersons=2");
  rt.elements.get("kmShared").value = "100";
  assert.equal(rt.run("_compareDifferenceForDisplay(_getCompareData(), true)"), .01);
  assert.match(rt.run("_resultSentence(_getCompareData(), 'compare', 'share')"), /0,01/);
  // The subtraction correction must not promote an actually lower difference.
  rt.elements.get("benzinpreis").value = "1.42999999";
  assert.equal(rt.run("_compareDifferenceForDisplay(_getCompareData(), true)"), 0);
  metricInputs(rt, { evVerbrauch: 20, strompreis: .5, verbrauchVerbrenner: 7, benzinpreis: 1.43 });
  rt.run("longtermActive=true; kmMonat=1250; longtermYears=1; longtermPremium=1.495");
  assert.equal(rt.run("_longtermDifferenceForDisplay(_getLongtermSummary(_getCompareData()))"), .01);
  assert.match(rt.run("buildShareTextCompare(_getCompareData())"), /0,01/);
});

test("EVS-001 exakter Mehrpreisausgleich toleriert ausschließlich Gleitkommafehler", async () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 17, strompreis: .4, verbrauchVerbrenner: 6, benzinpreis: 1.8 });
  for (const id of ["longtermWrap", "ltBlockLoss", "ltBlockDone", "ltBreakeven"]) rt.element(id);
  rt.run("longtermActive=true; kmMonat=1250; longtermYears=1; longtermPremium=600; renderLongterm(_getCompareData())");
  assert.equal(rt.elements.get("ltBlockDone").hidden, false);
  assert.equal(rt.elements.get("ltBlockLoss").hidden, true);
  assert.notEqual(rt.elements.get("ltBreakeven").textContent, rt.run("_t('noBreakeven')"));
  // A real remaining deficit, even below one cent, does not reach break even.
  rt.run("longtermPremium=600.000001; renderLongterm(_getCompareData())");
  assert.equal(rt.elements.get("ltBlockDone").hidden, true);
  assert.equal(rt.elements.get("ltBlockLoss").hidden, false);
});

const restoreInputDefaults = {
  evVerbrauch: 18, strompreis: .3, benzinpreis: 1.8,
  verbrauchVerbrenner: 6.5, kmEv: 50, kmVb: 50,
  kmShared: 1000, batteryKwh: 60, noteInput: "", marketSwitchLabel: ""
};

function reopenHistory(entries, id, market = "de", currency = "EUR") {
  const historyJson = JSON.stringify(entries);
  const rt = createRuntime({
    inputs: restoreInputDefaults,
    search: `?id=${id}`,
    storage: {
      "eaf.appVersion": "20260428-1",
      "eaf.market": market,
      "eaf.currency": currency,
      "eaf.language": market === "tr" ? "tr" : market === "de" ? "de" : "en",
      "eaf.inputs.v2": JSON.stringify(restoreInputDefaults),
      eautofakten_history: historyJson
    }
  });
  rt.dispatchDom("DOMContentLoaded");
  return {rt, historyJson};
}

async function saveScenario({market, type, values, note = "", persons = 1}) {
  const rt = createRuntime({inputs: restoreInputDefaults, storage: {"eaf.appVersion": "20260428-1"}});
  rt.dispatchDom("DOMContentLoaded");
  rt.run(`window.EAF_I18N.setMarket('${market}')`);
  rt.setInputs({...values, noteInput: note});
  rt.run(`appMode='single'; singleType='${type}'; ridesharePersons=${persons}; rideshareActive=${persons > 1}`);
  assert.equal(await rt.run("saveQuick()"), true);
  return JSON.parse(rt.localStorage.getItem("eautofakten_history"))[0];
}

test("EVS-002/003 gespeicherte DE und US Szenarien öffnen nach Neustart mit eigenen Einheiten und Währungen", async () => {
  const cases = [
    {market: "de", currency: "EUR", type: "ev", values: {kmEv: 100, evVerbrauch: 18, strompreis: .3}, expected: {km: 100, consumption: 18, price: .3}},
    {market: "us", currency: "USD", type: "ev", values: {kmEv: 100, evVerbrauch: 30, strompreis: .16}, expected: {km: 100, consumption: 30, price: .16}},
    {market: "us", currency: "USD", type: "vb", values: {kmVb: 100, verbrauchVerbrenner: 26, benzinpreis: 3.2}, expected: {km: 100, consumption: 26, price: 3.2}}
  ];
  for (const c of cases) {
    const entry = await saveScenario({market: c.market, type: c.type, values: c.values, note: `${c.market}-${c.type}`, persons: 3});
    const otherMarket = c.market === "us" ? "tr" : "us";
    const otherCurrency = c.market === "us" ? "TRY" : "USD";
    for (const [startingMarket, startingCurrency] of [[c.market, c.currency], [otherMarket, otherCurrency]]) {
      const {rt, historyJson} = reopenHistory([entry], entry.date, startingMarket, startingCurrency);
      assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), c.market);
      assert.equal(rt.run("window.EAF_I18N.getCurrency()"), c.currency);
      assert.equal(rt.run("appMode"), "single");
      assert.equal(rt.run("singleType"), c.type);
      const prefix = c.type === "ev"
        ? {km: "kmEv", consumption: "evVerbrauch", price: "strompreis"}
        : {km: "kmVb", consumption: "verbrauchVerbrenner", price: "benzinpreis"};
      assert.ok(Math.abs(Number(rt.elements.get(prefix.km).value) - c.expected.km) < 1e-9);
      assert.ok(Math.abs(Number(rt.elements.get(prefix.consumption).value) - c.expected.consumption) < 1e-9);
      assert.ok(Math.abs(Number(rt.elements.get(prefix.price).value) - c.expected.price) < 1e-9);
      assert.equal(rt.run("rideshareActive"), true);
      assert.equal(rt.run("ridesharePersons"), 3);
      assert.equal(rt.elements.get("noteInput").value, `${c.market}-${c.type}`);
      assert.equal(rt.elements.get("documentElement").getAttribute("lang"), c.market === "de" ? "de" : "en");
      assert.equal(rt.elements.get("marketSwitchLabel").textContent, `${c.market.toUpperCase()} · ${c.currency === "USD" ? "$" : "€"}`);
      assert.equal(rt.localStorage.getItem("eaf.market"), c.market);
      assert.equal(rt.localStorage.getItem("eaf.currency"), c.currency);
      assert.equal(rt.localStorage.getItem("eautofakten_history"), historyJson);
    }
  }
});

test("EVS-002/003 mehrere Szenarien behalten jeweils ihren eigenen Markt und ihre Währung", async () => {
  const scenarios = [
    await saveScenario({market: "de", type: "ev", values: {kmEv: 111, evVerbrauch: 18, strompreis: .3}, note: "DE"}),
    await saveScenario({market: "eu", type: "ev", values: {kmEv: 222, evVerbrauch: 19, strompreis: .31}, note: "EU"}),
    await saveScenario({market: "us", type: "ev", values: {kmEv: 123, evVerbrauch: 29, strompreis: .17}, note: "US"}),
    await saveScenario({market: "tr", type: "ev", values: {kmEv: 333, evVerbrauch: 20, strompreis: 2.7}, note: "TR"})
  ];
  scenarios.forEach((entry, index) => { entry.date = 400 + index; });
  const expected = {
    de: {currency: "EUR", language: "de", km: 111, note: "DE"},
    eu: {currency: "EUR", language: "en", km: 222, note: "EU"},
    us: {currency: "USD", language: "en", km: 123, note: "US"},
    tr: {currency: "TRY", language: "tr", km: 333, note: "TR"}
  };
  for (const entry of scenarios) {
    const {rt, historyJson} = reopenHistory(scenarios, entry.date, entry.marketCode === "tr" ? "us" : "tr", entry.marketCode === "tr" ? "USD" : "TRY");
    const exp = expected[entry.marketCode];
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), entry.marketCode);
    assert.equal(rt.run("window.EAF_I18N.getCurrency()"), exp.currency);
    assert.equal(rt.run("window.EAF_I18N.getLanguage()"), exp.language);
    assert.ok(Math.abs(Number(rt.elements.get("kmEv").value) - exp.km) < 1e-9);
    assert.equal(rt.elements.get("noteInput").value, exp.note);
    assert.equal(rt.localStorage.getItem("eautofakten_history"), historyJson);
  }
});

test("EVS-003 gespeicherte Metadaten schlagen spätere globale Markt und Währungswahl", async () => {
  const eur = await saveScenario({market: "de", type: "ev", values: {kmEv: 100, evVerbrauch: 18, strompreis: .3}});
  const usd = await saveScenario({market: "us", type: "ev", values: {kmEv: 100, evVerbrauch: 30, strompreis: .16}});
  eur.date = 501;
  usd.date = 502;
  let opened = reopenHistory([eur, usd], eur.date, "tr", "TRY").rt;
  assert.equal(opened.run("window.EAF_I18N.getMarketCode()+':'+window.EAF_I18N.getCurrency()"), "de:EUR");
  assert.equal(opened.run("_fmtMoney(_getSingleData().totalCost)"), "5,40 €");
  opened = reopenHistory([eur, usd], usd.date, "de", "EUR").rt;
  assert.equal(opened.run("window.EAF_I18N.getMarketCode()+':'+window.EAF_I18N.getCurrency()"), "us:USD");
  assert.equal(opened.run("_fmtMoney(_getSingleData().totalCost)"), "$4.80");
});

test("EVS-002/003 ältere v2 Metadaten werden ohne Migration deterministisch aufgelöst", () => {
  const oldWithMarket = {schema: "v2", type: "ev", date: 301, km: 160.9344, consumption: 30 / 1.609344, price: .16, marketCode: "us"};
  const oldWithCurrency = {schema: "v2", type: "ev", date: 302, km: 100, consumption: 18, price: 2.7, currencyMetadata: {code: "TRY", symbol: "₺", locale: "tr-TR"}};
  const oldWithoutMetadata = {schema: "v2", type: "ev", date: 303, km: 100, consumption: 18, price: .3};
  const entries = [oldWithMarket, oldWithCurrency, oldWithoutMetadata];
  for (const [entry, market, currency, km] of [[oldWithMarket, "us", "USD", 100], [oldWithCurrency, "tr", "TRY", 100], [oldWithoutMetadata, "de", "EUR", 100]]) {
    const {rt, historyJson} = reopenHistory(entries, entry.date, "us", "USD");
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), market);
    assert.equal(rt.run("window.EAF_I18N.getCurrency()"), currency);
    assert.ok(Math.abs(Number(rt.elements.get("kmEv").value) - km) < 1e-9);
    assert.equal(rt.localStorage.getItem("eautofakten_history"), historyJson);
  }
});

test("EVS-003 altes Vergleichsschema bleibt metrisch und EUR statt den globalen Markt zu übernehmen", () => {
  const legacy = {
    date: 304, km: 100,
    ev: {consumption: 18, price: .3},
    fuel: {consumption: 6.5, price: 1.8},
    result: {yearlySaving: 100}
  };
  const {rt, historyJson} = reopenHistory([legacy], legacy.date, "us", "USD");
  assert.equal(rt.run("window.EAF_I18N.getMarketCode()+':'+window.EAF_I18N.getCurrency()"), "de:EUR");
  assert.equal(rt.run("appMode"), "compare");
  assert.equal(Number(rt.elements.get("kmShared").value), 100);
  assert.equal(Number(rt.elements.get("evVerbrauch").value), 18);
  assert.equal(Number(rt.elements.get("strompreis").value), .3);
  assert.equal(Number(rt.elements.get("verbrauchVerbrenner").value), 6.5);
  assert.equal(Number(rt.elements.get("benzinpreis").value), 1.8);
  assert.equal(rt.localStorage.getItem("eautofakten_history"), historyJson);
});
