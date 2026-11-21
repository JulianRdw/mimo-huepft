// World 4 beach gestures for the jointed family figures, added to the table of coast-rig-actions.js, and the sustained
// poses a cast entry holds (a wave that goes on, a pen that keeps writing).
//   hooray   both arms up, bouncing, beaming (a find, a star, a landing)
//   applaud  hands clapping in front of the chest (loops)
//   write    the pen scribbles on a sheet in front of the figure, facing opts.dir (loops)
//   point    a lecturer's arm held out towards the audience, facing opts.dir (loops)
//   flail    arms up and thrashing (fell off the board; loops)
//   balance  arms out, wobbling; opts.amp 0..1 sets how much (standing on a board; loops)
//   thumb    one arm up with the thumb out (snorkeller; loops)
//   hop      one foot held up, an arm fanning the hot sand (loops)
//   pat      bent over, patting the sand ahead with both hands, facing opts.dir (loops)
//   kick     the juggler's feet, one beat per opts.beat seconds (loops)
//   flinch   a quick wince (cringe, protective arms), once
//   hug      both forearms folded over the chest round something held there, swaying (loops)
//   take     both hands reach out towards Mimo for the found item, facing opts.dir (loops)
//   peer     a magnifying glass held up in front of the face, facing opts.dir (the professor; loops)
//   offer    the microphone held out towards Mimo for an interview, facing opts.dir (loops)
// Clips get the running time w and the base pose and return joint targets (see coast-rig-actions.js). All of them are
// pure functions of w, so a figure looks the same on every replay.
(function () {
  'use strict';
  const { TAU, track } = window.MimoCoast.RigMath;
  const A = window.MimoCoast.FamilyActions;
  const env = (w, a, b, c, e) => track(w, [[a, 0], [b, 1, 'out'], [c, 1], [e, 0]]);
  const fwd = (k, d, a) => (k === 'l' ? 1 : -1) * d * a;   // an angle that reaches forward (d = facing) for arm k
  const nearArm = (d) => (d > 0 ? 'r' : 'l');

  A.hooray = (w, s) => {
    const amp = env(w, 0.15, 0.4, 1.9, 2.3), sw = Math.sin((w - 0.3) * TAU * 3), b = s.arm;
    const arm = (o, k) => ({
      upper: track(w, [[0, b[k].upper], [0.35, 142, 'out'], [2.0, 142], [2.5, b[k].upper, 'inOut']]) + 9 * amp * sw * o,
      fore: track(w, [[0, b[k].fore], [0.35, 168, 'out'], [2.0, 168], [2.5, b[k].fore, 'inOut']]) + 12 * amp * Math.sin((w - 0.3) * TAU * 3 - 0.8) * o,
    });
    return { arms: { l: arm(1, 'l'), r: arm(-1, 'r') }, bounce: 1.6 * amp * Math.abs(Math.sin((w - 0.2) * TAU * 1.5)), shrug: amp, headTilt: -3 * amp, brow: w < 0.5 ? 1 : 0, beam: w > 0.05, done: w > 2.6 };
  };

  A.applaud = (w, s) => {
    const k = track(w, [[0, 0], [0.3, 1, 'out']]), beat = 0.5 + 0.5 * Math.sin(w * TAU * 4.2), b = s.arm;
    const hold = (kk) => ({ upper: b[kk].upper + (24 - b[kk].upper) * k, fore: b[kk].fore + ((-104 - 16 * beat) - b[kk].fore) * k });
    return { arms: { l: hold('l'), r: hold('r') }, bounce: 0.5 * k * beat, headTilt: -2 * k, beam: w > 0.2, done: w > 2.4 };
  };

  A.write = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), o = k === 'r' ? 'l' : 'r', b = s.arm[k], ob = s.arm[o];
    const r = track(w, [[0, 0], [0.4, 1, 'out']]), scribble = Math.sin(w * TAU * 3.1) * 7 + Math.sin(w * TAU * 1.3) * 4;
    const out = {};
    out[k] = { upper: b.upper + (fwd(k, d, 40) - b.upper) * r, fore: b.fore + (fwd(k, d, 78 + scribble * 0.6) - b.fore) * r };
    out[o] = { upper: ob.upper + (fwd(o, d, 28) - ob.upper) * r, fore: ob.fore + (fwd(o, d, 70) - ob.fore) * r };
    return { arms: out, headTilt: 4 * r * d, torsoRot: s.torsoRot + 3 * r * d, brow: 0, prop: r > 0.5 ? { name: 'pen', hand: k } : null, done: w > 99 };
  };

  A.point = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), b = s.arm[k], r = track(w, [[0, 0], [0.5, 1, 'out']]), sway = Math.sin(w * TAU * 0.5) * 5;
    const out = {};
    out[k] = { upper: b.upper + (fwd(k, d, 62 + sway) - b.upper) * r, fore: b.fore + (fwd(k, d, 78 + sway * 0.5) - b.fore) * r };
    return { arms: out, headTilt: -3 * r * d, torsoRot: s.torsoRot + 2 * r * d, brow: Math.sin(w * TAU * 0.5) > 0.6 ? 1 : 0, done: w > 99 };
  };

  A.flail = (w, s) => {
    const r = track(w, [[0, 0], [0.25, 1, 'out']]), sw = Math.sin(w * TAU * 3), b = s.arm;
    const arm = (k, o) => ({ upper: b[k].upper + (150 + 26 * sw * o - b[k].upper) * r, fore: b[k].fore + (162 + 24 * Math.sin(w * TAU * 3 + 1.4) * o - b[k].fore) * r });
    return { arms: { l: arm('l', 1), r: arm('r', -1) }, torsoRot: 5 * Math.sin(w * TAU * 1.5) * r, headTilt: 7 * Math.sin(w * TAU * 1.5 + 1) * r, brow: 1, shrug: r, bounce: 0.8 * Math.abs(sw) * r, done: w > 99 };
  };

  A.balance = (w, s) => {
    const amp = Math.max(0.15, Math.min(1, (s.act && s.act.amp) || 0.3)), sw = Math.sin(w * TAU * 1.1), b = s.arm;
    const arm = (k, o) => ({ upper: b[k].upper + (52 + 26 * amp * sw * o - b[k].upper), fore: b[k].fore + (62 + 22 * amp * Math.sin(w * TAU * 1.1 + 0.8) * o - b[k].fore) });
    return { arms: { l: arm('l', 1), r: arm('r', -1) }, torsoRot: s.torsoRot + 4 * amp * sw, headTilt: -3 * amp * sw, shiftX: 1.4 * amp * sw, brow: amp > 0.6 ? 1 : 0, done: w > 99 };
  };

  A.thumb = (w, s) => {
    const r = track(w, [[0, 0], [0.4, 1, 'out']]), b = s.arm.r;
    return { arms: { r: { upper: b.upper + (138 + 4 * Math.sin(w * TAU * 0.9) - b.upper) * r, fore: b.fore + (176 - b.fore) * r } }, headTilt: -4 * r, beam: r > 0.5, shrug: 0.5 * r, done: w > 99 };
  };

  A.hop = (w, s) => {
    const r = track(w, [[0, 0], [0.2, 1, 'out']]), f = Math.sin(w * TAU * 2.4), b = s.arm;
    return {
      arms: { l: { upper: b.l.upper + (96 + 24 * f - b.l.upper) * r, fore: b.l.fore + (140 + 26 * f - b.l.fore) * r }, r: { upper: b.r.upper + (74 - 20 * f - b.r.upper) * r, fore: b.r.fore + (100 - 22 * f - b.r.fore) * r } },
      feet: { l: 0, r: 0, ry: 8 * r }, torsoRot: s.torsoRot + 5 * f * r, headTilt: 6 * f * r, brow: 1, done: w > 99,
    };
  };

  A.pat = (w, s) => {
    const d = (s.act && s.act.dir) || 1, r = track(w, [[0, 0], [0.4, 1, 'out']]), p = Math.sin(w * TAU * 2.6), b = s.arm;
    const arm = (k, o) => ({ upper: b[k].upper + (fwd(k, d, 34 + 12 * p * o) - b[k].upper) * r, fore: b[k].fore + (fwd(k, d, 14 + 12 * p * o) - b[k].fore) * r });
    return { arms: { l: arm('l', 1), r: arm('r', -1) }, torsoRot: s.torsoRot + (14 + 3 * p) * r * d, bounce: -(3.2 + 1.2 * p) * r, headTilt: 4 * r * d, beam: w > 1, done: w > 99 };
  };

  // the juggler: the foot of every beat lifts around the beat boundary (the ball is at the foot there); beat = seconds
  A.kick = (w, s) => {
    const beat = w / ((s.act && s.act.beat) || 0.42), m = Math.round(beat), x = (beat - m) / 0.3, lift = Math.abs(x) < 1 ? 6.5 * (1 + Math.cos(Math.PI * x)) / 2 : 0;
    const left = m % 2 === 0, b = s.arm, sw = Math.sin(beat * Math.PI);
    return {
      arms: { l: { upper: b.l.upper + 26 + 8 * sw, fore: b.l.fore + 30 }, r: { upper: b.r.upper + 26 - 8 * sw, fore: b.r.fore + 30 } },
      feet: { l: 0, r: 0, ly: left ? lift : 0, ry: left ? 0 : lift }, bounce: 0.6 * Math.abs(Math.sin(beat * Math.PI)), brow: 0, beam: true, done: w > 99,
    };
  };

  A.flinch = (w, s) => {
    const amp = env(w, 0, 0.08, 0.55, 1.0), b = s.arm;
    const arm = (k) => ({ upper: b[k].upper + 34 * amp, fore: b[k].fore + 70 * amp });
    return { arms: { l: arm('l'), r: arm('r') }, shrug: amp, headTilt: 5 * amp * ((s.act && s.act.dir) || 1), torsoRot: s.torsoRot - 3 * amp, bounce: -1.2 * amp, brow: amp > 0.2 ? 1 : 0, done: w > 1.1 };
  };

  // hug: both forearms fold over the chest round something held there, a happy sway (the kid and his ball; loops)
  A.hug = (w, s) => {
    const k = track(w, [[0, 0], [0.3, 1, 'out']]), sw = Math.sin(w * TAU * 1.2), b = s.arm;
    const hold = (kk, o) => ({ upper: b[kk].upper + (30 - b[kk].upper) * k, fore: b[kk].fore + ((-118 + 6 * sw * o) - b[kk].fore) * k });
    return { arms: { l: hold('l', 1), r: hold('r', -1) }, torsoRot: s.torsoRot + 4 * sw * k, headTilt: -5 * sw * k, beam: w > 0.15, shrug: 0.6 * k, done: w > 99 };
  };

  // take: both hands reach forward and a little down towards Mimo (the hand-over at the door), facing opts.dir (loops)
  A.take = (w, s) => {
    const d = (s.act && s.act.dir) || 1, r = track(w, [[0, 0], [0.22, 1, 'out']]), b = s.arm;
    const arm = (k, o) => ({ upper: b[k].upper + (fwd(k, d, 58 + 4 * o) - b[k].upper) * r, fore: b[k].fore + (fwd(k, d, 84 + 6 * o) - b[k].fore) * r });
    return { arms: { l: arm('l', 1), r: arm('r', -1) }, torsoRot: s.torsoRot + 7 * r * d, headTilt: 5 * r * d, bounce: -0.8 * r, beam: true, brow: 1, done: w > 99 };
  };
  // peer: the near hand holds a magnifying glass up in front of the face, the head leans in (the professor; loops)
  A.peer = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), o = k === 'r' ? 'l' : 'r', b = s.arm[k], ob = s.arm[o];
    const r = track(w, [[0, 0], [0.35, 1, 'out']]), sway = Math.sin(w * TAU * 0.7) * 4;
    const out = {};
    out[k] = { upper: b.upper + (fwd(k, d, 44 + sway) - b.upper) * r, fore: b.fore + (fwd(k, d, 150 + sway) - b.fore) * r };
    out[o] = { upper: ob.upper + (fwd(o, d, 34) - ob.upper) * r, fore: ob.fore + (fwd(o, d, 96) - ob.fore) * r };
    return { arms: out, headTilt: 7 * r * d, torsoRot: s.torsoRot + 5 * r * d, brow: 1, prop: r > 0.4 ? { name: 'lens', hand: k } : null, done: w > 99 };
  };
  // offer: the near arm holds the microphone out towards Mimo (an interview), facing opts.dir (loops)
  A.offer = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), b = s.arm[k], r = track(w, [[0, 0], [0.3, 1, 'out']]), bob = Math.sin(w * TAU * 0.9) * 3;
    const out = {};
    out[k] = { upper: b.upper + (fwd(k, d, 72 + bob) - b.upper) * r, fore: b.fore + (fwd(k, d, 112 + bob) - b.fore) * r };
    return { arms: out, headTilt: -3 * r * d, torsoRot: s.torsoRot + 4 * r * d, beam: true, prop: r > 0.3 ? { name: 'mic', hand: k } : null, done: w > 99 };
  };

  // pose name -> { act, loop: [from, length] | null, dir? }: what a cast entry holds while it is in that pose.
  // The loop length covers whole periods of the clip's oscillations, so the repeat does not jump.
  window.MimoCoast.castPoses = {
    wave: { act: 'wave', loop: [0.8, 1.3043] },
    fan: { act: 'cheer', loop: [0.5, 1.5385] },
    pen: { act: 'pen', loop: [0.55, 1.7647] },
    mic: { act: 'mic', loop: [0.6, 1.1111] },
    cam: { act: 'film', loop: [0.5, 2.5] },
    hooray: { act: 'hooray', loop: [0.5, 1.0] },
    applaud: { act: 'applaud', loop: [0.4, 1.9048] },
    write: { act: 'write', loop: [0.5, 1.0323], sided: true },
    point: { act: 'point', loop: [0.6, 4], sided: true },
    flail: { act: 'flail', loop: [0.3, 1.0] },
    balance: { act: 'balance', loop: [0.2, 1.8182] },
    thumb: { act: 'thumb', loop: [0.5, 2.2222] },
    hop: { act: 'hop', loop: [0.3, 0.8333] },
    pat: { act: 'pat', loop: [0.5, 1.5385], sided: true },
    kick: { act: 'kick', loop: [0.2, 0.84] },
    hug: { act: 'hug', loop: [0.3, 0.8333] },
    take: { act: 'take', loop: [0.3, 1], sided: true },
    peer: { act: 'peer', loop: [0.4, 1.4286], sided: true },
    offer: { act: 'offer', loop: [0.4, 1.1111], sided: true },
  };
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
