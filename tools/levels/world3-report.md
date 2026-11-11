# World 3 "Verschneite Höhen": level rework

Files: `tools/levels/world3.mjs` (8 levels in play order), routes in `tools/levels/routes/world3/NN-full.txt` and `NN-fast.txt`.
Lint: `node tools/levellint.mjs --from tools/levels/world3.mjs` is clean (exit 0). All 16 routes win in levelbot with 0 deaths.

## The old levels (verdicts)

| Old level | Verdict | What was wrong |
|---|---|---|
| Pulverschnee | reworked (slot 1) | Completely flat: one ground line with four identical pits, stars floating in the air, no hidden star. The good part (ice needs run-up, four-gap from ice) is kept. |
| Eiszapfen | reworked (slot 2) | The hint promised "only tap under icicles", but the icicles hung 5 rows above the ground, so full jumps were safe. Nothing in the level actually needed the mechanic. Now the corridor really only allows small hops, and the falling icicles hang over the landings. |
| Schneesturm | reworked (slot 5) | Two wind columns that simply carry you across, so the player never has to steer. Now there are jumps where you have to let go of "right" in the air, a windy icicle corridor, storm stairs, and a secret roof. |
| Frostschnecken | reworked (slot 4) | Three copies of the same beat (ice bridge, snail, gap). Now the snails are stepping stones: a board snail over a wide pit, a bounce chain over two ice floes, and a snail "brooding" on a star. |
| Gipfelgrat | reworked (slot 7) | It was vertical, which was good, but short (30×20): two crumble rows and a snail guarding the flag. Now it is 26×46 with four stages: boards and crumbles, then ice ledges and a lift, then a ledge snail and an updraft, then the summit ridge under falling icicles. |
| Lawine | kept and improved (slot 8, finale) | The hint said "every flag resets the avalanche", but the code only resets it when you respawn (`respawn()`: flag − 9 tiles). Touching a flag does nothing to it. The hint is now correct. The thorns at the bottom of the pits were fine (open pits you can fall into). The level is longer now (116 wide, 3 flags), with a tailwind section that wins time and timed thorns that cost time, plus the hidden star. Speed goes from 175 to 180 px/s. |
| (new) Sessellift | new (slot 3) | Lifts (movers) had never been used in world 3. |
| (new) Eishöhle | new (slot 6) | A switch, key and lock cave with timed thorns under a no-jump icicle ceiling, once on snow and once on ice. |

## The new levels (play order)

Fast and full clock times are levelbot times. Difficulty is on a 1–10 scale for the whole game (worlds 1–3 are the beginning).

### 1 Pulverschnee: 72×15, medium, difficulty 4, fast 9.4 s (full 13.5 s), 2 flags
- **Idea:** Arriving in the snow. On ice you need a run-up, and braking takes 0.5 s and about 1.6 tiles.
- **Mechanics:** a thorn on an ice run, thorn pits, a snow block to climb, a chain of ice floes (3 wide, then 2 wide) where you must hop again right away or you slide off, and a ten-tile ice run-up to a four-gap.
- **Stars:** one above the snow block (needs a dedicated jump) and one above the four-gap.
- **Hidden star (cellar):** Run LEFT at the start, the "wrong" way. You slip off a little ice patch into a hole and land in a crawl cellar under your own start position, where the star waits. You get out with a jump (2 up). The cellar is in view at the start, but you only reach it by going backwards.

### 2 Eiszapfen: 60×15, medium-short, difficulty 5, fast 8.3 s (full 14.0 s), 1 flag
- **Idea:** Learn the two kinds of icicle. Big dripping ones fall about 0.6 s after you come near. Small double ones stay where they are.
- **Mechanics:** An icicle corridor with exactly 3 rows of headroom. A full jump hurts, and a tap (up to about 0.1 s) is safe. Three two-gaps with thorn pits. Then three pillars over a thorn pit, each with big falling icicles above both of its tiles (on a jagged ceiling), so dawdling on a pillar kills. Finally a 3-high end block with the door on top.
- **Stars:** One above the first corridor gap needs a tap. One sits directly under the falling icicles of the middle pillar: provoke them, jump back, let them shatter, then jump for it ("lass ihn erst fallen").
- **Hidden star (tunnel):** Under the end block there is a one-tile-high dead-end tunnel, its ceiling full of small icicles. It looks deadly. Walking in is completely safe, because only a jump would hurt. The star is at the far end. Julian's "stand under an icicle that turns out safe".

### 3 Sessellift: 68×22, long and a little vertical, difficulty 5, fast 19.9 s (full 30.5 s), 2 flags
- **Idea:** A calm timing level that comes before the harder ones.
- **Mechanics:** Lift A crosses a valley (a bottomless thorn valley). Lift B goes up a cliff in a shaft. Lifts C and D move in opposite directions under a low ceiling of small icicles, so you cannot jump there and have to step across when they meet. Lift F goes down a deep shaft (12 tiles). The door is beyond a 2-gap you can also just jump.
- **Stars:** One above lift A (a small hop while riding). One on a ledge left of the top of lift B (jump off the lift at the top).
- **Hidden star (cellar):** The last lift seems to have no purpose. Its dotted rail goes straight down into the dark. Ride it all the way down ("in den Keller"). At the bottom, step to the left edge of the lift and the star in the little niche is yours. Then ride back up.

### 4 Frostschnecken: 56×14, short, difficulty 5–6, fast 8.4 s (full 9.8 s), 1 flag
- **Idea:** Snails are stepping stones. A stomp gives a fixed bounce of 560, about 3.8 tiles of flight when running.
- **Mechanics:** A long ice bridge with a snail (you can't stop easily, so you jump on it or over it). An ice edge in front of a wide pit with a snail on a 2-wide board in the middle. Two ice floes with a snail each: one jump from the ground, a stomp, then a stomp again carries you over both. The last gap is only 1 wide, so the chain always reaches the ground. Then a 3-high step and the door.
- **Stars:** One above the ice-bridge snail. One above the board snail, which you only reach by bouncing on her (or a straight-up jump from the board).
- **Hidden star (the brooding snail):** On a board right above the door, a snail shuffles back and forth over a star like a hen sitting on an egg. The snail is drawn in front of the star, so it is half hidden. Jump from the step onto her head: the stomp itself grabs the star. Julian's "bouncing on a snail".

### 5 Schneesturm: 78×16, medium-long, difficulty 6, fast 9.3 s (full 11.1 s), 2 flags
- **Idea:** Steer the storm. A tailwind gives 360 px/s in the air when you hold right, 150 when you let go, and −60 when you hold left.
- **Mechanics:** A 7-gap that looks impossible and is crossed in the wind. A 4-gap onto a 3-wide platform with thorns right behind it (land and stop). A windy corridor under icicles (only small hops, but the wind carries a hop 3.5 tiles). Then the storm stairs: three pillars with wind only in the gaps. The jump from B to C overshoots into the abyss if you keep holding right. The bot confirmed this: holding right ends in the pit.
- **Stars:** one inside the first wind gap, and one high between pillars B and C (taking it and landing on C needs the release).
- **Hidden star (the roof):** In the icicle corridor there is a gap in the icicles with a pale updraft in it, like a chimney. A small hop under it and the storm whooshes you up through the rock onto the roof of the corridor. The roof is above the camera while you are inside the corridor. The star is at the end of the roof. You drop back down at the corridor exit.

### 6 Eishöhle: 60×16, medium, difficulty 7, fast 11.9 s (full 14.3 s), 2 flags
- **Idea:** The tricky puzzle-and-timing cave.
- **Mechanics:** First a switch: the a-wall vanishes and the b-bridge appears. Then three groups of timed thorns under a low icicle ceiling, where you cannot jump over them and must walk through in rhythm. The groups alternate, so "go, go, wait, go". Then the key in front of a wall of lock blocks. Then two more timed-thorn groups on ice under icicles, where braking is slow, so you have to time your entry. The door needs the key.
- **Stars:** One above the b-bridge. One between the two ice thorn groups, which needs a tiny tap under the icicles while you slide.
- **Hidden star (lock-block stairs):** The lock wall behind the key is built as a staircase that leads up to a star in a niche. Walk in normally and you take the key, so the whole staircase disappears, the path opens, and the star is out of reach (a visible "poof, oops" moment). The clever way: hop over the key, climb the stairs, take the star, then come back down and take the key.
- **Honest caveat:** The key stays collected after a death, so if you take it first, the star is only available again after a level restart. It is optional, and the stairs are shown before the key is taken, so I think this is fair. If Julian disagrees, the fallback is to build the stairs from switch blocks instead.

### 7 Gipfelgrat: 26×46, vertical, difficulty 7, fast 19.0 s (full 20.4 s), 2 flags
- **Idea:** The climb to the summit, with everything from the world in one ascent.
- **Mechanics:**
  - Boards, then crumbles, then a ledge (flag 1).
  - An ice ledge, then a snow ledge, then a lift up (thorns under the lift shaft, so missing it is a death with a respawn at the flag, not a long fall back to the bottom).
  - A small ledge with flag 2, a ledge with a snail (stomp or time it), and a board into an updraft.
  - The summit ridge with two crumble stretches under three big falling icicles. The door is near the left end.
  - Every step is within the measured limits (3 up with at most 1 gap, or 2 up with 2).
- **Stars:** one above the second board (an extra jump), and one in the updraft (steer into it while rising).
- **Hidden star (behind the door):** Past the door, a crumbling cornice sticks out over the abyss, with a star at its tip. Walking onto the door wins immediately, so you have to jump OVER the goal, grab the star while the snow crumbles under you, and jump back onto the door.

### 8 Lawine: 116×14, long, chase 180 px/s, difficulty 8, fast 14.7 s (full 19.4 s), 3 flags
- **Idea:** The finale before the Yeti. Mimo (210 px/s) gains about 0.9 tiles per second on the avalanche while running cleanly. Every stop costs.
- **Mechanics:** pits, a thorn on ice, an overhang with falling icicles (they fall behind you if you keep running), a pit under it, a crumble bridge, thorns, a tailwind six-gap (wins time), two timed-thorn groups (cost up to about 1.5 s of waiting), an ice run-up to a four-gap, a last snail, and the door.
- **Margin:** After a respawn at flag 2, the worst-case wait at the thorns still leaves about 3–4 tiles of margin by my calculation. The bot run had 7.6 tiles at the thorns.
- **Stars:** one under the icicle overhang above the pit, and one in the tailwind gap.
- **Hidden star (behind the start):** Mimo starts at x 12. The star lies at x 3, behind him, exactly where the avalanche comes from. Run toward the thundering avalanche, grab it, turn around and run. At the turn the avalanche is about 4 tiles away.
- **Caveat:** This works only on a fresh start (after a death you respawn with the avalanche 9 tiles behind the start, on top of the star). The dare lasts about the first 2 seconds.

## Release extension (longer levels)

Every level got new sections of the same theme, about +30 to +50 % on the fast clock. Old sections are unchanged, only shifted. Fast = levelcheck fast route, full = route with all 3 stars. Routes now come from the slab sources used for the build, so the numbers in the per-level text above (widths, clock times, x positions) describe the old versions; the table here is current.

| # | Level | Size | Fast old -> new | Full new | New section |
|---|---|---|---|---|---|
| 1 | Pulverschnee | 101x15 | 9.4 -> 13.8 s | 17.9 s | Ice staircase with a thorn on the ice (hop twice), a thorn floe chain; flags at x 53 and x 76. Stars unchanged (cellar star x 6, block star x 28, four-gap star). |
| 2 | Eiszapfen | 85x15 | 8.3 -> 12.2 s | 17.8 s | Second tap corridor of 25 tiles with crumble floors, a chimney opening with a thorn (full jump allowed there) and big icicles. Stars unchanged. |
| 3 | Sessellift | 101x22 | 19.9 -> 29.3 s | 39.9 s | Two more lifts in a 33-tile section after the cliff: a horizontal lift under a ceiling of small icicles (no droppers), a flag ledge, a second lift to a ledge with a thorn. Lifts C, D, F got new phases so that their old wait pattern still fits. Stars unchanged (hidden cellar star kept). |
| 4 | Frostschnecken | 75x14 | 8.4 -> 12.3 s | 13.7 s | Board snail chain: ice edge, board with a snail, higher board with a snail, bounce twice to the ground. Flag at x 46. Stars unchanged. |
| 5 | Schneesturm | 119x16 | 9.3 -> 14.0 s | 15.8 s | Two wind hops of 13 tiles (island in the first one at row 10, hold right all the way works), flags on both landings. Stars unchanged (roof star kept). |
| 6 | Eishöhle | 86x16 | 11.9 -> 16.8 s | 19.3 s | "Rückschalter": b-bridge to a second switch (turns the a-blocks back on), a-block stairs up to a ledge with one timed-thorn group under icicles, flag on the ledge. |
| 7 | Gipfelgrat | 26x61 | 19.0 -> 28.2 s | 29.6 s | New 15-row stage between the first flag ledge and the ice ledge: boards, ice, crumbles, an ice floe with a thorn, boards, ice. One star moved to the thorn hop (x 22, row 34), the old second-board star is gone; flag added on the snow ledge before the lift. |
| 8 | Lawine | 161x14 | 14.7 -> 22.1 s | 24.8 s | Pit and thorn ice strip under an icicle ceiling (x 36-62), crumble bridge with a thorn before the finish, a flag before the timed thorns. Last snail replaced by a thorn (see below). |

Notes and shaky spots:
- Lifts: L3 and L7 are timed by `G.time`. The fast routes contain waits that match a cycle (L3 lift E cycle 5.3 s, L7 lift 8.7 s with up to 7 s wait for the bot). A human just waits for the next cycle.
- L8: chase speed unchanged (180). Fast route keeps a gap of over 20 tiles to the avalanche all the time; the full route still has 3.8 tiles at the turn behind the start. After a respawn the avalanche is 9 tiles behind the flag; the timed thorns need at most about 0.6 s of waiting for the bot, a bad phase costs up to about 1.4 s.
- L8: the last snail and the n1 snail were replaced by thorns, because a snail on a wide floor patrols into the door area and made the finish timing-dependent. L1 hash note: which icicles fall depends on the absolute tile x; inserted blocks in L2, L3, L8 keep a width that is a multiple of 3 where the old ceilings sit behind them.
- L6: after the second switch the b-bridge disappears. The flag on the ledge is placed after that switch on purpose, otherwise a death between the switch and the ledge would soft-lock.
- Bot timing of the new snail section in L4 depends on a wait (1 s) at the flag, humans time the snails by eye.
- Not verified by a human: all times and routes are bot runs only.

## Difficulty curve

| # | Level | Length | Difficulty | Fast clock |
|---|---|---|---|---|
| 1 | Pulverschnee | medium (72) | 4 | 9.4 s |
| 2 | Eiszapfen | medium-short (60) | 5 | 8.3 s |
| 3 | Sessellift | long, lifts (68×22) | 5 | 19.9 s |
| 4 | Frostschnecken | short (56) | 5–6 | 8.4 s |
| 5 | Schneesturm | medium-long (78) | 6 | 9.3 s |
| 6 | Eishöhle | medium (60) | 7 | 11.9 s |
| 7 | Gipfelgrat | vertical (26×46) | 7 | 19.0 s |
| 8 | Lawine | long (116), chase | 8 | 14.7 s |

**Mechanics order:**
1. ice
2. icicles
3. lifts (used under the icicle no-jump rule)
4. snails (with ice)
5. wind and updraft (with icicles)
6. switch, key and timed thorns (with icicles and ice)
7. everything vertical
8. chase

Each level adds at most one new idea and recombines earlier ones. Nothing is frame-perfect. The tightest spots are:
- the pillar icicles in L2 (you have about 0.8 s on each landing);
- the release jump in L5;
- the timed-thorn rhythm in L6 (1.2 s windows);
- the snail on the ledge in L7.

## Notes for integration

- The levels must replace `LEVELS` entries 17–22 with these 8 levels. All later indices shift: the Yeti boss uses `after: 21`, and `LAST_MAIN`, the night level, and saved stars, best times and ghosts are all keyed by level index. Whoever integrates all three worlds needs to update them.
- **Touch:** nothing needs "down" or "up". The release jump in L5 means letting go of the run-right zone in mid-air.
- **Lift timing (L3, L7):** movers run on `G.time` from level load. The routes are timed for a bot that starts at once. A human who waits at the start just waits for the next cycle (L3 cycles are 5.6–9 s, L7's lift cycle is 8.7 s).
- **Snails in L4 and L7** move independently of the player, so the routes depend on timing (they contain small waits). Humans just look and time.

## Proposals (not implemented)

1. **A pause at the ends of a mover's path** (`pause: s`), so lifts wait at their stations. L3's full run is 30 s, much of it waiting for lifts.
2. **A separate map character for a falling icicle** (for example `V`) instead of choosing them with `(2x+y)%3`. Then any icicle could be made to fall, and the jagged ceilings over the L2 pillars would not be needed.
3. **Flags that also push the avalanche back on touch**, as the old hint claimed. Today only a respawn resets it. Optional: it would make the chase more forgiving, which may not be wanted.
4. **A "hint glint" for hidden stars**, such as a tiny sparkle on the screen edge when a hidden main star is just off camera. That would only matter for the roof star in L5.
