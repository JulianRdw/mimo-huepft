// World 5: Mimo with more character, and the Funkenbrüder. Pure decoration on the game clock: squash, floaters, drawn extras;
// nothing touches the physics, so the level bots replay exactly. Lines go through the story director (coast-director.js),
// the small words (floaters) only when no story bubble shows.
//
// Mimo's gags (by themselves in every level of the world; level fields switch them off or place them):
//   hot paws   on hot stone, when the heat under his paws passes 0.35: "Au!" "au!" "au!" from paw to paw, hopping a little
//              (up to 3 times a level; field paws: false = never)
//   fanning    standing still for 1.1 s near lava (within 4 tiles): he fans himself with a palm leaf, two drops, "Puh."
//              (every 9 s at most, 3 times a level; field fan: false = never)
//   stare      field stare: { x, y, r, text }: standing still near that tile (r tiles, default 2.5) he looks down into the depth,
//              little sparkles, his line (default "Wow. Die Wolken sind unten."), once a level
//   squeak     the failed "fauch": scene ops ['fx', 'inhale'] (he fills up), ['fx', 'squeak'] ("piep." comes out),
//              ['fx', 'laugh'] (the Funkenbrüder laugh: Hihi! Hö hö! Haha!) inside a level's scene (volcano-skit.js)
//   the part   (the engine does this already) a found part of the summit photo is held up over his head
// The Funkenbrüder: three fire hoppers with `bro: 1 | 2 | 3` in the level's `hoppers` wear headsets and comment Mimo like
// sports reporters. Field bros: { x0, x1, lines: { land, star, fall, start } }: inside columns x0..x1 a brother (the one nearest
// Mimo) says the next line of the list for a long jump landed, a star, a fall (after the respawn), the first entry (start);
// at most one line every 2.6 s (the greeting first) and only when the story is silent. Without lines a set of defaults is used.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, DIR = () => window.MimoCoast.director, V = () => window.MimoVolcano;
  const quiet = () => { const d = DIR(); return !d || d.free(1); };
  const BRO_LINES = {
    start: ['Und da ist er, meine Damen und Herren!'],
    land: ['Sauber gelandet!', 'Haltungsnote: neun Komma fünf!', 'Was für ein Satz!', 'Der Kleine hat Feuer!', 'Und er steht! Er steht!'],
    star: ['Stern! Der zählt!', 'Und noch einer! Unglaublich!'],
    fall: ['Autsch. Das gibt Abzug.', 'Kopf hoch, Kleiner. Nächster Versuch.'],
  };
  const BRO_COL = ['#F6A9BF', '#9ADBC2', '#9ED3EE'];

  function state() {
    const L = api.L; if (!L || api.mode !== 'level' || L.world !== 5) return null;
    return L.mimo5 || (L.mimo5 = { paws: 0, pawT: -1, hotWas: 0, fans: 0, fanT: -99, still: 0, fanOn: -1, stared: false, stareOn: -1, inhale: -1, sq: -1, bro: { last: -9, n: {}, air: 0, stars: 0, dead: false, inside: false } });
  }
  function init(L, info) { if (info.reason !== 'respawn') { L.mimo5 = null; L.def5 = info.def || {}; } }
  const lavaNear = (p) => { const tx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h) / T); for (let dx = -4; dx <= 4; dx++) for (let dy = -1; dy <= 2; dy++) if (V().isLava(tx + dx, ty + dy)) return true; return false; };

  // ---------- update ----------
  function update(dt) {
    const s = state(), p = api.p; if (!s || !p) return;
    if (api.state === 'dead') s.bro.dead = true;
    if (api.state !== 'play') return;
    const def = api.L.def5 || {}, t = api.time, heat = p.heat || 0;
    // hot paws
    if (def.paws !== false && heat > 0.35 && s.hotWas <= 0.35 && s.paws < 3 && quiet()) { s.paws++; s.pawT = t; }
    s.hotWas = heat;
    if (s.pawT >= 0) {
      const k = t - s.pawT, n = Math.floor(k / 0.2);
      if (k < 0.62) { p.sy = 1 + 0.1 * Math.abs(Math.sin(k * Math.PI / 0.2)); p.sx = 1 - 0.05 * Math.abs(Math.sin(k * Math.PI / 0.2)); }
      if (n !== s.pawN && n < 3) { s.pawN = n; api.floater(p.x + p.w / 2 + (n % 2 ? 9 : -9), p.y + p.h - 12, n ? 'au!' : 'Au!', '#F28C82'); }
      if (k > 0.7) { s.pawT = -1; s.pawN = -1; }
    }
    // standing still
    const idle = p.grounded && Math.abs(p.vx) < 5 && !p.carried;
    s.still = idle ? s.still + dt : 0;
    // fanning near lava
    if (def.fan !== false && s.still > 1.1 && s.fanOn < 0 && s.fans < 3 && t - s.fanT > 9 && quiet() && lavaNear(p)) { s.fans++; s.fanOn = t; s.fanT = t; p.gagDone = true; api.floater(p.x + p.w / 2, p.y - 8, 'Puh.', '#8E8CA3'); }
    if (s.fanOn >= 0 && (t - s.fanOn > 2.4 || !idle)) s.fanOn = -1;
    // staring down
    const st = def.stare;
    if (st && !s.stared && s.still > 0.5 && Math.hypot(p.x + p.w / 2 - (st.x + 0.5) * T, p.y + p.h - (st.y + 1) * T) < (st.r || 2.5) * T) {
      s.stared = true; s.stareOn = t; p.gagDone = true; api.setMood('look', 3);
      DIR().say('player', st.text || 'Wow. Die Wolken sind unten.', { prio: 'player', wait: 4 });
    }
    if (s.stareOn >= 0 && t - s.stareOn > 3.6) s.stareOn = -1;
    if (s.stareOn >= 0) api.setMood('look', 0.3);
    // the inhale before the squeak
    if (s.inhale >= 0) { const k = Math.min(1, (t - s.inhale) / 0.9); p.sx = 1 + 0.16 * k; p.sy = 1 - 0.06 * k; if (k >= 1 && t - s.inhale > 1.4) s.inhale = -1; }
    bros(s, def, dt);
  }

  // ---------- the Funkenbrüder ----------
  function bros(s, def, dt) {
    const b = def.bros, v = api.L.volcano, p = api.p; if (!b || !v) return;
    const list = v.hoppers.filter((h) => h.bro), cx = (p.x + p.w / 2) / T, B = s.bro; if (!list.length) return;
    const inside = cx >= b.x0 && cx <= b.x1;
    const lines = { ...BRO_LINES, ...(b.lines || {}) };
    const nearest = () => list.reduce((a, h) => (Math.abs(h.x - (p.x + p.w / 2)) < Math.abs(a.x - (p.x + p.w / 2)) ? h : a), list[0]);
    const say = (kind) => {
      if (!inside || api.time - B.last < 2.6 || !quiet()) return false;
      const arr = lines[kind]; if (!arr || !arr.length) return false;
      const i = B.n[kind] || 0;
      B.n[kind] = i + 1; B.last = api.time;
      const h = nearest(); api.bubble(arr[i % arr.length], { x: h.x - 10, y: (h.fly ? h.y : h.home) - 34, w: 20 }, 2.2);
      return true;
    };
    if (inside && !B.started) B.started = say('start');
    if (!p.grounded) B.air += dt; else { if (B.air > 0.5 && B.started) say('land'); B.air = 0; }
    if (api.G.starsGot > B.stars) { B.stars = api.G.starsGot; say('star'); }
    if (B.dead && p.grounded) { B.dead = false; B.last = -9; say('fall'); }
  }
  // ---------- scene effects for the failed "fauch" ----------
  V().skitFx = Object.assign(V().skitFx || {}, {
    inhale() { const s = state(); if (s) { s.inhale = api.time; api.voice({ type: 'sine', f0: 220, f1: 330, slide: 0.8, dur: 0.8, vol: 0.02 }); } },
    squeak() {
      const s = state(), p = api.p; if (!s || !p) return;
      s.inhale = -1; p.sx = 0.86; p.sy = 1.12; s.sq = api.time; api.setMood('piep', 0.8);
      C().pop(p.x + p.w / 2 + 14 * (p.facing || 1), p.y - 18, 'piep.', { size: 13, fill: '#FFF2B0' });
      api.voice({ type: 'triangle', f0: 1500, f1: 1900, slide: 0.08, dur: 0.12, vol: 0.05 });
    },
    laugh(args) {
      const v = api.L.volcano; if (!v) return;
      const list = v.hoppers.filter((h) => h.bro), words = (args && args[0]) || ['Hihi!', 'Hö hö!', 'Haha!'];
      list.forEach((h, i) => C().scene.later(api.L.story.cast[0], 0.25 * i, () => api.floater(h.x, (h.fly ? h.y : h.home) - 26, words[i % words.length], BRO_COL[i % 3])));
    },
  });

  // ---------- drawing ----------
  function drawFan(ctx, s) {
    const p = api.p, k = api.time - s.fanOn, f = p.facing || 1, x = p.x + p.w / 2 + f * 12, y = p.y + 4, a = Math.sin(k * 14) * 0.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-f * 0.4 + a * f); ctx.scale(f, 1);
    ctx.strokeStyle = '#8F6841'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -4); ctx.stroke();
    ctx.fillStyle = '#7CC49A'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(-10, -12, -4, -22); ctx.quadraticCurveTo(0, -14, 4, -22); ctx.quadraticCurveTo(10, -12, 0, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5FA67E'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -19); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.fillStyle = '#BFE6F2';
    for (let i = 0; i < 2; i++) { const q = (k * 1.2 + i * 0.5) % 1; ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(p.x + p.w / 2 - f * (6 + i * 5), p.y + 2 + q * 14, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawStare(ctx, s) {
    const p = api.p, k = api.time - s.stareOn; ctx.save(); ctx.fillStyle = '#FFF2B0';
    for (let i = 0; i < 3; i++) { const q = (k * 0.8 + i / 3) % 1; ctx.globalAlpha = Math.sin(q * Math.PI); const x = p.x + p.w / 2 + (i - 1) * 12, y = p.y - 6 - q * 12; ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, r = j % 2 ? 1 : 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawHeadset(ctx, h, i) {
    const y = h.fly ? h.y : h.home - 4, x = h.x, col = BRO_COL[(h.bro - 1) % 3];
    if (!h.fly && h.warn <= 0) { // resting under the lava: only the antenna of the headset sticks out
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 6, h.home); ctx.lineTo(x + 8, h.home - 10); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 8, h.home - 11, 2.4, 0, TAU); ctx.fill(); ctx.restore(); return;
    }
    const lift = h.fly ? 0 : -3 * h.warn;
    ctx.save(); ctx.translate(x, y + lift); ctx.strokeStyle = '#3A2E48'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -1, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-10, -1, 3, 4, 0, 0, TAU); ctx.ellipse(10, -1, 3, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3A2E48'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.quadraticCurveTo(-10, 8, -4, 7); ctx.stroke(); ctx.fillStyle = '#3A2E48'; ctx.beginPath(); ctx.arc(-3.4, 7, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function draw(layer, ctx) {
    const s = api.L && api.L.mimo5; if (!s || api.mode !== 'level') return;
    if (layer === 'front') { if (s.fanOn >= 0) drawFan(ctx, s); if (s.stareOn >= 0) drawStare(ctx, s); }
    if (layer === 'mid' && api.L.volcano) for (const h of api.L.volcano.hoppers) if (h.bro) drawHeadset(ctx, h);
  }

  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, init, update, draw });
})();
