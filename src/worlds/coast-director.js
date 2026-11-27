// World 4: the story director. Everything the story says in a level (a figure's line, a theft and the owner's cry, a gag,
// the hand-over at the door, Mimo's own lines at places) goes through ONE queue, so a child can follow it: only one beat
// plays at a time, and the next waits until the bubble before it is gone plus a short breath. Motion (idle, heads,
// digging, the pen) runs on its own and never waits. Pure decoration: only api.time decides, nothing touches the physics.
//
//   MimoCoast.director.say(who, text, o)   queue a line. who: a cast entry (its anchor), 'player' or an anchor { x, y, w }
//     o.prio   'door' 4 (hand-over, finds) | 'player' 3 (caused by Mimo: his own lines, a crab he rides) | 'theft' 2 | 'gag' 1
//     o.wait   seconds it may wait before it is dropped (default by priority); o.secs the bubble time (default by length)
//     o.lead   seconds between the start of the beat and the bubble (o.before() runs at the start: a gesture, a look)
//     o.start(), o.done()   called when the beat begins and when it is over; o.seen: false = the speaker need not be on screen
//     o.ok()   may it start now (checked every frame while it waits); o.dropped() when it waited too long
//     o.front: true   the waiting time counts only from when it is next in turn (the lines of a chain)
//   director.beat(o)    queue a silent beat that holds the stage o.hold seconds (o.start() begins it): a theft
//   director.free(prio) the stage is free now for a beat of this priority (nothing showing, nothing more urgent waiting)
//   director.quiet()    no bubble at all shows: a reaction may say one short word
//   director.secsFor(text)  the reading time of a bubble: 0.8 s + 0.07 s per character, 2.2 to 4.5 s
// A bubble that is shown hides early when its speaker leaves the screen. Lines Mimo or the core say themselves (his
// start line, a piep) also count: the director waits for them. The win card does not wait for lines: the hand-over
// happens before the door when the player walks Mimo to the owner (coast-handover.js holds the card only while the item
// is still changing hands).
(function () {
  'use strict';
  let api = null;
  const PRIO = { door: 4, player: 3, theft: 2, gag: 1 };
  const WAIT = { 4: 6, 3: 3, 2: 8, 1: 3 };           // how long a line may wait for the stage, by priority
  const BREATH = 0.5, MIN = 2.2, MAX = 4.5, PER = 0.07, BASE = 0.8;
  const secsFor = (text) => Math.max(MIN, Math.min(MAX, BASE + PER * String(text || '').length));

  function state() {
    const L = api && api.L; if (!L || api.mode !== 'level' || !L.story) return null;
    return L.w4dir || (L.w4dir = { q: [], cur: null, breath: 0, seq: 0 });
  }
  const anchorOf = (who) => (who === 'player' ? 'player' : who && who.anchor ? who.anchor : who);
  function inView(a, m) {
    if (a === 'player') return true;
    if (!a) return false;
    const c = api.cam, v = api.view, x = a.x + (a.w || 0) / 2;
    return x > c.x + m && x < c.x + v.w - m && a.y > c.y + m && a.y < c.y + v.h + 40;
  }
  // any bubble shown or waiting to show (the core's start line waits 0.9 s before it shows)
  const showing = () => (api.G.bubbles || []).some((b) => b.life < b.max - 0.05);

  function push(d, item) {
    const prio = typeof item.prio === 'number' ? item.prio : PRIO[item.prio] || 1;
    const wait = item.wait == null ? WAIT[prio] || 6 : item.wait;
    d.q = [...d.q, { ...item, prio, wait, seq: d.seq++, until: api.time + wait, since: null }];
  }
  // a line through the queue; outside a level of this world (boss, opening) it is said at once
  function say(who, text, o) {
    o = o || {};
    const d = state(), anchor = anchorOf(who);
    if (!d) { if (text) api.bubble(text, anchor, o.secs || secsFor(text)); return; }
    push(d, { ...o, kind: 'line', who, text, anchor });
  }
  function beat(o) { const d = state(); if (!d) { if (o.start) o.start(); return; } push(d, { ...o, kind: 'beat' }); }
  function free(prio) {
    const d = state(); if (!d) return true;
    const pr = typeof prio === 'number' ? prio : PRIO[prio] || 1;
    return !d.cur && !showing() && api.time >= d.breath && !d.q.some((it) => it.prio >= pr);
  }
  const quiet = () => { const d = state(); return !showing() && !(d && d.cur); };

  function begin(d, it) {
    d.cur = { ...it, k: 0, said: false };
    if (it.before) it.before();
    if (it.start) it.start();
    if (it.kind === 'line' && !it.lead) speak(d.cur);
  }
  function speak(c) { c.said = true; if (c.text) api.bubble(c.text, c.anchor, c.secs || secsFor(c.text)); }
  function pick(d) {
    const late = (it) => (it.front ? it.since != null && api.time > it.since + it.wait : api.time > it.until);
    const live = d.q.filter((it) => !late(it)), dropped = d.q.filter(late);
    for (const it of dropped) if (it.dropped) it.dropped();
    // the first line in order goes first: if its speaker is not on screen yet, the stage waits for it (or until it is
    // dropped), so a chain never comes out of order; a beat that cannot start yet (a theft out of view) lets others go
    const order = [...live].sort((a, b) => b.prio - a.prio || a.seq - b.seq);
    let next = null;
    for (const it of order) {
      if (it.since == null) it.since = api.time;   // a chain line (front) counts its waiting from when it is next in turn
      if (it.ok && !it.ok()) continue;
      if (it.kind === 'beat' || it.seen === false || inView(it.anchor, 16)) next = it;
      break;
    }
    if (dropped.length) d.log = [...(d.log || []), ...dropped.map((it) => ({ t: +api.time.toFixed(2), text: it.text || 'beat' }))];
    d.q = next ? live.filter((it) => it !== next) : live;
    return next;
  }
  // a bubble whose speaker has left the screen fades out early
  function trimOffscreen() {
    for (const b of api.G.bubbles || []) {
      if (b.anchor === 'player' || b.life < 0 || b.life > b.max - 0.3) continue;
      if (!inView(b.anchor, -60)) b.life = b.max - 0.3;
    }
  }
  function update(dt) {
    const d = state(); if (!d) return;
    const st = api.state; if (st !== 'play' && st !== 'win') return;
    trimOffscreen();
    // while the story talks or waits to, Mimo's own idle gags (the core's) stay off: he is watching
    if (api.p && (d.cur || d.q.length)) api.p.gagDone = true;
    const c = d.cur;
    if (c) {
      c.k += dt;
      if (c.kind === 'line' && !c.said && c.k >= (c.lead || 0)) speak(c);
      const over = c.kind === 'beat' ? c.k >= (c.hold || 0) : c.said && !showing() && c.k >= (c.hold || 0);
      if (over) { d.cur = null; d.breath = api.time + BREATH; if (c.done) c.done(); }
    } else if (showing()) d.breath = Math.max(d.breath, api.time + BREATH);
    else if (api.time >= d.breath) { const it = pick(d); if (it) begin(d, it); }
  }

  window.MimoCoast = window.MimoCoast || {};
  window.MimoCoast.director = { say, beat, free, quiet, secsFor, PRIO };
  window.MimoCoast.directorHooks = { update };   // another world runs the same director (volcano-story.js)
  window.MimoWorlds.register({ world: 4, setup(a) { api = a; }, update });
})();
