// World 4: the closing scene after Käpt'n Krake (about 21 seconds, one moving camera, jumping skips it).
// It begins when the captain's hat has landed on Mimo; the core shows the scene bars and lets Mimo wait (api.boss.scene),
// and the picture here covers the arena: a beach of its own, in screen space with its own camera.
//   The theory  the professor lectures: "Meine These: Es war die Möwe." Behind him the Krake surfaces sheepishly with a
//               mountain of beach things and puts it all down. He turns round: "These widerlegt."
//   The gull    the sausages fall out of her feathers: "Teilweise bestätigt."
//   Dinner      the filmer calls "Essen ist fertig!", everyone runs as always, this time the Krake too; it gets a piece of
//               cake in each arm. The kid finally does a small hop like Mimo.
//   The sleeper wakes up bright red on his mattress: "Hab ich was verpasst?"
// Whoever still misses a find of the world (finds of this browser, MimoCoast.hasFind) does not run to the table but keeps
// searching in the background: the reason to play a level again.
// Never under test automation (navigator.webdriver) unless MimoCoast.forceClosing is set; nothing here touches the fight,
// and every motion is a function of the scene's own clock (advanced in game steps).
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, LEN = 21, GROUND = 288, SEA = 250, WY = GROUND + 14;
  const C = () => window.MimoCoast, ENV = () => window.MimoCoast.storyEnv, SD = () => window.MimoCoast.sdraw;
  const KIT = () => window.MimoCoast.castKit, CD = () => window.MimoCoast.castDraw, TH = () => window.MimoCoast.thief;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const PINK = '#F08FA4', PINK_LITE = '#F9BFCB';
  // where things stand on the closing beach (px)
  const X = { sleeper: 150, pile: 316, krake: 236, prof: 386, gull: 456, kid: 520, mimo: 556, rep: 600, sp: 640, rb: 690, film: 735, dog: 770, table: 900 };
  // the lost things of the world (level index -> what its owner says while still searching)
  const SEARCH = { 29: 'Wo ist nur mein Ball?', 30: 'Meine Sonnenbrille?', 31: 'Eine Latsche fehlt noch.', 32: 'Meine Uhr?', 33: 'Wo ist mein Füller?',
    34: 'Mein Schal?', 35: 'Wuff?', 36: 'Meine Kamera?', 37: 'Wo ist der Schirm?', 38: 'Mein Mikro?', 39: 'Die Birne fehlt.', 40: 'Mein Schild?', 41: 'Wo ist der Kuchen?' };
  const WHO_KEY = { kid: 'kid', reporter: 'rep', redbeard: 'rb', striped: 'sleeper', professor: 'prof', sidepart: 'sp', dog: 'dog', filmer: 'film', keeper: 'keeper', crab: 'crab' };

  let cs = null;
  const blocked = () => typeof navigator !== 'undefined' && navigator.webdriver && !C().forceClosing;

  // ---------- who is still searching ----------
  function missing() {
    const out = {}, levels = api.levels || [];
    for (let i = 29; i <= 41; i++) {
      const f = levels[i] && levels[i].find; if (!f || C().hasFind(i)) continue;
      const owners = f.owner === 'family' ? ['kid'] : Array.isArray(f.owner) ? [f.owner[0]] : [f.owner];
      for (const w of owners) { const k = WHO_KEY[w]; if (k && !out[k]) out[k] = SEARCH[i] || 'Wo ist es nur?'; }
    }
    return out;
  }

  // ---------- start and end ----------
  function start(B) {
    if (cs || blocked() || !KIT() || !KIT().ready()) return false;
    cs = { t: 0, B, on: true, done: false, says: [], cast: {}, miss: missing(), krake: { x: X.krake - 40, rise: 0 }, mimo: { x: X.mimo, hop: 0 }, ev: new Set(), sausages: null };
    const P = (k, who, x, ex) => { const e = ENV().makeEntry({ who, x: 0, y: 8, ...(ex || {}) }, 800 + Object.keys(cs.cast).length); e.x = e.x0 = x; e.foot = GROUND; e.op = true; e.lookDx = 0; cs.cast[k] = e; return e; };
    P('prof', 'professor', X.prof); P('kid', 'kid', X.kid); P('rep', 'reporter', X.rep, { holds: { mic: 'shell' } }); P('sp', 'sidepart', X.sp);
    P('rb', 'redbeard', X.rb); P('film', 'filmer', X.film); P('dog', 'dog', X.dog);
    const sl = P('sleeper', 'striped', X.sleeper, { act: 'float' }); sl.red = 4;
    for (const k of ['kid', 'rep', 'sp', 'rb', 'film']) cs.cast[k].lookDx = X.prof - cs.cast[k].x0;
    cs.cast.prof.lookDx = 80; cs.cast.dog.face = -1;
    api.boss.scene(B, LEN);
    return true;
  }
  const finished = () => !!(cs && cs.done);

  // ---------- small helpers ----------
  const E = (k) => cs.cast[k];
  function say(k, text, secs) { const e = typeof k === 'string' ? E(k) : k; cs.says = [...cs.says.filter((q) => q.e !== e), { e, text, t0: cs.t, dur: secs || Math.min(3.2, 1.5 + text.length * 0.05) }]; }
  function sayAt(anchor, text, secs) { cs.says = [...cs.says.filter((q) => q.e !== anchor), { e: anchor, text, t0: cs.t, dur: secs || 2.4 }]; }
  const pose = (k, name, dir) => { E(k).over = name ? { pose: name, opts: dir ? { dir } : null } : null; };
  const look = (k, x) => { const e = E(k); e.lookDx = x == null ? 0 : x - (e.pos ? e.pos.x : e.x0); };
  const play = (k, name) => C().cast.play(E(k), name);
  const runTo = (k, x, speed, delay) => C().cast.walkTo(E(k), x, { speed: speed || 5, delay: delay || 0 });

  // the script: [seconds, what happens]
  function beats() {
    const m = cs.miss, stays = (k) => !!m[k];
    const runners = ['kid', 'rep', 'sp', 'rb', 'film', 'prof'];
    const seats = { kid: X.table - 70, rep: X.table - 44, sp: X.table + 40, rb: X.table + 64, film: X.table + 88, prof: X.table - 96 };
    return [
      [0.6, () => { pose('prof', 'point', 1); say('prof', 'Meine These: Es war die Möwe.', 2.6); }],
      [2.4, () => { cs.gullHop = cs.t; sayAt(cs.gullAnchor, 'Ich war es nicht!', 1.8); }],
      [3.0, () => { cs.krakeUp = cs.t; }],
      [4.4, () => { look('kid', X.krake); look('rep', X.krake); look('sp', X.krake); look('film', X.krake); }],
      [4.8, () => { pose('kid', 'point', -1); say('kid', 'Da! Hinter dir!', 1.8); }],
      [5.4, () => { cs.krakeSet = cs.t; }],
      [6.6, () => { pose('prof', 'write', 1); say('prof', 'Ruhe bitte. Ich bin gleich fertig.', 2.0); pose('kid', null); }],
      [8.2, () => { pose('prof', null); look('prof', X.krake); E('prof').jolt = api.time; }],
      [8.6, () => { pose('prof', 'point', -1); C().cast.expr(E('prof'), 'serious'); say('prof', 'These widerlegt.', 1.8); }],
      [10.2, () => { sayAt(cs.krakeAnchor, 'Tut mir leid. Ich wollte auch mal Urlaub.', 2.6); }],
      [11.6, () => { cs.sausages = cs.t; sayAt(cs.gullAnchor, 'Ups.', 1.2); }],
      [12.5, () => { look('prof', X.gull); pose('prof', 'write', 1); C().cast.expr(E('prof'), null); say('prof', 'Teilweise bestätigt.', 1.8); }],
      [14.0, () => { pose('prof', null); pose('film', 'wave'); say('film', 'Essen ist fertig!', 1.8); for (const k of runners) E(k).frozen = true; }],
      [14.6, () => {
        pose('film', null);
        runners.forEach((k, i) => { const e = E(k); e.frozen = false; e.lookDx = null; runTo(k, seats[k], 5.6, i * 0.05); });
        runTo('dog', X.table + 172, 6.2);
        cs.krakeRun = cs.t; cs.mimoRun = cs.t;
      }],
      // at the table, whoever still misses a find of the world looks round for it instead of cheering
      // one line after the other: the Krake's cake first, then the kid's cheer (or the first searcher's question)
      [16.6, () => { for (const k of runners) if (stays(k)) { E(k).x0 = seats[k]; E(k).mv = null; E(k).act = 'search'; E(k).lookDx = null; } if (stays('dog')) E('dog').act = 'dig'; }],
      [16.5, () => { cs.cake = cs.t; sayAt(cs.krakeAnchor, 'Für mich? In jeden Arm eins?', 1.55); }],
      [17.1, () => { if (!stays('kid')) cs.kidHop = cs.t; }],
      [18.1, () => { const first = runners.find(stays); if (first) say(first, m[first], 1.5); else { play('kid', 'hooray'); say('kid', 'Geschafft! Wie Mimo!', 1.5); } }],
      [19.0, () => { cs.wake = cs.t; C().cast.expr(E('sleeper'), 'daze'); }],
      [19.5, () => say('sleeper', 'Hab ich was verpasst?', 1.6)],
      [19.7, () => { for (const k of runners) if (!stays(k)) play(k, 'applaud'); }],
    ];
  }

  // ---------- update ----------
  function stepPeople(dt) {
    const e0 = ENV(), t = api.time;
    for (const k of Object.keys(cs.cast)) {
      const e = cs.cast[k], pos = e0.position(e, t);
      if (k === 'sleeper') { pos.foot = WY; e.pos = pos; e.anchor.x = pos.x - 6; e.anchor.y = pos.foot - (cs.wake ? 56 : 30); }
      else { pos.foot = GROUND; if (k === 'kid' && cs.kidHop) { const q = (cs.t - cs.kidHop) / 0.55; pos.hop = q > 0 && q < 1 ? Math.sin(q * Math.PI) * 16 : 0; } e.pos = pos; e.cx = pos.x; e.anchor.x = pos.x; e.anchor.y = pos.foot - e.top - 2; }
      if (e.act === 'search' && C().acts.search) Object.assign(pos, C().acts.search.pos(e, t, e0), { x: pos.x });
      if (e.tl && e.tl.length) while (e.tl.length && t >= e.tl[0].at) e.tl.shift().fn();
      if (e.who === 'dog') { C().dogUpdate(e, dt, pos); continue; }
      KIT().stepEntry(e, dt, pos, CD().poseFor(e, false), true);
    }
  }
  function update(dt) {
    if (!cs || cs.done) return;
    const B = api.G.boss;
    if (!B || B !== cs.B || !B.cine) { cs.done = true; cs.on = false; return; }   // the scene ended, or was skipped
    if (!cs.beats) cs.beats = beats().sort((a, b) => a[0] - b[0]);
    cs.t += dt;
    while (cs.beats.length && cs.t >= cs.beats[0][0]) cs.beats.shift()[1]();
    if (cs.mimoRun != null) cs.mimo.x = lerp(X.mimo, X.table - 130, ease((cs.t - cs.mimoRun - 0.3) / 1.6));
    stepPeople(dt);
  }

  // ---------- the camera ----------
  const CAM = [[0, 400, 1.7, 0.72], [2.2, 400, 1.7, 0.72], [3.4, 340, 1.5, 0.72], [10.6, 340, 1.5, 0.72], [11.4, 420, 1.7, 0.72], [13.6, 420, 1.6, 0.72],
    [15.6, 780, 1.45, 0.72], [16.8, 880, 1.55, 0.72], [18.5, 880, 1.55, 0.72], [19.2, 330, 1.5, 0.7], [20.1, 330, 1.5, 0.7], [LEN, 540, 1.05, 0.7]];
  function camAt(s) {
    let i = 0; while (i < CAM.length - 1 && s >= CAM[i + 1][0]) i++;
    const a = CAM[i], b = CAM[Math.min(CAM.length - 1, i + 1)], k = b === a ? 0 : ease(seg(s, a[0], b[0]));
    const z = lerp(a[2], b[2], k), c = lerp(a[1], b[1], k), g = lerp(a[3], b[3], k), v = api.view;
    return { x: c - v.w / (2 * z), y: GROUND - g * v.h / z, z };
  }

  // ---------- the picture ----------
  // its own warm evening light, the same at any hour (a party, not the night of the arena): a low sun setting into the
  // sea, warm sand, a string of lanterns from palm to palm over the table; the dark scheme gets a deeper dusk
  const EVE = {
    light: { top: '#A8C9E4', mid: '#F7D9C4', low: '#FFC99C', sun: '#FFB277', core: '#FFE6B0', sea: '#93C3CF', glint: '#FFE2B8', wTop: '#8ECAD5', wDeep: '#4D93B4', ground: '#F2D6AA', edge: '#FBE7C6', foam: '#FFF7EA', wash: 0, glow: 0.5 },
    dark: { top: '#2B325E', mid: '#7E6489', low: '#E09A79', sun: '#F08D62', core: '#FFCB91', sea: '#4C7590', glint: '#F2B48E', wTop: '#3E7F95', wDeep: '#1D4964', ground: '#B59A7B', edge: '#CBB293', foam: '#E8E1EE', wash: 2, glow: 0.8 },
  };
  const eve = () => EVE[api.dark ? 'dark' : 'light'];
  const BULBS = ['#FFD27A', '#FF9F8A', '#A6E3CF', '#FFD27A', '#F7B2D0'];
  const LIGHTS = { x0: 556, x1: 1006, y: GROUND - 104, sag: 30, n: 13 };
  const lightAt = (k) => ({ x: lerp(LIGHTS.x0, LIGHTS.x1, k), y: LIGHTS.y + Math.sin(k * Math.PI) * LIGHTS.sag });
  function drawBeach(ctx, cam) {
    const v = api.view, E = eve(), x0 = cam.x - 10, x1 = cam.x + v.w / cam.z + 10, top = cam.y - 10, bot = cam.y + v.h / cam.z + 10, t = cs.t;
    const sky = ctx.createLinearGradient(0, top, 0, GROUND - 26); sky.addColorStop(0, E.top); sky.addColorStop(0.62, E.mid); sky.addColorStop(1, E.low);
    ctx.fillStyle = sky; ctx.fillRect(x0, top, x1 - x0, bot - top);
    // the low sun with a soft halo, sinking into the sea
    const sx = 700, sy = GROUND - 20, halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150);
    halo.addColorStop(0, hexA(E.core, 0.75)); halo.addColorStop(1, hexA(E.low, 0)); ctx.fillStyle = halo; ctx.fillRect(sx - 150, sy - 150, 300, 150);
    const disc = ctx.createRadialGradient(sx - 6, sy - 10, 4, sx, sy, 34); disc.addColorStop(0, E.core); disc.addColorStop(0.55, E.core); disc.addColorStop(1, E.sun);
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = E.sea; ctx.fillRect(x0, GROUND - 26, x1 - x0, 26);
    // the sun's path on the sea: a few short glints
    ctx.strokeStyle = E.glint; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const y = GROUND - 22 + i * 4.5, w = 30 - i * 4 + Math.sin(t * 2 + i) * 4; ctx.globalAlpha = 0.85 - i * 0.12; ctx.beginPath(); ctx.moveTo(sx - w / 2 + Math.sin(t * 1.3 + i * 2) * 5, y); ctx.lineTo(sx + w / 2 + Math.sin(t * 1.3 + i * 2) * 5, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, WY, 0, WY + 120); g.addColorStop(0, E.wTop); g.addColorStop(1, E.wDeep);
    ctx.fillStyle = g; ctx.fillRect(x0, WY, SEA + 60 - x0, bot - WY);
    const gy = (x) => (x > SEA + 60 ? GROUND : x > SEA ? GROUND + 30 * ease((SEA + 60 - x) / 60) : GROUND + 30 + (SEA - x) * 0.25);
    ctx.beginPath(); ctx.moveTo(SEA - 120, bot); for (let x = SEA - 120; x <= x1; x += 8) ctx.lineTo(x, gy(x)); ctx.lineTo(x1, bot); ctx.closePath(); ctx.fillStyle = E.ground; ctx.fill();
    ctx.strokeStyle = E.edge; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(SEA + 30, gy(SEA + 30) + 3); for (let x = SEA + 38; x <= x1; x += 8) ctx.lineTo(x, gy(x) + 3); ctx.stroke();
    ctx.strokeStyle = E.foam; ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = x0; x <= SEA + 40; x += 6) { const y = WY + Math.sin(x * 0.06 + t * 1.8) * 1.6; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    // palms and the table with the cake
    for (const px of [560, 1010]) { ctx.save(); ctx.translate(px, GROUND); ctx.strokeStyle = SD().COL.woodDeep; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -50, -4, -110); ctx.stroke(); ctx.fillStyle = SD().COL.leaf; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(-4, -110); ctx.rotate(-2.6 + i * 0.75); ctx.beginPath(); ctx.ellipse(22, 0, 26, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); } ctx.restore(); }
    ctx.save(); ctx.translate(X.table, GROUND); ctx.scale(1.3, 1.3); SD().PROPS.table(ctx, t, {}); ctx.restore();
    // the gull's post
    ctx.fillStyle = SD().COL.woodDeep; ctx.fillRect(X.gull - 4, GROUND - 30, 8, 30); ctx.fillStyle = SD().COL.wood; ctx.fillRect(X.gull - 6, GROUND - 32, 12, 4);
  }
  // the string of lanterns, over everybody (drawn after the figures, the glow is light)
  function drawLights(ctx) {
    const E = eve(), t = cs.t;
    ctx.strokeStyle = SD().ink(); ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const q = lightAt(i / 30); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    for (let i = 1; i < LIGHTS.n; i++) {
      const q = lightAt(i / LIGHTS.n), col = BULBS[i % BULBS.length], fl = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7), sw = Math.sin(t * 1.4 + i) * 0.12;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(sw);
      const gl = ctx.createRadialGradient(0, 9, 1, 0, 9, 22); gl.addColorStop(0, hexA(col, E.glow * fl)); gl.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 9, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = SD().ink(); ctx.fillRect(-2, 0, 4, 3);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 9, 4.6, 6.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(-1.4, 7, 1.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }
  function drawGull(ctx) {
    const sd = SD(), t = cs.t, h = cs.gullHop != null && t - cs.gullHop < 1.2 ? Math.abs(Math.sin((t - cs.gullHop) * 10)) * 6 : 0;
    const shake = cs.sausages != null && t - cs.sausages < 0.6 ? Math.sin((t - cs.sausages) * 50) * 0.18 : 0;
    cs.gullAnchor = cs.gullAnchor || { x: X.gull, y: 0, w: 0 }; cs.gullAnchor.y = GROUND - 66 - h;
    ctx.save(); ctx.translate(X.gull, GROUND - 32 - h); ctx.rotate(shake); ctx.scale(1.4, 1.4); sd.gull(ctx, api.time, { hop: 0, face: -1, blink: (t % 3.6) > 3.45 ? 0.1 : 1 }); ctx.restore();
    if (cs.sausages == null) return;
    for (let i = 0; i < 3; i++) { // three sausages tumble out of her feathers and bounce on the sand
      const k = Math.max(0, t - cs.sausages - i * 0.12), x = X.gull - 8 + i * 9 + k * (i - 1) * 20, fall = Math.min(1, k / 0.45), y = lerp(GROUND - 46, GROUND - 4, fall * fall) - (k > 0.45 && k < 0.75 ? Math.sin((k - 0.45) / 0.3 * Math.PI) * 8 : 0);
      ctx.save(); ctx.translate(Math.min(x, X.gull + 40), y); ctx.rotate(k < 0.6 ? k * 9 : 1.4 + i * 0.3); sd.rrect(ctx, -2.6, -7, 5.2, 14, 2.6); sd.paint(ctx, '#D98C63', 0.35); ctx.restore();
    }
  }
  // the Krake, sheepish: a pink head (no hat, Mimo wears it now), worried brows, blushing; arms carry, set down, run, take cake
  function krakePos() {
    const t = cs.t, k = cs.krake;
    let x = X.krake, rise = cs.krakeUp != null ? ease((t - cs.krakeUp) / 1.6) : 0;
    if (cs.krakeRun != null) { const q = ease((t - cs.krakeRun - 0.5) / 2.2); x = lerp(X.krake, X.table + 96, q); rise = 1; }
    k.x = x; k.rise = rise;
    const onLand = x > SEA + 40, baseY = onLand ? GROUND - 34 : WY + 34 - rise * 70;
    return { x, y: baseY, rise, onLand };
  }
  function drawKrake(ctx) {
    if (cs.krakeUp == null) return;
    const t = cs.t, p = krakePos(), sd = SD(), th = TH(), hx = p.x, hy = p.y - 30, bob = Math.sin(t * 2.2) * 2;
    cs.krakeAnchor = cs.krakeAnchor || { x: 0, y: 0, w: 0 }; cs.krakeAnchor.x = hx; cs.krakeAnchor.y = hy - 50;
    const setK = cs.krakeSet != null ? ease((t - cs.krakeSet) / 1.0) : 0, carry = cs.krakeRun == null && setK < 1;
    // the pile: held up on two arms, then set down on the sand in front
    const pileX = lerp(hx + 20, X.pile, setK), pileY = lerp(hy - 36 + bob, GROUND, setK);
    ctx.save(); ctx.translate(pileX, pileY); ctx.scale(1.1, 1.1); sd.PROPS.pile(ctx, api.time, {}); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(hx - 300, hy - 400, 600, (p.onLand ? 1000 : WY + 2 - (hy - 400))); ctx.clip();
    // arms: two under the pile (or waving cake), the rest as legs
    const cake = cs.cake != null ? ease((t - cs.cake) / 0.5) : 0, run = cs.krakeRun != null && t - cs.krakeRun < 2.8;
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, j = i % 3, bx = hx + s * (14 + j * 9), by = hy + 26;
      let tx = bx + s * (30 + j * 14) + Math.sin(t * (run ? 14 : 3) + i) * (run ? 10 : 4), ty = (p.onLand ? GROUND : WY + 20) - (j === 2 ? 2 : 0);
      if (carry && j === 0) { tx = lerp(hx + s * 18, pileX + s * 28, setK); ty = lerp(hy - 30, pileY - 20, setK); }
      if (cake > 0) { tx = lerp(tx, hx + s * (40 + j * 20), cake); ty = lerp(ty, hy - 34 - j * 10 + Math.sin(t * 5 + i) * 3, cake); }
      const arm = th.armPoints(bx, by, tx, ty, api.time, { amp: run ? 6 : 3, curl: cake > 0.6 ? 0.4 : 0, side: s });
      th.drawArm(ctx, arm.ps, 13, api.time); tips.push(arm.hook);
    }
    // head
    ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(hx, hy + bob, 46, 40, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(59,53,96,0.3)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = PINK_LITE; for (const [dx, dy, r] of [[-22, -18, 6], [18, -24, 4], [26, -6, 5]]) { ctx.beginPath(); ctx.arc(hx + dx, hy + bob + dy, r, 0, TAU); ctx.fill(); }
    const happy = cake > 0.3, lookDown = !happy && cs.krakeRun == null ? 3 : 0;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(hx + s * 15, hy + bob - 4, 9, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sd.ink(); ctx.beginPath(); ctx.arc(hx + s * 15 + 1.5, hy + bob - 4 + lookDown, 4.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(hx + s * 15 + 3, hy + bob - 6 + lookDown, 1.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = sd.ink(); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      if (happy) { ctx.moveTo(hx + s * 22, hy + bob - 19); ctx.lineTo(hx + s * 9, hy + bob - 21); } else { ctx.moveTo(hx + s * 23, hy + bob - 15); ctx.lineTo(hx + s * 8, hy + bob - 21); }
      ctx.stroke();
      ctx.fillStyle = '#F26D8A'; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(hx + s * 27, hy + bob + 10, 7, 4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = sd.ink(); ctx.lineWidth = 1.8; ctx.beginPath();
    if (happy) ctx.arc(hx, hy + bob + 12, 7, 0.2, Math.PI - 0.2); else { ctx.moveTo(hx - 7, hy + bob + 17); ctx.quadraticCurveTo(hx - 3, hy + bob + 13, hx, hy + bob + 17); ctx.quadraticCurveTo(hx + 3, hy + bob + 21, hx + 7, hy + bob + 17); }
    ctx.stroke();
    if (!happy && cs.krakeUp != null) { ctx.fillStyle = '#BFE8F5'; ctx.beginPath(); ctx.ellipse(hx + 38, hy + bob - 22, 3, 4.5, 0, 0, TAU); ctx.fill(); }   // a sweat drop
    ctx.restore();
    if (cake > 0) for (const q of tips) { ctx.save(); ctx.translate(q.x, q.y - 4); ctx.scale(cake, cake); cakeSlice(ctx); ctx.restore(); }
    if (happy && Math.floor(t * 2) % 2) { ctx.fillStyle = '#F26D8A'; heart(ctx, hx + 52, hy - 40 - (t * 10 % 10), 5); }
  }
  function cakeSlice(ctx) {
    const sd = SD(); ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(7, 3); ctx.lineTo(4, -8); ctx.closePath(); sd.paint(ctx, sd.COL.cream, 0.35);
    ctx.fillStyle = sd.COL.pink; ctx.fillRect(-6, -1.5, 12, 2.4); ctx.fillStyle = sd.COL.red; ctx.beginPath(); ctx.arc(4, -9, 2, 0, TAU); ctx.fill();
  }
  function heart(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 2, y - r * 0.4, x - r * 0.6, y - r * 1.8, x, y - r * 0.5); ctx.bezierCurveTo(x + r * 0.6, y - r * 1.8, x + r * 2, y - r * 0.4, x, y + r); ctx.fill(); }
  // the sleeper: lying on his mattress at the water line, bright red; he sits up when he wakes
  function drawSleeper(ctx) {
    const e = E('sleeper'); if (!e.pos) return;
    const t = cs.t, wake = cs.wake != null ? ease((t - cs.wake) / 0.6) : 0, bob = Math.sin(t * 1.3) * 1.8, x = e.pos.x, y = WY - 3 + bob;
    ctx.save(); ctx.translate(x, y); SD().PROPS.mattress(ctx, api.time, { color: 0 });
    if (e.pp) {
      ctx.save(); ctx.beginPath(); ctx.rect(-80, -140, 160, 130); ctx.clip();
      ctx.translate(lerp(30, 6, wake), lerp(-9, 12, wake)); ctx.rotate(-Math.PI / 2 * (1 - wake) - 0.08 * wake); ctx.scale(lerp(0.66, 1, wake), 1);
      e.pp.fig.asleep = cs.wake == null; CD().rigAt(ctx, e, 0, 0, { noShadow: true }); e.pp.fig.asleep = false; ctx.restore();
    }
    ctx.restore();
    if (!cs.wake && Math.floor(t / 1.3) % 2) { ctx.save(); ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#8E8CA3'; ctx.fillText('Zz', x - 30, y - 30 - (t * 6 % 8)); ctx.restore(); }
  }
  function drawMimo(ctx) {
    const t = cs.t, m = cs.mimo, run = cs.mimoRun != null && t - cs.mimoRun < 2.1, hopK = cs.kidHop != null ? (t - cs.kidHop - 0.15) / 0.5 : -1;
    const bob = run ? Math.abs(Math.sin(t * 14)) * 3 : hopK > 0 && hopK < 1 ? Math.sin(hopK * Math.PI) * 18 : 0;
    ctx.save(); ctx.translate(0, -bob);
    api.drawMimo(m.x, GROUND, { facing: cs.mimoRun != null ? 1 : -1, hat: api.G.rewardHat, mood: cs.cake != null ? 'happy' : cs.krakeUp != null && t - cs.krakeUp < 6 ? 'look' : null, step: run ? Math.sin(t * 14) * 3 : 0, blink: (t % 3.1) > 2.97 ? 0.12 : 1, scale: 1 });
    ctx.restore();
  }
  function drawSays(ctx, cam) {
    ctx.font = '700 11px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const placed = [], minY = cam.y + (api.view.h * 0.12 + 6) / cam.z;
    for (const q of cs.says) {
      const k = cs.t - q.t0; if (k < 0 || k > q.dur) continue;
      const a = q.e.anchor || q.e, ax = a.x + (a.w || 0) / 2, ay = a.y - 6, w = ctx.measureText(q.text).width + 14, h = 20;
      let x = Math.max(cam.x + w / 2 + 4, Math.min(cam.x + api.view.w / cam.z - w / 2 - 4, ax)), y = Math.max(minY + h / 2, ay - h / 2 - 8);
      for (let n = 0; n < 8; n++) { const hit = placed.find((o) => Math.abs(o.x - x) < (o.w + w) / 2 + 3 && Math.abs(o.y - y) < (o.h + h) / 2 + 3); if (!hit) break; if (hit.y - hit.h / 2 - h / 2 - 4 >= minY + h / 2) y = hit.y - hit.h / 2 - h / 2 - 4; else x = hit.x + (hit.w + w) / 2 + 4; }
      placed.push({ x, y, w, h });
      const fade = Math.min(1, k / 0.12, (q.dur - k) / 0.25);
      ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = api.P.card || '#FFFFFF'; ctx.beginPath(); api.rr(x - w / 2, y - h / 2, w, h, 9); ctx.fill();
      ctx.beginPath(); const tx = Math.max(x - w / 2 + 8, Math.min(x + w / 2 - 8, ax)); ctx.moveTo(tx - 4, y + h / 2 - 1); ctx.lineTo(Math.abs(ay - y) > 30 ? ax : tx, Math.abs(ay - y) > 30 ? ay - 2 : y + h / 2 + 6); ctx.lineTo(tx + 4, y + h / 2 - 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = api.P.fg || '#3B3560'; ctx.fillText(q.text, x, y + 0.5); ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  }
  // keeper and crab: at the table when their find is home, else searching in the background
  function drawGuests(ctx) {
    const sd = SD(), t = cs.t, m = cs.miss;
    const kx = m.keeper ? 1122 + Math.sin(t * 0.6) * 12 : X.table + 215, cx = m.crab ? 490 + Math.sin(t * 0.9) * 4 : X.table + 4;
    ctx.save(); ctx.translate(kx, GROUND - 2); ctx.scale(0.9, 0.9); sd.keeper(ctx, api.time, { face: m.keeper ? (Math.cos(t * 0.6) > 0 ? 1 : -1) : -1, walk: m.keeper ? api.time * 7 : null, candle: !!m.keeper, lift: m.keeper ? 0 : (cs.cake != null ? 1 : 0) }); ctx.restore();
    ctx.save(); ctx.translate(cx, GROUND); sd.crab(ctx, api.time, { hop: m.crab ? 0 : Math.abs(Math.sin(t * 4)) * 3, face: 1 }); ctx.restore();
    if (!m.crab) { ctx.save(); ctx.translate(cx, GROUND - 30); ctx.scale(0.7, 0.7); sd.ICONS.taxisign(ctx); ctx.restore(); }
    if (m.keeper && t > 16) sd.tag(ctx, '?', kx + 14, GROUND - 70, 0.1);
    if (m.crab && t > 16) sd.tag(ctx, '?', cx + 10, GROUND - 34, 0.1);
  }
  function draw(layer, ctx) {
    if (layer !== 'over' || !cs || cs.done || !cs.B.cine) return;
    const cam = camAt(cs.t), v = api.view;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.w, v.h); ctx.clip(); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    // the evening light is the same at every hour: figures and props get the evening's wash, not the arena's night
    const wash = eve().wash; C().nightOverride = wash; SD().setNight(wash);
    try {
      drawBeach(ctx, cam); drawSleeper(ctx); drawGuests(ctx);
      const order = ['dog', 'film', 'rb', 'sp', 'rep', 'kid', 'prof'];
      drawKrake(ctx);
      for (const k of order) { const e = E(k); if (!e.pos) continue; if (e.who === 'dog') C().dogDraw(ctx, e, e.pos, 'ground'); else CD().drawFigure(ctx, e, e.pos); }
      drawGull(ctx); drawMimo(ctx); drawLights(ctx); drawSays(ctx, cam);
    } finally { C().nightOverride = null; }
    ctx.restore();
    // a soft fade in from the arena and out again (white, or the dusk of the dark scheme)
    const f = Math.max(1 - cs.t / 0.6, (cs.t - (LEN - 0.6)) / 0.6);
    if (f > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, f); ctx.fillStyle = api.dark ? '#26233A' : '#FFFFFF'; ctx.fillRect(0, 0, v.w, v.h); ctx.restore(); }
  }

  window.MimoCoast.closing = { start, finished, LEN, get on() { return !!(cs && !cs.done); } };
  // the ending card while the coast is the last released world (src/index.html UNRELEASED_WORLDS); once a later world
  // is out, its own ending counts and this one stays unused
  const ending = { title: 'Der Strand ist wieder voll',
    text: 'Käpt’n Krake hat alles zurückgebracht und sitzt jetzt mit am Tisch. Danke fürs Spielen! Mimo packt schon den Koffer für das nächste Abenteuer. Bis dahin bleiben alle Level offen, falls du noch Sterne, Medaillen, Fundstücke oder Kostüme holen möchtest.' };

  window.MimoWorlds.register({ world: 4, ending, setup(a) { api = a; }, init() { cs = null; }, update, draw });
})();
