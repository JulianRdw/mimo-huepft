// World 6 boss "Mondwurm Käsebert": the intro, the scenes between the phases and the grand finale of the game.
// Intro: the worm rises out of the middle crater like a tower and looks down at Mimo.
// Scene 1 (into phase 2, "Sternschnuppen"): he shoots up out of the middle crater, shakes himself, and two shooting
//   stars fall out of the sky and stay hanging under the tops of the arcs. Then he sinks back.
// Scene 2 (into phase 3, "Dunkle Seite"): a giant arc over the whole crater field, from the first crater to the last;
//   while he passes over, the light goes out. The pink segment glows in the dark.
// Finale: he giggles so much that he hiccups out what lay heavy in his belly: an astronaut's glass helmet. It sails
//   over and lands on Mimo (the reward, "Glashelm"). The light comes back, the Earth rises over the horizon,
//   Käsebert munches his cheese happily, and the door is the hatch of a rocket home.
// The core shows the scene bars and lets Mimo wait (state "cine"). A skipped scene ends exactly where a watched one ends.
(function () {
  'use strict';
  let api = null;
  const K = () => window.MimoKaese;

  const SCENE = [null,
    { len: 4.4, UP0: 0.2, UP1: 1.2, STARS0: 1.4, STARS1: 2.6, DOWN0: 3.1, DOWN1: 4.2 },
    { len: 5.0, GO: 0.2, SPEED: 330, DARK0: 1.4, DARK1: 2.9 },
  ];
  const FIN = { HICK: 0.55, HELM0: 0.6, HELM1: 2.1, HELM_ARC: 170, FREE: 2.4, GIFT: 3.5, LIGHT0: 1.0, LIGHT1: 3.0, EARTH0: 2.2, EARTH1: 6.5, MUNCH: 6.2, HOME: 8.4 };
  const DOOR = { x: 22, y: 9 };                     // the rocket's hatch; one tile in from the edge so the rocket fits on small screens
  const FREE_LINE = 'Oh. Mein Bauch ist wieder frei.', GIFT_LINE = 'Den Glashelm hatte ich verschluckt. Der gehört jetzt dir!';
  const MUNCH_LINE = 'Danke, kleiner Piep. Jetzt passt wieder Käse rein!', HOME_LINE = 'Zeit, nach Hause zu fliegen.';

  // ---------- the intro: up out of the middle crater, slowly the first time ----------
  function introRise(B) {
    const c = B.cine; if (!c) return;
    if (!B.introP) { B.introP = K().towerPath(1, 205, -60); K().setPath(B, B.introP, -K().HEAD_R - 30); }
    const t0 = c.full ? 0.5 : 0.05, dur = c.full ? 1.4 : 0.7, k = K().ease((c.t - t0) / dur), P = B.introP;
    B.s = K().lerp(-K().HEAD_R - 30, P.total, k);
    if (k > 0 && !B.rose) { B.rose = true; api.sfx.boom(); api.shake(0.6); api.burst(K().CRATERS[1], K().GY - 6, 24, [api.W.dust || '#ECEAF8', api.W.cheese || '#F3D98B'], 220, { grav: 300, vy: -200 }); }
    if (k < 1) K().tremble(B, 1, 1 - k);
  }

  // ---------- the scenes ----------
  function startScene(B) {
    B.scene = { ph: B.scenePending, t: 0 };
    B.scenePending = null; B.shots.length = 0; B.giggle = 0; B.mood = 'grumpy';
    const sc = B.scene;
    if (sc.ph === 1) { sc.P = K().towerPath(1, 225, 50); K().setPath(B, sc.P, -K().HEAD_R - 30); }
    else { sc.P = K().arcPath(0, 2, 250); K().setPath(B, sc.P, -K().HEAD_R - 30); const m = window.MimoMoon.state(api.L); m.dark = { r: K().DARKSIDE.r, a: 0 }; B.darkK = 0; }
    api.boss.scene(B, SCENE[sc.ph].len);
    api.boss.set(B, 'scene');
  }
  function stepScene(B, dt) {
    const sc = B.scene; if (!sc) return;
    sc.t += dt;
    if (sc.ph === 1) sceneStars(B, sc); else sceneDark(B, sc, dt);
  }
  // scene 1: the tower, the shake, the falling stars
  function sceneStars(B, sc) {
    const S = SCENE[1], t = sc.t, P = sc.P, low = -K().HEAD_R - 30;
    if (t < S.DOWN0) B.s = K().lerp(low, P.total, K().ease((t - S.UP0) / (S.UP1 - S.UP0)));
    else B.s = K().lerp(P.total, low, K().ease((t - S.DOWN0) / (S.DOWN1 - S.DOWN0)));
    if (t > S.UP0 && !sc.up) { sc.up = true; api.sfx.boom(); api.shake(0.8); }
    if (t < S.UP1) K().tremble(B, 1, 1);
    // he shakes himself (the head wobbles), the stars come down
    B.shakeK = t > S.UP1 && t < S.DOWN0 ? 1 : 0;
    sc.stars = K().clamp((t - S.STARS0) / (S.STARS1 - S.STARS0), 0, 1);
    if (t > S.STARS0 && !sc.brr) { sc.brr = true; api.boss.say(B.def.name, 'Brrrr!', 1.0, B.kind); api.noise({ hp: 1200, dur: 0.8, vol: 0.03 }); }
    if (sc.stars >= 1 && !sc.landed) { sc.landed = true; api.voice({ type: 'sine', f0: 660, f1: 1760, slide: 0.25, dur: 0.3, vol: 0.035 }); for (const x of starXs()) api.ring(x, K().STAR_Y, api.W.boost || '#BFF3FF'); }
  }
  const starXs = () => [0, 1].map((i) => (K().CRATERS[i] + K().CRATERS[i + 1]) / 2);
  // scene 2: one giant arc over the whole field, the light goes out
  function sceneDark(B, sc, dt) {
    const S = SCENE[2], t = sc.t, P = sc.P;
    if (t > S.GO) B.s += S.SPEED * dt;
    if (t > S.GO && !sc.go) { sc.go = true; api.sfx.boom(); api.shake(0.7); }
    if (B.s < 60) K().tremble(B, 0, 1);
    B.darkK = K().ease((t - S.DARK0) / (S.DARK1 - S.DARK0));
    if (B.s > P.total - 40 && !sc.dive) { sc.dive = true; api.sfx.stomp(); api.shake(0.5); api.burst(K().CRATERS[2], K().GY - 4, 14, [api.W.dust || '#ECEAF8'], 160, { grav: 260, vy: -120 }); }
  }
  // the end of a scene (or a skip): the arena is exactly what the new phase needs, the worm is under the ground
  function finishScene(B) {
    const sc = B.scene; B.scene = null; B.shakeK = 0;
    K().buildArena(B, sc.ph);
    K().setPath(B, K().arcFor(sc.ph, 0, 1), -K().HEAD_R - 20);
    B.pass = null; B.wait = 0.3; B.mood = 'grumpy';
    const p = api.p;
    if (!p.grounded) { p.x = api.G.respawn.x; p.y = api.G.respawn.y; p.vy = 0; }
    api.music.setIntensity(sc.ph);
  }

  // ---------- the finale ----------
  function defeat(B) {
    B.fin = { helm: null, hick: false, free: false, gift: false, munch: false, home: false, dark0: B.darkK };
    B.mood = 'giggle'; B.giggle = 1; B.shots.length = 0;
    for (const b of B.back) b.off = true;
  }
  function afterDefeat(B, dt) {
    const f = B.fin, t = B.t, p = api.p;
    if (!f) return;
    // hicks: the pink segment pops the glass helmet out of his belly
    if (t >= FIN.HICK && !f.hick) {
      f.hick = true; const q = K().pink(B);
      f.helm = { x0: q.x, y0: q.y, x: q.x, y: q.y, k: 0, rot: 0 };
      api.sfx.pop(); api.sfx.boom(); api.shake(0.9); B.giggle = 1;
      api.burst(q.x, q.y, 26, ['#F2A7BC', '#FFFFFF', api.W.cheese || '#F3D98B'], 220, { grav: 200 });
      api.ring(q.x, q.y, '#F2A7BC');
    }
    f.pinkK = f.hick ? Math.max(0, 1 - (t - FIN.HICK) * 2) : 1;
    // the helmet sails over and lands on Mimo's head
    if (f.helm && !B.helmOn) {
      const k = K().clamp((t - FIN.HELM0) / (FIN.HELM1 - FIN.HELM0), 0, 1), tx = p.x + p.w / 2, ty = p.y + p.h - 15;
      f.helm.x = K().lerp(f.helm.x0, tx, K().ease(k)); f.helm.y = K().lerp(f.helm.y0, ty, k) - Math.sin(k * Math.PI) * FIN.HELM_ARC; f.helm.rot = (1 - k) * Math.PI * 3; f.helm.k = k;
      if (k >= 1) { B.helmOn = true; api.boss.wear(); api.sfx.key(); api.ring(tx, ty, api.P.key); api.burst(tx, ty, 14, [api.P.key, '#FFFFFF', '#F2A7BC'], 120, { grav: 200 }); api.setMood('happy', 2); }
    }
    if (t >= FIN.FREE && !f.free) { f.free = true; B.mood = 'happy'; api.boss.say(B.def.name, FREE_LINE, 1.6, B.kind); }
    if (t >= FIN.GIFT && !f.gift) { f.gift = true; api.boss.say(B.def.name, GIFT_LINE, 2.6, B.kind); }
    // the light comes back (the dark side of phase 3 turns to day), then the Earth rises over the horizon
    B.darkK = f.dark0 * (1 - K().ease((t - FIN.LIGHT0) / (FIN.LIGHT1 - FIN.LIGHT0)));
    B.earth = K().ease((t - FIN.EARTH0) / (FIN.EARTH1 - FIN.EARTH0));
    if (t >= FIN.MUNCH && !f.munch) { f.munch = true; B.mood = 'munch'; api.boss.say(B.def.name, MUNCH_LINE, 2.6, B.kind); }
    if (t >= FIN.HOME && !f.home) { f.home = true; api.bubble(HOME_LINE, 'player', 2.2); }
  }
  const door = () => ({ x: DOOR.x, y: DOOR.y });

  window.MimoWorlds.register({ world: 6, setup(a) { api = a; } });
  Object.assign(window.MimoKaese = window.MimoKaese || {}, { SCENE, FIN, DOOR, introRise, startScene, stepScene, finishScene, defeat, afterDefeat, door, starXs });
})();
