// Page side of tools/moon-test.mjs: a little laboratory for world 6 "Mond" that runs inside the game page.
// It builds test fields, loads them into the first level slot of world 6, steps the game frame by frame
// (deterministic) and measures. Plain browser JS (no imports); the test loads it with page.addInitScript.
(function () {
  'use strict';
  const T = 32;
  const M = () => window.__mimo, G = () => window.__mimo.G, MM = () => window.MimoMoon;

  // ---------- maps ----------
  // a field: walls left and right, ground rows at the bottom (from row `floor`), put: [[x, y, 'chars'], ...]
  function field(o) {
    const w = o.w || 40, h = o.h || 16, floor = o.floor != null ? o.floor : h - 3, rows = [];
    for (let y = 0; y < h; y++) {
      const r = new Array(w).fill(' ');
      r[0] = '#'; r[w - 1] = '#';
      if (y >= floor) r.fill('#');
      rows.push(r);
    }
    for (const [x, y, s] of o.put || []) for (let i = 0; i < s.length; i++) if (rows[y] && x + i < w) rows[y][x + i] = s[i];
    if (!rows.some((r) => r.includes('P'))) rows[floor - 1][2] = 'P';
    return rows.map((r) => r.join(''));
  }
  const slot = () => M().WORLDS[6].firstLevel;
  function load(def, at) {
    const m = M(), i = slot();
    m.progress.invincible = false; m.progress.zen = false;
    m.LEVELS[i] = Object.assign({ world: 6, name: 'Labor', hint: '' }, def);
    keys('');
    m.sim.hold(true); m.load(i); G().bubbles = [];
    if (at) place(at[0], at[1]);
    return G().L.moon;
  }
  // feet on the bottom of tile row ty
  function place(tx, ty) { const p = G().p; p.x = tx * T + (T - p.w) / 2; p.y = (ty + 1) * T - p.h; p.vx = 0; p.vy = 0; G().respawn = { x: p.x, y: p.y }; }
  function keys(s) { const m = M(); m.setKey('left', s.includes('L')); m.setKey('right', s.includes('R')); m.setKey('down', s.includes('D')); m.setKey('jump', s.includes('J')); }
  const STEP = () => M().sim.STEP;
  function step(secs, each) { const n = Math.round(secs / STEP()); for (let i = 0; i < n; i++) { M().sim.step(1); if (each && each(i) === true) return (i + 1) * STEP(); } return n * STEP(); }
  function until(cond, max) { return step(max || 8, () => !!cond()); }
  const p = () => G().p, feet = () => p().y + p().h, dead = () => G().state === 'dead', cx = () => p().x + p().w / 2, cy = () => p().y + p().h / 2;
  const r2 = (n) => Math.round(n * 100) / 100;
  const now = () => G().time;

  // ---------- jumps: height (held), short tap, airtime, running distance; in a field or a base ----------
  function jumpOf(def, ground) {
    const g = ground || 12, out = {};
    load(def, [4, g]); step(0.05);
    let peak = feet(); const y0 = feet(); keys('J'); const air = step(3, () => { peak = Math.min(peak, feet()); return p().grounded && now() > 0.2; }); keys('');
    out.high = r2((y0 - peak) / T); out.air = r2(air);
    load(def, [4, g]); step(0.05);
    peak = feet(); keys('J'); step(0.05); keys(''); step(1.5, () => { peak = Math.min(peak, feet()); });
    out.tap = r2((y0 - peak) / T);
    load(def, [4, g]); step(0.05);
    keys('R'); step(0.6); const x0 = p().x; keys('RJ'); step(0.05); let xl = null; step(3, () => { if (p().grounded) { xl = p().x; return true; } }); keys('');
    out.run = r2((xl - x0) / T);
    // without holding: the jump cut on the moon
    return out;
  }
  function jumps() {
    const plain = { map: field({ w: 60 }) };
    const out = { moon: jumpOf(plain), earth: jumpOf({ map: field({ w: 60 }), bases: [{ x: 1, y: 0, w: 58, h: 13 }] }), light: jumpOf({ map: field({ w: 60 }), gravity: 0.6 }) };
    // the biggest gap a running jump clears (ground on both sides at the same height), and the highest ledge reachable
    out.gap = {};
    for (const n of [6, 7, 8]) {
      const put = [[20, 13, ' '.repeat(n)], [20, 14, ' '.repeat(n)], [20, 15, ' '.repeat(n)]];
      load({ map: field({ w: 60, put }) }, [8, 12]); keys('R'); until(() => p().x + p().w >= 20 * T - 2, 3); keys('RJ'); step(0.6); keys('R'); until(() => p().grounded || dead(), 3); keys('');
      out.gap[n] = !dead() && p().x > (20 + n) * T - 10;
    }
    out.ledge = {};
    for (const k of [4, 5, 6]) {
      const put = [[14, 13 - k, '#'.repeat(10)]];
      for (let y = 13 - k + 1; y < 13; y++) put.push([14, y, '#']);
      load({ map: field({ w: 40, put }) }, [10, 12]); keys('RJ'); step(1.6); keys(''); step(0.3);
      out.ledge[k] = feet() === (13 - k) * T && p().x > 14 * T;
    }
    // walking speed and air control are the game's: run 1 s on the moon vs in a base
    load(plain, [4, 12]); keys('R'); step(1); out.walk = r2((p().x - 4 * T) / T); keys('');
    // falling: how fast after a long fall (px/s)
    load({ map: field({ h: 40, floor: 37 }) }, [4, 4]); p().y = 2 * T; step(3, () => p().grounded); out.maxFall = Math.round(p().vy || 0);
    load({ map: field({ h: 40, floor: 37 }) }, [4, 4]); p().y = 2 * T; let vmax = 0; step(3, () => { vmax = Math.max(vmax, p().vy); return p().grounded; }); out.maxFall = Math.round(vmax);
    return out;
  }

  // ---------- moon base ----------
  function base() {
    const out = {}, put = [[10, 6, 'BBBBBBBBBBB'], [10, 7, 'B'], [20, 7, 'B'], [10, 8, 'B'], [20, 8, 'B']];
    load({ map: field({ w: 40, put }), bases: [{ x: 10, y: 6, w: 11, h: 7 }] }, [14, 12]); step(0.3);
    out.inBase = G().L.moon.inBase; out.helmetOff = G().L.moon.helmet < 0.05;
    let peak = feet(); const y0 = feet(); keys('J'); step(0.8, () => { peak = Math.min(peak, feet()); }); keys(''); step(0.6);
    out.baseJump = r2((y0 - peak) / T);
    // walking out: the moon jump again, the helmet comes back
    keys('R'); until(() => p().x > 23 * T, 3); keys(''); step(0.4);
    out.outside = !G().L.moon.inBase && G().L.moon.helmet > 0.95;
    peak = feet(); const y1 = feet(); keys('J'); step(1.2, () => { peak = Math.min(peak, feet()); }); keys('');
    out.outsideJump = r2((y1 - peak) / T);
    return out;
  }

  // ---------- dust on landing ----------
  function dust() {
    load({ map: field({}) }, [6, 4]); p().y = 4 * T; const n0 = G().particles.length;
    until(() => p().grounded, 3); step(0.02);
    return { puff: G().particles.length - n0 };
  }

  // ---------- small moons ----------
  function orbit() {
    const out = {}, O = MM().ORBIT;
    // a moon at (14, 6), Mimo jumps up into its orbit from below-left
    const def = { map: field({ w: 40, put: [[14, 6, 'O']] }) };
    let m = load(def, [12, 12]); const mo = m.moons[0];
    keys('J'); until(() => m.orbit, 2); keys('');
    out.caught = !!m.orbit; out.caughtAt = r2(now());
    // a full turn: how long
    const a0 = m.orbit ? m.orbit.ang : 0; const t0 = now(); let turn = null;
    step(5, () => { if (!m.orbit) return true; const da = (m.orbit.ang - a0) * mo.dir; if (da >= Math.PI * 2) { turn = r2(now() - t0); return true; } });
    out.turn = turn; out.radius = r2(m.orbit ? m.orbit.r / T : 0);
    out.speed = r2(2 * Math.PI * mo.r / mo.period / T); out.launch = mo.launch;
    // fling at the top (90 degrees): how high does he get above the release point, and how far sideways
    out.top = flingAt(def, 90);
    out.left = flingAt(def, 180);
    out.bottom = flingAt(def, 270);
    out.right = flingAt(def, 0);
    // no catch while walking on the ground under it; caught again only after leaving the orbit
    m = load({ map: field({ w: 40, put: [[14, 10, 'O']] }), moons: [{ x: 14, y: 10, r: 1.5 }] }, [8, 12]);
    keys('R'); step(1.5); keys(''); out.groundFree = !m.orbit;
    return out;
  }
  function flingAt(def, deg) {
    const m = load(def, [12, 12]); keys('J'); until(() => m.orbit, 2); keys('');
    until(() => m.orbit && Math.abs(((p().orbitDeg - deg + 540) % 360) - 180) < 3, 4);
    const x0 = cx(), y0 = feet(); keys(deg === 90 ? 'J' : 'J'); step(0.02); keys(deg === 180 ? 'L' : deg === 0 ? 'R' : deg === 90 ? 'R' : 'R');
    let peak = y0, landX = null, tl = null; const t0 = now();
    step(4, () => { peak = Math.min(peak, feet()); if (p().grounded) { landX = cx(); tl = now(); return true; } });
    keys('');
    return { up: r2((y0 - peak) / T), side: landX != null ? r2((landX - x0) / T) : null, air: tl != null ? r2(tl - t0) : null };
  }
  // release windows: for every release angle (2° steps) fling off the first moon (stick held the way he flies) and
  // test where he ends up; the longest run of good angles in seconds is how long the jump press may come
  // steer: false = the stick is held the way he flies; true = also try letting go and pushing back (a human steers)
  function scan(def, start, good, steer) {
    const hits = [];
    for (let d = 0; d < 360; d += 2) {
      // the way he flies: the tangent of a clockwise orbit at d degrees points to cos(d - 90°)
      const fly = Math.cos((d - 90) * Math.PI / 180) >= 0 ? 'R' : 'L';
      for (const k of steer ? [fly, '', fly === 'R' ? 'L' : 'R'] : [fly]) {
        const m = load(def, start); keys('J'); until(() => m.orbit, 2); keys('');
        until(() => m.orbit && Math.abs(((p().orbitDeg - d + 540) % 360) - 180) < 1.6, 5);
        if (!m.orbit) continue;
        keys('J'); step(0.02); keys(k);
        const ok = good(m); keys('');
        if (ok) { hits.push(d); break; }
      }
    }
    let best = [], run = [];
    for (let d = 0; d < 720; d += 2) { if (hits.includes(d % 360)) { run.push(d); if (run.length > best.length) best = run.slice(); } else run = []; }
    if (best.length > 180) best = best.slice(0, 180);
    const per = MM().ORBIT.PERIOD / 360;
    return { degs: best.length ? [best[0] % 360, best[best.length - 1] % 360] : null, seconds: best.length ? r2(best.length * 2 * per) : 0, hits: hits.length };
  }
  // a ledge of w tiles at (lx, ly), the moon at (14, 6)
  function window_(lx, ly, w, steer) {
    const def = { map: field({ w: 44, put: [[14, 6, 'O'], [lx, ly, '#'.repeat(w)]] }) };
    return scan(def, [12, 12], () => { until(() => p().grounded || dead(), 3); return !dead() && feet() === ly * T && cx() >= lx * T && cx() <= (lx + w) * T; }, steer);
  }
  // a pit (from x 10, pw tiles wide, thorns at its bottom), the moon over its left edge: fling over it onto the far side
  function pit(pw, steer) {
    const put = [[10, 6, 'O']];
    for (let y = 13; y < 16; y++) put.push([10, y, ' '.repeat(pw)]);
    put.push([10, 15, '^'.repeat(pw)]);
    const def = { map: field({ w: 50, h: 16, put }) };
    return scan(def, [8, 12], () => { until(() => p().grounded || dead(), 3); return !dead() && feet() === 13 * T && cx() >= (10 + pw) * T; }, steer);
  }
  // where a fling at each angle lands (moon at (14, 6), ground 6.5 tiles under its centre), stick held the way he flies
  function flingTable() {
    const out = [], def = { map: field({ w: 60, put: [[24, 6, 'O']] }) };
    for (let d = 0; d < 360; d += 30) {
      const fly = Math.cos((d - 90) * Math.PI / 180) >= 0.01 ? 'R' : Math.cos((d - 90) * Math.PI / 180) <= -0.01 ? 'L' : '';
      const m = load(def, [22, 12]); keys('J'); until(() => m.orbit, 2); keys('');
      until(() => m.orbit && Math.abs(((p().orbitDeg - d + 540) % 360) - 180) < 1.6, 5);
      const mo = m.moons[0]; keys('J'); step(0.02); keys(fly); let peak = 1e9; const t0 = now();
      until(() => { peak = Math.min(peak, feet()); return p().grounded || dead() || m.orbit; }, 4); keys('');
      out.push({ deg: d, peak: r2((mo.cy - peak) / T), land: r2((cx() - mo.cx) / T), air: r2(now() - t0) });
    }
    return out;
  }
  // from one moon into the orbit of the next one (dx tiles further right, same height)
  function chain(dx) {
    const def = { map: field({ w: 44, put: [[8, 6, 'O'], [8 + (dx || 9), 6, 'O']] }) };
    return scan(def, [6, 12], () => { const m = G().L.moon; until(() => (m.orbit && m.orbit.mo === m.moons[1]) || p().grounded, 3); return !!(m.orbit && m.orbit.mo === m.moons[1]); });
  }

  // ---------- meteors ----------
  function meteor() {
    const out = {}, def = { map: field({ put: [[16, 12, 'M']] }) };
    let m = load(def, [4, 12]); const me = m.meteors[0];
    const log = []; let lastW = false, lastF = false;
    step(me.every * 2 + 2, () => {
      if ((me.wk > 0) !== lastW) { log.push([me.wk > 0 ? 'warn' : 'clear', r2(now())]); lastW = me.wk > 0; }
      if (me.fly !== lastF) { log.push([me.fly ? 'fly' : 'land', r2(now())]); lastF = me.fly; }
    });
    out.log = log.slice(0, 8);
    const warn = log.find((e) => e[0] === 'warn'), land = log.find((e) => e[0] === 'land'), fly = log.find((e) => e[0] === 'fly');
    out.warnLead = warn && land ? r2(land[1] - warn[1]) : null; out.flyTime = fly && land ? r2(land[1] - fly[1]) : null; out.firstImpact = land ? land[1] : null;
    out.every = me.every;
    // standing right on the spot: hit at the impact; standing beside the ring: safe
    m = load(def, [16, 12]); step(me.every + 0.2, () => dead()); out.hitsOnSpot = dead(); out.hitAt = r2(now());
    const R = MM().MET.R;
    out.safe = {};
    for (const d of [1, 1.5, 2]) {
      m = load(def, [16, 12]); p().x = 16 * T + T / 2 + d * T - p().w / 2; step(me.every * 2 + 0.3, () => dead()); out.safe[d] = !dead();
    }
    out.reach = R; out.blast = MM().MET.BLAST;
    // a crater stays a while (looks only)
    m = load(def, [4, 12]); until(() => m.craters.length > 0, 6); out.crater = m.craters.length > 0;
    return out;
  }

  // ---------- floating stones ----------
  function stones() {
    const out = {};
    let m = load({ map: field({ put: [[10, 9, '===']] }) }, [11, 8]); const st = m.stones[0];
    out.width = st.body.w;
    let mn = 1e9, mx = -1e9, rode = 0; step(4, () => { mn = Math.min(mn, st.y); mx = Math.max(mx, st.y); if (p().carried === st.body) rode++; });
    out.bob = r2((mx - mn) / T); out.carries = rode > 400; out.dip = st.dip;
    m = load({ map: field({ put: [[10, 9, '===']] }), stones: [{ x: 10, y: 9, dx: 3, period: 6 }] }, [11, 8]);
    const s2 = m.stones[0]; mn = 1e9; mx = -1e9; let on = 0; step(6.2, () => { mn = Math.min(mn, s2.x); mx = Math.max(mx, s2.x); if (p().carried === s2.body) on++; });
    out.drift = r2((mx - mn) / T); out.driftCarries = on > 600;
    // a comet: flies its way, dissolves at the end (whoever is still on it falls), comes back at the start
    m = load({ map: field({ w: 40, put: [[6, 8, '===']] }), stones: [{ x: 6, y: 8, comet: true, dx: 20, speed: 4, wait: 1 }] }, [7, 7]);
    const c = m.stones[0]; let lastOn = 0, offAt = null;
    step(8, () => { if (p().carried === c.body) lastOn = now(); if (c.body.off && offAt == null) offAt = r2(now()); });
    out.cometTrip = offAt; out.cometDrops = !p().carried || p().carried !== c.body; out.cometLen = r2(c.loop.len / T); out.cometHold = c.loop.hold; out.cometSpeed = r2(c.loop.speed / T);
    return out;
  }

  // ---------- shooting stars ----------
  function boosts() {
    const out = {};
    let m = load({ map: field({ put: [[10, 12, 'Z']] }) }, [8, 12]);
    const y0 = feet(); keys('R'); let peak = y0; step(2, () => { peak = Math.min(peak, feet()); if (!m.boosts[0].ready && m.boosts[0].t0 == null) { m.boosts[0].t0 = now(); keys(''); } });
    out.used = !m.boosts[0].ready; out.lift = r2((y0 - peak) / T);
    // back after BACK s
    const used = m.boosts[0].t0; until(() => m.boosts[0].ready, 5); out.back = r2(now() - used);
    // in the air: boost on top of a jump
    m = load({ map: field({ put: [[10, 8, 'Z']] }) }, [10, 12]);
    keys('J'); let pk = feet(); step(2.5, () => { pk = Math.min(pk, feet()); }); keys('');
    out.jumpPlusBoost = r2((13 * T - pk) / T);
    return out;
  }

  // ---------- lines, darkness, bodies ----------
  function says() {
    load({ map: field({}), says: [{ x: 15, y: 12, r: 2, text: 'Mondstaub.' }] }, [4, 12]);
    const said = () => (G().bubbles || []).filter((x) => x.text === 'Mondstaub.').length;
    G().bubbles = []; keys('R'); const before = said(); until(() => p().x > 13.2 * T, 3); step(0.05); const near = said(); keys('');
    return { saysFar: before, saysNear: near };
  }
  function darkLook() { load({ map: field({ put: [[16, 12, 'M'], [20, 6, 'O'], [26, 10, 'Z']] }), dark: { r: 6 }, lamps: [{ x: 30, y: 11, r: 3 }] }, [8, 12]); step(2); return { dark: !!G().L.moon.dark }; }
  function bodies() {
    const m = load({ map: field({ put: [[10, 9, '==']] }) });
    return { stoneBody: G().L.bodies.includes(m.stones[0].body) };
  }

  // ---------- staged scenes for screenshots (tools/moon-test.mjs --shots dir) ----------
  const SCENES = {
    // the moon jump over a pit, decoration on the ground, a flag, stars
    jump() {
      const put = [[3, 12, 'R'], [6, 12, 'Y'], [9, 12, 'f'], [26, 12, 'Y'], [29, 12, 'R'], [20, 7, '*'], [33, 12, 'D'], [24, 12, '^^']];
      for (let y = 13; y < 16; y++) put.push([14, y, '        ']);
      put.push([14, 15, '^^^^^^^^']);
      load({ map: field({ w: 40, put }), decor: [{ k: 'tracks', x: 2, y: 12, w: 8 }, { k: 'flag', x: 5, y: 12 }, { k: 'rocket', x: 22, y: 12 }, { k: 'dish', x: 28, y: 12, dir: -1 }] }, [10, 12]); keys('R'); step(0.4); keys('RJ'); step(0.55); keys('');
    },
    orbit() {
      const m = load({ map: field({ w: 40, put: [[14, 6, 'O'], [23, 5, 'O'], [20, 3, '*']] }), moons: [{ x: 23, y: 5, dir: -1 }] }, [12, 12]);
      keys('J'); until(() => m.orbit, 2); keys(''); until(() => p().orbitDeg > 100 && p().orbitDeg < 110, 4);
    },
    meteor() {
      const m = load({ map: field({ w: 40, put: [[14, 12, 'M'], [22, 12, 'M'], [5, 12, 'R']] }), meteors: [{ x: 22, y: 12, offset: 1.2, from: -1 }] }, [9, 12]);
      until(() => m.meteors[0].fly && m.meteors[0].wk > 0.85, 6);
    },
    stones() {
      const put = [[9, 10, '==='], [15, 8, '=='], [21, 9, '==='], [27, 6, 'Z'], [4, 5, '===']];
      for (let y = 13; y < 16; y++) put.push([8, y, '                    ']);
      put.push([8, 15, '^^^^^^^^^^^^^^^^^^^^']);
      load({ map: field({ w: 40, put }), stones: [{ x: 15, y: 8, dy: 1.5, period: 4 }, { x: 4, y: 5, comet: true, dx: 30, dy: 1, speed: 5, wait: 1 }] }, [10, 9]);
      step(1.1);
    },
    base() {
      const put = [[12, 6, 'BBBBBBBBBBBBBB'], [12, 7, 'B'], [12, 8, 'B'], [25, 7, 'B'], [25, 8, 'B'], [17, 12, 'f'], [20, 9, '-']];
      load({ map: field({ w: 40, put }), bases: [{ x: 12, y: 6, w: 14, h: 7 }] }, [14, 12]); keys('R'); step(0.5); keys('RJ'); step(0.25); keys('');
    },
    dark() {
      const m = load({ map: field({ w: 40, put: [[16, 12, 'M'], [22, 6, 'O'], [7, 9, 'Z'], [26, 12, '*'], [30, 12, 'Y']] }), dark: { r: 6 }, lamps: [{ x: 30, y: 11, r: 3 }] }, [12, 12]);
      until(() => m.meteors[0].wk > 0.6, 6);
    },
    cheese() {
      const put = [[8, 13, 'KKKKKKKKKKKK'], [8, 14, 'KKKKKKKKKKKK'], [8, 15, 'KKKKKKKKKKKK'], [12, 12, '^^'], [14, 9, 'KKKK'], [22, 8, 'vvv'], [22, 7, 'KKK'], [15, 8, '*']];
      load({ map: field({ w: 40, put }) }, [9, 12]); keys('R'); step(0.3); keys('RJ'); step(0.3); keys('');
    },
  };
  function scene(name) { SCENES[name](); G().bubbles = []; return Object.keys(SCENES); }

  window.__lab = { scene, SCENES, field, load, place, keys, step, until, p, feet, jumps, base, dust, orbit, window: window_, pit, flingTable, chain, meteor, stones, boosts, says, darkLook, bodies };
})();
