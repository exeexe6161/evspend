import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { historyRuntime, importFile, envelope, entry, historyKey, importedSignal } from "./history-runtime.mjs";

// Both recorded fixtures come from the completed 2026-10-12 audit evidence.
// The legacy saved results intentionally remain snapshots, not new formula results.
const recorded = name => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const date = 1720000000000;
const id = "eaf_" + "a".repeat(32);
const direct = (extra = {}) => ({date, km: 1000,
  ev: {consumption: 17.5, price: .32, costPer100: 5.6},
  fuel: {consumption: 6.4, price: 1.9, costPer100: 12.16},
  result: {yearlySaving: 1181, monthlySaving: 98}, ...extra});
const original = (extra = {}) => ({id: date,
  inputs: {km_per_month: 1250, ev_consumption: 17.5, electricity_price: .32,
    fuel_consumption: 6.4, fuel_price: 1.9},
  results: {ev_cost_per_100km: 5.6, fuel_cost_per_100km: 12.16,
    yearly_difference: 984, monthly_difference: 82}, ...extra});
const stored = rt => JSON.parse(rt.storage.get(historyKey));
const empty = (market = "de") => historyRuntime({storage: {"eaf.market": market, [historyKey]: "[]"}});
async function exportFile(rt) {
  rt.elements.get("histExportBtn").click();
  assert.equal(rt.blobs.length, 1);
  return JSON.parse(await rt.blobs[0].text());
}
function assertUntouched(rt, before) {
  assert.equal(rt.storage.get(historyKey), before);
  assert.equal(rt.calls.filter(([method, key]) => method === "setItem" && key === historyKey).length, 0);
  assert.equal(rt.alerts.length, 1);
  assert.doesNotMatch(rt.alerts[0], importedSignal);
}
async function assertRoundTrip(rt) {
  const file = await exportFile(rt);
  const first = rt.storage.get(historyKey);
  const imported = empty();
  await importFile(imported, file);
  assert.deepEqual(stored(imported), stored(rt));
  await importFile(rt, file);
  assert.equal(rt.storage.get(historyKey), first);
  assert.match(rt.alerts.at(-1), importedSignal);
  assert.match(rt.alerts.at(-1), /^0 /);
  const restarted = historyRuntime({storage: Object.fromEntries(imported.storage)});
  assert.deepEqual(stored(restarted), stored(rt));
}

test("historical own mixed backup restores every recorded row and saved legacy result", async () => {
  const file = recorded("historical-own-backup.json");
  const rt = empty();
  await importFile(rt, file);
  assert.match(rt.alerts[0], /2 neue Einträge importiert, 0 übersprungen/);
  assert.equal(stored(rt).length, file.entryCount);
  assert.deepEqual(stored(rt)[1], file.entries[1]);
  assert.equal(stored(rt)[1].result.yearlySaving, 1180.8);
  assert.equal(stored(rt)[1].result.monthlySaving, 98.4);
  await assertRoundTrip(rt);
});

test("recorded US backup preserves internal metric units, IDs, Unicode and raw precision", async () => {
  const file = recorded("historical-us-backup.json");
  const rt = empty();
  await importFile(rt, file);
  assert.deepEqual(stored(rt), file.entries);
  for (const row of stored(rt)) {
    assert.equal(row.km, 482.80320000000006);
    assert.equal(row.currencyMetadata.code, "USD");
  }
  await assertRoundTrip(rt);
});

test("historical v2 text note is preserved without trimming or removing safe whitespace", async () => {
  const raw = entry({date, id, ridesharing: false, persons: 1, note: "  ÄÖü İstanbul\nsecond line\t<img src=x>  "});
  const rt = empty();
  await importFile(rt, envelope([raw]));
  assert.equal(stored(rt)[0].note, raw.note);
  assert.equal(stored(rt)[0].id, raw.id);
  assert.equal(stored(rt)[0].km, raw.km);
  await assertRoundTrip(rt);
});

for (const [name, note] of [["oversized", "a".repeat(201)], ["control", "before\u0000after"]])
  test(`historical v2 ${name} note rejects all siblings rather than losing note content`, async () => {
    const rt = historyRuntime();
    const before = rt.storage.get(historyKey);
    await importFile(rt, envelope([direct(), entry({id, note})]));
    assertUntouched(rt, before);
  });

for (const [name, raw, expected] of [
  ["direct without schema", direct(), direct()],
  ["direct v1 with numeric ID", direct({schema: "v1", id: date}), direct({schema: "v1", id: date})],
  ["original numeric timestamp ID", original(), {date, id: date, km: 1250,
    ev: {consumption: 17.5, price: .32, costPer100: 5.6},
    fuel: {consumption: 6.4, price: 1.9, costPer100: 12.16}, result: {yearlySaving: 984, monthlySaving: 82}}],
  ["original ISO instant without ID", original({id: undefined, timestamp: "2024-07-03T09:46:40.000Z"}),
    {date, timestamp: "2024-07-03T09:46:40.000Z", km: 1250,
      ev: {consumption: 17.5, price: .32, costPer100: 5.6},
      fuel: {consumption: 6.4, price: 1.9, costPer100: 12.16}, result: {yearlySaving: 984, monthlySaving: 82}}],
]) test(`documented legacy form ${name} migrates deterministically`, async () => {
  const rt = empty();
  await importFile(rt, envelope([raw]));
  assert.deepEqual(stored(rt), [expected]);
  await assertRoundTrip(rt);
});

test("missing legacy optional fields remain absent and are never replaced by zero", async () => {
  const raw = direct({result: undefined, ev: {consumption: 17.5, price: .32}, fuel: {consumption: 6.4, price: 1.9}});
  const rt = empty("us");
  await importFile(rt, envelope([raw]));
  const row = stored(rt)[0];
  for (const field of ["id", "result", "note", "ridesharing", "persons", "marketCode", "currencyMetadata"]) assert.equal(field in row, false);
  assert.equal("costPer100" in row.ev, false);
  assert.equal("costPer100" in row.fuel, false);
  assert.equal(rt.elements.get("legacyList").children[0].children[0].children[1].textContent, "—");
  await assertRoundTrip(rt);
});

test("original missing results migrate inputs without inventing historical observations", async () => {
  const raw = original({results: undefined});
  const rt = empty();
  await importFile(rt, envelope([raw]));
  assert.equal(stored(rt)[0].km, 1250);
  assert.equal("result" in stored(rt)[0], false);
  assert.equal("costPer100" in stored(rt)[0].ev, false);
  await assertRoundTrip(rt);
});

for (const [market, language, code, symbol, locale] of [
  ["de", "de", "EUR", "€", "de-DE"], ["eu", "en", "EUR", "€", "de-DE"],
  ["us", "en", "USD", "$", "en-US"], ["tr", "tr", "TRY", "₺", "tr-TR"],
]) test(`legacy ${market} explicit metadata and metric raw values remain unchanged`, async () => {
  const raw = direct({id, marketCode: market, language, currencyMetadata: {code, symbol, locale}, sourceLocale: locale,
    units: {distance: "km", fuelVolume: "liter"}, km: 482.80320000000006,
    ev: {consumption: 18.64113576712002, price: .16, costPer100: 2.9825817227392033},
    fuel: {consumption: 9.046714743589742, price: .845350567546075, costPer100: 7.647645442921033},
    note: "  ÄÖü İstanbul ; \"Unicode\"\nsecond line\t<img src=x>  "});
  const rt = empty(market);
  await importFile(rt, envelope([raw]));
  assert.deepEqual(stored(rt), [raw]);
  const body = rt.elements.get("legacyList").children[0].children[0];
  assert.ok(body.children[1].textContent.includes(symbol));
  await assertRoundTrip(rt);
});

test("legacy without currency uses historical EUR while the current UI is US", async () => {
  const rt = empty("us");
  await importFile(rt, envelope([direct()]));
  const body = rt.elements.get("legacyList").children[0].children[0];
  assert.match(body.children[1].textContent, /€/);
  assert.doesNotMatch(body.children[1].textContent, /\$/);
  assert.equal("currencyMetadata" in stored(rt)[0], false);
});

test("historical rounded, negative and absent observations retain separate identities", async () => {
  const rows = [direct(), direct({result: {yearlySaving: 1180.8, monthlySaving: 98.4}}),
    direct({result: {yearlySaving: -42.123, monthlySaving: -3.51025}}), direct({result: undefined})];
  const rt = empty();
  await importFile(rt, envelope(rows));
  assert.equal(stored(rt).length, 4);
  assert.deepEqual(stored(rt).map(row => row.result), rows.map(row => row.result));
  await assertRoundTrip(rt);
});

test("conflicting modern ID with a different saved legacy observation rejects all rows", async () => {
  const raw = direct({id});
  const rt = historyRuntime({storage: {[historyKey]: JSON.stringify([raw])}});
  const before = rt.storage.get(historyKey);
  await importFile(rt, envelope([entry(), {...raw, result: {yearlySaving: 1180.8, monthlySaving: 98.4}}]));
  assertUntouched(rt, before);
});

const invalid = [
  ["missing km", row => { delete row.km; }],
  ["missing EV consumption", row => { delete row.ev.consumption; }],
  ["missing fuel price", row => { delete row.fuel.price; }],
  ["string input", row => { row.km = "1000"; }],
  ["negative input", row => { row.ev.price = -1; }],
  ["null input", row => { row.fuel.consumption = null; }],
  ["null calculated cost", row => { row.ev.costPer100 = null; }],
  ["negative calculated cost", row => { row.fuel.costPer100 = -1; }],
  ["null result", row => { row.result = null; }],
  ["null saving", row => { row.result.yearlySaving = null; }],
  ["string saving", row => { row.result.monthlySaving = "98"; }],
  ["missing time", row => { delete row.date; }],
  ["string date", row => { row.date = String(date); }],
  ["invalid date", row => { row.date = 8640000000000001; }],
  ["unknown ID", row => { row.id = "legacy-mystery"; }],
  ["conflicting ID time", row => { row.id = date + 1; }],
  ["unknown schema", row => { row.schema = "v0"; }],
  ["ambiguous mixed shape", row => { row.inputs = original().inputs; }],
  ["unproven miles", row => { row.units = {distance: "mile"}; }],
  ["unproven units", row => { row.units = {distance: "km", volume: "liter"}; }],
  ["malformed market", row => { row.marketCode = "uk"; }],
  ["conflicting currency", row => { row.marketCode = "us"; row.currencyMetadata = {code: "EUR", symbol: "€", locale: "de-DE"}; }],
  ["oversized note", row => { row.note = "a".repeat(201); }],
  ["control note", row => { row.note = "before\u0000after"; }],
  ["fake person count", row => { row.persons = 1.5; }],
  ["overflowing calculation", row => { row.km = 1e308; row.ev.consumption = 1e308; }],
];
for (const [name, change] of invalid) test(`invalid historical ${name} aborts the entire mixed backup`, async () => {
  const rt = historyRuntime();
  const before = rt.storage.get(historyKey);
  const bad = direct();
  change(bad);
  await importFile(rt, envelope([entry({id}), original(), bad]));
  assertUntouched(rt, before);
});

for (const timestamp of ["2024-02-30T09:46:40Z", "2024-07-03T24:00:00Z", "2024-07-03", "2024-07-03T09:46:40", "invalid"])
  test(`ambiguous original timestamp ${timestamp} never creates a fallback date`, async () => {
    const rt = historyRuntime();
    const before = rt.storage.get(historyKey);
    await importFile(rt, envelope([entry({id}), original({id: undefined, timestamp})]));
    assertUntouched(rt, before);
  });

test("incomplete original inputs and explicit null observations reject the whole file", async () => {
  for (const raw of [original({inputs: {}}), original({results: null}), original({results: {yearly_difference: null}}),
    original({inputs: {...original().inputs, units: {distance: "mile"}}})]) {
    const rt = historyRuntime();
    const before = rt.storage.get(historyKey);
    await importFile(rt, envelope([entry({id}), raw]));
    assertUntouched(rt, before);
  }
});

test("mixed legacy capacity reject is atomic and existing rows are not evicted", async () => {
  const rows = Array.from({length: 49}, (_, i) => entry({id: "eaf_" + i.toString(16).padStart(32, "0"), date: date - i}));
  const rt = historyRuntime({storage: {[historyKey]: JSON.stringify(rows)}});
  const before = rt.storage.get(historyKey);
  await importFile(rt, envelope([direct(), original()]));
  assertUntouched(rt, before);
  assert.match(rt.alerts[0], /Speichergrenze von 50/);
  rt.alerts.length = 0;
  await importFile(rt, envelope([direct()]));
  assert.equal(stored(rt).length, 50);
  assert.ok(rows.every(row => stored(rt).some(saved => saved.id === row.id)));
  const full = rt.storage.get(historyKey);
  await importFile(rt, envelope([direct()]));
  assert.equal(rt.storage.get(historyKey), full);
  assert.match(rt.alerts.at(-1), /0 neue Einträge importiert, 1 übersprungen/);
});

test("entryCount mismatch rejects a truncated own backup without a partial import", async () => {
  const rt = historyRuntime();
  const before = rt.storage.get(historyKey);
  await importFile(rt, {...envelope([entry({id}), direct()]), entryCount: 3});
  assertUntouched(rt, before);
});

test("JSON export preserves all oversized historical rows and restore fails safely at capacity", async () => {
  const rows = Array.from({length: 51}, (_, i) => direct({date: date - i, note: `old ${i}`}));
  const raw = JSON.stringify(rows);
  const rt = historyRuntime({storage: {[historyKey]: raw}});
  const file = await exportFile(rt);
  assert.equal(file.entryCount, 51);
  assert.deepEqual(file.entries, rows);
  assert.equal(rt.storage.get(historyKey), raw);
  const target = empty();
  await importFile(target, file);
  assertUntouched(target, "[]");
  assert.match(target.alerts[0], /Speichergrenze von 50/);
});

test("browser JSON export never filters a corrupt sibling into an incomplete backup", () => {
  const rt = empty();
  const raw = JSON.stringify([direct(), null]);
  rt.storage.set(historyKey, raw);
  rt.elements.get("histExportBtn").click();
  assert.equal(rt.blobs.length, 0);
  assert.equal(rt.storage.get(historyKey), raw);
  assert.match(rt.alerts[0], /Ungültige/);
});
