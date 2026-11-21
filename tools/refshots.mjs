// Reference pictures of the game canvas, to prove that a refactor changes nothing a player can see.
// Every picture is made under fixed conditions: a fixed clock (Date.prototype.getHours/getMinutes), a seeded
// Math.random, the simulation held and stepped frame by frame, Mimo at fixed spots, light or dark colour scheme.
//
// Usage:
//   node tools/refshots.mjs --out dir                 record all pictures into dir
//   node tools/refshots.mjs --out dir --compare ref   record, then compare pixel by pixel with the pictures in ref
// The comparison prints every picture that differs (number of differing pixels) and writes <name>-diff.png next to it.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.out) { console.error('usage: node tools/refshots.mjs --out dir [--compare refdir]'); process.exit(2); }
const OUT = path.resolve(String(args.out));
fs.mkdirSync(OUT, { recursive: true });

// [name, level index, clock hour, Mimo spot in tiles (null = start), seconds to run before the picture]
const LEVEL_SCENES = [
  ['w1-aufwachen', 0, 12, null, 2.2], ['w1-schalter', 3, 12, [30, 2], 2.2], ['w1-schluessel', 6, 12, [40, 2], 2.2], ['w1-spitze', 9, 12, null, 2.2],
  ['w2-aufwind', 11, 12, null, 2.2], ['w2-takt', 13, 12, [20, 2], 2.2], ['w2-schnecken', 14, 12, [30, 2], 3], ['w2-baumkrone', 17, 12, null, 2.2],
  ['w3-eiszapfen', 21, 12, [20, 2], 3], ['w3-sturm', 24, 12, [40, 2], 2.2], ['w3-lawine', 27, 12, null, 3.5], ['w3-eishoehle', 25, 12, [30, 2], 2.2],
  ['night-pfad', 28, 23, null, 2.2],
  // dusk and night blend the sky by the clock (the evening forest only half way)
  ['dusk-w1', 0, 19, null, 2.2], ['dusk-w2', 14, 19, null, 2.2], ['dusk-w3', 21, 19, null, 2.2], ['late-w2', 10, 23, null, 2.2], ['late-w3', 20, 2, null, 2.2],
];
// [name, boss, seconds of fight after the intro]
const BOSS_SCENES = [['boss1-a', 1, 1.5], ['boss1-b', 1, 5], ['boss2-a', 2, 2], ['boss2-b', 2, 6], ['boss3-a', 3, 2], ['boss3-b', 3, 6]];

// ---------- runs inside the page ----------
function pageInit() {
  // the clock is set per scene through window.__hour
  window.__hour = 12;
  Date.prototype.getHours = function () { return window.__hour; };
  Date.prototype.getMinutes = function () { return 0; };
  // the day decides the daily level shown in the level list
  Date.now = () => 1763380800000;
  window.__seed = (n) => { let s = n; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };
  window.__seed(4242);
}
function sceneLevel([index, hour, spot, secs]) {
  const M = window.__mimo, G = M.G, T = 32;
  window.__hour = hour; window.__seed(1000 + index);
  for (const k of ['left', 'right', 'up', 'down', 'jump']) M.setKey(k, false);
  M.sim.hold(true); M.load(index);
  if (spot) { G.p.x = spot[0] * T + 5; G.p.y = spot[1] * T; G.respawn = { x: G.p.x, y: G.p.y }; }
  M.sim.step(Math.round(secs / M.sim.STEP));
  G.shake = 0;
}
function sceneBoss([w, secs]) {
  const M = window.__mimo, G = M.G;
  window.__hour = 12; window.__seed(2000 + w);
  M.progress.invincible = false; M.progress.zen = false;
  for (const k of ['left', 'right', 'up', 'down', 'jump']) M.setKey(k, false);
  M.sim.hold(true); M.startBoss(w);
  let t = 0;
  while (G.state === 'cine' && t < 20) { M.setKey('jump', Math.floor(t * 30) % 2 === 0); M.sim.step(1); t += M.sim.STEP; }
  M.setKey('jump', false);
  M.sim.step(Math.round(secs / M.sim.STEP));
  G.shake = 0;
}
// ---------- end of page code ----------

const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const canvasPng = (page) => page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
const save = (name, dataUrl) => fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));

async function record(browser, scheme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 }, deviceScaleFactor: 1, colorScheme: scheme });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(pageInit);
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  const names = [];
  for (const [name, ...scene] of LEVEL_SCENES) {
    await page.evaluate(sceneLevel, scene); await frames(page);
    save(scheme + '-' + name, await canvasPng(page)); names.push(scheme + '-' + name);
  }
  for (const [name, ...scene] of BOSS_SCENES) {
    await page.evaluate(sceneBoss, scene); await frames(page);
    save(scheme + '-' + name, await canvasPng(page)); names.push(scheme + '-' + name);
  }
  // the level list with a save that has finished worlds 1 to 3 (DOM picture, fonts fall back the same way every time)
  await page.evaluate(() => {
    const M = window.__mimo, p = M.progress; window.__hour = 12;
    p.unlocked = 28; p.best = {}; p.stars = {};
    for (let i = 0; i < 28; i++) { p.best[i] = 60; p.stars[i] = 3; }
    p.bosses = { 1: { best: 90 }, 2: { best: 95 }, 3: { best: 99 } };
    M.G.L = null; document.getElementById('btnLevels').click();
  });
  await frames(page);
  const list = page.locator('#ovLevels .card');
  await list.evaluate((el) => { el.style.maxHeight = 'none'; el.style.overflow = 'visible'; });
  await list.screenshot({ path: path.join(OUT, scheme + '-levelgrid.png') }); names.push(scheme + '-levelgrid');
  await page.close();
  if (errors.length) console.log('page errors (' + scheme + '): ' + errors.join(' | '));
  return names;
}

async function compare(browser, names, refDir) {
  const page = await browser.newPage();
  let differ = 0;
  for (const name of names) {
    const a = path.join(OUT, name + '.png'), b = path.join(refDir, name + '.png');
    if (!fs.existsSync(b)) { console.log('NEW  ' + name + ' (no reference picture)'); differ++; continue; }
    if (fs.readFileSync(a).equals(fs.readFileSync(b))) { console.log('same ' + name); continue; }
    const r = await page.evaluate(async ([ua, ub]) => {
      const load = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
      const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
      g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height);
      let n = 0; const out = db.data;
      for (let i = 0; i < da.length; i += 4) {
        const d = da[i] !== out[i] || da[i + 1] !== out[i + 1] || da[i + 2] !== out[i + 2] || da[i + 3] !== out[i + 3];
        if (d) { n++; out[i] = 255; out[i + 1] = 0; out[i + 2] = 80; out[i + 3] = 255; } else out[i + 3] = 40;
      }
      g.putImageData(db, 0, 0);
      return { n, diff: c.toDataURL('image/png') };
    }, ['data:image/png;base64,' + fs.readFileSync(a).toString('base64'), 'data:image/png;base64,' + fs.readFileSync(b).toString('base64')]);
    if (r.size) { console.log('DIFF ' + name + ' size ' + r.size.join('x')); differ++; continue; }
    if (r.n === 0) { console.log('same ' + name + ' (pixels equal, file bytes differ)'); continue; }
    differ++; console.log('DIFF ' + name + ' · ' + r.n + ' pixels');
    fs.writeFileSync(path.join(OUT, name + '-diff.png'), Buffer.from(r.diff.split(',')[1], 'base64'));
  }
  await page.close();
  return differ;
}

const srv = await serveSrc();
const browser = await chromium.launch();
let differ = 0;
try {
  const names = [...await record(browser, 'light'), ...await record(browser, 'dark')];
  console.log(names.length + ' pictures in ' + OUT);
  if (args.compare) differ = await compare(browser, names, path.resolve(String(args.compare)));
} finally { await browser.close(); srv.close(); }
if (args.compare) console.log(differ ? differ + ' picture(s) differ' : 'all pictures identical');
process.exit(differ ? 1 : 0);
