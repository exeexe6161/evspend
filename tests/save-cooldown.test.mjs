/* Regression guard for F11 (2026-11): the save cooldown must only prevent an
 * accidental duplicate re-save of the SAME entry, not block a different,
 * legitimate calculation saved within the same minute. */
import test from "node:test";
import assert from "node:assert/strict";
import { historyRuntime, historyKey } from "./history-runtime.mjs";

const stored = (rt) => JSON.parse(rt.storage.get(historyKey));

test("F11: cooldown logic blocks only an identical repeat, not a different entry", async () => {
  const rt = historyRuntime({ storage: { [historyKey]: "[]" } });
  rt.run("appMode='single'; singleType='ev'");
  assert.equal(await rt.run("_lastSaveAt=0; canSave('A')"), true, "no prior save -> allowed");
  assert.equal(await rt.run("_lastSaveAt=Date.now(); _lastSaveSig='A'; canSave('A')"), false, "same entry within cooldown -> blocked");
  assert.equal(await rt.run("canSave('B')"), true, "different entry within cooldown -> allowed");
  assert.equal(await rt.run("_lastSaveAt=Date.now()-61000; canSave('A')"), true, "cooldown elapsed -> allowed");
  assert.equal(await rt.run("canSave(null)"), true, "invalid input passes through to saveQuick");
});

test("F11: signature is stable for identical inputs and changes with the inputs", async () => {
  const rt = historyRuntime({ storage: { [historyKey]: "[]" } });
  rt.run("appMode='single'; singleType='ev'");
  const a1 = await rt.run("_currentSaveSignature()");
  const a2 = await rt.run("_currentSaveSignature()");
  assert.equal(a1, a2);
  assert.ok(a1 && a1 !== "null", "valid inputs yield a signature");
  rt.setInputs({ kmEv: 777 });
  const b = await rt.run("_currentSaveSignature()");
  assert.notEqual(a1, b, "changed distance -> different signature");
});

test("F11: saveEntrySafe stores a different entry within the cooldown but not a duplicate", async () => {
  const rt = historyRuntime({ storage: { [historyKey]: "[]" } });
  rt.run("appMode='single'; singleType='ev'; _lastSaveAt=0; _lastSaveSig=''");
  await rt.run("saveEntrySafe()"); await rt.settle();
  const afterFirst = stored(rt).length;
  assert.equal(afterFirst, 1, "first save stored");
  // immediate identical re-save within cooldown -> blocked (no duplicate)
  await rt.run("saveEntrySafe()"); await rt.settle();
  assert.equal(stored(rt).length, afterFirst, "identical re-save blocked within cooldown");
  // a genuinely different calculation within the cooldown -> stored
  rt.setInputs({ kmEv: 999 });
  await rt.run("saveEntrySafe()"); await rt.settle();
  assert.equal(stored(rt).length, afterFirst + 1, "different entry allowed within cooldown");
});
