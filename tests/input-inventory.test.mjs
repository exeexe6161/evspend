import assert from 'node:assert/strict';
import test from 'node:test';
import { ready, historyRuntime, historyKey, existingJson } from './history-runtime.mjs';

const inputKey = 'eaf.inputs.v2';

test('Versionswechsel erhält unbekannte Altschlüssel bytegleich', () => {
  const old = '{synthetic unknown bytes}';
  const rt = ready({storage: {'eaf.appVersion': 'older', 'eaf.inputs': old, 'eaf.inputs.v1': old, [historyKey]: existingJson}});
  assert.equal(rt.storage.get('eaf.inputs'), old);
  assert.equal(rt.storage.get('eaf.inputs.v1'), old);
  assert.equal(rt.storage.get('eaf.appVersion'), '20260428-1');
  assert.equal(rt.storage.get(historyKey), existingJson);
});

test('Bestand: das alte km Feld in v2 wird beim Laden berücksichtigt', () => {
  const rt = ready({storage: {[inputKey]: JSON.stringify({km: '37'})}});
  assert.equal(Number(rt.elements.get('kmEv').value), 37);
  assert.equal(Number(rt.elements.get('kmVb').value), 37);
});

test('Bestand: Zurücksetzen schreibt einen neuen Entwurf und erhält Verlauf', () => {
  const rt = ready({storage: {[inputKey]: JSON.stringify({strompreis: '0.37'}), [historyKey]: existingJson}});
  rt.calls.length = 0;
  rt.run('reset()');
  assert.ok(rt.calls.some(([method, key]) => method === 'removeItem' && key === inputKey));
  assert.ok(rt.calls.some(([method, key]) => method === 'setItem' && key === inputKey));
  assert.equal(rt.storage.get(historyKey), existingJson);
});

test('Bestand: Schreibfehler überschreibt den vorhandenen Entwurf nicht', () => {
  const original = JSON.stringify({strompreis: '0.37'});
  const rt = ready({storage: {[inputKey]: original}});
  Object.assign(rt.fault, {setItem: true, key: inputKey});
  rt.run('saveInputs()');
  assert.equal(rt.storage.get(inputKey), original);
});



test('Marktwechsel im Verlauf erhält vorhandenen Entwurf unverändert', async () => {
  const draft = JSON.stringify({kmEv: '123', strompreis: '0.37'});
  let marketItem;
  const rt = historyRuntime({
    storage: { 'eaf.market': 'de', [inputKey]: draft },
    beforeHistory(runtime) {
      runtime.element('marketSwitch');
      runtime.element('marketMenu');
      marketItem = runtime.element('marketUs');
      marketItem.setAttribute('data-market', 'us');
      runtime.context.document.querySelectorAll = selector => selector === '[data-market]' ? [marketItem] : [];
      runtime.context.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
    }
  });
  await rt.settle();
  rt.calls.length = 0;
  marketItem.dispatchEvent({type: 'click', stopPropagation() {}});
  assert.equal(rt.storage.get('eaf.market'), 'us');
  assert.equal(rt.storage.get(inputKey), draft);
  assert.equal(rt.calls.some(([method, key]) => method === 'setItem' && key === inputKey), false);
});
