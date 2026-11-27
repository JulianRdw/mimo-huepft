// World 5: the animals of the climb as free cast entries, no family needed (a level may hold just the dog, or just the goat).
// All motion is a function of api.time and of fields of the entry; t0 (game time) is set by the scene op ['go', tag] (volcano-skit.js).
//
//   { who: 'dog', x, y, act: 'hint', aim: [x, y], t0?, every? }   Lotta sits and barks three times towards aim (the tail wags, a small
//        "Wuff!" and sound lines show where). Without t0 she barks that way every `every` seconds (default 6) for as long as Mimo is
//        within 14 tiles; with t0 she barks once, 3 barks from t0 (0.55 s apart), then sits and wags.
//   { who: 'dog', x, y, act: 'chase', follow: { x1, x2, t0?, dur, y? } }   runs after a point that moves from tile x1 to x2 in dur s from
//        t0 (Fauch's shadow; it is NOT drawn here), stays a little behind it and barks upwards; when the point stops she stops under it
//        and barks up at the sky. Set t0 with ['go', tag]. Before t0 she sits.
//   { who: 'dog', x, y }                                              standing alone in a level works as before (cast entry of the engine;
//        pose: 'sit' sits); carry: 'ember' holds a glowing stone. "Climbing along secretly": just put her near the goal, act 'hint'.
//   { who: 'goat', x, y, act: 'perch', line?, r? }                    Gerda stands on whatever the row y rests on (a rock), turns to Mimo when he
//        is within 10 tiles, chews, flicks. Words: line (a bubble when Mimo comes within r tiles, default 3.5) or a scene step { by: tag, say }.
//        She is a free cast entry in every level (the engine's named figures), act 'perch' only adds the turning.
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, ENV = () => C().storyEnv, API = () => ENV().api;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const px = (a) => [(a[0] + 0.5) * T, (a[1] + 0.5) * T];
  const BARK_GAP = 0.55, BARKS = 3, BARK_LEN = 0.28;

  // which bark of the series is on now (0-based) or -1; k seconds since the series started
  const barkAt = (k) => { if (k < 0) return -1; const i = Math.floor(k / BARK_GAP); return i < BARKS && k - i * BARK_GAP < BARK_LEN ? i : -1; };

  function barkFx(e, pos, i, dirX, up) {
    if (i === e._bark) return; e._bark = i; if (i < 0) return;
    const api = API(), f = pos.face >= 0 ? 1 : -1;
    api.floater(pos.x + f * 20, pos.foot - 30, 'Wuff!', '#C98A5E');
    if (api.sfx && api.sfx.stomp) { /* silent on purpose: no new sound */ }
  }
  function setMouth(e, open) { const pf = e.pf; if (pf) pf.mouthOpen = open ? 1 : 0.15; }

  const hint = {
    pos(e, time, env) { return env.position(e, time); },
    update(e, dt, env) {
      const api = env.api, pos = e.pos || env.position(e, api.time); e.pose = 'sit';
      const tgt = e.aim ? px(e.aim) : null, face = tgt ? (tgt[0] >= pos.x ? 1 : -1) : pos.face; if (e.pos) e.pos.face = face;
      let k;
      if (e.t0 != null) k = api.time - e.t0; else { const p = api.p, near = p && Math.abs(p.x + p.w / 2 - pos.x) < 14 * T, every = e.every || 6; k = near ? ((api.time + e.phase * 3) % every) : -1; }
      const i = barkAt(k); barkFx(e, e.pos || pos, i); setMouth(e, i >= 0);
      if (e.pos) e.pos.hop = i >= 0 ? 2 : 0;
      if (e.pf) { if (k >= 0 && k < BARKS * BARK_GAP + 1.4) e.pf.happy(1); if (tgt) e.pf.lookAt = tgt[0] - pos.x; }
      e._k = k; e._i = i;
    },
  };
  function barkLines(ctx, e, p) { // three short arcs from the muzzle towards the aim
    if (e._i == null || e._i < 0 || !e.aim) return;
    const t = px(e.aim), f = p.face >= 0 ? 1 : -1, x = p.x + f * 22, y = p.foot - 18, ang = Math.atan2(t[1] - y, t[0] - x), q = ((e._k - e._i * BARK_GAP) / BARK_LEN);
    ctx.save(); ctx.strokeStyle = '#8E8CA3'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - q * 0.6;
    for (const r of [8 + q * 4, 13 + q * 5]) { ctx.beginPath(); ctx.arc(x, y, r, ang - 0.4, ang + 0.4); ctx.stroke(); }
    ctx.restore();
  }

  // chase: the target x(t); the dog is a function of it
  const CHASE_LAG = 30;
  function chaseTarget(e, time) {
    const f = e.follow; if (!f || f.t0 == null && e.t0 == null) return null;
    const t0 = f.t0 != null ? f.t0 : e.t0, k = clamp01((time - t0) / f.dur), x = ((f.x1 + 0.5) + (f.x2 - f.x1) * k) * T;
    return { x, k, dir: Math.sign(f.x2 - f.x1) || 1 };
  }
  const chase = {
    pos(e, time, env) {
      const out = env.position(e, time), g = chaseTarget(e, time);
      if (!g) return out;
      const t0 = e.follow.t0 != null ? e.follow.t0 : e.t0, r = ease((time - t0) / 0.5), want = g.x - g.dir * (g.k >= 1 ? 22 : CHASE_LAG);
      out.x = e.x0 + (want - e.x0) * r; out.face = g.dir; out.running = (g.k > 0 && g.k < 1) || (r < 1 && r > 0); e.speed = Math.max(3, Math.abs(e.follow.x2 - e.follow.x1) / e.follow.dur);
      return out;
    },
    update(e, dt, env) {
      const api = env.api, g = chaseTarget(e, api.time), pos = e.pos; e.pose = g && g.k > 0 && g.k < 1 ? null : 'sit';
      if (!g || !pos) return;
      const k = api.time - (e.follow.t0 != null ? e.follow.t0 : e.t0);
      const moving = g.k > 0 && g.k < 1, series = moving ? Math.floor(k / 1.1) : -1, phase = moving ? k - series * 1.1 : -1;
      // while running: one bark every 1.1 s; at the end: a series of three under the target
      let i = -1; if (moving && phase < BARK_LEN) i = 100 + series; else if (!moving && g.k >= 1) { const q = barkAt(api.time - (e.follow.t0 != null ? e.follow.t0 : e.t0) - e.follow.dur - 0.3); i = q; }
      barkFx(e, pos, i); setMouth(e, i >= 0 || moving); e._i = i >= 0 ? 0 : -1; e._k = moving ? phase : api.time - (e.follow.t0 != null ? e.follow.t0 : e.t0) - e.follow.dur - 0.3; e._up = true;
      if (e.pf && (moving || g.k >= 1)) e.pf.happy(1);
      pos.hop = i >= 0 ? 2 : 0;
    },
  };
  function chaseLines(ctx, e, p) { // barks go upwards
    if (e._i == null || e._i < 0) return;
    const f = p.face >= 0 ? 1 : -1, x = p.x + f * 20, y = p.foot - 20, q = clamp01(e._k / BARK_LEN);
    ctx.save(); ctx.strokeStyle = '#8E8CA3'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - q * 0.6;
    for (const r of [8 + q * 4, 13 + q * 5]) { ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2 - 0.45 - f * 0.3, -Math.PI / 2 + 0.45 - f * 0.3); ctx.stroke(); }
    ctx.restore();
  }

  // Gerda
  const perch = {
    update(e, dt, env) {
      const api = env.api, p = api.p, pos = e.pos; if (!pos || !p) return;
      const dx = p.x + p.w / 2 - pos.x; if (Math.abs(dx) < 10 * T && Math.abs(p.y + p.h - pos.foot) < 8 * T) pos.face = dx >= 0 ? 1 : -1; else if (e.faceHome) pos.face = e.face || 1;
    },
  };

  C().acts = Object.assign(C().acts || {}, { hint, chase, perch });
  // overlays of the dog's barks (drawn in the layer of the figure overlays of volcano-story-acts2.js)
  function drawPets(layer, ctx) {
    const st = API().L && API().L.story; if (!st || layer !== 'mid') return;
    for (const e of st.cast) {
      if (e.who !== 'dog' || !e.pos || (e.act !== 'hint' && e.act !== 'chase') || !ENV().onScreen(e.pos.x, e.pos.foot, 120)) continue;
      if (e.act === 'hint') barkLines(ctx, e, e.pos); else chaseLines(ctx, e, e.pos);
    }
  }
  window.MimoWorlds.register({ world: 5, draw: drawPets, setup() {} });
})();
