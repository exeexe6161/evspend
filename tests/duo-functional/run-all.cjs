// Startet alle funktionalen Duo Browser Tests nacheinander (jeweils eigener Prozess, eigener Server auf freiem Port).
//   node tests/duo-functional/run-all.cjs [Teilname ...]     zum Beispiel: node tests/duo-functional/run-all.cjs scroll offline
// Umgebung: PLAYWRIGHT_MODULE, CHROMIUM_PATH, CHROMIUM_ARGS (siehe lib.cjs und DUO_LAYOUT.md). Gesamtdauer etwa 25 Minuten auf 2 CPUs.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const SUITES = ['gate-and-flows', 'scroll-sticky', 'ui-states', 'desktop-parity', 'offline-sw', 'install-bar'];
const want = process.argv.slice(2);
const todo = SUITES.filter(s => !want.length || want.some(w => s.includes(w)));
if (!todo.length) { console.error('Keine passende Suite. Verfuegbar: ' + SUITES.join(', ')); process.exit(2); }
let bad = 0;
for (const s of todo) {
  const file = path.join(__dirname, s + '.browser.cjs');
  if (!fs.existsSync(file)) { console.log('FEHLT ' + s); bad++; continue; }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout || '').split('\n');
  const fails = lines.filter(l => l.startsWith('FAIL') || l.startsWith('FATAL'));
  const sum = lines.find(l => l.startsWith('ERGEBNIS')) || ('kein Ergebnis' + (r.stderr ? ': ' + r.stderr.slice(0, 300) : ''));
  console.log(`${r.status === 0 ? 'OK  ' : 'FEHLER'} ${s}: ${sum} (${Math.round((Date.now() - t0) / 1000)} s)`);
  fails.slice(0, 20).forEach(l => console.log('   ' + l.slice(0, 300)));
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
