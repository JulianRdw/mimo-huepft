/* Mimo hüpft · Kinderzimmer (3D) · the vacuum robot
   The end boss: a white robot vacuum that wakes up at night. It rolls after Mimo and sucks him towards
   its mouth, then takes aim and dashes in a straight line. If it rams one of the block towers it is
   dazed for a while: then Mimo can jump on its back and press the green button. Three presses switch
   it off. The tower it rammed falls apart with each press, so three towers are three chances. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const BOSS_NAME = 'Schlürfi', HITS = 3;
  // D-shaped body seen from above: round back, flat front (towards local +z)
  const BODY = { r: 4.4, front: 3.4, corner: 1.8, height: 2.5, floor: 0.25, lid: 0.42 };
  const BUTTON = { x: -2.5, z: -1.7, r: 0.6, press: 1.15 };
  const SEAT = { x: 0.4, z: -2.4 };   // where Mimo rides: behind the round sensor tower, like a driver behind the dashboard
  // per phase (number of presses so far): rolling speed, pull of the suction, aiming time, dash speed
  const PHASES = [{ roam: 3.4, pull: 2.4, aim: 1.0, dash: 12 }, { roam: 4.0, pull: 3.2, aim: 0.8, dash: 14 }, { roam: 4.6, pull: 4.0, aim: 0.65, dash: 16 }];
  const TIME = { wake: 1.8, roamMin: 2.6, roamMax: 3.8, stun: 7, bonk: 0.9, hurt: 2 };
  const TURN = { roam: 2.2, aim: 5 };                   // how fast it turns towards Mimo (rad/s)
  const SUCK = { reach: 11, cone: 0.55, height: 3 };    // cone: cosine of half the opening angle
  const TOUCH = 0.45, FRONT = 0.25;                     // touching distance, and what counts as "in front" (cosine)
  const KICK = 15;                                      // how hard Mimo is thrown off after a press
  const EYE = { calm: '#DDF6FF', angry: '#FF5C8A', dazed: '#6E7791' };
  const SNORE = { speed: 0.35, rise: 3.2, size: 1.1 };   // snoring Z: cycles per second, how high they rise, size
  // after the fight Schlürfi is tame: Mimo rides on top and steers him through the whole room (also under the bed)
  // It drives like a little vehicle: it turns towards the stick and rolls forward, it does not slide sideways.
  // seat: how fast Mimo slides to the middle of the top; lean/bank: how far the body tips when it speeds up or turns.
  const RIDE = { speed: 8.5, acc: 18, brake: 22, turn: 5.5, clear: 0.35, wall: 1.0, trail: 0.09, zoom: 1.4, seat: 8, lean: 0.07, bank: 0.09, tilt: 8 };
  const LINES = {
    asleep: 'Chrrr... Pssst, ich schlafe noch. Ich wache erst auf, wenn es Nacht ist.',
    wake: 'Brummm! Wer stört meine Nachtschicht?',
    hit: ['Autsch! Mein Knopf!', 'Hey! Nicht schon wieder!'],
    tame: 'Okay, okay, ich gebe auf! Spring auf mich drauf, dann fahre ich dich durchs ganze Zimmer.',
    mount: 'Festhalten! Los geht die Fahrt!',
  };

  function makeVacuum(THREE, k, world, arena) {
    const { PAL, std, mesh, lit } = k, { clamp, damp, angDiff } = Room3D.util;
    const root = new THREE.Group(); world.root.add(root);
    const body = new THREE.Group(); body.rotation.order = 'YXZ'; root.add(body);   // YXZ: the lean follows the heading

    // ---------- Model ----------
    function dShape(r, front, corner) {
      const s = new THREE.Shape();
      s.absarc(0, 0, r, Math.PI, 0, false);                     // round back (towards -y of the shape)
      s.lineTo(r, front - corner); s.absarc(r - corner, front - corner, corner, 0, Math.PI / 2, false);
      s.lineTo(-r + corner, front); s.absarc(-r + corner, front - corner, corner, Math.PI / 2, Math.PI, false);
      s.closePath();
      return s;
    }
    // extruded upright: the shape's y becomes the robot's front direction (+z), the depth becomes its height
    function slab(shape, height, y0) { const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 }); g.rotateX(Math.PI / 2); g.translate(0, y0 + height, 0); return g; }
    const white = std('#F6F6F2', { roughness: 0.35 }), black = std('#23242C', { roughness: 0.5 }), grey = std('#3A3C47', { roughness: 0.6 });
    lit(mesh(slab(dShape(BODY.r, BODY.front, BODY.corner), BODY.height - BODY.floor - BODY.lid, BODY.floor), black, 0, 0, 0, body));
    lit(mesh(slab(dShape(BODY.r - 0.12, BODY.front - 0.12, BODY.corner), BODY.lid, BODY.height - BODY.lid), white, 0, 0, 0, body));
    mesh(new THREE.BoxGeometry(BODY.r * 1.5, 0.9, 0.16), grey, 0, 1.1, BODY.front + 0.02, body);                      // bumper with the eyes
    mesh(new THREE.BoxGeometry(3.4, 0.06, 1.5), black, 0, BODY.height + 0.01, -3.0, body);                            // dust box flap
    lit(mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.38, 32), white, 0.4, BODY.height + 0.19, 0.5, body));             // round sensor tower
    mesh(new THREE.TorusGeometry(1.52, 0.05, 6, 40), grey, 0.4, BODY.height + 0.1, 0.5, body).rotation.x = Math.PI / 2;
    const buttonMat = k.own(new THREE.MeshStandardMaterial({ color: new THREE.Color('#3FAE49'), emissive: new THREE.Color('#3FAE49'), emissiveIntensity: 0.3, roughness: 0.4 }));
    const button = mesh(new THREE.CylinderGeometry(BUTTON.r, BUTTON.r, 0.16, 24), buttonMat, BUTTON.x, BODY.height + 0.08, BUTTON.z, body);
    const ring = mesh(new THREE.TorusGeometry(BUTTON.r + 0.25, 0.07, 8, 32), k.own(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })), BUTTON.x, BODY.height + 0.12, BUTTON.z, body);
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) mesh(new THREE.CircleGeometry(0.07, 8), k.basic('#FFFFFF'), -2.9 + i * 0.3, BODY.height + 0.012, 0.6, body).rotation.x = -Math.PI / 2;
    const eyeMat = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color(EYE.calm) })), eyes = [];
    for (const s of [-1, 1]) { const e = mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 12), eyeMat, s * 1.3, 1.1, BODY.front + 0.12, body); e.rotation.z = Math.PI / 2; e.userData.side = s; eyes.push(e); }
    // side brush at the front corner: the part that hurts, so it carries the danger colour
    const brush = new THREE.Group(); brush.position.set(BODY.r - 1.1, 0.14, BODY.front - 0.9); body.add(brush);
    for (let i = 0; i < 3; i++) { const arm = mesh(new THREE.BoxGeometry(2.6, 0.08, 0.16), std(PAL.danger, { roughness: 0.5 }), 0, 0, 0, brush); arm.rotation.y = i * Math.PI / 3; }
    mesh(new THREE.BoxGeometry(BODY.r * 1.2, 0.12, 0.5), std(PAL.danger, { roughness: 0.5 }), 0, 0.12, BODY.front - 0.5, body);                // suction mouth
    // little stars circling above while dazed
    const daze = new THREE.Group(); daze.position.y = BODY.height + 1.3; root.add(daze);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(k.starGeo, k.basic('#FFFFFF')); st.scale.setScalar(0.9); st.position.set(Math.cos(i * 2.094) * 1.9, 0, Math.sin(i * 2.094) * 1.9); daze.add(st); }
    // dust flying into the mouth while it sucks
    const DUST_N = 14, dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), k.basic('#FFFFFF'), DUST_N), dummy = new THREE.Object3D();
    dust.frustumCulled = false; world.root.add(dust);

    const col = world.addCyl(0, 0, BODY.r, BODY.height, 0, { moving: true });

    // snore letters: one canvas Z, three sprites that rise in turn
    const zTex = k.canvasTex(64, 64, (g) => { g.font = 'bold 54px Arial Rounded MT Bold, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF'; g.strokeStyle = PAL.ink; g.lineWidth = 6; g.strokeText('Z', 32, 34); g.fillText('Z', 32, 34); });
    const snore = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false })); root.add(s); return s; });

    // ---------- State ----------
    const B = { x: arena.dock[0], z: arena.dock[1], yaw: 0, state: 'sleep', t: 0, hits: 0, roamFor: 3, dirX: 0, dirZ: 1, tower: null, spin: 0, wasDead: false, sucking: false,
      vx: 0, vz: 0, speed: 0, accel: 0, turnRate: 0, steerX: 0, steerZ: 0, steered: false, rode: false, trailT: 0 };
    const sayRobot = (text) => world.say && world.say({ who: BOSS_NAME, face: 'robot', at: [B.x, BODY.height + 1.6, B.z], follow: () => [B.x, BODY.height + 1.6, B.z], text });
    const phase = () => PHASES[Math.min(B.hits, PHASES.length - 1)];
    const say = () => world.boss && world.boss(B.state === 'sleep' || B.state === 'done' ? null : { name: BOSS_NAME, hp: HITS - B.hits, max: HITS });
    function enter(state) { B.state = state; B.t = 0; if (state === 'roam') B.roamFor = TIME.roamMin + Math.random() * (TIME.roamMax - TIME.roamMin); say(); }
    function reset() {
      world.S && (world.S.camZoom = 1);
      Object.assign(B, { x: arena.dock[0], z: arena.dock[1], yaw: Math.atan2(arena.cx - arena.dock[0], arena.cz - arena.dock[1]), state: 'sleep', t: 0, hits: 0, tower: null, spin: 0, wasDead: false, toldAsleep: false,
        vx: 0, vz: 0, speed: 0, accel: 0, turnRate: 0, steerX: 0, steerZ: 0, steered: false, rode: false });
      if (world.boss) world.boss(null);             // not there yet while the level is being built
    }
    const local = (lx, lz) => [B.x + Math.cos(B.yaw) * lx + Math.sin(B.yaw) * lz, B.z - Math.sin(B.yaw) * lx + Math.cos(B.yaw) * lz];
    const towersAlive = () => arena.towers.filter((tw) => tw.alive);
    // Moves the robot; returns the tower it ran into, 'wall' at the edge of its territory, or null
    function move(dx, dz) {
      let hit = null;
      B.x += dx; B.z += dz;
      const lim = BODY.r + 0.3;
      if (B.x < arena.x0 + lim || B.x > arena.x1 - lim || B.z < arena.z0 + lim || B.z > arena.z1 - lim) { B.x = clamp(B.x, arena.x0 + lim, arena.x1 - lim); B.z = clamp(B.z, arena.z0 + lim, arena.z1 - lim); hit = 'wall'; }
      for (const tw of towersAlive()) for (const [cx, cz] of tw.cols) {
        const ox = B.x - cx, oz = B.z - cz, d = Math.hypot(ox, oz), min = BODY.r + tw.half;
        if (d < min) { B.x = cx + ox / d * min; B.z = cz + oz / d * min; hit = tw; }
      }
      return hit;
    }
    function turnTo(tx, tz, rate, dt) { B.yaw += clamp(angDiff(B.yaw, Math.atan2(tx - B.x, tz - B.z)), -rate * dt, rate * dt); }
    function pressed() {
      const p = world.p;
      B.hits++; world.sfx.stomp(); world.sfx.yay();
      world.burst(p.x, BODY.height + 0.3, p.z, 26, [PAL.white, '#3FAE49', PAL.gold], 4.5);
      p.vy = KICK; p.grounded = false; p.ground = null;
      if (B.tower) { B.tower.crumble(); B.tower = null; }
      if (B.hits >= HITS) { enter('beaten'); world.hint(BOSS_NAME + ' gibt auf und rollt zurück an seine Ladestation.'); }
      else { enter('hurt'); sayRobot(LINES.hit[B.hits - 1] || LINES.hit[0]); world.hint(B.hits === 1 ? 'Getroffen! Noch zwei Mal auf den grünen Knopf.' : 'Noch ein Mal auf den grünen Knopf!'); }
    }

    // ---------- Update ----------
    function update(dt, t) {
      const p = world.p, S = world.S, ph = phase();
      const dx = p.x - B.x, dz = p.z - B.z, dist = Math.hypot(dx, dz) || 1, fx = Math.sin(B.yaw), fz = Math.cos(B.yaw);
      const onTop = p.grounded && p.ground === col, low = p.y < BODY.height - 0.3, playing = S.state === 'play';
      B.t += dt; B.sucking = false;
      // after a fall the fight goes on, but the robot starts from its far side again
      if (S.state === 'dead') B.wasDead = true;
      else if (B.wasDead && playing) { B.wasDead = false; if (B.state !== 'sleep' && B.state !== 'done' && B.state !== 'beaten') { B.x = arena.dock[0]; B.z = arena.dock[1]; B.tower = null; enter('roam'); } }

      // it only wakes once the story says night has come (world.bossReady); before that it snores at the dock
      if (B.state === 'sleep') {
        if (playing && arena.inside(p)) {
          if (world.bossReady !== false) { enter('wake'); world.mood = 'night'; sayRobot(LINES.wake); }
          else if (!B.toldAsleep) { B.toldAsleep = true; sayRobot(LINES.asleep); }
        }
      }
      else if (B.state === 'wake') { if (B.t > TIME.wake) { enter('roam'); world.hint('Lock ihn gegen einen Turm, dann spring ihm auf den grünen Knopf.'); } }
      else if (B.state === 'roam') {
        turnTo(p.x, p.z, TURN.roam, dt);
        if (dist > BODY.r + 1.5) move(fx * ph.roam * dt, fz * ph.roam * dt);
        const ahead = (dx * fx + dz * fz) / dist;
        if (playing && dist < SUCK.reach && ahead > SUCK.cone && p.y < SUCK.height && !onTop) { B.sucking = true; const pull = ph.pull * (1 - dist / SUCK.reach * 0.5); p.extX -= dx / dist * pull; p.extZ -= dz / dist * pull; }
        if (B.t > B.roamFor) enter('aim');
      } else if (B.state === 'aim') {
        turnTo(p.x, p.z, TURN.aim, dt);
        if (B.t > ph.aim) { B.dirX = fx; B.dirZ = fz; enter('dash'); world.sfx.oh(); }
      } else if (B.state === 'dash') {
        const hit = move(B.dirX * ph.dash * dt, B.dirZ * ph.dash * dt);
        if (hit === 'wall') enter('bonk');
        else if (hit) { B.tower = hit; enter('stun'); world.sfx.land(); world.burst(B.x + B.dirX * BODY.r, 1.5, B.z + B.dirZ * BODY.r, 16, [PAL.white, PAL.block], 4); }
      } else if (B.state === 'bonk') { if (B.t > TIME.bonk) enter('roam'); }
      else if (B.state === 'stun') {
        const [bx, bz] = local(BUTTON.x, BUTTON.z);
        if (playing && onTop && Math.hypot(p.x - bx, p.z - bz) < BUTTON.press) pressed();
        else if (B.t > TIME.stun) { B.tower = null; enter('roam'); }
      } else if (B.state === 'hurt') { B.spin += dt * 16; if (B.t > TIME.hurt) { B.spin = 0; enter('roam'); } }
      else if (B.state === 'beaten') {
        turnTo(arena.dock[0], arena.dock[1], TURN.roam, dt);
        const left = Math.hypot(arena.dock[0] - B.x, arena.dock[1] - B.z);
        if (left > 0.4) { B.x += fx * Math.min(left, 3 * dt); B.z += fz * Math.min(left, 3 * dt); }
        else { enter('done'); world.setGoal(arena.goal); sayRobot(LINES.tame); if (world.sticker) world.sticker('m5'); }
      }
      else if (B.state === 'done') ride(dt, onTop);
      // touching the rolling robot from the front, or being rammed, sends Mimo back to the flag
      const lively = B.state === 'roam' || B.state === 'aim' || B.state === 'dash';
      if (playing && lively && low && !onTop && dist < BODY.r + TOUCH && (B.state === 'dash' || (dx * fx + dz * fz) / dist > FRONT)) world.die();
      world.placeCollider(col, B.x, BODY.height, B.z);
      draw(dt, t);
    }
    // ---------- Riding the tame robot ----------
    // the core hands over the stick while Mimo stands on top (world.steer); the robot then drives that way
    world.steer = (mx, mz) => {
      const p = world.p;
      if (B.state !== 'done' || !(p.grounded && p.ground === col)) return false;
      B.steerX = mx; B.steerZ = mz; B.steered = true;
      return true;
    };
    function ride(dt, onTop) {
      world.S.camZoom = onTop ? RIDE.zoom : 1;
      if (onTop && !B.rode) { B.rode = true; sayRobot(LINES.mount); world.sfx.yay(); }
      const want = onTop && B.steered ? Math.min(1, Math.hypot(B.steerX, B.steerZ)) : 0;
      B.steered = false;
      // turn towards the stick, slower than before so the curve stays round; full speed only once it points that way
      let target = 0, turned = 0;
      if (want > 0.1) {
        const diff = angDiff(B.yaw, Math.atan2(B.steerX, B.steerZ));
        turned = clamp(diff, -RIDE.turn * dt, RIDE.turn * dt); B.yaw += turned;
        target = want * RIDE.speed * Math.max(0.2, Math.cos(diff));
      }
      const before = B.speed, rate = target > B.speed ? RIDE.acc : RIDE.brake;
      B.speed += clamp(target - B.speed, -rate * dt, rate * dt);
      const x0 = B.x, z0 = B.z;
      roomMove(Math.sin(B.yaw) * B.speed * dt, Math.cos(B.yaw) * B.speed * dt);
      if (dt > 0) B.speed = Math.min(B.speed, Math.hypot(B.x - x0, B.z - z0) / dt + 0.5);   // a wall stops it instead of pushing on
      B.vx = Math.sin(B.yaw) * B.speed; B.vz = Math.cos(B.yaw) * B.speed;
      B.accel = damp(B.accel, dt > 0 ? (B.speed - before) / dt : 0, RIDE.tilt, dt);
      B.turnRate = damp(B.turnRate, dt > 0 ? turned / dt : 0, RIDE.tilt, dt);
      // Mimo takes his seat and looks where Schlürfi drives
      if (onTop) {
        const p = world.p, k = Math.min(1, RIDE.seat * dt), [sx, sz] = local(SEAT.x, SEAT.z);
        p.x += (sx - p.x) * k; p.z += (sz - p.z) * k; p.vx = p.vz = 0; p.faceYaw = B.yaw;
      }
      const sp = B.speed;
      B.trailT -= dt;
      if (sp > 2 && B.trailT <= 0) { B.trailT = RIDE.trail; const [bx, bz] = local(0, -BODY.r); world.burst(bx, 0.3, bz, 2, [PAL.white, '#DDF6FF'], 0.8, { life: 0.5, up: 0.4 }); }
    }
    // drives on the floor of the whole room: pushed out of furniture that stands in its way, but it fits under the bed
    function roomMove(dx, dz) {
      B.x += dx; B.z += dz;
      const R = Room3D.ROOM, r = BODY.r;
      B.x = clamp(B.x, R.x0 + r + RIDE.wall, R.x1 - r - RIDE.wall); B.z = clamp(B.z, R.z0 + r + RIDE.wall, R.z1 - r - RIDE.wall);
      for (const c of world.cols) {
        if (c === col || c.off || c.moving || c.kind === 'hit' || c.top < RIDE.clear || c.bottom > BODY.height - 0.1) continue;
        if (c.type === 'box') {
          const nx = clamp(B.x, c.x - c.hx, c.x + c.hx), nz = clamp(B.z, c.z - c.hz, c.z + c.hz), ox = B.x - nx, oz = B.z - nz, d = Math.hypot(ox, oz);
          if (d < r) { if (d > 1e-4) { B.x = nx + ox / d * r; B.z = nz + oz / d * r; } else { B.x += r; } }
        } else {
          const ox = B.x - c.x, oz = B.z - c.z, d = Math.hypot(ox, oz) || 1e-4, min = r + c.r;
          if (d < min) { B.x = c.x + ox / d * min; B.z = c.z + oz / d * min; }
        }
      }
    }
    function draw(dt, t) {
      const st = B.state, dazed = st === 'stun', angry = st === 'aim' || st === 'dash', asleep = st === 'sleep' || st === 'beaten';
      root.position.set(B.x, 0, B.z);
      body.rotation.y = B.yaw + B.spin;
      body.position.x = st === 'aim' ? Math.sin(t * 60) * 0.06 : 0;                          // it trembles while it takes aim
      const done = st === 'done';
      body.rotation.z = dazed ? Math.sin(t * 5) * 0.03 : done ? clamp(B.turnRate * B.speed / RIDE.speed, -1, 1) * RIDE.bank : 0;   // leans into the curve
      body.rotation.x = done ? clamp(-B.accel / RIDE.acc, -1, 1) * RIDE.lean : 0;                                                   // tips back when it speeds off, forward when it brakes
      const riding = st === 'done' && Math.hypot(B.vx, B.vz) > 0.5;
      brush.rotation.y += dt * (riding ? 24 : asleep || dazed ? 0 : angry ? 30 : 12);
      eyeMat.color.set(dazed ? EYE.dazed : angry && Math.sin(t * 28) > -0.3 ? EYE.angry : EYE.calm);
      for (const e of eyes) { e.scale.y = st === 'done' ? (Math.sin(t * 0.8) > 0.97 ? 0.15 : 0.8) : asleep ? 0.2 : dazed ? 0.5 : 1; e.rotation.y = angry ? -e.userData.side * 0.5 : 0; }
      daze.visible = dazed; daze.rotation.y = t * 4;
      buttonMat.emissiveIntensity = dazed ? 0.9 + Math.sin(t * 9) * 0.5 : 0.3;
      ring.material.opacity = dazed ? 0.6 + Math.sin(t * 9) * 0.4 : 0; ring.scale.setScalar(dazed ? 1 + (t * 1.5 % 1) * 0.8 : 1);
      for (let i = 0; i < DUST_N; i++) {
        const u = (t * 0.9 + i / DUST_N) % 1, far = BODY.front + (1 - u) * SUCK.reach * 0.85, side = ((i % 5) - 2) * 0.16 * (1 - u), [wx, wz] = local(side * far, far);
        dummy.position.set(wx, 0.3 + (i % 3) * 0.45, wz); dummy.scale.setScalar(B.sucking ? 0.6 + u : 0); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix);
      }
      dust.instanceMatrix.needsUpdate = true;
      // snoring: three Z rise from the top while it sleeps before the fight
      const snoring = st === 'sleep';
      snore.forEach((z, i) => {
        const u = (t * SNORE.speed + i / snore.length) % 1;
        z.visible = snoring; z.position.set(Math.sin(u * 5 + i) * 0.5, BODY.height + 0.6 + u * SNORE.rise, 0);
        z.material.opacity = Math.sin(u * Math.PI) * 0.9; z.scale.setScalar(SNORE.size * (0.6 + u * 0.7));
      });
    }
    reset();
    // test hook: the fight is over at once (for screenshots of the ride)
    const tame = () => { enter('done'); world.setGoal(arena.goal); };
    return { update, reset, tame, state: () => B.state, riding: () => B.rode, hits: () => B.hits, pos: () => [B.x, B.z], button: () => local(BUTTON.x, BUTTON.z), top: BODY.height, radius: BODY.r };
  }

  Room3D.makeVacuum = makeVacuum;
})();
