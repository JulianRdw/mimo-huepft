// World 4 story pictures: small drawn props, the gull, the lighthouse keeper, the taxi crab and the little icons of the
// found items. Pure drawing, no state. coast-story.js calls these through MimoCoast.sdraw.
// Every function draws with its origin at the bottom centre (the feet or the ground contact point), y points down,
// so a thing 20 px tall reaches from y = -20 to y = 0. Pastel shapes with a soft outline, like coast-look.js.
(function () {
  'use strict';
  let api = null;
  const TAU = Math.PI * 2;
  const BASE = {
    pink: '#F6A9BF', pinkLite: '#FFD3DF', mint: '#9ADBC2', sun: '#FFE08F', sky: '#9ED3EE', white: '#FFFFFF', cream: '#FFF3DC',
    red: '#F28C82', redDeep: '#D9736C', navy: '#4A5D8C', navyLite: '#6B80B2', grey: '#B9B7C9', greyDeep: '#8E8CA3', coal: '#6C6A80',
    wood: '#D4A77C', woodDeep: '#B98B61', orange: '#F6B06B', skin: '#F6CDB0', leaf: '#7CC49A',
  };
  // the drawn things dim at night and in the dark scheme: COL holds the colours of the moment (setNight(0..5) mixes BASE towards dusk blue)
  const COL = { ...BASE };
  let nightStepNow = 0;
  function setNight(n) {
    if (n === nightStepNow || !api || !api.mixHex) return;
    nightStepNow = n;
    for (const k of Object.keys(BASE)) COL[k] = n ? api.mixHex(BASE[k], '#1E2860', 0.075 * n) : BASE[k];
  }
  const ink = () => (api && api.P && api.P.mimoInk) || '#3B3560';
  const outline = (ctx, a) => { ctx.strokeStyle = ink(); ctx.globalAlpha = (a == null ? 0.3 : a); ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; };
  // fill the current path, then draw the soft outline
  const paint = (ctx, color, a) => { ctx.fillStyle = color; ctx.fill(); outline(ctx, a); };
  const ell = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (api && api.rr) api.rr(x, y, w, h, r); else ctx.rect(x, y, w, h); };

  // ---------- props (kind -> function(ctx, t, e)); e is the cast entry (flip, size, ...) ----------
  const PROPS = {
    // an air mattress seen from the side, 76 wide
    mattress(ctx, t, e) {
      const cols = [COL.pink, COL.sun, COL.mint];
      const c = cols[(e && e.color) | 0 || 0] || COL.pink;
      rrect(ctx, -38, -11, 76, 11, 5.5); paint(ctx, c);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.45;
      for (const x of [-22, -4, 14]) { rrect(ctx, x, -9.5, 9, 3, 1.5); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    // kettle grill with a little smoke
    grill(ctx, t) {
      ctx.strokeStyle = COL.coal; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-9, 0); ctx.moveTo(6, -12); ctx.lineTo(9, 0); ctx.stroke();
      // the lid is off: it leans against the right leg, the open bowl shows its grate
      ctx.save(); ctx.translate(11, 0); ctx.rotate(0.12);
      ctx.beginPath(); ctx.arc(0, -9.5, 9.5, -Math.PI / 2, Math.PI / 2); ctx.closePath(); paint(ctx, COL.greyDeep);
      ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(10.6, -9.5, 1.6, 0, TAU); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, -14, 13, 0, Math.PI); ctx.closePath(); paint(ctx, COL.coal);
      ctx.fillStyle = COL.orange; ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 3); ell(ctx, 0, -14, 10.5, 1.6); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = COL.grey; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-13, -14.5); ctx.lineTo(13, -14.5); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.35 + i / 3) % 1;
        ctx.globalAlpha = 0.45 * (1 - k); ctx.fillStyle = COL.white; ell(ctx, 2 + Math.sin(k * 5 + i) * 4, -22 - k * 22, 3 + k * 4, 3 + k * 4); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // picnic table with a cake, 60 wide
    table(ctx) {
      ctx.fillStyle = COL.woodDeep; ctx.fillRect(-24, -16, 3, 16); ctx.fillRect(21, -16, 3, 16);
      rrect(ctx, -30, -20, 60, 5, 2); paint(ctx, COL.wood);
      rrect(ctx, -26, -9, 52, 3, 1.5); paint(ctx, COL.wood);
      // red and white cloth
      ctx.fillStyle = COL.pinkLite; ctx.fillRect(-18, -22, 36, 3);
      ctx.fillStyle = COL.red; for (let i = 0; i < 6; i++) ctx.fillRect(-18 + i * 6, -22, 3, 3);
      // cake
      rrect(ctx, -9, -31, 18, 9, 3); paint(ctx, COL.pink);
      ctx.fillStyle = COL.cream; rrect(ctx, -9, -31, 18, 3.5, 1.7); ctx.fill();
      ctx.fillStyle = COL.sun; ctx.fillRect(-0.8, -37, 1.6, 6); ctx.fillStyle = COL.orange; ell(ctx, 0, -38, 1.4, 2); ctx.fill();
    },
    // beach umbrella: pole and a striped canopy, 70 wide
    umbrella(ctx) {
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -42); ctx.stroke();
      const seg = [COL.pink, COL.white, COL.pink, COL.white, COL.pink];
      for (let i = 0; i < 5; i++) {
        const a0 = Math.PI + (i / 5) * Math.PI, a1 = Math.PI + ((i + 1) / 5) * Math.PI;
        ctx.beginPath(); ctx.moveTo(0, -42); ctx.arc(0, -36, 35, a0, a1); ctx.closePath(); ctx.fillStyle = seg[i]; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(-35, -36); ctx.arc(0, -36, 35, Math.PI, TAU); ctx.closePath(); outline(ctx, 0.3);
    },
    // sand bucket with a spade
    bucket(ctx) {
      ctx.strokeStyle = COL.coal; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, TAU); ctx.stroke();
      // wet sand heaped in it, a shell on top
      const W = (api && api.W) || {};
      ctx.beginPath(); ctx.moveTo(-8.5, -14); ctx.quadraticCurveTo(-4, -19.5, 1, -18.6); ctx.quadraticCurveTo(6, -18, 8.5, -14); ctx.closePath(); paint(ctx, W.groundDot || '#E3CB9C', 0.25);
      ell(ctx, 2.5, -18.4, 2.1, 1.5, -0.3); paint(ctx, COL.pinkLite, 0.3);
      ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(9, -14); ctx.lineTo(7, 0); ctx.lineTo(-7, 0); ctx.closePath(); paint(ctx, COL.sky);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.4; ctx.fillRect(-8, -9, 16, 2.5); ctx.globalAlpha = 1;
      ctx.strokeStyle = COL.red; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(19, -13); ctx.stroke();
      rrect(ctx, 15.5, -19, 8, 7, 3); paint(ctx, COL.red);
    },
    // fishing net (a "kescher") leaning on its pole
    net(ctx, t, e) {
      const sw = Math.sin(t * 1.3) * 0.03;
      ctx.save(); ctx.rotate(0.28 + sw);
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34); ctx.stroke();
      ell(ctx, 0, -43, 10, 9); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill(); ctx.strokeStyle = COL.coral || COL.pink; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = COL.white; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-9, -43); ctx.lineTo(9, -43); ctx.moveTo(0, -52); ctx.lineTo(0, -34); ctx.stroke(); ctx.globalAlpha = 1;
      if (e && e.catch === 'slipper' && window.MimoCoast.sdraw.slipper) { ctx.save(); ctx.translate(0, -40); ctx.rotate(-0.3 + Math.sin(t * 2.4) * 0.15); ctx.scale(0.8, 0.8); window.MimoCoast.sdraw.slipper(ctx); ctx.restore(); }
      else if (e && e.catch && window.MimoCoast.sdraw && window.MimoCoast.sdraw.crab) { ctx.save(); ctx.translate(0, -39); ctx.scale(0.4, 0.4); window.MimoCoast.sdraw.crab(ctx, t, { hop: Math.abs(Math.sin(t * 6)) * 5 }); ctx.restore(); }
      ctx.restore();
    },
    // stand-up paddle board with the paddle, 70 wide
    board(ctx) {
      ctx.beginPath(); ctx.moveTo(-35, -3); ctx.quadraticCurveTo(-30, -8, 0, -8); ctx.quadraticCurveTo(30, -8, 37, -3); ctx.quadraticCurveTo(30, 1, 0, 1); ctx.quadraticCurveTo(-30, 1, -35, -3); ctx.closePath(); paint(ctx, COL.mint);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.5; ctx.fillRect(-8, -5.5, 16, 2); ctx.globalAlpha = 1;
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(22, -34); ctx.stroke();
      ell(ctx, 23.5, -39, 3.2, 6.5, 0.28); paint(ctx, COL.sun);
    },
    // radio with two speakers and a few notes
    radio(ctx, t) {
      ctx.strokeStyle = COL.greyDeep; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -17); ctx.lineTo(15, -30); ctx.stroke();
      rrect(ctx, -12, -17, 24, 17, 4); paint(ctx, COL.red);
      ctx.fillStyle = COL.cream; ctx.beginPath(); ctx.arc(-5, -8, 4.6, 0, TAU); ctx.arc(5, -8, 4.6, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.coal; ctx.beginPath(); ctx.arc(-5, -8, 1.6, 0, TAU); ctx.arc(5, -8, 1.6, 0, TAU); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.5 + i * 0.5) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = ink(); ell(ctx, -4 + i * 9 + Math.sin(k * 6) * 3, -22 - k * 20, 2, 1.5, -0.4); ctx.fill();
        ctx.fillRect(-2.4 + i * 9 + Math.sin(k * 6) * 3, -29 - k * 20, 1, 7);
      }
      ctx.globalAlpha = 1;
    },
    // cooler box
    cooler(ctx) {
      rrect(ctx, -14, -15, 28, 15, 3); paint(ctx, COL.sky);
      rrect(ctx, -15, -19, 30, 6, 3); paint(ctx, COL.white);
      ctx.strokeStyle = COL.greyDeep; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, -19); ctx.quadraticCurveTo(0, -25, 5, -19); ctx.stroke();
    },
  };

  // ---------- the gull: white with grey wings, small. o: { hop (px up), face (1/-1), blink (0..1 open) } ----------
  function gull(ctx, t, o) {
    const hop = (o && o.hop) || 0, face = (o && o.face) || 1;
    ctx.save(); ctx.translate(0, -hop); ctx.scale(face, 1);
    ctx.strokeStyle = COL.orange; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-2, hop > 1 ? -1 : 0); ctx.moveTo(3, -4); ctx.lineTo(3, hop > 1 ? -1 : 0); ctx.stroke();
    // tail, body, wing
    ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-17, -11); ctx.lineTo(-9, -5); ctx.closePath(); paint(ctx, COL.white);
    ell(ctx, 0, -9, 10, 6.5, -0.1); paint(ctx, COL.white);
    ctx.beginPath(); ctx.moveTo(-3, -12); ctx.quadraticCurveTo(-10, -13, -14, -8); ctx.quadraticCurveTo(-6, -5, 3, -9); ctx.closePath(); paint(ctx, COL.grey);
    // head, beak, eye
    ell(ctx, 8, -16, 5, 4.6); paint(ctx, COL.white);
    ctx.beginPath(); ctx.moveTo(12, -17); ctx.lineTo(18, -15.5); ctx.lineTo(12, -14); ctx.closePath(); paint(ctx, COL.orange);
    ctx.fillStyle = ink(); ell(ctx, 9.5, -17.2, 1.1, 1.1 * ((o && o.blink) == null ? 1 : o.blink)); ctx.fill();
    ctx.restore();
  }

  // ---------- the lighthouse keeper: a simple standing figure, 54 tall. o: { face, wave } ----------
  function keeper(ctx, t, o) {
    const face = (o && o.face) || 1, wave = !!(o && o.wave);
    ctx.save(); ctx.scale(face, 1);
    ctx.fillStyle = COL.navy; ctx.fillRect(-7, -8, 5, 8); ctx.fillRect(2, -8, 5, 8);
    rrect(ctx, -11, -36, 22, 30, 8); paint(ctx, COL.navy);
    ctx.fillStyle = COL.sun; for (const y of [-30, -23, -16]) { ctx.beginPath(); ctx.arc(0, y, 1.5, 0, TAU); ctx.fill(); }
    // arms: one at the side, one up when waving
    ctx.strokeStyle = COL.navyLite; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(-14, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -30);
    if (wave) ctx.lineTo(17, -40 + Math.sin(t * 9) * 3); else ctx.lineTo(14, -18);
    ctx.stroke();
    ctx.fillStyle = COL.skin; ctx.beginPath(); if (wave) ctx.arc(17, -42 + Math.sin(t * 9) * 3, 3, 0, TAU); else ctx.arc(14, -17, 3, 0, TAU); ctx.arc(-14, -17, 3, 0, TAU); ctx.fill();
    // head with a white beard and a captain's cap
    ell(ctx, 0, -42, 8, 8); paint(ctx, COL.skin);
    ctx.beginPath(); ctx.moveTo(-8, -41); ctx.quadraticCurveTo(0, -26, 8, -41); ctx.quadraticCurveTo(0, -37, -8, -41); ctx.closePath(); paint(ctx, COL.white);
    ctx.fillStyle = ink(); ctx.beginPath(); ctx.arc(-3, -43, 1.1, 0, TAU); ctx.arc(3, -43, 1.1, 0, TAU); ctx.fill();
    rrect(ctx, -9, -54, 18, 7, 3.5); paint(ctx, COL.navyLite);
    ctx.fillStyle = COL.white; ctx.fillRect(-10, -48, 20, 3);
    ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(0, -51, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- Kalle the taxi crab, 30 wide. o: { face, hop } ----------
  function crab(ctx, t, o) {
    const hop = (o && o.hop) || 0, col = (api && api.W && api.W.crab) || COL.red, deep = (api && api.W && api.W.crabInk) || COL.redDeep;
    ctx.save(); ctx.translate(0, -hop);
    ctx.strokeStyle = deep; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * 7, -6); ctx.lineTo(s * (12 + i * 2.5), -3 + i * 1.2); ctx.stroke(); }
    ell(ctx, 0, -9, 13, 8); paint(ctx, col);
    const up = hop > 0.5 ? 6 : 0;
    for (const s of [-1, 1]) { ctx.strokeStyle = deep; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(s * 11, -10); ctx.lineTo(s * 16, -15 - up); ctx.stroke(); ell(ctx, s * 17, -18 - up, 4.4, 3.6, s * 0.5); paint(ctx, col); }
    ctx.strokeStyle = deep; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -15); ctx.lineTo(-4, -19); ctx.moveTo(4, -15); ctx.lineTo(4, -19); ctx.stroke();
    ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(-4, -20, 2.4, 0, TAU); ctx.arc(4, -20, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = ink(); ctx.beginPath(); ctx.arc(-4, -20, 1.1, 0, TAU); ctx.arc(4, -20, 1.1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- found items: small icons around (0, 0), about 22 px big ----------
  const ICONS = {
    ball(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fillStyle = COL.white; ctx.fill();
      const cols = [COL.pink, COL.sun, COL.sky, COL.mint];
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, i * Math.PI / 2 + 0.2, i * Math.PI / 2 + 0.2 + Math.PI / 4); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); outline(ctx, 0.35);
    },
    sunglasses(ctx) {
      ctx.strokeStyle = ink(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.quadraticCurveTo(0, -3, 3, -1); ctx.moveTo(-10, -2); ctx.lineTo(-12, -5); ctx.moveTo(10, -2); ctx.lineTo(12, -5); ctx.stroke();
      for (const s of [-1, 1]) { rrect(ctx, s * 6.5 - 5.5, -3.5, 11, 8.5, 4); paint(ctx, '#5B5F8F', 0.5); ctx.fillStyle = COL.white; ctx.globalAlpha = 0.5; ell(ctx, s * 6.5 - 1.8, -0.5, 1.6, 1, -0.5); ctx.fill(); ctx.globalAlpha = 1; }
    },
    flipflop(ctx) {
      ell(ctx, 0, 1, 6.5, 11, 0.1); paint(ctx, COL.sky);
      ctx.strokeStyle = COL.pink; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-4, 3); ctx.moveTo(0, -3); ctx.lineTo(4, 3); ctx.stroke();
      ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.arc(0, -3, 1.8, 0, TAU); ctx.fill();
    },
    watch(ctx) {
      rrect(ctx, -3.5, -12, 7, 24, 3); paint(ctx, COL.pink);
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); paint(ctx, COL.sun);
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = COL.cream; ctx.fill();
      ctx.strokeStyle = ink(); ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -3.6); ctx.moveTo(0, 0); ctx.lineTo(2.6, 1); ctx.stroke();
    },
    pen(ctx) {
      ctx.save(); ctx.rotate(-0.8);
      rrect(ctx, -3, -12, 6, 18, 2.5); paint(ctx, COL.navy);
      ctx.fillStyle = COL.sun; ctx.fillRect(-3, -6, 6, 2);
      ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.lineTo(0, 12); ctx.closePath(); paint(ctx, COL.sun);
      ctx.restore();
    },
    scarf(ctx) {
      ctx.beginPath(); ctx.moveTo(-11, -4); ctx.quadraticCurveTo(0, -9, 11, -4); ctx.lineTo(11, 3); ctx.quadraticCurveTo(0, -2, -11, 3); ctx.closePath(); paint(ctx, COL.red);
      ctx.fillStyle = COL.white; for (const x of [-7, -1, 5]) ctx.fillRect(x, -6, 2.4, 8.5);
      ctx.beginPath(); ctx.moveTo(5, 1); ctx.lineTo(11, 1); ctx.lineTo(9, 11); ctx.lineTo(3, 11); ctx.closePath(); paint(ctx, COL.red);
    },
    dogball(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); paint(ctx, '#E6F08A');
      ctx.strokeStyle = COL.white; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-7, 0, 7, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(7, 0, 7, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    },
    camera(ctx) {
      rrect(ctx, -11, -6, 22, 15, 4); paint(ctx, COL.mint);
      rrect(ctx, -5, -9, 8, 4, 1.5); paint(ctx, COL.mint);
      ctx.beginPath(); ctx.arc(0, 2, 5.2, 0, TAU); paint(ctx, COL.white);
      ctx.beginPath(); ctx.arc(0, 2, 3, 0, TAU); ctx.fillStyle = COL.navyLite; ctx.fill();
      ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.arc(7.5, -3, 1.4, 0, TAU); ctx.fill();
    },
    umbrella(ctx) {
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 10); ctx.quadraticCurveTo(0, 13, 3, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, -3); ctx.quadraticCurveTo(0, -17, 12, -3); ctx.quadraticCurveTo(6, -6, 0, -3); ctx.quadraticCurveTo(-6, -6, -12, -3); ctx.closePath(); paint(ctx, COL.pink);
    },
    mic(ctx) {
      ctx.strokeStyle = COL.coal; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, 2); ctx.lineTo(-5, 11); ctx.stroke();
      ctx.beginPath(); ctx.arc(1, -4, 7, 0, TAU); paint(ctx, COL.grey);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(-1, -6, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = COL.red; ctx.fillRect(-3, 2, 8, 3);
    },
    bulb(ctx) {
      ctx.beginPath(); ctx.arc(0, -3, 8, 0, TAU); paint(ctx, '#FFF2B0');
      rrect(ctx, -4, 3, 8, 8, 2); paint(ctx, COL.grey);
      ctx.strokeStyle = COL.orange; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2.5, 3); ctx.lineTo(-2.5, -2); ctx.lineTo(0, 0); ctx.lineTo(2.5, -2); ctx.lineTo(2.5, 3); ctx.stroke();
    },
    taxisign(ctx) {
      rrect(ctx, -12, -6, 24, 12, 3); paint(ctx, COL.sun);
      ctx.fillStyle = ink(); for (let i = 0; i < 6; i++) { ctx.fillRect(-10 + i * 3.5, i % 2 ? -4 : -1, 3.5, 3); ctx.fillRect(-10 + i * 3.5, i % 2 ? -1 : 2, 3.5, 3); }
      ctx.globalAlpha = 0.35; ctx.fillRect(-10, -5, 20, 0); ctx.globalAlpha = 1;
      rrect(ctx, -5, 6, 10, 3, 1); paint(ctx, COL.grey);
    },
    cakebox(ctx) {
      rrect(ctx, -11, -6, 22, 15, 3); paint(ctx, COL.pinkLite);
      rrect(ctx, -12, -9, 24, 5, 2); paint(ctx, COL.pink);
      ctx.fillStyle = COL.white; ctx.fillRect(-1.5, -9, 3, 18);
      ctx.beginPath(); ctx.ellipse(-3.5, -11, 3.6, 2.2, -0.5, 0, TAU); ctx.ellipse(3.5, -11, 3.6, 2.2, 0.5, 0, TAU); ctx.fillStyle = COL.white; ctx.fill(); outline(ctx, 0.25);
    },
  };
  const ITEMS = Object.keys(ICONS);

  // an item with a soft glow (not a star: a round warm light) and its icon; r is the glow radius
  function findIcon(ctx, item, t, alpha) {
    const draw = ICONS[item] || ICONS.ball, a = alpha == null ? 1 : alpha;
    const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 22);
    g.addColorStop(0, 'rgba(255,246,200,0.75)'); g.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.save(); ctx.globalAlpha = a * (0.55 + 0.25 * Math.sin(t * 3)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    ctx.globalAlpha = a; ctx.rotate(Math.sin(t * 2) * 0.06); draw(ctx); ctx.restore();
  }
  // a soft contact shadow under a prop standing on the sand (the same ink and strength as under the figures);
  // flat things (towels, prints, plates) and things in the water have none. Half widths in prop units.
  const SHADOW = { bucket: 13, shellbucket: 11, shovel: 6, grill: 17, table: 24, net: 7, radio: 12, cooler: 14, umbrella: 9, flipflop: 7, pile: 20, hermit: 9, portrait: 12, cakebox: 11, ball: 8, papers: 10 };
  function groundShadow(ctx, kind, x) {
    const w = SHADOW[kind]; if (!w) return;
    ctx.save(); ctx.fillStyle = 'rgba(58,56,80,0.12)'; ctx.beginPath(); ctx.ellipse(x || 0, -0.6, w, Math.max(1.6, w * 0.16), 0, 0, TAU); ctx.fill();
    // the umbrella throws its canopy's shade beside the pole (light from the top left)
    if (kind === 'umbrella') { ctx.fillStyle = 'rgba(58,56,80,0.08)'; ctx.beginPath(); ctx.ellipse(10, -0.4, 34, 4.2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // sand mound (for buried figures): width w, height h, in the world's ground colours
  function mound(ctx, w, h) {
    const W = (api && api.W) || {};
    ctx.beginPath(); ctx.moveTo(-w / 2, 1); ctx.quadraticCurveTo(-w / 2 + 3, -h, 0, -h); ctx.quadraticCurveTo(w / 2 - 3, -h, w / 2, 1); ctx.closePath();
    ctx.fillStyle = W.ground || '#F3DFB8'; ctx.fill();
    ctx.strokeStyle = W.groundEdge || '#FDF2D9'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -2); ctx.quadraticCurveTo(-w / 2 + 6, -h + 1, -4, -h + 0.5); ctx.stroke();
    ctx.fillStyle = W.groundDot || '#E3CB9C'; for (const [x, y] of [[-w * 0.22, -h * 0.35], [w * 0.1, -h * 0.5], [w * 0.28, -h * 0.2]]) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
  }

  window.MimoCoast = Object.assign(window.MimoCoast || {}, { sdraw: { PROPS, ICONS, ITEMS, gull, keeper, crab, findIcon, mound, groundShadow, COL, setNight, paint, outline, ell, rrect, ink } });
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; } });
})();
