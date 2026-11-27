// World 5 "Gipfelsturm": the hiking trail up the volcano (looks only, nothing here is solid or changes a rule).
// - the signpost at the start of every level: the height and the time to the summit (level fields height, toSummit,
//   sign; the numbers come from volcano-ascent.js)
// - a rest bench at every flag (the flags of this world are rest stops on the way up; level field benches: false)
// - the ground dressing of the height bands: grass tufts and red-white trail marks in the mountain forest, red-white
//   marks and scree on the bare rock (level field marks: false), dry palms from the bare rock up (volcano-look.js asks)
// - decor kinds for the level field decor: hut, bench, marker, cairn, cross, pylon, crag (see tools/levels/world5-kit.md)
// Everything is culled to the camera, a few rects and paths each, colours light / dark and dimmed at night.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, V = () => window.MimoVolcano;
  const FONT = '800 10px Nunito, system-ui, sans-serif';

  const COL = {
    light: { post: '#8C6A5C', postInk: '#5E4438', board: '#FFE3A6', boardEdge: '#D2A25E', plate: '#FFF6EC', plateEdge: '#C4A9B8', ink: '#4A2F45',
      red: '#E2654F', white: '#FFF8F0', wood: '#A9805F', woodLite: '#C99D77', woodInk: '#76543E', stone: '#9A8FAA', stoneLite: '#BDB3CB', stoneInk: '#6E6383',
      roof: '#8A4E5A', roofLite: '#A8656E', window: '#FFD98E', shutter: '#E58A7A', flower: '#F2A7BC', leaf: '#7FA37A', leaf2: '#93B58A',
      steel: '#8E84A0', steelInk: '#5C5270', cable: '#4A3A52', frond: '#A8865E', frondInk: '#7A5C44', scree: '#8C7E9A', cross: '#8C6448', crossLite: '#B48A66' },
    dark: { post: '#6A5046', postInk: '#42302A', board: '#E2BE7C', boardEdge: '#A47A44', plate: '#E2D6C8', plateEdge: '#94798A', ink: '#2A1A26',
      red: '#C9563F', white: '#E8DED2', wood: '#7E5E47', woodLite: '#9A7558', woodInk: '#54392A', stone: '#6E6383', stoneLite: '#8A80A2', stoneInk: '#4A4060',
      roof: '#663A44', roofLite: '#7E4A52', window: '#F2B86C', shutter: '#B86A60', flower: '#D48CA2', leaf: '#55785A', leaf2: '#668866',
      steel: '#6A6080', steelInk: '#41385A', cable: '#2E2236', frond: '#7E6448', frondInk: '#56402E', scree: '#625672', cross: '#6A4A36', crossLite: '#8A6448' },
  };
  // night dims everything a little towards the night sky; the lit window, the text and the signs stay readable
  const KEEP = new Set(['window', 'ink', 'red', 'white', 'board', 'plate']);
  let cFor = null, cNight = -1, C = null;
  function col() {
    const W = api.W, n = W.night || 0;
    if (C && cFor === W && cNight === n) return C;
    const base = COL[api.dark ? 'dark' : 'light'], to = api.dark ? '#2E2238' : '#4A3658';
    C = {};
    for (const k of Object.keys(base)) C[k] = n <= 0 ? base[k] : api.mixHex(base[k], to, n * (KEEP.has(k) ? 0.18 : 0.45));
    cFor = W; cNight = n; return C;
  }
  const seen = (x0, y0, x1, y1) => { const cam = api.cam, v = api.view; return x1 > cam.x - 40 && x0 < cam.x + v.w + 40 && y1 > cam.y - 40 && y0 < cam.y + v.h + 40; };
  const ascent = () => (V().ascent ? V().ascent.now() : null);
  const defOf = () => { const v = api.L && api.L.volcano; return (v && v.def) || {}; };
  const SOLID = (tx, ty) => api.isSolid(tx, ty);
  const free = (tx, ty) => !SOLID(tx, ty) && api.tileAt(tx, ty) !== api.tileId(5, '~');
  const stands = (tx, ty) => api.tileAt(tx, ty) === api.TILE.EMPTY && SOLID(tx, ty + 1) && api.tileAt(tx, ty + 1) !== api.tileId(5, '~');

  // ---------- the signpost at the start ----------
  // where it stands: level field sign { x, y, dir } (x, y = the empty tile it stands in), else beside the start, behind
  // Mimo (he looks towards the door); false = no sign
  function signSpot(L, def) {
    if (def.sign === false) return null;
    const s = L.start, d = L.door;
    let dir = def.sign && def.sign.dir ? Math.sign(def.sign.dir) : d && s && d.x < s.x ? -1 : 1;
    // a door straight above (a climb): the arrow points to the side with more room on the start row
    if (!(def.sign && def.sign.dir) && s && (!d || Math.abs(d.x - s.x) < 4)) dir = room(s, -1) > room(s, 1) ? -1 : 1;
    if (def.sign && typeof def.sign.x === 'number') return { x: def.sign.x * T + T / 2, y: (def.sign.y + 1) * T, dir };
    if (!s) return null;
    // the board points towards dir: keep the post a tile away from the level edge behind it
    const inside = (tx) => (dir > 0 ? tx >= 1 : tx <= L.w - 2);
    for (const dx of [-2 * dir, -dir, 2 * dir, dir]) if (inside(s.x + dx) && stands(s.x + dx, s.y)) return { x: (s.x + dx) * T + T / 2, y: (s.y + 1) * T, dir };
    return { x: s.x * T + T / 2 - dir * 12, y: (s.y + 1) * T, dir };
  }
  function room(s, dir) { let n = 0; while (n < 12 && stands(s.x + dir * (n + 1), s.y)) n++; return n; }
  function trailState(L) {
    const v = L.volcano;
    if (v.trail && v.trail.def === v.def) return v.trail;
    const def = v.def || {}, a = V().ascent ? V().ascent.resolve(def) : null;
    // tiles under a built set piece (anvil, bricks, stone, boiler ...) get no trail mark painted on them
    const busy = new Set();
    for (const d of Array.isArray(def.decor) ? def.decor : []) {
      if (!d || typeof d.x !== 'number' || typeof d.y !== 'number' || !(d.w > 0)) continue;
      for (let ty = d.y; ty < d.y + (d.h || 3); ty++) for (let tx = Math.floor(d.x); tx < d.x + d.w; tx++) busy.add(ty * L.w + tx);
    }
    v.trail = { def: v.def, busy, spot: a ? signSpot(L, def) : null, top: a ? V().ascent.label(a.height) : '', board: a ? 'Gipfel ' + a.toSummit : '', w0: 0, w1: 0 };
    return v.trail;
  }
  function drawSign(ctx) {
    const L = api.L, tr = trailState(L), sp = tr.spot; if (!sp) return;
    const x = sp.x, g = sp.y, dir = sp.dir;
    if (!seen(x - 120, g - 90, x + 120, g)) return;
    const c = col();
    ctx.font = FONT;
    if (!tr.w0) { tr.w0 = Math.ceil(ctx.measureText(tr.top).width); tr.w1 = Math.ceil(ctx.measureText(tr.board).width); }
    // the post
    ctx.fillStyle = c.postInk; ctx.fillRect(x - 3, g - 70, 6, 70);
    ctx.fillStyle = c.post; ctx.fillRect(x - 2, g - 70, 3, 70);
    ctx.fillStyle = c.postInk; ctx.beginPath(); ctx.ellipse(x, g, 7, 2.2, 0, 0, TAU); ctx.fill();
    // the plate on top: where you are
    const pw = tr.w0 + 14, py = g - 84;
    ctx.fillStyle = c.plateEdge; api.rr(x - pw / 2 - 1, py - 1, pw + 2, 17, 4); ctx.fill();
    ctx.fillStyle = c.plate; api.rr(x - pw / 2, py, pw, 15, 3.5); ctx.fill();
    ctx.fillStyle = c.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tr.top, x, py + 8);
    // the arrow board: where to and how long, with the red-white-red trail mark at its root
    const bw = tr.w1 + 32, by = g - 62, bh = 17, x0 = x - dir * 14, x1 = x0 + dir * bw;
    const arrow = () => { ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x1 - dir * 9, by); ctx.lineTo(x1, by + bh / 2); ctx.lineTo(x1 - dir * 9, by + bh); ctx.lineTo(x0, by + bh); ctx.closePath(); };
    ctx.save(); ctx.translate(0, 1); ctx.fillStyle = c.boardEdge; arrow(); ctx.fill(); ctx.restore();
    ctx.fillStyle = c.board; arrow(); ctx.fill();
    ctx.strokeStyle = c.boardEdge; ctx.lineWidth = 1; arrow(); ctx.stroke();
    const mx = dir > 0 ? x0 + 3 : x0 - 9;
    ctx.fillStyle = c.red; ctx.fillRect(mx, by + 4, 6, 3); ctx.fillRect(mx, by + 10, 6, 3); ctx.fillStyle = c.white; ctx.fillRect(mx, by + 7, 6, 3);
    ctx.fillStyle = c.ink; ctx.fillText(tr.board, x0 + dir * (20 + tr.w1 / 2), by + bh / 2 + 0.5);
  }

  // ---------- benches ----------
  // a bench of w px with its left end at x, standing on the ground line g
  function bench(ctx, x, g, w, c) {
    ctx.fillStyle = c.woodInk;
    ctx.fillRect(x + 3, g - 11, 3, 11); ctx.fillRect(x + w - 6, g - 11, 3, 11);
    ctx.fillRect(x + 4, g - 25, 3, 14); ctx.fillRect(x + w - 7, g - 25, 3, 14);
    ctx.fillStyle = c.wood; api.rr(x, g - 14, w, 4.5, 2); ctx.fill();
    ctx.fillStyle = c.woodLite; ctx.fillRect(x + 1, g - 14, w - 2, 1.5);
    ctx.fillStyle = c.wood; api.rr(x + 1, g - 25, w - 2, 4, 2); ctx.fill(); api.rr(x + 1, g - 20, w - 2, 3.5, 1.75); ctx.fill();
    ctx.fillStyle = c.woodLite; ctx.fillRect(x + 2, g - 25, w - 4, 1.3);
  }
  // every flag of this world gets a bench beside it (left of the pole if there is ground, else right of the pennant)
  function flagBenches(ctx) {
    const L = api.L; if (defOf().benches === false || !L.checkpoints.length) return;
    const c = col();
    for (const f of L.checkpoints) {
      const fx = f.x * T, g = (f.y + 1) * T;
      if (!seen(fx - 50, g - 30, fx + 80, g)) continue;
      if (f.bench == null) f.bench = stands(f.x - 1, f.y) ? -1 : stands(f.x + 1, f.y) ? 1 : 0;
      if (f.bench < 0) bench(ctx, fx - 36, g, 40, c); else if (f.bench > 0) bench(ctx, fx + 30, g, 40, c);
    }
  }

  // ---------- decor kinds (level field decor), x, y in tiles; y is the ground row they stand on ----------
  // hut { x, y, w, dir, smoke }: a mountain hut w tiles wide (default 4) on the ground top of row y, door towards dir
  function drawHut(ctx, d) {
    const c = col(), w = (d.w || 4) * T, x0 = d.x * T, g = d.y * T, hgt = 2.2 * T, dir = d.dir || 1, t = api.reduced ? 0 : api.time;
    if (!seen(x0 - 20, g - hgt - 3 * T, x0 + w + 20, g)) return;
    // smoke from the chimney
    const chx = x0 + (dir > 0 ? w * 0.72 : w * 0.28);
    if (d.smoke !== false) { ctx.fillStyle = api.W.smokePuff; for (let i = 0; i < 4; i++) { const q = (t * 0.2 + i / 4) % 1; ctx.globalAlpha = 0.5 * (1 - q); ctx.beginPath(); ctx.arc(chx + q * 30 + Math.sin(t + i) * 3, g - hgt - 30 - q * 70, 5 + q * 12, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    // stone base and timber walls with boards
    ctx.fillStyle = c.stone; ctx.fillRect(x0 + 4, g - 20, w - 8, 20);
    ctx.fillStyle = c.stoneInk; for (let i = 0; i < 3; i++) for (let xx = x0 + 6 + (i % 2) * 9; xx < x0 + w - 12; xx += 18) { ctx.globalAlpha = 0.5; api.rr(xx, g - 19 + i * 6.5, 15, 5.5, 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = c.wood; ctx.fillRect(x0 + 6, g - hgt, w - 12, hgt - 20);
    ctx.fillStyle = c.woodInk; ctx.globalAlpha = 0.45; for (let xx = x0 + 14; xx < x0 + w - 8; xx += 9) ctx.fillRect(xx, g - hgt, 1.5, hgt - 20); ctx.globalAlpha = 1;
    // roof with a deep overhang, the chimney
    ctx.fillStyle = c.stoneInk; ctx.fillRect(chx - 5, g - hgt - 26, 10, 22);
    ctx.fillStyle = c.roof; ctx.beginPath(); ctx.moveTo(x0 - 8, g - hgt + 6); ctx.lineTo(x0 + w / 2, g - hgt - 26); ctx.lineTo(x0 + w + 8, g - hgt + 6); ctx.lineTo(x0 + w + 2, g - hgt + 10); ctx.lineTo(x0 - 2, g - hgt + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.roofLite; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 - 6, g - hgt + 5); ctx.lineTo(x0 + w / 2, g - hgt - 24); ctx.lineTo(x0 + w + 6, g - hgt + 5); ctx.stroke();
    // door towards dir, a window with red shutters and a flower box
    const dx = dir > 0 ? x0 + w - 30 : x0 + 12, wx = dir > 0 ? x0 + 18 : x0 + w - 38;
    ctx.fillStyle = c.woodInk; api.rr(dx, g - 40, 18, 40, 4); ctx.fill(); ctx.fillStyle = c.woodLite; ctx.fillRect(dx + 13, g - 22, 2.5, 2.5);
    ctx.fillStyle = c.window; ctx.fillRect(wx, g - hgt + 12, 20, 16);
    ctx.fillStyle = c.woodInk; ctx.fillRect(wx + 9, g - hgt + 12, 2, 16); ctx.fillRect(wx, g - hgt + 19, 20, 2);
    ctx.fillStyle = c.shutter; ctx.fillRect(wx - 8, g - hgt + 11, 7, 18); ctx.fillRect(wx + 21, g - hgt + 11, 7, 18);
    ctx.fillStyle = c.woodInk; ctx.fillRect(wx - 3, g - hgt + 29, 26, 5);
    ctx.fillStyle = c.flower; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(wx + i * 5, g - hgt + 28, 2.4, 0, TAU); ctx.fill(); }
    if ((api.W.night || 0) > 0.1) V().glow(ctx, 'hutWin', wx + 10, g - hgt + 20, 30, c.window, 0.35 * api.W.night);
  }
  function drawBenchDecor(ctx, d) {
    const c = col(), x = d.x * T, g = d.y * T, w = (d.w || 1.25) * T;
    if (!seen(x - 4, g - 30, x + w + 4, g)) return;
    bench(ctx, x, g, w, c);
  }
  // marker { x, y, rock, s }: the red-white-red trail mark on a boulder standing on row y (rock: false paints it on the
  // middle of tile x, y instead: on a wall or a cliff)
  function drawMarker(ctx, d) {
    const c = col(), s = d.s || 1, x = d.x * T + T / 2, g = d.y * T;
    if (!seen(x - 20, g - 30, x + 20, g + T)) return;
    if (d.rock === false) { stripes(ctx, x - 6 * s, g + T / 2 - 5 * s, s, c); return; }
    ctx.fillStyle = c.stone; ctx.beginPath(); ctx.moveTo(x - 15 * s, g); ctx.quadraticCurveTo(x - 15 * s, g - 17 * s, x - 2 * s, g - 19 * s); ctx.quadraticCurveTo(x + 14 * s, g - 18 * s, x + 15 * s, g); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.stoneLite; ctx.beginPath(); ctx.ellipse(x - 5 * s, g - 15 * s, 7 * s, 2.5 * s, -0.15, 0, TAU); ctx.fill();
    stripes(ctx, x - 5 * s, g - 12 * s, s, c);
  }
  function stripes(ctx, x, y, s, c) {
    ctx.fillStyle = c.red; ctx.fillRect(x, y, 11 * s, 3 * s); ctx.fillRect(x, y + 6 * s, 11 * s, 3 * s);
    ctx.fillStyle = c.white; ctx.fillRect(x, y + 3 * s, 11 * s, 3 * s);
  }
  // cairn { x, y, n, s }: a little tower of n flat stones (default 4) on the ground top of row y
  function drawCairn(ctx, d) {
    const c = col(), s = d.s || 1, n = Math.max(1, Math.min(12, d.n || 4)), x = d.x * T + T / 2, g = d.y * T;
    if (!seen(x - 20 * s, g - n * 9 * s - 10, x + 20 * s, g)) return;
    let y = g;
    for (let i = 0; i < n; i++) {
      const w = (13 - i * (8 / n)) * s, h = (6 - i * (2 / n)) * s, ox = (api.hash(d.x + i, d.y) - 0.5) * 3 * s;
      ctx.fillStyle = i % 2 ? c.stoneInk : c.stone; ctx.beginPath(); ctx.ellipse(x + ox, y - h, w, h, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c.stoneLite; ctx.beginPath(); ctx.ellipse(x + ox - w * 0.25, y - h * 1.5, w * 0.45, h * 0.3, 0, 0, TAU); ctx.fill();
      y -= h * 1.75;
    }
  }
  // cross { x, y, s }: the summit cross standing on the ground top of row y (about 3.5 tiles high at s 1)
  function drawCross(ctx, d) {
    const c = col(), s = d.s || 1, x = d.x * T + T / 2, g = d.y * T, h = 112 * s;
    if (!seen(x - 40 * s, g - h - 10, x + 40 * s, g)) return;
    ctx.fillStyle = c.stoneInk; ctx.beginPath(); ctx.ellipse(x, g, 14 * s, 4 * s, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = c.woodInk; ctx.fillRect(x - 5 * s, g - h, 10 * s, h); ctx.fillRect(x - 32 * s, g - h + 24 * s, 64 * s, 10 * s);
    ctx.fillStyle = c.cross; ctx.fillRect(x - 3.5 * s, g - h + 1.5 * s, 7 * s, h - 1.5 * s); ctx.fillRect(x - 30.5 * s, g - h + 25.5 * s, 61 * s, 7 * s);
    ctx.fillStyle = c.crossLite; ctx.fillRect(x - 3.5 * s, g - h + 1.5 * s, 2 * s, h - 1.5 * s); ctx.fillRect(x - 30.5 * s, g - h + 25.5 * s, 61 * s, 2 * s);
    // the round sun in the crossing and the little box with the summit book
    ctx.strokeStyle = c.woodInk; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.arc(x, g - h + 29 * s, 12 * s, 0, TAU); ctx.stroke();
    ctx.fillStyle = c.steel; api.rr(x + 5 * s, g - 52 * s, 13 * s, 11 * s, 2 * s); ctx.fill(); ctx.fillStyle = c.steelInk; ctx.fillRect(x + 5 * s, g - 48 * s, 13 * s, 1.5 * s);
  }
  // pylon { x, y, h, sign, rope: [dx, dy] }: a cable car pylon h tiles high (default 5) on the ground top of row y; its
  // cable runs to dx, dy tiles from the top (default [14, -6]); sign: false hides the "Außer Betrieb" board
  function drawPylon(ctx, d) {
    const c = col(), x = d.x * T + T / 2, g = d.y * T, h = (d.h || 5) * T, top = g - h, r = d.rope || [14, -6];
    const ex = x + r[0] * T, ey = top + r[1] * T;
    if (!seen(Math.min(x, ex) - 40, Math.min(top, ey) - 20, Math.max(x, ex) + 40, g)) return;
    const b = 18, tw = 6;
    ctx.strokeStyle = c.steelInk; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - b, g); ctx.lineTo(x - tw, top); ctx.moveTo(x + b, g); ctx.lineTo(x + tw, top); ctx.stroke();
    ctx.strokeStyle = c.steel; ctx.lineWidth = 1.6; ctx.beginPath();
    const n = Math.max(3, Math.round(h / 26));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, y0 = g - h * u0, y1 = g - h * u1, w0 = b + (tw - b) * u0, w1 = b + (tw - b) * u1;
      ctx.moveTo(x - w0, y0); ctx.lineTo(x + w1, y1); ctx.moveTo(x + w0, y0); ctx.lineTo(x - w1, y1); ctx.moveTo(x - w1, y1); ctx.lineTo(x + w1, y1);
    }
    ctx.stroke();
    // crossarm, wheels and the two cables sagging towards the next pylon
    ctx.fillStyle = c.steelInk; ctx.fillRect(x - 26, top - 4, 52, 6);
    for (const o of [-18, 18]) { ctx.fillStyle = c.steelInk; ctx.beginPath(); ctx.arc(x + o, top - 7, 5, 0, TAU); ctx.fill(); ctx.fillStyle = c.steel; ctx.beginPath(); ctx.arc(x + o, top - 7, 2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = c.cable; ctx.lineWidth = 1.6; ctx.beginPath();
    for (const o of [-18, 18]) { const sx = x + o, sy = top - 12, mx = (sx + ex + o) / 2, my = (sy + ey) / 2 + Math.abs(ex - sx) * 0.08 + (d.x === (window.MimoVolcano.ropeAt || -1) ? window.MimoVolcano.ropeSag || 0 : 0); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex + o, ey); }
    ctx.stroke();
    if (d.sign === false) return;
    // the "Außer Betrieb" board hangs a little askew on the tower
    ctx.save(); ctx.translate(x, g - h * 0.42); ctx.rotate(-0.08);
    ctx.font = '900 8.5px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = c.steelInk; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-8, -8); ctx.moveTo(14, -14); ctx.lineTo(8, -8); ctx.stroke();
    ctx.fillStyle = c.red; api.rr(-33, -9, 66, 22, 4); ctx.fill(); ctx.fillStyle = c.white; api.rr(-30, -6, 60, 16, 2.5); ctx.fill();
    ctx.fillStyle = c.red; ctx.fillText('AUSSER', 0, -1); ctx.fillText('BETRIEB', 0, 7);
    ctx.restore();
  }
  // crag { x, y, w, h, far }: a lone rock pinnacle standing on the ground top of row y, w tiles wide at the foot (default 3),
  // h tiles high (default 3) with a small flat seat on top (Fauch can sit there: his y is y - h - 1); far 0..1 hazes it into
  // the distance (default 0.3). Facets lit from the left, cracks, a grass tuft at the foot
  const CRAG = [[-0.5, 0], [-0.44, -0.3], [-0.33, -0.42], [-0.36, -0.66], [-0.2, -0.84], [-0.16, -1], [0.16, -1], [0.24, -0.82], [0.31, -0.6], [0.27, -0.44], [0.4, -0.28], [0.5, 0]];
  function drawCrag(ctx, d) {
    const c = col(), w = (d.w || 3) * T, h = (d.h || 3) * T, x = d.x * T + T / 2, g = d.y * T, far = d.far == null ? 0.3 : d.far;
    if (!seen(x - w / 2 - 8, g - h - 8, x + w / 2 + 8, g + 4)) return;
    const haze = (k) => api.mixHex(k, api.W.hillNear, far), at = (p) => [x + p[0] * w, g + p[1] * h];
    ctx.fillStyle = haze(c.stoneInk); ctx.beginPath(); for (const p of CRAG) ctx.lineTo(...at(p)); ctx.closePath(); ctx.fill();
    // the lit faces on the sun side: a band inside the left edge up to the seat
    ctx.fillStyle = haze(c.stone); ctx.beginPath();
    for (const p of CRAG.slice(0, 7)) ctx.lineTo(...at(p));
    for (const p of [[0.02, -0.9], [-0.06, -0.62], [-0.02, -0.4], [-0.16, -0.2], [-0.12, 0]]) ctx.lineTo(...at(p));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = haze(c.stoneLite); ctx.fillRect(x - 0.16 * w, g - h, 0.32 * w, 3);
    ctx.strokeStyle = haze(c.stoneInk); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (const [a, b] of [[[-0.3, -0.5], [-0.18, -0.36]], [[-0.24, -0.78], [-0.12, -0.7]], [[0.12, -0.3], [0.22, -0.16]], [[-0.36, -0.18], [-0.26, -0.08]]]) { ctx.moveTo(...at(a)); ctx.lineTo(...at(b)); }
    ctx.stroke();
    ctx.fillStyle = haze(c.leaf); for (const o of [-0.42, 0.36]) { const bx = x + o * w; ctx.beginPath(); ctx.moveTo(bx - 5, g); ctx.lineTo(bx - 2, g - 7); ctx.lineTo(bx, g - 2); ctx.lineTo(bx + 3, g - 8); ctx.lineTo(bx + 5, g); ctx.closePath(); ctx.fill(); }
  }
  const KINDS_BACK = { hut: drawHut, bench: drawBenchDecor, cross: drawCross, pylon: drawPylon, crag: drawCrag };
  const KINDS_MID = { marker: drawMarker, cairn: drawCairn };
  function drawKinds(ctx, table) {
    const list = defOf().decor; if (!Array.isArray(list)) return;
    for (const d of list) if (d && table[d.k]) table[d.k](ctx, d);
  }

  // ---------- ground dressing of the bands ----------
  // tufts of grass and ferns in the mountain forest, trail marks on the way, scree on the bare rock; weights over the
  // height like the background, so the change is gradual. One pass over the tiles in view.
  function dressing(ctx, a) {
    const h = a.height, def = defOf();
    const grass = Math.min(1, Math.max(0, (h - 300) / 150)) * (1 - Math.min(1, Math.max(0, (h - 950) / 250)));
    const scree = Math.min(1, Math.max(0, (h - 1050) / 200)), marks = def.marks !== false && a.band >= 2 && a.band <= 3;
    if (grass <= 0 && scree <= 0 && !marks) return;
    const L = api.L, cam = api.cam, v = api.view, c = col(), SOL = api.TILE.SOLID, sway = api.reduced ? 0 : api.time * 1.6;
    const busy = trailState(L).busy;
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(L.w - 1, Math.floor((cam.x + v.w) / T)), y0 = Math.max(1, Math.floor(cam.y / T)), y1 = Math.min(L.h - 1, Math.floor((cam.y + v.h) / T) + 1);
    ctx.lineCap = 'round';
    for (let ty = y0; ty <= y1; ty++) {
      const row = L.tiles[ty], up = L.tiles[ty - 1];
      for (let tx = x0; tx <= x1; tx++) {
        if (row[tx] !== SOL || up[tx] !== api.TILE.EMPTY) continue;
        const x = tx * T, y = ty * T, hh = api.hash(tx * 5 + 2, ty * 3 + 1);
        if (marks && tx % 13 === 6 && row[tx - 1] === SOL && row[tx + 1] === SOL && !busy.has(ty * L.w + tx)) { ctx.globalAlpha = 0.8; stripes(ctx, x + 10, y + 12, 1, c); ctx.globalAlpha = 1; continue; }
        if (grass > 0 && hh < 0.45 * grass) {
          ctx.strokeStyle = hh < 0.2 * grass ? c.leaf2 : c.leaf; ctx.lineWidth = 2; ctx.beginPath();
          const bx = x + 6 + api.hash(ty, tx) * 18, s = Math.sin(sway + tx) * 1.2;
          ctx.moveTo(bx, y + 2); ctx.quadraticCurveTo(bx - 1, y - 3, bx - 4 + s, y - 7);
          ctx.moveTo(bx + 2, y + 2); ctx.quadraticCurveTo(bx + 2, y - 5, bx + 2 + s, y - 10);
          ctx.moveTo(bx + 4, y + 2); ctx.quadraticCurveTo(bx + 5, y - 3, bx + 8 + s, y - 6);
          ctx.stroke();
        } else if (scree > 0 && hh > 1 - 0.3 * scree) {
          ctx.fillStyle = c.scree; const bx = x + 5 + api.hash(ty, tx) * 18;
          ctx.beginPath(); ctx.ellipse(bx, y + 1, 4, 2.6, 0, Math.PI, TAU); ctx.ellipse(bx + 7, y + 1, 2.6, 1.8, 0, Math.PI, TAU); ctx.fill();
        }
      }
    }
  }

  // ---------- the dry palm (the ash palm "Y" from the bare rock up): a bent trunk and a few hanging dry fronds ----------
  function drawDryPalm(tx, ty, x, y, ctx) {
    const c = col(), W = api.W, bx = x + 12, by = y + T, tipX = bx + 12, tipY = by - 66;
    ctx.strokeStyle = W.palmTrunk; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 1, by - 38, tipX, tipY); ctx.stroke();
    const sway = api.reduced ? 0 : Math.sin(api.time * 0.8 + tx) * 0.04;
    ctx.strokeStyle = c.frond; ctx.lineWidth = 3;
    for (const [a, l] of [[-2.5, 20], [-1.9, 16], [-0.7, 18], [-0.2, 22]]) {
      const aa = a + sway, ex = tipX + Math.cos(aa) * l, ey = tipY + Math.sin(aa) * l * 0.6;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + ex) / 2, Math.min(tipY, ey) - 6, ex, ey + 12); ctx.stroke();
    }
    ctx.fillStyle = c.frondInk; ctx.beginPath(); ctx.arc(tipX, tipY + 1, 3.5, 0, TAU); ctx.fill();
  }

  window.MimoVolcano = Object.assign(window.MimoVolcano || {}, {
    trail: { dryPalm: drawDryPalm, signSpot: (L, def) => signSpot(L, def || {}) },
  });
  window.MimoWorlds.register({
    world: 5,
    setup(x) { api = x; },
    draw(layer, ctx) {
      if (!api.L || !api.L.volcano || api.mode !== 'level') return;
      const a = ascent(); if (!a) return;
      if (layer === 'back') { drawKinds(ctx, KINDS_BACK); flagBenches(ctx); }
      else if (layer === 'mid') { dressing(ctx, a); drawKinds(ctx, KINDS_MID); drawSign(ctx); }
    },
  });
})();
