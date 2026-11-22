/* Mimo hüpft · Kinderzimmer (3D) · camera
   Two cameras in one. On the main way it rides a rail: fixed, designed angles. As soon as Mimo leaves
   the way or walks back along it, it becomes an explorer camera that swings behind wherever he runs.
   In both modes it stays inside the room and never lets furniture hide Mimo. */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  // Turns away from the wanted angle the camera may try when a wall is in the way, smallest first
  const YAW_TRIES = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.75, -1.75, 2.1, -2.1, 2.45, -2.45, 2.8, -2.8, Math.PI];
  const CAM = {
    yawRate: 3.5, exploreYawRate: 7, shapeRate: 3,
    yawSpeed: 1.6, exploreYawSpeed: 2.4,  // the camera never turns faster than this (rad/s), so changing modes cannot whip it round
    focusRate: 6, lookAhead: 1.6,
    airUp: 2.6, airDown: 0.4,             // in the air the camera only follows Mimo's height outside this window
    tallDist: 1.25, tallUp: 1.15,         // upright phone: a bit farther and higher
    stickiness: 0.5,                      // how much the wall avoidance prefers the turn it used last time
    areaSlack: 3, railBand: 6,
    railNear: 3.5, railFar: 7,            // nearer than this to the main way: rail camera; farther: explorer camera
    backHold: 0.5, fwdHold: 0.4,          // walking back along the way this long starts exploring; walking on along it ends it
    followGain: 1.7, followMax: 2.1,      // how eagerly the explorer camera swings behind Mimo (per radian; cap in rad/s)
    bigTurn: 2.0, bigHold: 0.35,          // running towards the camera: wait a moment before the big swing
    exploreDist: 1.15, exploreUp: 1.4,    // the explorer camera sits a bit farther away and clearly higher
    leadSide: 1.3, leadRate: 2.5,         // the picture shifts a little towards where Mimo runs
    relatch: 0.4,                         // change of stick direction (rad) that counts as a new command
    lifts: [0, 3, 6, 10], shares: [1, 0.85, 0.7], lastShare: 0.35,
    hideHold: 0.3, clearHold: 1.2,        // Mimo must be hidden this long before the camera gives way, and free this long before it returns
    liftSpeed: 5, shareSpeed: 0.9,        // and never faster than this (units and share of the distance per second)
    avoidRate: 3, returnRate: 1.5,        // how fast it gives way and how gently it comes back
    winTurn: 0.9, winDist: 0.62, winUp: 0.6,
    moving: 0.3,                          // share of the run speed from which Mimo counts as running somewhere
  };
  // Looking around by hand (finger or mouse). The camera stays where the player turned it while Mimo
  // stands; once he has run for `hold` seconds it goes back to its own way, `back` radians per second
  // on the rail. While turned by hand it comes closer in front of a wall instead of turning away.
  const LOOK = { hold: 1.0, back: 0.9, fitRate: 4, minDist: 1.0 };

  function makeCamera(THREE, deps) {
    const { p, S, PH, level, camBlocks } = deps;
    const { clamp, lerp, damp, smooth, angDiff } = Room3D.util;
    const nodes = level.camNodes;
    const pos = new THREE.Vector3(), look = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), centre = new THREE.Vector3(), pivot = new THREE.Vector3();
    const introPos = new THREE.CatmullRomCurve3(level.intro.pos.map((v) => new THREE.Vector3(...v))), introLook = new THREE.CatmullRomCurve3(level.intro.look.map((v) => new THREE.Vector3(...v)));
    let yaw = nodes[0].yaw, dist = nodes[0].dist, height = nodes[0].h, lookY = nodes[0].look;
    let explore = false, exploreW = 0, freeYaw = 0, backT = 0, fwdT = 0, bigT = 0, lead = 0, yawOff = 0;
    let lift = 0, share = 1, wantLift = 0, wantShare = 1, hideT = 0, clearT = 0;
    let latched = false, latchX = 0, latchY = 0, ctrl = 0, lastCtrl = 0;
    let manual = 0, lookT = Infinity, fitD = Infinity, lastFull = Infinity;
    const api = { pos, look, tall: false };
    const byHand = () => lookT < LOOK.hold;

    // Nearest point of the rail: framing there, how far away Mimo is, and which way the rail runs
    function railAt(x, z) {
      let best = null, bestD = Infinity;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1], ex = b.x - a.x, ez = b.z - a.z;
        const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez), 0, 1), dx = x - (a.x + ex * t), dz = z - (a.z + ez * t);
        let d = dx * dx + dz * dz;
        // a rail that says how high it runs (a flight, the bed top) does not count for Mimo far below or above it
        if (a.y != null && b.y != null) { const dy = Math.abs(p.y - lerp(a.y, b.y, t)) - CAM.railBand; if (dy > 0) d += dy * dy; }
        if (d < bestD) { bestD = d; best = [a, b, smooth(t)]; }
      }
      const [a, b, t] = best, len = Math.hypot(b.x - a.x, b.z - a.z);
      return { yaw: lerp(a.yaw, b.yaw, t), dist: lerp(a.dist, b.dist, t), h: lerp(a.h, b.h, t), look: lerp(a.look, b.look, t), off: Math.sqrt(bestD), dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, area: Math.min(a.area || 0, b.area || 0) };
    }
    // The wanted angle may point through a wall: take the smallest turn that keeps the camera in the room
    function roomYaw(base, d) {
      const b = level.bounds; let best = 0, bestCost = Infinity;
      for (const off of YAW_TRIES) {
        const cx = p.x - Math.sin(base + off) * d, cz = p.z + Math.cos(base + off) * d;
        if (cx < b.x0 || cx > b.x1 || cz < b.z0 || cz > b.z1) continue;
        const cost = Math.abs(off) + CAM.stickiness * Math.abs(off - yawOff);
        if (cost < bestCost) { bestCost = cost; best = off; }
      }
      yawOff = best;
      return base + best;
    }
    // Does the straight line from a to b pass through one of the big boxes?
    function blocked(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      for (const k of camBlocks) {
        let t0 = 0, t1 = 1;
        if (Math.abs(dx) < 1e-9) { if (a.x < k.x0 || a.x > k.x1) continue; } else { const u = (k.x0 - a.x) / dx, v = (k.x1 - a.x) / dx; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); if (t0 > t1) continue; }
        if (Math.abs(dy) < 1e-9) { if (a.y < k.y0 || a.y > k.y1) continue; } else { const u = (k.y0 - a.y) / dy, v = (k.y1 - a.y) / dy; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); if (t0 > t1) continue; }
        if (Math.abs(dz) < 1e-9) { if (a.z < k.z0 || a.z > k.z1) continue; } else { const u = (k.z0 - a.z) / dz, v = (k.z1 - a.z) / dz; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); if (t0 > t1) continue; }
        return true;
      }
      return false;
    }
    // Soft approach with a speed limit: a far-away target must not make the camera lurch
    const ease = (value, target, rate, maxSpeed, dt) => value + clamp((target - value) * (1 - Math.exp(-rate * dt)), -maxSpeed * dt, maxSpeed * dt);
    // Is Mimo visible from the camera spot that is `up` higher and at `part` of the full distance?
    function seen(up, part) { tmpA.lerpVectors(pivot, pos, part); tmpA.y += up; return !blocked(centre, tmpA); }
    // If furniture hides Mimo: first try looking over it from higher up, then come closer.
    // skipPlain: the camera has already given way; it must not hop straight back to the normal spot.
    function findClearSpot(skipPlain) {
      for (const up of CAM.lifts) for (const part of CAM.shares) if (!(skipPlain && up === 0 && part === 1) && seen(up, part)) { wantLift = up; wantShare = part; return; }
      wantLift = 0; wantShare = CAM.lastShare;
    }
    // Walking past something hides Mimo only for a blink, and a camera that reacts to every blink twitches.
    // So it gives way only when he stays hidden, keeps the spot it found while that still works, and goes
    // back only after the normal view has been free for a while.
    function avoid(dt) {
      centre.set(p.x, p.y + 0.5, p.z); pivot.set(p.x, S.focusY + 1, p.z);
      const away = wantLift > 0 || wantShare < 1;
      if (!seen(wantLift, wantShare)) { clearT = 0; hideT += dt; if (hideT > CAM.hideHold) { findClearSpot(away); hideT = 0; } }
      else {
        hideT = 0;
        clearT = away && seen(0, 1) ? clearT + dt : 0;
        if (clearT > CAM.clearHold) { wantLift = 0; wantShare = 1; clearT = 0; }
      }
      const rate = away ? CAM.avoidRate : CAM.returnRate;
      lift = ease(lift, wantLift, rate, CAM.liftSpeed, dt); share = ease(share, wantShare, rate, CAM.shareSpeed, dt);
    }
    // How far the camera can be behind the focus point along this angle before it would leave the room
    function roomRoom(fx, fz, sn, cs) {
      const b = level.bounds, dx = -sn, dz = cs; let d = Infinity;
      if (dx > 1e-6) d = Math.min(d, (b.x1 - fx) / dx); else if (dx < -1e-6) d = Math.min(d, (b.x0 - fx) / dx);
      if (dz > 1e-6) d = Math.min(d, (b.z1 - fz) / dz); else if (dz < -1e-6) d = Math.min(d, (b.z0 - fz) / dz);
      return Math.max(LOOK.minDist, d);
    }
    function place(dt) {
      const sn = Math.sin(yaw), cs = Math.cos(yaw), fx = p.x + cs * lead, fz = p.z + sn * lead;
      const full = dist * (api.tall ? CAM.tallDist : 1), room = roomRoom(fx, fz, sn, cs);
      // coming closer happens at once (the wall must never get between), moving back out is gentle
      // (only when turned by hand: otherwise roomYaw already keeps the camera in the room by turning)
      // the gentle way back is only for a camera that really was pulled in; normal distance changes pass straight through
      const fit = byHand() ? Math.min(full, room) : full, pulledIn = fitD < lastFull - 0.01;
      fitD = dt && fit > fitD && pulledIn ? damp(fitD, fit, LOOK.fitRate, dt) : fit;
      lastFull = full;
      const d = Math.min(full, fitD);
      pos.set(fx - sn * d, S.focusY + height * (api.tall ? CAM.tallUp : 1), fz + cs * d);
      look.set(fx + sn * CAM.lookAhead, S.focusY + lookY, fz - cs * CAM.lookAhead);
    }
    function snap() {
      const r = railAt(p.x, p.z);
      explore = r.off > (r.area || CAM.railFar); exploreW = explore ? 1 : 0; yawOff = 0; lead = 0; backT = fwdT = bigT = 0; latched = false;
      manual = 0; lookT = Infinity; fitD = Infinity;
      dist = r.dist * lerp(1, CAM.exploreDist, exploreW); height = r.h * lerp(1, CAM.exploreUp, exploreW); lookY = r.look;
      yaw = freeYaw = roomYaw(r.yaw, dist); S.focusY = p.y;
      place(); centre.set(p.x, p.y + 0.5, p.z); pivot.set(p.x, S.focusY + 1, p.z); findClearSpot(); lift = wantLift; share = wantShare; hideT = clearT = 0;
    }
    function step(dt) {
      const r = railAt(p.x, p.z), speed = Math.hypot(p.vx, p.vz), moving = speed > PH.RUN * CAM.moving, win = S.state === 'win';
      // which camera: rail or explorer
      const along = moving ? (p.vx * r.dx + p.vz * r.dz) / speed : 0;
      // an area node holds the rail camera for a whole place (an arena), whichever way Mimo runs there
      // (it lets go a little farther out than it takes hold, so it does not flip at the edge)
      if (r.area) explore = r.off > r.area + (explore ? 0 : CAM.areaSlack);
      else if (r.off > CAM.railFar) explore = true;
      else {
        backT = along < -0.5 ? backT + dt : 0; if (backT > CAM.backHold) explore = true;
        fwdT = r.off < CAM.railNear && along > 0.5 ? fwdT + dt : 0; if (fwdT > CAM.fwdHold) explore = false;
      }
      exploreW = damp(exploreW, explore ? 1 : 0, CAM.shapeRate, dt);
      // a turn by hand counts down only while Mimo runs; after that the rail angle comes back gently
      if (moving) lookT += dt;
      if (moving && !byHand()) manual -= clamp(manual, -LOOK.back * dt, LOOK.back * dt);
      // angle: the explorer camera turns towards the way Mimo runs, the rail camera takes the designed angle
      if (!explore) freeYaw = yaw;
      else if (moving && !byHand()) {
        const diff = angDiff(freeYaw, Math.atan2(p.vx, -p.vz));
        bigT = Math.abs(diff) > CAM.bigTurn ? bigT + dt : 0;
        if (Math.abs(diff) <= CAM.bigTurn || bigT > CAM.bigHold) freeYaw += clamp(diff * CAM.followGain, -CAM.followMax, CAM.followMax) * Math.min(1, speed / PH.RUN) * dt;
      }
      const base = (explore ? freeYaw : r.yaw + manual) + (win ? CAM.winTurn : 0);
      // turned by hand, the angle is the player's: no turning away from walls (place() comes closer instead)
      const wanted = byHand() ? base : roomYaw(base, dist);
      yaw = ease(yaw, yaw + angDiff(yaw, wanted),explore ? CAM.exploreYawRate : CAM.yawRate, explore ? CAM.exploreYawSpeed : CAM.yawSpeed, dt);
      // S.camZoom: a section may ask for a wider view for a while (riding the robot)
      dist = damp(dist, r.dist * lerp(1, CAM.exploreDist, exploreW) * (win ? CAM.winDist : 1) * (S.camZoom || 1), CAM.shapeRate, dt);
      height = damp(height, r.h * lerp(1, CAM.exploreUp, exploreW) * (win ? CAM.winUp : 1) * (S.camZoom || 1), CAM.shapeRate, dt);
      lookY = damp(lookY, r.look, CAM.shapeRate, dt);
      // follow Mimo's height on the ground at once, in the air only when he leaves a calm window
      const target = p.grounded ? p.y : clamp(S.focusY, p.y - CAM.airUp, p.y + CAM.airDown);
      S.focusY = damp(S.focusY, target, CAM.focusRate, dt);
      const sideways = (p.vx * Math.cos(yaw) + p.vz * Math.sin(yaw)) / PH.RUN;
      lead = damp(lead, S.state === 'play' ? clamp(sideways, -1, 1) * CAM.leadSide : 0, CAM.leadRate, dt);
      place(dt);
      avoid(dt);
      if (share < 0.995) pos.lerpVectors(pivot, pos, share);
      pos.y += lift;
      if (S.state === 'intro') {
        const u = smooth(clamp(S.t / level.intro.time, 0, 1)), blend = smooth(clamp((u - 0.8) / 0.2, 0, 1));
        introPos.getPoint(u, tmpA).lerp(pos, blend); introLook.getPoint(u, tmpB).lerp(look, blend);
        pos.copy(tmpA); look.copy(tmpB);
      }
    }
    // The angle the stick is read against. On the rail that is simply the camera. While exploring, the
    // angle is held as long as the stick points the same way: the camera may swing behind Mimo without
    // bending his path. A new direction on the stick takes the camera's angle of that moment.
    function controlYaw(ix, iy) {
      const len = Math.hypot(ix, iy);
      if (len < 0.2) latched = false;
      else if (latched) {
        const turned = (ix * latchX + iy * latchY) / (len * Math.hypot(latchX, latchY)) < Math.cos(CAM.relatch);
        if (turned && explore) { ctrl = yaw; latchX = ix; latchY = iy; } else if (turned) latched = false;
      } else if (explore) { latched = true; ctrl = yaw; latchX = ix; latchY = iy; }
      lastCtrl = latched ? ctrl : yaw;
      return lastCtrl;
    }
    // Turn the camera round Mimo by hand (radians, positive looks to the right)
    function turn(d) {
      if (S.state !== 'play' || !d) return;
      yaw += d; lookT = 0;
      if (explore) freeYaw += d; else manual = angDiff(0, manual + d);
    }
    // Turn the camera so it looks from behind Mimo towards a place (after a scene: towards the next goal)
    function face(x, z) { turn(angDiff(yaw, Math.atan2(x - p.x, -(z - p.z)))); }
    return Object.assign(api, { snap, step, turn, face, byHand,controlYaw,yaw: () => yaw, avoidState: () => [lift, share, wantLift, wantShare], lastControlYaw: () => lastCtrl, exploring: () => explore });
  }

  Room3D.makeCamera = makeCamera;
})();
