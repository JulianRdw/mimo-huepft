// World 4: the three masterpieces of the coast for the wardrobe. They are earned by playing well, never bought with stars.
//   Krakenmütze          a baby octopus in Käpt'n Krake's colours rides on Mimo's head (all 13 coast levels in gold)
//   Taucherbrille        a mask with a snorkel that blows bubbles (every star of the coast; the coast has no hidden diamonds)
//   Schwimmring          a golden ring around the belly that hops along with every jump (the boss in under 1:15)
// Gold and best times without help only, like the gold achievement.
(function () {
  'use strict';
  let api = null;
  const TAU = Math.PI * 2;
  const COAST = 4, BOSS_GOLD = 75;  // seconds; the winning bot of tools/bosscheck.mjs needs 68
  const LIGHT = { kr: '#F08FA4', lite: '#F9BFCB', far: '#E7869C', blush: '#F0566A', gold: '#E9B949', coral: '#F29A8E', glass: 'rgba(190,230,245,0.45)' };
  const DARK = { kr: '#D98399', lite: '#EDB4C2', far: '#B9748B', blush: '#E2546A', gold: '#D9A93A', coral: '#C97B72', glass: 'rgba(150,200,225,0.40)' };
  const pal = () => (api && api.dark ? DARK : LIGHT);
  const ink = () => (api ? api.P.mimoInk : '#3A3850');
  // the game clock stands still outside a level (wardrobe, menu): pictures there run on the page's own clock
  const now = (o) => (o && !o.live ? performance.now() / 1000 : api ? api.time : 0);

  // ---------- what has been earned ----------
  const coastLevels = () => (api ? api.levels.map((l, i) => (l.world === COAST ? i : -1)).filter((i) => i >= 0) : []);
  const goldCount = () => coastLevels().filter((i) => api.record.gold(i)).length;
  const starsIn = (i) => api.levels[i].map.reduce((a, r) => a + r.split('*').length - 1, 0);
  const starTotal = () => coastLevels().reduce((a, i) => a + starsIn(i), 0);
  const starCount = () => coastLevels().reduce((a, i) => a + Math.min(starsIn(i), api.record.stars(i)), 0);
  const bossRec = () => (api ? api.record.boss(COAST) : null);
  const bossGold = () => { const r = bossRec(); return !!(r && r.best != null && r.best <= BOSS_GOLD && !r.assisted); };
  const clock = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(r % 1 ? 1 : 0).replace('.', ','); };

  // ---------- the baby octopus ----------
  // pose keys, all from 0 to 1 (lift: arms up, cover: hides its eyes, wave: the outer right arm waves, lx/ly: where it looks)
  const POSE0 = { lift: 0, cover: 0, dance: 0, wave: 0, sleep: 0, happy: 0, wide: 0, yawn: 0, lx: 0, ly: 0 };
  const live = { P: { ...POSE0 }, last: null };
  const FOLLOW = 7;                  // how fast the pose follows its target (1/s)

  // what the octopus does, from what Mimo is doing right now
  function target(o) {
    const T = { ...POSE0 }, p = api.p;
    if (!o.live || !p) return T;
    if (api.state === 'win') return { ...T, happy: 1, lift: 1.4, dance: 0.35 };
    if (p.invT > 0) return { ...T, cover: 1, lift: -0.2 };
    if (p.swim) return { ...T, happy: 1, wave: 1, lift: 0.5 };
    const vy = p.vy || 0;
    if (!p.grounded && !p.wasGrounded) {
      if (vy < -50) return { ...T, lift: 1.1, wide: 0.6, lx: o.facing * 0.4 };
      return { ...T, lift: 0.7, wide: vy > 220 ? 1 : 0, ly: -0.4 };
    }
    if (o.mood === 'happy') return { ...T, happy: 1, lift: 0.8 };
    if (Math.abs(p.vx || 0) > 20) return { ...T, lx: o.facing * 0.6 };
    const i = p.idleT || 0, g = p.gag;
    if (i < 1.2) return { ...T, lx: o.facing * 0.4 };
    if (i > 11) return { ...T, sleep: 1 };
    if (i > 10) return { ...T, yawn: 1 };
    if (g && g.kind === 'dance') return { ...T, dance: 1, happy: 1 };
    if (g && g.kind === 'hop') return { ...T, lift: 1.2, happy: 1 };
    if (g && g.kind === 'juggle') return { ...T, wide: 1, lx: Math.sin(now(o) * 5) * 0.9, ly: -0.8 };
    if (g) return { ...T, wave: 1, lx: 0.9, ly: 0.3 };
    if (i < 4) return { ...T, dance: 1, happy: 1 };
    if (i < 6) return { ...T, wave: 1, lx: 0.9, ly: 0.3 };
    return { ...T, lx: Math.sin(i * 1.3) * 0.9 };
  }
  function poseFor(o) {
    if (!o.live) return POSE0;
    const t = now(o), dt = live.last == null ? 1 : Math.max(0, Math.min(0.1, t - live.last));
    live.last = t;
    const T = target(o), k = 1 - Math.exp(-dt * FOLLOW);
    const next = {};
    for (const key of Object.keys(POSE0)) next[key] = live.P[key] + (T[key] - live.P[key]) * k;
    live.P = next;
    return next;
  }

  // one soft arm: six pieces that get thinner, each a little behind the one before (the tip curls in)
  function arm(ctx, c, x0, y0, side, t, i, lift, amp, len) {
    const n = 6, seg = 1.75 * len; let x = x0, y = y0, ang = Math.PI / 2 - side * (0.75 + lift * 1.05);
    const pts = [[x, y]];
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      ang -= side * (0.05 + u * 0.34 - lift * u * 0.1) - Math.sin(t * 3 - i * 0.8 - k * 0.6) * amp * (1 + u);
      x += Math.cos(ang) * seg; y += Math.sin(ang) * seg; pts.push([x, y]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c.kr;
    for (let k = 0; k < n; k++) { ctx.lineWidth = 4.2 - k * 0.5; ctx.beginPath(); ctx.moveTo(pts[k][0], pts[k][1]); ctx.lineTo(pts[k + 1][0], pts[k + 1][1]); ctx.stroke(); }
    ctx.fillStyle = c.lite;
    for (const k of [1, 3]) { ctx.beginPath(); ctx.arc(pts[k][0] - side * 0.2, pts[k][1] + 0.9, 0.7, 0, TAU); ctx.fill(); }
  }
  // the two inner arms come up in front of the eyes ("oh no")
  function coverArm(ctx, c, side, t, a) {
    let x = side * 2.2, y = -1.5, ang = -Math.PI / 2 + side * 0.35;
    const pts = [[x, y]];
    for (let k = 0; k < 5; k++) { ang -= side * 0.05; x += Math.cos(ang) * 1.6; y += Math.sin(ang) * 1.6; pts.push([x, y]); }
    ctx.lineCap = 'round'; ctx.strokeStyle = c.kr;
    for (let k = 0; k < 5; k++) { ctx.lineWidth = 4.4 - k * 0.4; ctx.beginPath(); ctx.moveTo(pts[k][0], pts[k][1]); ctx.lineTo(pts[k + 1][0], pts[k + 1][1]); ctx.stroke(); }
    ctx.fillStyle = c.lite; ctx.strokeStyle = ink(); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 20) * 0.2, y, 2.7, 2.3, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.5; ctx.stroke(); ctx.globalAlpha = a;
    ctx.fillStyle = c.kr; for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(x + d * 1.1, y - 1.9, 0.5, 0, TAU); ctx.fill(); }
  }
  function krakenEyes(ctx, P, t) {
    const ex = 3.7, ey = -6.6, bl = ((t + 1.5) % 3.7) < 0.13 ? 0.12 : 1;
    ctx.fillStyle = ink(); ctx.strokeStyle = ink(); ctx.lineCap = 'round';
    if (P.sleep > 0.5 || P.happy > 0.5) {
      ctx.lineWidth = 1.3;
      for (const sx of [-1, 1]) { ctx.beginPath(); if (P.sleep > 0.5) ctx.arc(sx * ex, ey - 0.3, 1.8, 0.15, Math.PI - 0.15); else ctx.arc(sx * ex, ey + 1, 2, Math.PI + 0.25, -0.25); ctx.stroke(); }
      return;
    }
    const w = 2.4 + P.wide * 0.4, h = (2.85 + P.wide * 0.5) * bl, lx = P.lx * 0.9, ly = P.ly * 0.8;
    ctx.beginPath(); ctx.ellipse(-ex + lx, ey + ly, w, h, 0, 0, TAU); ctx.ellipse(ex + lx, ey + ly, w, h, 0, 0, TAU); ctx.fill();
    if (bl < 0.5) return;
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-ex + lx + 0.8, ey + ly - 1.1, 0.95, 0, TAU); ctx.arc(ex + lx + 0.8, ey + ly - 1.1, 0.95, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-ex + lx - 0.7, ey + ly + 1, 0.45, 0, TAU); ctx.arc(ex + lx - 0.7, ey + ly + 1, 0.45, 0, TAU); ctx.fill();
  }
  function krakenMouth(ctx, c, P) {
    ctx.strokeStyle = ink(); ctx.fillStyle = ink(); ctx.lineWidth = 0.9;
    if (P.yawn > 0.3 || P.wide > 0.5) { ctx.beginPath(); ctx.ellipse(0, -3.4, 0.9 + P.yawn * 0.5, 1 + P.yawn * 1.1, 0, 0, TAU); ctx.fill(); return; }
    if (P.happy > 0.5) {
      ctx.beginPath(); ctx.moveTo(-1.6, -4.2); ctx.quadraticCurveTo(0, -1.4, 1.6, -4.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.blush; ctx.beginPath(); ctx.ellipse(0, -2.9, 0.8, 0.45, 0, 0, TAU); ctx.fill(); return;
    }
    ctx.beginPath(); ctx.arc(0, -4.3, 1.1, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  function krakenHead(ctx, c, P, t, sq, a) {
    ctx.save(); ctx.scale(1 / sq, sq);
    const g = ctx.createRadialGradient(-4, -12, 1, 0, -7, 13); g.addColorStop(0, c.lite); g.addColorStop(0.55, c.kr); g.addColorStop(1, c.kr);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10.5, -2); ctx.bezierCurveTo(-12, -19.5, 12, -19.5, 10.5, -2); ctx.quadraticCurveTo(0, 1.2, -10.5, -2); ctx.fill();
    ctx.fillStyle = c.far; ctx.globalAlpha = a * 0.7; ctx.beginPath(); ctx.arc(5.6, -13, 1.3, 0, TAU); ctx.arc(7.6, -10.4, 0.8, 0, TAU); ctx.arc(3.4, -14.6, 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = a * 0.55; ctx.beginPath(); ctx.ellipse(-4.6, -12.4, 2.8, 1.5, -0.55, 0, TAU); ctx.fill(); ctx.globalAlpha = a;
    krakenEyes(ctx, P, t);
    ctx.fillStyle = c.blush; ctx.globalAlpha = a * 0.45; ctx.beginPath(); ctx.ellipse(-7.3, -3.9, 1.9, 1.15, 0, 0, TAU); ctx.ellipse(7.3, -3.9, 1.9, 1.15, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a;
    krakenMouth(ctx, c, P);
    ctx.restore();
  }
  function sleepZ(ctx, P, t, a) {
    if (P.sleep <= 0.6) return;
    ctx.fillStyle = ink(); ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.45 + k / 3) % 1;
      ctx.globalAlpha = a * Math.min(1, Math.sin(u * Math.PI) * (P.sleep - 0.6) * 2.5);
      ctx.font = '700 ' + (3 + u * 3).toFixed(1) + 'px Nunito, sans-serif';
      ctx.fillText('z', 9 + u * 7 + Math.sin(u * 6) * 1.5, -14 - u * 12);
    }
    ctx.globalAlpha = a;
  }
  const ARM_X = [-7, -4.2, -1.4, 1.4, 4.2, 7];
  function drawKraken(ctx, o) {
    const c = pal(), P = poseFor(o), t = now(o), a = o.alpha == null ? 1 : o.alpha;
    const calm = 1 - P.sleep * 0.8;
    const bob = Math.sin(t * 2.6) * 0.5 * calm - Math.abs(Math.sin(t * 5.2)) * 1.6 * P.dance + P.sleep * 0.8;
    ctx.translate(0, o.top + 2.5 + bob);
    ctx.rotate((o.tilt || 0) * 0.3 + Math.sin(t * 2.6) * 0.2 * P.dance + Math.sin(t * 1.1) * 0.04 * calm + P.sleep * 0.12);
    const sq = 1 + Math.sin(t * 2.6 + 1) * 0.035 * calm + P.sleep * Math.sin(t * 1.4) * 0.04;
    ARM_X.forEach((x, i) => {
      const side = x < 0 ? -1 : 1, inner = i === 2 || i === 3;
      const lift = P.lift * (0.75 + 0.12 * (i % 3)) + P.dance * (0.45 + 0.55 * Math.sin(t * 5.2 + i * 1.05)) + (i === 5 ? P.wave * (1.3 + Math.sin(t * 9) * 0.5) : 0) - P.sleep * 0.35;
      const k = inner ? 1 - P.cover : 1;
      if (k < 0.02) return;
      ctx.globalAlpha = a * k; arm(ctx, c, x, -2.5, side, t, i, lift, 0.14 * calm + 0.04, inner ? 0.8 : 1);
    });
    ctx.globalAlpha = a;
    krakenHead(ctx, c, P, t, sq, a);
    if (P.cover > 0.02) { ctx.globalAlpha = a * P.cover; coverArm(ctx, c, -1, t, a * P.cover); coverArm(ctx, c, 1, t, a * P.cover); ctx.globalAlpha = a; }
    sleepZ(ctx, P, t, a);
  }

  // ---------- the diving mask with a snorkel (drawn in the face's space, after the eyes) ----------
  function roundBox(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawSnorkel(ctx, o) {
    const c = pal(), t = now(o), a = o.alpha == null ? 1 : o.alpha, ey = o.eyeY, top = ey - 10;
    ctx.globalAlpha = a; ctx.strokeStyle = ink(); ctx.lineWidth = 1.6; ctx.fillStyle = c.glass;
    roundBox(ctx, -3.5, ey - 4.5, 16, 9, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = c.coral; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3.5, ey); ctx.lineTo(-10, ey - 1); ctx.moveTo(12.5, ey); ctx.lineTo(10.5, ey - 1); ctx.stroke();
    ctx.strokeStyle = c.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, ey + 4); ctx.quadraticCurveTo(-15, ey + 2, -14, top - 6); ctx.stroke();
    ctx.fillStyle = c.coral; ctx.beginPath(); ctx.arc(-14, top - 7, 2.2, 0, TAU); ctx.fill();
    // bubbles: a slow trickle on land, a stream under water
    const p = api && api.p, wet = !!(o.live && p && p.swim), speed = wet ? 1.1 : 0.45, n = wet ? 4 : 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < n; i++) {
      const u = (t * speed + i / n) % 1, r = 1.2 + u * 1.6;
      ctx.globalAlpha = a * (1 - u); ctx.beginPath(); ctx.arc(-14 + Math.sin(u * 9 + i) * 2.5, top - 10 - u * (wet ? 34 : 18), r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = a;
  }

  // ---------- the golden swim ring: back half before the body, front half after it ----------
  function ringHalf(ctx, o, front) {
    const c = pal(), t = now(o), a = o.alpha == null ? 1 : o.alpha, p = api && api.p;
    const air = o.live && p && !p.grounded && !p.wasGrounded ? Math.max(0, Math.min(1, -(p.vy || 0) / 450)) : 0;
    ctx.translate(0, -10 + Math.sin(t * 6) * 0.5 - air * 2.5);
    ctx.globalAlpha = a; ctx.lineCap = 'butt'; ctx.strokeStyle = c.gold; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 4.6, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    if (!front) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, -1.2, 14, 4.6, 0, 0.35, Math.PI - 0.35); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5.5;
    for (const s of [0.75, 2.4]) { ctx.beginPath(); ctx.ellipse(0, 0, 14, 4.6, 0, s, s + 0.22); ctx.stroke(); }
    // a glint that runs along the ring
    const g = (t * 0.5) % 1, ga = 0.2 + g * (Math.PI - 0.4), gx = Math.cos(ga) * 14, gy = Math.sin(ga) * 4.6;
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = a * Math.sin(g * Math.PI);
    ctx.beginPath(); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 0.9, gy - 0.9); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx + 0.9, gy + 0.9);
    ctx.lineTo(gx, gy + 5); ctx.lineTo(gx - 0.9, gy + 0.9); ctx.lineTo(gx - 5, gy); ctx.lineTo(gx - 0.9, gy - 0.9); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
  }

  const costumes = [
    { id: 'h_kraken', kind: 'hat', name: 'Krakenmütze', master: true, tag: 'Meisterstück',
      own: () => { const n = coastLevels().length; return n > 0 && goldCount() >= n; },
      how: () => 'Hole an der Küste in jedem Level Gold, ohne Hilfen (' + goldCount() + ' von ' + coastLevels().length + ').',
      draw: drawKraken },
    { id: 'a_snorkel', kind: 'acc', name: 'Taucherbrille', master: true, tag: 'Meisterstück', face: true,
      own: () => { const n = starTotal(); return n > 0 && starCount() >= n; },
      how: () => 'Sammle an der Küste alle Sterne (' + starCount() + ' von ' + starTotal() + ').',
      draw: drawSnorkel },
    { id: 'a_ring', kind: 'acc', name: 'Schwimmring', master: true, tag: 'Meisterstück',
      own: bossGold,
      how: () => { const r = bossRec(); return 'Besiege Käpt’n Krake in höchstens ' + clock(BOSS_GOLD) + ', ohne Hilfen.' + (r && r.best != null ? ' Deine Bestzeit ist ' + clock(r.best) + '.' : ''); },
      back: (ctx, o) => ringHalf(ctx, o, false),
      draw: (ctx, o) => ringHalf(ctx, o, true) },
  ];

  window.MimoWorlds.register({ world: COAST, costumes, setup(a) { api = a; } });
})();
