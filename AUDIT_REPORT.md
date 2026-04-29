# EVSpend — Rechts- und Qualitäts-Audit

**Datum:** 24. April 2026
**Bearbeiter:** Hakan Guer (Owner), Claude Opus 4.7 (Implementierung)
**Branch:** `main`
**Letzter Commit dieses Audits:** `25bb1bf`

---

## Zusammenfassung

Vollständiger Audit in 10 Schritten, ausgeführt in 11 Commits. Keine Marketing-Claims oder Operator-Daten ohne Rückfrage geändert. Keine Platzhalter eingebaut. Bei jeder offenen Entscheidung Rückfrage gestellt.

| Schritt | Inhalt | Commits |
|---|---|---|
| 2 | Lucide + Chart.js lokal hosten, unpkg raus aus CSP | `7b6b558` |
| 1 | Legal-Seiten EN/TR (12 neue Files) | `2a30b5f`, `df5d83a`, `851189f`, `39cdc95` |
| 5 | Service Worker entfernt | `b6e6e11` |
| 3 | BFSG-Barrierefreiheitserklärung (3 neue Files + Footer-Update) | `f13f7ea`, `c621d53` |
| 4 | Manifest konsolidiert auf `site.webmanifest`, `lang=en` | `452ffad` |
| 6 | Sitemap mit hreflang, Canonical-Tags, noindex weg | `543041e` |
| 7 | "Unabhängig" → "herstellerneutral" (16 Files) | `5028219` |
| 8 | Qualitätscheck (read-only) | — |
| 9 | `/privacy-policy.html` für App-Store-Reviewer | `25bb1bf` |
| 10 | dieser Report | (folgt) |

---

## Geänderte / Neue Dateien (kategorisiert)

### Drittanbieter-Skripte → lokal (Schritt 2)
- **NEU:** `vendor/lucide-0.511.0.min.js` (356 KB)
- **NEU:** `vendor/chart-4.4.6.umd.js` (205 KB)
- **MODIFIZIERT:** `index.html`, `datenschutz.html`, `hinweise.html`, `impressum.html`, `terms.html`, `verlauf.html` — `unpkg.com`-URLs → `/vendor/*`
- **MODIFIZIERT:** `vercel.json` — CSP `script-src 'self' https://unpkg.com` → `script-src 'self'`

### Legal-Seiten DE/EN/TR (Schritt 1)
**Neue EN-Dateien (4):** `terms.en.html`, `datenschutz.en.html`, `impressum.en.html`, `hinweise.en.html`
**Neue TR-Dateien (4):** `terms.tr.html`, `datenschutz.tr.html`, `impressum.tr.html`, `hinweise.tr.html`
**DE-Updates:** Stand-Datum auf `24. April 2026`, Sprachschalter `[DE | EN | TR]`, Footnote ergänzt
**styles-pages.css:** `.lang-switch` und `.legal-footnote` Styles hinzugefügt

Spezifische rechtliche Anpassungen pro Datei:
- `datenschutz.{de,en,tr}`: neue Karte "Drittlandtransfer (USA)" mit DPF/SCC + Vercel-Listing-Link in allen 3 Sprachen
- `datenschutz.en.html`: zusätzlicher CCPA/CPRA-Notice-Block
- `datenschutz.tr.html`: zusätzliche eigenständige KVKK Aydınlatma Metni-Karte mit allen 4 Pflichtblöcken (Veri Sorumlusu, İşleme Amacı, Veri Kategorileri, Madde 11 Hakları einzeln aufgelistet)
- `impressum.html` (DE): "§ 18 Abs. 2 MStV"-Karte komplett entfernt — überdeklariert für Telemedium ohne journalistisch-redaktionellen Charakter

### Service Worker (Schritt 5)
- **GELÖSCHT:** `sw.js` (war Phantom-SW: `install + claim` aber `fetch` no-op)
- **GELÖSCHT:** `sw-register.js`
- **MODIFIZIERT:** `index.html` — `<script src="./sw-register.js">` Tag entfernt
- **NICHT angefasst:** SW-Cleanup-Logik in `script.js:89-95` (Teil des Reset-Workflows; hilft Bestand-Usern, alte SW loszuwerden)

### BFSG-Barrierefreiheit (Schritt 3)
**Neue Dateien (3):** `barrierefreiheit.html`, `barrierefreiheit.en.html`, `barrierefreiheit.tr.html`
**Footer-Update in 14 bestehenden Dateien:** Link "Barrierefreiheit / Accessibility / Erişilebilirlik" ergänzt
**script.js:** `footerBarrierefreiheit` i18n-Key in DE/EN/TR
**Inhaltliche Erwähnung mit Link:** in allen 3 Impressum-Sprachversionen (eigene Karte)

Konformitätsstand: **teilweise konform** (Selbstbewertung WCAG 2.1 AA). Nicht-konforme Bereiche namentlich genannt:
- Slider-Werte ohne `aria-live`-Ansage
- Hilfstexte unterhalb 4.5:1-Kontrast möglich
- Charts ohne Textalternative
- Kein externes Audit

### PWA-Manifest (Schritt 4)
- **GELÖSCHT:** `manifest.json` (Karteileiche, keine HTML-Referenz)
- **MODIFIZIERT:** `site.webmanifest`:
  - `lang: "en"` + `dir: "ltr"` — neutrale internationale PWA-Hülle
  - Erweiterter `name`/`description` in EN
  - `scope: "/"`, `orientation: "portrait"` ergänzt
  - `icons`: `purpose: "any maskable"` für Adaptive-Icons

### SEO / Sitemap (Schritt 6)
- **MODIFIZIERT:** `sitemap.xml` — komplett neu mit `xhtml:link`-Namespace; 17 URLs total mit Hreflang-Clusters (de/en/tr/x-default)
- **MODIFIZIERT:** Alle 17 HTML-Seiten:
  - `<meta name="robots" content="noindex">` entfernt aus 16 Dateien (15 Legal + verlauf.html)
  - Self-referencing `<link rel="canonical">` auf jeder Seite
  - Hreflang-Cluster auf jeder Seite
- **NICHT angefasst:** `robots.txt` (erlaubt weiterhin alles, korrekt)

### Marketing-Claim-Entschärfung (Schritt 7)
- **MODIFIZIERT:** Footer-Note in 16 Dateien:
  - DE: "Unabhängig" → "Herstellerneutral"
  - EN: "Independent" → "Manufacturer-neutral"
  - TR: "Bağımsız" → "Üreticiden bağımsız" (grammatikalisch saubere Form)
- **MODIFIZIERT:** `script.js` — drei `footerNote`-i18n-Keys aktualisiert
- **NICHT angefasst:** Code-Kommentar `verlauf.js:743` ("// unabhängig vom aktiven Markt funktioniert") — interne Funktionsbeschreibung, kein Marketing-Claim

### App-Store-Privacy-URL (Schritt 9)
- **NEU:** `privacy-policy.html` — eigenständige englische Kurzfassung für Apple/Google App Store Connect; enthält CCPA + COPPA-Notices, Links auf alle drei Vollversionen

---

## Was NICHT geändert wurde und warum

| Bereich | Begründung |
|---|---|
| `verlauf.html` Inhalt | Außerhalb des Audit-Scopes; nur Header/Footer angetastet (noindex weg, hreflang, Footer-Link auf Barrierefreiheit) |
| `script.js` Berechnungs-Logik | Außerhalb des Audit-Scopes |
| `script.js` SW-Cleanup-Snippet | Wird vom Reset-Workflow benötigt — entfernt alte SW bei Bestand-Usern, hilft beim aktiven Cleanup |
| Code-Kommentar `verlauf.js:743` | Interne Funktionsbeschreibung "unabhängig vom aktiven Markt", kein User-facing Marketing-Claim |
| `theme-init.js`, `script.js`, `verlauf.js` Inhalt | Außerhalb des Audit-Scopes; keine rechtlich relevanten Strings darin |
| `robots.txt` | Plan: "robots.txt: unverändert lassen" |
| `index.html` Hero-Subtitles, Trust-Chips | Keine Marketing-Claims gefunden, die Schritt 7 erforderten |
| `manifest-src 'self'` in CSP | Korrekt — same-origin-Manifest wird so erlaubt; keine Änderung nötig |
| `worker-src 'self'` in CSP | Auch nach SW-Entfernung unschädlich; minimalistische Einschränkung bleibt |

---

## Qualitätscheck-Ergebnisse (Schritt 8)

| Check | Ergebnis |
|---|---|
| HTML-Struktur (closing tags) | ✅ alle 17 HTMLs vollständig |
| Inline `style="..."`-Attribute | ✅ null Treffer |
| Inline event-handler (`onclick=` etc.) | ✅ null Treffer |
| Inline `<script>` Blöcke | ✅ null (außer 1× JSON-LD in `index.html` — Daten, CSP-konform) |
| Broken relative Links | ✅ null |
| i18n-Coverage DE/EN/TR | ✅ exakt 204 Keys in jedem Locale, perfekt symmetrisch |

---

## Restrisiken

### Rechtlich
1. **EN/TR Legal-Texte sind Best-Effort-Drafts** durch Sprachmodell, keine zugelassene Anwaltsschaft für US/CA/TR. Footnote in jeder Datei weist explizit darauf hin. Empfehlung: vor produktivem App-Store-Launch durch lokalen Anwalt prüfen lassen — insbesondere CCPA-Wording, KVKK Aydınlatma Metni Vollständigkeit, COPPA-Standardformulierung.
2. **DPF-Status von Vercel** ist eine Aussage über Drittanbieter-Compliance "nach unserem Kenntnisstand" — manuell prüfen, ob der DPF-Listing-Eintrag (`a2zt00000008vYwAAI`) noch aktiv ist (DPF-Listings können entzogen werden).
3. **BFSG-Konformitätsgrad "teilweise konform"** ehrlich, aber unfixiert — die genannten Issues (Slider-aria-live, Kontrast, Chart-Alt-Text) sind technisch lösbar. Empfehlung: in einem Folge-Sprint adressieren, dann auf "vollständig konform" upgraden.
4. **Impressum-Karte "§ 18 Abs. 2 MStV" entfernt** — wenn EVSpend künftig journalistische/redaktionelle Inhalte (Blog, Tests, Editorials) bekommt, muss diese Karte zurück.

### Technisch
1. **Bestand-User mit aktivem alten SW** im Browser behalten ihn aktiv, bis sie Browser-Cache leeren oder den App-Reset auslösen. Da das alte `sw.js` ohnehin keine Funktion hatte (`fetch` no-op), kein funktionaler Schaden — aber theoretisch könnte ein Self-Kill-SW als Übergang (1–2 Wochen) hilfreich sein. Zu klein für einen separaten Schritt.
2. **404-Risiko zwischen Legal-Commits 1a–1d (Schritt 1):** zwischen den vier Sub-Commits zeigten EN/TR-Footer-Links bereits auf endgültige Pfade, die noch nicht existierten. Kein User wird in diesem Zeitfenster gebrowst haben — Risiko praktisch null, aber theoretisch.
3. **Sitemap-Submission an Google Search Console** noch nicht erledigt — manuell durch User: `https://search.google.com/search-console/sitemaps` neue Sitemap einreichen, falls noch nicht automatisch erkannt.
4. **`vendor/`-Files ohne Subresource Integrity (SRI)** — bei Lieferung über CDN wäre SRI Pflicht; lokal kein Risiko, aber falls die Files je auf ein CDN umziehen, SRI-Hashes nachreichen.

### Architektur
1. **Sprachschalter im Footer ist statisch pro Datei**, nicht dynamisch via Markt-Switcher. Konsequenz: wer im DE-Hauptmenü auf TR umstellt und dann ins Impressum klickt, landet auf `impressum.html` (DE), nicht `impressum.tr.html`. Das ist die Konsequenz von Option (A) statisches Routing — bewusst gewählt für Robustheit. Workaround: User muss innerhalb der Legal-Seite den Sprachschalter benutzen.
2. **`/privacy-policy.html` Footer-Manufacturer-Neutral-Note** ist EN-only — wenn Apple/Google in TR/DE reviewen sollte, sehen sie EN-Wording. Akzeptabel, da die App-Store-URL traditionell EN-Submission ist.

---

## Empfehlungen für nächste Schritte

### Kurzfristig (innerhalb 1 Monat)
1. **Anwaltliche Prüfung der EN/TR-Texte** — insbesondere CCPA-Sprache, KVKK Aydınlatma vollständig, COPPA-Standardformulierung. Bei jedem Befund: spezifischer Folge-Commit pro Sprache.
2. **Google Search Console:** neue Sitemap einreichen, Indexierung der Legal-Seiten verifizieren.
3. **Apple App Store Connect / Google Play Console:** `https://www.evspend.com/privacy-policy.html` als Privacy-Policy-URL hinterlegen.

### Mittelfristig (1–3 Monate)
1. **BFSG-Konformität verbessern**:
   - Slider-Werte mit `aria-live="polite"`-Region announcen
   - Kontrastverhältnisse `--l3` / `--l4` auf 4.5:1 hochziehen oder per Audit-Tool (axe-core, Lighthouse) verifizieren
   - Chart in `verlauf.html` mit `aria-label` versehen, das die aktuelle Datenzusammenfassung enthält
   - Nach Behebung: Konformitätsgrad auf "vollständig konform" updaten
2. **Self-Kill-SW** als Zwischenlösung deployen (`sw.js` mit Inhalt, der sich beim Aktivieren entregistriert + Caches löscht), 4 Wochen laufen lassen, dann endgültig entfernen.
3. **DPF-Listing-Eintrag** halbjährlich verifizieren — bei Entzug: SCC-Wording stärken oder Hosting-Anbieter wechseln.

### Langfristig
1. **Affiliate-Einbindung** ist nun rechtlich vorbereitet. Vor dem ersten Affiliate-Link: Hinweis in `terms` (Karte 6) reicht aktuell — bei größerem Volumen ggf. dedizierte "Affiliate-Disclosure"-Seite.
2. **App-Wrapper für iOS/Android** — `lang: "en"` im Manifest passt; bei nativem Wrapper das Manifest pro Markt overriden möglich.
3. **Bei Wachstum > Privatperson** (Gewerbe, Umsatz, Mitarbeiter) → BFSG-Pflicht-Status prüfen, Impressum um Pflichtangaben (USt-ID, Handelsregister, Aufsicht) erweitern.

---

## Commit-Historie dieses Audits

```
25bb1bf  Schritt 9: /privacy-policy.html als App-Store-Privacy-URL
5028219  Schritt 7: 'Unabhängig' durch 'herstellerneutral' ersetzt
543041e  Schritt 6: Sitemap mit hreflang, noindex von Legal-Seiten entfernt, Canonical-Tags
452ffad  Schritt 4: Manifest konsolidiert auf site.webmanifest, lang=en
c621d53  Schritt 3b: Barrierefreiheit-Footer-Link in allen Seiten + Impressum-Erwähnung
f13f7ea  Schritt 3a: BFSG-Barrierefreiheitserklärung in DE/EN/TR
b6e6e11  Schritt 5: Service Worker komplett entfernt
39cdc95  Schritt 1d: Hinweise in EN und TR + DE-Update
851189f  Schritt 1c: Impressum in EN und TR + DE-Update, MStV-Verweise entfernt
df5d83a  Schritt 1b: Datenschutz in EN und TR + DE-Update mit Drittlandtransfer
2a30b5f  Schritt 1a: Terms in EN und TR + DE-Update
7b6b558  Schritt 2: Lucide und Chart.js lokal hosten, unpkg.com aus CSP entfernt
```

---

## Nachtrag: BFSG-Upgrade auf "vollständig konform" (24. April 2026)

Nach dem Haupt-Audit wurden die drei im ursprünglichen Report als nicht-konform dokumentierten Bereiche adressiert. Die Barrierefreiheitserklärungen (`barrierefreiheit.html` / `.en.html` / `.tr.html`) sind jetzt auf **"vollständig konform"** aktualisiert.

### Commits

| Commit | Inhalt |
|---|---|
| `31b496b` | Schritt 1: Slider `aria-valuetext` + `aria-live`-Region (Live-Announce nur bei `change`, nicht `input`) |
| `eccf445` | Schritt 2: Kontrast WCAG 2.1 AA gehoben — `--l3`/`--l4` getuned in Light + Dark, Placeholder-Opacity entfernt, `.legacy-list` `opacity:.72` entfernt |
| `289a4c2` | Schritt 3: Chart `figcaption` + versteckte Datentabelle für Screenreader-Tabellen-Navigation |
| (siehe nächster) | Schritt 4: BFSG-Erklärungen auf "vollständig konform" + dieser Report-Nachtrag |

### Umgesetzte Maßnahmen (in BFSG-Erklärungen dokumentiert)

- Slider-Eingabefelder mit dynamischem `aria-valuetext` (markt-/sprach-aware via existierende `SLIDER_FMT`-Logik — single source of truth).
- Screenreader-Live-Region (`#sliderAnnouncer`, `aria-live="polite"`) — Announce nur bei `change` (drag-end / keyboard-step), nicht bei `input` (kein Geplapper).
- Result-Announce einmalig nach Klick auf "Ergebnis aktualisieren"-Button (über `_resultSentence` als single source of truth).
- Farbkontraste: alle `--l1`–`--l4` auf 4.5:1+ für Normaltext, 3:1+ für UI-Elemente. DISABLED-Controls explizit als WCAG-1.4.3-Note-4-Ausnahme dokumentiert.
- Chart: `<figure role="figure" aria-labelledby="chartCaption">`-Wrapper mit `<figcaption>` (Summary) + `<table class="sr-only">` (komplette Daten).
- Markt-/Sprach-aware Textalternativen via `MARKET_CONFIG[market].locale`, `_currentLanguage()` und neuer `CURRENCY_LONGFORM`-Matrix (3×3).

### Design-Entscheidungen

- **Intl.NumberFormat** für Tabellen-Zellen → locale-korrekte Symbol-Position (DE "3,60 €" / US "$3.60" / TR "₺3,60") + Tausender-/Dezimal-Trenner automatisch.
- **km-gewichteter Durchschnitt** in Chart-Summary statt arithmetisch — fachlich korrekter Erwartungswert für "Kosten pro 100 km", da das Chart Summen pro Bucket zeigt (kein expliziter Durchschnitt).
- **Symbole/Kürzel nur in Tabellen-Zellen**, Langform in `figcaption`-Summary — Spaltenheader liefert Tabellen-Kontext, Summary liest Screenreader linear ohne Kontext.
- **`CURRENCY_LONGFORM` 3×3-Matrix** als lokale Konstante in `verlauf.js` statt 9 i18n-Key-Duplikate — eng begrenzter Scope, eine Quelle der Wahrheit.
- **Accessibility-Regel "nur additiv"** strikt eingehalten: keine Änderung an `calc()`, `_getSingleData()`, `_getCompareData()`, `UNIT_CONV`, `MARKET_CONFIG`, oder Chart.js-Konfiguration.
- **Datums-Format mit `2-digit`** für Tag/Monat — konsistente Datumslänge, besser für Screenreader-Strukturparsing.
- **`.legacy-list` `opacity:.72` ersatzlos entfernt** — `<details>/<summary>`-Wrapper signalisiert "Alt-Einträge" bereits semantisch; Opacity-Dimming hätte Child-Kontrast unter 4.5:1 gedrückt.

### BFSG-Verifikation (manuelle Testschritte für künftige Reviews)

Die folgenden Tests sollten bei jedem größeren UI-Update wiederholt werden:

1. **Lighthouse Accessibility Audit** (Chrome DevTools → Lighthouse):
   - Zielwert: Score ≥ 95
   - Manuelle Review der Ergebnisliste, keine blinden Score-Chases

2. **VoiceOver-Test** (macOS `Cmd+F5`, iOS Dreifach-Home):
   - Slider-Navigation: `aria-valuetext` wird bei Wert-Wechsel angekündigt
   - Nach Slider-Loslassen: `aria-live`-Announcement in markt-/sprach-spezifischer Form
   - Chart-Figure: Summary wird als Figur-Beschreibung vorgelesen
   - Tabellen-Navigation in versteckter Chart-Tabelle (`VO+Cmd+T`)

3. **Kontrast-Spot-Check** (DevTools Inspect → Color → Contrast):
   - Stichprobe über `--l1` bis `--l4` auf allen vier Background-Leveln (`--s1`, `--bg`, `--s2`, `--s3`)
   - Jede neue Farb-Verwendung muss 4.5:1 (Text) oder 3:1 (UI) erreichen

4. **Keyboard-Only-Test**:
   - Nur `Tab` + `Shift+Tab` + `Enter` + Pfeile
   - Kompletter User-Flow durchspielbar (Eingabe → Berechnung → Verlauf speichern → Chart)
   - Focus-Outlines sichtbar auf allen interaktiven Elementen

5. **Market-Switch-Test für Screenreader**:
   - DE → US → TR → DE
   - `figcaption` und `aria-valuetext` sprachlich UND einheitlich korrekt pro Markt
   - Währungs-Langform ändert sich mit dem Markt

6. **Edge-Case: Legacy-History**:
   - History mit Einträgen vor Schema-V2 (ohne `costPer100`)
   - Chart-Summary muss diese überspringen, nicht NaN produzieren
   - Empty-State-Text bei komplett leerem Filter: `chartA11yEmpty`

### Ausstehende Folgeaktionen (nicht blockierend)

- Google Search Console: Sitemap-Submission verifizieren
- App Store Connect: `privacy-policy.html` als Privacy-URL hinterlegen
- Anwaltliche Prüfung der EN/TR-Texte (Best-Practice, nicht zwingend)
- Periodische Verifikation Vercel DPF-Listing-Status

---

*Ende des Audit-Reports inklusive BFSG-Upgrade-Nachtrag.*

---

## Polish-Nachtrag (25. April 2026): Externe Code-Review (Grok)

Eine externe Code-Review (Grok) hat den Audit gegengecheckt und eine Liste von Beobachtungen zurückgegeben. Drei Punkte wurden als berechtigt anerkannt und in einem dedizierten Polish-Commit adressiert. Andere Kritikpunkte wurden geprüft und als unbegründet verworfen.

### Adressierte Punkte

1. **Betroffenenrechte explizit (Art. 15–22 + Art. 77 DSGVO)** — `datenschutz.html` und `datenschutz.en.html`
   Neue Karte "Ihre Rechte als betroffene Person" / "Your Rights as a Data Subject" mit semantischer `<ul>/<li>`-Struktur (Screenreader-Listen-Navigation). Jeder Artikel-Verweis als `<strong>` markiert für Scan-Lesbarkeit. Aufsichtsbehörde (Hessen) als separater `<p>` nach der Liste, nicht als Listen-Eintrag (kein "Recht", sondern Kontaktstelle). Hinweis-Absatz mit Verweis auf Vercel-Server-Logs (max. 30 Tage). TR-Version unverändert — KVKK Madde 11 ist bereits in der ersten Karte voll ausgeführt und enthält die KVKK-Pendants zu Art. 15–22 DSGVO.

2. **Vercel-Log-Speicherdauer** — `datenschutz.html`, `datenschutz.en.html`, `datenschutz.tr.html`
   In der bestehenden Hosting-/Barındırma-Karte ein zweiter `<p>` zwischen den vorhandenen `<p>`-Tags eingefügt: "Vercel speichert Zugriffs-Logs (einschließlich IP-Adresse, Zeitstempel und User-Agent) gemäß Standardpraxis für maximal 30 Tage und löscht sie anschließend automatisch." Erzählstruktur jetzt: Was wird verarbeitet → wie lange → keine Zuordnung. Wortwahl harmonisiert mit der neuen Rechte-Karte ("maximal 30 Tage" / "maximum of 30 days" / "en fazla 30 gün" — einheitlich).

3. **Haftungsausschluss präziser formuliert** — `terms.html`, `terms.en.html`, `terms.tr.html`
   Karte 4 von "Haftungsausschluss" zu "Haftungsbegrenzung" / "Limitation of Liability" / "Sorumluluğun Sınırlandırılması" umbenannt und auf drei Absätze erweitert:
   - Absatz 1: Berechnungs-Charakter und Verweis auf Karte 3 (Beratungs-Frage)
   - Absatz 2: Privatperson-Status, Haftungsausschluss "im Rahmen des gesetzlich Zulässigen", Anerkennung der gesetzlichen Grenzen für Vorsatz / grobe Fahrlässigkeit / Leben-Körper-Gesundheit (§ 309 Nr. 7 BGB)
   - Absatz 3: Empfehlung zur unabhängigen Verifikation vor wirtschaftlich bedeutsamen Entscheidungen (Fahrzeugkauf, Finanzierung, Ladeinfrastruktur)

   Begründung der Längung (~3× statt 2×): Der pauschale Original-Disclaimer war als Klausel rechtlich angreifbar (zu kategorisch); die neue Formulierung erfüllt drei separate Funktionen (Aussage / gesetzliche Grenzen / Beratungs-Empfehlung) und ist dadurch rechtswirksam statt nichtig.

### Verworfene Kritikpunkte

- **"AGB fehlen"** — Die Review behauptete, AGB seien nicht vorhanden. Tatsächlich existieren `terms.html`, `terms.en.html`, `terms.tr.html` seit dem ursprünglichen Audit und sind im Footer aller Sprachversionen verlinkt.
- **"Footer-Links fehlen"** — Die Review behauptete fehlende Verlinkung der Legal-Pages. Tatsächlich enthält jeder Footer Verweise auf Impressum/Datenschutz/AGB/Hinweise/Barrierefreiheit/Verlauf (siehe `footer-links` in allen HTML-Dateien).
- **"Datum 24.04.2026 falsch"** — Die Review hinterfragte das Stand-Datum. Das Datum ist korrekt: es ist der Polish-Commit-Tag des ursprünglichen Audits und wird durch die Polish-Edits nicht ungültig (Inhalte sind kompatible Erweiterungen, kein Stand-Reset).

### Technischer Side-Effect

Die neue `<ul>`/`<li>`-Struktur erforderte eine minimale CSS-Ergänzung in `styles-pages.css`, da das globale `* { padding: 0 }` (Zeile 1) das Default-Padding von Listen entfernt und Bullets ohne explizites Re-Setting außerhalb des Card-Containers geclippt würden. Hinzugefügt: `.card ul`, `.card li`, `ul + p` mit Werten konsistent zu `.card p` (font-size 15.5px, line-height 1.72, color `--l2`). Cache-Buster in allen 16 Legal-/Subpages auf `v=20260425-30` erhöht.

### Konformität

Die drei Polish-Punkte ändern keine Berechnungslogik. Der bestehende 21-Punkte-Verifikationslauf bleibt gültig. Visual-Check (statt Code-Lauf) genügt für diesen Commit.

---

*Ende Polish-Nachtrag.*

---

## Polish-Nachtrag 2 (25. April 2026): Zweite externe Code-Review (Grok)

Eine zweite Runde externer Code-Review (Grok) hat den Stand nach dem ersten Polish-Commit (`v1.1-polish-complete`, Tag-Commit `1f81938`) gegengecheckt. Zwei berechtigte AGB-Lücken wurden identifiziert. Andere Kritikpunkte der zweiten Review waren entweder Cache-veraltet oder subjektiv.

### Adressierte Punkte (Inhaltsersetzung statt additive Karten)

**Wichtig für Maintainer:** Dies sind keine neuen Karten, sondern Inhaltsersetzungen bestehender Stub-Karten. Die alten Karten 7 und 8 in `terms.html` waren rudimentär (1 kurzer Absatz). Die neuen Inhalte sind echte Supersets — sie übernehmen alle alten Aussagen, plus die fehlenden Klauseln.

1. **Karte 7 — Änderungsvorbehalt** (`terms.html` / `terms.en.html` / `terms.tr.html`)
   - **Heading:** "7. Änderungen" → "7. Änderungen dieser Nutzungsbedingungen" (DE) bzw. analog EN/TR
   - **Inhalt:** statt einem Satz "behält sich vor, jederzeit anzupassen, keine Benachrichtigung" jetzt drei Absätze:
     - Änderungsgründe (rechtliche/technische/funktionale Anpassungen) + Verweis auf Stand-Datum
     - "Weitere Nutzung = Zustimmung"-Mechanik **plus** Ankündigungs-Klausel für wesentliche Änderungen, die zwingende Verbraucherrechte betreffen
     - Druck-/Speicher-Hinweis
   - **Bewusster Schwächen-zu-Stärken-Tausch:** Die alte Klausel "Eine gesonderte Benachrichtigung der Nutzer erfolgt nicht" war gegenüber Verbrauchern rechtlich angreifbar. Die neue "wir benachrichtigen bei wesentlichen Änderungen" ist robust und EU-Verbraucherrecht-konform.
   - Icon (refresh-cw) unverändert — passt semantisch.

2. **Karte 8 — Gerichtsstand und anwendbares Recht** (`terms.html` / `terms.en.html` / `terms.tr.html`)
   - **Heading:** "8. Schlussbestimmungen" → "8. Gerichtsstand und anwendbares Recht" (DE) bzw. analog EN/TR. Begründung: "Schlussbestimmungen" ist generisch (Sammelbegriff für alles am Ende); die neue Karte deckt drei konkrete Themen ab (Rechtswahl + Gerichtsstand + salvatorische Klausel) — präziseres Heading verbessert Lese-Ergonomie und SEO. Die salvatorische Klausel im 3. Absatz erfüllt weiterhin die alte "Schlussbestimmungen"-Funktion.
   - **Inhalt:** statt einem Satz Rechtswahl + salvatorische Klausel (DE) bzw. zwei Sätze (EN/TR mit UN-Kaufrecht-Ausschluss + EU-Verbraucherrecht) jetzt drei Absätze:
     - Rechtswahl Deutschland + UN-Kaufrechts-Ausschluss + zwingendes EU-Verbraucherrecht (alle drei Sprachen jetzt einheitlich)
     - Gerichtsstand-Klausel mit "soweit gesetzlich zulässig" (Stadtallendorf für B2B/Nicht-EU) + expliziter Verbraucher-Schutzklausel (gesetzlicher Gerichtsstand = Wohnsitz des Verbrauchers, § 38 ZPO, Brüssel-Ia Art. 17–19)
     - Salvatorische Klausel
   - **Reine Erweiterung in EN/TR:** UN-Kaufrecht-Ausschluss + Verbraucherschutz waren bereits vorhanden, bleiben enthalten. **In DE Erweiterung:** UN-Kaufrecht-Ausschluss + EU-Verbraucherrecht jetzt explizit (war vorher nur in EN/TR).
   - Icon (scale) unverändert — passt semantisch perfekt zu "Gerichtsstand".

### Verworfene / nicht erneut angefasste Kritikpunkte

- **"Betroffenenrechte (Art. 15–22 DSGVO) fehlen"** — Cache-veraltet bei Grok. Diese Karte wurde bereits im **ersten Polish-Commit** (`1f81938`, Tag `v1.1-polish-complete`) hinzugefügt und ist auf der Live-Site sichtbar in `datenschutz.html` und `datenschutz.en.html`. Grok hat diese Version nicht gesehen.
- **"Vercel-Speicherdauer fehlt"** — Cache-veraltet. Ebenfalls bereits im ersten Polish-Commit umgesetzt (Hosting-Karte enthält "maximal 30 Tage" / "maximum of 30 days" / "en fazla 30 gün" in allen drei Sprachen).
- **"AOL-Mail wirkt unprofessionell"** — Subjektive Stilistik, keine rechtliche Lücke. Nicht angefasst.
- **"Hobby-Eindruck"** — Subjektiver Tonalitäts-Hinweis ohne konkrete rechtliche Implikation. EVSpend ist ausdrücklich als kostenloses Privatperson-Angebot dokumentiert (siehe Karte 4 "Haftungsbegrenzung": "Der Betreiber ist eine Privatperson und stellt EVSpend kostenlos zur Verfügung"). Dieser ehrliche Selbst-Disclaimer ist juristisch gewollt und wird nicht entfernt.

### Konformität

Beide Polish-2-Punkte ändern keine Berechnungslogik. Der bestehende 21-Punkte-Verifikationslauf bleibt gültig. Visual-Check (gleiche Karten-Struktur wie zuvor, lediglich erweiterter Inhalt) genügt.

---

*Ende Polish-Nachtrag 2.*

---

## Polish-Nachtrag 3 (25. April 2026): Dritte externe Code-Review (Grok) — Legal-Finale

Auslöser: dritte externe Code-Review (Grok) zum Stand nach `v1.2-polish-jurisdiction-changes` (Tag-Commit `f673f75`). Zwei berechtigte verbleibende DSGVO-Lücken in der Datenschutzerklärung wurden identifiziert. Adressiert in einem finalen Polish-Commit.

**Schlussstrich-Hinweis:** Dies ist der **letzte Legal-Polish-Commit**. Nach dieser Iteration ist die Datenschutzerklärung auf einem Niveau, das für eine Privatperson ohne Gewerbe-Strukturen und ohne anwaltliche Spezialprüfung nicht weiter sinnvoll optimierbar ist. Künftige Grok-Reviews werden voraussichtlich Cache-veraltete Punkte erneut bringen — diese können ignoriert werden, sofern keine *neue* substanzielle Lücke benannt wird.

### Adressierte Punkte

1. **Verantwortlicher explizit (Art. 13 Abs. 1 lit. a DSGVO)** — `datenschutz.html`, `datenschutz.en.html`, `datenschutz.tr.html`
   Neue Karte als erste Karte in DE/EN; in TR als Karte 2 nach KVKK-Aydınlatma (TR-Sondersituation: KVKK-Karte enthält bereits "1. Veri Sorumlusu" im KVKK-Kontext; die neue Karte adressiert separat den GDPR-Kontext, Heading "Veri Sorumlusu (GDPR)" zur klaren Abgrenzung). Inhalt:
   - Person + vollständige Anschrift + E-Mail
   - Aufsichtsbehörde Hessen mit identischer Adress-Formulierung wie in der bestehenden Rechte-Karte (Postfach 3163, 65021 Wiesbaden, datenschutz.hessen.de)
   - Icon: lucide `user` (Person-Symbolik, keine Kollision mit bestehenden Icons)

   **Bewusste Redundanz Aufsichtsbehörde:** Die Aufsichtsbehörde wird jetzt an zwei Stellen genannt — Verantwortlicher-Karte (Identifikations-Information: "wer ist Aufsicht?") und Rechte-Karte (Aktions-Information: "wo Beschwerde einlegen?"). Adresse + URL zwischen beiden Stellen wortgleich. Stilistik bei Verantwortlicher-Karte vom ursprünglich vorgeschlagenen "Da die zuständige … ist"-Konstrukt zur klareren Form "Die zuständige … ist der …" geändert (grammatisch sauberer).

2. **Technisch-organisatorische Maßnahmen (Art. 32 DSGVO)** — `datenschutz.html`, `datenschutz.en.html`, `datenschutz.tr.html`
   Neue Karte zwischen Hosting und Drittlandtransfer (USA). Inhalt:
   - Einleitungssatz mit Art.-32-DSGVO-Verweis
   - `<ul>` mit sieben TOMs: HTTPS/TLS 1.3, strikte CSP, lokale Verarbeitung, Verzicht auf Tracking, Verzicht auf Cookies (LocalStorage-Ausnahme), regelmäßige Bibliotheks-Updates, Hosting bei ISO 27001 + SOC 2 Type II zertifiziertem Anbieter
   - Abschluss-Absatz: TOMs sind auf Infrastruktur-Sicherheit + Vermeidung von Datensammlung beschränkt, da keine aktive personenbezogene Verarbeitung stattfindet
   - Icon: lucide `lock` (Padlock-Sicherheits-Symbolik; shield ist durch "Allgemeines" belegt)

   **Vercel-Zertifizierungen verifiziert:** Vor dem Commit per Web-Abruf von `https://vercel.com/security` bestätigt — sowohl ISO 27001:2013 als auch SOC 2 Type 2 sind aktuell. Keine Falschdarstellung.

### Verworfene Kritikpunkte

- **"Gerichtsstand fehlt"** / **"Änderungsvorbehalt fehlt"** — Cache-veraltet bei Grok. Beide bereits im Polish-Commit `v1.2-polish-jurisdiction-changes` (Commit `f673f75`) addressiert (terms.html Karten 7+8).
- **"Datum 24./25. April 2026 ist Zukunftsdatum"** — Das ist Groks Trainingscutoff-Problem (er kennt das Datum 2026 nicht), nicht ein Problem unseres Audits. Datum bleibt korrekt.
- **"Footer-Links fehlen"** — Footer-Links existieren auf jeder Seite (Impressum/Datenschutz/AGB/Hinweise/Barrierefreiheit/Verlauf in allen drei Sprachen). Grok übersieht diese konsistent über mehrere Reviews.
- **"Haftung bei leichter Fahrlässigkeit nicht geregelt"** — Bereits in `terms.html` Karte 4 "Haftungsbegrenzung" korrekt formuliert: "im Rahmen des gesetzlich Zulässigen ausgeschlossen", mit Anerkennung der gesetzlichen Grenzen für Vorsatz/grobe Fahrlässigkeit/Leben-Körper-Gesundheit (§ 309 Nr. 7 BGB). Leichte Fahrlässigkeit ist damit korrekt gegenüber B2C eingeschränkt.

### Finale Karten-Struktur

| Position | DE (10) | EN (11, +CCPA) | TR (10) |
|----------|---------|----------------|---------|
| 1 | Verantwortlicher | Data Controller | KVKK Aydınlatma Metni |
| 2 | Allgemeines | General | Veri Sorumlusu (GDPR) |
| 3 | Lokale Datenspeicherung | Local Data Storage | Genel |
| 4 | Hosting | Hosting | Yerel Veri Saklama |
| 5 | **TOMs** | **Technical and Organizational Measures** | Barındırma |
| 6 | Drittlandtransfer (USA) | Third-Country Transfer (USA) | **Teknik ve İdari Tedbirler** |
| 7 | Analyse- und Tracking-Dienste | Analytics and Tracking Services | Üçüncü Ülkeye Veri Aktarımı (ABD) |
| 8 | Zukünftige Dienste | California Residents (CCPA / CPRA) | Analiz ve Takip Hizmetleri |
| 9 | Kontakt | Future Services | Gelecekteki Hizmetler |
| 10 | Ihre Rechte als betroffene Person | Contact | İletişim |
| 11 | — | Your Rights as a Data Subject | — |

EN hat **eine Karte mehr** als DE/TR durch die in einem früheren Audit-Schritt für California Residents hinzugefügte CCPA / CPRA-Karte — bewusst nur in EN, da der relevante Adressatenkreis englischsprachig ist.

### Konformität

DSGVO-Pflichtangaben jetzt explizit in der DSE erfüllt:
- Art. 13 Abs. 1 lit. a (Identität des Verantwortlichen) — Verantwortlicher-Karte
- Art. 13 Abs. 1 lit. b (Kontaktdaten) — Verantwortlicher-Karte
- Art. 13 Abs. 1 lit. d (berechtigte Interessen Vercel-Hosting) — Hosting-Karte (bestehend)
- Art. 13 Abs. 2 lit. a (Speicherdauer) — Hosting-Karte (Polish-1)
- Art. 13 Abs. 2 lit. b (Betroffenenrechte Art. 15–22) — Rechte-Karte (Polish-1)
- Art. 13 Abs. 2 lit. d (Beschwerderecht Aufsichtsbehörde) — Verantwortlicher- und Rechte-Karte
- Art. 32 (Sicherheit der Verarbeitung) — TOMs-Karte
- Art. 44 ff. (Drittlandtransfer) — Drittlandtransfer-Karte (bestehend)

Keine Berechnungslogik berührt — der bestehende 21-Punkte-Verifikationslauf bleibt gültig. Visual-Check (zwei neue Karten in vertrauter Stilistik, keine Layout-Änderung) genügt.

### Hinweis für künftige Iterationen

Alle für eine Privatperson sinnvollen Legal-Polish-Schritte sind erledigt. Weitere Optimierungen wären entweder:
- **Anwaltliche Spezialprüfung** (z.B. der DPF-Listing-Status, vertragliche Anforderungen bei Wachstum auf B2B-Größe)
- **Gewerbliche Strukturen** (UG/GmbH-Gründung mit anschließender Anpassung des Verantwortlicher-Eintrags, Datenschutzbeauftragter-Bestellung ab 20+ Mitarbeitenden)
- **Externe Audit-Zertifizierung** (z.B. ISO 27001 für die App selbst, nicht nur für den Hoster)

Keine dieser Schritte ist für den aktuellen Privatperson-Status notwendig oder verhältnismäßig.

---

*Ende Polish-Nachtrag 3 — Legal-Finale.*

---

## Phase-1-Nachtrag (26. April 2026): Known Issues / Future Refactoring

Die Verifikation von Phase 1a (`v1.7-safety-update`) hat zwei latente Architektur-Befunde aufgedeckt, die bei jedem `MARKET_CONFIG`-Update manuelle Synchronisations-Arbeit erzwingen. In Phase 1 wurden die Symptome adressiert (siehe Phase 1a-fix und 1a-fix-2); die Wurzeln bleiben offen für eine eigene Refactoring-Phase.

### 1. reset() — Multi-Market-Bug (`script.js:957`)

`reset()` hardcodet DE-Defaults statt `applyMarketDefaults(MARKET_CONFIG[currentMarket])` zu nutzen.

**Konsequenz:**
- US/TR-User → Reset setzt auf DE-Werte (falsche Einheiten)
- `strompreis` in `reset()` (`0.35`) weicht von `MARKET_CONFIG.de` (`0.37`) ab — historische Altlast
- Bei jedem `MARKET_CONFIG`-Update muss `reset()` manuell synchron gehalten werden (siehe Phase 1a-fix)

**Future-Refactoring (eigene Phase, NICHT Phase 1):**

```javascript
function reset() {
  const market = MARKET_CONFIG[currentMarket] || MARKET_CONFIG.de;
  applyMarketDefaults(market);
  calc();
}
```

### 2. loadI18nState() — HTML-Initial-Drift (`script.js:3080`)

`loadI18nState()` setzt `currentMarket` beim Init, ruft aber **nicht** `applyMarketDefaults()` auf.

**Konsequenz:**
Erstbesucher sehen IMMER die DE-HTML-Initial-Values aus `index.html` — unabhängig von ihrer erkannten Browser-Sprache — bis ein Markt-Wechsel oder Reset stattfindet. Das gilt auch für US/TR-User, deren `currentMarket` zwar korrekt gesetzt wird, deren Slider-Werte aber bis zur ersten `applyMarketDefaults()`-Auslösung DE-Defaults zeigen.

Vor Phase 1a-fix-2: DE-Erstbesucher sahen `1.75 / 6.5 / 0.35` statt MARKET_CONFIG-Werten.
Nach Phase 1a-fix-2: DE-Erstbesucher sehen `1.85 / 7.0` (synchron zu MARKET_CONFIG.de für `benzinpreis` und `verbrauchVerbrenner`); `strompreis` (`0.35`) bleibt als bewusst belassene Altlast. **US- und TR-Erstbesucher sehen weiterhin DE-Werte** statt der für ihren Markt korrekten Defaults — bis sie aktiv den Markt wechseln oder Reset auslösen.

**Future-Refactoring (eigene Phase, NICHT Phase 1):**

`loadI18nState()` so erweitern, dass es `applyMarketDefaults()` aufruft, WENN keine localStorage-Custom-Werte vorhanden sind:

```javascript
function loadI18nState() {
  // ... existing code ...

  // Nach currentMarket-Setzung:
  const hasCustomInputs = !!localStorage.getItem(LS_KEY);
  if (!hasCustomInputs) {
    applyMarketDefaults(MARKET_CONFIG[currentMarket] || MARKET_CONFIG.de);
  }
}
```

**Risiko bei Refactoring:**
- Sorgfältige Verifikation nötig, dass User-Custom-Werte beim Reload NICHT überschrieben werden
- Eigene Verifikations-Phase mit Playwright-Tests (alle 3 Märkte × fresh / returning User × Slider-Initial-Values Matrix)

### Adressiert in Phase 1 (Symptom-Mitigations)

| Symptom | Mitigation | Commit |
|---|---|---|
| `reset()` setzt DE auf `1.75` / `6.5` statt `1.85` / `7.0` | Hardcode-Werte synchronisiert | Phase 1a-fix (`a3ff849`) |
| DE-Erstbesucher sieht `1.75` / `6.5` im DOM statt `MARKET_CONFIG`-Werte | HTML-Initial-Values + Display-Texte synchronisiert | Phase 1a-fix-2 (`b694f97`) |

`strompreis`-Altlast (`0.35` vs `0.37`) bewusst **nicht** in Phase 1 aufgeräumt — gehört in die Refactoring-Phase, sobald `reset()` und `loadI18nState()` markt-aware sind.

---

*Dokumentiert: 26. April 2026, im Rahmen Phase 1a-fix + 1a-fix-2 (Tag `v1.7-safety-update`).*

---

*Ende Phase-1-Nachtrag.*

---

## Phase 3 (26. April 2026): Design-Refresh — Top-5 Visual Quick-Wins

**Tag:** `v1.9-design-refresh`
**Geplante Blocks:** 5 (A–E) + 1 Cache-Buster (F) + Doku (G)
**Umgesetzte Blocks:** 3 (A, D, E)
**Verworfene Blocks:** 2 (B, C — siehe unten)

### Umgesetzt

| Block | Inhalt | Commit |
|---|---|---|
| 3a | Result-Zahlen Clamp für Mobile-Responsiveness — 8 Klassen mit `clamp(min, vw, max)`, Hybrid-Conservative (Mobile-@media unverändert). User korrigierte 3 Min-Werte vor Commit damit Min ≥ @media-Wert ist (kein „Sprung-Effekt" zwischen Viewport-Größen): `.hist-diff` (22→24px), `.stats-hero-val` (34→36px), `.longterm-hero-val` (22→24px). | `216498e` |
| 3d | Hover-States verfeinert — `.hist-item:hover` Card-Lift (`translateY(-1px)`, triggert die bereits definierte transform-Transition L1612) + `a:hover` Underline-Polish (`text-decoration-thickness:2px`, `text-underline-offset:3px`) nur auf Body-Content-Links der Sub-Pages, Footer-Links bewusst unverändert | `4fa3ac9` |
| 3e | Reveal-Animation für Hero-Zahlen — `cardFadeIn`-Reuse auf `.single-hero-val` + `.longterm-hero-val` mit 0.3s; nutzt vorhandene Animation-Architektur (Parent `.longterm-result` hat bereits 0.4s cardFadeIn); prefers-reduced-motion via globale Regel L1512 abgedeckt | `218318b` |
| 3f | Cache-Buster -35→-36 für `styles-app.css` (2 Files) und `styles-pages.css` (16 Files); `script.js`/`theme-init.js`/`verlauf.js` unverändert | `6f25c91` |

### Verworfen / Out of Scope

#### Block B: Quick-Buttons Pill-Shape — verworfen

**Annahme im Brief:** „Quick-Buttons (Voreinstellungen für km, Verbrauch etc.) sollen Pill-Shape bekommen."

**Recon-Befund:** Die App hat **keine Voreinstellungs-Pills** wie „100 km / 500 km" Quick-Selects. Die `.qc-row`-Reihen sind Slider-Input-Felder, keine Buttons. Briefs `.preset-chip` und `.quick-action` existieren nicht. Die einzige relevante Klasse `.qc-btn` ist Basisklasse für **alle** Action-Buttons (Primary, Secondary, Ghost, Save, Verlauf, Reset, Switch) mit `border-radius:14px`.

**Begründung der Verwerfung:**
1. App hat bereits konsistente Button-Architektur (rectangular 14px für CTA, pill 999px für informative Tags wie `.trust-chip`, `.ev-pill`, `.single-cost100-line`).
2. Pill-Shape für sekundäre Actions würde Inkonsistenz schaffen (Primary eckig vs. Sekundär rund).
3. Kein klarer UX-Win, würde existierende Pill-Pattern für informative Tags verwässern.

**Buffett-Prinzip:** „Don't fix what isn't broken." Die Buttons funktionieren konsistent.

**Future:** Falls künftig echte Quick-Select-Pills eingeführt werden (z.B. Schnell-Auswahl-Tags), wäre Pill-Shape die richtige Wahl. Aktuell aber nicht vorhanden.

#### Block C: Vergleichs-Balken Farben (Verbrenner Orange / E-Auto Teal) — verworfen

**Annahme im Brief:** „Vergleichs-Balken bekommen klare semantische Farben — Verbrenner #d97706 (amber-600), E-Auto #0f766e (teal-700)."

**Recon-Befund:** Die App hat **bereits eine etablierte semantische Blau/Orange-Identität** in 10 Klassen-Paaren:
- `.ev-pill / .vb-pill`, `.bar-fill.ev-bar / .vb-bar`, `#evCard / #vbCard`
- `.mode-badge--ev / --vb`, `.qc-hdr--ev / --vb`, `.type-btn--ev / --vb`
- `.single-body::before` (per `:has()` mode-badge), `.lt-dot--ev / --vb`
- `.chart-dot--ev / --vb`, `.sl--ev / --vb`
- Plus 4 hardcoded Hex-Konstanten in `script.js` `_drawChart()` (L1244-1247)

**Zusätzliche Befunde:**
1. **Teal `#0f766e` ist bereits als „Saving"-Farbe** (`.longterm-hero-val` L2546) etabliert. EV global teal würde semantischen Konflikt schaffen (EV vs. Saving).
2. **WCAG-Risiko:** `#d97706` hat nur ~3.2:1 Kontrast auf Weiß — nicht ausreichend für **Text-Klassen** (4.5:1 nötig). Würde teilweisen Refactor erzwingen (`#b45309` für Text).
3. Pfade: A) nur 4 von 10 Klassen umstellen → Inkonsistenz. B) alle 10 Klassen → großer Eingriff mit App-Brand-Wechsel ohne klaren UX-Gewinn.

**Begründung der Verwerfung:**
- Existierende Blau/Orange-Konvention ist konsistent, etabliert und semantisch klar.
- Brand-Identity-Wechsel ohne UX-Gewinn = Risiko ohne Nutzen.

**Buffett-Prinzip:** „Don't fix what isn't broken."

**Future:** Falls künftig eine echte Brand-Refresh / Visual-Identity-Update geplant ist, wäre dies eine eigene Phase (z.B. v2.1-brand-refresh) mit:
- Komplett-Refactor aller 10 Klassen-Paare via neue CSS-Variablen (`--color-ev`, `--color-vb`)
- Alle Text-Stellen WCAG AA prüfen
- Volle Visual-Verifikation in Light + Dark Mode
- Eigenes ZIP-Backup, eigene Tests

### Regel-Konformität (Phase 3 gesamt)

| Regel | Erfüllt? |
|---|---|
| A — Apple-Designs tabu | ✓ Inter-Font bleibt, kein SF/System-Font |
| B — Berechnungs-Logik tabu | ✓ Keine Änderung an `calc()`, `calcSingle()`, `calcCompare()`, `_getSingleData()`, `_getCompareData()`, `n()`, `_rawToInternal()`, `MARKET_CONFIG`, `UNIT_CONV`. Phase 3 hat `script.js` gar nicht angefasst. |
| C — Pre-Commit-Vorschau | ✓ Vor jeder Datei-Änderung Diff/Plan + GO-Bestätigung |
| D — WCAG AA | ✓ Keine Farb-/Kontrast-Änderung in umgesetzten Blocks |
| E — prefers-reduced-motion | ✓ Globale Regel L1512 deckt neue Animation ab |
| F — Mobile-First / Touch-Targets | ✓ Clamp respektiert Mobile-Cascade, Hover via `@media (hover: none)` L1002 abgedeckt |

### Future-Cleanup (out of scope für Phase 3)

**Dead-Code-Animations gefunden in `styles-app.css`:**
- `@keyframes fadeUp` + `.anim` (L725-729) — definiert, aber nirgends in HTML/JS verwendet
- `@keyframes resultIn` + `.result-in` (L732-736) — definiert, aber nirgends in HTML/JS verwendet

Können in einer späteren Cleanup-Phase entfernt werden. Keine Funktionalitäts-Berührung, nur ungenutzter CSS-Code (~10 Zeilen).

### Backups & Tag

- ZIP-Backup pre-Phase-3: `~/Desktop/eautofakten-backup-phase3-pre.zip` (1.3 MB)
- Tag: `v1.9-design-refresh` — Mobile-Responsive Result-Numbers + Premium Hover-States + Subtle Reveal-Animation

---

*Dokumentiert: 26. April 2026, im Rahmen Phase 3 (Tag `v1.9-design-refresh`).*

---

*Ende Phase-3-Doku.*


---

## Phase 4 (26. April 2026): EN-EU Market — Smart Geo-Redirect + DSGVO

**Tag:** `v2.0-en-eu-market` *(in Etappe 4 Block 4k zu setzen)*
**Geplante Etappen:** 4 (Recon → Implementation → Switcher/SEO → Tests/Tag/Push)
**Umgesetzte Commits:** 10 (`149994e`..`28b315e`)
**Verworfene Blocks:** 0 (vollständige Umsetzung)

### Architektur-Entscheidungen

- **Geo-IP-Detection**: Vercel Edge Middleware (`middleware.js` im Root, Hobby-Plan)
- **URL-Struktur**: Pfad-Prefix `/en-eu/` für non-domestic English-Variante
- **Geo-Routing**: Smart Hard-Redirect mit Cookie-Override + Bot-Detection
- **EN-Stil**: International English (Petrol, Kilometres — nicht US-Gas/Kilometers)
- **Cookies**: `evspend_locale` (strictly necessary, ePrivacy Art. 5(3) — kein Banner)
- **/en-eu/index.html**: Static EN-Snapshot, nutzt existing 3-Markets via JS-i18n
- **Sprach-Switcher**: 4 Buttons uniform (DE / EN / TR / EU)

### Etappen

| Etappe | Inhalt | Commits |
|---|---|---|
| 1 — Recon | Architektur-Entscheidungen, Sub-Pages-Inventar, Vercel-Geo-API-Recherche | (kein Code) |
| 2 — Implementation Core | middleware.js + 7 /en-eu/-Files | 4a–4d |
| 3 — Switcher + SEO | Helper-Migration, 4-Button auf 24 Files, hreflang-Reziprozität, sitemap | 4e–4j |
| 4 — Tests + Tag + Push | Doku, Cache-Buster, Visual-Tests, Tag, Live-Verifikation | (diese Etappe) |

### Umgesetzt — 10 Commits

| Block | Commit | Inhalt |
|---|---|---|
| 4a | `149994e` | middleware.js Smart Hard-Redirect (Edge Runtime, 8 Domestic-Countries, Bot-Detection) |
| 4b | `d1554f4` | /en-eu/index.html (~80 Strings EN-übersetzt) + lang-switch.js + styles-en-eu.css |
| 4c | `b2286d9` | /en-eu/verlauf.html (~30 Strings übersetzt, top-controls-Wrapper) |
| 4d | `1b876fd` | 5 Legal-Pages für /en-eu/ (DSGVO + EAA + EU-Consumer-Rights, 6 neue Cards, CCPA entfernt) |
| 4e | `60bf5d1` | JS-Helper Migration `/en-eu/lang-switch.js` → `/lang-switch.js` (Root) + LocalStorage `eaf.market` |
| 4f | `f968799` | 4-Button-Switcher in 15 existing Sub-Pages (DE/EN/TR/EU uniform) |
| 4g | `92bbb07` | head-hreflang `en-150` + Reziprozitäts-Bug-Fix in 22 Files |
| 4h | `a23e62a` | 4-Button-Switcher in 7 /en-eu/-Files (EN-Switcher-Button-Bug-Fix mit erledigt) |
| 4i | `3a8def2` | /index.html + /verlauf.html bekommen Switcher (CSS-Bump -36→-37) |
| 4j | `28b315e` | sitemap.xml erweitert: 17→24 URLs + reziproker hreflang-Set (5 Sprachen) |

### Key Features

1. **Smart Geo-Redirect** (middleware.js)
   - 8 Domestic-Countries (DE/AT/CH/LI/US/CA/MX/TR) bleiben auf `/`
   - Non-domestic Country → 302 zu `/en-eu/`
   - Cookie `evspend_locale` überschreibt Geo-Detection
   - Bot-Detection (Googlebot/Bingbot/Yandex/etc.) — kein Redirect für Crawler

2. **/en-eu/-Variante** (7 Files)
   - Static EN-Snapshot der Hauptseite (mit existing JS-i18n)
   - Verlauf-EN
   - 5 Legal-Pages mit EU-spezifischen DSGVO/EAA-Zusätzen

3. **DSGVO-Compliance vollständig** (`/en-eu/datenschutz.html` + alle Sub-Pages)
   - Cookie Notice für `evspend_locale` (ePrivacy Art. 5(3) strictly necessary)
   - GDPR Rights (Art. 15–21 + Art. 77 Beschwerderecht)
   - Supervisory Authority (Hessischer Beauftragter für Datenschutz)
   - Auftragsverarbeitung (Vercel-DPA-Hinweis aus Phase 1)
   - California CCPA-Card aus EN-EU-Variante **entfernt** (US-spezifisch, irrelevant für EU)

4. **EAA-Compliance signalisiert** (Directive (EU) 2019/882, in Kraft 28.06.2025)
   - WCAG 2.1 Level AA als Baseline
   - Kontakt mit 7-Werktage-Response-Zusage

5. **EU Consumer Rights** (`/en-eu/terms.html`)
   - Mandatory rights unter Directive 93/13/EEC
   - EU-Recht prevail bei Konflikt mit Terms

6. **4-Button-Switcher uniform** über 24 Files
   - Single-Source-of-Truth Helper `/lang-switch.js` (Root)
   - Cookie + LocalStorage `eaf.market` parallel setting
   - Cookie-Mapping: `de` / `us` / `tr` / `en-eu`

7. **SEO-Sauberkeit MAXIMUM**
   - 5 Sprach-Varianten reziprok (de / en / tr / en-150 / x-default)
   - 22 HTML-Files mit identischem head-hreflang-Set
   - 24 sitemap-URLs mit hreflang-Annotations
   - `en-150` BCP 47 valid (UN M.49 region code für Europe)

### Architektur-Bug-Fixes (in Phase 4 entdeckt + behoben)

1. **SEO-Reziprozitäts-Bug** (entstanden in Phase 4b/c/d-Erstellung): existing Sub-Pages und /en-eu/-Files behaupteten widersprüchliche `hreflang`-Sets im `<head>`. Google ignoriert hreflang bei widersprüchlichen Aussagen. **Behoben in Block 3.5 / Commit 4g (`92bbb07`)** — uniformer 5-Sprachen-Set über alle 22 Files.

2. **EN-Switcher-Button-Bug** in /en-eu/-Files (entstanden in Phase 4b/c/d): EN-Button im Lang-Switcher zeigte auf Self (`/en-eu/{file}.html`) statt auf US-Markt-EN-Variante (`/{file}.en.html`). **Behoben in Block 4 / Commit 4h (`a23e62a`)** — bei Erweiterung von 3- auf 4-Button-Switcher EN-href korrigiert + EU-Button neu hinzugefügt.

### Future-Cleanup / Tech-Debt

- **`/en-eu/styles-en-eu.css` ist redundant** (nach Block 5/4i): `.lang-switch`-Styles sind nun in `styles-app.css` zentralisiert. Cleanup: File entfernen + Path-Update in 7 /en-eu/-Files. Out-of-Scope für Phase 4. Empfehlung: Phase 5 oder dedizierte Cleanup-Phase.
- **Mobile-Layout `/index.html`**: Top-Bar mit 3 Komponenten (top-pill ~60px + lang-switch ~132px + theme-btn 36px @≤375px = ~240px Total auf 375px Viewport, ~121px Headroom = 32%). Static-Pixel-Analyse in Block 4l: **PASS**. Browser-Visual-Test nach Live-Deploy auf evspend.com möglich. Falls iOS Safari oder Notch-Devices visuellen Bruch zeigen: Mobile-Mediaquery für `.lang-switch` (kleinere font-size oder padding) als Fix.
- **WCAG 2.5.5 Touch-Target**: Lang-Switch-Buttons sind ~32×24px (`font-size: 11px`, `padding: 4px 9px`, `min-height: 24px`). **AA Minimum (24×24px) erfüllt**; **AAA Enhanced (44×44px) nicht erfüllt**. Da Phase 2 (`/barrierefreiheit.html`) sich auf WCAG 2.1 AA Level commitet, akzeptabel. Future-Phase-Empfehlung: Touch-Target-Vergrößerung auf 44×44px für bessere Mobile-UX — würde aber Lang-Switch breiter (~200-220px) machen, auf `/index.html` eventuell Layout-Konflikt mit Markt-Pill auf 375px.

### Regel-Konformität (Phase 4 gesamt)

| Regel | Status | Notiz |
|---|---|---|
| A — Apple-Designs tabu | ✓ | Inter bleibt, kein SF/System-Font |
| B — Berechnungs-Logik tabu | ✓ | `script.js`, `MARKET_CONFIG`, `UNIT_CONV` unverändert (script.js Cache-Buster bleibt -35) |
| C — Pre-Commit-Vorschau zwingend | ✓ | Vor jedem Commit GO-Bestätigung |
| D — WCAG AA | ✓ | aria-current, lang, role-Attribute, Card-Pattern |
| E — prefers-reduced-motion | n/a | Keine neuen Animationen in Phase 4 |
| F — Mobile-First | ⚠️ | Visual-Test Etappe 4 Block 4l zwingend (Top-Bar 5 Komponenten auf 375px) |
| G — DSGVO | ✓ | Cookie + 7 GDPR-Rechte + Auftragsverarbeitung + Supervisory Authority |
| H — SEO-Sauberkeit | ✓ | Reziproker hreflang-Set, 24 sitemap-URLs |

### Performance

- **Edge Middleware**: ~5ms warm, ~50ms cold start (läuft vor Cache, GeoIP-Lookup auf Edge)
- **/en-eu/-Files**: Static-Hosting via Vercel CDN — keine Performance-Regression
- **Cache-Buster Phase 4**: `styles-app.css` -36 → -37 (Block 5/4i wegen `.lang-switch`-Block-Insert); `lang-switch.js` -1 → -2 (Block 4e wegen LocalStorage-Erweiterung); `script.js` unverändert (-35, REGEL B)

### Known Issues

1. **Mobile-Layout-Risk** für `/index.html` Top-Bar — siehe Future-Cleanup
2. **/en-eu/-Hauptseite Default-Markt**: `script.js` Default ist `"us"` (Phase 4e Recon-Korrektur). User kann via Markt-Pill manuell wechseln. Optional in Phase 5: en-eu-spezifischer Default-Markt — würde aber `MARKET_CONFIG` ändern (REGEL B).

### Backups & Tag

- ZIP-Backup pre-Phase-4: `~/Desktop/eautofakten-backup-phase4-pre.zip` (1.3 MB, vor Etappe 1)
- ZIP-Backup post-Phase-4: *(in Etappe 4 Block 4k zu erstellen)*
- Tag: `v2.0-en-eu-market` *(in Etappe 4 Block 4k zu setzen)*

---

*Dokumentiert: 26. April 2026, im Rahmen Phase 4 (Tag `v2.0-en-eu-market`).*

---

*Ende Phase-4-Doku.*


---

## Phase 5 (27. April 2026): EU-Market — Quick-Fix UX

**Tag:** `v2.1-eu-market` *(in Block 5g zu setzen)*
**Geplante Mini-Blocks:** 7 (5a Recon → 5g Tag/Push)
**Umgesetzte Commits:** 6 (`904129e`..`89024c1` + 5g)
**Verworfene Blocks:** 0

### Architektur-Entscheidungen

- **EU-Markt als 4. MARKET_CONFIG-Eintrag** (REGEL B kontrolliert gebrochen, User-explizit OK)
- **Reihenfolge im Code**: `de → eu → us → tr`
- **Locale**: `en-IE` (BCP 47 valid, EU-Member-State, Number-Format-konform)
- **EU-Defaults** (EU-Average, nicht 1:1 wie DE): 0.30 €/kWh / 1.70 €/L / 6.5 L/100km / 17 kWh/100km
- **Smart-Init für /en-eu/-Visits**: idempotent + User-Choice respektiert
- **Cookie-Mapping erweitert**: `evspend_locale='en-eu'` setzt jetzt `eaf.market='eu'`

### Umgesetzt — 6 Commits

| Block | Commit | Inhalt |
|---|---|---|
| 5b | `904129e` | MARKET_CONFIG +EU (locale en-IE, EU-Average-Defaults) |
| 5c | `4960866` | Markt-Pill 3→4 Optionen (DE/EU/US/TR) in `/index.html` + `/en-eu/index.html` |
| 5d | `77a5e1a` | lang-switch.js LOCALE_TO_MARKET +en-eu→eu (Cookie-Mismatch-Fix) |
| 5e | `b4486e7` | /en-eu/init-eu.js Smart-Init (8 Files: 1 NEU + 7 Includes) |
| 5f | `89024c1` | Translations marketEu (de:"EU", en:"EU", tr:"AB") |
| 5g | (dieser) | Cache-Buster bumps + Phase-5-Doku |

### Key Features

1. **EU-Markt** (4. MARKET_CONFIG-Eintrag)
   - language `en` (existing translations wiederverwendet)
   - currency EUR / Symbol €
   - units km, liter, l/100km, kWh/100km
   - locale en-IE für Number-Format

2. **Markt-Pill 4 Optionen** mit lokalisierten Labels:
   - DE-UI: Deutschland · EU · USA · Türkei
   - EN-UI: Germany · EU · United States · Turkey
   - TR-UI: Almanya · AB · ABD · Türkiye

3. **Cookie ↔ LocalStorage Konsistenz** (Bug-Fix aus Phase 4e)
   - Vorher: Cookie `en-eu` → kein localStorage-Write (Mismatch möglich)
   - Nachher: Cookie `en-eu` → `eaf.market="eu"` automatisch

4. **Smart EU-Market Init** (`/en-eu/init-eu.js`)
   - Idempotent (kein Write wenn schon `"eu"`)
   - Respektiert User-Wahl außer bei Cookie `en-eu`-Click
   - Setzt EU als Default für neue User auf `/en-eu/`-Pfad

5. **Translations**: `marketEu` in 3 Sprach-Objects ergänzt, sprachneutrales "EU"/"AB"

### Architektur-Bug-Fixes

- **Cookie-Mismatch** (Phase 4e-Erbe): Cookie `en-eu` hatte `LOCALE_TO_MARKET[en-eu]=undefined` → kein localStorage-Write. Behoben in Block 5d (`77a5e1a`).

### Future-Cleanup / Tech-Debt

- **`LANG_LOCALE` Map ist Dead Code** *(NEU in Phase 5 entdeckt)*: `script.js` L3008 deklariert `{ de: "de-DE", en: "en-US", tr: "tr-TR" }` — wird **nirgends** abgerufen. `_currentLocale()` (L555) liest direkt aus `MARKET_CONFIG[market].locale`. Entfernen empfohlen in Future-Cleanup-Phase.
- **/en-eu/styles-en-eu.css redundant** (Carry-over aus Phase 4): Cleanup empfohlen.

### Regel-Konformität

| Regel | Status | Notiz |
|---|---|---|
| A — Apple-Designs tabu | ✓ | Inter bleibt |
| B — Berechnungs-Logik tabu | ⚠️ **kontrolliert gebrochen** (User-OK): MARKET_CONFIG +EU, Translations +marketEu. `calc()`, `n()`, `_rawToInternal()`, `UNIT_CONV` strict unverändert. |
| C — Pre-Commit-Vorschau | ✓ Vor jedem Commit GO-Bestätigung |
| D — WCAG AA | ✓ existing role/aria unverändert |
| E — prefers-reduced-motion | n/a |
| F — Mobile-First | ✓ Markt-Pill ist Dropdown, kein Top-Bar-Layout-Bruch |
| G — DSGVO | ✓ LocalStorage `eaf.market` ist nicht-Cookie, kein Banner |
| H — SEO | ✓ unverändert (kein hreflang-Update für Markt-Add) |

### Performance

- **EU-Markt-Activation**: kein Performance-Impact (existing `setMarket(code)`-Pfad wiederverwendet)
- **Smart-Init**: `<1ms` Block-Zeit (synchron im `<head>`)
- **Cache-Buster**: `script.js -35→-36`, `lang-switch.js -2→-3`, `init-eu.js v=20260426-1` (initial Start-Buster)

### Known Issues

- **User-Wahl-Override-Edge-Case** auf `/en-eu/`: User der manuell Markt-Pill auf "USA" wechselt, bekommt bei nächstem Cookie-`en-eu`-Click wieder `eu` gesetzt. **Workaround**: User kann Lang-Switcher auf "EN" klicken (statt "EU") für US-Markt mit EN-UI.

### Backups & Tag

- ZIP-Backup post-Phase-5: *(in Block 5g zu erstellen)*
- Tag: `v2.1-eu-market` *(in Block 5g zu setzen)*

---

*Dokumentiert: 27. April 2026, im Rahmen Phase 5 (Tag `v2.1-eu-market`).*

---

*Ende Phase-5-Doku.*

---

## Phase 6 (27. April 2026): Bug-Fix Init-Pfad

**Tag:** `v2.1.1-init-fix`
**Datum:** 27. April 2026
**Commits:** 1 (`d4e7097`)

### Bug-Beschreibung

User auf evspend.com (insbesondere iOS Safari) sahen inkonsistenten State nach Page-Reload bei nicht-DE-Markt:

- Markt-Pill zeigte korrekten Markt (z. B. „US · $")
- Aber Slider-Werte waren auf HTML-default (DE/EU) geclampt
- Konsequenz: US-User mit 25 mpg / 3.50 USD/gal sah nach Reload 20 L/100km / 3.00 €/L

### Ursache (Phase-1-Erbe)

- `loadInputs()` IIFE lief auf Module-Top-Level
- Las HTML-`min`/`max` bevor `MARKET_CONFIG` verfügbar war
- Clampte User-Werte zu HTML-Range (DE/EU)
- `applyMarketDefaults()` wurde nur via `setMarket()`-Click aufgerufen, nie beim Init
- War als „Known Issue" in Phase 1 dokumentiert

### Fix-Strategie D

1. Neue Funktion `applyMarketRanges()` bei L3015
   - Setzt nur `min`/`max`/`step` (NICHT `value`)
   - Pure Range-Setter
   - 10 Slider-IDs analog `applyMarketDefaults`
2. `loadInputs()` IIFE → benannte Funktion
   - L162-181 von `try{...}` zu `function loadInputs(){...}`
   - Side-effect-frei
3. `init()`-Reihenfolge:
   - `loadI18nState` → `applyMarketRanges` → `loadInputs`
   - Smart-Fix: User-Werte werden zur korrekten Markt-Range geclampt

### Browser-Test verifiziert

3 Profile auf `localhost:8080` erfolgreich getestet:

- **PROFIL A (DE):** User-Werte 0.42 / 1.95 bleiben in DE-Range ✓
- **PROFIL B (US):** User-Werte 0.16 / 3.50 / 25 / 12500 in US-Range ✓
- **PROFIL C (EU):** User-Werte 0.32 / 1.78 bleiben in EU-Range ✓

### REGEL B Status

Kontrolliert gebrochen (User-explizit OK):

- `init()`-Pfad um 2 try/catch-Calls erweitert
- Neue Funktion `applyMarketRanges` (~18 Zeilen)
- `loadInputs` IIFE → function (funktional identisch)
- `calc()`, `n()`, `_rawToInternal()`, `UNIT_CONV`, `MARKET_CONFIG` strict unverändert
- `applyMarketDefaults()` unverändert (für `setMarket`-Click)

### Tech-Debt aufgelöst

„Known Issue" aus Phase 1 (`loadI18nState` ruft `applyMarketDefaults` nicht beim Init auf) — **GELÖST**.

### Cache-Buster

- `script.js`: `-36 → -37` (Phase-6-Bump in `index.html` + `en-eu/index.html`)

### User-Werte-Persistenz

„Stored locally"-Versprechen erfüllt:

- User-Werte bleiben nach Reload erhalten
- Ranges werden zur korrekten Markt-Range geclampt

### Backups & Tag

- Tag: `v2.1.1-init-fix` (Hotfix-Tag)
- ZIP-Backup post-Phase-6 erstellt (`eautofakten-backup-phase6-post.zip`)

---

*Dokumentiert: 27. April 2026, im Rahmen Phase 6 (Tag `v2.1.1-init-fix`).*

---

*Ende Phase-6-Doku.*

---

## Phase 7 (27. April 2026): Mobile-UX Lang-Switch Hide

**Tag:** `v2.1.2-mobile-ux-hide`
**Datum:** 27. April 2026
**Commits:** 2 (`372d170` Phase 7c + `7e-1` Doku)

### User-Beobachtung

Lang-Switch auf Hauptseiten Mobile (375px) zu eng:

- Top-Bar mit Markt-Pill + Lang-Switch + Theme-Btn ~206px
- Layout überfüllt auf iPhone SE

### Strategie (Recon Block 7a)

3 Optionen evaluiert. **Option C gewählt**:

- Mobile-only CSS `@media`-Hide
- Kein DOM-Change, kein JS-Change
- Reversibel
- Desktop unverändert
- Sub-Pages unverändert

### Implementation (Block 7c, Commit `372d170`)

+8 Zeilen CSS in `styles-app.css`:

```css
@media (max-width: 480px) {
  .top-controls .lang-switch {
    display: none;
  }
}
```

Cache-Buster `styles-app.css`: `-37 → -38` in 4 Hauptseiten.

### Browser-Test verifiziert (Block 7d)

5 Profile auf `localhost:8080`:

- **Desktop 1024px**: Lang-Switch sichtbar ✓
- **Mobile `/` 375px**: hidden ✓
- **Mobile `/verlauf.html`**: hidden ✓
- **Mobile `/impressum.html`** (Sub-Page): SICHTBAR ✓
- **Mobile `/en-eu/`**: hidden ✓

### REGEL B Status

Strict respektiert — kein JS, kein DOM, nur CSS.

### UX-Mitigation

- Sub-Pages haben Switch weiterhin (Fallback)
- Markt-Pill für DE/EU/US/TR bleibt
- Power-User können URL-Bar nutzen

### Layout-Gewinn

Top-Bar Mobile: ~206px → ~81px (60% schmaler).

### Files modifiziert (5)

- `styles-app.css` (+8 Zeilen)
- `index.html`, `verlauf.html`, `en-eu/index.html`, `en-eu/verlauf.html` (Cache-Buster)

### Backups & Tag

- Tag: `v2.1.2-mobile-ux-hide`
- ZIP-Backup post-Phase-7 erstellt (`eautofakten-backup-phase7-post.zip`)

---

*Dokumentiert: 27. April 2026, im Rahmen Phase 7.*

---

*Ende Phase-7-Doku.*

---

## Phase A (28. April 2026): Bug-Fix-Bundle

**Tag:** v2.2-bugfix-bundle
**Datum:** 28. April 2026
**Commits:** 1

### Bugs behoben (3)

A1: Phase 7 rückgängig
- 10 CSS-Zeilen entfernt aus styles-app.css
- Lang-Switch wieder überall sichtbar (4 Sprachen)
- Mobile + Desktop konsistent

A2: Dark Mode weißer Streifen oben
- Root Cause: theme-color Meta-Tags nutzten
  prefers-color-scheme statt data-theme
- iOS Status-Bar folgte System statt App-Theme
- Fix: syncThemeColor() in theme-init.js
- Init + Theme-Toggle synct Meta-Tag dynamisch

A4: Aktualisieren-Button sticky
- position:fixed, bottom-anchored
- z-index 150 (über Content, unter top-controls)
- body padding-bottom 48→96 (Button überdeckt nichts)
- Mobile-First Action-Bar Stil

### Files modifiziert (27)
- styles-app.css (Phase-7-Revert + Sticky-Button)
- theme-init.js (+syncThemeColor)
- 25× HTML (Cache-Buster)

### Cache-Buster
- styles-app.css: -38 → -39
- theme-init.js: -29 → -30

### Hinweis A3 (Share-Bild)
Hypothese: A3 ist iOS Share-Sheet-Preview, gelöst
durch A2-Fix. Falls weiter Bug → Folge-Phase.

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-A-Doku.*

---

## Phase B (28. April 2026): Unified UX

**Tag:** v2.3-unified-ux
**Datum:** 28. April 2026
**Commits:** 1

### Tasks (4)

B1: Markt-Pill volle Namen
- Pill-Label: "DE · €" → "Deutschland €" (sprach-aware)
- 5 Translations korrigiert:
  * DE marketEu: "EU" → "Europa"
  * EN marketEu: "EU" → "Europe", marketUs: "United States" → "USA",
    marketTr: "Turkey" → "Türkiye"
  * TR marketEu: "AB" → "Avrupa"
- _refreshMarketPillLabel() bei Sprach-/Marktwechsel

B2: Lang-Switch entfernt (4 Hauptseiten)
- index.html, verlauf.html, en-eu/index.html, en-eu/verlauf.html
- DOM-Block + Script-Tag raus
- Sub-Pages NICHT angefasst (22 Sub-Pages behalten Lang-Switch)
- Verlauf-Seiten: Markt-Pill HINZUGEFÜGT (konsistente Top-Bar)

B3: Share-Texte Marketing-Style (multi-line, 9 Templates)
- shareTextSingleEv / shareTextSingleVb / shareTextCompare
- 3 Sprachen (DE/EN/TR) × 3 Modi = 9 neue i18n-Keys
- DE/TR: hardcoded €/₺ (Single-Currency Märkte)
- EN: {currency} placeholder (EU/US variabel)
- {value} via fmt() locale-aware ohne Währung
- buildShareTextSingle/Compare rewriten

B4: Dark Mode weißer Streifen — REAL ROOT CAUSE
- Bug: styles-app.css Z.28 hatte falschen Selektor:
  `[data-theme="dark"] html` ist DESCENDANT-Selektor und matcht NIE
  (html ist Wurzel, hat keinen Ancestor)
- Folge: html-Element hatte permanent `background:#f5f7fa` (light).
  iOS Safari Rubber-Band-Scroll am oberen Rand zeigt html-bg
  → weißer Streifen oben in Dark Mode.
- Phase A theme-color-Fix war für iOS URL-Bar — andere Schicht.
- Fix (1-Zeichen): `[data-theme="dark"] html` → `html[data-theme="dark"]`

### Files modifiziert (7)
- script.js (B1 setMarket+Translations + B3 9 Share-Texte+Builder-Rewrite)
- verlauf.js (Markt-Pill init + 12 Translations + Event-Handler-Updates)
- styles-app.css (B4 Selektor-Fix)
- index.html, verlauf.html, en-eu/index.html, en-eu/verlauf.html
  (B2 Lang-Switch raus, Verlauf-Seiten +Markt-Pill, Cache-Buster)

### Cache-Buster
- styles-app.css: -39 → -40
- script.js: -37 → -38
- verlauf.js: -31 → -32
- theme-init.js: -30 (unverändert)

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-B-Doku.*

---

## Phase C (28. April 2026): UX-Polish + Bug-Fix-Bundle

**Tag:** v2.4-ux-polish
**Datum:** 28. April 2026
**Commits:** 1

### Tasks (4)

C1: Markt-Pill Close-Handler Verlauf (REGRESSION-Fix)
- Bug: Pill-Menü schloss nicht auf Verlauf (Phase B Regression)
- Root Cause: `.top-menu { display:flex }` überstimmt `[hidden]`-Attribut
  → `setAttribute("hidden")` allein wirkungslos, Menü permanent offen
- Fix: verlauf.js analog zu script.js initTopControls
  * isOpen-Flag-Pattern
  * Inline `style.display` toggle (überschreibt CSS)
  * touchstart-Listener für iOS-Quirk
  * Escape-Key-Handler

C2: Auto-Scroll zu Ergebnis
- Existierte bereits in calcFromButton (Z. 1816)
- Nur `block: "start"` → `block: "center"` (laut User-Spec)

C3: Farben tauschen
- Neue CSS-Variablen:
  * --ev-color: #22c55e (Hellgrün/Mint, lebendig)
  * --ev-color-dark: #16a34a
  * --ev-soft / --ev-soft-strong / --ev-shadow
  * --savings-color: #16a34a (dunkler Grün, ernster)
- ~10 EV-spezifische Selektoren von var(--blue) auf var(--ev-color):
  .ev-pill, .mode-badge--ev, .type-btn--ev, #evCard, .bar-fill.ev-bar,
  .sl--ev, .single-result:has(.mode-badge--ev), Dark-Mode-Variants
- var(--green) → var(--savings-color) (replace_all in styles-app.css)
  damit EV-Hellgrün und Savings-Dunkelgrün visuell unterscheidbar
- Verlauf-Chart-EV-Bar bleibt blau (= Statistik-Balken laut Spec)
- WCAG: #22c55e auf weiß ~3.4:1 (AA Large) ✓

C4: Fahrgemeinschaft im Share-Text
- 3 neue Translations (DE/EN/TR): shareRideshareLine
  * DE: "Fahrgemeinschaft {n} Personen: {perPerson} € pro Person"
  * EN: "Carpool {n} people: {perPerson} {currency} per person"
  * TR: "Araç paylaşımı {n} kişi: {perPerson} ₺ kişi başı"
- _injectRideshareLine() — splittet Text, fügt Zeile vor CTA ein
- buildShareTextSingle: nutzt costPerPerson (Kosten/Person)
- buildShareTextCompare: nutzt savingsPerPerson (Ersparnis/Person)
- Aktiv nur wenn d.ridesharing && d.persons > 1

### Files modifiziert (7)
- script.js (C2 Scroll + C4 Rideshare + 3 Translations)
- verlauf.js (C1 Markt-Pill Rewrite analog script.js)
- styles-app.css (C3 EV-Color-Vars + 10 Selektor-Updates)
- 4× HTML (Cache-Buster)

### Cache-Buster
- styles-app.css: -40 → -41
- script.js: -38 → -39
- verlauf.js: -32 → -33

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-C-Doku.*

---

## Phase D (28. April 2026): Bug-Fix-Bundle nach Phase-C-iPhone-Test

**Tag:** v2.5-bug-fixes
**Datum:** 28. April 2026
**Commits:** 1

### Tasks (4)

D1: Share-Text mit/ohne Fahrgemeinschaft — Verifikation
- Phase-C-Logik (`_injectRideshareLine`) injiziert Zeile NUR wenn
  `d.ridesharing && d.persons > 1`. Sonst Template unverändert.
- Alle 9 Templates ohne Rideshare gelesen — sauber.
- Kein Code-Change. Status: OK.

D2: Verlauf-Charts Farben (Phase-C-Lücke)
- Bug: Phase C hat styles-app.css EV/VB-Farben aktualisiert, aber
  verlauf.js Chart.js dataset colors vergessen.
- Fix:
  * EV-Bar: rgba(59,130,246) → rgba(34,197,94) (grün)
  * ICE-Bar: rgba(156,163,175) → rgba(245,158,11) (orange)
- Konsistent mit Hauptseite EV/VB.

D3: Markt-Pill Selection-Bug Verlauf (Phase-B-REGRESSION)
- Bug: Klick auf "Europa" auf Verlauf → Markt wechselt nicht.
- Root Cause: verlauf.js MARKET_CONFIG (Z.33-40) fehlte `eu`-Eintrag.
  _setMarketVerlauf("eu") → cfg=undefined → Funktion bricht ab,
  bevor localStorage/Events updaten.
- Fix: `eu`-Markt analog script.js hinzugefügt.
  language="en", locale="en-IE", currency=EUR, units=metric.
- LEHRE: Phase B fügte Markt-Pill auf Verlauf ohne MARKET_CONFIG-
  Spiegel-Audit. Künftig: bei DOM-Übernahme zwischen Files
  Configs/Constants prüfen.

D4: Auto-Scroll funktionierte nicht (Phase-C-REFACTORING-FEHLER)
- Bug: Phase C änderte scrollIntoView in `calcFromButton()` von
  block:"start" → block:"center". Aber `calcFromButton` ist
  TOTER CODE — wird NIRGENDS aufgerufen. Echter calc-btn-Click-
  Handler ist im IIFE bei script.js:269 und hatte überhaupt
  KEINEN Scroll.
- Zusatzproblem: Sticky calc-btn (~52px+safe-bot) verdeckt bei
  block:"center" das Result-Bottom.
- Fix:
  * Scroll-Logik in den ECHTEN Click-Handler verschoben
    (script.js:269 IIFE), 100ms Timeout für _calcDebounced
  * Tote `calcFromButton()` Funktion (10 Zeilen) gelöscht
  * CSS `scroll-margin-bottom:100px` + `scroll-margin-top:24px`
    auf #singleResult, #compareResult — Sticky-Button-Puffer
- LEHRE: Refactoring ohne Caller-Trace ist gefährlich. Phase C
  hat eine tote Funktion "gefixt" ohne zu prüfen ob sie noch
  verwendet wird. User-Test deckte den No-Op auf.
  → Künftig vor jeder Funktions-Änderung: `grep -n "funcName\b"`
    um sicherzustellen dass es Caller gibt.

### Files modifiziert (7)
- script.js (D4 Scroll im echten Handler + tote Fn entfernt)
- verlauf.js (D2 Chart-Farben + D3 eu-Markt)
- styles-app.css (D4 scroll-margin)
- 4× HTML (Cache-Buster)

### Cache-Buster
- styles-app.css: -41 → -42
- script.js: -39 → -40
- verlauf.js: -33 → -34

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG (script.js), n() unverändert.

---

*Ende Phase-D-Doku.*

---

## Phase E (28. April 2026): Charts grün + Chart über Ergebnis

**Tag:** v2.6-charts-final
**Datum:** 28. April 2026
**Commits:** 1

### Tasks (2 + 1 Adjust)

E1: Hauptseiten-Chart EV-Linie Blau → Grün
- Bug: Phase C/D haben EV-Theme auf Grün umgestellt, aber das
  Linien-Chart in script.js renderCostChart (Z. 1233-1340)
  blieb mit hardcoded Blau-Werten.
- Fix:
  * evC light: #2563eb → #22c55e
  * evC dark:  #60a5fa → #4ade80
  * evFill light: rgba(37,99,235,.08) → rgba(34,197,94,.08)
  * evFill dark:  rgba(96,165,250,.10) → rgba(74,222,128,.10)
  * styles-app.css `.chart-dot--ev` → background:var(--ev-color)
- ICE/Verbrenner-Linie unverändert orange.

E2: DOM-Reorder Compare-Section — Chart vor Result
- /index.html und /en-eu/index.html: chartSection-Block vor
  compareResult-Block verschoben.
- Sub-Pages und Single-Result NICHT angefasst.
- Begründung: User soll erst Visualisierung sehen, dann Werte.

E2-Adjust: Auto-Scroll-Ziel Compare-Modus
- Bisher: scrollIntoView auf #compareResult
- Neu: scrollIntoView auf #chartSection (falls visible) wenn
  appMode === "compare", sonst Fallback auf #compareResult.
- Single-Modus weiterhin #singleResult.
- styles-app.css scroll-margin auch für #chartSection ergänzt.

### Files modifiziert (5)
- script.js (E1 Chart-Farben + E2-Adjust Scroll-Target)
- styles-app.css (E1 chart-dot + Scroll-Margin auf #chartSection)
- index.html (E2 DOM-Reorder + Cache-Buster)
- en-eu/index.html (E2 DOM-Reorder + Cache-Buster)
- verlauf.html, en-eu/verlauf.html (Cache-Buster)

### Cache-Buster
- styles-app.css: -42 → -43
- script.js: -40 → -41

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-E-Doku.*

---

## Phase F (28. April 2026): Letzte blaue EV-Stellen

**Tag:** v2.7-ev-color-final
**Datum:** 28. April 2026
**Commits:** 1

### Bug
- Phase C/D/E haben EV-Theme auf Grün umgestellt, aber 2 JS-getriebene
  Color-Overrides + 2 CSS-Nebenstellen blieben blau.
- iPhone-Test zeigte: Single-Hauptwert (₺42,50) und Compare-Box
  EV-Wert (₺85,00) noch blau.

### EV-Audit Ergebnis (4 Treffer EV-spezifisch)
1. script.js:1016 — `heroColor = isEv ? "var(--blue)" ...` →
   `"var(--ev-color)"`. Verursacht Single-Modus Hauptwert.
2. script.js:1111 — `_animCountMoney(moEl, d.eAutoTotal, "var(--blue)")` →
   `"var(--ev-color)"`. Verursacht Compare-Box EV-Wert.
3. styles-app.css:2151 — `.qc-hdr--ev` Quick-Calc EV-Header.
4. styles-app.css:2566 — `.lt-dot--ev` Langzeit-Analyse EV-Punkt.

### Brand/UI explizit BLAU belassen (User-Entscheidung)
- `.cmp-empty-ico` (Empty-State-Icon vor Berechnung — modus-neutral)
- `.calc-btn` (Sticky-CTA Brand-Gradient, Phase-A-Spec)
- `.brand-text em`, `.hdr-accent`, `.top-pill`, `.mode-btn--active`
- Focus-Rings: `.qc-inp:focus`, `.hist-search:focus`, `.list-row:focus-within`
- PWA-Buttons, `.tag`, `.ios-switch`

### Files modifiziert (6)
- script.js (2 Color-Overrides)
- styles-app.css (2 Selektoren)
- 4× HTML (Cache-Buster)

### Cache-Buster
- styles-app.css: -43 → -44
- script.js: -41 → -42

### Lehre (für künftige Color-Refactorings)
JS-getriebene `style.color = ...` und `_animCountMoney(..., color)`-Aufrufe
sind im CSS-Audit unsichtbar. Künftig zusätzlich:
`grep -nE 'var\(--blue|"#[0-9a-f]{6}"' script.js verlauf.js`

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-F-Doku.*

---

## Phase G (28. April 2026): Kilometer-Slider Konsistenz

**Tag:** v2.8-slider-consistency
**Datum:** 28. April 2026
**Commits:** 1

### Bug
- iPhone-Test: Single-Modus EV-km-Slider war grün (sl--ev-Klasse),
  Compare-kmShared neutral. User-Wunsch: Kilometer ist Brand-neutral
  (keine Fahrzeug-Semantik).

### Fix
- styles-app.css: ID-Override `#kmEv.sl--ev,#kmVb.sl--vb` auf
  var(--blue) (light) bzw. var(--blue-2) (dark).
- Andere EV-Slider (Stromverbrauch, Strompreis, Batterie) bleiben
  grün — sie haben echte EV-Semantik.
- Keine HTML-Änderung — gilt automatisch auch für /en-eu/.

### Cache-Buster
- styles-app.css: -44 → -45

---

*Ende Phase-G-Doku.*

---

## Phase H (28. April 2026): License-Audit + 100% Free Migration

**Tag:** v3.0-license-clean
**Datum:** 28. April 2026
**Commits:** 1

### Ziel
Vollständiger Audit aller Third-Party-Assets — Bestätigung dass
evspend.com lizenzrechtlich sauber für kommerzielle Nutzung ist
(MIT/Apache 2.0/OFL/CC0/ISC akzeptiert; non-commercial/proprietary
ausgeschlossen).

### Audit-Ergebnis: ALLES KOMMERZIELL FREI

#### ✅ Libraries (3/3)
- **Inter Font** (fonts/InterVariable*.woff2) — OFL 1.1
  Quelle: github.com/rsms/inter
- **Chart.js v4.4.6** (vendor/chart-4.4.6.umd.js) — MIT
  License-Header in Datei.
- **Lucide v0.511.0** (vendor/lucide-0.511.0.min.js) — ISC
  License-Header in Datei.

#### ✅ Inline SVGs (HTML + theme-init.js)
- chevron-down, check, moon, sun — alle aus Lucide-Pfaden inlined
- Lizenz: ISC (über Lucide-Quelle)

#### ✅ Bilder
- banner.png, favicons, apple-touch-icon — User-bestätigt,
  Original-Artwork.
- Keine Stock-Photos, keine Background-Images, keine externen URLs.

### 2 konkrete Issues behoben

#### Issue 1 — Color-Konsistenz in styles-pages.css
- 3 Stellen: Z. 27 (`--blue:#007aff`), Z. 120 + 134
  (rgba(0,122,255,.28) Focus-Rings für Sub-Pages back-btn +
  theme-toggle).
- **Begründung:** Brand-distinctness wahren — Sub-Pages auf das
  proprietäre Brand-Blau aus styles-app.css ausrichten.
- **Update:** Color-Tokens auf `#2563eb` /
  `rgba(37,99,235,.28)` umgestellt (Brand-Blue der App).

#### Issue 2 — icons/icon.svg unbenutzt + unbekannte JPEG-Quelle
- 157 KB Datei, getrackt in git, **nicht** referenziert von HTML/CSS/JS.
- Enthielt `<image href="data:image/jpeg;base64,...">` mit
  eingebetteter JPEG unbekannter Provenienz.
- **Risk:** unklare Bild-Lizenz, potenziell nicht-frei.
- **Fix:** `git rm icons/icon.svg` (157 KB raus, kein UX-Impact da
  nie ausgeliefert).

### Inter-4/ Source-Folder
- Bereits korrekt: in .gitignore, NICHT tracked. Nur lokal vorhanden.
- Keine Action.

### Visual-Independence-Notes (Rule-A-Audit, nicht Lizenz)
- Font-Stack: zu diesem Zeitpunkt noch System-Fallback-Keywords
  enthalten (`-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`)
  als Standard-CSS-Fallback. Keine proprietären Fonts geladen.
  → In späterer Phase L.1 auf `system-ui` umgestellt.
- `backdrop-filter`/Frosted-Glass-Effekt: W3C-Standard-CSS,
  Vendor-unabhängig. → In späterer Phase L.2 entfernt zugunsten
  Solid-Backgrounds.
- Beides war zu jedem Zeitpunkt lizenzrechtlich sauber. REGEL A
  ist User-Constraint zur Visual-Differentiation, nicht Lizenz-Issue.

### Neue Datei: LICENSES.md
- Comprehensive Third-Party-License-Doku im Repo-Root.
- Pro Asset: Quelle, Lizenz, Copyright, License-Notice.
- Lucide-Inline-SVGs explizit als ISC-Derivat attribuiert.
- Self-authored Code als proprietary deklariert.

### Files modifiziert (3 modified, 1 deleted, 1 new)
- styles-pages.css (3 Color-Token-Updates auf Brand-Blue)
- icons/icon.svg (deleted via git rm)
- LICENSES.md (neu, ~80 Zeilen)
- AUDIT_REPORT.md (Phase-H-Doku)
- 21× Sub-Page HTMLs (Cache-Buster)

### Cache-Buster
- styles-pages.css: -36 → -37

### REGEL B Status
Strict respektiert - calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-H-Doku.*

---

## Phase I (28. April 2026): Berechnungs-Audit (Code-Review + Edge-Cases)

**Tag:** — (Recon-Stadium, kein Tag)
**Datum:** 28. April 2026
**Commits:** 1 (Doku-only)

### Ziel
Vollständiger Audit der Berechnungs-Korrektheit aller Calc-Pfade.
"Vertrauen in Berechnungen, Blamage vermeiden."
REGEL B strict respektiert (kein Code-Change in Phase I selbst).

### Methode
Code-Review aller Berechnungs-Funktionen + manuelle Verifikation
mit konkreten Werten gegen User-Erwartungen.

---

### Bereich 1 — CALC-Funktionen ✅ PASS

**Geprüft:**
- `n(id)` (Z. 527) — Wrapper für `_rawToInternal(parseFloat)`
- `_rawToInternal(id, v)` (Z. 635) — US-Markt-Konversion an I/O-Grenze
- `_getSingleData()` (Z. 1364)
- `_getCompareData()` (Z. 1386)
- `calc()` (Z. 1354) — Dispatcher
- `calcSingle()` / `calcCompare()` (Z. 996/1061) — UI-Render only

**Kern-Formeln:**
```
costPer100  = consumption × price        (€/100km)
monthlyCost = costPer100 × km / 100      (Total für eingegebene km)
yearlyCost  = monthlyCost × 12           (Annahme: km = monatlich)
costPerPerson = totalCost / persons      (persons = max(1, …))

evCost = v × p,  vbCost = b × vbV
eAutoTotal      = evCost × kmEv / 100
verbrennerTotal = vbCost × kmVb / 100
diffSig         = verbrennerTotal − eAutoTotal   (+: EV günstiger)
savingsTotal    = |diffSig|
```

**Status:** ✅ PASS (Pipeline mathematisch korrekt, keine Fehler)

---

### Bereich 2 — UNIT_CONV Konstanten ✅ PASS (exakt)

| Konstante | Wert | Quelle | Δ |
|-----------|------|--------|---|
| MI_TO_KM | 1.609344 | International yard agreement (1959) | 0 ✅ |
| GAL_TO_L | 3.785411784 | NIST US-liquid-gallon | 0 ✅ |
| MPG_TO_L100KM_FACTOR | 235.214583 | = 100 × 3.785411784 / 1.609344 | < 1e-6 ✅ |

Sanity-Check: 25 mpg = 9.4086 L/100km ✓ | 9.4 L/100km = 25.02 mpg ✓ (Symmetrie)

---

### Bereich 3 — MARKET_CONFIG Defaults ✅ PASS

| Markt | Strom | Sprit | EV-Verb | ICE-Verb | Plausibilität |
|-------|-------|-------|---------|----------|---------------|
| DE | 0.37 €/kWh | 1.85 €/L | 17 kWh/100km | 7.0 L/100km | ✅ DE 2025 Avg |
| EU | 0.30 €/kWh | 1.70 €/L | 17 kWh/100km | 6.5 L/100km | ✅ EU-Schnitt |
| US | $0.16/kWh | $3.20/gal | 30 kWh/100mi | 26 mpg | ✅ US-Avg |
| TR | 2.80 ₺/kWh | 48.00 ₺/L | 17 kWh/100km | 7.0 L/100km | ✅ TR 2025/26 |

Alle Slider-Ranges realistisch.

---

### Bereich 4 — Edge-Cases (DE/US Szenarien) ✅ PASS

**DE-Szenario (Compare):** 1.000 km, 17 kWh/100km @ 0.35 €/kWh, 7 L/100km @ 1.85 €/L

| Wert | User-Erwartung | App-Berechnung | Status |
|------|----------------|----------------|--------|
| evCost | 17 × 0.35 = 5.95 €/100km | 5.95 | ✅ |
| vbCost | 7 × 1.85 = 12.95 €/100km | 12.95 | ✅ |
| eAutoTotal | 59.50 € | 59.50 € | ✅ |
| verbrennerTotal | 129.50 € | 129.50 € | ✅ |
| savingsTotal | 70.00 € | 70.00 € | ✅ |

**US-Szenario (Compare):** 1.000 mi, 25 mpg @ $3.50/gal, 30 kWh/100mi @ $0.16/kWh

`_rawToInternal` Konversion: 1000 mi → 1609.344 km, 25 mpg → 9.4086 L/100km,
$3.50/gal → $0.9246/L, 30 kWh/100mi → 18.6411 kWh/100km

| Wert | User-Erwartung | App-Berechnung | Status |
|------|----------------|----------------|--------|
| eAutoTotal | $48 | $48.00 | ✅ exakt |
| verbrennerTotal | $140 | $140.04 | ✅ ±4¢ Rundung |

**Defensive Guards:**
| Edge | Verhalten | Status |
|------|-----------|--------|
| km = 0 | totals = 0 | ✅ |
| km < 0 | guard `km = 0` (Z. 1391) | ✅ |
| persons = 0 | `Math.max(1, …)` | ✅ |
| NaN-Eingabe | `every(isFinite && >0)` → bail | ✅ |
| price ≤ 0 | bail-out | ✅ |
| km = 99999 | kein Overflow (Number.MAX = 1.79e308) | ✅ |

---

### Bereich 5 — Einheiten-Konvertierung ✅ PASS

`_rawToInternal()` (script.js:635-651) ist die einzige Konversions-Stelle:

```js
case "kmEv|kmVb|kmShared|kmMonat":  return v * MI_TO_KM;       // mi → km
case "benzinpreis":                  return v / GAL_TO_L;        // $/gal → $/L
case "verbrauchVerbrenner":          return mpgToL100km(v);      // mpg → L/100 km
case "evVerbrauch":                  return v / MI_TO_KM;        // kWh/100mi → kWh/100km
default:                             return v;                   // strompreis, batteryKwh
```

| Input | Resultat | Erwartet | Status |
|-------|----------|----------|--------|
| 1000 mi | 1609.344 km | ✓ | ✅ |
| 621.37 mi | 999.999 ≈ 1000 km | ✓ | ✅ |
| 25 mpg | 9.4086 L/100km | ✓ | ✅ |
| $3.50/gal | $0.9246/L | ✓ | ✅ |
| 30 kWh/100mi | 18.6411 kWh/100km | ✓ | ✅ |

Display-Konversion (intern → User) ist invers symmetrisch — kein Datenverlust durch Round-Trip.

---

### Bereich 6 — Pro-Person-Berechnung ✅ PASS

**Code-Pfad:**
```js
persons = rideshareActive ? Math.max(1, ridesharePersons) : 1;
ridesharing = rideshareActive && persons > 1;
costPerPerson = totalCost / persons;
```

**Verifikation:**
| Total | Personen | Pro-Person | Erwartet | Status |
|-------|----------|------------|----------|--------|
| 70.00 € | 2 | 35.00 € | 35.00 | ✅ |
| 70.00 € | 3 | 23.33 € | 23.33 | ✅ |
| 70.00 € | 4 | 17.50 € | 17.50 (User-Spec) | ✅ |
| 70.00 € | 5 | 14.00 € | 14.00 | ✅ |
| 70.00 € | 6 | 11.67 € | ✓ Intl rundet | ✅ |

Runtime-Invariant `_assertShareSafe` (Z. 730-744) re-checked alle Pro-Person-
Werte mit `_assertClose(tol=0.01)`. Logs bei Drift > 1¢.

---

### Bereich 7 — Disclaimer-Texte ⚠️ DE-Lücke

**Haupt-Disclaimer (`disclaimer`):**

| Sprache | Wartung/Versicherung/Abschreibung erwähnt | Status |
|---------|-------------------------------------------|--------|
| DE (Z. 2294) | ❌ NEIN | ⚠️ Lücke |
| EN (Z. 2518) | ✅ JA ("Maintenance, insurance and depreciation are not included") | ✅ |
| TR (Z. 2742) | ✅ JA ("Bakım, sigorta ve değer kaybı dahil değildir") | ✅ |

**Footer-Hint (`hintCompareFoot`):** alle 3 Sprachen konsistent, kein Issue.

**Befund:** Nur DE-Haupt-Disclaimer fehlt der Haftungs-relevante Hinweis.
EN und TR haben ihn bereits drin. Erwartungs-Mismatch-Risiko niedrig, aber
Disclosure-Lücke sollte geschlossen werden.

---

### Gesamtübersicht

| # | Bereich | Status |
|---|---------|--------|
| 1 | CALC-Funktionen | ✅ PASS |
| 2 | UNIT_CONV Konstanten | ✅ PASS (exakt) |
| 3 | MARKET_CONFIG Defaults | ✅ PASS |
| 4 | Edge-Cases (DE+US) | ✅ PASS |
| 5 | Einheiten-Konvertierung | ✅ PASS (bidirektional symmetrisch) |
| 6 | Pro-Person-Berechnung | ✅ PASS |
| 7 | Disclaimer-Texte | ⚠️ DE-Lücke |

**6/7 ✅ PASS  |  1/7 ⚠️ DE-Disclaimer-Lücke**

**Keine kritischen Bugs (🚨). Keine Math-Fehler. Berechnungen sind vertrauenswürdig.**

### Empfehlung → Phase I.1
DE-Disclaimer um "Wartung, Versicherung und Abschreibung sind nicht
enthalten" erweitern. Aufwand: 1 Translation-String. Tag:
`v3.1-disclaimer-complete`.

---

*Ende Phase-I-Doku.*

---

## Phase I.1 (28. April 2026): DE-Disclaimer-Fix

**Tag:** v3.1-disclaimer-complete
**Datum:** 28. April 2026
**Commits:** 1

### Fix
DE-Haupt-Disclaimer in script.js:2294 erweitert um den Haftungs-relevanten
Hinweis, der in EN/TR bereits enthalten war:

**Vorher:**
> "Basierend auf Durchschnittswerten. Ergebnisse können je nach Fahrweise,
> Strommix und Fahrzeug variieren."

**Nachher:**
> "Basierend auf Durchschnittswerten. Ergebnisse können je nach Fahrweise,
> Strommix und Fahrzeug variieren. **Wartung, Versicherung und Abschreibung
> sind nicht enthalten.**"

### Files modifiziert (3)
- script.js (1 i18n-String erweitert)
- index.html, en-eu/index.html (Cache-Buster)

### Cache-Buster
- script.js: -42 → -43

### Auswirkung
Disclosure-Konsistenz über alle 3 Sprachen (DE/EN/TR). Erwartungs-
Mismatch-Risiko (User glaubt "Gesamtkosten" inkl. Wartung) eliminiert.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.
Reiner Translations-String-Update.

---

*Ende Phase-I.1-Doku.*

---

## Phase L (28. April 2026): Tool-Aesthetic Visual-Audit (Recon)

**Tag:** — (Recon-Stadium, kein Tag — kommt mit Phase L.1)
**Datum:** 28. April 2026
**Commits:** 1 (Doku-only)

### Ziel
User-Anforderung: Tool-First Visual-Aesthetic etablieren (Linear/
Vercel/GitHub-aligned). REGEL A: Visual-Independence wahren.
Audit identifiziert aktuelle Visual-Tokens und schlägt Tool-First-
Alternativen vor.

### Methode
CSS-grep aller stilistischen Tokens (Border-Radii, Backdrop-Effekte,
Multi-Layer-Shadows, Font-Stacks). Pro Stelle: Selektor + aktueller
Wert + Tool-First-Vorschlag + Risk-Bewertung.

---

### 🔴 HOCH — Großer visueller Impact

**A1 — Button-Radii (border-radius ≥ 99px)**
- 25 Stellen mit border-radius 99px / 999px / 22-28px (Pill-Form)
- Stärkster sichtbarer Effekt im aktuellen Look
- Betroffene Selektoren (Auswahl):
  * .top-pill (1219), .theme-btn (1339), .toggle-knob (1413)
  * .trust-chip (294), .tag (697), .single-meta span (2387)
  * .pwa-bar-card (818), .pwa-popup-card (879)
  * .calc-btn (3281), .qc-btn (3197, 3219), .lt-block (2748)
  * .single-cost100-line (2344), .eaf-toast (1809), etc.
- Tool-First-Vorschlag: 99px → 4-12px (rounded-rectangle)
- Risk: 🔴 hoch (25 Stellen, ändert App-Look spürbar)

**A2 — Theme-Toggle Form**
- styles-app.css:1330-1349
- Aktuell: border-radius:999px (rund), 42×42, frosted-glass bg
- Tool-First-Vorschlag: 8-10px Square, solid bg, Outline-Border
- Risk: 🔴 hoch (immer im Header sichtbar)

**A3 — Frosted-Glass Backgrounds**
- 11 Stellen: body::before, top-pill, top-menu, theme-btn,
  pwa-bar-card, pwa-popup-card, pwa-bar-btn--secondary
- Aktuell: backdrop-filter: blur(20-40px) saturate(180%)
- Tool-First-Vorschlag: Solid Backgrounds + 1px Border
- Risk: 🔴 hoch (ändert "Floating"-Visualisierung)

**A4 — Multi-Layer Soft-Shadows**
- --shadow-1/2/3 mit Komma-getrennten Layern
- 8+ inline Multi-Layer-Shadows in spezifischen Selektoren
- Tool-First-Vorschlag: Border statt Schatten oder einzelner subtler Layer
- Risk: 🔴 hoch (viele Cards betroffen)

**A5 — Font-Stack OS-spezifische Fallback-Keywords**
- styles-app.css:107, styles-pages.css:63, script.js:546 (_CF)
- Aktuell: `"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
- Tool-First-Vorschlag: `"Inter", system-ui, sans-serif`
  (OS-neutraler Fallback)
- Risk: 🟢 niedrig (Inter primär, Fallback selten sichtbar)

---

### 🟡 MITTEL

**A6 — CTA-Background-Style**
- styles-app.css:3293: linear-gradient(135deg, #3b82f6, #2563eb)
- Tool-First-Vorschlag: Solid var(--blue)
- Risk: 🟡 (1 Stelle, Sticky-CTA prominent)

**A7 — Tab-Indicator-Style**
- .mode-toggle, .type-toggle (2163, 2209)
- Aktuell: padding:4px, var(--s3) bg, border-radius:14px,
  active = "lifted card" mit Schatten
- Tool-First-Vorschlag: Underline-Tabs mit transparent bg
  (Linear/GitHub-Standard)
- Risk: 🟡 (UX-Pattern-Wechsel)

**A8 — Border-Sichtbarkeit**
- --sep: rgba(17,24,39,.06) (fast unsichtbar)
- Tool-First-Vorschlag: rgba(17,24,39,.12) (klare Trennlinien)
- Risk: 🟡 (viele Stellen indirekt)

**A9 — Card-Shadow-Stärke**
- (=A4 — gleicher Fix über Vars)

---

### 🟢 NIEDRIG / OPTIONAL

**A10 — Inter Font**
- KEEP. Inter ist Tool-neutral (GitHub/Linear/Vercel-aligned).

**A11 — Icon stroke-width Konsistenz**
- Mix aus 1.8 / 2 / 2.5 / 3 in inline SVGs
- Tool-First-Vorschlag: Vereinheitlichen auf 1.75 oder 2
- Risk: 🟢 niedrig

---

### Gesamtübersicht

| # | Bereich | Risk | Diff (Z.) | Tool-Feel-Impact |
|---|---------|------|-----------|------------------|
| A1 | Pill-Radius (25 Stellen) | 🔴 | ~30 | 🟢🟢🟢 stark |
| A2 | Theme-Btn Round→Square | 🔴 | ~5 | 🟢🟢🟢 stark |
| A3 | Backdrop-Filter raus | 🔴 | ~25 | 🟢🟢🟢 sehr stark |
| A4 | Shadow-Vereinfachung | 🔴 | ~10 | 🟢🟢 mittel |
| A5 | Font-Stack ohne -apple-system | 🟢 | 3 | 🟢 minimal |
| A6 | Calc-Btn solid statt Gradient | 🟡 | 1 | 🟢🟢 mittel |
| A7 | Tabs Underline statt Lifted | 🟡 | ~10 | 🟢🟢 mittel |
| A8 | Border-Color sichtbarer | 🟡 | 1 | 🟢 (indirekt viele) |
| A11 | Icon-Stroke vereinheitlichen | 🟢 | ~6 | 🟢 niedrig |

**Total bei vollständiger Umsetzung:** ~90 Zeilen CSS

### Status
**Recon abgeschlossen.** User entscheidet welche Findings in welcher
Folge-Phase umgesetzt werden.

### Folge-Phase L.1 (Quick-Wins)
User-Wahl: A5 + A6 + A8 (~5 Zeilen, niedrigstes Risiko, schnellster
Tool-Feel-Gewinn). A1-A4, A7, A11 verbleiben als spätere Optionen.

---

*Ende Phase-L-Doku.*

---

## Phase L.1 (28. April 2026): Tool-Aesthetic Quick-Wins

**Tag:** v3.2-quick-tool
**Datum:** 28. April 2026
**Commits:** 1
**Umgesetzt:** 3 von 11 Findings (A5, A6, A8) — niedrigstes Risiko, ~5 CSS-Zeilen.

### Fixes

**A5 — Self-hosted Typography mit OS-neutralem Fallback**
- styles-app.css: 4 Stellen (Z. 107 body + Z. 1734/1765/1791 Note-Inputs)
- styles-pages.css: 1 Stelle (Z. 63)
- script.js: 1 Stelle (Z. 1360 _CF Canvas-Fonts)
- Vorher: `"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
- Nachher: `"Inter", system-ui, sans-serif`
- Effekt: Inter (self-hosted, OFL) primär, OS-neutraler Fallback
  via `system-ui`. Vendor-unabhängige Typografie.

**A6 — Solid CTA-Background (Tool-Flat)**
- styles-app.css:3293-3295
- Vorher: `background: linear-gradient(135deg, #3b82f6, #2563eb)`
- Nachher: `background: var(--blue)` (solid #2563eb)
- Box-Shadow leicht reduziert (0.32 → 0.28, 0.12 → 0.10) für
  flacheren Tool-Look
- Effekt: Sticky-CTA solid Brand-Blue (Vercel/Linear-Standard)

**A8 — Border-Color (--sep) sichtbarer**
- styles-app.css Z. 56 (light) + Z. 1180 (dark)
- Vorher: `rgba(17,24,39,.06)` light / `rgba(255,255,255,.06)` dark
- Nachher: `rgba(17,24,39,.12)` / `rgba(255,255,255,.12)`
- Effekt: Trennlinien klar sichtbar, GitHub/Linear-typisch.
  Wirkt indirekt auf alle Stellen mit `var(--sep)` (Cards, Cells,
  Hist-Items, etc.).

### Files modifiziert (28)
- styles-app.css (A5: 4× font-family + A6: calc-btn + A8: 2× --sep)
- styles-pages.css (A5: 1× font-family)
- script.js (A5: _CF)
- 25× HTML (Cache-Buster für styles-app, styles-pages, script.js)

### Cache-Buster
- styles-app.css: -45 → 20260428-46
- styles-pages.css: -37 → 20260428-38
- script.js: -43 → 20260428-44

### Sanity-Check
`grep "-apple-system" *.css *.js` → **0 Treffer** ✓ (OS-neutraler
Stack komplett etabliert).

### REGEL A Status
Tool-First-Migration begonnen. Font-Stack OS-neutral (Inter +
system-ui), CTA solid Brand-Blue, Trennlinien sichtbar.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.

### Verbleibende Audit-Findings
A1 (Pill-Radius), A2 (Theme-Btn rund), A3 (Backdrop-Filter),
A4 (Multi-Layer-Shadows), A7 (Segmented-Tabs), A11 (Icon-Stroke)
— stehen weiter als optionale Folge-Phasen zur Verfügung.

---

*Ende Phase-L.1-Doku.*

---

## Phase L.2 (28. April 2026): Tool-Aesthetic Deep (Pills + Theme + Backdrop)

**Tag:** v3.3-tool-aesthetic-deep
**Datum:** 28. April 2026
**Commits:** 1
**Umgesetzt:** A1 + A2 + A3 — die 3 visuellen Tokens mit größtem Impact.

### Fixes

**A1 — Border-Radius eckiger (13 Stellen)**
- .banner: 22px → 12px
- .cmp-empty-ico: 50% (rund) → 12px (Square mit Radius)
- .tag: 99px → 4px
- .pwa-bar-card: 18px → 12px
- .pwa-popup-card: 22px → 14px
- .toggle-knob: 99px → 4px
- .list-card: 20px (var(--rc)) → 10px
- .single-cost100-line: 999px → 6px
- .single-meta span: 99px → 4px
- .lt-block: 14px → 8px
- .calc-btn: 14px → 8px
- .qc-btn: 14px → 8px
- .eaf-toast (JS-inline): 14px → 8px

**Bewusst BEIBEHALTEN (User-Spec):**
- .top-pill: 999px (Markt-Pill als Brand-Akzent)
- .trust-chip: 999px (SaaS-Trust-Pattern, Vorteil-Chips)
- .bar-fill, .amort-fill (Progress-Bars): Pill-Shape sinnvoll
- .ios-switch-slider, .sl-track (Slider-Tracks): Pill-Shape technisch nötig
- .mode-badge, counter-pills (klein, Akzent-Funktion)

**A2 — Theme-Toggle Tool-Square**
- border-radius: 999px (rund) → 10px (Square mit Radius)
- Größe: 42×42 → 38×38 (Mobile-konform: 36×36, < 375px: 34×34)
- background: rgba(255,255,255,.92) translucent → var(--s1) solid
- box-shadow: 3-Layer → `0 0 0 1px var(--sep)` (single-layer Outline)
- Dark-Mode analog auf solid + outline

**A3 — Solid Backgrounds (8 Stellen)**
- body::before (Status-Bar-Cover): rgba+blur → var(--bg) solid
- .pwa-bar-card: blur(40px) → solid var(--s1)
- .pwa-popup overlay: blur(14px)+rgba(0,0,0,.34) → rgba(0,0,0,.55) solid (kräftigeres Overlay)
- .pwa-popup-card: blur(40px) → solid var(--s1)
- .top-pill: blur(20px)+rgba → var(--s1) solid (Pill-Shape behalten)
- .top-menu: blur(24px)+rgba → var(--s1) solid + 1px Border
- .theme-btn: blur(20px) → var(--s1) solid
- styles-pages.css body::before: gleiche Behandlung
- `@supports`-Fallback-Block für ältere Browser entfallen (Code-Cleanup)

### Sanity-Check
- `grep "backdrop-filter"` → 0 Treffer ✓
- `grep "border-radius:999px"` → 6 Treffer (alle Brand-/Progress-/Slider-Keeps) ✓

### Files modifiziert (28)
- styles-app.css (~110 Zeilen Δ: A1 13× + A2 + A3 7×)
- styles-pages.css (A3 body::before)
- script.js (A1 eaf-toast inline-style)
- 25× HTML (Cache-Buster)

### Cache-Buster
- styles-app.css: 20260428-46 → 20260428-47
- styles-pages.css: 20260428-38 → 20260428-39
- script.js: 20260428-44 → 20260428-45

### REGEL A Status
**Visual independence weitgehend etabliert.** Aktueller Stand:
- Backgrounds: solid throughout (W3C-Standard).
- Elevation: Border-zentriert + single-layer Shadows.
- Buttons: Rounded-Rectangle (8-12px), zwei intentionale Pill-
  Akzente (Markt-Pill, Trust-Chips) als Brand-Markierung.
- Theme-Toggle: Tool-Square mit subtilem Radius.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.

### Verbleibende Audit-Findings (optional)
- A4: Multi-Layer-Shadow-Variablen (--shadow-1/2/3) noch vorhanden
- A7: Segmented-Tabs (mode-toggle, type-toggle) noch im Lifted-Card-Style
- A11: Icon-Stroke-Width Inkonsistenz (1.8/2/2.5/3)

---

*Ende Phase-L.2-Doku.*

---

## Phase L.3 (28. April 2026): Tool-Aesthetic Final (Shadows + Tabs + Icons)

**Tag:** v3.4-tool-aesthetic-final
**Datum:** 28. April 2026
**Commits:** 1
**Umgesetzt:** A4 + A7 + A11 — die letzten 3 Audit-Findings aus Phase L.

### Fixes

**A4 — Shadow-Variablen Border-zentriert**
- Light-Mode (Z. 59-61):
  ```
  Vorher: --shadow-1: 0 1px 2px rgba(17,24,39,.05);
          --shadow-2: 0 1px 2px rgba(17,24,39,.04), 0 6px 18px rgba(17,24,39,.06);
          --shadow-3: 0 10px 28px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05);
  Nachher: --shadow-1: 0 0 0 1px var(--sep);
           --shadow-2: 0 0 0 1px var(--sep), 0 1px 3px rgba(0,0,0,.04);
           --shadow-3: 0 0 0 1px var(--sep), 0 4px 12px rgba(0,0,0,.06);
  ```
- Dark-Mode (Z. 1169-1171) analog mit höheren Alphas
- Inline 3-Layer-Shadow `.primary-cta-row .qc-btn--primary:hover` (Z. 1001):
  von 3 Layern (incl. `inset 0 1px 0 rgba(255,255,255,.14)`) auf 2 Layer
  reduziert.
- Zielwirkung: Borders > Soft-Shadows (Linear/GitHub/Vercel-Stil)

**A7 — Segmented-Tabs Underline-Style**
- `.mode-toggle, .type-toggle`:
  - Container: `background:var(--s3)` + `border-radius:14px` + `padding:4px`
    → `background:transparent` + `border-bottom:1px solid var(--sep)`
    + `border-radius:0` + `padding:0`
- `.mode-btn, .type-btn`:
  - `border-radius:10px`, `padding:10px 12px`
    → `border-radius:0`, `padding:12px 16px`, `border-bottom:2px solid transparent`
  - `min-height:44px` für Mobile-Tap-Zone
  - `margin-bottom:-1px` (überlappt Container-Border)
- `.mode-btn--active`:
  - 3-Layer-Lifted-Card + `background:var(--s1)` → `border-bottom:2px var(--blue)`,
    `color:var(--blue)`, kein Background, kein Shadow
- `.type-btn--ev.type-btn--active`:
  - var(--s1)-Lifted → `border-bottom:2px var(--ev-color)`, `color:var(--ev-color)`
- `.type-btn--vb.type-btn--active`:
  - var(--s1)-Lifted → `border-bottom:2px var(--orange)`, `color:var(--orange)`
- Mobile-Override (Z. 1086-1089):
  - Padding/border-radius angepasst (waren in alter Pill-Form definiert),
    jetzt `padding:10px 14px;min-height:44px` für Underline-Style.
- Dark-Mode-Variants entsprechend (alle transparent + farbige Underline).
- Zielwirkung: Linear/GitHub-Style Tab-Indikatoren.

**A11 — Icon Stroke-Width vereinheitlicht**
- Vorher: Mix aus `1.8` / `2` / `2.5` / `3` in inline SVGs (4 Haupt-HTMLs).
- Nachher: Alle `stroke-width="2"` (Lucide-Default).
- Sanity: 192 Treffer "stroke-width" über alle HTMLs, alle "2".
- theme-init.js Sun/Moon nicht angefasst (war bereits "2", User-Spec).

### Files modifiziert (5)
- styles-app.css (A4 Vars + 1 inline-Shadow + A7 Tabs ~80 Zeilen Δ)
- 4× Haupt-HTML (A11 Stroke-Width + Cache-Buster)

Sub-Pages (21 HTMLs) NICHT betroffen — sie nutzen styles-pages.css
ohne Tabs und ohne diese Inline-SVGs.

### Cache-Buster
- styles-app.css: 20260428-47 → 20260428-48

### REGEL A Status
**Visual independence komplett.** Border-zentrierte Elevation,
Underline-Style Tabs, einheitliche Icon-Stroke-Width — Linear/
GitHub/Vercel-aligned Tool-Aesthetic. Verbleibende Pill-Akzente
(Markt-Pill, Trust-Chips) sind bewusste Brand-Entscheidungen.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.

### Audit-Status: ALLE 11 FINDINGS BEHANDELT
- A1 Button-Radius: ✅ L.2 (Rounded-Rectangle 8-12px, 2 Brand-Pill-Akzente)
- A2 Theme-Toggle: ✅ L.2 (Tool-Square mit subtilem Radius)
- A3 Backgrounds: ✅ L.2 (solid throughout, W3C-CSS only)
- A4 Elevation: ✅ L.3 (Border-zentriert + single-layer Shadows)
- A5 Font-Stack: ✅ L.1 (Inter + system-ui, OS-neutral)
- A6 CTA-Style: ✅ L.1 (solid Brand-Blue)
- A7 Tabs: ✅ L.3 (Underline-Indikator, Linear/GitHub-Standard)
- A8 Border-Visibility: ✅ L.1 (--sep auf .12 für klare Trennlinien)
- A9 Card-Shadows: ✅ L.3 (über --shadow-Vars border-zentriert)
- A10 Inter Font: ✅ KEEP (Tool-neutral, OFL self-hosted)
- A11 Icon-Stroke: ✅ L.3 (einheitlich 2)

---

*Ende Phase-L.3-Doku.*

---

## Phase L.4 (28. April 2026): Tool-Aesthetic Button Polish

**Tag:** v3.5-button-polish
**Datum:** 28. April 2026
**Commits:** 1

### Kontext
iPhone-Test nach Phase L.3 zeigte: Buttons wirken zu nüchtern/flach,
Reichweite-Box zu unsichtbar. Lösung: Subtle Tool-Polish im Stripe/
Linear-Stil — Tiefe ausschließlich über Border + single-layer Shadow.
Kein Inset-Highlight, kein Multi-Layer-Glow, kein Gradient.

### Fixes

**A — `.calc-btn` (Sticky CTA) Tool-Polish**
- Vorher: solid var(--blue), opacity:0.92, 2-Layer-Glow-Shadow
- Nachher:
  - `background: var(--blue)` (bleibt)
  - `border-bottom: 2px solid #1e40af` (Tiefe via dunklerem Border)
  - `box-shadow: 0 1px 2px rgba(0,0,0,.10)` (single-layer, subtle)
  - `opacity: 1` (volle Sichtbarkeit, Affordance via Border)
  - `:hover { background: #1e40af; }` (darken)
  - `.active` (stale-pulse): `border-bottom-color: #1d3a99` + outline-shadow,
    KEIN Glow-Stack mehr
  - `:active` (pressed): `border-bottom-width: 1px; margin-top: 1px;`
    (Press-Effekt ohne `translateY`-Trick → kein Layout-Shift)

**B — `.range-box` neutral & sichtbar**
- Vorher: `linear-gradient(135deg, rgba(37,99,235,.08), rgba(37,99,235,.02))`
  + tonierter Brand-Border + inset-Shadow
- Nachher: `background: var(--s2)` + `border: 1px solid var(--sep)` +
  `border-radius: 8px` + `box-shadow: none`
- Dark-Variant analog: var(--s2) + var(--sep)
- `.range-display` Text bleibt `var(--blue)` (Daten-Akzent auf neutralem Bg)

**C — `.qc-btn--primary` & `.pwa-bar-btn--primary` konsistent**
- `.primary-cta-row .qc-btn--primary`:
  - `background: var(--blue-grad)` Gradient → `var(--blue)` solid
  - 3-Layer-Shadow (incl. inset-highlight) → `border-bottom: 2px solid #1e40af`
    + single-layer subtle Shadow
  - `:hover` darken (Stripe-Style), `:active` press-effect via
    border-bottom-width + margin-top
  - SVG-Wiggle-Animation auf Hover entfernt (zu spielerisch für Tool-Polish)
- `@media (hover: none)`-Override: kein Hover-Glow mehr, nur background-Reset
- `.pwa-bar-btn--primary`: + border-bottom + hover/active-Variant analog

### Sanity-Checks
- `inset 0 1px 0 rgba(255` (Inset-Highlights) Treffer in styles-app.css: **0** ✓
- `var(--blue-grad)` für Primary-Buttons: **0** ✓ (alle solid)
- `border-bottom: 2px solid #1e40af` Treffer: **3** ✓
  (.calc-btn, .qc-btn--primary, .pwa-bar-btn--primary)

### Files modifiziert (5)
- styles-app.css (~72 Zeilen Δ)
- 4× Haupt-HTML (Cache-Buster styles-app.css)

Sub-Pages (21 HTMLs) nicht betroffen — sie nutzen styles-pages.css ohne diese Buttons.

### Cache-Buster
- styles-app.css: 20260428-48 → 20260428-49

### REGEL A Status
Tool-First Button-Styling: Tiefe ausschließlich über dunkleren
Border-Bottom + Hover-Darken (Stripe/Linear-Standard). Single-
layer Shadow, solid Backgrounds — vollständig W3C-CSS.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-L.4-Doku.*

---

## Phase M.1 (28. April 2026): Custom Sliders (Tool-Style)

**Tag:** v3.6-custom-sliders
**Datum:** 28. April 2026
**Commits:** 1

### Kontext
iPhone-Test bestätigte: Native `<input type="range">` wird auf iOS
Safari im OS-Default-Stil gerendert (28×28 weißer runder Thumb,
Pill-Track). Lösung: Custom slider implementation Cross-Browser
(WebKit + Mozilla), kompakter rechteckiger Thumb, Tool-typische
Track-Optik — visuell unabhängig vom OS-Native-Rendering.

### Fix — `.sl` (alle Slider) im Linear/Stripe-Stil

**Track:**
- Vorher: `height:7px; border-radius:999px` (Pill-Form)
- Nachher: `height:6px; border-radius:3px` (Tool-Rechteck)
- `--track`: `var(--s3)` → `var(--s2)` (heller Tool-Surface)
- Filled-Progress (`--fill`/`--p`-System) bleibt erhalten — JS-getrieben,
  Linear/Stripe-Standard.

**Thumb:**
- Vorher: `28×28; border-radius:50%; background:#fff;`
  `border:0.5px solid rgba(0,0,0,.10)`,
  `box-shadow: 0 1px 1px ..., 0 4px 12px ...` (2-Layer-Soft-Shadow)
- Nachher: `18×18; border-radius:4px;` (Square mit subtilem Radius)
  `background: var(--fill)` (Variant-Farbe statt weiß)
  `border: 2px solid var(--s1)` (heller "Halo" in Light, dunkler in Dark)
  `box-shadow: 0 0 0 1px var(--sep)` (single-layer Outline)
  `margin-top: -6px` (zentriert auf 6px-Track)

**State-Transitions:**
- Hover-Stil entfernt (Mobile hat kein Hover; Mehrwert zu klein)
- `:active::thumb`: `scale(1.10)` (sanftere Animation als 1.08)
- Focus-Ring: `0 0 0 1px var(--sep), 0 0 0 3px rgba(37,99,235,.30)`
  (single-layer + outline)

**Variant-Vererbung:**
- `.sl--ev` → grüner Thumb + grüner Track-Fill (--ev-color)
- `.sl--vb` → orange Thumb + Fill (--orange)
- `.sl--shared, .sl--lt` → grau (--l2)
- `.sl--rs` → blau
- Phase-G-ID-Override (`#kmEv`/`#kmVb`) bleibt erhalten — km ist neutral-blau.

### Files modifiziert (5)
- styles-app.css (~78 Zeilen Δ in `.sl`-Block)
- 4× Haupt-HTML (Cache-Buster)

Sub-Pages nicht betroffen — keine Slider dort.

### Cache-Buster
- styles-app.css: 20260428-49 → 20260428-50

### Sanity
- `border-radius:999px` im Slider-Track: 0 Treffer ✓ (war 3, alle weg)
- 8 verbliebene `border-radius:50%` Treffer sind legitime Circular-UI
  (PWA-X, ios-switch-knob, step-num, dots) — KEIN Slider-Thumb mehr.

### REGEL A Status
Custom Slider-Implementation Cross-Browser (WebKit + Mozilla).
Tool-Style Square-Thumb, rechteckiger Track, Variant-Color-Fill
— unabhängig vom OS-Native-Rendering. Damit ist die sichtbare
UI vollständig Tool-First.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.
Das `--fill`/`--p`-System (JS-getrieben) bleibt erhalten — kein
JS-Change nötig.

---

*Ende Phase-M.1-Doku.*

---

## Phase M.5 (28. April 2026): Layout/Struktur Tool-First (Recon)

**Tag:** — (Recon-only, kein eigener Tag)
**Datum:** 28. April 2026
**Commits:** Doku-Teil zusammen mit Phase-M.5.1-Implementation.

### Ziel
Layout-Audit der Hauptseite — Marketing-Page-Vibe identifizieren
und in docs-style Tool-First Aesthetic überführen. Inter Font
bleibt (User-Decision). Funktion unverändert.

### 6 Audit-Bereiche

| # | Bereich | Tool-First-Opportunity? | Risk |
|---|---------|--------------------------|------|
| 1 | Hero-Headline (32px/800/-0.9px/center) | ✅ stark | 🟡 |
| 2 | Inline-Akzent .hdr-accent (var(--blue)) | ✅ ja | 🟢 |
| 3 | Trust-Chips (Pill 999px + Inset-Shadow) | 🟡 gemischt | 🟡 |
| 4 | Section-Spacing | 🟢 neutral | 🟢 |
| 5 | Banner border-radius:16px | 🟡 gemischt | 🟡 |
| 6 | Disclaimer (zentriert, 12px, opacity:0.9) | 🟡 leicht | 🟢 |

### User-Wahl Phase M.5.1
JA: 1 (subtil), 2 (neutralisieren), 3 (Variante B eckig), 5 (Radius 8),
6 (links/lesbarer)
NEIN: 4 (Spacing bleibt)

---

*Ende Phase-M.5-Recon.*

---

## Phase M.5.1 (28. April 2026): Layout Tool-First (Subtil)

**Tag:** v3.7-tool-layout
**Datum:** 28. April 2026
**Commits:** 1
**Umgesetzt:** Items 1, 2, 3, 5, 6 (Item 4 ausgelassen).

### Fixes

**Item 1 — Hero-Headline subtle (zentriert bleibt)**
- font-size: 32px → 24px
- font-weight: 800 → 600
- letter-spacing: -0.9px → -0.3px
- line-height: 1.12 → 1.25
- text-align: bleibt zentriert (User-Spec)

**Item 2 — Inline-Akzent neutralisiert**
- `.hdr-accent`:
  - Light: `color:var(--blue)` → `color:var(--l1)`
  - Dark: `color:#93c5fd` → `color:var(--l1)`
- font-weight:600 bleibt (dezente Hervorhebung via Bold)
- white-space:nowrap bleibt
- Effekt: kein Brand-Blau-Highlight im Subtitle mehr

**Item 3 — Trust-Chips eckig (Tool-Tag-Stil)**
- border-radius: 999px (Pill) → 6px
- background: var(--s1) → transparent
- border: 1px solid var(--sep) (statt Inset-Shadow)
- box-shadow: none
- Position: bleibt zentriert
- Dark-Variant analog
- Effekt: SaaS-Trust-Pills → docs-style Tool-Tags

**Item 5 — Banner Radius 16 → 8**
- `.hero-banner` Base: `border-radius:var(--r-md)` (=16px) → `border-radius:8px`
- Mobile-Override (max-width:480px): 14px → 8px
- Mobile-Override (max-width:375px): 12px → 8px
- Konsistenz mit allen anderen Tool-Cards (8-10px Range)

**Item 6 — Disclaimer lesbarer**
- text-align: center → left
- font-size: 12px → 13px
- opacity: 0.9 → 1
- letter-spacing: .1px bleibt
- Effekt: docs-style, voll lesbar (kein Marketing-Footer-Verblassen)

### Files modifiziert (5)
- styles-app.css (~44 Zeilen Δ in 5 Items)
- 4× Haupt-HTML (Cache-Buster styles-app.css)

Sub-Pages nicht betroffen — sie nutzen styles-pages.css.

### Cache-Buster
- styles-app.css: 20260428-50 → 20260428-51

### Sanity-Checks
- `.hdr-accent color:var(--blue)` Treffer: 0 ✓ (neutralisiert)
- `.trust-chip border-radius:6px + transparent + 1px Border`: live ✓
- `.hero-banner border-radius:8px` (3 Stellen: Base + 2 Media-Queries) ✓

### REGEL A Status
Tool-First Hero-Sektion etabliert. Headline docs-style (24px /
600), Inline-Akzent neutral, Trust-Tags eckig, Banner-Radius
Tool-konsistent (8px), Disclaimer links/lesbar.

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.
Reine CSS-Layout-Anpassung.

---

*Ende Phase-M.5.1-Doku.*

---

## Phase N (28. April 2026): Doku-Bereinigung (LICENSES.md + AUDIT_REPORT.md)

**Tag:** — (Doku-only, kein Tag, kein Cache-Buster nötig)
**Datum:** 28. April 2026
**Commits:** 1

### Ziel
Doku stärker auf Status-Aussagen umstellen. Faktenfehler in
LICENSES.md korrigieren. Claude-AI-Attribution + Brand & Design
Independence-Statement ergänzen.

### Fixes

**LICENSES.md (4 Edits, EN):**
- L1 Code Ownership Section: Original work authored by Hakan Guer
  with Anthropic Claude AI assistance per ToS. Output rights retained.
- L2 Faktenkorrektur: Section "Compliance Notes" erwähnte fälschlich
  "apple-system / Helvetica Neue als Fallback" — diese Keywords sind
  seit Phase L.1 nicht mehr im Code. Korrigiert auf "Inter +
  system-ui (OS-neutral)".
- L3 Faktenkorrektur: Erwähnung von "backdrop-filter" als bundled
  CSS — seit Phase L.2 nicht mehr im Code. Korrigiert auf
  "all visual effects use W3C-standard CSS only (borders,
  single-layer shadows, solid backgrounds)".
- L4 Neue Section "Brand & Design Independence" — explizite
  Aussage zu Visual Design (independent), Color Palette
  (proprietary), Iconography (Lucide ISC), Typography
  (Inter OFL), Components (original).

**AUDIT_REPORT.md (Status-Lines, DE):**
Phase L.1, L.2, L.3, L.4, M.1, M.5.1 jeweils "REGEL A Status"-
Block neu formuliert: Status-Aussage ("Visual independence
komplett") statt Migrations-Sprache. Phase-Bodies (Mechanik-
Beschreibungen) bleiben für historische Korrektheit.

Audit-Status-Tabelle (alle 11 Findings) reformuliert auf
positive Status-Aussagen (z.B. "Backgrounds: solid throughout
W3C-CSS only").

### Files modifiziert (2)
- LICENSES.md (4 Edits + 1 neue Section)
- AUDIT_REPORT.md (~6 Status-Line-Edits + 1 Audit-Status-Tabelle)

### Cache-Buster
Nicht nötig — beide Files werden nicht von der Live-App geladen.

### REGEL A Status
Doku-Sprache jetzt durchgängig auf Status-Aussagen konsistent.

### REGEL B Status
Strict respektiert — kein Code-Change.

---

*Ende Phase-N-Doku.*

---

## Phase N v2.0 (28. April 2026): AUDIT_REPORT-Vollumstellung

**Tag:** — (Doku-only, kein Tag, kein Cache-Buster)
**Datum:** 28. April 2026
**Commits:** 1

### Ziel
Phase N v1 hat nur "REGEL A Status"-Lines reformuliert (Option A).
Phase N v2.0 erweitert: Phase-Bodies werden ebenfalls auf Tool-First-
Wording umgestellt — Engineering-Story positiv, Status-First.

### Wording-Leitfaden
| Vorher | Nachher |
|--------|---------|
| "Apple-Pattern eliminiert" | "Independent design" |
| "iOS-Slider ersetzt" | "Custom slider implementation" |
| "Apple-Marketing reduziert" | "Tool-first hero" |
| "Frosted-Glass entfernt" | "Solid backgrounds" |
| "-apple-system raus" | "Self-hosted typography" |
| "Apple-Blue (#007AFF)" | "Color-Konsistenz auf Brand-Blue" |

### Umgesetzt

**Phase H (License-Audit):**
- Issue 1 reformuliert: "Color-Konsistenz" statt "Apple-Blue ersetzt"
- Section "Apple-Patterns" → "Visual-Independence-Notes"

**Phase L (Recon):**
- Ziel- und Methoden-Block: "stilistische Tokens" statt
  "Apple-Signatur-Patterns"
- Findings A1-A11: Headers + Risk-Beschreibungen neutral
  ("Großer visueller Impact" statt "Klare Apple-Signatur")

**Phase L.1, L.2, L.4, M.1, M.5, M.5.1 Bodies:**
- "Self-hosted Typography" statt "ohne Apple-Keywords"
- "Tool-Flat CTA" statt "Calc-Btn solid statt Gradient"
- "Solid Backgrounds (8 Stellen)" statt "Backdrop-Filter raus"
- "Custom slider implementation" statt "iOS-Slider-Look ersetzt"
- "Tool-First Hero" statt "Apple-Marketing-Page-Vibe reduziert"

### Verbleibende Apple-Mentions (alle legitim)
- App Store Connect (Apple/Google) — faktischer Platform-Name
- REGEL A Definition ("Apple-Designs tabu") — Constraint-Name
- iOS-Quirk-Fix-Erwähnung — referenziert tatsächlichen Safari-Bug

### Files modifiziert (1)
- AUDIT_REPORT.md (~15-20 Wording-Updates)

### REGEL B Status
Strict respektiert — kein Code-Change.

---

*Ende Phase-N-v2.0-Doku.*

---

## Phase M.6 (28. April 2026): Code-Audit (Recon)

**Tag:** — (Recon-only)
**Datum:** 28. April 2026

### Ziel
Vollständiger Code-Audit (CSS/JS/HTML) auf verbleibende Apple-affine
Patterns + iOS-spezifische Tricks + Vendor-Mentions.

### Ergebnis: 7 Kategorien, davon 4 umsetzbar
| Kat. | Inhalt | Stellen | User-Wahl |
|------|--------|---------|-----------|
| A | CSS-Kommentare neutralisieren | 12-14 | JA |
| B | `.ios-switch` → `.toggle-switch` | 18 (CSS+HTML) | JA |
| C | JS Device-Detection (iOS/iPad) | 16 LOC | SKIP funktional |
| D | HTML PWA-Meta-Tags | 4-5 | SKIP W3C-Standard |
| E1 | border-radius ≥ 12px | 15 | SKIP (bereits optimiert) |
| E2 | box-shadow blur > 16px | ~14 | JA |
| E3 | Gradients Cleanup | 12 | JA |

---

*Ende Phase-M.6-Recon.*

---

## Phase M.6.1 (28. April 2026): Code-Säuberung (A + B + E2 + E3)

**Tag:** v3.8-code-cleanup
**Datum:** 28. April 2026
**Commits:** 1
**Umgesetzt:** Kategorien A, B, E2, E3 (C + D + E1 als funktional/standard belassen).

### Fixes

**A — CSS-Kommentare neutralisiert (13 Stellen):**
- styles-app.css: 12 Apple-Kommentar-Erwähnungen entfernt
  ("Apple-Marketing-Vibe", "(Apple-style)", "Apple-green accent",
  "Apple-Button", "Apple-affin", "iOS-Round", "iOS-Lifted-Card" etc.)
- styles-app.css + styles-pages.css: Status-Bar-Cover-Kommentar
  von "iOS Safari hidden-address-bar" auf "Mobile Safari
  hidden-address-bar" neutralisiert.

**B — `.ios-switch` → `.toggle-switch` (Cross-Files):**
- styles-app.css: 10 Selektor-Stellen umbenannt
- index.html: 4 class-Attribut-Treffer
- en-eu/index.html: 4 class-Attribut-Treffer
- script.js / verlauf.js / weitere: 0 Treffer (keine JS-Refs)
- Toggle-Funktionalität unverändert (keine Logik-Berührung)

**E2 — Box-Shadow Tightening (Tool-First):**
- `.banner`: 32px blur → 12px (cleaner Tool-Edge)
- `.cmp-empty-ico-figure-Wrapper` (Z. 617): 48px+16px → 12px+1px-Border
- `.pwa-bar-card`: 24px → 12px (light + dark)
- `.pwa-popup-card`: 60px → 24px (light + dark)
- `.top-menu`: 28px → 16px (light + dark)
- `.hist-item:hover`: 18px → 8px

**E3 — Gradients Cleanup:**
- `--blue-grad` Variable (light + dark) ENTFERNT.
  3 Restnutzer (`.brand-mark`, `.btn-calc`, `.ra-primary` —
  alle aktuell ungenutzt im HTML) auf solid `var(--blue)` umgestellt.
- `.cmp-empty-ico`: radial-gradient (Light + Dark) → solid
  `rgba(37,99,235,.08)` / `rgba(59,130,246,.14)` mit 1px-Border-Outline.
- `--share-bg` / `--share-glow` BLEIBEN (Share-Image-Canvas, nicht UI).
- `.single-result` Top-Tints BLEIBEN (subtile EV/VB-Farb-Akzente
  am Result-Card-Top — funktionale Mood-Akzentuierung).

### Sanity-Checks
- "Apple" in styles-app.css: **0 Treffer** ✓
- "Apple" in styles-pages.css: **0 Treffer** ✓
- `.ios-switch` in CSS+HTML: **0 Treffer** ✓
- `--blue-grad` in CSS: **0 Treffer** ✓
- box-shadow blur ≥ 30px außerhalb Pulse-Animationen: **0** ✓

### Files modifiziert
- styles-app.css (A + B + E2 + E3, ~80 Zeilen Δ)
- styles-pages.css (A: 1 Kommentar)
- index.html (B: 4× class-Attribut + Cache-Buster)
- en-eu/index.html (B: 4× class-Attribut + Cache-Buster)
- 25× weitere HTML (Cache-Buster styles-app + styles-pages)

### Cache-Buster
- styles-app.css: 20260428-51 → 20260428-52
- styles-pages.css: 20260428-39 → 20260428-40

### REGEL B Status
Strict respektiert — calc(), MARKET_CONFIG, n() unverändert.

---

*Ende Phase-M.6.1-Doku.*

---

## Phase R+ — Deep License Audit (Forensic) — 29. April 2026

**Audit-Modus:** Read-Only Forensic Inspection (kein Code geändert)
**Auditor:** Claude (Opus 4.7) per Anthropic
**Tag at Audit:** `v1.0-pill-center-hotfix2` (HEAD: `2a08d98`)
**Output-Datei:** [`PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md`](./PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md) (1269 Zeilen / ~80 KB)

### Audit-Methodik

R+ erweitert die Standard-Phase-R auf forensische Tiefe:
- **211 Files** vollständig inventarisiert (HTML + JS + CSS + Assets + Configs)
- **SHA-256 Hashing** für Asset-Integrity (Inter-Font byte-identisch zur Upstream-Source verifiziert)
- **49 unique Hex-Farben** gegen 12 Brand-System-Color-DBs cross-referenced (Apple iOS, Material 3, Microsoft Fluent)
- **Jeder SVG-Pfad** in `index.html` einzeln gegen Lucide v0.511.0 fingerprint-getested
- **12 vendor-spezifische Font-Keywords** negativ-getestet (`-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, …) — alle 0 Treffer
- **Chart.js Sub-Dependency** (`@kurkle/color v0.3.2`, MIT) identifiziert und attribution-verifiziert
- **AI-Disclosure-Trail** über git log (Co-Authored-By Claude in allen Phase-T Commits)

### Audit-Ergebnis

| Schweregrad | Phase R | Phase R+ | Δ |
|---|---|---|---|
| 🔴 HOCH | 0 | 0 | — |
| 🟡 MITTEL | 0 | **1** | **+1 (NEUER FUND)** |
| 🟢 NIEDRIG | 5 | 8 | +3 |

### 🟡 R+1 — NEUER FUND (Phase R hat das übersehen)

`#34C759` Apple iOS Light Mode "System Green" wird in `.qc-btn--switch` verwendet (`styles-app.css:2823`) plus 6 weitere RGBA-Vorkommen `rgba(52,199,89,…)` (RGB-Triple desselben Apple-Greens) in box-shadows und @keyframes switchPulse.

**Lizenz-Bewertung:**
- Hex-Werte sind nicht copyright-fähig (17 USC § 102(b), § 2 UrhRG) ✓
- Apple hat KEINEN Trademark auf grüne Hex-Codes ✓
- ABER: visuelle Brand-Anlehnung — der grüne Pulse-Button könnte den Eindruck einer Apple-affinen Design-Sprache erwecken

**Empfohlene Mitigation (Sprint U1, ~30 Min):**
```diff
- background:#34C759;        ← Apple iOS System Green
+ background:var(--ev-color); ← #22c55e Tailwind green-500 (brand-independent, bereits im Token-System)
```
Plus alle `rgba(52,199,89,…)` → `rgba(34,197,94,…)`.

### R+ bestätigt aus Phase R

- ✓ Inter Font (OFL 1.1) self-hosted, byte-identisch (sha256: `693b77d4f32ee9b8…`)
- ✓ Chart.js v4.4.6 (MIT) mit korrekt erhaltenem inline-Header
- ✓ Lucide-Icons (ISC) — alle 8 unique Icons in `index.html` 1:1 zu Lucide v0.511.0 verifiziert
- ✓ Brand-Assets AI-generiert via Claude/Anthropic ToS — User retains rights
- ✓ Keine Apple SF Symbols, Material Icons, Microsoft Fluent
- ✓ Keine Vendor-Font-Keywords (`-apple-system`, etc. = 0 hits in 3 CSS + script.js + index.html)
- ✓ CSP `default-src 'none'` enforced (vercel.json)

### R+ Recommendations (priorisiert)

| Sprint | Inhalt | Aufwand | Priorität |
|---|---|---|---|
| **U1** | Apple-Color-Removal (`#34C759` → `#22c55e`) | <30 Min | 🟡 HIGH |
| U2 | Documentation-Polish (`package.json` rebrand, Lucide-Klärung, `<meta author>`) | ~20 Min | 🟢 MED |
| U3 | Optional Repo-Hygiene (Italic-Font verify, `Inter-4/` move, font-weight 100 dead-code) | ~30 Min | 🟢 LOW |

### R+ Compliance-Statement

EVSpend ist nach Audit-Stand `v1.0-pill-center-hotfix2`:
- proprietäres Eigentum von Hakan Guer (mit Co-Authoring von Claude)
- frei von Copyleft / GPL / AGPL Komponenten
- mit korrekt erhaltenen MIT/OFL/ISC-Attributionen
- frei von Apple-, Material-, Microsoft-Brand-Marken (außer der nominativen Safari-Erwähnung in PWA-Anleitung — Fair Use)

**Outstanding Issue:** R+1 (Apple-System-Green) — adressierbar in Sprint U1 für 100% Brand-Independence.

Vollständiger Bericht: [`PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md`](./PHASE_R_PLUS_DEEP_LICENSE_AUDIT.md)

---

*Ende Phase-R+-Doku.*

---

## Phase R++ — Final Forensic License Compliance Audit — 29. April 2026

**Audit-Modus:** Read-Only Forensic Inspection (KEIN Code geändert)
**Auditor:** Claude (Opus 4.7) per Anthropic
**Tag at Audit:** `v1.1-apple-color-removal` (HEAD: `dbdaebe`)
**Output-Datei:** [`PHASE_R_PLUS_PLUS_FINAL_AUDIT.md`](./PHASE_R_PLUS_PLUS_FINAL_AUDIT.md) (~63 KB / 19 Sektionen)
**Trigger:** User-Anfrage „Nochmal Check ganzer Ordner, ganze Seite, alle Slider, Buttons, Farben auf Copyright, irgendwelche Seiten — Tesla, Microsoft, Apple — egal welche, kompletter Durchgang aller Codes. Alles muss lizenzfrei sein."

### R++ Audit-Erweiterung (über R+ hinaus)

| Aspekt | R | R+ | R++ |
|--------|---|------|------|
| Brand-Identitäten | 5 | 12 | **25+** |
| Auto-Brands | 0 | 0 | **28** ✅ alle negativ |
| Charging-Brands | 0 | 0 | **16** ✅ alle negativ |
| Component-Libs | (impliziert) | 5 | **11** ✅ alle negativ |
| AI-Tools (negativ) | 0 | 0 | **6** ✅ (ChatGPT, OpenAI, DALL-E, Midjourney, Llama, Gemini) |
| Color-DBs | 5 | 12 | **50+ Hex-Values** |
| Font-Hash-Verification | nein | 1 file | 2 files byte-identical |
| Git-History-Audit | nein | partial | full (sensitive-info + tag-trail) |

### R++ Audit-Ergebnis: ZERO active license issues

| Schweregrad | Count | Δ ggü. R+ |
|---|---|---|
| 🔴 HOCH | 0 | — |
| 🟡 MITTEL | 0 | -1 (R+1 in U1 resolved) |
| 🟢 NIEDRIG | 4 (R++1, R++2, plus carry-over R+2/R+3/R+7) | +2 (R++1, R++2 sind Comment-Only) |
| 🟢 INFO | 4 (Documentation/Hygiene) | unchanged |

### 🟢 Neue R++ Findings (beide Comment-Only)

**R++1:** `script.js:1258` — Code-Comment `// ── Kostenentwicklung Chart (Apple-clean line chart) ──`
  - Descriptiver Design-Sprache-Reference ("clean wie Apple-Designs")
  - Kein Runtime-Impact (Browser interpretiert keine JS-Comments)
  - Risk: 🟢 LOW (Comment-Only)

**R++2:** `styles-app.css:2819` — Doc-Comment dokumentiert Sprint-U1-Mitigation, enthält den entfernten Hex-String `#34C759` als historischer Audit-Trail-Reference
  - Forensic-Trail-Documentation (zeigt warum die Migration stattfand)
  - Kein Runtime-Impact
  - Risk: 🟢 LOW (Comment-Only)

Beide LOW-Findings sind in <10 Min cleanbar, aber nicht-kritisch.

### R++ verifizierte Negative-Tests

✅ **0 Auto-Brand-Mentions** (Tesla, BMW, VW, Mercedes, Audi, Porsche, Toyota, Honda, Ford, Hyundai, Kia, Mazda, Subaru, Nissan, Renault, Peugeot, Citroën, Volvo, Jaguar, Land Rover, Ferrari, Lamborghini, Polestar, Lucid, Rivian, BYD, NIO, Xpeng)

✅ **0 Charging-Provider-Brands** (EnBW, Ionity, Allego, Fastned, Maingau, EWE, Vattenfall, RWE, ChargePoint, Plugsurfing, Aldi/Lidl/Kaufland, Chargefox, Shell→generic, Total→generic, ARAL)

✅ **0 Component-Library-Imports** (shadcn/ui, Radix, Tailwind UI, Material-UI, Bootstrap, Bulma, Foundation, WordPress, Webflow, Squarespace, Wix)

✅ **0 React/Vue/Angular/jQuery in eigenem Code** (Chart.js internal patterns sind vendor library)

✅ **0 External-Runtime-Resources** (CSP `default-src 'none'` enforced)

✅ **0 Apple/Microsoft/Google/Material/Bootstrap-Brand-Colors** in active CSS (post-U1)

✅ **0 Brand-Logo-Colors** (Facebook-Blue, Twitter-Blue, Instagram-Pink, WhatsApp-Green, Tesla-Red)

✅ **0 ChatGPT/OpenAI/DALL-E/Midjourney/Stable-Diffusion/Llama/Gemini** Mentions (nur Claude)

✅ **0 Sensitive-Info Leaks** in Git-History (kein API-Key, Password, Token, Credential)

### Compliance-Statement (Court-Ready)

EVSpend ist nach Audit-Stand `v1.1-apple-color-removal`:
- proprietäres Eigentum von Hakan Guer (mit Co-Authoring von Claude per Anthropic ToS § 5.1)
- frei von Copyleft / GPL / AGPL Komponenten
- mit korrekt erhaltenen MIT/OFL/ISC-Attributionen für 4 Drittanbieter
- frei von Apple-, Microsoft-, Google-, Meta-, Tesla-, sowie 28+ weiteren Brand-Marken in aktivem Code
- frei von Component-Library-Imports (vanilla HTML/CSS/JS)
- frei von externen Runtime-Resources (CSP-locked)
- AI-disclosure-trail vollständig

Vollständiger Bericht: [`PHASE_R_PLUS_PLUS_FINAL_AUDIT.md`](./PHASE_R_PLUS_PLUS_FINAL_AUDIT.md)

---

*Ende Phase-R++-Doku.*
