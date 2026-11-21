# Welten 4 und höher: die Welt-API

Eine neue Welt lebt ganz in diesem Ordner. Der Kern (`src/index.html`) wird dafür nicht angefasst, bis auf **eine Zeile pro Datei** im Block `<!-- Worlds 4 and up … -->` direkt vor dem großen `<script>`:

```html
<script src="worlds/registry.js"></script>
<script src="worlds/w4-kueste.js"></script>      <!-- neu, in Weltreihenfolge -->
<!-- world files end -->
```

`node tools/build.mjs` bricht ab, wenn eine Datei hier liegt, aber nicht eingetragen ist (oder umgekehrt). Der Build liefert alle eingetragenen Dateien aus und legt sie in den Offline-Speicher.

Code und Kommentare auf Englisch, Texte für Spieler auf Deutsch. Jede Datei unter 800 Zeilen.

## Gebaut, aber noch nicht veröffentlicht: `UNRELEASED_WORLDS`

`const UNRELEASED_WORLDS = [5, 6];` in `src/index.html` hält fertige Welten zurück. Das Spiel lässt sie ganz weg (keine Level, kein Endgegner, keine Kostüme, keine Musik), die Levelliste zeigt an ihrer Stelle „Bald geht es weiter.“, und `node tools/build.mjs` nimmt ihre `<script>`-Zeilen und Dateien nicht in `docs/` auf. Weil sie hinter den veröffentlichten Welten liegen, verschiebt das keinen Levelindex; ihr `firstLevel` bleibt fest. **Veröffentlichen:** die Nummer aus der Liste nehmen (immer die kleinste zuerst, sonst passt das `firstLevel` der nächsten nicht und sie lädt nicht), neu bauen, Tests laufen lassen.

- Ansehen ohne Veröffentlichung: `?vorschau` an der Adresse (nicht auf github.io) oder die Entwicklerversion (`DEV`). Die Leveltools (levelcheck, levellint, levelbot, bosscheck, volcano-test, moon-test, video) sehen immer alle gebauten Welten; `srcWorlds([], { release: true })` liefert den veröffentlichten Stand.
- Welche Datei zu welcher Welt gehört, liest der Build aus ihrem `register`. Eine Hilfsdatei, die nichts registriert (Form, Bot), gehört zur Welt der Dateien um sie herum; steht sie zwischen zwei Welten, braucht sie ein leeres `window.MimoWorlds.register({ world: N })`.
- `tools/worldapi-test.mjs` prüft beides: zurückgehaltene Welten fehlen ganz, mit `?vorschau` sind sie an ihren festen Indizes da, und `docs/` enthält ihre Dateien nicht.

## Das Wichtigste in zehn Zeilen

1. Eine Datei ruft beim Laden **nur** `window.MimoWorlds.register(teil)` auf. Kein `document`, kein Canvas beim Laden: die Leveltools führen die Datei in Node aus.
2. Eine Welt darf aus mehreren Dateien bestehen (Mechanik, Level, Endgegner, Musik). Jede registriert einen Teil mit derselben `world: 4`. Felder wie `name` stehen in genau einem Teil, Hooks dürfen in jedem Teil stehen und werden alle aufgerufen (Dateireihenfolge).
3. `firstLevel` ist der Index des ersten Levels im Spiel (Welt 4: **29**). Er darf sich nach der Veröffentlichung nie ändern; stimmt er nicht, lädt die Welt nicht und die Tests schlagen an. Levelindizes sind die Spielstände.
4. `setup(api)` bekommt einmal das API-Objekt. Merk es dir in der Datei (`let api;`). Alle Hooks laufen nur, während ein Level oder Kampf **dieser** Welt läuft.
5. Kartenzeichen: `tiles` werden zu Feldern (fest, Brett oder Deko, eigenes Zeichnen), `spawns` erzeugen Objekte. Die Zeichen des Spiels (` #-^vabcL><A8iTgePD*hksfu`) bleiben, wie sie sind; Seeigel sind einfach `^`/`v` mit eigenem `drawThorn`.
6. Alles, was das Spiel entscheidet, muss deterministisch sein: Zeit nur aus `api.time` (Spielzeit), Zufall nur aus `api.rnd(seed)` oder `api.hash`. Nie `Date`, `performance.now` oder `Math.random` für Spielmechanik (für Glitzer ist `Math.random` erlaubt). Sonst laufen die Bot-Routen nicht mehr gleich.
7. Objekte, auf denen Mimo stehen und mitfahren soll (Krabbe, Blase, Floß), kommen nach `api.L.bodies` und haben `x, y` (Oberkante), `w`. Bewege sie in `update(dt)`; der Kern rechnet daraus `dx/dy/prevY` und lässt Mimo darauf landen und mitfahren wie auf den Liften. `off: true` lässt ihn durchfallen (geplatzte Blase).
8. Schwimmen & Co.: `physics(p)` gibt `null` oder `{ gravity, maxFall, maxRise, run, accel, wind, jump(p), hold(p, dt) }` zurück, jeweils nur für diesen Schritt.
9. Gefahren: in `update` prüfen und `api.hurt()` rufen (beachtet „unverwundbar“). `api.touches(box, inset)` hilft.
10. Fertig ist ein Level erst mit Routen in `tools/levels/routes/world4/NN-full.txt` und `NN-fast.txt`; `node tools/levelcheck.mjs --world 4 --medals` prüft sie und druckt die Medaillenzeiten für `medals`.

## Kleines vollständiges Beispiel

```js
// src/worlds/w4-kueste.js
(function () {
  'use strict';
  let api = null;
  window.MimoWorlds.register({
    world: 4, name: 'Korallenküste', firstLevel: 29, song: 'kueste',
    lines: ['Sand zwischen den Pfoten.', 'Blubb.'],
    palette: { light: { skyTop: '#BFE8EC', skyBot: '#FFF3DE', ground: '#F1DDB0', groundEdge: '#FFF1D2', groundDot: '#E2C68E' },
               dark: { skyTop: '#16323F', skyBot: '#2C3B48', ground: '#7A6A4C', groundEdge: '#9C8A66', groundDot: '#625437' } },
    levels: [{ name: 'Sandburg', medals: [20, 31, 46], hint: 'Die <b>Krabbe</b> trägt dich.', map: [/* Zeilen wie in LEVELS */] }],
    spawns: { K: { lint: { name: 'Krabbe' }, spawn(L, x, y) { L.bodies.push({ crab: true, x: x * api.T, y: (y + 1) * api.T - 14, w: 40, dir: 1 }); } } },
    setup(a) { api = a; },
    update(dt) { for (const b of api.L.bodies) if (b.crab && api.state === 'play') b.x += b.dir * 40 * dt; },
    piep({ x, y }) { for (const b of api.L.bodies) if (b.crab && Math.abs(b.x - x) < 5 * api.T) b.dir = -b.dir; return 0; },
    draw(layer, ctx) { if (layer === 'mid') for (const b of api.L.bodies) if (b.crab) { ctx.fillStyle = api.P.mush; api.rr(b.x, b.y, b.w, 14, 7); ctx.fill(); } },
    songs: { kueste: { bpm: 84, beats: 4, lead: 'kalimba', pad: 'soft', bass: 'soft', density: 0.5, scale: [69, 71, 73, 76, 78, 81],
      kits: {}, form: ['A'], sec: { A: { ch: [[50, 62, 66, 69], [43, 55, 59, 62]], cpb: 2, bars: 8, mel: 'fixed' } } } },
  });
})();
```

Ein durchgespieltes Beispiel mit allen Hook-Arten, Endgegner und Kostüm: `tools/worldapi/testworld.js` (läuft nur im Test).

## Felder einer Welt (je einmal pro Welt)

| Feld | Bedeutung |
|---|---|
| `world` | Weltnummer, ab 4. Pflicht in jedem Teil. |
| `name` | Name in der Levelliste („Welt 4 · Korallenküste“). |
| `firstLevel` | Index des ersten Levels (siehe oben). |
| `draft` | `true` für eine Welt, die noch nicht veröffentlicht ist (Welt 5 und Welt 6 waren es bis zur Veröffentlichung): Stimmt `firstLevel` nicht, weil eine Welt davor noch Level bekommt, hängt sie sich ohne Fehler direkt dahinter (`plannedFirst` behält den erklärten Wert). Vor der Veröffentlichung entfernen, dann gilt wieder die strenge Prüfung. |
| `levels` | Level wie in `LEVELS` (`name, map, hint, touchHint, movers, chase`; nicht `night`, das gibt es nur für den Nachtpfad), dazu `medals: [gold, silber, bronze]` in Sekunden und `bonus: true` für ein Bonuslevel (zählt nicht zur Hauptreihe, öffnet nach dem letzten Level der Welt, Routen `bonus-full.txt`). Mehrere Teile dürfen Level beitragen, sie hängen in Dateireihenfolge hintereinander. |
| `palette` | `{ light: {…}, dark: {…}, night: { light: {…}, dark: {…} } }`. Schlüssel: `skyTop skyBot hillFar hillNear cloud ground groundEdge groundDot sun` und beliebige eigene (z. B. `water`), die dann unter `api.W` stehen. `night` (optional) sind die Ziele, zu denen der Himmel nachts gemischt wird (`nightSkyTop nightSkyBot nightCloud nightHillFar nightHillNear nightSun`). |
| `nightBlend` | Wie stark die Uhrzeit den Himmel abdunkelt, 0 bis 1 (Abendwald 0,5; Standard 1). Eine Endgegner-Arena mit `night: true` ist immer ganz Nacht. |
| `song` | Musikstück der Welt: eine Id, oder `song(levelDef, L) -> id` (wird `null`, gilt der Standard: Nachtlevel `night`, Verfolgung `chase`). |
| `songs` | Eigene Stücke `{ id: song }` im Format von `SONGS` im Kern (bpm, beats, lead, counter, arp, pad, bass, density, scale, kits, form, sec). Unbekannte Instrumente werden beim Start gemeldet. Ein Kampfstück (`boss: true`) bekommt je Phase eine Schicht (Phase 2 die Arpeggios, Phase 3 die Hi-Hats und etwas mehr Tempo); mit `live: true` setzt die Schicht sofort beim Phasenwechsel ein statt erst am nächsten Abschnitt. |
| `lines` | Sprüche von Mimo beim Levelstart. |
| `particles` | Standard-Schwebeteilchen: `'dust'`, `'fire'` (Glühwürmchen), `'snow'`. |
| `drawBackground(ctx)` | Ersetzt den ganzen Hintergrund (Bildschirmkoordinaten). `api.drawSky()` und `api.drawHills(farbe, y, parallax, amp, freq, seed)` helfen. |
| `drawAmbient(ctx)` | Ersetzt die Schwebeteilchen (Weltkoordinaten; Startpositionen in `api.L.pollen`). |
| `drawThorn(tx, ty, x, y, dir)` | Zeichnet `^` (dir 1) und `v` (dir -1). |
| `drawMushroom(mu, x, y, ctx)` | Zeichnet den Pilz `u` (Qualle). `mu.squash` 0..1 nach einem Sprung. |
| `lint` | Hinweise für `levellint`: `{ floating: 'u' }` erlaubt diesen Zeichen, frei zu schweben (Quallen im Wasser). |
| `drawChase(c, ctx)` | Zeichnet die Verfolgung (`chase` im Level); `c.x` ist ihre Vorderkante. Dann entfallen auch die Schneeflocken der Lawine. |
| `tiles` | `{ 'Q': { solid, oneway, draw(tx, ty, x, y, ctx), lint } }`. `solid`: `true`/`false` oder `(tx, ty) => bool`. `oneway: true` wie ein Brett. `lint: { name, color, kind }` für levellint und levelmap (`kind` wird sonst aus `solid`/`oneway` abgeleitet). Die Feld-Id im Spiel: `api.tileId(4, 'Q')`. |
| `spawns` | `{ 'K': { spawn(L, x, y), lint } }`, nach dem Lesen der Karte aufgerufen (x, y in Feldern). Das Feld bleibt leer. |
| `costumes` | Kleiderschrank: `{ id, kind: 'hat' | 'acc', name, price, boss: 4, draw(ctx, o) }`. `draw` zeichnet am Fuß von Mimo, schon skaliert; `o.top` ist die Kopfoberkante, `o.tilt`, `o.facing`, `o.alpha`. `boss: 4` heißt Belohnung für den Endgegner der Welt 4. Alternativ `own: () => bool` (verdient, z. B. Fundstücke), dazu `how: () => Text` für den Hinweis im Kleiderschrank; `face: true` zeichnet ein `acc` nach den Augen, `o.eyeY` ist die Augenhöhe. |
| `boss` | Der Endgegner (unten). |
| `headNote` | `() => text`: kurzer Zusatz hinter der Weltüberschrift in der Levelliste (Welt 4: „Strandtasche 3/13“). |
| `ending` | `{ title, text }`: eigene Überschrift und eigener Text der Abschlusskarte, wenn der Endgegner dieser Welt der letzte des Spiels war (die Mondwelt: „Mimo fliegt nach Hause“; solange Welt 5 und 6 zurückgehalten sind, die Küste: „Der Strand ist wieder voll“). Es zählt die letzte veröffentlichte Welt mit `ending`. Sonst bleibt die Karte, wie sie ist. |

## Hooks (in jedem Teil erlaubt, alle werden aufgerufen)

| Hook | Wann |
|---|---|
| `setup(api)` | Einmal beim Start. |
| `init(L, info)` | Nach dem Aufbau eines Levels oder Kampfes (beim Kampf vor `make` und `arena`): `info.reason` ist `load`, `restart` oder `respawn` (nach einem Sturz), `info.def` (Level oder Endgegner, eigene Felder wie `water` stehen darin), `info.boss`. Eigener Zustand gehört an `L` (`L.w4 = {...}`), dann ist er bei jedem Neustart frisch. |
| `update(dt)` | Jeder Schritt (1/120 s), auch während Sturz, Sieg und Kampfszene (`api.state` prüfen), **vor** Mimo. |
| `physics(p)` | Jeder Schritt, bevor Mimo sich bewegt. Rückgabe `null` (normale Regeln) oder ein Objekt: `gravity` (px/s², sonst 2000), `maxFall` (sonst 850), `maxRise` (Steiggeschwindigkeit begrenzen), `run` (sonst 210), `accel` (Boden und Luft), `wind` (Schub eines Windfelds, sonst 70 am Boden und 150 in der Luft), `jump(p)` (bei Sprungdruck; `true` heißt „erledigt“, dann kein normaler Sprung; setz `p.canCut = false`, wenn Loslassen nicht bremsen soll), `hold(p, dt)` (jeder Schritt mit gehaltener Taste). |
| `draw(layer, ctx)` | `back` hinter den Feldern, `mid` nach Feldern, Sternen und Liften (vor Mimo), `front` über Mimo und Teilchen, `over` in Bildschirmkoordinaten über allem. |
| `drawTile(t, tx, ty, x, y, ctx)` | Für jedes nicht leere Feld; `true` heißt „selbst gezeichnet“ (z. B. Wind als Strömung). |
| `piep({ x, y })` | Mimo hat gepiept (Mitte von Mimo). Rückgabe: wie viele Tiere erschreckt wurden (zählt für einen Erfolg). |

Ein Fehler in einem Hook wird einmal mit `console.error` gemeldet, das Spiel läuft weiter. levelbot, levelcheck und der Welt-Test zählen solche Meldungen als Fehler.

## Das API-Objekt

- Zahlen: `T` (32), `STEP`, `TILE` (die Feld-Ids des Spiels), `PHYS` (`GRAV MAX_FALL RUN ACCEL AIR_ACCEL JUMP BOUNCE JUMP_CUT STOMP COYOTE BUFFER`).
- Live: `ctx`, `G`, `L` (Level), `p` (Mimo: `x y w h vx vy grounded facing carried`), `input` (`left right down jumpHeld …`; `dive` ist der Daumen-Stick deutlich nach unten, an Land ohne Wirkung), `P` (Grundfarben), `W` (Farben der Welt jetzt), `cam`, `time`, `state` (`play dead win cine`), `mode` (`level boss`), `view` (`w h hudPad safeL safeR`), `reduced`, `dark`, `levelIndex`, `levels`.
- Hilfen: `rr(x, y, w, h, r)` (abgerundeter Pfad), `hash(x, y)`, `mixHex(a, b, k)`, `rnd(seed) -> () => 0..1`, `pick(liste)`.
- Effekte: `burst(x, y, n, farbe, tempo, opts)`, `dust(p, n)`, `ring`, `floater(x, y, text, farbe)`, `shake(k)`, `bubble(text, anker, dauer)` (Anker `'player'` oder ein Objekt mit `x, y, w`), `setMood('happy', s)`, `sfx` (alle Geräusche des Spiels), `voice(o)`, `noise(o)`, `midi(n)`.
- Spiel: `hurt()`, `die()`, `tileAt(tx, ty)`, `isSolid(tx, ty)`, `setTile(tx, ty, id)`, `tileId(welt, zeichen)`, `overlapsTile(p, tx, ty, inset)`, `thornExt(tx, ty)`, `touches(box, inset)`.
- Zeichnen: `drawSky()`, `drawHills(…)`, `drawThorns(x, y, dir)`, `drawMimo(cx, unten, o)`, `drawMiniStar(x, y, r)`.
- Musik: `music.songs`, `music.setIntensity(n)`, `music.refresh()` (nach einem Wechsel, den `song()` jetzt anders beantwortet).
- Endgegner: `boss.FLOOR`, `boss.say(name, text, dauer, stimme)`, `boss.bar(B, treffer)`, `boss.set(B, zustand)`, `boss.bark(B, schlüssel)`, `boss.phase(B)`, `boss.rnd(B)`, `boss.shadow(B, breite)`, `boss.eyes(…)`, `boss.col(B, farbe)`, `boss.crown(…)`, `boss.stars(x, y, B)`, `boss.scene(B, sekunden)` (kurze Szene mitten im Kampf, siehe unten), `boss.hit(B)` (ein Treffer, der nicht vom Sprung kommt: Leben, Phasen, Sieg wie bei einem Sprung, nur ohne Abprallen; Welt 5 trifft mit der Dusche).

## Endgegner

`boss` in einem Teil der Welt. Er steht danach als `BOSSES[4]` im Spiel, öffnet nach dem letzten Hauptlevel der Welt und erscheint dahinter in der Levelliste.

Daten: `name`, `kicker` (Untertitel der Titelkarte), `hp`, `phases` (Leben zu Beginn jeder Phase, z. B. `[6, 4, 2]`), `song`, `hint`, `map` (Arena als Kartenzeilen, Zeichen der Welt erlaubt, `P` ist der Start), `night`, `lines` mit `intro` (3: Gegner, Mimo, Gegner), `again`, `tickle`, `hit`, `phase` (eine Zeile je Phasenwechsel), `stun`, `beaten`, `piep`.

Hooks (B ist der Kampfzustand: `x y vx vy state t n hp shots anim flash sq done`; `boss.set(B, s)` setzt `state` und `t = 0`):

| Hook | |
|---|---|
| `make(B)` | Startwerte. Setz `B.floor` (Bodenhöhe in Pixeln), wenn die Arena nicht 20×12 ist. |
| `arena(B, phase)` | Arena für die Phase aufbauen (auch nach einem Sturz). |
| `enter(B)` | Ende der Eingangsszene, danach ist `B.state = 'idle'`. |
| `ai(B, dt)` | Verhalten, jeder Schritt bis zum Sieg. Nach einem Treffer setzt der Kern `state = 'hurt'`, die KI muss da wieder heraus. |
| `box(B)` | Pflicht: `{ l, r, top, bottom, soft, harmless }`. `soft`: ein Sprung von oben trifft. `harmless`: Berühren tut nicht weh. In den Zuständen `hurt enter wait stunned` zählt kein Sprung. |
| `phase(B, ph)` | Phasenwechsel (der Kern spielt Klang, Spruch und baut danach `arena`). |
| `respawn(B)` | Nach Mimos Sturz: Gegner an einen fairen Platz (Leben, Schüsse und Phase setzt der Kern zurück, Mimo blinkt 1,4 s). |
| `defeat(B)`, `afterDefeat(B, dt)`, `door(B) -> { x, y }` | Sieg; die Tür erscheint nach 1,6 s an `door()` (Standard nur für 20×12 sinnvoll). |
| `shot(B, s, dt, play) -> { dead, danger }`, `drawShot(B, s, ctx)` | Eigene Geschosse in `B.shots` (eigener `type`). Gefährliche treffen mit dem gemeinsamen Kreis-Test über `s.r`. Bei Treffer, Sturz und Phasenwechsel leert der Kern die Liste. |
| `draw(B, ctx)` | Pflicht. Der Gegner darf größer als der Bildschirm sein. |
| `drawFront(B, ctx)` | Über Mimo. |
| `camera(B, { x, y }) -> { x, y }` | Kameraziel verschieben (z. B. nach oben zum Kopf); die Levelränder begrenzen weiter. |
| `api.boss.scene(B, s)` | Startet eine kurze Szene (Balken, Mimo wartet, mit Springen überspringbar wie der Auftritt). Während der Szene läuft `ai` weiter und kann sie zeigen (`B.cine.t`); am Ende (oder beim Überspringen) ruft der Kern `enter(B)` und setzt `idle`. So baut die Krake ihre Phasenwechsel. |
| `voice()` | Eine Silbe der Sprechstimme (mit `api.voice`). |
| `bot(B, h)`, `checkShots`, `idleSpots` | Für `tools/bosscheck.mjs`: ein Bot, der gewinnt (`h.go(dir) h.moveTo(x) h.jump() h.press()` (Sprungtaste auch ohne Boden, zum Schwimmen) `h.hopOnto(x, reach) h.G h.T`; er läuft nach dem Sieg auch selbst zur Tür), Bildbedingungen wie in bosscheck (Namen mit `scene-` werden während einer Szene aufgenommen; Szenen schaut der Check an, statt sie zu überspringen) und `idleSpots: [{ name, x, y, shots }]` für weitere Nichtstun-Läufe ab einem Ort (zum Beispiel im Wasser). |

## Was nicht geht

- Kein Herauszoomen: die Kamera zeigt immer einen Bildschirm (nur das Hineinzoomen beim letzten Treffer gibt es). Eine „ganze Krake“ zeigt man über `camera()` und Zeichnung, nicht über Zoom.
- Eine Arena größer als 20×12 geht (die Kamera folgt Mimo und hält an den Rändern); dann `B.floor` und `door()` setzen, denn die Standardwerte gelten für 20×12.
- Eigene Felder, die von selbst verletzen, gibt es nicht; Gefahren prüft die Welt in `update` und ruft `api.hurt()`.
- Körper (`L.bodies`) tragen nur von oben (wie die Lifte), sie schieben Mimo nicht zur Seite.
- Eigene Hintergrundgeräusche (Vögel, Wind) sind nicht vorgesehen. Die Abschlusskarte bekommt nur über `ending` einen eigenen Text, und nur nach dem letzten Endgegner.
- Eine Welt kann ihre Level nicht neu nummerieren oder Spielstände verwerfen. Werden Level nach der Veröffentlichung umgebaut, braucht es eine eigene Versionsregel (gibt es noch nicht).
- Level von Welt 4 dürfen nach der Veröffentlichung nicht mehr hinzukommen, sobald Welt 5 existiert (Welt 5 würde verrutschen und lädt dann nicht).

## Welt 4: Geschichte (Figuren, Fundstücke, Anfangsszene)

Die Felder `cast`, `find`, `saltLine` und `opening` eines Levels stehen im Kopf von `coast-story.js`. Dazu kommt:

- `coast-story-acts.js`: weitere Auftritte (`act`): `paddle`, `juggle`, `hop1`, `tick`, `call`, `work`, `grade`, `wade`, `bob`, `lecture`, `gullup`, `search`, `snorkelbury`, `tideprints`, `dogpaddle`. Ein Auftritt ist `{ pos?, update?, draw, always? }` in `MimoCoast.acts`; alles hängt nur an `api.time` und Mimos Ort. `call` (`group`, `table`, `take`, `from`): „Essen ist fertig!", die Gruppe rennt zum Tisch, ein Krakenarm zieht den liegen gebliebenen Gegenstand aus dem Bild.
- `coast-dog.js`: der Retriever, aus dem Bad-Nenndorf-Zweig übernommen (`who: 'dog'`, `act` stand, run, fetch mit `carry`, dig, dogpaddle).
- `coast-opening.js`: die Anfangsszene vor Level 30 (`opening: true`, etwa 34 s), über den Kern-Hook `api.cine` (`begin()`, `end()`, `skipRequested()`, `camera(x, y, zoom)`: Balken, Mimo wartet, Springen überspringt). Der Strand liegt in der Karte des Levels links vom Start (Sandbank mit knöcheltiefem Meer, Plateau ab Spalte 11); die Familie sind lebende Figuren und bleiben nach der Szene, bei jedem späteren Start, Neustart und Respawn dort stehen (Köpfe folgen Mimo, Kind buddelt, Reporterin winkt, Hund buddelt und läuft umher, Schläferin schläft, Sprüche bei Nähe). Die Szene läuft einmal (Speicher `mimo.coast.opening`) und nie unter Testautomatisierung (`navigator.webdriver`, außer `MimoCoast.forceOpening`). Video: `node tools/video.mjs --opening 29`, danach `--family 29 [--after 1]` (Mimo läuft nach links zur Familie).
- Blasen tragen Strandsachen: `vents: [{ ..., items: ['bucket', null, 'flipflop'] }]`; `find: { bubble: true }` heißt, das Fundstück steckt in den Blasen mit diesem `item`. `find: { follow: { x, y } }` lässt es eine Krabbe (Spawn x, y) wie eine Lanze tragen. `find.ownerAct` lässt den Besitzer bis zu Mimos Ankunft etwas tun, `find.reach` vergrößert den Greifradius.
- Nacht und dunkles Schema: die Figuren bekommen einen gecachten Dämmerungston (`source-atop` auf Kopien ihrer Teilbilder und gemischte Gliedmaßenfarben, kein `ctx.filter`), gezeichnete Dinge mischen ihre Farben über `sdraw.setNight`.

### Lebende Figuren (Rigs) und Reaktionen

Die sieben Familienfiguren sind keine Bilder mehr, sondern die gelenkigen Figuren aus dem Bad-Nenndorf-Zweig (Beine mit echtem Gang, Arme, Mimik, Blinzeln, Haarfeder). Ids bleiben anonym: `striped sidepart redbeard reporter filmer kid professor`. 1 m = 30 px, Erwachsene ca. 52 px wie vorher.

Dateien (alle laden ohne `document`/`Image`, Bilder entstehen erst beim ersten Zeichnen): `coast-rig-core.js` (Mathe, Gang), `coast-rig-actions.js` (Gesten wave cheer pen mic clap film throw), `coast-rig.js` (Figur, Federn, Gelenke), `coast-rig-draw.js` (Zeichnen, Tönung), `coast-rig-data.js` (die 7 Rigs), `coast-cast-actions.js` (Strandgesten und Posen), `coast-cast.js` (Puppet, Reaktionen, API), `coast-cast-draw.js` (was jeder `act` mit der Figur macht, Zeichnen für stehen, vergraben, schnorcheln, liegen, Board). Gemeinsam über `window.MimoCoast`.

Regeln: Die Figuren laufen im Spielschritt (60 Hz, aus `api.time`/`dt`), Zufall nur über einen Zähler aus der Figur-Seed (Blinzeln, Gewichtsverlagerung); die Beine laufen genau dann, wenn sich die Figur bewegt (Tempo aus der Positionsänderung). Nur Figuren nahe der Kamera werden bewegt und gezeichnet. Bilder werden einmal pro Person geladen und geteilt, Teilbilder gecacht (Maßstab 3, je Tönung).

**API für Szenen** (`e` = Eintrag aus `storyEnv.story().cast` oder `find.owners`, gefunden über `tag`):

| Aufruf | Wirkung |
|---|---|
| `MimoCoast.cast.walkTo(e, xPx, { speed, faceEnd, delay })` | geht oder rennt dorthin (speed in Feldern/s: 1,1 gehen, ab 3 rennen), steht dann; gibt die Dauer in s zurück |
| `cast.pose(e, name \| null)` | hält eine Pose: `wave fan pen mic cam hooray applaud write point flail balance thumb hop pat kick`; `null`/`'stand'` = Ruhe |
| `cast.play(e, name, opts)` | eine Geste, dann zurück in Ruhe (`wave cheer pen mic clap film hooray applaud flinch`) |
| `cast.say(e, text, secs)` | Sprechblase über dem Kopf |
| `cast.expr(e, name \| null)` | Gesicht: `ouch` (striped), `wow` (kid), `serious`/`sure` (professor), `daze` (striped) |
| `cast.look(e, dx \| null)` | Blick auf einen Punkt dx px rechts der Figur; `null` = Mimo folgen |
| `cast.cheer(e)`, `cast.wince(e)` | die Reaktionsgesten |
| `cast.hand(e, 'l' \| 'r')` | Hand in px relativ zu den Füßen (für Requisiten) |
| `MimoCoast.puppet(who, seed)` | freie Figur für ein eigenes Bild (Anfangsszene); `null`, bis die Bilder geladen sind; `p.step(dt, x, { look, face, pose })`, `p.draw(ctx, x, fuß, { scale })` |

Positionen bleiben Funktionen von `api.time` (`e.mv` wie beim Ruf zum Essen), nie von der echten Uhr. Eigene `act`s zeichnen mit `env.drawFigure(ctx, e, pos)`; welche Pose ein `act` hält, steht in `poseFor` (`coast-cast-draw.js`). Neue Gesten: `MimoCoast.FamilyActions[name] = (w, s) => ({ arms, headTilt, torsoRot, feet, bounce, brow, beam, prop, done })` und für Daueraufnahmen ein Eintrag in `MimoCoast.castPoses` (`loop: [von, Länge]` mit ganzen Schwingungsperioden).

Reaktionsschicht (für jeden Eintrag automatisch): der Kopf folgt Mimo auf 8 Feldern Abstand; bei einem Stern klatschen Figuren auf 7 Feldern, bei einem Fund jubeln alle auf 14 Feldern, nach einem harten Sprung (über 0,75 s in der Luft) jubeln sie auf 10 Feldern (manchmal „Wow!“), bei Mimos Sturz zucken sie zusammen auf 8 Feldern („Oooh!“, „Autsch!“, „Uff!“); Ruhende machen ab und zu ihr Ding (Filmer filmt, Professor schreibt, Reporterin hält das Mikro). Zuschaltbar je Eintrag: `copy: true` (macht Mimos Sprung nach und landet auf dem Po, „Plumps!“), `films: true` (dreht die Kamera auf Mimo, solange er nah ist), `five: true` (Abklatschen, wenn Mimo dicht vorbeikommt). `holds: { mic: 'banana' }` tauscht, was die Hand hält (Requisiten in `coast-rig-props.js`: Banane, Muschel, Schaufel).

Übergabe am Ziel (`coast-handover.js`, Gags in `coast-handover-gags.js`): Mimo trägt das Fundstück nach dem Finden klein auf dem Kopf. Der Besitzer wartet 2,4 Felder vor der Tür (`find.ownerSide: 1` rechts davon, `find.ownerAt` genau), mehrere Besitzer stehen im Abstand von 1,2 Feldern, wer es annimmt, steht am weitesten von der Tür weg. Kommt Mimo mit dem Fund näher als 6 Felder, winkt der Besitzer ihn heran („!“). Läuft der Spieler Mimo bis auf 1,8 Felder heran, hebt Mimo das Ding stolz über den Kopf (unterwegs kürzer), der Besitzer nimmt es, und der Gag der Person läuft über die Erzählspur (`find.gag`, sonst nach Person): Kind schießt den Ball gleich wieder weg (`kick`), Reporterin setzt die Sonnenbrille verkehrt herum auf (`shades`), Rotbart zieht die Latsche auf den falschen Fuß (`flipflop`), die Uhr klingelt in der Hand (`ring`), Professor prüft mit der Lupe und gibt „1+“ über Mimo (`grade`), Schal wie ein Fanschal und dann um den Hals (`scarf`), Hund schlabbert Mimo ab und schüttelt sich (`lick`), Filmerin filmt Mimo und sieht dann den Arm (`film`), Schirm auf, das Meerwasser kommt heraus (`shade`), Interview mit dem Mikro (`interview`), Kerze aus, Birne in die Laterne (`light`), Schild auf die Krabbe (`taxi`), Hund schnuppert am Kuchen (`cake`). Danach `find.after`, zuletzt schaut ein beleidigtes Krakenauge aus dem Meer (oder hinter der Kante) und sagt `find.peek` (Standard „Pff.“, `false` = kein Auge). Ohne Fund schaut der Besitzer sich um, sagt `find.missing` und seufzt. Wer die Übergabe schon einmal gesehen hat (`localStorage` „mimo.coast.handed“), sieht den Besitzer mit seinem Ding winken, ohne Sätze. Wer vorbeispringt, gibt es beim Gang durch die Tür kurz ab. Die Siegkarte wartet nur, bis das Ding die Hände gewechselt hat (höchstens 3,2 s). `find.ownerProp: { mic: null }` gibt dem Besitzer am Ziel dieselbe Requisite wie im Level.

### Eine Erzählspur: `coast-director.js`

Alles, was die Geschichte in einem Level sagt, läuft durch **eine** Warteschlange (`MimoCoast.director`): Sätze der Figuren, der Klau und der Ruf des Besitzers, Witze, die Übergabe an der Tür, Mimos eigene Sätze an Orten (`says`), der Salzsatz. Es spielt immer nur ein Erzählschritt; der nächste wartet, bis die Blase davor weg ist, plus 0,5 s Atempause. Bewegung (Köpfe, Buddeln, Stift, Atmen) läuft frei weiter.

| Aufruf | Wirkung |
|---|---|
| `director.say(wer, text, o)` | Satz in die Schlange. `wer`: Cast-Eintrag, `'player'` oder Anker `{ x, y, w }`. `o.prio`: `'door'` 4 (Übergabe, Fund), `'player'` 3 (von Mimo ausgelöst), `'theft'` 2, `'gag'` 1; die Kette eines Klaus hat 4,5. `o.wait` (wie lange er warten darf, sonst fällt er weg), `o.secs`, `o.lead` + `o.before()` (Geste vor der Blase), `o.start()`, `o.done()`, `o.ok()`, `o.front` (Wartezeit zählt erst, wenn er dran ist) |
| `director.beat(o)` | stiller Schritt, der die Bühne `o.hold` s hält (der Klau) |
| `director.free(prio)`, `director.quiet()` | ist die Bühne frei; zeigt gerade gar keine Blase (dann darf eine Reaktion ein kurzes Wort sagen) |
| `director.secsFor(text)` | Lesezeit: 0,8 s + 0,07 s je Zeichen, 2,2 bis 4,5 s |

Regeln: Ein Satz startet nur, wenn sein Sprecher im Bild ist; der erste in der Reihe wartet darauf (so kommt eine Kette nie durcheinander), fällt aber nach seiner Wartezeit weg. Eine Blase, deren Sprecher das Bild verlässt, blendet früh aus. Blasen des Kerns (Mimos Startsatz, Piep) zählen mit: der Startsatz kommt zuerst. Solange die Geschichte spricht, bleiben Mimos eigene Langeweile-Gags aus. Reaktionen auf Mimo (Klatschen, Zusammenzucken) bleiben sofort, sagen aber höchstens ein Wort und nur bei freier Bühne. Die Siegkarte wartet nicht auf Sätze, nur `coast-handover.js` hält sie kurz, solange das Fundstück noch die Hände wechselt (`L.winAfter`; der Kern liest es in `winTime`).

Prüfen: `node tools/story-pace.mjs [--level 29] [--verbose] [--real]` spielt jedes Level der Welt auf seiner vollen Route und meldet zwei Blasen gleichzeitig, Blasen außerhalb des Bildes, Klaue am Rand oder nie ausgelöst, und weggefallene Sätze. Videos mit `node tools/video.mjs --world 4 --out …` (die Aufnahme wartet auf die Siegkarte).

### Die Krake klaut: `coast-thief.js`

Ein Klau je Level ist ein Cast-Eintrag `{ who: 'prop', act: 'snatch', x, y, ... }` (Kommentar am Dateianfang hat alle Felder). Er ist ein Schritt der Erzählspur: Er startet erst, wenn die Bühne frei ist und das Ding gut im Bild liegt (nicht am Rand; steht die Kamera am Levelrand, reicht dort ein Feld). Ablauf (Sekunden ab Start, `pace` macht ihn schneller, nur in der Verfolgung 42): Wellen oder Loch (0,4), der Arm steigt auf (1,3), schaut sich um (2,1), hält still (2,5), kommt herunter und tippt zweimal (3,0), greift (3,35), zieht es langsam mit „Schlürf!“ hinab (4,5). Erst danach bemerkt es der Besitzer (Doppelblick, dann der Ruf), dann die `then`-Sätze, die Notiz zuletzt, jeder nach dem vorigen. Was geklaut wird: `kind` (eigene Requisite), `take: tag` (eine andere Requisite), `hand: tag` + `swap: 'mic'` + `icon` (aus der Hand), `hand` + `part: 'snorkel'`, `carryOf: tag` + `carry` (aus dem Hundemaul). Woher: `from: 'water' | 'sand'`, `ax` (Felder neben x), `ay`. Wann: `at` (Mimo passiert x), `r` + `rows`, `atRow` (Mimo klettert über diese Zeile), `belowRow` (Mimo ist abgetaucht), `cue: tag` (wenn der Ruf „Essen ist fertig!“ gespielt ist und alle laufen). Danach: `owner` + `cry` (`ownerPose`), `then: [{ by, text, note }]` (`note: true` schreibt mit), `note: { by, text }` (der Professor schreibt mit, zuletzt), `bark: tag`.

Wo ein Klau liegt, entscheidet, ob man ihn sieht: Mimo bleibt selten stehen. Darum liegen die Klaue in 33 und 36 jetzt am letzten Becken vor der Tür (wo Mimo auftaucht), in 31 am Ende des ersten Beckens, in 34 auf dem Sims über den schlafenden Taxis (Mimo fährt dort hin und her), in 35 oben auf dem Watt, wo Mimo zweimal vorbeikommt. In 40 fischt das Kind im ersten Stock des Leuchtturms, wo Mimo entlangläuft und auf das Wasser wartet. Die vollen Routen von 30, 31, 33, 36, 37 und 38 bleiben für den Klau kurz stehen, wie ein Kind, das hinschaut.

Szenenhelfer `MimoCoast.scene`: `later(e, s, fn)` (in Spielzeit), `hold(e, pose, opts)` (Pose über dem Akt), `doubleTake(e, x, text)`, `note(e, text)`, `find(tag)`; der Arm als Bild: `MimoCoast.thief.armPoints / drawArm / drawBase`.

### Level 37 bis 42, Schlussszene, Taxi-Turbo

`coast-story-acts2.js` hat die Auftritte der späten Level (Kopfkommentar listet alle Felder): `parade` (Treibgut zieht mit der Strömung), `radio` (Jubel „Tooor!“, sobald Mimo ins Wasser fällt), `stash` (ein Arm aus dem Bullauge legt etwas auf den Haufen und summt), `follow` (läuft einem Eintrag hinterher), `peek` (Augen im Dunkeln), `candle` (die Wärterin sucht mit Kerze), `crabride` (zweite Taxi-Krabbe in der Spur hinter einer echten, mit Reiter). Levelfelder: `hum: { below, text }` (Mimo summt in der Tiefe), `dark: [x0, y0, x1, y1]` (dunkler Raum, hell erst mit dem Licht), `lantern: { x, y }`. Fundstück-Felder: `style` `footage` (Bildschirm mit der Aufnahme unter der Filmerin), `shade` (Schirm über dem Kopf), `light` (Birne fliegt in die Laterne, der Strahl wandert), `taxi` (Schild auf der Krabbe); `after: [{ by: tag | 'owner' | 'owner2', text, delay }]` Sätze nach dem Dank; `hum: { text, r }` (das Mikro summt); `jelly: true` (der Schirm ist die Qualle `u` an seiner Stelle und wirft höher); `big`, `glow`. Schläfer: `soot: 1` schwarz, `inkable: true` wird von der Tintenwolke geschwärzt. `paddle` mit `steady: true` bleibt stehen. Netz `catch: 'slipper'`. Neue Bilder in `coast-story-draw3.js` (Wärterin, Bollerwagen, Schwimmring, Hausschuhe, Selbstporträt, Haufen, Einsiedlerkrebs, Aufnahme, Lichtstrahl). Comicwörter: `MimoCoast.pop(x, y, text, { size, fill })`.

Taxi-Turbo (`crabBoost: 1.6` im Level, nur Level 34): Wer auf der Krabbe in ihre Richtung drückt, macht sie schneller (höchstens 5 Felder/s); Mimo bleibt dabei auf dem Panzer stehen, ein Sprung nimmt das Tempo der Krabbe mit.

Schlussszene (`coast-closing.js`): startet 6 s nach dem Sieg (Mütze sitzt, letzter Satz gesagt) über `api.boss.scene`, eigener Strand im Bildschirmraum mit eigener Kamera, etwa 21 s, Springen überspringt. Die Tür öffnet erst danach (`doorAfter` der Krake; ohne Szene nach 6,6 s). Wer noch ein Fundstück vermisst, rennt nicht zum Tisch, sondern sucht weiter. Nie unter Testautomatisierung, außer `MimoCoast.forceClosing`. Video: `node tools/video.mjs --closing`. Die Kern-API dafür: `api.cine.camera(x, y, zoom)` (Zoom für Szenen), `api.drawMimo(..., { hat })`; Sprechblasen überlappen nicht mehr (der Kern stapelt sie).

Laufende Witze bisher (für 37 bis 42 weiterführen): Spur des Professors 30 „Spur eins: Es ist nass.“, 31 „Spur zwei: Es kam aus dem Wasser.“, 33 „Spur drei: Saugnäpfe.“, 35 Notizen geklaut, er zeigt auf die Möwe: „Aha. Es war die Möwe.“ (Möwe: „Ich? Nie im Leben!“), 36 Möwe an der Tür „Ich war es nicht! Frag den Ball.“. Reporterin: Mikro (Anfang), in 31 geklaut (spricht danach in die Faust), 35 Banane, 36 Muschel (nur als Bild). Der Hund heißt Lotta und darf so gerufen werden (34: „Meine Würstchen! Lotta, warst du das?“). Rotbart eingebuddelt: 30 Stufe 1, 31 Stufe 2, 35 Stufe 3 mit Schnorchel. Schläfer: rot 0 (Anfang, 31), 1 (33), 2 (36). Der Hundeball wird in 32 aus dem Maul geklaut und in 36 gefunden.

Weitergeführt in 37 bis 42: Spur des Professors 37 Aufnahme „Unscharf. Eindeutig die Möwe.“, 38 „Spur fünf: Es mag Schirme.“ (an der Tür; der Schirm gehört dort dem Scheitel, das Radio dem Rotbart), 39 „Acht Hausschuhe? Die Möwe hat nur zwei Füße.“ und „Notiert. Die Möwe summt.“ (beide an der Tür), 41 „Die Möwe kann gar nicht tauchen. Hm.“, 42 „Notiert: Es hat Hunger.“, Schluss „These widerlegt.“ und „Teilweise bestätigt.“ Reporterin: 37 Muschel, 38 Latsche, 40 Banane, 42 Muschel als Sportreporterin, 39 bekommt sie ihr Mikro zurück. Schläfer: rot 3 ab 37, in 42 schwarz aus der Tinte, wacht in der Schlussszene auf. Möwe: 39 „Na? Wer hatte recht?“, am Ende fallen ihr die Würstchen aus dem Gefieder. Die Krake: 37 Kamera, 38 Radio, 39 legt einen Schwimmring ins Lager, 40 holt ihren Hausschuh aus dem Kescher, 41 Augen im Dunkeln, 42 das letzte Würstchen.
