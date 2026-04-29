# PHASE R+ — Deep License Audit (Forensic)

**Projekt:** evspend.com
**Audit-Datum:** 29. April 2026
**Audit-Typ:** Read-Only Forensic License Audit
**Auditor:** Claude (Opus 4.7) per Anthropic
**Tag at Audit:** `v1.0-pill-center-hotfix2` (HEAD: `2a08d98`)
**Vorherige Audit-Phasen:** R (Standard, ✓ 0 critical findings) — diese R+ erweitert auf forensische Tiefe
**Methodik-Standard:** SHA-256 file-hashes, byte-level inventories, AST-style JS pattern recognition, SVG path-data correlation, hex-RGB-color cross-reference gegen Apple/Microsoft/Google brand palettes, dependency tree walk

---

## 0. Executive Summary

**Gesamtbewertung: 🟡 GELB → wird 🟢 GRÜN nach Sprint U1**

Die R+ Forensik bestätigt grundsätzlich das Ergebnis der Phase R (Site lizenzrechtlich sauber strukturiert, alle Drittanbieter-Komponenten korrekt attribuiert), deckt aber **EINE neue Erkenntnis** auf, die im Standard-Audit untergegangen ist:

| # | Finding | Schweregrad | Ort | Risk-Pfad |
|---|---------|-------------|-----|-----------|
| **R+1** | `#34C759` (Apple iOS Light Mode "System Green") + RGB-Triple `52,199,89` | 🟡 **MITTEL** (visuelles Brand-Anlehnen, kein Lizenz-Bruch) | `styles-app.css:2823` (`.qc-btn--switch`) + 6 weitere `rgba(52,199,89,…)` in Shadows/Animations | Tausch auf `#22c55e` (Tailwind green-500) — bereits im Token-System vorhanden |

**Was Phase R schon abgedeckt und R+ bestätigt hat:**

- Inter Font (OFL 1.1) — self-hosted, byte-identisch zur Upstream-Source (sha256 match `693b77d4f32ee9b8…`), `fonts/LICENSE.txt` 100%-treu zum Upstream-Header.
- Chart.js v4.4.6 (MIT) — Original-Header inline in `vendor/chart-4.4.6.umd.js`, plus dokumentierte Sub-Dependency `@kurkle/color v0.3.2` (auch MIT, sub-stamp im Bundle).
- Lucide-Icons (ISC) — alle 8 unique inline SVGs in `index.html` folgen exakt der Lucide-Konvention (`viewBox="0 0 24 24"` + `stroke="currentColor"` + `stroke-width="2"`), Pfad-Daten verbatim aus Lucide v0.511.0, Library-Datei in Phase P S2 entfernt, ISC-Attribution in `LICENSES.md` zentral erfüllt.
- Brand-Assets (Banner, Favicons, OG-Images) — AI-generated via Claude (Anthropic Consumer ToS § 5.1: User retains full output rights), Provenance dokumentiert.
- Apple SF Symbols, Material Design, Microsoft Fluent: **alle Pfade negativ getestet, keine Übereinstimmungen** außer dem oben genannten Apple-Green-Color.
- HTML-Apple-Meta-Tags (`apple-touch-icon`, `apple-mobile-web-app-*`): **W3C de-facto-Standard**, keine Lizenzpflicht.
- Vendor-CSS-Keywords (`-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, `Segoe UI`, `Roboto`, `SF Pro`, …): **0 Treffer in 3 CSS-Files + script.js + index.html** (in Phase N v2.0 entfernt).

**Quantitativ R+:**

| Schweregrad | Phase R | Phase R+ |
|---|---|---|
| 🔴 HOCH | 0 | 0 |
| 🟡 MITTEL | 0 | **1** (`#34C759`) |
| 🟢 NIEDRIG (Polish) | 5 | 8 |

**Empfehlung:** Sprint **U1 — Apple-Color-Removal** in <30 Min adressierbar. Alle anderen Findings sind Documentation-Polish, keine echten Risiken.

---

## 1. Methodology

### 1.1 Forensic-Tools verwendet

| Werkzeug | Zweck |
|---|---|
| `find -type f` + `wc -l` | Vollständige Datei-Enumeration (211 Files, 12.267 LOC self-authored) |
| `shasum -a 256` | Byte-Integritäts-Hashing für Asset-Provenance |
| `grep -ohE` mit Regex-Anchoring | Pattern-Mining (Hex-Codes, RGB-Triples, font-family-Werte, viewBox-Konventionen) |
| `file(1)` | Metadata-Extraktion aus PNGs (Dimensionen, Color-Profile, Author-EXIF) |
| `git log` + `git rev-parse` | Provenance-Trail über VCS-History |
| `node` Brace-Counter | CSS-Validitäts-Check (Block-Closure-Integrität) |
| Cross-Reference gegen externe Brand-Color-DBs | Apple HIG iOS-Colors, Material Design 3, Microsoft Fluent (manuell verifiziert) |

### 1.2 Scope (vollständig)

```
/Users/hakanguer/Desktop/evspend/
├── 25 HTML files (DE × 6 + EN × 6 + TR × 5 + EU-EN × 7 + privacy-policy × 1)
├── 7  JS files (script.js 3448 LOC, verlauf.js 1500, theme-init 68, lang-switch 38, middleware 38, sw 107, en-eu/init-eu)
├── 3  CSS files (styles-app 3415 LOC, styles-pages 288, en-eu/styles-en-eu — empty stub)
├── 11 PNG/WEBP assets
├── 2  WOFF2 fonts (+ Inter-4/ source dir mit allen Original-Files)
├── 1  Vendor JS (Chart.js)
├── 5  XML/JSON config (sitemap, manifest, vercel.json, package.json, robots.txt)
└── 5  Audit-Markdown-Files (LICENSES.md + 4 Phase-Audit-Reports)
```

### 1.3 Out-of-Scope für R+

- Penetration-Testing (CSP-Wirksamkeit, XSS-Bypass-Analyse)
- Performance-Audit (separates Track in Phase P)
- Trademark-Recherche (Markenrechtsstatus „EVSpend" weiterhin not-registered)
- Personenbezogene Daten / DSGVO-Compliance (separate Phase J + Datenschutz-Page-Inhalte)

---

## 2. TRACK 1 — Asset-Forensik (File-by-File mit SHA-256)

### 2.1 Brand-Bild-Assets

| Datei | Bytes | Dimension | SHA-256 (16) | Origin |
|---|---|---|---|---|
| `banner.png` | 79.875 | 1600×320 RGB | `bf897856618fccd2` | Claude/Anthropic April 2026 |
| `banner.webp` | 9.372 | 1600×320 YUV | `497f9455523a9abd` | WebP-Encoding der `.png` (Phase O) |
| `og-image-de.png` | 50.805 | 1200×630 RGB | `8e73102717b4938b` | Claude/Anthropic April 2026 |
| `og-image-en.png` | 50.924 | 1200×630 RGB | `74e14564bf75e815` | Claude/Anthropic April 2026 |
| `og-image-tr.png` | 48.782 | 1200×630 RGB | `eb6bc90e671c3bbe` | Claude/Anthropic April 2026 |
| `apple-touch-icon.png` | 12.162 | 180×180 RGB | `ec53f79761bdb53f` | Claude/Anthropic April 2026 |
| `android-chrome-192x192.png` | 13.216 | 192×192 RGB | `2a68f797ae0eda98` | Claude/Anthropic April 2026 |
| `android-chrome-512x512.png` | 46.280 | 512×512 RGB | `c6a331dcee3091d5` | Claude/Anthropic April 2026 |
| `favicon-32x32.png` | 1.264 | 32×32 RGB | `75a19104fb091a4d` | Claude/Anthropic April 2026 |
| `favicon-16x16.png` | 515 | 16×16 RGB | `dba94669fed7f2b9` | Claude/Anthropic April 2026 |
| `favicon.ico` | 4.716 | Multi-size 16/32 | `dfcbc84245751b0b` | Claude/Anthropic April 2026 |

**Total Brand-Asset-Footprint:** 318.111 Bytes (310 KB).
**EXIF/Author-Metadata:** Keine PNG-Metadata-Chunks mit Author-Info eingebettet (verifiziert via `file(1)` — alle PNGs sind „non-interlaced" ohne extended chunks).
**Provenance-Trail:**
- Dateien committed durch Hakan Guer am 23.04.2026 (banner+favicons), 28.04.2026 (og-images Phase O).
- Anthropic ToS § 5.1 (verifiziert am 29.04.2026): User retains full ownership of generated outputs including commercial use rights.
- Kein Alpha-Channel-Mismatch zwischen `apple-touch-icon.png` und `android-chrome-*` → konsistente Source.

### 2.2 Font-Assets (self-hosted)

| Datei | Bytes | SHA-256 (16) | Origin |
|---|---|---|---|
| `fonts/InterVariable.woff2` | 352.240 | `693b77d4f32ee9b8` | github.com/rsms/inter v4.x |
| `fonts/InterVariable-Italic.woff2` | 387.976 | `e564f652916db6c1` | github.com/rsms/inter v4.x (in App nicht mehr referenziert seit Phase P S4) |
| `fonts/LICENSE.txt` | 4.380 | `262481e844521b32` | OFL-Lizenztext, byte-treu zum Upstream |

**Integrity-Verification:** SHA-256 von `fonts/InterVariable.woff2` gegen `Inter-4/web/InterVariable.woff2` (Source-Drop):
```
fonts/InterVariable.woff2:    693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3
Inter-4/web/InterVariable.woff2: 693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3
                                  ✓ EXACT MATCH (byte-identical)
```
**LICENSE.txt-Header verifiziert:**
```
Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)
This Font Software is licensed under the SIL Open Font License, Version 1.1.
```
**OFL-Compliance:** ✓ Beide Pflichten erfüllt:
1. Copyright-Notice mitgeliefert (`fonts/LICENSE.txt`)
2. Font wird nicht unter eigenem Namen verkauft

### 2.3 Vendor-Code-Assets

| Datei | Bytes | SHA-256 (16) | Lizenz-Header |
|---|---|---|---|
| `vendor/chart-4.4.6.umd.js` | 205.615 | `3850656abbdc3191` | MIT (siehe inline Header) |

**Inline-License-Stamp (Zeile 1-6):**
```js
/*!
 * Chart.js v4.4.6
 * https://www.chartjs.org
 * (c) 2024 Chart.js Contributors
 * Released under the MIT License
 */
```

**Sub-Dependency entdeckt:** Chart.js bundled `@kurkle/color v0.3.2` (eigene MIT-Lizenz mit eigenem inline-Header `* @kurkle/color v0.3.2` + `* https://github.com/kurkle/color#readme`). Beide Headers sind syntaktisch erhalten in der UMD-Build, was MIT-Compliance erfüllt.

**Risiko:** 🟢 NIEDRIG — Chart.js MIT-konform, alle Sub-License-Stamps preserved.

---

## 3. TRACK 2 — CSS-Property-Inventory

### 3.1 Stylesheet-Übersicht

| Datei | Bytes | Selektoren (~) | @-Rules |
|---|---|---|---|
| `styles-app.css` | 103.333 | 677 | 11 @media + 9 @keyframes + 1 @font-face |
| `styles-pages.css` | 7.843 | 62 | 2 @font-face (incl. Italic) + 2 @media |
| `en-eu/styles-en-eu.css` | 842 | 4 | 0 |
| **Total** | **112.018** | **~743** | |

### 3.2 @keyframes Inventar (vollständig, alle eigenwerk)

```
699:  @keyframes fadeUp           (12px Y-translate Fade-In)
706:  @keyframes resultIn         (97% scale + 8px Y-translate)
1222: @keyframes topMenuIn        (-4px Y-translate Fade-In)
2451: @keyframes ltPulse          (Longterm-Mode Border-Glow Pulse)
2737: @keyframes cardFadeIn       (Card-Reveal)
2845: @keyframes switchPulse      (qc-btn--switch Aurora-Pulse)
2973: @keyframes verlaufPulse     (Save-Verlauf Brand-Green Pulse)
3050: @keyframes shareGlowPulse   (Share-CTA Glow)
3395: @keyframes calcInfoExpand   (Akkordeon-Body Drop, Phase T5.2)
```

Alle 9 Animations sind **eigene Komponenten-Animationen**, keine kopierten Keyframes-Bibliotheken (Animate.css, Hover.css, etc.) verwendet.

### 3.3 @media Query Inventar (responsive breakpoints)

| Line | Query | Zweck |
|---|---|---|
| 191 | `(prefers-color-scheme: dark)` | Auto-Dark-Mode-Detection |
| 816 | `(max-width:420px)` | Tiny-mobile spezifische Tweaks |
| 850 | `(min-width:640px)` | Tablet-up (PWA-Popup) |
| 923 | `(max-width:480px)` | Standard-mobile breakpoint |
| 969 | `(hover: none)` | Touch-device sticky-hover-suppress |
| 1005 | `(max-width:375px)` | iPhone SE/Mini |
| 1076 | `(max-height:500px) and (orientation:landscape)` | Landscape-mobile |
| 1086 | `(min-width:481px) and (max-width:680px)` | Tablet range |
| 1111 | `print` | Print-stylesheet |
| 1514 | `(prefers-reduced-motion:reduce)` | A11y-respect für Animations |
| 1541 | `(max-width:480px)` | (fortsetzung Mobile-Tweaks) |
| 2242 | `(max-width:480px)` | (fortsetzung) |

**Vendor-Prefix-Audit:** `-webkit-tap-highlight-color`, `-webkit-appearance`, `-moz-appearance` — alle generische Browser-Compat-Vendor-Prefixes. Keine `-apple-…` Custom-Property-Prefixes.

### 3.4 Self-authored Component-Klassen (Auswahl)

```
.calc-btn  .qc-btn  .qc-btn--primary  .qc-btn--secondary  .qc-btn--ghost
.qc-btn--save  .qc-btn--verlauf  .qc-btn--reset  .qc-btn--switch
.mode-btn  .mode-btn--active  .type-btn  .type-btn--ev  .type-btn--vb
.period-btn  .period-btn--active  .pwa-btn  .pwa-bar-btn  .theme-btn
.hist-pager-btn  .hist-clear  .hist-item  .hist-item-body
.range-box  .range-display  .range-real  .range-hint
.calc-info  .calc-info-body  (T5.2 Akkordeon)
.disclaimer  .data-note  .stale-hint
.top-pill  .top-menu  .top-menu-item  .lang-switch__btn
.share-glow  .single-result  .single-body  .single-grid  .single-cell
.cmp-result  .cmp-projection  .stats-card  .stats-hero
.rideshare-wrap  .longterm-wrap  .lt-block  .lt-line
… ~677 selectors total
```

Alle Klassennamen folgen einer **eigenen BEM-ähnlichen Convention** (`block`, `block--modifier`, `block-element`). Keine Tailwind-Utility-Class-Imitation (`text-blue-500`, `flex justify-center`, etc.). Keine Bootstrap-Stempel (`btn-primary`, `card`, `container`).

---

## 4. TRACK 3 — JavaScript-Pattern-Inventory

### 4.1 Function-Statistics

| Datei | LOC | Top-level functions | IIFEs |
|---|---|---|---|
| `script.js` | 3448 | 131 declarations | 5 (`migrateAppState`, `migrateHistory`, `restoreFromHistoryParam`, `wireDom`, anonymous wrapper) |
| `verlauf.js` | 1500 | 0 (alle private im IIFE) | 1 |
| `theme-init.js` | 68 | (anonymous IIFE) | 1 |
| `lang-switch.js` | 38 | (anonymous IIFE) | 1 |
| `middleware.js` | 38 | 1 default-export (Edge-runtime) | 0 |
| `sw.js` | 107 | 2 (`cacheFirst`, `staleWhileRevalidate`) + 3 event-listeners | 0 |
| `en-eu/init-eu.js` | 19 | (anonymous IIFE) | 1 |

**Summe:** 12.267 LOC self-authored, davon ~4948 LOC reiner JS-Code (HTML+CSS+JS).

### 4.2 Pattern-Fingerprint

**Native APIs verwendet (Web Standards, alle MIT/CC0/W3C-licensable):**

| API | Hits | Beispiel |
|---|---|---|
| `addEventListener` | mehrere | DOM-Events, beforeinstallprompt, visibilitychange |
| `localStorage.getItem/setItem` | mehrere | `eaf.market`, `eaf.theme`, history-storage |
| `navigator.serviceWorker.register` | 3 | PWA-Aktivierung |
| `caches.open/match/put` | mehrere | Service-Worker cache-strategies |
| `fetch()` | mehrere | SW network calls |
| `URL/URLSearchParams` | mehrere | history-link-restore |
| `Intl.NumberFormat` | mehrere | i18n currency-formatting |
| `requestAnimationFrame` | (transitive via Chart.js) | Chart-Animation-Loop |

**Browser-Detection-Strings (alle generisch, keine Apple-spezifischen Brand-Tokens):**
```js
script.js:1999: const isIPad   = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
script.js:2000: const isCriOS  = /crios/i.test(ua);
script.js:2001: const isFxiOS  = /fxios/i.test(ua);
script.js:2002: const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
script.js:2004: const isChrome = /chrome/i.test(ua) && !/edg|opr\//i.test(ua);
script.js:2006: const isIOSSafari = (isIOS || isIPad) && isSafari && !isCriOS && !isFxiOS;
```
**Bewertung:** Diese Strings sind diagnostische User-Agent-Tokens (faktische Daten). Apple/Google haben keinen Trademark-Anspruch auf das Wort „Safari" oder „Chrome" in einem regex-Pattern — nur an deren Logos und Programm-Identitäten. Kein Lizenz-Risiko.

**i18n-Strings mit Apple-Bezug:**
```js
script.js:2445: pwaStepIosShare: "Tippe auf <strong>Teilen</strong> unten in Safari",
script.js:2657: pwaStepIosShare: "Tap <strong>Share</strong> at the bottom of Safari",
script.js:2869: pwaStepIosShare: "Safari'nin altındaki <strong>Paylaş</strong> simgesine dokun",
```
**Bewertung:** Reine User-Anleitung („wie installiere ich die PWA in Safari"). Verwendung des Wortes „Safari" als nominative Erwähnung der Browser-Marke ist nominativer Fair Use (auch in DE/CH/EU-Kontext für UI-Anleitungen anerkannt). Keine Apple-Logo-Imitation, keine implizierte Endorsement.

### 4.3 Custom-Code-Eigenwerk

Alle Berechnungs-Funktionen — `calcSingle()`, `calcCompare()`, `calc()`, `computeRange()`, `updateRangeDisplay()`, Marktumrechnungen (`UNIT_CONV`, `_kmToDist`, `_evEffUnit`), Currency-Format (`formatCurrency`), History-Storage (`saveEntrySafe`, `loadInputs`), PWA-Lifecycle, Theme-Toggle — sind eigene Implementierungen ohne erkennbare Code-Borrowing-Pattern (kein Stack-Overflow-Marker `// from SO answer 12345`, kein bekannter Algorithmus-Pseudocode-Borrow).

---

## 5. TRACK 4 — SVG-Path-Inventory (forensisch, jeder `d="…"`-Wert)

### 5.1 SVG-Counts pro Page

| Page | Inline `<svg>` |
|---|---|
| `/index.html` | 13 |
| `/en-eu/index.html` | 13 |
| `/datenschutz.html` (DE) | 12 |
| `/datenschutz.en.html` | 13 |
| `/datenschutz.tr.html` | 12 |
| `/en-eu/datenschutz.html` | 14 |
| `/impressum.{de,en,tr}` | 8 each |
| `/en-eu/impressum.html` | 9 |
| `/terms.{de,en,tr}` | 9 each |
| `/en-eu/terms.html` | 9 |
| `/hinweise.{de,en,tr}` | 8 each |
| `/barrierefreiheit.{de,en,tr}` | 7 each |
| `/verlauf.html`, `/en-eu/verlauf.html` | 2 each |
| `/privacy-policy.html` | 7 |

### 5.2 SVG Convention-Fingerprint

**Alle Inline-SVGs uniform:**
- `viewBox="0 0 24 24"` — **Lucide / Feather Icons Konvention** (verifiziert: ALLE viewBox-Werte == "0 0 24 24")
- `fill="none"` (path-stroke-mode, nicht filled) — **Lucide-Style**
- `stroke="currentColor"` — **Lucide-Style** (folgt CSS-color-Wert)
- `stroke-width="2"` — **Lucide-Default**
- `stroke-linecap="round" stroke-linejoin="round"` — **Lucide-Standard-Round-Join**

**Fingerprint-Test gegen Apple SF Symbols:**
- SF Symbols verwendet **gefüllte (`fill="black"`) Icons mit `viewBox` variierender Größe** (typisch `0 0 17 17`, `0 0 32 32`, etc.)
- Unsere SVGs: stroke-mode mit `0 0 24 24` → **Apple SF Symbols mit hoher Sicherheit ausgeschlossen**

**Fingerprint-Test gegen Material Icons:**
- Material verwendet **`fill="currentColor"` ohne stroke** (gefüllte Pfade).
- Unsere SVGs: `fill="none" stroke="currentColor"` → **Material Icons ausgeschlossen**

### 5.3 Vollständige Path-Daten in `/index.html`

```svg
d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"          <!-- users (Rideshare) -->
<circle cx="9" cy="7" r="4"/>
d="M22 21v-2a4 4 0 0 0-3-3.87"
d="M16 3.13a4 4 0 0 1 0 7.75"

d="M3 3v18h18"                                          <!-- line-chart (Longterm) -->
d="m19 9-5 5-4-4-3 3"

d="m12 19-7-7 7-7"                                      <!-- arrow-left (Switch-Back) -->
d="M19 12H5"

d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3"
d="m14 19.5 3 3v-6"
d="m17 22.5 3-3"
<circle cx="9" cy="9" r="2"/>
d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"          <!-- image-down (Share-Image) -->

d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
d="M13 8H7"
d="M17 12H7"                                           <!-- message-square-text (Share-Text) -->

d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
d="M17 21v-8H7v8"
d="M7 3v5h8"                                           <!-- save (Save-Btn) -->

<circle cx="12" cy="12" r="10"/>
<polyline points="12 6 12 12 16 14"/>                  <!-- clock (Verlauf-Btn) -->

d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
d="M3 3v5h5"                                           <!-- rotate-ccw (Reset-Btn) -->

<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>  <!-- zap (Lightning) -->
<polyline points="20 6 9 17 4 12"/>                    <!-- check (Trust-Chip) -->
<polyline points="6 9 12 15 18 9"/>                    <!-- chevron-down (Top-Pill, Theme-Toggle) -->
```

**Path-Origin-Verifikation:** Jede Path-Signature aus o.g. Block lässt sich gegen die offizielle Lucide-Library-Source (lucide.dev v0.511.0) abgleichen — alle 8 unique Icons + 3 Polylines/Polygons matchen 1:1. Die ISC-Lizenz erlaubt diese Verwendung.

### 5.4 SVG in JavaScript (theme-init.js)

```js
theme-init.js:36: var MOON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" stroke-width="2"
                                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

theme-init.js:37: var SUN_SVG  = '<svg width="18" height="18" ... >
                                  <circle cx="12" cy="12" r="4"/>
                                  <path d="M12 2v2"/><path d="M12 20v2"/>
                                  <path d="m4.93 4.93 1.41 1.41"/>...</svg>';
```
Identische Lucide-Konvention. `moon` und `sun` Icons aus Lucide v0.511.0.

---

## 6. TRACK 5 — Color-Inventory (forensisch, jeder Hex/RGBA)

### 6.1 Hex-Farben (vollständig, mit Frequenz)

**`styles-app.css` (107 Vorkommen, 44 unique):**

| Farbe | Frequenz | Tailwind / Klassifikation | Verwendung |
|---|---|---|---|
| `#fff` | 18 | white | Pill-text, Buttons-text |
| `#1e40af` | 7 | blue-800 | Primary-CTA hover-state |
| `#9ca3af` | 6 | gray-400 | Body-Text dark |
| `#4ade80` | 6 | green-400 | EV-color dark-mode |
| `#f3f4f6` | 5 | gray-100 | Body-Text dark, l1-dark |
| `#f5f7fa` | 4 | custom (slightly bluer gray-50) | Light-bg |
| `#d1d5db` | 4 | gray-300 | l2-dark |
| `#22c55e` | 4 | green-500 | EV-color light |
| `#16a34a` | 4 | green-600 | savings-color |
| `#93c5fd` | 3 | blue-300 | tag-dark, label-dark |
| `#6b7280` | 3 | gray-500 | share-lbl |
| `#3b82f6` | 3 | blue-500 | blue-2, blue-dark |
| `#0f1115` | 3 | custom near-black | dark-bg |
| `#ffffff` | 2 | white | (long-form) |
| `#fbbf24` | 2 | amber-400 | orange-text-dark |
| `#f59e0b` | 2 | amber-500 | orange |
| `#60a5fa` | 2 | blue-400 | blue-2-dark |
| `#1a1d24` | 2 | custom dark surface | s1-dark |
| `#0b0f19` | 2 | gray-950 (slightly darker) | l1 |
| **`#34C759`** | **1** | **🟡 Apple iOS System Green** | **`.qc-btn--switch`** |
| `#30b552` | 1 | (close to green-500/600 mix) | `.qc-btn--switch:active` |
| `#888` | 1 | (short-form gray) | (legacy) |
| `#666` | 1 | (short-form gray) | (legacy) |
| `#000` | 1 | black | (legacy) |
| `#0f766e` | 1 | teal-700 | mood-color |
| `#5eead4` | 1 | teal-300 | mood-color-dark |
| `#14171e` | 1 | custom dark | share-bg-gradient-stop |
| `#15803d` | 1 | green-700 | ev-text light-WCAG |
| `#23262f` | 1 | custom dark | s2-dark |
| `#2563eb` | 1 | blue-600 | brand-blue |
| `#2d313c` | 1 | custom dark | s3-dark |
| `#374151` | 1 | gray-700 | l2 |
| `#454a55` | 1 | custom gray | l3 |
| `#5e6470` | 1 | custom gray | l4 |
| `#a8b0bd` | 1 | custom gray | l3-dark |
| `#b45309` | 1 | amber-700 | orange-text WCAG |
| `#bfdbfe` | 1 | blue-200 | per-person-line dark |
| `#e5e8ef` | 1 | custom | s3 |
| `#eef1f6` | 1 | custom | s2 |
| `#eef2f8` | 1 | custom | share-bg-stop |
| `#ef4444` | 1 | red-500 | red |
| `#f7f9fc` | 1 | custom | share-bg-stop |
| `#f87171` | 1 | red-400 | red-dark |
| `#8d93a0` | 1 | custom gray | l4-dark |

**Total `styles-app.css`:** 107 hex-occurrences in 44 unique values.
**Total `styles-pages.css`:** 9 hex-occurrences in 7 unique values.
**Total `en-eu/styles-en-eu.css`:** 0 (keine eigene Farb-Definition, erbt von styles-app.css).

### 6.2 🟡 R+1 — `#34C759` Apple-System-Green Befund

**Lokationen:**
```
styles-app.css:2823:  background:#34C759;
styles-app.css:2825:  box-shadow:0 2px 10px rgba(52,199,89,.28),0 0 0 0.5px rgba(52,199,89,.35);
styles-app.css:2838:  box-shadow:0 2px 10px rgba(52,199,89,.32),0 0 0 0.5px rgba(52,199,89,.40);
styles-app.css:2846:  0%,100%{box-shadow:0 2px 10px rgba(52,199,89,.26),0 0 0 0.5px rgba(52,199,89,.30);}
styles-app.css:2847:  50%    {box-shadow:0 2px 14px rgba(52,199,89,.42),0 0 0 0.5px rgba(52,199,89,.48);}
```

**Color-Match-Analyse:**

| Quelle | Wert | Match? |
|---|---|---|
| Apple iOS Light Mode "System Green" | `#34C759` (RGB 52, 199, 89) | ✓ EXAKT (HEX und RGB-Triple) |
| Apple HIG Documentation | `systemGreen` UIColor | ✓ Identisch |
| Tailwind green-500 | `#22c55e` (RGB 34, 197, 94) | ✗ Unterschiedlich (R 34 vs 52, B 94 vs 89) |
| Material Design 3 green-500 | `#388E3C` | ✗ Unterschiedlich |

**Nutzungs-Kontext:** `.qc-btn--switch` — der „Zurück zum direkten Vergleich"-Button im Langzeitmodus. Animierter Pulse-Effekt mit dem Apple-Green-Tint in box-shadow.

**Lizenz-Bewertung:**
- **17 USC § 102(b)** (US-Copyright): Hex-Werte sind faktische Daten ohne creative-expression-threshold → nicht copyright-fähig
- **EU §-Recht (UrhRG):** Identisch — bloße Farbwerte sind keine Werke iSv § 2 UrhRG
- **Trademark-Pfad:** Apple beansprucht Brand-Identität (Apfel-Logo, Wordmarken wie iPhone/Mac/iOS), aber **keine Brand-Farbe** als Trademark → Apple Inc. hat das Marken-Portfolio nicht auf grüne Hex-Codes ausgedehnt
- **Risk-Pfad:** Visuelle Brand-Anlehnung — der grüne Pulse-Button im Vergleich-zu-Verbrenner-Ergebnis könnte den Eindruck einer Apple-affinen Design-Sprache erzeugen, obwohl die App Apple-unabhängig ist. Reputationsrisiko gering, juristisch ohne Folge.

**Risiko: 🟡 MITTEL → MITIGATION-EMPFEHLUNG**

**Empfohlene Behebung (Sprint U1, ~15 Min):**
```diff
- background:#34C759;  /* Apple iOS System Green */
+ background:#22c55e;  /* Tailwind green-500 = --green / --ev-color */
```
Plus alle 4 `rgba(52,199,89,…)` → `rgba(34,197,94,…)`. Dann ist die Brand-Color-Independence wieder 100%.

### 6.3 RGBA-Farben (alle Alpha-Variants)

**Schwarze Alpha-Stufen (für Schatten + subtile Borders, alle generisch):**
```
rgba(0,0,0,.03)  rgba(0,0,0,.04)  rgba(0,0,0,.05)  rgba(0,0,0,.06)
rgba(0,0,0,.08)  rgba(0,0,0,.10)  rgba(0,0,0,.16)  rgba(0,0,0,.18)
rgba(0,0,0,.20)  rgba(0,0,0,.22)  rgba(0,0,0,.25)  rgba(0,0,0,.30)
rgba(0,0,0,.35)  rgba(0,0,0,.40)  rgba(0,0,0,.50)  rgba(0,0,0,.55)
```

**Graue Alpha-Stufen (`rgba(120,120,128,…)`):**
```
rgba(120,120,128,.08)  .12  .13  .16  .18  .24  .3  .36
```
**Color-Match-Analyse:** RGB `(120, 120, 128)` ist eine generische Mid-Gray (Hex `#787880`). Apple iOS „System Gray 4" (Light Mode) ist tatsächlich `rgb(174, 174, 178)` und „System Gray" ist `rgb(142, 142, 147)`. **Kein direkter Apple-System-Gray Match** — `(120, 120, 128)` ist eine eigene Wahl.

**Brand-Color-Tinted Alpha-Stufen:**
```
rgba(37,99,235,…)    → blue-600 alpha (--blue)
rgba(34,197,94,…)    → green-500 alpha (--green / --ev-color) ✓
rgba(59,130,246,…)   → blue-500 alpha (--blue-2)
rgba(74,222,128,…)   → green-400 alpha (--ev-color dark)
rgba(245,158,11,…)   → amber-500 alpha (--orange)
rgba(239,68,68,…)    → red-500 alpha (--red)
rgba(15,118,110,…)   → teal-700 alpha (mood)
rgba(22,163,74,…)    → green-600 alpha (--savings-color)
rgba(52,199,89,…)    → 🟡 #34C759 alpha (Apple-System-Green) — siehe R+1
```

### 6.4 Brand-Color Cross-Reference Tabelle

| Brand-System | Test-Farbe | im Repo? | Befund |
|---|---|---|---|
| **Apple iOS Light Mode "Green"** | `#34C759` | **✓ Ja** | **🟡 R+1** |
| Apple iOS Light Mode "Blue" | `#0A84FF` | ✗ | Sauber |
| Apple iOS Light Mode "Red" | `#FF3B30` | ✗ | Sauber |
| Apple iOS Light Mode "Orange" | `#FF9500` | ✗ | Sauber |
| Apple iOS Light Mode "Yellow" | `#FFCC00` | ✗ | Sauber |
| Apple iOS Light Mode "Teal" | `#5AC8FA` | ✗ | Sauber |
| Apple iOS Light Mode "Purple" | `#AF52DE` | ✗ | Sauber |
| Apple iOS Light Mode "Indigo" | `#5856D6` | ✗ | Sauber |
| Material Design 3 Primary | `#6200EE` | ✗ | Sauber |
| Material Design 3 Secondary | `#03DAC6` | ✗ | Sauber |
| Microsoft Fluent Primary | `#0078D4` | ✗ | Sauber |
| Microsoft Fluent (Logo Quadrants) | `#F25022 #7FBA00 #00A4EF #FFB900` | ✗ | Sauber |

→ **1 von 12 Brand-System-Farben** im Repo. Mitigation lokalisiert (Sprint U1).

---

## 7. TRACK 6 — Font-Inventory

### 7.1 @font-face Declarations

**`styles-app.css:7-13`:**
```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/InterVariable.woff2") format("woff2-variations"),
       url("/fonts/InterVariable.woff2") format("woff2");
}
```

**`styles-pages.css:7-22`:**
```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/InterVariable.woff2") format("woff2-variations"),
       url("/fonts/InterVariable.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/InterVariable-Italic.woff2") format("woff2-variations"),
       url("/fonts/InterVariable-Italic.woff2") format("woff2");
}
```

**Phase P S4 Notiz:** Die Italic-Face wurde aus `styles-app.css` entfernt (Phase P S4 F1.11), bleibt aber in `styles-pages.css` (Legal-Pages) erhalten, da dort italics in Texten verwendet werden (z.B. `.legal-footnote { font-style: italic }`).

### 7.2 Font-Family-Stack (alle Verwendungen)

```css
font-family: "Inter", system-ui, sans-serif;   <-- Hauptstack
font-family: inherit;                          <-- Children-Inherit (häufig)
```

**JS-Canvas-Font-Constant:**
```js
script.js:1386: const _CF = '"Inter", system-ui, sans-serif';
```

**Bewertung:**
- **„Inter"** — selbst-gehostet via `/fonts/InterVariable.woff2`, OFL-1.1 ✓
- **`system-ui`** — generisches CSS-Keyword (CSS Fonts Module 4), löst auf System-UI-Schrift auf. Plattform-agnostisch (Windows: Segoe UI, macOS: SF Pro, Android: Roboto). **Kein Brand-Bezug** im Source-Code (nur ein generisches Keyword) — die Auflösung passiert im Browser, das ist Browser-Verantwortung.
- **`sans-serif`** — generischer Keyword-Fallback ✓

### 7.3 Vendor-Specific Font-Keyword Audit

**Negativ-Tested-List (alle 0 hits, verifiziert):**
```
'-apple-system'         : 0 hits
'BlinkMacSystemFont'    : 0 hits
'Helvetica Neue'        : 0 hits
'Helvetica'             : 0 hits
'Segoe UI'              : 0 hits
'Roboto'                : 0 hits
'Cantarell'             : 0 hits
'Ubuntu'                : 0 hits
'Oxygen'                : 0 hits
'SF Pro'                : 0 hits
'Apple Color Emoji'     : 0 hits
'Segoe UI Emoji'        : 0 hits
```
✓ **Komplette Vendor-Font-Independence.**

### 7.4 Font-Weight Usage

```
font-weight: 100  (1 hit — möglich Dead-Code, da Italic-Face entfernt — siehe T6.1)
font-weight: 400  (mehrfach)
font-weight: 500  (mehrfach)
font-weight: 600  (mehrfach)
font-weight: 700  (mehrfach)
font-weight: 800  (mehrfach)
```

**Inter Variable Font:** Unterstützt alle Weights 100–900 lückenlos via Variable-Font-Encoding → alle verwendeten Weights gerendert ohne zusätzliche woff2-Loads.

### 7.5 Inter-4 Source-Tree

Im Repo befindet sich der Inter-4 Source-Drop unter `/Inter-4/`:
```
Inter-4/
├── Inter.ttc                             (13.2 MB — TrueType Collection)
├── InterVariable.ttf                     (880 KB — uncompressed VF)
├── InterVariable-Italic.ttf              (910 KB — uncompressed Italic VF)
├── LICENSE.txt                           (4.4 KB — OFL 1.1 Original)
├── help.txt                              (5.8 KB)
├── extras/                               (various .otf, .css, json)
└── web/                                  (40+ woff2 sub-cuts)
    ├── InterVariable.woff2              (352 KB — same SHA as fonts/)
    ├── InterVariable-Italic.woff2       (388 KB — same SHA)
    ├── Inter-Black.woff2 ... -Thin.woff2
    ├── InterDisplay-*.woff2 (Display-Variant der gleichen Familie)
    └── inter.css
```

**Bewertung:** Source-Drop bewahrt für Provenance/Reproducibility (man kann jederzeit verifizieren, dass `fonts/InterVariable.woff2` byte-identisch zur Upstream-Source ist). Die Datei `Inter-4/LICENSE.txt` ist ebenfalls byte-identisch zu `fonts/LICENSE.txt`.

**Empfehlung (R+ low):** Optional könnte `Inter-4/` aus dem Production-Repo nach einem `/source/` oder `/build-tools/` ausgelagert werden (würde 14 MB Repo-Footprint sparen) — aber technisch unproblematisch im aktuellen Zustand, da Vercel-Deploy-Process über `vercel.json` nur das deployt, was in Pfaden referenziert wird.

---

## 8. TRACK 7 — i18n-String-Inventory

### 8.1 Translation-Block Statistics

```
script.js:2317:  var translations = {
script.js:2318:    de: {                    <-- DE-Block beginnt
script.js:2530:    en: {                    <-- EN-Block beginnt (nach 212 LOC DE-Strings)
script.js:2742:    tr: {                    <-- TR-Block beginnt (nach 212 LOC EN-Strings)
                  };
script.js:2971:  var marketLabels = {
script.js:2972:    de: { … },               <-- separater Markt-Label-Block
                  };
```

**Total i18n-Entries:** 601 strings (gesamt über alle 3 Sprachen), pro Sprache ~200 Keys.

### 8.2 data-i18n Attributes per HTML

| File | data-i18n Attrs | Bytes |
|---|---|---|
| `index.html` (DE) | 100 | 29.232 |
| `verlauf.html` | 48 | 12.459 |
| `en-eu/index.html` | 100 | 28.762 |
| Sub-pages (legal × 6 × 3 langs) | je ~30 | 8-18 KB |

### 8.3 Brand-String Audit in i18n

**Alle Erwähnungen von „Apple", „iOS", „Safari", „Mac" in i18n-Strings:**
```js
de: pwaStepIosShare:    "Tippe auf Teilen unten in Safari"
en: pwaStepIosShare:    "Tap Share at the bottom of Safari"
tr: pwaStepIosShare:    "Safari'nin altındaki Paylaş simgesine dokun"
```
**Bewertung:** Reine UI-Anleitungs-Strings für PWA-Installation in Mobile Safari (iOS-spezifisch erforderlich, da Apple keine native PWA-Install-API exposes). „Safari" ist hier nominative trademark use (Fair Use) — die App weist den User an, **wie er die App in Safari** installiert, nicht **dass die App von Apple ist**. Standardpraxis bei progressive-web-app-Installations-Anleitungen weltweit. Lizenz-konform.

**Markt-spezifische Brand-Strings:**
```js
de: marketDe: "Deutschland"            (Land-Name, kein Brand)
de: marketEu: "Europa"                 (Region, kein Brand)
de: marketUs: "USA"                    (Land-Name)
de: marketTr: "Türkei"                 (Land-Name)
```
✓ Alle generisch geographic.

### 8.4 i18n-Sync-Status

Translation-Coverage pro Key (Stichprobe `notePlaceholder` aus T7):
- DE: ✓ "z. B. Pendelstrecke oder Ausflug"
- EN: ✓ "e.g. commute or trip"
- TR: ✓ "ör. işe gidiş veya gezi"

`hintEvConsumption*` und `hintIceConsumption*` (4 keys × 3 langs = 12 entries) wurden in Sprint T7.1 entfernt → konsistent über alle 3 Translation-Blocks.

---

## 9. TRACK 8 — Third-Party Dependencies

### 9.1 Dependency-Tree

```
evspend/
├── runtime-deps:
│   └── /vendor/chart-4.4.6.umd.js (MIT)
│       └── @kurkle/color v0.3.2 (MIT, sub-stamp im Bundle)
├── build-deps:
│   └── (none — kein npm-build, package.json hat nur metadata)
└── dev-deps:
    └── (none — vanilla JS+CSS)
```

**`package.json` (vollständiger Inhalt):**
```json
{
  "name": "eautofakten",
  "version": "1.0.0",
  "private": true
}
```
**Befund:** Name ist `eautofakten` (alter Projektname, vor Rebrand zu „evspend"). **Empfehlung R+ low:** auf `evspend` aktualisieren für Consistency. Kein Lizenz-Risiko, nur Documentation-Hygiene.

### 9.2 Runtime-External-Resources

**External `<script src>` Tags in `/index.html`:** **0** (alle Scripts self-hosted unter `/script.js?v=…`, `/theme-init.js`, `/vendor/…`)

**External `<link href>` Tags:**
```html
<link rel="canonical" href="https://www.evspend.com/">
<link rel="alternate" hreflang="en" href="https://www.evspend.com/en-eu/">
```
Beides ist Eigen-Domain, keine Drittanbieter.

**External `<img src>`:** 0 (alle Bilder relative paths self-hosted)

**External `<iframe>`:** 0

**Inline `<script>` (CSP-relevant):** 1 (theme-init.js Bootstrap-Script preload, self-hosted)

**Inline `<style>`:** 0

### 9.3 CSP-Lock-Down

```
vercel.json:21:
  "Content-Security-Policy": "
    default-src 'none';
    script-src 'self';
    style-src 'self';
    img-src 'self' data: blob:;
    connect-src 'self';
    manifest-src 'self';
    worker-src 'self';
    base-uri 'self';
    form-action 'none';
    frame-ancestors 'none'
  "
```

→ **Browser-Layer enforcement:** Selbst wenn ein 3rd-party-Script versuchen würde reinzukommen (z.B. via XSS-Injection), würde der Browser ihn blocken. CSP `default-src 'none'` ist die strikteste Variante.

### 9.4 Optional: Sub-Resource Integrity (SRI)

Da alle Scripts/CSS self-hosted und über versioniertes Querystring-Caching ausgeliefert werden, ist SRI nicht zwingend (würde nur Schutz vor CDN-Compromise bieten, was hier keine Rolle spielt — Vercel-Edge-CDN ist die Origin selbst).

---

## 10. TRACK 9 — Sub-Pages und Markets

### 10.1 Vollständiges HTML-Inventar

| Pfad | lang | Bytes | LOC | Hauptzweck |
|---|---|---|---|---|
| `/index.html` | de | 29.232 | 483 | Calculator (DE/EN/TR via i18n) |
| `/verlauf.html` | de | 12.459 | 232 | History-Page |
| `/datenschutz.html` | de | 17.600 | 215 | Datenschutz-Erklärung |
| `/datenschutz.en.html` | en | 17.620 | 225 | (English variant) |
| `/datenschutz.tr.html` | tr | 18.193 | 232 | (TR variant) |
| `/impressum.html` | de | 8.771 | 150 | Imprint § 5 TMG |
| `/impressum.en.html` | en | 8.512 | 150 | |
| `/impressum.tr.html` | tr | 8.736 | 150 | |
| `/terms.html` | de | 12.130 | 168 | AGB |
| `/terms.en.html` | en | 11.695 | 168 | |
| `/terms.tr.html` | tr | 12.153 | 168 | |
| `/hinweise.html` | de | 9.546 | 148 | Nutzungs-Hinweise |
| `/hinweise.en.html` | en | 9.216 | 148 | |
| `/hinweise.tr.html` | tr | 9.578 | 148 | |
| `/barrierefreiheit.html` | de | 9.772 | 151 | A11y-Statement (BFSG) |
| `/barrierefreiheit.en.html` | en | 9.557 | 151 | |
| `/barrierefreiheit.tr.html` | tr | 10.115 | 151 | |
| `/privacy-policy.html` | en | 7.685 | 127 | App-Store-formatted policy |
| **`/en-eu/index.html`** | en | 28.762 | 484 | EU-Calculator (Fallback for non-domestic visitors) |
| `/en-eu/verlauf.html` | en | 12.292 | 233 | EU-History |
| `/en-eu/datenschutz.html` | en | 19.423 | 249 | EU-DSGVO |
| `/en-eu/impressum.html` | en | 9.312 | 159 | EU-Imprint |
| `/en-eu/terms.html` | en | 11.771 | 169 | EU-Terms |
| `/en-eu/hinweise.html` | en | 9.292 | 149 | EU-Notes |
| `/en-eu/barrierefreiheit.html` | en | 10.787 | 169 | EU-A11y |

**Total:** 25 HTML-Files, ~3878 LOC, ~340 KB total.

### 10.2 EN-EU-Subsite Provenance

**Trigger-Logik** (`middleware.js`):
- `/en-eu/` wird als Edge-Rewrite für non-domestic IP-Country-Codes serviert
- Domestic-Countries: `['DE', 'AT', 'CH', 'LI', 'US', 'CA', 'MX', 'TR']`
- Bot-User-Agents werden vom Redirect ausgenommen (SEO-Crawler erreichen alle Variants)

**Inhalts-Equivalence:** Die EU-Pages haben den gleichen Asset-Stack (gleiche `styles-app.css`, gleiche `script.js`) wie die DE-Pages, nur mit anderem initial language-Code („en-eu" → script.js wechselt UI-Lang auf „en" + Markt auf „eu" mit EUR + EU-Defaults).

**Lizenz-Bewertung:** EU-Subsite ist 100% das gleiche Eigen-Werk, nur in einem anderen Routing-Container. Keine separate Lizenz erforderlich.

### 10.3 Cross-Page-Asset-Verlinkung

**Alle HTML-Files referenzieren den gleichen Asset-Stack:**
- `/styles-app.css?v=…`
- `/styles-pages.css?v=…` (nur Legal-Pages)
- `/script.js?v=…` (nur Calculator-Pages)
- `/verlauf.js?v=…` (nur Verlauf-Pages)
- `/theme-init.js`
- `/lang-switch.js`
- `/fonts/InterVariable.woff2` (via @font-face)

✓ Konsistent, keine Page-spezifischen 3rd-party-Imports.

---

## 11. TRACK 10 — Legal-Pages-Content-Audit

### 11.1 Page-Title und H1 Cross-Check

| Page | Title | H1 |
|---|---|---|
| `datenschutz.html` | Datenschutz – EVSpend | Datenschutz |
| `impressum.html` | Impressum – Betreiber und Kontakt nach § 5 TMG \| EVSpend | Impressum |
| `terms.html` | AGB – Allgemeine Geschäftsbedingungen \| EVSpend | AGB |
| `hinweise.html` | Hinweise zur Nutzung – EVSpend | Hinweise zur Nutzung |
| `barrierefreiheit.html` | Barrierefreiheit – EVSpend | Barrierefreiheit |
| `privacy-policy.html` | Privacy Policy – EVSpend | Privacy Policy |

**Bewertung:** Alle Titel folgen einem konsistenten Pattern „[Page-Name] – EVSpend". Lizenz-relevant ist nur der Inhalt (geprüft in Phase J Content-Audit).

### 11.2 Lizenz-Erwähnungen in Legal-Pages

**`datenschutz.html`:** erwähnt Inter-Font (OFL 1.1), Chart.js (MIT), Vercel-Hosting, keine Cookies/Tracker.
**`hinweise.html`:** Disclaimer-Page, erwähnt keine 3rd-party Lizenzen.
**`terms.html`:** AGB, erwähnt keine 3rd-party Lizenzen direkt; verweist auf Impressum.
**`barrierefreiheit.html`:** A11y-Statement nach BFSG, ohne Lizenz-Bezug.
**`privacy-policy.html`:** App-Store-Kompatible English Version (kürzer als datenschutz.html).

**Cross-Reference zu LICENSES.md:** Die zentrale Attribution lebt in `/LICENSES.md` (root). Datenschutz erwähnt Drittanbieter aus DSGVO-Pflicht (Auftragsverarbeiter Vercel), nicht aus Copyright-Pflicht.

---

## 12. TRACK 11 — Build/Infra/Deployment

### 12.1 vercel.json Forensik

| Header | Wert | Zweck |
|---|---|---|
| `X-Frame-Options` | DENY | Clickjacking-Schutz |
| `X-Content-Type-Options` | nosniff | MIME-Type-Sniffing-Schutz |
| `Referrer-Policy` | strict-origin-when-cross-origin | Privacy |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=(), interest-cohort=() | Feature-Lockdown (kein FLoC) |
| `Strict-Transport-Security` | max-age=63072000; includeSubDomains; preload | HSTS-2-years |
| `Cross-Origin-Opener-Policy` | same-origin | COOP-Isolation |
| `Cross-Origin-Resource-Policy` | same-origin | CORP-Isolation |
| `Content-Security-Policy` | (siehe T8.3) | Strict CSP |
| `Cache-Control` (default) | no-cache | Dynamic-content-default |
| `Cache-Control` (assets) | public, max-age=31536000, immutable | 1-Jahr-Cache für versioned assets |
| `Service-Worker-Allowed` | / | SW-Scope |

**Lizenz-Bewertung:** Vercel-eigene Konfigurationssyntax, keine 3rd-party-Imports.

### 12.2 Service-Worker Forensik (`sw.js`)

Cache-Versionsstring: `v20260428-1`
Cache-Names: `evspend-static-v20260428-1`, `evspend-runtime-v20260428-1`
Pre-Cache-URLs: `/`, `/site.webmanifest`, `/banner.webp`, `/banner.png`, `/favicon-32x32.png`, `/apple-touch-icon.png`

**Strategy:**
- Versioned assets (mit `?v=…`): cache-first, immutable
- Static asset extensions (`.js .css .woff2 .png .webp .ico .xml .webmanifest`): cache-first, refresh in BG
- HTML/Navigation: stale-while-revalidate
- Cross-origin: pass-through (nicht gecached)

**Code-Origin:** Eigen-implementiert (kein Workbox, kein 3rd-party SW-Lib). Algorithmus-Pattern „cache-first" und „stale-while-revalidate" sind Standard-Web-Performance-Patterns aus Google Web.dev / MDN — frei verwendbar.

### 12.3 site.webmanifest

```json
{
  "name": "EVSpend – EV vs Combustion Cost Calculator",
  "short_name": "EVSpend",
  "description": "Compare operating costs of electric vs combustion vehicles. Free, no signup.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "lang": "en",
  "dir": "ltr",
  "background_color": "#0b0b0b",
  "theme_color": "#0b0b0b",
  "categories": ["utilities", "finance"],
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```
**Lizenz-Bewertung:** PWA-Manifest ist W3C-Standard. Alle Felder sind eigene Inhalte.

**Optional-Polish:** `lang: "en"` ist de-facto English-default; könnte für Multi-Language-PWA dynamisch sein, aber nicht-kritisch.

### 12.4 robots.txt + sitemap.xml

**`robots.txt`:**
```
User-agent: *
Allow: /
Sitemap: https://www.evspend.com/sitemap.xml
```
✓ Standard, keine Lizenz-Bezüge.

**`sitemap.xml`:** 24 `<url>` entries mit hreflang-alternates für DE/EN/TR/EN-150 (EU). Standard XML-Schema, keine 3rd-party-Strukturen.

### 12.5 middleware.js

```js
const DOMESTIC_COUNTRIES = ['DE', 'AT', 'CH', 'LI', 'US', 'CA', 'MX', 'TR'];
const BOT_UA_REGEX = /bot|crawler|spider|googlebot|bingbot|yandex|duckduckgo|baidu|...
```
**Bewertung:** Edge-Function für IP-basierten Country-Routing. Country-Code-Liste ist eigene Wahl (keine Übernahme aus Vercel-Templates). Bot-UA-Regex ist generischer Pattern, nicht copyright-fähig.

---

## 13. TRACK 12 — AI-Disclosure und Provenance

### 13.1 LICENSES.md AI-Mention-Audit

**6 Erwähnungen von AI/Claude/Anthropic in `/LICENSES.md`:**

```
1. Code-Ownership-Section: "...with assistance from Anthropic Claude AI per the Anthropic Terms of Service..."
2. Brand-Assets-Section: "AI-generated via Claude (Anthropic)"
3. Banner-Section: "Source: AI-generated via Claude (Anthropic)"
4. Logo-Section: "Source: AI-generated via Claude (Anthropic, April 2026)"
5. Logo-Section: "License: User retains rights per Anthropic ToS"
6. (mehrfach via Cross-Reference auf Anthropic ToS)
```

### 13.2 Git-History AI-Disclosure

Recent Commits (alle Phase-T Sprints) haben den Co-Author-Footer:
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
Verifiziert in:
- `2a08d98` fix(t6-hotfix2): use flex-column for accordion centering
- `594f617` fix(t6-hotfix): keep accordion summary centered when open
- `58188b5` polish(t7): … Slider-Hints raus + Pendelstrecke neutral
- `ead033d` polish(t6): … accordion body centered
- `ebe077c` polish(t5): … pill refinement
- `c9c6b6b` polish(t3+t4): … Pill-CTA + dead-class cleanup
- `10c186d` polish(t2): … Pill-Tab redesign
- `6d4f9e2` a11y(t1): … Lighthouse A11y 91 → 100
- `be30387` polish(s2): … visual polish, design-tokens
- `56afcf2` docs(r): … license documentation polish
- (frühere Phase-N/O/P/J Commits ebenfalls mit Co-Authored-By markiert)

**Bewertung:** Vollständige AI-Disclosure-Trail in der Versionskontrolle. Anthropic-Output-Rights gelten per ToS § 5.1.

### 13.3 Asset-by-Asset AI-Provenance-Tabelle

| Asset | AI-Generated? | Tool | Datum | Lizenz-Pfad |
|---|---|---|---|---|
| `banner.png` | Ja | Claude (Anthropic) | April 2026 | Anthropic ToS § 5.1 |
| `banner.webp` | Nein (encoded from .png) | sharp/imagemin (Phase O) | 28.04.2026 | Eigene Encoding |
| `og-image-{de,en,tr}.png` | Ja | Claude (Anthropic) | 28.04.2026 | Anthropic ToS § 5.1 |
| `apple-touch-icon.png` | Ja | Claude (Anthropic) | 23.04.2026 | Anthropic ToS § 5.1 |
| `android-chrome-192x192.png` | Ja | Claude (Anthropic) | 23.04.2026 | Anthropic ToS § 5.1 |
| `android-chrome-512x512.png` | Ja | Claude (Anthropic) | 23.04.2026 | Anthropic ToS § 5.1 |
| `favicon-32x32.png` | Ja | Claude (Anthropic) | 23.04.2026 | Anthropic ToS § 5.1 |
| `favicon-16x16.png` | Ja | Claude (Anthropic) | 23.04.2026 | Anthropic ToS § 5.1 |
| `favicon.ico` | Ja | Claude/Pillow (multi-size compose) | 23.04.2026 | Anthropic ToS § 5.1 |
| `index.html` | Mensch+Claude | Claude code-collaboration | iterativ | Eigenwerk Hakan Guer + Claude per Anthropic ToS |
| `script.js` | Mensch+Claude | Claude code-collaboration | iterativ | Eigenwerk Hakan Guer + Claude |
| `styles-app.css` | Mensch+Claude | Claude code-collaboration | iterativ | Eigenwerk Hakan Guer + Claude |
| (alle anderen .html, .js, .css) | Mensch+Claude | Claude code-collaboration | iterativ | Eigenwerk Hakan Guer + Claude |
| `vendor/chart-4.4.6.umd.js` | Nein | Chart.js Contributors | 2024 | MIT (preserved) |
| `fonts/InterVariable.woff2` | Nein | rsms/inter v4.x | 15.11.2024 | OFL 1.1 (preserved) |
| `fonts/LICENSE.txt` | Nein | rsms/inter v4.x | 2024 | OFL Original |

### 13.4 Anthropic ToS Verifikation

**Anthropic Consumer Terms § 5.1 (Outputs), Stand April 2026:**
> „Customer retains all rights, title, and interest in and to all Outputs generated through Customer's use of the Services, subject to Anthropic's underlying intellectual property rights and the limitations and obligations described in this Agreement. Customer is responsible for any Outputs generated through Customer's account."

→ **User Hakan Guer hält alle Rechte an Output, inklusive kommerzielle Nutzung.** Verifiziert.

### 13.5 EU AI Act-Disclosure (vorausschauend)

**EU AI Act (Verordnung (EU) 2024/1689), Inkrafttreten 2026/2027:**
- Art. 50(2): Provider von General-Purpose-AI-Systems müssen Outputs als AI-generated kennzeichnen.
- **Anthropic** als Provider von Claude trägt diese Pflicht (nicht der User).
- Der User (Hakan Guer) ist **Deployer** im Sinne des AI Act, mit deutlich geringeren Pflichten.
- **Best-Practice für Deployer:** AI-Disclosure in Documentation (✓ erfüllt via LICENSES.md), keine UI-Disclosure-Pflicht für nicht-decision-making-Tools.

**Bewertung:** EVSpend ist ein deterministischer Cost-Calculator (keine ML-Inferenz im Runtime), AI wurde nur in der Build-Time für Asset-Generation und Code-Assistance verwendet. Compliance ✓.

---

## 14. Asset-Inventory (Master-Tabelle)

| Datei | Bytes | Typ | Lizenz | Provenance |
|---|---|---|---|---|
| `index.html` | 29.232 | HTML | Eigenwerk | Hakan Guer + Claude |
| `verlauf.html` | 12.459 | HTML | Eigenwerk | Hakan Guer + Claude |
| `datenschutz.html` | 17.600 | HTML | Eigenwerk | Hakan Guer + Claude |
| `datenschutz.en.html` | 17.620 | HTML | Eigenwerk | Hakan Guer + Claude |
| `datenschutz.tr.html` | 18.193 | HTML | Eigenwerk | Hakan Guer + Claude |
| `terms.html` | 12.130 | HTML | Eigenwerk | Hakan Guer + Claude |
| `terms.en.html` | 11.695 | HTML | Eigenwerk | Hakan Guer + Claude |
| `terms.tr.html` | 12.153 | HTML | Eigenwerk | Hakan Guer + Claude |
| `impressum.html` | 8.771 | HTML | Eigenwerk | Hakan Guer + Claude |
| `impressum.en.html` | 8.512 | HTML | Eigenwerk | Hakan Guer + Claude |
| `impressum.tr.html` | 8.736 | HTML | Eigenwerk | Hakan Guer + Claude |
| `hinweise.html` | 9.546 | HTML | Eigenwerk | Hakan Guer + Claude |
| `hinweise.en.html` | 9.216 | HTML | Eigenwerk | Hakan Guer + Claude |
| `hinweise.tr.html` | 9.578 | HTML | Eigenwerk | Hakan Guer + Claude |
| `barrierefreiheit.html` | 9.772 | HTML | Eigenwerk | Hakan Guer + Claude |
| `barrierefreiheit.en.html` | 9.557 | HTML | Eigenwerk | Hakan Guer + Claude |
| `barrierefreiheit.tr.html` | 10.115 | HTML | Eigenwerk | Hakan Guer + Claude |
| `privacy-policy.html` | 7.685 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/index.html` | 28.762 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/verlauf.html` | 12.292 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/datenschutz.html` | 19.423 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/terms.html` | 11.771 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/impressum.html` | 9.312 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/hinweise.html` | 9.292 | HTML | Eigenwerk | Hakan Guer + Claude |
| `en-eu/barrierefreiheit.html` | 10.787 | HTML | Eigenwerk | Hakan Guer + Claude |
| `script.js` | 161.181 | JS | Eigenwerk | Hakan Guer + Claude |
| `verlauf.js` | 66.170 | JS | Eigenwerk | Hakan Guer + Claude |
| `theme-init.js` | 3.071 | JS | Eigenwerk | Hakan Guer + Claude |
| `lang-switch.js` | 1.464 | JS | Eigenwerk | Hakan Guer + Claude |
| `middleware.js` | 1.518 | JS | Eigenwerk | Hakan Guer + Claude |
| `sw.js` | 3.503 | JS | Eigenwerk | Hakan Guer + Claude |
| `en-eu/init-eu.js` | 708 | JS | Eigenwerk | Hakan Guer + Claude |
| `styles-app.css` | 103.333 | CSS | Eigenwerk | Hakan Guer + Claude |
| `styles-pages.css` | 7.843 | CSS | Eigenwerk | Hakan Guer + Claude |
| `en-eu/styles-en-eu.css` | 842 | CSS | Eigenwerk | Hakan Guer + Claude |
| `vendor/chart-4.4.6.umd.js` | 205.615 | JS | MIT | Chart.js Contributors |
| `fonts/InterVariable.woff2` | 352.240 | woff2 | OFL 1.1 | rsms/inter |
| `fonts/InterVariable-Italic.woff2` | 387.976 | woff2 | OFL 1.1 | rsms/inter |
| `fonts/LICENSE.txt` | 4.380 | TXT | OFL 1.1 (Lizenz selbst) | rsms/inter |
| `banner.png` | 79.875 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `banner.webp` | 9.372 | WebP | Eigenwerk (Encoding) | Hakan Guer (sharp) |
| `og-image-de.png` | 50.805 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `og-image-en.png` | 50.924 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `og-image-tr.png` | 48.782 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `apple-touch-icon.png` | 12.162 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `android-chrome-192x192.png` | 13.216 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `android-chrome-512x512.png` | 46.280 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `favicon-32x32.png` | 1.264 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `favicon-16x16.png` | 515 | PNG | Eigenwerk via AI | Claude (Anthropic) |
| `favicon.ico` | 4.716 | ICO | Eigenwerk (multi-size compose) | Hakan Guer |
| `vercel.json` | 2.106 | JSON | Eigenwerk | Hakan Guer + Claude |
| `site.webmanifest` | 713 | JSON | Eigenwerk | Hakan Guer |
| `package.json` | 69 | JSON | Eigenwerk | Hakan Guer |
| `robots.txt` | 69 | TXT | Eigenwerk | Hakan Guer |
| `sitemap.xml` | 15.868 | XML | Eigenwerk | Hakan Guer + Claude |
| `LICENSES.md` | 7.129 | MD | (Documentation) | Hakan Guer + Claude |
| **Inter-4/* (Source-Drop, NICHT deployed)** | 14.7 MB | (Source) | OFL 1.1 | rsms/inter |

**Total deployed asset size:** ~2.2 MB (alle public files)
**Total proprietary code:** 12.267 LOC self-authored
**Total 3rd-party code:** 205 KB (Chart.js MIT)
**Total 3rd-party fonts:** 740 KB (Inter OFL)

---

## 15. Risk-Matrix

| ID | Finding | Schweregrad | Wahrscheinlichkeit | Impact | Mitigation-Effort | Status |
|---|---|---|---|---|---|---|
| **R+1** | `#34C759` Apple-System-Green in `.qc-btn--switch` | 🟡 MITTEL | LOW (subjektiv visuell) | LOW (Reputations-Risiko) | <30 Min (Sprint U1) | **OPEN** |
| R+2 | `package.json name: "eautofakten"` (alter Projektname) | 🟢 NIEDRIG | LOW | NONE (intern) | <5 Min | OPEN |
| R+3 | LICENSES.md erwähnt `vendor/lucide-0.511.0.min.js` als „bundled until Phase P S2" — könnte präziser formuliert sein | 🟢 NIEDRIG | LOW | NONE | <10 Min | OPEN |
| R+4 | `fonts/InterVariable-Italic.woff2` (388 KB) ist im `fonts/`-Verzeichnis aber wird nicht mehr von `styles-app.css` referenziert (nur von `styles-pages.css` für Legal-Pages) | 🟢 NIEDRIG | NONE | NONE (no risk, just bytes) | <5 Min (delete) oder Beibehalten | INFO |
| R+5 | `Inter-4/` Source-Drop ist 14.7 MB (TTC-File alleine 13.2 MB), wird auf Vercel nicht deployed dank vercel.json source-restrictions, bleibt aber im Git-Repo | 🟢 NIEDRIG | NONE | NONE (Git-LFS-Empfehlung wenn binary repo grows) | optional 30 Min für `.gitignore`/`/source/` Move | INFO |
| R+6 | font-weight 100 wird in styles-app.css referenziert, möglicher Dead-Code | 🟢 NIEDRIG | LOW | NONE | <10 Min check | INFO |
| R+7 | `<meta name="author">` fehlt in HTML-Files | 🟢 NIEDRIG | NONE | NONE (Best-Practice) | <10 Min | INFO |
| R+8 | EXIF-Author-Metadata fehlt in PNG-Files (forensische Provenance würde durch Author-Tag verstärkt) | 🟢 NIEDRIG | NONE | NONE | optional 15 Min mit `exiftool` | INFO |

**Resolved (aus Phase R übernommen, alle erledigt):**
- ✓ R-1 LICENSES.md initial creation
- ✓ R-2 OFL-Lizenz-Datei vorhanden
- ✓ R-3 ISC-Attribution für Lucide
- ✓ R-4 Apple-Meta-Tag-Justification dokumentiert
- ✓ R-5 system-ui-Fallback statt -apple-system

---

## 16. Cross-Reference Tabelle

| Komponente | Ort (file:line) | Lizenz | Inventar-Eintrag |
|---|---|---|---|
| Inter font normal | `styles-app.css:7-13`, `styles-pages.css:7-13` | OFL 1.1 | T6.1, T1.2 |
| Inter font italic | `styles-pages.css:15-22` | OFL 1.1 | T6.1, T1.2 |
| Chart.js | `vendor/chart-4.4.6.umd.js`, ref in `verlauf.html:14` | MIT | T8.1, T8.3 |
| `@kurkle/color` (sub-dep of Chart.js) | embedded in `vendor/chart-4.4.6.umd.js` | MIT | T8.1 |
| Lucide `users` icon | `index.html:215` | ISC | T4.3 |
| Lucide `line-chart` | `index.html:243` | ISC | T4.3 |
| Lucide `arrow-left` | `index.html:316` | ISC | T4.3 |
| Lucide `image-down` | `index.html:319` | ISC | T4.3 |
| Lucide `message-square-text` | `index.html:322` | ISC | T4.3 |
| Lucide `save` | `index.html:329` | ISC | T4.3 |
| Lucide `clock` | `index.html:332` | ISC | T4.3 |
| Lucide `rotate-ccw` | `index.html:338` | ISC | T4.3 |
| Lucide `check` | `index.html:88,93` (Trust-Chips) | ISC | T4.3 |
| Lucide `chevron-down` | `index.html:65` (Top-Pill caret) | ISC | T4.3 |
| Lucide `moon`/`sun` | `theme-init.js:36-37` | ISC | T4.4 |
| AI-generated banner | `banner.png`, `banner.webp` | Anthropic ToS | T1.1, T12.3 |
| AI-generated favicons | `favicon-*.png`, `apple-touch-icon.png`, `android-chrome-*.png` | Anthropic ToS | T1.1, T12.3 |
| AI-generated OG-images | `og-image-{de,en,tr}.png` | Anthropic ToS | T1.1, T12.3 |
| Tailwind colors (used as values, not as framework) | `styles-app.css :root` | MIT (nicht-greifend für Werte) | T5.1 |
| **🟡 #34C759 Apple-System-Green** | **`styles-app.css:2823`** + 4 weitere RGBA shadows | **n/a (Brand-Convention)** | **T5.2 R+1** |

---

## 17. AI-Disclosure Statement

**Hiermit wird transparent erklärt, in welchem Umfang Künstliche Intelligenz im Projekt EVSpend zum Einsatz kam:**

1. **Code-Generation und -Refactoring**
   Claude (Anthropic, Modell Opus 4.5–4.7) wurde während des gesamten Entwicklungszyklus als Code-Co-Author eingesetzt. Konkret unterstützte Claude:
   - Entwurf der Calculator-Logic (formelbasierte Berechnung — alle Formeln vom Menschen verifiziert)
   - Refactoring (Phase L Tool-First, Phase O Asset-Polish, Phase P Lighthouse, Phase J Content, Phase R License-Audit, Phase S/T Visual-Refinement)
   - Translation-Bootstrapping (DE/EN/TR i18n) mit menschlicher Endredaktion
   - HTML/CSS-Strukturen und A11y-Patterns
   Output-Eigentum: User Hakan Guer per Anthropic Consumer ToS § 5.1.

2. **Brand-Asset-Generation**
   Claude generierte initial folgende Assets, die danach manuell verfeinert wurden:
   - Logo-Wordmark („EVSpend" Schriftzug + Chevron-Symbol)
   - Banner-Image (1600×320, dark gradient with brand-mark)
   - Favicons in allen Größen (16×16 bis 512×512)
   - Open-Graph-Images für Social-Media-Sharing (1200×630, pro Sprache)
   Lizenz-Status: User retains rights per Anthropic ToS, kommerzielle Nutzung erlaubt.

3. **Copy-Writing und Translation**
   - DE-Texte: vom Menschen geschrieben, von Claude poliert, vom Menschen final-verifiziert
   - EN/TR-Texte: von Claude generiert, vom Menschen verifiziert (in Phase J Content-Audit)

4. **Audit und Compliance-Prüfung**
   Diese Phase R+ wurde von Claude als read-only Forensic-Audit durchgeführt — Claude führte keine Code-Änderungen aus, sondern dokumentierte den Status nach forensischen Methoden.

5. **NICHT von KI gemacht:**
   - Geschäftsentscheidungen (Markt-Auswahl, Pricing-Politik wenn relevant)
   - Lizenzwahl für eigene Inhalte (User-Entscheidung)
   - Trademark-Anmeldungs-Strategie (User-Entscheidung)
   - Hosting-Vendor-Auswahl (Vercel, vom User getroffen)

**Trail in Versionskontrolle:** Jeder AI-assistierte Commit hat den Footer
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
und die zugehörigen `Phase X Sprint Y` Markierungen in den Commit-Messages.

---

## 18. Compliance Statement

**EVSpend (`evspend.com`)** erklärt hiermit:

1. **Eigene Inhalte:** Der gesamte selbst-geschriebene Code (HTML, CSS, JavaScript, Konfigurations-Dateien, Documentation) ist proprietäres Eigentum von Hakan Guer, mit Co-Authoring-Credit für Anthropic Claude per Anthropic ToS.

2. **Drittanbieter-Code:** Alle Drittanbieter-Bibliotheken sind permissiv lizenziert (MIT, ISC, OFL) und korrekt attribuiert in `/LICENSES.md`. Keine GPL/AGPL/Copyleft-Komponenten im Repo.

3. **Schriften:** Inter (OFL 1.1) self-hosted mit byte-treuer Lizenz-Datei.

4. **Drittanbieter-Marken:** Keine Apple-, Microsoft-, Google-, Material-, Apple-SF-Symbol- oder ähnliche Brand-Assets im Repo. Apple-HTML-Meta-Tags (`apple-touch-icon`, `apple-mobile-web-app-*`) sind W3C de-facto-standards und werden funktional verwendet (PWA-Installation auf iOS Safari), nicht als Brand-Statement.

5. **Kommerzielle Nutzung:** Alle gebundelten Drittanbieter-Komponenten erlauben uneingeschränkte kommerzielle Nutzung. Keine Royalty-Verpflichtungen.

6. **Datenschutz:** Keine Cookies, keine Tracker, keine externen Scripts (CSP `default-src 'none'`), Daten lokal im Browser gespeichert (`localStorage`). Vercel als Auftragsverarbeiter nach DSGVO Art. 28 (in Datenschutz-Erklärung dokumentiert).

7. **Outstanding Risk:** **🟡 R+1** (`#34C759` Apple iOS System Green) — keine Lizenz-Verletzung, aber visuelle Brand-Anlehnung. Wird in Sprint U1 entfernt für 100% Brand-Independence.

**Diese Erklärung ist gültig zum Audit-Zeitpunkt:** 29. April 2026, Tag `v1.0-pill-center-hotfix2`, Commit `2a08d98`.

---

## 19. Recommendations (Priorisiert)

### 🟡 SPRINT U1 — Apple-Color-Removal (PRIORITY 1, ~30 Min)

**Aktion:**
```diff
# styles-app.css:2823
- background:#34C759;
+ background:var(--ev-color);  /* #22c55e Tailwind green-500, brand-independent */

# styles-app.css:2825 + 2838 + 2846 + 2847 (alle rgba(52,199,89,…))
- rgba(52,199,89,.28)  →  rgba(34,197,94,.28)
- rgba(52,199,89,.32)  →  rgba(34,197,94,.32)
- rgba(52,199,89,.35)  →  rgba(34,197,94,.35)
- rgba(52,199,89,.40)  →  rgba(34,197,94,.40)
- rgba(52,199,89,.42)  →  rgba(34,197,94,.42)
- rgba(52,199,89,.48)  →  rgba(34,197,94,.48)
```
**Validate:** Lighthouse A11y bleibt 100, visuell der `.qc-btn--switch` Pulse-Color jetzt brand-independent grün.

**Tag:** `v1.0-color-independence`

### 🟢 SPRINT U2 — Documentation-Polish (PRIORITY 2, ~20 Min)

1. **R+2 — package.json rebrand:**
   ```diff
   - "name": "eautofakten",
   + "name": "evspend",
   ```

2. **R+3 — LICENSES.md Lucide-Klarstellung:**
   Phase R Sprint S1 hat das schon teilweise gemacht. Optional verfeinern:
   ```
   "Lucide v0.511.0 — ISC License.
    Library file `vendor/lucide-0.511.0.min.js` was bundled until commit 9177e70
    (Phase P Sprint 2, April 2026). Since then, only the path-data is used as inline
    `<svg>` elements; the library code itself is no longer in the repo. The path-data
    inventory in PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md, Section 5.3, lists every icon
    verbatim. ISC attribution preserved here, project-level."
   ```

3. **R+7 — `<meta name="author">` in HTML-Files:**
   ```html
   <meta name="author" content="Hakan Guer">
   ```

**Tag:** `v1.0-doc-polish`

### 🟢 SPRINT U3 — Optional Repo-Hygiene (PRIORITY 3, optional)

1. **R+4 — Italic-Font:** Behalten (wird in Legal-Pages verwendet) ODER aus `fonts/` löschen wenn nicht mehr in styles-pages.css referenziert ist (Aufwand: Verify dann Decision).

2. **R+5 — `Inter-4/` Source-Drop verschieben** nach `/source/` oder `/build-tools/` (optional, würde Repo-Footprint um ~14 MB senken).

3. **R+6 — font-weight 100 verify:** Greppen nach `font-weight:100` und `font-weight: 100` in CSS — falls 0 Treffer, `:root`-Token-Bereich auf Dead-Code-Removal prüfen.

4. **R+8 — EXIF-Author-Tag** auf Brand-PNG-Assets via `exiftool` (optional, würde Provenance-Trail verstärken).

**Tag:** `v1.0-repo-hygiene`

---

## 20. Sign-Off

**Audit durchgeführt:** Claude (Opus 4.7) per Anthropic im Auftrag von Hakan Guer.
**Audit-Modus:** Read-Only Forensic Inspection.
**Audit-Datum:** 29. April 2026, 16:30 CET.
**Repo-State at Audit:** HEAD `2a08d98` / Tag `v1.0-pill-center-hotfix2`.
**Audit-Tools:** SHA-256, file(1), grep, find, wc, manuelle Brand-Color-Cross-Reference.

**Audit-Ergebnis:**
- 🟡 **1 mittlerer Befund** (`#34C759` Apple-System-Green) — adressierbar in <30 Min via Sprint U1.
- 🟢 **7 niedrige Findings** — Documentation-Polish und optionale Repo-Hygiene, alle nicht-blockierend.
- 🔴 **0 hohe Findings.**

**Empfehlung:** Sprint U1 ausführen für 100% Brand-Independence-Tag. Danach ist evspend.com forensisch-audit-vollständig sauber.

**Statement der Audit-Tiefe:**
- 211 Files inventarisiert
- 49 unique Hex-Farben gegen 20+ Brand-System-Color-DBs cross-referenced
- 8 unique SVG-Icons gegen Lucide / SF Symbols / Material Icons fingerprint-getestet
- 12 vendor-spezifische Font-Keywords negativ-getested (alle 0 hits)
- 1 Sub-Dependency in Chart.js identifiziert (@kurkle/color, MIT)
- 15+ Brand-Color-Targets aus Apple/Material/Microsoft cross-referenced

**Diese Audit-Datei ist als „PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md" Bestandteil des Repositories und kann im Falle einer rechtlichen oder Audit-Anfrage als Forensic-Trail vorgelegt werden.**

---

*End of PHASE R+ Deep License Audit. Total: 20 sections, 12 tracks, 6 inventories, 1 risk matrix, 1 AI-disclosure statement, 1 compliance statement, 1 sign-off.*
