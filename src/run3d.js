/* Mimo hüpft · Sternenbahn
   A 3D lane runner on a ribbon of star tiles through four sky zones, loaded on demand next to the game page.
   Needs the globals THREE (r160) and Mimo3D (mimo3d.js), and a host object from the game, see create(). */
(function () {
  'use strict';

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  const smooth = (k) => k * k * (3 - 2 * k);
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  // The game logic lives in track space: distance s along the ribbon, lane 0..2, height h above the tiles.
  const ROW = 2, LANE = 1.7, AHEAD = 72, BEHIND = 8;
  const PH = { GRAV: 34, JUMP: 10.6, PAD: 17, DIVE: 24, SLIDE: 0.62, COYOTE: 0.1, BUFFER: 0.14, LANE_RATE: 15, LANE_TIME: 0.15, CENTER: 0.45, SLIDE_CENTER: 0.25 };
  const HIT = { slow: 0.55, recover: 1.3, invuln: 1.4, tumble: 0.6, freeze: 0.07 };
  const FALL = { drop: 0.5, lift: 0.95, grav: 0.55 };
  const BOOST = { time: 2.6, k: 1.45 }, MAGNET = { time: 9, reach: 11 };
  const COMBO_STEP = 12, MULT_MAX = 5, HEARTS = 3;
  const SCORE = { spark: 10, star: 250, ring: 50, near: 30, smash: 20, finish: 1000, clean: 1500, meter: 2 };
  const ENDLESS = { v0: 12.5, accel: 0.0042, vmax: 24, zoneLen: 500, heartEvery: 650 };
  const INTRO_TIME = 3.4, COUNT_STEP = 0.62, WIN_TIME = 2.6, OVER_TIME = 2.9;
  const STAR_TOTAL = 10;
  // Mimo's moves: a trick on every jump (in this order), a little hop on lane changes, a look back at the camera now and then
  const TRICKS = ['spin', 'tuck', 'flip', 'spin', 'star', 'roll'];
  // the show after the run, one move per beat, looping behind the result card: a dance at the star gate,
  // and after the last heart a tumble, a dizzy sit, shaking it off and then eager hopping for the next go
  const DANCE = ['hop', 'spin', 'star', 'wiggle', 'wave', 'flip'], COMEBACK = ['bounce', 'wave', 'spin', 'cheer'];
  const SHOW = { start: 0.9, beat: 1.0, dizzy: 1.4, shake: 0.5 };
  // forgiving bumps: a glancing touch during a lane change only makes Mimo stumble back; a second one within the window counts
  const STUMBLE = { window: 3, slow: 0.82 };
  // air tricks on a second jump press, and the letter hunt S-T-E-R-N that opens the sky flight
  const TRICK = { minH: 0.75, score: 50, double: 120 };
  const LETTERS = 'STERN', FLY = { time: 8, h: 3.1, every: 170, at: [0.12, 0.3, 0.48, 0.66, 0.82] };
  const MOVE = { hop: 0.24, look: 0.95, lookGap: [6, 10], dizzy: 1.3, scale: 1.25 };

  // Look system, the same rules in every zone:
  //   sky and scenery stay soft and hazy, the ribbon is one clear mid tone that stands off the sky,
  //   everything Mimo can bump into is one deep "danger" colour with a dark ink rim, everything to collect is gold.
  //   tile*: ribbon, danger/ink: bushes, crystals, towers and their outline, cap: the gems on top, bank*: the cloud banks.
  const ZONES = [
    { name: 'Wolkenmeer', speed: 12.5, top: '#F29BB8', bot: '#FFDDBF', glow: '#FFF0D2', tileA: '#B6AEF4', tileB: '#A49BEC', inlay: '#FFFFFF', rail: '#7E70CF', danger: '#D9467A', ink: '#4E1735', cap: '#FFA3C4', cloud: '#FFF3F0', bank: '#FFD9E5', bankInk: '#4E1735', bankGlow: '#FF8FB0', deco: '#F5B5CC', hemi: ['#FFFFFF', '#E9C3D6', 0.85], sun: ['#FFF0DA', 1.25], stars: 0, planets: 0, aurora: 0, meteors: 0, sunDisc: 1 },
    { name: 'Planetengarten', speed: 14, top: '#7A69C9', bot: '#F2B8D6', glow: '#FFDDED', tileA: '#93E0C6', tileB: '#78D1B3', inlay: '#FFFFFF', rail: '#4DAA8E', danger: '#EE6A6A', ink: '#4F1C2E', cap: '#FFB7AE', cloud: '#EBDDF8', bank: '#FFE0DA', bankInk: '#35295F', bankGlow: '#FFB0C8', deco: '#C1ACF2', hemi: ['#FFFFFF', '#CDBDF0', 0.85], sun: ['#FFE9F4', 1.2], stars: 0.4, planets: 1, aurora: 0, meteors: 0, sunDisc: 0.35 },
    { name: 'Kometenschauer', speed: 15.5, top: '#24225E', bot: '#946AAE', glow: '#F0AACB', tileA: '#F4E7F2', tileB: '#E2D0EA', inlay: '#FFFFFF', rail: '#A98BC4', danger: '#F06A3C', ink: '#43191A', cap: '#FFB792', cloud: '#77649F', bank: '#FFE1CF', bankInk: '#33286E', bankGlow: '#FFB46B', deco: '#C8A6E0', hemi: ['#E2DCFF', '#5D4C8A', 0.95], sun: ['#FFE2CC', 1.2], stars: 1, planets: 1, aurora: 0, meteors: 1, sunDisc: 0 },
    { name: 'Polarlicht', speed: 17, top: '#0C1B38', bot: '#2A6577', glow: '#7FE3C9', tileA: '#EDF6FA', tileB: '#D5E6EF', inlay: '#FFFFFF', rail: '#7FA3BC', danger: '#E2508E', ink: '#43122F', cap: '#FFA6CF', cloud: '#3C6680', bank: '#FFDCEB', bankInk: '#1F3E58', bankGlow: '#9FFFE0', deco: '#8EDCCB', hemi: ['#D6F5FF', '#2F5266', 0.95], sun: ['#E2FFF8', 1.15], stars: 1, planets: 0, aurora: 0.6, meteors: 0.3, sunDisc: 0 },
  ];

  // Cells: floor, obstacle, item and the item's height (centre of Mimo), -1 means "on the arc after a spring pad"
  const CELL = {
    '.': [1, 0, 0, 0], '_': [0, 0, 0, 0],
    B: [1, 'B', 0, 0], b: [1, 'B', 's', 1.75],
    H: [1, 'H', 0, 0], x: [1, 'H', 's', 0.3], X: [1, 'H', '*', 0.32],
    W: [1, 'W', 0, 0], p: [1, 'P', 0, 0], c: [1, 'C', 0, 0], o: [1, 0, 'o', 0.95],
    s: [1, 0, 's', 0.55], a: [1, 0, 's', 1.5], A: [1, 0, 's', -1], g: [0, 0, 's', 1.5], G: [0, 0, 's', -1],
    '*': [1, 0, '*', 0.75], '+': [1, 0, '*', 1.5], '^': [1, 0, '*', -1], '%': [0, 0, '*', -1], '#': [0, 0, '*', 1.5],
    m: [1, 0, 'm', 0.9], u: [1, 0, 'u', 0.9], h: [1, 0, 'h', 0.9],
    // letters are placed by code (placeLetter), not by the chunk strings
  };
  // Rows in running order, three lanes each; a fourth letter "w" puts a wandering cloud sheep in that row
  const CHUNKS = {
    path: ['.s.', '.s.', '.s.', '.s.', '..s', '..s', '..s', '..s', '.s.', '.s.', 's..', 's..', 's..', '.s.', '.s.'],
    bush: ['...', '.s.', '.a.', '.b.', '.a.', '.s.', '...'],
    bush3: ['s.s', 'a.a', 'bBb', 'a.a', 's.s', '...'],
    gap: ['...', 'sss', 'aaa', 'ggg', 'ggg', 'aaa', 'sss', '...'],
    tower: ['.s.', '.s.', 'sWs', 's.s', '.s.', '.s.', 'Ws.', '.s.', '.sW', '.s.', '...'],
    bank: ['...', '.s.', '.s.', 'xxx', 'xxx', '.s.', '...'],
    pad: ['...', '.s.', 'ppp', '.A.', '_G_', '_G_', '_G_', '.A.', '.s.', '...'],
    padStar: ['...', '.s.', 'ppp', '.A.', '_G_', '_%_', '_G_', '.A.', '.s.', '...'],
    bushStar: ['..s', '..a', '.Bb', '..+', '...'],
    bankStar: ['...', '.s.', 'HXH', 'HxH', '.s.', '...'],
    mix1: ['...', 'B.B', '.s.', '.s.', 'xxx', '.s.', '.s.', 'W.W', '.s.', '...'],
    slalom: ['W.s', 'W.s', '..s', '.s.', 's.W', 's.W', 's..', '.s.', '..s', 'W.s', '...'],
    twin: ['...', 'B.B', '.s.', '.s.', 's.s', 'sBs', 's.s', '...'],
    sheep: ['.s.', '.s.', '.s.w', '.s.', '.s.', '.s.', '.s.w', '.s.', '.s.', '.s.', '.s.w', '.s.', '...'],
    shield: ['...', '.u.', '...'],
    sheepStar: ['.s.', '.a.', '.+.w', '.a.', '...'],
    bankBush: ['...', 'xxx', '...', '...', '.b.', '...', '...'],
    ladder: ['s.s', '_s_', '_s_', 's.s', 's_s', 's_s', 'sss', '...'],
    gapStar: ['...', 'a..', '#..', 'a..', '...'],
    corridor: ['.s.', 'WsW', 'W*W', 'WsW', '.s.', '...'],
    field: ['.s.', 'BsW', '.s.', '.s.', 'WsB', '.s.', '...'],
    magnet: ['...', '.m.', '...', 's.s', 'sBs', 's.s', 'sss', 'W.W', 'sss', 's.s', 'BHB', '...', '...'],
    comets: ['...', 'c..', '...', '...', '..c', '...', '...', '.c.', '...', '...'],
    comets2: ['.s.', 'c.c', '.s.', '.s.', '.c.', 's.s', 's.s', 'c..', '...', '...'],
    cometStar: ['...', 'c.c', '.s.', '.*.', 'c.c', '...'],
    mixed: ['...', 'BHB', '...', '...', 'HBH', '...', '...'],
    ring: ['...', '.o.', '.s.', 'BsB', '.s.', 'WsW', '.s.', 'xxx', '.s.', 'BBB', '.s.', '...'],
    gaprun: ['sss', 'g_g', 'g_g', 'sss', '_g_', '_g_', 'sss', '...'],
    gapStar2: ['...', '.a.', '.#.', '.g.', '.a.', '...'],
    cometSparks: ['s..', 's.c', 's..', '.s.', 'c.s', '..s', '..s', '.c.', '...'],
    ice: ['W.s', '..s', '..s', '.Ws', '..s', '...', 's..', 's.W', 's..', '.s.', 'B.B', '.s.', '.s.', 'HsH', '.s.', '...'],
    towerStar: ['...', '.s.', 'sWs', 's*s', '.s.', '...'],
    finale: ['sss', 'sss', '.o.', 'sss', 'sss', 'sss', 'sss', 'sss', 'sss', 'sss'],
    heart: ['...', '.h.', '...'],
  };
  // The course: twelve-ish pieces per zone, ten big stars hidden on the riskier lines
  const COURSE = [
    ['path', 'bush', 'gap', 'tower', 'bank', 'bushStar', 'pad', 'bush3', 'padStar', 'mix1', 'bankStar', 'tower'],
    ['slalom', 'twin', 'sheep', 'shield', 'sheepStar', 'bankBush', 'ladder', 'gapStar', 'field', 'corridor', 'magnet', 'slalom'],
    ['comets', 'mixed', 'cometStar', 'ring', 'gaprun', 'comets2', 'gapStar2', 'twin', 'cometSparks', 'mixed', 'bankBush', 'comets'],
    ['ice', 'towerStar', 'sheep', 'mixed', 'gaprun', 'magnet', 'padStar', 'ice', 'ring', 'bank', 'slalom', 'comets2', 'finale'],
  ];
  const POOL = [
    ['path', 'bush', 'gap', 'tower', 'bank', 'pad', 'bush3', 'mix1', 'bushStar'],
    ['slalom', 'twin', 'sheep', 'bankBush', 'ladder', 'field', 'magnet', 'shield', 'corridor', 'padStar'],
    ['comets', 'mixed', 'ring', 'gaprun', 'comets2', 'cometSparks', 'cometStar', 'gapStar2'],
    ['ice', 'mixed', 'gaprun', 'slalom', 'comets2', 'ring', 'towerStar', 'field'],
  ];
  // the course of the day: the same for everyone on that day, drawn from the pools with the date as seed; ten star pieces spread over the zones
  const DAILY_STARS = [['bushStar', 'padStar', 'bankStar'], ['sheepStar', 'gapStar', 'padStar'], ['cometStar', 'gapStar2', 'bankStar'], ['towerStar', 'padStar', 'gapStar2']];
  const DAILY_STAR_COUNT = [3, 3, 2, 2], DAILY_PIECES = 11;
  function dailyCourse(seed) {
    let st = (Math.abs(seed | 0) * 7919 + 104729) % 2147483647 || 1;
    const rr = () => { st = (st * 16807) % 2147483647; return (st - 1) / 2147483646; };
    return POOL.map((pool, z) => {
      const plain = pool.filter((n) => !/Star/.test(n)), list = [];
      for (let i = 0; i < DAILY_PIECES; i++) { let n = plain[Math.floor(rr() * plain.length)]; if (n === list[list.length - 1]) n = plain[(plain.indexOf(n) + 1) % plain.length]; list.push(n); }
      for (let k = 0; k < DAILY_STAR_COUNT[z]; k++) list.splice(1 + Math.floor(rr() * (list.length - 1)), 0, DAILY_STARS[z][Math.floor(rr() * DAILY_STARS[z].length)]);
      if (z === POOL.length - 1) list.push('finale');
      return list;
    });
  }
  // ghost of the best run: Mimo's track position sampled ten times a second, stored as small integers
  const GHOST = { rate: 10, alpha: 0.42 };
  // glow pass: only the shiny things are drawn again at a quarter of the resolution, blurred and laid over the frame.
  // The frame itself is rendered exactly as before; slow devices drop the glow, then resolution (QUALITY).
  const GLOW = { layer: 2, occ: 3, strength: 0.7 };
  // a phone capped at 30 fps (iOS Low Power Mode) only loses the glow; resolution drops only when frames get really slow
  const RESIZE_SETTLE_MS = 180;
  const QUALITY = { slowMs: 25, verySlowMs: 38, holdS: 2.5, ratios: [2, 1.5, 1.25] };
  const START_ROWS = ['...', '...', '...', '...', '...', '.s.', '.s.', '.s.', '.s.', '...'];
  const SPACER = 2, PORTAL_PAD = 6, TAIL_ROWS = 10;

  // Ribbon shape: gentle bends and hills, straight at the start
  const bendAmp = (s) => smooth(clamp((s - 14) / 60, 0, 1));
  const cx = (s) => bendAmp(s) * (9 * Math.sin(s / 61) + 5 * Math.sin(s / 27 + 1.7));
  const cy = (s) => bendAmp(s) * (3.2 * Math.sin(s / 43 + 0.6) + 1.4 * Math.sin(s / 19));

  function create(host) {
    const THREE = window.THREE, M3 = window.Mimo3D;
    if (!THREE || !M3) throw new Error('THREE or Mimo3D missing');
    const sfx = host.sfx || {}, input = host.input, C = host.colors || {};
    const okHex = M3.okHex;
    const play = (name, a) => { if (typeof sfx[name] === 'function') sfx[name](a); };
    const reduced = () => !!(host.reduced && host.reduced());
    const fun = Object.assign({}, host.fun || {});
    const funScale = () => (fun.big ? 1.45 : fun.mini ? 0.65 : 1);
    // upgrades from the workshop and the runner rank: longer power-ups, a bubble at the start, one more heart, a score bonus
    const U = host.upgrades || {};
    const UPG = { magnet: MAGNET.time + (U.magnet || 0), boost: BOOST.time + (U.boost || 0), hearts: HEARTS + (U.hearts || 0), shield: !!U.shield, mult: Math.max(1, host.scoreMult || 1), best: host.best || 0 };
    const stat = (name, n) => { if (host.onStat) host.onStat(name, n == null ? 1 : n); };
    const PAL = {
      ink: okHex(C.mimoInk, '#3A3850'), blush: okHex(C.blush, '#F4B4C0'), leaf: okHex(C.leaf, '#9CCDB0'), mint: okHex(C.mimoMint, '#A9DCC3'),
      star: okHex(C.star, '#F6D374'), thorn: okHex(C.thorn, '#E79AB3'), lav: okHex(C.mimoLav, '#C9B8EA'), peach: okHex(C.mimoPeach, '#F6BFA6'), white: '#FFFFFF',
    };
    const ZC = ZONES.map((z) => {
      const o = {}; for (const k of Object.keys(z)) if (typeof z[k] === 'string' && z[k][0] === '#') o[k] = new THREE.Color(z[k]);
      o.hemiA = new THREE.Color(z.hemi[0]); o.hemiB = new THREE.Color(z.hemi[1]); o.sunC = new THREE.Color(z.sun[0]); return o;
    });

    // ---------- Renderer, scene, camera, light ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.info.autoReset = false;
    const canvas = renderer.domElement;
    canvas.className = 'sky3d run3d';
    host.anchor.after(canvas);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(ZC[0].bot.clone(), 46, 175);
    const cam = new THREE.PerspectiveCamera(64, 5 / 3, 0.1, 520);
    scene.add(cam);
    const hemi = new THREE.HemisphereLight(ZC[0].hemiA.clone(), ZC[0].hemiB.clone(), ZONES[0].hemi[2]);
    const sun = new THREE.DirectionalLight(ZC[0].sunC.clone(), ZONES[0].sun[1]);
    sun.position.set(0.4, 1, 0.5); scene.add(hemi, sun);
    const K = M3.kit(THREE, scene, PAL);
    const { mat, basic, mesh, halo } = K;

    // ---------- Sky: gradient dome, stars, planets, sun, aurora and meteors ride along with the camera ----------
    const skyGroup = new THREE.Group(); scene.add(skyGroup);
    const skyU = { top: { value: ZC[0].top.clone() }, bot: { value: ZC[0].bot.clone() }, glow: { value: ZC[0].glow.clone() } };
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(470, 32, 20), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 glow; varying vec3 vP; void main(){ float y = vP.y; vec3 c = mix(bot, top, smoothstep(-0.05, 0.62, y)); c = mix(c, glow, exp(-abs(y - 0.02) * 9.0) * 0.55); c = mix(c, bot * 0.92, (1.0 - smoothstep(-0.5, 0.0, y))); gl_FragColor = vec4(c, 1.0); }',
    }));
    skyDome.renderOrder = -10; skyGroup.add(skyDome);
    // reflections: each zone's sky baked into a small environment map, so glossy tiles, gems and gold catch the light
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMaps = ZC.map((z) => {
      const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { top: { value: z.top }, bot: { value: z.bot }, glow: { value: z.glow } }, vertexShader: skyDome.material.vertexShader, fragmentShader: skyDome.material.fragmentShader })));
      for (const [x, y, w, s2, c] of [[-8, 10, -9, 3, new THREE.Color(4, 3.8, 3.4)], [9, 4, 7, 2.4, z.glow.clone().multiplyScalar(1.6)], [0, 3, 12, 2, new THREE.Color(1.6, 1.6, 1.8)]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(s2, 16, 12), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, w); es.add(m); }
      const rt = pmrem.fromScene(es, 0.035);
      es.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      return rt;
    });
    let envZone = -1;
    const starField = (() => {
      const n = 900, pos = new Float32Array(n * 3), tw = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const u = hash(i, 1), v = hash(i, 2), th = u * Math.PI * 2, y = 0.04 + v * 0.96, r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(th) * r * 440; pos[i * 3 + 1] = y * 440; pos[i * 3 + 2] = Math.sin(th) * r * 440; tw[i] = hash(i, 3) * 6.28;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tw', new THREE.BufferAttribute(tw, 1));
      const u = { t: { value: 0 }, op: { value: 0 } };
      const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute float tw; uniform float t; varying float vA; void main(){ vA = 0.45 + 0.55 * sin(t * 2.0 + tw); gl_PointSize = 1.6 + 1.6 * fract(tw * 3.1); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float op; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.1, 0.5, length(d))); gl_FragColor = vec4(1.0, 0.97, 0.9, a * vA * op); }' });
      const pts = new THREE.Points(g, m); pts.renderOrder = -9; skyGroup.add(pts); return u;
    })();
    const sunDisc = halo('#FFF6DD', 150, 0.9); sunDisc.material.fog = false; sunDisc.position.set(-70, 26, -400); sunDisc.renderOrder = -8; skyGroup.add(sunDisc);
    const planets = [];
    for (const [x, y, z, r, col, ring] of [[-160, 70, -360, 34, '#F7C2A6', '#FBE2C8'], [210, 120, -330, 22, '#A9DCC3', null], [60, 190, -380, 14, '#C9B8EA', '#F1E7FA'], [-260, 150, -220, 18, '#F6D374', null]]) {
      const g = new THREE.Group(); g.position.set(x, y, z); skyGroup.add(g);
      const pm = new THREE.MeshLambertMaterial({ color: new THREE.Color(col), emissive: new THREE.Color(col), emissiveIntensity: 0.35, fog: false, transparent: true });
      mesh(new THREE.SphereGeometry(r, 32, 20), pm, 0, 0, 0, g);
      let rm = null;
      if (ring) { rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(ring), fog: false, transparent: true, opacity: 0.7, side: THREE.DoubleSide }); const rg = mesh(new THREE.RingGeometry(r * 1.35, r * 1.9, 64), rm, 0, 0, 0, g); rg.rotation.set(1.2, 0.3, 0.2); }
      planets.push({ g, pm, rm, spin: 0.02 + hash(x, y) * 0.04 });
    }
    const aurora = (() => {
      const u = { t: { value: 0 }, op: { value: 0 } }, list = [];
      const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'uniform float t; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * 0.018 + t * 0.4) * 22.0; p.y += sin(p.x * 0.03 + t * 0.7) * 6.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
        fragmentShader: 'uniform float t; uniform float op; varying vec2 vUv; void main(){ float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y)); float rays = 0.55 + 0.45 * sin(vUv.x * 60.0 + t * 1.3 + sin(vUv.x * 13.0 - t) * 2.0); vec3 c = mix(vec3(0.35, 1.0, 0.75), vec3(0.65, 0.45, 1.0), vUv.y); gl_FragColor = vec4(c * band * rays, band * rays * op * 0.75); }' });
      for (const [y, z, rot] of [[60, -300, 0.05], [80, -250, -0.18], [50, -340, 0.25]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(520, 70, 60, 1), m); pl.position.set(0, y, z); pl.rotation.z = rot; pl.renderOrder = -7; skyGroup.add(pl); list.push(pl); }
      return { u, list };
    })();
    const meteors = (() => {
      const n = 7, pos = new Float32Array(n * 6), g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.LineBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
      const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.renderOrder = -6; skyGroup.add(ls);
      const st = []; for (let i = 0; i < n; i++) st.push({ t: hash(i, 9) * 3, x: 0, y: 0, z: 0 });
      return { pos, g, m, st, n };
    })();

    // ---------- Points: glows (additive) and puffs (normal), sized in world units ----------
    const scaleU = { value: 300 };
    function makePoints(cap, additive) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4), size = new Float32Array(cap);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('col', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
      const m = new THREE.ShaderMaterial({ uniforms: { uScale: scaleU }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        vertexShader: 'attribute float size; attribute vec4 col; uniform float uScale; varying vec4 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = col; vC.a *= 1.0 - smoothstep(90.0, 170.0, -mv.z); gl_PointSize = size * uScale / max(0.2, -mv.z); gl_Position = projectionMatrix * mv; }',
        fragmentShader: (additive ? 'varying vec4 vC; void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.0, 0.5, r)); a *= a; gl_FragColor = vec4(vC.rgb * a * vC.a, a * vC.a); }'
          : 'varying vec4 vC; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; float a = (1.0 - smoothstep(0.18, 0.5, r)); gl_FragColor = vec4(vC.rgb, vC.a * a); }') });
      const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = additive ? 5 : 4; scene.add(pts);
      let n = 0;
      return {
        begin() { n = 0; },
        add(x, y, z, c, a, s) { if (n >= cap) return; pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z; col[n * 4] = c.r; col[n * 4 + 1] = c.g; col[n * 4 + 2] = c.b; col[n * 4 + 3] = a; size[n] = s; n++; },
        end() { geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; geo.attributes.col.needsUpdate = true; geo.attributes.size.needsUpdate = true; },
      };
    }
    const glows = makePoints(1400, true), puffs = makePoints(500, false);

    // ---------- Geometry helpers ----------
    function merge(parts) {
      // parts: [geometry, matrix] pairs, merged into one non-indexed geometry with normals
      const ps = [], ns = [];
      for (const [g0, m] of parts) {
        const g = (g0.index ? g0.toNonIndexed() : g0.clone()); if (m) g.applyMatrix4(m);
        if (!g.attributes.normal) g.computeVertexNormals();
        ps.push(g.attributes.position.array); ns.push(g.attributes.normal.array);
      }
      const len = ps.reduce((a, b) => a + b.length, 0), P = new Float32Array(len), N = new Float32Array(len);
      let o = 0; for (let i = 0; i < ps.length; i++) { P.set(ps[i], o); N.set(ns[i], o); o += ps[i].length; }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      return out;
    }
    const TM = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy == null ? sx || 1 : sy, sz == null ? sx || 1 : sz));
    function roundRect(w, d, r) { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
    function jitter(geo, amt, seed) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = Math.round(x * 50) * 7 + Math.round(y * 50) * 13 + Math.round(z * 50) * 29 + seed; pos.setXYZ(i, x + (hash(k, 1) - 0.5) * amt, y + (hash(k, 2) - 0.5) * amt, z + (hash(k, 3) - 0.5) * amt); }
      geo.computeVertexNormals(); return geo;
    }
    // fades a material out close to the camera, so clouds and towers never block the view of Mimo
    function fadeNear(m, a, b) {
      m.transparent = true;
      const prev = m.onBeforeCompile, prevKey = m.inkKey || '';
      m.onBeforeCompile = (sh, r) => {
        prev.call(m, sh, r);
        sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying float vCamD;\nvoid main() {').replace('#include <project_vertex>', '#include <project_vertex>\nvCamD = -mvPosition.z;');
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vCamD;\nvoid main() {').replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(' + a.toFixed(1) + ', ' + b.toFixed(1) + ', vCamD);');
      };
      m.customProgramCacheKey = () => prevKey + 'fade' + a + '_' + b;
      return m;
    }
    // the ink rim: back faces pushed out along smoothed normals, the same trick as Mimo's outline.
    // Rule of the look: whatever Mimo can touch or collect has this rim, scenery never does.
    function smoothNormals(geo) {
      const pos = geo.attributes.position, nor = geo.attributes.normal, acc = new Map(), out = new Float32Array(pos.count * 3);
      const key = (i) => Math.round(pos.getX(i) * 500) + ',' + Math.round(pos.getY(i) * 500) + ',' + Math.round(pos.getZ(i) * 500);
      for (let i = 0; i < pos.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); acc.set(k, a); }
      for (let i = 0; i < pos.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
      geo.setAttribute('oN', new THREE.BufferAttribute(out, 3)); return geo;
    }
    function inkMat(width) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
      m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute vec3 oN;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += oN * ' + width.toFixed(3) + ';'); };
      m.inkKey = 'ink' + width; m.customProgramCacheKey = () => m.inkKey;
      return m;
    }
    function inked(geo, width, cap, fade) {
      if (!geo.attributes.oN) smoothNormals(geo);
      const m = inkMat(width); if (fade) fadeNear(m, fade[0], fade[1]);
      return inst(geo, m, cap);
    }
    function inst(geo, material, cap) {
      const im = new THREE.InstancedMesh(geo, material, cap);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      im.count = 0; im.frustumCulled = false; im.cap = cap; scene.add(im); return im;
    }
    function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

    // ---------- Track pieces ----------
    const TW = LANE - 0.12, TD = ROW - 0.16;
    const tileGeo = (() => { const g = new THREE.ExtrudeGeometry(roundRect(TW, TD, 0.22), { depth: 0.26, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4 }); g.rotateX(Math.PI / 2); g.translate(0, -0.05, 0); return g; })();
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.35 });
    tileMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vTileP;\nvoid main() {\nvTileP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vTileP;\nvoid main() {').replace('#include <color_fragment>', '#include <color_fragment>\nfloat tE = max(abs(vTileP.x) / ' + (TW / 2).toFixed(3) + ', abs(vTileP.z) / ' + (TD / 2).toFixed(3) + ');\ndiffuseColor.rgb *= mix(1.07, 0.84, smoothstep(0.5, 1.02, tE)) * (vTileP.y < -0.06 ? 0.72 : 1.0);');
    };
    tileMat.customProgramCacheKey = () => 'tileShade';
    const tiles = inst(tileGeo, tileMat, (AHEAD + BEHIND + 2) * 3);
    const tileBed = inst((() => { const g = new THREE.PlaneGeometry(LANE + 0.02, ROW + 0.02); g.rotateX(-Math.PI / 2); g.translate(0, -0.12, 0); return g; })(), new THREE.MeshBasicMaterial({ color: 0xffffff }), (AHEAD + BEHIND + 2) * 3);
    const inlayTex = canvasTex(128, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4;
      g.beginPath(); if (g.roundRect) g.roundRect(12, 12, w - 24, h - 24, 20); else g.rect(12, 12, w - 24, h - 24); g.stroke();
    });
    const inlays = inst((() => { const g = new THREE.PlaneGeometry(TW * 0.92, TD * 0.92); g.rotateX(-Math.PI / 2); g.translate(0, 0.012, 0); return g; })(), new THREE.MeshBasicMaterial({ map: inlayTex, transparent: true, opacity: 0.32, depthWrite: false }), (AHEAD + BEHIND + 2) * 3);
    const rails = inst((() => { const g = new THREE.CylinderGeometry(0.075, 0.075, ROW + 0.04, 10); g.rotateX(Math.PI / 2); return g; })(), new THREE.MeshBasicMaterial({ color: 0xffffff }), (AHEAD + BEHIND + 2) * 2);
    const posts = inst(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), 40);
    const hangGeo = (() => { const g = new THREE.ConeGeometry(0.42, 2.4, 6); g.rotateX(Math.PI); g.translate(0, -1.5, 0); return jitter(g, 0.08, 3); })();
    const hangers = inst(hangGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x332244, flatShading: true }), 40);

    // ---------- Obstacles ----------
    const bushGeo = (() => {
      const parts = [[new THREE.SphereGeometry(0.56, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), TM(0, 0, 0, 0, 0, 0, 1, 0.82, 1)]];
      for (let i = 0; i < 9; i++) { const a = i * 0.698 + 0.3, up = i % 3 === 0 ? 0.0 : 0.55; const tilt = 0.9 - up; parts.push([new THREE.ConeGeometry(0.11, 0.42, 7), TM(Math.cos(a) * 0.38 * (1 - up * 0.5), 0.18 + up * 0.32, Math.sin(a) * 0.38 * (1 - up * 0.5), Math.sin(a) * tilt, 0, -Math.cos(a) * tilt)]); }
      parts.push([new THREE.ConeGeometry(0.12, 0.45, 7), TM(0, 0.62, 0)]);
      return merge(parts);
    })();
    const crystalGeo = (() => {
      const parts = [];
      for (const [x, z, hgt, r, tx, tz] of [[0, 0, 0.95, 0.2, 0, 0], [-0.3, 0.1, 0.62, 0.15, 0, 0.35], [0.3, -0.05, 0.7, 0.16, 0, -0.35], [0.05, 0.3, 0.5, 0.13, 0.4, 0], [-0.1, -0.3, 0.55, 0.13, -0.4, 0.1]]) {
        const g = new THREE.CylinderGeometry(0.001, r, hgt * 0.35, 6); g.translate(0, hgt * 0.175 + hgt * 0.65 / 2 + hgt * 0.15, 0);
        const b = new THREE.CylinderGeometry(r, r * 0.8, hgt * 0.65, 6); b.translate(0, hgt * 0.65 / 2, 0);
        parts.push([g, TM(x, 0, z, tx, 0, tz)], [b, TM(x, 0, z, tx, 0, tz)]);
      }
      return merge(parts);
    })();
    const bushInk = inked(bushGeo, 0.045, 80);
    const bushes = inst(bushGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, envMapIntensity: 0.5 }), 80);
    const crystalInk = inked(crystalGeo, 0.04, 80);
    const crystals = inst(crystalGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05, envMapIntensity: 0.8, flatShading: true }), 80);
    const bankGeo = (() => {
      const parts = []; let k = 0;
      for (let i = 0; i < 6; i++) { const x = -0.68 + i * 0.27, y = 1.22 + (hash(i, 4) - 0.5) * 0.2, z = (hash(i, 5) - 0.5) * 0.7, r = 0.42 + hash(i, 6) * 0.18; parts.push([new THREE.IcosahedronGeometry(r, 2), TM(x, y, z)]); k++; }
      for (let i = 0; i < 4; i++) parts.push([new THREE.IcosahedronGeometry(0.36, 2), TM(-0.5 + i * 0.33, 1.62, (hash(i, 8) - 0.5) * 0.5)]);
      parts.push([new THREE.CylinderGeometry(0.62, 0.62, 0.2, 24), TM(0, 0.86, 0, 0, 0, 0, 1.3, 1, 1.25)]);
      return merge(parts);
    })();
    const bankOut = inst(bankGeo, fadeNear(new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, depthWrite: false }), 3.5, 9.5), 40);
    bankOut.renderOrder = 2;
    const banks = inst(bankGeo, fadeNear(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x5a4a62, depthWrite: false }), 3.5, 9.5), 40);
    banks.renderOrder = 3;
    // a dark patch on the tiles below and a floating "slide" sign in front, readable from far away
    const bankShade = inst((() => { const g = new THREE.PlaneGeometry(TW * 0.96, ROW); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 0); return g; })(), new THREE.MeshBasicMaterial({ color: 0x1d1838, transparent: true, opacity: 0.28, depthWrite: false }), 40);
    const slideTex = canvasTex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5B4FC2'; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 13; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const y of [44, 72]) { g.beginPath(); g.moveTo(38, y); g.lineTo(64, y + 20); g.lineTo(90, y); g.stroke(); }
    });
    const slideSigns = inst(new THREE.PlaneGeometry(0.95, 0.95), fadeNear(new THREE.MeshBasicMaterial({ map: slideTex, transparent: true, depthWrite: false }), 4.5, 9), 30);
    slideSigns.renderOrder = 4;
    const bankGlow = inst((() => { const g = new THREE.PlaneGeometry(TW * 0.9, ROW * 0.9); g.rotateX(Math.PI / 2); g.translate(0, 0.74, 0); return g; })(), fadeNear(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 4.5, 10), 40);
    const towerGeo = merge([[new THREE.CylinderGeometry(0.5, 0.58, 2.5, 20, 1, true), TM(0, 1.25, 0)], [new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), TM(0, 2.5, 0, 0, 0, 0, 1, 0.55, 1)], [new THREE.CylinderGeometry(0.7, 0.74, 0.22, 20), TM(0, 0.11, 0)]]);
    const towerInk = inked(towerGeo, 0.05, 40, [1.0, 2.6]);
    const towers = inst(towerGeo, fadeNear(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0, envMapIntensity: 0.5 }), 1.0, 2.6), 40);
    const towerBands = inst(merge([[new THREE.TorusGeometry(0.565, 0.07, 8, 28), TM(0, 0.85, 0, Math.PI / 2)], [new THREE.TorusGeometry(0.535, 0.07, 8, 28), TM(0, 1.7, 0, Math.PI / 2)]]), fadeNear(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0, emissive: 0x332a22 }), 1.0, 2.6), 40);
    // a soft round shadow grounds every obstacle, star and power-up on the tiles
    const shadeTex = M3.radialData(THREE, [[0, 30, 22, 50, 0.5], [0.55, 30, 22, 50, 0.32], [1, 30, 22, 50, 0]]);
    const shades = inst((() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.025, 0); return g; })(), new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false }), 160);
    shades.renderOrder = 1;
    const caps = inst(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 40);
    const padGeo = merge([[new THREE.CylinderGeometry(0.62, 0.7, 0.12, 24), TM(0, 0.06, 0)], [new THREE.SphereGeometry(0.58, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), TM(0, 0.1, 0, 0, 0, 0, 1, 0.32, 1)]]);
    const padInk = inked(padGeo, 0.04, 20);
    const pads = inst(padGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, envMapIntensity: 0.6 }), 20);
    const arrowTex = canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(14, 40 - i * 20); g.lineTo(32, 22 - i * 20); g.lineTo(50, 40 - i * 20); g.lineTo(50, 50 - i * 20); g.lineTo(32, 32 - i * 20); g.lineTo(14, 50 - i * 20); g.closePath(); g.fill(); } });
    const padArrows = inst((() => { const g = new THREE.PlaneGeometry(0.8, 0.8); g.rotateX(-Math.PI / 2); g.translate(0, 0.3, 0); return g; })(), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 20);
    const rockGeo = jitter(new THREE.DodecahedronGeometry(0.55, 1), 0.16, 11); rockGeo.translate(0, 0.42, 0);
    const rockInk = inked(rockGeo, 0.045, 20);
    const rocks = inst(rockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1, emissive: 0xff6a2a, emissiveIntensity: 0.4, flatShading: true }), 20);
    const warns = inst((() => { const g = new THREE.RingGeometry(0.42, 0.68, 28); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0); return g; })(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 20);
    const comets = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      mesh(rockGeo, mat('#7A5068', { emissive: new THREE.Color('#FF8A3D'), emissiveIntensity: 0.9, flatShading: true }), 0, -0.42, 0, g);
      const hl = halo('#FFB46B', 3.2, 0.9); g.add(hl);
      comets.push({ g, on: false });
    }

    // ---------- Items ----------
    // Sparks are shiny gold with a dark rim so they read on light tiles; big stars stand under a beam of light.
    const puffyStar = (() => {
      const sh = new THREE.Shape(), pts = [];
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.16 : 0.36; pts.push([Math.cos(a) * r, Math.sin(a) * r, i % 2 ? 0.2 : 0.3]); }
      for (let i = 0; i < 10; i++) {
        const [x, y, t] = pts[i], P = pts[(i + 9) % 10], N = pts[(i + 1) % 10];
        const ax = x + (P[0] - x) * t, ay = y + (P[1] - y) * t, bx = x + (N[0] - x) * t, by = y + (N[1] - y) * t;
        if (i) sh.lineTo(ax, ay); else sh.moveTo(ax, ay); sh.quadraticCurveTo(x, y, bx, by);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.085, bevelSize: 0.06, bevelSegments: 2, curveSegments: 3 });
      g.center(); return smoothNormals(g);
    })();
    const goldMat = (em) => new THREE.MeshStandardMaterial({ color: new THREE.Color('#FFC437'), metalness: 0.55, roughness: 0.28, emissive: new THREE.Color('#FF9E1A'), emissiveIntensity: em, envMapIntensity: 1.2 });
    // sparks fade out right in front of the lens, so a passing star never fills the corner of the screen
    const sparkInk = inked(puffyStar, 0.03, 420);
    const sparks = inst(puffyStar, goldMat(0.32), 420);
    const bigInk = inked(puffyStar, 0.026, 12);
    const bigStars = inst(puffyStar, goldMat(0.5), 12);
    const starRings = inst(new THREE.TorusGeometry(0.72, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), 24);
    // light beams and pulsing ground rings mark stars and power-ups from far away
    const beamTex = (() => { const H = 64, px = new Uint8Array(4 * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < 4; x++) { const v = y / (H - 1), a = Math.pow(1 - v, 1.6) * Math.min(1, v * 8 + 0.3), o = (y * 4 + x) * 4; px[o] = px[o + 1] = px[o + 2] = 255; px[o + 3] = Math.round(a * 255); } const t = new THREE.DataTexture(px, 4, H, THREE.RGBAFormat); t.needsUpdate = true; t.magFilter = THREE.LinearFilter; return t; })();
    const beamGeo = merge([[new THREE.PlaneGeometry(0.5, 8), TM(0, 4, 0)], [new THREE.PlaneGeometry(0.5, 8), TM(0, 4, 0, 0, Math.PI / 2)]]);
    { const uv = []; for (let k = 0; k < 2; k++) uv.push(0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1); beamGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); }
    const beams = inst(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }), 30);
    const groundRings = inst((() => { const g = new THREE.RingGeometry(0.46, 0.6, 40); g.rotateX(-Math.PI / 2); g.translate(0, 0.035, 0); return g; })(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 40);
    const heartGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.2); s.bezierCurveTo(-0.32, 0.02, -0.2, 0.28, 0, 0.12); s.bezierCurveTo(0.2, 0.28, 0.32, 0.02, 0, -0.2); const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 14 }); g.center(); return g; })();
    // power-ups are small animated models, each with its own colour and shape
    const PU = { o: { color: '#FFB43B', name: 'ring' }, m: { color: '#D8FF6A', name: 'magnet' }, u: { color: '#7FE3FF', name: 'bubble' }, h: { color: '#FF7FA8', name: 'heart' } };
    // a round icon plate floats above every power-up, the same symbol as in the HUD, so the kind is clear from far away
    const PU_ICONS = {
      o: (g) => { g.fillStyle = '#FFD36B'; g.beginPath(); g.arc(15, 9, 4.5, 0, 7); g.fill(); g.strokeStyle = '#FFB43B'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 12); g.lineTo(4, 20); g.moveTo(14, 13); g.lineTo(8, 20); g.moveTo(11, 10); g.lineTo(4, 15); g.stroke(); },
      m: (g) => { g.fillStyle = '#F2FF9A'; g.beginPath(); g.arc(12, 12, 4.4, 0, 7); g.fill(); g.fillStyle = '#E8FF8A'; for (const [x, y, r] of [[5, 7, 2], [19, 8, 1.8], [17, 19, 2]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } },
      u: (g) => { g.strokeStyle = '#BFF4FF'; g.lineWidth = 2.6; g.beginPath(); g.arc(12, 12, 8, 0, 7); g.stroke(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(9, 9, 2.2, 0, 7); g.fill(); },
      h: (g) => { g.fillStyle = '#FF9CBE'; g.fill(new Path2D('M12 20.5s-7.5-4.6-7.5-10.4a4.2 4.2 0 0 1 7.5-2.6a4.2 4.2 0 0 1 7.5 2.6c0 5.8-7.5 10.4-7.5 10.4z')); },
    };
    const badgeGeo = new THREE.PlaneGeometry(1.05, 1.05);
    const puBadges = {};
    for (const k of Object.keys(PU_ICONS)) {
      const tex = canvasTex(256, 256, (g, w) => {
        g.clearRect(0, 0, w, w); const c = w / 2;
        g.fillStyle = 'rgba(255,255,255,0.98)'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill();
        g.fillStyle = PU[k].color; g.beginPath(); g.arc(c, c, 113, 0, 7); g.fill();
        g.fillStyle = '#2A2552'; g.beginPath(); g.arc(c, c, 92, 0, 7); g.fill();
        g.save(); g.translate(c, c); g.scale(6.6, 6.6); g.translate(-12, -12); PU_ICONS[k](g); g.restore();
      });
      tex.anisotropy = 4;
      const m = fadeNear(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }), 3.2, 7.5);
      puBadges[k] = inst(badgeGeo, m, 8); puBadges[k].renderOrder = 5;
    }
    const iriShader = { vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float t; uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.0); vec3 c = 0.5 + 0.5 * cos(6.2831 * (f * 0.9 + t * 0.2 + vec3(0.0, 0.33, 0.67))); gl_FragColor = vec4(mix(vec3(1.0), c, 0.75), (0.1 + f * 0.85) * op); }' };
    function makeRingModel() {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      mesh(new THREE.TorusGeometry(0.8, 0.12, 18, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color('#FFC04A'), metalness: 1, roughness: 0.18, emissive: new THREE.Color('#FF8A1A'), emissiveIntensity: 0.45 }), 0, 0, 0, g);
      const u = { t: { value: 0 } };
      mesh(new THREE.CircleGeometry(0.7, 48), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; float a = atan(d.y, d.x); float sw = 0.5 + 0.5 * sin(a * 4.0 - r * 10.0 + t * 7.0); vec3 c = mix(vec3(1.0, 0.95, 0.6), vec3(1.0, 0.45, 0.2), r); float al = (1.0 - smoothstep(0.7, 1.0, r)) * (0.25 + 0.6 * sw); gl_FragColor = vec4(c * al, al); }' }), 0, 0, 0, g);
      const orb = []; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(K.starGeo, basic('#FFF2B0')); s.scale.setScalar(0.32); g.add(s); orb.push(s); }
      return { g, u, orb };
    }
    function makeLanternModel() {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color('#E8B84A'), metalness: 1, roughness: 0.25 });
      mesh(new THREE.SphereGeometry(0.34, 32, 20), new THREE.MeshStandardMaterial({ color: new THREE.Color('#EFFFD0'), metalness: 0, roughness: 0.04, transparent: true, opacity: 0.32, envMapIntensity: 2.2, depthWrite: false }), 0, 0, 0, g);
      mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.12, 24), gold, 0, 0.33, 0, g);
      mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.1, 24), gold, 0, -0.33, 0, g);
      mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 24), gold, 0, 0.45, 0, g);
      const core = mesh(new THREE.SphereGeometry(0.12, 16, 12), basic('#F2FF9A'), 0, 0, 0, g);
      const flies = []; for (let i = 0; i < 5; i++) flies.push(mesh(new THREE.SphereGeometry(0.035, 8, 6), basic('#F4FFB0'), 0, 0, 0, g));
      return { g, core, flies };
    }
    function makeBubbleModel() {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      const u = { t: { value: 0 }, op: { value: 1 } };
      const ball = mesh(new THREE.SphereGeometry(0.44, 32, 24), new THREE.ShaderMaterial(Object.assign({ uniforms: u, transparent: true, depthWrite: false }, iriShader)), 0, 0, 0, g);
      const shine = mesh(new THREE.SphereGeometry(0.08, 12, 8), basic('#FFFFFF'), -0.17, 0.2, 0.3, g); shine.scale.set(1.3, 0.8, 0.5);
      const inner = new THREE.Mesh(K.starGeo, basic('#BFF4FF')); inner.scale.setScalar(0.45); g.add(inner);
      return { g, u, ball, inner };
    }
    function makeHeartModel() {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      const h = mesh(heartGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color('#FF7FA8'), metalness: 0.1, roughness: 0.22, emissive: new THREE.Color('#E0336E'), emissiveIntensity: 0.35 }), 0, 0, 0, g); h.scale.setScalar(1.9);
      return { g, h };
    }
    // the letters S-T-E-R-N: round gold coins with the letter, one model each since only one of a kind is out at a time
    const letterMeshes = [...LETTERS].map((ch) => {
      const tex = canvasTex(256, 256, (g, w) => {
        const c = w / 2; g.clearRect(0, 0, w, w);
        g.fillStyle = '#7A3F0C'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill();
        const gr = g.createLinearGradient(0, 20, 0, 236); gr.addColorStop(0, '#FFE58A'); gr.addColorStop(1, '#F5A623');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, 112, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 8; g.beginPath(); g.arc(c, c, 92, 0, 7); g.stroke();
        g.font = '900 150px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 18; g.strokeStyle = '#7A3F0C'; g.lineJoin = 'round'; g.strokeText(ch, c, c + 8);
        g.fillStyle = '#FFFFFF'; g.fillText(ch, c, c + 8);
      });
      tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), fadeNear(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 1.8, 3.6));
      m.renderOrder = 5; m.visible = false; scene.add(m); return m;
    });
    const pools = { o: [0, 1, 2, 3].map(makeRingModel), m: [0, 1, 2].map(makeLanternModel), u: [0, 1, 2].map(makeBubbleModel), h: [0, 1, 2].map(makeHeartModel) };
    // a shock ring that bursts out of Mimo when something good is picked up
    const shocks = [0, 1, 2, 3].map(() => { const m = mesh(new THREE.TorusGeometry(1, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0, 0); m.visible = false; return { m, t: 9 }; });
    // the comet ride: a rainbow tail streaming out behind Mimo
    const tailU = { t: { value: 0 }, op: { value: 0 } };
    const tailGeo = new THREE.ConeGeometry(0.62, 3.6, 32, 1, true); tailGeo.rotateX(Math.PI / 2); tailGeo.translate(0, 0, 1.8);

    // ---------- Scenery: a sea of clouds below, floating crystals beside, rainbow at the start, star gate at the end ----------
    const CLOUDS = 56, DECOS = 18;
    // clouds: soft cumulus puffs, lit from above in the zone's light colour and shaded in its sky colour, never grey
    const cloudGeo = merge([[new THREE.SphereGeometry(1, 12, 8), TM(0, 0, 0)], [new THREE.SphereGeometry(0.74, 12, 8), TM(-0.95, -0.18, 0.12)], [new THREE.SphereGeometry(0.7, 12, 8), TM(0.98, -0.14, -0.1)], [new THREE.SphereGeometry(0.56, 10, 7), TM(0.34, 0.5, 0.22)], [new THREE.SphereGeometry(0.5, 10, 7), TM(-0.46, 0.38, -0.3)]]);
    const cloudU = { lit: { value: new THREE.Color() }, shade: { value: new THREE.Color() }, fogC: { value: scene.fog.color }, fogN: { value: scene.fog.near }, fogF: { value: scene.fog.far } };
    const clouds = inst(cloudGeo, new THREE.ShaderMaterial({ uniforms: cloudU,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vD; void main(){ mat4 m = modelMatrix * instanceMatrix; vN = normalize(mat3(m) * normal); vec4 wp = m * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 lit; uniform vec3 shade; uniform vec3 fogC; uniform float fogN; uniform float fogF; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vec3 n = normalize(vN); vec3 c = mix(shade, lit, smoothstep(-0.4, 0.8, n.y)); float rim = pow(1.0 - max(0.0, dot(n, normalize(vV))), 3.0); c += lit * rim * 0.22; c = mix(c, fogC, smoothstep(fogN, fogF, vD)); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }), CLOUDS);
    // far lantern lights drifting beside the ribbon
    const decos = inst(new THREE.IcosahedronGeometry(0.22, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), DECOS);
    const arch = new THREE.Group(); scene.add(arch);
    ['#F4A7B9', '#F7C59F', '#F6E3A1', '#B5E3C4', '#A9CCF0', '#C9B4EE'].forEach((c, i) => mesh(new THREE.TorusGeometry(3.95 - i * 0.2, 0.11, 8, 48, Math.PI), basic(c), 0, 0, 0, arch));
    for (const sx of [-1, 1]) mesh(new THREE.IcosahedronGeometry(0.9, 2), mat('#FFFFFF'), sx * 3.5, 0.2, 0, arch).scale.set(1.3, 0.8, 1);
    const gate = new THREE.Group(); scene.add(gate); gate.visible = false;
    mesh(new THREE.TorusGeometry(3.4, 0.36, 16, 64), mat('#FFD36B', { emissive: new THREE.Color('#FFB43B'), emissiveIntensity: 0.7 }), 0, 0, 0, gate);
    const gateU = { t: { value: 0 } };
    mesh(new THREE.CircleGeometry(3.1, 64), new THREE.ShaderMaterial({ uniforms: gateU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; float a = atan(d.y, d.x); float sw = 0.5 + 0.5 * sin(a * 5.0 + r * 9.0 - t * 4.0); vec3 c = mix(vec3(1.0, 0.85, 0.55), vec3(0.75, 0.6, 1.0), r); float al = (1.0 - smoothstep(0.75, 1.0, r)) * (0.35 + 0.5 * sw) + exp(-r * 4.0) * 0.8; gl_FragColor = vec4(c * al, al); }' }), 0, 0, 0, gate);
    const gateStars = []; for (let i = 0; i < 10; i++) { const st = new THREE.Mesh(K.starGeo, K.starMat); st.scale.setScalar(0.9); gate.add(st); gateStars.push(st); }
    const gateHalo = halo('#FFE7A8', 13, 0.7); gate.add(gateHalo);
    // endless track: a golden arch marks the best distance so far
    const recGate = new THREE.Group(); scene.add(recGate); recGate.visible = false;
    mesh(new THREE.TorusGeometry(3.3, 0.13, 8, 48, Math.PI), basic('#FFD36B'), 0, 0, 0, recGate);
    const recTex = canvasTex(320, 80, (g, w, h) => {
      g.fillStyle = 'rgba(58,56,80,0.82)'; g.beginPath(); if (g.roundRect) g.roundRect(4, 4, w - 8, h - 8, 34); else g.rect(4, 4, w - 8, h - 8); g.fill();
      g.fillStyle = '#FFE38A'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Rekord ' + Math.round(UPG.best).toLocaleString('de-DE') + ' m', w / 2, h / 2 + 2);
    });
    mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: recTex, transparent: true, depthWrite: false }), 0, 3.95, 0, recGate);

    // ---------- Mimo, a soap bubble, fireflies ----------
    const mimo = M3.build(THREE, { scene, PAL, outfit: host.outfit, vivid: true, mat, smoothMat: K.smoothMat, basic, mesh, halo, blushTex: K.blushTex, starGeo: K.starGeo, starMat: K.starMat });
    const aura = new THREE.Group(); scene.add(aura);
    const shieldU = { t: { value: 0 }, op: { value: 0 } };
    const shieldBall = mesh(new THREE.SphereGeometry(0.78, 32, 20), new THREE.ShaderMaterial({ uniforms: shieldU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float t; uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); vec3 c = 0.5 + 0.5 * cos(6.2831 * (f * 0.8 + t * 0.15 + vec3(0.0, 0.33, 0.67))); gl_FragColor = vec4(mix(vec3(1.0), c, 0.7), (0.06 + f * 0.75) * op); }' }), 0, 0.45, 0, aura);
    shieldBall.renderOrder = 6;
    const tail = mesh(tailGeo, new THREE.ShaderMaterial({ uniforms: tailU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: 'varying float vZ; varying float vA; void main(){ vZ = position.z / 3.6; vA = atan(position.y, position.x); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t; uniform float op; varying float vZ; varying float vA; void main(){ vec3 c = 0.55 + 0.45 * cos(6.2831 * (vZ * 0.8 - t * 1.5 + vec3(0.0, 0.33, 0.67))); float a = (1.0 - vZ) * (0.5 + 0.5 * sin(vA * 6.0 + t * 20.0 - vZ * 12.0)); gl_FragColor = vec4(c * a * op, a * op); }' }), 0, 0.42, 0.1, aura);
    tail.visible = false; tail.renderOrder = 7;
    const ghost = (() => {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      const gm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: GHOST.alpha, depthWrite: false });
      const body = new THREE.Mesh(mimo.torso.geometry, gm); body.scale.setScalar(mimo.BS); body.position.y = mimo.LEG; g.add(body);
      for (const sx of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3a3850, transparent: true, opacity: 0.6, depthWrite: false }), sx * 0.11, mimo.LEG + 0.4, 0.3, g); e.scale.set(0.8, 1.1, 0.5); }
      g.renderOrder = 6; g.traverse((o) => { o.renderOrder = 6; });
      return g;
    })();
    const ghostRun = (() => {
      const d = host.ghost; if (!d || !Array.isArray(d.d) || !d.d.length) return null;
      const n = d.d.length, s = new Float32Array(n), x = new Float32Array(n), h = new Float32Array(n);
      let acc = 0; for (let i = 0; i < n; i++) { acc += (Number(d.d[i]) || 0) / 10; s[i] = acc; x[i] = (Number(d.x[i]) || 0) / 100; h[i] = (Number(d.h[i]) || 0) / 100; }
      return { n, s, x, h };
    })();
    const rec = { d: [], x: [], h: [], t: 0, lastS: 0 };
    const dizzy = []; for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(K.starGeo, basic('#FFD86B')); d.scale.setScalar(0.32); d.visible = false; aura.add(d); dizzy.push(d); }
    const flies = []; for (let i = 0; i < 6; i++) { const f = mesh(new THREE.SphereGeometry(0.05, 8, 6), basic('#EFFF9A'), 0, 0, 0, aura); f.visible = false; flies.push(f); }

    // ---------- Cloud sheep ----------
    const sheepPool = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group(); scene.add(g); g.visible = false;
      const body = new THREE.Group(); g.add(body);
      const wool = mat('#FFFFFF'), dark = mat('#4A4560');
      for (let k = 0; k < 7; k++) mesh(new THREE.IcosahedronGeometry(0.3, 2), wool, (hash(k, 1) - 0.5) * 0.5, 0.55 + hash(k, 2) * 0.25, (hash(k, 3) - 0.5) * 0.5, body);
      const head = mesh(new THREE.SphereGeometry(0.2, 16, 12), dark, 0, 0.62, 0.38, body); head.scale.set(1, 0.95, 0.9);
      for (const sx of [-1, 1]) {
        mesh(new THREE.SphereGeometry(0.045, 8, 6), basic('#FFFFFF'), sx * 0.08, 0.68, 0.55, body);
        const ear = mesh(new THREE.SphereGeometry(0.08, 8, 6), dark, sx * 0.21, 0.7, 0.36, body); ear.scale.set(1.4, 0.6, 0.8);
      }
      const legs = []; for (const [lx, lz] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]]) legs.push(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6), dark, lx, 0.18, lz, body));
      sheepPool.push({ g, body, legs });
    }

    // ---------- Track data ----------
    const opts = { mode: 'course', invincible: false, daily: host.daily || 0 };
    let rows = [], zoneStart = [0], finishRow = -1, genS = 0, rngS = 1;
    const rnd = () => { rngS = (rngS * 16807) % 2147483647; return (rngS - 1) / 2147483646; };
    function addRows(list, zone, v, endless) {
      const padRow = [-99, -99, -99];
      for (const str of list) {
        const r = rows.length, cells = [];
        for (let l = 0; l < 3; l++) {
          const d = CELL[str[l]] || CELL['.'];
          const c = { f: d[0], o: d[1], it: d[2], ih: d[3], got: false, broken: false, cs: 0, ct: 0, nm: false, hit: false };
          if (c.o === 'P') padRow[l] = r;
          if (c.ih < 0) {
            const pr = padRow[l] > -99 ? padRow[l] : padRow[1];
            const t = pr > -99 ? ((r - pr) * ROW + 0.6) / v : 0;
            const hh = PH.PAD * t - 0.5 * PH.GRAV * t * t;
            c.ih = pr > -99 && hh > 0 ? hh + PH.CENTER : 3.2;
          }
          if (c.it === 'h' && !endless) c.it = 's';
          cells.push(c);
        }
        rows.push({ c: cells, z: zone, sheep: str[3] === 'w' ? { ph: hash(r, 7) * 6.28, said: false, hop: 0, broken: false } : null });
      }
    }
    function addChunk(name, zone, v, endless) { const r0 = rows.length; addRows(CHUNKS[name], zone, v, endless); if (rows[r0]) rows[r0].k = name; const sp = []; for (let i = 0; i < SPACER; i++) sp.push('...'); addRows(sp, zone, v, endless); }
    function buildCourse() {
      rows = []; zoneStart = [];
      addRows(START_ROWS, 0, ZONES[0].speed, false);
      (opts.daily ? dailyCourse(opts.daily) : COURSE).forEach((list, z) => { zoneStart.push(rows.length); for (const name of list) addChunk(name, z, ZONES[z].speed, false); });
      const tail = []; for (let i = 0; i < PORTAL_PAD + TAIL_ROWS; i++) tail.push(i < PORTAL_PAD - 1 ? '.s.' : '...');
      addRows(tail, 3, ZONES[3].speed, false);
      finishRow = rows.length - TAIL_ROWS;
      FLY.at.forEach((k, i) => placeLetter(Math.floor(finishRow * k), finishRow - 8, i));
    }
    // a letter floats at jump height on a free tile, preferably on a side lane
    function placeLetter(from, to, idx) {
      for (let r = from; r < to; r++) {
        const row = rows[r]; if (!row || row.sheep) continue;
        const order = hash(r, idx) < 0.5 ? [0, 2, 1] : [2, 0, 1];
        for (const l of order) {
          const c = row.c[l], prev = rows[r - 1] && rows[r - 1].c[l], next = rows[r + 1] && rows[r + 1].c[l];
          if (!c.f || c.o || (c.it && c.it !== 's') || (prev && (prev.o || !prev.f)) || (next && (next.o || !next.f))) continue;
          c.it = 'L'; c.ih = 1.45; c.letter = idx; return r;
        }
      }
      return -1;
    }
    function endlessSpeed(s) { return Math.min(ENDLESS.vmax, ENDLESS.v0 + ENDLESS.accel * s); }
    function endlessZone(s) { return Math.floor(s / ENDLESS.zoneLen) % ZONES.length; }
    function growEndless(toRow) {
      while (rows.length < toRow) {
        const s = rows.length * ROW, tier = Math.min(3, Math.floor(s / 450)), z = endlessZone(s), v = endlessSpeed(s);
        let name;
        if (s - genS.heart > ENDLESS.heartEvery && S.hearts < UPG.hearts) { name = 'heart'; genS.heart = s; }
        else { const t = rnd() < 0.65 ? tier : Math.floor(rnd() * (tier + 1)); const pool = POOL[t]; name = pool[Math.floor(rnd() * pool.length)]; if (name === genS.last) name = pool[(pool.indexOf(name) + 1) % pool.length]; }
        genS.last = name;
        const r0 = rows.length; addChunk(name, z, v, true);
        if (p.fly > 0 && S.flyRowEnd > r0) stampFly(r0, Math.min(rows.length, S.flyRowEnd));
        if (!S.letterOut && S.letters < LETTERS.length && p.fly <= 0 && s - genS.letter > FLY.every) { const r = placeLetter(r0, rows.length, nextLetter()); if (r >= 0) { S.letterOut = { r }; genS.letter = s; } }
      }
    }
    function cellAt(r, l) { const row = rows[r]; return row ? row.c[l] : null; }
    function floorAt(r, l) { if (r < 0) return true; const row = rows[r]; if (!row) return opts.mode === 'course'; return !!row.c[l].f; }

    // ---------- Frames along the ribbon ----------
    const UP = new THREE.Vector3(0, 1, 0), mB = new THREE.Matrix4();
    function newFrame() { return { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion() }; }
    function frameAt(s, F) {
      const x = cx(s), y = cy(s);
      F.t.set(cx(s + 0.5) - cx(s - 0.5), cy(s + 0.5) - cy(s - 0.5), -1).normalize();
      F.r.set(-F.t.z, 0, F.t.x).normalize();
      F.u.crossVectors(F.r, F.t);
      const bank = clamp((cx(s + 4) - 2 * x + cx(s - 4)) / 16 * 26, -0.3, 0.3), cb = Math.cos(bank), sb = Math.sin(bank);
      const rx = F.r.x * cb - F.u.x * sb, ry = F.r.y * cb - F.u.y * sb, rz = F.r.z * cb - F.u.z * sb;
      F.u.set(F.u.x * cb + F.r.x * sb, F.u.y * cb + F.r.y * sb, F.u.z * cb + F.r.z * sb); F.r.set(rx, ry, rz);
      F.b.copy(F.t).negate();
      F.p.set(x, y, -s);
      F.q.setFromRotationMatrix(mB.makeBasis(F.r, F.u, F.b));
      return F;
    }
    const FR = []; for (let i = 0; i < AHEAD + BEHIND + 4; i++) FR.push(newFrame());
    const FM = newFrame(), FC = newFrame(), FL = newFrame(), FX = newFrame();
    function lanePos(F, laneF, h, out) { return out.copy(F.p).addScaledVector(F.r, (laneF - 1) * LANE).addScaledVector(F.u, h); }

    // ---------- State ----------
    const p = { s: 3, v: 0, lane: 1, laneX: 1, h: 0, vh: 0, grounded: true, coyote: 0, buffer: 0, slide: 0, tumble: 0, invuln: 0, slowK: 1, boost: 0, magnet: 0, shield: false, flip: 0, flipV: 0, sq: 0, jig: 0, jigV: 0, walkT: 0, armUp: 0, blink: 2, moodT: 0, mood: null, fallFrom: null, fallTo: null, laneFrom: 1, laneGoal: 1, laneFromX: 1, laneT: 1, stumbleT: 0, manual: false, fly: 0, trick: null, trickT: 0, trickDur: 1, jumps: 0, hopT: 0, lookT: 0, lookDur: 1, lookKind: '', lookCool: 5, dizzy: 0, stepSign: 1 };
    const S = { state: 'intro', t: 0, introT: 0, count: 3, score: 0, combo: 0, mult: 1, maxMult: 1, stars: 0, sparks: 0, hits: 0, falls: 0, hearts: UPG.hearts, time: 0, zone: 0, zoneShown: -1, freeze: 0, shake: 0, hudT: 0, reported: false, seen: new Set(), visDt: 0, fallT: 0, endT: 0, slowmo: 1 };
    let worldT = 0;
    const particles = [];
    const flyers = [];
    function resetState(mode, skipIntro) {
      opts.mode = mode || opts.mode;
      Object.assign(p, { s: 3, v: 0, lane: 1, laneX: 1, laneGoal: 1, laneFromX: 1, laneT: 1, h: 0, vh: 0, grounded: true, coyote: 0, buffer: 0, slide: 0, tumble: 0, invuln: 0, slowK: 1, boost: 0, magnet: 0, shield: false, flip: 0, flipV: 0, sq: 0, jig: 0, jigV: 0, moodT: 0, mood: null, stumbleT: 0, manual: false, fly: 0, trick: null, trickT: 0, jumps: 0, hopT: 0, lookT: 0, lookCool: 5, dizzy: 0 });
      Object.assign(S, { state: skipIntro ? 'count' : 'intro', t: 0, introT: 0, count: 3, score: 0, combo: 0, mult: 1, maxMult: 1, stars: 0, sparks: 0, hits: 0, falls: 0, hearts: UPG.hearts, time: 0, zone: 0, zoneShown: -1, freeze: 0, shake: 0, hudT: 0, reported: false, fallT: 0, endT: 0, slowmo: 1, lastM: 3, zoneMark: 0, recDone: false, letters: 0, letterMask: 0, letterOut: null, flyMult: null });
      p.shield = UPG.shield;
      particles.length = 0; flyers.length = 0;
      for (const c of comets) { c.on = false; c.g.visible = false; }
      rngS = 1 + Math.floor(Math.random() * 1e6); genS = { heart: 0, last: '', letter: 0 };
      rec.d.length = 0; rec.x.length = 0; rec.h.length = 0; rec.t = 0; rec.lastS = 3; rec.d.push(0); rec.x.push(100); rec.h.push(0);
      if (opts.mode === 'endless') { rows = []; zoneStart = [0]; finishRow = -1; addRows(START_ROWS, 0, ENDLESS.v0, true); growEndless(AHEAD + 40); }
      else buildCourse();
      gate.visible = opts.mode === 'course';
      if (input.actions) input.actions.length = 0;
      input.jumpQueued = false;
      if (skipIntro) { S.count = 3; S.t = 0; host.onCount && host.onCount('3'); play('count', 0); }
      else if (host.onCine) host.onCine({ title: { kicker: opts.mode === 'endless' ? 'Endlosbahn' : 'Bonus', name: 'Sternenbahn' } });
      setZoneLook(0, true);
      hud(true);
      snapCamera();
    }

    // ---------- Scoring and feedback ----------
    // pick-up punch: a shock ring out of Mimo, a short slow motion, a wider view and a coloured flash
    function pickupFx(color, strong) {
      const k = shocks.find((q) => q.t >= 0.5) || shocks[0]; k.t = 0; k.m.material.color.set(color); k.m.visible = true;
      S.fovKick = strong ? 10 : 5; if (strong && !reduced()) S.slowT = 0.16;
      if (host.onFlash) host.onFlash(color, !!strong);
    }
    function pop(text, kind) { if (host.onPop) host.onPop(text, kind || ''); }
    function addScore(n) { S.score += Math.round(n * UPG.mult); }
    function bumpCombo() {
      S.combo++;
      const m = Math.min(MULT_MAX, 1 + Math.floor(S.combo / COMBO_STEP));
      if (m > S.mult) { S.mult = m; S.maxMult = Math.max(S.maxMult, m); pop('x' + m, 'mult'); play('multUp', m); lookBack('wink', 0.8); if (m >= MULT_MAX) { stat('mult5'); if (host.onEvent) host.onEvent('runCombo'); } }
    }
    // a bump costs one multiplier step, not the whole streak
    function breakCombo() {
      if (p.fly > 0) return;
      const m = Math.max(1, S.mult - 1);
      if (S.mult > 1) pop('Kombo x' + m, 'bad');
      S.mult = m; S.combo = (m - 1) * COMBO_STEP;
    }
    function hint(key, html) { if (S.seen.has(key)) return; S.seen.add(key); if (host.onHint) host.onHint(html); }
    const touch = () => !!(host.isTouch && host.isTouch());
    const HINTS = {
      B: () => (touch() ? '<b>Nach oben wischen</b> oder tippen: Mimo springt über Büsche.' : '<b>Leertaste</b> oder <b>↑</b>: Mimo springt über Büsche.'),
      H: () => (touch() ? '<b>Nach unten wischen</b>: Mimo rutscht unter Wolkenbänken durch.' : '<b>↓</b>: Mimo rutscht unter Wolkenbänken durch.'),
      W: () => (touch() ? '<b>Zur Seite wischen</b>: Spur wechseln und Türmen ausweichen.' : '<b>← →</b>: Spur wechseln und Türmen ausweichen.'),
      gap: () => 'Über Lücken springen. Fällt Mimo hinein, holt ihn ein Glühwürmchen zurück.',
      P: () => 'Sprungfedern schießen Mimo hoch in die Luft. Oben hängen oft Sterne.',
      o: () => 'Flieg durch den <b>Kometenring</b>: Mimo wird kurz superschnell und rauscht durch alles durch.',
      m: () => 'Ein <b>Glühwürmchen-Schwarm</b> sammelt eine Weile alle Funken in der Nähe ein.',
      u: () => 'Die <b>Seifenblase</b> fängt einen Zusammenstoß ab.',
      C: () => 'Kometen! Wo es rot leuchtet, schlägt gleich einer ein.',
      sheep: () => 'Wolkenschafe wandern hin und her. Spring drüber oder lauf vorbei.',
      star: () => 'Zehn große Sterne liegen auf der Bahn, meist an den kniffligen Stellen.',
      h: () => 'Ein Herz gibt dir ein Leben zurück.',
    };
    const TIPS = { B: 'Springen!', H: 'Rutschen!', W: 'Ausweichen!', gap: 'Springen!', P: 'Sprungfeder!', o: 'Kometenring!', C: 'Kometen!' };
    // the hint line explains a new thing as soon as it shows up; a big tip pops once, right before the first one
    const tipped = new Set();
    let lastTip = -9;
    function scanAhead() {
      const r0 = Math.floor(p.s / ROW), close = Math.ceil((p.v * 1.0) / ROW) + 3;
      for (let r = r0 + 3; r < r0 + 18; r++) {
        const row = rows[r]; if (!row) break;
        const near = r - r0 <= close, l = p.lane, c0 = row.c[l];
        if (row.sheep) seeType('sheep', near);
        for (const c of row.c) { if (c.o) seeType(c.o, near && c === c0); if (!c.f) seeType('gap', near && c === c0); if (c.it === 'o' || c.it === 'm' || c.it === 'u' || c.it === 'h') seeType(c.it, false); if (c.it === '*') seeType('star', false); }
      }
    }
    function seeType(k, near) {
      if (!S.seen.has(k)) hint(k, HINTS[k] ? HINTS[k]() : '');
      if (near && TIPS[k] && opts.mode === 'course' && !tipped.has(k) && worldT - lastTip > 1.2) { tipped.add(k); lastTip = worldT; pop(TIPS[k], 'tip'); }
    }

    // ---------- Particles ----------
    const tmpC = new THREE.Color(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
    function burst(pos, n, colors, speed, o) {
      o = o || {};
      if (reduced()) n = Math.ceil(n / 2);
      for (let i = 0; i < n && particles.length < 900; i++) {
        const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.6, sp = speed * (0.4 + Math.random() * 0.8);
        particles.push({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + (o.up || 0), vz: Math.sin(a) * Math.cos(e) * sp, life: 0, max: (o.life || 0.7) * (0.6 + Math.random() * 0.6), c: new THREE.Color(colors[i % colors.length]), size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), grav: o.grav == null ? 6 : o.grav, glow: o.glow !== false, drag: o.drag || 1.5, al: o.alpha || 1 });
      }
    }
    function stepParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i]; q.life += dt; if (q.life > q.max) { particles.splice(i, 1); continue; }
        const dk = Math.exp(-q.drag * dt); q.vx *= dk; q.vz *= dk; q.vy = q.vy * dk - q.grav * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      }
    }

    // ---------- Player ----------
    const center = () => p.h + (p.slide > 0 && p.grounded ? PH.SLIDE_CENTER : PH.CENTER);
    function nearLanes(fn) { for (let l = 0; l < 3; l++) if (Math.abs(p.laneX - l) < 0.55) fn(l); }
    function supported() {
      if (p.boost > 0) return true;
      const r = Math.floor(p.s / ROW), loc = p.s - r * ROW; let ok = false;
      nearLanes((l) => { if (floorAt(r, l) || (loc < 0.3 && floorAt(r - 1, l)) || (loc > ROW - 0.3 && floorAt(r + 1, l))) ok = true; });
      return ok;
    }
    function doJump() {
      p.grounded = false; p.vh = PH.JUMP; p.slide = 0; p.buffer = 0; p.coyote = 0; p.sq = 0.18; play('jump'); play('hup');
      p.trick = TRICKS[p.jumps++ % TRICKS.length]; p.trickT = 0; p.trickDur = (2 * PH.JUMP) / PH.GRAV; p.lookT = 0; p.pendingLook = null; p.manual = false;
      if (p.jumps === 2) hint('trick', touch() ? 'Tipp: In der Luft <b>nochmal nach oben wischen</b> oder tippen, dann schlägt Mimo einen Salto. Das gibt Punkte.' : 'Tipp: In der Luft <b>nochmal springen</b>, dann schlägt Mimo einen Salto. Das gibt Punkte.');
    }
    // Mimo turns round to the camera for a moment: to wave, to cheer after a big star, a wink on a new multiplier, a relieved look after a close one
    function lookBack(kind, dur) {
      if (!p.grounded) { p.pendingLook = kind; return; }
      if (p.lookT > 0 || S.state !== 'play') return;
      p.lookKind = kind; p.lookT = p.lookDur = dur || MOVE.look; p.lookCool = MOVE.lookGap[0] + Math.random() * (MOVE.lookGap[1] - MOVE.lookGap[0]);
    }
    function dust(laneF, n, spread) {
      lanePos(FM, laneF, 0.06, V1);
      burst(V1, n, ['#FFFFFF', ZONES[S.zone].glow], spread, { up: 0.6, grav: 0.5, life: 0.4, size: 0.2, glow: false, drag: 4, alpha: 0.55 });
    }
    function act(a) {
      if (a === 'left' || a === 'right') {
        const n = clamp(p.lane + (a === 'left' ? -1 : 1), 0, 2);
        if (n !== p.lane) { p.laneFrom = p.lane; p.lane = n; play('swoosh'); p.hopT = MOVE.hop; p.lookT = 0; if (p.grounded) dust(p.laneX, 3, 1.2); }
        else { p.sq = -0.12; }
      } else if (a === 'jump') {
        if (p.grounded || p.coyote > 0) doJump();
        else if (!p.manual && p.fly <= 0 && S.state === 'play' && p.h > TRICK.minH) airTrick();
        else p.buffer = PH.BUFFER;
      } else if (a === 'down') {
        if (!p.grounded) { p.vh = Math.min(p.vh, -PH.DIVE); p.slide = PH.SLIDE; p.flip = 0; p.flipV = 0; }
        else { if (p.slide <= 0) play('slide'); p.slide = PH.SLIDE; }
      }
    }
    // a second jump press high in the air: a flip that scores and feeds the combo, a double flip on a spring pad
    function airTrick() {
      p.manual = true; p.mood = 'happy'; p.moodT = 0.6;
      const pad = !!p.flipV, pts = (pad ? TRICK.double : TRICK.score) * S.mult;
      if (pad) p.flipV *= 2;
      else { const left = (p.vh + Math.sqrt(Math.max(0, p.vh * p.vh + 2 * PH.GRAV * p.h))) / PH.GRAV; p.trick = p.trick === 'flip' ? 'spin' : 'flip'; p.trickT = 0; p.trickDur = Math.max(0.3, left); }
      addScore(pts); bumpCombo(); stat('trick'); pop((pad ? 'Doppelsalto! +' : 'Salto! +') + pts, 'near'); play('yay'); p.sq = 0.15;
      lanePos(FM, p.laneX, p.h + 0.4, V1); burst(V1, 10, [PAL.star, '#FFFFFF'], 2.5, { grav: 0, life: 0.45, size: 0.22 });
    }
    function land() {
      const hard = p.vh < -14; p.h = 0; p.grounded = true; p.manual = false; p.landKick = Math.min(1, -p.vh / 18); p.vh = 0; p.flip = 0; p.flipV = 0; p.trick = null;
      dust(p.laneX, hard ? 6 : 3, hard ? 2.2 : 1.4);
      if (p.pendingLook) { const k = p.pendingLook; p.pendingLook = null; lookBack(k, k === 'cheer' ? 0.9 : MOVE.look); }
      play('land');
      if (p.buffer > 0) doJump();
    }
    // ---------- Sky flight: all five letters lift Mimo over the ribbon through a field of sparks ----------
    function stampFly(from, to) {
      for (let r = from; r < to; r++) { const row = rows[r]; if (!row) break; const k = r - S.flyRow0; for (let l = 0; l < 3; l++) { const c = row.c[l]; if (c.it && c.it !== 's') continue; c.it = 's'; c.got = false; c.ih = FLY.h + 0.15 + Math.sin(k * 0.45 + l * 2.1) * 0.55; } }
    }
    function startFly() {
      p.fly = FLY.time; p.grounded = false; p.slide = 0; p.trick = null; p.flipV = 0; p.lookT = 0; p.mood = 'happy'; p.moodT = FLY.time;
      S.flyMult = { mult: S.mult, combo: S.combo }; S.mult = MULT_MAX; S.combo = (MULT_MAX - 1) * COMBO_STEP;
      pickupFx('#FFD86B', true); play('boost'); play('yay'); pop('Himmelsflug!', 'boost'); stat('fly');
      // the field: three waving lines of sparks up in the air, never over the finish
      const r0 = Math.floor(p.s / ROW) + 4, n = Math.ceil((p.v * FLY.time) / ROW) + 4, rEnd = finishRow > 0 ? Math.min(r0 + n, finishRow - 6) : r0 + n;
      S.flyRow0 = r0; S.flyRowEnd = rEnd; stampFly(r0, rEnd);
      if (finishRow > 0) p.fly = Math.min(p.fly, Math.max(1.5, (rowS(finishRow - 8) - p.s) / Math.max(1, p.v)));
    }
    function stepFly(dt) {
      p.fly -= dt; p.invuln = Math.max(p.invuln, 0.3);
      p.h = damp(p.h, p.fly > 0.8 ? FLY.h : 0.6, 3, dt); p.vh = 0;
      if (p.fly <= 0) {
        // glide on until there is a tile to land on
        const r = Math.floor(p.s / ROW); if (!floorAt(r, p.lane) || !floorAt(r + 1, p.lane)) { p.fly = 0.05; return; }
        p.fly = 0; p.invuln = 1.5; p.vh = -2; p.grounded = false;
        if (S.flyMult) { S.mult = Math.max(1, S.flyMult.mult); S.combo = S.flyMult.combo; S.flyMult = null; }
        S.letters = 0; S.letterMask = 0; S.letterOut = null; genS.letter = p.s; hud(true);
      }
    }
    function stepPlayer(dt) {
      // speed: zone tempo, slowed after a bump, faster in a comet ride
      const target = opts.mode === 'endless' ? endlessSpeed(p.s) : ZONES[S.zone].speed;
      p.slowK = Math.min(1, p.slowK + dt * (1 - HIT.slow) / HIT.recover);
      p.v = damp(p.v, target * p.slowK * (p.boost > 0 ? BOOST.k : 1), p.boost > 0 ? 6 : 3, dt);
      p.s += p.v * dt;
      const acts = input.actions || []; while (acts.length) act(acts.shift());
      // a lane change is a short ease-out (fast off the mark, lands exactly), restarted from wherever Mimo is when the lane changes again
      if (p.lane !== p.laneGoal) { p.laneGoal = p.lane; p.laneFromX = p.laneX; p.laneT = 0; }
      if (p.laneT < 1) { p.laneT = Math.min(1, p.laneT + dt / PH.LANE_TIME); p.laneX = lerp(p.laneFromX, p.lane, 1 - Math.pow(1 - p.laneT, 3)); }
      else if (p.laneX !== p.lane) { p.laneX = damp(p.laneX, p.lane, PH.LANE_RATE, dt); if (Math.abs(p.laneX - p.lane) < 0.002) p.laneX = p.lane; }
      p.slide = Math.max(0, p.slide - dt); p.buffer = Math.max(0, p.buffer - dt);
      p.tumble = Math.max(0, p.tumble - dt); p.invuln = Math.max(0, p.invuln - dt); p.stumbleT = Math.max(0, p.stumbleT - dt);
      if (p.fly > 0) { stepFly(dt); return; }
      if (p.boost > 0) { p.boost -= dt; if (p.boost <= 0) { p.boost = 0; p.invuln = Math.max(p.invuln, 0.6); } }
      if (p.magnet > 0) p.magnet = Math.max(0, p.magnet - dt);
      if (!p.grounded) {
        p.vh -= PH.GRAV * dt; p.h += p.vh * dt; if (p.flipV) p.flip += p.flipV * dt;
        if (p.h <= 0) {
          if (supported()) land();
          else if (p.h < -0.3) { startFall(); return; }
        }
      } else if (!supported()) { p.coyote -= dt; if (p.coyote <= 0) { p.grounded = false; p.vh = 0; } }
      else p.coyote = PH.COYOTE;
      if (p.boost > 0 && p.h < 0) { p.h = 0; p.vh = Math.max(0, p.vh); p.grounded = true; }
    }

    // ---------- Bumps, pickups and the things on the track ----------
    const rowS = (r) => r * ROW + 1;
    function cellPos(r, l, h, out) { frameAt(rowS(r), FX); return lanePos(FX, l, h, out); }
    function smash(r, l, kind, sheep) {
      const zc = ZONES[rows[r] ? rows[r].z : S.zone];
      if (sheep) { sheep.broken = true; frameAt(rowS(r), FX); lanePos(FX, sheepLane(sheep), 0.6, V1); burst(V1, 16, ['#FFFFFF', '#F1E7FA'], 3, { up: 1.5, grav: 2, life: 0.8, size: 0.5, glow: false }); play('baa'); return; }
      const c = rows[r].c[l]; c.broken = true;
      cellPos(r, l, kind === 'H' ? 1.2 : 0.6, V1);
      const cols = kind === 'H' ? ['#FFFFFF', '#F1E7FA'] : kind === 'W' ? [zc.danger, zc.cap, '#FFF3E4'] : kind === 'C' ? ['#FFB46B', '#7A5068'] : [zc.danger, '#FFFFFF'];
      burst(V1, 18, cols, 3.2, { up: 1.5, grav: 4, life: 0.7, size: 0.4, glow: kind === 'C' });
      play('smash');
    }
    function bump(r, l, kind, sheep) {
      if (p.boost > 0) { smash(r, l, kind, sheep); addScore(SCORE.smash * S.mult); S.shake = Math.max(S.shake, 0.25); return; }
      if (p.invuln > 0) return;
      // only brushed it halfway through a lane change: a stumble, the obstacle stays
      const glance = !sheep && kind !== 'C' && Math.abs(p.laneX - l) > 0.22 && p.stumbleT <= 0;
      if (glance) { stumble(l); return; }
      smash(r, l, kind, sheep);
      if (opts.invincible) { p.slowK = Math.min(p.slowK, 0.85); p.invuln = 0.5; p.sq = -0.2; pop('Hoppla', 'soft'); return; }
      if (p.shield) { p.shield = false; p.invuln = 0.9; lanePos(FM, p.laneX, 0.45, V1); burst(V1, 22, ['#FFFFFF', '#BFE9FF', '#F6C6E8'], 3.5, { up: 0.5, grav: 0, life: 0.5, size: 0.3 }); play('pop'); pop('Blubb!', 'soft'); return; }
      hurt();
    }
    function stumble(l) {
      if (p.lane === l) p.lane = p.laneFrom; p.stumbleT = STUMBLE.window; p.dizzy = STUMBLE.window; p.invuln = 0.7; p.slowK = Math.min(p.slowK, STUMBLE.slow);
      p.sq = -0.2; S.shake = Math.max(S.shake, 0.35); play('oh'); pop('Hoppla, gestolpert', 'soft'); if (host.onHaptic) host.onHaptic(15);
      hint('stumble', 'Gestolpert! Passiert das gleich nochmal, zählt es als Zusammenstoß.');
    }
    function hurt() {
      S.hits++; breakCombo();
      p.slowK = HIT.slow; p.invuln = HIT.invuln; p.tumble = HIT.tumble; p.slide = 0; p.mood = 'scared'; p.moodT = 0.8; p.dizzy = MOVE.dizzy; p.lookT = 0; p.trick = null;
      S.freeze = HIT.freeze; S.shake = 1; if (host.onHaptic) host.onHaptic(40);
      play('hurt'); play('oh');
      if (opts.mode === 'endless') { S.hearts--; if (S.hearts <= 0) { gameOver(); return; } pop(S.hearts === 1 ? 'Noch ein Herz' : 'Noch ' + S.hearts + ' Herzen', 'bad'); }
      hud(true);
    }
    const sheepLane = (sh) => 1 + Math.sin(sh.ph + worldT * 1.55);
    function checkObstacles() {
      const r0 = Math.floor(p.s / ROW);
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        const row = rows[r]; if (!row) continue;
        if (p.fly > 0) continue;
        const ds = Math.abs(p.s - rowS(r));
        if (row.sheep && !row.sheep.broken && ds < 0.85 && Math.abs(p.laneX - sheepLane(row.sheep)) < 0.6) {
          if (p.h < 0.72) bump(r, 1, 'sheep', row.sheep);
          else if (!row.sheep.jumped) { row.sheep.jumped = true; stat('sheep'); stat('jump'); nearMiss(); }
        }
        for (let l = 0; l < 3; l++) {
          const c = row.c[l]; if (!c.o || c.broken) continue;
          if (Math.abs(p.laneX - l) > 0.45) continue;
          if (c.o === 'P') { if (p.grounded && p.h < 0.05 && ds < 0.8 && !c.hit) padJump(c); continue; }
          if (c.o === 'B' && ds < 0.9) { if (p.h < 0.62) bump(r, l, 'B'); else { if (!c.ov) { c.ov = true; stat('jump'); } if (!c.nm && p.h < 0.95) { c.nm = true; nearMiss(); } } }
          else if (c.o === 'C' && c.cs === 2 && ds < 0.9) { if (p.h < 0.62) bump(r, l, 'C'); else if (!c.ov) { c.ov = true; stat('jump'); } }
          else if (c.o === 'W' && ds < 0.95) bump(r, l, 'W');
          else if (c.o === 'H' && ds < 1.15) { if (!(p.slide > 0 && p.h < 0.18)) bump(r, l, 'H'); else if (!c.nm) { c.nm = true; const prev = rows[r - 1] && rows[r - 1].c[l]; if (!prev || prev.o !== 'H') stat('slide'); if (p.slide < PH.SLIDE - 0.4) nearMiss(); } }
        }
      }
    }
    function nearMiss() { stat('near'); addScore(SCORE.near * S.mult); pop('Knapp! +' + SCORE.near * S.mult, 'near'); play('near'); if (Math.random() < 0.5) lookBack('phew', 0.7); }
    function padJump(c) {
      c.hit = true; setTimeout(() => { c.hit = false; }, 600);
      p.grounded = false; p.vh = PH.PAD; p.slide = 0; p.slowK = 1;
      p.v = Math.max(p.v, (opts.mode === 'endless' ? endlessSpeed(p.s) : ZONES[S.zone].speed) * (p.boost > 0 ? BOOST.k : 1));
      p.flip = 0; p.flipV = (Math.PI * 2) / (2 * PH.PAD / PH.GRAV); p.sq = 0.3; p.trick = null; p.lookT = 0;
      play('bounce'); play('yay');
      lanePos(FM, p.laneX, 0.1, V1); burst(V1, 12, ['#FFFFFF', ZONES[S.zone].glow, PAL.star], 3, { up: 2, grav: 4, life: 0.6, size: 0.3 });
    }
    function letterCount() { let n = 0; for (let i = 0; i < LETTERS.length; i++) if (S.letterMask & (1 << i)) n++; return n; }
    const nextLetter = () => { for (let i = 0; i < LETTERS.length; i++) if (!(S.letterMask & (1 << i))) return i; return -1; };
    function collect(r, l, c) {
      c.got = true;
      cellPos(r, l, c.ih, V1);
      if (c.it === 's') {
        bumpCombo(); S.sparks++; stat('spark'); addScore(SCORE.spark * S.mult); play('spark', S.combo);
        burst(V1, 4, [PAL.star, '#FFFFFF'], 1.6, { grav: 0, life: 0.35, size: 0.22 });
      } else if (c.it === '*') {
        S.stars++; stat('star'); addScore(SCORE.star); pickupFx('#FFD86B', false); play('star'); play('yay'); pop('Stern ' + S.stars + (opts.mode === 'course' ? '/' + STAR_TOTAL : ''), 'star');
        burst(V1, 26, [PAL.star, '#FFFFFF', '#FFE7A8'], 4, { up: 1, grav: 2, life: 0.8, size: 0.35 }); p.mood = 'happy'; p.moodT = 0.9; p.cheerT = 0.9; lookBack('cheer', 0.9);
        if (opts.mode === 'course' && S.stars >= STAR_TOTAL && host.onEvent) host.onEvent('runStars');
      } else if (c.it === 'o') {
        p.boost = UPG.boost; p.slowK = 1; stat('ring'); pickupFx('#FFB43B', true); addScore(SCORE.ring * S.mult); play('boost'); pop('Kometenritt!', 'boost'); p.mood = 'happy'; p.moodT = UPG.boost;
        burst(V1, 30, ['#FFD36B', '#FFFFFF', '#FFB43B'], 5, { grav: 0, life: 0.6, size: 0.35 }); S.shake = Math.max(S.shake, 0.3);
      } else if (c.it === 'm') { pickupFx('#D8FF6A', true); p.magnet = UPG.magnet; play('magnet'); pop('Glühwürmchen!', 'power'); burst(V1, 16, ['#EFFF9A', '#FFFFFF'], 2.5, { grav: 0, life: 0.6 }); }
      else if (c.it === 'u') { pickupFx('#7FE3FF', true); p.shield = true; play('bubble'); pop('Seifenblase!', 'power'); }
      else if (c.it === 'L') {
        S.letterMask |= 1 << c.letter; S.letters = letterCount(); S.letterOut = null; stat('letter');
        const word = [...LETTERS].map((ch, i) => (S.letterMask & (1 << i) ? ch : '·')).join(' ');
        pickupFx('#FFD86B', false); play('star'); pop(word, 'star');
        burst(V1, 18, [PAL.star, '#FFFFFF'], 3, { grav: 1, life: 0.6, size: 0.3 });
        if (S.letters >= LETTERS.length) startFly();
      }
      else if (c.it === 'h') { pickupFx('#FF7FA8', true); if (S.hearts < UPG.hearts) S.hearts++; else addScore(250); play('star'); pop(S.hearts >= UPG.hearts ? 'Herzen voll' : 'Herz!', 'power'); }
      hud(true);
    }
    function checkItems() {
      const r0 = Math.floor(p.s / ROW), reach = p.magnet > 0 ? Math.ceil(MAGNET.reach / ROW) : 1, hc = center();
      for (let r = r0 - 1; r <= r0 + reach; r++) {
        const row = rows[r]; if (!row) continue;
        const ds = rowS(r) - p.s;
        for (let l = 0; l < 3; l++) {
          const c = row.c[l]; if (!c.it || c.got) continue;
          if (p.magnet > 0 && c.it === 's' && ds > -1.5 && ds < MAGNET.reach) { cellPos(r, l, c.ih, V1); flyers.push({ x: V1.x, y: V1.y, z: V1.z, t: 0 }); stat('magnetSpark'); collect(r, l, c); continue; }
          if (Math.abs(ds) > 0.95 || Math.abs(p.laneX - l) > 0.6) continue;
          const tol = c.it === 's' ? 0.85 : c.it === 'L' ? 0.95 : 1.0;
          if (Math.abs(hc - c.ih) < tol) collect(r, l, c);
        }
      }
    }
    function stepComets(dt) {
      const r0 = Math.floor(p.s / ROW), lead = p.v * 1.05 + 16;
      for (let r = r0; r < r0 + 40; r++) {
        const row = rows[r]; if (!row) break;
        for (let l = 0; l < 3; l++) {
          const c = row.c[l]; if (c.o !== 'C') continue;
          if (c.cs === 0 && rowS(r) - p.s < lead) { c.cs = 1; c.ct = 0; const k = comets.find((q) => !q.on); if (k) { k.on = true; k.r = r; k.l = l; k.side = l === 0 ? -1 : l === 2 ? 1 : (hash(r, l) < 0.5 ? -1 : 1); c.k = k; } play('whistle'); }
          else if (c.cs === 1) {
            c.ct += dt;
            if (c.ct >= 1) { c.cs = 2; if (c.k) { c.k.on = false; c.k.g.visible = false; c.k = null; } cellPos(r, l, 0.4, V1); burst(V1, 22, ['#FFB46B', '#FFE7A8', '#7A5068'], 4.5, { up: 2.5, grav: 6, life: 0.8, size: 0.4 }); play('boom'); S.shake = Math.max(S.shake, 0.45 * clamp(1 - (rowS(r) - p.s) / 40, 0.2, 1)); }
          }
        }
      }
    }
    function stepSheep(dt) {
      const r0 = Math.floor(p.s / ROW);
      for (let r = r0; r < r0 + 14; r++) { const row = rows[r]; if (row && row.sheep && !row.sheep.said && rowS(r) - p.s < 18) { row.sheep.said = true; play('baa'); } }
    }

    // ---------- Falling and the firefly rescue ----------
    function startFall() {
      S.state = 'fall'; S.fallT = 0; S.falls++; p.grounded = false; p.slide = 0; p.mood = 'scared'; p.moodT = 2; p.flip = 0; p.flipV = 0; p.tumble = 0; p.vh = Math.max(p.vh, -2);
      breakCombo(); play('oh');
      if (p.shield) { p.shield = false; play('pop'); pop('Blubb! Gerettet', 'soft'); S.fallT = FALL.drop; S.saved = true; }
      else {
        S.saved = false;
        if (opts.mode === 'endless' && !opts.invincible) { S.hearts--; if (S.hearts <= 0) { S.lastFall = true; } }
      }
      // find the next calm stretch ahead to land on
      let r = Math.floor(p.s / ROW) + 2, lane = p.lane;
      for (let k = 0; k < 60; k++, r++) {
        const pick = [p.lane, 1, 0, 2].find((l) => [0, 1, 2].every((d) => { const c = cellAt(r + d, l); return !c || (c.f && !c.o && !(rows[r + d] && rows[r + d].sheep)); }));
        if (pick != null) { lane = pick; break; }
      }
      p.fallTo = { s: rowS(r), lane };
      hud(true);
    }
    function stepFall(dt) {
      S.fallT += dt;
      if (S.fallT < FALL.drop) { p.vh -= PH.GRAV * FALL.grav * dt; p.h += p.vh * dt; p.s += p.v * 0.6 * dt; return; }
      if (S.lastFall) { S.lastFall = false; gameOver(); return; }
      if (!p.fallFrom) { p.fallFrom = { s: p.s, lane: p.laneX, h: p.h }; play('bubble'); if (!S.saved) pop('Glühwürmchen hilft', 'soft'); }
      const k = smooth(clamp((S.fallT - FALL.drop) / FALL.lift, 0, 1)), f = p.fallFrom, t = p.fallTo;
      p.s = lerp(f.s, t.s, k); p.laneX = lerp(f.lane, t.lane, k); p.lane = t.lane; p.h = lerp(f.h, 0, k) + Math.sin(k * Math.PI) * 2.8; p.vh = 0;
      if (k >= 1) { p.fallFrom = null; S.state = 'play'; p.grounded = true; p.h = 0; p.invuln = 1.0; p.slowK = 0.7; p.v = Math.min(p.v, (opts.mode === 'endless' ? endlessSpeed(p.s) : ZONES[S.zone].speed) * 0.7); p.mood = null; play('pop'); }
    }

    // ---------- Ends ----------
    function result() {
      return { mode: opts.mode, daily: opts.daily || 0, ghost: opts.mode === 'course' && S.state === 'win' ? { d: rec.d.slice(), x: rec.x.slice(), h: rec.h.slice() } : null, score: S.score, stars: S.stars, total: STAR_TOTAL, sparks: S.sparks, dist: Math.round(p.s), time: S.time, hits: S.hits, falls: S.falls, clean: S.hits === 0 && S.falls === 0, maxMult: S.maxMult };
    }
    function win() {
      S.state = 'win'; S.endT = 0; p.mood = 'happy'; p.moodT = 9;
      if (S.hits + S.falls === S.zoneMark) stat('zoneClean');
      addScore(SCORE.finish); const clean = S.hits === 0 && S.falls === 0; if (clean) addScore(SCORE.clean);
      pop(clean ? 'Fehlerfrei! +' + (SCORE.finish + SCORE.clean) : 'Ziel! +' + SCORE.finish, 'star');
      play('door'); hud(true);
    }
    function gameOver() {
      // out of a gap: Mimo drops back onto the next calm stretch for the show
      p.dropIn = S.state === 'fall' && !!p.fallTo;
      if (p.dropIn) { p.s = p.fallTo.s; p.lane = p.fallTo.lane; p.laneX = p.lane; p.h = 0; p.vh = 0; p.fallFrom = null; }
      S.state = 'over'; S.endT = 0; p.tumble = 0; p.trick = null; p.lookT = 0; p.mood = 'scared'; p.moodT = 9; S.shake = 1;
      play('hurt'); pop('Lauf vorbei', 'bad'); hud(true);
    }
    function enterZone(z) {
      S.zone = z;
      if (S.zoneShown === z) return;
      if (S.zoneShown >= 0) { if (S.hits + S.falls === S.zoneMark) { stat('zoneClean'); pop('Zone ohne Zusammenstoß', 'near'); } S.zoneMark = S.hits + S.falls; }
      S.zoneShown = z;
      if (host.onIntensity) host.onIntensity(opts.mode === 'endless' ? Math.min(3, Math.floor(p.s / 700)) : z);
      if (host.onCine && (z > 0 || opts.mode === 'endless' && p.s > 50)) host.onCine({ title: { kicker: opts.mode === 'endless' ? Math.round(p.s) + ' Meter' : 'Zone ' + (z + 1), name: ZONES[z].name } });
      if (z > 0) play('zone');
    }

    // ---------- Main step ----------
    function update(dt) {
      S.visDt += dt;
      if (S.freeze > 0) { S.freeze -= dt; return; }
      if (S.slowT > 0) { S.slowT -= dt; dt *= 0.3; }
      if (S.state === 'over' || S.state === 'win') dt *= S.state === 'over' ? lerp(0.35, 1, clamp(S.endT / 1.2, 0, 1)) : 1;
      worldT += dt; S.t += dt;
      S.shake = Math.max(0, S.shake - dt * 2.2);
      const acts = input.actions || [];
      if (S.state === 'intro') {
        S.introT += dt;
        if (input.jumpQueued || acts.length) { input.jumpQueued = false; acts.length = 0; if (S.introT < INTRO_TIME - 0.6) S.introT = INTRO_TIME - 0.6; }
        if (S.introT >= INTRO_TIME) { S.state = 'count'; S.t = 0; S.count = 3; if (host.onCount) host.onCount('3'); play('count', 0); }
      } else if (S.state === 'count') {
        acts.length = 0; input.jumpQueued = false;
        if (S.t >= COUNT_STEP) {
          S.t -= COUNT_STEP; S.count--;
          if (S.count > 0) { if (host.onCount) host.onCount(String(S.count)); play('count', 3 - S.count); }
          else { S.state = 'play'; S.t = 0; if (host.onCount) host.onCount('Los!'); play('go'); p.v = 4; }
        }
      } else if (S.state === 'play') {
        S.time += dt;
        const r0 = Math.floor(p.s / ROW), row = rows[r0];
        if (row && row.z !== S.zone) enterZone(row.z); else if (S.zoneShown < 0) enterZone(S.zone);
        stepPlayer(dt);
        if (S.state === 'play') { checkObstacles(); checkItems(); }
        stepComets(dt); stepSheep(dt); scanAhead();
        if (S.letterOut && S.letterOut.r * ROW < p.s - 6) S.letterOut = null;
        // record the run for the ghost
        if (opts.mode === 'course') { rec.t += dt; while (rec.t >= 1 / GHOST.rate) { rec.t -= 1 / GHOST.rate; rec.d.push(Math.round((p.s - rec.lastS) * 10)); rec.lastS += rec.d[rec.d.length - 1] / 10; rec.x.push(Math.round(p.laneX * 100)); rec.h.push(Math.round(Math.max(0, p.h) * 100)); } }
        if (opts.mode === 'endless') { growEndless(Math.floor(p.s / ROW) + AHEAD + 20); const m = Math.floor(p.s); if (m > S.lastM) { addScore((m - S.lastM) * SCORE.meter); stat('meter', m - S.lastM); S.lastM = m; }
          if (UPG.best > 50 && !S.recDone && p.s > UPG.best) { S.recDone = true; pop('Neuer Rekord!', 'star'); play('best'); lanePos(FM, p.laneX, 1, V1); burst(V1, 30, ['#FFE38A', '#FFFFFF', '#F4A7C0'], 5, { up: 2, grav: 3, life: 0.9, size: 0.35 }); } }
        else if (S.state === 'play' && finishRow > 0 && p.s >= rowS(finishRow)) win();
        input.jumpQueued = false;
      } else if (S.state === 'fall') { stepFall(dt); stepComets(dt); acts.length = 0; input.jumpQueued = false; }
      else if (S.state === 'win') {
        S.endT += dt; p.s += p.v * dt * Math.max(0, 1 - S.endT / 1.1); acts.length = 0;
        if (Math.random() < 0.35) {
          // confetti pops at the gate and above Mimo's head
          const atGate = Math.random() < 0.5; frameAt(atGate ? rowS(finishRow) : p.s, FX);
          V1.copy(FX.p).addScaledVector(FX.r, (p.laneX - 1) * LANE * (atGate ? 0 : 1) + (Math.random() - 0.5) * (atGate ? 7 : 4)).addScaledVector(FX.u, atGate ? 3.4 + (Math.random() - 0.5) * 4 : 1.8 + Math.random() * 1.4);
          burst(V1, 10, ['#F4A7B9', '#F6E3A1', '#A9CCF0', '#B5E3C4', '#FFFFFF'], atGate ? 5 : 3, { grav: 3, life: 1.1, size: atGate ? 0.35 : 0.22 }); if (Math.random() < 0.3 && S.endT < 8) play('pop');
        }
        if (S.endT > WIN_TIME && !S.reported) { S.reported = true; host.onEnd && host.onEnd(result()); }
      } else if (S.state === 'over') {
        S.endT += dt; p.v = damp(p.v, 0, 2.5, dt); p.s += p.v * dt; acts.length = 0;
        if (S.endT > OVER_TIME && !S.reported) { S.reported = true; host.onEnd && host.onEnd(result()); }
      }
      // flyers: sparks pulled in by the fireflies
      for (let i = flyers.length - 1; i >= 0; i--) { flyers[i].t += dt * 3.2; if (flyers[i].t >= 1) flyers.splice(i, 1); }
      stepParticles(dt);
      hud(false);
    }

    // ---------- Visuals ----------
    const qTmp = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), qPi = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI), qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const vS = new THREE.Vector3(), mT = new THREE.Matrix4(), X_AX = new THREE.Vector3(1, 0, 0), Y_AX = UP, Z_AX = new THREE.Vector3(0, 0, 1);
    const look = { k: -1, prev: 0, next: 0 };
    const cTile = new THREE.Color(), cTile2 = new THREE.Color(), cMix = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
    function zoneColor(key, z, out) { return out.copy(ZC[z][key]); }
    function put(im, F, laneF, h, yaw, sx, sy, sz, color, spinAxis, spin) {
      if (im.count >= im.cap) return;
      lanePos(F, laneF, h, V2);
      qTmp.copy(F.q); if (yaw) { qYaw.setFromAxisAngle(Y_AX, yaw); qTmp.multiply(qYaw); } if (spin) { qYaw.setFromAxisAngle(spinAxis || Y_AX, spin); qTmp.multiply(qYaw); }
      vS.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
      mT.compose(V2, qTmp, vS); im.setMatrixAt(im.count, mT);
      if (color) im.setColorAt(im.count, color);
      im.count++;
    }
    function setZoneLook(zf, snap) {
      // zf: zone index with fraction, the sky and lights blend smoothly between neighbours
      const z0 = Math.floor(zf) % ZONES.length, z1 = Math.min(ZONES.length - 1, z0 + 1), k = opts.mode === 'endless' && z0 === ZONES.length - 1 ? 0 : zf - Math.floor(zf);
      const a = ZC[z0], b = ZC[z1 === z0 ? z0 : z1], A = ZONES[z0], B = ZONES[z1];
      skyU.top.value.lerpColors(a.top, b.top, k); skyU.bot.value.lerpColors(a.bot, b.bot, k); skyU.glow.value.lerpColors(a.glow, b.glow, k);
      scene.fog.color.lerpColors(a.bot, b.bot, k);
      hemi.color.lerpColors(a.hemiA, b.hemiA, k); hemi.groundColor.lerpColors(a.hemiB, b.hemiB, k); hemi.intensity = lerp(A.hemi[2], B.hemi[2], k);
      sun.color.lerpColors(a.sunC, b.sunC, k); sun.intensity = lerp(A.sun[1], B.sun[1], k);
      starField.op.value = lerp(A.stars, B.stars, k); aurora.u.op.value = lerp(A.aurora, B.aurora, k); for (const pl of aurora.list) pl.visible = aurora.u.op.value > 0.01;
      const po = lerp(A.planets, B.planets, k); for (const pl of planets) { pl.pm.opacity = po; if (pl.rm) pl.rm.opacity = po * 0.7; pl.g.visible = po > 0.02; }
      sunDisc.material.opacity = lerp(A.sunDisc, B.sunDisc, k) * 0.9; sunDisc.visible = sunDisc.material.opacity > 0.02;
      meteors.m.opacity = lerp(A.meteors, B.meteors, k) * 0.9;
      cA.lerpColors(a.cloud, b.cloud, k); cloudU.lit.value.copy(cA).lerp(cB.lerpColors(a.glow, b.glow, k), 0.25);
      cloudU.shade.value.lerpColors(a.bot, b.bot, k).lerp(cB.lerpColors(a.top, b.top, k), 0.4).multiplyScalar(0.9);
      look.zf = zf;
    }
    function zoneFloat() {
      if (opts.mode === 'endless') { const zl = ENDLESS.zoneLen, s = p.s, base = Math.floor(s / zl), f = s - base * zl; return (base % ZONES.length) + smooth(clamp((f - (zl - 40)) / 40, 0, 1)); }
      const r = Math.floor(p.s / ROW); let z = 0; for (let i = 0; i < zoneStart.length; i++) if (r >= zoneStart[i]) z = i;
      const next = zoneStart[z + 1]; if (next == null) return z;
      return z + smooth(clamp((p.s - (next * ROW - 40)) / 40, 0, 1));
    }
    const cGlowGold = new THREE.Color('#FFD86B');
    const poolUse = { o: 0, m: 0, u: 0, h: 0 };
    function ringPulse(F, l, color, r) {
      for (let i = 0; i < 2; i++) { const k = (worldT * 0.9 + r * 0.13 + i * 0.5) % 1; put(groundRings, F, l, 0, 0, 0.8 + k * 1.2, 1, 0.8 + k * 1.2, cB.set(color).multiplyScalar((1 - k) * 0.95)); }
    }
    // each power-up model gets its own little show: spinning ring with a swirl, a lantern with fireflies, a wobbling bubble, a beating heart
    function drawPowerup(F, l, c, r, bob) {
      const def = PU[c.it], pool = pools[c.it]; if (!def || !pool) return;
      const it = pool[poolUse[c.it]++]; if (!it) return;
      const y = c.it === 'o' ? c.ih : c.ih + bob * 1.5, t = worldT + r * 0.37;
      lanePos(F, l, y, it.g.position); it.g.quaternion.copy(F.q); it.g.visible = true; it.g.scale.setScalar(1);
      if (c.it === 'o') { it.u.t.value = worldT; it.g.scale.setScalar(1 + Math.sin(t * 5) * 0.05); it.orb.forEach((s, i) => { const a = t * 1.6 + i * 1.047; s.position.set(Math.cos(a) * 1.04, Math.sin(a) * 1.04, 0); s.rotation.z = -a * 2; }); }
      else if (c.it === 'm') { it.g.rotateY(t * 1.2); it.core.scale.setScalar(1 + Math.sin(t * 9) * 0.18); it.flies.forEach((f, i) => { const a = t * 3 + i * 1.257; f.position.set(Math.cos(a) * 0.62, Math.sin(a * 1.7 + i) * 0.3, Math.sin(a) * 0.62); }); }
      else if (c.it === 'u') { it.u.t.value = t; const w = Math.sin(t * 4) * 0.07; it.ball.scale.set(1 + w, 1 - w, 1 + w); it.inner.rotation.set(0, t * 2, t); }
      else if (c.it === 'h') { const beat = Math.pow(Math.max(0, Math.sin(t * 6)), 10) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 6 - 0.7)), 10); it.h.scale.setScalar(1.9 * (1 + beat * 0.2)); it.g.rotateY(Math.sin(t * 1.5) * 0.5); }
      // the plate grows with distance so it keeps a readable size on screen
      lanePos(F, l, y, V1); const pl = (1 + Math.pow(Math.max(0, Math.sin(t * 3)), 6) * 0.12) * clamp(V1.distanceTo(cam.position) / 11, 1, 3.2);
      put(puBadges[c.it], F, l, y + 0.75 + 0.6 * pl + Math.sin(t * 2.2) * 0.07, Math.sin(t * 1.3) * 0.18, pl, pl, 1, null);
      put(beams, F, l, 0, worldT * 0.5, 1, 1, 1, cB.set(def.color).multiplyScalar(0.32 + 0.1 * Math.sin(t * 4)));
      put(shades, F, l, 0, 0, 1.4, 1, 1.4, null);
      lanePos(F, l, y, V1); glows.add(V1.x, V1.y, V1.z, cA.set(def.color), 0.9, 3.6);
      // twinkles circling the power-up
      for (let i = 0; i < 4; i++) { const a = t * 2.1 + i * 1.571, tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.3); lanePos(F, l + Math.cos(a) * 0.36, y + Math.sin(a * 1.3) * 0.45, V1); V1.addScaledVector(F.t, Math.sin(a) * 0.4); glows.add(V1.x, V1.y, V1.z, i % 2 ? cA.set('#FFFFFF') : cA.set(def.color), 0.5 + tw * 0.5, 0.35 + tw * 0.35); }
    }
    const trackIms = [tileBed, tiles, inlays, rails, posts, hangers, shades, bushInk, bushes, crystalInk, crystals, banks, bankOut, bankShade, slideSigns, bankGlow, towerInk, towers, towerBands, caps, padInk, pads, padArrows, rockInk, rocks, warns, sparkInk, sparks, bigInk, bigStars, starRings, beams, groundRings, ...Object.values(puBadges)];
    const cInkGold = new THREE.Color('#7A3F0C'), cBand = new THREE.Color('#FFF3E4'), cRing = new THREE.Color('#FFE7A0');
    function drawTrack() {
      for (const im of trackIms) im.count = 0;
      for (const m of letterMeshes) m.visible = false;
      glows.begin(); poolUse.o = poolUse.m = poolUse.u = poolUse.h = 0;
      const r0 = Math.floor(p.s / ROW) - BEHIND, rEnd = r0 + BEHIND + AHEAD;
      let sheepN = 0;
      // during the show the camera stands in front of Mimo: keep the stretch between them clear
      const showing = S.state === 'win' || S.state === 'over', clearFrom = p.s + 0.3;
      for (let r = Math.max(0, r0), fi = 0; r < rEnd; r++, fi++) {
        const row = rows[r]; if (!row) break;
        const F = frameAt(rowS(r), FR[fi]), z = row.z, zc = ZC[z], hideThings = showing && rowS(r) > clearFrom;
        const zs = zoneStart[z] != null && opts.mode === 'course' ? zoneStart[z] : -99, prevZ = Math.max(0, z - 1), bl = zs > 0 ? clamp((r - zs) / 8, 0, 1) : 1;
        for (let l = 0; l < 3; l++) {
          const c = row.c[l];
          if (c.f) {
            cTile.copy((r + l) % 2 ? zc.tileA : zc.tileB); if (bl < 1) { cTile2.copy((r + l) % 2 ? ZC[prevZ].tileA : ZC[prevZ].tileB); cTile.lerpColors(cTile2, cTile, bl); }
            put(tiles, F, l, 0, 0, 1, 1, 1, cTile); put(tileBed, F, l, 0, 0, 1, 1, 1, cTile2.copy(cTile).multiplyScalar(0.42));
            const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(worldT * 3 - r * 0.45));
            cMix.copy(zc.inlay).multiplyScalar(pulse); put(inlays, F, l, 0, 0, 1, 1, 1, cMix);
          }
          if (c.o && !c.broken && !hideThings) {
            if (c.o === 'B') {
              const yaw = hash(r, l) * 6;
              if (z === 0) { put(bushInk, F, l, 0, yaw, 1, 1, 1, zc.ink); put(bushes, F, l, 0, yaw, 1, 1, 1, zc.danger); }
              else { put(crystalInk, F, l, 0, yaw, 1.05, 1.05, 1.05, zc.ink); put(crystals, F, l, 0, yaw, 1.05, 1.05, 1.05, zc.danger); }
              put(shades, F, l, 0, 0, 1.6, 1, 1.6, null);
            }
            else if (c.o === 'H') {
              put(bankOut, F, l, -0.03, 0, 1.07, 1.06, 1.08, zc.bankInk); put(banks, F, l, 0, 0, 1, 1, 1, zc.bank); put(bankShade, F, l, 0, 0, 1, 1, 1, null);
              cMix.copy(zc.bankGlow).multiplyScalar(0.6 + 0.3 * Math.sin(worldT * 6 + r)); put(bankGlow, F, l, 0, 0, 1, 1, 1, cMix);
              const prevH = rows[r - 1] && rows[r - 1].c[l].o === 'H' && !rows[r - 1].c[l].broken;
              if (!prevH) put(slideSigns, fi > 0 ? FR[fi - 1] : F, l, 1.05 + Math.sin(worldT * 4 + r) * 0.06, 0, 1, 1, 1, null);
            }
            else if (c.o === 'W') { put(towerInk, F, l, 0, 0, 1, 1, 1, zc.ink); put(towers, F, l, 0, 0, 1, 1, 1, zc.danger); put(towerBands, F, l, 0, 0, 1, 1, 1, cBand); put(shades, F, l, 0, 0, 2, 1, 2, null); put(caps, F, l, 3.2 + Math.sin(worldT * 2 + r) * 0.12, worldT * 1.5, 1, 1.3, 1, zc.cap); lanePos(F, l, 3.2, V1); glows.add(V1.x, V1.y, V1.z, zc.cap, 0.7, 2.2); }
            else if (c.o === 'P') { const sq = c.hit ? 0.55 : 1 + Math.sin(worldT * 6 + r) * 0.04; put(padInk, F, l, 0, 0, 1, sq, 1, zc.ink); put(pads, F, l, 0, 0, 1, sq, 1, cA.set(PAL.thorn)); put(padArrows, F, l, 0.05 + (worldT * 0.8 % 1) * 0.35, 0, 1, 1, 1, cMix.set('#FFFFFF').multiplyScalar(1 - (worldT * 0.8 % 1))); }
            else if (c.o === 'C') {
              if (c.cs === 2) { put(rockInk, F, l, 0, hash(r, l) * 6, 1, 1, 1, zc.ink); put(rocks, F, l, 0, hash(r, l) * 6, 1, 1, 1, cA.set('#6E5A7E')); }
              else { const fast = c.cs === 1 ? 10 : 4, a = 0.55 + 0.45 * Math.sin(worldT * fast); put(warns, F, l, 0, worldT, 1 + (c.cs === 1 ? c.ct * 0.25 : 0), 1, 1 + (c.cs === 1 ? c.ct * 0.25 : 0), cMix.set('#FF6A4A').multiplyScalar(a)); }
            }
          }
          if (c.it && !c.got && !hideThings) {
            const bob = Math.sin(worldT * 3 + r * 0.7 + l) * 0.08;
            // stars sway instead of spinning, so they never turn edge-on and always show their full shape
            if (c.it === 's') {
              // sparks shrink away right in front of the lens instead of turning see-through
              lanePos(F, l, c.ih + bob, V1); const near = clamp((V1.distanceTo(cam.position) - 1.6) / 1.8, 0, 1); if (near <= 0) continue;
              const yaw = Math.sin(worldT * 2.4 + r * 0.9) * 0.55, sz = 0.78 * near; put(sparkInk, F, l, c.ih + bob, yaw, sz, sz, sz, cInkGold); put(sparks, F, l, c.ih + bob, yaw, sz, sz, sz, null); lanePos(F, l, c.ih + bob, V1); glows.add(V1.x, V1.y, V1.z, cGlowGold, 0.4, 1.0); }
            else if (c.it === '*') {
              const y = c.ih + bob * 2, yaw = Math.sin(worldT * 1.8 + r) * 0.45, pulse = 1 + Math.pow(Math.max(0, Math.sin(worldT * 3 + r)), 8) * 0.12;
              put(bigInk, F, l, y, yaw, 1.45 * pulse, 1.45 * pulse, 1.45 * pulse, cInkGold); put(bigStars, F, l, y, yaw, 1.45 * pulse, 1.45 * pulse, 1.45 * pulse, null);
              const rk = (worldT * 0.8 + r * 0.3) % 1; put(starRings, F, l, y, 0, 0.9 + rk * 0.9, 0.9 + rk * 0.9, 1, cA.copy(cRing).multiplyScalar((1 - rk) * 0.9));
              if (c.ih < 2.4) put(shades, F, l, 0, 0, 1.3, 1, 1.3, null);
              put(beams, F, l, 0, worldT * 0.5, 1, 1, 1, cB.set('#FFE38A').lerp(zc.glow, 0.3).multiplyScalar(0.32 + 0.1 * Math.sin(worldT * 4 + r)));
              ringPulse(F, l, '#FFD86B', r); lanePos(F, l, y, V1); glows.add(V1.x, V1.y, V1.z, cGlowGold, 1, 4);
            }
            else if (c.it === 'L') {
              // a letter coin sways and pulses under its own slim beam
              const m = letterMeshes[c.letter], y = c.ih + bob * 2, pulse = 1 + Math.pow(Math.max(0, Math.sin(worldT * 4 + r)), 6) * 0.15;
              lanePos(F, l, y, m.position); m.quaternion.copy(F.q).multiply(qYaw.setFromAxisAngle(Y_AX, Math.sin(worldT * 2 + r) * 0.5)); m.scale.setScalar(pulse); m.visible = true;
              put(beams, F, l, 0, worldT * 0.5, 1, 1, 1, cB.set('#FFE38A').multiplyScalar(0.3)); put(shades, F, l, 0, 0, 1.2, 1, 1.2, null);
              lanePos(F, l, y, V1); glows.add(V1.x, V1.y, V1.z, cGlowGold, 0.8, 2.4);
            }
            else drawPowerup(F, l, c, r, bob);
          }
        }
        // rails on the outer edges, lantern posts and hanging crystals now and then
        const railC = zc.rail;
        if (row.c[0].f) put(rails, F, -0.47, -0.02, 0, 1, 1, 1, railC);
        if (row.c[2].f) put(rails, F, 2.47, -0.02, 0, 1, 1, 1, railC);
        if (r % 6 === 0) {
          for (const side of [-0.47, 2.47]) { if (!row.c[side < 0 ? 0 : 2].f) continue; put(posts, F, side, 0.08, 0, 0.7, 0.7, 0.7, zc.rail); }
        }
        if (r % 5 === 2 && row.c[1].f) put(hangers, F, 1 + (hash(r, 3) - 0.5) * 1.6, -0.22, hash(r, 4) * 6, 0.7 + hash(r, 5) * 0.6, 0.6 + hash(r, 6) * 0.8, null, cMix.copy(zc.tileB).multiplyScalar(0.82));
        // sheep
        if (row.sheep && !row.sheep.broken && !hideThings && sheepN < sheepPool.length) {
          const sh = sheepPool[sheepN++], ln = sheepLane(row.sheep), dir = Math.cos(row.sheep.ph + worldT * 1.55);
          lanePos(F, ln, 0, sh.g.position); sh.g.quaternion.copy(F.q).multiply(qYaw.setFromAxisAngle(Y_AX, dir > 0 ? -Math.PI / 2 : Math.PI / 2));
          sh.g.visible = true; sh.body.position.y = Math.abs(Math.sin(worldT * 9 + r)) * 0.08;
          sh.legs.forEach((lg, i) => { lg.rotation.x = Math.sin(worldT * 14 + i * Math.PI) * 0.5; });
        }
        if (r === finishRow && opts.mode === 'course') { lanePos(F, 1, 3.4, gate.position); gate.quaternion.copy(F.q); }
        if (r === 2) { lanePos(F, 1, 0, arch.position); arch.quaternion.copy(F.q); }
      }
      for (let i = sheepN; i < sheepPool.length; i++) sheepPool[i].g.visible = false;
      for (const k of Object.keys(pools)) for (let i = poolUse[k]; i < pools[k].length; i++) pools[k][i].g.visible = false;
      // falling comets
      for (const k of comets) {
        if (!k.on) continue; const c = rows[k.r] && rows[k.r].c[k.l]; if (!c || c.cs !== 1) { k.on = false; k.g.visible = false; continue; }
        const t = clamp(c.ct, 0, 1); frameAt(rowS(k.r), FX); lanePos(FX, k.l, 0.42, V1);
        V2.copy(V1).addScaledVector(FX.u, 26).addScaledVector(FX.r, k.side * 10).addScaledVector(FX.t, 14);
        k.g.position.lerpVectors(V2, V1, t * t); k.g.visible = true; k.g.rotation.x += 0.2; k.g.rotation.y += 0.13;
        for (let i = 0; i < 3; i++) { V3.lerpVectors(V2, V1, Math.max(0, t * t - 0.03 * i - Math.random() * 0.02)); particles.length < 900 && particles.push({ x: V3.x, y: V3.y, z: V3.z, vx: 0, vy: 0, vz: 0, life: 0, max: 0.45, c: new THREE.Color(i ? '#FF8A5A' : '#FFE0A0'), size: 0.9 - i * 0.2, grav: 0, glow: true, drag: 0 }); }
      }
      if (!rows[finishRow] && opts.mode === 'course') gate.visible = false; else if (opts.mode === 'course') gate.visible = p.s > rowS(finishRow) - (AHEAD - 2) * ROW && S.state !== 'win' || S.state === 'win';
      arch.visible = p.s < 80;
      recGate.visible = opts.mode === 'endless' && UPG.best > 50 && UPG.best > p.s - 8 && UPG.best < p.s + AHEAD * ROW;
      if (recGate.visible) { frameAt(UPG.best, FX); lanePos(FX, 1, 0, recGate.position); recGate.quaternion.copy(FX.q); }
      for (const im of trackIms) { im.visible = im.count > 0; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    }
    function drawScenery() {
      // clouds below and crystals beside, laid out on a grid along s so they stay put while Mimo runs
      clouds.count = 0; decos.count = 0;
      const zc = ZC[Math.round(clamp(look.zf, 0, 3))];
      const base = Math.floor(p.s / 7) - 4;
      for (let k = 0; k < CLOUDS; k++) {
        const n = base + Math.floor(k / 2), side = k % 2 ? 1 : -1, s = n * 7 + hash(n, side) * 6;
        frameAt(s, FX); const off = side * (5 + hash(n, side + 3) * 30), sc = 2.4 + hash(n, side + 5) * 4.5;
        V2.copy(FX.p).addScaledVector(FX.r, off).add(V3.set(0, -7 - hash(n, side + 7) * 6, 0));
        vS.set(sc * 1.6, sc * 0.55, sc); mT.compose(V2, qTmp.identity(), vS); clouds.setMatrixAt(clouds.count, mT);
        clouds.count++;
      }
      const dbase = Math.floor(p.s / 9) - 2;
      for (let k = 0; k < DECOS; k++) {
        const n = dbase + Math.floor(k / 2), side = k % 2 ? 1 : -1, s = n * 9 + hash(n, side * 3) * 7;
        frameAt(s, FX); const off = side * (9 + hash(n, side + 11) * 16), y = -3 + hash(n, side + 13) * 7, sc = 0.35 + hash(n, side + 17) * 0.7;
        V2.copy(FX.p).addScaledVector(FX.r, off).addScaledVector(FX.u, y + Math.sin(worldT + n) * 0.3);
        qTmp.identity(); vS.set(sc, sc, sc); mT.compose(V2, qTmp, vS);
        decos.setMatrixAt(decos.count, mT); decos.setColorAt(decos.count, cB.copy(zc.glow).lerp(zc.cap, 0.25)); decos.count++;
        glows.add(V2.x, V2.y, V2.z, cB, 0.55, 2.2 * sc);
      }
      clouds.instanceMatrix.needsUpdate = true; decos.instanceMatrix.needsUpdate = true; decos.instanceColor.needsUpdate = true;
    }

    // nothing to dodge in the next few rows: a good moment to turn round and wave
    function calmAhead() {
      const r0 = Math.floor(p.s / ROW);
      for (let r = r0; r < r0 + 9; r++) { const row = rows[r]; if (!row || row.sheep) return false; for (const c of row.c) if (c.o || !c.f) return false; }
      return true;
    }
    // ---------- The show after the run ----------
    // Overrides the pose set above while the run is over; returns how high Mimo hops, for the shadow.
    let showMove = '';
    function endShow() {
      const E = S.endT, win = S.state === 'win';
      if (!win && S.state !== 'over') { showMove = ''; return 0; }
      const r = mimo.root, b = mimo.body, A0 = mimo.arms[0].rotation, A1 = mimo.arms[1].rotation, L0 = mimo.legs[0].rotation, L1 = mimo.legs[1].rotation;
      let move, u, face = 'happy';
      if (win) { if (E < SHOW.start) return 0; const q = (E - SHOW.start) / SHOW.beat; move = DANCE[Math.floor(q) % DANCE.length]; u = q % 1; }
      else {
        const t1 = SHOW.start, t2 = t1 + SHOW.dizzy, t3 = t2 + SHOW.shake;
        if (E < t1) { move = p.dropIn ? 'drop' : 'tumble'; u = E / t1; face = 'scared'; }
        else if (E < t2) { move = 'dizzy'; u = (E - t1) / SHOW.dizzy; face = 'closed'; }
        else if (E < t3) { move = 'shake'; u = (E - t2) / SHOW.shake; face = 'closed'; }
        else { const q = (E - t3) / SHOW.beat; move = COMEBACK[Math.floor(q) % COMEBACK.length]; u = q % 1; }
      }
      if (move !== showMove) { showMove = move; if (E < 9) { if (move === 'shake') { dust(p.laneX, 8, 2); play('pop'); } else if (move === 'spin' || move === 'flip' || move === 'cheer') play('hup'); else if (move === 'dizzy' || move === 'drop') play('land'); } }
      const hop = (k, hgt) => Math.sin(Math.PI * clamp(k, 0, 1)) * hgt;
      let lift = 0, sq = 0, spinY = 0, flipX = 0;
      b.rotation.set(0, 0, 0); A0.set(0, 0, -0.2); A1.set(0, 0, 0.2); L0.set(0, 0, 0); L1.set(0, 0, 0);
      if (move === 'hop') { const k = (u * 2) % 1, side = u < 0.5 ? 1 : -1; lift = hop(k, 0.32); sq = k < 0.12 || k > 0.88 ? -0.12 : 0.08; A0.set(0, 0, side > 0 ? -2.0 : -0.4); A1.set(0, 0, side > 0 ? 0.4 : 2.0); b.rotation.z = side * 0.14; }
      else if (move === 'spin') { lift = hop(u, 0.7); spinY = smooth(u) * Math.PI * 2; A0.set(0, 0, -2.0); A1.set(0, 0, 2.0); sq = u < 0.1 ? -0.15 : 0.06; }
      else if (move === 'star') { const k = Math.sin(Math.PI * u); lift = hop(u, 0.6); A0.set(0, 0, -0.9 - k * 1.1); A1.set(0, 0, 0.9 + k * 1.1); L0.set(0, 0, -k * 0.8); L1.set(0, 0, k * 0.8); }
      else if (move === 'wiggle') { const w = Math.sin(u * Math.PI * 6); b.rotation.z = w * 0.24; b.position.x = w * 0.06; A0.set(0, 0, -1.9 - w * 0.35); A1.set(0, 0, 1.9 - w * 0.35); lift = Math.abs(w) * 0.05; }
      else if (move === 'wave') { A1.set(0, 0, 1.95 + Math.sin(u * Math.PI * 8) * 0.4); A0.set(0, 0, -0.3); b.rotation.z = Math.sin(u * Math.PI * 2) * 0.07; face = 'wink'; }
      else if (move === 'flip') { lift = hop(u, 0.9); flipX = -smooth(clamp((u - 0.1) / 0.75, 0, 1)) * Math.PI * 2; A0.set(0, 0, -1.6); A1.set(0, 0, 1.6); L0.set(-0.8, 0, 0); L1.set(-0.8, 0, 0); }
      else if (move === 'tumble') { lift = hop(u, 0.8); flipX = smooth(u) * Math.PI * 2; A0.set(0, 0, -2.2); A1.set(0, 0, 2.2); sq = u > 0.9 ? -0.25 : 0; }
      else if (move === 'drop') { lift = (1 - smooth(clamp(u / 0.7, 0, 1))) * 3; sq = u > 0.7 ? -0.3 * (1 - (u - 0.7) / 0.3) : 0.12; A0.set(0, 0, -2.4); A1.set(0, 0, 2.4); }
      else if (move === 'dizzy') { sq = -0.2 + Math.sin(E * 3) * 0.02; b.rotation.z = Math.sin(E * 4) * 0.14; b.rotation.x = -0.15; A0.set(0.3, 0, -0.55); A1.set(0.3, 0, 0.55); L0.set(-1.45, 0, 0); L1.set(-1.45, 0, 0); }
      else if (move === 'shake') { b.rotation.z = Math.sin(u * Math.PI * 10) * 0.32 * (1 - u); lift = hop(u, 0.15); A0.set(0, 0, -1.2); A1.set(0, 0, 1.2); }
      else if (move === 'bounce') { const k = (u * 2) % 1, pm = Math.sin(u * Math.PI * 4); lift = hop(k, 0.26); A0.set(-0.3, 0, -1.5 - pm * 0.5); A1.set(-0.3, 0, 1.5 + pm * 0.5); sq = k < 0.1 ? -0.1 : 0.05; }
      else if (move === 'cheer') { lift = hop(u, 0.45); A0.set(0, 0, -2.05); A1.set(0, 0, 2.05); }
      // put the body where the move wants it: standing on the ribbon, facing ahead (the camera waits in front)
      frameAt(p.s, FM); lanePos(FM, p.laneX, 0, r.position); r.quaternion.copy(FM.q).multiply(qPi);
      r.position.addScaledVector(FM.u, lift);
      if (spinY) r.quaternion.multiply(qYaw.setFromAxisAngle(Y_AX, spinY));
      if (flipX) { r.position.addScaledVector(FM.u, 0.42); r.quaternion.multiply(qYaw.setFromAxisAngle(X_AX, flipX)); V1.set(0, -0.42, 0).applyQuaternion(r.quaternion); r.position.add(V1); }
      const BS = mimo.BS; b.scale.set((1 - sq * 0.5) * BS, (1 + sq) * BS, (1 - sq * 0.5) * BS);
      b.position.y = mimo.LEG + (move === 'dizzy' ? -0.03 : 0); if (move !== 'wiggle') b.position.x = 0;
      // face
      const happy = face === 'happy' || face === 'wink';
      mimo.eyes.forEach((e, i) => { e.visible = face === 'scared' || (face === 'wink' && i === 0); e.scale.set(face === 'scared' ? 1.12 : 1, face === 'scared' ? 1.18 : 1, 1); });
      mimo.happyEyes.forEach((e, i) => { e.visible = happy && !(face === 'wink' && i === 0); });
      mimo.closedEyes.forEach((e) => { e.visible = face === 'closed'; });
      mimo.mouthOpen.visible = face === 'scared' || face === 'happy'; mimo.smile.visible = !mimo.mouthOpen.visible;
      mimo.mouthOpen.scale.set(1, face === 'scared' ? 1.4 : 1, 1);
      const stars = move === 'dizzy' || move === 'shake';
      dizzy.forEach((d, i) => { d.visible = stars; if (!stars) return; const a = worldT * 6 + i * 2.094; d.position.set(Math.cos(a) * 0.36, 0.95 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.36); d.rotation.set(0, -a, 0.3); });
      r.visible = true;
      return lift;
    }
    function syncMimo(dt) {
      const LEG = mimo.LEG, BS = mimo.BS, r = mimo.root, playing = S.state === 'play';
      frameAt(p.s, FM);
      lanePos(FM, p.laneX, p.h, r.position);
      // face forward along the ribbon and lean into lane changes
      r.quaternion.copy(FM.q).multiply(qPi);
      // the lean follows the lane change through a quick spring, so the body swings in instead of snapping
      mimo.lean = damp(mimo.lean || 0, p.lane - p.laneX, 24, dt);
      const turn = clamp(mimo.lean * -0.9, -0.5, 0.5);
      if (turn) r.quaternion.multiply(qYaw.setFromAxisAngle(Y_AX, turn));
      // whole-body turns: tumble after a bump, a flip on spring pads, a trick on every normal jump
      let rotAx = null, rotA = 0;
      if (p.tumble > 0) { rotAx = X_AX; rotA = (1 - p.tumble / HIT.tumble) * Math.PI * 2; }
      else if (!p.grounded && p.flipV) { rotAx = X_AX; rotA = Math.min(p.flip, Math.PI * 2); }
      else if (!p.grounded && p.trick && playing) {
        p.trickT += dt / p.trickDur; const k = smooth(clamp(p.trickT / 0.8, 0, 1));
        if (p.trick === 'spin') { rotAx = Y_AX; rotA = k * Math.PI * 2; }
        else if (p.trick === 'flip') { rotAx = X_AX; rotA = k * Math.PI * 2; }
        else if (p.trick === 'roll') { rotAx = Z_AX; rotA = k * Math.PI * 2 * (p.jumps % 4 < 2 ? 1 : -1); }
      }
      if (rotAx) { const pv = rotAx === Y_AX ? 0 : 0.42; r.position.addScaledVector(FM.u, pv); r.quaternion.multiply(qYaw.setFromAxisAngle(rotAx, rotA)); V1.set(0, -pv, 0).applyQuaternion(r.quaternion); r.position.add(V1); }
      r.scale.setScalar(MOVE.scale * funScale());
      p.moodT = Math.max(0, p.moodT - dt); if (p.moodT <= 0) p.mood = null;
      p.hopT = Math.max(0, p.hopT - dt); p.dizzy = Math.max(0, p.dizzy - dt); p.cheerT = Math.max(0, (p.cheerT || 0) - dt);
      const air = !p.grounded || S.state === 'fall', sliding = p.slide > 0 && p.grounded, run = playing && p.grounded && !sliding;
      // the look back: the body turns to the camera while the legs keep running
      if (run) { p.lookCool -= dt; if (p.lookCool <= 0 && calmAhead()) lookBack('wave'); } else p.lookT = 0;
      p.lookT = Math.max(0, p.lookT - dt);
      const lk = 1 - p.lookT / p.lookDur, lookEnv = p.lookT > 0 ? smooth(clamp(lk / 0.22, 0, 1)) * smooth(clamp((1 - lk) / 0.28, 0, 1)) : 0;
      const looking = lookEnv > 0.45 ? p.lookKind : '';
      // landing jiggle spring, squash and stretch
      if (p.landKick) { p.jigV -= p.landKick * 4; mimo.spr.vx += p.landKick * 0.3; p.landKick = 0; }
      p.jigV += (-p.jig * 190 - p.jigV * 9) * dt; p.jig += p.jigV * dt;
      p.sq = damp(p.sq, 0, 9, dt);
      const tuck = air && p.trick === 'tuck' && playing ? Math.sin(Math.PI * clamp(p.trickT, 0, 1)) : 0;
      const stretch = air ? clamp(p.vh / 60, -0.12, 0.16) : 0, sq = p.sq + stretch + p.jig * 0.05 - tuck * 0.12;
      const slideK = damp(mimo.slideK || 0, sliding ? 1 : 0, 18, dt); mimo.slideK = slideK;
      mimo.body.scale.set((1 - sq * 0.5 + slideK * 0.12) * BS, (1 + sq - slideK * 0.25) * BS, (1 - sq * 0.5 + slideK * 0.12) * BS);
      // run cycle: a bounce on every step, a soft squash at each footfall and a puff of dust now and then
      if (run) {
        const before = Math.sin(p.walkT); p.walkT += dt * (7 + p.v * 0.62); const after = Math.sin(p.walkT);
        if ((before < 0) !== (after < 0)) { p.sq -= 0.045; if (Math.random() < 0.45) dust(p.laneX + (after < 0 ? -0.07 : 0.07), 1, 0.45); }
      }
      const w = Math.sin(p.walkT), runK = run ? 1 : 0, hopK = p.hopT > 0 && p.grounded ? Math.sin(Math.PI * (1 - p.hopT / MOVE.hop)) : 0;
      mimo.body.position.y = LEG + Math.abs(w) * 0.085 * runK + hopK * 0.2 - slideK * 0.06;
      mimo.body.rotation.z = w * 0.07 * runK + mimo.lean * 0.45;
      mimo.body.rotation.x = p.boost > 0 ? 0.42 : sliding ? -0.85 * slideK : air ? clamp(-p.vh * 0.01, -0.15, 0.15) + tuck * 0.35 : 0.16;
      mimo.body.rotation.y = lookEnv * 2.7;
      p.armUp = damp(p.armUp, air ? 1 : 0, 10, dt);
      const legSw = w * 0.95 * runK, spread = air && p.trick === 'star' && playing ? Math.sin(Math.PI * clamp(p.trickT, 0, 1)) : 0;
      mimo.legs[0].rotation.set(air ? -0.6 - tuck * 0.9 : sliding ? -1.35 : legSw, 0, -spread * 0.7); mimo.legs[1].rotation.set(air ? 0.4 - tuck * 1.9 : sliding ? -1.35 : -legSw, 0, spread * 0.7);
      const swing = w * 1.0 * runK, t = worldT, A0 = mimo.arms[0].rotation, A1 = mimo.arms[1].rotation;
      mimo.arms.forEach((a, i) => a.position.copy(mimo.armBase[i]));
      if (p.fly > 0) { A0.set(-2.9, 0, -0.25); A1.set(-2.9, 0, 0.25); mimo.body.rotation.x = 0.75; mimo.legs[0].rotation.set(0.9, 0, 0); mimo.legs[1].rotation.set(0.9, 0, 0); }
      else if (p.boost > 0) { A1.set(-2.7, 0, 0.15); A0.set(0.7, 0, -0.35); }
      else if (S.state === 'fall' && !p.fallFrom) { const fl = Math.sin(t * 22) * 0.4; A0.set(0, 0, -2.0 - fl); A1.set(0, 0, 2.0 + fl); }
      else if (sliding) { A0.set(-0.4, 0, -1.9); A1.set(-0.4, 0, 1.9); }
      else if (p.dizzy > 0 && p.tumble <= 0) { const wb = Math.sin(t * 9) * 0.25; A0.set(0.2, 0, -0.35 - wb); A1.set(0.2, 0, 0.35 - wb); }
      else if (spread > 0) { A0.set(0, 0, -1.0 - spread * 0.9); A1.set(0, 0, 1.0 + spread * 0.9); }
      else if (tuck > 0) { A0.set(-1.1 * tuck, 0, -0.2 + tuck * 0.9); A1.set(-1.1 * tuck, 0, 0.2 - tuck * 0.9); }
      else if (air && p.cheerT > 0) { const pm = Math.sin(t * 18) * 0.25; A0.set(0, 0, -2.05 - pm); A1.set(0, 0, 2.05 + pm); }
      else if (looking === 'wave') { A0.set(swing * 0.4, 0, -0.25); A1.set(0, 0, 1.95 + Math.sin(t * 16) * 0.4); }
      else if (looking === 'cheer') { const pm = Math.abs(Math.sin(t * 12)) * 0.3; A0.set(0, 0, -1.9 - pm); A1.set(0, 0, 1.9 + pm); }
      else if (looking === 'wink') { A0.set(swing * 0.4, 0, -0.25); A1.set(-1.5, 0, 0.5); }
      else if (looking === 'phew') { A0.set(swing * 0.4, 0, -0.25); A1.set(-2.3 + Math.sin(t * 10) * 0.2, 0, 1.2); }
      else { A0.set(swing, 0, -0.15 - p.armUp * 1.7); A1.set(-swing, 0, 0.15 + p.armUp * 1.7); }
      if (S.state === 'win' || (S.state === 'count' && S.count <= 1)) { A0.set(0, 0, -2.0); A1.set(0, 0, 2.0); }
      if (S.state === 'intro') { const k = S.introT; A1.set(0, 0, 2.4 + Math.sin(k * 12) * 0.35); mimo.body.rotation.z = Math.sin(k * 3) * 0.05; mimo.body.rotation.x = 0; mimo.body.rotation.y = 0; mimo.legs[0].rotation.set(0, 0, 0); mimo.legs[1].rotation.set(0, 0, 0); }
      // face: big eyes, happy arcs, a wink, squeezed shut when dizzy or relieved
      p.blink -= dt; if (p.blink < 0) p.blink = 2.2 + Math.random() * 2.8;
      const blinkK = p.blink < 0.12 ? 0.1 : 1;
      const scared = p.mood === 'scared' || p.tumble > 0 || (S.state === 'fall' && !p.fallFrom) || S.state === 'over';
      const dz = p.dizzy > 0 && p.tumble <= 0 && playing;
      const closed = !scared && (looking === 'phew' || dz);
      const wink = !scared && looking === 'wink';
      const happy = !scared && !closed && (p.mood === 'happy' || p.boost > 0 || S.state === 'intro' || S.state === 'win' || S.mult >= 4 || looking === 'wave' || looking === 'cheer' || wink || spread > 0.2 || p.cheerT > 0);
      mimo.eyes.forEach((e, i) => { e.visible = (!happy && !closed) || (wink && i === 0); e.scale.set(scared ? 1.12 : 1, blinkK * (scared ? 1.18 : 1), 1); });
      mimo.happyEyes.forEach((e, i) => { e.visible = happy && !(wink && i === 0); });
      mimo.closedEyes.forEach((e) => { e.visible = closed; });
      const open = scared || (happy && !wink) || (air && p.vh > 3) || (p.piepT > 0);
      mimo.mouthOpen.visible = open; mimo.smile.visible = !open;
      mimo.mouthOpen.scale.set(1, scared ? 1.4 : p.piepT > 0 ? 1.6 : 1, 1);
      p.piepT = Math.max(0, (p.piepT || 0) - dt);
      dizzy.forEach((d, i) => { d.visible = dz || (p.tumble > 0 && playing); if (!d.visible) return; const a = t * 6 + i * 2.094; d.position.set(Math.cos(a) * 0.36, 1.08 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.36); d.rotation.set(0, -a, 0.3); });
      const spr = mimo.spr, tgtX = -(run ? 0.45 : 0) + clamp(p.vh * 0.02, -0.3, 0.35) - (p.boost > 0 ? 0.6 : 0) + hopK * 0.4, tgtZ = Math.sin(t * 1.4) * 0.06 - turn * 0.6;
      spr.vx += ((tgtX - spr.x) * 70 - spr.vx * 6) * dt; spr.x += spr.vx * dt;
      spr.vz += ((tgtZ - spr.z) * 70 - spr.vz * 6) * dt; spr.z += spr.vz * dt;
      if (mimo.sprout) { mimo.sprout.rotation.x = spr.x; mimo.sprout.rotation.z = spr.z; }
      if (mimo.wings) { const f = Math.sin(t * (air ? 22 : 5)) * (air ? 0.7 : 0.2); mimo.wings[0].rotation.y = f; mimo.wings[1].rotation.y = -f; }
      if (mimo.rainbow) mimo.skin.color.setHSL((t * 0.15) % 1, 0.55, 0.78);
      mimo.skin.emissiveIntensity = p.boost > 0 ? 1.7 + Math.sin(t * 30) * 0.4 : 1;
      r.visible = !(p.invuln > 0 && p.fly <= 0 && p.tumble <= 0 && playing && Math.floor(t * 16) % 2);
      // on a hot streak Mimo leaves a trail of little golden sparkles
      if (S.mult >= 3 && run && Math.random() < 0.55 && particles.length < 900) { V1.copy(r.position).addScaledVector(FM.u, 0.25 + Math.random() * 0.5).addScaledVector(FM.r, (Math.random() - 0.5) * 0.5); particles.push({ x: V1.x, y: V1.y, z: V1.z, vx: 0, vy: 0.4, vz: 0, life: 0, max: 0.45, c: new THREE.Color(Math.random() < 0.5 ? '#FFE38A' : '#FFFFFF'), size: 0.22, grav: -0.5, glow: true, drag: 0 }); }
      const showLift = endShow();
      // blob shadow on the tile below
      const r0 = Math.floor(p.s / ROW), onFloor = floorAt(r0, Math.round(p.laneX)) && S.state !== 'fall';
      mimo.shadow.visible = onFloor && r.visible;
      if (onFloor) { lanePos(FM, p.laneX, 0.02, mimo.shadow.position); mimo.shadow.quaternion.copy(FM.q).multiply(qFlat); const k = clamp(1 - (p.h + showLift) / 5, 0.35, 1); mimo.shadow.scale.setScalar(k * (1 + slideK * 0.2)); mimo.shadow.material.opacity = 0.46 * k; }
      // soap bubble, rescue bubble and fireflies
      const showBubble = p.shield || (S.state === 'fall' && p.fallFrom);
      shieldU.op.value = damp(shieldU.op.value, showBubble ? 1 : 0, 10, dt); shieldU.t.value = worldT; shieldBall.visible = shieldU.op.value > 0.02;
      aura.position.copy(r.position); aura.quaternion.copy(FM.q);
      shieldBall.position.set(0, sliding ? 0.3 : 0.45, 0); shieldBall.scale.setScalar(sliding ? 0.82 : 1);
      const fliesOn = p.magnet > 0 || (S.state === 'fall' && p.fallFrom);
      flies.forEach((f, i) => {
        f.visible = fliesOn && (p.magnet > 1.5 || p.magnet <= 0 || Math.floor(worldT * 8) % 2 === 0);
        const a = worldT * 3.2 + i * 1.047, rr = 0.75 + Math.sin(worldT * 2 + i) * 0.1;
        f.position.set(Math.cos(a) * rr, 0.5 + Math.sin(a * 1.7 + i) * 0.25, Math.sin(a) * rr);
        if (f.visible) { V1.copy(f.position).applyQuaternion(aura.quaternion).add(aura.position); glows.add(V1.x, V1.y, V1.z, cA.set('#EFFF9A'), 0.8, 0.9); }
      });
      // comet ride: rainbow tail and pick-up shock rings
      tailU.op.value = damp(tailU.op.value, (p.boost > 0 || p.fly > 0) && S.state === 'play' ? 1 : 0, 8, dt); tailU.t.value = worldT; tail.visible = tailU.op.value > 0.01;
      tail.position.y = sliding ? 0.25 : 0.42;
      for (const k of shocks) { if (!k.m.visible) continue; k.t += dt; if (k.t >= 0.5) { k.m.visible = false; continue; } const e = k.t / 0.5; k.m.position.copy(r.position).addScaledVector(FM.u, 0.45); k.m.quaternion.copy(FM.q); k.m.scale.setScalar(0.4 + e * 4.2); k.m.material.opacity = (1 - e) * 0.9; }
      // comet ride trail
      if ((p.boost > 0 || p.fly > 0) && S.state === 'play') {
        const hue = (worldT * 1.6) % 1;
        for (let i = 0; i < 2; i++) { V1.copy(r.position).addScaledVector(FM.u, 0.3 + Math.random() * 0.4).addScaledVector(FM.r, (Math.random() - 0.5) * 0.5); particles.length < 900 && particles.push({ x: V1.x, y: V1.y, z: V1.z, vx: 0, vy: 0, vz: 0, life: 0, max: 0.5, c: new THREE.Color().setHSL((hue + i * 0.2) % 1, 0.8, 0.72), size: 0.55, grav: 0, glow: true, drag: 0 }); }
      }
    }
    // the ghost runs its recorded line; the HUD tells how far ahead or behind it is
    const FG = newFrame();
    function ghostIndexAtS(s) { let lo = 0, hi = ghostRun.n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (ghostRun.s[m] < s) lo = m + 1; else hi = m; } return lo; }
    function drawGhost() {
      if (!ghostRun || S.state === 'intro' || S.state === 'count') { ghost.visible = false; S.ghostDelta = null; return; }
      const f = S.time * GHOST.rate, i = Math.min(ghostRun.n - 2, Math.floor(f)), k = clamp(f - i, 0, 1);
      if (i < 0 || f >= ghostRun.n) { ghost.visible = false; } else {
        const gs = lerp(ghostRun.s[i], ghostRun.s[i + 1], k) + 3, gx = lerp(ghostRun.x[i], ghostRun.x[i + 1], k), gh = lerp(ghostRun.h[i], ghostRun.h[i + 1], k);
        frameAt(gs, FG); lanePos(FG, gx, gh, ghost.position); ghost.quaternion.copy(FG.q).multiply(qPi);
        ghost.scale.setScalar(MOVE.scale * funScale()); ghost.position.addScaledVector(FG.u, Math.abs(Math.sin(worldT * 10)) * 0.05 * (gh < 0.05 ? 1 : 0));
        ghost.visible = S.state === 'play' && Math.abs(gs - p.s) > 0.6 && gs - p.s < AHEAD * ROW * 0.6;
      }
      // time difference at Mimo's spot: positive means the ghost was here earlier
      if (S.state === 'play' && p.s > 6) { const j = ghostIndexAtS(p.s - 3); S.ghostDelta = j < ghostRun.n - 1 ? S.time - j / GHOST.rate : null; }
    }
    function drawParticles() {
      puffs.begin();
      for (const q of particles) {
        const k = q.life / q.max, a = (1 - k) * (k < 0.1 ? k * 10 : 1);
        if (q.glow) glows.add(q.x, q.y, q.z, q.c, a, q.size * (1 + k * 0.5)); else puffs.add(q.x, q.y, q.z, q.c, a * 0.9 * (q.al || 1), q.size * (1 + k));
      }
      // sparks flying into Mimo
      const m = mimo.root.position;
      for (const f of flyers) { const k = smooth(f.t); V1.set(lerp(f.x, m.x, k), lerp(f.y, m.y + 0.45, k), lerp(f.z, m.z, k)); glows.add(V1.x, V1.y, V1.z, cA.set(PAL.star), 1 - k * 0.5, 0.7); }
      glows.end(); puffs.end();
    }
    function drawSky(dt) {
      skyGroup.position.copy(cam.position);
      starField.t.value = worldT; aurora.u.t.value = worldT; gateU.t.value = worldT;
      for (const pl of planets) pl.g.rotation.y += pl.spin * dt;
      // meteors streak across now and then
      if (meteors.m.opacity > 0.01) {
        for (let i = 0; i < meteors.n; i++) {
          const st = meteors.st[i]; st.t -= dt;
          if (st.t <= 0) { st.t = 1.6 + Math.random() * 3; st.x = (Math.random() - 0.3) * 500; st.y = 120 + Math.random() * 180; st.z = -260 - Math.random() * 120; st.vx = -140 - Math.random() * 80; st.vy = -70 - Math.random() * 40; }
          st.x += st.vx * dt; st.y += st.vy * dt;
          meteors.pos.set([st.x, st.y, st.z, st.x - st.vx * 0.18, st.y - st.vy * 0.18, st.z], i * 6);
        }
        meteors.g.attributes.position.needsUpdate = true;
      }
      // the gate turns its little stars
      gateStars.forEach((st, i) => { const a = worldT * 0.8 + i * 0.628; st.position.set(Math.cos(a) * 4.1, Math.sin(a) * 4.1, 0); st.rotation.z = -a * 2; });
    }

    // ---------- Camera ----------
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0), goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
    let fovNow = 64;
    const portraitK = () => clamp((1.25 - cam.aspect) / 0.75, 0, 1);
    function cameraGoal() {
      const lx = (p.laneX - 1) * LANE, hh = Math.max(-0.6, p.h) * (1 + 0.6 * clamp((p.h - 1.6) / 1.2, 0, 1));
      if (S.state === 'intro') {
        // swing from Mimo's front round to behind him
        const k = smooth(clamp((S.introT - 0.9) / (INTRO_TIME - 1.3), 0, 1)), th = k * Math.PI;
        frameAt(p.s, FC);
        const dist = lerp(3.6, 5.6, k), hgt = lerp(1.1, 2.5, k);
        goalPos.copy(FC.p).addScaledVector(FC.t, Math.cos(th) * dist).addScaledVector(FC.r, Math.sin(th) * dist * 0.8).addScaledVector(FC.u, hgt);
        frameAt(p.s + 7 * k, FL); goalLook.copy(FL.p).addScaledVector(FC.u, lerp(0.6, 0.9, k));
        camUp.copy(FC.u); return;
      }
      if (S.state === 'win' || S.state === 'over') {
        const k = smooth(clamp((S.endT - 0.35) / 1.3, 0, 1)), th = k * Math.PI, dist = lerp(4.6, 3.6, k);
        frameAt(p.s, FC);
        goalPos.copy(FC.p).addScaledVector(FC.r, lx + Math.sin(th) * dist * 0.75).addScaledVector(FC.t, -Math.cos(th) * dist).addScaledVector(FC.u, lerp(2.1, 1.2, k));
        goalLook.copy(FC.p).addScaledVector(FC.r, lx).addScaledVector(FC.u, lerp(0.85, 0.05, k));
        camUp.copy(FC.u); return;
      }
      // an upright phone sees less to the sides: the camera steps back and up so the lanes and the track ahead still fit
      const pk = portraitK();
      frameAt(p.s - 4.9 - 1.4 * pk, FC); frameAt(p.s + 8, FL);
      goalPos.copy(FC.p).addScaledVector(FC.r, lx * 0.6 * (1 - pk * 0.5)).addScaledVector(FC.u, 2.75 + 0.9 * pk + hh * 0.5);
      goalLook.copy(FL.p).addScaledVector(FL.r, lx * 0.35).addScaledVector(FL.u, 0.1 + hh * 0.6);
      camUp.copy(FC.u); if (!reduced()) camUp.applyAxisAngle(FC.t, clamp((p.lane - p.laneX) * 0.06, -0.05, 0.05));
    }
    function snapCamera() { frameAt(p.s, FM); cameraGoal(); camPos.copy(goalPos); camLook.copy(goalLook); cam.position.copy(camPos); cam.up.copy(camUp); cam.lookAt(camLook); }
    function stepCamera(dt) {
      cameraGoal();
      const rate = S.state === 'intro' ? 6 : 12;
      camPos.x = damp(camPos.x, goalPos.x, rate, dt); camPos.y = damp(camPos.y, goalPos.y, rate * 0.8, dt); camPos.z = damp(camPos.z, goalPos.z, rate * 1.4, dt);
      camLook.x = damp(camLook.x, goalLook.x, rate, dt); camLook.y = damp(camLook.y, goalLook.y, rate, dt); camLook.z = damp(camLook.z, goalLook.z, rate * 1.4, dt);
      cam.position.copy(camPos);
      if (S.shake > 0 && !reduced()) cam.position.add(V1.set((Math.random() - 0.5) * S.shake * 0.35, (Math.random() - 0.5) * S.shake * 0.3, 0));
      cam.up.lerp(camUp, 1 - Math.exp(-6 * dt)).normalize();
      cam.lookAt(camLook);
      S.fovKick = damp(S.fovKick || 0, 0, 4, dt);
      const speedK = clamp((p.v - 12) / 12, 0, 1), fov = (reduced() ? 64 : 62 + speedK * 8 + (p.boost > 0 || p.fly > 0 ? 9 : 0) + S.fovKick) + portraitK() * 8;
      fovNow = damp(fovNow, fov, 4, dt);
      if (Math.abs(cam.fov - fovNow) > 0.05) { cam.fov = fovNow; cam.updateProjectionMatrix(); }
    }
    // speed lines near the camera when it gets fast
    const speedLines = (() => {
      const n = 36, pos = new Float32Array(n * 6), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
      const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.renderOrder = 8; cam.add(ls);
      const st = []; for (let i = 0; i < n; i++) { const a = hash(i, 21) * Math.PI * 2, rr = 1.2 + hash(i, 22) * 1.6; st.push({ x: Math.cos(a) * rr * 1.6, y: Math.sin(a) * rr, z: -2 - hash(i, 23) * 10 }); }
      return { pos, g, m, st, n };
    })();
    function stepSpeedLines(dt) {
      const k = reduced() ? 0 : clamp((p.v - 15) / 8, 0, 1) * 0.35 + (p.boost > 0 ? 0.5 : 0);
      speedLines.m.opacity = damp(speedLines.m.opacity, S.state === 'play' ? k : 0, 6, dt);
      if (speedLines.m.opacity < 0.01) return;
      for (let i = 0; i < speedLines.n; i++) {
        const st = speedLines.st[i]; st.z += p.v * dt * 1.6; if (st.z > -0.6) st.z -= 11;
        speedLines.pos.set([st.x, st.y, st.z, st.x, st.y, st.z - 0.6 - p.v * 0.05], i * 6);
      }
      speedLines.g.attributes.position.needsUpdate = true;
    }

    // ---------- HUD for the page ----------
    function hud(force) {
      S.hudT--; if (!force && S.hudT > 0) return; S.hudT = 8;
      if (!host.onHud) return;
      const prog = opts.mode === 'course' && finishRow > 0 ? clamp(p.s / rowS(finishRow), 0, 1) : null;
      host.onHud({ mode: opts.mode, score: S.score, mult: S.mult, comboK: S.mult >= MULT_MAX ? 1 : (S.combo % COMBO_STEP) / COMBO_STEP, stars: S.stars, total: STAR_TOTAL, hearts: S.hearts, maxHearts: UPG.hearts, dist: Math.round(p.s), progress: prog, letters: S.letterMask, fly: p.fly > 0, ghost: S.ghostDelta == null ? null : Math.round(S.ghostDelta * 10) / 10, daily: !!opts.daily, zones: zoneStart.map((r) => (finishRow > 0 ? (r * ROW) / rowS(finishRow) : 0)), boost: p.boost / UPG.boost, magnet: p.magnet / UPG.magnet, shield: p.shield, state: S.state });
    }

    // while the phone turns the size changes from frame to frame: the camera follows at once (cheap), the buffers once the size holds
    const resizing = { w: 0, h: 0, t: 0, done: false };
    function resize() {
      const w = canvas.clientWidth || host.anchor.clientWidth, h = canvas.clientHeight || host.anchor.clientHeight;
      if (!w || !h) return;
      const pr = renderer.getPixelRatio();
      if (Math.abs(cam.aspect - w / h) > 1e-4) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) {
        const now = performance.now();
        if (resizing.w !== w || resizing.h !== h) Object.assign(resizing, { w, h, t: now });
        if (!resizing.done || now - resizing.t >= RESIZE_SETTLE_MS) { renderer.setSize(w, h, false); resizing.done = true; }
      }
      scaleU.value = (canvas.height || h * pr) / (2 * Math.tan((cam.fov * Math.PI) / 360));
    }
    // ---------- Glow pass ----------
    const glowFx = (() => {
      const opt = { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false };
      const rtA = new THREE.WebGLRenderTarget(4, 4, { ...opt, depthBuffer: true }), rtB = new THREE.WebGLRenderTarget(4, 4, opt), rtC = new THREE.WebGLRenderTarget(4, 4, opt), rtE = new THREE.WebGLRenderTarget(4, 4, opt), rtD = new THREE.WebGLRenderTarget(4, 4, opt);
      const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      const quad = new THREE.Mesh(tri); quad.frustumCulled = false; const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.Camera();
      const VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VERT, depthTest: false, depthWrite: false, toneMapped: false,
        fragmentShader: 'uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270; c += (texture2D(tSrc, vUv + uDir * 1.3846153).rgb + texture2D(tSrc, vUv - uDir * 1.3846153).rgb) * 0.3162162; c += (texture2D(tSrc, vUv + uDir * 3.2307692).rgb + texture2D(tSrc, vUv - uDir * 3.2307692).rgb) * 0.0702703; gl_FragColor = vec4(c, 1.0); }' });
      const addMat = new THREE.ShaderMaterial({ uniforms: { tA: { value: rtC.texture }, tB: { value: rtD.texture }, uK: { value: GLOW.strength } }, vertexShader: VERT, depthTest: false, depthWrite: false, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending,
        fragmentShader: 'uniform sampler2D tA; uniform sampler2D tB; uniform float uK; varying vec2 vUv; void main(){ vec3 c = (texture2D(tA, vUv).rgb * 0.55 + texture2D(tB, vUv).rgb * 0.75) * uK; gl_FragColor = vec4(c, 1.0); }' });
      const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
      const black = new THREE.Color(0, 0, 0), keepClear = new THREE.Color();
      let w = 0, h = 0;
      function size() {
        const W = canvas.width, H = canvas.height, qw = Math.max(2, W >> 2), qh = Math.max(2, H >> 2);
        if (qw === w && qh === h) return; w = qw; h = qh;
        rtA.setSize(qw, qh); rtB.setSize(qw, qh); rtC.setSize(qw, qh); rtE.setSize(qw >> 1 || 1, qh >> 1 || 1); rtD.setSize(qw >> 1 || 1, qh >> 1 || 1);
      }
      function blur(src, dst, x, y) { blurMat.uniforms.tSrc.value = src.texture; blurMat.uniforms.uDir.value.set(x / dst.width, y / dst.height); quad.material = blurMat; renderer.setRenderTarget(dst); renderer.render(qScene, qCam); }
      // which objects shine and which block the shine
      const shine = (o) => o && o.traverse((c) => c.layers.enable(GLOW.layer));
      const block = (o) => o && o.traverse((c) => c.layers.enable(GLOW.occ));
      [sparks, bigStars, starRings, caps, decos, padArrows, warns, tail, gate, sunDisc, ...letterMeshes, ...shocks.map((k) => k.m)].forEach(shine);
      for (const k of Object.keys(pools)) pools[k].forEach((it) => shine(it.g));
      comets.forEach((c) => shine(c.g));
      scene.children.filter((o) => o.isPoints && o.material && o.material.blending === THREE.AdditiveBlending).forEach(shine);
      [tiles, towers, bushes, crystals, mimo.torso].forEach(block);
      return {
        on: true,
        render() {
          size();
          renderer.getClearColor(keepClear); const keepA = renderer.getClearAlpha();
          renderer.setRenderTarget(rtA); renderer.setClearColor(black, 1); renderer.clear();
          cam.layers.set(GLOW.occ); scene.overrideMaterial = occMat; renderer.render(scene, cam); scene.overrideMaterial = null;
          const auto = renderer.autoClear; renderer.autoClear = false; cam.layers.set(GLOW.layer); scaleU.value *= 0.25; renderer.render(scene, cam); scaleU.value *= 4; cam.layers.set(0);
          renderer.autoClear = auto;
          blur(rtA, rtB, 1, 0); blur(rtB, rtC, 0, 1); blur(rtC, rtE, 1, 0); blur(rtE, rtD, 0, 1);
          renderer.setRenderTarget(null); renderer.setClearColor(keepClear, keepA);
          quad.material = addMat; renderer.autoClear = false; renderer.render(qScene, qCam); renderer.autoClear = auto;
        },
        dispose() { [rtA, rtB, rtC, rtD, rtE].forEach((t) => t.dispose()); [blurMat, addMat, occMat].forEach((m) => m.dispose()); tri.dispose(); },
      };
    })();
    // a simple governor: frames slower than the budget for a while first cost the glow, then resolution
    const quality = { ema: 16, slowT: 0, step: 0, last: 0 };
    function governor() {
      const now = performance.now(), d = now - quality.last; quality.last = now;
      if (d <= 0 || d > 250 || S.state !== 'play') return;
      quality.ema += (d - quality.ema) * 0.05;
      quality.slowT = quality.ema > (quality.step ? QUALITY.verySlowMs : QUALITY.slowMs) ? quality.slowT + d / 1000 : 0;
      if (quality.slowT < QUALITY.holdS || quality.step >= QUALITY.ratios.length) return;
      quality.slowT = 0; quality.ema = 16; quality.step++;
      if (quality.step === 1) glowFx.on = false;
      else { renderer.setPixelRatio(Math.min(QUALITY.ratios[quality.step - 1], window.devicePixelRatio || 1)); resize(); }
    }
    function render() {
      const dt = Math.min(0.1, S.visDt); S.visDt = 0; renderer.info.reset();
      resize();
      setZoneLook(zoneFloat(), false);
      const ez = Math.round(clamp(look.zf, 0, 3)) % ZONES.length; if (ez !== envZone) { envZone = ez; scene.environment = envMaps[ez].texture; }
      syncMimo(dt); stepCamera(dt); drawSky(dt); stepSpeedLines(dt);
      drawTrack(); drawScenery(); drawGhost(); drawParticles();
      renderer.render(scene, cam); S.mainCalls = renderer.info.render.calls;
      if (glowFx.on) glowFx.render();
      governor();
    }
    function dispose() {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } } });
      glowFx.dispose(); K.dispose(); inlayTex.dispose(); arrowTex.dispose(); beamTex.dispose(); envMaps.forEach((e) => e.dispose()); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    }

    opts.invincible = !!host.invincible;
    resetState(host.mode || 'course', !!host.quick);
    return {
      update, render, dispose, resize,
      restart(mode, quick) { if (mode) opts.mode = mode; resetState(opts.mode, quick !== false); },
      setInvincible(v) { opts.invincible = !!v; },
      piep() { if (S.state !== 'play') return; p.piepT = 0.35; p.sq = -0.2; lanePos(FM, p.laneX, p.h + 0.9, V1); burst(V1, 10, [PAL.star, '#FFFFFF'], 2.4, { up: 1.5, grav: 3, life: 0.6, size: 0.25 }); },
      get state() { return S.state; },
      get mode() { return opts.mode; },
      dbg: { p, S, sheepLane, scene, cam, mimo, aura, sparks, bigStars, frameAt, newFrame, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, glow: glowFx.on, step: quality.step, main: S.mainCalls }), glowFx, holdQuality(on) { quality.step = 99; glowFx.on = !!on; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); resize(); }, get worldT() { return worldT; }, rows: () => rows, finishRow: () => finishRow, ROW, LANE, PH, CHUNKS, COURSE, rowS, act, skipIntro() { S.introT = INTRO_TIME; }, teleport(s) { p.s = s; snapCamera(); }, zoneStart: () => zoneStart },
    };
  }

  window.Run3D = { create, STAR_TOTAL, ZONES: ZONES.map((z) => z.name) };
})();
