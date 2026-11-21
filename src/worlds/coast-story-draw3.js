// World 4 story pictures, part three (levels 37 to 42 and the closing scene): the lighthouse keeper, the handcart, the swim
// ring, the eight slippers, the Krake's self-portrait, the pile of stolen things, the hermit crab with the bucket, the
// little screen of the filmer's footage and the light of the lighthouse. Pure drawing, no state; everything moves only with
// the time t it is given. Origin: bottom centre (the feet or the ground contact point), y points down. Shares the palette
// (so the night wash) of coast-story-draw.js through MimoCoast.sdraw.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const S = () => window.MimoCoast.sdraw;
  let api = null;
  const ARM = { body: '#F08FA4', lite: '#F9BFCB' };

  // ---------- the lighthouse keeper (a woman with a grey bun, round glasses and a navy coat), 56 tall ----------
  // o: { face, wave, walk: running leg phase or null, candle: true holds a candle (with its glow), lift: 0..1 an arm up }
  function keeper(ctx, t, o) {
    const { COL, paint, ell, rrect, ink } = S(), face = (o && o.face) || 1, walk = o && o.walk, lift = (o && o.lift) || 0;
    const sw = walk == null ? 0 : Math.sin(walk) * 0.5, bob = walk == null ? 0 : Math.abs(Math.sin(walk)) * 1.2;
    ctx.save(); ctx.scale(face, 1); ctx.translate(0, -bob);
    // legs with real steps, shoes
    for (const [s, a] of [[-1, sw], [1, -sw]]) {
      ctx.save(); ctx.translate(s * 4, -16); ctx.rotate(a);
      ctx.fillStyle = COL.navy; ctx.fillRect(-2.4, 0, 4.8, 13); ctx.fillStyle = COL.coal; ell(ctx, 1.2, 14.5, 3.8, 2); ctx.fill(); ctx.restore();
    }
    // coat (a little skirt flare), buttons
    ctx.beginPath(); ctx.moveTo(-10, -38); ctx.quadraticCurveTo(-12, -24, -13, -14); ctx.lineTo(13, -14); ctx.quadraticCurveTo(12, -24, 10, -38); ctx.closePath(); paint(ctx, COL.navy);
    ctx.fillStyle = COL.sun; for (const y of [-33, -27, -21]) { ctx.beginPath(); ctx.arc(1.5, y, 1.3, 0, TAU); ctx.fill(); }
    // back arm, front arm (up with a candle, a wave or the bulb)
    ctx.strokeStyle = COL.navyLite; ctx.lineWidth = 4.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(-11 - sw * 4, -22); ctx.stroke();
    const up = (o && (o.wave || o.candle)) ? 1 : lift, wv = o && o.wave ? Math.sin(t * 9) * 3 : 0;
    const hx = 9 + 5 * up, hy = -20 - 18 * up + wv;
    ctx.beginPath(); ctx.moveTo(8, -35); ctx.quadraticCurveTo(13, -30 + 4 * (1 - up), hx, hy); ctx.stroke();
    ctx.fillStyle = COL.skin; ctx.beginPath(); ctx.arc(hx, hy, 2.8, 0, TAU); ctx.arc(-11 - sw * 4, -21, 2.8, 0, TAU); ctx.fill();
    // head: round face, grey bun, glasses, a smile
    ell(ctx, 0, -45, 7.6, 8); paint(ctx, COL.skin);
    ctx.fillStyle = COL.grey; ctx.beginPath(); ctx.arc(0, -47, 8, Math.PI * 1.05, TAU * 0.99); ctx.fill();
    ell(ctx, -6.5, -52, 4.4, 4.2); paint(ctx, COL.grey, 0.25);
    ctx.strokeStyle = ink(); ctx.lineWidth = 0.9; ctx.globalAlpha = 0.8;
    for (const x of [-0.5, 4.8]) { ctx.beginPath(); ctx.arc(x, -45, 2.4, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(1.9, -45); ctx.lineTo(2.4, -45); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = ink(); ctx.beginPath(); ctx.arc(-0.5, -45, 0.9, 0, TAU); ctx.arc(4.8, -45, 0.9, 0, TAU); ctx.fill();
    ctx.strokeStyle = ink(); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(2.6, -41.2, 1.8, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = COL.pink; ctx.globalAlpha = 0.45; ell(ctx, 6.4, -42, 1.6, 1); ctx.fill(); ctx.globalAlpha = 1;
    if (o && o.candle) candle(ctx, hx, hy, t);
    ctx.restore();
  }
  // a candle in a little holder, the flame flickering, a warm glow round it (hand at hx, hy)
  function candle(ctx, hx, hy, t) {
    const { COL, rrect, paint } = S(), fl = Math.sin(t * 17) * 0.6 + Math.sin(t * 29) * 0.4;
    const g = ctx.createRadialGradient(hx, hy - 12, 1, hx, hy - 12, 34);
    g.addColorStop(0, 'rgba(255,224,143,0.55)'); g.addColorStop(1, 'rgba(255,224,143,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy - 12, 34, 0, TAU); ctx.fill();
    rrect(ctx, hx - 4, hy - 1, 8, 2.4, 1); paint(ctx, COL.sun, 0.3);
    rrect(ctx, hx - 1.8, hy - 9, 3.6, 8, 1); paint(ctx, COL.cream, 0.3);
    ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.ellipse(hx + fl * 0.5, hy - 12, 1.8, 3.4 + fl * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF6C8'; ctx.beginPath(); ctx.ellipse(hx + fl * 0.4, hy - 11.4, 0.8, 1.6, 0, 0, TAU); ctx.fill();
  }

  // ---------- the handcart (side view, handle to the left), rolled = wheel turn in px, load: { umbrella, mattress, cooler } ----------
  function cart(ctx, rolled, load) {
    const sd = S(), K = sd.COL; load = load || {};
    ctx.save(); ctx.scale(-1, 1);
    for (const wx of [-14, 12]) { ctx.save(); ctx.translate(wx, -9); ctx.rotate((rolled || 0) / 9); ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); sd.paint(ctx, K.greyDeep, 0.3); ctx.strokeStyle = K.white; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.rotate(Math.PI / 3); } ctx.restore(); }
    sd.rrect(ctx, -30, -27, 56, 13, 3); sd.paint(ctx, K.wood); ctx.fillStyle = K.woodDeep; ctx.fillRect(-30, -17, 56, 2.6);
    ctx.strokeStyle = K.woodDeep; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, -20); ctx.lineTo(42, -30); ctx.stroke();
    ctx.strokeStyle = K.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(39, -29); ctx.lineTo(45, -31.5); ctx.stroke();
    if (load.cooler) { ctx.save(); ctx.translate(8, -26); sd.PROPS.cooler(ctx, 0, {}); ctx.restore(); }
    if (load.umbrella) { ctx.save(); ctx.translate(-6, -27); ctx.rotate(-1.25); ctx.scale(0.62, 0.3); sd.PROPS.umbrella(ctx, 0, {}); ctx.restore(); }
    if (load.mattress) { ctx.save(); ctx.translate(-12, -27); ctx.scale(0.42, 0.8); sd.PROPS.mattress(ctx, 0, { color: 0 }); ctx.restore(); }
    ctx.restore();
  }

  // ---------- small things ----------
  // a swim ring with pink and white stripes, round its own centre, about 24 px
  function ring(ctx) {
    const { COL, outline } = S();
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(0, 0, 11, i * TAU / 8, (i + 1) * TAU / 8); ctx.arc(0, 0, 5, (i + 1) * TAU / 8, i * TAU / 8, true); ctx.closePath(); ctx.fillStyle = i % 2 ? COL.white : COL.pink; ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.moveTo(5, 0); ctx.arc(0, 0, 5, 0, TAU, true); outline(ctx, 0.35);
    ctx.fillStyle = COL.white; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(-5, -7, 2.6, 1.2, -0.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  // a fluffy pink slipper seen from the side, toe to the right, 16 long
  function slipper(ctx, col) {
    const { paint, COL } = S();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -3); ctx.quadraticCurveTo(-2, -4, 2, -7); ctx.quadraticCurveTo(8, -8, 8.5, -2); ctx.lineTo(8.5, 0); ctx.closePath(); paint(ctx, col || COL.pinkLite, 0.35);
    ctx.fillStyle = COL.white; ctx.globalAlpha = 0.85; for (const [x, y] of [[1, -7], [3.6, -8], [6, -7.6], [-1.4, -5.6]]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.fillStyle = COL.pink; ctx.fillRect(-8, -1.2, 16.5, 1.2);
  }

  const P3 = {
    // the eight slippers of an eight-armed captain, lined up neatly in pairs (e.n of them)
    slippers(ctx, t, e) {
      const n = (e && e.n) || 8, cols = [S().COL.pinkLite, S().COL.sun];
      for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(-((n - 1) / 2) * 14 + i * 14 + (i % 2) * -2, 0); ctx.scale(0.9, 0.9); slipper(ctx, cols[Math.floor(i / 2) % 2]); ctx.restore(); }
    },
    // a framed self-portrait: the Krake's head with the captain's cap, smug; hangs with its bottom edge at the origin
    portrait(ctx, t) {
      const { rrect, paint, COL, ink } = S();
      rrect(ctx, -22, -46, 44, 44, 3); paint(ctx, '#E2B04A', 0.45);
      rrect(ctx, -18, -42, 36, 36, 2); ctx.fillStyle = '#BFE3EE'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(-18, -42, 36, 36); ctx.clip();
      ctx.fillStyle = ARM.body; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 11, -8, 5, 9, s * 0.5, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -20, 13, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 4.6, -21, 3.2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = ink(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 4.6 + 0.8, -21, 1.6, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = ink(); ctx.lineWidth = 1.1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7.6, -25.6); ctx.lineTo(s * 2, -24.4); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, -15.4, 3, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.fillStyle = '#3F4A78'; rrect(ctx, -11, -36, 22, 6, 2.5); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -30.4, 14, 2.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(0, -33, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = COL.woodDeep; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -46); ctx.lineTo(0, -54); ctx.lineTo(10, -46); ctx.stroke();
    },
    // the Krake's store: the handcart from the first day heaped with what went missing, about 90 wide
    pile(ctx, t) {
      const sd = S();
      ctx.save(); ctx.translate(6, 0); cart(ctx, 0, {}); ctx.restore();
      const put = (x, y, rot, s, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); fn(); ctx.restore(); };
      put(-36, 0, 0, 1, () => sd.PROPS.towel(ctx));
      put(-30, -2, -0.15, 1, () => sd.PROPS.papers(ctx, t));
      put(4, -27, 0.05, 1, () => sd.PROPS.towel(ctx));
      put(-8, -28, 0, 1, () => sd.PROPS.bucket(ctx));
      put(14, -38, 0.3, 0.8, () => sd.ICONS.flipflop(ctx));
      put(22, -30, -0.2, 0.85, () => sd.PROPS.cooler(ctx));
      put(2, 0, 0, 0.9, () => sd.PROPS.plate(ctx, t, { n: 2 }));
      put(-20, -40, -0.4, 0.7, () => sd.ICONS.ball(ctx));
      put(34, -2, 0.4, 0.8, () => sd.ICONS.sunglasses(ctx));
    },
    // the hermit crab that moved into the filmer's bucket: the bucket on scuttling legs, eyes on stalks
    hermit(ctx, t) {
      const { COL, paint, ell, ink } = S(), step = Math.sin(t * 18);
      ctx.strokeStyle = COL.redDeep; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const ph = step * (i % 2 ? 1 : -1) * s; ctx.beginPath(); ctx.moveTo(s * 4 + i * 2, -5); ctx.lineTo(s * (8 + i * 2) + ph * 2, 0); ctx.stroke(); }
      ctx.save(); ctx.translate(0, -3 - Math.abs(step) * 1.2); ctx.rotate(step * 0.05);
      ctx.beginPath(); ctx.moveTo(-9, -15); ctx.lineTo(9, -15); ctx.lineTo(7, 0); ctx.lineTo(-7, 0); ctx.closePath(); paint(ctx, COL.sun);
      ctx.fillStyle = COL.white; ctx.globalAlpha = 0.4; ctx.fillRect(-8, -9, 16, 2.5); ctx.globalAlpha = 1;
      const cols = [COL.pinkLite, COL.white, COL.cream];
      for (let i = 0; i < 5; i++) { const x = -6 + i * 3, y = -16 - (i % 2) * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 3, Math.PI, TAU); ctx.closePath(); paint(ctx, cols[i % 3], 0.35); }
      ctx.restore();
      ctx.strokeStyle = COL.redDeep; ctx.lineWidth = 1.2; for (const s of [6, 10]) { ctx.beginPath(); ctx.moveTo(s, -8); ctx.lineTo(s + 2, -14); ctx.stroke(); }
      ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(8, -15, 2, 0, TAU); ctx.arc(12, -15, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = ink(); ctx.beginPath(); ctx.arc(8.7, -15, 1, 0, TAU); ctx.arc(12.7, -15, 1, 0, TAU); ctx.fill();
      ell(ctx, 13, -6, 3, 2.2, 0.4); paint(ctx, COL.red, 0.3);
    },
    // the handcart on its own (the opening and the closing scene)
    cart(ctx, t, e) { cart(ctx, 0, (e && e.load) || {}); },
  };

  // ---------- the filmer's footage: a little screen over her head that replays what the camera saw ----------
  // the sea, then a pink arm rises behind the beach things, curls round one and pulls it under. (0, 0) = the tip of the tail.
  // below: the screen hangs below and right of (0, 0) with its tail pointing up at it (a door at the top of a level leaves
  // no room above the heads, and the speech bubbles live there)
  function footage(ctx, t, k, below) {
    const { ink } = S(), w = 78, h = 50, x = below ? -8 : -w / 2, y = below ? 22 : -h - 9, a = Math.min(1, k == null ? 1 : k);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 6);
    // the card is a speech bubble: its frame follows the bubbles of the scheme, the picture the colours of the world now
    const W = (api && api.W) || {}, frame = (api && api.P && api.P.card) || '#FFFFFF', mix = (c, d, k) => (api && api.mixHex && c && d ? api.mixHex(c, d, k) : c || d);
    const sky = mix(W.skyTop, W.skyBot, 0.45) || '#BFE8EC', sea = W.waterTop || '#7CC6D8', sand = W.ground || '#F1DDB0';
    ctx.fillStyle = frame; ctx.beginPath();
    if (below) { ctx.moveTo(x + 6, y); ctx.lineTo(0, 0); ctx.lineTo(x + 20, y); } else { ctx.moveTo(-5, y + h); ctx.lineTo(0, 0); ctx.lineTo(5, y + h); }
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8); else ctx.rect(x - 4, y - 4, w + 8, h + 8); ctx.fillStyle = frame; ctx.fill();
    ctx.strokeStyle = ink(); ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = a;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = sea; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
    ctx.fillStyle = sand; ctx.beginPath(); ctx.moveTo(x + w * 0.45, y + h); ctx.quadraticCurveTo(x + w * 0.6, y + h * 0.6, x + w, y + h * 0.6); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    // the clip loops every 2.6 s: the arm rises, curls round the bucket, pulls it away
    const c = (t % 2.6) / 2.6, bx = x + w * 0.3, by = y + h * 0.62, rise = Math.min(1, c / 0.35), pull = Math.max(0, (c - 0.6) / 0.3);
    const tip = { x: x + w * 0.66 - pull * w * 0.36, y: y + h * 0.7 - (1 - pull) * 4 + pull * 12 };
    const bucketAt = c < 0.6 ? { x: x + w * 0.68, y: y + h * 0.76 } : tip;
    if (c < 0.92) { ctx.save(); ctx.translate(bucketAt.x, bucketAt.y + 5); ctx.scale(0.5, 0.5); S().PROPS.bucket(ctx); ctx.restore(); }
    if (rise > 0) {
      const ps = [], top = { x: bx + (tip.x - bx) * rise, y: by - 22 * rise + (tip.y - by + 22) * Math.max(0, (c - 0.35) / 0.25) };
      for (let i = 0; i <= 10; i++) { const q = i / 10, m = 1 - q; ps.push({ x: m * m * bx + 2 * m * q * (bx + 4) + q * q * top.x, y: m * m * (by + 6) + 2 * m * q * (by - 26) + q * q * top.y }); }
      ctx.strokeStyle = ARM.body; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < ps.length; i++) { ctx.lineWidth = 7 * (1 - i / ps.length) + 2; ctx.beginPath(); ctx.moveTo(ps[i - 1].x, ps[i - 1].y); ctx.lineTo(ps[i].x, ps[i].y); ctx.stroke(); }
      ctx.fillStyle = ARM.lite; for (let i = 2; i < ps.length - 1; i += 2) { ctx.beginPath(); ctx.arc(ps[i].x + 1.4, ps[i].y + 0.6, 1.1, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = sea; ctx.globalAlpha = a * 0.7; ctx.fillRect(x, y + h * 0.62, w * 0.42, h * 0.38); ctx.globalAlpha = a;
    ctx.restore();
    // REC and a soft scan line
    if (Math.floor(t * 2) % 2) { ctx.fillStyle = '#E24A5A'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 2.4, 0, TAU); ctx.fill(); }
    ctx.font = '800 7px Nunito, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('REC', x + 10, y + 6.5);
    ctx.restore();
  }

  // ---------- the lighthouse light: a warm glow round the lantern and a beam that sweeps over the sea ----------
  // k 0..1 (switching on), ang: the beam's angle (0 = to the right), len: how far it reaches
  function beam(ctx, x, y, k, ang, len) {
    if (k <= 0) return;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 70);
    g.addColorStop(0, 'rgba(255,246,200,' + (0.9 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70, 0, TAU); ctx.fill();
    const L = len || 1400, spread = 0.13, side = Math.cos(ang) >= 0 ? 1 : -1;
    const bg = ctx.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    bg.addColorStop(0, 'rgba(255,240,170,' + (0.55 * k).toFixed(3) + ')'); bg.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x, y - 4 * side); ctx.lineTo(x + Math.cos(ang - spread) * L, y + Math.sin(ang - spread) * L); ctx.lineTo(x + Math.cos(ang + spread) * L, y + Math.sin(ang + spread) * L); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  window.MimoCoast.sdraw.keeper = keeper;
  Object.assign(window.MimoCoast.sdraw, { cart, ring, slipper, candle, footage, beam });
  Object.assign(window.MimoCoast.sdraw.PROPS, P3);
  Object.assign(window.MimoCoast.sdraw.ICONS, { ring });
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; } });
})();
