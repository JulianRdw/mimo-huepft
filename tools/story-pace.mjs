// Checks how readable the story of world 4 is while a level is played: runs every level on its full route (fast clock,
// no video) and logs every speech bubble and every theft of the Krake. Reports
//   - moments with more than one story bubble on screen at once,
//   - bubbles that start while their speaker is off screen,
//   - thefts whose thing is not well inside the view when the arm rises or is off screen when it goes under,
//   - the hand-over at the door: whether its lines were shown before the win card.
// Usage: node tools/story-pace.mjs [--level 29] [--verbose]   (default: every level of world 4)
// Exit code 1 when a level breaks a rule. Headless and muted (tools/pw.mjs).
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs, srcLevels } from './levels-lib.mjs';
import { pageDriver, routeJob } from './video-driver.mjs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const ROUTES = path.resolve(import.meta.dirname, 'levels', 'routes');
const W = Number(args.w) || 844, H = Number(args.h) || 390;

// runs inside the page before the driver: watches G.bubbles and the thefts after every step
function logger() {
  const M = window.__mimo, P = window.__pace = { ev: [], overlap: [], thefts: [], winT: null, cardT: null, maxVis: 0 };
  const known = new WeakSet();
  let lastPair = '';
  window.__vidStep = (t) => {
    const G = M.G, A = M.worldApi, cam = G.cam, V = A.view;
    if (!G.p || !G.L) return;
    const inView = (x, y, mx, my) => x > cam.x + mx && x < cam.x + V.w - mx && y > cam.y + my && y < cam.y + V.h - my;
    const at = (b) => (b.anchor === 'player' ? { x: G.p.x + G.p.w / 2, y: G.p.y } : { x: b.anchor.x + (b.anchor.w || 0) / 2, y: b.anchor.y });
    for (const b of G.bubbles || []) {
      if (known.has(b)) continue;
      known.add(b); const a = at(b);
      P.ev.push({ t: +t.toFixed(2), text: b.text, who: b.anchor === 'player' ? 'mimo' : 'cast', secs: +b.max.toFixed(1), delay: +(-b.life).toFixed(1), on: inView(a.x, a.y, 0, 0), state: G.state });
    }
    // a piep of Mimo (the core's own short word, 0.9 s) is no story text
    const vis = (G.bubbles || []).filter((b) => b.life >= 0 && b.life < b.max - 0.25 && !(b.anchor === 'player' && b.max <= 0.9));
    P.maxVis = Math.max(P.maxVis, vis.length);
    if (vis.length > 1) { const key = vis.map((b) => b.text).join(' | '); if (key !== lastPair) P.overlap.push({ t: +t.toFixed(2), texts: key }); lastPair = key; } else lastPair = '';
    const st = G.L.story;
    P.snatches = ((st && st.cast) || []).filter((e) => e.act === 'snatch').length;
    for (const e of (st && st.cast) || []) {
      const s = e.sn; if (!s || s.ph === 'wait') continue;
      let r = P.thefts.find((q) => q.e === e.id);
      const pt = s.spotY != null ? { x: s.spot, y: s.spotY } : { x: e.x0, y: e.foot };
      if (s.ph !== 'go' && !r) continue;
      if (!r) { r = { e: e.id, t: +t.toFixed(2), well: inView(pt.x, pt.y, cam.x <= 1 || cam.x + V.w >= G.L.w * 32 - 1 ? 30 : V.w * 0.15, V.h * 0.1), mimo: [+((G.p.x + G.p.w / 2) / 32).toFixed(1), +((G.p.y + G.p.h) / 32).toFixed(1)], minOn: 1, n: 0, on: 0 }; P.thefts.push(r); }
      if (s.ph === 'go') { r.n++; if (inView(pt.x, pt.y, 0, 0)) r.on++; r.dur = +(t - r.t).toFixed(2); }
    }
    if (G.L.w4dir && G.L.w4dir.log) P.dropped = G.L.w4dir.log;
    if (G.state === 'win' && P.winT == null) P.winT = +t.toFixed(2);
    if (G.overlay && P.cardT == null && P.winT != null) P.cardT = +t.toFixed(2);
  };
}

const srv = await serveSrc();
const browser = await chromium.launch();
const levels = srcLevels();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const list = args.level != null && args.level !== true ? [Number(args.level)] : levels.map((l, i) => i).filter((i) => levels[i].world === 4 && !levels[i].night && !levels[i].bonus);
let bad = 0;
try {
  for (const i of list) {
    const [job, name] = routeJob(levels, i, ROUTES, slug); job.fast = !args.real;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(args.desk ? {} : { hasTouch: true, isMobile: true }) });
    const page = await ctx.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(srv.url + '?offen&vorschau');
    await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 30000 });
    await page.evaluate(logger);
    await page.evaluate(pageDriver, job);
    await page.waitForFunction(() => window.__vid && window.__vid.finished, null, { timeout: 120000, polling: 300 });
    const [res, P] = await page.evaluate(() => [window.__vid.result, (() => { const p = window.__pace; return { ...p }; })()]);
    await ctx.close();
    const story = P.ev.filter((e) => e.who === 'cast' || e.text.length > 6);
    const offs = P.ev.filter((e) => !e.on && e.delay < 0.1);
    const theftBad = P.thefts.filter((r) => !r.well || r.on / Math.max(1, r.n) < 0.9);
    if (P.thefts.length < P.snatches) theftBad.push({ missing: true });
    const late = res.won && P.ev.some((e) => e.state === 'win' && P.cardT != null && e.t > P.cardT - 0.5);
    const fail = !res.won || P.overlap.length || theftBad.length || errors.length;
    if (fail) bad++;
    console.log(`${fail ? 'FEHLER' : 'ok    '} ${name.padEnd(22)} ${res.won ? 'gewonnen' : 'NICHT GEWONNEN'} ${res.seconds} s · ${story.length} Blasen · max ${P.maxVis} gleichzeitig · Tür bei ${P.winT != null ? P.winT + ' s' : '-'} · Karte ${P.cardT != null ? (P.cardT - P.winT).toFixed(1) + ' s nach der Tür' : '-'}${late ? ' (Satz kurz vor der Karte)' : ''}`);
    for (const o of P.overlap) console.log(`   zwei Blasen ${o.t}s: ${o.texts}`);
    if (P.thefts.length < P.snatches) console.log(`   ${P.snatches - P.thefts.length} Klau nie ausgelöst`);
    for (const r of P.thefts) console.log(`   Klau ${r.t}s ${r.well ? 'gut im Bild' : 'AM RAND'}, sichtbar ${Math.round(r.on / Math.max(1, r.n) * 100)} % von ${r.dur}s, Mimo bei ${r.mimo}`);
    for (const e of P.dropped || []) console.log(`   ausgelassen ${e.t}s: ${e.text}`);
    for (const e of offs) console.log(`   außerhalb des Bildes ${e.t}s: ${e.text}`);
    if (args.verbose) for (const e of P.ev) console.log(`     ${String(e.t).padStart(6)} ${e.who.padEnd(4)} ${e.secs}s${e.delay ? ' +' + e.delay : ''} ${e.on ? '' : '(weg) '}${e.state === 'win' ? '[Tür] ' : ''}${e.text}`);
    for (const m of errors) console.log('   Fehler: ' + m);
    if (args.trace) console.log(res.trace.filter((r, k) => k % 2 === 0).map((r) => r.split(",").map((v) => Math.round(+v)).join(",")).join(" "));
  }
} finally { await browser.close(); srv.close(); }
process.exit(bad ? 1 : 0);
