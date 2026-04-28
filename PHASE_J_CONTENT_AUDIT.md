# PHASE J — Komplette Content-Analyse (Audit-Report)

**Projekt:** evspend.com
**Audit-Datum:** 28. April 2026 (nach Phase O+P, Tag `v0.5-p2-cleanup`)
**Audit-Modus:** Read-only (KEIN Code/Text geändert)
**Auditor:** Claude (Opus 4.7)

---

## 0. Executive Summary

Nach dem technischen Audit (Phase O) und drei Fix-Sprints (Phase P S1–S4) ist die Site auf **A-Niveau in Code-Qualität, Security und Performance**. Phase J adressiert die zweite Achse: **Content-Qualität** über alle 4 Märkte (DE/EU/US/TR) und 26 statisch ausgelieferte HTML-Pfade plus 210 Translation-Keys × 3 Sprachen.

**Kernbefund:** Die i18n-Infrastruktur ist exzellent (DE/EN/TR alle 210 Keys synchron), aber inhaltlich fallen drei Kategorien negativ auf:

1. **Lücken**: 8 in HTML referenzierte i18n-Keys sind **gar nicht definiert** (heroSubtitle1/2, alle 6 verlauf-Tabellen-Header). Diese rendern nur ihren HTML-Fallback und bleiben beim Marktwechsel sprachfremd. Für die a11y-Tabellen-Header heißt das konkret: TR/EN-User sehen deutsche Spaltenüberschriften.
2. **EN als Doppelrolle**: Die `en` Translations werden von **EU UND US** Markt verwendet, sind aber durchgehend in US-Units verfasst (`Miles`, `mpg`, `gas`, `mi`). EU-User mit km/Liter sehen widersprüchliche Texte ("Most EVs: 25–35 kWh/100 mi" als Hint, während ihr Slider in `kWh/100 km` arbeitet). Gleiche Bug-Klasse wie das in Phase P Sprint 1 behobene `chartAxisY`-Problem, nur an mehreren weiteren Stellen.
3. **Hardcoded UI-Texte**: PWA-Banner, PWA-Popup-Title/Sub, alle drei PWA-Step-Listen (iOS/Android/Desktop) und die PWA-Buttons sind **ohne `data-i18n`** und sprachgebunden an die Page-URL. Marktwechsel ändert sie nicht.

**Quantitativ:**

| Schweregrad | Anzahl | Kategorien |
|---|---|---|
| **P0** | 5 | Fehlende i18n-Keys, hardcoded PWA-Text, EN-Markt-Mismatch (Miles/mpg/gas) |
| **P1** | 8 | Du/Sie-Inkonsistenz, TR formal/informal Mix, fehlende Meta-Descriptions, asymmetrische AGB, SW-Doku-Lücke |
| **P2** | 6 | 31 ungenutzte Translation-Keys, Title-Längen, Disclaimer-Wording-Drift, EN-Phrasing |
| **P3** | 4 | Impressum-Optionalia, Schema.org-Erweiterung, OG-Image-Konsistenz, AGB-Kapitelsprünge |

**Total:** 23 Findings.

**Aufwand-Schätzung für vollständige Sanierung:** ~6–8 h (Großteil davon: kontrollierte Texterweiterungen + Übersetzungs-Reviews; keine architektonischen Änderungen nötig).

---

## 1. Pre-Flight — Inventar

### Statische HTML-Pfade

| Sprache | Calculator | Verlauf | Impressum | Datenschutz | AGB | Hinweise | Barrierefreiheit |
|---|---|---|---|---|---|---|---|
| DE (root) | `/index.html` ✓ | `/verlauf.html` ✓ | `/impressum.html` ✓ | `/datenschutz.html` ✓ | `/terms.html` ✓ | `/hinweise.html` ✓ | `/barrierefreiheit.html` ✓ |
| EN | — (JS only) | — | `/impressum.en.html` ✓ | `/datenschutz.en.html` ✓ | `/terms.en.html` ✓ | `/hinweise.en.html` ✓ | `/barrierefreiheit.en.html` ✓ |
| TR | — (JS only) | — | `/impressum.tr.html` ✓ | `/datenschutz.tr.html` ✓ | `/terms.tr.html` ✓ | `/hinweise.tr.html` ✓ | `/barrierefreiheit.tr.html` ✓ |
| EN-EU | `/en-eu/index.html` ✓ | `/en-eu/verlauf.html` ✓ | `/en-eu/impressum.html` ✓ | `/en-eu/datenschutz.html` ✓ | `/en-eu/terms.html` ✓ | `/en-eu/hinweise.html` ✓ | `/en-eu/barrierefreiheit.html` ✓ |
| Sonstige | `privacy-policy.html` (App-Store-Variante) | | | | | | |

**Inkonsistenz:** Calculator + Verlauf existieren statisch nur für DE und EN-EU. EN-US und TR-Märkte werden ausschließlich runtime via JS i18n bedient — Crawler ohne JS-Execution sehen sie nicht.

### Translation-Keys

- DE: 210 Keys
- EN: 210 Keys
- TR: 210 Keys
- **Alle drei Sprachen perfekt synchron** ✓ (gemessen über awk-Parsing der `var translations = { de: {...}, en: {...}, tr: {...} }` in script.js)

### data-i18n Coverage

- 109 unique `data-i18n*=` Attribute über alle HTML-Files
- 53 `_t("…")` direkte Calls in script.js
- 17 `_tv("…")` direkte Calls in verlauf.js
- Plus dynamische Konstruktion via `keyMap[range]` und `(isShare ? "share" : "sentence") + base` (8 weitere Sentence/Share-Varianten)

---

## 2. TRACK 1 — Übersetzungs-Vollständigkeit

### F1.1 — 8 i18n-Keys werden referenziert, sind aber nirgends definiert (P0)

- **Wo:** `index.html`, `en-eu/index.html`, `verlauf.html`, `en-eu/verlauf.html`
- **Keys:**
  - `heroSubtitle1` — index.html DE-Fallback "Kosten" / EN-EU-Fallback "Costs"
  - `heroSubtitle2` — DE-Fallback "im direkten Vergleich" / EN "side by side"
  - `tableCaption` — verlauf.html sr-only Tabellen-Caption
  - `tableHeaderDate`
  - `tableHeaderType`
  - `tableHeaderConsumption`
  - `tableHeaderPrice`
  - `tableHeaderCostPer100`
- **Bug-Verhalten:** `applyTranslations()` findet die Keys nicht → schreibt nichts → HTML-Fallback bleibt sichtbar. Beim Marktwechsel auf TR sieht ein User auf `/verlauf` weiterhin "Datum", "Verbrauch", "Kosten pro 100" usw. (Deutsch). Bei EN-EU bleibt "Date", "Consumption" usw. selbst nach Wechsel auf TR.
- **Auswirkung:** Sichtbar für a11y-Tools (Screen-Reader-Tabellen-Caption + Header bleiben sprachfremd). Bei `heroSubtitle*` ist es weniger kritisch, weil es nur eine kosmetische Phrase ist; aber identisches Problem.
- **Fix:** 8 Keys × 3 Sprachen = 24 Translation-Strings ergänzen. ~15 min.

### F1.2 — 31 Translation-Keys sind definiert, aber nirgends referenziert (P2)

- **Wo:** Translations-Block in script.js (de/en/tr)
- **Keys (truly unused, manuell verifiziert):**
  - **Phase-B-Marketing-Share-Reste**: `shareAverage`, `shareCosts`, `shareCostsPerPerson`, `shareEvCostHeader`, `shareEvLine`, `shareForKm`, `shareGroupPersons`, `shareRoute`, `shareSavingsArrow`, `shareTotal`, `shareTry`, `shareTryCompare`, `shareVbCostHeader`, `shareVbLine`, `shareCompareEmoji` (15 Keys)
  - **Menü-Labels** (vor Phase-6-Markt-Pill-Konsolidierung): `currMenuLabel`, `langMenuLabel`, `marketMenuLabel`, `costPerPerson`, `perPersonInactive`, `personOne`, `personsCount`, `rideshareFallback` (8 Keys)
  - **Hauptseiten-Reste**: `disclaimer`, `labelConsumption`, `monthlyCosts`, `yearlyCosts`, `result`, `streckeHint`, `chartAvgCost`, `saveHintText` (8 Keys)
- **Bundle-Größe:** ~3 KB an totem Translation-Content × 3 Sprachen.
- **Fix:** Per-Sprache löschen — 31 × 3 = 93 Zeilen entfernen. ~20 min.

### F1.3 — `labelKilometer` widerspricht aktivem Markt (P0)

- **Wo:** `script.js` translations:
  - DE: `labelKilometer: "Kilometer"`
  - EN: `labelKilometer: "Miles"` ← hardcoded US
  - TR: `labelKilometer: "Kilometre"`
- **Anwendung:** Drei `<label data-i18n="labelKilometer">` neben den km-Slidern (kmShared, kmEv, kmVb) in `/index.html` und `/en-eu/index.html`.
- **Bug:** EN-Translations werden für **EU-Markt** UND US-Markt benutzt. EU-Markt hat `_distanceUnit() === "km"`. Der User sieht das Label "Miles" obwohl der Slider-Wert in `km` formatiert wird. Identisch zum in Phase P Sprint 1 behobenen `chartAxisY`-Bug — nur weiter auf der Page.
- **Fix-Empfehlung:** Pattern aus F6.2 (Phase O) übernehmen — `labelKilometer: "{unit}"` oder generischer `"Distance"`. ~5 min.

### F1.4 — `hintEvConsumption` und `hintIceConsumption` US-Units (P0)

- **Wo:** `script.js`:
  - DE: `"E-Autos: meist 15–20 kWh/100 km"` ✓
  - EN: `"Most EVs: 25–35 kWh/100 mi"` ← US-Units
  - TR: `"Elektrikli: 15–20 kWh/100 km"` ✓
  - DE: `"Verbrenner: meist 5–8 L/100 km"` ✓
  - EN: `"Most gas cars: 25–35 mpg"` ← US-Units
  - TR: `"Benzinli: 5–8 L/100 km"` ✓
- **Bug:** EU-Markt zeigt diese Hints unter den Slidern. EU-User sieht "25–35 kWh/100 mi" als Hint, sein Slider zeigt aber Werte in `kWh/100 km`. Direkter Widerspruch.
- **Fix:** EN-Hints zweisprachig auflösen via `_isUsMarket()`-Switch oder Markt-spezifische Translations einführen (en-EU + en-US). ~30 min.

### F1.5 — `labelGasPrice` ist US-Englisch ohne EU-Variante (P1)

- **Wo:** `script.js` EN: `labelGasPrice: "Gas price"`
- **Issue:** Im britischen Englisch heißt Benzin **petrol**; "gas" steht für Erdgas. EU-User auf `/en-eu/` lesen "Gas price" für Benzin — Sprachverwirrung.
- **Fix:** EN-Markt-Split oder `_isUsMarket() ? "Gas" : "Petrol"`. ~5 min.

---

## 3. TRACK 2 — Sprachliche Qualität

### F2.1 — DE Du/Sie-Form-Bruch (P1)

- **Wo:** `script.js` translations.de
- **Pattern:** Durchgehend Du-Form (29 Treffer für `du`, `dein*`, `dir`).
- **Ausnahme:** **`longtermDoneHint: "Berechnet auf Basis Ihrer Eingaben"`** ← Sie-Form mitten in einer Du-Welt.
- **Auffälligkeit:** Erscheint nur, wenn Long-Term-Modus + Amortisation eintritt. Niche Path, aber jeder, der dorthin kommt, springt zwischen "du" und "Sie".
- **Fix:** `"Berechnet auf Basis deiner Eingaben"`. ~30 sek.

### F2.2 — TR Formal/Informal-Mix (P1)

- **Wo:** `script.js` translations.tr
- **Verteilung im Audit:**
  - `girdilerinize` (formal-Sie, possessive): 5×
  - `girdilerine` (informal-du, possessive): 3×
  - `girdilerime` (1st-person, "share"-Modus): 4×
  - `girdilere` (kein possessiv, formal-neutral): 1×
- **Konkrete Inkonsistenz:**
  - `hintCompareFoot: "Sonuçlar **girdilerinize** … dayanır"` (Sie)
  - `evCheaper: "Elektrikli avantajı — **girdilerinize** göre"` (Sie)
  - `sentenceCompareSavings: "{km} için **girdilerine** göre {val} tasarruf ediyorsun"` (du)
  - `sentenceCompareEqual: "Her iki seçenek **girdilerine** göre benzer maliyette"` (du)
  - `sentenceCompareLongterm: "Seçilen süre için maliyet farkı (**girdilere** göre)"` (neutral)
- **Auswirkung:** Hints sind in der Sie-Form, Resultat-Sätze switchen zur Du-Form. Innerhalb einer einzelnen Calculation springt der Tonfall.
- **Fix-Empfehlung:** Auf eine Form vereinheitlichen. Da `tasarruf ediyorsun` (du) als Stil zu jüngeren Lifestyle-Apps passt, würde ich **alles auf die Du-Form** harmonisieren (5 Strings ändern: `girdilerinize` → `girdilerine`). ~10 min.

### F2.3 — EN-Phrasing "save on {km}" / "pay more on {km}" wirkt unidiomatic (P2)

- **Wo:** `script.js` translations.en:
  - `savingsFor: "You save on {km}"`
  - `extraCostFor: "You pay more on {km}"`
- **Issue:** "You save on 500 km" ist grammatikalisch ungewöhnlich. Native Speaker erwarten **"over"**, **"across"**, oder **"for"**: "You save **over** 500 km" / "You pay more **over** 500 km".
- **Fix:** `"You save over {km}"` und `"You pay more over {km}"`. ~30 sek.

### F2.4 — `disclaimer`-Key inhaltlich nicht synchron zwischen Sprachen (P2)

- **Wo:** `script.js` translations:
  - DE: `"…Fahrweise, **Strommix** und Fahrzeug variieren…"`
  - EN: `"…driving style, **temperature** and vehicle…"`
  - TR: `"…sürüş tarzına, **hava koşullarına** ve araca göre…"`
- **Issue:** Drei verschiedene Konzepte (Strommix vs Temperatur vs Wetter). Übersetzer haben unterschiedliche Beispiele gewählt. Die DE-Variante ist sachlich am genauesten (Strommix beeinflusst EV-Kosten via CO₂-Bilanz und Tarifgestaltung).
- **Hinweis:** Der Key ist aktuell **nicht referenziert** (siehe F1.2) — also kosmetisch erstmal egal. Falls reaktiviert: Begriffe harmonisieren.

### F2.5 — Markenname-Konsistenz ✓

- **Status:** "EVSpend" überall einheitlich geschrieben, kein "ev spend", "Ev Spend" oder Ähnliches gefunden. Tagline "EV vs Combustion / E-Auto vs Verbrenner / Elektrikli vs Benzinli" sprachlich angemessen.

---

## 4. TRACK 3 — Legal-Texte

### F3.1 — Datenschutz-Erklärung erwähnt Service Worker nicht (P1)

- **Wo:** `/datenschutz.html`, `/datenschutz.en.html`, `/datenschutz.tr.html`, `/en-eu/datenschutz.html`
- **Befund:** Phase P Sprint 3 hat den Service Worker live deployed. SW speichert per Cache API (separate Storage-Mechanismus zu LocalStorage) Asset-Antworten, HTML-Shells etc. im Browser.
- **Aktuelle Texte sprechen nur von LocalStorage:**
  - DE: "…werden ausschließlich lokal im Browser des Nutzers gespeichert (LocalStorage)…"
  - EN-EU: "…held purely in your browser's localStorage…"
- **Issue:** Die SW Cache API zählt nach DSGVO als "Verarbeitung von Daten in Endgeräten" (analog zu LocalStorage). Auch wenn nicht personenbezogen, sollte der Datenschutz vollständig sein.
- **Fix-Empfehlung:** Im jeweiligen "Lokale Datenspeicherung"-Block ergänzen:
  > „Zusätzlich nutzt diese Website seit April 2026 einen Service Worker, der HTML-Seiten und statische Assets (CSS, JS, Schriftarten, Bilder) im **Cache-Speicher des Browsers** zwischenspeichert. Dies dient ausschließlich dem schnelleren Wiederbesuch und der Offline-Verfügbarkeit. Es werden keinerlei Identifikatoren oder personenbezogene Daten zwischengespeichert; der Cache kann jederzeit über die Browser-Einstellungen geleert werden."
- **Lokalisieren:** DE + EN (.en.html + en-eu) + TR. ~30 min.

### F3.2 — Cookie-Section asymmetrisch in Datenschutz (P2)

- **Wo:**
  - `/datenschutz.html` (DE), `.en.html`, `.tr.html` haben **eine kurze Erwähnung** in der "Technische Maßnahmen"-Liste: `<li>Verzicht auf Cookies (Funktionen wie Markt- oder Verlauf-Speicherung erfolgen ausschließlich über LocalStorage…)</li>`
  - `/en-eu/datenschutz.html` hat **zusätzlich eine eigene "No Cookies"-Karte** mit drei Absätzen Detail-Erklärung (Phase P Sprint 1 Erweiterung).
- **Issue:** Die /en-eu/ Version ist deutlich expliziter. Cross-locale-Konsistenz fehlt.
- **Fix:** Den ausführlichen "No Cookies"-Block aus `/en-eu/datenschutz.html` in DE/EN/TR adaptieren. ~20 min.

### F3.3 — `/en-eu/terms.html` hat zusätzliches Kapitel "Consumer Rights in the EU", DE/EN/TR nicht (P2)

- **Wo:** Terms-Seiten
- **EN-EU §9:** "Consumer Rights in the EU" (1 zusätzliche Karte).
- **DE/EN/TR:** Endet bei §8 "Gerichtsstand und anwendbares Recht".
- **Issue:** Inkonsistente Tiefe. Da DE-User (auf `/terms.html`) auch EU-Verbraucher sind, sollten sie das gleiche Kapitel bekommen.
- **Fix:** §9-Inhalte aus EN-EU in DE/EN/TR übernehmen + lokalisieren. ~20 min.

### F3.4 — Impressum-Pflichtangaben minimal aber TMG-konform (P3)

- **Vorhanden:** Name, Anschrift, Land, E-Mail, Haftungsausschlüsse, Datenschutz-Verweis, Schriftart-Lizenz.
- **Nicht vorhanden, aber nicht zwingend erforderlich:**
  - Telefonnummer (BGH: E-Mail allein ist ausreichend für "schnelle elektronische Kontaktaufnahme")
  - USt-IdNr (nur falls umsatzsteuerpflichtig — bei privatem Hobby-Betrieb optional)
  - V.i.S.d.P. nach § 18 Abs. 2 MStV (nur bei journalistisch-redaktionellen Angeboten — hier nicht zutreffend, da reine Calculator-Tool ohne Editorial)
- **Hinweis:** Erweiterungen sinnvoll, falls EVSpend irgendwann monetarisiert wird (Werbung, Affiliate-Verträge, Premium).

### F3.5 — Barrierefreiheits-Erklärung erwähnt WCAG-Update von Sprint 4 nicht (P3)

- **Wo:** `/barrierefreiheit.html`
- **Befund:** Phase P Sprint 4 (F4.9) hat WCAG-AA-Kontrast für Hero-Texts gefixt. Die Barrierefreiheits-Erklärung bezieht sich auf den Stand vor diesem Fix.
- **Fix:** Konformitäts-Status in Erklärung aktualisieren: "Diese Anwendung erfüllt WCAG 2.1 Level AA für Texte und interaktive Elemente." Datum aktualisieren. ~10 min × 4 Sprachen = ~30 min.

---

## 5. TRACK 4 — SEO-Texte

### F4.1 — 4 deutsche Legal-Pages haben **gar keine** `<meta name="description">` (P1)

- **Wo:**
  - `/impressum.html` ✗
  - `/datenschutz.html` ✗
  - `/terms.html` ✗
  - `/hinweise.html` ✗
- **Vorhanden bei:** Allen `.en.html`, `.tr.html`, `/en-eu/*.html`, sowie DE `index.html`, `verlauf.html`, `barrierefreiheit.html`, `privacy-policy.html`.
- **Bug-Verhalten:** Google generiert dann eine Auto-Description aus dem ersten sichtbaren Text — bei rechtlichen Pages oft kontraproduktiv (z. B. "Angaben gemäß § 5 TMG…" als Snippet).
- **Fix:** 4 deutsche Descriptions ergänzen. ~10 min.

### F4.2 — Title-Längen suboptimal (P2)

- **Optimal:** 50–60 Zeichen für Search-Result-Snippet.
- **Aktuell zu kurz:**
  - `/verlauf.html` — 17 Zeichen ("Verlauf – EVSpend"). Keyword-arm.
  - `/terms.html` — 13 Zeichen ("AGB – EVSpend").
  - `/impressum.html` — 19 Zeichen.
- **Fix:** Beschreibender machen, z. B. `Verlauf – Kostenrechnungen für E-Auto vs. Verbrenner | EVSpend` (~58 Zeichen). ~10 min für alle 4 Pages.

### F4.3 — Meta-Description /verlauf.html DE 126 chars (etwas kurz, akzeptabel) ✓

### F4.4 — Schema.org SoftwareApplication korrekt aufgesetzt ✓

- Vorhanden in `/index.html` und `/en-eu/index.html`. `applicationCategory: UtilitiesApplication`, `offers: price 0`, korrekt.
- **Optional:** `BreadcrumbList`, `FAQPage` (falls FAQ ergänzt wird), `Organization` mit Logo. Nice-to-have, P3.

### F4.5 — Alt-Texts ✓ (Phase P bereits geprüft)

- Banner: `alt="EVSpend Banner"` ✓
- PWA-Icon: `alt=""` (dekorativ) ✓
- Inline SVG-Icons: `aria-hidden="true"` + `focusable="false"` ✓

---

## 6. TRACK 5 — UI-Microcopy

### F5.1 — PWA-Banner und Popup hardcoded ohne i18n (P0)

- **Wo:** `/index.html` und `/en-eu/index.html` (jeweils mit fest verdrahteten Strings in eigener Sprache):
  - DE: `<div class="pwa-bar-text">App installieren für schnelleren Zugriff?</div>`
  - EN-EU: `<div class="pwa-bar-text">Install app for faster access?</div>`
  - DE-Buttons: `Installieren`, `Später`, `Alles klar`, `Schließen`
  - EN-Buttons: `Install`, `Later`, `Got it`, `Close`
  - DE-Popup-Title: `Zum Home-Bildschirm`, EN: `Add to Home Screen`
  - DE-Popup-Sub: `So geht's auf deinem Gerät:`, EN: `Here's how on your device:`
- **Bug-Verhalten:** Beim JS-Marktwechsel (z. B. ein DE-User wählt TR) bleiben PWA-Texte deutsch. Auf `/en-eu/` bleiben sie englisch.
- **Fix:** Alle Strings in `data-i18n`/`data-i18n-aria` umbauen + Translation-Keys (de/en/tr) ergänzen. ~30 min.

### F5.2 — PWA-Steps in script.js komplett deutsch hardcoded (P0)

- **Wo:** `script.js:2046-2058`:
  ```js
  ios:     ['Tippe auf <strong>Teilen</strong> unten in Safari', …],
  android: ['Tippe auf das <strong>Menü (⋮)</strong> oben rechts', …],
  desktop: ['Öffne das <strong>Browser-Menü</strong>', …],
  ```
- **Bug-Verhalten:** Wird über `_pwaBuildSteps(platform)` in das PWA-Popup gerendert. Auf `/en-eu/`, US-, TR-Markt bekommen User trotzdem deutsche Anleitung.
- **Fix:** 3 Plattform × 3 Steps = 9 Strings × 3 Sprachen = 27 Translation-Keys. Build-Funktion liest dann via `_t("pwaStepsIos1")` etc. ~45 min.

### F5.3 — Toast/Confirm i18n ✓ (Phase P S2 bereits gefixt)

- Verifiziert: alle 14 `eafToast(_t(...))` und `confirm(_t("confirmReset"))` Calls nutzen i18n korrekt.

### F5.4 — Empty-State und Stale-Hint Copy ✓

- `emptyCompareTitle`, `emptySingleTitle`, `staleHint` etc. alle als i18n-Keys vorhanden und in 3 Sprachen übersetzt.

### F5.5 — Tooltips / Help-Texts ✓ (kontextuell vorhanden)

- `hintEvConsumption`, `hintIceConsumption`, `rangeHintText`, `longtermKmMonthHint` etc. — alle vorhanden. ABER: F1.4 (US-Units in EN-Hints) ist hier Folgeproblem.

---

## 7. TRACK 6 — Disclaimer + Calc-Texte

### F6.1 — `disclaimer`-Inhalte semantisch unterschiedlich (P2)

- Siehe **F2.4**. DE = "Strommix", EN = "temperature", TR = "weather". Nicht aktiv referenziert (Key ist aktuell unused, F1.2), daher kein Live-Bug. Bei Reaktivierung: harmonisieren.

### F6.2 — `rangeHintText` korrekt synchronisiert ✓

- Alle drei Sprachen kommunizieren konsistent: "Theoretical, Battery÷Consumption, varies by climate/topography, no WLTP figure".

### F6.3 — `calcInfoBlock` HTML-Inhalt konsistent ✓

- Drei Absätze in allen Sprachen: Hinweis zur Berechnung + Formel + Disclaimer. Inhaltlich kongruent.

### F6.4 — Markets-spezifische Disclaimer fehlen (P3)

- **Befund:** Es gibt keinen sichtbaren Hinweis im UI, dass Strom- und Spritpreise marktspezifische **Defaults** sind, die abweichen können (Tagespreise / regionale Variation).
- **Fix-Empfehlung:** Nicht zwingend nötig — die `disclaimer`/`hintCompareFoot`-Texte decken das implizit ab. Optional ein dezenter "Standardwerte für [DE/EU/US/TR] · jederzeit anpassbar"-Hint unter den Slidern.

### F6.5 — Currency-Conversion-Hinweis nicht nötig (CURRENCY_RATES wurde Sprint 4 entfernt) ✓

- Sprint 4 hat hartcodierte FX-Rates entfernt. Es gibt keine Cross-Currency-Conversion mehr im Render-Pfad. Korrespondierender Disclaimer entfällt.

---

## 8. Priorisierung — Zusammenfassung

### P0 — Kritisch (sofort, ~1.5 h)

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.1** | 8 fehlende i18n-Keys (heroSubtitle1/2 + verlauf-Tabellen-Header) | T1 | 15 min |
| **F1.3** | `labelKilometer: "Miles"` (EN, falsch für EU) | T1 | 5 min |
| **F1.4** | `hintEvConsumption`/`hintIceConsumption` US-Units (EN, falsch für EU) | T1 | 30 min |
| **F5.1** | PWA-Banner/Popup hardcoded ohne i18n | T5 | 30 min |
| **F5.2** | PWA-Steps in script.js deutsch hardcoded | T5 | 45 min |

**P0 total: ~2 h.**

### P1 — Sichtbar, sollte zeitnah (~2 h)

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.5** | `labelGasPrice: "Gas price"` (US-Englisch in EU) | T1 | 5 min |
| **F2.1** | DE Du/Sie-Bruch (`longtermDoneHint: "Ihrer Eingaben"`) | T2 | 1 min |
| **F2.2** | TR formal/informal Mix (5 Strings vereinheitlichen) | T2 | 10 min |
| **F3.1** | Datenschutz erwähnt Service Worker nicht (4 Sprachen) | T3 | 30 min |
| **F4.1** | 4 deutsche Legal-Pages ohne meta description | T4 | 10 min |
| **F3.5** | Barrierefreiheits-Erklärung WCAG-Update fehlt | T3 | 30 min |

**P1 total: ~1.5 h.**

### P2 — Polish (~2 h)

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F1.2** | 31 ungenutzte Translation-Keys × 3 Sprachen entfernen | T1 | 20 min |
| **F2.3** | EN "save on {km}" → "save over {km}" | T2 | 1 min |
| **F2.4** | `disclaimer` Inhalt drift (Strommix/Temperature/Wetter) | T2/T6 | 10 min |
| **F3.2** | Cookie-Section asymmetrisch (DE/EN/TR vs EN-EU detail) | T3 | 20 min |
| **F3.3** | EN-EU Terms §9 "Consumer Rights" auch in DE/EN/TR | T3 | 20 min |
| **F4.2** | Title-Längen suboptimal (verlauf, terms, impressum) | T4 | 10 min |

**P2 total: ~1.5 h.**

### P3 — Nice-to-have (~1 h)

| # | Finding | Track | Aufwand |
|---|---|---|---|
| **F3.4** | Impressum optional erweitern (Phone, USt) — nur falls Monetarisierung | T3 | — |
| **F4.4** | Schema.org BreadcrumbList / Organization | T4 | 30 min |
| **F6.4** | "Standardwerte für [Markt]" Hint unter Slidern | T6 | 30 min |

**P3 total: ~1 h (optional).**

**Gesamt-Aufwand für P0+P1+P2: ~5 h** (P3 optional).

---

## 9. Fix-Empfehlungen — Sprint-Plan

### Sprint J1 (P0, ~2 h)
1. F1.1: 8 i18n-Keys × 3 Sprachen ergänzen.
2. F1.3 + F1.4: EN-Translations für `labelKilometer` / `hintEvConsumption` / `hintIceConsumption` mit `{unit}`-Pattern oder Markt-Branch lösen.
3. F5.1: PWA-Banner/Popup HTML auf `data-i18n` umbauen + 8 neue Translation-Keys.
4. F5.2: PWA-Steps i18n-Keys einführen, `_pwaBuildSteps()` umbauen.

### Sprint J2 (P1, ~1.5 h)
5. F1.5: EN `labelGasPrice` Markt-aware.
6. F2.1: DE `longtermDoneHint` Du-Form.
7. F2.2: TR formality vereinheitlichen.
8. F3.1: SW-Doku in 4 Datenschutz-Pages.
9. F4.1: 4 fehlende Meta-Descriptions ergänzen.
10. F3.5: Barrierefreiheits-Erklärung Stand aktualisieren.

### Sprint J3 (P2, ~1.5 h)
11. F1.2: 31 unused keys × 3 Sprachen löschen.
12. F2.3: EN "save over {km}".
13. F3.2: Cookie-Section in DE/EN/TR Datenschutz erweitern.
14. F3.3: §9 Consumer Rights in DE/EN/TR Terms.
15. F4.2: Titles optimieren.

### Sprint J4 (P3, optional)
- Schema.org-Erweiterungen, optionaler Slider-Hint, Impressum-Optionalia.

---

## 10. Schlussbemerkung

Der Content-Stack ist **strukturell korrekt** (210/210/210 i18n-Keys synchron, alle Pflicht-Legal-Seiten in 4 Locales, OG-Images pro Sprache, hreflang/canonical sauber nach Phase P). Die offenen Punkte sind alle inhaltlicher / sprachlicher Natur — keine fehlt-die-Übersetzung-Klasse, sondern Drift, US/EU-Vermischung in EN, und einige Sektoren der UI, die nie i18n-fähig gemacht wurden (PWA-Bereich vor allem).

Mit ~5 Stunden gezielter Sprintarbeit landet die Site auf **A-Niveau in Content-Qualität**. Die größten User-sichtbaren Verbesserungen kommen aus **Sprint J1**: PWA-Texte adaptieren beim Marktwechsel + EU-Englisch-User sehen endlich km/L statt mi/mpg in den Hints und dem Distance-Label.

---

*Ende des Reports. Read-only Audit, keine Code-/Text-Änderungen vorgenommen.*
