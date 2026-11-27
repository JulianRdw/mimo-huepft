// Plays one level with a scripted route, frame by frame (deterministic), and reports what happened.
//
// Usage:
//   node tools/levelbot.mjs --level <name|index> --route <file|"inline; route"> [--from candidate.js] [--shots dir] [--phone] [--json]
//
// --from   a candidate file (ES module, default export = array of levels); the level replaces the slot of the
//          same name in the game, or else the first slot of the same world. Without --from the level comes from src/.
// Route:   one command per line (or separated by ";"), "#" starts a comment.
//   KEYS SECONDS            hold these keys for that long          e.g.  R 0.8   RJ 0.25   W 0.5
//   KEYS until COND [max S] hold until a condition holds (max 8 s)  e.g.  R until x>=12.5   R until grounded
//   KEYS: R right, L left, J jump, D down, U up, P piep (once, at the start of the command), W (or -) nothing.
//   Holding J longer jumps higher (release cuts the jump); under water (world 4) holding J rises, a tap is one stroke.
//   Two commands in a row that both hold J get a one-frame release in between, so each one is a fresh jump.
//   COND: x>=n x<=n y>=n y<=n (tiles: x = Mimo's centre, y = his feet, row 0 at the top), grounded, air, falling, stars>=n,
//         time>=n (the game clock in seconds since the level started: waits for a tide, a bubble, a pufferfish),
//         water (Mimo swims), dry (he does not), body (he stands on a world body: a crab, a bubble, a raft),
//         surface (he floats calmly at the water surface: a jump press now leaps out of the water),
//         heat>=n heat<=n (world 5: the heat of hot stone under Mimo's paws, 0..1; it burns at 1),
//         calm (world 5: every fire hopper from Mimo to 6 tiles to his right rests in its lava for at least 0.8 s more),
//         orbit (world 6: a small moon holds Mimo on its orbit), ang>=n ang<=n (world 6: where on the orbit, in degrees:
//         0 right, 90 top, 180 left, 270 bottom; a jump press now flings him off along the orbit).
//         Conditions can be joined with "and":  RJ until surface and x>=29.3
//   Append "!shot" to a command to save a screenshot after it (needs --shots).
// Output: won or not, level-clock time, deaths (where), stars collected, secret star, a coarse trace.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { loadLevels, pickLevel, srcLevels, serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.level || !args.route) { console.error('usage: node tools/levelbot.mjs --level <name|index> --route <file|inline> [--from file.js] [--shots dir] [--json]'); process.exit(2); }

const routeText = fs.existsSync(args.route) ? fs.readFileSync(args.route, 'utf8') : String(args.route);
const route = routeText.split(/[\n;]/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map(parseCmd);

function parseCmd(line) {
  const shot = /!shot\b/.test(line), s = line.replace(/!shot\b/, '').trim();
  const m = s.match(/^([RLJDUPW-]+)\s+(?:(\d*\.?\d+)|until\s+(.+?))\s*(?:max\s+(\d*\.?\d+))?$/i);
  if (!m) throw new Error('route: cannot read "' + line + '"');
  const keys = m[1].toUpperCase();
  const cmd = { line, shot, piep: keys.includes('P'), keys: { right: keys.includes('R'), left: keys.includes('L'), jump: keys.includes('J'), down: keys.includes('D'), up: keys.includes('U') } };
  if (m[2]) cmd.secs = Number(m[2]);
  else {
    cmd.cond = m[3].split(/\s+and\s+/).map(parseCond);
    cmd.max = m[4] ? Number(m[4]) : 8;
  }
  return cmd;
}
function parseCond(text) {
  const c = text.trim(), cm = c.match(/^(x|y|stars|time|heat|ang)\s*(>=|<=)\s*(-?\d*\.?\d+)$/);
  if (cm) return { v: cm[1], op: cm[2], n: Number(cm[3]) };
  if (['grounded', 'air', 'falling', 'water', 'dry', 'body', 'surface', 'orbit', 'calm'].includes(c)) return { v: c };
  throw new Error('route: unknown condition "' + c + '"');
}

const levels = await loadLevels(args.from);
const { def } = pickLevel(levels, args.level);
const game = srcLevels();
let slot = game.findIndex((l) => l.name === def.name);
if (slot < 0) slot = game.findIndex((l) => (l.world || 1) === (def.world || 1) && !l.night);
if (slot < 0) slot = 0;

const srv = await serveSrc();
const browser = await chromium.launch();
// --phone: the landscape phone view of the videos (844x390, touch), for screenshots as a player sees them
const page = await browser.newPage(args.phone ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 768 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
// a broken hook of a world module is only reported on the console (the game keeps running), so that counts too
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
try {
  // ?vorschau: the levels of worlds that are not released yet are there too (indices as in srcLevels)
  await page.goto(srv.url + '?vorschau');
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  await page.evaluate(({ slot, def }) => {
    const M = window.__mimo;
    M.LEVELS[slot] = def; M.sim.hold(true); M.load(slot);
    const T = 32, G = M.G;
    const pos = () => ({ x: +((G.p.x + G.p.w / 2) / T).toFixed(2), y: +((G.p.y + G.p.h) / T).toFixed(2) });
    window.__bot = { t: 0, state: G.state, deaths: [], events: [], trace: [], nextTrace: 0, stars: 0, hidden: false, cps: 0, won: null, pos, prevJump: false };
  }, { slot, def });

  const shots = args.shots ? path.resolve(String(args.shots)) : null;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  let shotN = 0;
  // per command: [route line, start, end] in seconds, so a pacing check can find long stretches of one unchanged input
  const cmdLog = []; let lastT = 0;
  for (const cmd of route) {
    // Piep listens to the wall clock (one per 0.26 s), so give it real time; the game itself stands still meanwhile
    if (cmd.piep) { await page.waitForTimeout(300); await page.evaluate(() => window.__mimo.piep()); }
    const r = await page.evaluate((cmd) => {
      const M = window.__mimo, G = M.G, B = window.__bot, L = G.L, STEP = M.sim.STEP;
      const set = (k) => { for (const n of ['left', 'right', 'down', 'up']) M.setKey(n, !!k[n]); M.setKey('jump', !!k.jump); };
      if (B.won) return { done: true };
      if (cmd.keys.jump && B.prevJump) { set({ ...cmd.keys, jump: false }); M.sim.step(1); B.t += STEP; }
      set(cmd.keys); B.prevJump = cmd.keys.jump;
      const one = (c) => {
        const p = B.pos();
        if (c.v === 'grounded') return G.p.grounded; if (c.v === 'air') return !G.p.grounded; if (c.v === 'falling') return !G.p.grounded && G.p.vy > 0;
        if (c.v === 'water') return !!G.p.swim; if (c.v === 'dry') return !G.p.swim; if (c.v === 'body') return !!G.p.carried && L.bodies.includes(G.p.carried);
        if (c.v === 'surface') return !!G.p.atSurface;
        if (c.v === 'calm') { const v = G.L && G.L.volcano; if (!v) return true; const px = (G.p.x + G.p.w / 2) / 32; for (const h of v.hoppers) { const a = h.tx + 0.5, b = a + (h.dx || 0); if (Math.max(a, b) < px - 0.5 || Math.min(a, b) > px + 6) continue; const cyc = h.rest + h.dur, tt = G.time + h.offset, t = tt - Math.floor(tt / cyc) * cyc; if (t >= h.rest - 0.8) return false; } return true; }
        if (c.v === 'orbit') return !!G.p.orbit;
        if (c.v === 'ang') { if (!G.p.orbit || G.p.orbitDeg == null) return false; return c.op === '>=' ? G.p.orbitDeg >= c.n : G.p.orbitDeg <= c.n; }
        const v = c.v === 'stars' ? G.starsGot : c.v === 'time' ? G.time : c.v === 'heat' ? G.p.heat || 0 : p[c.v];
        return c.op === '>=' ? v >= c.n : v <= c.n;
      };
      const test = () => cmd.cond.every(one);
      const limit = Math.round((cmd.secs != null ? cmd.secs : cmd.max) / STEP);
      let met = cmd.secs != null;
      for (let i = 0; i < limit; i++) {
        if (cmd.cond && test()) { met = true; break; }
        M.sim.step(1); B.t += STEP;
        const p = B.pos();
        if (G.state !== B.state) {
          if (G.state === 'dead') B.deaths.push({ t: +B.t.toFixed(2), x: p.x, y: p.y });
          if (G.state === 'win') { B.won = { t: +B.t.toFixed(2), clock: +G.levelTime.toFixed(2) }; B.state = G.state; break; }
          B.state = G.state;
        }
        if (G.starsGot !== B.stars) { B.events.push('star ' + p.x + ',' + p.y + ' @' + B.t.toFixed(2)); B.stars = G.starsGot; }
        if (L.hidden && L.hidden.got && !B.hidden) { B.hidden = true; B.events.push('secret star @' + B.t.toFixed(2)); }
        const cps = L.checkpoints.filter((c) => c.active).length;
        if (cps !== B.cps) { B.events.push('checkpoint ' + cps + ' @' + B.t.toFixed(2)); B.cps = cps; }
        if (B.t >= B.nextTrace) { B.trace.push([+B.t.toFixed(2), p.x, p.y, G.p.grounded ? 1 : 0]); B.nextTrace += 0.25; }
      }
      if (cmd.cond && !met && test()) met = true;
      return { met, pos: B.pos(), t: B.t };
    }, cmd);
    if (r.done) break;
    cmdLog.push([cmd.line, +lastT.toFixed(2), +r.t.toFixed(2)]); lastT = r.t;
    if (cmd.cond && !r.met) await page.evaluate((line) => window.__bot.events.push('TIMEOUT waiting: ' + line), cmd.line);
    if (shots && cmd.shot) {
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      await page.screenshot({ path: path.join(shots, String(++shotN).padStart(2, '0') + '.png') });
    }
  }
  // let the last moment settle (a landing, the door) without keys
  const res = await page.evaluate(() => {
    const M = window.__mimo, G = M.G, B = window.__bot, L = G.L;
    for (const n of ['left', 'right', 'down', 'up', 'jump']) M.setKey(n, false);
    for (let i = 0; i < 60 && !B.won; i++) { M.sim.step(1); B.t += M.sim.STEP; if (G.state === 'win') B.won = { t: +B.t.toFixed(2), clock: +G.levelTime.toFixed(2) }; }
    return { won: B.won, deaths: B.deaths, events: B.events, trace: B.trace, end: { ...B.pos(), state: G.state }, stars: { got: L.stars.filter((s) => s.got).map((s) => s.x + ',' + s.y), total: L.stars.length }, secret: L.hidden ? (L.hidden.got ? 'got' : 'missed') : 'none', find: L.story && L.story.find ? (L.story.find.got ? 'got' : 'missed') : 'none' };
  });
  if (shots) { await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))); await page.screenshot({ path: path.join(shots, 'end.png') }); }
  res.errors = errors; res.cmds = cmdLog;
  if (args.json) console.log(JSON.stringify(res, null, 1));
  else {
    console.log((res.won ? 'WON  clock ' + res.won.clock + ' s' : 'NOT WON · ended at x ' + res.end.x + ' y ' + res.end.y + ' (' + res.end.state + ')') +
      ' · deaths ' + res.deaths.length + (res.deaths.length ? ' ' + res.deaths.map((d) => '(' + d.x + ',' + d.y + ' @' + d.t + ')').join(' ') : '') +
      ' · stars ' + res.stars.got.length + '/' + res.stars.total + ' · secret ' + res.secret + (res.find && res.find !== 'none' ? ' · find ' + res.find : ''));
    if (res.events.length) console.log('events: ' + res.events.join(' | '));
    console.log('trace [t, x, y, grounded]: ' + res.trace.map((p) => p.join(',')).join(' '));
    if (errors.length) console.log('PAGE ERRORS: ' + errors.join(' | '));
  }
} finally {
  await browser.close();
  srv.close();
}
