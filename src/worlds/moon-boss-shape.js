// World 6 boss "Mondwurm Käsebert": the arena and the shapes. A wide crater field (26 × 12 tiles) with three craters;
// Käsebert dives from crater to crater, his body spans an arc over the arena.
// The worm lives on a path: a cubic curve from under one crater, up over the arena and down into another one. His head
// sits at an arc length s on that path, every segment of his body a fixed gap behind it. Before the start of the path
// and after its end the path runs straight down, under the ground (the ground tiles cover it).
// Shared through window.MimoKaese; no document or canvas at load time.
(function () {
  'use strict';
  const T = 32, GY = 10 * T, W = 26 * T;
  const CRATERS = [168, 416, 664];            // crater centres (px), the ground top is GY
  const CRATER_RX = 56;                         // half width of a crater mouth
  const SEG_R = 30, HEAD_R = 40;                // body segment and head radius
  const PINK_K = 8;                             // the pink segment: the ninth behind the head (the middle of the arc)
  const HOLD_BACK = 64;                         // while he munches, the head stays this far before the end of the path
  const UNDER = 40;                             // the path starts and ends this far under the ground
  // the arena: invisible walls "!", moon dust "#", Mimo starts at "P"
  const MAP = [
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!                        !',
    '!        P               !',
    '##########################',
    '##########################',
  ];
  // per phase: height of the pink segment's top above the ground (px). Phase 1 wants the full moon jump (5.2 tiles,
  // 166 px), phases 2 and 3 a shooting star (they hang under the top of the arc)
  const ARC_TOP = [148, 205, 205];
  // shooting stars of phases 2 and 3: under the top of each arc, 4.5 tiles above the ground
  const STAR_Y = GY - 144;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

  // ---------- paths ----------
  const SAMPLES = 64;
  // a path through four control points; its arc length table is made once
  function makePath(x0, y0, x1, y1, x2, y2, x3, y3) {
    const P = { x: [x0, x1, x2, x3], y: [y0, y1, y2, y3], len: new Float32Array(SAMPLES + 1), total: 0 };
    let px = x0, py = y0;
    for (let i = 1; i <= SAMPLES; i++) {
      const q = bez(P, i / SAMPLES);
      P.len[i] = P.len[i - 1] + Math.hypot(q.x - px, q.y - py); px = q.x; py = q.y;
    }
    P.total = P.len[SAMPLES];
    // defaults for the worm on it (arcFor sets its own): a segment every 30 px, a body as long as the path
    P.gap = 30; P.n = Math.ceil(P.total / P.gap) + 2; P.hold = P.total;
    return P;
  }
  const BQ = { x: 0, y: 0 };
  function bez(P, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    BQ.x = a * P.x[0] + b * P.x[1] + c * P.x[2] + d * P.x[3]; BQ.y = a * P.y[0] + b * P.y[1] + c * P.y[2] + d * P.y[3];
    return BQ;
  }
  // the point at arc length s (written into out: x, y and the direction dx, dy)
  function at(P, s, out) {
    if (s <= 0) { out.x = P.x[0]; out.y = P.y[0] - s; out.dx = 0; out.dy = -1; return out; }
    if (s >= P.total) { out.x = P.x[3]; out.y = P.y[3] + (s - P.total); out.dx = 0; out.dy = 1; return out; }
    let lo = 0, hi = SAMPLES;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.len[m] < s) lo = m; else hi = m; }
    const k = (s - P.len[lo]) / Math.max(0.001, P.len[hi] - P.len[lo]), t0 = lo / SAMPLES, t1 = hi / SAMPLES;
    const a = bez(P, t0), ax = a.x, ay = a.y, b = bez(P, t1);
    out.x = lerp(ax, b.x, k); out.y = lerp(ay, b.y, k);
    const d = Math.hypot(b.x - ax, b.y - ay) || 1; out.dx = (b.x - ax) / d; out.dy = (b.y - ay) / d;
    return out;
  }
  // an arc from crater a to crater b whose top centre is lift px above the ground
  function arcPath(a, b, lift) {
    const xa = CRATERS[a], xb = CRATERS[b], out = (xb - xa) * 0.12;
    // the top of this curve is at y0 - (y0 - yc) * 0.75 with control height yc
    const y0 = GY + UNDER, yc = y0 - (UNDER + lift) / 0.75;
    return makePath(xa, y0, xa - out, yc, xb + out, yc, xb, y0);
  }
  // the arc of a phase between two craters, its segment gap (the pink segment is at the top while the head munches)
  function arcFor(ph, a, b) {
    const P = arcPath(a, b, ARC_TOP[ph] - SEG_R);
    P.gap = (P.total / 2 - HOLD_BACK) / (PINK_K + 1);
    P.n = Math.ceil((P.total - HOLD_BACK) / P.gap) + 2;
    P.hold = P.total - HOLD_BACK;
    P.a = a; P.b = b; P.top = GY - ARC_TOP[ph]; P.mid = (CRATERS[a] + CRATERS[b]) / 2;
    return P;
  }
  // straight up out of a crater and bent over at the top (the scenes)
  function towerPath(c, h, lean) {
    const x = CRATERS[c];
    return makePath(x, GY + UNDER, x, GY - h * 0.6, x + lean * 0.4, GY - h * 1.05, x + lean, GY - h);
  }

  // ---------- the worm on its path ----------
  // positions of head and segments for the head at arc length s: arrays x, y, vis (above the ground), the head's
  // direction; reused every step
  function placeWorm(B, P, s) {
    const w = B.worm, n = P.n, gap = P.gap, q = Q;
    if (w.x.length !== n) { w.x = new Float32Array(n); w.y = new Float32Array(n); }
    at(P, s, q); w.hx = q.x; w.hy = q.y; w.hdx = q.dx; w.hdy = q.dy;
    for (let i = 0; i < n; i++) { at(P, s - (i + 1) * gap, q); w.x[i] = q.x; w.y[i] = q.y; }
    w.n = n; w.s = s; w.P = P;
  }
  const Q = { x: 0, y: 0, dx: 0, dy: 0 };
  // the crater nearest to x, and the neighbour on the far side of x
  function nearest(x) {
    let best = 0;
    for (let i = 1; i < CRATERS.length; i++) if (Math.abs(CRATERS[i] - x) < Math.abs(CRATERS[best] - x)) best = i;
    return best;
  }
  function pair(x) {
    const a = nearest(x);
    if (a === 0) return [0, 1];
    if (a === CRATERS.length - 1) return [a, a - 1];
    return x < CRATERS[a] ? [a, a + 1] : [a, a - 1];
  }

  window.MimoWorlds.register({ world: 6, tiles: { '!': { solid: true, lint: { name: 'Arenarand', color: 'rgba(0,0,0,.15)' }, draw() {} } } });
  window.MimoKaese = Object.assign(window.MimoKaese || {}, {
    T, GY, W, MAP, CRATERS, CRATER_RX, SEG_R, HEAD_R, PINK_K, HOLD_BACK, ARC_TOP, STAR_Y,
    clamp, lerp, ease, makePath, at, arcPath, arcFor, towerPath, placeWorm, nearest, pair,
  });
})();
