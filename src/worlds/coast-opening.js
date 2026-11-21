// World 4: the opening scene before level 30 (Sandburg), about 33 seconds, one continuous camera.
// The beach lies LEFT of the level's start, inside the level's own map (a shelf of sand with ankle-deep sea, tiles in the map).
// The family is part of the level: after the scene (and on every later start, restart and respawn) they stand where the
// scene left them, alive: heads follow Mimo, the kid digs and copies jumps, the reporter waves, the dog digs and wanders,
// the sleeper sleeps. If Mimo walks left out of the starting view he finds them there.
//   Arrival   the dog and the kid run ahead ("Ich zuerst!"), the others walk in at a natural pace, the redbeard pulls the cart.
//   Unloading the umbrella flies off the cart and pops open, the mattress lands, a towel is shaken out.
//   Salty     the reporter runs into the sea and straight back: "Ih, das ist ja salzig!" The filmer films her, laughing.
//   The theft a big pink arm (Käpt'n Krake's colours) rises behind her, looks around, freezes when she laughs, wraps the
//             handle of the cart and pulls it under: "Gluck!" The gull on her post flaps: "Ich hab’s gesehen!"
//   Nobody    the sleeper yawns and lies down, the professor writes "Tag eins. Alles ruhig.", a beat of silence, then the
//             redbeard turns: "Wo ist der Bollerwagen?"
//   Mimo      the camera pans to Mimo, he turns to us, blinks twice: he saw it. The level begins on the spot.
// Built on the live family figures (coast-cast.js) and the arm of coast-thief.js. Every motion is a function of the game
// time since the scene began. The scene plays once (flag in the browser's storage), jumping skips it, never under test
// automation (navigator.webdriver) unless MimoCoast.forceOpening is set. A level asks for it with `opening: true`.
// Geometry: everything is measured from L0, 940 px left of Mimo's start; the map of the level has the sea shelf and the
// beach plateau there (coast-levels.js, "Sandburg": 28 columns added on the left, plateau from column 11).
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, KEY = 'mimo.coast.opening', LEN = 34.0, PAN = [29.9, 32.7];
  const C = () => window.MimoCoast, ENV = () => window.MimoCoast.storyEnv, SD = () => window.MimoCoast.sdraw;
  const KIT = () => window.MimoCoast.castKit, CD = () => window.MimoCoast.castDraw, TH = () => window.MimoCoast.thief, SC = () => window.MimoCoast.scene;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (_) { return false; } };
  const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch (_) { /* no storage: it plays once per session */ } };
  const BEACH = 9 * T, WY = BEACH + 16, SHORE = 11 * T, SHELF = BEACH + T; // plateau top, water line, where the plateau ends, sea shelf
  const BACK = 940;                                                         // L0 lies this far left of Mimo's start
  // where the people stand at the end (px right of L0), and where they come from (px right of Mimo)
  const FIN = { rep: 262, kid: 292, film: 392, dog: 418, rb: 462, st: 486, prof: 526 };
  const START = { dog: 100, kid: 75, rep: 50, film: 45, rb: 70, st: 95, prof: 120 };
  const CART = { wait: 318, park: 348, drag: 196 }, ARM_X = 225, UMB = 440, MAT = 486, TOWEL = 508, POST = 70;
  // what the family says near them once the scene is over (one time per start)
  // (through the story director: one after the other, each only while its speaker is on screen)
  const LINES = [['gull', 'Ich hab’s gesehen!', 3.5], ['rb', 'Wo ist der Bollerwagen?', 3.5]];
  let op = null, sessionSeen = false;

  function init(L, info) {
    const def = info.def || {};
    if (info.reason === 'respawn' && op && op.cast) return;           // a respawn keeps the family where it is
    op = null;
    if (!def.opening || info.boss || !L.start) return;
    const S = (L.start.x + 0.5) * T;
    op = { S, L0: S - BACK, pending: false, on: false, t: 0, after: false, cast: null, lines: {} };
    if (info.reason === 'load' && !sessionSeen && !seen() && !(navigator.webdriver && !C().forceOpening)) {
      op.pending = true;
      // the level hint of a phone pops up after the scene, not over it (it pops when its text changes)
      const h = typeof document !== 'undefined' && document.getElementById('hint');
      if (h) { op.hint = h.innerHTML; h.innerHTML = ''; }
    }
  }
  function restoreHint() { const h = op && op.hint != null && typeof document !== 'undefined' && document.getElementById('hint'); if (h) { h.innerHTML = op.hint; op.hint = null; } }

  // ---------- the place ----------
  const X = (off) => op.L0 + off;
  const gy = (x) => (x >= SHORE ? BEACH : SHELF);

  // ---------- the people ----------
  function person(who, x, extra) {
    const e = ENV().makeEntry({ who, x: 0, y: 8, ...extra }, 700 + Object.keys(op.cast).length);
    e.x = e.x0 = x; e.op = true; return e;
  }
  function spawnCast(fin) { // fin: the people stand at their final places (later starts), otherwise at their start
    op.cast = {}; op.cart = { x: 0, left: false }; op.items = []; op.gull = null;
    const at = (k) => (fin ? X(FIN[k]) : op.S + START[k]);
    for (const [k, who, ex] of [['dog', 'dog', { tag: 'odog' }], ['kid', 'kid', {}], ['rep', 'reporter', {}], ['film', 'filmer', {}], ['rb', 'redbeard', {}], ['st', 'striped', {}], ['prof', 'professor', {}]]) op.cast[k] = person(who, at(k), ex);
    C().cast.carry(op.cast.kid, 'spade', 'r');
    op.cart.x = fin ? X(CART.park) : op.S + START.rb + 30;
  }
  const walk = (k, off, speed, o) => C().cast.walkTo(op.cast[k], off < 2000 ? X(off) : off, { speed, ...(o || {}) });
  // walk so that the figure arrives at scene second `tArrive` (the speed follows from the distance)
  function walkBy(k, off, tArrive) {
    const e = op.cast[k], from = e.pos ? e.pos.x : e.x0, left = Math.max(0.5, tArrive - op.t);
    return walk(k, off, Math.abs(X(off) - from) / (left * T));
  }
  const say = (k, text, secs) => C().cast.say(op.cast[k], text, secs);
  const hold = (k, pose, dir) => SC().hold(op.cast[k], pose, dir ? { dir } : null);
  const look = (k, dx) => C().cast.look(op.cast[k], dx);
  function throwItem(kind, off, o) { // the redbeard throws something off the cart: it flies in an arc and lands
    const from = { x: op.cart.x - 6, y: gy(op.cart.x) - 30 };
    op.items.push({ kind, t0: api.time, dur: 0.9, from, to: { x: X(off) }, open: o && o.open, flat: o && o.flat });
  }
  function landed(kind, off, o) { op.items.push({ kind, t0: api.time - 20, dur: 0.9, from: { x: X(off), y: 0 }, to: { x: X(off) }, open: o && o.open, flat: o && o.flat }); }

  // the living end state: the same for the scene's last second and for every later start
  function settle() {
    const c = op.cast;
    for (const k of Object.keys(c)) { c[k].over = null; c[k].lookDx = null; }
    Object.assign(c.kid, { act: 'work', face: -1, copy: true, five: true, pose: null });
    Object.assign(c.rep, { act: 'wave', pose: 'mic', poseOpts: { dir: 1 }, face: 1 });
    Object.assign(c.film, { act: 'pose', pose: 'cam', poseOpts: { dir: -1 }, face: -1, films: true });
    Object.assign(c.prof, { act: 'grade', face: -1 });
    Object.assign(c.rb, { act: 'pose', pose: 'point', poseOpts: { dir: -1 }, face: -1 });
    Object.assign(c.dog, { act: 'dig', face: -1, carry: null }); c.dog.mv = null; c.dog.x0 = c.dog.pos ? c.dog.pos.x : X(FIN.dog);
    c.dog.home = c.dog.x0; c.dog.nextT = api.time + 4;
    op.lie = true; op.towel = op.towel || api.time - 20; op.cart.left = true; op.cartGone = true;
    if (!op.items.length) { landed('umbrella', UMB, { open: true }); landed('mattress', MAT, { flat: true }); }
    op.after = true; op.on = false;
    C().cast.look(c.rb, null);
  }
  function setup() {
    const V = api.view.w, end = { x: api.cam.x, y: api.cam.y };
    op.V = V; op.end = end; op.T0 = api.time; spawnCast(false);
    op.beats = beats().sort((a, b) => a[0] - b[0]);
    if (api.p) api.p.facing = -1;
  }

  // the script: [seconds, what happens]. Times are the beats; the figures walk at their own natural speed in between.
  function beats() {
    const c = op.cast;
    return [
      // arrival: the dog and the kid run ahead, the grown-ups walk and arrive together at about 9 s
      [0, () => { walk('dog', FIN.dog, 3.4); walkBy('film', FIN.film, 9.4); walkBy('rb', CART.wait, 9.2); walkBy('st', FIN.st + 20, 9.6); walkBy('prof', FIN.prof, 9.8); walkBy('rep', SHORE - X(0) - 6, 8.6); }],
      [0.4, () => walk('kid', FIN.kid, 2.5)],
      [0.9, () => say('kid', 'Ich zuerst!', 2.4)],
      [6, () => { c.dog.act = 'dig'; c.dog.face = -1; }],
      [7.6, () => { hold('kid', 'pat', -1); }],
      // unloading (the redbeard has arrived with the cart)
      [9.2, () => { look('rb', 60); C().cast.play(c.rb, 'throw', { dir: 1 }); }], [9.65, () => throwItem('umbrella', UMB, { open: true })],
      [10.4, () => C().cast.play(c.rb, 'throw', { dir: 1 })], [10.85, () => throwItem('mattress', MAT, { flat: true })],
      [11.9, () => { look('rb', null); op.cart.left = true; op.cart.x0 = op.cart.x; walk('rb', FIN.rb, 1.5); }],
      [10, () => hold('prof', 'write', -1)], [10.8, () => hold('film', 'cam', -1)], [10.2, () => { hold('st', 'fan'); op.towel = api.time; }], [12, () => hold('st', null)],
      [12.8, () => hold('rb', 'pat', -1)],
      // salty: into the sea and straight out again
      [8.7, () => say('rep', 'Ab ins Wasser!', 2.4)], [9.5, () => walk('rep', 190, 3.0)],
      [10.7, () => { hold('rep', 'hop'); say('rep', 'Ih, das ist ja salzig!', 2.8); }],
      [12.4, () => { hold('rep', null); walk('rep', FIN.rep, 1.1); }],
      [12.1, () => hold('rep', 'hop')],
      [12.4, () => say('film', 'Hahaha! Nochmal!', 2.4)],
      [14, () => hold('rep', 'mic', 1)], [14.8, () => say('rep', 'Live vom Strand!', 2.4)],
      // the theft (the arm itself is drawn from the time); the gull
      [19.9, () => { op.gullT = api.time; }], [20.2, () => api.bubble('Ich hab’s gesehen!', op.gull, 2.6)],
      // nobody listens
      [22, () => { hold('st', null); say('st', 'Uaah.', 2.2); }], [22.3, () => walk('st', MAT, 1.0)], [23.8, () => { op.lie = true; }],
      [23.8, () => { hold('prof', 'write', -1); say('prof', 'Tag eins. Alles ruhig.', 2.6); }],
      [26.8, () => { hold('rb', null); SC().doubleTake(c.rb, X(CART.park), 'Wo ist der Bollerwagen?', { pose: 'point', until: 3.4, secs: 3.0 }); }],
      [31.0, () => { if (api.p) { api.p.facing = 1; api.p.mood = 'scared'; api.p.moodT = 99; api.p.sx = 0.88; api.p.sy = 1.16; } }],
      [31.35, () => { if (api.p) { api.p.sx = 1; api.p.sy = 1; } }], [32.0, () => { if (api.p) api.p.mood = null; }],
      [32.2, () => blink()], [32.65, () => blink()], [33.0, () => { if (api.p) api.floater(api.p.x + api.p.w / 2, api.p.y - 20, '!', api.P.mimoInk); }],
    ];
  }
  const blink = () => { if (api.p) { api.p.blinkT = 0.13; op.blinkEnd = api.time + 0.13; } };

  function finish() {
    if (!op) return;
    markSeen(); sessionSeen = true; op.pending = false; api.cine.end(); restoreHint();
    settle();
    if (api.p) { api.p.mood = null; api.p.blinkT = 0; }
    api.bubble('Ich hab’s auch gesehen.', 'player', 2.8);
  }

  // ---------- update ----------
  const mimoNear = (pos, tiles) => { const p = api.p; return !!p && api.state === 'play' && Math.abs(p.x + p.w / 2 - pos.x) < tiles * T && Math.abs(p.y + p.h - pos.foot) < 4 * T; };
  function dogWander(e) { // after the scene: digs at home, trots a few steps away, sniffs, comes back
    const t = api.time;
    if (e.mv && t < e.mv.t0 + Math.abs(e.mv.tx - e.mv.fx) / (e.mv.speed * T)) return;
    if (t < e.nextT) return;
    const away = Math.abs((e.pos ? e.pos.x : e.x0) - e.home) < 8;
    e.act = away ? null : 'dig';
    C().cast.walkTo(e, away ? e.home + (api.hash(Math.round(t), 3) < 0.5 ? -1 : 1) * (50 + api.hash(Math.round(t), 5) * 40) : e.home, { speed: 1.2 });
    e.nextT = t + 5 + api.hash(Math.round(t), 7) * 4 + (away ? 2.5 : 0);
    if (!away) e.act = null;
  }
  function stepPeople(dt) {
    const e0 = ENV(), t = api.time;
    for (const k of Object.keys(op.cast)) {
      const e = op.cast[k], pos = e0.position(e, t);
      pos.foot = gy(pos.x);
      if (k === 'rb' && !op.cart.left) op.cart.x = pos.x + 30;
      e.pos = pos; e.cx = pos.x; e.foot = pos.foot; e.anchor.x = pos.x; e.anchor.y = pos.foot - e.top - 2;
      if (e.tl && e.tl.length) while (e.tl.length && t >= e.tl[0].at) e.tl.shift().fn();
      if (op.after) e.near = mimoNear(pos, 6);
      if (e.who === 'dog') {
        if (op.after) { dogWander(e); if (e.mv && pos.running === false && e.act == null && !e.mv.fx) e.act = 'dig'; if (!pos.running && e.act == null) e.act = 'dig'; }
        C().dogUpdate(e, dt, pos); continue;
      }
      if (k === 'st' && op.lie) {   // asleep on the mattress: still a live figure (a later start never walked him there)
        const pp = C().castKit.entryPuppet(e);
        if (pp) pp.step(dt, pos.x, { idle: false });
        continue;
      }
      KIT().stepEntry(e, dt, pos, CD().poseFor(e, e.near), e0.onScreen(pos.x, pos.foot, 120));
    }
    if (op.after) afterExtras();
  }
  function afterExtras() { // the sleeper snores, the family speaks up once when Mimo comes close
    const e = op.cast.st, t = api.time;
    const n = Math.floor(t / 2.6);
    if (n !== op.zN) { if (op.zN != null && e.pos && ENV().onScreen(e.pos.x, e.pos.foot, 80)) api.floater(X(MAT) - 26, BEACH - 34, n % 2 ? 'Z' : 'Zz', '#8E8CA3'); op.zN = n; }
    if (api.state !== 'play' || !api.p) return;
    for (const [k, text, r] of LINES) {
      if (op.lines[k]) continue;
      const anchor = k === 'gull' ? op.gull : op.cast[k].anchor, pos = k === 'gull' ? { x: X(POST), foot: BEACH } : op.cast[k].pos;
      if (anchor && pos && mimoNear(pos, r)) { op.lines[k] = true; C().director.say(k === 'gull' ? anchor : op.cast[k], text, { prio: 'gag' }); }
    }
  }
  function update(dt) {
    if (!op) return;
    if (op.pending && api.state === 'play' && api.cine.begin()) { op.pending = false; op.on = true; op.t = 0; setup(); }
    if (!op.on) {
      if (!op.cast && !op.pending) { spawnCast(true); settle(); }       // a start without the scene: the family stands there
      if (op.after && op.cast) stepPeople(dt);
      return;
    }
    op.t += dt;
    const s = op.t;
    while (op.beats.length && s >= op.beats[0][0]) op.beats.shift()[1]();
    if (op.blinkEnd && api.time >= op.blinkEnd && api.p) { api.p.blinkT = 0; op.blinkEnd = 0; }
    stepPeople(dt);
    // one camera, no cut: it follows the family down the beach, closes in on the shore and at the end widens and pans to Mimo
    const cam = camAt(s); api.cine.camera(cam.x, cam.y, cam.z);
    if ((api.cine.skipRequested() && s > 0.25) || s > LEN) finish();
  }

  // ---------- the camera ----------
  // keys: [scene seconds, centre (px right of L0), zoom, where the beach line sits (share of the visible height)];
  // between two keys the camera eases. The last key is the level's own camera.
  const CAM = [[0, 860, 1.5, 0.76], [2.5, 800, 1.5, 0.76], [8.5, 440, 1.6, 0.74], [10.5, 360, 1.9, 0.72], [12.5, 320, 2.1, 0.70], [21.4, 330, 2.1, 0.70],
    [23.4, 420, 1.9, 0.72], [25.4, 450, 1.8, 0.74], [PAN[0], 450, 1.8, 0.74]];
  function camAt(s) {
    const V = api.view.w, H = api.view.h, endG = (BEACH - op.end.y) / H;
    const keys = [...CAM.map(([t, f, z, g]) => ({ t, c: X(f), z, g })), { t: PAN[1], c: op.end.x + V / 2, z: 1, g: endG }];
    let i = 0; while (i < keys.length - 1 && s >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)], k = b === a ? 0 : ease(seg(s, a.t, b.t));
    const z = lerp(a.z, b.z, k), c = lerp(a.c, b.c, k), g = lerp(a.g, b.g, k);
    return { x: c - V / (2 * z), y: BEACH - g * H / z, z };
  }

  // ---------- the picture ----------
  const ARM_T = { RISE: 13.0, UP: 14.8, FREEZE: [15.8, 16.8], GRAB: 17.7, PULL: 18.3, GONE: 20.1 };
  function armState(s) {
    const a = ARM_T, b = { x: X(ARM_X), y: WY + 6 };
    if (s < a.RISE || s > a.GONE + 0.9) return null;
    const handle = { x: op.cart.x0 - 43, y: gy(op.cart.x0) - 30 }, out = { b, ring: Math.min(1, (s - a.RISE) / 0.6) * (1 - seg(s, a.GONE, a.GONE + 0.9)) };
    if (s > a.GONE) return out;
    const hover = { x: handle.x - 6, y: handle.y - 46 };
    let tip, curl = 0;
    if (s < a.UP) { const q = ease(seg(s, a.RISE, a.UP)); tip = { x: lerp(b.x, hover.x - 30, q), y: lerp(b.y, hover.y - 18, q) }; }
    else if (s < a.FREEZE[0]) { const q = seg(s, a.UP, a.FREEZE[0]); tip = { x: hover.x - 30 + q * 30 + Math.sin(q * TAU) * 12, y: hover.y - 18 + q * 18 }; } // looks around
    else if (s < a.FREEZE[1]) tip = { x: hover.x, y: hover.y };                        // the reporter laughs: the arm holds still
    else if (s < a.GRAB) { const q = ease(seg(s, a.FREEZE[1], a.GRAB)); tip = { x: lerp(hover.x, handle.x, q), y: lerp(hover.y, handle.y - 4, q) }; }
    else if (s < a.PULL) { curl = seg(s, a.GRAB, a.PULL); tip = { x: handle.x, y: handle.y - 4 }; }
    else { curl = 1; tip = { x: handle.x, y: handle.y - 4 }; }
    out.tip = tip; out.curl = curl;
    return out;
  }
  function cartAt(s) { // where the cart is: behind the redbeard, parked, then dragged into the water and under
    const c = op.cart;
    if (!c.x0 || s < ARM_T.PULL) return { x: c.x, y: gy(c.x), rot: 0, sink: 0 };
    const q = seg(s, ARM_T.PULL, ARM_T.GONE), qq = q * q, x = lerp(c.x0, X(CART.drag), qq), y = gy(x);
    return { x, y: y - Math.max(0, 1 - qq * 4) * 0 + Math.max(0, qq - 0.55) * 60, rot: -0.22 * Math.min(1, q * 3), sink: qq };
  }
  function drawCart(ctx, x, y, rot, rolled, load) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); SD().cart(ctx, rolled, load); ctx.restore(); }
  function drawSea(ctx) { // the sea over the shelf and the gull's post; the tiles of the map are the sand
    const cam = api.cam, v = api.view, x0 = Math.floor(cam.x / 8) * 8 - 8, x1 = Math.min(SHORE, cam.x + v.w + 8), bot = cam.y + v.h + 4, W = api.W;
    if (x1 <= x0) return;
    const g = ctx.createLinearGradient(0, WY, 0, WY + 120); g.addColorStop(0, W.waterTop || '#9BD8E2'); g.addColorStop(1, W.waterDeep || '#5FA8C8');
    ctx.fillStyle = g; ctx.fillRect(x0, WY, x1 - x0, bot - WY);
    const px = X(POST); ctx.fillStyle = SD().COL.woodDeep; ctx.fillRect(px - 4, BEACH - 8, 8, SHELF - BEACH + 8); ctx.fillStyle = SD().COL.wood; ctx.fillRect(px - 5, BEACH - 10, 10, 4);
  }
  function drawWaterFront(ctx) {
    const cam = api.cam, v = api.view, x0 = Math.floor(cam.x / 6) * 6 - 6, x1 = Math.min(SHORE, cam.x + v.w), t = api.time, W = api.W;
    if (x1 <= x0) return;
    // only the water column between the waves and the sea floor is tinted (what stands in it looks wet)
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, WY); for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, WY + Math.sin(x * 0.06 + t * 1.8) * 1.6);
    ctx.lineTo(x1, SHELF); ctx.lineTo(x0, SHELF); ctx.closePath();
    ctx.fillStyle = W.waterTop || '#9BD8E2'; ctx.globalAlpha = 0.5; ctx.fill();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = W.foam || '#FFFFFF'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) { const y = WY + Math.sin(x * 0.06 + t * 1.8) * 1.6; if (x > x0) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function drawItems(ctx) {
    const sd = SD(), t = api.time;
    for (const it of op.items) {
      if (it.kind === 'mattress' && op.lie) continue;
      const k = Math.min(1, (t - it.t0) / it.dur), x = lerp(it.from.x, it.to.x, k), y0 = gy(it.to.x), y = k >= 1 ? y0 : lerp(it.from.y, y0, k) - Math.sin(k * Math.PI) * 60;
      ctx.save(); ctx.translate(x, y);
      if (k >= 1 && !it.flat) sd.groundShadow(ctx, it.kind);
      if (k < 1) ctx.rotate(k * (it.flat ? 6.28 : 3.6));
      if (it.open) { const o = ease(seg(t, it.t0 + it.dur, it.t0 + it.dur + 0.5)), pop = 1 + Math.sin(o * Math.PI) * 0.12; ctx.scale((0.3 + 0.7 * o) * pop, 1 / pop * (k < 1 ? 0.6 : 1)); }
      sd.PROPS[it.kind](ctx, t, { color: 0 }); ctx.restore();
    }
  }
  function drawTowel(ctx) { // the sleeper shakes a towel out between his hands, then it lies on the sand
    const e = op.cast.st; if (!op.towel || !e.pos) return;
    const t = api.time - op.towel, sd = SD();
    if (t < 1.8 && e.pp) {
      const l = C().cast.hand(e, 'l'), r = C().cast.hand(e, 'r'), x0 = e.pos.x + l[0], y0 = e.pos.foot + l[1], x1 = e.pos.x + r[0], y1 = e.pos.foot + r[1];
      ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let i = 1; i <= 8; i++) { const k = i / 8; ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k) + Math.sin(k * Math.PI) * (16 + Math.sin(t * 16 - k * 5) * 9)); }
      ctx.lineTo(x1, y1 + 4); for (let i = 7; i >= 0; i--) { const k = i / 8; ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k) + 4 + Math.sin(k * Math.PI) * (12 + Math.sin(t * 16 - k * 5 + 0.6) * 8)); }
      ctx.closePath(); ctx.fillStyle = sd.COL.sky; ctx.fill(); ctx.strokeStyle = sd.COL.pink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    } else if (t >= 1.8) { ctx.save(); ctx.translate(X(TOWEL), BEACH); sd.PROPS.towel(ctx); ctx.restore(); }
  }
  function drawGull(ctx) {
    const sd = SD(), t = api.time, x = X(POST), y = BEACH - 10, alarm = op.gullT ? t - op.gullT : -1, wild = alarm > 0 && alarm < 3.4;
    const hop = wild ? Math.abs(Math.sin(alarm * 11)) * 9 : 0, p = api.p, face = p && api.state === 'play' ? (p.x + p.w / 2 >= x ? 1 : -1) : 1;
    op.gull = op.gull || { x, y: y - 30, w: 0 }; op.gull.x = x; op.gull.y = y - 34 - hop;
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(1.3, 1.3);
    if (wild) for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 2, -12); ctx.rotate(s * (0.5 + Math.sin(alarm * 26) * 0.9) - Math.PI / 2 * s); ctx.beginPath(); ctx.ellipse(0, -9, 3.5, 10, 0, 0, TAU); sd.paint(ctx, sd.COL.grey, 0.35); ctx.restore(); }
    sd.gull(ctx, t, { hop: 0, face, blink: ((t * 0.7) % 4) > 3.9 ? 0.1 : 1 });
    ctx.restore();
  }
  function drawPeople(ctx) {
    const c = op.cast, sd = SD(), s = op.on ? op.t : 1e3, cart = cartAt(s), arm = op.on ? armState(s) : null;
    drawItems(ctx); drawTowel(ctx);
    const load = { umbrella: !op.items.find((i) => i.kind === 'umbrella'), mattress: !op.items.find((i) => i.kind === 'mattress'), cooler: true };
    if (!op.cartGone && cart.sink < 1) drawCart(ctx, cart.x, cart.y, cart.rot, cart.x * 0.9, load);
    if (arm) {
      TH().drawBase(ctx, arm.b.x, arm.b.y, 'water', arm.ring, api.time);
      if (arm.tip) {
        const a = TH().armPoints(arm.b.x, arm.b.y, arm.tip.x, arm.tip.y, api.time, { curl: arm.curl, side: -1, r: 7, amp: s > ARM_T.FREEZE[0] && s < ARM_T.FREEZE[1] ? 0 : 8 });
        ctx.save(); ctx.beginPath(); ctx.rect(arm.b.x - 300, arm.b.y - 400, 600, 402); ctx.clip(); TH().drawArm(ctx, a.ps, 32, api.time); ctx.restore();
      }
    }
    for (const k of ['prof', 'film', 'rb', 'kid', 'rep']) if (c[k].pos) CD().drawFigure(ctx, c[k], c[k].pos);
    if (c.st.pos) { if (op.lie) { const e = c.st; e.act = 'float'; CD().drawFloat(ctx, e, { x: X(MAT), foot: BEACH + 3 }); } else CD().drawFigure(ctx, c.st, c.st.pos); }
    if (c.dog.pos) C().dogDraw(ctx, c.dog, c.dog.pos, 'ground');
    drawGull(ctx);
  }
  function splashes() { // a splash where the reporter goes in and where the cart goes under
    const fire = (key, at, x) => { if (op.t >= at && !op[key]) { op[key] = true; api.burst(x, WY, 16, ['#FFFFFF', '#CFEFF6', '#9ED3EE'], 190, { grav: 480, vy: -200, life: 0.6, r: 2.4 }); } };
    fire('sp1', 10.6, X(196));
    if (op.t >= ARM_T.GONE - 0.1 && !op.gulp) { op.gulp = true; api.burst(X(CART.drag), WY, 22, ['#FFFFFF', '#CFEFF6', '#9ED3EE'], 220, { grav: 480, vy: -220, life: 0.7, r: 2.6 }); C().pop(X(CART.drag), WY - 44, 'Gluck!', { size: 30 }); if (api.voice) api.voice({ type: 'sine', f0: 300, f1: 70, slide: 0.25, dur: 0.3, vol: 0.06 }); }
    if (op.t >= ARM_T.RISE && !op.blub) { op.blub = true; api.burst(X(ARM_X), WY, 10, ['#FFFFFF', '#CFEFF6'], 110, { grav: 300, vy: -110, life: 0.5, r: 2 }); }
  }
  function draw(layer, ctx) {
    if (!op || !op.cast || !(op.on || op.after)) return;
    if (!op.on && (api.cam.x > X(640) || api.cam.x + api.view.w < op.L0 - 200)) return;   // the beach is out of sight
    if (layer === 'back') drawSea(ctx);
    else if (layer === 'mid') { if (op.on) splashes(); drawPeople(ctx); }
    else if (layer === 'front') drawWaterFront(ctx);
  }

  window.MimoCoast.openingReset = () => { sessionSeen = false; try { localStorage.removeItem(KEY); } catch (_) { /* nothing to reset */ } };
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; }, init, update, draw });
})();
