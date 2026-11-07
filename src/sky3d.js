/* Mimo hüpft · Himmelsinseln
   A 3D diorama bonus level, loaded on demand next to the game page.
   Needs the global THREE (r160) and a host object from the game, see create(). */
(function () {
  'use strict';

  // Physics in world units (one unit is a little more than Mimo's height)
  const PH = { GRAV: 38, MAX_FALL: 24, RUN: 5.6, ACC: 50, AIR_ACC: 30, JUMP: 13.2, JUMP_CUT: 0.45, COYOTE: 0.1, BUFFER: 0.13, BOUNCE: 19.5, STOMP: 14, R: 0.32, H: 0.82 };
  const STAR_COUNT = 6;
  const BRIDGE_OPEN = 6, BRIDGE_TURN = 0.8, BRIDGE_BACK = 1.2;
  const DISC_SPIN = 0.55, BAR_SPIN = -1.15;
  const CLOUD_SPEED = 3.4, CLOUD_WAIT = 0.45;
  const BOSS_HITS = 3;
  const INTRO_TIME = 3.6, DEATH_TIME = 0.9, WIN_TIME = 1.5, CUT_TIME = 1.3;
  // Brummel cutscenes: the long one plays once per visit, later tries get the short one
  const CINE_LEN = { intro: 10.8, again: 3.0, outro: 4.4 }, TALK_CPS = 32;

  // Layout: y is up, the course runs towards -z (away from the camera)
  const LAY = {
    start: [0, 0, 2.2],
    cliff: { x0: -1.4, x1: 3.0, z0: -25.8, z1: -22.8, top: 4.2 },
    cave: { x0: 0.5, x1: 2.1, z0: -25.2, z1: -22.8, y1: 2.5 },
    bridge: { x: 0.8, z: -38.2, top: 4.2, half: 4.8 },
    disc: { x: 0.8, z: -47.6, r: 4.6, top: 4.2 },
    dock: [0.8, 4.2, -58.9],
    arena: { x: 0.8, z: -99.2, r: 7.2, top: 9 },
    door: [0.8, 9, -105.4],
    flags: [[-1.1, 1, -19.4], [-0.1, 4.2, -29.7], [-0.4, 4.2, -55.0], [-0.5, 9, -93.9]],
  };
  const CLOUD_PATH = [[0.8, 4.2, -58.9], [-2.6, 5.0, -63.6], [-5.0, 6.2, -69.6], [-2.4, 7.3, -75.6], [3.2, 8.1, -80.8], [4.2, 8.7, -86.0], [0.8, 9.0, -90.6]];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  const smooth = (k) => k * k * (3 - 2 * k);
  function angDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return d; }
  function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }

  function create(host) {
    const THREE = window.THREE;
    if (!THREE) throw new Error('THREE missing');
    const sfx = host.sfx, input = host.input;
    const C = host.colors || {};
    const okHex = (v, fb) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : fb);
    const dark = !!host.dark;
    let fun = Object.assign({}, host.fun || {});
    const funScale = () => (fun.big ? 1.6 : fun.mini ? 0.62 : 1);
    const BRUMMEL = {
      wake: 'Spring Brummel <b>dreimal auf den Kopf</b>. Pass auf, wenn er rollt.',
      intro1: 'Wer stört meinen Winterschlaf?', mimo: 'Piep?', intro2: 'Das ist MEIN Berg. Na warte!', again: 'Du schon wieder? Na warte!',
      hit1: 'Meine Mütze! Na gut, dann eben die Eiskrone!', hit2: 'Jetzt werd ich aber grummelig. Schneesturm!', tickle: ['Runter von meinem Kopf!', 'Hihi, das kitzelt!'],
      beaten: 'Na gut. Du darfst durch. Gute Nacht.', open: 'Die Tür ist offen. Lauf hinein.',
      piepSleep: 'Mmh. Fünf Minuten noch.', piepAwake: ['Hör auf zu piepen!', 'Das ist MEIN Berg.', 'Pieps nicht so frech.'],
    };
    const cine = (c) => { if (host.onCine) host.onCine(c); };
    const music = (id) => { if (host.onMusic) host.onMusic(id); };
    const PAL = {
      skyTop: okHex(C.skyTop, '#EDE6F7'), skyBot: okHex(C.skyBot, '#FCF2EC'),
      grass: okHex(C.ground, '#C2E1CE'), grassEdge: okHex(C.groundEdge, '#A4D0B6'),
      leaf: okHex(C.leaf, '#9CCDB0'), mint: okHex(C.mimoMint, '#A9DCC3'), star: okHex(C.star, '#F6D374'),
      thorn: okHex(C.thorn, '#E79AB3'), door: okHex(C.door, '#CBB3E5'), doorGlow: okHex(C.doorGlow, '#F1E7FA'),
      wood: okHex(C.oneway, '#E7CBA9'), ink: okHex(C.mimoInk, '#3A3850'), blush: okHex(C.blush, '#F4B4C0'),
      peach: okHex(C.mimoPeach, '#F6BFA6'), lav: okHex(C.mimoLav, '#C9B8EA'),
      rockA: dark ? '#5D5675' : '#DCD3EE', rockB: dark ? '#6B5A5E' : '#F0DCD2', rockC: dark ? '#535F75' : '#D6E0F0',
      sand: dark ? '#7A6A5C' : '#EBD7C2', water: dark ? '#6F97B4' : '#BFE3F4', snow: dark ? '#C9C4D8' : '#EEEAF7',
      trunk: dark ? '#8C7562' : '#D9BFA3', cloud: dark ? '#8D88A6' : '#FFFFFF', white: dark ? '#D9D2E6' : '#FFFFFF',
      stone: dark ? '#6D6785' : '#E8E1F2', stone2: dark ? '#7A6B73' : '#F3E3D6', button: '#F3A98C', carrot: '#F4AE85',
    };

    // ---------- Renderer, scene, camera, light ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.className = 'sky3d';
    host.anchor.after(canvas);

    const scene = new THREE.Scene();
    const bgCv = document.createElement('canvas'); bgCv.width = 4; bgCv.height = 256;
    { const g = bgCv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, PAL.skyTop); gr.addColorStop(1, PAL.skyBot); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
    const bgTex = new THREE.CanvasTexture(bgCv); bgTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTex;
    scene.fog = new THREE.Fog(new THREE.Color(PAL.skyBot), 62, 175);

    const cam = new THREE.PerspectiveCamera(46, 5 / 3, 0.1, 260);
    const hemi = new THREE.HemisphereLight(new THREE.Color(dark ? '#9C94C0' : '#FFFFFF'), new THREE.Color(dark ? '#4A4560' : '#D9CCE6'), dark ? 1.3 : 1.45);
    const sun = new THREE.DirectionalLight(new THREE.Color(dark ? '#C9C0F0' : '#FFF1DE'), dark ? 1.6 : 2.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scene.add(hemi, sun, sun.target);
    const baseHemi = hemi.color.clone(), baseSun = sun.color.clone();

    // ---------- Materials and geometry helpers ----------
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
    // Moves vertices by a hash of their position, so shared corners stay together
    function jitter(geo, amt, keepTopY) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const kx = Math.round(x * 100), ky = Math.round(y * 100), kz = Math.round(z * 100);
        const top = keepTopY != null && y >= keepTopY - 1e-4;
        pos.setX(i, x + (hash3(kx, ky, kz) - 0.5) * amt);
        pos.setZ(i, z + (hash3(kz, kx, ky) - 0.5) * amt);
        if (!top) pos.setY(i, y + (hash3(ky, kz, kx) - 0.5) * amt * 0.7);
      }
      geo.computeVertexNormals();
      return geo;
    }
    function mesh(geo, material, x, y, z, parent) {
      const m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
      (parent || scene).add(m); return m;
    }
    function radialTexture(inner, outer) { return window.Mimo3D.radialPair(THREE, inner, outer); }
    const haloTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    const blushTex = window.Mimo3D.blushData(THREE, PAL.blush);
    function halo(color, size, opacity) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    }

    // ---------- Colliders ----------
    const cols = [];
    function addBox(x, y0, y1, z, hx, hz, opts) {
      const c = Object.assign({ type: 'box', x, y: (y0 + y1) / 2, z, hx, hy: (y1 - y0) / 2, hz, yaw: 0, top: y1, bottom: y0, kind: 'solid', dx: 0, dy: 0, dz: 0, dyaw: 0, off: false }, opts || {});
      cols.push(c); return c;
    }
    function addCyl(x, z, r, top, bottom, opts) {
      const c = Object.assign({ type: 'cyl', x, z, r, top, bottom, yaw: 0, kind: 'solid', dx: 0, dy: 0, dz: 0, dyaw: 0, off: false }, opts || {});
      cols.push(c); return c;
    }
    function placeCollider(c, x, y, z, yaw) {
      c.dx += x - c.x; c.dz += z - c.z; c.x = x; c.z = z;
      if (c.type === 'box') { c.dy += y - c.y; c.y = y; c.top = y + c.hy; c.bottom = y - c.hy; }
      else { const h = c.top - c.bottom; c.dy += y - c.top; c.top = y; c.bottom = y - h; }
      c.dyaw += angDiff(c.yaw, yaw); c.yaw = yaw;
    }
    function toLocal(c, x, z) { const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return [dx * cs - dz * sn, dx * sn + dz * cs]; }
    function toWorldVec(c, lx, lz) { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return [lx * cs + lz * sn, -lx * sn + lz * cs]; }
    function supports(c, x, z, margin) {
      if (c.type === 'cyl') { const dx = x - c.x, dz = z - c.z; return dx * dx + dz * dz <= (c.r + margin) * (c.r + margin); }
      const [lx, lz] = toLocal(c, x, z);
      return Math.abs(lx) <= c.hx + margin && Math.abs(lz) <= c.hz + margin;
    }
    // Pushes the player out of a collider sideways; returns the push normal or null
    function pushOut(c, pl) {
      if (pl.y >= c.top - 0.04 || pl.y + PH.H <= c.bottom + 0.02) return null;
      const R = PH.R;
      if (c.type === 'cyl') {
        const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), min = c.r + R;
        if (d >= min) return null;
        const nx = d > 1e-6 ? dx / d : 0, nz = d > 1e-6 ? dz / d : 1;
        pl.x = c.x + nx * min; pl.z = c.z + nz * min; return [nx, nz];
      }
      const [lx, lz] = toLocal(c, pl.x, pl.z);
      const ox = lx - clamp(lx, -c.hx, c.hx), oz = lz - clamp(lz, -c.hz, c.hz), d2 = ox * ox + oz * oz;
      if (d2 >= R * R) return null;
      let nlx, nlz, tlx, tlz;
      if (d2 > 1e-10) { const d = Math.sqrt(d2); nlx = ox / d; nlz = oz / d; tlx = lx + nlx * (R - d); tlz = lz + nlz * (R - d); }
      else if (c.hx - Math.abs(lx) < c.hz - Math.abs(lz)) { nlx = Math.sign(lx) || 1; nlz = 0; tlx = nlx * (c.hx + R); tlz = lz; }
      else { nlx = 0; nlz = Math.sign(lz) || 1; tlx = lx; tlz = nlz * (c.hz + R); }
      const [wx, wz] = toWorldVec(c, tlx, tlz); pl.x = c.x + wx; pl.z = c.z + wz;
      return toWorldVec(c, nlx, nlz);
    }
    function groundBelow(x, z, fromY) {
      let best = -Infinity;
      for (const c of cols) if (!c.off && c.top <= fromY + 0.05 && c.top > best && supports(c, x, z, 0)) best = c.top;
      return best;
    }

    // ---------- World building ----------
    const decor = { flowers: [], grass: [] };
    const swayers = [], smokes = [];
    const bobbers = [];
    // Box with rounded edges; normals point away from the inner core, so the shading is smooth
    function roundedBox(w, h, d, r, seg) {
      const geo = new THREE.BoxGeometry(w, h, d, seg || 6, seg || 6, seg || 6), pos = geo.attributes.position, nor = geo.attributes.normal;
      const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); c.set(clamp(v.x, -ix, ix), clamp(v.y, -iy, iy), clamp(v.z, -iz, iz)); n.subVectors(v, c);
        if (n.lengthSq() < 1e-10) n.fromBufferAttribute(nor, i); n.normalize();
        v.copy(c).addScaledVector(n, r); pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, n.x, n.y, n.z);
      }
      return geo;
    }
    // Wind: grass, flowers and leaves sway, and bend away from Mimo
    const windU = { value: 0 }, playerU = { value: new THREE.Vector3(0, -99, 0) };
    function windMat(material, k, amp) {
      material.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = windU; sh.uniforms.uPlayer = playerU;
        sh.vertexShader = 'uniform float uTime;\nuniform vec3 uPlayer;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float hgt = max(position.y, 0.0) * ${k.toFixed(3)};
          #ifdef USE_INSTANCING
            vec3 wp = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 wp = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          float sway = sin(uTime * 1.7 + wp.x * 0.55 + wp.z * 0.4) + 0.45 * sin(uTime * 3.3 + wp.z * 1.3 + wp.x);
          transformed.x += sway * hgt * hgt * ${amp.toFixed(3)};
          transformed.z += sway * hgt * hgt * ${(amp * 0.5).toFixed(3)};
          vec2 away = wp.xz - uPlayer.xz; float dd = length(away);
          float push = (1.0 - smoothstep(0.12, 0.75, dd)) * (1.0 - smoothstep(0.3, 0.9, abs(wp.y - uPlayer.y)));
          transformed.xz += (away / max(dd, 0.001)) * push * hgt * 0.4;
          transformed.y -= push * hgt * 0.3;`);
      };
      material.customProgramCacheKey = () => 'wind' + k + '_' + amp;
      return material;
    }
    // Lathe helpers: organic wobble around the axis and a seam without a lighting crease
    function wobble(geo, seed, amt, yAmt) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
        if (r < 1e-3) continue;
        const a = Math.atan2(z, x), k = 1 + amt * (Math.sin(a * 5 + seed) * 0.6 + Math.sin(a * 9 - seed * 2 + y * 2.2) * 0.4);
        pos.setX(i, x * k); pos.setZ(i, z * k);
        if (yAmt) pos.setY(i, y + Math.sin(a * 6 + seed * 3) * yAmt * Math.min(1, -y));
      }
    }
    function fixSeam(geo, segs, n) {
      geo.computeVertexNormals();
      const nm = geo.attributes.normal;
      for (let j = 0; j < n; j++) {
        const a = j, b = segs * n + j, x = nm.getX(a) + nm.getX(b), y = nm.getY(a) + nm.getY(b), z = nm.getZ(a) + nm.getZ(b), l = Math.hypot(x, y, z) || 1;
        nm.setXYZ(a, x / l, y / l, z / l); nm.setXYZ(b, x / l, y / l, z / l);
      }
      nm.needsUpdate = true;
    }
    function lathe(profile, segs) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.002, r), y)), segs); }
    function paint(geo, fn) {
      const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) { fn(c, pos.getX(i), pos.getY(i), pos.getZ(i)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return geo;
    }
    const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    function island(x, top, z, r, opts) {
      const o = Object.assign({ rock: PAL.rockA, depth: 1, flowers: 0, tufts: 0, collide: true, cap: PAL.grass, grass: true }, opts || {});
      const g = new THREE.Group(); g.position.set(x, top, z); scene.add(g);
      const seed = (x * 1.7 + z * 0.9) % 6.28, SEG = Math.max(28, Math.round(r * 11));
      // grass cap with a soft rounded lip
      const capProf = [[0.93, -0.34], [1.0, -0.28], [1.035, -0.17], [1.012, -0.07], [0.95, -0.016], [0.72, 0], [0, 0]].map(([a, b]) => [a * r, b]);
      const capGeo = lathe(capProf, SEG); wobble(capGeo, seed, 0.028); fixSeam(capGeo, SEG, capProf.length);
      const cLight = new THREE.Color(o.cap).lerp(new THREE.Color('#FFFFFF'), 0.12), cEdge = new THREE.Color(o.cap === PAL.grass ? PAL.grassEdge : o.cap).lerp(new THREE.Color(o.cap), 0.3);
      paint(capGeo, (c, px, py, pz) => { const k = clamp((Math.hypot(px, pz) / r - 0.55) / 0.45, 0, 1); c.copy(cLight).lerp(cEdge, py < -0.05 ? 1 : k * 0.55); });
      const cap = mesh(capGeo, vcMat, 0, 0, 0, g); cap.receiveShadow = true;
      // earth and rock body, sand band on top and a darker tip
      const D = (0.9 + Math.max(1.2, r * 1.45)) * o.depth;
      const bodyProf = [[0, -D], [0.16, -D * 0.9], [0.4, -D * 0.68], [0.63, -D * 0.45], [0.8, -D * 0.25], [0.9, -0.55], [0.95, -0.3]].map(([a, b]) => [a * r, b]);
      const bodyGeo = lathe(bodyProf, SEG); wobble(bodyGeo, seed + 1, 0.075, 0.06); fixSeam(bodyGeo, SEG, bodyProf.length);
      const sand = new THREE.Color(PAL.sand), rock = new THREE.Color(o.rock), rockDark = new THREE.Color(o.rock).multiplyScalar(0.82);
      paint(bodyGeo, (c, px, py) => { if (py > -0.62) c.copy(sand).lerp(rock, clamp((-py - 0.42) / 0.2, 0, 1)); else c.copy(rock).lerp(rockDark, clamp((-py - 0.62) / (D * 0.8), 0, 1)); });
      const body = mesh(bodyGeo, vcMat, 0, 0, 0, g); body.receiveShadow = true;
      // hanging vines under the bigger islands
      if (r >= 2 && o.collide) {
        for (let i = 0; i < Math.round(r * 1.2); i++) {
          const a = seed + i * 2.4, rr0 = r * 0.93, len = 0.7 + ((i * 37) % 10) / 10 * 1.2;
          const p0 = new THREE.Vector3(Math.cos(a) * rr0, -0.3, Math.sin(a) * rr0);
          const pts = [p0, p0.clone().add(new THREE.Vector3(Math.cos(a) * 0.12, -len * 0.4, Math.sin(a) * 0.12)), p0.clone().add(new THREE.Vector3(Math.cos(a + 0.4) * 0.05, -len, Math.sin(a + 0.4) * 0.05))];
          const vine = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 5), mat(PAL.leaf), 0, 0, 0, g);
          for (let k = 1; k <= 3; k++) { const q = vine.geometry.parameters.path.getPoint(k / 3.4); const lf = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(k % 2 ? PAL.mint : PAL.leaf), q.x, q.y, q.z, g); lf.scale.set(1.3, 0.5, 0.8); lf.rotation.y = a + k; }
        }
      }
      if (o.collide) addCyl(x, z, r, top, top - 1.3);
      let sd = Math.abs(x * 13 + z * 7) + 1;
      const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      for (let i = 0; i < Math.round(o.flowers * 1.6); i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.86; decor.flowers.push([x + Math.cos(a) * d, top, z + Math.sin(a) * d, i]); }
      if (o.grass && o.collide && o.cap === PAL.grass) {
        const n = Math.round(r * r * 26);
        for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.95; decor.grass.push([x + Math.cos(a) * d, top, z + Math.sin(a) * d, 0.6 + rnd() * 0.8, rnd()]); }
      }
      return g;
    }
    function tree(x, top, z, size, kind, collide) {
      const s = size || 1, g = new THREE.Group(); g.position.set(x, top, z); scene.add(g);
      const tg = new THREE.CylinderGeometry(0.075 * s, 0.13 * s, 1.0 * s, 12, 4);
      { const pos = tg.attributes.position; for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) / s + 0.5); pos.setX(i, pos.getX(i) + k * k * 0.07 * s); } tg.computeVertexNormals(); }
      const trunk = mesh(tg, mat(PAL.trunk), 0, 0.5 * s, 0, g); trunk.castShadow = true;
      const crown = new THREE.Group(); g.add(crown);
      if (kind === 'pine') {
        crown.position.y = 0.05 * s;
        for (let i = 0; i < 3; i++) {
          const k = 1 - i * 0.24, geo = lathe([[0, 0], [0.56 * k, 0.03], [0.64 * k, 0.1], [0.55 * k, 0.24], [0.3 * k, 0.5], [0, 0.7 * k + 0.05]].map(([a, b]) => [a * s, b * s]), 20);
          const cn = mesh(geo, mat(i % 2 ? PAL.leaf : PAL.mint), 0.04 * s * i, (0.72 + i * 0.4) * s, 0, crown); cn.castShadow = true;
        }
      } else {
        crown.position.set(0.07 * s, 1.15 * s, 0);
        const blobs = [[0, 0, 0, 0.55, PAL.mint], [0.34, 0.1, 0.1, 0.4, PAL.leaf], [-0.32, 0.06, -0.06, 0.42, PAL.leaf], [0.04, 0.42, -0.04, 0.42, PAL.mint], [0.02, 0.04, 0.34, 0.36, PAL.mint], [-0.12, 0.3, 0.26, 0.26, '#C4E8D3']];
        for (const [bx, by, bz, br, bc] of blobs) { const b = mesh(new THREE.IcosahedronGeometry(br * s, 2), mat(bc), bx * s, by * s, bz * s, crown); b.castShadow = true; b.scale.y = 0.92; }
      }
      swayers.push({ obj: crown, ph: x * 0.7 + z * 0.3, amp: kind === 'pine' ? 0.025 : 0.04 });
      if (collide !== false) addCyl(x, z, 0.22 * s, top + 1.9 * s, top);
      return g;
    }
    function bush(x, top, z, s) {
      const g = new THREE.Group(); g.position.set(x, top, z); scene.add(g);
      const parts = [[-0.26, 0.2, 0, 0.27, PAL.leaf], [0, 0.26, 0.04, 0.32, PAL.mint], [0.27, 0.19, -0.02, 0.25, PAL.leaf], [0.05, 0.42, -0.04, 0.2, '#C4E8D3']];
      for (const [bx, by, bz, br, bc] of parts) { const b = mesh(new THREE.IcosahedronGeometry(br * s, 3), mat(bc), bx * s, by * s, bz * s, g); b.castShadow = true; }
      for (let i = 0; i < 4; i++) { const a = i * 1.7; mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), mat(i % 2 ? PAL.blush : PAL.white), Math.cos(a) * 0.26 * s, 0.4 * s + (i % 2) * 0.05, Math.sin(a) * 0.2 * s + 0.08, g); }
      return g;
    }
    function puff(x, y, z, s, parent, opacity) {
      const g = new THREE.Group(); g.position.set(x, y, z); (parent || scene).add(g);
      const m = opacity < 1 ? smoothMat(PAL.cloud, { transparent: true, opacity }) : smoothMat(PAL.cloud);
      const parts = [[0, 0, 0, 1], [0.8, -0.1, 0.1, 0.72], [-0.75, -0.12, -0.05, 0.7], [0.3, 0.35, -0.2, 0.62], [-0.3, 0.3, 0.25, 0.55]];
      for (const [px, py, pz, ps] of parts) { const b = mesh(new THREE.IcosahedronGeometry(ps * s * 0.6, 2), m, px * s * 0.7, py * s * 0.6, pz * s * 0.6, g); b.scale.y = 0.75; }
      return g;
    }
    const starGeo = (() => {
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.15 : 0.34; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1 });
      geo.center(); return geo;
    })();
    const starMat = mat(PAL.star, { emissive: new THREE.Color(PAL.star), emissiveIntensity: 0.45 });
    const goldMat = mat('#F7C948', { emissive: new THREE.Color('#F7C948'), emissiveIntensity: 0.6 });

    // Far scenery: drifting islands, cloud banks, a rainbow
    (function scenery() {
      let sd = 77; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1, x = side * (18 + rnd() * 26), z = 14 - rnd() * 140, y = -9 + rnd() * 11, r = 1.2 + rnd() * 2.6;
        const g = island(x, y, z, r, { rock: [PAL.rockA, PAL.rockB, PAL.rockC][i % 3], collide: false, flowers: 4 });
        if (rnd() < 0.7) tree(x + (rnd() - 0.5) * r, y, z + (rnd() - 0.5) * r, 0.8 + rnd() * 0.5, rnd() < 0.5 ? 'pine' : 'round', false);
        bobbers.push({ obj: g, base: 0, amp: 0.2 + rnd() * 0.3, sp: 0.4 + rnd() * 0.4, ph: rnd() * 6 });
      }
      for (let i = 0; i < 26; i++) {
        const x = (rnd() < 0.5 ? -1 : 1) * (9 + rnd() * 40), z = 20 - rnd() * 150, y = -9 - rnd() * 6;
        const c = puff(x, y, z, 2.2 + rnd() * 2.8, null, 1); bobbers.push({ obj: c, base: 0, amp: 0.3, sp: 0.2 + rnd() * 0.2, ph: rnd() * 6, drift: 0.25 + rnd() * 0.3 });
      }
      for (let i = 0; i < 10; i++) { const c = puff((rnd() < 0.5 ? -1 : 1) * (17 + rnd() * 18), 10 + rnd() * 9, 10 - rnd() * 130, 1.4 + rnd() * 1.6, null, 0.9); bobbers.push({ obj: c, base: 0, amp: 0.2, sp: 0.3, ph: rnd() * 6 }); }
      const bows = ['#F4B4C0', '#F6BFA6', '#F6D374', '#A9DCC3', '#A8C8EC', '#C9B8EA'];
      bows.forEach((c, i) => { const t = mesh(new THREE.TorusGeometry(34 - i * 0.9, 0.48, 6, 64, Math.PI), basic(c, { transparent: true, opacity: dark ? 0.25 : 0.42, fog: true }), 6, -14, -150); t.renderOrder = -1; });
      const sunDisc = halo(dark ? '#E9E2FF' : '#FFF4D6', 26, dark ? 0.5 : 0.85); sunDisc.position.set(-38, 34, -160); scene.add(sunDisc);
    })();

    // Start island with a bounce mushroom
    island(0, 0, 0, 4.2, { rock: PAL.rockB, flowers: 22, tufts: 26 });
    tree(-2.6, 0, 1.6, 1.0, 'round'); tree(2.8, 0, -1.4, 0.9, 'pine'); bush(2.4, 0, 2.0, 1);
    const mushroom = (() => {
      const g = new THREE.Group(); g.position.set(-2.4, 0, -1.4); g.rotation.y = 0.35; scene.add(g);
      const stem = mesh(lathe([[0, 0], [0.2, 0], [0.225, 0.05], [0.205, 0.22], [0.17, 0.4], [0, 0.42]], 28), mat('#FFF4E8'), 0, 0, 0, g); stem.castShadow = true;
      const inkM = smoothMat(PAL.ink);
      for (const sx of [-1, 1]) {
        const e = mesh(new THREE.SphereGeometry(0.028, 12, 10), inkM, sx * 0.07, 0.24, 0.185, g); e.scale.set(0.85, 1.2, 0.5);
        mesh(new THREE.SphereGeometry(0.009, 6, 6), basic('#FFFFFF'), sx * 0.07 + 0.008, 0.252, 0.198, g);
        const bl = mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false }), sx * 0.13, 0.205, 0.165, g); bl.lookAt(g.position.x + sx * 0.6, 0.2, g.position.z + 0.6);
      }
      mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.03, 0, 0), new THREE.Vector3(0, -0.022, 0.004), new THREE.Vector3(0.03, 0, 0)), 10, 0.006, 5), inkM, 0, 0.2, 0.2, g);
      const cap = new THREE.Group(); cap.position.y = 0.36; g.add(cap);
      const dome = mesh(new THREE.SphereGeometry(0.55, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(PAL.thorn), 0, 0, 0, cap); dome.scale.y = 0.62; dome.castShadow = true;
      const under = mesh(new THREE.CircleGeometry(0.55, 40), mat('#F6DCE4'), 0, 0.001, 0, cap); under.rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) { const th = i < 5 ? 0.95 : 0.35, ph = i * 1.26 + (i >= 5 ? 0.6 : 0); const v = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th) * 0.62, Math.sin(th) * Math.sin(ph)).multiplyScalar(0.55); const d = mesh(new THREE.SphereGeometry(i < 5 ? 0.075 : 0.06, 12, 8), mat('#FFFFFF'), v.x, v.y, v.z, cap); d.scale.y = 0.4; d.lookAt(v.x * 3, v.y * 3 + 0.36, v.z * 3); }
      const c = addCyl(-2.4, -1.4, 0.55, 0.62, 0, { kind: 'bounce' });
      return { g, cap, c, squash: 0 };
    })();
    // Stepping stones, a sliding stone and a side pillar
    island(0.4, 0.3, -6.3, 0.95, { rock: PAL.rockC, depth: 0.8, tufts: 3 });
    island(-1.2, 0.8, -8.9, 0.9, { rock: PAL.rockA, depth: 0.8, tufts: 2 });
    island(0.6, 1.3, -11.5, 0.9, { rock: PAL.rockB, depth: 0.8, tufts: 2 });
    island(4.6, 2.2, -14.6, 0.7, { rock: PAL.rockC, depth: 1.2 });
    const slider = (() => {
      const g = new THREE.Group(); scene.add(g);
      const base = mesh(roundedBox(2, 0.38, 2, 0.12, 5), mat(PAL.rockA), 0, -0.25, 0, g); base.castShadow = true; base.receiveShadow = true;
      const top = mesh(roundedBox(2.04, 0.12, 2.04, 0.05, 4), mat(PAL.grass), 0, -0.06, 0, g); top.receiveShadow = true;
      const c = addBox(0, 1.0, 1.3, -14.6, 1, 1, { moving: true });
      return { g, c };
    })();

    // Island with cliff, waterfall and the hidden cave
    island(0, 1, -21.5, 5.4, { rock: PAL.rockA, flowers: 20, tufts: 28, depth: 1.1 });
    tree(-3.6, 1, -20.6, 1.1, 'round'); tree(3.9, 1, -19.4, 0.85, 'pine'); bush(-3.2, 1, -23.6, 0.9);
    const caveMats = [];
    function cliffBlock(x0, x1, y0, y1, z0, z1, color) {
      const m = mat(color).clone(); m.transparent = true; caveMats.push(m);
      const b = mesh(roundedBox(x1 - x0, y1 - y0, z1 - z0, 0.13, 6), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      b.castShadow = true; b.receiveShadow = true;
      addBox((x0 + x1) / 2, y0, y1, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2);
      return b;
    }
    const CL = LAY.cliff, CV = LAY.cave;
    cliffBlock(CL.x0, CV.x0, 1, CL.top, CL.z0, CL.z1, PAL.rockB);
    cliffBlock(CV.x1, CL.x1, 1, CL.top, CL.z0, CL.z1, PAL.rockB);
    cliffBlock(CV.x0, CV.x1, 1, CL.top, CL.z0, CV.z0, PAL.rockB);
    cliffBlock(CV.x0, CV.x1, CV.y1, CL.top, CV.z0, CV.z1, PAL.rockB);
    { const m = mat(PAL.grass).clone(); m.transparent = true; caveMats.push(m); const capTop = mesh(roundedBox(CL.x1 - CL.x0 + 0.1, 0.12, CL.z1 - CL.z0 + 0.1, 0.05, 4), m, (CL.x0 + CL.x1) / 2, CL.top + 0.02, (CL.z0 + CL.z1) / 2); capTop.receiveShadow = true; }
    // stairs up the cliff
    { const st = mesh(roundedBox(2, 1.6, 1.6, 0.14, 6), mat(PAL.rockC), -2.4, 1.8, -24.2); st.castShadow = true; st.receiveShadow = true; addBox(-2.4, 1, 2.6, -24.2, 1, 0.8); mesh(roundedBox(2.06, 0.12, 1.66, 0.05, 4), mat(PAL.grass), -2.4, 2.6, -24.2).receiveShadow = true; }
    // water: stream on top, falling sheet, pool
    const waterCv = document.createElement('canvas'); waterCv.width = 32; waterCv.height = 64;
    { const g = waterCv.getContext('2d'); g.fillStyle = PAL.water; g.fillRect(0, 0, 32, 64); g.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 14; i++) g.fillRect((i * 7) % 32, (i * 13) % 64, 2, 10 + (i % 3) * 6); }
    const waterTex = new THREE.CanvasTexture(waterCv); waterTex.colorSpace = THREE.SRGBColorSpace; waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(2, 2);
    const waterMat = new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });
    const fall = mesh(new THREE.PlaneGeometry(CV.x1 - CV.x0 + 0.3, CL.top - 1 + 0.1), waterMat, (CV.x0 + CV.x1) / 2, (CL.top + 1) / 2, CV.z1 + 0.06);
    fall.renderOrder = 2;
    const streamTex = waterTex.clone(); streamTex.needsUpdate = true; streamTex.repeat.set(1, 2);
    const stream = mesh(new THREE.PlaneGeometry(CV.x1 - CV.x0, CL.z1 - CL.z0), new THREE.MeshBasicMaterial({ map: streamTex, transparent: true, opacity: 0.9, depthWrite: false }), (CV.x0 + CV.x1) / 2, CL.top + 0.1, (CL.z0 + CL.z1) / 2);
    stream.rotation.x = -Math.PI / 2;
    const pool = mesh(new THREE.CircleGeometry(1.15, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.water), transparent: true, opacity: 0.8, depthWrite: false }), (CV.x0 + CV.x1) / 2, 1.03, CV.z1 + 0.85);
    pool.rotation.x = -Math.PI / 2;
    const foam = [];
    for (let i = 0; i < 5; i++) foam.push(mesh(new THREE.IcosahedronGeometry(0.16, 2), smoothMat(PAL.white), CV.x0 + 0.2 + i * 0.3, 1.08, CV.z1 + 0.25));
    // treasure chest inside the cave
    const chest = (() => {
      const g = new THREE.Group(); g.position.set((CV.x0 + CV.x1) / 2, 1, CV.z0 + 0.5); scene.add(g);
      const box = mesh(new THREE.BoxGeometry(0.86, 0.46, 0.56), mat(PAL.wood), 0, 0.23, 0, g); box.castShadow = true;
      mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6), mat('#F7C948'), 0, 0.38, 0, g);
      const lid = new THREE.Group(); lid.position.set(0, 0.46, -0.28); g.add(lid);
      mesh(new THREE.BoxGeometry(0.88, 0.18, 0.58), mat(PAL.wood), 0, 0.09, 0.29, lid);
      mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), mat('#F7C948'), 0, 0.02, 0.6, lid);
      const gstar = new THREE.Mesh(starGeo, goldMat); gstar.scale.setScalar(1.25); gstar.position.set(0, 0.3, 0); gstar.visible = false; g.add(gstar);
      const glow = halo('#F7C948', 1.8, 0); glow.position.set(0, 0.6, 0); g.add(glow);
      addBox(g.position.x, 1, 1.46, g.position.z, 0.43, 0.28);
      return { g, lid, gstar, glow, open: 0, state: 'closed', t: 0 };
    })();

    // Switch island, rotating bridge, spinning disc
    island(0.8, 4.2, -30.6, 3, { rock: PAL.rockC, flowers: 10, tufts: 14 });
    tree(2.6, 4.2, -29.6, 0.8, 'pine');
    const button = (() => {
      const g = new THREE.Group(); g.position.set(1.8, 4.2, -31.6); scene.add(g);
      mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.12, 18), mat(PAL.stone), 0, 0.06, 0, g);
      const cap = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 18), mat(PAL.button), 0, 0.16, 0, g);
      const ring = halo(PAL.button, 1.6, 0.0); ring.position.y = 0.3; g.add(ring);
      return { g, cap, ring, x: 1.8, z: -31.6, down: false };
    })();
    const bridge = (() => {
      const B = LAY.bridge, g = new THREE.Group(); g.position.set(B.x, B.top, B.z); scene.add(g);
      const n = 12;
      for (let i = 0; i < n; i++) { const pl = mesh(new THREE.BoxGeometry(1.5, 0.18, 0.72), mat(i % 2 ? PAL.wood : PAL.sand), 0, -0.09, -B.half + 0.4 + i * (2 * B.half - 0.8) / (n - 1), g); pl.castShadow = true; pl.receiveShadow = true; }
      for (const s of [-1, 1]) { const rope = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2 * B.half, 5), mat(PAL.trunk), s * 0.7, 0.42, 0, g); rope.rotation.x = Math.PI / 2; for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5), mat(PAL.trunk), s * 0.7, 0.2, -B.half + 0.3 + i * (2 * B.half - 0.6) / 4, g); }
      const hub = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 10), mat(PAL.button), 0, 0.05, 0, g);
      mesh(new THREE.CylinderGeometry(0.16, 0.16, 6, 6), mat(PAL.trunk), B.x, B.top - 3.2, B.z);
      island(B.x, B.top - 6, B.z, 1.0, { rock: PAL.rockB, collide: false });
      const c = addBox(B.x, B.top - 0.4, B.top, B.z, 0.75, B.half, { moving: true });
      return { g, hub, c, yaw: Math.PI / 2, from: Math.PI / 2, to: Math.PI / 2, t: 1, dur: 1, openT: 0, tick: 0 };
    })();
    const disc = (() => {
      const D = LAY.disc, g = new THREE.Group(); g.position.set(D.x, 0, D.z); scene.add(g);
      const geo = new THREE.CylinderGeometry(D.r, D.r * 0.96, 0.5, 24, 1).toNonIndexed();
      const pos = geo.attributes.position, colors = [], ca = new THREE.Color(PAL.stone), cb = new THREE.Color(PAL.stone2);
      for (let i = 0; i < pos.count; i += 3) {
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
        const seg = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 8) % 2, c = seg ? ca : cb;
        for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const top = mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 0, D.top - 0.25, 0, g); top.receiveShadow = true;
      const rock = mesh(jitter(new THREE.ConeGeometry(D.r * 0.9, 5, 24, 2), 0.4), mat(PAL.rockA), 0, D.top - 0.5 - 2.5, 0, g); rock.rotation.x = Math.PI;
      const post = mesh(new THREE.CylinderGeometry(0.5, 0.56, 1.4, 12), mat(PAL.lav), D.x, D.top + 0.7, D.z); post.castShadow = true;
      addCyl(D.x, D.z, 0.5, D.top + 1.4, D.top);
      const bar = new THREE.Group(); bar.position.set(D.x, D.top + 0.62, D.z); scene.add(bar);
      const cap = mesh(new THREE.CapsuleGeometry(0.22, 2 * D.r - 1.6, 4, 10), smoothMat(PAL.thorn), 0, 0, 0, bar); cap.rotation.z = Math.PI / 2; cap.castShadow = true;
      for (let i = -3; i <= 3; i++) if (i) mesh(new THREE.TorusGeometry(0.23, 0.04, 5, 12), mat(PAL.white), i * 0.6, 0, 0, bar).rotation.y = Math.PI / 2;
      const c = addCyl(D.x, D.z, D.r, D.top, D.top - 1.2, { moving: true });
      const barC = addBox(D.x, D.top + 0.4, D.top + 0.86, D.z, D.r - 0.6, 0.24, { kind: 'sweeper', moving: true });
      return { g, bar, c, barC, yaw: 0, barYaw: 0 };
    })();
    // Cloud dock and the flying cloud
    island(0.8, 4.2, -55.2, 2.4, { rock: PAL.rockB, flowers: 8, tufts: 10 });
    bush(-0.8, 4.2, -56.4, 0.8);
    const cloudPath = new THREE.CatmullRomCurve3(CLOUD_PATH.map((v) => new THREE.Vector3(v[0], v[1], v[2])));
    const cloudLen = cloudPath.getLength();
    const cloud = (() => {
      const g = new THREE.Group(); scene.add(g);
      const body = puff(0, -0.8, 0, 2.3, g, 1);
      body.scale.set(1, 0.8, 1.15);
      body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const c = addBox(LAY.dock[0], LAY.dock[1] - 0.6, LAY.dock[1], LAY.dock[2], 1.3, 1.3, { moving: true });
      // dotted route preview
      const dots = [];
      for (let i = 1; i < 34; i++) { const pt = cloudPath.getPointAt(i / 34); const d = mesh(new THREE.SphereGeometry(0.07, 6, 4), basic(PAL.white, { transparent: true, opacity: 0.7 }), pt.x, pt.y - 0.3, pt.z); dots.push(d); }
      return { g, body, c, u: 0, state: 'dock', wait: 0, dots };
    })();
    function routeFrame(u) {
      const pt = cloudPath.getPointAt(clamp(u, 0, 1)), tg = cloudPath.getTangentAt(clamp(u, 0, 1));
      const lat = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      return { pt, lat };
    }
    const spikes = [];
    function spikeBall(x, y, z, r) {
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      mesh(new THREE.IcosahedronGeometry(r * 0.72, 0), mat(PAL.thorn), 0, 0, 0, g);
      const geo = new THREE.ConeGeometry(r * 0.22, r * 0.7, 5);
      const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position, seen = new Set();
      for (let i = 0; i < dirs.count; i++) {
        const v = new THREE.Vector3(dirs.getX(i), dirs.getY(i), dirs.getZ(i)).normalize(), k = v.toArray().map((n) => n.toFixed(2)).join();
        if (seen.has(k)) continue; seen.add(k);
        const s = mesh(geo, mat(PAL.white), v.x * r * 0.8, v.y * r * 0.8, v.z * r * 0.8, g); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      }
      g.children.forEach((m) => { m.castShadow = true; });
      const o = { g, x, y, z, r, base: y, ph: x + z }; spikes.push(o); return o;
    }
    { const a = routeFrame(0.5); spikeBall(a.pt.x, a.pt.y + 0.55, a.pt.z, 0.42); }
    { const a = routeFrame(0.83); spikeBall(a.pt.x + a.lat.x * 0.75, a.pt.y + 0.55, a.pt.z + a.lat.z * 0.75, 0.42); }

    // Boss arena
    island(LAY.arena.x, LAY.arena.top, LAY.arena.z, LAY.arena.r, { rock: PAL.rockC, cap: PAL.snow, flowers: 0, tufts: 0, depth: 0.9 });
    { const ring = mesh(new THREE.RingGeometry(LAY.arena.r - 0.9, LAY.arena.r - 0.05, 36), mat(PAL.grass, { side: THREE.DoubleSide }), LAY.arena.x, LAY.arena.top + 0.012, LAY.arena.z); ring.rotation.x = -Math.PI / 2; ring.receiveShadow = true; }
    for (let i = 0; i < 10; i++) { if (Math.abs(i - 4.5) < 1) continue; const a = -Math.PI / 2 + (i - 4.5) * 0.45; const x = LAY.arena.x + Math.cos(a) * (LAY.arena.r - 0.5), z = LAY.arena.z + Math.sin(a) * (LAY.arena.r - 0.5); tree(x, LAY.arena.top, z, 0.7 + (i % 3) * 0.15, 'pine', false); }
    (function arenaWall() {
      const A = LAY.arena, n = 30, rr = A.r - 0.35, seg = (Math.PI * 2 * rr) / n;
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * Math.PI * 2, x = A.x + Math.sin(a) * rr, z = A.z + Math.cos(a) * rr;
        if (Math.abs(angDiff(a, 0)) < 0.26) continue; // opening towards the cloud
        const b = mesh(new THREE.CapsuleGeometry(0.26, seg * 0.62, 3, 8), smoothMat(PAL.snow), x, A.top + 0.3, z);
        b.rotation.set(0, a, Math.PI / 2); b.castShadow = true; b.receiveShadow = true;
        addBox(x, A.top, A.top + 0.62, z, seg * 0.55, 0.28, { yaw: a });
      }
    })();
    // snow gate that closes the arena while Brummel is awake
    const gate = (() => {
      const A = LAY.arena, z = A.z + A.r - 0.35;
      const g = new THREE.Group(); g.position.set(A.x, A.top - 1.2, z); scene.add(g);
      for (let i = -1; i <= 1; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.5, 1), smoothMat(PAL.snow), i * 0.85, 0.42, 0, g); b.scale.set(1, 0.85, 0.7); b.castShadow = true; }
      const c = addBox(A.x, A.top, A.top + 0.8, z, 1.6, 0.35, { off: true });
      return { g, c, up: 0 };
    })();
    const door = (() => {
      const g = new THREE.Group(); g.position.set(LAY.door[0], LAY.door[1] - 2.4, LAY.door[2]); scene.add(g);
      const frame = mesh(new THREE.TorusGeometry(0.62, 0.14, 8, 18, Math.PI), mat(PAL.lav), 0, 1.15, 0, g);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.28, 1.15, 0.28), mat(PAL.lav), s * 0.62, 0.575, 0, g);
      const panel = mesh(new THREE.PlaneGeometry(1.1, 1.7), basic(PAL.doorGlow, { transparent: true, opacity: 0.95, side: THREE.DoubleSide }), 0, 0.85, 0, g);
      const glow = halo(PAL.doorGlow, 3.4, 0.0); glow.position.y = 1; g.add(glow);
      frame.castShadow = true;
      return { g, panel, glow, rise: 0, open: false };
    })();
    // Flags
    const flags = LAY.flags.map(([x, y, z], i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.7, 6), mat(PAL.white), 0, 0.85, 0, g);
      mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(PAL.star), 0, 1.72, 0, g);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.62, 0, 0, 1.12, 0, 0.62, 1.37, 0], 3)); geo.computeVertexNormals();
      const clothMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.door), side: THREE.DoubleSide });
      const cloth = mesh(geo, clothMat, 0, 0, 0, g);
      return { g, cloth, clothMat, x, y, z, on: false, idx: i };
    });
    // Stars
    const stars = [];
    function addStar(x, y, z, attach) {
      const m = new THREE.Mesh(starGeo, starMat); m.position.set(x, y, z); m.castShadow = true; scene.add(m);
      const h = halo(PAL.star, 1.3, 0.45); m.add(h);
      const s = { m, x, y, z, got: false, attach }; stars.push(s); return s;
    }
    addStar(-2.4, 4.6, -1.4);
    addStar(4.6, 3.0, -14.6);
    addStar(2.5, 5.0, -25.2);
    addStar(0, 4.9, 0, { disc: true, r: 3.1, a: 0.8 });
    { const a = routeFrame(0.3); addStar(a.pt.x - a.lat.x * 0.9, a.pt.y + 0.6, a.pt.z - a.lat.z * 0.9); }
    { const a = routeFrame(0.66); addStar(a.pt.x + a.lat.x * 0.95, a.pt.y + 1.65, a.pt.z + a.lat.z * 0.95); }

    // Grass blades and flowers (instanced, swaying in the wind)
    (function buildInstanced() {
      const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), tint = new THREE.Color();
      // crossed, tapered blade with a colour ramp from base to tip
      const blade = (() => {
        const pos = [], col = [], nor = [], idx = [], segs = 3, base = new THREE.Color(PAL.grass).lerp(new THREE.Color(PAL.grassEdge), 0.55), tip = new THREE.Color(PAL.grass).lerp(new THREE.Color('#FFFFFF'), 0.35);
        for (let pl = 0; pl < 2; pl++) {
          const o = pos.length / 3, ax = pl ? 0 : 1, az = pl ? 1 : 0;
          for (let i = 0; i <= segs; i++) { const t = i / segs, w = 0.05 * Math.sqrt(1 - t * 0.85) * (1 - t * 0.55); for (const sg of [-1, 1]) { pos.push(ax * w * sg, t, az * w * sg); const c = base.clone().lerp(tip, t); col.push(c.r, c.g, c.b); nor.push(0, 1, 0); } }
          for (let i = 0; i < segs; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2, a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx);
        return geo;
      })();
      if (decor.grass.length) {
        const gm = new THREE.InstancedMesh(blade, windMat(new THREE.MeshLambertMaterial({ vertexColors: true }), 1, 0.09), decor.grass.length);
        decor.grass.forEach(([x, y, z, h, rv], i) => { v.set(x, y - 0.01, z); sc.set(1, 0.09 * h + 0.04, 1); q.identity(); tm.compose(v, q, sc); gm.setMatrixAt(i, tm); tint.setHSL(0.36 + rv * 0.08, 0.3, 0.92 + rv * 0.14); gm.setColorAt(i, tint); });
        gm.receiveShadow = true; scene.add(gm);
      }
      if (decor.flowers.length) {
        const STEM = 0.19;
        const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, STEM, 4, 2); stemGeo.translate(0, STEM / 2, 0);
        const petal = new THREE.Shape();
        for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2, rr2 = 0.035 + 0.035 * Math.abs(Math.cos(a * 2.5)); const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; if (i) petal.lineTo(px, py); else petal.moveTo(px, py); }
        const headGeo = new THREE.ShapeGeometry(petal, 2); headGeo.rotateX(-Math.PI / 2); headGeo.translate(0, STEM, 0);
        const midGeo = new THREE.SphereGeometry(0.022, 8, 6); midGeo.scale(1, 0.6, 1); midGeo.translate(0, STEM + 0.006, 0);
        const k = 1 / STEM, n = decor.flowers.length;
        const stems = new THREE.InstancedMesh(stemGeo, windMat(new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.leaf) }), k, 0.06), n);
        const heads = new THREE.InstancedMesh(headGeo, windMat(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), k, 0.06), n);
        const mids = new THREE.InstancedMesh(midGeo, windMat(new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.star) }), k, 0.06), n);
        const fc = [PAL.blush, PAL.white, PAL.lav, PAL.peach, PAL.star];
        decor.flowers.forEach(([x, y, z, i2], i) => { const s2 = 0.8 + ((i2 * 7) % 5) * 0.1; v.set(x, y, z); sc.set(s2, s2, s2); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i2 * 1.3); tm.compose(v, q, sc); stems.setMatrixAt(i, tm); heads.setMatrixAt(i, tm); mids.setMatrixAt(i, tm); heads.setColorAt(i, tint.set(fc[i2 % fc.length])); });
        scene.add(stems, heads, mids);
      }
    })();

    // Floating pollen sparkles around Mimo
    const SPARKS = 150;
    const sparkGeo = new THREE.BufferGeometry(), sparkPos = new Float32Array(SPARKS * 3), sparkCol = new Float32Array(SPARKS * 3), sparkSeed = [];
    for (let i = 0; i < SPARKS; i++) { sparkPos[i * 3] = (Math.random() - 0.5) * 24; sparkPos[i * 3 + 1] = Math.random() * 8 - 2; sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 28; sparkSeed.push(Math.random() * 6.28); }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3)); sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.16, map: haloTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending }));
    sparks.frustumCulled = false; scene.add(sparks);
    const sparkTint = new THREE.Color(dark ? '#FFF1B8' : '#FFF7DA');

    // Butterflies
    const butterflies = [];
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.05, 0.14, 0.2, 0.15, 0.19, 0.04); wingShape.bezierCurveTo(0.2, -0.04, 0.12, -0.13, 0.03, -0.09); wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 6); wingGeo.rotateX(-Math.PI / 2);
    [[-1, 1.1, 0.4, PAL.lav], [2, 1.0, -2.2, PAL.peach], [2.2, 2.1, -19.5, PAL.blush], [-3, 2.2, -23, '#A8C8EC'], [0.6, 5.3, -30.5, PAL.star], [0.8, 5.3, -55.4, PAL.lav], [-3.4, 10.4, -97, PAL.blush], [4.2, 10.6, -101, PAL.peach]].forEach(([cx, cy, cz, col], i) => {
      const g = new THREE.Group(); scene.add(g);
      const wm = new THREE.MeshLambertMaterial({ color: new THREE.Color(col), side: THREE.DoubleSide });
      const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
      const a = new THREE.Mesh(wingGeo, wm); a.scale.x = -1; wl.add(a); const b = new THREE.Mesh(wingGeo, wm); wr.add(b);
      const bd = mesh(new THREE.CapsuleGeometry(0.012, 0.08, 3, 6), smoothMat(PAL.ink), 0, 0, 0, g); bd.rotation.x = Math.PI / 2;
      butterflies.push({ g, wl, wr, cx, cy, cz, ph: i * 1.7, rx: 1.2 + (i % 3) * 0.5, rz: 1.0 + (i % 2) * 0.7, sp: 0.35 + (i % 4) * 0.08, lx: cx, lz: cz });
    });

    // Mimo's little house with a smoking chimney, and a signpost
    (function homeAndSign() {
      const g = new THREE.Group(); g.position.set(3.0, 0, 0.7); g.rotation.y = -1.25; scene.add(g); g.updateMatrixWorld(true);
      const walls = mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.9, 32), mat('#FFF3E6'), 0, 0.45, 0, g); walls.castShadow = true; walls.receiveShadow = true;
      const roof = mesh(lathe([[0, 1.55], [0.18, 1.45], [0.5, 1.12], [0.84, 0.86], [0.88, 0.8], [0, 0.8]].reverse(), 32), mat(PAL.door), 0, 0, 0, g); roof.castShadow = true;
      const doorShape = new THREE.Shape(); doorShape.moveTo(-0.17, 0); doorShape.lineTo(-0.17, 0.32); doorShape.absarc(0, 0.32, 0.17, Math.PI, 0, true); doorShape.lineTo(0.17, 0); doorShape.lineTo(-0.17, 0);
      const door = mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 12 }), mat(PAL.wood), 0, 0.02, 0.645, g);
      mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#F7C948'), 0.1, 0.24, 0.7, g);
      const win = mesh(new THREE.CircleGeometry(0.13, 24), basic('#FFE9A8'), 0.0, 0.62, 0.0, g); win.position.set(Math.sin(0.9) * 0.66, 0.6, Math.cos(0.9) * 0.66); win.lookAt(g.localToWorld(new THREE.Vector3(Math.sin(0.9) * 2, 0.6, Math.cos(0.9) * 2)));
      const fr = mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24), mat(PAL.wood), 0, 0, 0, g); fr.position.copy(win.position); fr.quaternion.copy(win.quaternion);
      const chim = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.4, 12), mat(PAL.rockB), -0.3, 1.25, -0.2, g); chim.castShadow = true;
      smokes.push({ origin: g.localToWorld(new THREE.Vector3(-0.3, 1.5, -0.2)), t: 0, list: [] });
      addCyl(3.0, 0.7, 0.72, 1.5, 0);
      // signpost
      const sg = new THREE.Group(); sg.position.set(-1.3, 0, -3.0); scene.add(sg);
      mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 10), mat(PAL.trunk), 0, 0.45, 0, sg).castShadow = true;
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c2 = cv.getContext('2d');
      c2.fillStyle = PAL.wood; c2.beginPath(); c2.moveTo(8, 10); c2.lineTo(214, 10); c2.lineTo(248, 48); c2.lineTo(214, 86); c2.lineTo(8, 86); c2.closePath(); c2.fill();
      c2.fillStyle = PAL.ink; c2.font = '600 34px Fredoka, Nunito, sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('Zur Tür', 112, 50);
      const st = new THREE.CanvasTexture(cv); st.colorSpace = THREE.SRGBColorSpace;
      const board = mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshLambertMaterial({ map: st, transparent: true, side: THREE.DoubleSide }), 0.08, 0.78, 0.05, sg); board.rotation.y = Math.PI / 2 - 0.75;
    })();
    // ---------- Mimo ----------
    const mimo = window.Mimo3D.build(THREE, { scene, PAL, outfit: host.outfit, mat, smoothMat, basic, mesh, halo, blushTex, starGeo, starMat });

    const flakeTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    // Brummel, the sleepy snowball: scarf, coal buttons, mittens, and an ice crown once his beanie is gone
    const BOSS_SIZE = 1.3;
    const ICE = { color: '#D6F1FF', glow: '#6FC3FF' };
    const iceMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(ICE.color), emissive: new THREE.Color(ICE.glow), emissiveIntensity: 0.28, transparent: true, opacity: 0.92 });
    const boss = (function buildBoss() {
      const root = new THREE.Group(); scene.add(root);
      const fig = new THREE.Group(); fig.scale.setScalar(BOSS_SIZE); root.add(fig);
      const roll = new THREE.Group(); roll.position.y = 0.82; fig.add(roll);
      const snowM = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.snow) }), inkM = smoothMat(PAL.ink);
      const body = mesh(new THREE.SphereGeometry(0.86, 32, 24), snowM, 0, 0, 0, roll); body.scale.set(1.08, 0.96, 1.08); body.castShadow = true;
      // a few snow lumps on the back so he is not a perfect ball
      for (let i = 0; i < 7; i++) { const a = Math.PI + 0.35 + i * 0.4, e = ((i % 3) - 1) * 0.45; mesh(new THREE.SphereGeometry(0.15 + (i % 2) * 0.05, 10, 8), snowM, Math.sin(a) * Math.cos(e) * 0.9, Math.sin(e) * 0.8, Math.cos(a) * Math.cos(e) * 0.9, roll); }
      const face = new THREE.Group(); face.position.y = 0.06; face.position.z = -0.02; roll.add(face);
      const eyes = [], pupils = [], brows = [];
      const pupilGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7FD0FF') });
      for (const s of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(s * 0.28, 0.2, 0.76); face.add(w); eyes.push(w);
        const pu = mesh(new THREE.SphereGeometry(0.105, 14, 12), inkM, s * 0.28, 0.2, 0.78, face); pu.scale.set(1, 1.2, 0.5); pupils.push(pu);
        mesh(new THREE.SphereGeometry(0.03, 6, 6), basic('#FFFFFF'), s * 0.28 + 0.035, 0.25, 0.84, face);
        const br = mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), inkM, s * 0.28, 0.41, 0.76, face); br.rotation.z = -s * 0.38; brows.push(br);
        const bl = mesh(new THREE.SphereGeometry(0.1, 10, 8), smoothMat(PAL.blush), s * 0.5, 0.02, 0.66, face); bl.scale.set(1, 0.55, 0.4);
      }
      const nose = mesh(new THREE.ConeGeometry(0.08, 0.36, 8), smoothMat(PAL.carrot), 0, 0.08, 0.98, face); nose.rotation.x = Math.PI / 2;
      const mouth = mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14, Math.PI), inkM, 0, -0.14, 0.83, face);
      // knitted scarf with stripes and two swinging tails
      const stripeTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const g = cv.getContext('2d'); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : PAL.thorn; g.fillRect(i * 16, 0, 16, 8); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(9, 1); return t; })();
      const scarfM = new THREE.MeshLambertMaterial({ map: stripeTex });
      const scarf = mesh(new THREE.TorusGeometry(0.86, 0.11, 10, 48), scarfM, 0, -0.2, 0, roll); scarf.rotation.x = Math.PI / 2; scarf.scale.set(1.06, 1.06, 1); scarf.castShadow = true;
      const tails = new THREE.Group(); tails.position.set(0.44, -0.24, 0.8); roll.add(tails);
      for (const [x, h, r] of [[0, 0.52, 0.12], [0.13, 0.42, -0.08]]) { const t = mesh(new THREE.BoxGeometry(0.17, h, 0.05), scarfM, x, -h / 2, 0, tails); t.rotation.z = r; }
      // coal buttons
      for (const [y, z] of [[-0.47, 0.79], [-0.65, 0.62]]) mesh(new THREE.SphereGeometry(0.06, 10, 8), inkM, 0, y, z, roll);
      const hat = new THREE.Group(); hat.position.y = 0.62; roll.add(hat);
      const beanie = mesh(new THREE.SphereGeometry(0.56, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), smoothMat(PAL.mint), 0, 0, 0, hat); beanie.scale.y = 0.72; beanie.castShadow = true;
      mesh(new THREE.TorusGeometry(0.53, 0.08, 8, 22), smoothMat('#FFFFFF'), 0, 0.02, 0, hat).rotation.x = Math.PI / 2;
      mesh(new THREE.SphereGeometry(0.16, 10, 8), smoothMat('#FFFFFF'), 0, 0.46, 0, hat);
      // ice crown, shown once the beanie has flown off
      const crown = new THREE.Group(); crown.position.y = 0.64; crown.visible = false; roll.add(crown);
      mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 24), iceMat, 0, 0, 0, crown).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, h = i % 2 ? 0.26 : 0.4; const c = mesh(new THREE.ConeGeometry(0.075, h, 5), iceMat, Math.sin(a) * 0.33, h / 2, Math.cos(a) * 0.33, crown); c.rotation.z = -Math.sin(a) * 0.15; c.rotation.x = Math.cos(a) * 0.15; }
      const arms = [];
      for (const s of [-1, 1]) {
        const a = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.62, 5), mat(PAL.trunk), s * 1.05, 0.1, 0, roll); a.rotation.z = s * 1.0; arms.push(a);
        const mit = mesh(new THREE.SphereGeometry(0.12, 12, 10), smoothMat(PAL.thorn), 0, -0.36, 0, a); mit.scale.set(1, 1.15, 0.85);
        mesh(new THREE.SphereGeometry(0.05, 8, 6), smoothMat(PAL.thorn), s * -0.09, -0.3, 0.04, a);
        mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), smoothMat('#FFFFFF'), 0, -0.24, 0, a).rotation.x = Math.PI / 2;
      }
      const feet = [];
      for (const s of [-1, 1]) { const f = mesh(new THREE.SphereGeometry(0.2, 10, 8), smoothMat(PAL.lav), s * 0.36, 0.1, 0.18, fig); f.scale.set(1, 0.6, 1.3); feet.push(f); }
      const dizzy = new THREE.Group(); dizzy.position.y = 2.0; fig.add(dizzy);
      for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(starGeo, starMat); st.scale.setScalar(0.45); st.position.set(Math.cos(i * 2.09) * 0.6, 0, Math.sin(i * 2.09) * 0.6); dizzy.add(st); }
      dizzy.visible = false;
      const zzz = [];
      for (let i = 0; i < 3; i++) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = PAL.ink; g.font = '700 48px Fredoka, Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('z', 32, 34); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.setScalar(0.5); fig.add(sp); zzz.push(sp); }
      // frost sparkles that circle him once he gets serious
      const auraGeo = new THREE.BufferGeometry(), ap = [];
      for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, r = 1.25 + Math.random() * 0.6, y = 0.2 + Math.random() * 2.4; ap.push(Math.cos(a) * r, y, Math.sin(a) * r); }
      auraGeo.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
      const aura = new THREE.Points(auraGeo, new THREE.PointsMaterial({ color: new THREE.Color('#DDF3FF'), map: flakeTex, size: 0.16, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      aura.visible = false; root.add(aura);
      const shadow = mesh(new THREE.CircleGeometry(1.0 * BOSS_SIZE, 24), new THREE.MeshBasicMaterial({ color: 0x2b2838, transparent: true, opacity: 0.22, depthWrite: false }), 0, 0, 0);
      shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
      const r = 0.95 * BOSS_SIZE, h = 1.6 * BOSS_SIZE;
      const col = addCyl(LAY.arena.x, LAY.arena.z, r, LAY.arena.top + h, LAY.arena.top, { off: true, moving: true });
      return { root, fig, roll, body, snowM, face, eyes, pupils, pupilGlow, inkM, brows, mouth, nose, hat, crown, scarf, tails, arms, feet, dizzy, zzz, aura, shadow, col, r, h };
    })();
    // ice crystals on the arena wall, and a snowstorm for the last phase
    (function arenaIce() {
      const A = LAY.arena;
      for (const off of [-2.1, -1.4, -0.75, 0.75, 1.4, 2.1]) {
        const a = Math.PI + off, cx = A.x + Math.sin(a) * (A.r - 0.15), cz = A.z + Math.cos(a) * (A.r - 0.15);
        const n = Math.abs(off) < 1 ? 4 : 3;
        for (let i = 0; i < n; i++) { const hh = 0.7 + ((i * 7 + Math.round(off * 10)) % 5) * 0.22 + (Math.abs(off) < 1 ? 0.5 : 0); const c = mesh(new THREE.ConeGeometry(0.16 + (i % 2) * 0.06, hh, 5), iceMat, cx + (i - n / 2) * 0.22, A.top + 0.5 + hh / 2, cz + ((i % 2) - 0.5) * 0.2); c.rotation.z = (i - n / 2) * 0.16; c.castShadow = true; }
      }
    })();
    const storm = (function makeStorm() {
      const A = LAY.arena, n = 260, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = A.x + (Math.random() - 0.5) * 22; pos[i * 3 + 1] = A.top + Math.random() * 9; pos[i * 3 + 2] = A.z + (Math.random() - 0.5) * 22; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color('#FFFFFF'), map: flakeTex, size: 0.26, transparent: true, opacity: 0, depthWrite: false }));
      pts.visible = false; scene.add(pts);
      return { pts, pos, n, k: 0 };
    })();
    // shockwave rings and falling icicles of the later phases
    const waves = [], icicles = [];
    const WAVE_SPEED = 6.2, ICICLE_WARN = 0.95;
    const waveGeo = new THREE.CylinderGeometry(1, 1, 0.42, 48, 1, true);
    const waveRingGeo = new THREE.RingGeometry(0.9, 1.06, 56); waveRingGeo.rotateX(-Math.PI / 2);
    const icicleGeo = new THREE.ConeGeometry(0.24, 1.1, 6); icicleGeo.rotateX(Math.PI);
    const markGeo = new THREE.RingGeometry(0.3, 0.5, 28); markGeo.rotateX(-Math.PI / 2);
    const snowballs = [];
    const snowGeo = new THREE.IcosahedronGeometry(0.32, 1);

    // ---------- Emote icons ----------
    const iconTex = {}, icons = [];
    function makeIcon(kind) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
      g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,0.95)';
      if (kind === 'heart') {
        g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 10, 8, 32, 22); g.bezierCurveTo(54, 8, 60, 34, 32, 54); g.closePath(); g.stroke(); g.fillStyle = PAL.thorn; g.fill();
      } else {
        const ch = { note: '♪', spark: '✦', z: 'z', bang: '!' }[kind] || '?', col = { note: PAL.lav, spark: '#F2C14E', z: PAL.ink, bang: PAL.ink }[kind] || PAL.ink;
        g.font = '700 46px Fredoka, Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(ch, 32, 35); g.fillStyle = col; g.fillText(ch, 32, 35);
      }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    function spawnIcon(kind, dx, dy) {
      if (!iconTex[kind]) iconTex[kind] = makeIcon(kind);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex[kind], transparent: true, depthWrite: false }));
      const fs = fun.big ? 1.6 : fun.mini ? 0.62 : 1;
      sp.position.set(p.x + (dx || 0), p.y + (0.95 + (dy || 0)) * fs, p.z); sp.renderOrder = 3; scene.add(sp);
      icons.push({ sp, life: 0, max: kind === 'z' ? 1.8 : 1.2, vx: (dx || 0) * 0.4 });
    }
    function stepIcons(dt) {
      for (let i = icons.length - 1; i >= 0; i--) {
        const ic = icons[i]; ic.life += dt; const k = ic.life / ic.max;
        if (k >= 1) { scene.remove(ic.sp); ic.sp.material.dispose(); icons.splice(i, 1); continue; }
        ic.sp.position.y += dt * 0.45; ic.sp.position.x += ic.vx * dt;
        ic.sp.scale.setScalar(0.16 + 0.14 * Math.min(1, ic.life / 0.15)); ic.sp.material.opacity = 1 - k * k;
      }
    }

    // ---------- Particles ----------
    const partGeo = new THREE.IcosahedronGeometry(1, 0), parts = [], partPool = [];
    function burst(x, y, z, n, color, speed, opt) {
      if (host.reduced && host.reduced()) n = Math.ceil(n / 3);
      const o = Object.assign({ grav: 9, life: 0.7, size: 0.07, up: 2 }, opt || {});
      for (let i = 0; i < n; i++) {
        const m = partPool.pop() || new THREE.Mesh(partGeo, basic(color));
        m.material = basic(Array.isArray(color) ? color[i % color.length] : color);
        m.position.set(x, y, z); m.visible = true; scene.add(m);
        const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1, s = speed * (0.4 + Math.random() * 0.6);
        parts.push({ m, vx: Math.cos(a) * s * e, vy: o.up + Math.random() * speed * 0.8, vz: Math.sin(a) * s * e, life: 0, max: o.life * (0.6 + Math.random() * 0.6), size: o.size * (0.6 + Math.random() * 0.8), grav: o.grav });
      }
    }
    const CONFETTI = [PAL.star, PAL.blush, PAL.mint, PAL.lav, PAL.peach, '#A8C8EC'];
    function stepParticles(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]; q.life += dt;
        if (q.life >= q.max) { scene.remove(q.m); partPool.push(q.m); parts.splice(i, 1); continue; }
        q.vy -= q.grav * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
        q.m.scale.setScalar(q.size * (1 - q.life / q.max)); q.m.rotation.x += dt * 4; q.m.rotation.y += dt * 3;
      }
    }

    // ---------- State ----------
    const p = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, grounded: false, ground: null, coyote: 0, buffer: 0, jumping: false, yaw: Math.PI, faceYaw: Math.PI, sq: 0, walkT: 0, blink: 2, knockT: 0, invuln: 0, lastGroundY: 0, onT: 0 };
    const S = { state: 'intro', t: 0, introT: 0, time: 0, attempts: 1, starsGot: 0, gold: false, respawn: LAY.start.slice(), hints: new Set(), focusY: 0, cut: null, cutDone: false, bonkCd: 0, hudT: 0, winT: 0, flagIdx: -1 };
    const B = { x: LAY.arena.x, z: LAY.arena.z - 1.5, y: LAY.arena.top, yaw: 0, state: 'sleep', t: 0, hits: 0, dirX: 0, dirZ: 1, spin: 0, anim: 0, hatFly: null, atk: 0, rollN: 0, iceT: 3, flash: 0, crownK: 0 };
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
    let camOverride = null;

    // Emotes: random ones on E, a little routine when Mimo stands still, sleep after a while
    const EMOTE_TIME = { wave: 2.0, hop: 1.3, spin: 1.0, heart: 1.8, dance: 2.6, shy: 1.9, stretch: 2.3, sleep: 9999 };
    const KEY_EMOTES = ['hop', 'spin', 'heart', 'dance', 'wave', 'shy'], IDLE_EMOTES = ['wave', 'dance', 'heart', 'stretch', 'shy', 'hop', 'spin'];
    let lastEmote = '';
    function pickEmote(list) { let k; do { k = list[Math.floor(Math.random() * list.length)]; } while (k === lastEmote && list.length > 1); lastEmote = k; return k; }
    function startEmote(kind, key) {
      p.emote = { kind, t: 0, dur: EMOTE_TIME[kind], key, n: 0 };
      if (!key) p.faceYaw = 0;
      ({ wave: sfx.hup, hop: sfx.yay, spin: sfx.star, heart: sfx.flag, dance: sfx.yay, shy: sfx.hup, stretch: sfx.yawn, sleep: sfx.yawn }[kind] || sfx.ui)();
    }
    function stepEmote(dt) {
      if (p.emote) {
        p.emote.t += dt;
        const moved = p.idle < 0.05;
        if (p.emote.t >= p.emote.dur) { p.emote = null; p.emoteGap = 1.8; }
        else if (moved && (!p.emote.key || p.emote.kind === 'sleep' || p.emote.kind === 'stretch')) p.emote = null;
      }
      p.emoteGap = Math.max(0, (p.emoteGap || 0) - dt);
      if (!p.emote && S.state === 'play' && p.grounded && p.idle > 3 && p.emoteGap <= 0) startEmote(p.idle > 15 ? 'sleep' : pickEmote(IDLE_EMOTES), false);
    }

    function hint(key, html) { if (S.hints.has(key)) return; S.hints.add(key); host.onHint(html); }
    // speech box with typewriter text and babble
    const line = { who: null, text: '', t: 0, dur: 0, shown: -1 };
    function say(who, text, dur) { Object.assign(line, { who, text, t: 0, dur: dur || Math.max(2.2, text.length * 0.06 + 1.3), shown: -1 }); }
    function stepLine(dt) {
      if (!line.who) return;
      line.t += dt;
      const n = Math.min(line.text.length, Math.floor(line.t * TALK_CPS));
      if (n !== line.shown) {
        for (let i = Math.max(0, line.shown + 1); i <= n && i < line.text.length; i++) if (i % 3 === 0 && /[A-Za-zÄÖÜäöüß]/.test(line.text[i])) sfx.talk(line.who === 'Mimo' ? 'mimo' : 'brummel');
        line.shown = n; cine({ who: line.who, text: line.text.slice(0, n), full: line.text });
      }
      if (line.t > line.dur) { line.who = null; cine({ who: null }); }
    }
    let seenBossCut = false;
    function startCine(kind) {
      S.state = 'cine'; S.t = 0; S.cine = { kind, t: 0, dur: CINE_LEN[kind], ev: new Set(), shot: -1 };
      p.vx = p.vz = 0; p.idle = 0; p.faceYaw = Math.atan2(B.x - p.x, B.z - p.z); if (p.emote && !p.emote.key) p.emote = null;
      input.jumpQueued = false;
      host.onHint('');
      cine({ bars: true, skip: true });
    }
    function startBossCut() {
      const full = !seenBossCut; seenBossCut = true;
      gate.c.off = false; sfx.crumble();
      startCine(full ? 'intro' : 'again');
      music('none');
    }
    function bossStomp() {
      B.flinch = 1; S.shake = 0.55; sfx.stomp(); sfx.sting();
      burst(B.x, B.y + 0.1, B.z, 26, [PAL.snow, PAL.white], 5, { up: 3 });
      if (S.cine && S.cine.kind === 'intro') cine({ title: { kicker: 'Hüter des Gipfels', name: 'Brummel' } });
      music('boss');
      if (host.onBoss) host.onBoss({ name: 'Brummel', hp: BOSS_HITS - B.hits, max: BOSS_HITS });
    }
    const once = (c, key, at, fn) => { if (c.t >= at && !c.ev.has(key)) { c.ev.add(key); fn(); } };
    function stepCine(dt) {
      const c = S.cine; c.t += dt;
      if (input.jumpQueued) { input.jumpQueued = false; if (c.t > 0.15) { endCine(); return; } }
      if (c.kind === 'intro') {
        once(c, 'snore1', 0.5, sfx.snore); once(c, 'snore2', 1.9, sfx.snore);
        once(c, 'wake', 3.2, () => { bossState('wake'); sfx.yawn(); burst(B.x, B.y + 1.9, B.z, 10, PAL.white, 2); });
        once(c, 'l1', 3.7, () => say('Brummel', BRUMMEL.intro1, 2.0));
        once(c, 'mimo', 5.9, () => { startEmote('wave', true); say('Mimo', BRUMMEL.mimo, 1.5); });
        once(c, 'l2', 7.7, () => say('Brummel', BRUMMEL.intro2, 2.8));
        once(c, 'stomp', 9.1, bossStomp);
      } else if (c.kind === 'again') {
        once(c, 'wake', 0.2, () => { bossState('wake'); sfx.yawn(); });
        once(c, 'l1', 0.5, () => say('Brummel', BRUMMEL.again, 1.9));
        once(c, 'stomp', 1.9, bossStomp);
      } else {
        once(c, 'hop', 0.2, () => startEmote('hop', true));
        once(c, 'l1', 0.6, () => say('Brummel', BRUMMEL.beaten, 2.2));
        once(c, 'door', 2.4, () => { B.doorGo = true; });
      }
      if (B.state !== 'sleep' && B.state !== 'beaten') B.yaw += clamp(angDiff(B.yaw, Math.atan2(p.x - B.x, p.z - B.z)), -3 * dt, 3 * dt);
      if (c.t >= c.dur) endCine();
    }
    function endCine() {
      const c = S.cine; if (!c) return;
      S.cine = null; S.state = 'play'; S.t = 0;
      cine({ bars: false, skip: false });
      if (c.kind === 'outro') { B.doorGo = true; music('sky'); hint('open', BRUMMEL.open); return; }
      if (!c.ev.has('stomp')) { sfx.stomp(); music('boss'); if (host.onBoss) host.onBoss({ name: 'Brummel', hp: BOSS_HITS - B.hits, max: BOSS_HITS }); }
      if (line.who === 'Mimo' || !c.ev.has('stomp')) { line.who = null; cine({ who: null }); }
      bossState('walk'); hint('boss', BRUMMEL.wake);
    }
    // camera shots of the cutscenes, computed straight from the scene time
    const cv = new THREE.Vector3();
    function cineShot(c, pos, look) {
      const A = LAY.arena, fx = p.x - B.x, fz = p.z - B.z, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl, sx = uz, sz = -ux;
      const atB = (f, up, side) => pos.set(B.x + ux * f + sx * side, B.y + up, B.z + uz * f + sz * side);
      let shot;
      if (c.kind === 'intro') {
        if (c.t < 2.9) { shot = 0; const k = smooth(c.t / 2.9), a = lerp(0.5, -0.85, k), R = lerp(15, 12.5, k); pos.set(A.x + Math.sin(a) * R, A.top + lerp(8, 5.5, k), A.z + Math.cos(a) * R); look.set(A.x, A.top + 0.6, A.z - 0.6); }
        else if (c.t < 5.7) { shot = 1; const k = smooth((c.t - 2.9) / 2.8); atB(lerp(5.4, 3.3, k), lerp(2.3, 1.6, k), 0.7); look.set(B.x, B.y + 0.85, B.z); }
        else if (c.t < 7.6) { shot = 2; const k = smooth((c.t - 5.7) / 1.9); pos.set(p.x - ux * lerp(2.9, 2.4, k) - sx * 0.5, p.y + 1.1, p.z - uz * lerp(2.9, 2.4, k) - sz * 0.5); look.set(p.x, p.y + 0.5, p.z); }
        else { shot = 3; const k = smooth((c.t - 7.6) / 3.2); atB(4.4, 0.55, lerp(-1.6, -0.6, k)); look.set(B.x, B.y + 0.75, B.z); }
      } else if (c.kind === 'again') { shot = 1; const k = smooth(c.t / c.dur); atB(lerp(5.6, 4.2, k), 1.9, 0.8); look.set(B.x, B.y + 1.1, B.z); }
      else if (c.t < 2.4) { shot = 0; const k = smooth(c.t / 2.4); atB(lerp(4.6, 3.8, k), 2.1, 1.0); look.set(B.x, B.y + 0.8, B.z); }
      else { shot = 1; const k = smooth((c.t - 2.4) / 2.0); pos.set(LAY.door[0] + lerp(2.2, 1.4, k), LAY.door[1] + lerp(2.4, 2.0, k), LAY.door[2] + lerp(5.8, 4.8, k)); look.set(LAY.door[0], LAY.door[1] + 1.1, LAY.door[2]); }
      c.shot = shot;
    }

    function hud(force) { S.hudT -= 1; if (!force && S.hudT > 0) return; S.hudT = 6; host.onHud({ stars: S.starsGot, total: STAR_COUNT, gold: S.gold, time: S.time }); }

    function resetDynamic(full) {
      // bridge closed, cloud docked
      bridge.from = bridge.to = bridge.yaw = Math.PI / 2; bridge.t = 1; bridge.openT = 0;
      button.down = false;
      if (full || cloud.state !== 'arrived' || S.flagIdx < 3) { cloud.state = 'dock'; cloud.u = 0; cloud.wait = 0; }
      for (const b of snowballs) scene.remove(b.m); snowballs.length = 0;
      for (const w of waves) { scene.remove(w.m); w.m.material.dispose(); } waves.length = 0;
      for (const c of icicles) { scene.remove(c.m); scene.remove(c.mark); c.mark.material.dispose(); } icicles.length = 0;
      if (full) {
        for (const s of stars) { s.got = false; s.m.visible = true; }
        S.starsGot = 0; S.gold = false;
        chest.state = 'closed'; chest.open = 0; chest.t = 0; chest.gstar.visible = false; chest.glow.material.opacity = 0;
        for (const f of flags) { f.on = false; f.clothMat.color.set(PAL.door); }
        Object.assign(B, { x: LAY.arena.x, z: LAY.arena.z - 1.5, y: LAY.arena.top, yaw: 0, state: 'sleep', t: 0, hits: 0, spin: 0, hatFly: null, doorGo: false, atk: 0, rollN: 0, iceT: 3, flash: 0, crownK: 0 });
        S.outroPending = false;
        boss.hat.visible = true; boss.hat.position.set(0, 0.62, 0); boss.hat.rotation.set(0, 0, 0); boss.hat.scale.setScalar(1); boss.roll.add(boss.hat);
        boss.crown.visible = false; boss.aura.visible = false; storm.k = 0; storm.pts.visible = false; boss.snowM.emissive.setScalar(0);
        if (host.onBoss) host.onBoss(null);
        boss.col.off = true; gate.c.off = true; gate.up = 0;
        door.rise = 0; door.open = false;
        S.respawn = LAY.start.slice(); S.flagIdx = -1; S.cutDone = false;
      }
      placeMovers(0);
    }
    function placePlayer(at) {
      Object.assign(p, { x: at[0], y: at[1], z: at[2], vx: 0, vz: 0, vy: 0, grounded: false, ground: null, coyote: 0, buffer: 0, jumping: false, knockT: 0, invuln: 0.6, lastGroundY: at[1] });
      p.yaw = p.faceYaw = at === LAY.start ? 0 : Math.PI; S.focusY = at[1];
      mimo.root.visible = true;
    }
    function restart(skipIntro) {
      resetDynamic(true);
      placePlayer(LAY.start);
      S.state = skipIntro ? 'play' : 'intro'; S.t = 0; S.introT = 0; S.time = 0; S.clockOn = false; S.attempts = 1; S.hints.clear(); S.cut = null; S.cine = null; S.shake = 0;
      line.who = null; cine({ bars: false, skip: false, who: null, title: null }); music('sky');
      input.jumpQueued = false;
      snapCamera();
      hud(true);
      host.onHint(host.isTouch() ? '<b>Links ziehen</b> zum Laufen, <b>rechts tippen</b> zum Springen. Der Schatten zeigt, wo Mimo landet.' : '<b>Pfeile</b> oder <b>WASD</b> zum Laufen, <b>Leertaste</b> zum Springen. Der Schatten zeigt, wo Mimo landet.');
      S.hints.add('start');
    }

    // ---------- Movers ----------
    let worldT = 0;
    function placeMovers(dt) {
      for (const c of cols) if (c.moving) { c.dx = c.dy = c.dz = c.dyaw = 0; }
      // sliding stone
      const sx = 0.6 + Math.sin(worldT * (Math.PI * 2 / 4.5)) * 2.2;
      placeCollider(slider.c, sx, 1.15, -14.6, 0); slider.g.position.set(sx, 1.3, -14.6);
      // bridge
      if (bridge.t < 1) { bridge.t = Math.min(1, bridge.t + dt / bridge.dur); bridge.yaw = lerp(bridge.from, bridge.to, smooth(bridge.t)); if (bridge.t >= 1) sfx.land(); }
      if (bridge.to === 0 && bridge.t >= 1 && S.state !== 'cut') {
        bridge.openT -= dt;
        const sec = Math.ceil(bridge.openT);
        if (bridge.openT < 3 && sec !== bridge.tick && bridge.openT > 0) { bridge.tick = sec; sfx.ui(); }
        if (bridge.openT <= 0) { bridge.from = 0; bridge.to = Math.PI / 2; bridge.t = 0; bridge.dur = BRIDGE_BACK; sfx.open(); button.down = false; }
      }
      placeCollider(bridge.c, LAY.bridge.x, LAY.bridge.top - 0.2, LAY.bridge.z, bridge.yaw); bridge.g.rotation.y = bridge.yaw;
      // disc and sweeper
      disc.yaw += DISC_SPIN * dt; disc.barYaw += BAR_SPIN * dt;
      placeCollider(disc.c, LAY.disc.x, LAY.disc.top, LAY.disc.z, disc.yaw); disc.g.rotation.y = disc.yaw;
      placeCollider(disc.barC, LAY.disc.x, LAY.disc.top + 0.63, LAY.disc.z, disc.barYaw); disc.bar.rotation.y = disc.barYaw;
      // cloud
      if (cloud.state === 'fly') {
        cloud.u = Math.min(1, cloud.u + (CLOUD_SPEED / cloudLen) * dt);
        if (cloud.u >= 1) { cloud.state = 'arrived'; sfx.land(); }
      }
      const cp = cloudPath.getPointAt(cloud.u);
      const bob = cloud.state === 'fly' ? Math.sin(worldT * 2.2) * 0.06 : Math.sin(worldT * 1.6) * 0.03;
      placeCollider(cloud.c, cp.x, cp.y - 0.3 + bob, cp.z, 0); cloud.g.position.set(cp.x, cp.y + bob, cp.z);
      // boss collider follows Brummel once he is asleep for good
      if (!boss.col.off) placeCollider(boss.col, B.x, B.y + boss.h, B.z, 0);
    }

    // ---------- Player ----------
    function knock(nx, nz, speed, up) {
      if (p.invuln > 0) return;
      p.vx = nx * speed; p.vz = nz * speed; p.vy = up; p.grounded = false; p.ground = null; p.knockT = 0.35; p.invuln = 0.9; p.jumping = false;
      sfx.oh(); burst(p.x, p.y + 0.4, p.z, 8, PAL.white, 3); p.mood = 'scared'; p.moodT = 0.6;
    }
    function die() {
      if (S.state !== 'play') return;
      S.state = 'dead'; S.t = 0; sfx.hurt(); sfx.oh();
      burst(p.x, p.y + 0.4, p.z, 18, ['#' + mimo.skin.color.getHexString(), PAL.white], 4, { life: 0.8 });
      mimo.root.visible = false;
      if (host.onDeath) host.onDeath();
    }
    function respawn() {
      S.attempts++;
      resetDynamic(false);
      placePlayer(S.respawn);
      S.state = 'play'; S.t = 0;
    }
    function stepPlayer(dt) {
      // carried by the thing below
      const g = p.grounded ? p.ground : null;
      if (g) {
        p.x += g.dx; p.y += g.dy; p.z += g.dz;
        if (g.dyaw) {
          const ox = p.x - g.x, oz = p.z - g.z, cs = Math.cos(g.dyaw), sn = Math.sin(g.dyaw);
          p.x = g.x + ox * cs + oz * sn; p.z = g.z - ox * sn + oz * cs; p.yaw += g.dyaw; p.faceYaw += g.dyaw;
        }
      }
      let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0) + (input.ax || 0);
      let mz = (input.down ? 1 : 0) - (input.up ? 1 : 0) + (input.ay || 0);
      const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
      if (S.state !== 'play') { mx = mz = 0; }
      if (p.knockT > 0) { p.knockT -= dt; mx *= 0.15; mz *= 0.15; }
      p.invuln = Math.max(0, p.invuln - dt);
      const acc = (p.grounded ? PH.ACC : PH.AIR_ACC) * dt;
      let ddx = mx * PH.RUN - p.vx, ddz = mz * PH.RUN - p.vz; const dl = Math.hypot(ddx, ddz);
      if (dl > acc) { ddx *= acc / dl; ddz *= acc / dl; }
      p.vx += ddx; p.vz += ddz;
      if (Math.hypot(mx, mz) > 0.2) { p.faceYaw = Math.atan2(mx, mz); p.idle = 0; if (S.state === 'play') S.clockOn = true; } else if (p.grounded && S.state === 'play') { p.idle = (p.idle || 0) + dt; }
      if (input.jumpQueued) { input.jumpQueued = false; if (S.state === 'play') p.buffer = PH.BUFFER; } else p.buffer = Math.max(0, p.buffer - dt);
      if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
        p.vy = PH.JUMP; p.buffer = 0; p.coyote = 0; p.grounded = false; p.ground = null; p.jumping = true; p.sq = 0.2; p.idle = 0; if (S.state === 'play') S.clockOn = true;
        sfx.jump(); sfx.hup(); burst(p.x, p.y + 0.05, p.z, 5, PAL.white, 1.6, { up: 0.6, grav: 3, life: 0.4 });
      }
      if (p.jumping && !input.jumpHeld && p.vy > 0) { p.vy *= PH.JUMP_CUT; p.jumping = false; }
      if (p.vy <= 0) p.jumping = false;
      p.vy = Math.max(-PH.MAX_FALL * (fun.moon ? 0.7 : 1), p.vy - PH.GRAV * (fun.moon ? 0.5 : 1) * dt);
      p.x += p.vx * dt; p.z += p.vz * dt;
      for (const c of cols) {
        if (c.off) continue;
        const n = pushOut(c, p); if (!n) continue;
        const vn = p.vx * n[0] + p.vz * n[1]; if (vn < 0) { p.vx -= n[0] * vn; p.vz -= n[1] * vn; }
        if (c.kind === 'sweeper') { const k = p.invuln; p.invuln = 0; knock(n[0], n[1], 4.6, 4.8); if (k > 0) p.invuln = Math.max(p.invuln, k); }
      }
      const prevY = p.y; p.y += p.vy * dt;
      let landed = null;
      for (const c of cols) {
        if (c.off) continue;
        if (p.vy <= 0) {
          if (prevY >= c.top - 0.05 - Math.max(0, c.dy) && p.y <= c.top && supports(c, p.x, p.z, PH.R * 0.55) && (!landed || c.top > landed.top)) landed = c;
        } else if (prevY + PH.H <= c.bottom + 0.05 && p.y + PH.H > c.bottom && supports(c, p.x, p.z, PH.R * 0.4)) { p.y = c.bottom - PH.H; p.vy = 0; p.jumping = false; }
      }
      const wasGrounded = p.grounded;
      if (landed) {
        const impact = -p.vy;
        p.y = landed.top; p.vy = 0; p.grounded = true; p.ground = landed; p.coyote = PH.COYOTE; p.lastGroundY = landed.top;
        if (!wasGrounded && impact > 6) { p.sq = -Math.min(0.28, impact / 60); p.landKick = Math.min(1.5, impact / 12); sfx.land(); burst(p.x, p.y + 0.05, p.z, 6, PAL.white, 1.8, { up: 0.5, grav: 3, life: 0.4 }); }
        if (landed.kind === 'bounce') { p.vy = PH.BOUNCE; p.grounded = false; p.ground = null; p.jumping = false; p.sq = 0.3; mushroom.squash = 1; sfx.bounce(); burst(p.x, p.y, p.z, 10, [PAL.thorn, PAL.white], 3); }
      } else { p.grounded = false; p.ground = null; p.coyote = Math.max(0, p.coyote - dt); }
      if (p.y < Math.min(p.lastGroundY - 9, -4) && S.state === 'play') die();
    }

    // ---------- Gameplay checks ----------
    function inCave() { return p.x > CV.x0 - 0.2 && p.x < CV.x1 + 0.2 && p.z < CV.z1 + 0.1 && p.z > CV.z0 - 0.3 && p.y < CV.y1; }
    function stepGameplay(dt) {
      // stars
      for (const s of stars) {
        if (s.got) continue;
        let sx = s.x, sz = s.z;
        if (s.attach) { const a = s.attach.a + disc.yaw; sx = LAY.disc.x + Math.sin(a) * s.attach.r; sz = LAY.disc.z + Math.cos(a) * s.attach.r; s.m.position.set(sx, s.y, sz); }
        const dx = p.x - sx, dy = p.y + 0.42 - s.y, dz = p.z - sz;
        if (dx * dx + dy * dy + dz * dz < 0.62 * 0.62 && S.state === 'play') {
          s.got = true; s.m.visible = false; S.starsGot++; hud(true); p.mood = 'happy'; p.moodT = 0.9;
          sfx.star(); sfx.yay(); burst(sx, s.y, sz, 16, [PAL.star, PAL.white], 3.4);
        }
      }
      // flags
      for (const f of flags) {
        if (f.on || S.state !== 'play') continue;
        if (Math.hypot(p.x - f.x, p.z - f.z) < 1.7 && Math.abs(p.y - f.y) < 1.4) {
          f.on = true; f.clothMat.color.set(PAL.star); sfx.flag(); burst(f.x, f.y + 1.4, f.z, 12, [PAL.star, PAL.white], 2.6);
          if (f.idx > S.flagIdx) { S.flagIdx = f.idx; S.respawn = [f.x + 0.9, f.y, f.z]; }
        }
      }
      // button rotates the bridge
      const onButton = p.grounded && Math.hypot(p.x - button.x, p.z - button.z) < 0.6 && Math.abs(p.y - 4.2) < 0.2;
      if (onButton && !button.down && S.state === 'play') {
        button.down = true; sfx.sw();
        if (bridge.to !== 0 || bridge.t < 1) { bridge.from = bridge.yaw; bridge.to = 0; bridge.t = 0; bridge.dur = BRIDGE_TURN; sfx.open(); }
        bridge.openT = BRIDGE_OPEN; bridge.tick = 0;
        if (!S.cutDone) { S.cutDone = true; S.state = 'cut'; S.t = 0; S.cut = { x: LAY.bridge.x, y: LAY.bridge.top, z: LAY.bridge.z }; }
      }
      if (!onButton && bridge.to === 0 && button.down && bridge.openT < BRIDGE_OPEN - 0.5) button.down = bridge.openT > 0;
      // cloud starts when Mimo stands on it
      if (cloud.state === 'dock') {
        if (p.grounded && p.ground === cloud.c) { cloud.wait += dt; if (cloud.wait > CLOUD_WAIT) { cloud.state = 'fly'; sfx.open(); sfx.yay(); } }
        else cloud.wait = 0;
      }
      // spikes on the route
      for (const s of spikes) {
        const dx = p.x - s.g.position.x, dy = p.y + 0.42 - s.g.position.y, dz = p.z - s.g.position.z;
        if (dx * dx + dy * dy + dz * dz < (s.r + 0.3) * (s.r + 0.3)) die();
      }
      // treasure
      if (chest.state === 'closed' && Math.hypot(p.x - chest.g.position.x, p.z - chest.g.position.z) < 1.0 && p.y < 2) {
        chest.state = 'opening'; chest.t = 0; sfx.key(); chest.gstar.visible = true;
      }
      if (chest.state === 'opening') {
        chest.t += dt; chest.open = Math.min(1, chest.t / 0.5);
        chest.gstar.position.y = 0.3 + smooth(Math.min(1, chest.t / 0.9)) * 0.9; chest.gstar.rotation.y += dt * 5;
        chest.glow.material.opacity = Math.min(0.8, chest.t);
        if (chest.t > 1.3) {
          chest.state = 'done'; chest.gstar.visible = false; S.gold = true; hud(true);
          sfx.best(); sfx.yay(); burst(chest.g.position.x, 2.2, chest.g.position.z, 30, ['#F7C948', PAL.white, PAL.star], 4, { life: 1 });
          host.onGold();
        }
      }
      chest.lid.rotation.x = -smooth(chest.open) * 1.9;
      if (inCave()) hint('cave', 'Ein Geheimgang hinter dem Wasserfall! Hier liegt ein Schatz.');
      // section hints
      if (p.z < -27.6 && p.y > 3.5) hint('bridge', 'Tritt auf den Knopf. Die Brücke dreht sich nur für ein paar Sekunden.');
      if (p.z < -43.5 && p.y > 3.5) hint('disc', 'Die Insel dreht sich. Spring über den rosa Balken.');
      if (p.z < -53.6 && p.y > 3.5) hint('cloud', 'Stell dich auf die Wolke. Weich den Dornen aus und schnapp dir die Sterne.');
      // door
      if (door.open && S.state === 'play' && p.grounded && Math.abs(p.x - LAY.door[0]) < 0.6 && Math.abs(p.z - LAY.door[2]) < 0.7) {
        S.state = 'win'; S.t = 0; sfx.door(); burst(LAY.door[0], LAY.door[1] + 1, LAY.door[2], 40, CONFETTI, 5, { life: 1.1 });
      }
    }

    // ---------- Boss ----------
    function bossState(s) { B.state = s; B.t = 0; }
    function stepBoss(dt) {
      const A = LAY.arena;
      B.t += dt; B.anim += dt;
      const pdx = p.x - B.x, pdz = p.z - B.z, pd = Math.hypot(pdx, pdz) || 1;
      const playerOnArena = Math.hypot(p.x - A.x, p.z - A.z) < A.r && p.y > A.top - 0.5;
      const turnTo = (yaw, rate) => { B.yaw += clamp(angDiff(B.yaw, yaw), -rate * dt, rate * dt); };
      // during a cutscene the scene drives Brummel, only the door keeps working
      if (S.state !== 'cine' || B.state === 'beaten') switch (B.state) {
        case 'sleep':
          if (playerOnArena && S.state === 'play' && p.grounded && p.z < LAY.arena.z + LAY.arena.r - 1.4) startBossCut();
          break;
        case 'wake':
          turnTo(Math.atan2(pdx, pdz), 3);
          if (B.t > 1.3) bossState('walk');
          break;
        case 'walk': {
          const sp = 1.3 + 0.45 * B.hits; turnTo(Math.atan2(pdx, pdz), 2.4);
          B.x += Math.sin(B.yaw) * sp * dt; B.z += Math.cos(B.yaw) * sp * dt;
          if ((B.t > 1.9 - 0.3 * B.hits || pd < 3.0) && playerOnArena) {
            // phase 1 only rolls, later phases alternate rolling with a big leap
            const leap = B.hits > 0 && B.atk % 2 === 1; B.atk++; B.rollN = 0;
            bossState(leap ? 'leap' : 'windup'); sfx.crumble();
          }
          if (!playerOnArena && B.t > 2) bossState('idle');
          break;
        }
        case 'idle':
          if (playerOnArena) bossState('walk');
          break;
        case 'windup':
          if (B.t < 0.45) { turnTo(Math.atan2(pdx, pdz), 5); B.dirX = Math.sin(B.yaw); B.dirZ = Math.cos(B.yaw); }
          if (B.t > 0.75 - 0.1 * B.hits) { bossState('roll'); sfx.bounce(); }
          break;
        case 'roll': {
          const sp = 7.0 + 1.3 * B.hits;
          B.x += B.dirX * sp * dt; B.z += B.dirZ * sp * dt; B.spin += sp * dt / 0.86;
          const ex = B.x - A.x, ez = B.z - A.z, ed = Math.hypot(ex, ez);
          const edge = A.r - 1.1 - boss.r * 0.35;
          if (ed > edge || B.t > 1.4) {
            if (ed > edge) { sfx.crumble(); sfx.land(); burst(B.x, B.y + 0.3, B.z, 14, PAL.snow, 3); S.shake = Math.max(S.shake || 0, 0.18); }
            // in the last phase he bounces off the wall and rolls once more
            if (B.hits >= 2 && B.rollN === 0) { B.rollN = 1; bossState('windup'); B.t = 0.3; break; }
            bossState('dizzy');
            if (B.hits > 0) throwSnowballs(4 + 2 * B.hits);
          }
          break;
        }
        case 'dizzy':
          if (B.t > 1.9) bossState('walk');
          break;
        case 'leap': {
          // crouch, then jump onto Mimo's spot and send out a shockwave
          if (B.t < 0.45) { turnTo(Math.atan2(pdx, pdz), 6); B.lx0 = B.x; B.lz0 = B.z; const lim2 = A.r - 1.1 - boss.r * 0.4, tx = p.x - A.x, tz = p.z - A.z, td = Math.hypot(tx, tz) || 1, k = Math.min(1, lim2 / td); B.lx1 = A.x + tx * k; B.lz1 = A.z + tz * k; break; }
          if (!B.leapGo) { B.leapGo = true; sfx.jump(); sfx.bounce(); }
          const u = Math.min(1, (B.t - 0.45) / 0.85);
          B.x = lerp(B.lx0, B.lx1, u); B.z = lerp(B.lz0, B.lz1, u); B.y = A.top + 4 * 2.8 * u * (1 - u);
          if (u >= 1) {
            B.y = A.top; B.leapGo = false; S.shake = 0.5; sfx.stomp(); sfx.crumble();
            burst(B.x, B.y + 0.2, B.z, 30, [PAL.snow, PAL.white], 5, { up: 3 });
            spawnWave(B.x, B.z, 0); if (B.hits >= 2) spawnWave(B.x, B.z, 0.42);
            const d = Math.hypot(p.x - B.x, p.z - B.z);
            if (d < boss.r + 0.4 && S.state === 'play') knock((p.x - B.x) / (d || 1), (p.z - B.z) / (d || 1), 7, 7);
            bossState('stuck');
          }
          break;
        }
        case 'stuck':
          if (Math.random() < dt * 8) burst(B.x + (Math.random() - 0.5), B.y + 0.1, B.z + (Math.random() - 0.5), 2, PAL.snow, 1.5);
          if (B.t > 1.6 - 0.2 * B.hits) bossState('walk');
          break;
        case 'hurt':
          if (B.t > 0.9) { if (B.hits >= BOSS_HITS) { bossState('beaten'); if (host.onBoss) host.onBoss(null); burst(B.x, B.y + 1.6, B.z, 40, CONFETTI, 5, { life: 1.1 }); boss.col.x = B.x; boss.col.z = B.z; boss.col.off = false; sfx.yawn(); S.outroPending = true; music('none'); if (host.onEvent) host.onEvent('brummel'); } else bossState('walk'); }
          break;
        case 'beaten':
          if (B.doorGo && !door.open) { door.rise = Math.min(1, door.rise + dt / 1.6); if (door.rise >= 1) { door.open = true; sfx.door(); } if (Math.random() < 0.3) burst(LAY.door[0] + (Math.random() - 0.5) * 1.4, LAY.door[1], LAY.door[2], 1, PAL.white, 1.5); }
          break;
      }
      if (B.hits >= 2 && !['beaten', 'hurt'].includes(B.state) && S.state === 'play') { B.iceT -= dt; if (B.iceT <= 0) { B.iceT = 4.2; spawnIcicles(5); } }
      stepWaves(dt); stepIcicles(dt);
      // keep Brummel on his island
      const ex = B.x - A.x, ez = B.z - A.z, ed = Math.hypot(ex, ez), lim = A.r - 1.1 - boss.r * 0.3;
      if (ed > lim) { B.x = A.x + ex / ed * lim; B.z = A.z + ez / ed * lim; }
      // stomp or bump
      if (B.state !== 'sleep' && B.state !== 'beaten' && S.state === 'play') {
        const top = B.y + boss.h;
        const d = Math.hypot(p.x - B.x, p.z - B.z);
        if (p.vy < 0 && p.y >= top - 0.5 && p.y <= top + 0.3 && d < boss.r + PH.R * 0.7 && B.state === 'hurt') {
          p.vy = PH.STOMP * 0.6; p.y = top; p.grounded = false; p.jumping = false; sfx.land();
        } else if (p.vy < 0 && p.y >= top - 0.5 && p.y <= top + 0.3 && d < boss.r + PH.R * 0.7 && (B.state === 'roll' || B.state === 'leap')) {
          p.vy = PH.STOMP * 0.75; p.y = top; p.grounded = false; p.jumping = false; sfx.bounce();
          if (!B.tickleT || B.anim - B.tickleT > 3) { B.tickleT = B.anim; say('Brummel', BRUMMEL.tickle[Math.floor(Math.random() * BRUMMEL.tickle.length)], 1.5); }
        } else if (p.vy < 0 && p.y >= top - 0.5 && p.y <= top + 0.3 && d < boss.r + PH.R * 0.7) {
          B.hits++; bossState('hurt'); B.flash = 1; S.freeze = 0.13; S.shake = 0.4; B.leapGo = false; B.y = A.top;
          for (const w of waves) w.r = 99; for (const c of icicles) c.t = Math.max(c.t, 99);
          if (host.onBoss) host.onBoss({ name: 'Brummel', hp: BOSS_HITS - B.hits, max: BOSS_HITS, hit: true }); p.mood = 'happy'; p.moodT = 1.0; p.vy = PH.STOMP; p.y = top; p.grounded = false; p.jumping = false; p.sq = 0.3;
          sfx.bounce(); sfx.yay(); burst(B.x, top, B.z, 22, [PAL.snow, PAL.star, PAL.white], 4);
          if (B.hits === 1) { B.hatFly = { t: 0, vx: (Math.random() - 0.5) * 3, vy: 6, vz: -2 }; say('Brummel', BRUMMEL.hit1); }
          if (B.hits === 2) say('Brummel', BRUMMEL.hit2);
          if (host.onIntensity) host.onIntensity(B.hits);
          for (const b of snowballs) b.life = Math.max(b.life, 3.6);
        } else if (d < boss.r + PH.R && p.y < top - 0.25 && p.y + PH.H > B.y) {
          const nx = (p.x - B.x) / (d || 1), nz = (p.z - B.z) / (d || 1);
          p.x = B.x + nx * (boss.r + PH.R); p.z = B.z + nz * (boss.r + PH.R);
          if (B.state !== 'hurt') knock(nx, nz, B.state === 'roll' ? 9 : 6, 6);
        }
      }
      // snowballs
      for (let i = snowballs.length - 1; i >= 0; i--) {
        const b = snowballs[i]; b.life += dt;
        b.x += b.vx * dt; b.z += b.vz * dt; b.m.rotation.x += b.vz * dt * 3; b.m.rotation.z -= b.vx * dt * 3;
        const off = Math.hypot(b.x - A.x, b.z - A.z) > A.r + 0.2;
        if (off) { b.vy -= 30 * dt; b.y += b.vy * dt; }
        b.m.position.set(b.x, b.y + 0.32, b.z);
        const dx = p.x - b.x, dy = p.y + 0.42 - (b.y + 0.32), dz = p.z - b.z;
        if (S.state === 'play' && dx * dx + dy * dy + dz * dz < 0.6 * 0.6) { const d = Math.hypot(dx, dz) || 1; knock(dx / d, dz / d, 5, 5); b.life = 99; burst(b.x, b.y + 0.3, b.z, 8, PAL.snow, 2); }
        if (b.life > 4 || b.y < A.top - 8) { scene.remove(b.m); snowballs.splice(i, 1); }
      }
      // hat flying off
      if (B.hatFly) {
        const h = B.hatFly; h.t += dt;
        if (h.t < dt * 1.5) { boss.hat.getWorldPosition(h.pos = new THREE.Vector3()); scene.add(boss.hat); boss.hat.position.copy(h.pos); boss.hat.scale.setScalar(BOSS_SIZE); }
        h.vy -= 20 * dt; boss.hat.position.x += h.vx * dt; boss.hat.position.y += h.vy * dt; boss.hat.position.z += h.vz * dt; boss.hat.rotation.z += dt * 6;
        if (h.t > 2.5) { boss.hat.visible = false; B.hatFly = null; }
      }
    }
    function spawnWave(x, z, delay) {
      const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#BFE6FF'), transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
      const floor = new THREE.Mesh(waveRingGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF'), transparent: true, opacity: 0.9, depthWrite: false })); floor.position.y = -0.17; floor.renderOrder = 2; m.add(floor);
      m.visible = false; scene.add(m); waves.push({ m, x, z, r: 0.8, t: -(delay || 0), hit: false });
    }
    function stepWaves(dt) {
      const A = LAY.arena;
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]; w.t += dt; if (w.t < 0) continue;
        w.r += WAVE_SPEED * dt; w.m.visible = true; w.m.position.set(w.x, A.top + 0.2, w.z); w.m.scale.set(w.r, 1 + 0.4 * Math.sin(w.t * 20), w.r);
        w.m.material.opacity = 0.95 * Math.max(0, 1 - w.r / (A.r + 1.5)); w.m.children[0].material.opacity = w.m.material.opacity;
        const d = Math.hypot(p.x - w.x, p.z - w.z);
        if (!w.hit && S.state === 'play' && p.y < A.top + 0.38 && Math.abs(d - w.r) < 0.38) { w.hit = true; knock((p.x - w.x) / (d || 1), (p.z - w.z) / (d || 1), 6, 7); }
        if (w.r > A.r + 1.5) { scene.remove(w.m); w.m.material.dispose(); w.m.children[0].material.dispose(); waves.splice(i, 1); }
      }
    }
    function spawnIcicles(n) {
      const A = LAY.arena, spots = [[p.x, p.z]];
      for (let tries = 0; spots.length < n && tries < 60; tries++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (A.r - 1.2), x = A.x + Math.cos(a) * r, z = A.z + Math.sin(a) * r; if (spots.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > 1.6)) spots.push([x, z]); }
      sfx.open();
      spots.forEach(([x, z], i) => {
        const m = new THREE.Mesh(icicleGeo, iceMat); m.castShadow = true; m.visible = false; scene.add(m);
        const mark = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.thorn), transparent: true, opacity: 0, depthWrite: false })); mark.position.set(x, A.top + 0.04, z); mark.renderOrder = 2; scene.add(mark);
        icicles.push({ m, mark, x, z, y: A.top + 9, vy: 0, t: -i * 0.12 });
      });
    }
    function stepIcicles(dt) {
      const A = LAY.arena;
      for (let i = icicles.length - 1; i >= 0; i--) {
        const c = icicles[i]; c.t += dt;
        if (c.t > 50) { scene.remove(c.m); scene.remove(c.mark); c.mark.material.dispose(); icicles.splice(i, 1); continue; }
        if (c.t < 0) continue;
        const k = Math.min(1, c.t / ICICLE_WARN);
        c.mark.material.opacity = 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(c.t * 18)); c.mark.scale.setScalar(1.3 - 0.4 * k);
        if (c.t < ICICLE_WARN) continue;
        c.m.visible = true; c.vy += 44 * dt; c.y -= c.vy * dt; c.m.position.set(c.x, c.y + 0.55, c.z);
        if (c.y <= A.top) {
          burst(c.x, A.top + 0.3, c.z, 12, [ICE.color, PAL.white], 3.4); sfx.crumble();
          const d = Math.hypot(p.x - c.x, p.z - c.z);
          if (S.state === 'play' && d < 0.75 && p.y < A.top + 1.3) knock((p.x - c.x) / (d || 1), (p.z - c.z) / (d || 1), 5, 6);
          scene.remove(c.m); scene.remove(c.mark); c.mark.material.dispose(); icicles.splice(i, 1);
        }
      }
    }
    function throwSnowballs(n) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + Math.random() * 0.4, m = new THREE.Mesh(snowGeo, smoothMat(PAL.snow)); m.castShadow = true; scene.add(m);
        snowballs.push({ m, x: B.x + Math.sin(a) * 1.1, z: B.z + Math.cos(a) * 1.1, y: B.y, vx: Math.sin(a) * 3.4, vz: Math.cos(a) * 3.4, vy: 0, life: 0 });
      }
      sfx.crumble();
    }

    // ---------- Camera ----------
    function cameraGoal(pos, look) {
      const A = LAY.arena;
      let off = [0, 5.8, 8.0], la = [0, 0.5, -2.0], fx = p.x, fz = p.z;
      const inArena = p.z < A.z + A.r + 0.6 && p.y > A.top - 1.5;
      const onRoute = !inArena && (cloud.state === 'fly' || (cloud.state === 'arrived' && p.z < -60)) && p.z < -57;
      if (inCave()) { off = [0, 6.2, 3.2]; la = [0, 0, -0.6]; }
      else if (inArena) { off = [0, 9.6, 12.2]; la = [0, 0, -1]; fx = lerp(p.x, A.x, 0.35); fz = lerp(p.z, A.z, 0.35); }
      else if (onRoute) { off = [3.4, 7.4, 10.4]; la = [0, 0.4, -3.2]; }
      if (S.cut) { const c = S.cut; pos.set(c.x + 6, c.y + 6.5, c.z + 9); look.set(c.x, c.y, c.z - 1); return; }
      p.lookX = damp(p.lookX || 0, clamp(p.vx * 0.22, -1.2, 1.2), 2.5, 1 / 120); p.lookZ = damp(p.lookZ || 0, clamp(p.vz * 0.22, -1.2, 1.2), 2.5, 1 / 120);
      pos.set(fx + off[0] + p.lookX * 0.6, S.focusY + off[1], fz + off[2] + p.lookZ * 0.6);
      look.set(fx + la[0] + p.lookX, S.focusY + la[1], fz + la[2] + p.lookZ);
    }
    const introPos = new THREE.CatmullRomCurve3([new THREE.Vector3(10, 22, -122), new THREE.Vector3(9, 16, -78), new THREE.Vector3(-6, 12, -42), new THREE.Vector3(-3, 9, -12), new THREE.Vector3(0, 6.4, 11)]);
    const introLook = new THREE.CatmullRomCurve3([new THREE.Vector3(0.8, 9, -100), new THREE.Vector3(0.8, 6, -70), new THREE.Vector3(0.8, 4, -38), new THREE.Vector3(0, 1, -14), new THREE.Vector3(0, 0.5, 0)]);
    const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
    function snapCamera() { cameraGoal(camPos, camLook); cam.position.copy(camPos); cam.lookAt(camLook); }
    function stepCamera(dt) {
      if (p.grounded) S.focusY = damp(S.focusY, p.y, 5, dt);
      else if (p.y < S.focusY - 0.8) S.focusY = damp(S.focusY, p.y + 0.8, 7, dt);
      else if (p.y > S.focusY + 2.6) S.focusY = damp(S.focusY, p.y - 2.6, 7, dt);
      cameraGoal(tmpPos, tmpLook);
      const rate = S.cut ? 3 : 4.5;
      camPos.x = damp(camPos.x, tmpPos.x, rate, dt); camPos.y = damp(camPos.y, tmpPos.y, rate, dt); camPos.z = damp(camPos.z, tmpPos.z, rate, dt);
      camLook.x = damp(camLook.x, tmpLook.x, rate + 1, dt); camLook.y = damp(camLook.y, tmpLook.y, rate + 1, dt); camLook.z = damp(camLook.z, tmpLook.z, rate + 1, dt);
      if (S.state === 'cine' && S.cine) {
        cineShot(S.cine, camPos, camLook);
        cam.position.copy(camPos);
        if (S.shake > 0) cam.position.add(cv.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(S.shake * 0.5));
        cam.lookAt(camLook);
        return;
      }
      if (S.state === 'intro') {
        const k = smooth(Math.min(1, S.introT / INTRO_TIME));
        introPos.getPointAt(k, tmpPos); introLook.getPointAt(k, tmpLook);
        const blend = smooth(clamp((S.introT / INTRO_TIME - 0.8) / 0.2, 0, 1));
        cam.position.copy(tmpPos.lerp(camPos, blend)); cam.lookAt(tmpLook.lerp(camLook, blend));
        return;
      }
      if (camOverride) { cam.position.set(...camOverride.pos); cam.lookAt(...camOverride.look); } else {
        cam.position.copy(camPos);
        if (S.shake > 0 && !(host.reduced && host.reduced())) cam.position.add(cv.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(S.shake * 0.6));
        cam.lookAt(camLook);
      }
      sun.position.set(p.x + 7, p.y + 15, p.z + 6); sun.target.position.set(p.x, p.y, p.z - 3);
    }

    // ---------- Visual sync ----------
    function syncVisuals(dt) {
      // Mimo
      const r = mimo.root;
      r.position.set(p.x, p.y, p.z);
      p.yaw += angDiff(p.yaw, p.faceYaw) * Math.min(1, dt * 12);
      r.rotation.y = p.yaw;
      stepEmote(dt); stepIcons(dt);
      const LEG = mimo.LEG, BS = mimo.BS;
      p.moodT = Math.max(0, (p.moodT || 0) - dt); if (p.moodT <= 0) p.mood = null;
      p.piepT = Math.max(0, (p.piepT || 0) - dt);
      p.sq = damp(p.sq, 0, 9, dt);
      const air = !p.grounded, speed = Math.hypot(p.vx, p.vz), runK = clamp(speed / PH.RUN, 0, 1);
      const stretch = air ? clamp(p.vy / 60, -0.12, 0.16) : 0;
      // landing jiggle as a damped spring, also kicks the sprout
      if (p.landKick) { p.jigV = (p.jigV || 0) - p.landKick * 0.05; mimo.spr.vx += p.landKick * 0.25; p.landKick = 0; }
      p.jigV = (p.jigV || 0) + (-(p.jig || 0) * 190 - (p.jigV || 0) * 9) * dt; p.jig = (p.jig || 0) + p.jigV * dt;
      const sq = p.sq + stretch + p.jig;
      mimo.body.scale.set((1 - sq * 0.5) * BS, (1 + sq) * BS, (1 - sq * 0.5) * BS);
      if (!air && speed > 0.4) p.walkT += dt * (6 + speed * 1.6); else p.walkT = damp(p.walkT, Math.round(p.walkT / Math.PI) * Math.PI, 8, dt);
      const w = Math.sin(p.walkT);
      mimo.body.position.y = LEG + (!air ? Math.abs(w) * 0.045 * runK + Math.sin(worldT * 3) * 0.006 : 0) - Math.max(0, -sq) * 0.06;
      mimo.body.rotation.z = !air ? w * 0.07 * runK : 0;
      mimo.body.rotation.x = air ? clamp(-p.vy * 0.008, -0.12, 0.12) : runK * 0.12;
      if (fun.disco && !air && speed < 0.4) mimo.body.position.y = LEG + Math.abs(Math.sin(worldT * Math.PI * 76 / 60)) * 0.08;
      // legs: walk cycle, dangle in the air, squash on landing
      const legSw = w * 0.75 * runK, legSq = 1 - Math.max(0, -sq) * 0.7;
      mimo.legs[0].rotation.set(air ? -0.55 : legSw, 0, 0); mimo.legs[1].rotation.set(air ? 0.35 : -legSw, 0, 0);
      for (const lg of mimo.legs) lg.scale.y = legSq;
      // arms swing while running and go up in the air
      p.armUp = damp(p.armUp || 0, air ? 1 : 0, 10, dt);
      const swing = w * 0.8 * runK;
      mimo.arms[0].rotation.set(swing, 0, -0.15 - p.armUp * 1.7);
      mimo.arms[1].rotation.set(-swing, 0, 0.15 + p.armUp * 1.7);
      // emote poses override the base animation
      let extraYaw = 0, faceMode = null, sproutDroop = 0;
      mimo.arms.forEach((a, i) => a.position.copy(mimo.armBase[i]));
      const em = p.emote;
      if (em) {
        const t = em.t, k = t / em.dur, A = mimo.arms, Lg = mimo.legs;
        if (em.kind === 'wave') { A[1].rotation.set(0, 0, 2.4 + Math.sin(t * 12) * 0.35); mimo.body.rotation.z = Math.sin(t * 3) * 0.05; faceMode = 'happy'; }
        else if (em.kind === 'hop') { const h = Math.abs(Math.sin(t * Math.PI * 2.3)) * 0.16 * (1 - k * 0.3); mimo.body.position.y = LEG + h; Lg[0].rotation.x = -h * 3; Lg[1].rotation.x = -h * 3; A[0].rotation.set(0, 0, -2.1); A[1].rotation.set(0, 0, 2.1); faceMode = 'happy'; }
        else if (em.kind === 'spin') { extraYaw = smooth(Math.min(1, t / 0.8)) * Math.PI * 2; A[0].rotation.set(0, 0, -1.45); A[1].rotation.set(0, 0, 1.45); faceMode = 'happy'; if (t > 0.8 && !em.n) { em.n = 1; burst(p.x, p.y + 0.7, 12, [PAL.star, PAL.white], 2.2, { up: 1, grav: 3, life: 0.6 }); spawnIcon('spark', 0.15); } }
        else if (em.kind === 'heart') { A[0].position.set(-0.25, 0.36, 0.2); A[1].position.set(0.25, 0.36, 0.2); A[0].rotation.set(-1.5, 0, 0.1); A[1].rotation.set(-1.5, 0, -0.1); mimo.body.rotation.z = Math.sin(t * 4) * 0.07; faceMode = 'happy'; if (t > 0.25 && em.n < 1) { em.n = 1; spawnIcon('heart', 0.1); } if (t > 0.9 && em.n < 2) { em.n = 2; spawnIcon('heart', -0.15, 0.1); } }
        else if (em.kind === 'dance') { const b = Math.sin(t * 7); mimo.body.rotation.z = b * 0.16; mimo.body.position.y = LEG + Math.abs(b) * 0.05; A[0].rotation.set(0, 0, -(1.3 + b * 0.9)); A[1].rotation.set(0, 0, 1.3 - b * 0.9); Lg[0].rotation.x = b * 0.4; Lg[1].rotation.x = -b * 0.4; extraYaw = Math.sin(t * 3.5) * 0.4; faceMode = 'happy'; if (t > em.n * 0.5) { em.n++; spawnIcon('note', em.n % 2 ? 0.25 : -0.25); } }
        else if (em.kind === 'shy') { if (t < 0.95) { A[0].position.set(-0.13, 0.47, 0.25); A[1].position.set(0.13, 0.47, 0.25); A[0].rotation.set(-1.5, 0, 0); A[1].rotation.set(-1.5, 0, 0); faceMode = 'closed'; mimo.body.rotation.z = Math.sin(t * 9) * 0.03; } else { const o = smooth(Math.min(1, (t - 0.95) / 0.15)); A[0].rotation.set(-2.0 * (1 - o), 0, 0.6 - o * 2.2); A[1].rotation.set(-2.0 * (1 - o), 0, -0.6 + o * 2.2); faceMode = 'wide'; if (!em.n) { em.n = 1; sfx.yay(); spawnIcon('bang', 0.1); } } }
        else if (em.kind === 'stretch') { const u = smooth(clamp(k / 0.45, 0, 1)) * (1 - smooth(clamp((k - 0.75) / 0.25, 0, 1))); A[0].rotation.set(0, 0, -(0.15 + 2.75 * u)); A[1].rotation.set(0, 0, 0.15 + 2.75 * u); mimo.body.scale.y *= 1 + u * 0.1; faceMode = u > 0.3 ? 'yawn' : null; }
        else if (em.kind === 'sleep') { mimo.body.scale.y *= 0.96 + Math.sin(t * 2) * 0.025; A[0].rotation.set(0.2, 0, -0.05); A[1].rotation.set(0.2, 0, 0.05); faceMode = 'sleep'; sproutDroop = 0.7; if (t > em.n * 1.3) { em.n++; spawnIcon('z', 0.25 + (em.n % 2) * 0.1, 0.05); } }
      }
      for (const c of mimo.cheeks) c.scale.setScalar(em && em.kind === 'heart' ? 1.35 : 1);
      // face: blinking, happy squint, scared eyes, sleepy lids, open mouth
      p.blink -= dt; if (p.blink < 0) p.blink = 2.2 + Math.random() * 2.8;
      const blinkK = p.blink < 0.12 ? 0.1 : 1;
      const closed = faceMode === 'closed' || faceMode === 'sleep' || faceMode === 'yawn';
      const happy = !closed && faceMode !== 'wide' && (faceMode === 'happy' || p.mood === 'happy' || p.piepT > 0 || (fun.disco && !air && speed < 0.4));
      const scared = p.mood === 'scared' || p.vy < -15 || p.knockT > 0 || faceMode === 'wide';
      for (const e of mimo.eyes) { e.visible = !happy; e.scale.set(scared ? 1.12 : 1, closed ? 0.08 : blinkK * (scared ? 1.18 : 1), 1); }
      for (const e of mimo.happyEyes) e.visible = happy;
      for (const e of mimo.eyes) if (closed) e.visible = false;
      for (const e of mimo.closedEyes) e.visible = closed;
      const open = faceMode === 'yawn' || faceMode === 'sleep' || (faceMode !== 'closed' && (scared || p.piepT > 0 || (air && p.vy > 3) || p.mood === 'happy' || faceMode === 'happy'));
      mimo.mouthOpen.visible = open; mimo.smile.visible = !open;
      mimo.mouthOpen.scale.set(faceMode === 'sleep' ? 0.6 : 1, faceMode === 'yawn' ? 2.0 : faceMode === 'sleep' ? 0.6 : scared ? 1.4 : p.piepT > 0 ? 1.6 : 1, 1);
      // sprout on a spring: leans back when running, bounces on landing, lags behind turns
      const spr = mimo.spr;
      const tgtX = -runK * 0.35 + clamp(p.vy * 0.02, -0.3, 0.35) + sproutDroop, tgtZ = Math.sin(worldT * 1.4) * 0.06 + clamp(angDiff(p.yaw, p.faceYaw) * 0.3, -0.4, 0.4);
      spr.vx += ((tgtX - spr.x) * 70 - spr.vx * 6) * dt; spr.x += spr.vx * dt;
      spr.vz += ((tgtZ - spr.z) * 70 - spr.vz * 6) * dt; spr.z += spr.vz * dt;
      if (mimo.sprout) { mimo.sprout.rotation.x = spr.x; mimo.sprout.rotation.z = spr.z; }
      r.rotation.y = p.yaw + extraYaw;
      if (mimo.wings) { const f = Math.sin(worldT * (air ? 22 : 5)) * (air ? 0.7 : 0.2); mimo.wings[0].rotation.y = f; mimo.wings[1].rotation.y = -f; }
      if (mimo.rainbow) mimo.skin.color.setHSL((worldT * 0.15) % 1, 0.55, 0.78);
      if (fun.disco) { const bt = Math.abs(Math.sin(worldT * Math.PI * 76 / 60)); hemi.color.setHSL((worldT * 0.25) % 1, 0.7, 0.72 + bt * 0.1); sun.color.setHSL((worldT * 0.25 + 0.5) % 1, 0.6, 0.8); }
      else { hemi.color.copy(baseHemi); sun.color.copy(baseSun); }
      B.flinch = Math.max(0, (B.flinch || 0) - dt * 3);
      r.visible = S.state !== 'dead' && !(p.invuln > 0 && p.knockT <= 0 && Math.floor(worldT * 16) % 2 && S.state === 'play' && p.invuln < 0.85);
      // blob shadow on the ground below
      const gy = groundBelow(p.x, p.z, p.y + 0.05);
      if (gy > -Infinity && S.state !== 'dead') {
        const h = p.y - gy; mimo.shadow.visible = true;
        mimo.shadow.position.set(p.x, gy + 0.02, p.z);
        const k = clamp(1 - h / 7, 0.35, 1); mimo.shadow.scale.setScalar(k); mimo.shadow.material.opacity = 0.3 * k;
      } else mimo.shadow.visible = false;
      // wind, swaying crowns, pollen, butterflies, chimney smoke
      windU.value = worldT; playerU.value.set(p.x, S.state === 'dead' ? -99 : p.y, p.z);
      for (const sw of swayers) { sw.obj.rotation.z = Math.sin(worldT * 1.3 + sw.ph) * sw.amp; sw.obj.rotation.x = Math.sin(worldT * 1.1 + sw.ph * 1.7) * sw.amp * 0.6; }
      {
        const cx = camLook.x, cy = camLook.y, cz = camLook.z;
        for (let i = 0; i < SPARKS; i++) {
          let x = sparkPos[i * 3], y = sparkPos[i * 3 + 1], z = sparkPos[i * 3 + 2]; const sd = sparkSeed[i];
          y += dt * (0.12 + (sd % 1) * 0.15); x += Math.sin(worldT * 0.6 + sd * 3) * dt * 0.15;
          if (x < cx - 12) x += 24; else if (x > cx + 12) x -= 24;
          if (z < cz - 14) z += 28; else if (z > cz + 14) z -= 28;
          if (y > cy + 6) y -= 9; else if (y < cy - 3) y += 9;
          sparkPos[i * 3] = x; sparkPos[i * 3 + 1] = y; sparkPos[i * 3 + 2] = z;
          const tw = 0.35 + 0.65 * Math.max(0, Math.sin(worldT * 2.2 + sd * 5));
          sparkCol[i * 3] = sparkTint.r * tw; sparkCol[i * 3 + 1] = sparkTint.g * tw; sparkCol[i * 3 + 2] = sparkTint.b * tw;
        }
        sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
      }
      for (const b of butterflies) {
        const t = worldT * b.sp + b.ph, x = b.cx + Math.sin(t) * b.rx, z = b.cz + Math.sin(t * 1.3) * b.rz, y = b.cy + Math.sin(t * 2.3) * 0.3 + Math.abs(Math.sin(worldT * 8 + b.ph)) * 0.05;
        b.g.position.set(x, y, z); b.g.rotation.y = Math.atan2(x - b.lx, z - b.lz); b.lx = x; b.lz = z;
        const f = Math.sin(worldT * 15 + b.ph) * 0.9; b.wl.rotation.z = -f; b.wr.rotation.z = f;
      }
      for (const sm of smokes) {
        sm.t -= dt;
        if (sm.t <= 0) { sm.t = 0.45; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 2), new THREE.MeshLambertMaterial({ color: new THREE.Color('#FFFFFF'), transparent: true, opacity: 0.8 })); m.position.copy(sm.origin); scene.add(m); sm.list.push({ m, life: 0 }); }
        for (let i = sm.list.length - 1; i >= 0; i--) { const q = sm.list[i]; q.life += dt; q.m.position.y += dt * 0.45; q.m.position.x += dt * 0.12; q.m.scale.setScalar(1 + q.life * 1.3); q.m.material.opacity = Math.max(0, 0.75 - q.life * 0.3); if (q.life > 2.5) { scene.remove(q.m); q.m.geometry.dispose(); q.m.material.dispose(); sm.list.splice(i, 1); } }
      }
      // stars spin
      for (const s of stars) if (!s.got) { s.m.rotation.y += dt * 2.2; if (!s.attach) s.m.position.y = s.y + Math.sin(worldT * 2 + s.x) * 0.08; }
      // mushroom squash
      mushroom.squash = damp(mushroom.squash, 0, 7, dt); mushroom.cap.scale.set(1 + mushroom.squash * 0.25, 0.62 * (1 - mushroom.squash * 0.35), 1 + mushroom.squash * 0.25);
      // button
      button.cap.position.y = damp(button.cap.position.y, button.down ? 0.08 : 0.16, 14, dt);
      button.ring.material.opacity = button.down ? 0.25 + 0.2 * Math.sin(worldT * 8) : 0.15 + 0.1 * Math.sin(worldT * 3);
      bridge.hub.material = mat(bridge.to === 0 && bridge.openT < 3 && Math.floor(worldT * 6) % 2 ? PAL.star : PAL.button);
      // water
      waterTex.offset.y = (waterTex.offset.y + dt * 1.4) % 1; streamTex.offset.y = (streamTex.offset.y - dt * 0.6) % 1;
      foam.forEach((f, i) => { const k = Math.sin(worldT * 5 + i * 1.7); f.scale.setScalar(0.8 + k * 0.25); f.position.y = 1.08 + k * 0.03; });
      if (Math.random() < dt * 3) burst(lerp(CV.x0, CV.x1, Math.random()), 1.2 + Math.random() * 2.6, CV.z1 + 0.2, 1, PAL.white, 0.6, { grav: -0.5, life: 1.2, size: 0.05, up: 0.2 });
      // cave fade
      const fadeTo = inCave() ? 0.22 : 1;
      for (const m of caveMats) { m.opacity = damp(m.opacity, fadeTo, 8, dt); m.depthWrite = m.opacity > 0.95; }
      waterMat.opacity = damp(waterMat.opacity, inCave() ? 0.25 : 0.86, 8, dt); stream.material.opacity = damp(stream.material.opacity, inCave() ? 0.15 : 0.9, 8, dt);
      // flags wave
      for (const f of flags) f.cloth.rotation.y = Math.sin(worldT * (f.on ? 6 : 2.5) + f.idx) * (f.on ? 0.35 : 0.15);
      // spikes bob and spin
      for (const s of spikes) { s.g.position.y = s.base + Math.sin(worldT * 1.8 + s.ph) * 0.12; s.g.rotation.y += dt * 1.2; s.g.rotation.x += dt * 0.7; }
      // cloud route dots only before the flight
      for (const d of cloud.dots) d.visible = cloud.state === 'dock';
      // bobbing scenery
      for (const b of bobbers) { b.obj.position.y = b.base + Math.sin(worldT * b.sp + b.ph) * b.amp; if (b.drift) { b.obj.position.x += b.drift * dt; if (b.obj.position.x > 50) b.obj.position.x = -50; } }
      // boss
      const br = boss.root; br.position.set(B.x, B.y, B.z); br.rotation.y = B.yaw;
      const sleeping = B.state === 'sleep' || B.state === 'beaten';
      let bsq = 1;
      if (B.state === 'walk') { const wk = Math.sin(B.anim * 7); boss.roll.rotation.z = wk * 0.08; boss.feet[0].position.z = 0.18 + wk * 0.18; boss.feet[1].position.z = 0.18 - wk * 0.18; }
      else boss.roll.rotation.z = damp(boss.roll.rotation.z, 0, 8, dt);
      if (B.state === 'windup') { boss.roll.position.x = Math.sin(B.anim * 60) * 0.05; bsq = 1 - 0.12 * Math.min(1, B.t * 2); }
      else boss.roll.position.x = 0;
      boss.roll.rotation.x = B.state === 'roll' ? B.spin : damp(boss.roll.rotation.x % (Math.PI * 2), 0, 6, dt);
      if (B.state === 'hurt') bsq = 0.7 + 0.3 * Math.min(1, B.t * 2.5);
      if (sleeping) bsq = 1 + Math.sin(B.anim * 1.6) * 0.03;
      if (B.state === 'wake') boss.root.position.y = B.y + Math.max(0, Math.sin(Math.min(1, B.t / 0.5) * Math.PI)) * 0.6;
      if (B.flinch > 0) boss.root.position.y = B.y + Math.sin(B.flinch * Math.PI) * 0.35;
      boss.roll.scale.set(1 + (1 - bsq) * 0.6, bsq, 1 + (1 - bsq) * 0.6); boss.roll.position.y = 0.82 * bsq;
      const eyeY = sleeping ? 0.12 : B.state === 'dizzy' || B.state === 'stuck' ? 0.6 + 0.4 * Math.sin(B.anim * 12) : 1.15;
      for (const e of boss.eyes) e.scale.y = eyeY;
      for (const pu of boss.pupils) { pu.scale.y = sleeping ? 0.1 : eyeY * 1.05; pu.material = B.hits >= 2 && !sleeping ? boss.pupilGlow : boss.inkM; }
      // ice crown pops in after the beanie flew away, frost sparkles and the storm grow with each phase
      const crownOn = B.hits >= 1 && !B.hatFly; boss.crown.visible = crownOn; if (crownOn && boss.hat.parent === boss.roll) boss.hat.visible = false; B.crownK = crownOn ? Math.min(1, (B.crownK || 0) + dt * 3) : 0;
      if (crownOn) { const k = B.crownK, pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.35 : 1; boss.crown.scale.setScalar(k * pop); boss.crown.rotation.y += dt * 0.6; }
      boss.aura.visible = B.hits >= 1 && B.state !== 'beaten'; boss.aura.rotation.y += dt * (0.8 + B.hits * 0.5); boss.aura.material.opacity = 0.5 + 0.35 * Math.sin(B.anim * 4);
      boss.aura.position.set(0, 0, 0);
      boss.tails.rotation.z = Math.sin(B.anim * 3.2) * 0.18 + (B.state === 'walk' ? Math.sin(B.anim * 7) * 0.12 : 0); boss.tails.rotation.x = B.state === 'roll' ? -0.6 : -0.1;
      B.flash = Math.max(0, (B.flash || 0) - dt * 3.5); boss.snowM.emissive.setScalar(B.flash * 0.85);
      const stormOn = B.hits >= 2 && B.state !== 'beaten' && B.state !== 'sleep';
      storm.k = damp(storm.k, stormOn ? 1 : 0, 1.5, dt); storm.pts.visible = storm.k > 0.02; storm.pts.material.opacity = storm.k * 0.9;
      if (storm.pts.visible) { const A = LAY.arena, sp = storm.pos; for (let i = 0; i < storm.n; i++) { sp[i * 3] += 3.4 * dt; sp[i * 3 + 1] -= (3 + (i % 5)) * dt; sp[i * 3 + 2] += 1.2 * dt; if (sp[i * 3 + 1] < A.top) { sp[i * 3 + 1] = A.top + 9; sp[i * 3] = A.x - 11 + Math.random() * 22; sp[i * 3 + 2] = A.z - 11 + Math.random() * 22; } } storm.pts.geometry.attributes.position.needsUpdate = true; }
      if (B.state === 'stuck') { boss.roll.rotation.x = 0.4 + Math.sin(B.anim * 14) * 0.05; boss.feet[0].position.y = 0.1 + Math.abs(Math.sin(B.anim * 16)) * 0.2; boss.feet[1].position.y = 0.1 + Math.abs(Math.cos(B.anim * 16)) * 0.2; }
      else { boss.feet[0].position.y = 0.1; boss.feet[1].position.y = 0.1; }

      for (const [i, b] of boss.brows.entries()) { const s = i ? 1 : -1; b.rotation.z = sleeping ? s * 0.1 : B.state === 'dizzy' ? s * 0.4 : -s * 0.38; }
      boss.mouth.rotation.z = B.state === 'beaten' ? Math.PI : 0;
      boss.arms[0].rotation.z = -1.0 + (B.state === 'walk' || B.state === 'windup' ? Math.sin(B.anim * 9) * 0.4 : 0); boss.arms[1].rotation.z = 1.0 - (B.state === 'walk' || B.state === 'windup' ? Math.sin(B.anim * 9) * 0.4 : 0);
      if (B.state === 'leap') { const air = B.leapGo; boss.arms[0].rotation.z = air ? -2.2 : -0.7; boss.arms[1].rotation.z = air ? 2.2 : 0.7; }
      boss.dizzy.visible = B.state === 'dizzy'; boss.dizzy.rotation.y += dt * 5;
      boss.zzz.forEach((z, i) => { const k = (B.anim * 0.5 + i / 3) % 1; z.visible = sleeping; z.position.set(0.6 + k * 0.5, 1.8 + k * 1.2, 0.2); z.material.opacity = Math.sin(k * Math.PI); z.scale.setScalar(0.3 + k * 0.35); });
      boss.shadow.position.set(B.x, LAY.arena.top + 0.02, B.z); boss.shadow.material.opacity = 0.22 * Math.max(0.3, 1 - (B.y - LAY.arena.top) / 4);
      // gate
      gate.up = damp(gate.up, gate.c.off ? 0 : 1, 6, dt); gate.g.position.y = LAY.arena.top - 1.2 + gate.up * 1.2; gate.g.visible = gate.up > 0.02;
      // door
      door.g.position.y = LAY.door[1] - 2.4 * (1 - smooth(door.rise));
      door.g.visible = door.rise > 0;
      door.glow.material.opacity = door.open ? 0.5 + 0.2 * Math.sin(worldT * 3) : door.rise * 0.3;
    }

    // ---------- Main update ----------
    function update(dt) {
      if (S.freeze > 0) { S.freeze -= dt; return; }
      worldT += dt;
      S.t += dt;
      placeMovers(dt);
      if (S.state === 'intro') {
        S.introT += dt;
        if (input.jumpQueued) { input.jumpQueued = false; S.introT = Math.max(S.introT, INTRO_TIME * 0.82); }
        if (S.introT >= INTRO_TIME) { S.state = 'play'; S.t = 0; sfx.intro(); }
      } else if (S.state === 'cut') {
        if (S.t > CUT_TIME) { S.state = 'play'; S.cut = null; }
      } else if (S.state === 'cine') stepCine(dt);
      else if (S.state === 'play' && S.clockOn) S.time += dt;
      if (S.state === 'play' && S.outroPending && p.grounded) { S.outroPending = false; startCine('outro'); }
      S.shake = Math.max(0, (S.shake || 0) - dt * 1.2);
      stepLine(dt);
      if (S.state === 'play' || S.state === 'cut' || S.state === 'intro') stepPlayer(dt);
      if (S.state === 'play' || S.state === 'cut') stepGameplay(dt);
      stepBoss(dt);
      if (S.state === 'dead' && S.t > DEATH_TIME) respawn();
      if (S.state === 'win') {
        p.vx = p.vz = 0;
        const k = Math.min(1, S.t / 0.8); mimo.root.scale.setScalar((1 - k * 0.9) * funScale());
        if (Math.random() < 0.3) burst(LAY.door[0] + (Math.random() - 0.5) * 2, LAY.door[1] + 2 + Math.random(), LAY.door[2], 3, CONFETTI, 3, { life: 1 });
        if (S.t > WIN_TIME && !S.reported) { S.reported = true; host.onWin({ time: S.time, stars: S.starsGot, total: STAR_COUNT, gold: S.gold, attempts: S.attempts }); }
      } else mimo.root.scale.setScalar(funScale());
      stepParticles(dt);
      syncVisuals(dt);
      stepCamera(dt);
      hud(false);
    }
    function resize() {
      const w = canvas.clientWidth || host.anchor.clientWidth, h = canvas.clientHeight || host.anchor.clientHeight;
      if (!w || !h) return;
      const pr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    }
    function render() { resize(); renderer.render(scene, cam); }
    function dispose() {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } } });
      bgTex.dispose(); haloTex.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    }

    restart(false);
    S.reported = false;
    const api = {
      update, render, dispose, resize,
      restart() { S.reported = false; restart(true); },
      setFun(f) { fun = Object.assign({}, f || {}); },
      piep() {
        if (S.state !== 'play') return;
        p.sq = -0.28; p.idle = 0; p.piepT = 0.3; startEmote(pickEmote(KEY_EMOTES), true); burst(p.x, p.y + 0.9, p.z, 10, [PAL.star, PAL.white], 2.4, { up: 1.5, grav: 4, life: 0.6 });
        const d = Math.hypot(p.x - B.x, p.z - B.z);
        if (d < 12 && B.state === 'sleep') say('Brummel', BRUMMEL.piepSleep, 1.8);
        else if (d < 12 && B.state !== 'beaten') { B.flinch = 1; say('Brummel', BRUMMEL.piepAwake[Math.floor(Math.random() * BRUMMEL.piepAwake.length)], 1.8); }
      },
      get time() { return S.time; },
      get state() { return S.state; },
      dbg: { p, S, B, cloud, bridge, disc, slider, door, chest, stars, LAY, routeFrame, cols, teleport(x, y, z) { placePlayer([x, y, z]); S.state = 'play'; snapCamera(); }, skipIntro() { S.introT = INTRO_TIME; }, line, endCine, emote(k) { startEmote(k, true); }, setCam(c) { camOverride = c; } },
    };
    return api;
  }

  window.Sky3D = { create, STAR_COUNT };
})();
