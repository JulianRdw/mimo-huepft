// World 5: the two default scenes of "Gipfelsturm" for the scene runner (volcano-scenes.js): a plain version that shows what the
// technique can do and is what a level gets with `opening: true`. The level designer replaces or extends them (MimoVolcano.scenes.add).
//   opening  (level 43, about 37 s) the boat lies in the shallow sea at the beach, the gangplank stands upright on the bow: the
//            dog jumps against it, it tips over onto the sand ("Rums!"), the dog runs down first, then the family walks down
//            in a line ("Zweiter!"), the filmer points up ("Da oben machen wir das Foto!"), the camera finds something big
//            dozing on the rope of the dead cable car: it wakes and lifts off; back at the beach its shadow passes, a pause,
//            then Fauch swoops low ("FAUCH!"), the pack bursts and the four parts fly off one after another in four directions
//            (one wide shot), the professor: "Ein Windstoß. Eindeutig.", the camera settles on the level's view and Mimo points
//            up. Afterwards the family stands on the beach at the start of 43
//   closing  the summit photo: the family lines up, the filmer sets the camera on its tripod with the self-timer and runs, the flash
//            goes off, the photo stays: flag, book, cocoa and tripod are there or missing, by the parts found (MimoVolcano.parts)
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const C = () => window.MimoCoast, SD = () => C().sdraw, V = () => window.MimoVolcano;
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

  // ---------- opening (level 43: the boat lies at the beach, the gangplank, the dead cable car, Fauch, the pack bursts) ----------
  // The start of level 43 is on the stern of the boat (tile 5, deck row 11); the boat lies in the shallow sea, the beach starts
  // at tile 15 three rows lower (decor shore, volcano-shore.js: its gangplank runs from the bow, 13.2 on the deck, down to the
  // sand at 17.2). The valley pylon of the cable car stands at tile 27 (6 high, its rope to 14, -6 tiles). dx/dy are px from
  // the start's feet. The camera moves, holds, moves: every move eases in and out, nothing cuts.
  const T = 32, AX = 5.5 * T, BEACH = 96, PYLON = 27;
  const tx = (tile) => tile * T + 16 - AX;          // dx of the middle of a tile
  const px = (tiles) => tiles * T - AX;             // dx of a place in tiles (not the middle of a tile)
  const PLANK = [[px(13.2), 0], [px(17.2), BEACH]];
  // who, deck place, beach place (tiles), face at the end, extra fields; they leave in this order, the first walks furthest
  const people = [['kid', 'kid', 11.7, 23.6, -1, {}], ['sp', 'sidepart', 10.9, 22.6, -1, { scarf: true }], ['jul', 'striped', 10.1, 21.6, -1, { pack: 4 }],
    ['film', 'filmer', 9.3, 20.6, -1, {}], ['prof', 'professor', 8.5, 19.6, 1, {}], ['rep', 'reporter', 7.7, 18.6, 1, {}], ['rb', 'redbeard', 6.9, 17.6, 1, {}]];
  const DOG = [12.4, 24.75];
  const WALK = 1.7, LEAVE = 4.0;                    // tiles/s down the plank, when the first one leaves
  // the rope of the valley pylon at u = 0.45, where Fauch sits (the quadratic of volcano-trail.js drawPylon), sag px pulls it down
  const ropeAt = (sag) => { const x = PYLON * T + 16, top = 14 * T - 6 * T, sx = x, sy = top - 12, ex = x + 14 * T, ey = top - 6 * T, mx = (sx + ex) / 2, my = (sy + ey) / 2 + (ex - sx) * 0.08 + sag, u = 0.45;
    return { x: (1 - u) * (1 - u) * sx + 2 * u * (1 - u) * mx + u * u * ex, y: (1 - u) * (1 - u) * sy + 2 * u * (1 - u) * my + u * u * ey }; };
  // the four parts fly off one after another in four directions, all inside one wide shot: where to (px from the pack), when
  const ITEMS = [['flag', 300, -190, 26.3], ['book', 330, -40, 27.0], ['thermos', 50, -235, 27.7], ['tripod', -330, -150, 28.4]];
  const FLY = 1.3, TWINKLE = 0.45;
  const packAt = () => ({ dx: tx(21.6) - 6, dy: BEACH - 44 });
  const K = (t, tile, dy, z) => [t, px(tile), dy, z];
  const opening = {
    length: 37.4, face: 1,
    pan: [34.2, 36.0],
    camera: [K(0, 12.7, -34, 1.05), K(3.7, 13.4, -22, 1.15),         // the boat in the sea; the plank falls
      K(10.9, 20.9, 36, 1.3), K(14.6, 20.9, 36, 1.3),                 // along the plank to the beach; the filmer points up
      [16.8, 0, 0, 1.75], [19.7, 0, 0, 1.75],                         // the rope (set in beats)
      K(21.6, 20.9, 30, 1.3), K(25.5, 20.9, 30, 1.3),                 // back at the beach: the shadow, the swoop
      K(26.3, 20.9, -14, 1.0), K(29.6, 20.9, -14, 1.0),               // wide: the four parts fly away
      K(30.6, 20.9, 36, 1.3), K(34.2, 20.9, 36, 1.3)],                // the professor explains it away; then the level's view
    cast: [...people.map(([k, who, d, b, face, f]) => ({ k, who, start: { dx: tx(d), face: 1, ...f }, end: { dx: tx(b), dy: BEACH, face, ...(k === 'jul' ? { pack: 0 } : {}), ...(k === 'sp' ? { scarf: true } : {}) } })),
      { k: 'dog', who: 'dog', start: { dx: tx(DOG[0]), face: 1 }, end: { dx: tx(DOG[1]), dy: BEACH, face: -1 } }],
    beats(S) {
      const fx = S.fx, rope = ropeAt(0), list = [];
      // the rope view: the camera keys 16.8 and 19.7 look at Fauch on the rope
      opening.camera[4] = [16.8, rope.x - AX + 10, rope.y - 11 * T - 30, 1.75]; opening.camera[5] = [19.7, rope.x - AX + 30, rope.y - 11 * T - 50, 1.7];
      // the plank stands upright on the bow; the dog trots up to it and jumps against it: it tips over onto the sand
      list.push([0, () => { fx.plank = 0; }]);
      list.push([1.2, () => S.walk('dog', px(13.0), 1.2, { faceEnd: 1 })]);
      list.push([2.0, () => S.hop('dog', px(13.0), 0, 0.4, 12)]);
      list.push([2.15, () => { fx.tip = S.t; }]);
      list.push([2.75, () => { S.pop(px(16.4), BEACH - 30, 'Rums!', { size: 22, fill: '#FFE08F', life: 1.1 }); S.api.shake(0.25); S.api.burst(S.x(px(16.8)), S.foot + BEACH - 2, 12, ['#D9C3A8', '#FFFFFF'], 90, { grav: 260, life: 0.6 }); }]);
      list.push([2.85, () => { for (const k of ['kid', 'sp']) S.e(k) && window.MimoCoast.cast.play(S.e(k), 'flinch'); }]);
      // the dog first, down the plank and off to the signpost
      list.push([3.6, () => { S.pop(px(13.6), -44, 'Wuff!', { size: 16, fill: '#FFFFFF' }); S.path('dog', [[px(13.0), 0], ...PLANK, [tx(DOG[1]), BEACH]], 3.2, { faceEnd: -1 }); }]);
      // then the family, one after another in a line, at an easy pace; the first walks furthest
      people.forEach(([k, , , b, face], i) => list.push([LEAVE + i * 0.14, () => S.path(k, [...PLANK, [tx(b), BEACH]], WALK, { faceEnd: face })]));
      list.push([7.2, () => S.say('kid', 'Zweiter!', 1.8)]);
      // the filmer points up to the summit: "Da oben machen wir das Foto!"
      list.push([11.2, () => { S.pose('film', 'point', 1); S.look('film', 60); }]);
      list.push([11.5, () => S.say('film', 'Da oben machen wir das Foto!', 3.0)]);
      list.push([14.6, () => { S.pose('film', null); S.look('film', null); S.pose('kid', 'eyes', 1); }]);
      // something big sits on the rope of the dead cable car: it opens an eye, then it lifts off (the rope jumps up)
      list.push([14.0, () => { fx.rope = 0; }]);
      list.push([17.8, () => { fx.wake = S.t; S.pop(rope.x - AX + 10, rope.y - 11 * T - 72, '!', { size: 24 }); }]);
      list.push([18.7, () => { fx.lift = S.t; S.api.noise({ lp: 400, dur: 0.8, vol: 0.04 }); }]);
      // back to the family: the shadow, a pause, then the swoop
      list.push([21.9, () => { S.pose('kid', null); fx.shadow = S.t; S.api.noise({ lp: 500, dur: 2, vol: 0.04, attack: 0.8 }); }]);
      list.push([22.8, () => { for (const k of ['kid', 'film', 'rep']) S.pose(k, 'eyes', 1); }]);
      list.push([24.4, () => { fx.swoop = S.t; }]);
      list.push([25.0, () => { S.pop(tx(22.4), BEACH - 118, 'FAUCH!', { size: 30, fill: '#F28C82' }); S.api.shake(0.4); S.api.setMood('scared', 1.2); }]);
      list.push([25.2, () => { fx.burst = S.t; S.pop(tx(21.6) + 10, BEACH - 70, 'Plopp!', { size: 18, fill: '#9ED3EE' }); for (const k of ['kid', 'sp', 'film', 'prof', 'rep', 'rb']) S.pose(k, 'duck'); S.pose('jul', 'flail'); S.set('jul', { pack: 0 }); }]);
      list.push([26.3, () => { fx.items = ITEMS.map(([item, x, y, t0]) => ({ item, x, y, t0 })); }]);
      // everybody stands up again; the professor explains it away
      list.push([30.0, () => { for (const k of ['kid', 'sp', 'film', 'rep', 'rb', 'jul']) S.pose(k, null); S.look('prof', null); }]);
      list.push([30.6, () => { S.pose('prof', 'pen'); S.e('prof') && window.MimoCoast.cast.expr(S.e('prof'), 'sure'); }]);
      list.push([31.0, () => S.say('prof', 'Ein Windstoß. Eindeutig.', 3.0)]);
      // the camera goes back to the level's own view, and there Mimo points up
      list.push([34.2, () => { S.pose('prof', null); S.e('prof') && window.MimoCoast.cast.expr(S.e('prof'), null); }]);
      list.push([35.4, () => { fx.point = S.t; S.api.bubble('Da hoch!', 'player', 1.8); S.api.setMood('happy', 1.6); }]);
      return list;
    },
    step(S) {
      const fx = S.fx, t = S.t;
      // the rope sags under him, and jumps back when he lets go
      const sag = fx.lift != null ? 22 * Math.exp(-(t - fx.lift) * 2.2) * Math.cos((t - fx.lift) * 11) : fx.rope != null ? 22 : 0;
      V().ropeAt = PYLON; V().ropeSag = sag;
      // the plank tips over, faster and faster, and bounces once on the sand (MimoVolcano.plankK, volcano-shore.js)
      if (fx.plank != null) { const q = fx.tip != null ? t - fx.tip : -1, k = q < 0 ? 0 : Math.min(1, q / 0.6); V().plankK = k < 1 ? k * k : 1 - 0.05 * Math.abs(Math.sin((q - 0.6) * 11)) * Math.exp(-(q - 0.6) * 6); }
      const j = S.e('jul'); if (j) j.packBurst = fx.burst != null && t - fx.burst < 0.7 ? 1 - (t - fx.burst) / 0.7 : 0;
      if (fx.point != null && S.api.p) { const k = t - fx.point; if (k < 1.2) { S.api.p.sy = 1 + 0.14 * Math.sin(Math.min(1, k / 0.3) * Math.PI / 2) * (1 - Math.max(0, k - 0.8) / 0.4); S.api.p.sx = 2 - S.api.p.sy; } }
    },
    draw(ctx, S, layer) {
      const fx = S.fx, t = S.t, api = S.api, X = (dx) => S.x(dx), F = V().fauchDraw;
      if (layer === 'back') {
        // Fauch on the rope, dozing; he wakes, looks down at the beach, spreads the wings and lifts off up the mountain
        if (fx.rope != null && (fx.lift == null || t - fx.lift < 2.4)) {
          const r = ropeAt(fx.lift == null ? 22 : 0);
          if (fx.lift == null) {
            const w = fx.wake != null ? Math.min(1, (t - fx.wake) / 0.25) : 0;
            ctx.save(); ctx.translate(r.x, r.y - 6); F.sit(ctx, api.time, { scale: 0.62, face: -1, blink: 1 - w, sleepy: 1 - w, look: w, wings: w > 0 ? Math.min(1, (t - fx.wake) / 0.8) * 0.6 : 0 }); ctx.restore();
          } else {
            const k = (t - fx.lift) / 2.4;
            ctx.save(); ctx.translate(r.x + k * 420, r.y - 50 - k * 300); F.fly(ctx, api.time, { scale: 0.7, face: 1, flap: 2.2, legs: 1 - k }); ctx.restore();
          }
        }
        return;
      }
      if (layer === 'front') {
        if (fx.shadow != null) {   // the shadow sweeps over the beach, the light dims
          const k = seg(t, fx.shadow, fx.shadow + 2.2), v = { x: api.cam.x, y: api.cam.y, w: api.view.w, h: api.view.h }, dim = Math.min(seg(t, fx.shadow, fx.shadow + 0.6), 1 - seg(t, fx.shadow + 1.8, fx.shadow + 2.6)) * 0.18;
          if (dim > 0) { ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = dim; ctx.fillRect(v.x - 300, v.y - 300, v.w + 600, v.h + 600); ctx.restore(); }
          if (k > 0 && k < 1) { ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.ellipse(X(lerp(tx(10), tx(30), k)), S.foot + BEACH - 2, 110, 9, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        }
        if (fx.swoop != null) {   // low over the family, left to right
          const k = seg(t, fx.swoop, fx.swoop + 1.7);
          if (k > 0 && k < 1) { ctx.save(); ctx.translate(X(lerp(tx(6), tx(34), k)), S.foot + BEACH - 96 + Math.sin(k * Math.PI) * 30); F.fly(ctx, api.time, { scale: 0.95, face: 1, flap: 2, open: k > 0.3 && k < 0.6 ? 1 : 0 }); ctx.restore(); }
        }
        for (const it of fx.items || []) {   // one after another, shrinking into the distance, a twinkle at the end
          const k = seg(t, it.t0, it.t0 + FLY), p = packAt();
          if (k >= 1) { // gone: a twinkle where it vanished
            const q = (t - it.t0 - FLY) / TWINKLE; if (q >= 1) continue;
            const r = 9 * Math.sin(q * Math.PI);
            ctx.save(); ctx.translate(X(p.dx + it.x), S.foot + p.dy + it.y); ctx.rotate(q * 1.5); ctx.fillStyle = '#FFF2B0'; ctx.beginPath();
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, l = i % 2 ? r * 0.3 : r; ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); }
            ctx.closePath(); ctx.fill(); ctx.restore(); continue;
          }
          if (k <= 0) continue;
          const x = X(p.dx + it.x * ease(k)), y = S.foot + p.dy + it.y * k - Math.sin(k * Math.PI) * 50, s = 1.9 * (1 - 0.65 * k);
          ctx.save(); ctx.translate(x, y); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 * s); g.addColorStop(0, 'rgba(255,242,176,0.75)'); g.addColorStop(1, 'rgba(255,242,176,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26 * s, 0, TAU); ctx.fill();
          ctx.rotate(Math.sin(k * 9) * 0.6); ctx.scale(s, s); SD().findIcon(ctx, it.item, api.time, 1); ctx.restore();
        }
        if (fx.point != null && api.p) {   // Mimo points up: an arrow over him, bouncing
          const k = t - fx.point, p = api.p, a = Math.min(1, k / 0.3);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x + p.w / 2, p.y - 30 - Math.abs(Math.sin(k * 4)) * 6); ctx.fillStyle = '#FFE08F'; ctx.strokeStyle = '#3B3560'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, -3); ctx.lineTo(4, -3); ctx.lineTo(4, 9); ctx.lineTo(-4, 9); ctx.lineTo(-4, -3); ctx.lineTo(-11, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      }
    },
  };

  // ---------- closing ----------
  const GROUND = 288;
  const closing = {
    length: 12, ground: GROUND,
    camera: [[0, 462, 1.6, 0.72], [12, 462, 1.6, 0.72]],
    cast: [['kid', 'kid', 300], ['sp', 'sidepart', 336], ['jul', 'striped', 372], ['prof', 'professor', 408], ['rep', 'reporter', 444], ['rb', 'redbeard', 478], ['film', 'filmer', 590]]
      .map(([k, who, x]) => ({ k, who, x, fields: { face: 1, ...(k === 'sp' ? { scarf: true } : {}) } })),
    beats(S) {
      const fx = S.fx;
      return [
        [0.5, () => { S.walk('film', 608, 2.2, { faceEnd: -1 }); }],
        [2.4, () => { fx.set = S.t; }],
        [3.2, () => { fx.timer = S.t; S.walk('film', 548, 3.4, { faceEnd: 1 }); }],
        [4.0, () => { S.say('prof', 'Ich bleibe wissenschaftlich.', 2.2); }],
        [5.4, () => { fx.flash = S.t; for (const k of ['kid', 'sp', 'jul', 'prof', 'rep', 'rb']) S.pose(k, 'hooray'); }],
        [6.0, () => { fx.photo = S.t; }],
      ];
    },
    draw(ctx, S, cam, drawCast) {
      const fx = S.fx, t = S.t, api = S.api, sd = SD(), found = V().foundParts ? V().foundParts() : {};
      // the summit: a stone floor, the sky, the crater rim behind
      const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, api.dark ? '#2B325E' : '#BFE3F2'); g.addColorStop(1, api.dark ? '#7E6489' : '#FBE3CF');
      ctx.fillStyle = g; ctx.fillRect(cam.x - 20, cam.y - 20, api.view.w / cam.z + 40, GROUND - cam.y + 20);
      ctx.fillStyle = api.dark ? '#4A3F63' : '#B7A9C6'; ctx.beginPath(); ctx.moveTo(cam.x - 20, GROUND - 40); ctx.quadraticCurveTo(300, GROUND - 120, 520, GROUND - 60); ctx.quadraticCurveTo(700, GROUND - 20, 900, GROUND - 90); ctx.lineTo(900, GROUND); ctx.lineTo(cam.x - 20, GROUND); ctx.closePath(); ctx.fill();
      ctx.fillStyle = api.dark ? '#5E5078' : '#8E7FA3'; ctx.fillRect(cam.x - 20, GROUND, api.view.w / cam.z + 40, 200);
      if (found.flag) { ctx.save(); ctx.translate(262, GROUND); sd.PROPS.flag(ctx, t, {}); ctx.restore(); } else { ctx.save(); ctx.translate(262, GROUND); sd.PROPS.flag(ctx, t, { empty: true }); ctx.restore(); }
      if (found.book) { ctx.save(); ctx.translate(222, GROUND); sd.PROPS.summitbook(ctx, t, {}); ctx.restore(); }
      const camAt = { x: 620, foot: GROUND };
      if (fx.set != null) { ctx.save(); ctx.translate(camAt.x, camAt.foot); ctx.scale(1, 0.4 + 0.6 * ease(seg(t, fx.set, fx.set + 0.4))); sd.PROPS.camera(ctx, t, { t0: fx.timer, timer: 2.2, flashAt: fx.flash }); ctx.restore(); }
      drawCast(['kid', 'sp', 'jul', 'prof', 'rep', 'rb', 'film'].map((k) => S.e(k)));
      // Mimo in the line, the thermos in the sleeper's hand when it was found
      api.drawMimo(512, GROUND, { facing: 1, hat: api.G.rewardHat });
      if (found.thermos) { const j = S.e('jul'); if (j && j.pos) { const h = C().cast.hand(j, 'r'); ctx.save(); ctx.translate(j.pos.x + h[0], j.pos.foot + h[1] - 4); ctx.scale(0.9, 0.9); sd.ICONS.thermos(ctx, t); ctx.restore(); } }
      if (!found.tripod) { ctx.save(); ctx.translate(camAt.x, camAt.foot); V().draw.stone(ctx, 0, -6, 14, 7, 0); ctx.restore(); }
      // the photo: a white card with a frame that stays on the screen (the scene's last seconds)
      if (fx.photo != null) { const k = ease(seg(t, fx.photo, fx.photo + 0.4)), w = api.view.w / cam.z, h = api.view.h / cam.z, b = 11 * k; ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cam.x, cam.y, w, b); ctx.fillRect(cam.x, cam.y + h - b * 2.2, w, b * 2.2); ctx.fillRect(cam.x, cam.y, b, h); ctx.fillRect(cam.x + w - b, cam.y, b, h); ctx.restore(); }
    },
  };

  window.MimoVolcano.scenes.add('opening', opening);
  window.MimoVolcano.scenes.add('closing', closing);
  window.MimoWorlds.register({ world: 5, setup() {} });
})();
