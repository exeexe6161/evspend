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

const privacyPages = [
  ["datenschutz.html", "de"],
  ["datenschutz.en.html", "en"],
  ["datenschutz.tr.html", "tr"],
  ["en-eu/datenschutz.html", "en"],
  ["privacy-policy.html", "en"]
];
const plainText = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("L1 Privacytexte grenzen lokale Speicherung, Teilen, URL und Datenlöschung sachlich ab", () => {
  const expected = {
    de: [
      /nicht automatisch an den Betreiber übertragen/, /lokal im Browser/,
      /Berechnung teilen oder den Verlauf exportieren/, /gewählten Empfänger oder Speicherort/,
      /Verlaufs-Backup enthält auch gespeicherte Notizen/,
      /gezielte Leeren dieses Caches entfernt/, /Löschen sämtlicher Websitedaten kann zusätzlich den LocalStorage/
    ],
    en: [
      /not automatically transmitted to the operator/, /browser's (?:local storage|storage)/,
      /share a calculation or export the history/, /recipient or storage location you choose/,
      /history backup also includes saved notes/,
      /Clearing (?:this|that) cache alone removes/, /Clearing all website data may also delete localStorage/i
    ],
    tr: [
      /işleticiye otomatik olarak aktarılmaz/, /tarayıcının yerel depolamasında/,
      /hesaplamayı paylaştığınızda veya geçmişi dışa aktardığınızda/, /seçtiğiniz bir alıcıya veya saklama konumuna/,
      /Geçmiş yedeği kaydedilmiş notları da içerir/,
      /Yalnızca bu önbelleği temizlemek/, /Tüm web sitesi verilerini silmek.*LocalStorage'ı da silebilir/
    ]
  };
  const absoluteClaims = /never leave the device|does not leave the device|never transmitted to us|no identifier is transmitted|the only effect is|only resets the app|Diese Daten verlassen das Gerät nicht|Es wird keine Kennung|Der einzige Effekt|lediglich der Initialzustand|Bu veriler cihazı terk etmez|cihazdan dışarı çıkmaz|Sunucularımıza herhangi bir tanımlayıcı iletilmez|Tek etkisi|Bu yalnızca uygulamanın başlangıç/i;
  for (const [rel, language] of privacyPages) {
    const text = plainText(fs.readFileSync(path.join(root, rel), "utf8"));
    assert.doesNotMatch(text, absoluteClaims, rel);
    for (const pattern of expected[language]) assert.match(text, pattern, `${rel}: ${pattern}`);
    for (const key of ["id", "entryKey", "entryIndex"]) {
      assert.match(text, new RegExp(`\\b${key}\\b`), `${rel}: URL ${key}`);
    }
    assert.match(text, /keine Rechnerwerte oder Notizen in die URL|do not embed calculator values or notes in the URL|hesaplayıcı değerlerini veya notları URL'ye eklemez/, `${rel}: URL content boundary`);
  }
});

test("L1 native Privacysektion beschreibt WebView, CACHE Export und begrenzte Bereinigung", () => {
  const expected = {
    de: [
      /WebView-Speicher im Appcontainer/, /getrennt von den Websitedaten des Browsers/,
      /Importierte JSON-Backups werden lokal verarbeitet/, /nativen Teilen-Dialog/,
      /versucht die App, ihre temporäre Datei zu löschen/,
      /Bereinigung unterbrochen wird oder fehlschlägt, kann die Datei zurückbleiben/,
      /geteilte oder anderweitig gespeicherte Kopien.*nicht entfernt/,
      /Beim Öffnen externer Links oder beim Teilen können Netzwerkverbindungen verwendet werden/
    ],
    en: [
      /local WebView storage in the app container/, /separately from the browser's website data/,
      /Imported JSON backups are processed locally/, /native share dialog/,
      /app tries to delete its temporary file/, /cleanup is interrupted or fails, the file may remain/,
      /Copies already shared or saved elsewhere are not removed/,
      /External links and sharing destinations you choose may use network connections/
    ],
    tr: [
      /uygulama kapsayıcısındaki yerel WebView depolamasında/, /tarayıcının web sitesi verilerinden ayrıdır/,
      /İçe aktarılan JSON yedekleri yerel olarak işlenir/, /yerel paylaşım penceresini açar/,
      /uygulama kendi geçici dosyasını silmeye çalışır/,
      /Temizleme kesilir veya başarısız olursa dosya kalabilir/,
      /paylaşılmış veya başka yerde saklanmış kopyalar.*kaldırılmaz/,
      /Harici bağlantılar ve seçtiğiniz paylaşım hedefleri ağ bağlantısı kullanabilir/
    ]
  };
  for (const [rel, language] of privacyPages) {
    const html = fs.readFileSync(path.join(root, rel), "utf8");
    assert.equal([...html.matchAll(/\bid="native-ios-privacy"/g)].length, 1, rel);
    const section = html.match(/<div class="card" id="native-ios-privacy">([\s\S]*?)<\/div>/);
    assert.ok(section, `${rel}: native section`);
    const text = plainText(section[1]);
    for (const term of ["WebView", "CACHE", "JSON", "CSV"]) {
      assert.ok(text.includes(term), `${rel}: ${term}`);
    }
    for (const pattern of expected[language]) assert.match(text, pattern, `${rel}: ${pattern}`);
  }
});
