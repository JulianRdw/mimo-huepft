// World 4 "Korallenküste": the things that live in it. Riding bubbles from a vent on the sea floor (map "o"),
// crabs that carry Mimo (map "K"), pufferfish on a fixed stretch (map "F"), the tide gauge (map "I").
// Rules and numbers: tools/levels/world4-kit.md. Everything moves on the game clock, so the bots replay exactly.
(function () {
  'use strict';
  let api = null;
  const DIR = () => window.MimoCoast.director;   // every line goes through the story director (coast-director.js)
  const T = 32, C = () => window.MimoCoast;

  // ---------- numbers (measured in tools/coast-test.mjs) ----------
  // bubbles are the express lift: faster than swimming up (160), one every 1.6 s
  const BUB = Object.freeze({ R: 22, EVERY: 1.6, SPEED: 170, POP_SHOW: 0.22, SNAP: 0.95, BORN_REACH: 8 });
  const CRAB = Object.freeze({ W: 34, H: 22, SPEED: 64, TALK_GAP: 7, PIEP_RANGE: 5 });
  // the taxi rank (level field crabBoost, level 34): holding the way the crab walks makes it faster, by this factor (at
  // most MAX tiles/s), reached in about a quarter second; Mimo then stays put on the shell instead of walking off it
  const BOOST = Object.freeze({ MAX: 5, RATE: 4.5 });
  // a swimmer this close to a flag (tiles, centre to centre) sets it, so a flag on the sea floor works from above
  const FLAG_REACH = 1.5, SAY_REACH = 2;
  // pufferfish: swims SWIM s, trembles (still harmless, stands still), grows, stays big, shrinks; then swims on
  const PUFF = Object.freeze({ CYCLE: 4.2, SWIM: 2.6, TREMBLE: 0.55, GROW: 0.15, BIG: 0.7, SMALL_R: 11, BIG_R: 26, DIST: 3, SPEED: 1.2 });
  const PUFF_HIT = 0.82; // the spikes hurt inside this share of the drawn radius (a little mercy at the tips)

  const crabLines = ['Wohin soll’s gehen?', 'Seitwärts ist das neue Vorwärts.', 'Anschnallen gibt es nicht.', 'Macht drei Muscheln.', 'Festhalten. Womit auch immer.', 'Nächster Halt: da drüben.'];
  const crabScared = ['Huch!', 'Falsche Richtung? Gut.', 'Ich dreh ja schon.', 'Kein Grund zu piepen.'];

  // a level entry in a list like puffers: [{ x, y, ... }] that belongs to the map character at x, y
  const entryAt = (list, x, y) => (Array.isArray(list) ? list.find((e) => e && e.x === x && e.y === y) : null) || {};

  // ---------- spawns (during map reading, before init) ----------
  const spawns = {
    o: { lint: { name: 'Blasenquelle', color: '#BFEFF5' }, spawn(L, x, y) { C().state(L).sources.push({ tx: x, ty: y, cx: x * T + T / 2, floor: (y + 1) * T, last: -1, every: BUB.EVERY, offset: 0, speed: BUB.SPEED }); } },
    K: { lint: { name: 'Krabben', color: '#F28C82' }, spawn(L, x, y) {
      const b = { crab: true, tx: x, ty: y, x: x * T + (T - CRAB.W) / 2, y: (y + 1) * T - CRAB.H, w: CRAB.W, dir: 1, speed: CRAB.SPEED, hop: 0, talkT: 0, step: 0 };
      C().state(L).crabs.push(b); L.bodies.push(b);
    } },
    F: { lint: { name: 'Kugelfische', color: '#F6C9A0' }, spawn(L, x, y) { C().state(L).fish.push({ tx: x, ty: y, hx: x * T + T / 2, hy: y * T + T / 2, cx: 0, cy: 0, x: 0, y: 0, w: 22, size: 0, shake: 0, face: 1, axis: 'x', dist: PUFF.DIST, speed: PUFF.SPEED, offset: 0, said: 0 }); } },
    I: { lint: { name: 'Pegelstange', color: '#E7CBA9' }, spawn(L, x, y) { C().state(L).gauges.push({ cx: x * T + T / 2, foot: (y + 1) * T }); } },
  };

  // level entries change the defaults: puffers: [{ x, y, dist, axis, speed, offset }], crabs: [{ x, y, dir, speed }],
  // vents: [{ x, y, every, offset, speed, items }] (items: beach things riding inside the bubbles, one per bubble in turn, null = empty)
  function applyEntries(c, def) {
    for (const f of c.fish) { const e = entryAt(def.puffers, f.tx, f.ty); f.line = e.line || null; f.axis = e.axis === 'y' ? 'y' : 'x'; f.dist = e.dist != null ? e.dist : PUFF.DIST; f.speed = e.speed || PUFF.SPEED; f.offset = e.offset || 0; }
    for (const b of c.crabs) { const e = entryAt(def.crabs, b.tx, b.ty); b.line = e.line || null; b.dir = e.dir === -1 ? -1 : 1; b.speed = e.speed ? e.speed * T : CRAB.SPEED; }
    for (const s of c.sources) { const e = entryAt(def.vents, s.tx, s.ty); s.every = e.every || BUB.EVERY; s.offset = e.offset || 0; s.items = Array.isArray(e.items) && e.items.length ? e.items : null; s.speed = e.speed ? e.speed * T : BUB.SPEED; }
  }

  // ---------- bubbles ----------
  function updateBubbles(c, dt) {
    const L = api.L, time = api.time, surf = c.surf;
    for (const s of c.sources) {
      const k = Math.floor((time - s.offset) / s.every);
      if (k > s.last) {
        s.last = k;
        // a vent above the water (low tide) stays quiet
        if (time >= s.offset && surf != null && s.floor - 2 * BUB.R > surf + 4) {
          const b = { bubble: true, item: s.items ? s.items[((k % s.items.length) + s.items.length) % s.items.length] || null : null, x: s.cx - BUB.R, y: s.floor - 2 * BUB.R - 3, w: 2 * BUB.R, r: BUB.R, speed: s.speed, off: false, popT: 0, born: time };
          c.live.push(b); L.bodies.push(b);
        }
      }
    }
    const p = api.p;
    for (const b of c.live) {
      if (b.off) { b.popT += dt; continue; }
      b.y -= b.speed * dt;
      const carrying = c.ride === b, top = b.y - (carrying ? p.h : 0);
      const ceiling = api.isSolid(Math.floor((b.x + b.r) / T), Math.floor((top - 1) / T)) || (carrying && (api.isSolid(Math.floor((p.x + 3) / T), Math.floor((top - 1) / T)) || api.isSolid(Math.floor((p.x + p.w - 3) / T), Math.floor((top - 1) / T))));
      if (surf == null || b.y <= surf - 2 || ceiling) pop(b);
    }
    boardBubble(c, p);
    // popped bubbles stay a moment for their ring, then leave the bodies
    if (c.live.some((b) => b.off && b.popT > BUB.POP_SHOW)) {
      const gone = new Set(c.live.filter((b) => b.off && b.popT > BUB.POP_SHOW));
      c.live = c.live.filter((b) => !gone.has(b));
      L.bodies = L.bodies.filter((b) => !gone.has(b));
    }
  }
  // a bubble that touches Mimo from the side or comes up under him lifts him onto itself (the core carries only a Mimo
  // whose feet were above its top). It scoops him up while its top is at most 0.95 of its height above his feet. Not while he swims up with jump held, dives, or flies from a jump: then he passes it.
  function boardBubble(c, p) {
    if (!p || api.state !== 'play' || p.impulse || p.diving || (api.input.jumpHeld && p.vy < -20) || (c.ride && c.ride.bubble && !c.ride.off)) return;
    // standing on the sea floor at a vent, the bubble that comes out right there takes him along too (it is born
    // with its top a little higher than SNAP allows, so without this a Mimo waiting on the vent would never be lifted)
    const reach = p.grounded && !p.carried ? b2 => b2.r * 2 + BUB.BORN_REACH : b2 => b2.r * 2 * BUB.SNAP;
    for (const b of c.live) {
      if (b.off || p.x + p.w - 4 <= b.x || p.x + 4 >= b.x + b.w) continue;
      const feet = p.y + p.h, cx = b.x + b.r, cy = b.y + b.r, nx = Math.max(p.x, Math.min(cx, p.x + p.w)), ny = Math.max(p.y, Math.min(cy, feet));
      if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) > b.r * b.r || feet < b.y || feet - b.y > reach(b)) continue;
      p.y = b.y - p.h; if (p.vy > 0) p.vy = 0;
      return;
    }
  }
  function pop(b) {
    b.off = true; b.popT = 0;
    api.ring(b.x + b.r, b.y + b.r, api.W.foam || '#FFFFFF');
    api.burst(b.x + b.r, b.y + b.r, 6, api.W.foam || '#FFFFFF', 70, { grav: -120, life: 0.3 });
    if (onScreen(b.x + b.r, b.y + b.r, 40)) api.sfx.pop();
  }

  // ---------- crabs ----------
  function standable(tx, ty) {
    if (api.isSolid(tx, ty)) return true;
    return api.tileAt(tx, ty) === api.TILE.ONEWAY;
  }
  function updateCrabs(c, dt) {
    const p = api.p;
    for (const b of c.crabs) {
      b.hop = Math.max(0, b.hop - dt * 2.5); b.talkT = Math.max(0, b.talkT - dt);
      const want = c.crabBoost > 1 && p && c.ride === b && api.state === 'play' && (b.dir > 0 ? api.input.right && !api.input.left : api.input.left && !api.input.right);
      b.boostK = (b.boostK || 0) + ((want ? 1 : 0) - (b.boostK || 0)) * Math.min(1, dt * BOOST.RATE);
      const sp = b.boostK > 0.001 ? Math.min(Math.max(b.speed, BOOST.MAX * T), b.speed * (1 + (c.crabBoost - 1) * b.boostK)) : b.speed;
      if (want && !b.boostSaid && b.boostK > 0.6) { b.boostSaid = true; DIR().say(b, 'Festhalten! Jetzt mit Turbo.', { prio: 'player', wait: 1 }); }
      if (b.boostK > 0.5 && onScreen(b.x, b.y, 40) && Math.floor(api.time * 10) !== Math.floor((api.time - dt) * 10)) api.burst(b.x + b.w / 2 - b.dir * 16, b.y + CRAB.H - 2, 2, api.W.groundDot || '#E3CB9C', 50, { grav: 200, vy: -40, life: 0.3, r: 1.6 });
      b.curSp = sp;
      const nx = b.x + b.dir * sp * dt, frontX = b.dir > 0 ? nx + b.w : nx, ty = Math.floor((b.y + CRAB.H) / T), ftx = Math.floor(frontX / T);
      // turn at the end of the ground and at walls; urchins are no wall for a crab, it walks right over them
      if (!standable(ftx, ty) || api.isSolid(ftx, ty - 1)) b.dir = -b.dir; else { b.x = nx; b.step += dt * sp; }
      // a line now and then when Mimo climbs on
      if (p && c.ride === b && !b.wasRidden && b.talkT <= 0 && api.state === 'play') { DIR().say(b, b.line || api.pick(crabLines), b.line ? { prio: 'player', wait: 1 } : { prio: 'gag', wait: 0.5 }); b.talkT = CRAB.TALK_GAP; }
      b.wasRidden = !!p && c.ride === b;
    }
  }

  function keepRide(L, c) {
    const r = c.ride, i = r ? L.bodies.indexOf(r) : -1;
    if (i >= 0 && i < L.bodies.length - 1) L.bodies = [...L.bodies.slice(0, i), ...L.bodies.slice(i + 1), r];
  }

  // ---------- lines at places (level field says: [{ x, y, r, text }]) and flags reached while swimming ----------
  function updateSays(c) {
    const p = api.p; if (!p || api.state !== 'play') return;
    const cx = (p.x + p.w / 2) / T, cy = (p.y + p.h / 2) / T;
    for (const s of c.says) {
      if (s.said || Math.hypot(cx - s.x - 0.5, cy - s.y - 0.5) > s.r) continue;
      s.said = true; DIR().say('player', s.text, { prio: 'player' });
    }
  }
  function updateFlags() {
    const p = api.p, L = api.L; if (!p || !p.swim || api.state !== 'play') return;
    const cx = (p.x + p.w / 2) / T, cy = (p.y + p.h / 2) / T;
    for (const f of L.checkpoints) {
      if (f.active || Math.hypot(cx - f.x - 0.5, cy - f.y - 0.5) > FLAG_REACH) continue;
      for (const o of L.checkpoints) o.active = false;
      f.active = true; f.wave = 1; api.sfx.flag(); api.setMood('happy', 0.6);
      api.G.respawn = { x: f.x * T + (T - p.w) / 2, y: (f.y + 1) * T - p.h };
      api.burst(f.x * T + 12, f.y * T + 8, 12, [api.P.switchOn, api.P.star], 110, { grav: 200, rect: true });
      api.floater(f.x * T + 12, f.y * T - 4, 'Gespeichert', api.P.switchOn);
      return;
    }
  }

  // ---------- pufferfish ----------
  function puffAt(f, time) {
    const tt = time + f.offset, n = Math.floor(tt / PUFF.CYCLE), t = tt - n * PUFF.CYCLE;
    const swimT = n * PUFF.SWIM + Math.min(t, PUFF.SWIM), t1 = PUFF.SWIM + PUFF.TREMBLE, t2 = t1 + PUFF.GROW, t3 = t2 + PUFF.BIG;
    const size = t < t1 ? 0 : t < t2 ? (t - t1) / PUFF.GROW : t < t3 ? 1 : Math.max(0, 1 - (t - t3) / (PUFF.CYCLE - t3));
    const shake = t >= PUFF.SWIM && t < t1 ? (t - PUFF.SWIM) / PUFF.TREMBLE : 0;
    let off = 0, vel = 0;
    if (f.dist && f.speed > 0) {
      const span = Math.abs(f.dist) * 2 / f.speed, ph = (swimT / span) % 1, tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      off = f.dist * T * tri * tri * (3 - 2 * tri); vel = (ph < 0.5 ? 1 : -1) * Math.sign(f.dist);
    }
    return { size, shake, off, vel, t };
  }
  function updateFish(c) {
    const p = api.p;
    for (const f of c.fish) {
      const s = puffAt(f, api.time), wasBig = f.size >= 0.5;
      f.size = s.size; f.shake = s.shake; if (s.vel) f.face = s.vel;
      f.cx = f.hx + (f.axis === 'x' ? s.off : 0); f.cy = f.hy + (f.axis === 'y' ? s.off : 0);
      f.x = f.cx - 11; f.y = f.cy - 14 - f.size * 14; f.w = 22;
      if (!wasBig && f.size >= 0.5 && p && Math.abs(p.x - f.cx) < 5 * T && Math.abs(p.y - f.cy) < 3 * T && api.time - f.said > 6 && api.state === 'play') { f.said = api.time; if (f.line || api.hash(Math.floor(api.time), f.tx) < 0.35) DIR().say(f, f.line || 'Pffff.', { prio: 'gag', wait: 1, secs: 1.4 }); }
      if (f.size >= 0.5 && p && api.state === 'play' && boxCircle(p, f.cx, f.cy, (PUFF.SMALL_R + (PUFF.BIG_R - PUFF.SMALL_R) * f.size) * PUFF_HIT)) api.hurt();
    }
  }
  // does the circle touch Mimo's box (shrunk by 3 px, like the thorns are forgiving)
  function boxCircle(p, cx, cy, r) {
    const nx = Math.max(p.x + 3, Math.min(cx, p.x + p.w - 3)), ny = Math.max(p.y + 3, Math.min(cy, p.y + p.h - 3));
    return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
  }

  const onScreen = (x, y, pad) => { const cam = api.cam, v = api.view; return x > cam.x - pad && x < cam.x + v.w + pad && y > cam.y - pad && y < cam.y + v.h + pad; };

  // ---------- drawing ----------
  function drawBubble(ctx, x, y, r, a, ride) {
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ride ? api.W.rideFill : api.W.bubbleFill; ctx.fill();
    ctx.strokeStyle = api.W.foam || '#FFFFFF'; ctx.lineWidth = Math.max(1.4, r * (ride ? 0.12 : 0.1)); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.66, -2.5, -1.7); ctx.lineWidth = Math.max(1.4, r * 0.14); ctx.lineCap = 'round'; ctx.stroke();
    if (ride) { ctx.fillStyle = api.W.foam; ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.38, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawVent(ctx, s) {
    // a low mound of sand-stone with a dark mouth, the bubbles come out of it
    ctx.fillStyle = api.W.vent; ctx.beginPath(); ctx.ellipse(s.cx, s.floor, 15, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = api.W.ventInk; ctx.beginPath(); ctx.ellipse(s.cx, s.floor - 6, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    // a few tiny bubbles always trickle up, so a vent reads as a vent even between two big bubbles
    if (api.reduced || api.L.coast.surf == null || s.floor - 10 < api.L.coast.surf) return;
    for (let i = 0; i < 3; i++) { const k = (api.time * 0.8 + i / 3) % 1; drawBubble(ctx, s.cx + Math.sin(k * 9 + i) * 3, s.floor - 9 - k * 34, 1.6 + k * 1.4, (1 - k) * 0.9); }
  }
  function drawCrab(ctx, b) {
    const W = api.W, x = b.x + b.w / 2, y = b.y + CRAB.H - (b.hop > 0 ? Math.sin(b.hop * Math.PI) * 8 : 0), legs = Math.sin(b.step * 0.35) * 2;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.strokeStyle = W.crabInk; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i < 3; i++) { ctx.moveTo(x + s * (8 + i * 3), y - 7); ctx.lineTo(x + s * (15 + i * 4) + legs * s * (i % 2 ? 1 : -1), y); }
      ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + s * 11, y - 12); ctx.lineTo(x + s * 18, y - 19); ctx.stroke();
      ctx.fillStyle = W.crab; ctx.beginPath(); ctx.arc(x + s * 20, y - 21, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    // the shell is the platform: flat on top, exactly at b.y
    ctx.fillStyle = W.crab; ctx.beginPath(); ctx.ellipse(x, y - 10, 15, 11, 0, Math.PI, 0); ctx.lineTo(x + 15, y - 6); ctx.quadraticCurveTo(x, y - 1, x - 15, y - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W.foam || '#FFFFFF'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(x - 4, y - 15, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    for (const s of [-1, 1]) {
      ctx.strokeStyle = W.crab; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + s * 5, y - 19); ctx.lineTo(x + s * 6, y - 25); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + s * 6, y - 26, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = api.P.mimoInk; ctx.beginPath(); ctx.arc(x + s * 6 + b.dir * 0.9, y - 26, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawFish(ctx, f) {
    const W = api.W, sz = f.size, r = PUFF.SMALL_R + (PUFF.BIG_R - PUFF.SMALL_R) * sz;
    const jit = f.shake > 0 && !api.reduced ? Math.sin(api.time * 70) * 1.4 * f.shake : 0, x = f.cx + jit, y = f.cy;
    ctx.save(); ctx.translate(x, y); ctx.scale(f.face, 1);
    // spikes: hinted while it trembles, long and in the danger colour when it is big
    const spikeLen = sz > 0 ? 4 + sz * 7 : f.shake * 3;
    if (spikeLen > 0.5) {
      ctx.strokeStyle = W.danger; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26; ctx.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2)); ctx.lineTo(Math.cos(a) * (r + spikeLen), Math.sin(a) * (r + spikeLen)); }
      ctx.stroke();
    }
    // tail and fins
    ctx.fillStyle = sz >= 0.5 ? W.fishBig : W.fish;
    ctx.beginPath(); ctx.moveTo(-r + 2, 0); ctx.lineTo(-r - 8, -6); ctx.lineTo(-r - 8, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = W.fishBelly; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.72, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // face: worried while trembling, puffed cheeks when big
    const ex = r * 0.42, ey = -r * 0.22;
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex, ey, 3.2 + sz * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = api.P.mimoInk; ctx.beginPath(); ctx.arc(ex + 0.8, ey, 1.7 + sz * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = api.P.mimoInk; ctx.lineWidth = 1.4; ctx.beginPath();
    if (sz >= 0.5) ctx.arc(r * 0.78, r * 0.18, 2.2, 0, Math.PI * 2); else ctx.arc(r * 0.7, r * 0.12, 2, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.restore();
  }
  function drawGauge(ctx, g, c) {
    const W = api.W, td = c.tide, marks = td ? [td.high * T, td.low * T] : c.base != null ? [c.base] : [];
    const top = Math.min(g.foot - 2 * T, ...marks) - 22;
    ctx.fillStyle = W.pole; api.rr(g.cx - 4, top, 8, g.foot - top, 3); ctx.fill();
    ctx.fillStyle = W.poleStripe; for (let y = top + 8; y < g.foot - 8; y += 26) { api.rr(g.cx - 4, y, 8, 9, 2); ctx.fill(); }
    // the levels: a white notch with a little flag for high water and low water
    marks.forEach((my, i) => {
      ctx.fillStyle = W.foam; api.rr(g.cx - 9, my - 2, 18, 4, 2); ctx.fill();
      ctx.fillStyle = i === 0 && td ? W.markHigh : W.markLow; ctx.beginPath(); ctx.moveTo(g.cx + 4, my - 2); ctx.lineTo(g.cx + 15, my - 7); ctx.lineTo(g.cx + 4, my - 12); ctx.closePath(); ctx.fill();
    });
    const now = C().tide();
    if (!now || !now.warn) return;
    // the coming change: an arrow over the pole, pulsing in the time before it starts and while the water moves
    const up = now.target < now.y || now.state === 'rising', k = (api.time * 1.6) % 1, ay = top - 10 + (up ? -k * 8 : k * 8);
    ctx.strokeStyle = W.foam; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.95 * Math.sin(k * Math.PI);
    ctx.beginPath(); ctx.moveTo(g.cx - 7, ay + (up ? 5 : -5)); ctx.lineTo(g.cx, ay); ctx.lineTo(g.cx + 7, ay + (up ? 5 : -5)); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // before and while the tide moves: a dashed line where the water will stand, over the open water only
  function drawTideTarget(ctx, c) {
    const now = C().tide(); if (!now || !now.warn) return;
    const y = now.target, cam = api.cam, v = api.view, ty = Math.floor(y / T), x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(api.L.w - 1, Math.floor((cam.x + v.w) / T));
    const fade = now.state === 'low' || now.state === 'high' ? 1 - now.next / C().TIDE.WARN : 1;
    ctx.strokeStyle = api.W.foam; ctx.lineWidth = 2; ctx.globalAlpha = 0.7 * Math.min(1, fade * 1.5); ctx.setLineDash([7, 7]); ctx.lineDashOffset = -api.time * 14;
    ctx.beginPath();
    for (let tx = x0; tx <= x1; tx++) { if (api.isSolid(tx, ty)) continue; ctx.moveTo(tx * T, y); ctx.lineTo(tx * T + T, y); }
    ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
  }

  window.MimoWorlds.register({
    world: 4,
    spawns,
    setup(a) { api = a; },
    init(L, info) {
      const c = C().state(L);
      if (info.reason === 'respawn') return;
      applyEntries(c, info.def || {});
      c.crabBoost = (info.def && info.def.crabBoost) || 0;
      const says = (info.def || {}).says;
      c.says = Array.isArray(says) ? says.filter((e) => e && typeof e.text === 'string').map((e) => ({ x: e.x, y: e.y, r: e.r || SAY_REACH, text: e.text, said: false })) : [];
      for (const s of c.sources) s.last = Math.floor((api.time - s.offset) / s.every) - 1;
      updateFish(c);
    },
    // on a crab that is driven faster Mimo holds still on the shell (else holding the way would walk him off its front)
    // a jump keeps the crab's speed, so leaping off a fast taxi carries Mimo forward
    physics(p) {
      const c = api.L && api.L.coast, b = c && c.ride;
      if (!(b && b.crab && b.boostK > 0.05 && p.wasGrounded && !p.swim)) return null;
      return { run: 0, accel: 3000, jump(q) { const d = (api.input.right ? 1 : 0) - (api.input.left ? 1 : 0); q.vx = b.dir * (b.curSp || b.speed) + d * api.PHYS.RUN * 0.5; return false; } };
    },
    update(dt) {
      const c = api.L && api.L.coast; if (!c) return;
      updateBubbles(c, dt); updateCrabs(c, dt); updateFish(c); keepRide(api.L, c); updateSays(c); updateFlags();
    },
    piep({ x, y }) {
      const c = api.L && api.L.coast; if (!c) return 0;
      let n = 0;
      for (const b of c.crabs) {
        if (Math.hypot(b.x + b.w / 2 - x, b.y - y) > CRAB.PIEP_RANGE * T) continue;
        b.dir = -b.dir; b.hop = 1; n++;
        if (Math.random() < 0.6) DIR().say(b, api.pick(crabScared), { prio: 'player', wait: 0.6, secs: 1.4 });
      }
      return n;
    },
    draw(layer, ctx) {
      const c = api.L && api.L.coast; if (!c) return;
      if (layer === 'back') {
        drawTideTarget(ctx, c);
        for (const g of c.gauges) if (onScreen(g.cx, g.foot - 3 * T, 6 * T)) drawGauge(ctx, g, c);
        for (const s of c.sources) if (onScreen(s.cx, s.floor, 60)) drawVent(ctx, s);
        return;
      }
      if (layer !== 'mid') return;
      for (const b of c.live) {
        if (!onScreen(b.x + b.r, b.y + b.r, 40)) continue;
        if (b.off) drawBubble(ctx, b.x + b.r, b.y + b.r, b.r * (1 + b.popT * 2), Math.max(0, 1 - b.popT / BUB.POP_SHOW) * 0.8, true);
        else { drawBubble(ctx, b.x + b.r, b.y + b.r, b.r, Math.min(1, (api.time - b.born) * 5), true); if (b.item && C().sdraw) C().sdraw.bubbleItem(ctx, b.item, b.x + b.r, b.y + b.r, b.r, api.time); }
      }
      for (const b of c.crabs) if (onScreen(b.x, b.y, 60)) drawCrab(ctx, b);
      for (const f of c.fish) if (onScreen(f.cx, f.cy, 60)) drawFish(ctx, f);
    },
  });
  Object.assign(window.MimoCoast, { BUB, CRAB, PUFF, puffAt });
})();
