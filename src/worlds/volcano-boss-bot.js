// World 5 boss "Drache Fauch": what tools/bosscheck.mjs needs. A bot that plays the fight the way it is meant to be
// played (leave the ledge that glows, wait near the chin rock, then up the rock, the snout, onto the valve ledge and the
// lever; step away from glowing blobs), the moments to take pictures of. Never used by the game itself.
// The bot thinks in "u" (px from the far wall, see volcano-boss-shape.js), so one plan fits all three floors.
(function () {
  'use strict';
  const F = () => window.MimoFauch;

  // where it waits on the floor ledge, the free spot on the chin rock, the snout, a safe spot on the rock while he is away
  const HOME = 520, JUMP_AT = 528, ROCK = 592, SNOUT = 634, ROCK_FREE = 650, LEVER = 556, BLOB_NEAR = 38, BLOB_SOON = 0.55, BLOB_STEP = 74;
  let mem = { B: null, aim: null };
  const memFor = (B) => { if (mem.B !== B) mem = { B, aim: null }; return mem; };
  const phaseOf = (B) => { const P = B.def.phases; let i = 0; while (i + 1 < P.length && B.hp <= P[i + 1]) i++; return i; };

  function bot(B, h) {
    const m = memFor(B), p = h.G.p, s = phaseOf(B), X = (u) => F().realX(s, u), u = F().uOf(s, p.x + p.w / 2), feet = p.y + p.h;
    if (B.done) { if (B.hornsOn && h.G.L.door) h.moveTo(h.G.L.door.x * h.T + h.T / 2, 3); else h.go(0); return; }
    if (B.state === 'enter' || B.state === 'scene') { h.go(0); m.aim = null; return; }
    // in the air on the way somewhere: steer there
    if (!p.grounded && m.aim != null) { h.moveTo(m.aim, 2); return; }
    if (p.grounded) m.aim = null;
    if (!p.grounded) { h.go(0); return; }
    const y = (r) => F().secY(s, r), R = F().R, onHead = p.carried && p.carried.fauch;
    const at = onHead ? p.carried.fauch : Math.abs(feet - y(R.F)) < 2 ? 'F' : Math.abs(feet - y(R.C)) < 2 && u >= 572 ? 'C' : Math.abs(feet - y(R.V)) < 2 ? 'V' : 'other';
    const leap = (toU) => { m.aim = X(toU); h.jump(44); h.moveTo(m.aim, 2); };
    // 1. the fire: once the ledge glows (the band stays put), leave it
    const br = B.breath, threat = br && (B.state === 'charge' || (B.state === 'breathe' && br.burn));
    if (threat && Math.abs(br.feet - feet) < 40) {
      if (at === 'F') { if (u >= JUMP_AT) leap(ROCK_FREE); else h.moveTo(X(JUMP_AT + 8), 3); return; }
      if (at === 'C' || at === 'snout' || at === 'skull') { h.moveTo(X(HOME), 4); return; }
      if (at === 'V') { m.aim = X(ROCK_FREE); h.moveTo(m.aim, 3); return; }
      h.moveTo(X(HOME), 4); return;
    }
    if (br && (B.state === 'charge' || B.state === 'breathe')) { h.go(0); return; }
    // 2. a glowing blob about to land here: step aside along the ledge
    const blob = B.shots.find((q) => q.type === 'fauchBlob' && Math.abs(q.tx - (p.x + p.w / 2)) < BLOB_NEAR && 0.9 - q.t < BLOB_SOON + 0.35);
    if (blob) { const dir = blob.tx > p.x + p.w / 2 ? -1 : 1; h.moveTo(p.x + p.w / 2 + dir * BLOB_STEP, 3); return; }
    // 3. he rests: rock, snout, valve ledge, lever
    if (F().resting(B) && !B.hm) {
      if (B.water) { h.go(0); return; }
      if (at === 'F') { if (u >= JUMP_AT) leap(ROCK); else h.moveTo(X(JUMP_AT + 8), 3); return; }
      if (at === 'C') { if (Math.abs(u - ROCK) > 10) h.moveTo(X(ROCK), 3); else leap(SNOUT); return; }
      if (at === 'snout' || at === 'skull') { leap(LEVER); return; }
      if (at === 'V') { h.moveTo(X(LEVER), 2); return; }
      h.moveTo(X(HOME), 4); return;
    }
    // 4. otherwise: wait on the floor ledge near the rock (after a hit, stay on the valve ledge until the fire comes)
    if (at === 'V' && (B.state === 'hurt' || B.water)) { h.go(0); return; }
    if (at === 'C' && B.state === 'fly') { h.go(0); return; }
    if (at === 'F' || at === 'other') { h.moveTo(X(HOME), 6); return; }
    if (at === 'C') { h.moveTo(X(HOME), 4); return; }
    h.go(0);
  }

  // pictures for tools/bosscheck.mjs --shots (conditions on B, G, ph); "scene-" ones are taken during the scenes
  const checkShots = {
    'p1-track': 'ph===0&&B.state==="track"&&B.t>0.6',
    'p1-charge': 'ph===0&&B.state==="charge"&&B.t>0.8',
    'p1-fire': 'ph===0&&B.state==="breathe"&&B.t>0.3&&B.t<0.5',
    'p1-rest': 'ph===0&&B.state==="pant"&&G.p.carried&&G.p.carried.fauch==="snout"',
    'p1-shower': 'ph===0&&B.water&&B.water.front>B.head.y-90&&B.state==="pant"',
    'p1-hit': 'ph===0&&B.state==="hurt"&&B.t>0.15',
    'p1-worry': 'ph===0&&B.state==="hurt"&&B.worryAt!=null&&G.time-B.worryAt>0.95&&G.time-B.worryAt<1.05',
    'scene-slab': 'B.scene&&B.scene.ph===1&&B.scene.t>2.1',
    'scene-hot': 'B.scene&&B.scene.ph===1&&B.scene.t>3.5',
    'p2-spit': 'ph===1&&B.shots.some(s=>s.type==="fauchBlob"&&s.t>0.5)',
    'p2-fire': 'ph===1&&B.state==="breathe"&&B.t>0.3&&B.t<0.5',
    'p2-rest': 'ph===1&&B.state==="pant"&&G.p.carried&&G.p.carried.fauch',
    'p2-hit': 'ph===1&&B.state==="hurt"&&B.t>0.15',
    'p2-worry': 'ph===1&&B.state==="hurt"&&B.worryAt!=null&&G.time-B.worryAt>0.95&&G.time-B.worryAt<1.05',
    'scene-ride': 'B.scene&&B.scene.ph===2&&B.scene.t>2.3',
    'scene-look': 'B.scene&&B.scene.ph===2&&B.scene.t>3.95',
    'p3-double': 'ph===2&&B.state==="charge"&&B.breath&&B.breath.n===1&&B.t>0.5',
    'p3-fire2': 'ph===2&&B.state==="breathe"&&B.breath&&B.breath.n===1&&B.t>0.35&&B.t<0.5',
    'p3-rest': 'ph===2&&B.state==="pant"&&G.p.carried&&G.p.carried.fauch',
    'win-sneeze': 'B.done&&B.t>0.5&&B.t<0.6',
    'win-fly': 'B.done&&B.t>1.4&&B.t<1.5',
    'win-rim': 'B.done&&B.t>4.2&&B.t<4.3',
    'win-horns': 'B.done&&B.hornsOn&&B.t>6.05',
  };

  Object.assign(window.MimoFauch = window.MimoFauch || {}, { bot, checkShots, idleSpots: [] });
  // an empty part: says which world this file belongs to (the app build leaves the files of unreleased worlds out)
  window.MimoWorlds.register({ world: 5 });
})();
