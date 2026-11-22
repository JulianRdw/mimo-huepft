/* Mimo hüpft · Kinderzimmer (3D) · toys
   Everything Mimo can walk on, collect or bump into. Builders only make meshes;
   the level file places them and adds the colliders. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const STUD = 0.6, BRICK_H = 0.75;       // stud pitch and height of one brick layer
  const PENCIL_R = 0.3, PENCIL_TOP = PENCIL_R * 0.866;
  const TRACK_H = 0.1, RULER_H = 0.12;

  function makeProps(THREE, k) {
    const { PAL, std, texStd, mesh, roundedBox, ribbon, ribbonEdge, inked, lit, tex, rng } = k;
    const group = (parent) => { const g = new THREE.Group(); if (parent) parent.add(g); return g; };

    // ---------- Wooden letter block (origin in the centre) ----------
    const faceMats = new Map();
    function faceMat(ch, color, painted) {
      const key = ch + color + (painted ? 'p' : '');
      if (!faceMats.has(key)) faceMats.set(key, texStd(tex.letter(ch, color, painted), { roughness: painted ? 0.5 : 0.75 }));
      return faceMats.get(key);
    }
    // painted: the whole block is lacquered in its colour, with a cream letter
    // The five picture faces of a block (four sides and the top) as one geometry, shared by all blocks of a size
    const faceGeos = new Map();
    function faceGeo(S) {
      if (!faceGeos.has(S)) {
        const off = S / 2 + 0.004, plane = new THREE.PlaneGeometry(S * 0.84, S * 0.84), at = (rx, ry, x, y, z) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0)).setPosition(x, y, z);
        faceGeos.set(S, k.mergeGeos([[plane, at(0, 0, 0, 0, off)], [plane, at(0, Math.PI / 2, off, 0, 0)], [plane, at(0, Math.PI, 0, 0, -off)], [plane, at(0, -Math.PI / 2, -off, 0, 0)], [plane, at(-Math.PI / 2, 0, 0, off, 0)]]));
      }
      return faceGeos.get(S);
    }
    function block(ch, color, size, painted) {
      const S = size || 1.3, g = group();
      lit(mesh(roundedBox(S, S, S, S * 0.08), painted ? std(color, { roughness: 0.5 }) : std(PAL.block, { roughness: 0.75 }), 0, 0, 0, g));
      mesh(faceGeo(S), faceMat(ch, color, painted), 0, 0, 0, g).receiveShadow = true;
      return g;
    }

    // ---------- Coloured pencil, lying along z with the tip towards -z ----------
    function pencil(color, len) {
      const g = group(), r = PENCIL_R, tip = 0.9, cap = 0.25, bodyLen = len - tip - cap;
      const hex = (rTop, rBottom, h) => { const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 6); geo.rotateY(Math.PI / 6); geo.rotateX(Math.PI / 2); return geo; };
      const paint = std(color, { roughness: 0.35, flatShading: true });
      lit(mesh(hex(r, r, bodyLen), paint, 0, 0, (tip - cap) / 2, g));
      lit(mesh(hex(r, r * 0.32, tip * 0.7), std('#E8C99A', { roughness: 0.8, flatShading: true }), 0, 0, -len / 2 + tip * 0.65, g));
      mesh(hex(r * 0.32, 0.02, tip * 0.3), paint, 0, 0, -len / 2 + tip * 0.15, g);
      mesh(hex(r * 1.02, r * 1.02, cap), std(k.shade(color, 0.6), { roughness: 0.5, flatShading: true }), 0, 0, len / 2 - cap / 2, g);
      return g;
    }

    // ---------- Building bricks: collected first, then drawn as two instanced meshes ----------
    function brickSet() {
      const bodies = [], studs = [];
      function add(x, y, z, sx, sz, color, withStuds) {
        bodies.push({ x: x + sx * STUD / 2, y: y + BRICK_H / 2, z: z + sz * STUD / 2, w: sx * STUD, d: sz * STUD, color });
        if (withStuds) for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) studs.push({ x: x + (i + 0.5) * STUD, y: y + BRICK_H, z: z + (j + 0.5) * STUD, color });
      }
      // A wall of nx by nz studs: every layer is tiled with bricks, turned by 90 degrees per layer
      function stack(x0, y0, z0, nx, nz, layers, seed, colors) {
        const r = rng(seed);
        for (let l = 0; l < layers; l++) {
          const alongX = l % 2 === 0, top = l === layers - 1, nu = alongX ? nx : nz, nv = alongX ? nz : nx;
          for (let v = 0; v < nv; v += 2) {
            const wide = Math.min(2, nv - v);
            let u = 0;
            while (u < nu) {
              let len = Math.min([4, 2, 3, 4][Math.floor(r() * 4)], nu - u);
              if (nu - u - len === 1) len += 1;
              const color = colors[Math.floor(r() * colors.length)], y = y0 + l * BRICK_H;
              if (alongX) add(x0 + u * STUD, y, z0 + v * STUD, len, wide, color, top); else add(x0 + v * STUD, y, z0 + u * STUD, wide, len, color, top);
              u += len;
            }
          }
        }
        return y0 + layers * BRICK_H;
      }
      function build(parent) {
        const plastic = k.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0, envMapIntensity: 0.45 }));
        const dummy = new THREE.Object3D(), c = new THREE.Color();
        const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plastic, bodies.length);
        bodies.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.w - 0.03, BRICK_H - 0.02, b.d - 0.03); dummy.updateMatrix(); body.setMatrixAt(i, dummy.matrix); body.setColorAt(i, c.set(b.color)); });
        const knob = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.13, 14), plastic, studs.length);
        dummy.scale.set(1, 1, 1);
        studs.forEach((s, i) => { dummy.position.set(s.x, s.y + 0.065, s.z); dummy.updateMatrix(); knob.setMatrixAt(i, dummy.matrix); knob.setColorAt(i, c.set(s.color)); });
        for (const im of [body, knob]) { im.castShadow = true; im.receiveShadow = true; parent.add(im); }
        return { body, knob };
      }
      return { add, stack, build };
    }

    // ---------- Book lying flat: spine on the -x side, origin in the centre ----------
    const pagesMat = texStd(tex.pages(), { roughness: 0.9 });
    function book(w, h, d, color) {
      const g = group(), cover = std(color, { roughness: 0.6 }), ct = 0.09;
      lit(mesh(new THREE.BoxGeometry(w - 0.3, h - ct * 2, d - 0.3), pagesMat, 0.06, 0, 0, g));
      // both covers and the spine are one piece
      const flat = roundedBox(w, ct, d, 0.035, 2), move = (x, y) => new THREE.Matrix4().makeTranslation(x, y, 0);
      lit(mesh(k.mergeGeos([[flat, move(0, h / 2 - ct / 2)], [flat, move(0, -h / 2 + ct / 2)], [roundedBox(0.12, h, d, 0.04, 2), move(-w / 2 + 0.06, 0)]]), cover, 0, 0, 0, g));
      const label = mesh(new THREE.PlaneGeometry(w * 0.5, d * 0.22), std(PAL.paper, { roughness: 0.9 }), 0.1, h / 2 + 0.003, -d * 0.18, g);
      label.rotation.x = -Math.PI / 2; label.receiveShadow = true;
      return g;
    }

    // ---------- Wooden ruler lying along x, origin in the centre ----------
    function ruler(len, width) {
      const g = group(), th = RULER_H;
      lit(mesh(roundedBox(len, th, width, 0.04, 2), std('#E9D3A8', { roughness: 0.6 }), 0, 0, 0, g));
      const top = mesh(new THREE.PlaneGeometry(len - 0.1, width - 0.1), texStd(tex.ruler(), { roughness: 0.6 }), 0, th / 2 + 0.003, 0, g);
      top.rotation.x = -Math.PI / 2; top.receiveShadow = true;
      return g;
    }

    // ---------- Toy drum: its skin is a trampoline. Origin on the floor. ----------
    function drum(r, h) {
      const g = group(), shell = lit(mesh(new THREE.CylinderGeometry(r, r, h, 28), texStd(tex.drum(), { roughness: 0.5 }), 0, h / 2, 0, g));
      shell.material.map.repeat.set(6, 1);
      for (const y of [0.1, h - 0.1]) lit(mesh(new THREE.TorusGeometry(r, 0.11, 8, 36), std(PAL.yellow, { roughness: 0.4 }), 0, y, 0, g)).rotation.x = Math.PI / 2;
      const skin = mesh(new THREE.CircleGeometry(r - 0.06, 28), std(PAL.paper, { roughness: 0.8 }), 0, h + 0.01, 0, g); skin.rotation.x = -Math.PI / 2; skin.receiveShadow = true;
      return { root: g, skin };
    }

    // ---------- Glass marble: danger colour, dark outline ----------
    function marble(r) {
      const m = lit(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), std(PAL.danger, { roughness: 0.08, envMapIntensity: k.ENV_SHINY })));
      inked(m, 0.045);
      const swirl = mesh(new THREE.TorusGeometry(r * 0.72, r * 0.3, 8, 24), std('#FFFFFF', { roughness: 0.2 }), 0, 0, 0, m); swirl.rotation.set(0.9, 0.4, 0);
      return m;
    }

    // ---------- Slot-car track as a stadium-shaped oval ----------
    function ovalPath(cx, cz, L, R) {
      const arc = Math.PI * R, P = 2 * L + 2 * arc;
      function at(dist) {
        let d = ((dist % P) + P) % P;
        if (d < L) return { x: cx + R, z: cz + L / 2 - d, tx: 0, tz: -1, nx: 1, nz: 0 };
        d -= L;
        if (d < arc) { const a = d / R; return { x: cx + R * Math.cos(a), z: cz - L / 2 - R * Math.sin(a), tx: -Math.sin(a), tz: -Math.cos(a), nx: Math.cos(a), nz: -Math.sin(a) }; }
        d -= arc;
        if (d < L) return { x: cx - R, z: cz - L / 2 + d, tx: 0, tz: 1, nx: -1, nz: 0 };
        d -= L;
        const a = Math.PI + d / R;
        return { x: cx + R * Math.cos(a), z: cz + L / 2 - R * Math.sin(a), tx: -Math.sin(a), tz: -Math.cos(a), nx: Math.cos(a), nz: -Math.sin(a) };
      }
      const samples = (n) => Array.from({ length: n + 1 }, (_, i) => Object.assign(at(P * i / n), { d: P * i / n }));
      return { at, samples, length: P };
    }
    function raceTrack(path, width) {
      const g = group(), s = path.samples(120), half = width / 2, curbW = 0.42;
      const road = mesh(ribbon(s, -half, half, TRACK_H, 3.2), texStd(tex.track(), { roughness: 0.85 }), 0, 0, 0, g); road.receiveShadow = true;
      for (const [a, b] of [[half, half + curbW], [-half - curbW, -half]]) { const curb = mesh(ribbon(s, a, b, TRACK_H, 1.3), texStd(tex.curb(), { roughness: 0.6 }), 0, 0, 0, g); curb.receiveShadow = true; }
      const side = std('#2A2B35', { roughness: 0.7, side: THREE.DoubleSide });
      mesh(ribbonEdge(s, half + curbW, 0, TRACK_H), side, 0, 0, 0, g); mesh(ribbonEdge(s, -half - curbW, 0, TRACK_H), side, 0, 0, 0, g);
      return g;
    }
    // Small racing car, nose towards +z, origin on the ground
    function car(color) {
      const g = group(), paint = std(color, { roughness: 0.22, envMapIntensity: k.ENV_SHINY }), dark = std('#23242E', { roughness: 0.5 });
      inked(lit(mesh(roundedBox(1.5, 0.46, 3.3, 0.2), paint, 0, 0.5, 0, g)), 0.04);
      lit(mesh(roundedBox(1.15, 0.42, 1.35, 0.18), std('#2B3350', { roughness: 0.08, envMapIntensity: 1 }), 0, 0.86, -0.25, g));
      mesh(new THREE.BoxGeometry(1.5, 0.07, 0.38), paint, 0, 1.02, -1.5, g);
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.08, 0.3, 0.3), dark, sx * 0.6, 0.86, -1.5, g);
      const stripe = mesh(new THREE.PlaneGeometry(0.34, 1.25), std('#FFFFFF', { roughness: 0.4 }), 0, 0.735, 1.0, g); stripe.rotation.x = -Math.PI / 2;
      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 18); wheelGeo.rotateZ(Math.PI / 2);
      const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.32, 12); hubGeo.rotateZ(Math.PI / 2);
      const wheels = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = group(g); w.position.set(sx * 0.74, 0.36, sz * 1.05); lit(mesh(wheelGeo, dark, 0, 0, 0, w)); mesh(hubGeo, std('#D9DCE4', { roughness: 0.3 }), 0, 0, 0, w); wheels.push(w); }
      for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.11, 10, 8), k.basic('#FFF3C4'), sx * 0.48, 0.52, 1.63, g);
      return { root: g, wheels, stripe };
    }

    // ---------- Propeller cap: gives Mimo the glide ----------
    function propCap() {
      const g = group();
      const dome = mesh(new THREE.SphereGeometry(0.27, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), texStd(tex.capStripes(), { roughness: 0.55 }), 0, 0, 0, g); dome.scale.y = 0.8;
      const peak = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), std(PAL.red, { roughness: 0.55 }), 0, 0.01, 0.2, g); peak.scale.z = 0.8;
      mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 8), std('#D9DCE4', { roughness: 0.3 }), 0, 0.27, 0, g);
      const spin = group(g); spin.position.y = 0.335;
      mesh(new THREE.SphereGeometry(0.035, 10, 8), std(PAL.red, { roughness: 0.4 }), 0, 0, 0, spin);
      for (const sx of [-1, 1]) { const blade = mesh(new THREE.SphereGeometry(0.16, 14, 8), std(sx > 0 ? PAL.yellow : PAL.blue, { roughness: 0.4 }), sx * 0.17, 0, 0, spin); blade.scale.set(1, 0.07, 0.36); blade.rotation.x = sx * 0.35; }
      dome.castShadow = true; peak.castShadow = true;
      return { root: g, spin };
    }

    // ---------- Checkpoint: a little pennant on a pole, grey until Mimo touches it ----------
    function checkFlag() {
      const g = group(), tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.75, -0.24); tri.lineTo(0, -0.48); tri.closePath();
      lit(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), std('#EDE6D6', { roughness: 0.5 }), 0, 0.75, 0, g));
      mesh(new THREE.SphereGeometry(0.07, 10, 8), std(PAL.gold, { roughness: 0.3 }), 0, 1.52, 0, g);
      const cloth = mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: new THREE.Color('#B9B5C4'), roughness: 0.7, side: THREE.DoubleSide }), 0.03, 1.45, 0, g);
      return { root: g, cloth };
    }

    // ---------- Goal: a golden cup with a big star ----------
    function trophy() {
      const g = group(), gold = std(PAL.gold, { roughness: 0.22, metalness: 0.6, envMapIntensity: 1 });
      lit(mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.22, 24), std('#6B4E3A', { roughness: 0.6 }), 0, 0.11, 0, g));
      lit(mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.5, 16), gold, 0, 0.47, 0, g));
      const cup = lit(mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold, 0, 1.2, 0, g)); cup.material.side = THREE.DoubleSide;
      const star = new THREE.Mesh(k.starGeo, k.starMat); star.scale.setScalar(1.7); star.position.y = 1.75; g.add(star);
      star.add(k.halo(PAL.gold, 2.6, 0.5));
      return { root: g, star };
    }

    return { STUD, BRICK_H, PENCIL_R, PENCIL_TOP, TRACK_H, RULER_H, ruler, drum, block, pencil, brickSet, book, marble, ovalPath, raceTrack, car, propCap, checkFlag, trophy };
  }

  Room3D.makeProps = makeProps;
})();
