// World 5 boss "Drache Fauch": his nest with the egg Fünkchen in the picture of the fight, and the calm end.
// - The nest sits on a rock shelf high on the far wall of the floor that is being fought, so it is always at the top of the
//   picture. When the eruption pushes the fight a floor up, it fades out below and in on the new floor (it moves with him).
// - While he charges and breathes fire, one of his golden wings reaches over the nest: he shields the egg.
// - After the last cold shower (volcano-boss-scenes.js, B.fin.sit) he climbs out of the crater, lifts the nest onto the left
//   rim and sits down on it, wet and calm, the egg in front of his belly. The horns he throws come from his sitting head
//   (MimoFauch.nestHead). Pure drawing on the fight clock and B; nothing here touches the fight, the bot or the physics.
(function () {
  'use strict';
  let api = null;
  const TAU = Math.PI * 2;
  const F = () => window.MimoFauch, C = () => window.MimoCoast, FD = () => window.MimoVolcano.fauchDraw;
  const clamp = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const NEST = { U: 3.1, ROW: 3.4 };            // the shelf: tiles from the far wall, row of its top inside a floor
  const RIM = { X: 110, SIT_X: 100, EGG_X: 128, SCALE: 0.78, RISE: 0.9, SETTLE: 0.7 };
  const EGG = { crack: 0, scale: 1.25, phase: 0.4, sneeze: false };

  const shelf = (s) => ({ x: F().realX(s, NEST.U * F().T), y: F().secY(s, NEST.ROW), side: F().SEC[s].side });
  const rimY = () => F().RIM * F().T;
  // where the nest is now and how visible: during a floor change it fades out on the old floor and in on the new one
  function nestNow(B) {
    const ph = api.boss.phase(B), sc = B.scene, S = F().SCENE;
    if (B.fin) {
      const p = shelf(2), k = B.fin.sit == null ? 0 : ease((B.t - B.fin.sit - RIM.RISE * 0.5) / RIM.SETTLE);
      return { x: lerp(p.x, RIM.X, k), y: lerp(p.y, rimY(), k), side: 1, a: 1 };
    }
    if (B.scenePending != null) return { ...shelf(ph - 1), a: 1 };
    if (sc && S && S[sc.ph]) {
      const k = clamp(sc.t / S[sc.ph].len);
      return k < 0.5 ? { ...shelf(sc.ph - 1), a: 1 - ease(k / 0.35) } : { ...shelf(sc.ph), a: ease((k - 0.6) / 0.4) };
    }
    return { ...shelf(ph), a: 1 };
  }
  function drawShelf(ctx, n) {
    const W = F().W, wallX = n.side > 0 ? 0 : W, d = n.side > 0 ? 1 : -1, x1 = n.x + d * 46, dark = api.dark;
    ctx.fillStyle = dark ? '#3A3150' : '#5E5276';
    ctx.beginPath(); ctx.moveTo(wallX, n.y - 6); ctx.lineTo(x1, n.y - 2); ctx.quadraticCurveTo(x1 + d * 10, n.y + 6, x1 - d * 6, n.y + 14);
    ctx.quadraticCurveTo(lerp(wallX, x1, 0.5), n.y + 30, wallX, n.y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark ? '#5A4E74' : '#8C80A6'; ctx.fillRect(Math.min(wallX, x1), n.y - 4, Math.abs(x1 - wallX), 3);
  }
  function drawEgg(ctx, x, foot) { const e = C().named && C().named.egg; if (e) e.draw(ctx, EGG, { x, foot }, api.time); }
  // a golden wing reaching from the wall over the nest, the membrane between three fingers
  function drawWing(ctx, n, a, c) {
    if (a <= 0) return;
    const d = n.side > 0 ? 1 : -1, bx = n.side > 0 ? 6 : F().W - 6, by = n.y - 96, fl = api.reduced ? 0 : Math.sin(api.time * 7) * 3 * a;
    const tip = [n.x + d * 62, n.y - 14 + fl], f1 = [n.x + d * 20, n.y - 4], f2 = [n.x - d * 22, n.y + 4];
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(n.x - d * 10, by - 34 * a, tip[0], tip[1]);
    ctx.quadraticCurveTo(n.x + d * 34, n.y - 26, f1[0], f1[1]); ctx.quadraticCurveTo(n.x - d * 2, n.y - 24, f2[0], f2[1]); ctx.quadraticCurveTo(bx + d * 10, n.y - 30, bx, n.y - 20); ctx.closePath();
    ctx.fillStyle = c.spike; ctx.fill(); ctx.strokeStyle = c.ink; ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = c.body; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by + 4); ctx.quadraticCurveTo(n.x - d * 10, by - 30 * a, tip[0], tip[1]);
    for (const f of [f1, f2]) { ctx.moveTo(lerp(bx, tip[0], 0.55), lerp(by, tip[1], 0.55) - 20 * a); ctx.lineTo(f[0], f[1]); }
    ctx.stroke(); ctx.restore();
  }
  const shielding = (B) => B.state === 'charge' || B.state === 'breathe';
  // his sitting place on the rim after the last shower: he rises out of the crater, settles on the nest
  function sitPose(B) {
    const k = B.t - B.fin.sit, up = ease(k / RIM.RISE), set = ease((k - RIM.RISE) / RIM.SETTLE);
    return { x: lerp(RIM.SIT_X + 150, RIM.SIT_X, set), foot: lerp(rimY() + 160, rimY(), up), k };
  }
  function nestHead(B) {
    if (!B.fin || B.fin.sit == null) return null;
    const p = sitPose(B); return { x: p.x + 46 * RIM.SCALE, y: p.foot - 128 * RIM.SCALE };
  }

  function draw(layer, ctx) {
    const B = F() && F().fight && F().fight(); if (!B || layer !== 'back') return;
    const n = nestNow(B), c = F().colours();
    if (n.a > 0) {
      ctx.save(); ctx.globalAlpha = n.a;
      if (!B.fin || B.fin.sit == null) drawShelf(ctx, n);
      ctx.translate(n.x, n.y); C().sdraw.PROPS.eyrie(ctx, api.time); ctx.restore();
      if (!(B.fin && B.fin.sit != null)) { ctx.save(); ctx.globalAlpha = n.a; drawEgg(ctx, n.x + 2, n.y - 6); ctx.restore(); }
      if (!B.fin) {
        B.shield = clamp((B.shield || 0) + (shielding(B) ? 1 : -1) * api.STEP * 4);
        drawWing(ctx, n, ease(B.shield) * n.a, c);
      }
    }
    if (B.fin && B.fin.sit != null) {
      const p = sitPose(B), t = api.time, calm = clamp((p.k - RIM.RISE - RIM.SETTLE) / 0.6), m = api.p;
      const look = m ? Math.max(-1, Math.min(1, (m.x + m.w / 2 - p.x) / 300)) : 1;
      ctx.save(); ctx.translate(p.x, p.foot);
      FD().sit(ctx, t, { face: 1, scale: RIM.SCALE, wings: 1 - 0.6 * calm, look, blink: ((t + 0.7) % 3.4) < 0.14 ? 1 : 0, puff: calm > 0.2 && calm < 0.9 ? 1 : 0, tail: 0.6 });
      ctx.restore();
      if (p.k > RIM.RISE) drawEgg(ctx, RIM.EGG_X, rimY() - 4);
      if (!api.reduced && B.wet > 0.02) for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 0.45 * (1 - q); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(p.x + (i - 1) * 22, p.foot - 110 - q * 40, 7 + q * 8, 7 + q * 8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    }
  }

  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, draw });
  Object.assign(window.MimoFauch = window.MimoFauch || {}, { nestNow, nestHead, NEST_RIM: RIM });
})();
