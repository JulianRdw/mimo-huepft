// World 4 boss "Käpt’n Krake": the picture (after the approved mockup), the fight song and the captain's hat.
// The octopus is drawn from the shared shapes in coast-boss-arms.js, so what is drawn is what hurts or carries.
// Kept cheap for old iPhones: no shadowBlur, no gradients, every arm is one filled outline (not dozens of circles),
// the warnings are a few shapes each. Layers: draw (before Mimo) = far arms, head, raft, warnings, arms, water veil;
// drawFront (over Mimo) = the flying hat, rain and lightning.
(function () {
  'use strict';
  let api = null;
  const M = () => window.MimoKrake;
  const TAU = Math.PI * 2;

  // ---------- colours: light, dark; night pulls the octopus a little towards the dusk ----------
  const LIGHT = { body: '#F08FA4', lite: '#F9BFCB', far: '#E7869C', shade: '#3A3850', hatTop: '#FDF6EC', hatBand: '#4B5A8C', hatBrim: '#3E4B78', badge: '#F6D374',
    blush: '#F0566A', deck: '#E7CBA9', log: '#D4B48E', mast: '#D9BE94', flag: '#F2A7BC', crate: '#D9B58A', ink: '#3B3560', inkHi: '#7A70B4', step: '#FFE6EC', stepRim: '#DE7F96', storm: '#4A4F78', rain: '#E6F2FF' };
  const DARK = { body: '#D98399', lite: '#EDB4C2', far: '#B9748B', shade: '#1D1B2E', hatTop: '#ECE4D8', hatBand: '#43508A', hatBrim: '#36416E', badge: '#E8C766',
    blush: '#E2546A', deck: '#BFA382', log: '#A58B6B', mast: '#B39A78', flag: '#D88EA4', crate: '#AE8E66', ink: '#17142C', inkHi: '#5A5196', step: '#F6D2DC', stepRim: '#C26F86', storm: '#151830', rain: '#B9C6E0' };
  const NIGHT_TO = '#3E4470', NIGHT_MIX = 0.22, NIGHT_KEYS = ['body', 'lite', 'far', 'deck', 'log', 'mast', 'flag', 'crate', 'hatTop', 'hatBand', 'hatBrim'];
  let palFor = null, palDark = null, pal = null, veil = null;
  function colours() {
    const W = api.W, dark = api.dark;
    if (palFor === W && palDark === dark && pal) return pal;
    const base = dark ? DARK : LIGHT, n = (W.night || 0) * NIGHT_MIX;
    pal = { ...base };
    if (n > 0) for (const k of NIGHT_KEYS) pal[k] = api.mixHex(base[k], NIGHT_TO, n);
    veil = W.waterTopNight ? api.mixHex(W.waterTop, W.waterTopNight, (W.night || 0) * 0.7) : W.waterTop || '#79CCDA';
    palFor = W; palDark = dark;
    return pal;
  }
  const VEIL_ALPHA = 0.6, SHADOW_ALPHA = [0.2, 0.5], STEP_LID = 0.62, RAIN = 46, SUCKER_EVERY = 2;

  // ---------- small helpers ----------
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function fill(ctx, col, a) { ctx.fillStyle = col; if (a != null) ctx.globalAlpha = a; ctx.fill(); ctx.globalAlpha = 1; }
  function line(ctx, x1, y1, x2, y2, col, w, a) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.globalAlpha = a == null ? 1 : a; ctx.stroke(); ctx.globalAlpha = 1; }
  const view = () => { const c = api.cam, v = api.view; return { x0: c.x - 20, x1: c.x + v.w + 20, y0: c.y - 20, y1: c.y + v.h + 20 }; };

  // ---------- an arm: one outline (both sides of the tube, round ends) and its suckers ----------
  function armPath(ctx, ps) {
    const s = M().sample(ps), n = s.n;
    ctx.beginPath();
    ctx.moveTo(s.x[0] + s.nx[0] * s.r[0], s.y[0] + s.ny[0] * s.r[0]);
    for (let i = 1; i <= n; i++) ctx.lineTo(s.x[i] + s.nx[i] * s.r[i], s.y[i] + s.ny[i] * s.r[i]);
    const an = Math.atan2(s.ny[n], s.nx[n]); ctx.arc(s.x[n], s.y[n], s.r[n], an, an - Math.PI, true);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(s.x[i] - s.nx[i] * s.r[i], s.y[i] - s.ny[i] * s.r[i]);
    const a0 = Math.atan2(s.ny[0], s.nx[0]); ctx.arc(s.x[0], s.y[0], s.r[0], a0 + Math.PI, a0, true);
    ctx.closePath();
    return s;
  }
  function drawArm(ctx, ps, col, suck, side, plaster) {
    const s = armPath(ctx, ps); fill(ctx, col);
    if (plaster) drawPlaster(ctx, s, Math.max(1, Math.round(s.n * 0.24)));
    if (!suck) return;
    ctx.beginPath();
    for (let i = 2; i < s.n; i += SUCKER_EVERY) { const r = s.r[i], x = s.x[i] + s.nx[i] * r * 0.52 * side, y = s.y[i] + s.ny[i] * r * 0.52 * side; ctx.moveTo(x + r * 0.25, y); ctx.arc(x, y, r * 0.25, 0, TAU); }
    fill(ctx, suck, 0.95);
  }
  // the plaster from the urchin garden (level 33), across the arm at sample i: two crossed strips, big enough to read on a
  // phone, on the part of the raised arm that shows left of the hat
  function drawPlaster(ctx, s, i) {
    const x = s.x[i], y = s.y[i], a = Math.atan2(s.ny[i], s.nx[i]), r = s.r[i], len = Math.max(30, r * 2.5), h = 12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    for (const tilt of [-0.5, 0.5]) {
      ctx.save(); ctx.rotate(tilt);
      api.rr(-len / 2, -h / 2, len, h, 5); fill(ctx, '#F4D3B4'); ctx.strokeStyle = 'rgba(59,53,96,0.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#E3B58F'; for (const sx of [-len * 0.36, -len * 0.26, len * 0.26, len * 0.36]) for (const sy of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    api.rr(-6.5, -6.5, 13, 13, 3); fill(ctx, '#FFFFFF', 0.85); ctx.strokeStyle = 'rgba(59,53,96,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  // the Krake's loot on the raft, at the far end by its head: the handcart heaped with what went missing on the beach
  function drawLoot(ctx, B) {
    const sd = window.MimoCoast && window.MimoCoast.sdraw; if (!sd || !sd.PROPS.pile) return;
    const K = M().K, x = K.RAFT_X1 - 58, r = M().raftAt(B, x) || B.rafts.find((q) => x >= q.x && x <= q.x + q.w + 40); if (!r) return;
    ctx.save(); ctx.translate(Math.min(x, r.x + r.w - 52), r.y + 1); ctx.scale(0.95, 0.95); sd.PROPS.pile(ctx, api.time, {}); ctx.restore();
  }
  // the steps of a stuck arm: flat, bright lids on its top, so they read as something to stand on
  function drawSteps(ctx, B, c) {
    const K = M().K, pulse = 0.5 + 0.5 * Math.sin(api.time * 6);
    for (const st of B.steps) {
      const x = st.x + K.STEP_W / 2, y = st.y;
      ell(ctx, x, y + 3, K.STEP_W / 2 + 1, 6.5); fill(ctx, c.stepRim);
      ell(ctx, x, y + 1.5, K.STEP_W / 2 - 1, 5); fill(ctx, c.step);
      ell(ctx, x, y + 2, K.STEP_W * 0.2, 2); fill(ctx, c.stepRim, STEP_LID * (0.6 + 0.4 * pulse));
    }
  }

  // ---------- head and face ----------
  function eye(ctx, x, y, r, lx, ly, shade) {
    ell(ctx, x, y, r, r); fill(ctx, '#FFFFFF');
    ell(ctx, x + lx, y + ly, r * 0.52, r * 0.52); fill(ctx, shade);
    ell(ctx, x + lx + r * 0.2, y + ly - r * 0.22, r * 0.17, r * 0.17); fill(ctx, '#FFFFFF');
  }
  function mood(B) {
    if (B.done) return 'beaten';
    if (B.state === 'hurt' || B.flash > 0.3) return 'hurt';
    if (B.rise < 0.75) return 'sleep';
    if (B.state === 'stuck') return 'strain';
    if (B.puff > 0.2) return 'puff';
    return 'angry';
  }
  function drawFace(ctx, B, h, c) {
    const md = mood(B), p = api.p, ink = c.shade;
    const look = (ex, ey) => { if (!p) return [-9, 7]; const dx = p.x + p.w / 2 - (h.x + ex), dy = p.y + 10 - (h.y + ey), d = Math.hypot(dx, dy) || 1; return [dx / d * 9, dy / d * 8]; };
    const blush = md === 'beaten' ? c.blush : c.lite, cheekK = md === 'puff' ? 1.9 : md === 'beaten' ? 1.6 : 1;
    ell(ctx, -76, 36, 13 * cheekK, 7 * cheekK); fill(ctx, blush, 0.8); ell(ctx, 64, 30, 13 * cheekK, 7 * cheekK); fill(ctx, blush, 0.8);
    if (md === 'sleep' || md === 'beaten') {
      ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const [ex, ey] of [[-48, 4], [34, -2]]) { ctx.beginPath(); if (md === 'beaten') ctx.arc(ex, ey + 6, 16, 1.15 * Math.PI, 1.85 * Math.PI); else ctx.arc(ex, ey - 4, 15, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    } else if (md === 'hurt') {
      ctx.strokeStyle = ink; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.beginPath();
      for (const [ex, ey, s] of [[-48, 2, 1], [34, -4, -1]]) { ctx.moveTo(ex - 14 * s, ey - 12); ctx.lineTo(ex + 10 * s, ey); ctx.lineTo(ex - 14 * s, ey + 12); }
      ctx.stroke();
    } else {
      const sq = md === 'strain' ? 0.62 : 1, [lx, ly] = look(-48, 2), [rx, ry] = look(34, -4);
      eye(ctx, -48, 2, 25 * (md === 'strain' ? 0.8 : 1), lx, ly * sq, ink);
      eye(ctx, 34, -4, 25, rx, ry, ink);
      const tilt = md === 'strain' ? 10 : md === 'puff' ? -4 : 0;
      line(ctx, -74, -32 - tilt * 0.4, -28, -18 + tilt, ink, 6); line(ctx, 64, -38 - tilt * 0.4, 16, -24 + tilt, ink, 6);
    }
    // mouth
    if (md === 'hurt') { ell(ctx, -10, 52, 16, 13); fill(ctx, ink); }
    else if (md === 'puff') { ell(ctx, -12, 50, 6, 6); fill(ctx, ink); }
    else if (md === 'strain') { ctx.beginPath(); ctx.moveTo(-30, 52); for (let i = 1; i <= 6; i++) ctx.lineTo(-30 + i * 7, 52 + (i % 2 ? -4 : 4)); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
    else if (md === 'beaten') { ctx.beginPath(); ctx.arc(-10, 46, 8, 0.2 * Math.PI, 0.8 * Math.PI); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke(); }
    else { ell(ctx, -10, 50, 11, 8); fill(ctx, ink); }
    // a drop of sweat while it pulls at a stuck arm
    if (md === 'strain') { const k = (api.time * 1.4) % 1; ell(ctx, 96, -40 + k * 30, 5, 7); fill(ctx, '#FFFFFF', 0.85 * (1 - k)); }
  }
  function drawHead(ctx, B, c) {
    const h = M().head(B), sq = B.sq || 1, v = view();
    if (h.y - h.ry - 120 > v.y1) return h;
    const body = api.boss.col(B, B.blush > 0 ? api.mixHex(c.body, c.blush, B.blush * 0.75) : c.body);
    ctx.save(); ctx.translate(h.x, h.y + h.ry); ctx.scale(1 + (1 - sq) * 0.5, sq); ctx.translate(0, -h.ry); ctx.rotate(h.tilt);
    ell(ctx, 0, 0, h.rx, h.ry); fill(ctx, body);
    ell(ctx, 0, 60, 126, 60); fill(ctx, c.shade, 0.05);
    ctx.beginPath(); for (const [dx, dy, r] of [[-70, -78, 12], [-40, -96, 7], [-92, -44, 6], [64, -84, 9], [92, -52, 5]]) { ctx.moveTo(dx + r, dy); ctx.arc(dx, dy, r, 0, TAU); } fill(ctx, c.lite, 0.8);
    drawFace(ctx, B, h, c);
    ctx.restore();
    return h;
  }
  // the captain's hat (also flies at the end): centre of the band at x, y
  function drawHat(ctx, x, y, rot, scale, c, band) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
    ell(ctx, 0, -10, 80, 24); fill(ctx, c.hatTop);
    api.rr(-72, -4, 144, 20, 10); fill(ctx, band || c.hatBand);
    ctx.beginPath(); ctx.ellipse(-10, 16, 76, 12, 0, 0, Math.PI); ctx.closePath(); fill(ctx, c.hatBrim);
    ell(ctx, 0, 4, 8.5, 8.5); fill(ctx, c.badge);
    ctx.strokeStyle = c.hatBand; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 8); ctx.moveTo(-3.5, 6); ctx.quadraticCurveTo(0, 10, 3.5, 6); ctx.stroke();
    ctx.restore();
  }
  // the small hat for Mimo's head (wardrobe and the end of the fight); the band sits on the head top
  function drawCap(ctx, c) {
    ell(ctx, 0, -6, 12, 5.2); fill(ctx, c.hatTop);
    api.rr(-10.5, -3, 21, 5.5, 2.75); fill(ctx, c.hatBand);
    ctx.beginPath(); ctx.ellipse(-2.2, 2.2, 11, 2.6, 0, 0, Math.PI); ctx.closePath(); fill(ctx, c.hatBrim);
    ell(ctx, 0, -0.4, 1.8, 1.8); fill(ctx, c.badge);
  }

  // ---------- the raft ----------
  function drawRaft(ctx, B, c) {
    const deckY = M().deckY(B);
    B.rafts.forEach((r, i) => {
      const x = r.x, w = r.w, y = r.y, brokenR = B.broken && i === 0, brokenL = B.broken && i === 1;
      api.rr(x + 6, y + 20, w - 12, 12, 5); fill(ctx, c.log);
      api.rr(x, y, w, 24, 7); fill(ctx, c.deck);
      ctx.beginPath(); for (let px = x + 46; px < x + w - 10; px += 52) { ctx.moveTo(px, y + 4); ctx.lineTo(px, y + 21); } ctx.strokeStyle = c.shade; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.12; ctx.stroke(); ctx.globalAlpha = 1;
      // splintered ends where it broke
      const jag = (ex, dir) => { ctx.beginPath(); ctx.moveTo(ex, y); ctx.lineTo(ex + dir * 9, y + 5); ctx.lineTo(ex - dir * 2, y + 10); ctx.lineTo(ex + dir * 7, y + 16); ctx.lineTo(ex, y + 24); ctx.closePath(); fill(ctx, c.deck); };
      if (brokenR) jag(x + w, 1); if (brokenL) jag(x, -1);
      if (i === 0) { drawMast(ctx, B, x + 88, y, c); api.rr(x + 28, y - 30, 30, 30, 7); fill(ctx, c.crate); line(ctx, x + 28, y - 20, x + 58, y - 20, c.shade, 2, 0.15); line(ctx, x + 28, y - 10, x + 58, y - 10, c.shade, 2, 0.15); }
    });
    // ink on the deck: glossy dark blots (slippery), they fade at the end
    for (const k of B.inks) {
      const a = Math.min(1, k.life, k.t * 6);
      ell(ctx, k.x, deckY + 2, k.w / 2, 5.5); fill(ctx, c.ink, 0.92 * a);
      ell(ctx, k.x - k.w * 0.32, deckY - 1, 7, 3.5); fill(ctx, c.ink, 0.92 * a);
      ell(ctx, k.x + k.w * 0.18, deckY + 0.5, k.w * 0.16, 1.6); fill(ctx, c.inkHi, 0.8 * a);
    }
  }
  function drawMast(ctx, B, mx, y, c) {
    line(ctx, mx, y, mx, y - 150, c.mast, 7);
    const t = api.time, wave = Math.sin(t * (3 + B.storm * 5)) * (4 + B.storm * 5), top = y - 150;
    ctx.beginPath(); ctx.moveTo(mx + 4, top + 4); ctx.quadraticCurveTo(mx + 38, top - 2 + wave, mx + 62, top + 12 + wave * 0.5); ctx.lineTo(mx + 44, top + 22); ctx.lineTo(mx + 60, top + 36 + wave * 0.4); ctx.quadraticCurveTo(mx + 34, top + 30, mx + 4, top + 38); ctx.closePath(); fill(ctx, c.flag);
  }
  // in the storm two arms hold the raft halves down: a curl over each outer deck edge
  function drawHolders(ctx, B, c) {
    const k = B.holdK; if (k <= 0.01) return;
    const Mk = M(), K = Mk.K, s = api.time, deck = Mk.deckY(B);
    for (const [x, dir] of [[K.RAFT_X0 + 10, 1], [K.GAP_X1 + 10, 1]]) {
      const tipY = Mk.lerp(K.SURF + 60, deck - 6, k), wob = Math.sin(s * 2 + x) * 2;
      const ps = Mk.pose(x + dir * 20, tipY + wob, x + dir * 4, deck - 26, x - dir * 14, deck + 4, x - dir * 12, K.SURF + 64, 6, 13);
      drawArm(ctx, ps, c.body, c.lite, -1);
    }
  }

  // ---------- warnings ----------
  // the shadow on the deck under the raised arm: exactly where the arm will come down low enough to hurt
  function drawAimShadow(ctx, B, a, c) {
    const Mk = M(), K = Mk.K, tp = Mk.TEMPO[api.boss.phase(B)], deck = Mk.deckY(B);
    const h = Mk.head({ lean: 1, rise: B.rise, bob: B.bob, sink: B.sink }), ps = Mk.slamStuck(a.tx, deck, Mk.root(h), 0);
    const span = Mk.lowSpan(ps, deck, 34, Mk.peakK(ps)); if (!span) return;
    const onDeck = !!Mk.raftAt(B, a.tx, 4), y = onDeck ? deck + 2 : K.SURF + 1, total = tp.track + tp.lock;
    const k = a.st === 'rise' ? 0 : Math.min(1, B.t / total), locked = B.t >= tp.track || B.state === 'slam';
    const cx = (span.x0 + span.x1) / 2, rx = (span.x1 - span.x0) / 2 + 6;
    ell(ctx, cx, y, rx, 8 + k * 2); fill(ctx, c.shade, SHADOW_ALPHA[0] + (SHADOW_ALPHA[1] - SHADOW_ALPHA[0]) * k);
    ell(ctx, a.tx, y, 30 + k * 10, 5 + k * 2); fill(ctx, c.shade, 0.25 * k);
    const pulse = 0.55 + 0.45 * Math.sin(api.time * (locked ? 18 : 9));
    ell(ctx, cx, y, rx, 8 + k * 2); ctx.strokeStyle = api.P.thorn; ctx.lineWidth = locked ? 3.5 : 2.5; ctx.globalAlpha = (locked ? 0.95 : 0.55) * pulse; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // bubbles from the deep, the arm creeping up under them, and two rings on the surface where it will come out
  function drawBelowWarn(ctx, a, c) {
    const K = M().K, surf = window.MimoCoast.surface() || K.SURF, k = Math.min(1, a.t / a.warn);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const ph = (api.time * 1.7 + i / 7) % 1, x = a.bx + Math.sin(i * 2.3 + api.time * 3) * 10, y = K.FLOOR - 10 - ph * (K.FLOOR - surf - 6), r = 2.6 + ph * 3.4 + k * 1.6;
      ell(ctx, x, y, r, r); ctx.globalAlpha = 0.95 * Math.sin(ph * Math.PI); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the water darkens over the arm and two rings spread just under the surface line
    ell(ctx, a.bx, surf + 12, 26 + k * 10, 9); fill(ctx, c.shade, 0.1 + 0.18 * k);
    for (let i = 0; i < 2; i++) {
      const q = (api.time * 2.2 + i * 0.5) % 1, rx = 12 + q * (22 + k * 14), ry = 4 + q * 5;
      ell(ctx, a.bx, surf + 8, rx, ry); ctx.strokeStyle = api.P.thorn; ctx.lineWidth = 3.5; ctx.globalAlpha = (0.55 + 0.45 * k) * (1 - q * 0.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // chevrons on the deck in the direction the sweeping arm will go
  function drawSweepWarn(ctx, B, a) {
    const deck = M().deckY(B), k = Math.min(1, a.t / M().TEMPO[api.boss.phase(B)].wind), off = (api.time * 140) % 64;
    ctx.strokeStyle = api.P.thorn; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 64 + off; if (!M().raftAt(B, x, 6)) continue;
      ctx.globalAlpha = (0.35 + 0.55 * k) * Math.min(1, (x - 30) / 60); ctx.beginPath(); ctx.moveTo(x - 6, deck - 16); ctx.lineTo(x + 3, deck - 9); ctx.lineTo(x - 6, deck - 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- the water in front: what lies under the line looks under water (Mimo stays crisp, he is drawn later) ----------
  function drawVeil(ctx) {
    const s = window.MimoCoast.surface(), v = view(); if (s == null || s > v.y1) return;
    ctx.fillStyle = veil; ctx.globalAlpha = VEIL_ALPHA; ctx.fillRect(v.x0, s + 3, v.x1 - v.x0, v.y1 - s); ctx.globalAlpha = 1;
  }
  // far arms in the back, beside and behind the head (eight arms, most of them under water); never over the raft
  function drawFarArms(ctx, B, c) {
    const Mk = M(), t = api.time, sink = (B.sink || 0) + (1 - (B.rise == null ? 1 : B.rise)) * 300;
    const w = Mk.K.WEST;
    drawArm(ctx, Mk.pose(w + 854, 174 + Math.sin(t * 1.3) * 8 + sink, w + 876, 214 + sink, w + 824, 254 + sink, w + 836, 380 + sink, 6, 18), c.far, c.lite, -1);
    drawArm(ctx, Mk.pose(w + 598 + Math.sin(t * 1.7) * 6, 96 + Math.cos(t * 1.1) * 6 + sink, w + 560, 136 + sink, w + 646, 204 + sink, w + 640, 300 + sink, 6, 17), c.far, c.lite, 1, true);
  }

  // ---------- the hooks the boss part calls ----------
  function draw(B, ctx) {
    const c = colours(), Mk = M();
    drawFarArms(ctx, B, c);
    drawHead(ctx, B, c);
    const hc = Mk.hat(B);
    if (!B.hatFly) drawHat(ctx, hc.x, hc.y, hc.rot, 1, c, api.boss.col(B, c.hatBand));
    drawHolders(ctx, B, c);
    drawRaft(ctx, B, c);
    drawLoot(ctx, B);
    for (const a of B.arms) {
      if (a.kind === 'slam' && (a.st === 'rise' || a.st === 'aim' || B.state === 'slam') && !B.scene) drawAimShadow(ctx, B, a, c);
      if (a.kind === 'sweep' && a.st === 'wind') drawSweepWarn(ctx, B, a);
    }
    for (const a of B.arms) {
      const ps = Mk.poseOf(B, a);
      drawArm(ctx, ps, api.boss.col(B, c.body), c.lite, -1);
      if (a.kind === 'slam' && B.steps.length) drawSteps(ctx, B, c);
    }
    drawVeil(ctx);
    for (const a of B.arms) if (a.kind === 'below' && a.st === 'warn') drawBelowWarn(ctx, a, c);
  }
  function drawFront(B, ctx) {
    const c = colours();
    if (B.hatFly && !B.hatOn) drawHat(ctx, B.hatFly.x, B.hatFly.y, B.hatFly.rot, B.hatFly.scale, c);
    drawStorm(ctx, B, c);
  }
  function drawStorm(ctx, B, c) {
    const k = B.storm; if (k < 0.02) return;
    const v = view(), t = api.time;
    if (!api.reduced) {
      ctx.strokeStyle = c.rain; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.45 * k; ctx.beginPath();
      for (let i = 0; i < RAIN; i++) {
        const fx = api.hash(i, 3), sp = 520 + api.hash(i, 7) * 200, y = v.y0 + (((fx * 900 + t * sp) % (v.y1 - v.y0)) + (v.y1 - v.y0)) % (v.y1 - v.y0), x = v.x0 + ((api.hash(i, 5) * (v.x1 - v.x0) - t * sp * 0.25) % (v.x1 - v.x0) + (v.x1 - v.x0)) % (v.x1 - v.x0);
        ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (B.flashT > 0 && !api.reduced) { ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = Math.min(0.55, B.flashT * 1.6); ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); ctx.globalAlpha = 1; }
  }
  // a storm darkens the sky and the sea behind everything that matters
  function drawStormBack(ctx) {
    const B = api.mode === 'boss' && api.G.boss && api.G.boss.krake ? api.G.boss : null; if (!B || !(B.storm > 0.02)) return;
    const v = view(), c = colours();
    ctx.fillStyle = c.storm; ctx.globalAlpha = 0.3 * B.storm; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); ctx.globalAlpha = 1;
  }
  function drawShot(B, s, ctx) {
    if (s.type !== 'krakeInk') return;
    const c = colours();
    ell(ctx, 0, 0, s.r, s.r); fill(ctx, c.ink);
    ell(ctx, -s.r * 0.35, -s.r * 0.35, s.r * 0.3, s.r * 0.22); fill(ctx, c.inkHi, 0.9);
  }

  // ---------- the fight song: a shanty in D minor that sways in three (the fight adds the arpeggio, then the drums) ----------
  const Dm = [38, 57, 62, 65], C = [36, 55, 60, 64], A7 = [45, 57, 61, 67], F = [41, 57, 60, 65], Bb = [46, 58, 62, 65], Gm = [43, 58, 62, 67];
  const songs = {
    bossCoast: { bpm: 152, beats: 3, swing: 0.1, boss: true, live: true, lead: 'clar', counter: 'pizz', arp: 'pluck', bass: 'waltz', density: 0.72,
      scale: [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81],
      kits: { a: { timp: 'x.....', wood: '...x..' }, b: { timp: 'x..x..', snare: '...x..', sh: 'x.xx.x' } },
      form: ['A', 'B', 'A', 'C'],
      sec: { A: { ch: [Dm, C, Dm, A7, Dm, C, A7, Dm], cpb: 1, bars: 8, mel: 'fixed', kit: 'a' },
        B: { ch: [F, C, Dm, A7, Bb, F, Gm, A7], cpb: 1, bars: 8, mel: 'gen', kit: 'b', counter: 0.5 },
        C: { ch: [Gm, Dm, A7, Dm], cpb: 2, bars: 8, mel: 'gen', kit: 'b', dens: 0.5, arp: 1 } } },
  };

  // ---------- wardrobe: the captain's hat (the 3D Mimo of the bonus run does not wear it) ----------
  const costumes = [{ id: 'h_captain', kind: 'hat', name: 'Kapitänsmütze', price: 0, boss: 4,
    // Mimo is never tinted by the clock, so his hat is not either
    draw(ctx, o) { ctx.translate(0, o.top + 1); ctx.rotate(o.tilt * 0.4 - 0.08); drawCap(ctx, api.dark ? DARK : LIGHT); } }];

  window.MimoWorlds.register({
    world: 4, songs, costumes,
    setup(a) { api = a; },
    draw(layer, ctx) { if (layer === 'back') drawStormBack(ctx); },
  });
  Object.assign(window.MimoKrake = window.MimoKrake || {}, { draw, drawFront, drawShot });
})();
