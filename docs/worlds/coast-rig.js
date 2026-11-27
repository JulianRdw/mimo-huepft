// Jointed family figure for Mimo hüpft: rigid parts as cached SVG layers, limbs drawn live as smooth tubes.
// Every joint follows a target through a damped spring, so moves get anticipation, overshoot and settling.
// Standing faces the viewer; walking, running and jumping turn the figure into a three-quarter view.
// Needs coast-rig-core.js and coast-rig-actions.js; coast-rig-draw.js adds the drawing methods.
//
// Changes for the coast (everything else is the approved Bad Nenndorf figure):
//  - no Math.random: blinking and weight shifts come from a seeded counter (create(rig, seed)), so a level replays exactly
//  - one set of layer pictures and canvases per person, shared by all figures of that person (shared)
//  - external drive: a scene moves the figure itself and tells it the speed (setSpeed); posX stays 0 then
//  - faceDir: a standing figure keeps its three-quarter view towards -1 or 1 (a lecturer facing his audience)
//  - looping gestures: startAct(name, { loop: [from, length] }) repeats the sustained part of a clip until stopAct()
(function () {
  'use strict';

  const { TAU, DEG, M, about, clamp, lerp, lerpP, Spring, track } = window.MimoCoast.RigMath;
  const G = window.MimoCoast.FamilyGait;
  const ACTIONS = window.MimoCoast.FamilyActions;
  const SCARF_LINK = 1.9;

  const REST = { upper: 6.6, fore: 1.2 };
  const FEAT = 1.6;          // how far face features slide when the head turns fully
  const HAIR_TURN = 0.55;    // how far the hair slides with a full head turn (both layers alike)
  const TURN_MOVING = 0.85;  // body turn while moving (three-quarter view)
  const FACE_HOLD = 0.9;     // seconds the figure keeps facing its direction after stopping

  // elbow for a two-bone arm from shoulder S to wrist W; bend = +1/-1 picks the side the elbow points to (x)
  function elbowIK(S, W, a, b, bend) {
    const dx = W[0] - S[0], dy = W[1] - S[1];
    const d = clamp(Math.hypot(dx, dy), 0.01, a + b - 0.01);
    const ang = Math.atan2(dy, dx);
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const off = Math.acos(cosA);
    const e1 = [S[0] + Math.cos(ang + off) * a, S[1] + Math.sin(ang + off) * a];
    const e2 = [S[0] + Math.cos(ang - off) * a, S[1] + Math.sin(ang - off) * a];
    return (e1[0] - e2[0]) * bend >= 0 ? e1 : e2;
  }
  const towards = (from, to, len) => {
    const dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / l) * Math.min(len, l), from[1] + (dy / l) * Math.min(len, l)];
  };

  // seeded random numbers 0..1 (mulberry32): the same seed gives the same blinks on every run
  function seeded(seed) {
    let a = (seed | 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const loaded = new Map(); // rig key -> Promise of { images, cache, colors }

  function loadLayers(rig) {
    const sources = [...Object.entries(rig.layers), ...Object.entries(rig.props || {}).map(([name, p]) => ['prop_' + name, p.svg])];
    const entries = sources.map(([name, svg]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([name, img]);
      img.onerror = () => reject(new Error(`rig ${rig.key}: layer "${name}" failed to load`));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }));
    return Promise.all(entries).then((list) => Object.fromEntries(list));
  }

  class FamilyFigure {
    // the pictures of a person load once; seed makes this figure's blinks and weight shifts its own
    static async create(rig, seed) {
      return new FamilyFigure(rig, await FamilyFigure.preload(rig), seed);
    }
    // start loading the pictures of a person (a Promise of the shared set)
    static preload(rig) {
      if (!loaded.has(rig.key)) loaded.set(rig.key, loadLayers(rig).then((images) => ({ images, cache: new Map(), colors: {}, shoe: null })));
      return loaded.get(rig.key);
    }

    constructor(rig, shared, seed) {
      this.rig = rig;
      this.shared = shared;
      this.images = shared.images;
      this.cache = shared.cache;
      this.rnd = seeded(seed || 1);
      this.tint = null;        // { red: 0..3, night: 0..5 } wash for sunburn and dusk
      this.external = false;   // true: the scene moves the figure, setSpeed tells it how fast
      this.faceDir = 0;        // standing: -1 / 1 = keep the three-quarter view that way, 0 = face the viewer
      this.lookAt = undefined; // x of the thing to look at relative to the figure (px, + = viewer's right), set by the scene
      this.nextBlink = 0.5 + this.rnd() * 2;
      this.t = 0;
      this.timeScale = 1;
      this.autoGreet = false;
      this.greetCooldown = 0;
      this.act = null;
      this.prop = null;
      this.lastLook = 0;
      this.nextSignature = 0;
      this.scarf = null;
      this.gaitScale = rig.gaitScale || 1;
      this.speedScale = Math.sqrt(this.gaitScale);
      this.scarfLink = SCARF_LINK * Math.sqrt(this.gaitScale);
      this.browFlash = 0;
      this.nextBlink = 1.2;
      this.blinkLeft = 0;
      this.doubleBlink = false;
      this.weightSide = 1;
      this.nextShift = 3.5;
      this.beamUntil = 0;
      this.expr = null;        // a scene face (e.g. 'ouch'): replaces eyes and mouth while set
      this.heading = null;     // scene on a floor in perspective: 0 = facing the viewer, 90 = screen right, 180 = away
      this.detach = { l: 0, r: 0 }; // a dislocated shoulder: the arm hangs this far out of its socket
      this.stretch = { l: 1, r: 1 }; // cartoon: an arm pulled longer than it is
      // locomotion
      this.posX = 0;
      this.vx = 0;
      this.air = 0;
      this.vy = 0;
      this.mode = 'ground'; // ground | crouch | air | land
      this.modeT = 0;
      this.u = 0;
      this.input = { move: 0, run: false };
      this.dir = 1;
      this.faceHold = 0;
      const sp = (v, f, z) => new Spring(v, f, z);
      this.s = {
        pelvisX: sp(0, 1.1, 0.75), pelvisY: sp(0, 2.2, 0.7), pelvisRot: sp(0, 1.1, 0.75), torsoRot: sp(0, 2.2, 0.6),
        headTilt: sp(0, 2.2, 0.55), headTurn: sp(0, 1.8, 0.82), eyeTurn: sp(0, 7, 0.9), brow: sp(0, 6, 0.5),
        beam: sp(0, 16, 1), shrugR: sp(0, 4, 0.6),
        lUpper: sp(REST.upper, 3.4, 0.5), lFore: sp(REST.fore, 3.8, 0.45),
        rUpper: sp(REST.upper, 4.2, 0.55), rFore: sp(REST.fore, 4.8, 0.42),
        lHand: sp(REST.fore, 2.6, 0.5), rHand: sp(REST.fore, 2.6, 0.45),
        hairX: sp(0, 3.2, 0.32), hairY: sp(0, 3.2, 0.32),
        footL: sp(0, 5, 0.8), footR: sp(0, 5, 0.8), liftL: sp(0, 7, 0.75), liftR: sp(0, 7, 0.75), sinkL: sp(0, 5, 0.8), sinkR: sp(0, 5, 0.8), reach: sp(0, 5, 0.9), shiftX: sp(0, 3, 0.8),
        bodyTurn: sp(0, 2.6, 0.85), yaw: sp(0, 1.8, 0.82), gait: sp(0, 3.5, 1), crouch: sp(0, 9, 0.55), stretch: sp(1, 7, 0.45), airLegs: sp(0, 7, 0.9),
      };
      const a0 = rig.headCenter;
      this.s.hairX.x = a0[0]; this.s.hairY.x = a0[1];
      this.update(0, {});
    }

    // ------------------------------------------------------------ commands
    sayHello() { this.startAct('wave'); }
    // the person's own move (scarf, pen, microphone, clapperboard, camera); cycles if there are several
    signature(name) {
      const list = this.rig.signatures || [];
      if (!list.length) return this.sayHello();
      const pick = name && list.includes(name) ? name : list[this.nextSignature++ % list.length];
      this.startAct(pick);
    }
    // a gesture: opts.loop = [from, length] repeats that part of the clip (the length should be whole periods of its
    // oscillations) until stopAct(); a looping clip never ends by itself
    startAct(name, opts = {}) {
      if (this.act || !ACTIONS[name]) return false;
      this.act = { name, t: 0, side: this.lastLook > 0 ? 'l' : 'r', ...opts };
      if (name === 'cheer') this.scarf = null;
      return true;
    }
    // end a looping gesture gracefully: the clip runs on from here to its own ending
    stopAct() {
      const a = this.act;
      if (a && a.loop) { a.t = a.loop[0] + ((a.t - a.loop[0]) % a.loop[1]); a.loop = null; a.endAt = a.t + 0.6; }
    }
    // the scene moves this figure: its horizontal speed in px/s (+ right) drives the legs
    setSpeed(vx) { this.external = true; this.vx = vx; this.input = { move: Math.abs(vx) > 2 ? Math.sign(vx) : 0, run: false, speed: Math.abs(vx) }; }
    get busy() { return !!this.act; }
    // throw a ball in direction dir; pick = the ball lies at the feet first
    throwBall(dir, pick) { return this.mode === 'ground' && Math.abs(this.vx) < 2 && this.startAct('throw', { dir, pick }); }
    // hand position in world coordinates: x along the ground, y = height above the ground
    handWorld(k) {
      const a = this.frame.arms[k === 'l' ? 'left' : 'right'];
      return [this.posX + a.H[0] - this.rig.center, this.rig.ground - a.H[1]];
    }
    flashBrows() { this.browFlash = 0.55; }
    // speed (optional): figure pixels per second instead of walking or running pace
    setMove(dir, run, speed) { this.input = { move: Math.sign(dir), run: !!run, speed }; }
    jump() { if (this.mode === 'ground') { this.mode = 'crouch'; this.modeT = 0; } }
    get moving() { return Math.abs(this.vx) > 2 || this.mode !== 'ground'; }

    // ------------------------------------------------------------ simulation
    // env.look: x of the thing to look at, in figure pixels relative to the figure (+ = viewer's right)
    update(dtReal, env) {
      const dt = Math.min(dtReal, 0.1) * this.timeScale;
      this.t += dt;
      const t = this.t, s = this.s, st = (k, v) => s[k].step(v, dt);
      this.stepBody(dt);
      this.events = [];
      // an action with a direction (throw, kick, ...) turns the figure that way
      if (this.act && this.act.dir) { this.dir = this.act.dir; this.faceHold = Math.max(this.faceHold, 0.5); }
      const standing = this.mode === 'ground' && Math.abs(this.vx) < 2;

      // greet Mimo once when he comes close, only while standing
      this.greetCooldown -= dt;
      const look = env.look !== undefined ? env.look : this.lookAt;
      if (look !== undefined) this.lastLook = look;
      if (this.autoGreet && standing && look !== undefined && Math.abs(look) < 46 && this.greetCooldown <= 0 && !this.act) {
        this.sayHello();
        this.greetCooldown = 9;
      }

      // profile: how much of the walking motion lies in the picture plane (1 side on, 0 straight towards or away)
      let bodyTurn, back = false, strideX, strideY = 0, profile = 1;
      if (this.heading !== null && this.heading !== undefined) {
        // heading mode: the body turns through the three-quarter view into the back view; steps follow the heading
        let tgt = this.heading;
        const cur = s.yaw.x;
        while (tgt - cur > 180) tgt -= 360;
        while (tgt - cur < -180) tgt += 360;
        const yaw = st('yaw', tgt), yn = ((((yaw + 180) % 360) + 360) % 360) - 180, ay = Math.abs(yn);
        back = ay > 90;
        bodyTurn = Math.sign(yn) * (back ? clamp((180 - ay) / 60, 0, 1) : clamp(ay / 60, 0, 1)) * TURN_MOVING;
        if (ay > 2 && ay < 178) this.dir = yn > 0 ? 1 : -1;
        strideX = clamp(Math.sin(yn * DEG) / Math.sin(60 * DEG), -1, 1);
        strideY = Math.cos(yn * DEG) * 0.35;
        profile = clamp(Math.abs(Math.sin(yn * DEG)) / Math.sin(60 * DEG), 0, 1);
        this.yawNow = yn;
      } else {
        // facing: turn into the direction of travel, back to the viewer shortly after stopping
        if (this.input.move) { this.dir = this.input.move; this.faceHold = FACE_HOLD; } else if (standing) this.faceHold -= dt;
        // a jump from standing stays facing the viewer; only movement turns the body
        if (this.faceDir && standing && !this.input.move) this.dir = this.faceDir;
        const facing = this.input.move || this.faceHold > 0 || Math.abs(this.vx) > 2 || this.faceDir ? this.dir : 0;
        bodyTurn = st('bodyTurn', facing * TURN_MOVING);
        strideX = this.dir;
        this.yawNow = undefined;
      }
      const d = this.dir;

      // gait
      // gait: smaller people take shorter, quicker steps (sizes scale with leg length)
      const k = this.gaitScale, speed = Math.abs(this.vx), norm = speed / this.speedScale, r = G.runBlend(norm);
      if (this.mode === 'ground') this.u += (speed * dt) / (G.cycleLength(norm) * k);
      const gw = st('gait', this.mode === 'ground' ? clamp(norm / (G.WALK_SPEED * 0.45), 0, 1) : 0);
      const cyc = { ...G.cycle(this.u, r) };
      cyc.stride *= k; cyc.lift *= k; cyc.bob *= k; cyc.sink *= k;

      // idle layer: breathing, weight shift
      const breath = Math.sin((t * TAU) / 3.6);
      this.nextShift -= dt;
      if (this.nextShift <= 0 && !this.act) { this.weightSide *= -1; this.nextShift = 4.5 + this.rnd() * 4; }
      const side = this.weightSide, idle = 1 - gw;

      const arm = {};
      // the near arm (towards the viewer) swings across the chest in the three-quarter view, so it moves less sideways
      const nearK = d > 0 ? 'r' : 'l';
      for (const [k, sgn, opposite] of [['l', 1, cyc.right], ['r', -1, cyc.left]]) {
        const sideways = k === nearK ? 0.5 : 1;
        const swing = cyc.armSwing * opposite.fwd * (opposite.fwd > 0 ? sideways : 1);
        // seen from the front or from behind the swing goes into the depth: the arms stay at the sides, the bent
        // forearm points at (or away from) the viewer and only shows as a slight inward bend that pumps a little
        const sideGait = 4 + sgn * d * swing;
        const sideFore = sideGait + sgn * d * (cyc.elbow * (k === nearK ? 0.7 : 1) + 10 * Math.max(0, opposite.fwd) * sideways);
        const depthGait = 5 + 1.5 * Math.abs(opposite.fwd);
        const depthFore = depthGait - cyc.elbow * (0.32 + 0.12 * opposite.fwd);
        const upperGait = lerp(depthGait, sideGait, profile);
        const foreGait = lerp(depthFore, sideFore, profile);
        arm[k] = {
          upper: lerp(REST.upper + 0.7 * breath, upperGait, gw),
          fore: lerp(REST.fore + 0.5 * breath, foreGait, gw),
        };
      }
      let headTilt = side * 1.4 * idle, torsoRot = -side * 0.8 * idle + d * cyc.lean * gw, brow = 0, shrug = 0, beam = 0;

      // jump: arms swing back in the crouch, fly up in the air, catch the landing
      const jumpArms = this.jumpArms(d, bodyTurn);
      if (jumpArms) for (const k of ['l', 'r']) arm[k] = jumpArms[k];
      if (this.mode === 'crouch') torsoRot += d * Math.abs(bodyTurn) * 7;
      if (this.mode === 'land') torsoRot += d * Math.abs(bodyTurn) * 5;

      let bounce = 0, reach = null, feet = { l: 0, r: 0 }, shiftX = 0;
      this.prop = null; this.handShape = null;
      if (this.act) {
        const ballLocal = env.ball ? [env.ball.x - this.posX + this.rig.center, this.rig.ground - env.ball.y] : null;
        const toLocal = (wx, wy) => [wx - this.posX + this.rig.center, this.rig.ground - wy];
        const lp = this.act.loop, w0 = (this.act.t += dt), w = lp && w0 > lp[0] ? lp[0] + ((w0 - lp[0]) % lp[1]) : w0;
        const res = ACTIONS[this.act.name](w, { arm, headTilt, torsoRot, standing, side: this.act.side, dir: this.act.dir, pick: this.act.pick, ball: ballLocal, act: this.act, toLocal, rig: this.rig });
        for (const kk of ['l', 'r']) if (res.arms && res.arms[kk]) arm[kk] = res.arms[kk];
        if (res.headTilt !== undefined) headTilt = res.headTilt;
        if (res.torsoRot !== undefined) torsoRot = res.torsoRot;
        if (res.brow) brow = 1;
        if (res.shrug) shrug = res.shrug;
        if (res.beam) this.beamUntil = t + 0.8;
        bounce = (res.bounce || 0) - (res.dip || 0);
        reach = res.reach || null; feet = res.feet || feet; shiftX = res.shiftX || 0;
        this.holding = res.holdBall || null;
        // one-off moments of a clip (e.g. 'kick' when the foot meets the ball) become events for the scene
        if (res.event && !this.act['ev_' + res.event]) { this.act['ev_' + res.event] = true; this.events.push({ type: res.event, dir: this.act.dir }); }
        if (res.release && !this.act.released) { this.act.released = true; this.events.push({ type: 'release', hand: res.release, dir: this.act.dir, vel: (this.handVel && this.handVel[res.release]) || [0, 0] }); }
        this.prop = res.prop || null; this.handShape = res.hand || null;   // res.hand: { r: 'thumb' } draws that hand as a closed fist with the thumb up
        if ((res.done || (this.act.endAt != null && this.act.t >= this.act.endAt)) && !this.act.loop) { this.act = null; this.holding = null; }
      }
      if (this.browFlash > 0) { this.browFlash -= dt; brow = 1; }
      if (t < this.beamUntil || this.mode === 'air') beam = 1;

      // looking: at Mimo while standing, ahead while moving; eyes lead, the head follows
      let lookTurn = 0;
      if (look !== undefined && standing) lookTurn = clamp(look / 70, -1, 1) * (Math.abs(look) < 260 ? 1 : 0.35);
      const headTarget = clamp(bodyTurn + (1 - Math.abs(bodyTurn)) * lookTurn, -1, 1);

      const crouch = st('crouch', this.mode === 'crouch' ? 2.8 : this.mode === 'land' && this.modeT < G.LAND_TIME * 0.45 ? 2.2 : 0);
      const stretch = st('stretch', this.mode === 'air' ? (this.vy > 0 ? 1.05 : 1.0) : this.mode === 'land' ? 0.95 : 1);
      const pose = {
        bodyTurn, d, gw, cyc, breath, crouch, stretch, back, strideX, strideY,
        airLegs: st('airLegs', this.mode === 'air' ? 1 : 0),
        pelvisX: st('pelvisX', side * 0.45 * idle + cyc.sway * gw * (1 - Math.abs(bodyTurn))) + st('shiftX', shiftX),
        pelvisY: st('pelvisY', (0.15 + 0.08 * breath) * idle + (cyc.bob + cyc.sink) * gw - bounce) + crouch,
        pelvisRot: st('pelvisRot', side * 1.4 * idle),
        torsoRot: st('torsoRot', torsoRot),
        headTilt: st('headTilt', headTilt + lookTurn * 2.5),
        headTurn: st('headTurn', headTarget), eyeTurn: st('eyeTurn', clamp(headTarget + lookTurn * 0.4, -1, 1)),
        brow: st('brow', brow), beam: clamp(st('beam', beam), 0, 1), shrugR: st('shrugR', shrug),
        lUpper: st('lUpper', arm.l.upper), lFore: st('lFore', arm.l.fore),
        rUpper: st('rUpper', arm.r.upper), rFore: st('rFore', arm.r.fore),
      };
      pose.footL = st('footL', feet.l); pose.footR = st('footR', feet.r);
      pose.liftL = st('liftL', feet.ly || 0); pose.liftR = st('liftR', feet.ry || 0);
      // feet further towards the viewer (lower in the picture), e.g. legs stretched out while sitting on the floor
      pose.sinkL = st('sinkL', feet.lz || 0); pose.sinkR = st('sinkR', feet.rz || 0);
      pose.reachW = clamp(st('reach', reach ? reach.w : 0), 0, 1);
      if (reach) this.reachTarget = reach;
      pose.lHand = st('lHand', pose.lFore);
      pose.rHand = st('rHand', pose.rFore);

      // blinking: random, sometimes twice; not while beaming (the eyes are closed half moons then)
      this.nextBlink -= dt;
      if (this.blinkLeft > 0) this.blinkLeft -= dt;
      if (this.nextBlink <= 0) {
        this.blinkLeft = 0.12;
        this.doubleBlink = !this.doubleBlink && this.rnd() < 0.25;
        this.nextBlink = this.doubleBlink ? 0.24 : 2.2 + this.rnd() * 3.8;
      }
      pose.blink = this.blinkLeft > 0;

      this.pose = pose;
      this.solve(dt);
      if (dt > 0) {
        const vel = {};
        for (const k of ['l', 'r']) {
          const now = this.handWorld(k), before = this.handPrev && this.handPrev[k];
          vel[k] = before ? [(now[0] - before[0]) / dt, (now[1] - before[1]) / dt] : [0, 0];
          this.handPrev = this.handPrev || {};
          this.handPrev[k] = now;
        }
        // smooth a little, a single frame is noisy
        this.handVel = this.handVel ? { l: lerpP(this.handVel.l, vel.l, 0.6), r: lerpP(this.handVel.r, vel.r, 0.6) } : vel;
      }
    }

    // horizontal speed, jump phases and height
    stepBody(dt) {
      const grounded = this.mode !== 'air';
      const pace = this.input.speed !== undefined ? this.input.speed : (this.input.run ? G.RUN_SPEED : G.WALK_SPEED) * this.speedScale;
      if (!this.external) {
        const want = this.input.move * pace;
        const acc = (grounded ? G.ACCEL : G.AIR_ACCEL) * dt;
        this.vx += clamp(want - this.vx, -acc, acc);
        this.posX += this.vx * dt;
      }
      this.modeT += dt;
      if (this.mode === 'crouch' && this.modeT >= G.CROUCH_TIME) {
        this.mode = 'air'; this.modeT = 0; this.vy = G.JUMP_SPEED;
      } else if (this.mode === 'air') {
        this.vy -= G.GRAVITY * dt;
        this.air += this.vy * dt;
        if (this.air <= 0 && this.vy < 0) {
          this.air = 0; this.mode = 'land'; this.modeT = 0;
          this.s.crouch.v += 30; // the landing pushes the body down
        }
      } else if (this.mode === 'land' && this.modeT >= G.LAND_TIME) {
        this.mode = 'ground'; this.modeT = 0;
      }
    }

    jumpArms(d, bodyTurn) {
      const side3q = Math.abs(bodyTurn) > 0.3;
      const per = (sgn, upper, fore) => ({ upper, fore });
      if (this.mode === 'crouch') {
        // arms swing back to gather momentum
        return side3q
          ? { l: per(1, -d * 34, -d * 26), r: per(-1, d * 34, d * 26) }
          : { l: per(1, 18, 30), r: per(-1, 18, 30) };
      }
      if (this.mode === 'air') {
        const rising = this.vy > 0;
        return { l: per(1, rising ? 58 : 46, rising ? 128 : 96), r: per(-1, rising ? 58 : 46, rising ? 128 : 96) };
      }
      if (this.mode === 'land' && this.modeT < G.LAND_TIME * 0.6) return { l: per(1, 26, 40), r: per(-1, 26, 40) };
      return null;
    }

    // ------------------------------------------------------------ kinematics
    solve(dt) {
      const r = this.rig, p = this.pose, hip = r.hip;
      const turnAbs = Math.abs(p.bodyTurn);
      const pelvis = M.mul(M.tr(p.pelvisX, p.pelvisY - this.air), about(M.rot(p.pelvisRot * DEG), hip));
      const shape = about(M.sc(1 - 0.1 * turnAbs, p.stretch * (1 + 0.012 * p.breath)), hip);
      const torso = M.mul(pelvis, M.mul(about(M.rot(p.torsoRot * DEG), hip), shape));
      const neck = M.apply(torso, r.neck);
      const headRot = (p.headTilt + p.torsoRot * 0.5) * DEG;
      const head = M.mul(M.tr(neck[0] - r.neck[0] + p.headTurn * 0.3, neck[1] - r.neck[1]), about(M.rot(headRot), r.neck));

      // secondary motion: hair lags behind the head and settles with a little bounce
      const anchor = M.apply(head, r.headCenter);
      const hx = this.s.hairX.step(anchor[0], dt), hy = this.s.hairY.step(anchor[1], dt);
      const hair = [clamp(hx - anchor[0], -1.1, 1.1), clamp(hy - anchor[1], -1.1, 1.1)];

      const farSide = turnAbs > 0.3 ? (p.d > 0 ? 'left' : 'right') : null;
      const arms = {};
      for (const side of ['left', 'right']) {
        const k = side === 'left' ? 'l' : 'r', sgn = (side === 'left' ? 1 : -1) * (p.back ? -1 : 1);
        const S = M.apply(torso, this.mirror(r.shoulders[side]));
        // out of its socket: the shoulder joint sits lower and further out
        const det = this.detach[k] || 0;
        if (det) { S[0] += sgn * det * 0.5; S[1] += det; }
        S[0] -= sgn * (side === farSide ? 1.4 : 0.4) * turnAbs; // the far shoulder slides behind the chest
        S[1] += -0.22 * p.breath - (side === 'right' ? 0.7 * p.shrugR : 0);
        const up = (p[k + 'Upper'] + p.torsoRot * -sgn) * DEG;
        const fo = (p[k + 'Fore'] + p.torsoRot * -sgn) * DEG;
        const ln = (this.stretch && this.stretch[k]) || 1, aU = r.arm.upper * ln, aF = r.arm.fore * ln;
        const E = [S[0] + sgn * Math.sin(up) * aU, S[1] + Math.cos(up) * aU];
        const W = [E[0] + sgn * Math.sin(fo) * aF, E[1] + Math.cos(fo) * aF];
        const hand = (p[k + 'Hand'] + p.torsoRot * -sgn) * DEG;
        const dir = [sgn * Math.sin(hand), Math.cos(hand)];
        let H = [W[0] + dir[0] * r.arm.handReach, W[1] + dir[1] * r.arm.handReach];
        // reaching for something (the ball on the ground): two-bone IK blended over the animated arm
        const rt = this.reachTarget;
        if (rt && rt.arm === k && p.reachW > 0.001) {
          const T = rt.target, wristT = [T[0], T[1] - r.arm.handReach * 0.8];
          const Eik = elbowIK(S, wristT, aU, aF, -p.d || -sgn);
          const Wik = towards(Eik, wristT, aF);
          const w = p.reachW;
          const E2 = lerpP(E, Eik, w), W2 = lerpP(W, Wik, w);
          E[0] = E2[0]; E[1] = E2[1]; W[0] = W2[0]; W[1] = W2[1];
          const dl = Math.hypot(W[0] - E[0], W[1] - E[1]) || 1;
          dir[0] = (W[0] - E[0]) / dl; dir[1] = (W[1] - E[1]) / dl;
          H = [W[0] + dir[0] * r.arm.handReach, W[1] + dir[1] * r.arm.handReach];
        }
        arms[side] = { S, E, W, hand: Math.atan2(dir[0] * sgn, dir[1]), dir, H, sgn };
      }

      // legs: ankles follow the gait (or stay planted), knees bend by two-bone IK
      const legs = {};
      const spread = 1 - 0.5 * turnAbs;
      const knee3q = turnAbs > 0.15;
      for (const side of ['left', 'right']) {
        const sgn = (side === 'left' ? 1 : -1) * (p.back ? -1 : 1);
        const hj = this.mirror(r.legs.hipJoints[side]), an = this.mirror(r.legs.ankles[side]);
        const Hj = M.apply(pelvis, [r.center + (hj[0] - r.center) * spread, hj[1]]);
        const baseA = [r.center + (an[0] - r.center) * spread, an[1]];
        const g = side === 'left' ? p.cyc.left : p.cyc.right;
        const step = p.cyc.stride * g.fwd * p.gw;
        const ground = [baseA[0] + p.strideX * step + (side === 'left' ? p.footL : p.footR), baseA[1] + p.strideY * step - p.cyc.lift * g.lift * p.gw - Math.max(0, side === 'left' ? p.liftL : p.liftR) + (side === 'left' ? p.sinkL : p.sinkR)];
        const restLen = Math.hypot(an[0] - hj[0], an[1] - hj[1]);
        const tuck = clamp(0.5 + this.vy / G.JUMP_SPEED * 0.5, 0, 1);
        const airA = [Hj[0] + p.d * turnAbs * 2.2 * tuck + sgn * 0.6, Hj[1] + restLen * (1 - 0.3 * tuck)];
        const A = lerpP(ground, airA, p.airLegs);
        const l = (restLen / 2) * 1.002;
        const dx = A[0] - Hj[0], dy = A[1] - Hj[1], dist = Math.hypot(dx, dy) || 1;
        const dd = Math.min(dist, l * 2 - 1e-4);
        let h = Math.sqrt(Math.max(0, l * l - (dd / 2) * (dd / 2)));
        if (!knee3q) h = Math.min(0.8, h);
        const mx = Hj[0] + dx / 2, my = Hj[1] + dy / 2, nx = -dy / dist, ny = dx / dist;
        // knees point forward in the three-quarter view, outward in the front view
        const want = knee3q ? p.d : sgn;
        const out = nx * want >= 0 ? 1 : -1;
        legs[side] = { Hj, K: [mx + nx * h * out, my + ny * h * out], A, lift: g.lift * p.gw + Math.max(0, side === 'left' ? p.liftL : p.liftR) * 0.25 };
      }

      this.frame = { pelvis, torso, head, hair, arms, legs, farSide };
      this.stepScarf(dt);
    }

  }

  window.MimoCoast.FamilyFigure = FamilyFigure;
})();
