// World 4: the hand-over of the found item at the door. Mimo carries the find on his head; the owner waits at a spot
// beside the door (coast-story.js puts it there) and waves him over when he comes near with it. When the player walks
// Mimo up to the owner, Mimo lifts the item proudly over his head (a little stretch, a sparkle), the owner takes it, and
// a short gag of that person plays (coast-handover-gags.js), told through the story director, one beat after the other.
// After it an offended octopus eye peeks out behind the platform and sinks back ("Pff."). The game never stops and never
// steers: whoever walks straight into the door passes the owner (the hand-over then only plays its first beat before
// the card), and whoever jumps past hands it over as he goes through the door (a short version, no gag).
//   Without the find the owner looks around and sighs. A find handed over in an earlier run (storage "mimo.coast.handed")
// makes a short friendly version: the owner holds the item and waves, no lines.
// Pure decoration: positions and timings are functions of api.time and Mimo's place, nothing touches the physics.
//   find fields: gag (coast-handover-gags.js; default by person), peek: false | 'text' (the eye; default 'Pff.'),
//   after: [{ by, text }] lines after the gag; ownerSide: 1 (the owner stands right of the door, Mimo comes from the right)
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, KEY = 'mimo.coast.handed';
  const C = () => window.MimoCoast, D = () => C().sdraw, DIR = () => C().director, ENV = () => C().storyEnv;
  const ACTS = () => C().acts || {}, KIT = () => C().castKit, CD = () => C().castDraw, G = () => C().handoverGags || {};
  const HOPE_R = 6, MISS_R = 8;                 // tiles: the owner hopes (Mimo near with the find) or searches (without)
  const REACH_X = 1.8, REACH_UP = 2.4, REACH_DOWN = 0.6;   // tiles: Mimo is close enough to hand it over
  const LIFT = 0.6, LIFT_RUN = 0.3, PASS = 0.45;   // s: Mimo lifts the item over his head (shorter on the run), then it goes over
  const CARRY_S = 0.74, LIFT_S = 1.25;          // scale of the item on Mimo's head and lifted up (big enough to read on a phone)
  const WIN_KEEP = 1.3, WIN_CAP = 3.2;          // s: the card waits for the item to change hands, never longer than this
  const EYE_GAP = 3.4, EYE_RISE = 0.5, EYE_STAY = 2.4;
  const FAMILY = ['striped', 'sidepart', 'redbeard', 'reporter', 'filmer', 'kid', 'professor'];
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- which hand-overs were seen (every access guarded) ----------
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; } }
  let session = new Set();
  function save(i) { session = new Set([...session, i]); try { localStorage.setItem(KEY, JSON.stringify({ ...load(), [i]: 1 })); } catch (_) { /* no storage: this session remembers it */ } }
  const wasHanded = (i) => !!load()[i] || session.has(i);

  // ---------- small helpers ----------
  const mimo = () => { const p = api.p; return p ? { x: p.x + p.w / 2, foot: p.y + p.h, top: p.y + p.h * (1 - (p.sy || 1)) } : null; };
  const since = (f, k) => (f.fx[k] == null ? -1 : api.time - f.fx[k]);
  const person = (o) => FAMILY.includes(o.who);
  const near = (o, m, r, up) => Math.abs(m.x - o.cx) < r * T && Math.abs(m.foot - o.foot) < (up || 4) * T;
  const reached = (o, m) => Math.abs(m.x - o.cx) < REACH_X * T && m.foot > o.foot - REACH_UP * T && m.foot < o.foot + REACH_DOWN * T;
  const over = (o, pose, dir) => { o.over = pose ? { pose, opts: dir ? { dir } : null } : null; };
  // the hand that hangs lower (the other one may wave or hold a prop), relative to the feet
  function lowHand(o) { const l = C().cast.hand(o, 'l'), r = C().cast.hand(o, 'r'); return l[1] > r[1] ? l : r; }
  // where the item sits when its owner holds it: in a hand, between both hands (a hug), in the mouth, on the shell
  function ownerSpot(o, how, f) {
    const pos = o.pos || { x: o.x0, foot: o.foot, face: 1, hop: 0 };
    if (o.who === 'dog') return { x: pos.x + (pos.face || 1) * 15, y: pos.foot - 17 - (pos.hop || 0) };
    if (o.who === 'crab') return { x: pos.x, y: pos.foot - 28 - (pos.hop || 0) };
    if (o.who === 'keeper') return { x: pos.x + (pos.face || 1) * 14, y: pos.foot - 40 };
    if (how === 'hug') { const l = C().cast.hand(o, 'l'), r = C().cast.hand(o, 'r'); return { x: pos.x + (l[0] + r[0]) / 2, y: pos.foot + (l[1] + r[1]) / 2 + 2 }; }
    const h = how === 'hand' ? C().cast.hand(o, f && f.dirM > 0 ? 'r' : 'l') : lowHand(o);
    return { x: pos.x + h[0], y: pos.foot + h[1] - 4 };
  }
  function chain(f, o, steps) {
    for (const s of steps) {
      if (!s) continue;
      const opt = { prio: 'door', front: true, wait: s.wait || 4, lead: s.lead, before: s.before, secs: s.secs, done: s.done };
      if (s.beat) { DIR().beat({ prio: 'door', front: true, wait: s.wait || 4, hold: s.beat, start: s.before, done: s.done }); continue; }
      const who = s.by === 'player' ? 'player' : !s.by || s.by === 'owner' ? o : s.by === 'owner2' ? f.owners[1] : s.by === 'eye' ? f.eye : C().scene.find(s.by);
      if (who && s.text) DIR().say(who, s.text, opt);
    }
  }

  // ---------- the owners: where they stand, what they do ----------
  function stepOwners(f, dt) {
    const env = ENV(), g = gagOf(f);
    for (const o of f.owners) {
      o.evT += dt; if (o.ownT != null) o.ownT += dt;
      const BX = o.baseAct && (o.mood === 'idle' || o.mood === 'search') ? ACTS()[o.baseAct] : null;
      if (!BX && o.act !== 'owner' && o.pos && o.wasMoving) o.x0 = o.pos.x;   // leaves a walking act where it stands
      o.act = BX ? o.baseAct : 'owner';
      const pos = env.position(o, api.time); pos.hop = 0; pos.face = o.face;
      if (BX && BX.pos) { Object.assign(pos, BX.pos(o, api.time, env)); o.wasMoving = true; } else o.wasMoving = false;
      if (o.who === 'dog') dogPos(f, o, pos);
      if (o.who === 'crab') pos.hop = crabHop(o);
      if (g.pos && o.mood === 'happy') g.pos(f, o, pos, api);
      o.pos = pos; o.cx = pos.x; o.anchor.x = pos.x; o.anchor.y = pos.foot - o.top - 2 - (pos.hop || 0);
      if (person(o)) KIT().stepEntry(o, dt, pos, CD().poseFor(o, false), env.onScreen(pos.x, pos.foot, 160));
      else if (o.who === 'dog' && C().dogUpdate) C().dogUpdate(o, dt, pos);
    }
  }
  function dogPos(f, o, pos) {
    const m = mimo(); if (m && o.mood !== 'idle') pos.face = m.x >= pos.x ? 1 : -1;
    const k = o.ownT == null ? -1 : o.ownT;
    if (o.mood === 'hope') pos.hop = Math.abs(Math.sin(api.time * 6)) * 4;
    if ((o.mood === 'happy' || o.mood === 'replay') && k >= 0 && k < 1.2) pos.hop = Math.abs(Math.sin(k * 8)) * 7;
    if (o.mood === 'search') pos.face = Math.sin(api.time * 2.2) > 0 ? 1 : -1;
  }
  const crabHop = (o) => { const fast = o.mood === 'hope' || (o.mood === 'happy' && o.ownT < 1.4), cyc = fast ? 0.5 : 3.3, tt = (api.time + o.phase * 2) % cyc; return tt < 0.36 ? Math.sin((tt / 0.36) * Math.PI) * (fast ? 7 : 5) : 0; };

  // the person's gag: find.gag, else by who it is (coast-handover-gags.js)
  const BY_WHO = { kid: 'kick', reporter: 'shades', redbeard: 'flipflop', striped: 'ring', professor: 'grade', sidepart: 'scarf', dog: 'lick', filmer: 'film', keeper: 'light', crab: 'taxi' };
  const gagOf = (f) => G()[f.gag || BY_WHO[f.owners[0] && f.owners[0].who]] || {};

  // ---------- moods ----------
  function hope(f) {
    for (const o of f.owners) {
      o.mood = 'hope';
      if (person(o)) over(o, o.baseAct === 'hop1' ? 'hop' : 'wave');
      if (o === f.owners[0]) api.floater(o.cx, o.foot - o.top - 10, '!', '#E26A7E');
    }
  }
  function search(f) {
    const o = f.owners[0];
    for (const q of f.owners) { q.mood = 'search'; q.ownT = 0; }
    const sigh = () => { if (o.pos && ENV().onScreen(o.pos.x, o.pos.foot, 0)) api.floater(o.pos.x + 8, o.foot - o.top - 6, 'Hach.', '#8E8CA3'); };
    if (f.missing) DIR().say(o, f.missing, { prio: 'door', done: sigh }); else sigh();
  }
  function greetReplay(f) {
    for (const o of f.owners) {
      o.mood = 'replay'; o.ownT = 0;
      if (person(o)) { over(o, 'wave'); C().scene.later(o, 2.4, () => over(o, null)); }
      if (o.who === 'keeper') { o.waving = true; C().scene.later(o, 2.4, () => { o.waving = false; }); }
    }
  }

  // ---------- the hand-over itself ----------
  function start(f, quick) {
    const m = mimo(), o = f.owners[0];
    f.ho = { t0: api.time, quick, lift: quick ? 0 : api.p && Math.abs(api.p.vx) > 120 ? LIFT_RUN : LIFT, from: m ? { x: m.x, y: m.top - 10 } : { x: o.cx, y: o.foot - 40 } };
    f.dirM = m && Math.abs(m.x - o.cx) > 2 ? Math.sign(m.x - o.cx) : f.side;
    if (!quick && api.p) { api.p.sx = 0.86; api.p.sy = 1.2; api.setMood('happy', 1.4); api.sfx.hup && api.sfx.hup(); }
    for (const q of f.owners) if (person(q) && q === o) over(q, 'take', f.dirM);
  }
  function take(f) {
    const o = f.owners[0], g = gagOf(f), quick = f.ho.quick;
    f.handed = true; f.carry = false; f.takeAt = api.time; save(f.index);
    for (const q of f.owners) { q.mood = 'happy'; q.ownT = 0; if (person(q)) { over(q, 'hooray'); C().scene.later(q, 1.8, () => { if (q.over && q.over.pose === 'hooray') over(q, null); }); } }
    const at = ownerSpot(o, g.hold, f);
    api.sfx.key(); api.burst(at.x, at.y, 10, ['#FFF2B0', '#F6A9BF', '#FFFFFF'], 90, { grav: 120, life: 0.45, r: 1.8 });
    if (quick) { chain(f, o, [f.thanks ? { text: f.thanks } : null]); return; }
    if (g.take) g.take(f, o, api);
    const steps = g.steps ? g.steps(f, o, api) : [f.thanks ? { text: f.thanks } : null];
    const after = (f.after || []).map((l) => ({ by: l.by, text: l.text, secs: l.secs, before: g.afterPose ? () => g.afterPose(f, o) : null }));
    chain(f, o, [...steps, ...after, peekStep(f)]);
  }

  // ---------- the octopus has seen it: one offended eye behind the platform ----------
  function peekStep(f) {
    if (f.peek === false || !f.owners.length) return null;
    const o = f.owners[0], m = mimo(), c = api.cam, v = api.view, Lw = api.L.w * T, surf = C().surface();
    const fits = (x) => x > Math.max(c.x, 0) + 40 && x < Math.min(c.x + v.w, Lw) - 40;
    const away = m ? -Math.sign(m.x - o.cx) || -f.side : -f.side;
    // out of the sea in the background when the water is in view and open there, else from behind the platform
    const open = (x, y) => !api.isSolid(Math.floor(x / T), Math.floor((y + 4) / T)) && !api.isSolid(Math.floor(x / T), Math.floor((y - 20) / T));
    const sea = surf != null && surf > c.y + 70 && surf < c.y + v.h - 8;
    const tries = sea ? [[away, 4.5, surf], [-away, 5, surf], [away, 7, surf], [-away, 7.5, surf], [away, EYE_GAP, o.foot]] : [[away, EYE_GAP, o.foot], [-away, EYE_GAP + 1.2, o.foot]];
    const hit = tries.map(([d, gap, y]) => ({ x: o.cx + d * gap * T, y })).find((q) => fits(q.x) && (q.y === surf && sea ? open(q.x, q.y) : api.isSolid(Math.floor(q.x / T), Math.floor((q.y + 4) / T)) && open(q.x, q.y - 8)));
    if (!hit) return null;
    f.eye = { x: hit.x, y: hit.y - 46, w: 0 }; f.eyeFoot = hit.y;
    return { by: 'eye', text: typeof f.peek === 'string' ? f.peek : 'Pff.', lead: EYE_RISE + 0.5, secs: 1.6, wait: 3, before: () => { f.fx.eye = api.time; } };
  }
  function drawEye(ctx, f) {
    const k = since(f, 'eye'); if (k < 0 || !f.eye || k > EYE_RISE * 2 + EYE_STAY) return;
    const up = ease(k / EYE_RISE) * (1 - ease((k - EYE_RISE - EYE_STAY) / EYE_RISE)), x = f.eye.x, y = f.eyeFoot;
    const dark = api.dark, body = dark ? '#D98399' : '#F08FA4', lite = dark ? '#EDB4C2' : '#F9BFCB', ink = dark ? '#1D1B2E' : '#3A3850';
    const o = f.owners[0], look = o && o.pos ? Math.max(-3, Math.min(3, (o.pos.x - x) / 30)) : 0, blink = k > EYE_RISE + 1.1 && k < EYE_RISE + 1.24 ? 0.15 : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 80, 80, 80); ctx.clip(); ctx.translate(x, y + 30 - 34 * up);
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 21, 26, 0, Math.PI, TAU); ctx.lineTo(21, 30); ctx.lineTo(-21, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lite; for (const [sx, sy, r] of [[-11, -15, 3], [9, -19, 2.2], [13, -8, 1.6]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); }
    // one eye, the lid half down (offended), the pupil on the owner who got the thing back
    ctx.save(); ctx.translate(-1, -6); ctx.scale(1, blink);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 9.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(look, 2, 4, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(look + 1.4, 0.4, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 10, 10.5, 0, Math.PI, TAU); ctx.lineTo(10, -1); ctx.quadraticCurveTo(0, 2.6, -10, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-11, -16); ctx.lineTo(8, -12); ctx.stroke();
    ctx.restore();
    // the water it comes out of: a ripple and a few drops as it rises
    ctx.save(); ctx.strokeStyle = (api.W && api.W.foam) || '#FFFFFF'; ctx.globalAlpha = 0.7 * up; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y - 1, 24 + 4 * Math.sin(k * 5), 3, 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
  }

  // ---------- each step ----------
  function update(st, dt) {
    const f = st.find; if (!f || !f.owners.length) return;
    f.fx = f.fx || {};
    stepOwners(f, dt);
    const o = f.owners[0], m = mimo(), play = api.state === 'play';
    if (m && play && !f.ho) {
      if (f.seen) { if (!f.greeted && near(o, m, HOPE_R)) { f.greeted = true; greetReplay(f); } }
      else if (f.carry) { if (o.mood !== 'hope' && near(o, m, HOPE_R)) hope(f); if (reached(o, m)) start(f, false); }
      else if (!f.got && o.mood === 'idle' && near(o, m, MISS_R, 7)) search(f);   // also when Mimo comes down from above
    }
    if (api.state === 'win' && f.carry && !f.ho) start(f, true);   // jumped past: the owner catches it as Mimo goes through the door
    if (f.ho && !f.handed && api.time - f.ho.t0 >= f.ho.lift + PASS) take(f);
    const g = gagOf(f); if (g.update && f.handed && !f.ho.quick) g.update(f, o, dt, api);
    // the card waits until the item has changed hands and the thanks begins, never long (coast-director.js reads nothing)
    if (api.state === 'win' && f.ho && (!f.handed || api.time - f.takeAt < WIN_KEEP)) api.L.winAfter = Math.min(WIN_CAP, Math.max(api.L.winAfter || 1.1, (api.G.stateT || 0) + 0.25));
  }

  // ---------- drawing ----------
  // the item over Mimo's head: carried, lifted, then on its way to the owner
  function itemNow(f) {
    const m = mimo(), w = Math.sin(api.time * 3.1) * 1.4;
    const carry = m ? { x: m.x + w, y: m.top - 12, s: CARRY_S, rot: w * 0.05 } : null;
    if (f.carry && !f.ho) {
      if (!carry || api.state === 'dead') return null;
      if (f.hold && f.hold.t < 1.3) { const k = Math.min(1, f.hold.t / 0.18), z = ease((f.hold.t - 1.0) / 0.3); return { x: carry.x, y: lerp(m.top - 14 - 8 * k, carry.y, z), s: lerp(0.6 + 0.6 * k, CARRY_S, z), rot: 0 }; }
      if (api.state === 'win') { const k = Math.min(1, (api.G.stateT || 0) / 0.55); return { ...carry, s: CARRY_S * (1 - k * 0.9), a: 1 - k }; }
      return carry;
    }
    if (!f.ho || f.handed) return null;
    const t = api.time - f.ho.t0, lift = f.ho.lift;
    const top = carry && !f.ho.quick ? { x: carry.x, y: m.top - 28, s: LIFT_S } : { x: f.ho.from.x, y: f.ho.from.y, s: CARRY_S };
    if (t < lift) { const k = t / lift, pk = k < 0.6 ? ease(k / 0.6) * 1.15 : 1.15 - 0.15 * ease((k - 0.6) / 0.4); return { x: top.x, y: lerp(carry.y, top.y, ease(k / 0.5)), s: lerp(CARRY_S, LIFT_S, pk), rot: Math.sin(k * 9) * 0.08 }; }
    const k = Math.min(1, (t - lift) / PASS), e = ease(k), at = ownerSpot(f.owners[0], gagOf(f).hold, f);
    return { x: lerp(top.x, at.x, e), y: lerp(top.y, at.y, e) - Math.sin(k * Math.PI) * 16, s: lerp(top.s, 0.72, e), rot: k * 0.6 * (f.dirM || 1) };
  }
  function icon(ctx, item, q) {
    if (!q) return;
    ctx.save(); if (q.a != null) ctx.globalAlpha = Math.max(0, q.a); ctx.translate(q.x, q.y); if (q.rot) ctx.rotate(q.rot); ctx.scale(q.s, q.s);
    D().findIcon(ctx, item, api.time, 1); ctx.restore();
  }
  // what the owner holds after the hand-over (or, in a replay, all along)
  function drawHeld(ctx, f) {
    const o = f.owners[0], g = gagOf(f); if (!o || !o.pos) return;
    if (o.mood === 'replay') { const r = g.replay ? g.replay(f, o, api) : undefined; if (r !== null) icon(ctx, f.item, r || { ...ownerSpot(o, 'low', f), s: 0.62 }); return; }
    if (o.mood !== 'happy' || !f.handed) return;
    const q = g.held ? g.held(f, o, api) : undefined;
    if (q === null) return;
    icon(ctx, f.item, q || { ...ownerSpot(o, f.ho && f.ho.quick ? 'low' : g.hold, f), s: 0.72 });
  }
  function draw(layer, ctx) {
    const st = api.L && api.L.story, f = st && st.find; if (!f || !f.owners.length || !f.fx) return;
    const g = gagOf(f);
    if (layer === 'back') drawEye(ctx, f);
    else if (layer === 'mid') { if (g.drawMid && f.handed) g.drawMid(ctx, f, f.owners[0], api); }
    else if (layer === 'front') {
      drawHeld(ctx, f);
      if (g.drawFront && (f.handed || f.seen)) g.drawFront(ctx, f, f.owners[0], api);
      icon(ctx, f.item, itemNow(f));
    }
  }

  window.MimoCoast = window.MimoCoast || {};
  window.MimoCoast.handover = { update, draw, wasHanded, since, ownerSpot, over, chain, mimo };
  window.MimoCoast.handoverHooks = { draw };   // another world draws the hand-over the same way (volcano-story.js)
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; }, draw });
})();
