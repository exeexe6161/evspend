import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { createLockManager, deferred } from "./history-locks.mjs";
import { ready, historyRuntime, importFile, envelope, entry } from "./history-runtime.mjs";

const historyStoreSource = fs.readFileSync(new URL("../history-store.js", import.meta.url), "utf8");
const historyKey = "eautofakten_history";
const legacyKey = "eaf.history.v1";
const lockName = "evspend:history:v1";
const idA = "eaf_" + "a".repeat(32);
const idB = "eaf_" + "b".repeat(32);
const idC = "eaf_" + "c".repeat(32);
const idImport = "eaf_" + "d".repeat(32);

function createCoordinatorRuntime({ storageMap = new Map(), locks = createLockManager(), fault = {} } = {}) {
  const calls = [];
  const localStorage = {
    getItem(key) {
      calls.push(["getItem", key]);
      if (fault.getItem && (!fault.key || fault.key === key)) throw storageError(fault.name);
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      calls.push(["setItem", key]);
      if (fault.setItem && (!fault.key || fault.key === key)) {
        if (typeof fault.setItem === "number") fault.setItem--;
        if (fault.setItem === true || fault.setItem >= 0) throw storageError(fault.name);
      }
      storageMap.set(key, String(value));
    },
    removeItem(key) {
      calls.push(["removeItem", key]);
      if (fault.removeItem && (!fault.key || fault.key === key)) throw storageError(fault.name);
      storageMap.delete(key);
    },
  };
  const navigator = {};
  if (locks !== null) navigator.locks = locks;
  const windowObject = { localStorage, navigator };
  windowObject.window = windowObject;
  const context = vm.createContext({
    window: windowObject,
    localStorage,
    navigator,
    JSON,
    Object,
    Array,
    Promise,
    Error,
  });
  vm.runInContext(historyStoreSource, context, { filename: "history-store.js" });
  return {
    context,
    calls,
    fault,
    locks,
    storageMap,
    run(expression) { return vm.runInContext(expression, context); },
  };
}

function storageError(name = "QuotaExceededError") {
  const error = new Error("synthetic storage failure");
  error.name = name;
  return error;
}

function stored(map) {
  return JSON.parse(map.get(historyKey) || "[]");
}

function addEntry(runtime, id, extra = "") {
  runtime.context.testEntryId = id;
  runtime.context.testEntryExtra = extra;
  return runtime.run(`window.EAF_HISTORY.mutate(entries => {
    entries.push({id: testEntryId, payload: testEntryExtra});
    return {entries, result: testEntryId};
  })`);
}

function appStorage(entries) {
  return new Map(Object.entries({
    "eaf.appVersion": "20260428-1",
    "eaf.market": "de",
    "eaf.language": "de",
    "eaf.currency": "EUR",
    "eaf.verlauf.period": "all",
    [historyKey]: JSON.stringify(entries),
  }));
}

function prepareSave(runtime, note) {
  const noteInput = runtime.elements.get("noteInput") || runtime.element("noteInput");
  noteInput.value = note;
  runtime.run("appMode='single'; singleType='ev'");
  return runtime.run("saveQuick()");
}

async function holdHistoryLock(locks) {
  const entered = deferred();
  const release = deferred();
  const promise = locks.request(lockName, {mode: "exclusive"}, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  return {release, promise};
}

async function waitForRequested(locks, expected) {
  for (let turn = 0; turn < 20; turn++) {
    if (locks.events.filter(event => event.type === "requested").length >= expected) return;
    await Promise.resolve();
  }
  assert.fail(`expected ${expected} lock requests`);
}

test("H1 Lock Manager vergibt denselben Namen FIFO und gibt ihn nach Fehler frei", async () => {
  const locks = createLockManager();
  const entered = deferred();
  const release = deferred();
  const order = [];

  const first = locks.request(lockName, {mode: "exclusive"}, async () => {
    order.push("first-enter");
    entered.resolve();
    await release.promise;
    order.push("first-exit");
  });
  await entered.promise;
  const second = locks.request(lockName, {mode: "exclusive"}, () => {
    order.push("second");
    throw new Error("expected failure");
  });
  const third = locks.request(lockName, {mode: "exclusive"}, () => order.push("third"));

  assert.deepEqual(order, ["first-enter"]);
  release.resolve();
  await first;
  await assert.rejects(second, /expected failure/);
  await third;
  await locks.idle();

  assert.deepEqual(order, ["first-enter", "first-exit", "second", "third"]);
  assert.equal(locks.pending, 0);
  assert.deepEqual(
    locks.events.filter(event => event.type === "granted").map(event => event.ticket),
    [1, 2, 3]
  );
});

test("H1 zwei Produktionscoordinatoren lesen im Lock frisch und bewahren A B und C", async () => {
  const originalC = {id: "C", nested: {value: 3}, untouched: true};
  const storageMap = new Map([[historyKey, JSON.stringify([originalC])]]);
  const locks = createLockManager();
  const a = createCoordinatorRuntime({storageMap, locks});
  const b = createCoordinatorRuntime({storageMap, locks});
  const entered = deferred();
  const release = deferred();
  const blocker = locks.request(lockName, {mode: "exclusive"}, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;

  const saveA = addEntry(a, "A", "first context");
  const saveB = addEntry(b, "B", "second context");
  assert.deepEqual(stored(storageMap), [originalC]);
  release.resolve();

  assert.deepEqual(await Promise.all([saveA, saveB]), ["A", "B"]);
  await blocker;
  await locks.idle();
  const final = stored(storageMap);
  assert.deepEqual(final.map(entry => entry.id), ["C", "A", "B"]);
  assert.equal(JSON.stringify(final[0]), JSON.stringify(originalC));
});

test("H1 Speicherfehler verliert nichts und vergiftet die nächste Mutation nicht", async () => {
  const original = [{id: "C", value: 3}];
  const storageMap = new Map([[historyKey, JSON.stringify(original)]]);
  const locks = createLockManager();
  const fault = {setItem: 1, key: historyKey, name: "QuotaExceededError"};
  const runtime = createCoordinatorRuntime({storageMap, locks, fault});

  await assert.rejects(addEntry(runtime, "A"), error => error.name === "QuotaExceededError");
  assert.deepEqual(stored(storageMap), original);
  assert.equal(locks.pending, 0);

  assert.equal(await addEntry(runtime, "B"), "B");
  await locks.idle();
  assert.deepEqual(stored(storageMap).map(entry => entry.id), ["C", "B"]);
});

test("H1 fehlende Web Locks API und ungültiger Speicher bleiben fail closed", async () => {
  const validMap = new Map([[historyKey, JSON.stringify([{id: "C"}])]]);
  const unsupported = createCoordinatorRuntime({storageMap: validMap, locks: null});
  await assert.rejects(
    addEntry(unsupported, "A"),
    error => error && error.code === "HISTORY_COORDINATION_UNAVAILABLE"
  );
  assert.deepEqual(stored(validMap), [{id: "C"}]);
  assert.equal(unsupported.calls.filter(([method]) => method === "setItem").length, 0);

  const invalidMap = new Map([[historyKey, "{broken"]]);
  const invalid = createCoordinatorRuntime({storageMap: invalidMap});
  await assert.rejects(addEntry(invalid, "A"));
  assert.equal(invalidMap.get(historyKey), "{broken");
  assert.equal(invalid.calls.filter(([method]) => method === "setItem").length, 0);
});

test("H1 Coordinator begrenzt pro Kontext ausstehende Mutationen auf 64", async () => {
  const storageMap = new Map([[historyKey, "[]"]]);
  const locks = createLockManager();
  const runtime = createCoordinatorRuntime({storageMap, locks});
  const entered = deferred();
  const release = deferred();
  const blocker = locks.request(lockName, {mode: "exclusive"}, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;

  const pending = [];
  for (let index = 0; index < 64; index++) {
    pending.push(runtime.run(`window.EAF_HISTORY.mutate(entries => ({entries, write:false, result:${index}}))`));
  }
  await assert.rejects(
    runtime.run("window.EAF_HISTORY.mutate(entries => ({entries, write:false}))"),
    error => error && error.code === "HISTORY_QUEUE_FULL"
  );
  assert.equal(locks.pending, 65);

  release.resolve();
  await blocker;
  assert.deepEqual(await Promise.all(pending), Array.from({length: 64}, (_, index) => index));
  await locks.idle();
  assert.deepEqual(stored(storageMap), []);
});

test("H1 Migration und späterer Save teilen dieselbe lineare Commitgrenze", async () => {
  const legacy = [{id: 10, value: "legacy"}];
  const storageMap = new Map([
    [historyKey, "[]"],
    [legacyKey, JSON.stringify(legacy)],
  ]);
  const locks = createLockManager();
  const migrationRuntime = createCoordinatorRuntime({storageMap, locks});
  const saveRuntime = createCoordinatorRuntime({storageMap, locks});
  const entered = deferred();
  const release = deferred();
  const blocker = locks.request(lockName, {mode: "exclusive"}, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;

  const migration = migrationRuntime.run(`window.EAF_HISTORY.migrate(old => ({
    date: old.id,
    migratedValue: old.value
  }))`);
  const save = addEntry(saveRuntime, "new-save");
  release.resolve();

  await Promise.all([blocker, migration, save]);
  await locks.idle();
  assert.equal(storageMap.has(legacyKey), false);
  assert.deepEqual(stored(storageMap), [
    {date: 10, migratedValue: "legacy"},
    {id: "new-save", payload: ""},
  ]);
});

test("H1 fehlgeschlagene Migration behält den Legacy Key und kann erneut laufen", async () => {
  const storageMap = new Map([
    [historyKey, "[]"],
    [legacyKey, JSON.stringify([{id: 10}])],
  ]);
  const locks = createLockManager();
  const fault = {setItem: 1, key: historyKey, name: "QuotaExceededError"};
  const runtime = createCoordinatorRuntime({storageMap, locks, fault});

  await assert.rejects(runtime.run("window.EAF_HISTORY.migrate(old => ({date: old.id}))"));
  assert.equal(storageMap.get(legacyKey), JSON.stringify([{id: 10}]));
  assert.deepEqual(stored(storageMap), []);

  await runtime.run("window.EAF_HISTORY.migrate(old => ({date: old.id}))");
  await locks.idle();
  assert.equal(storageMap.has(legacyKey), false);
  assert.deepEqual(stored(storageMap), [{date: 10}]);
});

test("H1 Mutationsvertrag erzwingt synchronen Transform und bestehende 50er Grenze", async () => {
  const original = [{id: "C"}];
  const storageMap = new Map([[historyKey, JSON.stringify(original)]]);
  const runtime = createCoordinatorRuntime({storageMap});

  await assert.rejects(
    runtime.run("window.EAF_HISTORY.mutate(async entries => ({entries}))"),
    error => error && error.code === "HISTORY_INVALID_MUTATION"
  );
  assert.deepEqual(stored(storageMap), original);

  await assert.rejects(
    runtime.run(`window.EAF_HISTORY.mutate(entries => ({
      entries: Array.from({length: 51}, (_, index) => ({id: String(index)}))
    }))`),
    error => error && error.code === "HISTORY_INVALID_MUTATION"
  );
  assert.deepEqual(stored(storageMap), original);
});

test("H1 echte saveQuick Pfade zweier Kontexte bestätigen beide Saves und bewahren C", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: {keep: true}});
  const cBefore = JSON.stringify(c);
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const first = ready({storageMap, locks});
  const second = ready({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);
  const held = await holdHistoryLock(locks);

  const saveA = prepareSave(first, "A");
  const saveB = prepareSave(second, "B");
  assert.deepEqual(stored(storageMap).map(item => item.id), [idC]);
  held.release.resolve();

  assert.deepEqual(await Promise.all([saveA, saveB]), [true, true]);
  await held.promise;
  await locks.idle();
  const final = stored(storageMap);
  assert.equal(final.length, 3);
  assert.deepEqual(new Set(final.map(item => item.note)), new Set(["A", "B", "C"]));
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.equal(new Set(final.map(item => item.id)).size, 3);
});

test("H1 echter saveQuick Speicherfehler bewahrt C und der nächste saveQuick gelingt", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: {keep: true}});
  const cBefore = JSON.stringify(c);
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const fault = {};
  const runtime = ready({storageMap, locks, fault});
  await runtime.settle();

  fault.setItem = true;
  fault.key = historyKey;
  fault.name = "QuotaExceededError";
  assert.equal(await prepareSave(runtime, "failed-save"), false);
  assert.equal(storageMap.get(historyKey), JSON.stringify([c]));
  assert.equal(runtime.elements.get("noteInput").value, "failed-save");
  assert.equal(locks.pending, 0);

  fault.setItem = false;
  assert.equal(await prepareSave(runtime, "recovered-save"), true);
  await locks.idle();

  const final = stored(storageMap);
  assert.equal(final.length, 2);
  assert.equal(final.some(item => item.note === "failed-save"), false);
  assert.ok(final.some(item => item.note === "recovered-save"));
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.equal(runtime.elements.get("noteInput").value, "");
});

test("H1 früher gestarteter langsamer Import liest nach einem schnellen echten Save den neuesten Stand", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C"});
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const history = historyRuntime({storageMap, locks});
  const calculator = ready({storageMap, locks});
  await Promise.all([history.settle(), calculator.settle()]);

  const fileGate = deferred();
  const imported = entry({id: idImport, date: 1700000001000, note: "import"});
  const importPromise = importFile(history, envelope([imported]), undefined, fileGate.promise);
  assert.equal(await prepareSave(calculator, "fast-save"), true);
  fileGate.resolve();
  await importPromise;
  await locks.idle();

  const final = stored(storageMap);
  assert.equal(final.length, 3);
  assert.deepEqual(new Set(final.map(item => item.note)), new Set(["C", "fast-save", "import"]));
  assert.ok(final.some(item => item.id === idImport));
  assert.ok(final.some(item => item.id === idC));
  assert.match(history.alerts.at(-1), /1 neue Einträge importiert|1 new entries imported|1 yeni kayıt içe aktarıldı/);
});

test("H1 zwei gleichzeitige identische ID Importe schreiben denselben Eintrag nur einmal", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: "unchanged"});
  const cBefore = JSON.stringify(c);
  const imported = entry({id: idImport, date: 1700000001000, note: "same-import"});
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const first = historyRuntime({storageMap, locks});
  const second = historyRuntime({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);
  const held = await holdHistoryLock(locks);
  const requestedBefore = locks.events.filter(event => event.type === "requested").length;

  const firstImport = importFile(first, envelope([imported]));
  await waitForRequested(locks, requestedBefore + 1);
  const secondImport = importFile(second, envelope([imported]));
  await waitForRequested(locks, requestedBefore + 2);
  held.release.resolve();

  await Promise.all([held.promise, firstImport, secondImport]);
  await locks.idle();
  const final = stored(storageMap);
  assert.equal(final.length, 2);
  assert.equal(final.filter(item => item.id === idImport).length, 1);
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.match(first.alerts.at(-1), /1 neue Einträge importiert, 0 übersprungen|1 new entries imported, 0 skipped|1 yeni kayıt içe aktarıldı, 0 atlandı/);
  assert.match(second.alerts.at(-1), /0 neue Einträge importiert, 1 übersprungen|0 new entries imported, 1 skipped|0 yeni kayıt içe aktarıldı, 1 atlandı/);
  assert.equal(
    [first, second].flatMap(runtime => runtime.calls)
      .filter(([method, key]) => method === "setItem" && key === historyKey).length,
    1
  );
});

test("H1 gleichzeitiger ID Konflikt verwirft den Verlierer und bewahrt den Gewinner", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: {keep: true}});
  const cBefore = JSON.stringify(c);
  const winner = entry({id: idImport, date: 1700000001000, km: 111, note: "winner"});
  const loser = entry({id: idImport, date: 1700000001000, km: 222, note: "loser"});
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const first = historyRuntime({storageMap, locks});
  const second = historyRuntime({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);
  const held = await holdHistoryLock(locks);
  const requestedBefore = locks.events.filter(event => event.type === "requested").length;

  const firstImport = importFile(first, envelope([winner]));
  await waitForRequested(locks, requestedBefore + 1);
  const secondImport = importFile(second, envelope([loser]));
  await waitForRequested(locks, requestedBefore + 2);
  held.release.resolve();

  await Promise.all([held.promise, firstImport, secondImport]);
  await locks.idle();
  const final = stored(storageMap);
  const storedWinner = final.find(item => item.id === idImport);
  assert.equal(final.length, 2);
  assert.equal(storedWinner.note, "winner");
  assert.equal(storedWinner.km, 111);
  assert.equal(final.some(item => item.note === "loser"), false);
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.match(first.alerts.at(-1), /1 neue Einträge importiert|1 new entries imported|1 yeni kayıt içe aktarıldı/);
  assert.match(second.alerts.at(-1), /Ungültige|Invalid|Geçersiz/);
  assert.equal(
    [first, second].flatMap(runtime => runtime.calls)
      .filter(([method, key]) => method === "setItem" && key === historyKey).length,
    1
  );
});

test("H1 stale Einzellöschen entfernt nur A und bewahrt später gespeichertes D sowie B und C", async () => {
  const initial = [
    entry({id: idA, date: 1700000003000, note: "A"}),
    entry({id: idB, date: 1700000002000, note: "B"}),
    entry({id: idC, date: 1700000001000, note: "C", futureField: "unchanged"}),
  ];
  const cBefore = JSON.stringify(initial[2]);
  const storageMap = appStorage(initial);
  const locks = createLockManager();
  const history = historyRuntime({storageMap, locks});
  const calculator = ready({storageMap, locks});
  await Promise.all([history.settle(), calculator.settle()]);

  assert.equal(await prepareSave(calculator, "D"), true);
  assert.equal(history.elements.get("histList").children.length, 3, "history UI remains the stale pre-save snapshot");
  history.elements.get("histList").children[0].children[1].click();
  await history.settle();

  const final = stored(storageMap);
  assert.equal(final.some(item => item.id === idA), false);
  assert.ok(final.some(item => item.id === idB));
  assert.ok(final.some(item => item.id === idC));
  assert.ok(final.some(item => item.note === "D"));
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.equal(final.length, 3);
});

test("H1 zweimaliges gleichzeitiges Löschen derselben ID löscht weder B noch C", async () => {
  const initial = [
    entry({id: idA, date: 1700000003000, note: "A"}),
    entry({id: idB, date: 1700000002000, note: "B"}),
    entry({id: idC, date: 1700000001000, note: "C", futureField: "unchanged"}),
  ];
  const cBefore = JSON.stringify(initial[2]);
  const storageMap = appStorage(initial);
  const locks = createLockManager();
  const first = historyRuntime({storageMap, locks});
  const second = historyRuntime({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);
  const held = await holdHistoryLock(locks);
  const requestedBefore = locks.events.filter(event => event.type === "requested").length;

  first.elements.get("histList").children[0].children[1].click();
  await waitForRequested(locks, requestedBefore + 1);
  second.elements.get("histList").children[0].children[1].click();
  await waitForRequested(locks, requestedBefore + 2);
  held.release.resolve();

  await held.promise;
  await Promise.all([first.settle(), second.settle()]);
  const final = stored(storageMap);
  assert.deepEqual(final.map(item => item.id), [idB, idC]);
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.equal(
    [first, second].flatMap(runtime => runtime.calls)
      .filter(([method, key]) => method === "setItem" && key === historyKey).length,
    1
  );
});

test("H1 stale identische Legacy Auswahl bleibt nach fremdem Löschen fail closed", async () => {
  const duplicate = {
    schema: "v1",
    date: 1700000003000,
    km: 100,
    ev: {consumption: 18, price: 0.3},
    fuel: {consumption: 6.5, price: 1.8},
    note: "identical legacy",
  };
  const b = entry({id: idB, date: 1700000002000, note: "B"});
  const c = entry({id: idC, date: 1700000001000, note: "C", futureField: {keep: true}});
  const cBefore = JSON.stringify(c);
  const storageMap = appStorage([duplicate, structuredClone(duplicate), b, c]);
  const locks = createLockManager();
  const stale = historyRuntime({storageMap, locks});
  const other = historyRuntime({storageMap, locks});
  await Promise.all([stale.settle(), other.settle()]);

  other.elements.get("legacyList").children[0].children[1].click();
  await other.settle();
  const afterForeignDelete = storageMap.get(historyKey);
  assert.equal(stored(storageMap).filter(item => item.note === "identical legacy").length, 1);

  stale.elements.get("legacyList").children[0].children[1].click();
  await stale.settle();
  const final = stored(storageMap);
  assert.equal(storageMap.get(historyKey), afterForeignDelete);
  assert.equal(final.filter(item => item.note === "identical legacy").length, 1);
  assert.ok(final.some(item => item.id === idB));
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.match(stale.alerts.at(-1), /Verlauf konnte nicht geändert|History could not be changed|Geçmiş değiştirilemedi/);
  assert.equal(
    [stale, other].flatMap(runtime => runtime.calls)
      .filter(([method, key]) => method === "setItem" && key === historyKey).length,
    1
  );
});

test("H1 bestätigtes Alle Löschen erfasst nur sichtbare Auswahl und bewahrt späteren Save sowie Legacy C", async () => {
  const legacyC = {
    schema: "v1",
    date: 1700000000000,
    km: 100,
    ev: {consumption: 18, price: 0.3},
    fuel: {consumption: 6.5, price: 1.8},
    futureField: {keep: true},
  };
  const initial = [
    entry({id: idA, date: 1700000003000, note: "A"}),
    entry({id: idB, date: 1700000002000, note: "B"}),
    legacyC,
  ];
  const cBefore = JSON.stringify(legacyC);
  const storageMap = appStorage(initial);
  const locks = createLockManager();
  const history = historyRuntime({storageMap, locks});
  const calculator = ready({storageMap, locks});
  await Promise.all([history.settle(), calculator.settle()]);
  const held = await holdHistoryLock(locks);

  const saveD = prepareSave(calculator, "D");
  await Promise.resolve();
  history.elements.get("histClearBtn").click();
  await Promise.resolve();
  held.release.resolve();

  assert.equal(await saveD, true);
  await held.promise;
  await history.settle();
  const final = stored(storageMap);
  assert.equal(final.some(item => item.id === idA), false);
  assert.equal(final.some(item => item.id === idB), false);
  assert.ok(final.some(item => item.note === "D"));
  assert.equal(JSON.stringify(final.find(item => item.schema === "v1")), cBefore);
  assert.equal(final.length, 2);
});

test("H1 begrenzter Produktionsstress bewahrt 20 schnelle Saves mit eindeutigen IDs", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: 42});
  const cBefore = JSON.stringify(c);
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const first = ready({storageMap, locks});
  const second = ready({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);
  const held = await holdHistoryLock(locks);

  const saves = [];
  for (let index = 0; index < 20; index++) {
    saves.push(prepareSave(index % 2 ? first : second, `stress-${index}`));
  }
  held.release.resolve();
  assert.ok((await Promise.all(saves)).every(Boolean));
  await held.promise;
  await locks.idle();

  const final = stored(storageMap);
  assert.equal(final.length, 21);
  assert.equal(new Set(final.map(item => item.id)).size, 21);
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
  assert.deepEqual(
    new Set(final.filter(item => item.note.startsWith("stress-")).map(item => item.note)),
    new Set(Array.from({length: 20}, (_, index) => `stress-${index}`))
  );
});

test("H1 deterministischer Zwei Kontext Stress bleibt über 40 Save Save Delete Zyklen unter dem Cap", async () => {
  const c = entry({id: idC, date: 1700000000000, note: "C", futureField: {keep: true}});
  const cBefore = JSON.stringify(c);
  const storageMap = appStorage([c]);
  const locks = createLockManager();
  const first = historyRuntime({storageMap, locks});
  const second = ready({storageMap, locks});
  await Promise.all([first.settle(), second.settle()]);

  for (let cycle = 0; cycle < 40; cycle++) {
    const left = prepareSave(first, `left-${cycle}`);
    const right = prepareSave(second, `right-${cycle}`);
    assert.deepEqual(await Promise.all([left, right]), [true, true]);

    first.context.document.dispatchEvent({type: "eaf:currencychange"});
    first.elements.get("histList").children[0].children[1].click();
    await first.settle();

    const current = stored(storageMap);
    assert.equal(current.length, cycle + 2);
    assert.ok(current.length < 50);
    assert.equal(new Set(current.map(item => item.id)).size, current.length);
    assert.equal(JSON.stringify(current.find(item => item.id === idC)), cBefore);
  }

  const final = stored(storageMap);
  assert.equal(final.length, 41);
  assert.equal(final.filter(item => /^left-|^right-/.test(item.note)).length, 40);
  assert.equal(JSON.stringify(final.find(item => item.id === idC)), cBefore);
});

test("H1 echter Save bleibt ohne Web Locks fail closed und meldet keinen Erfolg", async () => {
  const c = entry({id: idC, note: "C"});
  const storageMap = appStorage([c]);
  const runtime = ready({storageMap, locks: null});
  await runtime.settle();
  const before = storageMap.get(historyKey);

  assert.equal(await prepareSave(runtime, "blocked"), false);
  assert.equal(storageMap.get(historyKey), before);
  assert.doesNotMatch(runtime.elements.get("eaf-toast").textContent, /gespeichert|saved/i);
  assert.match(runtime.elements.get("eaf-toast").textContent, /Browser|browser|tarayıcı/);
});
