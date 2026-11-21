// Garden party (see garden-base.js): the four small pranks, each a little cartoon of its own.
//   62-75    Ketchup: Julian takes a bun and the ketchup bottle, nothing comes, he shakes it, peeks into the nozzle, turns
//            it away, bun in his mouth, squeezes with both hands: SPLATSCH, right into Naike's live report. She wipes a
//            stripe off her face, tastes it: "Zurück ins Studio." Julian's bun drops, Lotta fetches it.
//   106-120  Water bomb: Ulrike films the gull, Mats fishes a water bomb out of the bucket under the table, tiptoes over,
//            winds up, throws: Platsch! "Na warte!", the chase out on the right; Mats strolls back in from the left,
//            whistling, Ulrike comes after him dripping and looks everywhere but at him.
//   121-132  Chair: Christof dozes standing up, wakes, yawns, stretches, goes to the folding chair; Julian tiptoes up behind
//            it, Christof lowers himself, the chair is gone, he hangs in the air for a beat: Plumps! Julian whistles and
//            puts the chair back ("Bitte schön!"), Christof: "Ich steh lieber."
//   133-141  Ice: Naike's revenge. An ice cube from her lemonade, she tiptoes behind Julian, drops it down his collar; a
//            beat, then he jumps and hops about wildly until the cube falls out at the bottom of his shirt.
// The gestures are clips of their own on the loop clock (rigClip below): every arm, lean and dip is keyed to the loop
// time, so the timing is exact and a jump in the loop shows the same picture. The props in hand (bottle, bun, water bomb,
// ice cube, the chair) are drawn here at the hands of the figures.
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;
  const MC = window.MimoCoast || {}, ACT = MC.FamilyActions, CP = MC.castPoses;
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);           // 0..1 over [a, b]
  const bump = (t, a, b) => (t > a && t < b ? Math.sin((t - a) / (b - a) * Math.PI) : 0);
  let NOW = 0;                                                       // the loop time the clips run on (set every frame)

  // ---------- puppet clips on the loop clock ----------
  // A pose: { lh, rh: [x, y] where a hand goes (garden units from the feet, y up is negative; two-bone IK), or l, r:
  // [upper, fore] arm angles in screen degrees (0 = down, 90 = towards the right of the picture), torso, head (degrees),
  // bounce (up), shift, feet { l, r, ly, ry, lz, rz }, brow, beam, shrug } or a function (t, s) -> pose, or null = at rest.
  // Keys [[t, pose, ease], ...]: the pose is reached at t. The 'l' arm is the figure's left (on the right of the picture).
  function ik(rig, k, T, lift, shift, tor) {
    const sh = rig.shoulders[k === 'l' ? 'left' : 'right'], hipY = rig.hip[1] - rig.ground, a = rig.arm.upper, b = rig.arm.fore + rig.arm.handReach;
    const sx = sh[0] - rig.center, sy = sh[1] - rig.ground - hipY, r = tor * Math.PI / 180;
    const S = [Math.cos(r) * sx - Math.sin(r) * sy + shift, Math.sin(r) * sx + Math.cos(r) * sy + hipY - lift];
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.max(1e-3, Math.hypot(dx, dy)), dm = clamp(d, Math.abs(a - b) + 0.05, a + b - 0.05);
    const th = Math.atan2(dx, dy), al = Math.acos(clamp((a * a + dm * dm - b * b) / (2 * a * dm), -1, 1)), out = k === 'l' ? 1 : -1;
    let best = null;
    for (const sg of [1, -1]) { const u = th + sg * al, ex = S[0] + Math.sin(u) * a; if (!best || ex * out > best.ex * out) best = { u, ex, ey: S[1] + Math.cos(u) * a }; }
    const hx = S[0] + dx * dm / d, hy = S[1] + dy * dm / d, f = Math.atan2(hx - best.ex, hy - best.ey), deg = 180 / Math.PI;
    return [best.u * deg + tor, f * deg + tor];   // the rig turns the arms with the torso: undo that
  }
  const N = 21;   // lu lf ru rf torso head bounce shift fl fr fly fry flz frz brow beam shrug
  function evalPose(p, t, s) {
    if (typeof p === 'function') p = p(t, s);
    p = p || {};
    const lift = p.bounce || 0, shift = p.shift || 0, tor = p.torso != null ? p.torso : s.torsoRot, f = p.feet || {};
    const arm = (k) => p[k + 'h'] ? ik(s.rig, k, p[k + 'h'], lift, shift, tor) : p[k] ? p[k] : (k === 'l' ? [s.arm.l.upper, s.arm.l.fore] : [-s.arm.r.upper, -s.arm.r.fore]);
    const L = arm('l'), R = arm('r');
    return [L[0], L[1], R[0], R[1], tor, p.head != null ? p.head : s.headTilt, lift, shift, f.l || 0, f.r || 0, f.ly || 0, f.ry || 0, f.lz || 0, f.rz || 0, p.brow ? 1 : 0, p.beam ? 1 : 0, p.shrug || 0];
  }
  function rigClip(name, keys, extra) {
    if (!ACT || !CP) return;
    ACT[name] = (w, s) => {
      const t = NOW;
      let i = 0;
      while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
      let v = evalPose(keys[i][1], t, s);
      if (i < keys.length - 1 && t > keys[i][0]) {
        const B = keys[i + 1], e = G.ease[B[2] || 'io'](seg(t, keys[i][0], B[0])), vb = evalPose(B[1], t, s);
        v = v.map((x, j) => x + (vb[j] - x) * e);
      }
      const out = {
        arms: { l: { upper: v[0], fore: v[1] }, r: { upper: -v[2], fore: -v[3] } }, torsoRot: v[4], headTilt: v[5], bounce: v[6], shiftX: v[7],
        feet: { l: v[8], r: v[9], ly: v[10], ry: v[11], lz: v[12], rz: v[13] }, brow: v[14] > 0.5, beam: v[15] > 0.5, shrug: v[16],
        done: t >= keys[keys.length - 1][0] || t < keys[0][0] - 1,
      };
      if (extra) Object.assign(out, extra(t, s));
      return out;
    };
    CP[name] = { act: name, loop: [0, 1e6] };
  }
  // where a hand of figure k is now (world units), with its hop
  const handAt = (A, k, side) => { const h = A.hand(k, side); return [h[0], h[1] - (k.hop || 0)]; };
  const headAt = (A, k) => { const h = A.head(k); return [h[0], h[1] - (k.hop || 0)]; };
  const look = (k, x) => x - k.x;

  // ---------- drawing the props ----------
  function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  // the ketchup bottle around its middle, a = angle (0 = nozzle up), sq = how hard it is squeezed (0..1); returns the nozzle
  function bottle(c, x, y, a, sq, pal) {
    const w = 4.6 * (1 - 0.22 * sq), h = 9 * (1 + 0.05 * sq);
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = pal.ketchup; c.strokeStyle = '#9E2A23'; c.lineWidth = 0.5; rrect(c, -w / 2, -h / 2, w, h, 1.7); c.fill(); c.stroke();
    c.fillStyle = '#FFF3D6'; c.fillRect(-w / 2 + 0.7, -0.4, w - 1.4, 2.4);
    c.fillStyle = '#F7F3EA'; c.beginPath(); c.moveTo(-1.4, -h / 2); c.lineTo(-0.6, -h / 2 - 2.6); c.lineTo(0.6, -h / 2 - 2.6); c.lineTo(1.4, -h / 2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-w / 2 + 0.8, -h / 2 + 1, 0.8, h - 3);
    c.restore();
    return [x + Math.sin(a) * (h / 2 + 2.6), y - Math.cos(a) * (h / 2 + 2.6)];
  }
  function bun(c, x, y, a) {
    c.save(); c.translate(x, y); c.rotate(a || 0);
    c.fillStyle = '#E2A766'; c.strokeStyle = '#B07A45'; c.lineWidth = 0.4;
    c.beginPath(); c.ellipse(0, 0.6, 4.4, 1.7, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#C9725A'; c.beginPath(); c.ellipse(0, -0.5, 5.4, 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = '#E9A08A'; c.beginPath(); c.ellipse(-0.8, -0.9, 3, 0.35, 0, 0, TAU); c.fill();
    c.fillStyle = '#EDBE84'; c.beginPath(); c.ellipse(0, -1.1, 4.0, 1.0, 0, Math.PI, TAU); c.fill(); c.stroke();
    c.restore();
  }
  function balloon(c, x, y, wob, r) {
    r = r || 3.3;
    c.save(); c.translate(x, y);
    c.fillStyle = '#3E87B5'; c.beginPath(); c.moveTo(-0.6, 0); c.lineTo(0, -1); c.lineTo(0.6, 0); c.closePath(); c.fill();
    c.translate(0, -1 - r); c.scale(1 + wob * 0.12, 1 - wob * 0.12);
    c.fillStyle = '#7FC7EE'; c.strokeStyle = '#3E87B5'; c.lineWidth = 0.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 0.7; c.lineCap = 'round'; c.beginPath(); c.arc(-0.6, -0.6, r * 0.55, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
    c.restore();
  }
  function cube(c, x, y, a, s) {
    s = s == null ? 1 : s;
    if (s <= 0.02) return;
    c.save(); c.translate(x, y); c.rotate(a || 0); c.scale(s, s);
    c.fillStyle = 'rgba(228,246,253,0.95)'; c.strokeStyle = '#7FB6D2'; c.lineWidth = 0.5; rrect(c, -1.9, -1.9, 3.8, 3.8, 0.8); c.fill(); c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 0.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-1.1, -1.0); c.lineTo(0.3, -1.0); c.stroke();
    c.restore();
  }
  function sparkle(c, x, y, k) {
    if (k <= 0) return;
    c.save(); c.translate(x, y); c.rotate(k * 2); c.strokeStyle = '#FFFFFF'; c.lineWidth = 0.6; c.globalAlpha = Math.min(1, k);
    c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(Math.cos(a) * 1.0, Math.sin(a) * 1.0); c.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } c.stroke();
    c.restore();
  }
  // music notes floating up from (x, y) while t is in [a, b]
  function notes(c, x, y, t, a, b, now, pal) {
    if (t < a || t > b) return;
    c.save(); c.fillStyle = pal.ink; c.strokeStyle = pal.ink; c.lineWidth = 0.55;
    for (let i = 0; i < 3; i++) {
      const k = ((t - a) * 0.8 + i / 3) % 1, fade = Math.min(1, (b - t) / 0.3, (t - a) / 0.3);
      const nx = x + 3 + k * 9 + Math.sin(k * 6 + i) * 1.5, ny = y - 2 - k * 13;
      c.globalAlpha = Math.sin(k * Math.PI) * fade;
      c.beginPath(); c.ellipse(nx, ny, 1.1, 0.8, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(nx + 1, ny); c.lineTo(nx + 1, ny - 4); c.lineTo(nx + 2.6, ny - 3.2); c.stroke();
    }
    c.restore();
  }
  // water drops from a wet person: falling from the head and hair, a puddle at the feet
  function drips(c, h, x, y, k, now, pal) {
    if (k <= 0) return;
    c.save(); c.fillStyle = pal.water;
    for (let i = 0; i < 7; i++) { const q = (now * 1.3 + i * 0.37) % 1, dx = -8 + i * 2.7; c.globalAlpha = 0.9 * k * (1 - q * 0.6); c.beginPath(); c.ellipse(h[0] + dx, h[1] - 1 + q * (y - h[1] - 2), 0.8, 1.4, 0, 0, TAU); c.fill(); }
    c.globalAlpha = 0.4 * k; c.beginPath(); c.ellipse(x, y + 0.5, 9 + 5 * k, 1.8, 0, 0, TAU); c.fill();
    // the wet hair: a sheen and a few streaks
    c.globalAlpha = 0.35 * k; c.beginPath(); c.ellipse(h[0], h[1] - 4, 9, 6.5, 0, Math.PI, TAU); c.fill();
    c.globalAlpha = 0.6 * k; c.strokeStyle = '#FFFFFF'; c.lineWidth = 0.6; c.lineCap = 'round';
    c.beginPath(); c.arc(h[0] - 1, h[1] - 3, 6.5, Math.PI * 1.15, Math.PI * 1.4); c.stroke();
    c.restore();
  }
  function dust(c, x, y, k, pal) {
    if (k <= 0 || k >= 1) return;
    c.save(); c.fillStyle = pal.sand;
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, r = 4 + k * 16; c.globalAlpha = (1 - k) * 0.8; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35 - k * 2, 2.6 + k * 3, 0, TAU); c.fill(); }
    c.restore();
  }
  function stars(c, x, y, now, f) {
    if (f <= 0) return;
    for (let i = 0; i < 3; i++) {
      const a = now * 4 + i * 2.1; c.fillStyle = '#FFD36E'; c.globalAlpha = Math.min(1, f);
      c.save(); c.translate(x + Math.cos(a) * 9, y + Math.sin(a) * 2.6); c.rotate(a);
      c.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 1.2 : 3, b = j / 10 * TAU; c.lineTo(Math.cos(b) * r, Math.sin(b) * r); } c.closePath(); c.fill(); c.restore();
    }
    c.globalAlpha = 1;
  }
  // a little shiver line pair beside a point (cold, fear)
  function shiver(c, x, y, now, k) {
    if (k <= 0) return;
    c.save(); c.strokeStyle = '#8FD0DE'; c.lineWidth = 0.8; c.lineCap = 'round'; c.globalAlpha = 0.85 * Math.min(1, k);
    for (const d of [-1, 1]) for (let i = 0; i < 2; i++) { const o = Math.sin(now * 40 + i * 2 + d) * 0.8; c.beginPath(); c.moveTo(x + d * (11 + i * 3) + o, y - 3 + i * 4); c.lineTo(x + d * (13 + i * 3) + o, y + 1 + i * 4); c.stroke(); }
    c.restore();
  }
  function sweat(c, x, y, k) {
    if (k <= 0) return;
    c.save(); c.globalAlpha = Math.min(1, k); c.fillStyle = '#9ED7F0'; c.strokeStyle = '#5E9DB8'; c.lineWidth = 0.4;
    c.beginPath(); c.moveTo(x, y - 2.4); c.quadraticCurveTo(x + 1.6, y, x, y + 1); c.quadraticCurveTo(x - 1.6, y, x, y - 2.4); c.fill(); c.stroke(); c.restore();
  }

  // ---------- the garden things this file looks after ----------
  const T_ = GD.TABLE, TOP = T_.y - 23;                       // the table top
  const PLATE = { x: T_.x - 21, y: TOP }, BOTTLE = { x: T_.x + 11, y: TOP - 4.6 }, GLASS = { x: T_.x + 4, y: TOP };
  const BUCKET = { x: T_.x + 8, y: T_.y + 1 };                // the water bombs, under the table
  const CHAIR = { x: GD.CHAIR.x + 16, y: GD.CHAIR.y - 3 };    // the folding chair, between Ulrike and Christof

  // ======================================================================================== KETCHUP (62-75)
  const KJ = { take: 63.05, bottle: 63.95, aim: 64.4, shake: [65.9, 66.9], peek: [67.0, 67.8], turn: [67.9, 68.3], mouth: 68.2, splat: 69.0, drop: 69.65, back: 72.75 };
  const hitAt = KJ.splat + 0.12;
  const bunGround = { x: 191, y: 186 };
  const dogBack = [73.0, 73.5, 73.85, 74.5];                  // Lotta: off, at the bun, turns, home
  const shakeY = (t) => (G.inn(t, KJ.shake[0], KJ.shake[1]) ? Math.sin((t - KJ.shake[0]) * TAU * 4.6) * 2.4 * bump(t, KJ.shake[0] - 0.1, KJ.shake[1] + 0.1) : 0);
  // the bottle's angle: upright on the table, nozzle down over the bun, at his eye, then (oh no) at Naike
  const bottleAngle = (t) => G.at([[63.95, 0], [64.4, Math.PI], [66.95, Math.PI], [67.3, Math.PI * 1.5], [KJ.turn[0], Math.PI * 1.5], [KJ.turn[1], Math.PI * 0.5], [72.2, Math.PI * 0.5], [72.6, 0]], t);
  const squeeze = (t) => (G.inn(t, 64.5, 65.2) ? Math.max(0, Math.sin((t - 64.5) * TAU * 2.2)) : 0) + seg(t, 68.4, 68.95) * (t < KJ.splat + 0.25 ? 1 : 0);
  const AIM = { rh: [-3, -21], lh: [-1.5, -31] };
  rigClip('gpKetJ', [
    [62.4, null],
    [62.9, { rh: [-10.5, -25.5], torso: -4, head: -4 }],     // reaches for a bun on the plate
    [63.1, { rh: [-10.5, -25.5], torso: -4, head: -4 }],
    [63.45, { rh: [-3, -21] }],
    [63.85, { rh: [-3, -21], lh: [18.5, -27.5], torso: 4, head: 3 }],   // and for the bottle
    [64.0, { rh: [-3, -21], lh: [18.5, -27.5], torso: 4, head: 3 }],
    [64.4, { ...AIM, head: 5 }],                            // nozzle down over the sausage
    [65.2, (t) => ({ ...AIM, lh: [-1.5, -31 + Math.sin((t - 64.5) * TAU * 2.2) * 0.8], head: 5 })],
    [65.35, { ...AIM, head: -2, brow: 1 }],                  // nothing. A look to us.
    [65.9, { ...AIM, head: -2, brow: 1 }],
    [66.1, (t) => ({ rh: [-3, -21], lh: [7, -31 + shakeY(t)], bounce: Math.abs(shakeY(t)) * 0.3, torso: shakeY(t) * 0.8, brow: 1 })],
    [66.85, (t) => ({ rh: [-3, -21], lh: [7, -31 + shakeY(t)], bounce: Math.abs(shakeY(t)) * 0.3, torso: shakeY(t) * 0.8, brow: 1 })],
    [67.3, { rh: [-3, -21], lh: [10, -41], head: 6 }],        // peeks into the nozzle
    [KJ.peek[1], { rh: [-3, -21], lh: [10, -41], head: 6 }],
    [KJ.turn[0] + 0.15, { rh: [-1, -36.5], lh: [10, -33], head: 0 }],   // bun into the mouth, bottle turned
    [KJ.turn[1] + 0.15, { rh: [8, -32], lh: [11, -33] }],               // both hands on the bottle
    [68.9, (t) => ({ rh: [8.5, -32 + Math.sin(t * 70) * 0.3], lh: [11.5, -33], bounce: -1.4, torso: -3, brow: 1, shrug: 1 })],
    [KJ.splat + 0.08, { rh: [9, -35], lh: [12, -36], bounce: 0.8, torso: -6, head: -5 }],  // the recoil
    [69.6, { rh: [7, -31], lh: [10, -32], torso: -2 }],
    [71.6, { rh: [-4, -19], lh: [7, -25] }],                  // lets the bottle sink, sheepish
    [72.4, { lh: [18.5, -27.5], torso: 4 }],                  // puts it back on the table
    [KJ.back, { lh: [18.5, -27.5], torso: 4 }],
    [73.3, null],
  ]);
  // Naike: the microphone at her chin for the live report, then the hand to her face, the stripe, the taste
  const MIC = { lh: [5, -29.5] };
  rigClip('gpKetN', [
    [62.0, MIC],
    [KJ.splat, MIC],
    [hitAt + 0.06, { ...MIC, head: -7, bounce: 1.2, torso: -4 }],
    [70.15, { ...MIC, head: -3, torso: -2 }],
    [70.5, { ...MIC, rh: [-4, -41.5], head: -2 }],
    [70.9, { ...MIC, rh: [4.5, -34.5], head: -2 }],           // wipes a stripe off her face
    [71.15, { ...MIC, rh: [0.5, -34.5] }],                    // tastes it
    [71.45, { ...MIC, rh: [0.5, -35], head: 4 }],
    [71.7, { ...MIC, head: 0 }],
    [73.9, MIC],
    [74.2, null],
  ], () => ({ prop: { name: 'mic', hand: 'l', upright: true } }));
  // Lotta's run for the bun: x along the front row, where the bun lies
  const ketchupDog = [[dogBack[0], H.dog], [dogBack[1], bunGround.x - 13, 'io'], [dogBack[2], bunGround.x - 13], [dogBack[3], H.dog, 'io']];
  G.act({
    name: 'ketchup', span: [62, 75],
    x: { dog: ketchupDog },
    pose: {
      striped: [[62.4, 'gpKetJ', 0, 0], [65.35, 'gpKetJ', 0, 0], [KJ.splat + 0.2, 'gpKetJ', 0, 0, 'ouch'], [71.2, 'gpKetJ', 0, 0], [73.3, null]],
      reporter: [[61.4, 'gpKetN', 0, 1], [74.2, 'mic', 0, 1]],
      kid: [[KJ.splat + 0.15, null, 0, 0, 'wow'], [70.6, null], [72.0, 'applaud'], [73.2, null]],
    },
    lines: [[62.3, 'reporter', 'Live vom Grillfest: Hier ist alles ganz ruhig.', 3.7], [69.6, 'striped', 'Ups.', 1.6], [71.75, 'reporter', 'Zurück ins Studio.', 2.3]],
    focus: [[62, 212], [74.8, 212]],
    sounds: [[KJ.take, 'pop'], [KJ.shake[0] + 0.05, 'zisch'], [KJ.splat, 'splat'], [70.05, 'plopp'], [dogBack[1] + 0.1, 'mampf']],
    figure(k, t, A) {
      NOW = t;
      if (!G.inn(t, 62, 75)) return null;
      if (k.who === 'striped') return { look: t < 63.2 ? -40 : t < 64.1 ? 40 : t < 65.35 ? -6 : G.inn(t, 65.35, 65.9) || G.inn(t, 69.5, 70.6) ? 0 : t > 73.0 ? A.dogX - k.x : t > 68.3 ? 40 : 0 };
      if (k.who === 'reporter') return { look: G.inn(t, hitAt, 71.7) ? 0 : 70 };
      if (k.who === 'kid') return { look: look(k, t > 73.0 ? A.dogX : 205) };
      if (k.who === 'redbeard' || k.who === 'filmer') return { look: look(k, 210) };
      return null;
    },
    mimo(t) {
      if (G.inn(t, 67.1, 68.3)) return { mood: 'scared', face: -1, hop: bump(t, 67.1, 67.4) * 5 };        // the nozzle at his eye!
      if (G.inn(t, KJ.splat, 69.7)) return { mood: 'scared', face: -1, hop: bump(t, KJ.splat, KJ.splat + 0.35) * 7 };
      if (G.inn(t, 71.9, 73.4)) return { mood: 'happy', face: -1, hop: Math.abs(Math.sin((t - 71.9) * TAU * 1.6)) * 4 };
      if (G.inn(t, 62.5, 74.6)) return { face: -1 };
      return null;
    },
    dog(t) {
      if (!G.inn(t, dogBack[0], dogBack[3] + 0.6)) return null;
      const o = { pose: 'sit', lookAt: null };
      if (G.inn(t, dogBack[1] - 0.05, dogBack[3] + 0.05)) o.pose = 'stand';
      if (G.inn(t, dogBack[1] + 0.1, dogBack[3] + 0.3)) { o.carry = 'bun'; o.carryDraw = (g, x, y) => bun(g, x + 1, y + 0.5, 0.1); }
      if (t > dogBack[3]) o.happy = 1;
      return o;
    },
    back(c, t, A) {
      // the plate with the buns (one goes to Julian), the bottle when it stands on the table
      const pal = A.pal;
      c.fillStyle = '#FFFFFF'; c.strokeStyle = '#C9C2D6'; c.lineWidth = 0.4; c.beginPath(); c.ellipse(PLATE.x, PLATE.y - 0.5, 6.5, 1.4, 0, 0, TAU); c.fill(); c.stroke();
      bun(c, PLATE.x - 2.2, PLATE.y - 1.8, -0.05);
      if (t < KJ.take - 0.05 || t > 159.6) bun(c, PLATE.x + 2.4, PLATE.y - 2.6, 0.08);
      const onTable = t < KJ.bottle || t > KJ.back + 0.12;
      if (onTable) bottle(c, BOTTLE.x, BOTTLE.y, 0, 0, pal);
      // the bun on the lawn, until Lotta has it
      if (G.inn(t, 70.05, dogBack[1] + 0.1)) bun(c, bunGround.x, bunGround.y - 1.2, 0.25);
    },
    after(c, k, t, A) {
      const pal = A.pal;
      if (k.who === 'striped' && G.inn(t, KJ.take - 0.1, 72.95)) {
        const r = handAt(A, k, 'r'), l = handAt(A, k, 'l'), hd = headAt(A, k);
        // the bun: from the plate into his hand, into his mouth, then it drops out (Ups)
        if (t < KJ.mouth) {
          const k1 = seg(t, KJ.take - 0.1, KJ.take + 0.1), x = lerp(PLATE.x + 2.4, r[0] + 0.5, k1), y = lerp(PLATE.y - 2.6, r[1] - 1.2, k1);
          bun(c, x, y, 0.05);
        } else if (t < KJ.drop) bun(c, hd[0] + 0.4, hd[1] + 5.2, 0);
        // the bottle in his hand
        if (G.inn(t, KJ.bottle - 0.1, KJ.back + 0.12)) {
          const a = bottleAngle(t), sq = squeeze(t);
          const kIn = seg(t, KJ.bottle - 0.1, KJ.bottle + 0.1), kOut = seg(t, KJ.back - 0.05, KJ.back + 0.12);
          const hx = l[0] + (KJ.turn[1] < t ? 1.6 : 0) * seg(t, KJ.turn[1], KJ.turn[1] + 0.2), hy = l[1] + shakeY(t);
          const x = lerp(lerp(BOTTLE.x, hx, kIn), BOTTLE.x, kOut), y = lerp(lerp(BOTTLE.y, hy, kIn), BOTTLE.y, kOut);
          const tip = bottle(c, x + (G.inn(t, 68.4, KJ.splat) ? Math.sin(t * 80) * 0.35 : 0), y, a, sq, pal);
          if (G.inn(t, KJ.shake[0], KJ.shake[1])) { // shake lines
            c.save(); c.strokeStyle = pal.ink; c.lineWidth = 0.6; c.lineCap = 'round'; c.globalAlpha = 0.55;
            for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 5, y - 3); c.lineTo(x + d * 6.5, y - 1); c.moveTo(x + d * 5.2, y + 1); c.lineTo(x + d * 6.7, y + 3); c.stroke(); }
            c.restore();
          }
          if (G.inn(t, 64.9, 65.3)) { // pfft: only air comes out
            const q = seg(t, 64.9, 65.3); c.fillStyle = '#FFFFFF'; c.globalAlpha = 0.9 * (1 - q);
            c.beginPath(); c.arc(tip[0], tip[1] + 1 + q * 4, 1 + q * 2, 0, TAU); c.fill(); c.globalAlpha = 1;
          }
          if (G.inn(t, KJ.peek[0] + 0.3, KJ.peek[1])) sweat(c, hd[0] - 7, hd[1] - 5, seg(t, KJ.peek[0] + 0.3, KJ.peek[0] + 0.5));
        }
        // Ups: the bun drops out of his mouth and bounces onto the lawn
        if (G.inn(t, KJ.drop, 70.1)) {
          const q = seg(t, KJ.drop, 70.05), x = lerp(hd[0] + 0.4, bunGround.x, q), y = lerp(hd[1] + 5.2, bunGround.y - 1.2, q * q) - bump(q, 0.7, 1) * 0;
          bun(c, x, y, q * 1.2);
        }
      }
      if (k.who === 'reporter' && G.inn(t, hitAt, 75)) { // ketchup on her face: a stripe wiped off, a red fingertip
        const h = headAt(A, k), fade = 1 - seg(t, 74.1, 74.9), wipe = seg(t, 70.5, 70.9);
        c.save();
        c.globalAlpha = 0.95 * fade;
        if (wipe > 0) { // the clean stripe: everything but a band from the top left across the face
          const ax = h[0] - 5, ay = h[1] - 3.5, bx = h[0] + 4.5, by = h[1] + 3.5, ex = lerp(ax, bx, wipe), ey = lerp(ay, by, wipe), nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny), w = 1.5;
          c.beginPath(); c.rect(h[0] - 30, h[1] - 30, 60, 60);
          c.moveTo(ax + nx / nl * w, ay + ny / nl * w); c.lineTo(ex + nx / nl * w, ey + ny / nl * w); c.lineTo(ex - nx / nl * w, ey - ny / nl * w); c.lineTo(ax - nx / nl * w, ay - ny / nl * w); c.closePath();
          c.clip('evenodd');
        }
        c.fillStyle = pal.ketchup;
        const grow = seg(t, hitAt, hitAt + 0.12);
        for (const [dx, dy, r] of [[-1, -1, 3.4], [2.6, 0.6, 2.6], [-3.6, 1.6, 2.0], [1, 3.4, 2.0], [4.6, -2.4, 1.6], [-4.8, -2.6, 1.4], [3.4, 3.6, 1.2]]) { c.beginPath(); c.arc(h[0] + dx, h[1] + dy, r * grow, 0, TAU); c.fill(); }
        const drip = seg(t, hitAt + 0.3, 72.5);
        c.fillRect(h[0] - 3.9, h[1] + 2, 1.2, 1 + 4 * drip); c.beginPath(); c.arc(h[0] - 3.3, h[1] + 3 + 4 * drip, 0.8, 0, TAU); c.fill();
        c.fillRect(h[0] + 1.6, h[1] + 4, 1, 1 + 2.5 * drip);
        c.restore();
        if (G.inn(t, 70.85, 71.35)) { const r = handAt(A, k, 'r'); c.fillStyle = pal.ketchup; c.beginPath(); c.arc(r[0], r[1] - 0.6, 0.9, 0, TAU); c.fill(); }
      }
    },
    front(c, t, A) {
      const J = A.who('striped'), R = A.who('reporter');
      if (G.inn(t, KJ.splat, hitAt + 0.05) && J && R && J.p && R.p) { // SPLATSCH: the jet from the nozzle to her face
        const l = handAt(A, J, 'l'), a = bottleAngle(t), tip = [l[0] + 1.6 + Math.sin(a) * 7.1, l[1] - Math.cos(a) * 7.1], b = headAt(A, R), k = seg(t, KJ.splat, hitAt);
        const ex = tip[0] + (b[0] - tip[0]) * k, ey = tip[1] + (b[1] - tip[1]) * k - Math.sin(k * Math.PI) * 3;
        c.strokeStyle = A.pal.ketchup; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(tip[0], tip[1]); c.quadraticCurveTo((tip[0] + ex) / 2, Math.min(tip[1], ey) - 3, ex, ey); c.stroke();
      }
      if (G.inn(t, hitAt, hitAt + 0.5) && R && R.p) { // splashes off her face
        const b = headAt(A, R), k = seg(t, hitAt, hitAt + 0.5); c.fillStyle = A.pal.ketchup; c.globalAlpha = 1 - k;
        for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.9 + i * 0.3; c.beginPath(); c.arc(b[0] + 3 + Math.cos(a) * (4 + k * 12), b[1] + Math.sin(a) * (4 + k * 10) + k * k * 10, 1, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      }
    },
    talk(c, t, A) {
      const J = A.who('striped'), R = A.who('reporter');
      if (J) A.pop(c, '?', J.x + 9, 108, (t - 65.35) / 0.9, 0.15, 13);
      if (J) A.pop(c, '!', J.x - 10, 106, (t - (KJ.peek[0] + 0.35)) / 0.8, -0.15, 13, '#FFE08F');
      if (R) A.pop(c, 'SPLATSCH!', R.x + 20, 126, (t - KJ.splat - 0.05) / 0.95, -0.1, 14, '#FFB3A8');
      if (R) A.pop(c, 'Mhm.', R.x - 12, 118, (t - 71.1) / 0.6, -0.1, 10);
    },
  });

  // ======================================================================================== WATER BOMB (106-120)
  const WB = { fish: [107.1, 107.5], out: 107.45, sneak: [108.1, 110.75], stand: 276, wind: [110.75, 111.3], rel: 111.3, hit: 111.7 };
  const U = { x: H.filmer };
  rigClip('gpBombM', [
    [106.3, null],
    [WB.fish[0], { rh: [7, -16], torso: 8, bounce: -1.5 }],               // reaches into the bucket under the table
    [WB.fish[1], { rh: [7, -17], torso: 8, bounce: -1.5 }],
    [107.8, { rh: [3, -25], head: -3, beam: 1 }],                        // holds it up, a grin to us
    [WB.sneak[0], { rh: [3, -25], beam: 1 }],
    [WB.sneak[0] + 0.3, (t) => SNEAK_M(t)],
    [WB.sneak[1], (t) => SNEAK_M(t)],
    [WB.wind[0] + 0.25, { rh: [-6, -26], lh: [8, -18], torso: -9, bounce: 0.5, brow: 1 }],   // wind-up
    [WB.rel - 0.06, { rh: [-7, -27], lh: [8, -17], torso: -10, bounce: 0.6, brow: 1 }],     // a tiny hesitation
    [WB.rel + 0.05, { rh: [10, -21], lh: [-4, -16], torso: 10, feet: { l: 2.5 } }],          // throw
    [WB.rel + 0.4, { rh: [9, -13], lh: [-4, -15], torso: 6 }],
    [WB.hit + 0.6, { rh: [1.5, -23], lh: [-1.5, -23], beam: 1 }],                            // giggles behind his hands
    [113.25, { rh: [1.5, -23], lh: [-1.5, -23], beam: 1 }],
    [113.4, null],
    [114.7, null],
    [115.2, { rh: [-3.5, -10], lh: [3.5, -10], head: -5, beam: 1 }],    // whistling, hands in his pockets, looking up
    [118.8, { rh: [-3.5, -10], lh: [3.5, -10], head: -5, beam: 1 }],
    [119.4, { beam: 1 }],
    [119.8, null],
  ]);
  // tiptoeing: up on the toes, high knees, the balloon up, the free hand like a claw, a finger at the lips for "Psst!"
  const SNEAK_M = (t) => {
    const ph = (t - WB.sneak[0]) * TAU * 1.25, up = Math.abs(Math.sin(ph)), psst = G.inn(t, 108.45, 109.45);
    return { rh: [3, -24], lh: psst ? [1.2, -27] : [8, -21], torso: 9, bounce: 0.6 + up * 1.4, head: psst ? -2 : 2, feet: { ly: Math.max(0, Math.sin(ph)) * 4, ry: Math.max(0, -Math.sin(ph)) * 4 }, beam: psst };
  };
  // Ulrike: the camera up on the gull, drenched, the slow turn, a fist; later the camera in one hand and a search
  const CAM = { l: [26, -124], r: [-26, 124] };
  rigClip('gpBombU', [
    [106.0, { ...CAM, head: -4 }],
    [WB.hit, { ...CAM, head: -4 }],
    [WB.hit + 0.1, { ...CAM, head: -8, bounce: 0.8, shrug: 1 }],
    [112.4, { ...CAM, head: -1, shrug: 1 }],
    [112.9, { lh: [3, -22], rh: [-3, -22], head: 2, shrug: 0.4 }],      // lets the camera sink, slowly
    [113.15, { lh: [3, -22], rh: [-11, -36], head: 0, brow: 1 }],        // Na warte!
    [113.75, (t) => ({ lh: [3, -22], rh: [-11, -36 + Math.sin((t - 113.15) * TAU * 3) * 1.4], brow: 1 })],
    [113.85, null],
    [116.3, null],
    [116.8, { lh: [6, -30], head: 3, brow: 1 }],                        // searching, a hand over her eyes
    [118.3, { lh: [6, -30], head: -3, brow: 1 }],
    [118.8, null],
  ], (t) => ({ prop: t < 112.95 ? { name: 'camera', hand: 'both', offset: [-1.4, 0.6], rec: t < WB.hit } : { name: 'camera', hand: t < 116.5 || t > 118.5 ? 'l' : 'r', offset: [0, 1.5] } }));
  G.act({
    name: 'waterbomb', span: [106, 120],
    x: {
      kid: [[106.3, H.kid], [107.05, 204, 'io'], [WB.sneak[0], 204], [108.5, 212, 'lin'], [109.45, 212], [WB.sneak[1], WB.stand, 'io'], [113.4, WB.stand], [114.2, 620, 'in'], [114.21, -60], [114.8, 110, 'lin'], [115.6, 168, 'out'], [119.0, 168], [119.8, H.kid, 'io']],
      filmer: [[113.8, H.filmer], [114.5, 620, 'in'], [114.51, -60], [115.9, -60], [116.8, 110, 'out'], [117.8, 170, 'lin'], [119.6, H.filmer, 'lin']],
    },
    pose: {
      kid: [[106.3, 'gpBombM', 0, 1], [107.55, 'gpBombM', 0, 0], [WB.sneak[0], 'gpBombM', 0, 1], [108.5, 'gpBombM', 0, 0], [109.45, 'gpBombM', 0, 1], [WB.hit + 0.2, 'gpBombM', 0, 0], [113.0, 'gpBombM', 0, 1, 'wow'], [114.6, 'gpBombM', 0, 0], [119.8, null]],
      filmer: [[106.0, 'gpBombU', 0, 1], [112.5, 'gpBombU', 0, 0], [112.85, 'gpBombU', 0, -1], [116.9, 'gpBombU', 0, 1], [119.6, 'cam', 0, -1]],
      reporter: [[WB.hit + 0.1, 'applaud', 0, 1], [112.7, 'mic', 0, 1]],
    },
    lines: [[106.05, 'filmer', 'Ein seltener Vogel …', 2.4], [108.55, 'kid', 'Psst!', 1.65], [113.15, 'filmer', 'Na warte!', 1.9], [116.95, 'filmer', 'Wo ist er hin?', 2.1]],
    focus: [[106, 250], [113.4, 250], [114.4, 184], [118.2, 184], [119.8, 240]],
    sounds: [[WB.out, 'plopp'], [WB.rel, 'whoosh'], [WB.hit, 'platsch'], [114.25, 'whoosh']],
    figure(k, t, A) {
      NOW = t;
      if (!G.inn(t, 106, 120)) return null;
      const K = A.who('kid');
      if (k.who === 'filmer') return { look: t < WB.hit + 0.9 ? 90 : t < 114.5 ? look(k, K ? K.x : 270) : G.inn(t, 116.8, 118.8) ? Math.sin((t - 116.8) * 3.4) * 80 : undefined };
      if (k.who === 'kid') return { look: G.inn(t, 107.5, 108.1) || G.inn(t, 108.45, 109.45) || t > 118.8 ? 0 : t > 115 ? -10 : look(k, 302) };
      if (k.who === 'reporter' || k.who === 'striped' || k.who === 'redbeard') return { look: K ? K.x - k.x : 0 };
      return null;
    },
    mimo(t, A) {
      if (!G.inn(t, 106, 120)) return null;
      const face = A.mimoX > (A.who('kid') || { x: 0 }).x ? -1 : 1;
      if (G.inn(t, 108.5, 109.5)) return { mood: 'happy', face, hop: bump(t, 108.7, 109.05) * 5 };       // Psst! - Mimo nods along
      if (G.inn(t, WB.hit, 112.8)) return { mood: 'happy', face: 1, hop: bump(t, WB.hit, WB.hit + 0.4) * 9 };
      if (G.inn(t, 117.2, 118.6)) return { mood: 'happy', face: 1, hop: Math.abs(Math.sin((t - 117.2) * TAU * 1.5)) * 3 };
      if (G.inn(t, 113.3, 115.0)) return { face: 1 };
      return { face };
    },
    back(c, t, A) {
      // the bucket of water bombs under the table
      const B = BUCKET, out = t > WB.out && t < 159.6;
      c.save();
      c.fillStyle = '#F2A35C'; c.strokeStyle = '#B5703A'; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(B.x - 6, B.y - 9); c.lineTo(B.x + 6, B.y - 9); c.lineTo(B.x + 4.8, B.y); c.lineTo(B.x - 4.8, B.y); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = A.pal.water; c.beginPath(); c.ellipse(B.x, B.y - 9, 6, 1.3, 0, 0, TAU); c.fill();
      for (const [dx, col, hide] of [[-3, '#F59AAE', false], [0.6, '#FFD36E', false], [3.4, '#7FC7EE', out]]) { if (hide) continue; c.fillStyle = col; c.beginPath(); c.arc(B.x + dx, B.y - 10, 1.9, Math.PI, TAU); c.fill(); }
      c.restore();
    },
    after(c, k, t, A) {
      const pal = A.pal;
      if (k.who === 'kid' && G.inn(t, WB.out - 0.15, WB.rel)) { // the water bomb in his hand, wobbling and dripping
        const r = handAt(A, k, 'r'), q = seg(t, WB.out - 0.15, WB.out + 0.1), x = lerp(BUCKET.x + 3.4, r[0], q), y = lerp(BUCKET.y - 9, r[1], q);
        balloon(c, x, y, Math.sin(t * 9) * (G.inn(t, WB.wind[0], WB.rel) ? 1 : 0.6), 3.2);
        if (t < 108.6) { c.fillStyle = pal.water; for (let i = 0; i < 2; i++) { const qq = (t * 1.6 + i * 0.5) % 1; c.globalAlpha = 1 - qq; c.beginPath(); c.arc(x + (i ? 1 : -1), y + 1 + qq * 10, 0.7, 0, TAU); c.fill(); } c.globalAlpha = 1; }
      }
      if (k.who === 'kid') notes(c, headAt(A, k)[0] + 1, headAt(A, k)[1] + 2, t, 115.3, 118.9, A.now, pal);
      if (k.who === 'filmer' && G.inn(t, WB.hit, 121)) drips(c, headAt(A, k), k.x, k.y, (t < 119.5 ? 1 : 1 - seg(t, 119.5, 121)) * seg(t, WB.hit, WB.hit + 0.2), A.now, pal);
    },
    front(c, t, A) {
      const K = A.who('kid'), F = A.who('filmer');
      if (G.inn(t, WB.rel, WB.hit) && K && F && K.p && F.p) { // the water bomb in an arc, wobbling
        const a = [K.x + 8, K.y - 26], b = headAt(A, F), k = seg(t, WB.rel, WB.hit), x = a[0] + (b[0] - 1 - a[0]) * k, y = a[1] + (b[1] - 4 - a[1]) * k - Math.sin(k * Math.PI) * 20;
        balloon(c, x, y + 4, Math.sin(t * 30), 3.2);
      }
      if (G.inn(t, WB.hit, WB.hit + 0.7) && F && F.p) { // the splash
        const b = headAt(A, F), k = seg(t, WB.hit, WB.hit + 0.7); c.fillStyle = A.pal.water; c.globalAlpha = 1 - k;
        for (let i = 0; i < 14; i++) { const a2 = -Math.PI + i / 13 * Math.PI; c.beginPath(); c.arc(b[0] + Math.cos(a2) * (5 + k * 20), b[1] - 4 + Math.sin(a2) * (5 + k * 12) + k * k * 22, 1.5, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      }
    },
    talk(c, t, A) { const F = A.who('filmer'); if (F) A.pop(c, 'Platsch!', F.x - 14, 116, (t - WB.hit) / 1.0, 0.1, 14, '#BFE8FA'); },
  });

  // ======================================================================================== CHAIR (121-132)
  const CC = { wake: 122.2, yawn: [122.8, 123.9], sit: 124.6, lower: [125.6, 126.4], yank: [126.15, 126.4], fall: 126.95, up: [128.8, 129.5], back: [128.0, 128.5] };
  const chairDX = (t) => G.at([[0, 0], [CC.yank[0], 0], [CC.yank[1], -22, 'out'], [CC.back[0], -22], [CC.back[1], 0]], t);
  const sitDip = (t) => G.at([[0, 0], [CC.lower[0], 0], [CC.lower[1], 8.5, 'out'], [CC.fall, 8.5], [CC.fall + 0.14, 17, 'in'], [CC.up[0], 17], [CC.up[1], 0], [G.LOOP, 0]], t);
  const SQUAT = (t) => ({ lh: [13, -26 + sitDip(t) * 0.2], rh: [11, -27 + sitDip(t) * 0.2], torso: 12, bounce: -sitDip(t), beam: t < CC.yank[1] + 0.2, head: 3 });
  rigClip('gpChairC', [
    [121.0, (t) => ({ head: 9 + Math.sin(t * 1.6) * 2, torso: Math.sin(t * 0.8) * 2, bounce: -0.4 })],   // asleep on his feet
    [CC.wake, (t) => ({ head: 9 + Math.sin(t * 1.6) * 2, torso: Math.sin(t * 0.8) * 2, bounce: -0.4 })],
    [CC.wake + 0.1, { l: [40, 70], r: [-40, -70], bounce: 2.5, head: -5, brow: 1 }],                       // wakes with a start
    [122.7, { brow: 1 }],
    [123.25, { l: [150, 168], r: [-150, -168], head: -9, bounce: 1.4, torso: -2 }],                        // a big stretch
    [123.75, { l: [156, 172], r: [-156, -172], head: -10, bounce: 1.6, torso: 2 }],
    [124.15, null],
    [CC.sit, null],
    [124.9, { lh: [1.5, -20], rh: [-1.5, -21], beam: 1 }],                                                // hands on his belly
    [CC.lower[0], { lh: [1.5, -20], rh: [-1.5, -21], beam: 1 }],
    [CC.lower[1], SQUAT],                                                                                 // lowers himself
    [CC.fall, (t) => ({ ...SQUAT(t), beam: 0, brow: 1, head: -2 })],
    [CC.fall + 0.14, { l: [70, 40], r: [-70, -40], torso: -10, bounce: -17, feet: { lz: 7, rz: 6, l: 6, r: 4 }, head: -6, brow: 1 }],
    [CC.up[0], { l: [40, 20], r: [-40, -20], torso: -6, bounce: -17, feet: { lz: 7, rz: 6, l: 6, r: 4 } }],
    [CC.up[1], { lh: [4, -24], rh: [-4, -24] }],
    [129.8, { lh: [-4, -22], rh: [4, -23] }],                                                             // arms crossed
    [131.0, { lh: [-4, -22], rh: [4, -23] }],
    [131.4, null],
  ]);
  const SNEAK_J = (t) => {
    const ph = (t - 124.0) * TAU * 1.1, up = Math.abs(Math.sin(ph));
    return { lh: [12, -31], rh: [6, -35], torso: 10, bounce: 0.5 + up * 1.8, head: 3, feet: { ly: Math.max(0, Math.sin(ph)) * 5, ry: Math.max(0, -Math.sin(ph)) * 5 } };
  };
  const GRIP = { lh: [10.5, -27.5], rh: [9, -26] };
  rigClip('gpChairJ', [
    [123.95, null],
    [124.25, SNEAK_J],
    [125.9, SNEAK_J],
    [CC.yank[0] - 0.02, { ...GRIP, torso: 6, bounce: -1 }],
    [CC.yank[1], { ...GRIP, torso: -8, bounce: 0.5, brow: 1 }],                       // yank!
    [126.7, { ...GRIP, torso: -3, beam: 1 }],
    [127.05, { ...GRIP, torso: 0, head: -7, beam: 1 }],                               // whistles, looking up
    [127.9, { ...GRIP, torso: 0, head: -7, beam: 1 }],
    [CC.back[1], { ...GRIP, torso: 2, beam: 1 }],
    [128.75, { rh: [12, -20], lh: [4, -18], torso: 14, beam: 1 }],                    // a little bow: please, take a seat
    [129.3, { rh: [12, -20], lh: [4, -18], torso: 14, beam: 1 }],
    [129.7, null],
  ]);
  G.act({
    name: 'chair', span: [121, 132],
    x: {
      professor: [[123.9, H.professor], [CC.sit, CHAIR.x + 2, 'io'], [130.9, CHAIR.x + 2], [131.8, H.professor, 'io']],
      striped: [[123.2, H.striped], [124.0, 226, 'lin'], [125.9, CHAIR.x - 18, 'lin'], [CC.yank[0], CHAIR.x - 18], [CC.yank[1], CHAIR.x - 40, 'out'], [CC.back[0], CHAIR.x - 40], [CC.back[1], CHAIR.x - 18, 'io'], [130.0, CHAIR.x - 18], [131.8, H.striped, 'lin']],
      filmer: [[121.0, H.filmer], [122.0, 348, 'io'], [130.6, 348], [131.7, H.filmer, 'io']],
    },
    pose: {
      professor: [[121.0, 'gpChairC', 0, 0], [123.9, 'gpChairC', 0, -1], [CC.sit, 'gpChairC', 0, 1], [CC.fall + 0.2, 'gpChairC', 0, 1, 'sure'], [CC.up[0], 'gpChairC', 0, 0, 'serious'], [131.4, null, 0, 0, 'serious'], [131.9, null]],
      striped: [[123.95, 'gpChairJ', 0, 1], [126.6, 'gpChairJ', 0, 0], [127.0, 'gpChairJ', 0, 1], [129.7, null]],
      filmer: [[121.0, 'cam', 0, -1]],
      sidepart: [[127.1, 'applaud'], [128.3, null]],
      reporter: [[127.1, 'applaud', 0, 1], [128.2, 'mic', 0, 1]],
    },
    lines: [[122.35, 'professor', 'Hm? Ich bin wach!', 2.25], [124.65, 'professor', 'Ein Päuschen …', 2.1], [128.0, 'striped', 'Bitte schön!', 1.9], [129.95, 'professor', 'Ich steh lieber.', 2.05]],
    focus: [[121, 298], [131.6, 298]],
    sounds: [[CC.wake, 'pop'], [CC.yank[0], 'whoosh'], [CC.fall + 0.1, 'plumps']],
    figure(k, t, A) {
      NOW = t;
      if (k.who === 'professor' && t < CC.wake) return { asleep: true, look: undefined };
      if (!G.inn(t, 121, 132)) return null;
      if (k.who === 'professor') return { look: G.inn(t, CC.lower[1], CC.fall) ? 0 : G.inn(t, CC.fall, 129.9) ? -30 : undefined };
      if (k.who === 'striped') return { look: G.inn(t, 126.4, 127.0) || t > 128.5 ? 0 : 60 };
      if (k.who === 'filmer' || k.who === 'sidepart' || k.who === 'reporter') return { look: look(k, CHAIR.x) };
      return null;
    },
    mimo(t) {
      if (!G.inn(t, 121, 132)) return null;
      if (G.inn(t, 124.6, 125.2)) return { face: -1, hop: bump(t, 124.7, 125.0) * 4 };                 // he sees Julian sneak past
      if (G.inn(t, CC.fall + 0.05, 128.6)) return { mood: 'happy', face: 1, hop: Math.abs(Math.sin((t - CC.fall) * TAU * 1.6)) * 5 };
      return { face: 1 };
    },
    back(c, t, A) { // the folding chair, its back towards Julian's side
      const x = CHAIR.x + chairDX(t), y = CHAIR.y, pal = A.pal;
      c.save(); c.strokeStyle = pal.chair; c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x - 6, y - 14); c.moveTo(x - 8, y); c.lineTo(x + 6, y - 14); c.moveTo(x - 6, y - 14); c.lineTo(x - 8, y - 30); c.stroke();
      c.fillStyle = pal.chair; c.fillRect(x - 7, y - 16, 16, 3); c.fillRect(x - 9, y - 31, 5, 15);
      c.restore();
    },
    person(c, k, t, A) { // Christof on the lawn: the bottom on the grass, dust, stars
      if (k.who !== 'professor' || !G.inn(t, CC.fall + 0.05, CC.up[1])) return false;
      const f = seg(t, CC.fall + 0.05, CC.fall + 0.14) * (1 - seg(t, CC.up[0], CC.up[1]));
      c.save(); c.translate(k.x, k.y + 6 * f); k.p.draw(c, 0, 0, { scale: 1, noShadow: true }); c.restore();
      return true;
    },
    after(c, k, t, A) {
      if (k.who === 'professor') {
        const h = headAt(A, k);
        if (G.inn(t, 122.85, 123.85)) { // a big yawn
          const o = bump(t, 122.85, 123.85); c.fillStyle = '#6B3B45'; c.beginPath(); c.ellipse(h[0], h[1] + 4.6, 1.3 + o * 0.6, 0.4 + o * 1.9, 0, 0, TAU); c.fill();
        }
        if (G.inn(t, CC.lower[1], CC.fall)) sweat(c, h[0] + 7, h[1] - 4, seg(t, CC.lower[1] + 0.15, CC.lower[1] + 0.3));
        if (G.inn(t, CC.fall, 129.2)) { stars(c, h[0], h[1] - 9 + 6, A.now, Math.min(seg(t, CC.fall + 0.1, CC.fall + 0.3), 1 - seg(t, 128.8, 129.2))); }
      }
      if (k.who === 'striped') notes(c, headAt(A, k)[0] + 1, headAt(A, k)[1] + 3, t, 127.05, 127.95, A.now, A.pal);
    },
    front(c, t, A) {
      const P = A.who('professor');
      if (P && t < CC.wake) { // the sleeper's z's
        for (let i = 0; i < 3; i++) { const k = ((A.now * 0.5 + i / 3) % 1); c.globalAlpha = Math.sin(k * Math.PI); c.fillStyle = A.pal.z; c.font = '600 ' + (6 + k * 5) + "px 'Fredoka', 'Nunito', system-ui, sans-serif"; c.fillText('z', P.x + 6 + k * 12, P.y - 62 - k * 16); }
        c.globalAlpha = 1;
      }
      if (P) dust(c, P.x, P.y + 1, seg(t, CC.fall + 0.08, CC.fall + 1.1), A.pal);
    },
    talk(c, t, A) {
      const P = A.who('professor'), x = P ? P.x : CHAIR.x;
      A.pop(c, '!?', x - 9, 108, (t - CC.wake) / 0.8, -0.15, 12, '#FFE08F');
      A.pop(c, '?', x + 10, 118, (t - CC.lower[1] - 0.1) / 0.6, 0.15, 13);
      A.pop(c, 'Plumps!', x - 2, 150, (t - CC.fall - 0.08) / 1.2, -0.1, 15);
    },
  });

  // ======================================================================================== ICE (133-141)
  const IC = { take: 134.0, sneak: [134.8, 135.6], drop: 135.95, inside: 136.1, jump: 136.8, out: 138.6, calm: 138.9 };
  const iceHop = (t) => (G.inn(t, IC.jump, IC.jump + 0.42) ? bump(t, IC.jump, IC.jump + 0.42) * 15 : G.inn(t, IC.jump + 0.42, IC.calm) ? Math.abs(Math.sin((t - IC.jump - 0.42) * TAU * 1.35)) * 7 : 0);
  rigClip('gpIceN', [
    [133.3, MIC],
    [133.75, { ...MIC, rh: [-18.5, -30], torso: -7, head: -3 }],          // fishes an ice cube out of her lemonade
    [IC.take, { ...MIC, rh: [-18.5, -30], torso: -7, head: -3 }],
    [134.4, { lh: [5, -22], rh: [-6, -41], head: -3, beam: 1, brow: 1 }],  // holds it up: revenge
    [134.8, { lh: [5, -22], rh: [-6, -41], head: -3, beam: 1, brow: 1 }],
    [135.0, (t) => ({ lh: [6, -24], rh: [-6, -38], torso: -7, bounce: 0.6 + Math.abs(Math.sin((t - 134.8) * TAU * 1.25)) * 1.4, feet: { ly: Math.max(0, Math.sin((t - 134.8) * TAU * 1.25)) * 4, ry: Math.max(0, -Math.sin((t - 134.8) * TAU * 1.25)) * 4 }, brow: 1 })],
    [IC.sneak[1], { lh: [6, -24], rh: [-9, -40], torso: -6, bounce: 1.2, brow: 1 }],
    [IC.drop - 0.05, { lh: [6, -24], rh: [-14, -41], torso: -6, bounce: 1.6, brow: 1 }],   // over his collar
    [IC.drop + 0.3, { lh: [6, -24], rh: [-13, -42], torso: -4, bounce: 1.4, beam: 1 }],
    [136.6, MIC],                                                           // and back to work, innocent
    [137.6, MIC],
    [137.9, (t) => ({ lh: [5, -23], rh: [-1, -22], beam: 1, bounce: Math.abs(Math.sin((t - 137.6) * TAU * 2.6)) * 1.1, torso: -3 })],   // laughs
    [139.4, (t) => ({ lh: [5, -23], rh: [-1, -22], beam: 1, bounce: Math.abs(Math.sin((t - 137.6) * TAU * 2.6)) * 1.1, torso: -3 })],
    [139.8, MIC],
    [140.4, null],
  ], () => ({ prop: { name: 'mic', hand: 'l', upright: true } }));
  const WILD = (t) => {
    const w = Math.sin((t - IC.jump) * TAU * 2.2), w2 = Math.sin((t - IC.jump) * TAU * 3.1 + 1);
    return { l: [140 + 25 * w, 160 + 20 * w2], r: [-140 + 25 * w2, -160 + 20 * w], torso: 11 * w, head: -6 * w2, shrug: 1, brow: 1, feet: { ly: Math.max(0, w) * 5, ry: Math.max(0, -w) * 5 } };
  };
  rigClip('gpIceJ', [
    [133.0, { beam: 1 }],
    [IC.inside, { beam: 1 }],
    [136.4, { l: [14, 10], r: [-14, -10], shrug: 1, bounce: 0.6, brow: 1 }],           // ... a beat ...
    [IC.jump - 0.02, { l: [16, 10], r: [-16, -10], shrug: 1, bounce: 0.8, brow: 1 }],
    [IC.jump + 0.12, WILD],                                                            // IIIIH!
    [IC.calm - 0.05, WILD],
    [139.3, { l: [18, 14], r: [-18, -14], bounce: -1.2, head: 5 }],                   // phew
    [139.9, { beam: 1 }],
    [140.4, null],
  ]);
  const iceGround = (t) => { const J = { x: G.at([[IC.jump, H.striped], [137.15, 184], [137.5, 207], [137.85, 186], [138.2, 205], [138.55, 191], [138.9, H.striped]], IC.out) }; return { x: J.x + 6, y: 172 }; };
  G.act({
    name: 'ice', span: [133, 141],
    x: {
      reporter: [[134.75, H.reporter], [IC.sneak[1], 211, 'lin'], [IC.drop + 0.2, 211], [136.7, 218, 'io'], [139.5, 218], [140.3, H.reporter, 'io']],
      striped: [[IC.jump, H.striped], [137.15, 184], [137.5, 207], [137.85, 186], [138.2, 205], [138.55, 191], [138.9, H.striped]],
    },
    pose: {
      reporter: [[132.8, 'gpIceN', 0, -1], [134.15, 'gpIceN', 0, 0], [IC.sneak[0], 'gpIceN', 0, -1], [136.5, 'gpIceN', 0, 1], [140.4, 'mic', 0, 1]],
      striped: [[133.0, 'gpIceJ', 0, 0], [IC.jump, 'gpIceJ', 0, 0, 'ouch'], [IC.calm, 'gpIceJ', 0, 0, 'daze'], [139.8, 'gpIceJ', 0, 0], [140.4, null]],
      kid: [[137.8, 'hooray'], [139.2, null]],
    },
    lines: [[134.1, 'reporter', 'Rache … eiskalt.', 2.2], [136.9, 'striped', 'Iiiih! Kalt!', 2.0], [138.95, 'mimo', 'Hihihi!', 1.75]],
    focus: [[133, 212], [140.6, 212]],
    sounds: [[IC.drop + 0.12, 'plopp'], [IC.jump, 'boing'], [IC.out + 0.25, 'plopp']],
    figure(k, t, A) {
      NOW = t;
      if (!G.inn(t, 133, 141)) return null;
      if (k.who === 'striped') return { hop: iceHop(t), look: t < IC.jump ? undefined : 0 };
      if (k.who === 'reporter') return { look: t < 134.15 ? -60 : t < IC.sneak[0] ? 0 : t < 136.5 ? -40 : look(k, A.who('striped') ? A.who('striped').x : 196) };
      if (k.who === 'kid' || k.who === 'redbeard' || k.who === 'filmer') return { look: look(k, 205) };
      return null;
    },
    mimo(t) {
      if (!G.inn(t, 133, 141)) return null;
      if (G.inn(t, IC.jump, IC.jump + 0.5)) return { mood: 'happy', face: -1, hop: bump(t, IC.jump, IC.jump + 0.5) * 8 };
      if (G.inn(t, 137.6, 140.6)) return { mood: 'happy', face: -1, hop: Math.abs(Math.sin((t - 137.6) * TAU * 1.5)) * 4 };
      if (G.inn(t, 134.3, 135.0)) return { mood: 'happy', face: -1 };
      return { face: -1 };
    },
    back(c, t, A) {
      // Naike's lemonade on the table (one ice cube less after 134)
      const g = GLASS;
      c.save(); c.fillStyle = 'rgba(255,224,138,0.85)'; c.beginPath(); c.moveTo(g.x - 2.2, g.y - 7); c.lineTo(g.x + 2.2, g.y - 7); c.lineTo(g.x + 1.8, g.y); c.lineTo(g.x - 1.8, g.y); c.closePath(); c.fill();
      if (t < IC.take - 0.05 || t > 159.6) cube(c, g.x - 0.6, g.y - 6, 0.3, 0.55);
      cube(c, g.x + 0.8, g.y - 4.6, -0.2, 0.5);
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(g.x - 2.4, g.y - 7.6); c.lineTo(g.x - 1.9, g.y); c.lineTo(g.x + 1.9, g.y); c.lineTo(g.x + 2.4, g.y - 7.6); c.stroke();
      c.strokeStyle = '#F59AAE'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(g.x + 0.6, g.y - 4); c.lineTo(g.x + 2.6, g.y - 10); c.stroke();
      c.restore();
      // the cube on the lawn after it fell out of his shirt, melting
      if (G.inn(t, IC.out + 0.25, 141)) { const p = iceGround(t), m = 1 - seg(t, 139.6, 141); c.fillStyle = A.pal.water; c.globalAlpha = 0.5 * Math.min(1, seg(t, IC.out + 0.3, 139.4) + 0.2) * (t > 140.6 ? 1 - seg(t, 140.6, 141) : 1); c.beginPath(); c.ellipse(p.x + 2, p.y + 0.5, 3.5 * (2 - m), 0.9, 0, 0, TAU); c.fill(); c.globalAlpha = 1; cube(c, p.x + 2, p.y - 1.5 * m, 0.6, 0.9 * m); }
    },
    after(c, k, t, A) {
      if (k.who === 'reporter' && G.inn(t, IC.take - 0.12, IC.drop)) { // the ice cube: from the glass to her hand, then over his collar
        const r = handAt(A, k, 'r'), q = seg(t, IC.take - 0.12, IC.take + 0.08);
        cube(c, lerp(GLASS.x - 0.6, r[0], q), lerp(GLASS.y - 6, r[1] - 1.5, q), 0.3 + q * 0.4, lerp(0.55, 1, q));
        if (t > IC.take + 0.2) sparkle(c, r[0] + 2.4, r[1] - 3.5, bump(t, IC.take + 0.2, 135.2) * 1.4);
      }
      if (k.who === 'striped') {
        const h = headAt(A, k);
        if (G.inn(t, IC.inside, IC.jump)) sweat(c, h[0] + 7, h[1] - 4, seg(t, 136.3, 136.5));
        if (G.inn(t, IC.jump, IC.calm)) shiver(c, h[0], h[1] + 4, A.now, 1);
        if (G.inn(t, IC.out, IC.out + 0.28)) { // the cube falls out at the bottom of his shirt
          const q = seg(t, IC.out, IC.out + 0.25), p = iceGround(t); cube(c, lerp(k.x + 2, p.x + 2, q), lerp(k.y - 18 - (k.hop || 0), p.y - 1.5, q * q), q * 3, 0.9);
        }
      }
    },
    front(c, t, A) {
      const R = A.who('reporter'), J = A.who('striped');
      if (G.inn(t, IC.drop, IC.inside) && R && J && R.p && J.p) { // the drop into the collar
        const r = handAt(A, R, 'r'), h = headAt(A, J), q = seg(t, IC.drop, IC.inside);
        cube(c, lerp(r[0], h[0] + 1.5, q), lerp(r[1] - 1.5, h[1] + 9, q * q), 0.7 + q, 1 - q * 0.3);
      }
    },
    talk(c, t, A) { const J = A.who('striped'); if (J) A.pop(c, 'Boing!', J.x - 16, 160, (t - IC.jump) / 0.9, 0.12, 12, '#BFE8FA'); },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
