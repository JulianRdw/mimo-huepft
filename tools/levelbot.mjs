// Plays one level with a scripted route, frame by frame (deterministic), and reports what happened.
//
// Usage:
//   node tools/levelbot.mjs --level <name|index> --route <file|"inline; route"> [--from candidate.js] [--shots dir] [--json]
//
// --from   a candidate file (ES module, default export = array of levels); the level replaces the slot of the
//          same name in the game, or else the first slot of the same world. Without --from the level comes from src/.
// Route:   one command per line (or separated by ";"), "#" starts a comment.
//   KEYS SECONDS            hold these keys for that long          e.g.  R 0.8   RJ 0.25   W 0.5
//   KEYS until COND [max S] hold until a condition holds (max 8 s)  e.g.  R until x>=12.5   R until grounded
//   KEYS: R right, L left, J jump, D down, U up, W (or -) nothing. Holding J longer jumps higher (release cuts the jump).
//   Two commands in a row that both hold J get a one-frame release in between, so each one is a fresh jump.
//   COND: x>=n x<=n y>=n y<=n (tiles: x = Mimo's centre, y = his feet, row 0 at the top), grounded, air, falling, stars>=n
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
  const m = s.match(/^([RLJDUW-]+)\s+(?:(\d*\.?\d+)|until\s+(.+?))\s*(?:max\s+(\d*\.?\d+))?$/i);
  if (!m) throw new Error('route: cannot read "' + line + '"');
  const keys = m[1].toUpperCase();
  const cmd = { line, shot, keys: { right: keys.includes('R'), left: keys.includes('L'), jump: keys.includes('J'), down: keys.includes('D'), up: keys.includes('U') } };
  if (m[2]) cmd.secs = Number(m[2]);
  else {
    const c = m[3].trim(), cm = c.match(/^(x|y|stars)\s*(>=|<=)\s*(-?\d*\.?\d+)$/);
    if (cm) cmd.cond = { v: cm[1], op: cm[2], n: Number(cm[3]) };
    else if (['grounded', 'air', 'falling'].includes(c)) cmd.cond = { v: c };
    else throw new Error('route: unknown condition "' + c + '"');
    cmd.max = m[4] ? Number(m[4]) : 8;
  }
  return cmd;
}

const levels = await loadLevels(args.from);
const { def } = pickLevel(levels, args.level);
const game = srcLevels();
let slot = game.findIndex((l) => l.name === def.name);
if (slot < 0) slot = game.findIndex((l) => (l.world || 1) === (def.world || 1) && !l.night);
if (slot < 0) slot = 0;

const srv = await serveSrc();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 768 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(srv.url);
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
  for (const cmd of route) {
    const r = await page.evaluate((cmd) => {
      const M = window.__mimo, G = M.G, B = window.__bot, L = G.L, STEP = M.sim.STEP;
      const set = (k) => { for (const n of ['left', 'right', 'down', 'up']) M.setKey(n, !!k[n]); M.setKey('jump', !!k.jump); };
      if (B.won) return { done: true };
      if (cmd.keys.jump && B.prevJump) { set({ ...cmd.keys, jump: false }); M.sim.step(1); B.t += STEP; }
      set(cmd.keys); B.prevJump = cmd.keys.jump;
      const test = () => {
        const p = B.pos(), c = cmd.cond;
        if (c.v === 'grounded') return G.p.grounded; if (c.v === 'air') return !G.p.grounded; if (c.v === 'falling') return !G.p.grounded && G.p.vy > 0;
        const v = c.v === 'stars' ? G.starsGot : p[c.v];
        return c.op === '>=' ? v >= c.n : v <= c.n;
      };
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
    return { won: B.won, deaths: B.deaths, events: B.events, trace: B.trace, end: { ...B.pos(), state: G.state }, stars: { got: L.stars.filter((s) => s.got).map((s) => s.x + ',' + s.y), total: L.stars.length }, secret: L.hidden ? (L.hidden.got ? 'got' : 'missed') : 'none' };
  });
  if (shots) { await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))); await page.screenshot({ path: path.join(shots, 'end.png') }); }
  res.errors = errors;
  if (args.json) console.log(JSON.stringify(res, null, 1));
  else {
    console.log((res.won ? 'WON  clock ' + res.won.clock + ' s' : 'NOT WON · ended at x ' + res.end.x + ' y ' + res.end.y + ' (' + res.end.state + ')') +
      ' · deaths ' + res.deaths.length + (res.deaths.length ? ' ' + res.deaths.map((d) => '(' + d.x + ',' + d.y + ' @' + d.t + ')').join(' ') : '') +
      ' · stars ' + res.stars.got.length + '/' + res.stars.total + ' · secret ' + res.secret);
    if (res.events.length) console.log('events: ' + res.events.join(' | '));
    console.log('trace [t, x, y, grounded]: ' + res.trace.map((p) => p.join(',')).join(' '));
    if (errors.length) console.log('PAGE ERRORS: ' + errors.join(' | '));
  }
} finally {
  await browser.close();
  srv.close();
}
