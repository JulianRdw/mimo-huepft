// Deterministic checks of every rule of world 6 "Mond" (src/worlds/moon*.js), measured in the real game.
// The measuring runs inside the page (tools/moon-lab-page.js): test fields are loaded into the first level slot of
// world 6 and the game is stepped frame by frame, so every number is the same on every run.
// Usage: node tools/moon-test.mjs [--table] [--json] [--only name,name]
//   --table prints the measured numbers as a Markdown table (tools/levels/world6-kit.md), --json all raw results
import path from 'node:path';
import { chromium } from './pw.mjs';
import { ROOT, serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const only = args.only ? String(args.only).split(',') : null;
const want = (k) => !only || only.includes(k);
let failed = 0;
const rows = [], raw = {};
const check = (ok, label, value) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (value != null ? ' · ' + JSON.stringify(value) : '')); if (!ok) failed++; };
const near = (v, w, tol) => typeof v === 'number' && Math.abs(v - w) <= tol;
const between = (v, lo, hi) => typeof v === 'number' && v >= lo && v <= hi;
const row = (what, value, note) => rows.push([what, value, note || '']);

// world 6 is not released yet (UNRELEASED_WORLDS in src/index.html): the game has it only with ?vorschau
const srv = await serveSrc();
const browser = await chromium.launch();
// --shots dir: pictures of every element at 844×390 in day, dark mode and at night (the sky follows the clock)
if (args.shots) {
  const fs = await import('node:fs');
  const dir = path.resolve(String(args.shots)); fs.mkdirSync(dir, { recursive: true });
  for (const [mode, scheme, hour] of [['day', 'light', 12], ['dark', 'dark', 12], ['night', 'light', 23]]) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, colorScheme: scheme });
    page.on('pageerror', (e) => console.log('page error: ' + e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.addInitScript({ path: path.join(ROOT, 'tools', 'moon-lab-page.js') });
    await page.addInitScript((h) => { Date.prototype.getHours = function () { return h; }; Date.prototype.getMinutes = function () { return 0; }; }, hour);
    await page.goto(srv.url + '?vorschau');
    await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
    const names = await page.evaluate(() => Object.keys(window.__lab.SCENES));
    for (const n of (only || names)) {
      await page.evaluate((n) => { window.__lab.scene(n); window.__mimo.G.intro = 99; window.__mimo.G.wipe = 99; }, n);
      for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.screenshot({ path: path.join(dir, n + '-' + mode + '.png') });
    }
    await page.close();
  }
  console.log('screenshots in ' + dir);
  await browser.close(); srv.close(); process.exit(0);
}
try {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, colorScheme: scheme });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.addInitScript({ path: path.join(ROOT, 'tools', 'moon-lab-page.js') });
    await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
    await page.goto(srv.url + '?vorschau');
    await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
    const lab = (fn, ...a) => page.evaluate(([fn, a]) => window.__lab[fn](...a), [fn, a]);
    // drawing runs only on animation frames: give every element a few frames on screen in this colour scheme
    const look = async (fn) => { await lab(fn); for (let i = 0; i < 4; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r))); };

    if (scheme === 'dark') {
      for (const fn of ['base', 'orbit', 'meteor', 'stones', 'boosts', 'darkLook']) await look(fn);
      check(errors.length === 0, 'dark mode: every element drawn without errors', errors.length ? errors.slice(0, 3) : null);
      await page.close();
      continue;
    }
    const info = await page.evaluate(() => { const M = window.__mimo, w = M.WORLDS[6]; return { name: w && w.name, first: w && w.firstLevel, planned: w && (w.plannedFirst || w.firstLevel), before: M.LEVELS.filter((l) => l.world === 4 || l.world === 5).length, song: !!(M.aud().Music.SONGS.moon) }; });
    check(info.name === 'Mond' && info.first === 29 + info.before, 'world 6 is registered right after world 5', info);
    check(info.song, 'the song "moon" is in the music system', info.song);

    if (want('jumps')) {
      const j = raw.jumps = await lab('jumps');
      check(between(j.moon.high, 4.6, 5.6) && between(j.earth.high, 3.55, 3.7), 'moon jump about 5 tiles high, Earth jump in a base 3.6', { moon: j.moon.high, earth: j.earth.high });
      check(j.moon.run > j.earth.run * 1.3 && j.moon.air > j.earth.air * 1.3, 'moon jump is much longer and slower than on Earth', { run: [j.moon.run, j.earth.run], air: [j.moon.air, j.earth.air] });
      check(j.moon.tap < j.moon.high * 0.5, 'a short tap stays low (the jump can be cut)', j.moon.tap);
      check(between(j.walk, 6.3, 6.6), 'walking speed is the same as on Earth (tiles in 1 s from standstill)', j.walk);
      check(j.light.high > j.moon.high * 1.4, 'level field gravity 0.6 floats higher', j.light.high);
      row('Moon jump (held)', j.moon.high + ' tiles high, ' + j.moon.air + ' s in the air', 'Earth (in a base): ' + j.earth.high + ' tiles, ' + j.earth.air + ' s');
      row('Running jump (held)', 'lands ' + j.moon.run + ' tiles further', 'Earth: ' + j.earth.run + ' tiles; walking speed 6.6 tiles/s in both');
      row('Short tap', j.moon.tap + ' tiles high', 'Earth: ' + j.earth.tap + ' tiles; release early to keep it low');
      row('Gap (running jump, same height)', Object.entries(j.gap).map(([n, ok]) => n + ': ' + (ok ? 'yes' : 'no')).join(' · '), 'from a run-up, jump at the edge');
      row('Ledge (running jump from below)', Object.entries(j.ledge).map(([n, ok]) => n + ' higher: ' + (ok ? 'yes' : 'no')).join(' · '), 'jump held');
      row('Falling', 'top speed ' + j.maxFall + ' px/s (' + (j.maxFall / 32).toFixed(1) + ' tiles/s)', 'Earth 850 px/s');
      row('Level field gravity: 0.6', j.light.high + ' tiles high, ' + j.light.air + ' s, running jump ' + j.light.run + ' tiles', 'for "Schwerelos"; 1 is the default');
    }
    if (want('base')) {
      const b = raw.base = await lab('base');
      check(b.inBase && b.helmetOff && near(b.baseJump, 3.63, 0.1), 'inside a moon base: Earth gravity, helmet off', b);
      check(b.outside && b.outsideJump > 4.5, 'outside again: moon jump and helmet', b);
      row('Moon base (level field bases)', 'Earth jump ' + b.baseJump + ' tiles inside, ' + b.outsideJump + ' outside', 'counts by Mimo\'s centre; the helmet comes off inside');
    }
    if (want('dust')) { const d = raw.dust = await lab('dust'); check(d.puff >= 4, 'a dust puff on landing', d); }
    if (want('orbit')) {
      const o = raw.orbit = await lab('orbit');
      check(o.caught && near(o.turn, 2.4, 0.05) && near(o.radius, 2.5, 0.05), 'a small moon catches Mimo and turns him once in 2.4 s on a 2.5 tile orbit', o);
      check(o.top.side > 4 && o.left.up > 2 && o.bottom.side < -2, 'a jump press flings him off along the orbit (clockwise: right at the top, up on the left, left at the bottom)', { top: o.top, left: o.left, bottom: o.bottom });
      check(o.groundFree, 'a moon does not catch Mimo walking on the ground', o.groundFree);
      const ch = raw.chain = await lab('chain', 9);
      check(ch.seconds >= 0.12, 'flung from one moon into the orbit of the next (9 tiles apart)', ch);
      const pt = raw.pit = await lab('pit', 10, true), pf = raw.pitHold = await lab('pit', 10, false);
      check(pt.seconds >= 0.3, 'fling over a 10-tile pit (moon over its left edge): the jump press may come within at least 0.3 s', { steer: pt, hold: pf });
      const w = raw.window = await lab('window', 21, 9, 4, true);
      check(w.seconds >= 0.12, 'a 4-tile ledge 6.5 tiles right of the moon: a window of at least 0.12 s when Mimo steers', w);
      const ft = raw.flingTable = await lab('flingTable');
      row('Small moon (O)', 'orbit ' + o.radius + ' tiles, one turn ' + o.turn + ' s (' + o.speed + ' tiles/s), fling ' + o.launch + ' px/s', 'caught within 10 px outside the orbit while in the air; the ring shows the way it turns');
      row('Fling at the top (90°)', o.top.up + ' tiles up from the release, lands ' + o.top.side + ' tiles to the side after ' + o.top.air + ' s', 'stick held the way he flies; the dotted preview shows the way');
      row('Fling left (180°) / right (0°) / bottom (270°)', 'side ' + o.left.side + ' / ' + o.right.side + ' / ' + o.bottom.side + ' tiles', 'up ' + o.left.up + ' / ' + o.right.up + ' / ' + o.bottom.up);
      row('Fling table (stick held the way he flies)', ft.map((e) => e.deg + '°: peak ' + e.peak + ', lands ' + e.land).join(' · '), 'tiles: peak above the moon centre, landing x from the moon centre, ground 6.5 tiles under the centre');
      row('Release window, pit', '10-tile pit, the moon over its left edge, land beyond it: ' + pt.seconds + ' s with steering (' + (pt.degs ? pt.degs.join('° to ') + '°' : 'none') + '), ' + pf.seconds + ' s holding the way he flies', 'a moon of 2.4 s per turn turns 150° per s');
      row('Release window, ledge', '4-tile ledge 6.5 to 10.5 tiles right of the moon centre, 2.5 rows under it: ' + w.seconds + ' s with steering (' + (w.degs ? w.degs.join('° to ') + '°' : 'none') + ')', 'small targets want a big moon or a slow one');
      row('Release window, next moon', 'moon 9 tiles further right at the same height: ' + ch.seconds + ' s (' + (ch.degs ? ch.degs.join('° to ') + '°' : 'none') + ')', 'caught by the next orbit, stick held the way he flies');
    }
    if (want('meteor')) {
      const me = raw.meteor = await lab('meteor');
      check(near(me.warnLead, 1.3, 0.05) && near(me.flyTime, 0.5, 0.05), 'meteor: ring warns 1.3 s ahead, the rock is in the air 0.5 s', me);
      check(me.hitsOnSpot && me.safe[1.5] && me.safe[2], 'meteor hurts on the spot, 1.5 tiles beside it is safe', me.safe);
      check(me.crater, 'an impact leaves a crater for a while', me.crater);
      row('Meteor (M)', 'every ' + me.every + ' s, first impact at ' + me.firstImpact + ' s; ring ' + me.warnLead + ' s ahead, rock in the air ' + me.flyTime + ' s', 'hurts within ' + me.reach + ' px of the spot for ' + me.blast + ' s; safe from 1.5 tiles beside it (1 tile: ' + (me.safe[1] ? 'safe' : 'not safe') + ')');
    }
    if (want('stones')) {
      const s = raw.stones = await lab('stones');
      check(s.carries && s.driftCarries && near(s.drift, 6, 0.1), 'floating stones carry Mimo, bob and drift', s);
      check(s.cometDrops && s.cometTrip > 4, 'a comet carries Mimo along its way and dissolves at the end', s);
      row('Floating stone (=)', 'bobs ' + s.bob + ' tiles, drifts 2 × dx tiles (dx 3: ' + s.drift + ')', 'a run of n "=" is n × 32 − 4 px wide, its top at the top of its row; dips 4 px under Mimo');
      row('Comet (stone with comet: true)', 'waits ' + s.cometHold + ' s at its start (time to step on), flies ' + s.cometLen + ' tiles at ' + s.cometSpeed + ' tiles/s: gone after ' + s.cometTrip + ' s', 'fades the last 0.5 s; starts again after wait s; whoever is on it at the end falls');
    }
    if (want('boosts')) {
      const z = raw.boosts = await lab('boosts');
      check(z.used && z.lift > 3.5 && between(z.back, 2.3, 2.5), 'a shooting star throws Mimo up and comes back', z);
      row('Shooting star (Z)', 'throws Mimo ' + z.lift + ' tiles up from standing, a jump into one reaches ' + z.jumpPlusBoost + ' tiles', 'back after 2.4 s; touch it anywhere (box within 16 px of its centre)');
    }
    if (want('says')) { const sy = raw.says = await lab('says'); check(sy.saysFar === 0 && sy.saysNear === 1, 'says: Mimo says the line once when he comes near', sy); }
    if (want('dark')) { await look('darkLook'); check(true, 'darkness drawn'); }
    const bo = raw.bodies = await lab('bodies');
    check(bo.stoneBody, 'stones are bodies (the bot condition "body" sees them)', bo);
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
