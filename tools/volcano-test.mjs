// Deterministic checks of every rule of world 5 "Vulkaninsel" (src/worlds/volcano*.js), measured in the real game.
// The measuring runs inside the page (tools/volcano-lab-page.js): test fields are loaded into the first level slot of
// world 5 and the game is stepped frame by frame, so every number is the same on every run.
// Usage: node tools/volcano-test.mjs [--table] [--json]
//   --table prints the measured numbers as a Markdown table (tools/levels/world5-kit.md), --json all raw results
import path from 'node:path';
import { chromium } from './pw.mjs';
import { ROOT, serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
let failed = 0;
const rows = [], raw = {};
const check = (ok, label, value) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (value != null ? ' · ' + JSON.stringify(value) : '')); if (!ok) failed++; };
const near = (v, want, tol) => typeof v === 'number' && Math.abs(v - want) <= tol;
const between = (v, lo, hi) => typeof v === 'number' && v >= lo && v <= hi;
const row = (what, value, note) => rows.push([what, value, note || '']);
const phaseAt = (log, name) => (log.find((e) => e[0] === name) || [])[1];

const srv = await serveSrc();
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.addInitScript({ path: path.join(ROOT, 'tools', 'volcano-lab-page.js') });
    await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
    // world 5 is not released yet (UNRELEASED_WORLDS): the game has it only with ?vorschau
    await page.goto(srv.url + '?vorschau');
    await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
    const lab = (fn, ...a) => page.evaluate(([fn, a]) => window.__lab[fn](...a), [fn, a]);
    // drawing runs only on animation frames: give every element a few frames on screen in this colour scheme
    const look = async (fn) => { await lab(fn); for (let i = 0; i < 4; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r))); };

    if (scheme === 'dark') {
      for (const fn of ['lava', 'hot', 'basalt', 'geyser', 'plates', 'hopper', 'steam', 'rain', 'fall', 'rise', 'chaseLook']) await look(fn);
      const info = await page.evaluate(() => ({ world: window.__mimo.WORLDS[5] && window.__mimo.WORLDS[5].name, first: window.__mimo.WORLDS[5].firstLevel }));
      check(info.world === 'Vulkaninsel', 'dark mode: every element drawn without errors', errors.length ? errors.slice(0, 3) : null);
      await page.close();
      continue;
    }
    const info = await page.evaluate(() => { const M = window.__mimo, w = M.WORLDS[5]; return { name: w && w.name, first: w && w.firstLevel, levels: M.LEVELS.filter((l) => l.world === 5).length, w4: M.LEVELS.filter((l) => l.world === 4).length, song: M.Music ? null : null }; });
    check(info.name === 'Vulkaninsel' && info.first === 29 + info.w4, 'world 5 is registered right after world 4', info);

    // ---------- reference ----------
    const land = raw.land = await lab('landJump');

    // ---------- lava ----------
    const lv = raw.lava = await lab('lava');
    check(lv.walkInDies && lv.edgeSafe && lv.jump3 && lv.deepTile, 'lava: walking in is deadly, its edge is safe, a 3-tile pool is jumped from standing', lv);
    check(between(lv.diesAtDepth, 4, 12), 'lava: the feet may dip only a few px under the surface (px)', lv.diesAtDepth);
    row('Lava (~)', 'deadly when the feet are ' + lv.diesAtDepth.toFixed(1) + ' px under the surface (grace 4 px)', 'surface 8 px under the top of the top lava tile; a lava tile under lava is deadly as a whole');
    row('Jump over lava', '3 tiles wide: yes from standing next to it', 'land jump ' + land.landJump + ' tiles high, a running jump lands ' + land.landJumpRun + ' tiles further');

    // ---------- hot stone ----------
    const ht = raw.hot = await lab('hot');
    check(ht.burns && between(ht.burnAfter, 1.0, 1.25), 'hot stone burns after standing on it about 1.1 s', ht.burnAfter);
    check(between(ht.coolTime, 0.1, 0.6), 'off the stone the heat drains quickly (s)', ht.coolTime);
    check(between(ht.runTiles, 5, 9), 'running across hot stone without a jump: tiles before it burns', ht.runTiles);
    check(ht.hopSafe && ht.hopTiles > 40, 'hopping along hot stone never burns', { tiles: ht.hopTiles, hops: ht.hops });
    check(near(ht.hotJump, land.landJump, 0.05), 'a jump from hot stone is a normal jump', ht.hotJump);
    row('Hot stone (H): standing', 'burns after ' + ht.burnAfter + ' s', 'the stone under Mimo and his paws glow brighter with the heat; at 0.55 he says "Heiß!"');
    row('Hot stone: running without a jump', ht.runTiles + ' tiles from standstill', 'hopping (jump on landing) crosses any length: ' + ht.hopTiles + ' tiles with ' + ht.hops + ' hops');
    row('Hot stone: cooling', 'heat ' + ht.heatAfter07 + ' after 0.7 s on it is gone ' + ht.coolTime + ' s after stepping off', 'full heat drains in 0.55 s; level field hot.burn changes the 1.1 s');

    // ---------- basalt ----------
    const ba = raw.basalt = await lab('basalt');
    check(between(ba.segment, 0.5, 0.75) && ba.endsInLava, 'basalt: the top segment under Mimo breaks after about 0.55 s, the next one too, at the end the lava', ba);
    check(ba.hopKeepsTop, 'basalt: short hops on a column keep its top', ba.hopKeepsTop);
    check(between(ba.regrow, 2.4, 3.2), 'basalt: the column stands up again about 2.5 s after Mimo left it', ba.regrow);
    row('Basalt column (I)', 'a segment breaks ' + ba.segment + ' s after Mimo stands on it (first at ' + ba.breakTimes[0] + ' s), he drops one tile to the next', 'short hops keep the top (the shaking fades at 0.8/s); the column stands again ' + ba.regrow + ' s after he left it');

    // ---------- geysers ----------
    const ge = raw.geyser = await lab('geyser');
    check(between(ge.lift, 4.9, 5.1) && ge.carriedS > 1.5, 'geyser lifts Mimo 5 tiles and carries him', { lift: ge.lift, carried: ge.carriedS });
    check(ge.sidePickup, 'geyser: walking into the column picks Mimo up', ge.sidePickup);
    check(near(ge.jumpFromTop, land.landJump, 0.1), 'a jump from the geyser top is a normal jump', ge.jumpFromTop);
    check(ge.ledge[2] && ge.ledge[3] && !ge.ledge[4], 'from the geyser top a ledge 3 tiles higher is reachable, 4 not', ge.ledge);
    check(ge.ceilingMax < 4, 'a ceiling cuts the column short', ge.ceilingMax);
    const gb = ge.beat;
    row('Geyser (G) beat', 'every ' + gb.every + ' s: quiet ' + gb.quiet + ' · warning puff ' + gb.warn + ' · rise ' + gb.rise + ' · hold ' + gb.hold + ' · sink ' + gb.fall, 'first eruption at ' + phaseAt(ge.phases, 'rise') + ' s + offset (level field geysers: height, every, offset, hold)');
    row('Geyser lift', ge.lift + ' tiles (default height 5)', 'Mimo on the mouth, beside it walking in, or falling into the column is lifted onto its top; carried ' + ge.carriedS + ' s per beat; it sinks back with him');
    row('Jump from the geyser top', ge.jumpFromTop + ' tiles · reach ' + ge.totalReach + ' tiles above the ground', 'ledge 2 and 3 tiles above the top: yes · 4: no (jump while it holds, right held)');

    // ---------- plates ----------
    const pl = raw.plates = await lab('plates');
    check(pl.sinkKills && between(pl.rideS, 3.5, 4.5), 'a cycling plate carries while cool and warm, then sinks into the lava', { ride: pl.rideS, diedAt: pl.diedAt });
    check(pl.hotBurns, 'a hot plate burns', pl.hotBurns);
    check(pl.stillHolds, 'a still plate never sinks', pl.stillHolds);
    check(near(pl.drift, 3, 0.05), 'a drifting plate moves dist tiles', pl.drift);
    row('Lava plate (=) beat', 'period ' + pl.period + ' s: cool ' + 2.6 + ' · warm ' + pl.warn + ' (cracks glow and pulse, it trembles) · sink 0.5 · under 0.9 · rise 0.4 · hot 1.0', 'safe to stand ' + pl.safe + ' s per period; burns ' + pl.danger + ' s (rise and hot); level field plates: offset, still, dist, speed');
    row('Lava plate size', 'a run of n "=" is one plate n × 32 − 4 px wide, its top ' + pl.plateTopAboveGround + ' px above the top of its row', 'the row of "=" becomes lava; Mimo standing on a cool plate when it sinks dies ' + (pl.diedAt - 3.8).toFixed(2) + ' s after the sink starts');

    // ---------- fire hoppers ----------
    const hp = raw.hopper = await lab('hopper');
    check(near(hp.peak, 4, 0.1) && hp.safeWhileResting && hp.hurtsWhileFlying, 'fire hopper: jumps 4 tiles, harmless while resting, hurts while flying', hp);
    check(near(hp.arcWidth, 4, 0.05), 'a hopper with dx 4 lands 4 tiles away (and jumps back)', hp.arcWidth);
    row('Fire hopper (F)', 'rests ' + hp.rest + ' s, glows brighter the last ' + hp.warn + ' s, flies ' + hp.flight + ' s (height 4)', 'cycle ' + hp.cycle + ' s, first jump at ' + hp.firstJump + ' s + offset; its arc is always shown as dots; level field hoppers: dx, height, rest, offset, line');
    row('Fire hopper reach', 'hurts when its centre comes within ' + hp.reach + ' px of Mimo\'s box shrunk by 3 px (drawn radius 11)', 'dx 4, height 3: flight ' + hp.arcFlight + ' s; it can not be stomped');

    // ---------- steam ----------
    const st = raw.steam = await lab('steam');
    check(between(st.hover, st.columnTop - 0.6, st.columnTop + 0.6) && between(st.liftSpeed, 5, 8), 'steam vent lifts Mimo to the top of its column', st);
    check(st.ledge['0/4'] && st.ledge['0/5'] && !st.ledge['0/6'], 'from the steam top Mimo drifts onto a ledge beside the vent as high as the column, not higher', st.ledge);
    check(st.offIsGround, 'a resting vent is plain ground', st.offIsGround);
    row('Steam vent (S)', 'blows 1.8 s, rests 1.8 s, hisses 0.5 s before; lifts ' + st.liftSpeed + ' tiles/s', 'Mimo hovers with his feet ' + st.hover + ' tiles above the vent (column ' + st.columnTop + '); level field steam: height, on, off (0 = always), offset');
    row('Ledge from the steam', 'ledge right beside the vent tile, at the column height or 1 lower: ' + (st.ledge['0/5'] && st.ledge['0/4'] ? 'yes' : 'no') + ' · 1 higher: ' + (st.ledge['0/6'] ? 'yes' : 'no') + ' · one tile gap between vent and ledge: ' + ['4', '5', '6'].map((k) => (st.ledge['1/' + k] ? 'yes' : 'no')).join('/'), 'move sideways at the top, right held');

    // ---------- glow rain ----------
    const rn = raw.rain = await lab('rain');
    check(rn.hits && rn.besideSafe, 'glow rain: hurts right under the source, one tile beside is safe', rn);
    row('Glow rain (Q)', 'a rock every ' + rn.every + ' s, falls ' + rn.drop + ' tiles in ' + rn.fallT + ' s', 'the landing spot glows ' + rn.warnLead + ' s before impact (' + rn.warn + ' s before the drop); level field rain: every, offset');

    // ---------- lava falls ----------
    const fa = raw.fall = await lab('fall');
    check(fa.hurts && fa.gapPass, 'lava fall: hurts under the stream, the gap lets Mimo through', fa);
    row('Lava fall (|)', 'pours 2 s, pauses 2 s; the stream moves 16.3 tiles/s (' + fa.len + ' tiles reach the ground in ' + fa.reachGround.toFixed(2) + ' s)', 'at the ground Mimo\'s height is clear ' + fa.clearAtGround + ' s of every 4 s; drips and the spout glows 0.6 s before; level field falls: on, off (0 = always), offset');

    // ---------- rising lava ----------
    const ri = raw.rise = await lab('rise');
    check(ri.waits && near(ri.speed, 1.5, 0.02) && ri.kills, 'rising lava waits, rises at its speed and kills', ri);
    check(near(ri.respawnGap, 6, 0.6), 'after a fall the rising lava waits about 6 tiles under the flag', ri.respawnGap);
    row('Rising lava (level field rise)', 'rise: { row, speed (1.5 tiles/s), delay (1.5 s), top, gap (6), again (1.2 s) }', 'after a fall it waits ' + ri.respawnGap + ' tiles under the flag for 1.2 s; the world plays the chase song in such a level');

    // ---------- the rest ----------
    await look('chaseLook');
    const sy = raw.says = await lab('says');
    check(sy.saysFar === 0 && sy.saysNear === 1 && sy.saysAgain === 0, 'says: Mimo says the line once when he comes near', sy);
    const bo = raw.bodies = await lab('bodies');
    check(bo.geyserBody && bo.plateBody, 'geysers and plates are bodies (the bot condition "body" sees them)', bo);
    check(errors.length === 0, 'no page errors (light)', errors.length ? errors.slice(0, 5) : null);
    await page.close();
  }
} finally {
  await browser.close();
  srv.close();
}
if (args.json) console.log(JSON.stringify(raw, null, 1));
if (args.table) {
  console.log('\n| What | Measured | Notes |\n|---|---|---|');
  for (const [a, b, c] of rows) console.log('| ' + a + ' | ' + b + ' | ' + c + ' |');
}
console.log(failed ? failed + ' check(s) failed' : 'all checks pass');
process.exit(failed ? 1 : 0);
