# World 4 "Korallenküste": kit for level builders

Everything a level of world 4 can use, with numbers **measured in the game** by `node tools/coast-test.mjs --table`
(deterministic, the same on every run). If you change a number in `src/worlds/coast*.js`, run that command and update
the table below and the element table in `WELTBUCH.md`.

Code: `src/worlds/coast.js` (water, tide, swimming), `coast-look.js` (picture), `coast-things.js` (bubbles, crabs,
pufferfish, gauge), `coast-levels.js` (levels, song). The 13 levels of the world live there
(drafts in `tools/levels/draft4/`, routes in `tools/levels/routes/world4/`); keep `firstLevel: 29`.

## Level fields

| Field | Meaning |
|---|---|
| `water: 8` or `water: { row: 8 }` | The water line is the top edge of that row. Everything below it is water, across the whole level (solid tiles stay solid). Without `water` (and without `tide`) there is no water. |
| `tide: { low, high, period, move, offset }` | The line swings between two rows: hold at `low`, rise for `move` s, hold at `high`, fall for `move` s. Defaults: `period: 12`, `move: 2.2`, `offset: 0` (seconds added to the level clock; the level starts at the beginning of low tide). Put `water` at the same row as `low`. |
| `puffers: [{ x, y, dist, axis, speed, offset, line }]` | Settings for the pufferfish `F` at tile x, y. `line`: what it says when it puffs near Mimo (always, instead of a rare "Pffff."). `dist` tiles (default 3, may be negative), `axis` `'x'` or `'y'`, `speed` tiles/s (default 1.2), `offset` seconds (moves its beat). |
| `crabs: [{ x, y, dir, speed, line }]` | Settings for the crab `K` at x, y: `dir: -1` starts walking left, `speed` in tiles/s (default 2), `line`: what it says when Mimo climbs on (instead of a random crab line). |
| `vents: [{ x, y, every, offset, speed }]` | Settings for the bubble vent `o` at x, y: a bubble every `every` s (default 1.6), first one at `offset` s, `speed` tiles/s (default 5.31). |
| `chase: { speed, water }` | The ink cloud (same field as the avalanche). `water` (px/s) is its speed while Mimo swims; default `speed × 150 / 210`, the same slowdown as Mimo's. |
| `says: [{ x, y, r, text }]` | Mimo says `text` (speech bubble, like his start lines) the first time his centre comes within `r` tiles (default 2) of tile x, y; once per level load (again after a restart, not after a fall). For hidden stars and special spots. |
| `movers` | Lifts work as everywhere, also under water. |
| `wood: [[x, y, w, h], ...]` | Looks only: solid tiles inside these rectangles (tiles) are drawn as ship planks (brown, seams, nails) instead of sand. Used by "Das Wrack". |
| `stone: [[x, y, w, h, 'red'?], ...]` | Looks only: solid tiles inside these rectangles are white-washed masonry (bricks, light top edge); a fifth entry `'red'` paints a pastel red band. Later rectangles win where they overlap. Used by "Leuchtturm". |
| `deep: 0..1` | Looks only: a deeper, darker mood. Water gradient is darker and longer, light rays fade, and the ground under the water turns a cool slate blue (lighter than the water, so it still reads as ground; the dry beach keeps its sand). Used by "Tiefsee" (0.9). |
| `decor: [{ k, x, y, ... }, ...]` | Looks only, no collision, tiles as everywhere. `wall` `{ x, y, w, h, look: 'wood' \| 'stone' }`: the back wall of a room (planks or masonry, darker than the solid tiles, tinted where it is under water), so a hold, a cabin or a tower floor reads as a room and not as sky. `mast` `{ x, y, top, sail?, sw?, stay? }`: a pole from the deck row `y` up to row `top` with stays and a pink pennant; `sail: row` hangs a pale torn sail under that row (put it under a row of boards, the yard). `porthole` `{ x, y }`: a brass round window, drawn over the tiles (use it on wood). `lantern` `{ x, y }`: the light of a lighthouse, a halo and a beam that sweeps round (stronger in dark mode and at night). `tentacle` `{ x, y, dir, s }`: a sleeping octopus arm rising from row `y` and curling to `dir` (1 right, -1 left), size `s`; faint under the water line. `hang` `{ x, y }`: a few strands of seaweed hanging from the underside of the solid tile at x, y (a sand roof); 28 to 56 px long, faint, keep hazards and stars at least one column away. `eye` `{ x, y, s }`: a low pink hump with a closed eye at the water line; it opens a little and follows Mimo when he comes within about 9 tiles. All of it is a few shapes, culled to the camera and driven by the game clock. |

Example:

```js
{ name: 'Ebbe und Flut', medals: [20, 31, 46], water: 11, tide: { low: 11, high: 7, period: 14 },
  puffers: [{ x: 30, y: 9, dist: 4, offset: 1.2 }], crabs: [{ x: 12, y: 8, dir: -1 }], vents: [{ x: 40, y: 12, every: 3 }],
  hint: 'Das Wasser kommt und geht.', map: [ ... ] }
```

## Map characters

The characters of the game keep their meaning; some look different in this world. All of them work under water.

| Char | In world 4 | Notes |
|---|---|---|
| `#` | sand | |
| `^` `v` | urchin on the floor / on the ceiling | dark violet (light lilac in dark mode); same hit box as the thorns of the game |
| `u` | jellyfish | the mushroom of the game; may float in the water (the lint allows it) |
| `>` `<` | current under the water line, wind above it | the same tile can be both when a tide moves |
| `A` | bubble swirl under water, updraft above | |
| `T` | timed urchin spines | the timed thorns of the game, in the urchin colours |
| `o` | bubble vent | stands on the floor; quiet while it is above the water |
| `K` | crab | walks on the ground |
| `F` | pufferfish | its home; it patrols from there |
| `I` | tide gauge | a pole on the ground; marks the high and low line of the level's tide (or the water line) |
| `Y` `C` `W` | palm, coral, seaweed | decoration only, no collision; stand them on the ground (palm on land, coral and seaweed under water) |
| `H` | wooden post | decoration only, no collision: a round pole through the whole tile; stack them under a board or boardwalk (darker at the bottom of a stack) |
| `!` | pennant | decoration only, no collision: a pink pennant on a stick standing on the tile below; for tower tops and the end of a jetty |

Five-line examples (Mimo `P`, water line at row 1 of each snippet where it matters):

Crab ferry over urchins, Piep sends it back:
```
                    
  P  K ^^^^^^   f   
####################
####################
####################
```

A ledge at the water line and one a tile above it (water: row 2), both reachable with a leap:
```
           ###      
 P   ####  ###      
#####       ###  D  
#####           ####
####################
```

Bubble lift (water: row 0) to a ledge 3 tiles above the water line at most:
```
        ######      
        ######      
      o ######      
####################
####################
```

Pufferfish in a tunnel (give it `puffers: [{ x: 6, y: 2, dist: 5 }]`):
```
####################
                    
      F             
   C        W       
####################
```

Tide gauge next to a wall that needs high tide (`water: 4, tide: { low: 4, high: 1 }`):
```
          ###       
          ###       
   P   I  ###    D  
####################
####################
```

## Measured limits

All heights are the feet of Mimo, in tiles (32 px). "Above the water" means above the water line.

| What | Measured | Notes |
|---|---|---|
| Sinking speed | 2 tiles/s | no keys; reached after 0.1 s |
| Rising, jump held | 4.84 tiles/s | steady; eases into floating at the surface |
| One tap (one frame) | 1.25 tiles up | then sinks again; a tenth of a second held: 1.25 tiles |
| Holding the depth | one tap every 1.35 s | after a stroke Mimo glides (sinks only 12 px/s) until 0.75 s after the tap; drift over six taps 0.05 tiles |
| Tapping 4 times a second | 4.53 tiles/s up | quick taps climb almost as fast as holding |
| Swimming sideways | 4.69 tiles/s | land: 6.56 tiles/s |
| Walking on the sea floor | 4.69 tiles/s | same as swimming |
| Land jump (reference) | 3.63 tiles high | running jump lands 4.48 tiles further |
| Diving, down held | 6 tiles/s | full speed after 0.07 s, back to sinking 0.03 s after letting go; 13 tiles take 2.17 s |
| Leap out of the water | 1.7 tiles | feet above the water line at the top; Mimo floats with his feet 0.56 tiles under the line |
| Leap, way above the water | 2.83 tiles (from standstill), 3.06 (swimming at full speed) | sideways way while the feet are above the line, right held |
| Ledge reachable by a leap | at the water line and 1 tile above: yes · 2 tiles above: no | Mimo floating next to the wall |
| Leap onto a ledge from further away (centre to wall) | 1: yes/yes · 2: yes/yes · 3: yes/no · 4: no/no | ledge at the water line / 1 tile above, leap from floating, right held |
| Dive depth when walking/falling in | from the water line: 0.46 · from 1 tile above: 1.01 · from 3 tiles above: 1.87 tiles | feet below the line before sinking slowly |
| Boarding a bubble | from above, from the side and when it comes up under Mimo | not while he swims up with jump held, dives (down) or flies from a jump |
| Bubble born at the vent (`BUB.BORN_REACH`, 8 px) | a bubble that has just left its vent lifts a Mimo standing on the sea floor at that vent: the bubble counts as caught when Mimo's feet are within its diameter plus 8 px (a rising bubble in flight needs only 0.95 of its diameter) | stand on the vent and wait, no jump needed; this is how the cellar of Blubberlift starts |
| Bubble rise | 5.31 tiles/s | faster than swimming up; a vent sends one every 1.6 s (level field vents can change both); 8.5 tiles apart |
| Bubble pops | when its top reaches the water line, or a ceiling (also Mimo's head on it) | size 44 px wide |
| Ledge reachable from a bubble | up to 3 tiles above the water line (jump just before it pops) · 4: no | bubble rising next to the wall, right held |
| Jump from a bubble | 3.79 tiles (held), 2.48 (tap) | land strength also under water (land: 3.63); deep under water the next bubble catches him on the way |
| Jellyfish bounce | 8.07 tiles under water, 7.68 above | feet above the jellyfish top; same impulse as the mushroom |
| Current (> <) under water | idle 3.28 · with it 7.97 · against it 1.41 tiles/s | the same on the sea floor; above the water the tiles are wind as in world 2 |
| Bubble swirl (A) under water | 7.19 tiles/s up | faster than swimming; above the water it is the updraft of world 2 |
| Pufferfish beat | cycle 4.2 s: swims 2.6 s, trembles 0.55 s (warning, still harmless), big for 0.87 s | safe 3.33 s per cycle; first big at 3.23 s + offset |
| Pufferfish reach when big | 24 px from its centre to Mimo's box | small: never hurts |
| Pufferfish patrol | 3 tiles (default dist 3) | stops while it trembles and puffs |
| Crab speed | 2 tiles/s | shell top 22 px above the ground; Mimo on it is safe from urchins |
| Flag under water | set by a swimmer whose centre passes within 1.5 tiles of it | on land as before (touch it) |
| Tide (period 12, the default) | low 3.8 s · rising 2.2 s · high 3.8 s · falling 2.2 s | warning (arrow on the gauge, dashed target line) from 1.6 s before each change; period and move are level fields |
| Snail stomp under water | 2.82 tiles up | the stomp bounce keeps land strength (like a jump from a bubble) |
| Ink cloud (chase) speed | chase.speed on land, speed × 150/210 while Mimo swims (or chase.water) | tested with 160: 5 / 3.57 tiles/s |

## Rules worth knowing

- **Swimming** starts when Mimo's feet are more than 10 px under the line; shallower water is walked through like land.
  On the sea floor a jump press is a stroke (1.25 tiles), not a land jump. Only bubbles, jellyfish and stomped snails
  give land strength under water.
- **Holding the depth:** after a stroke Mimo glides (sinks only 12 px/s) until 0.75 s after the tap, then sinks at
  2 tiles/s. One tap every 1.35 s holds the depth; long tunnels are fine for the thumb.
- **Diving:** down held (keys, gamepad, thumb stick pushed down, bot key `D`) sinks 6 tiles/s, starts in 0.07 s and
  stops in 0.03 s. Like down on land it also drops through boards, lifts and bubbles. A 13-tile dive takes 2.2 s.
- **Leaping** needs Mimo at the surface (his head at most 14 px under the line). Holding jump while rising never leaps by
  itself: he floats, and the next press leaps. On a phone: hold to rise, let go, tap.
- **Bubbles are the express lift** (5.31 tiles/s, faster than swimming up at 4.84; 8.5 tiles apart in the column).
  Mimo gets on from above, from the side, or by letting one come up under him. He passes through one while he swims
  up with jump held, while he dives, or while he flies from a jump. Deep under water, a jump from a bubble is caught by
  the next bubble on the way. From a bubble just under the surface he reaches a ledge 3 tiles above the water line.
- **Crabs** turn at walls and at the end of their ground, not at urchins. They carry from above and never hurt; walking
  into one does nothing. Jumping straight up from a crab lands about one tile behind it (it walks on): jump from its front
  half or press forward a little. Piep within 5 tiles turns every crab round.
- **Pufferfish** hurt only while big. They stop while trembling and puffing, so the tremble is a clear 0.55 s warning.
  Give two fish different `offset`s for a rhythm; never ask for a gap shorter than about a second.
- **Currents** add 3.28 tiles/s: floating idle, Mimo is carried; swimming against one he makes 1.41 tiles/s. A current
  tile at the water line also catches a floating Mimo (his feet are in that row).
- **Tide:** make the low-tide and the high-tide way readable from the gauge. At high tide a wall one tile above the high
  line can be leapt; plan around 3.8 s of hold with the default period, or set a longer `period`.
- **Flags:** a swimmer whose centre passes within 1.5 tiles of a flag sets it, so a flag on the sea floor works for
  someone swimming above it. On land as before.
- **Lifts, boards, switches, crumbles, key and lock, flags, timed thorns, snails** behave as on land (checked by the test).
  A lift (and a bubble) does not pick up a Mimo standing on the floor below its lowest point: let it stop one tile above
  the floor, or make the player swim up and sink onto it.
- **Chase in water:** the ink slows with Mimo, so a chase stays as fair in the water as on land. A speed of 160 (76 % of
  Mimo on land) was won comfortably in Tintenprobe; the avalanche uses 180 (86 %). Long swims against a current or waits
  for a tide do not fit a chase.
- **Learned in levels 10 to 13 (round 2):** a crab rider does not press a switch (his feet are 22 px above the floor):
  end the ride at a step and put the switch on the step. Let a crab that people board turn at an open edge, not at a
  wall: landing on it at a wall with momentum can wedge Mimo into the wall. A bubble pops at a roof only when the roof is
  over its centre column, and a jump from a bubble under a roof bonks: leave 2 to 3 open tiles beside the roof for the
  hop. Between urchin tips, 3 clear rows are too fiddly for tapping; 4 clear rows (feet band about 3.5 tiles) are fair
  with one tap every 1.3 s. Sideways momentum under water carries about half a tile after letting go. A jellyfish on
  land needs a hop onto it (walking onto it does nothing). With a current at the back, holding forward is too fast for a
  slalom; letting the current carry (3.3 tiles/s) and steering up and down is the fair way.

## Level bot (tools/levelbot.mjs)

New for this world: key `P` (piep once at the start of the command), `D` dives under water, conditions `water`, `dry`, `body` (standing on a
crab or a bubble), `surface` (floating calmly at the surface: a press now leaps), `time>=n` (the level clock: wait for a
tide, a bubble, a pufferfish) and `and` to combine conditions. Proven idioms from the playground routes:

```
R until water max 3                                    # walk off the shore into the water
RJ until surface and x>=29.3 max 4; W 0.03; RJ 0.15    # float up to the wall, then leap onto the ledge
W until x>=46.3 max 1; W until body max 5              # wait above a vent: the next bubble picks Mimo up
W until y<=8.7 max 8; RJ 0.3                           # ride it up, jump off just under the surface
RJ 0.01; R 1.3; RJ 0.01; R 1.3                         # keep the depth: one small stroke and its glide every 1.35 s
D until y>=14 max 3                                    # dive down fast
W until time>=21.0 max 3                               # wait for a pufferfish or the tide
```

## For the boss (raft arena)

Water works in boss mode exactly as in levels. A boss def may carry `water` and `tide` like a level; the world's
`init` now runs for a boss fight too (before `make` and `arena`). From code (any hook of the boss part):

- `MimoCoast.surface()` water line in px (or null), `MimoCoast.swimming()`, `MimoCoast.inWater(x, y)`.
- `MimoCoast.setWater(yPx)` places the line now, `MimoCoast.moveWater(yPx, seconds)` glides there (smooth),
  `MimoCoast.setTide({ low, high, period, move, offset } | null)` starts or stops a tide. `MimoCoast.tide()` tells
  `{ y, state, next, warn, target }`.
- `MimoCoast.splash(x, y, n)` the splash effect; `MimoCoast.SWIM` the swimming numbers.
- A raft is a body: push `{ x, y, w }` into `api.L.bodies` and move it in `update`; Mimo stands and rides on it.
  To let a raft float, set its `y` from `MimoCoast.surface()` each step.

## Changes after the first levels (retune 2)

Routes written before this retune may break. What changed: sinking 2.66 → 2 tiles/s; a stroke now glides until 0.75 s
after the tap (one tap holds the depth for 1.35 s instead of 0.9 s); new dive with down (6 tiles/s); bubbles default
62 → 170 px/s (1.94 → 5.31 tiles/s) and every 2.4 → 1.6 s, and they now pick Mimo up from the side and from below;
crabs default 46 → 64 px/s (2 tiles/s) and a rider keeps his crab when two cross; flags are set by a swimmer within
1.5 tiles; new level field `says` and the optional `line` of crabs and pufferfish.
