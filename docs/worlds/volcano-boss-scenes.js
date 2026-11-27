// World 5 boss "Drache Fauch": the scenes between the phases and the finale.
// Scene 1 (into phase 2): the volcano rumbles, the valve ledge under Mimo breaks loose and the lava pushes it up one
//   floor like a lift; it arrives as the floor ledge of floor 2, still hot from below, so Mimo hops off it.
// Scene 2 (into phase 3): Fauch shoots up the shaft to look for Mimo, who has hopped onto his head and rides along to
//   floor 3. "Wo ist er hin?"
// Finale: Fauch sneezes the cold water out, the steam blast shoots Mimo out of the crater onto the rim, Fauch looks out
//   of the crater, grumpy but friendly, and throws Mimo his old baby horns (the reward, "Drachenhörnchen").
// The core shows the scene bars and lets Mimo wait (state "cine"); here Mimo is moved by hand. A skipped scene ends
// exactly where a watched one ends (finishScene).
(function () {
  'use strict';
  let api = null;
  const F = () => window.MimoFauch;

  const SCENE = [null,
    { len: 4.4, hop: 0.55, BREAK: 0.6, SURGE: 1.0, ARRIVE: 3.2, OFF: 3.45, OFF_LEN: 0.5 },
    { len: 4.6, GRAB: 0.45, HOP: 0.55, RISE: 1.15, ARRIVE: 3.3, OFF: 3.45, OFF_LEN: 0.55, LOOK: 3.6 },
  ];
  const FIN = { SNEEZE: 0.35, FLY0: 0.45, FLY1: 2.7, APEX: 56, LAND_U: 688, PEEK0: 2.9, PEEK1: 3.6, SAY: 3.7, GIFT: 5.0, GIFT_LEN: 0.9, PEEK_X: 420, PEEK_DY: -8 };
  const HOP_H = 54;
  const GIFT_LINE = 'Hier, meine alten Babyhörnchen. Die stehen dir!', CRY = 'Ha... HATSCHI!', LOOK_LINE = 'Wo ist er hin?';

  const T = () => F().T;
  const ph = (B) => api.boss.phase(B);
  // Mimo by hand: centre x and feet y, with a vertical speed for his pose
  function putMimo(x, feet, vy) { const p = api.p; p.x = x - p.w / 2; p.y = feet - p.h; p.vx = 0; p.vy = vy || 0; }
  // a hop from (x0, y0) to (x1, y1) in feet coordinates, k 0..1
  function hop(x0, y0, x1, y1, k, h) {
    const e = F().clamp(k, 0, 1), y = F().lerp(y0, y1, e) - 4 * (h == null ? HOP_H : h) * e * (1 - e);
    putMimo(F().lerp(x0, x1, e), y, e < 0.5 ? -300 : 300);
  }

  // ---------- the scenes ----------
  function startScene(B) {
    const p = api.p;
    B.scene = { ph: B.scenePending, t: 0, x0: p.x + p.w / 2, y0: p.y + p.h, lava0: B.lavaY, done: false };
    B.scenePending = null; B.water = null; B.breath = null;
    api.boss.scene(B, SCENE[B.scene.ph].len);
    api.boss.set(B, 'scene');
  }
  function stepScene(B, dt) {
    const sc = B.scene; if (!sc) return;
    sc.t += dt;
    if (sc.ph === 1) sceneSlab(B, sc); else sceneRide(B, sc);
  }
  // scene 1: the valve ledge of floor 1 rides up on the lava and becomes the floor ledge of floor 2
  function sceneSlab(B, sc) {
    const S = SCENE[1], SL = F().SLAB, t = sc.t, T0 = T(), from = SL.fromRow * T0, to = SL.toRow * T0, cx = (SL.c0 + SL.c1 + 1) / 2 * T0;
    // first onto the valve ledge, if Mimo is not there
    const onSlab = sc.y0 === from && sc.x0 > SL.c0 * T0 + 6 && sc.x0 < (SL.c1 + 1) * T0 - 6;
    const sx = onSlab ? sc.x0 : cx + 20;
    if (!onSlab && t < S.hop) hop(sc.x0, sc.y0, sx, from, t / S.hop, 70);
    if (t >= S.BREAK && !sc.broke) {
      sc.broke = true;
      for (let c = SL.c0; c <= SL.c1; c++) api.setTile(c, SL.fromRow, api.TILE.EMPTY);
      B.slab = { x: SL.c0 * T0, y: from, w: (SL.c1 - SL.c0 + 1) * T0 };
      api.shake(1.0); api.sfx.smash(); api.sfx.crumble(); api.sfx.boom();
      api.burst(cx, from + T0, 30, [api.W.basalt || '#7D7290', api.W.lavaTop || '#FFC978'], 220, { grav: 600, rect: true, vy: -120 });
      B.roar = 1.2;
    }
    // Fauch rides up beside the ledge, roaring at Mimo, and leaves for the new floor when it arrives
    if (B.slab && t > S.BREAK) { const h = B.head, k = 1 - Math.exp(-5 * api.STEP); h.x += (F().realX(0, 700) - h.x) * k; h.y += (B.slab.y - 10 - h.y) * k; h.f = -1; B.hm = null; B.nkTo = 1; if (t > S.BREAK + 0.9 && !sc.roar2) { sc.roar2 = true; B.roar = 1.4; api.sfx.boom(); } }
    if (B.slab && !sc.arrived) {
      const k = F().ease(F().clamp((t - S.SURGE) / (S.ARRIVE - S.SURGE), 0, 1));
      B.slab.y = F().lerp(from, to, k);
      B.lavaY = t < S.SURGE ? F().lerp(sc.lava0, from + T0 + 4, F().ease((t - S.BREAK) / (S.SURGE - S.BREAK))) : B.slab.y + T0 + 4;
      if (t >= S.hop || onSlab) putMimo(F().clamp(sx, B.slab.x + 14, B.slab.x + B.slab.w - 14), B.slab.y, 0);
      if (Math.random() < 0.5) api.G.particles.push({ x: B.slab.x + Math.random() * B.slab.w, y: B.slab.y + T0 + 6, vx: (Math.random() - 0.5) * 60, vy: 40, life: 0, max: 0.6, r: 2.4, color: api.W.lavaLine || '#FFEBAA', grav: 300, rect: false, rot: 0 });
    }
    if (t >= S.ARRIVE && !sc.arrived) {
      sc.arrived = true; B.slab = null; B.nkTo = -1; F().moveHead(B, F().lurkPose(1), 0.9, 40);
      for (let c = SL.c0; c <= SL.c1; c++) api.setTile(c, SL.toRow, api.tileId(5, 'H'));
      api.shake(0.5); api.sfx.stomp();
    }
    if (sc.arrived) B.lavaY = Math.min(F().lavaStart(B), B.lavaY + 90 * api.STEP);
    // still hot from the lava: Mimo hops onto the cool part of the floor ledge
    if (t >= S.OFF) {
      const k = (t - S.OFF) / S.OFF_LEN, sp = spawnOf(1);
      if (!sc.said) { sc.said = true; api.bubble('Heiß!', 'player', 0.9); }
      hop(sc.x1 == null ? (sc.x1 = api.p.x + api.p.w / 2) : sc.x1, to, sp.x, to, k, 40);
    }
  }
  // scene 2: Mimo hops onto the head, Fauch shoots up to floor 3 looking for him; Mimo hops onto the floor ledge
  function sceneRide(B, sc) {
    const S = SCENE[2], t = sc.t, H = F().HEAD, f3 = F().secY(2, F().R.F), sp = spawnOf(2);
    const grab = { x: F().realX(1, 640), y: sc.y0 + H.RY, f: 1 }, top = { x: grab.x - 20, y: f3 + H.RY, f: 1 };
    if (!sc.go) { sc.go = true; F().moveHead(B, grab, S.GRAB); }
    const skull = () => ({ x: B.head.x - B.head.f * (H.SKULL_A + H.SKULL_B) / 2, y: B.head.y - H.RY });
    if (t < S.HOP) { /* Mimo watches */ }
    else if (t < S.RISE) { const q = skull(); hop(sc.x0, sc.y0, q.x, q.y, (t - S.HOP) / (S.RISE - S.HOP), 40); }
    else if (t < S.OFF) {
      if (!sc.rising) { sc.rising = true; F().moveHead(B, top, S.ARRIVE - S.RISE, 0); api.sfx.boom(); api.shake(0.7); B.nkTo = 1; B.roar = 1.0; }
      const q = skull(); putMimo(q.x, q.y, 0);
      B.lavaY = Math.min(B.lavaY, B.head.y + 170);
    } else {
      const k = (t - S.OFF) / S.OFF_LEN; if (sc.x1 == null) { const q = skull(); sc.x1 = q.x; sc.y1 = q.y; }
      hop(sc.x1, sc.y1, sp.x, f3, k, 46);
      if (t >= S.LOOK && !sc.look) { sc.look = true; api.boss.say(B.def.name, LOOK_LINE, 1.6, B.kind); F().moveHead(B, { x: top.x + 30, y: top.y + 30, f: -1 }, 0.6); }
    }
    B.lavaY = Math.min(F().secY(1, 0) + F().SEC[1].lava.start, Math.max(F().lavaStart(B), B.lavaY - 90 * api.STEP));
  }
  const spawnOf = (s) => ({ x: F().realX(s, F().SEC[s].spawnU * T() + T() / 2), y: F().secY(s, F().R.F) });
  // the end of a scene (or a skip): the arena is exactly what the new phase needs, Mimo stands at its start
  function finishScene(B) {
    const sc = B.scene; B.scene = null; B.slab = null;
    F().buildArena(B, sc.ph);
    const sp = spawnOf(sc.ph); putMimo(sp.x, sp.y, 0); api.p.grounded = true;
    B.feet = sp.y;
    const L0 = F().lurkPose(sc.ph); F().moveHead(B, L0, 0.5, 20); B.nkTo = -1;
    api.music.setIntensity(sc.ph);
  }

  // ---------- the finale ----------
  function defeat(B) {
    const p = api.p;
    B.fin = { x0: p.x + p.w / 2, y0: p.y + p.h, sneezed: false, landed: false, peek: false, said: false, gift: null };
    B.water = null; B.breath = null;
  }
  function afterDefeat(B, dt) {
    const f = B.fin, t = B.t, p = api.p, H = F().HEAD;
    if (!f.cry) { f.cry = true; api.boss.say(B.def.name, CRY, 1.3, B.kind); }
    // the sneeze: he rears back, then the steam blast shoots out of the crater
    if (t < FIN.SNEEZE) B.head.y -= 30 * dt;
    if (t >= FIN.SNEEZE && !f.sneezed) {
      f.sneezed = true; api.sfx.boom(); api.shake(1.4); api.noise({ hp: 500, dur: 1.6, vol: 0.09 });
      for (let i = 0; i < 30; i++) B.puffs.push({ x: B.head.x + (Math.random() - 0.5) * 120, y: B.head.y - 20, vx: (Math.random() - 0.5) * 160, vy: -260 - Math.random() * 380, r: 16 + Math.random() * 18, t: 0, life: 1.6 + Math.random() * 1.2 });
      F().moveHead(B, { x: B.head.x, y: B.head.y + 120, f: B.head.f }, 1.0);
    }
    // the eruption lifts the lava up the shaft
    if (f.sneezed) B.lavaY = Math.max(F().secY(2, 6.5), B.lavaY - 160 * dt);
    // Mimo flies: up out of the crater, high over the rim, and down onto it
    const lx = FIN.LAND_U, ly = F().RIM * T();
    if (t >= FIN.FLY0 && t < FIN.FLY1) {
      const k = (t - FIN.FLY0) / (FIN.FLY1 - FIN.FLY0), x = F().lerp(f.x0, lx, F().ease(k)), mid = (f.y0 + ly) / 2, hgt = mid - FIN.APEX - 26;
      const y = F().lerp(f.y0, ly, k) - 4 * hgt * k * (1 - k);
      putMimo(x, y, k < 0.5 ? -500 : 400); p.grounded = false;
      if (Math.random() < 0.6) api.G.particles.push({ x: x + (Math.random() - 0.5) * 16, y: y + 4, vx: (Math.random() - 0.5) * 40, vy: 60, life: 0, max: 0.5, r: 3, color: '#FFFFFF', grav: -40, rect: false, rot: 0 });
    } else if (t >= FIN.FLY1 && !f.landed) {
      f.landed = true; putMimo(lx, ly, 0); api.sfx.land(); api.shake(0.5); api.dust({ x: lx - 15, y: ly - 10, w: 30, h: 10 }, 8); api.setMood('happy', 1);
    }
    // Fauch looks out of the crater, wet and friendly, and throws his baby horns
    if (t >= FIN.PEEK0 && !f.peek) { f.peek = true; B.head.x = FIN.PEEK_X; B.head.y = ly + 300; B.head.f = 1; B.head.nk = 1; B.nkTo = 1; F().moveHead(B, { x: FIN.PEEK_X, y: ly + FIN.PEEK_DY, f: 1 }, FIN.PEEK1 - FIN.PEEK0); api.sfx.bubble(); }
    if (t >= FIN.SAY && !f.said) { f.said = true; api.boss.say(B.def.name, F().LINES.beaten, 1.6, B.kind); }
    if (t >= FIN.GIFT && !f.gift) { f.gift = { x0: B.head.x + 18, y0: B.head.y - H.RY - 20 }; api.boss.say(B.def.name, GIFT_LINE, 2.6, B.kind); api.sfx.bounce(); }
    if (f.gift && !B.hornsOn) {
      const k = Math.min(1, (t - FIN.GIFT) / FIN.GIFT_LEN), tx = p.x + p.w / 2, ty = p.y + 2;
      f.gift.x = F().lerp(f.gift.x0, tx, k); f.gift.y = F().lerp(f.gift.y0, ty, k) - Math.sin(k * Math.PI) * 80; f.gift.rot = (1 - k) * Math.PI * 4; f.gift.k = k;
      if (k >= 1) { B.hornsOn = true; api.boss.wear(); api.sfx.key(); api.ring(tx, ty, api.P.key); api.burst(tx, ty, 12, [api.P.key, '#FBEFD9'], 110, { grav: 200 }); api.setMood('happy', 1.5); }
    }
  }
  const door = () => ({ x: F().DOOR.x, y: F().DOOR.y });

  window.MimoWorlds.register({ world: 5, setup(a) { api = a; } });
  Object.assign(window.MimoFauch = window.MimoFauch || {}, { SCENE, FIN, startScene, stepScene, finishScene, defeat, afterDefeat, door, spawnOf });
})();
