// World 4 rig gestures: wave, cheer, pen, mic, clapperboard, film, throw. Ported unchanged from the Bad Nenndorf branch
// (src/nenndorf/figuren/actions.js); coast-cast-actions.js adds the beach gestures to the same table.
// Each clip gets its running time w and the base pose and returns joint targets; the figure's springs turn them into motion.
// Arm angles in degrees from straight down, positive = away from the body.
(function () {
  'use strict';
  window.MimoCoast = window.MimoCoast || {};

  const { TAU, track } = window.MimoCoast.RigMath;

  // amplitude envelope: 0 before a, rises until b, holds until c, falls until e
  const env = (w, a, b, c, e) => track(w, [[a, 0], [b, 1, 'out'], [c, 1], [e, 0]]);

  // keyframes that may contain zero-length steps (when an optional phase is skipped)
  const keys = (list) => list.filter((k, i) => i === 0 || k[0] > list[i - 1][0] + 1e-6);

  const ACTIONS = {
    // big friendly wave with the right hand
    wave(w, s) {
      const osc = w > 0.55 && w < 2.4 ? Math.sin((w - 0.55) * TAU * 2.3) : 0;
      const amp = env(w, 0.55, 0.8, 2.1, 2.4);
      const b = s.arm.r;
      const out = {
        arms: {
          r: {
            upper: track(w, [[0, b.upper], [0.2, b.upper - 5, 'out'], [0.55, 66, 'out'], [2.35, 66], [2.95, b.upper, 'inOut']]) + 4 * amp * Math.sin((w - 0.55) * TAU * 2.3 - 1.0),
            fore: track(w, [[0, b.fore], [0.2, b.fore - 9, 'out'], [0.55, 158, 'out'], [2.35, 158], [2.95, b.fore, 'inOut']]) + 22 * amp * osc,
          },
        },
        shrug: track(w, [[0.2, 0], [0.55, 1, 'out'], [2.35, 1], [2.9, 0]]),
        brow: w < 0.75 ? 1 : 0,
        beam: w > 0.12,
        done: w > 3.0,
      };
      if (s.standing) {
        out.headTilt = track(w, [[0, s.headTilt], [0.5, -5, 'out'], [2.4, -4], [3.0, s.headTilt]]);
        out.torsoRot = track(w, [[0, s.torsoRot], [0.55, 1.6, 'out'], [2.4, 1.6], [3.0, s.torsoRot]]);
        out.arms.l = { upper: s.arm.l.upper + 2.5 * env(w, 0.3, 0.6, 2.4, 2.9), fore: s.arm.l.fore };
      }
      return out;
    },

    // football fan: fist up, pumping, a black and yellow scarf swinging from the hand, little hops
    cheer(w, s) {
      const amp = env(w, 0.35, 0.5, 2.0, 2.3);
      const pump = Math.sin((w - 0.35) * TAU * 2.6);
      const b = s.arm.r;
      return {
        arms: {
          r: {
            upper: track(w, [[0, b.upper], [0.15, b.upper - 6, 'out'], [0.4, 100, 'out'], [2.05, 100], [2.5, b.upper, 'inOut']]) + 9 * amp * pump,
            fore: track(w, [[0, b.fore], [0.15, b.fore - 10, 'out'], [0.4, 158, 'out'], [2.05, 158], [2.5, b.fore, 'inOut']]) + 12 * amp * Math.sin((w - 0.35) * TAU * 2.6 - 0.7),
          },
          l: { upper: s.arm.l.upper + 14 * amp, fore: s.arm.l.fore + 30 * amp },
        },
        bounce: 1.3 * amp * Math.abs(Math.sin((w - 0.35) * TAU * 1.3)),
        headTilt: -4 * amp,
        shrug: amp,
        brow: w < 0.6 ? 1 : 0,
        beam: w > 0.1,
        prop: w > 0.32 && w < 2.3 ? { name: 'scarf', hand: 'r' } : null,
        done: w > 2.7,
      };
    },

    // raises the fountain pen, makes a point with small emphatic movements
    pen(w, s) {
      const amp = env(w, 0.4, 0.55, 2.4, 2.7);
      const b = s.arm.r;
      return {
        arms: {
          r: {
            upper: track(w, [[0, b.upper], [0.4, 28, 'out'], [2.45, 28], [2.95, b.upper, 'inOut']]),
            fore: track(w, [[0, b.fore], [0.4, 172, 'out'], [2.45, 172], [2.95, b.fore, 'inOut']]) + 7 * amp * Math.sin((w - 0.4) * TAU * 1.7),
          },
          l: { upper: s.arm.l.upper + 4 * amp, fore: s.arm.l.fore - 6 * amp },
        },
        headTilt: -3 * amp + 1.5 * amp * Math.sin((w - 0.4) * TAU * 0.85),
        torsoRot: s.torsoRot + 1.2 * amp,
        shrug: 0.6 * amp,
        brow: amp > 0.3 ? 1 : 0,
        prop: w > 0.3 && w < 2.6 ? { name: 'pen', hand: 'r' } : null,
        done: w > 3.1,
      };
    },

    // reporter: holds the microphone out towards Mimo
    mic(w, s) {
      const k = s.side; // arm towards Mimo
      const amp = env(w, 0.4, 0.6, 2.7, 3.0);
      const b = s.arm[k];
      const arms = {};
      arms[k] = {
        upper: track(w, [[0, b.upper], [0.45, 64, 'out'], [2.75, 64], [3.25, b.upper, 'inOut']]) + 3 * amp * Math.sin((w - 0.45) * TAU * 0.9),
        fore: track(w, [[0, b.fore], [0.45, 98, 'out'], [2.75, 98], [3.25, b.fore, 'inOut']]),
      };
      return {
        arms,
        headTilt: (k === 'l' ? 4 : -4) * amp,
        torsoRot: s.torsoRot + (k === 'l' ? 1.5 : -1.5) * amp,
        shrug: k === 'r' ? 0.4 * amp : 0,
        brow: w > 0.6 && w < 1.4 ? 1 : 0,
        prop: w > 0.15 && w < 3.15 ? { name: 'mic', hand: k, upright: true } : null,
        done: w > 3.4,
      };
    },

    // film maker: lifts the clapperboard, claps it shut, nods
    clap(w, s) {
      const amp = env(w, 0, 0.35, 1.6, 1.95);
      const hold = (upper, fore) => ({ upper: track(w, [[0, upper.b], [0.35, upper.t, 'out'], [1.6, upper.t], [2.0, upper.b, 'inOut']]), fore: track(w, [[0, fore.b], [0.35, fore.t, 'out'], [1.6, fore.t], [2.0, fore.b, 'inOut']]) });
      return {
        arms: {
          l: hold({ b: s.arm.l.upper, t: 22 }, { b: s.arm.l.fore, t: -118 }),
          r: hold({ b: s.arm.r.upper, t: 22 }, { b: s.arm.r.fore, t: -118 }),
        },
        headTilt: track(w, [[0.8, 0], [0.95, 3, 'out'], [1.2, 0]]),
        brow: w > 0.4 && w < 0.85 ? 1 : 0,
        beam: w > 0.95 && w < 1.7,
        prop: w > 0.12 && w < 1.72 ? { name: w < 0.9 ? 'clapOpen' : 'clapShut', hand: 'both', offset: [0, -0.6], flash: w > 0.9 && w < 1.0 } : null,
        done: w > 2.2,
      };
    },

    // filming Mimo with the video camera, the red light blinks
    film(w, s) {
      const amp = env(w, 0, 0.45, 3.2, 3.6);
      const hold = (b, t) => track(w, [[0, b], [0.45, t, 'out'], [3.2, t], [3.65, b, 'inOut']]);
      return {
        arms: {
          l: { upper: hold(s.arm.l.upper, 26), fore: hold(s.arm.l.fore, -124) },
          r: { upper: hold(s.arm.r.upper, 26), fore: hold(s.arm.r.fore, -124) },
        },
        headTilt: 2.5 * amp * Math.sin(w * TAU * 0.4),
        torsoRot: s.torsoRot + 1.0 * amp * Math.sin(w * TAU * 0.4 + 1),
        prop: w > 0.12 && w < 3.55 ? { name: 'camera', hand: 'both', offset: [-1.4, 0.6], rec: true } : null,
        done: w > 3.8,
      };
    },
  };

  // Throwing a ball, in phases:
  //  pick:    (only if the ball lies at the feet) lean forward, bend the knees, the hand reaches the ball (arm IK)
  //  windup:  straighten up, throwing hand goes back behind the head, the other arm points at the target,
  //           weight on the back foot
  //  snap:    step forward with the front foot, hips and chest turn into the throw, the arm whips forward;
  //           the joint springs make the forearm lag (whip). The ball leaves the hand while it moves forward
  //  follow:  the arm swings through, the body settles
  // s.dir: throw direction, s.pick: ball at the feet, s.ball: ball position in figure coordinates
  ACTIONS.throw = function (w, s) {
    const d = s.dir || 1, k = d > 0 ? 'r' : 'l', o = k === 'r' ? 'l' : 'r';
    const sgn = k === 'l' ? 1 : -1, osg = -sgn;
    const A = (a) => sgn * d * a, B = (a) => osg * d * a; // forward angles for the throwing and the other arm
    const pk = s.pick ? 0.8 : 0.1;          // end of the pick-up phase
    const wu = pk + 0.42;                   // windup complete
    const snap = wu + 0.06;                 // the arm starts forward
    const rel = snap + 0.1;                 // ball leaves the hand
    const end = rel + 0.9;
    const b = s.arm[k], ob = s.arm[o];
    const arms = {};
    arms[k] = {
      upper: track(w, keys([[0, b.upper], [pk, b.upper], [wu, A(-55), 'inOut'], [snap, A(-60)], [snap + 0.01, A(75), 'linear'], [rel + 0.35, A(40)], [end, b.upper, 'inOut']])),
      fore: track(w, keys([[0, b.fore], [pk, b.fore], [wu, A(-160), 'inOut'], [snap, A(-165)], [snap + 0.01, A(40), 'linear'], [rel + 0.35, A(15)], [end, b.fore, 'inOut']])),
    };
    arms[o] = {
      upper: track(w, keys([[0, ob.upper], [pk, s.pick ? B(-15) : ob.upper], [wu, B(70), 'inOut'], [snap, B(70)], [rel + 0.15, B(-25), 'out'], [end, ob.upper, 'inOut']])),
      fore: track(w, keys([[0, ob.fore], [pk, s.pick ? B(-10) : ob.fore], [wu, B(80), 'inOut'], [snap, B(80)], [rel + 0.15, B(-5), 'out'], [end, ob.fore, 'inOut']])),
    };
    // the ball at the feet: reach it with the throwing hand
    let reach = null;
    if (s.pick && s.ball && w < pk) {
      const wgt = track(w, [[0, 0], [0.38, 1, 'inOut'], [0.55, 1], [pk, 0, 'inOut']]);
      reach = { arm: k, target: [s.ball[0], s.ball[1]], w: wgt };
    }
    const feet = {};
    feet[k] = track(w, keys([[0, 0], [snap, -d * 1.0], [rel + 0.2, -d * 0.5], [end, 0]]));          // back foot
    feet[o] = track(w, keys([[0, 0], [wu, 0], [rel, d * 4.5, 'out'], [rel + 0.5, d * 4.5], [end, 0, 'inOut']])); // step forward
    return {
      arms, reach, feet,
      shiftX: track(w, keys([[0, 0], [wu, -d * 1.0, 'inOut'], [rel, d * 1.6, 'out'], [rel + 0.5, d * 1.2], [end, 0, 'inOut']])),
      torsoRot: track(w, keys([[0, s.torsoRot], [pk * 0.5, s.pick ? d * 32 : s.torsoRot, 'inOut'], [pk * 0.7, s.pick ? d * 32 : s.torsoRot], [pk, s.pick ? d * 4 : s.torsoRot, 'inOut'], [wu, -d * 8, 'inOut'], [rel, d * 11, 'out'], [rel + 0.4, d * 6], [end, s.torsoRot, 'inOut']])),
      dip: track(w, keys([[0, 0], [pk * 0.5, s.pick ? 6.5 : 0, 'inOut'], [pk * 0.7, s.pick ? 6.5 : 0], [pk, 0.5, 'inOut'], [wu, 1.0], [rel, 2.0, 'out'], [end, 0, 'inOut']])),
      holdBall: (s.pick ? w > pk * 0.55 : w > 0.02) && w < rel ? k : null,
      release: w >= rel ? k : null,
      headTilt: track(w, keys([[0, 0], [pk * 0.5, s.pick ? d * 8 : 0], [pk, 0], [rel, d * 3], [end, 0]])),
      brow: w > pk && w < rel ? 1 : 0,
      beam: w > rel + 0.1,
      done: w > end,
    };
  };

  window.MimoCoast.FamilyActions = ACTIONS;
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
