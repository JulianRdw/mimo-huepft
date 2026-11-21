# World 5 "Vulkaninsel": kit for level builders

Everything a level of world 5 can use, with numbers **measured in the game** by `node tools/volcano-test.mjs --table`
(deterministic, the same on every run). If you change a number in `src/worlds/volcano*.js`, run that command and
update the table below.

Code: `src/worlds/volcano.js` (lava, rising lava, hot stone, basalt), `volcano-things.js` (geysers, plates, fire hoppers,
steam vents, glow rain, lava falls: rules and timing), `volcano-things-draw.js` (their pictures), `volcano-look.js`
(palette, background, lava, tiles, thorns, decoration), `volcano-levels.js` (the song and the 13 levels, drafts in
`tools/levels/draft5/`, routes in `tools/levels/routes/world5/`). `firstLevel: 42` (right after the 13 levels of
world 4); the levels show as 43 to 55 in the menu. The world is released, so it carries no `draft: true` any more.

The feel: "eng, schnell, unter Druck". Most elements are on a fixed beat, so a level is a rhythm the player reads
and joins. Every danger glows (orange, yellow, white-hot) and warns before it acts.

## Map characters

World 5 has its own characters; the characters of the game keep their meaning.

| Char | What | Notes |
|---|---|---|
| `#` | basalt ground | dark violet with a light edge |
| `~` | lava | deadly; fill whole pools (a top row and rows under it). The surface is 8 px under the top of the top row. Not solid: Mimo sinks in and dies |
| `=` | lava plate | floats in the top row of a lava pool (that cell becomes lava). A run of `==` is one plate (n × 32 − 4 px wide). Cool and dark it carries, then it warms, sinks, comes back glowing hot |
| `H` | hot stone | solid; burns Mimo's paws when he stands on it about 1.1 s |
| `I` | basalt column | solid; a stack of `I` is a column. The top segment under Mimo shakes and breaks, he drops to the next one; it grows back after he left |
| `G` | geyser | in the empty cell on top of the ground; a timed lift 5 tiles high |
| `S` | steam vent | in the empty cell on top of the ground; a timed updraft column 4 tiles high |
| `F` | fire hopper | in the top row of a lava pool (the cell becomes lava when lava is beside it); jumps out on a fixed arc |
| `Q` | glow rain | a smoke puff in the air (under a roof or free); drops glowing rocks straight down on a beat |
| `\|` | lava fall | under a ceiling; a stream of lava down to the ground or the lava below, on a beat |
| `^` `v` | obsidian spikes | the thorns of the game, dark glass with a glowing edge |
| `Y` `C` | ash palm, crystals | decoration only, no collision; stand them on the ground |

All other elements of the game (boards, switches, crumbles, key and lock, flags, lifts, timed thorns, snails, wind,
updraft, mushroom) work as everywhere. `chase` (horizontal) is drawn as a wall of lava.

## Level fields

| Field | Meaning |
|---|---|
| `geysers: [{ x, y, height, every, offset, hold }]` | The geyser `G` at x, y: `height` tiles (default 5; a ceiling cuts it so Mimo is never squeezed), `every` s per beat (default 4.4), `offset` s (moves the beat), `hold` s at the top (default 1.1). |
| `plates: [{ x, y, offset, still, dist, speed }]` | The plate whose first `=` is at x, y: `offset` s, `still: true` (never sinks, for teaching), `dist` tiles and `speed` tiles/s to drift back and forth. |
| `hoppers: [{ x, y, dx, height, rest, offset, line }]` | The fire hopper `F` at x, y: `dx` tiles to the side (0 = straight up; with dx it jumps there and back), `height` tiles (default 4), `rest` s in the lava (default 1.6), `offset` s, `line`: what it says when it jumps near Mimo. |
| `steam: [{ x, y, height, on, off, offset }]` | The steam vent `S` at x, y: `height` tiles (default 4), `on` s (default 1.8), `off` s (default 1.8; 0 = always on), `offset` s. |
| `rain: [{ x, y, every, offset }]` | The glow rain `Q` at x, y: a rock every `every` s (default 2.2), the first at `offset` s. |
| `falls: [{ x, y, on, off, offset }]` | The lava fall `\|` at x, y: pours `on` s (default 2), pauses `off` s (default 2; 0 = always), `offset` s. |
| `rise: { row, speed, delay, top, gap, again }` | Rising lava over the whole level (the chase of this world): starts at the top of `row`, waits `delay` s (default 1.5), rises `speed` tiles/s (default 1.5) up to row `top`. After a fall it goes back to `gap` tiles (default 6) under the flag and waits `again` s (default 1.2). Such a level plays the chase song. |
| `hot: { burn }` | Seconds of standing on hot stone before it burns (default 1.1). |
| `says: [{ x, y, r, text }]` | Mimo says `text` once per level start when his centre comes within `r` tiles (default 2) of tile x, y. |
| `decor: [{ k, ... }]` | Set pieces that only look like something (no collision, no rules), see "Decor kinds" below. |
| `cone: 0..1` | How close the volcano in the background is: 0 far away and small, 1 big and right there. Without it the level's place in the world decides: level 1 is 0, level 12 and 13 are 1, in between linear (`i / 11`). The boss arena is always 1. In a tall level the cone may be mostly out of view. |

Example:

```js
{ name: 'Geysirfeld', medals: [20, 31, 46],
  geysers: [{ x: 12, y: 10 }, { x: 20, y: 10, offset: 2.2, height: 6 }], plates: [{ x: 30, y: 11, still: true }],
  hint: 'Der <b>Geysir</b> pustet erst, dann hebt er dich hoch.', map: [ ... ] }
```

## Decor kinds (level field `decor`)

All positions are in tiles (x may be fractional), looks only, drawn in `src/worlds/volcano-look.js`. Layer: back = behind
the tiles, mid = over the tiles (in front of the ground, behind Mimo's HUD). Everything is culled to the camera and runs on
the game clock. Pieces are kept cheap: a few rects and strokes each.

| `k` | Fields | Layer | What it is |
|---|---|---|---|
| `boat` | `x, y, w, h, mast, top, hold: [x, y, w, h], leak: [x, y, w, h]` | back + mid | The beached boat of the arrival: hull from tile `x` to `x + w` (bow on the right), deck on row `y`, keel at row `y + h`, mast at tile `mast` up to row `top` with a patched sail. `hold` and `leak` are empty tiles inside the hull; the hull opens its hold while Mimo is inside (he sees the star), the leak is a ragged hole. The hull is drawn over solid tiles. |
| `bricks` | `x, y, w, h, face, cover, rock` | back + mid | A built thing (an oven): behind its empty tiles a dark brick back wall, over its solid ground tiles a warm brick tint with mortar seams. `face: true` draws only the tint (for a rect that also holds sky). `cover: true` walls the empty tiles up in front until Mimo is inside (like a drawer), then only a faint veil. `rock: true` makes that front plain basalt (a hidden cave) and draws nothing else of the rect. |
| `sinter` | `x, y, w` | mid | Pale mineral crust with drips on the edge of a terrace: ground row `y`, `w` tiles wide. |
| `nest` | `x, y` | back | A ring of stones round a fire hopper's home: tile `x`, `y` is the hopper's cell in the top row of the lava. |
| `rings` | `x, y` | mid | Smoke rings rise slowly out of a hole in the ground top at tile `x`, row `y` (somebody big sleeps below). Still when reduced motion is on. |
| `glow` | `x, y, r, a` | back | A warm light, radius `r` tiles (default 3), strength `a` (default 0.5), pulsing a little: the fire inside an oven. |
| `smoke` | `x, y` | back | Grey puffs out of a chimney top at tile `x`, row `y`. |
| `wall` | `x, y, w, h` | back | Dark cracked rock behind the empty tiles of the rect (inside the mountain, a cliff face). Lava tiles stay visible. |
| `stone` | `x, y, w, h` | mid | The plain solid tiles of the rect become cut stone: a cool tint and block seams (a bridge, a tower). |
| `arch` | `x, y, w, h` | back | A stone arch hanging under a deck: underside at row `y`, span `w` tiles, legs `h` tiles down (default 3). |
| `pipe` | `pts: [[x, y], ...], r` | back | A thick copper pipe through the tile centres of `pts`, flanges at the bends; `r` is the radius in tiles (default 0.35). |
| `gauge` | `x, y, s` | back | A pressure gauge on a wall, its needle trembles near the red; `s` scales it (default 1). |
| `boiler` | `x, y, w, h, whistle` | mid | Rivet bands over the hot tiles of a boiler; `whistle` is the tile x of a brass whistle on top that lets off steam. |
| `organ` | `x, y, w, h` | back | The case of an organ behind its pipes: arched frame, silver pipes (longest in the middle), a rosette. |
| `notes` | none | mid | Music notes fly up wherever a basalt segment breaks (the organ plays). Needs no position. |
| `print` | `x, y, dir` | mid | A scorched three-toed footprint on the ground top at tile `x`, row `y`, toes toward `dir` (1 right, -1 left), embers rising: somebody big walked here. |
| `anvil` | `x, y, w` | mid | An iron anvil over the solid tiles of row `y` (horn on the left), its waist down to row `y + 2`. |
| `bellows` | `x, y, w, vent: [tx, ty]` | back | A leather bellows lying on the ground top at row `y` (`w` tiles, default 3); it squeezes while the steam vent at `vent` blows. |
| `chain` | `x, y, y1` | back | An iron chain hanging from row `y` to row `y1` at tile column `x` (may be fractional), a hook below. |
| `lair` | `x, y, w, h` | back | The dragon's cave mouth over the empty tiles of the rect: darkness, a warm glow deep inside, rock teeth, claw scratches. |
| `gate` | `x, y, w, h` | back | The lair door: a huge round-topped door of dark planks with iron bands, a ring and light under it. |
| `tail` | `x, y, dir, s` | back | The tip of a big tail lying on the ground top at tile `x`, row `y`, pointing `dir`; it sways in its sleep. `s` scales it (default 1). Nobody sees more of Fauch than this. |
| `riseglow` | `reach` | mid | While the rising lava is still under the screen, the bottom of the screen glows warmer the closer it comes (from `reach` tiles away, default 10). Needs `rise`. |

Rule of thumb: stand decor on the ground the level already has; a decor piece never changes what is solid.

## Measured limits

All heights are Mimo's feet, in tiles (32 px). Times in seconds from the level start (the game clock), `offset` moves them.

| What | Measured | Notes |
|---|---|---|
| Lava (`~`) | deadly when the feet are 4.6 px under the surface (grace 4 px) | surface 8 px under the top of the top lava tile; a lava tile under lava is deadly as a whole |
| Jump over lava | 3 tiles wide: yes from standing next to it | land jump 3.63 tiles high, a running jump lands 4.48 tiles further |
| Hot stone (`H`): standing | burns after 1.12 s | the stone under Mimo and his paws glow brighter with the heat; at 0.55 he says "Heiß!" |
| Hot stone: running without a jump | 7 tiles from standstill | hopping (jump on landing) crosses any length: 47 tiles with 23 hops |
| Hot stone: cooling | heat 0.63 after 0.7 s on it is gone 0.17 s after stepping off | full heat drains in 0.55 s, so every full jump (0.69 s in the air) starts the count fresh; level field `hot.burn` changes the 1.1 s |
| Basalt column (`I`) | a segment breaks 0.72 s after Mimo stands on it (first at 0.57 s), he drops one tile to the next | short hops keep the top (the shaking fades at 0.8/s); the column stands again 2.5 s after he left it |
| Geyser (`G`) beat | every 4.4 s: quiet 1.35 · warning puff 0.8 · rise 0.45 · hold 1.1 · sink 0.7 | first eruption at 2.16 s + offset |
| Geyser lift | 5 tiles (default height 5) | Mimo on the mouth, walking into the column or falling into it is lifted onto its top; carried 6.6 s per beat; it sinks back with him |
| Jump from the geyser top | 3.63 tiles · reach 8.63 tiles above the ground | ledge 2 and 3 tiles above the top: yes · 4: no (jump while it holds, right held) |
| Lava plate (`=`) beat | period 6.6 s: cool 2.6 · warm 1.2 (cracks glow and pulse, it trembles) · sink 0.5 · under 0.9 · rise 0.4 · hot 1.0 | safe to stand 3.8 s per period; burns 1.4 s (rise and hot) |
| Lava plate size | a run of n `=` is one plate n × 32 − 4 px wide, its top 8 px above the top of its row | Mimo standing on a cool plate when it sinks dies 0.32 s after the sink starts |
| Fire hopper (`F`) | rests 1.6 s, glows brighter the last 0.6 s, flies 0.82 s (height 4) | cycle 2.43 s, first jump at 1.61 s + offset; its arc is always shown as dots |
| Fire hopper reach | hurts when its centre comes within 9.35 px of Mimo's box shrunk by 3 px (drawn radius 11) | dx 4, height 3: flight 0.72 s; it can not be stomped |
| Steam vent (`S`) | blows 1.8 s, rests 1.8 s, hisses 0.5 s before; lifts 6 tiles/s | Mimo hovers with his feet 5.44 tiles above the vent (column 5) |
| Ledge from the steam | ledge right beside the vent tile, at the column height or 1 lower: yes · 1 higher: no · with one tile of gap between vent and ledge: no | move sideways at the top, right held |
| Glow rain (`Q`) | a rock every 2.2 s, falls 9.5 tiles in 0.68 s | the landing spot glows 1.58 s before impact (0.9 s before the drop) |
| Lava fall (`\|`) | pours 2 s, pauses 2 s; the stream moves 16.3 tiles/s (8 tiles reach the ground in 0.49 s) | at the ground Mimo's height is clear 1.97 s of every 4 s; drips and the spout glows 0.6 s before |
| Rising lava (`rise`) | default 1.5 tiles/s after 1.5 s | after a fall it waits 6 tiles under the flag for 1.2 s |

## Safe windows, worked out

- **Two plates in a row:** each is safe 3.8 s per 6.6 s. With offsets a and b the time both are safe together is
  3.8 − |a − b| s (as long as |a − b| < 3.8). Offset 1.5 gives 2.3 s to step from one to the next (measured on the former playground).
  Keep at least 1.5 s; a still plate is the place to wait.
- **Plate timeline (offset 0):** safe 0 to 3.8 s (glowing cracks from 2.6 s), gone 4.3 to 5.2 s, hot 5.2 to 6.6 s.
- **Geyser (offset 0):** the warning puff starts 1.35 s, Mimo goes up 2.15 to 2.6 s, may jump off 2.6 to 3.7 s, rides
  down until 4.4 s. A player who arrives late simply waits on the mouth: there is no danger on a geyser.
- **Fire hopper (offset 0, height 4):** in the air 1.61 to 2.43 s, then every 2.43 s. To pass over its home walk
  through in the rest phase (1.6 s, the last 0.6 s glowing). A hopper with `dx` alternates: home, then home + dx.
- **Lava fall (offset 0):** at Mimo's height above the ground it is in the way from 0.38 s to 2.43 s and clear from
  2.43 s to 4.38 s; then every 4 s. Never ask for a window under 1 s.
- **Glow rain:** standing one tile beside the column is always safe. Under it, the rock lands `every` s; it is in
  Mimo's height only for the last ~0.1 s of the fall, but treat the whole glowing time (1.58 s) as "not now".
- **Basalt:** a column of n segments under a standing Mimo lasts about 0.57 + 0.72 × (n − 1) s before he is in the
  lava. Hopping (land, jump again within a few tenths) keeps the top.
- **Hot stone:** walking, 7 tiles; with one jump in between any length. Stars over hot stone are a natural reason to
  jump. Hot stone next to a wait (a geyser, a plate beat) is a mean combination: give a cool place to wait.
- **Rising lava:** a human needs two to three times the bot's time. The former playground climbed 30 rows; at 1.2 tiles/s the
  lava reaches the door after about 28 s, the bot needs 11 to 12 s.

## Rules worth knowing

- **Bodies.** Geyser tops and plates are bodies (`api.L.bodies`): they carry from above and do not block from the side.
  The bot condition `body` is true while Mimo stands on one.
- **Geyser.** The column is not a wall: walking or falling into it lifts Mimo onto its top. Jumping up through it does
  not (vy faster than 250 px/s up). Mimo is lowered back to the mouth with the column, nothing hurts.
- **Steam.** A vent is plain ground while it rests. While it blows, Mimo inside the column (his centre within 20 px of
  the vent's centre) floats up 6 tiles/s and bobs at its top. Leaving the column sideways at the top he lands on a
  ledge right beside the vent tile, as high as the column or one lower; one tile of gap is too far.
- **Lava.** Only the feet count at the surface (4 px grace), so Mimo can stand at the very edge of a pool and walk
  along a one-tile ground strip between two pools. In the invincible assist mode lava bounces him like thorns do.
- **Hot stone** counts only while Mimo stands on it (grounded, not carried); on a plate or a geyser over hot stone he is
  safe. The heat shows on the stone under him (cracks from orange to white-yellow, a glow) and on his paws (glow and
  steam), and at 0.55 he says "Heiß!".
- **Basalt** grows back only when Mimo does not overlap the tile; standing on a lower segment of the same column keeps
  the broken ones away.
- **Fire hoppers** are drawn resting in the lava as a glowing spot that swells; their arc is a row of dots that
  brightens before the jump. They can not be stomped.
- **Glow rain** sources are drawn as a smoke cloud; the landing spot on the ground pulses orange before and while a
  rock falls.
- **Flags** work as on land. Put one before every timed section.

## Level bot (tools/levelbot.mjs)

New for this world: the condition `heat>=n` / `heat<=n` (the heat under Mimo's paws, 0 to 1). Proven idioms from the
routes of the former playground:

```
R until x>=51.4 max 2; W until y<=6.1 max 6; W 0.05; RJ 0.35   # step onto a geyser, ride up, jump off right at the top
W until time>=6.7 max 9; R until x>=34.4 max 1; RJ 0.2           # wait on a still plate for the next plate's safe time
R until x>=65.3 max 2; W until y<=3.7 max 6; R until grounded    # stand on a steam vent, float up, drift onto the ledge
R until x>=76 max 2; W until time>=14.6 max 6; R until x>=77.8   # wait for a fire hopper to land, then cross
RJ 0.35; R until x>=64.4 max 1; W until grounded max 2           # hop from basalt column to basalt column
W until heat<=0 max 1                                            # let the paws cool down off the hot stone
```

Mind: a `;` always splits a route line, also inside a comment. Two commands in a row that both hold J get a one-frame
release in between (a new jump); to jump up first and steer later, leave a gap in the ledge above instead.

## Changes the boss may use

`MimoVolcano.riseY()` (the rising lava line in px or null), `MimoVolcano.setRise({ row, speed, delay, top, gap, again })`
(start or replace it, `null` stops it), `MimoVolcano.heat()`, `MimoVolcano.lavaTop(tx, ty)`, `MimoVolcano.isLava(tx, ty)`,
and the timing functions `geyserAt`, `plateAt`, `hopperAt`, `steamAt`, `fallAt`, `eachRock` (they answer in shared
holders: read the result right away).
