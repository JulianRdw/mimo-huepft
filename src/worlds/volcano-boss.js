// World 5 boss "Drache Fauch": the fight. A huge pastel dragon winds through a crater shaft; only head, neck, coils and
// tail are ever in the picture. A climbing fight on three floors of the shaft, with the lava rising below.
// Core loop: Fauch hangs at one wall, his throat glows and the ledge Mimo stands on lights up; then his fire sweeps over
// that ledge, across the whole shaft. Afterwards he is out of breath and lays his chin on the rock under the cold water
// pipe. His snout is the only step up to the valve ledge: up his nose, onto the ledge, onto the lever, and the cold
// shower pours over his hot head. That is the hit. Six lives, three phases (one floor each):
//   1 Der Schacht  single fire sweeps, lots of time, the lava only creeps.
//   2 Glutspucke   he also spits glowing blobs at Mimo; the pushed-up ledge is still hot, the far ledge is basalt.
//   3 Ausbruch     two sweeps in a row, the lava rises over the floor ledge, the free part of the chin rock is hot.
// Between the phases the eruption pushes the fight a floor up (volcano-boss-scenes.js), at the end it shoots Mimo out
// of the crater. Shapes: volcano-boss-shape.js; picture, song and costume: volcano-boss-draw.js, volcano-boss-look.js;
// bot and test pictures: volcano-boss-bot.js. Everything runs on the fight clock and the seeded boss generator.
(function () {
  'use strict';
  let api = null;
  const F = () => window.MimoFauch;

  // ---------- tuning (seconds and pixels) ----------
  // per phase: pause before an attack, how long the head follows Mimo's ledge, the glow before the fire, how long he
  // rests, glowing blobs per attack, a second sweep (its follow and glow time)
  const TEMPO = [
    { idle: 0.7, track: 1.0, charge: 1.25, rest: 5.6, spit: 0, double: false },
    { idle: 0.55, track: 1.05, charge: 1.1, rest: 5.0, spit: 2, double: false },
    { idle: 0.45, track: 0.9, charge: 1.0, rest: 4.6, spit: 0, double: true, track2: 0.7, charge2: 0.9 },
  ];
  const FLAME = { GROW: 0.18, FULL: 0.62, FADE: 0.24 };   // the fire burns while it grows and while it is full
  const FLY = 0.8, FLY_ARC = 120, WAKE = 0.55, HURT = 2.0, LURK = 0.6, FOLLOW = 7;
  const SPIT = { AT: [0.22, 0.6], AIR: 0.9, ARC: 150, DANGER: 0.55, R: 11 };
  const WATER = { SPEED: 900, ON: 1.0 };
  const LAVA_SINK = 70;                                   // after a hit the lava sinks back to its start (px/s)
  const SCENE_WAIT_MIN = 0.5, SCENE_WAIT_MAX = 1.6;

  const LINES = {
    intro: ['Wer klettert da in MEINEM Schacht?', 'Piep!', 'Ich bin Fauch. Und ich bin heiß drauf!'],
    again: 'Schon wieder du? Mir ist warm genug.',
    tickle: ['He, das kitzelt!'],
    hit: ['Kalt! Kalt! KALT!', 'Hatschi! Wer hat das Wasser angestellt?', 'Meine schöne Glut!'],
    phase: ['Jetzt wird es richtig heiß!', 'Alles nach oben!'],
    stun: ['Hechel. Kurze Pause.', 'Puh. Feuer macht durstig.', 'Nur kurz verschnaufen.'],
    beaten: 'Na gut. Ich war eh zu heiß.',
    piep: ['Piep? Ich sag Fauch!', 'Lauter, ich hör nur Blubbern.'],
    miss: ['Daneben! Hihi.', 'Nass, aber nicht ich.'],
    step: ['He! Ich bin doch keine Treppe!', 'Runter von meiner Nase!'],
    fire: ['Fauch! Fauch!', 'Achtung, heiß!', 'Jetzt wird gegrillt!'],
    spit: ['Ptui! Glut für dich!', 'Glut zum Mitnehmen!'],
  };

  const fight = () => (api && api.mode === 'boss' && api.G.boss && api.G.boss.fauch ? api.G.boss : null);
  const tempo = (B) => TEMPO[api.boss.phase(B)];
  const playing = () => api.state === 'play';
  const pcx = () => api.p.x + api.p.w / 2;

  // ---------- the head: a target pose and a move towards it ----------
  function moveHead(B, to, dur, arc) { const h = B.head; B.hm = { x0: h.x, y0: h.y, f0: h.f, to, t: 0, dur, arc: arc || 0 }; }
  function stepHead(B, dt) {
    const h = B.head, m = B.hm; if (!m) return;
    m.t += dt;
    const k = F().clamp(m.t / m.dur, 0, 1), e = F().ease(k);
    h.x = F().lerp(m.x0, m.to.x, e); h.y = F().lerp(m.y0, m.to.y, e) - Math.sin(k * Math.PI) * m.arc;
    if (k > 0.5) h.f = m.to.f;
    if (k >= 1) B.hm = null;
  }
  // follow a moving target (the ledge Mimo stands on while the head tracks him)
  function chaseHead(B, to, dt) { const h = B.head, k = 1 - Math.exp(-FOLLOW * dt); B.hm = null; h.x += (to.x - h.x) * k; h.y += (to.y - h.y) * k; h.f = to.f; }
  const resting = (B) => B.state === 'pant' || B.state === 'wake';

  // the snout and the skull are steps while he rests (bodies carry Mimo like lifts)
  function placeSteps(B) {
    const h = B.head, H = F().HEAD, on = resting(B) && !B.hm;
    const set = (b, a, c, top) => { const x0 = h.x - h.f * a, x1 = h.x - h.f * c; b.x = Math.min(x0, x1); b.w = Math.abs(x1 - x0); b.y = top; b.off = !on; };
    const breath = on && B.state === 'pant' ? Math.sin(api.time * 3) * 1.5 : 0;
    set(B.snout, H.STEP_A, H.STEP_B, h.y - H.SNOUT_TOP + breath);
    set(B.skull, H.SKULL_A, H.SKULL_B, h.y - H.RY + breath);
  }
  // the head lies down where Mimo stands: he ends up on top of it
  function liftMimo(B) {
    const p = api.p, h = B.head, H = F().HEAD;
    if (p.x + p.w < Math.min(h.x - h.f * H.SNOUT, h.x + h.f * H.RX) || p.x > Math.max(h.x - h.f * H.SNOUT, h.x + h.f * H.RX)) return;
    if (p.y + p.h <= h.y - H.RY || p.y > h.y + H.RY) return;
    const onSnout = Math.abs(pcx() - (h.x - h.f * (H.STEP_A + H.STEP_B) / 2)) < 30;
    p.y = (onSnout ? B.snout.y : B.skull.y) - p.h; p.vy = 0;
  }

  // ---------- the lava ----------
  // the floor the lava belongs to: after the last hit of a phase it stays on the old floor until the scene moves it
  const lavaFloor = (B) => api.boss.phase(B) - (B.scenePending != null ? 1 : 0);
  function lavaStart(B) { const s = lavaFloor(B), sec = F().SEC[s]; return F().secY(s, 0) + sec.lava.start; }
  function stepLava(B, dt) {
    const s = lavaFloor(B), sec = F().SEC[s], cap = F().secY(s, 0) + sec.lava.cap;
    if (B.scene || B.done) return;
    if (B.state === 'hurt' || B.lavaBack) { B.lavaY = Math.min(lavaStart(B), B.lavaY + LAVA_SINK * dt); if (B.lavaY >= lavaStart(B)) B.lavaBack = false; }
    else if (playing() && B.state !== 'enter') B.lavaY = Math.max(cap, B.lavaY - sec.lava.speed * dt);
  }
  const setLava = (B) => { const v = api.L.volcano; if (v) v.riseY = B.lavaY; };

  // ---------- the lever and the shower ----------
  function stepLever(B, dt) {
    const s = api.boss.phase(B), lv = F().lever(s), p = api.p;
    B.leverK = Math.max(0, B.leverK - dt * (B.water ? 0 : 1.4));
    const on = playing() && p.grounded && Math.abs(p.y + p.h - lv.y) < 1.5 && Math.abs(pcx() - lv.x) < F().SHOWER.LEVER_HALF + 8;
    if (on && !B.leverHeld && !B.water && !B.scene) {
      B.leverK = 1; B.water = { t: 0, front: F().spout(s).y, done: false };
      api.sfx.sw(); api.sfx.key(); api.noise({ hp: 900, dur: 0.6, vol: 0.03 });
    }
    B.leverHeld = on;
    const w = B.water; if (!w) return;
    w.t += dt;
    if (!w.done) {
      w.front += WATER.SPEED * dt;
      const h = B.head, onHead = resting(B) && !B.hm, target = onHead ? h.y - F().HEAD.RY + 6 : F().secY(s, F().R.C);
      if (w.front >= target) { w.front = target; w.done = true; if (onHead && playing()) douse(B); else splash(B, F().spout(s).x, target, false); }
    }
    if (w.t > WATER.ON + 0.4) B.water = null;
  }
  function douse(B) {
    const h = B.head;
    splash(B, h.x, h.y - F().HEAD.RY, true);
    B.wet = 1; B.worryAt = api.time; B.hitNow = true;   // worryAt: a picture only, he glances worried at the egg (volcano-boss-draw.js)
    api.boss.hit(B);
    B.hitNow = false;
  }
  function splash(B, x, y, big) {
    for (let i = 0; i < (big ? 18 : 6); i++) {
      const a = -Math.PI / 2 + (api.boss.rnd(B) - 0.5) * 2.6, sp = (big ? 90 : 50) + api.boss.rnd(B) * (big ? 160 : 60);
      B.puffs.push({ x: x + (api.boss.rnd(B) - 0.5) * 50, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, r: (big ? 14 : 9) + api.boss.rnd(B) * 12, t: 0, life: (big ? 1.4 : 0.8) + api.boss.rnd(B) * 0.6 });
    }
    api.burst(x, y, big ? 16 : 8, ['#CDE8F5', '#FFFFFF'], big ? 200 : 120, { grav: 500, vy: -100 });
    api.noise({ hp: big ? 600 : 1400, dur: big ? 1.1 : 0.5, vol: big ? 0.07 : 0.03 });
    if (big) api.shake(0.8); else api.boss.bark(B, 'miss');
  }

  // ---------- attacks ----------
  function startTrack(B, second) {
    // he breathes from the far wall, across the shaft towards the rock where he rests afterwards
    const side = -F().SEC[api.boss.phase(B)].side;
    B.breath = { side, feet: B.feet, n: second ? 1 : 0, len: 0 };
    api.boss.set(B, 'track');
    if (!second && !B.said.fire) api.boss.bark(B, 'fire');
  }
  function stepTrack(B, dt) {
    const tp = tempo(B), dur = B.breath.n ? tp.track2 : tp.track;
    B.breath.feet = B.feet;
    chaseHead(B, F().breathPose(B.breath.side, B.breath.feet), dt);
    for (let i = 0; i < tp.spit && B.breath.n === 0; i++) if (B.t >= SPIT.AT[i] && B.n === i) { B.n = i + 1; spit(B); }
    if (B.t >= dur) { api.boss.set(B, 'charge'); api.sfx.sw(); api.noise({ bp: 500, f1: 1600, dur: (B.breath.n ? tp.charge2 : tp.charge), vol: 0.035 }); }
  }
  function stepCharge(B, dt) {
    const tp = tempo(B), dur = B.breath.n ? tp.charge2 : tp.charge;
    chaseHead(B, F().breathPose(B.breath.side, B.breath.feet), dt);
    if (B.t >= dur) { api.boss.set(B, 'breathe'); api.sfx.boom(); api.shake(0.5); api.noise({ lp: 1200, dur: FLAME.GROW + FLAME.FULL + 0.2, vol: 0.08 }); }
  }
  function stepBreathe(B) {
    const k = B.t, full = F().fireReach(B.head);
    B.breath.len = k < FLAME.GROW ? full * F().ease(k / FLAME.GROW) : full;
    B.breath.burn = k < FLAME.GROW + FLAME.FULL;
    if (B.breath.burn && playing() && F().fireHits(api.p, B.head, B.breath.feet, B.breath.len)) api.hurt();
    if (k < FLAME.GROW + FLAME.FULL + FLAME.FADE) return;
    B.breath.burn = false;
    if (tempo(B).double && B.breath.n === 0) { startTrack(B, true); return; }
    api.boss.set(B, 'fly');
    moveHead(B, F().restPose(api.boss.phase(B)), FLY, FLY_ARC);
  }
  // a glowing blob, spat on a high arc at the spot where Mimo stands; the spot glows until it lands
  function spit(B) {
    const m = F().mouth(B.head), tx = F().clamp(pcx(), 2 * F().T + 14, F().W - 2 * F().T - 14), ty = B.feet - SPIT.R;
    B.shots.push({ type: 'fauchBlob', x: m.x, y: m.y, x0: m.x, y0: m.y, tx, ty, t: 0, r: SPIT.R });
    api.sfx.pop(); B.sq = 0.9;
    if (B.n === 1) api.boss.bark(B, 'spit');
  }
  function shot(B, s) {
    if (s.type !== 'fauchBlob') return { dead: false, danger: false };
    const k = Math.min(1, s.t / SPIT.AIR);
    s.x = F().lerp(s.x0, s.tx, k); s.y = F().lerp(s.y0, s.ty, k) - Math.sin(k * Math.PI) * SPIT.ARC;
    if (k < 1) return { dead: false, danger: k > SPIT.DANGER };
    api.burst(s.tx, s.ty + s.r, 12, [api.W.lavaTop || '#FFC978', api.W.ember || '#FFB36B'], 140, { grav: 600, vy: -120 });
    api.noise({ lp: 700, f1: 120, dur: 0.18, vol: 0.04 });
    return { dead: true, danger: true };
  }

  // ---------- the hooks ----------
  function make(B) {
    const H0 = F().lurkPose(0);
    Object.assign(B, {
      fauch: true, floor: 1e5, head: { x: H0.x, y: H0.y + 420, f: H0.f, nk: -1 }, nkTo: -1, roar: 0, hm: null, breath: null, feet: 0, lavaY: 0, lavaBack: false,
      water: null, leverK: 0, leverHeld: false, wet: 0, puffs: [], scene: null, scenePending: null, fin: null, hornsOn: false, stepSaid: 0,
      snout: { fauch: 'snout', x: 0, y: -999, w: 40, off: true }, skull: { fauch: 'skull', x: 0, y: -999, w: 60, off: true },
    });
    api.L.bodies.push(B.snout, B.skull);
    B.feet = api.p ? api.p.y + api.p.h : F().secY(0, F().R.F);
    B.lavaY = lavaStart(B); setLava(B);
    B.x = B.head.x; B.y = B.head.y;
  }
  function arena(B, ph) { if (B.scenePending != null || B.scene) return; buildArena(B, ph); }
  function buildArena(B, ph) {
    const S = F().SLAB, T = F().T, solid = api.TILE.SOLID, hot = api.tileId(5, 'H'), empty = api.TILE.EMPTY;
    for (let c = S.c0; c <= S.c1; c++) { api.setTile(c, S.fromRow, ph === 0 ? solid : empty); api.setTile(c, S.toRow, ph === 0 ? empty : hot); }
    const sec = F().SEC[ph];
    api.G.respawn = { x: F().realX(ph, sec.spawnU * T + T / 2) - api.p.w / 2, y: F().secY(ph, F().R.F) - api.p.h };
    B.lavaY = lavaStart(B); B.lavaBack = false; setLava(B);
  }
  function respawn(B) {
    const ph = api.boss.phase(B), p = api.p, L0 = F().lurkPose(ph);
    Object.assign(B, { scene: null, scenePending: null, breath: null, water: null, leverK: 0, wet: 0, hm: null, nkTo: -1, roar: 0 });
    buildArena(B, ph);
    B.head.x = L0.x; B.head.y = L0.y; B.head.f = L0.f;
    p.x = api.G.respawn.x; p.y = api.G.respawn.y; p.vy = 0;
    B.feet = p.y + p.h; placeSteps(B);
  }
  function enter(B) {
    if (B.done) return;   // the closing scene after the win ends like a scene: nothing to start again
    if (B.scene) { window.MimoFauch.finishScene(B); return; }
    const L0 = F().lurkPose(api.boss.phase(B)); moveHead(B, L0, 0.6, 30); B.nkTo = -1;
  }
  function phase(B, ph) { B.scenePending = ph; B.breath = null; B.water = null; }

  // things every step needs, also during scenes and after the end
  function animate(B, dt) {
    stepHead(B, dt);
    B.head.nk += (B.nkTo - B.head.nk) * Math.min(1, dt * 4);
    B.roar = Math.max(0, B.roar - dt);
    B.wet = Math.max(0, B.wet - dt * 0.25);
    for (let i = B.puffs.length - 1; i >= 0; i--) { const q = B.puffs[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 1.5; q.vy = q.vy * (1 - dt * 1.2) - 26 * dt; if (q.t > q.life) B.puffs.splice(i, 1); }
    B.x = F().clamp(B.head.x, F().T + 2, F().W - F().T - 2); B.y = B.head.y;
  }
  function ai(B, dt) {
    animate(B, dt);
    const tp = tempo(B);
    switch (B.state) {
      case 'enter': introRise(B); break;
      case 'scene': window.MimoFauch.stepScene(B, dt); break;
      case 'idle': if (!B.hm && Math.hypot(B.head.x - F().lurkPose(api.boss.phase(B)).x, B.head.y - F().lurkPose(api.boss.phase(B)).y) > 4) moveHead(B, F().lurkPose(api.boss.phase(B)), LURK); if (B.t > tp.idle) startTrack(B, false); break;
      case 'track': stepTrack(B, dt); break;
      case 'charge': stepCharge(B, dt); break;
      case 'breathe': stepBreathe(B); break;
      case 'fly': if (!B.hm) { api.boss.set(B, 'pant'); liftMimo(B); api.sfx.land(); api.boss.bark(B, 'stun'); } break;
      case 'pant': if (B.t > tp.rest && !B.water) { api.boss.set(B, 'wake'); api.sfx.sw(); } break;
      case 'wake': if (B.t > WAKE && !B.water) { api.boss.set(B, 'idle'); moveHead(B, F().lurkPose(api.boss.phase(B)), LURK, 30); } break;
      case 'hurt':
        if (!B.n) { B.n = 1; B.breath = null; B.lavaBack = true; moveHead(B, { ...F().restPose(api.boss.phase(B)), y: F().restPose(api.boss.phase(B)).y - 60 }, 0.5); }
        if (B.scenePending != null && playing() && B.t > SCENE_WAIT_MIN && (api.p.grounded || B.t > SCENE_WAIT_MAX)) window.MimoFauch.startScene(B);
        else if (B.scenePending == null && B.t > HURT) { api.boss.set(B, 'idle'); moveHead(B, F().lurkPose(api.boss.phase(B)), LURK, 30); }
        break;
      default: api.boss.set(B, 'idle');
    }
  }
  // the intro: the head comes up out of the lava (slowly the first time)
  function introRise(B) {
    const c = B.cine, L0 = F().lurkPose(0); if (!c) return;
    const t0 = c.full ? 0.5 : 0.05, dur = c.full ? 1.6 : 0.8, k = F().clamp((c.t - t0) / dur, 0, 1);
    // up out of the lava behind his chin rock (where he will rest), the neck from below; then a glide to the waiting place
    const R0 = F().restPose(0);
    B.head.x = R0.x; B.head.f = R0.f; B.head.y = F().lerp(R0.y + 300, R0.y - 70, F().ease(k)); B.head.nk = 1; B.nkTo = 1;
    if (k > 0 && !B.rose) { B.rose = true; api.sfx.boom(); api.shake(0.6); api.burst(F().restPose(0).x, B.lavaY, 24, [api.W.lavaTop || '#FFC978', api.W.lavaLine || '#FFEBAA'], 220, { grav: 500, vy: -200 }); }
  }
  // no box: only the fire hurts, and the hit comes from the shower; for the hit itself the head is the box
  function box(B) {
    if (!B.hitNow) return { l: -9999, r: -9999, top: -9999, bottom: -9998, soft: false, harmless: true };
    const h = B.head; return { l: h.x - 60, r: h.x + 60, top: h.y - F().HEAD.RY - 10, bottom: h.y + 40, soft: false, harmless: true };
  }

  // ---------- the world's hooks for this fight ----------
  function update(dt) {
    const B = fight(); if (!B) return;
    const p = api.p;
    placeSteps(B);
    // the ledge Mimo stands on (not the head): that is where the fire goes
    if (p && p.grounded && !(p.carried && p.carried.fauch)) B.feet = p.y + p.h;
    if (p && p.carried && p.carried.fauch && playing() && B.stepSaid <= 0) { B.stepSaid = 6; api.boss.say(B.def.name, api.pick(LINES.step), 1.4, B.kind); }
    B.stepSaid = Math.max(0, B.stepSaid - dt);
    stepLava(B, dt); setLava(B);
    if (!B.done) stepLever(B, dt);
  }
  function camera(B, t) {
    const v = api.view, p = api.p, s = api.boss.phase(B), sec = F().SEC[s];
    if (B.scene || (B.done && B.fin)) return { x: t.x, y: p.y + p.h / 2 - v.h * (B.done ? 0.42 : 0.5) };
    if (v.h >= 12 * F().T) return { x: t.x, y: sec.cam };
    return { x: t.x, y: F().clamp(t.y, sec.top * F().T, (sec.top + 12) * F().T - v.h) };
  }
  function voice() { const f = 80 + Math.random() * 50; api.voice({ type: 'sawtooth', f0: f * 1.25, f1: f, slide: 0.08, attack: 0.015, dur: 0.12, vol: 0.035, lp: 700 }); api.voice({ type: 'triangle', f0: f * 2, f1: f * 1.6, slide: 0.06, dur: 0.07, vol: 0.02 }); }

  window.MimoWorlds.register({
    world: 5,
    tiles: { '!': { solid: true, lint: { name: 'Kraterrand', color: 'rgba(0,0,0,.15)' }, draw() {} } },
    setup(a) { api = a; },
    update,
    boss: {
      name: 'Drache Fauch', kicker: 'Hüter des Kraters', song: 'bossVolcano', hp: 6, phases: [6, 4, 2],
      // the door waits for the end: Fauch on his nest, the horns, the closing scene (volcano-boss-scenes.js holds the clock meanwhile)
      doorAfter: 9.0,
      hint: 'Weich dem <b>Feuer</b> aus. Ruht Fauch sich aus, klettere über seine <b>Nase</b> zum <b>Hebel</b>: Die kalte Dusche trifft ihn.',
      lines: LINES, map: F().MAP,
      make, arena, respawn, enter, ai, box, phase, shot, camera, voice,
      defeat: (B) => F().defeat(B), afterDefeat: (B, dt) => { animate(B, dt); F().afterDefeat(B, dt); }, door: (B) => F().door(B),
      draw: (B, ctx) => F().draw(B, ctx), drawFront: (B, ctx) => F().drawFront(B, ctx), drawShot: (B, s, ctx) => F().drawShot(B, s, ctx),
      // read by tools/bosscheck.mjs (volcano-boss-bot.js fills them in)
      get bot() { return F().bot; }, get checkShots() { return F().checkShots; }, get idleSpots() { return F().idleSpots; },
    },
  });
  Object.assign(window.MimoFauch = window.MimoFauch || {}, { TEMPO, FLAME, WATER, LINES, moveHead, placeSteps, setLava, lavaStart, buildArena, resting, splash, fight });
})();
