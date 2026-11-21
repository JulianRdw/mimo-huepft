// World 6 boss "Mondwurm Käsebert": what tools/bosscheck.mjs needs. A bot that plays the fight the way it is meant to be
// played (keep away from the crater that trembles, hop over the dust ripples, step out of meteor rings, stand under the
// top of the arc while he munches and jump: in phase 1 the moon jump lands on the pink segment, later the shooting star
// under it throws Mimo up), and the moments to take pictures of. Never used by the game itself.
(function () {
  'use strict';
  const K = () => window.MimoKaese;

  const CLEAR = 90, RIPPLE_NEAR = 34, MET_NEAR = 46, MET_STEP = 84;
  let mem = { B: null, aim: null };
  const memFor = (B) => { if (mem.B !== B) mem = { B, aim: null }; return mem; };

  function bot(B, h) {
    const m = memFor(B), p = h.G.p, px = p.x + p.w / 2;
    if (B.done) { if (B.helmOn && B.t > 7 && h.G.L.door) h.moveTo(h.G.L.door.x * h.T + h.T / 2, 3); else h.go(0); return; }
    if (B.state === 'enter' || B.state === 'scene') { h.go(0); m.aim = null; return; }
    if (!p.grounded) { if (m.aim != null) h.moveTo(m.aim, 2); else h.go(0); return; }
    m.aim = null;
    // 1. a ripple about to reach Mimo: a small hop
    for (const s of B.shots) if (s.type === 'kRipple' && Math.sign(px - s.x) === s.dir && Math.abs(px - s.x) < RIPPLE_NEAR) { h.jump(8); h.go(0); return; }
    // 2. a meteor ring under Mimo: step out of it (towards the top of the arc if that side is free)
    const met = B.shots.find((s) => s.type === 'kMeteor' && !s.hit && Math.abs(s.x - px) < MET_NEAR);
    if (met) { const mid = B.pass ? B.pass.mid : px; let dir = mid >= met.x ? 1 : -1; if (Math.abs(mid - met.x) < 4) dir = px >= met.x ? 1 : -1; h.moveTo(met.x + dir * MET_STEP, 3); return; }
    const pass = B.pass;
    // 3. he munches: under the top of the arc and jump (held long: the full moon jump)
    if (B.state === 'hold' && pass) {
      const x = K().pink(B).x, soon = B.shots.some((s) => s.type === 'kRipple' && Math.sign(px - s.x) === s.dir && Math.abs(px - s.x) < 110);
      if (h.moveTo(x, 3) && !soon) { m.aim = x; h.jump(80); }
      return;
    }
    // 4. the crater that trembles: keep clear of it until the head is out
    const head = B.worm, low = K().GY - head.hy < 140;
    if (pass && (B.state === 'warn' || (B.state === 'rise' && low))) {
      const xa = K().CRATERS[pass.a];
      if (Math.abs(px - xa) < CLEAR) { h.moveTo(xa + (px >= xa ? 1 : -1) * (CLEAR + 20), 4); return; }
      if ((pass.mid - xa) * (px - xa) < 0) { h.go(0); return; }
      h.moveTo(pass.mid, 4); return;
    }
    // 5. otherwise wait where the next arc will stand
    if (pass && B.state === 'rise') { h.moveTo(pass.mid, 4); return; }
    h.go(0);
  }

  // pictures for tools/bosscheck.mjs --shots (conditions on B, G, ph); "scene-" ones are taken during the scenes
  const checkShots = {
    'p1-warn': 'ph===0&&B.state==="warn"&&B.t>0.9',
    'p1-rise': 'ph===0&&B.state==="rise"&&B.s>260',
    'p1-ripple': 'ph===0&&B.state==="hold"&&B.t>0.55&&B.t<0.7',
    'p1-jump': 'ph===0&&B.state==="hold"&&!G.p.grounded&&G.p.vy>40',
    'p1-hit': 'ph===0&&B.state==="hurt"&&B.t>0.12',
    'scene-stars': 'B.scene&&B.scene.ph===1&&B.scene.t>2.1',
    'p2-meteor': 'ph===1&&B.shots.some(s=>s.type==="kMeteor"&&s.t>1.0&&s.t<1.2)',
    'p2-star': 'ph===1&&B.state==="hold"&&!G.p.grounded&&G.p.vy<-250&&G.p.y<230',
    'scene-dark': 'B.scene&&B.scene.ph===2&&B.scene.t>2.6',
    'p3-dark': 'ph===2&&B.state==="warn"&&B.t>0.7',
    'p3-ripples': 'ph===2&&B.state==="hold"&&B.shots.filter(s=>s.type==="kRipple").length>=3',
    'win-hicks': 'B.done&&B.t>0.85&&B.t<0.95',
    'win-helm': 'B.done&&B.helmOn&&B.t>2.5',
    'win-earth': 'B.done&&B.t>6.8',
  };

  Object.assign(window.MimoKaese = window.MimoKaese || {}, { bot, checkShots, idleSpots: [] });
})();
