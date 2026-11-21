// World 6 "Mond": the pictures of the things in moon-things.js. Small moons (a pale ball with a sleepy face, its
// dashed orbit turning the way it will carry Mimo, arrows on it, and while Mimo rides it the dotted way he would fly
// if he jumped now), meteors (the pink warning ring where it will land with a ring that closes in until the impact,
// the dotted way down, the red rock with its warm tail, the crater it leaves), floating stones and comets, and the
// ice blue shooting stars. drawLit draws the warnings again over the darkness of the dark side.
// No gradients per frame (soft glows come from moon-look.js), everything culled to the camera.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, M = () => window.MimoMoon;
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };
  const tm = () => (api.reduced ? 0 : api.time);

  // ---------- small moons ----------
  function drawOrbit(ctx, mo) {
    const W = api.W, k = mo.near, t = tm();
    ctx.save(); ctx.translate(mo.cx, mo.cy); ctx.rotate(mo.dir * t * TAU / mo.period * 0.25);
    ctx.setLineDash([6, 8]); ctx.strokeStyle = W.orbit; ctx.lineWidth = 1.8 + k; ctx.globalAlpha = 0.4 + 0.45 * k;
    ctx.beginPath(); ctx.arc(0, 0, mo.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // three arrow heads on the ring show which way it turns
    ctx.strokeStyle = W.orbit; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.55 + 0.4 * k;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + mo.dir * t * TAU / mo.period, x = mo.cx + Math.cos(a) * mo.r, y = mo.cy + Math.sin(a) * mo.r;
      const tx = -Math.sin(a) * mo.dir, ty = Math.cos(a) * mo.dir, nx = Math.cos(a), ny = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(x - tx * 6 + nx * 5, y - ty * 6 + ny * 5); ctx.lineTo(x, y); ctx.lineTo(x - tx * 6 - nx * 5, y - ty * 6 - ny * 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawBall(ctx, mo) {
    const W = api.W, x = mo.cx, y = mo.cy, r = mo.size, t = tm();
    M().glow(ctx, 'moonBall', x, y, r * 2.4, W.moonBall, 0.22 + 0.2 * mo.near);
    ctx.fillStyle = W.moonBall; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = W.moonShade; ctx.beginPath(); ctx.arc(x, y, r, -0.4, Math.PI * 0.75); ctx.arc(x - r * 0.25, y - r * 0.2, r * 0.95, Math.PI * 0.75, -0.4, true); ctx.fill();
    ctx.fillStyle = W.moonCrater;
    for (const [dx, dy, s] of [[-0.45, -0.35, 0.2], [0.5, 0.3, 0.16], [0.1, 0.55, 0.12], [0.45, -0.5, 0.1]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = W.groundEdge; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x, y, r - 3, -2.7, -1.3); ctx.stroke(); ctx.globalAlpha = 1;
    // a sleepy face that wakes up and smiles while it carries Mimo
    const f = W.moonFace, awake = mo.held > 0, look = awake && api.p ? Math.sign(api.p.x + api.p.w / 2 - x) * 1.5 : 0;
    ctx.strokeStyle = f; ctx.fillStyle = f; ctx.lineWidth = 1.8;
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.32 + look, ey = y - r * 0.08;
      if (awake) { ctx.beginPath(); ctx.ellipse(ex, ey, 2, 2.6, 0, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(ex, ey - 1, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
    }
    ctx.beginPath(); ctx.arc(x + look, y + r * 0.22, awake ? 4 : 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    if (!awake && !api.reduced && (t * 0.5 + mo.tx * 0.3) % 1 < 0.5) { ctx.font = '700 10px Nunito, system-ui, sans-serif'; ctx.globalAlpha = 0.6; ctx.fillText('z', x + r * 0.7, y - r * 0.8 - ((t * 0.5) % 0.5) * 12); ctx.globalAlpha = 1; }
  }
  // while Mimo rides an orbit: the dotted way he would fly if he jumped now (stick held the way he flies)
  function drawPreview(ctx) {
    const m = api.L.moon, o = m.orbit, p = api.p; if (!o || !p) return;
    const G = M().GRAV, ph = api.PHYS, k = m.scale, dir = o.mo.dir;
    let x = p.x + p.w / 2, y = p.y + p.h / 2, vx = -Math.sin(o.ang) * dir * o.mo.launch, vy = Math.cos(o.ang) * dir * o.mo.launch;
    const want = Math.sign(vx) * ph.RUN, dt = 1 / 60;
    ctx.fillStyle = api.W.orbit;
    for (let i = 1; i <= 48; i++) {
      const acc = Math.abs(vx) > ph.RUN ? G.FLUNG : G.AIR;
      vx = vx < want ? Math.min(want, vx + acc * dt) : Math.max(want, vx - acc * dt);
      vy = Math.min(G.MAX_FALL, vy + (vy < 0 ? G.UP : G.DOWN) * k * dt);
      x += vx * dt; y += vy * dt;
      if (api.isSolid(Math.floor(x / T), Math.floor((y + 12) / T))) break;
      if (i % 3) continue;
      ctx.globalAlpha = 0.85 * (1 - i / 56); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- meteors ----------
  function drawCraters(ctx) {
    const m = api.L.moon, W = api.W, C = M().MET.CRATER;
    for (const c of m.craters) {
      const k = (api.time - c.t0) / C; if (k >= 1 || !seen(c.x - 30, c.y - 10, c.x + 30, c.y + 10)) continue;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = W.groundInk; ctx.beginPath(); ctx.ellipse(c.x, c.y + 1, 20, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = W.tail; ctx.globalAlpha = (1 - k) * 0.7; ctx.beginPath(); ctx.ellipse(c.x, c.y + 1, 11, 2.2, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawRing(ctx, me) {
    const W = api.W, R = M().MET.R, t = tm();
    if (me.wk <= 0 && !me.blast) return;
    if (!seen(me.ix - 2 * R, me.iy - R, me.ix + 2 * R, me.iy + R)) return;
    const k = me.blast ? 1 : me.wk, x = me.ix, y = me.iy - 1;
    // the danger area: a pink oval as wide as the impact reaches, pulsing faster as the rock comes
    ctx.fillStyle = W.warn; ctx.globalAlpha = 0.35 + 0.3 * k + 0.12 * Math.sin(t * (8 + 10 * k));
    ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.26, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = W.warnInk; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.95; ctx.stroke();
    // a little light column over the spot, so the place reads even when the ground is busy
    ctx.fillStyle = W.warn; ctx.globalAlpha = 0.12 + 0.2 * k; ctx.fillRect(x - 3, y - 26 - 20 * k, 6, 26 + 20 * k);
    // the countdown ring closes in from twice the size onto the danger area
    const rr = R * (1 + (1 - k) * 1.2);
    ctx.strokeStyle = W.warn; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.35 + 0.6 * k;
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.26, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawPath(ctx, me) {
    if (me.wk <= 0) return;
    const W = api.W, n = 9;
    ctx.fillStyle = W.warn; ctx.globalAlpha = 0.25 + 0.35 * me.wk;
    for (let i = 1; i < n; i++) { const s = i / n; ctx.beginPath(); ctx.arc(me.sx + (me.ix - me.sx) * s, me.sy + (me.iy - 6 - me.sy) * s, 1.8, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawRock(ctx, me) {
    if (!me.fly || !seen(me.x - 80, me.y - 120, me.x + 80, me.y + 20)) return;
    const W = api.W, B = M().MET.BODY, dx = me.sx - me.ix, dy = me.sy - me.iy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    // the warm tail: two wedges pointing back up the way it came
    ctx.fillStyle = W.tail;
    for (const [l, a, wd] of [[90, 0.3, 1], [48, 0.55, 0.75]]) {
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(me.x + nx * B * wd, me.y + ny * B * wd); ctx.lineTo(me.x + ux * l, me.y + uy * l); ctx.lineTo(me.x - nx * B * wd, me.y - ny * B * wd); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = W.meteor; ctx.beginPath(); ctx.arc(me.x, me.y, B + 1, 0, TAU); ctx.fill();
    ctx.fillStyle = W.meteorHi; ctx.beginPath(); ctx.arc(me.x - 3, me.y - 3, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = W.meteorInk; ctx.beginPath(); ctx.arc(me.x + 4, me.y + 3, 2.4, 0, TAU); ctx.fill();
  }

  // ---------- floating stones and comets ----------
  function drawStone(ctx, st) {
    const b = st.body; if (st.alpha <= 0 || !seen(b.x - 40, b.y - 20, b.x + b.w + 40, b.y + 40)) return;
    const W = api.W, x = b.x, y = b.y, w = b.w;
    ctx.globalAlpha = st.alpha;
    if (st.comet) { drawComet(ctx, st, x, y, w); ctx.globalAlpha = 1; return; }
    // a faint glow under it says "it floats"
    M().glow(ctx, 'stoneGlow', x + w / 2, y + 22, w * 0.7, W.stoneGlow, 0.22 * st.alpha);
    ctx.fillStyle = W.stone; ctx.beginPath(); ctx.moveTo(x, y + 5);
    const n = Math.max(2, Math.round(w / 14));
    for (let i = 0; i <= n; i++) { const u = i / n, h = api.hash(st.tx + i, st.ty); ctx.lineTo(x + w * u, y + 12 + Math.sin(u * Math.PI) * (6 + h * 6)); }
    ctx.lineTo(x + w, y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.stoneTop; api.rr(x, y, w, 7, 3.5); ctx.fill();
    ctx.fillStyle = W.stoneInk; ctx.fillRect(x + 4, y + 7, w - 8, 1.5);
    ctx.globalAlpha = 1;
  }
  function drawComet(ctx, st, x, y, w) {
    const W = api.W, dx = st.dx, dy = st.dy, len = Math.hypot(dx, dy) || 1, ux = -dx / len, uy = -dy / len, cx = x + w / 2, cy = y + 6;
    ctx.fillStyle = W.cometTail;
    for (let i = 6; i >= 1; i--) { const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.12 * (7 - i); ctx.beginPath(); ctx.ellipse(cx + ux * i * 14, cy + uy * i * 14 + 4, w * 0.5 * (1 - i * 0.1), 8 * (1 - i * 0.1), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a; }
    ctx.fillStyle = W.comet; api.rr(x, y, w, 12, 6); ctx.fill();
    ctx.fillStyle = W.boostCore; ctx.fillRect(x + 6, y + 2, w - 12, 2);
  }

  // ---------- shooting stars ----------
  function drawBoost(ctx, b) {
    if (!seen(b.cx - 40, b.cy - 40, b.cx + 40, b.cy + 40)) return;
    const W = api.W, t = tm(), back = M().BOOST.BACK, k = b.ready ? 1 : b.t / back, y = b.cy + Math.sin(t * 2.2 + b.tx) * 3;
    if (!b.ready) { ctx.strokeStyle = W.boost; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25 + 0.3 * k; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(b.cx, y, 10 * k + 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; return; }
    M().glow(ctx, 'boost', b.cx, y, 34, W.boost, 0.5 + 0.15 * Math.sin(t * 5));
    // the tail streams down-left, the star tilts
    ctx.strokeStyle = W.boost; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.lineWidth = 3 - i; ctx.globalAlpha = 0.7 - i * 0.2; ctx.beginPath(); ctx.moveTo(b.cx - 4, y + 4 + i * 2); ctx.lineTo(b.cx - 22 - i * 4, y + 16 + i * 5); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(b.cx, y); ctx.rotate(api.reduced ? 0 : Math.sin(t * 1.6) * 0.25);
    ctx.fillStyle = W.boost; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 4 : 12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.boostCore; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // the warnings and the shooting stars again, over the darkness of the dark side
  function drawLit(ctx) {
    const m = api.L.moon;
    for (const me of m.meteors) { drawRing(ctx, me); drawPath(ctx, me); drawRock(ctx, me); }
    for (const b of m.boosts) drawBoost(ctx, b);
    if (m.orbit) drawPreview(ctx);
  }

  window.MimoMoon = Object.assign(window.MimoMoon || {}, { drawLit });
  window.MimoWorlds.register({
    world: 6,
    setup(a) { api = a; },
    draw(layer, ctx) {
      const m = api.L && api.L.moon; if (!m) return;
      if (layer === 'back') {
        drawCraters(ctx);
        for (const mo of m.moons) if (seen(mo.cx - mo.r, mo.cy - mo.r, mo.cx + mo.r, mo.cy + mo.r)) drawOrbit(ctx, mo);
        return;
      }
      if (layer === 'mid') {
        for (const me of m.meteors) { drawRing(ctx, me); drawPath(ctx, me); }
        for (const mo of m.moons) if (seen(mo.cx - mo.size * 3, mo.cy - mo.size * 3, mo.cx + mo.size * 3, mo.cy + mo.size * 3)) drawBall(ctx, mo);
        for (const st of m.stones) drawStone(ctx, st);
        for (const b of m.boosts) drawBoost(ctx, b);
        return;
      }
      if (layer === 'front') { for (const me of m.meteors) drawRock(ctx, me); drawPreview(ctx); }
    },
  });
})();
