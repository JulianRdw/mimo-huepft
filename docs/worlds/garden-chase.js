// Garden party (see garden-base.js): the chase, and the quiet chat between Naike and Mimo after it.
//   10-22  Lotta snaps a sausage off the grill and runs out on the right, Ole, Mats, Caspar and Mimo after her; they
//          all come back in on the left, Lotta first, and she eats it ("Mampf!")
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H } = G;
  G.act({
    name: 'chase', span: [8, 24],
    x: {
      redbeard: [[10.8, H.redbeard], [15.8, 800, 'in'], [15.81, -240], [20.0, 70, 'out'], [21, H.redbeard]],
      kid: [[11.0, H.kid], [16.0, 800, 'in'], [16.01, -240], [20.6, H.kid, 'out']],
      sidepart: [[11.2, H.sidepart], [16.4, 800, 'in'], [16.41, -240], [22.5, H.sidepart, 'out']],
      dog: [[10.3, H.dog], [14.8, 800, 'in'], [14.81, -240], [19.0, 140, 'out'], [20, H.dog]],
      mimo: [[11.4, H.mimo], [16.6, 800, 'in'], [16.61, -240], [21.5, H.mimo, 'out']],
    },
    pose: {
      redbeard: [[10.2, 'flail', 0, 1], [10.8, null], [20.4, null, 0, 0, null], [21, 'pat', 1, 1]],
      kid: [[10.4, 'hooray'], [10.9, null], [20.8, 'hooray'], [21.6, null]],
    },
    lines: [[10.2, 'redbeard', 'Mein Würstchen!', 1.8], [17.4, 'kid', 'Da ist sie wieder!', 1.6], [21.2, 'redbeard', 'Na gut. Dann eben das nächste.', 2.2]],
    focus: [[10, 160], [10.6, 160], [14.8, 470, 'lin'], [15.6, 470], [17.2, 110], [21, 160]],
    sounds: [[10.0, 'plopp'], [19.2, 'mampf']],
    figure(k, t, A) { return A.inn(t, 10.0, 21) ? { look: A.dogX - k.x } : null; },
    dog(t, A) {
      const o = { pose: t < 10.05 || t > 20 ? 'sit' : 'stand', lookAt: t < 10.05 ? -22 : null };
      if (A.inn(t, 10.25, 19.2)) { o.carry = 'sausage'; o.carryDraw = (g, cx, cy) => A.sausage(g, cx, cy, 0.2); }
      if (A.inn(t, 10.05, 10.3)) o.jump = 0.9;
      if (t > 19.2 && t < 20.5) o.happy = 1;
      return o;
    },
    grill(t) { return t >= 10.0 && t < 21 ? 2 : 3; },
    front(c, t, A) {
      if (A.inn(t, 10.0, 10.3)) { const k = (t - 10) / 0.3, g = A.GD.GRILL; A.sausage(c, g.x + 2 + (A.dogX + 10 - g.x - 2) * k, g.y - 26 - Math.sin(k * Math.PI) * 26 + k * 16, k * 6); }
    },
    talk(c, t, A) {
      A.pop(c, 'Plopp!', A.GD.GRILL.x + 6, A.GD.GRILL.y - 38, (t - 10.0) / 0.9, -0.12, 13);
      A.pop(c, 'Mampf!', 150, 160, (t - 19.2) / 1.1, 0.1, 13);
    },
  });
  // the quiet part after the chase: Naike interviews Mimo
  G.act({
    name: 'interview', span: [25, 30],
    lines: [[26.0, 'reporter', 'Mimo, wie gefällt dir die Party?', 2.4], [28.6, 'mimo', 'Piep!', 1.0]],
    mimo(t, A) { return A.inn(t, 28.4, 28.9) ? { hop: Math.sin((t - 28.4) / 0.5 * Math.PI) * 10 } : null; },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
