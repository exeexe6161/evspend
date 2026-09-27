// Preserve original license bytes in the existing public LICENSES.md.
// This bounded inventory detects changes; it does not grant legal approval.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const START = '<!-- BEGIN GENERATED THIRD PARTY LICENSES -->';
export const END = '<!-- END GENERATED THIRD PARTY LICENSES -->';
export const sha256 = data => createHash('sha256').update(data).digest('hex');
const read = (root, name) => fs.readFileSync(path.join(root, name));
const walk = (root, dir = '') => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .filter(entry => !entry.name.startsWith('.') && !['node_modules', 'brand', 'tests'].includes(entry.name))
  .flatMap(entry => entry.isDirectory() ? walk(root, path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

export function inventory(root = ROOT) {
  const files = walk(root);
  const html = files.filter(name => name.endsWith('.html'));
  const svg = html.flatMap(name => [...read(root, name).toString().matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(m => m[0]));
  // Only SVG material is pinned, not surrounding translated copy or application logic.
  const svgFingerprint = sha256(JSON.stringify([...new Set(svg)].sort()));
  const references = new Set();
  for (const name of html) {
    const source = read(root, name).toString();
    for (const tag of source.matchAll(/<(?:script|img|link)\b[^>]*>/g)) {
      if (tag[0].startsWith('<link') && !/rel="(?:stylesheet|icon|apple-touch-icon|preload|manifest)"/.test(tag[0])) continue;
      const url = tag[0].match(/(?:src|href)="([^"]+)"/)?.[1];
      if (!url) continue;
      const resolved = new URL(url, `https://inventory.invalid/${name}`);
      references.add(resolved.origin === 'https://inventory.invalid' ? resolved.pathname.slice(1) : resolved.href);
    }
  }
  for (const name of files.filter(name => name.endsWith('.css'))) {
    for (const match of read(root, name).toString().matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (match[1].startsWith('#') || match[1].startsWith('data:')) continue;
      const resolved = new URL(match[1], `https://inventory.invalid/${name}`);
      references.add(resolved.origin === 'https://inventory.invalid' ? resolved.pathname.slice(1) : resolved.href);
    }
  }
  const material = files.filter(name => /^(?:vendor\/.*\.js|fonts\/.*\.woff2)$/.test(name) || /\.(?:png|webp|ico|svg|jpe?g)$/.test(name)).sort();
  return { svgFingerprint, references: [...references].sort(), material: Object.fromEntries(material.map(name => [name, sha256(read(root, name))])) };
}

export function generatedSection(root = ROOT) {
  const manifest = JSON.parse(read(root, 'vendor/license-inventory.json'));
  const pkg = JSON.parse(read(root, 'package.json'));
  if (Object.keys(pkg.dependencies || {}).length || Object.keys(pkg.optionalDependencies || {}).length) {
    throw new Error('New runtime dependencies require license inventory review');
  }
  const actual = inventory(root);
  if (JSON.stringify(actual) !== JSON.stringify(manifest.release)) {
    throw new Error('Release material or references changed: review vendor/license-inventory.json and provenance');
  }
  const sections = [START, '## Complete original third party license texts', '',
    'Generated locally by `node build-licenses.mjs`. Checked by both production build paths.',
    'Versions and source references below describe the verified inventory. Unverified inline variants and asset provenance remain LEGAL_REVIEW_REQUIRED.', ''];
  for (const component of manifest.components) {
    const bytes = read(root, component.licenseFile);
    if (sha256(bytes) !== component.licenseSha256) throw new Error(`Original license changed: ${component.licenseFile}`);
    sections.push(`### ${component.name}`, '', `Version: ${component.version}`, `Declared license: ${component.license}`,
      `Release material: ${component.material}`, `Original text source: ${component.source}`, `Local original: ${component.licenseFile}`, '', '```text');
    // Do not trim, rewrap, translate or modify any original license text.
    sections.push(bytes.toString('utf8') + (bytes.at(-1) === 10 ? '' : '\n') + '```', '');
  }
  sections.push(END);
  return sections.join('\n');
}

export function updatedDocument(root = ROOT) {
  const document = read(root, 'LICENSES.md').toString('utf8');
  const start = document.indexOf(START), end = document.indexOf(END);
  if ((start < 0) !== (end < 0) || (start >= 0 && end < start) || document.split(START).length > 2 || document.split(END).length > 2) {
    throw new Error('Invalid generated license markers');
  }
  const section = generatedSection(root);
  return start < 0 ? document + '\n\n' + section + '\n' : document.slice(0, start) + section + document.slice(end + END.length);
}

export function checkLicenses(root = ROOT) {
  if (read(root, 'LICENSES.md').toString('utf8') !== updatedDocument(root)) {
    throw new Error('LICENSES.md is stale: run node build-licenses.mjs after reviewing the inventory');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) checkLicenses();
  else fs.writeFileSync(path.join(ROOT, 'LICENSES.md'), updatedDocument());
  console.log(`licenses: ${process.argv.includes('--check') ? 'verified' : 'generated'} LICENSES.md`);
}
