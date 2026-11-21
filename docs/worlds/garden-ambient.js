// Garden party (see garden-base.js): the life of the party in the quiet parts between the pranks. Small, slow things,
// so the pranks stand out; the camera strolls to each little moment.
//   0-6      Ole turns a sausage and wipes his brow ("Puh, heiß heute!"), Lotta dozes on the lawn, Mats goes after a
//            butterfly a few steps ("Ein Schmetterling!"); it flutters off over the fence
//   26-32    after the interview (garden-chase.js) Naike writes down Mimo's answer ("Zitat: „Piep!“"); Lotta, full of
//            sausage, lies down
//   56-62    the butterfly settles on the flower bed by the fence; Ulrike films it ("Psst … ein Schmetterling."), Mimo hops
//            over to look, peeps, and it flutters away; he hops back
//   75-80    the butterfly lands on Lotta's head; Mats points ("Lotta, nicht bewegen …"), Lotta wags, it flies off
//   103-106  a sparrow hops down from the fence and pecks crumbs by the table, Mimo watches; Christof snores ("Chrrr …")
//   141-146  Ole turns the sausages once more ("Gleich fertig!"), Lotta sniffs towards the grill
//   all the time: the flower bed, a bee round it, a second butterfly over the sandbox, the sparrow on the fence pickets,
//            now and then a leaf drifting down from the trees
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;
  const L = G.LOOP, TAU = Math.PI * 2, w = (k) => TAU * k / L;   // w(k): k whole turns per loop, so the loop has no seam
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ---- the flower bed by the fence (between Mimo and Ulrike): where the butterfly rests and the bee buzzes ----
  const BED = { x0: 262, x1: 294, y: 141 };
  const REST = [279, 133];   // the butterfly sitting on the middle flower
  function drawBed(c, A) {
    const pal = A.pal;
    c.fillStyle = pal.lawnLow; c.beginPath(); c.ellipse((BED.x0 + BED.x1) / 2, BED.y + 1, (BED.x1 - BED.x0) / 2 + 3, 2.6, 0, 0, TAU); c.fill();
    c.strokeStyle = pal.leaf2; c.lineWidth = 0.7; c.lineCap = 'round';
    const fl = [[265, 8, 0], [270, 11, 1], [275, 7, 2], [279, 12, 0], [284, 9, 1], [289, 11, 2], [292, 7, 0]];
    for (const [x, h] of fl) { const sw = Math.sin(A.now * 1.1 + x) * 0.5; c.beginPath(); c.moveTo(x, BED.y + 1); c.quadraticCurveTo(x + sw * 0.5, BED.y - h * 0.5, x + sw, BED.y - h); c.stroke(); }
    c.fillStyle = pal.leaf; for (const [x, h] of fl) { c.beginPath(); c.ellipse(x + 1.4, BED.y - h * 0.4, 1.6, 0.7, -0.5, 0, TAU); c.fill(); }
    for (const [x, h, k] of fl) {
      const sw = Math.sin(A.now * 1.1 + x) * 0.5, fx = x + sw, fy = BED.y - h;
      c.fillStyle = pal.flower[k]; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(fx + Math.cos(a) * 1.3, fy + Math.sin(a) * 1.3, 1.05, 0, TAU); c.fill(); }
      c.fillStyle = k === 1 ? '#F2A65A' : '#FFD36E'; c.beginPath(); c.arc(fx, fy, 0.8, 0, TAU); c.fill();
    }
  }

  // ---- butterfly one: it has a part in the quiet moments; between them it is away up in the trees (not drawn) ----
  // keys [t, x, y, resting?]
  const UP = 26;   // y up in the leaves: hidden
  const fly1 = [
    [0, REST[0], REST[1], 1], [1.6, REST[0], REST[1], 1], [3.3, 186, 128], [4.3, 176, 120], [5.6, 198, 84], [7.4, 230, UP],
    [54.6, 300, UP], [56.6, REST[0], REST[1], 1], [60.6, REST[0], REST[1], 1], [61.6, 296, 104], [63.2, 330, UP],
    [73.4, 210, UP], [75.4, 150, 146], [75.9, 0, 0, 2], [77.8, 0, 0, 2], [78.6, 156, 118], [79.8, 118, UP],
    [142.6, 320, UP], [145.2, REST[0], REST[1], 1], [L, REST[0], REST[1], 1],
  ];
  // Lotta's head while she sits (her x + this): where the butterfly lands in 75-80
  const DOGHEAD = [9, -38];
  function butterfly1(t, A) {
    let i = 1; while (i < fly1.length - 1 && fly1[i][0] <= t) i++;
    const a = fly1[i - 1], b = fly1[i];
    const pos = (k) => (k[3] === 2 ? [A.dogX + DOGHEAD[0], GD.FRONT + 4 + DOGHEAD[1]] : [k[1], k[2]]);
    const pa = pos(a), pb = pos(b), k = G.ease.io(clamp01((t - a[0]) / Math.max(1e-6, b[0] - a[0])));
    const resting = a[3] && (b[3] || t < a[0]) && pa[0] === pb[0] && pa[1] === pb[1];
    let x = pa[0] + (pb[0] - pa[0]) * k, y = pa[1] + (pb[1] - pa[1]) * k;
    if (!resting) { const f = Math.sin(k * Math.PI); x += Math.sin(t * 5.3) * 3 * f; y += Math.sin(t * 7.1) * 2.4 * f + Math.sin(t * 3) * 1.2 * f; }
    const dir = pb[0] - pa[0] > 1 ? 1 : pb[0] - pa[0] < -1 ? -1 : 1;
    return { x, y, resting, dir };
  }
  // ---- butterfly two: a lazy loop over the far end of the sandbox, all the time ----
  function butterfly2(t) {
    const x = 505 + Math.sin(w(5) * t) * 30 + Math.sin(w(23) * t) * 7, y = 128 + Math.sin(w(8) * t + 1) * 12 + Math.sin(w(33) * t) * 4;
    return { x, y, resting: false, dir: Math.cos(w(5) * t) >= 0 ? 1 : -1 };
  }
  function drawButterfly(c, b, now, cols) {
    const a = clamp01((b.y - UP - 6) / 16); if (a <= 0) return;
    // flying: quick wing beats; resting: wings up together, opening now and then
    const open = b.resting ? 0.25 + 0.75 * Math.max(0, Math.sin(now * 1.3)) ** 3 : 0.25 + 0.75 * Math.abs(Math.sin(now * 13));
    c.save(); c.translate(b.x, b.y); c.scale(b.dir * 1.6, 1.6); c.globalAlpha = a;
    for (const [dx, dy, rx, ry, col] of [[-1.2, -1.2, 2.4, 1.8, cols[0]], [-0.8, 0.9, 1.6, 1.2, cols[1]]]) {
      c.fillStyle = col; c.beginPath(); c.ellipse(dx * open, dy, rx * open + 0.25, ry, dy < 0 ? -0.5 : 0.4, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-dx * open * 0.4, dy, rx * open * 0.4 + 0.2, ry, dy < 0 ? 0.5 : -0.4, 0, TAU); c.fill();
    }
    c.strokeStyle = '#4A3F5E'; c.lineWidth = 0.55; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0.6, 1.6); c.lineTo(-0.3, -1.4); c.moveTo(-0.3, -1.4); c.lineTo(0.6, -3); c.moveTo(-0.3, -1.4); c.lineTo(-1.2, -2.9); c.stroke();
    c.restore();
  }

  // ---- the bee: buzzes round the flower bed ----
  function drawBee(c, t, now) {
    const x = 278 + Math.sin(w(60) * t) * 13 + Math.sin(w(170) * t) * 1.2, y = 132 + Math.sin(w(120) * t + 0.7) * 3.5 + Math.sin(now * 23) * 0.35;
    const dir = Math.cos(w(60) * t) >= 0 ? 1 : -1;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-0.3, -1.4, 0.9, 1.4 + Math.sin(now * 60) * 0.3, -0.3, 0, TAU); c.fill();
    c.fillStyle = '#FFCF4A'; c.beginPath(); c.ellipse(0, 0, 1.7, 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = '#3B3560'; c.fillRect(-0.7, -1.05, 0.45, 2.1); c.fillRect(0.3, -1.1, 0.45, 2.2); c.beginPath(); c.arc(1.6, -0.2, 0.55, 0, TAU); c.fill();
    c.restore();
  }

  // ---- leaves drifting down out of the trees now and then (one at a time, slow) ----
  const LEAVES = []; for (let i = 0; i < 9; i++) LEAVES.push({ t0: 8 + i * 17.3, x: 40 + ((i * 197 + 61) % 470), land: 146 + (i % 3) * 9, k: i % 2 });
  function drawLeaves(c, t, A) {
    for (const l of LEAVES) {
      const u = t - l.t0; if (u < 0 || u > 11) continue;
      const fall = Math.min(1, u / 7.5), y = 46 + (l.land - 46) * fall, sway = Math.sin(u * 1.7) * 7 * (1 - fall * 0.6);
      const x = l.x + sway + u * 1.6, rot = fall < 1 ? Math.sin(u * 1.7 + 1) * 0.9 : 0.25, a = u < 7.5 ? clamp01(u / 1.4) : clamp01((11 - u) / 3.5);
      c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a; c.fillStyle = l.k ? A.pal.leaf2 : A.pal.leaf;
      c.beginPath(); c.moveTo(-2.6, 0); c.quadraticCurveTo(0, -1.8, 2.6, 0); c.quadraticCurveTo(0, 1.8, -2.6, 0); c.fill();
      c.strokeStyle = A.pal.trunk; c.lineWidth = 0.3; c.beginPath(); c.moveTo(-2.6, 0); c.lineTo(2.2, 0); c.stroke();
      c.restore();
    }
  }

  // ---- the sparrow: perches on the fence pickets (tips at multiples of 14, y 110), hops along now and then; in 103-106
  // it flutters down to the lawn by the table and pecks crumbs. keys [t, x, y] (it hops from key to key)
  const TIP = 110, LAWN = 189;
  const sparrowKeys = [[0, 224, TIP], [18, 238, TIP], [47, 224, TIP], [70, 238, TIP], [86, 252, TIP], [102.4, 212, LAWN], [104.3, 206, LAWN],
    [105.9, 238, TIP], [128, 224, TIP], [L, 224, TIP]];
  function sparrow(t) {
    let i = 1; while (i < sparrowKeys.length - 1 && sparrowKeys[i][0] <= t) i++;
    const [ta, xa, ya] = sparrowKeys[i - 1], prev = sparrowKeys[Math.max(0, i - 2)], u = t - ta, far = prev[2] !== ya, d = far ? 0.75 : 0.35;
    if (i > 1 && u < d) { // hopping (along the pickets, on the lawn) or fluttering (between the fence and the lawn)
      const k = u / d, kk = G.ease.io(k);
      return { x: prev[1] + (xa - prev[1]) * kk, y: prev[2] + (ya - prev[2]) * kk - Math.sin(k * Math.PI) * (far ? 10 : 5), fly: far, dir: xa >= prev[1] ? 1 : -1, peck: 0 };
    }
    const onLawn = ya === LAWN, peck = onLawn ? Math.max(0, Math.sin(u * 5.5)) ** 4 : 0;
    // looks about: turns round every few seconds
    const dir = onLawn ? (u < 1.6 ? -1 : 1) : Math.sin(w(31) * t) >= 0 ? -1 : 1;
    return { x: xa, y: ya, fly: false, dir, peck };
  }
  function drawSparrow(c, s, now) {
    c.save(); c.translate(s.x, s.y); c.scale(s.dir * 0.85, 0.85);
    if (s.fly) { c.fillStyle = '#9C7A5B'; const f = Math.sin(now * 30) * 0.9; for (const side of [-1, 1]) { c.save(); c.translate(-0.5, -3.5); c.rotate(side * (0.6 + f * 0.6) - Math.PI / 2); c.beginPath(); c.ellipse(0, -2.6, 1.3, 3, 0, 0, TAU); c.fill(); c.restore(); } }
    else { c.strokeStyle = '#C08A4A'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(-0.6, -1.2); c.lineTo(-0.8, 0); c.moveTo(0.6, -1.2); c.lineTo(0.7, 0); c.stroke(); }
    const p = s.peck;
    c.fillStyle = '#8B6A4E'; c.beginPath(); c.moveTo(-3, -3.5); c.lineTo(-6.2, -5.2); c.lineTo(-5.6, -3.4); c.closePath(); c.fill();   // tail
    c.fillStyle = '#A9825C'; c.beginPath(); c.ellipse(-0.6, -3.4, 3.4, 2.4, -0.15, 0, TAU); c.fill();            // body
    c.fillStyle = '#EFE2CC'; c.beginPath(); c.ellipse(0.2, -2.5, 2.2, 1.4, -0.1, 0, Math.PI); c.fill();            // belly
    c.fillStyle = '#7A5B40'; c.beginPath(); c.ellipse(-1.2, -3.8, 2, 1.2, -0.25, 0, TAU); c.fill();                // wing
    const hx = 2.2 + p * 1.2, hy = -5.6 + p * 3.4;
    c.fillStyle = '#A9825C'; c.beginPath(); c.arc(hx, hy, 1.7, 0, TAU); c.fill();                               // head
    c.fillStyle = '#7A5B40'; c.beginPath(); c.arc(hx - 0.2, hy - 0.7, 1.3, Math.PI, TAU); c.fill();              // cap
    c.fillStyle = '#E8B04A'; c.beginPath(); c.moveTo(hx + 1.5, hy - 0.2); c.lineTo(hx + 2.8, hy + 0.3); c.lineTo(hx + 1.5, hy + 0.6); c.closePath(); c.fill();
    c.fillStyle = '#2E2A40'; c.beginPath(); c.arc(hx + 0.6, hy - 0.2, 0.38, 0, TAU); c.fill();
    c.restore();
  }

  // ---- the grill: Ole turns a sausage (the right one jumps up and over) ----
  const FLIPS = [[1.0, 1.6], [142.2, 142.8], [143.4, 144.0]];
  const flipK = (t) => { for (const [a, b] of FLIPS) if (t >= a && t < b) return (t - a) / (b - a); return -1; };

  // ---- everything that goes on all the time ----
  G.act({
    name: 'ambient', span: [0, L],
    grill(t) { return flipK(t) >= 0 ? 2 : null; },
    back(c, t, A) {
      drawBed(c, A);
      const k = flipK(t);
      if (k >= 0) A.sausage(c, GD.GRILL.x + 8, GD.GRILL.y - 24.5 - Math.sin(k * Math.PI) * 7, k * Math.PI);
      // crumbs by the table, for the sparrow
      c.fillStyle = A.pal.wood; for (const [x, y] of [[204, 190], [209, 191.5], [214, 190.5]]) { c.beginPath(); c.arc(x, y, 0.55, 0, TAU); c.fill(); }
      drawSparrow(c, sparrow(t), A.now);
      drawButterfly(c, butterfly2(t), A.now, ['#F59AAE', '#F8C0CC']);
    },
    front(c, t, A) {
      drawBee(c, t, A.now);
      drawButterfly(c, butterfly1(t, A), A.now, ['#FFD36E', '#FFE7A8']);
      drawLeaves(c, t, A);
    },
  });

  // ---- 0-6: the party starts slowly ----
  G.act({
    name: 'morning', span: [0, 6],
    x: { kid: [[3.0, H.kid], [4.3, 172], [4.9, 172], [5.9, H.kid]] },
    pose: {
      redbeard: [[0.8, 'take', 1, 1], [1.7, 'peer', -1, 0], [2.9, 'pat', 1, 1]],
      kid: [[4.2, 'hooray'], [4.9, null]],
    },
    lines: [[1.4, 'redbeard', 'Puh, heiß heute!', 2.2], [3.4, 'kid', 'Ein Schmetterling!', 2.4]],
    focus: [[2.0, 148], [6.5, 148]],
    sounds: [[1.0, 'zisch']],
    figure(k, t, A) { return k.who === 'kid' && G.inn(t, 2.6, 6) ? { look: butterfly1(t, A).x - k.x } : null; },
    dog(t) { return G.inn(t, 0, 5.4) ? { pose: 'lie', lookAt: null } : null; },
    after(c, k, t, A) { // a drop of sweat on Ole's brow
      if (k.who !== 'redbeard' || !G.inn(t, 1.8, 3.0)) return;
      const h = A.head(k), u = (t - 1.8) / 1.2;
      c.fillStyle = A.pal.water; c.globalAlpha = u < 0.8 ? 1 : (1 - u) / 0.2;
      c.beginPath(); c.ellipse(h[0] + 7, h[1] - 6 + u * 6, 0.9, 1.3, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    },
  });

  // ---- 26-32: after the interview ----
  G.act({
    // after Mimo's "Piep!" of the interview (garden-chase.js, 26.4-31.6) Naike notes it down
    name: 'notes', span: [26, 34],
    pose: { reporter: [[31.35, 'write', 1, 1]] },
    lines: [[31.45, 'reporter', 'Zitat: „Piep!“', 2.2]],
    focus: [[32.2, 236]],
    dog(t) { return G.inn(t, 26.4, 31.6) ? { pose: 'lie', lookAt: null } : null; },
  });

  // ---- 56-62: the butterfly on the flower bed ----
  G.act({
    name: 'flowers', span: [56, 62],
    x: { mimo: [[57.0, H.mimo], [57.9, 264], [60.9, 264], [61.8, H.mimo]] },
    lines: [[58.2, 'filmer', 'Psst … ein Schmetterling.', 2.6], [60.2, 'mimo', 'Piep?', 1.4]],
    focus: [[55.6, 236], [57.6, 272], [61.2, 272]],
    sounds: [[60.2, 'piep']],
    figure(k, t, A) { return k.who === 'filmer' && G.inn(t, 56.4, 62) ? { look: butterfly1(t, A).x - k.x } : null; },
    mimo(t) { return G.inn(t, 57.9, 60.9) ? { face: 1, mood: G.inn(t, 58.2, 60.2) ? 'happy' : null } : null; },
  });

  // ---- 75-80: the butterfly on Lotta's head ----
  G.act({
    name: 'nose', span: [75, 80],
    pose: { kid: [[75.9, 'point', -1, -1], [78.0, null]] },
    lines: [[76.0, 'kid', 'Lotta, nicht bewegen …', 2.6]],
    focus: [[74.6, 205], [76.2, 168], [79.0, 168]],
    figure(k, t, A) { return k.who === 'kid' && G.inn(t, 74.8, 79.6) ? { look: butterfly1(t, A).x - k.x } : null; },
    dog(t, A) {
      if (!G.inn(t, 74.6, 80)) return null;
      const b = butterfly1(t, A);
      return { pose: 'sit', dir: 1, lookAt: G.inn(t, 75.9, 77.8) ? null : b.x - A.dogX, happy: G.inn(t, 77.6, 79) ? 0.9 : 0 };
    },
  });

  // ---- 103-106: the sparrow pecks crumbs, Christof snores ----
  G.act({
    name: 'crumbs', span: [103, 106],
    lines: [[103.4, 'professor', 'Chrrr … pfüüü …', 2.2, true]],
    focus: [[104.0, 262], [105.6, 262]],
    mimo(t) { return G.inn(t, 102.6, 106) ? { face: -1, mood: G.inn(t, 103.4, 105.6) ? 'happy' : null } : null; },
  });

  // ---- 141-146: nearly done ----
  G.act({
    name: 'nearly', span: [141, 146],
    pose: { redbeard: [[141.9, 'take', 1, 1], [144.2, 'pat', 1, 1]] },
    lines: [[144.2, 'redbeard', 'Gleich fertig!', 2.1]],
    focus: [[141.4, 210], [143.0, 142], [146.2, 142]],
    sounds: [[142.4, 'zisch']],
    dog(t) { return G.inn(t, 142.0, 145.8) ? { pose: 'sniff', dir: -1, lookAt: -22, happy: 0.4 } : null; },
  });

  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
