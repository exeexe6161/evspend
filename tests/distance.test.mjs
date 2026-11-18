import assert from "node:assert/strict";
import test from "node:test";
import { distanceRuntime, monthlySnapshot } from "./distance-runtime.mjs";
import { historyKey, historyRuntime } from "./history-runtime.mjs";

const key = "eaf.longtermKmMonat";
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test("H2: gültige US Reglerstellungen bleiben Quelle, Anzeige und Speicherwert", () => {
  const rt = distanceRuntime();
  const slider = rt.elements.get("kmMonat");
  assert.deepEqual([slider.min, slider.max, slider.step], ["50", "3100", "50"]);
  for (const value of [60, 110, 160, 1010, 3060]) {
    slider.value = String(value);
    slider.dispatchEvent({type: "input"});
    const state = monthlySnapshot(rt);
    assert.equal(state.raw, value);
    assert.equal(state.slider, String(value));
    assert.equal(state.stored, String(value));
    assert.equal(state.label, `${value.toLocaleString("en-US")} mi`);
    assert.equal(slider.getAttribute("aria-valuetext"), state.label);
    close(state.annual, value === 110 ? 2124.33408 : rt.run(`_distToKm(${value}) * 12`));
  }
});

test("H2: kanonische US Nachbarwerte werden nicht vom visuellen step quantisiert", () => {
  const rt = distanceRuntime();
  // These exercise the existing canonical setter and persistence domain,
  // not new free-entry UI: a native range input still selects its own grid.
  for (const value of [99, 100, 101, 109, 110, 111, 149, 150, 151, 110.25, 3099, 3100]) {
    rt.run(`setKmMonat(${value})`);
    assert.equal(rt.run("kmMonat"), value);
    assert.equal(rt.storage.get(key), String(value));
    rt.run("applyLongterm(); refreshSliderValues(); calc()");
    assert.equal(rt.run("kmMonat"), value);
    assert.equal(rt.storage.get(key), String(value));
  }
});

test("H2: US Produktgrenzen bleiben erhalten, 1 und 10 mi sind keine Monatsreglerwerte", () => {
  const rt = distanceRuntime();
  for (const [input, expected] of [[1,50], [10,50], [49.9,50], [60,60], [60.1,60.1], [3099.9,3099.9], [3100,3100], [3100.1,3100]]) {
    rt.run(`setKmMonat(${input})`);
    assert.equal(rt.run("kmMonat"), expected);
  }
  for (const value of ["NaN", "Infinity", "-Infinity"]) {
    rt.run(`setKmMonat(${value})`);
    assert.equal(rt.run("kmMonat"), 3100);
    assert.equal(rt.storage.get(key), "3100");
  }
});

for (const market of ["de", "eu", "tr"]) {
  test(`H2: ${market} km Grenzen, Reglerstellungen und feine Quellwerte`, () => {
    const rt = distanceRuntime(market);
    const slider = rt.elements.get("kmMonat");
    assert.deepEqual([slider.min, slider.max, slider.step], ["100", "5000", "50"]);
    for (const value of [100,150,1000,4950,5000]) {
      slider.value = String(value); slider.dispatchEvent({type:"input"});
      assert.equal(rt.run("kmMonat"), value);
      close(rt.run("longtermActive=true; _getCompareData().kmJahr"), value * 12);
    }
    for (const value of [101,109,110,111,149,151,1234.5,4999.9]) {
      rt.run(`setKmMonat(${value}); applyLongterm(); refreshSliderValues()`);
      assert.equal(rt.run("kmMonat"), value);
      assert.equal(rt.storage.get(key), String(value));
    }
    for (const [input, expected] of [[99.9,100], [100.1,100.1], [5000.1,5000]]) {
      rt.run(`setKmMonat(${input})`);
      assert.equal(rt.run("kmMonat"), expected);
    }
  });
}

test("H2: 110 mi sowie feine km und mi Werte überleben echten Zustandsneustart", () => {
  for (const [market, value] of [["us",110], ["us",110.25], ["de",1234], ["de",1234.5], ["eu",1234.5], ["tr",1234.5]]) {
    const first = distanceRuntime(market);
    first.run(`setKmMonat(${value}); setLongtermActive(true)`);
    const stored = Object.fromEntries(first.storage);
    const restarted = distanceRuntime(market, stored);
    assert.equal(restarted.run("kmMonat"), value);
    assert.equal(restarted.storage.get(key), String(value));
    assert.equal(restarted.run("window.EAF_I18N.getMarketCode()"), market);
    assert.equal(restarted.run("longtermActive"), true);
    close(monthlySnapshot(restarted).annual, monthlySnapshot(first).annual);
    restarted.run("applyLongterm(); refreshSliderValues(); calc()");
    assert.equal(restarted.run("kmMonat"), value);
    assert.equal(restarted.storage.get(key), String(value));
  }
});

test("H2: Formatierung und visuelles Snapping schreiben nicht in kanonische Distanz zurück", () => {
  const rt = distanceRuntime("de", {[key]:"1234.5"});
  // Simulate only the DOM value assignment that a coarse range sanitizes.
  // This is deliberately not claimed as proof of a browser implementation.
  const slider = rt.elements.get("kmMonat");
  let visual = Number(slider.value);
  Object.defineProperty(slider, "value", {
    get: () => String(visual),
    set: value => { visual = 100 + Math.round((Number(value) - 100) / 50) * 50; }
  });
  for (let i = 0; i < 3; i++) rt.run("applyLongterm(); refreshSliderValues(); saveInputs(); calc()");
  assert.equal(visual, 1250);
  assert.equal(rt.run("kmMonat"), 1234.5);
  assert.equal(rt.storage.get(key), "1234.5");
  assert.equal(rt.elements.get("kmMonatV").textContent, "1.235 km");
  close(rt.run("longtermActive=true; _getCompareData().kmJahr"), 14814);
});

test("H2: reale Umrechnungsfunktionen behalten mi und km über wiederholte Roundtrips", () => {
  const rt = distanceRuntime();
  for (const value of [1,10,60,99,100,101,109,110,111,149,150,151,250,1234.5,3100]) {
    close(rt.run(`_kmToDist(_rawToInternal('kmMonat', ${value}))`), value);
    close(rt.run(`_distToKm(_kmToDist(${value}))`), value);
    rt.run(`globalThis.h2Roundtrip = ${value}`);
    for (let i = 0; i < 20; i++) rt.run("h2Roundtrip = _kmToDist(_distToKm(h2Roundtrip))");
    close(rt.run("h2Roundtrip"), value);
    rt.run(`globalThis.h2Roundtrip = ${value}`);
    for (let i = 0; i < 20; i++) rt.run("h2Roundtrip = _distToKm(_kmToDist(h2Roundtrip))");
    close(rt.run("h2Roundtrip"), value);
  }
});

test("H2: 110 mi ist die Grundlage tatsächlicher Jahreskosten und Mehrjahreswerte", () => {
  const rt = distanceRuntime();
  rt.setInputs({evVerbrauch:30, strompreis:.16, verbrauchVerbrenner:26, benzinpreis:3.2});
  rt.run("setKmMonat(110); longtermActive=true; longtermYears=5; longtermPremium=5000");
  const d = rt.run("_getCompareData()");
  close(d.kmJahr, 2124.33408);
  // The native baseline deliberately has not received EVS-001. Verify its
  // existing money rounding unchanged; H2 only corrects its distance basis.
  const native = process.env.EVSPEND_H2_NATIVE === "1";
  close(d.yrEv, native ? 63.31 : 63.36);
  close(d.yrVb, native ? 162.51 : 162.46153846153845);
  const summary = rt.run("_getLongtermSummary(_getCompareData())");
  close(summary.evEnergyCost, native ? 316.55 : 316.8);
  close(summary.fuelCost, native ? 812.55 : 812.3076923076923);
});

test("H2: Wechsel inkompatibler Märkte behält bestehende Reset Semantik", () => {
  const rt = distanceRuntime("de");
  rt.run("setKmMonat(1234.5); window.EAF_I18N.setMarket('eu')");
  assert.equal(rt.run("kmMonat"), 1234.5);
  rt.run("window.EAF_I18N.setMarket('us')");
  assert.equal(rt.run("kmMonat"), 1000);
  assert.equal(rt.storage.get(key), "1000");
});

const tripValues = [0, 1, 29, 99, 100, 101, 249, 500, 501, 999, 10000];
const inputsKey = "eaf.inputs.v2";
const tripFields = {ev: "kmEv", vb: "kmVb", compare: "kmShared"};

function openTripEditor(rt, id) {
  rt.elements.get(id + "V").click();
  return rt.elements.get(id + "Edit");
}

function enterTrip(rt, id, value, method = "done") {
  const field = openTripEditor(rt, id);
  field.value = String(value);
  if (method === "blur") field.dispatchEvent({type: "blur"});
  else if (method === "enter") field.dispatchEvent({type: "keydown", key: "Enter", preventDefault() {}});
  else rt.elements.get(id + "Done").click();
  assert.equal(field.hidden, true);
}

const tripMarkets = {
  de: {locale:"de-DE", unit:"km", inputs:[18.5, .41, 6.7, 1.85]},
  eu: {locale:"en-IE", unit:"km", inputs:[14.5, .24, 8.1, 1.65]},
  tr: {locale:"tr-TR", unit:"km", inputs:[22, 4.25, 7.8, 67]},
  us: {locale:"en-US", unit:"mi", inputs:[32, .19, 27, 3.45]}
};

for (const [market, {locale, unit, inputs}] of Object.entries(tripMarkets)) {
  for (const [mode, id] of Object.entries(tripFields)) {
    test(`trip edit ${market} ${mode}: exact distance, calculation, slider and persistence`, () => {
      const rt = distanceRuntime(market);
      const [evVerbrauch, strompreis, verbrauchVerbrenner, benzinpreis] = inputs;
      rt.setInputs({evVerbrauch, strompreis, verbrauchVerbrenner, benzinpreis});
      rt.run(mode === "compare" ? "setMode('compare')" : `setMode('single'); setType('${mode}')`);
      const max = market === "us" ? 6000 : 10000;
      const sliderMax = mode === "compare" ? max : market === "us" ? 300 : 500;
      const slider = rt.elements.get(id);
      assert.deepEqual([slider.min, slider.max, slider.step], ["0", String(sliderMax), "1"]);
      const costs = mode === "compare" ? "_getCompareData()" : "_getSingleData()";
      for (const trip of tripValues.map(value => value === 10000 ? max : value)) {
        enterTrip(rt, id, trip);
        const data = rt.run(costs);
        const electric = trip * evVerbrauch * strompreis / 100;
        const combustion = market === "us" ? trip * benzinpreis / verbrauchVerbrenner
          : trip * verbrauchVerbrenner * benzinpreis / 100;
        if (mode === "compare") {
          close(data.eAutoTotal, electric);
          close(data.verbrennerTotal, combustion);
        } else close(data.totalCost, mode === "ev" ? electric : combustion);
        close(mode === "compare" ? data.kmEv : data.km, trip * (market === "us" ? 1.609344 : 1));
        const shown = Math.min(trip, sliderMax);
        assert.equal(Number(slider.value), shown);
        const label = `${trip.toLocaleString(locale)} ${unit}`;
        assert.ok(rt.elements.get(id + "V").textContent.startsWith(label));
        assert.equal(slider.getAttribute("aria-valuetext"), `${shown.toLocaleString(locale)} ${unit}`);
        assert.equal(JSON.parse(rt.storage.get(inputsKey))[id], String(trip));
      }
      const restored = distanceRuntime(market, Object.fromEntries(rt.storage));
      close(restored.run(`n('${id}')`), max * (market === "us" ? 1.609344 : 1));
      assert.equal(Number(restored.elements.get(id).value), sliderMax);
    });
  }
}

test("trip edit: draft isolation, validation, cancellation and slider takeover at maximum", () => {
  const rt = distanceRuntime("de");
  const id = "kmEv";
  enterTrip(rt, id, "10.000");
  const persisted = rt.storage.get(inputsKey);
  const slider = rt.elements.get(id);
  for (const invalid of ["", "-1", "NaN", "1e3", "1,5", "1.5", "10 000", "10001"]) {
    const field = openTripEditor(rt, id);
    field.value = invalid;
    field.dispatchEvent({type: "input"});
    rt.run("calc(); refreshSliderValues()");
    assert.equal(rt.run("n('kmEv')"), 10000);
    assert.equal(field.value, invalid);
    field.dispatchEvent({type: "blur"});
    assert.equal(rt.storage.get(inputsKey), persisted);
    assert.match(rt.elements.get("eaf-toast").textContent, /0.*10\.000 km/);
  }
  const field = openTripEditor(rt, id);
  field.value = "21";
  field.dispatchEvent({type: "keydown", key: "Escape", preventDefault() {}});
  assert.equal(rt.run("n('kmEv')"), 10000);
  assert.match(rt.elements.get(id + "V").textContent, /10\.000 km.*500 km/);
  slider.dispatchEvent({type: "pointerup"});
  assert.equal(rt.run("n('kmEv')"), 500);
  slider.value = "249";
  slider.dispatchEvent({type: "input"});
  assert.equal(openTripEditor(rt, id).value, "249");
  field.value = "501";
  field.dispatchEvent({type: "keydown", key: "Enter", preventDefault() {}});
  assert.equal(rt.run("n('kmEv')"), 501);
  enterTrip(rt, id, 0, "blur");
  assert.equal(rt.run("n('kmEv')"), 0);
});

test("trip edit: language, market, mode and reset retain existing switch rules", () => {
  const rt = distanceRuntime("de");
  enterTrip(rt, "kmEv", 999);
  rt.run("setMode('single'); setType('vb'); setType('ev'); window.EAF_I18N.setMarket('eu')");
  assert.equal(rt.run("n('kmEv')"), 999);
  assert.match(rt.elements.get("kmEvV").getAttribute("aria-label"), /Edit.*slider up to 500 km/);
  rt.run("window.EAF_I18N.setLanguage('tr')");
  assert.match(rt.elements.get("kmEvV").textContent, /sürgü en çok 500 km/);
  const draft = openTripEditor(rt, "kmEv");
  draft.value = "9999";
  rt.run("window.EAF_I18N.setMarket('us')");
  assert.equal(draft.hidden, true);
  assert.equal(rt.run("n('kmEv')"), 30 * 1.609344);
  assert.match(draft.getAttribute("aria-label"), /mi$/);
  enterTrip(rt, "kmEv", 999);
  rt.run("reset()");
  assert.equal(rt.run("n('kmEv')"), 30 * 1.609344);
});

test("trip edit: share and save/reopen preserve zero and out-of-slider single trips", async () => {
  for (const type of ["ev", "vb"]) {
    for (const trip of [0, 999, 10000]) {
      const rt = distanceRuntime("de");
      rt.run(`setMode('single'); setType('${type}')`);
      enterTrip(rt, tripFields[type], trip);
      const label = trip.toLocaleString("de-DE");
      assert.ok(rt.run("buildShareTextSingle(_getSingleData())").includes(label + " km"));
      assert.equal(await rt.run("saveQuick()"), true);
      const entries = rt.storage.get(historyKey);
      const entry = JSON.parse(entries)[0];
      assert.equal(entry.km, trip);
      rt.context.savedTrip = entry;
      assert.equal(rt.run("_restoreHistoryEntry(savedTrip)"), true);
      assert.equal(rt.run("_getSingleData().km"), trip);
      const history = historyRuntime({storage: {[historyKey]: entries}});
      const exporter = history.context.window.EAF_HISTORY_EXPORT;
      assert.equal(JSON.parse(exporter.json().data).entries[0].km, trip);
      assert.equal(Number(exporter.csv().data.split("\r\n")[1].split(";")[2]), trip);
    }
  }
  const rt = distanceRuntime("us");
  enterTrip(rt, "kmShared", 999);
  assert.match(rt.run("buildShareTextCompare(_getCompareData())"), /999 mi/);
});

test("trip edit: exact trip distances do not feed the long-term calculation", () => {
  for (const market of ["de", "eu", "tr", "us"]) {
    const rt = distanceRuntime(market);
    rt.run("setKmMonat(1234.5); setLongtermActive(true)");
    const longterm = () => rt.run("JSON.stringify([_getCompareData(), _getLongtermSummary(_getCompareData())])");
    const before = longterm();
    enterTrip(rt, "kmShared", 999);
    enterTrip(rt, "kmEv", 501);
    enterTrip(rt, "kmVb", 101);
    assert.equal(longterm(), before);
    assert.equal(rt.storage.get(key), "1234.5");
  }
});
