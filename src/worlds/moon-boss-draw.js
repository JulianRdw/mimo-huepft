// World 6 boss "Mondwurm Käsebert": the picture. The craters (dark mouths with a pale lip, the worm comes out of them),
// the worm (round cheese segments with holes, the pink glowing segment, a big round head with feelers), the warnings
// (hopping dust and a pink ring at the crater he comes out of, the dust ripples, the meteors), and the finale (the
// glass helmet, the rising Earth, the rocket home). Look of the mockup (scene "moonBoss" in the approved draft).
// Cheap for old iPhones: plain circles, no shadowBlur, glows from the moon's cached gradients.
(function () {
  'use strict';
  let api = null;
  const K = () => window.MimoKaese, M = () => window.MimoMoon, TAU = Math.PI * 2;
  const LIGHT = { seg: '#F3D98B', seg2: '#EBCB72', hole: '#D9B85F', pink: '#F2A7BC', ink: '#3A3850', blush: '#F4B4C0', white: '#FFFFFF',
    crater: '#2A2850', rim: '#8683AE', lip: '#E3E1F4', warn: '#F08DB0', dust: '#ECEAF8', dustEdge: '#F08DB0', gold: '#F2CF78',
    rocket: '#E4E3F0', rocketInk: '#9C9AB8', fin: '#E7A3B6', window: '#9EDBC1', flame: '#FFC978' };
  const DARK = { seg: '#D9BE72', seg2: '#CDAF5E', hole: '#B89A4C', pink: '#E592AA', ink: '#1E1D33', blush: '#D99AA8', white: '#F4F2FF',
    crater: '#18173A', rim: '#5F5C8C', lip: '#B7B4D8', warn: '#F58FB4', dust: '#C9C6E2', dustEdge: '#F58FB4', gold: '#D9B865',
    rocket: '#B4B2C8', rocketInk: '#7A7896', fin: '#B87C90', window: '#7FC4A6', flame: '#F5BA6A' };
  const col = () => (api.dark ? DARK : LIGHT);
  const tm = () => (api.reduced ? 0 : api.time);
  const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); };
  const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); };

  // ---------- craters ----------
  const CRY = 11;
  function craterBack(ctx, c, x) {
    const gy = K().GY, rx = K().CRATER_RX;
    ell(ctx, x, gy, rx + 6, CRY + 2); ctx.fillStyle = c.rim; ctx.fill();
    ell(ctx, x, gy + 2, rx - 2, CRY - 3); ctx.fillStyle = c.crater; ctx.fill();
  }
  function craterFront(ctx, c, x) {
    const gy = K().GY, rx = K().CRATER_RX;
    ctx.beginPath(); ctx.ellipse(x, gy, rx + 6, CRY + 2, 0, 0.05, Math.PI - 0.05); ctx.strokeStyle = c.rim; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, gy, rx + 6, CRY + 2, 0, Math.PI, TAU); ctx.strokeStyle = c.lip; ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // the warning at the crater he comes out of next: a pink ring closes in, the lip glows
  function craterWarn(ctx, c, B) {
    if (B.state !== 'warn' || !B.pass) return;
    const k = K().clamp(B.t / K().TEMPO[api.boss.phase(B)].warn, 0, 1), x = K().CRATERS[B.pass.a], gy = K().GY, rx = K().CRATER_RX;
    const wob = api.reduced ? 0 : Math.sin(api.time * 40) * 1.5 * k;
    ctx.strokeStyle = c.warn; ctx.lineWidth = 3; ctx.globalAlpha = 0.4 + 0.6 * k;
    ell(ctx, x + wob, gy, rx * (1.7 - 0.7 * k), CRY * (1.7 - 0.7 * k) + 4); ctx.stroke();
    ctx.globalAlpha = 0.25 + 0.3 * k; ctx.fillStyle = c.warn; ell(ctx, x, gy, rx - 2, CRY - 2); ctx.fill(); ctx.globalAlpha = 1;
  }

  // ---------- the worm ----------
  function segment(ctx, c, x, y, r, i) {
    circ(ctx, x, y, r); ctx.fillStyle = i % 2 ? c.seg : c.seg2; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, -2.5, -1.5); ctx.strokeStyle = c.white; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 0.8;
    const s = i % 2 ? 1 : -1; ctx.fillStyle = c.hole;
    ell(ctx, x - 10 * s * r / 35, y + 8 * r / 35, 6 * r / 35, 4.8 * r / 35); ctx.fill();
    ell(ctx, x + 12 * s * r / 35, y - 4 * r / 35, 4.5 * r / 35, 3.6 * r / 35); ctx.fill();
    ell(ctx, x + 2 * s * r / 35, y + 16 * r / 35, 3 * r / 35, 2.4 * r / 35); ctx.fill(); ctx.globalAlpha = 1;
  }
  function pinkSegment(ctx, c, x, y, r, k, hold) {
    const pulse = api.reduced ? 0.7 : 0.5 + 0.4 * Math.sin(api.time * 6);
    if (k <= 0) return;
    M().glow(ctx, 'kaesePink', x, y, r * (hold ? 2.3 : 1.9), c.pink, (hold ? 0.75 : 0.5) * k);
    circ(ctx, x, y, r); ctx.fillStyle = api.mixHex(c.seg, c.pink, k); ctx.fill();
    // the glass helmet shines through his belly
    ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = c.white; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 2, y + 2, r * 0.45, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 2, y + 2, r * 0.32, -2.6, -1.8); ctx.lineWidth = 2.6; ctx.stroke();
    ctx.globalAlpha = (0.45 + 0.45 * pulse) * k; circ(ctx, x, y, r + (hold ? 9 : 6)); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function eye(ctx, c, x, y, r, lx, ly) {
    circ(ctx, x, y, r); ctx.fillStyle = c.white; ctx.fill();
    circ(ctx, x + lx, y + ly, r * 0.52); ctx.fillStyle = c.ink; ctx.fill();
    circ(ctx, x + lx - r * 0.2, y + ly - r * 0.22, r * 0.17); ctx.fillStyle = c.white; ctx.fill();
  }
  function head(ctx, c, B, x, y) {
    const R = K().HEAD_R, p = api.p, mood = B.mood, t = tm();
    const shakeX = B.shakeK ? Math.sin(t * 30) * 5 : 0, gig = B.giggle > 0 ? Math.sin(t * 28) * 3 * B.giggle : 0;
    x += shakeX + gig;
    if (mood === 'munch') y += Math.abs(Math.sin(t * 6)) * 3;
    // feelers with pink tips
    for (const s of [-1, 1]) {
      const tx = x + s * 24 - 4 + Math.sin(t * 3 + s) * 3, ty = y - R - 20;
      ctx.strokeStyle = c.seg2; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + s * 13 - 4, y - R + 4); ctx.quadraticCurveTo(x + s * 18, y - R - 8, tx, ty); ctx.stroke();
      circ(ctx, tx, ty - 1, 4.8); ctx.fillStyle = c.pink; ctx.fill();
    }
    circ(ctx, x, y, R); ctx.fillStyle = c.seg; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, R - 8, -2.6, -1.6); ctx.strokeStyle = c.white; ctx.globalAlpha = 0.35; ctx.lineWidth = 3.5; ctx.stroke(); ctx.globalAlpha = 1;
    const dx = p ? K().clamp((p.x + p.w / 2 - x) / 120, -1, 1) * 4 : 0, dy = p ? K().clamp((p.y - y) / 120, -1, 1) * 3 + 1 : 2;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    if (mood === 'giggle' || mood === 'munch') {
      // happy closed eyes
      for (const ex of [x - 18, x + 10]) { ctx.beginPath(); ctx.arc(ex, y - 6, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    } else {
      eye(ctx, c, x - 18, y - 6, 11, dx, dy); eye(ctx, c, x + 10, y - 10, 11, dx, dy);
      if (mood === 'grumpy') { ctx.beginPath(); ctx.moveTo(x - 32, y - 22); ctx.lineTo(x - 12, y - 18); ctx.moveTo(x + 22, y - 27); ctx.lineTo(x + 3, y - 23); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x - 20, y - 14, 10, -2.6, -0.6); ctx.moveTo(x + 18, y - 25); ctx.arc(x + 10, y - 18, 10, -2.4, -0.5); ctx.stroke(); }
    }
    // mouth: open and round when grumpy (one tooth), laughing when he giggles, chewing when he munches
    ctx.fillStyle = c.ink;
    if (mood === 'grumpy') { ell(ctx, x - 8, y + 20, 12, 9); ctx.fill(); ctx.fillStyle = c.white; api.rr(x - 13, y + 12, 8, 8, 2.5); ctx.fill(); }
    else if (mood === 'munch') { const o = 3 + Math.abs(Math.sin(t * 6)) * 6; ell(ctx, x - 6, y + 20, 11, o); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x - 6, y + 14, 14, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); ctx.fillStyle = c.pink; ell(ctx, x - 6, y + 23, 6, 3.5); ctx.fill(); }
    ctx.fillStyle = c.blush; ctx.globalAlpha = 0.85; ell(ctx, x + 24, y + 9, 8, 5); ctx.fill(); ell(ctx, x - 32, y + 7, 6, 4); ctx.fill(); ctx.globalAlpha = 1;
  }
  // the clip: above the ground, plus the crater mouths (the worm comes out of them)
  function clipGround(ctx) {
    const cam = api.cam, v = api.view, gy = K().GY;
    ctx.beginPath(); ctx.rect(cam.x - 40, cam.y - 80, v.w + 80, gy - cam.y + 80);
    for (const x of K().CRATERS) { ctx.moveTo(x + K().CRATER_RX - 3, gy + 1); ctx.ellipse(x, gy + 1, K().CRATER_RX - 3, CRY - 3, 0, 0, TAU); }
    ctx.clip();
  }
  function drawWorm(ctx, B, c) {
    const w = B.worm; if (!w.n || !w.P) return;
    const r = K().SEG_R, pk = K().PINK_K, fin = B.fin, hold = B.state === 'hold';
    const pinkK = fin ? fin.pinkK : 1;
    ctx.save(); clipGround(ctx);
    const wig = (i) => (B.giggle > 0 && !api.reduced ? Math.sin(api.time * 26 + i) * 3 * B.giggle : 0);
    for (let i = w.n - 1; i >= 0; i--) {
      if (w.y[i] > K().GY + r + 4) continue;
      const x = w.x[i] + wig(i), y = w.y[i] - Math.abs(wig(i + 2)) * 0.5;
      if (i === pk) { segment(ctx, c, x, y, r, i); pinkSegment(ctx, c, x, y, r, pinkK, hold); } else segment(ctx, c, x, y, r, i);
    }
    if (w.hy < K().GY + K().HEAD_R + 4) head(ctx, c, B, w.hx, w.hy);
    ctx.restore();
  }

  // ---------- ripples and meteors ----------
  function drawRipple(ctx, c, s) {
    const x = s.x, gy = K().GY, h = K().RIPPLE.H, wob = api.reduced ? 0 : Math.sin(api.time * 30 + x * 0.1) * 1.5;
    ctx.fillStyle = c.dust;
    circ(ctx, x, gy - h * 0.45 + wob, h * 0.7); ctx.fill();
    circ(ctx, x - s.dir * 11, gy - h * 0.3, h * 0.55); ctx.fill();
    circ(ctx, x - s.dir * 21, gy - h * 0.18, h * 0.38); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = c.dustEdge; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, gy - h * 0.45 + wob, h * 0.7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  function drawMeteor(ctx, c, s) {
    const MET = K().MET, gy = K().GY, k = K().clamp(s.t / MET.WARN, 0, 1);
    if (s.t < MET.WARN) {
      ctx.strokeStyle = c.warn; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5 + 0.5 * k;
      ell(ctx, s.x, gy - 2, MET.R * (1.8 - 0.8 * k), 7 * (1.8 - 0.8 * k)); ctx.stroke();
      ctx.globalAlpha = 0.25 * k; ctx.fillStyle = c.warn; ell(ctx, s.x, gy - 2, MET.R, 7); ctx.fill(); ctx.globalAlpha = 1;
      // the dotted way it will fall
      ctx.fillStyle = c.warn; ctx.globalAlpha = 0.5 * k;
      for (let j = 1; j < 6; j++) { const e = j / 6; circ(ctx, s.x + s.side * MET.SLANT * e, gy - MET.HIGH * e, 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (s.fly) {
      const W = api.W;
      ctx.strokeStyle = W.tail || '#FFC978'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(s.rx, s.ry); ctx.lineTo(s.rx + s.side * 26, s.ry - 50); ctx.stroke(); ctx.globalAlpha = 1;
      circ(ctx, s.rx, s.ry, MET.BODY + 2); ctx.fillStyle = W.meteor || '#E5847A'; ctx.fill();
      circ(ctx, s.rx - 3, s.ry - 3, 4); ctx.fillStyle = W.meteorHi || '#F6B9A6'; ctx.fill();
    }
  }
  function drawShot(B, s, ctx) { const c = col(); if (s.type === 'kRipple') drawRipple(ctx, c, s); else if (s.type === 'kMeteor') drawMeteor(ctx, c, s); }

  // ---------- the glass helmet (the reward) ----------
  function drawGlassHelm(ctx, c, cy) {
    const r = 17.5;
    circ(ctx, 0, cy, r); ctx.fillStyle = c.white; ctx.globalAlpha = 0.16; ctx.fill();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = c.white; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, cy, 13, -2.6, -1.9); ctx.stroke();
    ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, cy, 13, -1.5, -1.25); ctx.stroke(); ctx.globalAlpha = 1;
    // a golden collar and two little feelers with pink tips (a present from Käsebert)
    ctx.fillStyle = c.gold; api.rr(-12, cy + r - 4, 24, 5, 2.5); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.strokeStyle = c.gold; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s * 6, cy - r + 1); ctx.quadraticCurveTo(s * 9, cy - r - 6, s * 12, cy - r - 9); ctx.stroke();
      circ(ctx, s * 12, cy - r - 10, 2.8); ctx.fillStyle = c.pink; ctx.fill();
    }
  }

  // ---------- finale: the rocket home (the Earth itself rises in moon-look.js, moved by the fight) ----------
  // After the door Mimo sits in the rocket: the hatch shuts, the rocket rumbles in a cloud of moon dust, lifts off and
  // leaves the picture upwards with a smoke trail. The win card waits for it (boss field winAfter in moon-boss.js).
  const LAUNCH = { SHUT: 0.6, RUMBLE: 0.6, LIFT: 1.6, ACC: 640 };
  // the rocket stands just right of the third crater; its hatch is the door (moon-boss-scenes.js), a little left of its middle
  const ROCKET = { DX: 10, HALF: 30 };
  const rocketX = () => K().DOOR.x * K().T + K().T / 2 + ROCKET.DX;
  const rise = (t) => (t > LAUNCH.LIFT ? 0.5 * LAUNCH.ACC * (t - LAUNCH.LIFT) * (t - LAUNCH.LIFT) : 0);
  const smoke = () => [api.W.dust || '#ECEAF8', '#FFFFFF', api.P.dust || '#FFFFFF'];
  function launchStep(B, dt) {
    const t0 = B.launch || 0, t = t0 + dt, cx = rocketX(), gy = K().GY, cross = (k) => t0 < k && t >= k;
    B.launch = t;
    if (cross(LAUNCH.SHUT) && api.G.L.door) { api.G.L.door.shut = true; api.sfx.pop(); }
    if (cross(LAUNCH.RUMBLE)) { api.shake(0.25); api.noise({ lp: 160, f1: 50, dur: LAUNCH.LIFT - LAUNCH.RUMBLE + 0.3, vol: 0.06 }); }
    if (cross(LAUNCH.LIFT)) {
      api.sfx.boom(); api.shake(0.7); api.noise({ lp: 900, f1: 120, dur: 1.3, vol: 0.05 });
      for (const s of [-1, 1]) api.burst(cx + s * 26, gy - 6, 12, smoke(), 90, { grav: -30, vx: s * 140, vy: -20, r: 5, life: 0.9 });
    }
    if (api.reduced) return;
    // dust billows out at the foot while it rumbles, a trail of puffs follows it up
    if (t > LAUNCH.RUMBLE && t < LAUNCH.LIFT + 0.3 && Math.random() < dt * 26) { const s = Math.random() < 0.5 ? -1 : 1; api.burst(cx + s * 24, gy - 4, 1, smoke(), 30, { grav: -40, vx: s * 70, vy: -15, r: 4, life: 0.8 }); }
    if (t > LAUNCH.LIFT && Math.random() < dt * 36) api.burst(cx + (Math.random() - 0.5) * 10, gy - rise(t) + 30, 1, smoke(), 25, { grav: -10, vy: 30, r: 4, life: 0.9 });
    // a twinkle where it leaves the top of the picture
    if (!B.gone && gy - rise(t) - 180 < api.cam.y) { B.gone = true; api.sfx.key(); api.burst(cx, api.cam.y + 14, 14, [api.P.star, '#FFFFFF', '#F2A7BC'], 130, { grav: 140 }); }
  }
  // Mimo's face in the round window, once he has climbed in
  function windowMimo(ctx, c) {
    circ(ctx, 0, -98, 10); ctx.fillStyle = c.window; ctx.fill();
    ctx.save(); circ(ctx, 0, -98, 10); ctx.clip();
    circ(ctx, 0, -93, 9); ctx.fillStyle = api.P.mimo; ctx.fill();
    ctx.fillStyle = api.P.mimoInk; circ(ctx, -3.2, -96, 1.5); ctx.fill(); circ(ctx, 3.2, -96, 1.5); ctx.fill();
    ctx.restore();
    circ(ctx, 0, -98, 10); ctx.strokeStyle = c.rocketInk; ctx.lineWidth = 2.5; ctx.stroke();
  }
  function drawRocket(ctx, B, c) {
    const fin = B.fin; if (!fin || B.t < 0.6) return;
    const t = B.launch || 0, land = K().clamp((B.t - 0.6) / 1.0, 0, 1);
    const shake = t > LAUNCH.RUMBLE && t < LAUNCH.LIFT + 0.4 && !api.reduced ? (Math.random() - 0.5) * 2.4 : 0;
    const by = K().GY - (1 - K().ease(land)) * 420 - rise(t);
    // flame: while landing, a flicker while it rumbles, a long one once it lifts off
    const flame = land < 1 ? 40 : t > LAUNCH.LIFT ? 46 + Math.min(1, (t - LAUNCH.LIFT) * 2) * 30 : t > LAUNCH.RUMBLE ? 12 : 0;
    ctx.save(); ctx.translate(rocketX() + shake, by);
    if (flame > 0) {
      const f = flame + Math.random() * flame * 0.3;
      ctx.fillStyle = c.flame; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(0, f, 13, 0); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, f * 0.55, 6, 0); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = c.fin; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-22, -42); ctx.lineTo(-22, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(22, -42); ctx.lineTo(22, 0); ctx.fill();
    ctx.fillStyle = c.rocket; api.rr(-24, -130, 48, 128, 20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-24, -110); ctx.quadraticCurveTo(0, -178, 24, -110); ctx.fill();
    ctx.fillStyle = c.fin; ctx.beginPath(); ctx.moveTo(-14, -146); ctx.quadraticCurveTo(0, -178, 14, -146); ctx.closePath(); ctx.fill();
    if (t >= LAUNCH.SHUT) windowMimo(ctx, c);
    else { circ(ctx, 0, -98, 10); ctx.fillStyle = c.window; ctx.fill(); ctx.strokeStyle = c.rocketInk; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
  }

  // ---------- hooks ----------
  function draw(B, ctx) {
    const c = col();
    for (const x of K().CRATERS) craterBack(ctx, c, x);
    craterWarn(ctx, c, B);
    drawWorm(ctx, B, c);
    for (const x of K().CRATERS) craterFront(ctx, c, x);
    // dust hopping at the crater that trembles
    ctx.fillStyle = c.dust;
    for (const q of B.dust) { ctx.globalAlpha = 1 - q.t / q.life; circ(ctx, q.x, q.y, q.r); ctx.fill(); }
    ctx.globalAlpha = 1;
    // scene 1: two shooting stars fall out of the sky to their places
    const sc = B.scene;
    if (sc && sc.ph === 1 && sc.stars > 0 && sc.stars < 1) for (const x of K().starXs()) {
      const y = K().lerp(api.cam.y - 30, K().STAR_Y, K().ease(sc.stars));
      ctx.strokeStyle = api.W.boost || '#BFF3FF'; ctx.lineWidth = 4; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 20, y - 60); ctx.stroke(); ctx.globalAlpha = 1;
      circ(ctx, x, y, 9); ctx.fillStyle = api.W.boostCore || '#FFFFFF'; ctx.fill();
    }
  }
  function drawFront(B, ctx) {
    const c = col(), f = B.fin;
    if (f && f.helm && !B.helmOn) { ctx.save(); ctx.translate(f.helm.x, f.helm.y + 15); ctx.rotate(f.helm.rot); const s = 1.5 - 0.5 * (f.helm.k || 0); ctx.scale(s, s); drawGlassHelm(ctx, c, -15); ctx.restore(); }
  }
  // over the darkness (phase 3): the pink glow, the warnings and the ripples shine through
  function drawOver(B, ctx) {
    if (!B.darkK) return;
    const c = col(), cam = api.cam;
    ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.globalAlpha = B.darkK;
    const w = B.worm, pk = K().PINK_K;
    if (w.n && w.y[pk] < K().GY + 10 && (!B.fin || B.fin.pinkK > 0)) { ctx.save(); clipGround(ctx); pinkSegment(ctx, c, w.x[pk], w.y[pk], K().SEG_R, B.fin ? B.fin.pinkK : 1, B.state === 'hold'); ctx.restore(); }
    craterWarn(ctx, c, B);
    for (const s of B.shots) drawShot(B, s, ctx);
    ctx.globalAlpha = 1; ctx.restore();
  }

  const fight = () => (api && api.mode === 'boss' && api.G.boss && api.G.boss.kaese ? api.G.boss : null);
  window.MimoWorlds.register({
    world: 6,
    setup(a) { api = a; },
    update(dt) { const B = fight(); if (B && B.done && api.state === 'win') launchStep(B, dt); },
    draw(layer, ctx) {
      const B = fight(); if (!B) return;
      if (layer === 'back') drawRocket(ctx, B, col());
      else if (layer === 'over') drawOver(B, ctx);
    },
  });
  Object.assign(window.MimoKaese = window.MimoKaese || {}, { draw, drawFront, drawShot, drawGlassHelm, rocketX, ROCKET, LIGHT, DARK });
})();
