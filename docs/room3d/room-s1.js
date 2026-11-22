/* Mimo hüpft · Kinderzimmer (3D) · section 1 "Teppichland"
   Afternoon on the rug: book gorge, letter blocks, pencil bridge, brick plateau, pads, book stack,
   ruler and the long glide over the race track. Mimo gets the propeller cap here.
   y is up. The way starts towards -z and turns right (towards +x) on the brick plateau. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const BLOCK = 1.3;
  const LAY = {
    start: [0, 0, 5],
    rug: { x: 2, z: -3, w: 30, d: 20 },
    gorge: { x: 3.9, z: -4, len: 6, tall: 5.2, thick: 0.9 },            // two books standing as a corridor
    marbles: [{ z: -2.6, phase: 0 }, { z: -5.4, phase: 0.5 }],
    word: { z: -9.6, cols: [-1.95, -0.65, 0.65, 1.95], heights: [1, 2, 3, 3], letters: 'MIMO' },
    bridge: { x: 1.3, z: -13.7, len: 8.6, y: 3.9 },
    plateau: { x0: -1.7, z0: -22.8, nx: 10, nz: 8, layers: 6 },
    ledge: { x0: 0.1, z0: -18.0, nx: 4, nz: 2, layers: 5 },
    pads: [{ x: 7.5, z: -20.6, layers: 6 }, { x: 11.6, z: -21.2, layers: 7 }, { x: 15.6, z: -20.4, layers: 8 }],
    books: { x: 21.4, z: -20.6, w: 6.4, d: 4.8, h: 0.9, n: 8 },
    ruler: { x0: 20.7, len: 8.3, width: 1.1 },                           // diving board for the long glide
    track: { x: 32.8, z: -20.6, L: 7, R: 3.4, width: 3 },
    tower: { x0: 41.1, z0: -23, nx: 8, nz: 8, layers: 6 },
    // toy drums as trampolines, so Mimo gets back up from the floor: [x, z, take-off speed]
    drums: [[6, -16.4, 21], [21.4, -13.6, 26]],
    // hidden extras off the main way: far below the bed, behind the teddy, on top of the football (glide there)
    secrets: [[101, 1.2, -32.5], [-15.8, 1.2, -22.8], [14.4, 7.3, -30.6]],
    bunnies: [[97, -30, 0.55], [99.6, -33.8, 0.42], [95.4, -33.2, 0.48]],
  };
  const MARBLE_R = 0.5, MARBLE_SPEED = 5.2, CAR_SPEEDS = [10, 8.2], CAR_LANE = 0.6;
  const STUD_LIFT = 0.08;                 // Mimo stands a little above the brick, between the studs

  // Camera rail: where the camera sits behind Mimo at each point of the way
  const CAM_NODES = [
    { x: 0, z: 5, yaw: 0, dist: 7.4, h: 3.1, look: 1.5 },
    { x: 0, z: -7, yaw: 0, dist: 7.6, h: 3.4, look: 1.3 },
    { x: 1.3, z: -12, yaw: 0, dist: 7.8, h: 3.7, look: 0.9 },
    { x: 1.3, z: -17.5, yaw: 0.35, dist: 8, h: 3.8, look: 0.9 },
    { x: 1.3, z: -20.6, yaw: 0.95, dist: 8.2, h: 3.8, look: 0.9 },
    { x: 6, z: -20.6, yaw: 1.4, dist: 8.2, h: 3.8, look: 0.9 },
    { x: 15.6, z: -20.6, yaw: 1.42, dist: 8.3, h: 3.8, look: 0.9 },
    { x: 21.4, z: -20.6, yaw: 1.38, dist: 9.4, h: 4.4, look: 0.4 },
    { x: 29, z: -20.6, yaw: 1.42, dist: 9, h: 4.4, look: 0.4 },
    { x: 36, z: -20.6, yaw: 1.42, dist: 9, h: 4.4, look: 0.4 },
    { x: 44.1, z: -20.6, yaw: 1.42, dist: 7.8, h: 3.6, look: 0.9 },
  ];

  // Opening flight: from the flag above the bed down to Mimo
  const INTRO = {
    time: 4.6,
    pos: [[30, 42, 36], [20, 27, 27], [7, 12, 19], [0, 3.1, 12.4]],
    look: [[78, 33, -36], [42, 14, -30], [8, 4, -14], [0, 1.5, 3.4]],
  };

  function build(THREE, k, props, world) {
    const { PAL, TOY_COLORS, mesh, lit, std, rng } = k;
    const { addBox, addCyl, addCamBlock, placeCollider, root } = world;
    const r = rng(42);
    const pick = (list) => list[Math.floor(r() * list.length)];
    const stars = [], movers = [];

    // ---------- Rug with fringe ----------
    {
      const g = LAY.rug, rug = mesh(new THREE.PlaneGeometry(g.w, g.d), k.texStd(k.tex.rug(), { roughness: 0.95, envMapIntensity: 0.2 }), g.x, 0.06, g.z, root);
      rug.rotation.x = -Math.PI / 2; rug.receiveShadow = true;
      mesh(new THREE.BoxGeometry(g.w, 0.06, g.d), std(k.shade(PAL.rug, 0.7), { roughness: 0.95 }), g.x, 0.028, g.z, root);
      const n = 46, fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.04, 0.14), std(PAL.rugLight, { roughness: 0.95 }), n * 2), d = new THREE.Object3D();
      for (let i = 0; i < n * 2; i++) { const side = i < n ? -1 : 1, j = i % n; d.position.set(g.x + side * (g.w / 2 + 0.4), 0.03, g.z - g.d / 2 + (j + 0.5) * g.d / n); d.rotation.y = (r() - 0.5) * 0.5; d.updateMatrix(); fringe.setMatrixAt(i, d.matrix); }
      fringe.receiveShadow = true; root.add(fringe);
    }

    // ---------- Book gorge with two rolling marbles ----------
    {
      const g = LAY.gorge;
      [[-1, PAL.purple], [1, PAL.green]].forEach(([s, color]) => {
        const holder = new THREE.Group(); holder.position.set(s * g.x, g.tall / 2, g.z); holder.rotation.y = Math.PI / 2 + s * 0.05; root.add(holder);
        const b = props.book(g.len, g.thick, g.tall, color); b.rotation.x = -Math.PI / 2; holder.add(b);
        addBox(s * g.x, 0, g.tall, g.z, g.thick / 2, g.len / 2);
        addCamBlock(s * g.x - g.thick / 2, s * g.x + g.thick / 2, 0, g.tall, g.z - g.len / 2, g.z + g.len / 2);
      });
      const reach = g.x - g.thick / 2 - MARBLE_R - 0.05;
      LAY.marbles.forEach((m) => {
        const ball = props.marble(MARBLE_R); ball.position.set(0, MARBLE_R, m.z); root.add(ball);
        const col = addCyl(0, m.z, MARBLE_R * 0.9, MARBLE_R * 1.7, 0, { kind: 'hit', moving: true });
        movers.push((dt, t) => {
          const period = 4 * reach / MARBLE_SPEED, u = ((t / period + m.phase) % 1 + 1) % 1, x = reach * (u < 0.5 ? 4 * u - 1 : 3 - 4 * u);
          ball.position.x = x; ball.rotation.z = -x / MARBLE_R;
          placeCollider(col, x, MARBLE_R * 1.7, m.z, 0);
        });
      });
    }

    // ---------- Letter blocks spelling MIMO, as stairs ----------
    {
      const w = LAY.word, fillers = 'ABDEFHKLRSTU358';
      w.cols.forEach((x, i) => {
        for (let n = 0; n < w.heights[i]; n++) {
          const top = n === w.heights[i] - 1;
          const b = props.block(top ? w.letters[i] : pick(fillers.split('')), top ? TOY_COLORS[i] : pick(TOY_COLORS), BLOCK, top);
          b.position.set(x + (top ? 0 : (r() - 0.5) * 0.06), BLOCK / 2 + n * BLOCK, w.z + (top ? 0 : (r() - 0.5) * 0.06)); b.rotation.y = top ? 0 : (r() - 0.5) * 0.3 + Math.floor(r() * 4) * Math.PI / 2;
          root.add(b);
        }
        addBox(x, 0, w.heights[i] * BLOCK, w.z, BLOCK / 2, BLOCK / 2);
      });
    }

    // ---------- Pencil bridge ----------
    {
      const b = LAY.bridge, colors = [PAL.red, PAL.yellow, PAL.blue];
      colors.forEach((c, i) => { const p = props.pencil(c, b.len + (i === 1 ? 0.3 : 0)); p.position.set(b.x + (i - 1) * props.PENCIL_R * 2, b.y + props.PENCIL_TOP, b.z - (i === 1 ? 0.15 : 0)); root.add(p); });
      addBox(b.x, b.y, b.y + props.PENCIL_TOP * 2, b.z, props.PENCIL_R * 3, b.len / 2);
      stars.push([b.x, b.y + 1.6, b.z]);
    }

    // ---------- Everything made of bricks ----------
    const bricks = props.brickSet(), U = props.STUD, BH = props.BRICK_H;
    const brickBox = (x0, z0, nx, nz, y0, y1) => addBox(x0 + nx * U / 2, y0, y1 + STUD_LIFT, z0 + nz * U / 2, nx * U / 2, nz * U / 2);
    {
      const p = LAY.plateau, l = LAY.ledge;
      brickBox(p.x0, p.z0, p.nx, p.nz, 0, bricks.stack(p.x0, 0, p.z0, p.nx, p.nz, p.layers, 3, TOY_COLORS));
      brickBox(l.x0, l.z0, l.nx, l.nz, 0, bricks.stack(l.x0, 0, l.z0, l.nx, l.nz, l.layers, 4, TOY_COLORS));
      LAY.pads.forEach((pad, i) => {
        const stilt = bricks.stack(pad.x - U, 0, pad.z - U, 2, 2, pad.layers - 1, 10 + i, [PAL.white, '#D9DCE4']);
        bricks.add(pad.x - 2 * U, stilt, pad.z - 2 * U, 4, 4, [PAL.yellow, PAL.red, PAL.blue][i], true);
        addBox(pad.x, 0, stilt, pad.z, U, U);
        brickBox(pad.x - 2 * U, pad.z - 2 * U, 4, 4, stilt, stilt + BH);
      });
      const t = LAY.tower;
      brickBox(t.x0, t.z0, t.nx, t.nz, 0, bricks.stack(t.x0, 0, t.z0, t.nx, t.nz, t.layers, 6, TOY_COLORS));
      for (const q of [p, t]) addCamBlock(q.x0, q.x0 + q.nx * U, 0, q.layers * BH, q.z0, q.z0 + q.nz * U);
      bricks.build(root);
    }
    const plateauTop = LAY.plateau.layers * BH + STUD_LIFT, towerTop = LAY.tower.layers * BH + STUD_LIFT;
    stars.push([LAY.start[0], 1.1, 0.8], [LAY.pads[1].x, LAY.pads[1].layers * BH + 1.5, LAY.pads[1].z]);

    // ---------- Drums: the way back up after a fall ----------
    const DRUM = { r: 1.5, h: 1.6 };
    const drums = LAY.drums.map(([x, z, bounce]) => {
      const dr = props.drum(DRUM.r, DRUM.h); dr.root.position.set(x, 0, z); root.add(dr.root);
      const state = { skin: dr.skin, squash: 0 };
      addCyl(x, z, DRUM.r - 0.1, DRUM.h, 0, { kind: 'bounce', bounce, onBounce: () => { state.squash = 1; } });
      return state;
    });

    // ---------- Stack of books with the propeller cap on top ----------
    const bk = LAY.books, booksTop = bk.n * bk.h;
    {
      const covers = [PAL.blue, PAL.orange, PAL.green, PAL.purple, PAL.red, PAL.yellow, PAL.blue, PAL.purple];
      for (let i = 0; i < bk.n; i++) {
        const b = props.book(bk.w - (i % 3) * 0.3, bk.h, bk.d - (i % 2) * 0.3, covers[i]);
        b.position.set(bk.x + (r() - 0.5) * 0.35, bk.h / 2 + i * bk.h, bk.z + (r() - 0.5) * 0.3); b.rotation.y = (r() - 0.5) * 0.2 + (i % 2 ? Math.PI : 0);
        root.add(b);
      }
      addBox(bk.x, 0, booksTop, bk.z, bk.w / 2 - 0.15, bk.d / 2 - 0.15);
      addCamBlock(bk.x - bk.w / 2, bk.x + bk.w / 2, 0, booksTop, bk.z - bk.d / 2, bk.z + bk.d / 2);
    }
    const rl = LAY.ruler, rulerTop = booksTop + props.RULER_H;
    {
      const board = props.ruler(rl.len, rl.width); board.position.set(rl.x0 + rl.len / 2, booksTop + props.RULER_H / 2, bk.z); root.add(board);
      addBox(rl.x0 + rl.len / 2, booksTop, rulerTop, bk.z, rl.len / 2, rl.width / 2);
    }
    const cap = props.propCap();
    cap.pos = [bk.x + 0.9, rulerTop + 0.95, bk.z];
    cap.root.scale.setScalar(1.7); cap.root.position.set(...cap.pos); root.add(cap.root);
    cap.glow = k.halo(PAL.gold, 2.6, 0.55); cap.glow.position.set(cap.pos[0], cap.pos[1] + 0.2, cap.pos[2]); root.add(cap.glow);

    // ---------- Slot-car track below the long glide ----------
    {
      const t = LAY.track, path = props.ovalPath(t.x, t.z, t.L, t.R);
      root.add(props.raceTrack(path, t.width));
      [PAL.red, '#F4BF3A'].forEach((color, i) => {
        const car = props.car(color), lane = i ? -CAR_LANE : CAR_LANE; root.add(car.root); car.root.position.y = props.TRACK_H;
        if (i === 1) { const badge = k.emblemDisc(0.4, car.root, 0, 0.74, 0.95); if (badge) { badge.rotation.x = -Math.PI / 2; car.stripe.visible = false; } }
        const col = addCyl(0, 0, 1.0, 1.25, 0, { kind: 'hit', moving: true });
        movers.push((dt, time) => {
          const d = time * CAR_SPEEDS[i] + i * path.length * 0.45, s = path.at(d), x = s.x + s.nx * lane, z = s.z + s.nz * lane;
          car.root.position.x = x; car.root.position.z = z; car.root.rotation.y = Math.atan2(s.tx, s.tz);
          for (const w of car.wheels) w.rotation.x = d / 0.36;
          placeCollider(col, x, 1.25, z, 0);
        });
      });
      // glide line: three stars along the arc from the books to the tower
      stars.push([33, 8.95, t.z], [36, 7.8, t.z], [39, 6.65, t.z]);
    }

    const flags = [[1.3, plateauTop, -21.2], [bk.x - 1.7, booksTop, bk.z + 1.2], [LAY.tower.x0 + LAY.tower.nx * U / 2 + 0.6, towerTop, LAY.track.z]];
    // dust bunnies below the bed: grey fluff with eyes, they only wobble
    const bunnies = LAY.bunnies.map(([x, z, size], i) => {
      const geo = new THREE.IcosahedronGeometry(size, 2), pos = geo.attributes.position, rr = rng(60 + i), seen = new Map();
      for (let n = 0; n < pos.count; n++) { const key = [pos.getX(n), pos.getY(n), pos.getZ(n)].map((v) => v.toFixed(3)).join(); if (!seen.has(key)) seen.set(key, 0.82 + rr() * 0.36); const f = seen.get(key); pos.setXYZ(n, pos.getX(n) * f, pos.getY(n) * f, pos.getZ(n) * f); }
      geo.computeVertexNormals();
      const b = mesh(geo, k.mat('#B9B2AC', { flatShading: true }), x, size * 0.9, z, root); b.rotation.y = -1.9 + i * 0.5;
      for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(size * 0.17, 10, 8), k.basic('#FFFFFF'), s * size * 0.3, size * 0.15, size * 0.82, b); mesh(new THREE.SphereGeometry(size * 0.09, 8, 6), k.basic(PAL.ink), s * size * 0.3, size * 0.15, size * 0.96, b); }
      addCyl(x, z, size * 0.8, size * 1.6, 0);
      return { mesh: b, y: size * 0.9, seed: i * 1.9 };
    });

    function update(dt, t) {
      for (const m of movers) m(dt, t);
      for (const dr of drums) { dr.squash = Math.max(0, dr.squash - dt * 4); dr.skin.position.y = DRUM.h + 0.01 - Math.sin(dr.squash * Math.PI) * 0.18; }
      for (const b of bunnies) { b.mesh.position.y = b.y + Math.abs(Math.sin(t * 2.2 + b.seed)) * 0.07; b.mesh.rotation.z = Math.sin(t * 1.7 + b.seed) * 0.08; }
      cap.root.visible = cap.glow.visible = !cap.got;
      cap.root.position.y = cap.pos[1] + Math.sin(t * 2.2) * 0.1; cap.root.rotation.y = t * 0.9; cap.spin.rotation.y = t * 9;
    }
    function reset() { cap.got = false; }
    return { start: LAY.start, intro: INTRO, camNodes: CAM_NODES, flags, stars, secrets: LAY.secrets, cap, update, reset };
  }

  Room3D.sections = Room3D.sections || [];
  Room3D.sections.push({ id: 's1', name: 'Teppichland', mood: 'day', build });
})();
