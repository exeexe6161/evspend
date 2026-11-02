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
