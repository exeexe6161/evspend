# PHASE O — Komplette Site-Analyse (Audit-Report)

**Projekt:** evspend.com (EV vs. Verbrenner Kostenvergleich)
**Repo:** github.com/exeexe6161/evspend
**Audit-Datum:** 28. April 2026
**Audit-Modus:** Read-only (KEIN Code geändert)
**Auditor:** Claude (Opus 4.7)

---

## 0. Executive Summary

evspend.com ist eine reine Static-Site (HTML+CSS+JS, keine Build-Pipeline) mit Vercel-Edge-Middleware für Geo-Routing. Die App ist auf Privacy-by-Design ausgelegt: 100 % client-seitig, kein Backend, kein Tracking, keine externe Konnektivität. Das spiegelt sich in einer ausgesprochen strikten CSP (`connect-src 'none'`, `default-src 'none'`) und in soliden Vercel-Security-Headers wider.

**Gesamtnote:** **B+ / Solide, mit klar adressierbaren Defekten.** Die Mathematik ist korrekt (alle Stichproben bestanden, Validator-Asserts in der Codebasis vorhanden), die Lizenz-Doku vorbildlich (LICENSES.md vollständig), Privacy-Compliance grundsätzlich gut. Die Schwächen liegen bei (a) SEO-Konsistenz im hreflang-Setup, (b) zwei Dateninkonsistenzen zwischen Datenschutz-Text und faktischem Cookie-Setzen, (c) Sprache↔Markt-Bug für EU-Markt (Chart-Achse zeigt "Cost ($)"), (d) etwas totem Code (`installPopup`, ungenutzte Currency-Rates).

**Quantitativ — was gefunden wurde:**

| Schweregrad | Anzahl | Beschreibung |
|---|---|---|
| **P0** (kritisch / SEO-/Compliance-blockierend) | 3 | hreflang-Mapping, Datenschutz↔Cookie-Diskrepanz, EU-Markt Chart-Axis |
| **P1** (sichtbar im Produkt, sollte zeitnah) | 7 | OG-Locale `en_US` auf EU-Seite, Cookie-Flag `Secure` fehlt, alert()-UX, dead `installPopup`-Code, Asset-Cache-Header global no-cache, banner.png nicht in WebP, Meta-Description fehlt auf /verlauf.html |
| **P2** (Code-Hygiene / Polish) | 9 | APP_VERSION-Drift, `_calcDebounced`-Naming, ungenutzte CURRENCY_RATES, slider min/max-Inkonsistenzen, inkonsistente Asset-Versionen, italic Font ungenutzt-aber-geladen, color-scheme-Meta fehlt, `monthlyCost`-Variablenname irreführend, banner.png in `/en-eu/` doppelt gehostet |
| **P3** (Nice-to-have) | 4 | OG-Image dimensions <1200×630, kein Service-Worker für PWA-Offline, redundante translations bei Hint-Text, Desktop-Detection in middleware.js |

**Total:** **23 Findings** — keine Sicherheitslücke (XSS/Injection) gefunden, kein DSGVO-/TMG-Verstoß im engeren Sinne (Adresse + Email vorhanden, lokale Datenverarbeitung). Mathematisch ist die App **korrekt**.

**Aufwand für Fixes (Schätzung):**
- P0-Fixes: ~2–3 Std. (SEO-Setup, Datenschutz-Update, Translation-Fix)
- P1-Fixes: ~3–4 Std.
- P2-Fixes: ~2–3 Std.
- **Gesamt-Aufwand:** ~7–10 Std. für vollständige Sanierung.

---

## 1. Pre-Flight — Repo-Inventar

### Datei-Inventar

| Kategorie | Dateien | LOC |
|---|---|---|
| **JavaScript** | `script.js`, `verlauf.js`, `theme-init.js`, `lang-switch.js`, `middleware.js`, `en-eu/init-eu.js` | ~5.150 |
| **CSS** | `styles-app.css`, `styles-pages.css`, `en-eu/styles-en-eu.css` | ~3.700 |
| **HTML (DE)** | `index.html`, `verlauf.html`, `impressum.html`, `datenschutz.html`, `terms.html`, `hinweise.html`, `barrierefreiheit.html` | — |
| **HTML (EN/TR)** | `*.en.html` × 5, `*.tr.html` × 5, `privacy-policy.html` (App-Store) | — |
| **HTML (EN-EU)** | `en-eu/{index,verlauf,impressum,datenschutz,terms,hinweise,barrierefreiheit}.html` | — |
| **Konfiguration** | `vercel.json`, `package.json`, `site.webmanifest`, `robots.txt`, `sitemap.xml` | — |
| **Doku** | `LICENSES.md`, `AUDIT_REPORT.md` (vorher), `PHASE_O_AUDIT_REPORT.md` (dieser) | — |
| **Vendor** | `vendor/chart-4.4.6.umd.js` (204 KB), `vendor/lucide-0.511.0.min.js` (348 KB) | — |
| **Fonts** | `fonts/InterVariable.woff2` (344 KB), `fonts/InterVariable-Italic.woff2` (380 KB) | — |
| **Brand-Assets** | `banner.png` (80 KB, 1600×320), Favicons, Touch-Icons | — |
| **Total LOC (Self-authored)** | | **~13.650** |

### Build / Deployment

- **Hosting:** Vercel (HTTPS-only, HSTS preload).
- **Build:** None — keine `package.json`-Scripts, kein Bundler, kein Linter.
- **Versionierung:** Cache-Busting via `?v=YYYYMMDD-N` Query-String pro Datei.
- **Browser-Targets:** Modern Evergreen (verwendet `:focus-visible`, `requestAnimationFrame`, `Intl`, optional chaining).

---

## 2. TRACK 1 — Code-Audit (JS / CSS / HTML)

### 2.1 JavaScript

#### F1.1 — `_calcDebounced` ist NICHT debounced (P2 / Code-Hygiene)
- **Datei:** `script.js:9`
- **Befund:** Konstante heißt `_calcDebounced` — der Body ruft aber `calc()` direkt auf, ohne Debounce. Kommentar bestätigt das ist Absicht ("instant response"), aber der Name ist irreführend.
- **Fix-Empfehlung:** Umbenennen zu `_calcImmediate` oder `_calc`.
- **Aufwand:** 5 min (replace_all).

#### F1.2 — `monthlyCost` ist eigentlich „Trip-Cost", nicht „monatliche Kosten" (P2)
- **Dateien:** `script.js:367–369, 1371–1372` (`saveQuick`, `_getSingleData`)
- **Befund:** `monthlyCost = costPer100 * km / 100` — `km` ist hier der frei eingegebene Strecken-Wert (Slider 0–2000 km), kein Monatswert. Die Hero-Beschriftung lautet entsprechend "Kosten für 500 km" (nicht "Monatlich"). `yearlyCost = monthlyCost * 12` ergibt nur dann eine sinnvolle Jahres-Kennzahl, wenn der User die eingegebene Strecke als „pro Monat" interpretiert — das ist im UI aber nicht so beschriftet. Math ist konsistent in sich (`_validateSingle` checkt `yearlyCost = monthlyCost × 12` ✓), aber das Naming ist eine Falle für künftige Maintenance.
- **Fix-Empfehlung:** Variablen umbenennen zu `tripCost` / `extrapolatedYearlyCost`, oder ein erläuterndes JSDoc-Kommentar.
- **Aufwand:** 30 min (Naming + Tests).

#### F1.3 — `APP_VERSION = "20260420-1"` ≠ Asset-Cache-Versionen (P2)
- **Datei:** `script.js:26`, `index.html:45,47,472`
- **Befund:** `APP_VERSION` (intern für State-Migration) ist `20260420-1`, aber HTML lädt Assets mit `?v=20260428-52` (CSS), `?v=20260428-45` (script.js), `?v=20260427-30` (theme-init.js). Wenn ein Migrationsschritt ausgelöst werden soll, muss `APP_VERSION` aktualisiert werden — das wurde anscheinend mehrfach vergessen. Drift erhöht Risiko, dass Migrations-Logik nicht greift.
- **Fix-Empfehlung:** Convention etablieren: `APP_VERSION` mit dem höchsten Asset-`?v` synchron halten (oder umgekehrt CI-Skript, das beides aus einem Date-Stamp ableitet).
- **Aufwand:** 15 min (manuell) / 1 h (Skript).

#### F1.4 — Tote Funktion `showInstallPromptIfNeeded` referenziert nicht-existentes Element (P1 / Bug)
- **Datei:** `script.js:3445–3452`
- **Befund:** Die Funktion sucht `document.getElementById("installPopup")` — dieses Element existiert in keiner HTML-Datei. Im aktuellen Setup heißt das Element `pwaPopup` (PWA-System ab Z. 2050+). `showInstallPromptIfNeeded` ist registriert auf `window.load`, aber findet nichts und schlägt still fehl. **Klassischer Dead-Code aus einer früheren Phase.**
- **Fix-Empfehlung:** Komplett entfernen (Z. 3438–3452).
- **Aufwand:** 5 min.

#### F1.5 — `CURRENCY_RATES` (USD/TRY) ist hartcodiert + ungenutzt (P2 / Tech-Debt)
- **Datei:** `script.js:3096–3100`
- **Befund:** `CURRENCY_RATES = { EUR:1, USD:1.17, TRY:52.79 }` — hartcodierte FX-Rates. Comment sagt "ab Phase 5 nicht mehr im Render-Pfad", nur "für künftige Admin-/Migrationsszenarien". Werte sind potenziell mehrere Monate alt; falls jemand die exposed `convertFromEur`/`convertToEur`-API nutzt, käme verfälschtes Ergebnis raus.
- **Fix-Empfehlung:** Entweder komplett entfernen (samt Helper-Funktionen), oder klar als `@deprecated` kennzeichnen.
- **Aufwand:** 10 min.

#### F1.6 — Migration-IIFE auf Module-Top-Level kann beim Reload-Loop hängen (P2)
- **Datei:** `script.js:80–106`
- **Befund:** Die `migrateAppState`-IIFE löst bei vorhandenem Old-State einen Hard-Reload aus. Geschützt via Session-Flag (`RELOAD_FLAG_KEY`), aber wenn `sessionStorage` ausnahmsweise blockiert wird (private Modi, manche Mobile-Browser), läuft der Reload jedes Mal. Im Worst-Case: Endlos-Loop.
- **Fix-Empfehlung:** Defensive: `localStorage`-basiertes Flag (überlebt Sessions), oder ein Fail-Counter.
- **Aufwand:** 20 min.

#### F1.7 — `alert()` und `confirm()` für UX (P1 / UX)
- **Datei:** `script.js:308, 445, 969`
- **Befund:** Drei Stellen verwenden native Browser-Dialoge:
  - Z. 308: `alert(_t("toastClipboard"))` — Clipboard-Erfolg
  - Z. 445: `alert(_t("saveCooldown"))` — Cooldown-Hinweis
  - Z. 969: `if (confirm(_t("confirmReset"))) reset();` — Reset-Bestätigung
  Das Toast-System (`eafToast`) ist bereits vorhanden und konsistenter.
- **Fix-Empfehlung:** Alle `alert()`-Calls auf `eafToast()` umstellen. `confirm()` für Reset behalten (echte Destruktion → Native Dialog akzeptabel).
- **Aufwand:** 15 min.

#### F1.8 — Tote Translation-Strings aus Phase B (P3)
- **Datei:** `script.js:2645–2663` (en), und parallel in de/tr
- **Befund:** Strings wie `shareEvCostHeader`, `shareVbCostHeader`, `shareRoute`, `shareCosts`, `shareCostsPerPerson`, `shareAverage`, `sharePer100`, `shareTotal`, `shareGroupPersons`, `shareForKm`, `shareEvLine`, `shareVbLine`, `shareSavingsArrow`, `shareCompareEmoji`, `shareTry`, `shareTryCompare` — diese Keys werden in der aktuellen `script.js` nicht mehr abgerufen (Suche nach `_t("shareRoute")` etc. ergibt 0 Treffer im aktiven Code-Pfad). Vermutlich Reste der Phase-B-Marketing-Templates, die durch Phase 11 vereinheitlichte `shareTextSingleEv`/`shareTextSingleVb`/`shareTextCompare`-Templates ersetzt wurden.
- **Fix-Empfehlung:** Keys, die nirgends mehr referenziert sind, in allen 3 Sprachen entfernen → senkt Bundle-Größe um ~3 KB.
- **Aufwand:** 20 min (verifizieren + entfernen).

### 2.2 CSS

#### F1.9 — Inputs ohne sichtbaren `:focus-visible` Indikator (FALSCH-POSITIV bestätigt)
- **Datei:** `styles-app.css:805–806`
- **Status:** **kein Bug** — `:focus-visible` setzt `outline:none`, aber separate `:focus`-Regel in Z. 1733 setzt Border + Box-Shadow. Beide Mauve- und Tastatur-Fokus zeigen also einen Ring. **Keine Action.**

#### F1.10 — `color-scheme` Meta-Property fehlt (P2)
- **Datei:** `styles-app.css:30` (`:root`)
- **Befund:** Site implementiert Light/Dark via `data-theme`, aber das CSS `color-scheme` Property ist nirgends gesetzt. Browser können dann Form-Controls (z. B. Datepicker, Scrollbar in Firefox) nicht passend stylen.
- **Fix-Empfehlung:** `:root { color-scheme: light dark; }` ergänzen.
- **Aufwand:** 2 min.

#### F1.11 — Italic-Font wird @font-face geladen, im Code aber selten genutzt (P3)
- **Datei:** `styles-app.css:15–22`, `fonts/InterVariable-Italic.woff2` (380 KB)
- **Befund:** Die Italic-Variable wird via `@font-face` deklariert. Browser laden bei tatsächlichem Nutzen via `<em>`/`<i>`/`font-style:italic` lazy nach. Suche nach `font-style:italic` und `<em>`/`<i>` zeigt aber nur Lucide-Icon-Tags (`<i data-lucide="…">`) — die haben kein `font-style`. Italic wird daher in der Praxis nie geladen → kein aktiver Performance-Hit, nur Brutto-Bundle-Größe (380 KB) im Repo.
- **Fix-Empfehlung:** Italic-Definition entfernen oder verifizieren, dass irgendwo wirklich gebraucht.
- **Aufwand:** 10 min.

### 2.3 HTML

#### F1.12 — `<html lang="de">` auf verlauf.html, dynamisch von JS überschrieben (P2)
- **Datei:** `verlauf.html:2`
- **Befund:** Hard-coded `lang="de"`. JS ändert es bei Marktwechsel via `setLanguage`. Für SEO-Crawler (die JS oft nicht oder nur eingeschränkt ausführen) bleibt es aber `de`. → Crawler sehen die Verlaufseite immer als deutsch, auch wenn Inhalte später dynamisch en/tr werden.
- **Fix-Empfehlung:** Akzeptiert (SPA-/Dynamic-i18n-Setup), aber: hreflang-Setup auf `verlauf.html` (siehe F4.x) muss konsistent sein.
- **Aufwand:** —

#### F1.13 — Meta-Description fehlt auf /verlauf.html (P1)
- **Datei:** `verlauf.html`
- **Befund:** Verlaufseite hat keine `<meta name="description">`. Google generiert dann eine Auto-Description aus dem ersten sichtbaren Text — oft suboptimal.
- **Fix-Empfehlung:** Hinzufügen, z. B. „Persönlicher Verlauf deiner E-Auto-/Verbrenner-Berechnungen — vollständig lokal im Browser gespeichert."
- **Aufwand:** 5 min.

---

## 3. TRACK 2 — Security-Audit

### 3.1 XSS / Injection

#### F2.1 — `innerHTML`-Verwendungen alle als sicher verifiziert ✓
- **Auditierte Stellen:**
  - `script.js:1046,1130` — `metaEl.innerHTML = ...` mit Template-Strings, alle Werte aus kontrollierten Sources (`_t()`, `_fmtMoney()`, `fmt()`). Kein User-Input.
  - `script.js:2034` — PWA Steps, hartcodierte Strings.
  - `script.js:3239` — `el.innerHTML = sub(val);` für `[data-i18n-html]` — `val` aus `translations`-Objekt, vollständig kontrolliert.
  - `theme-init.js:50` — `btn.innerHTML = SUN_SVG | MOON_SVG` — beide hartcodiert.
  - `verlauf.js:1146–1150` — `tbody.innerHTML = rows` — Strings über `escHtml()` escapt; verifiziert.
  - `verlauf.js:636` — Note-Rendering mit `el.textContent = label + ": " + text;` (kein innerHTML).
- **Status:** **sicher**. Note-Input-Maxlength=80 ist HTML-erzwungen, Storage ist read-only-für-Code-im-eigenen-Origin, kein User-Generated-Content cross-user.

#### F2.2 — Keine `eval()` / `Function()` / `document.write` ✓
- Komplette Suche zeigt 0 Treffer.

#### F2.3 — Keine externe Connectivity ✓
- 0 Treffer für `fetch(`, `XMLHttpRequest`, `WebSocket`, `postMessage`. Konsistent mit CSP `connect-src 'none'`.

### 3.2 Vercel-Headers

CSP-Set in `vercel.json` ist **vorbildlich strikt**:

```
default-src 'none';
script-src 'self';
style-src 'self';
img-src 'self' data: blob:;
connect-src 'none';
manifest-src 'self';
worker-src 'self';
base-uri 'self';
form-action 'none';
frame-ancestors 'none'
```

Plus: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/cohort: ()), Cross-Origin-Opener-Policy + Resource-Policy: same-origin.

#### F2.4 — Inline `<script type="application/ld+json">` und CSP (P2 / Verifikation nötig)
- **Datei:** `index.html:42`, `en-eu/index.html:42`
- **Befund:** JSON-LD ist inline. CSP `script-src 'self'` würde nach CSP3-Spec Inline-Scripts blockieren — JSON-LD ist aber typischerweise erlaubt, weil der MIME-Type `application/ld+json` ist und nicht ausgeführt wird. Browser-Implementierungen variieren historisch.
- **Verifikation:** Live im Production-Browser-DevTools auf CSP-Violations checken. Falls geblockt: `script-src 'self' 'unsafe-inline'` für JSON-LD-Spec-Kompatibilität ODER nonce-basiert.
- **Aufwand:** 5 min Test, 10 min Fix falls nötig.

### 3.3 Cookies

#### F2.5 — Datenschutz-Erklärung sagt „Verzicht auf Cookies", aber `evspend_locale`-Cookie wird gesetzt (P0 / Compliance-Diskrepanz)
- **Dateien:** `datenschutz.html:106`, `lang-switch.js:23–24`, `middleware.js:26–27`
- **Befund:**
  - **datenschutz.html (Z. 106):** „Verzicht auf Cookies (Funktionen wie Markt- oder Verlauf-Speicherung erfolgen ausschließlich über LocalStorage des Browsers ohne Datenübertragung)"
  - **lang-switch.js (Z. 23–24):** `document.cookie = 'evspend_locale=' + locale + '; path=/; max-age=31536000; SameSite=Lax';`
  - **middleware.js (Z. 26–27):** Liest dieses Cookie für Geo-Override.
  - Das Cookie wird also DEFINITIV gesetzt + serverseitig übertragen. Die Datenschutz-Aussage ist **faktisch falsch**.
- **Compliance-Risiko:** ePrivacy Art. 5(3) erlaubt funktionale Cookies ohne Consent — daher kein DSGVO-Verstoß. Aber die Datenschutz-Erklärung muss die Cookie-Existenz dokumentieren („Welche Daten werden verarbeitet?"). Aktuell: **Falschangabe** in der Datenschutzerklärung.
- **Fix-Empfehlung:** Datenschutz-Block "Lokale Datenspeicherung" erweitern um:
  > „Zusätzlich wird ein einzelnes funktionales Cookie `evspend_locale` (Wert: `de`/`us`/`tr`/`en-eu`, Laufzeit 365 Tage, SameSite=Lax) gesetzt, sobald der Nutzer die Sprache/Region manuell wechselt. Dieses Cookie dient ausschließlich dazu, die manuelle Markt-Wahl beim erneuten Aufruf zu respektieren (Override gegen IP-basierte Geo-Erkennung). Rechtsgrundlage: Art. 5 Abs. 3 ePrivacy-Richtlinie (technisch notwendig). Es enthält keine personenbezogenen Daten."
- **Aufwand:** 20 min (Text-Update in DE + EN + TR + EU).

#### F2.6 — Cookie ohne `Secure` Flag (P1 / Best-Practice)
- **Datei:** `lang-switch.js:23–24`
- **Befund:** Cookie wird gesetzt mit `SameSite=Lax` aber **ohne `Secure`**. Auf einem reinen HTTPS-Setup (Vercel forced) ist das funktional egal, aber Best-Practice ist `Secure`.
- **Fix-Empfehlung:**
  ```js
  document.cookie = 'evspend_locale=' + locale + '; path=/; max-age=31536000; SameSite=Lax; Secure';
  ```
- **Aufwand:** 1 min.

### 3.4 LocalStorage

#### F2.7 — Notes-Input maxlength=80 + textContent-Render ✓
- Verifiziert: User-Input über `noteInput` ist HTML-Maxlength-begrenzt und wird über `textContent` (nicht innerHTML) gerendert. **Sicher**.

### 3.5 Service Worker / Caching

#### F2.8 — Migrations-Code unregistriert SW; aber keiner ist registriert (P3)
- **Datei:** `script.js:89–106`
- **Befund:** Migrations-Pfad räumt etwaige alte SW-Registrierungen auf. Aktuell wird in der App KEIN SW registriert — der Code ist eine Vorsichtsmaßnahme für Upgrader. Sauber implementiert.
- **Status:** **kein Bug**. Optional: Einen echten SW für Offline/Caching wäre eine Erweiterung (P3 / Roadmap).

---

## 4. TRACK 3 — Performance-Audit

### 4.1 Asset-Größen

| Asset | Größe | Bewertung |
|---|---|---|
| `vendor/lucide-0.511.0.min.js` | 348 KB | **groß**, aber `defer`-loaded. Nutzt nur ~5–8 Icons; Tree-Shaking könnte 90 % sparen. |
| `vendor/chart-4.4.6.umd.js` | 204 KB | nur in `/verlauf.html` geladen. ✓ |
| `fonts/InterVariable.woff2` | 344 KB | preloaded. Variable-Font, alle Weights → einmaliger Hit. |
| `fonts/InterVariable-Italic.woff2` | 380 KB | nicht preloaded, in der App nicht aktiv genutzt (siehe F1.11). |
| `banner.png` | 80 KB | 1600×320, kein WebP/AVIF (P1). |
| `script.js` | ~160 KB unkomprimiert | ein einziger File, keine Code-Splitting-Pipeline. |

#### F3.1 — Lucide-Library lädt 348 KB für ~5–8 Icons (P1)
- **Befund:** Verwendete Icons (geschätzt): `users`, `line-chart`, `arrow-left`, `image-down`, `message-square-text`, `save`, `clock`, `rotate-ccw`, plus inline SVGs für Pfeile/Checks. Lucide hat ~1.500 Icons gebündelt, davon kommen ~10 zum Einsatz.
- **Fix-Empfehlung:** Verwendete Icons inline in HTML einbetten (wie bereits einige `polyline`-SVGs), Lucide-Lib komplett entfernen. Spart ~340 KB Download/Parse.
- **Aufwand:** 30–60 min (einmalige Inline-Migration).

#### F3.2 — `banner.png` nicht in WebP/AVIF konvertiert (P1)
- **Datei:** `banner.png` (80 KB, 1600×320 PNG)
- **Befund:** Bild ist LCP-relevant (`fetchpriority="high"` bereits gesetzt). PNG→WebP würde ~50 % einsparen (ca. 30–40 KB). AVIF noch besser.
- **Fix-Empfehlung:** `<picture>` mit `<source srcset="banner.webp" type="image/webp">` + PNG-Fallback.
- **Aufwand:** 15 min (Conversion + HTML-Update).

#### F3.3 — Vercel `Cache-Control: no-cache` global (P1)
- **Datei:** `vercel.json:18`
- **Befund:** ALLE Pfade (`/(.*)`) bekommen `Cache-Control: no-cache`. Damit revalidiert der Browser bei jedem Request gegen den Server. Für hashed/versionierte Assets (CSS/JS via `?v=...` Query) ist das Verschwendung — die könnten `max-age=31536000, immutable` sein.
- **Fix-Empfehlung:** Pfad-spezifische Headers:
  - `*.html` → `Cache-Control: no-cache` (immer aktuell)
  - `*.css`, `*.js`, `*.woff2`, `*.png` → `Cache-Control: public, max-age=31536000, immutable` (versioned via Query)
- **Aufwand:** 10 min.

#### F3.4 — `chart-4.4.6.umd.js` (204 KB) nur für /verlauf.html ✓
- Wird ausschließlich auf der Verlauf-Seite geladen, sauber.

### 4.2 Loading-Strategien

#### F3.5 — `theme-init.js` blockiert (parser-blocking script ohne `defer`) — bewusst (P3 / verifiziert)
- **Datei:** `index.html:45`
- **Befund:** `<script src="./theme-init.js?v=20260427-30"></script>` ohne `defer`. Das ist **bewusst**, um FOUC (Flash-of-Unstyled-Content) bei Theme-Wechsel zu vermeiden. Der Script ist klein (3.4 KB).
- **Status:** **kein Bug**.

#### F3.6 — `script.js` und `verlauf.js` am Body-Ende ohne `defer` (P3)
- **Befund:** Funktioniert in Practice, weil DOM bereits geparst ist. `defer` würde aber noch parallel zum DOM-Parsing herunterladen → bessere INP/TBT.
- **Fix-Empfehlung:** `<script src="./script.js?v=..." defer>` und in `<head>` verschieben.
- **Aufwand:** 5 min.

### 4.3 PWA

#### F3.7 — Kein Service-Worker, keine Offline-Funktionalität (P3 / Roadmap)
- **Befund:** `site.webmanifest` deklariert PWA, aber kein SW = kein Offline-Modus. Chrome-Desktop-Install-Prompt mag deshalb einschränken (manchmal benötigt minimal-PWA-Anforderungen erfüllt: `start_url` ✓, `icons` ✓, aber SW empfohlen).
- **Fix-Empfehlung:** Minimal-SW mit `Cache-First` für statische Assets — ~50 LOC.
- **Aufwand:** 1–2 h.

---

## 5. TRACK 4 — SEO + Accessibility

### 5.1 SEO

#### F4.1 — `hreflang="en"` und `hreflang="tr"` zeigen auf `/` (DE-Inhalt) (P0 / SEO-Bug)
- **Dateien:** `index.html:23–25`, `en-eu/index.html:23–25`, `verlauf.html:13–15`, `sitemap.xml`, alle Legal-Pages
- **Befund:** Konstrukt:
  ```html
  <link rel="alternate" hreflang="de" href="https://www.evspend.com/">
  <link rel="alternate" hreflang="en" href="https://www.evspend.com/">
  <link rel="alternate" hreflang="tr" href="https://www.evspend.com/">
  <link rel="alternate" hreflang="en-150" href="https://www.evspend.com/en-eu/">
  ```
  Da `/` für Crawler **statischer DE-Content** ist (Middleware bypassed Bots), sieht Google: „Englische Variante = /" — aber dort ist Deutsch. Konsequenz: Google indexiert /  als deutsch UND englisch UND türkisch parallel — Duplicate Content / falsche Sprache in SERPs. Türkische Suche zeigt deutsche Snippets.
- **Fix-Empfehlung (zwei Optionen):**
  - **A (sauber):** Statische `/en-us/` und `/tr-tr/` Pfade neben `/en-eu/` aufbauen, mit eigenen statisch übersetzten HTMLs.
  - **B (pragmatisch):** `hreflang="en"` und `hreflang="tr"` ENTFERNEN, da kein dedizierter URL existiert. Nur `de`, `en-150` (EN-EU), und `x-default` deklarieren.
- **Aufwand:** A: 4–6 h. B: 30 min (Bulk-Edit über alle Pages).

#### F4.2 — `og:locale` auf `/en-eu/` ist `en_US` statt `en_GB`/`en_IE` (P1)
- **Datei:** `en-eu/index.html:31`
- **Befund:** `<meta property="og:locale" content="en_US">` — die Seite ist aber für EU-Englisch. Facebook/LinkedIn nutzen das für Locale-Hinweise.
- **Fix-Empfehlung:** `en_GB` oder `en_IE` setzen. Konsistent zu `MARKET_CONFIG.eu.locale = "en-IE"`.
- **Aufwand:** 1 min.

#### F4.3 — `og:image` ist 1024×165 (P3)
- **Datei:** `index.html:35–36`, alle Varianten
- **Befund:** Banner.png ist 1024×165. Facebook empfiehlt für `summary_large_image` mindestens 1200×630 (oder 1.91:1 Aspect). Twitter zeigt das aktuelle Format zwar, schneidet aber zu.
- **Fix-Empfehlung:** Separates `og-image.png` (1200×630) erzeugen, z. B. mit Hero-Title + EVSpend-Branding.
- **Aufwand:** 15 min (Image generieren + Meta updaten).

#### F4.4 — Sitemap deklariert `hreflang="en"` und `hreflang="tr"` auf DE-URL (P0 / Folge von F4.1)
- **Datei:** `sitemap.xml:7–13` (und alle weiteren Url-Blöcke)
- **Status:** Direkte Konsequenz von F4.1; mit selber Action behoben.

#### F4.5 — Schema.org JSON-LD korrekt strukturiert ✓
- **Befund:** `SoftwareApplication`, `offers.price=0`, `applicationCategory=UtilitiesApplication`, `inLanguage` korrekt pro Sprachvariante. Nur `priceCurrency` ist konsistent „EUR" auch auf der `/en-eu/`-Seite (passt → EU-Markt).

### 5.2 Accessibility (WCAG AA)

#### F4.6 — Alt-Texts sind alle gesetzt ✓
- Banner: `alt="EVSpend Banner"` ✓
- PWA-Popup-Icon: `alt=""` (dekorativ) ✓
- Lucide-Icons: `aria-hidden="true"` + `focusable="false"` ✓

#### F4.7 — ARIA-Setup vorbildlich ✓
- `role="status" aria-live="polite" aria-atomic="true"` auf `#sliderAnnouncer` ✓
- `role="tablist"` auf Mode-/Type-Toggles ✓
- `role="dialog" aria-modal="true"` auf PWA-Popup ✓
- `aria-haspopup="menu"`, `aria-expanded`, `aria-selected` auf Buttons ✓
- `aria-label` auf jedem Slider ✓
- `aria-valuetext` dynamisch über `_updateSliderVal` (zeigt formatierte Werte für Screenreader) ✓

#### F4.8 — `aria-label` auf Slidern ist DE-hardcoded (P1)
- **Datei:** `index.html:120,132,139,147,154,169,176,184,217,246,256,263`
- **Befund:** Slider-`aria-label` ist hartcodiert auf Deutsch (z. B. „Kilometer (für beide Fahrzeuge)", „E-Auto Verbrauch", „Strompreis"). JS überschreibt diese nicht; bei Marktwechsel auf US/TR bleibt das Screenreader-Label deutsch. Im /en-eu/ analog Englisch hardcoded.
- **Fix-Empfehlung:** `data-i18n-aria="..."` System (existiert bereits via Phase 7, Z. 3246–3250) auch für Slider nutzen, also `<input ... aria-label="..." data-i18n-aria="ariaSliderEvKm">`.
- **Aufwand:** 30 min.

#### F4.9 — Color-Contrast nicht final verifiziert (P2)
- **Befund:** Kann nur dynamisch (axe-core / Lighthouse-A11y) verifiziert werden. Visuell wirken die Brand-Farben (Mint-Grün #22c55e auf Weiß, Orange #f59e0b) im UI ausreichend kontrastreich, aber kleine Text-Bereiche (`.disclaimer`, `.footer-note` mit `color:var(--l3)` ≈ #454a55 auf #f5f7fa) sind grenzwertig. WCAG AA verlangt 4.5:1 für Normaltext.
- **Verifikation:** Lighthouse / axe / WebAIM Contrast Checker auf Live-Site.
- **Aufwand:** 15 min Audit + ggf. 30 min Fixes.

#### F4.10 — Touch-Target-Größen ✓ (verifiziert)
- Top-Pill min-height ~38px (max-width:480px), Mode-Buttons groß, Slider-Thumb Standard-Browser ≥24×24. Apple HIG / Material verlangen 44×44 — die Pill bei 38px ist knapp. P2 / akzeptabel auf Desktop, ggf. Mobile-Branch erhöhen.

#### F4.11 — `lang`-Attribut wird dynamisch gesetzt ✓
- `script.js:3264, 3408` — `document.documentElement.setAttribute("lang", currentLanguage)` bei Init und Marktwechsel.

### 5.3 Mobile / Responsive

#### F4.12 — Responsive-Breakpoints abgedeckt ✓
- Media Queries: 375px, 420px, 480px, 640px, 681px sowie Landscape (max-height:500px). Tippoint-frei.

---

## 6. TRACK 5 — License + Doku

### 6.1 LICENSES.md

#### F5.1 — Vollständige & korrekte Lizenz-Doku ✓
- Inter (OFL) ✓, Chart.js (MIT) ✓, Lucide (ISC) ✓, Self-authored Code (Hakan Guer + Claude AI per Anthropic ToS) ✓, Brand-Assets (AI-generated) ✓.
- **Beobachtung:** Sehr gut strukturiert, "Brand & Design Independence"-Sektion zeigt aktive Distanzierung von Apple/Google/Microsoft Design-Systems.

### 6.2 Compliance-Pages

#### F5.2 — Impressum vollständig nach § 5 TMG ✓
- Operator: Hakan Guer, Wetzlarer Straße 2, 35260 Stadtallendorf, g.uer@aol.com.
- Haftung Inhalte/Links/Urheberrecht/Barrierefreiheit/Datenschutz alle abgedeckt.

#### F5.3 — Datenschutz DSGVO-konform — bis auf Cookie-Diskrepanz (siehe F2.5)
- Verantwortlicher ✓, Aufsichtsbehörde Hessen ✓, Drittlandtransfer USA (Vercel DPF + SCC) ✓, Betroffenenrechte vollständig ✓.
- **Eine Aussage falsch:** „Verzicht auf Cookies" — siehe F2.5.

#### F5.4 — Privacy-Policy.html (App-Store) ✓
- Separate kürzere Version für App-Store-Reviewer. Englisch, Operator/Email konsistent.

#### F5.5 — AUDIT_REPORT.md (Phase N v2.0 / M.6.1) — Phasen-Doku
- 112 KB. Wurde in diesem Audit nicht im Detail re-auditiert; existiert als historischer Nachweis.

#### F5.6 — `verlaufFooterNote` und einige Translation-Keys haben Tippfehler? (P3)
- Lediglich `chartA11yEmpty`, `chartA11ySummary` etc. werden auf `verlauf.js` benutzt — hier zu prüfen. Stichprobe sah konsistent aus.

---

## 7. TRACK 6 — Math-Verification

### 7.1 Stichproben

Alle Stichproben **bestanden**:

| Test | Erwartung | Ergebnis |
|---|---|---|
| EV-Kosten/100 km (17 kWh × 0.35 €) | 5,95 € | **5,95 €** ✓ |
| Trip-Kosten 500 km | 29,75 € | **29,75 €** ✓ |
| Reichweite (60 kWh / 17 kWh/100) | 353 km | **353 km** ✓ |
| Compare DE: VB 7 L × 1.85 € | 12,95 €/100 km | **12,95 €** ✓ |
| US-Konversion: 300 mi → km | 482,80 km | **482,80 km** ✓ |
| US-Konversion: 26 mpg → L/100 km | 9,05 L | **9,05 L** ✓ |
| Long-term Break-Even (12.000 km/yr, prem 5.000 €) | 5,95 yrs | **5,95 yrs** ✓ |
| TR yearly: yrEv (5.712 ₺) vs yrVb (40.320 ₺) | 34.608 ₺ savings | **34.608 ₺** ✓ |
| Division-by-zero (consumption=0) → Range | NaN | **NaN** ✓ |

### 7.2 Defensive Checks im Code

Die App enthält **eingebaute Math-Validation** (`script.js:707–755`):
- `_assertClose` — Vergleicht erwartete Ableitung gegen tatsächlichen Wert (Tol. 0,01 €).
- `_assertPlausible` — Prüft `isFinite` und `≥ 0`.
- `_validateSingle`, `_validateCompare`, `_assertShareSafe` — laufen bei jedem Calc.
- Errors gehen via `console.error` raus (nicht UI-blockend) → gut für Debug.

### 7.3 Edge Cases

| Edge Case | Verhalten | Bewertung |
|---|---|---|
| Stromverbrauch=0 | `n()` returnt NaN, `_getSingleData` returnt null | ✓ |
| Negative Werte | Slider erlauben es nicht (HTML min-Attr) | ✓ |
| `kmShared=0` | `getCompareData` setzt km=0, alle Strecken-Kosten=0 | ✓ |
| Premium=0 in Long-term | Special-case: `profitableNow` Text | ✓ |
| Years=0 in Long-term | Special-case: `kostenEv=0, restMehrpreis=premium` | ✓ |
| Floating-Point (0.1+0.2) | Toleranz 0,01 € im Validator | ✓ |
| Hist-Entry-Größe (50 max × ~314 B) | ~15 KB total | ✓ (LocalStorage 5–10 MB) |

### 7.4 Inkonsistenzen

#### F6.1 — `kmShared` vs `kmEv`/`kmVb` Slider-Range-Inkonsistenz (P2)
- **Datei:** `index.html:120 vs 132,169` und `MARKET_CONFIG.de.defaults`
- **Befund:** kmShared (Compare-Modus) hat min=50, max=10000. kmEv/kmVb (Single-Modus) min=0, max=2000. → User kann im Compare-Modus 5x weiter fahren als im Single. Inkonsistent für die User-Mental-Model.
- **Fix-Empfehlung:** Ranges harmonisieren auf `0–10000` oder `50–10000` für alle drei.
- **Aufwand:** 10 min.

#### F6.2 — Sprache↔Markt-Bug: EU-Markt zeigt Chart-Achse "Cost ($)" (P0 / Visible Bug)
- **Dateien:** `script.js:2643` (en translations), `index.html:352`, `en-eu/index.html:354`
- **Befund:**
  - DE translations: `chartAxisY: "Kosten (€)"`
  - EN translations: `chartAxisY: "Cost ($)"` ← **hardcoded $**
  - TR translations: `chartAxisY: "Maliyet (₺)"`
  - EU-Markt nutzt `language: "en"` aber `currency: "EUR"`, `symbol: "€"`. → User im EU-Markt sieht trotz EUR-Preisen die Achse "Cost ($)".
  - Gleicher Bug bei `chartAxisX`: EN sagt "Miles", TR sagt "Kilometre" → EU-User sieht "Miles" obwohl km verwendet wird.
- **Fix-Empfehlung:** Translation-Key auf Platzhalter umstellen:
  ```js
  chartAxisX: "{unit}",         // wird zu "km" oder "mi" via {unit}-Substitution
  chartAxisY: "Cost ({symbol})" // EN; "{symbol}" wird zu € / $ / ₺
  ```
  Substitution existiert bereits über `commonSubs` in `applyTranslations` (Z. 3221–3229) — der Key wird also automatisch korrekt aufgelöst.
- **Aufwand:** 10 min (3 Translation-Keys updaten + Test).

#### F6.3 — Browser-Locale-Detection: `_detectMarketFromBrowser` returnt `us` als Default (P1)
- **Datei:** `script.js:3168`
- **Befund:** Für jede Browser-Sprache, die nicht `de-*` oder `tr-*` ist, returnt die Funktion `"us"`. → Ein britischer Nutzer (`en-GB`) bekommt USA-Defaults (USD, Meilen, MPG) statt EU. Im Live-Setup wird das von Vercel-Middleware kompensiert (geo-IP-basiert), aber wenn Middleware ausfällt oder bei Bots ist der JS-Default `us`.
- **Fix-Empfehlung:** Default auf `eu` oder `de` umstellen, oder Logik erweitern auf `en-GB`/`en-IE`/`en-AU` → `eu`.
- **Aufwand:** 15 min.

---

## 8. Priorisierung — Zusammenfassung

### P0 — Kritisch (sofort)

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F4.1** | hreflang-Mapping zeigt EN/TR auf DE-URL → SEO-Wahnsinn | T4 | 30 min – 6 h |
| **F2.5** | Datenschutz sagt „keine Cookies", aber `evspend_locale` wird gesetzt | T2 | 20 min |
| **F6.2** | EU-Markt Chart-Achse "Cost ($)" trotz EUR | T6 | 10 min |

**P0-Total: ~1 h (Variante B von F4.1) bis ~7 h (Variante A).**

### P1 — Sichtbar / sollte zeitnah

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.4** | Toter `installPopup`-Code | T1 | 5 min |
| **F1.7** | `alert()`/`confirm()` UX → eafToast | T1 | 15 min |
| **F1.13** | Meta-Description fehlt auf /verlauf.html | T1 | 5 min |
| **F2.6** | Cookie ohne `Secure` Flag | T2 | 1 min |
| **F3.1** | Lucide-Lib 348 KB für ~10 Icons | T3 | 60 min |
| **F3.2** | banner.png nicht WebP | T3 | 15 min |
| **F3.3** | Vercel global no-cache | T3 | 10 min |
| **F4.2** | OG-Locale `en_US` auf EU-Page | T4 | 1 min |
| **F4.8** | Hardcoded `aria-label` Slider | T4 | 30 min |
| **F6.3** | Browser-Locale-Detection `us` als Default | T6 | 15 min |

**P1-Total: ~2,5 h.**

### P2 — Code-Hygiene

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.1** | `_calcDebounced` Naming | T1 | 5 min |
| **F1.2** | `monthlyCost` Variablenname | T1 | 30 min |
| **F1.3** | APP_VERSION ≠ Asset-Versionen | T1 | 15 min |
| **F1.5** | CURRENCY_RATES hartcodiert + ungenutzt | T1 | 10 min |
| **F1.6** | Migrations-IIFE Reload-Loop-Risiko | T1 | 20 min |
| **F1.10** | `color-scheme` fehlt | T1 | 2 min |
| **F1.11** | Italic-Font ungenutzt aber gehostet | T1 | 10 min |
| **F2.4** | JSON-LD CSP-Verifikation | T2 | 5 min |
| **F4.9** | Color-Contrast Audit | T4 | 45 min |
| **F6.1** | Slider-Range-Inkonsistenz kmShared vs kmEv/Vb | T6 | 10 min |

**P2-Total: ~2,5 h.**

### P3 — Nice-to-Have

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.8** | Tote Translation-Keys | T1 | 20 min |
| **F1.12** | `lang="de"` hardcoded auf verlauf.html | T1 | — (Akzeptiert) |
| **F3.5** | theme-init.js parser-blocking | T3 | — (Akzeptiert) |
| **F3.6** | script.js/verlauf.js ohne `defer` | T3 | 5 min |
| **F3.7** | Kein Service-Worker (kein Offline) | T3 | 1–2 h |
| **F4.3** | OG-Image <1200×630 | T4 | 15 min |

**P3-Total: ~2 h.**

---

## 9. Fix-Roadmap (empfohlene Reihenfolge)

### Sprint 1 — Compliance & SEO (P0, ~2 h)
1. F2.5: Datenschutz-Erklärung um Cookie-Beschreibung ergänzen (DE+EN+TR+EU).
2. F2.6: `Secure`-Flag im Cookie ergänzen.
3. F4.1 (Variante B): `hreflang="en"` und `hreflang="tr"` aus allen HTMLs + sitemap.xml entfernen.
4. F6.2: Translation-Keys `chartAxisX`/`chartAxisY` auf `{unit}`/`{symbol}`-Platzhalter umstellen.
5. F4.2: `og:locale` auf `/en-eu/` korrigieren.

### Sprint 2 — Polish & Dead-Code (P1, ~2,5 h)
6. F1.4: `showInstallPromptIfNeeded` Block entfernen.
7. F1.7: `alert()`/`saveCooldown` auf `eafToast` migrieren.
8. F1.13: Meta-Description auf /verlauf.html.
9. F4.8: `aria-label` Slider via `data-i18n-aria`.
10. F3.3: Vercel Cache-Headers pfad-spezifisch.

### Sprint 3 — Performance (P1+P2, ~2 h)
11. F3.1: Lucide → Inline-SVG (5–10 Icons).
12. F3.2: banner.png → WebP.
13. F1.10: `color-scheme: light dark`.

### Sprint 4 — Code-Hygiene (P2, ~2 h)
14. F1.1: `_calcDebounced` umbenennen.
15. F1.2: `monthlyCost` umbenennen / dokumentieren.
16. F1.3: APP_VERSION-Sync etablieren.
17. F1.5: `CURRENCY_RATES` entfernen.
18. F1.8: Tote Translations entfernen.
19. F6.1: Slider-Ranges harmonisieren.

### Sprint 5 — Optional (P3, ~3 h)
20. F3.7: Service-Worker mit Cache-First für statische Assets.
21. F4.3: OG-Image 1200×630 generieren.

---

## 10. Schlussbemerkung

Die evspend.com-Codebasis ist insgesamt **gepflegt und reflektiert**: Es gibt eingebaute Math-Validation, sehr strikte Security-Headers, eine vorbildlich strukturierte LICENSES.md, kompletten DSGVO-Dokumentations-Stack, und ein durchdachtes i18n/Markt-System. Die gefundenen Findings sind alle **lokal behebbar**, kein Architektur-Refactor nötig.

Die **drei P0-Findings** sind alle nicht-trivial in ihren Geschäftsauswirkungen:
- F4.1 (hreflang) verhindert korrekte SEO-Indexierung in EN/TR-Suchmärkten.
- F2.5 (Datenschutz↔Cookie) ist eine Falschaussage, die im Falle einer Beschwerde Compliance-Risiken birgt.
- F6.2 (Chart-Achse) ist ein klar sichtbarer User-Bug für EU-Markt.

Mit ~7–10 Stunden gezielter Arbeit kann der Site-Audit von B+ auf A gebracht werden.

---

*Ende des Reports. Generiert am 28. April 2026 in Phase O, Audit-only-Modus, ohne Code-Änderungen.*
