// World 4 story acts, part two: the little scenes a cast entry can play beyond standing, waving and running.
//   paddle   a figure on a paddle board on the water line; falls in when Mimo comes within 3 tiles, climbs back after a few seconds
//            (steady: true wobbles hard but stays on, then waves a scarf once Mimo is past)
//   juggle   a ball bouncing on knee and foot, the count in a bubble (it miscounts)
//   hop1     hopping on one foot over hot sand (heat lines, a dust puff per landing)
//   tick     a "Tick, tack" bubble at a spot (a watch), bigger the closer Mimo comes
//   call     { who, act: 'call', line, r, group: [tags], table: tag }
//            when Mimo comes within r the caller shouts (when the story director lets the line play), everyone in the group freezes, turns and runs to the table; as they
//            run the caller gets `cue`: a snatch act (coast-thief.js) with cue: <caller tag> steals what was left behind
// Every motion is a function of api.time and Mimo's place (never of a random number), so the level bots replay exactly.
// An act is { pos?(e, time, env), update?(e, dt, env), draw(ctx, e, pos, env), always? } and registers in MimoCoast.acts.
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const S = () => window.MimoCoast.sdraw, ENV = () => window.MimoCoast.storyEnv;
  const FOAM = () => { const W = ENV().api.W; return (W && W.foam) || '#FFFFFF'; };   // ripples and bubbles take the foam of the scheme
  const ease = (k) => k * k * (3 - 2 * k), clamp01 = (k) => Math.max(0, Math.min(1, k));
  const near = (e, tiles, vert) => { const p = ENV().api.p; return !!p && Math.abs((p.x + p.w / 2) - e.x0) < tiles * T && Math.abs((p.y + p.h) - e.foot) < (vert || 5) * T; };

  // ---------- paddle ----------
  const FALL_AT = 3, FALL_FROM = 0.75, WET_UNTIL = 3.6, BACK_UNTIL = 4.6, REARM = 6;
  const paddle = {
    pos(e, time, env) {
      const out = { x: e.x0, foot: e.foot, face: e.face, hop: 0 }, s = env.surface(); if (s != null) out.foot = s;
      return out;
    },
    update(e, dt, env) {
      const api = env.api, s = e.pd || (e.pd = { st: 'on', t0: 0, armed: true });
      if (api.state !== 'play' || e.steady) return;   // steady: this time he stays on the board (level 42)
      const t = api.time;
      if (s.st === 'on') {
        if (!s.armed && !near(e, REARM, 6)) s.armed = true;
        if (s.armed && near(e, FALL_AT, 6)) { s.st = 'fall'; s.t0 = t; s.armed = false; api.burst(e.x0, e.pos.foot - 4, 14, ['#FFFFFF', '#CFEFF6'], 140, { grav: 420, vy: -150, life: 0.5, r: 2 }); api.sfx.bubble && api.sfx.bubble(); }
      } else if (t - s.t0 > BACK_UNTIL) s.st = 'on';
    },
    draw(ctx, e, pos) { window.MimoCoast.castDraw.drawPaddle(ctx, e, pos); },
  };

  // ---------- juggle: ball on knee and foot, counting ----------
  const COUNT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '8?'], BEAT = 0.42;
  const juggle = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, sd = S(), beat = (t + e.phase) / BEAT, k = beat % 1, n = Math.floor(beat) % COUNT.length, s = e.scale || 1;
      env.drawFigure(ctx, e, pos);
      // the ball hops from the foot up to the knee and back, a little to the side with each kick
      const side = (Math.floor(beat) % 2 ? 1 : -1) * 6, y = -Math.abs(Math.sin(k * Math.PI)) * 26 * s - 6;
      ctx.save(); ctx.translate(pos.x + (side + Math.sin(k * Math.PI) * -side * 0.4) * s, pos.foot + y); ctx.rotate(beat * 2.4); ctx.scale(0.55, 0.55); sd.ICONS.ball(ctx); ctx.restore();
      sd.tag(ctx, COUNT[n], pos.x, pos.foot - e.top - 14, 0.35);
    },
  };

  // ---------- hop1: on one foot over hot sand ----------
  const hop1 = {
    pos(e, time, env) {
      const out = { x: e.x0, foot: e.foot, face: e.face, hop: 0 }, w = Math.abs(Math.sin(time * 4.2 + e.phase));
      out.hop = w * 11; out.lean = Math.sin(time * 4.2 + e.phase) > 0 ? 1 : -1;
      return out;
    },
    draw(ctx, e, pos, env) {
      const t = env.api.time, ph = (t * 4.2 + e.phase) / Math.PI, land = ph % 1;
      ctx.save(); ctx.strokeStyle = '#F2A98E'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; // heat above the sand
      for (let i = 0; i < 3; i++) { const x = pos.x - 12 + i * 12; ctx.globalAlpha = 0.55; ctx.beginPath(); for (let j = 0; j <= 6; j++) { const y = pos.foot - 2 - j * 2.6, xx = x + Math.sin(t * 5 + i * 2 + j) * 2; if (j) ctx.lineTo(xx, y); else ctx.moveTo(xx, y); } ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.restore();
      env.drawFigure(ctx, e, { ...pos, running: false });
      if (land < 0.25) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - land * 4); ctx.fillStyle = (env.api.W && env.api.W.groundDot) || '#E8D3A6'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(pos.x + s * (6 + land * 24), pos.foot - 2 - land * 8, 2.4 - land * 5, 0, TAU); ctx.fill(); } ctx.restore(); }
    },
  };

  // ---------- tick: a "Tick, tack" that grows with the closeness of Mimo ----------
  const tick = {
    always: true,
    draw(ctx, e, pos, env) {
      const api = env.api, p = api.p; if (!p || api.state === 'win') return;
      const d = Math.hypot((p.x + p.w / 2) - e.x0, (p.y + p.h / 2) - (e.foot - 16)) / T, range = e.range || 11;
      if (d > range) return;
      const k = 1 - d / range, t = api.time, beat = Math.floor(t * 2.2) % 2;
      const pulse = 1 + (((t * 2.2) % 1) < 0.18 ? 0.12 : 0);
      ctx.save(); ctx.translate(e.x0, e.foot - 26 - k * 10); ctx.scale(pulse, pulse); S().tag(ctx, beat ? 'Tack' : 'Tick', 0, 0, k, '#FFF6D6'); ctx.restore();
    },
  };

  // ---------- call: 'Essen ist fertig!' ----------
  // the caller shouts, everyone in the group freezes mid-move, the heads turn to the caller all together, then they all
  // sprint to the table at once (already turned that way, so nobody stands and turns first); as they run the caller's
  // entry gets `cue`, which starts a snatch act with cue: <caller tag> (what was left behind gets stolen)
  const RUN_SPEED = 5.4, FREEZE = 0.55, TURN = 0.35, FIND = (st, tag) => st.cast.find((c) => c.tag === tag);
  const call = {
    always: true,
    update(e, dt, env) {
      const api = env.api, st = env.story(), c = e.cs || (e.cs = { ph: 0, t0: 0, tArr: 0 });
      if (!st || api.state !== 'play' && c.ph === 0) return;
      const t = api.time, who = () => [e, ...(e.group || []).map((g) => FIND(st, g)).filter(Boolean)], table = FIND(st, e.table);
      if (c.ph === 0 && e.spoke) { c.ph = 1; c.t0 = t; for (const m of who()) if (m !== e) { m.frozen = true; m.lookDx = 0; } }
      if (c.ph === 1 && t >= c.t0 + FREEZE - TURN) for (const m of who()) if (m !== e && table) { m.lookDx = table.x0 - (m.pos ? m.pos.x : m.x0); m.turnTo = table.x0 >= (m.pos ? m.pos.x : m.x0) ? 1 : -1; }
      if (c.ph === 1 && t >= c.t0 + FREEZE) {
        c.ph = 2;
        if (table) who().forEach((m, i) => {
          const side = i % 2 ? 1 : -1, tx = table.x0 + side * (14 + (i >> 1) * 15), from = m.pos ? m.pos.x : m.x0;
          m.mv = { fx: from, tx, speed: RUN_SPEED, t0: t + i * 0.04, faceEnd: tx > table.x0 ? -1 : 1 };
          c.tArr = Math.max(c.tArr, t + i * 0.04 + Math.abs(tx - from) / (RUN_SPEED * T));
          m.frozen = false; m.lookDx = null; m.turnTo = 0;
          m.act = m.act === 'buried' ? 'stand' : m.act;
        });
      }
      if (c.ph === 2) { c.ph = 3; e.cue = true; }
    },
    draw(ctx, e, pos, env) { if (env.onScreen(pos.x, pos.foot, 90)) env.drawFigure(ctx, e, pos); },
  };


  // ---------- work: pats the sand, a squash with every pat, a few grains flying ----------
  const work = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, ph = (t * 2.6 + e.phase) % 1, pat = Math.max(0, Math.sin(ph * TAU)), sc = e.scale || 1;
      ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(1, 1 - pat * 0.05); ctx.translate(-pos.x, -pos.foot);
      env.drawFigure(ctx, e, { ...pos, x: pos.x + pat * 1.5 * (e.face || 1) });
      ctx.restore();
      if (ph > 0.25 && ph < 0.55) { const k = (ph - 0.25) / 0.3; ctx.save(); ctx.fillStyle = (env.api.W && env.api.W.groundDot) || '#E3CB9C'; ctx.globalAlpha = 1 - k; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(pos.x + (e.face || 1) * (14 + i * 5) * sc, pos.foot - 4 - Math.sin(k * Math.PI) * (6 + i * 3), 1.3, 0, TAU); ctx.fill(); } ctx.restore(); }
    },
  };

  // ---------- grade: a sheet with a pen scribbling on it, and now and then the mark ----------
  const MARKS = ['2-', '3+', '2-', '4'];
  const grade = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, f = e.face || 1, cyc = (t * 0.33 + e.phase) % 1, sd = S();
      env.drawFigure(ctx, e, pos);
      const hh = window.MimoCoast.cast.hand(e, f > 0 ? 'r' : 'l');
      ctx.save(); ctx.translate(pos.x + hh[0] + f * 3, pos.foot + hh[1] + 1); ctx.rotate(f * 0.1);
      sd.rrect(ctx, -6, -8, 12, 15, 1.5); sd.paint(ctx, sd.COL.white, 0.3);
      ctx.strokeStyle = '#9AA0C2'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const w = clamp01(cyc * 3.4 - i * 0.8) * 8; ctx.beginPath(); ctx.moveTo(-4, -4 + i * 3.2); ctx.lineTo(-4 + w, -4 + i * 3.2); ctx.stroke(); }
      ctx.restore();
      if (cyc > 0.75) { const k = (cyc - 0.75) / 0.25; ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI); sd.tag(ctx, MARKS[Math.floor(t * 0.33 + e.phase) % MARKS.length], pos.x + f * 18, pos.foot - e.top - 8 - k * 4, 0.2, '#FFE3E3'); ctx.restore(); }
    },
  };

  // ---------- wade: standing in the sea up to the knees (depth = px below the water line), the lower legs hidden, ripples round them ----------
  const wade = {
    pos(e, time, env) { const out = { x: e.x0, foot: e.foot, face: e.face, hop: 0 }, sf = env.surface(); if (sf != null) out.foot = sf + (e.depth == null ? 17 : e.depth); return out; },
    draw(ctx, e, pos, env) {
      const api = env.api, t = api.time, sf = env.surface(); if (sf == null) return;
      ctx.save(); ctx.beginPath(); ctx.rect(pos.x - 70, pos.foot - 200, 140, sf - (pos.foot - 200) + 1); ctx.clip();
      env.drawFigure(ctx, e, { ...pos, foot: pos.foot + Math.sin(t * 1.7 + e.phase) * 0.8 }); ctx.restore();
      ctx.save(); ctx.strokeStyle = FOAM(); ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { const r = (t * 0.55 + i * 0.5 + e.phase) % 1; ctx.globalAlpha = 0.75 * (1 - r); ctx.beginPath(); ctx.ellipse(pos.x, sf + 1, 11 + r * 14, 2.2 + r * 1.4, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    },
  };

  // ---------- bob: something light floating on the water line (a ball), drifting a little ----------
  const bob = {
    pos(e, time, env) { const out = { x: e.x0 + Math.sin(time * 0.5 + e.phase) * (e.drift == null ? 10 : e.drift), foot: e.foot, face: 1, hop: 0 }, sf = env.surface(); if (sf != null) out.foot = sf; return out; },
    draw(ctx, e, pos, env) {
      const t = env.api.time, up = Math.sin(t * 2.1 + e.phase) * 1.6;
      ctx.save(); ctx.translate(pos.x, pos.foot + up + 1); ctx.rotate(Math.sin(t * 0.8 + e.phase) * 0.5); ctx.scale(0.8, 0.8); ctx.translate(0, -8); S().ICONS[e.item || 'ball'](ctx); ctx.restore();
      ctx.save(); ctx.strokeStyle = FOAM(); ctx.lineWidth = 1.4; const r = (t * 0.6 + e.phase) % 1; ctx.globalAlpha = 0.7 * (1 - r); ctx.beginPath(); ctx.ellipse(pos.x, pos.foot + 1, 9 + r * 10, 1.8 + r, 0, 0, TAU); ctx.stroke(); ctx.restore();
    },
  };

  // ---------- lecture: reads, lifts an arm now and then, a pointer stick towards the audience ----------
  const lecture = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, cyc = (t * 0.4 + e.phase) % 1, f = pos.face || e.face || 1, up = cyc > 0.62 && cyc < 0.88;
      env.drawFigure(ctx, e, pos);
      if (e.over) return;   // a scene reaction (the theft, the hand-over) needs both hands: the stick is put away
      // the stick lies in the hand on the audience side and points away from the body: down at the sand while he reads,
      // up and forward while he points, so it never crosses his face or chest
      const C = window.MimoCoast.cast, hl = C.hand(e, 'l'), hr = C.hand(e, 'r'), h = up ? (hr[1] <= hl[1] ? hr : hl) : (hr[0] * f >= hl[0] * f ? hr : hl);
      const high = h[1] < -0.62 * (e.top || 60), hx = pos.x + h[0], hy = pos.foot + h[1], a = (high ? -1.05 : up ? -0.75 : 0.62) + Math.sin(t * 0.9 + e.phase) * 0.05, len = 28;
      ctx.save(); ctx.strokeStyle = S().COL.woodDeep; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx - f * Math.cos(a) * 3, hy - Math.sin(a) * 3); ctx.lineTo(hx + f * Math.cos(a) * len, hy + Math.sin(a) * len); ctx.stroke();
      ctx.fillStyle = S().COL.red; ctx.beginPath(); ctx.arc(hx + f * Math.cos(a) * len, hy + Math.sin(a) * len, 1.4, 0, TAU); ctx.fill(); ctx.restore();
    },
  };

  // ---------- gullup: the gull raises a wing for a question, over and over, and nobody calls on it ----------
  const gullup = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, sd = S(), cyc = (t * 0.45 + e.phase) % 1, lift = cyc > 0.45 && cyc < 0.85 ? Math.sin((cyc - 0.45) / 0.4 * Math.PI) : 0;
      ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(e.scale || 1, e.scale || 1); sd.gull(ctx, t, { hop: 0, face: pos.face, blink: 1 });
      if (lift > 0.05) { ctx.scale(pos.face, 1); ctx.translate(-2, -10); ctx.rotate(-0.5 - lift * 0.9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, -12 * lift - 4, 5, -14 * lift - 6); ctx.quadraticCurveTo(6, -5, 3, 0); ctx.closePath(); sd.paint(ctx, sd.COL.grey, 0.35); }
      ctx.restore();
    },
  };

  // ---------- search: looks left and right with a "?" now and then (the owner who lost something) ----------
  const search = {
    pos(e, time, env) { const k = Math.floor(time * 0.6 + e.phase), out = { x: e.x0, foot: e.foot, face: k % 2 ? 1 : -1, hop: 0 }; out.hop = ((time * 0.6 + e.phase) % 1) < 0.12 ? 3 : 0; return out; },
    draw(ctx, e, pos, env) {
      env.drawFigure(ctx, e, pos);
      const t = env.api.time, c = (t * 0.6 + e.phase) % 1; if (c > 0.15 && c < 0.6) S().tag(ctx, '?', pos.x + pos.face * 12, pos.foot - e.top - 8 - c * 6, 0.1);
    },
  };

  // deep in clear water only a light veil of the sea colour lies on him (the game keeps the deep clear), no surface line
  const BURIED_WET = { DEPTH: 64, TOP: 0.16, DEEP: 0.3, LINE: 0 };
  // ---------- snorkelbury: buried up to the neck; the snorkel tube grows up to the water line as the tide comes in ----------
  const snorkelbury = {
    draw(ctx, e, pos, env) {
      const t = env.api.time, sf = env.surface(), hh = env.rigH(e.who), headTop = pos.foot - 0.48 * (hh - 8) * (e.scale || 1);
      const top = Math.min(headTop - 20, sf == null ? headTop - 20 : sf - 9), x = pos.x + 9, y0 = headTop + 13;
      // head, mound and tube in one picture: at high tide the part under the water is washed with its colour
      const paint = (g) => {
        env.drawBuried(g, e, pos);
        g.save(); g.strokeStyle = S().COL.orange; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y0 + 2); g.quadraticCurveTo(x, y0, x, y0 - 10); g.lineTo(x, top); g.stroke();
        g.strokeStyle = S().COL.red; g.lineWidth = 3.6; g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - 3.5); g.stroke(); g.restore();
      };
      const yTop = Math.min(headTop, top) - 12;
      window.MimoCoast.castDraw.drawWet(ctx, { x: pos.x - 48, y: yTop, w: 96, h: pos.foot + 14 - yTop }, sf != null && sf < pos.foot ? sf : null, pos.x, paint, BURIED_WET);
      ctx.save();
      if (sf != null && top + 12 > sf - 4) { // the tube reaches into the water: little bubbles run up it, a ring at the line
        ctx.fillStyle = FOAM(); for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 0.8 * (1 - k); ctx.beginPath(); ctx.arc(x + 4 + Math.sin(k * 8 + i) * 2, y0 - k * (y0 - top), 1.5, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.strokeStyle = FOAM(); ctx.lineWidth = 1.4; const r = (t * 0.6) % 1; ctx.globalAlpha = 0.7 * (1 - r); ctx.beginPath(); ctx.ellipse(x, sf + 1, 7 + r * 9, 1.6 + r, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    },
  };

  // ---------- tideprints: suction-cup prints in the mud, there only while the flat is dry (low tide) ----------
  const tideprints = {
    always: true,
    draw(ctx, e, pos, env) {
      const sf = env.surface(), api = env.api; if (sf == null || !env.onScreen(e.x0 + (e.n || 8) * (e.gap || 1.6) * T * 0.5, e.foot, (e.n || 8) * (e.gap || 1.6) * T)) return;
      const wet = clamp01((e.foot + 4 - sf) / 14); if (wet >= 1) return;
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - wet); ctx.fillStyle = api.mixHex ? api.mixHex(api.W.ground || '#F3DFB8', '#7A5A32', 0.5) : '#B08F5E'; ctx.strokeStyle = ctx.fillStyle;
      for (let i = 0; i < (e.n || 8); i++) {
        const x = e.x0 + i * (e.gap || 1.6) * T, y = e.foot - 1 + (i % 2 ? 1.5 : 0); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.4);
        ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
        for (let j = 0; j < 6; j++) { const a = j * TAU / 6 + i; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 2.8, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      ctx.restore();
    },
  };

  // ---------- dogpaddle: the dog paddles at the surface (head and back out of the water) and barks every few seconds ----------
  const dogpaddle = {
    pos(e, time, env) { const out = { x: e.x0 + Math.sin(time * 0.45 + e.phase) * (e.drift == null ? 14 : e.drift), foot: e.foot, face: Math.cos(time * 0.45 + e.phase) > 0 ? 1 : -1, hop: 0 }, sf = env.surface(); if (sf != null) out.foot = sf; return out; },
    draw(ctx, e, pos, env) {
      const t = env.api.time, sd = S(), sc = e.scale || 1, sf = pos.foot;
      window.MimoCoast.dogDraw(ctx, e, pos, 'paddle');
      ctx.save(); ctx.strokeStyle = FOAM(); ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { const r = (t * 0.7 + i * 0.5 + e.phase) % 1; ctx.globalAlpha = 0.7 * (1 - r); ctx.beginPath(); ctx.ellipse(pos.x, sf + 1, 18 * sc + r * 14, 2.4 + r * 1.4, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
      const c = (t * 0.3 + e.phase) % 1; if (c < 0.2) sd.tag(ctx, c < 0.1 ? 'Wuff!' : 'Wuff, wuff!', pos.x + pos.face * 14, sf - 40 * sc, 0.2);
    },
  };

  window.MimoCoast.acts = Object.assign(window.MimoCoast.acts || {}, { paddle, juggle, hop1, tick, call, work, grade, wade, bob, lecture, gullup, search, snorkelbury, tideprints, dogpaddle });
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
