# World 2 "Abendwald": level rework report

Deliverables: `tools/levels/world2.mjs` (10 main levels in play order, then the night level),
routes in `tools/levels/routes/world2/` (`NN-full.txt` all stars, `NN-fast.txt` fastest clean way to the door).
Lint: `node tools/levellint.mjs --from tools/levels/world2.mjs` gives no findings (exit 0).
No secret bonus star (`h`) is used in world 2. Every level has exactly 3 stars, and one of them is the hidden one.

## Old levels: verdicts

| Old level | Verdict | What was wrong |
|---|---|---|
| Abendwind | reworked (keeps name and slot 1) | Floating flag at 16,8. Flat and very short. The wind was never shown on safe ground first. All stars sat on the obvious jump arcs. |
| Aufwind | reworked (keeps name and slot 2) | The concept was fine, but the "secret" star sat right at the top of the second updraft, so you collected it just by riding it. The 3-wide thorn pit had no purpose because the updraft stood on solid ground next to it. The updraft never caught you over a pit. |
| Glitschig | replaced (same name and theme, new layout) | Flat. Ice never forced you to brake or turn, and the single thorn could simply be jumped over. Two stars floated over flat ground and were trivial. |
| Im Takt | replaced (same name and theme, new layout) | Every timed-thorn run stood in open air and could be jumped over, so the timing mechanic was never needed. Stars sat 2 tiles above flat ground. Two flags in a short, flat level. |
| Schnecken | replaced by "Schneckenpost" | Snails stood on flat ground between 1-high blocks. Jumping on a snail was never useful, and the high star could be reached with a normal jump. |
| Glühwürmchen | replaced by "Gegenwind" | The name promised fireflies, but the level was wind, boards and an updraft (fireflies only exist in the night level). Floating flag at 30,8. One big tailwind field over a 19-wide pit did all the work. |
| Rutschpartie | replaced (same name, new layout) | The timed thorns stood on solid ground and could be jumped over. Stars floated over flat ground. Ice made no real difference. |
| Waldrand | replaced (same name, still the finale) | Only 44 tiles, short for a finale. Most mechanics appeared once and lightly. The secret star at the far right under the door ledge was simply a walk. |
| Nachtpfad (night) | reworked (stays the single night level) | Flat. Three identical firefly bridges, with stars hovering over the pits within normal jump reach. |

New slots: "Baumkrone" (vertical) and "Nebelbrücke" (movers, key and lift) bring world 2 to 10 main levels.

## New levels in play order

Difficulty is on a 1 to 10 scale for the whole game. World 1 ends at about 4. Clock times are the level clock of the `NN-fast` route (levelbot).

### 1 Abendwind (36×14, short), wind, difficulty 3, fast 3.65 s
- Idea: a gust over solid ground first (you feel the push, nothing can go wrong), then two gaps of 5 and 6 tiles. They are impossible without wind and easy with it.
- Hidden star: down in the first "thorn pit". The pit has thorns only on its left side. The right half is a safe hollow that runs under the landing ledge, and the star sits in it. It looks like a trap and is a little picnic spot, and you climb out with one normal jump.

### 2 Aufwind (46×18, medium, a bit tall), updrafts, difficulty 3, fast 9.6 s
- Idea: the first updraft lifts you onto a 4-high stump that you cannot jump (completely safe). Then two updrafts reach down into a thorn pit and catch you, with a board between them. Then a tall updraft takes you to the high door ledge.
- Hidden star: the last updraft does not stop at the door ledge. It keeps going up out of the screen. If you stay in it and do nothing, it carries you to a little branch high in the treetop with the star. "What happens if I just keep floating?"

### 3 Glitschig (52×14, medium), ice, difficulty 3.5, fast 10.59 s
- Idea: you have to start running early on the ice runway before the first gap. Then comes a zig-zag of three ice ledges up to a high rock. You must brake on ice and turn around, which is the real ice skill, and falling only drops you back to the ground.
- Hidden star: a mouse hole at the foot of the big rock. Mimo is small enough to walk in, and the star waits in a little chamber inside the rock.

### 4 Im Takt (52×14, medium), timed thorns, difficulty 4, fast 8.89 s
- Idea: timed thorns inside hollow logs, where you cannot jump over them, so you have to wait for the beat. The second log has three alternating runs (step, wait, step). At the end, thorns on top of pillars over a pit: land when they are down.
- Hidden star: the first log has a hole in its underside right above the thorn bed. Stand in the thorn bed while the thorns are down, jump up through the hole, and the star waits in the hollow log. To get out you have to watch the beat again, because you drop straight back into the thorn bed.

### 5 Schneckenpost (58×14, medium), snails, difficulty 4.5, fast 7.57 s
- Idea: first a snail in a shallow dip (jump over it or on it, close to the start). Then thorn pits with single posts, each with a snail sitting on top: land on the snail and it bounces you on. Last, a snail patrols a board.
- Hidden star: behind the door stands a tall pole with a snail sitting on top, and a star lies on a high branch. From the high board you jump onto the pole snail, and it is the trampoline to the branch ("Schneckentrampolin"). A step behind the pole means you can never get stuck back there.

### 6 Gegenwind (58×16, medium), wind from the front plus updraft, difficulty 5, fast 8.24 s
- Idea: headwind over solid ground (slow walking, short jumps, climb a block in it). Then a tailwind gap with headwind right at the landing, so if you stand still the wind pushes you back towards the pit. Then an updraft to a tower and a tailwind gap to the door.
- Hidden star: the wind at the start blows backwards. Jump into it and let it carry you back over a little thorn pit to a hollow tree stump behind the start. Drop into the stump's hole and you grab the star on the way down. A tunnel leads under the pit to an updraft that pops you up next to the start. A small "wind carousel".

### 7 Rutschpartie (60×14, medium), ice + timed thorns + snail + crumbles, difficulty 5.5, fast 9.83 s
- Idea: timed thorns on ice, so you must start moving early because Mimo speeds up slowly. Then a snail patrols an ice floor (stomp it while sliding). Then a crumble bridge that ends in a log tunnel with timed thorns; there is a safe spot to wait under the log. Last, an ice ledge with a snail over a pit, then a higher ice ledge.
- Hidden star: an updraft hangs just above the door with a star in it. Jump right at the door instead of walking in, and the "door lift" takes you up to the star. You then come down and walk through the door.

### 8 Baumkrone (24×40, vertical), climb inside a big tree, difficulty 5.5 to 6, fast 15.73 s
- Idea: zig-zag boards with a snail, an updraft to a ledge, a tailwind jump across the trunk, crumble boards, a branch with a flag, then a lift up to the door ledge. A missed jump only drops you to a lower branch, never to death. Thorns are not needed here.
- Hidden star: from the start you can see a star behind a wall in the bottom right corner. The way there starts at the very top. Next to where the lift arrives there is a hole in the treetop. Leap into it, fall down the whole hollow trunk, grab the star at the bottom, then ride a very long updraft back up ("Fahrstuhl"). A leap of faith that is completely safe.

### 9 Nebelbrücke (66×14, long), wind + timed thorns + movers + key/lock + lift, difficulty 6, fast 12.92 s
- Idea: timed thorns in a log with a tailwind blowing into them. If you wait in front of them, the wind slowly pushes you in, so you hold back while waiting. Then two moving platforms over a long thorn ravine that meet once per cycle. Then a key on a high board above a snail, which unlocks a tall lock wall.
- Hidden star: just before the door there is a small lift that sinks into a thorn pit. It looks like it carries you to your doom. It stops just above the thorns, next to a niche in the pit wall that holds the star. Wait in the niche, ride back up, jump to the door.

### 10 Waldrand (86×18, long, finale), everything, difficulty 7, fast 18.59 s, 2 flags
- Idea: an ice tunnel with two alternating timed-thorn runs. You must brake on ice to stop on the safe spot between them. Then updraft, board, tailwind gust, board, updraft over a long thorn pit. Then a jump from a high ledge onto two snail posts. Then a crumble bridge, a rest ledge, a lift up to the high ledge, and timed thorns in front of the door.
- Hidden star: right behind the start an updraft rises into the treetops. Up there the wind blows towards the goal over three branches, and the star waits on the first branch. This canopy path is also a secret shortcut over the whole first section and puts you down at the first flag. The full route that uses it is only 0.5 s slower than the fast route.

### Night: Nachtpfad (58×16, medium), firefly boards, difficulty 4.5, fast 8.81 s
- Idea: a firefly bridge at ground level, then firefly steps up and down over a long thorn pit, then single 2-wide firefly islands. Far fireflies are only faint dots, so you jump into the dark and they light up as you come close.
- Hidden star: a star hangs high in the night sky above the steps with no visible way up. From the highest step, jump towards it into the dark. Invisible fireflies light up and catch you, two steps up to the star ("unsichtbare Treppe").
- Testing: firefly tiles in the game code depend only on Mimo's distance (4.5 tiles), not on the clock. The 21 to 5 o'clock rule only affects the menu. The bot loads the level directly, so the night level is fully testable and both routes pass.

## Difficulty curve

| # | Level | Size | Difficulty | New or combined |
|---|---|---|---|---|
| 1 | Abendwind | 36×14 short | 3 | wind (new) |
| 2 | Aufwind | 46×18 medium | 3 | updraft (new) |
| 3 | Glitschig | 52×14 medium | 3.5 | ice (new) |
| 4 | Im Takt | 52×14 medium | 4 | timed thorns (new) |
| 5 | Schneckenpost | 58×14 medium | 4.5 | snails (new) |
| 6 | Gegenwind | 58×16 medium | 5 | headwind (new variant) + updraft |
| 7 | Rutschpartie | 60×14 medium | 5.5 | ice + timed thorns + snail + crumbles |
| 8 | Baumkrone | 24×40 vertical | 5.5 to 6 | updraft, wind, crumbles, snail, lift |
| 9 | Nebelbrücke | 66×14 long | 6 | wind + timed thorns + movers + key + lift |
| 10 | Waldrand | 86×18 long | 7 | everything, finale |
| night | Nachtpfad | 58×16 medium | 4.5 | fireflies |

The first five levels each teach one mechanic in a safe spot before the same mechanic gets dangerous. From level 6 on, the mechanics are combined. Nothing needs a frame-perfect input. Every timed-thorn spot has a safe place to wait, and the timing windows are about 1.2 s (the thorns are down for half of the 2.4 s cycle). Nothing needs the down key, so all levels are fully playable on touch.

## Route results (levelbot, final run)

```
01-fast (Abendwind): WON  clock 3.65 s · deaths 0 · stars 2/3 · secret none
01-full (Abendwind): WON  clock 5.95 s · deaths 0 · stars 3/3 · secret none
02-fast (Aufwind): WON  clock 9.6 s · deaths 0 · stars 2/3 · secret none
02-full (Aufwind): WON  clock 11.58 s · deaths 0 · stars 3/3 · secret none
03-fast (Glitschig): WON  clock 10.59 s · deaths 0 · stars 2/3 · secret none
03-full (Glitschig): WON  clock 14.1 s · deaths 0 · stars 3/3 · secret none
04-fast (Im Takt): WON  clock 8.89 s · deaths 0 · stars 2/3 · secret none
04-full (Im Takt): WON  clock 11.42 s · deaths 0 · stars 3/3 · secret none
05-fast (Schneckenpost): WON  clock 7.57 s · deaths 0 · stars 2/3 · secret none
05-full (Schneckenpost): WON  clock 9.63 s · deaths 0 · stars 3/3 · secret none
06-fast (Gegenwind): WON  clock 8.24 s · deaths 0 · stars 2/3 · secret none
06-full (Gegenwind): WON  clock 12.71 s · deaths 0 · stars 3/3 · secret none
07-fast (Rutschpartie): WON  clock 9.83 s · deaths 0 · stars 2/3 · secret none
07-full (Rutschpartie): WON  clock 11.95 s · deaths 0 · stars 3/3 · secret none
08-fast (Baumkrone): WON  clock 15.73 s · deaths 0 · stars 2/3 · secret none
08-full (Baumkrone): WON  clock 24.09 s · deaths 0 · stars 3/3 · secret none
09-fast (Nebelbrücke): WON  clock 12.92 s · deaths 0 · stars 2/3 · secret none
09-full (Nebelbrücke): WON  clock 24.17 s · deaths 0 · stars 3/3 · secret none
10-fast (Waldrand): WON  clock 18.59 s · deaths 0 · stars 2/3 · secret none
10-full (Waldrand): WON  clock 19.09 s · deaths 0 · stars 3/3 · secret none
night-fast (Nachtpfad): WON  clock 8.81 s · deaths 0 · stars 1/3 · secret none
night-full (Nachtpfad): WON  clock 10.87 s · deaths 0 · stars 3/3 · secret none
```

## Notes for integration (not done here, src/ is untouched)

- World 2 grows from 8 to 10 main levels, so the indices after it shift. In `BOSSES`, Frau Huhu has `after: 15` (the last old world-2 level). With 8 world-1 levels it must become `after: 17`, and the yeti `after: 21` must become `after: 23`. Adjust both if world 1 or world 3 also change size.
- Saves store stars, best times and ghosts by level index. Existing progress for world 2 and later will point at different levels after the swap.
- The night level must stay the last entry of LEVELS (`LAST_MAIN` is derived from it).

## Mechanic notes and proposals (nothing implemented)

Engine behaviour worth knowing when designing:
- Firefly tiles (`g`) are solid whenever Mimo's centre is within 4.5 tiles. Any tile you can touch is always within that range, so they behave exactly like solid blocks, and the only difference is how they look (faint when far). Snails cannot walk on them.
- An updraft only slows a fall by about 900 px/s². A column catches you when you walk or step into it, but not when you fall into it from 3 or more tiles up (you fall straight through into the thorns). All columns over pits in world 2 therefore start right at the ledge you walk off.
- Snails treat crumble tiles as floor even after they have fallen. No world-2 snail can reach a crumble tile.

Proposals:
1. **Fading fireflies**: firefly boards that dim and give way about 1.5 s after Mimo lands on them, then come back. This would make the night level about rhythm and trust instead of only darkness, and it would give `g` a real difference from `#`.
2. **Pusteblume (dandelion)**: a pickup that lets Mimo glide (slow fall) for a few seconds while jump is held. Long glides with wind would become possible, which the current physics cannot do because wind only pushes sideways while you drop fast.
3. **Wind switch**: a switch that reverses `>` and `<` zones, like the a/b blocks. That would allow wind puzzles (go one way, flip the wind, come back) in a later world.
