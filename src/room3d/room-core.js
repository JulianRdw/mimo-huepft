/* Mimo hüpft · Kinderzimmer (3D) · core
   Renderer, physics, camera rail and Mimo's animation. Needs THREE (r160), Mimo3D and the other
   room-*.js files. The host object is the same kind the Himmelsinseln use, see create(). */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // Physics in world units, same feel as the Himmelsinseln, plus stepping up small edges and gliding
  // Quicker on his feet than in the Himmelsinseln, because the room is huge: faster run, snappier start and
  // stop, and a jump of the same height (2.3) that comes down faster than it goes up.
  const PH = { GRAV: 42, FALL_MULT: 1.3, MAX_FALL: 26, RUN: 7.4, ACC: 70, AIR_ACC: 42, JUMP: 13.9, JUMP_CUT: 0.45, COYOTE: 0.1, BUFFER: 0.13, BOUNCE: 19.5, R: 0.32, H: 0.82, STEP_UP: 0.3, GLIDE_FALL: 3.3, GLIDE_RUN: 8.2, GLIDE_EASE: 14, TURN: 16 };
  const STEP = 1 / 120, MAX_FRAME = 0.1;
  const FOV = 48, FOV_TALL = 62;
  // If frames stay slower than `slow` for `window` seconds, the picture gets coarser step by step; last step: no sun shadows
  // gain: a step must make frames at least this much shorter, otherwise it is taken back
  const QUALITY = { slow: 1 / 42, window: 2.5, ratios: [2, 1.5, 1.25, 1], smoothing: 0.05, gain: 0.9 };
  // Phones start one step lower and with a smaller shadow map
  const SMALL_SCREEN = 500, SMALL_RATIO = 1.5, SHADOW_MAP = 2048, SHADOW_MAP_SMALL = 1024;
  const DEATH_TIME = 0.9, WIN_TIME = 1.8;
  const FLAG_R = 1.6, STAR_R = 0.95, CAP_R = 1.1, GOAL_R = 1.3, SECRET_R = 1.2;
  const FLOOR_HINT_Y = 0.3;               // below this Mimo counts as "fell down to the floor"

  const { clamp, lerp, damp, angDiff } = Room3D.util;

  function create(host) {
    const THREE = window.THREE;
    if (!THREE) throw new Error('THREE missing');
    const input = host.input, PAL = Room3D.PAL;
    const sfx = new Proxy(host.sfx || {}, { get: (o, key) => (typeof o[key] === 'function' ? o[key].bind(o) : () => {}) });
    const reduced = () => !!(host.reduced && host.reduced());

    // ---------- Renderer, scene, camera, light ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const small = Math.min(window.screen.width, window.screen.height) <= SMALL_SCREEN;
    const startRatio = Math.min(small ? SMALL_RATIO : QUALITY.ratios[0], window.devicePixelRatio || 1);
    renderer.setPixelRatio(startRatio);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const canvas = renderer.domElement; canvas.className = 'room3d'; host.anchor.after(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.haze);
    scene.fog = new THREE.Fog(new THREE.Color(PAL.haze), 42, 200);
    const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 340);
    const hemi = new THREE.HemisphereLight(new THREE.Color('#FFF3DC'), new THREE.Color('#B48A62'), 1.1);
    const sun = new THREE.DirectionalLight(new THREE.Color('#FFDDB0'), 2.2);
    sun.castShadow = true; sun.shadow.mapSize.setScalar(small ? SHADOW_MAP_SMALL : SHADOW_MAP);
    Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 90 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035;
    scene.add(hemi, sun, sun.target);
    const SUN = new THREE.Vector3(...Room3D.SUN_DIR).normalize();

    const kit = Room3D.makeKit(THREE, scene, renderer, { emblem: host.emblem || null });
    const props = Room3D.makeProps(THREE, kit);

    // ---------- Colliders (boxes and upright cylinders) ----------
    const cols = [];
    function addBox(x, y0, y1, z, hx, hz, opts) {
      const c = Object.assign({ type: 'box', x, y: (y0 + y1) / 2, z, hx, hy: (y1 - y0) / 2, hz, top: y1, bottom: y0, kind: 'solid', dx: 0, dy: 0, dz: 0 }, opts || {});
      cols.push(c); return c;
    }
    function addCyl(x, z, r, top, bottom, opts) {
      const c = Object.assign({ type: 'cyl', x, z, r, top, bottom, kind: 'solid', dx: 0, dy: 0, dz: 0 }, opts || {});
      cols.push(c); return c;
    }
    function placeCollider(c, x, y, z) {
      c.dx += x - c.x; c.dz += z - c.z; c.x = x; c.z = z;
      if (c.type === 'box') { c.dy += y - c.y; c.y = y; c.top = y + c.hy; c.bottom = y - c.hy; }
      else { const h = c.top - c.bottom; c.dy += y - c.top; c.top = y; c.bottom = y - h; }
    }
    function supports(c, x, z, margin) {
      if (c.type === 'cyl') { const dx = x - c.x, dz = z - c.z; return dx * dx + dz * dz <= (c.r + margin) * (c.r + margin); }
      return Math.abs(x - c.x) <= c.hx + margin && Math.abs(z - c.z) <= c.hz + margin;
    }
    // Pushes the player out sideways; returns the push normal or null. Low edges are stepped up instead.
    function pushOut(c, pl) {
      if (c.off) return null;
      const stepUp = c.kind === 'hit' ? 0.04 : PH.STEP_UP;
      if (pl.y >= c.top - stepUp || pl.y + PH.H <= c.bottom + 0.02) return null;
      const R = PH.R;
      if (c.type === 'cyl') {
        const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), min = c.r + R;
        if (d >= min) return null;
        const nx = d > 1e-6 ? dx / d : 0, nz = d > 1e-6 ? dz / d : 1;
        pl.x = c.x + nx * min; pl.z = c.z + nz * min; return [nx, nz];
      }
      const lx = pl.x - c.x, lz = pl.z - c.z;
      const ox = lx - clamp(lx, -c.hx, c.hx), oz = lz - clamp(lz, -c.hz, c.hz), d2 = ox * ox + oz * oz;
      if (d2 >= R * R) return null;
      let nx, nz;
      if (d2 > 1e-10) { const d = Math.sqrt(d2); nx = ox / d; nz = oz / d; pl.x += nx * (R - d); pl.z += nz * (R - d); }
      else if (c.hx - Math.abs(lx) < c.hz - Math.abs(lz)) { nx = Math.sign(lx) || 1; nz = 0; pl.x = c.x + nx * (c.hx + R); }
      else { nx = 0; nz = Math.sign(lz) || 1; pl.z = c.z + nz * (c.hz + R); }
      return [nx, nz];
    }
    function groundBelow(x, z, fromY) {
      let best = -Infinity;
      for (const c of cols) if (!c.off && c.kind !== 'hit' && c.top <= fromY + 0.05 && c.top > best && supports(c, x, z, 0)) best = c.top;
      return best;
    }

    // Big furniture as plain boxes: the camera is pulled towards Mimo until it is outside all of them
    const camBlocks = [];
    function addCamBlock(x0, x1, y0, y1, z0, z1) { camBlocks.push({ x0, x1, y0, y1, z0, z1 }); }
    const insideBlock = (v) => camBlocks.some((b) => v.x > b.x0 && v.x < b.x1 && v.y > b.y0 && v.y < b.y1 && v.z > b.z0 && v.z < b.z1);

    // ---------- World ----------
    const ROOM = Room3D.ROOM, world = { addBox, addCyl, addCamBlock, placeCollider, root: scene, cols };
    addBox((ROOM.x0 + ROOM.x1) / 2, -4, 0, (ROOM.z0 + ROOM.z1) / 2, 200, 200);
    const decor = Room3D.makeDecor(THREE, kit, world), decorApi = decor.build(scene);
    Room3D.makeDesk(THREE, kit, world).build(scene);
    const level = Room3D.buildLevel(THREE, kit, props, world);
    const mood = Room3D.makeMood(THREE, { scene, hemi, sun, decorApi, kit, nightLightAt: decorApi.nightLightAt });
    const TOTAL_STARS = level.stars.length, TOTAL_SECRETS = level.secrets.length;
    let foundSecrets = Array.isArray(host.secrets) ? host.secrets.slice() : [];
    // stickers for the album: kept by the host across visits, like the secrets
    let stickers = Array.isArray(host.stickers) ? host.stickers.filter((s) => typeof s === 'string') : [];
    // what the side missions keep across visits (records, found buttons): plain values under a key, stored by the host
    let keep = host.keep && typeof host.keep === 'object' && !Array.isArray(host.keep) ? Object.assign({}, host.keep) : {};

    // ---------- Mimo ----------
    const mimo = window.Mimo3D.build(THREE, Object.assign({}, kit, { scene, outfit: host.outfit }));
    mimo.root.traverse((o) => { if (o.isMesh && o.material.side !== THREE.BackSide && !o.material.transparent) o.castShadow = true; });
    for (const m of [mimo.skin, mimo.skinDark]) m.envMapIntensity = 0.3;
    const headCap = props.propCap(); headCap.root.position.y = 0.685; headCap.root.visible = false; mimo.body.add(headCap.root);
    // Landing ring: in the air a thin ring round the blob shadow marks the spot right below Mimo,
    // so a jump can be judged from any camera angle. It fades in from LAND.from units above the ground.
    const LAND = { from: 0.6, full: 2.2, alpha: 0.6, shadow: 0.36 };
    const landRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 36), new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0, depthWrite: false }));
    landRing.rotation.x = -Math.PI / 2; landRing.renderOrder = 2; landRing.visible = false; scene.add(landRing);

    // ---------- Particles ----------
    const parts = [], partPool = [], partGeo = new THREE.SphereGeometry(1, 8, 6);
    function burst(x, y, z, n, colors, speed, opt) {
      const o = Object.assign({ grav: 9, life: 0.7, size: 0.07, up: 2 }, opt || {}), count = reduced() ? Math.ceil(n / 3) : n, list = Array.isArray(colors) ? colors : [colors];
      for (let i = 0; i < count; i++) {
        const m = partPool.pop() || new THREE.Mesh(partGeo, kit.basic(list[0]));
        m.material = kit.basic(list[i % list.length]); m.position.set(x, y, z); m.visible = true; scene.add(m);
        const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1, s = speed * (0.4 + Math.random() * 0.6);
        parts.push({ m, vx: Math.cos(a) * s * e, vy: o.up + Math.random() * speed * 0.8, vz: Math.sin(a) * s * e, life: 0, max: o.life * (0.6 + Math.random() * 0.6), size: o.size * (0.6 + Math.random() * 0.8), grav: o.grav });
      }
    }
    function stepParticles(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]; q.life += dt;
        if (q.life >= q.max) { q.m.visible = false; scene.remove(q.m); partPool.push(q.m); parts.splice(i, 1); continue; }
        q.vy -= q.grav * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt; q.m.position.z += q.vz * dt;
        q.m.scale.setScalar(q.size * (1 - q.life / q.max));
      }
    }

    // ---------- State ----------
    const S = { state: 'intro', t: 0, time: 0, clockOn: false, stars: 0, attempts: 1, respawn: level.start, section: 0, focusY: 0, hasCap: false, won: false, floorHint: false };
    const p = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI, faceYaw: Math.PI, grounded: false, ground: null, coyote: 0, buffer: 0, jumping: false, gliding: false, glide: 0, extX: 0, extZ: 0, invuln: 0, sq: 0, walkT: 0, blink: 2, idle: 0 };
    let worldT = 0, hudKey = '';
    function placePlayer(at) {
      Object.assign(p, { x: at[0], y: at[1], z: at[2], vx: 0, vy: 0, vz: 0, grounded: false, ground: null, coyote: 0, buffer: 0, jumping: false, gliding: false, invuln: 0.6 });
      S.focusY = at[1]; mimo.root.visible = true;
    }
    function restart(skipIntro) {
      level.reset(foundSecrets);
      shot = null; shotK = 0;
      Object.assign(S,{ state: skipIntro ? 'play' : 'intro', t: 0, time: 0, clockOn: false, stars: 0, attempts: 1, respawn: level.start, section: 0, hasCap: false, won: false, floorHint: false });
      world.mood = null; if (story) story.reset(); mood.step(0, moodName(), p); if (host.onBoss) host.onBoss(null);
      placePlayer(level.start); p.yaw = p.faceYaw = Math.PI; camera.snap();
      // whoever had found every secret before this sticker existed gets it now
      if (TOTAL_SECRETS && level.secrets.every((one) => one.got)) world.sticker('secrets');
    }
    // Back to the last flag at once, for when Mimo fell down to the floor
    function toFlag() {
      if (S.state !== 'play') return;
      burst(p.x, p.y + 0.4, p.z, 10, PAL.white, 2.4, { life: 0.5 });
      placePlayer(S.respawn); p.yaw = p.faceYaw; camera.snap(); sfx.flag();
      burst(p.x, p.y + 0.4, p.z, 10, [PAL.gold, PAL.white], 2.4, { life: 0.5 });
    }
    function die() {
      if (S.state !== 'play') return;
      S.state = 'dead'; S.t = 0; sfx.hurt(); sfx.oh();
      burst(p.x, p.y + 0.4, p.z, 18, ['#' + mimo.skin.color.getHexString(), PAL.white], 4, { life: 0.8 });
      mimo.root.visible = false;
      if (host.onDeath) host.onDeath();
    }

    // ---------- Player ----------
    function stepPlayer(dt) {
      const g = p.grounded ? p.ground : null;
      if (g) { p.x += g.dx; p.y += g.dy; p.z += g.dz; }
      // the stick is read relative to the camera: up always means "away from the camera"
      let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0) + (input.ax || 0), iy = (input.down ? 1 : 0) - (input.up ? 1 : 0) + (input.ay || 0);
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      if (S.state !== 'play') ix = iy = 0;
      const ctrlYaw = camera.controlYaw(ix, iy), sn = Math.sin(ctrlYaw), cs = Math.cos(ctrlYaw);
      let mx = ix * cs - iy * sn, mz = ix * sn + iy * cs;
      // something Mimo rides may take the stick (Schlürfi after the fight): Mimo then only looks where it goes
      if (world.steer && S.state === 'play' && world.steer(mx, mz, dt)) { if (Math.hypot(mx, mz) > 0.2) p.faceYaw = Math.atan2(mx, mz); mx = mz = 0; }
      p.invuln = Math.max(0, p.invuln - dt);
      p.gliding = S.hasCap && !p.grounded && !!input.jumpHeld && p.vy < 0 && S.state === 'play';
      const run = p.gliding ? PH.GLIDE_RUN : PH.RUN, acc = (p.grounded ? PH.ACC : PH.AIR_ACC) * dt;
      let ddx = mx * run - p.vx, ddz = mz * run - p.vz; const dl = Math.hypot(ddx, ddz);
      if (dl > acc) { ddx *= acc / dl; ddz *= acc / dl; }
      p.vx += ddx; p.vz += ddz;
      if (Math.hypot(mx, mz) > 0.2) { p.faceYaw = Math.atan2(mx, mz); p.idle = 0; S.clockOn = true; } else if (p.grounded) p.idle += dt;
      if (input.jumpQueued) { input.jumpQueued = false; if (S.state === 'play') p.buffer = PH.BUFFER; } else p.buffer = Math.max(0, p.buffer - dt);
      if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
        p.vy = PH.JUMP; p.buffer = 0; p.coyote = 0; p.grounded = false; p.ground = null; p.jumping = true; p.sq = 0.2; p.idle = 0; S.clockOn = true;
        sfx.jump(); sfx.hup(); burst(p.x, p.y + 0.05, p.z, 5, PAL.white, 1.6, { up: 0.6, grav: 3, life: 0.4 });
      }
      if (p.jumping && !input.jumpHeld && p.vy > 0) { p.vy *= PH.JUMP_CUT; p.jumping = false; }
      if (p.vy <= 0) p.jumping = false;
      // gliding holds one calm sink rate: a fast fall is braked down to it, a slow one never gets past it
      if (!p.gliding) p.vy = Math.max(-PH.MAX_FALL, p.vy - PH.GRAV * (p.vy < 0 ? PH.FALL_MULT : 1) * dt);
      else if (p.vy < -PH.GLIDE_FALL) p.vy = damp(p.vy, -PH.GLIDE_FALL, PH.GLIDE_EASE, dt);
      else p.vy = Math.max(-PH.GLIDE_FALL, p.vy - PH.GRAV * dt);
      p.x += (p.vx + p.extX) * dt; p.z += (p.vz + p.extZ) * dt;
      const b = level.bounds;
      if (p.x < b.x0 || p.x > b.x1) { p.x = clamp(p.x, b.x0, b.x1); p.vx = 0; }
      if (p.z < b.z0 || p.z > b.z1) { p.z = clamp(p.z, b.z0, b.z1); p.vz = 0; }
      let hit = false;
      for (const c of cols) {
        const n = pushOut(c, p); if (!n) continue;
        if (c.kind === 'hit') { hit = true; continue; }
        const vn = p.vx * n[0] + p.vz * n[1]; if (vn < 0) { p.vx -= n[0] * vn; p.vz -= n[1] * vn; }
      }
      const prevY = p.y; p.y += p.vy * dt;
      let landed = null;
      for (const c of cols) {
        if (c.off) continue;
        if (p.vy <= 0) {
          const reach = c.kind === 'hit' ? 0.05 : PH.STEP_UP;
          if (prevY >= c.top - reach - Math.max(0, c.dy) && p.y <= c.top && supports(c, p.x, p.z, PH.R * 0.55) && (!landed || c.top > landed.top)) landed = c;
        } else if (prevY + PH.H <= c.bottom + 0.05 && p.y + PH.H > c.bottom && supports(c, p.x, p.z, PH.R * 0.4)) { p.y = c.bottom - PH.H; p.vy = 0; p.jumping = false; }
      }
      const wasGrounded = p.grounded;
      if (landed) {
        const impact = -p.vy;
        p.y = landed.top; p.vy = 0; p.grounded = true; p.ground = landed; p.coyote = PH.COYOTE;
        if (landed.kind === 'hit') hit = true;
        if (landed.kind === 'bounce') { p.vy = landed.bounce || PH.BOUNCE; p.grounded = false; p.ground = null; p.jumping = false; p.sq = 0.3; sfx.bounce(); burst(p.x, p.y, p.z, 10, [PAL.white, PAL.gold], 3); if (landed.onBounce) landed.onBounce(); }
        if (!wasGrounded && impact > 6) { p.sq = -Math.min(0.28, impact / 60); p.landKick = Math.min(1.5, impact / 12); sfx.land(); burst(p.x, p.y + 0.05, p.z, 6, PAL.white, 1.8, { up: 0.5, grav: 3, life: 0.4 }); }
      } else { p.grounded = false; p.ground = null; p.coyote = Math.max(0, p.coyote - dt); }
      if (hit && p.invuln <= 0) die();
    }

    // ---------- Gameplay checks ----------
    const near = (pos, r, dy) => { const dx = p.x - pos[0], ddy = p.y + 0.4 - pos[1] - (dy || 0), dz = p.z - pos[2]; return dx * dx + ddy * ddy + dz * dz < r * r; };
    function checks() {
      for (const s of level.stars) if (!s.got && near(s.pos, STAR_R)) { s.got = true; S.stars++; sfx.star(); burst(s.pos[0], s.pos[1], s.pos[2], 12, [PAL.gold, PAL.white], 3, { life: 0.6 }); p.mood = 'happy'; p.moodT = 0.7; }
      for (const f of level.flags) if (!f.on && near(f.pos, FLAG_R, 0.4)) { f.on = true; S.respawn = f.pos; S.section = Math.max(S.section, f.section); f.cloth.material.color.set('#' + mimo.skin.color.getHexString()); sfx.flag(); burst(f.pos[0], f.pos[1] + 1.3, f.pos[2], 10, [PAL.gold, PAL.white], 2.4); }
      level.secrets.forEach((s, i) => {
        if (s.got || !near(s.pos, SECRET_R)) return;
        s.got = true; foundSecrets = foundSecrets.concat(i); sfx.yay(); p.mood = 'happy'; p.moodT = 1.4;
        burst(s.pos[0], s.pos[1], s.pos[2], 30, [PAL.gold, PAL.white], 4.2, { life: 1.1, up: 3 });
        if (host.onSecret) host.onSecret(foundSecrets.slice());
        if (host.onHint) host.onHint('Geheimnis gefunden! ' + foundSecrets.length + ' von ' + TOTAL_SECRETS + '.');
        if (level.secrets.every((one) => one.got)) world.sticker('secrets');
      });
      if (!S.floorHint && S.respawn !== level.start && p.grounded && p.y < FLOOR_HINT_Y && !(world.arena && world.arena.inside(p))) {
        S.floorHint = true; if (host.onHint) host.onHint('Runtergefallen? Mit <b>Zur Fahne</b> springst du zurück zur letzten Fahne.');
      }
      const c = level.cap;
      if (c && !c.got && near(c.pos, CAP_R)) {
        c.got = true; S.hasCap = true;
        sfx.yay(); burst(c.pos[0], c.pos[1], c.pos[2], 22, kit.TOY_COLORS, 3.4, { life: 0.9 }); p.mood = 'happy'; p.moodT = 1.2;
        if (host.onHint) host.onHint('Propellermütze! Halte <b>Springen</b> gedrückt, dann schwebt Mimo.');
      }
      if (level.goal.active && p.grounded && near(level.goal.pos, GOAL_R)) win();
    }
    function win() {
      if (S.state !== 'play') return;
      S.state = 'win'; S.t = 0; sfx.win(); p.mood = 'happy'; p.moodT = 9;
      burst(p.x, p.y + 1.2, p.z, 40, kit.TOY_COLORS.concat(PAL.gold), 5, { life: 1.3, up: 4 });
    }

    // ---------- Camera (rail on the main way, explorer camera elsewhere) ----------
    const camera = Room3D.makeCamera(THREE, { p, S, PH, level, camBlocks });
    // What a section may use while the game runs (see README.md)
    Object.assign(world, {
      p, S, input, PH, burst, sfx, die, win, mood: null,
      hint: (html) => { if (host.onHint) host.onHint(html); },
      boss: (info) => { if (host.onBoss) host.onBoss(info); },
      camYaw: () => camera.yaw(), time: () => worldT,
      talk: (line) => { if (host.onTalk) host.onTalk(line); },
      say: (line) => { if (host.onSay) host.onSay(line); },
      race: (info) => { if (host.onRace) host.onRace(info); },                 // the clock of a timed side game ({ big, small, hurry }), or null
      medal: (info) => { if (host.onMedal) host.onMedal(info); },              // a new best in a side game: { id, medal (0 to 3), value }
      collect: (info) => { if (host.onCollect) host.onCollect(info); },        // a counter of things found all over the room: { id, n, of }
      keep: { get: (key) => keep[key], set: (key, value) => { keep = Object.assign({}, keep, { [key]: value }); if (host.onKeep) host.onKeep(key, value, Object.assign({}, keep)); } },
      sticker: (id) => { if (stickers.includes(id)) return; stickers = stickers.concat(id); if (host.onSticker) host.onSticker(id, stickers.slice()); },     // a short line of a figure while the game runs: { who, face, at, text }
      mission: (info) => { if (host.onMission) host.onMission(info); },
      face: (pos) => camera.face(pos[0], pos[2]),
      shot: (s) => { if (s && !shot && shotK < 0.01) { shotPos.copy(viewPos); shotLook.copy(viewLook); } shot = s; },
    });
    // Camera shots of the story's scenes: the view glides to the shot and back to the game camera
    const SHOT = { move: 2.2, blend: 2.6 };
    let shot = null, shotK = 0;
    const shotPos = new THREE.Vector3(), shotLook = new THREE.Vector3(), viewPos = new THREE.Vector3(), viewLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
    const story = Room3D.makeStory ? Room3D.makeStory(THREE, kit, props, world, level) : null;
    const moodName = () => world.mood || (story ? story.mood() : level.sections[Math.min(S.section, level.sections.length - 1)].mood);
    let camOverride = null;

    // ---------- Visual sync ----------
    function syncMimo(dt) {
      const r = mimo.root, LEG = mimo.LEG, BS = mimo.BS;
      r.position.set(p.x, p.y, p.z);
      p.yaw += angDiff(p.yaw, p.faceYaw) * Math.min(1, dt * PH.TURN); r.rotation.y = p.yaw;
      p.moodT = Math.max(0, (p.moodT || 0) - dt); if (p.moodT <= 0) p.mood = null;
      p.sq = damp(p.sq, 0, 9, dt); p.glide = damp(p.glide, p.gliding ? 1 : 0, 10, dt);
      const air = !p.grounded, speed = Math.hypot(p.vx, p.vz), runK = clamp(speed / PH.RUN, 0, 1), win = S.state === 'win';
      const stretch = air ? clamp(p.vy / 60, -0.12, 0.16) * (1 - p.glide) : 0;
      if (p.landKick) { p.jigV = (p.jigV || 0) - p.landKick * 0.05; mimo.spr.vx += p.landKick * 0.25; p.landKick = 0; }
      p.jigV = (p.jigV || 0) + (-(p.jig || 0) * 190 - (p.jigV || 0) * 9) * dt; p.jig = (p.jig || 0) + p.jigV * dt;
      const sq = p.sq + stretch + p.jig;
      mimo.body.scale.set((1 - sq * 0.5) * BS, (1 + sq) * BS, (1 - sq * 0.5) * BS);
      if (!air && speed > 0.4) p.walkT += dt * (6 + speed * 1.6); else p.walkT = damp(p.walkT, Math.round(p.walkT / Math.PI) * Math.PI, 8, dt);
      const w = Math.sin(p.walkT), cheer = win ? Math.abs(Math.sin(S.t * 7)) : 0;
      mimo.body.position.y = LEG + (!air ? Math.abs(w) * 0.045 * runK + Math.sin(worldT * 3) * 0.006 : 0) - Math.max(0, -sq) * 0.06 + cheer * 0.12;
      mimo.body.rotation.z = !air ? w * 0.07 * runK : Math.sin(worldT * 5) * 0.06 * p.glide;
      mimo.body.rotation.x = air ? lerp(clamp(-p.vy * 0.008, -0.12, 0.12), 0.3, p.glide) : runK * 0.12;
      const legSw = w * 0.75 * runK, legSq = 1 - Math.max(0, -sq) * 0.7;
      mimo.legs[0].rotation.set(air ? lerp(-0.55, 0.5, p.glide) : legSw, 0, 0); mimo.legs[1].rotation.set(air ? lerp(0.35, 0.7, p.glide) : -legSw, 0, 0);
      for (const lg of mimo.legs) lg.scale.y = legSq;
      // arms: swing while running, up in a jump, spread wide while gliding, up and waving after the win
      p.armUp = damp(p.armUp || 0, air || win ? 1 : 0, 10, dt);
      const swing = w * 0.8 * runK, lift = win ? 2.0 + Math.sin(S.t * 14) * 0.25 : lerp(1.7, 1.25, p.glide);
      mimo.arms[0].rotation.set(swing, 0, -0.15 - p.armUp * lift); mimo.arms[1].rotation.set(-swing, 0, 0.15 + p.armUp * lift);
      // face
      p.blink -= dt; if (p.blink < 0) p.blink = 2.2 + Math.random() * 2.8;
      const happy = p.mood === 'happy' || p.glide > 0.5 || win, scared = !happy && p.vy < -15, blinkK = p.blink < 0.12 ? 0.1 : 1;
      for (const e of mimo.eyes) { e.visible = !happy; e.scale.set(scared ? 1.12 : 1, blinkK * (scared ? 1.18 : 1), 1); }
      for (const e of mimo.happyEyes) e.visible = happy;
      for (const e of mimo.closedEyes) e.visible = false;
      const open = scared || happy || (air && p.vy > 3);
      mimo.mouthOpen.visible = open; mimo.smile.visible = !open;
      // sprout on a spring
      const spr = mimo.spr, tgtX = -runK * 0.35 + clamp(p.vy * 0.02, -0.3, 0.35), tgtZ = Math.sin(worldT * 1.4) * 0.06;
      spr.vx += ((tgtX - spr.x) * 70 - spr.vx * 6) * dt; spr.x += spr.vx * dt; spr.vz += ((tgtZ - spr.z) * 70 - spr.vz * 6) * dt; spr.z += spr.vz * dt;
      if (mimo.sprout) { mimo.sprout.rotation.x = spr.x; mimo.sprout.rotation.z = spr.z; }
      // the propeller idles slowly and whirrs while gliding
      p.propSpeed = damp(p.propSpeed || 0, p.gliding ? 42 : air ? 14 : 3, 6, dt);
      headCap.spin.rotation.y += p.propSpeed * dt;
      headCap.root.visible = S.hasCap; if (mimo.sprout) mimo.sprout.visible = !S.hasCap;
      if (mimo.rainbow) mimo.skin.color.setHSL((worldT * 0.15) % 1, 0.55, 0.78);
      // blob shadow straight below, a bit smaller the higher Mimo is but always clearly visible, plus the landing ring
      const gy = groundBelow(p.x, p.z, p.y + 0.1), sh = mimo.shadow, above = p.y - gy, hgt = clamp(above / 7, 0, 1);
      sh.visible = mimo.root.visible && gy > -Infinity; sh.position.set(p.x, gy + 0.1, p.z); sh.scale.setScalar(1 - hgt * 0.3); sh.material.opacity = LAND.shadow;
      const ringK = sh.visible && !p.grounded ? clamp((above - LAND.from) / (LAND.full - LAND.from), 0, 1) : 0;
      landRing.visible = ringK > 0; landRing.position.set(p.x, gy + 0.11, p.z); landRing.material.opacity = ringK * LAND.alpha;
    }
    function sync(dt) {
      syncMimo(dt);
      mood.step(dt, moodName(), p);
      if (story) story.draw(worldT);
      shotK = damp(shotK, shot ? 1 : 0, SHOT.blend, dt);
      if (shot) { const a = 1 - Math.exp(-SHOT.move * dt); shotPos.lerp(tmpV.set(...shot.pos), a); shotLook.lerp(tmpV.set(...shot.look), a); }
      viewPos.copy(camera.pos).lerp(shotPos, shotK); viewLook.copy(camera.look).lerp(shotLook, shotK);
      // the sun's shadow box follows what the camera looks at, so a far shot has shadows too
      const fx = shotK > 0.5 ? viewLook.x : p.x, fz = shotK > 0.5 ? viewLook.z : p.z;
      sun.target.position.set(Math.round(fx), 0, Math.round(fz)); sun.position.copy(sun.target.position).addScaledVector(SUN, -48);
      if (camOverride) { cam.position.set(...camOverride.pos); cam.lookAt(...camOverride.look); } else { cam.position.copy(viewPos); cam.lookAt(viewLook); }
      const key = S.stars + '|' + Math.floor(S.time * 10) + '|' + S.hasCap + '|' + foundSecrets.length;
      if (key !== hudKey && host.onHud) { hudKey = key; host.onHud({ stars: S.stars, total: TOTAL_STARS, time: S.time, cap: S.hasCap, secrets: foundSecrets.length, secretTotal: TOTAL_SECRETS }); }
    }

    // ---------- Main update ----------
    const anyInput = () => input.jumpQueued || input.left || input.right || input.up || input.down || Math.hypot(input.ax || 0, input.ay || 0) > 0.3;
    function tick(dt) {
      worldT += dt;
      for (const c of cols) { c.dx = c.dy = c.dz = 0; }
      p.extX = p.extZ = 0;
      level.update(dt, worldT, camera.yaw()); decorApi.update(worldT);
      S.t += dt;
      if (S.state === 'intro' && (S.t >= level.intro.time || (S.t > 0.4 && anyInput()))) { S.state = 'play'; S.t = 0; input.jumpQueued = false; }
      else if (S.state === 'dead' && S.t > DEATH_TIME) { S.attempts++; placePlayer(S.respawn); S.state = 'play'; S.t = 0; }
      else if (S.state === 'win' && S.t > WIN_TIME && !S.won) { S.won = true; if (host.onWin) host.onWin({ time: S.time, stars: S.stars, total: TOTAL_STARS, attempts: S.attempts, secrets: foundSecrets.length, secretTotal: TOTAL_SECRETS }); }
      if (story) story.update(dt);
      if (S.state === 'play' && S.clockOn) S.time += dt;
      if (S.state !== 'dead') stepPlayer(dt);
      if (S.state === 'play') checks();
      if (input.look) { camera.turn(input.look); input.look = 0; }
      if (input.lookY) { camera.tilt(input.lookY); input.lookY = 0; }
      stepParticles(dt); camera.step(dt);
    }
    // Quality steps down by itself on slow devices: coarser picture first, sun shadows last.
    // Some phones cap every page at 30 pictures a second (power saving, embedded pages). Then a lower
    // quality buys nothing. So after each step it checks whether frames really got faster; if not, it
    // takes the step back and leaves the quality alone.
    const ratios = QUALITY.ratios.filter((r) => r <= startRatio);
    if (!ratios.length) ratios.push(1);
    let frameAvg = 1 / 60, slowT = 0, quality = 0, holdQuality = false, trial = null, settled = false;
    function setQuality(level) {
      quality = level;
      renderer.setPixelRatio(ratios[Math.min(level, ratios.length - 1)]); sun.castShadow = level < ratios.length;
      resize();
    }
    function stepQuality(dt) {
      if (trial) {
        trial.t += dt;
        if (trial.t < QUALITY.window) return;
        if (frameAvg > trial.before * QUALITY.gain) { setQuality(quality - 1); settled = true; }
        trial = null; slowT = 0; return;
      }
      if (settled || quality >= ratios.length) return;
      slowT = frameAvg > QUALITY.slow ? slowT + dt : 0;
      if (slowT > QUALITY.window) { trial = { before: frameAvg, t: 0 }; setQuality(quality + 1); }
    }
    // Everything the level will ever show is prepared before the first picture: shaders are compiled and
    // textures uploaded now, so nothing stutters when it first comes into view.
    function warmUp() {
      scene.traverse((o) => { const m = o.material; for (const one of Array.isArray(m) ? m : m ? [m] : []) for (const key of ['map', 'emissiveMap']) if (one[key]) renderer.initTexture(one[key]); });
      const before = [];
      scene.traverse((o) => { before.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; });
      renderer.compile(scene, cam); renderer.render(scene, cam);
      for (const [o, visible, culled] of before) { o.visible = visible; o.frustumCulled = culled; }
    }
    let raf = 0, last = 0, manual = false, alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(MAX_FRAME, (now - (last || now)) / 1000); last = now;
      // physics runs in the rhythm of the screen: every frame is cut into equal steps of at most STEP.
      // Fixed steps would give two, then one, then three steps per frame, and that shows as judder.
      if (!manual && dt > 0) { const n = Math.ceil(dt / STEP), h = dt / n; for (let i = 0; i < n; i++) tick(h); }
      frameAvg += (dt - frameAvg) * QUALITY.smoothing;
      if (!manual && !holdQuality) stepQuality(dt);
      sync(dt); renderer.render(scene, cam);
    }
    function resize() {
      const box = canvas.parentElement.getBoundingClientRect(), w = Math.max(1, Math.round(box.width)), h = Math.max(1, Math.round(box.height));
      renderer.setSize(w, h, false); camera.tall = w < h; cam.aspect = w / h; cam.fov = camera.tall ? FOV_TALL : FOV; cam.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement);
    resize(); restart(!!host.quick);
    const warmStart = performance.now(); warmUp(); const warmMs = Math.round(performance.now() - warmStart);
    raf = requestAnimationFrame(frame);

    function dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      kit.dispose(); renderer.dispose(); canvas.remove();
    }
    // Test hooks: step the game by hand and look from anywhere
    // Test hook: put Mimo somewhere as if he had walked there. opts: { cap, section }
    function warp(pos, opts) {
      const o = opts || {};
      if (o.cap) { S.hasCap = true; if (level.cap) level.cap.got = true; }
      // a section may be named by its id ('s3'); an id that is not built yet counts as the first section
      if (o.section != null) S.section = typeof o.section === 'string' ? Math.max(0, level.sections.findIndex((sec) => sec.id === o.section)) : o.section;
      // the story follows: mission n belongs to section n, or opts.story says how many missions are done
      if (story) story.skipTo(o.story != null ? o.story : S.section);
      S.state = 'play'; S.respawn = pos; placePlayer(pos); camera.snap();
    }
    const dbg = {
      timing: () => ({ warmUp: warmMs, sections: level.sections.map((sec) => sec.id + ' ' + sec.buildMs) }),
      warp, world, clearSecrets: () => { foundSecrets = []; stickers = []; keep = {}; }, stickers: () => stickers.slice(), kept: () => Object.assign({}, keep),
      p, S, PH, level, cols,
      camYaw: camera.yaw, ctrlYaw: camera.lastControlYaw, exploring: camera.exploring,
      camPos: () => [camera.pos.x, camera.pos.y, camera.pos.z], camAvoid: camera.avoidState,
      holdQuality: (on) => { holdQuality = !!on; },
      secrets: () => foundSecrets.slice(),
      story: () => (story ? story.state() : null), storyAuto: (on) => { if (story) story.auto(on); },
      train: () => (story && story.train ? story.train() : null),
      desk: () => (story && story.desk ? story.desk() : null),
      side: () => (story && story.side ? story.side() : null),
      manual: (on) => { manual = !!on; },
      step: (n) => { for (let i = 0; i < (n || 1); i++) tick(STEP); },
      setCam: (pos, look) => { camOverride = pos ? { pos, look } : null; },
      info: () => Object.assign({}, renderer.info.render),
    };
    const stats = () => ({ fps: Math.round(1 / frameAvg), ratio: renderer.getPixelRatio(), shadows: sun.castShadow, lowered: quality > 0, capped: settled });
    // For the host's speech bubbles and goal arrow: where a point of the world is on the page
    // (x, y in CSS pixels; front: in front of the camera; inside: within the picture)
    const projV = new THREE.Vector3();
    function project(pos) {
      projV.set(pos[0], pos[1], pos[2]).project(cam);
      const r = canvas.getBoundingClientRect(), front = projV.z < 1;
      return { x: r.left + (projV.x + 1) / 2 * r.width, y: r.top + (1 - projV.y) / 2 * r.height, front, inside: front && Math.abs(projV.x) <= 1 && Math.abs(projV.y) <= 1 };
    }
    const goal = () => (story && S.state === 'play' ? story.goal() : null);
    return { restart, toFlag, stats, dispose, dbg, project, goal };
  }

  Room3D.create = create;
})();
