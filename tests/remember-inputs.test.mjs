import assert from 'node:assert/strict';
import test from 'node:test';
import { createRuntime, ready, historyKey, existingJson } from './history-runtime.mjs';
import { createLockManager } from './history-locks.mjs';

const inputKey = 'eaf.inputs.v2';
const DRAFT = ['eaf.inputs.v2', 'eaf.rideshareActive', 'eaf.ridesharePersons', 'eaf.longtermActive', 'eaf.longtermYears',
  'eaf.longtermPremium', 'eaf.longtermKmMonat', 'eaf.mode', 'eaf.type'];
const ui = {rememberPanel: '', rememberToggle: '', rememberStatus: '', rememberDraftBox: '', rememberDraftText: '', rememberLoadBtn: '',
  rememberReplaceBtn: '', rememberDeleteBtn: '', rememberLegacyBox: '', rememberLegacyText: '', rememberLegacyExportBtn: '', rememberLegacyDeleteBtn: ''};
const base = {evVerbrauch: 17, strompreis: .37, benzinpreis: 2.15, verbrauchVerbrenner: 7, kmEv: 50, kmVb: 50, kmShared: 1000, batteryKwh: 60,
  kmMonat: 1000, longtermPremium: 5000, longtermYears: 10, ridesharePersons: 1, noteInput: '', marketSwitchLabel: '', qSaveBtn: '', saveHint: '',
  rangeDisplay: '', longtermYearsV: '', longtermPremiumV: '', kmMonatV: '', ltKmJahr: '', ltKmWarn: '', singleHeroVal: '', rideshareToggle: '', longtermToggle: '', ...ui};
const draft = JSON.stringify({kmEv: '123', kmShared: '777', strompreis: '0.25', _marketCode: 'de'});
const fullStorage = {[inputKey]: draft, 'eaf.mode': 'single', 'eaf.type': 'vb', 'eaf.rideshareActive': '1', 'eaf.ridesharePersons': '3',
  'eaf.longtermActive': '1', 'eaf.longtermYears': '12', 'eaf.longtermPremium': '7000', 'eaf.longtermKmMonat': '900'};
const click = (rt, id) => rt.elements.get(id).dispatchEvent({type: 'click', stopPropagation() {}});
const toggle = (rt, on) => { const el = rt.elements.get('rememberToggle'); el.checked = on; el.dispatchEvent({type: 'change'}); };
const draftSnapshot = rt => Object.fromEntries(DRAFT.map(k => [k, rt.storage.get(k) ?? null]));
const writes = rt => rt.calls.filter(([m, k]) => (m === 'setItem' || m === 'removeItem') && DRAFT.includes(k));
const run = (rt, code) => rt.run(code);

test('Standard ohne Opt-in: kein Schreibzugriff auf Eingabeentwürfe über alle Auslöser, Berechnung unverändert', () => {
  const rt = ready({remember: false, inputs: base, storage: fullStorage});
  const before = draftSnapshot(rt);
  rt.calls.length = 0;
  for (const id of ['kmEv', 'kmShared', 'strompreis', 'evVerbrauch']) {
    rt.elements.get(id).value = id === 'kmShared' ? '800' : rt.elements.get(id).value;
    rt.elements.get(id).dispatchEvent({type: 'input'});
  }
  run(rt, "setMode('single'); setType('vb'); setType('ev'); setMode('compare')");
  run(rt, 'setRideshareActive(true); setRidesharePersons(4); setRideshareActive(false)');
  run(rt, 'setLongtermActive(true); setKmMonat(1200); setLongtermYears(8); setLongtermPremium(6000); setLongtermActive(false)');
  run(rt, 'saveInputs(); reset()');
  assert.deepEqual(writes(rt), []);
  assert.deepEqual(draftSnapshot(rt), before);
  assert.ok(Math.abs(run(rt, '_getCompareData().eAutoTotal') - 62.9) < 1e-9);
});

test('Standard ohne Opt-in: vorhandener Entwurf wird nicht automatisch übernommen', () => {
  const rt = ready({remember: false, inputs: base, storage: fullStorage});
  assert.equal(run(rt, 'appMode'), 'compare');
  assert.equal(run(rt, 'singleType'), 'ev');
  assert.equal(run(rt, 'rideshareActive'), false);
  assert.equal(run(rt, 'longtermActive'), false);
  assert.equal(Number(rt.elements.get('kmEv').value), 50);
  assert.equal(rt.elements.get('rememberToggle').checked, false);
  assert.equal(rt.elements.get('rememberDraftBox').hidden, false);
});

test('Standard ohne Opt-in: Wiederherstellung aus dem Verlauf schreibt weder Entwurf noch Notizkopie', () => {
  const entry = {schema: 'v2', id: 'eaf_' + 'b'.repeat(32), date: 1700000000000, type: 'ev', marketCode: 'de', km: 100, consumption: 18, price: .3,
    costPer100: 5.4, monthlyCost: 5.4, yearlyCost: 64.8, note: 'nur Verlauf', persons: 1};
  const rt = ready({remember: false, inputs: base, search: `?id=${entry.id}`, storage: {[historyKey]: JSON.stringify([entry])}});
  assert.equal(rt.elements.get('noteInput').value, 'nur Verlauf');
  assert.deepEqual(writes(rt), []);
  assert.equal(rt.storage.has(inputKey), false);
  rt.elements.get('noteInput').value = 'bearbeitet'; rt.elements.get('noteInput').dispatchEvent({type: 'input'});
  assert.equal(rt.storage.has(inputKey), false);
  assert.equal(run(rt, '_historicalNote.original'), 'bearbeitet');
});

test('Opt-in mit vorhandenem Entwurf: kein stilles Überschreiben, erst nach ausdrücklicher Wahl', () => {
  const rt = ready({remember: false, inputs: base, storage: fullStorage});
  const before = draftSnapshot(rt);
  toggle(rt, true);
  assert.equal(rt.storage.get('eaf.rememberInputs'), '1');
  rt.elements.get('kmEv').value = '222'; rt.elements.get('kmEv').dispatchEvent({type: 'input'});
  run(rt, "setMode('compare')");
  assert.deepEqual(draftSnapshot(rt), before);
  assert.equal(rt.elements.get('rememberReplaceBtn').hidden, false);
  click(rt, 'rememberReplaceBtn');
  return rt.settle().then(() => {
    assert.equal(JSON.parse(rt.storage.get(inputKey)).kmEv, '222');
    assert.equal(rt.storage.get('eaf.mode'), 'compare');
  });
});

test('Opt-in ohne vorhandenen Entwurf speichert sofort und Deaktivieren erhält Bestand ungefragt', () => {
  const rt = ready({remember: false, inputs: base});
  toggle(rt, true);
  assert.ok(rt.storage.has(inputKey));
  rt.elements.get('kmEv').value = '77'; rt.elements.get('kmEv').dispatchEvent({type: 'input'});
  const saved = rt.storage.get(inputKey);
  assert.equal(JSON.parse(saved).kmEv, '77');
  toggle(rt, false);
  assert.equal(rt.storage.has('eaf.rememberInputs'), false);
  assert.equal(rt.storage.get(inputKey), saved);
  rt.elements.get('kmEv').value = '5'; rt.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(rt.storage.get(inputKey), saved);
  assert.equal(rt.elements.get('rememberDraftBox').hidden, false);
});

test('Ausdrückliches Laden wendet den Entwurf nur auf die Sitzung an und schreibt nichts', async () => {
  const rt = ready({remember: false, inputs: base, storage: fullStorage});
  const before = draftSnapshot(rt);
  rt.calls.length = 0;
  click(rt, 'rememberLoadBtn');
  await rt.settle();
  assert.equal(Number(rt.elements.get('kmEv').value), 123);
  assert.equal(run(rt, 'appMode'), 'single');
  assert.equal(run(rt, 'singleType'), 'vb');
  assert.equal(run(rt, 'longtermYears'), 12);
  assert.deepEqual(writes(rt), []);
  assert.deepEqual(draftSnapshot(rt), before);
  assert.match(rt.elements.get('rememberStatus').textContent, /geladen/);
});

test('Gezieltes Löschen: zweistufig, entfernt nur Entwurfsschlüssel, erhält Verlauf und Altformate', async () => {
  const legacy = {'eaf.inputs': '{unknown}', 'eaf.inputs.v1': '{unknown v1}'};
  const rt = ready({remember: false, inputs: base, storage: {...fullStorage, ...legacy}});
  click(rt, 'rememberDeleteBtn');
  await rt.settle();
  assert.deepEqual(writes(rt), []);
  click(rt, 'rememberDeleteBtn');
  await rt.settle();
  assert.deepEqual(draftSnapshot(rt), Object.fromEntries(DRAFT.map(k => [k, null])));
  assert.equal(rt.storage.get(historyKey), existingJson);
  assert.equal(rt.storage.get('eaf.inputs'), '{unknown}');
  assert.equal(rt.storage.get('eaf.inputs.v1'), '{unknown v1}');
  assert.match(rt.elements.get('rememberStatus').textContent, /gelöscht/);
});

test('Altformate: nur ausdrücklicher Export bzw. zweistufiges Löschen, nie automatische Änderung', async () => {
  const rt = ready({remember: false, inputs: base, storage: {'eaf.inputs': '{a}', 'eaf.inputs.v1': '{b}'}});
  assert.equal(rt.elements.get('rememberLegacyBox').hidden, false);
  assert.equal(rt.storage.get('eaf.inputs'), '{a}');
  click(rt, 'rememberLegacyExportBtn');
  assert.equal(rt.blobs.length, 1);
  assert.equal(rt.storage.get('eaf.inputs.v1'), '{b}');
  click(rt, 'rememberLegacyDeleteBtn'); await rt.settle();
  assert.equal(rt.storage.get('eaf.inputs'), '{a}');
  click(rt, 'rememberLegacyDeleteBtn'); await rt.settle();
  assert.equal(rt.storage.has('eaf.inputs'), false);
  assert.equal(rt.storage.has('eaf.inputs.v1'), false);
});

test('Löschfehler wird nicht als Erfolg gemeldet und lässt den Entwurf unverändert', async () => {
  const rt = ready({remember: false, inputs: base, storage: fullStorage});
  const before = draftSnapshot(rt);
  Object.assign(rt.fault, {removeItem: true, key: 'eaf.mode'});
  click(rt, 'rememberDeleteBtn'); click(rt, 'rememberDeleteBtn');
  await rt.settle();
  assert.match(rt.elements.get('rememberStatus').textContent, /Löschen nicht möglich/);
  assert.equal(rt.storage.get(inputKey), before[inputKey]);
  assert.equal(rt.storage.get('eaf.mode'), 'single');
});

test('Schreibfehler beim Aktivieren täuscht keinen Erfolg vor', () => {
  const rt = ready({remember: false, inputs: base});
  Object.assign(rt.fault, {setItem: true, key: 'eaf.rememberInputs'});
  toggle(rt, true);
  assert.equal(run(rt, '_rememberInputs'), false);
  assert.equal(rt.elements.get('rememberToggle').checked, false);
  assert.match(rt.elements.get('rememberStatus').textContent, /fehlgeschlagen/);
  assert.equal(rt.storage.has('eaf.rememberInputs'), false);
});

test('Schreibfehler bei aktivem Merken: Status zeigt Fehler, bestehender Entwurf bleibt', () => {
  const original = JSON.stringify({strompreis: '0.37', _marketCode: 'de'});
  const rt = ready({inputs: base, storage: {[inputKey]: original}});
  Object.assign(rt.fault, {setItem: true, key: inputKey, name: 'QuotaExceededError'});
  rt.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(rt.storage.get(inputKey), original);
  assert.match(rt.elements.get('rememberStatus').textContent, /fehlgeschlagen/);
});

test('Blockierter Browser-Speicher: Rechner läuft flüchtig, Opt-in nicht möglich', () => {
  for (const options of [{fault: {getItem: true}}, {storageGetterThrows: true}]) {
    const rt = ready({remember: false, inputs: base, ...options});
    assert.ok(Math.abs(run(rt, '_getCompareData().eAutoTotal') - 62.9) < 1e-9);
    assert.equal(rt.elements.get('rememberToggle').disabled, true);
  }
});

function tab(storageMap, locks) {
  const rt = createRuntime({storageMap, locks, inputs: base});
  rt.dispatchDom('DOMContentLoaded');
  return rt;
}
test('Mehrere Tabs: konkurrierende Änderung wird erkannt statt still überschrieben', async () => {
  const storageMap = new Map([['eaf.rememberInputs', '1'], ['eaf.market', 'de'], [historyKey, existingJson]]);
  const locks = createLockManager();
  const a = tab(storageMap, locks), b = tab(storageMap, locks);
  a.elements.get('kmEv').value = '111'; a.elements.get('kmEv').dispatchEvent({type: 'input'});
  const fromA = storageMap.get(inputKey);
  b.elements.get('kmEv').value = '222'; b.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(storageMap.get(inputKey), fromA);
  assert.equal(b.run('_draftConflict'), true);
  assert.match(b.elements.get('rememberStatus').textContent, /anderen Tab/);
  b.elements.get('kmEv').value = '333'; b.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(storageMap.get(inputKey), fromA);
  // Tab B übernimmt den Stand aus Tab A ausdrücklich.
  click(b, 'rememberLoadBtn'); await b.settle();
  assert.equal(b.run('_draftConflict'), false);
  assert.equal(Number(b.elements.get('kmEv').value), 111);
  b.elements.get('kmEv').value = '444'; b.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(JSON.parse(storageMap.get(inputKey)).kmEv, '444');
  assert.equal(storageMap.get(historyKey), existingJson);
});

test('Mehrere Tabs: Löschen in Tab A lässt Tab B den Entwurf nicht wieder anlegen', async () => {
  const storageMap = new Map([['eaf.rememberInputs', '1'], ['eaf.market', 'de'], [inputKey, draft]]);
  const locks = createLockManager();
  const a = tab(storageMap, locks), b = tab(storageMap, locks);
  click(a, 'rememberDeleteBtn'); click(a, 'rememberDeleteBtn');
  await a.settle();
  assert.equal(storageMap.has(inputKey), false);
  b.elements.get('kmEv').value = '999'; b.elements.get('kmEv').dispatchEvent({type: 'input'});
  assert.equal(storageMap.has(inputKey), false);
  assert.equal(b.run('_draftConflict'), true);
});

test('Mehrere Tabs: Löschen mit veralteter Anzeige löscht nichts', async () => {
  const storageMap = new Map([['eaf.rememberInputs', '1'], ['eaf.market', 'de'], [inputKey, draft]]);
  const locks = createLockManager();
  const a = tab(storageMap, locks), b = tab(storageMap, locks);
  a.elements.get('kmEv').value = '31'; a.elements.get('kmEv').dispatchEvent({type: 'input'});
  const newer = storageMap.get(inputKey);
  click(b, 'rememberDeleteBtn'); click(b, 'rememberDeleteBtn');
  await b.settle();
  assert.equal(storageMap.get(inputKey), newer);
  assert.match(b.elements.get('rememberStatus').textContent, /anderen Tab geändert/);
});

test('Fehlende Web Locks: Laden und Löschen funktionieren weiterhin', async () => {
  const rt = ready({remember: false, locks: null, inputs: base, storage: fullStorage});
  click(rt, 'rememberLoadBtn'); await rt.settle();
  assert.equal(Number(rt.elements.get('kmEv').value), 123);
  click(rt, 'rememberDeleteBtn'); click(rt, 'rememberDeleteBtn'); await rt.settle();
  assert.equal(rt.storage.has(inputKey), false);
});

test('Browserneustart: aktiviertes Merken übernimmt Entwurf, deaktiviertes startet mit Defaults', () => {
  const on = ready({inputs: base, storage: fullStorage});
  assert.equal(Number(on.elements.get('kmEv').value), 123);
  assert.equal(on.run('appMode'), 'single');
  const off = ready({remember: false, inputs: base, storage: Object.fromEntries(on.storage.entries()) && {...fullStorage}});
  assert.equal(Number(off.elements.get('kmEv').value), 50);
});

test("Phase H: Opt-out in einem anderen Tab stoppt das Schreiben dieses Tabs", async () => {
  const rt = ready({});
  rt.run("saveInputs()");
  const before = rt.storage.get("eaf.inputs.v2");
  assert.ok(before);
  rt.storage.delete("eaf.rememberInputs"); // anderer Tab hat das Merken deaktiviert
  rt.elements.get("kmEv").value = "77";
  rt.run("saveInputs()");
  assert.equal(rt.storage.get("eaf.inputs.v2"), before);
  assert.equal(rt.run("_rememberInputs"), false);
});
