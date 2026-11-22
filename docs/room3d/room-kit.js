/* Mimo hüpft · Kinderzimmer (3D) · kit
   Palette, textures, materials and small geometry helpers for the giant kids' room.
   Needs the global THREE (r160) and Mimo3D. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  /* Look system of the room. Every colour belongs to one of five groups:
     - Backdrop (walls, furniture): light, low saturation, fades into the warm haze.
     - Ground (wood floor, rug): calm mid-tones, so everything on top of it stands out.
     - Toys you can walk on: saturated toy colours, a little glossy.
     - Danger: only PAL.danger, always with a dark ink outline.
     - Collectibles: only PAL.gold. */
  const PAL = {
    haze: '#F1DCC0', wall: '#DBE4D8', skirting: '#F5F0E4', ceiling: '#FFF7E8',
    floor: '#C4925F', rug: '#789FB3', rugLight: '#EDE2CC', rugAccent: '#D7876A',
    red: '#E25B45', yellow: '#F4BF3A', blue: '#4686D2', green: '#52AE75', orange: '#EE8A38', purple: '#9474CE',
    block: '#EBD2A6', paper: '#F5EEDF', ink: '#3A3850', gold: '#F6C83C', danger: '#D8386A',
    track: '#3A3C49', white: '#FFFFFF', furniture: '#F1EADB', birch: '#E6D2B0', teddy: '#C4905F',
    // names the shared Mimo figure reads
    blush: '#F4B4C0', leaf: '#9CCDB0', mint: '#A9DCC3', star: '#F6C83C', thorn: '#E79AB3', lav: '#C9B8EA',
  };
  const TOY_COLORS = [PAL.red, PAL.yellow, PAL.blue, PAL.green, PAL.orange];

  // How much of the room picture ordinary toys reflect; shiny things ask for more
  const ENV_SOFT = 0.3, ENV_SHINY = 0.8;
  // Share of their own colour that flat pictures (flag, crest) show even where little light arrives
  const GLOW_OWN = 0.4;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // Small seeded random generator, so the room looks the same on every visit
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function makeKit(THREE, scene, renderer, opts) {
    const base = window.Mimo3D.kit(THREE, scene, PAL);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const owned = [];
    // every glossy material is listed, so the time of day can turn the room's reflections down together
    const envMats = [];
    const listEnv = (m) => { if (m && m.isMeshStandardMaterial) envMats.push([m, m.envMapIntensity]); return m; };
    const own = (x) => { owned.push(x); return listEnv(x); };
    function setEnvLevel(f) { for (const [m, full] of envMats) m.envMapIntensity = full * f; }
    const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getStyle();

    function canvasTex(w, h, draw, repeat) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      const t = own(new THREE.CanvasTexture(cv));
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso);
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      return t;
    }

    // Glossy toy material; plain colours are cached
    const stdCache = new Map();
    function std(color, opts) {
      const key = color + (opts ? JSON.stringify(opts) : '');
      if (!stdCache.has(key)) stdCache.set(key, listEnv(new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.5, metalness: 0, envMapIntensity: ENV_SOFT }, opts || {}))));
      return stdCache.get(key);
    }
    function texStd(map, opts) { return own(new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.7, metalness: 0, envMapIntensity: ENV_SOFT }, opts || {}))); }

    // A soft picture of the room for reflections: bright ceiling, wood floor, one bright window
    function buildEnv() {
      const envScene = new THREE.Scene(), R = 10;
      const geo = new THREE.SphereGeometry(R, 24, 16), pos = geo.attributes.position, col = [];
      const top = new THREE.Color(PAL.ceiling), mid = new THREE.Color(PAL.wall), bot = new THREE.Color(PAL.floor), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) { const kk = pos.getY(i) / R; if (kk > 0) c.copy(mid).lerp(top, kk); else c.copy(mid).lerp(bot, -kk); col.push(c.r, c.g, c.b); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const shellMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
      envScene.add(new THREE.Mesh(geo, shellMat));
      const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.4, 3.4), side: THREE.DoubleSide });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 7), winMat); win.position.set(-9, 3, 2); win.lookAt(0, 0, 0); envScene.add(win);
      const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(envScene, 0.04);
      pm.dispose(); geo.dispose(); shellMat.dispose(); winMat.dispose(); win.geometry.dispose();
      return own(rt.texture);
    }

    // Box with round edges (same construction as in the Himmelsinseln)
    function roundedBox(w, h, d, r, seg) {
      const n = seg || 5, geo = new THREE.BoxGeometry(w, h, d, n, n, n), pos = geo.attributes.position, nor = geo.attributes.normal;
      const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); c.set(clamp(v.x, -ix, ix), clamp(v.y, -iy, iy), clamp(v.z, -iz, iz)); nn.subVectors(v, c);
        if (nn.lengthSq() < 1e-10) nn.fromBufferAttribute(nor, i); nn.normalize();
        v.copy(c).addScaledVector(nn, r); pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, nn.x, nn.y, nn.z);
      }
      return geo;
    }

    // Joins several geometries into one, each moved by its matrix: one draw call instead of many.
    // parts: [[geometry, Matrix4 or null, Color or nothing], ...]. With colours the result carries them per
    // vertex, for a material with vertexColors.
    function mergeGeos(parts) {
      const P = [], N = [], U = [], C = [], I = [], v = new THREE.Vector3(), nm = new THREE.Matrix3(), tinted = parts.some((part) => part[2]);
      let base = 0;
      for (const [geo, m, color] of parts) {
        const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index;
        if (m) nm.getNormalMatrix(m);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i); if (m) v.applyMatrix4(m); P.push(v.x, v.y, v.z);
          v.fromBufferAttribute(nor, i); if (m) v.applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
          U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
          if (tinted) C.push(color ? color.r : 1, color ? color.g : 1, color ? color.b : 1);
        }
        if (idx) for (let i = 0; i < idx.count; i++) I.push(idx.getX(i) + base); else for (let i = 0; i < pos.count; i++) I.push(i + base);
        base += pos.count;
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); out.setIndex(I);
      if (tinted) out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      return out;
    }
    // Backdrop furniture is made of many plain matte pieces. This melts all such pieces that hang directly
    // in a group into one mesh that keeps their colours, so a shelf full of books is one draw call.
    const bakedMat = own(new THREE.MeshLambertMaterial({ vertexColors: true }));
    function bakeColors(g) {
      const plain = (o) => o.isMesh && !o.isInstancedMesh && !o.children.length && o.material.isMeshLambertMaterial && !o.material.map && !o.material.transparent && o.material.side === THREE.FrontSide && o.material.emissive.getHex() === 0;
      const parts = g.children.filter(plain).map((o) => { o.updateMatrix(); g.remove(o); return [o.geometry, o.matrix.clone(), o.material.color]; });
      if (parts.length) base.mesh(mergeGeos(parts), bakedMat, 0, 0, 0, g);
      return g;
    }
    // The same for a group whose meshes all share one material
    function bakeSame(g) {
      const kids = g.children.filter((o) => o.isMesh), material = kids[0].material;
      const parts = kids.map((o) => { o.updateMatrix(); g.remove(o); return [o.geometry, o.matrix.clone()]; });
      base.mesh(mergeGeos(parts), material, 0, 0, 0, g);
      return g;
    }
    // Flat strip along a path. at(i) gives { x, z, nx, nz, d }: point, sideways normal and distance so far.
    function ribbon(samples, a, b, y, vLen) {
      const P = [], U = [], I = [], N = [];
      samples.forEach((s, i) => {
        P.push(s.x + s.nx * a, y, s.z + s.nz * a, s.x + s.nx * b, y, s.z + s.nz * b);
        N.push(0, 1, 0, 0, 1, 0); U.push(0, s.d / vLen, 1, s.d / vLen);
        if (i) { const o = (i - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I);
      return geo;
    }
    // Upright strip along the same path, for the visible edge of something flat
    function ribbonEdge(samples, off, y0, y1) {
      const P = [], I = [];
      samples.forEach((s, i) => {
        P.push(s.x + s.nx * off, y0, s.z + s.nz * off, s.x + s.nx * off, y1, s.z + s.nz * off);
        if (i) { const o = (i - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
      return geo;
    }

    // Dark outline for round shapes: back faces pushed out along the normal
    const inkMats = new Map();
    function inked(m, w) {
      const key = (w || 0.03).toFixed(3);
      if (!inkMats.has(key)) {
        const im = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.ink), side: THREE.BackSide });
        im.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * ' + key + ';'); };
        im.customProgramCacheKey = () => 'roomInk' + key;
        inkMats.set(key, im);
      }
      m.add(new THREE.Mesh(m.geometry, inkMats.get(key)));
      return m;
    }
    const lit = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---------- Textures ----------
    const FONT = "900 %px 'Arial Rounded MT Bold', 'Nunito', 'Trebuchet MS', system-ui, sans-serif";
    const tex = {};
    // Oak planks, four across; they run along v
    tex.floor = (repU, repV) => canvasTex(512, 512, (g, W, H) => {
      const r = rng(7), planks = 4, pw = W / planks;
      for (let i = 0; i < planks; i++) {
        let y = -r() * H * 0.5;
        while (y < H) {
          const len = H * (0.45 + r() * 0.35);
          g.fillStyle = shade(PAL.floor, 0.86 + r() * 0.28); g.fillRect(i * pw, y, pw, len);
          for (let n = 0; n < 22; n++) {
            g.strokeStyle = 'rgba(110,72,36,' + (0.04 + r() * 0.07).toFixed(3) + ')'; g.lineWidth = 1 + r() * 1.5;
            const gx = i * pw + r() * pw; g.beginPath(); g.moveTo(gx, y);
            g.bezierCurveTo(gx + (r() - 0.5) * 8, y + len * 0.3, gx + (r() - 0.5) * 8, y + len * 0.7, gx + (r() - 0.5) * 5, y + len); g.stroke();
          }
          g.fillStyle = 'rgba(70,45,25,0.45)'; g.fillRect(i * pw, y + len - 2, pw, 2);
          y += len;
        }
        g.fillStyle = 'rgba(70,45,25,0.5)'; g.fillRect(i * pw, 0, 2, H);
        g.fillStyle = 'rgba(255,240,215,0.16)'; g.fillRect(i * pw + 2, 0, 2, H);
      }
    }, [repU, repV]);
    // Woven rug: calm field, a cream frame and a zigzag band at both short ends
    tex.rug = () => canvasTex(768, 512, (g, W, H) => {
      const r = rng(11);
      g.fillStyle = PAL.rug; g.fillRect(0, 0, W, H);
      for (let n = 0; n < 5200; n++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(20,40,60,0.05)'; g.fillRect(r() * W, r() * H, 6 + r() * 8, 1.5); }
      g.strokeStyle = PAL.rugLight; g.lineWidth = 14; g.strokeRect(30, 30, W - 60, H - 60);
      g.strokeStyle = PAL.rugAccent; g.lineWidth = 5; g.strokeRect(50, 50, W - 100, H - 100);
      for (const x0 of [78, W - 138]) {
        g.strokeStyle = PAL.rugLight; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath();
        for (let y = 70, i = 0; y <= H - 70; y += 31, i++) { const x = x0 + (i % 2 ? 60 : 0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      g.fillStyle = PAL.rugLight;
      for (let ix = 0; ix < 7; ix++) for (let iy = 0; iy < 4; iy++) { const x = 216 + ix * 56 + (iy % 2) * 28, y = 110 + iy * 97; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); }
    });
    // One face of a wooden letter block
    const letterCache = new Map();
    tex.letter = (ch, color, painted) => {
      const key = ch + color + (painted ? 'p' : '');
      if (!letterCache.has(key)) letterCache.set(key, canvasTex(160, 160, (g, W) => {
        const r = rng(ch.charCodeAt(0) * 31 + 5);
        g.fillStyle = painted ? color : PAL.block; g.fillRect(0, 0, W, W);
        for (let n = 0; n < (painted ? 0 : 26); n++) { g.strokeStyle = 'rgba(150,105,55,' + (0.05 + r() * 0.08).toFixed(3) + ')'; g.lineWidth = 1 + r() * 2; const y = r() * W; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 12, W * 0.7, y + (r() - 0.5) * 12, W, y + (r() - 0.5) * 8); g.stroke(); }
        const fg = painted ? PAL.paper : color;
        g.strokeStyle = fg; g.lineWidth = painted ? 7 : 11; g.lineJoin = 'round'; g.strokeRect(15, 15, W - 30, W - 30);
        g.fillStyle = fg; g.font = FONT.replace('%', '104'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, W / 2, W / 2 + 7);
      }));
      return letterCache.get(key);
    };
    tex.pages = () => canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(120,100,70,0.22)'; for (let y = 3; y < H; y += 5) g.fillRect(0, y, W, 1);
    }, [3, 1]);
    // Slot-car track seen from above: two slots with metal rails, white edge lines. u runs across.
    tex.track = () => canvasTex(256, 64, (g, W, H) => {
      const r = rng(3);
      g.fillStyle = PAL.track; g.fillRect(0, 0, W, H);
      for (let n = 0; n < 500; n++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'; g.fillRect(r() * W, r() * H, 2, 2); }
      g.fillStyle = '#F4F1EA'; g.fillRect(10, 0, 7, H); g.fillRect(W - 17, 0, 7, H);
      for (const cx of [W * 0.3, W * 0.7]) { g.fillStyle = '#AEB4C2'; g.fillRect(cx - 9, 0, 18, H); g.fillStyle = '#15161C'; g.fillRect(cx - 3, 0, 6, H); }
    }, [1, 1]);
    tex.curb = () => canvasTex(16, 64, (g, W, H) => { g.fillStyle = '#F4F1EA'; g.fillRect(0, 0, W, H); g.fillStyle = PAL.red; g.fillRect(0, 0, W, H / 2); }, [1, 1]);
    // Fan flag in black and yellow without any crest; the host can pass its own picture instead
    tex.flag = () => canvasTex(384, 256, (g, W, H) => {
      g.fillStyle = '#FDE100'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#16161A'; g.fillRect(0, 0, W, H * 0.16); g.fillRect(0, H * 0.84, W, H * 0.16);
    });
    // Sunlight falling through a window with a cross: bright panes on black, used additively
    tex.sunPatch = () => canvasTex(256, 256, (g, W, H) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (let px = 0; px < 2; px++) for (let py = 0; py < 2; py++) {
        const x0 = 22 + px * 110, y0 = 22 + py * 110, s = 102;
        for (let n = 0; n < 9; n++) { g.fillStyle = 'rgba(255,220,165,0.13)'; g.fillRect(x0 + n * 1.6, y0 + n * 1.6, s - n * 3.2, s - n * 3.2); }
      }
    });
    tex.blanket = () => canvasTex(256, 256, (g, W, H) => {
      const r = rng(5);
      g.fillStyle = '#5E7FA6'; g.fillRect(0, 0, W, H);
      g.fillStyle = PAL.rugLight;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const cx = 32 + i * 64 + (j % 2) * 32, cy = 32 + j * 64, R = 9 + r() * 5; g.beginPath();
        for (let n = 0; n < 10; n++) { const a = -Math.PI / 2 + n * Math.PI / 5, rr = n % 2 ? R * 0.45 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      }
    }, [3, 1]);
    // Wooden ruler, 30 cm: a tick per half centimetre and a number per centimetre
    tex.ruler = () => canvasTex(1024, 128, (g, W, H) => {
      const r = rng(13);
      g.fillStyle = '#F0DDB4'; g.fillRect(0, 0, W, H);
      for (let n = 0; n < 40; n++) { g.strokeStyle = 'rgba(150,105,55,' + (0.04 + r() * 0.07).toFixed(3) + ')'; g.lineWidth = 1 + r() * 2; const y = r() * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (r() - 0.5) * 10); g.stroke(); }
      g.fillStyle = PAL.ink; g.font = FONT.replace('%', '26'); g.textAlign = 'center'; g.textBaseline = 'middle';
      const cm = (W - 40) / 30;
      for (let i = 0; i <= 60; i++) { const x = 20 + i * cm / 2, major = i % 2 === 0; g.fillRect(x - (major ? 1.5 : 1), 0, major ? 3 : 2, major ? 34 : 20); if (major && i % 4 === 0) g.fillText(String(i / 2), x, 58); }
      g.fillStyle = PAL.red; g.fillRect(0, H - 14, W, 14);
    });
    // side of a toy drum: red with a yellow zigzag cord
    tex.drum = () => canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = PAL.red; g.fillRect(0, 0, W, H);
      g.strokeStyle = PAL.yellow; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, 8); g.lineTo(W / 2, H - 8); g.lineTo(W, 8); g.stroke();
    }, [6, 1]);
    tex.capStripes = () => canvasTex(96, 8, (g, W, H) => { [PAL.red, PAL.yellow, PAL.blue, PAL.red, PAL.yellow, PAL.blue].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * W / 6, 0, W / 6 + 1, H); }); });
    tex.scarf = () => canvasTex(64, 8, (g, W, H) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#16161A' : '#FDE100'; g.fillRect(i * 16, 0, 16, H); } }, [6, 1]);

    // Round crest the host may pass in (a private picture). Without one, nothing is placed.
    const emblemMat = opts && opts.emblem ? own(new THREE.MeshLambertMaterial({ map: opts.emblem, emissive: new THREE.Color('#FFFFFF'), emissiveMap: opts.emblem, emissiveIntensity: GLOW_OWN })) : null;
    if (emblemMat) emblemMat.map.anisotropy = Math.min(8, maxAniso);
    // Flat pictures that shine a little by themselves; the time of day dims them together
    const pictureMats = emblemMat ? [emblemMat] : [];
    function emblemDisc(r, parent, x, y, z) {
      if (!emblemMat) return null;
      return base.mesh(new THREE.CircleGeometry(r, 40), emblemMat, x || 0, y || 0, z || 0, parent);
    }

    const env = buildEnv();
    scene.environment = env;

    function dispose() {
      for (const x of owned) x.dispose();
      for (const m of stdCache.values()) m.dispose();
      for (const m of inkMats.values()) m.dispose();
      base.dispose();
    }
    return Object.assign({}, base, { PAL, TOY_COLORS, ENV_SHINY, GLOW_OWN, std, texStd, canvasTex, roundedBox, mergeGeos, bakeColors, bakeSame, ribbon, ribbonEdge, inked, lit, emblemDisc, pictureMats, setEnvLevel, shade, rng, tex, env, own, dispose });
  }

  Room3D.PAL = PAL;
  Room3D.makeKit = makeKit;
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  const smooth = (k) => k * k * (3 - 2 * k);
  function angDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return d; }
  Room3D.util = { clamp, rng, lerp, damp, smooth, angDiff };
})();
