import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const privacy = ["datenschutz.html", "datenschutz.en.html", "datenschutz.tr.html", "en-eu/datenschutz.html", "privacy-policy.html"];

test("Phase K: keine pauschale Einwilligungsfreiheit und keine Aussage zu automatischem Speichern in Datenschutztexten", () => {
  const banned = /Einwilligung ist nicht erforderlich|no consent is requested|No consent is required|onay istenmez|Inputs are stored on your own device|Girdiğiniz veriler kendi cihazınızda saklanır/;
  for (const f of privacy) assert.doesNotMatch(read(f), banned, f);
});

test("Phase K: Oberflächentexte behaupten kein automatisches lokales Speichern der Eingaben", () => {
  const files = ["script.js", "index.html", "en-eu/index.html", "tr/index.html"];
  const banned = /Eingaben lokal gespeichert|Inputs saved locally|Inputs are stored locally|Girdiler yerel olarak saklan/;
  for (const f of files) assert.doesNotMatch(read(f), banned, f);
});

test("TR-KVKK: Datenschutztext beschreibt Rechnereingaben als Standard nur im Speicher und LocalStorage nur nach Opt-in", () => {
  const tr = read("datenschutz.tr.html");
  const ui = read("script.js");
  assert.doesNotMatch(tr, /girilen değerler[^<]{0,160}yerel depolamasında \(LocalStorage\) saklanır ve işleticiye/, "alte, widersprüchliche KVKK-Aussage");
  assert.match(tr, /varsayılan olarak yalnızca açık sayfanın belleğinde tutulur; yalnızca „Girdilerimi bu cihazda hatırla“ seçeneği açıkça etkinleştirildiğinde/);
  const label = /rememberLabel: "([^"]+)"/g;
  const labels = [...ui.matchAll(label)].map(m => m[1]);
  assert.ok(labels.includes("Girdilerimi bu cihazda hatırla"), "TR-Beschriftung in script.js");
  const del = [...ui.matchAll(/rememberDelete: "([^"]+)"/g)].map(m => m[1]);
  assert.ok(del.includes("Kayıtlı girdileri sil"), "TR-Löschbeschriftung in script.js");
  for (const l of ["„Girdilerimi bu cihazda hatırla“", "„Kayıtlı girdileri sil“"]) assert.ok(tr.includes(l), l);
  assert.ok(!tr.includes("„Girdileri bu cihazda hatırla“") && !tr.includes("„Hatırlanan girdileri sil“"), "veraltete Beschriftungen");
});
