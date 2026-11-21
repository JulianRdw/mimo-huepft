// World 5 boss "Drache Fauch": the arena and the shape of the dragon as pure functions of the fight state.
// The fight (volcano-boss.js), the scenes (volcano-boss-scenes.js), the picture (volcano-boss-draw.js) and the test bot
// (volcano-boss-bot.js) all read the numbers here, so what is drawn is what burns, carries or gets wet.
//
// The arena is a crater shaft, 26 x 47 tiles: three floors ("Stockwerke", one screen tall each) on top of each other and
// the crater rim above. Every phase is fought on its own floor; between the phases the eruption pushes the fight one
// floor up. All three floors share one layout, seen from the side where Fauch rests ("u" runs from the far wall to the
// rest wall), so the second floor is the first one mirrored:
//   F  the floor ledge (row 10), where Mimo starts         C  the chin rock (rows 8-10) at the rest wall
//   L1 a ledge at the far wall (row 8)                     L2 a board above it (row 6)
//   V  the valve ledge (row 4) with the lever; only Fauch's resting head is a step up to it.
// Nothing here touches document or canvas at load time (the level tools run the world files in Node).
(function () {
  'use strict';
  const T = 32, COLS = 26, ROWS = 47, W = COLS * T;

  // ---------- the floors ----------
  // top: first row; side: the wall where Fauch rests (1 right, -1 left); fa: first u-column of the floor ledge;
  // cam: camera height while this floor is fought; lava: start, highest point (px under the floor top) and speed (px/s)
  const SEC = Object.freeze([
    { top: 34, side: 1, fa: 5, cam: 34 * T, lava: { start: 11 * T + 20, cap: 10 * T + 10, speed: 2 }, spawnU: 9 },
    { top: 22, side: -1, fa: 8, cam: 22 * T, lava: { start: 11 * T + 20, cap: 10 * T + 8, speed: 3 }, spawnU: 15 },
    { top: 10, side: 1, fa: 7, cam: 9.5 * T, lava: { start: 11 * T + 20, cap: 8 * T + 12, speed: 2.5 }, spawnU: 10 },
  ].map(Object.freeze));
  // the crater rim (row), the left rim ends at column RIM_L, the right one starts at RIM_R; open sky above it, so the
  // eruption at the end has room to shoot Mimo up high
  const RIM = 9, RIM_L = 4, RIM_R = 20;
  const DOOR = Object.freeze({ x: 24, y: RIM - 1 }); // the door after the fight, on the right rim
  // rows inside a floor and u-columns (counted from the far wall) of the layout
  const R = Object.freeze({ F: 10, C: 8, L1: 8, L2: 6, V: 4 });
  const U = Object.freeze({ C0: 18, C1: 23, L10: 2, L11: 5, L20: 2, L21: 7, V0: 13, V1: 17, F1: 17 });

  const secY = (s, r) => (SEC[s].top + r) * T;           // top of row r of floor s in world px
  const realX = (s, u) => (SEC[s].side > 0 ? u : W - u); // u (px from the far side) to world x
  const realCol = (s, c) => (SEC[s].side > 0 ? c : COLS - 1 - c);
  const uOf = (s, x) => (SEC[s].side > 0 ? x : W - x);

  // ---------- the map ----------
  // "!" is an invisible wall (above the rim), "-" a board, "H" hot stone, "I" basalt, "C" crystals (decoration)
  function buildMap() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) rows.push(new Array(COLS).fill(' '));
    for (let y = 0; y < RIM; y++) { rows[y][0] = '!'; rows[y][COLS - 1] = '!'; }
    for (let x = 0; x < COLS; x++) if (x <= RIM_L || x >= RIM_R) rows[RIM][x] = '#';
    for (let y = RIM + 1; y < ROWS; y++) for (const x of [0, 1, COLS - 2, COLS - 1]) rows[y][x] = '#';
    // a floor under the lava, out of the picture: who falls in sinks onto it instead of falling out of the arena
    for (let x = 0; x < COLS; x++) rows[ROWS - 1][x] = '#';
    SEC.forEach((sec, s) => {
      const put = (r, c, ch) => { rows[sec.top + r][realCol(s, c)] = ch; };
      for (let c = sec.fa; c <= U.F1; c++) put(R.F, c, '#');
      for (let r = R.C; r <= R.F; r++) for (let c = U.C0; c <= U.C1; c++) put(r, c, '#');
      for (let c = U.L10; c <= U.L11; c++) put(R.L1, c, '#');
      for (let c = U.L20; c <= U.L21; c++) put(R.L2, c, '-');
      for (let c = U.V0; c <= U.V1; c++) put(R.V, c, '#');
    });
    // floor 2: its floor ledge in front of the chin rock is the valve ledge of floor 1, pushed up by the eruption
    // (arena() places it); its far ledge is a row of basalt columns
    for (let c = 8; c <= 12; c++) rows[SEC[1].top + R.F][realCol(1, c)] = ' ';
    for (let c = U.L10; c <= U.L11; c++) { rows[SEC[1].top + R.L1][realCol(1, c)] = 'I'; rows[SEC[1].top + R.L1 + 1][realCol(1, c)] = 'I'; }
    // floor 3: the free part of the chin rock is hot, nobody waits there
    rows[SEC[2].top + R.C][realCol(2, U.C0)] = 'H';
    // a little decoration on ledges where nobody needs to stand
    rows[SEC[0].top + R.L1 - 1][realCol(0, U.L10)] = 'C';
    rows[SEC[2].top + R.L1 - 1][realCol(2, U.L10)] = 'C';
    rows[SEC[0].top + R.F - 1][realCol(0, SEC[0].spawnU)] = 'P';
    rows[RIM - 1][2] = 'Y'; rows[RIM - 1][22] = 'C';
    return rows.map((r) => r.join(''));
  }
  const MAP = Object.freeze(buildMap());
  // the cells of the pushed-up ledge on floor 2 (they arrive in the first scene)
  const SLAB = Object.freeze({ c0: realCol(0, U.V0), c1: realCol(0, U.V1), fromRow: SEC[0].top + R.V, toRow: SEC[1].top + R.F });

  // ---------- the head ----------
  // centre of the skull; f = facing (-1 looks left). The snout points to f, horns at the back.
  const HEAD = Object.freeze({
    RX: 62, RY: 42,                    // skull half width and half height
    SNOUT: 112, SNOUT_TOP: 12, SNOUT_BOT: 36, // the snout reaches this far forward, its top and bottom under the centre
    MOUTH_X: 104, MOUTH_Y: 16,         // where the fire leaves the mouth
    SKULL_A: -50, SKULL_B: 14,         // the skull top as a step: from SKULL_A to SKULL_B (forward is negative)
    STEP_A: -108, STEP_B: -64,         // the snout top as a step
    REST_U: 720,                       // the resting head's centre (u), its jaw lies on the chin rock
    WALL_IN: 56,                       // a breathing head clings to the wall this far in
  });
  // the resting head of floor s (centre and facing)
  function restPose(s) { const sec = SEC[s]; return { x: realX(s, HEAD.REST_U), y: secY(s, R.C) - HEAD.RY + 2, f: -sec.side }; }
  // the head breathing fire from wall side `side` over a ledge whose top is at feet y
  function breathPose(side, feetY) { return { x: side > 0 ? W - 2 * T - HEAD.WALL_IN : 2 * T + HEAD.WALL_IN, y: feetY - 26 - HEAD.MOUTH_Y, f: -side }; }
  // waiting between two attacks: high in the shaft, towards the far side
  function lurkPose(s) { const sec = SEC[s]; return { x: realX(s, 300), y: secY(s, 2.6), f: sec.side }; }
  const mouth = (h) => ({ x: h.x + h.f * HEAD.MOUTH_X, y: h.y + HEAD.MOUTH_Y });

  // ---------- the fire ----------
  // a breath covers a band of the shaft: everyone whose box reaches into [feet - BAND_UP, feet + BAND_DOWN] (3 px of
  // mercy, like the thorns) from the mouth to the far wall. Ledges two rows apart are outside the band.
  const FIRE = Object.freeze({ BAND_UP: 50, BAND_DOWN: 2, MERCY: 3 });
  function fireHits(p, h, feetY, len) {
    const m = mouth(h), x0 = h.f < 0 ? m.x - len : h.x - HEAD.RX, x1 = h.f < 0 ? h.x + HEAD.RX : m.x + len;
    return p.x + p.w - FIRE.MERCY > x0 && p.x + FIRE.MERCY < x1 && p.y + FIRE.MERCY < feetY + FIRE.BAND_DOWN && p.y + p.h - FIRE.MERCY > feetY - FIRE.BAND_UP;
  }
  // how long the flame of a head at h has to be to reach the far wall
  const fireReach = (h) => (h.f < 0 ? mouth(h).x - 2 * T : W - 2 * T - mouth(h).x);

  // ---------- the shower and the lever ----------
  const SHOWER = Object.freeze({ SPOUT_U: 702, PIPE_R: 1.45, LEVER_U: 556, LEVER_HALF: 14 });
  const spout = (s) => ({ x: realX(s, SHOWER.SPOUT_U), y: secY(s, SHOWER.PIPE_R) + 14 });
  const lever = (s) => ({ x: realX(s, SHOWER.LEVER_U), y: secY(s, R.V) });

  // ---------- the body: a Catmull-Rom spline from the tail in the lava to the head ----------
  const BODY_N = 56;
  const BX = new Float32Array(BODY_N + 1), BY = new Float32Array(BODY_N + 1), BR = new Float32Array(BODY_N + 1);
  const BNX = new Float32Array(BODY_N + 1), BNY = new Float32Array(BODY_N + 1);
  const KX = new Float32Array(8), KY = new Float32Array(8), K2X = new Float32Array(8), K2Y = new Float32Array(8);
  // the control points: the tail comes out of the lava on the side away from the head, climbs that wall, arches over the
  // top of the floor and comes down behind the head (u for a head at the rest wall; mirrored while it is at the far wall)
  const COIL = [[280, 90], [104, 9.2], [236, 3.4], [548, 0.9]];
  let arch = 1;                        // 1: the arch for a head at the rest wall, 0: mirrored (read by the picture)
  function coils(s, h, lavaY, t, ox, oy) {
    const sw = Math.sin(t * 0.7), sw2 = Math.sin(t * 0.9 + 1), top = SEC[s].top * T, w = ease(clamp((uOf(s, h.x) - 200) / 420, 0, 1));
    const at = (i, du) => realX(s, lerp(W - COIL[i][0] - du, COIL[i][0] + du, w));
    arch = w;
    ox[0] = at(0, sw * 10); oy[0] = lavaY + COIL[0][1];
    ox[1] = at(1, sw * 12); oy[1] = top + COIL[1][1] * T;
    ox[2] = at(2, 0); oy[2] = top + COIL[2][1] * T + sw2 * 10;
    ox[3] = at(3, sw2 * 14); oy[3] = top + COIL[3][1] * T - sw * 6;
  }
  // w blends the coils from floor s to floor s2 (the eruption scenes move the dragon up a floor)
  function bodyKnots(s, h, lavaY, t, s2, w) {
    coils(s, h, lavaY, t, KX, KY);
    if (s2 != null && w > 0) { const a = arch; coils(s2, h, lavaY, t, K2X, K2Y); arch = lerp(a, arch, w); for (let i = 0; i < 4; i++) { KX[i] += (K2X[i] - KX[i]) * w; KY[i] += (K2Y[i] - KY[i]) * w; } }
    // the neck: from above and behind the head down into it (h.nk -1), or from below while he rises (h.nk 1)
    const nk = h.nk == null ? -1 : h.nk;
    KX[4] = h.x - h.f * 64; KY[4] = h.y + 74 * nk;
    KX[5] = h.x - h.f * 40; KY[5] = h.y + 16 * nk;
    KX[6] = h.x - h.f * 6; KY[6] = h.y + 8;
    return 7;
  }
  function catmull(p0, p1, p2, p3, k) {
    const k2 = k * k, k3 = k2 * k;
    return 0.5 * (2 * p1 + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k2 + (-p0 + 3 * p1 - 3 * p2 + p3) * k3);
  }
  // fills the shared buffers with centre points, radii and normals of the body; returns them (read right away)
  function body(s, h, lavaY, t, s2, w) {
    const n = bodyKnots(s, h, lavaY, t, s2, w), segs = n - 1;
    for (let i = 0; i <= BODY_N; i++) {
      const g = i / BODY_N * segs, j = Math.min(segs - 1, Math.floor(g)), k = g - j;
      const a = Math.max(0, j - 1), d = Math.min(n - 1, j + 2);
      BX[i] = catmull(KX[a], KX[j], KX[j + 1], KX[d], k); BY[i] = catmull(KY[a], KY[j], KY[j + 1], KY[d], k);
      const q = i / BODY_N; BR[i] = q < 0.5 ? 13 + 15 * Math.sin(q / 0.5 * Math.PI / 2) : 28 - 6 * (q - 0.5) / 0.5;
    }
    for (let i = 0; i <= BODY_N; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(BODY_N, i + 1), dx = BX[i1] - BX[i0], dy = BY[i1] - BY[i0], d = Math.hypot(dx, dy) || 1;
      BNX[i] = -dy / d; BNY[i] = dx / d;
    }
    BODY_OUT.arch = arch;
    return BODY_OUT;
  }
  const BODY_OUT = { x: BX, y: BY, r: BR, nx: BNX, ny: BNY, n: BODY_N, arch: 1 };

  // ---------- small maths ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = (k) => k * k * (3 - 2 * k);

  window.MimoFauch = Object.assign(window.MimoFauch || {}, {
    T, COLS, ROWS, W, SEC, RIM, RIM_L, RIM_R, DOOR, R, U, MAP, SLAB, HEAD, FIRE, SHOWER,
    secY, realX, realCol, uOf, restPose, breathPose, lurkPose, mouth, fireHits, fireReach, spout, lever, body, lerp, clamp, ease,
  });
})();
