// World 5 scene runner: the opening before a level and the closing after the fight, as scripts. A script is plain data plus a few
// functions; this file plays it (volcano-scenes-default.js has the scripts of "Gipfelsturm": Fauch's swoop and the closing photo).
//   MimoVolcano.scenes.add(name, script)        register a script (a level may name its own: opening: 'name')
//   MimoVolcano.scenes.start('closing', B)      start a screen script as the scene of a boss (api.boss.scene); false when it cannot
//                                               start (no pictures yet, test automation). finished() says when it is over
//   MimoVolcano.forceOpening / forceClosing = true   play even under test automation (the video tools); openingReset() plays it again
// OPENING (level field `opening: true` or a script name; world space, the level's start is the anchor, the cast stands on the ground
// of the start cell; the scene plays once per browser (storage "mimo.volcano.opening"), jumping skips it, never under test automation):
//   script = { length, cast: [{ k, who, start: { dx, ...fields }, end: { dx, ...fields } }], camera: [[t, dx, dy, zoom], ...], pan: [t0, t1],
//              beats: (S) => [[t, () => ...], ...], draw(ctx, S, layer) }
//   cast   (k = the key beats use, fields = extra cast fields) the people are real cast entries of the level (engine of coast-story.js): they walk, pose and speak, and stand at `end`
//          (dx px right of the start, plus any cast fields: act, pose, face, pack ...) after the scene and at every later start
//   camera keys: the view centre (dx, dy px from the start's feet) and zoom at scene second t; between keys it eases; from pan[0]
//          to pan[1] it moves on to the level's own camera
//   beats  events in scene seconds; the helpers S: t, x(dx), foot, e(k), say(k, text, secs), walk(k, dx, speed, o), pose(k, name, dir),
//          look(k, dx), set(k, fields), pop(dx, dy, text, o), hop(k, dx, dy, dur, h), path(k, [[dx, dy], ...], speed, o) (a walk
//          whose feet follow the points, e.g. down a gangplank), fx (scratch object), api
//   the scene fades in from the sky colour by itself (the game's round wipe and Mimo's start line are switched off for it)
// CLOSING (a screen script, drawn in the layer 'over' with its own camera, like the beach party of world 4; cast entries are the
//   scene's own, S.say draws speech bubbles in screen units, always inside the safe part of a phone screen, with a tail to the
//   speaker): script = { length, ground, cast: [{ k, who, x, fields? }], camera: [[t, cx, zoom, share]...], beats, draw(ctx, S, cam),
//   step(S, dt) (optional, every step of the scene clock) }
//   `ground` is the screen y of the feet; camera centre cx in px, share = where the ground sits (0..1 of the view height).
// Everything runs on the game clock in fixed steps (the bots replay exactly); nothing here touches the physics or the fight.
(function () {
  'use strict';
  let api = null;
  const T = 32, KEY = 'mimo.volcano.opening';
  const C = () => window.MimoCoast, ENV = () => C().storyEnv, KIT = () => C().castKit, CD = () => C().castDraw, V = () => window.MimoVolcano;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const scripts = {};
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (_) { return false; } };
  const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch (_) { /* no storage: it plays once per session */ } };
  const automated = (force) => typeof navigator !== 'undefined' && navigator.webdriver && !force;
  let sessionSeen = false, op = null, cl = null;

  function entry(c, i, extra) {
    const { dx, dy, ...fields } = { ...(c.start || {}), ...extra }, e = ENV().makeEntry({ who: c.who, x: 0, y: 0, ...(c.fields || {}), ...fields }, i);
    if (e) { e.sk = c.k; if (e.pack != null || e.scarf) e.extra = V().extraFor(e); }
    return e;
  }
  const place = (e, x, foot) => { e.x = e.x0 = x; e.bx = x; e.foot = foot; e.anchor.x = x; e.mv = null; };
  // the helpers a script's beats get
  function helpers(st, ground, screen) {
    const S = {
      get t() { return st.t; }, api, fx: {}, get foot() { return ground(); }, x: (dx) => st.ax + dx, e: (k) => st.cast[k],
      say: (k, text, secs) => (screen ? st.says.push({ e: st.cast[k], text, t0: st.t, dur: secs || 2.6 }) : C().cast.say(st.cast[k], text, secs)),   // a closing draws its own tags
      walk: (k, dx, speed, o) => C().cast.walkTo(st.cast[k], st.ax + dx, { speed: speed || 1.1, ...(o || {}) }),
      pose: (k, name, dir) => C().scene.hold(st.cast[k], name, dir ? { dir } : null),
      look: (k, dx) => C().cast.look(st.cast[k], dx),
      set: (k, fields) => Object.assign(st.cast[k], fields),
      pop: (dx, dy, text, o) => C().pop(st.ax + dx, ground() + dy, text, o),
      // a hop from where the figure stands to dx (px from the start) and dy (px below the start's ground), in dur s, h px high
      hop: (k, dx, dy, dur, h) => { const e = st.cast[k]; if (!e) return; e.mv = null; const x0 = ENV().position(e, api.time).x; (st.hops || (st.hops = [])).push({ e, t0: st.t, dur: dur || 0.5, x0, f0: e.foot, x1: st.ax + dx, f1: ground() + (dy || 0), h: h != null ? h : 22 }); },
      // a walk along a path of points [dx, dy] (px from the start's feet, left to right): the feet follow the path (a gangplank
      // down to the beach), the legs walk as on flat ground; speed in tiles/s, o as walk (faceEnd); returns the seconds it takes
      path: (k, pts, speed, o) => { const e = st.cast[k]; if (!e) return 0; const abs = pts.map(([dx, dy]) => [st.ax + dx, ground() + (dy || 0)]); (st.paths || (st.paths = [])).push({ e, pts: abs }); return C().cast.walkTo(e, abs[abs.length - 1][0], { speed: speed || 1.1, ...(o || {}) }); },
    };
    return S;
  }

  // ---------- the opening (world space) ----------
  function init(L, info) {
    cl = null;
    if (info.reason === 'respawn' && op) return;       // a respawn keeps everything where it is
    op = null;
    const def = info.def || {}, st = L.story;
    if (!def.opening || info.boss || info.mode === 'boss' || !L.start || !st) return;
    const sc = scripts[typeof def.opening === 'string' ? def.opening : 'opening']; if (!sc) return;
    op = { sc, ax: (L.start.x + 0.5) * T, foot: (L.start.y + 1) * T, t: 0, on: false, pending: false, cast: {}, beats: [], end: null };
    const play = info.reason === 'load' && !sessionSeen && !seen() && !automated(V().forceOpening);
    // the scene fades in by itself (the game's round wipe would open on the wrong spot under the scene camera), and Mimo's
    // little line of a level start would talk over it
    if (play && api.G) { api.G.wipe = 99; api.G.bubbles = []; }
    sc.cast.forEach((c, i) => {
      const e = entry(c, 7000 + i, play ? null : c.end); if (!e) return;
      op.cast[c.k] = e; st.cast.push(e);
      const at = (play ? c.start : c.end), dx = at && at.dx != null ? at.dx : 0;
      place(e, op.ax + dx, op.foot + ((at && at.dy) || 0));
    });
    if (play) {
      op.pending = true;
      // the level hint of a phone pops up after the scene, not over it
      const h = typeof document !== 'undefined' && document.getElementById('hint');
      if (h) { op.hint = h.innerHTML; h.innerHTML = ''; }
    }
  }
  function restoreHint() { const h = op && op.hint != null && typeof document !== 'undefined' && document.getElementById('hint'); if (h) { h.innerHTML = op.hint; op.hint = null; } }
  function settle(c, e) { const { dx, dy, ...fields } = c.end || {}; Object.assign(e, fields); e.over = null; e.lookDx = null; e.packBurst = 0; place(e, op.ax + (dx || 0), op.foot + (dy || 0)); if (e.pack != null || e.scarf) e.extra = V().extraFor(e); }
  function finish() {
    op.on = false; restoreHint();
    for (const c of op.sc.cast) if (op.cast[c.k]) settle(c, op.cast[c.k]);
    api.cine.camera(null); api.cine.end(); markSeen(); sessionSeen = true; V().ropeSag = 0; V().plankK = null;
    if (api.p) api.p.facing = 1;
  }
  function camAt(s) {
    const sc = op.sc, v = api.view, e = op.end;
    const keys = [...sc.camera.map(([t, dx, dy, z]) => ({ t, cx: op.ax + dx, cy: op.foot + dy, z })), { t: sc.pan[1], cx: e.x + v.w / 2, cy: e.y + v.h / 2, z: 1 }];
    let i = 0; while (i < keys.length - 1 && s >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)], k = b === a ? 0 : ease(seg(s, a.t, b.t)), z = lerp(a.z, b.z, k);
    return { x: lerp(a.cx, b.cx, k) - v.w / (2 * z), y: lerp(a.cy, b.cy, k) - v.h / (2 * z), z };
  }
  function updateOpening(dt) {
    if (!op) return;
    if (op.pending && api.state === 'play' && api.cine.begin()) {
      op.pending = false; op.on = true; op.t = 0; op.end = { x: api.cam.x, y: api.cam.y }; op.S = helpers(op, () => op.foot);
      op.beats = op.sc.beats(op.S).sort((a, b) => a[0] - b[0]);
      if (api.p) api.p.facing = op.sc.face || -1;
    }
    if (!op.on) return;
    op.t += dt;
    for (const h of op.hops || []) {
      const k = Math.min(1, (op.t - h.t0) / h.dur); if (k < 0 || h.done) continue;
      const x = lerp(h.x0, h.x1, k), f = lerp(h.f0, h.f1, k) - Math.sin(k * Math.PI) * h.h;
      h.e.x = h.e.x0 = h.e.bx = x; h.e.foot = f; h.e.anchor.x = x; if (k >= 1) { h.done = true; h.e.foot = h.f1; }
    }
    for (const q of op.paths || []) {
      if (q.done) continue;
      const x = ENV().position(q.e, api.time).x, P = q.pts;
      let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
      const a = P[i], b = P[i + 1] || a, k = b[0] === a[0] ? 1 : Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0])));
      q.e.foot = lerp(a[1], b[1], k); if (x >= P[P.length - 1][0]) { q.done = true; q.e.foot = P[P.length - 1][1]; }
    }
    if (op.sc.step) op.sc.step(op.S, dt);
    while (op.beats.length && op.t >= op.beats[0][0]) op.beats.shift()[1]();
    const cam = camAt(op.t); api.cine.camera(cam.x, cam.y, cam.z);
    if ((api.cine.skipRequested() && op.t > 0.25) || op.t > op.sc.length) finish();
  }

  // ---------- the closing (screen space) ----------
  function start(name, B) {
    const sc = scripts[name || 'closing'];
    if (!sc || cl || automated(V().forceClosing) || !KIT() || !KIT().ready()) return false;
    cl = { sc, B, t: 0, ax: 0, cast: {}, beats: null, done: false, ground: sc.ground, says: [] };
    sc.cast.forEach((c, i) => { const e = entry(c, 8000 + i); if (!e) return; e.op = true; cl.cast[c.k] = e; place(e, c.x, sc.ground); e.lookDx = 0; });
    cl.S = helpers(cl, () => sc.ground, true);
    api.boss.scene(B, sc.length);
    return true;
  }
  const finished = () => !!(cl && cl.done);
  function updateClosing(dt) {
    if (!cl || cl.done) return;
    const B = api.G.boss;
    if (!B || B !== cl.B || !B.cine) { cl.done = true; return; }   // the scene ended, or was skipped
    if (!cl.beats) cl.beats = cl.sc.beats(cl.S).sort((a, b) => a[0] - b[0]);
    cl.t += dt;
    if (cl.sc.step) cl.sc.step(cl.S, dt);
    while (cl.beats.length && cl.t >= cl.beats[0][0]) cl.beats.shift()[1]();
  }

  // a speech bubble in screen units (view px) for the speaker's head at (hx, hy): above the head, pushed inside the safe part of
  // the screen (notch, rounded corners, the letterbox bars, MimoVolcano.safeRect), long lines wrap; the tail always points to the head
  const SAY = { FS: 16, PADX: 11, PADY: 7, R: 12, GAP: 14, MAXW: 330 };
  function wrap(ctx, text, maxW) {
    const lines = []; let cur = '';
    for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  }
  function speech(ctx, text, hx, hy, a) {
    const r = V().safeRect ? V().safeRect(api, true) : { x0: 8, y0: 8, x1: api.view.w - 8, y1: api.view.h - 8 };
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.font = '800 ' + SAY.FS + 'px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = wrap(ctx, text, Math.min(SAY.MAXW, (r.x1 - r.x0) * 0.5)), lh = SAY.FS * 1.2;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + SAY.PADX * 2, h = lines.length * lh + SAY.PADY * 2;
    const x = Math.max(r.x0, Math.min(r.x1 - w, hx - w / 2)), y = Math.max(r.y0, Math.min(r.y1 - h, hy - SAY.GAP - h));
    const below = y + h > hy - 4, ty = below ? y : y + h, tx = Math.max(x + SAY.R + 6, Math.min(x + w - SAY.R - 6, hx));
    const box = { x, y, w, h }; if (window.__mimoSays) window.__mimoSays.push({ text, ...box, hx, hy });
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'rgba(58,46,72,0.55)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, SAY.R); else ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    // the tail: from the edge that faces the head to just short of the head
    const px = hx, py = below ? Math.min(hy, y) : Math.max(ty + 6, hy - 4), d = below ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(tx - 7, ty - d); ctx.lineTo(px, py); ctx.lineTo(tx + 7, ty - d); ctx.fill(); ctx.stroke();
    ctx.fillRect(tx - 7.5, below ? ty + 0.2 : ty - 2.6, 15, 2.4);
    ctx.fillStyle = '#3A3850'; lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + SAY.PADY + lh * (i + 0.5) + 0.5));
    ctx.restore();
  }
  function stepCast(cast, dt) {
    for (const e of Object.values(cast)) {
      const pos = ENV().position(e, api.time); e.pos = pos; e.cx = pos.x; e.anchor.x = pos.x; e.anchor.y = pos.foot - e.top - 2;
      if (e.tl && e.tl.length) while (e.tl.length && api.time >= e.tl[0].at) e.tl.shift().fn();
      if (e.who === 'dog' && C().dogUpdate) C().dogUpdate(e, dt, pos);
      else if (KIT().FAMILY.includes(e.who)) KIT().stepEntry(e, dt, pos, CD().poseFor(e, false), true);
    }
  }
  function camAtClosing(s) {
    const K = cl.sc.camera; let i = 0; while (i < K.length - 1 && s >= K[i + 1][0]) i++;
    const a = K[i], b = K[Math.min(K.length - 1, i + 1)], k = b === a ? 0 : ease(seg(s, a[0], b[0])), z = lerp(a[2], b[2], k), v = api.view;
    return { x: lerp(a[1], b[1], k) - v.w / (2 * z), y: cl.ground - lerp(a[3], b[3], k) * v.h / z, z };
  }

  // ---------- hooks ----------
  function update(dt) { updateOpening(dt); updateClosing(dt); if (cl && !cl.done) stepCast(cl.cast, dt); }
  const FADE = 1.1;
  function draw(layer, ctx) {
    if (op && op.on && op.sc.draw && (layer === 'mid' || layer === 'front' || layer === 'back')) op.sc.draw(ctx, op.S, layer);
    // the opening fades in from the sky colour (and the screen stays covered until it begins)
    if (layer === 'over' && op && (op.pending || (op.on && op.t < FADE))) {
      const v = api.view; ctx.save(); ctx.globalAlpha = op.pending ? 1 : 1 - ease(op.t / FADE); ctx.fillStyle = api.P.skyTop; ctx.fillRect(0, 0, v.w, v.h); ctx.restore();
    }
    if (layer !== 'over' || !cl || cl.done || !cl.B.cine) return;
    const cam = camAtClosing(cl.t), v = api.view;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.w, v.h); ctx.clip(); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    cl.sc.draw(ctx, cl.S, cam, (list) => { for (const e of list) if (e && e.pos) { if (e.who === 'dog') C().dogDraw(ctx, e, e.pos, 'ground'); else CD().drawFigure(ctx, e, e.pos); } });
    ctx.restore();
    // the lines: in screen units, always whole inside the safe part of the screen, a tail to the speaker's head
    for (const q of cl.says) { const k = cl.t - q.t0; if (k >= 0 && k <= q.dur && q.e.pos) speech(ctx, q.text, (q.e.pos.x - cam.x) * cam.z, (q.e.pos.foot - q.e.top + 4 - cam.y) * cam.z, Math.min(1, k / 0.15, (q.dur - k) / 0.25)); }
    const f = Math.max(1 - cl.t / 0.6, (cl.t - (cl.sc.length - 0.6)) / 0.6);
    if (f > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, f); ctx.fillStyle = api.dark ? '#26233A' : '#FFFFFF'; ctx.fillRect(0, 0, v.w, v.h); ctx.restore(); }
  }

  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.scenes = { add: (name, sc) => { scripts[name] = sc; }, start, finished, scripts, get closing() { return !!(cl && !cl.done); } };
  window.MimoVolcano.openingReset = () => { sessionSeen = false; try { localStorage.removeItem(KEY); } catch (_) { /* nothing to reset */ } };
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, init, update, draw });
})();
