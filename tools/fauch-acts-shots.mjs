// Pictures of the Fauch acts of volcano-fauch-acts.js in the game: each act is put on a flat stretch of the first level of world 5,
// Mimo walks up to its trigger, the game is stepped and pictures are taken at given times.
// Usage: node tools/fauch-acts-shots.mjs --out dir [--only brood,wave]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const out = path.resolve(String(args.out || 'test-shots/t2')); fs.mkdirSync(out, { recursive: true });
const only = args.only ? String(args.only).split(',') : null;
const AT = { x: 4, y: 8 };
// each scene: the cast, where Mimo stands, the times (seconds since the trigger) of the pictures, ops run at a time
const SCENES = {
  brood: { cast: [{ who: 'fauch', act: 'brood', x: 22, y: 8, face: -1, scale: 0.9, at: 18, tag: 'f', then: [{ by: 'player', text: 'Hm. Was versteckt er da?' }] }], mimo: 15, to: 19, shots: [0.2, 1.1, 1.4, 2.0, 3.0, 4.6] },
  sleepwith: {
    cast: [{ who: 'striped', x: 22, y: 8, act: 'bench', pack: 4, tag: 'sleeper' }, { who: 'fauch', act: 'sleepwith', x: 18.2, y: 8, face: 1, scale: 0.9, at: 12, tag: 'f', snoreWith: 'sleeper' }], mimo: 8, to: 12.6,
    shots: [1.8, 3.0, 4.4, 5.4, 7.2, 8.6], startle: 9.0, after: [9.15, 9.6, 10.4, 11.4],
  },
  wave: { cast: [{ who: 'prop', kind: 'cairn', size: 5, x: 22, y: 8 }, { who: 'fauch', act: 'wave', x: 22, y: 5.2, face: -1, scale: 0.7, manual: true, tag: 'f' }], mimo: 14, go: 0.5, shots: [0.3, 1.8, 2.5, 3.2, 4.0, 5.5, 7.8] },
  ringout: { cast: [{ who: 'fauch', act: 'ringout', x: 24, y: 6, dir: 1, manual: true, tag: 'f' }], mimo: 14, go: 0.3, shots: [0.6, 1.6, 2.6, 3.6, 4.6] },
};

const srv = await serveSrc();
const browser = await chromium.launch();
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 }, deviceScaleFactor: 1.5 });
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
  for (const [name, sc] of Object.entries(SCENES)) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(([first, sc, AT]) => {
      const M = window.__mimo, W = M.worldApi, def = M.LEVELS[first];
      M.sim.hold(true); M.progress.invincible = true;
      def.cast = sc.cast; def.says = []; def.scene = null; def.scenes = null; def.part = null; def.find = null; def.opening = false;
      M.load(first);
      const L = M.G.L;
      for (let k = 0; k < 60; k++) { for (let y = AT.y - 12; y <= AT.y; y++) W.setTile(AT.x + k, y, W.TILE.EMPTY); for (let y = AT.y + 1; y <= Math.min(L.h - 1, AT.y + 2); y++) W.setTile(AT.x + k, y, W.TILE.SOLID); }
      const G = M.G; G.p.x = (AT.x + sc.mimo) * 32; G.p.y = (AT.y + 1) * 32 - G.p.h; G.p.vx = 0; G.p.vy = 0; G.respawn = { x: G.p.x, y: G.p.y };
    }, [first, sc, AT]);
    // walk right until the trigger (or go at once), then count from there
    const t0 = await page.evaluate(() => window.__mimo.G.time || window.MimoWorlds && 0);
    const step = (secs) => page.evaluate((s) => { const M = window.__mimo; M.sim.step(Math.round(s / M.sim.STEP)); return true; }, secs);
    const snap = async (label) => { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.locator('#game').screenshot({ path: path.join(out, name + '-' + label + '.png') }); };
    await step(0.5);
    if (sc.to != null) { await snap('pre'); await page.evaluate(([to, y]) => { const G = window.__mimo.G; G.p.x = to * 32; G.p.y = (y + 1) * 32 - G.p.h; G.p.vx = 0; G.p.vy = 0; }, [sc.to, AT.y]); }
    if (sc.go != null) { await page.evaluate(() => window.MimoVolcano.fauchGo('f')); }
    // wait until the act has started (e.t0 set), measure from there
    let started = false;
    for (let i = 0; i < 200 && !started; i++) { await step(0.1); started = await page.evaluate(() => { const st = window.__mimo.G.L.story; return !!st && st.cast.some((e) => e.who === 'fauch' && e.t0 != null); }); }
    if (!started) { console.log('FAIL ' + name + ' never started'); failed++; continue; }
    const base = await page.evaluate(() => { const e = window.__mimo.G.L.story.cast.find((c) => c.who === 'fauch'); return window.__mimo.G.time != null ? 0 : 0; });
    let now = 0;
    for (const t of sc.shots) {
      if (sc.startle != null && now < sc.startle && t > sc.startle) { await step(sc.startle - now); now = sc.startle; await page.evaluate(() => window.MimoVolcano.fauchStartle('f')); }
      await step(Math.max(0, t - now)); now = Math.max(now, t);
      await snap(String(t).replace('.', '_'));
    }
    if (sc.startle != null) { await step(Math.max(0, sc.startle - now)); now = Math.max(now, sc.startle); await page.evaluate(() => window.MimoVolcano.fauchStartle('f')); }
    if (sc.after) for (const t of sc.after) { await step(Math.max(0, t - now)); now = Math.max(now, t); await snap(String(t).replace('.', '_')); }
    console.log('ok   ' + name);
  }
  if (errors.length) { console.log('FAIL errors:\n' + errors.join('\n')); failed++; }
} finally { await browser.close(); srv.close(); }
process.exit(failed ? 1 : 0);
