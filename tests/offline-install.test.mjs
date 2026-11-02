import assert from 'node:assert/strict';
import test from 'node:test';
import { ready, historyKey, existingJson } from './history-runtime.mjs';

const ui = {offlinePanel: '', offlineBtn: '', offlineRemoveBtn: '', offlineStatus: '', installHelpBtn: '', pwaPopup: '', pwaPopupSteps: '', pwaPopupAdd: '',
  pwaPopupLater: '', pwaPopupClose: '', pwaPopupBackdrop: '', rememberPanel: '', rememberToggle: '', rememberStatus: ''};
const inputs = {evVerbrauch: 17, strompreis: .37, benzinpreis: 2.15, verbrauchVerbrenner: 7, kmEv: 50, kmVb: 50, kmShared: 1000, batteryKwh: 60,
  noteInput: '', marketSwitchLabel: '', qSaveBtn: '', saveHint: '', rangeDisplay: '', ...ui};
const SW = 'https://www.evspendpure.com/sw.js';
const click = (rt, id) => rt.elements.get(id).dispatchEvent({type: 'click', stopPropagation() {}});

class FakeChannel {
  constructor() {
    const channel = this;
    this.port1 = {onmessage: null};
    this.port2 = {postMessage(data) { channel.port1.onmessage && channel.port1.onmessage({data}); }};
  }
}
function worker(state = 'activated', status = {ok: true, missing: []}) {
  const listeners = [];
  return {scriptURL: SW, state, status, listeners,
    addEventListener(name, fn) { if (name === 'statechange') listeners.push(fn); },
    postMessage(message, ports) { if (message.type === 'EVS_OFFLINE_STATUS' && this.status) ports[0].postMessage({type: 'EVS_OFFLINE_STATUS', ...this.status}); }};
}
function fakeEnv({existing = [], registerImpl} = {}) {
  const log = {register: [], unregister: 0, deleted: []};
  const cacheNames = ['evspend-static-v1', 'evspend-runtime-v1', 'other-app-cache'];
  const serviceWorker = {
    getRegistrations: async () => existing.map(w => ({active: w, unregister: async () => { log.unregister++; return true; }})),
    register: async (url, options) => { log.register.push([url, options]); return registerImpl ? registerImpl() : {active: worker()}; }
  };
  const caches = {keys: async () => [...cacheNames], delete: async name => { log.deleted.push(name); return true; }};
  return {log, serviceWorker, caches};
}
function boot(env, extra = {}) {
  const rt = ready({remember: false, inputs, serviceWorker: env.serviceWorker, caches: env.caches, ...extra});
  rt.context.MessageChannel = FakeChannel;
  return rt;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const text = (rt, id) => rt.elements.get(id).textContent;

test('Start ohne ausdrücklichen Wunsch: keine Registrierung, keine Schreibzugriffe, keine Geräteerkennung', async () => {
  const env = fakeEnv();
  const rt = boot(env);
  await rt.settle();
  assert.equal(env.log.register.length, 0);
  assert.deepEqual(rt.calls.filter(([m]) => m === 'setItem' || m === 'removeItem'), []);
  assert.equal(rt.run('_pwaInfo'), null);
  assert.match(text(rt, 'offlineStatus'), /nicht eingerichtet/);
  assert.equal(rt.timers.some(t => t.delay === 7000), false);
  assert.equal(rt.elements.has('evspend-splash'), false);
});

test('Offline-Aktivierung meldet Erfolg erst nach bestätigtem vollständigen Cache', async () => {
  const env = fakeEnv();
  const rt = boot(env);
  click(rt, 'offlineBtn');
  await rt.settle();
  assert.deepEqual(env.log.register.map(r => r[0]), ['/sw.js']);
  assert.match(text(rt, 'offlineStatus'), /Offline verfügbar/);
  assert.equal(rt.elements.get('offlineRemoveBtn').hidden, false);
  assert.equal(rt.storage.get(historyKey), existingJson);
});

test('Offline-Aktivierung: unvollständiger Cache, redundanter Worker und Fehler täuschen keinen Erfolg vor', async () => {
  for (const [name, registerImpl] of [
    ['incomplete', () => ({active: worker('activated', {ok: false, missing: ['/x']})})],
    ['no answer', () => ({active: worker('activated', null)})],
    ['redundant', () => ({installing: worker('redundant')})],
    ['register rejects', () => { throw new Error('boom'); }],
  ]) {
    const env = fakeEnv({registerImpl});
    const rt = boot(env);
    click(rt, 'offlineBtn');
    const done = rt.settle();
    // Ohne Antwort des Workers läuft die 5-s-Zeitüberschreitung ab.
    await new Promise(resolve => setImmediate(resolve));
    rt.timers.filter(t => t.delay === 5000).forEach(t => t.fn());
    await done;
    assert.match(text(rt, 'offlineStatus'), /nicht bestätigt/, name);
    assert.doesNotMatch(text(rt, 'offlineStatus'), /Offline verfügbar/, name);
    assert.equal(rt.elements.get('offlineRemoveBtn').hidden, true, name);
  }
});

test('Bestehende Installation wird angezeigt, geschützt und nur eigene Registrierung/Caches werden auf Wunsch entfernt', async () => {
  const foreign = {...worker(), scriptURL: 'https://www.evspendpure.com/other-sw.js'};
  const env = fakeEnv({existing: [worker(), foreign]});
  const rt = boot(env);
  await rt.settle(); await tick();
  assert.match(text(rt, 'offlineStatus'), /Offline verfügbar/);
  assert.equal(env.log.unregister, 0);
  assert.deepEqual(env.log.deleted, []);
  click(rt, 'offlineRemoveBtn'); await rt.settle();
  assert.equal(env.log.unregister, 0);
  click(rt, 'offlineRemoveBtn'); await rt.settle();
  assert.equal(env.log.unregister, 1);                       // nur /sw.js, nicht other-sw.js
  assert.deepEqual(env.log.deleted.sort(), ['evspend-runtime-v1', 'evspend-static-v1']);
  assert.equal(env.log.deleted.includes('other-app-cache'), false);
  assert.equal(rt.storage.get(historyKey), existingJson);
  assert.match(text(rt, 'offlineStatus'), /entfernt/);
});

test('Entfernen mit Fehler meldet keinen Erfolg und lässt den Status bestehen', async () => {
  const env = fakeEnv({existing: [worker()]});
  env.caches.delete = async () => { throw new Error('denied'); };
  const rt = boot(env);
  await rt.settle(); await tick();
  click(rt, 'offlineRemoveBtn'); click(rt, 'offlineRemoveBtn'); await rt.settle();
  assert.match(text(rt, 'offlineStatus'), /Entfernen nicht möglich/);
});

test('Ohne Browserunterstützung bleibt der Rechner nutzbar und die Aktion ist verborgen', async () => {
  const rt = ready({remember: false, inputs});
  await rt.settle();
  assert.match(text(rt, 'offlineStatus'), /unterstützt.*nicht/);
  assert.equal(rt.elements.get('offlineBtn').hidden, true);
});

test('Installationshilfe: Geräteerkennung erst beim ausdrücklichen Aufruf, nichts wird gespeichert', () => {
  const rt = ready({remember: false, inputs});
  assert.equal(rt.run('_pwaInfo'), null);
  rt.calls.length = 0;
  click(rt, 'installHelpBtn');
  assert.notEqual(rt.run('_pwaInfo'), null);
  assert.equal(rt.run('_pwaPopupShown'), true);
  assert.deepEqual(rt.calls.filter(([m]) => m === 'setItem' || m === 'removeItem'), []);
  click(rt, 'pwaPopupLater');
  assert.equal(rt.run('_pwaPopupShown'), false);
  assert.deepEqual(rt.calls.filter(([m]) => m === 'setItem' || m === 'removeItem'), []);
});
