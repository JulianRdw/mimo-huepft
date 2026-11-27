// World 5 boss "Drache Fauch": the picture of the fight (after the approved mockup): the head with its moods, the fire
// and its warning, the glowing blobs, the cold water pipe with the lever and the shower, steam, the baby horns.
// The shaft, the body, the song and the costume: volcano-boss-look.js. Shapes come from volcano-boss-shape.js, so what is
// drawn is what burns or carries. Kept cheap for old iPhones: no shadowBlur, every gradient is made once and moved with
// translate/scale, nothing is allocated per frame. Layers: draw (before Mimo) = pipes, warnings, head, lever, water;
// drawFront (over Mimo) = fire, steam, the horns.
(function () {
  'use strict';
  let api = null;
  const F = () => window.MimoFauch;
  const TAU = Math.PI * 2;

  // ---------- colours: light, dark; night pulls the dragon a little towards the dusk ----------
  const LIGHT = { body: '#E8807A', lite: '#F9CDB6', belly: '#FBDCC8', spike: '#F6D374', horn: '#FBEFD9', hornInk: '#E2C9A2', ink: '#3A2E48', blush: '#F4B4C0',
    tongue: '#F27E92', mouth: '#5B2A3A', pipe: '#9CC7E0', pipeDark: '#7FB2D0', pipeHi: '#D7EEF8', water: '#BFE3F2', steam: '#F6F0FA', lever: '#F2A7BC', leverInk: '#B9708A',
    fire0: '#FF9A5C', fire1: '#FFC978', fire2: '#FFF3C4', warn: '#FF8C6E', slab: '#5F4A68', slabTop: '#93779A', crack: '#FF9A5C', drop: '#9CD3EE' };
  const DARK = { body: '#CF6F6C', lite: '#E9B9A2', belly: '#EBC7B3', spike: '#E8C766', horn: '#ECE2CF', hornInk: '#C9B08C', ink: '#20182C', blush: '#D898A6',
    tongue: '#DD6A80', mouth: '#3E1C28', pipe: '#86B2CC', pipeDark: '#6A9AB8', pipeHi: '#BCD9E8', water: '#A9D4E6', steam: '#D9D0E2', lever: '#D48CA2', leverInk: '#9A5A72',
    fire0: '#FF8A50', fire1: '#FFC16A', fire2: '#FFEFC0', warn: '#FF8C6E', slab: '#4C3C56', slabTop: '#76628A', crack: '#FF9050', drop: '#86C2E0' };
  const NIGHT_TO = '#3E4470', NIGHT_MIX = 0.2, NIGHT_KEYS = ['body', 'lite', 'belly', 'horn', 'pipe', 'pipeDark', 'lever'];
  let palFor = null, palDark = null, pal = null;
  function colours() {
    const W = api.W, dark = api.dark;
    if (palFor === W && palDark === dark && pal) return pal;
    const base = dark ? DARK : LIGHT, n = (W.night || 0) * NIGHT_MIX;
    pal = { ...base };
    if (n > 0) for (const k of NIGHT_KEYS) pal[k] = api.mixHex(base[k], NIGHT_TO, n);
    palFor = W; palDark = dark;
    return pal;
  }

  // ---------- helpers and cached gradients (a radial glow of radius 100 at the origin, scaled into place) ----------
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function fill(ctx, col, a) { ctx.fillStyle = col; if (a != null) ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fill(); ctx.globalAlpha = 1; }
  const glows = {};
  function glowGrad(col) {
    const g0 = glows[col]; if (g0) return g0;
    const n = parseInt(col.slice(1), 16), rgb = (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    const g = api.ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.45, 'rgba(' + rgb + ',0.45)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    glows[col] = g; return g;
  }
  function glow(ctx, x, y, rx, ry, col, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(rx / 100, ry / 100); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = glowGrad(col);
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fill(); ctx.restore();
  }
  const seen = (x0, y0, x1, y1) => { const c = api.cam, v = api.view; return x1 > c.x - 40 && x0 < c.x + v.w + 40 && y1 > c.y - 40 && y0 < c.y + v.h + 40; };
  const phase = (B) => api.boss.phase(B);

  // ---------- the head (drawn facing left; facing right is the same picture mirrored) ----------
  function mood(B) {
    if (B.done) return B.fin && B.fin.peek ? 'happy' : 'sneeze';
    if (B.roar > 0) return 'roar';
    if (B.state === 'hurt' || B.wet > 0.75) return 'wet';
    if (B.state === 'pant') return 'pant';
    if (B.state === 'wake') return 'wake';
    if (B.state === 'charge') return 'charge';
    if (B.state === 'breathe') return 'fire';
    return 'angry';
  }
  // after a cold shower he glances worried at the egg for about a second: a turn of the head (radians in the picture, the world
  // frame) and how much of it (0..1). Only a picture: nothing of the fight reads this. B.worryAt is set by douse() (volcano-boss.js)
  const WORRY = { FROM: 0.55, IN: 0.35, HOLD: 0.45, OUT: 0.35, MAX: 0.55 };
  function worry(B, h) {
    if (B.worryAt == null || B.done || B.fin) return WORRY0;
    const k = api.time - B.worryAt, a = Math.max(0, Math.min(1, (k - WORRY.FROM) / WORRY.IN)), o = Math.max(0, Math.min(1, (k - WORRY.FROM - WORRY.IN - WORRY.HOLD) / WORRY.OUT));
    const env = a * a * (3 - 2 * a) * (1 - o * o * (3 - 2 * o)); if (env <= 0) return WORRY0;
    const n = window.MimoFauch && window.MimoFauch.nestNow ? window.MimoFauch.nestNow(B) : null; if (!n) return WORRY0;
    let d = Math.atan2(n.y - 20 - h.y, n.x - h.x) - (h.f > 0 ? 0 : Math.PI);
    d = Math.atan2(Math.sin(d), Math.cos(d));
    WORRY_OUT.k = env; WORRY_OUT.rot = Math.max(-WORRY.MAX, Math.min(WORRY.MAX, d)); return WORRY_OUT;
  }
  const WORRY0 = Object.freeze({ k: 0, rot: 0 }), WORRY_OUT = { k: 0, rot: 0 };
  // shapes of the head, made once (no arrays per frame): horns (base, tip, width), horn rings, neck spikes, teeth
  const HORNS = [[16, -34, 34, -84, 11], [40, -28, 64, -70, 9]], RINGS = [[14, -46], [19, -58], [40, -40], [46, -50]];
  const SPIKES = [[58, -14, 11], [62, 10, 10], [58, 32, 9]], TEETH = [-100, -84, -68];
  function drawHorns(ctx, c, k) {
    ctx.fillStyle = c.horn;
    for (const [bx, by, tx, ty, w] of HORNS) {
      ctx.beginPath(); ctx.moveTo(bx - w, by + 4); ctx.quadraticCurveTo(bx - w * 0.2, by - 30 * k, tx, ty); ctx.quadraticCurveTo(bx + w * 0.6, by - 20 * k, bx + w, by + 2); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = c.hornInk; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
    for (const [x, y] of RINGS) { ctx.moveTo(x - 6, y + 2); ctx.lineTo(x + 5, y - 1); }
    ctx.stroke();
  }
  function drawHead(ctx, B, h, c) {
    if (!seen(h.x - 180, h.y - 120, h.x + 180, h.y + 80)) return;
    const md = mood(B), t = api.time, body = api.boss.col(B, B.wet > 0.05 ? api.mixHex(c.body, '#C9A0C8', B.wet * 0.35) : c.body);
    const open = md === 'fire' || md === 'roar' ? 1 : md === 'charge' ? 0.25 + 0.1 * Math.sin(t * 20) : md === 'pant' ? 0.55 + 0.12 * Math.sin(t * 6) : md === 'sneeze' ? 0.8 : md === 'happy' ? 0.3 : 0.08;
    const bob = md === 'pant' ? Math.sin(t * 3) * 1.5 : 0;
    const care = worry(B, h);
    ctx.save(); ctx.translate(h.x, h.y + bob); if (care.k > 0) ctx.rotate(care.rot * care.k); if (h.f > 0) ctx.scale(-1, 1);
    // back spikes on the neck, horns, the skull, the snout
    ctx.fillStyle = c.spike; ctx.beginPath();
    for (const [x, y, r] of SPIKES) { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 1.5, y); ctx.lineTo(x, y + r); }
    ctx.fill();
    drawHorns(ctx, c, 1);
    api.rr(-62, -42, 124, 84, 38); fill(ctx, body);
    api.rr(-112, -12, 76, 46, 20); fill(ctx, body);
    // jaw: the lower part of the snout opens
    const jaw = open * 18;
    ctx.save(); ctx.translate(-40, 22); ctx.rotate(-open * 0.32);
    if (open > 0.15) { api.rr(-74, -6, 70, 16 + jaw * 0.4, 8); fill(ctx, c.mouth); }
    api.rr(-74, 4 + jaw * 0.2, 72, 14, 7); fill(ctx, body);
    ell(ctx, -34, 14 + jaw * 0.2, 30, 5); fill(ctx, c.lite, 0.6);
    if (md === 'pant') { ell(ctx, -60, 14 + jaw * 0.3, 11, 6, 0.3); fill(ctx, c.tongue); }
    ctx.restore();
    // teeth on the upper jaw
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
    for (const x of TEETH) { ctx.moveTo(x - 4, 21); ctx.lineTo(x, 29); ctx.lineTo(x + 4, 21); }
    ctx.fill();
    // nostril, cheek, belly of the jaw
    ell(ctx, -100, -2, 4, 3.4); fill(ctx, c.ink, 0.6);
    ell(ctx, 12, 18, 14, 8); fill(ctx, c.blush, md === 'happy' || md === 'wet' ? 0.95 : 0.7);
    drawEye(ctx, B, h, md, c, care.k);
    // while he rests, the top of the snout and of the skull shine a little: they are steps
    if (md === 'pant') { const a = 0.55 + 0.35 * Math.sin(t * 5); api.rr(-106, -15, 40, 6, 3); fill(ctx, c.belly, a); api.rr(-46, -45, 54, 6, 3); fill(ctx, c.belly, a * 0.8); }
    ctx.restore();
    // smoke from the nostril (charging, panting); drops and steam while wet
    const nx = h.x + h.f * 100, ny = h.y - 4 + bob;
    if ((md === 'charge' || md === 'pant' || md === 'wake') && !api.reduced) {
      for (let i = 0; i < 3; i++) { const k = (t * (md === 'charge' ? 2.2 : 1.1) + i / 3) % 1; ell(ctx, nx + h.f * (6 + k * 16), ny - 6 - k * 26, 3 + k * 7, 3 + k * 7); fill(ctx, md === 'charge' ? c.fire1 : c.steam, (1 - k) * 0.7); }
    }
    if (B.wet > 0.05 && !api.reduced) {
      for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i / 5) % 1, x = h.x + (api.hash(i, 9) - 0.5) * 110; ell(ctx, x, h.y - 30 + k * 70, 2.2, 3.4); fill(ctx, c.drop, B.wet * (1 - k)); }
      for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; ell(ctx, h.x + (i - 1) * 34, h.y - 50 - k * 50, 8 + k * 10, 8 + k * 10); fill(ctx, c.steam, B.wet * 0.55 * (1 - k)); }
    }
  }
  function drawEye(ctx, B, h, md, c, care) {
    const ink = c.ink, ex = -18, ey = -12, p = api.p;
    if (care > 0.25 && md === 'wet') md = 'worry';
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (md === 'wet' || md === 'sneeze') {
      ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(ex - 12, ey - 10); ctx.lineTo(ex + 8, ey); ctx.lineTo(ex - 12, ey + 10); ctx.stroke();
      return;
    }
    if (md === 'happy') { ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(ex, ey + 6, 12, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); return; }
    ell(ctx, ex, ey, 16, 16); fill(ctx, '#FFFFFF');
    // the pupil looks at Mimo (in the head's own mirrored space)
    let lx = -6, ly = 3;
    if (p) { const dx = (p.x + p.w / 2 - h.x) * -h.f, dy = p.y + 10 - h.y, d = Math.hypot(dx, dy) || 1; lx = dx / d * 6; ly = dy / d * 5; }
    if (care > 0) { lx += (-6 - lx) * care; ly += (-3 - ly) * care; }   // the pupil goes with the head, towards the nest
    const small = md === 'charge' ? 0.42 : 0.55;
    ell(ctx, ex + lx, ey + ly, 16 * small, 16 * small); fill(ctx, ink);
    ell(ctx, ex + lx - 3, ey + ly - 4, 3, 3); fill(ctx, '#FFFFFF');
    if (md === 'pant' || md === 'wake') { api.rr(ex - 18, ey - 18, 36, md === 'pant' ? 16 : 11, 6); fill(ctx, api.boss.col(B, c.body)); }
    // the angry brow (flat and tired while he rests)
    const tilt = md === 'pant' ? -2 : md === 'charge' ? 9 : 6;
    ctx.lineWidth = 5; ctx.beginPath();
    if (md === 'worry') { ctx.moveTo(ex - 20, ey - 17); ctx.lineTo(ex + 16, ey - 28); } else { ctx.moveTo(ex - 22, ey - 22 - tilt * 0.3); ctx.lineTo(ex + 18, ey - 16 + tilt); }
    ctx.stroke();
  }

  // ---------- warnings: the throat glows, the band of the shaft and its ledges light up ----------
  function drawCharge(ctx, B, c) {
    const br = B.breath; if (!br || (B.state !== 'charge' && B.state !== 'track')) return;
    const tp = F().TEMPO[phase(B)], dur = br.n ? tp.charge2 : tp.charge, k = B.state === 'charge' ? Math.min(1, B.t / dur) : 0;
    const h = B.head, m = F().mouth(h), feet = br.feet, pulse = 0.5 + 0.5 * Math.sin(api.time * (B.state === 'charge' ? 16 : 7));
    glow(ctx, h.x - h.f * 6, h.y + 26, 60 + 40 * k, 40 + 26 * k, c.fire0, 0.35 + 0.5 * k);
    if (B.state !== 'charge') return;
    // the band over the whole shaft
    const x0 = 2 * F().T, x1 = F().W - 2 * F().T, top = feet - F().FIRE.BAND_UP, hgt = F().FIRE.BAND_UP + F().FIRE.BAND_DOWN;
    ctx.fillStyle = c.warn; ctx.globalAlpha = (0.08 + 0.16 * k) * (0.6 + 0.4 * pulse); ctx.fillRect(x0, top, x1 - x0, hgt); ctx.globalAlpha = 1;
    // every ledge top in the band glows, with heat waves over it
    const row = Math.round(feet / F().T), L = api.L, T0 = F().T;
    ctx.strokeStyle = c.warn; ctx.lineCap = 'round';
    for (let tx = 2; tx < L.w - 2; tx++) {
      if (!api.isSolid(tx, row) && api.tileAt(tx, row) !== api.TILE.ONEWAY) continue;
      if (api.isSolid(tx, row - 1)) continue;
      ctx.globalAlpha = 0.55 + 0.45 * pulse; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx * T0 + 2, row * T0 + 1); ctx.lineTo(tx * T0 + T0 - 2, row * T0 + 1); ctx.stroke();
      if (!api.reduced) { const q = (api.time * 1.6 + tx * 0.37) % 1; ctx.globalAlpha = (1 - q) * 0.7 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx * T0 + 10, row * T0 - 4 - q * 30); ctx.quadraticCurveTo(tx * T0 + 16, row * T0 - 10 - q * 30, tx * T0 + 10, row * T0 - 16 - q * 30); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // little flames lick out of the mouth
    flame(ctx, m.x, m.y, h.f, 16 + 22 * k, 0.35 + 0.25 * k, c, 0.9);
  }
  // a flame from (x, y) in direction f, length len, half height hh (share of the band), alpha a: three layers
  const FLAME_W = [1, 0.66, 0.3];
  function flame(ctx, x, y, f, len, hh, c, a) {
    const t = api.time, fl = api.reduced ? 0 : Math.sin(t * 22) * 4, band = F().FIRE.BAND_UP * hh;
    for (let j = 0; j < 3; j++) {
      const w = FLAME_W[j], col = j === 0 ? c.fire0 : j === 1 ? c.fire1 : c.fire2, ww = band * w;
      ctx.beginPath(); ctx.moveTo(x, y - ww * 0.35);
      ctx.quadraticCurveTo(x + f * len * 0.55, y - ww + fl, x + f * len, y + fl * 0.5);
      ctx.quadraticCurveTo(x + f * len * 0.55, y + ww - fl, x, y + ww * 0.35); ctx.closePath();
      fill(ctx, col, a * (w === 1 ? 0.92 : 1));
    }
  }
  // the fire jet: three layers with a wavy, flickering edge, thin at the mouth, fullest on the way, a point at the end
  const JET_N = 14;
  function jet(ctx, x, y, f, len, c, a) {
    const t = api.reduced ? 0 : api.time, band = F().FIRE.BAND_UP * 0.55;
    for (let j = 0; j < 3; j++) {
      const w = FLAME_W[j] * band, col = j === 0 ? c.fire0 : j === 1 ? c.fire1 : c.fire2;
      ctx.beginPath(); ctx.moveTo(x, y - w * 0.3);
      for (let i = 1; i <= JET_N; i++) { const k = i / JET_N, pr = (0.35 + 0.65 * Math.sin(Math.min(1, k * 1.25) * Math.PI / 2)) * (k > 0.86 ? (1 - k) / 0.14 : 1); ctx.lineTo(x + f * len * k, y - w * pr - Math.sin(t * 21 + k * 13 + j) * 4 * k); }
      for (let i = JET_N; i >= 1; i--) { const k = i / JET_N, pr = (0.35 + 0.65 * Math.sin(Math.min(1, k * 1.25) * Math.PI / 2)) * (k > 0.86 ? (1 - k) / 0.14 : 1); ctx.lineTo(x + f * len * k, y + w * pr + Math.sin(t * 19 + k * 11 + j * 2) * 4 * k); }
      ctx.lineTo(x, y + w * 0.3); ctx.closePath(); fill(ctx, col, a * (j === 0 ? 0.92 : 1));
    }
  }
  function drawFire(ctx, B, c) {
    const br = B.breath; if (!br || B.state !== 'breathe' || br.len <= 0) return;
    const F0 = F().FLAME, k = B.t, fade = k > F0.GROW + F0.FULL ? 1 - (k - F0.GROW - F0.FULL) / F0.FADE : 1, h = B.head, m = F().mouth(h);
    glow(ctx, m.x + h.f * br.len * 0.5, m.y, br.len * 0.6 + 40, 70, c.fire0, 0.45 * fade);
    jet(ctx, m.x, m.y, h.f, br.len, c, fade);
    // tongues of fire licking up where it meets the wall
    if (!api.reduced && fade > 0.3) {
      const ex = m.x + h.f * br.len;
      for (let i = 0; i < 4; i++) { const q = (api.time * 3 + i / 4) % 1; ell(ctx, ex - h.f * (i * 30 + 10), m.y - 14 - q * 40, 9 * (1 - q), 13 * (1 - q)); fill(ctx, i % 2 ? c.fire1 : c.fire0, 0.8 * fade * (1 - q)); }
      if (Math.random() < 0.5) api.G.particles.push({ x: m.x + h.f * Math.random() * br.len, y: m.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, life: 0, max: 0.5, r: 2.2, color: c.fire1, grav: -60, rect: false, rot: 0 });
    }
  }

  // ---------- the pipe, the lever and the shower ----------
  function drawPipe(ctx, B, s, c) {
    const sec = F().SEC[s], sp = F().spout(s), lv = F().lever(s), py = F().secY(s, F().SHOWER.PIPE_R), wall = sec.side > 0 ? F().W - 2 * F().T : 2 * F().T;
    if (!seen(Math.min(wall, lv.x) - 20, py - 30, Math.max(wall, lv.x) + 20, lv.y + 10)) return;
    const x0 = Math.min(wall, lv.x), x1 = Math.max(wall, lv.x);
    api.rr(x0 - 6, py - 6, x1 - x0 + 12, 12, 6); fill(ctx, c.pipe);
    api.rr(x0 - 6, py - 5, x1 - x0 + 12, 3, 1.5); fill(ctx, c.pipeHi, 0.8);
    api.rr(lv.x - 6, py - 6, 12, lv.y - py - 10, 6); fill(ctx, c.pipe);
    api.rr(wall - (sec.side > 0 ? 4 : 10), py - 10, 14, 20, 4); fill(ctx, c.pipeDark);
    // the shower head over the resting head: a short pipe and a wide rose with holes
    api.rr(sp.x - 6, py, 12, sp.y - py - 8, 3); fill(ctx, c.pipe);
    ctx.beginPath(); ctx.moveTo(sp.x - 9, sp.y - 12); ctx.lineTo(sp.x + 9, sp.y - 12); ctx.lineTo(sp.x + ROSE, sp.y); ctx.lineTo(sp.x - ROSE, sp.y); ctx.closePath(); fill(ctx, c.pipeDark);
    api.rr(sp.x - ROSE - 2, sp.y - 3, ROSE * 2 + 4, 6, 3); fill(ctx, c.pipe);
    ctx.fillStyle = c.pipeDark; for (let i = -2; i <= 2; i++) { ctx.fillRect(sp.x + i * 7 - 1, sp.y + 1, 2, 2); }
    // drips while nothing flows
    if (!B.water && !api.reduced) { const k = (api.time * 0.9) % 1; ell(ctx, sp.x + 7, sp.y + 2 + k * 26, 1.8, 2.8); fill(ctx, c.water, 1 - k); }
  }
  const ROSE = 20, SPRAY = 26;
  function drawLever(ctx, B, s, c) {
    const lv = F().lever(s), side = F().SEC[s].side, k = B.leverK, a = F().lerp(-0.85, 0.55, k) * side;
    if (!seen(lv.x - 40, lv.y - 60, lv.x + 40, lv.y + 4)) return;
    api.rr(lv.x - 13, lv.y - 18, 26, 18, 5); fill(ctx, c.pipeDark);
    ctx.save(); ctx.translate(lv.x, lv.y - 13); ctx.rotate(a);
    api.rr(-3, -30, 6, 30, 3); fill(ctx, c.leverInk);
    ell(ctx, 0, -32, 8, 8); fill(ctx, c.lever);
    ell(ctx, -2, -35, 2.6, 2.6); fill(ctx, '#FFFFFF', 0.8);
    ctx.restore();
    // while Fauch rests the lever shines: this is the moment
    if (F().resting(B) && !B.water && !api.reduced) { const q = (api.time * 1.6) % 1; ell(ctx, lv.x, lv.y - 30, 14 + q * 16, 14 + q * 16); ctx.strokeStyle = api.P.star; ctx.lineWidth = 3; ctx.globalAlpha = 0.8 * (1 - q); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  function drawWater(ctx, B, s, c) {
    const w = B.water; if (!w) return;
    const sp = F().spout(s), tail = w.t > F().WATER.ON ? sp.y + (w.t - F().WATER.ON) * F().WATER.SPEED : sp.y, y0 = Math.min(tail, w.front);
    if (w.front - y0 < 2) return;
    // a fan of streams from the rose, wider further down, with bright dashes running down
    const len = w.front - sp.y, a0 = (y0 - sp.y) / Math.max(1, len);
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const xa = sp.x + i * 7, xb = sp.x + i * (7 + SPRAY * 0.4), x0 = F().lerp(xa, xb, a0);
      ctx.strokeStyle = c.water; ctx.lineWidth = 6; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xb, w.front); ctx.stroke();
      if (!api.reduced) { const q = (api.time * 2.6 + i * 0.37) % 1, yy = y0 + q * (w.front - y0); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(F().lerp(xa, xb, (yy - sp.y) / Math.max(1, len)), yy); ctx.lineTo(F().lerp(xa, xb, Math.min(1, (yy + 14 - sp.y) / Math.max(1, len))), Math.min(w.front, yy + 14)); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- glowing blobs (phase 2) and the hot slab of the first scene ----------
  function drawBlobSpots(ctx, B, c) {
    for (const s of B.shots) {
      if (s.type !== 'fauchBlob') continue;
      const k = Math.min(1, s.t / 0.9), pulse = 0.5 + 0.5 * Math.sin(api.time * 18);
      glow(ctx, s.tx, s.ty + s.r, 34, 12, c.fire0, 0.3 + 0.5 * k);
      ell(ctx, s.tx, s.ty + s.r, 12 + 10 * k, 4 + 2 * k); ctx.strokeStyle = c.warn; ctx.lineWidth = 3; ctx.globalAlpha = (0.5 + 0.5 * k) * (0.6 + 0.4 * pulse); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  function drawShot(B, s, ctx) {
    if (s.type !== 'fauchBlob') return;
    const c = colours();
    glow(ctx, 0, 0, 26, 26, c.fire0, 0.7);
    ell(ctx, 0, 0, s.r, s.r); fill(ctx, c.fire0);
    ell(ctx, -2, -2, s.r * 0.5, s.r * 0.5); fill(ctx, c.fire2);
  }
  function drawSlab(ctx, B, c) {
    const sl = B.slab; if (!sl) return;
    const T0 = F().T;
    glow(ctx, sl.x + sl.w / 2, sl.y + T0, sl.w * 0.7, 40, c.fire0, 0.6);
    ctx.fillStyle = api.W.ground || c.slab; ctx.fillRect(sl.x, sl.y, sl.w, T0);
    api.rr(sl.x, sl.y, sl.w, 7, 3); fill(ctx, api.W.groundEdge || c.slabTop);
    // one glowing crack along the slab, it came straight out of the lava
    ctx.strokeStyle = c.crack; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(sl.x + 8, sl.y + 18);
    for (let x = sl.x + 22, i = 0; x < sl.x + sl.w - 6; x += 14, i++) ctx.lineTo(x, sl.y + (i % 2 ? 14 : 22));
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  // ---------- steam and the baby horns ----------
  function drawPuffs(ctx, B, c) {
    for (const q of B.puffs) { const k = q.t / q.life, r = q.r * (0.6 + k * 1.2); ell(ctx, q.x, q.y, r, r); fill(ctx, c.steam, 0.88 * (1 - k * k)); }
  }
  // Mimo's horns: two small cream horns with a coral spot at the base; the origin is the top of his head
  function drawBabyHorns(ctx, c) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = c.horn; ctx.beginPath(); ctx.moveTo(s * 2.5, 1); ctx.quadraticCurveTo(s * 4, -6, s * 9.5, -10.5); ctx.quadraticCurveTo(s * 8.5, -4, s * 8.5, 1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.hornInk; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(s * 4.6, -2.6); ctx.lineTo(s * 7.6, -3.4); ctx.moveTo(s * 6.2, -5.8); ctx.lineTo(s * 8.4, -6.4); ctx.stroke();
      ell(ctx, s * 5.6, 1.4, 3.6, 1.6); fill(ctx, c.body);
    }
  }

  // ---------- the hooks the boss part calls ----------
  function draw(B, ctx) {
    const c = colours(), s = phase(B);
    const pipeS = B.scenePending != null ? s - 1 : s;
    if (!(B.scene && B.scene.ph === 1 && B.scene.broke)) drawPipe(ctx, B, pipeS, c);
    if (B.scene) drawPipe(ctx, B, B.scene.ph, c);
    drawBlobSpots(ctx, B, c);
    drawCharge(ctx, B, c);
    drawHead(ctx, B, B.head, c);
    if (!(B.scene && B.scene.ph === 1 && B.scene.broke)) drawLever(ctx, B, pipeS, c);
    if (B.scene) drawLever(ctx, B, B.scene.ph, c);
    drawWater(ctx, B, pipeS, c);
    drawSlab(ctx, B, c);
  }
  function drawFront(B, ctx) {
    const c = colours();
    drawFire(ctx, B, c);
    drawPuffs(ctx, B, c);
    const g = B.fin && B.fin.gift;
    if (g && !B.hornsOn && g.x != null) { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot || 0); ctx.scale(1.6 - 0.6 * (g.k || 0), 1.6 - 0.6 * (g.k || 0)); drawBabyHorns(ctx, api.dark ? DARK : LIGHT); ctx.restore(); }
  }

  window.MimoWorlds.register({ world: 5, setup(a) { api = a; } });
  Object.assign(window.MimoFauch = window.MimoFauch || {}, { LIGHT, DARK, colours, glow, draw, drawFront, drawShot, drawBabyHorns });
})();
