/* Mimo hüpft · Kinderzimmer (3D) · section 2, part b: toy train, books and pencils
   The wooden train runs round a closed loop and stops at the station once a round. The books and
   pencils of section 2 are drawn as instanced meshes, so the whole book mountain costs a few draw calls.
   room-s2.js places everything; this file only knows how the things look and move. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const TRACK = { gauge: 1.5, railW: 0.16, railTop: 0.33, sleeperTop: 0.15, sleeperStep: 1.0, sleeperLen: 2.7, sleeperW: 0.5 };
  const RIDE = { speed: 6, acc: 4, dwell: 3.5 };          // units per second, units per second², seconds at the station
  const DECK = 0.95, CHASSIS_LOW = 0.4;                   // top of the chassis, bottom of every car collider
  const WHEEL_R = 0.36, WHEEL_X = 0.8, BOGIE = 1.2;       // wheel radius, wheel distance from the middle, where the heading is measured
  const DIAG_SHRINK = 0.72;                               // a car box seen at 45 degrees is shrunk to stay mostly inside the car
  // Cars from the front. back: distance of the car's centre behind the engine's centre. parts: collider boxes along the car
  // (at: along the car, hl/hw: half length and half width, top), chimney: an upright cylinder.
  const CARS = [
    { id: 'engine', len: 4.2, back: 0, axles: [1.4, 0, -1.4], parts: [{ at: 0.9, hl: 1.15, hw: 0.55, top: 1.95 }, { at: -1.2, hl: 0.9, hw: 1.1, top: 2.15 }], chimney: { at: 1.6, r: 0.3, top: 2.85 } },
    { id: 'tall', len: 3.4, back: 4.3, axles: [1.1, -1.1], parts: [{ at: 0, hl: 1.7, hw: 1.1, top: 2.75 }] },
    { id: 'flat', len: 3.4, back: 8.2, axles: [1.1, -1.1], parts: [{ at: 0, hl: 1.7, hw: 1.1, top: 1.1 }] },
    { id: 'tub', len: 3.4, back: 12.1, axles: [1.1, -1.1], parts: [{ at: 0, hl: 1.7, hw: 1.1, top: 1.7 }] },
  ];
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- A closed path of straight lines and arcs ----------
  // segs: { line: [x0, z0, x1, z1] } or { arc: [cx, cz, r, a0, a1] }; angles from -z, turning towards +x.
  function loopPath(segs) {
    let total = 0;
    const parts = segs.map((s) => {
      const len = s.line ? Math.hypot(s.line[2] - s.line[0], s.line[3] - s.line[1]) : Math.abs(s.arc[4] - s.arc[3]) * s.arc[2];
      const part = Object.assign({ start: total, len }, s); total += len; return part;
    });
    function at(dist) {
      let d = ((dist % total) + total) % total, i = 0;
      while (i < parts.length - 1 && d > parts[i].start + parts[i].len) i++;
      const s = parts[i], u = (d - s.start) / s.len;
      let x, z, tx, tz;
      if (s.line) { const [x0, z0, x1, z1] = s.line; x = lerp(x0, x1, u); z = lerp(z0, z1, u); tx = (x1 - x0) / s.len; tz = (z1 - z0) / s.len; }
      else { const [cx, cz, r, a0, a1] = s.arc, a = lerp(a0, a1, u), dir = Math.sign(a1 - a0); x = cx + r * Math.sin(a); z = cz - r * Math.cos(a); tx = Math.cos(a) * dir; tz = Math.sin(a) * dir; }
      return { x, z, tx, tz, nx: tz, nz: -tx };
    }
    const samples = (step) => { const n = Math.ceil(total / step); return Array.from({ length: n + 1 }, (_, i) => Object.assign(at(total * i / n), { d: total * i / n })); };
    return { at, samples, length: total };
  }

  // ---------- Track: wooden sleepers (instanced) and two rails (one mesh) ----------
  function makeTrack(THREE, k, path, parent) {
    const T = TRACK, list = path.samples(T.sleeperStep).slice(0, -1), dummy = new THREE.Object3D();
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(T.sleeperLen, T.sleeperTop, T.sleeperW), k.std('#8E5F3F', { roughness: 0.75 }), list.length);
    list.forEach((s, i) => { dummy.position.set(s.x, T.sleeperTop / 2, s.z); dummy.rotation.y = Math.atan2(s.tx, s.tz); dummy.updateMatrix(); sleepers.setMatrixAt(i, dummy.matrix); });
    sleepers.receiveShadow = true; parent.add(sleepers);
    // every rail is a top and two sides, all strips of one geometry
    const fine = path.samples(0.5), P = [], I = [];
    function strip(a0, y0, a1, y1) {
      const base = P.length / 3;
      fine.forEach((s, i) => {
        P.push(s.x + s.nx * a0, y0, s.z + s.nz * a0, s.x + s.nx * a1, y1, s.z + s.nz * a1);
        if (i) { const o = base + (i - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      });
    }
    for (const side of [-1, 1]) {
      const c = side * T.gauge / 2, a = c - T.railW / 2, b = c + T.railW / 2;
      strip(a, T.railTop, b, T.railTop); strip(a, T.sleeperTop, a, T.railTop); strip(b, T.railTop, b, T.sleeperTop);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
    const rails = k.mesh(geo, k.std('#B4B9C6', { roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide }), 0, 0, 0, parent);
    rails.castShadow = true; rails.receiveShadow = true;
  }

  // ---------- The train ----------
  // opts: { path, stopAt, hold } stopAt: where the engine's centre stands while the train waits at the station;
  // hold(): while it says true, a train standing at the station stays there (the signal shows "halt")
  function makeTrain(THREE, k, world, parent, opts) {
    const { PAL, mesh, lit, roundedBox, std } = k, path = opts.path, P = path.length;
    const ta = RIDE.speed / RIDE.acc, moveT = P / RIDE.speed + ta, period = RIDE.dwell + moveT;
    const state = { d: opts.stopAt, v: 0, dwell: 0, held: false };
    let clock = 0;                                        // the train's own timetable clock; it stops while the train is held
    // where the engine is at time t: waits, speeds up, runs one round, brakes into the station again
    function timetable(t) {
      const u = ((t % period) + period) % period;
      if (u < RIDE.dwell) return { d: opts.stopAt, v: 0, dwell: RIDE.dwell - u };
      const tau = u - RIDE.dwell, cruise = moveT - ta;
      let s, v;
      if (tau < ta) { s = 0.5 * RIDE.acc * tau * tau; v = RIDE.acc * tau; }
      else if (tau < cruise) { s = 0.5 * RIDE.speed * ta + RIDE.speed * (tau - ta); v = RIDE.speed; }
      else { const r = moveT - tau; s = P - 0.5 * RIDE.acc * r * r; v = RIDE.acc * r; }
      return { d: opts.stopAt + s, v, dwell: 0 };
    }

    const bodies = CARS.map((car) => { const g = new THREE.Group(); parent.add(g); return g; });
    buildEngine(bodies[0]); buildTall(bodies[1]); lit(mesh(roundedBox(2.2, 0.16, 3.4, 0.06, 2), std(PAL.green, { roughness: 0.45 }), 0, DECK + 0.07, 0, bodies[2])); buildTub(bodies[3]);
    function buildEngine(g) {
      const boiler = new THREE.CylinderGeometry(0.55, 0.55, 2.3, 22); boiler.rotateX(Math.PI / 2);
      lit(mesh(boiler, std(PAL.red, { roughness: 0.4 }), 0, 1.4, 0.85, g));
      lit(mesh(roundedBox(2.1, 1.1, 1.7, 0.14, 3), std(PAL.blue, { roughness: 0.45 }), 0, DECK + 0.55, -1.2, g));
      lit(mesh(roundedBox(2.4, 0.16, 2.0, 0.06, 2), std(PAL.yellow, { roughness: 0.45 }), 0, 2.07, -1.2, g));
      mesh(new THREE.BoxGeometry(2.14, 0.42, 0.8), std('#2F3550', { roughness: 0.2 }), 0, 1.62, -1.1, g);
      lit(mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.85, 16), std('#3A3850', { roughness: 0.5 }), 0, 2.4, 1.6, g));
      mesh(new THREE.SphereGeometry(0.17, 12, 10), k.basic('#FFF3C4'), 0, 1.4, 2.03, g);
    }
    function buildTall(g) {
      lit(mesh(roundedBox(2.2, 1.62, 3.4, 0.14, 3), std(PAL.yellow, { roughness: 0.45 }), 0, DECK + 0.81, 0, g));
      lit(mesh(roundedBox(2.4, 0.18, 3.6, 0.07, 2), std(PAL.red, { roughness: 0.45 }), 0, 2.66, 0, g));
      mesh(new THREE.BoxGeometry(2.24, 1.15, 1.3), std(PAL.orange, { roughness: 0.5 }), 0, 1.72, 0, g);
    }
    function buildTub(g) {
      lit(mesh(roundedBox(2.2, 0.7, 3.4, 0.12, 3), std(PAL.blue, { roughness: 0.45 }), 0, DECK + 0.35, 0, g));
      const n = 12, balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.38, 14, 10), k.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, envMapIntensity: 0.3 })), n), d = new THREE.Object3D(), c = new THREE.Color();
      for (let i = 0; i < n; i++) { d.position.set(((i % 3) - 1) * 0.62, 1.38 + (i % 2) * 0.05, (Math.floor(i / 3) - 1.5) * 0.74); d.updateMatrix(); balls.setMatrixAt(i, d.matrix); balls.setColorAt(i, c.set(k.TOY_COLORS[(i * 2) % k.TOY_COLORS.length])); }
      balls.castShadow = true; g.add(balls);
    }
    // chassis and wheels of all cars are two instanced meshes, moved every step
    const chassis = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#3A3850', { roughness: 0.6 }), CARS.length);
    const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.2, 16); wheelGeo.rotateZ(Math.PI / 2);
    const wheelCount = CARS.reduce((n, c) => n + c.axles.length * 2, 0), wheels = new THREE.InstancedMesh(wheelGeo, std(PAL.red, { roughness: 0.45 }), wheelCount);
    for (const im of [chassis, wheels]) { im.frustumCulled = false; im.castShadow = true; parent.add(im); }

    // colliders: one box per part; `car` says which car a collider belongs to (Mimo is carried and turned with it)
    const cars = CARS.map((def, i) => ({
      def, i, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, dyaw: 0, ready: false,
      cols: def.parts.map((part) => Object.assign(world.addBox(0, CHASSIS_LOW, part.top, 0, part.hw, part.hl, { moving: true, car: i }), { part })),
      chimney: def.chimney ? Object.assign(world.addCyl(0, 0, def.chimney.r, def.chimney.top, DECK, { moving: true, car: i }), { part: def.chimney }) : null,
    }));
    cars[0].cols[0].train = state;          // test hook: the bot reads the timetable here

    // An axis-aligned box that follows a turning car: long side along the way on straights, a smaller square at 45 degrees
    function fitBox(col, part, tx, tz) {
      const c2 = tz * tz, s2 = 1 - c2, diag = 4 * c2 * s2, square = (part.hw + part.hl) / 2 * DIAG_SHRINK;
      col.hx = lerp(part.hw * c2 + part.hl * s2, square, diag); col.hz = lerp(part.hl * c2 + part.hw * s2, square, diag);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), o3 = new THREE.Vector3();
    function update(dt) {
      const now = timetable(clock);
      state.held = !!(opts.hold && opts.hold()) && now.dwell > 0;
      if (!state.held) clock += dt;
      Object.assign(state, timetable(clock));
      let w = 0;
      for (const car of cars) {
        const dc = state.d - car.def.back, mid = path.at(dc), f = path.at(dc + BOGIE), b = path.at(dc - BOGIE);
        const hx = f.x - b.x, hz = f.z - b.z, hl = Math.hypot(hx, hz), tx = hx / hl, tz = hz / hl, yaw = Math.atan2(tx, tz);
        if (car.ready && dt > 0) { car.vx = (mid.x - car.x) / dt; car.vz = (mid.z - car.z) / dt; car.dyaw = Math.atan2(Math.sin(yaw - car.yaw), Math.cos(yaw - car.yaw)); }
        Object.assign(car, { x: mid.x, z: mid.z, yaw, tx, tz, ready: true });
        const g = bodies[car.i]; g.position.set(mid.x, 0, mid.z); g.rotation.y = yaw;
        for (const col of car.cols) { fitBox(col, col.part, tx, tz); world.placeCollider(col, mid.x + tx * col.part.at, (CHASSIS_LOW + col.part.top) / 2, mid.z + tz * col.part.at); }
        if (car.chimney) world.placeCollider(car.chimney, mid.x + tx * car.def.chimney.at, car.def.chimney.top, mid.z + tz * car.def.chimney.at);
        q.setFromAxisAngle(up, yaw);
        m4.compose(o3.set(mid.x, DECK - 0.17, mid.z), q, s3.set(1.9, 0.3, car.def.len - 0.2)); chassis.setMatrixAt(car.i, m4);
        for (const a of car.def.axles) for (const side of [-1, 1]) {
          v3.set(side * WHEEL_X, TRACK.railTop + WHEEL_R, a).applyQuaternion(q);
          m4.compose(o3.set(mid.x + v3.x, v3.y, mid.z + v3.z), q, s3.set(1, 1, 1)); wheels.setMatrixAt(w++, m4);
        }
      }
      chassis.instanceMatrix.needsUpdate = true; wheels.instanceMatrix.needsUpdate = true;
    }
    // a restart puts the train back at the station, at the start of its stop
    function reset() { clock = 0; for (const car of cars) car.ready = false; update(0); }
    return { cars, state, update, reset, period };
  }

  // ---------- Books: covers, pages and labels of every book as three instanced meshes ----------
  // add(x, y0, z, w, h, d, color, yaw, upright): spine along -x; upright books stand on their long edge.
  function makeBooks(THREE, k, parent) {
    const list = [], CT = 0.09;
    function add(x, y0, z, w, h, d, color, yaw, upright) { list.push({ x, y: y0 + (upright ? w / 2 : h / 2), z, w, h, d, color, yaw: yaw || 0, roll: upright ? Math.PI / 2 : 0 }); }
    // A pile from y0 up to exactly `top`: books of mixed thickness, a little shifted and turned. Returns the books' count.
    function pile(x, z, w, d, y0, top, seed, colors) {
      const r = k.rng(seed), sizes = [0.9, 1.05, 1.2, 1.35];
      let y = y0, n = 0;
      while (top - y > 0.05) {
        let h = sizes[Math.floor(r() * sizes.length)]; if (top - y - h < 0.75) h = top - y;
        const shrink = r() * 0.35;
        add(x + (r() - 0.5) * 0.3, y, z + (r() - 0.5) * 0.3, w - shrink, h, d - r() * 0.35, colors[Math.floor(r() * colors.length)], (r() - 0.5) * 0.12 + (r() < 0.5 ? Math.PI : 0));
        y += h; n++;
      }
      return n;
    }
    function build() {
      const n = list.length, coverMat = k.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, envMapIntensity: 0.3 }));
      const covers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), coverMat, n * 3), pages = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), k.texStd(k.tex.pages(), { roughness: 0.9 }), n);
      const labelGeo = new THREE.PlaneGeometry(1, 1); labelGeo.rotateX(-Math.PI / 2);
      const labels = new THREE.InstancedMesh(labelGeo, k.std(k.PAL.paper, { roughness: 0.9 }), n);
      const book = new THREE.Matrix4(), part = new THREE.Matrix4(), rot = new THREE.Euler(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), scl = new THREE.Vector3(), color = new THREE.Color();
      const put = (im, i, lx, ly, lz, sx, sy, sz) => { part.compose(pos.set(lx, ly, lz), q.identity(), scl.set(sx, sy, sz)); im.setMatrixAt(i, part.premultiply(book)); };
      list.forEach((b, i) => {
        book.compose(pos.set(b.x, b.y, b.z), q.setFromEuler(rot.set(0, b.yaw, b.roll, 'YXZ')), one);
        color.set(b.color);
        put(covers, i * 3, 0, b.h / 2 - CT / 2, 0, b.w, CT, b.d); put(covers, i * 3 + 1, 0, -b.h / 2 + CT / 2, 0, b.w, CT, b.d); put(covers, i * 3 + 2, -b.w / 2 + 0.06, 0, 0, 0.12, b.h, b.d);
        for (let c = 0; c < 3; c++) covers.setColorAt(i * 3 + c, color);
        put(pages, i, 0.06, 0, 0, b.w - 0.3, b.h - CT * 2, b.d - 0.3);
        put(labels, i, 0.1, b.h / 2 + 0.004, -b.d * 0.18, b.w * 0.5, 1, b.d * 0.22);
      });
      for (const im of [covers, pages, labels]) { im.castShadow = im !== labels; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im); }
    }
    return { add, pile, build, list };
  }

  // ---------- Pencils lying along z, tip towards -z; all of them as four instanced meshes ----------
  function makePencils(THREE, k, parent) {
    const list = [], R = 0.3, TIP = 0.9, CAP = 0.25;
    const add = (x, y, z, len, color, yaw) => list.push({ x, y, z, len, color, yaw: yaw || 0 });
    function build() {
      const hex = (rTop, rBottom, h) => { const g = new THREE.CylinderGeometry(rTop, rBottom, h, 6); g.rotateY(Math.PI / 6); g.rotateX(Math.PI / 2); return g; };
      const paint = k.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, flatShading: true, envMapIntensity: 0.3 })), n = list.length;
      const body = new THREE.InstancedMesh(hex(R, R, 1), paint, n), wood = new THREE.InstancedMesh(hex(R, R * 0.32, TIP * 0.7), k.std('#E8C99A', { roughness: 0.8, flatShading: true }), n);
      const lead = new THREE.InstancedMesh(hex(R * 0.32, 0.02, TIP * 0.3), paint, n), cap = new THREE.InstancedMesh(hex(R * 1.02, R * 1.02, CAP), paint, n);
      const d = new THREE.Object3D(), color = new THREE.Color();
      const put = (im, i, p, along, sz) => { d.position.set(p.x + Math.sin(p.yaw) * along, p.y, p.z + Math.cos(p.yaw) * along); d.rotation.set(0, p.yaw, 0); d.scale.set(1, 1, sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); };
      list.forEach((p, i) => {
        const bodyLen = p.len - TIP - CAP;
        put(body, i, p, (TIP - CAP) / 2, bodyLen); put(wood, i, p, -p.len / 2 + TIP * 0.65, 1); put(lead, i, p, -p.len / 2 + TIP * 0.15, 1); put(cap, i, p, p.len / 2 - CAP / 2, 1);
        color.set(p.color); body.setColorAt(i, color); lead.setColorAt(i, color); cap.setColorAt(i, color.multiplyScalar(0.6));
      });
      for (const im of [body, wood, lead, cap]) { im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im); }
    }
    return { add, build, R, TOP: R * 0.866 };
  }

  Room3D.s2kit = { TRACK, RIDE, CARS, loopPath, makeTrack, makeTrain, makeBooks, makePencils };

  // ---------- Small working parts of section 2: station, shed with pedal, balls, lift, ribbon ----------
  const LIFT = { up: 4.0, down: 2.5, wait: 8, board: 0.6 };      // seconds: ride up, ride down, wait below, stand on it before it goes
  const SHED = { open: 10, swing: 0.8, angle: 1.75, keepNear: 1.2 }; // seconds open and swinging, door angle, doorway kept free
  const SQUASH = { amount: 0.2, rate: 7 };
  const smooth = (u) => u * u * (3 - 2 * u);

  function makeParts(THREE, k, props, world, root) {
    const { PAL, mesh, lit, std, roundedBox } = k, { addBox, addCyl, placeCollider } = world;
    const standsOn = (p, col) => p.grounded && p.ground === col;

    // Wooden platform with a painted edge; the station house is a house() and gets the clock
    function station(s) {
      const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, top = s.top;
      lit(mesh(roundedBox(s.x1 - s.x0, top, s.z1 - s.z0, 0.12, 3), std('#E2C59A', { roughness: 0.65 }), cx, top / 2, cz, root));
      mesh(new THREE.BoxGeometry(s.x1 - s.x0 - 0.4, 0.02, 0.22), std(PAL.yellow, { roughness: 0.5 }), cx, top + 0.01, s.z1 - 0.3, root);
      addBox(cx, 0, top, cz, (s.x1 - s.x0) / 2, (s.z1 - s.z0) / 2);
    }
    // An afternoon clock, facing +z
    function clock(x, y, z, r) {
      const face = k.canvasTex(128, 128, (g, W) => {
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill();
        g.strokeStyle = PAL.ink; g.lineWidth = 7; g.stroke(); g.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2 + Math.sin(a) * 48, W / 2 - Math.cos(a) * 48); g.lineTo(W / 2 + Math.sin(a) * 56, W / 2 - Math.cos(a) * 56); g.stroke(); }
        for (const [a, len, w] of [[Math.PI * 0.6, 30, 7], [Math.PI * 1.33, 44, 5]]) { g.lineWidth = w; g.beginPath(); g.moveTo(W / 2, W / 2); g.lineTo(W / 2 + Math.sin(a) * len, W / 2 - Math.cos(a) * len); g.stroke(); }
      });
      mesh(new THREE.CircleGeometry(r, 28), k.texStd(face, { roughness: 0.5 }), x, y, z, root);
    }

    // Small wooden house: walls, a pitched roof (ridge along x) and two door leaves on its -x side that can swing open.
    // sh: { x0, x1, z0, z1, y0?, h, ridge, wall, door: { z0, z1, h }, colors: [walls, roof, doors] }
    function house(sh) {
      const dr = sh.door, mid = (sh.z0 + sh.z1) / 2, wl = sh.wall, x0 = sh.x0, x1 = sh.x1, y0 = sh.y0 || 0, H = y0 + sh.h, R = y0 + sh.ridge, cx = (x0 + x1) / 2;
      const [wallC, roofC, doorC] = sh.colors, wallMat = std(wallC, { roughness: 0.55 });
      const walls = [[x1 - wl / 2, sh.z0, sh.z1, y0, H, wl / 2], [cx, sh.z0, sh.z0 + wl, y0, H, (x1 - x0) / 2], [cx, sh.z1 - wl, sh.z1, y0, H, (x1 - x0) / 2],
        [x0 + wl / 2, sh.z0 + wl, dr.z0, y0, H, wl / 2], [x0 + wl / 2, dr.z1, sh.z1 - wl, y0, H, wl / 2], [x0 + wl / 2, dr.z0, dr.z1, y0 + dr.h, H, wl / 2]];
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, walls.length), d = new THREE.Object3D();
      walls.forEach(([x, z0, z1, ya, yb, hx], i) => {
        d.position.set(x, (ya + yb) / 2, (z0 + z1) / 2); d.scale.set(hx * 2, yb - ya, z1 - z0); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
        addBox(x, ya, yb, (z0 + z1) / 2, hx, (z1 - z0) / 2);
      });
      lit(im); root.add(im);
      const gable = new THREE.BufferGeometry(), G = [];
      for (const x of [x0 - 0.01, x1 + 0.01]) G.push(x, H, sh.z0, x, R, mid, x, H, sh.z1);
      gable.setAttribute('position', new THREE.Float32BufferAttribute(G, 3)); gable.computeVertexNormals();
      mesh(gable, std(wallC, { roughness: 0.55, side: THREE.DoubleSide }), 0, 0, 0, root);
      const half = (sh.z1 - sh.z0) / 2, slope = Math.atan2(sh.ridge - sh.h, half), slab = Math.hypot(sh.ridge - sh.h, half) + 0.5;
      const roof = new THREE.InstancedMesh(new THREE.BoxGeometry(x1 - x0 + 0.6, 0.22, slab), std(roofC, { roughness: 0.45 }), 2);
      [-1, 1].forEach((s, i) => { d.position.set(cx, (H + R) / 2 + 0.12, mid + s * half / 2); d.rotation.set(s * slope, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); roof.setMatrixAt(i, d.matrix); });
      lit(roof); root.add(roof);
      // the sloped roof as three steps: outer thirds lower, middle third higher
      const third = (sh.z1 - sh.z0) / 3, rise = sh.ridge - sh.h;
      for (const [zc, top] of [[sh.z0 + third / 2, H + rise / 3 + 0.2], [mid, H + rise * 0.8 + 0.2], [sh.z1 - third / 2, H + rise / 3 + 0.2]]) addBox(cx, H, top, zc, (x1 - x0) / 2 + 0.3, third / 2);
      // doors: a hinge on each side of the opening, the leaves swing outwards
      const leafW = (dr.z1 - dr.z0) / 2, doorMat = std(doorC, { roughness: 0.5 });
      const doors = [[dr.z0, 1], [dr.z1, -1]].map(([hz, s]) => {
        const hinge = new THREE.Group(); hinge.position.set(x0 + 0.12, y0, hz); root.add(hinge);
        lit(mesh(roundedBox(0.2, dr.h - 0.05, leafW - 0.04, 0.05, 2), doorMat, 0, dr.h / 2, s * leafW / 2, hinge));
        return { hinge, s, col: addBox(x0 + 0.15, y0, y0 + dr.h, hz + s * leafW / 2, 0.15, leafW / 2) };
      });
      if (sh.h + y0 > 3) world.addCamBlock(x0, x1, y0, R, sh.z0, sh.z1);
      const st = { target: 0, swing: 0, timer: 0, just: false };
      const near = (p) => p.x > x0 - SHED.keepNear && p.x < x1 && p.z > sh.z0 && p.z < sh.z1 && p.y < R;
      function open() {
        if (!st.target) st.just = true;
        st.target = 1; st.timer = SHED.open;
        for (const dd of doors) dd.col.off = true;
      }
      function update(dt, p) {
        if (st.target) { st.timer -= dt; if (st.timer <= 0 && !near(p)) { st.target = 0; for (const dd of doors) dd.col.off = false; } }
        st.swing = Math.max(0, Math.min(1, st.swing + (st.target ? 1 : -1) * dt / SHED.swing));
        for (const dd of doors) dd.hinge.rotation.y = -dd.s * SHED.angle * smooth(st.swing);
      }
      function justOpened() { const j = st.just; st.just = false; return j; }
      function reset() { st.target = 0; st.swing = 0; st.just = false; for (const dd of doors) { dd.col.off = false; dd.hinge.rotation.y = 0; } }
      return { open, update, justOpened, reset, isOpen: () => st.target === 1 };
    }

    // Pedal on the tunnel with a semaphore signal: stepping on it opens the shed, the arm goes up meanwhile
    function pedal(pd, sem, top) {
      const plate = lit(mesh(new THREE.CylinderGeometry(pd.r, pd.r, 0.12, 22), std(PAL.yellow, { roughness: 0.5 }), pd.x, top + 0.06, pd.z, root));
      const col = addCyl(pd.x, pd.z, pd.r, top + 0.12, top);
      lit(mesh(new THREE.CylinderGeometry(0.1, 0.12, sem.h, 10), std('#F5F0E4', { roughness: 0.5 }), sem.x, top + sem.h / 2, sem.z, root));
      addCyl(sem.x, sem.z, 0.14, top + sem.h, top);
      const arm = new THREE.Group(); arm.position.set(sem.x, top + sem.h - 0.3, sem.z + 0.1); root.add(arm);
      lit(mesh(roundedBox(1.6, 0.3, 0.1, 0.04, 2), std(PAL.red, { roughness: 0.45 }), -0.65, 0, 0, arm));
      let lift = 0;
      return {
        pressed: (p) => standsOn(p, col),
        update(dt, isOpen) { lift = dt > 0 ? lift + ((isOpen ? 1 : 0) - lift) * Math.min(1, dt * 6) : (isOpen ? 1 : 0); arm.rotation.z = -lift * 0.75; plate.position.y = top + 0.06 - lift * 0.05; },
      };
    }

    // Rubber ball as a trampoline: solid lower half, springy top, squashes a little on every bounce
    function ball(b, color, band) {
      const g = new THREE.Group(); g.position.set(b.x, b.r, b.z); root.add(g);
      lit(mesh(new THREE.SphereGeometry(b.r, 32, 22), std(color, { roughness: 0.3 }), 0, 0, 0, g));
      if (band) mesh(new THREE.TorusGeometry(b.r * 1.0, b.r * 0.12, 8, 40), std(band, { roughness: 0.3 }), 0, 0, 0, g).rotation.set(1.2, 0.3, 0);
      let squash = 0;
      addCyl(b.x, b.z, b.r * 0.85, b.r, 0);
      addCyl(b.x, b.z, b.r * 0.78, b.top, b.r, { kind: 'bounce', bounce: b.bounce, onBounce: () => { squash = 1; } });
      return { update(dt) { squash = Math.max(0, squash - dt * SQUASH.rate); const s = Math.sin(squash * Math.PI) * SQUASH.amount; g.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5); g.position.y = b.r * (1 - s); } };
    }

    // Lift between two brick columns. It waits at the top until the green button calls it down.
    function lift(l, btn, low) {
      const bricks = props.brickSet(), U = props.STUD, BH = props.BRICK_H, layers = Math.round(l.colTop / BH), span = Math.ceil((l.colZ[1] - l.colZ[0] + 2 * U) / U + 0.5);
      for (const [i, cz] of l.colZ.entries()) { bricks.stack(l.x - U, 0, cz - U, 2, 2, layers, 70 + i, [PAL.white, '#D9DCE4']); addBox(l.x, 0, l.colTop, cz, U, U); }
      bricks.add(l.x - U, l.colTop, l.colZ[0] - U, 2, span, PAL.red, true);
      addBox(l.x, l.colTop, l.colTop + BH, l.colZ[0] - U + span * U / 2, U, span * U / 2);
      bricks.build(root);
      const plate = new THREE.Group(); root.add(plate);
      lit(mesh(roundedBox(l.half * 2, l.plate, l.half * 2, 0.06, 2), std(PAL.yellow, { roughness: 0.3 }), 0, 0, 0, plate));
      const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.13, 14), std(PAL.yellow, { roughness: 0.3 }), 16), d = new THREE.Object3D();
      for (let i = 0; i < 16; i++) { d.position.set(((i % 4) - 1.5) * U, l.plate / 2 + 0.065, (Math.floor(i / 4) - 1.5) * U); d.updateMatrix(); studs.setMatrixAt(i, d.matrix); }
      studs.castShadow = true; plate.add(studs);
      const plateCol = addBox(l.x, l.high - l.plate, l.high, l.z, l.half, l.half, { moving: true });
      lit(mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 24), std('#F5F0E4', { roughness: 0.5 }), btn.x, low + 0.06, btn.z, root));
      const cap = lit(mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.16, 24), std(PAL.green, { roughness: 0.35 }), btn.x, low + 0.2, btn.z, root));
      const btnCol = addCyl(btn.x, btn.z, 0.75, low + 0.2, low);
      const st = { mode: 'top', u: 1, wait: 0, board: 0 };
      plateCol.lift = st;                    // test hook for the bot
      function place() {
        const y = low + (l.high - low) * smooth(st.u);
        placeCollider(plateCol, l.x, y - l.plate / 2, l.z); plate.position.set(l.x, y - l.plate / 2, l.z);
        cap.position.y = low + (st.mode === 'top' ? 0.2 : 0.13);
      }
      function update(dt, p) {
        if (standsOn(p, btnCol) && st.mode === 'top') st.mode = 'down';
        if (st.mode === 'down') { st.u = Math.max(0, st.u - dt / LIFT.down); if (!st.u) Object.assign(st, { mode: 'bottom', wait: 0, board: 0 }); }
        else if (st.mode === 'bottom') {
          st.wait += dt; st.board = standsOn(p, plateCol) ? st.board + dt : 0;
          if (st.board > LIFT.board || st.wait > LIFT.wait) st.mode = 'up';
        } else if (st.mode === 'up') { st.u = Math.min(1, st.u + dt / LIFT.up); if (st.u === 1) st.mode = 'top'; }
        place();
      }
      function reset() { Object.assign(st, { mode: 'top', u: 1, wait: 0, board: 0 }); place(); }
      reset();
      return { update, reset, idleAtTop: () => st.mode === 'top' };
    }

    // Bookmark ribbon: comes out of the top book and lies across the gap onto the desk
    function ribbon(r, top) {
      const s = [{ x: r.x1, z: r.z, nx: 0, nz: 1, d: 0 }, { x: r.x0, z: r.z, nx: 0, nz: 1, d: r.x1 - r.x0 }];
      const m = mesh(k.ribbon(s, -r.width / 2, r.width / 2, top + 0.03, 2), std(PAL.red, { roughness: 0.3, side: THREE.DoubleSide }), 0, 0, 0, root);
      m.receiveShadow = true;
    }

    return { station, clock, house, pedal, ball, lift, ribbon };
  }

  Room3D.s2parts = { make: makeParts, LIFT, SHED };
})();
