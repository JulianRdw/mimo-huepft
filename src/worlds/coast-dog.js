// World 4: the cream retriever, ported from the approved jointed pet of the Bad Nenndorf branch (src/nenndorf/figuren/
// pets.js, pets-draw.js, rig-math.js): same colours, proportions, digitigrade legs, gaits (walk, trot, run), poses, springy
// tail chain and floppy ears. Changes for this game: only this species, the blink comes from a seeded counter (no
// Math.random, so a level replays exactly), a "dig" pose with scratching front paws, an item in the mouth (carryDraw).
// The cast entry { who: 'dog', act: 'stand' | 'run' | 'fetch' | 'dig' | 'dogpaddle', carry, scale } is drawn through
// MimoCoast.dogUpdate / dogDraw (adapter at the end of the file). One figure per entry, stepped in update() only on screen.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const SPRING_STEP = 1 / 240;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // Cubic curve through the shoulder towards the elbow and on to the wrist; the elbow becomes a soft bend.
  function armCurve(S, E, W, k = 0.74) {
    const c1 = lerpP(S, E, k), c2 = lerpP(W, E, k);
    return (t) => {
      const u = 1 - t;
      return [
        u * u * u * S[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * W[0],
        u * u * u * S[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * W[1],
      ];
    };
  }
  function pointNormal(pts, i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  }
  // Tube along points with per-point width: one outline around the whole shape, round ends unless caps = false.
  function tube(ctx, pts, widths, fill, stroke, outline, caps = true) {
    const [capStart, capEnd] = Array.isArray(caps) ? caps : [caps, caps];
    const n = pts.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const nr = pointNormal(pts, i), h = widths[i] / 2;
      left.push([pts[i][0] + nr[0] * h, pts[i][1] + nr[1] * h]);
      right.push([pts[i][0] - nr[0] * h, pts[i][1] - nr[1] * h]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    const nE = pointNormal(pts, n - 1), aE = Math.atan2(nE[1], nE[0]);
    if (capEnd) ctx.arc(pts[n - 1][0], pts[n - 1][1], widths[n - 1] / 2, aE, aE - Math.PI, true);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    const n0 = pointNormal(pts, 0), a0 = Math.atan2(n0[1], n0[0]);
    if (capStart) ctx.arc(pts[0][0], pts[0][1], widths[0] / 2, a0 + Math.PI, a0, true);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; ctx.lineWidth = outline * 2; ctx.stroke();
    ctx.fillStyle = fill; ctx.fill();
  }

  // Damped spring (second order). freq in Hz, zeta < 1 overshoots.
  class Spring {
    constructor(value, freq, zeta) { this.x = value; this.v = 0; this.freq = freq; this.zeta = zeta; }
    step(target, dt) {
      const w = TAU * this.freq;
      let left = dt;
      while (left > 1e-6) {
        const h = Math.min(SPRING_STEP, left);
        this.v += (w * w * (target - this.x) - 2 * this.zeta * w * this.v) * h;
        this.x += this.v * h;
        left -= h;
      }
      return this.x;
    }
  }


  const SPECIES = {
    creamRetriever: {
      kind: 'dog', len: 24, height: 14.5, head: 7.4, line: 1.2,
      c: { fill: '#F5E9D6', shade: '#E3D0B4', line: '#B49A88', ear: '#EBD3AE', nose: '#3A3036', tongue: '#F08FA0', harness: '#55525F', muzzle: null },
      speeds: { walk: 40, trot: 85, run: 190 }, accel: 320, brake: 520,
    },
  };

  // Leg phase offsets [left hind, left front, right hind, right front]; duty = share of the cycle on the ground
  const GAITS = {
    walk: { phase: [0, 0.25, 0.5, 0.75], duty: 0.64, stride: 0.38, lift: 0.17, bob: 0.22, nod: 5, flex: 0 },
    trot: { phase: [0, 0.5, 0.5, 0], duty: 0.48, stride: 0.52, lift: 0.24, bob: 0.4, nod: 3, flex: 0.03 },
    run: { phase: [0, 0.6, 0.1, 0.7], duty: 0.34, stride: 0.82, lift: 0.3, bob: 0.9, nod: 2, flex: 0.18 },
  };

  // Body shape per pose (units of body height h; neck = head angle in degrees, 0 forward, 90 up)
  const POSES = {
    stand: { hipY: 1.0, chestY: 1.0, neck: 48, hindFold: 0, frontFold: 0, pull: 0, reach: 0, tailUp: 0.35, tailCurl: 0 },
    sit: { hipY: 0.4, chestY: 1.3, neck: 58, hindFold: 1, frontFold: 0, pull: 0.32, reach: 0.05, tailUp: -0.7, tailCurl: 1 },
    lie: { hipY: 0.4, chestY: 0.5, neck: 30, hindFold: 1, frontFold: 1, pull: 0, reach: 0.3, tailUp: -0.5, tailCurl: 0.4 },
    stretch: { hipY: 1.08, chestY: 0.5, neck: 15, hindFold: 0, frontFold: 0.6, pull: 0, reach: 0.4, tailUp: 1.1, tailCurl: 0 },
    sniff: { hipY: 1.0, chestY: 0.84, neck: -40, hindFold: 0, frontFold: 0, pull: 0, reach: 0, tailUp: 0.5, tailCurl: 0 },
    grab: { hipY: 1.0, chestY: 0.76, neck: -40, hindFold: 0, frontFold: 0, pull: 0, reach: 0.05, tailUp: 0.6, tailCurl: 0 },
    dig: { hipY: 1.12, chestY: 0.7, neck: -48, hindFold: 0, frontFold: 0, pull: 0, reach: 0, tailUp: 0.7, tailCurl: 0 },
    crouch: { hipY: 0.72, chestY: 0.78, neck: 40, hindFold: 0.35, frontFold: 0, pull: 0, reach: 0, tailUp: 0.5, tailCurl: 0 },
  };

  // stance (on the ground, sliding back) then swing (lifted forward): fwd -1..1, lift 0..1
  function footPhase(u, duty) {
    const v = ((u % 1) + 1) % 1;
    if (v < duty) return { fwd: 1 - (2 * v) / duty, lift: 0 };
    const s = (v - duty) / (1 - duty);
    const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    return { fwd: -1 + 2 * e, lift: Math.sin(Math.PI * s) };
  }

  // two-bone IK: middle joint for a chain from a to b; dir +1 bends forward (x), -1 backward
  function ik(a, b, l1, l2, dir) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = clamp(Math.hypot(dx, dy), 0.01, l1 + l2 - 0.01);
    const ang = Math.atan2(dy, dx);
    const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const e1 = [a[0] + Math.cos(ang + off) * l1, a[1] + Math.sin(ang + off) * l1];
    const e2 = [a[0] + Math.cos(ang - off) * l1, a[1] + Math.sin(ang - off) * l1];
    return (e1[0] - e2[0]) * dir >= 0 ? e1 : e2;
  }
  const along = (p, len, deg) => [p[0] + Math.sin(deg * DEG) * len, p[1] - Math.cos(deg * DEG) * len]; // 0 deg = straight up

  class PetFigure {
    constructor(key, seed) {
      const sp = SPECIES[key];
      if (!sp) throw new Error(`pets: unknown animal "${key}"`);
      this.key = key; this.sp = sp;
      this.posX = 0; this.vx = 0; this.dir = 1; this.face = 1;
      this.air = 0; this.vy = 0; this.mode = 'ground'; this.modeT = 0; this.jumpPower = 1;
      this.input = { move: 0, gait: 'walk' };
      this.pose = 'stand'; this.nextPose = null; this.poseWait = 0;
      this.t = 0; this.u = 0; this.timeScale = 1;
      this.lookAt = null; this.wagBoost = 0; this.carry = null; this.mouthOpen = 0; this.dropping = false;
      this.seed = (seed >>> 0) || 1; this.nextBlink = 1 + this.rnd() * 3; this.blink = 0; this.dig = false;
      this.offs = GAITS.walk.phase.slice();
      const s = (v, f, z) => new Spring(v, f, z);
      const P = POSES.stand;
      this.s = {
        hipY: s(P.hipY, 3.2, 0.72), chestY: s(P.chestY, 3.2, 0.72), neck: s(P.neck, 3.5, 0.7), pull: s(0, 2.6, 0.85), reach: s(0, 2.6, 0.85),
        hindFold: s(0, 2.8, 0.85), frontFold: s(0, 2.8, 0.85), tailUp: s(P.tailUp, 2.4, 0.6), tailCurl: s(0, 2, 0.9),
        gait: s(0, 3.5, 1), ear: s(0, 4.5, 0.25), earY: s(0, 4.5, 0.3), wag: s(0, 2, 1), tailLag: s(0, 3, 0.4),
      };
      this.p = null;
      this.update(0);
    }

    rnd() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; } // no Math.random: every picture replays the same
    setMove(dir, gait = 'walk') { this.input = { move: Math.sign(dir), gait }; }
    // lying down and getting up go through sitting, like real animals
    setPose(name) {
      if (!POSES[name] || name === this.pose || name === this.nextPose) return;
      const viaSit = (name === 'lie' && this.pose === 'stand') || (this.pose === 'lie' && name === 'stand');
      if (viaSit) { this.pose = 'sit'; this.nextPose = name; this.poseWait = 0.45; }
      else { this.pose = name; this.nextPose = null; }
    }
    jump(power = 1) {
      if (this.mode !== 'ground') return;
      this.mode = 'crouch'; this.modeT = 0; this.jumpPower = power; this.pose = 'stand'; this.nextPose = null;
    }
    happy(amount = 1) { this.wagBoost = Math.max(this.wagBoost, amount); }

    // ------------------------------------------------------------ simulation
    update(dtReal) {
      const dt = Math.min(dtReal, 0.1) * this.timeScale;
      this.t += dt;
      const sp = this.sp, st = (k, v) => this.s[k].step(v, dt);
      this.stepBody(dt);

      // turning: the drawing flips through a narrow side-on moment instead of jumping
      this.face += clamp(this.dir - this.face, -dt * 11, dt * 11);

      const speed = Math.abs(this.vx);
      const gaitName = speed > sp.speeds.trot * 1.2 ? 'run' : speed > sp.speeds.walk * 1.25 ? 'trot' : 'walk';
      this.gaitName = gaitName;
      const G = GAITS[gaitName];
      for (let i = 0; i < 4; i++) this.offs[i] += (G.phase[i] - this.offs[i]) * clamp(dt * 5, 0, 1);
      const strideLen = sp.len * G.stride * 2;
      if (this.mode === 'ground') this.u += (speed * dt) / Math.max(strideLen, 1);
      const gw = st('gait', this.mode === 'ground' ? clamp(speed / (sp.speeds.walk * 0.4), 0, 1) : 0);

      if (this.nextPose && (this.poseWait -= dt) <= 0) { this.pose = this.nextPose; this.nextPose = null; }
      const moving = this.input.move || speed > 3;
      const poseName = this.mode === 'crouch' || this.mode === 'land' ? 'crouch' : moving && this.pose !== 'grab' ? 'stand' : this.pose;
      const P = POSES[poseName];
      const look = this.lookAt === null ? 0 : clamp(((this.lookAt - this.posX) * this.dir) / 40, -1, 1);
      this.wagBoost = Math.max(0, this.wagBoost - dt * 0.35);

      const w2 = this.u * TAU * 2;
      const run = gaitName === 'run' ? gw : 0;
      const flex = G.flex * run * Math.sin(this.u * TAU);
      const air = this.mode === 'air';
      const rising = air && this.vy > 0;
      const prevHipBob = this.p ? this.p.hipBob : 0;
      const p = {
        gw, G, flex, look,
        hipBob: -G.bob * gw * Math.sin(w2) - flex * 2.5,
        chestBob: -G.bob * gw * Math.sin(w2 + Math.PI * 0.55) + flex * 2.5,
        hipY: st('hipY', P.hipY + (air ? (rising ? -0.05 : 0.05) : 0)),
        chestY: st('chestY', P.chestY + (air ? (rising ? 0.22 : -0.1) : 0)),
        neck: st('neck', P.neck + (this.carry ? 10 : 0) + (air ? 15 : 0) + look * 8) + G.nod * gw * Math.sin(w2 + 1.2),
        pull: st('pull', P.pull), reach: st('reach', P.reach),
        hindFold: st('hindFold', P.hindFold), frontFold: st('frontFold', P.frontFold),
        tailUp: st('tailUp', P.tailUp + (this.wagBoost > 0.2 ? 0.45 : 0) + (sp.kind === 'cat' && gw > 0.3 ? 0.8 : 0) + (sp.kind === 'dog' ? 0.25 * gw : 0)),
        tailCurl: st('tailCurl', sp.kind === 'cat' ? P.tailCurl : 0),
        wag: st('wag', sp.kind === 'dog' ? clamp(0.25 + this.wagBoost + gw * 0.25, 0, 1.2) * (this.pose === 'lie' ? 0.4 : 1) : 0.3),
        tailLag: st('tailLag', clamp(-this.vy * 0.004 - prevHipBob * 0.15, -0.5, 0.5)),
      };
      p.ear = st('ear', -this.vx * 0.01 - this.vy * 0.004 + p.chestBob * 0.15);
      p.earY = st('earY', this.vy * 0.01 + p.chestBob * 0.3);
      this.p = p;

      const pant = sp.kind === 'dog' && (gw > 0.3 || this.wagBoost > 0.3 || this.mode !== 'ground');
      this.mouthOpen = lerp(this.mouthOpen, this.carry ? 0.55 : this.dropping ? 1 : pant ? 1 : sp.kind === 'dog' ? 0.55 : 0, clamp(dt * 8, 0, 1));
      this.pant = sp.kind === 'dog' ? Math.sin(this.t * TAU * (pant ? 3.2 : 1.4)) : 0;
      this.nextBlink -= dt;
      if (this.blink > 0) this.blink -= dt;
      if (this.nextBlink <= 0) { this.blink = 0.13; this.nextBlink = 2 + this.rnd() * 4; }
      this.solve();
    }

    stepBody(dt) {
      const sp = this.sp;
      const want = this.mode === 'crouch' ? 0 : this.input.move * (sp.speeds[this.input.gait] || sp.speeds.walk);
      if (this.input.move && this.mode === 'ground') {
        this.dir = this.input.move;
        if (this.pose !== 'stand' && this.pose !== 'grab') { this.pose = 'stand'; this.nextPose = null; }
      }
      const braking = Math.abs(want) < Math.abs(this.vx) || Math.sign(want) !== Math.sign(this.vx);
      const acc = (this.mode === 'air' ? 60 : braking ? sp.brake : sp.accel) * dt;
      this.vx += clamp(want - this.vx, -acc, acc);
      this.posX += this.vx * dt;
      this.modeT += dt;
      if (this.mode === 'crouch' && this.modeT > 0.16) {
        // push off: up and a little forward
        this.mode = 'air'; this.modeT = 0;
        this.vy = (sp.kind === 'cat' ? 165 : 175) * this.jumpPower;
        this.vx += this.dir * 25 * this.jumpPower;
      } else if (this.mode === 'air') {
        this.vy -= 880 * dt; this.air += this.vy * dt;
        if (this.air <= 0 && this.vy < 0) {
          this.air = 0; this.mode = 'land'; this.modeT = 0;
          this.s.chestY.v -= 6; this.s.hipY.v -= 3; this.s.neck.v -= 60;
        }
      } else if (this.mode === 'land' && this.modeT > 0.18) {
        this.mode = 'ground'; this.modeT = 0;
      }
    }

    // ------------------------------------------------------------ kinematics (local: facing right, ground y = 0, up = -y)
    solve() {
      const sp = this.sp, p = this.p, L = sp.len, h = sp.height, air = this.air;
      const hip = [-L * 0.36, -h * p.hipY - air + p.hipBob * 0.6];
      // sitting pulls the chest back over the hips, so the animal sits upright and compact
      const chest = [L * 0.3 - p.pull * L, -h * p.chestY - air + p.chestBob * 0.6];
      const mid = [(hip[0] + chest[0]) / 2, (hip[1] + chest[1]) / 2 - h * 0.08 + p.flex * h * 0.6];
      const isDog = sp.kind === 'dog';
      const neckBase = [chest[0] + L * 0.06, chest[1] - h * (isDog ? 0.32 : 0.25)];
      const neckLen = h * (isDog ? 0.62 : 0.5);
      const head = [neckBase[0] + Math.cos(p.neck * DEG) * neckLen, neckBase[1] - Math.sin(p.neck * DEG) * neckLen];
      const headTilt = clamp(-(p.neck - 48) * 0.5, -25, 48) * DEG;

      const legs = [];
      for (let i = 0; i < 4; i++) legs.push(this.leg(i, hip, chest));

      // tail: segments from the rump; dogs wag, cats swish; cats wrap it round the paws when sitting
      const tailBase = [hip[0] - L * 0.08, hip[1] - h * 0.2];
      const segs = isDog ? 4 : 6, segLen = isDog ? L * 0.085 : L * 0.11;
      const wagSpeed = isDog ? 2.6 + p.wag * 1.5 : 0.5;
      const tail = [tailBase];
      let ang = Math.PI - 0.9 * p.tailUp + p.tailLag;
      for (let k = 1; k <= segs; k++) {
        const sway = Math.sin(this.t * TAU * wagSpeed - k * 0.7) * (isDog ? 0.42 * p.wag : 0.16) * (k / segs);
        const curl = isDog ? -0.26 * p.tailUp - 0.08 : -0.2 * Math.max(0, p.tailUp) * (1 - p.tailCurl) + 0.55 * p.tailCurl;
        ang += curl + sway;
        const prev = tail[k - 1];
        tail.push([prev[0] + Math.cos(ang) * segLen, Math.min(prev[1] - Math.sin(ang) * segLen, -0.8)]);
      }
      this.f = { hip, chest, mid, neckBase, head, headTilt, legs, tail };
    }

    // one leg: i = 0 left hind, 1 left front, 2 right hind, 3 right front; right = near side
    leg(i, hip, chest) {
      const sp = this.sp, p = this.p, L = sp.len, h = sp.height;
      const front = i % 2 === 1, near = i >= 2;
      const top = front ? [chest[0] + 0.5, chest[1] + h * 0.12] : [hip[0] + 1, hip[1] + h * 0.12];
      top[0] += near ? 0.7 : -0.7;
      const fp = footPhase(this.u + this.offs[i], p.G.duty);
      const stride = L * p.G.stride * 0.5 * p.gw;
      const lift = p.G.lift * h * fp.lift * p.gw;
      let paw = [top[0] + (front ? 0.6 : -0.4) + fp.fwd * stride, -lift];
      let flexPaw = fp.lift * p.gw; // 0..1, how far the paw curls while swinging
      if (this.dig && front) { const sw = Math.sin(this.t * TAU * 2.6 + (near ? Math.PI : 0)); paw = [top[0] + 3.2 + sw * 3.4, -Math.max(0, -sw) * h * 0.4]; flexPaw = Math.max(0, -sw); }
      const air = this.mode === 'air';
      if (air) {
        // in the air: rising = front tucked, hind pushing back; falling = front reaches for the ground
        const rising = this.vy > 0;
        paw = front
          ? (rising ? [top[0] + 2.5, top[1] + h * 0.55] : [top[0] + 4, top[1] + h * 0.85])
          : (rising ? [top[0] - 4.5, top[1] + h * 0.8] : [top[0] - 1.5, top[1] + h * 0.72]);
        flexPaw = front && rising ? 1 : 0.2;
      }
      const fold = front ? p.frontFold : p.hindFold;
      if (fold > 0 && !air) {
        const folded = front ? [top[0] + L * (0.18 + p.reach), 0] : [top[0] + L * 0.26, 0];
        paw = lerpP(paw, folded, fold);
      }
      let joints;
      if (front) {
        const upper = h * 0.34, fore = h * 0.44, past = h * 0.14;
        // pastern: near upright in stance, flips back when the paw lifts, flat forward when lying
        const lying = clamp(fold * 1.2 - 0.2, 0, 1);
        const pastAng = lerp(-12 - 95 * flexPaw, -90, lying); // direction from the paw up to the wrist
        const wrist = along(paw, past, pastAng);
        const elbow = ik(top, wrist, upper, fore, -1);
        joints = [top, elbow, wrist, paw];
      } else {
        const thigh = h * 0.42, shin = h * 0.4, meta = h * 0.27;
        // metatarsus: leaning back in stance, flat on the ground when sitting
        const metaAng = lerp(-20 - 18 * flexPaw, -90, fold);
        const hock = along(paw, meta, metaAng);
        const knee = ik(top, hock, thigh, shin, 1);
        joints = [top, knee, hock, paw];
      }
      return { i, front, near, joints, paw, fold, flexPaw };
    }

    mouthLocal() { const f = this.f, r = this.sp.head, c = Math.cos(f.headTilt), s = Math.sin(f.headTilt), ox = r * 1.35, oy = r * 0.62; return [f.head[0] + ox * c - oy * s, f.head[1] + ox * s + oy * c]; }
    // world position of the mouth (to carry the ball)
    mouthWorld() {
      const f = this.f, r = this.sp.head, isDog = this.sp.kind === 'dog';
      const ox = r * (isDog ? 1.35 : 0.95), oy = r * (isDog ? 0.62 : 0.4);
      const c = Math.cos(f.headTilt), s = Math.sin(f.headTilt);
      const local = [f.head[0] + ox * c - oy * s, f.head[1] + ox * s + oy * c];
      return [this.posX + local[0] * this.dir, -local[1]];
    }
  }


  // smooth curve through all joints (Catmull-Rom), n samples per segment
  function through(points, n = 5) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
      }
    }
    out.push(points[points.length - 1].slice());
    return out;
  }

  const methods = {
    // x, y: canvas point of the world origin on the ground; zoom: canvas px per world px
    draw(ctx, x, y, zoom) {
      const sp = this.sp, f = this.f;
      ctx.save();
      ctx.translate(x + this.posX * zoom, y);
      const fx = Math.abs(this.face) < 0.3 ? 0.3 * Math.sign(this.face || 1) : this.face;
      ctx.scale(zoom * fx, zoom * (1 + 0.05 * (1 - Math.abs(this.face))));

      const shrink = clamp(1 - this.air / 30, 0.5, 1);
      ctx.fillStyle = `rgba(58,56,80,${0.12 * shrink})`;
      ctx.beginPath(); ctx.ellipse(0, -0.6, sp.len * 0.55 * shrink, 1.1 * shrink, 0, 0, TAU); ctx.fill();

      const far = f.legs.filter((l) => !l.near), near = f.legs.filter((l) => l.near);
      // a sitting cat wraps its tail round the front paws, in front of the body
      const wrapped = sp.kind === 'cat' && this.p.tailCurl > 0.5;
      if (!wrapped) this.drawTail(ctx);
      for (const l of far) this.drawLeg(ctx, l, true);
      this.drawBody(ctx);
      for (const l of near) this.drawLeg(ctx, l, false);
      if (wrapped) this.drawTail(ctx);
      this.drawHead(ctx);
      if (this.carry && this.carryDraw) { const m = this.mouthLocal(); this.carryDraw(ctx, m[0], m[1]); }
      ctx.restore();
    },

    // one smooth tapering limb through all joints, a small paw at the end
    drawLeg(ctx, l, far) {
      const sp = this.sp, c = sp.c, h = sp.height;
      const fill = far ? c.shade : c.fill;
      const top = l.front ? h * 0.42 : h * 0.5;
      const widths = l.front ? [top, h * 0.27, h * 0.22, h * 0.2] : [top, h * 0.3, h * 0.2, h * 0.19];
      // haunch: the thigh shows as a round muscle when the hind leg folds (sitting, lying)
      if (!l.front && l.fold > 0.2) {
        const [t, k] = l.joints;
        ctx.fillStyle = fill; ctx.strokeStyle = c.line; ctx.lineWidth = sp.line;
        ctx.beginPath(); ctx.ellipse((t[0] + k[0]) / 2, (t[1] + k[1]) / 2, h * 0.42 * l.fold, h * 0.34 * l.fold, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
      }
      const pts = through(l.joints, 5);
      const seg = 5;
      const ws = pts.map((_, i) => { const j = Math.min(Math.floor(i / seg), 2), t = (i - j * seg) / seg; return lerp(widths[j], widths[j + 1], t); });
      tube(ctx, pts, ws, fill, c.line, sp.line, [true, false]);
      // paw: points forward on the ground, follows the pastern / metatarsus while lifted
      const [, , w, p] = l.joints;
      const ang = Math.atan2(p[1] - w[1], p[0] - w[0]);
      const lying = l.front && l.fold > 0.6;
      const rot = l.flexPaw > 0.3 || lying ? ang : 0;
      const pawFill = c.white ? c.white : fill;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(rot);
      ctx.fillStyle = pawFill; ctx.strokeStyle = c.line; ctx.lineWidth = sp.line;
      const pw = h * 0.2;
      ctx.beginPath(); ctx.ellipse(pw * 0.45, -pw * 0.35, pw * 1.05, pw * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c.white ? '#D9D0DF' : c.line; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(pw * 0.9, -pw * 0.7); ctx.lineTo(pw * 0.95, -pw * 0.1); ctx.stroke();
      ctx.restore();
    },

    drawHead(ctx) {
      const sp = this.sp, c = sp.c, f = this.f, r = sp.head;
      const nb = f.neckBase, hd = f.head;
      tube(ctx, [nb, lerpP(nb, hd, 0.5), hd], [sp.height * 0.62, sp.height * 0.55, r * 1.1], c.fill, c.line, sp.line);
      ctx.save();
      ctx.translate(hd[0], hd[1]);
      ctx.rotate(f.headTilt);
      this.drawDogHead(ctx, 0, 0, r);
      ctx.restore();
    },

    drawBody(ctx) {
      const sp = this.sp, c = sp.c, f = this.f, h = sp.height;
      const pts = Array.from({ length: 13 }, (_, i) => armCurve(f.hip, f.mid, f.chest, 0.9)(i / 12));
      const widths = pts.map((_, i) => lerp(h * 0.78, h * 0.86, i / 12) * (sp.kind === 'cat' ? 0.95 : 1));
      tube(ctx, pts, widths, c.fill, c.line, sp.line);
      // shade along the belly, sheen along the back
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = c.shade; ctx.lineWidth = h * 0.2;
      ctx.beginPath(); pts.slice(2, 11).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] + h * 0.26) : ctx.moveTo(q[0], q[1] + h * 0.26))); ctx.stroke();
      if (sp.kind === 'cat') {
        ctx.strokeStyle = c.sheen; ctx.lineWidth = 0.6;
        ctx.beginPath(); pts.slice(3, 10).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] - h * 0.26) : ctx.moveTo(q[0], q[1] - h * 0.26))); ctx.stroke();
        if (c.white) {
          ctx.fillStyle = c.white;
          ctx.beginPath(); ctx.ellipse(f.chest[0] + 1.6, f.chest[1] + h * 0.12, h * 0.28, h * 0.32, 0.3, 0, TAU); ctx.fill();
        }
      } else {
        ctx.strokeStyle = '#FFFBF6'; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.8;
        ctx.beginPath(); pts.slice(3, 9).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] - h * 0.28) : ctx.moveTo(q[0], q[1] - h * 0.28))); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (c.harness) {
        // harness: a strap round the chest and one over the shoulders
        ctx.strokeStyle = c.harness; ctx.lineWidth = 1.3;
        const a = lerpP(f.mid, f.chest, 0.45);
        ctx.beginPath(); ctx.moveTo(a[0] - 0.8, a[1] - h * 0.42); ctx.lineTo(a[0] + 0.6, a[1] + h * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.chest[0] + 1.5, f.chest[1] - h * 0.4); ctx.lineTo(f.chest[0] + 2.6, f.chest[1] + h * 0.3); ctx.stroke();
        ctx.fillStyle = '#8E8A9C';
        ctx.beginPath(); ctx.arc(f.chest[0] + 1.6, f.chest[1] - h * 0.32, 0.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },

    drawTail(ctx) {
      const sp = this.sp, c = sp.c, t = this.f.tail, h = sp.height;
      if (sp.kind === 'dog') {
        // feathered golden tail: thick at the base, a lighter fringe underneath
        tube(ctx, t, t.map((_, i) => lerp(h * 0.3, h * 0.2, Math.pow(i / (t.length - 1), 2))), c.fill, c.line, sp.line);
        ctx.strokeStyle = '#FFFBF6'; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
        ctx.beginPath(); t.slice(1).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] + 0.6) : ctx.moveTo(q[0], q[1] + 0.6))); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        tube(ctx, t, t.map((_, i) => lerp(h * 0.2, h * 0.15, i / (t.length - 1))), c.fill, c.line, sp.line);
        if (c.white) { const e = t[t.length - 1]; ctx.fillStyle = c.white; ctx.beginPath(); ctx.arc(e[0], e[1], h * 0.09, 0, TAU); ctx.fill(); }
      }
    },

    drawDogHead(ctx, hx, hy, r) {
      const sp = this.sp, c = sp.c, p = this.p;
      // far ear peeks out behind the head
      this.drawEar(ctx, hx - r * 0.1, hy - r * 0.55, r, c.shade, -0.35);
      ctx.fillStyle = c.fill; ctx.strokeStyle = c.line; ctx.lineWidth = sp.line;
      ctx.beginPath(); ctx.ellipse(hx, hy, r, r * 0.92, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // snout
      const sx = hx + r * 0.85, sy = hy + r * 0.32;
      ctx.fillStyle = c.muzzle || c.fill;
      ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.62, r * 0.45, 0.05, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.fill; ctx.beginPath(); ctx.ellipse(sx - r * 0.42, sy - r * 0.05, r * 0.3, r * 0.38, 0, 0, TAU); ctx.fill();
      // mouth with tongue (panting) or holding the ball
      const open = this.mouthOpen;
      if (open > 0.05) {
        ctx.fillStyle = '#7E3A4E';
        ctx.beginPath(); ctx.ellipse(sx + r * 0.05, sy + r * 0.38, r * 0.3, r * 0.16 * open + 0.2, 0, 0, TAU); ctx.fill();
        if (!this.carry) {
          ctx.fillStyle = c.tongue; ctx.strokeStyle = '#C9667A'; ctx.lineWidth = 0.6;
          const tl = r * (0.35 + 0.35 * open);
          ctx.beginPath(); ctx.ellipse(sx + r * 0.02, sy + r * 0.45 + tl * 0.5, r * 0.2, tl * 0.6, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      ctx.strokeStyle = c.line; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx - r * 0.3, sy + r * 0.3); ctx.quadraticCurveTo(sx, sy + r * 0.45, sx + r * 0.35, sy + r * 0.28); ctx.stroke();
      // nose
      ctx.fillStyle = c.nose;
      ctx.beginPath(); ctx.ellipse(sx + r * 0.58, sy - r * 0.12, r * 0.2, r * 0.16, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(sx + r * 0.53, sy - r * 0.18, r * 0.05, 0, TAU); ctx.fill();
      this.drawEye(ctx, hx + r * 0.35, hy - r * 0.12, r * 0.19, '#2B2630');
      // blush
      ctx.fillStyle = 'rgba(243,163,166,0.55)';
      ctx.beginPath(); ctx.ellipse(hx + r * 0.25, hy + r * 0.3, r * 0.22, r * 0.13, 0, 0, TAU); ctx.fill();
      // near ear: floppy, swings with motion
      this.drawEar(ctx, hx - r * 0.35, hy - r * 0.5, r, c.ear, 0);
    },

    drawEar(ctx, x, y, r, fill, extra) {
      const sp = this.sp, p = this.p;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.25 + clamp(p.ear, -0.6, 0.6) + extra - clamp(p.earY, -0.4, 0.4));
      ctx.fillStyle = fill; ctx.strokeStyle = sp.c.line; ctx.lineWidth = sp.line;
      ctx.beginPath(); ctx.ellipse(-r * 0.05, r * 0.6, r * 0.36, r * 0.72, 0.15, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },

    drawEye(ctx, x, y, r, color, cat) {
      if (this.blink > 0) {
        ctx.strokeStyle = cat ? '#A39CB6' : '#2B2630'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.7, x + r, y); ctx.stroke();
        return;
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r * 0.85, r, 0, 0, TAU); ctx.fill();
      if (cat) { ctx.fillStyle = '#221E2A'; ctx.beginPath(); ctx.ellipse(x + r * 0.1, y, r * 0.28, r * 0.75, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.35, r * 0.32, 0, TAU); ctx.fill();
    }
  };
  Object.assign(PetFigure.prototype, methods);

  // ================= adapter for the cast of world 4 =================
  const ZOOM = 1.0;               // canvas px per figure unit: shoulder about 17 px, a real retriever next to the 52 px adults
  const BOX = { w: 150, h: 110, ox: 75, oy: 100, k: 2 }; // offscreen box for the dusk wash (world px, drawn at twice the resolution)
  let box = null;
  const E = () => window.MimoCoast.storyEnv, SD = () => window.MimoCoast.sdraw;
  const gaitFor = (pxPerSec) => (pxPerSec > 140 ? 'run' : pxPerSec > 60 ? 'trot' : 'walk');
  const figure = (e) => e.pf || (e.pf = new PetFigure('creamRetriever', Math.floor((e.phase + 1) * 100003)));

  // stepped from the story update (not from drawing), so replays and bots see the same dog
  function dogUpdate(e, dt, pos) {
    const env = E(), api = env.api;
    if (e.pf && !env.onScreen(pos.x, pos.foot, 260)) return;
    const pf = figure(e), p = api.p, moving = !!pos.running;
    if (!moving && (e.act === 'stand' || e.act === 'owner') && p && Math.abs(p.x + p.w / 2 - pos.x) < 9 * 32) pos.face = p.x + p.w / 2 >= pos.x ? 1 : -1; // looks at Mimo
    pf.posX = 0; pf.dir = pos.face >= 0 ? 1 : -1; pf.dig = e.act === 'dig';
    if (moving) pf.setMove(pf.dir, gaitFor((e.mv ? e.mv.speed : e.speed || 4) * 32)); else pf.setMove(0);
    pf.setPose(e.act === 'dig' ? 'dig' : e.mood === 'search' ? 'sniff' : e.pose === 'sit' ? 'sit' : 'stand');
    if (e.mood === 'happy') pf.happy(1);
    pf.carry = e.carry || null; pf.carryDraw = e.carry ? (ctx, x, y) => { ctx.save(); ctx.translate(x, y); ctx.scale(0.42, 0.42); SD().carry(ctx, e.carry, api.time); ctx.restore(); } : null;
    pf.update(dt);
  }

  // the hole under the front paws and the sand the paws throw back over the tail
  function dig(ctx, e, pos, z) {
    const a = E().api, t = a.time, f = pos.face >= 0 ? 1 : -1, W = a.W || {};
    // the thrown sand in the world's sand colours (darker in the dark scheme)
    const sandDot = W.groundDot && a.mixHex ? a.mixHex(W.groundDot, '#7A5A32', 0.2) : '#D2B27A', sandDeep = W.groundDot && a.mixHex ? a.mixHex(W.groundDot, '#7A5A32', 0.42) : '#BF9B62';
    ctx.save(); ctx.translate(pos.x, pos.foot);
    ctx.fillStyle = 'rgba(120,92,56,0.55)'; ctx.beginPath(); ctx.ellipse(f * 17 * z / 1.6, -0.5, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const k = (t * 2.3 + i / 7 + e.phase) % 1, x = f * (15 - k * 30 - i), y = -4 - Math.sin(k * Math.PI) * (12 + (i % 3) * 4);
      ctx.globalAlpha = 1 - k * 0.7; ctx.fillStyle = i % 2 ? sandDot : sandDeep; ctx.beginPath(); ctx.arc(x, y, 1.8 + (i % 2) * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // mode 'ground' or 'paddle' (swimming at the surface: the dog hangs 9 px deep, drawn only above the water line)
  function dogDraw(ctx, e, pos, mode) {
    const env = E(), pf = figure(e), z = ZOOM * (e.scale || 1), night = env.night, paddle = mode === 'paddle', sf = paddle ? env.surface() : null;
    if (paddle && sf == null) return;
    if (e.act === 'dig') dig(ctx, e, pos, z);
    const wv = paddle && window.MimoCoast.wave ? window.MimoCoast.wave(pos.x, env.api.time) : 0, foot = paddle ? sf + 9 + wv + Math.sin(env.api.time * 2.2 + e.phase) * 0.6 : pos.foot - (pos.hop || 0);
    // paddling: the whole dog is drawn, what is under the water line fades into it (coast-cast-draw.js)
    if (paddle) { window.MimoCoast.castDraw.drawWet(ctx, { x: pos.x - 70, y: foot - 80, w: 140, h: 80 + 6 }, sf, pos.x, (g) => paint(g, pf, pos.x, foot, z, night)); return; }
    paint(ctx, pf, pos.x, foot, z, night);
  }
  // the dog at (x, foot); at dusk through a scratch canvas with a blue wash (no ctx.filter on old iPhones)
  function paint(ctx, pf, x, foot, z, night) {
    if (!night) { pf.draw(ctx, x, foot, z); return; }
    if (!box) { const cv = document.createElement('canvas'); cv.width = BOX.w * BOX.k; cv.height = BOX.h * BOX.k; box = { cv, g: cv.getContext('2d') }; }
    const g = box.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, box.cv.width, box.cv.height);
    g.save(); g.scale(BOX.k, BOX.k); g.translate(BOX.ox, BOX.oy); pf.draw(g, 0, 0, z); g.restore();
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(30,40,96,' + (0.075 * night) + ')'; g.fillRect(0, 0, box.cv.width, box.cv.height); g.globalCompositeOperation = 'source-over';
    ctx.drawImage(box.cv, x - BOX.ox, foot - BOX.oy, BOX.w, BOX.h);
  }

  Object.assign(window.MimoCoast, { dogUpdate, dogDraw });
  window.MimoWorlds.register({ world: 4, setup() {} });
})();
