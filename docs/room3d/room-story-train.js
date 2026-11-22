/* Mimo hüpft · Kinderzimmer (3D) · mission 2 "Der letzte Zug": passengers and the station signal
   Three small peg passengers have wandered off round the rails. Mimo finds them (each one hops back to the
   platform), steps on the signal button (the arm goes up and the train may leave), and the passengers ride
   in the ball wagon. At the book mountain they hop out and follow Mimo in single file, up the books and the
   lift, to the desk. The story (room-story.js) asks this file how far things are and tells it which mission
   and step run. y is up; see README.md for the room's layout. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const TRAIN_MISSION = {
    button: [41.3, 1.1, -14.0],                       // signal button on the platform
    mast: { x: 44.5, z: -16.3, h: 4.6 },              // the signal stands on the floor at the platform's end
    // where the passengers got lost, what they say when found, and where they wait on the platform
    lost: [[41.5, 0, 5.5], [23.5, 0, -4], [55, 0, 4]],
    lines: [
      'Da bist du ja! Ich hatte mich hinter dem Lokschuppen verlaufen. Ich gehe schon zum Bahnsteig.',
      'Huch, gefunden! Ich wollte nur kurz den Rennautos zuschauen. Ab zum Bahnsteig!',
      'Fährt der Zug noch? Dann nichts wie hin zum Bahnsteig!',
    ],
    faces: ['gentleman', 'girl', 'granny'],
    driverHead: [39.6, 3.45, -15.4],
    wait: [[39.0, 1.1, -13.4], [40.3, 1.1, -13.3], [38.7, 1.1, -15.0]],
    seats: [[-0.45, 1.05, -0.9], [0.45, 1.05, 0.1], [-0.3, 1.05, 1.0]],   // in the ball wagon, along the car
    home: [[12.6, 21, 36.2], [13.2, 21, 39.2], [11.8, 21, 38]],           // on the desk next to its flag
    homeLook: [21, 27],                                                    // they turn towards the scene's camera
    // in mission 3 they move on to the tissue box and fold the paper plane (room-story-desk.js)
    box: [[-2.6, 21, 34.2], [-0.6, 21, 34.7], [1.4, 21, 34.2]], boxLook: [-1, 30.4],
  };
  const TUB = 3;                                      // index of the ball wagon in the train
  const FIND_R = 1.6, FIND_DY = 1.5;                  // how near Mimo must come to a lost passenger
  const HOP = { time: 0.9, high: 1.6, far: 2.2 };     // a hop to a new place: seconds, arc height, extra height for long hops
  const FOLLOW = { gap: 1.25, step: 0.15, max: 500, ease: 12, bob: 0.22, warp: 3 };
  const RIDE_SPOTS = [[0.8, 0.75], [-0.8, 0.75], [0, -0.85]];   // on a lift plate the followers stand round Mimo
  const CALL = { every: 1.6, high: 0.35, see: 9 };    // a lost passenger hops on the spot to be noticed
  const ARM_UP = 0.8;                                 // the signal arm's turn in radians when it shows "go"
  const LOOKS = ['gentleman', 'girl', 'granny'];      // Room3D.PEG_LOOKS in room-pegs.js
  const SIZE = 1.15;                                  // passengers are a bit taller than Mimo
  const WAVE = { lift: 2.4, swing: 0.35, speed: 9, walk: 0.6 };   // arm turns in radians

  function makeTrainMission(THREE, k, world, level) {
    const { PAL, std, mesh, lit } = k, root = world.root, T = TRAIN_MISSION;
    const s2 = level.sections.find((sec) => sec.id === 's2');
    if (!s2 || !s2.train) return null;
    const own = (color) => k.own(new THREE.MeshStandardMaterial({ color, roughness: 0.4, envMapIntensity: 0.3 }));

    // ---------- Passengers: small wooden peg figures (room-pegs.js) ----------
    function figure(name) {
      const peg = Room3D.makePeg(THREE, k, Room3D.PEG_LOOKS[name]);
      peg.root.scale.setScalar(SIZE); root.add(peg.root);
      return peg;
    }
    const people = LOOKS.map((look, i) => ({ peg: figure(look), i, mode: 'lost', hop: null, x: 0, y: 0, z: 0, yaw: 0, walk: 0 }));

    // ---------- The signal: a button on the platform and a semaphore at its end ----------
    const [bx, by, bz] = T.button, m = T.mast;
    lit(mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 24), std('#F5F0E4', { roughness: 0.5 }), bx, by + 0.06, bz, root));
    const capMat = own(PAL.red), cap = lit(mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.16, 24), capMat, bx, by + 0.2, bz, root));
    const btnCol = world.addCyl(bx, bz, 0.75, by + 0.2, by);
    lit(mesh(new THREE.CylinderGeometry(0.1, 0.13, m.h, 10), std('#F5F0E4', { roughness: 0.5 }), m.x, m.h / 2, m.z, root));
    world.addCyl(m.x, m.z, 0.15, m.h, 0);
    const arm = new THREE.Group(); arm.position.set(m.x, m.h - 0.35, m.z + 0.12); root.add(arm);
    lit(mesh(k.roundedBox(1.7, 0.32, 0.1, 0.04, 2), std(PAL.red, { roughness: 0.45 }), -0.7, 0, 0, arm));
    const lampMat = k.own(new THREE.MeshBasicMaterial({ color: PAL.red }));
    mesh(new THREE.SphereGeometry(0.16, 12, 10), lampMat, m.x, m.h - 0.85, m.z + 0.14, root);

    // ---------- State ----------
    const st = { signal: false, armK: 0, wasOn: false, phase: 'search', trail: [], riding: false, atBox: false };
    const homeOf = (i) => (st.atBox ? T.box : T.home)[i];
    const lookOf = () => (st.atBox ? T.boxLook : T.homeLook);
    const p = world.p;
    let lastX = p.x, lastZ = p.z;

    function hopTo(who, to, time) {
      const d = Math.hypot(to[0] - who.x, to[2] - who.z);
      who.hop = { from: [who.x, who.y, who.z], to, t: 0, time: time || HOP.time, high: HOP.high + Math.min(HOP.far, d * 0.08) };
    }
    function place(who, x, y, z) { who.x = x; who.y = y; who.z = z; }
    function seatPos(i) {
      const car = s2.train.cars[TUB], [lx, ly, lz] = T.seats[i], c = Math.cos(car.yaw), s = Math.sin(car.yaw);
      return [car.x + lx * c + lz * s, ly, car.z - lx * s + lz * c];
    }
    // a point on Mimo's trail, `dist` back from his feet; null while the trail is still too short
    function trailBack(dist) {
      const tr = st.trail;
      let left = dist, b = { x: p.x, y: p.y, z: p.z };
      for (let i = tr.length - 1; i >= 0; i--) {
        const a = tr[i], seg = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y);
        if (seg >= left) { const u = left / seg; return [b.x + (a.x - b.x) * u, b.y + (a.y - b.y) * u, b.z + (a.z - b.z) * u]; }
        left -= seg; b = a;
      }
      return null;
    }
    function record() {
      const tr = st.trail, last = tr[tr.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.z - last.z, p.y - last.y) > FOLLOW.step) { tr.push({ x: p.x, y: p.y, z: p.z }); if (tr.length > FOLLOW.max) tr.shift(); }
    }

    // ---------- Phases: search → board (after the signal) → follow (off the train) → home (on the desk) ----------
    function setPhase(phase, instant) {
      if (st.phase === phase) return;
      st.phase = phase;
      if (phase === 'board') people.forEach((who) => hopTo(who, seatPos(who.i)));
      if (phase === 'follow') {
        // they land in a line between the wagon and Mimo, and the trail starts there
        const car = s2.train.cars[TUB], dx = car.x - p.x, dz = car.z - p.z, len = Math.hypot(dx, dz) || 1;
        st.trail = [];
        for (let i = people.length; i >= 1; i--) st.trail.push({ x: p.x + dx / len * FOLLOW.gap * i, y: p.y, z: p.z + dz / len * FOLLOW.gap * i });
        people.forEach((who) => { who.mode = 'follow'; hopTo(who, trailBack(FOLLOW.gap * (who.i + 1)) || [p.x, p.y, p.z], 1.0); });
      }
      if (phase === 'home') people.forEach((who) => { who.mode = 'home'; if (instant) { who.hop = null; place(who, ...homeOf(who.i)); } else hopTo(who, homeOf(who.i), 1.0); });
    }
    function signalOn(on) {
      st.signal = on; capMat.color.set(on ? PAL.green : PAL.red); lampMat.color.set(on ? PAL.green : PAL.red);
    }
    function reset() {
      st.phase = 'search'; st.trail = []; st.riding = false; st.atBox = false; st.wasOn = false; signalOn(false);
      people.forEach((who) => { who.mode = 'lost'; who.hop = null; place(who, ...T.lost[who.i]); });
      s2.hold.on = true;
    }
    // missions before n are done: from mission 3 on everybody is on the desk and the train runs freely
    function skipTo(n) {
      reset();
      st.atBox = n >= 3;
      if (n >= 2) { signalOn(true); setPhase('home', true); s2.hold.on = false; }
    }

    const found = () => people.filter((who) => who.mode !== 'lost').length;
    function nextLost() {
      let best = null, bd = Infinity;
      for (const who of people) if (who.mode === 'lost') { const d = Math.hypot(who.x - p.x, who.z - p.z); if (d < bd) { bd = d; best = who; } }
      return best ? [best.x, best.y, best.z] : null;
    }

    // ---------- Each step: story says which mission and step run ----------
    function update(dt, mission, step) {
      const t = world.time(), warped = Math.hypot(p.x - lastX, p.z - lastZ) > FOLLOW.warp;
      lastX = p.x; lastZ = p.z;
      // finding: a lost passenger near Mimo hops to the platform
      for (const who of people) {
        if (who.mode !== 'lost' || who.hop || world.S.state !== 'play') continue;
        if (Math.hypot(who.x - p.x, who.z - p.z) < FIND_R && Math.abs(who.y - p.y) < FIND_DY) {
          who.mode = 'wait'; hopTo(who, T.wait[who.i], 1.4);
          world.sfx.yay(); world.burst(who.x, who.y + 1, who.z, 12, k.TOY_COLORS, 2.4, { life: 0.6 });
          world.say({ who: 'Fahrgast', face: T.faces[who.i], at: [who.x, who.y + 1.6, who.z], follow: () => [who.x, who.y + 1.6, who.z], text: T.lines[who.i] });
        }
      }
      // the signal button: works once all three wait on the platform
      const onBtn = p.grounded && p.ground === btnCol;
      if (onBtn && !st.wasOn && !st.signal) {
        if (found() === people.length) { signalOn(true); world.sfx.toot(); world.sfx.yay(); world.say({ who: 'Lokführer', face: 'driver', at: T.driverHead, text: 'Tuut tuut! Alle einsteigen, gleich geht es los!' }); setPhase('board'); }
        else world.say({ who: 'Lokführer', face: 'driver', at: T.driverHead, text: 'Erst müssen alle drei Fahrgäste hier am Bahnsteig sein.' });
      }
      st.wasOn = onBtn;
      cap.position.y = by + (onBtn || st.signal ? 0.13 : 0.2);
      s2.hold.on = !st.signal;
      // the story moves the passengers on: off the train at the book mountain, onto the desk after that
      if (mission >= 2) setPhase('home');
      else if (mission === 1 && step >= 4 && st.signal) setPhase('follow');
      if (st.phase === 'follow') {
        if (warped) {             // Mimo went back to a flag: they come along in a puff
          st.trail = [];
          people.forEach((who) => { who.hop = null; place(who, p.x + (who.i - 1) * 0.9, p.y, p.z + 0.8); world.burst(who.x, who.y + 0.5, who.z, 6, [PAL.white], 1.4, { life: 0.4 }); });
        }
        // on a moving plate that is not the train (the lift) they step onto it with Mimo and ride along
        const g = p.grounded ? p.ground : null;
        st.riding = !!(g && g.moving && g.car == null);
        if (st.riding) st.trail = []; else record();
      }
      st.armK += ((st.signal ? 1 : 0) - st.armK) * Math.min(1, dt * 4);
      arm.rotation.z = -st.armK * ARM_UP;
      move(dt, t);
    }
    function move(dt, t) {
      for (const who of people) {
        let fx = who.x, fz = who.z;
        if (who.hop) {
          const h = who.hop; h.t += dt; const u = Math.min(1, h.t / h.time);
          // the place to hop to may move (a seat on the wagon)
          const to = who.mode === 'wait' && st.phase === 'board' ? seatPos(who.i) : h.to;
          place(who, h.from[0] + (to[0] - h.from[0]) * u, h.from[1] + (to[1] - h.from[1]) * u + Math.sin(Math.PI * u) * h.high, h.from[2] + (to[2] - h.from[2]) * u);
          if (u >= 1) who.hop = null;
        } else if (st.phase === 'board' && who.mode === 'wait') {
          place(who, ...seatPos(who.i)); who.yaw = s2.train.cars[TUB].yaw;
        } else if (who.mode === 'follow') {
          const g = p.ground, spot = RIDE_SPOTS[who.i];
          const to = st.riding ? [g.x + spot[0], p.y, g.z + spot[1]] : trailBack(FOLLOW.gap * (who.i + 1));
          if (to) {
            const k2 = Math.min(1, dt * FOLLOW.ease), nx = who.x + (to[0] - who.x) * k2, nz = who.z + (to[2] - who.z) * k2;
            who.walk += Math.hypot(nx - who.x, nz - who.z) * 3;
            place(who, nx, who.y + (to[1] - who.y) * k2, nz);
          }
        } else if (who.mode === 'lost' && Math.hypot(who.x - p.x, who.z - p.z) < CALL.see) {
          fx = p.x; fz = p.z;     // turns to Mimo
        }
        const dx = who.mode === 'lost' ? fx - who.x : who.x - (who.px ?? who.x), dz = who.mode === 'lost' ? fz - who.z : who.z - (who.pz ?? who.z);
        if (who.mode === 'home' && !who.hop) who.yaw = Math.atan2(lookOf()[0] - who.x, lookOf()[1] - who.z);
        else if (Math.hypot(dx, dz) > 0.002 && !(st.phase === 'board' && who.mode === 'wait' && !who.hop)) who.yaw = Math.atan2(dx, dz);
        who.px = who.x; who.pz = who.z;
        // a lost one hops now and then; a follower bobs as it walks
        const call = who.mode === 'lost' ? Math.max(0, Math.sin((t + who.i * 0.5) / CALL.every * Math.PI * 2)) ** 4 * CALL.high : 0;
        const bob = who.mode === 'follow' && !who.hop ? Math.abs(Math.sin(who.walk)) * FOLLOW.bob : 0;
        who.peg.root.position.set(who.x, who.y + call + bob, who.z); who.peg.root.rotation.y = who.yaw;
        arms(who, t);
      }
    }

    // a lost one waves, a follower swings its arms, the ones on the desk wave now and then
    function arms(who, t) {
      const { armL, armR } = who.peg, swing = who.mode === 'follow' && !who.hop ? Math.sin(who.walk) * WAVE.walk : 0;
      const wave = who.mode === 'lost' || (who.mode === 'home' && Math.sin(t * 0.7 + who.i * 2) > 0.6);
      armR.rotation.z = wave ? WAVE.lift + Math.sin(t * WAVE.speed + who.i) * WAVE.swing : 0.18;
      armL.rotation.z = who.hop ? -1.2 : -0.18;                 // arms out while hopping
      if (who.hop) armR.rotation.z = 1.2;
      armL.rotation.x = swing; armR.rotation.x = wave ? 0 : -swing;
    }

    // mission 3: the passengers hop over to the tissue box, one after the other
    function toBox() {
      if (st.atBox) return;
      st.atBox = true;
      if (st.phase === 'home') people.forEach((who) => { who.hop = null; hopTo(who, T.box[who.i], 1.3 + who.i * 0.25); });
    }

    reset();
    return {
      update, reset, skipTo, found, nextLost, toBox,
      hopping: () => people.some((who) => who.hop),
      total: people.length,
      signalSet: () => st.signal,
      phase: () => st.phase,
      // test hook: where everybody is
      where: () => people.map((who) => ({ mode: who.mode, at: [+who.x.toFixed(2), +who.y.toFixed(2), +who.z.toFixed(2)] })),
    };
  }

  Room3D.TRAIN_MISSION = TRAIN_MISSION;
  Room3D.makeTrainMission = makeTrainMission;
})();
