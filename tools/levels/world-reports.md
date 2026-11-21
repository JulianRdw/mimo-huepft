# World reports: worlds 4, 5 and 6

Numbers come from the tools, run on 2026-11-19 against the levels in `src/`: `node tools/levelcheck.mjs` (fast and full clock time, the stored routes, 0 deaths), `node tools/pacing.mjs --world N` (idle share of the fast route: time with no key held), `node tools/levellint.mjs` (size, flags) and `node tools/bosscheck.mjs` (bot win time). Medals are the gold, silver and bronze limits in `src/worlds/*-levels.js` (gold = fast time × 1.3 rounded up to 0.5, silver = ×2, bronze = ×3, as printed by `levelcheck --medals`). The level number is the one shown in the menu (level index + 1).

**Difficulty is not measured by any tool.** The column is the builder's judgement on a 1 to 10 scale for the whole game, copied from `tools/levels/draft4|5|6/report-*.md`; no human has playtested it yet.

## World 4 "Korallenküste"

| Menu | Name | Size | Flags | Fast | Full | Idle (fast) | Medals (gold / silver / bronze) | Difficulty |
|---|---|---|---|---|---|---|---|---|
| 30 | Sandburg | 141×20 | 3 | 25.98 s | 34.98 s | 21 % | 34 / 52 / 78 | 4–5 |
| 31 | Kopfsprung | 109×19 | 2 | 21.12 s | 30.92 s | 0 % | 27.5 / 42 / 63 | 5 |
| 32 | Blubberlift | 24×52 | 2 | 17.47 s | 23.87 s | 20 % | 23 / 35 / 52 | 5 |
| 33 | Seeigelgarten | 119×21 | 2 | 30.08 s | 39.22 s | 7 % | 39.5 / 60 / 90 | 5–6 |
| 34 | Krabbentaxi | 146×17 | 3 | 31.11 s | 37.72 s | 47 % | 40.5 / 62 / 93 | 6 |
| 35 | Ebbe und Flut | 96×16 | 3 | 18.29 s | 23.33 s | 9 % | 24 / 37 / 55 | 6 |
| 36 | Kugelfisch-Allee | 82×16 | 2 | 18.07 s | 23.87 s | 8 % | 23.5 / 36 / 54 | 6 |
| 37 | Gegenstrom | 104×17 | 2 | 22.37 s | 25.48 s | 6 % | 29.5 / 45 / 67 | 6–7 |
| 38 | Quallenwiese | 40×48 | 2 | 12.72 s | 18.27 s | 27 % | 17 / 25 / 38 | 7 |
| 39 | Das Wrack | 110×26 | 4 | 27.02 s | 38.22 s | 8 % | 35.5 / 54 / 81 | 7 |
| 40 | Leuchtturm | 50×62 | 3 | 21.72 s | 30.76 s | 23 % | 28.5 / 43 / 65 | 7 |
| 41 | Tiefsee | 102×40 | 4 | 28.81 s | 32.75 s | 17 % | 37.5 / 58 / 86 | 8 |
| 42 | Tintenflucht | 178×18 | 7 | 28.47 s | 32.19 s | 7 % | 37.5 / 57 / 85 | 8 |

Boss Käpt’n Krake (after menu level 42): bot wins in 63.84 s of fight time, hits at 8.53, 17.92, 32.87, 44, 55.21, 67.98, 0 falls (`node tools/bosscheck.mjs`).

## World 5 "Vulkaninsel"

| Menu | Name | Size | Flags | Fast | Full | Idle (fast) | Medals (gold / silver / bronze) | Difficulty |
|---|---|---|---|---|---|---|---|---|
| 43 | Aschestrand | 161×18 | 4 | 23 s | 28.95 s | 0 % | 30 / 46 / 69 | 5–6 |
| 44 | Heißer Stein | 151×18 | 3 | 22.65 s | 35.85 s | 0 % | 29.5 / 45 / 68 | 6 |
| 45 | Geysirfeld | 90×68 | 3 | 16.8 s | 22.59 s | 20 % | 22 / 34 / 50 | 6 |
| 46 | Feuerhüpfer | 158×20 | 3 | 23.58 s | 24.72 s | 0 % | 31 / 47 / 71 | 6 |
| 47 | Glutbrücke | 130×18 | 4 | 22.24 s | 35.73 s | 19 % | 29 / 44 / 67 | 6–7 |
| 48 | Dampfkessel | 112×20 | 3 | 20.3 s | 31.1 s | 2 % | 26.5 / 41 / 61 | 7 |
| 49 | Basaltorgel | 111×18 | 3 | 19.38 s | 24.42 s | 18 % | 25.5 / 39 / 58 | 7 |
| 50 | Lavafall | 40×54 | 3 | 18.78 s | 26.72 s | 18 % | 24.5 / 38 / 56 | 7 |
| 51 | Schlotfahrt | 26×70 | 3 | 19.62 s | 26.81 s | 23 % | 26 / 39 / 59 | 7–8 |
| 52 | Die Schmiede | 150×24 | 3 | 29.87 s | 37.07 s | 6 % | 39 / 60 / 90 | 8 |
| 53 | Glutregen | 162×30 | 4 | 25.17 s | 30.03 s | 5 % | 33 / 50 / 76 | 8 |
| 54 | Kraterrand | 182×28 | 5 | 28.32 s | 42.21 s | 5 % | 37 / 57 / 85 | 9 |
| 55 | Es steigt! | 28×100 | 5 | 25.1 s | 34.08 s | 13 % | 33 / 50 / 75 | 9 |

Boss Drache Fauch (after menu level 55): bot wins in 52.17 s of fight time, hits at 6.13, 13.83, 24.57, 32, 45.69, 55.89, 0 falls (`node tools/bosscheck.mjs`).

## World 6 "Mond"

| Menu | Name | Size | Flags | Fast | Full | Idle (fast) | Medals (gold / silver / bronze) | Difficulty |
|---|---|---|---|---|---|---|---|---|
| 56 | Kleiner Schritt | 154×20 | 4 | 21.4 s | 26.18 s | 0 % | 28 / 43 / 64 | 7 |
| 57 | Mondstaub | 152×20 | 4 | 21.93 s | 27.47 s | 0 % | 29 / 44 / 66 | 7 |
| 58 | Kraterhüpfen | 150×22 | 4 | 22.41 s | 25.21 s | 2 % | 29.5 / 45 / 67 | 7 |
| 59 | Umlaufbahn | 166×22 | 4 | 19.06 s | 28.25 s | 0 % | 25 / 38 / 57 | 7–8 |
| 60 | Sternschnuppen | 140×20 | 4 | 22.52 s | 28.01 s | 0 % | 29.5 / 45 / 68 | 8 |
| 61 | Schwebesteine | 130×20 | 5 | 20.03 s | 28.39 s | 10 % | 26.5 / 40 / 60 | 8 |
| 62 | Dunkle Seite | 148×20 | 4 | 21.47 s | 23.47 s | 1 % | 28 / 43 / 64 | 8 |
| 63 | Mondbasis | 140×22 | 3 | 22.02 s | 28.42 s | 1 % | 29 / 44 / 66 | 8–9 |
| 64 | Raketenteile | 166×22 | 5 | 27.27 s | 28.25 s | 22 % | 35.5 / 55 / 82 | 9 |
| 65 | Kometenritt | 158×24 | 3 | 22.22 s | 44.07 s | 22 % | 29 / 44 / 67 | 9 |
| 66 | Schwerelos | 40×86 | 3 | 20.61 s | 30.99 s | 5 % | 27 / 41 / 62 | 9 |
| 67 | Käsekeller | 156×28 | 3 | 25.83 s | 31.11 s | 7 % | 34 / 52 / 77 | 9–10 |
| 68 | Erdaufgang | 194×46 | 4 | 25.49 s | 39.67 s | 13 % | 33.5 / 51 / 76 | 10 |

Boss Mondwurm Käsebert (after menu level 68): bot wins in 45.97 s of fight time, hits at 6.08, 11.78, 21.86, 29.09, 41.59, 49.22, 0 falls (`node tools/bosscheck.mjs`).

Notes

- Fast routes are the quickest clean way to the door (they set the medals), full routes collect all stars and the hidden one. All 78 routes of the three worlds win with 0 deaths.
- World 6: the full route of Kometenritt (10) waits for the high comet (4.3 s at one spot, 25.7 s without input over 44.1 s); `pacing` flags it as LANG, which only reports for full routes. Its fast route is clean.
- Boss times are the bot only; a human needs longer. `bosscheck` also plays a do-nothing bot (the boss reaches Mimo in the corner) and a sloppy bot (no hang-ups, time between falls) for every boss.
