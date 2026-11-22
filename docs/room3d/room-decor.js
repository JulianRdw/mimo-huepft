/* Mimo hüpft · Kinderzimmer (3D) · room and furniture
   The backdrop: floor, walls, window light and the huge furniture around the play area.
   Everything is solid, so Mimo can walk anywhere in the room and stand on whatever he reaches.
   Big things are also reported as camera blocks, so the camera never ends up inside them. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // One unit is about 3.6 cm: the room is roughly 5 m by 3 m
  const ROOM = { x0: -24, x1: 112, z0: -36, z1: 46, h: 72 };
  const WINDOW = { z0: -21, z1: 5, y0: 26, y1: 56 };
  const SUN_DIR = [0.7, -0.7, -0.12];     // the way the afternoon light travels
  const SHELF = { x0: -22, cols: 3, rows: 4, cell: 9, board: 0.9, depth: 9 };
  const TEDDY_SCALE = 0.85;
  const BED = { x0: 52, x1: 106, z1: -8, under: 8, top: 16.5 };

  function makeDecor(THREE, k, world) {
    const { PAL, std, mat, basic, mesh, roundedBox, tex, texStd, rng } = k;
    const tmpColor = new THREE.Color(), DAY_WALL_GLOW = 0.42;
    const shadowTex = k.radialTexture('rgba(46,34,26,0.6)', 'rgba(46,34,26,0)');
    const shadowMat = k.own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    const group = (parent) => { const g = new THREE.Group(); parent.add(g); return g; };
    const refs = {};                          // materials the time of day changes
    const NIGHT_LAMP = { x: 29.4, y: 9.6, glowDay: 0.35, glowNight: 1.8 }, STAR_DULL = '#DCE5B8', STAR_BRIGHT = '#E6FF9C';
    // Soft dark spot on the floor below big things, instead of real shadows far from Mimo
    function blob(parent, x, z, rx, rz, opacity) {
      const m = mesh(new THREE.CircleGeometry(1, 28), opacity ? k.own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity })) : shadowMat, x, 0.08, z, parent);
      m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.renderOrder = 1; return m;
    }

    function shell(root) {
      const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, cx = (ROOM.x0 + ROOM.x1) / 2, cz = (ROOM.z0 + ROOM.z1) / 2;
      const floor = mesh(new THREE.PlaneGeometry(W, D), texStd(tex.floor(W / 13.2, D / 36), { roughness: 0.5, envMapIntensity: 0.3 }), cx, 0, cz, root);
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
      // the walls glow a little by themselves, so the one facing away from the window does not go muddy
      const wall = k.own(new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.wall), emissive: new THREE.Color(PAL.wall), emissiveIntensity: 0.42 })), skirt = mat(PAL.skirting);
      refs.wall = wall;
      mesh(new THREE.PlaneGeometry(W, ROOM.h), wall, cx, ROOM.h / 2, ROOM.z0, root);
      mesh(new THREE.PlaneGeometry(D, ROOM.h), wall, ROOM.x0, ROOM.h / 2, cz, root).rotation.y = Math.PI / 2;
      mesh(new THREE.PlaneGeometry(D, ROOM.h), wall, ROOM.x1, ROOM.h / 2, cz, root).rotation.y = -Math.PI / 2;
      mesh(new THREE.BoxGeometry(W, 2.4, 0.5), skirt, cx, 1.2, ROOM.z0 + 0.25, root);
      mesh(new THREE.BoxGeometry(0.5, 2.4, D), skirt, ROOM.x0 + 0.25, 1.2, cz, root);
      mesh(new THREE.BoxGeometry(0.5, 2.4, D), skirt, ROOM.x1 - 0.25, 1.2, cz, root);
      // fourth wall behind the starting point; seen from outside it is invisible, so the camera may sit behind it
      mesh(new THREE.PlaneGeometry(W, ROOM.h), wall, cx, ROOM.h / 2, ROOM.z1, root).rotation.y = Math.PI;
    }

    function windowAndSun(root) {
      const w = WINDOW, x = ROOM.x0, zc = (w.z0 + w.z1) / 2, yc = (w.y0 + w.y1) / 2, ww = w.z1 - w.z0, wh = w.y1 - w.y0;
      const frame = mat(PAL.white), g = group(root);
      refs.pane = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF6DF') }));
      mesh(new THREE.PlaneGeometry(ww, wh), refs.pane, x + 0.2, yc, zc, g).rotation.y = Math.PI / 2;
      for (const [dy, dz, h, d] of [[wh / 2, 0, 1.6, ww + 3], [-wh / 2, 0, 1.6, ww + 3], [0, -ww / 2, wh, 1.6], [0, ww / 2, wh, 1.6], [0, 0, wh, 1.1], [0, 0, 1.1, ww]]) mesh(new THREE.BoxGeometry(1.2, h, d), frame, x + 0.6, yc + dy, zc + dz, g);
      mesh(new THREE.BoxGeometry(4, 0.9, ww + 5), frame, x + 2, w.y0 - 1.2, zc, g);
      for (const s of [-1, 1]) {
        const cloth = new THREE.PlaneGeometry(9, wh + 10, 10, 1), pos = cloth.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.1) * 0.6);
        cloth.computeVertexNormals();
        mesh(cloth, mat('#E9C46A', { side: THREE.DoubleSide }), x + 2.2, yc + 1, zc + s * (ww / 2 + 3.5), g).rotation.y = Math.PI / 2;
      }
      mesh(new THREE.CylinderGeometry(0.4, 0.4, ww + 20, 8), mat(PAL.birch), x + 2.2, w.y1 + 5.6, zc, g).rotation.x = Math.PI / 2;
      // the same window, thrown onto the floor by the sun
      const hit = (y, z) => { const t = y / -SUN_DIR[1]; return [x + SUN_DIR[0] * t, 0.075, z + SUN_DIR[2] * t]; };
      const quad = new THREE.BufferGeometry();
      quad.setAttribute('position', new THREE.Float32BufferAttribute([...hit(w.y0, w.z1), ...hit(w.y0, w.z0), ...hit(w.y1, w.z1), ...hit(w.y1, w.z0)], 3));
      quad.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); quad.setIndex([0, 2, 1, 1, 2, 3]);
      const patch = mesh(quad, k.own(new THREE.MeshBasicMaterial({ map: tex.sunPatch(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.22, side: THREE.DoubleSide })), 0, 0, 0, root);
      patch.renderOrder = 2; refs.patch = patch.material;
      // dust dancing in the beam
      const r = rng(21), N = 150, P = new Float32Array(N * 3), seeds = [];
      for (let i = 0; i < N; i++) {
        const y = w.y0 + r() * wh, z = w.z0 + r() * ww, f = hit(y, z), t = 0.25 + r() * 0.75;
        seeds.push([x + (f[0] - x) * t, y * (1 - t), z + (f[2] - z) * t, r() * 6.28]);
      }
      const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      const dust = new THREE.Points(dustGeo, k.own(new THREE.PointsMaterial({ map: k.haloTex, color: new THREE.Color('#FFE7B8'), size: 0.2, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
      dust.frustumCulled = false; root.add(dust); refs.dust = dust.material;
      return (t) => {
        for (let i = 0; i < N; i++) { const s = seeds[i]; P[i * 3] = s[0] + Math.sin(t * 0.21 + s[3]) * 0.8; P[i * 3 + 1] = s[1] + Math.sin(t * 0.17 + s[3] * 2) * 0.6; P[i * 3 + 2] = s[2] + Math.cos(t * 0.19 + s[3]) * 0.8; }
        dustGeo.attributes.position.needsUpdate = true;
      };
    }

    function football(root, x, z, r) {
      const g = group(root); g.position.set(x, r, z);
      mesh(new THREE.SphereGeometry(r, 32, 24), std('#F8F6F0', { roughness: 0.45 }), 0, 0, 0, g);
      const patchGeo = new THREE.CircleGeometry(r * 0.3, 5), ink = mat('#26262E'), phi = (1 + Math.sqrt(5)) / 2;
      for (const [a, b, c] of [[0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi], [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0], [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]]) {
        const v = new THREE.Vector3(a, b, c).normalize(), p = mesh(patchGeo, ink, v.x * r * 1.003, v.y * r * 1.003, v.z * r * 1.003, g);
        p.lookAt(g.position.x + v.x * r * 3, r + v.y * r * 3, g.position.z + v.z * r * 3);
      }
      k.bakeColors(g);
      g.rotation.set(0.4, 0.7, 0.2);
      blob(root, x, z, r * 1.25, r * 1.25);
      world.addCyl(x, z, r * 0.97, r * 1.6, r * 0.4); world.addCyl(x, z, r * 0.7, r * 2, 0);
      world.addCamBlock(x - r, x + r, 0, r * 2, z - r, z + r);
    }

    function shelf(root) {
      const s = SHELF, white = mat(PAL.furniture), W = s.cols * s.cell + (s.cols + 1) * s.board, H = s.rows * s.cell + (s.rows + 1) * s.board;
      const zc = ROOM.z0 + s.depth / 2, zf = ROOM.z0 + s.depth, r = rng(9), g = group(root);
      for (let c = 0; c <= s.cols; c++) mesh(new THREE.BoxGeometry(s.board, H, s.depth), white, s.x0 + s.board / 2 + c * (s.cell + s.board), H / 2, zc, g);
      for (let rw = 0; rw <= s.rows; rw++) mesh(new THREE.BoxGeometry(W, s.board, s.depth), white, s.x0 + W / 2, s.board / 2 + rw * (s.cell + s.board), zc, g);
      mesh(new THREE.BoxGeometry(W, H, 0.3), mat('#D9D0BE'), s.x0 + W / 2, H / 2, ROOM.z0 + 0.4, g);
      const soft = ['#E7A27C', '#8DB8A8', '#E9C46A', '#9DB4D6', '#C9A5C9', '#E58F8F'];
      const fill = [['box', 'box', 'box'], ['books', 'ball', 'books'], ['pile', 'books', 'box'], ['books', 'pile', 'books']];
      for (let rw = 0; rw < s.rows; rw++) for (let c = 0; c < s.cols; c++) {
        const cx = s.x0 + s.board + s.cell / 2 + c * (s.cell + s.board), y0 = s.board + rw * (s.cell + s.board), kind = fill[rw][c];
        if (kind === 'box') {
          mesh(roundedBox(8, 7.6, 8, 0.5, 3), mat(soft[(c + rw * 2) % soft.length]), cx, y0 + 3.8, zf - 4.2, g);
          world.addBox(cx, y0, y0 + 7.6, zf - 4.2, 4, 4);
          if (rw === 0 && c === 2) k.emblemDisc(1.3, g, cx + 2.2, y0 + 2.2, zf - 0.17);
          mesh(new THREE.CircleGeometry(1.1, 20), mat('#5B4E48'), cx, y0 + 5.4, zf - 0.17, g).scale.y = 0.55;
        } else if (kind === 'books') {
          let x = cx - 4.1;
          while (x < cx + 3.4) { const t = 0.7 + r() * 0.7, h = 5.6 + r() * 2.4; mesh(new THREE.BoxGeometry(t, h, 6), mat(soft[Math.floor(r() * soft.length)]), x + t / 2, y0 + h / 2, zf - 3.6, g); x += t + 0.06; }
        } else if (kind === 'pile') {
          for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(6.6 - i * 0.4, 1.1, 6), mat(soft[(i + c) % soft.length]), cx + (r() - 0.5), y0 + 0.55 + i * 1.1, zf - 3.6, g).rotation.y = (r() - 0.5) * 0.3;
        } else if (kind === 'ball') {
          mesh(new THREE.SphereGeometry(3.2, 24, 18), mat('#E58F8F'), cx, y0 + 3.2, zf - 4, g);
          mesh(new THREE.TorusGeometry(3.22, 0.28, 6, 32), mat(PAL.furniture), cx, y0 + 3.2, zf - 4, g).rotation.x = Math.PI / 2;
        }
      }
      k.bakeColors(g);
      blob(root, s.x0 + W / 2, zf + 0.5, W * 0.62, 5, 0.7);
      for (let c = 0; c <= s.cols; c++) world.addBox(s.x0 + s.board / 2 + c * (s.cell + s.board), 0, H, zc, s.board / 2, s.depth / 2);
      for (let rw = 0; rw <= s.rows; rw++) world.addBox(s.x0 + W / 2, rw * (s.cell + s.board), s.board + rw * (s.cell + s.board), zc, W / 2, s.depth / 2);
      world.addCamBlock(s.x0, s.x0 + W, 0, H, ROOM.z0, zf);
    }

    function teddy(root, x, z, yaw) {
      const g = group(root); g.position.set(x, 0, z); g.rotation.y = yaw; g.scale.setScalar(TEDDY_SCALE);
      const fur = mat(PAL.teddy), cream = mat('#F2E0C2'), ink = std('#2A2530', { roughness: 0.15 });
      const ball = (r, m, px, py, pz, sx, sy, sz, parent) => { const b = mesh(new THREE.SphereGeometry(r, 28, 20), m, px, py, pz, parent || g); b.scale.set(sx || 1, sy || 1, sz || 1); return b; };
      ball(4.2, fur, 0, 4.5, 0, 1, 1.1, 0.92); ball(3, cream, 0, 4.3, 1.75, 0.95, 1, 0.75);
      const head = group(g); head.position.set(0, 10.7, 0.3); head.rotation.z = 0.13;
      ball(3.3, fur, 0, 0, 0, 1.06, 0.98, 1, head); ball(1.5, cream, 0, -0.75, 2.6, 1.1, 0.82, 0.9, head); ball(0.5, ink, 0, -0.35, 3.85, 1.2, 0.85, 0.8, head);
      for (const s of [-1, 1]) { ball(1.25, fur, s * 2.5, 2.5, 0, 1, 1, 0.6, head); ball(0.75, cream, s * 2.5, 2.5, 0.42, 1, 1, 0.5, head); ball(0.42, ink, s * 1.25, 0.6, 2.85, 1, 1.15, 0.7, head); }
      for (const s of [-1, 1]) {
        const leg = mesh(new THREE.CapsuleGeometry(1.55, 2.8, 8, 18), fur, s * 2.6, 1.6, 3.6, g); leg.rotation.set(Math.PI / 2, 0, -s * 0.22);
        const pad = mesh(new THREE.CircleGeometry(1.15, 20), cream, s * 3.05, 1.7, 6.58, g); pad.rotation.y = s * 0.22;
        const arm = mesh(new THREE.CapsuleGeometry(1.2, 3, 8, 18), fur, s * 4.5, 5.4, 1.1, g); arm.rotation.set(0.5, 0, s * 0.45);
      }
      const scarf = texStd(tex.scarf(), { roughness: 0.9 });
      mesh(new THREE.TorusGeometry(2.75, 0.8, 10, 40), scarf, 0, 8.25, 0.2, g).rotation.x = Math.PI / 2;
      const tail = mesh(new THREE.BoxGeometry(1.5, 4, 0.5), mat('#FDE100'), 1.9, 6.3, 3.5, g); tail.rotation.set(0.25, 0, -0.12);
      k.emblemDisc(0.62, tail, 0, -0.9, 0.26);
      k.bakeColors(head); k.bakeColors(g);
      blob(root, x, z + 1, 8.5 * TEDDY_SCALE, 8.5 * TEDDY_SCALE);
      // solid parts: belly, head (to stand on) and the two legs; local points turned by the teddy's yaw
      const S = TEDDY_SCALE, cs = Math.cos(yaw), sn = Math.sin(yaw), at = (lx, lz) => [x + (lx * cs + lz * sn) * S, z + (-lx * sn + lz * cs) * S];
      world.addCyl(x, z, 3.6 * S, 9 * S, 0);
      world.addCyl(...at(0, 0.3), 2.9 * S, 13.9 * S, 7.6 * S);
      for (const s of [-1, 1]) for (const lz of [3.4, 5.6]) world.addCyl(...at(s * 2.8, lz), 1.45 * S, 3.1 * S, 0);
      world.addCamBlock(x - 4.2 * S, x + 4.2 * S, 0, 14 * S, z - 4.2 * S, z + 4.2 * S);
    }

    function bed(root) {
      const b = BED, z0 = ROOM.z0, len = b.x1 - b.x0, wid = b.z1 - z0, cx = (b.x0 + b.x1) / 2, cz = (z0 + b.z1) / 2;
      const wood = mat(PAL.birch), g = group(root);
      for (const px of [b.x0 + 1.4, b.x1 - 1.4]) for (const pz of [z0 + 1.6, b.z1 - 1.4]) mesh(roundedBox(2.6, b.under + 3, 2.6, 0.4, 3), wood, px, (b.under + 3) / 2, pz, g);
      mesh(roundedBox(len, 3, wid, 0.5, 3), wood, cx, b.under + 1.5, cz, g);
      mesh(roundedBox(len - 1.5, 5.6, wid - 1.5, 1.6, 5), mat('#FBF7EE'), cx, b.under + 5.7, cz, g);
      mesh(roundedBox(2.2, 24, wid, 0.6, 3), wood, b.x1 - 1.1, 12, cz, g);
      // blanket: lies on the mattress and hangs down at the foot end and towards the room
      const cloth = k.own(new THREE.MeshLambertMaterial({ map: tex.blanket(), side: THREE.DoubleSide }));
      const top = b.top + 0.25, bl = len * 0.72;
      mesh(roundedBox(bl, 1.2, wid + 0.6, 0.55, 3), cloth, b.x0 + bl / 2 - 0.3, top - 0.3, cz, g);
      const drape = (w, h) => { const geo = new THREE.PlaneGeometry(w, h, 24, 1), pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.9) * 0.45 * (0.5 - pos.getY(i) / h)); geo.computeVertexNormals(); return geo; };
      mesh(drape(bl, 9.5), cloth, b.x0 + bl / 2 - 0.3, top - 4.9, b.z1 + 0.45, g);
      mesh(drape(wid, 9.5), cloth, b.x0 - 0.45, top - 4.9, cz, g).rotation.y = -Math.PI / 2;
      mesh(roundedBox(9, 3.2, 17, 1.5, 5), mat('#FFFFFF'), b.x1 - 9, b.top + 1.4, cz, g).rotation.z = -0.12;
      const dark = mesh(new THREE.PlaneGeometry(len, wid), k.own(new THREE.MeshBasicMaterial({ color: 0x2e221a, transparent: true, opacity: 0.42, depthWrite: false })), cx, 0.09, cz, root);
      dark.rotation.x = -Math.PI / 2; dark.renderOrder = 1;
      // solid: four legs, frame, mattress with blanket, headboard. Below the frame Mimo can walk through.
      for (const px of [b.x0 + 1.4, b.x1 - 1.4]) for (const pz of [z0 + 1.6, b.z1 - 1.4]) world.addBox(px, 0, b.under, pz, 1.3, 1.3);
      world.addBox(cx, b.under, b.under + 3, cz, len / 2, wid / 2);
      world.addBox(cx, b.under + 3, top + 0.3, cz, len / 2 - 0.75, wid / 2 - 0.75);
      world.addBox(b.x1 - 1.1, 0, 24, cz, 1.1, wid / 2);
      world.addCamBlock(b.x0, b.x1, b.under, top + 0.3, z0, b.z1); world.addCamBlock(b.x1 - 2.2, b.x1, 0, 24, z0, b.z1);
      // a sticker on the inside of one leg, only seen from below the bed
      const sticker = k.emblemDisc(0.95, g, b.x0 + 2.72, 4.2, b.z1 - 1.4); if (sticker) sticker.rotation.y = Math.PI / 2;
    }

    // Fan flag on the wall above the bed, with the crest in the middle if the host has one
    function wallFlag(root) {
      const w = 30, h = 20, geo = new THREE.PlaneGeometry(w, h, 20, 6), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.55) * 0.35 * (0.5 - pos.getY(i) / h));
      geo.computeVertexNormals();
      const picture = tex.flag(), m = k.own(new THREE.MeshLambertMaterial({ map: picture, emissive: new THREE.Color('#FFFFFF'), emissiveMap: picture, emissiveIntensity: k.GLOW_OWN }));
      mesh(geo, m, 79, 37, ROOM.z0 + 0.6, root); k.pictureMats.push(m);
      k.emblemDisc(6.3, root, 79, 37, ROOM.z0 + 1.15);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.45, 10, 8), mat('#C9CCD6'), 79 + s * 14.4, 46.4, ROOM.z0 + 0.9, root);
    }

    // Wall socket with a small night light: a hint of how big everything is
    function socket(root, x) {
      const z = ROOM.z0 + 0.25, plate = mat(PAL.white);
      mesh(roundedBox(3.1, 3.1, 0.4, 0.18, 2), plate, x, 8, z + 0.2, root);
      mesh(new THREE.CircleGeometry(1.15, 24), mat('#E6E2DA'), x, 8, z + 0.42, root);
      for (const s of [-1, 1]) mesh(new THREE.CircleGeometry(0.14, 10), mat('#3A3A44'), x + s * 0.38, 8, z + 0.44, root);
      mesh(roundedBox(3.1, 3.1, 0.4, 0.18, 2), plate, x + 3.4, 8, z + 0.2, root);
      mesh(roundedBox(1.8, 1.8, 1.2, 0.3, 2), plate, x + 3.4, 8, z + 1, root);
      refs.lamp = k.own(new THREE.MeshLambertMaterial({ color: new THREE.Color('#FFF1C2'), emissive: new THREE.Color('#F5C76A'), emissiveIntensity: NIGHT_LAMP.glowDay }));
      mesh(new THREE.SphereGeometry(1.5, 20, 14), refs.lamp, x + 3.4, NIGHT_LAMP.y, z + 1.9, root);
    }

    // Glow-in-the-dark stars stuck to the wall above the bed: pale by day, bright at night
    function glowStars(root) {
      const r = rng(77);
      refs.stars = k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color(STAR_DULL), transparent: true, opacity: 0.3, fog: false }));
      const all = group(root);
      for (let i = 0; i < 22; i++) {
        const onBack = i < 15, s = 1.6 + r() * 2.2, star = new THREE.Mesh(k.starGeo, refs.stars);
        if (onBack) star.position.set(50 + r() * 58, 24 + r() * 40, ROOM.z0 + 0.35); else { star.position.set(ROOM.x1 - 0.35, 22 + r() * 40, ROOM.z0 + 4 + r() * 40); star.rotation.y = -Math.PI / 2; }
        if (onBack && Math.abs(star.position.x - 79) < 18 && Math.abs(star.position.y - 37) < 12) star.position.y += 24;   // keep the flag free
        star.scale.set(s, s, 0.3); star.rotation.z = r() * 6.28; all.add(star);
      }
      k.bakeSame(all);
    }
    // m: the current light values, see room-mood.js
    function setMood(m) {
      refs.wall.emissiveIntensity = m.wallGlow; refs.pane.color.copy(m.pane);
      refs.patch.opacity = m.patch; refs.patch.color.copy(m.patchColor); refs.dust.opacity = m.dust;
      refs.lamp.emissiveIntensity = NIGHT_LAMP.glowDay + (NIGHT_LAMP.glowNight - NIGHT_LAMP.glowDay) * m.glow;
      refs.stars.opacity = 0.3 + 0.7 * m.glow; refs.stars.color.set(STAR_DULL).lerp(tmpColor.set(STAR_BRIGHT), m.glow);
      for (const pm of k.pictureMats) pm.emissiveIntensity = k.GLOW_OWN * (0.25 + 0.75 * m.wallGlow / DAY_WALL_GLOW);
    }
    function build(root) {
      shell(root);
      const stepDust = windowAndSun(root);
      shelf(root);
      teddy(root, -13.2, -19, 0.6);
      football(root, 14.4, -30.6, 3);
      socket(root, 26);
      bed(root);
      wallFlag(root);
      glowStars(root);
      return { update: stepDust, setMood, nightLightAt: [NIGHT_LAMP.x, NIGHT_LAMP.y, ROOM.z0 + 2.4] };
    }
    return { build, blob };
  }

  Room3D.ROOM = ROOM;
  Room3D.SUN_DIR = SUN_DIR;
  Room3D.makeDecor = makeDecor;
})();
