/* Mimo hüpft · Kinderzimmer (3D) · story "Schlürfis Nachtschicht"
   Tonight Schlürfi, the robot vacuum, runs on his own for the first time and sucks up everything on the
   floor. The toys need a plan, and Mimo does the missions for them. Each mission starts with a short
   scene: Mimo stands, the camera visits who speaks and what is to be done, a speech panel shows the
   words (jump or a tap goes on). The goal of the running step glows from afar, gold dust shows the first
   steps of the way. The time of day follows the missions, and Schlürfi sleeps until the last one is done.
   y is up. Places are written into the scenes as [x, y, z]; see README.md for the room's layout. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const BEAM = { r: 0.7, h: 24, color: '#FFE9A6', alpha: 0.8, near: 5, ringR: 1.5 }; // goal light; hidden nearer than `near`
  const DUST = { r: 1.05, size: 0.46, bob: 0.12 };   // gold dust: pick-up reach, size, how much it bobs
  const LINE_MIN = 0.45;                               // a line of a scene stays at least this long
  const FLAG_REACH = 2.2;                              // how near a flag counts as "there"
  const DRIVER = { at: [39.6, 1.1, -15.4], yaw: 0.6, size: 1.85 }; // the engine driver stands on the station's back edge

  const TM = Room3D.TRAIN_MISSION;                      // passengers and signal of mission 2 (room-story-train.js)
  // Who speaks in the scenes: the portrait the host shows and the spot above the speaker's head the bubble points at
  const SPEAKERS = {
    Teddy: { face: 'teddy', at: [-13.2, 7.9, -19] },
    'Lokführer': { face: 'driver', at: [DRIVER.at[0], DRIVER.at[1] + 2.35, DRIVER.at[2]] },
    Lampe: { face: 'lamp', at: [-12.2, 36.6, 33.8] },
    Oma: { face: 'granny', at: [11.8, 22.7, 38] },
    'Die Fahrgäste': { face: 'passengers', at: [12.8, 22.7, 37.5] },
    'Die Spielsachen': { face: 'toys', at: [85, 22.6, -22.5] },
  };
  const GAP = 1.8;                                     // seconds between a finished mission and the next one's scene (the "done" stamp)
  const near = (p, at, r) => Math.hypot(p.x - at[0], p.z - at[2]) < r && Math.abs(p.y - at[1]) < 1.2;
  // a flag goal counts once Mimo stands there or its flag is already on (he may have been there before)
  const reached = (at) => (c) => (c.p.grounded && near(c.p, at, FLAG_REACH)) || c.flagOn(at);

  // A scene is a list of lines; a line may move the camera (cam, look) or keep the last shot.
  // The words are German, in whole sentences, without dashes.
  const MISSIONS = [
    {
      title: 'Ausguck', icon: 'look', mood: 'day',
      scene: [
        { cam: [-5.5, 7, -8.5], look: [-13.2, 6.3, -19], who: 'Teddy', text: 'Huhu, da unten! Ich bin Teddy. Du musst Mimo sein.' },
        { who: 'Teddy', text: 'Heute Nacht fährt Schlürfi, der Saugroboter, zum ersten Mal ganz allein. Er saugt alles ein, was auf dem Boden liegt.' },
        { cam: [15.5, 10.5, -11.5], look: [21.8, 8.4, -20.6], who: 'Teddy', text: 'Wir Spielsachen brauchen einen Plan. Hol dir zuerst die Propellermütze oben auf dem Bücherstapel.' },
        { cam: [34, 10, -9], look: [44.5, 5, -21], who: 'Teddy', text: 'Dann klettere auf den Steinturm und halte Ausschau, wo Schlürfi gerade schläft.' },
      ],
      steps: [
        {
          text: 'Hol die Propellermütze vom Bücherstapel.', short: 'Propellermütze holen', goal: 'cap', must: true, done: (c) => c.S.hasCap,
          // gold dust from the start through the gorge, up the letters, over the pencils and the pads
          dust: [[0, 0.8, -1.6], [0, 0.8, -4], [0, 0.8, -6.6], [-1.95, 2.1, -9.6], [-0.65, 3.4, -9.6], [0.65, 4.7, -9.6], [1.3, 4.9, -11], [1.3, 4.9, -16.5],
            [4, 5.4, -21], [5.7, 6.3, -20.8], [9.6, 6.9, -20.9], [13.6, 7.6, -20.8], [18, 8.3, -20.5]],
        },
        {
          text: 'Klettere auf den Steinturm und halte Ausschau.', short: 'Auf den Steinturm', goal: [44.1, 4.58, -20.6], done: reached([44.1, 4.58, -20.6]),
          dust: [[24.4, 8.2, -20.6], [27.6, 8.2, -20.6]],
        },
      ],
    },
    {
      title: 'Der letzte Zug', icon: 'train', mood: 'day',
      scene: [
        { cam: [84, 7, 14], look: [95, 1.4, 28.5], who: 'Teddy', text: 'Siehst du ihn? Da drüben auf dem Spielteppich schläft Schlürfi an seiner Ladestation.' },
        { who: 'Teddy', text: 'Noch schläft er. Wenn es Nacht wird, wacht er auf.' },
        { cam: [45, 5.5, -7], look: [DRIVER.at[0], 2.6, DRIVER.at[2]], who: 'Lokführer', text: 'Tuut tuut! Hier unten am Bahnhof, Mimo!' },
        { who: 'Lokführer', text: 'Meine drei Fahrgäste müssen hoch auf den Schreibtisch, bevor Schlürfi losfährt. Aber sie sind beim Spielen weggelaufen!' },
        { who: 'Lokführer', text: 'Such sie rund um die Gleise und schick sie zum Bahnsteig. Dann tritt auf den Signalknopf, und wir fahren los.' },
      ],
      steps: [
        { text: 'Spring hinunter zum Bahnhof.', short: 'Zum Bahnhof', goal: [42.8, 1.1, -15.3], done: reached([42.8, 1.1, -15.3]) },
        {
          text: 'Such die drei Fahrgäste rund um die Gleise.', short: 'Fahrgäste suchen', count: (c) => [c.train.found(), c.train.total], icon: 'person',
          goal: (c) => c.train.nextLost(), must: true, done: (c) => !c.train || c.train.found() === c.train.total,
        },
        { text: 'Tritt auf den Signalknopf am Bahnsteig.', short: 'Signal stellen', goal: TM ? TM.button : null, must: true, done: (c) => !c.train || c.train.signalSet() },
        { text: 'Spring auf den Zug und fahr mit bis zum Bücherberg.', short: 'Mitfahren bis zum Bücherberg', goal: [53.5, 2.6, 26.5], done: reached([53.5, 2.6, 26.5]) },
        { text: 'Bring die Fahrgäste über den Bücherberg hoch zum Schreibtisch.', short: 'Fahrgäste zum Schreibtisch', goal: [14, 21, 37.5], done: reached([14, 21, 37.5]) },
      ],
    },
    {
      title: 'Licht an', icon: 'lamp', mood: 'evening',
      scene: [
        { cam: [21, 27, 27], look: [14, 21.6, 37.5], who: 'Die Fahrgäste', text: 'Geschafft, wir sind oben! Danke, Mimo!' },
        { cam: [-3, 29, 25], look: [-12.2, 33.5, 33.8], who: 'Lampe', text: 'Es wird schon dunkel. Drück meinen Knopf, dann leuchte ich dir den Weg über den Schreibtisch.' },
        { cam: [9, 33, 21], look: [-1, 30.6, 30.4], who: 'Oma', text: 'Ganz hinten auf der Taschentuchbox startet sonst der Papierflieger. Wir falten dir einen, damit fliegst du bis aufs Bett!' },
        { who: 'Oma', text: 'Dafür brauchen wir drei Blätter Papier. Schau dich auf dem Schreibtisch um, da liegt bestimmt welches herum.' },
      ],
      steps: [
        { text: 'Lauf über den Schreibtisch zur Lampe.', short: 'Zur Lampe', goal: [-12.3, 25.4, 37.7], done: reached([-12.3, 25.4, 37.7]) },
        { text: 'Drück den Knopf der Lampe.', short: 'Lampe anknipsen', goal: [-14.7, 25.4, 40.55], must: true, done: (c) => !!(c.section('s3') && c.section('s3').lamp && c.section('s3').lamp.on) },
        {
          text: 'Sammle drei Blätter Papier für den Papierflieger.', short: 'Blätter sammeln', count: (c) => [c.desk.count(), c.desk.total], icon: 'sheet',
          goal: (c) => c.desk.nextSheet(), must: true, done: (c) => !c.desk || c.desk.count() === c.desk.total,
        },
        { text: 'Klettere hoch auf die Taschentuchbox und steig in den Papierflieger.', short: 'In den Papierflieger', goal: (c) => c.desk.dock(), must: true, done: (c) => !c.desk || (c.desk.folded() && c.desk.boarded()) },
        { text: 'Flieg mit dem Papierflieger zum Bett.', short: 'Ab aufs Bett', goal: [64, 17.05, -25.4], done: reached([64, 17.05, -25.4]) },
      ],
    },
    {
      title: 'Die Kissenburg', icon: 'lights', mood: 'night',
      scene: [
        { cam: [70, 27, -6], look: [85, 21, -22.5], who: 'Die Spielsachen', text: 'Hierher, Mimo! Wir haben uns in der Kissenburg versteckt.' },
        { who: 'Die Spielsachen', text: 'Oben auf der Mauer hängen drei Lampions. Zünde sie alle an, dann leuchtet die Lichterkette.' },
        { cam: [96, 30, -4], look: [85, 23.5, -22], who: 'Die Spielsachen', text: 'Das ist unser Signal für alle Spielsachen im Zimmer: Der Plan geht los!' },
      ],
      steps: [{
        text: 'Klettere auf die Kissenburg und zünde die drei Lampions der Lichterkette an.', short: 'Lampions anzünden', icon: 'bulb', must: true,
        count: (c) => { const l = c.section('s4').lights; return [l.count(), l.total]; },
        goal: (c) => c.section('s4').lights.next(c.p), done: (c) => { const s4 = c.section('s4'); return !s4 || !s4.lights || s4.lights.all(); },
      }],
    },
    {
      title: 'Schlürfis Nachtschicht', icon: 'robot', mood: 'night', bossReady: true,
      scene: [
        { cam: [80, 31, -4], look: [85, 24, -18], who: 'Die Spielsachen', text: 'Die Lichter brennen! Jetzt locken wir Schlürfi gegen unsere Türme.' },
        { cam: [86, 6, 18], look: [95, 1.4, 28.5], who: 'Teddy', text: 'Er wacht gleich auf. Wenn er gegen einen Turm fährt, ist er kurz benommen. Dann spring ihm auf den grünen Knopf!' },
      ],
      steps: [
        { text: 'Schweb hinunter auf den Spielteppich und besiege Schlürfi.', short: 'Schlürfi besiegen', goal: [79, 0, 17], done: (c) => ['beaten', 'done'].includes(c.vacuumState()) },
        { text: 'Hol dir den Pokal. Vorher kannst du auf Schlürfi durchs ganze Zimmer fahren: Spring auf ihn drauf!', short: 'Pokal holen', goal: 'cup', done: () => false },
      ],
    },
  ];

  function makeStory(THREE, k, props, world, level) {
    const { PAL, std, mesh, lit } = k;
    const root = world.root;

    // ---------- The engine driver: a wooden peg figure on the station (room-pegs.js) ----------
    {
      const peg = Room3D.makePeg(THREE, k, Room3D.PEG_LOOKS.driver);
      peg.root.position.set(...DRIVER.at); peg.root.rotation.y = DRIVER.yaw; peg.root.scale.setScalar(DRIVER.size); root.add(peg.root);
      peg.armR.rotation.z = 0.5;                       // one hand a little out, as if he points at the train
      world.addCyl(DRIVER.at[0], DRIVER.at[2], 0.5, DRIVER.at[1] + 2.3, DRIVER.at[1]);
    }

    // ---------- Goal light: a soft column above the goal, a pulsing ring at its foot ----------
    const fade = k.canvasTex(4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(BEAM.r, BEAM.r, BEAM.h, 20, 1, true), k.own(new THREE.MeshBasicMaterial({ color: BEAM.color, map: fade, transparent: true, opacity: BEAM.alpha, depthWrite: false, side: THREE.DoubleSide })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(BEAM.ringR * 0.8, BEAM.ringR, 36), k.own(new THREE.MeshBasicMaterial({ color: BEAM.color, transparent: true, opacity: 0.7, depthWrite: false })));
    ring.rotation.x = -Math.PI / 2; beam.renderOrder = ring.renderOrder = 3; root.add(beam, ring);

    // ---------- Gold dust: every point of every step in one instanced mesh ----------
    const dustList = [];
    MISSIONS.forEach((m, mi) => m.steps.forEach((st, si) => (st.dust || []).forEach((pos) => dustList.push({ pos, mi, si, got: false }))));
    const dust = new THREE.InstancedMesh(k.starGeo, k.starMat, Math.max(1, dustList.length)), dummy = new THREE.Object3D();
    dust.frustumCulled = false; root.add(dust);

    // ---------- State ----------
    let cur = 0, step = 0, scene = null, auto = false, pendingScene = true;
    const ctx = { p: world.p, S: world.S, vacuumState: () => (world.vacuum ? world.vacuum.state() : 'sleep'), section: (id) => level.sections.find((sec) => sec.id === id),
      flagOn: (at) => level.flags.some((f) => f.on && Math.hypot(f.pos[0] - at[0], f.pos[1] - at[1], f.pos[2] - at[2]) < 0.5) };
    ctx.train = Room3D.makeTrainMission ? Room3D.makeTrainMission(THREE, k, world, level) : null;
    ctx.desk = Room3D.makeDeskMission ? Room3D.makeDeskMission(THREE, k, world, level, ctx.train) : null;
    ctx.side = Room3D.makeSideQuests ? Room3D.makeSideQuests(THREE, k, world, level, props) : null;
    const mission = () => MISSIONS[cur] || null;
    const stepNow = () => (mission() ? mission().steps[step] : null);
    function goalPos(st) {
      if (!st) return null;
      if (st.goal === 'cap') return level.cap && !level.cap.got ? level.cap.pos : null;
      if (st.goal === 'cup') return level.goal.active ? level.goal.pos : null;
      if (typeof st.goal === 'function') { try { return st.goal(ctx); } catch (_) { return null; } }   // a helper may be missing
      return st.goal;
    }
    // a step's text may change while it runs (a count); announce() tells the host whenever it does
    const textOf = (st) => { if (typeof st.text !== 'function') return st.text; try { return st.text(ctx); } catch (_) { return ''; } };
    let shownText = null, gapT = 0;
    const countOf = (st) => { if (!st || !st.count) return null; try { return st.count(ctx); } catch (_) { return null; } };
    const keyOf = (st) => (st ? textOf(st) + '|' + (countOf(st) || []).join('/') : null);
    // phase: 'step' (the running step, also after a count changed), 'start' (a mission begins), 'done' (a mission is finished)
    function announce(phase) {
      const m = mission(), st = stepNow();
      shownText = keyOf(st);
      if (!m) { world.mission(null); return; }
      world.mission({ phase: phase || 'step', n: cur + 1, of: MISSIONS.length, title: m.title, icon: m.icon,
        text: st ? textOf(st) : '', short: st ? st.short || textOf(st) : '', count: countOf(st), countIcon: st && st.icon, steps: m.steps.length, step });
    }
    // the fairy lights of the pillow fort burn once mission 4 is done
    function lightsFor(n) { const s4 = ctx.section('s4'); if (s4 && s4.lights) s4.lights.setAll(n > 3); }
    function allowBoss() { world.bossReady = MISSIONS.slice(0, cur + 1).some((m) => m.bossReady); }

    // ---------- Scenes ----------
    function showLine() {
      const line = scene.lines[scene.i];
      if (line.cam) world.shot({ pos: line.cam, look: line.look });
      const who = SPEAKERS[line.who] || {};
      world.talk({ who: line.who, text: line.text, last: scene.i === scene.lines.length - 1, face: who.face, at: who.at });
      scene.t = 0;
    }
    function startScene(lines) {
      if (!lines || !lines.length || auto) { announce(); return; }
      scene = { lines, i: 0, t: 0 }; world.S.state = 'talk'; world.S.t = 0;
      showLine();
    }
    function endScene() {
      scene = null; world.talk(null); world.shot(null);
      if (world.S.state === 'talk') world.S.state = 'play';
      announce();
      // the camera turns towards the new goal, unless gold dust already leads along the camera's way
      const st = stepNow(), at = goalPos(st);
      if (at && !(st.dust && st.dust.length) && Math.hypot(world.p.x - at[0], world.p.z - at[2]) > BEAM.near) world.face(at);
    }
    function stepScene(dt) {
      const input = world.input;
      scene.t += dt;
      if (!input.jumpQueued) return;
      input.jumpQueued = false;
      if (scene.t < LINE_MIN) return;
      scene.i++;
      if (scene.i >= scene.lines.length) endScene(); else showLine();
    }
    function begin(index) {
      cur = index; step = 0; gapT = 0; allowBoss();
      if (mission() && !auto) announce('start');
      startScene(mission() && mission().scene);
    }

    // ---------- Each step of the game ----------
    function update(dt) {
      const S = world.S;
      if (ctx.train) ctx.train.update(dt, cur, step);
      if (ctx.desk) ctx.desk.update(dt);
      if (ctx.side && !scene) ctx.side.update(dt);
      if (scene) { stepScene(dt); return; }
      if (S.state !== 'play') return;
      if (pendingScene) { pendingScene = false; begin(cur); if (scene) return; }
      if (gapT > 0) { gapT -= dt; if (gapT <= 0) begin(cur + 1); return; }
      // Mimo may take his own way: reaching a later goal of the mission counts the steps before it as done,
      // except a step marked `must` (the cap) that is still open
      const m = mission();
      if (m) {
        let last = -1;
        for (let i = step; i < m.steps.length; i++) {
          if (m.steps[i].done(ctx)) last = i;
          else if (m.steps[i].must) break;
        }
        if (last >= 0) {
          step = last + 1;
          if (step < m.steps.length) announce();
          else {
            world.sticker('m' + (cur + 1));                // every finished mission gives its sticker
            if (auto || cur + 1 >= MISSIONS.length) begin(cur + 1);
            else { announce('done'); gapT = GAP; }         // the next mission starts after the stamp
          }
        }
        else if (stepNow() && keyOf(stepNow()) !== shownText) announce();
      }
      for (const d of dustList) {
        if (d.got || d.mi !== cur || d.si !== step || !near(world.p, d.pos, DUST.r)) continue;
        d.got = true; world.sfx.dust(); world.burst(d.pos[0], d.pos[1], d.pos[2], 5, [PAL.gold, PAL.white], 1.6, { life: 0.35 });
      }
    }
    // Drawing: the goal light and the dust of the running step
    function draw(t) {
      const p = world.p, at = goalPos(stepNow()), show = !!at && (!!scene || Math.hypot(p.x - at[0], p.z - at[2]) > BEAM.near);
      beam.visible = ring.visible = show;
      if (show) {
        beam.position.set(at[0], at[1] + BEAM.h / 2 - 0.4, at[2]);
        ring.position.set(at[0], at[1] + 0.12, at[2]);
        const pulse = (t * 0.8) % 1; ring.scale.setScalar(0.7 + pulse * 0.8); ring.material.opacity = 0.75 * (1 - pulse);
      }
      const yaw = -world.camYaw();
      dustList.forEach((d, i) => {
        const on = !d.got && d.mi === cur && d.si === step;
        dummy.position.set(d.pos[0], d.pos[1] + Math.sin(t * 2.4 + i) * DUST.bob, d.pos[2]); dummy.rotation.set(0, yaw + t * 1.5, 0);
        dummy.scale.setScalar(on ? DUST.size : 0); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix);
      });
      dust.instanceMatrix.needsUpdate = true;
    }
    function reset() {
      cur = 0; step = 0; scene = null; pendingScene = true; gapT = 0;
      for (const d of dustList) d.got = false;
      if (ctx.train) ctx.train.reset();
      if (ctx.desk) ctx.desk.reset();
      if (ctx.side) ctx.side.reset();
      lightsFor(0);
      world.talk(null); world.shot(null); allowBoss(); announce();
    }
    // Test hook: missions before `n` count as done, no scene plays
    function skipTo(n) {
      cur = Math.max(0, Math.min(n, MISSIONS.length - 1)); step = 0; scene = null; pendingScene = false; gapT = 0;
      if (ctx.train) ctx.train.skipTo(cur);
      if (ctx.desk) ctx.desk.skipTo(cur);
      lightsFor(cur);
      world.talk(null); world.shot(null); allowBoss(); announce();
    }
    return {
      update, draw, reset, skipTo,
      mood: () => (mission() || MISSIONS[MISSIONS.length - 1]).mood,
      auto: (on) => { auto = !!on; },
      talking: () => !!scene,
      goal: () => (scene || gapT > 0 ? null : goalPos(stepNow())),
      state: () => ({ mission: cur, step, scene: scene ? scene.i : null, bossReady: !!world.bossReady }),
      side: () => (ctx.side ? ctx.side.state() : null),
      desk: () => (ctx.desk ? { sheets: ctx.desk.count(), folded: ctx.desk.folded() } : null),
      train: () => (ctx.train ? { found: ctx.train.found(), signal: ctx.train.signalSet(), phase: ctx.train.phase(), people: ctx.train.where() } : null),
    };
  }

  Room3D.MISSIONS = MISSIONS;
  Room3D.makeStory = makeStory;
})();
