// World 6 "Mond": the picture. A starry sky in every light (the moon has no blue sky), the Earth hanging in it (with
// the volcano island of world 5 as a tiny wink), the sun by day, far crater hills, pale moon dust ground with dimples,
// the metal hull of a moon base ("B") and its inside, cheese ("K"), moon crystal spikes (the thorns), drifting dust,
// Mimo's glass helmet, and the darkness of the dark side with Mimo's own small light.
// Design rule of the game: scenery soft, ground one clear mid tone, danger saturated (meteor red, warning pink),
// gold only for things to collect; the shooting stars are ice blue so they never read as stars to collect.
// Kept cheap for old iPhones: no shadowBlur, gradients made once and reused, everything culled to the camera, the
// darkness is painted on a small canvas (a quarter of the screen) and scaled up.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, M = () => window.MimoMoon;

  const palette = {
    light: {
      skyTop: '#1F2350', skyBot: '#4E4C88', hillFar: '#45437A', hillNear: '#5A588E', cloud: '#6E6AA0', sun: '#FFF6DC',
      ground: '#BEBBDC', groundEdge: '#E6E4F6', groundDot: '#A5A2C9', groundInk: '#9693C0', dust: '#ECEAF8',
      earthSea: '#8EC5EC', earthLand: '#9EDBB0', earthCloud: '#FFFFFF', earthGlow: '#A8C8EC', earthShade: '#262446', isle: '#6B4068', isleGlow: '#FFB36B',
      crater: '#3B3970', craterRim: '#6A68A0', starCol: '#FFFFFF',
      meteor: '#E5847A', meteorHi: '#F6B9A6', meteorInk: '#B65F63', tail: '#FFC978', warn: '#F08DB0', warnInk: '#C2547E',
      moonBall: '#DCD9F0', moonShade: '#B7B3D9', moonCrater: '#A9A5CD', moonFace: '#3A3850', orbit: '#FFFFFF',
      stone: '#9A97C2', stoneTop: '#D6D3EC', stoneInk: '#6F6C99', stoneGlow: '#B9E6FF', comet: '#E6F8FF', cometTail: '#9FD8F2',
      boost: '#BFF3FF', boostCore: '#FFFFFF',
      metal: '#E4E3F0', metalEdge: '#FFFFFF', metalInk: '#9C9AB8', metalLamp: '#9EDBC1', baseWall: '#3D3B68', baseSeam: '#4C4A7C', baseWindow: '#191B3A', baseLight: '#FFF0C8',
      cheese: '#F3D98B', cheeseHole: '#D9B85F', cheeseEdge: '#FBE7AE',
      thorn: '#53295E', thornEdge: '#F08DB0', rock: '#8F8CB8', rockHi: '#C9C6E4', crystal: '#C8E9F7', crystal2: '#E5C9F2', crystalInk: '#8E8BB8',
      helmet: '#FFFFFF', darkness: '#080920',
    },
    dark: {
      skyTop: '#0C0E25', skyBot: '#28264D', hillFar: '#2E2C55', hillNear: '#3B3966', cloud: '#4A4878', sun: '#E8DFC4',
      ground: '#8D8AB3', groundEdge: '#B7B4D8', groundDot: '#77749E', groundInk: '#6E6B97', dust: '#C9C6E2',
      earthSea: '#6FA6CF', earthLand: '#7DBB92', earthCloud: '#E2E6F2', earthGlow: '#7FA6CF', earthShade: '#14132C', isle: '#4A2C4A', isleGlow: '#F09A5C',
      crater: '#222049', craterRim: '#45437A', starCol: '#F4F2FF',
      meteor: '#E27A72', meteorHi: '#F2AE9C', meteorInk: '#9E4E55', tail: '#F5BA6A', warn: '#F58FB4', warnInk: '#B84A76',
      moonBall: '#B9B5D6', moonShade: '#938FB8', moonCrater: '#8682AC', moonFace: '#1E1D33', orbit: '#E8E6FA',
      stone: '#77749E', stoneTop: '#ABA8CC', stoneInk: '#55527C', stoneGlow: '#8FCBE8', comet: '#D0EEFA', cometTail: '#7FC0DF',
      boost: '#A8EBFA', boostCore: '#F4FDFF',
      metal: '#B4B2C8', metalEdge: '#D6D4E6', metalInk: '#7A7896', metalLamp: '#7FC4A6', baseWall: '#25233F', baseSeam: '#302E52', baseWindow: '#0D0E22', baseLight: '#E8D9B0',
      cheese: '#D9BE72', cheeseHole: '#B89A4C', cheeseEdge: '#E8D294',
      thorn: '#3A1C45', thornEdge: '#F58FB4', rock: '#6E6B97', rockHi: '#9C99C0', crystal: '#9FCBDD', crystal2: '#C3A6D6', crystalInk: '#68658F',
      helmet: '#F4F2FF', darkness: '#04040F',
    },
    night: {
      light: { nightSkyTop: '#0A0C24', nightSkyBot: '#2A2858', nightCloud: '#3A3866', nightSun: '#C9C2A8', nightHillFar: '#33315F', nightHillNear: '#46447A' },
      dark: { nightSkyTop: '#05061A', nightSkyBot: '#191838', nightCloud: '#2A2850', nightSun: '#9A947E', nightHillFar: '#22204A', nightHillNear: '#2D2B58' },
    },
  };

  // ---------- small helpers and gradient caches ----------
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
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
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };
  const night = () => api.W.night || 0;
  const wrapX = (x, span) => ((x % span) + span) % span;

  // ---------- background (screen space) ----------
  function drawBackground(ctx) {
    const W = api.W, v = api.view, cam = api.cam, L = api.L, t = api.reduced ? 0 : api.time, n = night();
    ctx.fillStyle = linear('sky', 0, v.h, W.skyTop, W.skyBot); ctx.fillRect(0, 0, v.w, v.h);
    // the sun by day: a small white disc with a wide soft glow (no blue sky on the moon)
    // (not on the dark side, fading out towards night)
    const day = L.moon && L.moon.dark ? 0 : Math.max(0, 1 - n * 1.5);
    if (day > 0) {
      const sx = v.w * 0.8 - cam.x * 0.02, sy = 58 - cam.y * 0.02;
      glow(ctx, 'sun', sx, sy, 110, W.sun, 0.32 * day);
      ctx.globalAlpha = day; ctx.fillStyle = W.sun; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    drawStars(ctx, v, cam, t, n);
    drawEarth(ctx, v, cam, t, n);
    const hy = Math.round(((L.h - 2) * T - cam.y) * 0.85 - 10);
    if (hy - 70 < v.h) {
      api.drawHills(W.hillFar, hy - 34, 0.12, 26, 0.009, 3);
      drawFarCraters(ctx, v, cam, hy - 34, 0.12, W.crater, W.craterRim, 11);
      api.drawHills(W.hillNear, hy + 10, 0.25, 16, 0.016, 11);
      drawFarCraters(ctx, v, cam, hy + 10, 0.25, W.crater, W.craterRim, 23);
    }
  }
  function drawStars(ctx, v, cam, t, n) {
    const count = 64 + Math.round(36 * n), span = Math.max(1400, v.w + 60);
    ctx.fillStyle = api.W.starCol;
    for (let i = 0; i < count; i++) {
      const x = wrapX(api.hash(i, 3) * 1600 - cam.x * 0.03, span), y = api.hash(i, 11) * v.h * 0.78 - cam.y * 0.03;
      if (x > v.w || y < -2 || y > v.h) continue;
      const big = api.hash(i, 5);
      ctx.globalAlpha = (0.3 + 0.35 * n) + (0.35 + 0.1 * n) * (0.5 + 0.5 * Math.sin(t * (0.7 + big) + i * 1.7));
      if (big > 0.9) { ctx.fillRect(x - 2.5, y - 0.5, 6, 1.4); ctx.fillRect(x - 0.2, y - 3, 1.4, 6.4); } else ctx.fillRect(x, y, 1 + big * 1.4, 1 + big * 1.4);
    }
    ctx.globalAlpha = 1;
  }
  // the Earth: sea, three continents, a cloud band, the night shade on one side; the little volcano island glows on it
  function drawEarth(ctx, v, cam, t, n) {
    // a boss may move the Earth (L.moon.earth = { dx, dy, s }): Käsebert's dark side lets it set, his finale lets it rise
    const e = api.L.moon && api.L.moon.earth, es = e ? e.s : 1;
    const W = api.W, r = 40, x = Math.round(v.w * 0.17 - cam.x * 0.015 + (e ? e.dx : 0)), y = Math.round(86 - cam.y * 0.015 + (e ? e.dy : 0));
    if (x < -80 * es || y < -80 * es || y > v.h + 60 * es) return;
    if (es !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(es, es); ctx.translate(-x, -y); }
    glow(ctx, 'earth', x, y, 92, W.earthGlow, 0.3 + 0.15 * n);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = W.earthSea; ctx.fill(); ctx.clip();
    const turn = (t * 1.5) % 120;
    ctx.fillStyle = W.earthLand;
    for (let k = -1; k <= 0; k++) {
      const ox = x + k * 120 + turn - 40;
      ctx.beginPath(); ctx.ellipse(ox - 18, y - 14, 22, 14, 0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ox + 22, y + 20, 20, 12, -0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ox - 26, y + 24, 12, 7, 0, 0, TAU); ctx.fill();
      // the volcano island of world 5, a tiny dark dot with a warm spark
      ctx.fillStyle = W.isle; ctx.beginPath(); ctx.ellipse(ox + 52, y - 6, 3.4, 2.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = W.isleGlow; ctx.fillRect(ox + 51.5, y - 8.5, 1.6, 1.6); ctx.fillStyle = W.earthLand;
    }
    ctx.strokeStyle = W.earthCloud; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(x - 44, y + 4); ctx.quadraticCurveTo(x, y - 14, x + 46, y); ctx.stroke(); ctx.globalAlpha = 1;
    // the night side: a shade from the right, wider at night, with a few city lights in it
    const sh = 14 + 34 * n;
    ctx.fillStyle = W.earthShade; ctx.globalAlpha = 0.5 + 0.3 * n; ctx.beginPath();
    ctx.rect(x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4); ctx.arc(x - sh, y - sh * 0.25, r, 0, TAU); ctx.fill('evenodd'); ctx.globalAlpha = 1;
    if (n > 0.3) { ctx.fillStyle = W.baseLight; for (let i = 0; i < 9; i++) { ctx.globalAlpha = (n - 0.3) * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.fillRect(x + 4 + api.hash(i, 21) * 30, y - 20 + api.hash(i, 22) * 40, 1.5, 1.5); } ctx.globalAlpha = 1; }
    ctx.restore();
    if (es !== 1) ctx.restore();
  }
  function drawFarCraters(ctx, v, cam, base, par, col, rim, seed) {
    const span = 1200;
    for (let i = 0; i < 7; i++) {
      const w = 26 + api.hash(i, seed) * 40, x = wrapX(api.hash(i, seed + 1) * span - cam.x * par, span) - 60;
      if (x < -w || x > v.w + w) continue;
      const y = base + 10 + api.hash(i, seed + 2) * 22;
      if (y > v.h + 10) continue;
      ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + 1.5, w * 0.82, w * 0.14, 0, 0, TAU); ctx.fill();
    }
  }

  // ---------- tiles ----------
  function drawGroundTile(tx, ty, x, y, ctx) {
    const W = api.W, SOLID = api.TILE.SOLID, above = api.tileAt(tx, ty - 1), up = above === SOLID || (api.isSolid(tx, ty - 1) && above !== api.TILE.ONEWAY);
    ctx.fillStyle = W.ground; ctx.fillRect(x, y, T, T + (api.tileAt(tx, ty + 1) === SOLID ? 1 : 0));
    const h = api.hash(tx, ty);
    if (!up) {
      const left = api.tileAt(tx - 1, ty) === SOLID, right = api.tileAt(tx + 1, ty) === SOLID;
      ctx.fillStyle = W.groundEdge; api.rr(x - (left ? 2 : 0), y, T + (left ? 2 : 0) + (right ? 2 : 0), 7, left && right ? 0 : 4); ctx.fill();
      // small dimples in the dust on the top (the mockup's moon edge)
      if (api.hash(tx, ty + 5) < 0.45) { ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.ellipse(x + 16, y + 3.5, 9, 2.4, 0, 0, TAU); ctx.fill(); }
      return;
    }
    // little craters inside the ground: a dark bowl with a light lower rim
    if (h < 0.3) {
      const cx = x + 8 + h * 50, cy = y + 10 + api.hash(ty, tx) * 12, r = 3 + h * 8;
      ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = W.groundEdge; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (h < 0.5) { ctx.fillStyle = W.groundDot; ctx.beginPath(); ctx.arc(x + 6 + h * 40, y + 8 + api.hash(ty, tx) * 18, 2, 0, TAU); ctx.fill(); }
  }
  // the hull of a moon base: white panels, seams, rivets, a green lamp now and then
  function drawMetal(tx, ty, x, y, ctx) {
    const W = api.W, id = api.tileId(6, 'B'), up = api.tileAt(tx, ty - 1) === id;
    ctx.fillStyle = W.metal; ctx.fillRect(x, y, T, T + 1);
    ctx.fillStyle = W.metalInk; ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
    ctx.fillRect(x + 4, y + 9, 2, 2); ctx.fillRect(x + T - 8, y + 9, 2, 2); ctx.fillRect(x + 4, y + T - 8, 2, 2); ctx.fillRect(x + T - 8, y + T - 8, 2, 2);
    if (!up) { ctx.fillStyle = W.metalEdge; ctx.fillRect(x, y, T, 5); ctx.fillStyle = W.metalInk; ctx.fillRect(x, y + 5, T, 1.5); }
    if (api.hash(tx, ty * 7) < 0.12) {
      const on = api.reduced || Math.sin(api.time * 2 + tx) > -0.3;
      ctx.fillStyle = on ? W.metalLamp : W.metalInk; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 + 2, 3, 0, TAU); ctx.fill();
    }
  }
  // cheese: pale yellow with holes, a lighter rind on top (for the Käsekeller)
  function drawCheese(tx, ty, x, y, ctx) {
    const W = api.W, id = api.tileId(6, 'K'), up = api.tileAt(tx, ty - 1) === id || api.tileAt(tx, ty - 1) === api.TILE.SOLID;
    ctx.fillStyle = W.cheese; ctx.fillRect(x, y, T, T + 1);
    ctx.fillStyle = W.cheeseHole;
    for (let i = 0; i < 3; i++) { const h = api.hash(tx * 3 + i, ty); if (h < 0.55) { ctx.beginPath(); ctx.ellipse(x + 5 + api.hash(ty, tx + i) * 22, y + 8 + h * 30 * 0.6 + i * 3, 2.5 + h * 4, 2 + h * 3, 0, 0, TAU); ctx.fill(); } }
    if (!up) { ctx.fillStyle = W.cheeseEdge; api.rr(x, y, T, 6, 3); ctx.fill(); }
  }
  // decoration: low rocks and pale crystals (no collision; low and darker than the ground edge, never a platform)
  function drawRocks(tx, ty, x, y, ctx) {
    const W = api.W, by = y + T, h = api.hash(tx, ty + 9);
    ctx.fillStyle = W.rock;
    ctx.beginPath(); ctx.ellipse(x + 10 + h * 6, by - 4, 8, 6, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 22, by - 3, 5, 4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = W.rockHi; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(x + 8 + h * 6, by - 8, 3.5, 1.6, -0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function drawCrystals(tx, ty, x, y, ctx) {
    const W = api.W, h = api.hash(tx, ty + 3), by = y + T;
    ctx.strokeStyle = W.crystalInk; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const cx = x + 8 + i * 8, ht = [11, 18, 9][i] + h * 5, lean = (i - 1) * 3;
      ctx.fillStyle = (i + Math.round(h * 2)) % 2 ? W.crystal2 : W.crystal;
      ctx.beginPath(); ctx.moveTo(cx - 3.5, by); ctx.lineTo(cx - 3 + lean, by - ht + 4); ctx.lineTo(cx + lean, by - ht); ctx.lineTo(cx + 3 + lean, by - ht + 4); ctx.lineTo(cx + 3.5, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (!api.reduced) { const k = (api.time * 0.4 + h) % 1; if (k < 0.12) { ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 1 - k / 0.12; ctx.fillRect(x + 15, by - 19, 2, 2); ctx.globalAlpha = 1; } }
  }
  function drawTile(t, tx, ty, x, y, ctx) {
    if (t === api.TILE.SOLID) { drawGroundTile(tx, ty, x, y, ctx); return true; }
    return false;
  }

  // ---------- moon crystal spikes (the thorns of this world): dark violet glass with a pink rim ----------
  function drawThorn(tx, ty, x, y, dir) {
    const ctx = api.ctx, W = api.W, base = dir > 0 ? y + T : y, tip = dir > 0 ? y + 7 : y + T - 7, h = api.hash(tx, ty * 5);
    ctx.fillStyle = W.thorn; ctx.strokeStyle = W.thornEdge; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < 3; i++) { const bx = x + i * (T / 3), tt = tip + (i === 1 ? 0 : dir * (2 + h * 3)); ctx.moveTo(bx + 1, base); ctx.lineTo(bx + T / 6 + (h - 0.5) * 2, tt); ctx.lineTo(bx + T / 3 - 1, base); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // ---------- inside a moon base (level field bases): the back wall, windows, airlock frames ----------
  function drawBases(ctx) {
    const m = api.L.moon, W = api.W, cam = api.cam, v = api.view;
    for (const b of m.bases) {
      if (!seen(b.x * T, b.y * T, (b.x + b.w) * T, (b.y + b.h) * T)) continue;
      const x0 = Math.max(b.x, Math.floor(cam.x / T)), x1 = Math.min(b.x + b.w - 1, Math.floor((cam.x + v.w) / T));
      const y0 = Math.max(b.y, Math.floor(cam.y / T)), y1 = Math.min(b.y + b.h - 1, Math.floor((cam.y + v.h) / T));
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (api.isSolid(tx, ty)) continue;
        const x = tx * T, y = ty * T;
        ctx.fillStyle = W.baseWall; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = W.baseSeam; ctx.fillRect(x, y + T - 2, T, 2); if ((tx - b.x) % 2 === 0) ctx.fillRect(x, y, 2, T);
        // a round window every few tiles in the middle row, with stars in it
        if ((tx - b.x) % 5 === 2 && ty === b.y + Math.floor(b.h / 2) - 1) {
          ctx.fillStyle = W.metal; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 12, 0, TAU); ctx.fill();
          ctx.fillStyle = W.baseWindow; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 9, 0, TAU); ctx.fill();
          ctx.fillStyle = W.starCol; ctx.fillRect(x + 12, y + 12, 1.5, 1.5); ctx.fillRect(x + 19, y + 17, 1.2, 1.2);
        }
      }
      // warm ceiling lights
      // (under the first row of the rect that is open, so the light stays inside the hull)
      let ly = b.y; while (ly < b.y + b.h - 1 && api.isSolid(b.x + Math.floor(b.w / 2), ly)) ly++;
      for (let tx = b.x + 2; tx < b.x + b.w - 2; tx += 4) if (seen(tx * T - 40, ly * T, tx * T + 40, ly * T + 80)) glow(ctx, 'baseLamp', tx * T + T / 2, ly * T + 6, 40, W.baseLight, 0.35);
    }
  }
  // airlock frames at both ends of a base (drawn in front of the wall, behind Mimo)
  function drawLocks(ctx) {
    const m = api.L.moon, W = api.W;
    for (const b of m.bases) for (const side of [0, 1]) {
      const tx = side ? b.x + b.w - 1 : b.x, x = side ? (tx + 1) * T - 6 : tx * T;
      let ty0 = -1, ty1 = -1;
      for (let ty = b.y; ty < b.y + b.h; ty++) if (!api.isSolid(tx, ty)) { if (ty0 < 0) ty0 = ty; ty1 = ty; }
      if (ty0 < 0 || !seen(x - 10, ty0 * T, x + 16, (ty1 + 1) * T)) continue;
      ctx.fillStyle = W.metal; ctx.fillRect(x, ty0 * T, 6, (ty1 - ty0 + 1) * T);
      ctx.fillStyle = W.metalInk; for (let y = ty0 * T + 6; y < (ty1 + 1) * T; y += 10) ctx.fillRect(x + 1, y, 4, 2);
      ctx.fillStyle = W.metalLamp; ctx.beginPath(); ctx.arc(x + 3, ty0 * T + 6, 3, 0, TAU); ctx.fill();
    }
  }

  // ---------- floating bits: slow dust motes and short twinkles (world space) ----------
  function drawAmbient(ctx) {
    const L = api.L, cam = api.cam, v = api.view, t = api.time, H = L.h * T, W = api.W;
    for (let i = 0; i < L.pollen.length; i++) {
      const q = L.pollen[i];
      const x = q.x + Math.sin(t * 0.25 + q.ph) * 16;
      if (x < cam.x - 10 || x > cam.x + v.w + 10) continue;
      const y = ((q.y - t * (3 + q.sp * 0.3)) % H + H) % H;
      if (y < cam.y - 10 || y > cam.y + v.h + 10) continue;
      if (i % 4 === 0) {
        const k = (t * 0.3 + q.ph) % 1; if (k > 0.15) continue;
        ctx.fillStyle = W.starCol; ctx.globalAlpha = 0.8 * (1 - k / 0.15); ctx.fillRect(x - 2, y - 0.5, 5, 1.2); ctx.fillRect(x - 0.1, y - 2.5, 1.2, 5);
      } else { ctx.fillStyle = W.dust; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, q.r * 0.7, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Mimo's glass helmet (off inside a base) ----------
  function drawHelmet(ctx) {
    const p = api.p, m = api.L.moon; if (!p || !m || m.helmet <= 0.02 || api.state === 'dead' || api.state === 'win') return;
    if (p.invT > 0 && Math.sin(p.invT * 30) > 0) return;
    const W = api.W, x = p.x + p.w / 2, y = p.y + p.h - 15 * (p.sy || 1), r = 17.5, a = m.helmet;
    ctx.fillStyle = W.helmet; ctx.globalAlpha = 0.12 * a; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = W.helmet; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.85 * a; ctx.stroke();
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 13, -2.6, -1.9); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------- the dark side (level field dark: { r, a }): darkness with Mimo's light, lamps, glowing things ----------
  let dcv = null;
  const SCALE = 0.25;
  function drawDarkness(ctx) {
    const m = api.L.moon; if (!m || !m.dark) return;
    const v = api.view, cam = api.cam, w = Math.ceil(v.w * SCALE), h = Math.ceil(v.h * SCALE);
    if (!dcv) dcv = document.createElement('canvas');
    if (dcv.width !== w || dcv.height !== h) { dcv.width = w; dcv.height = h; }
    const d = dcv.getContext('2d'), p = api.p;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h);
    d.fillStyle = api.W.darkness; d.globalAlpha = m.dark.a; d.fillRect(0, 0, w, h); d.globalAlpha = 1;
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, k) => {
      const sx = (x - cam.x) * SCALE, sy = (y - cam.y) * SCALE, sr = r * SCALE;
      if (sx < -sr || sy < -sr || sx > w + sr || sy > h + sr) return;
      const g = d.createRadialGradient(sx, sy, sr * 0.35, sx, sy, sr); g.addColorStop(0, 'rgba(0,0,0,' + k + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.arc(sx, sy, sr, 0, TAU); d.fill();
    };
    if (p && api.state !== 'win') hole(p.x + p.w / 2, p.y + p.h / 2, m.dark.r * (api.state === 'dead' ? 0.6 : 1), 1);
    for (const l of m.lamps) hole(l.x * T + T / 2, l.y * T + T / 2, l.r * T, 0.95);
    for (const mo of m.moons) hole(mo.cx, mo.cy, mo.size * 2.4, 0.7);
    for (const b of m.boosts) if (b.ready) hole(b.cx, b.cy, 50, 0.6);
    const L = api.L; if (L.door) hole(L.door.x * T + T / 2, L.door.y * T + T / 2, 70, 0.8);
    for (const c of L.checkpoints) hole(c.x * T + T / 2, c.y * T + T / 2, 40, 0.5);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(dcv, 0, 0, w, h, 0, 0, w / SCALE, h / SCALE);
    // the warnings shine through the dark: they are drawn again over it (moon-things-draw.js), and stars glint
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    if (M().drawLit) M().drawLit(ctx);
    if (!api.reduced) for (const s of L.stars) {
      if (s.got) continue;
      const k = (api.time * 0.5 + s.seed * 0.37) % 1; if (k > 0.2) continue;
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 1 - k / 0.2; const x = s.x * T + T / 2, y = s.y * T + T / 2;
      ctx.fillRect(x - 4, y - 0.7, 9, 1.4); ctx.fillRect(x - 0.2, y - 4.5, 1.4, 9);
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  const tiles = {
    B: { solid: true, lint: { name: 'Mondbasis', color: '#E4E3F0' }, draw: (tx, ty, x, y, ctx) => drawMetal(tx, ty, x, y, ctx || api.ctx) },
    K: { solid: true, lint: { name: 'Käse', color: '#F3D98B' }, draw: (tx, ty, x, y, ctx) => drawCheese(tx, ty, x, y, ctx || api.ctx) },
    R: { solid: false, lint: { name: 'Mondsteine', color: '#8F8CB8' }, draw: (tx, ty, x, y, ctx) => drawRocks(tx, ty, x, y, ctx || api.ctx) },
    Y: { solid: false, lint: { name: 'Mondkristalle', color: '#C8E9F7' }, draw: (tx, ty, x, y, ctx) => drawCrystals(tx, ty, x, y, ctx || api.ctx) },
  };

  Object.assign(window.MimoMoon, { glow, rgba, linear });

  window.MimoWorlds.register({
    world: 6,
    palette, nightBlend: 0.8, tiles,
    drawBackground, drawThorn, drawAmbient,
    setup(a) { api = a; },
    drawTile,
    draw(layer, ctx) {
      if (!api.L || !api.L.moon) return;
      if (layer === 'back') drawBases(ctx);
      else if (layer === 'mid') drawLocks(ctx);
      else if (layer === 'front') drawHelmet(ctx);
      else if (layer === 'over') drawDarkness(ctx);
    },
  });
})();
