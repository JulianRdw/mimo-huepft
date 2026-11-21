// World 4 story pictures, part two: the dog's carried things, the tentacle of the Krake, a few more beach props and the counting
// bubble. Pure drawing, no state; everything moves only with the time t it is given. Origin: bottom centre, y points down.
// Shares the palette (so the night wash) of coast-story-draw.js through MimoCoast.sdraw.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const S = () => window.MimoCoast.sdraw;
  
  // the things a dog brings, drawn around their own centre, about 22 px
  function starfish(ctx, t, r, col) {
    const { paint } = S(); r = r || 10;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.lineJoin = 'round'; paint(ctx, col || S().COL.orange);
    ctx.fillStyle = S().COL.white; ctx.globalAlpha = 0.5; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 1, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function CARRY(ctx, kind, t) {
    if (kind === 'starfish') { ctx.rotate(Math.sin(t * 6) * 0.2); starfish(ctx, t, 11); }
    else if (kind === 'flipflop') S().ICONS.flipflop(ctx);
    else if (kind === 'crab') { ctx.translate(0, 8); ctx.scale(0.8, 0.8); S().crab(ctx, t, { hop: Math.abs(Math.sin(t * 7)) * 3 }); }
    else S().ICONS.dogball(ctx);
  }

  // ---------- the tentacle: a tapered pink arm along the points ps (base first, tip last); suckers on the underside ----------
  // like the arms of the Krake (coast-boss-draw.js): pink body, a light belly, soft outline
  function tentacle(ctx, ps, w0, t) {
    const n = ps.length; if (n < 2) return;
    const left = [], right = [], { ink } = S();
    for (let i = 0; i < n; i++) {
      const a = ps[Math.max(0, i - 1)], b = ps[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, k = i / (n - 1), w = Math.max(1.6, w0 * (1 - k * 0.8)) / 2;
      left.push({ x: ps[i].x - dy / l * w, y: ps[i].y + dx / l * w }); right.push({ x: ps[i].x + dy / l * w, y: ps[i].y - dx / l * w });
    }
    ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath(); ctx.lineJoin = 'round'; ctx.fillStyle = S().COL.pink === '#F6A9BF' ? '#F08FA4' : S().COL.pink; ctx.fill();
    ctx.strokeStyle = ink(); ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#F9BFCB';
    for (let i = 2; i < n - 1; i += 2) { const q = ps[i], k = i / (n - 1); ctx.beginPath(); ctx.arc(q.x + (left[i].x - q.x) * 0.45, q.y + (left[i].y - q.y) * 0.45, Math.max(0.9, w0 * (1 - k * 0.8) * 0.13), 0, TAU); ctx.fill(); }
  }
  // a snaking path from the base (bx, by) to the tip (tx, ty): a smooth wave that dies out at the tip
  function snake(bx, by, tx, ty, t, amp, n) {
    n = n || 14; const out = [], dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (let i = 0; i < n; i++) { const k = i / (n - 1), w = Math.sin(k * 7 - t * 3.2) * (amp || 12) * Math.sin(k * Math.PI) * (1 - k * 0.3); out.push({ x: bx + dx * k + nx * w, y: by + dy * k + ny * w }); }
    return out;
  }

  // ---------- more props (kind -> function(ctx, t, e)) ----------
  const P2 = {
    // a spade with sand on the blade; e.scale makes it the big one beside the castle
    shovel(ctx, t, e) {
      const { paint, ell, rrect, COL } = S();
      ctx.save(); ctx.rotate(-0.22);
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.5, -36); ctx.lineTo(3.5, -36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-7, -9, 0, -10); ctx.quadraticCurveTo(7, -9, 6, -1); ctx.closePath(); paint(ctx, COL.red);
      ctx.fillStyle = '#EBD3A2'; ctx.beginPath(); ctx.moveTo(-5.4, -2.5); ctx.quadraticCurveTo(0, -8.5, 5.4, -2.5); ctx.quadraticCurveTo(0, 0.5, -5.4, -2.5); ctx.fill();
      ctx.restore();
    },
    // the bucket of shells: the pile grows with the time and a new one drops in now and then (e.shells = how many to begin with)
    shellbucket(ctx, t, e) {
      const { paint, ell, COL } = S(), n = Math.min(9, 3 + Math.floor((t * 0.35 + ((e && e.shells) || 0)) % 7));
      ctx.beginPath(); ctx.moveTo(-10, -15); ctx.lineTo(10, -15); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath(); paint(ctx, COL.sun);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.4; ctx.fillRect(-9, -9, 18, 2.5); ctx.globalAlpha = 1;
      const cols = [COL.pinkLite, COL.white, COL.cream];
      for (let i = 0; i < n; i++) { const x = -7 + (i * 5.3) % 14, y = -16 - (i % 3) * 2.2 - Math.floor(i / 3) * 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 3.2, Math.PI, TAU); ctx.closePath(); paint(ctx, cols[i % 3], 0.35); }
      const k = (t * 0.35 + ((e && e.shells) || 0)) % 1; // the shell on its way in
      if (k < 0.2) { const y = -34 + k * 90; ctx.beginPath(); ctx.arc(2, y, 3, Math.PI, TAU); ctx.closePath(); paint(ctx, COL.pink, 0.35); }
    },
    flipflop(ctx) { ctx.save(); ctx.translate(0, -3); ctx.rotate(1.2); ctx.scale(0.9, 0.9); S().ICONS.flipflop(ctx); ctx.restore(); },
    ball(ctx, t, e) { const { COL } = S(); ctx.save(); ctx.translate(0, -10); ctx.rotate(((e && e.spin) || 0) * t); S().ICONS.ball(ctx); ctx.restore(); },
    // a striped towel with a pattern, 44 wide, lying flat
    towel(ctx) {
      const { rrect, paint, COL } = S();
      rrect(ctx, -22, -4, 44, 4, 2); paint(ctx, COL.white, 0.25);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? COL.pink : COL.sky; ctx.fillRect(-20 + i * 7, -3.6, 4, 3.2); }
      ctx.fillStyle = COL.sun; for (const x of [-12, 4, 18]) { ctx.beginPath(); ctx.arc(x, -2, 0.9, 0, TAU); ctx.fill(); }
    },
    // two footprints a step apart, e.w pairs trailing behind (to the left): the way someone came
    prints(ctx, t, e) {
      const n = (e && e.w) || 4, sand = (window.MimoCoast && window.MimoCoast.sandInk) || '#D4BC8E';
      ctx.fillStyle = sand; ctx.globalAlpha = 0.9;
      for (let i = 0; i < n; i++) { const x = -i * 14, up = i % 2 ? -1.4 : -0.2; ctx.beginPath(); ctx.ellipse(x, up - 1, 4, 1.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + 5, up - 1.2, 1, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    // plate with sausages: e.n sausages left, a gap and a few crumbs where one was
    plate(ctx, t, e) {
      const { paint, ell, rrect, COL } = S(), n = ((e && e.n) == null ? 2 : e.n);
      ell(ctx, 0, -2, 13, 3); paint(ctx, COL.white, 0.3);
      for (let i = 0; i < n; i++) { rrect(ctx, -9 + i * 7, -7, 12, 4.4, 2.2); paint(ctx, '#D98C63', 0.3); }
      ctx.fillStyle = '#D6A07C'; for (const [x, y] of [[8, -3], [10.5, -2.6], [6.2, -2.4]]) { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, TAU); ctx.fill(); }
    },
    // a plaster over the dome of an urchin (origin: the foot of the tile it sits on; e.up false hangs it from the ceiling)
    plaster(ctx, t, e) {
      const { rrect, paint, COL } = S(); ctx.save(); if (e && e.up === false) ctx.translate(0, -(32 - 4)), ctx.scale(1, -1);
      ctx.translate(0, -12); ctx.rotate(-0.55); ctx.scale(1.35, 1.35); rrect(ctx, -9, -3, 18, 6, 2.5); paint(ctx, '#F4D3B4', 0.4);
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.7; ctx.fillRect(-3, -2.5, 6, 5); ctx.globalAlpha = 1;
      ctx.fillStyle = '#E3B58F'; for (const x of [-6.5, 6.5]) for (const y of [-1, 1]) { ctx.beginPath(); ctx.arc(x, y, 0.5, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    // exam papers in a little stack, the top one lifted by the breeze
    papers(ctx, t) {
      const { rrect, paint, COL } = S();
      for (let i = 0; i < 3; i++) { rrect(ctx, -8 + i * 0.8, -3 - i * 2.2, 16, 2.4, 1); paint(ctx, i === 2 ? COL.cream : COL.white, 0.25); }
      ctx.save(); ctx.translate(2, -9); ctx.rotate(-0.12 + Math.sin(t * 2.2) * 0.07); rrect(ctx, -7, -1, 14, 2, 1); paint(ctx, COL.white, 0.25); ctx.restore();
    },
  };

  // a small round bubble with a number or word, drawn at (x, y) above a head; size grows with k (0..1)
  function tag(ctx, text, x, y, k, col) {
    const { COL, ink } = S(), s = 0.8 + (k == null ? 0.2 : k) * 1.5, fs = Math.round(10 * s);
    ctx.save(); ctx.translate(x, y); ctx.font = '800 ' + fs + 'px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12 * s;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-w / 2, -fs * 0.9, w, fs * 1.8, fs * 0.9); else ctx.rect(-w / 2, -fs * 0.9, w, fs * 1.8);
    ctx.fillStyle = col || COL.white; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 0.35; ctx.strokeStyle = ink(); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = ink(); ctx.fillText(text, 0, 0.5); ctx.restore();
  }

  // a big comic sound word ("Gluck!", "Schlürf!"): bold letters in a warm colour with a thick dark outline and a white rim,
  // readable on water, sand and sky alike; drawn centred on (x, y)
  function comic(ctx, text, x, y, size, fill, rot) {
    const { ink } = S(), fs = Math.round(size || 22);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot == null ? -0.08 : rot);
    ctx.font = '900 ' + fs + 'px Fredoka, Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = fs * 0.42; ctx.strokeText(text, 0, 0);
    ctx.strokeStyle = ink(); ctx.lineWidth = fs * 0.2; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = fill || '#FFD86B'; ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // a beach thing riding inside a bubble (centre cx, cy, radius r): small, turning slowly, under the shine of the bubble
  function bubbleItem(ctx, kind, cx, cy, r, t) {
    const sd = S(); ctx.save(); ctx.translate(cx, cy + 1); ctx.rotate(Math.sin(t * 1.6 + cx * 0.05) * 0.35); const k = r / 15;
    if (sd.ICONS[kind]) { ctx.scale(0.9 * k, 0.9 * k); sd.ICONS[kind](ctx, t); }
    else if (sd.PROPS[kind]) { ctx.scale(0.62 * k, 0.62 * k); ctx.translate(0, 12); sd.PROPS[kind](ctx, t, {}); }
    ctx.restore();
  }
  Object.assign(window.MimoCoast.sdraw, { comic, bubbleItem, tentacle, snake, starfish, tag, carry: CARRY });
  Object.assign(window.MimoCoast.sdraw.PROPS, P2);
  Object.assign(window.MimoCoast.sdraw.ICONS, { starfish: (ctx, t) => starfish(ctx, t || 0, 11) });
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
