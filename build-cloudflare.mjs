#!/usr/bin/env node
/* Cloudflare Pages packaging (TEST BRANCH ONLY, vercel.json and middleware.js stay the source for Vercel).
 *
 * - reuses buildStaticOutput() (same 70 public files as the Vercel build)
 * - generates _headers from vercel.json so header rules have ONE source of truth
 * - CF_NOINDEX=1 adds "X-Robots-Tag: noindex, nofollow, noarchive" to every response (test deployments)
 * Output: .cloudflare-static/   (hidden on purpose: build-licenses.mjs walk() skips dot-directories)
 * Geo redirect lives in functions/ (Pages Functions), headers/redirects of Functions are NOT touched by _headers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStaticOutput, ROOT } from './build-vercel.mjs';

export const OUT_NAME = '.cloudflare-static';
export const MAX_HEADER_RULES = 100; // Cloudflare Pages limit

/** vercel.json "source" (path-to-regexp style) -> Cloudflare _headers patterns */
export function toPatterns(source) {
  const m = source.match(/^\/\((.*)\)$/);
  if (!m) return [source];
  if (m[1] === '.*') return ['/*'];
  return m[1].split('|').map(alt => '/' + alt.replace(/\\\./g, '.').replace(/\/\.\+$/, '/*'));
}

export function buildHeadersFile(vercelJson, { noindex = false } = {}) {
  const out = ['# GENERATED from vercel.json by build-cloudflare.mjs. Do not edit by hand.'];
  for (const rule of vercelJson.headers) {
    const global = rule.source === '/(.*)';
    // Global Cache-Control is dropped: Pages already answers "public, max-age=0, must-revalidate" (revalidate on every use).
    const headers = rule.headers
      .filter(h => !(global && h.key === 'Cache-Control'))
      .map(h => `  ${h.key}: ${h.value}`);
    if (global && noindex) headers.push('  X-Robots-Tag: noindex, nofollow, noarchive');
    for (const pattern of toPatterns(rule.source)) out.push('', pattern, ...headers);
  }
  return out.join('\n') + '\n';
}

export function buildCloudflareOutput(root = ROOT, env = process.env) {
  const staged = buildStaticOutput(root); // .vercel-static (gitignored)
  const target = path.join(root, OUT_NAME);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error('Refusing symlinked output');
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(staged.output, target, { recursive: true });
  const vercelJson = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const headers = buildHeadersFile(vercelJson, { noindex: env.CF_NOINDEX === '1' });
  const rules = headers.split('\n').filter(line => line.startsWith('/')).length;
  if (rules > MAX_HEADER_RULES) throw new Error(`_headers has ${rules} rules, Cloudflare Pages allows ${MAX_HEADER_RULES}`);
  fs.writeFileSync(path.join(target, '_headers'), headers);
  return { output: target, files: staged.files.length, rules, noindex: env.CF_NOINDEX === '1' };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildCloudflareOutput();
  console.log(`cloudflare-package: ${r.files} files + _headers (${r.rules} rules${r.noindex ? ', noindex' : ''}) -> ${OUT_NAME}`);
}
