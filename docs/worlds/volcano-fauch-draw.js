// World 5: pictures of Fauch, the dragon, for the levels and the scenes (not the fight: volcano-boss-draw.js draws him there).
// A grumpy, nervous dragon dad in the pastel style of the boss: coral body with light dots, yellow spikes, cream horns, a heavy
// brow, pink cheeks. Pure drawing: every motion comes from the time t it is given (api.time), so the level bots replay exactly.
//   MimoVolcano.fauchDraw.fly(ctx, t, o)    in flight, seen from the side; origin = the middle of the body, about 190 px long at
//        scale 1. o: face (1 right, -1 left), scale, flap (beats per second, default 1.4; 0 = wings held out, gliding), open
//        (0..1 the mouth: a roar), puff (0..1 smoke from the nostrils), mono (a colour: the whole dragon in one colour, for a
//        shadow or a far silhouette), alpha, look (-1..1 the pupil), legs (0..1 legs down to land), blink (0..1 closed)
//   sit(ctx, t, o)    sitting on a rock or a roof, wings folded; origin = between the feet. About 120 px high at scale 1.
//        o: face, scale, look (-1..1), lookUp (-1..1), blink (0..1), sleepy (0..1 half closed lids), open (0..1), puff (0..1),
//        tail (0..1 wag), wings (0..1 half spread), lean (-1..1 the head forward), mono, alpha, drink (0..1 the head down to sip),
//        wave (0..1 the near claw raised, 0 = down), waveAmp (0..1 how wide it waves, 0 = held still), waveHz (default 1.3),
//        thumb (0..1 the claw raised as a fist with the thumb up), wide (0..1 huge startled eyes, no lid),
//        egg (true: a round thing in front of his feet), cover (0..1 how far the near wing lies over it; 0 = lifted, the egg
//        shows, 1 = hidden, default 0.6: only a round bulge peeks out under the hem)
//   MimoVolcano.fauchDraw.parts   { head, wing, spikes, tail, pen, palette, ell, mix }: the pieces for volcano-fauch-pose.js
//   eye(ctx, t, o)    one huge eye seen through a gap; origin = the middle of the eye, about 70 px wide at scale 1.
//        o: open (0..1 the lid), look [dx, dy] (-1..1 each), scale, glow (0..1 the warm light around it)
//   ring(ctx, r, a, t)   a smoke ring of radius r (px), alpha a, wobbling with t
//   curl(ctx, t, o)   curled up asleep on the ground (origin = the middle of the belly), about 130 px wide at scale 1.
//        o: face, scale, breath (0..1), puff, blink (default 1), wide, mono, alpha
//   peek(ctx, t, o)   only head and neck over an edge (origin = the neck stump at the edge). o: face, scale, look, blink, wide
//   MimoVolcano.fauchTiny(ctx, x, y, size, pose, t, o)   Fauch tiny (24 to 40 px) for a corner of a photo, see below at fauchTiny
//   colours()   the dragon's colours of the moment (light, dark, night): the boss palette when it is loaded
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const FALLBACK = { body: '#E8807A', lite: '#F9CDB6', belly: '#FBDCC8', spike: '#F6D374', horn: '#FBEFD9', hornInk: '#E2C9A2', ink: '#3A2E48', blush: '#F4B4C0', tongue: '#F27E92', mouth: '#5B2A3A' };
  let api = null;
  function colours() {
    const F = window.MimoFauch;
    if (F && F.colours && api && api.W) { try { return F.colours(); } catch (_) { /* boss palette not ready: fall back */ } }
    return F ? (api && api.dark ? F.DARK : F.LIGHT) : FALLBACK;
  }
  const ell = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); };
  // fill the path; in mono mode every part is the one colour and there is no outline
  function pen(ctx, d) {
    const ink = d.mono ? null : d.ink;
    return (col, a) => { ctx.fillStyle = d.mono || col; ctx.fill(); if (ink) { ctx.strokeStyle = ink; ctx.globalAlpha = (a == null ? 0.28 : a) * (d.alpha == null ? 1 : d.alpha); ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; } };
  }
  const palette = (o) => ({ ...colours(), mono: o && o.mono, alpha: o && o.alpha });

  // ---------- the head, shared by every pose: origin = the back of the skull, facing right ----------
  // o: open, blink, sleepy, look, lookUp, puff, t
  function head(ctx, d, o, paint) {
    const open = o.open || 0, t = o.t || 0, jaw = open * 0.42;
    // horns sweep back over the neck
    for (const [x, len, rot] of [[6, 1, 0], [14, 0.86, 0.12]]) {
      ctx.save(); ctx.translate(x, -11); ctx.rotate(-0.55 + rot);
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(-5 * len, -14 * len, -20 * len, -19 * len); ctx.quadraticCurveTo(-7 * len, -2 * len, 6, 3); ctx.closePath(); paint(d.horn, 0.5);
      if (!d.mono) { ctx.strokeStyle = d.hornInk; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9 * len, -7 * len); ctx.lineTo(-5 * len, -4 * len); ctx.stroke(); }
      ctx.restore();
    }
    // the ear frill (a spike fan) behind the cheek
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-12, -6); ctx.lineTo(-6, 0); ctx.lineTo(-13, 4); ctx.lineTo(-3, 5); ctx.closePath(); paint(d.spike);
    // the lower jaw (drops when the mouth opens)
    ctx.save(); ctx.translate(8, 6); ctx.rotate(jaw);
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(16, 6, 32, 2); ctx.quadraticCurveTo(36, 0, 34, -3); ctx.lineTo(-4, -4); ctx.closePath(); paint(d.belly);
    if (open > 0.15 && !d.mono) { ctx.fillStyle = d.mouth; ctx.beginPath(); ctx.moveTo(-2, -3.5); ctx.quadraticCurveTo(16, 3, 31, -2); ctx.lineTo(31, -4); ctx.closePath(); ctx.fill(); ctx.fillStyle = d.tongue; ell(ctx, 14, -1.5, 9, 2.6); ctx.fill(); }
    ctx.restore();
    if (open > 0.15 && !d.mono) { // the dark mouth between the jaws, two little teeth above
      ctx.fillStyle = d.mouth; ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(24, 6 + open * 10, 40, 2 + open * 12); ctx.lineTo(42, 3); ctx.quadraticCurveTo(28, 5, 6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; for (const x of [30, 36]) { ctx.beginPath(); ctx.moveTo(x - 2, 4); ctx.lineTo(x, 8 + open * 2); ctx.lineTo(x + 2, 4); ctx.closePath(); ctx.fill(); }
    }
    // skull and the long round snout
    ctx.beginPath(); ctx.moveTo(-2, 6); ctx.bezierCurveTo(-8, -6, 2, -17, 16, -16); ctx.bezierCurveTo(26, -15, 30, -9, 38, -7); ctx.bezierCurveTo(48, -5, 50, 4, 44, 6);
    ctx.bezierCurveTo(34, 8, 16, 9, -2, 6); ctx.closePath(); paint(d.body);
    if (d.mono) return;
    // light dots on the skull, the nostril (with smoke), the grumpy mouth line
    ctx.fillStyle = d.lite; ctx.globalAlpha *= 0.8; for (const [x, y, r] of [[4, -8, 2.2], [11, -12, 1.6], [0, -1, 1.5]]) { ell(ctx, x, y, r, r); ctx.fill(); } ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
    ctx.fillStyle = d.ink; ell(ctx, 42, -3, 1.8, 1.2, -0.3); ctx.fill();
    if (open <= 0.15) { ctx.strokeStyle = d.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, 5); ctx.quadraticCurveTo(28, 7.5, 40, 4); ctx.stroke(); }
    // the cheek and the eye: a big white with a heavy lid, the brow pulled down (grumpy, but the cheek is pink)
    ctx.fillStyle = d.blush; ctx.globalAlpha *= 0.75; ell(ctx, 14, 1, 5, 3); ctx.fill(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
    const ex = 19, ey = -7, wide = o.wide || 0, ew = 1 + 0.32 * wide, shut = wide > 0 ? 0 : Math.max(o.blink || 0, o.sleepy ? 0.45 * o.sleepy : 0);
    ctx.fillStyle = '#FFFFFF'; ell(ctx, ex, ey, 6 * ew, 5.2 * ew); ctx.fill(); ctx.strokeStyle = d.ink; ctx.globalAlpha *= 0.35; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
    ctx.fillStyle = d.ink; ell(ctx, ex + 1.4 + (o.look || 0) * 2.2, ey + 0.8 - (o.lookUp || 0) * 2, 2.6 - 0.9 * wide, 3 - 0.9 * wide); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ell(ctx, ex + 0.6 + (o.look || 0) * 2.2, ey - 0.6 - (o.lookUp || 0) * 2, 0.9, 0.9); ctx.fill();
    // the lid comes down from the top (always a little: he looks grumpy), the brow above it
    const lid = wide > 0 ? 0.02 : 0.32 + 0.68 * Math.min(1, shut);
    ctx.save(); ell(ctx, ex, ey, 6.2 * ew, 5.4 * ew); ctx.clip(); ctx.fillStyle = d.body; ctx.fillRect(ex - 7, ey - 6, 14, 11 * lid); ctx.restore();
    ctx.strokeStyle = d.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - 6, ey - 5.4 + 10.6 * lid - 0.6); ctx.lineTo(ex + 6, ey - 5.4 + 10.6 * lid - 0.6 * 0.2); ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
    ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 8, ey - 8.5 - 4 * wide); ctx.lineTo(ex + 6, ey - 5.4 - 6 * wide); ctx.stroke();
    if (o.puff > 0) { // two little smoke puffs from the nostril
      for (let i = 0; i < 3; i++) {
        const q = ((t * 0.9 + i / 3) % 1), a = o.puff * (1 - q) * 0.8;
        ctx.fillStyle = '#B9B3C9'; ctx.globalAlpha = a; ell(ctx, 46 + q * 12, -6 - q * 16 + Math.sin(q * 6 + i) * 2, 2.5 + q * 4, 2.2 + q * 3.6); ctx.fill();
      }
      ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
    }
  }

  // a bat wing from the shoulder: span (px), spread (0..1 folded .. wide open); bones in the body colour, the membrane yellow
  function wing(ctx, d, paint, span, spread, far) {
    const sp = Math.max(0, Math.min(1.2, spread)), wx = -span * (0.18 + 0.12 * sp), wy = -span * (0.42 + 0.4 * sp);
    const tips = [[-0.2, -1.0], [-0.62, -0.72], [-0.86, -0.32]].map(([a, b]) => [wx + span * a * (0.55 + 0.45 * sp), wy + span * b * (0.25 + 0.55 * sp) + span * 0.12]);
    const root = [-span * 0.5, span * 0.06];
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wx, wy); ctx.lineTo(tips[0][0], tips[0][1]);
    let prev = tips[0];
    for (const q of [...tips.slice(1), root]) { const mx = (prev[0] + q[0]) / 2, my = (prev[1] + q[1]) / 2, nx = (q[1] - prev[1]) * 0.18, ny = -(q[0] - prev[0]) * 0.18; ctx.quadraticCurveTo(mx - nx, my - ny, q[0], q[1]); prev = q; }
    ctx.quadraticCurveTo(-span * 0.22, span * 0.1, 0, 0); ctx.closePath(); paint(d.mono || d.wing || d.spike, 0.22);
    if (d.mono) return;
    ctx.strokeStyle = d.body; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wx, wy); ctx.stroke();
    ctx.lineWidth = 2; for (const q of tips) { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    ctx.fillStyle = d.horn; ctx.beginPath(); ctx.moveTo(wx - 2, wy); ctx.lineTo(wx + 1, wy - 7); ctx.lineTo(wx + 3, wy + 1); ctx.closePath(); ctx.fill();
  }
  // a row of back spikes along a quadratic curve
  function spikes(ctx, paint, d, pts, n, size) {
    const [a, c, b] = pts;
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = (1 - k) * (1 - k) * a[0] + 2 * k * (1 - k) * c[0] + k * k * b[0], y = (1 - k) * (1 - k) * a[1] + 2 * k * (1 - k) * c[1] + k * k * b[1];
      const dx = 2 * (1 - k) * (c[0] - a[0]) + 2 * k * (b[0] - c[0]), dy = 2 * (1 - k) * (c[1] - a[1]) + 2 * k * (b[1] - c[1]), L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L, s = size * (0.7 + 0.3 * Math.sin(k * Math.PI));
      ctx.beginPath(); ctx.moveTo(x - dx / L * s * 0.6, y - dy / L * s * 0.6); ctx.lineTo(x + nx * s * 1.3, y + ny * s * 1.3); ctx.lineTo(x + dx / L * s * 0.6, y + dy / L * s * 0.6); ctx.closePath(); paint(d.spike, 0.2);
    }
  }
  // the tail from (x0, y0) along a curve to the spade tip
  function tail(ctx, d, paint, pts, w) {
    const [a, c, b] = pts;
    ctx.beginPath(); ctx.moveTo(a[0], a[1] - w); ctx.quadraticCurveTo(c[0], c[1] - w * 0.5, b[0], b[1]); ctx.quadraticCurveTo(c[0], c[1] + w * 0.5, a[0], a[1] + w); ctx.closePath(); paint(d.body);
    const ang = Math.atan2(b[1] - c[1], b[0] - c[0]);
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, -7); ctx.lineTo(13, 0); ctx.lineTo(4, 7); ctx.closePath(); paint(d.spike); ctx.restore();
  }


  // the near claw as an arm from the shoulder: down (raise 0) to up and forward (raise 1), waving or giving a thumb
  function arm(ctx, d, paint, t, o, raise) {
    const sx = 12, sy = -50, thumb = o.thumb || 0, a0 = 1.15, a1 = thumb > (o.wave || 0) ? -0.55 : -1.2;
    const sw = o.waveAmp ? Math.sin(t * TAU * (o.waveHz || 1.3)) * 0.42 * o.waveAmp * raise : 0, a = a0 + (a1 - a0) * Math.max(0, Math.min(1, raise)) + sw, len = 22;
    const px = sx + Math.cos(a) * len, py = sy + Math.sin(a) * len;
    ctx.save(); ctx.lineCap = 'round';
    if (!d.mono) { ctx.strokeStyle = d.ink; ctx.globalAlpha = 0.28 * (d.alpha == null ? 1 : d.alpha); ctx.lineWidth = 9.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; }
    ctx.strokeStyle = d.mono || d.body; ctx.lineWidth = 7.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
    ctx.translate(px, py); ctx.rotate(a);
    ell(ctx, 3, 0, 6.5, 5.6); paint(d.body);
    if (!d.mono) {
      ctx.fillStyle = d.belly;
      if (thumb > 0.3) { ctx.rotate(-a); ell(ctx, 1, -8 * thumb, 3.2, 6.4 * thumb); paint(d.belly, 0.4); ctx.rotate(a); }
      else for (const k of [-3.4, 0, 3.4]) { ell(ctx, 9.4, k, 1.8, 1.5); ctx.fill(); }
    }
    ctx.restore();
  }
  // the egg in front of his feet (cream, a few soft dots) and the near wing laid over it like a blanket
  function egg(ctx, d, paint, t, o) {
    const cov = o.cover == null ? 0.6 : Math.max(0, Math.min(1, o.cover)), ex = 27, ey = -13, hem = -(1 - cov) * 24 + 1;
    if (!d.mono) { const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, 34); g.addColorStop(0, 'rgba(255,196,120,0.38)'); g.addColorStop(1, 'rgba(255,196,120,0)'); ctx.fillStyle = g; ell(ctx, ex, ey, 34, 30); ctx.fill(); }
    ell(ctx, ex, ey, 12, 15.5); paint('#FBEFD9', 0.4);
    if (!d.mono) { ctx.fillStyle = '#EBCBA6'; for (const [x, y, r] of [[-4, -6, 2.2], [3, 2, 1.8], [-2, 7, 1.5], [5, -8, 1.3]]) { ell(ctx, ex + x, ey + y, r, r); ctx.fill(); } }
    // the blanket: a membrane from the shoulder over the egg, a scalloped hem; the bones are the body colour
    const sx = 2, sy = -56, ax = 46, ay = -28 + (1 - cov) * -8, bx = 44, by = hem - 2, n = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ax + 4, sy + 2, ax, ay); ctx.lineTo(bx, by);
    for (let i = 1; i <= n; i++) { const x0 = bx + (sx + 2 - bx) * (i - 1) / n, x1 = bx + (sx + 2 - bx) * i / n; ctx.quadraticCurveTo((x0 + x1) / 2, hem + 7, x1, hem - 1 + (i === n ? -4 : 0)); }
    ctx.closePath(); paint(d.wing || d.spike, 0.3);
    if (d.mono) return;
    ctx.strokeStyle = d.body; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ax + 4, sy + 2, ax, ay); ctx.stroke();
    ctx.lineWidth = 1.8; for (let i = 0; i < n; i++) { const x = bx + (sx + 2 - bx) * (i + 0.5) / n; ctx.beginPath(); ctx.moveTo(ax - 2, ay + 2); ctx.lineTo(x, hem + 3); ctx.stroke(); }
  }

  // ---------- in flight ----------
  function fly(ctx, t, o) {
    o = o || {}; const d = palette(o), paint = pen(ctx, d), f = o.face || 1, s = o.scale || 1, rate = o.flap == null ? 1.4 : o.flap;
    const beat = rate ? Math.sin(t * TAU * rate) : 0.2, legs = o.legs || 0;
    ctx.save(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; ctx.scale(f * s, s);
    const bob = -beat * 3;
    ctx.translate(0, bob);
    // the far wing, darker, beating a little behind the near one
    ctx.save(); ctx.translate(4, -10); ctx.scale(0.82, 1); ctx.rotate(0.15); if (!d.mono) ctx.globalAlpha *= 0.85; wing(ctx, { ...d, wing: d.mono ? null : mix(d.spike, d.body, 0.35) }, paint, 70, 0.5 + 0.5 * (rate ? Math.sin(t * TAU * rate - 0.5) : 0.2), true); ctx.restore();
    // the tail, swinging
    const sw = Math.sin(t * 2.2) * 6;
    tail(ctx, d, paint, [[-24, 2], [-58, 12 + sw * 0.5], [-86, -2 + sw]], 11);
    // the legs: tucked in flight, down to land
    for (const [x, k] of [[-14, 1], [12, 0.8]]) {
      ctx.save(); ctx.translate(x, 10); ctx.rotate((1 - legs) * 1.1); ell(ctx, 0, 6, 5.5 * k, 8 * k); paint(d.body); ell(ctx, 1, 13 * k, 5 * k, 2.6 * k); paint(d.belly); ctx.restore();
    }
    // the body with the belly plates and dots
    ell(ctx, 0, 0, 34, 20); paint(d.body);
    if (!d.mono) {
      ctx.save(); ell(ctx, 0, 0, 34, 20); ctx.clip(); ell(ctx, 4, 11, 30, 10); ctx.fillStyle = d.belly; ctx.fill();
      ctx.strokeStyle = d.ink; ctx.globalAlpha *= 0.15; ctx.lineWidth = 1; for (const x of [-12, -2, 8, 18]) { ctx.beginPath(); ctx.moveTo(x, 3); ctx.quadraticCurveTo(x + 2, 9, x, 16); ctx.stroke(); } ctx.restore();
      ctx.fillStyle = d.lite; for (const [x, y, r] of [[-16, -8, 2.6], [-4, -11, 2], [10, -9, 2.4], [-24, 0, 1.8]]) { ell(ctx, x, y, r, r); ctx.fill(); }
    }
    spikes(ctx, paint, d, [[-30, -6], [-4, -22], [26, -14]], 5, 5);
    // the neck and the head, a little up
    ctx.beginPath(); ctx.moveTo(18, -12); ctx.quadraticCurveTo(34, -26, 46, -26); ctx.lineTo(50, -12); ctx.quadraticCurveTo(36, -6, 24, 6); ctx.closePath(); paint(d.body);
    spikes(ctx, paint, d, [[26, -16], [36, -26], [46, -28]], 2, 3.6);
    ctx.save(); ctx.translate(40, -24); ctx.rotate(-0.08 + (o.open || 0) * -0.18); ctx.scale(1.45, 1.45); head(ctx, d, { ...o, t }, paint); ctx.restore();
    // the near wing, in front of the body
    ctx.save(); ctx.translate(-2, -8); ctx.rotate(-0.05); wing(ctx, d, paint, 84, 0.55 + 0.55 * beat, false); ctx.restore();
    ctx.restore();
  }

  // ---------- sitting ----------
  function sit(ctx, t, o) {
    o = o || {}; const d = palette(o), paint = pen(ctx, d), f = o.face || 1, s = o.scale || 1;
    const br = Math.sin(t * 1.6) * 1.2, wag = (o.tail || 0.3) * Math.sin(t * 2.4) * 5, lean = o.lean || 0, sip = o.drink || 0;
    ctx.save(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; ctx.scale(f * s, s);
    if (!d.mono) { ctx.fillStyle = 'rgba(58,46,72,0.16)'; ell(ctx, 0, 0, 44, 5); ctx.fill(); }
    // the tail curls round the feet to the front
    tail(ctx, d, paint, [[-22, -10], [-52, -2], [-30 + wag * 0.3, -2 + wag * 0.2]], 7);
    // folded wings on the back (half spread when o.wings)
    ctx.save(); ctx.translate(-8, -62); ctx.rotate(-0.25 - (o.wings || 0) * 0.5); wing(ctx, d, paint, 58 + 16 * (o.wings || 0), 0.15 + 0.5 * (o.wings || 0), false); ctx.restore();
    // the big hind leg, the belly, the chest
    ell(ctx, -16, -18, 18, 16, -0.2); paint(d.body);
    ctx.beginPath(); ctx.moveTo(-26, -6); ctx.bezierCurveTo(-34, -40, -18, -76 + br, 4, -78 + br); ctx.bezierCurveTo(22, -78 + br, 26, -50, 22, -24); ctx.bezierCurveTo(20, -8, 8, -2, -10, -2); ctx.closePath(); paint(d.body);
    if (!d.mono) {
      ctx.beginPath(); ctx.moveTo(4, -70 + br); ctx.bezierCurveTo(20, -64, 20, -30, 14, -8); ctx.bezierCurveTo(6, -4, 0, -8, -2, -16); ctx.bezierCurveTo(-4, -40, -4, -62, 4, -70 + br); ctx.closePath(); ctx.fillStyle = d.belly; ctx.fill();
      ctx.strokeStyle = d.ink; ctx.globalAlpha *= 0.15; ctx.lineWidth = 1; for (const y of [-58, -46, -34, -22]) { ctx.beginPath(); ctx.moveTo(-1, y); ctx.quadraticCurveTo(8, y + 2, 16, y - 1); ctx.stroke(); } ctx.globalAlpha = d.alpha == null ? 1 : d.alpha;
      ctx.fillStyle = d.lite; for (const [x, y, r] of [[-20, -26, 2.6], [-12, -44, 2], [-22, -56, 1.8], [-8, -16, 1.8]]) { ell(ctx, x, y, r, r); ctx.fill(); }
    }
    spikes(ctx, paint, d, [[-28, -20], [-30, -60], [-6, -80]], 4, 5);
    // the feet and the little front paws
    for (const x of [-6, 12]) { ell(ctx, x, -3, 9, 4.2); paint(d.body); if (!d.mono) { ctx.fillStyle = d.belly; for (const k of [-4, 0, 4]) { ell(ctx, x + 5 + k * 0.6, -2 + Math.abs(k) * 0.1, 1.6, 1.6); ctx.fill(); } } }
    const raise = Math.max(o.wave || 0, o.thumb || 0);
    for (const k of [0, 1]) { if (k && raise > 0.02) continue; ctx.save(); ctx.translate(10 + k * 6, -40); ctx.rotate(0.4 - k * 0.2); ell(ctx, 4, 6, 4, 8); paint(k ? d.body : mix(d.body, d.ink, d.mono ? 0 : 0.08)); ctx.restore(); }
    if (raise > 0.02) arm(ctx, d, paint, t, o, raise);
    if (o.egg) egg(ctx, d, paint, t, o);
    // the neck up to the head (forward with lean, down to the lava with drink)
    const hx = 16 + lean * 10 + sip * 30, hy = -96 + Math.abs(lean) * 6 + sip * 44 + br * 0.6;
    ctx.beginPath(); ctx.moveTo(-6, -70); ctx.quadraticCurveTo(hx - 18, hy - 2, hx - 4, hy + 6); ctx.lineTo(hx + 6, hy + 14); ctx.quadraticCurveTo(hx - 6, hy + 30, 14, -56); ctx.closePath(); paint(d.body);
    spikes(ctx, paint, d, [[-6, -74], [hx - 22, hy - 6], [hx - 8, hy + 2]], 3, 4);
    ctx.save(); ctx.translate(hx - 10, hy + 6); ctx.rotate(-0.12 + lean * 0.2 + sip * 1.05 - (o.lookUp || 0) * 0.25); ctx.scale(1.5, 1.5); head(ctx, d, { ...o, t }, paint); ctx.restore();
    ctx.restore();
  }

  // ---------- one huge eye in the dark ----------
  function eye(ctx, t, o) {
    o = o || {}; const d = colours(), s = o.scale || 1, open = Math.max(0, Math.min(1, o.open == null ? 1 : o.open)), lk = o.look || [0, 0];
    ctx.save(); ctx.scale(s, s);
    if (o.glow) { const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70); g.addColorStop(0, 'rgba(255,170,90,' + 0.35 * o.glow + ')'); g.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = g; ell(ctx, 0, 0, 70, 50); ctx.fill(); }
    // the skin round the eye
    ell(ctx, 0, 0, 44, 28); ctx.fillStyle = d.body; ctx.fill(); ctx.strokeStyle = d.ink; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = d.lite; for (const [x, y, r] of [[-30, -14, 3], [28, 16, 2.4], [-24, 16, 2]]) { ell(ctx, x, y, r, r); ctx.fill(); }
    // the eye: white, an amber iris, a round pupil and a big highlight
    ctx.save(); ell(ctx, 0, 0, 30, 19 * Math.max(0.04, open)); ctx.clip();
    ell(ctx, 0, 0, 30, 19); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    const px = lk[0] * 12, py = lk[1] * 6;
    ell(ctx, px, py, 14, 14); ctx.fillStyle = '#F6B04F'; ctx.fill(); ell(ctx, px, py, 14, 14); ctx.strokeStyle = '#D9863A'; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, px, py, 7.5, 9); ctx.fillStyle = d.ink; ctx.fill();
    ell(ctx, px - 4, py - 5, 3.4, 3.4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    // the lids and the heavy brow
    ctx.strokeStyle = d.ink; ctx.lineWidth = 2; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(0, 0, 30, 19 * Math.max(0.04, open), 0, Math.PI, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = d.ink; ctx.beginPath(); ctx.moveTo(-34, -26 + (1 - open) * 8); ctx.quadraticCurveTo(0, -36 + (1 - open) * 10, 34, -20 + (1 - open) * 8); ctx.stroke();
    ctx.restore();
  }

  // ---------- a smoke ring ----------
  function ring(ctx, r, a, t) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(3, r * 0.32); ctx.strokeStyle = '#B9B3C9'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42 + Math.sin(t * 3) * r * 0.04, Math.sin(t * 1.3) * 0.08, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = '#E6E1EE'; ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r, r * 0.42, Math.sin(t * 1.3) * 0.08, Math.PI * 1.05, TAU * 0.97); ctx.stroke();
    ctx.restore();
  }


  // ---------- curled up asleep ----------
  // origin = the middle of the belly on the ground; about 130 px wide and 62 high at scale 1. o: face, scale, breath (0..1 the
  // chest up, default breathing slowly), puff (0..1 smoke from the nostril), blink (default 1: asleep), wide (0..1 startled eyes)
  function curl(ctx, t, o) {
    o = o || {}; const d = palette(o), paint = pen(ctx, d), f = o.face || 1, s = o.scale || 1;
    const br = o.breath == null ? 0.5 + 0.5 * Math.sin(t * TAU / 2.6) : o.breath, up = br * 2.4;
    ctx.save(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; ctx.scale(f * s, s);
    if (!d.mono) { ctx.fillStyle = 'rgba(58,46,72,0.16)'; ell(ctx, 6, 0, 62, 6); ctx.fill(); }
    // the tail wraps round the front, its spade tip beside the muzzle
    tail(ctx, d, paint, [[-38, -10], [-20, 8], [46, -3]], 6.5);
    // folded wing on the back, the body, the haunch, the belly
    ctx.save(); ctx.translate(-14, -36 - up); ctx.rotate(0.35); wing(ctx, d, paint, 46, 0.1, false); ctx.restore();
    ell(ctx, -4, -22 - up * 0.5, 41, 24 + up); paint(d.body);
    if (!d.mono) {
      ctx.save(); ell(ctx, -4, -22 - up * 0.5, 41, 24 + up); ctx.clip(); ell(ctx, 8, -5, 34, 12); ctx.fillStyle = d.belly; ctx.fill(); ctx.restore();
      ctx.fillStyle = d.lite; for (const [x, y, r] of [[-24, -34, 2.4], [-8, -42, 2], [10, -37, 2.2], [-34, -22, 1.8]]) { ell(ctx, x, y - up, r, r); ctx.fill(); }
    }
    ell(ctx, -22, -14, 17, 13, -0.2); paint(d.body);
    spikes(ctx, paint, d, [[-38, -22], [-14, -52 - up], [24, -42 - up]], 5, 5);
    ctx.save(); ctx.translate(-8, -34 - up); ctx.rotate(0.12); wing(ctx, d, paint, 52, 0.12, false); ctx.restore();
    // the front paws, and the head laid on them
    for (const x of [30, 44]) { ell(ctx, x, -3, 9, 4.4); paint(d.body); }
    ctx.save(); ctx.translate(24, -13 + up * 0.4); ctx.rotate(0.08 + br * 0.02); ctx.scale(1.12, 1.12); head(ctx, d, { ...o, t, blink: o.blink == null ? 1 : o.blink, puff: o.puff || 0 }, paint); ctx.restore();
    ctx.restore();
  }

  // ---------- only the head, peeking over an edge ----------
  // origin = the middle of the neck stump at the edge (the head rises above it); about 80 px wide at scale 1. o: face, scale,
  // look (-1..1), blink (0..1), lookUp, wide
  function peek(ctx, t, o) {
    o = o || {}; const d = palette(o), paint = pen(ctx, d), f = o.face || 1, s = o.scale || 1;
    ctx.save(); ctx.globalAlpha = d.alpha == null ? 1 : d.alpha; ctx.scale(f * s, s);
    ell(ctx, 4, -8, 17, 30, 0.12); paint(d.body);
    if (!d.mono) { ell(ctx, 10, -4, 8, 22, 0.12); ctx.fillStyle = d.belly; ctx.fill(); }
    spikes(ctx, paint, d, [[-12, 2], [-16, -24], [-4, -40]], 3, 4);
    ctx.save(); ctx.translate(-6, -26); ctx.rotate(-0.1); ctx.scale(1.2, 1.2); head(ctx, d, { ...o, t }, paint); ctx.restore();
    ctx.restore();
  }

  // ---------- Fauch very small: for the corner of a photo ----------
  //   MimoVolcano.fauchTiny(ctx, x, y, size, pose, t, o)
  //     (x, y)  the middle of the little figure; size  its longer side in px (24 to 40 are good; it stays readable down to 20)
  //     pose    'fly' (side view, wings beating) | 'peek' (only the head and neck over the bottom edge: (x, y) is the edge, the
  //             head rises above it) | 'thumb' (sitting, one claw up with the thumb) | 'sit' (sitting, looking at you)
  //     t       any time in seconds (api.time); the little wing beats, blinks and glances come from it, nothing else moves
  //     o       { face: 1 right (default) | -1 left, alpha: 0..1, mono: '#color' (one flat colour), look: -1..1 (glance) }
  //   It draws with the current transform and leaves ctx as it was (save/restore inside). The colours are the dragon's light ones.
  const TINY = { fly: 190, peek: 80, thumb: 120, sit: 120 };
  function fauchTiny(ctx, x, y, size, pose, t, o) {
    o = o || {}; const p = TINY[pose] ? pose : 'fly', sc = Math.max(1, size || 32) / TINY[p], tt = t || 0;
    const glance = o.look != null ? o.look : Math.sin(tt * 0.9) * 0.8, blink = ((tt + 0.6) % 3.1) < 0.14 ? 1 : 0, base = { face: o.face || 1, scale: sc, mono: o.mono, alpha: o.alpha, look: glance, blink };
    ctx.save(); ctx.translate(x, p === 'sit' || p === 'thumb' ? y + size / 2 : y);
    if (p === 'fly') fly(ctx, tt, { ...base, flap: 2.4 });
    else if (p === 'peek') peek(ctx, tt, base);
    else sit(ctx, tt, { ...base, thumb: p === 'thumb' ? 1 : 0, tail: 0.5 });
    ctx.restore();
  }

  function mix(a, b, k) { return api && api.mixHex ? api.mixHex(a, b, k) : a; }

  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.fauchTiny = fauchTiny;
  window.MimoVolcano.fauchDraw = { fly, sit, eye, ring, colours, curl, peek, parts: { head, wing, spikes, tail, pen, palette, ell, mix } };
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; } });
})();
