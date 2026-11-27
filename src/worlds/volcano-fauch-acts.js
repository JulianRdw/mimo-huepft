// World 5: more Fauch acts (volcano-fauch.js is the engine: same cast entry `{ who: 'fauch', act, x, y, at, then, ... }`, same
// director beat, same fields). Pure decoration, only api.time decides, nothing touches the physics.
//   brood      (46) he sits on a far rock and warms something round under his wing (the egg, not clear to see). When Mimo comes
//              near (at, default x - 7 tiles) he flinches, slaps the wing over it, looks up and away: "Hmpf."
//              fields: face, scale (default 0.8), pop (the word, default 'Hmpf.', false = none)
//   sleepwith  (50) quiet landing at x, y (beside a rest bench), he curls up and snores (Z's and little smoke puffs in the
//              rhythm of 2.6 s, the same as the bench act). A startle wakes him: eyes wide, jolt, he flies off in a hurry.
//              fields: scale (0.9), face, away (-1 | 1 the direction he flies off, default behind him),
//              snoreWith (tag of the sleeper on the bench: the Z's keep the beat of that figure's own Z's),
//              startleAfter (seconds of sleep until he wakes by himself; without it only the startle event wakes him)
//              the startle: scene op ['fx', 'startle', fauchTag] (see world5-kit.md) or MimoVolcano.fauchStartle(tag)
//   wave       (54) he sits (a cairn, a rock) looking at Mimo; when started he raises a claw and waves, shy at first, then big.
//              fields: face, scale (0.7). Usually manual: true, started by ['fx', 'fauch', tag] right after the fan waved
//   ringout    (51) a round smoke ring comes out of a crack at tile x, y and drifts off, a smaller second one follows.
//              fields: dir (1 right, -1 left, 0 up; default 1), n (rings, 1 or 2, default 2), scale (1)
//   Every act may carry manual: true (start only by the scene op ['fx', 'fauch', tag], at is ignored) and tag.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const V = () => window.MimoVolcano, C = () => window.MimoCoast, FD = () => window.MimoVolcano.fauchDraw;
  const clamp = (k) => Math.max(0, Math.min(1, k));
  const seg = (k, a, b) => clamp((k - a) / (b - a));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const px = (e) => e.x0, foot = (e) => e.foot;
  const mimoX = () => { const p = api.p; return p ? p.x + p.w / 2 : 0; };
  const look = (e, x) => Math.max(-1, Math.min(1, (mimoX() - x) / 160)) * (e.face || 1);
  const blink = (t, ph) => { const q = (t + ph) % 3.7; return q < 0.14 ? Math.sin(q / 0.14 * Math.PI) : 0; };
  const pop = (x, y, text, size) => { if (text) C().pop(x, y, text, { size: size || 24, fill: '#F28C82' }); };
  const st = (e) => e.s || (e.s = {});
  const SNORE = 2.6;   // seconds of one snore: the bench act of the story (volcano-story-acts.js) uses the same beat

  // ---------- brood ----------
  const brood = {
    len: 5.0, layer: 'mid', visible: true,
    draw(ctx, e, k) {
      const t = api.time, x = px(e), f = foot(e), s = e.scale || 0.8, d = e.face || 1;
      const o = { egg: true, scale: s, face: d, tail: 0.15, lean: 0.8, sleepy: 0.55, cover: 0.55 + Math.sin(t * 1.3) * 0.03, blink: blink(t, e.x0 * 0.2) * 0.8, look: 0.4 };
      let lift = 0;
      if (k != null) {
        const up = ease(seg(k, 0.1, 0.7)), slam = ease(seg(k, 0.95, 1.25)), away = ease(seg(k, 1.7, 2.5));
        o.lean = 0.8 * (1 - up); o.sleepy = 0.55 * (1 - up); o.blink = 0; o.look = look(e, x) * (1 - away) - 0.9 * away;
        o.wide = 0.6 * Math.sin(clamp((k - 0.5) / 0.9) * Math.PI);
        o.cover = lerp(lerp(0.55, 0.3, up), 1, slam); o.lookUp = away; o.tail = 0.1 + 0.5 * away;
        lift = Math.sin(seg(k, 0.95, 1.35) * Math.PI) * 6;
        if (k > 3.4) { o.puff = 1; o.blink = blink(t, 0.4); }
        if (k > 2.6 && k % 4.2 > 3.6) { o.lookUp = 0; o.look = look(e, x); }   // a quick sideways peek, then away again
      }
      ctx.save(); ctx.translate(x, f - lift); FD().sit(ctx, t, o); ctx.restore();
      if (api.reduced) return;
      // the warmth: two soft wavy lines over the wing, stronger while he is brooding
      const a = k == null || k < 0.9 ? 0.32 : 0.16, ex = x + 27 * s * d, ey = f - 46 * s;
      ctx.save(); ctx.strokeStyle = '#FFD9A0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const q = (t * 0.5 + i * 0.5) % 1; ctx.globalAlpha = a * Math.sin(q * Math.PI); ctx.beginPath();
        for (let j = 0; j <= 6; j++) { const y = ey - q * 34 - j * 3.4, xx = ex + (i ? 7 : -5) * s + Math.sin(j * 1.1 + t * 3 + i) * 2.4; j ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); }
        ctx.stroke();
      }
      ctx.restore();
    },
    at(e, k) {
      const s = e.scale || 0.8, d = e.face || 1;
      if (k > 0.7 && !e.woke) { e.woke = true; pop(px(e) + 24 * d, foot(e) - 135 * s, '!', 24); }
      if (k > 1.15 && !e.slapped) { e.slapped = true; api.noise({ lp: 900, dur: 0.12, vol: 0.03 }); api.burst(px(e) + 28 * s * d, foot(e) - 6, 5, ['#E6E1EE', '#B9B3C9'], 60, { grav: 120, life: 0.5 }); }
      if (k > 2.6 && !e.huffed) { e.huffed = true; pop(px(e) + 44 * d, foot(e) - 152 * s, e.pop === false ? null : e.pop || 'Hmpf.', 20); }
    },
  };

  // ---------- sleepwith ----------
  const SW = { GLIDE: [1.1, 3.6], SIT: 3.6, CURL: [4.6, 5.8], ASLEEP: 5.8 };
  const dirAway = (e) => e.away || -(e.face || 1);
  const sleeperPhase = (e) => { const o = e.snoreWith ? C().scene.find(e.snoreWith) : null; return o && o.phase != null ? o.phase : 0; };
  function startle(e) {
    if (!e || e.fact !== 'sleepwith' || e.t0 == null) return false;
    const s = st(e); if (s.startAt != null) return false;
    s.startAt = Math.max(api.time, e.t0 + SW.CURL[1]);   // not before he is curled up: an early call waits for that
    return true;
  }
  const sleepwith = {
    len: 7.0, layer: 'mid', visible: true,
    begin() { api.noise({ lp: 200, dur: 1.6, vol: 0.012, attack: 0.5 }); },
    draw(ctx, e, k) {
      if (k == null) return;
      const t = api.time, x = px(e), f = foot(e), sc = e.scale || 0.9, d = e.face || 1, s = st(e), q = s.startAt == null ? -1 : t - s.startAt;
      if (q >= 0) return drawStartle(ctx, e, q, x, f, sc, d);
      if (k < SW.GLIDE[0] + 1.3) {   // a soft shadow grows first
        const sh = seg(k, 0, 2.4); ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = 0.2 * sh; ctx.beginPath(); ctx.ellipse(x, f - 1, 20 + 36 * sh, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      if (k < SW.SIT) {
        const u = seg(k, SW.GLIDE[0], SW.GLIDE[1]); if (u <= 0) return;
        ctx.save(); ctx.translate(lerp(x - 330 * d, x, ease(u)), lerp(f - 230, f - 56 * sc, ease(u))); FD().fly(ctx, t, { face: d, scale: sc, flap: 1.1 * (1 - 0.6 * u), legs: seg(u, 0.5, 1) }); ctx.restore(); return;
      }
      const c = ease(seg(k, SW.CURL[0], SW.CURL[1])), u = (t + sleeperPhase(e)) / SNORE, br = 0.5 + 0.5 * Math.sin(u * TAU), exhale = Math.max(0, -Math.cos(u * TAU));
      ctx.save(); ctx.translate(x, f);
      if (c < 1) FD().sit(ctx, t, { face: d, scale: sc, wings: 1 - ease(seg(k, SW.SIT, SW.SIT + 0.9)), sleepy: seg(k, 4.0, 4.6), blink: blink(t, 0.3) * (1 - c), alpha: 1 - c, look: Math.sin((k - SW.SIT) * 2) * 0.6, tail: 0.2 });
      if (c > 0) FD().curl(ctx, t, { face: d, scale: sc, alpha: c, breath: br, puff: k > SW.ASLEEP ? exhale : 0 });
      ctx.restore();
    },
    at(e, k) {
      const s = st(e), sc = e.scale || 0.9, d = e.face || 1;
      if (k > SW.SIT && !s.landed) { s.landed = true; api.burst(px(e), foot(e), 5, ['#B9B3C9', '#8E8CA3'], 40, { grav: 120, life: 0.7 }); }
      if (e.startleAfter != null && k > SW.ASLEEP + e.startleAfter && s.startAt == null) startle(e);
      if (k > SW.ASLEEP && s.startAt == null && !api.reduced) {
        const n = Math.floor((api.time + sleeperPhase(e)) / SNORE - 0.3);
        if (n !== s.zN) { if (s.zN != null) api.floater(px(e) + 34 * sc * d, foot(e) - 40 * sc, n % 2 ? 'Zz' : 'Z', '#8E8CA3'); s.zN = n; }
      }
      const q = s.startAt == null ? -1 : api.time - s.startAt;
      if (q >= 0 && !s.shock) { s.shock = true; api.shake(0.18); pop(px(e) + 10 * d, foot(e) - 120 * sc, '!', 28); api.noise({ hp: 700, dur: 0.15, vol: 0.03 }); }
    },
  };
  // the startle: a jolt up, huge eyes, a moment of trembling, then off in a hurry
  function drawStartle(ctx, e, q, x, f, sc, d) {
    const t = api.time, away = dirAway(e);
    if (q < 0.9) {
      const jolt = Math.sin(clamp(q / 0.22) * Math.PI) * 20 * (1 - seg(q, 0.25, 0.5)), tremble = q > 0.3 ? Math.sin(q * 60) * 1.4 : 0;
      ctx.save(); ctx.translate(x + tremble, f - jolt);
      FD().sit(ctx, t, { face: d, scale: sc, wide: 1, wings: Math.min(1, q / 0.2), look: look(e, x), tail: 0.9, lean: -0.2 }); ctx.restore(); return;
    }
    const u = seg(q, 0.9, 3.4); if (u >= 1) return;
    ctx.save(); ctx.translate(x + away * (u * u * 160 + u * 360), f - 58 * sc - u * u * 150 - u * 220); FD().fly(ctx, t, { face: away, scale: sc, flap: 3.2, legs: 1 - Math.min(1, u * 3) }); ctx.restore();
  }

  // ---------- wave ----------
  const wave = {
    len: 7.6, layer: 'mid', visible: true,
    draw(ctx, e, k) {
      const t = api.time, x = px(e), f = foot(e), sc = e.scale || 0.7, d = e.face || 1;
      const o = { scale: sc, face: d, tail: 0.3, look: look(e, x), blink: blink(t, 0.9) };
      if (k != null) {
        // shy: the claw comes up half way, wiggles a little, sinks a bit, then goes up high and waves wide
        const r1 = ease(seg(k, 0.8, 2.0)), dip = ease(seg(k, 2.0, 2.6)) * 0.3, r2 = ease(seg(k, 2.8, 3.6)), end = ease(seg(k, 6.4, 7.8));
        o.wave = (0.55 * r1 - dip + (1 - 0.55 + dip) * r2) * (1 - end);
        o.waveAmp = (0.25 * r1 * (1 - r2) + r2) * (1 - end); o.waveHz = 1.0 + 0.5 * r2;
        if (k > 2.0 && k < 2.9) { o.look = -0.7 * (e.face || 1) * 0; o.lookUp = 0.7; o.blink = 0; }
        if (k > 3.6 && k < 6.4) o.tail = 0.9;
      }
      ctx.save(); ctx.translate(x, f); FD().sit(ctx, t, o); ctx.restore();
    },
    at(e, k) { if (k > 3.7 && !e.cheer && e.pop) { e.cheer = true; pop(px(e) + 30 * (e.face || 1), foot(e) - 110 * (e.scale || 0.7), e.pop, 20); } },
  };

  // ---------- ringout ----------
  // a ring seen nearly face on (it comes towards the player out of a crack): a thick soft hoop, a light rim, a little wobble
  function roundRing(ctx, r, a, t) {
    const sq = 0.84 + Math.sin(t * 2.4) * 0.04;
    ctx.save(); ctx.globalAlpha = a; ctx.rotate(-0.25 + Math.sin(t * 1.3) * 0.08);
    ctx.lineWidth = Math.max(4, r * 0.34); ctx.strokeStyle = '#B9B3C9'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * sq, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(2, r * 0.13); ctx.strokeStyle = '#EAE5F1'; ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.98, r * sq * 0.98, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }
  const ringout = {
    len: 4.8, layer: 'mid', visible: true,
    begin() { api.noise({ lp: 320, dur: 0.7, vol: 0.025, attack: 0.15 }); },
    draw(ctx, e, k) {
      if (k == null || k > 7) return;
      const t = api.time, gx = px(e), gy = (e.y + 0.5) * T, dir = e.dir == null ? 1 : e.dir, sc = e.scale || 1;
      // the crack breathes out first: a warm glow and grey puffs
      const g = Math.min(seg(k, 0, 0.5), 1 - seg(k, 1.2, 2.2));
      if (g > 0) {
        ctx.save(); ctx.globalAlpha = g * 0.5; ctx.fillStyle = '#FFB36B'; ctx.beginPath(); ctx.ellipse(gx, gy, 18 * sc, 12 * sc, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B9B3C9'; for (let i = 0; i < 3; i++) { const q = (k * 0.9 + i / 3) % 1; ctx.globalAlpha = g * 0.7 * (1 - q); ctx.beginPath(); ctx.arc(gx + dir * q * 20 * sc, gy - q * 16 * sc, (5 + q * 6) * sc, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      for (let i = 0; i < (e.n == null ? 2 : e.n); i++) {
        const q = seg(k, 0.9 + i * 1.0, 4.6 + i * 1.0); if (q <= 0 || q >= 1) continue;
        const r = lerp(5, i ? 26 : 38, ease(q)) * sc, x = gx + dir * q * (i ? 150 : 190) * sc + Math.sin(q * 5 + i) * 4, y = gy - q * (dir ? 70 : 190) * sc - Math.sin(q * 3 + i) * 5;
        const al = Math.min(1, q * 8) * (1 - seg(q, 0.72, 1)) * 0.92;
        ctx.save(); ctx.translate(x, y);
        if (dir) roundRing(ctx, r, al, t + i); else FD().ring(ctx, r, al, t);
        ctx.restore();
      }
    },
  };

  function install() {
    const A = V().fauchActs; if (!A) return;
    Object.assign(A, { brood, sleepwith, wave, ringout });
  }
  // scene ops: ['fx', 'startle', tag] wakes the sleepwith act of that tag; ['fx', 'fauch', tag] starts a manual act
  V().skitFx = Object.assign(V().skitFx || {}, {
    startle(args) { startle(C().scene.find(args[0])); },
    fauch(args) { const e = C().scene.find(args[0]); if (e && e.who === 'fauch') e.armed = true; },
  });
  Object.assign(V(), {
    fauchStartle(tag) { return startle(C().scene.find(tag)); },
    fauchGo(tag) { const e = C().scene.find(tag); if (e && e.who === 'fauch') { e.armed = true; return true; } return false; },
  });
  install();
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; } });
})();
