// World 4 puppets: a live jointed family figure (coast-rig*.js) wrapped for the story engine, and the small reaction layer
// every cast entry gets for free. Replaces the static sprites.
//
// A Puppet is stepped by the game (never by the real clock): step(dt, x, o) gets the world x of the figure and derives the
// walking speed from how far it moved, so legs move exactly when the figure moves. Everything random (blinks, weight
// shifts) is seeded, so a level replays the same. Only figures near the camera are stepped and drawn.
//
// API for scene scripts (cast entries `e` come from MimoCoast.storyEnv.story().cast, found by `tag`):
//   MimoCoast.cast.walkTo(e, xPx, { speed: tiles/s (1.1 walk, 3+ run), faceEnd: 1 | -1 })   walk or run there, then stand
//   MimoCoast.cast.pose(e, name | null)    hold a pose until changed: wave fan pen mic cam hooray applaud write point flail
//                                          balance thumb hop pat kick (see coast-cast-actions.js), null = idle
//   MimoCoast.cast.play(e, name, opts)     one gesture, then back to idle (wave cheer pen mic clap film throw hooray applaud flinch)
//   MimoCoast.cast.say(e, text, secs)      speech bubble over the head
//   MimoCoast.cast.expr(e, name | null)    face: 'ouch' (striped only), 'wow' (kid), 'serious' / 'sure' (professor), 'daze'; null = normal
//   MimoCoast.cast.look(e, dxPx | null)    look at a spot dx px to the right of the figure (null = follow Mimo when near)
//   MimoCoast.cast.cheer(e) / cast.wince(e)  the reaction gestures the layer uses itself
//   MimoCoast.cast.hand(e, 'l' | 'r')      [x, y] of a hand, in px relative to the feet (for props drawn by an act)
//   MimoCoast.cast.head(e), cast.ankle(e, 'l' | 'r')   the middle of the head and an ankle, the same way
//   MimoCoast.cast.propAs(e, 'mic', 'banana' | null)   swap the prop a gesture shows; cast.carry(e, 'spade', 'r') carry one
//   MimoCoast.puppet(who, seed)            a free figure for a picture of its own (the opening): returns null until the
//                                          pictures have loaded; p.step(dt, x, o), p.draw(ctx, x, foot, { scale })
(function () {
  'use strict';
  window.MimoCoast = window.MimoCoast || {};
  const C = window.MimoCoast;
  let api = null;
  const T = 32, FAMILY = ['striped', 'sidepart', 'redbeard', 'reporter', 'filmer', 'kid', 'professor'];
  const RASTER = 3;                        // layer pictures are made at 3x: crisp when a phone scales the game up
  const TICK = 1 / 60;                     // figures are stepped at 60 Hz, the game runs at 120
  const SIGNATURE = { filmer: 'film', professor: 'pen', reporter: 'mic' }; // what an idle person does now and then
  const BURNS = { striped: [1, 2, 3, 4] };   // sunburn steps made ahead of time (the sleeper on the mattress)
  const LOOK_RANGE = 8 * T, LOOK_UP = 6 * T;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- loading ----------
  const shared = {};
  let started = false;
  function preload() {
    if (started || typeof Image === 'undefined' || !C.FamilyFigure) return;
    started = true;
    for (const who of FAMILY) {
      C.FamilyFigure.preload(C.FAMILY_RIGS[who]).then((s) => { shared[who] = s; if (BURNS[who] && C.FamilyFigure.warmBurn) C.FamilyFigure.warmBurn(s, C.FAMILY_RIGS[who], BURNS[who]); }).catch((e) => console.error('Welt: Figur ' + who + ' nicht ladbar', e));
    }
  }
  const ready = () => FAMILY.every((w) => shared[w]);

  // ---------- the puppet ----------
  class Puppet {
    constructor(who, fig) {
      this.who = who; this.fig = fig; this.rig = fig.rig;
      this.lastX = null; this.acc = 0; this.dx = 0; this.vx = 0;
      this.pose = null; this.poseOpts = {}; this.pending = null;
      this.nextSig = 2 + fig.rnd() * 8;
      this.clock = 0;
    }
    // x = world x of the figure; o: { look: dx to look at | undefined, face: -1|1|0, amp, idle: false to stop idle gestures, pose, poseOpts }
    step(dt, x, o) {
      const f = this.fig;
      if (this.lastX == null) this.lastX = x;
      this.dx += x - this.lastX; this.lastX = x; this.acc += dt; this.clock += dt;
      if (this.acc < TICK - 1e-6) return;
      const d = this.acc, vx = this.dx / d; this.acc = 0; this.dx = 0;
      this.vx += (vx - this.vx) * 0.5;
      f.setSpeed(Math.abs(this.vx) < 3 ? 0 : this.vx);
      f.faceDir = o.face || 0;
      f.lookAt = o.look;
      this.setPose(o.pose || null, o.poseOpts || {});
      if (f.act) f.act.amp = o.amp;
      this.manage();
      if (o.idle !== false && !f.act && !this.pending && !this.pose && Math.abs(this.vx) < 3 && this.clock > this.nextSig) {
        this.nextSig = this.clock + 9 + f.rnd() * 6;
        if (SIGNATURE[this.who]) f.startAct(SIGNATURE[this.who]);
      }
      f.update(d, {});
    }
    setPose(name, opts) {
      if (name === this.pose && (opts.dir || 0) === (this.poseOpts.dir || 0)) return;
      this.pose = name; this.poseOpts = opts;
      if (this.fig.act && this.fig.act.loop) this.fig.stopAct();
    }
    // start what is wanted as soon as the figure's hands are free
    manage() {
      const f = this.fig;
      if (f.act) return;
      if (this.pending) { f.startAct(this.pending[0], this.pending[1]); this.pending = null; return; }
      const def = this.pose && C.castPoses && C.castPoses[this.pose];
      if (def) f.startAct(def.act, { loop: def.loop, pose: this.pose, dir: def.sided ? (this.poseOpts.dir || 1) : undefined });
    }
    // one gesture now (waits for a running one to end)
    play(name, opts) { if (this.fig.act && this.fig.act.loop) this.fig.stopAct(); this.pending = [name, opts || {}]; }
    draw(ctx, x, foot, o) {
      o = o || {};
      const f = this.fig;
      f.tint = o.red || o.night ? { red: o.red | 0, night: o.night | 0 } : null;
      f.draw(ctx, x, foot, o.scale || 1, { dpr: RASTER, noShadow: !!o.noShadow });
    }
    // a hand, in px relative to the feet and scaled
    hand(k, scale) {
      const a = this.fig.frame && this.fig.frame.arms[k === 'l' ? 'left' : 'right'];
      return a ? [(a.H[0] - this.rig.center) * (scale || 1), (a.H[1] - this.rig.ground) * (scale || 1)] : [0, 0];
    }
  }
  function puppet(who, seed) {
    preload();
    if (!shared[who] || !C.FAMILY_RIGS[who]) return null;
    return new Puppet(who, new C.FamilyFigure(C.FAMILY_RIGS[who], shared[who], seed));
  }

  // ---------- entries ----------
  // the figure fades in over a moment when its pictures arrive late (no pop on the first frame)
  const entryPuppet = (e) => { if (!e.pp) { e.pp = puppet(e.who, Math.floor(e.phase * 1000) + 7); if (e.pp) e.ppT = api ? api.time : 0; } return e.pp; };

  // walk or run to x (px), then stand; a position is a function of the game time, so replays are exact
  function walkTo(e, tx, o) {
    o = o || {};
    const from = e.pos ? e.pos.x : e.x0;
    e.mv = { fx: from, tx, speed: o.speed || 1.1, t0: api.time + (o.delay || 0), faceEnd: o.faceEnd || (tx >= from ? 1 : -1) };
    return Math.abs(tx - from) / ((o.speed || 1.1) * T);   // seconds it takes
  }
  const pose = (e, name, opts) => { e.pose = name === 'stand' ? null : name; e.poseOpts = opts || null; };
  const play = (e, name, opts) => { const p = entryPuppet(e); if (p) p.play(name, opts); return !!p; };
  const say = (e, text, secs) => api.bubble(text, e.anchor, secs || 2.4);
  const expr = (e, name) => { const p = entryPuppet(e); if (p) p.fig.expr = name || null; };
  const look = (e, dx) => { e.lookDx = dx == null ? null : dx; };
  const hand = (e, k) => { const p = e.pp; return p ? p.hand(k, e.scale || 1) : [0, 0]; };
  // the middle of the head and an ankle ('l' | 'r'), in px relative to the feet (glasses on a nose, a flip-flop on a foot)
  const rel = (e, pt) => { const r = e.pp.rig, s = e.scale || 1; return [(pt[0] - r.center) * s, (pt[1] - r.ground) * s]; };
  const head = (e) => { const f = e.pp && e.pp.fig; return f && f.frame && C.RigMath ? rel(e, C.RigMath.M.apply(f.frame.head, e.pp.rig.headCenter)) : [0, -(e.top || 52) + 14]; };
  const ankle = (e, k) => { const f = e.pp && e.pp.fig, l = f && f.frame && f.frame.legs[k === 'l' ? 'left' : 'right']; return l ? rel(e, l.A) : [k === 'l' ? -4 : 4, -3]; };
  // what a hand holds: propAs(e, 'mic', 'banana') swaps the prop of a gesture (null = empty hand); carry(e, 'spade', 'r') holds one
  const propAs = (e, from, to) => { e.propSwap = { ...(e.propSwap || {}), [from]: to }; };
  const carry = (e, name, k) => { e.holdProp = name ? { name, hand: k || 'r', upright: true } : null; };

  // ---------- reactions: what Mimo does, the family notices ----------
  const ev = { stars: 0, dead: false, deaths: 0, find: false, at: null, air: 0, wasGround: true };
  const HARD_AIR = 0.75;                   // a landing after this long in the air counts as a hard jump: the family cheers
  const GROANS = ['Oooh!', 'Autsch!', 'Uff!'];
  // a reaction says at most one short word, and only when no story line is showing (coast-director.js)
  const quiet = () => !C.director || C.director.quiet();
  function track(st, dt) {
    const g = api.G, p = api.p;
    ev.star = false; ev.death = false; ev.find = ev.findNext; ev.findNext = false; ev.jump = false; ev.land = false;
    if (p && api.state === 'play') {
      const ground = !!p.grounded && !p.swim;
      if (!ground) ev.air = p.swim ? 0 : ev.air + dt;   // a swim is no jump
      if (ground && !ev.wasGround && ev.air > HARD_AIR) ev.land = true;
      if (!ground && ev.wasGround && p.vy < -200) ev.jump = true;
      if (ground) ev.air = 0;
      ev.wasGround = ground;
    }
    if (st.seenStars == null) st.seenStars = g.starsGot | 0;
    if ((g.starsGot | 0) > st.seenStars) { ev.star = true; }
    st.seenStars = g.starsGot | 0;
    const dead = api.state === 'dead';
    if (dead && !st.wasDead) { ev.death = true; ev.deaths++; }
    st.wasDead = dead;
    ev.at = p ? { x: p.x + p.w / 2, y: p.y + p.h } : null;
  }
  // the engine tells the layer about a find (Mimo picked up the lost item)
  const found = () => { ev.findNext = true; };

  function react(e, p, pos) {
    if (!ev.at) return;
    const dx = Math.abs(ev.at.x - pos.x), dy = Math.abs(ev.at.y - pos.foot);
    if (e.copy) copycat(e, p, dx, dy);
    if (!(ev.star || ev.death || ev.find || ev.land)) return;
    if (dy > 6 * T) return;
    if (ev.find && dx < 14 * T) { p.play('hooray'); return; }
    if (ev.star && dx < 7 * T && !(p.fig.act && !p.fig.act.loop)) { p.play('applaud'); return; }
    if (ev.land && dx < 10 * T && !(p.fig.act && !p.fig.act.loop)) {
      p.play('hooray');
      if (!ev.said && quiet() && api.hash(Math.round(pos.x), Math.round(api.time)) < 0.3) { ev.said = true; api.bubble('Wow!', e.anchor, 1.3); }
      return;
    }
    if (ev.death && dx < 8 * T) {
      p.play('flinch', { dir: ev.at.x >= pos.x ? 1 : -1 });
      if (!ev.said && quiet() && api.hash(Math.round(pos.x), ev.deaths) < 0.6) { ev.said = true; api.bubble(GROANS[ev.deaths % GROANS.length], e.anchor, 1.3); }
    }
  }
  // the kid copies Mimo's jump a moment later and lands on his bottom (drawn by castDraw through e.copyT)
  const COPY_RANGE = 6 * T, COPY_REST = 5;
  function copycat(e, p, dx, dy) {
    const t = api.time;
    if (ev.jump && dx < COPY_RANGE && dy < 3 * T && !(e.copyT != null && t - e.copyT < COPY_REST) && !e.mv) { e.copyT = t + 0.3; e.copyFx = 0; }
    if (e.copyT == null) return;
    const k = t - e.copyT;
    if (k >= 0 && e.copyFx === 0) { e.copyFx = 1; p.play('hooray'); }
    if (k >= 0.48 && e.copyFx === 1) {
      e.copyFx = 2; p.play('flinch', { dir: 1 });
      window.MimoCoast.pop(e.pos ? e.pos.x : e.x0, e.foot - 40, 'Plumps!', { size: 15, fill: '#F2C79B' });
      api.burst(e.pos ? e.pos.x : e.x0, e.foot - 2, 8, ['#E8CF9C', '#D2B27A'], 90, { grav: 300, vy: -60, life: 0.4, r: 1.8 });
    }
  }
  // the filmer turns her camera on Mimo while he is near; a high five when he passes close
  function extras(e, p, pos) {
    const m = api.p; if (!m || api.state !== 'play') { e.filmDir = 0; return; }
    const mx = m.x + m.w / 2, dx = mx - pos.x, dy = Math.abs(m.y + m.h - pos.foot);
    if (e.films) e.filmDir = Math.abs(dx) < 9 * T && dy < 4 * T ? (dx >= 0 ? 1 : -1) : 0;
    if (e.five && Math.abs(dx) < 1.2 * T && dy < 1.2 * T && !(e.fiveT != null && api.time - e.fiveT < 4)) {
      e.fiveT = api.time; p.play('cheer');
      const h = p.hand('r', e.scale || 1); api.burst(pos.x + h[0], pos.foot + h[1] - 18, 8, ['#FFE08F', '#FFFFFF'], 90, { grav: 0, life: 0.35, r: 2 });
      api.floater(pos.x, pos.foot - (e.top || 52) - 10, 'Klatsch!', '#F6A9BF');
    }
  }

  // update one human entry: pos = where the engine puts it, want = { pose, poseOpts, face, amp, idle }
  function stepEntry(e, dt, pos, want, onScreen) {
    if (!onScreen) { if (e.pp) e.pp.lastX = null; return; }
    const p = entryPuppet(e);
    if (!p) return;
    const m = api.p;
    let lk;
    if (e.lookDx != null) lk = e.lookDx;
    else if (m && Math.abs(m.x + m.w / 2 - pos.x) < LOOK_RANGE && Math.abs(m.y + m.h - pos.foot) < LOOK_UP) lk = m.x + m.w / 2 - pos.x;
    p.fig.propSwap = e.propSwap || null; p.fig.holdProp = e.holdProp || null;
    // a rider (want.still) moves with its mount but must not walk: its legs see no change of place
    p.step(dt, want.still && p.lastX != null ? p.lastX : pos.x, { look: lk, face: want.face, pose: want.pose, poseOpts: want.poseOpts, amp: want.amp, idle: want.idle });
    react(e, p, pos); if (e.films || e.five) extras(e, p, pos);
  }
  function frame(st, dt) { ev.said = false; track(st, dt); }

  C.puppet = puppet;
  C.cast = { walkTo, pose, play, say, expr, look, hand, head, ankle, propAs, carry, cheer: (e) => play(e, 'hooray'), wince: (e) => play(e, 'flinch'), found };
  C.castKit = { stepEntry, frame, entryPuppet, ready, preload, FAMILY, RASTER };
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; setTimeout(preload, 800); } });
})();
