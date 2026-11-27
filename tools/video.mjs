// Records real-time videos of the game played by its bots (boss bot, full level routes). Never touches src/ or the save.
//
// Usage: node tools/video.mjs --boss 4 | --level 29 | --world 4 | --opening 29 | --closing  [--out dir] [--scale 2] [--keep-webm]
//   --closing [5] the fight of world 4 (or 5) with its closing scene forced on (it never plays under automation by itself);
//               world 5: --parts flag,book,thermos,tripod | none sets which summit photo parts count as found
//   --opening i the opening scene of level index i (world 4: 29), forced on, until the level has begun for a moment
//   --boss n    the boss fight of world n, played by boss.bot (the bot of tools/bosscheck.mjs), intro to the hat landing
//   --level i   level index i (world 4 = 29..41) with its full route tools/levels/routes/world<w>/NN-full.txt
//               (--route fast: its fast route instead, e.g. to show a level without its find)
//   --world w   every level of world w, one video each
//   --out       default /Users/julianradewagen/mimo-welten-sicherung/videos
// Real time: the page clock is held (like in levelbot/bosscheck) and a requestAnimationFrame loop feeds it the real
// elapsed time in 1/120 s steps, running the bot before every single step, so the run is as exact as the tools' runs
// but plays at normal speed. Chromium is muted (tools/pw.mjs). Output: webm from Playwright, converted to H.264 mp4
// (trimmed to the first game frame) when ffmpeg exists. Playwright records at 25 fps and in CSS pixels (a larger
// recording size only pads the picture with grey), so it records 844x390 and ffmpeg scales it up by --scale.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs, srcLevels } from './levels-lib.mjs';
import { pageDriver, routeJob } from './video-driver.mjs';

const args = parseArgs(process.argv.slice(2));
const OUT = path.resolve(String(args.out || '/Users/julianradewagen/mimo-welten-sicherung/videos'));
const SCALE = Number(args.scale) || 2, W = 844, H = 390;
const ROUTES = path.resolve(import.meta.dirname, 'levels', 'routes');
fs.mkdirSync(OUT, { recursive: true });

const slug = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- node side ----------
const srv = await serveSrc();
const browser = await chromium.launch();
const results = [];

async function record(job, name) {
  const tmp = fs.mkdtempSync(path.join(OUT, '.rec-'));
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, hasTouch: true, isMobile: true, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  const tCreated = Date.now();
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  // ?vorschau: levels of worlds that are not released yet are there too (indices as in srcLevels)
  await page.goto(srv.url + '?offen&vorschau');
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const tStart = Date.now();
  await page.evaluate(pageDriver, job);
  try { await page.waitForFunction(() => window.__vid && window.__vid.finished, null, { timeout: 300000, polling: 500 }); }
  catch (e) { console.error(name + ' did not finish: ' + JSON.stringify(await page.evaluate(() => window.__vid.where && window.__vid.where())), errors); throw e; }
  await page.waitForTimeout(600);
  const result = await page.evaluate(() => window.__vid.result);
  await page.screenshot({ path: path.join(tmp, 'end.png') });
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const offset = Math.max(0, (tStart - tCreated) / 1000 - 0.3);
  let file = path.join(OUT, name + '.webm');
  try {
    const mp4 = path.join(OUT, name + '.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', offset.toFixed(2), '-i', webm, '-vf', 'scale=' + W * SCALE + ':' + H * SCALE + ':flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
    file = mp4;
  } catch (e) { fs.copyFileSync(webm, file); console.error('ffmpeg failed or missing, kept webm: ' + e.message); }
  fs.rmSync(tmp, { recursive: true, force: true });
  const dur = (() => { try { return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString()); } catch (_) { return null; } })();
  const row = { name, file, durationS: dur && +dur.toFixed(1), sizeMB: +(fs.statSync(file).size / 1048576).toFixed(2), result, errors };
  results.push(row); console.log(JSON.stringify(row));
}

try {
  const levels = srcLevels();
  const levelJob = (i) => routeJob(levels, i, ROUTES, slug);
  if (args.opening) await record({ kind: 'opening', slot: Number(args.opening) }, 'anfangsszene');
  if (args.family) await record({ kind: 'family', slot: Number(args.family), after: !!args.after }, args.after ? 'familie-nach-szene' : 'familie-spaeterer-start');
  if (args.closing) {
    const w = args.closing === true || args.closing === 'true' ? 4 : Number(args.closing);
    // world 5: --parts flag,book,thermos,tripod (or 'none') decides which summit photo parts count as found
    const parts = w === 5 && args.parts != null ? (args.parts === 'none' ? '' : String(args.parts)) : null;
    await record({ kind: 'boss', w, closing: true, parts }, w === 4 ? 'schlussszene' : 'schlussszene-' + (parts == null ? 'gespeichert' : parts === '' ? '0teile' : parts.split(',').length + 'teile'));
  }
  if (args.boss) await record({ kind: 'boss', w: Number(args.boss) }, ({ 4: 'kaept-n-krake', 5: 'drache-fauch', 6: 'kaesebert' })[args.boss] || 'boss-' + args.boss);
  if (args.level != null && args.level !== true) { const [j, n] = args.route === 'fast' ? routeJob(levels, Number(args.level), ROUTES, slug, 'fast') : levelJob(Number(args.level)); j.fast = !!args.fast; await record(j, args.route === 'fast' ? n + '-schnell' : n); }
  if (args.world) {
    const w = Number(args.world);
    for (let i = 0; i < levels.length; i++) if ((levels[i].world || 1) === w && !levels[i].night) await record(...levelJob(i));
  }
} finally { await browser.close(); srv.close(); }
const bad = results.filter((r) => (!r.result.won && r.name !== 'anfangsszene') || r.errors.length);
console.log(bad.length ? 'ATTENTION: ' + bad.map((r) => r.name).join(', ') : 'all videos ended in a win');
