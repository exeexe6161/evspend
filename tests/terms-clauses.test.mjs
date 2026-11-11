/* Regression guard for F2/F4 (terms of use, 2026-11).
 * Locks in: no private residence town in public terms; no "acceptance of
 * amended terms by mere continued use" (Zustimmungsfiktion); section 5 does
 * not reintroduce a blanket liability exclusion that contradicts section 4.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TERMS = ["terms.html", "terms.en.html", "terms.tr.html", "en-eu/terms.html"];
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("F2: public terms contain no private residence town", () => {
  for (const f of TERMS) assert.doesNotMatch(read(f), /Stadtallendorf/i, f);
});

test("F4: no acceptance of amended terms by mere continued use", () => {
  const banned = [
    /weiteren Nutzung[^<]*erkennen[^<]*an/i,
    /continuing to use[^<]*accept the amended/i,
    /kullanmaya devam eden kullanıcılar[^<]*kabul etmiş sayılır/i,
  ];
  for (const f of TERMS) for (const re of banned) assert.doesNotMatch(read(f), re, `${f} :: ${re}`);
});

test("F4: section 5 does not restate a blanket liability exclusion", () => {
  const banned = [
    /haftet nicht für Schäden, die durch die Nutzung oder Nichtnutzbarkeit/i,
    /shall not be liable for damages arising from the use or inability/i,
    /doğan zararlardan sorumlu değildir/i,
  ];
  for (const f of TERMS) for (const re of banned) assert.doesNotMatch(read(f), re, `${f} :: ${re}`);
});

// F3 (2026-11-11): /en-eu/hinweise was on a stale May-2026 stand with a blanket
// liability exclusion. Lock in the §309-style carve-out and alignment.
const HINWEISE = ["hinweise.html", "hinweise.en.html", "hinweise.tr.html", "en-eu/hinweise.html"];
test("F3: no Hinweise page uses a blanket 'liability is excluded' clause", () => {
  for (const f of HINWEISE) {
    assert.doesNotMatch(read(f), /Liability for damages arising from the use of the results is excluded/i, f);
  }
});
test("F3: en-eu/hinweise carries the statutory carve-out, not the stale May stand", () => {
  const s = read("en-eu/hinweise.html");
  assert.match(s, /Mandatory statutory liability remains unaffected/i);
  assert.doesNotMatch(s, /As of May 1, 2026/i);
});
