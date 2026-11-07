# Mimo hüpft

Ein ruhiges Hüpfspiel mit Mimo: 23 Level in drei Welten, Endgegner, 3D-Himmelsinseln und die Sternenbahn.

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
```

Jedes Level hat zwei Testwege: `full` sammelt alle Sterne, `fast` ist der schnellste saubere Weg und ergibt die Medaillenzeiten (×1,3 / ×2 / ×3). Werden Level umgebaut, `LEVELS_VERSION` erhöhen: dann verwirft das Spiel alte Zeiten, Sterne und Geister einmal.

Die Tests brauchen Playwright; `tools/pw.mjs` nimmt die Installation aus `~/Rdw_Datenbasis/client/node_modules/playwright` oder aus `PLAYWRIGHT_DIR`.

Nach einem Push lädt die installierte App beim übernächsten Start die neue Fassung (der Offline-Speicher holt sie beim ersten Start im Hintergrund).

## Spielstand

Der Fortschritt liegt im Speicher des Browsers. Die App auf dem Home-Bildschirm, Safari und das claude.ai-Artifact haben jeweils einen eigenen Spielstand. Die Freunde-Bestenliste gibt es nur im claude.ai-Artifact.
