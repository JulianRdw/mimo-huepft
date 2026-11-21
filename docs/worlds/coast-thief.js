// World 4: the Krake steals, in front of Mimo. One act for the cast list (`snatch`), the arm picture it uses, and small
// scene helpers for the owners' reactions. Loaded after coast-story-acts.js; the opening scene uses the same arm.
//
// { who: 'prop', act: 'snatch', x, y, ... }   one theft per level start (it stays stolen after a respawn)
//   what is taken (one of):  kind: a beach prop drawn at x,y until taken (scale, ih = its centre above the feet, px)
//                            take: tag of another cast entry (a prop), hidden from the grab on
//                            hand: tag of a family figure + swap: the hand prop it loses ('mic'); icon: what the arm carries
//                            hand + part: 'snorkel' the snorkel off a snorkeller's head
//                            carryOf: tag of the dog: what it carries in its mouth (carry: the kind, for the picture)
//                            icon: a find icon (sdraw.ICONS) drawn at x,y (or carried, with hand)
//   from:  'water' (out of the sea at the water line) | 'sand' (out of a hole) ; ax: base x in tiles from x (default -2),
//          ay: base row for 'sand' (default the row under the feet)
//   when:  at: Mimo's centre passes this tile x (from the left; dir: -1 from the right), else r: tiles from x (default 7),
//          rows: how far above or below Mimo may be (default 6); atRow: Mimo's feet are at or above this row (a climb);
//          cue: tag of a 'call' entry: when everybody has run to the table
//          belowRow: Mimo's feet are at or below this row (he dived); always: the thing must be well inside the view
//          (VIEW margins) and the story director must have the stage free (coast-director.js), so nothing else talks
//   then:  owner: tag of the owner, cry: what the owner says after a double take ("He! Mein Eimer!"), then the `then` lines, the note last,
//          note: { by: tag, text } the professor writes it down, bark: tag of the dog, gulp: the sound word (default "Schlürf!"),
//          then: [{ by: tag, text, note }] more lines, in this order (note: true = written down like `note`); pace: >1 plays the theft faster (rather not)
// The theft is one beat of the director: the arm rises, looks round, holds still, taps, grabs slowly and pulls it away;
// only when it is gone does the owner notice (double take), then the cry, then the note, then the other lines, each
// after the one before. Pure decoration: nothing here touches Mimo or the physics; every motion is a function of api.time.
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, S = () => window.MimoCoast.sdraw, ENV = () => window.MimoCoast.storyEnv;
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ARM = { body: '#F08FA4', lite: '#F9BFCB', far: '#E7869C' };   // the colours of Käpt'n Krake's arms (coast-boss-draw.js)
  // the beats of a theft (seconds after the trigger): ripples, the arm rises, looks round, holds still, taps twice, grabs,
  // pulls it away slowly; the owner notices only after GONE (the director's next beat)
  const B = { RISE: 0.4, FEEL: 1.3, LOOK: 2.1, STILL: 2.5, TAP: 3.0, GRAB: 3.35, PULL: 3.6, GONE: 4.5, END: 5.2 };
  // the thing must be this far inside the view (share of its width and height) when the arm starts
  const VIEW = { x: 0.16, top: 0.2, bottom: 0.12 };
  const OWNER_PRIO = 4.5, CHAIN_WAIT = 6, FOLLOW_WAIT = 2.5;   // the owner's reaction goes before everything else (also the door)

  // ---------- the arm ----------
  // points from the base (under the water line or in the hole) to the tip; it leaves the base upwards and bends to the
  // tip, a soft wave runs along it; curl 0..1 rolls the last part into a hook (holding something), returns the hook centre
  function armPoints(bx, by, tx, ty, t, o) {
    o = o || {};
    const n = 18, out = [], dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, cx = bx + dx * 0.15, cy = by - Math.max(30, len * 0.55);
    const amp = o.amp == null ? 7 : o.amp;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), m = 1 - k, x = m * m * bx + 2 * m * k * cx + k * k * tx, y = m * m * by + 2 * m * k * cy + k * k * ty;
      const ddx = 2 * m * (cx - bx) + 2 * k * (tx - cx), ddy = 2 * m * (cy - by) + 2 * k * (ty - cy), l = Math.hypot(ddx, ddy) || 1;
      const w = Math.sin(k * 6 - t * 4.2) * amp * Math.sin(k * Math.PI) * (1 - k * 0.4);
      out.push({ x: x - ddy / l * w, y: y + ddx / l * w });
    }
    const curl = o.curl || 0, side = o.side || 1;
    if (curl <= 0) return { ps: out, hook: { x: tx, y: ty } };
    // the hook: a circle of radius r beside the tip, swept up to 300 degrees
    const a = out[n - 2], b = out[n - 1], ang = Math.atan2(b.y - a.y, b.x - a.x), r = o.r || 8;
    const hx = b.x + Math.cos(ang + side * Math.PI / 2) * r, hy = b.y + Math.sin(ang + side * Math.PI / 2) * r;
    const a0 = ang - side * Math.PI / 2, steps = 6;
    for (let j = 1; j <= steps; j++) { const aa = a0 + side * (j / steps) * curl * 5.2; out.push({ x: hx + Math.cos(aa) * r, y: hy + Math.sin(aa) * r }); }
    return { ps: out, hook: { x: hx, y: hy } };
  }
  function drawArm(ctx, ps, w0, t) {
    const n = ps.length; if (n < 2) return;
    const left = [], right = [], ink = S().ink ? S().ink() : '#3B3560';
    for (let i = 0; i < n; i++) {
      const a = ps[Math.max(0, i - 1)], b = ps[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, k = i / (n - 1), w = Math.max(1.8, w0 * (1 - k * 0.85)) / 2;
      left.push({ x: ps[i].x - dy / l * w, y: ps[i].y + dx / l * w }); right.push({ x: ps[i].x + dy / l * w, y: ps[i].y - dx / l * w });
    }
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    const e = ps[n - 1], er = Math.max(1.8, w0 * 0.15) / 2; ctx.arc(e.x, e.y, er, 0, TAU);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath(); ctx.fillStyle = ARM.body; ctx.fill(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
    // the light underside and the suckers on it
    ctx.strokeStyle = ARM.lite; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, w0 * 0.22); ctx.globalAlpha = 0.85;
    ctx.beginPath(); for (let i = 0; i < n - 2; i++) { const q = { x: ps[i].x + (left[i].x - ps[i].x) * 0.55, y: ps[i].y + (left[i].y - ps[i].y) * 0.55 }; if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF';
    for (let i = 1; i < n - 2; i += 2) { const k = i / (n - 1), q = ps[i], r = Math.max(0.9, w0 * (1 - k * 0.85) * 0.12); ctx.beginPath(); ctx.arc(q.x + (left[i].x - q.x) * 0.62, q.y + (left[i].y - q.y) * 0.62, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // where the arm leaves the water or the sand: rings and foam, or a dark hole with a rim
  function drawBase(ctx, x, y, from, k, t) {
    if (k <= 0) return;
    ctx.save();
    if (from === 'sand') {
      ctx.fillStyle = 'rgba(110,84,52,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 13 * k, 4 * k, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = (ENV().api.W && ENV().api.W.groundDot) || '#E8CF9C'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 13 * k, y - 1, 5 * k, 2.6 * k, 0, Math.PI, 0); ctx.fill(); }
    } else {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;
      for (let i = 0; i < 2; i++) { const r = (t * 0.9 + i * 0.5) % 1; ctx.globalAlpha = 0.8 * k * (1 - r); ctx.beginPath(); ctx.ellipse(x, y, 10 + r * 22, 2.4 + r * 2.2, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  // ---------- small scene helpers (work on cast entries of the story engine) ----------
  const find = (tag) => { const st = ENV().story(); return st && tag ? st.cast.find((c) => c.tag === tag) : null; };
  // run fn after secs of game time (the story engine runs the entry's timeline every frame)
  function later(e, secs, fn) {
    const at = ENV().api.time + secs, tl = e.tl || (e.tl = []);
    let i = tl.length; while (i > 0 && tl[i - 1].at > at) i--;
    tl.splice(i, 0, { at, fn });
  }
  // hold a pose on top of whatever the act does (null releases it)
  const hold = (e, pose, opts) => { e.over = pose ? { pose, opts: opts || null } : null; };
  // the double take: a glance at Mimo, then the head snaps to the spot, a jolt, the arm points there and the line is said
  function doubleTake(e, spotX, line, o) {
    if (!e) return;
    o = o || {};
    const dir = spotX >= (e.pos ? e.pos.x : e.x0) ? 1 : -1;
    C().cast.look(e, null);
    later(e, 0.35, () => { C().cast.look(e, spotX - (e.pos ? e.pos.x : e.x0)); if (e.pp) e.pp.fig.flashBrows(); e.jolt = ENV().api.time; });
    later(e, 0.6, () => { hold(e, o.pose || 'point', { dir }); if (line) C().cast.say(e, line, o.secs || 2.2); });   // a line here is said at once (scenes)
    later(e, o.until || 2.9, () => { hold(e, null); C().cast.look(e, null); });
  }
  // the professor writes it down: the pen scribbles while the note shows as a bubble (one beat of the director)
  function note(e, text, o) {
    if (!e) return;
    C().director.say(e, text, { prio: OWNER_PRIO, wait: FOLLOW_WAIT, front: true, ...(o || {}), lead: 0.5, before: () => hold(e, 'write', { dir: e.face || 1 }), done: () => hold(e, null) });
  }

  // ---------- the act ----------
  function itemPoint(e) {
    if (e.carryOf) { const d = find(e.carryOf); if (d && d.pos) return { x: d.pos.x + (d.pos.face || 1) * 15, y: d.pos.foot - (d.pos.hop || 0) - 17 }; }
    if (e.hand && e.part === 'snorkel') { const f = find(e.hand); if (f && f.pos) return { x: f.pos.x + (f.pos.face || 1) * 16, y: f.pos.foot - 27 }; }
    if (e.hand) { const f = find(e.hand); if (f && f.pos) { const pr = f.pp && f.pp.fig.prop, h = C().cast.hand(f, pr && pr.hand === 'l' ? 'l' : 'r'); return { x: f.pos.x + h[0], y: f.pos.foot - (f.pos.hop || 0) + h[1] - 4 }; } }
    if (e.take) { const g = find(e.take); if (g && g.pos) return { x: g.pos.x, y: g.pos.foot - (g.ih || e.ih || 10) }; }
    return { x: e.x0, y: e.foot - (e.ih || 10) };
  }
  function basePoint(e, api) {
    const x = e.x0 + (e.ax == null ? -2 : e.ax) * T;
    if (e.from === 'sand') return { x, y: e.ay != null ? e.ay * T : e.foot };
    const sf = ENV().surface(); return { x, y: (sf != null ? sf : e.foot) + 4 };
  }
  function triggered(e, api) {
    const p = api.p; if (!p) return false;
    const mx = (p.x + p.w / 2) / T, my = (p.y + p.h) / T, rows = e.rows || 6;
    if (e.cue) { const c = find(e.cue); return !!(c && c.cue); }
    if (e.belowRow != null && my < e.belowRow) return false;
    if (e.atRow != null && my > e.atRow) return false;
    if (e.atRow != null && e.at == null) return true;   // atRow alone; with `at` both must hold
    if (Math.abs(my - e.foot / T) > rows) return false;
    if (e.at != null) return (e.dir || 1) > 0 ? mx >= e.at : mx <= e.at;
    return Math.abs(mx - e.x0 / T) < (e.r || 7);
  }
  // what the arm carries away, drawn at (0,0) = its centre
  function drawItem(ctx, e, t) {
    const sd = S();
    if (e.part === 'snorkel') { ctx.save(); ctx.strokeStyle = sd.COL.orange; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, 10); ctx.quadraticCurveTo(2, 10, 2, 2); ctx.lineTo(2, -12); ctx.stroke(); ctx.strokeStyle = sd.COL.red; ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(2, -15); ctx.stroke(); ctx.restore(); return; }
    if (e.carry) { ctx.save(); ctx.scale(0.5, 0.5); sd.carry(ctx, e.carry, t); ctx.restore(); return; }
    if (e.icon) { ctx.save(); ctx.scale(e.iconScale || 0.8, e.iconScale || 0.8); sd.ICONS[e.icon](ctx, t); ctx.restore(); return; }
    const src = e.take ? find(e.take) : e, kind = src && (src.kind || e.kind); if (!kind) return;
    ctx.save(); ctx.translate(0, src.ih || e.ih || 10); ctx.scale(src.scale || 1, src.scale || 1); (sd.PROPS[kind] || sd.PROPS.bucket)(ctx, t, src); ctx.restore();
  }
  // the thing is well inside the view (not at an edge), so the whole theft can be seen
  // (where the camera stands at an edge of the level and cannot show more, a tile of room is enough on that side)
  function wellInView(e, api) {
    const it = itemPoint(e), c = api.cam, v = api.view, L = api.L, W = L.w * T, H = L.h * T;
    const l = c.x <= 1 ? T : v.w * VIEW.x, r = c.x + v.w >= W - 1 ? T : v.w * VIEW.x;
    const top = c.y <= 1 ? v.h * VIEW.bottom : v.h * VIEW.top, bot = c.y + v.h >= H - 1 ? T : v.h * VIEW.bottom;
    return it.x > c.x + l && it.x < c.x + v.w - r && it.y > c.y + top && it.y < c.y + v.h - bot;
  }
  // after the arm has gone: the owner notices, cries out, the professor notes it, the others speak, one after another
  function chain(e, s) {
    const D = C().director, o = find(e.owner);
    if (o && e.cry) {
      const lead = 0.7 / (e.pace || 1), secs = D.secsFor(e.cry);
      D.say(o, e.cry, { prio: OWNER_PRIO, wait: CHAIN_WAIT, front: true, lead, secs, before: () => doubleTake(o, s.spot, null, { pose: e.ownerPose, until: lead + secs + 0.2 }) });
    }
    for (const l of e.then || []) { const w = find(l.by); if (w && l.note) note(w, l.text); else if (w) D.say(w, l.text, { prio: OWNER_PRIO, wait: FOLLOW_WAIT, front: true, secs: l.secs }); }
    if (e.note) note(find(e.note.by), e.note.text);
  }
  function fire(e, api) {
    const s = e.sn, k = (api.time - s.t0) * (e.pace || 1);
    const once = (name, at, fn) => { if (k >= at && !s[name]) { s[name] = true; fn(); } };
    once('rise', B.RISE, () => { const b = basePoint(e, api); api.burst(b.x, b.y, 10, e.from === 'sand' ? ['#E8CF9C', '#D2B27A'] : ['#FFFFFF', '#CFEFF6'], 120, { grav: 380, vy: -140, life: 0.5, r: 2 }); if (api.sfx.bubble) api.sfx.bubble(); });
    once('grab', B.GRAB, () => {
      s.got = true;
      if (e.take) { const g = find(e.take); if (g) g.gone = true; }
      if (e.hand && e.swap) { const f = find(e.hand); if (f) C().cast.propAs(f, e.swap, null); }
      if (e.hand && e.part === 'snorkel') { const f = find(e.hand); if (f) f.noSnorkel = true; }
      if (e.carryOf) { const d = find(e.carryOf); if (d) d.carry = null; }
      if (api.voice) api.voice({ type: 'sine', f0: 520, f1: 760, slide: 0.08, dur: 0.1, vol: 0.05 });
      const d = find(e.bark); if (d) { later(d, 0.5, () => api.floater(d.pos ? d.pos.x : d.x0, d.foot - 34, 'Wuff!', '#8E8CA3')); later(d, 1.1, () => api.floater(d.pos ? d.pos.x : d.x0, d.foot - 40, 'Wuff, wuff!', '#8E8CA3')); }
    });
    once('gone', B.GONE - 0.08, () => {
      const b = basePoint(e, api);
      api.burst(b.x, b.y, 14, e.from === 'sand' ? ['#E8CF9C', '#D2B27A'] : ['#FFFFFF', '#CFEFF6', '#9ED3EE'], 170, { grav: 420, vy: -170, life: 0.55, r: 2.2 });
      C().pop(b.x, b.y - 30, e.gulp || 'Schlürf!', { size: 20 });
      if (api.voice) api.voice({ type: 'sine', f0: 340, f1: 80, slide: 0.22, dur: 0.28, vol: 0.06 });
    });
    if (k > B.END) s.ph = 'done';
  }
  const snatch = {
    always: true,
    update(e, dt, env) {
      const api = env.api, s = e.sn || (e.sn = { ph: 'wait', t0: 0 });
      if (s.ph === 'wait') {
        // queued as soon as it is due: it goes before the small lines, and starts once the stage is free and the thing
        // is well inside the view (or is dropped and waits for the next chance)
        const live = api.state === 'play' || api.state === 'win';   // Mimo in the door still sees it
        if (!live || !triggered(e, api)) return;
        s.ph = 'queued';
        C().director.beat({ prio: 'theft', wait: e.patience || 4, hold: (B.GONE + 0.3) / (e.pace || 1),
          ok: () => (api.state === 'play' || api.state === 'win') && triggered(e, api) && wellInView(e, api),
          start: () => { s.ph = 'go'; s.t0 = api.time; const p = itemPoint(e); s.spot = p.x; s.spotY = p.y; chain(e, s); },
          dropped: () => { s.ph = 'wait'; } });
        return;
      }
      if (s.ph === 'go') fire(e, api);
    },
    draw(ctx, e, pos, env) {
      const api = env.api, t = api.time, s = e.sn || { ph: 'wait' };
      if (!env.onScreen(e.x0, e.foot, 320)) return;
      const it = itemPoint(e), resting = s.ph === 'wait' || !s.got;
      // the thing at its place (an own prop or icon; taken entries and hand props draw themselves)
      if (resting && !e.take && !e.hand && (e.kind || e.icon)) {
        const k = s.ph === 'go' ? (api.time - s.t0) * (e.pace || 1) : 0, tap = k > B.TAP && k < B.GRAB ? Math.abs(Math.sin((k - B.TAP) / (B.GRAB - B.TAP) * TAU)) : 0;
        if (e.kind && !e.wet) { ctx.save(); ctx.translate(it.x, it.y + (e.ih || 10)); S().groundShadow(ctx, e.kind); ctx.restore(); }   // it stands on the sand
        ctx.save(); ctx.translate(it.x, it.y + tap * 2); ctx.scale(1 + tap * 0.12, 1 - tap * 0.15); drawItem(ctx, e, t); ctx.restore();
      }
      if (s.ph !== 'go') return;
      const k = (t - s.t0) * (e.pace || 1), b = basePoint(e, api), side = it.x >= b.x ? 1 : -1;
      drawBase(ctx, b.x, b.y, e.from, Math.min(1, k / B.RISE) * (1 - seg(k, B.GONE, B.END)), t);
      if (k < B.RISE || k > B.GONE) return;
      // the tip: rises to hover over the thing, feels around, taps it twice, grabs, pulls it down into the base
      const hx = it.x - side * 8, hy = it.y - 30;
      let tx, ty, curl = 0;
      if (k < B.FEEL) { const q = ease(seg(k, B.RISE, B.FEEL)); tx = lerp(b.x, hx, q); ty = lerp(b.y, hy - 14, q); }
      else if (k < B.LOOK) { const q = seg(k, B.FEEL, B.LOOK); tx = hx + Math.sin(q * TAU) * 20; ty = hy - 14 + Math.sin(q * TAU * 2) * 4; }   // looks round
      else if (k < B.STILL) { tx = hx; ty = hy - 14; }                                                                                     // holds still
      else if (k < B.TAP) { const q = ease(seg(k, B.STILL, B.TAP)); tx = lerp(hx, lerp(hx, it.x, 0.6), q); ty = hy - 14 + q * 14; }       // comes down to it
      else if (k < B.GRAB) { const q = (k - B.TAP) / (B.GRAB - B.TAP), tap = Math.abs(Math.sin(q * TAU)); tx = lerp(hx, it.x, 0.6); ty = lerp(hy, it.y - 8, tap); }
      else if (k < B.PULL) { const q = seg(k, B.GRAB, B.PULL); curl = q; tx = lerp(lerp(hx, it.x, 0.6), it.x - side * 6, q); ty = lerp(hy, it.y - 6, 1 - q * 0.3); }
      else { const q = seg(k, B.PULL, B.GONE), qq = q * q; curl = 1; tx = lerp(it.x - side * 6, b.x, qq); ty = lerp(it.y - 10, b.y + 10, qq); }
      const arm = armPoints(b.x, b.y, tx, ty, t, { curl, side, amp: k > B.PULL ? 3 : k > B.LOOK && k < B.STILL ? 1 : 7 });
      if (k >= B.GRAB) { ctx.save(); ctx.translate(arm.hook.x, arm.hook.y); ctx.rotate(Math.sin(t * 9) * 0.15); drawItem(ctx, e, t); ctx.restore(); }
      // the part under the water line or in the sand stays hidden
      ctx.save(); ctx.beginPath(); ctx.rect(b.x - 400, b.y - 400, 800, 400 + (e.from === 'sand' ? 0 : 2)); ctx.clip();
      drawArm(ctx, arm.ps, e.w0 || 17, t); ctx.restore();
    },
  };

  // sausages lying on the grate of the open grill (drawn from the feet of the grill), a thing worth stealing
  S().PROPS.sausages = function (ctx) {
    const sd = S();
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(-8 + i * 8, -17.2 - (i === 1 ? 0.5 : 0)); ctx.rotate((i - 1) * 0.07);
      sd.rrect(ctx, -3.8, -1.9, 7.6, 3.8, 1.9); sd.paint(ctx, '#D98C63', 0.35);
      ctx.strokeStyle = '#B5684A'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';   // grill marks
      ctx.beginPath(); ctx.moveTo(-1.6, -1.2); ctx.lineTo(-0.6, 1.2); ctx.moveTo(1, -1.2); ctx.lineTo(2, 1.2); ctx.stroke(); ctx.restore();
    }
  };

  window.MimoCoast.thief = { armPoints, drawArm, drawBase, ARM, BEATS: B };
  window.MimoCoast.scene = { later, hold, doubleTake, note, find };
  window.MimoCoast.acts = Object.assign(window.MimoCoast.acts || {}, { snatch });
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
