// Phone check for the app build in docs/: iPhone sideways and upright (WebKit), offline start (Chromium).
// Usage: node tools/phone-test.mjs [shots-dir]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const SHOTS = process.argv[2] || path.join(ROOT, 'test-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(DOCS, rel);
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL0 = 'http://127.0.0.1:' + server.address().port + '/';

let failed = 0;
const check = (ok, label, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (extra ? ' · ' + extra : '')); if (!ok) failed++; };
const iphone = devices['iPhone 14'];

async function landscape() {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...iphone, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0);
  await page.waitForFunction(() => window.__mimo && !document.getElementById('ovMenu').hidden);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, 'quer-menu.png') });
  const menuFits = await page.evaluate(() => { const c = document.querySelector('#ovMenu .card').getBoundingClientRect(); return { h: Math.round(c.height), top: Math.round(c.top), vh: innerHeight }; });
  check(menuFits.h <= menuFits.vh, 'Menü passt quer ohne Scrollen', JSON.stringify(menuFits));
  await page.tap('#btnContinue');
  await page.waitForTimeout(800);
  const geo = await page.evaluate(() => {
    const st = document.getElementById('stage').getBoundingClientRect(), cv = document.getElementById('game');
    return { stage: [Math.round(st.width), Math.round(st.height)], canvas: [cv.width, cv.height], scroll: document.scrollingElement.scrollHeight - innerHeight };
  });
  check(geo.stage[0] === 844 && geo.stage[1] === 390, 'Spielfeld füllt den Bildschirm', geo.stage.join('x'));
  const ratioStage = geo.stage[0] / geo.stage[1], ratioCanvas = geo.canvas[0] / geo.canvas[1];
  check(Math.abs(ratioStage - ratioCanvas) < 0.02, 'Bild wird nicht verzerrt', 'Bühne ' + ratioStage.toFixed(3) + ' · Leinwand ' + ratioCanvas.toFixed(3));
  check(geo.scroll <= 0, 'Seite scrollt nicht', String(geo.scroll));
  await page.screenshot({ path: path.join(SHOTS, 'quer-tipphilfe.png') });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(SHOTS, 'quer-level1.png') });
  const hint = await page.evaluate(() => getComputedStyle(document.getElementById('hint')).opacity);
  check(Number(hint) > 0.5, 'Level-Hinweis blendet kurz ein', 'opacity ' + hint);
  // touch: right half jumps, left quarter runs left, second quarter runs right
  const y0 = await page.evaluate(() => window.__mimo.G.p.y);
  await page.touchscreen.tap(700, 250);
  await page.waitForTimeout(120);
  const vy = await page.evaluate(() => window.__mimo.G.p.vy);
  check(vy < 0 || (await page.evaluate(() => window.__mimo.G.p.y)) < y0, 'Tippen rechts lässt Mimo springen', 'vy ' + Math.round(vy));
  await page.waitForTimeout(2000);
  const gone = await page.evaluate(() => ({ hint: Number(getComputedStyle(document.getElementById('hint')).opacity), pads: window.__mimo.G.touchHint }));
  check(gone.hint < 0.1 && gone.pads === 0, 'Hinweis und Tipp-Hilfe sind nach wenigen Sekunden weg', JSON.stringify(gone));
  await page.evaluate(() => window.__mimo.load(0));
  await page.waitForTimeout(2500);
  const again = await page.evaluate(() => getComputedStyle(document.getElementById('hint')).opacity);
  check(Number(again) < 0.1, 'Gleicher Hinweis kommt beim Neustart nicht wieder', 'opacity ' + again);
  // HUD buttons sit inside the safe area and are tappable
  const hud = await page.evaluate(() => { const r = document.getElementById('btnPause').getBoundingClientRect(); return { right: Math.round(innerWidth - r.right), top: Math.round(r.top), h: Math.round(r.height) }; });
  check(hud.right >= 10 && hud.top >= 4, 'Pause-Knopf liegt im sicheren Bereich', JSON.stringify(hud));
  await page.tap('#btnPause');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => window.__mimo.G.overlay === 'pause'), 'Pause-Knopf pausiert');
  await page.screenshot({ path: path.join(SHOTS, 'quer-pause.png') });
  // a boss arena is narrower than the wide view: it has to stay playable
  await page.evaluate(() => window.__mimo.startBoss(1));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, 'quer-boss.png') });
  // the 3D runner in landscape: HUD row below the page HUD
  await page.evaluate(() => { window.__mimo.progress.dash = null; window.__mimo.startDash('course'); });
  await page.waitForFunction(() => window.__mimo.dash, null, { timeout: 30000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SHOTS, 'quer-abenteuer.png') });
  const overlap = await page.evaluate(() => { const a = document.querySelector('.hud-stats').getBoundingClientRect(), b = document.querySelector('.dash-top').getBoundingClientRect(); return Math.round(b.top - a.bottom); });
  check(overlap >= 0, 'Abenteuer-Anzeige liegt unter der Kopfzeile', 'Abstand ' + overlap + ' px');
  check(errors.length === 0, 'keine Skriptfehler (quer)', errors.join(' | '));
  await browser.close();
}

async function portrait() {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...iphone });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0);
  await page.waitForFunction(() => window.__mimo && !document.getElementById('ovMenu').hidden);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'hoch-menu.png') });
  await page.tap('#btnContinue');
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => ({ hint: !document.getElementById('rotateHint').hidden, t: window.__mimo.G.levelTime, time: window.__mimo.G.time }));
  check(st.hint, 'Hochkant: Bitte-quer-Hinweis erscheint');
  check(st.time === 0, 'Hochkant: Level wartet', 'Spielzeit ' + st.time.toFixed(2));
  await page.screenshot({ path: path.join(SHOTS, 'hoch-drehen.png') });
  await page.tap('#btnPortrait');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ hint: !document.getElementById('rotateHint').hidden, time: window.__mimo.G.time }));
  check(!after.hint && after.time > 0.2, 'Trotzdem hochkant: Spiel läuft', 'Spielzeit ' + after.time.toFixed(2));
  // turning the phone to landscape continues without the button too
  const page2 = await ctx.newPage();
  await page2.goto(URL0);
  await page2.waitForFunction(() => window.__mimo && !document.getElementById('ovMenu').hidden);
  await page2.tap('#btnContinue');
  await page2.waitForTimeout(500);
  await page2.setViewportSize({ width: 844, height: 390 });
  await page2.waitForTimeout(800);
  const turned = await page2.evaluate(() => ({ hint: !document.getElementById('rotateHint').hidden, time: window.__mimo.G.time, canvas: [document.getElementById('game').width, document.getElementById('game').height] }));
  check(!turned.hint && turned.time > 0.2, 'Nach dem Drehen läuft das Level', JSON.stringify(turned));
  check(errors.length === 0, 'keine Skriptfehler (hochkant)', errors.join(' | '));
  await browser.close();
}

async function offline() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(URL0);
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys.find((k) => k.startsWith('shell-'))); return (await c.keys()).length; });
  check(cached >= 13, 'Offline-Speicher hat alle Dateien', cached + ' Einträge');
  const man = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  check(man.display === 'fullscreen' && man.icons.length === 3, 'Manifest ok');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__mimo && !document.getElementById('ovMenu').hidden, null, { timeout: 15000 });
  check(true, 'Startet ohne Internet');
  // 3D needs Three.js from the cache
  await page.evaluate(() => window.__mimo.startDash('course'));
  const ok3d = await page.waitForFunction(() => window.__mimo.dash, null, { timeout: 30000 }).then(() => true, () => false);
  check(ok3d, '3D-Bahn lädt offline');
  await browser.close();
}

try {
  await landscape();
  await portrait();
  await offline();
} finally {
  server.close();
}
console.log(failed ? failed + ' Prüfung(en) fehlgeschlagen' : 'alle Prüfungen bestanden');
process.exit(failed ? 1 : 0);
