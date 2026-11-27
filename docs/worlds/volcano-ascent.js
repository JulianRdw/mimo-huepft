// World 5 "Gipfelsturm": the ascent as a picture. The 13 levels climb from the ash beach (0 m) to the crater rim (2.000 m),
// and the background shows it: four height bands that run into each other instead of switching.
//   1 ash beach (43-45): sea, the beach ridge with palms, clouds high in the sky
//   2 mountain forest (46-49): ridges full of ash palms, huts with a lit window, the clouds come down to the horizon
//   3 bare rock (50-53): crags, the clouds lie BELOW as a sea of clouds, through a gap one sees the beach far down
//   4 crater rim (54-55): over the clouds, the summit cross on its knoll against the sky
// Everything follows one number, the height in metres (level field `height`, else the table below by the level's place in
// the world), so a level between two bands looks like something between them. `band` (1..4) only picks the ground
// dressing in volcano-trail.js and can be set by hand. The boss arena keeps its own picture (no ascent there).
// Drawn from volcano-look.js (drawBackground calls sky, horizon, deck and below), screen space, culled, cheap: a few
// paths per layer, gradients made once and reused, colours mixed once per palette change.
(function () {
  'use strict';
  let api = null;
  const TAU = Math.PI * 2, SUMMIT = 2000;
  // [height in m, time to the summit on the signpost] for the 13 levels in their order (43..55)
  const TABLE = [[0, '3 Std.'], [150, '2 ¾ Std.'], [300, '2 ½ Std.'], [450, '2 ¼ Std.'], [600, '2 Std.'], [800, '1 ¾ Std.'],
    [1000, '1 ½ Std.'], [1200, '1 Std.'], [1400, '45 Min.'], [1600, '30 Min.'], [1800, '20 Min.'], [1950, '10 Min.'], [2000, '5 Min.']];
  // where a band starts (m): 2 mountain forest, 3 bare rock, 4 crater rim
  const BAND_AT = [400, 1100, 1900];
  // the cloud deck (m): under it the clouds float in the sky, over it they are a sea of clouds below
  const DECK = 1100;
  const clamp = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const bandOf = (h) => (h >= BAND_AT[2] ? 4 : h >= BAND_AT[1] ? 3 : h >= BAND_AT[0] ? 2 : 1);

  // ---------- the level's place on the mountain ----------
  function resolve(def) {
    const own = (api.levels || []).filter((l) => l && l.world === 5 && !l.bonus), i = own.indexOf(def);
    const row = TABLE[i < 0 ? TABLE.length - 1 : Math.min(i, TABLE.length - 1)];
    const height = typeof def.height === 'number' ? Math.max(0, def.height) : row[0];
    const band = def.band >= 1 && def.band <= 4 ? Math.round(def.band) : bandOf(height);
    return { height, band, toSummit: typeof def.toSummit === 'string' ? def.toSummit : row[1], alt: clamp(height / SUMMIT) };
  }
  // the ascent of the level being played, or null (boss arena, other worlds): then nothing of this file is drawn
  function now() {
    const v = api && api.L && api.L.volcano;
    if (!v || api.mode !== 'level') return null;
    if (!v.ascent || v.ascent.def !== v.def) v.ascent = Object.assign(resolve(v.def || {}), { def: v.def });
    return v.ascent;
  }
  const label = (h) => String(Math.round(h)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' m';

  // ---------- colours: light / dark, mixed towards night once per palette change ----------
  const COL = {
    light: { zenith: '#3A2352', mist: '#FDE0CF', mistShade: '#F6C6B8', mistDeep: '#ECB3B0', mistFar: '#F9D2BF', seaDeep: '#A87390', sand: '#F6CF9E', land: '#7E6A74', boat: '#8C5E48',
      crag: '#6E5076', cragFar: '#9A7894', cragLite: '#A388A8', rim: '#4C3050', rimLite: '#7A5A7E', cross: '#3E2840', crossLite: '#8C6A62', window: '#FFD98E', hut: '#5A3A52' },
    dark: { zenith: '#120B1C', mist: '#B48A98', mistShade: '#9A7286', mistDeep: '#86627A', mistFar: '#A57E90', seaDeep: '#5E3E56', sand: '#BE9672', land: '#4E3E4C', boat: '#6A4636',
      crag: '#4C3456', cragFar: '#6A5070', cragLite: '#6E5880', rim: '#2E1C34', rimLite: '#523A5C', cross: '#1E1424', crossLite: '#6A4C48', window: '#F2B86C', hut: '#3A2438' },
    night: { light: '#4A3658', dark: '#2E2238' },
  };
  let cFor = null, cNight = -1, C = null;
  function col() {
    const W = api.W, n = W.night || 0;
    if (C && cFor === W && cNight === n) return C;
    const base = COL[api.dark ? 'dark' : 'light'], to = COL.night[api.dark ? 'dark' : 'light'], k = n * 0.75;
    C = {};
    for (const key of Object.keys(base)) C[key] = key === 'window' || key === 'zenith' || k <= 0 ? base[key] : api.mixHex(base[key], to, key.startsWith('mist') ? k * 0.8 : k * 0.55);
    cFor = W; cNight = n; return C;
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  let zen = null;
  function zenithGrad(h, c) {
    if (zen && zen.h === h && zen.c === c) return zen.g;
    const g = api.ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgba(c, 1)); g.addColorStop(1, rgba(c, 0));
    zen = { h, c, g }; return g;
  }

  // ---------- 1. the sky: thinner air up high (a deeper top), stays the same colour family ----------
  function sky(ctx, a) {
    const k = smooth(300, SUMMIT, a.height) * 0.42; if (k <= 0) return;
    const v = api.view; ctx.globalAlpha = k; ctx.fillStyle = zenithGrad(Math.round(v.h * 0.62), col().zenith); ctx.fillRect(0, 0, v.w, Math.round(v.h * 0.62)); ctx.globalAlpha = 1;
  }
  // the horizon: far away it hardly moves; in a tall level it sinks softly towards the bottom instead of leaving the screen
  function horizon(hy) {
    const v = api.view, lim = v.h * 0.8, room = v.h * 0.12;
    return hy <= lim ? hy : lim + room * (1 - Math.exp(-(hy - lim) / (v.h * 0.35)));
  }

  // ---------- 2. clouds in the sky (under the deck): flat-bottomed banks that come down to the horizon as we climb ----------
  // one bank: a clump of round tops of different sizes over a flat base (base line at y, w wide), drawn into the path
  function bank(ctx, x, y, w, seed, dy) {
    const n = 3 + Math.floor(api.hash(seed, 3) * 3);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1), mid = 1 - Math.abs(u - 0.45) * 1.3, r = w * (0.1 + 0.12 * mid) * (0.8 + api.hash(seed, i + 5) * 0.5);
      const cx = x + r * 0.8 + u * (w - 1.6 * r), cy = y + dy - r * (0.45 + 0.4 * mid);
      ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU);
    }
    const hb = Math.min(17, w * 0.1), by = y + dy - hb; ctx.moveTo(x + hb, by - hb); ctx.lineTo(x + w - hb, by - hb); ctx.arc(x + w - hb, by, hb, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + hb, by + hb); ctx.arc(x + hb, by, hb, Math.PI / 2, Math.PI * 1.5);
  }
  function deck(ctx, a, hy) {
    const h = a.height, show = 1 - smooth(DECK + 50, DECK + 260, h); if (show <= 0) return;
    const v = api.view, cam = api.cam, c = col(), t = api.reduced ? 0 : api.time;
    // under the deck the banks hang higher the lower we are; at the deck they lie on the horizon
    const near = smooth(0, DECK, h), y0 = hy - 20 - (1 - near) * Math.min(150, hy * 0.6), span = 2100;
    ctx.globalAlpha = show * (0.6 + 0.3 * near);
    // rim light first (shifted up), then the body: a thin bright edge along the tops
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? c.mistShade : c.mist; ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const w = (100 + api.hash(i, 21) * 130) * (0.7 + near * 0.55), sx = ((api.hash(i, 23) * span - cam.x * 0.07 + t * 2.5) % span + span) % span - 300;
        if (sx > v.w + 10 || sx + w < -10) continue;
        bank(ctx, sx, y0 - api.hash(i, 25) * (40 - near * 26), w, i + 1, pass ? 0 : -2.5);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 3. ridges of the island: palms and huts low down, crags up high, the crater rim at the top ----------
  // the ridge line at screen x: soft hills, sharper with `rough`, a knoll where the summit cross stands
  function ridgeY(sx, base, par, amp, seed, rough, knoll) {
    const wx = sx + api.cam.x * par + seed;
    let y = base - Math.sin(wx * 0.011) * amp - Math.sin(wx * 0.011 * 2.7 + 1) * amp * 0.35;
    if (rough > 0) { const saw = Math.abs(((wx * 0.021) % 2 + 2) % 2 - 1), saw2 = Math.abs(((wx * 0.053 + 0.3) % 2 + 2) % 2 - 1); y -= rough * (saw * amp * 1.1 + saw2 * amp * 0.45); }
    if (knoll) { const d = (sx - knoll.x) / knoll.r; y -= knoll.h * Math.exp(-d * d); }
    return y;
  }
  function ridge(ctx, colr, base, par, amp, seed, rough, knoll) {
    const v = api.view; ctx.fillStyle = colr; ctx.beginPath(); ctx.moveTo(0, v.h);
    for (let sx = 0; sx <= v.w + 8; sx += 8) ctx.lineTo(sx, ridgeY(sx, base, par, amp, seed, rough, knoll));
    ctx.lineTo(v.w + 8, v.h); ctx.closePath(); ctx.fill();
  }
  // palm silhouettes standing on a ridge: one path for the trunks, one for the fronds (spacing px, density 0..1, size)
  function palms(ctx, colr, base, par, amp, seed, rough, spacing, density, size) {
    if (density <= 0.02) return;
    const v = api.view, off = api.cam.x * par + seed, i0 = Math.floor(off / spacing) - 1, i1 = i0 + Math.ceil(v.w / spacing) + 2;
    ctx.strokeStyle = colr; ctx.fillStyle = colr; ctx.lineWidth = Math.max(1.5, 2.4 * size); ctx.lineCap = 'round';
    const sway = api.reduced ? 0 : Math.sin(api.time * 0.9) * 0.06;
    ctx.beginPath();
    const tops = [];
    for (let i = i0; i <= i1; i++) {
      if (api.hash(i, seed) > density) continue;
      const sx = i * spacing - off + api.hash(seed, i) * spacing * 0.6, y = ridgeY(sx, base, par, amp, seed, rough) + 2;
      const s = size * (0.75 + api.hash(i, 7) * 0.5), lean = (api.hash(i, 9) - 0.5) * 10 * s, top = y - 26 * s;
      ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx + lean * 0.2, y - 14 * s, sx + lean, top); tops.push(sx + lean, top, s);
    }
    ctx.stroke(); ctx.beginPath();
    for (let j = 0; j < tops.length; j += 3) {
      const x = tops[j], y = tops[j + 1], s = tops[j + 2];
      for (const a of [-2.7, -2.05, -1.35, -0.65, -0.05]) { const r = 11 * s, aa = a + sway, cx = x + Math.cos(aa) * r, cy = y + Math.sin(aa) * r * 0.8 + 2 * s; ctx.moveTo(cx + r, cy); ctx.ellipse(cx, cy, r, 2.6 * s, aa, 0, TAU); }
    }
    ctx.fill();
  }
  // huts on a ridge: a little house with a steep roof, a lit window and a thread of smoke (spacing px, k 0..1 strength)
  function huts(ctx, c, base, par, amp, seed, spacing, k) {
    if (k <= 0.02) return;
    const v = api.view, off = api.cam.x * par + seed, i0 = Math.floor(off / spacing) - 1, i1 = i0 + Math.ceil(v.w / spacing) + 1, t = api.reduced ? 0 : api.time;
    for (let i = i0; i <= i1; i++) {
      if (api.hash(i, seed + 3) > 0.75) continue;
      const sx = i * spacing - off + spacing * 0.3 + api.hash(i, seed) * spacing * 0.4, y = ridgeY(sx, base, par, amp, seed, 0) + 3;
      if (sx < -30 || sx > v.w + 30) continue;
      ctx.globalAlpha = k; ctx.fillStyle = c.hut;
      ctx.fillRect(sx - 9, y - 11, 18, 11);
      ctx.beginPath(); ctx.moveTo(sx - 13, y - 10); ctx.lineTo(sx, y - 22); ctx.lineTo(sx + 13, y - 10); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx + 4, y - 22, 3, 7);
      ctx.fillStyle = c.window; ctx.globalAlpha = k * (0.75 + 0.25 * (api.W.night || 0) / 0.6); ctx.fillRect(sx - 5, y - 8, 4, 4);
      ctx.fillStyle = c.mistShade; ctx.globalAlpha = k * 0.5;
      for (let j = 0; j < 3; j++) { const q = (t * 0.12 + j / 3 + i * 0.37) % 1; ctx.globalAlpha = k * 0.45 * (1 - q); ctx.beginPath(); ctx.arc(sx + 6 + q * 14, y - 26 - q * 26, 2 + q * 4, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  // the summit cross: two beams and a little metal box (the summit book), standing at x, y, s pixels per unit
  function cross(ctx, x, y, s, c) {
    // at night the dark cross would vanish in the dark sky: it takes on a little of the moonlit clouds
    const n = api.W.night || 0;
    ctx.fillStyle = n > 0 ? api.mixHex(c.cross, c.mistShade, n * 0.7) : c.cross;
    ctx.fillRect(x - 1.6 * s, y - 30 * s, 3.2 * s, 30 * s); ctx.fillRect(x - 9 * s, y - 23 * s, 18 * s, 3 * s);
    ctx.fillRect(x - 0.8 * s, y - 33 * s, 1.6 * s, 3 * s);
    if (s >= 1) ctx.fillRect(x + 1.6 * s, y - 12 * s, 3.4 * s, 4 * s);
    ctx.fillStyle = c.crossLite; ctx.globalAlpha = 0.7; ctx.fillRect(x - 1.6 * s, y - 30 * s, 1 * s, 30 * s); ctx.fillRect(x - 9 * s, y - 23 * s, 18 * s, 1 * s); ctx.globalAlpha = 1;
  }

  // ---------- 4. the sea of clouds below, with a gap down to the beach ----------
  // a row of the sea of clouds: broad low domes over a filled body down to the bottom of the screen, with a thin rim light
  function puffRow(ctx, y, r0, par, seed, colr, hi) {
    const v = api.view, step = r0 * 1.25, off = api.cam.x * par + seed * 37 + (api.reduced ? 0 : api.time * 1.2), i0 = Math.floor(off / step) - 2, i1 = i0 + Math.ceil(v.w / step) + 4;
    for (let pass = 0; pass < 2; pass++) {
      const dy = pass ? 0 : -2.5;
      ctx.fillStyle = pass ? colr : hi; ctx.beginPath(); ctx.rect(0, y + dy + r0 * 0.35, v.w, v.h - y);
      for (let i = i0; i <= i1; i++) {
        // a group of three: a big dome with smaller ones on its shoulders, so the row undulates instead of repeating
        const g = api.hash(i, seed), r = r0 * (i % 3 === 0 ? 1.15 + g * 0.35 : 0.5 + g * 0.45), x = i * step - off + (api.hash(seed, i) - 0.5) * step * 0.6, cy = y + dy + r * 0.7 - (i % 3 === 0 ? r0 * 0.12 : 0);
        ctx.moveTo(x + r, cy); ctx.arc(x, cy, r, 0, TAU);
      }
      ctx.fill();
    }
  }
  // the sea of clouds in two steps: the far rows (then the far crags stick out of them), then the gap and the near row
  function carpetTop(a, hy) { return hy - 34 - smooth(DECK, SUMMIT, a.height) * 8; }
  function carpetFar(ctx, a, hy, k) {
    const c = col(), top = carpetTop(a, hy);
    ctx.globalAlpha = k;
    puffRow(ctx, top, 16, 0.04, 1, c.mistFar, c.mist);
    puffRow(ctx, top + 16, 24, 0.07, 2, c.mistShade, c.mistFar);
    ctx.globalAlpha = 1;
  }
  function carpetNear(ctx, a, hy, k) {
    const c = col(), top = carpetTop(a, hy);
    ctx.globalAlpha = k;
    if (k > 0.5) beachGap(ctx, a, top + 40, k);
    puffRow(ctx, top + 50, 34, 0.11, 3, c.mistDeep, c.mistShade);
    ctx.globalAlpha = 1;
  }
  // the gap: a hole in the clouds, and far below the beach of the first level with the boat and the palms
  function beachGap(ctx, a, y, k) {
    const v = api.view, c = col(), s = 1.15 - 0.4 * smooth(DECK, SUMMIT, a.height), span = v.w + 500;
    const x = ((v.w * 0.3 - api.cam.x * 0.06) % span + span) % span - 200, rx = 62 * s, ry = 14 * s;
    if (x + rx < 0 || x - rx > v.w) return;
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = c.seaDeep; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    ctx.fillStyle = c.land; ctx.beginPath(); ctx.ellipse(x + 10 * s, y + 9 * s, 44 * s, 11 * s, -0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = c.sand; ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 3 * s, 38 * s, 6 * s, -0.08, Math.PI, TAU); ctx.ellipse(x + 6 * s, y + 3 * s, 38 * s, 2.2 * s, -0.08, 0, Math.PI); ctx.fill();
    // the boat on the sand and three palms
    ctx.fillStyle = c.boat; ctx.fillRect(x - 16 * s, y - 1 * s, 9 * s, 2.4 * s); ctx.fillStyle = c.mist; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 1 * s); ctx.lineTo(x - 12 * s, y - 7 * s); ctx.lineTo(x - 8 * s, y - 1.5 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.land; ctx.lineWidth = 1.2 * s; ctx.beginPath();
    for (const px of [10, 18, 27]) { ctx.moveTo(x + px * s, y + 3 * s); ctx.lineTo(x + (px + 1) * s, y - 4 * s); ctx.moveTo(x + (px - 3) * s, y - 3 * s); ctx.lineTo(x + (px + 4) * s, y - 5 * s); }
    ctx.stroke();
    ctx.fillStyle = c.mistFar; ctx.globalAlpha = 0.28 * k; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    ctx.restore(); ctx.globalAlpha = k;
    // soft puffs round the rim of the gap
    ctx.fillStyle = c.mistShade; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU, r = (5 + api.hash(i, 61) * 4) * s, px = x + Math.cos(an) * rx, py = y + Math.sin(an) * ry; ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
    ctx.fill();
  }

  // ---------- what drawBackground calls (volcano-look.js) ----------
  // below(ctx, a, hy): everything under the horizon after the sea: the sea of clouds, the ridges, the crater rim
  function below(ctx, a, hy) {
    const h = a.height, c = col(), W = api.W, v = api.view;
    // weights over the height, so neighbouring levels share most of their picture
    const rough = smooth(650, 1250, h), palmK = (0.35 + 0.65 * smooth(250, 500, h)) * (1 - smooth(800, 1150, h)), hutK = smooth(380, 520, h) * (1 - smooth(1000, 1150, h));
    const lift = smooth(250, 650, h) * (1 - smooth(900, 1300, h) * 0.5), rim = smooth(1850, 1950, h), sea = smooth(DECK - 100, DECK + 150, h), farK = smooth(250, 450, h);
    if (sea > 0) carpetFar(ctx, a, hy, sea);
    // far ridge: the slopes of the mountain around us, with forest and huts in the middle band; up high distant crags
    // stick out of the sea of clouds
    if (farK > 0) {
      const base = hy + 12 - 46 * lift, farCol = rough > 0 ? api.mixHex(W.hillFar, c.cragFar, rough) : W.hillFar;
      ctx.globalAlpha = farK; ridge(ctx, farCol, base, 0.2, 12, 300, rough * 0.9);
      palms(ctx, farCol, base, 0.2, 12, 300, rough * 0.9, 24, palmK * 0.9, 0.62);
      huts(ctx, c, base, 0.2, 12, 300, 460, hutK * farK);
      ctx.globalAlpha = 1;
    }
    if (sea > 0) carpetNear(ctx, a, hy, sea);
    // near ridge: beach hills with palms, forest, crags; at the rim the knoll with the summit cross against the sky
    const nearBase = Math.min(v.h + 40, hy + 34 - 26 * lift * (1 - rough) + rough * 14), knoll = rim > 0 ? { x: v.w * 0.11 - api.cam.x * 0.02, r: 120, h: 190 * rim } : null;
    const nearCol = rough > 0 ? api.mixHex(W.hillNear, rim > 0 ? c.rim : c.crag, Math.max(rough, rim)) : W.hillNear;
    ridge(ctx, nearCol, nearBase, 0.32, 22, 7, rough, knoll);
    palms(ctx, nearCol, nearBase, 0.32, 22, 7, rough, 44, palmK, 1);
    if (rough > 0.3) { // a light edge on the crags, the side towards the sun
      ctx.strokeStyle = rim > 0 ? c.rimLite : c.cragLite; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 * rough; ctx.beginPath();
      for (let sx = 0; sx <= v.w + 8; sx += 8) { const y = ridgeY(sx, nearBase, 0.32, 22, 7, rough, knoll) + 1.5; if (sx === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (knoll && knoll.x > -40 && knoll.x < v.w + 40) cross(ctx, knoll.x, ridgeY(knoll.x, nearBase, 0.32, 22, 7, rough, knoll) + 3, 2 * rim, c);
  }
  // the little cross on the crater rim of the far cone (cone units, scaled with the cone): the goal, seen from below
  function coneCross(ctx, a, x, y) {
    if (a.band >= 4) return;
    cross(ctx, x, y, 0.55, col());
  }

  window.MimoVolcano = Object.assign(window.MimoVolcano || {}, {
    ascent: { now, sky, horizon, deck, below, coneCross, label, resolve: (def) => resolve(def || {}), bandOf, TABLE, BAND_AT, DECK, SUMMIT, colors: col },
  });
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; } });
})();
