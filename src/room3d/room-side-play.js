/* Mimo hüpft · Kinderzimmer (3D) · side missions: toys that answer
   Floor piano: every key sounds when Mimo steps or lands on it; on the start pad the bandmaster plays a
   tune that grows by one note each round, and Mimo hops it back. Balloons: they pop when Mimo jumps into
   them and come back after a while; the balloon race pops all twelve against the clock. Dominoes: a
   long row by the window that falls as a chain; all of them with one single push gives a sticker.
   Block towers: run into one and it tumbles, walk up slowly and it can be climbed.
   See room-side.js for `sx`. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});
  Room3D.sideParts = Room3D.sideParts || [];

  const PLAY = {
    piano: {
      giver: { look: 'musician', at: [77.6, 0, 38.4], yaw: -1.9 }, pad: [76.4, 41.3],
      x0: 62, z: 41.3, key: 1.5, depth: 3, h: 0.18,
      notes: [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3],
      colors: ['#E25B45', '#EE8A38', '#F4BF3A', '#52AE75', '#3FB6C8', '#4686D2', '#9474CE', '#E25B45'],
      // the beginnings of three old children's songs, as key numbers (0 is the low C)
      tunes: [[0, 1, 2, 3, 4, 4, 5, 5, 5, 5, 4], [4, 2, 2, 3, 1, 1, 0, 1, 2, 3, 4, 4, 4], [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4]],
      first: 3, gap: 0.55, pause: 1.1, patience: 14, steps: [1, 3, 5],
      lines: {
        ask: 'Guten Tag! Das ist mein Bodenklavier, hüpf ruhig darauf herum. Auf dem Startknopf spiele ich dir eine Melodie vor, und du hüpfst sie nach.',
        listen: 'Hör gut zu!', go: 'Jetzt du! Hüpf auf die Tasten.', wrong: 'Oh, das war ein anderer Ton. Versuch es gleich noch einmal!', slow: 'Eingeschlafen? Tritt auf den Startknopf, dann fangen wir neu an.',
        praise: ['Bravo!', 'Wunderbar!', 'Genau so!', 'Was für ein Gehör!', 'Fabelhaft!'], whole: 'Die ganze Melodie! Du bist ein echtes Musiktalent.',
      },
    },
    balloons: {
      giver: { look: 'seller', at: [60.5, 0, 2.4], yaw: 1.2 }, pad: [62.8, -0.6],
      list: [[66.5, -1, 2.1], [70.5, -4.6, 2.6], [75, -0.4, 2.2], [80, -3, 5.3], [84.5, -5, 2.4], [88.5, -0.6, 2.8], [93, -4.4, 2.2], [98, -2, 5.3], [103, 0.5, 2.5], [107, -3.5, 2.9], [108, 4, 2.2], [106.5, 9.5, 2.7]],
      drums: [[80, -3], [98, -2]], drum: { r: 1.5, h: 1.6, bounce: 19.5 },
      r: 0.6, reach: 1.0, back: 10, limit: 60, steps: [26, 20, 16],
      lines: {
        ask: 'Luftballons, bunte Luftballons! Spring ruhig hinein, sie platzen so schön. Auf dem Startknopf beginnt die Ballonjagd: alle zwölf, so schnell du kannst!',
        slow: 'Das hat zu lange gedauert, die ersten Ballons sind schon wieder da. Versuch es noch einmal!',
      },
    },
    dominoes: {
      from: [-15.5, -10.5], length: 23, sway: 4.5, waves: 1.25, gap: 0.78,     // a wavy line along the window, towards +z
      w: 0.62, h: 1.3, d: 0.17, touch: 0.55, pass: 0.45, lean: 1.22, flat: 1.5, rest: 5, rise: 0.035,
      line: 'Kettenreaktion! Alle Dominosteine mit einem einzigen Stoß.',
    },
    towers: {
      list: [[9, 9.5], [32, 21], [104.5, 22], [44, -3]], cube: 0.7, wide: 2, high: 3,
      speed: 4, back: 6, clear: 2.4,
    },
  };

  // ---------- Floor piano ----------
  Room3D.sideParts.push({ id: 'piano', build(sx) {
    const { THREE, k, world, root, p, say, near } = sx;
    const P = PLAY.piano, n = P.notes.length, hx = n * P.key / 2;
    const col = world.addBox(P.x0 + hx, 0, P.h, P.z, hx, P.depth / 2);
    const keys = new THREE.InstancedMesh(k.roundedBox(P.key - 0.08, P.h, P.depth, 0.05, 2), k.own(new THREE.MeshStandardMaterial({ roughness: 0.4, envMapIntensity: 0.3 })), n);
    keys.receiveShadow = true; sx.bound(keys, [P.x0 + hx, 0, P.z], hx + 2); root.add(keys);
    const dummy = new THREE.Object3D(), tint = new THREE.Color(), white = new THREE.Color('#FFFFFF'), lit = P.notes.map(() => 0);
    const base = P.colors.map((c) => new THREE.Color(c)), drawn = P.notes.map(() => -1);          // drawn: the glow a key was last drawn with
    const who = sx.giver(P.giver, 'Kapellmeister', 'musician'), startPad = sx.pad(P.pad[0], P.pad[1], k.PAL.purple);
    const q = { cur: -1, air: false, told: false, got: false, games: 0, game: null };
    function sound(i) { lit[i] = 1; world.sfx.note(P.notes[i]); }
    function finish(line) {
      const g = q.game, res = g.round ? sx.record('piano', g.round, P.steps, false) : null;
      say(who, g.round ? (g.round === 1 ? 'Eine Runde' : g.round + ' Runden') + ' geschafft!' + (res.medal ? ' Das ist ' + sx.MEDAL_NAMES[res.medal] + '.' : '') + (line === P.lines.whole ? ' ' + line : '') : line);
      world.sfx[g.round ? 'win' : 'oh'](); q.game = null; sx.end('piano');
    }
    function stepGame(dt, landedOn) {
      const g = q.game; g.t += dt;
      if (g.phase === 'show') {
        const i = Math.floor(g.t / P.gap);
        if (i > g.i && i <= g.len) { g.i = i; sound(g.tune[i - 1]); }
        if (g.t > (g.len + 1) * P.gap) { g.phase = 'echo'; g.t = 0; g.pos = 0; if (!g.round) say(who, P.lines.go); }
      } else if (g.phase === 'echo') {
        if (landedOn >= 0) {
          if (landedOn !== g.tune[g.pos]) { finish(P.lines.wrong); return; }
          g.pos++; g.t = 0;
          if (g.pos === g.len) {
            g.round++; world.sfx.yay();
            if (!q.got) { q.got = true; world.sticker('piano'); }
            if (g.len === g.tune.length) { finish(P.lines.whole); return; }
            say(who, P.lines.praise[(g.round - 1) % P.lines.praise.length]); g.phase = 'pause'; g.t = 0;
          }
        } else if (g.t > P.patience) { finish(P.lines.slow); return; }
      } else if (g.t > P.pause) { g.phase = 'show'; g.t = 0; g.i = 0; g.len++; }
      sx.clock({ big: 'Runde ' + (g.round + 1), small: g.phase === 'echo' ? 'Ton ' + Math.min(g.pos + 1, g.len) + ' von ' + g.len : 'Hör gut zu...' });
    }

    function update(dt, play) {
      // which key Mimo stands on; a key sounds when he steps onto it or lands on it
      const on = p.grounded && p.ground === col ? Math.max(0, Math.min(n - 1, Math.floor((p.x - P.x0) / P.key))) : -1;
      let landedOn = -1;
      if (!p.grounded) q.air = true;
      if (on >= 0 && play && (on !== q.cur || q.air)) { sound(on); if (q.air) landedOn = on; }
      if (p.grounded) q.air = false;
      q.cur = on;
      if (play && near(who.at) && !q.game) { if (!q.told) { q.told = true; say(who, sx.best('piano') ? 'Noch eine Melodie? Tritt auf den Startknopf.' + sx.bestLine('piano', (v) => (v === 1 ? 'eine Runde' : v + ' Runden')) : P.lines.ask); } } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      startPad.on = !q.game;
      if (startPad.pressed && sx.begin('piano')) { q.game = { tune: P.tunes[q.games % P.tunes.length], round: 0, phase: 'show', t: -0.6, i: 0, len: P.first, pos: 0 }; q.games++; say(who, P.lines.listen); }
      if (q.game) stepGame(dt, landedOn);
      let changed = false;
      for (let i = 0; i < n; i++) {
        lit[i] = Math.max(0, lit[i] - dt * 3.2);
        if (lit[i] === drawn[i]) continue;                 // only keys whose glow changed are written again
        drawn[i] = lit[i]; changed = true;
        dummy.position.set(P.x0 + (i + 0.5) * P.key, P.h / 2 - lit[i] * 0.07, P.z); dummy.updateMatrix(); keys.setMatrixAt(i, dummy.matrix);
        keys.setColorAt(i, tint.copy(base[i]).lerp(white, lit[i] * 0.55));
      }
      if (changed) { keys.instanceMatrix.needsUpdate = true; keys.instanceColor.needsUpdate = true; }
      who.open = !q.got; who.happy = q.got && !q.game;
    }
    function reset() { Object.assign(q, { cur: -1, air: false, told: false, got: false, games: 0, game: null }); lit.fill(0); drawn.fill(-1); }
    return { update, reset, state: () => ({ piano: q.game ? q.game.phase : null, pianoRound: q.game ? q.game.round : 0, pianoGot: q.got }) };
  } });

  // ---------- Balloons ----------
  Room3D.sideParts.push({ id: 'balloons', build(sx) {
    const { THREE, k, world, root, p, say, near, props } = sx;
    const L = PLAY.balloons, n = L.list.length, COLORS = k.TOY_COLORS.concat(k.PAL.purple);
    const body = k.mergeGeos([[new THREE.SphereGeometry(L.r, 18, 14).scale(1, 1.18, 1)], [new THREE.ConeGeometry(0.1, 0.16, 8).translate(0, -L.r * 1.18 - 0.04, 0)]]);
    const inst = new THREE.InstancedMesh(body, k.own(new THREE.MeshStandardMaterial({ roughness: 0.22, envMapIntensity: k.ENV_SHINY })), n);
    const strings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 5).translate(0, 0.5, 0), k.basic('#FFFFFF'), n);
    for (const m of [inst, strings]) sx.bound(m, [87, 3, 2.5], 27);                     // the strip in front of the bed and the corner beside the play mat
    inst.castShadow = true; root.add(inst, strings);
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    const list = L.list.map(([x, z, h], i) => ({ x, z, h, alive: true, back: 0, grow: 1, seed: i * 1.9 }));
    list.forEach((b, i) => inst.setColorAt(i, tint.set(COLORS[i % COLORS.length])));
    // two toy drums as trampolines below the high balloons
    const drums = L.drums.map(([x, z]) => {
      const dr = props.drum(L.drum.r, L.drum.h); dr.root.position.set(x, 0, z); root.add(dr.root);
      const state = { skin: dr.skin, squash: 0 };
      world.addCyl(x, z, L.drum.r - 0.1, L.drum.h, 0, { kind: 'bounce', bounce: L.drum.bounce, onBounce: () => { state.squash = 1; } });
      return state;
    });
    const who = sx.giver(L.giver, 'Ballonverkäuferin', 'seller'), startPad = sx.pad(L.pad[0], L.pad[1], k.PAL.orange);
    const q = { told: false, got: false, game: null };
    const popped = () => list.filter((b) => !b.alive).length;
    function finish() {
      const t = +q.game.t.toFixed(2), res = sx.record('balloons', t, L.steps, true);
      if (!q.got) { q.got = true; world.sticker('balloons'); }
      say(who, 'Alle zwölf in ' + sx.seconds(t) + '!' + (res.medal ? ' Das ist ' + sx.MEDAL_NAMES[res.medal] + '.' : '') + (res.medal < 3 ? ' Für ' + sx.MEDAL_NAMES[res.medal + 1] + ' musst du unter ' + sx.seconds(L.steps[res.medal]) + ' bleiben.' : ''));
      world.sfx.win(); q.game = null; sx.end('balloons');
      for (const b of list) b.back = 1.5 + b.seed * 0.15;
    }

    function update(dt, play, t) {
      if (play && near(who.at) && !q.game) { if (!q.told) { q.told = true; say(who, sx.best('balloons') ? 'Noch eine Ballonjagd? Tritt auf den Startknopf.' + sx.bestLine('balloons', sx.seconds) : L.lines.ask); } } else if (!near(who.at, sx.NEAR * 2)) q.told = false;
      startPad.on = !q.game;
      if (startPad.pressed && sx.begin('balloons')) { q.game = { phase: 'count', c: { t: 0, step: -1 }, t: 0 }; for (const b of list) { b.alive = true; b.back = 0; b.grow = Math.min(b.grow, 0.3); } }
      const g = q.game;
      if (g && g.phase === 'count') { sx.clock({ big: 'Achtung...', small: 'Gold ' + sx.seconds(L.steps[2]) }); const c = sx.countdown(g.c, who, dt, startPad.at); if (c === 'go') g.phase = 'run'; else if (c === 'off') { q.game = null; sx.end('balloons'); } }
      else if (g) {
        g.t += dt;
        sx.clock({ big: sx.seconds(g.t), small: popped() + ' von ' + n + ' · Gold ' + sx.seconds(L.steps[2]), hurry: L.limit - g.t < 5 });
        if (g.t > L.limit) { say(who, L.lines.slow); world.sfx.oh(); q.game = null; sx.end('balloons'); for (const b of list) b.back = 0.5; }
      }
      list.forEach((b, i) => {
        const y = b.h + Math.sin(t * 1.3 + b.seed) * 0.09, x = b.x + Math.sin(t * 0.9 + b.seed) * 0.07;
        if (b.alive) {
          b.grow = Math.min(1, b.grow + dt * 2.5);
          if (play && !(q.game && q.game.phase === 'count') && Math.hypot(x - p.x, y - p.y - 0.5, b.z - p.z) < L.reach) {
            b.alive = false; b.back = L.back; b.grow = 0; world.sfx.pop(); world.burst(x, y, b.z, 16, [COLORS[i % COLORS.length], '#FFFFFF'], 4.5, { life: 0.5, up: 1 });
            if (q.game && q.game.phase === 'run' && popped() === n) finish();
          }
        } else if (!q.game) { b.back -= dt; if (b.back <= 0) b.alive = true; }
        dummy.position.set(x, y, b.z); dummy.rotation.set(0, 0, Math.sin(t * 0.9 + b.seed) * 0.06); dummy.scale.setScalar(b.alive ? 0.2 + b.grow * 0.8 : 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
        dummy.position.set(b.x, 0, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, b.alive ? Math.max(0.1, (y - L.r * 1.3) * b.grow) : 0.001, 1); dummy.updateMatrix(); strings.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true; strings.instanceMatrix.needsUpdate = true;
      for (const dr of drums) { dr.squash = Math.max(0, dr.squash - dt * 4); dr.skin.position.y = L.drum.h + 0.01 - Math.sin(dr.squash * Math.PI) * 0.18; }
      who.open = !q.got; who.happy = q.got && !q.game;
    }
    function reset() { Object.assign(q, { told: false, got: false, game: null }); for (const b of list) Object.assign(b, { alive: true, back: 0, grow: 1 }); }
    return { update, reset, state: () => ({ balloons: q.game ? q.game.phase : null, balloonsPopped: popped(), balloonsGot: q.got, balloonsT: q.game ? +q.game.t.toFixed(2) : 0 }) };
  } });

  // ---------- Dominoes ----------
  Room3D.sideParts.push({ id: 'domino', build(sx) {
    const { THREE, k, world, root, p } = sx;
    const D = PLAY.dominoes;
    // the row: points along a wavy line, evenly spaced, each with the direction the line runs in
    const tiles = (() => {
      const at = (u) => [D.from[0] + D.sway * Math.sin(u * Math.PI * 2 * D.waves), D.from[1] + D.length * u], out = [];
      let prev = at(0), run = 0, next = 0;
      for (let i = 1; i <= 2000; i++) {
        const cur = at(i / 2000), seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
        while (run + seg >= next) { const f = (next - run) / (seg || 1), ahead = at(Math.min(1, i / 2000 + 0.002)); out.push({ x: prev[0] + (cur[0] - prev[0]) * f, z: prev[1] + (cur[1] - prev[1]) * f, tx: ahead[0] - cur[0], tz: ahead[1] - cur[1], a: 0, dir: 0 }); next += D.gap; }
        run += seg; prev = cur;
      }
      for (const tile of out) { const len = Math.hypot(tile.tx, tile.tz) || 1; tile.tx /= len; tile.tz /= len; tile.yaw = Math.atan2(tile.tx, tile.tz); }
      return out;
    })();
    const n = tiles.length, COLORS = k.TOY_COLORS.concat(k.PAL.purple);
    const pips = k.canvasTex(64, 128, (g, W, H) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(40,30,60,0.28)'; g.fillRect(8, H / 2 - 2, W - 16, 4);
      for (const [x, y] of [[20, 24], [44, 48], [32, 36], [20, 88], [44, 88], [32, 104]]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
    });
    const inst = new THREE.InstancedMesh(k.roundedBox(D.w, D.h, D.d, 0.04, 2).translate(0, D.h / 2, 0), k.texStd(pips, { roughness: 0.4 }), n), dummy = new THREE.Object3D(), tint = new THREE.Color();
    dummy.rotation.order = 'YXZ'; sx.bound(inst, [D.from[0], 0.6, D.from[1] + D.length / 2], D.length / 2 + D.sway + 2); inst.castShadow = true; inst.receiveShadow = true; root.add(inst);
    tiles.forEach((tile, i) => inst.setColorAt(i, tint.set(COLORS[i % COLORS.length])));
    // a little bell behind the last tile, rung by the end of the chain
    const last = tiles[n - 1], bellAt = [last.x + last.tx * 1.3, last.z + last.tz * 1.3];
    const bell = new THREE.Mesh(sx.melt([
      [new THREE.CylinderGeometry(0.07, 0.09, 1.5, 8), k.PAL.birch, [0, 0.75, 0]], [new THREE.BoxGeometry(0.7, 0.08, 0.08), k.PAL.birch, [0.3, 1.5, 0]],
      [new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), k.PAL.red, [0.55, 1.1, 0]], [new THREE.SphereGeometry(0.08, 8, 6), k.PAL.ink, [0.55, 1.05, 0]],
    ]), sx.meltMat);
    bell.position.set(bellAt[0], 0, bellAt[1]); bell.rotation.y = last.yaw; bell.castShadow = true; root.add(bell);
    const q = { touches: 0, quiet: 0, rising: -1, ring: 0, rang: false, done: false, got: false };
    const standing = (tile) => tile.dir === 0;
    function topple(i, dir, byMimo) {
      const tile = tiles[i]; if (!standing(tile) || q.rising >= 0) return;
      tile.dir = dir; q.quiet = 0; if (byMimo) q.touches++;
      world.sfx.note(330 * Math.pow(2, i / n * 1.5), true);
    }
    function draw() {
      tiles.forEach((tile, i) => { dummy.position.set(tile.x, 0, tile.z); dummy.rotation.set(tile.dir * tile.a, tile.yaw, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
      inst.instanceMatrix.needsUpdate = true;
    }

    function update(dt, play, t) {
      let moved = false, allDown = true;
      if (q.rising < 0) {
        const ext = sx.reach(D.h);
        if (play && ext >= 0) for (let i = 0; i < n; i++) {
          const tile = tiles[i];
          if (!standing(tile) || Math.hypot(tile.x - p.x, tile.z - p.z) > D.touch + ext) continue;
          const along = p.vx * tile.tx + p.vz * tile.tz, side = (tile.x - p.x) * tile.tx + (tile.z - p.z) * tile.tz;
          topple(i, (Math.abs(along) > 0.5 ? along : side) >= 0 ? 1 : -1, true);
        }
        for (let i = 0; i < n; i++) {
          const tile = tiles[i];
          if (standing(tile)) { allDown = false; continue; }
          const j = i + tile.dir, end = j < 0 || j >= n, rest = end ? D.flat : D.lean;
          if (tile.a < rest) { tile.a = Math.min(rest, tile.a + (2.2 + tile.a * 9) * dt); moved = true; }
          if (!end && tile.a > D.pass && standing(tiles[j])) topple(j, tile.dir, false);
          if (end && i === n - 1 && tile.a >= rest && !q.rang) { q.rang = true; q.ring = 1.4; world.sfx.note(1320); }
        }
        if (allDown && !moved && !q.done) {
          q.done = true;
          if (q.touches === 1) { world.hint(D.line); world.sfx.win(); world.burst(bellAt[0], 1.6, bellAt[1], 36, COLORS, 4.5, { life: 1 }); if (!q.got) { q.got = true; world.sticker('domino'); } }
        }
        // some time after the last tile fell they stand up again, one after the other
        if (tiles.some((tile) => !standing(tile))) { q.quiet += dt; if (q.quiet > D.rest && !tiles.some((tile) => Math.hypot(tile.x - p.x, tile.z - p.z) < 1.2)) q.rising = 0; }
      } else {
        q.rising += dt; let up = true;
        tiles.forEach((tile, i) => {
          if (standing(tile)) return;
          if (q.rising > i * D.rise) { tile.a = Math.max(0, tile.a - dt * 5); if (tile.a === 0) tile.dir = 0; else up = false; } else up = false;
          moved = true;
        });
        if (up) { q.rising = -1; q.touches = 0; q.quiet = 0; q.done = false; q.rang = false; }
      }
      if (moved) draw();
      q.ring = Math.max(0, q.ring - dt); bell.rotation.z = Math.sin(t * 28) * 0.25 * q.ring;
    }
    function reset() { for (const tile of tiles) { tile.a = 0; tile.dir = 0; } Object.assign(q, { touches: 0, quiet: 0, rising: -1, ring: 0, rang: false, done: false, got: false }); draw(); }
    return { update, reset, state: () => ({ dominoes: n, dominoesDown: tiles.filter((tile) => !standing(tile)).length, dominoTouches: q.touches, dominoEnds: [[+tiles[0].x.toFixed(2), +tiles[0].z.toFixed(2)], [+last.x.toFixed(2), +last.z.toFixed(2)]] }) };
  } });

  // ---------- Block towers ----------
  Room3D.sideParts.push({ id: 'towers', build(sx) {
    const { THREE, k, world, root, p } = sx;
    const T = PLAY.towers, S = T.cube, per = T.wide * T.wide * T.high, half = T.wide * S / 2, top = T.high * S;
    const inst = new THREE.InstancedMesh(k.roundedBox(S * 0.96, S * 0.96, S * 0.96, 0.07, 2), k.own(new THREE.MeshStandardMaterial({ roughness: 0.45, envMapIntensity: 0.3 })), T.list.length * per);
    const dummy = new THREE.Object3D(), tint = new THREE.Color(), spin = new THREE.Vector3();
    inst.frustumCulled = false; inst.castShadow = true; inst.receiveShadow = true; root.add(inst);
    const towers = T.list.map(([x, z], ti) => {
      const cubes = [];
      for (let iy = 0; iy < T.high; iy++) for (let ix = 0; ix < T.wide; ix++) for (let iz = 0; iz < T.wide; iz++) {
        const i = ti * per + cubes.length;
        cubes.push({ i, home: [x - half + (ix + 0.5) * S, (iy + 0.5) * S, z - half + (iz + 0.5) * S], x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, rv: 0, ax: 1, az: 0 });
        inst.setColorAt(i, tint.set(k.TOY_COLORS[(ti + ix + iz * 2 + iy * 3) % k.TOY_COLORS.length]));
      }
      return { x, z, cubes, col: world.addBox(x, 0, top, z, half, half), state: 'up', t: 0 };
    });
    function place(c) { dummy.position.set(c.x, c.y, c.z); dummy.quaternion.setFromAxisAngle(spin.set(c.ax, 0, c.az), c.rot); dummy.updateMatrix(); inst.setMatrixAt(c.i, dummy.matrix); }
    function stand(tw) { for (const c of tw.cubes) { [c.x, c.y, c.z] = c.home; c.rot = 0; c.vx = c.vy = c.vz = 0; place(c); } tw.state = 'up'; tw.col.off = false; }
    function knock(tw) {
      tw.state = 'down'; tw.t = 0; tw.col.off = true; world.sfx.stomp(); world.sfx.land();
      const sp = Math.hypot(p.vx, p.vz) || 1;
      for (const c of tw.cubes) {
        const ox = c.home[0] - tw.x, oz = c.home[2] - tw.z;
        c.vx = p.vx / sp * (3 + Math.random() * 3) + ox * 3 + (Math.random() - 0.5) * 2; c.vz = p.vz / sp * (3 + Math.random() * 3) + oz * 3 + (Math.random() - 0.5) * 2;
        c.vy = 3 + c.home[1] * 2.2 + Math.random() * 2; c.rv = 6 + Math.random() * 8;
        const len = Math.hypot(c.vx, c.vz) || 1; c.ax = c.vz / len; c.az = -c.vx / len;
      }
    }

    function update(dt, play) {
      let moved = false;
      const ride = sx.riding();
      for (const tw of towers) {
        const dx = Math.max(0, Math.abs(p.x - tw.x) - half), dz = Math.max(0, Math.abs(p.z - tw.z) - half), d = Math.hypot(dx, dz);
        if (tw.state === 'up') {
          // only a run knocks it over: fast, on the ground level, and straight at it
          const toward = (tw.x - p.x) * p.vx + (tw.z - p.z) * p.vz;
          if (play && (ride ? d < world.vacuum.radius + 0.15 : p.y < top - 0.3 && d < world.PH.R + 0.12 && Math.hypot(p.vx, p.vz) > T.speed && toward > 0)) knock(tw);
          continue;
        }
        tw.t += dt; moved = true;
        if (tw.state === 'down') {
          for (const c of tw.cubes) {
            c.vy -= 30 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rot += c.rv * dt;
            if (c.y < S / 2) { c.y = S / 2; c.vy = c.vy < -2 ? -c.vy * 0.35 : 0; const f = Math.exp(-6 * dt); c.vx *= f; c.vz *= f; c.rv *= f; if (Math.abs(c.rv) < 0.6) { c.rv = 0; c.rot = Math.round(c.rot / (Math.PI / 2)) * (Math.PI / 2); } }
            place(c);
          }
          if (tw.t > T.back && d > T.clear) { tw.state = 'back'; tw.t = 0; world.sfx.flag(); }
        } else {
          // the blocks fly back to their places, the lowest first
          let home = true;
          tw.cubes.forEach((c, n) => {
            const k2 = Math.max(0, Math.min(1, (tw.t - n * 0.05) * 2.4)), e = k2 * k2 * (3 - 2 * k2);
            if (k2 < 1) home = false;
            c.x += (c.home[0] - c.x) * e; c.y += (c.home[1] + Math.sin(k2 * Math.PI) * 1.2 - c.y) * e; c.z += (c.home[2] - c.z) * e; c.rot *= 1 - e;
            place(c);
          });
          if (home) stand(tw);
        }
      }
      if (moved) inst.instanceMatrix.needsUpdate = true;
    }
    function reset() { for (const tw of towers) stand(tw); inst.instanceMatrix.needsUpdate = true; }
    return { update, reset, state: () => ({ towers: towers.map((tw) => tw.state) }) };
  } });

  Room3D.SIDE_PLAY = PLAY;
})();
