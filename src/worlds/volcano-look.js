// World 5 "Gipfelsturm": the picture. A plum to peach sky, the sea around the island at the horizon, the volcano cone
// with its glowing crater, smoke and a lava stream, dark basalt ground, lava pools with a bright edge, the rising lava,
// hot stone with glowing cracks, basalt columns, obsidian spikes (the thorns), ash flakes and embers, and the
// decoration tiles ash palm "Y" and crystals "C".
// Design rule of the game: scenery soft, ground one clear mid tone, danger saturated and glowing (lava, fire, hot),
// gold only for things to collect. Decoration never looks like a platform or a hazard.
// Kept cheap for old iPhones: no shadowBlur, every gradient is made once and reused (moved with translate/scale),
// everything culled to the camera, no allocation in the per-frame loops.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, V = () => window.MimoVolcano;

  const palette = {
    light: {
      skyTop: '#4C2F58', skyBot: '#F5A77E', hillFar: '#6B4068', hillNear: '#553251', cloud: '#7A5578', sun: '#FFB36B',
      ground: '#5F4A68', groundEdge: '#93779A', groundDot: '#735C7C',
      sea: '#B5788C', seaLine: '#F7C9A6', seaGlint: '#FFD9B0', cone: '#6B4068', coneShade: '#5A3659', crater: '#FFC978', glow: '#FFB36B', stream: '#FF9E66', smoke: '#7A5578',
      lavaTop: '#FFC978', lavaBot: '#F2785C', lavaDeep: '#E2654F', lavaLine: '#FFEBAA', lavaGlow: '#FF9A5C', ember: '#FFB36B', ash: '#D9CCD8',
      plateCool: '#4E3A52', plateWarm: '#9C5A72', plateHot: '#FF8A55', plateHi: '#FFFFFF', plateCrackCool: '#8C7396', plateCrack: '#FFC978',
      hot: '#7D4458', hotEdge: '#A8687C', hotCrack: '#FF9A5C', hotGlow: '#FFE2A0',
      basalt: '#6E6383', basaltTop: '#A99DBE', basaltInk: '#51476A', basaltHi: '#8B80A2',
      geyser: '#BFE3F2', geyserFoam: '#FFFFFF', steam: '#F6F0FA', mouth: '#93779A', mouthInk: '#4E3A52',
      hopper: '#FF8A55', hopperCore: '#FFEBAA', hopperInk: '#5B2A3A',
      thorn: '#2C2236', thornEdge: '#FF8C6E', rock: '#7E5A6E', smokePuff: '#8E6C8C',
      palmTrunk: '#8C6A5C', palmLeaf: '#7FA37A', palmLeaf2: '#93B58A', crystal: '#FFCF8A', crystal2: '#F2A7BC', crystalInk: '#C98E6E',
      waterNight: '#7E5A78', seaNight: '#5E4566',
    },
    dark: {
      skyTop: '#22162D', skyBot: '#7A4352', hillFar: '#43294A', hillNear: '#33203A', cloud: '#4A3550', sun: '#E89A62',
      ground: '#4C3C56', groundEdge: '#76628A', groundDot: '#5C4A68',
      sea: '#6C4458', seaLine: '#C7917C', seaGlint: '#E7B490', cone: '#43294A', coneShade: '#38223F', crater: '#F7B46A', glow: '#F09A5C', stream: '#F08A58', smoke: '#4A3550',
      lavaTop: '#FFC16A', lavaBot: '#E96A50', lavaDeep: '#D2563F', lavaLine: '#FFE4A0', lavaGlow: '#F58A50', ember: '#FFA860', ash: '#9C8EA6',
      plateCool: '#2E2236', plateWarm: '#844A62', plateHot: '#FF8450', plateHi: '#FFF2E0', plateCrackCool: '#6A5876', plateCrack: '#FFC16A',
      hot: '#6A3549', hotEdge: '#8C5468', hotCrack: '#FF9050', hotGlow: '#FFDB96',
      basalt: '#564B6C', basaltTop: '#8A7EA2', basaltInk: '#3C3350', basaltHi: '#6E6386',
      geyser: '#A9D4E6', geyserFoam: '#EAF6FB', steam: '#D9D0E2', mouth: '#76628A', mouthInk: '#2E2236',
      hopper: '#FF844E', hopperCore: '#FFE4A0', hopperInk: '#3E1C28',
      thorn: '#1A1322', thornEdge: '#FF8C6E', rock: '#5E4252', smokePuff: '#5E4866',
      palmTrunk: '#6A5046', palmLeaf: '#55785A', palmLeaf2: '#668866', crystal: '#E8B474', crystal2: '#D48CA2', crystalInk: '#A8735A',
      waterNight: '#4A3448', seaNight: '#3A2840',
    },
    night: {
      light: { nightSkyTop: '#1E1636', nightSkyBot: '#6A3A55', nightCloud: '#3E2C4A', nightSun: '#FF9A5C', nightHillFar: '#3C2446', nightHillNear: '#2C1A34' },
      dark: { nightSkyTop: '#110B1C', nightSkyBot: '#4A2238', nightCloud: '#2A1E34', nightSun: '#E8844E', nightHillFar: '#2A1A32', nightHillNear: '#1E1226' },
    },
  };

  // ---------- small helpers and gradient caches ----------
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  // gradients are made once per key and colour pair and reused; they live in local coordinates (moved with translate
  // and scale). Alpha that changes over time is applied with globalAlpha, so a pulsing glow never makes a new gradient.
  const cache = {};
  function linear(key, y0, y1, c0, c1) {
    const c = cache[key];
    if (c && c.y0 === y0 && c.y1 === y1 && c.c0 === c0 && c.c1 === c1) return c.g;
    const g = api.ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1);
    cache[key] = { y0, y1, c0, c1, g }; return g;
  }
  function radial(key, col) {
    const c = cache[key]; if (c && c.col === col) return c.g;
    const g = api.ctx.createRadialGradient(0, 0, 0, 0, 0, 100); g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.45, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
    cache[key] = { col, g }; return g;
  }
  // a soft glow disc of radius r at x, y, strength a (0..1)
  function glow(ctx, key, x, y, r, col, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(r / 100, r / 100); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = radial(key, col);
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fill(); ctx.restore();
  }
  // colours derived from the palette (transparent ends of the glows), made again only when the palette object changes
  let dFor = null, D = null;
  function derived() {
    const W = api.W; if (dFor === W && D) return D;
    dFor = W; D = { glow0: rgba(W.lavaGlow, 0), glow1: rgba(W.lavaGlow, 1), geyser75: rgba(W.geyser, 0.75) };
    return D;
  }
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };
  const night = () => api.W.night || 0;

  // ---------- background (screen space) ----------
  function drawBackground(ctx) {
    const W = api.W, v = api.view, cam = api.cam, L = api.L, t = api.reduced ? 0 : api.time;
    // the ascent (volcano-ascent.js): height bands from the beach to the crater rim; null in the boss arena
    const A = V().ascent, up = A ? A.now() : null;
    ctx.fillStyle = linear('sky', 0, v.h, W.skyTop, W.skyBot); ctx.fillRect(0, 0, v.w, v.h);
    if (up) A.sky(ctx, up);
    if (night() > 0.25) drawStars(ctx, v, cam);
    // the horizon: a little above the bottom of the level, drifting slower than the level (far away)
    let hy = Math.round(((L.h - 2) * T - cam.y) * 0.85 - 10);
    if (up) hy = Math.round(A.horizon(hy));
    if (V().shore) hy = V().shore.horizon(hy);   // a level with a shore: the sea comes up behind the boat (volcano-shore.js)
    // the volcano cone with its crater glow, smoke and a lava stream down the flank; it comes closer from level to level
    // (level field cone 0..1, see coneOf): small and far away first, big and close at the crater rim
    const c = coneOf(), s = CONE_FAR + (CONE_NEAR - CONE_FAR) * c;
    const cx = Math.round(v.w * (0.74 - 0.14 * c) - cam.x * 0.04), base = Math.max(hy, 150), h0 = Math.min(v.h * 0.42, 190);
    if (base - h0 * s < v.h) drawCone(ctx, cx, base, h0, s, t, up);
    if (up) A.deck(ctx, up, hy);
    if (hy < v.h) {
      const sea = night() > 0 ? api.mixHex(W.sea, W.seaNight, night() * 0.8) : W.sea;
      ctx.fillStyle = sea; ctx.fillRect(0, Math.max(0, hy), v.w, v.h - Math.max(0, hy));
      // a soft horizon (not a bright line: it must never look like the edge of a ledge)
      ctx.fillStyle = W.seaLine; ctx.globalAlpha = 0.35; if (hy >= 0) ctx.fillRect(0, hy, v.w, 1);
      // warm streaks on the sea, the glow of the volcano mirrored under the cone
      ctx.globalAlpha = 0.45; ctx.fillStyle = W.seaGlint;
      for (let i = 0; i < 12; i++) {
        const wx = ((api.hash(i, 4) * 1600 - cam.x * 0.2) % 1600 + 1600) % 1600 - 100, wy = hy + 7 + api.hash(i, 9) * Math.min(70, v.h - hy);
        if (wy < v.h) ctx.fillRect(Math.round(wx), Math.round(wy), 16 + api.hash(i, 1) * 24, 2);
      }
      ctx.fillStyle = W.glow; ctx.globalAlpha = 0.35;
      for (let k = 0; k < 4; k++) ctx.fillRect(cx - 26 + Math.sin(t * 0.8 + k) * 6 + k * 3, hy + 6 + k * 9, 40 - k * 7, 2);
      ctx.globalAlpha = 1;
    }
    // near ridges of the island, dark, in front of the sea (with the ascent: palms, huts, crags, clouds below, the rim)
    // (a level with a shore, volcano-shore.js: left of the beach the open sea instead of the ridge)
    const ridge = () => (up ? A.below(ctx, up, hy) : api.drawHills(W.hillNear, Math.min(v.h + 40, hy + 34), 0.32, 22, 0.011, 7));
    if (V().shore) V().shore.background(ctx, ridge); else ridge();
  }
  function drawStars(ctx, v, cam) {
    ctx.fillStyle = '#FFF4E6';
    for (let i = 0; i < 36; i++) {
      const x = ((api.hash(i, 3) * 1400 - cam.x * 0.06) % 1400 + 1400) % 1400, y = api.hash(i, 11) * v.h * 0.5 - cam.y * 0.04;
      if (x > v.w || y < 0) continue;
      ctx.globalAlpha = (night() - 0.25) * (0.5 + 0.5 * Math.sin(api.time * 1.3 + i)); ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  // how close the volcano is, 0 (far) .. 1 (right there): the level field cone, else its place within the world
  // (the first level 0, the 12th and the 13th 1); the boss arena and anything unknown get 1
  const CONE_FAR = 0.5, CONE_NEAR = 2.2, CONE_LAST = 11;
  function coneOf() {
    const v = api.L && api.L.volcano, def = v && v.def;
    if (api.mode === 'boss' || !def) return 1;
    if (typeof def.cone === 'number') return Math.max(0, Math.min(1, def.cone));
    const own = (api.levels || []).filter((l) => l.world === 5), i = own.indexOf(def);
    return i < 0 ? 1 : Math.min(1, i / CONE_LAST);
  }
  // the cone is drawn in its own units (foot at 0, 0, height h0) and scaled by s around its foot
  function drawCone(ctx, cx, baseY, h0, s, t, up) {
    ctx.save(); ctx.translate(cx, baseY); ctx.scale(s, s);
    paintCone(ctx, 0, -h0, 0, t);
    if (up) V().ascent.coneCross(ctx, up, -22, -h0 - 3);
    ctx.restore();
  }
  function paintCone(ctx, cx, top, base, t) {
    const W = api.W, half = 34, n = night();
    glow(ctx, 'crater', cx, top + 4, 120 + 30 * n, W.glow, 0.55 + 0.3 * n);
    // smoke out of the crater, drifting up and right
    ctx.fillStyle = W.smoke;
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.05 + i / 5) % 1), r = 14 + k * 26;
      ctx.globalAlpha = 0.7 * (1 - k); ctx.beginPath(); ctx.arc(cx + 8 + k * 70 + Math.sin(t * 0.4 + i) * 6, top - 12 - k * 110, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = W.cone; ctx.beginPath(); ctx.moveTo(cx - 250, base + 2);
    ctx.quadraticCurveTo(cx - 90, base - 30, cx - half, top); ctx.lineTo(cx + half, top); ctx.quadraticCurveTo(cx + 70, base - 60, cx + 220, base + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.coneShade; ctx.beginPath(); ctx.moveTo(cx + 10, top); ctx.lineTo(cx + half, top); ctx.quadraticCurveTo(cx + 70, base - 60, cx + 220, base + 2); ctx.lineTo(cx + 90, base + 2); ctx.quadraticCurveTo(cx + 30, base - 80, cx + 10, top); ctx.fill();
    // the lava stream down the flank and the glowing rim of the crater
    ctx.strokeStyle = W.stream; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(cx + 12, top + 3); ctx.quadraticCurveTo(cx + 2, top + (base - top) * 0.35, cx + 30, top + (base - top) * 0.6); ctx.quadraticCurveTo(cx + 52, top + (base - top) * 0.8, cx + 40, base); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = W.crater; api.rr(cx - half, top - 4, half * 2, 8, 4); ctx.fill();
  }

  // ---------- lava pools (world space, behind the tiles, over the plates) ----------
  function drawLava(ctx) {
    const v = api.L && api.L.volcano; if (!v) return;
    const L = api.L, cam = api.cam, vw = api.view, id = api.tileId(5, '~'), W = api.W, S = V().LAVA.SURF, t = api.reduced ? 0 : api.time;
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.w - 1, Math.floor((cam.x + vw.w) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(L.h - 1, Math.floor((cam.y + vw.h) / T));
    const d = derived(), band = linear('lavaBand', 0, T - S, W.lavaTop, W.lavaBot), halo = linear('lavaHalo', -44, 0, d.glow0, d.glow1), haloA = 0.42 + 0.18 * night();
    for (let ty = y0; ty <= y1; ty++) {
      const row = L.tiles[ty], above = ty > 0 ? L.tiles[ty - 1] : null;
      for (let tx = x0; tx <= x1; tx++) {
        if (row[tx] !== id) continue;
        const surface = !above || above[tx] !== id;
        let n = 1; while (tx + n <= x1 && row[tx + n] === id && (!above || (above[tx + n] !== id) === surface)) n++;
        const x = tx * T, y = ty * T, w = n * T;
        if (!surface) { ctx.fillStyle = W.lavaBot; ctx.fillRect(x, y, w, T + 1); tx += n - 1; continue; }
        ctx.save(); ctx.translate(0, y + S);
        ctx.fillStyle = halo; ctx.globalAlpha = haloA; ctx.fillRect(x, -44, w, 44); ctx.globalAlpha = 1;
        ctx.fillStyle = band; ctx.fillRect(x, 0, w, T - S + 1);
        ctx.restore();
        surfaceLine(ctx, x, x + w, y + S, t, W);
        lavaBubbles(ctx, tx, n, y + S, t, W);
        tx += n - 1;
      }
    }
  }
  // the bright, waving edge of the lava: a fill over the band and a clear line on top
  function surfaceLine(ctx, xa, xb, y, t, W) {
    ctx.fillStyle = W.lavaTop; ctx.beginPath(); ctx.moveTo(xa, y + 4);
    for (let x = xa; x <= xb; x += 8) ctx.lineTo(x, y + Math.sin(x / 50 * TAU + t * 1.4) * 2);
    ctx.lineTo(xb, y + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = W.lavaLine; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = xa + 2; x <= xb - 2; x += 8) { const yy = y + Math.sin(x / 50 * TAU + t * 1.4) * 2; if (x === xa + 2) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  function lavaBubbles(ctx, tx, n, y, t, W) {
    if (api.reduced) return;
    ctx.strokeStyle = W.lavaLine; ctx.lineWidth = 1.6;
    for (let i = 0; i < n; i += 2) {
      const h = api.hash(tx + i, 77), k = (t * 0.5 + h) % 1;
      ctx.globalAlpha = (1 - k) * 0.8; ctx.beginPath(); ctx.arc((tx + i) * T + 6 + h * 20, y + 10 + h * 10, 2 + k * 5, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // the rising lava: one body over the whole width, drawn over the tiles (they are flooded)
  function drawRise(ctx) {
    const y = V().riseY(); if (y == null) return;
    const cam = api.cam, vw = api.view, W = api.W, t = api.reduced ? 0 : api.time, bottom = cam.y + vw.h + 4;
    if (y > bottom + 50) return;
    const x0 = Math.floor(cam.x / 8) * 8 - 8, x1 = cam.x + vw.w + 8;
    ctx.save(); ctx.translate(0, y);
    const d = derived(); ctx.fillStyle = linear('riseHalo', -90, 0, d.glow0, d.glow1); ctx.globalAlpha = 0.5; ctx.fillRect(x0, -90, x1 - x0, 90); ctx.globalAlpha = 1;
    ctx.fillStyle = linear('riseBody', 0, 120, W.lavaTop, W.lavaBot); ctx.fillRect(x0, 2, x1 - x0, Math.max(0, bottom - y));
    ctx.restore();
    surfaceLine(ctx, x0, x1, y, t * 1.6, W);
    lavaBubbles(ctx, Math.floor(x0 / T), Math.ceil((x1 - x0) / T), y, t, W);
  }

  // ---------- tiles ----------
  function drawGroundTile(tx, ty, x, y, ctx) {
    const W = api.W, SOLID = api.TILE.SOLID, above = api.tileAt(tx, ty - 1), up = above === SOLID || api.isSolid(tx, ty - 1) && above !== api.TILE.ONEWAY;
    ctx.fillStyle = W.ground; ctx.fillRect(x, y, T, T + (api.tileAt(tx, ty + 1) === SOLID ? 1 : 0));
    if (!up) {
      const left = api.tileAt(tx - 1, ty) === SOLID, right = api.tileAt(tx + 1, ty) === SOLID;
      ctx.fillStyle = W.groundEdge; api.rr(x - (left ? 2 : 0), y, T + (left ? 2 : 0) + (right ? 2 : 0), 7, left && right ? 0 : 4); ctx.fill();
      const h = api.hash(tx * 3 + 1, ty);
      if (h < 0.22 && above === api.TILE.EMPTY) { ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.ellipse(x + 7 + h * 80, y + 1, 4, 2.4, 0, Math.PI, 0); ctx.fill(); }
      return;
    }
    const h = api.hash(tx, ty);
    if (h < 0.35) { ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.arc(x + 8 + h * 40, y + 10 + api.hash(ty, tx) * 14, 2.2, 0, TAU); ctx.fill(); }
  }
  // hot stone: reddish basalt with glowing cracks; the stone Mimo stands on glows brighter as the heat rises
  function drawHot(tx, ty, x, y, ctx) {
    const W = api.W, v = api.L.volcano, p = api.p, id = api.tileId(5, 'H'), up = api.tileAt(tx, ty - 1) === id || api.tileAt(tx, ty - 1) === api.TILE.SOLID;
    ctx.fillStyle = W.hot; ctx.fillRect(x, y, T, T + 1);
    const under = !!p && v && v.heat > 0 && Math.abs(p.y + p.h - y) < 1 && p.x + p.w - 2 > x && p.x + 2 < x + T;
    const heat = under ? v.heat : 0, pulse = api.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(api.time * 2.4 + tx * 1.3);
    if (!up) { ctx.fillStyle = heat > 0 ? api.mixHex(W.hotEdge, W.hotGlow, heat) : W.hotEdge; api.rr(x, y, T, 6, 3); ctx.fill(); }
    const h = api.hash(tx, ty * 3);
    ctx.strokeStyle = heat > 0.5 ? W.hotGlow : W.hotCrack; ctx.lineWidth = 2 + heat * 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.55 + 0.25 * pulse + 0.2 * heat; ctx.beginPath();
    ctx.moveTo(x + 4 + h * 6, y + (up ? 6 : 10)); ctx.lineTo(x + 12 + h * 4, y + 16); ctx.lineTo(x + 9, y + 26); ctx.moveTo(x + 12 + h * 4, y + 16); ctx.lineTo(x + 24, y + 13 + h * 8); ctx.lineTo(x + 29, y + 22);
    ctx.stroke(); ctx.globalAlpha = 1;
    if (heat > 0) glow(ctx, 'hotGlow', x + T / 2, y + 2, 26 + heat * 22, W.hotCrack, 0.25 + 0.5 * heat);
    // heat shimmer over the top of the stone, so it reads as hot even in a still picture
    if (!up && !api.reduced) {
      ctx.strokeStyle = W.hotCrack; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.35;
      const k = (api.time * 0.7 + h) % 1; ctx.beginPath(); ctx.moveTo(x + 10 + h * 12, y - 2 - k * 14); ctx.quadraticCurveTo(x + 14 + h * 12, y - 6 - k * 14, x + 10 + h * 12, y - 10 - k * 14); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // basalt columns: hexagon columns with facets; the top segment shakes before it breaks, broken ones stand up again
  function drawBasalt(tx, ty, x, y, ctx) {
    const W = api.W, v = api.L.volcano, w = api.L.w, i = ty * w + tx;
    if (v && v.broken && v.broken[i]) return;
    const bid = api.tileId(5, 'I'), topSeg = !(api.tileAt(tx, ty - 1) === bid && !(v && v.broken && v.broken[i - w]));
    const sh = v && v.shake ? v.shake[i] / V().BASALT.SHAKE : 0, rg = v && v.regrow && v.regrow[i] < 0 ? -v.regrow[i] / V().BASALT.BACK : 0;
    const jx = sh > 0 && !api.reduced ? Math.sin(api.time * 70) * 1.6 * sh : 0, oy = rg * 18;
    ctx.save(); ctx.translate(x + jx, y + oy); if (rg) ctx.globalAlpha = 1 - rg * 0.6;
    ctx.fillStyle = W.basalt; ctx.fillRect(3, 0, T - 6, T + 1);
    ctx.fillStyle = W.basaltHi; ctx.fillRect(3, 0, 7, T + 1);
    ctx.fillStyle = W.basaltInk; ctx.fillRect(T - 9, 0, 6, T + 1); ctx.fillRect(3, T - 2, T - 6, 2);
    if (topSeg) { ctx.fillStyle = W.basaltTop; ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(9, 0); ctx.lineTo(T - 9, 0); ctx.lineTo(T - 3, 4); ctx.lineTo(T - 9, 8); ctx.lineTo(9, 8); ctx.closePath(); ctx.fill(); }
    if (sh > 0.25) { ctx.strokeStyle = W.basaltInk; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, 3); ctx.lineTo(16, 12 + sh * 8); ctx.lineTo(13, 18 + sh * 10); if (sh > 0.6) { ctx.moveTo(16, 12 + sh * 8); ctx.lineTo(23, 20); } ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // broken segments tumbling down (looks only)
  function drawFlight(ctx) {
    const v = api.L.volcano; if (!v || !v.flight.length) return;
    const W = api.W, B = V().BASALT;
    for (const f of v.flight) {
      const k = f.t / B.FALL; ctx.globalAlpha = 1 - k; ctx.fillStyle = W.basalt;
      ctx.save(); ctx.translate(f.x + T / 2, f.y + T / 2 + 900 * f.t * f.t); ctx.rotate(k * 1.2); ctx.fillRect(-T / 2 + 5, -T / 2 + 6, T - 10, T - 12); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function drawTile(t, tx, ty, x, y, ctx) {
    if (t === api.TILE.SOLID) { drawGroundTile(tx, ty, x, y, ctx); return true; }
    if (t === api.tileId(5, '~')) return true; // drawn as pools in drawLava
    return false;
  }

  // ---------- obsidian spikes (the thorns of this world): dark glass with a glowing edge ----------
  function drawThorn(tx, ty, x, y, dir) {
    const ctx = api.ctx, W = api.W, base = dir > 0 ? y + T : y, tip = dir > 0 ? y + 7 : y + T - 7, h = api.hash(tx, ty * 5);
    ctx.fillStyle = W.thorn; ctx.strokeStyle = W.thornEdge; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const bx = x + i * (T / 3), tt = tip + (i === 1 ? 0 : dir * (2 + h * 3)); ctx.moveTo(bx + 1, base); ctx.lineTo(bx + T / 6 + (h - 0.5) * 2, tt); ctx.lineTo(bx + T / 3 - 1, base); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = W.lavaLine; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + i * (T / 3) + T / 6 + (h - 0.5) * 2, tip + (i === 1 ? 0 : dir * (2 + h * 3)) + dir * 2, 1.6, 0, TAU); ctx.fill(); }
  }

  // ---------- the chase of a level with `chase`: a wall of lava rolling in from the left ----------
  function drawChase(c, ctx) {
    const W = api.W, x = c.x, t = api.time, cam = api.cam, v = api.view, top = cam.y - 60, bottom = cam.y + v.h + 60, left = Math.min(x - 40, cam.x - 20);
    ctx.fillStyle = W.lavaBot; ctx.beginPath(); ctx.moveTo(left, top);
    for (let y = top; y <= bottom; y += 16) ctx.lineTo(x - 18 + Math.sin(t * 2.6 + y * 0.05) * 8, y);
    ctx.lineTo(left, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = W.lavaTop; ctx.lineWidth = 8; ctx.beginPath(); for (let y = top; y <= bottom; y += 16) { const xx = x - 22 + Math.sin(t * 2.6 + y * 0.05) * 8; if (y === top) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); } ctx.stroke();
    ctx.strokeStyle = W.lavaLine; ctx.lineWidth = 3; ctx.stroke();
  }

  // ---------- floating bits: ash flakes drift down, embers rise (world space) ----------
  function drawAmbient(ctx) {
    const L = api.L, cam = api.cam, v = api.view, t = api.time, H = L.h * T, W = api.W;
    for (let i = 0; i < L.pollen.length; i++) {
      const q = L.pollen[i], ember = i % 3 === 0;
      const x = q.x + Math.sin(t * 0.5 + q.ph) * (ember ? 10 : 22);
      if (x < cam.x - 10 || x > cam.x + v.w + 10) continue;
      const y = ember ? ((q.y - t * (14 + q.sp) * 1.4) % H + H) % H : (q.y + t * (8 + q.sp * 0.6)) % H;
      if (y < cam.y - 10 || y > cam.y + v.h + 10) continue;
      if (ember) { ctx.fillStyle = W.ember; ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 3 + q.ph * 4); ctx.fillRect(x, y, 2.4, 2.4); }
      else { ctx.fillStyle = W.ash; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(x, y, q.r * 0.9, q.r * 0.55, q.ph + t * 0.6, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Mimo on hot stone: his paws glow and steam, the colour counts down with the heat ----------
  function drawHeat(ctx) {
    const p = api.p, v = api.L.volcano; if (!p || !v || v.heat <= 0.02 || api.state === 'dead') return;
    const W = api.W, h = v.heat, x = p.x + p.w / 2, y = p.y + p.h;
    glow(ctx, 'paws', x, y - 2, 20 + h * 14, h > 0.6 ? W.hotCrack : W.lavaTop, 0.35 + 0.45 * h);
    if (api.reduced) return;
    ctx.fillStyle = W.steam;
    for (let i = 0; i < 3; i++) {
      const k = (api.time * (1.2 + h * 2) + i / 3) % 1; ctx.globalAlpha = (1 - k) * (0.3 + 0.6 * h);
      ctx.beginPath(); ctx.arc(x - 8 + i * 8 + Math.sin(k * 6 + i) * 3, y - 6 - k * 26, 2.5 + k * 3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- decoration tiles: ash palm and crystals (no collision, never look like something to stand on) ----------
  function drawPalm(tx, ty, x, y, ctx) {
    // from the bare rock up (height band 3 and 4, volcano-ascent.js) the palms are dry (volcano-trail.js)
    const up = V().ascent && V().ascent.now();
    if (up && up.band >= 3 && V().trail) { V().trail.dryPalm(tx, ty, x, y, ctx); return; }
    const W = api.W, bx = x + 12, by = y + T, tipX = bx + 18, tipY = by - 84;
    ctx.strokeStyle = W.palmTrunk; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 2, by - 46, tipX, tipY); ctx.stroke();
    const sway = api.reduced ? 0 : Math.sin(api.time * 1.1 + tx) * 0.05;
    for (let i = 0; i < 5; i++) { const a = [-2.75, -2.1, -1.3, -0.6, 0.05][i]; ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(a + sway); ctx.fillStyle = i % 2 ? W.palmLeaf2 : W.palmLeaf; ctx.beginPath(); ctx.ellipse(24, 0, 25, 6.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function drawCrystal(tx, ty, x, y, ctx) {
    const W = api.W, h = api.hash(tx, ty + 3), by = y + T, col = h < 0.5 ? W.crystal : W.crystal2;
    ctx.fillStyle = col; ctx.strokeStyle = W.crystalInk; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const cx = x + 8 + i * 8, ht = [13, 20, 11][i] + h * 6, lean = (i - 1) * 3;
      ctx.beginPath(); ctx.moveTo(cx - 4, by); ctx.lineTo(cx - 3 + lean, by - ht + 4); ctx.lineTo(cx + lean, by - ht); ctx.lineTo(cx + 3 + lean, by - ht + 4); ctx.lineTo(cx + 4, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.fillRect(x + 15, by - 17, 2, 7); ctx.globalAlpha = 1;
  }
  // ---------- set pieces, level field decor: [{ k, x, y, ... }] in tiles (looks only, see world5-kit.md) ----------
  // boat (the beached boat of the arrival: a wooden hull drawn over solid tiles, its hold opens when Mimo is inside),
  // sinter (pale mineral crust on a terrace edge), nest (a ring of stones round a fire hopper's home in the lava),
  // rings (smoke rings out of a hole: somebody big sleeps below), glow (a warm light), smoke (puffs from a chimney).
  // A few rects and strokes each, culled to the camera, everything on the game clock.
  const DECOR = {
    light: { wood: '#A9805F', woodLite: '#C99D77', woodInk: '#76543E', hold: '#3B2A34', holdSeam: '#4A3641', sail: '#F6E9DA', sailPatch: '#F2A7BC',
      sinter: '#F2E8DC', sinterInk: '#D9C8B8', pool: '#BFE3F2', stone: '#3E3046', stoneLite: '#7C6A86', ring: '#E8DCEA' },
    dark: { wood: '#7E5E47', woodLite: '#9A7558', woodInk: '#54392A', hold: '#22171F', holdSeam: '#2F2129', sail: '#CFC3B5', sailPatch: '#C98597',
      sinter: '#CFC5BA', sinterInk: '#A99B8E', pool: '#8FBCD0', stone: '#251B2B', stoneLite: '#5C4C68', ring: '#BFB0C4' },
  };
  const decorOf = () => { const v = api.L && api.L.volcano, d = v && v.def && v.def.decor; return Array.isArray(d) ? d : null; };
  const dcol = () => DECOR[api.dark ? 'dark' : 'light'];
  const inRect = (r) => { const p = api.p; if (!p || !r) return false; const cx = (p.x + p.w / 2) / T, cy = (p.y + p.h / 2) / T; return cx > r[0] && cx < r[0] + r[2] && cy > r[1] && cy < r[1] + r[3]; };
  // boat { x, y, w, h, mast, top, hold: [x, y, w, h], leak: [x, y, w, h] }: hull from tile x to x + w (bow on the right),
  // deck on row y, keel at row y + h; the hold and the leak are empty tiles inside the hull
  function boatBack(ctx, d) {
    const k = dcol();
    for (const r of [d.hold, d.leak]) {
      if (!r || !seen(r[0] * T, r[1] * T, (r[0] + r[2]) * T, (r[1] + r[3]) * T)) continue;
      ctx.fillStyle = k.hold; ctx.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T);
      ctx.fillStyle = k.holdSeam; for (let yy = r[1] * T + 11; yy < (r[1] + r[3]) * T; yy += 12) ctx.fillRect(r[0] * T, yy, r[2] * T, 2);
    }
  }
  function hullPath(ctx, d) {
    const x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T;
    ctx.moveTo(x0 - 6, y0); ctx.lineTo(x1 + 14, y0 - 10); ctx.quadraticCurveTo(x1 + 6, y1 - 24, x1, y1); ctx.lineTo(x0 + 22, y1); ctx.quadraticCurveTo(x0 + 2, y1 - 6, x0 - 6, y0); ctx.closePath();
  }
  function rectPath(ctx, r) { ctx.moveTo(r[0] * T, r[1] * T); ctx.lineTo(r[0] * T, (r[1] + r[3]) * T); ctx.lineTo((r[0] + r[2]) * T, (r[1] + r[3]) * T); ctx.lineTo((r[0] + r[2]) * T, r[1] * T); ctx.closePath(); }
  function drawBoat(ctx, d) {
    const k = dcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T, top = (d.top != null ? d.top : d.y - 6) * T;
    if (!seen(x0 - 20, top - 20, x1 + 40, y1)) return;
    // mast, yard and a patched sail (behind the hull, in front of the sky)
    if (d.mast != null) {
      const mx = d.mast * T + T / 2, sway = api.reduced ? 0 : Math.sin(api.time * 0.9) * 3;
      ctx.fillStyle = k.woodInk; ctx.fillRect(mx - 4, top, 8, y0 - top);
      ctx.fillStyle = k.wood; ctx.fillRect(mx - 3, top, 4, y0 - top);
      ctx.fillStyle = k.woodInk; ctx.fillRect(mx - 34, top + 12, 68, 5);
      ctx.fillStyle = k.sail; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.moveTo(mx - 32, top + 17); ctx.lineTo(mx + 32, top + 17);
      ctx.quadraticCurveTo(mx + 40 + sway, top + 60, mx + 26 + sway, y0 - 30); ctx.lineTo(mx - 22 + sway, y0 - 26); ctx.quadraticCurveTo(mx - 20 + sway, top + 60, mx - 32, top + 17); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = k.sailPatch; ctx.fillRect(mx + 6 + sway * 0.5, top + 44, 14, 12);
      ctx.strokeStyle = k.woodInk; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(mx, top + 2); ctx.lineTo(x1 + 10, y0 - 8); ctx.moveTo(mx, top + 2); ctx.lineTo(x0, y0); ctx.stroke(); ctx.globalAlpha = 1;
    }
    const inside = inRect(d.hold) || inRect(d.leak);
    // the hull without the leak (and without the hold while Mimo is inside, so he sees the star)
    ctx.save(); ctx.beginPath(); hullPath(ctx, d); if (d.leak) rectPath(ctx, d.leak); if (d.hold && inside) rectPath(ctx, d.hold); ctx.clip('evenodd');
    ctx.fillStyle = k.wood; ctx.fillRect(x0 - 10, y0 - 12, x1 - x0 + 30, y1 - y0 + 14);
    ctx.fillStyle = k.woodInk; for (let yy = y0 + 14; yy < y1; yy += 14) ctx.fillRect(x0 - 10, yy, x1 - x0 + 30, 2);
    for (let xx = x0 + 40; xx < x1; xx += 92) ctx.fillRect(xx, y0 + 8, 2, y1 - y0);
    ctx.fillStyle = k.woodLite; ctx.fillRect(x0 - 10, y0 - 12, x1 - x0 + 30, 9);
    if (night() > 0) { ctx.fillStyle = api.W.seaNight; ctx.globalAlpha = night() * 0.45; ctx.fillRect(x0 - 10, y0 - 12, x1 - x0 + 30, y1 - y0 + 14); ctx.globalAlpha = 1; }
    ctx.restore();
    // the hold seen through the open side: faint planks over it while Mimo is inside
    if (inside && d.hold) { ctx.fillStyle = k.wood; ctx.globalAlpha = 0.18; ctx.fillRect(d.hold[0] * T, d.hold[1] * T, d.hold[2] * T, d.hold[3] * T); ctx.globalAlpha = 1; }
    // ragged edge of the leak
    if (d.leak) {
      const lx = d.leak[0] * T, ly = d.leak[1] * T, lw = d.leak[2] * T;
      ctx.fillStyle = k.woodInk; for (let i = 0; i < 4; i++) { const xx = lx + 4 + i * (lw - 8) / 3; ctx.beginPath(); ctx.moveTo(xx - 5, ly); ctx.lineTo(xx, ly + 7 + (i % 2) * 4); ctx.lineTo(xx + 5, ly); ctx.fill(); }
    }
  }
  // sinter { x, y, w }: the pale crust on the edge of a terrace (ground row y, w tiles), drips down its face
  function drawSinter(ctx, d) {
    const k = dcol(), x = d.x * T, y = d.y * T, w = d.w * T;
    if (!seen(x, y - 10, x + w, y + 30)) return;
    ctx.fillStyle = k.sinter; api.rr(x, y - 1, w, 8, 4); ctx.fill();
    ctx.fillStyle = k.sinterInk;
    for (let i = 0; i < d.w * 2; i++) { const h = api.hash(d.x * 2 + i, d.y), xx = x + 6 + i * 16 + h * 6, len = 6 + h * 14; api.rr(xx, y + 5, 5, len, 2.5); ctx.fill(); }
    ctx.fillStyle = k.pool; ctx.globalAlpha = 0.7; ctx.fillRect(x + 6, y + 1, w - 12, 2); ctx.globalAlpha = 1;
  }
  // nest { x, y }: stones round the home of a fire hopper (tile x, y = the hopper's cell in the top row of the lava)
  function drawNest(ctx, d) {
    const k = dcol(), cx = d.x * T + T / 2, sy = d.y * T + 8;
    if (!seen(cx - 40, sy - 20, cx + 40, sy + 20)) return;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (i / 6), r = 6 + api.hash(d.x + i, d.y) * 3, sx = cx - Math.cos(a) * 26, yy = sy + 2 - Math.sin(a) * 3;
      ctx.fillStyle = k.stone; ctx.beginPath(); ctx.ellipse(sx, yy, r, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = k.stoneLite; ctx.beginPath(); ctx.ellipse(sx - 1, yy - r * 0.35, r * 0.6, r * 0.25, 0, 0, TAU); ctx.fill();
    }
  }
  // rings { x, y }: smoke rings rising out of a hole in the ground top at tile x, row y, slow like breathing
  function drawRings(ctx, d) {
    const k = dcol(), cx = d.x * T + T / 2, by = d.y * T;
    if (!seen(cx - 60, by - 5 * T, cx + 60, by + 10)) return;
    glow(ctx, 'ringHole', cx, by, 22, api.W.lavaGlow, 0.45);
    ctx.fillStyle = api.W.thorn; api.rr(cx - 11, by - 2, 22, 6, 3); ctx.fill();
    if (api.reduced) return;
    ctx.strokeStyle = k.ring; ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      const q = ((api.time + i * 1.7) / 3.4) % 1, r = 6 + q * 16;
      ctx.globalAlpha = 0.75 * (1 - q); ctx.beginPath(); ctx.ellipse(cx + Math.sin(q * 3 + i) * 6, by - 8 - q * 4.5 * T, r, r * 0.38, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // glow { x, y, r }: a warm light (r in tiles), e.g. the fire inside an oven
  function drawGlowDecor(ctx, d) {
    const x = d.x * T + T / 2, y = d.y * T + T / 2, r = (d.r || 3) * T;
    if (!seen(x - r, y - r, x + r, y + r)) return;
    glow(ctx, 'decorGlow', x, y, r, api.W.lavaGlow, (d.a || 0.5) * (api.reduced ? 1 : 0.85 + 0.15 * Math.sin(api.time * 2.2 + d.x)));
  }
  // smoke { x, y }: grey puffs out of a chimney top at tile x, row y
  function drawSmoke(ctx, d) {
    const x = d.x * T + T / 2, y = d.y * T, t = api.reduced ? 0 : api.time;
    if (!seen(x - 80, y - 6 * T, x + 120, y + 10)) return;
    ctx.fillStyle = api.W.smokePuff;
    for (let i = 0; i < 4; i++) { const q = (t * 0.22 + i / 4) % 1; ctx.globalAlpha = 0.6 * (1 - q); ctx.beginPath(); ctx.arc(x + q * 50 + Math.sin(t + i) * 4, y - 6 - q * 4 * T, 8 + q * 18, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // bricks { x, y, w, h, face }: a built thing (an oven): behind its empty tiles a dark brick back wall, over its solid
  // tiles a warm brick tint with mortar seams (face: true = only the tint, for a rect that also holds sky; cover: true =
  // its empty tiles are walled up in front until Mimo is inside, like a drawer; rock: true = the front is plain basalt,
  // for a hidden cave, and nothing else of the rect is drawn); only the
  // tiles in view are drawn
  const BRICK = { light: { back: '#5A3843', backSeam: '#6E4651', tint: '#C0707A', seam: '#3E2A34' }, dark: { back: '#38222B', backSeam: '#462C36', tint: '#9A5560', seam: '#24161E' } };
  function eachBrick(d, f) {
    const cam = api.cam, v = api.view, x0 = Math.max(d.x, Math.floor(cam.x / T)), x1 = Math.min(d.x + d.w - 1, Math.floor((cam.x + v.w) / T));
    const y0 = Math.max(d.y, Math.floor(cam.y / T)), y1 = Math.min(d.y + d.h - 1, Math.floor((cam.y + v.h) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) f(tx, ty, tx * T, ty * T);
  }
  function seams(ctx, tx, ty, x, y) {
    ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x + ((ty % 2) ? 6 : 22), y, 2, 15); ctx.fillRect(x + ((ty % 2) ? 22 : 6), y + 17, 2, 15);
  }
  function bricksBack(ctx, d) {
    if (d.face || d.rock) return;
    const k = BRICK[api.dark ? 'dark' : 'light'];
    eachBrick(d, (tx, ty, x, y) => { if (api.isSolid(tx, ty)) return; ctx.fillStyle = k.back; ctx.fillRect(x, y, T, T); ctx.fillStyle = k.backSeam; seams(ctx, tx, ty, x, y); });
  }
  function bricksFront(ctx, d) {
    const k = BRICK[api.dark ? 'dark' : 'light'];
    // cover: the room is closed by a brick front until Mimo is inside it (then it is only a faint veil)
    if (d.cover) {
      const inside = inRect([d.x, d.y, d.w, d.h]);
      eachBrick(d, (tx, ty, x, y) => {
        if (api.isSolid(tx, ty)) return;
        ctx.globalAlpha = inside ? (d.rock ? 0.35 : 0.15) : 1; ctx.fillStyle = d.rock ? api.W.ground : k.tint; ctx.fillRect(x, y, T, T);
        if (d.rock) { const h = api.hash(tx, ty); if (h < 0.35) { ctx.fillStyle = api.W.groundDot; ctx.beginPath(); ctx.arc(x + 8 + h * 40, y + 10 + api.hash(ty, tx) * 14, 2.2, 0, TAU); ctx.fill(); } return; }
        ctx.fillStyle = k.seam; ctx.globalAlpha *= 0.5; seams(ctx, tx, ty, x, y);
      });
      ctx.globalAlpha = 1;
    }
    if (d.rock) return;
    eachBrick(d, (tx, ty, x, y) => {
      if (!api.isSolid(tx, ty) || api.tileAt(tx, ty) !== api.TILE.SOLID) return;
      ctx.fillStyle = k.tint; ctx.globalAlpha = 0.38; ctx.fillRect(x, y, T, T); ctx.globalAlpha = 0.5; ctx.fillStyle = k.seam; seams(ctx, tx, ty, x, y); ctx.globalAlpha = 1;
    });
  }
  const DECOR_BACK = { boat: boatBack, nest: drawNest, glow: drawGlowDecor, smoke: drawSmoke, bricks: bricksBack };
  const DECOR_MID = { boat: drawBoat, sinter: drawSinter, rings: drawRings, bricks: bricksFront };

  // ---------- more set pieces (block B: bridge, boiler hall, organ, lava fall cliff, chimney) ----------
  // wall { x, y, w, h }: dark rock behind the empty tiles of the rect (inside the mountain, a cliff face); only tiles in view
  // stone { x, y, w, h }: the solid tiles of the rect are cut stone (a bridge, a tower): a cool tint and block seams
  // arch { x, y, w, h }: a stone arch hanging under a deck (underside at row y, span w tiles, legs h tiles down), behind
  // pipe { pts: [[x, y], ...], r }: a thick copper pipe through tile centres, flanges at the bends, behind
  // gauge { x, y, s }: a pressure gauge on a wall, its needle trembles near the red, behind
  // boiler { x, y, w, h }: rivet bands over the hot tiles of a boiler, a whistle on top (whistle: tile x)
  // organ { x, y, w, h }: the case of an organ behind its pipes (arched frame, silver pipes, a rosette)
  // notes {}: music notes fly up wherever a basalt segment breaks (the organ plays)
  // print { x, y, dir }: a scorched footprint with three toes on the ground top at tile x, row y (somebody big walked here)
  const MORE = {
    light: { rock: '#46334E', crack: '#3A2A42', rockLite: '#54405C', stone: '#9A8FAA', seam: '#3E3046', arch: '#5B4766', archSeam: '#4A3954', archLite: '#76628A',
      pipe: '#8A5C55', pipeLite: '#A77A6E', pipeInk: '#5A3C3E', face: '#F3E9DC', brass: '#C9A15A', needle: '#3E2A34', red: '#E2654F',
      case: '#5E3F4A', caseLite: '#7A5562', silver: '#C2BBCF', silverInk: '#857D98', band: '#5A2E3C', rivet: '#E9B48F', soot: '#2C2236' },
    dark: { rock: '#2E2236', crack: '#241A2B', rockLite: '#382A41', stone: '#7A7090', seam: '#251B2B', arch: '#3F3149', archSeam: '#33273C', archLite: '#55466A',
      pipe: '#634046', pipeLite: '#7A5458', pipeInk: '#3E262C', face: '#D9CFC2', brass: '#A8844A', needle: '#2A1C24', red: '#C9563F',
      case: '#41292F', caseLite: '#583A43', silver: '#9C95AC', silverInk: '#655E76', band: '#3E1E28', rivet: '#C9937A', soot: '#18121E' },
  };
  const mcol = () => MORE[api.dark ? 'dark' : 'light'];
  function wallBack(ctx, d) {
    const k = mcol();
    eachBrick(d, (tx, ty, x, y) => {
      if (api.isSolid(tx, ty) || api.tileAt(tx, ty) === api.tileId(5, '~')) return;
      ctx.fillStyle = k.rock; ctx.fillRect(x, y, T, T);
      const h = api.hash(tx * 7 + 3, ty * 5 + 1);
      ctx.fillStyle = k.crack; if (h < 0.5) ctx.fillRect(x + 4 + h * 30, y + 6, 2, 12 + h * 10);
      ctx.fillStyle = k.rockLite; if (h > 0.7) { ctx.beginPath(); ctx.ellipse(x + 10 + (h - 0.7) * 50, y + 22, 6, 3, 0, 0, TAU); ctx.fill(); }
      const g = api.hash(tx * 3 + 11, ty * 2 + 7); if (g < 0.3) { ctx.fillStyle = k.crack; ctx.fillRect(x + g * 40, y + 26, 10 + g * 30, 2); }
    });
  }
  function stoneFront(ctx, d) {
    const k = mcol();
    eachBrick(d, (tx, ty, x, y) => {
      if (api.tileAt(tx, ty) !== api.TILE.SOLID) return;
      ctx.fillStyle = k.stone; ctx.globalAlpha = 0.22; ctx.fillRect(x, y, T, T);
      ctx.globalAlpha = 0.45; ctx.fillStyle = k.seam; ctx.fillRect(x, y + 31, T, 1); ctx.fillRect(x + ((tx + ty) % 2 ? 31 : 15), y + 8, 1, 23);
    });
    ctx.globalAlpha = 1;
  }
  function drawArch(ctx, d) {
    const k = mcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, h = (d.h || 3) * T, leg = Math.min(18, (x1 - x0) * 0.18);
    if (!seen(x0 - 10, y0, x1 + 10, y0 + h)) return;
    const r = (x1 - x0) / 2 - leg, cx = (x0 + x1) / 2, cy = y0 + Math.min(h - 10, r * 0.75 + 8);
    ctx.fillStyle = k.arch; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + h); ctx.lineTo(x1 - leg, y0 + h);
    ctx.lineTo(x1 - leg, cy); ctx.ellipse(cx, cy, r, Math.max(8, cy - y0 - 8), 0, 0, Math.PI, true); ctx.lineTo(x0 + leg, y0 + h); ctx.lineTo(x0, y0 + h); ctx.closePath(); ctx.fill();
    // voussoirs round the opening and courses on the legs
    ctx.strokeStyle = k.archLite; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, r + 2, Math.max(8, cy - y0 - 8) + 2, 0, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = k.archSeam; for (let yy = cy + 14; yy < y0 + h; yy += 16) { ctx.fillRect(x0, yy, leg, 2); ctx.fillRect(x1 - leg, yy, leg, 2); }
  }
  function drawPipe(ctx, d) {
    const k = mcol(), pts = d.pts, w = (d.r || 0.35) * T * 2; if (!pts || pts.length < 2) return;
    let xa = 1e9, ya = 1e9, xb = -1e9, yb = -1e9; for (const p of pts) { xa = Math.min(xa, p[0]); xb = Math.max(xb, p[0]); ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
    if (!seen(xa * T - 20, ya * T - 20, xb * T + 50, yb * T + 50)) return;
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0] * T + T / 2, pts[0][1] * T + T / 2); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * T + T / 2, pts[i][1] * T + T / 2); };
    ctx.strokeStyle = k.pipeInk; ctx.lineWidth = w + 4; path(); ctx.stroke();
    ctx.strokeStyle = k.pipe; ctx.lineWidth = w; path(); ctx.stroke();
    ctx.strokeStyle = k.pipeLite; ctx.lineWidth = w * 0.25; ctx.globalAlpha = 0.7; path(); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = k.pipeInk; for (const p of pts) { ctx.beginPath(); ctx.arc(p[0] * T + T / 2, p[1] * T + T / 2, w * 0.7, 0, TAU); ctx.fill(); }
  }
  function drawGauge(ctx, d) {
    const k = mcol(), s = d.s || 1, x = d.x * T + T / 2, y = d.y * T + T / 2, r = 13 * s;
    if (!seen(x - r - 4, y - r - 4, x + r + 4, y + r + 4)) return;
    ctx.fillStyle = k.brass; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.fill();
    ctx.fillStyle = k.face; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = k.red; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(x, y, r - 3 * s, -0.55, 0.35); ctx.stroke();
    const a = -0.9 + (api.reduced ? 0.6 : 0.6 + Math.sin(api.time * 2.3 + d.x) * 0.25 + Math.sin(api.time * 9 + d.y) * 0.05);
    ctx.strokeStyle = k.needle; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); ctx.stroke();
    ctx.fillStyle = k.needle; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
  }
  function boilerFront(ctx, d) {
    const k = mcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T;
    if (!seen(x0, y0 - 3 * T, x1, y1)) return;
    for (const f of [0.38, 0.72]) {
      const yy = Math.round(y0 + (y1 - y0) * f);
      ctx.fillStyle = k.band; ctx.globalAlpha = 0.7; ctx.fillRect(x0, yy, x1 - x0, 7); ctx.globalAlpha = 1;
      ctx.fillStyle = k.rivet; for (let xx = x0 + 10; xx < x1 - 4; xx += 22) { ctx.beginPath(); ctx.arc(xx, yy + 3.5, 2, 0, TAU); ctx.fill(); }
    }
    if (d.whistle == null) return;
    const wx = d.whistle * T + T / 2;
    ctx.fillStyle = k.brass; ctx.fillRect(wx - 5, y0 - 26, 10, 26); api.rr(wx - 9, y0 - 34, 18, 10, 4); ctx.fill();
    if (!api.reduced) { ctx.fillStyle = api.W.steam; for (let i = 0; i < 3; i++) { const q = (api.time * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.6 * (1 - q); ctx.beginPath(); ctx.arc(wx + q * 18, y0 - 38 - q * 40, 5 + q * 10, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  function drawOrgan(ctx, d) {
    const k = mcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T, cx = (x0 + x1) / 2;
    if (!seen(x0 - 10, y0 - 40, x1 + 10, y1)) return;
    ctx.fillStyle = k.case; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + 40); ctx.quadraticCurveTo(cx, y0 - 40, x1, y0 + 40); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = k.caseLite; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 + 6, y1); ctx.lineTo(x0 + 6, y0 + 42); ctx.quadraticCurveTo(cx, y0 - 30, x1 - 6, y0 + 42); ctx.lineTo(x1 - 6, y1); ctx.stroke();
    // silver pipes in the case, longest in the middle
    const n = Math.max(5, Math.floor(d.w * 1.2)), pw = (x1 - x0 - 24) / n;
    for (let i = 0; i < n; i++) {
      const u = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), top = y0 + 30 + u * u * 70, px = x0 + 12 + i * pw;
      ctx.globalAlpha = 0.5; ctx.fillStyle = k.silver; ctx.fillRect(px + 2, top, pw - 4, y0 + 150 - top);
      ctx.fillStyle = k.silverInk; ctx.fillRect(px + pw - 6, top, 2, y0 + 150 - top); ctx.beginPath(); ctx.moveTo(px + 2, top + 22); ctx.lineTo(px + pw / 2, top + 14); ctx.lineTo(px + pw - 2, top + 22); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = k.caseLite; ctx.beginPath(); ctx.arc(cx, y0 + 10, 12, 0, TAU); ctx.fill(); ctx.fillStyle = k.case; ctx.beginPath(); ctx.arc(cx, y0 + 10, 6, 0, TAU); ctx.fill();
  }
  function drawNotes(ctx) {
    const v = api.L.volcano; if (!v || !v.flight.length) return;
    const k = mcol();
    for (const f of v.flight) {
      const q = f.t / V().BASALT.FALL, x = f.x + T / 2 + Math.sin(f.t * 9 + f.x) * 6, y = f.y - 6 - q * 34;
      ctx.globalAlpha = 1 - q * 0.6; ctx.fillStyle = k.face; ctx.strokeStyle = k.face; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(x, y, 5, 3.6, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 4, y - 1); ctx.lineTo(x + 4, y - 15); ctx.quadraticCurveTo(x + 10, y - 12, x + 11, y - 6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawPrint(ctx, d) {
    const k = mcol(), x = d.x * T + T / 2, y = d.y * T, s = d.dir || 1;
    if (!seen(x - 50, y - 10, x + 50, y + 6)) return;
    ctx.fillStyle = k.soot; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 24, 4, 0, 0, TAU); ctx.fill();
    for (const o of [-1, 0, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 26 + o * 4, y + 1 + o * 0.5, 7, 2.5, o * 0.3, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = api.W.ember;
    if (!api.reduced) for (let i = 0; i < 3; i++) { const q = (api.time * 0.5 + i / 3) % 1; ctx.globalAlpha = 0.8 * (1 - q); ctx.fillRect(x - 12 + i * 12, y - 2 - q * 14, 2, 2); }
    ctx.globalAlpha = 1;
  }
  Object.assign(DECOR_BACK, { wall: wallBack, arch: drawArch, pipe: drawPipe, gauge: drawGauge, organ: drawOrgan });
  Object.assign(DECOR_MID, { stone: stoneFront, boiler: boilerFront, notes: drawNotes, print: drawPrint });
  // ---------- set pieces of block C (forge, crater, lair) ----------
  // anvil { x, y, w }: an iron anvil over the solid tiles of row y (horn on the left), its waist down to row y + 2
  // bellows { x, y, w, vent: [tx, ty] }: a leather bellows lying on the ground top at row y, it squeezes while that vent blows
  // chain { x, y, y1 }: an iron chain hanging from row y down to row y1 at tile column x (x may be fractional), a hook below
  // lair { x, y, w, h }: the dragon's cave mouth over the empty tiles of the rect: darkness, a warm glow deep inside, rock teeth
  // gate { x, y, w, h }: the lair door: a huge round-topped door of dark planks with iron bands and a ring, light under it
  // tail { x, y, dir, s }: the tip of a big tail lying on the ground top at tile x, row y, pointing dir (1 right, -1 left);
  //   it sways a little in its sleep. Nobody sees more of him than this.
  const FORGE = {
    light: { anvil: '#57506A', anvilLite: '#9C93B4', iron: '#3E3446', ironLite: '#6E6383', ironInk: '#251E2B', leather: '#8C5A4A', leatherInk: '#5E3A30', board: '#A9805F', boardInk: '#76543E',
      dark: '#1E1524', mouth: '#2E2236', tooth: '#5F4A68', plank: '#6A4A3E', plankInk: '#4A3029', band: '#3E3446', ringc: '#C9A15A',
      tail: '#8C4256', tailInk: '#5E2C3C', belly: '#F2B38C', spike: '#5A2A3C' },
    dark: { anvil: '#4A4360', anvilLite: '#8A80A6', iron: '#2C2434', ironLite: '#544A66', ironInk: '#18121E', leather: '#6A4236', leatherInk: '#432A22', board: '#7E5E47', boardInk: '#54392A',
      dark: '#140E18', mouth: '#221A29', tooth: '#4C3C56', plank: '#4E362D', plankInk: '#33221C', band: '#2C2434', ringc: '#A8844A',
      tail: '#6E3244', tailInk: '#47202E', belly: '#C98E6E', spike: '#42202D' },
  };
  const fcol = () => FORGE[api.dark ? 'dark' : 'light'];
  function drawAnvil(ctx, d) {
    const k = fcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T;
    if (!seen(x0 - 10, y0 - 10, x1 + 10, y0 + 3 * T)) return;
    const wl = x0 + (x1 - x0) * 0.3, wr = x1 - (x1 - x0) * 0.22;
    ctx.fillStyle = k.anvil; ctx.strokeStyle = k.anvilLite; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(x0 - 6, y0 + 2); ctx.lineTo(wl - 4, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + T); ctx.lineTo(wr, y0 + T + 2);
    ctx.lineTo(wr - 6, y0 + 2 * T); ctx.lineTo(wr + 4, y0 + 3 * T); ctx.lineTo(wl - 4, y0 + 3 * T); ctx.lineTo(wl + 6, y0 + 2 * T); ctx.lineTo(wl, y0 + T + 2);
    ctx.lineTo(x0, y0 + T); ctx.quadraticCurveTo(x0 - 4, y0 + 14, x0 - 6, y0 + 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = k.anvilLite; ctx.fillRect(wl - 2, y0, x1 - wl + 2, 4); ctx.beginPath(); ctx.moveTo(x0 - 6, y0 + 2); ctx.lineTo(wl, y0); ctx.lineTo(wl, y0 + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.ironInk; ctx.fillRect(x1 - 22, y0 + 6, 8, 6); ctx.fillRect(wl + 4, y0 + 2 * T + 2, wr - wl - 4, 3);
  }
  function drawBellows(ctx, d) {
    const k = fcol(), x0 = d.x * T, w = (d.w || 3) * T, gy = d.y * T;
    if (!seen(x0 - 10, gy - 2 * T, x0 + w + 40, gy)) return;
    let squeeze = 0;
    const v = api.L.volcano, vt = d.vent && v ? v.steam.find((s) => s.tx === d.vent[0] && s.ty === d.vent[1]) : null;
    if (vt) squeeze = vt.active ? Math.min(1, vt.k * 1.4) : 0;
    const h = 40 - 18 * squeeze, top = gy - 8 - h;
    ctx.fillStyle = k.boardInk; ctx.fillRect(x0, gy - 8, w, 8);
    ctx.fillStyle = k.leather; ctx.beginPath(); ctx.moveTo(x0 + 6, gy - 8); ctx.lineTo(x0 + w - 4, gy - 10); ctx.lineTo(x0 + w - 4, top + 6); ctx.lineTo(x0 + 6, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = k.leatherInk; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const yy = top + (gy - 8 - top) * i / 4; ctx.beginPath(); ctx.moveTo(x0 + 8, yy); ctx.lineTo(x0 + w - 6, yy + 1); ctx.stroke(); }
    ctx.fillStyle = k.board; ctx.save(); ctx.translate(x0, top); ctx.rotate(0.05 - 0.05 * squeeze); ctx.fillRect(-14, -7, w + 6, 8); ctx.fillStyle = k.boardInk; ctx.fillRect(-26, -5, 16, 4); ctx.restore();
    ctx.fillStyle = k.iron; ctx.beginPath(); ctx.moveTo(x0 + w - 4, gy - 30); ctx.lineTo(x0 + w + 26, gy - 16); ctx.lineTo(x0 + w + 26, gy - 10); ctx.lineTo(x0 + w - 4, gy - 12); ctx.closePath(); ctx.fill();
  }
  function drawChain(ctx, d) {
    const k = fcol(), x = d.x * T + T / 2, y0 = d.y * T, y1 = d.y1 * T;
    if (!seen(x - 10, y0, x + 10, y1 + 10)) return;
    ctx.strokeStyle = k.ironLite; ctx.lineWidth = 2.5;
    for (let y = y0, i = 0; y < y1 - 4; y += 10, i++) { ctx.beginPath(); if (i % 2) ctx.ellipse(x, y + 5, 1.5, 6, 0, 0, TAU); else ctx.ellipse(x, y + 5, 4, 6, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = k.iron; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y1 - 4); ctx.lineTo(x, y1); ctx.stroke();
  }
  function drawLair(ctx, d) {
    const k = fcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T, cx = (x0 + x1) / 2;
    if (!seen(x0 - 30, y0 - 3 * T, x1 + 30, y1 + 4)) return;
    ctx.fillStyle = k.mouth; ctx.beginPath(); ctx.moveTo(x0 - 10, y1); ctx.lineTo(x0 - 6, y0 + 20); ctx.quadraticCurveTo(cx, y0 - 26, x1 + 6, y0 + 20); ctx.lineTo(x1 + 10, y1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.dark; ctx.beginPath(); ctx.moveTo(x0 + 4, y1); ctx.lineTo(x0 + 6, y0 + 26); ctx.quadraticCurveTo(cx, y0 - 8, x1 - 6, y0 + 26); ctx.lineTo(x1 - 4, y1); ctx.closePath(); ctx.fill();
    glow(ctx, 'lairGlow', cx, y1 - 18, (d.w * 0.45) * T, api.W.lavaGlow, 0.35 * (api.reduced ? 1 : 0.8 + 0.2 * Math.sin(api.time * 0.9)));
    ctx.fillStyle = k.tooth;
    for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5, tx = x0 + 10 + u * (x1 - x0 - 20), ty = y0 + 14 + Math.abs(u - 0.5) * 30; ctx.beginPath(); ctx.moveTo(tx - 6, ty - 4); ctx.lineTo(tx, ty + 10 + (i % 2) * 6); ctx.lineTo(tx + 6, ty - 4); ctx.fill(); }
    ctx.strokeStyle = k.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x1 + 18 + i * 7, y0 + 10 + i * 3); ctx.lineTo(x1 + 12 + i * 7, y0 + 40 + i * 3); ctx.stroke(); }
  }
  function drawGate(ctx, d) {
    const k = fcol(), x0 = d.x * T, x1 = (d.x + d.w) * T, y0 = d.y * T, y1 = (d.y + d.h) * T, cx = (x0 + x1) / 2, r = (x1 - x0) / 2;
    if (!seen(x0 - 20, y0 - 20, x1 + 20, y1 + 10)) return;
    ctx.fillStyle = k.mouth; ctx.beginPath(); ctx.moveTo(x0 - 10, y1); ctx.lineTo(x0 - 10, y0 + r); ctx.arc(cx, y0 + r, r + 10, Math.PI, 0); ctx.lineTo(x1 + 10, y1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.plank; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + r); ctx.arc(cx, y0 + r, r, Math.PI, 0); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = k.plankInk; for (let xx = x0 + 22; xx < x1; xx += 24) ctx.fillRect(xx, y0, 3, y1 - y0);
    ctx.fillRect(cx - 2, y0, 4, y1 - y0);
    ctx.fillStyle = k.band; for (const f of [0.3, 0.68]) { const yy = y0 + (y1 - y0) * f; ctx.fillRect(x0, yy, x1 - x0, 9); ctx.fillStyle = k.ironLite; for (let xx = x0 + 10; xx < x1; xx += 26) { ctx.beginPath(); ctx.arc(xx, yy + 4.5, 2.2, 0, TAU); ctx.fill(); } ctx.fillStyle = k.band; }
    ctx.strokeStyle = k.plankInk; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x1 - 40 + i * 7, y0 + r * 0.7 + i * 2); ctx.lineTo(x1 - 52 + i * 7, y0 + r * 0.7 + 34 + i * 2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = k.ringc; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx + 22, y0 + (y1 - y0) * 0.5, 13, 0, TAU); ctx.stroke();
    ctx.fillStyle = api.W.lavaLine; ctx.globalAlpha = 0.55 + (api.reduced ? 0 : 0.2 * Math.sin(api.time * 1.1)); ctx.fillRect(x0 + 4, y1 - 3, x1 - x0 - 8, 3); ctx.globalAlpha = 1;
  }
  function drawTail(ctx, d) {
    const k = fcol(), s = d.s || 1, dir = d.dir || 1, bx = d.x * T + T / 2, by = d.y * T, len = 3 * T * s;
    if (!seen(bx - len - 20, by - 2 * T, bx + len + 20, by + 10)) return;
    const sway = api.reduced ? 0 : Math.sin(api.time * 0.7 + d.x) * 4 + Math.max(0, Math.sin(api.time * 0.37 + d.y) - 0.92) * 60;
    const ex = bx + dir * len, ey = by - 10 * s - sway, mx = bx + dir * len * 0.5, my = by - 2;
    const th = 13 * s;
    ctx.fillStyle = k.spike;
    for (let i = 1; i < 6; i++) { const u = i / 6, px = bx + (ex - bx) * u, py = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * my + u * u * ey - th * (1 - u * 0.6); ctx.beginPath(); ctx.moveTo(px - 6 * s, py + 3); ctx.lineTo(px + dir * 2, py - 9 * s * (1 - u * 0.4)); ctx.lineTo(px + 6 * s, py + 3); ctx.fill(); }
    ctx.lineCap = 'round';
    ctx.strokeStyle = k.tailInk; ctx.lineWidth = th * 2 + 3; ctx.beginPath(); ctx.moveTo(bx, by - th); ctx.quadraticCurveTo(mx, my - th, ex, ey); ctx.stroke();
    ctx.strokeStyle = k.tail; ctx.lineWidth = th * 2 - 1; ctx.beginPath(); ctx.moveTo(bx, by - th); ctx.quadraticCurveTo(mx, my - th, ex, ey); ctx.stroke();
    ctx.strokeStyle = k.belly; ctx.lineWidth = th * 0.5; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(bx, by - th * 0.35); ctx.quadraticCurveTo(mx, my - th * 0.4, ex - dir * 6, ey + th * 0.5); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = k.tail; ctx.strokeStyle = k.tailInk; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ex - dir * 2, ey - 12 * s); ctx.lineTo(ex + dir * 22 * s, ey); ctx.lineTo(ex - dir * 2, ey + 12 * s); ctx.lineTo(ex + dir * 5 * s, ey); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // riseglow { reach }: while the rising lava is still under the screen, the bottom of the screen glows warmer the closer
  // it comes (from reach tiles away, default 10), so a chase up a shaft is felt before the lava is in view
  function drawRiseGlow(ctx, d) {
    const y = V().riseY(); if (y == null) return;
    const cam = api.cam, vw = api.view, bottom = cam.y + vw.h, k = 1 - (y - bottom) / ((d.reach || 10) * T);
    if (y <= bottom + 50 || k <= 0) return;
    const dd = derived(); ctx.save(); ctx.translate(0, bottom); ctx.globalAlpha = Math.min(1, k) * 0.6;
    ctx.fillStyle = linear('riseHalo', -90, 0, dd.glow0, dd.glow1); ctx.fillRect(cam.x - 8, -90, vw.w + 16, 90); ctx.restore();
  }
  Object.assign(DECOR_BACK, { bellows: drawBellows, chain: drawChain, lair: drawLair, gate: drawGate, tail: drawTail });
  Object.assign(DECOR_MID, { riseglow: drawRiseGlow });
  Object.assign(DECOR_MID, { anvil: drawAnvil });
  function drawDecor(ctx, layer) {
    const list = decorOf(); if (!list) return;
    const table = layer === 'back' ? DECOR_BACK : DECOR_MID;
    for (const d of list) if (d && table[d.k]) table[d.k](ctx, d);
  }

  const tiles = {
    Y: { solid: false, lint: { name: 'Aschepalmen', color: '#7FA37A' }, draw: (tx, ty, x, y, ctx) => drawPalm(tx, ty, x, y, ctx || api.ctx) },
    C: { solid: false, lint: { name: 'Kristalle', color: '#FFCF8A' }, draw: (tx, ty, x, y, ctx) => drawCrystal(tx, ty, x, y, ctx || api.ctx) },
  };

  window.MimoVolcano = Object.assign(window.MimoVolcano || {}, { draw: { lava() {}, hot: drawHot, basalt: drawBasalt }, glow, rgba, linear, derived });

  window.MimoWorlds.register({
    world: 5,
    palette, nightBlend: 0.6, tiles,
    drawBackground, drawThorn, drawChase, drawAmbient,
    setup(a) { api = a; },
    drawTile,
    draw(layer, ctx) {
      if (!api.L || !api.L.volcano) return;
      if (layer === 'back') { drawLava(ctx); drawDecor(ctx, 'back'); }
      else if (layer === 'mid') { drawDecor(ctx, 'mid'); drawFlight(ctx); drawRise(ctx); }
      else if (layer === 'front') drawHeat(ctx);
    },
  });
})();
