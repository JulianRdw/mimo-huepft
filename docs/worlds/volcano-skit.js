// World 5: the main family scene of a level ("Szene"), told as one chain of beats through the story director
// (coast-director.js): nothing else talks meanwhile, each beat waits until the one before is over, every action has a
// lead-in (a gesture before the line), and afterwards everybody keeps the pose they ended in. Pure decoration, game time only.
//
// Level field  scene: { at, atRow?, atDir?, steps: [step, ...] }   (or `scenes: [ ... ]` for more than one, rare)
//   at / atRow / atDir   the trigger like the Fauch acts (volcano-fauch.js): Mimo's centre passes tile column `at`
//                        (atDir -1: to the left), and/or his feet are at or above row `atRow`
//   step   { by, say, secs, lead, do: [op...], after: [op...], hold, wait }
//          by: a cast tag, 'player' (Mimo) or 'bro:1'..'bro:3' (a Funkenbruder); say: the line (a bubble over the speaker); lead: seconds between `do` and the
//          bubble (default 0.6 when there is a `do`); after: ops when the bubble is gone. sync: [x, y, phase] waits until the
//          geyser G at x, y is in that phase (default 'rise'), so a step can happen exactly when the geyser goes off (a fire hopper F
//          at x, y: 'up' just jumped, 'down', 'rest'). near: x | [x, row]
//          waits until Mimo's centre is at or right of tile column x (and his feet at or above row), so a step can wait for him
//          (give such a step a long `wait`). Without `say` the step is a silent
//          beat that runs `do` and holds the stage `hold` seconds (default 1.2). wait: how long it may wait for its turn (14)
//   op     ['pose', tag, name | null, dir]   hold a pose (wave point hooray applaud write thumb eyes fanface duck grill read ...)
//          ['play', tag, gesture]           one gesture (wave cheer clap hooray applaud flinch)
//          ['walk', tag, tileX, speed, faceEnd]   walk (1.1) or run (3+) to the middle of that tile
//          ['look', tag, dxTiles | null]   look at a spot (null: follow Mimo again)
//          ['face', tag, 1 | -1]           ['expr', tag, name | null]      ['set', tag, { fields }] (pack, sausage, act, size ...)
//          ['pop', x, y, text, size, life]  a comic word at tile x, row y (life: seconds, default 1.5)      ['float', tag, text]  a small word over the figure
//          ['shake', k]  ['burst', x, y] (sparks and ash at tile x, row y)
//          ['splash', x, y] (water drops)  ['timer', tag, secs] (a camera prop starts its self-timer)  ['mood', name, secs]  (Mimo)   ['flash', tag]  a camera prop fires its flash now
//          ['fx', name, ...args]  a named effect of MimoVolcano.skitFx (volcano-mimo.js has Mimo's: inhale, squeak, laugh)
//          ['later', secs, [op...]]  run ops later (game time)
//          ['go', tag, { fields }]       start a timed act of volcano-story-acts2.js / -pets.js now: t0 = game time, fields merged (aim, items ...)
//          ['act', tag, 'name', { fields }]   switch the figure to another act (teach pickup sleepwalk rummage stuck count interview weather
//                                         live roof wavebig tryhop hop kick grill2 hint chase perch ...) and start it now
//          ['share', tag, [tag, ...], gap]   the scarf is shared: `tag` (the giver, pose give) turns to each figure in turn, every gap seconds
//                                         (default 1.3) the next one gets scarf: true
//          ['kick', tag, stoneTag]       the redbeard kicks: his act starts now, the rollstone starts rolling when his foot meets it
//          ['state', tag, value]         sets `state` (the thesis board: kein strich papa herz)
// MimoVolcano.skitFx[name] = (args, S) => {}  adds effects; S: { api, find(tag), at(x, y) (tiles to px) }.
(function () {
  'use strict';
  let api = null;
  const T = 32;
  const C = () => window.MimoCoast, DIR = () => window.MimoCoast.director, V = () => window.MimoVolcano;
  const PRIO = 2.5;
  const find = (tag) => C().scene.find(tag);
  const S = { get api() { return api; }, find, at: (x, y) => ({ x: (x + 0.5) * T, y: y * T }) };

  function op(o) {
    const [k, a, b, c, d, f] = o, e = typeof a === 'string' ? find(a) : null;
    switch (k) {
      case 'pose': if (e) C().scene.hold(e, b || null, b && c ? { dir: c } : null); break;
      case 'play': if (e) C().cast.play(e, b); break;
      case 'walk': if (e) C().cast.walkTo(e, (b + 0.5) * T, { speed: c || 1.1, faceEnd: d || e.face || 1 }); break;
      case 'look': if (e) C().cast.look(e, b == null ? null : b * T); break;
      case 'face': if (e) { e.face = b; e.faceEnd = b; if (e.mv) e.mv.faceEnd = b; } break;
      case 'expr': if (e) C().cast.expr(e, b || null); break;
      case 'set': if (e) { Object.assign(e, b); if ('sausage' in b && C().acts.grill) C().acts.grill.update(e); if (('pack' in b || 'scarf' in b) && V().extraFor) e.extra = V().extraFor(e); } break;
      case 'pop': C().pop((a + 0.5) * T, b * T, c, { size: d || 22, fill: '#F28C82', life: f }); break;
      case 'float': if (e) api.floater(e.pos ? e.pos.x : e.x0, (e.pos ? e.pos.foot : e.foot) - e.top - 6, b, '#8E8CA3'); break;
      case 'shake': api.shake(a); break;
      case 'burst': api.burst((a + 0.5) * T, b * T, 14, ['#FFD58A', '#FF9A55', '#B9B3C9'], 130, { grav: 380, life: 0.6 }); break;
      case 'splash': api.burst((a + 0.5) * T, b * T, 22, ['#BFE6F2', '#FFFFFF', '#9ED3EE'], 170, { grav: 420, vy: -160, life: 0.8 }); break;
      case 'timer': if (e) { e.t0 = api.time; e.timer = b || 5; e.flashAt = null; } break;
      case 'mood': api.setMood(a, b || 1); break;
      case 'flash': if (e) { e.flashAt = api.time; api.noise({ hp: 3000, dur: 0.08, vol: 0.03 }); } break;
      case 'go': if (e) Object.assign(e, b || {}, { t0: api.time }); break;
      case 'act': if (e) { Object.assign(e, c || {}, { act: b, t0: api.time, pose: null, poseOpts: null }); e.over = null; } break;
      case 'state': if (e) e.state = b; break;
      case 'kick': { const s = find(b); if (e) Object.assign(e, { act: 'kick', t0: api.time, pose: null }); if (s) s.t0 = api.time + 0.62; break; }
      case 'share': {
        const list = b || [], gap = c || 1.3; if (!e) break;
        list.forEach((tag, i) => { const q = find(tag); if (!q) return; run([['later', i * gap, [['face', a, Math.sign(q.x0 - e.x0) || 1], ['act', a, 'give', {}], ['set', tag, { scarf: true }]]]]); });
        run([['later', list.length * gap + 0.6, [['act', a, 'proud', {}]]]]); break;
      }
      case 'fx': { const f = V().skitFx && V().skitFx[a]; if (f) f(o.slice(2), S); break; }
      case 'later': { const host = (api.L.story.cast[0]) || null; if (host) C().scene.later(host, a, () => run(b)); break; }
      default: break;
    }
  }
  const run = (ops) => { for (const o of ops || []) op(o); };

  // a step may wait for a geyser of the level: sync [x, y, phase] (the geyser G at x, y is in that phase: warn rise hold fall)
  // or for a fire hopper F at x, y (when no geyser is there): phase 'up' (it has just jumped and rises), 'down', 'rest'
  function synced(sy) {
    const v = api.L.volcano, g = v && v.geysers.find((q) => q.tx === sy[0] && q.ty === sy[1]); if (g) return g.phase === (sy[2] || 'rise');
    const h = v && v.hoppers.find((q) => q.tx === sy[0] && q.ty === sy[1]); if (!h) return true;
    return sy[2] === 'rest' ? !h.fly : sy[2] === 'down' ? h.fly && !h.up : h.fly && h.up;
  }
  // a Funkenbruder (fire hopper with bro: n, volcano-mimo.js) speaks from his home in the lava
  function broAnchor(n) { const v = api.L.volcano, h = v && v.hoppers.find((q) => q.bro === n); return h ? { x: h.x - 10, y: h.home - 36, w: 20 } : null; }
  // a step may wait for Mimo: near x | [x, row] (his centre at or right of column x, his feet at or above row)
  function reached(n) { const [x, row] = Array.isArray(n) ? n : [n, null]; return fired({ at: x, atRow: row }); }
  // every step waits for the one before (the director lets a waiting step be passed by the next one otherwise)
  function queue(sc) {
    sc.queued = true;
    let prev = null;
    for (const st of sc.steps) {
      const who = st.by === 'player' ? 'player' : /^bro:/.test(st.by || '') ? broAnchor(+st.by.slice(4)) : st.by ? find(st.by) : null, me = { begun: false, over: false }, before = prev;
      const ok = () => (!before || before.over) && (!st.sync || synced(st.sync)) && (st.near == null || reached(st.near));
      const base = { prio: PRIO, front: true, wait: st.wait || 14, ok, dropped: () => { me.over = true; } };
      const start = () => { me.begun = true; run(st.do); }, done = () => { me.over = true; run(st.after); };
      if (st.say && who) DIR().say(who, st.say, { ...base, secs: st.secs, lead: st.lead != null ? st.lead : st.do ? 0.6 : 0, before: start, done });
      else DIR().beat({ ...base, hold: st.hold != null ? st.hold : 1.2, start, done });
      prev = me;
    }
  }
  const fired = (sc) => {
    const p = api.p; if (!p) return false;
    const x = p.x + p.w / 2, y = p.y + p.h;
    const xOk = sc.at == null || ((sc.atDir || 1) > 0 ? x >= (sc.at + 0.5) * T : x <= (sc.at + 0.5) * T);
    return xOk && (sc.atRow == null || y <= (sc.atRow + 1) * T + 2);
  };
  function init(L, info) {
    if (info.reason === 'respawn' && L.skits) return;
    const def = info.def || {}, list = [...(def.scene ? [def.scene] : []), ...(def.scenes || [])];
    L.skits = L.story && api.mode === 'level' ? list.map((s) => ({ ...s, queued: false })) : [];
  }
  function update() {
    const L = api.L; if (!L || !L.skits || api.state !== 'play') return;
    for (const sc of L.skits) if (!sc.queued && fired(sc)) queue(sc);
  }

  window.MimoVolcano = window.MimoVolcano || {};
  window.MimoVolcano.skitFx = window.MimoVolcano.skitFx || {};
  window.MimoVolcano.skit = { run, op };
  window.MimoWorlds.register({ world: 5, setup(a) { api = a; }, init, update });
})();
