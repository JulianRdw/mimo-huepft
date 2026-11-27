// World 5 story pictures, second batch: the props of the second round of the climb (thesis board, sleeping brothers, scarf
// rail, polaroids, a rolling stone) and the little things people pull out of pockets and packs. Same rules as
// volcano-story-draw.js: pure drawing, origin = bottom centre of the prop, y points down, every motion depends only on the
// time t it is given (api.time) and on the fields of the cast entry, so the level bots replay exactly.
//
// Cast entries { who: 'prop', kind, x, y, ... } (x, y tile cell like every cast entry):
//   thesis      the professor's board on two legs, 64 wide. state: 'kein' ("These: Kein Drache") | 'strich' (the line struck through)
//               | 'papa' (struck through + "Drache = Papa?") | 'herz' (the back of the board with a heart). A change of the
//               field `state` plays by itself: the strike is drawn in 0.5 s, the new line is chalked in letter by letter, the board
//               turns over for 'herz'. (Set it with the scene op ['set', tag, { state: 'papa' }].)
//   sleepers    three small fire brothers with headsets on stones (what the lecture is for). Without t0 they listen, nodding;
//               with t0 (seconds of game time, see the scene op ['go', tag]) they fall asleep one after the other (gap, default 1.4 s,
//               the first after lag, default 2 s), Z's rise over each. wake: seconds after t0 where they all start up again (optional).
//   scarfrail   the red and white scarf pulled taut as a railing from this tile to x2 (tile), on two stakes. Only a picture. y of the
//               stakes = the row of the cast entry; rail: height in px (default 22)
//   polaroid    one instant picture standing on the ground (34 x 40 px). With t0 it slides out of the camera first (0.7 s) and develops
//               (grey to colour, 3 s); without t0 it is simply there. fauch: true puts Fauch tiny into the background (fx 0..1 across,
//               fy 0..1 down, default 0.78 / 0.3); people: 3 (how many little friends stand in front). scene: name of a real
//               photo of volcano-photos.js (SCENES) instead of the little symbol picture; big: [from, secs] shows it big on the screen
//   photostack  a pile of polaroids to leaf through, 46 x 56 px. n pictures (default 5), every: seconds each one stays (default 2.2),
//               t0 starts the leafing (the top picture slides off to the left, the next one shows), spots: [[fx, fy, size, face], ...]
//               puts Fauch somewhere else on each picture (he is on every one). Stays on the last picture.
//   rollstone   a small stone that rolls from its tile to x2 (tile, same row), slowing down, from t0 for dur seconds (default 1.8).
//               drop: rows (> 0) lets it fall over the edge there and sink into the lava with a hiss (fall the last 0.6 s).
//   item        a small thing lying on the ground: what: 'umbrella' | 'ring' | 'plaster' | 'scale' (also used by the figures' hands)
// Also exported: MimoVolcano.draw2 = { drawItem(ctx, what, t), photoScene(ctx, w, h, o), drawScarfBand(ctx, pts, w, cols), fauchSpec }.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const S = () => window.MimoCoast.sdraw;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const T = 32;
  const col = () => ({ ...S().COL, stone: '#A79CBB', stoneDeep: '#7D7290', stoneLite: '#C9C0D8', ember: '#FF9A55', emberHot: '#FFD58A' });
  const now = () => { const C = window.MimoCoast; return C.storyEnv && C.storyEnv.api ? C.storyEnv.api.time : 0; };
  const SCARF = ['#F28C82', '#FFFFFF'];

  // ---------- small things ----------
  // all about 16 px, drawn around their own centre
  function drawItem(ctx, what, t) {
    const { paint, ell, rrect } = S(), c = col();
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (what === 'umbrella') { // a closed beach parasol: striped cone on a pole with a tip
      ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-11, 1); ctx.lineTo(10, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -4.4); ctx.quadraticCurveTo(0, -5, 10, -0.6); ctx.quadraticCurveTo(0, 5.6, -9, 4.2); ctx.closePath(); paint(ctx, c.white);
      ctx.fillStyle = c.red; for (const x of [-6, -1.4, 3.4]) { ctx.beginPath(); ctx.moveTo(x, -4.6 + (x + 9) * 0.22); ctx.lineTo(x + 2.4, -4.6 + (x + 11.4) * 0.22 + 0.2); ctx.lineTo(x + 2.4, 4.8 - (x + 11.4) * 0.2); ctx.lineTo(x, 4.6 - (x + 9) * 0.2); ctx.closePath(); ctx.fill(); }
    } else if (what === 'ring') { // a swim ring with red and white quarters
      ell(ctx, 0, 0, 8.4, 8.4); ctx.fillStyle = c.white; ctx.fill();
      ctx.strokeStyle = c.red; ctx.lineWidth = 4.6; for (const a of [0.1, Math.PI + 0.1]) { ctx.beginPath(); ctx.arc(0, 0, 5.9, a, a + Math.PI / 2); ctx.stroke(); }
      ctx.strokeStyle = S().ink(); ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, TAU); ctx.moveTo(3.4, 0); ctx.arc(0, 0, 3.4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (what === 'plaster') { // a band aid
      ctx.rotate(-0.3); rrect(ctx, -9, -3.4, 18, 6.8, 3.2); paint(ctx, '#F3CBA4');
      ctx.fillStyle = '#FFE9CF'; rrect(ctx, -3.2, -3.4, 6.4, 6.8, 0); ctx.fill();
      ctx.fillStyle = '#D9A877'; for (const [x, y] of [[-1.2, -1.2], [1.2, 0], [-1, 1.4]]) { ctx.beginPath(); ctx.arc(x, y, 0.5, 0, TAU); ctx.fill(); }
    } else if (what === 'scale') { // a dragon scale: shiny coral, a ridge, a glint
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.bezierCurveTo(7, -7, 8.4, 1, 0, 8.6); ctx.bezierCurveTo(-8.4, 1, -7, -7, 0, -8); ctx.closePath(); paint(ctx, '#EE8A7D');
      ctx.strokeStyle = '#C9605A'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.moveTo(-3.6, -3.4); ctx.quadraticCurveTo(-3, 0, -1.4, 3.4); ctx.moveTo(3.6, -3.4); ctx.quadraticCurveTo(3, 0, 1.4, 3.4); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(-2.6, -3.8, 1.2, 2.6, 0.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const g = (Math.sin((t || 0) * 5) + 1) / 2; ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = 0.3 + 0.7 * g; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(5.4, -8.6 - g); ctx.lineTo(5.4, -4.4 + g); ctx.moveTo(3, -6.5); ctx.lineTo(7.8, -6.5); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (what === 'sausage') { // plain sausage lying or flying
      rrect(ctx, -7, -2.6, 14, 5.2, 2.6); paint(ctx, '#D98C4A');
    }
    ctx.restore();
  }

  // ---------- the scarf as a band along a polyline (rail, canopy edge) ----------
  function drawScarfBand(ctx, pts, w, cols) {
    const cs = cols || SCARF, n = pts.length;
    ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(58,46,72,0.45)'; ctx.lineWidth = w + 1.6; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    for (let i = 1; i < n; i++) { ctx.strokeStyle = cs[Math.floor((i - 1) / 2) % 2 ? 1 : 0]; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- the thesis board ----------
  const LINES = { kein: [['THESE:', 6, -8], ['Kein Drache', 9.6, 3]], strich: [['THESE:', 6, -8], ['Kein Drache', 9.6, 3]], papa: [['THESE:', 6, -10], ['Kein Drache', 8.6, -1], ['Drache = Papa?', 8.2, 11]] };
  const CHALK = '#F7F3E8', CHALK_RED = '#F59A8E', CHALK_YELLOW = '#FFE08F';
  function chalkText(ctx, text, y, size, color, k) {
    ctx.font = 'bold ' + size + 'px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    if (k >= 1) { ctx.fillText(text, 0, y); return ctx.measureText(text).width; }
    const n = Math.max(0, Math.floor(text.length * k)), w = ctx.measureText(text).width; ctx.textAlign = 'left'; ctx.fillText(text.slice(0, n), -w / 2, y); ctx.textAlign = 'center'; return w;
  }
  function strike(ctx, y, w, k, color) {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w / 2 - 3, y - 3.2); ctx.lineTo(-w / 2 - 3 + (w + 6) * clamp01(k), y - 3.8 + clamp01(k) * 1.2); ctx.stroke(); ctx.restore();
  }
  function boardFront(ctx, state, since) {
    const lines = LINES[state] || LINES.kein, k = clamp01(since / 0.5), typed = clamp01((since - 0.55) / 1.0);
    lines.forEach(([text, size, y], i) => {
      const isNew = state === 'papa' && i === 2, w = chalkText(ctx, text, y, size, i === 0 ? 'rgba(247,243,232,0.7)' : isNew ? CHALK_YELLOW : CHALK, isNew ? typed : 1);
      if (i === 1 && (state === 'strich' || state === 'papa')) strike(ctx, y, w, k, CHALK_RED);
    });
  }
  function thesis(ctx, t, e) {
    const { paint, rrect } = S(), c = col(), st = e.state || 'kein';
    // remember the change of state (drawing keeps the time of the first picture of a new state, from game time only)
    if (e._st !== st) { e._prev = e._st; e._st = st; e._since = e._prev == null ? -99 : t; }
    const since = t - e._since, flip = st === 'herz' && since < 0.6 ? since / 0.6 : st === 'herz' ? 1 : e._prev === 'herz' && since < 0.6 ? 1 - since / 0.6 : 1;
    ctx.save(); ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(-24, 0); ctx.moveTo(18, -20); ctx.lineTo(24, 0); ctx.moveTo(0, -20); ctx.lineTo(0, -3); ctx.stroke();
    ctx.translate(0, -37); const sx = Math.max(0.04, Math.abs(st === 'herz' ? (flip < 0.5 ? 1 - flip * 2 : (flip - 0.5) * 2) : (e._prev === 'herz' && since < 0.6 ? (flip > 0.5 ? (flip - 0.5) * 2 : 1 - flip * 2) : 1)));
    ctx.scale(sx, 1);
    const back = st === 'herz' ? flip >= 0.5 : (e._prev === 'herz' && since < 0.6 ? flip > 0.5 : false);
    if (back) { // the back: bare wood with a heart
      rrect(ctx, -33, -20, 66, 40, 3); paint(ctx, c.wood);
      ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(-31, -8); ctx.lineTo(31, -8); ctx.moveTo(-31, 8); ctx.lineTo(31, 8); ctx.stroke(); ctx.globalAlpha = 1;
      const b = 1 + 0.06 * Math.sin(t * 4); ctx.translate(0, 1); ctx.scale(b, b);
      ctx.beginPath(); ctx.moveTo(0, 11); ctx.bezierCurveTo(-18, -1, -9, -15, 0, -6); ctx.bezierCurveTo(9, -15, 18, -1, 0, 11); ctx.closePath(); paint(ctx, '#F0707F', 0.4);
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(-5.4, -6, 2.4, 1.4, -0.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      rrect(ctx, -33, -20, 66, 40, 3); paint(ctx, c.woodDeep);
      rrect(ctx, -30.5, -17.5, 61, 35, 2); ctx.fillStyle = '#4A6B62'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-30, -17, 60, 9);
      ctx.save(); boardFront(ctx, st, e._prev === 'herz' ? 9 : since); ctx.restore();
      ctx.fillStyle = c.wood; rrect(ctx, -30, 17.5, 60, 2.6, 1); ctx.fill();   // the chalk ledge
      ctx.fillStyle = CHALK; ctx.fillRect(-22, 15.6, 6, 2.2);
    }
    ctx.restore();
  }

  // ---------- the three sleeping brothers ----------
  const BRO_COLS = ['#FF8A55', '#FFB04F', '#F26E5E'];
  function sleepers(ctx, t, e) {
    const W = (S().COL && window.MimoCoast.storyEnv.api.W) || {}, gap = e.gap == null ? 1.4 : e.gap, lag = e.lag == null ? 2 : e.lag, ink = W.hopperInk || '#5B2A3A', core = W.hopperCore || '#FFEBAA';
    const k0 = e.t0 == null ? null : t - e.t0, wake = e.wake == null ? null : t - e.t0 - e.wake;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 27, own = k0 == null ? 0 : ease((k0 - lag - i * gap) / 0.9), up = wake == null ? 0 : ease((wake - i * 0.15) / 0.35), sl = own * (1 - up), nod = k0 == null || k0 < lag + i * gap ? Math.sin(t * 1.1 + i * 2) * 0.05 : 0;
      ctx.save(); ctx.translate(x, 0);
      ctx.fillStyle = '#7D7290'; ctx.beginPath(); ctx.ellipse(0, -2.6, 13, 4.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#A79CBB'; ctx.beginPath(); ctx.ellipse(-2, -4.4, 8, 2.4, 0, 0, TAU); ctx.fill();
      ctx.translate(0, -6); ctx.rotate((0.34 * sl) * (i % 2 ? -1 : 1) + nod);
      const breathe = 1 + Math.sin(t * 1.5 + i) * 0.03 * (0.4 + sl), R = 9.4 * breathe, col = BRO_COLS[i];
      // glow and a flame tip that sags when he sleeps
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-R * 0.8, -3); ctx.quadraticCurveTo(-1 + 4 * sl, -R * 3.1 + 7 * sl, R * 0.8, -3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -R * 0.9, R, R * 0.92, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(91,42,58,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = core; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, -R * 0.62, R * 0.58, R * 0.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      // eyes: open, drooping, shut
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (const ex of [-3.4, 3.4]) {
        const ey = -R * 0.98;
        if (sl > 0.7) { ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(ex, ey, 1.5, 1.7 * (1 - sl * 0.85), 0, 0, TAU); ctx.fill(); }
      }
      ctx.beginPath(); ctx.ellipse(0, -R * 0.62, 1.4 + sl, 0.9 + sl * 1.1, 0, 0, TAU); ctx.fillStyle = ink; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      // the headset the brothers wear: a band over the top and a boom with a tiny microphone
      ctx.strokeStyle = '#3A3550'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -R * 0.9, R * 1.02, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      ctx.fillStyle = '#3A3550'; ctx.beginPath(); ctx.arc(-R * 1.02, -R * 0.9, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(R * 1.02, -R * 0.9, 2.2, 0, TAU); ctx.fill();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(R * 1.02, -R * 0.9); ctx.quadraticCurveTo(R * 1.1, -R * 0.4, R * 0.5, -R * 0.4); ctx.stroke(); ctx.beginPath(); ctx.arc(R * 0.4, -R * 0.4, 1.2, 0, TAU); ctx.fill();
      ctx.restore();
      // Z's over a sleeper, drifting up and to the side, a new one every 1.7 s, three at a time
      if (sl > 0.8) for (let z = 0; z < 3; z++) {
        const q = ((t + i * 0.57 + z * 0.57) % 1.7) / 1.7; ctx.save(); ctx.globalAlpha = Math.sin(q * Math.PI) * 0.9; ctx.fillStyle = '#7C7AA8'; ctx.font = 'bold ' + (7 + q * 5) + 'px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(z % 2 ? 'z' : 'Z', x + 9 + q * 12 + z * 2, -34 - q * 22); ctx.restore();
      }
    }
  }

  // ---------- the scarf as a railing ----------
  function scarfrail(ctx, t, e) {
    const c = col(), dx = e.x2 != null ? (e.x2 + 0.5) * T - e.x0 : 120, h = e.rail || 22, n = 28, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([u * dx, -h + Math.sin(u * Math.PI) * 4.5 + Math.sin(t * 1.6 + u * 5) * 0.5 * Math.sin(u * Math.PI)]); }
    for (const x of [0, dx]) { // the stakes with a knot
      ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -h - 6); ctx.stroke();
      ctx.fillStyle = SCARF[0]; ctx.beginPath(); ctx.arc(x, -h, 3.4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(58,46,72,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    }
    drawScarfBand(ctx, pts, 5, SCARF);
    ctx.strokeStyle = SCARF[0]; ctx.lineWidth = 1; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(dx + 3, -h + 1 + i * 1.4); ctx.lineTo(dx + 6, -h + 3 + i * 2.2); ctx.stroke(); }
  }

  // ---------- polaroids ----------
  const FAUCH_COL = { body: '#E8807A', spike: '#F6D374' };
  // the little picture: a volcano evening, friends in front, Fauch tiny somewhere (o: { w, h, fauch: { fx, fy, size, face }, people, develop 0..1 })
  function photoScene(ctx, w, h, o) {
    const dev = o.develop == null ? 1 : o.develop;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F9B9A0'); g.addColorStop(1, '#FFE3B8'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8E86A8'; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.78); ctx.lineTo(w * 0.46, h * 0.26); ctx.lineTo(w * 0.62, h * 0.4); ctx.lineTo(w * 0.78, h * 0.3); ctx.lineTo(w * 1.1, h * 0.78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF9A55'; ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.34); ctx.lineTo(w * 0.46, h * 0.26); ctx.lineTo(w * 0.52, h * 0.34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6E6585'; ctx.fillRect(0, h * 0.74, w, h * 0.3);
    const n = o.people == null ? 3 : o.people, cols = ['#F28C82', '#6FA8C9', '#F6D374', '#9ADBC2'];
    for (let i = 0; i < n; i++) { const x = w * (0.2 + 0.2 * i), s = w * 0.05; ctx.fillStyle = cols[i % 4]; ctx.fillRect(x - s * 0.7, h * 0.66, s * 1.4, h * 0.2); ctx.fillStyle = '#F6CDB0'; ctx.beginPath(); ctx.arc(x, h * 0.6, s * 0.8, 0, TAU); ctx.fill(); }
    if (o.fauch) {
      const f = o.fauch, V = window.MimoVolcano;
      ctx.save(); ctx.translate(w * (f.fx == null ? 0.78 : f.fx), h * (f.fy == null ? 0.3 : f.fy));
      if (V && V.draw && V.draw.fauchFly) V.draw.fauchFly(ctx, 0.1, { scale: (f.size || 1) * w * 0.0030, face: f.face || -1 });
      ctx.restore();
    }
    // developing: a grey blue veil that clears
    if (dev < 1) { ctx.fillStyle = 'rgba(120,128,150,' + (0.92 * (1 - dev)) + ')'; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }
  function frame(ctx, w, h, o) { // the white polaroid frame with the picture inside, centre bottom at 0,0
    const { rrect } = S();
    ctx.save(); ctx.fillStyle = 'rgba(58,56,80,0.14)'; ctx.beginPath(); ctx.ellipse(0, -0.4, w * 0.5, 1.8, 0, 0, TAU); ctx.fill();
    rrect(ctx, -w / 2, -h, w, h, 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = 'rgba(58,46,72,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.translate(-w / 2 + w * 0.09, -h + w * 0.09); photoScene(ctx, w * 0.82, h * 0.7, o);
    ctx.restore();
  }
  function polaroid(ctx, t, e) {
    const k = e.t0 == null ? 99 : t - e.t0; if (k < 0) return;
    const slide = ease(k / 0.7), dev = e.t0 == null ? 1 : clamp01((k - 0.7) / 3), w = 34, h = 40;
    ctx.save(); ctx.rotate(0.06 * (e.face || 1)); ctx.translate(0, (1 - slide) * -h * 0.5);
    // scene: a real photo of the moment (volcano-photos.js), rendered once when the figures are loaded
    const ph = e.scene && window.MimoVolcano.photos, pic = ph && (e.shot || (e.shot = ph.render(ph.SCENES[e.scene] || ph.SCENES.probe)));
    if (pic) { const pw = w - 4, H = pw * ph.PH / ph.PW + 9; ph.polaroid(ctx, pic, 0, -H / 2, pw, { shadow: false, develop: dev, b: 2, bb: 7 }); }
    else frame(ctx, w, h, { fauch: e.fauch ? { fx: e.fx, fy: e.fy, size: e.fsize, face: e.ffacing } : null, people: e.people, develop: dev });
    ctx.restore();
  }
  const SPOTS = [[0.8, 0.3, 1, -1], [0.14, 0.42, 1, 1], [0.58, 0.2, 1.1, -1], [0.9, 0.56, 0.9, -1], [0.34, 0.3, 1.2, 1]];
  function photostack(ctx, t, e) {
    const n = Math.max(1, e.n || 5), every = e.every || 2.2, spots = e.spots || SPOTS, k = e.t0 == null ? 0 : Math.max(0, t - e.t0), page = Math.min(n - 1, Math.floor(k / every)), local = k - page * every, w = 46, h = 56;
    const pic = (i, o) => { const s = spots[i % spots.length]; return { fauch: { fx: s[0], fy: s[1], size: s[2], face: s[3] }, people: 3 + (i % 2), ...o }; };
    for (let i = n - 1; i > page; i--) { const d = Math.min(i - page, 3); ctx.save(); ctx.rotate(((i % 3) - 1) * 0.05); ctx.translate(0, -d * 0.8); frame(ctx, w, h, pic(i)); ctx.restore(); }
    // the top picture: sits still, then slides off to the left when its time is over (not after the last one)
    const out = page < n - 1 ? ease((local - (every - 0.5)) / 0.5) : 0;
    ctx.save(); ctx.translate(-out * 70, -out * 6); ctx.rotate(-out * 0.5 + (page % 2 ? 0.03 : -0.03)); ctx.globalAlpha = 1 - out * 0.7; frame(ctx, w, h, pic(page)); ctx.restore();
    // the next one slides in from the right
    if (local < 0.35 && page > 0 && e.t0 != null) { const inn = ease(local / 0.35); ctx.save(); ctx.translate((1 - inn) * 40, 0); ctx.globalAlpha = inn; ctx.restore(); }
  }

  // ---------- a rolling stone ----------
  function rollstone(ctx, t, e) {
    const dx = e.x2 != null ? (e.x2 + 0.5) * T - e.x0 : 100, dur = e.dur || 1.8, k = e.t0 == null ? 0 : clamp01((t - e.t0) / dur), u = 1 - (1 - k) * (1 - k), r = 6, drop = e.drop || 0;
    const fall = drop > 0 && e.t0 != null ? Math.max(0, (t - e.t0 - dur) / 0.6) : 0;
    if (fall > 1) return;
    const c = col(), x = dx * u, y = fall > 0 ? 0.5 * 700 * fall * fall * 0.36 * 0 + fall * fall * drop * T : 0;
    ctx.save(); ctx.translate(x + (fall > 0 ? 8 * fall : 0), -r + y); ctx.rotate(x / r + fall * 3);
    ctx.fillStyle = c.stone; ctx.beginPath(); ctx.moveTo(-r, 0.5); ctx.lineTo(-r * 0.6, -r * 0.9); ctx.lineTo(r * 0.5, -r * 0.95); ctx.lineTo(r, -0.4); ctx.lineTo(r * 0.6, r * 0.85); ctx.lineTo(-r * 0.5, r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,72,0.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = c.stoneLite; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.35, r * 0.2, 0.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (fall > 0.55) { ctx.fillStyle = c.ember; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill(); }
    ctx.restore();
    // the hiss where it sinks: grey steam
    if (fall > 0.8) { ctx.save(); ctx.fillStyle = '#B9B3C9'; for (let i = 0; i < 3; i++) { const q = clamp01((fall - 0.8) / 0.2 + i * 0.1); ctx.globalAlpha = 0.5 * (1 - q); ctx.beginPath(); ctx.arc(dx + 8 + (i - 1) * 5, drop * T - 6 - q * 22, 3 + q * 4, 0, TAU); ctx.fill(); } ctx.restore(); }
  }

  const PROPS = {
    thesis, sleepers, scarfrail, polaroid, photostack, rollstone,
    item(ctx, t, e) { ctx.translate(0, -7); ctx.rotate(e.rot || 0); drawItem(ctx, e.what || 'scale', t); },
  };

  function install() {
    const sd = window.MimoCoast && window.MimoCoast.sdraw; if (!sd) return;
    Object.assign(sd.PROPS, PROPS);
  }
  install();
  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.draw2 = { drawItem, photoScene, drawScarfBand, SCARF, now };
  window.MimoWorlds.register({ world: 5, setup() {} });
})();
