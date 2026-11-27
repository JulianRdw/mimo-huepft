// World 5: Fauch, the dragon, as a cast figure of the levels: `{ who: 'fauch', act, x, y, ... }` in a level's `cast`.
// Each act is ONE Fauch moment of a level: it waits until Mimo passes its trigger, then it is a beat of the story director
// (coast-director.js, priority of a theft), so it never runs at the same time as a line of the family. Every act has a lead-in
// (something small that makes the player look) before the big thing, and is drawn big enough to read from far.
// Pure decoration and deterministic: positions come from api.time, the camera at the start of the beat and Mimo's place,
// nothing touches the physics (a shake only moves the picture), so the level bots replay exactly.
//
// Fields of every act (tiles like `cast`: y is the row the dragon stands IN, his feet at (y + 1) * 32):
//   at     the tile column Mimo's centre has to pass (to the right; atDir: -1 to the left). Default x - 7.
//   atRow  instead or as well: Mimo's feet are at or above this row (a climb)
//   then   [{ by: 'player' | tag, text }]  lines after the moment, one after another (Mimo: "Was war das?")
//   with   [op, ...]  scene ops (volcano-skit.js) run when the moment begins, inside the same beat: a figure that reacts to it
//          while it happens (45: Lotta chases the shadow, ['later', s, [['go', tag]]]). Looks only, no bubble
//   pop    a comic word at the climax (default by act, false = none)
//   scale, face (-1 looks left), layer ('back' | 'mid' | 'front', default by act), wait (s it may wait for the stage, default 25)
// The acts (lead-in · moment · afterwards):
//   smokering  a puff up at the summit side · a smoke ring drifts down to tile x, y and falls apart, a second small one follows
//   shadow     the light dims, wind · his shadow sweeps over the whole view (height: row y) · light comes back
//   perch      he sits on the rock at x, y from the start, dozing · eyes open, he leans and looks at Mimo, blinks, puffs ·
//              keeps watching Mimo and blinking. leave: tile x Mimo passes, then he takes off and flies away
//   flyby      wind streaks, a rumble · he crosses the view at row y (dir 1 left to right). under: [x0, x1] tiles: the picture
//              shakes when he passes under that bridge
//   roar       pebbles on row y round x tremble · "ROOAAR!" far up towards the summit, a small shake, ash trickles.
//              organ: true | 'text': the basalt columns in view answer like organ pipes (notes rise), then a chord word
//   land       a shadow grows on the spot · he swoops in and lands on x, y (a roof, a cairn), dust, shake · folds his wings, looks
//              round, then sits. stay: seconds until he flies off again (default: stays)
//   drink      he sits beside the lava fall at x, y · lowers the head into the stream, "Schlürf!", lifts it, a smoke ring "Hicks!";
//              he keeps sitting there. A scene step ['fx', 'hicks', tag] lets him hiccup once more later
//   eye        a warm glow in the dark at x, y · one huge eye opens, follows Mimo, blinks, closes (layer back: seen through a gap).
//              shutRow: it closes at once when Mimo's feet rise above that row (so it never watches him ride on up)
//   throw      he sits at x, y and rears up · spits glowing rocks in arcs onto the cells `to: [[x, y], ...]` (decoration only;
//              they glow there afterwards)
//   (more acts: brood, sleepwith, wave, ringout in volcano-fauch-acts.js; manual: true = only started by a scene step)
//   circle     wind · he circles over the nest at x, y (radius r tiles, default 5) and keeps circling
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, DIR = () => window.MimoCoast.director, FD = () => window.MimoVolcano.fauchDraw;
  const clamp = (k) => Math.max(0, Math.min(1, k));
  const seg = (k, a, b) => clamp((k - a) / (b - a));
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const px = (e) => e.x0, foot = (e) => e.foot, tile = (e) => e.x0 / T - 0.5;   // the story engine keeps x0 and foot in px
  const mimo = () => { const p = api.p; return p ? { x: p.x + p.w / 2, y: p.y + p.h } : { x: 0, y: 0 }; };
  const view = () => ({ x: api.cam.x, y: api.cam.y, w: api.view.w, h: api.view.h });
  const inView = (x, y, m) => { const v = view(); return x > v.x + m && x < v.x + v.w - m && y > v.y + m && y < v.y + v.h - m * 0.5; };
  const blinkAt = (t, ph) => { const q = (t + ph) % 3.7; return q < 0.14 ? Math.sin(q / 0.14 * Math.PI) : 0; };
  const lookAt = (e, x) => { const d = mimo().x - x; return Math.max(-1, Math.min(1, d / 160)) * (e.face || 1); };

  // a silhouette (shadow): drawn once in one colour on its own canvas, then laid down with one alpha (no darker overlaps)
  let sil = null;
  function silhouette(ctx, x, y, s, t, a, face) {
    if (typeof document === 'undefined') return;
    if (!sil) { sil = document.createElement('canvas'); sil.width = 420; sil.height = 260; }
    const c = sil.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 420, 260); c.translate(230, 150);
    FD().fly(c, t, { mono: '#2E2540', flap: 0.7, face });
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.drawImage(sil, -230, -150); ctx.restore();
  }
  function wind(ctx, k, dir, a) {   // streaks across the view
    const v = view(); ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const q = (k * 1.6 + i * 0.37) % 1, y = v.y + v.h * (0.15 + 0.1 * i), x = dir > 0 ? v.x + v.w * q : v.x + v.w * (1 - q); ctx.globalAlpha = a * Math.sin(q * Math.PI) * 0.55; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * 46, y + 2); ctx.stroke(); }
    ctx.restore();
  }
  // the ground top under a world x, searched from about the height y down (null: none within 5 rows)
  function groundAt(x, y) { const tx = Math.floor(x / T); for (let ty = Math.floor((y - 4) / T); ty < Math.floor(y / T) + 5; ty++) if (api.isSolid(tx, ty)) return ty * T; return null; }
  const groundY = (e) => { const m = mimo(), g = groundAt(m.x, m.y); return g == null ? m.y : g; };
  const pop = (x, y, text, size) => { if (text) C().pop(x, y, text, { size: size || 28, fill: '#F28C82' }); };
  const shake = (k) => api.shake(k);
  const rumble = (vol) => api.noise({ lp: 180, dur: 1.4, vol: vol || 0.06, attack: 0.3 });

  // roar with organ: true (or a text for the chord): every basalt column top in view answers like an organ pipe, notes rise
  function organTops() {
    const v = view(), id = api.tileId(5, 'I'), out = [];
    for (let tx = Math.floor(v.x / T); tx <= Math.floor((v.x + v.w) / T) && out.length < 40; tx++) {
      for (let ty = Math.max(1, Math.floor(v.y / T)); ty <= Math.floor((v.y + v.h) / T); ty++) if (api.tileAt(tx, ty) === id && api.tileAt(tx, ty - 1) !== id) { out.push({ x: tx * T + T / 2, y: ty * T, n: out.length }); break; }
    }
    return out;
  }
  function drawOrganNotes(ctx, pipes, k) {
    if (k < 1.5 || k > 5) return;
    ctx.save(); ctx.lineWidth = 2.2;
    for (const p of pipes) for (let j = 0; j < 2; j++) {
      const q = seg(k, 1.5 + ((p.n * 0.13 + j * 0.9) % 1.3), 3.6 + ((p.n * 0.13 + j * 0.9) % 1.3)); if (q <= 0 || q >= 1) continue;
      const x = p.x + Math.sin(k * 5 + p.n + j * 2) * 7, y = p.y - 8 - q * 70;
      ctx.globalAlpha = Math.sin(q * Math.PI); ctx.fillStyle = ctx.strokeStyle = j ? '#FFE9A8' : '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(x, y, 5.5, 4, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 4.5, y - 1); ctx.lineTo(x + 4.5, y - 17); ctx.quadraticCurveTo(x + 11, y - 14, x + 12, y - 7); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- the acts: len (s the beat holds), layer, draw(ctx, e, k) with k = seconds since the moment (null: not yet) ----------
  const ACTS = {
    smokering: {
      len: 8.6, layer: 'mid',
      begin() { api.noise({ lp: 260, dur: 0.6, vol: 0.03 }); },
      // the ring comes from the summit side of the sky (screen space) down to Mimo's head, then falls apart round him
      draw(ctx, e, k) {
        if (k == null || k > 10.5) return;
        const v = view(), m = mimo(), f = { x: v.x + v.w * 0.86, y: v.y + 26 }, to = { x: m.x + 6, y: m.y - 64 };
        if (k < 1.4) { const a = Math.sin(seg(k, 0, 1.4) * Math.PI); ctx.save(); ctx.fillStyle = '#B9B3C9'; ctx.globalAlpha = a * 0.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.x + i * 9 - 9, f.y - k * 8 - i * 4, 7 + k * 4, 0, TAU); ctx.fill(); } ctx.restore(); }
        for (const [d, sc] of [[0, 1], [1.7, 0.55]]) {
          const q = seg(k, 1.1 + d, 7.4 + d); if (q <= 0) continue;
          const brk = seg(k, 7.4 + d, 8.8 + d); if (brk >= 1) continue;
          const x = lerp(f.x, to.x, ease(q)) + Math.sin(k * 1.4) * 14 * (1 - q), y = lerp(f.y, to.y - d * 30, q), r = lerp(14, 56, q) * sc;
          ctx.save(); ctx.translate(x, y);
          if (brk <= 0) FD().ring(ctx, r, 0.85, api.time);
          else { ctx.fillStyle = '#C9C3D6'; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.globalAlpha = 0.7 * (1 - brk); ctx.beginPath(); ctx.arc(Math.cos(a) * r * (1 + brk * 0.8), Math.sin(a) * r * 0.42 * (1 + brk * 0.8) - brk * 10, 6 * sc * (1 - brk * 0.4), 0, TAU); ctx.fill(); } }
          ctx.restore();
        }
      },
      at(e, k) { if (k > 6.6 && !e.scared) { e.scared = true; api.setMood('look', 2.2); } },
    },
    shadow: {
      len: 4.6, layer: 'front',
      begin() { api.noise({ lp: 500, dur: 2.6, vol: 0.05, attack: 0.9 }); },
      draw(ctx, e, k) {
        if (k == null || k > 4.6) return;
        const v = view(), dim = Math.min(seg(k, 0, 1), 1 - seg(k, 3.6, 4.6)) * 0.22;
        ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = dim; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, v.h + 20); ctx.restore();
        if (k < 1.2) wind(ctx, k, 1, seg(k, 0, 1));
        const q = seg(k, 1.0, 3.6); if (q <= 0 || q >= 1) return;
        const x = v.x + lerp(-330, v.w + 330, q), y = v.y + v.h * 0.36 + Math.sin(q * Math.PI) * 24, gy = groundY(e);
        silhouette(ctx, x, y, e.scale || 2.4, api.time, 0.46, 1);
        ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.ellipse(x + 20, gy - 2, 150, 11, 0, 0, TAU); ctx.fill(); ctx.restore();
      },
      at(e, k) { if (k > 2.2 && !e.scared) { e.scared = true; api.setMood('scared', 0.9); } },
    },
    perch: {
      len: 5.2, layer: 'mid', visible: true,
      draw(ctx, e, k) {
        const t = api.time, x = px(e), f = foot(e), lk = lookAt(e, x);
        let o;
        if (k == null) o = { blink: 1, sleepy: 1, tail: 0.15 };   // dozing
        else if (e.goneAt != null) {
          const q = seg(t, e.goneAt, e.goneAt + 2.4); if (q >= 1) return;
          ctx.save(); ctx.translate(x + q * 260 * (e.face || 1), f - 70 - q * 300); FD().fly(ctx, t, { face: e.face || 1, scale: (e.scale || 0.8) * 1.1, flap: 2, legs: 1 - q }); ctx.restore(); return;
        } else {
          const wake = seg(k, 1.0, 1.25), lean = ease(seg(k, 1.4, 2.4));
          o = { blink: k < 1.0 ? 1 : 1 - wake + Math.max(blinkAt(k, 0.6) * (k > 2.4 ? 1 : 0), 0), look: lk * lean, lean: 0.6 * lean, puff: k > 3.6 && k < 5 ? 1 : 0, tail: 0.5 };
          if (k > 5.2) o.blink = blinkAt(t, e.x * 0.3);
        }
        ctx.save(); ctx.translate(x, f); FD().sit(ctx, t, { ...o, face: e.face || 1, scale: e.scale || 0.8 }); ctx.restore();
      },
      at(e, k) {
        if (k > 1.0 && !e.woke) { e.woke = true; pop(px(e) + 30 * (e.face || 1), foot(e) - 130 * (e.scale || 0.8), '!', 26); }
        if (k > 3.6 && !e.huffed) { e.huffed = true; pop(px(e) + 40 * (e.face || 1), foot(e) - 110 * (e.scale || 0.8), e.pop === false ? null : e.pop || 'Hmpf.', 20); }
        if (e.leave != null && e.goneAt == null && k > 5.2 && mimo().x >= (e.leave + 0.5) * T) { e.goneAt = api.time; shake(0.2); }
      },
    },
    flyby: {
      len: 3.9, layer: 'front',
      begin() { rumble(0.05); },
      draw(ctx, e, k) {
        if (k == null || k > 3.9) return;
        const d = e.dir || 1; if (k < 1.1) wind(ctx, k, d, seg(k, 0, 0.9));
        const q = seg(k, 0.9, 3.5); if (q <= 0 || q >= 1) return;
        const v = view(), x = v.x + (d > 0 ? lerp(-260, v.w + 260, q) : lerp(v.w + 260, -260, q)), y = (e.y + 0.5) * T + Math.sin(q * TAU) * 14;
        ctx.save(); ctx.translate(x, y); FD().fly(ctx, api.time, { face: d, scale: e.scale || 1.2, flap: 1.8, open: q > 0.35 && q < 0.6 ? 1 : 0 }); ctx.restore();
        if (e.under && !e.shook && x * d >= ((e.under[0] + e.under[1]) / 2 + 0.5) * T * d) { e.shook = true; shake(0.35); }
      },
      at(e, k) { if (k > 1.6 && !e.scared) { e.scared = true; api.setMood('scared', 0.9); const v = view(); pop(v.x + v.w * 0.5, v.y + v.h * 0.22, e.pop === false ? null : e.pop || 'FAUCH!', 30); } },
    },
    roar: {
      len: 3.8, layer: 'mid',
      begin(e) { const m = mimo(); e.rocks = [0, 1, 2, 3, 4, 5, 6].map((i) => { const x = m.x + (i - 3) * 30 + Math.sin(i * 3.1) * 8; return { x, y: groundAt(x, m.y) }; }); if (e.organ) e.pipes = organTops(); },
      draw(ctx, e, k) {
        if (k == null || k > 5) return;
        const shakeK = Math.min(seg(k, 0, 1.4), 1 - seg(k, 3.0, 3.8));
        if (e.pipes) drawOrganNotes(ctx, e.pipes, k);
        ctx.save();
        for (let i = 0; i < 7; i++) {
          const r = e.rocks && e.rocks[i]; if (!r || r.y == null) continue;
          const x = r.x, base = r.y, hop = k > 1.4 && k < 3.0 ? Math.abs(Math.sin(k * 14 + i)) * 5 : 0, j = Math.sin(api.time * 40 + i) * 1.6 * shakeK;
          ctx.fillStyle = i % 2 ? '#7D7290' : '#A79CBB'; ctx.beginPath(); ctx.ellipse(x + j, base - 4 - hop, 6 + (i % 3) * 1.5, 4.4, 0, 0, TAU); ctx.fill();
        }
        if (k > 1.4 && k < 4.2) { const v = view(); ctx.fillStyle = '#8E8CA3'; for (let i = 0; i < 14; i++) { const q = ((k - 1.4) * 0.6 + i * 0.13) % 1; ctx.globalAlpha = 0.5 * (1 - q); ctx.beginPath(); ctx.arc(v.x + ((i * 97) % v.w), v.y + q * v.h * 0.8, 1.6, 0, TAU); ctx.fill(); } }
        ctx.restore();
      },
      at(e, k) {
        if (k > 0.1 && !e.rum) { e.rum = true; rumble(0.07); }
        if (k > 1.4 && !e.roared) { e.roared = true; const v = view(); pop(v.x + v.w * 0.62, v.y + v.h * 0.36, e.pop === false ? null : e.pop || 'ROOOAAAR!', 38); shake(0.35); api.setMood('scared', 1.0); }
        if (e.organ && k > 2.3 && !e.chord) { e.chord = true; const v = view(); pop(v.x + v.w * 0.72, v.y + v.h * 0.64, typeof e.organ === 'string' ? e.organ : 'DÖÖÖÖM!', 34); shake(0.2); }
      },
    },
    land: {
      len: 4.6, layer: 'mid', visible: true,
      begin(e) { rumble(0.04); },
      draw(ctx, e, k) {
        if (k == null) return;
        const t = api.time, x = px(e), f = foot(e), s = e.scale || 1, d = e.face || 1;
        if (e.stay != null && k > 4.6 + e.stay) { const q = seg(k, 4.6 + e.stay, 7 + e.stay); if (q >= 1) return; ctx.save(); ctx.translate(x + q * 300 * d, f - 60 * s - q * 320); FD().fly(ctx, t, { face: d, scale: s, flap: 2, legs: 1 - q }); ctx.restore(); return; }
        if (k < 2.4) {
          const sh = seg(k, 0, 2.4); ctx.save(); ctx.fillStyle = '#2E2540'; ctx.globalAlpha = 0.25 * sh; ctx.beginPath(); ctx.ellipse(x, f - 1, 20 + 40 * sh, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
          const q = seg(k, 1.0, 2.4); if (q <= 0) return;
          ctx.save(); ctx.translate(lerp(x - 300 * d, x, ease(q)), lerp(f - 260, f - 54 * s, ease(q))); FD().fly(ctx, t, { face: d, scale: s, flap: 2.2, legs: seg(q, 0.5, 1) }); ctx.restore(); return;
        }
        const fold = 1 - ease(seg(k, 2.4, 3.6)), lk = k < 4.6 ? Math.sin((k - 2.4) * 2.2) : lookAt(e, x);
        ctx.save(); ctx.translate(x, f); FD().sit(ctx, t, { face: d, scale: s, wings: fold, look: lk, blink: blinkAt(t, 1.3), puff: k > 3.4 && k < 4.6 ? 1 : 0 }); ctx.restore();
      },
      at(e, k) { if (k > 2.4 && !e.landed) { e.landed = true; shake(0.3); api.burst(px(e), foot(e), 14, ['#B9B3C9', '#8E8CA3'], 110, { grav: 300, life: 0.6 }); pop(px(e), foot(e) - 120 * (e.scale || 1), e.pop === false ? null : e.pop || 'RUMMS!', 26); api.setMood('scared', 0.7); } },
    },
    drink: {
      len: 5.4, layer: 'mid', visible: true,
      draw(ctx, e, k) {
        const t = api.time, x = px(e), f = foot(e), s = e.scale || 1;
        const sip = k == null ? 0 : Math.min(ease(seg(k, 0.3, 1.3)), 1 - ease(seg(k, 3.4, 4.2)));
        ctx.save(); ctx.translate(x, f); FD().sit(ctx, t, { face: e.face || 1, scale: s, drink: sip, blink: sip > 0.5 ? 1 : blinkAt(t, 0.7), look: lookAt(e, x) * (1 - sip), puff: k != null && k > 4.2 && k < 5.4 ? 1 : 0 }); ctx.restore();
        if (k != null && k > 4.4 && k < 7.4) { ctx.save(); ctx.translate(x + 60 * s * (e.face || 1), f - 150 * s - (k - 4.4) * 30); FD().ring(ctx, 14 + (k - 4.4) * 8, 0.8 * (1 - seg(k, 6, 7.4)), t); ctx.restore(); }
      },
      at(e, k) {
        if (k > 1.5 && !e.slurp) { e.slurp = true; pop(px(e) + 50 * (e.face || 1), foot(e) - 60 * (e.scale || 1), 'Schlürf!', 22); }
        if (k > 4.4 && !e.hic) { e.hic = true; pop(px(e) + 40 * (e.face || 1), foot(e) - 170 * (e.scale || 1), e.pop === false ? null : e.pop || 'Hicks!', 24); }
      },
    },
    eye: {
      len: 6.2, layer: 'back',
      draw(ctx, e, k) {
        if (k == null || k > 6.4) return;
        const x = px(e), y = (e.y + 0.5) * T, m = mimo(), shut = e.shutAt == null ? 0 : ease(seg(api.time, e.shutAt, e.shutAt + 0.45));
        const open = Math.min(ease(seg(k, 1.2, 2.0)), 1 - ease(seg(k, 5.0, 5.8))) * (1 - blinkAt(k, 0.4) * (k > 3 ? 1 : 0)) * (1 - shut);
        const glow = Math.min(seg(k, 0, 1.2), 1 - seg(k, 5.4, 6.2)) * (1 - shut * 0.8);
        if (shut >= 1 && glow <= 0.01) return;
        const lk = [Math.max(-1, Math.min(1, (m.x - x) / 200)), Math.max(-1, Math.min(1, (m.y - y) / 160))];
        ctx.save(); ctx.translate(x, y); FD().eye(ctx, api.time, { open, look: lk, glow, scale: e.scale || 1.3 }); ctx.restore();
      },
      at(e, k) {
        if (k > 2.0 && !e.seen) { e.seen = true; api.setMood('scared', 0.8); }
        // shutRow: once Mimo's feet rise above this row (he rides on up), the eye closes at once and stays shut
        if (e.shutRow != null && e.shutAt == null && mimo().y < e.shutRow * T) e.shutAt = api.time;
      },
    },
    throw: {
      len: 5.2, layer: 'mid', visible: true,
      begin(e) { e.rocks = (e.to || []).map(([tx, ty], i) => ({ x: (tx + 0.5) * T, y: (ty + 1) * T - 6, t0: 1.2 + i * 0.55, hit: false })); },
      draw(ctx, e, k) {
        const t = api.time, x = px(e), f = foot(e), s = e.scale || 0.9, d = e.face || 1, rear = k == null ? 0 : Math.min(ease(seg(k, 0, 1.0)), 1 - ease(seg(k, 3.6, 4.6)));
        ctx.save(); ctx.translate(x, f); FD().sit(ctx, t, { face: d, scale: s, lean: -0.4 * rear + (k != null && k > 1.1 && k < 3.6 ? 0.5 * Math.abs(Math.sin((k - 1.1) * 5.7)) : 0), open: k != null && k > 1.0 && k < 3.6 ? 1 : 0, look: lookAt(e, x), blink: blinkAt(t, 2.1) }); ctx.restore();
        const mouth = { x: x + 70 * s * d, y: f - 140 * s };
        for (const r of e.rocks || []) {
          const q = seg(k, r.t0, r.t0 + 1.0);
          if (q > 0 && q < 1) { const rx = lerp(mouth.x, r.x, q), ry = lerp(mouth.y, r.y, q) - Math.sin(q * Math.PI) * 110; ctx.save(); ctx.translate(rx, ry); window.MimoVolcano.draw.PROPS.ember(ctx, t); ctx.restore(); }
          if (q >= 1) { ctx.save(); ctx.translate(r.x, r.y + 6); window.MimoVolcano.draw.PROPS.ember(ctx, t); ctx.restore(); }
        }
      },
      at(e, k) { for (const r of e.rocks || []) if (!r.hit && k >= r.t0 + 1.0) { r.hit = true; api.burst(r.x, r.y, 10, ['#FFD58A', '#FF9A55'], 120, { grav: 400, life: 0.5 }); shake(0.15); } },
    },
    circle: {
      len: 5.0, layer: 'mid',
      draw(ctx, e, k, layer) {
        if (k == null) return;
        const t = api.time, r = (e.r || 5) * T, a = (k - 0.8) / 7 * TAU, cx = px(e), cy = (e.y - 3) * T;
        if (k < 1) { if (layer === 'front') wind(ctx, k, 1, seg(k, 0, 0.8)); return; }
        const behind = Math.sin(a) < 0; if ((layer === 'back') !== behind) return;
        const depth = 0.85 + 0.25 * Math.sin(a);
        ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.28); FD().fly(ctx, t, { face: Math.sin(a) > 0 ? -1 : 1, scale: (e.scale || 0.9) * depth, flap: 1.2, alpha: behind ? 0.85 : 1 }); ctx.restore();
      },
    },
  };

  // ---------- engine ----------
  const list = () => { const st = api.L && api.L.story; return st ? st.cast.filter((e) => e.who === 'fauch') : []; };
  function init(L, info) {
    const st = L.story; if (!st || (info.reason === 'respawn' && L.fauchReady)) return;
    L.fauchReady = true;
    for (const e of st.cast) {
      if (e.who !== 'fauch') continue;
      e.fact = ACTS[e.fact || e.act] ? e.fact || e.act : 'perch'; e.act = 'fauch'; e.t0 = null; e.queued = false;
      for (const k of ['from', 'scared', 'woke', 'huffed', 'goneAt', 'shook', 'rum', 'roared', 'landed', 'slurp', 'hic', 'seen', 'rocks', 'chord', 'pipes', 'shutAt', 's', 'armed']) e[k] = null;
    }
  }
  function triggered(e) {
    if (e.manual) return !!e.armed;   // manual: true waits for the scene op ['fx', 'fauch', tag] (volcano-fauch-acts.js)
    const m = mimo(), xOk = e.at === false ? true : (e.atDir || 1) > 0 ? m.x >= ((e.at == null ? tile(e) - 7 : e.at) + 0.5) * T : m.x <= ((e.at == null ? tile(e) + 7 : e.at) + 0.5) * T;
    const yOk = e.atRow == null || m.y <= (e.atRow + 1) * T + 2;
    return xOk && yOk;
  }
  function spotOk(e) {
    const A = ACTS[e.fact];
    if (A.visible || e.fact === 'eye' || e.fact === 'drink') return inView(px(e), foot(e) - 40, 30);
    return true;
  }
  function queue(e) {
    e.queued = true;
    const A = ACTS[e.fact];
    DIR().beat({ prio: 2.7, wait: e.wait || 25, hold: A.len, ok: () => spotOk(e), start: () => { e.t0 = api.time; if (A.begin) A.begin(e); if (e.with && window.MimoVolcano.skit) window.MimoVolcano.skit.run(e.with); },
      done: () => { for (const l of e.then || []) { const who = l.by === 'player' || !l.by ? 'player' : C().scene.find(l.by); if (who) DIR().say(who, l.text, { prio: 3, front: true, wait: 8, secs: l.secs }); } } });
  }
  function update() {
    if (!api.L || !api.L.story || api.mode !== 'level') return;
    for (const e of list()) {
      if (!e.queued && api.state === 'play' && triggered(e)) queue(e);
      const A = ACTS[e.fact]; if (e.t0 != null && A.at) A.at(e, api.time - e.t0);
    }
  }
  function draw(layer, ctx) {
    if (layer === 'over' || !api.L || !api.L.story || api.mode !== 'level') return;
    for (const e of list()) {
      const A = ACTS[e.fact], k = e.t0 == null ? null : api.time - e.t0, own = e.layer || A.layer;
      if (e.fact === 'circle') { if (layer !== 'mid') A.draw(ctx, e, k, layer); continue; }
      if (layer === own) A.draw(ctx, e, k, layer);
    }
  }

  // the figure for the story engine: a name it accepts, an act that leaves the drawing to this file
  C().named = Object.assign(C().named || {}, { fauch: { height: 110, draw() {} } });
  C().acts = Object.assign(C().acts || {}, { fauch: { draw() {}, always: false } });
  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.fauchActs = ACTS;
  // scene op ['fx', 'hicks', tag]: a Fauch who drank (act drink) hiccups once more: the head jerks, a puff, a smoke ring, "Hicks!"
  window.MimoVolcano.skitFx = Object.assign(window.MimoVolcano.skitFx || {}, {
    hicks(args) { const e = C().scene.find(args[0]); if (e && e.fact === 'drink') { e.t0 = api.time - 4.1; e.slurp = true; e.hic = false; } },
  });
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, init, update, draw });
})();
