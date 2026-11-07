/* Mimo hüpft · Sternenbahn, the world
   Everything you see except Mimo: the sky that changes with the song, the glowing track, notes,
   obstacles and scenery. The world is straight along -z; a vertex patch bends it down and sideways
   with distance, so the track curves over the horizon like a small planet. Needs global THREE (r160). */
(function () {
  'use strict';

  // One look per song section: sky, fog, track and accents
  const LOOKS = [
    { name: 'Abendrot', top: '#6C6AAE', mid: '#D99BC0', hor: '#FFD2AE', fog: '#E9B3BE', stars: 0.25, aurora: 0, tile: '#FFF1E8', tile2: '#FFE0D2', rail: '#FFB08E', accent: '#FF9F7A', sea: '#F2C4CF', hemi: '#FFE9DC', sun: '#FFE2C4', planets: 0.3 },
    { name: 'Blaue Stunde', top: '#2C346F', mid: '#5960A9', hor: '#C79AC8', fog: '#8F86BF', stars: 0.7, aurora: 0, tile: '#E6EAFF', tile2: '#CDD6FF', rail: '#9DB2FF', accent: '#8FA8FF', sea: '#8A86C4', hemi: '#D7DBFF', sun: '#E7E2FF', planets: 0.6 },
    { name: 'Sternenaufgang', top: '#1E2158', mid: '#393E88', hor: '#8E7BC6', fog: '#5E5A9E', stars: 1, aurora: 0.15, tile: '#EEE6FF', tile2: '#D9CCFF', rail: '#C6A6FF', accent: '#B48CFF', sea: '#5D5A9C', hemi: '#D9CFFF', sun: '#ECE4FF', planets: 0.85 },
    { name: 'Polarlicht', top: '#122249', mid: '#1C496A', hor: '#5DAAA2', fog: '#2F6A78', stars: 0.85, aurora: 1, tile: '#E2FFF4', tile2: '#BDF5E2', rail: '#7CF0C6', accent: '#6FE8C0', sea: '#3D7383', hemi: '#CFFFF0', sun: '#E8FFF8', planets: 0.6 },
    { name: 'Kometenflug', top: '#160E3A', mid: '#3A1C62', hor: '#8E4FA0', fog: '#4B2A6E', stars: 1, aurora: 0.35, tile: '#FFE6F6', tile2: '#FFC9EA', rail: '#FF9ED6', accent: '#FF8FD0', sea: '#4C2C70', hemi: '#F6D5FF', sun: '#FFE4F6', planets: 1 },
    { name: 'Sternenregen', top: '#1A1446', mid: '#4A2C79', hor: '#E68AB1', fog: '#7A4A88', stars: 1, aurora: 0.55, tile: '#FFF6D6', tile2: '#FFE6A6', rail: '#FFD36A', accent: '#FFC94F', sea: '#6E4486', hemi: '#FFF0D8', sun: '#FFF2DA', planets: 0.9 },
    { name: 'Mondtor', top: '#2A2C69', mid: '#6B6AB4', hor: '#F5E2B6', fog: '#B9A6C8', stars: 0.7, aurora: 0.2, tile: '#FFFFFF', tile2: '#FFF1CF', rail: '#FFE7A4', accent: '#FFE08A', sea: '#A897C4', hemi: '#FFF6E6', sun: '#FFF5E2', planets: 0.5 },
  ];
  const NOTE_HUES = [0.0, 0.08, 0.14, 0.33, 0.5, 0.58, 0.75, 0.86]; // pastel rainbow by scale degree

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  function create(THREE, o) {
    const { scene, chart, D, LW, kit, PAL, reduced } = o;
    const zOf = (b) => -b * D;
    const xOf = (lane) => (lane - 1) * LW;
    const col = (h) => new THREE.Color(h);
    const vec = (h) => { const c = new THREE.Color(); c.setStyle(h, THREE.LinearSRGBColorSpace); return new THREE.Vector3(c.r, c.g, c.b); };
    const disposables = [];

    // ---------- Curved world ----------
    const bendU = { value: new THREE.Vector2(0, 0.00085) };
    function bend(m) {
      if (!m || m.userData.bent || m.userData.noBend) return m;
      m.userData.bent = true;
      const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
      m.onBeforeCompile = function (sh, r) {
        if (prev) prev.call(this, sh, r);
        sh.uniforms.uBend = bendU;
        sh.vertexShader = 'uniform vec2 uBend;\n' + sh.vertexShader.replace('#include <project_vertex>',
          '#include <project_vertex>\nmvPosition.xy += vec2(uBend.x, -uBend.y) * mvPosition.z * mvPosition.z;\ngl_Position = projectionMatrix * mvPosition;');
      };
      m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|bend'; };
      return m;
    }
    function bendAll(root) { root.traverse((ob) => { if (ob.material && !ob.userData.noBend) (Array.isArray(ob.material) ? ob.material : [ob.material]).forEach(bend); }); }

    // ---------- Sky: dome, stars, aurora, planets, moon (they follow the camera) ----------
    const skyGroup = new THREE.Group(); scene.add(skyGroup);
    const skyU = { uTop: { value: vec(LOOKS[0].top) }, uMid: { value: vec(LOOKS[0].mid) }, uHor: { value: vec(LOOKS[0].hor) }, uFlash: { value: 0 } };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 18), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: 'uniform vec3 uTop, uMid, uHor; uniform float uFlash; varying vec3 vDir; void main(){ float h = vDir.y; vec3 c = mix(uMid, uTop, smoothstep(0.02, 0.6, h)); c = mix(uHor, c, smoothstep(-0.06, 0.2, h)); c = mix(c, vec3(1.0), uFlash); gl_FragColor = vec4(c, 1.0); }',
    }));
    dome.userData.noBend = true; dome.renderOrder = -10; dome.frustumCulled = false; skyGroup.add(dome);

    const STAR_N = 1400;
    const starGeoP = new THREE.BufferGeometry();
    {
      const pos = new Float32Array(STAR_N * 3), seed = new Float32Array(STAR_N), size = new Float32Array(STAR_N);
      for (let i = 0; i < STAR_N; i++) {
        const u = hash(i * 3.1), v = hash(i * 7.7 + 1);
        const th = u * Math.PI * 2, y = 0.02 + Math.pow(v, 0.8) * 0.98, r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(th) * r * 420; pos[i * 3 + 1] = y * 420; pos[i * 3 + 2] = Math.sin(th) * r * 420;
        seed[i] = hash(i * 13.3 + 5); size[i] = 1.2 + Math.pow(hash(i * 2.9 + 9), 6) * 4.5;
      }
      starGeoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      starGeoP.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      starGeoP.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    }
    const starU = { uTime: { value: 0 }, uAmt: { value: 0.3 }, uPx: { value: 1 }, uPulse: { value: 0 } };
    const starPts = new THREE.Points(starGeoP, new THREE.ShaderMaterial({
      uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'uniform float uTime, uPx, uPulse; attribute float aSeed; attribute float aSize; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999; vA = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed * 2.4) + aSeed * 40.0); gl_PointSize = aSize * uPx * (1.0 + uPulse * 0.5 * step(0.75, aSeed)); }',
      fragmentShader: 'uniform float uAmt; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.0, 0.5, length(d))); a = a * a * vA * uAmt; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a, a); }',
    }));
    starPts.userData.noBend = true; starPts.frustumCulled = false; starPts.renderOrder = -9; skyGroup.add(starPts);

    // aurora curtains: three wide bands far ahead
    const auroraU = { uTime: { value: 0 }, uAmt: { value: 0 } };
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: auroraU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p; gl_Position.z = p.w * 0.9998; }',
      fragmentShader: 'uniform float uTime, uAmt; varying vec2 vUv; void main(){ float x = vUv.x; float w = sin(x * 11.0 + uTime * 0.5) * 0.07 + sin(x * 29.0 - uTime * 0.8) * 0.035; float y = vUv.y + w; float band = smoothstep(0.0, 0.22, y) * (1.0 - smoothstep(0.4, 1.0, y)); float cur = 0.55 + 0.45 * sin(x * 80.0 + sin(x * 9.0 + uTime * 0.7) * 4.0); vec3 c = mix(vec3(0.42, 1.0, 0.78), vec3(0.78, 0.55, 1.0), smoothstep(0.25, 0.95, y)); float a = band * cur * uAmt * smoothstep(0.0, 0.12, x) * (1.0 - smoothstep(0.88, 1.0, x)) * 0.75; gl_FragColor = vec4(c * a, a); }',
    });
    for (let i = 0; i < 3; i++) {
      const pg = new THREE.PlaneGeometry(520, 130, 60, 1);
      const pp = pg.attributes.position; for (let k = 0; k < pp.count; k++) { const x = pp.getX(k); pp.setZ(k, -Math.cos(x / 260 * 1.3) * 60); }
      const a = new THREE.Mesh(pg, auroraMat); a.position.set(-60 + i * 70, 105 + i * 22, -360 + i * 40); a.rotation.y = (i - 1) * 0.35; a.userData.noBend = true; a.renderOrder = -8; a.frustumCulled = false; skyGroup.add(a);
    }

    // planets and the moon: soft painted discs
    function discTex(draw) { const cv = document.createElement('canvas'); cv.width = cv.height = 256; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t; }
    function planetTex(a, b, bands) {
      return discTex((g) => {
        const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, a); gr.addColorStop(1, b);
        g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
        g.save(); g.clip(); g.globalAlpha = 0.18; g.fillStyle = '#FFFFFF';
        for (let i = 0; i < bands; i++) { g.beginPath(); g.ellipse(128, 40 + i * 44, 170, 9 + (i % 2) * 6, -0.25, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 0.35; g.fillStyle = '#1B1440'; g.beginPath(); g.arc(178, 168, 130, 0, Math.PI * 2); g.fill(); g.restore();
      });
    }
    const planets = [];
    function addPlanet(tex, size, pos, ring) {
      const g = new THREE.Group(); g.position.set(...pos); skyGroup.add(g);
      const m = new THREE.Mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      m.userData.noBend = true; m.renderOrder = -7; g.add(m);
      if (ring) {
        const rg = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 1.85, 64), new THREE.MeshBasicMaterial({ color: col(ring), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false }));
        rg.scale.y = 0.28; rg.rotation.z = -0.3; rg.userData.noBend = true; rg.renderOrder = -6; g.add(rg);
      }
      planets.push({ g, base: pos.slice() }); return g;
    }
    addPlanet(planetTex('#FFC9DE', '#B79CF0', 5), 26, [-150, 70, -300], '#FFE3F0');
    addPlanet(planetTex('#B9F3E4', '#7FA9F0', 3), 12, [170, 105, -330], null);
    addPlanet(planetTex('#FFE6B0', '#F7A98F', 4), 7, [80, 40, -280], '#FFF2D6');
    const moonTex = discTex((g) => {
      const gr = g.createRadialGradient(110, 100, 10, 128, 128, 126); gr.addColorStop(0, '#FFFBEA'); gr.addColorStop(1, '#F6E3B0');
      g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(214,190,140,0.35)'; [[90, 90, 22], [160, 120, 14], [120, 170, 28], [180, 70, 10], [70, 150, 9]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    });
    const haloTex = kit.haloTex;
    const moon = new THREE.Group(); moon.position.set(40, 62, -390); skyGroup.add(moon);
    { const m = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false })); m.userData.noBend = true; m.renderOrder = -5; moon.add(m);
      const h = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshBasicMaterial({ map: haloTex, color: col('#FFF1C8'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.position.z = -1; h.userData.noBend = true; h.renderOrder = -6; moon.add(h); }

    // shooting stars
    const shooters = [];
    const shootMat = new THREE.MeshBasicMaterial({ color: col('#FFF6DA'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.9), shootMat.clone()); m.userData.noBend = true; m.renderOrder = -4; m.visible = false; skyGroup.add(m);
      shooters.push({ m, t: 9, dur: 1, from: new THREE.Vector3(), dir: new THREE.Vector3() });
    }
    function shoot(strong) {
      const s = shooters.find((x) => x.t >= x.dur); if (!s) return;
      s.t = 0; s.dur = 0.7 + Math.random() * 0.5;
      s.from.set((Math.random() - 0.5) * 420, 90 + Math.random() * 120, -260 - Math.random() * 120);
      s.dir.set(-0.8 - Math.random() * 0.4, -0.45 - Math.random() * 0.2, 0).normalize().multiplyScalar(strong ? 260 : 180);
      s.m.rotation.z = Math.atan2(s.dir.y, s.dir.x); s.m.visible = true;
    }

    // sky fireworks (points, not bent)
    const FW_N = 600;
    const fwPos = new Float32Array(FW_N * 3), fwCol = new Float32Array(FW_N * 3), fwVel = new Float32Array(FW_N * 3), fwLife = new Float32Array(FW_N).fill(9);
    const fwGeo = new THREE.BufferGeometry();
    fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
    const fwPts = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 5, sizeAttenuation: true, vertexColors: true, map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    fwPts.userData.noBend = true; fwPts.frustumCulled = false; fwPts.renderOrder = -3; skyGroup.add(fwPts);
    let fwNext = 0;
    function firework(hue) {
      const cx = (Math.random() - 0.5) * 240, cy = 70 + Math.random() * 70, cz = -220 - Math.random() * 80, n = 70, c = new THREE.Color();
      for (let k = 0; k < n; k++) {
        const i = fwNext; fwNext = (fwNext + 1) % FW_N;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), sp = 26 + Math.random() * 8;
        fwPos[i * 3] = cx; fwPos[i * 3 + 1] = cy; fwPos[i * 3 + 2] = cz;
        fwVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp; fwVel[i * 3 + 1] = Math.cos(ph) * sp; fwVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp * 0.4;
        c.setHSL((hue + Math.random() * 0.08) % 1, 0.85, 0.75); fwCol[i * 3] = c.r; fwCol[i * 3 + 1] = c.g; fwCol[i * 3 + 2] = c.b; fwLife[i] = 0;
      }
    }

    // ---------- Sea of clouds below and lanterns beside the track ----------
    const SEA_N = 110;
    const seaGeo = new THREE.IcosahedronGeometry(1, 2);
    const seaMat = new THREE.MeshLambertMaterial({ color: col(LOOKS[0].sea), emissive: col(LOOKS[0].sea), emissiveIntensity: 0.55 });
    const sea = new THREE.InstancedMesh(seaGeo, seaMat, SEA_N); sea.frustumCulled = false; scene.add(sea);
    const seaItems = [];
    for (let i = 0; i < SEA_N; i++) seaItems.push({ x: (hash(i * 1.7) - 0.5) * 150, z: -hash(i * 3.3) * 200 + 20, y: -11 - hash(i * 5.1) * 3, s: 4 + hash(i * 9.1) * 6, k: hash(i * 2.2) });
    const LANT_N = 36;
    const lantGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.55, 12);
    const lantMat = new THREE.MeshBasicMaterial({ color: col('#FFD9A0') });
    const lanterns = new THREE.InstancedMesh(lantGeo, lantMat, LANT_N); lanterns.frustumCulled = false; scene.add(lanterns);
    const lantGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: haloTex, color: col('#FFC27A'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), LANT_N);
    lantGlow.frustumCulled = false; scene.add(lantGlow);
    const lantItems = [];
    for (let i = 0; i < LANT_N; i++) { const side = i % 2 ? 1 : -1; lantItems.push({ x: side * (6 + hash(i * 4.4) * 26), z: -hash(i * 6.6) * 180 + 10, y: -4 + hash(i * 8.8) * 12, sp: 0.4 + hash(i * 1.1) * 0.5, ph: hash(i * 3.9) * 6 }); }

    // ---------- Track ----------
    const sectionOf = (b) => { for (let i = chart.sections.length - 1; i >= 0; i--) if (b >= chart.sections[i].b0) return i; return 0; };
    const lookOf = (si) => LOOKS[Math.min(LOOKS.length - 1, chart.sections[si].sky)];
    const tiles = [];
    const cells = chart.total * chart.STEPS, CELL = D / chart.STEPS;
    const TAIL = 8; // beats of track after the song, into the moonlight
    for (let s = -8 * chart.STEPS; s < cells + TAIL * chart.STEPS; s++) for (let l = 0; l < 3; l++) {
      const inSong = s >= 0 && s < cells;
      if (inSong && !chart.floor[l][s]) continue;
      const b = (s + 0.5) / chart.STEPS, si = sectionOf(Math.max(0, Math.min(chart.total - 1, b)));
      const nextGap = inSong && s + 1 < cells && !chart.floor[l][s + 1];
      tiles.push({ s, l, b, si, nextGap, alt: (Math.floor(s / chart.STEPS) + l) % 2 });
    }
    const tileGeo = new THREE.BoxGeometry(LW * 0.9, 0.22, CELL * 0.9);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tileMesh = new THREE.InstancedMesh(tileGeo, tileMat, tiles.length); tileMesh.frustumCulled = false;
    const edgeGeo = new THREE.BoxGeometry(LW * 0.98, 0.2, CELL * 0.98);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const edgeMesh = new THREE.InstancedMesh(edgeGeo, edgeMat, tiles.length); edgeMesh.frustumCulled = false;
    const UP = new THREE.Vector3(0, 1, 0), v3b = new THREE.Vector3(), qz = new THREE.Quaternion(), qy = new THREE.Quaternion(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
    const tileBase = [], tileBase2 = [], edgeBase = [];
    tiles.forEach((t, i) => {
      m4.compose(v3.set(xOf(t.l), -0.11, zOf(t.b)), q.identity(), s3.set(1, 1, 1)); tileMesh.setMatrixAt(i, m4);
      m4.compose(v3.set(xOf(t.l), -0.2, zOf(t.b)), q, s3); edgeMesh.setMatrixAt(i, m4);
      const L = LOOKS[Math.min(LOOKS.length - 1, chart.sections[t.si].sky)];
      tileBase.push(col(t.alt ? L.tile : L.tile2)); tileBase2.push(col(L.accent)); edgeBase.push(col(L.rail).multiplyScalar(0.75));
      tileMesh.setColorAt(i, tileBase[i]); edgeMesh.setColorAt(i, edgeBase[i]);
    });
    scene.add(edgeMesh, tileMesh);
    // rails along both edges, finely split so they can bend
    const railLen = (chart.total + TAIL + 8) * D, railSeg = Math.ceil(railLen / 1.2);
    const railMat = new THREE.MeshBasicMaterial({ color: col(LOOKS[0].rail) });
    const rails = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, railLen, 1, 1, railSeg), railMat); m.position.set(sx * (1.5 * LW + 0.08), -0.08, -railLen / 2 + 8 * D); scene.add(m); return m; });
    // section portals: a ring of light at the start of each part of the song
    const portals = chart.sections.slice(1).map((sec) => {
      const L = lookOf(chart.sections.indexOf(sec));
      const g = new THREE.Group(); g.position.set(0, 0, zOf(sec.b0)); scene.add(g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.13, 10, 72, Math.PI), new THREE.MeshBasicMaterial({ color: col(L.accent) })); g.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.65, 0.05, 8, 72, Math.PI), new THREE.MeshBasicMaterial({ color: col('#FFFFFF'), transparent: true, opacity: 0.7 })); g.add(ring2);
      const dots = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI, d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: col('#FFFFFF') })); d.position.set(Math.cos(a) * 4.3, Math.sin(a) * 4.3, 0); g.add(d); dots.push(d); }
      return { g, ring, b: sec.b0, dots };
    });

    // ---------- Notes, a dotted guide between them, big stars ----------
    const notes = chart.notes;
    const noteGeo = kit.starGeo;
    const noteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: col('#FFFFFF'), emissiveIntensity: 0.22 });
    const noteMesh = new THREE.InstancedMesh(noteGeo, noteMat, notes.length); noteMesh.frustumCulled = false; scene.add(noteMesh);
    const noteHalo = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }), notes.length);
    noteHalo.frustumCulled = false; scene.add(noteHalo);
    const noteCol = notes.map((n) => { const deg = [0, 2, 4, 5, 7, 9, 11].indexOf(((n.pitch - 62) % 12 + 12) % 12); const h = NOTE_HUES[deg < 0 ? 7 : deg]; return new THREE.Color().setHSL(h, 0.85, 0.68); });
    notes.forEach((n, i) => { noteMesh.setColorAt(i, noteCol[i]); noteHalo.setColorAt(i, noteCol[i]); });
    const noteState = notes.map(() => ({ got: 0, gotT: 0 }));
    // stardust dots that join notes into a path (only where the next note is close)
    const dust = [];
    for (let i = 0; i + 1 < notes.length; i++) {
      const a = notes[i], b = notes[i + 1]; if (b.b - a.b > 1.6) continue;
      const k = Math.max(1, Math.round((b.b - a.b) * 3));
      for (let j = 1; j < k; j++) { const u = j / k; dust.push({ b: lerp(a.b, b.b, u), x: lerp(a.lane, b.lane, u), y: lerp(a.y, b.y, u), i }); }
    }
    const dustMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: col('#FFF4D6'), transparent: true, opacity: 0.85 }), Math.max(1, dust.length));
    dustMesh.frustumCulled = false; scene.add(dustMesh);
    dust.forEach((d, i) => { m4.compose(v3.set((d.x - 1) * LW, d.y + 0.45, zOf(d.b)), q.identity(), s3.set(1, 1, 1)); dustMesh.setMatrixAt(i, m4); });
    // shadows of floating notes on the track
    const noteShadow = new THREE.InstancedMesh(new THREE.CircleGeometry(0.28, 14), new THREE.MeshBasicMaterial({ color: col('#3A2F6A'), transparent: true, opacity: 0.22, depthWrite: false }), notes.length);
    noteShadow.frustumCulled = false; scene.add(noteShadow);
    notes.forEach((n, i) => {
      const onFloor = chart.hasFloor(n.lane, n.b) && n.y > 0.2;
      m4.compose(v3.set(xOf(n.lane), 0.012, zOf(n.b)), q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), s3.setScalar(onFloor ? 1 : 0)); noteShadow.setMatrixAt(i, m4);
    });
    q.identity();
    const bigs = chart.items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === 'big').map(({ it, i }) => {
      const g = new THREE.Group(); g.position.set(xOf(it.lane), (it.y || 0.95) + 0.25, zOf(it.b)); scene.add(g);
      const st = new THREE.Mesh(kit.starGeo, new THREE.MeshLambertMaterial({ color: col('#FFD45E'), emissive: col('#FFC93C'), emissiveIntensity: 0.7 })); st.scale.setScalar(1.75); g.add(st);
      const rays = new THREE.Group(); g.add(rays);
      for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1.1), new THREE.MeshBasicMaterial({ color: col('#FFF3B8'), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); r.position.set(Math.cos(k / 8 * Math.PI * 2) * 1.0, Math.sin(k / 8 * Math.PI * 2) * 1.0, -0.05); r.rotation.z = k / 8 * Math.PI * 2 - Math.PI / 2; rays.add(r); }
      const h = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: haloTex, color: col('#FFE08A'), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(h);
      return { it, idx: i, g, st, rays, h, got: false, gotT: 0 };
    });

    // ---------- Obstacles ----------
    const thornMat = new THREE.MeshLambertMaterial({ color: col(PAL.thorn), emissive: col(PAL.thorn), emissiveIntensity: 0.35 });
    const spikeGeo = new THREE.ConeGeometry(0.2, 0.62, 7);
    spikeGeo.translate(0, 0.31, 0);
    const SPIKES = [[-0.42, 0.02, 0.9], [0, -0.06, 1.15], [0.42, 0.04, 0.95], [-0.2, 0.36, 0.7], [0.24, 0.34, 0.75]];
    const thorns = chart.items.filter((it) => it.kind === 'thorn');
    const thornMesh = new THREE.InstancedMesh(spikeGeo, thornMat, Math.max(1, thorns.length * SPIKES.length)); thornMesh.frustumCulled = false; scene.add(thornMesh);
    thorns.forEach((it, i) => SPIKES.forEach(([dx, dz, h], k) => { m4.compose(v3.set(xOf(it.lane) + dx, 0, zOf(it.b + 0.25) + dz), q.identity(), s3.set(1, h, 1)); thornMesh.setMatrixAt(i * SPIKES.length + k, m4); }));
    // beat thorns: rise on their beat, sink on the other one
    const takts = chart.items.filter((it) => it.kind === 'takt').map((it) => {
      const g = new THREE.Group(); g.position.set(xOf(it.lane), 0, zOf(it.b + 0.25)); scene.add(g);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 28), new THREE.MeshBasicMaterial({ color: col('#F7C1D2') })); pad.position.y = 0.02; g.add(pad);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: col(PAL.thorn) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const sp = new THREE.Group(); g.add(sp);
      SPIKES.forEach(([dx, dz, h]) => { const c = new THREE.Mesh(spikeGeo, thornMat); c.position.set(dx, 0, dz); c.scale.set(1, h, 1); sp.add(c); });
      return { it, g, sp, up: 0 };
    });
    // grumpy clouds: tall, cannot be jumped, so change lanes
    function mergeGeos(list) {
      let nPos = 0, nIdx = 0; for (const g of list) { nPos += g.attributes.position.count; nIdx += g.index.count; }
      const pos = new Float32Array(nPos * 3), nor = new Float32Array(nPos * 3), idx = new Uint32Array(nIdx); let po = 0, io = 0;
      for (const g of list) { pos.set(g.attributes.position.array, po * 3); nor.set(g.attributes.normal.array, po * 3); for (let k = 0; k < g.index.count; k++) idx[io + k] = g.index.array[k] + po; po += g.attributes.position.count; io += g.index.count; g.dispose(); }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
    }
    const puffs = [[0, 0.75, 0, 0.78], [-0.5, 0.55, 0.05, 0.55], [0.52, 0.6, 0, 0.58], [0, 1.45, -0.05, 0.62], [-0.38, 1.25, 0.1, 0.45], [0.4, 1.3, 0.05, 0.48], [0, 1.95, 0, 0.42]];
    const cloudGeo = mergeGeos(puffs.map(([x, y, z, r]) => { const g = new THREE.SphereGeometry(r, 18, 14); g.translate(x, y, z); return g; }));
    const cloudMat = new THREE.MeshLambertMaterial({ color: col('#C9C2E6'), emissive: col('#8E86B8'), emissiveIntensity: 0.25 });
    const inkMat = new THREE.MeshBasicMaterial({ color: col(PAL.ink) });
    const walls = chart.items.filter((it) => it.kind === 'wall').map((it) => {
      const g = new THREE.Group(); g.position.set(xOf(it.lane), 0, zOf(it.b + 0.25)); scene.add(g);
      const body = new THREE.Mesh(cloudGeo, cloudMat); g.add(body);
      const face = new THREE.Group(); face.position.set(0, 1.25, 0.66); g.add(face);
      const eyes = [-1, 1].map((sx) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), inkMat); e.scale.set(1, 1.3, 0.5); e.position.set(sx * 0.2, 0.02, 0); face.add(e); return e; });
      [-1, 1].forEach((sx) => { const br = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.04), inkMat); br.position.set(sx * 0.2, 0.17, 0.01); br.rotation.z = sx * -0.42; face.add(br); });
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 14, Math.PI), inkMat); mouth.position.set(0, -0.2, 0); face.add(mouth);
      return { it, g, body, eyes, face, bump: 0, ph: hash(it.b) * 6 };
    });
    // mushrooms launch Mimo high into the sky
    const mushes = chart.items.filter((it) => it.kind === 'mush').map((it) => {
      const g = new THREE.Group(); g.position.set(xOf(it.lane), 0, zOf(it.b)); scene.add(g);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.42, 16), new THREE.MeshLambertMaterial({ color: col('#FBEFEA') })); stem.position.y = 0.21; g.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.72, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: col('#F59DB6'), emissive: col('#F59DB6'), emissiveIntensity: 0.3 })); cap.scale.y = 0.62; cap.position.y = 0.38; g.add(cap);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, d = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: col('#FFFFFF') })); const r = 0.42; d.position.set(Math.cos(a) * r, 0.38 + 0.3, Math.sin(a) * r); d.lookAt(Math.cos(a) * 2, 2.2, Math.sin(a) * 2); g.add(d); }
      const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: haloTex, color: col('#FFB5CB'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); arrow.position.y = 1.4; g.add(arrow);
      return { it, g, cap, arrow, squash: 0 };
    });
    // moon gate at the end
    const gateIt = chart.items.find((it) => it.kind === 'gate');
    const gate = (() => {
      const g = new THREE.Group(); g.position.set(0, 0, zOf(gateIt ? gateIt.b : chart.total - 4)); scene.add(g);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.42, 16, 90, Math.PI), new THREE.MeshLambertMaterial({ color: col('#FFF1C2'), emissive: col('#FFE3A0'), emissiveIntensity: 0.75 })); g.add(arch);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64, 0, Math.PI), new THREE.MeshBasicMaterial({ map: haloTex, color: col('#FFF6DA'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); g.add(inner);
      const crescent = new THREE.Group(); crescent.position.set(0, 5.9, 0); g.add(crescent);
      const c1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.3, 12, 40, Math.PI * 1.25), new THREE.MeshLambertMaterial({ color: col('#FFE9A6'), emissive: col('#FFD873'), emissiveIntensity: 0.8 })); c1.rotation.z = -Math.PI * 0.12; crescent.add(c1);
      const sparkles = []; for (let k = 0; k < 14; k++) { const a = k / 13 * Math.PI, st = new THREE.Mesh(kit.starGeo, new THREE.MeshBasicMaterial({ color: col('#FFF6D0') })); st.scale.setScalar(0.45); st.position.set(Math.cos(a) * 5.4, Math.sin(a) * 5.4, 0.2); g.add(st); sparkles.push(st); }
      return { g, arch, inner, crescent, sparkles };
    })();

    bendAll(scene);

    // ---------- Look blending ----------
    const cur = { top: col(LOOKS[0].top), mid: col(LOOKS[0].mid), hor: col(LOOKS[0].hor), fog: col(LOOKS[0].fog), rail: col(LOOKS[0].rail), sea: col(LOOKS[0].sea), hemi: col(LOOKS[0].hemi), sun: col(LOOKS[0].sun), stars: 0.25, aurora: 0, planets: 0.3 };
    const ca = new THREE.Color(), cb = new THREE.Color();
    function mixHex(target, a, b, k) { ca.set(a); cb.set(b); target.copy(ca).lerp(cb, k); }
    function lookAt(beat) {
      // blend over the two beats before a new section begins
      const si = sectionOf(Math.max(0, beat)), next = Math.min(chart.sections.length - 1, si + 1);
      const k = si === next ? 0 : clamp((beat - (chart.sections[next].b0 - 2)) / 2, 0, 1);
      const A = lookOf(si), B = lookOf(next);
      for (const key of ['top', 'mid', 'hor', 'fog', 'rail', 'sea', 'hemi', 'sun']) mixHex(cur[key], A[key], B[key], k);
      cur.stars = lerp(A.stars, B.stars, k); cur.aurora = lerp(A.aurora, B.aurora, k); cur.planets = lerp(A.planets, B.planets, k);
      cur.si = k > 0.5 ? next : si; cur.name = (k > 0.5 ? B : A).name;
      return cur;
    }

    // ---------- Per frame ----------
    const camQ = new THREE.Quaternion();
    function update(f) {
      // f: { beat, t, dt, cam, mimoX, mimoLane, flash, fever, outro, pulse }
      const { beat, t, dt, cam } = f;
      const L = lookAt(beat);
      skyGroup.position.copy(cam.position);
      skyU.uTop.value.set(L.top.r, L.top.g, L.top.b); skyU.uMid.value.set(L.mid.r, L.mid.g, L.mid.b); skyU.uHor.value.set(L.hor.r, L.hor.g, L.hor.b);
      // dome colors are written as they are (sRGB numbers), convert from linear Color
      for (const u of [skyU.uTop, skyU.uMid, skyU.uHor]) { const v = u.value; tmpC.setRGB(v.x, v.y, v.z, THREE.LinearSRGBColorSpace); const out = {}; tmpC.getRGB(out, THREE.SRGBColorSpace); v.set(out.r, out.g, out.b); }
      skyU.uFlash.value = f.flash || 0;
      if (scene.fog) scene.fog.color.copy(L.fog);
      starU.uTime.value = t; starU.uAmt.value = L.stars; starU.uPulse.value = f.pulse || 0;
      auroraU.uTime.value = t; auroraU.uAmt.value = L.aurora * (reduced() ? 0.6 : 1);
      for (const p of planets) p.g.children.forEach((c) => { c.material.opacity = (c.geometry.type === 'RingGeometry' ? 0.55 : 1) * clamp(L.planets, 0, 1); });
      planets.forEach((p, i) => { p.g.position.set(p.base[0], p.base[1] + Math.sin(t * 0.07 + i) * 3, p.base[2]); });
      // the moon rises into the middle for the finish
      const endK = clamp((beat - (chart.total - 24)) / 20, 0, 1), ek = endK * endK * (3 - 2 * endK);
      moon.position.set(lerp(40, 0, ek), lerp(62, 38, ek), lerp(-390, -330, ek)); moon.scale.setScalar(lerp(1, 2.1, ek));
      if (f.fever) railMat.color.setHSL((t * 0.35) % 1, 0.85, 0.72); else railMat.color.copy(L.rail);
      seaMat.color.copy(L.sea); seaMat.emissive.copy(L.sea);
      // shooting stars and fireworks
      for (const s of shooters) {
        if (s.t >= s.dur) { s.m.visible = false; continue; }
        s.t += dt; const k = s.t / s.dur; s.m.position.copy(s.from).addScaledVector(s.dir, s.t); s.m.material.opacity = Math.sin(k * Math.PI) * 0.9;
      }
      for (let i = 0; i < FW_N; i++) {
        if (fwLife[i] > 2) { fwPos[i * 3 + 1] = -9999; continue; }
        fwLife[i] += dt; fwVel[i * 3 + 1] -= 9 * dt; const drag = 1 - dt * 1.2;
        fwVel[i * 3] *= drag; fwVel[i * 3 + 1] *= drag; fwVel[i * 3 + 2] *= drag;
        fwPos[i * 3] += fwVel[i * 3] * dt; fwPos[i * 3 + 1] += fwVel[i * 3 + 1] * dt; fwPos[i * 3 + 2] += fwVel[i * 3 + 2] * dt;
        const fade = clamp(1 - fwLife[i] / 2, 0, 1); fwCol[i * 3] *= 0.985 + 0.015 * fade; fwCol[i * 3 + 1] *= 0.985 + 0.015 * fade; fwCol[i * 3 + 2] *= 0.985 + 0.015 * fade;
      }
      fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true;

      const camZ = cam.position.z;
      // cloud sea and lanterns wrap around the camera
      for (let i = 0; i < SEA_N; i++) {
        const c = seaItems[i]; if (c.z > camZ + 25) c.z -= 200; if (c.z < camZ - 175) c.z += 200;
        m4.compose(v3.set(c.x, c.y + Math.sin(t * 0.3 + c.k * 9) * 0.4, c.z), q.identity(), s3.set(c.s, c.s * 0.42, c.s * 0.8)); sea.setMatrixAt(i, m4);
      }
      sea.instanceMatrix.needsUpdate = true;
      camQ.copy(cam.quaternion);
      for (let i = 0; i < LANT_N; i++) {
        const c = lantItems[i]; if (c.z > camZ + 12) c.z -= 190; if (c.z < camZ - 178) c.z += 190;
        c.y += dt * c.sp * 0.6; if (c.y > 12) c.y = -6;
        const x = c.x + Math.sin(t * 0.5 + c.ph) * 0.6;
        m4.compose(v3.set(x, c.y, c.z), q.setFromAxisAngle(UP, t * 0.3 + c.ph), s3.set(1, 1, 1)); lanterns.setMatrixAt(i, m4);
        m4.compose(v3.set(x, c.y, c.z), camQ, s3.setScalar(1 + Math.sin(t * 3 + c.ph) * 0.12)); lantGlow.setMatrixAt(i, m4);
      }
      lanterns.instanceMatrix.needsUpdate = true; lantGlow.instanceMatrix.needsUpdate = true;
      q.identity();

      // tiles near the camera: beat glow, light under Mimo, warning before gaps
      const beatK = Math.max(0, 1 - (beat - Math.floor(beat)) * 2.6) * (beat >= 0 ? 1 : 0.4);
      const near = beat - 3, far = beat + 22;
      for (let i = 0; i < tiles.length; i++) {
        const tl = tiles[i]; if (tl.b < near || tl.b > far) continue;
        const ahead = tl.b - beat;
        tmpC.copy(tileBase[i]);
        let glow = beatK * 0.22 * clamp(1 - Math.abs(ahead) / 14, 0, 1);
        if (Math.abs(ahead) < 0.6 && tl.l === f.mimoLane) glow += 0.35;
        if (f.fever) glow += 0.1 + 0.08 * Math.sin(t * 6 + tl.b * 0.9 + tl.l);
        tmpC.lerp(tileBase2[i], clamp(glow, 0, 1));
        if (tl.nextGap && ahead > -0.5 && ahead < 4) { tmpC2.set('#FF8FAF'); tmpC.lerp(tmpC2, 0.45 + 0.3 * beatK); }
        if (f.fever) { tmpC2.setHSL((tl.b * 0.05 + tl.l * 0.12 + t * 0.2) % 1, 0.85, 0.8); tmpC.lerp(tmpC2, 0.55); }
        tileMesh.setColorAt(i, tmpC);
      }
      tileMesh.instanceColor.needsUpdate = true;
      // notes: spin, bob, appear from the distance, vanish when collected
      // notes face the camera and rock a little, so the star shape always reads
      const look = q, Z = v3b;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i], st = noteState[i];
        const ahead = n.b - beat;
        let sc = 0;
        if (ahead > -2 && ahead < 26) {
          sc = clamp((26 - ahead) / 4, 0, 1);
          if (st.got) { st.gotT += dt; sc = Math.max(0, 1 - st.gotT * 6) * 1.6; }
        }
        const y = n.y + 0.45 + Math.sin(t * 2.5 + i) * 0.06 + (st.got ? st.gotT * 3 : 0);
        look.copy(camQ).multiply(qz.setFromAxisAngle(Z.set(0, 0, 1), Math.sin(t * 3 + i) * 0.35)).multiply(qy.setFromAxisAngle(UP, Math.sin(t * 2.1 + i * 1.3) * 0.5));
        m4.compose(v3.set(xOf(n.lane), y, zOf(n.b)), look, s3.setScalar(sc * 1.35)); noteMesh.setMatrixAt(i, m4);
        m4.compose(v3.set(xOf(n.lane), y, zOf(n.b) - 0.05), camQ, s3.setScalar(sc * (1 + 0.25 * beatK))); noteHalo.setMatrixAt(i, m4);
      }
      noteMesh.instanceMatrix.needsUpdate = true; noteHalo.instanceMatrix.needsUpdate = true;
      q.identity();
      for (const bg of bigs) {
        const ahead = bg.it.b - beat;
        bg.g.visible = ahead > -2 && ahead < 26 && (!bg.got || bg.gotT < 0.5);
        if (!bg.g.visible) continue;
        bg.st.rotation.y = t * 2.6; bg.rays.rotation.z = t * 0.8; bg.rays.quaternion.copy(camQ); bg.rays.rotateZ(t * 0.8); bg.h.quaternion.copy(camQ);
        let s = 1 + beatK * 0.12;
        if (bg.got) { bg.gotT += dt; s *= 1 + bg.gotT * 4; bg.g.position.y += dt * 4; bg.h.material.opacity = Math.max(0, 0.85 - bg.gotT * 2); }
        bg.g.scale.setScalar(s);
      }
      for (const tk of takts) {
        const up = Math.floor(beat) % 2 === Math.floor(tk.it.b) % 2 ? 1 : 0;
        tk.up = lerp(tk.up, up, 1 - Math.exp(-dt * 22));
        tk.sp.scale.y = Math.max(0.05, tk.up); tk.sp.position.y = (tk.up - 1) * 0.1;
      }
      for (const w of walls) {
        const ahead = w.it.b - beat; if (ahead < -3 || ahead > 26) { w.g.visible = false; continue; }
        w.g.visible = true;
        w.bump = Math.max(0, w.bump - dt * 2.5);
        const sq = Math.sin(w.bump * 14) * w.bump * 0.25;
        w.body.scale.set(1 + sq, 1 - sq, 1 + sq); w.g.position.y = Math.sin(t * 2 + w.ph) * 0.06;
        const blink = Math.sin(t * 1.3 + w.ph * 3) > 0.985 ? 0.15 : 1;
        for (const e of w.eyes) { e.scale.y = 1.3 * blink; e.position.x = Math.sign(e.position.x) * 0.2 + clamp((f.mimoX - w.it.lane) * 0.04, -0.06, 0.06); }
      }
      for (const m of mushes) { m.squash = Math.max(0, m.squash - dt * 3); m.cap.scale.set(1 + m.squash * 0.3, 0.62 * (1 - m.squash * 0.45), 1 + m.squash * 0.3); m.arrow.quaternion.copy(camQ); m.arrow.position.y = 1.4 + Math.sin(t * 5) * 0.1; m.arrow.material.opacity = 0.5 + beatK * 0.5; }
      for (const p of portals) { const ahead = p.b - beat; p.g.visible = ahead > -2 && ahead < 26; if (!p.g.visible) continue; const s = 1 + beatK * 0.04; p.g.scale.setScalar(s); p.dots.forEach((d, k) => d.scale.setScalar(0.8 + 0.5 * Math.max(0, Math.sin(t * 4 - k * 0.7)))); }
      gate.inner.material.opacity = 0.45 + 0.25 * beatK; gate.crescent.rotation.z = Math.sin(t * 0.8) * 0.1;
      gate.sparkles.forEach((s, k) => { s.rotation.z = t * 1.5 + k; s.scale.setScalar(0.4 + 0.15 * Math.sin(t * 3 + k)); });
    }

    function collectNote(i) { if (noteState[i]) { noteState[i].got = 1; noteState[i].gotT = 0; } }
    function collectBig(itemIdx) { const bg = bigs.find((x) => x.idx === itemIdx); if (bg) { bg.got = true; bg.gotT = 0; } }
    function bumpWall(beat, lane) { const w = walls.find((x) => x.it.lane === lane && Math.abs(x.it.b - beat) < 1); if (w) w.bump = 1; }
    function squashMush(beat) { const m = mushes.find((x) => Math.abs(x.it.b - beat) < 0.6); if (m) m.squash = 1; }
    function reset() {
      noteState.forEach((s) => { s.got = 0; s.gotT = 0; });
      bigs.forEach((bg) => { bg.got = false; bg.gotT = 0; bg.g.position.y = (bg.it.y || 0.95) + 0.25; bg.h.material.opacity = 0.85; });
    }
    function dispose() { disposables.forEach((t) => t.dispose()); }
    return { LOOKS, update, collectNote, collectBig, bumpWall, squashMush, shoot, firework, reset, dispose, bend, bendAll, bendU, noteCol, lookAt, sectionOf, starU };
  }

  window.StarwayWorld = { create, LOOKS };
})();
