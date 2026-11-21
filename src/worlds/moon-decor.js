// World 6 "Mond": set pieces, level field decor: [{ k, x, y, ... }] in tiles (looks only, see world6-kit.md).
// flag { x, y }: Mimo's flag planted in the dust (x, y = the empty tile on the ground), for "Kleiner Schritt".
// rocket { x, y, s }: a small pastel rocket standing on its fins (x, y = the tile on the ground under its middle,
//   s scale, default 1: about 2 tiles wide, 4 high), its window glows; for "Raketenteile".
// dish { x, y, dir }: a dish antenna on a mast (dir 1 looks right, -1 left), it turns slowly.
// tracks { x, y, w }: footprints in the dust along w tiles of a ground row (y = the empty row above the ground).
// They are drawn behind the tiles in soft, muted colours with no flat top, so they never look like a platform.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const COL = {
    light: { pole: '#D9D6EA', flag: '#9CC3EA', flagStar: '#FFF6DC', body: '#C9C6E2', bodyInk: '#8F8CB8', fin: '#E7A3B6', window: '#9EDBC1', windowRim: '#E6E4F6', mast: '#A9A6CB', dish: '#D3D0E8', print: '#A5A2C9' },
    dark: { pole: '#A9A6C4', flag: '#6F95BE', flagStar: '#E8DFC4', body: '#8E8BB0', bodyInk: '#5E5B85', fin: '#B87C90', window: '#7FC4A6', windowRim: '#B5B2D6', mast: '#6E6B95', dish: '#9A97BC', print: '#77749E' },
  };
  const col = () => COL[api.dark ? 'dark' : 'light'];
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };
  const tm = () => (api.reduced ? 0 : api.time);

  function flag(ctx, d) {
    const k = col(), x = d.x * T + 10, by = (d.y + 1) * T, top = by - 70, wave = Math.sin(tm() * 1.4 + d.x) * 2;
    if (!seen(x - 10, top, x + 40, by)) return;
    ctx.fillStyle = k.pole; ctx.fillRect(x - 1.5, top, 3, 70);
    ctx.fillStyle = k.flag; ctx.beginPath(); ctx.moveTo(x + 1.5, top + 2); ctx.lineTo(x + 36, top + 4 + wave); ctx.lineTo(x + 36, top + 24 + wave); ctx.lineTo(x + 1.5, top + 22); ctx.closePath(); ctx.fill();
    // a little star on it (pale, not gold: it is not a star to collect)
    const sx = x + 18, sy = top + 13 + wave * 0.5; ctx.fillStyle = k.flagStar; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.2 : 5; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  function rocket(ctx, d) {
    const k = col(), s = d.s || 1, cx = d.x * T + T / 2, by = (d.y + 1) * T, h = 118 * s, w = 34 * s;
    if (!seen(cx - w * 1.5, by - h, cx + w * 1.5, by)) return;
    ctx.save(); ctx.translate(cx, by); ctx.scale(s, s);
    ctx.fillStyle = k.fin;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 14, -44); ctx.quadraticCurveTo(sg * 30, -24, sg * 28, 0); ctx.lineTo(sg * 12, -10); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = k.body; ctx.beginPath(); ctx.moveTo(-15, -6); ctx.lineTo(-15, -70); ctx.quadraticCurveTo(-14, -104, 0, -118); ctx.quadraticCurveTo(14, -104, 15, -70); ctx.lineTo(15, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.bodyInk; ctx.fillRect(-15, -30, 30, 3); ctx.fillRect(-15, -8, 30, 3);
    ctx.fillStyle = k.fin; ctx.beginPath(); ctx.moveTo(-8, -108); ctx.quadraticCurveTo(0, -122, 8, -108); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.windowRim; ctx.beginPath(); ctx.arc(0, -66, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = k.window; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(tm() * 1.2); ctx.beginPath(); ctx.arc(0, -66, 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  function dish(ctx, d) {
    const k = col(), x = d.x * T + T / 2, by = (d.y + 1) * T, dir = d.dir === -1 ? -1 : 1, turn = Math.sin(tm() * 0.35 + d.x) * 0.25;
    if (!seen(x - 40, by - 70, x + 40, by)) return;
    ctx.strokeStyle = k.mast; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, by); ctx.lineTo(x, by - 16); ctx.lineTo(x + 10, by); ctx.stroke();
    ctx.save(); ctx.translate(x, by - 44); ctx.rotate(dir * (-0.7 + turn));
    ctx.fillStyle = k.dish; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = k.mast; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -12); ctx.stroke();
    ctx.fillStyle = k.window; ctx.beginPath(); ctx.arc(0, -13, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function tracks(ctx, d) {
    const k = col(), y = (d.y + 1) * T + 3;
    if (!seen(d.x * T, y - 10, (d.x + d.w) * T, y + 10)) return;
    ctx.fillStyle = k.print;
    for (let i = 0; i < d.w * 2; i++) { const x = d.x * T + 8 + i * 16; ctx.beginPath(); ctx.ellipse(x, y + (i % 2 ? 1.5 : -0.5), 3.4, 1.4, 0, 0, TAU); ctx.fill(); }
  }
  const BACK = { flag, rocket, dish };
  const MID = { tracks };
  // buggy { x, y }: an old moon buggy left in the dust (x = the tile under its middle, y = the empty row above the
  //   ground), about 3.5 tiles wide and 2 high, one wheel lost, a seat and a tilted little antenna; for "Mondstaub"
  function buggy(ctx, d) {
    const k = col(), cx = d.x * T + T / 2, by = (d.y + 1) * T;
    if (!seen(cx - 70, by - 80, cx + 70, by)) return;
    ctx.save(); ctx.translate(cx, by); ctx.rotate(-0.04);
    ctx.fillStyle = k.mast; ctx.fillRect(-46, -30, 92, 6); // the frame
    ctx.fillStyle = k.body; ctx.beginPath(); ctx.moveTo(-52, -24); ctx.lineTo(-44, -44); ctx.lineTo(10, -44); ctx.lineTo(20, -30); ctx.lineTo(52, -30); ctx.lineTo(52, -22); ctx.lineTo(-52, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k.bodyInk; ctx.fillRect(-30, -58, 4, 16); ctx.fillRect(-32, -60, 22, 5); // the seat back
    ctx.fillStyle = k.fin; ctx.fillRect(-48, -40, 8, 4); // a rusty pink lamp
    ctx.strokeStyle = k.mast; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(36, -30); ctx.lineTo(46, -66); ctx.stroke();
    ctx.fillStyle = k.dish; ctx.beginPath(); ctx.ellipse(46, -66, 9, 4, -0.4, 0, Math.PI); ctx.fill();
    for (const wx of [-36, 36]) { // two wheels, the third lies flat beside it
      ctx.fillStyle = k.bodyInk; ctx.beginPath(); ctx.arc(wx, -12, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = k.windowRim; ctx.beginPath(); ctx.arc(wx, -12, 5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = k.bodyInk; ctx.beginPath(); ctx.ellipse(-66, -3, 12, 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  BACK.buggy = buggy;

  // ---- set pieces of levels 5 to 9 (block B) ----
  // lamp { x, y, h }: a thin lamp post on the dust (x, y = the empty ground tile), h tiles high (default 2), its round
  //   head glows softly; put a level field lamp at its head (x, y + 1 - h) so the light comes from it ("Dunkle Seite").
  function lamp(ctx, d) {
    const k = col(), h = (d.h || 2) * T, x = d.x * T + T / 2, by = (d.y + 1) * T, hy = by - h + 6;
    if (!seen(x - 20, hy - 20, x + 20, by)) return;
    ctx.fillStyle = k.mast; ctx.fillRect(x - 1.5, hy, 3, by - hy); ctx.fillRect(x - 6, by - 4, 12, 4);
    ctx.fillStyle = k.window; ctx.globalAlpha = 0.25 + 0.08 * Math.sin(tm() * 1.3 + d.x); ctx.beginPath(); ctx.arc(x, hy, 11, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = k.windowRim; ctx.beginPath(); ctx.arc(x, hy, 5.5, 0, TAU); ctx.fill();
  }
  // part { x, y, kind, r }: a rocket part lying in the dust (x, y = the empty ground tile): kind 'fin', 'cone' or
  //   'tank', r a small tilt in radians; for "Raketenteile". Low and rounded, never a flat top.
  function part(ctx, d) {
    const k = col(), x = d.x * T + T / 2, by = (d.y + 1) * T;
    if (!seen(x - 40, by - 40, x + 40, by)) return;
    ctx.save(); ctx.translate(x, by); ctx.rotate(d.r || 0);
    if (d.kind === 'cone') {
      ctx.fillStyle = k.body; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-14, -20, 10, -24); ctx.quadraticCurveTo(4, -6, 16, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k.fin; ctx.beginPath(); ctx.arc(9, -22, 4, 0, TAU); ctx.fill();
    } else if (d.kind === 'tank') {
      ctx.fillStyle = k.body; ctx.beginPath(); ctx.ellipse(0, -10, 22, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = k.bodyInk; ctx.fillRect(-8, -20, 3, 20); ctx.fillRect(6, -20, 3, 20);
    } else {
      ctx.fillStyle = k.fin; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-4, -26, 14, -22); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // fridge { x, y, w, h }: the door of a fridge drawn over a block of cheese K (tiles x, y, w wide, h high): a rim, a
  //   seam, a handle and a frosty corner; drawn over the tiles, under Mimo ("Mondbasis").
  function fridge(ctx, d) {
    const k = col(), x = d.x * T + 3, y = d.y * T + 3, w = d.w * T - 6, h = d.h * T - 6;
    if (!seen(x, y, x + w, y + h)) return;
    ctx.strokeStyle = k.windowRim; ctx.lineWidth = 3; api.rr(x, y, w, h, 6); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + h * 0.36); ctx.lineTo(x + w - 4, y + h * 0.36); ctx.stroke();
    ctx.fillStyle = k.mast; ctx.fillRect(x + w - 10, y + h * 0.36 - 22, 4, 16); ctx.fillRect(x + w - 10, y + h * 0.36 + 8, 4, 22);
    ctx.fillStyle = k.windowRim; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 20, y + 4); ctx.lineTo(x + 4, y + 16); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  // pits { x, y, w, h }: old impact dimples and a few dark cracks drawn over a block of moon rock (tiles), so a big
  //   heap of blocks reads as one old meteor ("Sternschnuppen").
  function pits(ctx, d) {
    const k = col(), x0 = d.x * T, y0 = d.y * T, w = d.w * T, h = d.h * T;
    if (!seen(x0, y0, x0 + w, y0 + h)) return;
    ctx.fillStyle = k.bodyInk; ctx.globalAlpha = 0.45;
    for (let i = 0; i < 7; i++) { const u = (i * 0.37 + 0.13) % 1, v = (i * 0.61 + 0.29) % 1, r = 5 + (i % 3) * 3; ctx.beginPath(); ctx.ellipse(x0 + 10 + u * (w - 20), y0 + 12 + v * (h - 24), r, r * 0.7, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 0.6; ctx.strokeStyle = k.bodyInk; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x0 + w * 0.2, y0 + h * 0.7); ctx.lineTo(x0 + w * 0.35, y0 + h * 0.55); ctx.lineTo(x0 + w * 0.3, y0 + h * 0.4);
    ctx.moveTo(x0 + w * 0.75, y0 + h * 0.8); ctx.lineTo(x0 + w * 0.68, y0 + h * 0.6); ctx.lineTo(x0 + w * 0.82, y0 + h * 0.45); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  BACK.lamp = lamp; BACK.part = part; MID.fridge = fridge; MID.pits = pits;
  // bite { x, y, s }: nibble marks of the moon worm on the face of a ground tile (x, y = that solid tile, s = size,
  //   default 1): a small round bite with tooth scallops and a few crumbs below; foreshadows Käsebert
  function bite(ctx, d) {
    const k = col(), s = d.s || 1, cx = d.x * T + T / 2, cy = d.y * T + T / 2, r = 11 * s;
    if (!seen(cx - 30, cy - 30, cx + 30, cy + 40)) return;
    ctx.fillStyle = k.bodyInk; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + 0.3; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.2 * s, 0, TAU); ctx.fill(); }
    ctx.fillStyle = api.dark ? '#2E2B52' : '#5F5B8E'; ctx.beginPath(); ctx.arc(cx + 1.5 * s, cy - 1.5 * s, r * 0.72, 0, TAU); ctx.fill(); // the deep inside
    ctx.globalAlpha = 1; ctx.fillStyle = k.print;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 6 + i * 6, cy + r + 6 + (i % 2) * 3, 1.8, 0, TAU); ctx.fill(); }
  }
  MID.bite = bite;
  // block C (levels 10 to 13). cave { x, y, w, h }: the back wall of a cheese cellar behind the empty tiles (muted cheese
  //   with dark round holes), so a cellar does not show the sky. tunnel { x, y, r }: the mouth of Käsebert's round
  //   tunnel in the back (x, y = its centre tile, r tiles): a deep dark hole, a nibbled rim, crumbs below; never the worm.
  //   crumbs { x, y, w }: cheese crumbs along w tiles of ground (y = the empty row above it).
  //   earthrise { x0, x1, s, fx }: the Earth is down behind the horizon until Mimo passes column x0, then rises behind
  //   the terrain while he walks on to x1, up into the sky at fx of the screen width, s times its size; it never sinks
  //   again in one try (sets L.moon.earth, the same hook the boss uses)
  const CAVE = { light: { wall: '#6F6250', hole: '#4E4436', rim: '#E2C981', deep: '#3B2F45', a: 0.5 }, dark: { wall: '#3A3226', hole: '#272118', rim: '#8F7A45', deep: '#17121F', a: 0.55 } };
  const cave = () => CAVE[api.dark ? 'dark' : 'light'];
  function cellar(ctx, d) {
    const c = cave(), x0 = d.x * T, y0 = d.y * T, w = d.w * T, h = d.h * T;
    if (!seen(x0, y0, x0 + w, y0 + h)) return;
    ctx.fillStyle = c.wall; ctx.globalAlpha = c.a; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = c.hole;
    for (let i = 0; i < d.w * d.h / 6; i++) {
      const hx = x0 + api.hash(i, d.x + 41) * w, hy = y0 + api.hash(i, d.y + 43) * h, r = 3 + api.hash(i, 47) * 9;
      ctx.beginPath(); ctx.ellipse(hx, hy, r, r * 0.8, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function tunnel(ctx, d) {
    const c = cave(), cx = d.x * T + T / 2, cy = d.y * T + T / 2, r = (d.r || 3) * T;
    if (!seen(cx - r - 20, cy - r - 20, cx + r + 20, cy + r + 40)) return;
    ctx.fillStyle = c.rim; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5), 6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = c.hole; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = c.deep; ctx.beginPath(); ctx.arc(cx + r * 0.12, cy - r * 0.08, r * 0.72, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy - r * 0.12, r * 0.45, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function crumbs(ctx, d) {
    const c = cave(), y = (d.y + 1) * T - 2;
    if (!seen(d.x * T, y - 10, (d.x + d.w) * T, y + 4)) return;
    ctx.fillStyle = c.rim;
    for (let i = 0; i < d.w * 3; i++) { const x = d.x * T + api.hash(i, d.x + 51) * d.w * T, r = 1.5 + api.hash(i, 53) * 2.2; ctx.beginPath(); ctx.arc(x, y - r * 0.6, r, 0, TAU); ctx.fill(); }
  }
  function earthrise(ctx, d) {
    const m = api.L.moon, p = api.p, v = api.view, cam = api.cam; if (!m || !p) return;
    const px = (p.x + p.w / 2) / T, k0 = Math.max(0, Math.min(1, (px - d.x0) / (d.x1 - d.x0)));
    const k = m.earthK = Math.max(m.earthK || 0, k0), e = k * k * (3 - 2 * k), s = d.s || 1.6;
    const hy = ((api.L.h - 2) * T - cam.y) * 0.85 - 10, low = Math.min(hy + 40 * s, v.h + 50 * s), top = 50 + 42 * s;
    const x = v.w * (d.fx || 0.66), y = low + (top - low) * e;
    m.earth = { dx: x - (v.w * 0.17 - cam.x * 0.015), dy: y - (86 - cam.y * 0.015), s };
  }
  BACK.cave = cellar; BACK.tunnel = tunnel; MID.crumbs = crumbs; BACK.earthrise = earthrise;

  window.MimoWorlds.register({
    world: 6,
    setup(a) { api = a; },
    draw(layer, ctx) {
      const m = api.L && api.L.moon, list = m && m.def && m.def.decor; if (!Array.isArray(list)) return;
      const table = layer === 'back' ? BACK : layer === 'mid' ? MID : null; if (!table) return;
      for (const d of list) if (d && table[d.k]) table[d.k](ctx, d);
    },
  });
})();
