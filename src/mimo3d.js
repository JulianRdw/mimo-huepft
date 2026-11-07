/* Mimo hüpft · Mimo in 3D
   The shared Mimo figure for the 3D levels (Himmelsinseln, Sternenbahn), plus a small kit of
   material and mesh helpers. Needs the global THREE (r160). */
(function () {
  'use strict';
  const okHex = (v, fb) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : fb);

  // Soft round gradients as raw pixels: a canvas gradient gets colour noise in its nearly clear edge on Safari
  function radialData(THREE, stops) {
    const N = 64, px = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = Math.min(1, Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2));
      let i = 1; while (i < stops.length - 1 && stops[i][0] < r) i++;
      const a = stops[i - 1], b = stops[i], k = Math.max(0, Math.min(1, (r - a[0]) / ((b[0] - a[0]) || 1))), o = (y * N + x) * 4;
      for (let c = 0; c < 4; c++) px[o + c] = Math.round((a[c + 1] + (b[c + 1] - a[c + 1]) * k) * (c < 3 ? 1 : 255));
    }
    const t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  }
  // 'rgba(r,g,b,a)' pair to a two-stop gradient
  const rgba = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); const v = m ? m[1].split(',').map(Number) : [255, 255, 255, 1]; return [v[0], v[1], v[2], v[3] == null ? 1 : v[3]]; };
  function radialPair(THREE, inner, outer) { return radialData(THREE, [[0, ...rgba(inner)], [1, ...rgba(outer)]]); }
  function blushData(THREE, hex) { const c = new THREE.Color(hex), r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255); return radialData(THREE, [[0, r, g, b, 0.95], [0.06, r, g, b, 0.95], [0.6, r, g, b, 0.55], [1, r, g, b, 0]]); }

  // Cached materials and a few mesh helpers, the same ones the 3D levels use
  function kit(THREE, scene, PAL) {
    const matCache = new Map();
    function mat(color, opts) {
      const key = color + (opts ? JSON.stringify(opts) : '');
      if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(Object.assign({ color: new THREE.Color(color), flatShading: false }, opts || {})));
      return matCache.get(key);
    }
    function smoothMat(color, opts) { return mat(color, Object.assign({ flatShading: false }, opts || {})); }
    function basic(color, opts) {
      const key = 'b' + color + (opts ? JSON.stringify(opts) : '');
      if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color) }, opts || {})));
      return matCache.get(key);
    }
    function mesh(geo, material, x, y, z, parent) {
      const m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
      (parent || scene).add(m); return m;
    }
    function radialTexture(inner, outer) { return radialPair(THREE, inner, outer); }
    const haloTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    const blushTex = blushData(THREE, PAL.blush);
    function halo(color, size, opacity) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    }
    const starGeo = (() => {
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.15 : 0.34; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1 });
      geo.center(); return geo;
    })();
    const starMat = mat(PAL.star, { emissive: new THREE.Color(PAL.star), emissiveIntensity: 0.45 });
    return { mat, smoothMat, basic, mesh, radialTexture, halo, haloTex, blushTex, starGeo, starMat, dispose() { haloTex.dispose(); blushTex.dispose(); } };
  }

  // Builds Mimo with the chosen outfit. k: { scene, PAL, outfit, mat, smoothMat, basic, mesh, halo, blushTex, starGeo, starMat }
  function build(THREE, k) {
    const { scene, PAL, mat, smoothMat, basic, mesh, halo, blushTex, starGeo, starMat } = k;
    const o = k.outfit || {};
    const baseCol = new THREE.Color(okHex(o.color, '#A8C8EC'));
    // vivid: the runner shows Mimo small and from behind, so the colour gets a bit more depth and the outline more weight
    const vivid = !!k.vivid;
    if (vivid) baseCol.offsetHSL(0, 0.2, -0.13);
    const root = new THREE.Group(); scene.add(root);
    const LEG = 0.13, BS = 0.86;
    const body = new THREE.Group(); body.position.y = LEG; body.scale.setScalar(BS); root.add(body);
    // gumdrop body: flat bottom, soft belly, round top
    const prof = [[0, 0], [0.17, 0], [0.27, 0.012], [0.335, 0.05], [0.368, 0.11], [0.38, 0.2], [0.378, 0.3], [0.368, 0.4], [0.35, 0.5], [0.32, 0.59], [0.275, 0.67], [0.21, 0.74], [0.13, 0.79], [0.05, 0.812], [0, 0.815]];
    const curve = new THREE.SplineCurve(prof.map(([a, b]) => new THREE.Vector2(a, b)));
    const bodyGeo = new THREE.LatheGeometry(curve.getPoints(44).map((v) => new THREE.Vector2(Math.max(0.0015, v.x), v.y)), 56);
    const radiusAt = (y) => { let best = prof[0]; for (const pt of prof) if (Math.abs(pt[1] - y) < Math.abs(best[1] - y)) best = pt; return best[0]; };
    // soft vinyl look: standard material with a bright rim
    const skin = new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.5, metalness: 0, emissive: baseCol.clone().multiplyScalar(0.12) });
    skin.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', 'float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4);\ngl_FragColor.rgb += vec3(1.0, 0.97, 1.0) * rimF * ' + (vivid ? '0.2' : '0.32') + ';\n#include <dithering_fragment>'); };
    skin.customProgramCacheKey = () => 'mimoRim' + vivid;
    const skinDark = new THREE.MeshStandardMaterial({ color: baseCol.clone().multiplyScalar(0.86), roughness: 0.6 });
    const torso = mesh(bodyGeo, skin, 0, 0, 0, body);
    // soft outline: back faces pushed out along the normal
    const outlineMat = new THREE.MeshBasicMaterial({ color: baseCol.clone().lerp(new THREE.Color(PAL.ink), vivid ? 0.8 : 0.55), side: THREE.BackSide });
    outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * ' + (vivid ? '0.024' : '0.016') + ';'); };
    outlineMat.customProgramCacheKey = () => 'mimoOutline' + vivid;
    mesh(bodyGeo, outlineMat, 0, 0, 0, body);
    // eyes: big and glossy, two highlights each
    const inkM = new THREE.MeshStandardMaterial({ color: new THREE.Color(PAL.ink).lerp(new THREE.Color('#2B3A6B'), 0.25), roughness: 0.25 });
    const whiteM = basic('#FFFFFF');
    const eyes = [], happyEyes = [], closedEyes = [], cheeks = [];
    const EYE_Y = 0.46, EYE_X = 0.128;
    for (const sx of [-1, 1]) {
      const rr0 = radiusAt(EYE_Y), z0 = Math.sqrt(Math.max(0, rr0 * rr0 - EYE_X * EYE_X));
      const eg = new THREE.Group(); eg.position.set(sx * EYE_X, EYE_Y, z0 - 0.012); eg.rotation.y = Math.atan2(sx * EYE_X, z0); body.add(eg);
      const e = mesh(new THREE.SphereGeometry(0.072, 24, 18), inkM, 0, 0, 0, eg); e.scale.set(0.82, 1.12, 0.42);
      mesh(new THREE.SphereGeometry(0.025, 12, 10), whiteM, 0.02, 0.03, 0.026, eg);
      mesh(new THREE.SphereGeometry(0.012, 8, 8), whiteM, -0.022, -0.028, 0.026, eg);
      eyes.push(eg);
      const he = mesh(new THREE.TorusGeometry(0.046, 0.012, 8, 18, Math.PI), inkM, sx * EYE_X, EYE_Y - 0.01, z0 + 0.012, body); he.rotation.y = Math.atan2(sx * EYE_X, z0); he.visible = false; happyEyes.push(he);
      const ce = mesh(new THREE.TorusGeometry(0.042, 0.011, 8, 18, Math.PI), inkM, sx * EYE_X, EYE_Y - 0.005, z0 + 0.012, body); ce.rotation.set(0, Math.atan2(sx * EYE_X, z0), Math.PI); ce.visible = false; closedEyes.push(ce);
      // cheeks
      const BX = 0.228, BY = 0.37, rb = radiusAt(BY), zb = Math.sqrt(Math.max(0, rb * rb - BX * BX));
      const bl = mesh(new THREE.CircleGeometry(0.062, 24), new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false }), sx * BX * 1.012, BY, zb * 1.012, body);
      bl.lookAt(sx * BX * 3, BY + LEG, zb * 3); cheeks.push(bl);
    }
    // mouth: a small smile, and an open mouth with a tongue for jumps and cheers
    const MZ = radiusAt(0.385) + 0.004;
    const smile = mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.034, 0.006, 0), new THREE.Vector3(0, -0.026, 0.006), new THREE.Vector3(0.034, 0.006, 0)), 14, 0.0085, 6), inkM, 0, 0.385, MZ - 0.004, body);
    const mouthOpen = new THREE.Group(); mouthOpen.position.set(0, 0.375, MZ - 0.006); body.add(mouthOpen);
    const mo = mesh(new THREE.SphereGeometry(0.034, 16, 12), smoothMat(PAL.ink), 0, 0, 0, mouthOpen); mo.scale.set(1, 0.9, 0.35);
    const tongue = mesh(new THREE.SphereGeometry(0.018, 12, 8), smoothMat(PAL.thorn), 0, -0.013, 0.008, mouthOpen); tongue.scale.set(1.2, 0.7, 0.5);
    mouthOpen.visible = false;
    // stubby arms on shoulder pivots, short legs on hip pivots
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const ag = new THREE.Group(); ag.position.set(sx * 0.335, 0.37, 0.02); body.add(ag);
      const a = mesh(new THREE.CapsuleGeometry(0.052, 0.06, 6, 12), skin, sx * 0.03, -0.06, 0, ag); a.rotation.z = sx * 0.25;
      if (vivid) ag.scale.setScalar(1.5);
      arms.push(ag);
      const hip = new THREE.Group(); hip.position.set(sx * 0.12, LEG + 0.03, 0.02); root.add(hip);
      mesh(new THREE.CapsuleGeometry(0.052, 0.07, 6, 12), skinDark, 0, -0.075, 0, hip);
      const foot = mesh(new THREE.SphereGeometry(0.075, 18, 12), skinDark, 0, -LEG - 0.03 + 0.035, 0.035, hip); foot.scale.set(1, 0.6, 1.4);
      if (vivid) hip.scale.setScalar(1.15);
      legs.push(hip);
    }
    const extra = new THREE.Group(); body.add(extra);
    const hat = o.hat || 'h_leaf';
    let sprout = null;
    if (hat === 'h_straw') {
      mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 32), mat('#F3D9A0'), 0, 0.8, 0, extra);
      mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.14, 32), mat('#F3D9A0'), 0, 0.87, 0, extra);
      mesh(new THREE.CylinderGeometry(0.193, 0.193, 0.035, 32), mat(PAL.blush), 0, 0.83, 0, extra);
    } else if (hat === 'h_cap') {
      const cn = mesh(new THREE.ConeGeometry(0.22, 0.42, 24), smoothMat(PAL.blush), 0.02, 0.97, -0.02, extra); cn.rotation.z = -0.25;
      mesh(new THREE.SphereGeometry(0.06, 12, 10), smoothMat('#FFFFFF'), 0.1, 1.17, -0.02, extra);
      mesh(new THREE.TorusGeometry(0.21, 0.04, 8, 24), smoothMat('#FFFFFF'), 0, 0.78, 0, extra).rotation.x = Math.PI / 2;
    } else if (hat === 'h_crown') {
      mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24, 1, true), mat('#F7C948', { side: THREE.DoubleSide }), 0, 0.83, 0, extra);
      for (let i = 0; i < 5; i++) { const a = i * 1.2566; mesh(new THREE.ConeGeometry(0.04, 0.12, 8), mat('#F7C948'), Math.cos(a) * 0.16, 0.92, Math.sin(a) * 0.16, extra); }
    } else if (hat === 'h_party') {
      const cn = mesh(new THREE.ConeGeometry(0.18, 0.46, 24), smoothMat(PAL.lav), 0.03, 1.02, 0, extra); cn.rotation.z = -0.18;
      for (let i = 0; i < 2; i++) { const band = mesh(new THREE.TorusGeometry(0.13 - i * 0.05, 0.025, 8, 20), smoothMat(PAL.star), 0.03 + 0.05 * (i + 1) * 0.6, 0.95 + i * 0.13, 0, extra); band.rotation.x = Math.PI / 2; band.rotation.y = 0.18; }
      mesh(new THREE.SphereGeometry(0.055, 12, 10), smoothMat(PAL.thorn), 0.1, 1.26, 0, extra);
    } else if (hat === 'h_wizard') {
      mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 32), smoothMat(PAL.lav), 0, 0.79, 0, extra);
      const cn = mesh(new THREE.ConeGeometry(0.22, 0.58, 24), smoothMat(PAL.lav), 0, 1.08, 0, extra); cn.rotation.z = 0.12;
      const st = new THREE.Mesh(starGeo, starMat); st.scale.setScalar(0.28); st.position.set(0.02, 1.0, 0.2); extra.add(st);
    } else {
      // springy sprout: curved stem and two leaves
      sprout = new THREE.Group(); sprout.position.set(0, 0.8, 0); extra.add(sprout);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0.012, 0.07, 0), new THREE.Vector3(0, 0.15, 0)]), 10, 0.016, 6), mat(PAL.leaf), 0, 0, 0, sprout);
      const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.06, 0.05, 0.17, 0); leafShape.quadraticCurveTo(0.06, -0.05, 0, 0);
      const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.008, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 10 });
      for (const sx of [-1, 1]) { const lf = mesh(leafGeo, smoothMat(sx > 0 ? PAL.leaf : PAL.mint), 0, 0.15, 0, sprout); lf.rotation.set(0, sx > 0 ? 0 : Math.PI, 0.55); lf.rotateX(0.35); }
    }
    const acc = o.acc || 'a_none';
    let wings = null;
    if (acc === 'a_glasses') {
      for (const sx of [-1, 1]) { const gl = mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), smoothMat(PAL.ink), sx * EYE_X, EYE_Y, 0.36, extra); gl.rotation.y = sx * 0.3; }
      mesh(new THREE.BoxGeometry(0.07, 0.014, 0.014), smoothMat(PAL.ink), 0, EYE_Y + 0.01, 0.37, extra);
    } else if (acc === 'a_bow') {
      for (const sx of [-1, 1]) { const b = mesh(new THREE.ConeGeometry(0.07, 0.14, 16), smoothMat(PAL.thorn), 0.2 + sx * 0.07, 0.72, 0.12, extra); b.rotation.z = sx * Math.PI / 2; }
      mesh(new THREE.SphereGeometry(0.035, 12, 10), smoothMat(PAL.thorn), 0.2, 0.72, 0.12, extra);
    } else if (acc === 'a_lantern') {
      mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), smoothMat(PAL.ink), 0.4, 0.3, 0.1, extra);
      const l = mesh(new THREE.SphereGeometry(0.07, 16, 12), mat('#F7D774', { emissive: new THREE.Color('#F7D774'), emissiveIntensity: 1 }), 0.4, 0.12, 0.1, extra);
      l.add(halo('#F7D774', 0.8, 0.6));
    } else if (acc === 'a_wings') {
      wings = [];
      for (const sx of [-1, 1]) { const wg = new THREE.Group(); wg.position.set(sx * 0.18, 0.5, -0.3); extra.add(wg); const w = mesh(new THREE.SphereGeometry(0.16, 20, 12), smoothMat('#FFFFFF', { transparent: true, opacity: 0.92 }), sx * 0.13, 0.04, 0, wg); w.scale.set(1.2, 0.7, 0.18); wings.push(wg); }
    }
    const shadow = mesh(new THREE.CircleGeometry(0.34, 28), new THREE.MeshBasicMaterial({ color: 0x2b2838, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0, 0);
    shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
    return { root, body, torso, skin, skinDark, eyes, happyEyes, closedEyes, armBase: arms.map((a) => a.position.clone()), cheeks, smile, mouthOpen, arms, legs, LEG, BS, sprout, spr: { x: 0, vx: 0, z: 0, vz: 0 }, wings, shadow, rainbow: !!o.rainbow };
  }

  window.Mimo3D = { build, kit, okHex, radialData, radialPair, blushData };
})();
