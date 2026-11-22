/* Mimo hüpft · Kinderzimmer (3D) · section 4 "Kissenburg"
   Night. Mimo lands on the bed, climbs a staircase of cushions onto the walls of a pillow fort and
   glides down to the floor in front of the bed, where the vacuum robot wakes up (room-boss.js).
   y is up. On the bed the way leads towards +x, the glide and the arena lie towards +z. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const BED_TOP = 17.05, CUSHION = 1.4, BLOCK = 1.3;
  const LAY = {
    // stairs of stacked cushions: [x, z, how many cushions high]
    stairs: [[68.5, -22, 1], [72, -21, 2], [75.4, -22.3, 3], [77.6, -20.6, 4]],
    stairSize: 3.3,
    fort: { x0: 79, x1: 91, z0: -30, z1: -15, thick: 2, tall: 6.5, gap: [84, 86] },   // gap: hidden way in, on the wall side
    pillow: { x0: 92.8, x1: 101.2, z0: -30.2, z1: -13.8, top: 19.2, bounce: 22 },      // the bed's own pillow is a trampoline
    arena: { x0: 60, x1: 100, z0: 3, z1: 33, dock: [95, 28.5], goal: [79, 0, 17] },
    // block towers the robot can be lured into: [x of the low end, z, direction in which the stairs rise].
    // The low end always faces the middle of the arena, so Mimo reaches the stairs without a detour.
    towers: [[68.6, 9, -1], [90, 10, 1], [77.4, 27.5, 1]],
    lights: 34,
    // paper lanterns of the fairy lights on three corners of the wall top; each one lights its part of the chain
    lanterns: [[80, -28.6, '#E25B45'], [90, -28.6, '#F4BF3A'], [90, -16.4, '#4686D2']],
  };
  const LANTERN = { reach: 1.4, dy: 1.5, pole: 1.3, r: 0.55, ripple: 0.9 };
  const BULB_OFF = '#5E5868', BULB_ON = '#FFE3A1';
  const WALL_TOP = BED_TOP + LAY.fort.tall;
  const CUSHION_COLORS = ['#E8B04A', '#5E9CC9', '#E07A5F', '#9C86CF', '#6DB58A'];

  const CAM_NODES = [
    // y: these run on top of the bed and do not count for Mimo on the floor beside it
    { x: 61, z: -22, yaw: Math.PI / 2, dist: 8, h: 3.8, look: 0.9, y: BED_TOP },
    { x: 77, z: -21.5, yaw: Math.PI / 2, dist: 8.4, h: 4.2, look: 0.9, y: BED_TOP + 3 },
    { x: 80, z: -18, yaw: 2.2, dist: 9, h: 4.6, look: 0.6, y: BED_TOP + 6 },
    { x: 85, z: -16, yaw: Math.PI, dist: 9.5, h: 4.8, look: 0.2, y: BED_TOP + 6 },
    { x: 85, z: -6, yaw: Math.PI, dist: 10, h: 5, look: 0, y: BED_TOP - 2 },
    // one fixed overview for the whole fight
    { x: 79, z: 5, yaw: Math.PI / 2, dist: 14, h: 9, look: 0, area: 21 },
    { x: 79, z: 31, yaw: Math.PI / 2, dist: 14, h: 9, look: 0, area: 21 },
  ];

  // Play mat seen from above: a ring road with a crossing, meadows, a pond and a few house plots
  function playMat(k) {
    return k.canvasTex(1024, 768, (g, W, H) => {
      const road = '#727887', line = '#F1ECDD', ROAD_W = 92;
      g.fillStyle = '#8FBF9B'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#F1ECDD'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      const ring = () => { g.beginPath(); g.roundRect(110, 110, W - 220, H - 220, 120); };
      g.strokeStyle = road; g.lineWidth = ROAD_W; ring(); g.stroke();
      g.beginPath(); g.moveTo(W / 2, 110); g.lineTo(W / 2, H - 110); g.stroke();
      g.strokeStyle = line; g.lineWidth = 5; g.setLineDash([26, 22]); ring(); g.stroke();
      g.beginPath(); g.moveTo(W / 2, 170); g.lineTo(W / 2, H - 170); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#7DB3D0'; g.beginPath(); g.ellipse(330, 384, 96, 66, 0, 0, Math.PI * 2); g.fill();
      [[640, 250, '#E9C46A'], [770, 250, '#E58F8F'], [640, 440, '#C9A5C9'], [770, 440, '#E7A27C']].forEach(([x, y, c]) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, 96, 96, 14); g.fill(); });
      g.fillStyle = '#6FA77F'; for (const [x, y] of [[230, 250], [420, 250], [250, 520], [410, 500]]) { g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill(); }
    });
  }

  function build(THREE, k, props, world) {
    const { PAL, TOY_COLORS, std, mesh, lit, roundedBox, rng } = k;
    const { addBox, addCamBlock, root } = world;
    const r = rng(404);
    const cloth = (color) => std(color, { roughness: 0.92 });

    // ---------- Stairs of cushions ----------
    LAY.stairs.forEach(([x, z, n], i) => {
      for (let j = 0; j < n; j++) {
        const c = lit(mesh(roundedBox(LAY.stairSize, CUSHION, LAY.stairSize, 0.5, 4), cloth(CUSHION_COLORS[(i + j) % CUSHION_COLORS.length]), x + (r() - 0.5) * 0.2, BED_TOP + CUSHION * (j + 0.5), z + (r() - 0.5) * 0.2, root));
        c.rotation.y = (r() - 0.5) * 0.35;
      }
      addBox(x, BED_TOP, BED_TOP + n * CUSHION, z, LAY.stairSize / 2 - 0.1, LAY.stairSize / 2 - 0.1);
    });

    // ---------- Pillow fort ----------
    const f = LAY.fort;
    {
      const wall = (x0, x1, z0, z1, color) => {
        const w = x1 - x0, d = z1 - z0, p = lit(mesh(roundedBox(w, f.tall, d, 0.85, 5), cloth(color), (x0 + x1) / 2, BED_TOP + f.tall / 2, (z0 + z1) / 2, root));
        p.rotation.y = (r() - 0.5) * 0.03;
        addBox((x0 + x1) / 2, BED_TOP, WALL_TOP, (z0 + z1) / 2, w / 2, d / 2);
      };
      const zm = (f.z0 + f.z1) / 2, xi0 = f.x0 + f.thick, xi1 = f.x1 - f.thick;
      wall(f.x0, xi0, f.z0, zm, CUSHION_COLORS[1]); wall(f.x0, xi0, zm, f.z1, CUSHION_COLORS[3]);
      wall(xi1, f.x1, f.z0, zm, CUSHION_COLORS[2]); wall(xi1, f.x1, zm, f.z1, CUSHION_COLORS[0]);
      wall(xi0, xi1, f.z1 - f.thick, f.z1, CUSHION_COLORS[4]);
      wall(xi0, f.gap[0], f.z0, f.z0 + f.thick, CUSHION_COLORS[0]); wall(f.gap[1], xi1, f.z0, f.z0 + f.thick, CUSHION_COLORS[1]);
      addCamBlock(f.x0, f.x1, BED_TOP, WALL_TOP, f.z0, f.z1);
      // a sheet as roof: it sags, and it is not solid (whoever steps on it lands inside)
      const sheet = new THREE.PlaneGeometry(xi1 - xi0 + 0.6, f.z1 - f.z0 - 2 * f.thick + 0.6, 12, 12), pos = sheet.attributes.position;
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / (xi1 - xi0), v = pos.getY(i) / (f.z1 - f.z0); pos.setZ(i, -(1 - 4 * u * u) * (1 - 4 * v * v) * 0.9); }
      sheet.computeVertexNormals();
      const roof = mesh(sheet, k.own(new THREE.MeshLambertMaterial({ color: new THREE.Color('#E9C9C2'), side: THREE.DoubleSide })), (xi0 + xi1) / 2, WALL_TOP - 0.35, zm, root);
      roof.rotation.x = -Math.PI / 2; roof.receiveShadow = true;
    }
    // fairy lights along the top of the walls: dark until Mimo lights the three paper lanterns (mission 4).
    // Every bulb belongs to the lantern nearest to it; lighting a lantern sends a ripple of light along its bulbs.
    const chain = { bulbs: [], glows: [], lanterns: [] };
    {
      const n = LAY.lights, mat = k.own(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), mat, n), d = new THREE.Object3D(), off = new THREE.Color(BULB_OFF);
      const w = f.x1 - f.x0, dz = f.z1 - f.z0, per = 2 * (w + dz);
      for (let i = 0; i < n; i++) {
        let s = per * i / n, x, z;
        if (s < w) { x = f.x0 + s; z = f.z1 + 0.15; } else if ((s -= w) < dz) { x = f.x1 + 0.15; z = f.z1 - s; } else if ((s -= dz) < w) { x = f.x1 - s; z = f.z0 - 0.15; } else { x = f.x0 - 0.15; z = f.z0 + (s - w); }
        d.position.set(x, WALL_TOP - 0.5 - Math.abs(Math.sin(i * 1.9)) * 0.5, z); d.updateMatrix(); bulbs.setMatrixAt(i, d.matrix); bulbs.setColorAt(i, off);
        let owner = 0, best = Infinity;
        LAY.lanterns.forEach(([lx, lz], li) => { const dd = Math.hypot(lx - x, lz - z); if (dd < best) { best = dd; owner = li; } });
        const glow = i % 4 === 0 ? k.halo('#FFD98A', 1.6, 0.5) : null;
        if (glow) { glow.position.copy(d.position); glow.visible = false; root.add(glow); }
        chain.bulbs.push({ owner, dist: best, on: 0, glow });
      }
      root.add(bulbs); chain.mesh = bulbs;
      // the lanterns: a pole on the wall top and a round paper lantern with ribs, dark until lit
      for (const [x, z, color] of LAY.lanterns) {
        lit(mesh(new THREE.CylinderGeometry(0.07, 0.09, LANTERN.pole, 8), std('#7A4E2D', { roughness: 0.7 }), x, WALL_TOP + LANTERN.pole / 2, z, root));
        const paper = k.own(new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.8, emissive: new THREE.Color(color), emissiveIntensity: 0 }));
        const ball = mesh(new THREE.SphereGeometry(LANTERN.r, 18, 12), paper, x, WALL_TOP + LANTERN.pole + LANTERN.r * 0.7, z, root); ball.scale.y = 0.85; ball.castShadow = true;
        const ribs = new THREE.Mesh(new THREE.SphereGeometry(LANTERN.r * 1.01, 8, 6), k.own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#3A3850'), wireframe: true, transparent: true, opacity: 0.25 })));
        ball.add(ribs);
        const halo = k.halo(color, 3.2, 0.7); halo.position.copy(ball.position); halo.visible = false; root.add(halo);
        chain.lanterns.push({ x, z, ball, paper, halo, lit: false, t: 0 });
      }
    }
    const lights = {
      total: LAY.lanterns.length,
      count: () => chain.lanterns.filter((l) => l.lit).length,
      all: () => chain.lanterns.every((l) => l.lit),
      next: (p) => { let best = null, bd = Infinity; for (const l of chain.lanterns) if (!l.lit) { const d = Math.hypot(l.x - p.x, l.z - p.z); if (d < bd) { bd = d; best = [l.x, WALL_TOP, l.z]; } } return best; },
      // instant: no ripple (a restart or a jump in the story)
      setAll(on) { for (const l of chain.lanterns) { l.lit = on; l.t = on ? 99 : 0; } for (const b of chain.bulbs) b.on = on ? 1 : 0; paintChain(); },
    };
    const onC = new THREE.Color(BULB_ON), offC = new THREE.Color(BULB_OFF), tmpC = new THREE.Color();
    function paintChain() {
      chain.bulbs.forEach((b, i) => { chain.mesh.setColorAt(i, tmpC.copy(offC).lerp(onC, b.on)); if (b.glow) b.glow.visible = b.on > 0.5; });
      chain.mesh.instanceColor.needsUpdate = true;
      for (const l of chain.lanterns) { const k2 = Math.min(1, l.t * 3); l.paper.emissiveIntensity = k2 * 0.9; l.halo.visible = k2 > 0.05; }
    }
    function stepChain(dt) {
      const p = world.p;
      let changed = false;
      for (const [li, l] of chain.lanterns.entries()) {
        if (!l.lit && world.S.state === 'play' && Math.hypot(l.x - p.x, l.z - p.z) < LANTERN.reach && Math.abs(p.y - WALL_TOP) < LANTERN.dy) {
          l.lit = true; l.t = 0; world.sfx.yay();
          world.burst(l.x, WALL_TOP + LANTERN.pole + 0.4, l.z, 18, ['#FFE3A1', '#FFFFFF', LAY.lanterns[li][2]], 2.6, { life: 0.7 });
        }
        if (!l.lit || l.t > 50) continue;
        l.t += dt; changed = true;
        // the light runs along the chain away from the lantern
        for (const b of chain.bulbs) if (b.owner === li && b.on < 1 && l.t * 9 > b.dist) b.on = Math.min(1, b.on + dt / 0.15);
        if (l.t > LANTERN.ripple + 2) l.t = 99;
      }
      if (changed) paintChain();
    }
    // the bed's pillow: soft enough to bounce up to the headboard
    { const p = LAY.pillow; addBox((p.x0 + p.x1) / 2, BED_TOP, p.top, (p.z0 + p.z1) / 2, (p.x1 - p.x0) / 2, (p.z1 - p.z0) / 2, { kind: 'bounce', bounce: p.bounce }); }

    // ---------- Arena on the floor: a play mat with streets, and three block towers with stairs ----------
    const a = LAY.arena;
    {
      const mat = mesh(new THREE.PlaneGeometry(a.x1 - a.x0 + 2, a.z1 - a.z0 + 2), k.texStd(playMat(k), { roughness: 0.95, envMapIntensity: 0.15 }), (a.x0 + a.x1) / 2, 0.06, (a.z0 + a.z1) / 2, root);
      mat.rotation.x = -Math.PI / 2; mat.receiveShadow = true;
    }
    const arena = {
      x0: a.x0, x1: a.x1, z0: a.z0, z1: a.z1, cx: (a.x0 + a.x1) / 2, cz: (a.z0 + a.z1) / 2, dock: a.dock, goal: a.goal,
      inside: (p) => p.x > a.x0 && p.x < a.x1 && p.z > a.z0 && p.z < a.z1 && p.y < 5,
      towers: LAY.towers.map(([x, z, dir], ti) => {
        const tw = { alive: true, half: BLOCK * 0.6, cols: [], blocks: [], colliders: [], fall: 0 };
        for (let c = 0; c < 3; c++) {
          const cx = x + dir * c * BLOCK;
          tw.cols.push([cx, z]);
          for (let n = 0; n <= c; n++) {
            const b = props.block('ABCDEFGHK'[(ti * 3 + c + n) % 9], TOY_COLORS[(ti + c + n) % TOY_COLORS.length], BLOCK, n === c);
            b.position.set(cx, BLOCK * (n + 0.5), z); root.add(b);
            tw.blocks.push({ mesh: b, home: [cx, BLOCK * (n + 0.5), z], away: [(r() - 0.5) * 5, (r() - 0.5) * 5, (r() - 0.5) * 3] });
          }
          tw.colliders.push(addBox(cx, 0, BLOCK * (c + 1), z, BLOCK / 2, BLOCK / 2));
        }
        tw.top = [x + dir * 2 * BLOCK, BLOCK * 3, z];
        tw.crumble = () => { tw.alive = false; tw.fall = 0.001; for (const c of tw.colliders) c.off = true; };
        return tw;
      }),
    };
    // charging dock by the wall
    lit(mesh(roundedBox(4.2, 2.6, 1.6, 0.4, 3), std('#F6F6F2', { roughness: 0.4 }), a.dock[0] + 2, 1.3, a.z1 + 0.6, root));
    const vacuum = Room3D.makeVacuum(THREE, k, world, arena);
    world.vacuum = vacuum; world.arena = arena;

    const FALL_TIME = 0.9;
    function update(dt, t) {
      vacuum.update(dt, t);
      stepChain(dt);
      for (const tw of arena.towers) {
        if (!tw.fall || tw.fall >= 1) continue;
        tw.fall = Math.min(1, tw.fall + dt / FALL_TIME);
        for (const b of tw.blocks) {
          b.mesh.position.set(b.home[0] + b.away[0] * tw.fall, Math.max(BLOCK / 2, b.home[1] * (1 - tw.fall * tw.fall)), b.home[2] + b.away[1] * tw.fall);
          b.mesh.rotation.set(b.away[2] * tw.fall, b.away[0] * tw.fall, b.away[1] * tw.fall); b.mesh.scale.setScalar(1 - tw.fall * 0.45);
        }
      }
    }
    function reset() {
      lights.setAll(false);
      for (const tw of arena.towers) {
        tw.alive = true; tw.fall = 0;
        for (const c of tw.colliders) c.off = false;
        for (const b of tw.blocks) { b.mesh.position.set(...b.home); b.mesh.rotation.set(0, 0, 0); b.mesh.scale.setScalar(1); }
      }
      vacuum.reset();
    }
    const flags = [[85, WALL_TOP, -16], [79, 0, 5.5]];
    const stars = [[68.5, BED_TOP + CUSHION + 1.1, -22], [75.4, BED_TOP + 3 * CUSHION + 1.1, -22.3], [80, WALL_TOP + 1.1, -25], [89.5, WALL_TOP + 1.1, -16], [85, 19.5, -7]];
    // inside the fort (through the gap on the wall side, or through the roof) and on top of the headboard (off the pillow)
    const secrets = [[85, BED_TOP + 1.2, -23], [104.9, 25.2, -22]];
    paintChain();
    return { camNodes: CAM_NODES, flags, stars, secrets, update, reset, lights };
  }

  Room3D.sections = Room3D.sections || [];
  Room3D.sections.push({ id: 's4', name: 'Kissenburg', mood: 'night', build });
})();
