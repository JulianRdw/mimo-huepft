// World 5: the closing scene of "Gipfelsturm" after the fight (replaces the plain 'closing' of volcano-scenes-default.js).
// A screen script for the scene runner (volcano-scenes.js); the fight starts it once Mimo wears the horns, the door waits
// for it. One beat after the other, the family stands still in between (about 80 s, slow: a look or gesture first, then the line,
// a breath between the beats; jumping skips), version 2:
//   the summit, Fauch on his nest, the kid crouches beside the egg as its sitter: "Das Ei wackelt!" · the filmer calls everybody
//   together · it is cold up here, everybody shivers but the side parting: he hands his scarf round, and it is long enough for
//   all, "Daumen hoch!" · the filmer walks to the camera (on the tripod when it was found, else on the kid's cairn), starts the
//   self-timer and runs: this time she makes it · the egg cracks, Fünkchen hatches, looks at the kid first and sneezes a spark
//   that grills the sausage perfectly · click: the photo stays as a still (flag, summit book and steaming cocoa when found;
//   missing ones are gaps: the empty pole, a plain rock, an empty hand, without the tripod the photo is crooked) for a good
//   look, then it flies away · the filmer leafs through her old photos, real pictures of four places of the climb shown big:
//   Fauch hides on every one of them, "Er war die ganze Zeit dabei." · the professor turns his thesis board round, a heart: "These vorläufig
//   zurückgestellt." · the sleeper wakes: "Hab ich was verpasst?" · Fauch is so moved that he sneezes, and Mimo flies in a
//   high arc to the moon (world 6).
// Pure drawing on the scene clock; MimoVolcano.foundParts() decides the parts.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const C = () => window.MimoCoast, SD = () => window.MimoCoast.sdraw, V = () => window.MimoVolcano;
  const clamp = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;

  const G = 288;                                   // the ground of the summit (screen script y)
  // the group for the photo stands in two rows, nobody in front of a face: in front the egg sitter, the redbeard at his grill, the
  // dog, Mimo and the filmer (she runs back from the camera); behind, on a rock step (RISE px higher), the four tall ones with gaps
  // between them (the sleeper with his pack at the left end, its pot hangs over the dog, not over a face); the thesis board, the flag and the summit book stand at the side, the camera on its tripod far right
  const X = { FAUCH: 112, EGG: 172, KID: 198, RB: 246, DOG: 280, JUL: 306, SP: 348, REP: 390, PROF: 432, MIMO: 369, SPOT: 474, BOARD: 532, FLAG: 584, BOOK: 614, CAM: 720 };
  const RISE = 12, STEP_X = [288, 452];
  const BACK = ['jul', 'sp', 'rep', 'prof'];
  // reading time of a line: at least 1.6 s plus 0.07 s per character
  const secs = (text) => 1.6 + 0.07 * text.length;
  const LINES = { egg: 'Das Ei wackelt!', call: 'Alle zusammenrücken! Gipfelfoto!', warm: 'Kalt? Mir nicht. Hier, nehmt den Schal!', thumb: 'Daumen hoch!',
    timer: 'Selbstauslöser!', photos: 'Und jetzt meine alten Fotos.', dabei: 'Er war die ganze Zeit dabei.', thesis: 'These vorläufig zurückgestellt.', wake: 'Hab ich was verpasst?' };
  // every beat: first the look or the gesture, then (LEAD later) the line; a breath between the beats
  const LEAD = 0.6;
  const K = { WOB: 1.2, KID: 2.4, PAN: 6.2, CALL: 7.6, COLD: 12.6, WARM: 13.8, SHARE: 19.2, SHARE_KID: 20.6, SHARE_ALL: 22.0, THUMB: 23.8, WALK: 27.2, SET: 30.4, TIMER: 31.0, RUN: 31.6,
    CRACK: 33.6, HOORAY: 34.0, HATCH: 34.8, SEE: 35.6, SPARK: 36.4, FLASH: 37.2, CARD: 37.6, CARD_AWAY: 43.2,
    STACK: 44.0, LEAF: 45.2, DABEI: 58.2, STACK_OUT: 62.6, THESIS: 63.4, WAKE: 69.8, TEAR: 74.4, HA: 75.4, SNEEZE: 76.2, FLY: 76.4, MOON: 79.8, LEN: 81.6 };
  const TIMER = K.FLASH - K.TIMER;
  const ALBUM_EVERY = 3.3;                         // seconds each old photo stays on top (time to find Fauch on it)

  // comic words of the scene (drawn by the scene itself, it has its own camera); kept inside the safe part of the screen
  const pop = (fx, S, x, dy, text, o) => (fx.pops || (fx.pops = [])).push({ x, y: G + dy, text, t0: S.t, size: (o && o.size) || 20, fill: (o && o.fill) || '#F28C82', dur: (o && o.dur) || 1.8 });
  function drawPops(ctx, fx, t, cam, api) {
    const r = V().safeRect(api, true);
    for (const q of fx.pops || []) {
      const k = t - q.t0, d = q.dur; if (k < 0 || k > d) continue;
      const a = k < 0.15 ? k / 0.15 : k > d - 0.4 ? (d - k) / 0.4 : 1, sc = k < 0.15 ? 0.6 + 0.4 * k / 0.15 : 1;
      ctx.save(); ctx.font = '800 ' + q.size + 'px system-ui, sans-serif';
      const hw = ctx.measureText(q.text).width / 2 + q.size * 0.2;
      const x = Math.max(cam.x + r.x0 / cam.z + hw, Math.min(cam.x + r.x1 / cam.z - hw, q.x)), y = Math.max(cam.y + r.y0 / cam.z + q.size, q.y - k * 6);
      ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-0.06);
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.lineWidth = q.size * 0.22; ctx.strokeStyle = '#3A2E48'; ctx.strokeText(q.text, 0, 0); ctx.fillStyle = q.fill; ctx.fillText(q.text, 0, 0); ctx.restore();
    }
  }
  const parts = () => (V().foundParts ? V().foundParts() : { flag: false, book: false, thermos: false, tripod: false });
  const FAM = ['kid', 'sp', 'jul', 'prof', 'rep', 'film'];
  const COLD = ['jul', 'prof', 'rep', 'film'];
  const onStep = (x) => Math.min(1, Math.max(0, (x - STEP_X[0]) / 10), Math.max(0, (STEP_X[1] - x) / 10));

  const closing = {
    length: K.LEN, ground: G,
    camera: [[0, 196, 1.9, 0.78], [K.PAN, 196, 1.9, 0.78], [K.PAN + 1.3, 350, 1.48, 0.8], [K.WALK + 0.4, 350, 1.48, 0.8], [K.WALK + 2.6, 540, 1.48, 0.8], [K.RUN, 540, 1.48, 0.8],
      [K.RUN + 1.8, 350, 1.48, 0.8], [K.STACK, 350, 1.48, 0.8], [K.STACK + 0.8, 330, 1.5, 0.8], [K.STACK_OUT, 330, 1.5, 0.8], [K.THESIS, 380, 1.55, 0.8],
      [K.WAKE, 380, 1.55, 0.8], [K.WAKE + 1, 340, 1.5, 0.8], [K.SNEEZE, 330, 1.5, 0.8], [K.FLY + 1.8, 470, 0.72, 0.93], [K.MOON + 1.4, 500, 0.7, 0.93]],
    cast: [['rb', 'redbeard', X.RB, { face: -1 }], ['dog', 'dog', X.DOG, { face: -1 }], ['kid', 'kid', X.KID, { face: -1 }], ['sp', 'sidepart', X.SP, { face: 1, scarf: true }],
      ['jul', 'striped', X.JUL, { face: 1, pack: 4 }], ['rep', 'reporter', X.REP, { face: -1 }], ['prof', 'professor', X.PROF, { face: -1 }], ['film', 'filmer', X.SPOT, { face: -1 }]]
      .map(([k, who, x, fields]) => ({ k, who, x, fields })),
    // the four of the back row stand on the rock step (whoever walks off it comes down to the ground)
    step(S) { for (const k of BACK.concat(['film'])) { const e = S.e(k); if (e) e.foot = G - RISE * onStep(e.pos ? e.pos.x : e.x0); } },
    beats(S) {
      const fx = S.fx, found = parts(), e = (k) => S.e(k);
      fx.found = found; fx.crack = 0; fx.board = { state: 'papa' };
      const rb = e('rb'); if (rb) { C().scene.hold(rb, 'grill', { dir: -1 }); if (found.thermos) C().cast.carry(rb, 'thermos', 'r'); }
      const jul = e('jul'); if (jul) C().cast.expr(jul, 'daze');
      const say = (k, text) => S.say(k, text, secs(text));
      const scarf = (k) => { const q = e(k); if (!q) return; q.scarf = true; if (V().extraFor) q.extra = V().extraFor(q); };
      const turnSp = (d) => { const sp = e('sp'); if (sp) { sp.face = d; sp.faceEnd = d; } S.pose('sp', 'give', d); };
      return [
        // 1 the egg sitter: the egg wobbles, the kid looks, then says it
        [0.05, () => S.pose('kid', 'duck', -1)],
        [K.WOB, () => { fx.wob = S.t; }],
        [K.KID, () => { const k = e('kid'); if (k) C().cast.expr(k, 'wow'); }],
        [K.KID + LEAD, () => say('kid', LINES.egg)],
        // 2 the photo call (the camera has come over to the group)
        [K.CALL, () => S.pose('film', 'point', -1)],
        [K.CALL + LEAD, () => say('film', LINES.call)],
        [K.CALL + LEAD + secs(LINES.call), () => S.pose('film', null)],
        // 3 the summit hero: everybody shivers, he does not; the scarf goes to the professor, to the kid, then round all the others
        [K.COLD, () => { for (const k of COLD) S.pose(k, 'duck'); pop(fx, S, X.REP, -100, 'Brrr!', { size: 18, fill: '#BFE6F2' }); }],
        [K.WARM, () => S.pose('sp', 'proud')],
        [K.WARM + LEAD, () => say('sp', LINES.warm)],
        [K.SHARE, () => turnSp(1)], [K.SHARE + 0.7, () => { scarf('prof'); S.pose('prof', null); }],
        [K.SHARE_KID, () => turnSp(-1)], [K.SHARE_KID + 0.7, () => scarf('kid')],
        [K.SHARE_ALL, () => turnSp(1)], [K.SHARE_ALL + 0.6, () => { for (const k of ['jul', 'rep', 'film', 'rb']) { scarf(k); if (k !== 'rb') S.pose(k, null); } if (rb) C().scene.hold(rb, 'grill', { dir: -1 }); }],
        [K.THUMB, () => { const sp = e('sp'); if (sp) { sp.face = -1; sp.faceEnd = -1; } S.pose('sp', 'thumb', -1); }],
        [K.THUMB + LEAD, () => say('sp', LINES.thumb)],
        [K.THUMB + LEAD + secs(LINES.thumb) + 0.2, () => S.pose('sp', null)],
        // 4 the self-timer, this time she makes it; Fünkchen hatches, sees the kid first and grills the sausage
        [K.WALK, () => { S.walk('film', X.CAM - 26, 2.2, { faceEnd: -1 }); }],
        [K.SET, () => { fx.set = S.t; }],
        [K.TIMER, () => { fx.timer = S.t; say('film', LINES.timer); }],
        [K.RUN, () => { S.walk('film', X.SPOT, 4.2, { faceEnd: -1 }); }],
        [K.CRACK, () => { fx.crack = 1; }], [K.CRACK + 0.4, () => { fx.crack = 2; }], [K.CRACK + 0.8, () => { fx.crack = 3; }],
        [K.HOORAY, () => { for (const k of FAM) if (k !== 'jul' && k !== 'kid') S.pose(k, 'hooray'); fx.hooray = S.t; }],
        [K.HATCH, () => { fx.hatch = S.t; pop(fx, S, X.EGG, -40, 'Knack!', { size: 16, fill: '#FBE7C4' }); }],
        [K.SEE, () => { fx.see = S.t; S.pose('kid', 'hooray'); pop(fx, S, X.EGG + 22, -66, '♥', { size: 16, fill: '#F28C82' }); }],
        [K.SPARK - 0.15, () => pop(fx, S, X.EGG + 14, -44, 'Hatschi!', { size: 13, fill: '#FBE7C4' })],
        [K.SPARK, () => { fx.spark = S.t; }],
        [K.FLASH, () => { fx.flash = S.t; if (rb) rb.propSwap = { sausage: 'sausageGood' }; pop(fx, S, X.RB - 30, -70, 'Brutzel!', { size: 15, fill: '#FFD58A' }); }],
        // 5 the still: big for a good while, then it goes
        [K.CARD, () => { fx.card = S.t; }],
        [K.CARD_AWAY, () => { for (const k of FAM) S.pose(k, null); const k = e('kid'); if (k) C().cast.expr(k, null); S.pose('kid', 'duck', -1); }],
        // 6 the old photos: Fauch is on every one
        [K.STACK, () => { fx.stack = S.t; S.pose('film', 'read', -1); }],
        [K.STACK + LEAD, () => say('film', LINES.photos)],
        [K.DABEI - LEAD, () => { S.look('film', -12); }],
        [K.DABEI, () => say('film', LINES.dabei)],
        [K.STACK_OUT, () => { fx.stackOut = S.t; S.pose('film', null); S.look('film', null); }],
        // 7 the board turns round; the sleeper wakes
        [K.THESIS, () => { S.pose('prof', 'pen', 1); fx.board.state = 'herz'; }],
        [K.THESIS + 1.0, () => say('prof', LINES.thesis)],
        [K.THESIS + 1.0 + secs(LINES.thesis) + 0.3, () => S.pose('prof', null)],
        [K.WAKE, () => { if (jul) C().cast.expr(jul, null); S.look('jul', 2); }],
        [K.WAKE + LEAD, () => say('jul', LINES.wake)],
        // 8 the tear, the sneeze, the moon
        [K.TEAR, () => { fx.tear = S.t; }],
        [K.HA, () => pop(fx, S, X.FAUCH + 40, -150, 'Ha...', { size: 18, fill: '#F28C82', dur: K.SNEEZE - K.HA })],
        [K.SNEEZE, () => { fx.sneeze = S.t; pop(fx, S, X.FAUCH + 70, -160, 'HATSCHI!', { size: 30, fill: '#F28C82' }); for (const k of FAM.concat(['rb'])) S.pose(k, 'duck'); }],
        [K.FLY + 1.0, () => { for (const k of FAM.concat(['rb'])) S.pose(k, 'eyes', 1); }],
        [K.MOON, () => { fx.moon = S.t; }],
      ];
    },
    draw(ctx, S, cam, drawCast) {
      const fx = S.fx, t = S.t, api = S.api, found = fx.found || parts(), now = api.time;
      const tilt = found.tripod ? 0 : -0.06 * ease(seg(t, K.FLASH, K.FLASH + 0.01));
      const vw = api.view.w / cam.z, vh = api.view.h / cam.z;
      drawSky(ctx, api, cam, vw, vh, fx, t);
      drawSummit(ctx, api, cam, vw);
      // Fauch on his nest, the egg (or Fünkchen) in front of his belly
      ctx.save(); ctx.translate(X.FAUCH + 36, G); SD().PROPS.eyrie(ctx, now); ctx.restore();
      const look = fx.sneeze != null ? 0.6 : fx.wob != null && t < K.PAN ? 1 : 0.3;
      ctx.save(); ctx.translate(X.FAUCH, G); V().fauchDraw.sit(ctx, now, { face: 1, scale: 0.86, wings: 0.25, look, lookUp: fx.sneeze != null && t > K.FLY ? 1 : 0, blink: ((now + 0.4) % 3.6) < 0.14 ? 1 : 0, open: fx.sneeze != null && t < K.SNEEZE + 0.5 ? 1 : 0, lean: fx.sneeze != null ? -0.4 * Math.max(0, 1 - (t - K.SNEEZE) * 2) : fx.tear != null && t < K.SNEEZE ? 0.25 * seg(t, K.HA, K.SNEEZE) : 0, puff: fx.hooray != null && t < K.CARD ? 1 : 0, tail: 0.5 }); ctx.restore();
      if (fx.tear != null && t < K.SNEEZE + 0.4) { const q = seg(t, K.TEAR, K.TEAR + 1.4); ctx.save(); ctx.fillStyle = '#9ED3EE'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(X.FAUCH + 48, G - 108 + q * 22, 3, 4.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      drawEggOrBaby(ctx, fx, t, now);
      // the summit things at the side: the thesis board, the flag (or its empty pole), the summit book on its rock (or a plain rock)
      if (SD().PROPS.thesis) { ctx.save(); ctx.translate(X.BOARD, G); SD().PROPS.thesis(ctx, now, fx.board || { state: 'papa' }); ctx.restore(); }
      ctx.save(); ctx.translate(X.FLAG, G); SD().PROPS.flag(ctx, now, found.flag ? {} : { empty: true }); ctx.restore();
      ctx.save(); ctx.translate(X.BOOK, G); if (found.book) SD().PROPS.summitbook(ctx, now, {}); else V().draw.stone(ctx, 0, -8, 17, 8, 0); ctx.restore();
      drawCamera(ctx, fx, t, now, found);
      // the back row first (on the step), then the front row
      drawCast(BACK.map((k) => S.e(k)));
      if (S.e('jul') && S.e('jul').pos && (fx.found && t < K.WAKE)) drawZ(ctx, S.e('jul').pos, now);
      drawCast(['rb', 'dog', 'kid', 'film'].map((k) => S.e(k)));
      drawSparks(ctx, fx, t);
      if (fx.found && found.thermos && S.e('rb') && S.e('rb').pos) drawSteam(ctx, S.e('rb'), now);
      drawMimo(ctx, api, fx, t);
      // the photo: the frozen picture is taken before the comic words, so it shows only the scene; then the flash, the
      // picture as a card
      if (fx.flash != null && !fx.shot && t >= fx.flash) fx.shot = capture(ctx);
      drawPops(ctx, fx, t, cam, api);
      const fl = fx.flash == null ? 0 : 1 - seg(t, fx.flash, fx.flash + 0.5);
      if (fl > 0) { ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = fl * 0.9; ctx.fillRect(cam.x - 10, cam.y - 10, vw + 20, vh + 20); ctx.restore(); }
      if (fx.shot && fx.card != null) drawCard(ctx, api, cam, fx, t, tilt);
      // the old photos are painted while the card is up (fresh figures, nothing on the stage changes)
      if (fx.card != null && t > K.CARD + 0.8 && !fx.album) fx.album = album(S);
      if (fx.stack != null) drawStack(ctx, api, cam, fx, t);
    },
  };

  function drawSky(ctx, api, cam, vw, vh, fx, t) {
    const d = api.dark, g = ctx.createLinearGradient(0, cam.y, 0, G);
    g.addColorStop(0, d ? '#232A55' : '#9FD0EC'); g.addColorStop(1, d ? '#6E5A86' : '#FCE6D2');
    ctx.fillStyle = g; ctx.fillRect(cam.x - 20, cam.y - 20, vw + 40, G - cam.y + 40);
    // the moon: there all the time, a little brighter at the end
    const mx = 760, my = -150, glow = 0.35 + 0.5 * (fx.moon != null ? ease(seg(t, fx.moon, fx.moon + 0.8)) : 0);
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 90); mg.addColorStop(0, 'rgba(255,248,220,' + glow + ')'); mg.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 90, my - 90, 180, 180);
    ctx.fillStyle = d ? '#F4EDD2' : '#FFF8E2'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,178,150,0.45)'; for (const [x, y, r] of [[-10, -8, 7], [12, 6, 5], [-4, 14, 4], [14, -14, 3.5]]) { ctx.beginPath(); ctx.arc(mx + x, my + y, r, 0, TAU); ctx.fill(); }
    // the sea of clouds below the summit
    ctx.fillStyle = d ? '#7A6C96' : '#FFFFFF';
    for (let i = 0; i < 14; i++) { const x = -120 + i * 80 + Math.sin(i * 1.7) * 20, r = 40 + (i % 3) * 14; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x, G - 18 + (i % 2) * 6, r, r * 0.42, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawSummit(ctx, api, cam, vw) {
    const d = api.dark;
    ctx.fillStyle = d ? '#4A3F63' : '#8E7FA3';
    ctx.beginPath(); ctx.moveTo(-200, G + 2); ctx.quadraticCurveTo(80, G - 34, 300, G - 22); ctx.quadraticCurveTo(520, G - 12, 720, G - 30); ctx.quadraticCurveTo(820, G - 40, 1000, G + 2); ctx.closePath(); ctx.fill();
    // the summit cross on its knoll at the right
    ctx.fillStyle = d ? '#3E3456' : '#7A6C92'; ctx.beginPath(); ctx.ellipse(560, G - 18, 54, 18, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = d ? '#7A5A44' : '#9A6E45'; ctx.fillRect(556, G - 126, 9, 110); ctx.fillRect(536, G - 104, 49, 8);
    ctx.strokeStyle = '#E2C26A'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(560.5, G - 100, 9, 0, TAU); ctx.stroke();
    // the rock step of the back row
    ctx.fillStyle = d ? '#54476E' : '#A496B8'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(STEP_X[0] - 6, G - RISE, STEP_X[1] - STEP_X[0] + 12, RISE + 6, 6); else ctx.rect(STEP_X[0] - 6, G - RISE, STEP_X[1] - STEP_X[0] + 12, RISE + 6); ctx.fill();
    ctx.fillStyle = d ? '#66588A' : '#BCAFCD'; ctx.fillRect(STEP_X[0] - 2, G - RISE, STEP_X[1] - STEP_X[0] + 4, 3);
    ctx.fillStyle = d ? '#5E5078' : '#B7A9C6'; ctx.fillRect(cam.x - 20, G, vw + 40, 260);
    ctx.fillStyle = d ? '#6C5E88' : '#C9BCD6'; ctx.fillRect(cam.x - 20, G, vw + 40, 4);
  }
  function drawEggOrBaby(ctx, fx, t, now) {
    const named = C().named; if (!named) return;
    if (fx.hatch == null) {
      const wob = fx.wob == null ? 0 : (0.5 + 0.5 * Math.sin((t - fx.wob) * 1.3)) * 0.18 * Math.sin((t - fx.wob) * 11);
      ctx.save(); ctx.translate(X.EGG, G - 4); ctx.rotate(wob); named.egg.draw(ctx, { crack: fx.crack || 0, scale: 1.35, phase: 0.2, sneeze: false }, { x: 0, foot: 0 }, now); ctx.restore();
      return;
    }
    const k = seg(t, fx.hatch, fx.hatch + 0.5);
    // the two halves of the shell fall aside, Fünkchen sits up, blinks, sneezes
    ctx.save(); ctx.fillStyle = '#FCEBD2'; ctx.strokeStyle = 'rgba(58,46,72,0.4)'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(X.EGG + s * (6 + 10 * k), G - 4); ctx.rotate(s * 0.9 * k); ctx.beginPath(); ctx.ellipse(0, -10, 11, 13, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    named.baby.draw(ctx, { scale: 1.25 * (0.7 + 0.3 * k), phase: 0.3, sneeze: false }, { x: X.EGG, foot: G - 4, face: 1, hop: Math.sin(k * Math.PI) * 8 }, now);
  }
  // the spark from Fünkchen's nose to the sausage (it sneezes towards the redbeard on the left)
  function drawSparks(ctx, fx, t) {
    if (fx.spark == null) return;
    const k = seg(t, fx.spark, fx.flash), x0 = X.EGG - 14, y0 = G - 30, x1 = X.RB - 28, y1 = G - 50;
    if (k > 0 && k < 1) { const x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 26; ctx.save(); ctx.fillStyle = '#FFD58A'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); ctx.restore(); }
    if (t > fx.flash && t < fx.flash + 1.4) { const q = seg(t, fx.flash, fx.flash + 1.4); ctx.save(); ctx.globalAlpha = 1 - q; ctx.fillStyle = '#FFE9A8'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.arc(x1 + Math.cos(a) * q * 16, y1 + Math.sin(a) * q * 16, 2, 0, TAU); ctx.fill(); } ctx.restore(); }
  }
  function drawCamera(ctx, fx, t, now, found) {
    if (fx.set == null) return;
    const up = ease(seg(t, fx.set, fx.set + 0.5));
    ctx.save(); ctx.translate(X.CAM, G);
    if (!found.tripod) { SD().PROPS.cairn(ctx, now, { size: 3 }); ctx.translate(0, -26); }
    ctx.scale(-1, 0.3 + 0.7 * up); SD().PROPS.camera(ctx, now, { rock: !found.tripod, t0: fx.timer, timer: TIMER, flashAt: fx.flash });
    ctx.restore();
  }
  function drawSteam(ctx, e, now) {
    const h = C().cast.hand(e, 'r'); if (!h) return;
    for (let i = 0; i < 3; i++) { const q = (now * 0.6 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 0.6 * (1 - q); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(e.pos.x + h[0] + Math.sin(q * 6 + i) * 3, e.pos.foot + h[1] - 22 - q * 18, 2.5 + q * 3, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function drawZ(ctx, pos, now) {
    ctx.save(); ctx.fillStyle = '#8E8CA3'; ctx.font = '700 11px system-ui, sans-serif';
    for (let i = 0; i < 2; i++) { const q = (now * 0.4 + i / 2) % 1; ctx.globalAlpha = Math.sin(q * Math.PI); ctx.fillText('z', pos.x + 10 + q * 10, pos.foot - 60 - q * 16); }
    ctx.restore();
  }
  // Mimo in the line; after the sneeze a high arc up to the moon, small at the end, then a twinkle
  function drawMimo(ctx, api, fx, t) {
    const hat = api.G.rewardHat;
    if (fx.sneeze == null || t < K.FLY) { api.drawMimo(X.MIMO, G, { facing: -1, hat }); return; }
    const k = seg(t, K.FLY, K.MOON), e = ease(k), x = lerp(X.MIMO, 760, e), y = lerp(G, -150, k) - Math.sin(k * Math.PI) * 140, s = 1 - 0.85 * e;
    if (k < 1) {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFFFFF'; for (let i = 1; i < 6; i++) { const q = Math.max(0, k - i * 0.03), qx = lerp(X.MIMO, 760, ease(q)), qy = lerp(G, -150, q) - Math.sin(q * Math.PI) * 140; ctx.beginPath(); ctx.arc(qx, qy - 10, 3 * (1 - i / 6) + 1, 0, TAU); ctx.fill(); } ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * TAU * 1.5); api.drawMimo(0, 12 * s, { facing: 1, hat, scale: Math.max(0.15, s) }); ctx.restore();
    } else if (t < K.MOON + 1.2) {
      const q = seg(t, K.MOON, K.MOON + 1.2); ctx.save(); ctx.translate(760, -150); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#FFF2B0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + q; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * (14 + q * 20), Math.sin(a) * (14 + q * 20)); ctx.stroke(); }
      ctx.restore();
    }
  }
  // the still: the frame at the click, copied from the canvas once
  function capture(ctx) {
    if (typeof document === 'undefined') return null;
    const src = ctx.canvas, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    try { c.getContext('2d').drawImage(src, 0, 0); } catch (_) { return null; }
    return c;
  }
  // the card: big in the middle (inside the safe part of the screen) for a good look, then it flies up and away
  function drawCard(ctx, api, cam, fx, t, tilt) {
    const vw = api.view.w, vh = api.view.h, r = V().safeRect(api, true), inK = ease(seg(t, fx.card, fx.card + 0.6)), away = ease(seg(t, K.CARD_AWAY, K.CARD_AWAY + 0.7));
    if (away >= 1) return;
    const bw = Math.min((r.x1 - r.x0) * 0.86, (r.y1 - r.y0 - 4) / 0.8), s = lerp(1, bw / vw, inK), w = vw * s, h = vh * s, b = 10 * Math.max(s, 0.6);
    const cx = vw / 2, cy = lerp(vh / 2, (r.y0 + r.y1) / 2 - 1.3 * b, inK) - away * (vh * 0.8);
    ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(1 / cam.z, 1 / cam.z);
    ctx.fillStyle = 'rgba(38,35,58,' + 0.45 * inK * (1 - away) + ')'; ctx.fillRect(0, 0, vw, vh);
    ctx.translate(cx, cy); ctx.rotate(lerp(0, -0.03, inK) + tilt);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2 - b + 5, -h / 2 - b + 6, w + 2 * b, h + 3.6 * b);
    ctx.fillStyle = '#FFFDF6'; ctx.fillRect(-w / 2 - b, -h / 2 - b, w + 2 * b, h + 3.6 * b);
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); ctx.rotate(tilt * 1.5); ctx.drawImage(fx.shot, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12); ctx.restore();
    ctx.fillStyle = '#6C5E88'; ctx.font = 'italic 600 ' + Math.round(15 * Math.max(s, 0.7)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Gipfel, 2.000 m', 0, h / 2 + b * 1.75);
    ctx.restore();
  }

  // the old photos: real pictures of four places of the climb (volcano-photos.js), Fauch hides on every one
  function album(S) {
    const P = V().photos; if (!P) return null;
    const dog = S.e('dog'), list = P.ALBUM.map((a) => ({ pic: P.render({ ...a, dog: a.dog ? [a.dog[0], a.dog[1], dog] : null }), caption: a.caption }));
    return list.every((q) => q.pic) ? list : null;
  }
  // big on the left of the screen, inside the safe part: the pile comes in, the filmer leafs through it (the top picture
  // slides off to the left, the next one lies under it), every one stays ALBUM_EVERY seconds
  function drawStack(ctx, api, cam, fx, t) {
    const P = V().photos, pics = fx.album; if (!P || !pics) return;
    const inK = ease(seg(t, fx.stack, fx.stack + 0.6)), outK = fx.stackOut == null ? 0 : ease(seg(t, fx.stackOut, fx.stackOut + 0.6)), a = inK * (1 - outK); if (a <= 0) return;
    const r = V().safeRect(api, true), w0 = Math.min((r.x1 - r.x0) * 0.47, (r.y1 - r.y0 - 6) / (P.outer(100).h / 100)), o = P.outer(w0);
    const cx = r.x0 + o.w / 2 + 6, cy = (r.y0 + r.y1) / 2 + (1 - inK) * 50 + outK * 60;
    const k = Math.max(0, t - K.LEAF), n = pics.length, page = Math.min(n - 1, Math.floor(k / ALBUM_EVERY)), local = k - page * ALBUM_EVERY;
    const off = page < n - 1 ? ease((local - (ALBUM_EVERY - 0.5)) / 0.5) : 0;
    ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(1 / cam.z, 1 / cam.z); ctx.globalAlpha = a;
    for (let i = Math.min(n - 1, page + 2); i > page; i--) P.polaroid(ctx, pics[i].pic, cx + (i - page) * 3, cy - (i - page) * 2, w0, { caption: pics[i].caption, rot: (i % 2 ? 0.025 : -0.02) });
    P.polaroid(ctx, pics[page].pic, cx - off * (o.w * 0.9), cy - off * 10, w0, { caption: pics[page].caption, rot: -0.02 - off * 0.35, alpha: 1 - off * 0.8 });
    ctx.restore();
  }

  window.MimoVolcano.scenes.add('closing', closing);
  window.MimoWorlds.register({ world: 5, setup() {} });
})();
