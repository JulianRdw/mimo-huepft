// World 4 rig core: the maths of the jointed family figures (2D matrices, springs, keyframe tracks, limb curves, tubes) and
// the walk/run gait cycles. Ported unchanged from the Bad Nenndorf branch (src/nenndorf/figuren/rig-math.js, gait.js);
// only the registration differs: everything is shared through window.MimoCoast (RigMath, FamilyGait).
// Pure maths, no document and no Image at load time.
(function () {
  'use strict';
  window.MimoCoast = window.MimoCoast || {};
  const RigMath = (function () {

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const SPRING_STEP = 1 / 240;

  // ------------------------------------------------------------ 2D affine matrices [a b c d e f]
  const M = {
    id: () => [1, 0, 0, 1, 0, 0],
    mul: (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ],
    tr: (x, y) => [1, 0, 0, 1, x, y],
    rot: (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0],
    sc: (sx, sy) => [sx, 0, 0, sy, 0, 0],
    apply: (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]],
  };
  const about = (m, p) => M.mul(M.tr(p[0], p[1]), M.mul(m, M.tr(-p[0], -p[1])));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // Cubic curve through the shoulder towards the elbow and on to the wrist; the elbow becomes a soft bend.
  function armCurve(S, E, W, k = 0.74) {
    const c1 = lerpP(S, E, k), c2 = lerpP(W, E, k);
    return (t) => {
      const u = 1 - t;
      return [
        u * u * u * S[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * W[0],
        u * u * u * S[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * W[1],
      ];
    };
  }
  function curveNormal(curve, t) {
    const a = curve(Math.max(0, t - 0.01)), b = curve(Math.min(1, t + 0.01));
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  }
  function pointNormal(pts, i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  }
  function offsetPoint(pts, i, o) { const n = pointNormal(pts, i); return [pts[i][0] + n[0] * o, pts[i][1] + n[1] * o]; }
  // Tube along points with per-point width: one outline around the whole shape, round ends unless caps = false.
  function tube(ctx, pts, widths, fill, stroke, outline, caps = true) {
    const [capStart, capEnd] = Array.isArray(caps) ? caps : [caps, caps];
    const n = pts.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const nr = pointNormal(pts, i), h = widths[i] / 2;
      left.push([pts[i][0] + nr[0] * h, pts[i][1] + nr[1] * h]);
      right.push([pts[i][0] - nr[0] * h, pts[i][1] - nr[1] * h]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    const nE = pointNormal(pts, n - 1), aE = Math.atan2(nE[1], nE[0]);
    if (capEnd) ctx.arc(pts[n - 1][0], pts[n - 1][1], widths[n - 1] / 2, aE, aE - Math.PI, true);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    const n0 = pointNormal(pts, 0), a0 = Math.atan2(n0[1], n0[0]);
    if (capStart) ctx.arc(pts[0][0], pts[0][1], widths[0] / 2, a0 + Math.PI, a0, true);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; ctx.lineWidth = outline * 2; ctx.stroke();
    ctx.fillStyle = fill; ctx.fill();
  }

  const ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
  };

  // Damped spring (second order). freq in Hz, zeta < 1 overshoots.
  class Spring {
    constructor(value, freq, zeta) { this.x = value; this.v = 0; this.freq = freq; this.zeta = zeta; }
    step(target, dt) {
      const w = TAU * this.freq;
      let left = dt;
      while (left > 1e-6) {
        const h = Math.min(SPRING_STEP, left);
        this.v += (w * w * (target - this.x) - 2 * this.zeta * w * this.v) * h;
        this.x += this.v * h;
        left -= h;
      }
      return this.x;
    }
  }

  // Keyframe track: [[time, value, easeName?], ...], eases apply to the segment ending at that key.
  function track(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        return lerp(v0, v1, (ease[e] || ease.inOut)((t - t0) / (t1 - t0)));
      }
    }
    return keys[keys.length - 1][1];
  }

  return { TAU, DEG, M, about, clamp, lerp, lerpP, armCurve, curveNormal, pointNormal, offsetPoint, tube, ease, Spring, track };

  })();
  const FamilyGait = (function () {

  const WALK_SPEED = 36;   // 1.2 m/s
  const RUN_SPEED = 100;   // 3.3 m/s
  const ACCEL = 240;       // px/s², how fast the figure speeds up or slows down
  const AIR_ACCEL = 90;
  const GRAVITY = 1100;
  const JUMP_SPEED = 205;  // gives about 19 px (0.65 m) of height
  const CROUCH_TIME = 0.12;
  const LAND_TIME = 0.2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // 0 = walking pace or slower, 1 = full run
  const runBlend = (speed) => clamp((Math.abs(speed) - WALK_SPEED) / (RUN_SPEED - WALK_SPEED), 0, 1);
  // distance covered by one full cycle (two steps)
  const cycleLength = (speed) => lerp(40, 70, runBlend(speed));

  // One leg at phase u: stance (foot on the ground, sliding back under the body) then swing (lifted, forward).
  // fwd: -1 (behind) .. 1 (in front), lift: 0..1
  function leg(u) {
    const v = ((u % 1) + 1) % 1;
    if (v < 0.5) return { fwd: 1 - 4 * v, lift: 0, swing: 0 };
    const s = (v - 0.5) * 2;
    return { fwd: -1 + 2 * easeInOut(s), lift: Math.sin(Math.PI * s), swing: s };
  }

  // Whole-body values for the cycle at phase u and blend r (0 walk, 1 run).
  function cycle(u, r) {
    const left = leg(u), right = leg(u + 0.5);
    const walkBob = 0.55 * Math.cos(4 * Math.PI * u);    // low at heel strike, high at mid stance
    const runBob = -1.7 * Math.cos(4 * Math.PI * u);     // low at mid stance, high in the flight phase
    return {
      left, right,
      bob: lerp(walkBob, runBob, r),
      stride: lerp(9.5, 17, r) / 2,                       // foot travel either side of the hip
      lift: lerp(2.6, 6.5, r),
      lean: lerp(2.5, 9, r),                              // degrees, into the direction of travel
      armSwing: lerp(20, 42, r),
      elbow: lerp(12, 78, r),
      sink: lerp(0.6, 1.8, r),                            // pelvis sits a little lower while moving
      sway: 0.35 * Math.sin(2 * Math.PI * u),             // pelvis shifts over the standing leg
    };
  }

  return {
    WALK_SPEED, RUN_SPEED, ACCEL, AIR_ACCEL, GRAVITY, JUMP_SPEED, CROUCH_TIME, LAND_TIME,
    runBlend, cycleLength, cycle,
  };

  })();
  Object.assign(window.MimoCoast, { RigMath, FamilyGait });
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
