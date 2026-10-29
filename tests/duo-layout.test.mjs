// Schutztests fuer das Web Duo Layout (styles-duo.css). Rein statisch, kein Browser noetig.
// Browser Regression: tests/duo-viewport/ (siehe DUO_LAYOUT.md).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PUBLIC_FILES } from "../build-vercel.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const sha = value => createHash("sha256").update(value).digest("hex");
const GATE = "@media screen and (min-width: 840px) and (min-height: 480px) and (pointer: coarse) and (hover: none) {";
const GATE_MIN = "@media screen and (min-width:840px)and (min-height:480px)and (pointer:coarse)and (hover:none){";
// Regelkoerper (alles nach der oeffnenden Media Zeile) des geprueften iOS Prototyps, Commit 6ca5b3f.
const IOS_BODY_SHA256 = "8e862a765413a4537eae61e74e54ece1e1a4c367113b5ca45a135ad22d2ec72b";
const pages = ["index.html", "en-eu/index.html", "tr/index.html"];

const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, "");
const bodyOf = css => css.slice(css.indexOf(GATE) + GATE.length + 1);
// Nur Web: Ergaenzung am Ende des Media Blocks (feste Installationsleiste). Alles davor ist der iOS Regelkoerper.
const WEB_MARKER = "\n  /* ===== NUR WEB (nicht Teil des iOS Prototyps): feste Installationsleiste \"App installieren\" ===== */\n";
const iosBodyOf = css => { const body = bodyOf(css); const i = body.indexOf(WEB_MARKER); assert.ok(i > 0, "Web Marker vorhanden"); return body.slice(0, i) + "}\n"; };

test("Duo CSS besteht aus genau einem Media Block mit dem Touch Gate und nichts ausserhalb", () => {
  const css = read("styles-duo.css");
  assert.equal(css.split("@media").length - 1, 1);
  assert.ok(css.includes(GATE + "\n"));
  const bare = stripComments(css).trim();
  assert.ok(bare.startsWith(GATE), "nichts vor dem Gate");
  assert.ok(bare.endsWith("}"));
  let depth = 0, outside = "";
  for (const ch of bare) { if (ch === "{") depth++; if (depth === 0) outside += ch; if (ch === "}") depth--; }
  assert.equal(depth, 0);
  assert.equal(outside.replace(/\s+/g, " ").trim(), GATE.slice(0, -2).replace(/\s+/g, " ").trim());
});

test("Duo CSS Regelkoerper (vor dem Web Zusatz) ist identisch zum geprueften iOS Prototyp 6ca5b3f", () => {
  assert.equal(sha(iosBodyOf(read("styles-duo.css"))), IOS_BODY_SHA256);
});

test("Duo CSS: Web Zusatz begrenzt sich auf die sichtbare Installationsleiste und steht im selben Media Block", () => {
  const css = read("styles-duo.css");
  const body = bodyOf(css);
  const web = body.slice(body.indexOf(WEB_MARKER) + WEB_MARKER.length);
  assert.ok(web.trimEnd().endsWith("}"), "Media Block schliesst nach dem Web Zusatz");
  const bare = stripComments(web);
  assert.doesNotMatch(bare, /!important/);
  const selectors = [...bare.matchAll(/^\s*([^{}\n]+)\{/gm)].map(m => m[1].trim());
  assert.equal(selectors.length, 2);
  for (const sel of selectors) assert.ok(sel.startsWith('body:not([data-longterm="on"])[data-pwa-bar="visible"]'), sel);
  assert.match(bare, /max-height:[^;]*- 79px\)/);
  assert.match(bare, /padding-bottom:\s*calc\(\s*104px/);
});

test("Duo CSS: Weiterreichen, Fokus Abstand, Langzeit Ausnahme und keine Ueberschreibung per important", () => {
  const css = stripComments(read("styles-duo.css"));
  const result = css.match(/body:not\(\[data-longterm="on"\]\) \.app-main > \.result-section \{([\s\S]*?)\n  \}/);
  assert.ok(result, "Regel der Ergebnisspalte vorhanden");
  assert.doesNotMatch(result[1], /overscroll-behavior:\s*(contain|none)/);
  assert.match(result[1], /overscroll-behavior:\s*auto/);
  const padding = Number(result[1].match(/scroll-padding-bottom:\s*(\d+)px/)?.[1]);
  assert.ok(padding >= 26, "scroll-padding-bottom mindestens so hoch wie die Ausblendzone (26 px)");
  assert.doesNotMatch(css, /!important/);
  for (const line of bodyOf(css).split("\n")) {
    const selector = line.trim().match(/^([^{}]+)\{/);
    if (selector) for (const part of selector[1].split(",")) assert.ok(part.trim().startsWith('body:not([data-longterm="on"])'), part);
  }
  const open = Number(css.match(/min-width:\s*(\d+)px/)[1]);
  assert.ok(open >= 840, "Schwelle haelt Smartphones im Hoch und Querformat aussen vor");
});

test("Minifizierte Duo CSS traegt dasselbe Gate und dieselben Schutzwerte", () => {
  const min = read("styles-duo.min.css");
  assert.ok(min.startsWith(GATE_MIN));
  assert.match(min, /overscroll-behavior:auto/);
  assert.match(min, /scroll-padding-bottom:32px/);
  assert.doesNotMatch(min, /!important|overscroll-behavior:(contain|none)/);
  assert.ok(min.length < read("styles-duo.css").length);
});

test("Drei Startseiten binden die Duo CSS genau einmal nach dem letzten Stylesheet ein, Token passt zum Dateihash", () => {
  const token = "d1-" + sha(fs.readFileSync(path.join(root, "styles-duo.min.css"))).slice(0, 12);
  for (const page of pages) {
    const html = read(page);
    const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"([^>]*)>/g)];
    assert.equal(sheets.filter(s => s[1].includes("styles-duo")).length, 1, page);
    const last = sheets.at(-1);
    assert.match(last[1], /^(\.|)\/styles-duo\.min\.css\?v=d1-[0-9a-f]{12}$/, page);
    assert.ok(last[1].endsWith("?v=" + token), page + " Token");
    assert.equal(last[2].trim(), 'data-web-only="duo"', page + " Marker fuer den iOS Generator");
    assert.doesNotMatch(html, /ios_duo_layout/, page);
  }
  for (const other of ["verlauf.html", "en-eu/verlauf.html", "tr/verlauf.html", "datenschutz.html", "impressum.html", "404.html"]) {
    assert.doesNotMatch(read(other), /styles-duo/, other);
  }
});

test("Build Kette, Veroeffentlichungsliste, Cache Header und Service Worker kennen die Duo CSS", () => {
  assert.ok(PUBLIC_FILES.includes("styles-duo.min.css"));
  assert.ok(!PUBLIC_FILES.includes("styles-duo.css"));
  assert.match(JSON.parse(read("package.json")).scripts["build:css"], /esbuild styles-duo\.css --minify --legal-comments=inline --target=es2020 > styles-duo\.min\.css/);
  const vercel = JSON.parse(read("vercel.json"));
  const revalidate = vercel.headers.find(h => h.headers.some(x => /must-revalidate/.test(x.value)) && /styles-app/.test(h.source));
  assert.match(revalidate.source, /styles-duo\\\.min\\\.css/);
  const token = "d1-" + sha(fs.readFileSync(path.join(root, "styles-duo.min.css"))).slice(0, 12);
  assert.ok(read("sw.js").includes(`  '/styles-duo.min.css?v=${token}',`));
});

test("Dokumentation nennt Gate, Testaufrufe, Einschraenkungen und die iOS Kopplung", () => {
  const doc = read("DUO_LAYOUT.md");
  for (const needle of ["pointer: coarse", "hover: none", "840", "480", "node --test", "tests/duo-viewport", "data-web-only", "prepare-native-assets", "Einschr"]) {
    assert.ok(doc.includes(needle), needle);
  }
  assert.ok(!PUBLIC_FILES.includes("DUO_LAYOUT.md"));
});

test("Funktionale Browser Tests sind vollstaendig, ohne private Pfade und ohne neue Abhaengigkeit", () => {
  const dir = path.join(root, "tests", "duo-functional");
  const suites = ["gate-and-flows", "scroll-sticky", "ui-states", "desktop-parity", "offline-sw", "install-bar"];
  const runner = fs.readFileSync(path.join(dir, "run-all.cjs"), "utf8");
  for (const name of suites) {
    assert.ok(fs.existsSync(path.join(dir, name + ".browser.cjs")), name);
    assert.ok(runner.includes(`'${name}'`), "Runner kennt " + name);
  }
  assert.ok(fs.existsSync(path.join(dir, "lib.cjs")));
  const files = [...fs.readdirSync(dir).map(f => path.join(dir, f)), ...fs.readdirSync(path.join(root, "tests", "duo-viewport")).map(f => path.join(root, "tests", "duo-viewport", f)), path.join(root, "DUO_LAYOUT.md")];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const bad of ["/Users/", "/home/", "/tmp/", "/private/", "/sessions/", "/mnt/", "localhost:8855", "d1-4191", "d1-03f0"]) assert.ok(!text.includes(bad), path.basename(file) + " enthaelt " + bad);
  }
  const pkg = JSON.parse(read("package.json"));
  assert.ok(!JSON.stringify(pkg.dependencies || {}).includes("playwright") && !JSON.stringify(pkg.devDependencies || {}).includes("playwright"), "Playwright bleibt optional und ausserhalb von package.json");
  const doc = read("DUO_LAYOUT.md");
  for (const needle of ["tests/duo-functional", "run-all.cjs", "PLAYWRIGHT_MODULE", "Installationsleiste", "Service Worker", "Safari", "scripts/prepare-native-assets.mjs"]) assert.ok(doc.includes(needle), needle);
});
