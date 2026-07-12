import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createRuntime() {
  const elements = new Map();
  const storage = new Map();
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
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    createElement: tag => element(`created-${tag}-${elements.size}`),
    createDocumentFragment: () => element(`fragment-${elements.size}`),
    execCommand() { return true; },
  };
  const navigator = { userAgent: "test", platform: "MacIntel", maxTouchPoints: 0 };
  const windowObject = {
    document, localStorage, sessionStorage: localStorage, navigator,
    location: { search: "", pathname: "/", href: "https://www.evspend.com/" },
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
    Array, Map, Set, Promise, console,
    File: class File {}, FileReader: class FileReader {},
    MutationObserver: class MutationObserver { observe() {} disconnect() {} },
    ResizeObserver: class ResizeObserver { observe() {} disconnect() {} },
    Image: class Image {}, CustomEvent: class CustomEvent {}, Event: class Event {},
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, performance: { now: () => 0 },
    alert() {}, confirm: () => true,
  });
  vm.runInContext(fs.readFileSync(new URL("../script.js", import.meta.url), "utf8"), context);
  const run = expression => vm.runInContext(expression, context);
  const setInputs = values => {
    for (const [id, value] of Object.entries(values)) {
      const el = elements.get(id) || element(id);
      el.value = String(value);
    }
  };
  return { context, elements, element, localStorage, navigator, run, setInputs };
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
  assert.equal(d.savingsTotal, 45.09);
});

test("Geldwerte werden konsistent auf Cent gerundet", () => {
  const rt = createRuntime();
  metricInputs(rt, { evVerbrauch: 17, strompreis: 0.37, kmEv: 50 });
  const d = rt.run("singleType='ev'; _getSingleData()");
  assert.equal(d.costPer100, 6.29);
  assert.equal(d.totalCost, 3.15);
  assert.equal(d.yearlyCost, 37.8);
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

function loadHistoryTest() {
  const rt = createRuntime();
  let source = fs.readFileSync(new URL("../verlauf.js", import.meta.url), "utf8");
  const needle = "  refresh();\n})();";
  assert.ok(source.includes(needle));
  source = source.replace(needle, "  window.__historyTest = { sanitize: _sanitizeImportEntry, loadAll: loadAll };\n})();");
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
