// World 4 boss "Käpt’n Krake": the fight. An octopus with a captain's hat, bigger than the screen, beside a raft.
// Core loop: a shadow on the deck shows where the next arm comes down. The arm sticks in the deck for a while, its suckers
// become steps up to the head, and a jump on the hat is a hit. Six lives, three phases:
//   1 Entern  single strikes with lots of time, the whole raft.
//   2 Leck    the raft breaks in two (water between), an arm sweeps over the deck (jump it), ink makes spots slippery.
//   3 Sturm   the storm holds the raft and the tide rises over the deck; arms come from below, bubbles announce them.
// The water is never a death, but arms from below come for whoever swims too long, so the raft stays the place to be.
// Shapes: coast-boss-arms.js (shared with the picture and the bot). Picture, music, hat: coast-boss-draw.js.
// Bot and test pictures for tools/bosscheck.mjs: coast-boss-bot.js. Everything is a function of the fight clock and the
// seeded boss generator, so a fight plays the same every time (window.__mimo.sim.step).
(function () {
  'use strict';
  let api = null;
  const M = () => window.MimoKrake, C = () => window.MimoCoast;

  // ---------- tuning (seconds and pixels) ----------
  // per phase: pause between moves, how long the shadow follows Mimo and then stays put, the fall of the arm, how long it
  // sticks (the last `strain` seconds it shakes as a warning), arms from below (after `grace` s of swimming, `warn` s of
  // bubbles, then one every `gap` s), the sweep (wind-up, speed) and how fast the shadow follows
  const TEMPO = [
    { idle: 1.3, track: 0.8, lock: 1.05, slam: 0.14, stuck: 6.6, strain: 1.1, follow: 280, grace: 1.4, warn: 1.1, gap: 1.8, wind: 1, speed: 480 },
    { idle: 0.9, track: 0.62, lock: 0.88, slam: 0.13, stuck: 5.6, strain: 1.0, follow: 320, grace: 1.1, warn: 0.95, gap: 1.5, wind: 0.95, speed: 520 },
    { idle: 0.7, track: 0.5, lock: 0.78, slam: 0.12, stuck: 5.0, strain: 0.95, follow: 360, grace: 0.8, warn: 0.85, gap: 1.25, wind: 0.85, speed: 570 },
  ];
  const RISE_TIME = 0.35, PULL_TIME = 0.5, MISS_TIME = 0.9, HURT_TIME = 1.3, HIT_DANGER_AFTER = 0.07;
  const SCENE_TIME = 3.0, SCENE_WAIT_MIN = 0.45, SCENE_WAIT_MAX = 1.5, PHASE_LINE = 1.5;
  // what happens when in a phase scene: the raft-breaking arm comes in, strikes, lets go; the storm flashes, the arms grab
  const SCENE = { ARM_IN: 0.3, STRIKE: 1.3, LET_GO: 2.2, FLASH: 1.0, HOLD0: 1.3, HOLD_TIME: 0.8 };
  const KNOCK_TIME = 0.6, KNOCK_SPEED = 300;            // after a hit the hat flicks Mimo back towards the raft
  const BOB_AMP = 2.2, BOB_SPEED = 1.2, DIP_KICK = 150, DIP_SPRING = 95, DIP_DAMP = 7;
  const HEAD_PUSH = 120;                                // the body under the head pushes a swimmer back out (px/s)
  const SLAM_REACH = 34;                                // an arm this low over the deck hits someone standing there
  // 96: the open water left of the raft (K.WEST in coast-boss-arms.js)
  const SWEEP_X0 = 62 + 96, SWEEP_X1 = 690 + 96, SWEEP_LIFT = 96, SWEEP_LIFT_TIME = 0.4, SWEEP_HIT_K = 0.14, SWEEP_LOW = 40; // only the part down at the deck hurts
  const BELOW_CREEP = 0.22, BELOW_UP = 0.16, BELOW_HOLD = 0.5, BELOW_DOWN = 0.35, BELOW_HIT_U = 0.35, BELOW_HIT_K = 0.72, BELOW_MAX = [1, 1, 2];
  const INK_PUFF = 0.75, INK_EVERY = 0.15, INK_BLOBS = 3, INK_END = 1.6, INK_FLY = 0.7, INK_W = 76, INK_LIFE = 8, INK_ACCEL = 300, INK_SPREAD = 112;
  const STORM_TIDE = { low: 11, high: 9, period: 13, move: 2 }, LOW_NEED = 3.0, SWEEP_NEED = 2.3, WAIT_MAX = 5;
  // CLOSE: the closing scene on the beach starts this long after the win (the hat is on, the last line said, coast-closing.js)
  const FIN = { CLOSE: 6.0, POP: 0.55, POP_UP: 24, POP_SIDE: 70, FLY: 1.5, HOP: 2.3, HOP_TIME: 0.45, SINK0: 0.7, SINK1: 2.7, SINK_DEPTH: 330, HAT_SMALL: 0.48, HAT_ON: 0.17, ARC: 26, SPIN: 2, FRAME: 1.9, CRY: 1.0, LAST: 3.2, BESIDE: 60 };
  const CAM_LOW_Y = 40;                                 // camera height while Mimo is on the raft (keeps the hat clear of the bar)

  const LINES = {
    intro: ['Wer planscht da in MEINER Bucht?', 'Piep!', 'Ich habe acht Arme, und alle haben Zeit für dich!'],
    again: 'Ahoi! Schon wieder an Bord?',
    tickle: ['Hihi, nicht an der Mütze!', 'Runter von meinem Hut, du Landratte!', 'Das kitzelt bis in die Saugnäpfe!'],
    hit: ['Aua, meine Mütze!', 'Das war die gute Mütze!', 'Meine Sonntagsmütze!'],
    phase: ['Jetzt gibt es Tinte!', 'Alle Arme an Deck!'],
    stun: ['Mein Arm klemmt!', 'Wer hat das Deck dahin gestellt?', 'Splitter! Im Saugnapf!'],
    beaten: 'Na gut. Du darfst das Floß behalten. Die Mütze auch.',
    cry: 'Meine Mütze!',
    piep: ['Piep? Hier wird nicht gepiept, hier wird geblubbt.', 'Wie bitte? Ich hab Wasser im Ohr.'],
    miss: ['Daneben. Absicht.', 'Platsch. Das zählt nicht.'],
    water: ['Raus aus meinem Wasser!', 'Das ist MEIN Planschbecken!', 'Kein Baden ohne Kapitän!'],
    ink: ['Tinte marsch!', 'Pfft! Pfft! Pfft!'],
    sweep: ['Deck schrubben!', 'Klar Schiff!'],
    storm: ['Hart backbord!', 'Jetzt kommt die Flut!'],
  };

  const T = 32;
  const fight = () => (api && api.mode === 'boss' && api.G.boss && api.G.boss.krake ? api.G.boss : null);
  const tempo = (B) => TEMPO[api.boss.phase(B)];
  const playing = () => api.state === 'play';
  const pcx = () => api.p.x + api.p.w / 2;

  // ---------- the raft: one or two bodies that float on the water (or are held down in the storm) ----------
  function surf() { const s = C().surface(); return s == null ? M().K.SURF : s; }
  function deckY(B) {
    const K = M().K, float = surf() - K.FREE + Math.sin(api.time * BOB_SPEED) * BOB_AMP * (1 - B.storm * 0.5) + B.dip;
    return M().lerp(float, K.DECK + B.dip * 0.25, B.anchor);
  }
  function setRaft(B, pieces) {
    const L = api.L, y = deckY(B);
    L.bodies = L.bodies.filter((b) => !b.krake || b.krake === 'step');
    B.rafts = pieces.map(([x0, x1], i) => ({ krake: 'raft', part: i, x: x0, w: x1 - x0, y }));
    L.bodies.push(...B.rafts);
  }
  const wholeRaft = (B) => setRaft(B, [[M().K.RAFT_X0, M().K.RAFT_X1]]);
  const brokenRaft = (B) => { const K = M().K; setRaft(B, [[K.RAFT_X0, K.GAP_X0], [K.GAP_X1, K.RAFT_X1]]); };
  const raftAt = (B, x, m) => B.rafts.find((r) => x >= r.x + (m || 0) && x <= r.x + r.w - (m || 0));
  function clearSteps(B) {
    for (const s of B.steps) s.off = true;
    api.L.bodies = api.L.bodies.filter((b) => b.krake !== 'step');
    B.steps = [];
  }
  // the bodies move in the world's update, before Mimo, so he rides them like lifts
  function placeBodies(B) {
    const y = deckY(B);
    for (const r of B.rafts) r.y = y;
    const a = B.arms.find((q) => q.kind === 'slam');
    if (!a || !B.steps.length) return;
    const ps = poseOf(B, a), K = M().K;
    for (const s of B.steps) { const q = M().topAt(ps, s.k); s.x = q.x - K.STEP_W / 2; s.y = q.y; }
  }

  // ---------- arms ----------
  // the pose of an arm right now (the picture and the hit tests both use this)
  function poseOf(B, a) {
    const Mk = M(), K = Mk.K, rt = Mk.root(Mk.head(B)), tp = tempo(B), deck = a.deck != null ? a.deck : deckY(B);
    if (a.kind === 'slam') {
      const hover = () => Mk.slamHover(a.tx, rt, api.time), stuck = () => Mk.slamStuck(a.tx, a.st === 'miss' || a.water ? surf() + 34 : deck, rt, a.wig || 0);
      switch (a.st) {
        case 'rise': return Mk.mix(Mk.tucked(rt), hover(), Mk.ease(Math.min(1, a.t / RISE_TIME)));
        case 'aim': return hover();
        case 'down': { const k = Math.min(1, a.t / tp.slam); return Mk.mix(hover(), stuck(), k * k); }
        case 'pull': return Mk.mix(a.from || stuck(), Mk.tucked(rt), Mk.ease(Math.min(1, a.t / PULL_TIME)));
        default: return stuck();
      }
    }
    if (a.kind === 'sweep') return Mk.sweep(a.sx, deckY(B), a.lift);
    if (a.kind === 'below') return Mk.below(a.bx, surf(), a.u);
    return Mk.tucked(rt);
  }
  const armOf = (B, kind) => B.arms.find((a) => a.kind === kind);
  const dropArm = (B, a) => { B.arms = B.arms.filter((q) => q !== a); };

  function startSlam(B) {
    const K = M().K;
    B.arms = B.arms.filter((a) => a.kind !== 'slam');
    B.arms.push({ kind: 'slam', st: 'rise', t: 0, tx: M().clamp(pcx(), K.TX_MIN, K.TX_MAX), wig: 0 });
    api.sfx.swoosh();
  }
  // the shadow follows Mimo, then stays put; then the arm comes down
  function stepAim(B, a, dt) {
    const tp = tempo(B), K = M().K;
    if (a.st === 'rise' && a.t >= RISE_TIME) { a.st = 'aim'; a.t = 0; }
    if (B.t < tp.track) { const want = M().clamp(pcx(), K.TX_MIN, K.TX_MAX), d = want - a.tx, s = tp.follow * dt; a.tx += Math.max(-s, Math.min(s, d)); }
    else if (!a.locked) { a.locked = true; api.sfx.sw(); }
    if (B.t >= tp.track + tp.lock) { a.st = 'down'; a.t = 0; api.boss.set(B, 'slam'); }
  }
  function impact(B, a) {
    const K = M().K, raft = raftAt(B, a.tx, 4);
    a.t = 0; a.wig = 0;
    api.shake(raft ? 0.9 : 0.5); api.sfx.stomp();
    if (!raft) {
      a.st = 'miss'; a.water = true; api.boss.set(B, 'miss');
      C().splash(a.tx, surf(), 18); api.boss.bark(B, 'miss');
      return;
    }
    a.st = 'stuck'; B.dipV += DIP_KICK; api.sfx.smash();
    api.burst(a.tx, deckY(B) - 4, 16, [api.W.pole || '#E7CBA9', '#D9B58A', api.P.dust], 200, { grav: 700, rect: true, vy: -140 });
    B.steps = M().stepsOf(poseOf(B, a), deckY(B)).map((k) => ({ krake: 'step', k, x: 0, y: 0, w: K.STEP_W }));
    api.L.bodies.push(...B.steps);
    placeBodies(B);
    api.boss.set(B, 'stuck');
    api.boss.bark(B, 'stun');
    B.barkT = Math.max(B.barkT, 2.5);
  }
  function releaseSlam(B) {
    const a = armOf(B, 'slam'); if (!a) return;
    clearSteps(B);
    if (a.st === 'rise' || a.st === 'aim') { dropArm(B, a); return; }
    a.from = poseOf(B, a); a.st = 'pull'; a.t = 0;
  }

  // the sweep: hangs from the top left, rears up at the left edge, then its tip brushes over the whole deck
  function startSweep(B) { B.arms.push({ kind: 'sweep', st: 'wind', t: 0, sx: SWEEP_X0, lift: SWEEP_LIFT }); api.boss.bark(B, 'sweep'); }
  function stepSweep(B, a, dt) {
    const tp = tempo(B);
    // it rears up and shakes at the left edge (and slides in from outside the picture first)
    if (a.st === 'wind') { a.sx = SWEEP_X0 - 80 * Math.max(0, 1 - a.t * 4) + Math.sin(a.t * 9) * 5; a.lift = SWEEP_LIFT + Math.sin(a.t * 7) * 12; if (a.t >= tp.wind) { a.st = 'go'; a.t = 0; api.sfx.swoosh(); } return; }
    a.sx += tp.speed * dt;
    if (a.st === 'go') { a.lift = Math.max(0, a.lift - 900 * dt); if (Math.random() < dt * 40) api.G.particles.push({ x: a.sx, y: deckY(B) - 4, vx: -60 + Math.random() * 40, vy: -80 - Math.random() * 60, life: 0, max: 0.4, r: 2.2, color: api.W.foam || '#FFFFFF', grav: 400, rect: false, rot: 0 }); if (a.sx > SWEEP_X1 - 80) { a.st = 'lift'; a.t = 0; } return; }
    a.lift += 600 * dt;
    if (a.t >= SWEEP_LIFT_TIME) dropArm(B, a);
  }

  // arms from below: bubbles first, then the arm shoots up through the water at that spot
  function startBelow(B, x) {
    const K = M().K;
    B.arms.push({ kind: 'below', st: 'warn', t: 0, u: 0, bx: M().clamp(x, T + 24, K.RAFT_X1 + 20), warn: tempo(B).warn });
    api.sfx.bubble();
  }
  function stepBelow(B, a) {
    if (a.st === 'warn') a.u = BELOW_CREEP * Math.min(1, a.t / a.warn);
    if (a.st === 'warn' && a.t >= a.warn) { a.st = 'up'; a.t = 0; api.sfx.swoosh(); C().splash(a.bx, surf(), 14); }
    else if (a.st === 'up') { a.u = BELOW_CREEP + (1 - BELOW_CREEP) * M().ease(Math.min(1, a.t / BELOW_UP)); if (a.t >= BELOW_UP) { a.st = 'hold'; a.t = 0; } }
    else if (a.st === 'hold' && a.t >= BELOW_HOLD) { a.st = 'down'; a.t = 0; }
    else if (a.st === 'down') { a.u = Math.max(0, 1 - a.t / BELOW_DOWN); if (a.t >= BELOW_DOWN) dropArm(B, a); }
  }

  // ink: the octopus puffs its cheeks and spits three blobs; where they land the deck is slippery for a while
  function stepInk(B) {
    if (B.t < INK_PUFF || B.n >= INK_BLOBS) return;
    if (B.t < INK_PUFF + B.n * INK_EVERY) return;
    const h = M().head(B), mx = h.x - 46, my = h.y + 28, i = B.n++;
    const want = pcx() + (i - 1) * INK_SPREAD + (api.boss.rnd(B) - 0.5) * 30;
    const piece = B.rafts.slice().sort((a, b) => Math.abs(a.x + a.w / 2 - want) - Math.abs(b.x + b.w / 2 - want))[0];
    const tx = M().clamp(want, piece.x + INK_W / 2, piece.x + piece.w - INK_W / 2);
    B.shots.push({ type: 'krakeInk', x: mx, y: my, x0: mx, y0: my, tx, t: 0, r: 10 });
    api.sfx.pop(); if (i === 0) api.boss.bark(B, 'ink');
    B.sq = 0.85;
  }
  function shot(B, s, dt) {
    if (s.type !== 'krakeInk') return { dead: false, danger: false };
    const k = Math.min(1, s.t / INK_FLY), ty = deckY(B) - 3;
    s.x = M().lerp(s.x0, s.tx, k); s.y = M().lerp(s.y0, ty, k) - Math.sin(k * Math.PI) * 130;
    if (k < 1) return { dead: false, danger: false };
    if (raftAt(B, s.tx)) { B.inks.push({ x: s.tx, w: INK_W, life: INK_LIFE, t: 0 }); api.burst(s.tx, ty, 10, api.W.ink || '#3B3560', 120, { grav: 500, vy: -80 }); }
    else C().splash(s.tx, surf(), 10);
    api.sfx.land();
    return { dead: true, danger: false };
  }

  // ---------- hazards ----------
  function hazards(B) {
    if (!playing() || B.scenePending != null) return;
    const p = api.p, Mk = M();
    for (const a of B.arms) {
      const ps = poseOf(B, a);
      let hit = false;
      if (a.kind === 'slam') hit = (a.st === 'down' || ((a.st === 'stuck' || a.st === 'miss') && a.t < HIT_DANGER_AFTER)) && Mk.touches(ps, p, 0, Mk.peakK(ps));
      else if (a.kind === 'sweep') hit = a.st === 'go' && Mk.touches(ps, p, 0, SWEEP_HIT_K, 0.85, deckY(B) - SWEEP_LOW);
      else if (a.kind === 'below') hit = a.u > BELOW_HIT_U && Mk.touches(ps, p, 0, BELOW_HIT_K);
      if (hit) { api.hurt(); return; }
    }
  }
  // the water: whoever swims too long gets an arm from below (in the storm's high tide they come anyway)
  function waterArms(B, dt) {
    const tp = tempo(B), p = api.p, busy = B.scenePending != null || ['hurt', 'scene', 'enter'].includes(B.state);
    B.belowCd = Math.max(0, B.belowCd - dt);
    B.wetT = playing() && p.swim && !busy ? B.wetT + dt : 0;
    if (busy || !playing()) return;
    const surge = B.state === 'surge', n = B.arms.filter((a) => a.kind === 'below').length;
    if (B.belowCd > 0 || n >= BELOW_MAX[api.boss.phase(B)] || !(surge || B.wetT > tp.grace)) return;
    if (!surge && n === 0 && !B.said.water) api.boss.bark(B, 'water');
    startBelow(B, pcx());
    B.belowCd = tp.gap;
  }

  // ---------- what comes next ----------
  function nextMove(B) {
    const ph = api.boss.phase(B);
    if (ph === 0) return 'aim';
    if (ph === 1) return ['sweep', 'aim', 'ink', 'aim'][B.mv++ % 4];
    const td = C().tide();
    if (!td) return 'aim';
    if (td.state === 'low' && td.next >= LOW_NEED) return 'aim';
    if (td.state === 'high') return 'surge';
    if (td.state === 'low' && td.next >= SWEEP_NEED) return 'sweep';
    return 'wait';
  }
  function begin(B, move) {
    api.boss.set(B, move);
    if (move === 'aim') startSlam(B);
    else if (move === 'sweep') startSweep(B);
    else if (move === 'ink') { api.sfx.bubble(); }
    else if (move === 'surge') { B.belowCd = 0.35; api.boss.bark(B, 'storm'); }
    B.waitTide = move === 'wait' && C().tide() ? C().tide().state : null;
  }

  // ---------- phase scenes (the core shows bars and lets Mimo wait; they can be skipped like the intro) ----------
  function startScene(B) {
    B.scene = { ph: B.scenePending, t: 0 };
    B.scenePending = null;
    api.boss.scene(B, SCENE_TIME);
    api.boss.set(B, 'scene');
  }
  function stepScene(B, dt) {
    const sc = B.scene; if (!sc) return;
    sc.t += dt;
    if (sc.ph === 1) {
      // a big arm comes down on the middle of the raft and breaks it in two
      if (sc.t > SCENE.ARM_IN && !armOf(B, 'slam') && !sc.struck) { B.arms.push({ kind: 'slam', st: 'rise', t: 0, tx: (M().K.GAP_X0 + M().K.GAP_X1) / 2 }); api.sfx.swoosh(); }
      const a = armOf(B, 'slam');
      if (a && sc.t > SCENE.STRIKE && a.st === 'aim') { a.st = 'down'; a.t = 0; }
      if (a && a.st === 'down' && a.t >= 0.12) { sc.struck = true; a.st = 'stuck'; a.t = 0; breakRaft(B); }
      if (a && sc.struck && sc.t > SCENE.LET_GO && a.st === 'stuck') { a.from = poseOf(B, a); a.st = 'pull'; a.t = 0; }
    } else if (sc.ph === 2) {
      // the storm comes in, two arms grab the raft and hold it, the water starts to churn
      B.stormTo = 1;
      if (sc.t > SCENE.FLASH && !sc.flash) { sc.flash = true; B.flashT = 0.35; api.sfx.boom(); api.shake(0.6); }
      B.holdK = Math.min(1, Math.max(0, (sc.t - SCENE.HOLD0) / SCENE.HOLD_TIME));
      B.anchor = B.holdK;
    }
  }
  function breakRaft(B) {
    const K = M().K, mid = (K.GAP_X0 + K.GAP_X1) / 2, y = deckY(B);
    brokenRaft(B);
    B.dipV += DIP_KICK * 1.4; api.shake(1.2); api.sfx.smash(); api.sfx.crumble();
    api.burst(mid, y, 34, [api.W.pole || '#E7CBA9', '#D9B58A', '#C9A27A'], 260, { grav: 700, rect: true, vy: -200 });
    C().splash(mid, surf(), 24);
    B.broken = 1;
  }
  // the end of a scene (or a skip): the arena is exactly as the new phase needs it
  function finishScene(B) {
    const sc = B.scene; B.scene = null;
    B.arms = []; clearSteps(B);
    buildArena(B, sc.ph);
    if (sc.ph === 2) { api.music.setIntensity(2); }
  }

  // ---------- arena per phase ----------
  function buildArena(B, ph) {
    const K = M().K;
    if (ph === 0) wholeRaft(B); else brokenRaft(B);
    B.broken = ph >= 1 ? 1 : 0;
    if (ph < 2) { B.anchor = 0; B.holdK = 0; B.stormTo = 0; C().setTide(null); C().setWater(K.SURF); return; }
    B.anchor = 1; B.holdK = 1; B.stormTo = 1; B.inks = [];
    // the tide starts at the beginning of low water, so the first strike has time
    C().setTide({ ...STORM_TIDE, offset: -api.time });
  }

  // ---------- the hooks ----------
  function make(B) {
    const K = M().K;
    Object.assign(B, {
      krake: true, x: K.HEAD_X, y: K.HEAD_Y, floor: K.DECK, arms: [], steps: [], rafts: [], inks: [], lean: 0, rise: 0, bob: 0, sink: 0, dip: 0, dipV: 0,
      anchor: 0, holdK: 0, storm: 0, stormTo: 0, broken: 0, wetT: 0, belowCd: 1, knockT: 0, mv: 0, scene: null, scenePending: null, blush: 0,
      flashT: 0, puff: 0, hatFly: null, hatOn: false, waitTide: null,
    });
    api.G.respawn = { x: K.RAFT_X0 + 53, y: K.DECK - 28 };
    // Mimo stands on the deck from the first picture on (the intro freezes him where he is)
    if (api.p) api.p.y = K.DECK - api.p.h;
  }
  function arena(B, ph) { if (B.scenePending != null || B.scene) return; buildArena(B, ph); }
  function respawn(B) {
    const K = M().K, p = api.p;
    B.scene = null; B.scenePending = null; B.arms = []; B.inks = []; clearSteps(B);
    buildArena(B, api.boss.phase(B));
    Object.assign(B, { lean: 0, rise: 1, dip: 0, dipV: 0, wetT: 0, belowCd: 1.5, knockT: 0, sq: 1, mv: 0 });
    p.x = K.RAFT_X0 + 53; p.y = K.DECK - p.h; p.vy = 0;
    placeBodies(B);
  }
  function enter(B) {
    if (B.scene) { finishScene(B); return; }
    B.rise = 1;
  }
  function phase(B, ph) {
    B.scenePending = ph;
    // the core shows the phase line for a while; shorter, so it is gone before the scene's big moment
    api.boss.say(B.def.name, LINES.phase[ph - 1], PHASE_LINE, B.kind);
    releaseSlam(B);
    B.arms = B.arms.filter((a) => a.kind === 'slam');
    if (ph === 2) B.inks = [];
  }

  // things every step needs, also during scenes and after the end
  function animate(B, dt) {
    const tp = tempo(B), stuck = B.state === 'stuck' || (B.scene && armOf(B, 'slam') && armOf(B, 'slam').st === 'stuck');
    B.lean += ((stuck ? 1 : 0) - B.lean) * Math.min(1, dt * (stuck ? 7 : 3));
    B.bob = Math.sin(api.time * 1.3) * 3;
    B.storm += (B.stormTo - B.storm) * Math.min(1, dt * 1.2);
    B.dipV += (-B.dip * DIP_SPRING - B.dipV * DIP_DAMP) * dt; B.dip += B.dipV * dt;
    B.flashT = Math.max(0, B.flashT - dt);
    B.puff += ((B.state === 'ink' && B.t < INK_PUFF + 0.1 ? 1 : 0) - B.puff) * Math.min(1, dt * 8);
    for (const a of B.arms) {
      a.t += dt;
      if (a.kind === 'slam' && a.st === 'stuck') { const left = tp.stuck - B.t; a.wig = left < tp.strain && B.state === 'stuck' ? Math.sin(api.time * 38) * 3.5 : Math.sin(api.time * 3) * 1.5; }
      if (a.kind === 'slam' && a.st === 'pull' && a.t >= PULL_TIME) dropArm(B, a);
      if (a.kind === 'slam' && a.st === 'rise' && B.scene && a.t >= RISE_TIME) { a.st = 'aim'; a.t = 0; }
      if (a.kind === 'below') stepBelow(B, a);
    }
    for (const k of B.inks) { k.t += dt; k.life -= dt; }
    B.inks = B.inks.filter((k) => k.life > 0);
    const hc = M().hat(B);
    B.x = hc.x; B.y = hc.y + 60;
  }
  function ai(B, dt) {
    animate(B, dt);
    const tp = tempo(B), a = armOf(B, 'slam');
    switch (B.state) {
      case 'enter': B.rise = introRise(B); break;
      case 'scene': stepScene(B, dt); break;
      case 'idle': if (B.t > tp.idle) begin(B, nextMove(B)); break;
      case 'wait': { const td = C().tide(); if (B.t > WAIT_MAX || !td || td.state !== B.waitTide) api.boss.set(B, 'idle'); break; }
      case 'aim': if (a) stepAim(B, a, dt); else api.boss.set(B, 'idle'); break;
      case 'slam': if (a && a.t >= tp.slam) impact(B, a); else if (!a) api.boss.set(B, 'idle'); break;
      case 'stuck':
        if (B.t > tp.stuck - tp.strain && !B.n) { B.n = 1; api.floater(B.x - 60, B.y - 100, '!', api.P.thorn); api.sfx.sw(); }
        if (B.t > tp.stuck) { releaseSlam(B); api.boss.set(B, 'pull'); }
        break;
      case 'miss': if (B.t > MISS_TIME) { releaseSlam(B); api.boss.set(B, 'pull'); } break;
      case 'pull': if (B.t > PULL_TIME) api.boss.set(B, 'idle'); break;
      case 'sweep': { const s = armOf(B, 'sweep'); if (s) stepSweep(B, s, dt); else api.boss.set(B, 'idle'); break; }
      case 'ink': stepInk(B); if (B.t > INK_END) api.boss.set(B, 'idle'); break;
      case 'surge': { const td = C().tide(); if (!td || td.state !== 'high') api.boss.set(B, 'idle'); break; }
      case 'hurt':
        if (!B.n) { B.n = 1; releaseSlam(B); B.arms = B.arms.filter((q) => q.kind === 'slam'); B.knockT = KNOCK_TIME; }
        if (B.scenePending != null && playing() && B.t > SCENE_WAIT_MIN && (api.p.grounded || api.p.swim || B.t > SCENE_WAIT_MAX)) startScene(B);
        else if (B.scenePending == null && B.t > HURT_TIME) api.boss.set(B, 'idle');
        break;
      default: api.boss.set(B, 'idle');
    }
    waterArms(B, dt);
    hazards(B);
  }
  // the head comes up out of the water during the intro (slowly the first time)
  function introRise(B) {
    const c = B.cine; if (!c) return 1;
    const t0 = c.full ? 0.4 : 0.05, dur = c.full ? 1.3 : 0.8, k = M().clamp((c.t - t0) / dur, 0, 1);
    if (k > 0 && k < 1 && Math.random() < 0.3) api.G.particles.push({ x: M().K.HEAD_X + (Math.random() - 0.5) * 220, y: M().K.SURF + 4, vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 120, life: 0, max: 0.6, r: 2.5, color: api.W.foam || '#FFFFFF', grav: 500, rect: false, rot: 0 });
    if (k > 0 && !B.splashed) { B.splashed = true; C().splash(M().K.HEAD_X - 60, M().K.SURF, 30); api.sfx.boom(); }
    return M().ease(k);
  }

  function box(B) {
    const b = M().hatBox(B);
    return { l: b.l, r: b.r, top: b.top, bottom: b.bottom, soft: B.state === 'stuck', harmless: true };
  }

  // ---------- the end: the hat flies, the octopus blushes and sinks, the hat lands by Mimo and hops on ----------
  function defeat(B) {
    const hc = M().hat(B);
    B.fin = { x0: hc.x, y0: hc.y, landed: false, on: false };
    B.knockT = KNOCK_TIME;
    B.hatFly = { x: hc.x, y: hc.y, rot: hc.rot, scale: 1 };
    B.arms.forEach((a) => { if (a.kind === 'slam') { a.from = poseOf(B, a); a.st = 'pull'; a.t = 0; } });
    B.arms = B.arms.filter((a) => a.kind === 'slam'); clearSteps(B);
    C().setTide(null); C().moveWater(M().K.SURF, 1.2);
  }
  function afterDefeat(B, dt) {
    animate(B, dt);
    // an own clock: the core resets B.t when a scene ends, the finale must not start over
    const f = B.fin, t = (f.t = (f.t || 0) + dt), p = api.p, K = M().K, hf = B.hatFly;
    closing(B, f, t);
    // the core says the last line right away; it would cover the raft while the hat lands, so it waits for the punchline
    if (!f.cry) { f.cry = true; api.boss.say(B.def.name, LINES.cry, FIN.CRY, B.kind); }
    B.blush = Math.min(1, t / 0.5); B.stormTo = 0; B.anchor = Math.max(0, B.anchor - dt * 0.8); B.holdK = Math.max(0, B.holdK - dt * 1.5);
    B.sink = FIN.SINK_DEPTH * M().ease(M().clamp((t - FIN.SINK0) / (FIN.SINK1 - FIN.SINK0), 0, 1));
    if (t > FIN.SINK0 && !f.splash) { f.splash = true; C().splash(K.HEAD_X - 40, surf(), 34); C().splash(K.HEAD_X + 60, surf(), 24); B.dipV -= 120; api.sfx.bubble(); }
    if (t > FIN.SINK0 + 0.6 && !f.wave) { f.wave = true; C().moveWater(K.SURF - 10, 0.35); }
    if (f.wave && !f.calm && t > FIN.SINK0 + 1.0) { f.calm = true; C().moveWater(K.SURF, 1.0); B.dipV += 90; }
    if (!f.on) {
      // flight: up and spinning while the slow motion lasts, then an arc down to the deck beside Mimo
      if (t < FIN.POP) { const k = t / FIN.POP; hf.x = f.x0 - FIN.POP_SIDE * k; hf.y = f.y0 - FIN.POP_UP * M().ease(k); hf.rot = (api.time * 9) % (Math.PI * 2); }
      else if (t < FIN.FLY) {
        if (!f.to) { const side = pcx() < M().K.WEST + 450 ? 1 : -1, piece = raftAt(B, pcx() + side * FIN.BESIDE) || B.rafts[0]; f.to = { x: M().clamp(pcx() + side * FIN.BESIDE, piece.x + 24, piece.x + piece.w - 24) }; f.px = hf.x; f.py = hf.y; }
        const k = (t - FIN.POP) / (FIN.FLY - FIN.POP), ty = deckY(B) - 14;
        hf.x = M().lerp(f.px, f.to.x, M().ease(k)); hf.y = M().lerp(f.py, ty, k * k) - Math.sin(k * Math.PI) * FIN.ARC;
        hf.rot = (1 - k) * FIN.SPIN * Math.PI * 2; hf.scale = M().lerp(1, FIN.HAT_SMALL, k);
      } else if (!f.landed) { f.landed = true; hf.rot = 0; hf.y = deckY(B) - 14; api.sfx.land(); api.shake(0.4); api.dust({ x: hf.x - 30, y: hf.y - 10, w: 60, h: 10 }, 8); }
      else if (t < FIN.HOP) hf.y = deckY(B) - 14;
      else {
        const k = Math.min(1, (t - FIN.HOP) / FIN.HOP_TIME), tx = pcx(), ty = p.y + 2;
        if (!f.hx) { f.hx = hf.x; f.hy = hf.y; api.sfx.bounce(); }
        hf.x = M().lerp(f.hx, tx, k); hf.y = M().lerp(f.hy, ty, k) - Math.sin(k * Math.PI) * 50; hf.scale = M().lerp(FIN.HAT_SMALL, FIN.HAT_ON, k);
        if (k >= 1) { f.on = true; B.hatOn = true; api.boss.wear(); api.boss.say(B.def.name, LINES.beaten, FIN.LAST, B.kind); api.sfx.key(); api.ring(tx, ty, api.P.key); api.setMood('happy', 1.5); api.burst(tx, ty, 10, api.P.key, 110, { grav: 200 }); }
      }
      B.x = hf.x; B.y = hf.y + 44;
    }
  }
  // the closing scene; the door opens after it (or after FIN.CLOSE when it does not play, under test automation)
  function closing(B, f, t) {
    const cl = C().closing; if (!cl) return;
    if (f.on && !f.close && t > FIN.CLOSE) { f.close = true; f.closeRan = cl.start(B); }
    if (f.closeRan && !cl.finished()) B.t = Math.min(B.t, 0.5);
    if (f.closeRan && cl.finished() && !f.doorFree) { f.doorFree = true; B.t = Math.max(B.t, DOOR_AFTER + 0.05); }
  }
  const DOOR_AFTER = FIN.CLOSE + 0.6;
  // the door rises on the piece of raft Mimo is on (or the nearest), at its far end, so he never has to swim for it
  function door(B) {
    const x = pcx(), piece = raftAt(B, x) || B.rafts.slice().sort((a, b) => Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x))[0];
    const left = Math.ceil(piece.x / T), right = Math.floor((piece.x + piece.w) / T) - 1;
    return { x: Math.abs(x - (left * T + T / 2)) > Math.abs(x - (right * T + T / 2)) ? left : right, y: 9 };
  }

  // ---------- the world's hooks for this fight ----------
  function update(dt) {
    const B = fight(); if (!B) return;
    const p = api.p;
    placeBodies(B);
    // slippery ink under Mimo's feet (the physics hook asks)
    B.slick = !!p && !!p.carried && p.carried.krake === 'raft' && B.inks.some((k) => Math.abs(pcx() - k.x) < k.w / 2);
    if (!p || !playing()) return;
    // the hat flicks Mimo back towards the raft after a hit
    if (B.knockT > 0) { B.knockT -= dt; if (!p.grounded) p.x = Math.max(T, p.x - KNOCK_SPEED * dt); }
    // the octopus' body under the head: a swimmer is pushed back out
    const K = M().K;
    if (p.swim && pcx() > K.HEAD_X - K.HEAD_RX + 40 && !B.done) p.x -= HEAD_PUSH * dt;
  }
  function physics(p) { const B = fight(); return B && B.slick && !p.swim ? { accel: INK_ACCEL } : null; }
  function camera(B, t) {
    const v = api.view, p = api.p, K = M().K;
    const whole = (K.RAFT_X0 + K.HEAD_X + K.HEAD_RX) / 2 - v.w / 2;
    if (api.state === 'cine') return { x: whole, y: 0 };
    if (B.done && B.t < FIN.FRAME) return { x: whole, y: CAM_LOW_Y };
    // phones see it all; narrower screens lean towards the head and never lose Mimo; a sweep that winds up at the left
    // edge pulls the picture left so its arm is in view
    const px = pcx(), sw = armOf(B, 'sweep'), want = sw && sw.st === 'wind' ? 0 : (px + B.x) / 2 - v.w / 2;
    return { x: M().clamp(want, px - v.w + 120, px - 120), y: M().clamp(t.y, 0, CAM_LOW_Y) };
  }
  function voice() { const f = 120 + Math.random() * 70; api.voice({ type: 'triangle', f0: f * 1.3, f1: f, slide: 0.07, attack: 0.012, dur: 0.1, vol: 0.05, lp: 900 }); api.voice({ type: 'sine', f0: f * 2.6, f1: f * 1.8, slide: 0.05, dur: 0.05, vol: 0.018 }); }

  const MAP = [
    ...Array.from({ length: 8 }, () => '|                             |'),
    '|     P                       |',
    '|                             |',
    '|                             |',
    '|                             |',
    '| C    W    C      W   C   W  |',
    '###############################',
  ];

  window.MimoWorlds.register({
    world: 4,
    tiles: { '|': { solid: true, lint: { name: 'Arenarand', color: 'rgba(0,0,0,.15)' }, draw() {} } },
    setup(a) { api = a; },
    update, physics,
    boss: {
      name: 'Käpt’n Krake', kicker: 'Schrecken der Bucht', song: 'bossCoast', hp: 6, phases: [6, 4, 2], doorAfter: DOOR_AFTER,
      hint: 'Der <b>Schatten</b> zeigt, wo ein Arm einschlägt. Steckt er fest, hüpf über die <b>Saugnäpfe</b> hinauf und spring der Krake auf die Mütze.',
      lines: LINES, map: MAP, water: 11,
      make, arena, respawn, enter, ai, box, phase, defeat, afterDefeat, door, shot, camera, voice,
      draw: (B, ctx) => M().draw(B, ctx), drawFront: (B, ctx) => M().drawFront(B, ctx), drawShot: (B, s, ctx) => M().drawShot(B, s, ctx),
      // read by tools/bosscheck.mjs (coast-boss-bot.js fills them in)
      get bot() { return M().bot; }, get checkShots() { return M().checkShots; }, get idleSpots() { return M().idleSpots; },
    },
  });
  Object.assign(window.MimoKrake = window.MimoKrake || {}, { TEMPO, poseOf, deckY, armOf, raftAt, LINES });
})();
