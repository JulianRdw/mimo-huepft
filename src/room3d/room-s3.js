/* Mimo hüpft · Kinderzimmer (3D) · section 3 "Schreibtisch"
   Evening on the desk. The way climbs, because the propeller cap glides over any flat gap:
   sticky notes in spilled ink, a stapler that bounces Mimo onto a stack of books, a ruler seesaw over a
   roll of tape, the desk lamp whose light makes steps of secret ink solid, the glue-stick lift and on top
   of a tissue box the paper plane that flies him across the room to the bed.
   It starts at the right end of the desk (where section 2 arrives) and runs towards -x along the back,
   then turns to the front and back towards +x. Moving parts live in room-s3b.js. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const TOP = 21;                          // desk top, the same as Room3D.DESK.top
  const BOOK_H = 0.9;
  const LAY = {
    start: [14, TOP, 37],
    flag1: [10.5, TOP, 34.6],
    notebook: { x: 4.6, z: 31.2, w: 9.2, d: 6.4, yaw: 0.05 },
    clips: [[1.4, 29.4, 0.4], [8.3, 33.2, 2.1], [-15.4, 29.0, 1.2], [-19.6, 35.4, 2.6], [9.6, 43.8, 0.9]],
    pads: { size: 2.4, h: 0.5, list: [[9.4, 37.2], [6.6, 39.8]] },
    // spilled ink around the stapler: x, z, radius
    spill: [[0.9, 37.7, 1.6], [2.7, 38.0, 1.9], [4.6, 37.8, 1.8], [6.3, 37.2, 1.4], [8.2, 38.4, 1.4], [8.4, 40.7, 1.5], [7.0, 42.4, 1.7],
      [5.0, 42.1, 2.0], [2.8, 42.0, 2.0], [0.9, 41.8, 1.6], [4.4, 40.0, 1.2], [6.6, 39.8, 1.3]],
    bottle: { x: 4.0, z: 44.6, r: 0.95, len: 2.2 },
    stapler: { x0: 0.6, x1: 5.0, z: 39.8, w: 1.5, top: 22.3, bounce: 19.5 },
    b1: { x: -1.8, z: 39.8, w: 4.8, d: 6.0, n: 4 },              // first stack of books, reached by the stapler
    tape: { x: -7.75, z: 39.8, stand: 2, r: 1.5, width: 1.6 },   // roll of tape on two books: the seesaw's pivot
    ruler: { len: 8.3, width: 1.6, segs: 12 },
    b2: { x: -14.0, z: 39.9, w: 5.4, d: 6.2, n: 5, h: 0.88 },    // the lamp stands on these books
    lamp: { base: [-15.0, 41.4], baseR: 1.4, baseH: 0.5, button: [-14.7, 40.55], buttonR: 0.42, elbow: [-15.9, 33.6, 42.2], head: [-12.2, 35.6, 33.8], aim: [-11.6, 21, 32.6], poolR: 5.6 },
    ink: { step: [2.4, 0.6, 2.4], list: [[-14.8, 26.0, 34.2], [-11.7, 26.6, 32.4], [-8.6, 27.2, 31.2]] },
    glue: { x: -5.6, z: 30.8, bodyR: 1.2, bodyTop: 27.0, coreR: 1.05, low: 27.2, high: 30.8, wait: 1.1, move: 1.5 },
    glueCap: { x: -8.4, z: 28.4, r: 1.3, len: 1.7 },
    launch: { x: -1.0, z: 30.4, w: 5.8, d: 4.4, n: 3, box: [5.2, 6.6, 3.6] },   // books with a tissue box on top
    // the flight: from the tissue box over the room to the bed
    flight: [[-0.6, 31.0, 30.4], [8.6, 30.0, 25.2], [20, 27.6, 12], [35, 24.2, -3], [49, 20.6, -14], [57.5, 18.5, -19.6], [60.8, 17.75, -21.5]],
    flag3: [64.0, 17.05, -25.4],
    // hidden: in the pencil cup behind the lamp's books, and on the chair seat below the desk
    corner: { eraser: [-20.4, 38.6], eraserSize: [2.6, 1.6, 1.8], cup: [-20.6, 42.8], cupSize: 3.2, wall: 0.45, cupH: 3.6, fill: 1.5 },
    secrets: [[-20.6, 23.6, 42.8], [-6.0, 13.4, 17.6]],
    sharpener: { x: -17.4, z: 29.6 },
  };
  const PLANE = {
    time: 11, back: 8, board: 0.6, lost: 1.2, bedWait: 5, ease: 0.6, samples: 600,
    length: 7, half: 2.6, dihedral: 0.18, keel: 0.7, deckDepth: 0.6, square: 1.0, carryDrop: 1.5, bankK: 7, bankMax: 0.2,
  };
  // Boxes that carry Mimo, as (forward, right) on the deck. They tile the whole dart without gaps:
  // the boxes stay axis aligned while the plane turns, so the spacing is the box size over the square root of two.
  const DECK_STEP = PLANE.square / Math.SQRT2, DECK_INSET = 0.25;
  PLANE.squares = (() => {
    const L = PLANE.length / 2, out = [];
    for (let f = L - 0.6; f >= -L + DECK_INSET; f -= DECK_STEP) {
      const half = PLANE.half * (L - f) / (2 * L) - DECK_INSET;   // the dart widens towards the tail
      const n = Math.max(0, Math.floor(half / DECK_STEP));
      for (let i = -n; i <= n; i++) out.push([f, i * DECK_STEP]);
    }
    return out;
  })();
  // stars on the flight: point of the flight, forward and sideways on the deck, height above it.
  // The one to hop for comes late, when the plane slows down for landing, so the timing is fair.
  const FLIGHT_STARS = [[0.3, 0, -1.4, 1.1], [0.55, 0, 1.4, 1.1], [0.86, 0, 0, 1.5]];
  const FLIGHT_CAM = [0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1];
  const SEESAW_DEAD = 0.25, SEESAW_RATE = 7, STAPLER_DIP = 0.12;

  function build(THREE, k, props, world) {
    const { PAL, TOY_COLORS, mesh, lit, std, rng } = k;
    const { addBox, addCyl, addCamBlock, placeCollider, root } = world;
    const parts = Room3D.s3Parts, r = rng(303), stars = [];
    const camBox = (x, z, hx, hz, y0, y1) => addCamBlock(x - hx, x + hx, y0, y1, z - hz, z + hz);

    // ---------- Open notebook, paper clips (only to look at) ----------
    {
      const n = LAY.notebook, page = k.canvasTex(256, 200, (g, W, H) => {
        g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(70,134,210,0.35)'; for (let y = 22; y < H; y += 12) g.fillRect(0, y, W, 1.5);
        g.fillStyle = 'rgba(226,91,69,0.45)'; g.fillRect(26, 0, 2, H);
        g.strokeStyle = 'rgba(58,56,80,0.55)'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(150, 70, 18, 0, Math.PI * 2); g.stroke();
        for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(150 + Math.cos(a * 0.785) * 24, 70 + Math.sin(a * 0.785) * 24); g.lineTo(150 + Math.cos(a * 0.785) * 32, 70 + Math.sin(a * 0.785) * 32); g.stroke(); }
        g.strokeRect(70, 120, 46, 36); g.beginPath(); g.moveTo(64, 122); g.lineTo(93, 98); g.lineTo(122, 122); g.stroke();
      });
      const g = new THREE.Group(); g.position.set(n.x, TOP, n.z); g.rotation.y = n.yaw; root.add(g);
      mesh(k.roundedBox(n.w, 0.1, n.d, 0.04, 2), std(PAL.blue, { roughness: 0.7 }), 0, 0.05, 0, g).receiveShadow = true;
      const sheet = mesh(new THREE.PlaneGeometry(n.w - 0.3, n.d - 0.3), k.texStd(page, { roughness: 0.9 }), 0, 0.13, 0, g); sheet.rotation.x = -Math.PI / 2; sheet.receiveShadow = true;
      const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(0.22, 0.04, 6, 14), std('#C9CDD6', { roughness: 0.3, metalness: 0.6 }), 11), d = new THREE.Object3D();
      for (let i = 0; i < 11; i++) { d.position.set(0, 0.15, -n.d / 2 + 0.5 + i * (n.d - 1) / 10); d.rotation.set(0, Math.PI / 2, 0); d.updateMatrix(); ring.setMatrixAt(i, d.matrix); }
      g.add(ring);
      addBox(n.x, TOP, TOP + 0.14, n.z, n.w / 2 - 0.2, n.d / 2 - 0.2);
      const clipPath = new THREE.CatmullRomCurve3([[0.3, 0.6], [0.3, -0.5], [0, -0.75], [-0.3, -0.5], [-0.3, 0.75], [0.05, 0.95], [0.4, 0.75], [0.4, -0.65]].map(([x, z]) => new THREE.Vector3(x, 0.05, z)));
      const clips = new THREE.InstancedMesh(new THREE.TubeGeometry(clipPath, 40, 0.045, 6), std('#B9BEC9', { roughness: 0.3, metalness: 0.7 }), LAY.clips.length);
      LAY.clips.forEach(([x, z, yaw], i) => { d.position.set(x, TOP + (x > 0 && x < 9.4 && z < 34.4 ? 0.14 : 0), z); d.rotation.set(0, yaw, 0); d.scale.setScalar(1.4); d.updateMatrix(); clips.setMatrixAt(i, d.matrix); });
      clips.receiveShadow = true; root.add(clips);
    }

    // ---------- Spilled ink (danger) with sticky notes in it, and the tipped-over bottle ----------
    {
      const blobs = LAY.spill.map(([x, z, rad]) => new THREE.SphereGeometry(1, 24, 10).scale(rad, 0.14, rad).translate(x, TOP, z));
      k.inked(mesh(parts.mergeGeos(THREE, blobs), std(PAL.danger, { roughness: 0.12, envMapIntensity: k.ENV_SHINY }), 0, 0, 0, root), 0.05);
      for (const [x, z, rad] of LAY.spill) addCyl(x, z, rad * 0.92, TOP + 0.12, TOP - 0.1, { kind: 'hit' });
      const b = LAY.bottle, glass = std('#DCEBEA', { roughness: 0.08, transparent: true, opacity: 0.5, envMapIntensity: k.ENV_SHINY });
      const bottleGeo = parts.mergeGeos(THREE, [new THREE.CylinderGeometry(b.r, b.r, b.len, 24), new THREE.CylinderGeometry(b.r * 0.45, b.r * 0.5, 0.6, 16).translate(0, b.len / 2 + 0.3, 0)]);
      bottleGeo.rotateX(-Math.PI / 2);
      lit(mesh(bottleGeo, glass, b.x, TOP + b.r, b.z, root));
      const inkLeft = mesh(new THREE.CylinderGeometry(b.r * 0.8, b.r * 0.8, b.len * 0.9, 20, 1, false, Math.PI / 2, Math.PI), std(PAL.danger, { roughness: 0.2 }), b.x, TOP + b.r, b.z, root); inkLeft.rotation.x = -Math.PI / 2;
      mesh(new THREE.CylinderGeometry(b.r + 0.02, b.r + 0.02, b.len * 0.45, 24, 1, true), std(PAL.paper, { roughness: 0.8, side: THREE.DoubleSide }), b.x, TOP + b.r, b.z + 0.1, root).rotation.x = Math.PI / 2;
      addBox(b.x, TOP, TOP + b.r * 2, b.z, b.r, b.len / 2 + 0.3);

      const p = LAY.pads, sides = k.canvasTex(32, 64, (g, W, H) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 3; y < H; y += 5) g.fillRect(0, y, W, 1); });
      const pads = new THREE.InstancedMesh(k.roundedBox(p.size, p.h, p.size, 0.05, 2), k.texStd(sides, { roughness: 0.8 }), p.list.length), d = new THREE.Object3D(), c = new THREE.Color();
      p.list.forEach(([x, z], i) => {
        d.position.set(x, TOP + p.h / 2, z); d.rotation.y = (r() - 0.5) * 0.3; d.updateMatrix(); pads.setMatrixAt(i, d.matrix); pads.setColorAt(i, c.set([PAL.yellow, PAL.green][i]));
        addBox(x, TOP, TOP + p.h, z, p.size / 2 - 0.1, p.size / 2 - 0.1);
      });
      lit(pads); root.add(pads);
      stars.push([(p.list[0][0] + p.list[1][0]) / 2, TOP + p.h + 1.5, (p.list[0][1] + p.list[1][1]) / 2]);
    }

    // ---------- Stapler: a springy pad that throws Mimo onto the books ----------
    const sp = LAY.stapler, spLen = sp.x1 - sp.x0, arm = new THREE.Group();
    {
      lit(mesh(k.roundedBox(spLen, 0.35, sp.w - 0.2, 0.12, 2), std('#3A3C49', { roughness: 0.5 }), (sp.x0 + sp.x1) / 2, TOP + 0.175, sp.z, root));
      lit(mesh(k.roundedBox(spLen - 0.7, 0.4, sp.w - 0.5, 0.1, 2), std('#C9CDD6', { roughness: 0.3, metalness: 0.5 }), (sp.x0 + sp.x1) / 2 + 0.2, TOP + 0.55, sp.z, root));
      arm.position.set(sp.x1 - 0.3, TOP + 0.75, sp.z); root.add(arm);
      lit(mesh(k.roundedBox(spLen, 0.55, sp.w, 0.22, 3), std(PAL.blue, { roughness: 0.3, envMapIntensity: k.ENV_SHINY }), -spLen / 2 + 0.3, sp.top - TOP - 0.75 - 0.275, 0, arm));
      const hinge = mesh(new THREE.CylinderGeometry(0.32, 0.32, sp.w + 0.1, 16), std('#3A3C49', { roughness: 0.4 }), 0, 0, 0, arm); hinge.rotation.x = Math.PI / 2;
    }
    stars.push([sp.x0 + 1.0, sp.top + 3.1, sp.z]);     // on the way up from the stapler to the books
    let dip = 0;
    addBox((sp.x0 + sp.x1) / 2, TOP, sp.top, sp.z, spLen / 2, sp.w / 2, { kind: 'bounce', bounce: sp.bounce, onBounce: () => { dip = 1; } });

    // ---------- Book stacks: first stack, pivot stand, the lamp's stack, the launch stack ----------
    const stack = (x, z, w, d, n, h, y0, out) => { for (let i = 0; i < n; i++) out.push({ x: x + (r() - 0.5) * 0.25, y0: y0 + i * h, z: z + (r() - 0.5) * 0.25, w: w - (i % 2) * 0.2, h, d: d - (i % 3) * 0.15, yaw: (r() - 0.5) * 0.08 + (i % 2 ? Math.PI : 0), color: TOY_COLORS[(i * 2 + Math.floor(r() * 5)) % 5] }); return y0 + n * h; };
    const books = [], b1 = LAY.b1, b2 = LAY.b2, tp = LAY.tape, ln = LAY.launch;
    const b1Top = stack(b1.x, b1.z, b1.w, b1.d, b1.n, BOOK_H, TOP, books);
    const standTop = stack(tp.x, tp.z, 3.8, 3.0, tp.stand, 0.8, TOP, books);
    const b2Top = stack(b2.x, b2.z, b2.w, b2.d, b2.n, b2.h, TOP, books);
    const lnBooks = stack(ln.x, ln.z, ln.w, ln.d, ln.n, BOOK_H, TOP, books);
    parts.bookStacks(THREE, k, root, books);
    addBox(b1.x, TOP, b1Top, b1.z, b1.w / 2, b1.d / 2); camBox(b1.x, b1.z, b1.w / 2, b1.d / 2, TOP, b1Top);
    addBox(tp.x, TOP, standTop, tp.z, 1.8, 1.4);
    const b2Col = addBox(b2.x, TOP, b2Top, b2.z, b2.w / 2, b2.d / 2); camBox(b2.x, b2.z, b2.w / 2, b2.d / 2, TOP, b2Top);
    addBox(ln.x, TOP, lnBooks, ln.z, ln.w / 2, ln.d / 2);

    // ---------- Roll of tape and the ruler seesaw on it ----------
    const pivotY = standTop + tp.r * 2, rl = LAY.ruler, RH = props.RULER_H;
    {
      const ringGeo = (z) => new THREE.RingGeometry(tp.r * 0.62, tp.r, 32).translate(0, 0, z);
      const back = ringGeo(-tp.width / 2); back.rotateY(Math.PI);
      const rollGeo = parts.mergeGeos(THREE, [new THREE.CylinderGeometry(tp.r, tp.r, tp.width, 36, 1, true).rotateX(Math.PI / 2), ringGeo(tp.width / 2), back]);
      lit(mesh(rollGeo, std('#C9965A', { roughness: 0.25, side: THREE.DoubleSide }), tp.x, standTop + tp.r, tp.z, root));
      mesh(new THREE.CylinderGeometry(tp.r * 0.62, tp.r * 0.62, tp.width, 28, 1, true).rotateX(Math.PI / 2), std('#E3C9A0', { roughness: 0.9, side: THREE.DoubleSide }), tp.x, standTop + tp.r, tp.z, root);
      addBox(tp.x, standTop, pivotY - 0.05, tp.z, tp.r, tp.width / 2);
    }
    // the ruler rests on one stack or the other; the side Mimo stands on goes down
    const tiltEast = Math.asin((b1Top - pivotY) / (rl.len / 2)), tiltWest = Math.asin((b2Top - pivotY) / (-rl.len / 2));
    const board = new THREE.Group(); board.position.set(tp.x, pivotY + RH / 2, tp.z); root.add(board);
    board.add(props.ruler(rl.len, rl.width));
    const segLen = rl.len / rl.segs;
    const segs = Array.from({ length: rl.segs }, () => addBox(0, 0, 0.3, 0, segLen / 2 + 0.02, rl.width / 2, { moving: true }));
    const saw = { tilt: tiltEast, want: tiltEast, settled: true };
    function placeSaw() {
      board.rotation.z = saw.tilt;
      const cs = Math.cos(saw.tilt), sn = Math.sin(saw.tilt);
      segs.forEach((c, i) => { const u = -rl.len / 2 + (i + 0.5) * segLen; placeCollider(c, tp.x + u * cs, pivotY + u * sn + RH * cs - 0.15, tp.z); });
    }
    stars.push([tp.x, pivotY + RH + 2.0, tp.z]);

    // ---------- Lamp, secret ink, glue stick, tissue box ----------
    const lp = LAY.lamp;
    const lamp = parts.makeLamp(THREE, k, world, Object.assign({}, lp, { base: [lp.base[0], b2Top, lp.base[1]], color: PAL.green, steps: LAY.ink.list, step: LAY.ink.step, poolY: TOP }));
    const lift = parts.makeGlueLift(THREE, k, world, Object.assign({ color: PAL.orange }, LAY.glue));
    camBox(LAY.glue.x, LAY.glue.z, LAY.glue.bodyR, LAY.glue.bodyR, TOP, LAY.glue.bodyTop);
    {
      const gc = LAY.glueCap;
      lit(mesh(new THREE.CylinderGeometry(gc.r, gc.r, gc.len, 28).rotateZ(Math.PI / 2), std(PAL.orange, { roughness: 0.4 }), gc.x, TOP + gc.r, gc.z, root));
      addBox(gc.x, TOP, TOP + gc.r * 2, gc.z, gc.len / 2, gc.r * 0.8);
    }
    const ink = LAY.ink.list;
    stars.push([(ink[1][0] + ink[2][0]) / 2, ink[2][1] + 1.0, (ink[1][2] + ink[2][2]) / 2], [LAY.glue.x, LAY.glue.high + 0.6, LAY.glue.z]);
    const boxTop = lnBooks + ln.box[1];
    {
      const [bw, bh, bd] = ln.box;
      const print = (slot) => k.canvasTex(256, 192, (g, W, H) => {
        g.fillStyle = PAL.red; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,240,215,0.85)';
        for (let y = 14; y < H; y += 34) for (let x = (y / 34) % 2 ? 30 : 12; x < W; x += 36) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
        if (slot) { g.fillStyle = '#7A2A22'; g.beginPath(); g.ellipse(W * 0.3, H / 2, W * 0.2, H * 0.14, 0, 0, Math.PI * 2); g.fill(); }
      });
      const side = k.texStd(print(false), { roughness: 0.75 }), top = k.texStd(print(true), { roughness: 0.75 });
      lit(mesh(new THREE.BoxGeometry(bw, bh, bd), [side, side, top, side, side, side], ln.x, lnBooks + bh / 2, ln.z, root));
      const puff = lit(mesh(new THREE.IcosahedronGeometry(0.55, 1), std('#FFFFFF', { roughness: 0.95, flatShading: true }), ln.x - bw * 0.2, boxTop + 0.12, ln.z, root)); puff.scale.set(1.6, 0.7, 0.9);
      addBox(ln.x, lnBooks, boxTop, ln.z, bw / 2, bd / 2);
      addBox(ln.x - bw * 0.2, boxTop, boxTop + 0.4, ln.z, 0.7, 0.45);
      camBox(ln.x, ln.z, ln.w / 2, ln.d / 2, TOP, boxTop);
    }

    // ---------- Paper plane ----------
    const plane = parts.makePlane(THREE, k, world, Object.assign({ points: LAY.flight, color: PAL.blue }, PLANE));
    for (const [s, f, l, up] of FLIGHT_STARS) stars.push(plane.at(s, f, l, up).pos);

    // ---------- Corner behind the lamp: an eraser and the pencil cup (secret) ----------
    {
      const c = LAY.corner, [ew, eh, ed] = c.eraserSize, [ex, ez] = c.eraser, redW = ew * 0.62;
      lit(mesh(k.roundedBox(redW, eh, ed, 0.18, 3), std(PAL.red, { roughness: 0.8 }), ex - ew / 2 + redW / 2, TOP + eh / 2, ez, root));
      lit(mesh(k.roundedBox(ew - redW, eh, ed, 0.18, 3), std(PAL.blue, { roughness: 0.8 }), ex + redW / 2, TOP + eh / 2, ez, root));
      addBox(ex, TOP, TOP + eh, ez, ew / 2, ed / 2);
      const [cx, cz] = c.cup, half = c.cupSize / 2, w = c.wall, rimY = TOP + c.cupH, inner = half - w;
      const walls = [[0, -half + w / 2, c.cupSize, w], [0, half - w / 2, c.cupSize, w], [-half + w / 2, 0, w, c.cupSize - 2 * w], [half - w / 2, 0, w, c.cupSize - 2 * w]];
      lit(mesh(parts.mergeGeos(THREE, walls.map(([dx, dz, sx, sz]) => k.roundedBox(sx, c.cupH, sz, 0.12, 2).translate(dx, 0, dz))), std(PAL.purple, { roughness: 0.45 }), cx, TOP + c.cupH / 2, cz, root));
      for (const [dx, dz, sx, sz] of walls) addBox(cx + dx, TOP, rimY, cz + dz, sx / 2, sz / 2);
      addBox(cx, TOP, TOP + c.fill, cz, inner, inner);
      // crayons standing in the cup make its floor; three pencils stick out of one corner
      const crayonGeo = parts.mergeGeos(THREE, [new THREE.CylinderGeometry(0.17, 0.17, 1.3, 8), new THREE.ConeGeometry(0.17, 0.3, 8).translate(0, 0.8, 0)]);
      const spots = [];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (!(i > 2 && j > 2)) spots.push([cx - inner + 0.25 + i * (inner * 2 - 0.5) / 4, cz - inner + 0.25 + j * (inner * 2 - 0.5) / 4]);
      const crayons = new THREE.InstancedMesh(crayonGeo, std('#FFFFFF', { roughness: 0.6 }), spots.length), d = new THREE.Object3D(), col = new THREE.Color();
      spots.forEach(([x, z], i) => { d.position.set(x, TOP + c.fill - 0.85, z); d.rotation.set((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2); d.updateMatrix(); crayons.setMatrixAt(i, d.matrix); crayons.setColorAt(i, col.set(TOY_COLORS[i % 5])); });
      root.add(crayons);
      const px = cx + inner - 0.5, pz = cz + inner - 0.5, len = 8.2, hex = new THREE.CylinderGeometry(props.PENCIL_R, props.PENCIL_R, len - 0.9, 6);
      const bodies = new THREE.InstancedMesh(hex, std('#FFFFFF', { roughness: 0.35, flatShading: true }), 3), tips = new THREE.InstancedMesh(new THREE.ConeGeometry(props.PENCIL_R, 0.9, 6), std('#E8C99A', { roughness: 0.8, flatShading: true }), 3);
      [[0, 0, 0.12, PAL.red], [-0.45, 0.1, -0.1, PAL.green], [0.05, -0.45, 0.06, PAL.yellow]].forEach(([dx, dz, lean, color], i) => {
        d.position.set(px + dx, TOP + c.fill + (len - 0.9) / 2 - 0.6, pz + dz); d.rotation.set(lean, i * 0.7, -lean); d.updateMatrix(); bodies.setMatrixAt(i, d.matrix); bodies.setColorAt(i, col.set(color));
        d.translateY((len - 0.9) / 2 + 0.45); d.updateMatrix(); tips.setMatrixAt(i, d.matrix);
      });
      for (const im of [bodies, tips]) { lit(im); root.add(im); }
      addCyl(px - 0.15, pz - 0.15, 0.55, TOP + c.fill + len - 1, TOP + c.fill);
    }

    // ---------- Sharpener with shavings, near the front edge ----------
    {
      const s = LAY.sharpener;
      lit(mesh(k.roundedBox(1.7, 1.2, 1.3, 0.12, 2), std('#C9CDD6', { roughness: 0.3, metalness: 0.6 }), s.x, TOP + 0.6, s.z, root));
      mesh(new THREE.CircleGeometry(0.34, 16), std(PAL.ink, { roughness: 0.6 }), s.x + 0.86, TOP + 0.62, s.z, root).rotation.y = Math.PI / 2;
      const shav = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.13, 6, 18), std('#E8C99A', { roughness: 0.85 }), 4), d = new THREE.Object3D();
      for (let i = 0; i < 4; i++) { d.position.set(s.x + 1.6 + i * 0.6, TOP + 0.08, s.z + (r() - 0.5) * 1.4); d.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 3); d.scale.set(1, 1, 0.5); d.updateMatrix(); shav.setMatrixAt(i, d.matrix); }
      shav.receiveShadow = true; root.add(shav);
      addBox(s.x, TOP, TOP + 1.2, s.z, 0.85, 0.65);
    }

    // ---------- Flags, camera rail ----------
    const flags = [LAY.flag1, [b2.x + b2.w / 2 - 1.0, b2Top, b2.z - b2.d / 2 + 0.9], LAY.flag3];
    const W = -Math.PI / 2;
    const camNodes = [
      { x: 11.5, z: 38.5, yaw: W, dist: 8, h: 3.8, look: 0.9 },
      { x: 3.0, z: 39.6, yaw: W, dist: 8.6, h: 4.6, look: 0.9 },
      { x: -7.7, z: 39.8, yaw: W, dist: 8.4, h: 4.2, look: 0.9 },
      { x: -12.6, z: 39.4, yaw: -1.0, dist: 8.2, h: 4.4, look: 0.9 },
      { x: -14.8, z: 35.0, yaw: 0.6, dist: 8.0, h: 4.4, look: 0.9 },
      { x: -11.7, z: 32.4, yaw: 1.15, dist: 8.2, h: 4.2, look: 0.9 },
      { x: -5.6, z: 30.8, yaw: 1.4, dist: 8.6, h: 4.6, look: 0.9 },
      { x: LAY.flight[0][0], z: LAY.flight[0][2], yaw: plane.at(0, 0, 0).yaw, dist: 9.2, h: 4.6, look: 0.9, y: LAY.flight[0][1] },
    ];
    for (const s of FLIGHT_CAM) { const a = plane.at(s, 0, 0); camNodes.push({ x: a.pos[0], z: a.pos[2], yaw: a.yaw, dist: s < 1 ? 9.6 : 8.4, h: s < 1 ? 5 : 4, look: 0.7, y: a.pos[1] }); }   // y: the flight's rail only counts up here, not for Mimo on the floor below

    function update(dt, t) {
      const p = world.p;
      // seesaw: the side Mimo stands on goes down
      if (p.grounded && segs.includes(p.ground)) {
        if (p.x > tp.x + SEESAW_DEAD) saw.want = tiltEast; else if (p.x < tp.x - SEESAW_DEAD) saw.want = tiltWest;
      }
      saw.tilt += (saw.want - saw.tilt) * (1 - Math.exp(-SEESAW_RATE * dt));
      const near = Math.abs(saw.want - saw.tilt) < 0.01;
      if (near && !saw.settled) world.sfx.land();
      saw.settled = near;
      placeSaw();
      dip = Math.max(0, dip - dt * 5);
      arm.rotation.z = -Math.sin(dip * Math.PI) * STAPLER_DIP;
      lamp.update(dt, t, b2Col);
      lift.update(dt, t);
      plane.update(dt);
    }
    function reset() { saw.tilt = saw.want = tiltEast; saw.settled = true; placeSaw(); lamp.reset(); plane.reset(); }
    reset();
    return { camNodes, flags, stars, secrets: LAY.secrets, update, reset, plane: plane.state, planeDeck: plane.deck, planeFold: plane.setFolded, planeFolded: plane.folded, planeDock: plane.at(0, 0, 0).pos, lamp: lamp.state, lift: lift.state, seesaw: saw };
  }

  Room3D.sections = Room3D.sections || [];
  Room3D.sections.push({ id: 's3', name: 'Schreibtisch', mood: 'evening', build });
})();
