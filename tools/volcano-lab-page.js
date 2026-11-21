// Page side of tools/volcano-test.mjs: a little laboratory for world 5 that runs inside the game page.
// It builds test fields, loads them into the first level slot of world 5, steps the game frame by frame
// (deterministic) and measures. Plain browser JS (no imports); the test loads it with page.addInitScript.
(function () {
  'use strict';
  const T = 32;
  const M = () => window.__mimo, G = () => window.__mimo.G, V = () => window.MimoVolcano;

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
  const slot = () => M().WORLDS[5].firstLevel;
  function load(def, at) {
    const m = M(), i = slot();
    m.progress.invincible = false; m.progress.zen = false;
    m.LEVELS[i] = Object.assign({ world: 5, name: 'Labor', hint: '' }, def);
    keys('');
    m.sim.hold(true); m.load(i); G().bubbles = [];
    if (at) place(at[0], at[1]);
    return G().L.volcano;
  }
  // feet on the bottom of tile row ty
  function place(tx, ty) { const p = G().p; p.x = tx * T + (T - p.w) / 2; p.y = (ty + 1) * T - p.h; p.vx = 0; p.vy = 0; G().respawn = { x: p.x, y: p.y }; }
  function keys(s) { const m = M(); m.setKey('left', s.includes('L')); m.setKey('right', s.includes('R')); m.setKey('down', s.includes('D')); m.setKey('jump', s.includes('J')); }
  const STEP = () => M().sim.STEP;
  function step(secs, each) { const n = Math.round(secs / STEP()); for (let i = 0; i < n; i++) { M().sim.step(1); if (each && each(i) === true) return (i + 1) * STEP(); } return n * STEP(); }
  function until(cond, max) { return step(max || 8, () => cond()); }
  const p = () => G().p, feet = () => p().y + p().h, dead = () => G().state === 'dead';
  const r2 = (n) => Math.round(n * 100) / 100;
  const now = () => G().time;

  // ---------- reference: the land jump ----------
  function landJump() {
    load({ map: field({ h: 16 }) }, [4, 12]);
    let peak = feet(); const y0 = feet(); keys('J'); step(0.6, () => { peak = Math.min(peak, feet()); }); keys(''); step(0.5);
    load({ map: field({ h: 16 }) }, [4, 12]);
    keys('R'); step(0.6); const x0 = p().x; keys('RJ'); step(0.05); let xl = null; step(1.5, () => { if (p().grounded) { xl = p().x; return true; } }); keys('');
    return { landJump: r2((y0 - peak) / T), landJumpRun: r2((xl - x0) / T) };
  }

  // ---------- lava ----------
  function lava() {
    const out = {};
    // walking into a pool: dies; how deep the feet were (px under the surface) when it happened
    load({ map: field({ put: [[10, 13, '~~~~'], [10, 14, '~~~~'], [10, 15, '~~~~']] }) }, [6, 12]);
    keys('R'); let depth = null; step(3, () => { if (dead() && depth == null) { depth = feet() - (13 * T + V().LAVA.SURF); return true; } }); keys('');
    out.walkInDies = dead(); out.diesAtDepth = depth;
    // standing right at the edge of the pool is safe
    load({ map: field({ put: [[10, 13, '~~~~'], [10, 14, '~~~~'], [10, 15, '~~~~']] }) }, [9, 12]);
    p().x = 10 * T - p().w; step(2); out.edgeSafe = !dead();
    // jumping over a 3-wide pool from standing next to it (no run-up)
    load({ map: field({ put: [[10, 13, '~~~'], [10, 14, '~~~'], [10, 15, '~~~']] }) }, [9, 12]);
    keys('RJ'); step(0.4); keys('R'); step(1); keys(''); out.jump3 = !dead() && p().x > 13 * T;
    // a lava tile in the air (a lava fall basin above) is deadly as a whole tile
    load({ map: field({ put: [[10, 9, '~'], [10, 10, '~']] }) }, [10, 12]);
    p().y = 9.5 * T; p().x = 10 * T + 5; step(0.1); out.deepTile = dead();
    return out;
  }

  // ---------- hot stone ----------
  function hot() {
    const out = {};
    load({ map: field({ put: [[8, 13, 'HHHHHHHHHHHHHHHHHHHH']] }) }, [10, 12]);
    keys(''); let t = step(3, () => dead()); out.burnAfter = r2(t); out.burns = dead();
    // after standing 0.7 s and stepping off, how long until the heat is gone
    load({ map: field({ put: [[8, 13, 'HHHH']] }) }, [9, 12]);
    step(0.7); const h07 = V().heat(); keys('L'); step(0.25); keys(''); const t0 = now(); until(() => V().heat() <= 0, 3); out.coolTime = r2(now() - t0); out.heatAfter07 = r2(h07);
    // run across a long strip from standstill on its first tile: how many tiles before it burns
    load({ map: field({ w: 60, put: [[3, 13, 'H'.repeat(50)]] }) }, [3, 12]);
    const x0 = p().x; keys('R'); step(4, () => dead()); keys(''); out.runTiles = r2((p().x - x0) / T);
    // hopping (jump as soon as he lands) along the strip: never burns
    load({ map: field({ w: 60, put: [[3, 13, 'H'.repeat(50)]] }) }, [3, 12]);
    let hops = 0; keys('R'); step(10, () => { if (p().grounded && !G().__h) { keys('RJ'); G().__h = 1; hops++; } else if (!p().grounded) { keys('R'); G().__h = 0; } return dead() || p().x > 50 * T; }); keys('');
    out.hopSafe = !dead(); out.hopTiles = r2((p().x - 3 * T) / T); out.hops = hops;
    // a jump from hot stone is a normal jump
    load({ map: field({ put: [[8, 13, 'HHHH']] }) }, [9, 12]);
    let peak = feet(); const y0 = feet(); keys('J'); step(0.6, () => { peak = Math.min(peak, feet()); }); keys('');
    out.hotJump = r2((y0 - peak) / T);
    return out;
  }

  // ---------- basalt columns ----------
  function basalt() {
    const out = {}, put = [[10, 13, '~~~~~'], [10, 14, '~~~~~'], [10, 15, '~~~~~']];
    for (let y = 8; y < 16; y++) put.push([12, y, 'I']);
    let v = load({ map: field({ put }) }, [12, 7]);
    keys(''); const breaks = []; let lastTop = 8;
    step(8, () => { const top = topOf(v, 12, 8); if (top !== lastTop) { breaks.push(r2(now())); lastTop = top; } return dead(); });
    out.breakTimes = breaks.slice(0, 3); out.segment = breaks.length > 1 ? r2(breaks[1] - breaks[0]) : null; out.endsInLava = dead();
    // stand 2 segments down, jump off, wait: when does the column stand again
    v = load({ map: field({ put }) }, [12, 7]);
    until(() => topOf(v, 12, 8) >= 10, 3); const t0 = now(); keys('LJ'); step(0.5); keys('L'); step(0.6); keys('');
    until(() => topOf(v, 12, 8) === 8, 6); out.regrow = r2(now() - t0);
    // hopping on the top segment (land, jump again) keeps it, the shake fades
    v = load({ map: field({ put }) }, [12, 7]);
    let hopsOk = true; for (let i = 0; i < 5; i++) { keys('J'); step(0.1); keys(''); until(() => p().grounded, 1.5); step(0.02); if (topOf(v, 12, 8) !== 8) hopsOk = false; }
    out.hopKeepsTop = hopsOk;
    return out;
  }
  function topOf(v, tx, from) { const w = G().L.w; for (let y = from; y < G().L.h; y++) if (!v.broken[y * w + tx] && window.__mimo.worldApi.tileAt(tx, y) === window.__mimo.worldApi.tileId(5, 'I')) return y; return 99; }

  // ---------- geysers ----------
  function geyser() {
    const out = {}, def = { map: field({ put: [[10, 12, 'G']] }) };
    const v = load(def, [10, 12]), g = v.geysers[0];
    const log = []; let last = null, peak = feet(), carried = 0;
    step(g.every * 1.5, () => { if (g.phase !== last) { log.push([g.phase, r2(now())]); last = g.phase; } peak = Math.min(peak, feet()); if (p().carried === g.body) carried++; });
    out.phases = log; out.lift = r2((13 * T - peak) / T); out.carriedS = r2(carried * STEP());
    const C = V().GEY; out.beat = { every: g.every, quiet: r2(g.every - C.WARN - C.RISE - g.hold - C.FALL), warn: C.WARN, rise: C.RISE, hold: g.hold, fall: C.FALL };
    // from its top: how high does a jump get (feet above the top)
    load(def, [10, 12]); const g2 = G().L.volcano.geysers[0];
    until(() => g2.phase === 'hold', 6); step(0.1); const top = feet(); let pk = top; keys('J'); step(0.7, () => { pk = Math.min(pk, feet()); }); keys('');
    out.jumpFromTop = r2((top - pk) / T); out.totalReach = r2((13 * T - pk) / T);
    // walking into the column from the side while it holds: lifted onto it
    load(def, [6, 12]); const g3 = G().L.volcano.geysers[0];
    until(() => g3.phase === 'hold', 6); keys('R'); until(() => p().carried === g3.body, 1.5); keys(''); out.sidePickup = p().carried === g3.body;
    // ledges reachable from the top: a ledge k tiles above the column top, right held
    out.ledge = {};
    for (const k of [2, 3, 4]) {
      const ly = 13 - 5 - k, put = [[10, 12, 'G'], [13, ly, '######']];
      load({ map: field({ put, w: 24 }) }, [10, 12]); const g4 = G().L.volcano.geysers[0];
      until(() => g4.phase === 'hold', 6); step(0.05); keys('RJ'); step(0.35); keys('R'); until(() => p().grounded && p().carried !== g4.body, 1.2); keys(''); step(0.05);
      out.ledge[k] = feet() === ly * T && p().x > 13 * T;
    }
    // a ceiling cuts the column short (Mimo is never squeezed)
    load({ map: field({ put: [[10, 12, 'G'], [8, 9, '#####']] }) }, [10, 12]); const g5 = G().L.volcano.geysers[0];
    out.ceilingMax = r2(g5.max / T);
    return out;
  }

  // ---------- lava plates ----------
  function plates() {
    const out = {}, put = [[8, 13, '~'.repeat(14)], [8, 14, '~'.repeat(14)], [8, 15, '~'.repeat(14)], [12, 13, '==']];
    // the beat of one plate
    let v = load({ map: field({ put }) }); const pl = v.plates[0];
    const log = []; let last = null;
    step(V().platePeriod() * 1.05, () => { if (pl.state !== last) { log.push([pl.state, r2(now())]); last = pl.state; } });
    out.beat = log; out.period = r2(V().platePeriod());
    const P = V().PLATE; out.safe = r2(P.COOL + P.WARM); out.warn = P.WARM; out.danger = r2(P.RISE + P.HOT);
    // standing on a cool plate: carried until it sinks, then the lava gets him
    v = load({ map: field({ put }) });
    const b = v.plates[0].body; p().x = b.x + b.w / 2 - p().w / 2; p().y = b.y - p().h - 2;
    let rode = 0; step(6, () => { if (p().carried === b) rode++; return dead(); });
    out.rideS = r2(rode * STEP()); out.sinkKills = dead(); out.diedAt = r2(now());
    // landing on a hot plate burns
    v = load({ map: field({ put }), plates: [{ x: 12, y: 13, offset: P.COOL + P.WARM + P.SINK + P.UNDER + P.RISE + 0.1 }] });
    const b2 = v.plates[0].body; p().x = b2.x + b2.w / 2 - p().w / 2; p().y = b2.y - p().h - 30; p().vy = 0;
    step(0.5, () => dead()); out.hotBurns = dead();
    // a still plate never sinks
    v = load({ map: field({ put }), plates: [{ x: 12, y: 13, still: true }] });
    const b3 = v.plates[0].body; p().x = b3.x + b3.w / 2 - p().w / 2; p().y = b3.y - p().h - 2;
    step(12, () => dead()); out.stillHolds = !dead() && p().carried === b3;
    // plate size and height above the lava
    out.plateTopAboveGround = 13 * T - b3.y; out.width = b3.w;
    // a drifting plate
    v = load({ map: field({ put }), plates: [{ x: 12, y: 13, still: true, dist: 3, speed: 1.5 }] });
    let mn = 1e9, mx = -1e9; step(6, () => { mn = Math.min(mn, v.plates[0].body.x); mx = Math.max(mx, v.plates[0].body.x); }); out.drift = r2((mx - mn) / T);
    return out;
  }

  // ---------- fire hoppers ----------
  function hopper() {
    const out = {}, put = [[8, 13, '~'.repeat(10)], [8, 14, '~'.repeat(10)], [8, 15, '~'.repeat(10)], [12, 13, 'F']];
    let v = load({ map: field({ put }) }); const h = v.hoppers[0];
    let peak = 1e9, flyT = 0, first = null; step(h.rest + h.dur + 0.2, () => { if (h.fly) { flyT += STEP(); peak = Math.min(peak, h.y); if (first == null) first = r2(now()); } });
    out.peak = r2((h.home - peak) / T); out.flight = r2(flyT); out.rest = h.rest; out.cycle = r2(h.rest + h.dur); out.firstJump = first; out.warn = V().HOP.WARN;
    // standing right above its home: hurt while it flies, not while it rests
    v = load({ map: field({ put: [...put, [11, 9, '###'], [11, 10, ' ']] }) });
    const h2 = v.hoppers[0]; let hurtRest = false;
    step(h2.rest - 0.1, () => { p().x = h2.x - p().w / 2; p().y = h2.home - 3.2 * T; p().vy = 0; if (dead()) hurtRest = true; });
    out.safeWhileResting = !hurtRest;
    let hurtFly = false; step(1, () => { p().x = h2.x - p().w / 2; p().y = h2.home - 3.2 * T; p().vy = 0; if (dead()) { hurtFly = true; return true; } });
    out.hurtsWhileFlying = hurtFly;
    // an arc: dx 4, height 3
    v = load({ map: field({ put }), hoppers: [{ x: 12, y: 13, dx: 4, height: 3 }] }); const h3 = v.hoppers[0];
    let mnx = 1e9, mxx = -1e9; step((h3.rest + h3.dur) * 2.2, () => { mnx = Math.min(mnx, h3.x); mxx = Math.max(mxx, h3.x); });
    out.arcWidth = r2((mxx - mnx) / T); out.arcFlight = r2(h3.dur);
    out.reach = r2(V().HOP.R * V().HOP.HIT);
    return out;
  }

  // ---------- steam vents ----------
  function steam() {
    const out = {};
    let v = load({ map: field({ put: [[10, 12, 'S']] }), steam: [{ x: 10, y: 12, height: 5 }] }, [10, 12]);
    const s = v.steam[0]; const log = []; let last = null, top = feet(), rise = null, t0 = null;
    step(s.on + s.off + 0.5, () => {
      if (s.active !== last) { log.push([s.active ? 'on' : 'off', r2(now())]); last = s.active; }
      top = Math.min(top, feet());
      if (s.active && t0 == null && feet() < 13 * T - 2) t0 = now();
      if (t0 != null && rise == null && feet() < 13 * T - 2 * T) rise = r2(2 / (now() - t0));
    });
    out.beat = log; out.hover = r2((13 * T - top) / T); out.columnTop = r2((13 * T - s.top) / T); out.liftSpeed = rise;
    // a ledge right next to the column top: float up, drift over, land
    out.ledge = {};
    // the ledge right beside the vent tile (gap 0) or one tile away (gap 1)
    for (const gap of [0, 1]) for (const k of [4, 5, 6]) {
      const ly = 13 - k, lx = 11 + gap;
      v = load({ map: field({ put: [[10, 12, 'S'], [lx, ly, '####']] }), steam: [{ x: 10, y: 12, height: 5, off: 0 }] }, [10, 12]);
      step(1.0); keys('R'); until(() => p().grounded && p().x > lx * T, 1.5); keys(''); step(0.05);
      out.ledge[gap + '/' + k] = feet() === ly * T && p().x > lx * T;
    }
    // steam off: walking over the vent is plain ground
    v = load({ map: field({ put: [[10, 12, 'S']] }), steam: [{ x: 10, y: 12, offset: -1.85 }] }, [8, 12]);
    keys('R'); step(0.6); keys(''); out.offIsGround = p().grounded && !dead();
    return out;
  }

  // ---------- glow rain ----------
  function rain() {
    const out = {};
    let v = load({ map: field({ put: [[10, 3, 'Q']] }) }, [4, 12]); const r = v.rain[0];
    out.fallT = r2(r.fallT); out.every = r.every; out.warn = V().RAIN.WARN; out.drop = r2((r.impact - r.y0) / T);
    out.warnLead = r2(V().RAIN.WARN + r.fallT);
    // standing under it: hit by the first rock
    v = load({ map: field({ put: [[10, 3, 'Q']] }) }, [10, 12]); let t = step(4, () => dead()); out.hitsAt = r2(t); out.hits = dead();
    // standing one tile beside: safe
    v = load({ map: field({ put: [[10, 3, 'Q']] }) }, [11, 12]); p().x = 11 * T + 2; step(5, () => dead()); out.besideSafe = !dead();
    return out;
  }

  // ---------- lava falls ----------
  function fall() {
    const out = {};
    let v = load({ map: field({ put: [[8, 4, '#####'], [10, 5, '|']] }) }, [4, 12]); const f = v.falls[0];
    const log = []; let last = null; step(f.on + f.off + 0.5, () => { const on = f.head - f.tail > 1; if (on !== last) { log.push([on ? 'on' : 'off', r2(now())]); last = on; } });
    out.beat = log; out.len = r2((f.bottom - f.top) / T); out.reachGround = r2((f.bottom - f.top) / V().FALL.SPEED);
    // the time per beat in which the stream leaves Mimo's height at the ground free (feet on the ground, head 26 px up)
    let clear = 0; const g = 13 * T; for (let t = 0; t < f.on + f.off; t += STEP()) { const s = V().fallAt(f, t); if (!(s[1] - s[0] > 1 && s[0] < g && s[1] > g - 26)) clear += STEP(); }
    out.clearAtGround = r2(clear);
    // under the stream: hurt; waiting beside it, then running through in the gap: safe
    v = load({ map: field({ put: [[8, 4, '#####'], [10, 5, '|']] }) }, [10, 12]); step(1, () => dead()); out.hurts = dead();
    v = load({ map: field({ put: [[8, 4, '#####'], [10, 5, '|']] }) }, [8, 12]);
    const f2 = v.falls[0]; until(() => f2.head - f2.tail > 1 && f2.tail > f2.top + 5, 6); until(() => f2.tail >= 12 * T, 2);
    keys('R'); step(0.8); keys(''); out.gapPass = !dead() && p().x > 11 * T;
    return out;
  }

  // ---------- rising lava ----------
  function rise() {
    const out = {};
    load({ map: field({ h: 30, put: [[8, 6, '#####']] }), rise: { row: 29, speed: 1.5, delay: 1 } }, [10, 5]);
    const y0 = V().riseY(); step(0.9); out.waits = V().riseY() === y0; step(1.1); const y1 = V().riseY(); step(1); out.speed = r2((y1 - V().riseY()) / T);
    until(() => dead(), 20); out.kills = dead(); out.killDepth = r2(V().LAVA.GRACE);
    // after a fall at a flag: the lava waits GAP tiles under it
    load({ map: field({ h: 30, put: [[10, 20, '#####'], [12, 19, 'f']] }), rise: { row: 29, speed: 3, delay: 0 } }, [12, 19]);
    step(0.2); G().p.y = 19 * T; until(() => dead(), 8); step(1.2);
    out.respawnGap = r2((V().riseY() - (20 * T)) / T);
    return out;
  }

  // ---------- lines at places ----------
  function says() {
    load({ map: field({}), says: [{ x: 15, y: 12, r: 2, text: 'Heiß hier.' }] }, [4, 12]);
    const said = () => (G().bubbles || []).filter((x) => x.text === 'Heiß hier.').length;
    G().bubbles = []; keys('R'); const before = said(); until(() => p().x > 13.2 * T, 3); step(0.05); const near = said();
    keys('L'); until(() => p().x < 8 * T, 3); G().bubbles = []; keys('R'); until(() => p().x > 15 * T, 3); keys(''); const again = said();
    return { saysFar: before, saysNear: near, saysAgain: again };
  }

  // ---------- looks: does each picture hook draw without trouble (light and dark are switched by the test) ----------
  function bodies() {
    const v = load({ map: field({ put: [[10, 12, 'G'], [16, 13, '~~~~'], [16, 14, '~~~~'], [16, 15, '~~~~'], [17, 13, '==']] }) });
    return { geyserBody: G().L.bodies.includes(v.geysers[0].body), plateBody: G().L.bodies.includes(v.plates[0].body) };
  }

  // a level with the horizontal chase of the game: in this world a wall of lava (looks only)
  function chaseLook() { load({ map: field({ w: 60 }), chase: { speed: 120 } }, [10, 12]); G().L.chase.x = 6 * T; step(0.3); return { chase: !!G().L.chase }; }

  window.__lab = { chaseLook, field, load, place, keys, step, until, landJump, lava, hot, basalt, geyser, plates, hopper, steam, rain, fall, rise, says, bodies, p, feet };
})();
