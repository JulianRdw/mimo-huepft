/* Mimo hüpft · Kinderzimmer (3D) · side missions: finding and catching
   Building bricks: find four bricks in the room (Mimo carries them on his head) and bring them to the
   builder, who builds a tower that can be climbed. Gold buttons: forty of them lie all over the room,
   on the floor and up on the furniture; found ones stay found across visits, and the seamstress says
   where to look next. Dust bunnies: six of them scurry about below the bed and run away from Mimo
   until he corners them. See room-side.js for `sx`. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});
  Room3D.sideParts = Room3D.sideParts || [];

  const FIND = {
    bricks: {
      giver: { look: 'builder', at: [24.6, 0, 5.4], yaw: -2.2 }, plate: [21.6, 8.4],
      spots: [[36, 0, 0.3], [8, 0, 33], [55, 0, -6], [-21.5, 0, 9]], colors: ['#E25B45', '#4686D2', '#F4BF3A', '#52AE75'],
      lines: { ask: 'Ich will einen Treppenturm bauen, aber mir fehlen vier Klemmbausteine. Sie liegen irgendwo im Zimmer verstreut.', more: 'Bring mir alle vier Steine, dann baue ich los.', built: 'Fertig! Deine Steine sind ganz oben. Hüpf die Stufen hoch, da liegt etwas für dich!' },
    },
    buttons: {
      giver: { look: 'seamstress', at: [4.6, 0, 1.4], yaw: -0.9 },
      // [x, z, height of the surface it lies on, where that is (for the seamstress's tip), late?]; ordered from easy to well hidden.
      // late: the surface is not there from the start (the builder's tower)
      list: [
        [2.2, 2.8, 0, 'gleich hier bei mir'], [10, -3, 0, 'auf dem Teppich'], [-6.5, -12, 0, 'auf dem Teppich'], [24, -2, 0, 'neben dem Teppich'],
        [33.5, 12, 0, 'bei der Eisenbahn'], [44.5, 22, 0, 'bei der Eisenbahn'], [44.5, 36.5, 0, 'bei der Eisenbahn'], [22, 30, 0, 'zwischen Schreibtisch und Eisenbahn'],
        [72, 22, 0, 'auf dem Spielteppich'], [90, 13, 0, 'auf dem Spielteppich'], [70, -5.5, 0, 'vor dem Bett'], [92, 1.5, 0, 'vor dem Bett'],
        [109, 12, 0, 'rechts neben dem Spielteppich'], [108.5, 43, 0, 'in der Ecke hinter dem Spielteppich'], [57.5, 43.5, 0, 'neben dem Bücherberg'],
        [-22, 5, 0, 'am Fenster'], [-21, -14, 0, 'neben dem Teddy'], [-8, 20, 0, 'unter dem Stuhl'], [2, 40, 0, 'unter dem Schreibtisch'], [-9, 44, 0, 'unter dem Schreibtisch'],
        [19.5, -33.5, 0, 'hinter dem Fußball'], [30, -30, 0, 'an der hinteren Wand'], [47, -31, 0, 'an der hinteren Wand'],
        [60, -31, 0, 'unter dem Bett'], [78, -20, 0, 'unter dem Bett'], [90, -12, 0, 'unter dem Bett'], [101, -22, 0, 'unter dem Bett'],
        [36.2, -14.8, 1.1, 'auf dem Bahnsteig'], [52.6, 24.2, 2.6, 'auf dem Bücherberg'], [3.4, -22.2, 4.6, 'oben bei den Bauklötzen'], [45.8, -19, 4.6, 'auf dem Steinturm'],
        [20.8, 9.2, 4.18, 'auf dem Turm des Baumeisters', true], [-10.5, 22.5, 12.2, 'auf dem Stuhl'],
        [16.6, 44.6, 21, 'auf dem Schreibtisch'], [-2, 45, 21, 'auf dem Schreibtisch'], [-12.2, 42.2, 25.4, 'bei der Lampe'],
        [55, -11, 17.1, 'auf dem Bett'], [98, -11, 17.1, 'auf dem Bett'], [80.6, -16, 23.55, 'auf der Kissenburg'], [104.9, -11, 24, 'ganz oben auf dem Kopfteil vom Bett'],
      ],
      float: 0.75, reach: 1.0, r: 0.3, tiers: { 10: 'Zehn Knöpfe! Du hast ein gutes Auge.', 20: 'Zwanzig Knöpfe! Dafür bekommst du einen Sticker.', 30: 'Dreißig! Jetzt fehlen nur noch die gut versteckten.' },
      sticker: 20,
      lines: {
        ask: 'Oh je, meine Knopfschachtel ist umgekippt! Vierzig goldene Knöpfe sind durchs ganze Zimmer gerollt. Sammelst du sie für mich ein?',
        tip: (n, of, where) => 'Du hast schon ' + n + ' von ' + of + ' Knöpfen. Schau doch mal ' + where + ' nach!',
        all: 'Alle vierzig Knöpfe! So ordentlich war meine Schachtel noch nie. Tausend Dank!',
      },
    },
    dust: {
      giver: { look: 'duster', at: [58.5, 0, -6.2], yaw: 0.4 },
      area: { x0: 57, x1: 93, z0: -33.5, z1: -11 }, homes: [[62, -15], [70, -29], [77, -18], [83, -30], [88, -14], [66, -22]],
      see: 6.5, run: 5.3, stroll: 1.6, catch: 0.85, wall: 2.6, back: 40,
      lines: {
        ask: 'Pst! Unter dem Bett flitzen sechs freche Staubmäuse herum. Fängst du sie, bevor Schlürfi sie holt? Sie laufen weg, du musst sie in die Enge treiben.',
        done: 'Alle sechs gefangen! Unter dem Bett ist es jetzt blitzsauber.',
      },
    },
  };
  const BRICK = { w: 0.95, h: 0.6, reach: 1.15, lift: 0.55, tower: 1.7, towerH: 1.0, carry: 0.6, carryY: 1.05, carryGap: 0.4 };

  // ---------- Building bricks ----------
  Room3D.sideParts.push({ id: 'bricks', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx, { PAL, std, mesh, lit } = k;
    const K = FIND.bricks;
    const studGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12);
    // one brick, body and studs melted into one mesh (one draw call)
    const brickGeo = k.mergeGeos([[k.roundedBox(BRICK.w, BRICK.h, BRICK.w, 0.06, 2).translate(0, BRICK.h / 2, 0)],
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz]) => [studGeo.clone().translate(dx * BRICK.w / 4, BRICK.h + 0.06, dz * BRICK.w / 4)])]);
    function brickMesh(color, scale) {
      const g = new THREE.Group();
      lit(mesh(brickGeo, std(color, { roughness: 0.35 }), 0, 0, 0, g));
      g.scale.setScalar(scale || 1); root.add(g); return g;
    }
    const bricks = K.spots.map((at, i) => { const g = brickMesh(K.colors[i]); const glow = k.halo('#FFFFFF', 1.8, 0.35); root.add(glow); return { at, g, glow, got: false, order: 0 }; });
    // the base plate and the tower that grows on it
    {
      const plate = lit(mesh(k.roundedBox(3.2, 0.18, 3.2, 0.05, 2), std('#52AE75', { roughness: 0.45 }), K.plate[0], 0.09, K.plate[1], root));
      plate.receiveShadow = true;
      const studs = new THREE.InstancedMesh(studGeo, std('#52AE75', { roughness: 0.45 }), 36), d = new THREE.Object3D();
      for (let i = 0; i < 36; i++) { d.position.set(K.plate[0] - 1.33 + (i % 6) * 0.53, 0.24, K.plate[1] - 1.33 + Math.floor(i / 6) * 0.53); d.updateMatrix(); studs.setMatrixAt(i, d.matrix); }
      root.add(studs);
    }
    // The tower is a winding stair of four columns, one to four bricks high, so Mimo can hop up step by step.
    // The top brick of each column is one of Mimo's, the ones below are the builder's own. All in one instanced mesh.
    const TW = BRICK.w * BRICK.tower, OWN = '#F1EADB';
    const columns = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dz], i) => {
      const x = K.plate[0] + dx * TW / 2, z = K.plate[1] + dz * TW / 2;
      return { x, z, n: i + 1, col: world.addBox(x, 0.18, 0.18 + (i + 1) * BRICK.towerH, z, TW / 2, TW / 2) };
    });
    const towerBricks = columns.flatMap((c, ci) => Array.from({ length: c.n }, (_, level) => ({ c, level, color: level === c.n - 1 ? K.colors[ci] : OWN })));
    const towerMesh = lit(new THREE.InstancedMesh(brickGeo, k.own(new THREE.MeshStandardMaterial({ roughness: 0.35, envMapIntensity: 0.3 })), towerBricks.length));
    const towerDummy = new THREE.Object3D(), towerTint = new THREE.Color();
    sx.bound(towerMesh, [K.plate[0], 2, K.plate[1]], 5); root.add(towerMesh);
    towerBricks.forEach((b, i) => towerMesh.setColorAt(i, towerTint.set(b.color)));
    let towerShown = 0;
    // n: how many columns stand (they grow one after the other)
    function towerShow(n) {
      towerShown = n;
      towerBricks.forEach((b, i) => {
        towerDummy.position.set(b.c.x, 0.18 + b.level * BRICK.towerH, b.c.z); towerDummy.scale.setScalar(b.c.n <= n ? BRICK.tower : 0); towerDummy.updateMatrix(); towerMesh.setMatrixAt(i, towerDummy.matrix);
      });
      towerMesh.instanceMatrix.needsUpdate = true;
      for (const c of columns) c.col.off = c.n > n;
    }
    const who = sx.giver(K.giver, 'Baumeister', 'builder');
    const q = { state: 'idle', t: 0, told: false };
    const have = () => bricks.filter((b) => b.got).length;

    function update(dt, play, t) {
      const carried = q.state !== 'build' && q.state !== 'done';
      for (const b of bricks) {
        if (b.got) {
          // found bricks ride on Mimo's head as a wobbly stack until the builder has them
          b.g.visible = carried; b.glow.visible = false;
          if (carried) { const i = b.order - 1; b.g.scale.setScalar(BRICK.carry); b.g.position.set(p.x + Math.sin(t * 5 + i) * 0.03 * (i + 1), p.y + BRICK.carryY + i * BRICK.carryGap, p.z); b.g.rotation.y = p.yaw + i * 0.3; }
          continue;
        }
        const y = b.at[1] + BRICK.lift + Math.sin(t * 2 + b.at[0]) * 0.1;
        b.g.scale.setScalar(1); b.g.position.set(b.at[0], y, b.at[2]); b.g.rotation.y = t * 1.3 + b.at[2]; b.glow.position.set(b.at[0], y + 0.3, b.at[2]);
        if (play && near(b.at, BRICK.reach)) {
          b.got = true; b.order = have(); world.sfx.star(); world.burst(b.at[0], b.at[1] + 0.8, b.at[2], 10, [K.colors[bricks.indexOf(b)], PAL.white], 2, { life: 0.5 });
          world.hint('Klemmbaustein gefunden: ' + have() + ' von ' + bricks.length + '.' + (have() === bricks.length ? ' Bring sie zum Baumeister.' : ''));
        }
      }
      const n = have();
      if (play && near(who.at) && q.state !== 'done' && q.state !== 'build') {
        if (n === bricks.length) { q.state = 'build'; q.t = 0; }
        else if (q.state === 'idle') { q.state = 'active'; q.told = true; say(who, K.lines.ask); }   // told: no second line while Mimo still stands there
        else if (!q.told) { q.told = true; say(who, K.lines.more); }
      } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      if (q.state === 'build') {
        q.t += dt; const shown = Math.min(columns.length, Math.floor(q.t / 0.45) + 1);
        if (towerShown < shown) { const c = columns[shown - 1]; towerShow(shown); world.sfx.land(); world.burst(c.x, 0.18 + c.n * BRICK.towerH, c.z, 8, [K.colors[shown - 1], PAL.white], 2, { life: 0.4 }); }
        if (q.t > columns.length * 0.45 + 0.4) { q.state = 'done'; say(who, K.lines.built); world.sticker('bricks'); world.sfx.win(); }
      }
      who.open = q.state === 'idle' || (q.state === 'active' && n === bricks.length); who.happy = q.state === 'done';
    }
    function reset() {
      towerShow(0); Object.assign(q, { state: 'idle', t: 0, told: false });
      for (const b of bricks) { b.got = false; b.order = 0; b.g.visible = b.glow.visible = true; }
    }
    return { update, reset, state: () => ({ bricks: q.state, have: have() }) };
  } });

  // ---------- Gold buttons ----------
  Room3D.sideParts.push({ id: 'buttons', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx;
    const U = FIND.buttons, total = U.list.length;
    // a coat button standing on its edge: a disc with a thick rim
    // (kept coarse: there are forty of them and they are always drawn)
    const geo = k.mergeGeos([[new THREE.CylinderGeometry(U.r, U.r, 0.07, 16).rotateX(Math.PI / 2)], [new THREE.TorusGeometry(U.r, 0.055, 5, 16)],
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => [new THREE.CylinderGeometry(0.045, 0.045, 0.13, 6).rotateX(Math.PI / 2).translate(dx * 0.1, dy * 0.1, 0)])]);
    const inst = new THREE.InstancedMesh(geo, k.starMat, total), dummy = new THREE.Object3D();
    inst.frustumCulled = false; root.add(inst);
    const who = sx.giver(U.giver, 'Schneiderin', 'seamstress');
    let found = [];
    const got = U.list.map(() => false);                 // the same as `found`, quick to ask per button
    const q = { state: 'idle', told: false };
    // For the bot: a button must lie on a surface and not inside something solid. Looked at once, the first time
    // it is asked for, because things that move only get their places with the first step of the game.
    let bad = null;
    const check = () => { if (!bad) { bad = []; U.list.forEach(checkOne); } return bad; };
    function checkOne([x, z, y, , late], i) {
      if (late) return;
      let ground = 0;
      for (const c of world.cols) {
        if (c.off || c.kind === 'hit' || c.top > y + 0.4) continue;
        const on = c.type === 'cyl' ? Math.hypot(x - c.x, z - c.z) <= c.r : Math.abs(x - c.x) <= c.hx && Math.abs(z - c.z) <= c.hz;
        if (on && c.top > ground) ground = c.top;
      }
      if (Math.abs(ground - y) > 0.15) bad.push({ i, why: 'surface is at ' + ground.toFixed(2) });
      const cy = y + U.float, m = 0.3;
      for (const c of world.cols) {
        if (c.off || cy < c.bottom || cy > c.top || c.top - c.bottom > 150) continue;
        const inside = c.type === 'cyl' ? Math.hypot(x - c.x, z - c.z) < c.r + m : Math.abs(x - c.x) < c.hx + m && Math.abs(z - c.z) < c.hz + m;
        if (inside) { bad.push({ i, why: 'inside something solid' }); break; }
      }
    }
    const tell = () => world.collect({ id: 'buttons', n: found.length, of: total });

    function update(dt, play, t) {
      const yaw = -world.camYaw();
      U.list.forEach(([x, z, y], i) => {
        const cy = y + U.float + Math.sin(t * 2.2 + i * 1.3) * 0.1;
        dummy.position.set(x, cy, z); dummy.rotation.set(0, yaw + t * 2 + i, 0); dummy.scale.setScalar(got[i] ? 0 : 1); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
        if (got[i] || !play || Math.hypot(x - p.x, y + U.float - p.y - 0.4, z - p.z) > U.reach) return;
        found = found.concat(i); got[i] = true; world.keep.set('buttons', found); tell();
        world.sfx.star(); world.burst(x, cy, z, 12, [k.PAL.gold, k.PAL.white], 3, { life: 0.6 });
        const n = found.length;
        if (n === U.sticker) world.sticker('buttons');
        if (n === total) { world.sticker('buttonsAll'); world.sfx.win(); say(who, U.lines.all); }
        else if (U.tiers[n]) say(who, U.tiers[n]);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (play && near(who.at)) {
        if (!q.told) {
          q.told = true;
          const next = U.list.findIndex((_, i) => !found.includes(i));
          if (q.state === 'idle') { q.state = 'active'; say(who, U.lines.ask); }
          else if (next >= 0) say(who, U.lines.tip(found.length, total, U.list[next][3]));
        }
      } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      who.open = q.state === 'idle' && found.length < total; who.happy = found.length === total;
    }
    function reset() {
      const kept = world.keep.get('buttons');
      found = Array.isArray(kept) ? [...new Set(kept.filter((n) => Number.isInteger(n) && n >= 0 && n < total))] : [];
      got.fill(false); for (const i of found) got[i] = true;
      Object.assign(q, { state: 'idle', told: false }); tell();
    }
    return { update, reset, state: () => ({ buttons: found.length, buttonsBad: check() }) };
  } });

  // ---------- Dust bunnies ----------
  Room3D.sideParts.push({ id: 'dust', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx, { damp } = Room3D.util;
    const D = FIND.dust, A = D.area, GREY = '#8F8A9E';
    const tuft = (x, y, z, rx, rz) => [new THREE.ConeGeometry(0.11, 0.3, 6), GREY, [x, y, z], [rx, 0, rz]];
    const geo = sx.melt([
      [new THREE.IcosahedronGeometry(0.4, 1), GREY, [0, 0.4, 0], null, [1, 0.85, 1]],
      tuft(0, 0.8, 0, 0, 0), tuft(0.3, 0.66, -0.05, 0, -0.9), tuft(-0.3, 0.66, -0.05, 0, 0.9), tuft(0, 0.6, -0.34, -1, 0),
      [new THREE.SphereGeometry(0.115, 8, 6), '#FFFFFF', [0.15, 0.5, 0.32]], [new THREE.SphereGeometry(0.115, 8, 6), '#FFFFFF', [-0.15, 0.5, 0.32]],
      [new THREE.SphereGeometry(0.06, 6, 5), k.PAL.ink, [0.15, 0.5, 0.42]], [new THREE.SphereGeometry(0.06, 6, 5), k.PAL.ink, [-0.15, 0.5, 0.42]],
    ]);
    // they live in the dark below the bed, so they glow a little by themselves
    const mat = k.own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.05 }));
    const inst = new THREE.InstancedMesh(geo, mat, D.homes.length), dummy = new THREE.Object3D();
    sx.bound(inst, [(A.x0 + A.x1) / 2, 0.5, (A.z0 + A.z1) / 2], Math.hypot(A.x1 - A.x0, A.z1 - A.z0) / 2 + 2); inst.castShadow = true; root.add(inst);
    const bunnies = D.homes.map(([x, z], i) => ({ home: [x, z], x, z, vx: 0, vz: 0, yaw: i * 1.1, caught: false, seed: i * 2.4, pop: 0 }));
    const who = sx.giver(D.giver, 'Staubfängerin', 'duster');
    const q = { state: 'idle', told: false, done: false, back: 0 };
    const count = () => bunnies.filter((b) => b.caught).length;

    function update(dt, play, t) {
      const ride = sx.riding(), reach = ride ? world.vacuum.radius + 0.5 : D.catch;
      bunnies.forEach((b, i) => {
        b.pop = Math.max(0, b.pop - dt * 3);
        if (!b.caught) {
          const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz) || 1e-4;
          let tx = 0, tz = 0, speed = 0;
          if (play && p.y < 4 && d < D.see) {
            // away from Mimo, away from the walls of their hiding place, and a sidestep that changes now and then
            const side = Math.sin(t * 2.3 + b.seed) > 0 ? 0.55 : -0.55;
            const wx = Math.max(0, 1 - (b.x - A.x0) / D.wall) - Math.max(0, 1 - (A.x1 - b.x) / D.wall), wz = Math.max(0, 1 - (b.z - A.z0) / D.wall) - Math.max(0, 1 - (A.z1 - b.z) / D.wall);
            tx = dx / d + wx * 1.6 - dz / d * side; tz = dz / d + wz * 1.6 + dx / d * side; speed = D.run;
          } else {
            const hx = b.home[0] - b.x, hz = b.home[1] - b.z;
            if (Math.hypot(hx, hz) > 1) { tx = hx; tz = hz; speed = D.stroll; }
          }
          const len = Math.hypot(tx, tz) || 1;
          b.vx = damp(b.vx, tx / len * speed, 9, dt); b.vz = damp(b.vz, tz / len * speed, 9, dt);
          b.x = Math.max(A.x0, Math.min(A.x1, b.x + b.vx * dt)); b.z = Math.max(A.z0, Math.min(A.z1, b.z + b.vz * dt));
          if (Math.hypot(b.vx, b.vz) > 0.3) b.yaw = Math.atan2(b.vx, b.vz);
          if (play && d < reach && (ride || p.y < 1.2)) {
            b.caught = true; world.sfx.star(); world.burst(b.x, 0.5, b.z, 14, [GREY, '#FFFFFF'], 2.6, { life: 0.6 });
            const n = count();
            if (!q.done) {
              world.hint('Staubmaus gefangen: ' + n + ' von ' + bunnies.length + '.');
              if (n === bunnies.length) { q.done = true; q.state = 'done'; say(who, D.lines.done); world.sticker('dust'); world.sfx.win(); }
            }
            if (n === bunnies.length) q.back = D.back;
          }
        }
        const run = Math.hypot(b.vx, b.vz), hop = b.caught ? 0 : Math.abs(Math.sin(t * (4 + run * 1.6) + b.seed)) * (0.06 + run * 0.045);
        dummy.position.set(b.x, hop, b.z); dummy.rotation.set(0, b.yaw, 0);
        dummy.scale.setScalar(b.caught ? 0 : 1 + b.pop * 0.4); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      // after a while they are back, just for the fun of chasing them
      if (q.back > 0) { q.back -= dt; if (q.back <= 0 && Math.hypot(p.x - (A.x0 + A.x1) / 2, p.z - (A.z0 + A.z1) / 2) > 30) for (const b of bunnies) Object.assign(b, { caught: false, x: b.home[0], z: b.home[1], vx: 0, vz: 0, pop: 1 }); else if (q.back <= 0) q.back = 5; }
      if (play && near(who.at)) { if (!q.told) { q.told = true; if (q.state === 'idle') { q.state = 'active'; say(who, D.lines.ask); } } } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      who.open = q.state === 'idle'; who.happy = q.done;
    }
    function reset() {
      Object.assign(q, { state: 'idle', told: false, done: false, back: 0 });
      for (const b of bunnies) Object.assign(b, { caught: false, x: b.home[0], z: b.home[1], vx: 0, vz: 0, pop: 0 });
    }
    return { update, reset, state: () => ({ dust: q.state, dustCaught: count(), dustAt: bunnies.map((b) => (b.caught ? null : [+b.x.toFixed(1), +b.z.toFixed(1)])) }) };
  } });

  Room3D.SIDE_FIND = FIND;
})();
