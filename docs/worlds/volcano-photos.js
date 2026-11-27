// World 5: real photos of the climb. A photo is painted once into a little canvas: a place of the journey (the ash beach with
// the boat, the geyser field, the glow bridge, the basalt organ ...), the real jointed family figures in front of it (fresh
// puppets of coast-cast.js, posed and settled before the picture is taken, the pack and the scarf come along) and Fauch
// somewhere in it as a photobomb (small, half hidden: he has to be looked for). Warm light, a vignette and a little grain
// make it look like an instant photo.
//   MimoVolcano.photos.render(spec)   -> canvas (PW x PH px picture, raster PK) or null while the figures are not loaded yet
//     spec = { place: 'beach' | 'geysir' | 'bridge' | 'organ' | 'test', seed, people: [[who, x, pose, o]], dog: [x, face, entry],
//              fauch: [x, y, size, pose, face, cover] }   x, y in picture px (ground line at GY); o = { face, scale, pack, scarf,
//              expr, dir }; cover: a steam puff, a rock or a column edge drawn over part of Fauch
//   MimoVolcano.photos.ALBUM          the four old photos of the closing scene (one place each, Fauch on every one)
//   MimoVolcano.photos.polaroid(ctx, pic, cx, cy, w, o)   a big polaroid with its picture (screen drawing): centre (cx, cy),
//     picture width w; o = { caption, rot, alpha, shadow, develop 0..1, b / bb (border, bottom border) }
//   MimoVolcano.safeRect(api, cine)   the part of the screen that is surely visible on a phone held sideways (notch, rounded
//     corners, HUD row; cine: the letterbox bars of a scene), in view units { x0, y0, x1, y1 }
// A polaroid prop of a level (volcano-story-draw2.js) with `scene: name` shows such a photo; with `big: [from, secs]` it also
// comes up big on the screen that many seconds after it was taken (layer 'over' below), so it can be looked at on a phone.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const C = () => window.MimoCoast, V = () => window.MimoVolcano;
  const PW = 300, PH = 210, PK = 2, GY = 186;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  let api = null;

  function safeRect(a, cine) {
    const v = (a || api).view, bar = cine ? v.h * 0.11 : 0;
    return { x0: (v.safeL || 0) + 10, x1: v.w - (v.safeR || 0) - 10, y0: Math.max(v.hudPad || 0, bar) + 6, y1: v.h - Math.max(bar, 18) - 6 };
  }

  // ---------- the places ----------
  function sky(g, top, bottom) { const s = g.createLinearGradient(0, 0, 0, GY); s.addColorStop(0, top); s.addColorStop(1, bottom); g.fillStyle = s; g.fillRect(0, 0, PW, PH); }
  function cone(g, x, w, h, col, smoke) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w, GY - 40); g.lineTo(x - w * 0.16, GY - 40 - h); g.lineTo(x + w * 0.16, GY - 40 - h); g.lineTo(x + w, GY - 40); g.closePath(); g.fill();
    g.fillStyle = '#FF9A55'; g.beginPath(); g.moveTo(x - w * 0.16, GY - 40 - h); g.lineTo(x, GY - 34 - h); g.lineTo(x + w * 0.16, GY - 40 - h); g.closePath(); g.fill();
    if (smoke) { g.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + i * 7, GY - 52 - h - i * 9, 7 + i * 2.5, 0, TAU); g.fill(); } }
  }
  function ground(g, top, col, lite) { g.fillStyle = col; g.fillRect(0, top, PW, PH - top); g.fillStyle = lite; g.fillRect(0, top, PW, 3); }
  const puff = (g, x, y, r, a) => { g.save(); g.globalAlpha = a; g.fillStyle = '#FFFFFF'; for (const [dx, dy, k] of [[0, 0, 1], [-r * 0.7, r * 0.25, 0.7], [r * 0.7, r * 0.2, 0.75], [0, -r * 0.5, 0.65]]) { g.beginPath(); g.arc(x + dx, y + dy, r * k, 0, TAU); g.fill(); } g.restore(); };
  const PLACES = {
    // the ash beach: the grey sand, the sea, the boat pulled up, the little ash cone at the back
    beach(g) {
      sky(g, '#9FD0EC', '#FCE6D2'); cone(g, 70, 110, 70, '#A497B8', true);
      g.fillStyle = '#7FB3CF'; g.fillRect(0, GY - 46, PW, 16); g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 9; i++) g.fillRect(i * 36 + 6, GY - 40 + (i % 2) * 4, 14, 1.5);
      ground(g, GY - 30, '#8F8798', '#A9A2B2');
      g.save(); g.translate(236, GY - 30); g.fillStyle = '#C9774E'; g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.quadraticCurveTo(34, 6, 0, 6); g.quadraticCurveTo(-34, 6, -40, -14); g.fill();
      g.fillStyle = '#F6D374'; g.fillRect(-40, -17, 80, 4); g.fillStyle = '#9A6E45'; g.fillRect(-2, -66, 3.5, 50); g.fillStyle = '#FFF8EC'; g.beginPath(); g.moveTo(2, -64); g.lineTo(28, -24); g.lineTo(2, -22); g.closePath(); g.fill(); g.restore();
    },
    // the geyser field: sinter terraces and the big jet in the middle of the picture
    geysir(g) {
      sky(g, '#A9D6EE', '#FDEBD8'); cone(g, 250, 90, 56, '#A497B8', false);
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#E9E2D2', '#DCD3C1', '#CFC4AE'][i]; g.beginPath(); g.ellipse(70 + i * 90, GY - 30 + i * 2, 70, 12, 0, 0, TAU); g.fill(); }
      ground(g, GY - 26, '#B8AE9E', '#D8D0C0');
      const jx = 150; g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.moveTo(jx - 9, GY - 28); g.quadraticCurveTo(jx - 5, GY - 110, jx - 14, GY - 150); g.lineTo(jx + 14, GY - 150); g.quadraticCurveTo(jx + 5, GY - 110, jx + 9, GY - 28); g.closePath(); g.fill();
      puff(g, jx, GY - 154, 22, 0.95); puff(g, jx - 28, GY - 138, 14, 0.8); puff(g, jx + 30, GY - 132, 13, 0.75);
      g.fillStyle = 'rgba(150,210,235,0.7)'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI; g.beginPath(); g.arc(jx + Math.cos(a) * 34, GY - 118 - Math.sin(a) * 30 + (i % 3) * 6, 1.8, 0, TAU); g.fill(); }
    },
    // the glow bridge: the old stone arch over the gorge, the lava glowing below, trees of the mountain forest
    bridge(g) {
      sky(g, '#F4B9A6', '#FFE2B6');
      for (const [x, h] of [[20, 70], [52, 54], [262, 76], [288, 58]]) { g.fillStyle = '#5E8C6A'; g.beginPath(); g.moveTo(x - 16, GY - 40); g.lineTo(x, GY - 40 - h); g.lineTo(x + 16, GY - 40); g.fill(); g.fillStyle = '#7A5A44'; g.fillRect(x - 2, GY - 40, 4, 8); }
      const lg = g.createLinearGradient(0, GY - 20, 0, PH); lg.addColorStop(0, '#FFB35C'); lg.addColorStop(1, '#E8574A'); g.fillStyle = lg; g.fillRect(0, GY - 22, PW, PH);
      g.fillStyle = '#6E6585'; g.fillRect(0, GY - 36, 46, PH); g.fillRect(PW - 46, GY - 36, 46, PH);
      g.fillStyle = '#857A99'; g.beginPath(); g.moveTo(30, GY - 36); g.lineTo(PW - 30, GY - 36); g.lineTo(PW - 30, GY - 22); g.quadraticCurveTo(PW / 2, GY - 34 + 70, 30, GY - 22); g.closePath();
      g.save(); g.clip(); g.fillRect(0, 0, PW, PH); g.strokeStyle = 'rgba(58,46,72,0.25)'; g.lineWidth = 1; for (let x = 40; x < PW - 30; x += 18) { g.beginPath(); g.moveTo(x, GY - 36); g.lineTo(x, GY - 26); g.stroke(); } g.restore();
      g.fillStyle = '#9C91B0'; g.fillRect(30, GY - 38, PW - 60, 4);
      g.fillStyle = 'rgba(255,210,120,0.35)'; g.beginPath(); g.ellipse(PW / 2, GY + 8, 120, 14, 0, 0, TAU); g.fill();
    },
    // the basalt organ: the tall grey columns of the upper forest edge
    organ(g) {
      sky(g, '#B9D9EE', '#F7E3D6');
      const cols = [[26, 96], [50, 122], [74, 108], [210, 116], [234, 134], [258, 104], [282, 90]];
      for (const [x, h] of cols) { g.fillStyle = '#5C5670'; g.fillRect(x - 11, GY - 30 - h, 22, h); g.fillStyle = '#787190'; g.fillRect(x - 11, GY - 30 - h, 8, h); g.fillStyle = '#8E87A6'; g.beginPath(); g.ellipse(x, GY - 30 - h, 11, 4, 0, 0, TAU); g.fill(); }
      ground(g, GY - 30, '#7C7392', '#958DAA');
    },
    test(g) { sky(g, '#A9D6EE', '#FDEBD8'); ground(g, GY - 30, '#B8AE9E', '#D8D0C0'); },
  };
  // a little cover over Fauch (he hides behind something)
  function cover(g, c, x, y, size, face) {
    if (c === 'steam') { puff(g, x - face * size * 0.32, y + size * 0.12, size * 0.4, 0.92); return; }
    if (c === 'rock') { g.fillStyle = '#6E6585'; g.beginPath(); g.moveTo(x - size * 0.7, y + size * 0.6); g.quadraticCurveTo(x - size * 0.2, y + size * 0.05, x + size * 0.5, y + size * 0.25); g.lineTo(x + size * 0.7, y + size * 0.6); g.closePath(); g.fill(); }
  }

  // ---------- the figures ----------
  // a fresh puppet, posed and settled for half a second of its own time (the pose is reached, nothing waits)
  function posed(who, x, pose, o, seed) {
    const p = C().puppet && C().puppet(who, seed); if (!p) return null;
    const want = { pose: pose || null, poseOpts: o.dir ? { dir: o.dir } : {}, face: o.face || 0, look: o.look != null ? o.look : 0, idle: false };
    for (let i = 0; i < 12; i++) p.step(0.1, x, want);
    if (o.expr) p.fig.expr = o.expr;
    if (o.pack != null || o.scarf) p.fig.extra = V().extraFor({ pack: o.pack, scarf: !!o.scarf, phase: 0 });
    return p;
  }
  function render(spec) {
    const kit = C().castKit; if (typeof document === 'undefined' || !kit || !kit.ready()) return null;
    const cv = document.createElement('canvas'); cv.width = PW * PK; cv.height = PH * PK;
    const g = cv.getContext('2d'); g.scale(PK, PK);
    (PLACES[spec.place] || PLACES.test)(g);
    const f = spec.fauch;
    // Fauch first when something stands in front of him (the people, a puff of steam)
    // peek: only what rises above the edge (f[1]) shows, the rest is behind the boat, the column, the rock
    if (f && V().fauchTiny) {
      g.save(); if (f[3] === 'peek') { g.beginPath(); g.rect(0, 0, PW, f[1]); g.clip(); }
      V().fauchTiny(g, f[0], f[1], f[2], f[3], 1.3 + (spec.seed || 0), { face: f[4] || 1, look: 0.6 }); g.restore();
      if (f[5]) cover(g, f[5], f[0], f[1], f[2], f[4] || 1);
    }
    if (spec.dog && C().dogDraw && spec.dog[2]) { const d = spec.dog[2], face = d.face; d.face = spec.dog[1]; C().dogDraw(g, d, { x: spec.dog[0], foot: GY, face: spec.dog[1] }, 'ground'); d.face = face; }
    const pups = [];
    for (const [who, x, pose, o0] of spec.people || []) {
      const o = o0 || {}, p = posed(who, x, pose, o, (spec.seed || 1) * 31 + x | 0); if (!p) return null;
      pups.push([p, x, o.scale || 1.32, o.y || 0]);
    }
    for (const [p, x, s, y] of pups) p.draw(g, x, GY + y, { scale: s });
    // the light of an instant photo: warm, a soft vignette, a little grain
    g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,196,140,0.35)'; g.fillRect(0, 0, PW, PH); g.globalCompositeOperation = 'source-over';
    const vg = g.createRadialGradient(PW / 2, PH / 2, PH * 0.35, PW / 2, PH / 2, PW * 0.68); vg.addColorStop(0, 'rgba(40,24,40,0)'); vg.addColorStop(1, 'rgba(40,24,40,0.32)'); g.fillStyle = vg; g.fillRect(0, 0, PW, PH);
    let s = (spec.seed || 7) * 9301; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    g.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 260; i++) g.fillRect(rnd() * PW, rnd() * PH, 1, 1);
    return cv;
  }

  // ---------- the album: four old photos of the climb, Fauch is on every one ----------
  // dog: the closing passes its dog entry (the dog is drawn by its own figure code)
  const ALBUM = [
    { place: 'beach', caption: 'Aschestrand, 0 m', seed: 1, dog: [204, -1],
      people: [['striped', 72, 'wave', { face: 1 }], ['kid', 114, 'wave', { face: 1 }], ['redbeard', 156, 'thumb', { face: 1 }]],
      fauch: [262, GY - 47, 24, 'peek', -1] },
    { place: 'geysir', caption: 'Geysirfeld, 300 m', seed: 2,
      people: [['reporter', 60, 'mic', { face: 1 }], ['professor', 100, 'pen', { face: 1, dir: 1 }], ['sidepart', 208, 'fan', { face: -1, scarf: true }], ['kid', 244, 'hooray', { face: -1 }]],
      fauch: [196, 40, 30, 'fly', -1, 'steam'] },
    { place: 'bridge', caption: 'Glutbrücke, 600 m', seed: 3,
      people: [['striped', 104, null, { face: 1, expr: 'daze', y: -36 }], ['sidepart', 148, 'proud', { face: 1, scarf: true, y: -36 }], ['redbeard', 194, 'grill', { face: 1, dir: 1, y: -36 }]],
      fauch: [276, GY - 70, 28, 'thumb', -1, 'rock'] },
    { place: 'organ', caption: 'Basaltorgel, 1.000 m', seed: 4, dog: [70, 1],
      people: [['professor', 116, 'point', { face: 1, dir: 1 }], ['kid', 158, 'hooray', { face: -1 }], ['reporter', 198, 'wave', { face: -1 }]],
      fauch: [258, GY - 134, 24, 'peek', -1] },
  ];

  // ---------- a big polaroid on the screen ----------
  function polaroid(ctx, pic, cx, cy, w, o) {
    o = o || {}; const h = w * PH / PW, b = o.b != null ? o.b : Math.max(8, w * 0.045), bb = o.bb != null ? o.bb : Math.max(26, w * 0.15);
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha; ctx.translate(cx, cy); ctx.rotate(o.rot || 0);
    const x0 = -w / 2 - b, y0 = -(h + b + bb) / 2, W = w + 2 * b, H = h + b + bb;
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(20,16,30,0.3)'; ctx.fillRect(x0 + 5, y0 + 7, W, H); }
    ctx.fillStyle = '#FFFDF6'; ctx.fillRect(x0, y0, W, H); ctx.strokeStyle = 'rgba(58,46,72,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1);
    if (pic) ctx.drawImage(pic, x0 + b, y0 + b, w, h); else { ctx.fillStyle = '#C9C2D6'; ctx.fillRect(x0 + b, y0 + b, w, h); }
    if (o.develop != null && o.develop < 1) { ctx.fillStyle = 'rgba(120,128,150,' + 0.92 * (1 - o.develop) + ')'; ctx.fillRect(x0 + b, y0 + b, w, h); }
    if (o.caption) { ctx.fillStyle = '#6C5E88'; ctx.font = 'italic 600 ' + Math.round(Math.max(12, bb * 0.42)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.caption, 0, y0 + b + h + bb / 2); }
    ctx.restore();
    return { w: W, h: H };
  }
  // the outer size of a big polaroid whose picture is w wide
  const outer = (w) => { const b = Math.max(8, w * 0.045), bb = Math.max(26, w * 0.15); return { w: w + 2 * b, h: w * PH / PW + b + bb }; };

  // ---------- the polaroid of a level, big on the screen for a moment ----------
  const BIG_IN = 0.5;
  function drawBig(ctx) {
    const L = api && api.L, st = L && L.story; if (!st || api.mode !== 'level') return;
    for (const e of st.cast) {
      if (e.who !== 'prop' || e.kind !== 'polaroid' || !e.big || e.t0 == null || e.gone) continue;
      const k = api.time - e.t0 - e.big[0]; if (k < 0 || k > e.big[1]) continue;
      const pic = e.shot || (e.shot = render({ ...(SCENES[e.scene] || SCENES.probe) }));
      const r = safeRect(api, false), inK = ease(k / BIG_IN), outK = ease((k - e.big[1] + BIG_IN) / BIG_IN);
      const w = Math.min((r.x1 - r.x0) * 0.46, ((r.y1 - r.y0) - 10) * PW / PH / 1.2), o = outer(w);
      const cx = r.x0 + o.w / 2 + 6 - (1 - inK) * 40 - outK * 60, cy = r.y0 + (r.y1 - r.y0) / 2;
      polaroid(ctx, pic, cx, cy, w, { caption: (SCENES[e.scene] || SCENES.probe).caption, rot: -0.035, alpha: inK * (1 - outK), develop: clamp01((api.time - e.t0 - 0.7) / 3) });
    }
  }
  // the photos levels take (cast prop polaroid with scene: name)
  const SCENES = {
    // level 45: the first test photo; the geyser goes off just at the click and soaks the filmer, high in the sky flies Fauch
    probe: { place: 'geysir', caption: 'Probefoto, 300 m', seed: 5,
      people: [['professor', 56, 'pen', { face: 1, dir: 1 }], ['reporter', 92, 'hooray', { face: 1 }], ['striped', 128, null, { face: 1, pack: 2 }], ['sidepart', 164, 'proud', { face: -1, scarf: true }], ['filmer', 214, 'flail', { face: -1 }]],
      fauch: [262, 36, 21, 'fly', -1] },
  };

  V().photos = { render, ALBUM, SCENES, polaroid, outer, PW, PH };
  V().safeRect = safeRect;
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, draw(layer, ctx) { if (layer === 'over' && api) drawBig(ctx); } });
})();
