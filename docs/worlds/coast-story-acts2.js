// World 4 story acts, part three (levels 37 to 42): what happens in the later levels besides standing and stealing.
//   parade    the flotsam parade: beach things drift along a current band (x to x2, items, gap tiles, speed tiles/s)
//   radio     a figure by the radio that cheers "Tooor!" exactly when Mimo falls into the water
//   stash     the Krake stores a thing: an arm comes out of a porthole (px, py tiles) with `item`, puts it on the pile at
//             x, y, pats it twice and slips back, humming; Mimo sets it off within r tiles
//   follow    a figure running after another entry (tag `follow`, `gap` tiles behind it): the filmer after the hermit crab
//   peek      two big eyes in the dark open as Mimo comes near (r tiles), follow him, blink, close: "Blubb."
//   candle    the lighthouse keeper searching her dark tower with a candle (an owner's act until Mimo comes)
//   crabride  a rider on a second taxi crab that runs in the lane behind a real crab (crab: { x, y } spawn): the professor
// Level and find fields read here:
//   hum: { below: row, text }       the level: Mimo hums to himself when he swims below this row (the deep sea)
//   dark: [x0, y0, x1, y1]          the level: a dark room (tiles); dim round Mimo until the find of style 'light' is in
//   lantern: { x, y }               the level: where the lighthouse light is (tiles); style 'light' switches it on
//   find.hum: { text, r }           the lost microphone is still on: the Krake's humming comes out of it
//   find.jelly: true                the find is the jellyfish 'u' at its x, y: an upside-down umbrella that throws Mimo
//                                   higher than a jellyfish, and he takes it on the first bounce
//   e.soot / e.inkable              a sleeper on the mattress is black from the ink (soot 0..1), or turns black when the
//                                   ink cloud of the chase rolls over him
// Every motion is a function of api.time and Mimo's place (never of a random number), so the level bots replay exactly.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, S = () => window.MimoCoast.sdraw, ENV = () => window.MimoCoast.storyEnv, TH = () => window.MimoCoast.thief;
  const clamp01 = (k) => Math.max(0, Math.min(1, k)), ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mimo = () => { const p = api.p; return p ? { x: p.x + p.w / 2, y: p.y + p.h / 2, feet: p.y + p.h } : null; };

  // ---------- parade: the flotsam drifts along with the current ----------
  function drawFloating(ctx, kind, t) {
    const sd = S();
    if (sd.ICONS[kind]) { sd.ICONS[kind](ctx, t); return; }
    ctx.save(); ctx.translate(0, 9); ctx.scale(0.8, 0.8); (sd.PROPS[kind] || sd.PROPS.bucket)(ctx, t, {}); ctx.restore();
  }
  const parade = {
    always: true,
    draw(ctx, e, pos, env) {
      const t = api.time, x0 = e.x0, x1 = (e.x2 + 0.5) * T, len = x1 - x0, sp = (e.speed || 3.3) * T, gap = (e.gap || 4) * T;
      if (len <= 0 || !env.onScreen((x0 + x1) / 2, e.foot, len / 2 + 80)) return;
      const n = Math.ceil(len / gap) + 1, loop = n * gap, items = e.items || ['ring', 'bucket', 'flipflop'];
      for (let i = 0; i < n; i++) {
        const d = t * sp + i * gap, x = x0 + (d % loop), k = (Math.floor(d / loop) * n + i) % items.length;
        if (x > x1 || !env.onScreen(x, e.foot, 40)) continue;
        const fade = Math.min(1, (x - x0) / T, (x1 - x) / T);
        ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.translate(x, e.foot - 30 + Math.sin(t * 2.1 + i * 1.7) * 4); ctx.rotate(Math.sin(t * 0.9 + i) * 0.5 + d * 0.004);
        drawFloating(ctx, items[k], t); ctx.restore();
      }
    },
  };

  // ---------- radio: cheers at the wrong moment, exactly when Mimo falls in ----------
  const GOALS = ['Tooor!', 'Jaaa! Tor!', 'Was für ein Spiel!'];
  const radio = {
    update(e, dt, env) {
      const p = api.p, r = e.rd || (e.rd = { air: 0, wasSwim: false, last: -9, n: 0 });
      if (!p || api.state !== 'play') return;
      const swim = !!p.swim;
      if (!p.grounded && !swim) r.air += dt; else if (!swim) r.air = 0;
      if (swim && !r.wasSwim && r.air > 0.25 && api.time - r.last > 3) {
        const m = mimo(), near = Math.abs(m.x - (e.pos ? e.pos.x : e.x0)) < 16 * T && Math.abs(m.feet - e.foot) < 12 * T;
        if (near) { r.last = api.time; C().cast.play(e, 'hooray'); C().director.say(e, GOALS[r.n % GOALS.length], { prio: 'player', wait: 0.8, secs: 1.4 }); r.n++; }
      }
      if (swim) r.air = 0;
      r.wasSwim = swim;
    },
    draw(ctx, e, pos, env) { env.drawFigure(ctx, e, pos); },
  };

  // ---------- stash: the Krake puts a thing on its pile ----------
  const ST = { OPEN: 0.35, REACH: 1.3, SET: 1.75, PAT: 2.45, BACK: 3.2 };
  const stash = {
    always: true,
    update(e, dt, env) {
      const s = e.sh || (e.sh = { t0: -1, hummed: 0 }); if (s.t0 >= 0 || api.state !== 'play') { if (s.t0 >= 0) hum(e, s); return; }
      const m = mimo(); if (m && Math.hypot(m.x - e.x0, m.feet - e.foot) < (e.r || 7) * T) s.t0 = api.time;
    },
    draw(ctx, e, pos, env) {
      if (!env.onScreen(e.x0, e.foot, 360)) return;
      const s = e.sh || { t0: -1 }, k = s.t0 < 0 ? -1 : api.time - s.t0, t = api.time;
      const rest = { x: e.x0 + (e.dx || 0), y: e.foot - (e.ih || 44) }, bx = (e.px + 0.5) * T, by = (e.py + 0.5) * T;
      // the porthole goes dark while the arm is out
      if (k >= 0 && k < ST.BACK + 0.4) { ctx.save(); ctx.globalAlpha = 0.75 * Math.min(1, k / ST.OPEN) * (1 - clamp01((k - ST.BACK) / 0.4)); ctx.fillStyle = '#1E2140'; ctx.beginPath(); ctx.arc(bx, by, 10, 0, TAU); ctx.fill(); ctx.restore(); }
      const held = k >= 0 && k < ST.SET, over = { x: rest.x - 4, y: rest.y - 30 };
      if (!held && k >= ST.SET) { ctx.save(); ctx.translate(rest.x, rest.y); drawFloating(ctx, e.item || 'ball', t); ctx.restore(); }
      if (k < ST.OPEN || k > ST.BACK) return;
      let tip, curl = 1;
      if (k < ST.REACH) { const q = ease((k - ST.OPEN) / (ST.REACH - ST.OPEN)); tip = { x: lerp(bx, over.x, q), y: lerp(by, over.y, q) }; }
      else if (k < ST.SET) { const q = ease((k - ST.REACH) / (ST.SET - ST.REACH)); tip = { x: over.x, y: lerp(over.y, rest.y - 12, q) }; }
      else if (k < ST.PAT) { const q = (k - ST.SET) / (ST.PAT - ST.SET); curl = 0.3; tip = { x: rest.x + 2, y: rest.y - 16 - Math.abs(Math.sin(q * TAU)) * 12 }; }
      else { const q = ease((k - ST.PAT) / (ST.BACK - ST.PAT)); curl = 0.3; tip = { x: lerp(rest.x + 2, bx, q), y: lerp(rest.y - 16, by, q) }; }
      const arm = TH().armPoints(bx, by, tip.x, tip.y, t, { curl, side: -1, amp: 5, r: 8 });
      if (held) { ctx.save(); ctx.translate(arm.hook.x, arm.hook.y); ctx.rotate(Math.sin(t * 7) * 0.15); drawFloating(ctx, e.item || 'ball', t); ctx.restore(); }
      TH().drawArm(ctx, arm.ps, 15, t);
    },
  };
  function hum(e, s) { // a few notes float out of the porthole while the arm is out, and the Krake hums its tune once
    const k = api.time - s.t0, n = Math.floor(k / 0.7);
    if (k < ST.BACK + 1 && n >= s.hummed) { s.hummed = n + 1; api.floater((e.px + 0.5) * T + 10, (e.py + 0.5) * T - 14, n % 2 ? '♫' : '♪', '#E26A8A'); }
    if (k > 0.6 && !s.said && e.hum) { s.said = true; C().director.say({ x: (e.px + 0.5) * T, y: (e.py + 0.5) * T - 16, w: 0 }, e.hum, { prio: 'theft', wait: 4 }); }
  }

  // ---------- follow: running after another entry ----------
  const follow = {
    pos(e, time, env) {
      const st = env.story(), q = st && st.cast.find((c) => c.tag === e.follow);
      if (!q || !q.pos) return { x: e.x0, foot: e.foot, face: e.face || 1, hop: 0 };
      const f = q.pos.face || 1;
      return { x: q.pos.x - f * (e.gap || 1.4) * T, foot: e.foot, face: f, hop: 0, running: true };
    },
    draw(ctx, e, pos, env) { env.drawFigure(ctx, e, pos); },
  };

  // ---------- peek: the Krake's eyes in the dark ----------
  const peek = {
    always: true,
    update(e, dt, env) {
      const s = e.pk || (e.pk = { t0: -1, said: false }); if (api.state !== 'play') return;
      const m = mimo();
      if (s.t0 < 0 && m && Math.hypot(m.x - e.x0, m.y - (e.foot - 20)) < (e.r || 6) * T) s.t0 = api.time;
      if (s.t0 >= 0 && !s.said && api.time - s.t0 > 3.2) { s.said = true; C().pop(e.x0, e.foot - 50, 'Blubb.', { size: 16, fill: '#F9BFCB' }); }
    },
    draw(ctx, e, pos, env) {
      const s = e.pk; if (!s || s.t0 < 0 || !env.onScreen(e.x0, e.foot, 120)) return;
      const k = api.time - s.t0, open = ease(k / 0.45) * (1 - ease((k - 3.0) / 0.35)); if (k > 3.5) return;
      const blink = k > 1.7 && k < 1.86 ? 0.1 : 1, m = mimo(), sc = e.scale || 1;
      ctx.save(); ctx.translate(e.x0, e.foot - 20); ctx.scale(sc, sc);
      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 46); g.addColorStop(0, 'rgba(240,143,164,' + (0.22 * open).toFixed(3) + ')'); g.addColorStop(1, 'rgba(240,143,164,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
      const lx = m ? Math.max(-3, Math.min(3, (m.x - e.x0) / 40)) : 0, ly = m ? Math.max(-3, Math.min(3, (m.y - e.foot + 20) / 40)) : 0;
      for (const sx of [-13, 13]) {
        ctx.save(); ctx.translate(sx, 0); ctx.scale(1, Math.max(0.05, open * blink));
        ctx.fillStyle = '#FFF6E0'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2A2440'; ctx.beginPath(); ctx.ellipse(lx, ly, 4.6, 6.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(lx + 1.6, ly - 2.4, 1.6, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
  };

  // ---------- candle: the keeper searches her dark tower ----------
  const candleAct = {
    pos(e, time) {
      const a = time * 0.55 + e.phase, x = e.x0 + Math.sin(a) * 1.4 * T;
      return { x, foot: e.foot, face: Math.cos(a) >= 0 ? 1 : -1, hop: 0, walk: time * 7.5 };
    },
    draw(ctx, e, pos, env) {
      ctx.save(); ctx.translate(pos.x, pos.foot); S().keeper(ctx, api.time, { face: pos.face, walk: pos.walk, candle: true }); ctx.restore();
      const c = (api.time * 0.45 + e.phase) % 1; if (c > 0.1 && c < 0.45) S().tag(ctx, '?', pos.x - pos.face * 12, pos.foot - 66 - c * 6, 0.1);
    },
  };

  // ---------- crabride: a second taxi crab in the lane behind a real one (crab: { x, y } of its spawn), a rider on top ----------
  const crabride = {
    pos(e, time) {
      const c = api.L && api.L.coast, b = c && c.crabs.find((q) => q.tx === e.crab.x && q.ty === e.crab.y);
      if (!b) return { x: e.x0, foot: e.foot, face: 1, hop: 0, still: true };
      return { x: b.x + b.w / 2 + (e.dx || 0) * T, foot: b.y + 22 - (e.lift == null ? 6 : e.lift), face: b.dir, hop: 0, still: true, step: b.step };
    },
    draw(ctx, e, pos, env) {
      const sc = e.crabScale || 0.95;
      e.pose = 'write'; e.poseOpts = { dir: pos.face };
      ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(sc, sc); S().crab(ctx, api.time, { hop: Math.abs(Math.sin((pos.step || 0) * 0.1)) * 1.5 }); ctx.restore();
      env.drawFigure(ctx, e, { ...pos, foot: pos.foot - 14 * sc });
    },
  };

  // ---------- a sleeper blackened by the ink ----------
  let soot = null;
  // ink splotches on the lying sleeper ([x, y, r] from the middle of the mattress; head on the left, the face mostly spared), in the order they land
  const INK_BLOTS = [[6, -12, 5.5], [-2, -16, 4], [18, -10, 4.5], [12, -16, 3.5], [-1, -5, 3.6], [26, -12, 3.2], [1, -8, 3], [-21, -17, 2.2], [22, -16, 2.6]];
  function inkFloat(ctx, e, pos) {
    const c = api.L && api.L.chase;
    if (e.inkable && c) e.soot = Math.max(e.soot || 0, clamp01((c.x - (pos.x - 50)) / 70));
    const k = e.soot || 0;
    C().castDraw.drawFloat(ctx, e, pos);
    if (k <= 0.01) return;
    if (e.inkable && k > 0.5 && !e.inkSaid) { e.inkSaid = true; C().pop(pos.x, pos.foot - 40, 'Blubb?', { size: 15, fill: '#B9B7C9' }); }
    if (typeof document === 'undefined') return;
    const W = 200, H = 120, R = 2;
    if (!soot) { soot = document.createElement('canvas'); soot.width = W * R; soot.height = H * R; }
    // only the sleeper is drawn into the soot canvas (the mattress keeps its colour), then ink splotches land on him
    const g = soot.getContext('2d'); g.setTransform(R, 0, 0, R, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    const t = api.time, bob = Math.sin(t * 1.3 + e.phase) * 1.8;
    g.save(); g.translate(W / 2 - pos.x, H * 0.75 - pos.foot); C().castDraw.drawFloat(g, e, pos, true); g.restore();
    g.globalCompositeOperation = 'source-atop'; g.save(); g.translate(W / 2, H * 0.75 - 3 + bob);
    const n = Math.min(INK_BLOTS.length, Math.ceil(INK_BLOTS.length * k));
    for (let i = 0; i < n; i++) {
      const [bx, by, br] = INK_BLOTS[i], grow = Math.min(1, INK_BLOTS.length * k - i);
      g.fillStyle = 'rgba(34,30,52,0.94)'; g.beginPath(); g.ellipse(bx, by, br * grow, br * 0.8 * grow, i * 0.7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(122,112,180,0.55)'; g.beginPath(); g.ellipse(bx - br * 0.3, by - br * 0.3, br * 0.3 * grow, br * 0.18 * grow, -0.4, 0, TAU); g.fill();   // a wet gloss
    }
    g.restore(); g.globalCompositeOperation = 'source-over';
    ctx.drawImage(soot, pos.x - W / 2, pos.foot - H * 0.75, W, H);
    if (k > 0.6) { // a few drips into the sea
      ctx.save(); ctx.globalAlpha = (k - 0.6) / 0.4;
      ctx.fillStyle = 'rgba(34,30,52,0.8)'; for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(pos.x - 20 + i * 18, pos.foot - 2 + q * 12, 1.6 * (1 - q), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  // ---------- the umbrella that is a jellyfish ----------
  const JELLY_BOOST = 1.32;
  function jellyFind() { const st = api.L && api.L.story, f = st && st.find; return f && f.jelly ? f : null; }
  function updateJelly() {
    const f = jellyFind(), p = api.p; if (!f || !p) return;
    const mu = api.L.mushrooms.find((m) => m.x === f.x && m.y === f.y); if (!mu) return;
    if (mu.squash < 0.5) f.jb = false;
    if (!f.jb && !f.got && mu.squash > 0.9 && p.vy < 0) { f.jb = true; p.vy *= JELLY_BOOST; }
  }
  // drawn instead of the jellyfish until Mimo has the umbrella (coast-look.js asks first)
  function jellySkin(mu, x, y, ctx) {
    const f = jellyFind(); if (!f || f.got || mu.x !== f.x || mu.y !== f.y) return false;
    const sq = mu.squash, t = api.time;
    // upside down: the canopy is a bowl on the ground, the handle sticks up out of it (the shape is 71 units tall)
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.25, 1 - sq * 0.3); ctx.translate(0, -44 + Math.sin(t * 2) * 1.2);
    ctx.rotate(Math.PI + Math.sin(t * 1.6) * 0.05); ctx.scale(0.62, 0.62); S().PROPS.umbrella(ctx, t, {}); ctx.restore();
    return true;
  }

  // ---------- Mimo hums in the deep; the lost microphone hums ----------
  function updateHum(dt) {
    const L = api.L, p = api.p, st = L && L.story, def = st && st.def; if (!p || api.state !== 'play') return;
    const h = def && def.hum, w = L.w4hum || (L.w4hum = { said: false, next: 0 });
    if (h && p.swim && (p.y + p.h) / T > h.below) {
      if (!w.said) { w.said = true; C().director.say('player', h.text || 'Hm, hm, hmm. Gar nicht gruselig.', { prio: 'player' }); }
      if (api.time >= w.next) { w.next = api.time + 1.3; api.floater(p.x + p.w / 2 + 10, p.y - 6, Math.floor(api.time) % 2 ? '♪' : '♫', '#9ED3EE'); }
    }
    const f = st && st.find; if (!f || !f.hum || f.got) return;
    const m = mimo(), d = Math.hypot(m.x - f.cx, m.y - f.cy) / T; if (d > (f.hum.r || 6)) return;
    if (!f.hummed) { f.hummed = true; C().director.say(f.humAnchor || (f.humAnchor = { x: f.cx, y: f.cy - 14, w: 0 }), f.hum.text, { prio: 'player' }); }
    if (api.time >= (f.humNext || 0)) { f.humNext = api.time + 0.8; api.floater(f.cx + 8, f.cy - 16, Math.floor(api.time * 2) % 2 ? '♪' : '♫', '#E26A8A'); }
  }

  // ---------- the lighthouse: dark until the bulb is in, then the light sweeps over the sea ----------
  // the light comes on when the bulb is in the lantern (f.fx.light, set by the keeper's gag in coast-handover-gags.js)
  function lightK() { const st = api.L && api.L.story, f = st && st.find, at = f && f.fx && f.fx.light; return at != null ? ease((api.time - at) / 0.6) : 0; }
  function drawLight(ctx) {
    const st = api.L && api.L.story, def = st && st.def, lt = def && def.lantern; if (!lt) return;
    const k = lightK(); if (k <= 0) return;
    S().beam(ctx, (lt.x + 0.5) * T, (lt.y + 0.5) * T, k, -Math.PI / 2 + Math.sin(api.time * 0.55) * 1.5, 1500);
  }
  function drawDark(ctx) {
    const st = api.L && api.L.story, def = st && st.def, d = def && def.dark, p = api.p; if (!d || !p) return;
    const a = 0.42 * (1 - lightK()); if (a <= 0.01) return;
    const x0 = d[0] * T, y0 = d[1] * T, x1 = (d[2] + 1) * T, y1 = (d[3] + 1) * T, mx = p.x + p.w / 2, my = p.y + p.h / 2;
    const g = ctx.createRadialGradient(mx, my, 40, mx, my, 150);
    g.addColorStop(0, 'rgba(18,20,46,0)'); g.addColorStop(1, 'rgba(18,20,46,' + a.toFixed(3) + ')');
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
  }

  window.MimoCoast.acts = Object.assign(window.MimoCoast.acts || {}, { parade, radio, stash, follow, peek, candle: candleAct, crabride });
  Object.assign(window.MimoCoast, { inkFloat, jellySkin });
  window.MimoWorlds.register({
    world: 4,
    setup(a) { api = a; },
    update(dt) { if (!api.L || !api.L.story) return; updateJelly(); updateHum(dt); },
    draw(layer, ctx) { if (layer === 'back') drawLight(ctx); else if (layer === 'front') drawDark(ctx); },
  });
})();
