// World 5: what each owner does with the part of the summit photo once Mimo has handed it over (coast-handover.js plays it,
// the shape of a gag is described in coast-handover-gags.js). One short gag per part, kept plain on purpose: the level adds its
// words with find.thanks / find.after. Registered in MimoCoast.handoverGags; volcano-story.js picks one by item.
//   flagPlant  the kid holds the flag up, then pushes it into the ground beside him: it stands there and waves
//   bookWrite  the professor takes the book and writes an entry (the pen scribbles, the book stays in his hand)
//   cocoa      the redbeard opens the thermos, steam rises, a loud slurp, the thermos stays at his mouth for a moment
//   selfie     the filmer sets the tripod up, starts the self-timer and runs into the picture, a step too late: the flash goes off
// All pictures are functions of the beat times (f.fx[name] = api.time), never of the real clock.
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, H = () => C().handover, S = () => C().sdraw;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const pop = (x, y, text, size, fill) => C().pop(x, y, text, { size: size || 16, fill });
  const thanks = (f) => (f.thanks ? { text: f.thanks } : null);
  const headOf = (o) => ({ x: o.pos.x + C().cast.head(o)[0], y: o.pos.foot + C().cast.head(o)[1] });
  const inHand = (f, o, s) => ({ ...H().ownerSpot(o, 'hand', f), s: s || 0.72 });

  // ---------- the flag: up, then planted beside the kid (away from Mimo) ----------
  const plantAt = (f, o) => ({ x: o.pos.x - (f.dirM || f.side) * 26, foot: o.pos.foot });
  const flagPlant = {
    hold: 'hand',
    take(f, o) { H().over(o, 'hooray'); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.1, before: () => { f.fx.plant = api.time; H().over(o, 'pat', f.dirM); const q = plantAt(f, o); pop(q.x, q.foot - 70, 'Schwupp!', 17, '#F28C82'); api.sfx.stomp && api.sfx.stomp(); C().scene.later(o, 0.9, () => H().over(o, null)); } }];
    },
    held(f, o, api) { const k = H().since(f, 'plant'); if (k < 0) return inHand(f, o, 0.78); return null; },
    replay() { return null; },
    drawFront(ctx, f, o, api) {
      if (!o.pos) return;
      const k = f.seen && !f.handed ? 9 : H().since(f, 'plant'); if (k < 0) return;
      const q = plantAt(f, o), up = ease(k / 0.3);
      ctx.save(); ctx.translate(q.x, q.foot); ctx.scale(1, 0.3 + 0.7 * up); S().PROPS.flag(ctx, api.time, { phase: 1.3 }); ctx.restore();
    },
  };

  // ---------- the book: the professor writes the first entry ----------
  const bookWrite = {
    hold: 'hand',
    take(f, o) { H().over(o, 'write', f.dirM); },
    steps(f, o, api) { return [thanks(f), { beat: 2.4, before: () => { f.fx.write = api.time; H().over(o, 'write', f.dirM); } }, { beat: 0.1, before: () => H().over(o, null) }]; },
    held(f, o) { return { ...H().ownerSpot(o, 'low', f), s: 0.72 }; },
    replay(f, o) { return { ...H().ownerSpot(o, 'low', f), s: 0.62 }; },
  };

  // ---------- the thermos: cocoa for the redbeard ----------
  const cocoa = {
    hold: 'hand',
    take(f, o) { H().over(o, 'hooray'); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: 1.8, before: () => { f.fx.sip = api.time; H().over(o, null); const h = headOf(o); pop(h.x - f.side * 20, h.y - 30, 'Schlürf!', 17, '#C98A5E'); } }];
    },
    held(f, o) {
      const k = H().since(f, 'sip'); if (k < 0) return inHand(f, o, 0.72);
      const h = headOf(o), up = ease(k / 0.4) * (1 - ease((k - 1.3) / 0.4)), at = inHand(f, o, 0.72);
      return { x: lerp(at.x, h.x + (f.dirM || 1) * 7, up), y: lerp(at.y, h.y + 9, up), s: 0.72, rot: -0.75 * up * (f.dirM || 1) };
    },
    replay(f, o) { return { ...H().ownerSpot(o, 'low', f), s: 0.62 }; },
    drawFront(ctx, f, o, api) {
      const k = H().since(f, 'sip'); if (k < 0 || k > 3.4 || !o.pos) return;
      const h = headOf(o); ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const q = (k * 0.8 + i / 3) % 1; ctx.globalAlpha = 0.8 * (1 - q) * Math.min(1, k * 2); ctx.beginPath(); ctx.moveTo(h.x + (i - 1) * 6, h.y - 8 - q * 18); ctx.quadraticCurveTo(h.x + (i - 1) * 6 + 4, h.y - 14 - q * 20, h.x + (i - 1) * 6, h.y - 20 - q * 22); ctx.stroke(); }
      ctx.restore();
    },
  };

  // ---------- the tripod: set up, self-timer, a step too late ----------
  const RUN = 3.2, SET = 0.9, TIMER = 2.2, DIST = 3.2;
  const camAt = (f, o) => ({ x: (f.camX != null ? f.camX : o.x0 + (f.dirM || f.side) * 34), foot: o.foot });
  const selfie = {
    hold: 'hand',
    take(f, o) { H().over(o, 'take', f.dirM); },
    steps(f, o, api) {
      return [thanks(f),
        { beat: SET, before: () => { f.camX = o.x0 + (f.dirM || f.side) * 34; f.fx.set = api.time; H().over(o, null); } },
        { beat: 3.4, before: () => {
          f.fx.timer = api.time; const dir = -(f.dirM || f.side);
          C().cast.walkTo(o, camAt(f, o).x + dir * DIST * T, { speed: RUN, faceEnd: -dir });
          C().scene.later(o, TIMER, () => { pop(camAt(f, o).x, o.foot - 74, 'Klick!', 19, '#FFFFFF'); }); } }];
    },
    held(f, o, api) { const k = H().since(f, 'set'); if (k < 0) return inHand(f, o, 0.72); return null; },
    replay() { return null; },
    drawMid(ctx, f, o, api) {
      const set = H().since(f, 'set'); if (set < 0 && !f.seen) return;
      const q = camAt(f, o), up = f.seen && set < 0 ? 1 : ease(set / 0.4), tm = H().since(f, 'timer');
      ctx.save(); ctx.translate(q.x, q.foot); ctx.scale(1, 0.4 + 0.6 * up);
      S().PROPS.camera(ctx, api.time, { t0: tm < 0 ? null : f.fx.timer, timer: TIMER });
      ctx.restore();
    },
  };

  window.MimoCoast.handoverGags = Object.assign(window.MimoCoast.handoverGags || {}, { flagPlant, bookWrite, cocoa, selfie });
  window.MimoWorlds.register({ world: 5, setup() {} });
})();
