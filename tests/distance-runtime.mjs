import { createRuntime } from "./history-runtime.mjs";

// Use the existing VM adapter with the real calculator and registered input
// handler. This is not a browser range implementation or a device proof.
function distanceRuntime(market = "us", storage = {}) {
  const rt = createRuntime({
    storage: { "eaf.appVersion": "20260428-1", "eaf.market": market, ...storage },
    inputs: {
      evVerbrauch: 17, strompreis: .37, benzinpreis: 1.85, verbrauchVerbrenner: 7,
      kmEv: 50, kmVb: 50, kmShared: 1000, batteryKwh: 60,
      kmMonat: 1000, longtermPremium: 5000, longtermYears: 10,
      ridesharePersons: 1, marketSwitchLabel: "", qSaveBtn: "", saveHint: "",
      rangeDisplay: "", longtermYearsV: "", longtermPremiumV: "",
      kmMonatV: "", ltKmJahr: "", ltKmWarn: "", singleHeroVal: ""
    }
  });
  // The older generic test adapter uses empty Event stubs. Preserve type so
  // real market-change and input dispatches reach their registered handlers.
  rt.context.Event = class Event { constructor(type) { this.type = type; } };
  rt.context.CustomEvent = class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
  rt.dispatchDom("DOMContentLoaded");
  return rt;
}

function monthlySnapshot(rt) {
  const slider = rt.elements.get("kmMonat");
  return {
    market: rt.run("window.EAF_I18N.getMarketCode()"),
    range: { min: slider.min, max: slider.max, step: slider.step },
    slider: slider.value,
    raw: rt.run("kmMonat"),
    stored: rt.storage.get("eaf.longtermKmMonat") ?? null,
    label: rt.elements.get("kmMonatV").textContent,
    annual: rt.run("longtermActive=true; _getCompareData().kmJahr"),
    costs: rt.run("JSON.parse(JSON.stringify(_getCompareData()))")
  };
}

export { distanceRuntime, monthlySnapshot };
