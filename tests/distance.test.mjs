import assert from "node:assert/strict";
import test from "node:test";
import { distanceRuntime, monthlySnapshot } from "./distance-runtime.mjs";

const key = "eaf.longtermKmMonat";
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test("H2: gültige US Reglerstellungen bleiben Quelle, Anzeige und Speicherwert", () => {
  const rt = distanceRuntime();
  const slider = rt.elements.get("kmMonat");
  assert.deepEqual([slider.min, slider.max, slider.step], ["60", "3100", "50"]);
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
  for (const [input, expected] of [[1,60], [10,60], [59.9,60], [60,60], [60.1,60.1], [3099.9,3099.9], [3100,3100], [3100.1,3100]]) {
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
