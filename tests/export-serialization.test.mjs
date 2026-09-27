import assert from "node:assert/strict";
import test from "node:test";
import { historyRuntime, entry, historyKey } from "./history-runtime.mjs";

function runtime(market = "de", entries = [entry()]) {
  const rt = historyRuntime({inputs:{histCsvExportBtn:""},storage:{"eaf.market":market,[historyKey]:JSON.stringify(entries)}});
  rt.context.Date = class extends Date {
    constructor(value) { super(value === undefined ? "2026-09-27T12:34:56Z" : value); }
    static now() { return Date.parse("2026-09-27T12:34:56Z"); }
  };
  return rt;
}

test("shared JSON serialization and browser transport produce identical bytes", async () => {
  const rt = runtime("us", [entry({id:"eaf_export", marketCode:"us", note:"=1+1"})]);
  const file = rt.context.window.EAF_HISTORY_EXPORT.json();
  rt.elements.get("histExportBtn").click();
  assert.equal(await rt.blobs[0].text(), file.data);
  const envelope = JSON.parse(file.data);
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.entries[0].id, "eaf_export");
  assert.equal(envelope.entries[0].note, "=1+1");
  assert.match(file.filename, /2026-09-27\.json$/);
});

test("shared CSV neutralizes formula text while preserving source and normal values", () => {
  const notes = ["=1+1", "+SUM(A1)", "-cmd", "@SUM(A1)", "\t=1+1", "\r=1+1", "-12", "normal;\"quoted\"\r\ntext"];
  const records = notes.map((note,i)=>entry({note,date:Date.now()-i}));
  const rt = runtime("us", records);
  const file = rt.context.window.EAF_HISTORY_EXPORT.csv();
  assert.ok(file.data.startsWith("\uFEFF"));
  assert.ok(file.data.endsWith("\r\n"));
  for (const note of notes.slice(0,4)) assert.ok(file.data.includes("'"+note));
  assert.ok(file.data.includes("\"'\t=1+1\"") || file.data.includes("'\t=1+1"));
  assert.ok(file.data.includes("\"'\r=1+1\""));
  assert.ok(file.data.includes(";-12;"));
  assert.ok(file.data.includes('"normal;""quoted""\r\ntext"'));
  assert.equal(rt.storage.get(historyKey), JSON.stringify(records));
});

for (const [market, header, cost] of [["de","Datum","5,40"],["us","Date","5.40"],["tr","Tarih","5,40"]]) {
  test(`shared ${market} CSV header, decimals and browser transport match`, async () => {
    const rt = runtime(market);
    const file = rt.context.window.EAF_HISTORY_EXPORT.csv();
    assert.ok(file.data.startsWith("\uFEFF"+header+";"));
    assert.ok(file.data.includes(";"+cost+";"));
    rt.elements.get("histCsvExportBtn").click();
    assert.deepEqual(Buffer.from(await rt.blobs[0].arrayBuffer()), Buffer.from(file.data, "utf8"));
    assert.match(file.filename,/2026-09-27\.csv$/);
  });
}

test("native serialization boundary rejects corrupt storage without altering it", () => {
  const rt = runtime();
  for (const raw of ["{invalid", "{}", "[null]"]) {
    rt.storage.set(historyKey, raw);
    assert.throws(() => rt.context.window.EAF_HISTORY_EXPORT.json());
    assert.throws(() => rt.context.window.EAF_HISTORY_EXPORT.csv());
    assert.equal(rt.storage.get(historyKey), raw);
  }
  rt.storage.set(historyKey, "[]");
  assert.equal(rt.context.window.EAF_HISTORY_EXPORT.json(), null);
  assert.equal(rt.context.window.EAF_HISTORY_EXPORT.csv(), null);
});
