// World 5 "Vulkaninsel": the things that live in it, their rules and timing. Geysers ("G", a timed lift), lava plates
// ("=", float on lava: cool, warming, sinking, hot), fire hoppers ("F", jump out of the lava on a fixed arc), steam vents
// ("S", a timed updraft), glow rain ("Q", glowing rocks drop from a smoke puff), lava falls ("|", a timed curtain).
// Their pictures: volcano-things-draw.js. Rules and numbers: tools/levels/world5-kit.md.
// Every state is a pure function of the game clock (api.time) and the level fields, so the bots replay exactly and
// nothing is allocated per frame.
(function () {
  'use strict';
  let api = null;
  const T = 32, V = () => window.MimoVolcano;

  // ---------- numbers (measured in tools/volcano-test.mjs) ----------
  // geyser: quiet, warning puff, rise, hold at the top, sink; EVERY is the whole beat
  const GEY = Object.freeze({ EVERY: 4.4, WARN: 0.8, RISE: 0.45, HOLD: 1.1, FALL: 0.7, HEIGHT: 5, W: 34, HEAD: 26 });
  // lava plate: cool (safe) -> warm (safe, glowing cracks, trembles) -> sink -> under -> rise hot -> hot (burns)
  const PLATE = Object.freeze({ COOL: 2.6, WARM: 1.2, SINK: 0.5, UNDER: 0.9, RISE: 0.4, HOT: 1.0, DEPTH: 30, H: 14, TOP: -8, FADE: 0.35 });
  // fire hopper: rests in the lava, glows brighter WARN s before it jumps, flies a parabola HEIGHT tiles high
  const HOP = Object.freeze({ REST: 1.6, WARN: 0.6, HEIGHT: 4, GRAV: 1500, R: 11, HIT: 0.85, ARC: 14 });
  // steam vent: blows ON s, rests OFF s, hisses WARN s before it starts; lifts like the updraft of the game
  const STEAM = Object.freeze({ ON: 1.8, OFF: 1.8, WARN: 0.5, HEIGHT: 4, GRAV: -900, LIFT: 230, HALF: 20, RAMP: 0.15 });
  // glow rain: a rock every EVERY s, the spot glows WARN s before it is dropped
  const RAIN = Object.freeze({ EVERY: 2.2, WARN: 0.9, GRAV: 1300, R: 9 });
  // lava fall: pours ON s, pauses OFF s (off 0: always), drips WARN s before it starts; the stream moves SPEED px/s
  const FALL = Object.freeze({ ON: 2.0, OFF: 2.0, WARN: 0.6, SPEED: 520, W: 20 });

  const lines = { geyser: ['Huiii!', 'Fahrstuhl nach oben.', 'Nasse Füße, aber oben.'], hopper: ['Fffft.', 'Pfft!', 'Heiß wie Suppe.'] };
  const entryAt = (list, x, y) => (Array.isArray(list) ? list.find((e) => e && e.x === x && e.y === y) : null) || {};
  const mod = (a, n) => ((a % n) + n) % n;
  const smooth = (k) => k * k * (3 - 2 * k);
  const LAVA = () => api.tileId(5, '~');
  // the state functions below answer in these shared holders (read them right away): no allocation per step
  const GO = ['quiet', 0, 0], PO = ['cool', 0, 0, 0], SO = [false, 0, 0], FO = [0, 0, 0];
  const HO = { fly: false, x: 0, y: 0, warn: 0, back: false, n: 0, up: false };
  const set3 = (o, a, b, c) => { o[0] = a; o[1] = b; o[2] = c; return o; };
  const set4 = (o, a, b, c, d) => { o[0] = a; o[1] = b; o[2] = c; o[3] = d; return o; };

  // the first blocking thing below pixel y in column tx: solid ground or a lava surface (world px)
  function floorBelow(tx, y) {
    const L = api.L;
    for (let ty = Math.max(0, Math.floor(y / T)); ty < L.h; ty++) {
      if (api.isSolid(tx, ty)) return ty * T;
      if (api.tileAt(tx, ty) === LAVA()) return V().lavaTop(tx, ty);
    }
    return L.h * T + 2 * T;
  }
  // free height above a floor (px) in column tx until the first solid tile
  function roomAbove(tx, floorY) {
    for (let ty = Math.floor(floorY / T) - 1; ty >= 0; ty--) if (api.isSolid(tx, ty)) return floorY - (ty + 1) * T;
    return floorY + 4 * T;
  }

  // ---------- spawns (during map reading, before init) ----------
  const toLava = (L, x, y) => { L.tiles[y][x] = LAVA(); };
  const spawns = {
    G: { lint: { name: 'Geysire', color: '#BFE3F2' }, spawn(L, x, y) {
      const g = { tx: x, ty: y, cx: x * T + T / 2, floor: (y + 1) * T, max: GEY.HEIGHT * T, every: GEY.EVERY, offset: 0, hold: GEY.HOLD, h: 0, phase: 'quiet', k: 0, rode: false };
      g.body = { geyser: true, g, x: g.cx - GEY.W / 2, y: g.floor, w: GEY.W };
      V().state(L).geysers.push(g); L.bodies.push(g.body);
    } },
    // a run of "=" is one plate; it floats in the top row of a lava pool (its cells become lava)
    '=': { lint: { name: 'Lavaplatten', color: '#6B4B66' }, spawn(L, x, y) {
      const v = V().state(L), last = v.plates[v.plates.length - 1];
      toLava(L, x, y);
      if (last && last.ty === y && last.tx + last.n === x) { last.n++; last.body.w = last.n * T - 4; return; }
      const pl = { tx: x, ty: y, n: 1, bx: x * T + 2, top: y * T + PLATE.TOP, surf: y * T + 8, offset: 0, still: false, dist: 0, speed: 1, state: 'cool', heat: 0, shake: 0, danger: false, dy: 0 };
      pl.body = { plate: true, pl, x: pl.bx, y: pl.top, w: T - 4, off: false };
      v.plates.push(pl); L.bodies.push(pl.body);
    } },
    F: { lint: { name: 'Feuerhüpfer', color: '#FF8A55' }, spawn(L, x, y) {
      const row = L.tiles[y], lavaNext = (x > 0 && row[x - 1] === LAVA()) || (x + 1 < L.w && row[x + 1] === LAVA());
      if (lavaNext) toLava(L, x, y);
      V().state(L).hoppers.push({ tx: x, ty: y, dx: 0, height: HOP.HEIGHT, rest: HOP.REST, offset: 0, x: 0, y: 0, fly: false, warn: 0, said: -1, arc: null });
    } },
    S: { lint: { name: 'Dampfdüsen', color: '#E8E2F0' }, spawn(L, x, y) { V().state(L).steam.push({ tx: x, ty: y, cx: x * T + T / 2, floor: (y + 1) * T, height: STEAM.HEIGHT, on: STEAM.ON, off: STEAM.OFF, offset: 0, top: 0, active: false, warn: 0, k: 0 }); } },
    Q: { lint: { name: 'Glutregen', color: '#FFB36B' }, spawn(L, x, y) { V().state(L).rain.push({ tx: x, ty: y, cx: x * T + T / 2, y0: y * T + T / 2, every: RAIN.EVERY, offset: 0, impact: 0, fallT: 0, last: -1 }); } },
    '|': { lint: { name: 'Lavafälle', color: '#FF9A5C' }, spawn(L, x, y) { V().state(L).falls.push({ tx: x, ty: y, cx: x * T + T / 2, top: y * T, bottom: 0, on: FALL.ON, off: FALL.OFF, offset: 0, head: 0, tail: 0, warn: 0 }); } },
  };

  // level entries change the defaults (see world5-kit.md)
  function applyEntries(v, def) {
    for (const g of v.geysers) {
      const e = entryAt(def.geysers, g.tx, g.ty);
      g.every = e.every || GEY.EVERY; g.offset = e.offset || 0; g.hold = e.hold || GEY.HOLD;
      g.every = Math.max(g.every, GEY.WARN + GEY.RISE + g.hold + GEY.FALL + 0.2);
      g.max = Math.min((e.height || GEY.HEIGHT) * T, roomAbove(g.tx, g.floor) - GEY.HEAD);
    }
    for (const pl of v.plates) { const e = entryAt(def.plates, pl.tx, pl.ty); pl.offset = e.offset || 0; pl.still = !!e.still; pl.dist = e.dist || 0; pl.speed = e.speed || 1; }
    for (const h of v.hoppers) {
      const e = entryAt(def.hoppers, h.tx, h.ty);
      h.dx = e.dx || 0; h.height = e.height || HOP.HEIGHT; h.rest = e.rest || HOP.REST; h.offset = e.offset || 0; h.line = e.line || null;
      h.home = V().isLava(h.tx, h.ty) ? V().lavaTop(h.tx, h.ty) : (h.ty + 1) * T;
      h.dur = 2 * Math.sqrt(2 * h.height * T / HOP.GRAV);
      h.arc = makeArc(h);
    }
    for (const s of v.steam) {
      const e = entryAt(def.steam, s.tx, s.ty);
      s.height = e.height || STEAM.HEIGHT; s.on = e.on || STEAM.ON; s.off = e.off != null ? e.off : STEAM.OFF; s.offset = e.offset || 0;
      s.top = s.floor - Math.min(s.height * T, roomAbove(s.tx, s.floor));
    }
    for (const r of v.rain) {
      const e = entryAt(def.rain, r.tx, r.ty);
      r.every = e.every || RAIN.EVERY; r.offset = e.offset || 0;
      r.impact = floorBelow(r.tx, r.y0 + RAIN.R); r.fallT = Math.sqrt(2 * Math.max(4, r.impact - r.y0) / RAIN.GRAV);
      r.last = Math.floor((api.time - r.offset - r.fallT) / r.every);
    }
    for (const f of v.falls) {
      const e = entryAt(def.falls, f.tx, f.ty);
      f.on = e.on || FALL.ON; f.off = e.off != null ? e.off : FALL.OFF; f.offset = e.offset || 0;
      f.bottom = floorBelow(f.tx, f.top + 1);
    }
  }

  // ---------- geysers ----------
  function geyserAt(g, time) {
    const quiet = g.every - GEY.WARN - GEY.RISE - g.hold - GEY.FALL, t = mod(time + g.offset, g.every);
    if (t < quiet) return set3(GO, 'quiet', 0, 0);
    if (t < quiet + GEY.WARN) return set3(GO, 'warn', 0, (t - quiet) / GEY.WARN);
    const r = t - quiet - GEY.WARN;
    if (r < GEY.RISE) return set3(GO, 'rise', g.max * smooth(r / GEY.RISE), r / GEY.RISE);
    if (r < GEY.RISE + g.hold) return set3(GO, 'hold', g.max, (r - GEY.RISE) / g.hold);
    const f = (r - GEY.RISE - g.hold) / GEY.FALL;
    return set3(GO, 'fall', g.max * (1 - smooth(Math.min(1, f))), f);
  }
  function updateGeysers(v, p) {
    const play = api.state === 'play';
    for (const g of v.geysers) {
      const was = g.phase, s = geyserAt(g, api.time);
      g.phase = s[0]; g.h = s[1]; g.k = s[2];
      g.body.y = g.floor - g.h;
      if (was !== g.phase && near(g.cx, g.floor - 2 * T, 2)) {
        if (g.phase === 'warn') api.noise({ bp: 900, f1: 2400, dur: GEY.WARN, vol: 0.025 });
        if (g.phase === 'rise') { api.noise({ lp: 1800, f1: 500, dur: 0.6, vol: 0.05 }); api.burst(g.cx, g.floor - 4, 10, [api.W.geyserFoam || '#FFFFFF', api.W.geyser || '#BFE3F2'], 140, { grav: 400, vy: -160 }); }
      }
      if (!play || g.h < 4) continue;
      // the column lifts whoever is inside it onto its top (from the side or from below), not a Mimo jumping up through it
      const b = g.body, feet = p.y + p.h;
      if (p.carried !== b && p.vy > -250 && p.x + p.w - 4 > b.x && p.x + 4 < b.x + b.w && feet >= b.y - 1 && feet <= g.floor + 2) {
        p.y = b.y - p.h; if (p.vy > 0) p.vy = 0;
      }
      if (p.carried === b && !g.rode && g.phase === 'rise') { g.rode = true; api.bubble(api.pick(lines.geyser), 'player', 1.1); }
    }
  }

  // ---------- lava plates ----------
  const platePeriod = () => PLATE.COOL + PLATE.WARM + PLATE.SINK + PLATE.UNDER + PLATE.RISE + PLATE.HOT;
  // -> [state, heat 0..1, sink depth px, shake 0..1]
  function plateAt(pl, time) {
    if (pl.still) return set4(PO, 'cool', 0, 0, 0);
    let t = mod(time + pl.offset, platePeriod());
    if (t < PLATE.COOL) return set4(PO, 'cool', t < PLATE.FADE ? 1 - t / PLATE.FADE : 0, 0, 0);
    t -= PLATE.COOL;
    if (t < PLATE.WARM) return set4(PO, 'warm', 0.3 + 0.3 * (t / PLATE.WARM), 0, t / PLATE.WARM);
    t -= PLATE.WARM;
    if (t < PLATE.SINK) return set4(PO, 'sink', 0.6, PLATE.DEPTH * smooth(t / PLATE.SINK), 1);
    t -= PLATE.SINK;
    if (t < PLATE.UNDER) return set4(PO, 'under', 1, PLATE.DEPTH, 0);
    t -= PLATE.UNDER;
    if (t < PLATE.RISE) return set4(PO, 'rise', 1, PLATE.DEPTH * (1 - smooth(t / PLATE.RISE)), 0);
    return set4(PO, 'hot', 1, 0, 0);
  }
  function updatePlates(v, p) {
    for (const pl of v.plates) {
      const s = plateAt(pl, api.time);
      pl.state = s[0]; pl.heat = s[1]; pl.dy = s[2]; pl.shake = s[3];
      pl.danger = pl.state === 'rise' || pl.state === 'hot';
      let ox = 0;
      if (pl.dist && pl.speed > 0) { const span = Math.abs(pl.dist) * 2 / pl.speed, ph = mod(api.time / span, 1), tri = ph < 0.5 ? ph * 2 : 2 - ph * 2; ox = pl.dist * T * smooth(tri); }
      const b = pl.body;
      b.x = pl.bx + ox; b.y = pl.top + pl.dy; b.off = pl.state === 'under';
      if (!pl.danger || api.state !== 'play') continue;
      // a hot plate burns on touch, also when Mimo lands on it
      if (p.x + p.w - 3 > b.x && p.x + 3 < b.x + b.w && p.y + p.h >= b.y - 1 && p.y < b.y + PLATE.H) api.hurt();
    }
  }

  // ---------- fire hoppers ----------
  // the flight from home to home + dx (dir 1) or back (dir -1), as ARC + 1 points (x, y pairs), made once per level
  function makeArc(h) {
    const out = new Float32Array((HOP.ARC + 1) * 2), x0 = h.tx * T + T / 2, x1 = x0 + h.dx * T, vy0 = HOP.GRAV * h.dur / 2;
    for (let i = 0; i <= HOP.ARC; i++) { const u = i / HOP.ARC * h.dur; out[i * 2] = x0 + (x1 - x0) * (i / HOP.ARC); out[i * 2 + 1] = h.home - (vy0 * u - 0.5 * HOP.GRAV * u * u); }
    return out;
  }
  function hopperAt(h, time) {
    const cyc = h.rest + h.dur, tt = time + h.offset, n = Math.floor(tt / cyc), t = tt - n * cyc;
    const back = h.dx && mod(n, 2) === 1, x0 = h.tx * T + T / 2 + (back ? h.dx * T : 0), x1 = h.tx * T + T / 2 + (back ? 0 : h.dx * T);
    HO.back = back; HO.n = n;
    if (t < h.rest) { HO.fly = false; HO.x = x0; HO.y = h.home; HO.warn = t > h.rest - HOP.WARN ? (t - (h.rest - HOP.WARN)) / HOP.WARN : 0; HO.up = false; return HO; }
    const u = t - h.rest, vy0 = HOP.GRAV * h.dur / 2;
    HO.fly = true; HO.x = x0 + (x1 - x0) * (u / h.dur); HO.y = h.home - (vy0 * u - 0.5 * HOP.GRAV * u * u); HO.warn = 0; HO.up = u < h.dur / 2;
    return HO;
  }
  function updateHoppers(v, p) {
    for (const h of v.hoppers) {
      const s = hopperAt(h, api.time), wasFly = h.fly;
      h.fly = s.fly; h.x = s.x; h.y = s.y; h.warn = s.warn; h.back = s.back; h.up = s.up;
      if (h.fly && !wasFly && near(h.x, h.home, 1)) {
        api.voice({ type: 'sine', f0: 300, f1: 900, slide: 0.12, dur: 0.16, vol: 0.03 }); api.noise({ lp: 1500, dur: 0.12, vol: 0.025 });
        if (h.said !== s.n && (h.line || api.hash(s.n, h.tx) < 0.25) && Math.abs(p.x - h.x) < 5 * T && api.state === 'play') { h.said = s.n; api.bubble(h.line || api.pick(lines.hopper), { x: h.x - 10, y: h.y - 30, w: 20 }, 1.0); }
      }
      if (!wasFly && h.fly && !api.reduced) api.burst(h.x, h.home, 6, [api.W.lavaTop || '#FFC978', api.W.lavaLine || '#FFEBAA'], 90, { grav: 500, vy: -90, life: 0.3 });
      if (h.fly && api.state === 'play' && h.y < h.home && boxCircle(p, h.x, h.y, HOP.R * HOP.HIT + 3)) api.hurt();
    }
  }
  function boxCircle(p, cx, cy, r) {
    const nx = Math.max(p.x + 3, Math.min(cx, p.x + p.w - 3)), ny = Math.max(p.y + 3, Math.min(cy, p.y + p.h - 3));
    return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
  }

  // ---------- steam vents ----------
  function steamAt(s, time) {
    if (!s.off) return set3(SO, true, 0, 1);
    const t = mod(time + s.offset, s.on + s.off);
    if (t < s.on) return set3(SO, true, 0, Math.min(1, t / STEAM.RAMP));
    return set3(SO, false, t > s.on + s.off - STEAM.WARN ? (t - (s.on + s.off - STEAM.WARN)) / STEAM.WARN : 0, 0);
  }
  function updateSteam(v) {
    for (const s of v.steam) {
      const was = s.active, st = steamAt(s, api.time);
      s.active = st[0]; s.warn = st[1]; s.k = st[2];
      if (s.active && !was && near(s.cx, s.floor - 2 * T, 2)) api.noise({ hp: 1600, dur: Math.min(1.2, s.on), vol: 0.02 });
    }
  }
  const STEAM_OUT = { gravity: 0, maxRise: STEAM.LIFT };
  // the physics hook: inside an active column Mimo floats up like in the updraft of the game
  function steamPhysics(p) {
    const v = api.L && api.L.volcano; if (!v || !v.steam.length) return null;
    const cx = p.x + p.w / 2;
    for (const s of v.steam) {
      if (!s.active || Math.abs(cx - s.cx) > STEAM.HALF || p.y + p.h <= s.top || p.y >= s.floor) continue;
      p.canCut = false; p.inSteam = true;
      STEAM_OUT.gravity = STEAM.GRAV * s.k + api.PHYS.GRAV * (1 - s.k);
      return STEAM_OUT;
    }
    p.inSteam = false;
    return null;
  }

  // ---------- glow rain ----------
  // calls f(x, y) for every rock in flight now (at most a few), no allocation
  function eachRock(r, time, f) {
    const tt = time - r.offset, k1 = Math.floor(tt / r.every), back = Math.ceil(r.fallT / r.every);
    for (let k = k1 - back; k <= k1; k++) {
      const u = tt - k * r.every; if (k < 0 || u < 0 || u >= r.fallT) continue;
      f(r.cx, r.y0 + 0.5 * RAIN.GRAV * u * u, k);
    }
  }
  // how strongly the landing spot is marked now (0..1): from WARN s before a rock is dropped until it lands
  function rainWarn(r, time) {
    const tt = time - r.offset, k = Math.floor((tt + RAIN.WARN) / r.every), rel = k * r.every;
    const u = tt - rel; // -WARN .. 0 before the drop, 0 .. fallT while falling
    if (k < 0 || u > r.fallT) return 0;
    return Math.max(0, Math.min(1, (u + RAIN.WARN) / (RAIN.WARN + r.fallT)));
  }
  let rainP = null, rainHit = false;
  const rainTouch = (x, y) => { if (boxCircle(rainP, x, y, RAIN.R + 3)) rainHit = true; };
  function updateRain(v, p) {
    rainP = p;
    for (const r of v.rain) {
      const landed = Math.floor((api.time - r.offset - r.fallT) / r.every);
      if (landed > r.last) {
        r.last = landed;
        if (landed >= 0 && near(r.cx, r.impact, 1)) {
          api.burst(r.cx, r.impact - 2, 10, [api.W.lavaTop || '#FFC978', api.W.ember || '#FF9A5C'], 130, { grav: 600, vy: -140 });
          api.ring(r.cx, r.impact - 4, api.W.lavaLine || '#FFEBAA'); api.noise({ lp: 700, f1: 120, dur: 0.18, vol: 0.04 });
        }
      }
      if (api.state !== 'play') continue;
      rainHit = false; eachRock(r, api.time, rainTouch);
      if (rainHit) api.hurt();
    }
  }

  // ---------- lava falls ----------
  function fallAt(f, time) {
    const len = f.bottom - f.top;
    if (!f.off) return set3(FO, f.top, f.bottom, 0);
    const t = mod(time + f.offset, f.on + f.off);
    if (t < f.on) return set3(FO, f.top, f.top + Math.min(len, t * FALL.SPEED), 0);
    const u = t - f.on, head = f.top + Math.min(len, f.on * FALL.SPEED), tail = f.top + Math.min(len, u * FALL.SPEED);
    return set3(FO, Math.min(tail, head), head, t > f.on + f.off - FALL.WARN ? (t - (f.on + f.off - FALL.WARN)) / FALL.WARN : 0);
  }
  function updateFalls(v, p) {
    for (const f of v.falls) {
      const s = fallAt(f, api.time);
      f.tail = s[0]; f.head = s[1]; f.warn = s[2];
      if (api.state !== 'play' || f.head - f.tail < 2) continue;
      if (p.x + p.w - 3 > f.cx - FALL.W / 2 && p.x + 3 < f.cx + FALL.W / 2 && p.y + p.h - 3 > f.tail && p.y + 3 < f.head) api.hurt();
    }
  }

  const near = (x, y, screens) => { const cam = api.cam, vw = api.view; return Math.abs(x - (cam.x + vw.w / 2)) < vw.w * screens && Math.abs(y - (cam.y + vw.h / 2)) < vw.h * screens; };

  // the rider of a body is moved last, so a geyser or plate carries him after it moved (the core does the carrying)
  function keepRide(L) {
    const r = api.p && api.p.carried, i = r ? L.bodies.indexOf(r) : -1;
    if (i >= 0 && i < L.bodies.length - 1) { L.bodies.splice(i, 1); L.bodies.push(r); }
  }

  window.MimoWorlds.register({
    world: 5,
    spawns,
    setup(a) { api = a; },
    init(L, info) {
      const v = V().state(L);
      if (info.reason === 'respawn') return;
      applyEntries(v, info.def || {});
      const p = api.p; if (p) { updateGeysers(v, p); updatePlates(v, p); updateHoppers(v, p); updateSteam(v); updateFalls(v, p); }
    },
    update() {
      const v = api.L && api.L.volcano, p = api.p; if (!v || !p) return;
      updateGeysers(v, p); updatePlates(v, p); updateHoppers(v, p); updateSteam(v); updateRain(v, p); updateFalls(v, p); keepRide(api.L);
    },
    physics: steamPhysics,
  });
  Object.assign(window.MimoVolcano, { GEY, PLATE, HOP, STEAM, RAIN, FALL, geyserAt, plateAt, platePeriod, hopperAt, steamAt, eachRock, rainWarn, fallAt });
})();
