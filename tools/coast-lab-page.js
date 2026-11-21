// Page side of tools/coast-test.mjs: a little laboratory for world 4 that runs inside the game page.
// It builds test basins, loads them into the first slot of world 4, steps the game frame by frame (deterministic) and
// measures. Everything here is plain browser JS (no imports); the test loads it with page.addInitScript.
(function () {
  'use strict';
  const T = 32;
  const M = () => window.__mimo, G = () => window.__mimo.G, C = () => window.MimoCoast;

  // ---------- maps ----------
  // a basin: walls left and right, floor rows at the bottom, water from row `water`; put: [[x, y, 'chars'], ...]
  function tank(o) {
    const w = o.w || 40, h = o.h || 20, floor = o.floor != null ? o.floor : h - 2, rows = [];
    for (let y = 0; y < h; y++) {
      const r = new Array(w).fill(' ');
      r[0] = '#'; r[w - 1] = '#';
      if (y >= floor) r.fill('#');
      rows.push(r);
    }
    for (const [x, y, s] of o.put || []) for (let i = 0; i < s.length; i++) if (rows[y] && x + i < w) rows[y][x + i] = s[i];
    if (!rows.some((r) => r.includes('P'))) rows[floor - 1][2] = 'P';
    // the rows, carrying the water line along so { map: tank({ water: 6 }) } is a whole basin
    const map = rows.map((r) => r.join(''));
    map.water = o.water;
    return map;
  }

  function load(def, at) {
    const m = M();
    m.progress.invincible = false; m.progress.zen = false;
    m.LEVELS[29] = Object.assign({ world: 4, name: 'Labor', hint: '', water: def.map.water == null ? undefined : def.map.water }, def);
    keys('');
    m.sim.hold(true); m.load(29); G().bubbles = [];
    if (at) place(at[0], at[1]);
    return G().L.coast;
  }
  // feet on the bottom of tile row ty (or at pixel y with px)
  function place(tx, ty) { const p = G().p; p.x = tx * T + (T - p.w) / 2; p.y = (ty + 1) * T - p.h; p.vx = 0; p.vy = 0; G().respawn = { x: p.x, y: p.y }; }
  function keys(s) { const m = M(); m.setKey('left', s.includes('L')); m.setKey('right', s.includes('R')); m.setKey('down', s.includes('D')); m.setKey('jump', s.includes('J')); }
  const STEP = () => M().sim.STEP;
  // step for some seconds; each(i) may return true to stop early
  function step(secs, each) { const n = Math.round(secs / STEP()); for (let i = 0; i < n; i++) { M().sim.step(1); if (each && each(i) === true) return (i + 1) * STEP(); } return n * STEP(); }
  function until(cond, max) { return step(max || 8, () => cond()); }
  const p = () => G().p, feet = () => p().y + p().h, surf = () => C().surface();
  const r2 = (n) => Math.round(n * 100) / 100;
  // float at the surface: hold jump until he rests there
  function floatUp() { keys('J'); until(() => Math.abs(p().y - (surf() - C().SWIM.FLOAT)) < 1.5 && Math.abs(p().vy) < 20, 6); step(0.3); }

  // ---------- swimming ----------
  function swimBasics() {
    const out = {};
    load({ map: tank({ water: 4, h: 22 }) }, [10, 19]);
    // sinking: from mid water, no keys
    p().y = 8 * T; keys(''); step(1.2); const y0 = p().y; step(0.5); out.sink = r2((p().y - y0) / 0.5 / T);
    // holding: steady rise
    place(10, 19); step(0.2); keys('J'); step(0.4); const y1 = p().y; step(0.5); out.rise = r2((y1 - p().y) / 0.5 / T);
    // a tap: one frame of jump, then let go; how high does he get above where he was
    place(10, 12); p().y += 0; keys(''); step(0.8); let start = p().y, top = start;
    keys('J'); step(STEP()); keys(''); step(1.2, () => { top = Math.min(top, p().y); });
    out.tap = r2((start - top) / T);
    // a short press of a tenth of a second
    place(10, 12); keys(''); step(0.8); start = p().y; top = start; keys('J'); step(0.1); keys(''); step(1.2, () => { top = Math.min(top, p().y); });
    out.tap01 = r2((start - top) / T);
    // tapping again and again (4 taps per second): how fast does he climb
    place(10, 19); step(0.3); start = p().y;
    for (let i = 0; i < 8; i++) { keys('J'); step(0.08); keys(''); step(0.17); }
    out.tapClimb = r2((start - p().y) / 2 / T);
    // the tap rhythm that holds the depth: the drift after six taps for several gaps, the gap with the least drift wins
    let best = null;
    for (const gap of [1.0, 1.1, 1.2, 1.3, 1.35, 1.4, 1.5, 1.6]) {
      place(10, 19); p().y = 10 * T; keys(''); step(0.5); const y0 = p().y;
      for (let i = 0; i < 6; i++) { keys('J'); step(STEP()); keys(''); step(gap - STEP()); }
      const drift = Math.abs(p().y - y0); if (!best || drift < best.drift) best = { gap, drift };
    }
    out.holdGap = best.gap; out.holdDrift = r2(best.drift / T);
    // sideways in the water and on the sea floor
    place(4, 12); p().y = 10 * T; keys('R'); step(0.6); let x0 = p().x; step(0.5); out.swimX = r2((p().x - x0) / 0.5 / T);
    place(4, 19); keys('R'); step(0.6); x0 = p().x; step(0.5); out.floorX = r2((p().x - x0) / 0.5 / T);
    keys('');
    return out;
  }

  // jump press at the surface: how high the feet get above the water line, and how far sideways while above it
  function leap() {
    const out = {};
    load({ map: tank({ water: 8, h: 20 }) }, [6, 17]);
    floatUp(); keys(''); step(0.03);
    const s = surf(); let peak = feet();
    keys('J'); step(0.1); keys(''); step(1.2, () => { peak = Math.min(peak, feet()); });
    out.leapFeet = r2((s - peak) / T);
    out.floatFeet = r2((feet() - s) / T);
    // with right held from standstill and from full swimming speed: horizontal way while the feet are above the line
    for (const [name, run] of [['leapGapStill', false], ['leapGapRun', true]]) {
      load({ map: tank({ water: 8, h: 20, w: 60 }) }, [4, 17]);
      floatUp();
      if (run) { keys('JR'); step(0.8); keys('R'); step(0.03); } else { keys(''); step(0.03); }
      let xOut = null, xIn = null;
      keys('JR');
      step(1.5, (i) => { if (i === 12) keys('R'); if (xOut == null && feet() < surf()) xOut = p().x; if (xOut != null && feet() > surf()) { xIn = p().x; return true; } });
      out[name] = r2((xIn - xOut) / T);
    }
    keys('');
    return out;
  }
  // ledges next to the water: the ledge top `k` tiles above the water line; can a leap with right held get on top
  function ledge(k, jumpAt) {
    const water = 10, top = water - k, w = 30, put = [[16, top, '#'.repeat(13)]];
    for (let y = top + 1; y < 18; y++) put.push([16, y, '#'.repeat(13)]);
    load({ map: tank({ water, w, h: 20, put }) }, [12, 17]);
    floatUp();
    // swim right against the wall, then leap with right held
    keys('JR'); step(0.8); keys('R'); step(0.05);
    keys('JR'); step(0.12); keys('R');
    step(1.5);
    keys('');
    return p().y + p().h === top * T && p().x > 16 * T;
  }
  // diving in from a ledge above the water: how deep the feet go
  function dive(h) {
    const water = 8, put = [[2, water - h, '######']];
    for (let y = water - h + 1; y < water; y++) put.push([2, y, '######']);
    load({ map: tank({ water, h: 24, w: 30, put }) }, [5, water - h - 1]);
    keys('R'); until(() => p().x > 8 * T, 3); keys('');
    let deep = 0, inWater = false;
    step(3, () => { if (p().swim) inWater = true; deep = Math.max(deep, feet() - surf()); if (inWater && p().vy <= C().SWIM.FALL + 0.5) return true; });
    return r2(deep / T);
  }

  // ---------- bubbles ----------
  function bubbles() {
    const out = {};
    const L = load({ map: tank({ water: 4, h: 20, put: [[10, 17, 'o']] }) }, [3, 17]);
    // rise speed and beat
    step(0.5); const b = L.live[0]; const y0 = b.y; step(1); out.bubRise = r2((y0 - b.y) / T);
    const born = []; load({ map: tank({ water: 4, h: 20, put: [[10, 17, 'o']] }) }, [3, 17]);
    step(10, () => { const c = G().L.coast; for (const x of c.live) if (!born.includes(x.born)) born.push(x.born); });
    out.bubEvery = r2(born[2] - born[1]);
    // ride: Mimo sinks onto a fresh bubble from above and is carried
    load({ map: tank({ water: 4, h: 20, put: [[10, 17, 'o']] }) });
    step(0.05); const c = G().L.coast, bb = c.live[c.live.length - 1];
    p().x = bb.x + bb.r - p().w / 2; p().y = bb.y - p().h - 30; p().vy = 0;
    let rode = 0; step(9, () => { if (p().carried === bb) rode++; if (bb.off) return true; });
    out.bubRide = r2(rode * STEP());
    out.bubPopAt = r2((bb.y - surf()) / T);
    return out;
  }
  // a jump from a bubble deep under water: feet peak above the bubble top (land jump: 3.7 tiles)
  function bubbleJump() {
    load({ map: tank({ water: 2, h: 24, put: [[10, 21, 'o']] }) });
    step(0.05); const c = G().L.coast, bb = c.live[c.live.length - 1];
    p().x = bb.x + bb.r - p().w / 2; p().y = bb.y - p().h - 10; p().vy = 0;
    until(() => p().carried === bb, 2); step(0.6);
    const top = bb.y; let peak = feet();
    // measured relative to the bubble top at the jump, until a bubble carries him again (the express bubble catches up)
    keys('J'); step(0.05); until(() => !p().impulse, 1); keys(''); step(1.4, () => { peak = Math.min(peak, feet()); if (p().carried) return true; });
    const held = r2((top - peak) / T);
    // the same with a short tap (the jump can be cut like on land)
    load({ map: tank({ water: 2, h: 24, put: [[10, 21, 'o']] }) });
    step(0.05); const c2 = G().L.coast, b2 = c2.live[c2.live.length - 1];
    p().x = b2.x + b2.r - p().w / 2; p().y = b2.y - p().h - 10; p().vy = 0;
    until(() => p().carried === b2, 2); step(0.6);
    const top2 = b2.y; let peak2 = feet();
    keys('J'); step(0.08); keys(''); step(1.6, () => { peak2 = Math.min(peak2, feet()); if (p().carried) return true; });
    return { bubJump: held, bubJumpTap: r2((top2 - peak2) / T) };
  }

  // ---------- jellyfish ----------
  function jelly(wet) {
    const put = [[10, 16, 'u']];
    load({ map: tank({ water: wet ? 3 : 19, h: 20, put }) });
    p().x = 10 * T + 5; p().y = 12 * T; p().vy = 0;
    let peak = 99999, bounced = false;
    step(4, () => { if (p().vy < -500) bounced = true; if (bounced) { peak = Math.min(peak, feet()); if (p().vy > 0) return true; } });
    return r2((16 * T + 6 - peak) / T);
  }

  // ---------- current and swirl ----------
  function current() {
    const out = {}, put = [];
    for (let y = 8; y < 18; y++) put.push([1, y, '>'.repeat(38)]);
    load({ map: tank({ water: 6, h: 20, put }) });
    const speed = (k, floor) => { place(6, floor ? 17 : 11); if (!floor) p().y = 11 * T; keys(k); step(0.7); const x0 = p().x; step(0.5); keys(''); return r2((p().x - x0) / 0.5 / T); };
    out.curIdle = speed('', false); out.curWith = speed('R', false); out.curAgainst = speed('L', false);
    out.curFloorIdle = speed('', true); out.curFloorAgainst = speed('L', true);
    return out;
  }
  function swirl() {
    const put = []; for (let y = 6; y < 18; y++) put.push([10, y, 'A']);
    load({ map: tank({ water: 4, h: 20, put }) }, [10, 17]);
    step(0.6); const y0 = p().y; step(0.5); return r2((y0 - p().y) / 0.5 / T);
  }

  // ---------- pufferfish ----------
  function puffer() {
    const L = load({ map: tank({ water: 2, h: 16, put: [[10, 10, 'F']] }), puffers: [{ x: 10, y: 10, dist: 0 }] });
    const f = L.fish[0], dt = STEP(), cyc = C().PUFF.CYCLE;
    let danger = 0, firstDanger = null, lastDanger = null;
    for (let t = 0; t < cyc; t += dt) { const s = C().puffAt(f, t); if (s.size >= 0.5) { danger += dt; if (firstDanger == null) firstDanger = t; lastDanger = t; } }
    const out = { puffCycle: cyc, puffDanger: r2(danger), puffSafe: r2(cyc - danger), puffWarn: C().PUFF.TREMBLE };
    // Mimo inside the small fish all through the safe time: nothing happens
    p().x = f.hx - p().w / 2; p().y = f.hy - p().h / 2;
    let hurtSmall = false; step(firstDanger - 0.05, () => { p().x = f.hx - p().w / 2; p().y = f.hy - p().h / 2; p().vy = 0; if (G().state !== 'play') hurtSmall = true; });
    let hurtBig = false; step(0.4, () => { p().x = f.hx - p().w / 2; p().y = f.hy - p().h / 2; p().vy = 0; if (G().state === 'dead') { hurtBig = true; return true; } });
    // how close may Mimo's side come to a big fish (gap between Mimo's box and the fish centre)
    const reach = r2((C().PUFF.SMALL_R + (C().PUFF.BIG_R - C().PUFF.SMALL_R)) * 0.82 + 3);
    // a patrolling fish: how far it swims in one cycle
    const L2 = load({ map: tank({ water: 2, h: 16, put: [[6, 10, 'F']] }) }); const f2 = L2.fish[0];
    let minX = 1e9, maxX = -1e9; step(cyc * 3, () => { minX = Math.min(minX, f2.cx); maxX = Math.max(maxX, f2.cx); });
    return Object.assign(out, { hurtSmall, hurtBig, puffReachPx: reach, puffPatrol: r2((maxX - minX) / T), firstDanger: r2(firstDanger), lastDanger: r2(lastDanger) });
  }

  // ---------- crabs ----------
  function crab() {
    const out = {};
    let L = load({ map: tank({ water: 30, h: 14, w: 26, put: [[8, 11, 'K'], [14, 11, '^^^^^^']] }) }, [3, 11]);
    const b = L.crabs[0]; step(0.3); const x0 = b.x; step(1); out.crabSpeed = r2((b.x - x0) / T);
    // Mimo on the shell, carried across the urchins without harm, the crab turns at the wall
    L = load({ map: tank({ water: 30, h: 14, w: 26, put: [[8, 11, 'K'], [14, 11, '^^^^^^']] }) });
    const k = L.crabs[0]; p().x = k.x + 6; p().y = k.y - p().h - 4; p().vy = 0;
    let carried = 0, overUrchins = false, dead = false, turned = false, dir0 = k.dir;
    step(14, () => { if (p().carried === k) carried++; if (p().x > 14 * T && p().x < 19 * T && p().carried === k) overUrchins = true; if (G().state === 'dead') dead = true; if (k.dir !== dir0) turned = true; });
    out.crabCarries = carried * STEP() > 10; out.crabOverUrchins = overUrchins && !dead; out.crabTurnsAtWall = turned;
    // walking into a crab from the side never hurts
    L = load({ map: tank({ water: 30, h: 14, w: 40, put: [[20, 11, 'K']] }), crabs: [{ x: 20, y: 11, dir: -1 }] }, [10, 11]);
    keys('R'); let hurt = false; step(3, () => { if (G().state !== 'play') hurt = true; }); keys('');
    out.crabHarmless = !hurt;
    return out;
  }

  // ---------- tide ----------
  function tide() {
    load({ map: tank({ water: 10, h: 20 }), tide: { low: 12, high: 8, period: 12 } }, [5, 17]);
    const log = []; let last = null;
    step(24, () => { const td = C().tide(); if (!last || td.state !== last.state || td.warn !== last.warn) log.push({ t: r2(M().G.time), state: td.state, warn: td.warn, y: r2(td.y / T) }); last = td; });
    return log;
  }


  // ---------- reference: the land jump in the same basin (no water) ----------
  function landJump() {
    load({ map: tank({ water: null, h: 16, w: 40 }) }, [4, 13]);
    let peak = feet(); const y0 = feet(); keys('J'); step(0.6, () => { peak = Math.min(peak, feet()); }); keys(''); step(0.5);
    load({ map: tank({ water: null, h: 16, w: 40 }) }, [4, 13]);
    keys('R'); step(0.6); const x0 = p().x; keys('RJ'); step(0.05); let xl = null; step(1.5, () => { if (p().grounded) { xl = p().x; return true; } }); keys('');
    return { landJump: r2((y0 - peak) / T), landJumpRun: r2((xl - x0) / T) };
  }
  // leap from floating `d` tiles (Mimo's centre to the wall) onto a ledge `k` tiles above the water line, right held
  function ledgeGap(k, d) {
    const water = 10, top = water - k, put = [];
    for (let y = top; y < 18; y++) put.push([20, y, '#'.repeat(9)]);
    load({ map: tank({ water, w: 30, h: 20, put }) }, [10, 17]);
    p().x = (20 - d) * T - p().w / 2; p().y = (water + 2) * T;
    floatUp(); p().x = (20 - d) * T - p().w / 2; p().vx = 0; keys(''); step(0.02);
    keys('JR'); step(0.12); keys('R'); step(1.6); keys('');
    return p().y + p().h === top * T && p().x > 20 * T;
  }

  // ---------- old elements under water ----------
  function oldElements() {
    const out = {};
    // board: Mimo sinks onto it and stands, down drops through
    load({ map: tank({ water: 3, h: 16, put: [[8, 10, '---']] }) }, [9, 8]);
    keys(''); step(2.5); out.boardStands = p().grounded && feet() === 10 * T;
    keys('D'); step(0.6); keys(''); out.boardDrop = feet() > 10 * T + 8;
    // switch and toggle blocks
    load({ map: tank({ water: 3, h: 16, put: [[8, 13, 's'], [12, 8, 'a'], [12, 9, 'a'], [12, 10, 'a'], [12, 11, 'a'], [12, 12, 'a'], [12, 13, 'a'], [15, 11, 'b']] }) }, [8, 9]);
    const solidBefore = window.__mimo.worldApi.isSolid(12, 13);
    keys(''); step(2.5); out.switchToggles = G().switchOn === true && solidBefore && !window.__mimo.worldApi.isSolid(12, 13) && window.__mimo.worldApi.isSolid(15, 11);
    // crumble blocks give way under water too
    let L = load({ map: tank({ water: 3, h: 16, put: [[8, 10, 'cc']] }) }, [8, 8]);
    keys(''); step(3); const cr = L ? [...G().L.crumbles.values()] : []; out.crumbleFalls = cr.some((c) => c.state >= 2) || feet() > 10 * T + 8;
    // key and lock
    load({ map: tank({ water: 3, h: 16, put: [[8, 13, 'k'], [12, 4, 'L'], [12, 5, 'L'], [12, 6, 'L'], [12, 7, 'L'], [12, 8, 'L'], [12, 9, 'L'], [12, 10, 'L'], [12, 11, 'L'], [12, 12, 'L'], [12, 13, 'L']] }) }, [5, 13]);
    keys('R'); until(() => G().keyGot, 3); keys('R'); step(1.2); keys('');
    out.keyAndLock = G().keyGot && p().x > 12 * T;
    // flag
    load({ map: tank({ water: 3, h: 16, put: [[8, 13, 'f']] }) }, [4, 13]);
    keys('R'); step(1.2); keys(''); out.flagSaves = G().L.checkpoints[0].active === true;
    // lift: carries under water
    load({ map: tank({ water: 3, h: 16 }), movers: [{ x: 8, y: 12, w: 2, axis: 'y', dist: -6, speed: 2, phase: 0 }] }, [8, 10]);
    p().x = 8 * T + 5; p().y = 12 * T - p().h - 20; keys(''); let carried = 0, minY = 1e9; step(4, () => { if (p().carried) carried++; minY = Math.min(minY, feet()); });
    out.liftCarries = carried * STEP() > 2 && minY < 8 * T;
    // timed thorns hurt under water when they are out
    load({ map: tank({ water: 3, h: 16, put: [[8, 13, 'T']] }) }, [8, 13]);
    let tDead = false; keys(''); step(3, () => { p().x = 8 * T + 5; if (G().state === 'dead') { tDead = true; return true; } });
    out.timedThornHurts = tDead;
    // snail: a stomp from above stuns it and bounces Mimo (land strength), walking into it hurts
    load({ map: tank({ water: 3, h: 16, put: [[10, 13, 'e']] }) }, [4, 13]);
    // the snail keeps walking while Mimo sinks onto it, so he starts a little ahead of it
    const sn = G().L.snails[0]; p().x = sn.x + sn.w / 2 - p().w / 2 + 18; p().y = sn.y - p().h - 40; p().vy = 0; keys('');
    let stomped = false; step(2, () => { if (sn.stun > 0) { stomped = true; return true; } });
    let rise = 0; const y0 = feet(); step(0.5, () => { rise = Math.max(rise, y0 - feet()); });
    out.snailStomp = stomped; out.snailStompRise = r2(rise / T);
    load({ map: tank({ water: 3, h: 16, put: [[12, 13, 'e']] }) }, [4, 13]);
    keys('R'); let sDead = false; step(3, () => { if (G().state === 'dead') { sDead = true; return true; } }); keys('');
    out.snailSideHurts = sDead;
    return out;
  }

  // ---------- chase: the ink cloud moves slower while Mimo swims ----------
  function chase(speed) {
    load({ map: tank({ water: 9, h: 16, w: 200, put: [[1, 9, '#'.repeat(40)]] }), chase: { speed } });
    for (let y = 9; y < 14; y++) for (let x = 1; x < 41; x++) G().L.tiles[y][x] = window.__mimo.worldApi.TILE.SOLID;
    place(30, 8); const c = G().L.chase; c.x = 0; keys('');
    step(0.2); let x0 = c.x; step(1); const dry = r2((c.x - x0) / T);
    place(60, 12); p().y = 11 * T; step(0.2); x0 = c.x; step(1); const wet = r2((c.x - x0) / T);
    return { inkDry: dry, inkWet: wet, skin: typeof window.__mimo.WORLDS[4].drawChase === 'function' };
  }

  // ---------- boss mode: water, swimming and the code hooks in an arena ----------
  function bossWater() {
    const m = M(), G0 = G(); m.progress.invincible = false;
    keys(''); m.sim.hold(true); m.startBoss(4);
    let t = 0; while (G0.state === 'cine' && t < 20) { m.setKey('jump', Math.floor(t * 30) % 2 === 0); m.sim.step(1); t += STEP(); }
    keys('');
    const out = { mode: G0.mode, surfFromDef: r2(surf() / T) };
    p().x = 6 * T; p().y = 9 * T; p().vy = 0; step(0.3); out.swimsInArena = !!p().swim;
    C().setWater(5 * T); step(0.05); out.setWater = r2(surf() / T);
    C().moveWater(9 * T, 2); step(1); out.moveHalf = r2(surf() / T); step(1.2); out.moveDone = r2(surf() / T);
    C().setTide({ low: 9, high: 6, period: 8 }); out.tideInBoss = !!C().tide();
    out.arenaHook = window.__bossArenaWater;
    return out;
  }

  // ride a bubble up next to a wall and jump off near the surface, right held: does Mimo land on a ledge k tiles above the water
  function bubbleLedge(k) {
    const water = 8, top = water - k, put = [[10, 17, 'o']];
    for (let y = top; y < 18; y++) put.push([12, y, '#'.repeat(8)]);
    load({ map: tank({ water, w: 24, h: 20, put }) });
    step(0.05); const c = G().L.coast, bb = c.live[c.live.length - 1];
    p().x = bb.x + bb.r - p().w / 2; p().y = bb.y - p().h - 10; p().vy = 0;
    until(() => p().carried === bb, 2); until(() => bb.y < surf() + 12 || bb.off, 9);
    keys('JR'); step(0.3); keys('R'); step(1.2); keys('');
    return p().y + p().h === top * T && p().x > 12 * T;
  }

  // ---------- dive: down held under water ----------
  function dive2() {
    load({ map: tank({ water: 2, h: 24 }) }, [10, 21]);
    p().y = 4 * T; keys(''); step(0.5); keys('D');
    let tFull = null; const t0 = M().G.time; step(1, () => { if (tFull == null && p().vy >= C().SWIM.DIVE - 1) tFull = M().G.time - t0; });
    const y0 = p().y; step(0.5); const speed = r2((p().y - y0) / 0.5 / T);
    keys(''); const t1 = M().G.time; let tStop = null; step(0.5, () => { if (tStop == null && p().vy <= C().SWIM.FALL + 0.5) tStop = M().G.time - t1; });
    return { dive: speed, diveStart: r2(tFull), diveStop: r2(tStop), diveFloor: r2(13 / speed) };
  }
  // ---------- bubble boarding: from the side, from below, and passing it while swimming up ----------
  function bubbleBoard() {
    const out = {}, map = tank({ water: 2, h: 24, w: 30, put: [[14, 21, 'o']] });
    const fresh = () => { load({ map }); step(0.05); const c = G().L.coast; return c.live[c.live.length - 1]; };
    // from the side: Mimo hovers beside the column, swims right into a passing bubble
    let b = fresh(); p().x = b.x - p().w - 12; p().y = b.y - 120; p().vy = 0; keys('');
    until(() => b.y < p().y + p().h + 10, 3); keys('R'); out.side = until(() => p().carried === b, 1.5) < 1.5; keys('');
    // from below: Mimo sinks slowly above the vent and the bubble comes up under him
    b = fresh(); p().x = b.x + b.r - p().w / 2; p().y = b.y - 200; p().vy = 0; keys('');
    out.below = until(() => p().carried === b, 3) < 3;
    // swimming up with jump held he passes through it
    b = fresh(); p().x = b.x + b.r - p().w / 2; p().y = b.y - 70; p().vy = 0; keys('J');
    let caught = false; step(1.2, () => { if (p().carried && p().carried.bubble) caught = true; }); keys('');
    out.passHeld = !caught;
    // diving down he falls through
    b = fresh(); p().x = b.x + b.r - p().w / 2; p().y = b.y - 150; p().vy = 0; keys('D');
    caught = false; step(1.2, () => { if (p().carried && p().carried.bubble) caught = true; }); keys('');
    out.passDive = !caught;
    // standing on the sea floor on the vent: the next bubble lifts him
    b = fresh(); p().x = b.x + b.r - p().w / 2; p().y = b.y + 2 * b.r + 3 - p().h; p().vy = 0; keys('');
    step(0.2); out.standing = until(() => p().carried && p().carried.bubble, 2) < 2;
    return out;
  }
  // ---------- two crabs cross on one track: the rider stays on his crab ----------
  function crabCross() {
    const L = load({ map: tank({ water: 30, h: 14, w: 30, put: [[6, 11, 'K'], [20, 11, 'K']] }), crabs: [{ x: 6, y: 11, dir: 1 }, { x: 20, y: 11, dir: -1 }] });
    const a = L.crabs[0], b = L.crabs[1]; p().x = a.x + 6; p().y = a.y - p().h - 4; p().vy = 0; keys('');
    until(() => p().carried === a, 1);
    let crossed = false, lost = false; step(5, () => { if (Math.abs(a.x - b.x) < 6) crossed = true; if (crossed && p().carried !== a) lost = true; if (crossed && Math.abs(a.x - b.x) > 60) return true; });
    return { crossed, staysOnHisCrab: crossed && !lost && p().carried === a, crabSpeed: r2(a.speed / T) };
  }
  // ---------- lines at places, once per level load ----------
  function says() {
    load({ map: tank({ water: null, h: 14, w: 40 }), says: [{ x: 15, y: 11, r: 2, text: 'Hier war schon mal wer.' }] }, [4, 11]);
    const said = () => (G().bubbles || []).filter((x) => x.text === 'Hier war schon mal wer.').length;
    G().bubbles = []; keys('R'); const before = said(); until(() => p().x > 13.2 * T, 3); step(0.05); const near = said();
    keys('L'); until(() => p().x < 8 * T, 3); G().bubbles = []; keys('R'); until(() => p().x > 15 * T, 3); keys(''); const again = said();
    return { saysFar: before, saysNear: near, saysAgain: again };
  }
  // ---------- a flag on the sea floor, a swimmer above it ----------
  function flagReach(h) {
    load({ map: tank({ water: 2, h: 16, put: [[12, 13, 'f']] }) }, [4, 13]);
    p().y = (14 - h) * T - p().h; keys('R'); step(2.4, () => { p().vy = 0; p().y = (14 - h) * T - p().h; }); keys('');
    return G().L.checkpoints[0].active;
  }
  // ---------- the thumb stick pushed down sets input.dive, sideways or released clears it ----------
  function stickDive() {
    load({ map: tank({ water: 2, h: 16 }) }, [10, 10]);
    const st = document.getElementById('stage'), r = st.getBoundingClientRect(), x = r.left + r.width * 0.2, y = r.top + r.height * 0.5;
    const ev = (type, dx, dy) => st.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + dx, clientY: y + dy, bubbles: true }));
    const inp = M().input, out = {};
    ev('pointerdown', 0, 0); ev('pointermove', 0, 8); out.small = inp.dive;
    ev('pointermove', 2, 26); out.down = inp.dive;
    ev('pointermove', 30, 26); out.sideways = inp.dive;
    ev('pointermove', 0, 28); const y0 = p().y; step(0.5); out.sinksFast = r2((p().y - y0) / 0.5 / T);
    ev('pointerup', 0, 28); out.released = inp.dive;
    return out;
  }

  window.__lab = { tank, load, place, keys, step, until, floatUp, swimBasics, leap, ledge, dive, bubbles, bubbleJump, jelly, current, swirl, puffer, crab, tide, landJump, ledgeGap, oldElements, chase, bossWater, bubbleLedge, dive2, bubbleBoard, crabCross, says, flagReach, stickDive, p, surf, feet };
})();
