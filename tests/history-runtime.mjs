import assert from "node:assert/strict";
import fs from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { createLockManager } from "./history-locks.mjs";

import { pathToFileURL } from "node:url";

const rootUrl = process.env.EVSPEND_TEST_ROOT
  ? pathToFileURL(process.env.EVSPEND_TEST_ROOT + "/") : new URL("../", import.meta.url);

function createRuntime(options = {}) {
  class RuntimeDate extends Date {}
  const elements = new Map();
  const storage = options.storageMap || new Map(Object.entries(options.storage || {}));
  const locks = options.locks === undefined ? createLockManager() : options.locks;
  const tasks = new Set();
  function track(value) {
    if (value && typeof value.then === "function") {
      const task = Promise.resolve(value); tasks.add(task);
      task.then(() => tasks.delete(task), () => tasks.delete(task));
    }
    return value;
  }
  async function settle() {
    do {
      await Promise.all([...tasks]);
      if (locks && locks.idle) await locks.idle();
      await Promise.resolve();
    } while (tasks.size || (locks && locks.pending));
  }
  const domEvents = new Map();
  const alerts = [], calls = [], timers = [], blobs = [];
  const fault = options.fault || {};
  function storageAccess(method, key) {
    calls.push([method, key]);
    if (fault[method] && (!fault.key || fault.key === key)) {
      const error = new Error("synthetic storage failure");
      error.name = fault.name || "SecurityError";
      throw error;
    }
  }
  const localStorage = {
    getItem: key => { storageAccess("getItem", key); return storage.has(key) ? storage.get(key) : null; },
    setItem: (key, value) => { storageAccess("setItem", key); storage.set(key, String(value)); },
    removeItem: key => { storageAccess("removeItem", key); storage.delete(key); },
    clear: () => storage.clear(),
  };
  function element(id, value = "") {
    const attributes = new Map();
    const events = new Map();
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
      children: [],
      get firstChild() { return this.children[0] || null; },
      removeChild(child) { this.children.splice(this.children.indexOf(child),1); return child; },
      set innerHTML(value) { this.children = []; },
      get innerHTML() { return ""; },
      style: {},
      dataset: {},
      files: [],
      offsetParent: {},
      className: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]); }, removeEventListener() {},
      dispatchEvent(event) { for (const fn of events.get(event.type) || []) track(fn(event)); }, appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      replaceChildren(...children) { this.children = children; }, remove() {}, focus() {}, select() {}, click() { this.dispatchEvent({type:"click", stopPropagation() {}}); }, scrollIntoView() {},
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
    dispatchEvent(event) { for (const fn of domEvents.get(event.type) || []) track(fn(event)); },
    createElement: tag => element(`created-${tag}-${elements.size}`),
    createDocumentFragment: () => element(`fragment-${elements.size}`),
    execCommand() { return true; },
  };
  const navigator = {
    userAgent: "test", platform: "MacIntel", maxTouchPoints: 0,
    locks, language: options.language || "de-DE", languages: options.languages || [options.language || "de-DE"]
  };
  const windowObject = {
    document, localStorage, sessionStorage: localStorage, navigator, crypto: options.crypto ?? webcrypto,
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
    URL: {createObjectURL(blob) { blobs.push(blob); return "blob:test"; }, revokeObjectURL() {}}, URLSearchParams, Blob, Intl, Date: RuntimeDate, Math, JSON, Number, String, Object,
    Array, Map, Set, Promise, console, Uint8Array,
    File: class File {}, FileReader: class FileReader {
      readAsText(file) {
        if (file.fail === "throw") throw new Error("synthetic read failure");
        if (file.fail === "error") { this.onerror(); return; }
        if (file.fail === "abort") { this.onabort(); return; }
        this.result = file.content;
        if (file.gate) track(file.gate.then(() => this.onload()));
        else track(this.onload());
      }
    },
    MutationObserver: class MutationObserver { observe() {} disconnect() {} },
    ResizeObserver: class ResizeObserver { observe() {} disconnect() {} },
    Image: class Image {}, CustomEvent: class CustomEvent {}, Event: class Event {},
    setTimeout: (fn, delay) => { timers.push({fn, delay}); return timers.length; }, clearTimeout() {}, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, performance: { now: () => 0 },
    alert(msg) { alerts.push(msg); }, confirm: () => true,
  });
  for (const [id, value] of Object.entries(options.inputs || {})) element(id, value);
  if (options.storageGetterThrows) {
    for (const target of [context, windowObject]) Object.defineProperty(target, "localStorage", {get() { throw new DOMException("synthetic denied storage", "SecurityError"); }});
  }
  element("eaf-toast");
  const script = process.env.EVSPEND_TEST_MINIFIED === "1" ? "script.min.js" : "script.js";
  if (!options.historyCoordinatorMissing) vm.runInContext(fs.readFileSync(new URL("history-store.js", rootUrl), "utf8"), context);
  vm.runInContext(fs.readFileSync(new URL(`${script}`, rootUrl), "utf8"), context);
  const run = expression => vm.runInContext(expression, context);
  const setInputs = values => {
    for (const [id, value] of Object.entries(values)) {
      const el = elements.get(id) || element(id);
      el.value = String(value);
    }
  };
  return {
    context, elements, element, localStorage, navigator, locks, settle, run, setInputs, alerts, fault, calls, storage, timers, blobs,
    dispatchDom(name) { for (const fn of domEvents.get(name) || []) track(fn({type: name})); }
  };
}

const defaults = {
  evVerbrauch: 18, strompreis: .3, benzinpreis: 1.8, verbrauchVerbrenner: 6.5,
  kmEv: 50, kmVb: 50, kmShared: 1000, batteryKwh: 60, marketSwitchLabel: "",
  qSaveBtn: "", saveHint: "", rangeDisplay: "", longtermYearsV: "", singleHeroVal: ""
};
const entry = (overrides = {}) => ({
  schema: "v2", type: "ev", date: Date.now(), km: 100, consumption: 18, price: .3,
  costPer100: 5.4, monthlyCost: 5.4, yearlyCost: 64.8, note: "existing",
  marketCode: "de", language: "de", currencyMetadata: {code: "EUR", symbol: "€", locale: "de-DE"},
  ...overrides
});
const historyKey = "eautofakten_history";
const existingJson = JSON.stringify([entry({date: Date.now() - 1000})]);
function ready(options = {}) {
  const rt = createRuntime({inputs: defaults, ...options, storage: {
    "eaf.appVersion": "20260428-1", "eaf.market": "de", "eaf.verlauf.period": "all",
    [historyKey]: existingJson, ...options.storage
  }});
  rt.dispatchDom("DOMContentLoaded");
  return rt;
}
function historyRuntime(options) {
  const rt = ready(options);
  for (const id of ["histList", "histClearBtn", "legacyList", "histExportBtn", "histImportBtn", "histImportInput", "statCount",
    "statsEmpty", "statBlockEv", "statBlockVb", "statEvN", "statEvTotal", "statEvAvgCost", "statEvAvgPerEntry",
    "statEvLowest", "statVbN", "statVbTotal", "statVbAvgCost", "statVbAvgPerEntry", "statVbLowest", "statsCaveat"]) rt.element(id);
  const script = process.env.EVSPEND_TEST_MINIFIED === "1" ? "verlauf.min.js" : "verlauf.js";
  // No source rewriting: exercise the registered production file-input handler.
  vm.runInContext(fs.readFileSync(new URL(script, rootUrl), "utf8"), rt.context);
  rt.calls.length = 0;
  return rt;
}
async function importFile(rt, value, fail, gate) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const input = rt.elements.get("histImportInput");
  input.files = [{content: text, size: Buffer.byteLength(text), fail, gate}];
  input.value = "selected-file";
  input.dispatchEvent({type: "change"});
  assert.equal(input.value, "");
  await rt.settle();
}
const envelope = (entries = [entry({note: "new"})]) => ({app: "evspend", kind: "history-export", schemaVersion: 1, entries});
const importedSignal = /(?:\d+ neue Einträge importiert|\d+ new entries imported|\d+ yeni kayıt içe aktarıldı)/;
function assertFailed(rt) {
  assert.equal(rt.storage.get(historyKey), existingJson);
  assert.equal(rt.alerts.length, 1);
  assert.doesNotMatch(rt.alerts[0], importedSignal);
  assert.equal(rt.calls.filter(([method,key]) => method === "setItem" && key === historyKey).length, 0);
}


export { createRuntime, ready, historyRuntime, importFile, envelope, entry, historyKey, existingJson, assertFailed, importedSignal };
