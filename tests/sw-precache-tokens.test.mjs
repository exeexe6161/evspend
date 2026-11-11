/* Regression guard for F1 (offline CSS mismatch, 2026-11).
 *
 * The service worker precaches versioned assets under their exact query string
 * (Cache API matches `?v=` tokens literally). If a page links an asset with a
 * different `?v=` token than the token the SW precached, the offline lookup
 * misses and the asset is unavailable offline. The static host ignores the
 * query string, so install still succeeds — the failure is silent until a real
 * offline load. This test cross-checks the two token sources so such drift
 * fails loudly at build/test time.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arrayLiteral(source, name) {
  const start = source.indexOf(`const ${name}`);
  assert.ok(start !== -1, `${name} not found in sw.js`);
  const open = source.indexOf("[", start);
  const close = source.indexOf("];", open);
  const body = source.slice(open + 1, close);
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** path -> token, for a list of "/file?v=token" entries that carry a token */
function tokensByPath(urls) {
  const map = new Map();
  for (const u of urls) {
    const m = u.match(/^([^?]+)\?v=([^&]+)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function listHtmlFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listHtmlFiles(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

/** Collect every absolute "/asset?v=token" reference from all HTML files. */
function htmlTokenReferences() {
  const refs = new Map(); // path -> Map(token -> Set(files))
  for (const file of listHtmlFiles(ROOT)) {
    const html = fs.readFileSync(file, "utf8");
    for (const m of html.matchAll(/(?:href|src)="(\/[^"?]+\.(?:css|js))\?v=([a-z0-9-]+)"/gi)) {
      const [, p, token] = m;
      if (!refs.has(p)) refs.set(p, new Map());
      const byToken = refs.get(p);
      if (!byToken.has(token)) byToken.set(token, new Set());
      byToken.get(token).add(path.relative(ROOT, file));
    }
  }
  return refs;
}

const SW_SOURCE = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const required = arrayLiteral(SW_SOURCE, "REQUIRED_PRECACHE_URLS");
const optional = arrayLiteral(SW_SOURCE, "OPTIONAL_PRECACHE_URLS");
const precacheTokens = tokensByPath([...required, ...optional]);
const htmlRefs = htmlTokenReferences();

test("F1: HTML references each versioned asset with exactly one token", () => {
  for (const [p, byToken] of htmlRefs) {
    assert.equal(
      byToken.size, 1,
      `${p} is linked with multiple ?v= tokens in HTML: ${[...byToken.keys()].join(", ")}`
    );
  }
});

test("F1: every precached versioned asset matches the token the HTML requests", () => {
  for (const [p, token] of precacheTokens) {
    const byToken = htmlRefs.get(p);
    if (!byToken) continue; // asset not linked from HTML (e.g. fonts, history-store) — nothing to cross-check
    const htmlToken = [...byToken.keys()][0];
    assert.equal(
      token, htmlToken,
      `Precache token drift for ${p}: sw.js precaches ?v=${token} but HTML links ?v=${htmlToken} ` +
      `(offline lookup would miss). Referenced in: ${[...byToken.get(htmlToken)].join(", ")}`
    );
  }
});

test("F1: the main app stylesheet is precached under the exact token the pages link", () => {
  const p = "/styles-app.min.css";
  const htmlToken = htmlRefs.get(p) && [...htmlRefs.get(p).keys()][0];
  assert.ok(htmlToken, "styles-app.min.css is not linked from any HTML page");
  assert.equal(
    precacheTokens.get(p), htmlToken,
    `styles-app.min.css precache token (${precacheTokens.get(p)}) must equal the HTML link token (${htmlToken})`
  );
});
