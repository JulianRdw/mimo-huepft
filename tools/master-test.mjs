// Silent end-to-end check of the masterpieces of the wardrobe (Krakenmütze, Taucherbrille, Schwimmring, Perlmutt):
//   one short of the goal keeps a piece closed (and its hint counts right), reaching it opens the piece, gold with help
//   does not count, finishing the last missing level brings a toast, and every piece draws without a script error.
// Usage: node tools/master-test.mjs [--shots dir]   (--shots: big pictures of the baby octopus in every mood, for a look)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const shotsDir = args.shots ? path.resolve(String(args.shots)) : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
const srv = await serveSrc();
const browser = await chromium.launch({ args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 896, height: 414 }, deviceScaleFactor: shotsDir ? 3 : 1 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let failed = 0;
const report = (ok, what, info) => { if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (info != null ? ' · ' + info : '')); };

// a save: coastGold = how many coast levels in gold, assisted = these level indices count as "with help"
async function seed(opt) {
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.COSTUMES);
  await page.evaluate((opt) => {
    const M = window.__mimo, coast = M.LEVELS.map((l, i) => (l.world === 4 ? i : -1)).filter((i) => i >= 0);
    const best = {}, stars = {}, hidden = {}, assisted = {};
    coast.slice(0, opt.coastGold || 0).forEach((i) => { best[i] = M.MEDALS[i][0]; stars[i] = 3; });
    for (let i = 0; i < (opt.otherGold || 0); i++) { best[i] = M.MEDALS[i][0]; stars[i] = 3; }
    // stars: all three in every coast level, then one taken away again if asked (one short)
    if (opt.coastStars) { for (const i of coast) stars[i] = 3; if (opt.coastStars === 'oneShort') stars[coast[0]] = 2; }
    for (const i of opt.assisted || []) assisted[i] = true;
    localStorage.setItem('mimo-progress-v2', JSON.stringify({ levelsVersion: 3, unlocked: M.LEVELS.length, best, stars, hidden, assisted, bosses: opt.bosses || {}, outfit: opt.outfit }));
    localStorage.setItem('mimo.news.coast', '1');
  }, opt);
  await page.reload();
  await page.waitForFunction(() => window.__mimo && window.__mimo.COSTUMES);
}
const facts = () => page.evaluate(() => {
  const M = window.__mimo, coast = M.LEVELS.filter((l) => l.world === 4).length;
  const dia = M.LEVELS.filter((l) => l.world === 4).reduce((a, l) => a + l.map.join('').split('*').length - 1, 0);
  return { coast, dia };
});
// the wardrobe card of one piece: its small label, whether it is closed, and the hint after tapping it
async function card(kind, name) {
  await page.evaluate(() => { for (const o of document.querySelectorAll('.overlay')) o.hidden = true; });
  await page.evaluate(() => document.getElementById('btnWardrobe').click());
  await page.click('#shopTabs [data-kind="' + kind + '"]');
  return page.evaluate((name) => {
    const find = () => [...document.querySelectorAll('#shopItems .item')].find((x) => x.querySelector('span').textContent === name);
    const b = find(); if (!b) return { found: false };
    const st = b.querySelector('small').textContent, closed = b.classList.contains('closed'), master = b.classList.contains('master');
    b.click();
    return { found: true, st, closed, master, worn: find().classList.contains('worn'), bar: document.getElementById('shopBarText').textContent };
  }, name);
}

await page.goto(srv.url); await page.waitForFunction(() => window.__mimo && window.__mimo.COSTUMES);
const { coast, dia } = await facts();
report(coast === 13, 'die Küste hat dreizehn Level', coast);
report(dia === 39, 'die Küste hat 39 Sterne', dia);

// Krakenmütze
await seed({ coastGold: coast - 1 });
let c = await card('hat', 'Krakenmütze');
report(c.found && c.closed && c.master && c.st === 'Meisterstück', 'Krakenmütze bei ' + (coast - 1) + ' von ' + coast + ' Gold zu', JSON.stringify(c));
report(/12 von 13/.test(c.bar), 'Hinweis zählt mit', c.bar);
await seed({ coastGold: coast });
c = await card('hat', 'Krakenmütze');
report(c.found && !c.closed && c.worn, 'Krakenmütze bei allen Gold offen und angelegt', JSON.stringify(c));
const firstCoast = await page.evaluate(() => window.__mimo.LEVELS.findIndex((l) => l.world === 4));
await seed({ coastGold: coast, assisted: [firstCoast] });
c = await card('hat', 'Krakenmütze');
report(c.closed, 'Gold mit Hilfe zählt nicht', c.bar);

// Taucherbrille
await seed({ coastStars: 'oneShort' });
c = await card('acc', 'Taucherbrille');
report(c.closed && c.st === 'Meisterstück' && /38 von 39/.test(c.bar), 'Taucherbrille bei einem fehlenden Stern zu', c.bar);
await seed({ coastStars: 'all' });
c = await card('acc', 'Taucherbrille');
report(!c.closed && c.worn, 'Taucherbrille bei allen Sternen offen', JSON.stringify(c));

// Schwimmring
await seed({ bosses: { 4: { best: 80, assisted: false } } });
c = await card('acc', 'Schwimmring');
report(c.closed && /1:15/.test(c.bar) && /1:20/.test(c.bar), 'Schwimmring bei 1:20 zu, Hinweis nennt Ziel und Bestzeit', c.bar);
await seed({ bosses: { 4: { best: 74.5, assisted: true } } });
c = await card('acc', 'Schwimmring');
report(c.closed, 'Schwimmring mit Hilfe zu', c.bar);
await seed({ bosses: { 4: { best: 74.5, assisted: false } } });
c = await card('acc', 'Schwimmring');
report(!c.closed && c.worn, 'Schwimmring bei 1:14,5 offen', JSON.stringify(c));

// Perlmutt
await seed({ otherGold: 24 });
c = await card('color', 'Perlmutt');
report(c.closed && c.st === 'Selten' && /24 von 25/.test(c.bar), 'Perlmutt bei 24 Gold zu', c.bar);
await seed({ otherGold: 25 });
c = await card('color', 'Perlmutt');
report(!c.closed && c.worn, 'Perlmutt bei 25 Gold offen', JSON.stringify(c));

// the last missing gold: finish the level (Mimo is put at the door) and the toast comes
await seed({ coastGold: coast - 1 });
const toast = await page.evaluate(async () => {
  const M = window.__mimo, last = M.LEVELS.map((l, i) => (l.world === 4 ? i : -1)).filter((i) => i >= 0).pop();
  M.load(last); M.sim.hold(true);
  M.sim.step(5); M.G.state = 'play';
  const d = M.G.L.door, p = M.G.p;
  M.G.levelTime = 1; p.x = d.x * 32 + 5; p.y = d.y * 32 - 2; p.vx = 0; p.vy = 0;
  for (let i = 0; i < 40 && M.G.state !== 'win'; i++) { M.sim.step(1); if (M.G.state === 'play') M.G.levelTime = 1; }
  // toasts come one after another (an achievement may come first): watch for a while
  const seen = [];
  for (let k = 0; k < 60; k++) { const t = document.getElementById('toast'); if (t && !t.hidden && !seen.includes(t.textContent)) seen.push(t.textContent); if (seen.some((x) => /verdient/.test(x))) break; await new Promise((r) => setTimeout(r, 250)); }
  M.sim.hold(false);
  return { state: M.G.state, text: seen.join(' / ') };
});
report(toast.state === 'win' && /Krakenmütze verdient/.test(toast.text || ''), 'Toast nach dem letzten Gold', JSON.stringify(toast));

// every piece on Mimo in a level: walking, jumping, standing a long time, hurt, swimming does not throw
await seed({ coastGold: coast, coastStars: 'all', otherGold: 25, bosses: { 4: { best: 70, assisted: false } }, outfit: { color: 'c_pearl', hat: 'h_kraken', acc: 'a_ring' } });
const moods = [['laufen', 0, 'walk'], ['springen', 0, 'jump'], ['ruhig', 0.6, null], ['tanzen', 2.5, null], ['winken', 5, null], ['umschauen', 7.5, null], ['gähnen', 10.4, null], ['schlafen', 13, null], ['autsch', 0, 'hurt']];
await page.evaluate(() => { const M = window.__mimo; M.load(0); M.sim.hold(true); M.sim.step(20); M.G.state = 'play'; });
for (const [name, idle, act] of moods) {
  await page.evaluate(({ idle, act }) => {
    const M = window.__mimo, p = M.G.p;
    M.G.state = 'play'; p.invT = 0; p.gag = null; p.gagDone = true; p.vx = 0; p.vy = 0; p.mood = null;
    const frames = Math.round(idle / M.sim.STEP);
    for (let i = 0; i < frames + 30; i++) { M.sim.step(1); if (i < frames) { p.idleT = Math.min(p.idleT, idle); } }
    p.idleT = idle; p.gag = null;
    if (act === 'walk') { p.vx = 150; p.walkT = 1; }
    if (act === 'jump') { p.vy = -300; p.grounded = false; p.wasGrounded = false; }
    if (act === 'hurt') p.invT = 1;
  }, { idle, act });
  // let the pose catch up for a moment of real time (the picture eases into it), then take it
  await page.waitForTimeout(900);
  if (shotsDir) {
    const box = await page.evaluate(() => {
      const M = window.__mimo, api = M.worldApi, p = M.G.p, cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), k = r.width / api.view.w;
      return { x: r.left + (p.x - api.cam.x - 30) * k, y: r.top + (p.y - api.cam.y - 46) * k, width: 82 * k, height: 82 * k };
    });
    await page.screenshot({ path: path.join(shotsDir, 'kraken-' + name + '.png'), clip: box });
  }
}
await page.evaluate(() => { const o = window.__mimo.progress.outfit; window.__mimo.progress.outfit = { ...o, acc: 'a_snorkel' }; });
await page.waitForTimeout(500);
if (shotsDir) {
  const box = await page.evaluate(() => {
    const M = window.__mimo, api = M.worldApi, p = M.G.p, cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), k = r.width / api.view.w;
    return { x: r.left + (p.x - api.cam.x - 30) * k, y: r.top + (p.y - api.cam.y - 46) * k, width: 82 * k, height: 82 * k };
  });
  await page.screenshot({ path: path.join(shotsDir, 'taucherbrille.png'), clip: box });
}
report(!errors.length, 'keine Skriptfehler', errors.length ? errors.slice(0, 3).join(' | ') : null);
await browser.close(); srv.close();
console.log(failed ? failed + ' Prüfung(en) fehlgeschlagen' : 'Meisterstücke: alles in Ordnung');
process.exit(failed ? 1 : 0);
