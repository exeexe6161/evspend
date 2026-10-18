# EVSpendPure: unabhängiger Gegencheck des Grok Berichts

**Entscheidung: TARGETED_FIXES_COMPLETED. Bestätigte technische Fehler sind lokal korrigiert. Produktion ist unverändert.**

Prüftag: 18.10.2026. Ausgangsstände: Web `638839b`, iOS `ed17cdc`, beide Branch `main`. Keine erneute vollständige Releaseprüfung. Der gesamte Auftrag in `/Users/hakanguer/Desktop/codex-prompt.md` wurde gelesen.

## Zählweise und Grenzen

Der Bericht enthält 45 tatsächlich beschriebene Befundnummern. B43 fehlt. B24/B35 sind eine Doppelmeldung. B26 bis B32 wurden einzeln anhand der sieben aufgeführten Sprachthemen zugeordnet. B43 bleibt UNGEPRÜFT mangels Befundtext und wird nicht erfunden oder als widerlegt gezählt. Die Hauptklassifikation zählt jede gelieferte Nummer einmal, auch die ausdrücklich gekennzeichnete Doppelmeldung.

| Schlüssel | Ergebnis |
|---|---|
| GROK_FINDINGS_TOTAL | 45, B43 fehlt |
| CONFIRMED | 25 |
| ALREADY_FIXED | 0 |
| NOT_REPRODUCIBLE | 0 |
| EXPECTED_BEHAVIOR | 4 |
| PRODUCT_DECISION_REQUIRED | 13 |
| LEGAL_REVIEW_REQUIRED | 3 |

ALREADY_FIXED und NOT_REPRODUCIBLE sind hier Gesamtklassifikationen. Bereits erledigte Teilaspekte werden nicht unterschlagen: allgemeines Eingabeclamping in B22, EU Geldlocale in B24/B35, CSV Geldpräzision in B13 sowie die früheren Datenverlustkorrekturen waren schon vorhanden. Kein Grok Gesamtbefund war ausschließlich durch diese früheren Korrekturen erledigt.

## Auslieferungsstand

Neun relevante Dateien wurden aktuell von `https://www.evspendpure.com` abgerufen. Acht entsprechen bytegenau dem Web Ausgangscommit. Beim Service Worker weicht nur der dokumentierte Buildtoken ab; sein Hash entspricht dem zuvor geprüften produktiven Releaseartefakt mit `v638839b3dc97`. Das sind Dateinachweise der Produktion, keine aus dem lokalen Repository abgeleitete Livebehauptung. Nachweis: [Produktionsdateien](tests/grok-evidence/live-files.json).

Die Zustandsfehler B01/B02/B11 wurden mit dem ursprünglichen Bundle in isolierten Browserprofilen reproduziert. Die behaupteten Fehler sind daher nicht pauschal als veralteter Grok Stand erklärbar. Groks konkretes Browserprofil und sein Cacheinhalt wurden nicht bereitgestellt und sind UNGEPRÜFT. Nachweise: [Erstbesuch und Marktwechsel vorher](tests/grok-evidence/baseline.json), [Statistik und Langzeit vorher](tests/grok-evidence/baseline-extra.json).

## Befundmatrix

Jede Quelle nennt eine aktuelle Quellstelle und ein wörtliches Fragment. CONFIRMED beschreibt den geprüften ursprünglichen Fehler; der Änderungsstatus beschreibt die lokale Behebung. Produkt und Rechtsentscheidungen wurden nicht als technische Defekte umgesetzt.

| Befund | Klassifikation | Quelle und Nachweis | Bewertung und Änderung | Prüfung |
|---|---|---|---|---|
| B01 | CONFIRMED | [script.js:4437](/Users/hakanguer/Desktop/evspend/script.js:4437), `Object.entries(mk.defaults).forEach` | Erstbesuch übernahm HTML Werte statt der bereits vorhandenen Marktdefaults. Korrigiert. Einzelstrecken bleiben gemäß Produktkonfiguration 50 km beziehungsweise 30 mi, Groks generische 1.000 km sind Vergleichsstrecke und Monatsfahrleistung. Keine neuen Preisannahmen. Korrektur: init: fehlende Werte aus bestehender Marktdefinition initialisieren, gespeicherte Werte separat laden. | B01 defaults, Browser vier Märkte, native defaults |
| B02 | CONFIRMED | [script.js:4369](/Users/hakanguer/Desktop/evspend/script.js:4369), `if (setMarket(code) === false) return;` | TR und EU Navigation umging die bestehende Kompatibilitätsprüfung. Bestätigt am ursprünglichen Bundle: kein Dialog und falsche Währungsinterpretation. Abbrechen erhält Zustand, Annahme verwendet Zieldefaults. DE und EU behalten kompatible Eingaben. Verlaufseinträge bleiben unverändert. Korrektur: gotoLocale verwendet zentralen setMarket; Eingabesnapshot erhält _marketCode; Verlaufwechsel prüft Herkunft. | Alle zwölf gerichteten Marktwechsel, Abbrechen, Reload, History US nach TR |
| B03 | CONFIRMED | [verlauf.js:63](/Users/hakanguer/Desktop/evspend/verlauf.js:63), `function _currentIsUs() { return _currentMarket() === "us"; }` | Automatisch erkannter US Markt wurde nicht persistiert, der Verlauf leitete Einheiten nur aus dem gespeicherten Schlüssel ab. Beide Einstiegspfade sind korrigiert. Korrektur: init persistiert erkannten Markt, Verlauf verwendet gemeinsamen Browserfallback. | B03 direct US history label, vier Speichern und Restore Abläufe |
| B04 | EXPECTED_BEHAVIOR | [verlauf.js:1496](/Users/hakanguer/Desktop/evspend/verlauf.js:1496), `const priceDisp = isEv ? e.price : _fuelPriceToCurrent(e.price);` | Die Anzeige konvertiert physikalische Mengen in die Einheiten des ausgewählten UI Marktes und erhält die Eintragswährung. EUR/gal und TRY/gal sind deshalb bei korrekter Literumrechnung gültig. Keine Wechselkurse und keine Addition verschiedener Währungen. Darstellung jedes Eintrags in seinem Herkunftsmarkt wäre eine Produktänderung. Keine Produktänderung zu diesem Befund. | B04 no history mutation, Mixed Currency Test, physikalische Äquivalenz |
| B05 | PRODUCT_DECISION_REQUIRED | [script.js:2759](/Users/hakanguer/Desktop/evspend/script.js:2759), `// Skip initial calc(): empty-state stays visible until first user interaction.` | Leerer Erststart und Bestätigungshinweis sind ausdrücklich dokumentiertes Verhalten. Inputereignisse rechnen bereits automatisch, die Markierung fordert eine bewusste Bestätigung. Ein Wechsel zu ausschließlich sofortigen Ergebnissen ist eine UX Entscheidung. Keine Produktänderung zu diesem Befund. | Quellcodeabgleich initApp und markStale, Browser Erstbesuch |
| B06 | CONFIRMED | [script.js:3221](/Users/hakanguer/Desktop/evspend/script.js:3221), `yearAfterOther: "Jahren"` | Die DE Break-Even Anzeige verwendete den Nominativ Jahre. Der Dativ wird jetzt getrennt von der Reglerbeschriftung aufgelöst. Korrektur: eigene yearAfterOne/yearAfterOther Schlüssel. | B06/B17 renderLongterm: 6,0 Jahren |
| B07 | CONFIRMED | [verlauf.js:1393](/Users/hakanguer/Desktop/evspend/verlauf.js:1393), `const avgRaw = distance > 0 ? total / distance * 100 : NaN;` | Sichtbare Statistik war ungewichtet, die barrierefreie Zusammenfassung bereits gewichtet. 10 km zu 5 und 490 km zu 10 ergeben nun einheitlich 9,90 statt 7,50. Korrektur: renderStats: gewichteter Durchschnitt aus Gesamtkosten und Gesamtstrecke. | B07 weighted visible statistic sowie Web und native Statistiktests |
| B08 | CONFIRMED | [verlauf.js:94](/Users/hakanguer/Desktop/evspend/verlauf.js:94), `const costStr = fmtMoneyEntry(cost, _pickEntryCurrency(entry) ? entry : null, 2);` | V2 Eintragstitel und Summen verloren durch Anzeige ohne Nachkommastellen Centpräzision. Rohdaten waren erhalten. Titel und Summen zeigen jetzt zwei Nachkommastellen. Korrektur: formatEntryTitle und renderStats verwenden zwei Nachkommastellen. | B08 visible cents, money-locale Tests, native Statistiktest |
| B09 | CONFIRMED | [verlauf.js:1384](/Users/hakanguer/Desktop/evspend/verlauf.js:1384), `nEl.textContent = agg.length` | Der Zähler im Fahrzeugblock enthielt auch die von dessen Geldaggregat ausgeschlossenen Fremdwährungseinträge. Er zählt jetzt die tatsächlich aggregierten Einträge. Der übergeordnete Gesamtzähler bleibt ein Gesamtzähler. Korrektur: renderStats: agg.length. | B09 lead-currency count: 2 statt 3 |
| B10 | EXPECTED_BEHAVIOR | [script.js:1942](/Users/hakanguer/Desktop/evspend/script.js:1942), `const yearlyCost  = monthlyCost * 12;` | yearlyCost ist das bestehende historische Schemafeld für zwölf identische Strecken. Es ist ausdrücklich dokumentiert. CSV bezeichnet Kosten (Strecke) und Kosten (Jahr, 12x Strecke). monthlyCost ist ein stabiler interner Legacy Name. Entfernen oder Umdeuten würde Backupkompatibilität gefährden. Keine Produktänderung zu diesem Befund. | bestehende historical-import, history-restore und export-serialization Tests |
| B11 | CONFIRMED | [script.js:3925](/Users/hakanguer/Desktop/evspend/script.js:3925), `min: 50,    max: 3100` | US Default 1.000 passte nicht zu min 60 und step 50. Der echte Browser zeigte 1.010 bei intern 1.000. Der neue Ursprung 50 enthält 1.000. Bereits gespeicherte Werte wie 110 oder 1.234,5 bleiben exakt erhalten. Korrektur: US Monatsregler min 50, applyLongterm erhält akzeptierte Werte außerhalb des Schrittrasters. | B11 monthly state/slider, H2 Tests und native Dezimalrestore |
| B12 | CONFIRMED | [script.js:1635](/Users/hakanguer/Desktop/evspend/script.js:1635), `badgeEl.hidden = km === 0;` | Der Vergleich zeigte bei null Strecke Kosten ähnlich. Der Ergebnisbetrag null ist korrekt, eine Fahrzeugbewertung ist dort nicht aussagekräftig. Die Badge wird bei null ausgeblendet. Korrektur: calcCompare: keine Urteilbadge bei km gleich null, auch bei expliziter CSS display Regel. | Nullstrecken Referenztests und Browsercheck auf tatsächliche CSS Sichtbarkeit |
| B13 | EXPECTED_BEHAVIOR | [verlauf.js:1105](/Users/hakanguer/Desktop/evspend/verlauf.js:1105), `_tv("tableHeaderDistanceMetric")` | CSV exportiert kanonische metrische Rohwerte mit metrischem Streckenheader sowie Währung, Markt und Sprache. ev/vb sind stabile Typcodes. Geldwerte und Preise sind bereits begrenzt formatiert, dieser Teil wurde im vorigen Audit behoben. Eine marktspezifische Präsentationsdatei mit übersetzten Typnamen und weiteren Einheitenspalten ist eine Produktentscheidung. JSON bleibt das verlustfreie Backup. Keine Produktänderung zu diesem Befund. | bestehende export-serialization Tests und Browser JSON Export, CSV Serializerabgleich |
| B14 | CONFIRMED | [tr/index.html:59](/Users/hakanguer/Desktop/evspend/tr/index.html:59), `Bu uygulama JavaScript gerektirir.` | Falsche Euro Platzhalter und englische technische Fallbacks auf TR waren vorhanden. Platzhalter sind jetzt währungsneutral, TR noscript und die bestehenden technischen Beschriftungen sind lokalisiert. Einheitlicher englischer Produkttitel und Untertitel bleiben als Markenentscheidung bestehen. Korrektur: drei HTML Rechnerseiten: neutrale Ergebnisplatzhalter und bestehende Übersetzungen als Fallback. | B14 no euro placeholder in vier Märkten, statischer HTML Abgleich |
| B15 | CONFIRMED | [script.js:3321](/Users/hakanguer/Desktop/evspend/script.js:3321), `shareRideshareDifference:` | Vergleichstext nannte keine eindeutige Richtung, die Differenz pro Person war wie Kosten beschriftet. Text nennt jetzt die Richtung und kennzeichnet die Differenz. Identische neutrale Bildlabels Geschätzte Differenz sind für sich kein Rechenfehler. Korrektur: buildShareTextCompare und _injectRideshareLine. | B15/B24 US Sharetext: $57.60, $30.03 Differenz pro Person und Richtung |
| B16 | PRODUCT_DECISION_REQUIRED | [script.js:2387](/Users/hakanguer/Desktop/evspend/script.js:2387), `sentence += " " + _t("sentenceCarpoolSuffix"` | Zwei aufeinanderfolgende Klammergruppen sind nachvollziehbar aus Eingabenvorbehalt und Personenbezug zusammengesetzt. Sie verändern keine Zahl und sind ein redaktioneller Verbesserungsvorschlag. Keine Produktänderung zu diesem Befund. | Quellcodeabgleich _resultSentence und _drawCompare9x16 |
| B17 | CONFIRMED | [script.js:1752](/Users/hakanguer/Desktop/evspend/script.js:1752), `if (noPremium && years > 0 && monat > 0)` | Bei Mehrpreis null blieben Vorteil und Nachteil beide verborgen. Jetzt wird der tatsächliche operative Vorteil oder Nachteil angezeigt. Die Aussage zur sofortigen Kostendifferenz benennt das E-Auto in allen Sprachen. Korrektur: renderLongterm zeigt Ergebnis auch ohne Mehrpreis, profitableNow konkretisiert. | B17 savings visible, positive/negative/zero-years Unitregressionen |
| B18 | PRODUCT_DECISION_REQUIRED | [script.js:3224](/Users/hakanguer/Desktop/evspend/script.js:3224), `totalSavingsLabel: "Geschätzte Differenz nach Break-Even: {val}"` | Umbenennung zu Vorteil am Ende des Zeitraums ist eine Produkttextentscheidung. Die Berechnung zieht bereits korrekt den Mehrpreis von der operativen Kostendifferenz ab. Keine Produktänderung zu diesem Befund. | Langzeit Referenzmatrix und Quellcodeabgleich |
| B19 | EXPECTED_BEHAVIOR | [script.js:1399](/Users/hakanguer/Desktop/evspend/script.js:1399), `v = Math.max(0, Math.min(20, Math.round(v)));` | Null Jahre ist ein unterstützter Grenzfall mit null Energiekosten und verbleibendem Mehrpreis. Grok fordert gleichzeitig min 1 und einen Test mit null Jahren. Der bestehende Nulljahresfall bleibt unterstützt. Keine Produktänderung zu diesem Befund. | Grok reference longterm de 1500 0 18 und bestehende core Tests |
| B20 | CONFIRMED | [script.js:1341](/Users/hakanguer/Desktop/evspend/script.js:1341), `kmMonat > (_isUsMarket() ? 1900 : 3000)` | applyLongterm und setKmMonat verwendeten unterschiedliche US Warnschwellen. Beide Pfade verwenden jetzt 1.900 mi beziehungsweise 3.000 km. Korrektur: applyLongterm verwendet marktbezogene Schwelle. | Quellcodeabgleich beider Aufrufpfade, Browser Langzeit |
| B21 | PRODUCT_DECISION_REQUIRED | [script.js:699](/Users/hakanguer/Desktop/evspend/script.js:699), `function shareQuick()` | shareQuick und CURRENCY_RATES sind noch vorhanden, aber nicht im produktiven neuen Berechnungsweg. Aufräumen wäre ein Refactoring ohne bestätigten Funktionsfehler und wurde nicht ausgeführt. Keine Produktänderung zu diesem Befund. | gezielte Referenzsuche in script.js und verlauf.js |
| B22 | CONFIRMED | [script.js:4444](/Users/hakanguer/Desktop/evspend/script.js:4444), `kmMonat = storedKm !== null` | Die allgemeinen Eingaben wurden bereits begrenzt, historische Restorebindungen waren bereits geschützt. Offen waren Langzeitwerte außerhalb der Grenzen und die alte Vergleichskappung 5.000 statt aktuellem Maximum. Nur diese Pfade sind korrigiert. Historische 1.250 km und Zwischenwerte werden nicht pauschal gekappt. Korrektur: init normalisiert Langzeitgrenzen; loadInputs liest Legacy Vergleichsmaximum aus DOM; historische Bindungen erhalten. | B22 vier Märkte, Grenzwerte, 1.234,5 und 1.050; alle bisherigen Restoretests |
| B23 | CONFIRMED | [script.js:3459](/Users/hakanguer/Desktop/evspend/script.js:3459), `rangeEmpty: "Estimated range: — {unit}"` | EN Leerzustand enthielt einen nicht ersetzten km Platzhalter. Jetzt bleibt nur die korrekt aufgelöste Einheit und der leere Wert. Korrektur: EN rangeEmpty. | Quellcodeabgleich Übersetzung und Browser Initialisierung |
| B24 | CONFIRMED | [script.js:2632](/Users/hakanguer/Desktop/evspend/script.js:2632), `strompreis:          v => _fmtMoney(v, 2)` | Preisregler, Premium und Sharetexte setzten Symbole manuell. Sie verwenden nun den vorhandenen Intl Geldformatter. Gespeicherte Eintragslocale bleibt erhalten. Das bereits korrekte EU en-IE Format wird nicht auf en-GB umgestellt. Korrektur: _fmtMoney in Regler, Premium, Sharetext und Verlaufsmetadaten. | Money locale Tests, B15/B24 Sharetext, vier Browserprofile |
| B25 | PRODUCT_DECISION_REQUIRED | [script.js:3393](/Users/hakanguer/Desktop/evspend/script.js:3393), `labelEvConsumption: "Electric efficiency"` | Terminologie und regionale Schreibweisen sind uneinheitlich. Angezeigte Einheiten und Rechnungen sind überprüft. Energy consumption und ein einheitliches Glossar sind redaktionelle Produktverbesserungen. Keine Produktänderung zu diesem Befund. | Quellcodeabgleich Übersetzungen, physikalische Äquivalenztests |
| B26 | PRODUCT_DECISION_REQUIRED | [script.js:3633](/Users/hakanguer/Desktop/evspend/script.js:3633), `typeVb: "Benzinli"` | Benzinli und İçten yanmalı können sprachlich vereinheitlicht werden. Der Rechner akzeptiert Verbrauch und Preis eines Verbrenners und behauptet keinen zusätzlichen Dieselmodus. Keine Produktänderung zu diesem Befund. | TR Quellenabgleich, TR EV und Verbrenner Referenztests |
| B27 | PRODUCT_DECISION_REQUIRED | [script.js:3711](/Users/hakanguer/Desktop/evspend/script.js:3711), `breakevenAfter: "Tahmini break-even yaklaşık {years} sonra"` | Die vollständige Übersetzung des Fachbegriffs zu başabaş noktası ist eine Textentscheidung. Die Break-Even Zahl ist unabhängig überprüft. Keine Produktänderung zu diesem Befund. | TR Langzeitmatrix und Übersetzungsabgleich |
| B28 | PRODUCT_DECISION_REQUIRED | [script.js:3719](/Users/hakanguer/Desktop/evspend/script.js:3719), `kmPerYearApprox: "≈ {km} {unit} yıllık"` | Die vorgeschlagene türkische Satzstellung ist eine sprachliche Verbesserung und ändert keinen Jahreskilometerwert. Keine Produktänderung zu diesem Befund. | TR Quellenabgleich, Monatsstrecke mal zwölf geprüft |
| B29 | PRODUCT_DECISION_REQUIRED | [script.js:3759](/Users/hakanguer/Desktop/evspend/script.js:3759), `verlaufHintText: "Girdileriniz artık geçmişte"` | sen und siz werden gemischt. Eine konsistente Anrede verlangt eine Produkttextentscheidung, keine technische Berechnungskorrektur. Keine Produktänderung zu diesem Befund. | gezielter TR Übersetzungsabgleich |
| B30 | PRODUCT_DECISION_REQUIRED | [script.js:3823](/Users/hakanguer/Desktop/evspend/script.js:3823), `entriesHeader: "Girdiler"` | kayıt ist für gespeicherte Einträge präziser. Die Änderung des Glossars ist ein Textvorschlag, gespeicherte Einträge und Zähler funktionieren im geprüften Umfang. Keine Produktänderung zu diesem Befund. | TR Verlauf und Quellcodeabgleich |
| B31 | PRODUCT_DECISION_REQUIRED | [script.js:3816](/Users/hakanguer/Desktop/evspend/script.js:3816), `shareRideshareLine: "Araç paylaşımı` | Ortak yolculuk und Araç paylaşımı werden unterschiedlich verwendet. Beide Pfade teilen korrekt durch die Personenzahl. Einheitliche Benennung bleibt Produktentscheidung. Keine Produktänderung zu diesem Befund. | TR Fahrgemeinschaft Referenzen und Quellenabgleich |
| B32 | CONFIRMED | [script.js:3743](/Users/hakanguer/Desktop/evspend/script.js:3743), `longtermPremiumLabel: "Elektrikli aracın benzinliye göre fiyat farkı"` | Offensichtlich vertauschte türkische Wortstellung fark fiyatı ist zu fiyat farkı korrigiert. Korrektur: TR longtermPremiumLabel und statischer Fallback. | Übersetzungsabgleich und native Bundleparität |
| B33 | CONFIRMED | [script.js:4261](/Users/hakanguer/Desktop/evspend/script.js:4261), `market: code.toUpperCase()` | Unübersetzte Ländernamen im lokalisierten Warndialog sind durch die bereits in der Marktauswahl verwendeten neutralen Marktcodes ersetzt. Korrektur: setMarket verwendet Marktcodes im bestehenden Warntext. | alle inkompatiblen Browsermarktwechsel mit Dialog |
| B34 | CONFIRMED | [script.js:4383](/Users/hakanguer/Desktop/evspend/script.js:4383), `return gotoLocale(code, "/?market=" + code)` | Rückwechsel von regionalen Shells blieb auf der falschen URL. Rechner und Verlauf navigieren nun zurück. Die Geo Middleware respektiert die ausdrückliche DE/US Auswahl über einen eng begrenzten Querywert, ohne Cookie. Korrektur: beide Marktmenüs und middleware.js. | alle zwölf Marktwechsel mit Routen und Reload, Middlewaretests TR/FR/GB |
| B35 | CONFIRMED | [script.js:2427](/Users/hakanguer/Desktop/evspend/script.js:2427), `value: _fmtMoney(d.totalCost, 2)` | Doppelmeldung zu B24. Die gleiche Formatkorrektur wird nicht als zusätzlicher unabhängiger Fehler gerechnet. Korrektur: gemeinsame Korrektur mit B24. | Money locale und Sharetexttests |
| B36 | CONFIRMED | [script.js:4201](/Users/hakanguer/Desktop/evspend/script.js:4201), `const legalPages = {footerImpressum:` | US Oberfläche verlinkte deutsche Rechtsseiten. Rechner und Verlauf verweisen nun auf die vorhandenen englischen Seiten. Es wurden keine Rechtstexte geändert. Korrektur: applyTranslations und _applyTranslationsVerlauf setzen bestehende Sprachziele. | B36 English legal links, Quellenabgleich Verlauf |
| B37 | PRODUCT_DECISION_REQUIRED | [script.js:3131](/Users/hakanguer/Desktop/evspend/script.js:3131), `heroSubtitle1: "Electric & Fuel Cost Calculator"` | Deutscher Produkttitel, Untertitel und allgemeinerer Kraftstoffbegriff sind redaktionelle Produktentscheidungen. Rechenmodell und Ausschlusshinweise werden dadurch nicht verändert. Keine Produktänderung zu diesem Befund. | gezielter DE HTML und Übersetzungsabgleich |
| B38 | CONFIRMED | [index.html:248](/Users/hakanguer/Desktop/evspend/index.html:248), `data-i18n="calculate">Ergebnis aktualisieren` | Technische HTML Fallbackbeschriftungen wichen von den bestehenden JS Übersetzungen ab. Betroffene Rechnerbeschriftungen sind an die vorhandenen Übersetzungen angeglichen. Korrektur: drei HTML Rechnerseiten, keine Designänderung. | statischer HTML Abgleich und vier Browser Erstbesuche |
| B39 | CONFIRMED | [script.js:3613](/Users/hakanguer/Desktop/evspend/script.js:3613), `ariaSettings: "Ayarlar"` | Mehrere Gruppen und Aktionen hatten feste deutsche oder englische aria-labels. Die vorhandene data-i18n-aria Verarbeitung lokalisiert nun auch diese Beschriftungen. Korrektur: drei HTML Seiten und bestehende Übersetzungslisten. | B39 accessible settings language für vier Märkte |
| B40 | CONFIRMED | [verlauf.js:1969](/Users/hakanguer/Desktop/evspend/verlauf.js:1969), `unit: _currentLanguage() === "de" ? distLong : distLong.toLowerCase()` | Einheitennamen in der EN/TR Diagrammzusammenfassung übernahmen die Großschreibung aus Tabellenüberschriften. Die Zusammenfassung verwendet jetzt sprachgerechte Kleinschreibung. Deutsche Substantive bleiben groß. Korrektur: barrierefreie Diagrammzusammenfassung. | Quellcodeabgleich und echte Diagrammzusammenfassung im Browser |
| B41 | CONFIRMED | [script.js:1413](/Users/hakanguer/Desktop/evspend/script.js:1413), `// The browser handles interaction steps; preserve accepted stored precision.` | Der normale Regler hat weiterhin sein sichtbares Interaktionsraster. Bereits akzeptierte beziehungsweise gespeicherte 1.050 dürfen jedoch nicht beim Laden oder Setteraufruf auf 1.100 wechseln. Diese Präzisionsabweichung ist behoben. Korrektur: applyLongterm erhält Schrittfremdwerte, setLongtermPremium begrenzt ohne Zusatzrundung. | B41 restored premium exact und accepted premium exact in vier Browsermärkten, native restore |
| B42 | PRODUCT_DECISION_REQUIRED | [script.js:3873](/Users/hakanguer/Desktop/evspend/script.js:3873), `Sie dienen als editierbare Beispielwerte und sind keine unabhängig` | Die Standardwerte sind ausdrücklich manuell festgelegte Beispiele, keine aktuellen Marktstatistiken. Die von Grok genannten Oktoberpreise wurden nicht als neue Grundlage übernommen. Neue Ladeprofile, Verlustaufschläge und Standardpreise benötigen eine geprüfte Grundlage und Produktfreigabe. Keine Produktänderung zu diesem Befund. | bestehende Disclaimer und Marktdefinitionen geprüft; Preisrecherche nicht Teil der Korrektur |
| B44 | LEGAL_REVIEW_REQUIRED | [en-eu/hinweise.html:81](/Users/hakanguer/Desktop/evspend/en-eu/hinweise.html:81), `The operator assumes <strong>no warranty` | Veralteter Stand und inhaltlich abweichender Haftungsausschluss sind im ausgelieferten EU Dokument vorhanden. Kein automatisches Kopieren einer anderen Rechtsfassung. Rechtlich prüfen lassen. Keine Produktänderung zu diesem Befund. | Livebytes identisch, Textvergleich mit hinweise.en.html; keine Rechtsfreigabe |
| B45 | LEGAL_REVIEW_REQUIRED | [en-eu/barrierefreiheit.html:132](/Users/hakanguer/Desktop/evspend/en-eu/barrierefreiheit.html:132), `entered into force on June 28, 2025` | Der Text vermischt Inkrafttreten und Anwendungsbeginn. Primärquelle des EU Rats nennt Juni 2019 und Anwendung ab 28.06.2025. Factualer Unterschied bestätigt, rechtliche Erklärung unverändert zur Prüfung ausgewiesen. Keine Produktänderung zu diesem Befund. | EU Rat als Primärquelle; Livebytes identisch; keine Rechtsfreigabe |
| B46 | LEGAL_REVIEW_REQUIRED | [hinweise.en.html:72](/Users/hakanguer/Desktop/evspend/hinweise.en.html:72), `do not represent verified market statistics, entering your own values` | Kommas verbinden in den Hinweisseiten selbständige Aussagen. Das ist ein redaktioneller Hinweis in Rechtstexten, kein technischer Fehler. Insbesondere ist die pauschale Behauptung eines identischen Fehlers in allen drei Sprachen nicht belegt. Bei der rechtlichen Textpflege mitprüfen. Keine Produktänderung zu diesem Befund. | DE/EN/TR Hinweisseiten gelesen, keine automatische Textänderung |
| B43 | UNGEPRÜFT, nicht geliefert | codex-prompt.md enthält keinen B43 Abschnitt | Keine Aussage erfunden. | Kein Test mangels Befundtext |

## Zusätzlicher bestätigter Befund

**N01, P2, lokal geschlossen:** Die barrierefreie Diagrammzusammenfassung und die Detailtabelle nutzten die Währung des UI Markts, obwohl das Diagramm bereits die gespeicherte Leitwährung verwendete. Ein ausschließlich aus USD bestehender Verlauf unter DE wurde dadurch als Euro vorgelesen. Der Ausgangsstand lieferte ausdrücklich „6,00 Euro“ für USD. Quelle: [verlauf.js:1917](/Users/hakanguer/Desktop/evspend/verlauf.js:1917), `const currLong = _currencyLongform(leadTable.code);`. Die Korrektur in `_updateChartAccessibility` bindet Geldformat und Langnamen an die tatsächliche Leitwährung. Die Distanzkonversion bleibt marktbezogen. Vorher: `baseline-extra.json`. Nachher: Browserchecks `N01 accessible chart follows USD entry currency` und `N01 accessible table uses dollar`.

Die Geo Weiterleitung beim Rückwechsel und die Herkunft der Rechnerparameter bei einem Marktwechsel auf der Verlaufsseite sind als zusätzliche Ausprägungen von B34 beziehungsweise B02 behoben, nicht als weitere unabhängige Befunde doppelt gezählt.

## Unabhängige Rechnungen und Schutz vor Regressionen

Die bestehenden Kostenformeln wurden nicht geändert. `costPer100 * km * 12 / 100` bleibt erhalten. Alle Kosten werden aus ungerundeten Werten berechnet, gerundet wird an der Ausgabe. Die exakten Umrechnungsfaktoren 1,609344 km/mi und 3,785411784 L/US gal bleiben erhalten. Groks gerundete Konstante 235,215 wurde nicht anstelle des exakten Verhältnisses übernommen.

Die zusätzliche Rechenmatrix deckt die gelieferten Einzelrechnungen, Vergleiche, Personenteilung, Langzeitvorteile und Nachteile, null Jahre und die Monatsgrenze ab. Beispiele: DE 123 km mit 16,5 und 0,42 ergibt 8,5239, Anzeige 8,52. Verbrenner 333 km mit 8,3 und 1,79 ergibt 49,47381, Anzeige 49,47. DE Langzeit 8 Jahre ergibt netto 12, fünf Jahre einen Nachteil 2.242,50, Anzeige 2.243. US Langzeit ergibt netto 3.509,230769..., Anzeige 3.509. TR fünf Jahre ergibt Nachteil 20.080.

Drei Sprachen und vier Märkte sind geprüft. Die zusätzliche physikalische Äquivalenzmatrix umfasst alle zwölf Kombinationen. Sie setzt den gleichen numerischen Preis einer abstrakten Geldeinheit an und behauptet keine Wechselkurse zwischen EUR, USD und TRY. EU verwendet weiterhin en-IE; en-GB ist zusätzlich die Locale des eingesetzten EU Browserprofils.

Geschützte Fälle: 1.250 km bei Import, Öffnen, Reload und erneutem Speichern; historische Zwischenwerte; vollständige Backupwiederherstellung; 51. Save atomar abgewiesen; Import über Gesamtkapazität atomar abgewiesen; Legacybestand 51 bleibt vollständig an seiner Quelle. Keine Mutation der gespeicherten Verlaufseinträge beim Marktwechsel.

## Verifikation

| Schlüssel | Ergebnis und Scope |
|---|---|
| CALCULATION_STATUS | PASS, Formeln unverändert, unabhängige Erwartungswerte und zwölf Markt/Sprachkombinationen |
| MARKET_SWITCH_STATUS | PASS, zwölf gerichtete Browsermarktwechsel, Abbrechen, Routen, Reload und zusätzlicher Verlaufwechsel |
| HISTORY_STATUS | PASS im geprüften Scope, 1.250 km und frühere Verlustpfade erhalten |
| CURRENCY_UNIT_STATUS | PASS für geprüfte Anzeige und Aggregation, keine FX Umrechnung eingeführt |
| LONGTERM_STATUS | PASS, inklusive null Jahren, Mehrpreis null, negativer Betriebsvorteil und US Monatsregler |
| WEB_IOS_PARITY | PASS für gemeinsame Berechnungsfälle und betroffene Ressourcen, native Adapter separat getestet |
| REGRESSION_TESTS | Web Quelle 400/400, Web minifiziert 400/400, native Tests 101/101, Browser 208/208, Cache 6/6 |
| WEB_BUILD | PASS, vorhandener npm run build einschließlich Lizenzprüfung |
| IOS_BUILD | PASS, Debug Simulator, Signing deaktiviert, feste Packageauflösung |
| P0_OPEN | 0 bestätigte technische Befunde im Auftrag |
| P1_OPEN | 0 bestätigte technische Befunde im Auftrag |
| P2_OPEN | 0 bestätigte technische Befunde im Auftrag |
| P3_OPEN | 0 bestätigte technische Befunde im Auftrag |

Die Zählung wiederholter Testvarianten wird nicht als Anzahl unabhängiger mathematischer Fälle ausgegeben. 400 Quelle und 400 minifiziert sind dieselbe Suite in zwei Fassungen. Die native Suite enthält denselben zusätzlichen Rechenfallkatalog.

[Web Regressionen](tests/grok-regression.test.mjs), [Rechenmatrix](tests/grok-calculations.test.mjs), [Browserregressionen](tests/grok-browser.cjs), [Cacheübergang](tests/grok-cache.browser.cjs). Native Prüfungen: [Regressionen](/Users/hakanguer/Desktop/evspend-ios/evspend/tests/grok-regression.test.mjs) und [Rechenmatrix](/Users/hakanguer/Desktop/evspend-ios/evspend/tests/grok-calculations.test.mjs). Vollständige Logs liegen im Evidenceordner.

Der Simulatorbuild wurde im eigenen Simulator `EVSpendPure Grok Check 20261018` unter iOS 26.5 gestartet und visuell geprüft. [Startbild](tests/grok-evidence/native-launch.png). Die native Berechnungs- und Persistenzregression nutzt die vorhandene VM mit nativen Adaptern. Sie ist kein Beweis für vollständige Bedienabläufe auf einem echten iPhone. Reale iPhone Tests, Android Gerätetests und eine neue Storeabnahme wurden nicht durchgeführt. Der bekannte Umfang des vorigen Audits wird nicht erweitert behauptet.

Acht betroffene Ressourcen wurden zwischen `dist`, `ios/App/App/public` und dem tatsächlich gebauten `App.app/public` verglichen. Das native Bundle enthält bewusst die bestehenden Adapter und native Pfadumschreibungen. Es wird keine pauschale Bytegleichheit zum Webbundle behauptet.

## Risk Guard und offene Entscheidungen

Risk Guard ausgelöst: JA, betroffen sind die vorhandene lokale Speicherung von Recheneingaben, deren Einheitenherkunft, lokale Wiederherstellung und Ausgabe. Keine neue Dependency, kein neues SDK, kein neuer Font, keine neue Iconquelle und kein neues externes Netzwerkziel. Ein voller neuer Release oder Security Audit wurde nicht gestartet. Launch Guard nicht neu ausgelöst, da weder Veröffentlichung noch Produktionsfreigabe Teil dieses Auftrags sind.

| Bereich | Inventar | Anwendbarkeit | Status | Beleg |
|---|---|---|---|---|
| Lokale Eingabesnapshots und Herkunft | DETECTED | RELEVANT | PASS im geprüften Scope | _marketCode, Restore und Marktwechseltests |
| Historie und lokale Dateiimporte | DETECTED | RELEVANT | PASS im geprüften Scope | drei Verlustschutzpfade, bestehende Web und native Suites |
| Ausgabe von Notizen und Exporttransport | DETECTED | RELEVANT | PASS im unveränderten betroffenen Scope | bestehende Import, Export und Native Exporttests |
| Code, Dependencies und Assets | DETECTED | RELEVANT | UNGEPRÜFT als umfassende neue Lizenzfreigabe | keine Ressource geändert, vorhandene build:licenses Prüfung PASS; frühere Rechtefragen bleiben separat |
| Rechtsfassungen B44/B45/B46 | DETECTED | RELEVANT | NEEDS_DECISION | rechtlich prüfen lassen, keine neue Rechtsfassung erstellt |
| Reales iPhone und Storeverteilung | DECLARED | RELEVANT | UNGEPRÜFT in diesem Auftrag | Simulatorbuild und VM ersetzen keine reale Geräteabnahme |

B45 Primärquellen: [EU Rat, Inkrafttreten 2019 und Anwendung ab 28. Juni 2025](https://www.consilium.europa.eu/en/policies/accessibility-goods-services/), [EU Kommission, Beginn der Anwendung](https://digital-strategy.ec.europa.eu/en/news/eu-becomes-more-accessible-all). Daraus wird keine Aussage zur individuellen gesetzlichen Verpflichtung dieses Produkts abgeleitet.

B42 bleibt eine Produktentscheidung über nachgewiesene Beispielpreise und mögliche neue Ladeprofile. B44/B45/B46 bei einer rechtlichen Textpflege prüfen lassen. B43 ist mangels Text nicht bewertbar. Die bereits dokumentierten älteren Hosting und Rechtefragen aus dem Releaseaudit bleiben erhalten, werden hier nicht neu entschieden oder als erledigt ausgegeben.

## Tatsächlich gelesene lokale Quellen

* Vollständiger Grok Bericht `/Users/hakanguer/Desktop/codex-prompt.md` und der ursprüngliche Auftrag im Textanhang.
* Web `AGENTS.md`, `package.json`, `middleware.js`, `vercel.json`, `script.js`, `verlauf.js`, relevante HTML Rechner- und Hinweisseiten, vorhandene Marktinitialisierung und Sprachumschaltung, bestehende Regressionstests und Testadapter. Keine gezielte Projektdatei CURRENT-STATE.md oder CLAUDE.md war vorhanden.
* iOS `README.md`, `package.json`, `capacitor.config.json`, gezielte Synchronisations- und Assetauswahlscripte, native Testadapter und Regressionen, Packageauflösung sowie die geschützte Projektdatei ausschließlich zur Hashkontrolle.
* Voriger Releaseaudit: `00-EXECUTIVE-SUMMARY.md`, `15-FINAL-ACCEPTANCE.md`, vorhandene Produktionsprüf- und Browserregressionsscripte, Rechenreferenzen und gezielte Nachweisdateien.
* AI-Brain: `00-Core/GLOBAL-RULES.md`; `08-Checklists/SECURITY-CHECKLIST.md` mit Statusmodell, Projektprofil und betroffenen Speicher-, Eingabe- und Exportabschnitten; `17-Playbooks/SECURITY-AUDIT-PLAYBOOK.md`; `31-Security-License-Governance/LICENSE-GOVERNANCE.md` Abschnitt 21; `32-Visual-Product-Quality-Pack/README.md`.
* UI-Library: `accessibility/README.md`, nur als gezielte Referenz, kein fremder Code übernommen.
* Knowledge: `INDEX.md`, `learnings/multi-waehrung.md`, `learnings/csv-export-sicherheit.md`, `learnings/capacitor-hybrid-app.md`.
* Skills: `daios-project-audit`, `daios-safe-implementation`, `capacitor-xcode-verification`.

Keine AI-Brain, UI-Library oder Knowledge Datei wurde verändert. Es wird kein neuer Standard oder Goldstatus vorgeschlagen.

## Geänderte Dateien und Gitstatus

Web: drei Rechner HTML Dateien für vorhandene Übersetzungsfallbacks und korrekte Initialwerte; `script.js` für Initialisierung, Marktwechsel, Präzision, Sharetext und Anzeige; `verlauf.js` für Statistik, Marktinitialisierung, Währung und sichere Umschaltung; `middleware.js` für die explizite Marktauswahl. Minifizierte Bundles, zugehörige Source Maps und `sw.js` wurden mit dem vorhandenen Build erzeugt. CSS bleibt unverändert.

Bestehende Tests `distance.test.mjs`, `money-locale.test.mjs` und `middleware.test.mjs` wurden für die korrigierten Grenzen, Anzeigepräzision und Geoausnahme ergänzt. Neue gezielte Regressionen, Rechenfälle, Browser- und Cachetests sowie dieser Bericht und seine Evidence wurden hinzugefügt.

iOS: acht betroffene Dateien in `dist`, dieselben acht Ressourcen im ignorierten `public` Buildordner und zwei neue gezielte Testdateien. Die geschützte `project.pbxproj` war vor Beginn geändert und bleibt bytegenau erhalten: SHA256 `99510ab788e629d6faacd2f2e3facba6b44f501335219cb92f1cd0cc3798bf0a`. Signing, Bundle-ID, Entitlements und Packageversionen wurden nicht geändert.

| Schlüssel | Ergebnis |
|---|---|
| FILES_CHANGED | siehe vollständige Inventarliste unten und Git Nachweis |
| GIT_STATUS | beide Branches main, absichtlich lokale uncommittete Korrekturen |
| WEB_WORKTREE_CLEAN | Nein, auftragsgemäße lokale Änderungen |
| IOS_WORKTREE_CLEAN | Nein, lokale Bundleänderungen plus vorbestehende geschützte Änderung |
| COMMITTED | Nein |
| PUSHED | Nein |
| DEPLOYED | Nein |
| APP_STORE_UPLOAD | Nein |

Die Änderungen sind lokal reviewbar. Dieser Bericht ist keine Produktions- oder Storefreigabe.

## Vollständige Änderungsinventarliste

[Maschinenlesbarer Gitstatus](tests/grok-evidence/git-status.json). Die unversionierten Evidenzdateien werden in dieser Liste als eine Gruppe dargestellt.

### Web

* `en-eu/index.html`
* `index.html`
* `middleware.js`
* `script.js`
* `script.min.js`
* `script.min.js.map`
* `sw.js`
* `tests/distance.test.mjs`
* `tests/middleware.test.mjs`
* `tests/money-locale.test.mjs`
* `tr/index.html`
* `verlauf.js`
* `verlauf.min.js`
* `verlauf.min.js.map`
* `GROK-AUDIT-2026-10-18.md`
* `tests/grok-browser.cjs`
* `tests/grok-cache.browser.cjs`
* `tests/grok-calculations.test.mjs`
* `tests/grok-regression.test.mjs`
* `tests/grok-server.py`

### iOS

* `dist/en-eu/index.html`
* `dist/en-eu/verlauf.html`
* `dist/index.html`
* `dist/script.min.js`
* `dist/tr/index.html`
* `dist/tr/verlauf.html`
* `dist/verlauf.html`
* `dist/verlauf.min.js`
* `ios/App/App.xcodeproj/project.pbxproj` (vorbestehend, unverändert erhalten)
* `tests/grok-calculations.test.mjs`
* `tests/grok-regression.test.mjs`

Web zusätzlich: `tests/grok-evidence/` mit Befundregister, aktuellen Produktionshashes, Vorher/Nachher Nachweisen, vollständigen Prüfprotokollen und ausschließlich synthetischen Screenshots. Diese Evidenz liegt bewusst im bestehenden Testbereich, damit sie nicht als neue Produktressource in das Lizenzinventar gelangt. Die Lizenzregeln wurden nicht abgeschwächt.

## Reproduzierbare Ausführung

Aus dem Web Repository: `npm test`, `EVSPEND_TEST_MINIFIED=1 npm test` und `npm run build`. Aus dem iOS Repository: `npm test` und die vorhandene gezielte Ressourcenauswahl `scripts/prepare-native-assets.mjs`. Keine Installation erforderlich. Die Browserprüfer nutzen die bereits installierte Playwright Runtime. `PLAYWRIGHT_MODULE` und `CHROMIUM_PATH` können auf eine vorhandene Runtime zeigen.

Für den Browserlauf einen getrennten lokalen Prozess mit `python3 tests/grok-server.py /Users/hakanguer/Desktop/evspend 8766` starten, dann im Web Repository `node tests/grok-browser.cjs` ausführen. `GROK_BASE` und `GROK_OUT` erlauben einen anderen lokalen Testport beziehungsweise Ausgabeort. Alle Browserprofile sind isoliert und verwenden synthetische Daten.

Für den Cachetest in `/private/tmp/evspend-grok/baseline` den Ausgangscommit `638839b` mit `git archive` auspacken. Ein lokaler Server muss `/private/tmp/evspend-grok/current` auf Port 8767 bedienen. `node tests/grok-cache.browser.cjs` wechselt ausschließlich den temporären Symlink vom Ausgangsstand zum aktuellen Web Repository, wartet auf die neue Cachegeneration und prüft Offlineaufrufe sowie erhaltene Testdaten. Die verwendete Baseline und neue Cacheversion stehen im Cacheprotokoll.
