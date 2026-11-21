// World 4 boss "Käpt’n Krake": the shape of the octopus as pure functions of the fight state.
// Head, hat and every arm are computed here, once, and shared by the fight (coast-boss.js: hits, steps, hazards),
// the picture (coast-boss-draw.js) and the test bot, so what the player sees is exactly what can hurt or carry him.
// An arm is a cubic Bezier from its tip (k = 0) to its root (k = 1) with a radius that grows from tip to root.
// Nothing here touches document or canvas at load time (the level tools run the world files in Node).
(function () {
  'use strict';
  const T = 32;

  // ---------- the arena and the octopus, in world pixels (arena 31 x 14 tiles) ----------
  // WEST: open water left of the raft (three tiles), so Mimo can jump off its left end too; every x below includes it
  const WEST = 3 * T;
  const K = Object.freeze({
    T, COLS: 31, ROWS: 14, WEST,
    SURF_ROW: 11, HIGH_ROW: 9,          // calm water line and the storm's high tide (rows; top edge of the row)
    SURF: 11 * T, HIGH: 9 * T, FLOOR: 13 * T,
    FREE: 30,                           // the deck floats this far above the water
    DECK: 11 * T - 30,                  // deck top when calm (and where the storm arms hold the raft)
    RAFT_X0: WEST + 48, RAFT_X1: WEST + 600,          // the whole raft (phase 1)
    GAP_X0: WEST + 300, GAP_X1: WEST + 364,           // where it breaks in phase 2 (two tiles of water in between)
    HEAD_X: WEST + 724, HEAD_Y: 236, HEAD_RX: 140, HEAD_RY: 124,
    LEAN_X: -16, LEAN_Y: 28, LEAN_TILT: -0.2, // pulling at a stuck arm: the head dips towards the raft
    HAT_UP: 110, HAT_TILT: -0.12,       // hat centre above the head centre, and its jaunty angle
    HAT_L: 92, HAT_R: 72, HAT_TOP: 30,  // the hat as a target: reach to the left and right of its centre, dome height
    ROOT_DX: -0.84, ROOT_DY: 0.42,      // where the arms leave the head (share of the radii, before the lean turns it)
    TIP_R: 10, ROOT_R: 30,              // arm thickness at the tip and at the head
    HOVER_Y: 150,                       // the raised arm's tip while it aims: it hangs down from above the screen
    TX_MIN: WEST + 100, TX_MAX: WEST + 468,           // where an arm may strike the deck (the steps lead to the hat from all of these)
    ARCH: 262,                          // how high the handle of a stuck arm pulls its arch above the root
    STEP_RISE: 30, STEP_GAP: 66, STEP_W: 28, // sucker steps: height between two (or this far apart sideways), width of each
    BELOW_UP: 92,                       // an arm from below reaches this far over the water
    SWEEP_ANCHOR_X: -220 + WEST * 0.65, SWEEP_ANCHOR_Y: -340,
    SAMPLES: 22,                        // circles per arm for drawing outlines and for the hit test
  });

  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = (k) => k * k * (3 - 2 * k);

  // ---------- Bezier ----------
  function bez(P, k, out) {
    const m = 1 - k, a = m * m * m, b = 3 * m * m * k, c = 3 * m * k * k, d = k * k * k;
    out[0] = a * P[0] + b * P[2] + c * P[4] + d * P[6];
    out[1] = a * P[1] + b * P[3] + c * P[5] + d * P[7];
    return out;
  }
  function bezTan(P, k, out) {
    const m = 1 - k;
    out[0] = 3 * m * m * (P[2] - P[0]) + 6 * m * k * (P[4] - P[2]) + 3 * k * k * (P[6] - P[4]);
    out[1] = 3 * m * m * (P[3] - P[1]) + 6 * m * k * (P[5] - P[3]) + 3 * k * k * (P[7] - P[5]);
    return out;
  }
  // a pose: 8 numbers (tip, two handles, root) and the two radii
  const pose = (x0, y0, x1, y1, x2, y2, x3, y3, r0, r1) => ({ P: [x0, y0, x1, y1, x2, y2, x3, y3], r0, r1 });
  function mix(a, b, k) {
    const P = new Array(8);
    for (let i = 0; i < 8; i++) P[i] = lerp(a.P[i], b.P[i], k);
    return { P, r0: lerp(a.r0, b.r0, k), r1: lerp(a.r1, b.r1, k) };
  }
  const radius = (ps, k) => lerp(ps.r0, ps.r1, k);

  // ---------- head and hat ----------
  // B.lean (0..1) pulls the head towards a stuck arm, B.rise (0..1) lifts it out of the water (intro, finale), B.bob sways it
  function head(B) {
    const lean = B.lean || 0, rise = B.rise == null ? 1 : B.rise;
    const sunk = (1 - rise) * (K.HEAD_RY * 2 + 60) + (B.sink || 0);
    return { x: K.HEAD_X + lean * K.LEAN_X, y: K.HEAD_Y + lean * K.LEAN_Y + (B.bob || 0) + sunk, tilt: lean * K.LEAN_TILT, rx: K.HEAD_RX, ry: K.HEAD_RY };
  }
  function hat(B) {
    if (B.hatFly) return B.hatFly;
    const h = head(B), squash = B.sq == null ? 1 : B.sq;
    return { x: h.x + Math.sin(h.tilt) * K.HAT_UP, y: h.y - Math.cos(h.tilt) * K.HAT_UP * (0.92 + 0.08 * squash), rot: h.tilt + K.HAT_TILT, scale: 1 };
  }
  // the target for a jump: the top of the hat
  function hatBox(B) {
    const c = hat(B);
    return { l: c.x - K.HAT_L, r: c.x + K.HAT_R, top: c.y - K.HAT_TOP, bottom: c.y + 12 };
  }
  // where the arms leave the head, turned with the lean
  function root(h) {
    const dx = K.ROOT_DX * h.rx, dy = K.ROOT_DY * h.ry, c = Math.cos(h.tilt), s = Math.sin(h.tilt);
    return { x: h.x + dx * c - dy * s, y: h.y + dx * s + dy * c };
  }

  // ---------- the poses of the striking arm ----------
  // raised over the target: the arm arches up out of the picture and its tip hangs down over the deck
  function slamHover(tx, rt, t) {
    const w = Math.sin(t * 5.2) * 6, v = Math.sin(t * 3.1) * 5;
    return pose(tx + w, K.HOVER_Y + v, tx + 6, K.HOVER_Y - 190, rt.x - 90, rt.y - 400, rt.x, rt.y, K.TIP_R + 2, K.ROOT_R);
  }
  // struck: the tip lies on the deck, the arm rises in an arch to the head (its suckers are the steps up)
  function slamStuck(tx, deck, rt, wig) {
    const w = wig || 0;
    return pose(tx, deck - K.TIP_R + 3, lerp(tx, rt.x, 0.5), deck - K.TIP_R - 6 + w, rt.x - 8, rt.y - K.ARCH - w * 2, rt.x, rt.y, K.TIP_R, K.ROOT_R);
  }
  // out of the way: the tip curls down into the water beside the head
  function tucked(rt) {
    return pose(rt.x - 30, K.SURF + 70, rt.x - 70, K.SURF + 10, rt.x - 30, rt.y + 30, rt.x, rt.y, K.TIP_R, K.ROOT_R);
  }
  // the sweeping arm hangs from high above the left edge; only its tip brushes over the deck, the rest rises steeply
  function sweep(sx, deck, lift) {
    const ax = K.SWEEP_ANCHOR_X + sx * 0.35, ay = K.SWEEP_ANCHOR_Y;
    return pose(sx, deck - 14 - lift, sx - 6, deck - 150 - lift * 0.4, ax + 260, ay + 170, ax, ay, 13, 36);
  }
  // an arm from below: u = 0 hidden at the sea floor, 1 fully up over the water at bx
  function below(bx, surf, u) {
    const top = lerp(K.FLOOR + 30, surf - K.BELOW_UP, u), curl = 16 * u;
    return pose(bx - curl, top, bx + 18, top + 34, bx - 8, (top + K.FLOOR) / 2 + 30, bx + 6, K.FLOOR + 60, 9, 26);
  }

  // ---------- sampling (one shared buffer: drawing and tests run one after the other) ----------
  const N = K.SAMPLES, SX = new Float32Array(N + 1), SY = new Float32Array(N + 1), SR = new Float32Array(N + 1), NX = new Float32Array(N + 1), NY = new Float32Array(N + 1);
  const tmp = [0, 0], tan = [0, 0];
  // fills the buffer with centres, radii and normals (to the left of the way from tip to root); returns the buffer
  function sample(ps) {
    for (let i = 0; i <= N; i++) {
      const k = i / N; bez(ps.P, k, tmp); bezTan(ps.P, k, tan);
      const d = Math.hypot(tan[0], tan[1]) || 1;
      SX[i] = tmp[0]; SY[i] = tmp[1]; SR[i] = radius(ps, k); NX[i] = -tan[1] / d; NY[i] = tan[0] / d;
    }
    return { x: SX, y: SY, r: SR, nx: NX, ny: NY, n: N };
  }
  // the top of the arm at k (where Mimo stands on a sucker)
  function topAt(ps, k) {
    bez(ps.P, k, tmp); bezTan(ps.P, k, tan);
    const d = Math.hypot(tan[0], tan[1]) || 1, r = radius(ps, k) * 0.9;
    let nx = -tan[1] / d, ny = tan[0] / d;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return { x: tmp[0] + nx * r, y: tmp[1] + ny * r };
  }
  // the steps of a stuck arm: one sucker every STEP_RISE up the rising side, the last one at the highest point
  function stepsOf(ps, deck) {
    const out = [], M = 60;
    let best = { k: 0, y: Infinity };
    for (let i = 0; i <= M; i++) { const k = i / M, q = topAt(ps, k); if (q.y < best.y) best = { k, y: q.y }; }
    let next = deck - K.STEP_RISE, lastX = Infinity;
    for (let i = 0; i <= M; i++) {
      const k = i / M; if (k >= best.k) break;
      const q = topAt(ps, k);
      if (q.y <= next || (q.y < deck - 16 && q.x - lastX >= K.STEP_GAP)) { out.push(k); next = q.y - K.STEP_RISE; lastX = q.x; }
      if (lastX === Infinity && q.y <= next + K.STEP_RISE - 16) lastX = q.x - K.STEP_GAP;
    }
    const last = out.length ? topAt(ps, out[out.length - 1]).y : deck;
    if (best.y < last - 10) out.push(best.k); else if (out.length) out[out.length - 1] = best.k;
    return out;
  }
  // the highest point of an arm (k), where the tip side ends: only that side comes down on the deck
  function peakK(ps) {
    let best = 0, by = Infinity;
    for (let i = 0; i <= 40; i++) { const k = i / 40, q = topAt(ps, k); if (q.y < by) { by = q.y; best = k; } }
    return best;
  }
  // where on the deck the tip side comes down low enough to hurt someone standing there (the shadow covers exactly this)
  function lowSpan(ps, deck, reach, kMax) {
    const s = sample(ps), iMax = Math.ceil((kMax == null ? 1 : kMax) * s.n); let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i <= iMax; i++) if (s.y[i] + s.r[i] > deck - reach) { x0 = Math.min(x0, s.x[i] - s.r[i]); x1 = Math.max(x1, s.x[i] + s.r[i]); }
    return x0 <= x1 ? { x0, x1 } : null;
  }
  // does any circle of the arm between k0 and k1 (and, if given, lower than yMin) touch Mimo's box (3 px of mercy, like the thorns)
  function touches(ps, p, k0, k1, shrink, yMin) {
    const s = sample(ps), i0 = Math.floor((k0 || 0) * s.n), i1 = Math.ceil((k1 == null ? 1 : k1) * s.n), m = shrink || 0.85;
    for (let i = i0; i <= i1; i++) {
      const cx = s.x[i], cy = s.y[i], r = s.r[i] * m;
      if (yMin != null && cy < yMin) continue;
      const nx = clamp(cx, p.x + 3, p.x + p.w - 3), ny = clamp(cy, p.y + 3, p.y + p.h - 3);
      if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r) return true;
    }
    return false;
  }

  window.MimoKrake = Object.assign(window.MimoKrake || {}, {
    K, lerp, clamp, ease, bez, pose, mix, radius, head, hat, hatBox, root,
    slamHover, slamStuck, tucked, sweep, below, sample, topAt, stepsOf, peakK, lowSpan, touches,
  });
})();
