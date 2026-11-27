// World 5: the things of the last climb (levels 52 to 55, volcano-levels-c.js), on top of the story engine of "Gipfelsturm".
// Pure decoration on the game clock (api.time), nothing touches the physics, so the level bots replay exactly.
//   props (cast { who: 'prop', kind }):
//     shell   a broken half of a big speckled egg shell lying on the ground (the egg's own speckles)
//     eyrie   Fauch's nest: a ring of dark stones and charred branches with a warm glow inside; put the egg (who 'egg') on it
//   Fauch acts (cast { who: 'fauch', act }, see volcano-fauch.js for the shared fields at, atRow, then, wait):
//     scribble  the drawings on the wall of his cave at x, y (y = the row under the drawings): in the dark they are barely
//               there · an ember on the floor glows up (lead-in, glow: [dx, dy] tiles from x, y) · line by line the light finds
//               an egg, a heart round it, a big dragon and a tiny one, and his tally marks of the days · a small heart rises.
//               Afterwards they stay lit. Nobody sees Fauch himself here, only what he drew
//     circle2   wind · he circles over the nest at x, y (r tiles, turns, dur s of circling) behind the rock, then flies off;
//               the circle never leaves the view while it plays (it is pulled in from the edge when Mimo is not near the nest)
//               over the far rim (dir 1 right, -1 left). The egg stays alone in its nest
//   pose `brolly` (both arms up, holding something over the head) and the skit effect ['fx', 'brolly', tag, on]: the side
//   parting takes off his scarf and holds it up as a roof over the family (on false puts it back round the neck).
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, V = () => window.MimoVolcano, FD = () => window.MimoVolcano.fauchDraw;
  const clamp = (k) => Math.max(0, Math.min(1, k));
  const seg = (k, a, b) => clamp((k - a) / (b - a));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const dark = () => !!(api && api.dark);

  // ---------- props ----------
  const SPECKS = [[-5, -8, 1.6], [4, -14, 1.3], [-2, -19, 1.1], [6, -6, 1.1], [-7, -15, 1]];
  function shell(ctx) {
    const ink = dark() ? '#20182C' : '#3A2E48';
    ctx.save(); ctx.scale(1.3, 1.3); ctx.rotate(-0.25);
    // the inside of the half shell (a darker cup), then the outer side with a jagged rim
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-9, -10); ctx.lineTo(-5, -7); ctx.lineTo(-1, -11); ctx.lineTo(3, -7); ctx.lineTo(7, -10); ctx.lineTo(11, -6);
    ctx.bezierCurveTo(12, 0, 6, 3, 0, 3); ctx.bezierCurveTo(-6, 3, -12, 0, -12, -6); ctx.closePath();
    ctx.fillStyle = '#FCEBD2'; ctx.fill(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#E9CDB0'; ctx.beginPath(); ctx.ellipse(0, -6.5, 9.5, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#F2A98B'; for (const [x, y, r] of SPECKS) { ctx.beginPath(); ctx.arc(x * 0.9, y * 0.2 - 1, r * 0.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function eyrie(ctx, t) {
    const d = dark(), stone = d ? '#4A4060' : '#6E6488', lite = d ? '#6C6088' : '#9A8FB2', twig = d ? '#4E3A34' : '#6B4C3F';
    // the warm glow inside, breathing slowly
    const g = ctx.createRadialGradient(0, -14, 4, 0, -14, 46), a = 0.32 + 0.08 * Math.sin(t * 1.4);
    g.addColorStop(0, 'rgba(255,190,120,' + a + ')'); g.addColorStop(1, 'rgba(255,190,120,0)'); ctx.fillStyle = g; ctx.fillRect(-48, -60, 96, 64);
    // charred branches crossing behind, then the stone ring in front
    ctx.strokeStyle = twig; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (const [x0, y0, x1, y1] of [[-34, -8, 10, -20], [34, -9, -12, -21], [-26, -16, 28, -12], [-20, -4, 30, -18]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    for (let i = 0; i < 9; i++) {
      const u = i / 8, x = lerp(-34, 34, u), y = -5 - Math.sin(u * Math.PI) * 3, w = 7 + (i % 3) * 1.6, h = 5 + (i % 2) * 1.4;
      ctx.fillStyle = stone; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lite; ctx.beginPath(); ctx.ellipse(x - w * 0.25, y - h * 0.45, w * 0.45, h * 0.3, 0, 0, TAU); ctx.fill();
    }
  }

  // ---------- the drawings on the cave wall (polylines, origin = bottom centre of the drawing, px) ----------
  const egg = () => { const o = []; for (let i = 0; i <= 28; i++) { const a = -Math.PI / 2 + i / 28 * TAU, ry = Math.sin(a) < 0 ? 30 : 22; o.push([Math.cos(a) * 19, -54 + Math.sin(a) * ry]); } return o; };
  const heart = () => { const o = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); o.push([x * 3.6, -52 - y * 3.4]); } return o; };
  const dragon = (x0, s, f) => [   // a child-like dragon sitting up: round body, head with snout and smile, two horns, a wing, a tail
    [[-6, -42], [-14, -34], [-17, -18], [-12, -4], [0, 0], [12, -4], [16, -18], [12, -34], [6, -42]],
    [[-6, -42], [-7, -58], [2, -65], [13, -61], [26, -55], [26, -48], [12, -44], [6, -42]],
    [[-3, -62], [-8, -73], [2, -65]], [[5, -64], [6, -75], [10, -62]],
    [[16, -49], [19, -47], [22, -49]],
    [[-13, -30], [-32, -46], [-27, -35], [-36, -31], [-15, -24]],
    [[-11, -3], [-26, 0], [-34, -8], [-28, -14]],
  ].map((l) => l.map(([x, y]) => [x0 + x * s * f, y * s]));
  const tally = () => { const o = []; for (let g = 0; g < 2; g++) { for (let i = 0; i < 4; i++) o.push([[118 + g * 30 + i * 5, -96], [118 + g * 30 + i * 5, -78]]); o.push([[114 + g * 30, -82], [138 + g * 30, -92]]); } o.push([[178, -96], [178, -78]]); return o; };
  let ART = null;
  const art = () => ART || (ART = [
    { from: 1.5, to: 2.7, lines: [egg()], dots: [[-6, -48], [5, -60], [-3, -68], [7, -44]] },
    { from: 5.0, to: 5.05, lines: [], dots: [[-102, -57], [86.8, -29]] },
    { from: 2.7, to: 3.9, lines: [heart()] },
    { from: 3.9, to: 5.0, lines: [...dragon(-112, 1, 1), ...dragon(92, 0.52, -1)] },
    { from: 5.0, to: 5.8, lines: tally() },
  ]);
  function polyPart(ctx, pts, q) {
    if (q <= 0) return;
    const n = (pts.length - 1) * q, last = Math.floor(n);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= last; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (last < pts.length - 1) { const a = pts[last], b = pts[last + 1], f = n - last; ctx.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); }
    ctx.stroke();
  }
  function drawScribbles(ctx, e, k) {
    const x = e.x0, f = e.foot, lit = k == null ? 0 : ease(seg(k, 0.4, 1.6)), chalk = dark() ? '#E9D2B0' : '#FBE7C4';
    const gx = x + (e.glow ? e.glow[0] * T : 0), gy = f + (e.glow ? e.glow[1] * T : 0);
    if (lit > 0) {   // the ember on the floor and its light on the wall
      const pulse = api.reduced ? 1 : 0.9 + 0.1 * Math.sin(api.time * 5);
      const g = ctx.createRadialGradient(gx, gy - 30, 6, gx, gy - 40, 190); g.addColorStop(0, 'rgba(255,186,120,' + 0.42 * lit * pulse + ')'); g.addColorStop(1, 'rgba(255,186,120,0)');
      ctx.fillStyle = g; ctx.fillRect(gx - 200, gy - 240, 400, 250);
      ctx.save(); ctx.translate(gx, gy - 6); V().draw.PROPS.ember(ctx, api.time); ctx.restore();
    }
    ctx.save(); ctx.translate(x, f - 8); ctx.strokeStyle = chalk; ctx.fillStyle = chalk; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const part of art()) {
      const q = k == null ? 1 : seg(k, part.from, part.to), a = k == null ? 0.13 : lerp(0.13, 0.92, Math.max(lit * 0.25, q));
      ctx.globalAlpha = a;
      for (const l of part.lines) polyPart(ctx, l, k == null ? 1 : Math.max(0.0001, q));
      if (part.dots && (k == null || q >= 1)) for (const [dx, dy] of part.dots) { ctx.beginPath(); ctx.arc(dx, dy, 2.4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    // a small heart rises from the drawing and fades
    const h = k == null ? -1 : seg(k, 5.9, 8.4);
    if (h > 0 && h < 1) {
      ctx.save(); ctx.globalAlpha = Math.sin(h * Math.PI) * 0.9; ctx.translate(x + Math.sin(h * 6) * 6, f - 70 - h * 70); ctx.scale(0.5, 0.5);
      ctx.fillStyle = '#F28C82'; ctx.beginPath(); for (const [px, py] of heart()) ctx.lineTo(px, py + 52); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  // ---------- Fauch acts ----------
  function circle2(ctx, e, k) {
    if (k == null) return;
    const t = api.time, r = (e.r || 5) * T, dur = e.dur || 7, turns = e.turns || 1.25, cy = e.foot - 3 * T, s0 = e.scale || 0.8, dir = e.dir || 1;
    // the circle stays over the nest, also when Mimo walks on (then it leaves the view like everything else there)
    const cx = e.x0;
    if (k < 2) wind(ctx, k);
    if (k < 1) return;
    const u = Math.min(k - 1, dur), a = u / dur * turns * TAU - Math.PI / 2;
    let x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.3, s = s0 * (0.85 + 0.2 * Math.sin(a)), face = Math.sin(a) > 0 ? -1 : 1;
    if (k > 1 + dur) { const q = ease(seg(k, 1 + dur, 3.2 + dur)); if (q >= 1) return; x += dir * q * 520; y -= q * 260; s *= 1 - 0.5 * q; face = dir; }
    ctx.save(); ctx.translate(x, y); FD().fly(ctx, t, { face, scale: s, flap: 1.3 }); ctx.restore();
  }
  function wind(ctx, k) {
    const v = { x: api.cam.x, y: api.cam.y, w: api.view.w, h: api.view.h }, a = Math.min(seg(k, 0, 0.5), 1 - seg(k, 1.4, 2));
    if (a <= 0) return;
    ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const q = (k * 1.6 + i * 0.37) % 1, y = v.y + v.h * (0.14 + 0.1 * i), x = v.x + v.w * q; ctx.globalAlpha = a * Math.sin(q * Math.PI) * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 46, y + 2); ctx.stroke(); }
    ctx.restore();
  }
  function installActs() {
    const A = V().fauchActs; if (!A) return;
    A.scribble = { len: 8.6, layer: 'back', visible: true, draw: (ctx, e, k) => drawScribbles(ctx, e, k) };
    A.circle2 = { len: 10.2, layer: 'back', draw: (ctx, e, k) => circle2(ctx, e, k) };   // dur 7: wind 1 s, circling, 2.2 s away
  }

  // ---------- the scarf as a roof ----------
  const AC = C().FamilyActions;
  AC.brolly = (w, s) => {
    const r = clamp(w / 0.35), b = s.arm, sw = Math.sin(w * TAU * 0.8) * 3;
    const arm = (k) => ({ upper: b[k].upper + (166 - b[k].upper) * r, fore: b[k].fore + (182 + sw - b[k].fore) * r });
    return { arms: { l: arm('l'), r: arm('r') }, headTilt: -4 * r, torsoRot: s.torsoRot, bounce: -0.6 * r, brow: 1, done: w > 99 };
  };
  C().castPoses.brolly = { act: 'brolly', loop: [0.4, 1.25] };
  function drawBrolly(ctx, e) {
    const p = e.pos; if (!p || !C().cast.hand) return;
    const hl = C().cast.hand(e, 'l'), hr = C().cast.hand(e, 'r'); if (!hl || !hr) return;
    const x0 = p.x + Math.min(hl[0], hr[0]) - 26, x1 = p.x + Math.max(hl[0], hr[0]) + 26, y = p.foot + Math.min(hl[1], hr[1]) - 2;
    const t = api.time, flap = api.reduced ? 0 : Math.sin(t * 3.1) * 2, n = 7, w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * w, xb = xa + w, sa = Math.sin(i / n * Math.PI) * -5 + (i === 0 ? 4 : 0), sb = Math.sin((i + 1) / n * Math.PI) * -5 + (i === n - 1 ? 4 : 0);
      ctx.beginPath(); ctx.moveTo(xa, y + sa + flap * (i % 2 ? 1 : -1) * 0.3); ctx.lineTo(xb, y + sb); ctx.lineTo(xb, y + sb + 7); ctx.lineTo(xa, y + sa + 7); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#F28C82'; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(58,46,72,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + 4); ctx.quadraticCurveTo((x0 + x1) / 2, y - 12, x1, y + 4); ctx.stroke();
    ctx.strokeStyle = '#F28C82'; ctx.lineWidth = 1.4; for (const x of [x0 + 2, x1 - 2]) { ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.lineTo(x + flap * 0.6, y + 17); ctx.stroke(); }
  }
  V().skitFx = Object.assign(V().skitFx || {}, {
    brolly(args) {
      const [tag, on] = args, e = C().scene.find(tag); if (!e) return;
      e.brolly = on !== false; e.scarf = !e.brolly; e.extra = V().extraFor(e);
      C().scene.hold(e, e.brolly ? 'brolly' : null);
    },
  });

  installActs();
  Object.assign(C().sdraw.PROPS, { shell, eyrie });
  window.MimoWorlds.register({
    world: 5,
    setup(a) { api = a; },
    draw(layer, ctx) {
      if (layer !== 'front' || !api.L || !api.L.story || api.mode !== 'level') return;
      for (const e of api.L.story.cast) if (e.brolly) drawBrolly(ctx, e);
    },
  });
})();
