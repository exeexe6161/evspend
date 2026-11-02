import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import {createRuntime, historyKey} from "./history-runtime.mjs";

const read = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const inputs = {kmEv:50, kmVb:50, kmShared:1000, evVerbrauch:17, strompreis:.37, verbrauchVerbrenner:7, benzinpreis:1.85, batteryKwh:60,
  noteInput:"", marketSwitchLabel:"", singleHeroVal:"", kmEvV:"", kmVbV:"", kmSharedV:"", evVerbrauchV:"", strompreisV:"",
  verbrauchVerbrennerV:"", benzinpreisV:"", qSaveBtn:"", saveHint:"", ridesharePersons:1, ridesharePersonsV:"", rideshareToggle:"", longtermToggle:""};

for (const [file, market] of [["en-eu/init-eu.js", "eu"], ["tr/init-tr.js", "tr"]]) {
  test(`${file}: Seitenaufruf schreibt keinen Speicher, nur Hinweis ${market}`, () => {
    const calls = [];
    const ls = new Proxy({}, {get: (_, k) => (...a) => { calls.push([k, ...a]); return null; }});
    const win = {};
    vm.runInNewContext(read(file), {window: win, localStorage: ls, sessionStorage: ls});
    assert.equal(calls.length, 0);
    assert.equal(win.__EAF_PAGE_MARKET, market);
  });
}

test("lang-switch.js schreibt keine Marktpräferenz", () => {
  assert.doesNotMatch(read("lang-switch.js"), /setItem/);
});

test("Verlaufslinks verwenden Fragment statt Query; Altlinks bleiben lesbar", () => {
  const src = read("verlauf.js");
  assert.match(src, /"\.\/#id="/);
  assert.doesNotMatch(src, /"\.\/\?id="/);
  const entry = {schema:"v2", id:"eaf_"+"b".repeat(32), date:1700000000000, type:"ev", marketCode:"de", km:123, consumption:18, price:.3,
    costPer100:5.4, monthlyCost:6.642, yearlyCost:79.7, note:"", persons:1, ridesharing:false};
  const base = {"eaf.appVersion":"20260428-1", "eaf.market":"us", "eaf.rememberInputs":"1", [historyKey]: JSON.stringify([entry])};
  for (const opt of [{hash:`#id=${entry.id}`}, {search:`?id=${entry.id}`}]) {
    const rt = createRuntime({inputs, ...opt, storage:{...base}});
    rt.context.Event = class Event {constructor(t){this.type=t;}};
    rt.context.CustomEvent = class CustomEvent {constructor(t,o={}){this.type=t;this.detail=o.detail;}};
    rt.dispatchDom("DOMContentLoaded");
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), "de");
    assert.equal(rt.localStorage.getItem("eaf.market"), "us");
    assert.equal(rt.run("_getSingleData()").km, 123);
  }
});

test("Seitenmarkt (/tr/, /en-eu/) hat in der Sitzung Vorrang vor gespeicherter Wahl, ändert sie aber nie; ?market= hat Vorrang vor beidem", () => {
  for (const [stored, expected] of [[undefined, "tr"], ["de", "tr"], ["us", "tr"]]) {
    const st = {"eaf.appVersion":"20260428-1"};
    if (stored) st["eaf.market"] = stored;
    const rt = createRuntime({inputs, storage: st, pageMarket: "tr"});
    rt.context.Event = class Event {constructor(t){this.type=t;}};
    rt.context.CustomEvent = class CustomEvent {constructor(t,o={}){this.type=t;this.detail=o.detail;}};
    rt.dispatchDom("DOMContentLoaded");
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), expected);
    assert.equal(rt.localStorage.getItem("eaf.market"), stored ?? null);
  }
});

test("?market=us auf einer TR-Seite gewinnt, Speicher unverändert", () => {
  const rt = createRuntime({inputs, search: "?market=us", storage: {"eaf.appVersion":"20260428-1", "eaf.market":"de"}, pageMarket: "tr"});
  rt.context.Event = class Event {constructor(t){this.type=t;}};
  rt.context.CustomEvent = class CustomEvent {constructor(t,o={}){this.type=t;this.detail=o.detail;}};
  rt.dispatchDom("DOMContentLoaded");
  assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), "us");
  assert.equal(rt.localStorage.getItem("eaf.market"), "de");
});

test("lastSaveTime: Speicher-Cooldown nur im Arbeitsspeicher, keine persistente Schreibung", () => {
  const src = read("script.js");
  assert.doesNotMatch(src, /setItem\(\s*"lastSaveTime"/);
  assert.doesNotMatch(src, /getItem\(\s*"lastSaveTime"/);
  assert.match(src, /_lastSaveAt/);
});
