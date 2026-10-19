import test from 'node:test';
import assert from 'node:assert/strict';
import {ready, historyRuntime, historyKey, entry} from './history-runtime.mjs';

const profiles = {de: [.37, 2.15, 'EUR', 'de-DE'], eu: [.30, 1.70, 'EUR', 'en-IE'], us: [.16, 3.20, 'USD', 'en-US'], tr: [3.40, 63, 'TRY', 'tr-TR']};
const inputsKey = 'eaf.inputs.v2';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
for (const market of Object.keys(profiles)) {
  test(`Quality ${market}: fresh defaults and explicit reset use only the selected market`, async () => {
    const rt = ready({storage: {'eaf.market': market}});
    await rt.settle();
    const [electricity, fuel] = profiles[market];
    assert.equal(Number(rt.elements.get('strompreis').value), electricity);
    assert.equal(Number(rt.elements.get('benzinpreis').value), fuel);
    const history = rt.storage.get(historyKey);
    rt.setInputs({strompreis: market === 'tr' ? 4.75 : .49, benzinpreis: market === 'tr' ? 65 : 2.55});
    rt.run('reset()');
    await rt.settle();
    assert.equal(Number(rt.elements.get('strompreis').value), electricity);
    assert.equal(Number(rt.elements.get('benzinpreis').value), fuel);
    assert.equal(rt.storage.get(historyKey), history);
  });
  test(`Quality ${market}: custom saved prices survive startup and restart without migration`, async () => {
    const stored = JSON.stringify({_marketCode: market, strompreis: market === 'tr' ? 4.731 : .491, benzinpreis: market === 'tr' ? 64.913 : 2.513});
    const records = JSON.stringify([entry({price: 1.85, monthlyCost: 12.3456789})]);
    for (let reload = 0; reload < 2; reload++) {
      const rt = ready({storage: {'eaf.market': market, [inputsKey]: stored, [historyKey]: records}});
      await rt.settle();
      const saved = JSON.parse(stored);
      assert.equal(Number(rt.elements.get('strompreis').value), saved.strompreis);
      assert.equal(Number(rt.elements.get('benzinpreis').value), saved.benzinpreis);
      assert.equal(rt.storage.get(inputsKey), stored);
      assert.equal(rt.storage.get(historyKey), records);
    }
  });
}
test('Quality DE: previous 1.85 user value remains an individual price', () => {
  const stored = JSON.stringify({_marketCode: 'de', strompreis: .37, benzinpreis: 1.85});
  const rt = ready({storage: {[inputsKey]: stored}});
  assert.equal(Number(rt.elements.get('benzinpreis').value), 1.85);
  assert.equal(rt.storage.get(inputsKey), stored);
});
test('Quality DE: 1000 km gives 62.90, 150.50 and 87.60 with unchanged rounding', () => {
  const rt = ready();
  rt.setInputs({evVerbrauch: 17, strompreis: .37, verbrauchVerbrenner: 7, benzinpreis: 2.15, kmShared: 1000});
  const d = rt.run('longtermActive=false; _getCompareData()');
  close(d.eAutoTotal, 62.90); close(d.verbrennerTotal, 150.50); close(d.savingsTotal, 87.60);
  for (const [field, text] of [['eAutoTotal','62,90'], ['verbrennerTotal','150,50'], ['savingsTotal','87,60']]) {
    assert.ok(rt.run(`_fmtMoney(_getCompareData().${field})`).includes(text));
  }
});
for (const market of Object.keys(profiles)) test(`Quality ${market}: Turkish operational and share text uses sen, German route text uses für`, () => {
  const rt = ready({storage: {'eaf.market': market}});
  rt.run("window.EAF_I18N.setLanguage('tr')");
  for (const key of ['hintCompareFoot','hintSingleFoot','calcInfoBlock','calcInfoBlockUs','footerNote','shareImgDisclaimer','shareTextDisclaimer']) {
    const text = rt.run(`_t('${key}')`);
    assert.match(text, /kontrol et[. <]/);
    assert.doesNotMatch(text, /kontrol edin/);
  }
  assert.equal(rt.run("_t('staleHint')"), 'Girdiler değişti, sonucu güncelle');
  rt.run("window.EAF_I18N.setLanguage('de')");
  for (const key of ['savingsFor','extraCostFor','differenceFor','costForKm','shareImgCostFor','shareCompareSavings','sentenceCompareSavings']) {
    assert.match(rt.run(`_t('${key}', {km:'2.500 km', val:'1 €'})`), /für 2\.500 km/);
  }
});
function record(market, index) {
  const us = market === 'us', [, , code, locale] = profiles[market];
  return entry({id: 'eaf_quality_' + index, date: Date.now() - index, type: index % 2 ? 'ev' : 'vb',
    km: us ? 1234.56789 * 1.609344 : 1250.1236,
    consumption: us ? (index % 2 ? 30.1236 / 1.609344 : 100 * 3.785411784 / (26.1236 * 1.609344)) : 7.1236,
    price: us && index % 2 === 0 ? 3.256 / 3.785411784 : 2.156,
    costPer100: us ? 15.005 / 1.609344 : 15.005, monthlyCost: 1234.565, yearlyCost: 14814.78,
    marketCode: market, language: market === 'de' ? 'de' : market === 'tr' ? 'tr' : 'en',
    sourceLocale: locale, currencyMetadata: {code, locale, symbol: code === 'TRY' ? '₺' : code === 'USD' ? '$' : '€'}, note: '=1+1'});
}
for (const market of Object.keys(profiles)) test(`Quality ${market}: mixed CSV formats money to 2 decimals, physical values up to 3, JSON remains lossless`, async () => {
  const records = Object.keys(profiles).flatMap((m, j) => [record(m, j * 2), record(m, j * 2 + 1)]);
  const raw = JSON.stringify(records);
  const rt = historyRuntime({storage: {'eaf.market': market, [historyKey]: raw}});
  await rt.settle();
  const csv = rt.context.window.EAF_HISTORY_EXPORT.csv().data;
  const lines = csv.split('\r\n');
  assert.equal(lines[0].split(';').length, 16);
  const decimal = market === 'de' || market === 'tr' ? ',' : '.';
  const localized = s => s.replace('.', decimal);
  for (let j = 0; j < records.length; j++) {
    const row = lines[j + 1].split(';'), e = records[j], us = e.marketCode === 'us';
    assert.equal(row.length, 16);
    assert.equal(row[2], localized(us ? '1234.568' : '1250.124'));
    assert.equal(row[4], localized(us ? (e.type === 'ev' ? '30.124' : '26.124') : '7.124'));
    assert.equal(row[6], localized(us && e.type === 'vb' ? '3.26' : '2.16'));
    assert.equal(row[8], localized('15.01'));
    assert.equal(row[10], localized('1234.57'));
    assert.equal(row[3], us ? 'mi' : 'km');
    assert.equal(row[12], e.currencyMetadata.code);
    assert.equal(row[13], e.marketCode);
    assert.equal(row[11], "'=1+1");
  }
  assert.equal(rt.storage.get(historyKey), raw);
  assert.equal(JSON.stringify(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries), raw);
});
