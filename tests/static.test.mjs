import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPages = [
  "index.html", "verlauf.html", "en-eu/index.html", "en-eu/verlauf.html",
  "tr/index.html", "tr/verlauf.html"
];

test("App Seiten besitzen keine doppelten IDs", () => {
  for (const rel of appPages) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, rel);
  }
});

test("alle Label Ziele existieren auf den Rechnerseiten", () => {
  for (const rel of ["index.html", "en-eu/index.html", "tr/index.html"]) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)) {
      assert.ok(ids.has(match[1]), `${rel}: label for ${match[1]}`);
    }
  }
});

test("lokale Script und Stylesheet Referenzen sind vorhanden", () => {
  for (const rel of appPages) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)]
      .map(match => match[1].split(/[?#]/)[0])
      .filter(ref => ref && !/^https?:/.test(ref) && !ref.startsWith("data:"));
    for (const ref of refs) {
      const target = ref.startsWith("/")
        ? path.join(root, ref.slice(1))
        : path.resolve(path.dirname(path.join(root, rel)), ref);
      assert.ok(fs.existsSync(target), `${rel}: ${ref}`);
    }
  }
});

test("Produktseiten enthalten keine Inline Event Handler", () => {
  for (const rel of appPages) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(html, /\son(?:click|change|input|submit|load|error)\s*=/i, rel);
  }
});

test("veränderliche JS und CSS Dateien sind nicht immutable gecacht", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const immutable = config.headers.find(entry =>
    entry.headers.some(header => /immutable/.test(header.value))
  );
  assert.ok(immutable);
  assert.doesNotMatch(immutable.source, /script|styles|theme-init|lang-switch|init-eu|init-tr/);
});

test("Service Worker enthält Offline Shell für DE, EU und TR", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const route of ["'/'", "'/en-eu/'", "'/tr/'", "'/verlauf'", "'/en-eu/verlauf'", "'/tr/verlauf'"]) {
    assert.ok(sw.includes(route), route);
  }
});

test("Manifest und Vercel Konfiguration sind gültiges JSON", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "site.webmanifest"), "utf8"));
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(manifest.short_name, "EVSpend");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  assert.ok(Array.isArray(vercel.headers));
});
