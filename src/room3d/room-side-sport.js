/* Mimo hüpft · Kinderzimmer (3D) · side missions: sport
   Football: shoot the ball into the toy goal; afterwards the start pad begins a goal hunt against a
   little goalkeeper (how many goals in 30 seconds). Race: once round the road of the play mat through
   four gates, against a wind-up car that drives the silver time (only while Schlürfi sleeps or after
   the fight). Skittles: run against the ball so it rolls down the lane into nine skittles; only what
   falls in one roll counts, and Mimo has to stay behind the red line. See room-side.js for `sx`. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});
  Room3D.sideParts = Room3D.sideParts || [];

  const SPORT = {
    ball: {
      giver: { look: 'kicker', at: [18, 0, 18.6], yaw: -2.4 }, start: [15, 15], pad: [19.4, 12.6],
      goal: { x: 5, z: 15, w: 3.4, h: 2.1, d: 1.7 },        // opening at x, facing +x
      r: 0.55, lost: 32, back: 2.6, aim: 0.35,
      // the goal hunt: harder kicks, and a ball that missed comes back to its spot as soon as it lies still
      hunt: { time: 30, steps: [3, 5, 7], back: 0.45, power: 1.4, still: 1 },
      keeper: { r: 0.34, reach: 1.15, speed: 2.6, inset: 0.35 },
      lines: {
        ask: 'Hey! Schießt du den Ball ins Tor? Lauf einfach gegen ihn, dann rollt er los.', score: 'Toooor! Du bist ja ein richtiger Profi!',
        more: 'Lust auf eine Torjagd? Tritt auf den Startknopf. Du hast 30 Sekunden, und im Tor steht mein Torwart!',
        none: 'Kein Tor? Mein Torwart war heute richtig gut. Versuch es gleich noch einmal!',
      },
    },
    race: {
      giver: { look: 'racer', at: [61.6, 0, 15.2], yaw: 1.5 }, pad: [60.2, 18.8], park: [58.6, 14.6],
      gates: [[64.3, 18, 'x'], [80, 7.3, 'z'], [95.7, 18, 'x'], [87, 28.7, 'z']],   // start and finish first; 'x' or 'z': the axis the posts stand on
      road: [[64.3, 7.3], [95.7, 7.3], [95.7, 28.7], [64.3, 28.7]],                   // the corners of the road, in driving order after the start
      steps: [16, 14, 12.5], round: 2.4, rest: 14,   // rest: how far the car "drives on" at the finish before it goes back to its place
      lines: {
        ask: 'Lust auf ein Rennen gegen mein Aufziehauto? Einmal um die Straße, durch alle Tore und zurück. Tritt auf den Startknopf!',
        lost: 'Oh, zu langsam! Tritt auf den Startknopf, dann versuchen wir es noch einmal.', busy: 'Jetzt nicht, Schlürfi ist wach! Später gerne.',
      },
    },
    pins: {
      // the lane lies inside the train's loop, between the engine shed and the rails on the south side (z 33)
      giver: { look: 'bowler', at: [42.6, 0, 12.4], yaw: -1.7 }, lane: { x: 38.5, z0: 10.6, z1: 30.2, w: 4.6 }, start: [38.5, 13.4], foul: 17,
      at: [38.5, 27.2], gap: 0.82, r: 0.5, friction: 0.4, steps: [5, 7, 9], bumper: 0.3, aim: 0.6,
      lines: {
        ask: 'Gut Holz! Lauf gegen die Kugel, dann rollt sie auf die neun Kegel zu. Aber bleib hinter der roten Linie!',
        over: 'Übergetreten! Bleib hinter der roten Linie, dann zählt der Wurf.', miss: 'Daneben! Lauf ganz gerade gegen die Kugel, dann trifft sie.',
        few: (n) => n + ' Kegel. Für den Sticker brauchst du fünf mit einem Wurf.', all: 'Alle Neune! Besser geht es nicht!',
      },
    },
  };
  const GATE = { half: 2.1, h: 3.3, pass: 2.3 };
  const PIN = { r: 0.2, h: 1.25, hit: 0.86, fall: 6.5, pass: 0.1, chain: 1.25, cone: 0.5, tidy: 2.6, mimo: 0.5, stray: 4 };

  // ---------- Football ----------
  Room3D.sideParts.push({ id: 'ball', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx, { PAL, std, mesh, lit } = k;
    const B = SPORT.ball, gl = B.goal;
    const ballTex = k.canvasTex(128, 64, (g, W, H) => {
      g.fillStyle = '#FBFBF7'; g.fillRect(0, 0, W, H); g.fillStyle = PAL.ink;
      for (const [x, y] of [[16, 32], [48, 14], [48, 50], [80, 32], [112, 14], [112, 50], [0, 8], [64, 0], [64, 64]]) { g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } g.fill(); }
    });
    const ball = sx.makeBall({ r: B.r, start: B.start, lost: B.lost, aim: B.aim, mesh: lit(mesh(new THREE.SphereGeometry(B.r, 20, 14), k.texStd(ballTex, { roughness: 0.5 }), 0, 0, 0, root)) });
    {
      const white = std('#FBFBF7', { roughness: 0.4 }), net = k.own(new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 }));
      for (const s of [-1, 1]) {
        lit(mesh(new THREE.CylinderGeometry(0.11, 0.11, gl.h, 10), white, gl.x, gl.h / 2, gl.z + s * gl.w / 2, root));
        world.addCyl(gl.x, gl.z + s * gl.w / 2, 0.11, gl.h, 0);
        world.addBox(gl.x - gl.d / 2, 0, gl.h, gl.z + s * gl.w / 2, gl.d / 2, 0.05);          // side nets
      }
      const bar = mesh(new THREE.CylinderGeometry(0.11, 0.11, gl.w + 0.2, 10), white, gl.x, gl.h, gl.z, root); bar.rotation.x = Math.PI / 2;
      world.addBox(gl.x - gl.d, 0, gl.h, gl.z, 0.05, gl.w / 2);                                   // back net
      const netGeo = new THREE.BoxGeometry(gl.d, gl.h, gl.w, 3, 4, 5); netGeo.translate(gl.x - gl.d / 2, gl.h / 2, gl.z);
      root.add(new THREE.Mesh(netGeo, net));
    }
    // the goalkeeper of the goal hunt: a small wooden figure that slides along the goal line
    const KP = B.keeper;
    const keeper = lit(new THREE.Mesh(sx.melt([
      [new THREE.CylinderGeometry(0.2, 0.3, 0.75, 14), PAL.orange, [0, 0.375, 0]], [new THREE.SphereGeometry(0.24, 14, 10), '#F2D2AE', [0, 0.95, 0]],
      [new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), PAL.blue, [0, 0.97, 0]],
      [new THREE.SphereGeometry(0.13, 10, 8), '#FBFBF7', [0, 0.62, 0.36]], [new THREE.SphereGeometry(0.13, 10, 8), '#FBFBF7', [0, 0.62, -0.36]],
    ]), sx.meltMat));
    keeper.visible = false; root.add(keeper);
    const kp = { on: false, z: gl.z };
    const who = sx.giver(B.giver, 'Fußballkind', 'kicker'), startPad = sx.pad(B.pad[0], B.pad[1], PAL.green);
    const q = { state: 'idle', back: 0, hunt: null, told: false };
    const inGoal = () => ball.x < gl.x - B.r * 0.6 && ball.x > gl.x - gl.d && Math.abs(ball.z - gl.z) < gl.w / 2;
    function keeperBounce(b) {
      if (!kp.on) return;
      const kx = gl.x - KP.inset, nx = b.x - kx, nz = b.z - kp.z, d = Math.hypot(nx, nz) || 1e-4, min = b.r + KP.r;
      if (d >= min) return;
      b.x = kx + nx / d * min; b.z = kp.z + nz / d * min;
      const vn = b.vx * nx / d + b.vz * nz / d;
      if (vn < 0) { b.vx -= 1.7 * vn * nx / d; b.vz -= 1.7 * vn * nz / d; world.sfx.land(); }
    }
    const goalsText = (n) => n + (n === 1 ? ' Tor' : ' Tore');
    function endHunt() {
      const h = q.hunt, res = h.goals ? sx.record('ball', h.goals, B.hunt.steps, false) : null;
      say(who, !h.goals ? B.lines.none : goalsText(h.goals) + ' in ' + B.hunt.time + ' Sekunden!' + (res.medal ? ' Das ist ' + sx.MEDAL_NAMES[res.medal] + '!' : ' Für Bronze brauchst du ' + B.hunt.steps[0] + '.'));
      world.sfx[h.goals ? 'win' : 'oh'](); q.hunt = null; kp.on = false; ball.power = 1; sx.end('ball');
    }

    function update(dt, play, t) {
      kp.z = gl.z + Math.sin(t * KP.speed) * KP.reach;
      ball.step(dt, keeperBounce);
      if (play && q.state === 'idle' && near(who.at)) { q.state = 'active'; say(who, B.lines.ask); }
      if (play && q.state === 'done' && !q.hunt && near(who.at)) { if (!q.told) { q.told = true; say(who, sx.best('ball') ? 'Noch eine Torjagd? Tritt auf den Startknopf.' + sx.bestLine('ball', goalsText) : B.lines.more); } } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      // the goal hunt
      startPad.on = q.state === 'done' && !q.hunt;
      if (startPad.pressed && sx.begin('ball')) { q.hunt = { phase: 'count', c: { t: 0, step: -1 }, t: 0, goals: 0 }; kp.on = true; ball.home(); ball.power = B.hunt.power; q.back = 0; }
      const h = q.hunt;
      if (h && h.phase === 'count') {
        const c = sx.countdown(h.c, who, dt, startPad.at);
        if (c === 'go') h.phase = 'run'; else if (c === 'off') { q.hunt = null; kp.on = false; ball.power = 1; sx.end('ball'); }
      }
      else if (h) {
        h.t += dt;
        const left = Math.max(0, B.hunt.time - h.t);
        sx.clock({ big: sx.seconds(left), small: goalsText(h.goals) + ' · Gold ab ' + B.hunt.steps[2], hurry: left < 5 });
        if (q.back <= 0 && !inGoal() && ball.speed() < B.hunt.still && Math.hypot(ball.x - B.start[0], ball.z - B.start[1]) > 0.6) q.back = B.hunt.back;
        if (h.t >= B.hunt.time) endHunt();
      }
      // goals
      if (q.back > 0) { q.back -= dt; if (q.back <= 0) { world.burst(ball.x, 0.6, ball.z, 8, [PAL.white], 1.5, { life: 0.4 }); ball.home(); } }
      else if (inGoal()) {
        q.back = q.hunt ? B.hunt.back : B.back; world.burst(gl.x - gl.d / 2, 1.4, gl.z, 30, k.TOY_COLORS, 4, { life: 0.9 });
        if (q.hunt && q.hunt.phase === 'run') { q.hunt.goals++; world.sfx.yay(); }
        else if (q.state === 'active') { q.state = 'done'; say(who, B.lines.score); world.sticker('ball'); world.sfx.win(); }
        else { world.sfx.yay(); say(who, B.lines.score); }
      }
      keeper.visible = kp.on; keeper.position.set(gl.x - KP.inset, 0, kp.z); keeper.rotation.z = Math.cos(t * KP.speed) * 0.12;
      who.open = q.state === 'idle'; who.happy = q.state === 'done';
    }
    function reset() { ball.home(); ball.power = 1; Object.assign(q, { state: 'idle', back: 0, hunt: null, told: false }); kp.on = false; }
    return { update, reset, state: () => ({ ball: q.state, ballAt: [+ball.x.toFixed(2), +ball.z.toFixed(2)], hunt: q.hunt ? q.hunt.phase : null, goals: q.hunt ? q.hunt.goals : 0 }) };
  } });

  // ---------- Race ----------
  Room3D.sideParts.push({ id: 'race', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx, { PAL, std, mesh, lit } = k;
    const R = SPORT.race;
    const checker = k.canvasTex(128, 16, (g, W, H) => { for (let x = 0; x < W; x += 8) for (let y = 0; y < H; y += 8) { g.fillStyle = ((x + y) / 8) % 2 ? PAL.ink : '#FBFBF7'; g.fillRect(x, y, 8, 8); } });
    const gateMat = k.texStd(checker, { roughness: 0.6 }), postMat = std('#FBFBF7', { roughness: 0.4 });
    const ringMat = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#7CE0A0'), transparent: true, opacity: 0.8, depthWrite: false }));
    const gates = R.gates.map(([x, z, axisName]) => {
      const ox = axisName === 'x' ? GATE.half : 0, oz = axisName === 'z' ? GATE.half : 0;
      for (const s of [-1, 1]) { lit(mesh(new THREE.CylinderGeometry(0.16, 0.18, GATE.h, 10), postMat, x + s * ox, GATE.h / 2, z + s * oz, root)); world.addCyl(x + s * ox, z + s * oz, 0.18, GATE.h, 0); }
      const banner = lit(mesh(new THREE.BoxGeometry(GATE.half * 2 + 0.4, 0.5, 0.08), gateMat, x, GATE.h - 0.2, z, root));
      banner.rotation.y = axisName === 'x' ? 0 : Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.RingGeometry(GATE.half * 0.75, GATE.half * 0.95, 32), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.1, z); ring.visible = false; root.add(ring);
      return { x, z, ring };
    });
    // the wind-up car: it drives the road in exactly the silver time; a ghost, it does not push Mimo
    const wheel = () => new THREE.CylinderGeometry(0.24, 0.24, 0.2, 14).rotateZ(Math.PI / 2);
    const car = lit(new THREE.Mesh(sx.melt([
      [k.roundedBox(1.0, 0.4, 1.9, 0.14, 3), PAL.yellow, [0, 0.42, 0]], [k.roundedBox(0.8, 0.34, 0.85, 0.12, 3), '#2B3350', [0, 0.76, -0.15]],
      [wheel(), '#23242E', [-0.52, 0.24, 0.6]], [wheel(), '#23242E', [0.52, 0.24, 0.6]], [wheel(), '#23242E', [-0.52, 0.24, -0.6]], [wheel(), '#23242E', [0.52, 0.24, -0.6]],
      [new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), '#FBFBF7', [0, 0.95, -0.72]], [new THREE.TorusGeometry(0.16, 0.045, 8, 16), '#FBFBF7', [0, 1.22, -0.72], [0, Math.PI / 2, 0]],
    ]), sx.meltMat));
    root.add(car);
    // the car's way: from the start gate round the road's corners and back, as one list of points with their distance
    const way = (() => {
      const pts = [[R.gates[0][0], R.gates[0][1]], ...R.road, [R.gates[0][0], R.gates[0][1]]], out = [{ x: pts[0][0], z: pts[0][1], d: 0 }];
      for (let i = 1; i < pts.length; i++) { const a = out[i - 1]; out.push({ x: pts[i][0], z: pts[i][1], d: a.d + Math.hypot(pts[i][0] - a.x, pts[i][1] - a.z) }); }
      return out;
    })();
    const wayLen = way[way.length - 1].d;
    function wayAt(d) {
      const dd = Math.max(0, Math.min(wayLen, d));
      for (let i = 1; i < way.length; i++) if (dd <= way[i].d) { const a = way[i - 1], b = way[i], f = (dd - a.d) / (b.d - a.d || 1); return [a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f]; }
      return [way[0].x, way[0].z];
    }
    // corners are rounded by looking a bit behind and ahead
    function placeCar(d) {
      const a = wayAt(d - R.round), b = wayAt(d + R.round);
      car.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); car.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    }
    function parkCar() { car.position.set(R.park[0], 0, R.park[1]); car.rotation.y = Math.PI; }

    const who = sx.giver(R.giver, 'Rennfahrerin', 'racer'), startPad = sx.pad(R.pad[0], R.pad[1], PAL.red);
    const q = { state: 'idle', t: 0, gate: 1, c: null, told: false, busyTold: false, won: false, car: null };
    const allowed = () => { const v = world.vacuum ? world.vacuum.state() : 'sleep'; return v === 'done' || (v === 'sleep' && !world.bossReady); };
    const limit = R.steps[0], running = () => q.state === 'count' || q.state === 'run';
    function finish() {
      const res = sx.record('race', +q.t.toFixed(2), R.steps, true);
      q.state = 'done'; q.won = true; world.sticker('race'); world.sfx.win(); sx.end('race');
      say(who, 'Geschafft in ' + sx.seconds(q.t) + '! Das ist ' + sx.MEDAL_NAMES[res.medal] + '.' + (res.medal < 3 ? ' Für ' + sx.MEDAL_NAMES[res.medal + 1] + ' musst du unter ' + sx.seconds(R.steps[res.medal]) + ' bleiben.' : ' Schneller als mein Aufziehauto!'));
    }
    function lose() { q.state = 'lost'; say(who, R.lines.lost); world.sfx.oh(); sx.end('race'); }

    function update(dt, play, t) {
      const ok = allowed();
      if (play && near(who.at) && !running()) {
        if (!ok) { if (!q.busyTold) { q.busyTold = true; say(who, R.lines.busy); } }
        else if (!q.told) { q.told = true; if (q.state === 'idle') q.state = 'active'; say(who, sx.best('race') ? 'Noch ein Rennen? Tritt auf den Startknopf.' + sx.bestLine('race', sx.seconds) : R.lines.ask); }
      } else if (!near(who.at, sx.NEAR * 2)) q.told = q.busyTold = false;
      startPad.on = ok && !running();
      if (startPad.pressed && sx.begin('race')) { q.state = 'count'; q.c = { t: 0, step: -1 }; q.t = 0; q.gate = 1; q.car = { d: 0 }; }
      if (q.state === 'count') { sx.clock({ big: 'Achtung...', small: 'Gold ' + sx.seconds(R.steps[2]) }); const c = sx.countdown(q.c, who, dt, startPad.at); if (c === 'go') q.state = 'run'; else if (c === 'off') { q.state = q.won ? 'done' : 'active'; q.car = null; parkCar(); sx.end('race'); } }
      else if (q.state === 'run') {
        q.t += dt;
        const gt = gates[q.gate % gates.length];
        if (play && Math.hypot(gt.x - p.x, gt.z - p.z) < GATE.pass) {
          world.sfx.star(); world.burst(gt.x, 1.5, gt.z, 12, ['#7CE0A0', PAL.white], 2.4, { life: 0.5 });
          q.gate++;
          if (q.gate > gates.length) { q.gate = gates.length; if (q.t <= limit) finish(); else lose(); }
        }
        if (q.state === 'run' && q.t > limit) lose();
        if (q.state === 'run') sx.clock({ big: sx.seconds(q.t), small: 'Tor ' + Math.min(q.gate, gates.length) + ' von ' + gates.length + ' · Gold ' + sx.seconds(R.steps[2]), hurry: limit - q.t < 3 });
      }
      // the car drives on to the finish after the race is decided, waits there a moment and goes back to its place
      if (q.car) {
        if (q.state !== 'count') q.car.d += wayLen / R.steps[1] * dt;
        placeCar(q.car.d);
        if (q.car.d > wayLen + R.rest) { q.car = null; parkCar(); world.burst(R.park[0], 0.6, R.park[1], 8, [PAL.white], 1.5, { life: 0.4 }); }
      }
      gates.forEach((g, i) => { g.ring.visible = q.state === 'run' && i === q.gate % gates.length; g.ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06); });
      who.open = q.state === 'idle' || q.state === 'lost'; who.happy = q.won && !running();
    }
    function reset() { Object.assign(q, { state: 'idle', t: 0, gate: 1, c: null, told: false, busyTold: false, won: false, car: null }); parkCar(); }
    return { update, reset, state: () => ({ race: q.state, raceT: +q.t.toFixed(2), gate: q.gate }) };
  } });

  // ---------- Skittles ----------
  Room3D.sideParts.push({ id: 'pins', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx, { PAL, mesh, lit } = k;
    const S = SPORT.pins, L = S.lane, len = L.z1 - L.z0, mid = (L.z0 + L.z1) / 2;
    // lane, red line and the board behind the skittles: one mesh
    const lane = new THREE.Mesh(sx.melt([
      [new THREE.BoxGeometry(L.w, 0.05, len), PAL.birch, [L.x, 0.025, mid]],
      [new THREE.BoxGeometry(0.16, 0.09, len), '#B98E5C', [L.x - L.w / 2, 0.045, mid]], [new THREE.BoxGeometry(0.16, 0.09, len), '#B98E5C', [L.x + L.w / 2, 0.045, mid]],
      [new THREE.BoxGeometry(L.w, 0.06, 0.22), PAL.red, [L.x, 0.03, S.foul]],
      [k.roundedBox(L.w + 0.6, 0.9, 0.4, 0.1, 2), PAL.blue, [L.x, 0.45, L.z1 + 0.2]],
      // bumpers from the red line on, as on a children's lane: the ball stays on the lane, Mimo can step over them
      [k.roundedBox(0.3, S.bumper, L.z1 - S.foul, 0.1, 2), PAL.blue, [L.x - L.w / 2 - 0.15, S.bumper / 2, (S.foul + L.z1) / 2]], [k.roundedBox(0.3, S.bumper, L.z1 - S.foul, 0.1, 2), PAL.blue, [L.x + L.w / 2 + 0.15, S.bumper / 2, (S.foul + L.z1) / 2]],
    ]), sx.meltMat);
    lane.receiveShadow = true; root.add(lane);
    world.addBox(L.x, 0, 0.9, L.z1 + 0.2, L.w / 2 + 0.3, 0.2);
    for (const s of [-1, 1]) world.addBox(L.x + s * (L.w / 2 + 0.15), 0, S.bumper, (S.foul + L.z1) / 2, 0.15, (L.z1 - S.foul) / 2);
    const ballTex = k.canvasTex(64, 32, (g, W, H) => { g.fillStyle = PAL.purple; g.fillRect(0, 0, W, H); g.fillStyle = PAL.ink; for (const [x, y] of [[26, 12], [36, 12], [31, 20]]) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); } });
    const ball = sx.makeBall({ r: S.r, start: S.start, friction: S.friction, aim: S.aim, mesh: lit(mesh(new THREE.SphereGeometry(S.r, 20, 14), k.texStd(ballTex, { roughness: 0.25 }), 0, 0, 0, root)) });
    // nine skittles in a diamond
    const pinGeo = sx.melt([
      [new THREE.LatheGeometry([[0, 0], [0.15, 0], [0.2, 0.3], [0.17, 0.62], [0.08, 0.9], [0.13, 1.08], [0.09, 1.22], [0, 1.25]].map(([r, y]) => new THREE.Vector2(r, y)), 14), '#FBFBF7'],
      [new THREE.CylinderGeometry(0.093, 0.1, 0.1, 14, 1, true), PAL.red, [0, 0.86, 0]],
    ]);
    const pinMesh = lit(new THREE.InstancedMesh(pinGeo, sx.meltMat, 9)); sx.bound(pinMesh, [S.at[0], 0.6, S.at[1]], 4.5); root.add(pinMesh);
    const pins = [];
    [[0], [-0.5, 0.5], [-1, 0, 1], [-0.5, 0.5], [0]].forEach((row, i) => { for (const dx of row) pins.push({ x: S.at[0] + dx * S.gap, z: S.at[1] + (i - 2) * S.gap, a: 0, dx: 0, dz: 1, falling: false, t: 0, passed: false }); });
    const dummy = new THREE.Object3D(), tipAxis = new THREE.Vector3();
    function drawPins() {
      pins.forEach((pin, i) => {
        dummy.position.set(pin.x, Math.sin(pin.a) * PIN.r, pin.z);
        dummy.quaternion.setFromAxisAngle(tipAxis.set(pin.dz, 0, -pin.dx), pin.a);
        dummy.updateMatrix(); pinMesh.setMatrixAt(i, dummy.matrix);
      });
      pinMesh.instanceMatrix.needsUpdate = true;
    }
    function tip(pin, dx, dz) {
      if (pin.falling) return;
      const d = Math.hypot(dx, dz) || 1; pin.falling = true; downN++; pin.dx = dx / d; pin.dz = dz / d; pin.t = 0; pin.passed = false; world.sfx.land();
    }
    let downN = 0;
    const down = () => downN;
    function standUp() { for (const pin of pins) Object.assign(pin, { a: 0, falling: false, t: 0, passed: false }); downN = 0; drawPins(); }
    function ballHits(b) {
      for (const pin of pins) {
        if (pin.falling || Math.hypot(pin.x - b.x, pin.z - b.z) > b.r + PIN.r) continue;
        const sp = b.speed() || 1; tip(pin, b.vx / sp + (pin.x - b.x) * 0.6, b.vz / sp + (pin.z - b.z) * 0.6);
        b.vx *= PIN.hit; b.vz *= PIN.hit;
      }
    }
    const who = sx.giver(S.giver, 'Kegelmeister', 'bowler');
    const q = { state: 'ready', t: 0, over: false, told: false, tidy: 0, got: false, last: 0, stray: 0 };
    function score() {
      const n = down();
      q.last = n; q.state = 'score'; q.t = 0;
      if (q.over) { say(who, S.lines.over); world.sfx.oh(); return; }
      if (!n) { say(who, S.lines.miss); world.sfx.oh(); return; }
      const res = sx.record('pins', n, S.steps, false);
      if (n >= S.steps[0]) { q.got = true; world.sticker('pins'); world.sfx.win(); world.burst(S.at[0], 1.4, S.at[1], 30, k.TOY_COLORS, 4, { life: 0.9 }); }
      say(who, n === pins.length ? S.lines.all : n < S.steps[0] ? S.lines.few(n) : n + ' Kegel mit einem Wurf! Das ist ' + sx.MEDAL_NAMES[res.medal] + '.');
    }

    function update(dt, play) {
      ball.step(dt, ballHits);
      if (play && near(who.at)) { if (!q.told) { q.told = true; say(who, sx.best('pins') ? 'Gut Holz! Lauf wieder gegen die Kugel.' + sx.bestLine('pins', (v) => v + ' Kegel mit einem Wurf') : S.lines.ask); } } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      // Mimo knocks skittles over too, but that never counts
      const ext = sx.reach(1);
      if (play && ext >= 0) for (const pin of pins) if (!pin.falling && Math.hypot(pin.x - p.x, pin.z - p.z) < PIN.mimo + ext) tip(pin, pin.x - p.x + p.vx * 0.2, pin.z - p.z + p.vz * 0.2);
      let moved = false;
      for (const pin of pins) {
        if (!pin.falling) continue;
        if (pin.a < Math.PI / 2) { pin.a = Math.min(Math.PI / 2, pin.a + PIN.fall * dt * (0.4 + pin.a)); moved = true; }
        pin.t += dt;
        // a falling skittle takes along the ones standing in its way
        if (!pin.passed && pin.t > PIN.pass) {
          pin.passed = true;
          for (const other of pins) {
            if (other.falling) continue;
            const ox = other.x - pin.x, oz = other.z - pin.z, d = Math.hypot(ox, oz);
            if (d < PIN.chain && (ox * pin.dx + oz * pin.dz) / d > PIN.cone) tip(other, pin.dx * 0.6 + ox / d * 0.4, pin.dz * 0.6 + oz / d * 0.4);
          }
        }
      }
      if (moved) drawPins();
      if (q.state === 'ready') {
        if (ball.z > S.foul && ball.speed() > 1.5) { q.state = 'roll'; q.t = 0; q.over = false; }
        else if (down()) { q.tidy += dt; if (q.tidy > PIN.tidy && Math.hypot(S.at[0] - p.x, S.at[1] - p.z) > 3) { standUp(); q.tidy = 0; } }
        // a ball left lying somewhere rolls back to its place by itself
        q.stray = ball.speed() < 0.3 && Math.hypot(ball.x - S.start[0], ball.z - S.start[1]) > 1 ? q.stray + dt : 0;
        if (q.stray > PIN.stray) { world.burst(ball.x, 0.5, ball.z, 8, [PAL.white], 1.5, { life: 0.4 }); ball.home(); q.stray = 0; }
      } else if (q.state === 'roll') {
        q.t += dt;
        if (p.z > S.foul + 0.5 && Math.abs(p.x - L.x) < L.w / 2 + 1) q.over = true;
        if ((q.t > 1 && ball.speed() < 0.5) || q.t > 6) score();
      } else if (q.state === 'score') {
        q.t += dt;
        if (q.t > PIN.tidy) { standUp(); ball.home(); q.state = 'ready'; q.tidy = 0; }
      }
      who.open = !q.got; who.happy = q.got;
    }
    function reset() { Object.assign(q, { state: 'ready', t: 0, over: false, told: false, tidy: 0, got: false, last: 0, stray: 0 }); standUp(); ball.home(); }
    return { update, reset, state: () => ({ pins: q.state, pinsDown: down(), pinsLast: q.last, pinBall: [+ball.x.toFixed(2), +ball.z.toFixed(2)] }) };
  } });

  Room3D.SIDE_SPORT = SPORT;
})();
