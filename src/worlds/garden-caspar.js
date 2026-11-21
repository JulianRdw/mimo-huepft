// Garden party (see garden-base.js): Caspar's story.
//   34-54   Julian and Caspar dig a hole in the sandbox, Caspar climbs in, Julian fills it up to his neck, lets a big
//           towel sink over his head and tiptoes off. Then nothing: the party goes on without Caspar.
//   81-102  "Wo ist eigentlich Caspar?" Everyone looks around, the camera drives to the sandbox, "Hilfe …"; Mimo hops
//           over and raises the alarm, Ole runs over, takes the towel off and digs Caspar out ("Danke!")
//   150-155 the end of the loop: "Die Würstchen sind fertig!", everyone cheers
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;

  // the sandbox: how deep the hole is (0..1), how big the pile next to it, how far Caspar stands in it (units his feet are
  // below the sand) and how high the sand is filled in around him (units above the sand, up to his neck)
  const hole = (t) => G.at([[0, 0], [37.0, 0], [41.0, 1, 'lin'], [43.4, 1], [46.6, 0, 'lin'], [93.6, 0], [95.6, 1, 'lin'], [G.LOOP - 0.2, 1], [G.LOOP, 0]], t);
  const pile = (t) => G.at([[0, 0.15], [37.0, 0.15], [41.0, 1, 'lin'], [43.4, 1], [46.6, 0.2, 'lin'], [93.6, 0.2], [95.6, 1, 'lin'], [G.LOOP - 0.2, 1], [G.LOOP, 0.15]], t);
  const sink = (t) => G.at([[0, 0], [41.7, 0], [42.4, 21], [95.4, 21], [96.2, 0]], t);
  const fill = (t) => G.at([[0, 0], [43.4, 0], [46.6, 12, 'lin'], [93.6, 12], [95.2, 0, 'lin']], t);
  const inBox = (t) => G.inn(t, 34.4, 101.8);

  G.act({
    name: 'bury', span: [32, 56],
    x: {
      striped: [[34.0, H.striped], [36.8, GD.HOLE - 22, 'lin'], [49.4, GD.HOLE - 22], [53.6, H.striped, 'lin']],
      sidepart: [[34.4, H.sidepart], [36.0, GD.HOLE + 22, 'lin'], [41.4, GD.HOLE + 22], [42.2, GD.HOLE, 'lin']],
    },
    pose: {
      striped: [[37.0, 'pat', 1, 1], [41.0, null, 0, 1], [43.4, 'pat', 1, 1], [46.6, null, 0, 1], [47.0, 'take', 1, 1], [48.8, null, 0, 0]],
      sidepart: [[37.0, 'pat', -1, -1], [41.0, null, 0, 0], [45.0, null, 0, 0, 'daze'], [46.8, null, 0, 0, null]],
    },
    hold: { striped: [[34.0, 'spade', 'r'], [46.6, null]], sidepart: [[34.4, 'spade', 'r'], [41.0, null]] },
    lines: [[34.2, 'striped', 'Caspar! Wir buddeln ein Loch!', 2.0], [39.0, 'sidepart', 'Noch tiefer?', 1.4], [40.2, 'striped', 'Viel tiefer!', 1.2], [42.6, 'sidepart', 'Passt genau!', 1.4],
      [45.0, 'sidepart', 'Äh … Julian?', 1.6], [46.8, 'striped', 'Hihi.', 1.0], [49.0, 'striped', 'Psst!', 1.0]],
    focus: [[34.6, 420], [49.4, 420], [54, 230]],
    sounds: [[37.4, 'buddel'], [43.8, 'buddel']],
    talk(c, t, A) {
      A.pop(c, 'Buddel buddel!', GD.HOLE - 4, 150, (t - 37.4) / 1.8, -0.08, 12);
      A.pop(c, 'Schipp schipp!', GD.HOLE + 40, 162, (t - 43.8) / 1.6, 0.08, 12);
    },
  });

  G.act({
    name: 'rescue', span: [80, 103],
    x: {
      redbeard: [[90.2, H.redbeard], [92.4, GD.HOLE - 20, 'lin'], [99.0, GD.HOLE - 20], [101.4, H.redbeard, 'lin']],
      sidepart: [[95.4, GD.HOLE], [96.2, GD.HOLE + 22, 'lin'], [99.4, GD.HOLE + 22], [101.8, H.sidepart, 'lin']],
      mimo: [[86.4, H.mimo], [89.6, GD.HOLE - 48, 'lin'], [99.0, GD.HOLE - 48], [102.0, H.mimo, 'lin']],
    },
    pose: {
      redbeard: [[90.0, null, 0, 0], [92.6, 'take', 1, 1], [93.0, 'pat', 1, 1], [95.6, null, 0, 0], [96.2, 'hooray', 0, 0], [97.4, null, 0, 0]],
      reporter: [[81.0, null, 0, 0], [86.5, 'mic', 0, 1]],
      filmer: [[82, null, 0, 0], [86.5, 'cam', 0, -1]],
      sidepart: [[96.2, 'hooray', 0, 0], [97.4, null, 0, 0]],
    },
    lines: [[81.0, 'reporter', 'Sagt mal … wo ist eigentlich Caspar?', 2.4], [84.4, 'filmer', 'Keine Ahnung.', 1.4], [85.8, 'sidepart', 'Hilfe … hilfe …', 1.8, true], [88.0, 'sidepart', 'Hilfe …', 1.6, true],
      [89.8, 'mimo', 'Piep piep piep!', 1.6], [90.0, 'redbeard', 'Caspar?!', 1.2], [96.4, 'sidepart', 'Danke!', 1.4], [97.6, 'redbeard', 'Wer war das denn?', 1.6], [98.6, 'sidepart', 'Ich hab da so eine Ahnung …', 2.0]],
    focus: [[81, 230], [85.4, 230], [89.0, 425], [99.0, 425], [102.5, 230]],
    sounds: [[93.8, 'buddel']],
    figure(k, t, A) { return G.inn(t, 82.0, 85.8) && k.who !== 'sidepart' ? { look: Math.sin((t - 82) * 2.1 + k.seed) * 90 } : null; },
    mimo(t, A) {
      if (G.inn(t, 89.8, 91.2)) return { hop: Math.abs(Math.sin((t - 89.8) * 10)) * 9, mood: 'scared', face: 1 };
      if (G.inn(t, 89.6, 99)) return { mood: G.inn(t, 96.2, 97.6) ? 'happy' : G.inn(t, 89.6, 92.6) ? 'scared' : null, face: 1 };
      return null;
    },
    talk(c, t, A) { A.pop(c, 'Buddel buddel!', GD.HOLE - 10, 148, (t - 93.8) / 1.4, 0.08, 12); },
  });

  // Caspar's sandbox all through the loop: the hole, the pile, Caspar sunk in it, the towel
  G.act({
    name: 'sandbox', span: [0, G.LOOP],
    figure(k, t) { return k.who === 'sidepart' && inBox(t) ? { y: GD.SAND - 1 + sink(t) } : null; },
    person(c, k, t, A) {
      if (k.who !== 'sidepart' || !(sink(t) > 0.5 || fill(t) > 0)) return false;
      const cut = GD.SAND - fill(t) + 0.5;   // only what is above the sand (or the filled-in sand) shows
      c.save(); c.beginPath(); c.rect(k.x - 80, cut - 200, 160, 200); c.clip();
      k.p.draw(c, k.x, k.y + Math.sin(A.now * 2) * 0.3, { scale: 1, noShadow: true });
      c.restore();
      return true;
    },
    back(c, t, A) {
      const pal = A.pal, X = GD.HOLE, Y = GD.SAND, h = hole(t), p = pile(t);
      if (h > 0.02) { // a dark oval with a lighter rim, deeper and wider while they dig
        c.fillStyle = pal.sandInk; c.beginPath(); c.ellipse(X, Y, 8 + 10 * h, 2 + 3 * h, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(80,58,30,0.35)'; c.beginPath(); c.ellipse(X, Y + 0.6 * h, 6 + 8 * h, 1.2 + 2.2 * h, 0, 0, Math.PI * 2); c.fill();
      }
      const px = X + 34, pw = 6 + 12 * p, ph = 2 + 9 * p;   // the pile on the right of the hole
      c.fillStyle = pal.sand; c.strokeStyle = pal.sandInk; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(px - pw, Y + 2); c.quadraticCurveTo(px - pw * 0.5, Y + 2 - ph * 1.3, px, Y + 2 - ph); c.quadraticCurveTo(px + pw * 0.5, Y + 2 - ph * 1.3, px + pw, Y + 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = pal.sandInk; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(px - pw * 0.5 + i * pw * 0.33, Y - ph * 0.35 + (i % 2), 0.8, 0, Math.PI * 2); c.fill(); }
      if (t >= 93.5) towelFlat(c, X + 58, Y + 3, pal);   // the towel after the rescue, thrown down next to the pile
    },
    front(c, t, A) {
      const pal = A.pal, X = GD.HOLE, Y = GD.SAND, f = fill(t);
      if (f > 0) { // the sand filled in around him: a mound up to his neck
        c.fillStyle = pal.sand; c.strokeStyle = pal.sandInk; c.lineWidth = 0.8;
        const w = 13 + f * 0.6;
        c.beginPath(); c.moveTo(X - w - 4, Y + 2); c.quadraticCurveTo(X - w, Y - f, X - 4, Y - f - 0.5); c.lineTo(X + 4, Y - f - 0.5); c.quadraticCurveTo(X + w, Y - f, X + w + 4, Y + 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = pal.sandInk; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(X - w + 4 + i * (w * 2 - 8) / 5, Y - f * (0.3 + 0.25 * (i % 2)), 0.8, 0, Math.PI * 2); c.fill(); }
      }
      // flying sand: out of the hole onto the pile while they dig, back from the pile while Julian fills, out at the rescue
      const toPile = G.inn(t, 37.0, 41.0) || G.inn(t, 93.6, 95.6), fromPile = G.inn(t, 43.4, 46.6);
      if (toPile || fromPile) {
        c.fillStyle = pal.sandInk;
        for (let i = 0; i < 12; i++) {
          const k = (A.now * 2.4 + i / 12) % 1, a = toPile ? [X + (i % 2 ? -6 : 6), Y - 2] : [X + 34, Y - 6], b = toPile ? [X + 32 + (i % 3) * 3, Y - 6] : [X + (i % 2 ? -5 : 5), Y - 4];
          c.globalAlpha = 1 - k * 0.4; c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 16, 1.1 + (i % 2) * 0.4, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }
      // the towel: Julian holds it up, carries it over Caspar, it sinks over the head; Ole lifts it off and throws it away
      const C = A.who('sidepart'), J = A.who('striped'), R = A.who('redbeard');
      if (!C || !C.p) return;
      const hd = A.head(C), base = Y - f;
      const calling = A.lines.some(([a, who, , d]) => who === 'sidepart' && t >= a && t < a + d) || A.tapped('sidepart');
      if (G.inn(t, 47.0, 47.8) && J) { const p = A.hand(J, 'r'); A.towel(c, p[0] + 4, p[1] + 4, 22, 13, 0.1); }
      else if (G.inn(t, 47.8, 48.2)) { const k = G.ease.io((t - 47.8) / 0.4), p = J ? A.hand(J, 'r') : [X - 20, Y - 30]; A.towel(c, p[0] + 4 + (hd[0] - p[0] - 4) * k, p[1] + 4 + (hd[1] - 16 - p[1] - 4) * k, 22 + 12 * k, 13 - 9 * k, 0.1 * (1 - k)); }
      else if (G.inn(t, 48.2, 92.6)) towelTent(c, hd, base, A.now, pal, calling, G.ease.out(Math.min(1, (t - 48.2) / 0.8)));
      else if (G.inn(t, 92.6, 93.0) && R) { const p = A.hand(R, 'r'); A.towel(c, p[0], p[1] - 3, 16, 10, 0.4); }
      else if (G.inn(t, 93.0, 93.5)) { const k = (t - 93.0) / 0.5, p = R ? A.hand(R, 'r') : [X - 20, Y - 30]; A.towel(c, p[0] + (X + 58 - p[0]) * k, p[1] + (Y + 1 - p[1]) * k - Math.sin(k * Math.PI) * 22, 16 + 6 * k, 10 - 6 * k, 0.4 + k * 5); }
      // Julian's sneaking: little notes over his head on the way back
      if (G.inn(t, 49.4, 53.6) && J) { c.fillStyle = pal.ink; c.font = "600 9px 'Fredoka', 'Nunito', system-ui, sans-serif"; const h = A.head(J); for (let i = 0; i < 2; i++) { const k = (A.now * 0.8 + i / 2) % 1; c.globalAlpha = Math.sin(k * Math.PI); c.fillText('♪', h[0] + 8 + k * 8 + i * 4, h[1] - 12 - k * 14); } c.globalAlpha = 1; }
    },
  });

  // the towel over his head: a striped tent from the top of the head down to the sand, it wobbles when he calls
  function towelTent(c, h, base, now, pal, calling, drop) {
    const wob = calling ? Math.sin(now * 16) * 1.3 : Math.sin(now * 1.6) * 0.3, top = h[1] - 15 + wob, x = h[0], w = 18;
    const bot = top + (base + 1 - top) * drop, sw = (calling ? Math.sin(now * 11) * 1.2 : 0);
    c.save();
    c.beginPath(); c.moveTo(x - w + sw, bot); c.lineTo(x - w + 2 + sw * 0.5, top + 10); c.quadraticCurveTo(x - w + 3, top + 1, x - 7, top);
    c.quadraticCurveTo(x, top - 2.5, x + 7, top); c.quadraticCurveTo(x + w - 3, top + 1, x + w - 2 + sw * 0.5, top + 10); c.lineTo(x + w + sw, bot);
    for (let i = 4; i >= 0; i--) c.quadraticCurveTo(x - w + sw + (i + 0.5) * w * 0.4, bot + (i % 2 ? 1.8 : -0.6), x - w + sw + i * w * 0.4, bot);
    c.closePath();
    c.save(); c.clip();
    for (let i = 0; i < 7; i++) { c.fillStyle = pal.towel[i % 2]; c.fillRect(x - w - 3 + i * (w * 2 + 6) / 7, top - 5, (w * 2 + 6) / 7 + 0.3, bot - top + 9); }
    c.fillStyle = 'rgba(40,40,80,0.10)'; c.fillRect(x - w - 3, top - 5, 7, bot - top + 9); c.fillRect(x + w - 4, top - 5, 7, bot - top + 9);
    c.restore();
    c.strokeStyle = pal.ink; c.globalAlpha = 0.35; c.lineWidth = 0.7; c.stroke();
    c.globalAlpha = 0.16; c.fillStyle = pal.ink; c.beginPath(); c.ellipse(x, base + 1.8, w + 2, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function towelFlat(c, x, y, pal) {
    c.save(); c.translate(x, y); c.scale(1, 0.35);
    for (let i = 0; i < 6; i++) { c.fillStyle = pal.towel[i % 2]; c.fillRect(-14 + i * 28 / 6, -10, 28 / 6 + 0.3, 20); }
    c.restore();
  }

  // the end of the loop (to become Caspar's revenge)
  G.act({
    name: 'finale', span: [148, 156],
    pose: {
      redbeard: [[150.4, 'hooray']], striped: [[150.4, 'hooray', 0, 0]], kid: [[150.4, 'hooray']], reporter: [[150.4, 'hooray']],
      filmer: [[150.4, 'applaud']], professor: [[150.4, 'hooray']], sidepart: [[150.4, 'hooray']],
    },
    lines: [[150.2, 'redbeard', 'Die Würstchen sind fertig!', 1.8], [151.4, 'mimo', 'Piep!', 1.0]],
    focus: [[149, 190], [154, 190]],
    mimo(t) { return G.inn(t, 150.4, 152) ? { hop: Math.abs(Math.sin((t - 150.4) * 8)) * 10, mood: 'happy' } : null; },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
