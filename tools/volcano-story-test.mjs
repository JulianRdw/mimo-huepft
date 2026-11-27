// Silent check of the story engine in world 5 (src/worlds/volcano-story*.js, volcano-gags.js): a test cast with every new act,
// prop and named figure is put on a flat stretch of the first level of the world, the game is stepped, Mimo picks up the part and
// hands it over. Checks: no script errors, the part is stored in "mimo.volcano.parts", the owner takes it, the hat counts parts.
// Usage: node tools/volcano-story-test.mjs [--shots dir]   (--shots also writes pictures of the stage, light and dark)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.shots) fs.mkdirSync(path.resolve(String(args.shots)), { recursive: true });
let failed = 0;
const check = (ok, label, value) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (value != null ? ' · ' + JSON.stringify(value) : '')); if (!ok) failed++; };

// runs in the page: find a flat stretch, build the cast, load the level
function stage(first) {
  const M = window.__mimo, W = M.worldApi, def = M.LEVELS[first];
  M.sim.hold(true); M.load(first);
  const at = { x: 4, y: 8 };
  const X = (k) => at.x + k, Y = at.y;
  def.cast = [
    { who: 'striped', x: X(2), y: Y, act: 'bench', pack: 4, tag: 'sleeper' },
    { who: 'sidepart', x: X(7), y: Y, act: 'thumbs', scarf: true },
    { who: 'redbeard', x: X(10), y: Y, act: 'grill', sausage: 'coal' },
    { who: 'reporter', x: X(13), y: Y, act: 'sweat' },
    { who: 'filmer', x: X(16), y: Y, act: 'read', holds: {}, pack: 2 },
    { who: 'kid', x: X(19), y: Y, act: 'eyes' },
    { who: 'professor', x: X(22), y: Y, act: 'duck' },
    { who: 'dog', x: X(25), y: Y, act: 'stand' },
    { who: 'goat', x: X(28), y: Y, line: 'Mäh.' },
    { who: 'egg', x: X(31), y: Y, crack: 2 },
    { who: 'baby', x: X(33), y: Y },
    ...[1, 2, 3, 4, 5].map((n, i) => ({ who: 'prop', kind: 'cairn', size: n, x: X(36 + i * 2), y: Y })),
    { who: 'prop', kind: 'flag', x: X(47), y: Y }, { who: 'prop', kind: 'summitbook', x: X(49), y: Y }, { who: 'prop', kind: 'thermos', x: X(51), y: Y },
    { who: 'prop', kind: 'tripod', x: X(52), y: Y }, { who: 'prop', kind: 'camera', x: X(54), y: Y, timer: 3, t0: 0 },
    ...[0, 1, 2, 3, 4].map((n, i) => ({ who: 'prop', kind: 'backpack', stage: n, x: X(56 + i * 2), y: Y })), { who: 'prop', kind: 'ember', x: X(67), y: Y },
  ];
  def.part = { x: X(5), y: Y - 1, item: 'flag', ownerAt: { x: X(44), y: Y } };
  def.says = [{ x: X(1), y: Y, r: 3, text: 'Teststimme.' }];
  M.load(first);
  // a flat arena of 72 columns cut into the level (clear air above, solid ground below), so the test does not depend on the map
  const L = M.G.L;
  for (let k = 0; k < 72; k++) { for (let y = at.y - 5; y <= at.y; y++) W.setTile(at.x + k, y, W.TILE.EMPTY); for (let y = at.y + 1; y <= Math.min(L.h - 1, at.y + 2); y++) W.setTile(at.x + k, y, W.TILE.SOLID); }
  return { at, w: L.w };
}

const srv = await serveSrc();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 768 }, deviceScaleFactor: args.zoom ? 4 : 2 });
  await page.addInitScript(() => { Date.prototype.getHours = () => 12; Date.prototype.getMinutes = () => 0; });   // noon: the same light every run
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(srv.url + '?vorschau'); // world 5 is held back (UNRELEASED_WORLDS) without it
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  await page.evaluate(() => window.MimoCoast.castKit.preload());
  await page.waitForFunction(() => window.MimoCoast.castKit.ready(), null, { timeout: 30000 });
  const first = await page.evaluate(() => window.__mimo.WORLDS[5].firstLevel);
  const st = await page.evaluate(stage, first);
  check(!st.error, 'flat stretch for the test cast', st);
  const shot = async (name, from, hour) => {
    if (!args.shots) return;
    await page.evaluate(([from]) => { const M = window.__mimo, G = M.G; G.p.x = (from) * 32; G.p.y = (8 + 1) * 32 - G.p.h; M.sim.step(Math.round(3.5 / M.sim.STEP)); G.shake = 0; }, [from]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.locator('#game').screenshot({ path: path.join(path.resolve(String(args.shots)), name + '.png') });
  };
  const at = st.at;
  // the stage in pictures: the people, then the props, then the pack stages
  for (const [name, off] of [['people-a', 3], ['people-b', 17], ['named', 27], ['props', 41], ['packs', 54]]) await shot(name, at.x + off);
  // --zoom dir: a close picture of every figure and prop (the camera is moved next to it, the crop is 3x)
  if (args.zoom) {
    const dir = path.resolve(String(args.zoom)); fs.mkdirSync(dir, { recursive: true });
    const names = ['bench', 'thumbs', 'grill', 'sweat', 'read', 'eyes', 'duck', 'dog', 'goat', 'egg', 'baby'];
    const offs = [2, 7, 10, 13, 16, 19, 22, 25, 28, 31, 33, ...[36, 38, 40, 42, 44].map((o) => o), 47, 49, 51, 52, 54, 56, 58, 60, 62, 64, 67];
    names.push('cairn1', 'cairn2', 'cairn3', 'cairn4', 'cairn5', 'flag', 'book', 'thermos', 'tripod', 'camera', 'pack0', 'pack1', 'pack2', 'pack3', 'pack4', 'ember');
    for (let i = 0; i < offs.length; i++) {
      await page.evaluate(([x, y]) => { const M = window.__mimo, G = M.G; G.p.x = (x - 2) * 32; G.p.y = (y + 1) * 32 - G.p.h; G.p.vx = 0; M.sim.step(Math.round(2 / M.sim.STEP)); G.shake = 0; }, [at.x + offs[i], at.y]);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const box = await page.evaluate(([x, y]) => { const r = document.getElementById('game').getBoundingClientRect(), G = window.__mimo.G, k = r.width / window.__mimo.worldApi.view.w; return { x: r.x + (x * 32 + 16 - G.cam.x) * k, y: r.y + ((y + 1) * 32 - G.cam.y) * k }; }, [at.x + offs[i], at.y]);
      await page.screenshot({ path: path.join(dir, String(i).padStart(2, '0') + '-' + names[i] + '.png'), clip: { x: Math.max(0, box.x - 90), y: Math.max(0, box.y - 150), width: 180, height: 170 } });
    }
  }
  // the engine state: story exists, figures built, the part is a find with the owner of its item
  const info = await page.evaluate(() => { const s = window.__mimo.G.L.story; const sc = window.MimoVolcano.scenes.scripts.opening, def = window.__mimo.LEVELS[window.__mimo.G.levelIndex]; return { cast: s.cast.length - (def.opening ? sc.cast.length : 0), owners: s.find ? s.find.owners.map((o) => o.who) : null, item: s.find && s.find.item, gag: s.find && s.find.gag, peek: s.find && s.find.peek }; });
  check(info.cast === 27 && info.item === 'flag' && info.owners && info.owners[0] === 'kid' && info.gag === 'flagPlant' && info.peek === false, 'the story of the level: cast, the part with its owner and gag', info);
  // Mimo touches the part: it is stored under the key of world 5 and not under the coast's
  await page.evaluate(([x, y]) => { const M = window.__mimo, G = M.G; G.p.x = x * 32; G.p.y = y * 32; M.sim.step(30); }, [at.x + 5, at.y - 1]);
  const stored = await page.evaluate(() => ({ parts: localStorage.getItem('mimo.volcano.parts'), coast: localStorage.getItem('mimo.coast.finds') }));
  check(stored.parts && JSON.parse(stored.parts)[first] === 1 && !stored.coast, 'the part is stored in mimo.volcano.parts', stored);
  // the hand-over: Mimo walks up to the owner, who takes it
  await page.evaluate(([x, y]) => { const M = window.__mimo, G = M.G; G.p.x = x * 32; G.p.y = (y - 1) * 32; G.p.vx = 0; M.sim.step(Math.round(4 / M.sim.STEP)); }, [at.x + 44, at.y]);
  await shot('handover', at.x + 38);
  const handed = await page.evaluate(() => { const f = window.__mimo.G.L.story.find; return { handed: f.handed, carry: f.carry }; });
  check(handed.handed === true, 'the owner takes the part at the hand-over', handed);
  // the opening scene (volcano-scenes.js): plays once, the cast stands where the script ends it, the game goes on
  await page.evaluate((first) => { const M = window.__mimo; window.MimoVolcano.forceOpening = true; window.MimoVolcano.openingReset(); M.LEVELS[first].opening = true; M.LEVELS[first].cast = []; M.LEVELS[first].part = null; M.load(first); M.sim.step(6); }, first);
  const opening = await page.evaluate(() => ({ state: window.__mimo.G.state, cast: window.__mimo.G.L.story.cast.length }));
  check(opening.state === 'cine' && opening.cast === 8, 'the opening starts as a scene with its eight figures', opening);
  for (const sec of [1.5, 5.9, 7.6, 9, 11]) {
    await page.evaluate((sec) => { const M = window.__mimo; while (M.G.state === 'cine' && M.G.stateT < sec) M.sim.step(10); }, sec);
    if (args.shots) await page.locator('#game').screenshot({ path: path.join(path.resolve(String(args.shots)), 'opening-' + sec + '.png') });
  }
  await page.evaluate(() => { const M = window.__mimo; let n = 0; while (M.G.state === 'cine' && n++ < 400) M.sim.step(30); M.sim.step(60); });
  const after = await page.evaluate(() => { const G = window.__mimo.G, st = G.L.story; return { state: G.state, stored: !!localStorage.getItem('mimo.volcano.opening'), jul: st.cast.find((e) => e.sk === 'jul').x0 - (G.L.start.x + 0.5) * 32, end: window.MimoVolcano.scenes.scripts.opening.cast.find((c) => c.k === 'jul').end.dx }; });
  check(after.state === 'play' && after.stored && Math.round(after.jul) === Math.round(after.end), 'after the opening the game plays, the family stands at the end places', after);
  // the closing scene as the scene of a boss
  await page.evaluate(() => { const M = window.__mimo; window.MimoVolcano.forceClosing = true; M.progress.invincible = true; M.startBoss(5); let n = 0; while (M.G.state === 'cine' && n++ < 400) { M.setKey('jump', n % 2 === 0); M.sim.step(10); } M.setKey('jump', false); M.sim.step(30); });
  const started = await page.evaluate(() => window.MimoVolcano.scenes.start('closing', window.__mimo.G.boss));
  check(started === true, 'the closing scene starts for the boss');
  if (started) {
    for (const sec of [2, 4.5, 7.5, 10]) {
      await page.evaluate((sec) => { const M = window.__mimo, G = M.G; let n = 0; while (G.boss && G.boss.cine && G.boss.cine.t < sec && n++ < 600) M.sim.step(10); }, sec);
      if (args.shots) await page.locator('#game').screenshot({ path: path.join(path.resolve(String(args.shots)), 'closing-' + sec + '.png') });
    }
    await page.evaluate(() => { const M = window.__mimo; let n = 0; while (!window.MimoVolcano.scenes.finished() && n++ < 600) M.sim.step(30); });
    check(await page.evaluate(() => window.MimoVolcano.scenes.finished()), 'the closing scene ends');
  }
  // dark scheme: the same stage again without errors
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot('people-dark', at.x + 3);
  check(errors.length === 0, 'no script errors', errors);
} finally { await browser.close(); srv.close(); }
console.log(failed ? failed + ' check(s) failed' : 'all checks pass');
process.exit(failed ? 1 : 0);
