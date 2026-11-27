// World 5 outside its levels: the little painted scene of the "Neu!" card in the main menu (src/index.html, #ovVolcanoNews).
// The family stands at the foot of the volcano for a group photo (the camera on its tripod counts down), the summit smokes
// behind them, the professor's board says "Kein Drache". Up above Fauch flies past, right through the picture just as the
// camera flashes. Nobody looks up, only Mimo: "!", hops, "Piep!". Then Fauch is gone and everybody is pleased with the photo.
//   MimoVolcano.news.draw(c, t, env)   paints the scene into the whole canvas c (400 x 200 units, fitted like the coast card;
//                                      sky and ground reach the canvas edges, everything that matters stays in x 22..378)
//     t    seconds on the card's clock (the loop is LOOP seconds); env = { dark, still, tapAt, mimo(c, x, foot, o), pop(c, text, x,
//          y, k, rot, size) } (drawMimo and the comic words of the core)
//     returns false while the family's pictures are still loading (a still picture is then drawn again a little later)
//   MimoVolcano.news.LOOP, .STILL      the loop length and the second of the still picture (prefers-reduced-motion)
// The jointed figures are the puppets of coast-cast.js (with the pack of volcano-story-acts.js); while their pictures are
// still loading the scene is drawn without them and they fade in. Decoration only: it runs on the real clock, nothing here
// touches the game.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const C = () => window.MimoCoast, V = () => window.MimoVolcano;
  const LOOP = 9, STILL = 4.45, GROUND = 186;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const seg = (k, a, b) => ease((k - a) / (b - a));

  const PAL = {
    light: { skyTop: '#C7B4DE', skyBot: '#FFE3C9', sun: '#FFE1A8', cloud: '#FFFFFF', ridge: '#B59AC0', ridge2: '#C9AFC9',
      cone: '#8C6488', coneShade: '#76527A', coneLite: '#A57C9C', rim: '#FFC978', glow: '#FFB36B', lava: '#FF9A66', smoke: '#F6EEF6', smokeInk: '#D9C8DC',
      path: '#E9CBB4', ground: '#EBCDB6', groundLow: '#DDB79C', dot: '#CFA488', stone: '#A79CBB', stoneLite: '#C9C0D8', tuft: '#9DB88A', tuft2: '#86A777', pop: '#FFFFFF', ink: '#3B3560' },
    dark: { skyTop: '#2B2142', skyBot: '#7A4F62', sun: '#F3B98A', cloud: '#5A4C6E', ridge: '#4A3656', ridge2: '#5A4262',
      cone: '#4B3253', coneShade: '#3E2946', coneLite: '#634468', rim: '#F7B46A', glow: '#F09A5C', lava: '#F08A58', smoke: '#9C8EA6', smokeInk: '#7E6F8A',
      path: '#8E7268', ground: '#8A6E66', groundLow: '#7A5F58', dot: '#6C524C', stone: '#6E6383', stoneLite: '#8A7EA2', tuft: '#5E7A58', tuft2: '#4E6A4A', pop: '#FFF6EA', ink: '#1F1E2C' },
  };

  // the cast: who stands where (x on the 400-unit stage), the pose they hold, where they look, extras
  const CAMERA = { x: 348 };
  const PEOPLE = [
    { who: 'professor', x: 104, pose: 'point', dir: -1, face: -1, look: -60, seed: 11 },
    { who: 'striped', x: 146, pose: 'thumb', face: 1, look: 200, seed: 23, pack: 4 },
    { who: 'kid', x: 184, pose: 'wave', face: 1, look: 160, seed: 37, scale: 0.92 },
    { who: 'filmer', x: 300, pose: 'hooray', face: -1, look: 40, seed: 41 },
  ];
  const MIMO = { x: 226, scale: 1.55 }, DOG = { x: 262 };
  const BOARD = { x: 58 };
  let cast = null, dog = null, born = 0, last = null, board = { state: 'kein' };

  function makeCast() {
    const c = C();
    if (!c || !c.puppet || !c.castKit || !c.castKit.ready()) { if (c && c.castKit) c.castKit.preload(); return false; }
    cast = PEOPLE.map((d) => {
      const p = c.puppet(d.who, d.seed); if (!p) return null;
      if (d.pack != null && V().extraFor) p.fig.extra = V().extraFor({ pack: d.pack, phase: 0 });
      // settle into the pose before the first picture (as the photos of volcano-photos.js do)
      for (let i = 0; i < 12; i++) p.step(0.1, d.x, want(d));
      return { d, p };
    });
    if (cast.some((k) => !k)) { cast = null; return false; }
    if (c.PetFigure) { dog = new c.PetFigure('creamRetriever', 555); dog.dir = -1; dog.setPose('sit'); for (let i = 0; i < 30; i++) { dog.posX = 0; dog.update(0.05); } }
    born = -1;
    return true;
  }
  const want = (d) => ({ pose: d.pose, poseOpts: d.dir ? { dir: d.dir } : {}, face: d.face, look: d.look, idle: false, amp: 0.4 });

  // Fauch's way across the sky: in from the right, over the smoking summit, through the picture at the flash, out on the left
  const FLY = { t0: 2.9, t1: 8.1, x0: 440, x1: -50, flash: 5.4 };
  function fauchAt(k) {
    if (k < FLY.t0 || k > FLY.t1) return null;
    const u = (k - FLY.t0) / (FLY.t1 - FLY.t0), x = FLY.x0 + (FLY.x1 - FLY.x0) * u;
    return { x, y: 30 + u * u * 34 + Math.sin(u * Math.PI * 2.2) * 4 };
  }
  // what Mimo does: looks at the family, spots Fauch ("!"), follows him with his eyes, hops and peeps, then wonders
  function mimoAt(k, f) {
    const o = { look: 0, facing: 1, mood: null, hop: 0, up: 0 };
    const hop = (a, d, h) => (k > a && k < a + d ? Math.sin((k - a) / d * Math.PI) * h : 0);
    if (f && k > 3.55) { o.up = 1; o.facing = f.x < MIMO.x - 6 ? -1 : 1; o.mood = k > 3.6 && k < 4.4 ? 'scared' : null; o.look = -1.4; }
    if (k > 5.85 && k < 6.75) o.mood = 'piep';
    if (k > 7.9 && k < 8.8) { o.facing = 1; o.look = 0; o.mood = 'look'; }
    o.hop = hop(4.35, 0.34, 9) + hop(4.8, 0.34, 9) + hop(6.0, 0.4, 12);
    return o;
  }

  // ---------- the backdrop ----------
  function sky(c, pal, X0, X1, Y0, t) {
    const g = c.createLinearGradient(0, Y0, 0, 150); g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBot);
    c.fillStyle = g; c.fillRect(X0, Y0, X1 - X0, 160 - Y0);
    c.fillStyle = pal.sun; c.globalAlpha = 0.5; c.beginPath(); c.arc(96, 46, 24, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(96, 46, 15, 0, TAU); c.fill();
    c.fillStyle = pal.cloud; c.globalAlpha = 0.75;
    for (const [x0, y, r] of [[30, 24, 8], [330, 86, 6]]) { const x = ((x0 + t * 3) % 520) - 60; c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x + r * 1.2, y - r * 0.5, r * 1.1, 0, TAU); c.arc(x + r * 2.4, y, r * 0.9, 0, TAU); c.rect(x, y, r * 2.4, r * 0.9); c.fill(); }
    c.globalAlpha = 1;
  }
  const SUMMIT = { x: 262, y: 58, w: 17 };
  function volcano(c, pal, X0, X1, t) {
    // far ridges
    c.fillStyle = pal.ridge2; c.beginPath(); c.moveTo(X0, 160);
    for (let x = Math.floor(X0); x <= X1 + 6; x += 6) c.lineTo(x, 128 + Math.sin(x * 0.021 + 0.4) * 7 + Math.sin(x * 0.055) * 2.5);
    c.lineTo(X1, 160); c.closePath(); c.fill();
    // the cone: wide feet, a flat top with the crater
    const S = SUMMIT, L = 108, R = 420, B = 152;
    c.fillStyle = pal.cone; c.beginPath(); c.moveTo(L, B);
    c.bezierCurveTo(170, B - 12, 222, S.y + 40, S.x - S.w, S.y + 2); c.lineTo(S.x + S.w, S.y + 2);
    c.bezierCurveTo(300, S.y + 40, 356, B - 16, R, B); c.closePath(); c.fill();
    // the shade side and a few ribs down the flank
    c.fillStyle = pal.coneShade; c.beginPath(); c.moveTo(S.x + 4, S.y + 3); c.lineTo(S.x + S.w, S.y + 2); c.bezierCurveTo(300, S.y + 40, 356, B - 16, R, B); c.lineTo(318, B); c.bezierCurveTo(292, 118, 272, 90, S.x + 4, S.y + 3); c.closePath(); c.fill();
    c.strokeStyle = pal.coneLite; c.lineWidth = 1.6; c.lineCap = 'round'; c.globalAlpha = 0.7; c.beginPath();
    for (const [x0, x1, y1] of [[252, 226, 112], [258, 246, 130], [244, 200, 128]]) { c.moveTo(x0, S.y + 8); c.quadraticCurveTo((x0 + x1) / 2 - 4, (S.y + y1) / 2, x1, y1); }
    c.stroke(); c.globalAlpha = 1;
    // the hiking path zigzags up the flank (the family's way up)
    c.strokeStyle = pal.path; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.globalAlpha = 0.9; c.beginPath();
    c.moveTo(196, 148); c.lineTo(250, 134); c.lineTo(214, 118); c.lineTo(258, 104); c.lineTo(234, 90); c.lineTo(258, 76); c.lineTo(254, 64);
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    // the glowing crater rim and a thin lava trickle
    const p = 0.5 + 0.5 * Math.sin(t * 2.2);
    const gl = c.createRadialGradient(S.x, S.y, 2, S.x, S.y, 34); gl.addColorStop(0, pal.glow); gl.addColorStop(1, 'rgba(255,179,107,0)');
    c.fillStyle = gl; c.globalAlpha = 0.45 + 0.15 * p; c.beginPath(); c.arc(S.x, S.y, 34, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.fillStyle = pal.rim; c.beginPath(); c.ellipse(S.x, S.y + 2, S.w, 3.2, 0, 0, TAU); c.fill();
    c.strokeStyle = pal.lava; c.lineWidth = 2; c.beginPath(); c.moveTo(S.x + 9, S.y + 4); c.quadraticCurveTo(S.x + 14, S.y + 16, S.x + 11, S.y + 26); c.stroke();
  }
  // smoke from the crater: soft puffs that rise, grow and drift to the left
  function smoke(c, pal, t, still) {
    const S = SUMMIT;
    for (let i = 0; i < 7; i++) {
      const k = still ? (i + 0.5) / 7 : (t * 0.16 + i / 7) % 1, x = S.x - 3 - k * 46 + Math.sin(k * 5 + i) * 4, y = S.y - 4 - k * 52, r = 5 + k * 12;
      c.globalAlpha = (1 - k) * 0.85 * Math.min(1, k * 6); c.fillStyle = pal.smoke;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x + r * 0.7, y + r * 0.2, r * 0.7, 0, TAU); c.fill();
      c.globalAlpha *= 0.5; c.fillStyle = pal.smokeInk; c.beginPath(); c.arc(x + r * 0.3, y + r * 0.45, r * 0.55, 0, Math.PI); c.fill();
    }
    c.globalAlpha = 1;
  }
  function ground(c, pal, X0, X1, Y1) {
    c.fillStyle = pal.ground; c.beginPath(); c.moveTo(X0, Y1);
    for (let x = Math.floor(X0); x <= X1 + 6; x += 6) c.lineTo(x, 150 + Math.sin(x * 0.03 + 1) * 1.6);
    c.lineTo(X1, Y1); c.closePath(); c.fill();
    const g = c.createLinearGradient(0, 160, 0, 200); g.addColorStop(0, pal.ground); g.addColorStop(1, pal.groundLow);
    c.fillStyle = g; c.fillRect(X0, 160, X1 - X0, Y1 - 160);
    c.fillStyle = pal.dot;
    for (let i = 0; i < 40; i++) { const x = ((i * 89 + 7) % 430) - 15, y = 156 + ((i * 47) % 42); c.beginPath(); c.arc(x, y, 0.8 + (i % 3) * 0.35, 0, TAU); c.fill(); }
    for (const [x, y, rx, ry] of [[24, 176, 9, 5], [36, 180, 5, 3], [384, 170, 8, 4.5], [392, 192, 6, 3.5]]) {
      c.fillStyle = pal.stone; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
      c.fillStyle = pal.stoneLite; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.3, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    }
    c.strokeStyle = pal.tuft; c.lineWidth = 1.3; c.lineCap = 'round';
    for (const [x, y] of [[12, 160], [72, 196], [206, 194], [330, 158], [372, 194], [168, 158]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 6); c.moveTo(x + 1, y); c.lineTo(x + 1, y - 7); c.moveTo(x + 2, y); c.lineTo(x + 5, y - 5); c.stroke(); }
  }

  // ---------- the scene ----------
  function draw(c, t, env) {
    env = env || {};
    const pal = PAL[env.dark ? 'dark' : 'light'], cw = c.canvas.width, ch = c.canvas.height, still = !!env.still;
    const s = Math.min(cw / 360, ch / 200), ox = (cw - 400 * s) / 2, oy = (ch - 200 * s) / 2;
    const X0 = -ox / s - 1, X1 = (cw - ox) / s + 1, Y0 = -oy / s - 1, Y1 = (ch - oy) / s + 1, k = t % LOOP;
    const dt = last == null || still ? 0.1 : Math.max(0, Math.min(0.1, t - last)); last = t;
    c.setTransform(s, 0, 0, s, ox, oy);
    sky(c, pal, X0, X1, Y0, t);
    volcano(c, pal, X0, X1, t);
    const f = fauchAt(k);
    smoke(c, pal, t, still);
    // Fauch high above, in front of the smoke: big enough to be seen at once, small enough to stay a background thing
    if (f && V().fauchTiny) V().fauchTiny(c, f.x, f.y, 60, 'fly', t, { face: -1, look: 0.7 });
    ground(c, pal, X0, X1, Y1);
    const ready = figures(c, pal, t, k, dt, still, env, f);
    // comic words
    if (env.pop) {
      const P = (text, x, y, kk, rot, size) => env.pop(c, text, x, y, kk, rot, size, pal);
      P('!', MIMO.x + 27, 114 - mimoAt(k, f).hop, (k - 3.6) / 1.3, 0.12, 24);
      P('Klick!', CAMERA.x - 8, 120, (k - FLY.flash) / 1.2, -0.12, 15);
      P('Piep!', MIMO.x - 36, 122, (k - 5.9) / 1.0, -0.1, 16);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    return ready;
  }
  function figures(c, pal, t, k, dt, still, env, f) {
    if (!cast && !makeCast()) { drawProps(c, t, k); mimo(c, t, k, env, f); return false; }
    if (born < 0) born = t;
    const fade = still ? 1 : clamp01((t - born) / 0.4);
    drawProps(c, t, k);
    c.save(); c.globalAlpha = fade;
    for (const { d, p } of cast) { p.step(dt, d.x, want(d)); p.draw(c, d.x, GROUND, { scale: d.scale || 1.14 }); }
    c.restore();
    if (dog) {
      dog.lookAt = CAMERA.x - DOG.x; dog.posX = 0; dog.update(dt); dog.posX = 0;
      c.save(); c.globalAlpha = fade; dog.draw(c, DOG.x, GROUND + 2, 0.95); c.restore();
    }
    mimo(c, t, k, env, f);
    return true;
  }
  function drawProps(c, t, k) {
    const sd = C() && C().sdraw; if (!sd || !sd.PROPS) return;
    // the professor's board: "THESE: Kein Drache"
    if (sd.PROPS.thesis) { c.save(); c.translate(BOARD.x, GROUND); sd.PROPS.thesis(c, t, board); c.restore(); }
    // the camera on its tripod, turned to the family: the self-timer blinks faster and faster, the flash as Fauch passes
    if (sd.PROPS.camera) { c.save(); c.translate(CAMERA.x, GROUND); c.scale(-1, 1); sd.PROPS.camera(c, k, { t0: FLY.flash - 3.4, timer: 3.4 }); c.restore(); }
  }
  function mimo(c, t, k, env, f) {
    if (!env.mimo) return;
    const m = mimoAt(k, f), tap = env.tapAt != null && t - env.tapAt > 0 && t - env.tapAt < 0.5 ? Math.sin((t - env.tapAt) / 0.5 * Math.PI) * 14 : 0, hop = m.hop + tap;
    env.mimo(c, MIMO.x, GROUND - hop, { scale: MIMO.scale, facing: m.facing, look: m.look, mood: m.mood || (tap > 1 ? 'happy' : null), stretch: m.up, hop });
  }

  // ---------- the volcano behind the garden of the main menu ----------
  // A small, hazy volcano on the horizon behind the garden party (src/index.html calls it between the clouds and the far
  // hill, so the hills hide its feet). It smokes softly; every GV.EVERY seconds Fauch circles over it a few times and
  // sinks back into the crater, where the edge of his nest shows. Background only: pale, small, nothing to tap.
  //   MimoVolcano.gardenVolcano(c, x, now, dark)   x = the middle of the volcano in garden units (with parallax), now = seconds
  const GV = { peak: 72, foot: 108, half: 56, crater: 6, EVERY: 22, FLY: 7.5 };
  const GPAL = {
    light: { cone: '#CDB7CF', shade: '#BDA5C2', rim: '#F6C9A0', glow: '#FFC99A', smoke: '#FFFFFF', nest: '#B89878', egg: '#FFF4E4' },
    dark: { cone: '#4C4466', shade: '#433C5C', rim: '#D99A6E', glow: '#E8946A', smoke: '#8E86A8', nest: '#6E5A52', egg: '#D8D0E0' },
  };
  function gardenVolcano(c, x, now, dark) {
    const g = GPAL[dark ? 'dark' : 'light'], top = GV.peak, cr = GV.crater;
    c.save();
    c.fillStyle = g.cone; c.beginPath(); c.moveTo(x - GV.half, GV.foot);
    c.quadraticCurveTo(x - 20, top + 12, x - cr, top); c.lineTo(x + cr, top); c.quadraticCurveTo(x + 22, top + 14, x + GV.half, GV.foot); c.closePath(); c.fill();
    c.fillStyle = g.shade; c.beginPath(); c.moveTo(x + 2, top + 1); c.lineTo(x + cr, top); c.quadraticCurveTo(x + 22, top + 14, x + GV.half, GV.foot); c.lineTo(x + 16, GV.foot); c.quadraticCurveTo(x + 10, top + 16, x + 2, top + 1); c.closePath(); c.fill();
    // a warm glow in the crater, the rim of the nest just showing (twigs and the top of an egg)
    const p = 0.5 + 0.5 * Math.sin(now * 1.8);
    const gl = c.createRadialGradient(x, top, 0.5, x, top, cr + 4); gl.addColorStop(0, g.glow); gl.addColorStop(1, g.glow + '00');
    c.globalAlpha = 0.35 + 0.15 * p; c.fillStyle = gl; c.beginPath(); c.arc(x, top, cr + 4, Math.PI, 0); c.fill(); c.globalAlpha = 1;
    c.fillStyle = g.rim; c.beginPath(); c.ellipse(x, top + 0.4, cr, 1.2, 0, 0, TAU); c.fill();
    c.fillStyle = g.egg; c.beginPath(); c.ellipse(x + 1.5, top - 0.6, 1.6, 1.9, 0, Math.PI, 0); c.fill();
    c.strokeStyle = g.nest; c.lineWidth = 0.7; c.lineCap = 'round'; c.beginPath();
    for (const [a, b] of [[-5, -3], [-2, 2], [3, 6], [-6, 1], [1, 5.5]]) { c.moveTo(x + a, top + 0.2 - (a & 1) * 0.6); c.lineTo(x + b, top - 0.8 + (b & 1) * 0.5); }
    c.stroke();
    // soft smoke, drifting with the clouds
    for (let i = 0; i < 4; i++) {
      const k = (now * 0.09 + i / 4) % 1, sx = x - 1 - k * 16 + Math.sin(k * 4 + i) * 1.5, sy = top - 3 - k * 24, r = 2.4 + k * 5;
      c.globalAlpha = (1 - k) * 0.55 * Math.min(1, k * 5); c.fillStyle = g.smoke; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    // now and then Fauch: up out of the crater, a few lazy rounds over it, back down onto the nest
    const k = (now + (V().gardenShift || 0)) % GV.EVERY;   // gardenShift: pictures of the tools set it to catch a flight
    if (k < GV.FLY && V().fauchTiny) {
      const up = ease(k / 0.8), down = ease((GV.FLY - k) / 0.8), lift = Math.min(up, down), a = (k / GV.FLY) * TAU * 2.2;
      const fx = x + Math.sin(a) * 18 * lift, fy = top - 3 - lift * 9 + Math.cos(a) * 3, face = Math.cos(a) >= 0 ? 1 : -1;
      c.save(); if (lift < 1) { c.beginPath(); c.rect(x - 60, top - 60, 120, 60.5); c.clip(); }
      V().fauchTiny(c, fx, fy, 13, 'fly', now, { face, alpha: dark ? 0.75 : 0.85 });
      c.restore();
    }
    c.restore();
  }

  V().news = { draw, LOOP, STILL, reset() { last = null; } };
  V().gardenVolcano = gardenVolcano;
  window.MimoWorlds.register({ world: 5 });
})();
