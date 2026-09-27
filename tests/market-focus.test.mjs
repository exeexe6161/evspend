import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class EventTargetStub {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  fire(type, event = {}) {
    if (!event.stopPropagation) event.stopPropagation = () => {};
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

function productionBlock(file) {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  if (file === "script.js") {
    const start = source.indexOf("  function initTopControls() {");
    const end = source.indexOf("\n\n  // Init:", start);
    assert.ok(start >= 0 && end > start, "calculator market controls found");
    return source.slice(start, end) + "\ninitTopControls();";
  }
  const start = source.indexOf("  (function initMarketPillVerlauf() {");
  const end = source.indexOf("\n\n  // ── Phase 3:", start);
  assert.ok(start >= 0 && end > start, "history market controls found");
  return source.slice(start, end);
}

function createHarness(file) {
  const documentEvents = new EventTargetStub();
  const button = new EventTargetStub();
  const menu = { hidden: true, style: { display: "none" } };
  const attributes = new Map();
  const selectedMarkets = [];
  let focusCalls = 0;

  button.setAttribute = (name, value) => attributes.set(name, value);
  button.focus = () => {
    focusCalls++;
    documentStub.activeElement = button;
  };

  const items = ["us", "tr"].map(code => {
    const item = new EventTargetStub();
    item.getAttribute = name => name === "data-market" ? code : null;
    item.classList = { toggle() {} };
    return item;
  });

  const documentStub = {
    activeElement: null,
    getElementById(id) {
      return id === "marketSwitch" ? button : id === "marketMenu" ? menu : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-market]" ? items : [];
    },
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
  };

  const location = { pathname: "/", href: "" };
  const context = {
    document: documentStub,
    location,
    localStorage: { setItem() {} },
    MARKET_KEY: "eaf.market",
    setMarket: code => selectedMarkets.push(code),
    _setMarketVerlauf: code => selectedMarkets.push(code),
    _setMarketPillLabel() {},
    _updateMarketMenuActive() {},
  };
  vm.runInNewContext(productionBlock(file), context, { filename: file });

  return {
    button,
    menu,
    items,
    location,
    selectedMarkets,
    attributes,
    get focusCalls() { return focusCalls; },
    fireDocument(type, event) { documentEvents.fire(type, event); },
    setActiveElement(element) { documentStub.activeElement = element; },
    get activeElement() { return documentStub.activeElement; },
  };
}

for (const file of ["script.js", "verlauf.js"]) {
  test(`${file}: Escape and toggle close return focus to the market trigger`, () => {
    const escape = createHarness(file);
    escape.button.fire("click");
    escape.fireDocument("keydown", { key: "Escape" });
    assert.equal(escape.focusCalls, 1);
    assert.equal(escape.activeElement, escape.button);
    assert.equal(escape.menu.hidden, true);
    assert.equal(escape.attributes.get("aria-expanded"), "false");

    const toggle = createHarness(file);
    toggle.button.fire("click");
    toggle.button.fire("click");
    assert.equal(toggle.focusCalls, 1);
    assert.equal(toggle.activeElement, toggle.button);
  });

  test(`${file}: selection without navigation returns focus`, () => {
    const harness = createHarness(file);
    harness.button.fire("click");
    harness.items[0].fire("click");
    assert.deepEqual(harness.selectedMarkets, ["us"]);
    assert.equal(harness.focusCalls, 1);
    assert.equal(harness.activeElement, harness.button);
    assert.equal(harness.location.href, "");
  });

  test(`${file}: navigation and outside close do not steal focus`, () => {
    const navigation = createHarness(file);
    navigation.button.fire("click");
    navigation.items[1].fire("click");
    assert.equal(navigation.focusCalls, 0);
    assert.match(navigation.location.href, /^\/tr\//);

    for (const eventType of ["click", "touchstart"]) {
      const outside = createHarness(file);
      const outsideTarget = { closest: () => null };
      outside.button.fire("click");
      outside.setActiveElement(outsideTarget);
      outside.fireDocument(eventType, { target: outsideTarget });
      assert.equal(outside.focusCalls, 0);
      assert.equal(outside.activeElement, outsideTarget);
      assert.equal(outside.menu.hidden, true);
    }
  });
}
