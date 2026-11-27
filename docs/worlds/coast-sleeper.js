// Sleepers: a figure asleep is drawn as a calm shape with only the head of the real figure on it. The joint figures are built
// for standing and facing the viewer, so a lying one used to be tipped over and squashed. Now the body is hidden in a cover
// (a quilted sleeping bag on a bench, a striped beach towel on an air mattress) and the head lies on a pillow, upright,
// the face to the viewer, eyes shut (fig.asleep). The covers take their colours from the figure's clothes.
//   MimoCoast.sleeper.drawBag(ctx, e, rigAt, o)     bench: o = { t, f (side of the feet, 1 = feet to the right), wake 0..1 }
//   MimoCoast.sleeper.drawTowel(ctx, e, rigAt, o)   mattress: o = { t, wake 0..1, figureOnly (no pillow) }
// Both draw with the origin on the surface the sleeper lies on (the bench top / the mattress top), centred, y down.
// wake lifts head and chest out of the cover (the startle, "Hab ich was verpasst?"); the cover stays as a lap blanket.
// The head comes from the normal figure (rigAt) clipped to the head, so hair, glasses and sunburn come along for free.
(function () {
  'use strict';
  window.MimoCoast = window.MimoCoast || {};
  const C = window.MimoCoast;
  const TAU = Math.PI * 2;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- colours ----------
  const rgb = (h) => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * k)); };
  const NIGHT = '#1E2860';
  const nightStep = () => ((C.storyEnv && C.storyEnv.night) | 0);
  const dim = (h) => { const n = nightStep(); return n ? mix(h, NIGHT, 0.075 * n) : h; };
  const colorsOf = (e) => (e.pp && e.pp.rig && e.pp.rig.colors) || {};
  // what the figure wears: the stripe colour of the shirt (or the trousers) gives the cover its colour, the trousers its trim
  function palette(e) {
    const c = colorsOf(e), base = c.stripes || (c.trousers && c.trousers.fill) || '#BFC7DE', trim = (c.trousers && c.trousers.fill) || '#80695A';
    const main = mix(base, '#6F86C8', 0.5);
    return {
      main: dim(main), dark: dim(mix(main, '#3B3560', 0.3)), light: dim(mix(main, '#FFFFFF', 0.45)), trim: dim(trim), trimDark: dim(mix(trim, '#3B3560', 0.3)),
      cream: dim('#FFF3DC'), white: dim('#FFFBF6'), shade: dim('#E9E1EC'),
    };
  }
  const skinOf = (e) => {
    const c = colorsOf(e).skin || {}, red = (e.red | 0);
    return { fill: dim(mix(c.fill || '#F8DCC9', '#E8685A', Math.min(1, red * 0.2))), line: dim(mix(c.line || '#C4918A', '#B8504A', Math.min(1, red * 0.2))) };
  };
  const ink = () => (C.sdraw && C.sdraw.ink ? C.sdraw.ink() : '#3B3560');
  const stroke = (ctx, a) => { ctx.strokeStyle = ink(); ctx.globalAlpha = a == null ? 0.3 : a; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1; };
  const paint = (ctx, color, a) => { ctx.fillStyle = color; ctx.fill(); stroke(ctx, a); };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  // ---------- the head ----------
  const HEAD_W = 15, HEAD_RX = 17, HEAD_RY = 17;   // the part of the figure kept: half width, above and below the middle of the head (px at scale 1)
  // the figure drawn so its head is at (hx, hy), turned by tilt; only the head, or (lift > 0) head and chest down to the line cutY
  function figureAt(ctx, e, rigAt, hx, hy, tilt, cutY, wide, sitting) {
    if (!e.pp) return;
    const s = e.scale || 1, h = C.cast.head(e), w = (HEAD_W + (wide || 0)) * s;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
    // the clip is a box around the head; while he sits up it grows down to the cover line (in the unrotated frame)
    ctx.beginPath();
    if (sitting || wide > 0) ctx.ellipse(0, -2 * s, HEAD_RX * s, HEAD_RY * s, 0, 0, TAU);
    else ctx.ellipse(0, -3.5 * s, 16 * s, 14 * s, 0, 0, TAU);   // head only: no neck, no collar
    if (cutY != null && cutY > hy) ctx.rect(-w, 0, 2 * w, cutY - hy);
    ctx.clip();
    const fig = e.pp.fig, extra = fig.extra;
    fig.extra = null;   // the rucksack stands beside the bench instead (volcano-story-acts.js)
    rigAt(ctx, e, -h[0], -h[1], { noShadow: true });
    fig.extra = extra;
    ctx.restore();
  }
  // the lift of a wake: a quick start with a small overshoot
  const wakeLift = (k) => { const q = clamp01(k); return q < 1 ? ease(q) * (1 + 0.12 * Math.sin(q * Math.PI)) : 1; };

  // ---------- sleeping bag on a bench ----------
  const BAG = { SCALE: 1.2, HEAD: [-31, -23] };
  function bagPath(ctx, b) {
    ctx.beginPath(); ctx.moveTo(-20, -5);
    ctx.bezierCurveTo(-21, -11, -17, -15.5 - b, -9, -16 - b);
    ctx.bezierCurveTo(5, -17 - b * 1.3, 20, -13.5 - b * 0.6, 31, -10);
    ctx.bezierCurveTo(36.5, -8.5, 37.5, -3, 34, -1);
    ctx.lineTo(-16, 0); ctx.quadraticCurveTo(-21, 0, -20, -5); ctx.closePath();
  }
  function bag(ctx, e, o) {
    const P = palette(e), b = o.breath, lift = o.lift;
    ctx.save(); ctx.translate(0, lift * 3);   // the bag slumps a little when he sits up
    bagPath(ctx, b); paint(ctx, P.main);
    ctx.save(); bagPath(ctx, b); ctx.clip();
    // quilted channels: soft puffs between stitched seams
    const g = ctx.createLinearGradient(0, -18, 0, 1); g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,30,80,0.22)');
    ctx.fillStyle = g; ctx.fillRect(-24, -22, 64, 24);
    ctx.strokeStyle = P.dark; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.9; ctx.setLineDash([2.2, 1.6]);
    for (const x of [-6, 3.5, 13, 22.5]) { ctx.beginPath(); ctx.moveTo(x - 1.5, -20); ctx.quadraticCurveTo(x + 2.2, -8, x - 0.6, 2); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // the foot box in the trousers' colour, a zip line along the top
    ctx.beginPath(); ctx.moveTo(26.5, -20); ctx.quadraticCurveTo(29.5, -8, 26.5, 2); ctx.lineTo(40, 2); ctx.lineTo(40, -20); ctx.closePath(); ctx.fillStyle = P.trim; ctx.fill();
    ctx.strokeStyle = P.trimDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(26.5, -20); ctx.quadraticCurveTo(29.5, -8, 26.5, 2); ctx.stroke();
    ctx.strokeStyle = P.light; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-8, -14.8 - b); ctx.bezierCurveTo(4, -15.6 - b, 16, -12.2, 25, -9.6); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();
    bagPath(ctx, b); stroke(ctx, 0.3);
    // the hood end: a gathered collar in the trousers' colour with the drawstring and its toggles
    ctx.beginPath(); ctx.moveTo(-20, -5); ctx.bezierCurveTo(-21, -11, -18, -14.8 - b, -13.5, -15.6 - b); ctx.quadraticCurveTo(-11.5, -8, -13, 0.4); ctx.lineTo(-16, 0); ctx.quadraticCurveTo(-21, 0, -20, -5); ctx.closePath(); paint(ctx, P.trim, 0.3);
    ctx.strokeStyle = P.cream; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-19.7, -9.2); ctx.quadraticCurveTo(-16.5, -7.4, -12.8, -9.4); ctx.stroke();
    for (const [x, dx] of [[-16.8, -1], [-14, 1.2]]) {
      ctx.beginPath(); ctx.moveTo(x, -8); ctx.quadraticCurveTo(x + dx, -4.5, x + dx * 0.4, -1.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dx * 0.4, -1.1, 1.3, 0, TAU); paint(ctx, P.cream, 0.4);
    }
    ctx.restore();
  }
  function pillow(ctx, e, lift) {
    const P = palette(e); ctx.save(); ctx.translate(0, lift * 0.5);
    rr(ctx, -38, -12.5, 24, 12.5, 6); paint(ctx, P.white, 0.3);
    ctx.strokeStyle = P.shade; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-38 + 4, -9); ctx.quadraticCurveTo(-38 + 12, -11.6, -38 + 20, -9); ctx.stroke();
    ctx.restore();
  }

  function drawBag(ctx, e, rigAt, o) {
    const t = o.t, f = o.f || 1, wk = wakeLift(o.wake || 0), br = 0.5 + 0.5 * Math.sin(t * 1.6 + (e.phase || 0)), breath = (1 - wk) * br * 1.5;
    ctx.save(); ctx.scale(f, 1);   // local: head to the left, feet to the right (x mirrored for f = -1)
    // head: tilted a little toward the pillow side; sitting up it lifts straight and moves back over the shoulders
    const tilt = lerp(0.4 + Math.sin(t * 0.7 + (e.phase || 0)) * 0.03, 0, wk) * f;
    const hx = f * lerp(BAG.HEAD[0], -18, wk), hy = lerp(BAG.HEAD[1] - br * 0.6, -43, wk), cut = wk > 0.01 ? lerp(hy + 6, -18, wk) : null;
    ctx.save(); ctx.scale(f, 1); figureAt(ctx, e, rigAt, hx, hy, tilt, cut, 10 * wk, wk > 0.5); ctx.restore();
    ctx.scale(BAG.SCALE, BAG.SCALE * 0.95); pillow(ctx, e, wk); bag(ctx, e, { breath, lift: wk });
    ctx.restore();
  }

  // ---------- towel on an air mattress ----------
  function towelPath(ctx, b, lift) {
    const k = 1 - Math.min(1, lift) * 0.6, h = (v) => 9 + (v - 9) * k * 0.78;   // pulled down to the lap when he sits up
    ctx.beginPath(); ctx.moveTo(-19, -9);
    ctx.bezierCurveTo(-20, -h(16) - b, -14, -h(20) - b, -4, -h(21) - b);
    ctx.bezierCurveTo(8, -h(22) - b * 1.2, 17, -h(18) - b * 0.6, 28, -h(15));
    ctx.lineTo(31, -h(11)); ctx.lineTo(31, -9.5);
    ctx.quadraticCurveTo(8, -8.2, -16, -9); ctx.closePath();
  }
  function towel(ctx, e, o) {
    const P = palette(e), b = o.breath, wk = o.lift;
    ctx.save(); ctx.translate(Math.min(1, wk) * 5, 0);
    towelPath(ctx, b, wk); paint(ctx, P.white);
    ctx.save(); towelPath(ctx, b, wk); ctx.clip();
    ctx.fillStyle = P.main;   // wide stripes across, the way a beach towel looks
    for (let x = -18, i = 0; x < 34; x += 9, i++) if (i % 2 === 0) ctx.fillRect(x, -26, 5.2, 18);
    ctx.fillStyle = P.dark; for (let x = -18, i = 0; x < 34; x += 9, i++) if (i % 2 === 0) ctx.fillRect(x, -26, 1.1, 18);
    const g = ctx.createLinearGradient(0, -24, 0, -8); g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,30,80,0.18)');
    ctx.fillStyle = g; ctx.fillRect(-20, -26, 54, 20);
    ctx.strokeStyle = 'rgba(59,53,96,0.16)'; ctx.lineWidth = 1.1;   // two soft folds over the knees
    ctx.beginPath(); ctx.moveTo(16, -17); ctx.quadraticCurveTo(19, -13, 17, -9.5); ctx.moveTo(23, -14); ctx.quadraticCurveTo(25, -11.5, 24, -9.5); ctx.stroke();
    ctx.restore();
    towelPath(ctx, b, wk); stroke(ctx, 0.3);
    ctx.strokeStyle = P.cream; ctx.lineWidth = 1; ctx.lineCap = 'round';   // fringe at the foot end
    for (let y = -10.5; y > -(9 + 12 * (1 - Math.min(1, wk) * 0.6)) + 1.5; y -= 2.4) { ctx.beginPath(); ctx.moveTo(31, y); ctx.lineTo(33.2, y + 0.4); ctx.stroke(); }
    ctx.restore();
  }
  // the feet look out under the towel, toes up
  function feet(ctx, e, wk) {
    const s = skinOf(e); ctx.save(); ctx.translate(Math.min(1, wk) * 5, 0);
    for (const [x, y, r] of [[33.6, -14.5, -0.22], [37, -13, 0.12]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -2.4, 2.6, 5.2, 0, 0, TAU); paint(ctx, s.fill, 0.35); ctx.restore();
    }
    ctx.restore();
  }
  function mattressPillow(ctx, e) {
    const P = palette(e); rr(ctx, -40, -16.5, 26, 7.5, 3.8); paint(ctx, P.white, 0.3);
    ctx.strokeStyle = P.shade; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-35, -12.6); ctx.quadraticCurveTo(-27, -14.6, -19, -12.6); ctx.stroke();
  }

  function drawTowel(ctx, e, rigAt, o) {
    const t = o.t, wk = wakeLift(o.wake || 0), br = 0.5 + 0.5 * Math.sin(t * 1.6 + (e.phase || 0)), breath = (1 - wk) * br * 1.5;
    ctx.save();   // the origin is the foot of the mattress (its top is y = -11)
    const tilt = lerp(0.4 + Math.sin(t * 0.7 + (e.phase || 0)) * 0.03, 0, wk);
    const hx = lerp(-27, -10, wk), hy = lerp(-25 - br * 0.5, -39, wk), cut = wk > 0.01 ? lerp(hy + 6, -13, wk) : null;
    figureAt(ctx, e, rigAt, hx, hy, tilt, cut, 10 * wk, wk > 0.5);
    if (!o.figureOnly) mattressPillow(ctx, e);
    feet(ctx, e, wk);
    towel(ctx, e, { breath, lift: wk });
    ctx.restore();
  }

  C.sleeper = { drawBag, drawTowel, wakeLift, palette };
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
