/* Mimo hüpft · Kinderzimmer (3D) · side missions: what they all share
   Side missions are found only by exploring. A figure with a "!" above its head asks for something, and
   each mission gives a sticker for the album (world.sticker). Some are small games that can be played
   again and again for a better result; those start on a round start pad next to the figure and keep
   their best (world.keep) with a medal: bronze, silver or gold.
   The missions themselves live in room-side-sport.js (football, race, skittles), room-side-find.js
   (building bricks, gold buttons, dust bunnies) and room-side-play.js (floor piano, balloons, dominoes,
   block towers). Each registers itself:
     Room3D.sideParts.push({ id, build(sx) { ...; return { update(dt, play, t), reset(), state() }; } });
   `sx` is what this file hands them, see the end of makeSideQuests. y is up; see README.md. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const NEAR = 2.4, NEAR_DY = 1.5;                  // how near Mimo must come to a figure to talk to it
  const WAVE_FROM = 9;                              // a figure with something to ask waves from this far
  const PAD = { r: 1.0, h: 0.16, down: 0.1, reach: 0.6 };
  const COUNT = { words: ['Drei...', 'Zwei...', 'Eins...', 'Los!'], step: 0.7, away: 2.5 };   // away: this far from the pad the count is broken off
  const CLOCK_EVERY = 6;                            // the clock of a timed game is refreshed every so many steps (20 times a second)
  const BALL = { friction: 1.1, kick: 1.5, kickMin: 3.2, max: 16, bounce: 0.6, reach: 0.42, rest: 0.03 };
  const MEDAL_NAMES = ['', 'Bronze', 'Silber', 'Gold'];
  Room3D.sideParts = Room3D.sideParts || [];

  function makeSideQuests(THREE, k, world, level, props) {
    const { PAL, mesh, lit } = k, root = world.root, p = world.p;
    const say = (who, line) => world.say({ who: who.name, face: who.face, at: who.head, text: line });
    const near = (at, r) => Math.hypot(at[0] - p.x, at[2] - p.z) < (r || NEAR) && Math.abs(at[1] - p.y) < NEAR_DY;

    // Mimo on the tame Schlürfi knocks things over too. riding(): he sits on the robot right now.
    // reach(low): how much wider Mimo's touch is at floor level (the robot's radius while riding, 0 on foot), or -1
    // if he cannot touch things there at all because he is higher up than `low`.
    function riding() {
      const v = world.vacuum; if (!v || !v.riding || !v.riding() || !p.grounded) return false;
      const at = v.pos(); return Math.abs(p.y - v.top) < 0.4 && Math.hypot(at[0] - p.x, at[1] - p.z) < v.radius;
    }
    const reach = (low) => (riding() ? world.vacuum.radius : p.y < low ? 0 : -1);

    // ---------- Several coloured parts melted into one geometry (one draw call with meltMat) ----------
    const meltMat = k.own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, envMapIntensity: 0.3 }));
    // parts: [geometry, colour, [x, y, z]?, [rx, ry, rz]?, [sx, sy, sz]?]
    function melt(parts) {
      const out = k.mergeGeos(parts.map(([geo, color, at, rot, scale]) => [geo,
        new THREE.Matrix4().compose(new THREE.Vector3(...(at || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(scale || [1, 1, 1]))),
        new THREE.Color(color)]));
      for (const [geo] of parts) geo.dispose();
      return out;
    }

    // Many small things in one instanced mesh are only drawn while their place is in the picture: the mesh gets
    // a fixed sphere round everything its instances can ever reach (three.js would otherwise measure it once
    // and never again, and things that move would vanish).
    function bound(inst, at, r) { inst.boundingSphere = new THREE.Sphere(new THREE.Vector3(at[0], at[1], at[2]), r); inst.frustumCulled = true; return inst; }

    // ---------- Figures with a "!" bubble above their heads ----------
    const bang = k.canvasTex(64, 64, (g) => {
      g.fillStyle = '#FFFCF4'; g.strokeStyle = PAL.ink; g.lineWidth = 5; g.beginPath(); g.arc(32, 30, 24, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = PAL.ink; g.font = 'bold 36px Arial Rounded MT Bold, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 32);
    });
    const bangMat = k.own(new THREE.SpriteMaterial({ map: bang, transparent: true, depthWrite: false }));
    const givers = [];
    // def: { look, at: [x, y, z], yaw }. A part sets who.open (has something to ask) and who.happy (waves) in its update.
    function giver(def, name, face) {
      const peg = Room3D.makePeg(THREE, k, Room3D.PEG_LOOKS[def.look]);
      peg.root.position.set(...def.at); peg.root.rotation.y = def.yaw; peg.root.scale.setScalar(1.15); root.add(peg.root);
      for (const arm of [peg.armL, peg.armR]) arm.traverse((o) => { o.castShadow = false; });       // the body's shadow is enough, two draw calls less per figure
      const mark = new THREE.Sprite(bangMat); mark.scale.setScalar(0.9); root.add(mark);
      world.addCyl(def.at[0], def.at[2], 0.38, def.at[1] + 1.3, def.at[1]);
      const who = { peg, mark, name, face, at: def.at, head: [def.at[0], def.at[1] + 1.75, def.at[2]], open: true, happy: false };
      givers.push(who); return who;
    }

    // ---------- Start pads: a round button on the floor that starts a game when Mimo steps on it ----------
    // one mesh: a coloured base, a white top with a dark rim and a dark "play" triangle
    const pads = [];
    function pad(x, z, color) {
      const g = lit(new THREE.Mesh(melt([
        [new THREE.CylinderGeometry(PAD.r, PAD.r + 0.12, PAD.h, 24), color, [0, PAD.h / 2, 0]],
        [new THREE.CylinderGeometry(PAD.r - 0.12, PAD.r - 0.12, 0.02, 24), PAL.ink, [0, PAD.h + 0.01, 0]], [new THREE.CylinderGeometry(PAD.r - 0.2, PAD.r - 0.2, 0.02, 24), '#FBFBF7', [0, PAD.h + 0.02, 0]],
        [new THREE.CylinderGeometry(0.42, 0.42, 0.02, 3), PAL.ink, [0.04, PAD.h + 0.03, 0], [0, -Math.PI / 2, 0]],
      ]), meltMat));
      g.position.set(x, 0, z); root.add(g);
      const one = { x, z, g, on: true, armed: true, inside: false, pressed: false, at: [x, 0, z] };
      pads.push(one); return one;
    }
    function stepPads(play, t) {
      for (const one of pads) {
        one.inside = one.on && !game.id && play && p.grounded && p.y < PAD.reach && Math.hypot(one.x - p.x, one.z - p.z) < PAD.r;
        one.pressed = one.inside && one.armed;
        if (one.pressed) { one.armed = false; world.sfx.flag(); }
        else if (!one.inside && Math.hypot(one.x - p.x, one.z - p.z) > PAD.r + 0.6) one.armed = true;
        one.g.visible = one.on;
        one.g.position.y = one.inside ? -PAD.down : 0;
        one.g.scale.setScalar(one.armed && !one.inside ? 1 + Math.sin(t * 4) * 0.03 : 1);
      }
    }

    // ---------- One timed game at a time, with a count before it starts ----------
    const game = { id: null };
    let clockN = 0;
    function begin(id) { if (game.id) return false; game.id = id; clockN = 0; return true; }
    function end(id) { if (game.id !== id) return; game.id = null; world.race(null); }
    const clock = (info) => { if (clockN++ % CLOCK_EVERY === 0) world.race(info); };
    // c: { t, step }, starting at { t: 0, step: -1 }. Mimo is held on `at`. Returns 'go' once the count is over, 'off' if
    // Mimo is gone from the pad (sent back to a flag, or fallen): the game must then be given up. Otherwise ''.
    function countdown(c, who, dt, at) {
      if (Math.hypot(at[0] - p.x, at[2] - p.z) > COUNT.away || Math.abs(at[1] - p.y) > COUNT.away) return 'off';
      c.t += dt;
      const step = Math.floor(c.t / COUNT.step);
      if (step !== c.step && step < COUNT.words.length) { c.step = step; say(who, COUNT.words[step]); world.sfx[step === COUNT.words.length - 1 ? 'yay' : 'star'](); }
      if (world.S.state === 'play') { p.vx = p.vz = 0; p.x += (at[0] - p.x) * Math.min(1, dt * 12); p.z += (at[2] - p.z) * Math.min(1, dt * 12); }
      return c.t >= COUNT.words.length * COUNT.step ? 'go' : '';
    }
    const seconds = (v) => v.toFixed(1).replace('.', ',') + ' s';

    // ---------- Records with medals, kept across visits ----------
    let recs = {};
    const best = (id) => recs[id] || null;
    // steps: the values for bronze, silver and gold; lower: a smaller value is better (a time)
    function medalOf(value, steps, lower) { return steps.filter((s) => (lower ? value <= s : value >= s)).length; }
    function record(id, value, steps, lower) {
      const old = recs[id] || null, medal = medalOf(value, steps, lower);
      const better = !old || (lower ? value < old.v : value > old.v);
      if (better) {
        recs = Object.assign({}, recs, { [id]: { v: value, m: medal } }); world.keep.set('rec', recs);
        if (medal > 0) world.medal({ id, medal, value });
      }
      return { medal, better, up: medal > (old ? old.m : 0), old };
    }

    // What a figure says about the best so far when Mimo comes back, or '' if there is none yet. text(value) words the result.
    function bestLine(id, text) { const r = recs[id]; return r ? ' Dein Rekord: ' + text(r.v) + (r.m ? ', das ist ' + MEDAL_NAMES[r.m] + '.' : '.') : ''; }

    // ---------- A ball that rolls when Mimo runs against it and bounces off everything solid ----------
    const axis = new THREE.Vector3();
    // opts: { r, start: [x, z], mesh, friction?, lost? (how far from its start it may roll), aim? (0 to 1: how much the
    // ball goes where Mimo runs instead of straight away from him; makes it easier to steer) }. b.power scales the kick.
    function makeBall(opts) {
      const r = opts.r, friction = opts.friction || BALL.friction, aim = opts.aim || 0;
      const b = { x: 0, z: 0, vx: 0, vz: 0, r, mesh: opts.mesh, power: 1 };
      b.home = () => { b.x = opts.start[0]; b.z = opts.start[1]; b.vx = b.vz = 0; b.mesh.position.set(b.x, r, b.z); };
      function collide() {
        const R = Room3D.ROOM;
        if (b.x < R.x0 + r || b.x > R.x1 - r) { b.x = Math.max(R.x0 + r, Math.min(R.x1 - r, b.x)); b.vx *= -BALL.bounce; }
        if (b.z < R.z0 + r || b.z > R.z1 - r) { b.z = Math.max(R.z0 + r, Math.min(R.z1 - r, b.z)); b.vz *= -BALL.bounce; }
        for (const c of world.cols) {
          if (c.off || c.moving || c.kind === 'hit' || c.top < 0.25 || c.bottom > r * 2) continue;
          let nx, nz, d;
          if (c.type === 'box') {
            const cx = Math.max(c.x - c.hx, Math.min(c.x + c.hx, b.x)), cz = Math.max(c.z - c.hz, Math.min(c.z + c.hz, b.z));
            nx = b.x - cx; nz = b.z - cz; d = Math.hypot(nx, nz);
            if (d >= r) continue; if (d < 1e-4) { nx = 1; nz = 0; d = 1e-4; }
            b.x = cx + nx / d * r; b.z = cz + nz / d * r;
          } else {
            nx = b.x - c.x; nz = b.z - c.z; d = Math.hypot(nx, nz) || 1e-4;
            if (d >= r + c.r) continue;
            b.x = c.x + nx / d * (r + c.r); b.z = c.z + nz / d * (r + c.r);
          }
          const ux = nx / d, uz = nz / d, vn = b.vx * ux + b.vz * uz;
          if (vn < 0) { b.vx -= (1 + BALL.bounce) * vn * ux; b.vz -= (1 + BALL.bounce) * vn * uz; }
        }
      }
      // extra(b): more things to bounce off (a goalkeeper, skittles)
      b.step = (dt, extra) => {
        const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), reach = r + BALL.reach;
        if (b.vx === 0 && b.vz === 0 && d >= reach) return;                       // lying still and nobody near: nothing to do

        if (d < reach && p.y < r * 2 && world.S.state === 'play') {
          const ux = dx / (d || 1), uz = dz / (d || 1), vn = p.vx * ux + p.vz * uz;
          b.x = p.x + ux * reach; b.z = p.z + uz * reach;
          if (vn > 0.5) {
            const sp = Math.hypot(p.vx, p.vz) || 1; let kx = ux + (p.vx / sp - ux) * aim, kz = uz + (p.vz / sp - uz) * aim; const kl = Math.hypot(kx, kz) || 1; kx /= kl; kz /= kl;
            const imp = Math.max(BALL.kickMin, vn * BALL.kick) * b.power; b.vx += kx * imp; b.vz += kz * imp; world.sfx.bounce();
          }
          const sp = Math.hypot(b.vx, b.vz), max = BALL.max * b.power; if (sp > max) { b.vx *= max / sp; b.vz *= max / sp; }
        }
        const fr = Math.exp(-friction * dt); b.vx *= fr; b.vz *= fr;
        if (Math.abs(b.vx) + Math.abs(b.vz) < BALL.rest) b.vx = b.vz = 0;
        const ox = b.x, oz = b.z;
        b.x += b.vx * dt; b.z += b.vz * dt;
        collide(); if (extra) extra(b);
        // rolling: turn the ball about the axis across its way
        const mx = b.x - ox, mz = b.z - oz, m = Math.hypot(mx, mz);
        if (m > 1e-5) b.mesh.rotateOnWorldAxis(axis.set(mz / m, 0, -mx / m), m / r);
        b.mesh.position.set(b.x, r, b.z);
        if (opts.lost && Math.hypot(b.x - opts.start[0], b.z - opts.start[1]) > opts.lost) b.home();
      };
      b.speed = () => Math.hypot(b.vx, b.vz);
      b.home();
      return b;
    }

    // ---------- The missions ----------
    const sx = { THREE, k, world, level, props, root, p, say, near, riding, reach, melt, meltMat, bound, giver, pad, begin, end, clock, running: () => game.id, countdown, seconds, best, bestLine, record, medalOf, makeBall, MEDAL_NAMES, NEAR };
    const parts = Room3D.sideParts.map((def) => Object.assign({ id: def.id }, def.build(sx)));

    function update(dt) {
      const play = world.S.state === 'play', t = world.time();
      stepPads(play, t);
      for (const part of parts) part.update(dt, play, t);
      // "!" over every figure that still has something to ask, a happy wave from the ones that are done
      for (const who of givers) {
        who.mark.visible = who.open; who.mark.position.set(who.at[0], who.at[1] + 2.25 + Math.sin(t * 3) * 0.12, who.at[2]);
        const waving = who.happy || (who.open && Math.hypot(who.at[0] - p.x, who.at[2] - p.z) < WAVE_FROM);
        who.peg.armR.rotation.z = waving ? 2.3 + Math.sin(t * 9) * 0.35 : 0.18;
      }
    }
    function reset() {
      game.id = null; world.race(null);
      // only records of the right shape are taken over from what the host stored
      const kept = world.keep.get('rec'); recs = {};
      if (kept && typeof kept === 'object') for (const [id, r] of Object.entries(kept)) if (r && Number.isFinite(r.v) && [0, 1, 2, 3].includes(r.m)) recs[id] = { v: r.v, m: r.m };
      for (const one of pads) { one.armed = true; one.inside = one.pressed = false; }
      for (const who of givers) { who.open = true; who.happy = false; }
      for (const part of parts) part.reset();
    }
    reset();
    return { update, reset, state: () => Object.assign({ game: game.id }, ...parts.map((part) => (part.state ? part.state() : {}))) };
  }

  Room3D.makeSideQuests = makeSideQuests;
})();
