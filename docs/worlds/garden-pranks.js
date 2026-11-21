// Garden party (see garden-base.js): the small pranks.
//   64-74    Julian's ketchup bottle is stuck, he squeezes hard, the ketchup hits Naike in the face
//   107-119  Mats's water bomb hits Ulrike; she chases him out, he comes back in on the other side and whistles
//   122-131  Christof wakes up and wants to sit down, Julian pulls the folding chair away: "Plumps!"
//   134-140  revenge: Naike slips an ice cube down Julian's collar, he hops about wildly
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;

  G.act({
    name: 'ketchup', span: [62, 75],
    pose: {
      striped: [[64.6, 'offer', 1, 1], [67.0, 'flail', 0, 1, 'ouch'], [67.6, 'applaud', 0, 1], [69.6, null]],
      reporter: [[67.0, 'flail', 0, 1, 'daze'], [68.6, 'mic', 0, 1, 'daze'], [72, 'mic', 0, 1, null]],
      filmer: [[67.4, 'applaud', 0, -1], [69.4, 'cam', 0, -1]],
      redbeard: [[67.4, 'applaud'], [69.2, 'pat', 1, 1]],
      kid: [[67.4, 'hooray'], [68.6, null]],
    },
    hold: { striped: [[64.0, 'ketchup', 'r'], [69.6, null]] },
    lines: [[65.0, 'striped', 'Hmpf! Die klemmt.', 1.8], [67.3, 'striped', 'Ups!', 1.0], [68.8, 'reporter', 'Live vom Grillfest … mit Ketchup.', 2.6]],
    focus: [[63, 215], [73, 215]],
    sounds: [[67.0, 'splat']],
    mimo(t) { return G.inn(t, 67.4, 69) ? { mood: 'happy' } : null; },
    back(c, t, A) { // the bottle on the table while nobody holds it
      if (G.inn(t, 64, 69.6)) return;
      const T = GD.TABLE; c.fillStyle = A.pal.ketchup; c.beginPath(); c.roundRect ? c.roundRect(T.x + 8, T.y - 33, 5, 10, 2) : c.rect(T.x + 8, T.y - 33, 5, 10); c.fill();
    },
    after(c, k, t, A) { // ketchup on Naike's face, fading
      if (k.who !== 'reporter' || !G.inn(t, 67.35, 74)) return;
      const a = t < 72.5 ? 1 : (74 - t) / 1.5, h = A.head(k);
      c.fillStyle = A.pal.ketchup; c.globalAlpha = 0.9 * Math.max(0, a);
      for (const [dx, dy, r] of [[-2, -1, 2.6], [2.5, 1, 2], [0, 3.5, 1.6], [-4, 3, 1.2], [4, -3, 1.3]]) { c.beginPath(); c.arc(h[0] + dx, h[1] + dy, r, 0, Math.PI * 2); c.fill(); }
      c.fillRect(h[0] - 1, h[1] + 3, 1.4, 5 * Math.min(1, a + 0.3)); c.globalAlpha = 1;
    },
    front(c, t, A) {
      const J = A.who('striped'), R = A.who('reporter');
      if (G.inn(t, 64.8, 67) && J && J.p) { const a = A.hand(J, 'r'); c.fillStyle = A.pal.ink; c.globalAlpha = 0.6; for (const d of [-1, 1]) { c.beginPath(); c.arc(a[0] + d * 7 + Math.sin(A.now * 30) * 0.8, a[1] - 4, 0.9, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; }
      if (G.inn(t, 67.0, 67.35) && J && R && J.p && R.p) { // the jet: from the bottle to her face
        const a = A.hand(J, 'r'), b = A.head(R), k = (t - 67) / 0.35;
        c.strokeStyle = A.pal.ketchup; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]);
        const ex = a[0] + (b[0] - a[0]) * k, ey = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 6; c.quadraticCurveTo((a[0] + ex) / 2, Math.min(a[1], ey) - 8, ex, ey); c.stroke();
      }
    },
    talk(c, t, A) { A.pop(c, 'SPLATSCH!', 246, 112, (t - 67.3) / 1.0, -0.1, 14, '#FFB3A8'); },
  });

  G.act({
    name: 'waterbomb', span: [105, 120],
    x: {
      kid: [[107.4, H.kid], [110.4, 252, 'lin'], [112.2, 252], [114.0, 800, 'in'], [114.01, -240], [116.2, H.kid, 'out']],
      filmer: [[112.6, H.filmer], [114.4, 800, 'in'], [114.41, -240], [117.4, H.filmer, 'out']],
    },
    pose: {
      kid: [[110.8, 'throw'], [111.4, 'hooray'], [112.1, null], [116.2, null, 0, 1]],
      filmer: [[111.5, 'flail', 0, -1, 'daze'], [112.6, null, 0, 0, 'daze'], [117.4, 'cam', 0, -1, 'daze'], [119, 'cam', 0, -1, null]],
    },
    hold: { kid: [[107.0, 'balloon', 'r'], [111.05, null]] },
    lines: [[108.0, 'kid', 'Pssst …', 1.4], [111.8, 'filmer', 'Na warte!', 1.4], [116.4, 'kid', '♪ Pfeif …', 1.6], [117.6, 'filmer', 'Wo ist er hin?', 1.6]],
    focus: [[107.5, 220], [110.4, 260], [112.2, 260], [114.0, 470, 'lin'], [114.6, 470], [116.0, 120], [117.8, 230]],
    sounds: [[111.5, 'platsch']],
    after(c, k, t, A) { // Ulrike dripping
      if (k.who !== 'filmer' || !G.inn(t, 111.5, 119)) return;
      const a = t < 117 ? 1 : (119 - t) / 2, h = A.head(k); c.fillStyle = A.pal.water; c.globalAlpha = 0.85 * a;
      for (let i = 0; i < 6; i++) { const q = (A.now * 1.4 + i / 6) % 1; c.beginPath(); c.ellipse(h[0] - 9 + i * 3.6, h[1] - 2 + q * 40, 1, 1.6, 0, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 0.35 * a; c.beginPath(); c.ellipse(k.x, k.y + 1, 14, 2.5, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    },
    front(c, t, A) {
      const K = A.who('kid'), F = A.who('filmer');
      if (G.inn(t, 111.05, 111.5) && K && F && K.p && F.p) { // the water bomb in an arc
        const a = A.hand(K, 'r'), b = A.head(F), k = (t - 111.05) / 0.45, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 26;
        c.fillStyle = '#7FC7EE'; c.strokeStyle = '#3E87B5'; c.lineWidth = 0.6; c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      if (G.inn(t, 111.5, 112.1) && F && F.p) { const b = A.head(F), k = (t - 111.5) / 0.6; c.fillStyle = A.pal.water; c.globalAlpha = 1 - k; for (let i = 0; i < 12; i++) { const a2 = i / 12 * Math.PI * 2; c.beginPath(); c.arc(b[0] + Math.cos(a2) * (6 + k * 20), b[1] + Math.sin(a2) * (5 + k * 14) + k * k * 14, 1.6, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; }
    },
    talk(c, t, A) { A.pop(c, 'Platsch!', 300, 108, (t - 111.5) / 1.0, 0.1, 14, '#BFE8FA'); },
  });

  const fallen = (t) => (G.inn(t, 124.85, 127.2) ? (t < 125.05 ? (t - 124.85) / 0.2 : t > 126.9 ? (127.2 - t) / 0.3 : 1) : 0);
  G.act({
    name: 'chair', span: [121, 132],
    x: {
      professor: [[122.8, H.professor], [124.4, 300, 'lin'], [129.6, 300], [131.4, H.professor, 'lin']],
      striped: [[122.4, H.striped], [124.4, 278, 'lin'], [127.5, 278], [129.5, H.striped, 'lin']],
    },
    pose: {
      professor: [[122.2, 'point', -1, -1], [122.8, null], [127.2, 'point', 1, 1, 'serious'], [128.6, null, 0, 0, null]],
      striped: [[124.6, 'take', 1, 1], [125.1, 'applaud', 0, 1], [126.8, null]],
      redbeard: [[125.1, 'applaud'], [126.6, 'pat', 1, 1]], filmer: [[125.1, 'applaud'], [126.6, 'cam', 0, -1]], sidepart: [[125.1, 'applaud'], [126.6, null]],
    },
    lines: [[122.2, 'professor', 'Ich setz mich mal kurz.', 1.6], [125.3, 'striped', 'Hoppla!', 1.2], [127.3, 'professor', 'Sehr witzig, Julian.', 1.8]],
    focus: [[122, 290], [129.5, 290]],
    sounds: [[125.0, 'plumps']],
    mimo(t) { return G.inn(t, 125.1, 126.6) ? { mood: 'happy' } : null; },
    // Christof dozes standing up until the chair prank wakes him
    figure(k, t) { return k.who === 'professor' && t < 122.2 ? { asleep: true, look: undefined } : null; },
    back(c, t, A) {
      const x = GD.CHAIR.x + G.at([[0, 0], [124.6, 0], [124.85, -22, 'out'], [G.LOOP - 0.4, -22], [G.LOOP, 0]], t), y = GD.CHAIR.y, pal = A.pal;
      c.strokeStyle = pal.chair; c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 6, y - 14); c.moveTo(x + 8, y); c.lineTo(x - 6, y - 14); c.moveTo(x + 6, y - 14); c.lineTo(x + 8, y - 30); c.stroke();
      c.fillStyle = pal.chair; c.fillRect(x - 9, y - 16, 16, 3); c.fillRect(x + 4, y - 31, 5, 15);
    },
    person(c, k, t, A) { // Christof on his bottom: lower, tipped back, a dust cloud and stars
      const f = fallen(t); if (k.who !== 'professor' || !f) return false;
      c.save(); c.beginPath(); c.rect(k.x - 60, k.y - 120, 120, 120.5); c.clip();
      c.translate(k.x, k.y + 16 * f); c.rotate(-0.25 * f); k.p.draw(c, 0, 0, { scale: 1, noShadow: true }); c.restore();
      c.fillStyle = A.pal.sand; c.globalAlpha = 0.85 * f; c.beginPath(); c.ellipse(k.x, k.y, 18, 5, 0, Math.PI, 0); c.fill(); c.globalAlpha = 1;
      const h = A.head(k);
      for (let i = 0; i < 3; i++) { const a = A.now * 4 + i * 2.1; c.fillStyle = '#FFD36E'; c.save(); c.translate(h[0] + Math.cos(a) * 9, h[1] + 16 * f - 10 + Math.sin(a) * 3); c.rotate(a); c.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 1.2 : 3, b = j / 10 * Math.PI * 2; c.lineTo(Math.cos(b) * r, Math.sin(b) * r); } c.closePath(); c.fill(); c.restore(); }
      return true;
    },
    front(c, t, A) { // the sleeper's z's
      const P = A.who('professor'); if (!P || t >= 122.2) return;
      for (let i = 0; i < 3; i++) { const k = ((A.now * 0.5 + i / 3) % 1); c.globalAlpha = Math.sin(k * Math.PI); c.fillStyle = A.pal.z; c.font = '600 ' + (6 + k * 5) + "px 'Fredoka', 'Nunito', system-ui, sans-serif"; c.fillText('z', P.x + 6 + k * 12, P.y - 62 - k * 16); }
      c.globalAlpha = 1;
    },
    talk(c, t, A) { A.pop(c, 'Plumps!', 290, 150, (t - 125.0) / 1.2, -0.1, 15); },
  });

  G.act({
    name: 'ice', span: [133, 141],
    x: {
      reporter: [[134.2, H.reporter], [135.4, 212, 'lin'], [138.6, 212], [140, H.reporter, 'lin']],
      striped: [[135.9, H.striped], [136.3, 184], [136.7, 206], [137.1, 188], [137.5, 208], [137.9, 190], [138.6, H.striped]],
    },
    pose: {
      reporter: [[134.2, null], [135.5, 'throw'], [136.2, 'applaud'], [138.6, 'mic', 0, 1]],
      striped: [[135.9, 'hop', 0, 0, 'ouch'], [138.6, null, 0, 0, null]],
      redbeard: [[136.2, 'hooray'], [138, 'pat', 1, 1]], kid: [[136.2, 'hooray'], [137.6, null]], filmer: [[136.2, 'applaud'], [138, 'cam', 0, -1]], sidepart: [[136.2, 'applaud'], [138, null]],
    },
    hold: { reporter: [[134.2, 'ice', 'r'], [135.8, null]] },
    lines: [[136.0, 'striped', 'Iiiih! Kalt!', 1.8], [136.9, 'reporter', 'Rache!', 1.2], [137.2, 'mimo', 'Piep piep!', 1.2]],
    focus: [[133, 210], [140, 210]],
    figure(k, t) { return k.who === 'striped' && G.inn(t, 135.9, 138.6) ? { hop: Math.abs(Math.sin((t - 135.9) * 7)) * 7 } : null; },
    mimo(t) { return G.inn(t, 137.2, 138.2) ? { hop: Math.abs(Math.sin((t - 137.2) * 9)) * 9, mood: 'happy' } : G.inn(t, 136, 138.6) ? { mood: 'happy' } : null; },
    front(c, t, A) {
      const R = A.who('reporter'), J = A.who('striped');
      if (G.inn(t, 135.5, 135.95) && R && J && R.p && J.p) { // the ice cube into the collar
        const a = A.hand(R, 'r'), b = A.head(J), k = (t - 135.5) / 0.45, x = a[0] + (b[0] + 2 - a[0]) * k, y = a[1] + (b[1] + 9 - a[1]) * k - Math.sin(k * Math.PI) * 8;
        c.fillStyle = '#E4F6FD'; c.strokeStyle = '#7FB6D2'; c.lineWidth = 0.5; c.beginPath(); c.rect(x - 2, y - 2, 4, 4); c.fill(); c.stroke();
      }
      if (G.inn(t, 135.9, 138.6) && J && J.p) { const h = A.head(J); c.strokeStyle = '#8FD0DE'; c.lineWidth = 0.9; c.globalAlpha = 0.8; for (let i = 0; i < 3; i++) { const a2 = A.now * 9 + i * 2.1; c.beginPath(); c.moveTo(h[0] + Math.cos(a2) * 12, h[1] + Math.sin(a2) * 5 - 4); c.lineTo(h[0] + Math.cos(a2) * 16, h[1] + Math.sin(a2) * 7 - 6); c.stroke(); } c.globalAlpha = 1; }
    },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
