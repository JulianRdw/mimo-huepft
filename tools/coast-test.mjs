// Deterministic checks of every rule of world 4 "Korallenküste" (src/worlds/coast*.js), measured in the real game.
// The measuring itself runs inside the page (tools/coast-lab-page.js): test basins are loaded into the first level slot
// of world 4 and the game is stepped frame by frame, so every number is the same on every run.
// For the boss mode check a tiny test boss with water is served next to the game (it never ships).
// Usage: node tools/coast-test.mjs [--table]   --table prints the measured numbers as a Markdown table (world4-kit.md)
import path from 'node:path';
import { chromium } from './pw.mjs';
import { ROOT, serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
let failed = 0;
const rows = [];
const check = (ok, label, value) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (value != null ? ' · ' + JSON.stringify(value) : '')); if (!ok) failed++; };
const near = (v, want, tol) => typeof v === 'number' && Math.abs(v - want) <= tol;
const between = (v, lo, hi) => typeof v === 'number' && v >= lo && v <= hi;
const row = (what, value, note) => rows.push([what, value, note || '']);

// a test boss of world 4 with water in its arena; arena() remembers the water line it found (init ran before it)
const BOSS = `(function () {
  window.MimoWorlds.register({ world: 4, boss: { name: 'Testkrake', kicker: 'Nur zum Prüfen', hp: 2, phases: [2, 1], water: 7, hint: 'Test',
    lines: { intro: ['Blubb?', 'Piep!', 'Blubb!'], again: 'Nochmal.', tickle: ['Hihi.'], hit: ['Aua.'], phase: ['So!'], stun: ['Uff.'], beaten: 'Gut.', piep: ['Piep?'] },
    map: [...Array(9).fill('#                  #'), '# P                #', '####################', '####################'],
    make(B) { B.x = 15 * 32; B.y = 10 * 32; B.floor = 10 * 32; },
    arena() { window.__bossArenaWater = window.MimoCoast.surface(); },
    ai() {}, box(B) { return { l: B.x - 20, r: B.x + 20, top: B.y - 40, bottom: B.y, soft: false, harmless: true }; },
    draw(B, ctx) { ctx.fillStyle = '#F08FA4'; ctx.fillRect(B.x - 20, B.y - 40, 40, 40); } } });
})();`;

const srv = await serveSrc();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/\/worlds\/coast-bosstest\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: BOSS }));
  // a world has one boss: the real one (Käpt’n Krake, coast-boss.js) steps aside for the test boss
  await page.route(/\/worlds\/coast-boss\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route(/\/(index\.html)?(\?.*)?$/, async (r) => {
    const res = await r.fetch(), body = await res.text();
    r.fulfill({ response: res, body: body.replace('<!-- world files end -->', '<script src="worlds/coast-bosstest.js"></script>\n<!-- world files end -->') });
  });
  await page.addInitScript({ path: path.join(ROOT, 'tools', 'coast-lab-page.js') });
  await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  const lab = (fn, ...a) => page.evaluate(([fn, a]) => window.__lab[fn](...a), [fn, a]);

  // ---------- swimming ----------
  const land = await lab('landJump');
  const sw = await lab('swimBasics');
  check(between(sw.sink, 1.8, 2.2), 'sinks slowly (tiles/s)', sw.sink);
  check(between(sw.rise, 4.5, 5.2), 'holding jump rises steadily (tiles/s)', sw.rise);
  check(between(sw.tap, 1.1, 1.5), 'a one-frame tap is a small stroke (tiles)', sw.tap);
  check(between(sw.swimX, 4.4, 4.9) && sw.swimX < 6.56, 'sideways slower than on land (tiles/s)', sw.swimX);
  check(near(sw.floorX, sw.swimX, 0.1), 'walks on the sea floor', sw.floorX);
  row('Sinking speed', sw.sink + ' tiles/s', 'no keys; reached after 0.1 s');
  row('Rising, jump held', sw.rise + ' tiles/s', 'steady; eases into floating at the surface');
  row('One tap (one frame)', sw.tap + ' tiles up', 'then sinks again; a tenth of a second held: ' + sw.tap01 + ' tiles');
  check(between(sw.holdGap, 1.25, 1.5), 'a tap every ~1.35 s holds the depth (the glide after a stroke)', { gap: sw.holdGap, drift: sw.holdDrift });
  row('Holding the depth', 'one tap every ' + sw.holdGap + ' s', 'after a stroke Mimo glides (sinks only 12 px/s) until 0.75 s after the tap; drift over six taps ' + sw.holdDrift + ' tiles');
  row('Tapping 4 times a second', sw.tapClimb + ' tiles/s up', 'quick taps climb almost as fast as holding');
  row('Swimming sideways', sw.swimX + ' tiles/s', 'land: 6.56 tiles/s');
  row('Walking on the sea floor', sw.floorX + ' tiles/s', 'same as swimming');
  row('Land jump (reference)', land.landJump + ' tiles high', 'running jump lands ' + land.landJumpRun + ' tiles further');

  const dv = await lab('dive2');
  check(between(dv.dive, 5.6, 6.3) && dv.diveStart < 0.15 && dv.diveStop < 0.1, 'holding down dives fast, starts and stops quickly', dv);
  row('Diving, down held', dv.dive + ' tiles/s', 'full speed after ' + dv.diveStart + ' s, back to sinking ' + dv.diveStop + ' s after letting go; 13 tiles take ' + dv.diveFloor + ' s');
  const sd = await lab('stickDive');
  check(!sd.small && sd.down && !sd.sideways && !sd.released && between(sd.sinksFast, 4, 6.3), 'thumb stick pushed down dives (input.dive), sideways or released does not', sd);
  const lp = await lab('leap');
  check(between(lp.leapFeet, 1.5, 1.9), 'a jump press at the surface leaps out (feet above the water line, tiles)', lp.leapFeet);
  row('Leap out of the water', lp.leapFeet + ' tiles', 'feet above the water line at the top; Mimo floats with his feet 0.56 tiles under the line');
  row('Leap, way above the water', lp.leapGapStill + ' tiles (from standstill), ' + lp.leapGapRun + ' (swimming at full speed)', 'sideways way while the feet are above the line, right held');
  const ledges = [];
  for (const k of [0, 1, 2]) ledges.push(await lab('ledge', k));
  check(ledges[0] && ledges[1] && !ledges[2], 'leap reaches a ledge at the water line and one tile above, not two', ledges);
  const gaps = {};
  for (const k of [0, 1]) for (const d of [1, 2, 3, 4]) gaps[k + '/' + d] = await lab('ledgeGap', k, d);
  row('Ledge reachable by a leap', 'at the water line and 1 tile above: yes · 2 tiles above: no', 'Mimo floating next to the wall');
  row('Leap onto a ledge from further away (centre to wall)', [1, 2, 3, 4].map((d) => d + ': ' + (gaps['0/' + d] ? 'yes' : 'no') + '/' + (gaps['1/' + d] ? 'yes' : 'no')).join(' · '), 'ledge at the water line / 1 tile above, leap from floating, right held');
  check(gaps['0/1'] && gaps['1/1'] && gaps['0/2'], 'leap from a little distance lands on a near ledge', gaps);
  const dives = [];
  for (const h of [0, 1, 3]) dives.push(await lab('dive', h));
  check(dives[2] < 2.5 && dives[0] < dives[2], 'a dive is braked within a few tiles', dives);
  row('Dive depth when walking/falling in', dives.map((d, i) => ['from the water line', 'from 1 tile above', 'from 3 tiles above'][i] + ': ' + d).join(' · ') + ' tiles', 'feet below the line before sinking slowly');

  // ---------- bubbles ----------
  const bu = await lab('bubbles');
  check(between(bu.bubRise, 5.1, 5.5) && bu.bubRise > sw.rise, 'bubbles rise faster than swimming up: the express lift (tiles/s)', bu.bubRise);
  check(near(bu.bubEvery, 1.6, 0.02), 'a vent releases a bubble every 1.6 s', bu.bubEvery);
  check(bu.bubRide > 1.8, 'Mimo rides a bubble up to the surface (seconds)', bu.bubRide);
  check(between(bu.bubPopAt, -0.2, 0.05), 'the bubble pops at the surface (bubble top - water line, tiles)', bu.bubPopAt);
  const bj = await lab('bubbleJump');
  check(between(bj.bubJump, land.landJump - 0.6, land.landJump + 0.5), 'a jump from a bubble deep under water has land strength (until the next bubble catches him)', { bubble: bj.bubJump, land: land.landJump });
  const bb = await lab('bubbleBoard');
  check(bb.side && bb.below && bb.standing && bb.passHeld && bb.passDive, 'bubble boarding: from the side, from below and standing on the vent yes, swimming up with jump held or diving passes it', bb);
  row('Boarding a bubble', 'from above, from the side, when it comes up under Mimo, and standing on the floor at the vent', 'not while he swims up with jump held, dives (down) or flies from a jump');
  row('Bubble rise', bu.bubRise + ' tiles/s', 'faster than swimming up; a vent sends one every ' + bu.bubEvery + ' s (level field vents can change both); 8.5 tiles apart');
  row('Bubble pops', 'when its top reaches the water line, or a ceiling (also Mimo\'s head on it)', 'size 44 px wide');
  const bl = [];
  for (const k of [2, 3, 4]) bl.push(await lab('bubbleLedge', k));
  check(bl[0] && bl[1] && !bl[2], 'from a bubble at the surface Mimo reaches a ledge 3 tiles above the water, not 4', bl);
  row('Ledge reachable from a bubble', 'up to 3 tiles above the water line (jump just before it pops) · 4: no', 'bubble rising next to the wall, right held');
  row('Jump from a bubble', bj.bubJump + ' tiles (held), ' + bj.bubJumpTap + ' (tap)', 'land strength also under water (land: ' + land.landJump + '); deep under water the next bubble catches him on the way');

  // ---------- jellyfish ----------
  const jw = await lab('jelly', 1), jd = await lab('jelly', 0);
  check(between(jw, 7.4, 8.4) && between(jd, 7.4, 8.4), 'the jellyfish bounces like the mushroom, under and above water (tiles)', { wet: jw, dry: jd });
  row('Jellyfish bounce', jw + ' tiles under water, ' + jd + ' above', 'feet above the jellyfish top; same impulse as the mushroom');

  // ---------- currents and swirl ----------
  const cu = await lab('current');
  check(cu.curIdle > 2.5 && cu.curWith > sw.swimX + 2 && cu.curAgainst < -0.8 && cu.curAgainst > -2, 'a current carries along, and you can swim against it, barely', cu);
  row('Current (> <) under water', 'idle ' + cu.curIdle + ' · with it ' + cu.curWith + ' · against it ' + Math.abs(cu.curAgainst) + ' tiles/s', 'the same on the sea floor; above the water the tiles are wind as in world 2');
  const swr = await lab('swirl');
  check(between(swr, 6.5, 7.6), 'a bubble swirl (updraft) lifts under water (tiles/s)', swr);
  row('Bubble swirl (A) under water', swr + ' tiles/s up', 'faster than swimming; above the water it is the updraft of world 2');

  // ---------- pufferfish ----------
  const pf = await lab('puffer');
  check(!pf.hurtSmall && pf.hurtBig, 'pufferfish: harmless while small, hurts while inflated', pf);
  check(between(pf.puffDanger, 0.8, 0.95), 'pufferfish danger window (s)', pf.puffDanger);
  row('Pufferfish beat', 'cycle ' + pf.puffCycle + ' s: swims ' + (pf.puffCycle - 1.6).toFixed(1) + ' s, trembles ' + pf.puffWarn + ' s (warning, still harmless), big for ' + pf.puffDanger + ' s', 'safe ' + pf.puffSafe + ' s per cycle; first big at ' + pf.firstDanger + ' s + offset');
  row('Pufferfish reach when big', pf.puffReachPx + ' px from its centre to Mimo\'s box', 'small: never hurts');
  row('Pufferfish patrol', pf.puffPatrol + ' tiles (default dist 3)', 'stops while it trembles and puffs');

  // ---------- crabs ----------
  const cr = await lab('crab');
  check(cr.crabCarries && cr.crabOverUrchins && cr.crabTurnsAtWall && cr.crabHarmless, 'crab: carries, crosses urchins with Mimo, turns at walls, never hurts', cr);
  row('Crab speed', cr.crabSpeed + ' tiles/s', 'shell top 22 px above the ground; Mimo on it is safe from urchins');
  const cc = await lab('crabCross');
  check(cc.crossed && cc.staysOnHisCrab, 'two crabs cross: the rider stays on his crab', cc);
  // piep: the crab turns round (the game allows one piep per 0.26 s of real time)
  await page.evaluate(() => { const l = window.__lab; l.load({ map: l.tank({ water: 30, h: 14, w: 30, put: [[10, 11, 'K']] }) }, [6, 11]); l.step(0.3); });
  await page.waitForTimeout(300);
  const piep = await page.evaluate(() => { const c = window.__mimo.G.L.coast.crabs[0], d0 = c.dir; window.__mimo.piep(); return { d0, d1: c.dir }; });
  check(piep.d1 === -piep.d0, 'piep turns the crab round', piep);

  // ---------- lines at places, flags under water ----------
  const sy = await lab('says');
  check(sy.saysFar === 0 && sy.saysNear === 1 && sy.saysAgain === 0, 'says: Mimo says the line once when he comes near', sy);
  const fl = [await lab('flagReach', 1.3), await lab('flagReach', 2.2)];
  check(fl[0] && !fl[1], 'a swimmer within 1.5 tiles sets a flag on the sea floor, further away not', fl);
  row('Flag under water', 'set by a swimmer whose centre passes within 1.5 tiles of it', 'on land as before (touch it)');

  // ---------- tide ----------
  const td = await lab('tide');
  const at = (state, warn) => (td.find((e) => e.state === state && e.warn === warn) || {}).t;
  check(near(at('low', true), 2.2, 0.05) && near(at('rising', true), 3.8, 0.05) && near(at('high', false), 6.0, 0.05) && near(at('falling', true), 9.8, 0.05), 'tide timing: hold, warn 1.6 s before, move 2.2 s (period 12)', td.slice(0, 6));
  row('Tide (period 12, the default)', 'low 3.8 s · rising 2.2 s · high 3.8 s · falling 2.2 s', 'warning (arrow on the gauge, dashed target line) from 1.6 s before each change; period and move are level fields');

  // ---------- old elements under water ----------
  const old = await lab('oldElements');
  check(Object.entries(old).every(([k, v]) => typeof v !== 'boolean' || v), 'boards, switches, crumbles, key and lock, flags, lifts, timed thorns, snails work under water', old);
  row('Snail stomp under water', old.snailStompRise + ' tiles up', 'the stomp bounce keeps land strength (like a jump from a bubble)');

  // ---------- chase ----------
  const ch = await lab('chase', 160);
  check(ch.skin && near(ch.inkDry, 5, 0.05) && near(ch.inkWet, 5 * 150 / 210, 0.05), 'ink cloud: own skin, slower while Mimo swims (tiles/s)', ch);
  row('Ink cloud (chase) speed', 'chase.speed on land, speed × 150/210 while Mimo swims (or chase.water)', 'tested with 160: ' + ch.inkDry + ' / ' + ch.inkWet + ' tiles/s');

  // ---------- boss mode ----------
  const bw = await lab('bossWater');
  check(bw.mode === 'boss' && near(bw.surfFromDef, 7, 0.01) && near(bw.arenaHook, 7 * 32, 0.5), 'boss arena gets its water from the boss def before arena() runs', bw);
  check(bw.swimsInArena, 'Mimo swims in a boss arena', bw.swimsInArena);
  check(near(bw.setWater, 5, 0.01) && between(bw.moveHalf, 6, 8) && near(bw.moveDone, 9, 0.01) && bw.tideInBoss, 'MimoCoast.setWater / moveWater / setTide steer the water in boss mode', bw);

  check(errors.length === 0, 'no page errors', errors.length ? errors.slice(0, 5) : null);
  await page.close();
} finally {
  await browser.close();
  srv.close();
}
if (args.table) {
  console.log('\n| What | Measured | Notes |\n|---|---|---|');
  for (const [a, b, c] of rows) console.log('| ' + a + ' | ' + b + ' | ' + c + ' |');
}
console.log(failed ? failed + ' check(s) failed' : 'all checks pass');
process.exit(failed ? 1 : 0);
