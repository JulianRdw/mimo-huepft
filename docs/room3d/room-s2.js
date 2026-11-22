/* Mimo hüpft · Kinderzimmer (3D) · section 2 "Eisenbahn und Bücherberg"
   Afternoon. From the brick tower Mimo drops onto a little station, rides the wooden train round the
   loop (high stars only from the tall wagon, a low book tunnel only on a flat one), gets off at the foot
   of the book mountain and climbs it: rubber ball, pencil bridge, ruler bridge, a lift that comes when
   he presses its button, and a bookmark ribbon over to the desk. The train itself lives in room-s2b.js.
   y is up. The way runs east along the station, south down the loop, then west along the front wall. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // The train's loop: a rounded rectangle, run clockwise seen from above (east on the north side)
  const LOOP = { xw: 27, xe: 49.5, zn: -11.5, zs: 33, r: 6 };
  const STOP_AT = 14.7;                  // engine centre along the loop while it waits: the flat wagon stands mid-platform
  const INSET = 0.2;                     // book colliders sit a little inside the drawn books (they are shifted and turned)
  const COVERS = ['#E25B45', '#F4BF3A', '#4686D2', '#52AE75', '#EE8A38', '#9474CE'];
  const LAY = {
    station: { x0: 35, x1: 44, z0: -16, z1: -12.85, top: 1.1 },
    stationHouse: { x0: 35.3, x1: 38.1, z0: -15.8, z1: -13.5, y0: 1.1, h: 2.2, ridge: 3.2, wall: 0.3, door: { z0: -15.1, z1: -14.2, h: 1.6 }, clock: 0.42 },
    tunnel: { x: 49.5, z: 14.75, len: 6.1, half: 1.55, wall: 2.35, low: 3.05, lintel: 1.0, span: 8.4 },
    pedal: { x: 51.6, z: 14.75, r: 0.6 }, semaphore: { x: 53.0, z: 13.0, h: 3.0 },
    shed: { x0: 33, x1: 39, z0: 3, z1: 9, h: 4.2, wall: 0.4, ridge: 5.6, door: { z0: 4.6, z1: 7.4, h: 3.2 } },
    // book mountain piles: [x0, x1, z0, z1, top]. The foot is out of reach from the floor (a jump is 2.3 high).
    foot: [51.2, 55.8, 22.5, 30, 2.6], step: [51.4, 55.6, 31, 34, 3.8],
    ball: { x: 53.5, z: 37, r: 1.8, top: 3.4 }, flummi: { x: 50.4, z: 32.5, r: 0.6 },
    m3: [48.5, 55.6, 39.4, 44.8, 6.2], m4: [37, 41.5, 38.5, 44.6, 6.2], m5: [28, 32, 38.5, 44.6, 6.2],
    pencils: { x0: 40.75, x1: 49.75, z: 41.8 }, ruler: { x0: 30.6, x1: 37.4, z: 41.8, width: 1.3 },
    button: { x: 28.9, z: 43.5 },
    lift: { x: 26, z: 41.5, low: 6.2, high: 19.8, half: 1.2, plate: 0.4, colZ: [39.5, 43.5], colTop: 23.25 },
    peak: { x0: 20.5, x1: 24.4, z0: 36, z1: 42.8, top: 21, lowTop: 11.5, ledge: { y0: 10.3, z1: 45 }, cave: { y1: 13.7, x0: 21.1, x1: 23.8, back: 39.5 } },
    ribbon: { x0: 15.8, x1: 21.8, gap: [18, 20.6], z: 37.5, width: 1.3 },
  };
  const FLAGS = [[42.8, 1.1, -15.3], [53.5, 2.6, 26.5], [14, 21, 37.5]];
  const STARS = [
    [43, 4.5, -16.9],                    // dropping from the tower onto the platform
    [47.74, 5.0, -9.74], [49.5, 5.0, 1.0], // high above the rails: only from the tall wagon
    [49.5, 2.2, 14.75],                  // inside the tunnel: on a flat wagon
    [53.5, 7.2, 38.8],                   // above the bounce of the rubber ball
    [45, 7.8, 41.8], [26, 14, 41.5], [19.3, 22.15, 37.5],
  ];
  // hidden extras: inside the engine shed (its doors open from the pedal on the tunnel), in a cave inside the book mountain
  const SECRETS = [[36.2, 1.2, 6.0], [22.45, 12.6, 41.2]];
  const WARP_DIST = 3;                   // a jump of Mimo bigger than this in one step is a respawn, not a ride
  const CARRY_REACH = 3;                 // in the air, nearer than this to the wagon he left Mimo still moves with it
  const TALL_WARN = [3, 10];             // z on the loop's east side where the tall wagon gets the tunnel warning

  // Camera rail: drop to the station, ride south (low through the tunnel), climb, then west to the desk
  const CAM_NODES = [
    { x: 42.8, z: -15.3, yaw: 2.4, dist: 8, h: 3.8, look: 0.9 },
    { x: 47.7, z: -9.7, yaw: 2.7, dist: 8, h: 3.8, look: 0.9 },
    { x: 49.5, z: -1, yaw: Math.PI, dist: 8, h: 3.8, look: 0.9 },
    { x: 49.5, z: 6.5, yaw: Math.PI, dist: 7, h: 2.6, look: 1.0 },
    { x: 49.5, z: 10.5, yaw: Math.PI, dist: 6, h: 1.3, look: 1.0 },
    { x: 49.5, z: 23.5, yaw: Math.PI, dist: 6, h: 1.3, look: 1.0 },   // low until the camera itself has left the tunnel
    { x: 51.5, z: 27, yaw: 3.3, dist: 8.5, h: 4, look: 0.9 },
    { x: 53.5, z: 31, yaw: 3.5, dist: 9, h: 4.4, look: 0.9 },
    { x: 53.5, z: 37, yaw: 3.8, dist: 9, h: 4.6, look: 0.8 },
    { x: 52.5, z: 42.1, yaw: 4.5, dist: 9, h: 4.4, look: 0.9 },
    { x: 45, z: 41.8, yaw: 3 * Math.PI / 2, dist: 8.5, h: 4, look: 0.9 },
    { x: 30, z: 41.8, yaw: 3 * Math.PI / 2, dist: 8.5, h: 3.8, look: 0.9 },
    { x: 26, z: 41.5, yaw: 3 * Math.PI / 2, dist: 9, h: 3, look: 1.2 },
    { x: 22.5, z: 38.5, yaw: 3 * Math.PI / 2, dist: 8, h: 3.6, look: 0.9 },
    { x: 14, z: 37.5, yaw: 3 * Math.PI / 2, dist: 8, h: 3.8, look: 0.9 },
  ];
  const HINTS = {
    station: 'Gleich hält hier der Zug. Spring auf einen Wagen und fahr mit.',
    tunnel: 'Vorsicht, der Tunnel ist niedrig! Spring rechtzeitig auf einen flachen Wagen.',
    lift: 'Tritt auf den grünen Knopf, dann kommt der Aufzug herunter.',
    shed: 'Irgendwo hat sich eine Tür geöffnet. Beeil dich!',
  };

  function loopSegments(L) {
    const { xw, xe, zn, zs, r } = L, H = Math.PI / 2;
    return [
      { line: [xw + r, zn, xe - r, zn] }, { arc: [xe - r, zn + r, r, 0, H] },
      { line: [xe, zn + r, xe, zs - r] }, { arc: [xe - r, zs - r, r, H, 2 * H] },
      { line: [xe - r, zs, xw + r, zs] }, { arc: [xw + r, zs - r, r, 2 * H, 3 * H] },
      { line: [xw, zs - r, xw, zn + r] }, { arc: [xw + r, zn + r, r, 3 * H, 4 * H] },
    ];
  }

  function build(THREE, k, props, world) {
    const { PAL } = k, kit = Room3D.s2kit;
    const { addBox, addCamBlock } = world;
    const root = new THREE.Group(); world.root.add(root);
    const path = kit.loopPath(loopSegments(LOOP));
    kit.makeTrack(THREE, k, path, root);
    const hold = { on: false };              // the story holds the last train at the station until Mimo sets the signal
    const train = kit.makeTrain(THREE, k, world, root, { path, stopAt: STOP_AT, hold: () => hold.on });
    const books = kit.makeBooks(THREE, k, root), pencils = kit.makePencils(THREE, k, root);
    const parts = Room3D.s2parts.make(THREE, k, props, world, root);

    // A pile of books with one collider; tall ones also keep the camera out
    function bookPile([x0, x1, z0, z1, top], seed, y0) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, base = y0 || 0;
      books.pile(cx, cz, x1 - x0, z1 - z0, base, top, seed, COVERS);
      addBox(cx, base, top, cz, (x1 - x0) / 2 - INSET, (z1 - z0) / 2 - INSET);
      if (top - base > 3) addCamBlock(x0, x1, base, top, z0, z1);
    }

    // ---------- Station: wooden platform with a little house and a clock ----------
    {
      const h = LAY.stationHouse;
      parts.station(LAY.station);
      parts.house(Object.assign({ colors: [PAL.blue, PAL.red, PAL.yellow] }, h));
      parts.clock((h.x0 + h.x1) / 2, h.y0 + h.h * 0.62, h.z1 + 0.02, h.clock);
    }

    // ---------- Book tunnel over the east side of the loop: too low for the tall wagon ----------
    const t = LAY.tunnel, lintelTop = t.low + t.lintel;
    {
      for (const side of [-1, 1]) {
        const cx = t.x + side * (t.half + t.wall / 2);
        books.pile(cx, t.z, t.wall, t.len, 0, t.low, 30 + side, COVERS);
        addBox(cx, 0, t.low, t.z, t.wall / 2 - 0.1, t.len / 2 - 0.1);
      }
      books.add(t.x, t.low, t.z, t.span, t.lintel, t.len + 0.2, PAL.purple, 0);
      addBox(t.x, t.low, lintelTop, t.z, t.span / 2 - 0.1, t.len / 2);
    }

    // ---------- Engine shed inside the loop and the pedal on the tunnel that opens it ----------
    const shed = parts.house(Object.assign({ colors: [PAL.green, PAL.red, PAL.yellow] }, LAY.shed));
    const pedal = parts.pedal(LAY.pedal, LAY.semaphore, lintelTop);

    // ---------- Book mountain: foot, step, rubber ball, a small super ball to get back up ----------
    bookPile(LAY.foot, 41); bookPile(LAY.step, 42);
    const ball = parts.ball(LAY.ball, PAL.blue, PAL.yellow);
    const flummi = parts.ball(Object.assign({ top: LAY.flummi.r * 2 - 0.05 }, LAY.flummi), PAL.orange, null);
    bookPile(LAY.m3, 43); bookPile(LAY.m4, 44); bookPile(LAY.m5, 45);
    {
      const p = LAY.pencils, len = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2, y = LAY.m3[4] + pencils.TOP;
      [PAL.red, PAL.yellow, PAL.blue].forEach((c, i) => pencils.add(cx, y, p.z + (i - 1) * pencils.R * 2, len + (i === 1 ? 0.3 : 0), c, Math.PI / 2));
      addBox(cx, LAY.m3[4], LAY.m3[4] + pencils.TOP * 2, p.z, len / 2, pencils.R * 3);
    }
    {
      const r = LAY.ruler, len = r.x1 - r.x0, y = LAY.m4[4];
      const board = props.ruler(len, r.width); board.position.set((r.x0 + r.x1) / 2, y + props.RULER_H / 2, r.z); root.add(board);
      addBox((r.x0 + r.x1) / 2, y, y + props.RULER_H, r.z, len / 2, r.width / 2);
    }
    const lift = parts.lift(LAY.lift, LAY.button, LAY.m5[4]);

    // ---------- The peak: a tall pile with a cave on its back, then the ribbon over to the desk ----------
    {
      const pk = LAY.peak, cx = (pk.x0 + pk.x1) / 2, cz = (pk.z0 + pk.z1) / 2, w = pk.x1 - pk.x0, d = pk.z1 - pk.z0, cv = pk.cave, L = pk.ledge;
      bookPile([pk.x0, pk.x1, pk.z0, pk.z1, L.y0], 46);
      books.add(cx, L.y0, (pk.z0 + 0.6 + L.z1) / 2, w - 0.4, pk.lowTop - L.y0, L.z1 - pk.z0 - 0.6, PAL.green, Math.PI);
      addBox(cx, L.y0, pk.lowTop, cz, w / 2 - INSET, d / 2 - INSET);
      addBox(cx, L.y0, pk.lowTop, (pk.z1 + L.z1) / 2, w / 2 - 0.4, (L.z1 - pk.z1) / 2 - 0.1);
      // cave layer: two books standing upright as walls and a short pile at the back
      for (const [x0, x1, color, outer] of [[pk.x0, cv.x0, PAL.red, -1], [cv.x1, pk.x1, PAL.blue, 1]]) {
        books.add((x0 + x1) / 2, pk.lowTop, cz, cv.y1 - pk.lowTop, x1 - x0, d, color, 0, true);
        addBox((x0 + x1) / 2 - outer * INSET / 2, pk.lowTop, cv.y1, cz, (x1 - x0 - INSET) / 2, d / 2 - INSET);
      }
      books.pile((cv.x0 + cv.x1) / 2, (pk.z0 + cv.back) / 2, cv.x1 - cv.x0, cv.back - pk.z0, pk.lowTop, cv.y1, 47, COVERS);
      addBox((cv.x0 + cv.x1) / 2, pk.lowTop, cv.y1, (pk.z0 + cv.back) / 2, (cv.x1 - cv.x0) / 2, (cv.back - pk.z0) / 2);
      bookPile([pk.x0, pk.x1, pk.z0, pk.z1, pk.top], 48, cv.y1);
      parts.ribbon(LAY.ribbon, pk.top);
      const r = LAY.ribbon; addBox((r.gap[0] + r.gap[1]) / 2, pk.top - 0.2, pk.top + 0.04, r.z, (r.gap[1] - r.gap[0]) / 2, r.width / 2);
    }
    books.build(); pencils.build();

    // ---------- Riding: the train is a moving room ----------
    // The engine only shifts Mimo with the box he stands on. Here he also turns with a wagon on a curve, and
    // in a jump he keeps moving with the wagon he left as long as he is above the train; once he is away from
    // it he keeps the speed he had, like anything thrown from a moving train.
    const carry = { car: null, vx: 0, vz: 0, lastX: 0, lastZ: 0 };
    const turnPush = (ox, oz, turn, dt) => [(ox * Math.cos(turn) + oz * Math.sin(turn) - ox) / dt, (-ox * Math.sin(turn) + oz * Math.cos(turn) - oz) / dt];
    function ride(dt) {
      const p = world.p, moved = Math.hypot(p.x - carry.lastX, p.z - carry.lastZ);
      carry.lastX = p.x; carry.lastZ = p.z;
      if (world.S.state !== 'play' || moved > WARP_DIST || dt <= 0) { carry.car = null; return; }
      const g = p.grounded ? p.ground : null;
      if (g) {
        carry.car = g.car != null ? train.cars[g.car] : null;
        if (!carry.car) return;
        [p.extX, p.extZ] = turnPush(p.x - (g.x - g.dx), p.z - (g.z - g.dz), carry.car.dyaw, dt);
        return;
      }
      const car = carry.car;
      if (!car) return;
      const ox = p.x - (car.x - car.vx * dt), oz = p.z - (car.z - car.vz * dt);
      if (Math.hypot(ox, oz) < CARRY_REACH) { const [tx, tz] = turnPush(ox, oz, car.dyaw, dt); carry.vx = car.vx + tx; carry.vz = car.vz + tz; }
      p.extX = carry.vx; p.extZ = carry.vz;
    }

    // ---------- One-time hints ----------
    const said = {};
    function hints() {
      const p = world.p, S = world.S;
      const say = (key) => { if (!said[key]) { said[key] = true; world.hint(HINTS[key]); } };
      if (S.respawn === FLAGS[0] && !hold.on) say('station');
      const g = p.grounded ? p.ground : null;
      if (g && g.car === 1 && p.x > LOOP.xe - 1 && p.z > TALL_WARN[0] && p.z < TALL_WARN[1]) say('tunnel');
      if (g && Math.abs(p.y - LAY.m5[4]) < 0.3 && p.x < LAY.m5[1] && p.x > LAY.m5[0] && lift.idleAtTop()) say('lift');
      if (shed.justOpened()) say('shed');
    }

    function update(dt) {
      train.update(dt);
      ride(dt);
      lift.update(dt, world.p);
      if (pedal.pressed(world.p)) shed.open();
      shed.update(dt, world.p);
      pedal.update(dt, shed.isOpen());
      ball.update(dt); flummi.update(dt);
      hints();
    }
    function reset() {
      for (const key of Object.keys(said)) delete said[key];
      carry.car = null; train.reset(); lift.reset(); shed.reset(); pedal.update(0, false);
    }
    return { camNodes: CAM_NODES, flags: FLAGS, stars: STARS, secrets: SECRETS, update, reset, train, hold };
  }

  Room3D.sections = Room3D.sections || [];
  Room3D.sections.push({ id: 's2', name: 'Eisenbahn und Bücherberg', mood: 'day', build });
})();
