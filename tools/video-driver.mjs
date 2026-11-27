// The page driver of tools/video.mjs (bots, routes, real-time or fast clock), shared with tools/story-pace.mjs.
import fs from 'node:fs';
import path from 'node:path';

// ---------- route parsing (same grammar as tools/levelbot.mjs) ----------
export function parseRoute(text) {
  return text.split(/[\n;]/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((line) => {
    const m = line.match(/^([RLJDUPW-]+)\s+(?:(\d*\.?\d+)|until\s+(.+?))\s*(?:max\s+(\d*\.?\d+))?$/i);
    if (!m) throw new Error('route: cannot read "' + line + '"');
    const k = m[1].toUpperCase(), cmd = { line, piep: k.includes('P'), keys: { right: k.includes('R'), left: k.includes('L'), jump: k.includes('J'), down: k.includes('D'), up: k.includes('U') } };
    if (m[2]) cmd.secs = Number(m[2]);
    else { cmd.cond = m[3].split(/\s+and\s+/).map((t) => { const c = t.trim(), cm = c.match(/^(x|y|stars|time|heat|ang)\s*(>=|<=)\s*(-?\d*\.?\d+)$/); return cm ? { v: cm[1], op: cm[2], n: Number(cm[3]) } : { v: c }; }); cmd.max = m[4] ? Number(m[4]) : 8; }
    return cmd;
  });
}

// the job of level i with its full route (or kind 'fast': its fast route; route file numbers count the levels inside
// the world): [job, video name]
export function routeJob(levels, i, routesDir, slug, kind) {
  const def = levels[i], w = def.world || 1, k = kind || 'full';
  const dir = path.join(routesDir, 'world' + w), files = fs.readdirSync(dir).filter((f) => f.endsWith('-' + k + '.txt'));
  const first = levels.findIndex((l) => (l.world || 1) === w && !l.night), nn = String(i - first + 1).padStart(2, '0');
  const f = files.find((x) => x.startsWith(nn + '-'));
  if (!f) throw new Error('no ' + k + ' route for level ' + i);
  return [{ kind: 'level', slot: i, route: parseRoute(fs.readFileSync(path.join(dir, f), 'utf8')) }, String(i + 1) + '-' + slug(def.name)];
}

// ---------- runs inside the page ----------
// job: { kind: 'boss', w } or { kind: 'level', slot, route }
export function pageDriver(job) {
  const M = window.__mimo, G = M.G, T = 32, STEP = M.sim.STEP;
  const R = window.__vid = { started: false, finished: false, result: null };
  const keysOff = () => { for (const n of ['left', 'right', 'down', 'up', 'jump']) M.setKey(n, false); };
  let tick, afterWin = 0, winLeft = job.kind === 'boss' ? 3.5 : 2.5, limit = job.kind === 'boss' ? 300 : 150, t = 0, pauseUntil = 0;
  const info = { deaths: [], stars: 0 };
  let lastState = '';

  if (job.kind === 'boss') {
    // deterministic random source, like bosscheck (the bot was tuned with it)
    let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    M.progress.invincible = false; M.progress.zen = false;
    if (job.closing && window.MimoCoast) window.MimoCoast.forceClosing = true;   // world 4: the closing scene after the win
    if (job.closing && window.MimoVolcano) window.MimoVolcano.forceClosing = true;   // world 5: the summit photo after the win
    if (job.parts != null && window.MimoVolcano) { const set = String(job.parts).split(','); window.MimoVolcano.foundParts = () => ({ flag: set.includes('flag'), book: set.includes('book'), thermos: set.includes('thermos'), tripod: set.includes('tripod') }); }
    M.sim.hold(true); M.startBoss(job.w);
    const keys = { left: false, right: false, jump: 0 };
    const go = (d) => { keys.left = d < 0; keys.right = d > 0; };
    const moveTo = (x, tol) => { const px = G.p.x + G.p.w / 2; go(Math.abs(x - px) <= (tol || 4) ? 0 : x > px ? 1 : -1); return Math.abs(x - px) <= (tol || 4); };
    const jump = (s) => { if (G.p.grounded && keys.jump <= 0 && !M.input.jumpHeld) keys.jump = s || 44; };
    const press = (s) => { if (keys.jump <= 0 && !M.input.jumpHeld) keys.jump = s || 12; };
    const hopOnto = (x, reach, s) => { const px = G.p.x + G.p.w / 2, d = Math.abs(x - px); moveTo(x, 3); if (G.p.grounded && d < reach && d > 14) jump(s); if (G.p.grounded && d <= 14) go(x > 320 ? -1 : 1); };
    const helpers = { go, moveTo, jump, press, hopOnto, G, T };
    tick = () => {
      const B = G.boss;
      if (G.state === 'play' && B) {
        B.def.bot(B, helpers);
        M.setKey('left', keys.left); M.setKey('right', keys.right); M.setKey('jump', keys.jump > 0); if (keys.jump > 0) keys.jump--;
      } else if (G.state === 'cine') { keysOff(); keys.left = keys.right = false; keys.jump = 0; } // the intro and the scenes play on their own
      if (G.state !== lastState) { if (G.state === 'dead') info.deaths.push(+t.toFixed(1)); lastState = G.state; }
      if (G.boss) info.hp = G.boss.hp;
    };
  } else if (job.kind === 'opening') {
    // the opening scene of world 4 (it never plays under automation by itself): until the level has begun for a moment
    window.MimoCoast.forceOpening = true; window.MimoCoast.openingReset(); if (window.MimoVolcano && window.MimoVolcano.openingReset) { window.MimoVolcano.forceOpening = true; window.MimoVolcano.openingReset(); } M.sim.hold(true); M.load(job.slot);
    let played = 0;
    tick = () => { keysOff(); if (G.state === 'cine') played = 1; else if (played) { played += STEP; if (played > 3.5) R.stop = true; } };
  } else if (job.kind === 'family') {
    // after the opening (or without it): Mimo walks left out of the starting view to the family, stands there, then back
    if (job.after) { window.MimoCoast.forceOpening = true; window.MimoCoast.openingReset(); if (window.MimoVolcano && window.MimoVolcano.openingReset) { window.MimoVolcano.forceOpening = true; window.MimoVolcano.openingReset(); } } else window.MimoCoast.forceOpening = false;
    M.sim.hold(true); M.load(job.slot);
    let phase = 0, wait = 0, x0 = null;
    tick = () => {
      keysOff();
      if (G.state === 'cine') return;
      if (job.after && !phase) { phase = 0.5; wait = 0; }
      const px = G.p.x + G.p.w / 2; if (x0 == null) x0 = px;
      if (phase === 0.5) { wait += STEP; if (wait < 3.4) return; phase = 1; }
      if (phase === 0 || phase === 1) { if (px > x0 - 660) { M.setKey('left', true); if (G.p.grounded && G.p.vx === 0 && wait++ % 60 === 59) M.setKey('jump', true); } else { phase = 2; wait = 0; } }
      else if (phase === 2) { wait += STEP; if (wait > 5) phase = 3; }
      else if (phase === 3) { M.setKey('right', true); wait += STEP; if (wait > 8.5) R.stop = true; }
    };
  } else {
    M.LEVELS[job.slot] = M.LEVELS[job.slot]; M.sim.hold(true); M.load(job.slot);
    const route = job.route; let i = 0, n = 0, started = false, prevJump = false, releasing = false;
    const set = (k) => { for (const nm of ['left', 'right', 'down', 'up']) M.setKey(nm, !!k[nm]); M.setKey('jump', !!k.jump); };
    // rounded to 2 decimals, exactly like levelbot: the conditions of the routes were tuned on rounded values
    const pos = () => ({ x: +((G.p.x + G.p.w / 2) / T).toFixed(2), y: +((G.p.y + G.p.h) / T).toFixed(2) });
    const one = (c) => {
      const p = pos(), P = G.p, L = G.L;
      if (c.v === 'grounded') return P.grounded; if (c.v === 'air') return !P.grounded; if (c.v === 'falling') return !P.grounded && P.vy > 0;
      if (c.v === 'water') return !!P.swim; if (c.v === 'dry') return !P.swim; if (c.v === 'body') return !!P.carried && L.bodies.includes(P.carried);
      if (c.v === 'surface') return !!P.atSurface;
      // world 6 orbit conditions and world 5 heat, the same as tools/levelbot.mjs
      if (c.v === 'calm') { const v = G.L && G.L.volcano; if (!v) return true; const px = (P.x + P.w / 2) / 32; for (const h of v.hoppers) { const a = h.tx + 0.5, b = a + (h.dx || 0); if (Math.max(a, b) < px - 0.5 || Math.min(a, b) > px + 6) continue; const cyc = h.rest + h.dur, tt = G.time + h.offset, t = tt - Math.floor(tt / cyc) * cyc; if (t >= h.rest - 0.8) return false; } return true; }
      if (c.v === 'orbit') return !!P.orbit;
      if (c.v === 'ang') { if (!P.orbit || P.orbitDeg == null) return false; return c.op === '>=' ? P.orbitDeg >= c.n : P.orbitDeg <= c.n; }
      const v = c.v === 'stars' ? G.starsGot : c.v === 'time' ? G.time : c.v === 'heat' ? P.heat || 0 : p[c.v];
      return c.op === '>=' ? v >= c.n : v <= c.n;
    };
    R.where = () => ({ cmd: i, line: route[i] && route[i].line, steps: n, x: +pos().x.toFixed(2), y: +pos().y.toFixed(2), t: +t.toFixed(1), deaths: info.deaths.join(',') });
    tick = () => {
      if (G.state !== lastState) { if (G.state === 'dead') info.deaths.push(+t.toFixed(1)); lastState = G.state; }
      if (G.state === 'win') { keysOff(); return; }
      for (;;) {
        const cmd = route[i];
        if (!cmd) { keysOff(); return; } // route over: wait for the door
        if (!started) {
          started = true; n = 0;
          // Piep listens to the wall clock: give it real time, the game stands still meanwhile (as in levelbot)
          if (cmd.piep) { pauseUntil = performance.now() + 300; setTimeout(() => M.piep(), 0); started = 'piep'; return; }
          if (cmd.keys.jump && prevJump && !releasing) { set({ ...cmd.keys, jump: false }); releasing = true; return; }
          releasing = false; set(cmd.keys); prevJump = cmd.keys.jump;
        } else if (started === 'piep') {
          started = true;
          if (cmd.keys.jump && prevJump) { set({ ...cmd.keys, jump: false }); releasing = true; return; }
          set(cmd.keys); prevJump = cmd.keys.jump;
        } else if (releasing) { releasing = false; set(cmd.keys); prevJump = cmd.keys.jump; }
        const lim = Math.round((cmd.secs != null ? cmd.secs : cmd.max) / STEP);
        if ((cmd.cond && cmd.cond.every(one)) || n >= lim) { i++; started = false; continue; }
        n++; return;
      }
    };
  }

  const bodyTick = () => {
    if (R.stop) return false;
    // a boss may hold the win card back for a last scene (boss field winAfter): keep filming until the card has been seen
    if (G.state === 'win') { afterWin += STEP; if (afterWin >= (job.kind === 'boss' && G.boss && G.boss.def.winAfter ? G.boss.def.winAfter + 2.4 : Math.max(winLeft, ((G.L && G.L.winAfter) || 1.1) + 1.4))) return false; }
    if (job.kind === 'boss' && G.boss && G.boss.done && G.state !== 'win') afterWin += STEP * 0.0; // the hat lands, then the door
    tick();
    return true;
  };
  let acc = 0, last = performance.now();
  const frame = (now) => {
    if (R.finished) return;
    if (now < pauseUntil) { last = now; requestAnimationFrame(frame); return; }
    acc += job.fast ? 1000 : Math.min((now - last) / 1000, 0.25); last = now;
    let k = 0;
    while (acc >= STEP && k < (job.fast ? 12 : 20)) {
      if (!bodyTick() || t >= limit) { R.finished = true; break; }
      if (performance.now() < pauseUntil) break;   // a piep waits for the wall clock: the game stands still until it has sounded (as in levelbot)
      M.sim.step(1); t += STEP; acc -= STEP; k++;
      if (window.__vidStep) window.__vidStep(t);
      if (job.fast && t >= (R.nt || 0)) { (R.trace = R.trace || []).push([+t.toFixed(2), +((G.p.x + G.p.w / 2) / T).toFixed(2), +((G.p.y + G.p.h) / T).toFixed(2)].join(',')); R.nt = (R.nt || 0) + 0.25; }
    }
    if (R.finished) {
      keysOff();
      R.result = { won: G.state === 'win', state: G.state, seconds: +t.toFixed(1), deaths: info.deaths, stars: G.starsGot, starsTotal: G.L.stars ? G.L.stars.length : null, hp: info.hp, trace: R.trace, levelTime: +G.levelTime.toFixed(1) };
      return;
    }
    requestAnimationFrame(frame);
  };
  R.started = true; R.t0 = performance.now();
  requestAnimationFrame((now) => { last = now; requestAnimationFrame(frame); });
}

