import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { historyRuntime, importFile, entry, historyKey } from "./history-runtime.mjs";

const source = fs.readFileSync(new URL("../theme-init.js", import.meta.url), "utf8");
function notice(url, language = "de") {
  const attributes = new Map(), notices = [], reads = [];
  const element = () => ({ children: [], setAttribute() {}, appendChild(child) { this.children.push(child); } });
  const main = { firstChild: null, insertBefore(node) { notices.push(node); } };
  const document = {
    readyState: "complete", body: main, head: element(),
    documentElement: { lang: language, getAttribute: key => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value) },
    createElement: element, createTextNode: text => ({ textContent: text }),
    querySelectorAll: () => [], getElementById: () => null,
    querySelector: selector => selector === "main" ? main : null
  };
  vm.runInNewContext(source, {
    document, location: new URL(url), window: {},
    localStorage: { getItem(key) { reads.push(key); return null; }, setItem() { throw new Error("unexpected data write"); }, removeItem() { throw new Error("unexpected data deletion"); } }
  });
  assert.deepEqual(reads, ["theme"]);
  return notices;
}

test("frühere Ursprünge bieten lokale Datenrettung ohne Daten in Ziel URLs", () => {
  for (const host of ["evspend.com", "www.evspend.com"]) {
    const [message] = notice(`https://${host}/tr/verlauf?id=synthetic-private-id`, "tr");
    assert.equal(message.id, "domain-migration-notice");
    const [oldHistory, , newSite] = message.children[2].children;
    assert.equal(oldHistory.href, "/tr/verlauf");
    assert.equal(newSite.href, "https://www.evspendpure.com/");
    assert.equal(newSite.rel, "noreferrer");
    assert.match(message.children[1].textContent, /JSON/);
  }
});

test("neue Hauptdomain und native WebView erhalten keinen Datenrettungshinweis", () => {
  for (const url of ["https://www.evspendpure.com/", "capacitor://localhost/index.html", "https://evspend.com.example.test/"]) {
    assert.equal(notice(url).length, 0);
  }
});

test("vorhandenes Backup importiert Verlauf und Notizen ohne Änderung der Datenquelle", async () => {
  const old = historyRuntime({ storage: { [historyKey]: JSON.stringify([entry({ note: "synthetic migration note" })]) } });
  await old.settle();
  const before = old.storage.get(historyKey);
  const backup = old.context.window.EAF_HISTORY_EXPORT.json();
  assert.equal(JSON.parse(backup.data).app, "evspend");
  const destination = historyRuntime({ storage: { [historyKey]: "[]" } });
  await destination.settle();
  await importFile(destination, JSON.parse(backup.data));
  assert.equal(old.storage.get(historyKey), before);
  const restored = JSON.parse(destination.storage.get(historyKey));
  assert.equal(restored.length, 1);
  assert.equal(restored[0].note, "synthetic migration note");
  await importFile(destination, JSON.parse(backup.data));
  assert.equal(JSON.parse(destination.storage.get(historyKey)).length, 1);
});
