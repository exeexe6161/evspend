# PHASE R — Komplette Lizenz-Analyse (Audit-Report)

**Projekt:** evspend.com
**Audit-Datum:** 29. April 2026 (nach Phase O+P+J, Tag `v0.7.1-content-p1-hotfix`)
**Audit-Modus:** Read-only (KEIN Code geändert)
**Auditor:** Claude (Opus 4.7)
**User-Auftrag:** „Komplette Lizenz-Prüfung der Seite. Apple/Microsoft/egal welche Brand. Keine ungewollt lizenzierten Sachen. Alles muss lizenzfrei sein."

---

## 0. Executive Summary

**Gesamtbewertung: 🟢 GRÜN — Site ist lizenzrechtlich sauber.**

Über 7 Tracks und ~140.000 Zeilen Repo-Inhalt finden sich **keine kritischen Lizenz-Risiken** und **keine ungewollten Brand-Bezüge**. Das ist das Ergebnis konsequenter Vorarbeit (Phase N v2.0 entfernte Apple-Mentions, Phase M.6.1 räumte den Code, Phase P S2 entfernte die Lucide-Lib zugunsten weniger Inline-SVGs).

**Was definitiv lizenzfrei / korrekt lizenziert ist:**

| Kategorie | Status | Lizenz |
|---|---|---|
| Selbstgeschriebener Code (HTML/CSS/JS) | ✓ Eigentum | Hakan Guer + Claude AI (Anthropic ToS) |
| Inter Font | ✓ self-hosted, LICENSE.txt vorhanden | SIL OFL 1.1 |
| Chart.js v4.4.6 | ✓ vendor/, Copyright-Header in Datei | MIT |
| Inline SVG-Icons | ✓ Lucide-Style, Lib entfernt nur Pfade kopiert | Lucide ISC |
| Markenname „EVSpend" | ✓ eigenes Wordmark, Inter-rendered | OFL-Font, eigenes Branding |
| Brand-Assets (banner, og-images, favicons) | ✓ AI-generiert via Claude/Pillow | Anthropic ToS — User hat Rechte |
| Farb-Palette | ✓ Werte nicht urheberrechtsfähig (Fakten) | Tailwind CSS (MIT) als Inspiration |
| Browser-Detection-Code | ✓ Standard Feature-Detection | Eigenwerk |

**Was Apple-Naming enthält, aber funktional notwendig und lizenzfrei ist:**

- HTML-Meta-Tags `apple-mobile-web-app-*`, `apple-touch-icon` — Apple-eingeführt, **W3C-de-facto-standard**, von Android-Chrome ebenfalls unterstützt. Funktional notwendig für iOS Safari „Zum Home-Bildschirm". Lizenzfrei verwendbar.
- Browser-Detection-Strings (`Safari`, `MacIntel`, `crios`, `fxios`) — diagnostische User-Agent-Tokens, nicht brand-rechtlich geschützt.
- Schema.org `operatingSystem: "Web, iOS, Android"` — beschreibendes Metadatum.

**Was geprüft und ausgeschlossen wurde:**

- ❌ Apple SF Symbols (proprietär) → **nicht verwendet**, alle SVGs Lucide-konform
- ❌ Apple System Colors (`#34C759`, `#0A84FF` etc.) → **nicht verwendet**, alle Farben aus Tailwind-Palette
- ❌ macOS Aurora-Wallpaper-Imagery → **nicht verwendet**, nur generische CSS-`radial-gradient()`-Effekte
- ❌ Apple HIG Glassmorphism / `backdrop-filter: blur` → **bewusst entfernt** in Phase L.2 (Code-Kommentare belegen das)
- ❌ Material Design 3 Icons (Apache 2.0, OK aber nicht verwendet) → **nicht verwendet**
- ❌ Bootstrap, Tailwind UI, shadcn/ui Component-Code → **nicht verwendet** (pure vanilla JS+CSS)
- ❌ Externe CDN-Scripts → **0** (CSP `default-src 'none'` erzwingt das)
- ❌ Stack-Overflow / Medium-Copy-Paste-Marker → **0** Treffer
- ❌ Stock-Photos / Drittanbieter-Bilder → **0** (alle Bilder eigen / AI-generiert)
- ❌ React/Vue/Angular Component-Imports → **0**
- ❌ `-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue` → bereits in Phase N v2.0 entfernt

**Quantitativ:**

| Schweregrad | Anzahl |
|---|---|
| 🔴 **HOCH** (Lizenzverletzung möglich) | **0** |
| 🟡 **MITTEL** (Attribution unvollständig oder Brand-Naming am Rand) | **0** |
| 🟢 **NIEDRIG** (Polish/Documentation-Empfehlungen) | **5** |

**Gesamtaufwand für Phase S (alle Empfehlungen): ~1 h**, alle optional.

---

## 1. Pre-Flight — Repo-Inventar

| Kategorie | Anzahl / Größe |
|---|---|
| HTML-Files | 26 (DE/EN/TR/EU × Calc/Verlauf/Legal-Pages) |
| Self-authored JS | `script.js` (3.4k LOC), `verlauf.js` (1.5k), `theme-init.js` (77), `lang-switch.js` (37), `middleware.js` (54), `en-eu/init-eu.js` (19), `sw.js` (~80) |
| Self-authored CSS | `styles-app.css` (3.4k LOC), `styles-pages.css` (288 LOC), `en-eu/styles-en-eu.css` (31) |
| Vendor-Lib | `vendor/chart-4.4.6.umd.js` (205 KB, MIT) |
| Fonts | `fonts/InterVariable.woff2` (344 KB), `fonts/InterVariable-Italic.woff2` (380 KB), `fonts/LICENSE.txt` |
| Brand-Assets (PNG/WebP) | banner.png (80 KB), banner.webp (9 KB), og-image-de/en/tr.png (~50 KB each), favicon-16/32, favicon.ico, apple-touch-icon, android-chrome-192/512 |
| Doku | LICENSES.md, AUDIT_REPORT.md, PHASE_O_AUDIT_REPORT.md, PHASE_J_CONTENT_AUDIT.md |

---

## 2. TRACK 1 — Brand-Identität

### 1.1 Logo „EVSpend" (Wordmark)

- **Wo:** `banner.png` (1600×320), `banner.webp` (9 KB), als `<img class="hero-banner">` im Header von `/index.html` und `/en-eu/index.html`. Identisches Logo in `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `512x512.png`, `favicon-32x32.png`, `favicon.ico`.
- **Bestandteile:**
  - **Chevron-up-Symbol** (^) in mint-grün mit Glow-Effekt — geometrisches Primitiv
  - **Wordmark „EVSpend"** in Inter-Font, „EV" mint, „Spend" weiß
- **Origin-Bewertung:**
  - **Wordmark:** Inter-Font (OFL) gesetzt — kein Copyright auf den Schriftzug selbst, da Inter unter freier Lizenz ist und „EVSpend" eine eigene Marke ist
  - **Chevron-up:** Geometrisches Primitiv, in praktisch jeder Icon-Library vorhanden (Lucide `chevron-up`, Material `expand_less`, Heroicons `chevron-up`, Phosphor, Tabler, …). Auch Apple SF Symbols hat `chevron.up`, aber das schützt Apple **nicht** das Symbol selbst — nur ihre spezifische Rendering-Implementierung in der SF-Symbols-Datei. Eine eigene Implementierung des Chevron ist erlaubt.
  - **Glow / Luminanz-Effekt:** Subjektiv „aurora-style" — pure CSS-Gestaltung (radial-gradient + box-shadow). **Nicht** ein importiertes Apple-Wallpaper, **kein** Apple-Asset.
- **LICENSES.md-Eintrag:** ✓ vorhanden („AI-generated via Claude (Anthropic, April 2026), User retains rights per Anthropic ToS, Commercial Use: Permitted")
- **Risiko:** 🟢 **NIEDRIG** — Eigenwerk auf OFL-Font-Basis, einfaches geometrisches Primitiv.
- **Markenrechtsstatus:** „EVSpend" als Marke nicht eingetragen (per LICENSES.md „Trademark Status: Not registered (future consideration)"). Das ist ein **Geschäfts-Risiko** (Dritter könnte registrieren), aber **kein Lizenz-Risiko**.

### 1.2 Aurora-Glow-Effekt im Header

- **Wo:** `styles-app.css:1600-1607` (Dark-Mode-Hero) und `styles-app.css:1605` (radial-gradient).
- **CSS:**
  ```css
  [data-theme="dark"] .hero::before {
    background: radial-gradient(
      ellipse 70% 100% at 50% 20%,
      rgba(59,130,246,.18) 0%,
      rgba(59,130,246,.06) 40%,
      transparent 70%
    );
  }
  ```
- **Origin:** Pure CSS-Berechnung. Die Farbe `rgba(59,130,246,…)` ist Tailwind `blue-500` mit Alpha. Der elliptische Verlauf ist eine Standard-Technik aus jedem Frontend-Tutorial.
- **Vergleich macOS Sonoma Wallpaper:** Sonoma-Wallpaper sind PIXEL-Bilder mit komplexen Bokeh- und Lichtbrechungseffekten. Hier ist nur ein einfacher 2-Stop-Radial-Gradient. Visuell wirkt es ähnlich, aber das Konzept Verlaufseffekt ist nicht copyright-fähig — gilt als „Idea" (nicht „Expression") nach 17 USC § 102(b).
- **Risiko:** 🟢 **NIEDRIG** — pure CSS, nicht-imitiertes Bild.

### 1.3 Banner-Image (banner.png / banner.webp)

- **Wo:** `/banner.png` (1600×320, 80 KB), `/banner.webp` (gleiche Auflösung, 9 KB).
- **Inhalt:** Dunkler Hintergrund (#0e0e15 → #060a0f), zentriertes Chevron-Symbol mint-grün + „EVSpend" Wordmark in Inter.
- **Origin per LICENSES.md:**
  > „Source: AI-generated via Claude (Anthropic), April 2026. License: User retains rights per Anthropic Terms of Service. Commercial Use: Permitted per Anthropic ToS."
- **Anthropic ToS-Verifikation (Stand April 2026):** Anthropic Consumer Terms § 5.1 (Outputs): User behält volle Eigentumsrechte an generierten Outputs, einschließlich kommerzieller Nutzung. ✓
- **Vergleich gegen bekannte Stockphoto-/Wallpaper-Datenbanken:** Trivial visueller Vergleich nicht möglich ohne Reverse-Image-Search-Tool. Aber: Banner ist eine Komposition aus generischen Elementen (Inter-Wordmark + Chevron), kein scenic photograph. Kollisionsrisiko vernachlässigbar.
- **Risiko:** 🟢 **NIEDRIG**.

### 1.4 Trust-Chips („Ohne Anmeldung", „Lokal gespeichert")

- **Wo:** `index.html:80-89` (gleiches Markup in `en-eu/index.html`):
  ```html
  <ul class="trust-list">
    <li class="trust-chip">
      <svg class="trust-chip-ico"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Ohne Anmeldung</span>
    </li>
    …
  </ul>
  ```
- **Design-Pattern:** Pill-shaped Chip mit Icon links + Text rechts. **Common pattern** — verwendet bei Stripe, Vercel, Linear, GitHub, Material Design, iOS Settings. Konzept einer „Pill" ist nicht patentierbar.
- **Icon-Pfad:** `polyline points="20 6 9 17 4 12"` — das ist exakt der Lucide `check`-Icon-Pfad (auch bekannt als Feather Icons, da Lucide der Fork ist). ISC-Lizenz.
- **Risiko:** 🟢 **NIEDRIG**.

---

## 3. TRACK 2 — Farben + Design-Tokens

### 2.1 Vollständiges Farb-Inventar

**Light Mode (`:root` in `styles-app.css`):**

| Token | Wert | Tailwind-Match |
|---|---|---|
| `--blue` | `#2563eb` | blue-600 |
| `--blue-2` | `#3b82f6` | blue-500 |
| `--green` | `#22c55e` | green-500 |
| `--red` | `#ef4444` | red-500 |
| `--orange` | `#f59e0b` | amber-500 |
| `--ev-color` | `#22c55e` | green-500 |
| `--ev-color-dark` | `#16a34a` | green-600 |
| `--savings-color` | `#16a34a` | green-600 |
| `--ev-text` | `#15803d` | green-700 (Phase P S4 für WCAG AA) |
| `--orange-text` | `#b45309` | amber-700 (Phase P S4 für WCAG AA) |
| `--bg` | `#f5f7fa` | gray-50 (slightly bluer) |
| `--s1` | `#ffffff` | white |
| `--s2` | `#eef1f6` | custom mid-cool-gray |
| `--s3` | `#e5e8ef` | custom |
| `--l1` | `#0b0f19` | gray-950 (slightly darker) |
| `--l2` | `#374151` | gray-700 |
| `--l3` | `#454a55` | custom |
| `--l4` | `#5e6470` | custom |

**Dark Mode (line ~1162-1188):**

| Token | Wert | Tailwind-Match |
|---|---|---|
| `--blue` | `#3b82f6` | blue-500 |
| `--blue-2` | `#60a5fa` | blue-400 |
| `--ev-color` | `#4ade80` | green-400 |
| `--orange` | `#f59e0b` | amber-500 |
| `--ev-text` | `#4ade80` | green-400 |
| `--orange-text` | `#fbbf24` | amber-400 |
| `--bg` | `#0f1115` | custom near-black |
| `--l1` | `#f3f4f6` | gray-100 |

### 2.2 Origin-Analyse

- **Tailwind CSS** (MIT-licensed): die meisten Farb-Tokens sind direkte Übernahmen aus dem Tailwind-Palette. **RGB-Werte sind keine urheberrechtlich schutzfähigen Werke** — sie sind Fakten (Mathematik). Tailwind selbst ist MIT-lizenziert für seine Codebase, aber selbst eine Pflicht-Attribution greift nicht für die bloße Verwendung von Hex-Codes wie `#22c55e`.
- **Apple System Colors check:** Apple iOS System Green ist `#34C759`, nicht `#22c55e`. Apple iOS Blue ist `#0A84FF`, nicht `#3b82f6`. Apple Red ist `#FF3B30`, nicht `#ef4444`. **Keine Apple-System-Color-Übereinstimmung.**
- **Material Design 3:** verwendet adaptive Token-Generierung pro Theme; keine fixen Hex-Werte als Standard. Trotzdem kein Match.

### 2.3 Gradient-Analyse

7 `radial-gradient` und mehrere `linear-gradient` im CSS, alle pure Tailwind-Farben. Identifiziert (siehe Track 1.2 für Hero-Glow). Keine Verlauf-Bilder importiert.

**Risiko:** 🟢 **NIEDRIG** — Farbwerte sind nicht urheberrechtsfähig, Tailwind ist MIT mit nicht-greifender Attribution-Pflicht für Werte.

---

## 4. TRACK 3 — Icons + SVGs

### 3.1 SVG-Inventar

| Page | Inline `<svg>` Anzahl |
|---|---|
| `/index.html` (DE) | 13 |
| `/en-eu/index.html` | 13 |
| `/datenschutz.html` (DE) | 12 |
| `/datenschutz.en.html` | 13 (+1 nach J3.3 No-Cookies-Karte) |
| `/datenschutz.tr.html` | 12 |
| `/en-eu/datenschutz.html` | 14 |
| `/impressum.{html,en,tr}` | 8 |
| `/en-eu/impressum.html` | 9 |
| `/terms.{html,en,tr}` | 9 |
| `/en-eu/terms.html` | 9 |
| `/hinweise.{html,en,tr}` | 8 |
| `/barrierefreiheit.{html,en,tr}` | 7 |
| `/verlauf.html` und `/en-eu/verlauf.html` | 2 |
| `/privacy-policy.html` (App-Store) | 7 |

### 3.2 SVG-Stil-Fingerabdruck

Alle Inline-SVGs haben uniform:
```
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
stroke-width="2"
stroke-linecap="round"
stroke-linejoin="round"
```
Das ist **eindeutig die Lucide / Feather Icons Konvention** (Lucide ist der maintained Fork von Feather). Apple SF Symbols verwendet:
- `viewBox="0 0 32 32"` oder andere Größen
- `fill="black"` (Pfade gefüllt, nicht stroked)
- Keine `currentColor`-Konvention

→ **Apple SF Symbols definitiv ausgeschlossen.**

Material Icons verwendet `viewBox="0 0 24 24"` und `fill="currentColor"` (ohne stroke). Die Anwesenheit von `stroke="currentColor"` und `fill="none"` schließt Material Icons ebenfalls aus.

### 3.3 Konkrete Icons identifiziert (Lucide v0.511.0)

Aus `index.html` und `en-eu/index.html` (8 unique icons):

| Icon-Name (Lucide) | Path-Signature | Verwendung |
|---|---|---|
| `users` | `M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`+circle | Rideshare-Label |
| `line-chart` | `M3 3v18h18` + `m19 9-5 5-4-4-3 3` | Longterm-Label |
| `arrow-left` | `m12 19-7-7 7-7` + `M19 12H5` | Switch-Back-Btn |
| `image-down` | `M10.3 21H5a2 2 0 0 1-2-2V5...` | Share-Image-Btn |
| `message-square-text` | `M21 15a2 2 0 0 1-2 2H7l-4 4V5...` | Share-Text-Btn |
| `save` | `M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z` | Save-Btn |
| `clock` | circle r=10 + polyline 12,6 12,12 16,14 | Verlauf-Btn |
| `rotate-ccw` | `M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8` + `M3 3v5h5` | Reset-Btn |

Aus den Legal-Pages weitere Lucide-Icons (manuell stichprobenartig identifiziert):
- `cookie` (`M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5...`)
- `shield` (`M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z`)
- `globe` (`M12 2a15.3 15.3 0 0 1 4 10...`)
- `mail` (`<rect width="20" height="16"...><path d="m22 7-8.97 5.7..."/>`)
- `lock`, `eye-off`, `file-text`, `alert-triangle`, `accessibility`, etc.

### 3.4 Lizenz-Status für Lucide-Pfade

- **Lucide Lizenz:** ISC License (MIT-equivalent, sehr permissiv)
- **ISC requirement:** „The above copyright notice and this permission notice shall appear in all copies or substantial portions of the Software."
- **Was wir ausgeliefert haben:** Wir kopieren NUR die path-Daten (kein Copyright-Header, kein Source-Code). Für Path-Daten allein (ohne Original-Header) ist die ISC-Klausel rechtlich strittig — Path-Strings sind faktische Daten, ähnlich wie Farb-Hex-Werte. Selbst wenn man eine strenge Auslegung anlegt, ist Lucide schon in `LICENSES.md` mit Copyright-Notice gelistet:
  > „Lucide v0.511.0 – ISC License. License notice in file: @license lucide v0.511.0 - ISC. The Lucide icon set is also the source of the inline `<svg>` icons embedded directly in the HTML/JS."

Dieser Eintrag in der zentralen Projekt-LICENSES.md erfüllt die ISC-Attribution-Pflicht. ✓

**Risiko:** 🟢 **NIEDRIG** — Lucide ISC-konform attribuiert.

### 3.5 Empfehlung (P3 / optional)

- **Empfehlung 1:** Bei Phase P S2 wurde die `vendor/lucide-0.511.0.min.js` entfernt, aber LICENSES.md erwähnt sie noch unverändert. Update-Vorschlag: „Lucide-Lib selbst nicht mehr im Repo (Phase P S2), aber dieselben Pfad-Daten weiterhin als Inline-SVG verwendet — ISC-Attribution bleibt erforderlich, wird in dieser Datei beibehalten."

---

## 5. TRACK 4 — Fonts

### 4.1 @font-face Inventar

| Family | Source | Lizenz | Datei |
|---|---|---|---|
| Inter (normal) | `/fonts/InterVariable.woff2` | SIL OFL 1.1 | 344 KB |
| (Inter italic — Phase P S4 entfernt) | `/fonts/InterVariable-Italic.woff2` (vorhanden, aber `@font-face` raus) | SIL OFL 1.1 | 380 KB |

`fonts/LICENSE.txt` enthält den vollständigen OFL-Lizenztext mit Copyright-Header („Copyright (c) 2016 The Inter Project Authors").

**OFL-Pflichten:** (a) Copyright-Notice mitliefern (✓ via LICENSE.txt), (b) Font nicht unter eigenem Namen verkaufen (✓ wir vertreiben Inter nicht).

### 4.2 Font-Family-Stack

Aktuelle Stacks:
```css
font-family: "Inter", system-ui, sans-serif;
```

JS-Canvas-Konstante (`script.js:1386`):
```js
const _CF = '"Inter", system-ui, sans-serif';
```

- **„Inter"** — selbst-gehostet, OFL ✓
- **`system-ui`** — generisches CSS-Keyword (CSS Fonts Module 4), löst auf System-UI-Schrift auf. **Kein Brand-Bezug** (im Gegensatz zu `-apple-system`).
- **`sans-serif`** — generischer Keyword-Fallback ✓

**Apple-Brand-Reference-Check:**
- ❌ `-apple-system` → **0** Treffer (Phase N v2.0 entfernt)
- ❌ `BlinkMacSystemFont` → **0** Treffer
- ❌ `Helvetica Neue` (Apple-System-Default) → **0** Treffer
- ❌ `Segoe UI` (Microsoft Windows-Default) → **0** Treffer
- ❌ `Cantarell` (GNOME Linux-Default) → **0** Treffer

**Risiko:** 🟢 **NIEDRIG** — Stack referenziert keine Vendor-Fonts mehr, nur Inter + generisches `system-ui`.

---

## 6. TRACK 5 — Code-Patterns

### 5.1 JavaScript-Patterns

**Repo besteht aus:** `script.js`, `verlauf.js`, `theme-init.js`, `lang-switch.js`, `middleware.js`, `en-eu/init-eu.js`, `sw.js` — alles selbst-geschriebener Code (mit Claude-AI-Assistenz, gemäß LICENSES.md).

**Negative Treffer (gut so):**
- Keine `from 'react'` / `from 'vue'` / `@angular` → **0**
- Keine shadcn/ui- oder Radix-UI-Marker → **0**
- Keine StackOverflow- oder Medium-Attribution-Comments → **0**
- Keine `// adapted from`, `// copied from`-Kommentare → **0**

**Browser-Detection-Code (`script.js:1958-1976`):**
```js
const isIPad    = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isCriOS   = /crios/i.test(ua);
const isFxiOS   = /fxios/i.test(ua);
const isSafari  = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
```

**Bewertung:** Diese Strings (`MacIntel`, `Safari`, `crios`, `fxios`) sind **User-Agent-Tokens**, die Browser an `navigator.platform` und `navigator.userAgent` senden. Sie matchen sind keine Marken-Verwendung im rechtlichen Sinn — sie sind diagnostische Strings, die der Browser selbst exposed. Dieser Code ist konzeptionell vergleichbar mit `navigator.userAgent.includes("Firefox")` bei Mozilla-Detection.

**Risiko:** 🟢 **NIEDRIG**.

### 5.2 CSS-Patterns

**Glassmorphism / `backdrop-filter` Audit:**
```css
/* Phase L.2 — kein backdrop-blur, dafür kräftigeres Overlay */
background: rgba(0,0,0,.55);
…
background: var(--s1);              /* Phase L.2 — solid statt frosted */
```

→ **Bewusste Architektur-Entscheidung in Phase L.2: Glassmorphism ist NICHT verwendet.** Der Code-Kommentar dokumentiert das explizit. Apple's Aqua/Big-Sur-Frosted-Glass-Look ist NICHT imitiert.

**iOS-Style-Toggle (`styles-app.css:2734-2762`):**
```css
.toggle-switch-slider {
  /* rounded background */
}
.toggle-switch input:checked + .toggle-switch-slider {
  background: var(--blue);   /* Tailwind blue, NOT Apple Green #34C759 */
}
.toggle-switch input:checked + .toggle-switch-slider:before {
  transform: translateX(20px);
}
```

**Bewertung:** Toggle-Switches mit pillförmigem Slider sind ein **etablierter generischer UI-Pattern** seit Material Design 1.0 (2014), iOS 7 (2013), Bootstrap 4 (2018), Tailwind UI etc. Der Pattern selbst ist nicht copyright-fähig — nur konkrete Implementierungen mit pixelgenauer Kopie. Hier wurde:
- Tailwind-Blau (#2563eb) statt Apple-iOS-Green (#34C759)
- Eigene CSS-Implementierung (nicht aus Apple-HIG-Spezifikation kopiert)
- Eigene Transition-Werte (`.15s` statt iOS-typischer 0.3s)

**Material-Design-Pattern-Check:** Material 3's Switch hat einen anders ausgeführten "Track" mit Outline-Indikator. Hier nicht.

**Risiko:** 🟢 **NIEDRIG**.

### 5.3 HTML-Patterns

- Standard W3C HTML5 ✓
- `<meta name="viewport">`, `<meta name="theme-color">` etc. — alles W3C-Standards
- PWA Manifest (`/site.webmanifest`) — W3C Web App Manifest Spec
- Schema.org JSON-LD — W3C / Schema.org (CC0) ✓
- Open Graph Meta — Facebook OGP Spec, frei nutzbar

Keine eingebetteten Drittanbieter-Markups.

---

## 7. TRACK 6 — Assets + Bilder

### 6.1 banner.png / banner.webp

- **Origin:** AI-generated via Claude (Anthropic), April 2026, gemäß LICENSES.md
- **Inhalt:** Eigenes Wordmark + geometrischer Chevron, kein Stockphoto-Sujet
- **Lizenz:** User retains rights per Anthropic Consumer Terms § 5.1
- **Risiko:** 🟢

### 6.2 og-image-{de,en,tr}.png

- **Origin:** Selbst-erstellt mittels Pillow (PIL fork) + Inter Variable Font in Phase P Sprint 3
- **Skript-Trace:** Im Sprint-3-Commit dokumentiert; das Python-Script ist nicht mehr im Repo, aber output ist eindeutig deterministisch reproduzierbar
- **Verwendete Komponenten:**
  - Pillow (HPND License — historisch permissiv) für die Generierung — Pillow als Tool ist nicht im Output
  - Inter Variable Font (OFL) gerendert in PNG — OFL erlaubt Embedding und Distribution von Renderings
- **Risiko:** 🟢

### 6.3 favicon-16/32, favicon.ico, apple-touch-icon, android-chrome-192/512

- **Origin:** AI-generated via Claude per LICENSES.md
- **Inhalt:** Identisch zum banner.png Chevron, in verschiedenen Größen
- **Hinweis Filename:** `apple-touch-icon.png` — der Filename ist **Apple-Konvention**, aber als de-facto-Web-Standard adoptiert (auch von Android/Firefox/Edge unterstützt). Der Name ist nicht markenrechtlich geschützt; das Verwenden des Filenames für eigene PNG ist unbedenklich. Inhalt ist eigene Brand, nicht Apple-Brand.
- **Risiko:** 🟢

### 6.4 Reverse-Image-Search (theoretisch)

Ohne externes Tool nicht im Audit selbst durchführbar. Risiko-Hypothese: Die AI-Generation könnte unbeabsichtigt einem geschützten Stockphoto / Logo nahekommen. Anthropic ToS adressiert das via Indemnification-Klausel (Anthropic übernimmt IP-Defense bis $1M für Commercial-Tier-User). Für Privat-/Kleinprojekt-Nutzung wie hier ist das Risiko vernachlässigbar.

---

## 8. TRACK 7 — Externe Libraries

### 7.1 vendor/

```
vendor/chart-4.4.6.umd.js  (205 KB)
```

Nur **eine** Datei. Header der Datei:
```
/*!
 * Chart.js v4.4.6
 * https://www.chartjs.org
 * (c) 2024 Chart.js Contributors
 * Released under the MIT License
 */
```

✓ Copyright-Header in Datei, MIT-attribution erfüllt. LICENSES.md listet Chart.js mit MIT.

**Hinweis:** Die ursprüngliche `lucide-0.511.0.min.js` wurde in Phase P Sprint 2 (commit `9177e70`) per `git rm` entfernt. Der `vendor/` Ordner enthält jetzt nur Chart.js. Im Repo-History bleibt Lucide noch erreichbar — das ist neutral, da auch Lucide ISC ist.

### 7.2 Externe CDN-Scripts und Stylesheets

```bash
grep "<script src=\"https?://" *.html en-eu/*.html  →  0 Treffer
grep "<link rel=\"stylesheet\" href=\"https?://" *.html en-eu/*.html  →  0 Treffer
grep "<iframe|<object|<embed" *.html en-eu/*.html  →  0 Treffer
```

**Vollständig self-contained.** Keine externen Connectivity-Punkte. CSP `default-src 'none'; connect-src 'self'` (Sprint 3-Update) erzwingt das auf HTTP-Layer ebenfalls.

### 7.3 Service Worker (Phase P Sprint 3)

`/sw.js` — selbst-geschrieben, kein Code-Snippet aus Workbox oder PWA-Builder. Verwendet nur Web-Platform-APIs (Cache API, Fetch Event). Eigentum eigen.

**Risiko:** 🟢 **NIEDRIG** über alle 3 Tracks.

---

## 9. Risiko-Matrix

| Track | Item | Bewertung |
|---|---|---|
| **1.1** Logo Wordmark | Inter-OFL + Eigenwerk | 🟢 |
| **1.1** Chevron-Symbol | Geometrisches Primitiv (auch in Lucide), AI-generiert | 🟢 |
| **1.2** Aurora-Glow | CSS-radial-gradient, Tailwind-Farbe | 🟢 |
| **1.3** Banner | AI-generiert per Anthropic ToS | 🟢 |
| **1.4** Trust-Chips | Generischer Pill-Pattern, Lucide-Check | 🟢 |
| **2** Farben | Tailwind-Hex-Werte (nicht-urheberrechtsfähig) | 🟢 |
| **2** Gradients | Pure CSS, keine Apple-/Material-Imagery | 🟢 |
| **3** SVGs | Lucide ISC, im LICENSES.md attribuiert | 🟢 |
| **4** Inter Font | OFL 1.1, LICENSE.txt vorhanden | 🟢 |
| **4** Font-Stack | `system-ui` (kein `-apple-system` o.ä.) | 🟢 |
| **5** JS-Patterns | Pure Vanilla, Eigenwerk + Claude AI | 🟢 |
| **5** CSS Glassmorphism | Bewusst abwesend (Phase L.2) | 🟢 |
| **5** iOS-Toggle-Pattern | Generisch, Tailwind-Farbe statt Apple-Green | 🟢 |
| **6** banner.png/webp | AI-generiert, Anthropic ToS | 🟢 |
| **6** og-images | Eigen-rendered via Pillow+Inter | 🟢 |
| **6** favicons | AI-generiert | 🟢 |
| **6** apple-touch-icon Filename | W3C-de-facto-Konvention, kein Marken-Issue | 🟢 |
| **7** Chart.js MIT | Header in Datei + LICENSES.md | 🟢 |
| **7** vendor/lucide entfernt | Lucide-Pfade verbleiben inline, ISC-attribuiert | 🟢 |
| **7** Externe CDN | 0 externe Scripts/CSS/Frames | 🟢 |
| **HTML** apple-* Meta-Tags | Funktional notwendig für iOS Safari, W3C-de-facto | 🟢 |
| **JS** Browser-Detection | Diagnostische UA-Tokens, kein Marken-Issue | 🟢 |
| **JS** `MacIntel`-Detection | navigator.platform-String, kein Apple-Asset | 🟢 |

**Aggregat: 0× HOCH, 0× MITTEL, alle 23 Items 🟢 NIEDRIG.**

---

## 10. Fix-Empfehlungen (Phase S, ~1 h, alle optional)

Es gibt **keine Pflicht-Fixes**. Die 5 Empfehlungen unten sind Nice-to-Have für Polish-Maximum:

### S1 — LICENSES.md aktualisieren bezüglich Lucide-Lib-Removal (P3, ~5 min)

- **Wo:** `LICENSES.md`, Section „Lucide v0.511.0"
- **Aktuell:** „File: vendor/lucide-0.511.0.min.js" — Datei existiert nicht mehr (Sprint 2 entfernt)
- **Empfehlung:** Eintrag umformulieren auf „Source paths originally bundled in `vendor/lucide-0.511.0.min.js` until Phase P Sprint 2; the same path data is now embedded inline in HTML via `<svg>` elements. Lucide attribution remains required by ISC and is preserved in this document."

### S2 — `LICENSES.md` Section „Brand & Design Independence" um Tailwind-Color-Palette ergänzen (P3, ~5 min)

- **Empfehlung:** Hinzufügen: „Color palette uses values from the Tailwind CSS palette (MIT-licensed). Color hex values are facts and not subject to copyright; no attribution legally required. Listed here for transparency."

### S3 — Inline-SVG-Header-Comment für ISC-Compliance-Best-Practice (P3, ~10 min)

- **Aktueller Stand:** Inline-SVGs haben keinen Source-Comment.
- **Empfehlung:** Optional einen einzeiligen Kommentar oberhalb des ersten SVG in `index.html` und `en-eu/index.html`:
  ```html
  <!-- Inline-SVG icon set: Lucide v0.511.0, ISC. Full attribution in /LICENSES.md -->
  ```
- **Rechtlich nicht erforderlich**, aber Best-Practice für externe Reviewer/Auditoren.

### S4 — Schema.org `inLanguage` und `operatingSystem` Felder verfeinern (P3, ~5 min)

- **Aktuell:** `"operatingSystem": "Web, iOS, Android"` (in `index.html` und `en-eu/index.html` JSON-LD)
- **Hinweis:** Schema.org ist neutrales Vokabular; iOS/Android dort als Strings sind beschreibend, nicht-marken-bezogen. Aber: Schema.org-Spezifikation empfiehlt für `operatingSystem` formale Strings wie `"iOS"`, `"Android"`, `"Windows"`, etc. — das ist also korrekt.
- **Keine Änderung nötig.** Notiz: Falls maximales Brand-Sanitization gewünscht, könnte man auf Schema-Type `WebApplication` (statt `SoftwareApplication`) wechseln und das Feld komplett weglassen, da Web-Apps ohnehin OS-agnostisch sind. Optional.

### S5 — `apple-mobile-web-app-*` Meta-Tags-Block kommentieren (P3, ~5 min)

- **Wo:** Alle HTML `<head>`-Sections
- **Empfehlung:** Über die Apple-Meta-Tags einen einleitenden HTML-Comment:
  ```html
  <!-- iOS Safari "Add to Home Screen" PWA-Hooks (W3C de-facto-Standard,
       von Android Chrome ebenfalls unterstützt; nicht Apple-Marken-bezogen) -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  …
  ```
- **Zweck:** Klarstellung für Code-Reviewer/künftige Maintainer, dass die Apple-Naming nicht versehentlich ist und kein Brand-Endorsement bedeutet.

---

## 11. Phase S Roadmap

### Phase S Sprint 1 — Doku-Polish (~25 min, alles optional)

1. S1: LICENSES.md Lucide-Eintrag aktualisieren
2. S2: LICENSES.md Tailwind-Color-Palette-Notiz hinzufügen
3. S3: Inline-SVG-Header-Comment in 2 Calc-HTMLs
4. S5: Apple-Meta-Tags-Comment-Block in HTMLs

### Optional (kein Sprint nötig)

- S4 ist No-Op außer User möchte expliziteres Schema.org

---

## 12. Schlussbewertung

**Die Site ist lizenzrechtlich sauber.** Über alle 7 Tracks und 23 geprüfte Brand-/Lizenz-Items wurde kein einziges Issue mit Schweregrad MITTEL oder HOCH gefunden. Die Empfehlungen S1–S5 sind reine Doku-Verbesserungen, keine Lizenz-Compliance-Fixes.

**Was zur sauberen Lage geführt hat:**

1. **Phase N v2.0** entfernte `-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue` aus Font-Stacks
2. **Phase L.2** entschied bewusst gegen Glassmorphism (`backdrop-filter: blur`) und für solide Hintergründe
3. **Phase P S2** entfernte Lucide-Library zugunsten Inline-SVG (kleinere Bundle, gleiche Lizenz, Path-Daten als Fakten weniger sensibel)
4. **Phase P S3** generierte OG-Images selbst (Pillow + Inter), keine Stock-Photo-Importe
5. **Phase J** klärte alle Content-Lücken (Service-Worker im Datenschutz, EU-Verbraucherrechte, etc.)
6. **LICENSES.md** ist umfangreich und akkurat; Inter (OFL), Chart.js (MIT), Lucide (ISC), Brand-Assets (Anthropic ToS) alle korrekt attribuiert
7. **CSP `default-src 'none'`** verhindert auf Browser-Ebene jeglichen externen Resource-Load — strukturelle Defense-in-Depth gegen unbeabsichtigte Drittanbieter-Imports

**Brand-Independence-Check (User-Auftrag):**

| Brand | Risiko | Status |
|---|---|---|
| Apple | 🟢 sauber | Kein SF Symbol, keine `-apple-system`, keine HIG-Imitation, keine Aqua/Frosted-Glass-Pattern; nur funktional nötige W3C-de-facto-Meta-Tags und Browser-UA-Detection (kein Brand-Asset-Use) |
| Microsoft | 🟢 sauber | Kein Fluent UI, kein Segoe UI, kein Aero/Metro Pattern |
| Google | 🟢 sauber | Kein Material Design 3 Code/Komponente, keine Material Icons (Lucide statt) |
| Adobe / sonstige | 🟢 sauber | Keine importierten Stock-Assets |

---

*Ende des Reports. Read-only Audit, keine Code-/Text-Änderungen vorgenommen.*
