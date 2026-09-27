#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  '404.css',
  '404.html',
  '404.js',
  'LICENSES.md',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'banner.png',
  'banner.webp',
  'barrierefreiheit.en.html',
  'barrierefreiheit.html',
  'barrierefreiheit.tr.html',
  'datenschutz.en.html',
  'datenschutz.html',
  'datenschutz.tr.html',
  'en-eu/barrierefreiheit.html',
  'en-eu/datenschutz.html',
  'en-eu/hinweise.html',
  'en-eu/impressum.html',
  'en-eu/index.html',
  'en-eu/init-eu.js',
  'en-eu/styles-en-eu.css',
  'en-eu/terms.html',
  'en-eu/verlauf.html',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico',
  'fonts/InterVariable-Italic.woff2',
  'fonts/InterVariable.woff2',
  'fonts/LICENSE.txt',
  'hinweise.en.html',
  'hinweise.html',
  'hinweise.tr.html',
  'history-store.js',
  'impressum.en.html',
  'impressum.html',
  'impressum.tr.html',
  'index.html',
  'lang-switch.js',
  'og-image-de.png',
  'og-image-en.png',
  'og-image-tr.png',
  'privacy-policy.html',
  'robots.txt',
  'script.min.js',
  'site.webmanifest',
  'sitemap.xml',
  'styles-app.min.css',
  'styles-pages.min.css',
  'sw.js',
  'terms.en.html',
  'terms.html',
  'terms.tr.html',
  'theme-init.js',
  'tr/index.html',
  'tr/init-tr.js',
  'tr/styles-tr.css',
  'tr/verlauf.html',
  'vendor/chart-4.4.6.umd.js',
  'vendor/chartjs-4.4.6.LICENSE.txt',
  'vendor/feather-portions.LICENSE.txt',
  'vendor/kurkle-color-0.3.2.LICENSE.txt',
  'vendor/license-inventory.json',
  'vendor/lucide-0.511.0.LICENSE.txt',
  'verlauf.html',
  'verlauf.min.js'
]);

export function buildStaticOutput(root = ROOT, output = path.join(root, '.vercel-static')) {
  const targetRoot = path.resolve(output);
  if (path.basename(targetRoot) !== '.vercel-static') {
    throw new Error('Vercel static output must use a dedicated .vercel-static directory');
  }
  if (fs.existsSync(targetRoot) && fs.lstatSync(targetRoot).isSymbolicLink()) {
    throw new Error('Refusing symlinked Vercel static output');
  }
  fs.rmSync(targetRoot, { recursive: true, force: true });
  for (const relative of PUBLIC_FILES) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) {
      throw new Error(`Missing or unsafe public release file: ${relative}`);
    }
    const target = path.join(targetRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return { output: targetRoot, files: [...PUBLIC_FILES] };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildStaticOutput();
  console.log(`vercel-package: copied ${result.files.length} public files to ${path.basename(result.output)}`);
}
