import assert from "node:assert/strict";
import test from "node:test";
import { historyRuntime, ready, importFile, envelope, entry, historyKey, importedSignal } from "./history-runtime.mjs";

const idA = "eaf_" + "a".repeat(32), idB = "eaf_" + "b".repeat(32);
const fixedDate = 1720000000000;
function stored(rt) { return JSON.parse(rt.storage.get(historyKey)); }
function untouched(rt, before) {
  assert.equal(rt.storage.get(historyKey), before);
  assert.equal(rt.calls.filter(([m,k]) => m === "setItem" && k === historyKey).length, 0);
  assert.equal(rt.alerts.length, 1);
  assert.doesNotMatch(rt.alerts[0], importedSignal);
}
function openRow(rt, index = 0, list = "histList") {
  rt.elements.get(list).children[index].children[0].click();
  const search = new URL(rt.context.location.href, "https://example.test/").search;
  return ready({search, storage: Object.fromEntries(rt.storage)});
}
async function deleteRow(rt, index = 0, list = "histList") {
  rt.elements.get(list).children[index].children[1].click();
  await rt.settle();
}
async function exportFile(rt) {
  rt.elements.get("histExportBtn").click();
  assert.equal(rt.blobs.length, 1);
  return JSON.parse(await rt.blobs[0].text());
}

const badEntries = [
  ["fehlende Strecke", e => {delete e.km;}],
  ["fehlender Verbrauch", e => {delete e.consumption;}],
  ["fehlender Preis", e => {delete e.price;}],
  ["Null statt Zahlen", e => {e.km=null;e.consumption=null;e.price=null;}],
  ["leerer Preis", e => {e.price="";}],
  ["Zahl als String", e => {e.km="10";}],
  ["Localezahl", e => {e.price="0,37";}],
  ["Boolean als Zahl", e => {e.consumption=true;}],
  ["Array als Zahl", e => {e.km=[];}],
  ["negative Strecke", e => {e.km=-1;}],
  ["negativer Verbrauch", e => {e.consumption=-1;}],
  ["negativer Preis", e => {e.price=-1;}],
  ["fehlendes Datum", e => {delete e.date;}],
  ["Datum als String", e => {e.date=String(fixedDate);}],
  ["Datum außerhalb des Kalenders", e => {e.date=1e20;}],
  ["Datum jenseits Dategrenze", e => {e.date=8640000000000001;}],
  ["Datum Null", e => {e.date=0;}],
  ["falsches Eintragsschema", e => {e.schema="v3";}],
  ["falscher Typ", e => {e.type="boat";}],
  ["ungültiger Markt", e => {e.marketCode="uk";}],
  ["geerbter Marktname", e => {e.marketCode="toString";}],
  ["ungültige Währung", e => {e.currencyMetadata.code="GBP";}],
  ["geerbter Währungsname", e => {e.currencyMetadata.code="constructor";}],
  ["widersprüchliche Währung", e => {e.marketCode="us";}],
  ["unvollständige Währungsdaten", e => {delete e.currencyMetadata.locale;}],
  ["ungültige Locale", e => {e.currencyMetadata.locale="de_DE";}],
  ["ungültige Sprache", e => {e.language="constructor";}],
  ["ungültige Quelllocale", e => {e.sourceLocale="?";}],
  ["String statt Ridesharing", e => {e.ridesharing="false";}],
  ["String statt Personenzahl", e => {e.persons="2";}],
  ["ungültige Personenzahl", e => {e.persons=0;}],
  ["gebrochene Personenzahl", e => {e.persons=1.5;}],
  ["Objekt statt Notiz", e => {e.note={text:"test"};}],
  ["ungültige ID", e => {e.id="";}],
  ["Überlauf der Kosten", e => {e.km=1e308;e.consumption=1e308;}],
];
for (const [name, change] of badEntries) test(`EVS-006 ${name} verwirft die gesamte Datei`, async () => {
  const rt = historyRuntime();
  const before = rt.storage.get(historyKey);
  const bad = entry({date: fixedDate});change(bad);
  // The valid sibling proves there is no partial commit on this failure.
  await importFile(rt, envelope([entry({id:idA}), bad]));
  untouched(rt, before);
  rt.alerts.length = 0;
  await importFile(rt, envelope([entry({id:idB})]));
  assert.match(rt.alerts[0], /1 neue Einträge importiert/);
  assert.equal(stored(rt).length, 2);
});

test("EVS-006 JSON Überlauf und nicht darstellbare NaN Daten werden abgewiesen", async () => {
  for (const value of ["1e309", "NaN", "Infinity"]) {
    const rt=historyRuntime(); const before=rt.storage.get(historyKey);
    const file=JSON.stringify(envelope([entry({price:123456})])).replace('"price":123456', '"price":'+value);
    await importFile(rt,file);untouched(rt,before);
  }
});
test("EVS-006 falscher Envelope, Version und unvollständiger Eintrag verändern nichts", async () => {
  for(const file of [[],{...envelope(),schemaVersion:2},{...envelope(),schemaVersion:"1"},{...envelope(),entries:{}},envelope([{}])]) {
    const rt=historyRuntime();const before=rt.storage.get(historyKey);await importFile(rt,file);untouched(rt,before);
  }
});
test("EVS-006 explizite Nullwerte und gültige Dategrenze bleiben kompatibel", async () => {
  const rt=historyRuntime();await importFile(rt,envelope([entry({id:idA,date:8640000000000000,km:0,consumption:0,price:0})]));
  assert.match(rt.alerts[0], /1 neue Einträge importiert/);
  const saved=stored(rt).find(e=>e.id===idA);assert.equal(saved.yearlyCost,0);assert.equal(saved.price,0);
});
test("EVS-006 ältere v2 Datei ohne optionale Metadaten bleibt importierbar", async () => {
  const rt=historyRuntime();const old={schema:"v2",type:"vb",date:fixedDate,km:20,consumption:6.5,price:1.8};
  await importFile(rt,envelope([old]));assert.match(rt.alerts[0], /1 neue Einträge importiert/);
  const saved=stored(rt).find(e=>e.date===fixedDate);assert.equal(saved.marketCode,undefined);assert.equal(saved.id,undefined);
  const reopened=openRow(rt,1);assert.equal(reopened.context.window.EAF_I18N.getMarketCode(),"de");
  assert.equal(Number(reopened.elements.get("kmVb").value),20);
});
test("EVS-006 unbekannte Felder und manipulierte Ergebnisfelder gelangen nicht in den Import", async () => {
  const rt=historyRuntime();await importFile(rt,envelope([entry({id:idA,km:1250,consumption:17.5,price:.37,costPer100:123,monthlyCost:456,yearlyCost:789,unknown:{data:"ignored"}})]));
  const saved=stored(rt).find(e=>e.id===idA);assert.equal(saved.unknown,undefined);assert.equal(saved.yearlyCost,971.25);assert.equal(saved.costPer100,6.475);
});

for (const [market,lang,code,symbol,locale] of [
  ["de","de","EUR","€","de-DE"],["eu","en","EUR","€","de-DE"],
  ["tr","tr","TRY","₺","tr-TR"],["us","en","USD","$","en-US"]
]) for (const type of ["ev","vb"]) test(`EVS-006 EVS-007 echter Speicher Export Import Neustart ${market} ${type}`, async () => {
  const rt=historyRuntime({storage:{[historyKey]:"[]"}});
  rt.run(`window.EAF_I18N.setMarket('${market}'); appMode='single'; singleType='${type}'`);
  assert.equal(await rt.run("saveQuick()"),true);
  const saved=stored(rt)[0];assert.match(saved.id,/^eaf_[0-9a-f]{32}$/);
  assert.equal(saved.marketCode,market);assert.equal(saved.currencyMetadata.code,code);
  const file=await exportFile(rt);assert.equal(file.entries[0].id,saved.id);
  const target=historyRuntime({storage:{[historyKey]:"[]"}});await importFile(target,file);
  const imported=stored(target)[0];assert.deepEqual(imported,saved);
  const first=target.storage.get(historyKey);await importFile(target,file);await importFile(target,file);assert.equal(target.storage.get(historyKey),first);
  assert.match(target.alerts.at(-1),/0 neue Einträge importiert, 1 übersprungen/);
  const restarted=historyRuntime({storage:Object.fromEntries(target.storage)});assert.equal(stored(restarted)[0].id,saved.id);
  const opened=openRow(restarted);assert.equal(opened.context.window.EAF_I18N.getMarketCode(),market);assert.equal(opened.context.window.EAF_I18N.getCurrency(),code);
  assert.ok(Math.abs(opened.run("_getSingleData().km")-saved.km)<1e-9);
});

test("EVS-007 Auditfall gleiche Zeit getrennt öffnen und nur zweite Zeile löschen", async () => {
  const rt=historyRuntime({storage:{[historyKey]:"[]"}});
  await importFile(rt,envelope([entry({date:fixedDate,km:10}),entry({date:fixedDate,km:20})]));
  assert.equal(stored(rt).length,2);
  assert.equal(Number(openRow(rt,0).elements.get("kmEv").value),10);
  assert.equal(Number(openRow(rt,1).elements.get("kmEv").value),20);
  await deleteRow(rt,1);assert.deepEqual(stored(rt).map(e=>e.km),[10]);
});
test("EVS-007 neue gleichartige Einträge bei gleicher Millisekunde erhalten verschiedene IDs", async () => {
  const rt=historyRuntime({storage:{[historyKey]:"[]"}});
  rt.run("Date.now=()=>1720000000000; appMode='single'");
  assert.equal(await rt.run("saveQuick()"),true);assert.equal(await rt.run("saveQuick()"),true);
  const saved=stored(rt);assert.equal(saved[0].date,saved[1].date);assert.notEqual(saved[0].id,saved[1].id);
  const history=historyRuntime({storage:Object.fromEntries(rt.storage)});
  await deleteRow(history,1);assert.deepEqual(stored(history).map(e=>e.id),[saved[0].id]);
});
test("EVS-007 gleiche Werte mit unterschiedlichen IDs werden nicht dedupliziert", async () => {
  const rt=historyRuntime({storage:{[historyKey]:"[]"}});
  await importFile(rt,envelope([entry({date:fixedDate,id:idA}),entry({date:fixedDate,id:idB})]));
  assert.equal(stored(rt).length,2);
  const before=rt.storage.get(historyKey);await importFile(rt,envelope(stored(rt)));assert.equal(rt.storage.get(historyKey),before);
  await deleteRow(rt,1);assert.deepEqual(stored(rt).map(e=>e.id),[idA]);
});
test("EVS-007 widersprüchliche gleiche ID in Datei oder Altbestand verwirft alles", async () => {
  for(const existing of [[],[entry({id:idA,date:fixedDate,km:10})]]) {
    const rt=historyRuntime({storage:{[historyKey]:JSON.stringify(existing)}});const before=rt.storage.get(historyKey);
    await importFile(rt,envelope([entry({id:idB}),entry({id:idA,date:fixedDate,km:10}),entry({id:idA,date:fixedDate,km:20})]));untouched(rt,before);
  }
});
test("EVS-007 alte Snapshots behalten Notizen, Mitfahrer, Markt und Währung getrennt", async () => {
  const entries=[entry({date:fixedDate,note:"A"}),entry({date:fixedDate,note:"B"}),entry({date:fixedDate,note:"A",ridesharing:true,persons:2}),entry({date:fixedDate,note:"A",marketCode:"tr",language:"tr",currencyMetadata:{code:"TRY",symbol:"₺",locale:"tr-TR"}})];
  const rt=historyRuntime({storage:{[historyKey]:"[]"}});await importFile(rt,envelope(entries));assert.equal(stored(rt).length,4);
  const before=rt.storage.get(historyKey);await importFile(rt,envelope(entries));assert.equal(rt.storage.get(historyKey),before);
  assert.equal(openRow(rt,3).context.window.EAF_I18N.getCurrency(),"TRY");
  await deleteRow(rt,1);assert.deepEqual(stored(rt).map(e=>e.note),["A","A","A"]);
});
test("EVS-007 alte gerundete Exporte bleiben beim Wiederimport deterministisch", async () => {
  const raw=entry({date:fixedDate,km:500,consumption:17.5,price:.37,costPer100:6.48,monthlyCost:32.4,yearlyCost:388.8});
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([raw])}});const before=rt.storage.get(historyKey);
  await importFile(rt,await exportFile(rt));assert.equal(rt.storage.get(historyKey),before);assert.match(rt.alerts[0],/0 neue Einträge importiert, 1 übersprungen/);
});
test("EVS-007 alte identische Zeilen löschen nur die gewählte Position", async () => {
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([entry({date:fixedDate}),entry({date:fixedDate})])}});
  assert.equal(Number(openRow(rt,1).elements.get("kmEv").value),100);await deleteRow(rt,1);assert.equal(stored(rt).length,1);
});
test("EVS-007 mehrdeutiger alter Zeitlink öffnet kein beliebiges Szenario", () => {
  const rt=ready({search:"?id="+fixedDate,storage:{[historyKey]:JSON.stringify([entry({date:fixedDate,km:10}),entry({date:fixedDate,km:20})])}});
  assert.equal(rt.elements.get("kmEv").value,"50");assert.match(rt.elements.get("eaf-toast").textContent,/geöffnet/);
});
test("EVS-007 Legacy Vergleich bleibt lesbar und gezielt auswählbar", async () => {
  const entries=[{schema:"v1",date:fixedDate,km:100,ev:{consumption:18,price:.3},fuel:{consumption:6.5,price:1.8}},{schema:"v1",date:fixedDate,km:200,ev:{consumption:18,price:.3},fuel:{consumption:6.5,price:1.8}}];
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify(entries)}});
  assert.equal(Number(openRow(rt,1,"legacyList").elements.get("kmShared").value),200);await deleteRow(rt,1,"legacyList");assert.equal(stored(rt)[0].km,100);
});
test("EVS-007 Neuanlage nach Löschen erhält eigene Identität", async () => {
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([entry({id:idA})])}});await deleteRow(rt);assert.equal(stored(rt).length,0);
  rt.run("appMode='single'");assert.equal(await rt.run("saveQuick()"),true);assert.notEqual(stored(rt)[0].id,idA);
});
test("EVS-007 ID Kollision wird begrenzt wiederholt, Ausfall verändert keinen Bestand", async () => {
  const duplicate={getRandomValues(bytes){bytes.fill(170);return bytes;}};
  const rt=historyRuntime({crypto:duplicate,storage:{[historyKey]:JSON.stringify([entry({id:idA})])}});
  const before=rt.storage.get(historyKey);rt.run("appMode='single'");assert.equal(await rt.run("saveQuick()"),false);assert.equal(rt.storage.get(historyKey),before);
  assert.match(rt.elements.get("eaf-toast").textContent,/speichern/i);
});


test("EVS-006 ältere Teilmetadaten übernehmen Markt und Währung ohne Zahlenumrechnung", async () => {
  for (const [fields,market,code] of [
    [{marketCode:"us"},"us","USD"],
    [{currencyMetadata:{code:"TRY",symbol:"₺",locale:"tr-TR"}},"tr","TRY"]
  ]) {
    const old={schema:"v2",type:"ev",date:fixedDate,km:100,consumption:18,price:.3,...fields};
    const rt=historyRuntime({storage:{[historyKey]:"[]"}});await importFile(rt,envelope([old]));
    const saved=stored(rt)[0];assert.equal(saved.marketCode,market);assert.equal(saved.currencyMetadata.code,code);
    assert.equal(saved.km,100);assert.equal(saved.price,.3);
    const before=rt.storage.get(historyKey);await importFile(rt,envelope([old]));assert.equal(rt.storage.get(historyKey),before);
  }
});
test("EVS-007 bestehendes Szenario erneut speichern legt gemäß Produktmodell einen neuen Eintrag an", async () => {
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([entry({id:idA})])}});
  const opened=openRow(rt);assert.equal(await opened.run("saveQuick()"),true);
  const saved=stored(opened);assert.equal(saved.length,2);assert.equal(saved[1].id,idA);assert.notEqual(saved[0].id,idA);
});
test("EVS-007 ID Generator erholt sich nach Kollision und verweigert fehlende Zufallsquelle", async () => {
  let calls=0;const crypto={getRandomValues(bytes){bytes.fill(calls++ === 0 ? 170 : 187);return bytes;}};
  const rt=historyRuntime({crypto,storage:{[historyKey]:JSON.stringify([entry({id:idA})])}});
  rt.run("appMode='single'");assert.equal(await rt.run("saveQuick()"),true);assert.equal(stored(rt)[0].id,idB);assert.equal(calls,2);
  const unavailable=historyRuntime({crypto:{}});const before=unavailable.storage.get(historyKey);
  unavailable.run("appMode='single'");assert.equal(await unavailable.run("saveQuick()"),false);assert.equal(unavailable.storage.get(historyKey),before);
});
test("EVS-007 verschobene alte Zeile wird über Inhalt statt über ihre alte Position geöffnet", () => {
  const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([entry({date:fixedDate,km:10}),entry({date:fixedDate,km:20})])}});
  rt.elements.get("histList").children[1].children[0].click();const search=new URL(rt.context.location.href,"https://example.test/").search;
  const rearranged=stored(rt).reverse();const opened=ready({search,storage:{...Object.fromEntries(rt.storage),[historyKey]:JSON.stringify(rearranged)}});
  assert.equal(Number(opened.elements.get("kmEv").value),20);
});


test("EVS-007 Export eines vorhandenen alten Eintrags mit Teilmetadaten erzeugt kein Duplikat", async () => {
  for (const fields of [{marketCode:"us"},{currencyMetadata:{code:"TRY",symbol:"₺",locale:"tr-TR"}}]) {
    const old={schema:"v2",type:"ev",date:fixedDate,km:100,consumption:18,price:.3,...fields};
    const rt=historyRuntime({storage:{[historyKey]:JSON.stringify([old])}});const before=rt.storage.get(historyKey);
    await importFile(rt,await exportFile(rt));assert.equal(rt.storage.get(historyKey),before);assert.match(rt.alerts[0],/0 neue Einträge importiert, 1 übersprungen/);
  }
});
test("EVS-006 fehlerhafte Importmeldungen bleiben in DE EN TR verständlich", async () => {
  for (const [language,market,pattern] of [["de-DE","de",/Ungültige/],["en-US","us",/Invalid/],["tr-TR","tr",/Geçersiz/]]) {
    const rt=historyRuntime({language,storage:{"eaf.market":market,"eaf.language":market==="us"?"en":market}});const before=rt.storage.get(historyKey);
    await importFile(rt,envelope([entry({price:null})]));untouched(rt,before);assert.match(rt.alerts[0],pattern);
  }
});
