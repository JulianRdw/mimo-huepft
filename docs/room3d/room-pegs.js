/* Mimo hüpft · Kinderzimmer (3D) · wooden peg figures
   The engine driver and the passengers of mission 2 are painted wooden peg dolls: a turned body with
   shoulders, clothes in two colours and a belt, a round head with cheeks and a smile, hair, a hat and two
   little arms. Everything that does not move is melted into one vertex-coloured mesh, so a figure costs
   three draw calls (body, two arms). The figure is about 1.1 high at scale 1 and looks towards +z.
   Room3D.makePeg(THREE, k, look) returns { root, armL, armR }; turn an arm with armX.rotation.x / .z. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const SKIN = '#F2D2AE', CHEEK = '#F29A9A', INK = '#3A3850', WHITE = '#FBF7EF';
  const BODY = { split: 0.32, shoulderY: 0.58 };      // where the lower clothes end, where the arms hang
  const HEAD = { y: 0.85, r: 0.225 };
  const ARM = { x: 0.25, len: 0.28, r: 0.055, hand: 0.06 };

  // Melts parts [geometry, colour, matrix] into one geometry with vertex colours
  function melt(THREE, parts) {
    const flat = parts.map(([geo, color, m]) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose(); g.applyMatrix4(m); return [g, color]; });
    const n = flat.reduce((s, [g]) => s + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    let o = 0;
    for (const [g, color] of flat) {
      const cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      c.set(color); for (let i = 0; i < cnt; i++) col.set([c.r, c.g, c.b], (o + i) * 3);
      o += cnt; g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }

  // look: { top, bottom, belt, hair, hairKind, hat, hatBand, extra: [...], dress? }
  function makePeg(THREE, k, look) {
    const sharedMat = k.own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMapIntensity: 0.3 }));
    const parts = [], V = (x, y, z) => new THREE.Vector3(x, y, z), E = new THREE.Euler(), Q = new THREE.Quaternion();
    const M = (x, y, z, sx, sy, sz, rx, ry, rz) => new THREE.Matrix4().compose(V(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), V(sx ?? 1, sy ?? sx ?? 1, sz ?? sx ?? 1));
    const add = (geo, color, m) => parts.push([geo, color, m || M(0, 0, 0)]);
    const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg || 22);

    // body: lower clothes (a flared dress or straight trousers), belt, upper clothes rounding into the neck
    const flare = look.dress ? 0.36 : 0.31;
    add(lathe([[0, 0], [flare - 0.02, 0], [flare, 0.03], [look.dress ? 0.3 : 0.315, BODY.split]]), look.bottom);
    add(lathe([[0.315, BODY.split], [0.3, 0.46], [0.26, 0.56], [0.19, 0.63], [0.11, 0.67], [0, 0.68]]), look.top);
    add(new THREE.TorusGeometry(0.315, 0.025, 6, 26), look.belt || INK, M(0, BODY.split, 0, 1, 1, 1, Math.PI / 2));
    for (const y of [0.4, 0.5]) add(new THREE.SphereGeometry(0.026, 8, 6), WHITE, M(0, y, 0.302 - (y - 0.4) * 0.25));
    // head and face; face parts sit on the head's surface (fz gives its depth at a spot of the face)
    const fz = (x, dy, out) => Math.sqrt(Math.max(0, HEAD.r * HEAD.r - x * x - dy * dy)) + (out || 0);
    add(new THREE.SphereGeometry(HEAD.r, 20, 16), SKIN, M(0, HEAD.y, 0));
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.03, 8, 6), INK, M(s * 0.075, HEAD.y + 0.03, fz(0.075, 0.03, -0.006), 1, 1.25, 0.6));
      add(new THREE.SphereGeometry(0.042, 10, 6), CHEEK, M(s * 0.125, HEAD.y - 0.035, fz(0.125, 0.035, -0.01), 1, 0.75, 0.45));
    }
    add(new THREE.TorusGeometry(0.048, 0.012, 6, 12, Math.PI), INK, M(0, HEAD.y - 0.04, fz(0, 0.06, -0.004), 1, 1, 1, -0.25, 0, Math.PI));
    // hair
    const hr = HEAD.r + 0.018;
    add(new THREE.SphereGeometry(hr, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), look.hair, M(0, HEAD.y + 0.005, -0.015, 1, 1, 1, -0.3));
    if (look.hairKind === 'bun') add(new THREE.SphereGeometry(0.085, 12, 10), look.hair, M(0, HEAD.y + 0.2, -0.1));
    if (look.hairKind === 'tails') for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.075, 12, 10), look.hair, M(s * 0.21, HEAD.y - 0.02, -0.04, 0.8, 1.25, 0.8));
    // short hair: the cap reaches lower round the back and the sides; three's sphere has the face (+z) at phi = PI / 2
    if (look.hairKind === 'short') add(new THREE.SphereGeometry(hr, 18, 8, Math.PI * 0.78, Math.PI * 1.44, Math.PI * 0.35, Math.PI * 0.25), look.hair, M(0, HEAD.y, 0));
    // hats and extras
    const top = HEAD.y + HEAD.r * 0.72;
    if (look.hat === 'tophat') {
      add(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 22), look.hatColor, M(0, top, 0));
      add(new THREE.CylinderGeometry(0.15, 0.16, 0.22, 20), look.hatColor, M(0, top + 0.12, 0));
      add(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 20), look.hatBand, M(0, top + 0.04, 0));
    } else if (look.hat === 'conductor') {
      add(new THREE.CylinderGeometry(0.215, 0.2, 0.13, 22), look.hatColor, M(0, top + 0.04, 0));
      add(new THREE.CylinderGeometry(0.222, 0.222, 0.04, 22), look.hatBand, M(0, top + 0.0, 0));
      add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), INK, M(0, top - 0.02, 0.14, 1, 1, 1));
      add(new THREE.SphereGeometry(0.03, 8, 6), WHITE, M(0, top + 0.05, 0.215, 1, 1, 0.5));
    } else if (look.hat === 'bow') {
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 10, 8), look.hatColor, M(s * 0.065, top + 0.07, -0.02, 1.2, 0.85, 0.6, 0, 0, s * 0.3));
      add(new THREE.SphereGeometry(0.035, 8, 6), look.hatColor, M(0, top + 0.07, -0.01));
    } else if (look.hat === 'hardhat') {
      add(new THREE.SphereGeometry(HEAD.r + 0.03, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), look.hatColor, M(0, top - 0.09, 0));
      add(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 22), look.hatColor, M(0, top - 0.09, 0.03));
      add(new THREE.BoxGeometry(0.06, 0.05, 0.42), look.hatBand, M(0, top + 0.1, 0, 1, 1, 1, 0.2));
    } else if (look.hat === 'helmet') {
      add(new THREE.SphereGeometry(HEAD.r + 0.05, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), look.hatColor, M(0, HEAD.y + 0.02, -0.01));
      add(new THREE.BoxGeometry(0.46, 0.035, 0.05), look.hatBand, M(0, HEAD.y + 0.12, fz(0, 0.12, 0.045)));
    } else if (look.hat === 'headband') {
      add(new THREE.TorusGeometry(HEAD.r + 0.012, 0.03, 6, 26), look.hatColor, M(0, HEAD.y + 0.1, 0, 1, 1, 1, Math.PI / 2 - 0.12));
    }
    for (const x of look.extra || []) {
      if (x === 'moustache') for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.05, 10, 8), look.hair, M(s * 0.048, HEAD.y - 0.008, fz(0.048, 0.008, 0.005), 1.2, 0.55, 0.6, 0, 0, s * 0.25));
      if (x === 'scarf') { add(new THREE.TorusGeometry(0.15, 0.04, 8, 18), look.scarf, M(0, 0.64, 0, 1, 1, 1, Math.PI / 2)); add(new THREE.ConeGeometry(0.07, 0.14, 8), look.scarf, M(0, 0.58, 0.16, 1, 1, 0.5, Math.PI)); }
      if (x === 'glasses') { for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.052, 0.01, 6, 14), INK, M(s * 0.075, HEAD.y + 0.03, fz(0.075, 0.03, 0.012))); add(new THREE.BoxGeometry(0.05, 0.012, 0.01), INK, M(0, HEAD.y + 0.035, fz(0, 0.035, 0.012))); }
    }

    const root = new THREE.Group();
    const body = new THREE.Mesh(melt(THREE, parts), sharedMat); body.castShadow = true; root.add(body);
    // arms: a sleeve with a hand, hanging from the shoulder (the group's origin)
    const armGeo = melt(THREE, [
      [new THREE.CapsuleGeometry(ARM.r, ARM.len - ARM.r * 2, 4, 10), look.top, M(0, -ARM.len / 2, 0)],
      [new THREE.SphereGeometry(ARM.hand, 10, 8), SKIN, M(0, -ARM.len - 0.02, 0)],
    ]);
    const arms = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(s * ARM.x, BODY.shoulderY, 0); g.rotation.z = s * 0.18; root.add(g);
      const m = new THREE.Mesh(armGeo, sharedMat); m.castShadow = true; g.add(m); return g;
    });
    return { root, armL: arms[0], armR: arms[1] };
  }

  Room3D.makePeg = makePeg;
  Room3D.PEG_LOOKS = {
    kicker: { top: '#52AE75', bottom: '#FBF7EF', belt: '#3A3850', hair: '#7A4E2D', hairKind: 'short', hat: 'headband', hatColor: '#E25B45' },
    builder: { top: '#EE8A38', bottom: '#4686D2', belt: '#3A3850', hair: '#3A3850', hairKind: 'short', hat: 'hardhat', hatColor: '#F4BF3A', hatBand: '#E0A92A', extra: ['moustache'] },
    racer: { top: '#E25B45', bottom: '#3A3850', belt: '#FBF7EF', hair: '#B5542B', hairKind: 'tails', hat: 'helmet', hatColor: '#FBF7EF', hatBand: '#3A3850' },
    driver: { top: '#4686D2', bottom: '#2F3550', belt: '#3A3850', hair: '#7A4E2D', hairKind: 'short', hat: 'conductor', hatColor: '#2F3550', hatBand: '#E25B45', extra: ['moustache', 'scarf'], scarf: '#E25B45' },
    gentleman: { top: '#52AE75', bottom: '#4686D2', belt: '#7A4E2D', hair: '#7A4E2D', hairKind: 'short', hat: 'tophat', hatColor: '#3A3850', hatBand: '#E25B45' },
    girl: { top: '#EE8A38', bottom: '#9474CE', belt: '#FBF7EF', hair: '#B5542B', hairKind: 'tails', hat: 'bow', hatColor: '#E25B45', dress: true },
    granny: { top: '#9474CE', bottom: '#E25B45', belt: '#FBF7EF', hair: '#D8D4CE', hairKind: 'bun', extra: ['glasses'], dress: true },
    // the figures of the newer side missions
    bowler: { top: '#4686D2', bottom: '#FBF7EF', belt: '#E25B45', hair: '#3A3850', hairKind: 'short', extra: ['moustache', 'glasses'] },
    seamstress: { top: '#E25B45', bottom: '#FBF7EF', belt: '#F4BF3A', hair: '#3A3850', hairKind: 'bun', hat: 'bow', hatColor: '#F4BF3A', dress: true },
    duster: { top: '#52AE75', bottom: '#EE8A38', belt: '#FBF7EF', hair: '#B5542B', hairKind: 'tails', hat: 'headband', hatColor: '#FBF7EF', extra: ['scarf'], scarf: '#F4BF3A', dress: true },
    musician: { top: '#3A3850', bottom: '#3A3850', belt: '#F4BF3A', hair: '#D8D4CE', hairKind: 'short', hat: 'tophat', hatColor: '#3A3850', hatBand: '#F4BF3A', extra: ['moustache'] },
    seller: { top: '#F4BF3A', bottom: '#4686D2', belt: '#FBF7EF', hair: '#EE8A38', hairKind: 'tails', hat: 'bow', hatColor: '#52AE75', dress: true },
  };
})();
