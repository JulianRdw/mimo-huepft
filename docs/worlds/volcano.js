// World 5 "Vulkaninsel": the world itself, lava, rising lava, hot stone and basalt columns.
// The other parts: volcano-look.js (picture), volcano-things.js (geysers, lava plates, fire hoppers, steam vents,
// glow rain, lava falls), volcano-levels.js (levels and the song). They share numbers, state and helpers through
// window.MimoVolcano (set up here at load time, without document or canvas, so the level tools can run it in Node).
//
// Lava is a map tile ("~"): deadly, its surface lies SURF px below the top of the topmost lava tile. A level may also
// let the lava rise over the whole level (level field `rise`, the chase of this world). Hot stone ("H") burns Mimo's
// paws when he stands on it too long (the heat shows as colour on the stone and on his feet). Basalt columns ("I")
// crumble from the top while he stands on them and grow back once he has left.
// Everything runs on the game clock and on fixed steps, so the level bots replay exactly.
(function () {
  'use strict';
  let api = null;
  const T = 32;

  // ---------- the numbers (tools/volcano-test.mjs measures them; tools/levels/world5-kit.md lists the results) ----------
  const LAVA = Object.freeze({ SURF: 8, GRACE: 4 });
  // hot stone: standing on it fills the heat from 0 to 1 in BURN s (then it burns), off it the heat drains in COOL s
  const HOT = Object.freeze({ BURN: 1.1, COOL: 0.55, SAY: 0.55, SIZZLE: 0.22 });
  // basalt: the top segment under Mimo shakes for SHAKE s and breaks; shaking fades at DECAY per s when he is off it;
  // REGROW s after he left the column it stands up again (BACK s animation)
  const BASALT = Object.freeze({ SHAKE: 0.55, DECAY: 0.8, REGROW: 2.5, BACK: 0.3, FALL: 0.45 });
  // rising lava (level field rise): tiles/s, wait before it starts, tiles under a flag after a fall, wait after a fall
  const RISE = Object.freeze({ SPEED: 1.5, DELAY: 1.5, GAP: 6, AGAIN: 1.2 });

  const smooth = (k) => k * k * (3 - 2 * k);

  // ---------- per level state (L.volcano), fresh with every load and restart ----------
  function state(L) {
    if (!L.volcano) {
      L.volcano = { def: null, heat: 0, heatSaid: false, sizzleT: 0, broken: null, shake: null, regrow: null, cells: new Int32Array(0),
        rise: null, riseY: null, riseWait: 0, geysers: [], plates: [], hoppers: [], steam: [], rain: [], falls: [], says: [], flight: [] };
    }
    return L.volcano;
  }
  const vol = () => (api && api.L ? api.L.volcano : null);
  const LAVA_ID = () => api.tileId(5, '~'), HOT_ID = () => api.tileId(5, 'H'), BASALT_ID = () => api.tileId(5, 'I');

  // ---------- lava ----------
  const isLava = (tx, ty) => api.tileAt(tx, ty) === LAVA_ID();
  // the surface of a lava tile in world pixels: SURF under its top when it is the top of its pool, else its top
  const lavaTop = (tx, ty) => ty * T + (isLava(tx, ty - 1) ? 0 : LAVA.SURF);
  function inLava(p) {
    const id = LAVA_ID(), feet = p.y + p.h;
    const x0 = Math.floor((p.x + 4) / T), x1 = Math.floor((p.x + p.w - 4) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((feet - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (api.tileAt(tx, ty) === id && feet > lavaTop(tx, ty) + LAVA.GRACE) return true;
    return false;
  }

  // ---------- rising lava ----------
  function makeRise(o, L) {
    if (!o || typeof o.row !== 'number') return null;
    return { start: o.row * T, speed: (o.speed || RISE.SPEED) * T, delay: o.delay != null ? o.delay : RISE.DELAY, top: (o.top != null ? o.top : -4) * T, gap: (o.gap || RISE.GAP) * T, again: o.again != null ? o.again : RISE.AGAIN, h: L.h * T };
  }
  function updateRise(v, dt) {
    const r = v.rise; if (!r) return;
    if (api.state !== 'play') return;
    if (v.riseWait > 0) { v.riseWait -= dt; return; }
    v.riseY = Math.max(r.top, v.riseY - r.speed * dt);
  }

  // ---------- hot stone ----------
  // the tiles Mimo stands on (feet exactly on a tile top, grounded); calls f(tx, ty) for each
  function standingTiles(p, f) {
    if (!p.grounded && !p.wasGrounded) return;
    const feet = p.y + p.h; if (Math.abs(feet - Math.round(feet / T) * T) > 0.5) return;
    const ty = Math.round(feet / T), x0 = Math.floor((p.x + 2) / T), x1 = Math.floor((p.x + p.w - 2 - 0.01) / T);
    for (let tx = x0; tx <= x1; tx++) f(tx, ty);
  }
  let onHot = false, onBasalt = -1;
  const markHot = (tx, ty) => { if (api.tileAt(tx, ty) === HOT_ID()) onHot = true; };
  function updateHeat(v, p, dt) {
    onHot = false;
    if (api.state === 'play' && !p.carried) standingTiles(p, markHot);
    if (onHot) {
      v.heat = Math.min(1, v.heat + dt / (v.burn || HOT.BURN));
      v.sizzleT -= dt;
      if (v.sizzleT <= 0) { v.sizzleT = HOT.SIZZLE; api.noise({ hp: 2400, dur: 0.12, vol: 0.012 + 0.03 * v.heat }); }
      if (v.heat > HOT.SAY && !v.heatSaid) { v.heatSaid = true; api.bubble(api.pick(HOT_LINES), 'player', 1.0); p.sx = 0.9; p.sy = 1.1; }
      if (v.heat >= 1) { v.heat = 0; v.heatSaid = false; api.hurt(); }
    } else {
      v.heat = Math.max(0, v.heat - dt / HOT.COOL);
      v.sizzleT = 0;
      if (v.heat < 0.2) v.heatSaid = false;
    }
    p.heat = v.heat;
  }
  const HOT_LINES = ['Heiß!', 'Autsch, heiß!', 'Pfoten hoch!', 'Heiß, heiß, heiß!'];

  // ---------- basalt columns ----------
  const idx = (tx, ty) => ty * api.L.w + tx;
  const markBasalt = (tx, ty) => { if (api.tileAt(tx, ty) === BASALT_ID() && !vol().broken[idx(tx, ty)]) onBasalt = idx(tx, ty); };
  function updateBasalt(v, p, dt) {
    if (!v.broken) return;
    onBasalt = -1;
    if (api.state === 'play') standingTiles(p, markBasalt);
    const sh = v.shake, br = v.broken, rg = v.regrow, w = api.L.w, cells = v.cells;
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k];
      // a broken segment counts the time since Mimo last stood on its column
      if (br[i]) { rg[i] = onBasalt >= 0 && onBasalt % w === i % w ? 0 : rg[i] + dt; continue; }
      if (rg[i] < 0) rg[i] = Math.min(0, rg[i] + dt);
      if (i === onBasalt) {
        sh[i] += dt;
        if (sh[i] >= BASALT.SHAKE) breakSegment(v, i % w, Math.floor(i / w));
      } else if (sh[i] > 0) sh[i] = Math.max(0, sh[i] - BASALT.DECAY * dt);
    }
    // a column grows back REGROW s after Mimo left it: every broken segment that he does not overlap
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k];
      if (!br[i] || rg[i] < BASALT.REGROW) continue;
      const tx = i % w, ty = Math.floor(i / w);
      if (api.overlapsTile(p, tx, ty, -2)) continue;
      br[i] = 0; sh[i] = 0; rg[i] = -BASALT.BACK; // negative: the rise animation is still running
    }
  }
  function breakSegment(v, tx, ty) {
    const i = idx(tx, ty);
    v.broken[i] = 1; v.shake[i] = 0; v.regrow[i] = 0;
    v.flight.push({ x: tx * T, y: ty * T, t: 0 });
    api.burst(tx * T + T / 2, ty * T + 6, 10, [api.W.basalt || '#7D7290', api.W.basaltTop || '#A79CBB'], 110, { grav: 600, rect: true });
    api.sfx.crumble(); api.shake(0.15);
  }

  // ---------- lines at places (level field says: [{ x, y, r, text }]) ----------
  function updateSays(v, p) {
    if (api.state !== 'play') return;
    const cx = (p.x + p.w / 2) / T, cy = (p.y + p.h / 2) / T;
    for (const s of v.says) {
      if (s.said || Math.hypot(cx - s.x - 0.5, cy - s.y - 0.5) > s.r) continue;
      s.said = true; api.bubble(s.text, 'player', Math.min(3.5, 1.4 + s.text.length * 0.045));
    }
  }

  // ---------- the hooks ----------
  function init(L, info) {
    const v = state(L), def = info.def || {};
    v.heat = 0; v.heatSaid = false;
    if (info.reason === 'respawn') {
      // after a fall: columns stand again, the rising lava waits below the flag
      if (v.broken) { v.broken.fill(0); v.shake.fill(0); v.regrow.fill(0); }
      v.flight = [];
      if (v.rise) { v.riseY = Math.min(v.rise.start, api.G.respawn.y + api.p.h + v.rise.gap); v.riseWait = v.rise.again; }
      return;
    }
    v.def = def;
    v.burn = def.hot && def.hot.burn ? def.hot.burn : HOT.BURN;
    const n = L.w * L.h, bid = BASALT_ID(), cells = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.tiles[y][x] === bid) cells.push(y * L.w + x);
    const any = cells.length > 0;
    v.cells = Int32Array.from(cells);
    v.broken = any ? new Uint8Array(n) : null; v.shake = any ? new Float32Array(n) : null; v.regrow = any ? new Float32Array(n) : null;
    v.flight = [];
    v.rise = makeRise(def.rise, L); v.riseY = v.rise ? v.rise.start : null; v.riseWait = v.rise ? v.rise.delay : 0;
    const says = def.says;
    v.says = Array.isArray(says) ? says.filter((e) => e && typeof e.text === 'string').map((e) => ({ x: e.x, y: e.y, r: e.r || 2, text: e.text, said: false })) : [];
  }
  function update(dt) {
    const L = api.L, v = L && L.volcano, p = api.p; if (!v || !p) return;
    updateRise(v, dt);
    for (let i = v.flight.length - 1; i >= 0; i--) { v.flight[i].t += dt; if (v.flight[i].t > BASALT.FALL) v.flight.splice(i, 1); }
    updateHeat(v, p, dt);
    updateBasalt(v, p, dt);
    updateSays(v, p);
    if (api.state !== 'play') return;
    if (inLava(p) || (v.riseY != null && p.y + p.h > v.riseY + LAVA.GRACE)) { lavaHit(p); }
  }
  function lavaHit(p) {
    api.burst(p.x + p.w / 2, p.y + p.h, 16, [api.W.lavaTop || '#FFC978', api.W.lavaLine || '#FFEBAA'], 160, { grav: 500, vy: -120 });
    api.hurt();
  }

  // ---------- tiles: lava, hot stone, basalt (their pictures come from volcano-look.js) ----------
  const look = (k) => (tx, ty, x, y, ctx) => { const f = window.MimoVolcano.draw && window.MimoVolcano.draw[k]; if (f) f(tx, ty, x, y, ctx || api.ctx); };
  const tiles = {
    '~': { solid: false, lint: { name: 'Lava', color: '#FF9A5C', kind: 'decor' }, draw: look('lava') },
    H: { solid: true, lint: { name: 'Heißer Stein', color: '#B5677A' }, draw: look('hot') },
    I: { solid: (tx, ty) => { const v = vol(); return !(v && v.broken && v.broken[ty * api.L.w + tx]); }, lint: { name: 'Basaltsäulen', color: '#7D7290', kind: 'ground' }, draw: look('basalt') },
  };

  // ---------- shared with the other parts, the tests and a boss ----------
  window.MimoVolcano = Object.assign(window.MimoVolcano || {}, {
    LAVA, HOT, BASALT, RISE, smooth, state, lavaTop, isLava, inLava,
    // the rising lava line in world px (null: none); a boss may place it or let it rise
    riseY() { const v = vol(); return v ? v.riseY : null; },
    setRise(o) { const v = vol(); if (!v) return; v.rise = makeRise(o, api.L); v.riseY = v.rise ? v.rise.start : null; v.riseWait = v.rise ? v.rise.delay : 0; },
    heat() { const v = vol(); return v ? v.heat : 0; },
    T,
  });

  window.MimoWorlds.register({
    world: 5,
    name: 'Vulkaninsel',
    // right after the 13 levels of world 4 (29 + 13)
    firstLevel: 42,
    // the world song; a level with rising lava gets the chase song
    song: (def) => (def && def.rise ? 'chase' : 'volcano'),
    lines: ['Hier ist es aber warm.', 'Nicht in die Suppe treten.', 'Riecht nach Grillfest.', 'Heiße Pfoten, kühler Kopf.', 'Der Berg brummt.', 'Lava ist kein Wasser. Gut zu wissen.'],
    tiles,
    setup(a) { api = a; },
    init, update,
  });
})();
