import assert from "node:assert/strict";
import test from "node:test";
import {ready, historyRuntime, entry, historyKey, importFile, envelope} from "./history-runtime.mjs";

const markets = [
  {market:"de", language:"de", code:"EUR", symbol:"€", locale:"de-DE"},
  {market:"eu", language:"en", code:"EUR", symbol:"€", locale:"en-IE"},
  {market:"us", language:"en", code:"USD", symbol:"$", locale:"en-US"},
  {market:"tr", language:"tr", code:"TRY", symbol:"₺", locale:"tr-TR"}
];
function money(value, cfg, decimals = 2) {
  return new Intl.NumberFormat(cfg.locale, {style:"currency", currency:cfg.code,
    minimumFractionDigits:decimals, maximumFractionDigits:decimals}).format(value);
}
const saved = rt => JSON.parse(rt.storage.get(historyKey));
const headline = (rt, index = 0) => rt.elements.get("histList").children[index].children[0].children[1].textContent;

for (const cfg of markets) test(`money locale ${cfg.market}: current display, new Save metadata and history stats agree`, async () => {
  const rt = ready({storage:{"eaf.market":cfg.market, [historyKey]:"[]"}});
  const prefs = Object.fromEntries(["eaf.market","eaf.language","eaf.currency"].map(key => [key,rt.storage.get(key)]));
  assert.equal(rt.run("window.EAF_I18N.getLanguage()"), cfg.language);
  for (const value of [1234.56,-1234.56,0]) {
    assert.equal(rt.run(`_fmtMoney(${value})`), money(value,cfg));
    assert.equal(rt.run(`window.EAF_I18N.formatCurrency(${value})`), money(value,cfg));
    assert.equal(rt.run(`_fmtMoney(${value},0)`), money(value,cfg,0));
    assert.equal(rt.run(`fmt(${value})`), value.toLocaleString(cfg.locale,{minimumFractionDigits:2,maximumFractionDigits:2}));
  }
  assert.equal(rt.run("window.EAF_I18N.currencyConfig.EUR.locale"), "de-DE");
  rt.run("appMode='single'; singleType='ev'");
  const raw = rt.run("_getSingleData()");
  assert.equal(await rt.run("saveQuick()"), true);
  const row = saved(rt)[0];
  assert.deepEqual(row.currencyMetadata,{code:cfg.code,symbol:cfg.symbol,locale:cfg.locale});
  assert.equal(row.sourceLocale,cfg.locale);
  assert.equal(row.language,cfg.language);
  for (const field of ["km","consumption","price","costPer100","monthlyCost","yearlyCost"]) assert.equal(row[field],raw[field]);
  const original = rt.storage.get(historyKey);
  const hist = historyRuntime({storage:Object.fromEntries(rt.storage)});
  assert.ok(headline(hist).includes(money(row.monthlyCost,cfg,0)));
  assert.equal(hist.elements.get("statEvAvgCost").textContent, money(row.costPer100 * (cfg.market === "us" ? 1.609344 : 1),cfg));
  assert.equal(hist.storage.get(historyKey),original);
  for (const [key,value] of Object.entries(prefs)) assert.equal(hist.storage.get(key),value);
  hist.elements.get("histExportBtn").click();
  assert.deepEqual(JSON.parse(await hist.blobs[0].text()).entries,[row]);
  await importFile(hist,envelope([row]));
  assert.equal(hist.storage.get(historyKey),original);
  const reboot = ready({storage:Object.fromEntries(rt.storage)});
  assert.equal(reboot.run("_fmtMoney(1234.56)"),money(1234.56,cfg));
});

test("money locale EU: old German EUR and stored English EUR formats remain distinct without rewriting snapshots", async () => {
  const de = markets[0], eu = markets[1];
  const german = entry({id:"old-de",date:1700000000002,marketCode:"eu",language:"en",sourceLocale:"de-DE",
    km:100,consumption:20,price:.3,costPer100:6,monthlyCost:6,yearlyCost:72});
  const english = entry({...german,id:"new-eu",date:1700000000001,
    currencyMetadata:{code:eu.code,symbol:eu.symbol,locale:eu.locale},sourceLocale:eu.locale});
  const legacy = {date:1700000000000,km:1000,ev:{consumption:20,price:.3,costPer100:6},
    fuel:{consumption:6,price:1.5,costPer100:9},result:{yearlySaving:360,monthlySaving:30}};
  for (const cfg of markets) {
    const original = JSON.stringify([german,english,legacy]);
    const rt = historyRuntime({storage:{"eaf.market":cfg.market,[historyKey]:original}});
    assert.ok(headline(rt,0).includes(money(6,de,0)));
    assert.ok(headline(rt,1).includes(money(6,eu,0)));
    assert.ok(rt.elements.get("legacyList").children[0].children[0].children[1].textContent.includes(money(360,de,0)));
    assert.equal(rt.storage.get(historyKey),original);
    rt.elements.get("histExportBtn").click();
    assert.deepEqual(JSON.parse(await rt.blobs[0].text()).entries,[german,english,legacy]);
  }
});

test("money locale: a separate currency override keeps its currency default rather than borrowing an incompatible market locale", () => {
  const rt = ready();
  rt.run("window.EAF_I18N.setCurrency('USD')");
  assert.equal(rt.run("_fmtMoney(1234.56)"),money(1234.56,markets[2]));
  assert.equal(rt.run("window.EAF_I18N.formatCurrency(1234.56)"),money(1234.56,markets[2]));
  assert.equal(rt.run("window.EAF_I18N.getMarketCode()"),"de");
  assert.equal(rt.run("window.EAF_I18N.getLanguage()"),"de");
});
