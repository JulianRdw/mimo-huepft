// Picture lab for the figure acts of world 5 (volcano-story-acts2.js, -draw2.js, -pets.js): puts a cast on a flat stretch of the
// first level, runs the scene ops at game time 0 and takes close pictures at the given times.
// Usage: node tools/volcano-acts-lab.mjs --out test-shots/t1 [--only name,name] [--scale 3]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const out = path.resolve(String(args.out || 'test-shots/t1')); fs.mkdirSync(out, { recursive: true });
const only = args.only ? String(args.only).split(',') : null;
const AX = 4, AY = 8;   // arena origin (tile)
// each scenario: cast (x relative to the arena), ops (run at time 0, tiles relative: ['go', tag, ...] needs no tiles), shots (seconds), cx = centre (tile), w = crop width px
const S = [
  { name: 'thesis', cx: 3, cast: [{ who: 'professor', x: 0, y: 0, act: 'teach', aim: [4, -1], talk: true, face: 1, tag: 'p' }, { who: 'prop', kind: 'thesis', x: 4, y: 0, state: 'kein', tag: 'b' }], shots: [0.6], later: [[1.5, [['state', 'b', 'strich']]], [3, [['state', 'b', 'papa']]], [5.5, [['state', 'b', 'herz']]]], extra: [2.4, 4.6, 6.4] },
  { name: 'sleepers', cx: 2, cast: [{ who: 'prop', kind: 'sleepers', x: 2, y: 0, tag: 's' }, { who: 'professor', x: -1, y: 0, act: 'teach', aim: [2, -1], talk: true, face: 1 }], ops: [['go', 's']], shots: [1, 4, 7] },
  { name: 'pickup', cx: 1, cast: [{ who: 'professor', x: 0, y: 0, act: 'pickup', face: 1, tag: 'p' }], ops: [['go', 'p']], shots: [0.3, 1.1, 1.8, 3, 4.2, 5.2] },
  { name: 'grill-double', cx: 1, cast: [{ who: 'redbeard', x: 0, y: 0, act: 'grill2', stick: 'double', face: 1, tag: 'r' }], ops: [['go', 'r']], shots: [0.5, 3.5] },
  { name: 'grill-tele', cx: 2, cast: [{ who: 'redbeard', x: 0, y: 0, act: 'grill2', stick: 'tele', face: 1, tag: 'r' }], ops: [['go', 'r']], shots: [0.5, 2, 3.2, 4.5] },
  { name: 'grill-shield', cx: 1, cast: [{ who: 'redbeard', x: 0, y: 0, act: 'grill2', stick: 'shield', snatch: 4, face: 1, tag: 'r' }], ops: [['go', 'r']], shots: [1, 3.5, 4.15, 5, 6.5] },
  { name: 'kick', cx: 3, w: 130, cast: [{ who: 'redbeard', x: 0, y: 0, act: 'stand', face: 1, tag: 'r' }, { who: 'prop', kind: 'rollstone', x: 1, y: 0, x2: 6, dur: 1.8, drop: 2, tag: 'st' }], ops: [['kick', 'r', 'st']], shots: [0.5, 0.9, 1.6, 2.6, 3.4, 4.5] },
  { name: 'sleepwalk', cx: 4, w: 190, cast: [{ who: 'striped', x: 0, y: 0, act: 'sleepwalk', x2: 8, dur: 10, pack: 3, face: 1, tag: 's' }], ops: [['go', 's']], shots: [0.5, 3, 6, 9] },
  { name: 'rummage', cx: 0, cast: [{ who: 'striped', x: 1, y: 0, act: 'rummage', pack: 4, face: 1, tag: 's' }], ops: [['go', 's']], shots: [0.7, 1.6, 2.4, 3.2, 4.2, 6, 8.2, 9.5] },
  { name: 'stuck', cx: 1, cast: [{ who: 'striped', x: 1, y: 0, act: 'stuck', pack: 4, face: 1, tag: 's' }], ops: [['go', 's']], shots: [0.4, 2, 4.1, 4.3, 5.5] },
  { name: 'count', cx: 4, w: 130, cast: [{ who: 'filmer', x: 0, y: 0, act: 'count', targets: [2, 4, 6, 8], face: 1, tag: 'f' }, { who: 'kid', x: 2, y: 0 }, { who: 'reporter', x: 4, y: 0 }, { who: 'redbeard', x: 6, y: 0 }, { who: 'professor', x: 8, y: 0 }], ops: [['go', 'f']], shots: [0.3, 1.2, 2.1, 3, 4] },
  { name: 'polaroid', cx: 4, w: 190, cast: [{ who: 'prop', kind: 'polaroid', x: 0, y: 0, t0: 0, fauch: true, tag: 'p' }, { who: 'prop', kind: 'photostack', x: 4, y: 0, tag: 'ps' }, { who: 'prop', kind: 'scarfrail', x: 7, y: 0, x2: 12 }], ops: [['go', 'p'], ['go', 'ps']], shots: [0.3, 1.5, 5, 7] },
  { name: 'reporter', cx: 5, w: 190, cast: [{ who: 'reporter', x: 0, y: 0, act: 'interview', aim: [3, -1], face: 1, tag: 'a' }, { who: 'reporter', x: 5, y: 0, act: 'weather', face: 1, tag: 'b' }, { who: 'reporter', x: 9, y: 0, act: 'live', face: 1, tag: 'c' }], ops: [['go', 'b']], shots: [0.5, 2.8, 5.5] },
  { name: 'roof', cx: 2.5, w: 130, cast: [{ who: 'sidepart', x: 2, y: 0, act: 'roof', scarf: true, face: 1, tag: 'sp' }, { who: 'kid', x: 0, y: 0, act: 'duck' }, { who: 'filmer', x: 4, y: 0, act: 'duck' }, { who: 'professor', x: 5, y: 0, act: 'duck' }], shots: [1], later: [] },
  { name: 'share', cx: 2.5, w: 110, cast: [{ who: 'sidepart', x: 2, y: 0, act: 'stand', scarf: true, face: 1, tag: 'sp' }, { who: 'kid', x: 0, y: 0, tag: 'k' }, { who: 'filmer', x: 4, y: 0, tag: 'f' }, { who: 'professor', x: 5.6, y: 0, tag: 'p' }], ops: [['share', 'sp', ['k', 'f', 'p'], 1.3]], shots: [0.4, 1.6, 3, 5] },
  { name: 'kid', cx: 3.5, w: 160, cast: [{ who: 'kid', x: 0, y: 0, act: 'wavebig', aim: [6, -4], face: 1, tag: 'w' }, { who: 'kid', x: 3, y: 0, act: 'tryhop', face: 1, tag: 'a' }, { who: 'kid', x: 7, y: 0, act: 'hop', face: 1, tag: 'b' }], ops: [['go', 'a'], ['go', 'b']], shots: [0.2, 0.45, 0.8, 1.2, 1.8, 2.6] },
  { name: 'dog', cx: 6, w: 200, cast: [{ who: 'dog', x: 0, y: 0, act: 'hint', aim: [4, -4], face: 1, tag: 'd' }, { who: 'dog', x: 3, y: 0, act: 'chase', follow: { x1: 5, x2: 11, dur: 3.5 }, face: 1, tag: 'c' }, { who: 'goat', x: 12, y: 0, act: 'perch', face: -1, tag: 'g', line: 'Mäh.' }], ops: [['go', 'd'], ['go', 'c']], shots: [0.1, 0.7, 1.5, 3, 4.2, 5.5] },
];

const srv = await serveSrc();
const browser = await chromium.launch();
let bad = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 }, deviceScaleFactor: Number(args.scale || 3) });
  await page.addInitScript(() => { Date.prototype.getHours = () => 12; Date.prototype.getMinutes = () => 0; });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  await page.evaluate(() => window.MimoCoast.castKit.preload());
  await page.waitForFunction(() => window.MimoCoast.castKit.ready(), null, { timeout: 30000 });
  const first = await page.evaluate(() => window.__mimo.WORLDS[5].firstLevel);
  for (const sc of S) {
    if (only && !only.includes(sc.name)) continue;
    await page.evaluate(([first, sc, AX, AY]) => {
      const M = window.__mimo, W = M.worldApi, def = M.LEVELS[first];
      M.sim.hold(true); M.load(first);
      const o = AX + 3; def.cast = sc.cast.map((c) => ({ ...c, x: o + c.x, y: AY + c.y, ...(c.x2 != null ? { x2: o + c.x2 } : {}), ...(c.aim ? { aim: [o + c.aim[0], AY + c.aim[1]] } : {}), ...(c.targets ? { targets: c.targets.map((t) => o + t) } : {}), ...(c.follow ? { follow: { ...c.follow, x1: o + c.follow.x1, x2: o + c.follow.x2 } } : {}) })); def.part = null; def.says = []; def.opening = false;
      M.load(first);
      const L = M.G.L;
      for (let k = 0; k < 40; k++) { for (let y = AY - 7; y <= AY; y++) W.setTile(AX + k, y, W.TILE.EMPTY); for (let y = AY + 1; y <= Math.min(L.h - 1, AY + 2); y++) W.setTile(AX + k, y, W.TILE.SOLID); }
      const G = M.G; G.p.x = (AX + 3 + sc.cx - 5.5) * 32; G.p.y = (AY + 1) * 32 - G.p.h; G.p.vx = 0;
      M.sim.step(Math.round(3.5 / M.sim.STEP));
      window.__t0 = G.time != null ? G.time : 0;
    }, [first, sc, AX, AY]);
    const tl = [...(sc.ops ? [[0, sc.ops]] : []), ...(sc.later || [])].map(([t, o]) => [t, o]);
    const shots = [...sc.shots, ...(sc.extra || [])].sort((a, b) => a - b);
    let now = 0;
    const evs = [...tl.map(([t, o]) => ({ t, o })), ...shots.map((t) => ({ t, shot: true }))].sort((a, b) => a.t - b.t || (a.shot ? 1 : -1));
    for (const ev of evs) {
      if (ev.t > now) { await page.evaluate((dt) => { const M = window.__mimo; M.sim.step(Math.round(dt / M.sim.STEP)); }, ev.t - now); now = ev.t; }
      if (ev.o) { await page.evaluate((o) => window.MimoVolcano.skit.run(o), ev.o); continue; }
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const box = await page.evaluate(([x, y]) => { const r = document.getElementById('game').getBoundingClientRect(), G = window.__mimo.G, k = r.width / window.__mimo.worldApi.view.w; return { x: r.x + (x * 32 + 16 - G.cam.x) * k, y: r.y + ((y + 1) * 32 - G.cam.y) * k, k }; }, [AX + 3 + sc.cx, AY]);
      const hw = (sc.w || Number(args.w || 150)) * box.k, hh = 100 * box.k;
      await page.screenshot({ path: path.join(out, sc.name + '-' + String(ev.t).replace('.', '_') + '.png'), clip: { x: Math.max(0, box.x - hw), y: Math.max(0, box.y - hh), width: hw * 2, height: hh + 30 * box.k } });
    }
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no script errors'); if (errors.length) bad = 1;
} finally { await browser.close(); srv.close(); }
process.exit(bad);
