/* Mimo hüpft · Kinderzimmer (3D) · world
   Puts the sections together into one level: one long camera rail, and the things every section has in
   the same form (flags, stars, secrets, the goal). A section only says where they are.
   See README.md in this folder for how to write a section. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});
  const FLAG_OFF = '#B9B5C4', WALL = 0.85;

  function buildLevel(THREE, k, props, world) {
    const { PAL, mesh } = k, root = world.root;
    const defs = Room3D.sections || [];
    if (!defs.length) throw new Error('Room3D.sections is empty');
    // buildMs: how long each section took to build, for finding slow starts (see dbg.timing())
    const sections = defs.map((def, index) => { const t0 = performance.now(), built = def.build(THREE, k, props, world); return Object.assign({ id: def.id, name: def.name, mood: def.mood || 'day', index, buildMs: Math.round(performance.now() - t0) }, built); });
    const flags = [], stars = [], secrets = [], camNodes = [];
    for (const sec of sections) {
      for (const node of sec.camNodes || []) camNodes.push(node);
      for (const pos of sec.flags || []) {
        const f = props.checkFlag(); f.root.position.set(...pos); root.add(f.root);
        flags.push({ pos, cloth: f.cloth, on: false, section: sec.index });
      }
      for (const pos of sec.stars || []) {
        const m = new THREE.Mesh(k.starGeo, k.starMat); m.position.set(...pos); m.scale.setScalar(1.25); m.castShadow = true; root.add(m);
        m.add(k.halo(PAL.gold, 1.5, 0.4));
        stars.push({ pos, mesh: m, got: false, seed: stars.length * 1.7 });
      }
      // a secret is a big star in a ring; found ones stay away on later visits
      for (const pos of sec.secrets || []) {
        const g = new THREE.Group(); g.position.set(...pos); root.add(g);
        const star = new THREE.Mesh(k.starGeo, k.starMat); star.scale.setScalar(1.7); g.add(star);
        const ring = mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 40), k.starMat, 0, 0, 0, g);
        g.add(k.halo(PAL.gold, 2.2, 0.35));
        secrets.push({ pos, group: g, ring, got: false, seed: secrets.length * 2.3 });
      }
    }
    // The goal cup is hidden until a section puts it somewhere (the last one does, after its boss)
    const goal = Object.assign(props.trophy(), { pos: [0, 0, 0], active: false });
    goal.root.visible = false; root.add(goal.root);
    world.setGoal = (pos) => { goal.pos = pos; goal.root.position.set(...pos); goal.root.visible = goal.active = true; };
    const cap = sections.map((sec) => sec.cap).find(Boolean) || null;

    function update(dt, t, camYaw) {
      for (const sec of sections) if (sec.update) sec.update(dt, t);
      for (const s of stars) { s.mesh.visible = !s.got; s.mesh.position.y = s.pos[1] + Math.sin(t * 2 + s.seed) * 0.12; s.mesh.rotation.y = -camYaw + Math.sin(t * 1.3 + s.seed) * 0.5; }
      for (const s of secrets) { s.group.visible = !s.got; s.group.position.y = s.pos[1] + Math.sin(t * 1.6 + s.seed) * 0.1; s.group.rotation.y = -camYaw + Math.sin(t + s.seed) * 0.4; s.ring.rotation.x = t * 1.4; }
      if (goal.active) goal.star.rotation.y = -camYaw + Math.sin(t * 1.6) * 0.6;
    }
    function reset(foundSecrets) {
      for (const s of stars) s.got = false;
      secrets.forEach((s, i) => { s.got = !!(foundSecrets && foundSecrets.includes(i)); });
      for (const f of flags) { f.on = false; f.cloth.material.color.set(FLAG_OFF); }
      goal.active = false; goal.root.visible = false;
      for (const sec of sections) if (sec.reset) sec.reset();
    }
    const R = Room3D.ROOM;
    const bounds = { x0: R.x0 + WALL, x1: R.x1 - WALL, z0: R.z0 + WALL, z1: R.z1 - WALL };
    return { sections, start: sections[0].start, intro: sections[0].intro, bounds, flags, stars, secrets, cap, goal, camNodes, update, reset };
  }

  Room3D.buildLevel = buildLevel;
})();
