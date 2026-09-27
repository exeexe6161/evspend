import assert from "node:assert/strict";
import test from "node:test";

import { entry, historyKey, historyRuntime, ready } from "./history-runtime.mjs";

const legacyKey = "eaf.history.v1";
const validId = "eaf_" + "a".repeat(32);

test("H1 fehlender Coordinator mit Legacy Daten lässt den Rechner lesbar und Save fail closed", async () => {
  const current = JSON.stringify([entry({id: validId, note: "unchanged"})]);
  const legacy = JSON.stringify([{id: 1700000000000, inputs: {}, results: {}}]);
  const runtime = ready({
    historyCoordinatorMissing: true,
    storage: {[historyKey]: current, [legacyKey]: legacy},
  });

  assert.equal(runtime.elements.get("documentElement").getAttribute("lang"), "de");
  await runtime.settle();
  runtime.run("appMode='single'; singleType='ev'");
  assert.equal(await runtime.run("saveQuick()"), false);
  assert.equal(runtime.storage.get(historyKey), current);
  assert.equal(runtime.storage.get(legacyKey), legacy);
  assert.doesNotMatch(runtime.elements.get("eaf-toast").textContent, /gespeichert|saved/i);
});

test("H1 fehlender Coordinator mit Legacy Daten lässt Verlauf lesbar und Delete fail closed", async () => {
  const current = JSON.stringify([entry({id: validId, note: "unchanged"})]);
  const legacy = JSON.stringify([{id: 1700000000000, inputs: {}, results: {}}]);
  const runtime = historyRuntime({
    historyCoordinatorMissing: true,
    storage: {[historyKey]: current, [legacyKey]: legacy},
  });

  await runtime.settle();
  assert.equal(runtime.elements.get("histList").children.length, 1);
  assert.equal(runtime.alerts.length, 1);

  runtime.elements.get("histList").children[0].children[1].click();
  await runtime.settle();
  assert.equal(runtime.storage.get(historyKey), current);
  assert.equal(runtime.storage.get(legacyKey), legacy);
  assert.equal(runtime.alerts.length, 2);
});
