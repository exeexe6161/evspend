import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, START, END, checkLicenses, generatedSection } from '../build-licenses.mjs';
import { PUBLIC_FILES, buildStaticOutput } from '../build-vercel.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evspend-license-test-'));
  for (const name of ['vendor', 'fonts', 'en-eu', 'tr']) fs.cpSync(path.join(ROOT, name), path.join(root, name), { recursive: true });
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.startsWith('.')) fs.copyFileSync(path.join(ROOT, entry.name), path.join(root, entry.name));
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('EVS-053 every notice has real release material and unchanged local original text', () => {
  checkLicenses();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor/license-inventory.json')));
  assert.deepEqual(manifest.components.map(c => c.name), ['Chart.js', '@kurkle/color', 'Lucide', 'Feather portions', 'Inter Variable']);
  const doc = fs.readFileSync(path.join(ROOT, 'LICENSES.md'), 'utf8');
  const generated = doc.slice(doc.indexOf(START), doc.indexOf(END) + END.length);
  for (const c of manifest.components) assert.ok(generated.includes(fs.readFileSync(path.join(ROOT, c.licenseFile), 'utf8')));
  const chart = fs.readFileSync(path.join(ROOT, 'vendor/chart-4.4.6.umd.js'), 'utf8');
  assert.match(chart, /Chart\.js v4\.4\.6/);
  assert.match(chart, /@kurkle\/color v0\.3\.2/);
  assert.match(generated, /Cole Bemis 2013-2022/);
  assert.match(generated, /Copyright \(c\) 2014-2024 Chart\.js Contributors/);
  assert.match(generated, /Copyright \(c\) 2018-2021 Jukka Kurkela/);
  assert.ok(Object.keys(manifest.release.material).includes('fonts/InterVariable-Italic.woff2'));
  assert.match(fs.readFileSync(path.join(ROOT, 'styles-pages.min.css'), 'utf8'), /InterVariable-Italic\.woff2/);
  assert.doesNotMatch(generated, /### (?:esbuild|@esbuild|node:test)/);
});

test('L1 attribution separates confirmed original notices from unresolved branding provenance', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'LICENSES.md'), 'utf8');
  const prefix = doc.slice(0, doc.indexOf(START));
  assert.match(prefix, /PROVENANCE_UNRESOLVED/);
  assert.match(prefix, /TRADEMARK_REVIEW_REQUIRED/);
  assert.match(prefix, /confirmed third-party components/i);
  assert.doesNotMatch(prefix, /All bundled third-party code is permissively licensed|Commercial Use:\*\* Permitted per Anthropic|The path data is copied verbatim from Lucide/);
  // The factual limitation must not truncate or rewrite the original notices.
  assert.equal(doc.slice(doc.indexOf(START), doc.indexOf(END) + END.length), generatedSection(ROOT));
});

test('EVS-053 stale public document fails; generation is deterministic', t => {
  const root = fixture(t);
  assert.equal(generatedSection(root), generatedSection(root));
  fs.writeFileSync(path.join(root, 'LICENSES.md'), '# Missing originals\n');
  assert.throws(() => checkLicenses(root), /stale/);
});

test('EVS-053 altered original permission text fails', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'vendor/kurkle-color-0.3.2.LICENSE.txt'), '\nchanged');
  assert.throws(() => checkLicenses(root), /Original license changed/);
});

test('EVS-053 changed vendor bytes, inline icons and new runtime material require review', t => {
  const root = fixture(t);
  const chart = path.join(root, 'vendor/chart-4.4.6.umd.js'), original = fs.readFileSync(chart);
  fs.appendFileSync(chart, '\nchanged');
  assert.throws(() => checkLicenses(root), /Release material/);
  fs.writeFileSync(chart, original);
  const html = path.join(root, 'index.html'), before = fs.readFileSync(html, 'utf8');
  fs.writeFileSync(html, before + '<svg viewBox="0 0 24 24"><path d="M1 2h3"/></svg>');
  assert.throws(() => checkLicenses(root), /Release material/);
  fs.writeFileSync(html, before);
  fs.writeFileSync(path.join(root, 'vendor/new-runtime.js'), '/* synthetic new dependency */');
  assert.throws(() => checkLicenses(root), /Release material/);
});

test('EVS-053 dev tooling does not become a runtime notice; new runtime dependency blocks', t => {
  const root = fixture(t), file = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(file));
  pkg.devDependencies.syntheticTestOnly = '1.0.0';
  fs.writeFileSync(file, JSON.stringify(pkg));
  assert.doesNotThrow(() => checkLicenses(root));
  pkg.dependencies = { syntheticRuntime: '1.0.0' };
  fs.writeFileSync(file, JSON.stringify(pkg));
  assert.throws(() => checkLicenses(root), /runtime dependencies/);
});

test('EVS-053 canonical public path is included and bypasses geo redirects', async () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split('\n').filter(s => s && !s.startsWith('#'));
  assert.ok(!ignore.includes('LICENSES.md'));
  assert.ok(!ignore.includes('package.json'));
  assert.ok(!ignore.includes('package-lock.json'));
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json')));
  assert.equal(config.outputDirectory, '.vercel-static');
  assert.match(config.buildCommand, /^node build-licenses\.mjs --check && node build-sw\.mjs && node build-vercel\.mjs$/);
  assert.ok(PUBLIC_FILES.includes('LICENSES.md'));
  assert.ok(!PUBLIC_FILES.includes('package.json'));
  assert.ok(!PUBLIC_FILES.includes('package-lock.json'));
  const source = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
  const { default: middleware } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  for (const country of ['DE', 'TR', 'FR', 'US']) {
    const response = middleware(new Request('https://www.evspend.com/LICENSES.md', { headers: { 'x-vercel-ip-country': country } }));
    assert.equal(response, undefined);
  }
});

test('Vercel packaging separates build inputs from the public static output', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'evspend-vercel-package-'));
  const output = path.join(temp, '.vercel-static');
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const result = buildStaticOutput(ROOT, output);
  assert.equal(result.files.length, PUBLIC_FILES.length);
  const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor/license-inventory.json')));
  for (const relative of inventory.release.references) {
    assert.ok(fs.existsSync(path.join(output, relative)), relative);
  }
  for (const component of inventory.components) {
    assert.ok(fs.existsSync(path.join(output, component.licenseFile)), component.licenseFile);
  }
  for (const relative of ['LICENSES.md', 'vendor/chartjs-4.4.6.LICENSE.txt', 'index.html']) {
    assert.ok(fs.existsSync(path.join(output, relative)), relative);
  }
  for (const relative of ['package.json', 'package-lock.json', 'script.js', 'script.min.js.map', 'build-licenses.mjs']) {
    assert.equal(fs.existsSync(path.join(output, relative)), false, relative);
  }
});
