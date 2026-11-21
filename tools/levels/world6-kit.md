# World 6 "Mond": kit for level builders

Everything a level of world 6 can use, with numbers **measured in the game** by `node tools/moon-test.mjs --table`
(deterministic, the same on every run). If you change a number in `src/worlds/moon*.js`, run that command and update
the table below. `node tools/moon-test.mjs --shots dir` takes pictures of every element (day, dark mode, night).

Code: `src/worlds/moon.js` (low gravity, moon bases, dust, lines at places), `moon-things.js` (small moons, meteors,
floating stones and comets, shooting stars: rules and timing), `moon-things-draw.js` (their pictures), `moon-look.js`
(palette, background, tiles, thorns, helmet, darkness), `moon-decor.js` (set pieces), `moon-levels.js` (levels, song).
The 13 levels of the world are in `moon-levels.js` (drafts in `tools/levels/draft6/`, routes in
`tools/levels/routes/world6/`, reports there as `report-a/b/c.md`). `firstLevel: 55` (after the 13 levels of world 5);
`draft: true` is gone, the registry checks the index strictly.

The feel: "weit, langsam, präzise". Jumps are big and slow, the air is long, the hard part is landing where you meant.
The moon jump is the core: every level should ask for its height or its width at least once, and should let the player
enjoy it (long arcs over wide pits, stars high up).

## Map characters

World 6 has its own characters; the characters of the game keep their meaning (boards, switches, crumbles, key and lock,
flags, timed thorns, snails, wind, updraft, mushroom all work and all of them fly higher on the moon).

| Char | What | Notes |
|---|---|---|
| `#` | moon dust ground | pale lavender with dimples on its top |
| `B` | moon base hull | solid white metal panels; build a base from it (roof, walls, floor) and give its inside as a level field `bases` |
| `K` | cheese | solid; the "Käsekeller" ground |
| `O` | small moon | the centre of the moon (the empty cell); its orbit is drawn around it. Not solid |
| `M` | meteor | in the empty cell on top of the ground: the spot where it lands (it finds the ground below the cell) |
| `=` | floating stone | a run of `==` is one stone (n × 32 − 4 px wide), its top at the top of its row; also the comet |
| `Z` | shooting star | ice blue, floats in its cell; touching it throws Mimo up |
| `^` `v` | moon crystal spikes | the thorns of the game, dark violet glass with a pink rim |
| `R` `Y` | moon rocks, moon crystals | decoration only, no collision, low; stand them on the ground |

Rule of the look: gold only for stars to collect, pink for danger (thorns' rim, the meteor warning), ice blue for the
shooting stars, white for the orbits. Decoration is low and has no flat top.

## Level fields

| Field | Meaning |
|---|---|
| `bases: [{ x, y, w, h }]` | Moon base rectangles in tiles. While Mimo's centre is inside one, the normal rules of the game apply (Earth jump), his helmet comes off and he says a line the first time. Its empty tiles get a back wall with round windows and lamps; the open tiles of its leftmost and rightmost column get airlock frames. Build the hull with `B`. |
| `moons: [{ x, y, r, period, dir, launch, size, line }]` | The small moon `O` at x, y: orbit radius `r` tiles (default 2.5), one turn in `period` s (default 2.4), `dir` 1 clockwise (default, the top moves right) or −1, fling speed `launch` px/s (default 700), ball radius `size` px (default 22), `line` what Mimo says when it catches him. |
| `meteors: [{ x, y, every, offset, warn, from }]` | The meteor `M` at x, y: one every `every` s (default 3.2, at least warn + 0.4), impacts at `offset` + k × every (nothing lands in the first 1.6 s of a level), the ring warns `warn` s ahead (default 1.3), `from` 1 falls in from the upper right (default) or −1 from the upper left. |
| `stones: [{ x, y, dx, dy, period, offset, bob }]` | The stone whose first `=` is at x, y: drifts `dx`/`dy` tiles to each side and back in `period` s (default 6), `bob` tiles up and down (default 0.12). |
| `stones: [{ x, y, comet: true, dx, dy, speed, hold, wait, offset }]` | A comet: appears at its start and waits `hold` s (default 1.2, time to step on), flies `dx`/`dy` tiles at `speed` tiles/s (default 3), fades the last 0.5 s and dissolves at the end (whoever is still on it falls), is gone `wait` s (default 1.5), then comes again. Cycle = hold + way / speed + wait. |
| `boosts: [{ x, y, v }]` | The shooting star `Z` at x, y: throw speed `v` px/s (default 620). |
| `gravity: k` | Scales the moon gravity of the whole level (default 1). 0.6 is almost weightless (for "Schwerelos"). Bases keep Earth gravity. |
| `dark: { r, a }` | The dark side: darkness over the level, Mimo's own light `r` tiles (default 6), darkness `a` (default 0.86). Meteor warnings, rocks, shooting stars, small moons, the door and flags shine through; stars glint now and then. No sun in the sky. |
| `lamps: [{ x, y, r }]` | Lights in the darkness, radius `r` tiles (default 3). |
| `says: [{ x, y, r, text }]` | Mimo says `text` once per level start when his centre comes within `r` tiles (default 2) of tile x, y. |
| `decor: [{ k, x, y, ... }]` | Set pieces (looks only), all kinds in the table "Decor kinds" below. |

## Decor kinds (`decor: [{ k, x, y, ... }]`, looks only, `src/worlds/moon-decor.js`)

All positions in tiles. Everything is drawn in soft muted colours with no flat top, so nothing reads as a platform.
Back pieces are drawn behind the tiles, `tracks` between, `fridge` and `pits` over the tiles (under Mimo).

| `k` | Fields | What | Levels |
|---|---|---|---|
| `flag` | `x, y` | Mimo's blue flag with a pale star, planted in the dust; x, y = the empty ground tile | 1, 13 |
| `rocket` | `x, y, s` | small pastel rocket on its fins, about 2 × 4 tiles, window glows; x, y = the ground tile under its middle, `s` scale (default 1) | 8, 9 |
| `dish` | `x, y, dir` | dish antenna on a mast that turns slowly; `dir` 1 looks right (default), −1 left | 4, 8, 9 |
| `tracks` | `x, y, w` | footprints along `w` tiles of ground; y = the empty row above the ground | 1, 2, 3, 4, 8, 9, 10, 13 |
| `buggy` | `x, y` | old moon buggy with one wheel lost, a seat and a tilted antenna, about 3.5 × 2 tiles; x = the tile under its middle, y = the empty row above the ground | 2 |
| `bite` | `x, y, s` | nibble marks of the moon worm on the face of a solid ground tile (x, y = that tile), round bite with tooth scallops and crumbs below; `s` size (default 1); foreshadows Käsebert | 1, 2, 3, 4, 12, 13 |
| `lamp` | `x, y, h` | thin lamp post on the dust (x, y = the empty ground tile), `h` tiles high (default 2), its round head glows; put a level field `lamps` entry at its head (x, y + 1 − h) so the light comes from it | 7 |
| `part` | `x, y, kind, r` | rocket part lying in the dust (x, y = the empty ground tile): `kind` `'fin'`, `'cone'` or `'tank'`, `r` a small tilt in radians | 9 |
| `fridge` | `x, y, w, h` | door of a fridge drawn over a block of cheese `K` (tiles): rim, seam, handle, frosty corner | 8 |
| `pits` | `x, y, w, h` | old impact dimples and dark cracks over a block of moon rock (tiles), so a heap of blocks reads as one old meteor | 5 |
| `cave` | `x, y, w, h` | back wall of a cheese cellar behind the empty tiles (muted cheese with dark round holes), so a cellar does not show the sky | 12 |
| `tunnel` | `x, y, r` | mouth of Käsebert's round tunnel in the back (x, y = its centre tile, `r` tiles): deep dark hole, nibbled rim, crumbs; never the worm | 12, 13 |
| `crumbs` | `x, y, w` | cheese crumbs along `w` tiles of ground (y = the empty row above it) | 12, 13 |
| `earthrise` | `x0, x1, s, fx` | the Earth is down behind the horizon until Mimo passes column `x0`, then rises behind the terrain while he walks on to `x1`, up into the sky at `fx` of the screen width, `s` times its size; never sinks again in one try (sets `L.moon.earth`, the hook the boss uses) | 13 |

Example: `{ k: 'earthrise', x0: 104, x1: 164, s: 1.6, fx: 0.62 }`.

Example:

```js
{ name: 'Umlaufbahn', medals: [20, 30, 46],
  moons: [{ x: 36, y: 9, period: 3 }], meteors: [{ x: 15, y: 13, offset: 1.07 }],
  hint: 'Kleine <b>Monde</b> fangen dich ein. Springen schleudert dich weiter.', map: [ ... ] }
```

## Measured limits

All heights are Mimo's feet, in tiles (32 px). Times in seconds from the level start (the game clock).

| What | Measured | Notes |
|---|---|---|
| Moon jump (held) | 5.2 tiles high, 1.19 s in the air | Earth (in a base): 3.63 tiles, 0.68 s |
| Running jump (held) | lands 7.82 tiles further | Earth: 4.48 tiles; walking speed 6.6 tiles/s in both |
| Short tap | 1.79 tiles high | Earth: 1.5 tiles; release early to keep it low |
| Gap (running jump, same height) | 6: yes · 7: no · 8: no | from a run-up, jump at the edge |
| Ledge (running jump from below) | 4 higher: yes · 5 higher: yes · 6 higher: no | jump held |
| Falling | top speed 600 px/s (18.8 tiles/s) | Earth 850 px/s |
| Level field gravity: 0.6 | 8.68 tiles high, 2 s, running jump 13.13 tiles | for "Schwerelos"; 1 is the default |
| Moon base (level field bases) | Earth jump 3.63 tiles inside, 5.2 outside | counts by Mimo's centre; the helmet comes off inside |
| Small moon (O) | orbit 2.5 tiles, one turn 2.4 s (6.54 tiles/s), fling 700 px/s | caught within 10 px outside the orbit while in the air; the ring shows the way it turns |
| Fling at the top (90°) | 0 tiles up from the release, lands 11.65 tiles to the side after 0.69 s | stick held the way he flies; the dotted preview shows the way |
| Fling left (180°) / right (0°) / bottom (270°) | side −8.02 / 1.51 / −4.96 tiles | up 5.26 / 0 / 0 |
| Fling table (stick held the way he flies) | 0°: peak −0.88, lands 2.5 · 30°: peak 0.39, lands 5.3 · 60°: peak 1.48, lands 8.49 · 90°: peak 2.08, lands 11.53 · 120°: peak 3.03, lands 10.35 · 150°: peak 4.72, lands 6.69 · 180°: peak 4.83, back into the orbit · 210°: peak 2.34, lands −10.12 · 240°: peak −1.18, lands −11.24 · 270°: peak −2.91, lands −8.07 · 300°: peak −2.84, lands −3.06 · 330°: peak −2.11, lands −0.22 | clockwise moon; tiles: peak above the moon centre, landing x from the moon centre, ground 6.5 tiles under the centre; a counter-clockwise moon is the mirror |
| Release window, pit | 10-tile pit, the moon over its left edge, land beyond it: 0.39 s (70° to 126°) | a moon of 2.4 s per turn turns 150° per s |
| Release window, ledge | 4-tile ledge 6.5 to 10.5 tiles right of the moon centre, 2.5 rows under it: 0.45 s with steering (70° to 136°) | small targets want a big moon or a slow one |
| Release window, next moon | moon 9 tiles further right at the same height: 0.41 s (76° to 136°) | caught by the next orbit, stick held the way he flies |
| Meteor (M) | every 3.2 s, first impact at 3.21 s; ring 1.3 s ahead, rock in the air 0.5 s | hurts within 30 px of the spot for 0.12 s; safe from 1.5 tiles beside it (1 tile: not safe) |
| Floating stone (=) | bobs 0.24 tiles, drifts 2 × dx tiles (dx 3: 6) | a run of n "=" is n × 32 − 4 px wide, its top at the top of its row; dips 4 px under Mimo |
| Comet (stone with comet: true) | waits 1.2 s at its start (time to step on), flies 20 tiles at 4 tiles/s: gone after 6.2 s | fades the last 0.5 s; starts again after wait s; whoever is on it at the end falls |
| Shooting star (Z) | throws Mimo 3.98 tiles up from standing, a jump into one reaches 7.54 tiles | back after 2.4 s; touch it anywhere (box within 16 px of its centre) |

### Measured in the levels (from the Käsekeller / Erdaufgang work)

- A shooting star touched while a held jump still rises faster than 620 px/s adds nothing: a star 4 rows above the feet
  gives 6.35 tiles in all (not 7.54), 3 rows above gives no gain. Put the star where the jump has slowed down or touch
  it from the ground.
- With the level field `gravity: 0.6` a shooting star adds no height.
- Holding the stick on a moving comet walks Mimo relative to it, so a rider steers along the comet.

## Safe rules, worked out

- **Moon jump distances.** Plan gaps of up to 5 tiles for comfort, 6 as the hard maximum (7 fails). Ledges up to 4
  above are easy, 5 is a full held jump, 6 needs a shooting star, a stone or a moon. The air time (1.2 s) is long:
  keep the landing in view (half a screen is 13 tiles, the arc is 8).
- **Ceilings cut the moon jump.** Under a low ceiling (a cave, a cheese cellar) the jump bumps and drops short. Give
  at least 6 free rows above a jump that has to go far, or build low rooms for short hops only (a tap is 1.8 tiles).
- **Bases.** Inside, Mimo is an Earth Mimo again (3.6 tiles, 4.5 wide). A base is the place for classic precise
  platforming and for "you cannot jump that high in here" puzzles. Keep at least 4 free rows inside.
- **Small moons.** Mimo is caught only in the air, never while walking under a moon. The moon turns him at a steady
  speed and shows where he would fly (white dots); the jump press flings him along the orbit at 700 px/s. Releases are
  generous: about 0.4 s for a wide target, a next moon or a 4-tile ledge. Flung straight up (from the side where the
  orbit rises) he falls back into the same orbit and is caught again: that is safe, not a trap. Keep orbits free of
  walls (a wall stops him and the moon lets go). Next moon 9 tiles away at the same height is a clean chain.
- **Meteors.** The ring shows the exact danger area (30 px around the spot) 1.3 s ahead; the ring closes in until the
  impact. Standing 1.5 tiles beside the spot is always safe. The danger itself lasts only the last moments of the
  fall and 0.12 s after the impact, so walking past a ring is fine unless the player stops on it. Stagger several
  meteors with offsets (every / n) to make a rhythm. A falling rock also hurts in the air, so do not put a meteor
  path through the place where a jump peaks unless that is the point (the path is dotted pink while it warns).
- **Floating stones.** They carry from above only. A drifting stone is safe to wait on. Jumping off a moving stone or
  comet does not keep its speed (as with lifts): hold the stick the way it moves.
- **Comets.** Put a ledge right next to the comet's start (it waits 1.2 s there) and solid ground under its end
  (the playground's comet ends 1 tile over the ground). The comet fades in its last 0.5 s.
- **Shooting stars.** One from the ground: +4 tiles. A jump into one: 7.5 tiles in all. Two in a row (4 tiles apart
  up and 2 to the side) lift Mimo about 8 tiles (playground 1). It comes back after 2.4 s, so a fall is not a dead end.
- **Darkness.** Mimo's light is 6 tiles; a moon jump lands 8 tiles away, so put a lamp, a glowing thing or a flag
  near every landing that the player cannot see. Hazards that act on their own (meteors) shine through; thorns do not,
  so thorns in the dark belong close to light.

## Rules worth knowing

- **Bodies.** Stones and comets are bodies (`api.L.bodies`): they carry from above and do not block from the side.
  The bot condition `body` is true while Mimo stands on one.
- **Orbit and the core.** While a moon holds Mimo the world sets his speed each step so he follows the orbit exactly;
  gravity is off. Landing on something or being blocked lets him go.
- **Fling control.** After a fling the speed carries (air control 480 px/s² while he is faster than running speed),
  pushing the stick against the flight brakes like on Earth (1600). No moon float after a fling, so the dotted preview
  is exact for a player who holds the stick the way he flies.
- **The moon float.** Near the top of a held jump (vertical speed under 150 px/s) the pull halves. Mushrooms, stomps and
  the jump all use the game's own speeds, so they all scale the same way (about 1.4 times higher).
- **Helmet.** Mimo wears a glass helmet outside the bases (it fades out inside and back on outside). It is drawn over
  any hat, and it makes him easy to find against the dark sky.

## Level bot (tools/levelbot.mjs)

New for this world: the conditions `orbit` (a small moon holds Mimo) and `ang>=n` / `ang<=n` (where on the orbit, in
degrees: 0 right, 90 top, 180 left, 270 bottom). Proven idioms from the playground routes:

```
R until x>=23.4; RJ until orbit max 1.5                 # run and jump into the orbit of a moon
W until ang>=112 and ang<=118 max 3; J 0.05             # wait for the angle, a short press flings
R until orbit max 2                                     # fly into the next orbit, stick held the way he flies
W until ang>=96 and ang<=102 max 3; J 0.05; R until grounded max 3   # fling onto the far side
W until time>=7.8 max 8; R until body max 1; R 0.3       # wait for the comet at its start, step on, go to its middle
W until x>=81 max 6; R until x>=85 max 2                 # ride, step off over the ground before it fades
R until x>=74.6; W 0.05; R until grounded max 3          # walk into a shooting star, keep right through the second
```

Mind: walking off a ledge onto a moving body only works while the body is still beside the ledge (use the comet's
waiting time). A `;` always splits a route line, also inside a comment.

## For the boss (Mondwurm Käsebert)

`MimoMoon.GRAV` (the moon gravity numbers), `MimoMoon.gravityAt(x, y)`, `MimoMoon.risingGravity()`,
`MimoMoon.state(L)` (the per level state: `moons`, `meteors`, `stones`, `boosts`, `orbit`, `craters`, `bases`),
`MimoMoon.meteorAt(me, time)`, `MimoMoon.stoneAt(st, time)`, `MimoMoon.orbitPoint`, `MimoMoon.toDeg`, and the glow and
gradient helpers `glow`, `linear`, `rgba` from moon-look.js. The mockup's arc of the worm wants the high moon jump
(5.2 tiles) to reach the pink segment.
