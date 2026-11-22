/* Mimo hüpft · Kinderzimmer (3D) · desk and chair
   The desk stands in the front left corner of the room. Its top is the playing field of section 3;
   below it Mimo can walk through. Everything is solid. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // Top of the desk at 21 units (about 75 cm). The numbers are shared with the sections that build on it.
  const DESK = { x0: -23, x1: 18, z0: 27, z1: 45.5, top: 21, slab: 1.4, leg: 1.6, drawers: 11 };
  const CHAIR = { x0: -13, x1: -3, z0: 15, z1: 25, seat: 12.2, slab: 1.2, back: 25, leg: 0.5 };

  function makeDesk(THREE, k, world) {
    const { PAL, std, mat, mesh, roundedBox } = k;

    function desk(root) {
      const d = DESK, w = d.x1 - d.x0, depth = d.z1 - d.z0, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2, under = d.top - d.slab;
      const wood = std('#E3C9A0', { roughness: 0.6 }), white = mat(PAL.furniture);
      const slab = mesh(roundedBox(w, d.slab, depth, 0.3, 3), wood, cx, d.top - d.slab / 2, cz, root); slab.receiveShadow = true;
      world.addBox(cx, under, d.top, cz, w / 2, depth / 2);
      world.addCamBlock(d.x0, d.x1, under, d.top, d.z0, d.z1);
      // two legs on the right, a chest of drawers on the left
      for (const lz of [d.z0 + 1.4, d.z1 - 1.4]) { mesh(roundedBox(d.leg, under, d.leg, 0.25, 2), white, d.x1 - 1.4, under / 2, lz, root); world.addBox(d.x1 - 1.4, 0, under, lz, d.leg / 2, d.leg / 2); }
      const dx = d.x0 + d.drawers / 2;
      mesh(roundedBox(d.drawers, under, depth - 1, 0.3, 3), white, dx, under / 2, cz, root);
      world.addBox(dx, 0, under, cz, d.drawers / 2, (depth - 1) / 2);
      world.addCamBlock(d.x0, d.x0 + d.drawers, 0, under, d.z0, d.z1);
      for (let i = 0; i < 3; i++) {
        const y = 3.4 + i * 6.1;
        mesh(roundedBox(d.drawers - 1.2, 5.3, 0.4, 0.15, 2), mat('#E4DBC9'), dx, y, d.z0 + 0.45, root);
        mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(PAL.birch), dx, y, d.z0 + 0.05, root);
      }
    }

    function chair(root) {
      const c = CHAIR, w = c.x1 - c.x0, depth = c.z1 - c.z0, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, under = c.seat - c.slab;
      const paint = mat('#8DB8A8'), dark = mat('#7AA596');
      mesh(roundedBox(w, c.slab, depth, 0.4, 3), paint, cx, c.seat - c.slab / 2, cz, root);
      world.addBox(cx, under, c.seat, cz, w / 2, depth / 2);
      for (const lx of [c.x0 + 0.9, c.x1 - 0.9]) for (const lz of [c.z0 + 0.9, c.z1 - 0.9]) {
        const tall = lz < cz ? c.back : under;                    // the two back legs carry the backrest
        mesh(new THREE.CylinderGeometry(c.leg, c.leg, tall, 12), dark, lx, tall / 2, lz, root);
        world.addCyl(lx, lz, c.leg, tall, 0);
      }
      for (const y of [c.seat + 5.2, c.back - 2.2]) { mesh(roundedBox(w - 1, 3.4, 0.9, 0.35, 2), paint, cx, y, c.z0 + 0.9, root); world.addBox(cx, y - 1.7, y + 1.7, c.z0 + 0.9, (w - 1) / 2, 0.45); }
      world.addCamBlock(c.x0, c.x1, under, c.seat, c.z0, c.z1);
    }

    return { build(root) { desk(root); chair(root); } };
  }

  Room3D.DESK = DESK;
  Room3D.CHAIR = CHAIR;
  Room3D.makeDesk = makeDesk;
})();
