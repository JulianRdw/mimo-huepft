// World 5: small jokes in the obstacles. Looks and words only: they never change a rule, a timing or a path (the bots replay
// exactly). Each joke fires at most once per level start (respawns do not bring it back), only while the story is silent, and its
// word goes through the story director (MimoCoast.director, prio gag) like every line of the story, so two bubbles never stand
// at the same time. A joke that finds the stage busy simply waits for its next chance.
//
// Level fields (all optional):
//   geysers: [{ x, y, quip: 'Pfft!' }]    that geyser, when it erupts right beside Mimo (0.9 to 3.4 tiles away, so he is not in the
//                                         column) and misses him, giggles: the word, foam to the side, two little blips, "hihi".
//                                         The lift of the column is unchanged.
//   hoppers: [{ x, y, quip: 'Aua!' }]     that fire hopper, at the top of one of its jumps near Mimo, bumps its head on nothing:
//                                         the word, three stars circle its head. The arc is unchanged. Give it its own `offset` so it
//                                         jumps after the others and the joke "late, and bonk" reads.
//   rain: [{ x, y, quip: 'Pardon.' }]    that glow rain source: the first rock that lands within 7 tiles of Mimo lands softly
//                                         (a puff of ash instead of sparks and a bang) and says the word.
//   quips: [{ k, x, y, w?, text? }]       jokes on tiles (x, y is the tile, w the width in tiles, default 1):
//          k 'hot'   a hot stone `H` in x..x+w-1 on row y is offended: when Mimo leaves it (jump or drop) after standing on it, it
//                    hisses: the word (default 'Zisch! Unverschämt.'), a puff of steam, a hiss
//          k 'hum'   a basalt column `I` hums while Mimo stands on its top cell: little notes rise every 0.5 s and a soft tone
//                    plays for as long as he stands; the word (default 'Hmmmm.', false = none) is said once
//   Without x, y a 'hot' or 'hum' quip counts for every such stone of the level.
(function () {
  'use strict';
  let api = null;
  const T = 32, TAU = Math.PI * 2;
  const V = () => window.MimoVolcano, C = () => window.MimoCoast;
  const STONE_WAIT = 0.15, NOTE_EVERY = 0.5, SOFT_REACH = 7 * T, BUMP_REACH = 8 * T, MISS = { MIN: 0.9 * T, MAX: 3.4 * T, UP: 6 * T };

  // the word goes through the director; false when the stage is busy (then nothing happens and the joke may try again)
  const stageFree = () => {
    const d = C() && C().director, L = api.L;
    if (L && L.story && d) return d.free(1);
    return !(api.G.bubbles || []).some((b) => b.life < b.max - 0.05);
  };
  function say(text, anchor) {
    if (!text) return true;
    const d = C() && C().director, L = api.L;
    if (L && L.story && d) d.say(anchor, text, { prio: 'gag', wait: 1.5, secs: Math.max(1.6, d.secsFor(text) - 0.6) });
    else api.bubble(text, anchor, 1.8);
    return true;
  }
  const playing = () => api.mode === 'level' && api.state === 'play' && api.p;
  const inView = (x, y, m) => { const c = api.cam, v = api.view; return x > c.x + m && x < c.x + v.w - m && y > c.y + m && y < c.y + v.h - m; };
  const hash = (a) => { let h = 0; for (let i = 0; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) | 0; return h; };

  function init(L, info) {
    if (info.reason === 'respawn' && L.w5quips) return;
    const def = info.def || {}, v = L.volcano, items = [];
    const entry = (list, tx, ty) => (Array.isArray(list) ? list.find((e) => e && e.x === tx && e.y === ty) : null);
    if (v) {
      for (const g of v.geysers) { const e = entry(def.geysers, g.tx, g.ty); if (e && e.quip) items.push({ k: 'miss', g, text: e.quip, prev: 'quiet' }); }
      for (const h of v.hoppers) { const e = entry(def.hoppers, h.tx, h.ty); if (e && e.quip) items.push({ k: 'bump', h, text: e.quip, up: false }); }
      for (const r of v.rain) { const e = entry(def.rain, r.tx, r.ty); if (e && e.quip) items.push({ k: 'soft', r, text: e.quip, last: Math.floor((api.time - r.offset - r.fallT) / r.every) }); }
    }
    for (const q of def.quips || []) if (q && (q.k === 'hot' || q.k === 'hum')) items.push({ k: q.k, q, text: q.text, standT: 0, onId: null, said: false, noteAt: 0 });
    L.w5quips = { items };
  }

  // ---------- the geyser that misses ----------
  function miss(it, p) {
    const g = it.g, was = it.prev; it.prev = g.phase;
    if (it.fired != null) { // the second little blip and the giggle, a moment after the word
      const k = api.time - it.fired;
      if (k > 0.13 && !it.blip2) { it.blip2 = true; api.voice({ type: 'sine', f0: 1100, f1: 1500, slide: 0.05, dur: 0.07, vol: 0.022 }); }
      if (k > 0.35 && !it.hihi) { it.hihi = true; if (!api.reduced) api.floater(g.cx + it.side * 22, g.floor - g.max - 6, 'hihi', '#6FB7D6'); }
      return;
    }
    if (g.phase !== 'rise' || was === 'rise') return;
    const dx = p.x + p.w / 2 - g.cx, ad = Math.abs(dx), feet = p.y + p.h;
    if (ad < MISS.MIN || ad > MISS.MAX || feet < g.floor - MISS.UP || feet > g.floor + 6 || !stageFree()) return;
    it.fired = api.time; it.side = dx < 0 ? -1 : 1;
    say(it.text, { x: g.cx - 10, y: g.floor - 34, w: 20 });
    api.voice({ type: 'sine', f0: 850, f1: 1250, slide: 0.05, dur: 0.07, vol: 0.022 });
    if (!api.reduced) api.burst(g.cx + it.side * 16, g.floor - g.max * 0.7, 9, [api.W.geyserFoam || '#FFFFFF', api.W.geyser || '#BFE3F2'], 100, { grav: 320, vy: -90, life: 0.5 });
  }

  // ---------- the fire hopper that bumps its head ----------
  function bump(it, p) {
    const h = it.h, apex = it.up && !h.up && h.fly; it.up = h.fly && h.up;
    if (it.fired != null) return;
    if (!apex || Math.abs(p.x - h.x) > BUMP_REACH || !inView(h.x, h.y, 10) || !stageFree()) return;
    it.fired = api.time;
    say(it.text, { x: h.x - 10, y: h.y - 30, w: 20 });
    api.noise({ bp: 700, f1: 500, dur: 0.1, vol: 0.03 });
    if (!api.reduced) api.burst(h.x, h.y - 14, 6, ['#FFE08F', '#FFFFFF'], 70, { grav: 200, vy: -60, life: 0.5 });
  }
  // three little stars circle the head for a second
  function drawStars(ctx, it) {
    const k = api.time - it.fired, h = it.h; if (k < 0 || k > 1.1) return;
    const a = Math.min(1, (1.1 - k) / 0.3);
    ctx.save(); ctx.fillStyle = '#FFE08F'; ctx.globalAlpha = a;
    for (let i = 0; i < 3; i++) {
      const u = k * 7 + i * TAU / 3, x = h.x + Math.cos(u) * 15, y = h.y - 20 + Math.sin(u) * 5;
      ctx.beginPath(); for (let j = 0; j < 8; j++) { const r = j % 2 ? 1.6 : 4.2, w = j / 8 * TAU; ctx.lineTo(x + Math.cos(w) * r, y + Math.sin(w) * r); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- the glow rock that lands softly ----------
  // called by volcano-things.js when a rock of source r lands: true = handled (a soft landing instead of sparks and a bang)
  function quipRock(r) {
    const L = api.L, it = L && L.w5quips && L.w5quips.items.find((q) => q.k === 'soft' && q.r === r);
    if (!it || it.fired != null || !playing()) return false;
    const p = api.p;
    if (Math.abs(p.x + p.w / 2 - r.cx) > SOFT_REACH || !inView(r.cx, r.impact, 10) || !stageFree()) return false;
    it.fired = api.time;
    say(it.text, { x: r.cx - 10, y: r.impact - 30, w: 20 });
    if (!api.reduced) api.burst(r.cx, r.impact - 3, 8, ['#B9B3C9', '#8E8CA3', '#FFC978'], 36, { grav: -20, vy: -34, life: 1.0 });
    api.noise({ lp: 300, f1: 120, dur: 0.12, vol: 0.012 });
    return true;
  }

  // ---------- the stones: hot (offended) and basalt (hums) ----------
  const inRegion = (q, tx, ty) => q.x == null || (ty === q.y && tx >= q.x && tx < q.x + (q.w || 1));
  function stones(it, p) {
    const q = it.q, tx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h + 1) / T);
    const id = api.tileId(5, q.k === 'hot' ? 'H' : 'I'), on = p.grounded && api.tileAt(tx, ty) === id && inRegion(q, tx, ty);
    if (q.k === 'hot') {
      if (on) { it.standT += api.STEP; it.cell = { x: tx, y: ty }; return; }
      const left = it.standT >= STONE_WAIT && !p.grounded && it.cell; it.standT = 0;
      if (!left || it.said || !stageFree()) return;
      it.said = true; const c = it.cell;
      say(q.text === undefined ? 'Zisch! Unverschämt.' : q.text, { x: c.x * T + T / 2 - 10, y: c.y * T - 4, w: 20 });
      api.noise({ hp: 2200, dur: 0.35, vol: 0.03 });
      if (!api.reduced) api.burst(c.x * T + T / 2, c.y * T, 7, ['#E6E1EE', '#B9B3C9'], 50, { grav: -60, vy: -70, life: 0.7 });
      return;
    }
    // hum: notes and a soft tone while he stands on the top cell of a column
    const top = on && api.tileAt(tx, ty - 1) !== id;
    if (!top) { it.standT = 0; return; }
    it.standT += api.STEP;
    if (it.standT < 0.08 || api.time < it.noteAt) return;
    it.noteAt = api.time + NOTE_EVERY;
    if (!api.reduced) api.floater(tx * T + T / 2 + (Math.sin(api.time * 5) * 8), ty * T - 10, '♪', '#B9B3C9');
    api.voice({ type: 'sine', f0: 196 + (Math.floor(api.time / NOTE_EVERY) % 3) * 33, f1: 200, slide: 0.05, dur: 0.45, vol: 0.016, attack: 0.05 });
    if (!it.said && q.text !== false && stageFree()) { it.said = true; say(q.text === undefined ? 'Hmmmm.' : q.text, { x: tx * T + T / 2 - 10, y: ty * T - 14, w: 20 }); }
  }

  function update() {
    const L = api.L; if (!L || !L.w5quips || !playing()) return;
    const p = api.p;
    for (const it of L.w5quips.items) {
      if (it.k === 'miss') miss(it, p);
      else if (it.k === 'bump') bump(it, p);
      else if (it.k === 'hot' || it.k === 'hum') stones(it, p);
    }
  }
  function draw(layer, ctx) {
    const L = api.L; if (layer !== 'mid' || !L || !L.w5quips || api.mode !== 'level' || api.reduced) return;
    for (const it of L.w5quips.items) if (it.k === 'bump' && it.fired != null) drawStars(ctx, it);
  }

  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.quipRock = quipRock;
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, init, update, draw });
})();
