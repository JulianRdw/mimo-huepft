// World 4 "Korallenküste": the world itself, water, tide and swimming.
// The other parts: coast-look.js (picture), coast-things.js (bubbles, crabs, pufferfish, tide gauge), coast-levels.js
// (levels and the song). They share the numbers and helpers through window.MimoCoast (set up here, at load time, without
// touching document or canvas, so the level tools can run this file in Node).
//
// Water: a level has one water line (level field `water: 8` or `water: { row: 8 }`, the top of that row); everything
// below it is water. `tide: { low, high, period, move, offset }` lets the line swing between two rows on a fixed beat.
// A boss (or any code) can move the water with MimoCoast.setWater / moveWater / setTide.
//
// Swimming is a set of physics rules the core asks for every step (physics hook). Everything is a function of the game
// clock (api.time) and of fixed steps, so the level bots replay exactly.
(function () {
  'use strict';
  let api = null;

  // ---------- the feel, tuned in the browser (tools/coast-test.mjs measures every number; tools/levels/world4-kit.md lists the results) ----------
  const SWIM = Object.freeze({
    WADE: 10,           // feet less than this deep in the water: still walking on land rules (shallow puddles, a rising tide)
    GRAV: 620,          // sinking pull under water (land 2000): sinking feels slow and floaty
    FALL: 64,           // top sinking speed (land 850): 2 tiles per second; slow, so one small stroke holds the depth longer
    DIVE: 192,          // holding down (keys, pad, thumb stick pushed down) under water: sink 6 tiles per second
    DIVE_ACC: 2000,     // how fast a dive gets going (a tenth of a second); letting go brakes it with DRAG
    DRAG: 4200,         // how hard a dive is braked to FALL when Mimo drops into the water
    RISE: 160,          // steady rising speed while jump is held (5 tiles per second)
    HOLD_ACC: 1500,     // how fast holding reaches RISE (a tenth of a second)
    STROKE: 225,        // a short tap: one small stroke upwards, about 1.3 tiles
    GLIDE: 0.75,        // after a stroke Mimo glides (hardly sinks) until this many seconds after the tap, so a tap
    GLIDE_FALL: 12,     // about every 1.4 s holds the depth in a long tunnel without tiring the thumb
    FLOAT: 8,           // floating at the surface: the top of Mimo's head this far above the water
    BRAKE: 3200,        // above the floating line the water pulls him back softly instead of letting a stroke fly out
    LEAP: 540,          // jump press at the surface: out of the water (feet about 1.7 tiles above the line)
    LEAP_ZONE: 14,      // the press counts as "at the surface" while the top of his head is at most this deep
    RUN: 150,           // sideways speed in water and on the sea floor (land 210)
    ACCEL: 900,         // sideways acceleration while swimming (land 1600 in the air): a little floaty
    FLOOR_ACCEL: 1500,  // sideways acceleration walking on the sea floor
    CURRENT: 105,       // push of a current tile under water: carried 3.3 tiles/s, against it 1.4 tiles/s
    IMPULSE: 300,       // rising faster than this under water means a land impulse (a jump from a bubble, a jellyfish):
                        // it follows land gravity until it has slowed to swimming speed, so heights match the land
  });
  const TIDE = Object.freeze({ PERIOD: 12, MOVE: 2.2, WARN: 1.6 });

  const T = 32;
  const smooth = (k) => k * k * (3 - 2 * k);
  const rowOf = (w) => (typeof w === 'number' ? w : w && typeof w.row === 'number' ? w.row : null);

  // ---------- per level state (L.coast), fresh with every load/restart ----------
  function state(L) {
    if (!L.coast) L.coast = { surf: null, base: null, tide: null, ctl: null, crabs: [], fish: [], sources: [], gauges: [], live: [], says: [], chaseWater: 0.72, ride: null, def: null };
    return L.coast;
  }

  // tide on the clock: hold low, rise, hold high, fall. Returns { y, state, next, warn, target }
  function tideAt(td, time) {
    const lowY = td.low * T, highY = td.high * T, period = td.period, move = td.move, hold = (period - 2 * move) / 2;
    const t = (((time + td.offset) % period) + period) % period;
    if (t < hold) return { y: lowY, state: 'low', next: hold - t, warn: hold - t < TIDE.WARN, target: highY };
    if (t < hold + move) return { y: lowY + (highY - lowY) * smooth((t - hold) / move), state: 'rising', next: hold + move - t, warn: true, target: highY };
    if (t < 2 * hold + move) return { y: highY, state: 'high', next: 2 * hold + move - t, warn: 2 * hold + move - t < TIDE.WARN, target: lowY };
    return { y: highY + (lowY - highY) * smooth((t - 2 * hold - move) / move), state: 'falling', next: period - t, warn: true, target: lowY };
  }
  function makeTide(o) {
    if (!o || typeof o.low !== 'number' || typeof o.high !== 'number') return null;
    const period = o.period || TIDE.PERIOD, move = Math.min(o.move || TIDE.MOVE, period / 2 - 0.1);
    return { low: o.low, high: o.high, period, move, offset: o.offset || 0 };
  }

  // the water line for this moment: code control first, then the tide, then the fixed line
  function surfaceNow(c, time) {
    if (c.ctl) {
      const k = c.ctl.dur > 0 ? Math.min(1, (time - c.ctl.t0) / c.ctl.dur) : 1;
      return c.ctl.from == null || c.ctl.to == null ? c.ctl.to : c.ctl.from + (c.ctl.to - c.ctl.from) * smooth(k);
    }
    if (c.tide) return tideAt(c.tide, time).y;
    return c.base;
  }

  // ---------- swimming ----------
  const swimming = (p, c) => !!c && c.surf != null && p.y + p.h - c.surf > SWIM.WADE;

  // a jump press under water: a full land jump from a bubble, a leap at the surface, else a small stroke
  function swimJump(p) {
    const c = api.L.coast, ride = c.ride;
    if (ride && ride.bubble && !ride.off && p.wasGrounded) {
      p.vy = -api.PHYS.JUMP; p.canCut = true; p.impulse = true; p.carried = null;
      p.sx = 0.82; p.sy = 1.2; api.dust(p, 4); api.sfx.jump(); api.sfx.hup();
      return true;
    }
    if (p.y < c.surf + SWIM.LEAP_ZONE) {
      p.vy = -SWIM.LEAP; p.canCut = false; p.impulse = true; p.carried = null;
      p.sx = 0.84; p.sy = 1.18; api.sfx.jump(); api.sfx.hup();
      splash(p.x + p.w / 2, c.surf, 10);
      return true;
    }
    p.vy = Math.min(p.vy, -SWIM.STROKE); p.canCut = false; p.sx = 1.12; p.sy = 0.9; p.glide = SWIM.GLIDE;
    api.voice({ type: 'sine', f0: 240, f1: 520, slide: 0.09, dur: 0.12, vol: 0.03 });
    // a few bubbles from the paws; they fade before they could rise out of the water
    const depth = p.y + p.h - c.surf, life = Math.min(0.6, Math.max(0.15, (depth - 6) / 70));
    if (!api.reduced) for (let i = 0; i < 3; i++) api.G.particles.push({ x: p.x + p.w / 2 + (Math.random() - 0.5) * 12, y: p.y + p.h - 2, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 30, life: 0, max: life, r: 1.6 + Math.random() * 1.4, color: api.W.foam || '#FFFFFF', grav: -260, rect: false, rot: 0 });
    return true;
  }
  // jump held under water: rise steadily, ease into floating at the surface (a dive wins over it)
  function swimHold(p, dt) {
    if (p.impulse || p.diving) return;
    const floatY = api.L.coast.surf - SWIM.FLOAT, d = p.y - floatY;
    const target = d <= 0 ? 0 : -Math.min(SWIM.RISE, d * 6);
    if (p.vy > target) p.vy = Math.max(target, p.vy - SWIM.HOLD_ACC * dt);
  }
  function swimPhysics(p) {
    const c = api.L && api.L.coast;
    p.swim = swimming(p, c);
    // floating calmly at the surface: a jump press now leaps out (the level bot waits for this)
    p.atSurface = p.swim && p.y < c.surf + SWIM.LEAP_ZONE && Math.abs(p.vy) < 60 && !p.impulse;
    if (!p.swim) { p.impulse = false; p.diving = false; p.glide = 0; return null; }
    if (p.vy < -SWIM.IMPULSE) p.impulse = true;
    if (p.impulse && p.vy > -SWIM.RISE) p.impulse = false;
    const out = { run: SWIM.RUN, accel: p.wasGrounded ? SWIM.FLOOR_ACCEL : SWIM.ACCEL, wind: SWIM.CURRENT, jump: swimJump, hold: swimHold };
    if (p.impulse || p.diving) p.glide = 0;
    if (p.impulse) { p.diving = false; out.gravity = api.PHYS.GRAV; out.maxFall = api.PHYS.MAX_FALL; return out; }
    // diving: down held (keys and pad set input.down, the thumb stick input.dive); like down on land it also lets
    // Mimo drop through boards, lifts and bubbles, so the stick gets the same drop as the keys
    const inp = api.input;
    p.diving = !!(inp.down || inp.dive);
    if (p.diving) {
      if (inp.dive) inp.dropT = Math.max(inp.dropT || 0, 2 * api.STEP);
      out.gravity = SWIM.DIVE_ACC;
      out.maxFall = p.vy > SWIM.DIVE ? Math.max(SWIM.DIVE, p.vy - SWIM.DRAG * api.STEP) : SWIM.DIVE;
      return out;
    }
    out.gravity = p.y < c.surf - SWIM.FLOAT && p.vy < 0 ? SWIM.BRAKE : SWIM.GRAV;
    // a dive is braked over a short way instead of stopping dead
    const fall = p.glide > 0 ? SWIM.GLIDE_FALL : SWIM.FALL;
    if (p.glide > 0) p.glide -= api.STEP;
    out.maxFall = p.vy > fall ? Math.max(fall, p.vy - SWIM.DRAG * api.STEP) : fall;
    return out;
  }

  // ---------- splashes ----------
  function splash(x, y, n) {
    const W = api.W;
    api.burst(x, y, n, [W.foam || '#FFFFFF', W.waterTop || '#7FD0DC'], 110, { grav: 520, vy: -90, life: 0.35 });
    api.noise({ lp: 2200, f1: 600, dur: 0.16, vol: 0.035 });
  }

  // ---------- the hooks ----------
  function init(L, info) {
    const c = state(L), def = info.def || {};
    if (info.reason === 'respawn') return;
    c.def = def;
    c.base = rowOf(def.water) != null ? rowOf(def.water) * T : null;
    c.tide = makeTide(def.tide);
    if (c.tide && c.base == null) c.base = c.tide.low * T;
    c.ctl = null;
    // the ink cloud's speed while Mimo swims: chase.water (px/s), else slowed like Mimo (150 of 210)
    c.chaseWater = def.chase && def.chase.water ? def.chase.water / def.chase.speed : SWIM.RUN / api.PHYS.RUN;
    c.surf = surfaceNow(c, api.time);
  }
  function update(dt) {
    const L = api.L, c = L && L.coast; if (!c) return;
    c.surf = surfaceNow(c, api.time);
    const p = api.p; if (!p) return;
    // what Mimo stood on in the last step (the core forgets it before the jump is decided)
    c.ride = p.carried;
    // splash when he goes in or comes out
    const was = !!p.swimShown, now = !!p.swim && api.state === 'play';
    if (was !== now && c.surf != null && api.state === 'play') splash(p.x + p.w / 2, c.surf, now ? 12 : 7);
    p.swimShown = now;
    // the ink cloud is slower while Mimo swims, so a chase stays as fair in the water as on land
    if (L.chase && api.state === 'play' && p.swim) L.chase.x -= L.chase.speed * (1 - c.chaseWater) * dt;
  }

  // ---------- shared with the other parts and with a boss ----------
  const coast = () => (api && api.L ? api.L.coast : null);
  window.MimoCoast = Object.assign(window.MimoCoast || {}, {
    SWIM, TIDE, smooth, tideAt, state,
    // current water line in world pixels, or null (no water)
    surface() { const c = coast(); return c ? c.surf : null; },
    // is this point (world pixels) under water right now
    inWater(x, y) { const c = coast(); return !!c && c.surf != null && y > c.surf; },
    // does Mimo swim right now
    swimming() { return !!(api && api.p && api.p.swim); },
    // the tide right now: { y, state: low|rising|high|falling, next (seconds to the next change), warn, target } or null
    tide() { const c = coast(); return c && c.tide && !c.ctl ? tideAt(c.tide, api.time) : null; },
    // code control (a boss): place the line now (pixels, null = no water), glide there in some seconds, or set a new tide
    setWater(y) { const c = coast(); if (c) { c.ctl = { from: null, to: y, t0: api.time, dur: 0 }; c.surf = y; } },
    moveWater(y, seconds) { const c = coast(); if (c) c.ctl = { from: c.surf == null ? y : c.surf, to: y, t0: api.time, dur: Math.max(0, seconds || 0) }; },
    setTide(o) { const c = coast(); if (c) { c.tide = makeTide(o); c.ctl = null; if (!c.tide && c.base == null) c.base = c.surf; } },
    splash,
  });

  window.MimoWorlds.register({
    world: 4,
    name: 'Korallenküste',
    firstLevel: 29,
    song: 'coast',
    lines: ['Sand zwischen den Pfoten.', 'Ist das Wasser nass?', 'Blubb.', 'Ich kann gar nicht schwimmen. Doch.', 'Riecht nach Ferien.', 'Erst eincremen. Zu spät.'],
    // jellyfish (the mushroom of this world) may float in the water, the level lint does not ask for ground under them
    lint: { floating: 'u' },
    setup(a) { api = a; },
    init, update,
    physics: swimPhysics,
  });
})();
