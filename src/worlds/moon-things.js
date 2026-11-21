// World 6 "Mond": the things that live on the moon, their rules and timing. Small moons ("O", they catch Mimo on an
// orbit, a jump press flings him off along the orbit), meteors ("M", a warning ring on the ground, then the impact),
// floating stones ("=", drift and bob, carry Mimo; as a comet they fly a fixed way and dissolve at its end) and
// shooting stars ("Z", touch one and it throws Mimo upwards; it comes back after a moment).
// Their pictures: moon-things-draw.js. Rules and numbers: tools/levels/world6-kit.md.
// Every timed state is a pure function of the game clock (api.time) and the level fields, the orbit is stepped on the
// fixed steps of the game, so the bots replay exactly. Nothing is allocated per step.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, M = () => window.MimoMoon;

  // ---------- numbers (measured in tools/moon-test.mjs) ----------
  // small moon: orbit radius R tiles, one turn in PERIOD s, fling speed LAUNCH px/s along the orbit; Mimo is caught
  // within PAD px outside the orbit, pulled onto it at PULL px/s; SIZE is the radius of the ball (px)
  const ORBIT = Object.freeze({ R: 2.5, PERIOD: 2.4, LAUNCH: 700, PAD: 10, PULL: 240, SIZE: 22, LEAVE: 14 });
  // meteor: one every EVERY s, the ring warns WARN s before the impact, the rock is in the air the last FLY s, it falls
  // from HIGH tiles above the ground at a slant of SLANT tiles sideways per tile down; the impact hurts within R px for
  // BLAST s; the rock itself has a radius of BODY px; nothing lands before FIRST s of level time; the crater glows CRATER s
  const MET = Object.freeze({ EVERY: 3.2, WARN: 1.3, FLY: 0.5, HIGH: 10, SLANT: 0.5, R: 30, BLAST: 0.12, BODY: 10, FIRST: 1.6, CRATER: 2.4 });
  // floating stone: bobs BOB tiles every BOB_T s, drifts dx/dy tiles in PERIOD s, dips DIP px under Mimo;
  // as a comet (or loop): appears at its start and waits HOLD s (time to step on), flies dx/dy tiles at SPEED tiles/s,
  // fades the last FADE s and is gone WAIT s
  const STONE = Object.freeze({ BOB: 0.12, BOB_T: 3.2, PERIOD: 6, DIP: 4, H: 16, FADE: 0.5, SPEED: 3, WAIT: 1.5, HOLD: 1.2 });
  // shooting star: throws Mimo up with V px/s when his box comes within R px of its centre, back after BACK s
  const BOOST = Object.freeze({ V: 620, R: 16, BACK: 2.4 });

  const lines = { orbit: ['Huiii!', 'Rundherum!', 'Ich bin ein Satellit.', 'Mir wird schwindelig.'], boost: ['Hui!', 'Sternschnuppe!'] };
  const entryAt = (list, x, y) => (Array.isArray(list) ? list.find((e) => e && e.x === x && e.y === y) : null) || {};
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const near = (x, y, screens) => { const cam = api.cam, vw = api.view; return Math.abs(x - (cam.x + vw.w / 2)) < vw.w * screens && Math.abs(y - (cam.y + vw.h / 2)) < vw.h * screens; };
  function boxCircle(p, cx, cy, r) {
    const nx = Math.max(p.x + 3, Math.min(cx, p.x + p.w - 3)), ny = Math.max(p.y + 3, Math.min(cy, p.y + p.h - 3));
    return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
  }
  // the first solid tile top at or below row ty in column tx (world px)
  function floorBelow(tx, ty) {
    for (let y = Math.max(0, ty); y < api.L.h; y++) if (api.isSolid(tx, y)) return y * T;
    return api.L.h * T;
  }

  // ---------- spawns (during map reading, before init) ----------
  const spawns = {
    O: { lint: { name: 'Kleine Monde', color: '#D8D5EE' }, spawn(L, x, y) {
      M().state(L).moons.push({ tx: x, ty: y, cx: x * T + T / 2, cy: y * T + T / 2, r: ORBIT.R * T, size: ORBIT.SIZE, period: ORBIT.PERIOD, dir: 1, launch: ORBIT.LAUNCH, away: true, near: 0, held: 0, line: null });
    } },
    M: { lint: { name: 'Meteore', color: '#E5847A' }, spawn(L, x, y) {
      M().state(L).meteors.push({ tx: x, ty: y, ix: x * T + T / 2, iy: (y + 1) * T, every: MET.EVERY, offset: 0, warn: MET.WARN, from: 1, sx: 0, sy: 0, x: 0, y: 0, fly: false, wk: 0, blast: false, n: null });
    } },
    // a run of "=" is one stone (n × 32 − 4 px wide), its top at the top of its row
    '=': { lint: { name: 'Schwebesteine', color: '#9A97C2' }, spawn(L, x, y) {
      const s = M().state(L), last = s.stones[s.stones.length - 1];
      if (last && last.ty === y && last.tx + last.n === x) { last.n++; last.body.w = last.n * T - 4; return; }
      const st = { tx: x, ty: y, n: 1, bx: x * T + 2, by: y * T, dx: 0, dy: 0, period: STONE.PERIOD, offset: 0, bob: STONE.BOB, loop: null, comet: false, dip: 0, alpha: 1, x: x * T + 2, y: y * T };
      st.body = { stone: true, st, x: st.bx, y: st.by, w: T - 4, off: false };
      s.stones.push(st); L.bodies.push(st.body);
    } },
    Z: { lint: { name: 'Sternschnuppen', color: '#BFF3FF' }, spawn(L, x, y) {
      M().state(L).boosts.push({ tx: x, ty: y, cx: x * T + T / 2, cy: y * T + T / 2, v: BOOST.V, ready: true, t: 0 });
    } },
  };

  // level entries change the defaults (see world6-kit.md)
  function applyEntries(m, def) {
    for (const mo of m.moons) {
      const e = entryAt(def.moons, mo.tx, mo.ty);
      mo.r = (e.r || ORBIT.R) * T; mo.period = e.period || ORBIT.PERIOD; mo.dir = e.dir === -1 ? -1 : 1; mo.launch = e.launch || ORBIT.LAUNCH;
      mo.size = e.size || ORBIT.SIZE; mo.line = e.line || null; mo.away = true;
    }
    for (const me of m.meteors) {
      const e = entryAt(def.meteors, me.tx, me.ty);
      me.every = Math.max(e.every || MET.EVERY, (e.warn || MET.WARN) + MET.BLAST + 0.3); me.offset = e.offset || 0; me.warn = e.warn || MET.WARN; me.from = e.from === -1 ? -1 : 1;
      me.iy = floorBelow(me.tx, me.ty);
      me.sx = me.ix + me.from * MET.SLANT * MET.HIGH * T; me.sy = me.iy - MET.HIGH * T; me.n = null;
    }
    for (const st of m.stones) {
      const e = entryAt(def.stones, st.tx, st.ty);
      st.dx = e.dx || 0; st.dy = e.dy || 0; st.period = e.period || STONE.PERIOD; st.offset = e.offset || 0; st.bob = e.bob != null ? e.bob : STONE.BOB;
      st.comet = !!e.comet;
      st.loop = e.loop || st.comet ? { speed: (e.speed || STONE.SPEED) * T, wait: e.wait != null ? e.wait : STONE.WAIT, hold: e.hold != null ? e.hold : STONE.HOLD, len: Math.hypot(st.dx, st.dy) * T } : null;
      if (st.loop && st.loop.len < T) st.loop = null;
    }
    for (const b of m.boosts) { const e = entryAt(def.boosts, b.tx, b.ty); b.v = e.v || BOOST.V; b.ready = true; b.t = 0; }
  }

  // ---------- small moons and their orbits ----------
  const pos = { x: 0, y: 0 };
  function orbitPoint(o, ang) { pos.x = o.mo.cx + Math.cos(ang) * o.r; pos.y = o.mo.cy + Math.sin(ang) * o.r; return pos; }
  // screen angle a (y down) to degrees the way people read them: 0 right, 90 top, 180 left, 270 bottom
  const toDeg = (a) => mod(-a * 180 / Math.PI, 360);
  function catchMimo(m, p, mo, d) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    m.orbit = { mo, ang: Math.atan2(cy - mo.cy, cx - mo.cx), r: Math.max(mo.size + 8, d), t: 0 };
    mo.away = false; p.orbit = true; p.flung = false; p.carried = null; p.jumpBuf = 0; p.canCut = false;
    api.voice({ type: 'sine', f0: 520, f1: 880, slide: 0.18, dur: 0.22, vol: 0.03 });
    if (mo.line || api.hash(mo.tx, Math.floor(api.time)) < 0.3) api.bubble(mo.line || api.pick(lines.orbit), 'player', 1.1);
  }
  function dropOrbit(m, p) { m.orbit = null; p.orbit = false; p.orbitDeg = null; }
  // the jump press on an orbit: fling off along the orbit
  function fling(p) {
    const m = api.L.moon, o = m.orbit; if (!o) return false;
    const dir = o.mo.dir, tx = -Math.sin(o.ang) * dir, ty = Math.cos(o.ang) * dir;
    p.vx = tx * o.mo.launch; p.vy = ty * o.mo.launch;
    p.flung = true; p.canCut = false; p.coyote = 0; p.sx = 0.84; p.sy = 1.18;
    if (Math.abs(tx) > 0.2) p.facing = tx > 0 ? 1 : -1;
    dropOrbit(m, p);
    api.sfx.jump(); api.voice({ type: 'triangle', f0: 700, f1: 1300, slide: 0.12, dur: 0.16, vol: 0.03 });
    if (!api.reduced) api.burst(p.x + p.w / 2, p.y + p.h / 2, 8, [api.W.orbit || '#FFFFFF', api.W.boost || '#BFF3FF'], 90, { grav: 60, life: 0.35 });
    return true;
  }
  const ORB_OUT = { gravity: 0, maxFall: 100000, accel: 0, run: 0, jump: fling };
  function orbitPhysics(p) { const m = api.L && api.L.moon; return m && m.orbit ? ORB_OUT : null; }
  function updateMoons(m, p, dt) {
    const play = api.state === 'play', cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const o = m.orbit;
    if (o) {
      const e = orbitPoint(o, o.ang);
      // blocked by a wall or landed on something: the moon lets go
      if (!play || p.grounded || Math.hypot(cx - e.x, cy - e.y) > 6) { dropOrbit(m, p); p.vx *= 0.3; p.vy = Math.max(0, p.vy * 0.3); }
      else {
        o.ang += o.mo.dir * TAU / o.mo.period * dt; o.t += dt;
        o.r += clamp(o.mo.r - o.r, -ORBIT.PULL * dt, ORBIT.PULL * dt);
        const n = orbitPoint(o, o.ang);
        p.vx = (n.x - cx) / dt; p.vy = (n.y - cy) / dt; p.orbitDeg = toDeg(o.ang);
        if (Math.abs(p.vx) > 20) p.facing = p.vx > 0 ? 1 : -1;
      }
    }
    for (const mo of m.moons) {
      const d = Math.hypot(cx - mo.cx, cy - mo.cy);
      if (d > mo.r + ORBIT.PAD + ORBIT.LEAVE) mo.away = true;
      // how close Mimo is in the air (the orbit ring brightens), and whether he rides it (the moon smiles)
      const want = m.orbit && m.orbit.mo === mo ? 1 : !p.grounded && d < mo.r + 2.5 * T ? 0.6 : 0;
      mo.near += clamp(want - mo.near, -dt * 4, dt * 4);
      mo.held = m.orbit && m.orbit.mo === mo ? 1 : 0;
      if (m.orbit || !play || p.grounded || !mo.away || d > mo.r + ORBIT.PAD) continue;
      catchMimo(m, p, mo, d);
    }
  }

  // ---------- meteors ----------
  const valid = (t) => t >= MET.FIRST;
  // the state at time t: me.fly, me.x, me.y (the rock), me.wk (0..1 warning, 1 at the impact), me.blast, me.n (impact count)
  function meteorAt(me, time) {
    const k = Math.floor((time - me.offset) / me.every), tl = me.offset + k * me.every, tn = tl + me.every;
    me.blast = valid(tl) && time - tl < MET.BLAST;
    me.wk = valid(tn) && tn - time <= me.warn ? 1 - (tn - time) / me.warn : 0;
    me.fly = valid(tn) && tn - time <= MET.FLY;
    if (me.fly) { const s = 1 - (tn - time) / MET.FLY; me.x = me.sx + (me.ix - me.sx) * s; me.y = me.sy + (me.iy - me.sy) * s; }
    return valid(tl) ? k : null;
  }
  function updateMeteors(m, p) {
    const play = api.state === 'play';
    for (const me of m.meteors) {
      const k = meteorAt(me, api.time);
      if (k != null && k !== me.n) impact(m, me);
      me.n = k;
      if (!play) continue;
      if ((me.fly && boxCircle(p, me.x, me.y, MET.BODY)) || (me.blast && boxCircle(p, me.ix, me.iy - 4, MET.R))) api.hurt();
    }
  }
  function impact(m, me) {
    m.craters.push({ x: me.ix, y: me.iy, t0: api.time });
    if (m.craters.length > 8) m.craters.shift();
    if (!near(me.ix, me.iy, 1.2)) return;
    const W = api.W;
    api.burst(me.ix, me.iy - 3, 14, [W.dust || '#E3E1F4', W.meteor || '#E5847A', W.tail || '#FFC978'], 150, { grav: 260, vy: -110, life: 0.5 });
    api.ring(me.ix, me.iy - 4, W.warn || '#E79AB3');
    api.noise({ lp: 600, f1: 90, dur: 0.3, vol: 0.05 }); api.shake(0.18);
  }

  // ---------- floating stones ----------
  function stoneAt(st, time) {
    const bob = st.bob * T * Math.sin(TAU * (time + st.offset) / STONE.BOB_T);
    if (st.loop) {
      const lp = st.loop, tt = lp.len / lp.speed, all = lp.hold + tt, u = mod(time + st.offset, all + lp.wait);
      if (u >= all) { st.x = st.bx; st.y = st.by; st.alpha = 0; return false; }
      const k = Math.max(0, u - lp.hold) / tt; st.x = st.bx + st.dx * T * k; st.y = st.by + st.dy * T * k + bob * 0.3;
      st.alpha = Math.min(1, u / 0.25, (all - u) / STONE.FADE);
      return true;
    }
    const s = Math.sin(TAU * (time + st.offset) / st.period);
    st.x = st.bx + st.dx * T * s; st.y = st.by + st.dy * T * s + bob; st.alpha = 1;
    return true;
  }
  function updateStones(m, p, dt) {
    for (const st of m.stones) {
      const on = stoneAt(st, api.time), b = st.body;
      st.dip += clamp((p.carried === b ? STONE.DIP : 0) - st.dip, -30 * dt, 30 * dt);
      b.x = st.x; b.y = st.y + st.dip; b.off = !on;
    }
  }

  // ---------- shooting stars ----------
  function updateBoosts(m, p, dt) {
    const play = api.state === 'play';
    for (const b of m.boosts) {
      if (!b.ready) { b.t += dt; if (b.t >= BOOST.BACK) { b.ready = true; b.t = 0; } continue; }
      if (!play || !boxCircle(p, b.cx, b.cy, BOOST.R)) continue;
      b.ready = false; b.t = 0;
      if (m.orbit) dropOrbit(m, p);
      p.vy = -b.v; p.canCut = false; p.flung = false; p.carried = null; p.coyote = 0; p.sx = 0.8; p.sy = 1.25;
      api.voice({ type: 'sine', f0: 660, f1: 1760, slide: 0.25, dur: 0.3, vol: 0.035 });
      if (!api.reduced) api.burst(b.cx, b.cy, 12, [api.W.boost || '#BFF3FF', '#FFFFFF'], 130, { grav: 80, life: 0.45 });
      api.ring(b.cx, b.cy, api.W.boost || '#BFF3FF');
      if (api.hash(b.tx, Math.floor(api.time)) < 0.25) api.bubble(api.pick(lines.boost), 'player', 0.9);
    }
  }

  // the rider of a body is moved last, so it carries him after it moved (the core does the carrying)
  function keepRide(L) {
    const r = api.p && api.p.carried, i = r ? L.bodies.indexOf(r) : -1;
    if (i >= 0 && i < L.bodies.length - 1) { L.bodies.splice(i, 1); L.bodies.push(r); }
  }

  window.MimoWorlds.register({
    world: 6,
    spawns,
    setup(a) { api = a; },
    init(L, info) {
      const m = M().state(L);
      if (api.p) { api.p.orbit = false; api.p.orbitDeg = null; api.p.flung = false; }
      if (info.reason === 'respawn') { for (const mo of m.moons) mo.away = true; return; }
      applyEntries(m, info.def || {});
      for (const me of m.meteors) me.n = meteorAt(me, api.time);
      if (api.p) updateStones(m, api.p, 0);
    },
    update(dt) {
      const m = api.L && api.L.moon, p = api.p; if (!m || !p) return;
      updateStones(m, p, dt); updateMoons(m, p, dt); updateMeteors(m, p); updateBoosts(m, p, dt); keepRide(api.L);
      for (let i = m.craters.length - 1; i >= 0; i--) if (api.time - m.craters[i].t0 > MET.CRATER) m.craters.splice(i, 1);
    },
  });
  Object.assign(window.MimoMoon, { ORBIT, MET, STONE, BOOST, orbitPhysics, meteorAt, stoneAt, toDeg, orbitPoint });
})();
