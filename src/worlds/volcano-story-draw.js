// World 5 story pictures: the small things of the climb ("Gipfelsturm"), drawn in the style of coast-story-draw.js and added to
// its tables: MimoCoast.sdraw.ICONS (the four parts of the summit photo), MimoCoast.sdraw.PROPS (things that stand on the
// ground, used by cast entries { who: 'prop', kind }) and the named figures MimoCoast.named (Gerda, the egg, the baby dragon).
// Pure drawing, no state: everything moves only with the time t it is given (api.time), so the level bots replay exactly.
// Origin of a prop: bottom centre, y points down, so a thing 20 px tall reaches from y = -20 to y = 0.
//   PROPS  bench (wooden bench, 70 wide) | flag (summit flag on a pole; empty: true = only the pole) | summitbook (open book on a rock,
//          pencil on a string) | thermos (steaming) | tripod | camera (camera on a tripod with a self-timer, see below) |
//          cairn (size 1..5, a stack of flat stones; 5 is a tower) | backpack (stage 0..4) | ember (a glowing stone)
//   camera  e.rock: true sits on a stone instead of the tripod (the tripod is lost until level 54). e.t0 + e.timer (s, default 5): the red light blinks faster and faster, then a white flash of 0.3 s. e.every repeats the
//           cycle (the timer restarts that long after the flash). Without e.t0 the camera waits (a slow blink); a scene sets
//           e.t0 = api.time to start it, or e.flashAt = api.time to flash right now (MimoVolcano.camera.fire(e)).
//   backpack(ctx, stage, o)  the pack drawn on a back, origin = the middle of the pack at the shoulder blades, in figure pixels; the figures
//           carry it through fig.extra (volcano-story-acts.js). stage 0 small .. 4 towering with things sticking out; o.burst 0..1 (opening)
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const S = () => window.MimoCoast.sdraw;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  window.MimoVolcano = window.MimoVolcano || {};

  // palette of the climb: dark basalt, warm ash, the red of the summit things
  const PAL = { stone: '#A79CBB', stoneDeep: '#7D7290', stoneLite: '#C9C0D8', pack: '#6FA8C9', packDeep: '#4F86A8', packLite: '#9CC8E0', strap: '#8A6A4A', ember: '#FF9A55', emberHot: '#FFD58A' };
  const col = () => ({ ...S().COL, ...PAL });

  // ---------- icons of the four parts (around their own centre, about 24 px) ----------
  const ICONS = {
    flag(ctx, t) {
      const { paint, ink } = S(), c = col(), w = Math.sin((t || 0) * 3) * 1.2;
      ctx.save(); ctx.rotate(-0.35);
      ctx.fillStyle = c.woodDeep; ctx.fillRect(-1, -13, 2, 27);
      ctx.beginPath(); ctx.moveTo(1, -13); ctx.quadraticCurveTo(7, -15 + w, 13, -11); ctx.quadraticCurveTo(8, -9 - w, 13, -5); ctx.quadraticCurveTo(7, -7 + w, 1, -5); ctx.closePath(); paint(ctx, c.red);
      ctx.fillStyle = c.sun; ctx.beginPath(); ctx.moveTo(3, -7); ctx.lineTo(6, -11); ctx.lineTo(8, -8); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    book(ctx) {
      const { paint, ink, rrect } = S(), c = col();
      ctx.save(); ctx.rotate(-0.12);
      rrect(ctx, -9, -11, 18, 22, 2); paint(ctx, c.navy);
      ctx.fillStyle = c.cream; rrect(ctx, -7, -9.5, 15, 19, 1.2); ctx.fill();
      ctx.fillStyle = c.navy; rrect(ctx, -9, -11, 4, 22, 2); ctx.fill();
      ctx.strokeStyle = c.sun; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(5, -5); ctx.moveTo(-1, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();
      ctx.restore();
    },
    thermos(ctx, t) {
      const { paint, rrect } = S(), c = col(), k = (t || 0);
      ctx.save();
      rrect(ctx, -5, -10, 10, 20, 3.5); paint(ctx, c.red);
      ctx.fillStyle = c.cream; rrect(ctx, -5, -2, 10, 3.2, 0); ctx.fill();
      rrect(ctx, -4, -14, 8, 5, 2); paint(ctx, c.cream);
      ctx.strokeStyle = c.white; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) { const q = (k * 0.9 + i * 0.5) % 1, x = (i ? 2.5 : -2.5); ctx.globalAlpha = 0.85 * (1 - q); ctx.beginPath(); ctx.moveTo(x, -16 - q * 4); ctx.quadraticCurveTo(x + 3, -19 - q * 5, x, -22 - q * 6); ctx.stroke(); }
      ctx.restore();
    },
    tripod(ctx) {
      const { paint, ink } = S(), c = col();
      ctx.save(); ctx.strokeStyle = c.coal; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-8, 11); ctx.moveTo(0, -6); ctx.lineTo(0, 12); ctx.moveTo(0, -6); ctx.lineTo(8, 11); ctx.stroke();
      ctx.fillStyle = c.greyDeep; ctx.fillRect(-4, -11, 8, 6);
      ctx.beginPath(); ctx.moveTo(-1.5, -11); ctx.lineTo(-1.5, -14); ctx.lineTo(1.5, -14); ctx.lineTo(1.5, -11); ctx.fill();
      ctx.restore();
    },
  };

  // ---------- the pack ----------
  const STAGE = [{ w: 11, h: 15 }, { w: 14, h: 19 }, { w: 18, h: 25 }, { w: 22, h: 32 }, { w: 27, h: 42 }];
  function backpack(ctx, stage, o) {
    const { paint, ell, rrect, ink } = S(), c = col(), st = STAGE[Math.max(0, Math.min(4, stage | 0))], t = (o && o.t) || 0, burst = (o && o.burst) || 0;
    const w = st.w, h = st.h, wob = Math.sin(t * 2.2) * 0.5 * (stage > 2 ? stage - 2 : 0);
    ctx.save(); ctx.translate(0, -h * 0.1);
    if (burst > 0) { const k = clamp01(burst); ctx.rotate(Math.sin(k * 30) * 0.06 * (1 - k)); ctx.scale(1 + 0.12 * k, 1 - 0.05 * k); }
    // things sticking out grow with the stage: the rolled mat, a pot, a boot, the air mattress corner
    if (stage >= 2) { rrect(ctx, -w * 0.9, -h * 0.5 - 5, w * 1.8, 9, 4.5); paint(ctx, c.pink); ctx.strokeStyle = c.white; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w * 0.5, -h * 0.5 - 3.5); ctx.lineTo(-w * 0.5, -h * 0.5 + 1.5); ctx.moveTo(w * 0.5, -h * 0.5 - 3.5); ctx.lineTo(w * 0.5, -h * 0.5 + 1.5); ctx.stroke(); ctx.globalAlpha = 1; }
    if (stage >= 3) { ell(ctx, -w * 0.95, 2 + wob, 5, 4.5); paint(ctx, c.grey); ctx.fillStyle = c.coal; ctx.fillRect(-w * 0.95 - 6, -0.5 + wob, 12, 1.6); }
    if (stage >= 4) { ctx.save(); ctx.translate(w * 0.9, -h * 0.25); ctx.rotate(0.5 + wob * 0.05); rrect(ctx, -3, -13, 6, 16, 2); paint(ctx, c.red); ctx.restore(); ctx.save(); ctx.translate(-w * 0.15, -h * 0.5 - 9 + wob * 0.3); ctx.rotate(-0.1); rrect(ctx, -w * 0.6, -9, w * 1.2, 14, 7); paint(ctx, c.pinkLite); ctx.strokeStyle = c.pink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-w * 0.3, -7); ctx.lineTo(-w * 0.3, 3); ctx.moveTo(w * 0.1, -8); ctx.lineTo(w * 0.1, 3); ctx.stroke(); ctx.restore(); }
    // the body of the pack with a lid, a front pocket and straps
    rrect(ctx, -w / 2, -h / 2, w, h, w * 0.32); paint(ctx, c.pack);
    ctx.fillStyle = c.packLite; ctx.globalAlpha = 0.55; rrect(ctx, -w / 2 + 2, -h / 2 + 2, w * 0.28, h - 4, 2); ctx.fill(); ctx.globalAlpha = 1;
    rrect(ctx, -w / 2 - 0.6, -h / 2 - 1.5, w + 1.2, h * 0.3, h * 0.12); paint(ctx, c.packDeep);
    rrect(ctx, -w * 0.32, h * 0.04, w * 0.64, h * 0.34, 2.5); paint(ctx, c.packLite);
    ctx.strokeStyle = c.strap; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w * 0.2, -h * 0.2); ctx.lineTo(-w * 0.2, h * 0.05); ctx.moveTo(w * 0.2, -h * 0.2); ctx.lineTo(w * 0.2, h * 0.05); ctx.stroke();
    ctx.fillStyle = c.sun; ctx.beginPath(); ctx.arc(0, h * 0.2, 1.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- props on the ground ----------
  const stone = (ctx, x, y, rx, ry, rot, tone) => { const { paint, ell } = S(), c = col(); ell(ctx, x, y, rx, ry, rot); paint(ctx, tone || c.stone); ctx.fillStyle = c.stoneLite; ctx.globalAlpha = 0.45; ell(ctx, x - rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.3, rot); ctx.fill(); ctx.globalAlpha = 1; };
  const PROPS = {
    bench(ctx) {
      const { paint, rrect } = S(), c = col();
      ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      for (const x of [-27, 27]) { ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x + (x < 0 ? -2 : 2), 0); ctx.stroke(); }
      rrect(ctx, -35, -21, 70, 6, 2.5); paint(ctx, c.wood);
      rrect(ctx, -35, -15, 70, 3.2, 1.5); paint(ctx, c.woodDeep);
    },
    flag(ctx, t, e) {
      const { paint } = S(), c = col(), w = Math.sin(t * 3 + (e && e.phase || 0)) * 2.2;
      ctx.fillStyle = c.stoneDeep; ctx.beginPath(); ctx.ellipse(0, -1, 11, 3.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c.woodDeep; ctx.fillRect(-1.2, -62, 2.4, 62);
      ctx.beginPath(); ctx.arc(0, -63, 2.2, 0, TAU); ctx.fillStyle = c.sun; ctx.fill();
      if (e && e.empty) return;
      ctx.beginPath(); ctx.moveTo(1.2, -60); ctx.bezierCurveTo(10, -63 + w, 18, -57 - w, 27, -60 + w); ctx.lineTo(27, -43 + w); ctx.bezierCurveTo(18, -41 - w, 10, -46 + w, 1.2, -43); ctx.closePath(); paint(ctx, c.red);
      ctx.fillStyle = c.sun; ctx.beginPath(); ctx.moveTo(8, -46 + w * 0.5); ctx.lineTo(15, -57 + w * 0.7); ctx.lineTo(21, -48 + w * 0.5); ctx.closePath(); ctx.fill();
    },
    summitbook(ctx) {
      const { paint, rrect } = S(), c = col();
      stone(ctx, 0, -8, 17, 8, 0, c.stoneDeep);
      ctx.save(); ctx.translate(0, -17); ctx.rotate(-0.05);
      rrect(ctx, -12, -3, 24, 6, 1.5); paint(ctx, c.navy); ctx.fillStyle = c.cream; rrect(ctx, -10.5, -4.2, 9.8, 5.6, 1); ctx.fill(); rrect(ctx, 0.7, -4.2, 9.8, 5.6, 1); ctx.fill();
      ctx.strokeStyle = c.greyDeep; ctx.lineWidth = 0.8; for (const y of [-2.6, -0.6]) { ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(-2, y); ctx.moveTo(2, y); ctx.lineTo(9, y); ctx.stroke(); }
      ctx.strokeStyle = c.red; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(10.5, -1); ctx.quadraticCurveTo(15, 3, 13, 8); ctx.stroke();
      ctx.restore();
    },
    thermos(ctx, t) { ctx.save(); ctx.translate(0, -12); ICONS.thermos(ctx, t); ctx.restore(); },
    tripod(ctx) {
      const c = col(); ctx.save(); ctx.translate(0, -12); ICONS.tripod(ctx); ctx.restore();
      ctx.fillStyle = c.stoneDeep; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(0, 0, 12, 2.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    },
    camera(ctx, t, e) {
      const { paint, rrect } = S(), c = col(), o = e || {};
      const timer = o.timer || 5, every = o.every || 0;
      let k = o.t0 == null ? -1 : t - o.t0;
      if (every && k > timer + 0.4) k = ((k - timer - 0.4) % every) - 0;   // restart: the next run is counted from k = 0 again
      let flashK = o.flashAt != null ? t - o.flashAt : -1;
      if (k >= timer && k < timer + 0.3) flashK = k - timer;
      if (o.rock) { stone(ctx, 0, -12, 15, 13, 0, c.stoneDeep); ctx.translate(0, 0); }   // no tripod: the camera sits on a stone
      else { ctx.strokeStyle = c.coal; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(-11, 0); ctx.moveTo(0, -27); ctx.lineTo(0, 0); ctx.moveTo(0, -27); ctx.lineTo(11, 0); ctx.stroke(); }
      rrect(ctx, -9, -39, 18, 12, 2.5); paint(ctx, c.greyDeep);
      ctx.fillStyle = c.coal; ctx.beginPath(); ctx.arc(2, -33, 4.4, 0, TAU); ctx.fill(); ctx.fillStyle = c.sky; ctx.beginPath(); ctx.arc(2, -33, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = c.white; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(1, -34, 0.9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const rate = k < 0 ? 0.6 : 1.5 + 6 * clamp01(k / timer), on = Math.floor(t * rate * 2) % 2 === 0 && !(k >= timer);
      ctx.fillStyle = on ? '#FF4A5A' : '#8A3A48'; ctx.beginPath(); ctx.arc(-6, -36, 1.5, 0, TAU); ctx.fill();
      if (flashK >= 0 && flashK < 0.3) {
        const a = 1 - flashK / 0.3, g = ctx.createRadialGradient(2, -33, 2, 2, -33, 70 * (0.6 + flashK * 2)); g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, -33, 80, 0, TAU); ctx.fill();
      }
    },
    cairn(ctx, t, e) {
      const c = col(), n = Math.max(1, Math.min(5, (e && e.size) | 0 || 1)), tones = [c.stone, c.stoneDeep, c.stoneLite, c.stone, c.stoneDeep];
      let y = 0; ctx.fillStyle = c.stoneDeep; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(0, 0, 8 + n * 2.6, 2.4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const rows = n === 5 ? 9 : n * 2 + 1;
      for (let i = 0; i < rows; i++) {
        const k = i / Math.max(1, rows - 1), rx = lerp(6 + n * 2.6, 3.2, k) + (i % 2 ? -0.8 : 0.6), ry = n === 5 ? 4.6 : 3.4;
        stone(ctx, (i % 2 ? 1 : -1) * 0.9 * (1 - k), y - ry, rx, ry, (i % 2 ? 0.04 : -0.05), tones[i % tones.length]); y -= ry * 1.55;
      }
    },
    backpack(ctx, t, e) { ctx.save(); ctx.translate(0, -(STAGE[(e && e.stage) | 0 || 0].h / 2 + 3)); backpack(ctx, (e && e.stage) | 0, { t }); ctx.restore(); },
    ember(ctx, t) {
      const c = col(), p = 0.5 + 0.5 * Math.sin(t * 5);
      const g = ctx.createRadialGradient(0, -6, 2, 0, -6, 18); g.addColorStop(0, 'rgba(255,170,90,' + (0.45 + 0.2 * p) + ')'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 18, 0, TAU); ctx.fill();
      stone(ctx, 0, -6, 7, 5.4, 0.1, '#5E4A5E'); ctx.fillStyle = p > 0.5 ? c.emberHot : c.ember; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(-1, -6.5, 3.2, 1.6, 0.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    },
  };

  // ---------- named figures: Gerda the goat, the egg Fünkchen, the baby dragon ----------
  // each is { height (px, for the speech bubble), draw(ctx, e, pos, t) } with pos = { x, foot, face, hop }
  const dragonCols = () => { const F = window.MimoFauch; const d = S().ink && false; return F ? (S().COL === undefined ? F.LIGHT : (window.MimoVolcano.dark ? F.DARK : F.LIGHT)) : { body: '#E8807A', belly: '#FBDCC8', spike: '#F6D374', horn: '#FBEFD9', hornInk: '#E2C9A2', ink: '#3A2E48', blush: '#F4B4C0' }; };
  function goat(ctx, e, pos, t) {
    const { paint, ell, ink } = S(), c = col(), f = pos.face || 1, chew = Math.sin(t * 6 + e.phase), hop = pos.hop || 0, nod = Math.sin(t * 1.7 + e.phase) * 0.05;
    ctx.save(); ctx.translate(pos.x, pos.foot - hop); ctx.scale(f * e.scale, e.scale);
    ctx.fillStyle = 'rgba(58,56,80,0.14)'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 3, 0, 0, TAU); ctx.fill();
    // legs (the far pair a little darker), hooves
    ctx.lineCap = 'round';
    for (const [x, tone] of [[-10, c.grey], [8, c.grey], [-14, c.cream], [12, c.cream]]) { ctx.strokeStyle = tone === c.cream ? c.cream : c.greyDeep; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -13); ctx.lineTo(x, -3); ctx.stroke(); ctx.strokeStyle = c.coal; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x, -0.6); ctx.stroke(); }
    // tail, body, a woolly chest
    ctx.beginPath(); ctx.moveTo(-14, -22); ctx.lineTo(-19, -27); ctx.lineTo(-16, -19); ctx.closePath(); paint(ctx, c.cream);
    ell(ctx, 0, -18, 16.5, 8.2); paint(ctx, c.cream);
    ell(ctx, 10, -19, 7.5, 7); ctx.fillStyle = c.white; ctx.fill();
    ctx.fillStyle = c.greyDeep; ctx.globalAlpha = 0.18; ell(ctx, -3, -13, 10, 3); ctx.fill(); ctx.globalAlpha = 1;
    // neck and head
    ctx.save(); ctx.translate(14, -27); ctx.rotate(nod);
    ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(-2, -9); ctx.lineTo(6, -9); ctx.lineTo(7, 6); ctx.closePath(); paint(ctx, c.cream);
    ctx.save(); ctx.translate(2, -11); ctx.rotate(-0.12);
    // horns sweep back, a little ear, the long face with the muzzle and a pointed beard
    ctx.strokeStyle = c.woodDeep; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-1, -5); ctx.quadraticCurveTo(-9, -12, -13, -7); ctx.moveTo(2, -5.4); ctx.quadraticCurveTo(-4, -15, -9, -12); ctx.stroke();
    ell(ctx, -3.6, -2.2, 4, 1.9, 0.5); paint(ctx, c.grey);
    ell(ctx, 0, 0, 6.2, 5.6); paint(ctx, c.cream);
    ell(ctx, 5.4, 2.4 + chew * 0.2, 4.4, 3.4, 0.15); paint(ctx, c.white);
    ctx.fillStyle = ink(); ctx.beginPath(); ctx.arc(8.2, 1.4, 0.8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(2.2, -1.2, 1.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(2.6, -1.6, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.4, 5.2); ctx.lineTo(1.2, 11.4 + chew * 0.8); ctx.lineTo(5.2, 5.6); ctx.closePath(); paint(ctx, c.white);
    ctx.restore(); ctx.restore(); ctx.restore();
  }
  // the egg: speckled, wobbles now and then, cracks in steps e.crack 0..3, sneezes a spark every few seconds (e.sneeze: false = never)
  function egg(ctx, e, pos, t) {
    const { paint, ell } = S(), c = col(), n = e.crack | 0, wob = Math.sin(t * 9 + e.phase) * (n ? 0.06 : 0) * Math.max(0, Math.sin(t * 1.3 + e.phase)) * 2;
    ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(e.scale, e.scale);
    ctx.fillStyle = 'rgba(58,56,80,0.14)'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 2.4, 0, 0, TAU); ctx.fill();
    ctx.rotate(wob); ctx.translate(0, -1);
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.bezierCurveTo(10, -27, 12, -10, 11, -5); ctx.bezierCurveTo(10, 0, -10, 0, -11, -5); ctx.bezierCurveTo(-12, -10, -10, -27, 0, -27); ctx.closePath(); paint(ctx, '#FCEBD2');
    ctx.fillStyle = '#F2A98B'; for (const [x, y, r] of [[-5, -8, 1.6], [4, -14, 1.3], [-2, -19, 1.1], [6, -6, 1.1], [-7, -15, 1]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(-4.5, -20, 1.6, 3.4, 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (n > 0) { ctx.strokeStyle = '#8A6A5E'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-1, -27); ctx.lineTo(-3, -22); ctx.lineTo(1, -19); if (n > 1) { ctx.lineTo(-2, -15); ctx.lineTo(3, -12); } if (n > 2) { ctx.lineTo(0, -8); ctx.lineTo(-5, -5); ctx.moveTo(1, -19); ctx.lineTo(6, -21); } ctx.stroke(); }
    ctx.restore();
    if (e.sneeze !== false && n > 0) {
      const q = ((t + e.phase * 3) % 4.2) / 0.5; if (q >= 0 && q < 1) { ctx.save(); ctx.fillStyle = c.emberHot; ctx.globalAlpha = 1 - q; for (let i = 0; i < 4; i++) { const a = -1.9 + i * 0.4; ctx.beginPath(); ctx.arc(pos.x + Math.cos(a) * q * 16, pos.foot - 27 + Math.sin(a) * q * 16, 1.6 * (1 - q * 0.5), 0, TAU); ctx.fill(); } ctx.restore(); }
    }
  }
  // the baby dragon: coral like Fauch, big eyes and tiny wings; e.sneeze sparks, hop on landing
  function baby(ctx, e, pos, t) {
    const { paint, ell } = S(), F = window.MimoFauch, d = (F && (window.MimoVolcano.dark ? F.DARK : F.LIGHT)) || { body: '#E8807A', belly: '#FBDCC8', spike: '#F6D374', horn: '#FBEFD9', hornInk: '#E2C9A2', ink: '#3A2E48', blush: '#F4B4C0' };
    const f = pos.face || 1, br = Math.sin(t * 2.4 + e.phase) * 0.6, hop = pos.hop || 0, tail = Math.sin(t * 4 + e.phase) * 3;
    ctx.save(); ctx.translate(pos.x, pos.foot - hop); ctx.scale(f * e.scale, e.scale);
    ctx.fillStyle = 'rgba(58,56,80,0.14)'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(-20, -6 + tail * 0.4, -19, -14 + tail); ctx.quadraticCurveTo(-13, -10, -7, -12); ctx.closePath(); paint(ctx, d.body);
    ctx.save(); ctx.translate(-4, -16); ctx.rotate(-0.5 + Math.sin(t * 7 + e.phase) * 0.12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10, -9, -3, -14); ctx.quadraticCurveTo(0, -8, 5, -7); ctx.closePath(); paint(ctx, d.spike); ctx.restore();
    ell(ctx, 0, -10 + br * 0.3, 10.5, 9 + br * 0.2); paint(ctx, d.body);
    ell(ctx, 1.5, -8, 6, 6.2); ctx.fillStyle = d.belly; ctx.fill();
    ctx.fillStyle = d.spike; for (const x of [-6, -2.5]) { ctx.beginPath(); ctx.moveTo(x - 1.8, -18.4); ctx.lineTo(x, -22); ctx.lineTo(x + 1.8, -18.6); ctx.closePath(); ctx.fill(); }
    ell(ctx, 6, -21, 8.6, 8); paint(ctx, d.body);
    for (const s of [0, 1]) { ctx.fillStyle = d.horn; ctx.beginPath(); ctx.moveTo(2 + s * 5.5, -27); ctx.quadraticCurveTo(3 + s * 5.5, -33, 6 + s * 6, -33.5); ctx.quadraticCurveTo(7 + s * 5.5, -29, 8 + s * 5.5, -27); ctx.closePath(); ctx.fill(); ctx.strokeStyle = d.hornInk; ctx.lineWidth = 0.8; ctx.stroke(); }
    ell(ctx, 10.4, -18, 4.6, 3.4); ctx.fillStyle = d.belly; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(8.8, -22.4, 3, 0, TAU); ctx.fill(); ctx.fillStyle = d.ink; ctx.beginPath(); ctx.arc(9.6, -22.2, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(10.1, -22.9, 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = d.blush; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(4.4, -18.2, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = d.ink; ctx.beginPath(); ctx.arc(11.7, -19.6, 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = d.body; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; for (const x of [-4, 4]) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 1, -0.8); ctx.stroke(); }
    ctx.restore();
    if (e.sneeze !== false) {
      const q = ((t + e.phase * 3) % 3.6) / 0.5; if (q >= 0 && q < 1) { ctx.save(); ctx.fillStyle = '#FFD58A'; ctx.globalAlpha = 1 - q; for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.35; ctx.beginPath(); ctx.arc(pos.x + f * (14 + Math.cos(a) * q * 18) * e.scale, pos.foot - 19 * e.scale - hop + Math.sin(a) * q * 14, 1.6 * (1 - q * 0.5), 0, TAU); ctx.fill(); } ctx.restore(); }
    }
  }
  const named = { goat: { height: 38, draw: goat }, egg: { height: 30, draw: egg }, baby: { height: 36, draw: baby } };

  // Fauch in flight for the scenes: a big coral dragon seen from the side, wings beating; origin = the middle of the body
  function fauchFly(ctx, t, o) {
    const { paint, ell } = S(), F = window.MimoFauch, d = (F && (window.MimoVolcano.dark ? F.DARK : F.LIGHT)) || { body: '#E8807A', belly: '#FBDCC8', spike: '#F6D374', horn: '#FBEFD9', hornInk: '#E2C9A2', ink: '#3A2E48', blush: '#F4B4C0' };
    const f = (o && o.face) || 1, k = (o && o.scale) || 1, flap = Math.sin(t * 9) * 0.5;
    ctx.save(); ctx.scale(f * k, k);
    ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-62, 16 + flap * 6, -78, -4); ctx.quadraticCurveTo(-52, 2, -24, -6); ctx.closePath(); paint(ctx, d.body);
    ctx.save(); ctx.translate(-4, -12); ctx.rotate(-0.3 - flap * 0.7); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-34, -46, -64, -30); ctx.quadraticCurveTo(-42, -26, -48, -12); ctx.quadraticCurveTo(-26, -18, -24, 0); ctx.closePath(); paint(ctx, d.spike); ctx.restore();
    ell(ctx, 0, 0, 30, 15); paint(ctx, d.body); ell(ctx, 4, 6, 22, 8); ctx.fillStyle = d.belly; ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, -6); ctx.quadraticCurveTo(34, -22, 44, -18); ctx.lineTo(42, -4); ctx.closePath(); paint(ctx, d.body);
    ell(ctx, 48, -17, 14, 11, -0.1); paint(ctx, d.body); ell(ctx, 58, -13, 8, 5.4); ctx.fillStyle = d.belly; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(50, -22, 4.2, 0, TAU); ctx.fill(); ctx.fillStyle = d.ink; ctx.beginPath(); ctx.arc(51.4, -21.6, 2.2, 0, TAU); ctx.fill();
    for (const q of [0, 1]) { ctx.fillStyle = d.horn; ctx.beginPath(); ctx.moveTo(40 + q * 8, -26); ctx.quadraticCurveTo(38 + q * 8, -38, 44 + q * 8, -40); ctx.quadraticCurveTo(46 + q * 8, -32, 47 + q * 8, -26); ctx.closePath(); ctx.fill(); }
    ctx.save(); ctx.translate(-2, -4); ctx.rotate(0.3 + flap * 0.7); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-30, -44, -58, -26); ctx.quadraticCurveTo(-38, -24, -44, -10); ctx.quadraticCurveTo(-24, -14, -20, 0); ctx.closePath(); paint(ctx, d.spike); ctx.restore();
    ctx.restore();
  }

  // ---------- the hat of the wardrobe: Wanderhut (a felt hat with a band and a feather); origin = the top of Mimo's head ----------
  function drawHat(ctx, dark) {
    const felt = dark ? '#8A6A4E' : '#B98A5E', feltDeep = dark ? '#6C5038' : '#8F6841', band = dark ? '#B85F55' : '#E26A5C', feather = dark ? '#8DB89A' : '#7CC49A', ink = dark ? '#20182C' : '#3A2E48';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // brim: a wide ellipse, a little lower at the back
    ctx.beginPath(); ctx.ellipse(0, 1.2, 17.5, 4.2, 0, 0, TAU); ctx.fillStyle = felt; ctx.fill(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.1; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = feltDeep; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(0, 2, 15, 2.4, 0, 0, Math.PI); ctx.fill(); ctx.globalAlpha = 1;
    // crown with the dent on top
    ctx.beginPath(); ctx.moveTo(-9.5, 0.4); ctx.bezierCurveTo(-10.5, -8, -6.5, -12.5, -1.6, -11.6); ctx.quadraticCurveTo(0, -9.4, 1.6, -11.6); ctx.bezierCurveTo(6.5, -12.5, 10.5, -8, 9.5, 0.4); ctx.quadraticCurveTo(0, 3.4, -9.5, 0.4); ctx.closePath();
    ctx.fillStyle = felt; ctx.fill(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.ellipse(-4.6, -6.6, 1.8, 3.8, 0.35, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    // the band and a small feather tucked in at the right
    ctx.beginPath(); ctx.moveTo(-9.7, -1.8); ctx.quadraticCurveTo(0, 1.4, 9.7, -1.8); ctx.lineTo(9.9, -4); ctx.quadraticCurveTo(0, -0.6, -9.9, -4); ctx.closePath(); ctx.fillStyle = band; ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -2.6); ctx.quadraticCurveTo(10, -9, 16, -13); ctx.quadraticCurveTo(14.4, -7, 9.2, -2.1); ctx.closePath(); ctx.fillStyle = feather; ctx.fill(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7, -3.4); ctx.quadraticCurveTo(11, -8.6, 14.6, -11.8); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // the carry kinds the dog knows (sdraw.carry): a glowing stone and the egg, in the mouth
  function patchCarry() {
    const sd = S(), base = sd.carry; if (!base || base.patched) return;
    const wrapped = (ctx, kind, t) => { if (kind === 'ember') { ctx.translate(0, 6); PROPS.ember(ctx, t || 0); } else base(ctx, kind, t); };
    wrapped.patched = true; sd.carry = wrapped;
  }

  function install() {
    const C = window.MimoCoast, sd = C && C.sdraw; if (!sd) return;
    Object.assign(sd.ICONS, ICONS); Object.assign(sd.PROPS, PROPS);
    C.named = Object.assign(C.named || {}, named);
    patchCarry();
  }
  install();
  // merge, never replace: volcano-look.js (loaded earlier) keeps its tile pictures here (hot stone, basalt columns)
  window.MimoVolcano.draw = Object.assign(window.MimoVolcano.draw || {}, { backpack, drawHat, fauchFly, STAGE, PAL, stone, ICONS, PROPS });
  window.MimoWorlds.register({ world: 5, setup(a) { window.MimoVolcano.dark = false; Object.defineProperty(window.MimoVolcano, 'dark', { get: () => a.dark, configurable: true }); } });
})();
