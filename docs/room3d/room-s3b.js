/* Mimo hüpft · Kinderzimmer (3D) · section 3 parts
   The bigger moving pieces of the desk, kept out of room-s3.js so both files stay small:
   instanced book stacks, the desk lamp with its secret-ink steps, the glue-stick lift and the paper plane
   that flies Mimo across the room. Each builder gets its measures from the layout table in room-s3.js. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});
  const { clamp, damp, smooth, lerp } = Room3D.util;

  const LAMP_GLOW = '#FFE3A6', INK = '#9474CE', INK_GLOW = '#B9A2FF';
  const GHOST_OPACITY = [0.05, 0.16];     // the unlit secret ink only shimmers faintly
  const LINGER_HINT = 6;                  // seconds next to the dark lamp before it gives a tip
  const PRESS_DEPTH = 0.14;               // how far the lamp switch goes down

  // ---------- small geometry helpers ----------
  // Several geometries as one, so a group of parts costs one draw call
  function mergeGeos(THREE, list) {
    const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
    const keys = ['position', 'normal', 'uv'].filter((key) => parts.every((g) => g.attributes[key]));
    const out = new THREE.BufferGeometry();
    for (const key of keys) {
      const size = parts[0].attributes[key].itemSize, arr = new Float32Array(parts.reduce((n, g) => n + g.attributes[key].array.length, 0));
      let o = 0;
      for (const g of parts) { arr.set(g.attributes[key].array, o); o += g.attributes[key].array.length; }
      out.setAttribute(key, new THREE.BufferAttribute(arr, size));
    }
    return out;
  }
  // A round rod from a to b, as geometry already in place
  function rodGeo(THREE, a, b, r) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), len = dir.length();
    const geo = new THREE.CylinderGeometry(r, r, len, 12);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return geo;
  }

  // ---------- Books lying flat, all stacks in two draw calls ----------
  // books: [{ x, y0, z, w, h, d, yaw, color }]; the spine is on the local -x side
  function bookStacks(THREE, k, root, books) {
    const ct = 0.09, m = new THREE.Matrix4(), part = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    const covers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), k.std('#FFFFFF', { roughness: 0.6 }), books.length * 3);
    const pages = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), k.texStd(k.tex.pages(), { roughness: 0.9 }), books.length);
    books.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.y0 + b.h / 2, b.z), q.setFromAxisAngle(up, b.yaw || 0), one);
      const put = (mesh, n, x, y, sx, sy, sz) => { part.makeScale(sx, sy, sz).setPosition(x, y, 0); mesh.setMatrixAt(n, part.premultiply(m)); };
      put(covers, i * 3, 0, b.h / 2 - ct / 2, b.w, ct, b.d);
      put(covers, i * 3 + 1, 0, -b.h / 2 + ct / 2, b.w, ct, b.d);
      put(covers, i * 3 + 2, -b.w / 2 + 0.06, 0, 0.12, b.h, b.d);
      for (let n = 0; n < 3; n++) covers.setColorAt(i * 3 + n, c.set(b.color));
      put(pages, i, 0.06, 0, b.w - 0.3, b.h - ct * 2, b.d - 0.3);
    });
    for (const im of [covers, pages]) { k.lit(im); root.add(im); }
  }

  // ---------- Desk lamp: a switch on its foot, and steps in secret ink that only hold in its light ----------
  // L: { base, baseR, baseH, button, buttonR, elbow, head, aim, color, steps: [[x, top, z]], step: [w, h, d], poolR }
  function makeLamp(THREE, k, world, L) {
    const { mesh, lit, std, PAL } = k, root = world.root, paint = std(L.color, { roughness: 0.45 });
    const [bx, by, bz] = L.base, baseTop = by + L.baseH;
    lit(mesh(new THREE.CylinderGeometry(L.baseR * 0.94, L.baseR, L.baseH, 36), paint, bx, by + L.baseH / 2, bz, root));
    world.addCyl(bx, bz, L.baseR, baseTop, by);
    const btn = lit(mesh(new THREE.CylinderGeometry(L.buttonR, L.buttonR, 0.3, 20), std(PAL.red, { roughness: 0.35 }), L.button[0], baseTop + 0.15, L.button[1], root));
    const btnCol = world.addCyl(L.button[0], L.button[1], L.buttonR, baseTop + 0.3, baseTop);
    // the arm: two rods with joints and a spring along the lower one, one draw call
    const root2 = [bx, baseTop, bz + 0.5], spring = (t) => [lerp(root2[0], L.elbow[0], t) + 0.32, lerp(root2[1], L.elbow[1], t), lerp(root2[2], L.elbow[2], t)];
    const armGeo = mergeGeos(THREE, [
      rodGeo(THREE, root2, L.elbow, 0.2), rodGeo(THREE, L.elbow, L.head, 0.2), rodGeo(THREE, spring(0.15), spring(0.75), 0.09),
      new THREE.SphereGeometry(0.42, 14, 10).translate(...L.elbow), new THREE.SphereGeometry(0.36, 14, 10).translate(...L.head),
      new THREE.CylinderGeometry(0.45, 0.55, 0.5, 16).translate(root2[0], root2[1] + 0.25, root2[2]),
    ]);
    lit(mesh(armGeo, paint, 0, 0, 0, root));
    world.addCyl(root2[0], root2[2], 0.45, baseTop + 2.2, baseTop);
    // hood: an open cone that points at the steps
    const hood = new THREE.Group(); hood.position.set(...L.head); root.add(hood);
    hood.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(L.aim[0] - L.head[0], L.aim[1] - L.head[1], L.aim[2] - L.head[2]).normalize());
    lit(mesh(new THREE.CylinderGeometry(0.75, 2.1, 2.3, 32, 1, true), std(L.color, { roughness: 0.45, side: THREE.DoubleSide }), 0, -1.15, 0, hood));
    const bulbMat = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#E8E0CF') }));
    mesh(new THREE.SphereGeometry(0.62, 16, 12), bulbMat, 0, -1.7, 0, hood);
    // light: a soft cone and a bright pool on the desk, both drawn additively (no real light, it is cheaper)
    const coneLen = L.head[1] - L.poolY - 1.6;
    const beamMat = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color(LAMP_GLOW), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const beam = mesh(new THREE.CylinderGeometry(1.9, L.poolR, coneLen, 32, 1, true), beamMat, 0, -1.6 - coneLen / 2, 0, hood); beam.renderOrder = 3;
    const poolMat = k.own(new THREE.MeshBasicMaterial({ map: k.radialTexture('rgba(255,226,160,0.85)', 'rgba(255,226,160,0)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const pool = mesh(new THREE.CircleGeometry(L.poolR * 1.15, 40), poolMat, L.aim[0], L.poolY + 0.03, L.aim[2], root); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2;

    // secret-ink steps: one instanced mesh that swaps from a ghost material to drawn, glowing ink
    const [sw, sh, sd] = L.step;
    const hatch = k.canvasTex(128, 128, (g, W, H) => {
      g.fillStyle = INK; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 3;
      for (let i = -H; i < W; i += 14) { g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke(); }
      g.strokeStyle = PAL.ink; g.lineWidth = 6; g.strokeRect(5, 5, W - 10, H - 10);
    });
    const inkMat = k.own(new THREE.MeshStandardMaterial({ map: hatch, emissive: new THREE.Color(INK_GLOW), emissiveMap: hatch, emissiveIntensity: 0.5, roughness: 0.7 }));
    const ghostMat = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color(INK_GLOW), transparent: true, opacity: GHOST_OPACITY[0], depthWrite: false }));
    const steps = new THREE.InstancedMesh(k.roundedBox(sw, sh, sd, 0.12, 3), ghostMat, L.steps.length), dummy = new THREE.Object3D();
    const inkCols = L.steps.map(([x, top, z], i) => {
      dummy.position.set(x, top - sh / 2, z); dummy.updateMatrix(); steps.setMatrixAt(i, dummy.matrix);
      return world.addBox(x, top - sh, top, z, sw / 2, sd / 2, { off: true });
    });
    root.add(steps);
    const edgeGeo = mergeGeos(THREE, L.steps.map(([x, top, z]) => new THREE.EdgesGeometry(new THREE.BoxGeometry(sw, sh, sd)).translate(x, top - sh / 2, z)));
    const dashMat = k.own(new THREE.LineDashedMaterial({ color: new THREE.Color(INK_GLOW), dashSize: 0.28, gapSize: 0.22, transparent: true, opacity: 0.5 }));
    const solidLine = k.own(new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.ink) }));
    const edges = new THREE.LineSegments(edgeGeo, dashMat); edges.computeLineDistances(); root.add(edges);

    const st = { on: false, glow: 0, linger: 0, hinted: false };
    function setOn(on) {
      st.on = on;
      for (const c of inkCols) c.off = !on;
      steps.material = on ? inkMat : ghostMat; edges.material = on ? solidLine : dashMat;
      bulbMat.color.set(on ? '#FFF6D8' : '#E8E0CF');
      world.placeCollider(btnCol, L.button[0], baseTop + 0.3 - (on ? PRESS_DEPTH : 0), L.button[1]);
      btn.position.y = baseTop + 0.15 - (on ? PRESS_DEPTH : 0);
    }
    // standOn: the box Mimo must stand on for the tip to come (the books below the lamp)
    function update(dt, t, standOn) {
      const p = world.p;
      if (!st.on && p.grounded && p.ground === btnCol) {
        setOn(true);
        world.burst(L.button[0], baseTop + 0.4, L.button[1], 14, [LAMP_GLOW, PAL.white], 3);
        for (const [x, top, z] of L.steps) world.burst(x, top + 0.2, z, 10, [INK_GLOW, PAL.white], 2.2, { life: 0.8 });
        world.sfx.yay(); world.hint('Im Licht der Lampe leuchtet die Geheimtinte. Jetzt tragen dich die Stufen.');
      }
      if (!st.on && !st.hinted && p.grounded && p.ground === standOn) {
        st.linger += dt;
        if (st.linger > LINGER_HINT) { st.hinted = true; world.hint('Die Lampe hat einen Schalter an ihrem Fuß. Stell dich drauf!'); }
      }
      st.glow = damp(st.glow, st.on ? 1 : 0, 4, dt);
      beamMat.opacity = 0.11 * st.glow; poolMat.opacity = 0.75 * st.glow;
      ghostMat.opacity = lerp(GHOST_OPACITY[0], GHOST_OPACITY[1], 0.5 + 0.5 * Math.sin(t * 2.4));
      inkMat.emissiveIntensity = 0.45 + 0.12 * Math.sin(t * 3);
    }
    function reset() { st.linger = 0; st.hinted = false; setOn(false); }
    reset();
    return { state: st, update, reset };
  }

  // ---------- Glue stick: the white core screws up and down and carries Mimo ----------
  // G: { x, z, bodyR, bodyTop, coreR, low, high, wait, move, color }
  function makeGlueLift(THREE, k, world, G) {
    const { mesh, lit, std, PAL } = k, root = world.root, bottom = Room3D.DESK.top, bodyH = G.bodyTop - bottom;
    lit(mesh(new THREE.CylinderGeometry(G.bodyR, G.bodyR, bodyH, 32), std(G.color, { roughness: 0.4 }), G.x, bottom + bodyH / 2, G.z, root));
    mesh(new THREE.CylinderGeometry(G.bodyR + 0.03, G.bodyR + 0.03, bodyH * 0.42, 32, 1, true), std(PAL.paper, { roughness: 0.7 }), G.x, bottom + bodyH * 0.5, G.z, root);
    world.addCyl(G.x, G.z, G.bodyR, G.bodyTop, bottom);
    const coreGeo = new THREE.CylinderGeometry(G.coreR, G.coreR, 1, 28).translate(0, 0.5, 0);
    const core = lit(mesh(coreGeo, std('#F7F3EA', { roughness: 0.85 }), G.x, G.bodyTop - 0.3, G.z, root));
    // as tall as the core can get, so its side blocks Mimo at every height (the lower part hides in the tube)
    const col = world.addCyl(G.x, G.z, G.coreR, G.high, G.bodyTop - 0.3, { moving: true });
    const period = 2 * (G.wait + G.move), st = { top: G.low };
    // timetable: wait below, screw up, wait above, screw down
    function target(t) {
      const u = ((t % period) + period) % period;
      if (u < G.wait) return G.low;
      if (u < G.wait + G.move) return lerp(G.low, G.high, smooth((u - G.wait) / G.move));
      if (u < 2 * G.wait + G.move) return G.high;
      return lerp(G.high, G.low, smooth((u - 2 * G.wait - G.move) / G.move));
    }
    function update(dt, t) {
      st.top = target(t);
      world.placeCollider(col, G.x, st.top, G.z);
      core.scale.y = st.top - (G.bodyTop - 0.3);
    }
    return { state: st, update };
  }

  // ---------- Paper plane: waits on the desk, flies Mimo to the bed, waits there, flies home ----------
  // F: { points, time, back, board, lost, bedWait, squares: [[f, l]], half, keel, color, bankK, bankMax, samples }
  const FOLD_TIME = 0.9;                                   // seconds the plane takes to appear once folded
  function makePlane(THREE, k, world, F) {
    const { mesh, lit, PAL } = k, root = world.root;
    const curve = new THREE.CatmullRomCurve3(F.points.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
    const N = F.samples, table = [], pt = new THREE.Vector3(), tan = new THREE.Vector3(), length = curve.getLength();
    for (let i = 0; i <= N; i++) {
      curve.getPointAt(i / N, pt); curve.getTangentAt(i / N, tan);
      const flat = Math.hypot(tan.x, tan.z) || 1;
      table.push({ x: pt.x, y: pt.y, z: pt.z, hx: tan.x / flat, hz: tan.z / flat, pitch: Math.atan2(tan.y, flat), bank: 0 });
    }
    // bank into the curves: how fast the heading turns to the right, faded out at take-off and landing
    const SPAN = 6, ds = (2 * SPAN / N) * length;
    table.forEach((a, i) => {
      const b0 = table[Math.max(0, i - SPAN)], b1 = table[Math.min(N, i + SPAN)], turn = ((b1.hx - b0.hx) * -a.hz + (b1.hz - b0.hz) * a.hx) / ds;
      const fade = smooth(clamp(i / N / 0.12, 0, 1)) * smooth(clamp((1 - i / N) / 0.12, 0, 1));
      a.bank = clamp(turn * F.bankK, -F.bankMax, F.bankMax) * fade; a.pitch *= fade;
    });
    function pose(s, out) {
      const f = clamp(s, 0, 1) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i, a = table[i], b = table[i + 1];
      for (const key of ['x', 'y', 'z', 'hx', 'hz', 'pitch', 'bank']) out[key] = lerp(a[key], b[key], u);
      const hl = Math.hypot(out.hx, out.hz) || 1; out.hx /= hl; out.hz /= hl;
      return out;
    }
    // a point on the deck: f forward, l to the right; y is the paper surface there
    function deckPoint(q, f, l) {
      return [q.x + f * q.hx - l * q.hz, q.y + f * Math.sin(q.pitch) - l * Math.sin(q.bank) + F.dihedral * Math.abs(l) / F.half, q.z + f * q.hz + l * q.hx];
    }

    // the dart: two wings with a slight V and the folded body below, in coloured squared paper
    const L = F.length / 2, H = F.half, D = F.dihedral, K = F.keel;
    const grid = k.canvasTex(256, 256, (g, W) => {
      g.fillStyle = F.color; g.fillRect(0, 0, W, W);
      g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 2;
      for (let i = 0; i <= 16; i++) { const v = i * W / 16; g.beginPath(); g.moveTo(v, 0); g.lineTo(v, W); g.moveTo(0, v); g.lineTo(W, v); g.stroke(); }
    }, [2, 2]);
    const tri = [
      [L, 0, 0], [-L, D, -H], [-L, 0, -0.02], [L, 0, 0], [-L, 0, 0.02], [-L, D, H],         // wings
      [L, 0, 0], [-L, 0, -0.02], [-L, -K, -0.1], [L, 0, 0], [-L, -K, 0.1], [-L, 0, 0.02],   // folded body
      [-L, D, -H], [-L + 0.9, D, -H + 0.32], [-L, D + 0.5, -H], [-L, D, H], [-L, D + 0.5, H], [-L + 0.9, D, H - 0.32], // tip flaps
    ];
    const pos = [], uv = [];
    for (const [x, y, z] of tri) { pos.push(x, y, z); uv.push(x / F.length + 0.5, z / F.length + 0.5); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const plane = new THREE.Group(); plane.rotation.order = 'YZX'; root.add(plane);
    lit(mesh(geo, k.texStd(grid, { roughness: 0.85, side: THREE.DoubleSide }), 0, 0, 0, plane));

    const cols = F.squares.map(() => world.addBox(0, 0, F.deckDepth, 0, F.square, F.square, { moving: true }));
    const st = { s: 0, tau: 0, mode: 'dock', boardT: 0, lostT: 0, waitT: 0, carry: false };
    // folded: whether the plane exists yet (the story has it folded from three sheets); it grows in with a spin
    const fold = { on: true, k: 1 };
    function setFolded(on, instant) {
      fold.on = !!on; if (instant) fold.k = fold.on ? 1 : 0;
      for (const c of cols) c.off = !fold.on;
    }
    const q = {}, last = { x: 0, z: 0 }, ease = (u) => u - F.ease * Math.sin(2 * Math.PI * u) / (2 * Math.PI);
    function place(dt) {
      pose(st.s, q);
      plane.position.set(q.x, q.y, q.z); plane.rotation.set(q.bank, Math.atan2(-q.hz, q.hx), q.pitch);
      F.squares.forEach(([f, l], i) => { const [x, y, z] = deckPoint(q, f, l); world.placeCollider(cols[i], x, y - F.deckDepth / 2, z); });
      const vx = dt > 0 ? (q.x - last.x) / dt : 0, vz = dt > 0 ? (q.z - last.z) / dt : 0;
      last.x = q.x; last.z = q.z;
      return [vx, vz];
    }
    function update(dt) {
      const p = world.p, riding = p.grounded && cols.includes(p.ground);
      // Mimo keeps the plane's speed while he hops on it, as if the air moved with the plane
      if (riding) st.carry = true;
      else if (p.grounded || p.y < q.y - F.carryDrop) st.carry = false;
      const aboard = riding || st.carry;
      fold.k = Math.max(0, Math.min(1, fold.k + (fold.on ? dt : -dt) / FOLD_TIME));
      const grow = fold.k >= 1 ? 1 : 1 + 2.2 * Math.pow(fold.k - 1, 3) + 1.2 * Math.pow(fold.k - 1, 2);   // a little overshoot
      plane.visible = fold.k > 0.01; plane.scale.setScalar(Math.max(0.001, grow));
      if (st.mode === 'dock') { st.boardT = riding ? st.boardT + dt : 0; if (st.boardT > F.board) { st.mode = 'out'; st.lostT = 0; } }
      else if (st.mode === 'out') {
        st.tau = Math.min(1, st.tau + dt / F.time);
        st.lostT = aboard ? 0 : st.lostT + dt;
        if (st.tau >= 1) { st.mode = 'bed'; st.waitT = 0; } else if (st.lostT > F.lost) st.mode = 'home';
      } else if (st.mode === 'bed') { st.waitT = aboard ? 0 : st.waitT + dt; if (st.waitT > F.bedWait) st.mode = 'home'; }
      else if (st.mode === 'home') {
        st.tau = Math.max(0, st.tau - dt / F.back);
        if (riding) st.mode = 'out'; else if (st.tau <= 0) { st.mode = 'dock'; st.boardT = 0; }
      }
      st.s = ease(st.tau);
      const [vx, vz] = place(dt);
      if (fold.k < 1) plane.rotation.y += (1 - fold.k) * Math.PI * 2;   // spins in while it is folded
      if (st.carry && !p.grounded) { p.extX = vx; p.extZ = vz; }
    }
    function reset() { Object.assign(st, { s: 0, tau: 0, mode: 'dock', boardT: 0, lostT: 0, waitT: 0, carry: false }); place(0); }
    // where something sits on the deck at a point of the flight: for stars and camera nodes
    function at(s, f, l, up) { const o = pose(s, {}), [x, y, z] = deckPoint(o, f, l); return { pos: [x, y + (up || 0), z], yaw: Math.atan2(o.hx, -o.hz) }; }
    // where a spot of the deck is right now (the test routes steer Mimo there while he rides)
    const deck = (f, l) => deckPoint(q, f, l);
    reset();
    return { state: st, update, reset, at, deck, length, setFolded, folded: () => fold.on };
  }

  Room3D.s3Parts = { mergeGeos, rodGeo, bookStacks, makeLamp, makeGlueLift, makePlane };
})();
