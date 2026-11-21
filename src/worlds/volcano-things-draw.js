// World 5 "Vulkaninsel": the pictures of the things in volcano-things.js. Geysers (a white water column with a foam
// cap, a puff of warning), lava plates (dark and safe, cracks that glow while warming, bright orange when hot), fire
// hoppers (a little grumpy fireball and the dotted arc it always takes), steam vents, glow rain (the smoke puff, the
// falling rock and the glowing spot where it lands) and lava falls.
// Plates are painted after the lava and cut off at its surface. No allocation per frame, gradients cached with the
// volcano-look.js helpers.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, V = () => window.MimoVolcano;
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };

  // ---------- geysers ----------
  function drawMouth(ctx, g) {
    const W = api.W, x = g.cx, y = g.floor;
    ctx.fillStyle = W.mouth; ctx.beginPath(); ctx.moveTo(x - 17, y); ctx.lineTo(x - 11, y - 7); ctx.lineTo(x + 11, y - 7); ctx.lineTo(x + 17, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.mouthInk; ctx.beginPath(); ctx.ellipse(x, y - 7, 8, 2.6, 0, 0, TAU); ctx.fill();
  }
  function drawGeyser(ctx, g) {
    const W = api.W, x = g.cx, top = g.floor - g.h, t = api.reduced ? 0 : api.time;
    if (!seen(x - 40, top - 40, x + 40, g.floor)) return;
    if (g.phase === 'warn') {
      // the warning: puffs of steam and spurts that grow, the mouth wobbles
      const k = g.k;
      ctx.strokeStyle = W.geyserFoam; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 14);
      ctx.beginPath(); ctx.ellipse(x, g.floor - 2, 16 + 8 * k, 4 + 2 * k, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = W.steam;
      for (let i = 0; i < 5; i++) { const q = (t * 2.2 + i / 5) % 1; ctx.globalAlpha = (1 - q) * (0.6 + 0.4 * k); ctx.beginPath(); ctx.arc(x + (i - 2) * 6 + Math.sin(q * 5 + i) * 4, g.floor - 10 - q * (26 + 40 * k), 5 + q * 9, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.fillStyle = W.geyserFoam; const sp = 10 + 26 * k * (0.7 + 0.3 * Math.sin(t * 30));
      api.rr(x - 6, g.floor - 7 - sp, 12, sp, 6); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, g.floor - 7 - sp, 9, 4, 0, 0, TAU); ctx.fill();
    }
    if (g.h > 5) {
      ctx.save(); ctx.translate(0, top);
      ctx.fillStyle = V().linear('geyCol', 0, 5 * T, W.geyserFoam, V().derived().geyser75);
      api.rr(x - 13, 0, 26, g.h - 5, 12); ctx.fill();
      ctx.restore();
      // the foam cap is the platform: its flat top is the top of the body
      ctx.fillStyle = W.geyserFoam; ctx.beginPath(); ctx.ellipse(x, top + 3, 19, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = W.geyser; ctx.globalAlpha = 0.9;
      for (let i = 0; i < 6; i++) { const q = (t * 1.3 + i * 0.17) % 1, s = i % 2 ? 1 : -1; ctx.globalAlpha = 0.85 * (1 - q); ctx.beginPath(); ctx.arc(x + s * (14 + q * 14), top + 4 + q * q * 60 - q * 14, 2.4, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- lava plates ----------
  function drawPlate(ctx, pl) {
    const W = api.W, b = pl.body;
    if (b.off || !seen(b.x, b.y - 20, b.x + b.w, b.y + 30)) return;
    const jit = pl.shake > 0 && !api.reduced ? Math.sin(api.time * 46) * 1.5 * pl.shake : 0, x = b.x + jit, y = b.y, w = b.w, H = V().PLATE.H;
    if (pl.heat > 0.6) V().glow(ctx, 'plateGlow', x + w / 2, y + 4, w * 0.75 + 10, W.lavaGlow, 0.55);
    // the part under the lava surface is cut off, a bright seam seats the plate in the lava
    ctx.save(); ctx.beginPath(); ctx.rect(x - 8, pl.surf - 80, w + 16, 83); ctx.clip();
    drawPlateBody(ctx, pl, x, y, w, H, W);
    ctx.restore();
    ctx.strokeStyle = W.lavaLine; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 2, pl.surf + 2); ctx.lineTo(x + w + 2, pl.surf + 2); ctx.stroke();
  }
  function drawPlateBody(ctx, pl, x, y, w, H, W) {
    const body = pl.heat > 0.6 ? api.mixHex(W.plateWarm, W.plateHot, Math.min(1, (pl.heat - 0.6) / 0.4)) : pl.heat > 0.2 ? api.mixHex(W.plateCool, W.plateWarm, (pl.heat - 0.2) / 0.4) : W.plateCool;
    ctx.fillStyle = body; api.rr(x, y, w, H + 4, 6); ctx.fill();
    ctx.fillStyle = W.plateHi; ctx.globalAlpha = pl.heat > 0.6 ? 0.5 : 0.16; api.rr(x + 4, y + 2.5, w - 8, 4, 2); ctx.fill(); ctx.globalAlpha = 1;
    if (pl.heat > 0.6) return;
    // cracks: dim when cool, bright and pulsing while the plate warms up (the warning before it sinks)
    const warm = pl.state === 'warm' || pl.state === 'sink', pulse = warm ? 0.6 + 0.4 * Math.sin(api.time * 12) : 1;
    ctx.strokeStyle = warm ? W.plateCrack : W.plateCrackCool; ctx.lineWidth = warm ? 2.2 : 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = warm ? pulse : 0.8;
    ctx.beginPath(); ctx.moveTo(x + 8, y + 12);
    for (let px = x + 8, i = 0; px < x + w - 10; px += 9, i++) ctx.lineTo(px + 9, y + (i % 2 ? 11 : 6));
    ctx.stroke(); ctx.globalAlpha = 1;
    if (warm && !api.reduced) {
      // little bubbles around a plate that is about to sink
      ctx.strokeStyle = W.lavaLine; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const q = (api.time * 1.5 + i / 3) % 1; ctx.globalAlpha = (1 - q) * 0.9; ctx.beginPath(); ctx.arc(i === 0 ? x - 5 : i === 1 ? x + w + 5 : x + w / 2, y + 10 - q * 10, 2 + q * 3, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  // where a plate is under the lava: a ring of bubbles shows it is still there
  function drawPlateUnder(ctx, pl) {
    const b = pl.body; if (!b.off || !seen(b.x, b.y, b.x + b.w, b.y + 20) || api.reduced) return;
    ctx.strokeStyle = api.W.lavaLine; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const q = (api.time * 1.8 + i / 3) % 1; ctx.globalAlpha = (1 - q) * 0.8; ctx.beginPath(); ctx.arc(b.x + b.w * (0.25 + i * 0.25), pl.top + 8 - q * 4, 2 + q * 5, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ---------- fire hoppers ----------
  function drawArc(ctx, h) {
    const a = h.arc; if (!a) return;
    const n = a.length / 2, W = api.W, bright = h.warn > 0 ? 0.5 + 0.45 * h.warn : 0.42;
    ctx.fillStyle = W.lavaLine;
    // the arc is a symmetric parabola: the way there and the way back cover the same dots
    ctx.globalAlpha = bright;
    for (let i = 1; i < n - 1; i++) { ctx.beginPath(); ctx.arc(a[i * 2], a[i * 2 + 1], 2.4, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawHopper(ctx, h) {
    const W = api.W, R = V().HOP.R;
    if (!seen(h.x - 60, h.home - h.height * T - 40, h.x + 60 + Math.abs(h.dx) * T, h.home + 20)) return;
    drawArc(ctx, h);
    if (!h.fly) {
      // resting in the lava: a glowing spot that swells before the jump
      const k = h.warn, r = 7 + 9 * k + (api.reduced ? 0 : Math.sin(api.time * 8) * 1.5);
      V().glow(ctx, 'hopRest', h.x, h.home, 22 + 18 * k, W.hopper, 0.45 + 0.45 * k);
      ctx.fillStyle = W.hopper; ctx.beginPath(); ctx.ellipse(h.x, h.home + 1, r, 3 + 3 * k, 0, Math.PI, 0); ctx.fill();
      if (k > 0) { ctx.fillStyle = W.hopperInk; ctx.beginPath(); ctx.arc(h.x - 4, h.home - 2 - 3 * k, 1.6, 0, TAU); ctx.arc(h.x + 4, h.home - 2 - 3 * k, 1.6, 0, TAU); ctx.fill(); }
      return;
    }
    const x = h.x, y = h.y, dir = h.up ? -1 : 1;
    V().glow(ctx, 'hopFly', x, y, 30, W.lavaGlow, 0.65);
    // a flame tail behind it
    ctx.fillStyle = W.hopper; ctx.beginPath(); ctx.moveTo(x - R * 0.8, y); ctx.quadraticCurveTo(x, y - dir * 26, x + R * 0.8, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = W.hopperCore; ctx.beginPath(); ctx.arc(x - 1, y + 1, R * 0.55, 0, TAU); ctx.fill();
    // grumpy face
    ctx.fillStyle = W.hopperInk; ctx.beginPath(); ctx.arc(x - 4, y - 1, 1.9, 0, TAU); ctx.arc(x + 4, y - 1, 1.9, 0, TAU); ctx.fill();
    ctx.strokeStyle = W.hopperInk; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.lineTo(x - 2, y - 4); ctx.moveTo(x + 7, y - 6); ctx.lineTo(x + 2, y - 4); ctx.stroke();
  }

  // ---------- steam vents ----------
  function drawVent(ctx, s) {
    const W = api.W, x = s.cx, y = s.floor;
    if (!seen(x - 40, s.top - 30, x + 40, y)) return;
    ctx.fillStyle = W.mouth; api.rr(x - 13, y - 8, 26, 8, 3); ctx.fill();
    ctx.fillStyle = W.mouthInk; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 7, y - 4, 2, 0, TAU); ctx.fill(); }
    if (api.reduced) { if (s.active) { ctx.fillStyle = W.steam; ctx.globalAlpha = 0.35; api.rr(x - 18, s.top, 36, y - 8 - s.top, 16); ctx.fill(); ctx.globalAlpha = 1; } return; }
    const len = y - 8 - s.top;
    ctx.fillStyle = W.steam;
    if (s.active) {
      // a soft column of rising puffs up to its top
      for (let i = 0; i < 9; i++) { const q = (api.time * 1.6 + i / 9) % 1, yy = y - 8 - q * len * s.k; ctx.globalAlpha = 0.55 * Math.sin(q * Math.PI); ctx.beginPath(); ctx.arc(x + Math.sin(q * 7 + i) * 7, yy, 6 + q * 8, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 0.18; api.rr(x - 18, s.top, 36, len, 16); ctx.fill();
    } else if (s.warn > 0) {
      for (let i = 0; i < 3; i++) { const q = (api.time * 3 + i / 3) % 1; ctx.globalAlpha = (1 - q) * s.warn; ctx.beginPath(); ctx.arc(x + (i - 1) * 6, y - 10 - q * 18, 3 + q * 4, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- glow rain ----------
  let rainCtx = null;
  function rock(x, y) {
    const ctx = rainCtx, W = api.W, R = V().RAIN.R;
    V().glow(ctx, 'rock', x, y, 30, W.lavaGlow, 0.7);
    ctx.fillStyle = W.ember; ctx.beginPath(); ctx.moveTo(x - 4, y - R - 10); ctx.lineTo(x + 4, y - R - 10); ctx.lineTo(x + R * 0.7, y); ctx.lineTo(x - R * 0.7, y); ctx.closePath(); ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = W.rock; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = W.lavaTop; ctx.beginPath(); ctx.arc(x - 2, y + 1, R * 0.5, 0, TAU); ctx.fill();
  }
  function drawRainSource(ctx, r) {
    const W = api.W; if (!seen(r.cx - 50, r.y0 - 40, r.cx + 50, r.impact + 10)) return;
    const warn = V().rainWarn(r, api.time);
    // the smoke puff that drops the rocks, glowing from inside before a drop
    if (warn > 0) V().glow(ctx, 'rainSrc', r.cx, r.y0, 34, W.lavaGlow, 0.3 + 0.5 * warn);
    ctx.fillStyle = W.smokePuff;
    for (let i = 0; i < 5; i++) { const ox = (i - 2) * 11, oy = i % 2 ? -7 : 0, rr = i === 2 ? 15 : 11; ctx.beginPath(); ctx.arc(r.cx + ox, r.y0 - 4 + oy + Math.sin(api.time * 1.3 + i) * 1.5, rr, 0, TAU); ctx.fill(); }
    ctx.fillStyle = W.ember; ctx.globalAlpha = 0.5 + 0.5 * warn; ctx.beginPath(); ctx.arc(r.cx, r.y0 + 2, 4 + 3 * warn, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    // the spot where it lands: a pulsing glowing ellipse
    if (warn > 0) {
      ctx.fillStyle = W.lavaGlow; ctx.globalAlpha = (0.3 + 0.5 * warn) * (0.75 + 0.25 * Math.sin(api.time * 14));
      ctx.beginPath(); ctx.ellipse(r.cx, r.impact - 1, 8 + 10 * warn, 3 + 1.5 * warn, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    rainCtx = ctx; V().eachRock(r, api.time, rock);
  }

  // ---------- lava falls ----------
  function drawFall(ctx, f) {
    const W = api.W, x = f.cx, w = V().FALL.W; if (!seen(x - 30, f.top, x + 30, f.bottom)) return;
    // the spout: a lip of rock under the ceiling, glowing while the stream is about to start
    ctx.fillStyle = W.mouth; api.rr(x - 15, f.top - 2, 30, 9, 4); ctx.fill();
    if (f.warn > 0) { V().glow(ctx, 'fallWarn', x, f.top + 8, 18 + 10 * f.warn, W.lavaGlow, 0.3 + 0.5 * f.warn); if (!api.reduced) { ctx.fillStyle = W.lavaTop; const q = (api.time * 2.5) % 1; ctx.beginPath(); ctx.arc(x, f.top + 9 + q * 40 * f.warn, 3, 0, TAU); ctx.fill(); } }
    if (f.head - f.tail < 1) return;
    V().glow(ctx, 'fallGlow', x, (f.tail + f.head) / 2, Math.max(30, (f.head - f.tail) * 0.6), W.lavaGlow, 0.25);
    ctx.fillStyle = W.lavaBot; api.rr(x - w / 2, f.tail, w, f.head - f.tail, 8); ctx.fill();
    ctx.fillStyle = W.lavaTop; api.rr(x - w / 2 + 4, f.tail, w - 8, f.head - f.tail, 5); ctx.fill();
    if (!api.reduced) { ctx.fillStyle = W.lavaLine; for (let i = 0; i < 3; i++) { const q = (api.time * 2 + i / 3) % 1, yy = f.tail + q * (f.head - f.tail); ctx.fillRect(x - 2 + (i - 1) * 4, yy, 2, 10); } }
    if (f.head >= f.bottom - 1) { ctx.fillStyle = W.lavaLine; ctx.beginPath(); ctx.ellipse(x, f.bottom, 16 + Math.sin(api.time * 9) * 2, 4, 0, Math.PI, 0); ctx.fill(); }
  }

  window.MimoWorlds.register({
    world: 5,
    setup(a) { api = a; },
    draw(layer, ctx) {
      const v = api.L && api.L.volcano; if (!v) return;
      if (layer === 'back') {
        for (const g of v.geysers) if (seen(g.cx - 20, g.floor - 10, g.cx + 20, g.floor)) drawMouth(ctx, g);
        return;
      }
      if (layer !== 'mid') return;
      for (const pl of v.plates) { drawPlate(ctx, pl); drawPlateUnder(ctx, pl); }
      for (const s of v.steam) drawVent(ctx, s);
      for (const g of v.geysers) drawGeyser(ctx, g);
      for (const f of v.falls) drawFall(ctx, f);
      for (const h of v.hoppers) drawHopper(ctx, h);
      for (const r of v.rain) drawRainSource(ctx, r);
    },
  });
})();
