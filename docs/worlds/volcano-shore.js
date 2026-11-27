// World 5 "Gipfelsturm": the shore of the arrival (level 43, decor kind `shore`, looks only, nothing here is solid):
// the boat lies in the shallow sea at the beach, with the open sea and its horizon behind it.
//   shore { x, y, horizon, depth, plank: [x0, y0, x1, y1] }  in tiles: the sea is left of tile x (the beach starts there),
//          y is the ground row under the water; the water stands `depth` px over it (default 12, the hull and Mimo's
//          paws are in it); `horizon` is the row of the sea's horizon (default y - 2.2). plank: a gangplank from the bow
//          (x0, y0, on the deck) down to the sand (x1, y1), drawn behind the hull
//   background (screen space, asked by volcano-look.js): left of the beach the open sea up to the horizon, the near
//          ridge of the island ends in a headland at the beach
//   front (world space, over Mimo): the shallow water over the sea floor, small waves on the hull, the swash on the sand
// The opening scene (volcano-scenes-default.js) lets the plank fall: MimoVolcano.plankK 0 (upright on the bow) .. 1 (down);
// null = down. Culled to the camera, a few paths each, colours from the world palette (light / dark, night).
(function () {
  'use strict';
  let api = null;
  const T = 32, V = () => window.MimoVolcano;
  const WOOD = { light: { wood: '#A9805F', lite: '#C99D77', ink: '#76543E' }, dark: { wood: '#7E5E47', lite: '#9A7558', ink: '#54392A' } };
  const shoreOf = () => { const v = api && api.L && api.L.volcano, d = v && v.def && v.def.decor; return Array.isArray(d) ? d.find((q) => q && q.k === 'shore') || null : null; };
  const zoom = () => { const G = api.G; return (G && G.state === 'cine' && G.cineCam && G.cineCam.zoom) || 1; };
  const horizonOf = (d) => (d.horizon != null ? d.horizon : d.y - 2.2) * T;
  const seaCol = () => { const W = api.W, n = W.night || 0; return n > 0 ? api.mixHex(W.sea, W.seaNight, n * 0.8) : W.sea; };
  const HEAD = 9, BLEND = 24;   // tiles: the headland rises from the beach to the ridge over HEAD; BLEND tiles on, the level's own horizon is back

  // ---------- background: the sea of the background comes up to the horizon of the shore, the near ridge ends in a headland ----------
  // the screen y of the background's horizon (volcano-look.js): with a shore the horizon of the shore, else hy unchanged
  function horizon(hy) {
    const d = shoreOf(); if (!d || api.mode !== 'level') return hy;
    // near the shore its horizon, further into the level it eases back to the horizon of the level (no jump)
    const k = Math.max(0, Math.min(1, 1 - (api.cam.x - d.x * T) / (BLEND * T))), w = k * k * (3 - 2 * k);
    return Math.round(hy + ((horizonOf(d) - api.cam.y) * zoom() - hy) * w);
  }
  // ridge() draws the near ridge of the island (volcano-look.js): only right of the headland, left of it is open sea
  function background(ctx, ridge) {
    const d = shoreOf(); if (!d || api.mode !== 'level') { ridge(); return; }
    const v = api.view, cam = api.cam, z = zoom(), X = (wx) => (wx - cam.x) * z, Y = (wy) => (wy - cam.y) * z, sx = d.x * T, hw = horizonOf(d);
    if (X(sx + HEAD * T) < 0) { ridge(); return; }
    ctx.save(); ctx.beginPath();
    ctx.moveTo(X(sx - T), v.h + 60); ctx.lineTo(X(sx - T), Y(hw + 0.6 * T));
    ctx.bezierCurveTo(X(sx + 1.5 * T), Y(hw - 0.2 * T), X(sx + 4 * T), Y(hw - 2.6 * T), X(sx + HEAD * T), Y(hw - 4 * T));
    ctx.lineTo(X(sx + HEAD * T), -60); ctx.lineTo(v.w + 60, -60); ctx.lineTo(v.w + 60, v.h + 60); ctx.closePath(); ctx.clip();
    ridge(); ctx.restore();
  }

  // ---------- the gangplank (world space, behind the tiles and the hull) ----------
  function plank(ctx, d) {
    const p = d.plank; if (!p) return;
    const ax = p[0] * T, ay = p[1] * T, bx = p[2] * T, by = p[3] * T, len = Math.hypot(bx - ax, by - ay), cam = api.cam;
    if (ax - len > cam.x + api.view.w || ax + len < cam.x) return;
    const down = Math.atan2(by - ay, bx - ax), k = V().plankK == null ? 1 : V().plankK, a = -Math.PI / 2 + (down + Math.PI / 2) * k;
    const c = WOOD[api.dark ? 'dark' : 'light'];
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = c.ink; ctx.fillRect(-4, -6, len + 6, 10);
    ctx.fillStyle = c.wood; ctx.fillRect(-3, -5, len + 4, 8);
    ctx.fillStyle = c.lite; ctx.fillRect(-3, -5, len + 4, 2);
    ctx.fillStyle = c.ink; for (let s = 14; s < len - 6; s += 16) ctx.fillRect(s, -8, 3, 3);   // the cleats
    ctx.restore();
  }

  // ---------- the shallow water (world space, over Mimo) ----------
  function water(ctx, d) {
    const W = api.W, cam = api.cam, z = zoom(), vw = api.view.w / z, vh = api.view.h / z, t = api.reduced ? 0 : api.time;
    const sx = d.x * T, gy = d.y * T, wy = gy - (d.depth != null ? d.depth : 12), x0 = cam.x - 24, x1 = Math.min(sx + T, cam.x + vw + 24), bottom = cam.y + vh + 24;
    if (x1 <= x0 || wy > bottom || gy < cam.y - 40) return;
    const sea = seaCol(), wave = (x) => Math.sin(x * 0.045 + t * 1.7) * 1.4 + Math.sin(x * 0.11 - t * 1.1) * 0.8;
    // the swash: the water runs up the sand and back, slowly
    const run = (api.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.9)) * 18, end = sx + run;
    // the water over the sea floor: clear at the top, deeper and denser further down (the ground shines through as the floor)
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x < end - 30; x += 8) ctx.lineTo(x, wy + wave(x));
    ctx.quadraticCurveTo(end - 8, wy + 2, end, gy - 1); ctx.lineTo(end, gy + 2); ctx.quadraticCurveTo(sx - T, gy + 2 * T, sx - 3 * T, bottom); ctx.closePath();
    ctx.clip();
    const deep = 3 * T;
    ctx.fillStyle = sea; ctx.globalAlpha = 0.92; ctx.fillRect(x0, wy + deep - 1, x1 - x0, bottom - wy - deep + 1); ctx.globalAlpha = 1;
    ctx.translate(0, wy); ctx.scale(1, deep / 100); ctx.fillStyle = V().linear('shoreWater', 0, 100, V().rgba(sea, 0.5), V().rgba(sea, 0.92));
    ctx.fillRect(x0, 0, x1 - x0, 100); ctx.restore();
    ctx.save();
    // the surface line with its foam, and a few light ripples under it
    ctx.globalAlpha = 0.8; ctx.strokeStyle = W.seaLine; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = x0; x < end - 30; x += 8) { if (x === x0) ctx.moveTo(x, wy + wave(x)); else ctx.lineTo(x, wy + wave(x)); }
    ctx.quadraticCurveTo(end - 8, wy + 2, end, gy - 1); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.fillStyle = W.seaGlint;
    for (let i = 0; i < 9; i++) {
      const rx = Math.floor(cam.x / 140) * 140 + i * 140 + ((api.hash(i, 3) * 90 + t * 9) % 140), ry = wy + 5 + api.hash(i + Math.floor(cam.x / 140), 5) * 6;
      if (rx < end - 40) ctx.fillRect(rx, ry, 10 + api.hash(i, 8) * 12, 1.5);
    }
    ctx.restore();
  }

  window.MimoVolcano = Object.assign(window.MimoVolcano || {}, { shore: { background, horizon } });
  window.MimoWorlds.register({
    world: 5,
    setup(a) { api = a; },
    draw(layer, ctx) {
      if (!api.L || !api.L.volcano || api.mode !== 'level') return;
      const d = shoreOf(); if (!d) return;
      if (layer === 'back') plank(ctx, d);
      else if (layer === 'front') water(ctx, d);
    },
  });
})();
