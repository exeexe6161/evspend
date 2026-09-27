import assert from "node:assert/strict";
import test from "node:test";
import { createRuntime, ready, historyRuntime, importFile, envelope, entry, historyKey, existingJson, assertFailed, importedSignal } from "./history-runtime.mjs";

test("EVS-004 gültiger Import bestätigt genau einen Commit und aktualisierte Ansicht", async () => {
  const rt = historyRuntime();
  await importFile(rt, envelope());
  assert.match(rt.alerts[0], /1 neue Einträge importiert, 0 übersprungen/);
  assert.equal(JSON.parse(rt.storage.get(historyKey)).length, 2);
  assert.equal(rt.elements.get("statEvN").textContent, "2 Einträge");
  assert.equal(rt.calls.filter(([m,k]) => m === "setItem" && k === historyKey).length, 1);
  assert.equal(rt.calls.filter(([m,k]) => m === "getItem" && k === historyKey).length, 2);
});

test("EVS-004 Syntax, Struktur und fachlich ungültige Datei verändern keine Daten", async () => {
  for (const value of ["{", {}, envelope([entry({km: -1})]), envelope([entry({consumption: 1e308, price: 1e308})]), envelope([{}])]) {
    const rt = historyRuntime();
    await importFile(rt, value);
    assertFailed(rt);
    assert.match(rt.alerts[0], /Import abgebrochen/);
  }
});

test("EVS-004 Dateilesefehler, Abbruch und synchrone FileReader Fehler melden keinen Erfolg", async () => {
  for (const fail of ["error", "abort", "throw", "constructor"]) {
    const rt = historyRuntime();
    if (fail === "constructor") rt.context.FileReader = class { constructor() { throw new Error("synthetic constructor failure"); } };
    await importFile(rt, envelope(), fail);
    assertFailed(rt);
  }
});

test("EVS-004 QuotaExceededError und SecurityError bewahren Daten und UI ohne Erfolg", async () => {
  for (const name of ["QuotaExceededError", "SecurityError"]) {
    const rt = historyRuntime();
    const count = rt.elements.get("statEvN").textContent;
    Object.assign(rt.fault, {setItem: true, key: historyKey, name});
    await importFile(rt, envelope());
    assert.equal(rt.storage.get(historyKey), existingJson);
    assert.equal(rt.elements.get("statEvN").textContent, count);
    assert.doesNotMatch(rt.alerts[0], importedSignal);
    assert.match(rt.alerts[0], /Import konnte nicht gespeichert/);
    assert.equal(rt.calls.filter(([m,k]) => m === "setItem" && k === historyKey).length, 1);
    delete rt.fault.setItem;
    rt.alerts.length = 0;
    await importFile(rt, envelope());
    assert.match(rt.alerts[0], /1 neue Einträge importiert/);
    assert.equal(JSON.parse(rt.storage.get(historyKey)).length, 2);
  }
});

test("EVS-004 fehlerhaftes Lesen bestehender Daten darf nicht als leerer Verlauf gelten", async () => {
  const rt = historyRuntime();
  Object.assign(rt.fault, {getItem: true, key: historyKey});
  await importFile(rt, envelope());
  assertFailed(rt);
  assert.match(rt.alerts[0], /Import konnte nicht gespeichert/);
});

test("EVS-004 beschädigter bestehender Verlauf wird beim Import nicht überschrieben", async () => {
  for (const raw of ["{", "null", "{}", "[null]"]) {
    const rt = historyRuntime();
    rt.storage.set(historyKey, raw);
    await importFile(rt, envelope());
    assert.equal(rt.storage.get(historyKey), raw);
    assert.doesNotMatch(rt.alerts[0], importedSignal);
    assert.match(rt.alerts[0], /Import konnte nicht gespeichert/);
  }
});

test("EVS-004 nachgelagerter Anzeigefehler erklärt den bereits gespeicherten Zustand", async () => {
  const rt = historyRuntime();
  rt.elements.get("histList").appendChild = () => { throw new Error("synthetic render failure"); };
  await importFile(rt, envelope());
  assert.equal(JSON.parse(rt.storage.get(historyKey)).length, 2);
  assert.equal(rt.alerts.length, 1);
  assert.doesNotMatch(rt.alerts[0], importedSignal);
  assert.match(rt.alerts[0], /Daten sind gespeichert.*Ansicht.*Seite neu laden/);
  // A new runtime displays exactly the committed entries; no rollback writes.
  const reloaded = historyRuntime({storage: Object.fromEntries(rt.storage)});
  assert.equal(reloaded.elements.get("statEvN").textContent, "2 Einträge");
});

test("EVS-004 ungültige Mischdatei bleibt atomar und gültige Duplikate bleiben stabil", async () => {
  const rt = historyRuntime();
  const fresh = entry({note: "new"});
  await importFile(rt, envelope([fresh, entry({km: -1})]));
  assertFailed(rt);
  rt.alerts.length = 0;
  await importFile(rt, envelope([fresh]));
  assert.match(rt.alerts[0], /1 neue Einträge importiert, 0 übersprungen/);
  const stored = rt.storage.get(historyKey);
  rt.calls.length = 0; rt.alerts.length = 0;
  await importFile(rt, envelope([fresh]));
  assert.equal(rt.storage.get(historyKey), stored);
  assert.match(rt.alerts[0], /0 neue Einträge importiert, 1 übersprungen/);
  assert.equal(rt.calls.filter(([m,k]) => m === "setItem" && k === historyKey).length, 0);
});

test("EVS-004 Speicherfehlermeldung ist in DE, EN und TR lokalisiert", async () => {
  for (const [market, message] of [["de", /Import konnte nicht gespeichert/], ["eu", /Import could not be saved/], ["tr", /İçe aktarma kaydedilemedi/]]) {
    const rt = historyRuntime({storage: {"eaf.market": market}});
    Object.assign(rt.fault, {setItem: true, key: historyKey});
    await importFile(rt, envelope());
    assert.match(rt.alerts[0], message);
    assert.doesNotMatch(rt.alerts[0], /synthetic|SecurityError/);
  }
});

test("EVS-005 normaler Start lädt Zustand und Einheiten vollständig", () => {
  const rt = ready({storage: {"eaf.mode": "single", "eaf.inputs.v2": JSON.stringify({evVerbrauch: 17.5, strompreis: .37, kmEv: 500})}});
  assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), "de");
  assert.equal(rt.elements.get("documentElement").getAttribute("lang"), "de");
  assert.equal(rt.run("appMode"), "single");
  assert.equal(rt.run("_getSingleData().totalCost"), 32.375);
  assert.equal(rt.run("_storageInitFailed"), false);
  assert.equal(rt.elements.get("eaf-toast").textContent, "");
});

test("EVS-005 Lesefehler, Schreibfehler und werfender Storage Zugriff lassen den Rechner starten", async () => {
  for (const options of [
    {fault: {getItem: true}}, {fault: {setItem: true, name: "QuotaExceededError"}}, {storageGetterThrows: true}
  ]) {
    const rt = ready(options);
    assert.equal(rt.elements.get("documentElement").getAttribute("lang"), "de");
    assert.equal(rt.run("typeof window.EAF_I18N.t"), "function");
    assert.equal(rt.elements.get("body").getAttribute("data-app-mode"), "compare");
    assert.equal(rt.elements.get("rangeDisplay").hidden, false);
    assert.match(rt.elements.get("rangeDisplay").textContent, /333 km/);
    assert.match(rt.elements.get("eaf-toast").textContent, /Gerätespeicher.*neu laden/);
    assert.equal(rt.elements.get("qSaveBtn").disabled, true);
    assert.equal(rt.elements.get("saveHint").hidden, false);
    assert.match(rt.elements.get("saveHint").textContent, /Gerätespeicher/);
    assert.equal(rt.elements.get("saveHint").getAttribute("role"), "status");
    assert.ok(Math.abs(rt.run("_getCompareData().eAutoTotal") - 54) < 1e-12);
    assert.equal(rt.storage.get(historyKey), existingJson);
    assert.equal(rt.calls.filter(([m]) => m === "removeItem").length, 0);
    assert.equal(await rt.run("saveQuick()"), false);
    assert.equal(rt.elements.get("eaf-toast").textContent, "Speichern nicht möglich");
    assert.doesNotThrow(() => rt.run("saveEntrySafe()"));
    // The actual seven-second PWA callback is safe after the failed start.
    for (const {fn, delay} of rt.timers.filter(t => t.delay === 7000)) fn();
  }
});

test("EVS-005 punktuelle Initialisierungslesefehler löschen oder überschreiben keine vorhandenen Werte", () => {
  for (const key of ["eaf.pwa.visits", "eaf.appVersion", "eaf.inputs.v2", "eautofakten_history", "eaf.longtermKmMonat", "eaf.market", "theme", "eaf.legacyPurgeDone", "eaf.history.v1"]) {
    const storedInputs = JSON.stringify({evVerbrauch: 17.5, strompreis: .37, kmEv: 500});
    const rt = ready({fault: {getItem: true, key}, storage: {"eaf.appVersion": "older", "eaf.inputs.v2": storedInputs}});
    assert.equal(rt.storage.get(historyKey), existingJson, key);
    assert.equal(rt.storage.get("eaf.inputs.v2"), storedInputs, key);
    assert.equal(rt.calls.filter(([m]) => m === "removeItem").length, 0, key);
    assert.match(rt.elements.get("eaf-toast").textContent, /Gerätespeicher/);
    rt.run("saveInputs()");
    assert.equal(rt.storage.get("eaf.inputs.v2"), storedInputs);
  }
});

test("EVS-005 beschädigte Eingaben und ungültiger Besuchszähler führen zu definiertem Zustand", () => {
  for (const raw of ["{", "null", "[]"]) {
    const rt = ready({storage: {"eaf.appVersion": "older", "eaf.inputs.v2": raw}});
    assert.equal(rt.storage.get("eaf.inputs.v2"), raw);
    assert.equal(rt.storage.get(historyKey), existingJson);
    assert.ok(Math.abs(rt.run("_getCompareData().eAutoTotal") - 54) < 1e-12);
    assert.match(rt.elements.get("eaf-toast").textContent, /Gerätespeicher/);
  }
  const rt = ready({storage: {"eaf.pwa.visits": "broken"}});
  assert.equal(rt.storage.get("eaf.pwa.visits"), "1");
  assert.equal(rt.run("_pwaCanShow()"), false);
});

test("EVS-005 Neustart nach Speicherfehler lädt unveränderte gespeicherte Daten", () => {
  const savedInputs = JSON.stringify({evVerbrauch: 17.5, strompreis: .37, kmEv: 500});
  const options = {storage: {"eaf.mode": "single", "eaf.inputs.v2": savedInputs}, fault: {getItem: true}};
  const rt = ready(options);
  const repeated = ready({...options, storage: Object.fromEntries(rt.storage)});
  assert.equal(repeated.storage.get("eaf.inputs.v2"), savedInputs);
  assert.equal(repeated.storage.get(historyKey), existingJson);
  const recovered = ready({storage: Object.fromEntries(repeated.storage)});
  assert.equal(recovered.run("_getSingleData().totalCost"), 32.375);
  assert.equal(recovered.run("_storageInitFailed"), false);
  assert.equal(recovered.elements.get("eaf-toast").textContent, "");
});

test("EVS-005 sichtbarer Speicherfehler ist in DE, EN und TR lokalisiert", () => {
  for (const [language, message] of [["de-DE", /Gerätespeicher/], ["en-GB", /Device storage/], ["tr-TR", /Cihaz depolaması/]]) {
    const rt = ready({language, fault: {getItem: true}});
    assert.match(rt.elements.get("eaf-toast").textContent, message);
    assert.doesNotMatch(rt.elements.get("eaf-toast").textContent, /synthetic|SecurityError/);
  }
});
