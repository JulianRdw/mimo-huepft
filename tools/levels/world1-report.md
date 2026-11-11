# World 1 "Wiese": level redesign report

Ten levels in play order live in `tools/levels/world1.mjs` (plain data, same shape as `LEVELS`).
Routes: `tools/levels/routes/world1/NN-full.txt` and `NN-fast.txt`.
Only existing mechanics are used. No `src/` or tool changes.

## Release extension (longer levels)

Every level of world 1 was made roughly 40 to 50 percent longer (fast-route clock), with new sections that use the level's own mechanic. The sections below replace the sizes and times in the per-level notes further down; old ideas, hidden stars and the difficulty order are unchanged. All 20 routes win without deaths (`node tools/levelcheck.mjs`), lint is clean.

| # | Level | Size (old to new) | Fast s (old to new) | Full s | What was added |
|---|---|---|---|---|---|
| 1 | Aufwachen | 60 to 76 wide | 5.7 to 8.3 | 14.0 | Longer tail: a 2-gap, a 1-high and a 2-high step, a 3-gap, then the door. Stars unchanged (hidden meadow still left of the start). |
| 2 | Dornenpfad | 64 to 95 | 9.5 to 14.2 | 16.3 | Three single thorns with room to hop after the first board (before the flag stays); a second flag, then a thorn staircase (2 thorns, 1-high block, 2 thorns, 2-high block, 3 thorns) before the last thorn trio. The star behind the door is still the hidden one. |
| 3 | Schwebend | 60 to 94 | 15.6 to 23.7 | 37.9 | Behind the twin platforms: a flag, a long ride on a third platform (9 tiles), a resting island with a flag, a fourth platform that starts one tile higher, then the door island. Platforms of the new part can be left with a 2-tile jump from the right end, so exact timing is not needed. |
| 4 | Der Schalter | 58 to 89 | 8.7 to 13.3 | 18.6 | A flag and a pit crossed on peach stepping stones (state after the first switch), lilac hurdles over thorns after the lilac bridge (state before the third switch), and on the door ledge a fourth switch that makes a 4-high peach wall disappear. The three stars and the cellar are unchanged. |
| 5 | Bröselig | 56 to 80 | 8.2 to 12.0 | 13.5 | A 10-tile crumbly bridge over a thorn bed (just keep running) with a flag behind it, and before the door a crumbly staircase (3 steps, thorns below) up to the door ledge. The cave star and the other two stars are unchanged. |
| 6 | Pilzwiese | 60 to 89 | 9.4 to 13.9 | 17.7 | A chain-bounce tower: a mushroom row, a 2-high block with a double mushroom, and a tall block you land on top of (flag behind it). Before the door a third mushroom pillar throws you onto a raised door plateau. Stars and the secret star are unchanged. |
| 7 | Der Schlüssel | 56 to 93 | 15.3 to 21.9 | 41.9 | After the start: two thorn pits, the second under a ceiling-thorn cloud (flat hop), and a flag. After the hill: a second, slower lift to a 14-tile board path over a thorn bed, a flag in front of it, then the lock wall. |
| 8 | Hin und zurück | 70 to 104 | 27.4 to 39.0 | 39.0 | A longer low road (second thorn pit, flag after the drop) and a longer high road (six more crumbly stones). Also 10 tiles more at the start, so the roof run home has two more thorn hops. Star positions are unchanged, fast equals full as before. |
| 9 | Querfeldein | 96 to 125 | 19.4 to 26.9 | 26.9 | A thorn path before the first pillar (3 hops), and after the second flag a peach bridge under a ceiling-thorn block (walk only) with a flag behind it. |
| 10 | Die Spitze | 24x44 to 24x62 | 17.1 to 24.4 | 27.4 | Two new climbs: crumbly steps and a board above the first boards, and four boards zigzagging above the peach steps (flag on the last board). The three stars are now spread over the whole climb. The lift is unchanged. |

Notes for later work:
- Moving platforms start with phase 0 at level start; the routes wait for them by time. New movers were given phases and waits tuned for the fast route, so the bot is timing-sensitive there (L3, L7, L8, L9); a human just waits for the platform.
- L2, L3 and L4 are around +50 percent, the others between +35 and +45 percent.
- L4: the new flag in front of the second switch lies before the switch pit; the switch state survives a death, but the second switch is next to its flag as before.

## Old levels: what happened to them

| Old # | Name | Verdict | What was wrong / what changed |
|---|---|---|---|
| 1 | Aufwachen | kept, reworked → new 1 | Fine as a first level, but nothing to discover and no "hold to jump higher" moment. Now: step, 2-gap, 2-high ledge, 3-gap, a 3-high pillar (teaches holding), and a hidden meadow left of the start. |
| 2 | Dornenpfad | kept, reworked → new 2 | Good idea. The thorn rows were one long thorn strip with boards above, so there was no build-up. Now thorns come as 1, 2, 3, then a long bed. The first board is placed so you have to jump up through it. The "behind the door" secret was an extra `h` star; now it is one of the three stars. |
| 3 | Schwebend | reworked → new 3 | A star hung above the first moving platform's path. Jumping off a moving platform does not keep its speed, so grabbing that star dropped you into the thorns. That trap is gone. Now: a calm first ride, one higher platform, and twin platforms that move in sync (constant 2-tile gap). The hidden star sits under the start shelf. |
| 4 | Der Schalter | reworked → new 4 | The checkpoint was in front of the second switch, so every respawn walked over the switch and flipped the world again. Switch logic was hard to read. Now: switch on a board, lilac wall, peach bridge, a second switch that brings a lilac step back, then a third that builds peach steps to the door. The flag sits after the second switch. |
| 5 | Bröselig | replaced (split) → new 5 and new 6 | It introduced crumbling blocks and the mushroom in one short level. The 1-wide thorn slots next to the mushroom looked like noise. Crumbles now have their own level (5) and so do mushrooms (6). |
| 6 | Der Schlüssel | replaced → new 7 | Lint errors: thorns buried under the ground (36..38, 12). A star floated behind the lock blocks and the lift was a 2-wide stub. New 7 is built around a real lift to the key, a lock wall, and the first ceiling thorns. |
| 7 | Hin und zurück | kept idea, rebuilt → new 8 | The concept was good (the door is behind you), but you could walk back the way you came, and the key floated in mid-air. Now the low road ends in a 4-tile drop that you cannot climb back up. A mushroom launches you onto a high road, and that road brings you home over a long roof. |
| 8 | Die Spitze | kept idea, rebuilt → new 10 (finale) | The vertical idea is good. Problems: 11 thorns along the bottom next to the start, so long falls ended in death. A star floated in empty air. Switch blocks had no clear purpose. Nothing to discover. Now it is the finale: every mechanic once more, a switch puzzle with a real choice, and a lift that rides past the door. |

New levels: **6 Pilzwiese** (mushrooms on their own) and **9 Querfeldein** (long combination level).

## New levels (play order)

Difficulty is on a 1 to 10 scale for the whole game. World 1 tops out around 7. "Fast" is the clock time of `NN-fast.txt` (clean run, good player). "Full" is the time for all stars.

### 1 Aufwachen: 60×14, difficulty 1, fast 5.7 s (full 11.5 s)
- **Idea:** walk, hop a step, jump 2- and 3-wide gaps, climb a 2-high ledge, and climb a 3-high pillar (needs a held jump; the hint says so).
- **Mechanics:** jumping only.
- **Stars:** one over the 3-gap (a full jump gets it), one on the pillar.
- **Hidden star:** Mimo starts at x 20. Walk LEFT and there is a quiet meadow with a little dip and a hill, and the star sits on the hill. It is 18 tiles from the start, so it is off-screen even on wide phones. The hint ends with "schau dich ruhig um", the only nudge. It teaches the most important habit of the game (look the other way) in the first minute.

### 2 Dornenpfad: 64×14, difficulty 2, fast 9.5 s (full 11.6 s)
- **Idea:** thorns as 1, then 2, then 3. A first board you must jump up through, a flag, a 16-tile thorn bed crossed on three boards, and one last thorn trio.
- **Mechanics:** thorns, boards, checkpoint.
- **Stars:** one on the first board, one high above the middle board (jump straight up from it).
- **Hidden star:** a star sits on the meadow BEHIND the door. Walking into the door ends the level, so you have to *jump over the door*, grab the star, and walk back in. It is in plain sight but needs a silly idea, and it's fair.

### 3 Schwebend: 60×14, difficulty 3, fast 15.6 s (full 28.0 s)
- **Idea:** you start on a shelf. A platform glides out from under your feet: drop on, ride to the flag island. A higher platform follows, then a resting island with a board, then twin platforms moving in sync (fixed 2-tile gap, so jump whenever you like), then the door.
- **Mechanics:** horizontal movers over a thorn pit, boards.
- **Stars:** one above the hop from the second platform to the island, one on the resting board.
- **Hidden star:** it sits UNDER the start shelf, in the nook where the first platform turns around. You see it from the start and wonder how to get under your own feet. The answer is to stay on the platform and ride it back "the wrong way". You can also step off onto the little nook floor; if you mistime the return you fall into the thorns, but only back to the start.

### 4 Der Schalter: 58×14, difficulty 3, fast 8.7 s (full 14.0 s)
- **Idea:**
  1. The switch is on a board, so walking back underneath does not press it again. Pressing it opens a lilac wall and builds a peach bridge.
  2. A second switch brings a lilac step back, which you need to climb a high wall. Star above the wall.
  3. A lilac bridge, then a third switch builds peach steps up to the door ledge, plus a peach perch with a star.
- **Mechanics:** switch, lilac/peach blocks, thorn pits, board.
- **Hidden star:** Mimo *starts on a lilac lid*. The first switch makes the lid vanish, and a cellar with a star opens under the start. You see the hole appear behind you while standing on the switch board. Walk back, drop in, jump out (3 up). The joke: "the floor you woke up on was a switch block all along". If you die before the flag, you respawn above the open lid and simply drop into the cellar.

### 5 Bröselig: 56×16, difficulty 4, fast 8.2 s (full 9.7 s)
- **Idea:**
  1. A crumbly bridge over a shallow, harmless dip: you learn it breaks.
  2. Crumbly steps over safe ground with a star on top.
  3. A crumbly patch in the floor.
  4. A drop to the lower meadow.
  5. Crumbly stepping stones over a thorn pit, with a star in the arc.
- **Mechanics:** crumbling blocks, a board, thorns.
- **Hidden star:** there is a closed cave under the floor and a star inside. Run across the crumbly patch and nothing happens. *Stand still on it* (dawdle) and Mimo falls through the floor into the cave. The way out is a board in the cave roof (jump up through it). Its thin brown line in the ground is the visual hint that the floor is hollow. It rewards exactly what the hint warns against ("nicht trödeln").

### 6 Pilzwiese: 60×16, difficulty 4, fast 9.4 s (full 13.2 s)
- **Idea:**
  1. A first mushroom in front of a 6-high wall (star in the bounce path).
  2. A tunnel with a mushroom pit right behind it that throws you up to a high ledge (flag).
  3. A thorn field crossed on two double-mushroom pillars, placed so that "hold right" is the right thing to do.
- **Mechanics:** mushrooms, air steering, thorns.
- **Hidden star:** the pit mushroom is meant to throw you RIGHT onto the ledge. Steer LEFT instead and you land on the roof of the tunnel you just walked through. The star waits at its far end.
- **Secret star (`h`, the only one in world 1):** on that roof, jump once more and there is a pink star in the sky. It's a double reward for the one curious move.

### 7 Der Schlüssel: 56×16, difficulty 5, fast 15.3 s (full 34.1 s)
- **Idea:** first ceiling thorns over a small bump (hop is fine; only a fully held jump hits them, tested at 0.45 s hold). Then a lift (vertical mover, flush with the ground) up to the key ledge, down past the flag, over a hill on a board, through the opened lock wall to the door.
- **Mechanics:** key, lock blocks, vertical mover, ceiling thorns, board.
- **Stars:**
  - one above the top of the lift (jump at the top, the lift waits there);
  - one on top of the thorn cloud (jump left from the top of the lift).
- **Hidden star:** at the foot of the hill there is a low tunnel whose ceiling is one row of thorns, a scary "thorn mouth". It *looks* like a trap, but walking is perfectly safe (only jumping hurts, as the hint says). The star lies at the end of the mouth.

### 8 Hin und zurück: 70×20, difficulty 5, fast 27.4 s (full 27.4 s)
- **Idea:** the door is right behind you and still locked.
  - **Low road out:** a thorn pit (with a star in the jump arc), a crumbly bridge, flag, a moving platform, then a 4-tile drop that cannot be climbed back. After that come a corridor under low ceiling thorns, the key, and a mushroom.
  - **High road home:** flag, a board, two crumbly stones (star in the arc), a resting block, a moving platform, a long board, and a long roof with two thorns. You drop down next to the door.
- **Mechanics:** key, door, thorns, crumbles, two movers, ceiling thorns, mushroom, boards.
- **Hidden star:** it sits behind the door, against the left wall, right at the start. A locked door does not end the level, so *while it is still locked you can walk straight past it*. Later, with the key, the same move would end the level. It is cheeky and logical ("get it now while the door is shut"), and it plays on the level 2 joke.
- **Timing:** both routes take 27.4 s because the two platforms set the pace; the detour to the hidden star fits into the first wait. The fast route therefore equals the full route.

### 9 Querfeldein: 96×16, difficulty 6, fast 19.4 s (full 20.1 s)
- **Idea:** the long "everything you know" level.
  1. A pit, then a moving platform over thorns.
  2. A switch (flag right AFTER it), a lilac wall and a peach bridge with a star above it.
  3. A low ceiling-thorn passage (just walk).
  4. A deep shaft, then the second flag.
  5. Crumbly steps over thorns with a star in the arc, a high block, a moving platform, the door plateau.
- **Mechanics:** all world-1 mechanics except key/lock.
- **Hidden star:** one gap on the way is a narrow, deep shaft. Every other pit has thorns at the bottom. This one is dark and deep, but at the bottom of the screen you can just see two mushrooms. Jump in and the trampoline throws you right back out, catching a star on the way down. It looks like the scariest hole in the level and it is the safest.

### 10 Die Spitze: 24×44 (vertical), difficulty 7, fast 17.1 s (full 27.4 s), finale before the boss
- **Idea:** a climb from the meadow floor to a door at the top.
  1. Three boards over floor thorns.
  2. A shelf with ceiling thorns underneath (don't jump right below it).
  3. Two crumbly steps, then the flag shelf.
  4. A switch puzzle: a lilac shelf with a star sits above the switch, so grab the star first, then drop onto the switch to build peach steps.
  5. Peach steps, a shelf with a mushroom and thorns behind it (don't overshoot), and the mushroom throws you to the lift shelf.
  6. The lift up to the door ledge.
- **Detour:** dropping off the right end of the first boards leads to a mushroom on a stone. It has a star in its bounce and bounces you back onto the boards, so you can never get stuck down there.
- **Mechanics:** everything except key/lock: boards, floor and ceiling thorns, crumbles, switch blocks, mushrooms, vertical mover, checkpoint.
- **Hidden star:** the door has a little roof, and the star sits on it. You can't jump there from the door ledge (4 up). You have to *ride the lift one floor too far*: stay on past your stop to the top, then hop over onto the roof. You can see it while standing at the door, so it's a last "huh, how?" before the boss.

## Difficulty curve

```
level   1  2  3  4  5  6  7  8  9  10
diff    1  2  3  3  4  4  5  5  6  7
fast s  8 14 24 13 12 14 22 39 27  24   (vertical, after the release extension)
```

- **One new idea per level, taught safely:**
  - L2: one thorn before the bed;
  - L3: a slow first ride;
  - L4: the switch with no danger nearby;
  - L5: a crumbly bridge over a harmless dip;
  - L6: a mushroom in front of a wall;
  - L7: ceiling thorns that only a full jump reaches.
- **Then combined:** L8 (key + crumbles + movers + mushroom), L9 (long, almost everything), L10 (vertical, everything).
- **Lengths:**
  - short: 1, 4, 5 (under 10 s fast);
  - medium: 2, 3, 6, 7;
  - long: 8 and 9;
  - vertical: 10.
- **Fairness for phones:**
  - No frame-perfect input anywhere.
  - Tightest moments:
    - the twin-platform jump in L3 (full jump, any time);
    - the crumbly stones in L8 (two quick hops within 0.55 s each);
    - the mushroom-to-shelf steer in L10 (about 3 tiles of steering during a 1 s bounce).
  - Every softlock I could think of is covered: cellar and cave have exits, the mushroom on the stone in L10 always brings you back, and flags sit after switches.

## Design rules I followed (useful for the next worlds)

- **Switch state and the key survive a death; crumbles do not.** Put a flag *after* a switch, never just before it. Otherwise every respawn walks over the switch and flips the world (old L4 had this).
- **Jumping off a moving platform does not keep the platform's speed.** Never place a star straight above a moving platform's path (old L3 did). Stars over movers belong above the turning points or in the arc of a hop to solid ground.
- **A vertical mover must rest flush with the ground,** with a 1-deep slot under it. If it rests one tile up, Mimo walks under it and never gets carried.
- **A mushroom only fires when you land on it.** Walking onto one does nothing, so put mushrooms where you naturally fall onto them (pit, below a ledge) or teach the hop first.
- **Thorns in pits:** I drew a thorn row along the bottom of every pit and turned any thorn that ended up under ground back into ground (the lint is clean).

## Proposals (not implemented)

1. **Fake wall / passable bush tile:** a block that looks solid but can be walked through. It would allow real hidden rooms, for example "walk into the wall at the start", without the cave having to be visible.
2. **Touch "down":** boards can only be dropped through with the Down key. No world-1 level needs it, but a swipe-down on touch would let later worlds use drop-through puzzles.
3. **Small signs:** a decoration tile with a one-line speech bubble (for example "Bitte nicht trödeln" next to the crumbly floor in L5, or "Nur für Lift-Fahrgäste" on the door roof in L10). The jokes are already in the layouts; a sign would make them land for kids who don't read the level.
4. **Optional (code):** crumbling blocks come back after 2.5 s without checking whether Mimo is standing in that tile. None of my layouts can trigger this (the cave in L5 has its own board exit and the hole is three tiles wide), but a later level could.

## Levelbot results (all 20 routes, `--from tools/levels/world1.mjs`)

```
01-full (Aufwachen): WON  clock 11.46 s · deaths 0 · stars 3/3 · secret none
01-fast (Aufwachen): WON  clock 5.74 s · deaths 0 · stars 2/3 · secret none
02-full (Dornenpfad): WON  clock 11.59 s · deaths 0 · stars 3/3 · secret none
02-fast (Dornenpfad): WON  clock 9.46 s · deaths 0 · stars 1/3 · secret none
03-full (Schwebend): WON  clock 27.98 s · deaths 0 · stars 3/3 · secret none
03-fast (Schwebend): WON  clock 15.57 s · deaths 0 · stars 1/3 · secret none
04-full (Der Schalter): WON  clock 13.97 s · deaths 0 · stars 3/3 · secret none
04-fast (Der Schalter): WON  clock 8.69 s · deaths 0 · stars 0/3 · secret none
05-full (Bröselig): WON  clock 9.65 s · deaths 0 · stars 3/3 · secret none
05-fast (Bröselig): WON  clock 8.16 s · deaths 0 · stars 1/3 · secret none
06-full (Pilzwiese): WON  clock 13.19 s · deaths 0 · stars 3/3 · secret got
06-fast (Pilzwiese): WON  clock 9.41 s · deaths 0 · stars 2/3 · secret missed
07-full (Der Schlüssel): WON  clock 34.12 s · deaths 0 · stars 3/3 · secret none
07-fast (Der Schlüssel): WON  clock 15.34 s · deaths 0 · stars 0/3 · secret none
08-full (Hin und zurück): WON  clock 27.37 s · deaths 0 · stars 3/3 · secret none
08-fast (Hin und zurück): WON  clock 27.37 s · deaths 0 · stars 3/3 · secret none
09-full (Querfeldein): WON  clock 20.07 s · deaths 0 · stars 3/3 · secret none
09-fast (Querfeldein): WON  clock 19.43 s · deaths 0 · stars 1/3 · secret none
10-full (Die Spitze): WON  clock 27.38 s · deaths 0 · stars 3/3 · secret none
10-fast (Die Spitze): WON  clock 17.12 s · deaths 0 · stars 0/3 · secret none
```

`node tools/levellint.mjs --from tools/levels/world1.mjs` → all 10 ✓, "keine Auffälligkeiten", exit 0.

**Notes for integration:**
- **Medal times:** `MEDALS` is indexed by level slot, so the world-1 entries (and every later index) shift when world 1 grows from 8 to 10 levels. The fast times above are a good gold reference, with silver and bronze set generously, especially for 3, 7 and 8 where platforms set the pace.
- **Hidden-star count:** world 1 now has one `h` (Pilzwiese) instead of two, which lowers `hiddenTotal()` by one.
