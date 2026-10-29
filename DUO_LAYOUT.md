# Duo Layout (Web): zwei Spalten auf breiten Touch Fenstern

Prototyp. Auf aufgeklappten Foldables und breiten Touch Tablets zeigt die Seite Eingaben links und Ergebnis rechts (Ergebnis bleibt beim Scrollen stehen und hat einen eigenen Scrollbereich). Zugeklappt, auf normalen Smartphones und auf Maus Desktops bleibt alles wie bisher.

## Gate und Breakpoints

`styles-duo.css` besteht aus genau einem Media Block:

```
@media screen and (min-width: 840px) and (min-height: 480px) and (pointer: coarse) and (hover: none)
```

* `screen`: der Druck bleibt unverändert.
* 840 x 480 CSS Pixel: Smartphones im Hoch und Querformat (Höhe unter 480) und das Duo Außendisplay bleiben draußen.
* `pointer: coarse` und `hover: none`: der primäre Zeiger ist ein Finger. Maus Desktops und Touch Laptops mit Maus (primär `fine`) bleiben unverändert.
* Die Langzeitanalyse (`body[data-longterm="on"]`) bleibt einspaltig.
* Die bestehenden Breakpoints in `styles-app.css` (880, 680, 480, 375 px und Höhe 500) bleiben unberührt. Der Regelkörper überschreibt nur innerhalb des Gates, Kaskade durch höhere Spezifität (`body:not([data-longterm="on"])`), kein `!important`.

### Eingabegeräte und Layouts

| Gerät | `pointer` / `hover` (primär) | Gate | Ergebnis |
| --- | --- | --- | --- |
| Aufgeklapptes Foldable, Tablet quer oder breit (Touch) | `coarse` / `none` | trifft zu ab 840 x 480 | zwei Spalten |
| Foldable zugeklappt, Smartphone hoch und quer (Höhe unter 480), Duo Außendisplay | `coarse` / `none` | Breite oder Höhe zu klein | einspaltig wie bisher |
| Desktop mit Maus | `fine` / `hover` | trifft nie zu | einspaltig wie bisher |
| Touch Laptop (Maus oder Trackpad primär, Touchscreen zusätzlich) | `fine` / `hover`, `any-pointer: coarse` | trifft nie zu | einspaltig wie bisher |
| Druck | `screen` greift nicht | trifft nie zu | unverändert |

Bewusste Tablet Auswirkung: Auch breite Touch Tablets (ab 840 x 480, zum Beispiel iPad quer 1024 x 768 bis 1366 x 1024, aber auch ein iPad hoch mit 1024 px Breite) zeigen zwei Spalten, weil sie dasselbe Gate erfüllen. Tablets unter 840 px Breite (zum Beispiel 768 oder 820 px hoch) bleiben einspaltig. Die Entscheidung dafür steht in der Aufgabenstellung des Prototyps. Wer Tablets ausnehmen will, ergänzt später einen Seitenverhältnis Filter, das ändert den Test (`browser_gate_equals_expectation`).

Der Regelkörper ist byteidentisch zum geprüften iOS Prototyp (Commit 6ca5b3f, `app-overrides/ios_duo_layout.css`). Nur die Media Zeile unterscheidet sich. Ein Test (`tests/duo-layout.test.mjs`) prüft den Hash des Körpers.

Einzige Abweichung, nur Web: Am Ende des Media Blocks steht ein markierter Zusatz (`NUR WEB`) für die feste Installationsleiste "App installieren" (`position: fixed`, unten, 79 px hoch, erscheint ab dem zweiten Besuch nach 7 Sekunden, solange `body[data-pwa-bar="visible"]`). Ohne den Zusatz würde sie im Zweispalter die unteren 79 px der Ergebnisspalte verdecken und das Seitenende überlagern, weil die iOS Regel den unteren Seitenabstand für den schwebenden Ergebnis Knopf verkleinert. Der Zusatz verkürzt dann die Ergebnisspalte um 79 px und vergrößert den unteren Seitenabstand auf 104 px. Ohne sichtbare Leiste gilt exakt der iOS Körper. Die iOS App hat diese Leiste nicht und bindet diesen Zusatz nicht ein (die Web Datei wird dort nicht verwendet, siehe unten).

## Dateien und Build

* `styles-duo.css` (Quelle) und `styles-duo.min.css` (esbuild, wird ausgeliefert). `npm run build:css` erzeugt beide Minified Dateien.
* Je ein Link nach dem letzten Stylesheet in `index.html`, `en-eu/index.html` und `tr/index.html`, mit Token `?v=d1-<12 Hex>` (SHA256 der Minified Datei) und dem Marker `data-web-only="duo"`.
* `build-vercel.mjs` (Liste der öffentlichen Dateien), `vercel.json` (Cache Header wie die übrigen Styles) und `sw.js` (Precache, `REQUIRED_PRECACHE_URLS`) kennen die Datei. Ändert sich die CSS, müssen Token in den drei Seiten und in `sw.js` mitwandern (der Test schlägt sonst fehl). `build-sw.mjs` setzt weiterhin nur `CACHE_VERSION`.

## Installationsleiste (nur Web)

Die feste Leiste "App installieren" (`#pwaBar`, `position: fixed`, unten, 79 px hoch) erscheint ab dem zweiten Besuch 7 Sekunden nach dem Laden, sofern der Nutzer sie nicht ausgeblendet hat, und setzt `body[data-pwa-bar="visible"]`. Im Zweispalter reagiert nur der markierte `NUR WEB` Zusatz in `styles-duo.css`: Die Ergebnisspalte endet 79 px früher (12 px über der Leiste) und der untere Seitenabstand wächst auf 104 px. Verschwindet die Leiste (Später, Schließen, Installation), gelten sofort wieder die iOS Maße. Einspaltige Ansichten sind nicht betroffen. Die Leiste ist als schwebende Fläche absichtlich nicht Teil der Überlappungsprüfung des Harness; ihr Verhalten prüft `install-bar.browser.cjs`.

## Service Worker, Cache und Aktualisierung

* `sw.js` legt `/styles-duo.min.css?v=d1-<12 Hex>` in `REQUIRED_PRECACHE_URLS` ab. Fehlt eine dieser Dateien, schlägt die Installation fehl und alle Caches werden verworfen (kein halber Stand).
* Dateien mit `?v=` werden cache first geliefert (exakter URL Treffer), HTML stale while revalidate. Deshalb müssen der Token im Seitenlink und der Token in `sw.js` identisch sein und beide dem Inhalt der Datei entsprechen (SHA256 der Minified Datei, erste 12 Hex Zeichen). `tests/duo-layout.test.mjs` und `offline-sw.browser.cjs` prüfen das.
* Aktualisierung: Ändert sich die CSS, ändern sich der Token, die drei Seiten und `sw.js`. `sw.js` ist dann byteweise neu; der Browser installiert den neuen Worker, `CACHE_VERSION` (von `build-sw.mjs` beim Build gesetzt) wechselt, der Worker übernimmt per `skipWaiting`, und die alten Caches werden beim Aktivieren gelöscht. Wer die Seite offline öffnet, bekommt den zuletzt vollständig vorgeladenen Stand. Gecachtes HTML aktualisiert sich nach einem Besuch mit Netz beim nächsten Laden.
* Nach jeder Änderung an `styles-duo.css`: `npm run build:css`, danach Token berechnen (`sha256sum styles-duo.min.css | cut -c1-12`), in den drei Seiten und in `sw.js` ersetzen, `npm test` ausführen. `build-sw.mjs` nicht von Hand ausführen (er schreibt `CACHE_VERSION` in `sw.js`, das passiert beim Deployment).

## Testaufrufe

Alle Befehle im Repo Wurzelverzeichnis. Die Browser Tests liegen außerhalb von `npm test`, weil ein Browser nötig ist.

1. Projektsuite inklusive statischer Duo Schutztests: `npm test` (`node --test tests/*.test.mjs`). Lizenzinventar: `node build-licenses.mjs --check`.
2. Selbsttest des Analyzers (kein Browser): `node --test tests/duo-viewport/analyze.selftest.mjs`.
3. Viewport Harness (nur ein Chromium Programm, kein Playwright), je Profil ein Lauf. Dauer: touch etwa 25, mouse etwa 15, touchlaptop etwa 10 Minuten (2 CPUs):

```
CHROME=<chromium> [CHROME_ARGS=--no-sandbox] PROFILE=touch OUT=<Ordner ausserhalb des Repos> node tests/duo-viewport/harness.mjs
node tests/duo-viewport/analyze.mjs <Ordner>
```

   Profile: `touch` (Tablet/Foldable), `mouse` (Maus Desktop, per `--blink-settings` als Gerät mit feinem Zeiger und Hover emuliert, weil headless Chromium sonst keinen Zeiger meldet), `touchlaptop` (Maus primär plus Touchscreen). `VPS` (JSON Liste `[[Breite,Höhe],...]`), `LANGS` und `THEMES` begrenzen die Matrix. Der Harness misst jeden Zustand einmal ohne und einmal mit der Duo CSS (Größen, DE/EN/TR, hell/dunkel, Vergleich und Einzel) und prüft das Gate im Browser selbst. Der Analyzer verlangt: Zweispalter genau dann, wenn das Gate zutrifft; sonst Layout wie ohne CSS (1 px Toleranz); Ergebnisse, gespeicherte Werte, Sprache und Markt unverändert; kein horizontaler Überlauf; keine neuen Überlappungen (die Installationsleiste ausgenommen); Ergebnisspalte sticky (gepinnt, außer wenn die natürliche Lage noch tiefer liegt oder der Container endet) und im Fenster.
4. Funktionale Browser Tests (Playwright mit Chromium):

```
npm i --no-save playwright && npx playwright install chromium     # nicht in package.json, keine neue Abhängigkeit
node tests/duo-functional/run-all.cjs              # alle Suiten nacheinander, etwa 25 Minuten
node tests/duo-functional/run-all.cjs scroll       # nur Suiten, deren Name den Text enthält
node tests/duo-functional/offline-sw.browser.cjs   # eine einzelne Suite
```

   Umgebung: `PLAYWRIGHT_MODULE` (Name oder Pfad des Moduls, Standard `playwright`), `CHROMIUM_PATH` (optionales Chromium Programm), `CHROMIUM_ARGS` (zum Beispiel `--no-sandbox` bei Lauf als root). Jede Suite startet einen eigenen Server auf einem freien Port auf `127.0.0.1` (liefert das Repo Wurzelverzeichnis, bildet cleanUrls nach), schreibt nichts ins Repo und beendet sich mit Exit Code 1 bei einem FAIL.

| Suite | Prüft |
| --- | --- |
| `gate-and-flows.browser.cjs` (F1 bis F3) | Gate Wahrheit auf den echten Seiten, Touch Bedienung (Tap, Regler, Einzel, Vergleich, Neuberechnung) in DE/EN/TR, Ergebnisse und gespeicherte Werte mit und ohne Duo CSS identisch |
| `scroll-sticky.browser.cjs` (F4) | Wischen in der Ergebnisspalte, Ende erreichbar, Weiterwischen reicht an die Seite weiter, Rückwärtswischen ohne Hängen, Sticky bleibt beim Seitenscroll, Hinweis zur Berechnung und Footer sichtbar, kein Querscroll |
| `ui-states.browser.cjs` (G1 bis G7, G9) | Marktmenü und Marktwechsel (Speicher bleibt nach Neuladen), Tab Fokus, Notizfeld mit Tastaturhöhe, Falten, Entfalten und Drehen, Theme Wechsel, Langzeitanalyse einspaltig, Druck, kleine Höhe, breite Tablets |
| `desktop-parity.browser.cjs` (G8) | Desktop und schmale Touch Geräte sehen mit Duo CSS exakt aus wie ohne (alle Elemente, hell/dunkel, DE/EN/TR) |
| `offline-sw.browser.cjs` (H) | Service Worker aktiv, Duo CSS im Precache, Seitenlink und Token passen zur Datei, Offline Neuladen bleibt zweispaltig, Rechner funktioniert offline, Maus bleibt einspaltig |
| `install-bar.browser.cjs` (I) | Installationsleiste sichtbar: Ergebnisspalte endet darüber, Seitenende frei; außerhalb des Gates unverändert (wartet je Fall 8 Sekunden) |

## Safari und Hardware Prüfpunkte

Alle automatischen Ergebnisse sind Chromium Simulationen (Touch über `hasTouch` und `isMobile`, Eingabegeräte über `--blink-settings`). Auf echten Geräten prüfen:

* iPad und iPhone Safari (WebKit): Gate trifft auf dem iPad quer zu, nicht auf dem iPhone hoch und quer; `pointer: coarse` und `hover: none` mit und ohne angeschlossenes Trackpad oder Maus (iPadOS meldet das möglicherweise anders).
* Duo oder anderes Foldable, aufgeklappt: Zweispalter erscheint, zugeklappt einspaltig; CSS Breite messen (`innerWidth` im aufgeklappten Zustand); Wechsel beim Falten ohne Datenverlust.
* Sticky Ergebnisspalte in WebKit: Position beim Seitenscroll, Wisch in der Spalte und Weiterreichen an die Seite (Scroll Chaining), Gummiband am Ende, Unterkante hinter dem Home Indikator (Safe Area).
* Tastatur: Notizfeld und Eingaben bei sichtbarer Bildschirmtastatur im Zweispalter, Fokus Ring sichtbar, Ergebnis nicht verdeckt.
* Installationsleiste: Zweiter Besuch, nach 7 Sekunden sichtbar, Ergebnisspalte und Seitenende frei, Schließen und Später.
* Android Chrome auf einem Tablet oder Foldable: Gate und Layout; Handy im Modus "Desktop Website" (Layoutbreite um 980 px) darf nicht zweispaltig werden oder wird als bekannte Grenze bestätigt.
* Offline: Seite einmal online öffnen, Flugmodus, neu laden: Zweispalter und Rechner arbeiten weiter; nach einem neuen Deployment ein Besuch mit Netz und ein Neuladen, danach der neue Stand.

## iOS Kopplung (wichtig)

Der native Generator (`scripts/prepare-native-assets.mjs` im iOS Repo) liest die Web Seiten aus dem Web Repo (Standard `../../evspend`, oder `WEB_ROOT`) und baut daraus die App Seiten (`dist` und `ios/App/App/public`). Der Web Link auf `styles-duo.min.css` trägt den Marker `data-web-only="duo"`.

Gemessen an einer Wegwerfkopie des iOS Stands 6ca5b3f (aus `git archive 6ca5b3f`, außerhalb beider Repos) mit `WEB_ROOT` auf diesen Worktree und `node scripts/prepare-native-assets.mjs --dist-only`, danach `--plan` und `--apply` für beide App Stände:

* Ohne Anpassung kopiert der Generator den Web Link in `dist/index.html`, `dist/en-eu/index.html` und `dist/tr/index.html`. Die App verweist dann auf `styles-duo.min.css`, die nicht Teil der App ist (ins Leere laufende Anfrage). Die vorhandenen iOS Tests erkennen das nicht (170 von 175 bestehen, dieselben 5 Fehler treten auch im unveränderten Stand 6ca5b3f mit dem Web Stand e9d5f74 auf; ihre Ursache ist nicht untersucht, sie hängen nicht an dieser Änderung).
* Mit der folgenden Filterzeile sind alle erzeugten App Seiten byteidentisch zum Stand 6ca5b3f (68 von 68 Dateien in `dist` gleich, abgesehen von einer Datei, siehe unten). Die iOS Tests liefern dasselbe Ergebnis wie im unveränderten Stand (gleiche 5 Fehler).

Genaue Änderung im iOS Generator (Diff gegen 6ca5b3f):

```diff
--- a/scripts/prepare-native-assets.mjs
+++ b/scripts/prepare-native-assets.mjs
@@ -123,6 +123,7 @@
       if (tags.length !== 1) throw new Error("Expected exactly one Web-only history script in "+rel);
       s = s.replace(historyTag, `<script src="/native-history.js?v=${version("native-history.js")}"></script>`);
       if (rel.endsWith("verlauf.html")) s = s.replace("</body>",`<script src="/ios-export.js?v=${version("ios-export.js")}" defer></script>\n</body>`);
+      s = s.replace(/<link rel="stylesheet" href="[^"]*" data-web-only="[^"]*">\n/g, "");
       if (rel.endsWith("index.html")) {
         // iOS only two column layout for wide windows. Linked after the last stylesheet; Web pages never get it.
         const sheets = [...s.matchAll(/<link\s+rel="stylesheet"\s+href="[^"]*"[^>]*>/g)];
```

* Die Zeile steht vor dem Block `if (rel.endsWith("index.html"))`, der den iOS Link `ios_duo_layout.css` nach dem letzten verbleibenden Stylesheet einfügt. Sie entfernt jeden Link mit `data-web-only`.
* Zweite, harmlose Kopplung: Der Generator kopiert `vendor/license-inventory.json` aus dem Web Repo. Sie enthält jetzt eine zusätzliche Zeile `"styles-duo.min.css",` in `release.references` (der Lizenzinventar Test verlangt jede Referenz; eigener Code, keine Drittlizenz). Das ist der einzige verbleibende Unterschied in `dist` und `ios/App/App/public`, und erscheint beim nächsten `--apply` im iOS Repo als reviewbare Änderung.
* Dieser Schritt ist im iOS Repo noch nicht ausgeführt (bewusst: dort wurde nichts verändert). Er ist ein getrennter späterer Schritt: Filterzeile einbauen, ein iOS Test, der prüft, dass kein `data-web-only` Link und kein `styles-duo` in den App Seiten steht, und das Lizenzinventar mit `--apply` übernehmen. Bis dahin meldet der iOS Generator gegen diesen Web Branch eine Änderung an den drei Seiten und am Inventar.
* Die Web CSS gehört nie in die App: `ios_duo_layout.css` bleibt dort die einzige Duo Quelle.

## Bekannte Einschränkungen

* Alle Browser Tests sind Chromium Simulationen. Safari/WebKit, echte Foldable Geometrie, Tastatur und Safe Areas sind nur auf echten Geräten prüfbar.
* Breite Touch Tablets (ab 840 x 480, auch iPad hoch bei 1024 px) werden ebenfalls zweispaltig. Tablets unter 840 px Breite bleiben einspaltig.
* Die CSS Breite aufgeklappter Android Foldables ist ungemessen. Liegt sie unter 840 px, greift das Layout dort nicht.
* Ein Handy im "Desktop Website" Modus (Layoutbreite um 980 px, Höhe über 480 px) kann das Layout auslösen. Ein Seitenverhältnis Filter wäre eine mögliche Ergänzung.
* iPadOS Safari mit Trackpad: Verhalten von `pointer` und `hover` ist nicht gemessen. Touch Laptops sind nur über Emulation (`--blink-settings`) geprüft.
* Die Installationsleiste verdeckt im Zweispalter keinen Inhalt mehr; ihre Höhe (79 px) ist als Konstante im Web Zusatz fest eingetragen. Wird die Leiste höher (zum Beispiel längerer Text), muss der Wert angepasst werden.
* Berechnung, Formeln und gespeicherte Nutzerdaten sind nicht berührt; die Änderung ist reines CSS.
