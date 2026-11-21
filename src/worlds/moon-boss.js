// World 6 boss "Mondwurm Käsebert": the fight. The last boss of the game: a huge friendly cheese worm who has eaten
// too much of the moon's cheese (and, as it turns out at the end, an astronaut's glass helmet; that is the pink glow in
// his belly and why he is so grumpy). He dives from crater to crater, his body spans an arc over the crater field.
// Core loop: the ground trembles at the crater nearest to Mimo (dust, a pink ring); the head bursts out there, flies
// over the arena and dives into the next crater, where it munches cheese. Now the arc stands still, the pink segment
// at its top. The dive sends a ripple of moon dust along the ground (hop over it). Mimo lands on the pink segment from
// above: that tickles, Käsebert giggles and hiccups. That is the hit. Six lives, three phases:
//   1 Krater         the arc is low: the full moon jump reaches the pink segment
//   2 Sternschnuppen the arc is higher, shooting stars under its top throw Mimo up; meteors fall where he stands
//   3 Dunkle Seite   darkness, faster, two ripples per dive, more meteors
// Scenes and finale: moon-boss-scenes.js; shapes: moon-boss-shape.js; picture: moon-boss-draw.js; song and costume:
// moon-boss-look.js; bot and test pictures: moon-boss-bot.js. Everything runs on the fight clock and fixed steps.
(function () {
  'use strict';
  let api = null;
  const K = () => window.MimoKaese;

  // ---------- tuning (seconds and pixels) ----------
  // per phase: wait under the ground, warning at the crater, flying speed of the head, time he munches (the window
  // for the hit), ripple speed and count, meteors per dive, the time the slurp back in takes
  const TEMPO = [
    { under: 0.6, warn: 1.3, speed: 430, rest: 5.0, ripple: 250, ripples: 1, meteors: 0 },
    { under: 0.5, warn: 1.2, speed: 470, rest: 4.6, ripple: 270, ripples: 1, meteors: 2 },
    { under: 0.45, warn: 1.1, speed: 500, rest: 4.4, ripple: 280, ripples: 2, meteors: 2 },
  ];
  const BURST = { H: 120, R: 34 };                 // the head hurts while it bursts out (centre lower than H above ground)
  const THUMP = 0.35, RIPPLE_GAP = 0.75;           // the dive thumps after THUMP s, a second ripple RIPPLE_GAP s later
  const RIPPLE = { H: 16, HALF: 10 };               // ripple height, half width of its hurting part
  const MET = { WARN: 1.3, FLY: 0.5, R: 30, BLAST: 0.12, BODY: 10, AT: [0.05, 0.7], HIGH: 340, SLANT: 150 };
  const SLURP = 620, GIGGLE = 0.85, BOUNCE = 560, RESPAWN_WAIT = 1.2;
  const DARKSIDE = { r: 6 * 32, a: 0.8 };
  const EARTH = { SET: 300, UP: 60, BIG: 1.9 };   // px the Earth sinks on the dark side, where it rises to, its size then

  const LINES = {
    intro: ['Wer hüpft da auf MEINEM Mond herum?', 'Piep!', 'Ich bin Käsebert. Und mir ist so komisch im Bauch!'],
    again: 'Du schon wieder? Mein Bauch grummelt noch.',
    tickle: ['Hihi! Nicht kitzeln!'],
    hit: ['Hihihi! Das kitzelt!', 'Hicks! Hör auf, hihi!', 'Nicht am Bauch! Hihi!'],
    phase: ['Jetzt wird es sternig!', 'Licht aus! Hier kommt die dunkle Seite.'],
    stun: ['Mampf. Mampf.', 'Lecker Mondkäse.', 'Nur ein Bissen noch.'],
    beaten: 'Hihihi... HICKS!',
    piep: ['Piep? Ich sag Mampf!', 'Was piepst da so?'],
    emerge: ['Kuckuck!', 'Huhu, von unten!', 'Hier bin ich!'],
    stars: ['Vorsicht, da fällt was runter!'],
  };

  const fight = () => (api && api.mode === 'boss' && api.G.boss && api.G.boss.kaese ? api.G.boss : null);
  const tempo = (B) => TEMPO[api.boss.phase(B)];
  const playing = () => api.state === 'play';
  const pcx = () => api.p.x + api.p.w / 2;
  const moon = () => window.MimoMoon.state(api.L);

  // ---------- the worm on its path ----------
  function setPath(B, P, s) { B.P = P; B.s = s; K().placeWorm(B, P, s); }
  function startPass(B) {
    const [a, b] = K().pair(pcx());
    B.pass = K().arcFor(api.boss.phase(B), a, b);
    setPath(B, B.pass, -K().HEAD_R - 20);
    B.ripples = 0; B.mets = 0; B.thumped = false;
    api.boss.set(B, 'warn');
    api.noise({ lp: 180, f1: 60, dur: tempo(B).warn, vol: 0.05 });
  }
  // the pink segment: its centre now
  const pink = (B) => ({ x: B.worm.x[K().PINK_K], y: B.worm.y[K().PINK_K] });

  // his back carries Mimo while he munches: the pink segment and its two neighbours (bodies, like lifts)
  function placeBack(B) {
    const on = B.state === 'hold' && playing(), w = B.worm, r = K().SEG_R;
    for (let j = 0; j < 3; j++) {
      const b = B.back[j], i = K().PINK_K - 1 + j;
      b.w = j === 1 ? 2 * r - 6 : 2 * r - 14; b.x = w.x[i] - b.w / 2; b.y = w.y[i] - r + 3; b.off = !on;
    }
  }

  // ---------- ripples and meteors ----------
  function thump(B, n) {
    const tp = tempo(B), x = K().CRATERS[B.pass.b];
    for (const dir of [-1, 1]) B.shots.push({ type: 'kRipple', x: x + dir * K().CRATER_RX * 0.7, dir, v: tp.ripple, t: 0, r: 0 });
    api.sfx.stomp(); api.shake(0.45); api.noise({ lp: 300, f1: 70, dur: 0.4, vol: 0.06 });
    api.burst(x, K().GY - 4, 14, [api.W.dust || '#ECEAF8', api.W.cheese || '#F3D98B'], 160, { grav: 260, vy: -120 });
    if (n === 0 && api.boss.phase(B) === 0 && !B.said.ripple) { B.said.ripple = true; api.bubble('Hüpf drüber!', 'player', 1.1); }
  }
  function meteor(B) {
    const x = K().clamp(pcx(), 2 * K().T, K().W - 2 * K().T);
    B.shots.push({ type: 'kMeteor', x, t: 0, r: 0, side: B.mets % 2 ? -1 : 1 });
    if (B.mets === 0 && !B.said.met) { B.said.met = true; api.boss.say(B.def.name, api.pick(LINES.stars), 1.4, B.kind); }
    B.mets++;
  }
  function touchCircle(cx, cy, r) {
    const p = api.p, nx = Math.max(p.x + 3, Math.min(cx, p.x + p.w - 3)), ny = Math.max(p.y + 3, Math.min(cy, p.y + p.h - 2));
    return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
  }
  function shot(B, s, dt, play) {
    if (s.type === 'kRipple') {
      s.t += dt; s.x += s.dir * s.v * dt;
      const p = api.p;
      if (play && !B.done && p.y + p.h > K().GY - RIPPLE.H + 3 && Math.abs(pcx() - s.x) < RIPPLE.HALF + p.w / 2 - 3) api.hurt();
      return { dead: s.x < K().T - 10 || s.x > K().W - K().T + 10, danger: false };
    }
    if (s.type === 'kMeteor') {
      s.t += dt;
      const k = s.t - (MET.WARN - MET.FLY), gy = K().GY;
      s.fly = k > 0 && s.t < MET.WARN;
      if (s.fly) { const e = k / MET.FLY; s.rx = s.x + s.side * MET.SLANT * (1 - e); s.ry = gy - MET.HIGH * (1 - e); }
      if (s.t >= MET.WARN && !s.hit) { s.hit = true; api.burst(s.x, gy - 3, 14, [api.W.dust || '#ECEAF8', api.W.meteor || '#E5847A', api.W.tail || '#FFC978'], 150, { grav: 260, vy: -110, life: 0.5 }); api.ring(s.x, gy - 4, api.W.warn || '#F08DB0'); api.noise({ lp: 600, f1: 90, dur: 0.3, vol: 0.05 }); api.shake(0.2); }
      if (play && !B.done && ((s.fly && touchCircle(s.rx, s.ry, MET.BODY)) || (s.t >= MET.WARN && s.t < MET.WARN + MET.BLAST && touchCircle(s.x, gy - 4, MET.R)))) api.hurt();
      return { dead: s.t > MET.WARN + 0.5, danger: false };
    }
    return { dead: false, danger: false };
  }

  // ---------- the hit: Mimo lands on the pink segment ----------
  function tickle(B) {
    const q = pink(B), p = api.p;
    B.hitAt = q; B.hitNow = true;
    api.boss.hit(B);
    B.hitNow = false;
    p.vy = -BOUNCE; p.carried = null; p.canCut = false; p.sx = 0.8; p.sy = 1.25;
    B.giggle = 1; B.mood = 'giggle';
  }

  // ---------- the hooks ----------
  function make(B) {
    Object.assign(B, {
      kaese: true, floor: K().GY, worm: { x: new Float32Array(0), y: new Float32Array(0), n: 0, hx: 0, hy: 0, hdx: 0, hdy: -1, s: 0, P: null },
      P: null, s: 0, pass: null, ripples: 0, mets: 0, thumped: false, giggle: 0, mood: 'grumpy', munch: 0, scene: null, scenePending: null,
      fin: null, helmOn: false, wait: 0, sinking: false, dust: [], earth: 0, darkK: 0, hitNow: false, hitAt: null,
      back: [0, 1, 2].map((j) => ({ kaese: j === 1 ? 'pink' : 'seg', x: 0, y: -999, w: 40, off: true })),
    });
    for (const b of B.back) api.L.bodies.push(b);
    setPath(B, K().towerPath(1, 205, -60), -K().HEAD_R - 30);
    B.x = K().CRATERS[1]; B.y = K().GY;
  }
  function arena(B, ph) { if (B.scenePending != null || B.scene) return; buildArena(B, ph); }
  function buildArena(B, ph) {
    const m = moon(), T = K().T;
    // shooting stars under the top of each arc (phases 2 and 3)
    m.boosts = ph === 0 ? [] : [0, 1].map((i) => {
      const x = (K().CRATERS[i] + K().CRATERS[i + 1]) / 2;
      return { tx: Math.floor(x / T), ty: Math.floor(K().STAR_Y / T), cx: x, cy: K().STAR_Y, v: window.MimoMoon.BOOST.V, ready: true, t: 0 };
    });
    m.dark = ph === 2 ? { r: DARKSIDE.r, a: DARKSIDE.a } : null;
    B.darkK = ph === 2 ? 1 : 0;
    api.G.respawn = { x: 9 * T + T / 2 - api.p.w / 2, y: K().GY - api.p.h };
  }
  function respawn(B) {
    const ph = api.boss.phase(B), p = api.p;
    Object.assign(B, { scene: null, scenePending: null, pass: null, giggle: 0, mood: 'grumpy' });
    buildArena(B, ph);
    setPath(B, K().arcFor(ph, 0, 1), -K().HEAD_R - 20);
    p.x = api.G.respawn.x; p.y = api.G.respawn.y; p.vy = 0;
    B.wait = RESPAWN_WAIT;
  }
  function enter(B) {
    if (B.scene) { window.MimoKaese.finishScene(B); return; }
    // after the intro he sinks back into the crater, then the fight begins
    B.sinking = true; B.wait = 0.4;
  }
  function phase(B, ph) { B.scenePending = ph; }

  // things every step needs, also during scenes and after the end
  function animate(B, dt) {
    B.giggle = Math.max(0, B.giggle - dt * 0.8);
    B.munch += dt;
    for (let i = B.dust.length - 1; i >= 0; i--) { const q = B.dust[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; if (q.t > q.life) B.dust.splice(i, 1); }
    if (B.P) K().placeWorm(B, B.P, B.s);
    const q = B.worm.n ? pink(B) : { x: K().CRATERS[1], y: K().GY };
    B.x = K().clamp(q.x, K().T + 2, K().W - K().T - 2); B.y = q.y;
  }
  // the ground trembles at crater c: hopping dust
  function tremble(B, c, k) {
    if (api.reduced || Math.random() > 0.35 + k * 0.5) return;
    const x = K().CRATERS[c] + (Math.random() - 0.5) * K().CRATER_RX * 1.8;
    B.dust.push({ x, y: K().GY - 2, vx: (Math.random() - 0.5) * 20, vy: -60 - Math.random() * 70 * (0.5 + k), r: 2 + Math.random() * 2.5, t: 0, life: 0.6 });
  }
  function ai(B, dt) {
    animate(B, dt);
    const tp = tempo(B);
    switch (B.state) {
      case 'enter': window.MimoKaese.introRise(B); break;
      case 'scene': window.MimoKaese.stepScene(B, dt); break;
      case 'idle':
        // under the ground: the intro worm sinks back first; then he picks the crater nearest to Mimo
        if (B.sinking) { B.s -= SLURP * dt; if (B.s < -K().HEAD_R - 20) B.sinking = false; break; }
        if (B.wait > 0) { B.wait -= dt; break; }
        if (B.t > tp.under) startPass(B);
        break;
      case 'warn': tremble(B, B.pass.a, B.t / tp.warn); if (B.t >= tp.warn) { api.boss.set(B, 'rise'); api.sfx.boom(); api.shake(0.6); B.mood = 'grumpy'; if (!B.said.emerge || api.boss.rnd(B) < 0.3) api.boss.bark(B, 'emerge'); } break;
      case 'rise': stepRise(B, dt, tp); break;
      case 'hold': stepHold(B, tp); break;
      case 'slurp': B.s += SLURP * dt; if (B.s - (B.P.n + 1) * B.P.gap > B.P.total + 20) { api.boss.set(B, 'idle'); B.pass = null; } break;
      case 'hurt':
        if (B.t < GIGGLE) break;
        if (B.scenePending != null && playing()) { if (api.p.grounded || B.t > GIGGLE + 1.2) window.MimoKaese.startScene(B); }
        else { api.boss.set(B, 'slurp'); B.mood = 'grumpy'; }
        break;
      default: api.boss.set(B, 'idle');
    }
  }
  function stepRise(B, dt, tp) {
    const P = B.pass, was = B.s;
    // his burst shakes meteors loose: they fall where Mimo stands
    for (let i = 0; i < tp.meteors; i++) if (B.mets === i && B.t >= MET.AT[i]) meteor(B);
    B.s = Math.min(P.hold, B.s + tp.speed * dt);
    if (was < 0 && B.s >= 0) {
      const x = K().CRATERS[P.a];
      api.burst(x, K().GY - 6, 22, [api.W.dust || '#ECEAF8', api.W.cheese || '#F3D98B', api.W.cheeseHole || '#D9B85F'], 220, { grav: 300, vy: -200 });
    }
    // the head bursting out of the crater hurts (it is big and fast); once in the air he is harmless
    K().placeWorm(B, P, B.s);
    const w = B.worm;
    if (playing() && K().GY - w.hy < BURST.H && w.hy < K().GY + 10 && touchCircle(w.hx, w.hy, BURST.R)) api.hurt();
    if (B.s >= P.hold) { api.boss.set(B, 'hold'); B.mood = 'munch'; api.sfx.land(); if (api.boss.rnd(B) < 0.5) api.boss.bark(B, 'stun'); }
  }
  function stepHold(B, tp) {
    if (!B.thumped && B.t >= THUMP) { B.thumped = true; thump(B, 0); B.ripples = 1; }
    if (B.ripples < tp.ripples && B.t >= THUMP + RIPPLE_GAP * B.ripples) { thump(B, B.ripples); B.ripples++; }
    if (B.t > tp.rest) { api.boss.set(B, 'slurp'); api.sfx.sw(); B.mood = 'grumpy'; }
  }
  // no box: the hit comes from landing on the pink segment (api.boss.hit); for the hit itself the segment is the box
  function box(B) {
    if (!B.hitNow || !B.hitAt) return { l: -9999, r: -9999, top: -9999, bottom: -9998, soft: false, harmless: true };
    const q = B.hitAt, r = K().SEG_R; return { l: q.x - r, r: q.x + r, top: q.y - r, bottom: q.y + r, soft: false, harmless: true };
  }

  // ---------- the world's hooks for this fight ----------
  function update() {
    const B = fight(); if (!B) return;
    if (B.P) K().placeWorm(B, B.P, B.s);
    placeBack(B);
    const p = api.p;
    if (p && B.state === 'hold' && playing() && !B.done && p.carried === B.back[1]) tickle(B);
    // the dark side comes and goes with the scenes (moon-look.js paints it)
    const m = moon(); if (m.dark) m.dark.a = DARKSIDE.a * B.darkK;
    // the Earth sets behind the hills on the dark side; in the finale it rises big over the crater field
    const e = m.earth || (m.earth = { dx: 0, dy: 0, s: 1 });
    if (B.fin) { e.dx = api.view.w * 0.36; e.dy = K().lerp(EARTH.SET, EARTH.UP, B.earth); e.s = K().lerp(1.3, EARTH.BIG, B.earth); }
    else { e.dx = 0; e.dy = EARTH.SET * B.darkK; e.s = 1; }
  }
  const ROCKET_ROOM = 16;                            // space between the rocket and the edge of the picture in the finale
  function camera(B, t) {
    const mid = K().W / 2 - api.view.w / 2;
    // the finale: on a narrow screen move right until the whole rocket is inside the safe part (never past the arena's end)
    if (B.done) {
      const need = K().rocketX() + K().ROCKET.HALF + ROCKET_ROOM + api.view.safeR - api.view.w;
      return { x: Math.max(mid, Math.min(need, K().W - api.view.w)), y: t.y };
    }
    if (B.scene || B.state === 'enter') return { x: mid, y: t.y };
    return t;
  }
  function voice() { const f = 150 + Math.random() * 70; api.voice({ type: 'triangle', f0: f * 1.3, f1: f, slide: 0.1, attack: 0.02, dur: 0.13, vol: 0.04, lp: 1200 }); api.voice({ type: 'sine', f0: f * 2.6, f1: f * 2, slide: 0.08, dur: 0.07, vol: 0.02 }); }

  window.MimoWorlds.register({
    world: 6,
    setup(a) { api = a; },
    update,
    boss: {
      name: 'Mondwurm Käsebert', kicker: 'Hüter der Krater', song: 'bossMoon', hp: 6, phases: [6, 4, 2],
      // the door (the rocket hatch) opens when the rocket has landed, after the Earth has risen and the last lines are said
      doorAfter: 8.4,
      // the win card waits until the rocket has lifted off and left the picture (launch in moon-boss-draw.js)
      winAfter: 3.6,
      hint: 'Hüpf über den <b>Mondstaub</b>. Frisst Käsebert, spring auf das <b>rosa Glied</b> ganz oben.',
      lines: LINES, map: K().MAP,
      make, arena, respawn, enter, ai, box, phase, shot, camera, voice,
      defeat: (B) => K().defeat(B), afterDefeat: (B, dt) => { animate(B, dt); K().afterDefeat(B, dt); }, door: (B) => K().door(B),
      draw: (B, ctx) => K().draw(B, ctx), drawFront: (B, ctx) => K().drawFront(B, ctx), drawShot: (B, s, ctx) => K().drawShot(B, s, ctx),
      // read by tools/bosscheck.mjs (moon-boss-bot.js fills them in)
      get bot() { return K().bot; }, get checkShots() { return K().checkShots; }, get idleSpots() { return K().idleSpots; },
    },
  });
  Object.assign(window.MimoKaese = window.MimoKaese || {}, { TEMPO, MET, RIPPLE, LINES, DARKSIDE, setPath, buildArena, pink, fight, tremble });
})();
