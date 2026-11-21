// Proves that the world API carries a whole world: a tiny test world (tools/worldapi/testworld.js) is served next to the
// game, as if it were the next world in src/worlds/, and is played and checked. It never ships with the game.
// Checked: it loads without errors, the level tools see it, a scripted run wins it (riding a body, an own tile, a physics
// region), the level list shows it, a save with worlds 1-3 finished finds it open and a fresh save does not, ?offen opens it
// without touching the save, its boss can be beaten and leaves its costume, the flow after the bosses is right, and
// worlds 1-3 keep their indices and medal times.
// Usage: node tools/worldapi-test.mjs [--shots dir]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { ROOT, SRC, serveSrc, srcWorlds, unreleasedWorlds, releaseWorldFiles, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const shots = args.shots ? path.resolve(String(args.shots)) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (ok, label, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (extra != null && extra !== '' ? ' · ' + extra : '')); if (!ok) failed++; };

// ---------- the test world after the real ones ----------
// It takes world number 9 (or the next one after the real worlds, should they ever reach 9), so it never collides with
// a world that is being built (5 Vulkaninsel, 6 Mond); a gap in the numbers is allowed. It joins the game as released,
// right after the released worlds (the ones in UNRELEASED_WORLDS are held back and take no index).
const HELD = unreleasedWorlds();
const game = srcWorlds([], { release: true }), every = srcWorlds();
const WORLD = Math.max(8, ...game.worlds.map((w) => w.world)) + 1, FIRST = game.levels.length;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mimo-worldapi-'));
const testFile = path.join(tmp, 'apitest.js');
fs.writeFileSync(testFile, fs.readFileSync(path.join(ROOT, 'tools', 'worldapi', 'testworld.js'), 'utf8').replace(/__WORLD__/g, String(WORLD)).replace(/__FIRST__/g, String(FIRST)));
const withTest = srcWorlds([testFile], { release: true });
check(withTest.levels.length === FIRST + 1 && withTest.levels[FIRST].name === 'Testlauf', 'Leveltools sehen die Testwelt', 'Welt ' + WORLD + ', Level-Index ' + FIRST);

// the core numbers as they are written in src/index.html, to prove nothing moved
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const MEDALS_SRC = JSON.parse(html.match(/const MEDALS = (\[.*\]);/)[1]);
const CORE = game.levels.slice(0, game.core).map((l) => JSON.stringify([l.name, l.world, !!l.night, l.map, l.movers || [], l.chase || null]));

// ---------- page helpers ----------
const SAVE_KEY = 'mimo-progress-v2';
const finishedSave = () => {
  const best = {}, stars = {};
  for (let i = 0; i < 28; i++) { best[i] = 30 + i; stars[i] = 3; }
  // the real worlds of src/worlds/ that come before the test world are finished too (their bosses as well)
  const bosses = { 1: { best: 80 }, 2: { best: 90 }, 3: { best: 99 } };
  for (let i = game.core; i < FIRST; i++) { best[i] = 40; stars[i] = 3; }
  for (const w of game.worlds) if (w.boss) bosses[w.world] = { best: 99 };
  // the real situation: all levels and bosses before the test world done, unlocked at the old maximum
  return { levelsVersion: 3, unlocked: 28, best, stars, bosses, outfit: { color: 'c_blue', hat: 'h_leaf', acc: 'a_none' } };
};
async function openPage(browser, { save, query, noTest } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // the test world is served as worlds/apitest.js and loaded right after the game's own world files
  await page.route(/\/worlds\/apitest\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(testFile, 'utf8') }));
  if (!noTest) await page.route(/\/(index\.html)?(\?.*)?$/, async (r) => {
    const res = await r.fetch(), body = await res.text();
    r.fulfill({ response: res, body: body.replace('<!-- world files end -->', '<script src="worlds/apitest.js"></script>\n<!-- world files end -->') });
  });
  await page.addInitScript(([key, save]) => {
    Date.prototype.getHours = function () { return 12; };
    if (save) localStorage.setItem(key, JSON.stringify(save));
  }, [SAVE_KEY, save || null]);
  await page.goto(srv.url + (query || ''));
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  return { page, ctx, errors };
}
const gridCard = (page, index) => page.evaluate((i) => {
  document.getElementById('btnLevels').click();
  const card = [...document.querySelectorAll('#levelGrid .lvl-card')].find((b) => b.querySelector('.num').textContent === String(i + 1));
  const heads = [...document.querySelectorAll('#levelGrid .world-head')].map((h) => h.textContent);
  const boss = [...document.querySelectorAll('#levelGrid .lvl-card.boss')].map((b) => ({ name: b.querySelector('.name').textContent, open: !b.disabled }));
  document.getElementById('btnLevelsBack').click();
  return { found: !!card, open: !!card && !card.disabled, heads, boss, cta: document.getElementById('ctaSub').textContent };
}, index);

// a scripted run: each step holds keys until a condition (JS on G, p, B, T) holds or for some seconds
function runSteps(steps) {
  const M = window.__mimo, G = M.G, T = 32, STEP = M.sim.STEP, log = { carried: false, maxVyRegion: 0, deaths: 0, won: false, t: 0 };
  const zone = () => { const p = G.p; return M.worldApi.tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h / 2) / T)) === M.worldApi.tileId(G.L.world, 'z'); };
  let prevJump = false;
  for (const s of steps) {
    const k = s.keys || '', test = s.until ? new Function('G', 'p', 'B', 'T', 'return ' + s.until) : null;
    if (k.includes('J') && prevJump) { M.setKey('jump', false); M.sim.step(1); }
    M.setKey('left', k.includes('L')); M.setKey('right', k.includes('R')); M.setKey('jump', k.includes('J')); prevJump = k.includes('J');
    const n = Math.round((s.secs || s.max || 8) / STEP);
    for (let i = 0; i < n; i++) {
      if (test && test(G, G.p, G.boss, T)) break;
      const was = G.state; M.sim.step(1); log.t += STEP;
      if (G.p.carried && G.L.bodies.includes(G.p.carried)) log.carried = true;
      if (G.state === 'play' && zone() && G.p.vy > 0) log.maxVyRegion = Math.max(log.maxVyRegion, G.p.vy);
      if (G.state === 'dead' && was !== 'dead') log.deaths++;
      if (G.state === 'win') { log.won = true; break; }
    }
    if (log.won) break;
  }
  for (const n of ['left', 'right', 'jump']) M.setKey(n, false);
  for (let i = 0; i < 90 && !log.won; i++) { M.sim.step(1); if (G.state === 'win') log.won = true; }
  return { ...log, stars: G.starsGot, x: +((G.p.x + G.p.w / 2) / T).toFixed(2), y: +((G.p.y + G.p.h) / T).toFixed(2) };
}
const LEVEL_ROUTE = [
  { keys: 'R', until: 'p.x + p.w / 2 >= 9.4 * T' },
  // wait on the edge until the raft is back on the left, step on, ride it across, step off
  { keys: '', until: 'G.L.bodies[0].x <= 10.05 * T && G.time > 3' },
  { keys: 'R', until: 'p.carried === G.L.bodies[0]', max: 1 },
  { keys: '', until: 'G.L.bodies[0].x >= 15.9 * T' },
  { keys: 'R', until: 'p.x + p.w / 2 >= 27.5 * T' },
  // only the low gravity in the region carries the jump up to the ledge
  { keys: 'RJ', secs: 1.1 },
  { keys: 'R', until: 'p.x + p.w / 2 >= 37.3 * T' },
  { keys: '', secs: 1 },
];

const srv = await serveSrc();
const browser = await chromium.launch();
try {
  // ---------- 1. a save with worlds 1-3 finished ----------
  {
    const { page, ctx, errors } = await openPage(browser, { save: finishedSave() });
    const info = await page.evaluate(([W, F, N]) => {
      const M = window.__mimo;
      return { name: M.WORLDS[W] && M.WORLDS[W].name, level: M.LEVELS[F] && M.LEVELS[F].name, medals: M.MEDALS[F], n: M.LEVELS.length,
        core: M.LEVELS.slice(0, N).map((l) => JSON.stringify([l.name, l.world, !!l.night, l.map, l.movers || [], l.chase || null])),
        medalsCore: M.MEDALS.slice(0, N), main: M.MAIN, cont: M.continueLevel(), bosses: M.BOSSES.map((b, i) => (b ? i : 0)).filter(Boolean) };
    }, [WORLD, FIRST, game.core]);
    check(info.name === 'Testwelt' && info.level === 'Testlauf', 'Testwelt lädt', 'Welt ' + WORLD + ' · Level ' + FIRST + ' von ' + info.n);
    check(JSON.stringify(info.medals) === '[9,14,20]', 'Medaillenzeiten kommen aus dem Modul', JSON.stringify(info.medals));
    check(JSON.stringify(info.core) === JSON.stringify(CORE), 'Welt 1 bis 3 und Nachtpfad: Indizes und Karten unverändert');
    check(JSON.stringify(info.medalsCore) === JSON.stringify(MEDALS_SRC), 'Welt 1 bis 3: Medaillenzeiten unverändert');
    check(info.main.slice(0, 28).every((v, i) => v === i) && !info.main.includes(28) && info.main[info.main.length - 1] === FIRST, 'Hauptreihenfolge: 0 bis 27, ohne Nachtpfad, Testlevel am Ende', info.main.slice(26).join(','));
    check(info.bosses.includes(WORLD), 'Testmonster ist als Endgegner eingetragen', info.bosses.join(','));
    const card = await gridCard(page, FIRST);
    check(card.found && card.heads.includes('Welt ' + WORLD + ' · Testwelt'), 'Levelliste zeigt die Testwelt', card.heads.join(' | '));
    check(card.open, 'Gespeicherter Stand mit allen Welten davor fertig: erstes Testlevel ist offen');
    check(info.cont === FIRST && card.cta === 'Level ' + (FIRST + 1) + ' · Testlauf', '„Weiter spielen“ führt in die neue Welt', card.cta);
    const testBoss = card.boss.find((b) => b.name === 'Testmonster');
    check(!!testBoss && !testBoss.open, 'Endgegner der Testwelt steht in der Liste und ist noch zu');

    // ---------- 2. the scripted run ----------
    await page.evaluate((F) => { const M = window.__mimo; M.sim.hold(true); M.load(F); }, FIRST);
    const before = await page.evaluate(() => ({ song: window.__mimo.song(), sky: window.__mimo.worldApi.W.skyTop, bodies: window.__mimo.G.L.bodies.length, q: window.__mimo.G.L.tiles[6][31] }));
    check(before.song === 'testsong', 'Musik der Welt läuft im Level', before.song);
    check(before.sky === '#CFE9F3', 'Farben der Welt (hell, mittags)', before.sky);
    check(before.bodies === 1 && before.q >= 32, 'eigenes Feld und eigenes Objekt aus der Karte', 'Feld-Id ' + before.q);
    if (shots) {
      // a picture once the opening wipe is over, Mimo on the raft's side and in the region
      for (const [name, x] of [['testlevel-start', 6], ['testlevel-region', 28]]) {
        await page.evaluate(([F, x]) => { const M = window.__mimo, G = M.G; M.load(F); G.p.x = x * 32; G.p.y = 11 * 32; M.sim.step(240); }, [FIRST, x]);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.locator('#game').screenshot({ path: path.join(shots, name + '.png') });
      }
      await page.evaluate((F) => window.__mimo.load(F), FIRST);
    }
    // a normal jump cannot reach the ledge, only the region's low gravity can
    const fall = await page.evaluate(() => {
      const M = window.__mimo, G = M.G, T = 32; G.p.x = 27.5 * T - 11; G.p.y = 3 * T; G.p.vy = 0; let max = 0;
      for (let i = 0; i < 60; i++) { M.sim.step(1); max = Math.max(max, G.p.vy); }
      return max;
    });
    check(fall > 0 && fall <= 150.01, 'Physik-Bereich: Mimo sinkt langsam (höchstens 150)', 'größte Fallgeschwindigkeit ' + fall.toFixed(1));
    // piep() ignores presses closer than 260 ms of real time; a fresh headless page can still be younger than that
    await page.waitForFunction(() => performance.now() > 400);
    const pieps = await page.evaluate(() => { window.__mimo.piep(); return window.__testWorld.pieps(); });
    check(pieps === 1, 'Piep erreicht die Welt', String(pieps));
    await page.evaluate((F) => window.__mimo.load(F), FIRST);
    const run = await page.evaluate(runSteps, LEVEL_ROUTE);
    check(run.won && run.deaths === 0, 'Bot gewinnt das Testlevel', (run.won ? 'gewonnen' : 'nicht gewonnen bei ' + run.x + ',' + run.y) + ' · ' + run.t.toFixed(2) + ' s · Stürze ' + run.deaths);
    check(run.carried, 'Mimo fährt auf dem Floß mit');
    check(run.stars === 1, 'Stern auf dem Testblock eingesammelt', String(run.stars));
    const after = await page.evaluate(([F, W]) => { const M = window.__mimo; return { best: M.progress.best[F] != null, unlocked: M.progress.unlocked, open: M.levelOpen(F) }; }, [FIRST, WORLD]);
    check(after.best, 'Bestzeit für das Testlevel gespeichert', 'freigeschaltet ' + after.unlocked);
    const card2 = await gridCard(page, FIRST);
    check(!!card2.boss.find((b) => b.name === 'Testmonster' && b.open), 'Endgegner der Testwelt ist jetzt offen');

    // ---------- 3. the boss ----------
    const fight = await page.evaluate((W) => {
      const M = window.__mimo, G = M.G, T = 32, STEP = M.sim.STEP;
      M.sim.hold(true); M.startBoss(W);
      let t = 0, hits = 0, hp = null;
      while (G.state === 'cine' && t < 20) { M.setKey('jump', Math.floor(t * 30) % 2 === 0); M.sim.step(1); t += STEP; }
      M.setKey('jump', false); hp = G.boss.hp;
      const go = (d) => { M.setKey('left', d < 0); M.setKey('right', d > 0); };
      let held = 0;
      while (t < 60 && G.state !== 'win') {
        const B = G.boss, p = G.p, px = p.x + p.w / 2;
        if (B.done) { const dx = G.L.door ? G.L.door.x * T + T / 2 : px; go(Math.abs(dx - px) < 3 ? 0 : dx > px ? 1 : -1); }
        else if (B.state === 'nap') { go(Math.abs(B.x - px) < 4 ? 0 : B.x > px ? 1 : -1); if (Math.abs(B.x - px) < 70 && p.grounded && held <= 0) held = 30; }
        else go(px > 6 * T ? -1 : 0);
        M.setKey('jump', held > 0); if (held > 0) held--;
        M.sim.step(1); t += STEP;
        if (B.hp !== hp) { hits++; hp = B.hp; }
      }
      for (const n of ['left', 'right', 'jump']) M.setKey(n, false);
      return { won: G.state === 'win', hits, t: +t.toFixed(2), rec: M.progress.bosses[W] || null, overlay: G.overlay };
    }, WORLD);
    check(fight.won && fight.hits === 2, 'Testmonster besiegt (zwei Treffer, Tür, hinein)', fight.t + ' s');
    check(!!fight.rec, 'Sieg ist gespeichert');
    // the win card comes after a moment; "Zum Ende": after the last world's boss the ending card shows
    const end = await page.evaluate(() => { const M = window.__mimo; for (let i = 0; i < 240 && !M.G.overlay; i++) M.sim.step(1); const btn = document.getElementById('btnNext').textContent; document.getElementById('btnNext').click(); return { btn, overlay: M.G.overlay }; });
    check(end.btn === 'Zum Ende' && end.overlay === 'end', 'nach dem letzten Endgegner kommt die Abschlusskarte', end.btn + ' → ' + end.overlay);
    const hat = await page.evaluate(() => {
      document.getElementById('btnWardrobe').click(); document.querySelector('#shopTabs [data-kind=hat]').click();
      const items = [...document.querySelectorAll('#shopItems .item')].map((b) => b.querySelector('span').textContent + ':' + b.querySelector('small').textContent);
      document.getElementById('btnShopBack').click();
      return items.find((t) => t.startsWith('Testhut')) || '';
    });
    check(hat === 'Testhut:Im Schrank', 'Belohnung liegt im Kleiderschrank', hat);
    // after boss 3 the game goes on into the new world
    const flow = await page.evaluate((F) => { const M = window.__mimo; M.G.mode = 'boss'; M.G.bossW = 3; document.getElementById('btnNext').click(); return { mode: M.G.mode, level: M.G.levelIndex, next: M.nextMain(M.BOSSES[3].after) }; }, FIRST);
    // after the yeti comes the first level after the core: world 4 (or the test world while there is no world 4)
    check(flow.mode === 'level' && flow.level === game.core, 'nach Yeti Flocke geht es in die nächste Welt', 'Level ' + flow.level);
    check(errors.length === 0, 'keine Skriptfehler (Stand: Welt 1 bis 3 fertig)', errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- 4. a fresh save ----------
  {
    const { page, ctx, errors } = await openPage(browser);
    const card = await gridCard(page, FIRST);
    const cont = await page.evaluate(() => window.__mimo.continueLevel());
    check(card.found && !card.open, 'neuer Spielstand: Testwelt ist gesperrt');
    check(cont === 0, 'neuer Spielstand: „Spielen“ beginnt bei Level 1', String(cont));
    check(errors.length === 0, 'keine Skriptfehler (neuer Stand)', errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- 5. ?offen opens everything for the visit, the save stays ----------
  {
    const { page, ctx, errors } = await openPage(browser, { query: '?offen' });
    const card = await gridCard(page, FIRST);
    const kept = await page.evaluate((key) => ({ unlocked: window.__mimo.progress.unlocked, stored: localStorage.getItem(key) }), SAVE_KEY);
    check(card.open && card.boss.every((b) => b.open), '?offen öffnet alle Level und Endgegner');
    check(kept.unlocked === 1 && kept.stored === null, '?offen ändert den Spielstand nicht', 'freigeschaltet ' + kept.unlocked);
    check(errors.length === 0, 'keine Skriptfehler (?offen)', errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- 6. worlds that are built but not released (UNRELEASED_WORLDS) ----------
  {
    const { page, ctx, errors } = await openPage(browser, { save: finishedSave(), noTest: true });
    const info = await page.evaluate((held) => {
      const M = window.__mimo;
      document.getElementById('btnLevels').click();
      const heads = [...document.querySelectorAll('#levelGrid .world-head')].map((h) => h.textContent), soon = !!document.querySelector('#levelGrid .lvl-soon');
      document.getElementById('btnLevelsBack').click();
      return { n: M.LEVELS.length, worlds: held.filter((w) => M.WORLDS[w]), bosses: held.filter((w) => M.BOSSES[w]), levels: M.LEVELS.filter((l) => held.includes(l.world)).length,
        costumes: M.COSTUMES.filter((c) => held.includes(c.boss)).map((c) => c.id), heads, soon, last: M.MAIN[M.MAIN.length - 1] };
    }, HELD);
    check(info.n === game.levels.length && !info.worlds.length && !info.bosses.length && !info.levels && !info.costumes.length,
      'zurückgehaltene Welten (' + HELD.join(', ') + ') fehlen ganz: keine Level, Endgegner, Kostüme', info.n + ' Level');
    check(!info.heads.some((h) => HELD.some((w) => h.startsWith('Welt ' + w + ' '))), 'Levelliste zeigt keine zurückgehaltene Welt', info.heads.join(' | '));
    check(info.soon === HELD.length > 0, 'Levelliste: Hinweis „Bald geht es weiter“ steht da, solange eine Welt zurückgehalten ist');
    check(info.last === game.levels.length - 1, 'Hauptreihe endet mit dem letzten veröffentlichten Level', 'Index ' + info.last);
    // after the last released boss: "Zum Ende", the ending card of that world (the coast brings its own)
    const lastW = Math.max(...game.worlds.filter((w) => w.boss).map((w) => w.world)), lastWorld = game.worlds.find((w) => w.world === lastW);
    const end = await page.evaluate((W) => {
      const M = window.__mimo; M.G.mode = 'boss'; M.G.bossW = W;
      const next = M.nextMain(M.BOSSES[W].after); document.getElementById('btnNext').click();
      return { next, overlay: M.G.overlay, title: document.querySelector('#ovEnd h2').textContent };
    }, lastW);
    check(end.next === null && end.overlay === 'end', 'nach dem letzten veröffentlichten Endgegner (Welt ' + lastW + ') kommt die Abschlusskarte', end.overlay);
    check(!lastWorld.ending || end.title === lastWorld.ending.title, 'Abschlusskarte mit dem Text dieser Welt', end.title);
    check(errors.length === 0, 'keine Skriptfehler (Veröffentlichung)', errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await openPage(browser, { save: finishedSave(), noTest: true, query: '?vorschau' });
    const info = await page.evaluate(() => { const M = window.__mimo; return { n: M.LEVELS.length, firsts: Object.fromEntries([...M.WORLDS.keys()].filter((w) => w >= 4 && M.WORLDS[w]).map((w) => [w, M.WORLDS[w].firstLevel])), names: M.LEVELS.map((l) => l.name) }; });
    const want = Object.fromEntries(every.worlds.map((w) => [w.world, w.firstLevel]));
    check(info.n === every.levels.length && JSON.stringify(info.firsts) === JSON.stringify(want), '?vorschau zeigt alle gebauten Welten an ihren festen Indizes', JSON.stringify(info.firsts));
    check(JSON.stringify(info.names.slice(0, game.levels.length)) === JSON.stringify(game.levels.map((l) => l.name)), 'veröffentlichte Level behalten mit ?vorschau ihre Indizes (Spielstände passen)');
    check(errors.length === 0, 'keine Skriptfehler (?vorschau)', errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // the app build (docs/) leaves the files of the held worlds out: no script line, no file, nothing in the offline list
  if (fs.existsSync(path.join(ROOT, 'docs', 'index.html'))) {
    const rel = releaseWorldFiles(), page = fs.readFileSync(path.join(ROOT, 'docs', 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'docs', 'sw.js'), 'utf8');
    const leaks = rel.held.filter((f) => page.includes('"' + f + '"') || sw.includes('"' + f + '"') || fs.existsSync(path.join(ROOT, 'docs', f)));
    const missing = rel.ship.filter((f) => !page.includes('"' + f + '"') || !fs.existsSync(path.join(ROOT, 'docs', f)));
    check(!leaks.length && !missing.length, 'App-Build (docs/): ' + rel.ship.length + ' Weltdateien dabei, ' + rel.held.length + ' der zurückgehaltenen Welten draußen', [...leaks, ...missing].join(', '));
  }
} finally {
  await browser.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? failed + ' Prüfung(en) fehlgeschlagen' : 'Welt-API: alles in Ordnung');
process.exit(failed ? 1 : 0);
