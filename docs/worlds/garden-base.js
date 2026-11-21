// The main menu's garden party (src/index.html draws it, "Main menu backdrop"): the shared base of the act files.
// Every prank is an act in a file of its own (garden-chase.js, garden-caspar.js, garden-pranks.js) that registers itself
// with Garden.act({...}); the engine in src/index.html merges all acts into one loop of Garden.LOOP seconds.
//
// The cast (ids of the coast rigs, see coast-rig-data.js) and their names in the family's lines:
//   redbeard = Ole, striped = Julian, sidepart = Caspar, kid = Mats, reporter = Naike, filmer = Ulrike (camera),
//   professor = Christof, dog = Lotta (the cream retriever), mimo = Mimo, gull = the gull on the fence post
//
// An act: {
//   name, span: [t0, t1]               its time window in the loop (acts must not move the same figure at the same time)
//   x:    { who: [[t, x, ease?], ...] } where a figure walks (garden units; out of the picture: -240 / 800); every track
//                                      starts and ends at the figure's home (Garden.HOME) inside the span
//   pose: { who: [[t, pose, dir, face, expr], ...] }  held from t on; after span[1] the figure's default pose is back
//         pose: a pose of coast-cast-actions.js (wave fan pen mic cam hooray applaud write point flail balance thumb hop
//         pat kick hug take peer offer) or a one-off gesture ('throw', 'flinch', 'cheer'), dir: -1/1 for sided poses,
//         face: -1/0/1 the standing three-quarter view, expr: 'ouch' (striped) 'wow' (kid) 'serious' 'sure' 'daze'
//   hold: { who: [[t, propName | null, hand], ...] }   what a hand holds (props of the rigs, Garden.addProp adds more)
//   lines: [[t, who, text, seconds, quiet], ...]        speech bubbles (shown only while the speaker is in the picture)
//   focus: [[t, x, ease?], ...]        where the camera of an upright phone looks (the engine fills the quiet gaps)
//   figure(k, t, A) -> { look, asleep, y, hop } | null   per-frame overrides for a person k ({ who, x, y, p })
//   person(c, k, t, A) -> true          draw person k yourself (sunk in a hole, fallen over); true = done
//   after(c, k, t, A)                   draw on top of person k (drips, ketchup on the face)
//   back(c, t, A)                       draw before the people (props on the ground, a hole)
//   front(c, t, A)                      draw after the people, the dog and Mimo (flying things, a towel)
//   talk(c, t, A)                       comic words: A.pop(c, text, x, y, k, rot, size, colours)
//   dog(t, A) -> { pose, carry, carryDraw, lookAt, happy, jump } | null   Lotta (her x is the 'dog' track in x)
//   mimo(t, A) -> { hop, mood, face } | null                            Mimo (his x is the 'mimo' track in x)
//   grill(t) -> number                  how many sausages lie on the grill (3 when no act says otherwise)
//   sounds: [[t, name], ...]            comic sounds, played once when the loop passes t (A.SOUNDS lists the names)
// }
// A (the engine's helpers, given to every hook): GD, pal, now, who(id), head(k), hand(k, 'l'|'r'), at, hold, inn,
// ease, towel(c, x, y, w, h, rot), sausage(c, x, y, rot), pop(...), sound(name), dogX, mimoX, view [x0, x1].
// Time is the loop time t (seconds); everything is a function of t, so jumping in the loop (tests) shows the same.
(function () {
  'use strict';
  const G = window.Garden = window.Garden || {};
  G.acts = G.acts || [];
  G.LOOP = 160;   // windows: chase 6-26, bury 32-56, ketchup 62-75, rescue 80-103, water bomb 106-120, chair 121-132, ice 133-141, revenge 146-160; quiet parts between
  // the garden: GD.W units wide; feet of the back row at about 170, the front row at 186
  G.GD = { W: 560, BACK: 170, FRONT: 186, GRILL: { x: 112, y: 168 }, TABLE: { x: 205, y: 168 }, CHAIR: { x: 300, y: 176 }, BOX: { x0: 372, x1: 488, y: 192 }, POST: { x: 344, y: 110 }, HOLE: 430, SAND: 189 };
  G.HOME = { redbeard: 88, striped: 196, kid: 152, reporter: 226, filmer: 302, professor: 330, sidepart: 370, dog: 134, mimo: 250 };
  G.Y = { redbeard: 170, striped: 168, kid: 182, reporter: 172, filmer: 170, professor: 170, sidepart: 176 };
  // what each one does when no act says otherwise: [pose, dir, face, expr]
  G.DEFAULT = { redbeard: ['pat', 1, 1], striped: [null, 0, 0], kid: [null, 0, 0], reporter: ['mic', 0, 1], filmer: ['cam', 0, -1], professor: [null, 0, 0], sidepart: [null, 0, 0] };
  G.NAMES = { redbeard: 'Ole', striped: 'Julian', sidepart: 'Caspar', kid: 'Mats', reporter: 'Naike', filmer: 'Ulrike', professor: 'Christof', dog: 'Lotta', mimo: 'Mimo' };

  G.ease = { lin: (k) => k, io: (k) => k * k * (3 - 2 * k), out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, back: (k) => { const s = 1.7; k -= 1; return 1 + k * k * ((s + 1) * k + s); } };
  // a value along keys [[t, v, ease?], ...] (eased towards each key)
  G.at = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) { const [t1, v1, e] = keys[i]; if (t < t1) { const [t0, v0] = keys[i - 1]; const k = (t - t0) / Math.max(1e-6, t1 - t0); return v0 + (v1 - v0) * G.ease[e || 'io'](Math.max(0, Math.min(1, k))); } }
    return keys[keys.length - 1][1];
  };
  // the key in force at t of keys [[t, ...], ...] (null before the first)
  G.hold = (keys, t) => { let v = null; for (const k of keys) { if (t >= k[0]) v = k; else break; } return v; };
  G.inn = (t, a, b) => t >= a && t < b;
  G.act = (def) => { G.acts.push(def); G.compiled = null; };

  // a hand prop for a family rig, drawn in a 24 x 24 box with the hand at 0,0 and the tip up (see coast-rig-props.js);
  // call it while the file loads (before the pictures load)
  G.addProp = (who, name, body) => {
    const R = window.MimoCoast && window.MimoCoast.FAMILY_RIGS;
    if (!R || !R[who]) return;
    R[who].props = Object.assign({}, R[who].props, { [name]: { box: [-12, -12, 24, 24], svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24" width="24" height="24">' + body + '</svg>' } });
  };
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
