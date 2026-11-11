// Plays the three boss fights frame by frame (deterministic) and checks that they hold together.
//
// Usage: node tools/bosscheck.mjs [--boss 1|2|3] [--shots dir] [--verbose]
//
// Per boss:
//   win     a bot that plays the fight the way it is meant to be played; has to win, prints the time
//   idle    nobody touches the controls: the boss has to keep attacking, a fall must never loop
//   sloppy  random running and jumping, once normally and once with the "unverwundbar" help
// Checked in every run: no script errors, no NaN positions, the boss never hangs in one state,
// Mimo is never walled in, and after a fall there is always time to react.
// --shots saves pictures of every phase at phone size (844x390).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const only = args.boss ? [Number(args.boss)] : [1, 2, 3];
const shotsDir = args.shots ? path.resolve(String(args.shots)) : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

// longest time a boss may stay in one state before the check calls it stuck (seconds)
const MAX_STATE = 9, WIN_LIMIT = 240, IDLE_TIME = 60, SLOPPY_TIME = 90;

// pictures: name -> condition on the boss (runs in the page)
const SHOTS = {
  1: { 'p1-shadow-locked': 'B.state==="flop"&&B.n===2&&B.t>0.2', 'p1-stuck': 'B.state==="stuck"&&B.t>0.5', 'p2-spores': 'ph===1&&B.shots.some(s=>s.type==="spore"&&s.t>0.9)',
    'p2-stuck': 'ph===1&&B.state==="stuck"&&B.t>0.4', 'p3-flop': 'ph===2&&B.state==="flop"&&B.n===2&&B.t>0.15', 'p3-stuck': 'ph===2&&B.state==="stuck"&&B.t>0.4', 'win-slowmo': 'B.done&&B.t>0.12&&B.t<0.2', 'win-crown': 'B.done&&B.crown&&B.crown.on&&B.t>2.2' },
  2: { 'p1-aim': 'ph===0&&B.state==="hover"&&B.dropT<0.25', 'p1-cone-rest': 'ph===0&&B.shots.some(s=>s.mode==="rest"&&s.rest>0.4)', 'p1-rocket': 'ph===0&&B.shots.some(s=>s.mode==="rocket"&&s.t>0.08)', 'p1-dazed': 'ph===0&&B.state==="dazed"&&B.t>0.5',
    'p2-dark': 'ph===1&&B.dark>0.75&&B.state==="hover"&&B.dropT<0.3', 'p2-dark-rest': 'ph===1&&B.dark>0.7&&B.shots.some(s=>s.mode==="rest"&&s.rest>0.5)', 'p2-dazed': 'ph===1&&B.state==="dazed"&&B.t>0.25',
    'p3-storm': 'ph===2&&Math.abs(B.windDir)>0.9&&B.state==="hover"&&B.windT>2.5', 'win': 'B.done&&B.t>1.2' },
  3: { 'p1-start': 'ph===0&&B.state==="throw"&&B.n===1', 'p1-windup': 'ph===0&&B.state==="charge"&&!B.slide&&B.t>0.4', 'p1-slide': 'ph===0&&B.slide', 'p1-dizzy': 'ph===0&&B.state==="dizzy"&&B.t>0.4',
    'p2-icicles': 'ph===1&&B.shots.some(s=>s.type==="icicle"&&s.t>0.6&&s.t<0.8)', 'p2-pillars': 'ph===1&&B.pillars.length>=2&&B.state==="throw"&&B.n>=1', 'p2-dizzy': 'ph===1&&B.state==="dizzy"&&B.t>0.4',
    'p3-rain': 'ph===2&&B.shots.some(s=>s.type==="icicle"&&!s.stick&&s.t>0.5)', 'p3-slide': 'ph===2&&B.slide', 'win': 'B.done&&B.t>1.6' },
};

// pictures of what the winning bot never lets happen, taken in the careless run
const SHOTS_SLOPPY = {
  1: { 'miss-wave': 'B.shots.some(s=>s.type==="wave"&&s.t>0.3)', 'miss-chain': 'ph>=1&&B.state==="flop"&&B.chain>=1&&B.n===1' },
  2: { 'swoop-warn': 'B.state==="swoop"&&B.t>0.4&&B.t<0.6', 'swoop-dive': 'B.state==="swoop"&&B.t>1.2' },
  3: { 'bonk': 'B.state==="bonk"&&B.t>0.2', 'snowball': 'B.shots.some(s=>s.type==="snow"&&s.roll)' },
};

// ---------- everything below this line up to "END PAGE" runs inside the page ----------
function pageSetup() {
  const M = window.__mimo, G = M.G, T = 32, FLOOR = 320;
  // one random source for everything, so a run repeats exactly
  let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const C = window.__check = {};
  const phaseOf = (B) => { const ph = B.def.phases; let i = 0; while (i + 1 < ph.length && B.hp <= ph[i + 1]) i++; return i; };
  const keys = { left: false, right: false, jump: 0 };
  function apply() { M.setKey('left', keys.left); M.setKey('right', keys.right); M.setKey('jump', keys.jump > 0); if (keys.jump > 0) keys.jump--; }
  const go = (dir) => { keys.left = dir < 0; keys.right = dir > 0; };
  const moveTo = (x, tol) => { const px = G.p.x + G.p.w / 2; go(Math.abs(x - px) <= (tol || 4) ? 0 : x > px ? 1 : -1); return Math.abs(x - px) <= (tol || 4); };
  const jump = (steps) => { if (G.p.grounded && keys.jump <= 0 && !M.input.jumpHeld) keys.jump = steps || 44; };
  // land on something at x: walk up, hop, steer onto it
  function hopOnto(x, reach, steps) { const px = G.p.x + G.p.w / 2, d = Math.abs(x - px); moveTo(x, 3); if (G.p.grounded && d < reach && d > 14) jump(steps); if (G.p.grounded && d <= 14) go(x > 320 ? -1 : 1); }

  const BOTS = {
    mampf(B) {
      const p = G.p, px = p.x + p.w / 2;
      for (const s of B.shots) if (s.type === 'wave' && Math.sign(px - s.x) === s.dir && Math.abs(px - s.x) < 52) jump(44);
      if (B.state === 'stuck') { hopOnto(B.x, 84, 44); return; }
      if (B.state === 'flop' && B.n >= 2) { if (Math.abs(px - B.x) < 80) go(B.x === px ? (px < 320 ? 1 : -1) : px < 60 ? 1 : px > 580 ? -1 : B.x > 320 ? -1 : 1); else go(0); return; }
            const wet = B.puddles.filter((q) => q.wet >= 1).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0] || [...B.puddles].sort((a, b) => b.wet - a.wet)[0];
      moveTo(wet.x, 5);
    },
    huhu(B) {
      const p = G.p, px = p.x + p.w / 2, cones = B.shots.filter((s) => s.type === 'cone');
      if (B.state === 'dazed') { hopOnto(B.x, 80, 44); return; }
      const threats = cones.filter((s) => s.mode === 'fall').map((s) => s.x + s.vx * 0.25);
      if (B.state === 'hover' && B.dropT < 0.6) threats.push(B.x);
      const near = threats.filter((x) => Math.abs(x - px) < 40).sort((a, b) => Math.abs(a - px) - Math.abs(b - px))[0];
      const air = ['hover', 'idle', 'takeoff'].includes(B.state);
      const rest = cones.filter((s) => s.mode === 'rest' && Math.abs(s.x - B.x) < 110 && threats.every((x) => Math.abs(x - s.x) > 44)).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (!p.grounded && C.aim != null) { moveTo(C.aim, 2); return; }
      C.aim = null;
      if (near != null) { let d = px >= near ? 1 : -1; if (px < 70) d = 1; if (px > 570) d = -1; go(d); return; }
      if (B.state === 'swoop') { const safe = B.tx > 320 ? B.tx - 150 : B.tx + 150; moveTo(safe, 8); return; }
      if (rest && air) {
        const d = Math.abs(rest.x - px);
        if (d > 50) moveTo(rest.x + (px < rest.x ? -40 : 40), 6); else if (d < 26) go(px < rest.x ? -1 : 1); else if (p.grounded) { C.aim = rest.x; jump(16); moveTo(rest.x, 2); }
        return;
      }
      const any = cones.find((s) => s.mode === 'rest');
      if (any) moveTo(any.x + (px < any.x ? -40 : 40), 8); else go(0);
    },
    yeti(B) {
      const p = G.p, px = p.x + p.w / 2, pillars = B.pillars.map((q) => q.c * T + T / 2);
      const blocked = () => p.grounded && p.vx === 0 && (keys.left || keys.right);
      if (B.state === 'dizzy') { hopOnto(B.x, 78, 44); if (C.wasBlocked) jump(44); C.wasBlocked = blocked(); return; }
      // falling ice first
      const ice = B.shots.filter((s) => s.type === 'icicle' && Math.abs(s.x - px) < 34).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (ice) { let d = px >= ice.x ? 1 : -1; const ahead = px + d * 40; if (ahead < 50 || ahead > 590 || pillars.some((x) => Math.abs(x - ahead) < 30)) d = -d; go(d); return; }
      for (const s of B.shots) if (s.type === 'snow') {
        if (s.roll) { if (Math.sign(px - s.x) === Math.sign(s.vx) && Math.abs(px - s.x) < 58 && p.grounded) { jump(44); go(-Math.sign(s.vx)); return; } }
        else { const land = s.x + s.vx * Math.max(0, (-s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 2 * 1300 * (FLOOR - 11 - s.y)))) / 1300); if (Math.abs(land - px) < 44) { let d = s.vx > 0 ? -1 : 1; const ahead = px + d * 50; if (ahead < 50 || ahead > 590 || pillars.some((x) => Math.abs(x - ahead) < 34)) d = -d; go(d); return; } if (Math.abs(land - px) < 90) { go(0); return; } }
      }
      const covered = pillars.some((x) => (x - px) * (x - B.x) < 0 && Math.abs(x - px) > 20);
      const charging = B.state === 'charge' || B.state === 'charge2';
      if (charging && B.slide) { if (!covered && Math.sign(px - B.x) === Math.sign(B.vx) && Math.abs(px - B.x) < 105) jump(44); go(0); return; }
      if (covered && charging) { go(0); return; }
      // stand behind the nearest pillar on my side of him
      const mine = pillars.filter((x) => (x - B.x) * (px - B.x) > 0).map((x) => ({ x, spot: x + Math.sign(px - B.x) * 46 })).filter((q) => q.spot > 50 && q.spot < 590).sort((a, b) => Math.abs(a.spot - px) - Math.abs(b.spot - px))[0];
      if (mine) { if (B.state === 'throw' && Math.abs(mine.x - px) < 60 && (mine.spot - px) * (mine.x - px) > 0) { go(0); return; } moveTo(mine.spot, 8); if (C.wasBlocked) jump(44); C.wasBlocked = blocked(); return; }
      // no cover: keep away and wait for him to slide past underneath
      if (Math.abs(px - B.x) < 150) go(px < B.x ? (px > 60 ? -1 : 0) : (px < 580 ? 1 : 0)); else go(0);
    },
    idle() { go(0); },
    sloppy() {
      C.sl = C.sl || { t: 0, dir: 0 };
      if (--C.sl.t <= 0) { C.sl.t = 20 + Math.floor(Math.random() * 90); C.sl.dir = Math.floor(Math.random() * 3) - 1; }
      go(C.sl.dir); if (Math.random() < 0.02) jump(8 + Math.floor(Math.random() * 40));
    },
  };

  // start a fight and reset the bookkeeping
  C.start = (w, mode, shots, assist) => {
    M.progress.invincible = !!assist; M.progress.zen = false;
    M.sim.hold(true); M.startBoss(w);
    Object.assign(C, { w, mode, t: 0, deaths: [], causes: [], lastRespawn: -9, minGap: 99, stateT: 0, lastState: '', maxState: 0, maxStateName: '', problems: [], hits: [], hp: G.boss.hp, won: null, aim: null, sl: null, wasBlocked: false, states: {},
      shots: Object.entries(shots || {}).map(([name, cond]) => ({ name, test: new Function('B', 'G', 'ph', 'return ' + cond), done: false })), prevG: 'cine' });
    keys.left = keys.right = false; keys.jump = 0;
  };
  // run until a picture is due, the fight is won, or the time is up
  C.run = (limit) => {
    const STEP = M.sim.STEP;
    while (C.t < limit) {
      const B = G.boss; if (!B) { C.problems.push('boss vanished'); return { end: true }; }
      if (G.state === 'cine') { M.setKey('jump', Math.floor(C.t * 30) % 2 === 0); }
      else if (G.state === 'play') { if (C.prevG === 'cine') M.setKey('jump', false); if (B.done) { go(0); if (G.L.door) moveTo(G.L.door.x * T + T / 2, 3); } else (BOTS[C.mode] || BOTS[B.kind])(B); apply(); }
      const wasState = G.state;
      M.sim.step(1); C.t += STEP;
      const p = G.p;
      if (![B.x, B.y, p.x, p.y, p.vx, p.vy].every(Number.isFinite)) { C.problems.push('NaN at ' + C.t.toFixed(2)); return { end: true }; }
      if (G.state !== wasState) {
        if (G.state === 'dead') { C.deaths.push(+C.t.toFixed(2)); C.causes.push({ t: +C.t.toFixed(2), ph: phaseOf(B), state: B.state + (B.n ? '/' + B.n : ''), dx: Math.round(B.x - p.x - 11), dy: Math.round(B.y - p.y - 26), wind: +(B.windDir || 0).toFixed(1), near: B.shots.filter((s) => Math.abs(s.x - p.x - 11) < 40).map((s) => s.type + (s.mode ? ':' + s.mode : '') + (s.roll ? ':roll' : '')).join(',') }); C.minGap = Math.min(C.minGap, C.t - C.lastRespawn); }
        if (wasState === 'dead' && G.state === 'play') { C.lastRespawn = C.t; if (p.invT < 1) C.problems.push('no protection after respawn at ' + C.t.toFixed(2)); const want = B.def.phases[phaseOf(B)]; if (B.hp !== want) C.problems.push('respawn did not restore the phase start: ' + B.hp + ' vs ' + want); }
        if (G.state === 'win') { C.won = { t: +C.t.toFixed(2), clock: +G.levelTime.toFixed(2) }; return { end: true }; }
      }
      C.prevG = G.state;
      if (B.hp !== C.hp) { C.hits.push(+C.t.toFixed(2)); C.hp = B.hp; }
      if (G.state === 'play' && !B.done) {
        C.states[B.state] = (C.states[B.state] || 0) + STEP;
        if (B.state !== C.lastState) { C.lastState = B.state; C.stateT = 0; } else { C.stateT += STEP; if (C.stateT > C.maxState) { C.maxState = C.stateT; C.maxStateName = B.state; } }
        // Mimo must never sit inside a solid tile
        const tx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h / 2) / T), tile = G.L.tiles[ty] && G.L.tiles[ty][tx];
        if (tile === 1 || tile === 12) { if (!C.inWall) C.problems.push('Mimo inside a tile at ' + C.t.toFixed(2) + ' (' + tx + ',' + ty + ')'); C.inWall = true; } else C.inWall = false;
        if (p.x < T - 1 || p.x + p.w > 19 * T + 1) C.problems.push('Mimo outside the arena at ' + C.t.toFixed(2));
        if (B.x < T || B.x > 19 * T) C.problems.push('boss outside the arena at ' + C.t.toFixed(2));
      }
      const ph = phaseOf(B);
      for (const s of C.shots) if (!s.done && G.state !== 'cine' && s.test(B, G, ph)) { s.done = true; return { shot: s.name }; }
    }
    return { end: true };
  };
  C.report = () => ({ won: C.won, deaths: C.deaths, causes: C.causes, hits: C.hits, minGap: +C.minGap.toFixed(2), maxState: +C.maxState.toFixed(2), maxStateName: C.maxStateName, problems: C.problems.slice(0, 8), states: Object.fromEntries(Object.entries(C.states).map(([k, v]) => [k, +v.toFixed(1)])), missedShots: C.shots.filter((s) => !s.done).map((s) => s.name), hp: G.boss ? G.boss.hp : null });
}
// ---------- END PAGE ----------

const srv = await serveSrc();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
let failed = 0;
const check = (ok, label, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (extra ? ' · ' + extra : '')); if (!ok) failed++; };

async function play(w, mode, limit, shots, assist) {
  await page.evaluate(([w, mode, shots, assist]) => window.__check.start(w, mode, shots, assist), [w, mode, shots || null, !!assist]);
  for (;;) {
    const r = await page.evaluate((limit) => window.__check.run(limit), limit);
    if (r.shot && shotsDir) {
      await page.evaluate(() => { document.getElementById('toast').hidden = true; return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); });
      await page.screenshot({ path: path.join(shotsDir, 'boss' + w + '-' + r.shot + '.png') });
    }
    if (r.end) break;
  }
  return page.evaluate(() => window.__check.report());
}

try {
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  await page.evaluate(pageSetup);
  for (const w of only) {
    const name = await page.evaluate((w) => window.__mimo.BOSSES[w].name, w);
    console.log('\n' + name);
    const sane = (r, label) => {
      check(r.problems.length === 0, label + ': keine Auffälligkeiten', r.problems.join(' | '));
      check(r.maxState <= MAX_STATE, label + ': der Kampf bleibt nie stehen', 'längster Zustand ' + r.maxStateName + ' ' + r.maxState + ' s');
      check(r.minGap >= 1.4, label + ': nach einem Sturz bleibt Zeit', r.deaths.length ? 'kürzester Abstand ' + r.minGap + ' s bei ' + r.deaths.length + ' Stürzen' : 'kein Sturz');
      if (args.verbose) console.log('     ', JSON.stringify(r));
    };
    const win = await play(w, null, WIN_LIMIT, SHOTS[w]);
    check(!!win.won, 'Bot gewinnt', win.won ? 'Kampfzeit ' + win.won.clock + ' s · Treffer bei ' + win.hits.join(', ') + ' · Stürze ' + win.deaths.length : 'Leben übrig ' + win.hp + ' · Stürze ' + win.deaths.length);
    sane(win, 'Bot');
    if (shotsDir) check(win.missedShots.length === 0, 'alle Phasenbilder gemacht', win.missedShots.join(', '));
    const again = await play(w, null, WIN_LIMIT);
    check(!!again.won && !!win.won && again.won.clock === win.won.clock, 'Kampf läuft jedes Mal gleich ab', again.won ? again.won.clock + ' s' : 'nicht gewonnen');
    const idle = await play(w, 'idle', IDLE_TIME);
    check(idle.deaths.length >= 1, 'Nichtstun: der Gegner erreicht Mimo auch in der Ecke', idle.deaths.length + ' Stürze in ' + IDLE_TIME + ' s');
    sane(idle, 'Nichtstun');
    const sloppy = await play(w, 'sloppy', SLOPPY_TIME);
    sane(sloppy, 'Schludrig');
    console.log('     Schludrig: ' + sloppy.deaths.length + ' Stürze, ' + sloppy.hits.length + ' Treffer' + (sloppy.won ? ', gewonnen' : ''));
    const helped = await play(w, 'sloppy', SLOPPY_TIME, SHOTS_SLOPPY[w], true);
    sane(helped, 'Schludrig mit Hilfe');
    check(helped.deaths.length === 0, 'Schludrig mit Hilfe: kein Sturz', String(helped.deaths.length));
  }
  check(errors.length === 0, 'keine Skriptfehler', errors.slice(0, 3).join(' | '));
} finally {
  await browser.close(); srv.close();
}
console.log(failed ? '\n' + failed + ' Prüfung(en) fehlgeschlagen' : '\nalles in Ordnung');
process.exit(failed ? 1 : 0);
