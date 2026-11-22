/* Mimo hüpft · Kinderzimmer (3D) · mission 3 "Licht an": three sheets for the paper plane
   The paper plane on the tissue box is not there yet. Three sheets of paper lie about the desk: on the
   notebook, on the first stack of books and behind the lamp. Once Mimo has all three, the
   passengers from mission 2 hop to the tissue box, paper whirls up and the plane folds itself into being.
   The story (room-story.js) tells this file which mission runs and asks how far things are.
   y is up; see README.md for the room's layout. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const DESK_MISSION = {
    sheets: [[7.2, 21.14, 30.0], [-1.8, 24.6, 41.8], [-16.0, 25.4, 42.75]],  // notebook, first books, behind the lamp
    // what Oma calls out when the last sheet is found (the count itself shows in the host's mission badge)
    done: { who: 'Oma', face: 'granny', at: [0.6, 22.7, 34.2], text: 'Alle drei Blätter! Schau mal, wir falten dir den Flieger.' },
  };
  const SHEET = { w: 1.3, d: 0.95, curl: 0.12, lift: 0.45, bob: 0.1, spin: 0.9, reach: 1.25, dy: 1.4 };
  const FOLD_DELAY = 1.9;                               // seconds from the last sheet until the plane appears (the passengers hop first)
  const MISSION = 2;                                    // index of "Licht an" in Room3D.MISSIONS: after it the plane is simply there

  function makeDeskMission(THREE, k, world, level, train) {
    const { PAL } = k, root = world.root, D = DESK_MISSION;
    const s3 = level.sections.find((sec) => sec.id === 's3');
    if (!s3 || !s3.planeFold) return null;

    // ---------- Sheets: the plane's blue squared paper, slightly curled, with a soft white glow ----------
    const tex = k.canvasTex(128, 96, (g, W, H) => {
      g.fillStyle = PAL.blue; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2;
      for (let v = 0; v <= W; v += 12) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, H); g.moveTo(0, v); g.lineTo(W, v); g.stroke(); }
    });
    const geo = new THREE.PlaneGeometry(SHEET.w, SHEET.d, 8, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / SHEET.w + 0.5) * Math.PI) * SHEET.curl);
    geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
    const mat = k.texStd(tex, { roughness: 0.9, side: THREE.DoubleSide });
    const sheets = D.sheets.map((at, i) => {
      const g = new THREE.Group(); g.position.set(...at); root.add(g);
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
      g.add(k.halo('#FFFFFF', 1.9, 0.35));
      return { at, g, got: false, seed: i * 1.9 };
    });

    const st = { foldT: -1 };
    const count = () => sheets.filter((sh) => sh.got).length;
    function nextSheet() {
      const p = world.p;
      let best = null, bd = Infinity;
      for (const sh of sheets) if (!sh.got) { const d = Math.hypot(sh.at[0] - p.x, sh.at[2] - p.z); if (d < bd) { bd = d; best = sh.at; } }
      return best;
    }
    function setAll(got) {
      for (const sh of sheets) { sh.got = got; sh.g.visible = !got; }
    }
    function reset() { setAll(false); st.foldT = -1; s3.planeFold(false, true); }
    // missions before n are done: from mission 4 on the plane is there and the sheets are gone
    function skipTo(n) {
      reset();
      if (n > MISSION) { setAll(true); s3.planeFold(true, true); }
    }

    function update(dt) {
      const p = world.p, t = world.time();
      for (const sh of sheets) {
        if (sh.got) continue;
        sh.g.position.y = sh.at[1] + SHEET.lift + Math.sin(t * 2 + sh.seed) * SHEET.bob;
        sh.g.rotation.y = t * SHEET.spin + sh.seed;
        if (world.S.state !== 'play' || Math.hypot(sh.at[0] - p.x, sh.at[2] - p.z) > SHEET.reach || Math.abs(sh.at[1] - p.y) > SHEET.dy) continue;
        sh.got = true; sh.g.visible = false;
        const n = count();
        world.sfx.yay(); world.burst(sh.at[0], sh.at[1] + 0.6, sh.at[2], 14, [PAL.white, PAL.blue], 2.2, { life: 0.6 });
        if (n === sheets.length) { st.foldT = 0; if (train) train.toBox(); world.say(D.done); }
      }
      // the passengers hop over, then paper whirls up at the tissue box and the plane is there
      if (st.foldT >= 0) {
        st.foldT += dt;
        if (st.foldT >= FOLD_DELAY) {
          st.foldT = -1; s3.planeFold(true);
          const [x, y, z] = s3.planeDock;
          world.burst(x, y + 0.5, z, 30, [PAL.white, PAL.blue], 3.2, { life: 0.9 }); world.sfx.yay();
        }
      }
    }

    reset();
    return {
      update, reset, skipTo, count, nextSheet,
      total: sheets.length,
      folded: () => s3.planeFolded(),
      boarded: () => s3.plane.mode !== 'dock',
      dock: () => s3.planeDock,
    };
  }

  Room3D.DESK_MISSION = DESK_MISSION;
  Room3D.makeDeskMission = makeDeskMission;
})();
