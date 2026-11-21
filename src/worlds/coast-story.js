// World 4 story engine: the cast (family figures, props, gull, keeper, crab), the found item of each level with its
// owner at the door, and Mimo's small reactions (salty water, shaking off, waving back). Pure decoration: nothing
// here touches the physics, every motion is a function of api.time, so the level bots replay exactly.
//
// Level fields (coordinates are tile cells like `says`, y is the row the figure stands IN, feet at (y + 1) * 32):
//   cast: [{ who, x, y, act, ... }]
//     who  family id: striped sidepart redbeard reporter filmer kid professor | 'gull' | 'keeper' | 'crab' | 'prop'
//     act  stand (default) | wave | pose (pose: 'mic' 'cam' 'pen' 'fan' 'wave' 'stand') | buried (depth 1..3)
//          | snorkel (thumb: true; follows the water line, y ignored) | float (air mattress on the water, red 0..3,
//          drift tiles/s, range tiles, color 0..2) | run (x2: second x, speed tiles/s)
//     face -1 flips the figure; scale; front: true draws over Mimo; line + r (tiles, default 3.5) = speech bubble
//     tag (found by scenes), holds: { mic: 'banana' } (hand prop swapped), copy / films / five (reactions, coast-cast.js)
//     once per level start when Mimo comes close; gull: act 'sit' (default); prop: kind mattress grill table umbrella
//     bucket net board radio cooler
//   find: { x, y, item, owner, ownerAt?: {x, y}, thanks?, missing? }  one optional item per level (cell like cast)
//     item: ball sunglasses flipflop watch pen scarf dogball camera umbrella mic bulb taxisign cakebox
//     owner: a cast id, a list of ids, or 'family'; waits 2.4 tiles before the door (left, or right with ownerSide: 1)
//     unless ownerAt is given; the hand-over and each person's gag are coast-handover.js and coast-handover-gags.js.
//   saltLine: true  Mimo says "Stimmt. Salzig." the first time he swims in this level.
// Found items are stored in localStorage "mimo.coast.finds" ({ levelIndex: 1 }), never in the core save.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2, FIND_KEY = 'mimo.coast.finds', FIND_TOTAL = 13;
  const C = () => window.MimoCoast, D = () => window.MimoCoast.sdraw, DIR = () => window.MimoCoast.director;
  const FAMILY = ['striped', 'sidepart', 'redbeard', 'reporter', 'filmer', 'kid', 'professor'];
  const NAMES = { ball: 'mein Ball', sunglasses: 'meine Sonnenbrille', flipflop: 'meine Latsche', watch: 'meine Uhr', pen: 'mein Füller', scarf: 'mein Schal', dogball: 'der Ball', camera: 'meine Kamera', umbrella: 'mein Schirm', mic: 'mein Mikro', bulb: 'die Glühbirne', taxisign: 'mein Taxischild', cakebox: 'der Kuchen' };
  const BURIED_SHOW = [1, 0.78, 0.6, 0.48];   // visible share of the drawn figure (without the empty margin) per depth (index = depth)
  const MARGIN = 8, SNORKEL_SHOW = 0.42;      // the figures have 8 px of empty space above the head
  const HEIGHT = { gull: 26, keeper: 58, crab: 30, prop: 44, dog: 26 };
  const NAMED = ['gull', 'keeper', 'crab', 'prop', 'dog'];
  const ACTS = () => C().acts || {};
  const NEAR_WAVE = 6, OWNER_GAP = 2.4, OWNER_STEP = 1.2;   // tiles: the owner before the door, several owners apart

  // ---------- found items in the browser's storage (every access guarded) ----------
  function loadFinds() { try { const o = JSON.parse(localStorage.getItem(FIND_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; } }
  function saveFind(i) { try { const o = loadFinds(); o[i] = 1; localStorage.setItem(FIND_KEY, JSON.stringify(o)); } catch (_) { /* no storage: the find still counts for this session */ } }
  let sessionFinds = new Set(); // finds of this session, for when storage is unavailable
  const findCount = () => Math.min(FIND_TOTAL, new Set([...Object.keys(loadFinds()), ...[...sessionFinds].map(String)]).size);
  const hasFind = (i) => !!loadFinds()[i] || sessionFinds.has(i);

  // ---------- helpers ----------
  const pingpong = (d, range) => { const m = ((d % (2 * range)) + 2 * range) % (2 * range); return m < range ? m : 2 * range - m; };
  const phaseOf = (x, y) => ((x * 7.13 + y * 3.71) % TAU + TAU) % TAU;
  const rigH = (who) => (C().FAMILY_RIGS[who] || { size: [48, 60] }).size[1];
  const onScreen = (x, y, m) => { const c = api.cam, v = api.view; return x > c.x - m && x < c.x + v.w + m && y > c.y - m && y < c.y + v.h + m; };
  const reaches = (e, tiles) => { const p = api.p; return !!p && Math.hypot((p.x + p.w / 2) - (e.cx == null ? e.x : e.cx), (p.y + p.h / 2) - (e.foot - 30)) < tiles * T && Math.abs(p.y + p.h - e.foot) < 4 * T; };

  // night and the dark scheme: the figures get a dusk wash in steps (coast-rig-draw.js), the drawn things mix their colours (sdraw.setNight)
  const NIGHT_STEPS = 5;
  let nightNow = 0;
  const nightStep = () => Math.round(Math.min(1, ((api.W && api.W.night) || 0) * 0.7 + (api.dark ? 0.55 : 0)) * NIGHT_STEPS);
  const CD = () => C().castDraw, KIT = () => C().castKit;

  // ---------- building the cast of a level ----------
  function makeEntry(d, i) {
    if (!d || typeof d.who !== 'string') return null;
    const who = d.who, act = d.act || (who === 'gull' ? 'sit' : 'stand');
    const x = (d.x + 0.5) * T, foot = (d.y + 1) * T;
    const e = { ...d, who, act, x, x0: x, foot, tag: d.tag || null, bx: x, scale: d.scale || 1, face: d.face || 1, phase: phaseOf(d.x, d.y), said: false, greeted: false, evT: 0, near: false, anchor: { x, y: foot, w: 0 }, id: i, mood: 'idle' };
    if (!NAMED.includes(who) && !FAMILY.includes(who)) return null;
    if (d.holds) e.propSwap = { ...d.holds };   // what a hand holds instead (the reporter's banana, later a shell)
    e.top = who === 'prop' || HEIGHT[who] ? HEIGHT[who] : rigH(who) * e.scale;
    if (act === 'buried') e.top = (e.top - MARGIN * e.scale) * BURIED_SHOW[Math.max(1, Math.min(3, d.depth | 0 || 1))];
    if (act === 'snorkel') e.top = (e.top - MARGIN * e.scale) * SNORKEL_SHOW;
    return e;
  }
  const ownerIds = (o) => (o === 'family' ? ['kid', 'reporter', 'professor'] : Array.isArray(o) ? o : o ? [o] : []);

  function buildFind(def, L, index) {
    const f = def.find;
    if (!f || typeof f.item !== 'string' || !D().ICONS[f.item]) return null;
    const door = L.door, ids = ownerIds(f.owner), n = ids.length;
    // the first owner (who takes the item) stands furthest from the door, where Mimo meets it first; the others towards the door
    const side = f.ownerAt ? Math.sign(f.ownerAt.x + 0.5 - (door ? door.x + 0.5 : 0)) || -1 : f.ownerSide === 1 ? 1 : -1;
    const first = f.ownerAt ? { x: f.ownerAt.x + 0.5 - (f.ownerAt.shift || 0), y: f.ownerAt.y } : door ? { x: door.x + 0.5 + side * (OWNER_GAP + (n - 1) * OWNER_STEP), y: door.y } : null;
    const owners = [], seen = !!(C().handover && C().handover.wasHanded(index));
    ids.forEach((who, k) => {
      if (!first) return;
      const e = makeEntry({ who, x: Math.floor(first.x), y: first.y, act: 'owner' }, 9000 + k);
      if (!e) return;
      e.x = e.x0 = (first.x - side * k * OWNER_STEP) * T; e.face = -side; e.baseAct = f.ownerAct || null; e.style = f.style || null;
      if (f.ownerProp) e.propSwap = { ...f.ownerProp }; e.red = f.ownerRed | 0; if (f.ownerScale) { e.scale = f.ownerScale; e.top *= f.ownerScale; }
      e.phase += k; e.mood = seen ? 'replay' : 'idle'; e.cx = e.x0; owners.push(e);
    });
    const already = hasFind(index);
    return { ...f, index, cx: (f.x + 0.5) * T, cy: (f.y + 0.5) * T, got: false, already, seen, side, owners, fx: {},
      thanks: f.thanks == null ? 'Danke!' : f.thanks, missing: f.missing || 'Wo ist nur ' + (NAMES[f.item] || 'mein Ding') + '?', hold: null };
  }

  function init(L, info) {
    if (info.reason === 'respawn' && L.story) return;
    const def = info.def || {};
    const st = { def, cast: [], pops: [], find: null, t: 0, swimT: 0, wasSwim: false, saltAt: null, saltDone: !def.saltLine, shake: 0, zT: -1 };
    if (info.boss || info.mode === 'boss' || !Array.isArray(def.cast) && !def.find && !def.saltLine) { L.story = st; return; }
    (Array.isArray(def.cast) ? def.cast : []).forEach((d, i) => { const e = makeEntry(d, i); if (e) st.cast.push(e); });
    st.find = buildFind(def, L, api.levelIndex);
    if (st.find && def.lantern) st.find.lantern = { x: (def.lantern.x + 0.5) * T, y: (def.lantern.y + 0.5) * T };
    L.story = st;
  }

  // ---------- update ----------
  function position(e, time) {
    const out = { x: e.x0, foot: e.foot, face: e.face, hop: 0 };
    if (e.mv) { // sent somewhere by a call ('Essen ist fertig!'): runs there, then stays, facing the table
      const m = e.mv, d = m.tx - m.fx, dur = Math.max(0.01, Math.abs(d) / (m.speed * T)), k = Math.min(1, Math.max(0, (time - m.t0) / dur));
      out.x = m.fx + d * k; out.face = k < 1 ? (d >= 0 ? 1 : -1) : m.faceEnd; out.running = k > 0 && k < 1;
      return out;
    }
    if ((e.act === 'run' || e.act === 'fetch') && e.x2 != null) {
      const dx = (e.x2 + 0.5) * T - e.x0, range = Math.abs(dx) / T, sp = e.speed || 4, d = time * sp + e.phase, dirx = Math.sign(dx) || 1;
      if (range > 0) { out.x = e.x0 + dirx * pingpong(d, range) * T; out.face = (d % (2 * range) < range ? 1 : -1) * dirx; if (e.who === 'dog') out.hop = Math.abs(Math.sin(time * sp * 2.4)) * 4; out.running = true; }
    } else if (e.act === 'float' && e.drift) {
      out.x = e.x0 + pingpong(time * e.drift, e.range || 6) * T;
    }
    const surf = C().surface();
    if ((e.act === 'snorkel' || e.act === 'float') && surf != null) out.foot = surf;
    return out;
  }

  function greet(e) {
    e.greeted = true;
    api.setMood('happy', 1.2);
    if (api.p) { api.p.sx = 0.92; api.p.sy = 1.12; }
  }
  function updateEntry(e, dt) {
    const p = api.p;
    e.evT += dt;
    const X = ACTS()[e.act], pos = X && X.pos ? X.pos(e, api.time, env) : position(e, api.time); e.pos = pos; e.cx = pos.x;
    e.anchor.x = pos.x; e.anchor.y = pos.foot - e.top - 2 + (e.act === 'snorkel' ? -14 : 0);
    if (e.who === 'gull' || e.who === 'crab' || e.who === 'keeper') {
      const dir = p ? Math.sign((p.x + p.w / 2) - pos.x) : 0; if (dir && e.who !== 'keeper' || (dir && e.act === 'wave')) pos.face = dir;
      const cyc = 3.3 + (e.phase % 1), tt = (api.time + e.phase * 2) % cyc; // a small hop every few seconds
      pos.hop = e.who === 'keeper' ? 0 : tt < 0.36 ? Math.sin((tt / 0.36) * Math.PI) * (e.who === 'gull' ? 7 : 5) : 0;
    }
    if (e.who === 'dog' && C().dogUpdate) C().dogUpdate(e, dt, pos);
    if (X && X.update) X.update(e, dt, env);
    if (FAMILY.includes(e.who)) KIT().stepEntry(e, dt, pos, CD().poseFor(e, e.near), onScreen(pos.x, pos.foot, 170));
    if (!p || api.state !== 'play') return;
    const near = reaches(e, NEAR_WAVE);
    if (e.act === 'wave' && near && !e.greeted) greet(e);
    e.near = near;
    // a line once when Mimo comes close, through the story director; a caller's line ('Essen ist fertig!') starts its scene
    if (e.line && !e.said && reaches(e, e.r || 3.5)) {
      e.said = true; const spoke = () => { e.spoke = true; };
      DIR().say(e, e.line, e.act === 'call' ? { prio: 'theft', wait: 12, start: spoke, dropped: spoke } : { prio: 'gag' });
    }
    // the sleeper snores now and then
    if (e.act === 'float') {
      const n = Math.floor((api.time + e.phase) / 2.6);
      if (n !== e.zN) { if (e.zN != null && onScreen(pos.x, pos.foot, 80)) api.floater(pos.x - 26, pos.foot - 34, n % 2 ? 'Z' : 'Zz', '#8E8CA3'); e.zN = n; }
    }
  }

  function updateFind(st, dt) {
    const f = st.find, p = api.p; if (!f || !p) return;
    if (f.hold) { f.hold.t += dt; if (f.hold.t > 1.3) f.hold = null; }
    let reach = f.reach || 24, wob = Math.sin(api.time * 2.4) * 2, live = true;
    if (f.follow) { // a crab carries it like a lance, the tip forward
      const c = api.L.coast, b = c && c.crabs.find((q) => q.tx === f.follow.x && q.ty === f.follow.y);
      if (b) { f.cx = b.x + b.w / 2 + b.dir * 24; f.cy = b.y + 2; f.dir = b.dir; reach = 34; wob = 0; } else live = false;
    }
    if (f.bubble) { // the item rides inside the bubbles of a vent: Mimo finds it by touching a bubble that carries it
      const c = api.L.coast, bs = c ? c.live.filter((b) => !b.off && b.item === f.item) : [];
      if (f.got && c) for (const b of c.live) if (b.item === f.item) b.item = null;
      let best = null, bd = 1e9;
      for (const b of bs) { const d = Math.hypot(p.x + p.w / 2 - (b.x + b.r), p.y + p.h / 2 - (b.y + b.r)); if (d < bd) { bd = d; best = b; } }
      if (best) { f.cx = best.x + best.r; f.cy = best.y + best.r; reach = best.r + 20; wob = 0; } else live = false;
    }
    if (!f.got && live && api.state === 'play' && Math.hypot(p.x + p.w / 2 - f.cx, p.y + p.h / 2 - (f.cy + wob)) < reach) {
      f.got = true; f.hold = { t: 0 }; f.carry = !f.seen; C().cast.found();
      if (!f.already) { saveFind(f.index); sessionFinds = new Set([...sessionFinds, f.index]); }
      api.sfx.key(); api.setMood('happy', 1.2);
      api.burst(f.cx, f.cy, 14, ['#FFF2B0', '#F6A9BF', '#9ED3EE', '#FFFFFF'], 120, { grav: 160, life: 0.5 });
      api.ring(f.cx, f.cy, '#FFE08F');
      if (!f.already) pop(p.x + p.w / 2, p.y - 40, 'Gefunden!', { size: 17, fill: '#FFE08F', rot: 0.05 });
      if (!f.already && findCount() >= FIND_TOTAL) DIR().say('player', 'Alle dreizehn! Die Sonnenbrille wartet im Kleiderschrank.', { prio: 'door' });
    }
    if (C().handover) C().handover.update(api.L.story, dt);   // the owner at the door, the hand-over, the gag
  }

  // Mimo's own reactions (the world 4 look at the sea): the salty line, shaking off the water
  function updateMimo(st, dt) {
    const p = api.p; if (!p || api.state !== 'play') return;
    const swim = !!p.swim;
    if (swim) st.swimT += dt;
    if (swim && !st.wasSwim && !st.saltDone && st.saltAt == null) st.saltAt = st.t + 0.4;
    if (st.saltAt != null && st.t >= st.saltAt) { st.saltAt = null; st.saltDone = true; DIR().say('player', 'Stimmt. Salzig.', { prio: 'player' }); }
    if (!swim && st.wasSwim) {
      if (st.swimT > 1) {
        st.shake = 0.55; const W = api.W;
        api.burst(p.x + p.w / 2, p.y + 4, 10, [W.foam || '#FFFFFF', W.waterTop || '#9BD8E2'], 150, { grav: 520, vy: -70, life: 0.4, r: 1.6 });
      }
      st.swimT = 0;
    }
    st.wasSwim = swim;
    if (st.shake > 0) { st.shake -= dt; const k = Math.max(0, st.shake / 0.55), w = Math.sin(st.shake * 52) * 0.13 * k; p.sx = 1 + w; p.sy = 1 - w * 0.8; }
  }

  // things a scene asked to happen later (MimoCoast.scene.later): run in time order, in game time
  function runTimeline(e) { while (e.tl.length && api.time >= e.tl[0].at) e.tl.shift().fn(); }
  function update(dt) {
    const L = api.L, st = L && L.story; if (!st) return;
    st.t += dt; KIT().frame(st, dt);
    for (const e of st.cast) { updateEntry(e, dt); if (e.tl && e.tl.length) runTimeline(e); }
    if (st.find) for (const o of st.find.owners) if (o.tl && o.tl.length) runTimeline(o);
    updateFind(st, dt); updateMimo(st, dt);
  }

  // ---------- drawing ----------
  function drawNamed(ctx, e, pos) {
    const t = api.time, sd = D();
    ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(e.scale, e.scale);
    if (e.who === 'prop') { if (!e.wet) sd.groundShadow(ctx, sd.PROPS[e.kind] ? e.kind : 'bucket'); if (pos.face < 0) ctx.scale(-1, 1); (sd.PROPS[e.kind] || sd.PROPS.bucket)(ctx, t, e); }
    else if (e.who === 'keeper') { const mv = e.lastDrawX != null && Math.abs(pos.x - e.lastDrawX) > 0.05; e.lastDrawX = pos.x; sd.keeper(ctx, t, { face: pos.face, wave: e.act === 'wave' && e.near || !!e.waving, walk: mv ? t * 8 : null, candle: e.baseAct === 'candle' && e.mood !== 'happy' && e.mood !== 'replay', lift: e.lift || 0 }); }
    else if (e.who === 'gull') sd.gull(ctx, t, { hop: pos.hop, face: pos.face, blink: ((t + e.phase) % 4) > 3.9 ? 0.1 : 1 });
    else if (e.who === 'crab') sd.crab(ctx, t, { hop: pos.hop, face: pos.face });
    ctx.restore();
  }
  function drawEntry(ctx, e) {
    const pos = e.pos, X0 = ACTS()[e.act]; if (!pos || (!(X0 && X0.always) && !onScreen(pos.x, pos.foot, 90))) return;
    if (e.gone) return;
    const X = ACTS()[e.act];
    if (X && X.draw) X.draw(ctx, e, pos, env);
    else if (e.who === 'dog') C().dogDraw(ctx, e, pos, 'ground');
    else if (NAMED.includes(e.who)) drawNamed(ctx, e, pos);
    else if (e.act === 'buried') CD().drawBuried(ctx, e, pos);
    else if (e.act === 'snorkel') CD().drawSnorkel(ctx, e, pos);
    else if (e.act === 'float') (e.soot || e.inkable ? C().inkFloat : CD().drawFloat)(ctx, e, pos);
    else CD().drawFigure(ctx, e, pos);
  }
  function drawFind(ctx, f) {
    if (f.got || f.bubble || f.jelly) return;
    ctx.save(); ctx.translate(f.cx, f.cy + (f.follow ? Math.sin(api.time * 9) * 1.2 : Math.sin(api.time * 2.4) * 2)); if (f.big) ctx.scale(f.big, f.big);
    if (f.glow) { const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, 'rgba(255,224,120,0.7)'); g.addColorStop(1, 'rgba(255,224,120,0)'); ctx.fillStyle = g; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(api.time * 3); ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (f.follow) { ctx.strokeStyle = D().COL.woodDeep; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-(f.dir || 1) * 20, 6); ctx.lineTo(0, 0); ctx.stroke(); ctx.rotate(-Math.PI / 2 * (f.dir || 1) + 0.8); }
    D().findIcon(ctx, f.item, api.time, f.already ? 0.45 : 1);
    if (f.item === 'camera' && Math.floor(api.time * 2) % 2) { ctx.fillStyle = '#E24A5A'; ctx.beginPath(); ctx.arc(8, -9, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawHold(ctx, f) { // the found item held up over Mimo's head for a moment (a carried one: coast-handover.js)
    const p = api.p; if (!f.hold || !p || f.carry || f.handed) return;
    const k = Math.min(1, f.hold.t / 0.18), fade = Math.min(1, (1.3 - f.hold.t) / 0.25);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x + p.w / 2, p.y - 14 - 8 * k); ctx.scale(0.6 + 0.6 * k, 0.6 + 0.6 * k);
    D().findIcon(ctx, f.item, api.time, 1); ctx.restore();
  }
  // big comic sound words (MimoCoast.pop): they pop in with an overshoot, rise a little, hold, then fade
  const POP_LIFE = 1.5, POP_OUT = 0.2;
  function pop(x, y, text, o) {
    const st = api.L && api.L.story; if (!st) return;
    st.pops = [...st.pops.filter((q) => api.time - q.t0 < POP_LIFE), { x, y, text, t0: api.time, size: (o && o.size) || 22, fill: o && o.fill, rot: o && o.rot }];
  }
  function drawPops(ctx, st) {
    for (const q of st.pops) {
      const k = api.time - q.t0; if (k < 0 || k > POP_LIFE) continue;
      // the word leaves quickly and a little smaller: a long half-faded word is hard to read on the sand
      const out = Math.max(0, 1 - (POP_LIFE - k) / POP_OUT), s = (k < 0.12 ? k / 0.12 * 1.25 : k < 0.22 ? 1.25 - (k - 0.12) / 0.1 * 0.25 : 1) * (1 - out * 0.25);
      ctx.save(); ctx.globalAlpha = 1 - out * out; ctx.translate(q.x, q.y - Math.min(k, 0.6) * 14); ctx.scale(s, s);
      D().comic(ctx, q.text, 0, 0, q.size, q.fill, q.rot); ctx.restore();
    }
  }
  // owners at the door, hidden before the find system is asked (levels without find have none)
  function draw(layer, ctx) {
    const st = api.L && api.L.story; if (!st) return;
    if (layer === 'mid') { nightNow = nightStep(); D().setNight(nightNow); }
    if (layer === 'mid') {
      for (const e of st.cast) if (!e.front) drawEntry(ctx, e);
      if (st.find) { for (const o of st.find.owners) drawEntry(ctx, o); drawFind(ctx, st.find); }
    } else if (layer === 'front') {
      for (const e of st.cast) if (e.front) drawEntry(ctx, e);
      if (st.find) drawHold(ctx, st.find);
      if (st.pops.length) drawPops(ctx, st);
    }
  }

  // ---------- the sunglasses of the wardrobe (a reward for all 13 finds) ----------
  const shades = {
    id: 'a_shades', kind: 'acc', name: 'Sonnenbrille', price: 0, face: true,
    own: () => findCount() >= FIND_TOTAL,
    how: () => 'Finde alle dreizehn Fundstücke an der Küste (' + findCount() + ' von ' + FIND_TOTAL + ').',
    // drawn in the face's own space (after the eyes): o.eyeY is the height of the eyes
    draw(ctx, o) {
      const y = o.eyeY + 0.6, a = o.alpha == null ? 1 : o.alpha;
      ctx.globalAlpha = a; ctx.strokeStyle = '#3B3560'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(5.2, y - 0.2); ctx.lineTo(4.0, y - 0.2); ctx.moveTo(-3.2, y - 0.6); ctx.lineTo(-9.5, y - 2.4); ctx.stroke();
      ctx.fillStyle = '#4A4F7E';
      for (const x of [1, 8.2]) { ctx.beginPath(); ctx.ellipse(x, y, 4.2, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = a * 0.5;
      for (const x of [-0.4, 6.8]) { ctx.beginPath(); ctx.ellipse(x, y - 1.6, 1.7, 0.9, -0.5, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = a;
    },
  };

  // what the act modules (coast-story-acts.js, coast-opening.js) may use of this engine
  const env = { T, TAU, get api() { return api; }, drawFigure: (ctx, e, pos) => CD().drawFigure(ctx, e, pos), drawBuried: (ctx, e, pos) => CD().drawBuried(ctx, e, pos), rigAt: (ctx, e, x, y, o) => CD().rigAt(ctx, e, x, y, o), reaches, onScreen, pingpong, position, phaseOf, makeEntry, rigH, get night() { return C().nightOverride != null ? C().nightOverride : nightNow; }, surface: () => C().surface(), story: () => api.L && api.L.story };
  Object.assign(window.MimoCoast, { findCount, hasFind, FIND_TOTAL, storyEnv: env, pop });
  window.MimoWorlds.register({
    world: 4,
    costumes: [shades],
    headNote: () => 'Strandtasche ' + findCount() + '/' + FIND_TOTAL,
    setup(a) { api = a; },
    init, update, draw,
  });
})();
