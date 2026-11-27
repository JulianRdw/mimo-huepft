// World 4 cast pictures: what a cast entry's live figure does for each act (poseFor) and how it is drawn in each setting:
// standing or walking, buried in the sand, snorkelling, lying on a mattress, on a paddle board. Loaded after coast-cast.js;
// coast-story.js and the acts of coast-story-acts.js call these through storyEnv (drawFigure, drawBuried, rigAt, ...).
// Night and sunburn are a wash on the figure's pictures and colours (coast-rig-draw.js), never ctx.filter (iOS 15).
(function () {
  'use strict';
  window.MimoCoast = window.MimoCoast || {};
  const C = window.MimoCoast;
  let api = null;
  const TAU = Math.PI * 2, MARGIN = 8;
  const BURIED_SHOW = [1, 0.78, 0.6, 0.48], SNORKEL_SHOW = 0.42;
  const FACING = { grade: 1, lecture: 1, work: 1, juggle: 1, search: 0 };   // acts that keep the figure turned to its side
  const D = () => C.sdraw, E = () => C.storyEnv;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => k * k * (3 - 2 * k);

  // what the entry wants its figure to do now: { pose, poseOpts, face, amp, idle }
  function poseFor(e, near) {
    const t = api.time, face = e.face || 1, w = { pose: null, poseOpts: null, face: 0, amp: 0.3, idle: true };
    const side = () => { w.poseOpts = { dir: face }; w.face = face; };
    if (e.pose) w.pose = e.pose;
    if (FACING[e.act]) w.face = face;
    switch (e.act) {
      case 'wave': if (near) w.pose = 'wave'; break;
      case 'buried': if (near && !e.pose) w.pose = 'wave'; break;
      case 'pose': break;
      case 'grade': w.pose = 'write'; side(); break;
      case 'lecture': { const cyc = (t * 0.4 + e.phase) % 1; w.pose = cyc > 0.62 && cyc < 0.88 ? 'point' : null; w.idle = false; side(); break; }
      case 'work': w.pose = 'pat'; side(); break;
      case 'juggle': w.pose = 'kick'; w.face = 0; break;
      case 'hop1': w.pose = 'hop'; break;
      case 'snorkel': if (e.thumb) w.pose = 'thumb'; break;
      case 'search': { w.idle = false; const k = Math.floor(t * 0.6 + e.phase); e.lookDx = (k % 2 ? 1 : -1) * 90; break; }
      case 'paddle': {
        const s = e.pd || { st: 'on', t0: 0 }, p = api.p, dist = p ? Math.abs(p.x + p.w / 2 - e.x0) / 32 : 9;
        if (e.steady && p && p.x + p.w / 2 - e.x0 > 2 * 32) { w.pose = 'fan'; break; }
        if (s.st === 'fall') w.pose = 'flail'; else { w.pose = 'balance'; w.amp = 0.25 + Math.max(0, 1 - dist / 6) * 0.75; }
        break;
      }
      case 'call': if (e.cs && e.cs.ph === 1) w.pose = 'wave'; break;
      // the owner at the door (coast-handover.js): looks around while searching; everything else comes as e.over
      case 'owner': if (e.mood === 'search' && e.ownT != null && e.ownT > 0) { w.idle = false; e.lookDx = (Math.floor(t * 0.7) % 2 ? 1 : -1) * 90; }
        if (e.baseAct && (e.mood === 'idle' || e.mood === 'search')) return poseFor({ ...e, act: e.baseAct }, near);
        break;
      default: break;
    }
    if (e.frozen) { w.pose = null; w.idle = false; w.amp = 0; if (e.turnTo) w.face = e.turnTo; }   // 'Essen ist fertig!': stock-still, then turned
    if (e.mv && e.pos && e.pos.running) { w.pose = null; w.face = 0; w.idle = false; }
    if (e.pos && e.pos.still) w.still = true;
    if (e.pose && !w.pose) w.pose = e.pose;
    if (e.pose && e.poseOpts) w.poseOpts = e.poseOpts;
    // the filmer films Mimo while he is near (reaction layer, coast-cast.js)
    if (e.filmDir && !e.over && !(e.mv && e.pos && e.pos.running)) { w.pose = 'cam'; w.face = e.filmDir; w.poseOpts = null; w.idle = false; }
    // a scene reaction (MimoCoast.scene.hold) wins over the act: pointing, writing, a hug
    if (e.over && !(e.mv && e.pos && e.pos.running)) { w.pose = e.over.pose; w.poseOpts = e.over.opts || null; w.idle = false; if (e.over.opts && e.over.opts.dir) w.face = e.over.opts.dir; }
    return w;
  }

  const FADE_IN = 0.22;   // s: a figure whose pictures arrive late fades in instead of popping up
  const tintOf = (e) => ({ red: (e && e.red) | 0, night: E().night | 0 });
  // draw the entry's figure with its feet at (x, y) in the current coordinates; scale from the entry
  function rigAt(ctx, e, x, y, o) {
    const p = e.pp; if (!p) return;
    const t = tintOf(e), fade = e.ppT == null ? 1 : Math.min(1, (api.time - e.ppT) / FADE_IN);
    if (fade < 1) { ctx.save(); ctx.globalAlpha *= Math.max(0, fade); }
    p.draw(ctx, x, y, { scale: (o && o.scale) || e.scale || 1, red: t.red, night: t.night, noShadow: !!(o && o.noShadow) });
    if (fade < 1) ctx.restore();
  }
  // a jolt (the double take of MimoCoast.scene) lifts the figure a little for a moment
  const joltOf = (e) => { const k = e.jolt == null ? 1 : (api.time - e.jolt) / 0.28; return k >= 0 && k < 1 ? Math.sin(k * Math.PI) * 5 : 0; };
  // the copied jump: up in an arc, then down on the bottom for a moment, tipped back, and up again
  function copyOf(e) {
    const k = e.copyT == null ? -1 : api.time - e.copyT;
    if (k < 0 || k > 1.7) return null;
    if (k < 0.48) return { up: Math.sin(k / 0.48 * Math.PI) * 22, sit: 0, rot: 0 };
    const s = k < 1.35 ? 1 : 1 - (k - 1.35) / 0.35;
    return { up: 0, sit: 14 * s, rot: -0.22 * s * (e.face || 1) };
  }
  function drawFigure(ctx, e, pos) {
    const c = copyOf(e), y = pos.foot - (pos.hop || 0) - joltOf(e);
    if (!c) { rigAt(ctx, e, pos.x, y); return; }
    ctx.save(); if (c.sit) { ctx.beginPath(); ctx.rect(pos.x - 80, pos.foot - 200, 160, 201); ctx.clip(); }
    ctx.translate(pos.x, y + c.sit - c.up); ctx.rotate(c.rot); rigAt(ctx, e, 0, 0, { noShadow: c.up > 2 || c.sit > 0 }); ctx.restore();
    if (c.sit) { ctx.save(); ctx.fillStyle = (api.W && api.W.groundDot) || '#E3CB9C'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(pos.x, pos.foot, 16, 4, 0, Math.PI, 0); ctx.fill(); ctx.restore(); }
  }

  // buried up to depth: the lower part of the figure hidden below the ground line, a mound in front
  function drawBuried(ctx, e, pos) {
    const d = Math.max(1, Math.min(3, e.depth | 0 || 1)), v = BURIED_SHOW[d], s = e.scale, bh = e.pp ? e.pp.rig.size[1] - MARGIN : 56;
    ctx.save(); ctx.translate(pos.x, pos.foot);
    if (e.pp) {
      ctx.save(); ctx.beginPath(); ctx.rect(-70, -220, 140, 220); ctx.clip();
      rigAt(ctx, e, 0, (1 - v) * bh * s + Math.sin(api.time * 1.5 + e.phase) * 0.4, { noShadow: true }); ctx.restore();
    }
    D().mound(ctx, 38 + d * 6, 5 + d * 1.5); ctx.restore();
  }

  // a figure standing in the water: paint(g) draws it in world coordinates onto a scratch canvas; everything below the
  // wave line at cx is washed with the water colour, a little at the line and almost fully WET.DEPTH px further down, so
  // the body fades into the sea instead of ending at a hard edge; a thin light line marks where it meets the surface
  // the height of the wave line at x (0 off the coast module): floating things ride it instead of a bob of their own
  const waveAt = (x) => (C.wave ? C.wave(x, api.time) : 0);
  const WET = { DEPTH: 30, TOP: 0.32, DEEP: 0.9, LINE: 0.45 };
  const wetPad = { cv: null, g: null };
  const hexA = (h, a) => { const n = parseInt(String(h).slice(1, 7), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
  function drawWet(ctx, box, sf, cx, paint, o) {
    const q = o ? { ...WET, ...o } : WET;
    if (sf == null) { paint(ctx); return; }
    const line = sf + (C.wave ? C.wave(cx, api.time) : 0);
    if (line >= box.y + box.h) { paint(ctx); return; }
    const m = ctx.getTransform ? ctx.getTransform() : null, k = Math.max(1, Math.min(3, m ? Math.hypot(m.a, m.b) : 2));
    const w = Math.ceil(box.w * k), h = Math.ceil(box.h * k);
    if (!wetPad.cv) { wetPad.cv = document.createElement('canvas'); wetPad.g = wetPad.cv.getContext('2d'); }
    const cv = wetPad.cv, g = wetPad.g;
    if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
    g.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
    g.save(); g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip(); paint(g); g.restore();
    const wc = C.waterCols ? C.waterCols() : { top: '#79CCDA', deep: '#3F8DBA' }, grd = g.createLinearGradient(0, line, 0, line + q.DEPTH);
    grd.addColorStop(0, hexA(wc.top, q.TOP)); grd.addColorStop(1, hexA(wc.deep, q.DEEP));
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = grd; g.fillRect(box.x, line, box.w, box.y + box.h - line);
    g.fillStyle = hexA((api.W && api.W.foam) || '#FFFFFF', q.LINE); g.fillRect(box.x, line - 0.8, box.w, 1.6);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(cv, 0, 0, w, h, box.x, box.y, box.w, box.h);
  }

  // the head above the water line with mask and snorkel, a thumb up beside it
  function drawSnorkel(ctx, e, pos) {
    const t = api.time, v = SNORKEL_SHOW, s = e.scale, bob = waveAt(pos.x) + Math.sin(t * 1.7 + e.phase) * 0.6, rig = e.pp && e.pp.rig;
    const bh = (rig ? rig.size[1] : 63) - MARGIN, headTop = -v * bh * s;
    if (rig) { // the body hangs in the water below the head and fades into it
      const y0 = pos.foot + bob;
      drawWet(ctx, { x: pos.x - 44, y: y0 - 90, w: 88, h: 90 + WET.DEPTH + 2 }, pos.foot, pos.x, (g) => rigAt(g, e, pos.x, y0 + (1 - v) * bh * s, { noShadow: true }));
    }
    ctx.save(); ctx.translate(pos.x, pos.foot + bob);
    const D_ = D().COL, f = pos.face, eyeY = headTop + ((rig ? rig.headCenter[1] : 22) - MARGIN - 1) * s;
    if (!e.noSnorkel) {
      ctx.strokeStyle = D_.orange; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 8, eyeY + 7); ctx.quadraticCurveTo(f * 17, eyeY + 4, f * 16, eyeY - 16); ctx.stroke();
      ctx.strokeStyle = D_.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * 16, eyeY - 16); ctx.lineTo(f * 16, eyeY - 19); ctx.stroke();
    } else { // without the snorkel: bubbles from the mouth now and then
      ctx.fillStyle = (api.W && api.W.foam) || '#FFFFFF'; for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; ctx.globalAlpha = 0.85 * (1 - k); ctx.beginPath(); ctx.arc(f * 4 + Math.sin(k * 9 + i) * 2, eyeY + 8 - k * 26, 1.6 + i * 0.4, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    }
    if (e.thumb && e.pp) thumbUp(ctx, e, s);
    ctx.beginPath(); api.rr(-10, eyeY - 4, 20, 9, 4); ctx.fillStyle = 'rgba(158,211,238,0.55)'; ctx.fill(); ctx.strokeStyle = D_.pink; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = (api.W && api.W.foam) || '#FFFFFF'; ctx.lineWidth = 1.5;
    const rp = (t * 0.6 + e.phase) % 1; ctx.beginPath(); ctx.ellipse(0, 0, 16 + rp * 8, 2.4 + rp, 0, 0, TAU); ctx.globalAlpha = 0.75 * (1 - rp); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();
  }

  // a thumb up big enough to read on a phone: a fist with the thumb, at the raised hand (snorkeller)
  function thumbUp(ctx, e, s) {
    const h = e.pp.hand('r', s), t = api.time, wob = Math.sin(t * 3 + e.phase) * 0.12;
    ctx.save(); ctx.translate(h[0] + (1 - SNORKEL_SHOW) * 0, h[1] + (1 - SNORKEL_SHOW) * ((e.pp.rig.size[1] - MARGIN) * s) - 4); ctx.rotate(wob); ctx.scale(1.55, 1.55);
    const skin = (e.pp.rig.colors && e.pp.rig.colors.skin && (e.pp.rig.colors.skin.base || e.pp.rig.colors.skin.fill)) || '#F6CDB0';
    ctx.fillStyle = skin; ctx.strokeStyle = (e.pp.rig.colors && e.pp.rig.colors.skin && e.pp.rig.colors.skin.line) || D().ink(); ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the thumb stands up on the fist (a capsule), the fist over its foot, the curled fingers across it
    ctx.beginPath(); ctx.moveTo(-2.5, -2); ctx.lineTo(-2.5, -8); ctx.arc(0, -8, 2.5, Math.PI, 0); ctx.lineTo(2.5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 4.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-1.9, -3, 3.8, 3.4);
    ctx.lineWidth = 0.7; ctx.beginPath(); for (const fy of [-1, 1, 2.9]) { ctx.moveTo(4.6, fy); ctx.quadraticCurveTo(1.5, fy + 0.7, -3.6, fy + 0.3); } ctx.stroke();
    ctx.restore();
  }

  // asleep on an air mattress: lying on the back, the chest rising and falling, the sunburn from e.red
  // figureOnly: just the sleeper, without mattress and shadow (the ink splotches are clipped to him, coast-story-acts2.js)
  function drawFloat(ctx, e, pos, figureOnly) {
    // the mattress rides the wave line: its height and tilt follow the waves under its two ends
    const sf = C.surface ? C.surface() : null, wet = sf != null && Math.abs(pos.foot - sf) < 1;   // on the sand (opening, closing) it lies still
    const t = api.time, wl = wet ? waveAt(pos.x - 30) : 0, wr = wet ? waveAt(pos.x + 30) : 0, bob = (wl + wr) / 2 + Math.sin(t * 1.3 + e.phase) * (wet ? 0.6 : 1.8), tilt = wet ? Math.atan2(wr - wl, 60) * 0.8 : Math.sin(t * 0.9 + e.phase) * 0.035;
    if (!figureOnly && wet && C.wave) { // soft rings spread from both ends
      ctx.save(); ctx.strokeStyle = (api.W && api.W.foam) || '#FFFFFF'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 2; i++) { const r = (t * 0.45 + i * 0.5 + e.phase) % 1; ctx.globalAlpha = 0.55 * (1 - r); ctx.beginPath(); ctx.ellipse(pos.x + (i ? 34 : -34), pos.foot + bob + 1, 8 + r * 16, 1.6 + r * 1.2, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(pos.x, pos.foot - 3 + bob); ctx.rotate(tilt);
    if (e.shadow && !figureOnly) { ctx.fillStyle = 'rgba(40,60,110,0.16)'; ctx.beginPath(); ctx.ellipse(0, 30 + 6 * Math.sin(t * 0.7), 42, 7, 0, 0, TAU); ctx.fill(); }
    if (!figureOnly) D().PROPS.mattress(ctx, t, e);
    if (e.pp && C.sleeper) {   // head on the pillow, the body under a towel (coast-sleeper.js); e.awake lifts him up
      e.pp.fig.asleep = !e.awake && !(e.wakeK > 0);
      C.sleeper.drawTowel(ctx, e, rigAt, { t, wake: e.wakeK || 0, figureOnly });
      e.pp.fig.asleep = false;
    }
    ctx.restore();
  }

  // on the paddle board: standing, thrown off (the figure tips over backwards), in the water (head and shoulders), climbing back
  const FALL_FROM = 0.75, WET_UNTIL = 3.6, BACK_UNTIL = 4.6;
  function drawPaddle(ctx, e, pos) {
    const t = api.time, s = e.pd || { st: 'on', t0: 0 }, d = t - s.t0, sd = D(), sc = e.scale || 1;
    const p = api.p, dist = p ? Math.abs(p.x + p.w / 2 - e.x0) / 32 : 9, wob = s.st === 'on' ? Math.sin(t * 9) * Math.max(0, 1 - dist / 6) * 0.12 : 0;
    ctx.save(); ctx.translate(pos.x, pos.foot); ctx.scale(e.face || 1, 1);
    ctx.save(); ctx.translate(0, -4 + Math.sin(t * 1.4 + e.phase) * 1.2); ctx.rotate(wob * 0.4); sd.PROPS.board(ctx, t, e); ctx.restore();
    if (e.pp) {
      if (s.st === 'on' || (s.st === 'fall' && d < FALL_FROM)) {
        const k = s.st === 'fall' ? d / FALL_FROM : 0;
        ctx.save(); ctx.translate(-6 + k * 26, -10 + k * k * 22); ctx.rotate(wob + k * k * 1.4);
        rigAt(ctx, e, 0, 0, { noShadow: true, scale: sc }); ctx.restore();
      } else {
        const climb = s.st === 'fall' ? 0 : clamp01((d - WET_UNTIL) / (BACK_UNTIL - WET_UNTIL)), bh = e.pp.rig.size[1] - MARGIN, sunk = 0.62 * bh * sc * (1 - ease(climb));
        ctx.save(); ctx.translate(26 - climb * 32, 0); ctx.beginPath(); ctx.rect(-60, -220, 120, 222); ctx.clip();
        ctx.translate(0, sunk + Math.sin(t * 3 + e.phase) * 1.4);
        rigAt(ctx, e, 0, 0, { noShadow: true, scale: sc }); ctx.restore();
        if (climb < 1) {
          ctx.strokeStyle = (api.W && api.W.foam) || '#FFFFFF'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 2; i++) { const r = ((t * 0.7 + i * 0.5) % 1); ctx.globalAlpha = 0.7 * (1 - r); ctx.beginPath(); ctx.ellipse(26 - climb * 32, 1, 14 + r * 12, 2.4 + r * 1.4, 0, 0, TAU); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
  }

  Object.assign(C, { castDraw: { poseFor, rigAt, drawFigure, drawBuried, drawSnorkel, drawFloat, drawPaddle, drawWet } });
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; } });
})();
