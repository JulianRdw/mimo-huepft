# Mimo hüpft

Ein ruhiges Hüpfspiel mit Mimo: 29 Level in drei Welten, drei Endgegner und das 3D-Bonuslevel Himmelsinseln.

Unter „Welten“ gibt es außerdem die **3D-Welten**: die Himmelsinseln und das **Kinderzimmer** (`src/kinderzimmer.html` mit `src/room3d/`). Das Kinderzimmer ist eine eigene Seite, die das Spiel in einem Rahmen öffnet; sie läuft auch allein als Testseite. Bis man es einmal geöffnet hat, zeigt die App nach dem Startfoto eine gemalte Neu!-Karte.

Die Sternenbahn (Musiklauf, Abenteuer, Endlosbahn) ruht: ihr Code liegt weiter in `src/`, ist aber über `const STARWAY = false` in `src/index.html` abgeschaltet und wird nicht in die App gebaut.

**Spielen:** die GitHub-Pages-Adresse dieses Projekts öffnen.
**Auf dem iPhone wie eine App:** in Safari öffnen, Teilen-Knopf, „Zum Home-Bildschirm“. Danach startet Mimo im Vollbild, auch ohne Internet.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/` | Quelle: die Spielseite und die 3D-Module (dieselbe Seite läuft auch als claude.ai-Artifact) |
| `vendor/` | Three.js r160, damit 3D auch offline lädt |
| `icons/` | App-Symbole, erzeugt mit `tools/icons.mjs` |
| `docs/` | fertige App für GitHub Pages, erzeugt mit `tools/build.mjs` (nicht von Hand ändern) |
| `tools/` | Build, Symbole, Handy-Test |

## Ändern und veröffentlichen

```sh
node tools/build.mjs          # src/ -> docs/
node tools/phone-test.mjs     # iPhone quer und hochkant (WebKit), Offline-Start (Chromium)
git add -A && git commit -m "…" && git push
```

### Level

Die Level stehen als Textkarten in `src/index.html` (`const LEVELS`). Werkzeuge dazu:

```sh
node tools/levellint.mjs                         # Unsinn finden: vergrabene Dornen, schwebende Fahnen, Sternzahl …
node tools/levelmap.mjs --out /tmp/karten        # jedes Level als Bild mit Koordinaten
node tools/levelbot.mjs --level Lawine --route "R 1; RJ 0.3"   # ein Level Bild für Bild nachspielen
node tools/levelcheck.mjs [--medals]             # alle Level mit ihren Testwegen (tools/levels/routes) prüfen
node tools/bosscheck.mjs [--boss n]              # alle Endgegner: Bot-Sieg, Nichtstun, schludriges Spiel
node tools/worldapi-test.mjs                     # die Welt-API mit einer Testwelt (Laden, Durchspielen, Spielstände, Endgegner)
node tools/refshots.mjs --out dir [--compare ref] # feste Bilder von Leveln und Endgegnern, pixelgenau vergleichen
node tools/serve.mjs [--port 8650] [--lan]       # src/ im WLAN fürs iPhone anbieten; ?offen an der Adresse öffnet alles
```

Welten ab 4 liegen als eigene Dateien in `src/worlds/` (Anleitung: `src/worlds/README.md`). Ihre Level hängen hinter dem Nachtpfad, die Level 1 bis 29 behalten ihre Nummern und Spielstände.

Jedes Level hat zwei Testwege: `full` sammelt alle Sterne, `fast` ist der schnellste saubere Weg und ergibt die Medaillenzeiten (×1,3 / ×2 / ×3). Werden Level umgebaut, `LEVELS_VERSION` erhöhen: dann verwirft das Spiel alte Zeiten, Sterne und Geister einmal.

Die Tests brauchen Playwright; `tools/pw.mjs` nimmt die Installation aus `~/Rdw_Datenbasis/client/node_modules/playwright` oder aus `PLAYWRIGHT_DIR`.

Nach einem Push lädt die installierte App beim übernächsten Start die neue Fassung (der Offline-Speicher holt sie beim ersten Start im Hintergrund).

## Spielstand

Der Fortschritt liegt im Speicher des Browsers. Die App auf dem Home-Bildschirm, Safari und das claude.ai-Artifact haben jeweils einen eigenen Spielstand. Die Freunde-Bestenliste gibt es nur im claude.ai-Artifact.
