import assert from "node:assert/strict";
import test from "node:test";
import {createRuntime, historyKey} from "./history-runtime.mjs";

const inputKey = "eaf.inputs.v2";
const inputs = {
  kmEv:50, kmVb:50, kmShared:1000, evVerbrauch:17, strompreis:.37,
  verbrauchVerbrenner:7, benzinpreis:1.85, batteryKwh:60,
  noteInput:"", marketSwitchLabel:"", singleHeroVal:"",
  kmEvV:"", kmVbV:"", kmSharedV:"", evVerbrauchV:"", strompreisV:"",
  verbrauchVerbrennerV:"", benzinpreisV:"", qSaveBtn:"", saveHint:"",
  ridesharePersons:1, ridesharePersonsV:"", rideshareToggle:"", longtermToggle:""
};
function runtime({entries = [], search = "", market = "de", storage = {}} = {}) {
  const rt = createRuntime({inputs, search, storage:{
    "eaf.appVersion":"20260428-1", "eaf.market":market,
    [historyKey]:JSON.stringify(entries), ...storage
  }});
  rt.context.Event = class Event {constructor(type) {this.type = type;}};
  rt.context.CustomEvent = class CustomEvent {constructor(type, opts = {}) {this.type=type; this.detail=opts.detail;}};
  rt.dispatchDom("DOMContentLoaded");
  return rt;
}
function scenario(market, type, distance, offgrid = false) {
  const us = market === "us";
  const rawConsumption = type === "ev" ? (us ? 30.125 : 17.125) : (us ? 26.25 : 7.125);
  const rawPrice = type === "ev" ? (us ? .163 : market === "tr" ? 3.413 : .373)
    : (us ? 3.213 : market === "tr" ? 63.123 : 1.853);
  const consumption = offgrid ? rawConsumption : type === "ev" ? (us ? 30 : 17.5) : (us ? 26 : 7);
  const price = offgrid ? rawPrice : type === "ev" ? (us ? .16 : market === "tr" ? 3.4 : .37)
    : (us ? 3.2 : market === "tr" ? 63 : 1.85);
  const internalConsumption = us ? (type === "ev" ? consumption / 1.609344 : (100 * 3.785411784 / 1.609344) / consumption) : consumption;
  const internalPrice = us && type === "vb" ? price / 3.785411784 : price;
  const km = us ? distance * 1.609344 : distance;
  const costPer100 = internalConsumption * internalPrice;
  return {schema:"v2", id:"eaf_" + "a".repeat(32), date:1700000000000,
    type, marketCode:market, km, consumption:internalConsumption, price:internalPrice,
    costPer100, monthlyCost:costPer100 * km / 100, yearlyCost:costPer100 * km / 100 * 12,
    note:"Synthetic history", persons:3, ridesharing:true};
}
function assertOriginal(rt, entry) {
  const data = rt.run("_getSingleData()");
  for (const key of ["km","consumption","price","costPer100","monthlyCost","yearlyCost"]) assert.equal(data[key], entry[key], key);
}

for (const market of ["de","eu","us","tr"]) {
  test(`historical restore ${market}: distances and exact metric parameters survive reopening, reload and Save`, async () => {
    const distances = market === "us" ? [.25,1,299,300,301,1250,2000,6001] : [.25,1,499,500,501,1250,2000,10001];
    for (const type of ["ev","vb"]) for (const distance of distances) {
      const entry = scenario(market,type,distance);
      const rt = runtime({entries:[entry], search:`?id=${entry.id}`, market:market === "us" ? "tr" : "us"});
      assert.equal(rt.run("window.EAF_I18N.getMarketCode()"), market);
      assertOriginal(rt,entry);
      assert.equal(rt.storage.get(historyKey),JSON.stringify([entry]));
      const reboot = runtime({market,storage:Object.fromEntries(rt.storage)});
      assertOriginal(reboot,entry);
      assert.equal(await reboot.run("saveQuick()"),true);
      const resaved = JSON.parse(reboot.storage.get(historyKey))[0];
      for (const key of ["km","consumption","price","costPer100","monthlyCost","yearlyCost"]) assert.equal(resaved[key],entry[key],`${market}/${type}/${distance}/${key}`);
      assert.equal(resaved.note, entry.note);
    }
  });
  test(`historical restore ${market}: off-grid distance, consumption and price preserve values and labels`, async () => {
    for (const type of ["ev","vb"]) {
      const entry = scenario(market,type,1250.25,true);
      const rt = runtime({entries:[entry],search:`?id=${entry.id}`});
      assertOriginal(rt,entry);
      rt.run("refreshSliderValues()");
      const distanceId = type === "ev" ? "kmEv" : "kmVb";
      assert.equal(rt.elements.get(distanceId).step,"any");
      assert.match(rt.elements.get(distanceId+"V").textContent,/25/);
      assert.equal(rt.elements.get(distanceId).getAttribute("aria-valuetext"),rt.elements.get(distanceId+"V").textContent);
      assert.equal(await rt.run("saveQuick()"),true);
      const saved = JSON.parse(rt.storage.get(historyKey))[0];
      for (const key of ["km","consumption","price","monthlyCost"]) assert.equal(saved[key],entry[key]);
      const reboot = runtime({market,storage:Object.fromEntries(rt.storage)});
      assertOriginal(reboot,entry);
    }
  });
}

test("historical restore: normal inputs remain bounded and historical editing releases only its matching field", () => {
  const original = scenario("de","ev",1250,true);
  const rt = runtime({entries:[original],search:`?id=${original.id}`});
  const slider = rt.elements.get("kmEv");
  assert.equal(slider.max,"1250");
  slider.value="1100"; slider.dispatchEvent({type:"input"});
  const reboot = runtime({storage:Object.fromEntries(rt.storage)});
  assert.equal(reboot.run("_getSingleData().km"),1100);
  slider.value="499"; slider.dispatchEvent({type:"input"});
  assert.equal(slider.max,"500");
  assert.equal(slider.step,"1");
  assert.equal(rt.run("_getSingleData().km"),499);
  assert.equal(rt.run("_getSingleData().consumption"),original.consumption);
  assert.equal(JSON.parse(rt.storage.get(inputKey))._historyInputs.values.kmEv,undefined);
  const normal = runtime({storage:{[inputKey]:JSON.stringify({kmEv:"1250"})}});
  assert.equal(normal.elements.get("kmEv").max,"500");
  assert.equal(Number(normal.elements.get("kmEv").value),500);
});

test("historical restore: compatible market preserves binding, incompatible market and explicit reset clear it", () => {
  const entry = scenario("de","ev",1250,true);
  const rt = runtime({entries:[entry],search:`?id=${entry.id}`});
  rt.run("window.EAF_I18N.setMarket('eu')");
  assertOriginal(rt,entry);
  assert.equal(rt.elements.get("kmEv").max,"1250");
  rt.run("window.EAF_I18N.setMarket('us')");
  assert.equal(rt.elements.get("kmEv").max,"300");
  assert.equal(rt.elements.get("kmEv").step,"1");
  assert.equal(rt.elements.get("kmEv").value,"30");
  assert.equal(JSON.parse(rt.storage.get(inputKey))._historyInputs,undefined);
  rt.run("reset()");
  assert.equal(rt.run("Object.keys(_historicalInputs).length"),0);
  assert.equal(rt.elements.get("strompreis").step,"0.01");
});

test("historical restore: malformed or mismatched persisted bindings never extend normal ranges", () => {
  for (const record of [null,{value:"1250",internal:1/0},{value:"1250",internal:1000},{value:"1251",internal:1251},{value:"1250",internal:"1250"}]) {
    const rt = runtime({storage:{[inputKey]:JSON.stringify({kmEv:"1250",_historyInputs:{marketCode:"de",values:{kmEv:record,arbitrary:{value:"1250",internal:1250}}}})}});
    assert.equal(Number(rt.elements.get("kmEv").value),500);
    assert.equal(rt.elements.get("kmEv").max,"500");
    assert.equal(rt.run("Object.keys(_historicalInputs).length"),0);
  }
  const rt = runtime({market:"us",storage:{[inputKey]:JSON.stringify({kmEv:"1250",_historyInputs:{marketCode:"de",values:{kmEv:{value:"1250",internal:1250}}}})}});
  assert.equal(Number(rt.elements.get("kmEv").value),300);
});

test("historical compare restore: small and large distances keep metric values and explicit market", () => {
  for (const market of ["de","eu","us","tr"]) for (const km of [.25,25,1250,20000]) {
    const entry={date:1700000000000,km,marketCode:market,note:"Legacy note",
      ev:{consumption:17.125,price:market === "tr" ? 3.413 : .373},fuel:{consumption:7.125,price:market === "tr" ? 63.123 : 1.853}};
    const rt=runtime({entries:[entry],search:`?id=${entry.date}`,market:"us"});
    assert.equal(rt.run("appMode"),"compare");
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"),market);
    assert.equal(rt.run("n('kmShared')"),km);
    assert.equal(rt.run("n('evVerbrauch')"),entry.ev.consumption);
    assert.equal(rt.run("n('benzinpreis')"),entry.fuel.price);
    assert.equal(rt.elements.get("noteInput").value,entry.note);
    const reboot=runtime({market,storage:Object.fromEntries(rt.storage)});
    assert.equal(reboot.run("n('kmShared')"),km);
    assert.equal(reboot.run("n('verbrauchVerbrenner')"),entry.fuel.consumption);
    assert.equal(rt.storage.get(historyKey),JSON.stringify([entry]));
  }
});

test("historical rideshare restore: accepted 7 and 99 persons keep total and per-person costs through Save and reload", async () => {
  for (const market of ["de","eu","us","tr"]) for (const persons of [7,99]) {
    const entry={...scenario(market,"ev",1250),persons,ridesharing:true};
    const rt=runtime({entries:[entry],search:`?id=${entry.id}`});
    assert.equal(rt.elements.get("ridesharePersons").max,String(persons));
    assert.equal(rt.run("_getSingleData().persons"),persons);
    assert.equal(rt.run("_getSingleData().costPerPerson"),entry.monthlyCost/persons);
    assertOriginal(rt,entry);
    assert.equal(await rt.run("saveQuick()"),true);
    assert.equal(JSON.parse(rt.storage.get(historyKey))[0].persons,persons);
    const reboot=runtime({market,storage:Object.fromEntries(rt.storage)});
    assert.equal(reboot.run("_getSingleData().persons"),persons);
    assert.equal(reboot.run("_getSingleData().costPerPerson"),entry.monthlyCost/persons);
    assert.equal(reboot.elements.get("ridesharePersons").value,String(persons));
    assert.equal(await reboot.run("saveQuick()"),true);
    assert.equal(JSON.parse(reboot.storage.get(historyKey))[0].persons,persons);
  }
});

test("historical rideshare editing, disabling, reset and incompatible market restore the normal six-person range", () => {
  const entry={...scenario("de","ev",1250),persons:99,ridesharing:true};
  for (const action of ["setRidesharePersons(6)","setRideshareActive(false)","reset()","window.EAF_I18N.setMarket('us')"]) {
    const rt=runtime({entries:[entry],search:`?id=${entry.id}`});
    if(action.startsWith("setRidesharePersons")) {
      rt.run("setRidesharePersons(7)");
      assert.equal(rt.run("ridesharePersons"),7);
      const reboot=runtime({storage:Object.fromEntries(rt.storage)});
      assert.equal(reboot.run("ridesharePersons"),7);
    }
    rt.run(action);
    assert.ok(rt.run("ridesharePersons")<=6);
    assert.equal(rt.elements.get("ridesharePersons").max,"6");
    assert.equal(rt.run("_historicalInputs.ridesharePersons"),undefined);
  }
  const normal=runtime();
  normal.run("setRidesharePersons(99)");
  assert.equal(normal.run("ridesharePersons"),6);
});

test("historical note: Unicode, safe whitespace, empty and 200-character notes survive reload and resave exactly", async () => {
  for (const note of ["Restore Ä İ İstanbul 😃", "  Ä İ\tİstanbul\n😃  ", "", "Ä".repeat(200)]) {
    const entry={...scenario("de","ev",1250),note};
    const rt=runtime({entries:[entry],search:`?id=${entry.id}`});
    assert.equal(rt.elements.get("noteInput").value,note);
    const reboot=runtime({storage:Object.fromEntries(rt.storage)});
    assert.equal(reboot.elements.get("noteInput").value,note);
    assert.equal(await reboot.run("saveQuick()"),true);
    assert.equal(JSON.parse(reboot.storage.get(historyKey))[0].note,note);
    assert.equal(reboot.elements.get("noteInput").value,"");
    const afterSave=runtime({storage:Object.fromEntries(reboot.storage)});
    assert.equal(afterSave.elements.get("noteInput").value,"");
  }
});

test("historical note: safe edits persist, reset clears and invalid metadata never hydrates", () => {
  const entry={...scenario("de","ev",1250),note:"Original note"};
  const rt=runtime({entries:[entry],search:`?id=${entry.id}`});
  const field=rt.elements.get("noteInput");
  field.value="Edited Ä İ 😃";field.dispatchEvent({type:"input"});
  assert.equal(runtime({storage:Object.fromEntries(rt.storage)}).elements.get("noteInput").value,field.value);
  rt.run("reset()");
  assert.equal(runtime({storage:Object.fromEntries(rt.storage)}).elements.get("noteInput").value,"");
  for (const note of ["Ä".repeat(201),"unsafe\x00note",42]) {
    const broken=runtime({storage:{[inputKey]:JSON.stringify({_historyInputs:{marketCode:"de",values:{},note}})}});
    assert.equal(broken.elements.get("noteInput").value,"");
  }
  const normal=runtime();
  normal.elements.get("noteInput").value="ordinary unsaved note";
  normal.elements.get("noteInput").dispatchEvent({type:"input"});
  assert.equal(runtime({storage:Object.fromEntries(normal.storage)}).elements.get("noteInput").value,"");
});

test("historical compare: unrelated longterm and rideshare state never replace the saved direct scenario", () => {
  for (const persons of [undefined,7,99]) {
    const entry={date:1700000000000,km:1250,note:"Legacy Ä İ İstanbul 😃",
      ev:{consumption:17.125,price:.373},fuel:{consumption:7.125,price:1.853},
      ...(persons === undefined ? {} : {persons,ridesharing:true})};
    const rt=runtime({entries:[entry],search:`?id=${entry.date}`,storage:{
      "eaf.longtermActive":"1","eaf.longtermKmMonat":"700","eaf.rideshareActive":"1","eaf.ridesharePersons":"3"
    }});
    const data=rt.run("_getCompareData()");
    assert.equal(rt.run("longtermActive"),false);
    assert.equal(data.eAutoTotal,79.8453125);
    assert.equal(data.verbrennerTotal,165.0328125);
    assert.equal(data.persons,persons ?? 1);
    assert.equal(data.ridesharing,persons !== undefined);
    assert.equal(data.eAutoPerPerson,data.eAutoTotal/(persons ?? 1));
    assert.equal(data.verbrennerPerPerson,data.verbrennerTotal/(persons ?? 1));
    rt.run("applyRideshare(); applyLongterm()");
    assert.equal(rt.elements.get("longtermToggle").checked,false);
    assert.equal(rt.elements.get("rideshareToggle").checked,persons !== undefined);
    const reboot=runtime({storage:Object.fromEntries(rt.storage)});
    const reopened=reboot.run("_getCompareData()");
    assert.equal(reopened.eAutoTotal,data.eAutoTotal);
    assert.equal(reopened.verbrennerTotal,data.verbrennerTotal);
    assert.equal(reopened.persons,data.persons);
    assert.equal(reboot.elements.get("noteInput").value,entry.note);
    assert.equal(rt.storage.get(historyKey),JSON.stringify([entry]));
  }
});

test("historical compare: equal optional distances restore, asymmetric distances fail before hydration without mutation", () => {
  const base={date:1700000000000,km:1250,note:"Legacy note",
    ev:{consumption:17.125,price:.373},fuel:{consumption:7.125,price:1.853}};
  const compatible={...base,kmEv:1250,kmVb:1250};
  const supported=runtime({entries:[compatible],search:`?id=${base.date}`});
  assert.equal(supported.run("_getCompareData().eAutoTotal"),79.8453125);
  for(const distances of [{kmEv:1251},{kmVb:1251},{kmEv:1250,kmVb:2000}]) {
    const entry={...base,...distances};
    const storedInputs=JSON.stringify({kmEv:"100",kmVb:"100",kmShared:"600",evVerbrauch:"30",strompreis:"0.16",verbrauchVerbrenner:"26",benzinpreis:"3.2"});
    const rt=runtime({market:"us",entries:[entry],search:`?id=${base.date}`,storage:{[inputKey]:storedInputs,"eaf.mode":"single","eaf.type":"ev"}});
    assert.equal(rt.run("window.EAF_I18N.getMarketCode()"),"us");
    assert.equal(rt.run("appMode"),"single");
    assert.equal(rt.run("_historySelectionFailed"),true);
    assert.equal(rt.storage.get(inputKey),storedInputs);
    assert.equal(rt.storage.get(historyKey),JSON.stringify([entry]));
    assert.match(rt.elements.get("eaf-toast").textContent,/could not be opened/);
    rt.context.unsupportedEntry=entry;
    assert.equal(rt.run("_restoreHistoryEntry(unsupportedEntry)"),false);
    assert.equal(rt.storage.get(inputKey),storedInputs);
    assert.equal(rt.elements.get("noteInput").value,"");
  }
});

test("historical note: input value sanitization and unrelated parameter edits preserve original raw text", async () => {
  const entry={...scenario("de","ev",1250),note:" vorher\nİstanbul\tsonra "};
  const rt=runtime();
  const field=rt.elements.get("noteInput");
  let visible="";
  // State regression for a sanitized observation; real input behavior is
  // verified separately in Chromium, this adapter is not browser evidence.
  Object.defineProperty(field,"value",{get:()=>visible,set:value=>{visible=String(value).replace(/[\r\n]/g,"");}});
  rt.context.restoredEntry=entry;
  assert.equal(rt.run("_restoreHistoryEntry(restoredEntry)"),true);
  assert.equal(field.value,entry.note.replace(/[\r\n]/g,""));
  rt.elements.get("kmEv").value="1100";
  rt.elements.get("kmEv").dispatchEvent({type:"input"});
  assert.equal(JSON.parse(rt.storage.get(inputKey))._historyInputs.note,entry.note);
  assert.equal(await rt.run("saveQuick()"),true);
  assert.equal(JSON.parse(rt.storage.get(historyKey))[0].note,entry.note);
  rt.run("_restoreHistoryEntry(restoredEntry)");
  field.value="Edited note";field.dispatchEvent({type:"input"});
  assert.equal(JSON.parse(rt.storage.get(inputKey))._historyInputs.note,"Edited note");
});
