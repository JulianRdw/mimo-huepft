// World 4: what each owner does with the found item once Mimo has handed it over (coast-handover.js). One gag per person,
// told through the story director: lines and silent beats in a row, each beat's start sets the time of its picture
// (f.fx[name] = api.time). All pictures are functions of those times, never of the real clock.
//   gag = { hold, take(f, o, api), steps(f, o, api) -> [{ by, text, beat, before, done, lead }], pos(f, o, pos, api),
//           held(f, o, api) -> { x, y, s, rot } | null (undefined: in the hand), replay(f, o, api), drawFront/drawMid, afterPose }
//   hold: where the item lands ('hug' between both hands, 'hand' the hand towards Mimo; default the lower hand)
// The gags: kick (the kid shoots the ball straight away again), shades (the reporter puts the sunglasses on upside down),
// flipflop (the wrong foot), ring (the watch rings in the hand), grade (magnifying glass, then "Eins plus" over Mimo),
// scarf (waved like a fan's scarf, then on the neck in the heat), lick (the dog licks Mimo and shakes the water off),
// film (the filmer films Mimo at once, then sees the arm in her footage), shade (the umbrella goes up and pours its sea
// water out), interview (the reporter holds the microphone out to Mimo), light (the keeper blows out her candle, the bulb
// goes into the lantern), taxi (the sign goes on the crab, it honks), cake (the dog sniffs at the cake box).
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, H = () => C().handover, D = () => C().sdraw;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const pop = (x, y, text, size, fill) => C().pop(x, y, text, { size: size || 16, fill });
  const piep = (api) => ({ by: 'player', text: 'Piep.', secs: 1.6, before: () => { if (api.sfx.piep) api.sfx.piep(); } });
  const thanks = (f) => (f.thanks ? { text: f.thanks } : null);
  const at = (o, rel) => ({ x: o.pos.x + rel[0], y: o.pos.foot + rel[1] });
  const headOf = (o) => at(o, C().cast.head(o));
  const slide = (from, to, k, s, rot) => ({ x: lerp(from.x, to.x, ease(k)), y: lerp(from.y, to.y, ease(k)) - Math.sin(Math.min(1, k) * Math.PI) * 10, s, rot });
  const inHand = (f, o, s) => ({ ...H().ownerSpot(o, 'hand', f), s: s || 0.72 });
  const drops = (api, x, y, n, sp) => api.burst(x, y, n || 6, [(api.W && api.W.foam) || '#FFFFFF', (api.W && api.W.waterTop) || '#9BD8E2'], sp || 110, { grav: 420, vy: -60, life: 0.5, r: 1.6 });

  // the kid: hugs the ball, puts it down and shoots it straight back the way Mimo came
  const kick = {
    hold: 'hug',
    take(f, o) { H().over(o, 'hug'); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.5, before: () => { f.fx.kick = api.time; H().over(o, 'kick'); pop(o.pos.x + f.side * 26, o.pos.foot - 66, 'Schuss!', 18, '#F6A9BF'); api.sfx.stomp && api.sfx.stomp(); C().scene.later(o, 0.7, () => H().over(o, null)); } },
        { text: 'Ups. Holst du ihn nochmal?' }];
    },
    held(f, o, api) {
      const k = H().since(f, 'kick'); if (k < 0) return undefined;
      const foot = { x: o.pos.x + f.side * 8, y: o.pos.foot - 7 };
      if (k < 0.18) return slide(H().ownerSpot(o, 'hug', f), foot, k / 0.18, 0.6);
      const q = (k - 0.18) / 1.9; if (q > 1) return null;
      return { x: foot.x + f.side * q * 470, y: foot.y - Math.sin(q * Math.PI * 0.8) * 130 + q * 30, s: 0.6, rot: q * 16 * f.side };
    },
    replay(f, o) { return { ...H().ownerSpot(o, 'low', f), s: 0.6 }; },
  };

  // the reporter: puts the sunglasses on, upside down, and reports on a strand that stands on its head
  const glassesOn = (o) => { const h = headOf(o); return { x: h.x, y: h.y + 1.5, s: 0.5, rot: Math.PI }; };
  const shades = {
    take(f, o) { H().over(o, 'mic', f.dirM); },
    steps(f, o, api) {
      return [{ text: f.thanks, before: () => { f.fx.on = api.time + 0.5; } },
        { text: 'Huch. Warum steht der Strand Kopf?', before: () => H().over(o, null) }, piep(api)];
    },
    held(f, o, api) { const k = H().since(f, 'on'); if (k < 0) return inHand(f, o, 0.6); return k < 0.35 ? slide(inHand(f, o, 0.6), glassesOn(o), k / 0.35, lerp(0.6, 0.5, k / 0.35), Math.PI * ease(k / 0.35)) : glassesOn(o); },
    replay(f, o) { return glassesOn(o); },
  };

  // the man with the red beard: the flip-flop goes on the wrong foot, he hops on as before
  const onFoot = (o) => { const a = at(o, C().cast.ankle(o, 'l')); return { x: a.x + 1, y: a.y + 3.5, s: 0.42, rot: Math.PI / 2 }; };
  const flipflop = {
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.0, before: () => { f.fx.on = api.time; H().over(o, 'hop'); C().scene.later(o, 0.3, () => { const q = onFoot(o); pop(q.x - f.side * 14, q.y - 30, 'Flapp!', 15, '#9ED3EE'); }); } },
        { text: 'Aua! Immer noch heiß!' }, piep(api)];
    },
    held(f, o, api) { const k = H().since(f, 'on'); if (k < 0) return inHand(f, o, 0.6); return k < 0.3 ? slide(inHand(f, o, 0.6), onFoot(o), k / 0.3, lerp(0.6, 0.42, k / 0.3), Math.PI / 2 * ease(k / 0.3)) : onFoot(o); },
  };

  // the sleeper: the watch rings in his hand the moment he has it back
  const ring = {
    hold: 'hand',
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.4, before: () => { f.fx.ring = api.time; H().over(o, null); C().cast.play(o, 'flinch', { dir: f.dirM }); const h = headOf(o); pop(h.x - f.side * 18, h.y - 34, 'RRRING!', 17, '#FFE08F'); api.sfx.sw && api.sfx.sw(); } },
        { text: 'Oh. Zeit für mein Nickerchen.' }];
    },
    held(f, o, api) { const q = inHand(f, o, 0.66), k = H().since(f, 'ring'); if (k >= 0 && k < 1.1) { q.x += Math.sin(k * 70) * 2.2; q.rot = Math.sin(k * 55) * 0.25; } return q; },
  };

  // the professor: inspects the pen through his magnifying glass, then grades Mimo
  const grade = {
    take(f, o) { H().over(o, 'peer', f.dirM); },
    steps(f, o, api) {
      return [thanks(f),
        { text: 'Echt. Eins plus. Setzen.', before: () => { f.fx.badge = api.time; H().over(o, 'write', f.dirM); api.sfx.star && api.sfx.star(); } }];
    },
    held(f, o, api) { if (H().since(f, 'badge') >= 0) return null; const far = C().cast.hand(o, f.dirM > 0 ? 'l' : 'r'); return { ...at(o, far), s: 0.55, rot: -0.4 * f.dirM }; },
    drawFront(ctx, f, o, api) {
      const k = H().since(f, 'badge'), m = H().mimo(); if (k < 0 || k > 3.2 || !m) return;
      const s = k < 0.14 ? k / 0.14 * 1.25 : k < 0.26 ? 1.25 - (k - 0.14) / 0.12 * 0.25 : 1, a = Math.min(1, (3.2 - k) / 0.35);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(m.x, m.top - 22 - Math.min(k, 0.4) * 10); ctx.scale(s, s);
      ctx.fillStyle = '#E26A7E'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 3, 6); ctx.lineTo(sx * 8, 17); ctx.lineTo(sx * 4, 14); ctx.lineTo(sx * 1, 18); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 11 : 13, w = i / 16 * TAU; ctx.lineTo(Math.cos(w) * r, Math.sin(w) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF6E0'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#C24A62'; ctx.font = '800 11px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1+', 0, 0.8);
      ctx.restore();
    },
  };

  // the snorkeller: waves the scarf like a football fan, then wears it in the beach heat and sweats
  const neck = (o) => { const h = headOf(o); return { x: h.x, y: h.y + 11, s: 0.5, rot: 0 }; };
  const scarf = {
    take(f, o) { H().over(o, 'fan'); },
    steps(f, o, api) { return [thanks(f), { text: 'Herrlich warm. Fehlt nur noch Schnee.', before: () => { f.fx.wrap = api.time; H().over(o, null); } }]; },
    held(f, o, api) { const k = H().since(f, 'wrap'); if (k < 0) return null; return k < 0.3 ? slide(inHand(f, o, 0.6), neck(o), k / 0.3, lerp(0.6, 0.5, k / 0.3)) : neck(o); },
    replay(f, o) { return neck(o); },
    drawFront(ctx, f, o, api) {
      const k = H().since(f, 'wrap') - 0.6; if (k < 0 || k > 3 || !o.pos) return;
      const h = headOf(o); ctx.save(); ctx.fillStyle = '#BFE6F2';
      for (let i = 0; i < 3; i++) { const q = (k * 1.3 + i / 3) % 1, x = h.x + (i - 1) * 9, y = h.y - 6 + q * 14; ctx.globalAlpha = 0.9 * (1 - q); ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.quadraticCurveTo(x + 2.2, y + 1, x, y + 2); ctx.quadraticCurveTo(x - 2.2, y + 1, x, y - 3); ctx.fill(); }
      ctx.restore();
    },
  };

  // the dog: takes her ball in the mouth, licks Mimo, then shakes the sea water off over him
  const lick = {
    take(f, o) { o.carry = 'dogball'; },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.0, before: () => { f.fx.lick = api.time; const m = H().mimo(); if (m) { pop(m.x, m.top - 18, 'Schlabber!', 16, '#F6A9BF'); if (api.p) { api.p.sx = 1.2; api.p.sy = 0.84; } } } },
        { beat: 1.4, before: () => { f.fx.shake = api.time; } },
        { by: 'player', text: 'Danke. Glaube ich.' }];
    },
    pos(f, o, pos, api) {
      const l = H().since(f, 'lick'), s = H().since(f, 'shake');
      if (l >= 0 && l < 0.8) pos.x += f.dirM * 8 * Math.sin(Math.min(1, l / 0.8) * Math.PI);
      if (s >= 0 && s < 1.1) { pos.face = Math.floor(s * 16) % 2 ? 1 : -1; pos.x += Math.sin(s * 60) * 1.6; }
    },
    update(f, o, dt, api) {
      const s = H().since(f, 'shake'); if (s < 0 || s > 1.1 || !o.pos) return;
      const n = Math.floor(s * 10); if (n !== f.fx.shakeN) { f.fx.shakeN = n; drops(api, o.pos.x, o.pos.foot - 14, 5, 150); }
    },
    held() { return null; },
    replay(f, o) { o.carry = 'dogball'; return null; },
  };

  // the filmer: films Mimo at once, then watches what the camera saw and finds the arm in it
  const film = {
    take(f, o) { H().over(o, 'cam', f.dirM); },
    steps(f, o, api) {
      return [{ text: f.thanks, before: () => api.setMood('happy', 2) },
        { text: 'Moment. Ist das ein Arm?', before: () => { f.fx.footage = api.time; H().over(o, 'cam', -f.dirM); } }];
    },
    held() { return null; },
    replay() { return null; },
    drawFront(ctx, f, o, api) {
      if (!o.pos) return;
      const k = H().since(f, 'footage');
      if (k < 0 && f.handed && Math.floor(api.time * 2) % 2) { const h = C().cast.hand(o, f.dirM > 0 ? 'r' : 'l'); ctx.fillStyle = '#E24A5A'; ctx.beginPath(); ctx.arc(o.pos.x + h[0], o.pos.foot + h[1] - 9, 1.8, 0, TAU); ctx.fill(); }
      if (k < 0) return;
      ctx.save(); ctx.translate(o.pos.x - 4, o.pos.foot - 22); ctx.scale(1.2, 1.2); D().footage(ctx, k, Math.min(1, k / 0.3), true); ctx.restore();
    },
  };

  // the umbrella: up over the head for the shade, and out of it pours the sea it lay in
  const shade = {
    take(f, o, api) { f.fx.open = api.time; H().over(o, 'thumb'); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.0, before: () => { f.fx.splash = api.time; const h = C().cast.hand(o, 'r'); pop(o.pos.x + h[0], o.pos.foot + h[1] - 34, 'Platsch!', 18, '#9ED3EE'); drops(api, o.pos.x + h[0], o.pos.foot + h[1] - 12, 14, 130); api.sfx.bounce && api.sfx.bounce(); } },
        { text: 'Und eine Dusche gratis.' }];
    },
    held() { return null; },
    replay() { return null; },
    drawFront(ctx, f, o, api) {
      if (!o.pos) return;
      const h = C().cast.hand(o, 'r'), k = f.fx.open == null ? 1 : Math.min(1, H().since(f, 'open') / 0.3);
      ctx.save(); ctx.translate(o.pos.x + h[0], o.pos.foot + h[1] + 4); ctx.scale(0.62 * k, 0.62 * k); D().PROPS.umbrella(ctx, api.time, {}); ctx.restore();
      const s = H().since(f, 'splash'); if (s < 0 || s > 0.9) return;
      ctx.save(); ctx.strokeStyle = '#9ED3EE'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - s / 0.9;
      for (const dx of [-16, -9, 9, 16]) { const y0 = o.pos.foot + h[1] - 6 + s * 40; ctx.beginPath(); ctx.moveTo(o.pos.x + h[0] + dx, y0); ctx.lineTo(o.pos.x + h[0] + dx, y0 + 10); ctx.stroke(); }
      ctx.restore();
    },
  };

  // the reporter with her microphone back: an interview with the finder
  const interview = {
    take(f, o) { H().over(o, 'mic'); },
    steps(f, o, api) {
      return [thanks(f), { text: 'Wie fühlen Sie sich?', before: () => H().over(o, 'offer', f.dirM) }, { ...piep(api), done: () => H().over(o, 'mic') }];
    },
    held() { return null; },
    replay() { return null; },
  };

  // the keeper: blows out her candle, the bulb goes up into the lantern, the light comes on (coast-story-acts2.js)
  const light = {
    take(f, o, api) { o.lift = 1; api.burst(o.pos.x + (o.pos.face || 1) * 14, o.foot - 54, 6, ['#D8D6E2', '#FFFFFF'], 40, { grav: -60, life: 0.8, r: 2.4 }); pop(o.pos.x + (o.pos.face || 1) * 18, o.foot - 62, 'Puh!', 15, '#FFE08F'); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.3, before: () => { f.fx.bulb = api.time; f.fx.light = api.time + 0.7; C().scene.later(o, 0.6, () => { o.lift = 0; }); } }];
    },
    held(f, o, api) {
      const k = H().since(f, 'bulb'), from = H().ownerSpot(o, 'low', f); if (k < 0) return { ...from, s: 0.66 };
      if (!f.lantern || k > 0.7) return null;
      return { x: lerp(from.x, f.lantern.x, ease(k / 0.7)), y: lerp(from.y, f.lantern.y, ease(k / 0.7)) - Math.sin(k / 0.7 * Math.PI) * 30, s: 0.66 - 0.2 * k, rot: k * 3 };
    },
    replay() { return null; },
  };

  // the taxi crab: the sign goes back on the shell, a happy honk
  const sign = (o) => ({ x: o.pos.x, y: o.pos.foot - 30 - (o.pos.hop || 0), s: 0.8, rot: 0 });
  const taxi = {
    take(f, o, api) { f.fx.sign = api.time; C().scene.later(o, 0.35, () => pop(o.pos.x - f.dirM * 36, o.pos.foot - 34, 'Hup hup!', 16, '#FFE08F')); },
    steps(f) { return [thanks(f)]; },
    held(f, o) { const k = H().since(f, 'sign'); return k < 0.3 ? slide(H().ownerSpot(o, 'low', f), sign(o), k / 0.3, 0.8) : sign(o); },
    replay(f, o) { return sign(o); },
  };

  // the cake box: the kid hugs it, the dog sniffs at it
  const cake = {
    hold: 'hug',
    take(f, o) { H().over(o, 'hug'); },
    steps(f, o, api) {
      const dog = f.owners.find((q) => q.who === 'dog');
      return [thanks(f), dog ? { beat: 1.3, before: () => { f.fx.sniff = api.time; pop(dog.pos.x, dog.pos.foot - 34, 'Schnupper!', 15, '#F9BFCB'); } } : null];
    },
    pos(f, o, pos) {
      // the dog stretches up towards the box in the kid's arms (o is the owner being stepped)
      const k = H().since(f, 'sniff'); if (o.who !== 'dog' || k < 0 || k > 1.3) return;
      const kid = f.owners[0]; pos.face = kid.cx >= pos.x ? 1 : -1; pos.x += pos.face * 6 * Math.sin(Math.min(1, k / 1.3) * Math.PI); pos.hop = Math.abs(Math.sin(k * 9)) * 5;
    },
  };

  window.MimoCoast = window.MimoCoast || {};
  window.MimoCoast.handoverGags = { kick, shades, flipflop, ring, grade, scarf, lick, film, shade, interview, light, taxi, cake };
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
