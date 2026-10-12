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
  assert.match(file.filename, /^evspendpure-history-/);
  assert.equal(JSON.parse(file.data).app, "evspend");
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

test("shared CSV neutralizes LF CRLF and whitespace formula prefixes without changing raw notes", () => {
  const cases = [
    ["\n=1+1", '"\'\n=1+1"'],
    ["\nordinary", '"\'\nordinary"'],
    ["\r\n+SUM(A1)", '"\'\r\n+SUM(A1)"'],
    ["\t-cmd", "'\t-cmd"],
    ["\r@SUM(A1)", '"\'\r@SUM(A1)"'],
    ["  =1+1", "'  =1+1"],
    ["  +SUM(A1)", "'  +SUM(A1)"],
    ["  -cmd", "'  -cmd"],
    [" \t@SUM(A1)", "' \t@SUM(A1)"],
    ["\u00a0=1+1", "'\u00a0=1+1"],
  ];
  for (const [note, cell] of cases) {
    const records = [entry({note})];
    const original = JSON.stringify(records);
    const rt = runtime("us", records);
    const csv = rt.context.window.EAF_HISTORY_EXPORT.csv().data;
    assert.ok(csv.includes(";" + cell + ";EUR;de;de\r\n"), JSON.stringify(note));
    assert.equal(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries[0].note, note);
    assert.equal(rt.storage.get(historyKey), original);
  }
});

test("shared CSV keeps true numeric notes including signed and control prefixed numbers", () => {
  const cases = [
    ["-12.5", "-12.5"], ["+12.5", "+12.5"],
    ["\n-12.5", '"\n-12.5"'], ["\r\n+12.5", '"\r\n+12.5"'],
    [" \t-12.5", " \t-12.5"], ["\t12.5", "\t12.5"],
  ];
  for (const [note, cell] of cases) {
    const rt = runtime("us", [entry({note})]);
    const original = rt.storage.get(historyKey);
    assert.ok(rt.context.window.EAF_HISTORY_EXPORT.csv().data.includes(";" + cell + ";EUR;de;de\r\n"), JSON.stringify(note));
    assert.equal(rt.storage.get(historyKey), original);
  }
});

test("shared Turkish CSV preserves Unicode and whitespace notes with CSV quotes", () => {
  const note = '  İstanbul, ölçüm: Şarj; "çığır" 🌿\r\nİkinci satır  ';
  const rt = runtime("tr", [entry({note})]);
  const original = rt.storage.get(historyKey);
  const cell = '"  İstanbul, ölçüm: Şarj; ""çığır"" 🌿\r\nİkinci satır  "';
  assert.ok(rt.context.window.EAF_HISTORY_EXPORT.csv().data.includes(";" + cell + ";EUR;de;de\r\n"));
  assert.equal(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries[0].note, note);
  assert.equal(rt.storage.get(historyKey), original);
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

for (const [market, separator] of [["de",","], ["us","."], ["tr",","]]) {
  test(`shared ${market} CSV removes numeric noise while preserving precision and JSON raw values`, async () => {
    const records = [entry({km:177.02784000000003, consumption:18.64113576712002, note:"precision"})];
    const original = JSON.stringify(records);
    const rt = runtime(market, records);
    const file = rt.context.window.EAF_HISTORY_EXPORT.csv();
    const cells = file.data.split("\r\n")[1].split(";");
    assert.equal(cells[2], "177.02784".replace(".", separator));
    assert.equal(cells[3], "18.64113576712".replace(".", separator));
    assert.ok(Math.abs(Number(cells[3].replace(",", ".")) - records[0].consumption) < 3e-14);
    assert.equal(cells[3].includes("64113576712"), true, "consumption keeps meaningful precision beyond cents");
    rt.elements.get("histCsvExportBtn").click();
    assert.deepEqual(Buffer.from(await rt.blobs[0].arrayBuffer()), Buffer.from(file.data, "utf8"));
    assert.equal(rt.storage.get(historyKey), original);
    const exported = JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries[0];
    assert.equal(exported.km, 177.02784000000003);
    assert.equal(exported.consumption, 18.64113576712002);
    assert.equal(rt.storage.get(historyKey), original);
  });
}

test("shared CSV keeps exact integer distances without significant digit rounding", () => {
  const rt = runtime("us", [entry({km:1000000000000001})]);
  const cells = rt.context.window.EAF_HISTORY_EXPORT.csv().data.split("\r\n")[1].split(";");
  assert.equal(cells[2], "1000000000000001");
  assert.equal(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries[0].km, 1000000000000001);
});

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
