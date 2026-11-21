// World 6 "Mond": the world itself, the low gravity of the moon, moon bases with normal gravity inside, darkness
// on the dark side, dust puffs and lines at places.
// The other parts: moon-things.js (small moons with orbits, meteors, floating stones, shooting stars: rules and timing),
// moon-things-draw.js (their pictures), moon-look.js (palette, background, tiles, helmet, darkness),
// moon-levels.js (levels and the song). They share numbers, state and helpers through window.MimoMoon (set up here
// at load time, without document or canvas, so the level tools can run it in Node).
//
// The moon jump: the core jump speed stays (so a jump, a mushroom and a stomp all scale the same way), only the
// gravity is lower. Rising is pulled by GRAV.UP, falling by GRAV.DOWN (a little stronger, so landings feel firm), and
// near the top of a jump with the button held the pull halves (the float). In the air Mimo steers a little slower
// than on Earth (AIR), on the ground he walks exactly like on Earth: floaty in the air, never sluggish on the ground.
// Inside a moon base (level field `bases`) the normal rules of the game apply.
// Everything runs on the game clock and on fixed steps, so the level bots replay exactly.
(function () {
  'use strict';
  let api = null;
  const T = 32;

  // ---------- the numbers (tools/moon-test.mjs measures them; tools/levels/world6-kit.md lists the results) ----------
  const GRAV = Object.freeze({
    UP: 1480,       // pull while rising (Earth 2000)
    DOWN: 1250,     // pull while falling
    APEX_V: 150,    // below this vertical speed near the top of a jump ...
    APEX_K: 0.5,    // ... the pull is halved while jump is held (the moon float)
    MAX_FALL: 600,  // top falling speed (Earth 850): falls look slow, but not like a feather
    AIR: 1150,      // sideways acceleration in the air (Earth 1600): a little drift, still easy to steer
    FLUNG: 480,     // after a fling from a small moon the speed carries (stick neutral or held the way he flies) ...
    BRAKE: 1600,    // ... pushing the stick against the flight brakes like on Earth, so a landing can be aimed
  });
  // dust: a puff on landing from at least this many px of fall (looks only)
  const DUST = Object.freeze({ MIN_FALL: 40 });

  const smooth = (k) => k * k * (3 - 2 * k);

  // ---------- per level state (L.moon), fresh with every load and restart ----------
  function state(L) {
    if (!L.moon) {
      L.moon = { def: null, bases: [], dark: null, lamps: [], scale: 1, says: [], inBase: false, baseSaid: false, helmet: 1,
        airTop: null, moons: [], meteors: [], stones: [], boosts: [], orbit: null, craters: [] };
    }
    return L.moon;
  }
  const moonState = () => (api && api.L ? api.L.moon : null);

  // ---------- moon bases (level field bases: [{ x, y, w, h }] in tiles): normal gravity inside ----------
  function baseAt(m, x, y) {
    for (const b of m.bases) if (x >= b.x * T && x < (b.x + b.w) * T && y >= b.y * T && y < (b.y + b.h) * T) return b;
    return null;
  }
  const inBase = (m, p) => !!baseAt(m, p.x + p.w / 2, p.y + p.h / 2);

  // ---------- the physics hook ----------
  const OUT = { gravity: 0, maxFall: 0, accel: 0 };
  function physics(p) {
    const m = api.L && api.L.moon; if (!m) return null;
    // a small moon holds Mimo on its orbit (moon-things.js answers then)
    const orb = window.MimoMoon.orbitPhysics ? window.MimoMoon.orbitPhysics(p) : null;
    if (orb) return orb;
    if (m.inBase) { p.flung = false; return null; }
    if (p.wasGrounded || p.carried) p.flung = false;
    // a fling from a small moon is a plain throw (its dotted preview is exact), so it does not float
    const k = m.scale, held = api.input.jumpHeld && !p.wasGrounded && !p.flung;
    let g = p.vy < 0 ? GRAV.UP : GRAV.DOWN;
    if (held && Math.abs(p.vy) < GRAV.APEX_V) g *= GRAV.APEX_K;
    OUT.gravity = g * k;
    OUT.maxFall = GRAV.MAX_FALL * Math.min(1, 0.6 + 0.4 * k);
    const inp = api.input, push = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), fast = p.flung && Math.abs(p.vx) > api.PHYS.RUN;
    OUT.accel = p.wasGrounded ? api.PHYS.ACCEL : fast ? (push && push !== Math.sign(p.vx) ? GRAV.BRAKE : GRAV.FLUNG) : GRAV.AIR;
    return OUT;
  }

  // ---------- dust puffs on landing (slow, wide, they hang in the low gravity) ----------
  function landingPuff(p, fall) {
    if (api.reduced) return;
    const n = Math.min(10, 4 + Math.round(fall / 30)), x = p.x + p.w / 2, y = p.y + p.h, col = api.W.dust || '#E3E1F4';
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1, sp = 30 + Math.random() * 50 + fall * 0.15;
      api.G.particles.push({ x: x + s * (4 + Math.random() * 8), y: y - 2, vx: s * sp, vy: -12 - Math.random() * 28, life: 0, max: 0.55 + Math.random() * 0.35, r: 2.4 + Math.random() * 2.6, color: col, grav: 40, rect: false, rot: 0 });
    }
  }
  function updateDust(m, p) {
    if (!p.grounded) { if (m.airTop == null || p.y < m.airTop) m.airTop = p.y; return; }
    if (m.airTop != null) { const fall = p.y - m.airTop; if (fall >= DUST.MIN_FALL && !m.inBase && api.state === 'play') landingPuff(p, fall); }
    m.airTop = null;
  }

  // ---------- lines at places (level field says: [{ x, y, r, text }]) ----------
  function updateSays(m, p) {
    if (api.state !== 'play') return;
    const cx = (p.x + p.w / 2) / T, cy = (p.y + p.h / 2) / T;
    for (const s of m.says) {
      if (s.said || Math.hypot(cx - s.x - 0.5, cy - s.y - 0.5) > s.r) continue;
      s.said = true; api.bubble(s.text, 'player', Math.min(3.5, 1.4 + s.text.length * 0.045));
    }
  }
  const BASE_LINES = ['Drinnen ist alles wieder schwer.', 'Helm ab. Luft!', 'Schwerkraft wie zu Hause.'];

  // ---------- the hooks ----------
  const rect = (r) => (r && typeof r.x === 'number' && typeof r.y === 'number' && r.w > 0 && r.h > 0 ? { x: r.x, y: r.y, w: r.w, h: r.h } : null);
  function init(L, info) {
    const m = state(L), def = info.def || {};
    m.orbit = null; m.airTop = null;
    if (info.reason === 'respawn') { m.inBase = api.p ? inBase(m, api.p) : false; m.helmet = m.inBase ? 0 : 1; return; }
    m.def = def;
    m.bases = Array.isArray(def.bases) ? def.bases.map(rect).filter(Boolean) : [];
    m.scale = typeof def.gravity === 'number' && def.gravity > 0 ? def.gravity : 1;
    m.dark = def.dark ? { r: (def.dark.r || 6) * T, a: def.dark.a != null ? def.dark.a : 0.86 } : null;
    m.lamps = Array.isArray(def.lamps) ? def.lamps.filter((e) => e && typeof e.x === 'number').map((e) => ({ x: e.x, y: e.y, r: e.r || 3 })) : [];
    m.says = Array.isArray(def.says) ? def.says.filter((e) => e && typeof e.text === 'string').map((e) => ({ x: e.x, y: e.y, r: e.r || 2, text: e.text, said: false })) : [];
    m.baseSaid = false; m.craters = [];
    m.inBase = api.p ? inBase(m, api.p) : false; m.helmet = m.inBase ? 0 : 1;
  }
  function update(dt) {
    const L = api.L, m = L && L.moon, p = api.p; if (!m || !p) return;
    const was = m.inBase;
    m.inBase = inBase(m, p);
    if (m.inBase && !was && api.state === 'play' && !m.baseSaid) { m.baseSaid = true; api.bubble(api.pick(BASE_LINES), 'player', 1.6); }
    // the glass helmet goes off inside a base and on again outside (looks only)
    m.helmet = Math.max(0, Math.min(1, m.helmet + (m.inBase ? -dt : dt) * 5));
    updateDust(m, p);
    updateSays(m, p);
  }

  window.MimoMoon = Object.assign(window.MimoMoon || {}, {
    GRAV, DUST, T, smooth, state, baseAt, inBase,
    // the gravity Mimo feels at this place right now (px/s², falling), e.g. for a preview of a jump
    gravityAt(x, y) { const m = moonState(); if (!m) return api.PHYS.GRAV; return baseAt(m, x, y) ? api.PHYS.GRAV : GRAV.DOWN * m.scale; },
    risingGravity() { const m = moonState(); return m && !m.inBase ? GRAV.UP * m.scale : api.PHYS.GRAV; },
  });

  window.MimoWorlds.register({
    world: 6,
    name: 'Mond',
    // right after the 13 levels of world 5 (42 + 13)
    firstLevel: 55,
    song: 'moon',
    lines: ['Ein kleiner Schritt für Mimo.', 'Ich bin leicht wie eine Feder.', 'Hallo Erde!', 'Riecht nach Käse. Komisch.', 'Pssst. Im All ist es leise.', 'Hier hüpft es sich gut.'],
    setup(a) { api = a; },
    init, update, physics,
  });
})();
