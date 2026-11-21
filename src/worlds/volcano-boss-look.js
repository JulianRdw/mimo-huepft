// World 5 boss "Drache Fauch": the crater shaft behind everything, the long body that winds through it behind the
// ledges (only coils, neck and head are ever in the picture, the tail end comes out of the lava), the fight song and
// the reward for the wardrobe, the "Drachenhörnchen".
// The back wall and the body live in the world's "back" layer (behind the tiles), so the ledges cross in front of the
// dragon like in the mockup. Cached gradients only, no shadowBlur, no allocation per frame.
(function () {
  'use strict';
  let api = null;
  const F = () => window.MimoFauch;
  const TAU = Math.PI * 2;

  const SHAFT = {
    light: { wall0: '#352043', wall1: '#7C3C57', pillar: '#44284F', vein: '#FF9A5C', heat: '#FF9A5C' },
    dark: { wall0: '#1C1026', wall1: '#4A2238', pillar: '#2A1834', vein: '#E8844E', heat: '#F58A50' },
  };
  const NIGHT_WALL = '#1A1430', PILLARS = 10;
  const cache = {};
  function linear(key, y0, y1, c0, c1) {
    const c = cache[key];
    if (c && c.y0 === y0 && c.y1 === y1 && c.c0 === c0 && c.c1 === c1) return c.g;
    const g = api.ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1);
    cache[key] = { y0, y1, c0, c1, g }; return g;
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  let sFor = null, sDark = null, sPal = null;
  function shaftColours() {
    const W = api.W, dark = api.dark;
    if (sFor === W && sDark === dark && sPal) return sPal;
    const b = dark ? SHAFT.dark : SHAFT.light, n = (W.night || 0) * 0.35;
    sPal = { ...b, wall0: api.mixHex(b.wall0, NIGHT_WALL, n), wall1: api.mixHex(b.wall1, NIGHT_WALL, n * 0.6), pillar: api.mixHex(b.pillar, NIGHT_WALL, n) };
    sPal.heat0 = rgba(sPal.heat, 0); sPal.heat1 = rgba(sPal.heat, 0.4);
    sFor = W; sDark = dark;
    return sPal;
  }

  // ---------- the shaft: back wall from the rim down, basalt pillars, glowing veins, warm light from below ----------
  function drawShaft(ctx) {
    const v = api.view, cam = api.cam, c = shaftColours(), rimY = F().RIM * F().T + 18;
    const y0 = Math.max(cam.y - 10, rimY), y1 = cam.y + v.h + 10; if (y1 <= y0) return;
    ctx.save(); ctx.translate(0, cam.y);
    ctx.fillStyle = linear('shaft', 0, v.h, c.wall0, c.wall1); ctx.fillRect(cam.x - 10, y0 - cam.y, v.w + 20, y1 - y0);
    ctx.fillStyle = linear('heat', v.h * 0.35, v.h, c.heat0, c.heat1); ctx.fillRect(cam.x - 10, Math.max(y0 - cam.y, v.h * 0.35), v.w + 20, y1 - Math.max(y0, cam.y + v.h * 0.35));
    ctx.restore();
    ctx.fillStyle = c.pillar; ctx.globalAlpha = 0.6;
    for (let i = 0; i < PILLARS; i++) {
      const x = 40 + i * 82 + api.hash(i, 1) * 22, w = 34 + api.hash(i, 2) * 26;
      api.rr(x, y0, w, y1 - y0 + 40, 16); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // a few glowing cracks in the wall, fixed in the world
    ctx.strokeStyle = c.vein; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pulse = api.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(api.time * 1.3);
    for (let i = 0; i < 8; i++) {
      const x = 90 + api.hash(i, 5) * 650, y = rimY + 80 + i * 150 + api.hash(i, 6) * 60;
      if (y < y0 - 40 || y > y1 + 40) continue;
      ctx.globalAlpha = 0.25 + 0.25 * pulse; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 16); ctx.lineTo(x + 4, y + 30); ctx.lineTo(x + 16, y + 44); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // embers rising through the shaft
    if (!api.reduced) {
      ctx.fillStyle = api.W.ember || '#FFB36B';
      for (let i = 0; i < 16; i++) {
        const k = (api.time * 0.09 + api.hash(i, 8)) % 1, x = cam.x + api.hash(i, 3) * v.w + Math.sin(api.time + i) * 10, y = cam.y + v.h - k * v.h;
        if (y < rimY) continue;
        ctx.globalAlpha = 0.7 * Math.sin(k * Math.PI); ctx.fillRect(x, y, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- the body ----------
  // which floor the coils belong to: the old one until the scene moves the dragon up, then a blend
  const bs = { s: 0, s2: null, w: 0 }, BACK = new Int8Array(64);
  function bodyFloors(B) {
    const ph = api.boss.phase(B), sc = B.scene, S = F().SCENE;
    bs.s = ph; bs.s2 = null; bs.w = 0;
    if (B.scenePending != null) bs.s = ph - 1;
    else if (sc && S && S[sc.ph]) {
      const a = sc.ph === 1 ? S[1].BREAK : S[2].RISE, b = sc.ph === 1 ? S[1].ARRIVE : S[2].ARRIVE;
      bs.s = sc.ph - 1; bs.s2 = sc.ph; bs.w = F().ease(F().clamp((sc.t - a) / (b - a), 0, 1));
    }
    return bs;
  }
  function drawBody(ctx, B) {
    const c = F().colours(), f = bodyFloors(B), t = api.time, bd = F().body(f.s, B.head, B.lavaY, t, f.s2, f.w), n = bd.n, mid = F().W / 2;
    const col = B.wet > 0.05 ? api.mixHex(c.body, '#C9A0C8', B.wet * 0.3) : c.body;
    // the back of the body: the side that faces up, on steep parts the side towards the nearer wall
    for (let i = 0; i <= n; i++) BACK[i] = Math.abs(bd.ny[i]) > 0.35 ? (bd.ny[i] < 0 ? 1 : -1) : ((bd.x[i] < mid ? -1 : 1) * bd.nx[i] > 0 ? 1 : -1);
    // the golden spikes on the back first, the body over their base
    ctx.fillStyle = c.spike; ctx.beginPath();
    for (let i = 4; i < n - 5; i += 3) {
      const sd = BACK[i], nx = bd.nx[i] * sd, ny = bd.ny[i] * sd, r = bd.r[i], x = bd.x[i] + nx * r * 0.85, y = bd.y[i] + ny * r * 0.85, tx = -ny, ty = nx, sz = 5 + r * 0.25;
      ctx.moveTo(x + tx * sz, y + ty * sz); ctx.lineTo(x + nx * sz * 1.8, y + ny * sz * 1.8); ctx.lineTo(x - tx * sz, y - ty * sz);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bd.x[0] + bd.nx[0] * bd.r[0], bd.y[0] + bd.ny[0] * bd.r[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(bd.x[i] + bd.nx[i] * bd.r[i], bd.y[i] + bd.ny[i] * bd.r[i]);
    for (let i = n; i >= 0; i--) ctx.lineTo(bd.x[i] - bd.nx[i] * bd.r[i], bd.y[i] - bd.ny[i] * bd.r[i]);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ell(ctx, bd.x[0], bd.y[0], bd.r[0], bd.r[0]); ctx.fill();
    // a darker band on the belly side gives the tube its roundness
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const o = -BACK[i] * bd.r[i]; i ? ctx.lineTo(bd.x[i] + bd.nx[i] * o, bd.y[i] + bd.ny[i] * o) : ctx.moveTo(bd.x[i] + bd.nx[i] * o, bd.y[i] + bd.ny[i] * o); }
    for (let i = n; i >= 0; i--) { const o = -BACK[i] * bd.r[i] * 0.35; ctx.lineTo(bd.x[i] + bd.nx[i] * o, bd.y[i] + bd.ny[i] * o); }
    ctx.closePath(); ctx.fillStyle = c.ink; ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 1;
    // the belly: a lighter stripe of round scales that slide along (he slithers)
    const shift = api.reduced ? 0 : (t * 1.4) % 1;
    ctx.fillStyle = c.lite; ctx.globalAlpha = 0.9; ctx.beginPath();
    for (let j = 1; j < n / 2.5 - 1; j++) {
      const g = (j + shift) * 2.5, i = Math.floor(g), k = g - i; if (i + 1 > n - 2) break;
      const sd = -BACK[i], r = bd.r[i] * 0.42, x = bd.x[i] + (bd.x[i + 1] - bd.x[i]) * k + bd.nx[i] * sd * bd.r[i] * 0.42, y = bd.y[i] + (bd.y[i + 1] - bd.y[i]) * k + bd.ny[i] * sd * bd.r[i] * 0.42;
      ctx.moveTo(x + r * 0.55, y); ctx.arc(x, y, r * 0.55, 0, TAU);
    }
    ctx.fill(); ctx.globalAlpha = 1;
  }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }

  // ---------- the fight song: E Phrygian, driving, with a timpani heartbeat (phase 2 adds the arpeggio, 3 the hi-hats) ----------
  const Em = [40, 55, 59, 64], F_ = [41, 57, 60, 65], Dm = [38, 57, 62, 65], G = [43, 55, 59, 62], E = [40, 56, 59, 64], Am = [45, 57, 60, 64], C = [36, 55, 60, 64];
  const songs = {
    bossVolcano: { bpm: 138, beats: 4, boss: true, live: true, lead: 'clar', counter: 'pizz', arp: 'pluck', pad: 'warm', bass: 'pulse', density: 0.7,
      scale: [64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
      kits: { a: { timp: 'x...x...', tom: '......x.', wood: '..x...x.' }, b: { kick: 'x..x..x.', snare: '....x...', timp: 'x.......', clap: '....x..x' } },
      form: ['A', 'B', 'A', 'C'],
      sec: { A: { ch: [Em, F_, Em, Dm], cpb: 1, bars: 8, mel: 'fixed', kit: 'a' },
        B: { ch: [Am, F_, G, E], cpb: 2, bars: 8, mel: 'gen', kit: 'b', counter: 0.5 },
        C: { ch: [Em, F_, C, E], cpb: 2, bars: 8, mel: 'gen', kit: 'b', dens: 0.5, arp: 1 } } },
  };

  // ---------- wardrobe: the dragon's baby horns ----------
  const costumes = [{ id: 'h_dragon', kind: 'hat', name: 'Drachenhörnchen', price: 0, boss: 5,
    // Mimo is never tinted by the clock, so his horns are not either
    draw(ctx, o) { ctx.translate(0, o.top + 1); ctx.rotate(o.tilt * 0.4); F().drawBabyHorns(ctx, api.dark ? F().DARK : F().LIGHT); } }];

  const fight = () => (api && api.mode === 'boss' && api.G.boss && api.G.boss.fauch ? api.G.boss : null);
  window.MimoWorlds.register({
    world: 5, songs, costumes,
    setup(a) { api = a; },
    draw(layer, ctx) { const B = fight(); if (B && layer === 'back') { drawShaft(ctx); drawBody(ctx, B); } },
  });
})();
