// World 4 "Korallenküste": the picture. Sky with the sea at the horizon, sand, the water with light rays and little fish,
// the surface line, urchins (the thorns), jellyfish (the mushroom), currents and bubble swirls (wind and updraft under
// water), the ink cloud (the chase), Mimo's air bubble, and the decoration tiles palm "Y", coral "C", seaweed "W".
// Kept cheap for old iPhones: no shadowBlur, one gradient per frame for the water, everything culled to the camera.
// Design rule of the game: scenery soft, ground one clear mid tone, danger saturated (urchins, spikes, ink), gold only
// for things to collect. Decoration never looks like a platform or a hazard.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;

  const palette = {
    light: {
      skyTop: '#BFE8F3', skyBot: '#FFF4E0', hillFar: '#A6E0E4', hillNear: '#CFE9D6', cloud: '#FFFFFF', sun: '#FFF1BE',
      ground: '#F3DFB8', groundEdge: '#FDF2D9', groundDot: '#E3CB9C',
      sea: '#A6E0E4', seaLine: '#E6F8F6', island: '#CFE9D6', islandLeaf: '#A9D9BC', waterTop: '#79CCDA', waterDeep: '#3F8DBA', foam: '#FFFFFF', ray: '#FFFFFF', bubbleFill: 'rgba(255,255,255,0.20)', rideFill: 'rgba(255,255,255,0.32)',
      vent: '#D8C39C', ventInk: '#B39C74', crab: '#F28C82', crabInk: '#E0766E',
      fish: '#F6C3A2', fishBig: '#F4B08F', fishBelly: '#FFF1E6', danger: '#56428F', dangerBody: '#6F5AA6', dangerHi: '#9C88CF',
      wood: '#C99E78', woodEdge: '#E2BE98', woodInk: '#A97F5E',
      pole: '#E7CBA9', poleStripe: '#F2A7BC', markHigh: '#F2A98E', markLow: '#7FC8B4',
      ink: '#3B3560', inkLite: '#5A5189', jelly: '#F3A0BE', jellyLite: '#FFD6E4',
      palmTrunk: '#DDBB8C', palmLeaf: '#7CC49A', palmLeaf2: '#8FD0A6', coral1: '#F59CB0', coral2: '#F8B98E', coral3: '#C9B8EA', weed: '#7CC6A0', weed2: '#93D4AE', shell: '#F7C7B8', starfish: '#F4A98A',
      waterTopNight: '#4B86A6', waterDeepNight: '#24496E', seaNight: '#4F7B9A', islandNight: '#5E7E8C', islandLeafNight: '#6E9488',
    },
    dark: {
      skyTop: '#1B3442', skyBot: '#3A4256', hillFar: '#2C5966', hillNear: '#2E4A44', cloud: '#4A5870', sun: '#B9C9DA',
      ground: '#A39176', groundEdge: '#C2B091', groundDot: '#8C7B60',
      sea: '#2C5966', seaLine: '#4F8590', island: '#2E4A44', islandLeaf: '#3C6252', waterTop: '#2C7586', waterDeep: '#143A55', foam: '#DDF3F5', ray: '#DDF3F5', bubbleFill: 'rgba(221,243,245,0.16)', rideFill: 'rgba(221,243,245,0.26)',
      vent: '#75664A', ventInk: '#5A4C33', crab: '#E0837A', crabInk: '#BF6A62',
      fish: '#DDAB8E', fishBig: '#DC9C80', fishBelly: '#F1DCCB', danger: '#C9A2F5', dangerBody: '#A07FD8', dangerHi: '#E2CCFF',
      wood: '#8E6C52', woodEdge: '#B08A6C', woodInk: '#6F5240',
      pole: '#9C805F', poleStripe: '#C57890', markHigh: '#E0906F', markLow: '#6FB4A2',
      ink: '#100E22', inkLite: '#2B2650', jelly: '#E38FAE', jellyLite: '#F6C8D8',
      palmTrunk: '#9C8460', palmLeaf: '#4F8F6E', palmLeaf2: '#5FA07E', coral1: '#CC7C92', coral2: '#CF9874', coral3: '#9989C2', weed: '#4E9478', weed2: '#62A88A', shell: '#C99A8C', starfish: '#C98466',
      waterTopNight: '#1F5466', waterDeepNight: '#0E2A40', seaNight: '#1C3A4C', islandNight: '#1E3337', islandLeafNight: '#28433C',
    },
    // the clock darkens the sky towards these colours (and the sea with it, see waterCols)
    night: {
      light: { nightSkyTop: '#2C3C66', nightSkyBot: '#6E6A90', nightCloud: '#6C7298', nightSun: '#D7DCF2', nightHillFar: '#4F7B9A', nightHillNear: '#3E5E62' },
      dark: { nightSkyTop: '#111A30', nightSkyBot: '#2A2F48', nightCloud: '#2E3550', nightSun: '#8F99B8', nightHillFar: '#1C3A4C', nightHillNear: '#1F332E' },
    },
  };

  // water and sea follow the clock too (a little less than the sky); cached per palette object
  let colsFor = null, colsDeep = -1, cols = null;
  // a level may be deeper and darker: deep: 0..1 (level field, looks only; the water, the sand and the light rays get darker)
  const deepAmt = () => { const c = api.L && api.L.coast; return (c && c.def && c.def.deep) || 0; };
  function waterCols() {
    const W = api.W, d = deepAmt();
    if (colsFor === W && colsDeep === d && cols) return cols;
    const n = (W.night || 0) * 0.7, mix = (a, b) => (n > 0 ? api.mixHex(a, b, n) : a), dark = (a, b, k) => (d > 0 ? api.mixHex(a, b, k * d) : a);
    colsFor = W; colsDeep = d;
    cols = { top: dark(mix(W.waterTop, W.waterTopNight), '#1D5870', 0.6), deep: dark(mix(W.waterDeep, W.waterDeepNight), '#06182A', 0.9), sea: mix(W.sea, W.seaNight), island: mix(W.island, W.islandNight), leaf: mix(W.islandLeaf, W.islandLeafNight) };
    return cols;
  }
  // sand in the deep: under the water the ground turns a cool slate blue, lighter than the dark water so it still reads
  // as ground; the dry beach keeps its sand (cached per palette and depth)
  const SLATE = { light: ['#809EC2', '#ABC5E0', '#6B89AD'], dark: ['#4F6888', '#6D88A8', '#415974'] };
  let sandFor = null, sandDeep = -1, sandCols = null;
  function sandColors(wet) {
    const W = api.W, d = deepAmt(), dry = { ground: W.ground, edge: W.groundEdge, dot: W.groundDot };
    if (!(d > 0 && wet)) return dry;
    if (sandFor === W && sandDeep === d && sandCols) return sandCols;
    const sl = SLATE[api.dark ? 'dark' : 'light'], k = Math.min(1, 0.95 * d);
    sandFor = W; sandDeep = d;
    sandCols = { ground: api.mixHex(W.ground, sl[0], k), edge: api.mixHex(W.groundEdge, sl[1], k), dot: api.mixHex(W.groundDot, sl[2], k) };
    return sandCols;
  }
  const surf = () => (api.L && api.L.coast ? api.L.coast.surf : null);
  const wave = (x, t) => Math.sin(x / 52 * TAU + t * 1.1) * 2.2 + Math.sin(x / 23 * TAU - t * 1.7) * 0.6;
  const visibleCols = () => { const cam = api.cam, v = api.view; return [Math.max(0, Math.floor(cam.x / T)), Math.min(api.L.w - 1, Math.floor((cam.x + v.w) / T))]; };

  // ---------- background (screen space): sky, the open sea at the horizon, a far island ----------
  function drawBackground(ctx) {
    // the horizon follows the lowest water of the level (low tide, the level's own line, or the water now if a boss
    // lowers it further): then the far sea never shows in empty air above lowered water, and it does not bob with the tide
    const c = api.L.coast, now = surf(), lows = [now, c && c.tide ? c.tide.low * T : null, c ? c.base : null].filter((y) => y != null);
    const ref = lows.length ? Math.max(...lows) : null;
    const v = api.view, cam = api.cam, ss = (ref != null ? ref : (api.L.h - 3) * T) - cam.y;
    // the horizon sits a little above the water line and drifts slower than the level (it is far away)
    const hy = Math.round(ss * 0.85 - 6), wc = waterCols(), W = api.W;
    // only what can be seen is painted: the sky above the horizon, the sea down to the water of the level
    // (old phones pay for every covered pixel twice)
    if (hy < v.h) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.w, Math.max(0, hy + 1)); ctx.clip(); }
    if (hy > 0) api.drawSky();
    if (hy >= v.h) return;
    ctx.restore();
    const seaBottom = Math.min(v.h, now != null ? now - cam.y + 6 : v.h);
    // far island with a palm, slow parallax
    const span = 1500, ix = ((520 - cam.x * 0.12) % span + span) % span - 200;
    if (hy > -40) {
      ctx.fillStyle = wc.island; ctx.beginPath(); ctx.ellipse(ix, hy + 2, 74, 14, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = W.palmTrunk; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ix - 4, hy - 9); ctx.quadraticCurveTo(ix - 2, hy - 22, ix + 4, hy - 30); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = wc.leaf; for (const a of [-2.6, -1.9, -1.1, -0.4]) { ctx.beginPath(); ctx.ellipse(ix + 4 + Math.cos(a) * 9, hy - 30 + Math.sin(a) * 4, 10, 3.5, a, 0, TAU); ctx.fill(); }
    }
    const top = Math.max(0, hy);
    if (seaBottom > top) { ctx.fillStyle = wc.sea; ctx.fillRect(0, top, v.w, seaBottom - top); }
    ctx.fillStyle = W.seaLine; ctx.globalAlpha = 0.8; if (hy >= 0) ctx.fillRect(0, hy, v.w, 2); ctx.globalAlpha = 0.5;
    // calm white streaks on the open sea
    for (let i = 0; i < 12; i++) {
      const wx = ((api.hash(i, 4) * 1600 - cam.x * 0.2) % 1600 + 1600) % 1600 - 100, wy = hy + 8 + api.hash(i, 9) * Math.min(60, v.h - hy - 8);
      if (wy < seaBottom - 6) ctx.fillRect(Math.round(wx), Math.round(wy), 18 + api.hash(i, 1) * 22, 2);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- the water body (world space, behind the tiles) ----------
  function drawWater(ctx) {
    const s = surf(); if (s == null) return;
    const cam = api.cam, v = api.view, t = api.time, x0 = Math.floor(cam.x / 8) * 8 - 8, x1 = cam.x + v.w + 8, bottom = cam.y + v.h + 4;
    if (s > bottom) return;
    const wc = waterCols(), g = ctx.createLinearGradient(0, s, 0, s + (deepAmt() > 0 ? 16 : 10) * T);
    g.addColorStop(0, wc.top); g.addColorStop(1, wc.deep);
    // the body is a plain rectangle (cheap to fill on old phones), only a thin strip at the top follows the waves
    const top = Math.max(s + 3, cam.y - 2);
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bottom - top);
    if (s + 3 > cam.y - 4) {
      ctx.beginPath(); ctx.moveTo(x0, s + 3.5);
      for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, s + wave(x, t));
      ctx.lineTo(x1, s + 3.5); ctx.closePath(); ctx.fill();
    }
    drawRays(ctx, s, x0, x1, t);
    drawFishSchool(ctx, s, x0, x1, t);
  }
  // light from the surface: a few slanted soft bands that sway
  function drawRays(ctx, s, x0, x1, t) {
    if (s + 20 < api.cam.y - 200) return;
    ctx.fillStyle = api.W.ray;
    for (let k = Math.floor(x0 / 230) - 1; k <= Math.ceil(x1 / 230) + 1; k++) {
      const h = api.hash(k, 21), x = k * 230 + h * 90 + (api.reduced ? 0 : Math.sin(t * 0.35 + k) * 14), w = 18 + h * 18, len = 170 + h * 70;
      ctx.globalAlpha = (0.07 + h * 0.04) * (1 - 0.75 * deepAmt()); ctx.beginPath(); ctx.moveTo(x, s); ctx.lineTo(x + w, s); ctx.lineTo(x + w - len * 0.32, s + len); ctx.lineTo(x - len * 0.32 - w * 0.6, s + len); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // small pale fish far in the back, only where there is open water
  function drawFishSchool(ctx, s, x0, x1, t) {
    const L = api.L, depth = L.h * T - s; if (depth < 2 * T) return;
    ctx.fillStyle = api.W.foam;
    for (let k = Math.floor(x0 / 150) - 1; k <= Math.ceil(x1 / 150) + 1; k++) {
      const h = api.hash(k, 33); if (h > 0.6) continue;
      const sw = api.reduced ? 0 : Math.sin(t * 0.22 + k * 1.7), dir = Math.cos(t * 0.22 + k * 1.7) >= 0 ? 1 : -1;
      const x = k * 150 + api.hash(k, 3) * 80 + sw * 46, y = s + 40 + api.hash(k, 7) * Math.min(depth - 70, 6 * T) + Math.sin(t * 0.8 + k) * 3;
      if (api.isSolid(Math.floor(x / T), Math.floor(y / T)) || api.isSolid(Math.floor((x + 14 * dir) / T), Math.floor(y / T))) continue;
      ctx.globalAlpha = 0.42; ctx.beginPath(); ctx.ellipse(x, y, 7.5, 3.4, 0, 0, TAU); ctx.moveTo(x - 6 * dir, y); ctx.lineTo(x - 12 * dir, y - 4); ctx.lineTo(x - 12 * dir, y + 4); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // the clear animated surface line over the open water (front layer, over Mimo, so he sits in the water)
  function drawSurface(ctx) {
    const s = surf(); if (s == null) return;
    const cam = api.cam, v = api.view, t = api.time; if (s < cam.y - 10 || s > cam.y + v.h + 10) return;
    const [c0, c1] = visibleCols(), ty = Math.floor(s / T), ink = inkEdge(s) + 1;
    ctx.strokeStyle = api.W.foam; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.95;
    ctx.beginPath();
    let open = false;
    for (let tx = c0; tx <= c1 + 1; tx++) {
      const wet = tx <= c1 && !api.isSolid(tx, ty);
      if (wet) for (let x = tx * T + (open ? 4 : 0); x <= tx * T + T; x += 4) { if (x < ink) continue; const y = s + wave(x, t); if (!open) { ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y); }
      else open = false;
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  // Mimo breathes in a bubble while his head is under water
  function drawAirBubble(ctx) {
    const p = api.p, s = surf();
    if (!p || s == null || api.state === 'dead' || api.state === 'win' || p.y + 5 < s) return;
    const x = p.x + p.w / 2, y = p.y + p.h / 2 - 1, r = 19;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = api.W.bubbleFill; ctx.fill();
    ctx.strokeStyle = api.W.foam; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.95; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, -2.55, -1.75); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------- tiles ----------
  // a level may dress some of its solid tiles as ship planks: wood: [[x, y, w, h], ...] in tiles (looks only)
  function isWood(tx, ty) {
    const c = api.L && api.L.coast, list = c && c.def && c.def.wood;
    if (!list) return false;
    for (const r of list) if (tx >= r[0] && tx < r[0] + r[2] && ty >= r[1] && ty < r[1] + r[3]) return true;
    return false;
  }
  function drawPlank(tx, ty, x, y, ctx) {
    const W = api.W, SOLID = api.TILE.SOLID, up = api.tileAt(tx, ty - 1) === SOLID, h = api.hash(tx, ty);
    ctx.fillStyle = W.wood; ctx.fillRect(x, y, T, T + (api.tileAt(tx, ty + 1) === SOLID ? 1 : 0));
    ctx.fillStyle = W.woodInk; ctx.fillRect(x, y + 15, T, 2);
    if (!up) { ctx.fillStyle = W.woodEdge; ctx.fillRect(x, y, T, 5); }
    ctx.fillRect(x + (h < 0.5 ? 9 : 21), y + 8, 3, 3); ctx.fillRect(x + (h < 0.5 ? 22 : 8), y + 24, 3, 3);
    if (api.tileAt(tx - 1, ty) !== SOLID || !isWood(tx - 1, ty)) { ctx.fillStyle = W.woodInk; ctx.fillRect(x, y, 2, T); }
    if (api.tileAt(tx + 1, ty) !== SOLID || !isWood(tx + 1, ty)) { ctx.fillStyle = W.woodInk; ctx.fillRect(x + T - 2, y, 2, T); }
  }
  // and some as white-washed masonry (a lighthouse): stone: [[x, y, w, h, 'red'?], ...]; 'red' paints a pastel band
  const STONE = { light: { white: ['#F7F0E6', '#FFFFFF', '#DCCFBE'], red: ['#EFA493', '#F8C3B5', '#D48978'] }, dark: { white: ['#B9B1A6', '#D0C9BF', '#978E84'], red: ['#BE7D6F', '#D69B8D', '#9E6457'] } };
  function stoneAt(tx, ty) {
    const c = api.L && api.L.coast, list = c && c.def && c.def.stone;
    if (!list) return null;
    let hit = null;
    for (const r of list) if (tx >= r[0] && tx < r[0] + r[2] && ty >= r[1] && ty < r[1] + r[3]) hit = r[4] === 'red' ? 'red' : 'white';
    return hit;
  }
  function drawStone(tx, ty, x, y, look, ctx) {
    const SOLID = api.TILE.SOLID, c = STONE[api.dark ? 'dark' : 'light'][look], up = api.tileAt(tx, ty - 1) === SOLID;
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, T, T + (api.tileAt(tx, ty + 1) === SOLID ? 1 : 0));
    ctx.fillStyle = c[2]; ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x + (ty % 2 ? 6 : 22), y, 2, 15); ctx.fillRect(x + (ty % 2 ? 22 : 6), y + 17, 2, 15);
    if (!up) { ctx.fillStyle = c[1]; ctx.fillRect(x, y, T, 5); }
  }
  function drawSand(tx, ty, x, y, ctx) {
    if (isWood(tx, ty)) { drawPlank(tx, ty, x, y, ctx); return; }
    const look = stoneAt(tx, ty); if (look) { drawStone(tx, ty, x, y, look, ctx); return; }
    const W = api.W, SOLID = api.TILE.SOLID, s = surf(), wet = s != null && y > s + 4, sc = sandColors(wet);
    ctx.fillStyle = sc.ground; ctx.fillRect(x, y, T, T + (api.tileAt(tx, ty + 1) === SOLID ? 1 : 0));
    const above = api.tileAt(tx, ty - 1), up = above === SOLID, left = api.tileAt(tx - 1, ty) === SOLID, right = api.tileAt(tx + 1, ty) === SOLID;
    if (!up) {
      ctx.fillStyle = sc.edge; api.rr(x - (left ? 2 : 0), y, T + (left ? 2 : 0) + (right ? 2 : 0), 7, left && right ? 0 : 4); ctx.fill();
      if (above === api.TILE.EMPTY) topDetail(tx, ty, x, y, wet, ctx);
    } else {
      const h = api.hash(tx, ty);
      if (h < 0.35) { ctx.fillStyle = sc.dot; ctx.beginPath(); ctx.arc(x + 8 + h * 40, y + 10 + api.hash(ty, tx) * 14, 2.2, 0, TAU); ctx.fill(); }
    }
  }
  // tiny things on the sand, low and soft: shells and starfish on the beach, a tuft of seaweed or a pebble under water
  function topDetail(tx, ty, x, y, wet, ctx) {
    const W = api.W, h = api.hash(tx * 3 + 1, ty);
    if (h > 0.34) return;
    const px = x + 7 + h * 50;
    if (wet) {
      if (h < 0.17) { ctx.strokeStyle = h < 0.08 ? W.weed : W.weed2; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); for (const d of [-3, 2]) { ctx.moveTo(px + d, y + 1); ctx.quadraticCurveTo(px + d + Math.sin(api.time * 1.3 + tx) * 3, y - 6, px + d + 1, y - 10 - h * 20); } ctx.stroke(); }
      else { ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.ellipse(px, y + 1, 4, 2.4, 0, 0, TAU); ctx.fill(); }
      return;
    }
    if (h < 0.12) { // starfish
      ctx.fillStyle = W.starfish; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + h * 4, r = i % 2 ? 1.6 : 4.2; ctx.lineTo(px + Math.cos(a) * r, y + 1.5 + Math.sin(a) * r * 0.55); }
      ctx.closePath(); ctx.fill();
    } else { ctx.fillStyle = W.shell; ctx.beginPath(); ctx.ellipse(px, y + 1, 4.5, 2.6, 0, Math.PI, 0); ctx.fill(); }
  }
  // wind under water is a current: soft white streams with a few bubbles
  function drawCurrent(tx, ty, x, y, dir, ctx) {
    if (api.reduced) return;
    // on some tiles a soft stream, brighter at its head with a small tip, so even a still picture shows where it flows
    const h = api.hash(tx, ty * 5); if (h > 0.4) return;
    const ph = (api.time * 1.2 + h * 1.7) % 1, len = 14 + h * 8, a = 0.6 * Math.sin(ph * Math.PI);
    const sx = x + (dir > 0 ? ph : 1 - ph) * (T + len) - (dir > 0 ? len : 0), sy = y + 6 + api.hash(ty, tx) * 20, hx = sx + len * dir;
    ctx.strokeStyle = api.W.foam; ctx.lineCap = 'round';
    ctx.globalAlpha = a * 0.45; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + len * dir * 0.3, sy - 2, sx + len * dir * 0.6, sy - 1); ctx.stroke();
    ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + len * dir * 0.6, sy - 1); ctx.lineTo(hx, sy); ctx.stroke();
    ctx.globalAlpha = a * 0.8; ctx.beginPath(); ctx.moveTo(hx - 3 * dir, sy - 2.6); ctx.lineTo(hx, sy); ctx.lineTo(hx - 3 * dir, sy + 2.6); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // timed thorns of this world: urchin spines that come out of a hole in a stone, in the urchin colours
  function drawTimedUrchin(tx, ty, x, y, ctx) {
    const W = api.W, e = api.thornExt(tx, ty);
    ctx.fillStyle = W.vent; api.rr(x + 2, y + T - 7, T - 4, 7, 3.5); ctx.fill();
    ctx.fillStyle = W.ventInk; api.rr(x + 7, y + T - 6, T - 14, 3, 1.5); ctx.fill();
    if (e <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, T, T - 5); ctx.clip();
    const off = (1 - e) * (T - 6), base = y + T - 4 + off, tip = y + 9 + off;
    ctx.fillStyle = W.dangerBody; ctx.strokeStyle = W.danger; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const bx = x + i * (T / 3); ctx.moveTo(bx + 2, base); ctx.lineTo(bx + T / 6, tip); ctx.lineTo(bx + T / 3 - 2, base); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // the updraft: a vent of sand-stone; under water a swirl of bubbles, above water a little spray
  function drawSwirl(tx, ty, x, y, ctx) {
    const W = api.W, s = surf(), wet = s != null && y + T / 2 > s;
    if (api.tileAt(tx, ty + 1) !== api.TILE.UPDRAFT) { ctx.fillStyle = W.vent; api.rr(x + 3, y + T - 8, T - 6, 8, 4); ctx.fill(); ctx.fillStyle = W.ventInk; api.rr(x + 10, y + T - 10, T - 20, 5, 2.5); ctx.fill(); }
    if (api.reduced) return;
    ctx.strokeStyle = W.foam; ctx.fillStyle = W.foam; ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      const ph = (api.time * 1.1 + api.hash(tx + i, ty * 3)) % 1, a = api.time * 4 + i * 2.1 + ty;
      const px = x + T / 2 + Math.sin(a) * 9, py = y + T - ph * T;
      ctx.globalAlpha = 0.7 * Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.arc(px, py, wet ? 2 + api.hash(i, tx) * 1.6 : 1.5, 0, TAU);
      if (wet) ctx.stroke(); else ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawTile(t, tx, ty, x, y, ctx) {
    const TL = api.TILE;
    if (t === TL.SOLID) { drawSand(tx, ty, x, y, ctx); return true; }
    if (t === TL.UPDRAFT) { drawSwirl(tx, ty, x, y, ctx); return true; }
    if (t === TL.TTHORN) { drawTimedUrchin(tx, ty, x, y, ctx); return true; }
    if (t === TL.WIND_R || t === TL.WIND_L) {
      const s = surf(); if (s == null || y + T / 2 < s) return false;
      drawCurrent(tx, ty, x, y, t === TL.WIND_R ? 1 : -1, ctx); return true;
    }
    return false;
  }

  // ---------- urchins (the thorns of this world): a dark violet half ball with long spines ----------
  const HALO = '#F1E8FF';
  function drawThorn(tx, ty, x, y, dir) {
    const ctx = api.ctx, W = api.W, h = api.hash(tx, ty * 7), r = 9 + h * 2, cx = x + T / 2 + (h - 0.5) * 4, base = dir > 0 ? y + T : y, len = 17 + h * 2;
    // under water in the light scheme the dark violet sinks into the deep blue (worst at night): a pale rim round spines and body
    const s = surf(), halo = !api.dark && s != null && base >= s;
    const spines = () => { ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, ox = Math.cos(a), oy = Math.sin(a) * dir; ctx.moveTo(cx + ox * r * 0.5, base + oy * r * 0.5); ctx.lineTo(cx + ox * len, base + oy * len); } ctx.stroke(); };
    ctx.lineCap = 'round';
    if (halo) { ctx.strokeStyle = HALO; ctx.globalAlpha = 0.7; ctx.lineWidth = 5.2; spines(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = W.danger; ctx.lineWidth = 2.2; spines();
    if (halo) { ctx.fillStyle = HALO; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(cx, base, r + 2, dir > 0 ? Math.PI : 0, dir > 0 ? 0 : Math.PI); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = W.dangerBody; ctx.beginPath(); ctx.arc(cx, base, r, dir > 0 ? Math.PI : 0, dir > 0 ? 0 : Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.dangerHi; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(cx - r * 0.3, base - dir * r * 0.5, r * 0.32, r * 0.18, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }

  // ---------- jellyfish (the mushroom): a soft pink dome with wavy arms, squashes when Mimo bounces ----------
  function drawMushroom(mu, x, y, ctx) {
    const skin = window.MimoCoast.jellySkin; if (skin && skin(mu, x, y, ctx)) return;
    const W = api.W, sq = mu.squash, t = api.time, bob = api.reduced ? 0 : Math.sin(t * 2.2 + mu.x) * 1.5;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(1 + sq * 0.3, 1 - sq * 0.35);
    ctx.strokeStyle = W.jelly; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const bx = -9 + i * 6; ctx.moveTo(bx, -14); for (let k = 1; k <= 3; k++) ctx.lineTo(bx + Math.sin(t * 3 + i + k) * 2, -14 + k * 4.2); }
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = W.jelly; ctx.beginPath(); ctx.ellipse(0, -15, 15, 12, 0, Math.PI, 0);
    for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(-15 + i * 7.5 + 3.75, -11, -15 + i * 7.5, -15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.jellyLite; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(-5, -21, 4.5, 2.6, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -23, 1.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = api.P.mimoInk; ctx.beginPath(); ctx.arc(-4, -16, 1.3, 0, TAU); ctx.arc(4, -16, 1.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- the ink cloud (the chase): a dark mass with a billowing front and two big octopus eyes ----------
  function drawChase(c, ctx) {
    const W = api.W, x = c.x, t = api.time, cam = api.cam, v = api.view, top = cam.y - 60, bottom = cam.y + v.h + 60;
    ctx.fillStyle = W.ink; ctx.globalAlpha = 0.97;
    ctx.beginPath(); ctx.moveTo(Math.min(x - 40, cam.x - 20), top);
    for (let y = top; y <= bottom; y += 18) ctx.lineTo(inkSide(x, t, y), y);
    ctx.lineTo(Math.min(x - 40, cam.x - 20), bottom); ctx.closePath(); ctx.fill();
    // billows along the front
    for (let k = Math.floor(top / 46); k * 46 < bottom; k++) { const b = billow(x, t, k); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = W.inkLite; ctx.globalAlpha = 0.5;
    for (let k = 0; k < 7; k++) { const y = cam.y + api.hash(k, 2) * v.h, sx = x - 60 - api.hash(k, 6) * 140 + Math.sin(t + k) * 10; ctx.beginPath(); ctx.ellipse(sx, y, 26 + api.hash(k, 8) * 20, 12, Math.sin(t * 0.5 + k) * 0.3, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    drawInkEyes(ctx, x, t);
  }
  const inkSide = (x, t, y) => x - 26 + Math.sin(t * 2.4 + y * 0.045) * 9 + Math.sin(t * 1.3 + y * 0.11) * 5;
  function billow(x, t, k) { const r = 22 + api.hash(k, 5) * 14 + Math.sin(t * 3 + k * 2) * 3; return { x: x - 18 - r * 0.45 + Math.sin(t * 2 + k) * 5, y: k * 46 + Math.sin(t * 1.7 + k) * 6, r }; }
  // the right edge of the ink at height y, so the surface line (drawn later, in front) starts where the ink ends
  function inkEdge(y) {
    const c = api.L && api.L.chase; if (!c) return -Infinity;
    const t = api.time; let e = inkSide(c.x, t, y);
    for (let k = Math.floor((y - 60) / 46); k * 46 <= y + 60; k++) { const b = billow(c.x, t, k), d = y - b.y; if (Math.abs(d) < b.r) e = Math.max(e, b.x + Math.sqrt(b.r * b.r - d * d)); }
    return e;
  }
  function drawInkEyes(ctx, x, t) {
    const p = api.p, cam = api.cam, v = api.view, ey = Math.max(cam.y + 70, Math.min(cam.y + v.h - 60, p ? p.y + 6 : cam.y + v.h / 2)), ex = x - 52;
    const blink = (t % 4.3) < 0.12 ? 0.15 : 1;
    for (const dx of [-17, 17]) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex + dx, ey, 11, 14 * blink, 0, 0, TAU); ctx.fill();
      if (blink < 1) continue;
      const lx = p ? Math.max(-4, Math.min(4, (p.x - ex) / 30)) : 3, ly = p ? Math.max(-5, Math.min(5, (p.y + 10 - ey) / 30)) : 0;
      ctx.fillStyle = '#1B1830'; ctx.beginPath(); ctx.arc(ex + dx + lx, ey + ly + 2, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex + dx + lx + 1.8, ey + ly, 1.8, 0, TAU); ctx.fill();
    }
    // grumpy brows, so the cloud reads as someone, not as weather
    ctx.strokeStyle = api.W.inkLite; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(ex - 28, ey - 20); ctx.lineTo(ex - 8, ey - 15); ctx.moveTo(ex + 28, ey - 20); ctx.lineTo(ex + 8, ey - 15); ctx.stroke();
  }

  // ---------- floating bits: dust in the air, tiny bubbles in the water (world space) ----------
  function drawAmbient(ctx) {
    const L = api.L, cam = api.cam, v = api.view, t = api.time, s = surf(), H = L.h * T;
    ctx.strokeStyle = api.W.foam; ctx.fillStyle = api.W.foam; ctx.lineWidth = 1;
    for (const q of L.pollen) {
      const x = q.x + Math.sin(t * 0.4 + q.ph) * 16;
      if (x < cam.x - 10 || x > cam.x + v.w + 10) continue;
      const wet = s != null && q.y > s + 10;
      const y = wet ? s + 10 + ((((q.y - s - 10) - t * (10 + q.sp)) % (H - s)) + (H - s)) % (H - s) : (q.y + t * q.sp * 0.5) % H;
      if (y < cam.y - 10 || y > cam.y + v.h + 10 || (!wet && s != null && y > s)) continue;
      ctx.globalAlpha = wet ? 0.45 : 0.3; ctx.beginPath(); ctx.arc(x, y, wet ? q.r * 0.9 : q.r, 0, TAU);
      if (wet) ctx.stroke(); else ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- decoration tiles: palm, coral, seaweed (no collision, never look like something to stand on) ----------
  function drawPalm(tx, ty, x, y, ctx) {
    const W = api.W, bx = x + 12, by = y + T, tipX = bx + 22, tipY = by - 92;
    ctx.strokeStyle = W.palmTrunk; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 4, by - 50, tipX, tipY); ctx.stroke();
    const sway = api.reduced ? 0 : Math.sin(api.time * 1.1 + tx) * 0.04;
    [-2.75, -2.15, -1.3, -0.55, 0.1].forEach((a, i) => { ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(a + sway); ctx.fillStyle = i % 2 ? W.palmLeaf2 : W.palmLeaf; ctx.beginPath(); ctx.ellipse(26, 0, 27, 7.5, 0, 0, TAU); ctx.fill(); ctx.restore(); });
    ctx.fillStyle = W.palmTrunk; ctx.beginPath(); ctx.arc(tipX - 3, tipY + 6, 4.5, 0, TAU); ctx.arc(tipX + 6, tipY + 7, 4.5, 0, TAU); ctx.fill();
  }
  function drawCoral(tx, ty, x, y, ctx) {
    const W = api.W, h = api.hash(tx, ty + 11), col = [W.coral1, W.coral2, W.coral3][Math.floor(h * 3)], s = 0.55 + h * 0.4, bx = x + T / 2, by = y + T;
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    const br = (x1, y1, x2, y2, w) => { ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(bx + x1 * s, by + y1 * s); ctx.lineTo(bx + x2 * s, by + y2 * s); ctx.stroke(); };
    br(0, 0, 0, -30, 8); br(0, -14, -14, -30, 7); br(-14, -30, -14, -42, 7); br(0, -20, 13, -34, 7); br(13, -34, 13, -48, 7); br(0, -30, 0, -52, 7); br(-14, -34, -22, -40, 4.5); br(13, -40, 21, -46, 4.5);
  }
  function drawWeed(tx, ty, x, y, ctx) {
    const W = api.W, t = api.reduced ? 0 : api.time;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;
    for (let i = 0; i < 2; i++) {
      const h = 34 + api.hash(tx + i, ty) * 34, bx = x + 9 + i * 13, ph = api.hash(tx, i) * 6;
      ctx.strokeStyle = i ? W.weed2 : W.weed; ctx.beginPath(); ctx.moveTo(bx, y + T);
      for (let k = 1; k <= 8; k++) { const f = k / 8; ctx.lineTo(bx + Math.sin(f * 4 + t * 1.4 + ph) * 6 * f, y + T - h * f); }
      ctx.stroke();
    }
  }
  // a wooden post under a pier or a boardwalk ("H", looks only): a round pole through the whole tile, darker at the
  // bottom of a stack, so a row of them reads as piles standing in the sand or the water
  function drawPost(tx, ty, x, y, ctx) {
    const W = api.W, bottom = api.tileAt(tx, ty + 1) !== api.tileAt(tx, ty);
    // under a board the pole reaches up to the plank (a board is drawn in the top third of its tile)
    const top = api.tileAt(tx, ty - 1) === api.TILE.ONEWAY ? y - T + 10 : y;
    ctx.fillStyle = W.woodInk; ctx.fillRect(x + 10, top, 12, y + T - top);
    ctx.fillStyle = W.wood; ctx.fillRect(x + 12, top, 7, y + T - top);
    if (bottom) { ctx.fillStyle = W.woodInk; api.rr(x + 9, y + T - 5, 14, 5, 2); ctx.fill(); }
  }
  // a pennant on a stick ("!", looks only): stands on the tile below, for tower tops and the end of a jetty
  function drawPennant(tx, ty, x, y, ctx) {
    const W = api.W, bx = x + 10, by = y + T, top = y + 2, wave = api.reduced ? 0 : Math.sin(api.time * 3 + tx) * 2.5;
    ctx.strokeStyle = W.woodInk; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, top); ctx.stroke();
    ctx.fillStyle = W.poleStripe; ctx.beginPath(); ctx.moveTo(bx + 1, top); ctx.quadraticCurveTo(bx + 10, top + 3 + wave, bx + 19, top + 6 + wave); ctx.quadraticCurveTo(bx + 10, top + 9 + wave * 0.5, bx + 1, top + 12); ctx.closePath(); ctx.fill();
  }
  const tiles = {
    Y: { solid: false, lint: { name: 'Palmen', color: '#7CC49A' }, draw: (tx, ty, x, y, ctx) => drawPalm(tx, ty, x, y, ctx || api.ctx) },
    C: { solid: false, lint: { name: 'Korallen', color: '#F59CB0' }, draw: (tx, ty, x, y, ctx) => drawCoral(tx, ty, x, y, ctx || api.ctx) },
    W: { solid: false, lint: { name: 'Seegras', color: '#7CC6A0' }, draw: (tx, ty, x, y, ctx) => drawWeed(tx, ty, x, y, ctx || api.ctx) },
    H: { solid: false, lint: { name: 'Pfähle', color: '#C99E78' }, draw: (tx, ty, x, y, ctx) => drawPost(tx, ty, x, y, ctx || api.ctx) },
    '!': { solid: false, lint: { name: 'Wimpel', color: '#F2A7BC' }, draw: (tx, ty, x, y, ctx) => drawPennant(tx, ty, x, y, ctx || api.ctx) },
  };

  // ---------- set pieces, level field decor: [{ k, x, y, ... }] in tiles (looks only, see world4-kit.md) ----------
  // wall (back wall of a room, look 'wood' or 'stone'), mast (pole from the deck at y up to top, sail under row sail),
  // porthole, lantern (lighthouse light with a sweeping beam), tentacle and eye (the octopus asleep in the background).
  // A few rects and strokes each, culled to the camera, everything on the game clock.
  const DECOR = {
    light: { woodBack: '#B99579', woodSeam: '#A27F63', stoneBack: '#D6C8B7', stoneSeam: '#C3B39F', brass: '#E2B865', glass: '#4C7FA3', sail: '#FFF8EC', lamp: '#FFE7A0', octo: '#F08FA4', octoLite: '#F9BFCB', lid: '#D97089' },
    dark: { woodBack: '#5E4A3B', woodSeam: '#4D3C30', stoneBack: '#77716C', stoneSeam: '#635E5A', brass: '#B8924E', glass: '#24435C', sail: '#CFC8BA', lamp: '#FFE29A', octo: '#D98399', octoLite: '#EDB4C2', lid: '#B9647A' },
  };
  const decorOf = () => { const c = api.L && api.L.coast, d = c && c.def && c.def.decor; return Array.isArray(d) ? d : null; };
  const dcol = () => DECOR[api.dark ? 'dark' : 'light'];
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 30 && x0 < cam.x + v.w + 30 && y1 > cam.y - 30 && y0 < cam.y + v.h + 30; };
  // draw f twice: in full above the water line, faint below it (the far thing sits in the water, behind its veil)
  function veiled(ctx, f, x0, x1) {
    const s = surf(), cam = api.cam, v = api.view;
    if (s == null) { f(); return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x0, cam.y - 10, x1 - x0, s - cam.y + 10); ctx.clip(); f(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x0, s, x1 - x0, cam.y + v.h - s + 10); ctx.clip(); ctx.globalAlpha = 0.38; f(); ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawWall(ctx, d) {
    const x = d.x * T, y = d.y * T, w = d.w * T, h = d.h * T, cam = api.cam, v = api.view;
    if (!seen(x, y, x + w, y + h)) return;
    const k = dcol(), stone = d.look === 'stone', bh = stone ? 16 : 13, jw = stone ? 32 : 150, s = surf();
    const y0 = Math.max(y, Math.floor((cam.y - y) / bh) * bh + y), y1 = Math.min(y + h, cam.y + v.h + bh);
    ctx.fillStyle = stone ? k.stoneBack : k.woodBack; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = stone ? k.stoneSeam : k.woodSeam;
    for (let yy = y0, n = Math.round((y0 - y) / bh); yy < y1; yy += bh, n++) {
      if (yy > y) ctx.fillRect(x, yy - 1, w, 2);
      for (let xx = x + (stone ? (n % 2 ? jw / 2 : 0) : (n * 67) % jw) + 6; xx < x + w - 4; xx += jw) ctx.fillRect(xx, yy, 2, bh);
    }
    if (s != null && s < y + h) { ctx.fillStyle = waterCols().top; ctx.globalAlpha = 0.3; ctx.fillRect(x, Math.max(y, s), w, y + h - Math.max(y, s)); ctx.globalAlpha = 1; }
  }
  function drawMast(ctx, d) {
    const W = api.W, k = dcol(), x = d.x * T + T / 2, base = d.y * T, top = d.top * T + 6;
    if (!seen(x - 3 * T, top - 20, x + 3 * T, base)) return;
    ctx.strokeStyle = W.woodInk; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55; ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(x, top + 4); ctx.lineTo(x + s * (d.stay || 2.5) * T, base); }
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = W.wood; ctx.fillRect(x - 5, top, 10, base - top);
    ctx.fillStyle = W.woodInk; ctx.fillRect(x + 2, top, 3, base - top);
    for (let yy = top + 30; yy < base - 12; yy += 64) ctx.fillRect(x - 6, yy, 12, 3);
    const wave = api.reduced ? 0 : Math.sin(api.time * 3 + d.x) * 2.5;
    ctx.fillStyle = W.poleStripe; ctx.beginPath(); ctx.moveTo(x + 4, top - 2); ctx.quadraticCurveTo(x + 14, top + 2 + wave, x + 26, top + 5 + wave); ctx.quadraticCurveTo(x + 14, top + 8, x + 4, top + 12); ctx.closePath(); ctx.fill();
    if (d.sail == null) return;
    // the torn sail hangs under a yard (a row of boards in the map), pale and see-through, never like ground
    const sy = d.sail * T + 6, sw = (d.sw || 1.6) * T, sway = api.reduced ? 0 : Math.sin(api.time * 0.8 + d.x) * 3;
    ctx.fillStyle = k.sail; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x - sw, sy); ctx.lineTo(x + sw, sy);
    ctx.lineTo(x + sw * 0.85 + sway, sy + 50); ctx.lineTo(x + sw * 0.4 + sway, sy + 36); ctx.lineTo(x + sway, sy + 58); ctx.lineTo(x - sw * 0.45 + sway, sy + 34); ctx.lineTo(x - sw * 0.9 + sway, sy + 48);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  function drawPorthole(ctx, d) {
    const k = dcol(), x = d.x * T + T / 2, y = d.y * T + T / 2; if (!seen(x - 14, y - 14, x + 14, y + 14)) return;
    ctx.fillStyle = k.brass; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = k.glass; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 4.5, -2.6, -1.6); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // the light of the lighthouse: a soft halo and a beam that sweeps round (seen from the side it grows and shrinks)
  function drawLantern(ctx, d) {
    const k = dcol(), x = d.x * T + T / 2, y = d.y * T + T / 2, night = Math.min(1, (api.W.night || 0) + (api.dark ? 0.5 : 0));
    if (!seen(x - 700, y - 120, x + 700, y + 120)) return;
    // the lighthouse of level 40 stays dark until the keeper's bulb is in (coast-handover-gags.js sets f.fx.light)
    const st = api.L && api.L.story, f = st && st.find;
    if (f && f.style === 'light' && !f.seen && !(f.fx && f.fx.light != null && api.time >= f.fx.light)) {
      ctx.fillStyle = k.lamp; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.ellipse(x, y, 9, 12, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return;
    }
    const a = api.reduced ? 0.6 : api.time * 0.9, len = Math.cos(a) * 640, spread = 0.12 * Math.abs(len);
    ctx.fillStyle = k.lamp;
    ctx.globalAlpha = 0.1 + 0.16 * night; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + len, y - spread); ctx.lineTo(x + len, y + spread); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
    for (const [r, al] of [[70, 0.1], [44, 0.16], [24, 0.4]]) { ctx.globalAlpha = al * (0.7 + 0.6 * night); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.ellipse(x, y, 9, 12, 0, 0, TAU); ctx.fill();
  }
  // Käpt'n Krake asleep: an arm curled out of the water that breathes slowly, suckers on its inner side
  function tentaclePts(d) {
    const s = d.s || 1, dir = d.dir || 1, bx = d.x * T + T / 2, by = d.y * T, br = api.reduced ? 0 : Math.sin(api.time * 0.7 + d.x) * 0.06, pts = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12, a = -Math.PI / 2 + dir * (u * u * 4.2 + br * u * 4), r = (1 - u * 0.55) * 26 * s; const p = pts[i - 1] || { x: bx, y: by }; pts.push(i ? { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r } : { x: bx, y: by }); }
    return pts;
  }
  function drawTentacle(ctx, d) {
    const k = dcol(), s = d.s || 1, pts = tentaclePts(d), xs = pts.map((p) => p.x);
    const x0 = Math.min(...xs) - 30 * s, x1 = Math.max(...xs) + 30 * s; if (!seen(x0, pts[0].y - 200 * s, x1, pts[0].y + 60)) return;
    veiled(ctx, () => {
      ctx.lineCap = 'round'; ctx.strokeStyle = k.octo;
      for (let i = 0; i < pts.length - 1; i++) { ctx.lineWidth = (24 - i * 1.6) * s; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke(); }
      ctx.fillStyle = k.octoLite;
      for (let i = 1; i < pts.length - 2; i += 2) { const p = pts[i], q = pts[i + 1], nx = -(q.y - p.y), ny = q.x - p.x, n = Math.hypot(nx, ny) || 1, o = (d.dir || 1) * (9 - i * 0.5) * s; ctx.beginPath(); ctx.arc(p.x + nx / n * o, p.y + ny / n * o, (4.2 - i * 0.22) * s, 0, TAU); ctx.fill(); }
    }, x0, x1);
  }
  // a big sleepy eye at the water line; it opens a little when Mimo comes close and follows him
  function drawEye(ctx, d) {
    const k = dcol(), p = api.p, s = d.s || 1, x = d.x * T + T / 2, y = d.y * T, r = 20 * s;
    if (!seen(x - 3 * r, y - 3 * r, x + 3 * r, y + 2 * r)) return;
    const dist = p ? Math.hypot(p.x + p.w / 2 - x, p.y - y) : 1e9, open = Math.max(0, Math.min(0.62, (9 * T - dist) / (5 * T)));
    veiled(ctx, () => {
      // a low, wide hump of the head (not a dome, so it never reads as a jellyfish), the eye sits in it
      const hy = y + r * 0.78;
      ctx.fillStyle = k.octo; ctx.beginPath(); ctx.ellipse(x, hy, r * 2.7, r * 1.35, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = k.lid; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.ellipse(x, hy, r * 2.7, r * 1.35, 0, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      // the pale spots of the Krake's skin, so the hump under the veil still reads as him and not as a rock
      ctx.fillStyle = k.octoLite; for (const [dx, dy, rr] of [[-1.7, 0.1, 0.26], [-1.25, 0.62, 0.18], [1.5, 0.3, 0.22], [1.95, 0.75, 0.15], [0.6, 0.95, 0.2]]) { ctx.beginPath(); ctx.arc(x + dx * r, hy + dy * r - r * 0.35, rr * r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x, y, r, Math.max(1.5, r * open), 0, 0, TAU); ctx.fill();
      if (open > 0.12) { const lx = p ? Math.max(-r * 0.4, Math.min(r * 0.4, (p.x - x) / 12)) : 0; ctx.fillStyle = '#1B1830'; ctx.beginPath(); ctx.arc(x + lx, y + r * 0.1, r * 0.42 * Math.min(1, open * 2), 0, TAU); ctx.fill(); }
      ctx.strokeStyle = k.lid; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, Math.max(2, r * open) + 2, 0, Math.PI, 0); ctx.stroke();
      if (open < 0.12) for (const o of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(x + o * r, y + 3); ctx.lineTo(x + o * r * 1.25, y + 9 * s); ctx.stroke(); }
    }, x - 3 * r, x + 3 * r);
  }
  // hang { x, y }: a few strands of seaweed hanging from the underside of the solid tile at x, y (a roof of sand); faint and
  // short, so it never reads as a platform and never covers what lies below (the level builder keeps hazards out of reach)
  function drawHang(ctx, d) {
    const x = d.x * T, y = (d.y + 1) * T - 3;
    if (!seen(x - 8, y, x + T + 8, y + 56)) return;
    const W = api.W, t = api.reduced ? 0 : api.time;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      const h = 28 + api.hash(d.x + i, d.y * 3) * 28, bx = x + 6 + i * 10, ph = api.hash(d.x, i + 5) * 6;
      ctx.strokeStyle = i === 1 ? W.weed2 : W.weed; ctx.beginPath(); ctx.moveTo(bx, y);
      for (let k = 1; k <= 6; k++) { const f = k / 6; ctx.lineTo(bx + Math.sin(f * 3.4 + t * 1.3 + ph) * 5 * f, y + h * f); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const DRAW_BACK = { hang: drawHang, wall: drawWall, mast: drawMast, lantern: drawLantern, tentacle: drawTentacle, eye: drawEye };
  function drawDecor(ctx, layer) {
    const list = decorOf(); if (!list) return;
    // walls first, so masts, lights and the octopus stand in front of them
    if (layer === 'back') { for (const d of list) if (d.k === 'wall') drawWall(ctx, d); for (const d of list) if (d.k !== 'wall' && DRAW_BACK[d.k]) DRAW_BACK[d.k](ctx, d); }
    else for (const d of list) if (d.k === 'porthole') drawPorthole(ctx, d);
  }

  // ink drops fly off the cloud now and then (looks only)
  function inkSpray() {
    const L = api.L; if (!L || !L.chase || api.reduced || api.state !== 'play' || Math.random() > 0.35) return;
    const c = L.chase, cam = api.cam, v = api.view;
    api.G.particles.push({ x: c.x - 10, y: cam.y + Math.random() * v.h, vx: 60 + Math.random() * 120, vy: (Math.random() - 0.5) * 60, life: 0, max: 0.7, r: 2 + Math.random() * 3, color: api.W.ink, grav: 40, rect: false, rot: 0 });
  }

  // the water colours now and the wave of the surface line, for figures that stand in the water (coast-cast-draw.js)
  window.MimoCoast = Object.assign(window.MimoCoast || {}, { waterCols: () => waterCols(), wave });

  window.MimoWorlds.register({
    world: 4,
    palette, nightBlend: 0.85, tiles,
    drawBackground, drawThorn, drawMushroom, drawChase, drawAmbient,
    setup(a) { api = a; },
    update() { inkSpray(); },
    drawTile,
    draw(layer, ctx) {
      if (layer === 'back') { drawWater(ctx); drawDecor(ctx, 'back'); }
      else if (layer === 'mid') drawDecor(ctx, 'mid');
      else if (layer === 'front') { drawAirBubble(ctx); drawSurface(ctx); }
    },
  });
})();
