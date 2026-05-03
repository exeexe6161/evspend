# EVSpend — Release-Checkliste

Kurze Liste zum Abhaken nach jedem `git push` auf `main`.
Reihenfolge: Deploy → Frontend → Funktionen → Legal → Sicherheit → Repo.

---

## 1. Deploy-Status

- [ ] GitHub-Push hat funktioniert (kein roter Status auf dem letzten Commit)
- [ ] Vercel hat einen neuen Production-Deploy gestartet
- [ ] Vercel-Build steht auf „Ready" (grün), kein „Error" oder „Failed"
- [ ] Letzte Commit-Message und Vercel-Deploy gehören sichtbar zueinander

---

## 2. Startseiten laden

- [ ] `https://www.evspend.com/` öffnet sich, Splash erscheint und verschwindet sauber
- [ ] `https://www.evspend.com/en-eu/` öffnet sich, englischer Text, Splash funktioniert
- [ ] In beiden Versionen: kein leerer Bildschirm, keine Konsolen-Fehlerseite, kein „Application Error"

---

## 3. Rechner — Vergleichsmodus

- [ ] Vergleichsmodus (EV vs. Verbrenner) ist aktiv
- [ ] Slider bewegen sich flüssig, farbiger Track sitzt unter dem Thumb
- [ ] Großes Ergebnis-Feld zeigt Zahl + Währung
- [ ] Badge zeigt z. B. „Niedrigerer geschätzter Betrag" — **nicht** mehr „günstiger" / „cheaper"
- [ ] Ergebnis ändert sich live, wenn ein Slider bewegt wird

---

## 4. Rechner — Einzelberechnung

- [ ] Einzelmodus aktivieren, einmal EV-Typ, einmal Verbrenner-Typ
- [ ] Reichweitenanzeige stimmt (Beispiel: 60 kWh / 17 kWh/100 km ≈ 353 km)
- [ ] „Geschätzte Vollladung" erscheint, wenn Batterie + Strompreis gesetzt sind
- [ ] Hinweis „Ohne Ladeverluste und Grundgebühren" sitzt darunter
- [ ] Ergebnistexte enthalten **kein** „Ersparnis" / „savings" / „tasarruf"

---

## 5. Teilen

- [ ] Button „Teilen als Text" → Share-Sheet oder Clipboard-Toast
- [ ] Geteilter Text enthält „Geschätzte Differenz" / „Estimated difference" / „Tahmini fark"
- [ ] Button „Teilen als Bild" → PNG wird generiert / Share-Sheet öffnet sich
- [ ] Bild zeigt Werte, Marke, evspend.com — keine kaputten Glyphen

---

## 6. Verlauf speichern und öffnen

- [ ] Eintrag im Rechner speichern (Notiz optional)
- [ ] Toast bestätigt das Speichern
- [ ] `/verlauf` öffnen, neuer Eintrag erscheint oben
- [ ] Statistik-Karte zeigt vier Zellen: Summe / Ø Kosten/100 / Ø pro Berechnung / Niedrigster Wert
- [ ] Caveat-Zeile unter der Karte sichtbar
- [ ] Bei nur 1 Eintrag: „Niedrigster" zeigt „—" mit Hinweistext

---

## 7. Verlauf-Export

- [ ] **Backup exportieren** → Datei wird heruntergeladen (`evspend-verlauf-YYYY-MM-DD.json`)
- [ ] **Backup importieren** → dieselbe Datei → Toast meldet „0 importiert, 1 übersprungen" (Duplikat-Erkennung)
- [ ] **CSV exportieren** → Datei öffnet in Excel/Numbers/Google Sheets, 12 Spalten lesbar, Umlaute korrekt
- [ ] **PDF / Drucken** → Druckdialog öffnet sich, Vorschau zeigt Chart + Statistik + Liste, keine Buttons / Footer
- [ ] Bei leerem Verlauf: Export-Buttons melden „Verlauf ist leer"; Import-Button bleibt erreichbar

---

## 8. Legal-Seiten — Stichprobe

DE-Pfade:
- [ ] `/datenschutz` lädt, Markt-Init-Klausel erwähnt `x-vercel-ip-country`, kein „IP-Geolokalisierung"
- [ ] `/hinweise` lädt
- [ ] `/terms` lädt
- [ ] `/barrierefreiheit` lädt, Antwortzeit „vier Wochen"

EN-EU-Pfade:
- [ ] `/en-eu/datenschutz` lädt, Rechte-Block einmal vorhanden („Your Rights as a Data Subject")
- [ ] `/en-eu/barrierefreiheit` lädt, EAA-Card heißt „European Accessibility Context", Antwortzeit „within four weeks"

---

## 9. Asset-Sicherheit (kurze URL-Checks)

Diese URLs **müssen 404** liefern (im Browser-Tab oder per `curl -I`):

- [ ] `https://www.evspend.com/script.min.js.map` → 404
- [ ] `https://www.evspend.com/verlauf.min.js.map` → 404
- [ ] `https://www.evspend.com/script.js` → 404 (unminified Source)
- [ ] `https://www.evspend.com/styles-app.css` → 404 (unminified Source)
- [ ] `https://www.evspend.com/AUDIT_REPORT.md` → 404
- [ ] `https://www.evspend.com/RELEASE_CHECKLIST.md` → 404 (siehe Notiz unten)

Diese URLs **müssen 200** liefern:

- [ ] `https://www.evspend.com/script.min.js?v=…` → 200
- [ ] `https://www.evspend.com/verlauf.min.js?v=…` → 200
- [ ] `https://www.evspend.com/styles-app.min.css?v=…` → 200
- [ ] `https://www.evspend.com/site.webmanifest` → 200
- [ ] `https://www.evspend.com/LICENSES.md` → 200 (muss erreichbar bleiben)

---

## 10. Sprach-Sweep im Live-Ergebnis

Im sichtbaren Ergebnis-Text (DE/EN/TR durchklicken) **dürfen nicht mehr stehen**:

- [ ] „Ersparnis" / „Estimated savings" / „Tahmini tasarruf"
- [ ] „günstiger" / „cheaper" / „daha ekonomik" / „daha uygun"
- [ ] „Vorteil E-Auto" / „EV advantage" / „avantajı"
- [ ] „lohnt sich" / „profitabel" / „ab sofort günstiger"

Stattdessen müssen vorkommen:

- [ ] „Geschätzte Differenz" / „Estimated difference" / „Tahmini fark"
- [ ] „Niedrigerer geschätzter Betrag" / „Lower estimated amount" / „Daha düşük tahmini tutar"

---

## 11. Repo-Hygiene

- [ ] Lokal: `git status` zeigt „working tree clean"
- [ ] Lokal: `git log -1` zeigt den erwarteten Commit oben
- [ ] Auf GitHub: `main`-Branch ist sichtbar bis zum aktuellen Commit synchronisiert
- [ ] Service Worker `CACHE_VERSION` in `sw.js` passt zum letzten Patch-Thema (Datum + Stichwort)

---

## Notiz zur Sichtbarkeit dieser Datei

`RELEASE_CHECKLIST.md` ist standardmäßig **nicht** in `.vercelignore` aufgeführt und würde bei einem Deploy unter `https://www.evspend.com/RELEASE_CHECKLIST.md` öffentlich erreichbar werden. Falls das nicht gewünscht ist:

1. `RELEASE_CHECKLIST.md` als eigenen Eintrag in `.vercelignore` ergänzen, **oder**
2. die bestehende Audit-Zeile auf `*_CHECKLIST.md` / `RELEASE_*.md` erweitern, falls auch zukünftige Checklisten privat bleiben sollen.

Diese Datei ist reines Hilfsmittel, kein Bestandteil der Live-Site und sollte vor dem nächsten Deploy entweder geblockt oder bewusst freigegeben sein.
