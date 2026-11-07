/* Mimo hüpft · Sternenbahn
   A music run: the song plays, Mimo runs to its beat, and every note-star on the track is one note of
   the melody. Song time comes from the audio clock, so sound and picture stay together.
   Needs global THREE (r160), Mimo3D, StarwayCore, StarwayWorld and a host object from the game. */
(function () {
  'use strict';

  const D = 4.6; // world units per beat along the track
  const LW = 1.75; // lane width
  const INTRO_TIME = 2.8, COUNT_BEATS = 3, RESUME_BEATS = 2, END_BEATS = 4;
  const LOOK_AHEAD = 0.3; // seconds of music scheduled in advance
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  const smooth = (k) => k * k * (3 - 2 * k);
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function create(host) {
    const THREE = window.THREE, core = window.StarwayCore;
    if (!THREE || !core || !window.StarwayWorld || !window.Mimo3D) throw new Error('Sternenbahn modules missing');
    const chart = core.build();
    const AU = host.audio, input = host.input, C = host.colors || {};
    const okHex = window.Mimo3D.okHex;
    const reduced = () => !!(host.reduced && host.reduced());
    let fun = Object.assign({}, host.fun || {});
    const rate = host.rate || 1;
    const assisted = rate !== 1 || !!host.invincible || !!(host.fun && host.fun.moon);
    const spb = 60 / (chart.BPM * rate);
    const PAL = {
      ink: okHex(C.mimoInk, '#3A3850'), blush: okHex(C.blush, '#F4B4C0'), thorn: okHex(C.thorn, '#E79AB3'), leaf: okHex(C.leaf, '#9CCDB0'),
      mint: okHex(C.mimoMint, '#A9DCC3'), lav: okHex(C.mimoLav, '#C9B8EA'), star: okHex(C.star, '#F6D374'), peach: okHex(C.mimoPeach, '#F6BFA6'),
    };

    // ---------- Renderer, scene, camera, light ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const canvas = renderer.domElement; canvas.className = 'sky3d';
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color('#E9B3BE'), 34, 118);
    const cam = new THREE.PerspectiveCamera(60, 5 / 3, 0.1, 1200);
    const hemi = new THREE.HemisphereLight(new THREE.Color('#FFE9DC'), new THREE.Color('#6B5E9A'), 1.6);
    const sun = new THREE.DirectionalLight(new THREE.Color('#FFE2C4'), 2.2);
    scene.add(hemi, sun, sun.target);

    const kit = window.Mimo3D.kit(THREE, scene, PAL);
    const world = window.StarwayWorld.create(THREE, { scene, chart, D, LW, kit, PAL, reduced });
    const mimo = window.Mimo3D.build(THREE, Object.assign({ scene, PAL, outfit: host.outfit }, kit));
    // the rescue cloud that catches Mimo after a fall
    const rescue = new THREE.Group(); scene.add(rescue); rescue.visible = false;
    [[0, 0, 0, 0.55], [-0.45, -0.05, 0.05, 0.38], [0.45, -0.04, 0, 0.4], [0, 0.05, -0.35, 0.36]].forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshLambertMaterial({ color: new THREE.Color('#FFFFFF'), emissive: new THREE.Color('#E9E2FF'), emissiveIntensity: 0.4 })); m.position.set(x, y - 0.25, z); m.scale.y = 0.7; rescue.add(m);
    });
    // rainbow trail behind Mimo in the highest combo step: five colour bands that fade out
    const TRAIL_N = 26, BANDS = ['#FF9EB5', '#FFC98A', '#FFF09A', '#9EF0C4', '#9EC8FF', '#C8A8FF'];
    const trailPts = [];
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(BANDS.length * TRAIL_N * 2 * 3), trailCol = new Float32Array(BANDS.length * TRAIL_N * 2 * 4);
    {
      const idx = [];
      for (let b = 0; b < BANDS.length; b++) for (let i = 0; i < TRAIL_N - 1; i++) { const o = (b * TRAIL_N + i) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      trailGeo.setIndex(idx);
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 4));
    }
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    trail.frustumCulled = false; scene.add(trail);
    let trailK = 0;
    function stepTrail(dt, on, x, y, z) {
      trailK = damp(trailK, on ? 1 : 0, on ? 6 : 2.5, dt);
      // a flat rainbow road behind Mimo (seen from above, a ribbon on its side would be invisible)
      const tNow = now();
      trailPts.unshift({ x, y, z, t: tNow }); while (trailPts.length > 2 && tNow - trailPts[trailPts.length - 1].t > 0.42) trailPts.pop();
      if (trailPts.length > TRAIL_N) trailPts.length = TRAIL_N;
      trail.visible = trailK > 0.02 && trailPts.length > 2;
      if (!trail.visible) return;
      const bandW = 0.1, c = new THREE.Color();
      for (let b = 0; b < BANDS.length; b++) {
        c.set(BANDS[b]);
        for (let i = 0; i < TRAIL_N; i++) {
          const p = trailPts[Math.min(i, trailPts.length - 1)], wob = Math.sin(tNow * 10 - i * 0.7) * 0.06 * i / TRAIL_N;
          const xb = p.x + (b - BANDS.length / 2) * bandW + wob, yb = p.y + 0.3 + i * 0.012, o = ((b * TRAIL_N + i) * 2);
          trailPos[o * 3] = xb; trailPos[o * 3 + 1] = yb; trailPos[o * 3 + 2] = p.z + 0.2;
          trailPos[o * 3 + 3] = xb + bandW; trailPos[o * 3 + 4] = yb; trailPos[o * 3 + 5] = p.z + 0.2;
          const a = trailK * (1 - i / (TRAIL_N - 1)) * 0.85;
          for (const v of [o, o + 1]) { trailCol[v * 4] = c.r; trailCol[v * 4 + 1] = c.g; trailCol[v * 4 + 2] = c.b; trailCol[v * 4 + 3] = a; }
        }
      }
      trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    }
    world.bendAll(scene);

    // ---------- Particles (bent like the world) ----------
    const PN = 700;
    const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN).fill(9), pMax = new Float32Array(PN).fill(1), pGrav = new Float32Array(PN);
    const pBase = new Float32Array(PN * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = world.bend(new THREE.PointsMaterial({ size: 0.32, sizeAttenuation: true, vertexColors: true, map: kit.haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; scene.add(pts);
    let pNext = 0;
    const tmpC = new THREE.Color();
    function burst(x, y, z, n, colors, speed, o) {
      const op = o || {};
      if (reduced()) n = Math.ceil(n / 2);
      for (let k = 0; k < n; k++) {
        const i = pNext; pNext = (pNext + 1) % PN;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), sp = speed * (0.4 + Math.random() * 0.6);
        pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
        pVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp + (op.vx || 0); pVel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp * (op.up || 1) + (op.vy || 0); pVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp + (op.vz || 0);
        tmpC.set(colors[k % colors.length]); pBase[i * 3] = tmpC.r; pBase[i * 3 + 1] = tmpC.g; pBase[i * 3 + 2] = tmpC.b;
        pLife[i] = 0; pMax[i] = (op.life || 0.8) * (0.7 + Math.random() * 0.5); pGrav[i] = op.grav == null ? 6 : op.grav;
      }
    }
    function stepParticles(dt) {
      for (let i = 0; i < PN; i++) {
        if (pLife[i] >= pMax[i]) { pPos[i * 3 + 1] = -9999; continue; }
        pLife[i] += dt; pVel[i * 3 + 1] -= pGrav[i] * dt;
        pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        const k = 1 - pLife[i] / pMax[i];
        pCol[i * 3] = pBase[i * 3] * k; pCol[i * 3 + 1] = pBase[i * 3 + 1] * k; pCol[i * 3 + 2] = pBase[i * 3 + 2] * k;
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    }

    // ---------- State ----------
    const S = { state: 'intro', introT: 0, t: -COUNT_BEATS * spb, beat: -COUNT_BEATS, resumeT: 0, endT: 0, reported: false, flash: 0, kick: 0, mushK: 0, shake: 0, prompt: null, count: null, auto: false, section: -1, lastWall: 0, moodT: 0, mood: null, piepT: 0, emote: null, tumble: 0, walk: 0, blink: 2, lean: 0, yaw: 0, sprX: 0, sprV: 0, jig: 0, jigV: 0, armUp: 0, hudKey: '', judged: {} };
    let run = null, pilot = null;
    const prevIn = { left: false, right: false };

    function newRun() {
      run = core.createRun(chart, { onEvent, invincible: !!host.invincible, jumpScale: fun.moon ? 1.3 : 1, startBeat: -COUNT_BEATS });
      pilot = core.createPilot(chart, run);
    }

    // ---------- Audio: clock, band, sounds ----------
    const A = { ctx: null, start: null, nextStep: null, done: -1e9, chainFor: null, inp: null, lp: null };
    const latency = (c) => Math.max(0, (c.outputLatency || c.baseLatency || 0)) + (AU.offset ? AU.offset() : 0);
    function liveCtx() { const c = AU.ctx(); return c && c.state === 'running' ? c : null; }
    function chain(c) {
      const ext = AU.bus ? AU.bus() : null;
      if (!ext) return null;
      if (A.chainFor !== ext.g || !A.inp || A.inp.context !== c) {
        A.chainFor = ext.g;
        A.inp = c.createGain(); A.lp = c.createBiquadFilter(); A.lp.type = 'lowpass'; A.lp.frequency.value = 20000; A.lp.Q.value = 0.8;
        A.inp.connect(A.lp); A.lp.connect(ext.g);
      }
      return { main: A.inp, echo: ext.echo };
    }
    // keep the picture on the audio clock: small drift is eased away, large jumps move the music instead
    function syncClock(dt) {
      const c = liveCtx();
      if (!c) { A.start = null; A.ctx = null; return; }
      const heard = c.currentTime - latency(c);
      if (A.start == null || A.ctx !== c) { const fresh = A.ctx !== c; A.ctx = c; A.start = heard - S.t; A.nextStep = Math.ceil(S.t / (spb / 2) - 1e-6); if (!fresh) A.nextStep = Math.max(A.nextStep, A.done + 1); return; }
      const err = heard - A.start - S.t;
      if (Math.abs(err) <= 0.12) S.t += err * Math.min(1, dt * 3);
      else if (err > 0 && err < 0.6) S.t += err; // the picture fell behind (slow frames): catch up with the music
      else { A.start = heard - S.t; A.nextStep = Math.max(A.done + 1, Math.ceil(S.t / (spb / 2) - 1e-6)); } // audio stalled or jumped: move the music
    }
    function schedule() {
      const c = A.ctx; if (!c || A.start == null) return;
      const lat = latency(c), stepDur = spb / 2, horizon = S.t + lat + LOOK_AHEAD;
      const lastStep = (chart.total + END_BEATS) * 2;
      while (A.nextStep * stepDur <= horizon && A.nextStep <= lastStep) {
        const when = A.start + A.nextStep * stepDur, delay = when - c.currentTime;
        if (delay > -0.05) playStep(A.nextStep, Math.max(0, delay));
        A.done = Math.max(A.done, A.nextStep); A.nextStep++;
      }
    }
    const sectionAt = (beat) => { for (let i = chart.sections.length - 1; i >= 0; i--) if (beat >= chart.sections[i].b0) return chart.sections[i]; return chart.sections[0]; };
    const chordAt = (beat) => { const sec = sectionAt(beat), bar = Math.floor((beat - sec.b0) / 4); return sec.chords[bar % sec.chords.length]; };
    function playStep(k, delay) {
      const beat = k / 2, pos = ((k % 8) + 8) % 8, I = AU.inst, Dr = AU.drum, B = AU.bass;
      const musicOn = AU.music(), ch = chain(A.ctx);
      // count-in clicks, also without music
      if (beat < 0) { if (pos % 2 === 0 && AU.sfx()) Dr.wood(delay, 1.3, AU.fx()); return; }
      if (!musicOn || !ch) return;
      const bus = ch.main, echo = ch.echo, stepDur = spb / 2;
      if (beat >= chart.total) {
        if (beat === chart.total) { const cd = chordAt(chart.total - 1); AU.pad.soft(cd.slice(1), delay, spb * 6, bus); cd.slice(1).forEach((n, i) => I.bell(midi(n + 12), delay + i * 0.06, 1, 0.8, echo)); Dr.timp(delay, 1, bus); }
        return;
      }
      const sec = sectionAt(beat), bar = Math.floor((beat - sec.b0) / 4), lastBar = beat - sec.b0 >= (sec.b1 - sec.b0) - 4;
      const cd = sec.chords[bar % sec.chords.length], root = midi(cd[0]);
      if (pos === 0 && sec.pad) AU.pad.soft(cd.slice(1), delay, spb * 4, bus);
      switch (sec.bass) {
        case 'soft': if (pos === 0) B.sine(root, delay, 0.9, 1, bus); else if (pos === 4) B.sine(root * 1.5, delay, 0.6, 0.6, bus); break;
        case 'bounce': if (pos % 2 === 0) B.sine([root, root * 2, root * 1.5, root * 2][pos / 2], delay, 0.3, 0.85, bus); break;
        case 'pulse': B.saw(pos % 2 ? root * 2 : root, delay, 0.14, pos % 4 === 0 ? 1 : 0.7, bus); break;
        case 'long': if (pos === 0) B.sine(root, delay, spb * 3.6, 0.9, bus); break;
      }
      // drums with a fill into the next section
      const kit = chart.DRUMS[sec.drums] || {};
      const fill = lastBar && pos >= 5 && sec.id !== 'outro' && sec.id !== 'intro';
      if (fill) Dr.tom(delay, 0.9, bus, pos - 5);
      else for (const d in kit) if (kit[d][pos] === 'x') Dr[d](delay, 1, bus);
      if (run && run.S.fever && pos % 2 === 1) Dr.hat(delay, 0.9, bus);
      // arpeggio of the chord, an octave up
      if (sec.arp && (pos % 2 === 0 || (run && run.S.fever)) && Math.random() < 0.55 + sec.arp * 0.45) {
        const up = cd.slice(1).concat(cd.slice(1).map((n) => n + 12));
        I.pluck(midi(up[(k + bar) % up.length] + 12), delay, stepDur, 0.38 * sec.arp, echo);
      }
      if (sec.counter && pos === 0) I.flute(midi(cd[2] + 12), delay, spb * 1.8, 0.45, echo);
      // the band hums the melody very softly, Mimo plays it loud
      for (const n of chart.notes) if (Math.abs(n.b - beat) < 0.01) AU.voice({ type: 'triangle', f0: midi(n.pitch), attack: 0.02, dur: Math.max(0.2, n.len * spb), vol: 0.011, lp: 1100, delay, bus: echo });
    }
    function noteSound(n) {
      const c = liveCtx(); if (!c || c !== A.ctx) return;
      const when = A.start != null ? A.start + n.b * spb : c.currentTime;
      const delay = Math.max(0, when - c.currentTime), musicOn = AU.music(), ch = musicOn ? chain(c) : null;
      if (!musicOn && !AU.sfx()) return;
      const bus = ch ? ch.echo : AU.fx(), f = midi(n.pitch), len = Math.max(0.2, n.len * spb);
      AU.inst.glock(f, delay, len, 1.25, bus); AU.inst.pluck(f, delay, len, 0.9, bus);
      if (run.S.fever) AU.inst.bell(f * 2, delay, len, 0.6, bus);
    }
    const fx = (fn) => (...a) => { if (AU.sfx()) fn(...a); };
    const SND = {
      jump: fx(() => { const r = chordAt(Math.max(0, S.beat))[0]; AU.voice({ type: 'sine', f0: midi(r + 36), f1: midi(r + 43), slide: 0.1, dur: 0.15, vol: 0.05 }); AU.noise({ hp: 2500, dur: 0.08, vol: 0.015 }); }),
      land: fx(() => { AU.voice({ type: 'triangle', f0: 140, f1: 70, dur: 0.09, vol: 0.05 }); }),
      lane: fx(() => { AU.noise({ bp: 2200, q: 2, dur: 0.07, vol: 0.022 }); }),
      perfect: fx(() => { const cd = chordAt(Math.max(0, S.beat)); [cd[2] + 24, cd[3] + 24].forEach((n, i) => AU.inst.glock(midi(n), i * 0.05, 0.3, 0.7, AU.fx())); }),
      big: fx(() => { const cd = chordAt(Math.max(0, S.beat)); [cd[1], cd[2], cd[3], cd[1] + 12].forEach((n, i) => AU.inst.bell(midi(n + 12), i * 0.07, 0.4, 1, AU.fx())); AU.noise({ hp: 6000, dur: 0.4, vol: 0.02, delay: 0.1 }); }),
      fall: fx(() => { AU.voice({ type: 'sine', f0: 900, f1: 180, slide: 0.5, dur: 0.55, vol: 0.05 }); }),
      puff: fx(() => { AU.noise({ lp: 900, dur: 0.35, vol: 0.05 }); AU.voice({ type: 'sine', f0: 520, f1: 780, slide: 0.2, dur: 0.25, vol: 0.03, delay: 0.1 }); }),
      fever: fx(() => { AU.voice({ type: 'sawtooth', f0: 220, f1: 880, slide: 0.6, dur: 0.7, vol: 0.03, lp: 2200 }); const cd = chordAt(Math.max(0, S.beat)); cd.slice(1).forEach((n, i) => AU.inst.bell(midi(n + 24), 0.35 + i * 0.06, 0.5, 0.8, AU.fx())); }),
      mult: fx((m) => { AU.inst.glock(midi(81 + m * 2), 0, 0.2, 0.6, AU.fx()); }),
      gate: fx(() => { const cd = chordAt(chart.total - 1); cd.slice(1).forEach((n, i) => AU.inst.bell(midi(n + 12), i * 0.08, 1.2, 1, AU.fx())); AU.noise({ hp: 5000, dur: 0.9, vol: 0.025 }); }),
      bonk: fx(() => { AU.voice({ type: 'sine', f0: 260, f1: 120, dur: 0.18, vol: 0.06 }); AU.noise({ lp: 700, dur: 0.15, vol: 0.05 }); }),
    };
    function dipMusic() {
      if (!A.lp || !A.ctx) return;
      try { const now = A.ctx.currentTime, f = A.lp.frequency; f.cancelScheduledValues(now); f.setValueAtTime(f.value, now); f.exponentialRampToValueAtTime(650, now + 0.06); f.setTargetAtTime(20000, now + spb, spb * 0.6); } catch (_) { /* context gone */ }
    }

    // ---------- Run events ----------
    const judge = (text, kind) => { if (host.onJudge) host.onJudge(text, kind); };
    // how far Mimo has run: the song position, easing to a stop in the moonlight after the last beat
    function travel() {
      const b = Math.max(0, S.beat);
      if (S.state !== 'end' || b <= chart.total) return b;
      return chart.total + 1.6 * (1 - Math.exp(-(b - chart.total) / 0.8));
    }
    const mimoPos = () => ({ x: (run.S.x - 1) * LW, y: run.S.y, z: -run.S.beat * D });
    function onEvent(k, d) {
      const p = run ? mimoPos() : { x: 0, y: 0, z: 0 };
      switch (k) {
        case 'note': {
          world.collectNote(d.i); noteSound(d.note); S.moodT = 0.35; S.mood = 'happy';
          const c = '#' + world.noteCol[d.i].getHexString();
          burst((d.note.lane - 1) * LW, d.note.y + 0.5, -d.note.b * D, 10, [c, '#FFFFFF'], 3.2, { up: 1.2, grav: 4, life: 0.55 });
          break;
        }
        case 'big': world.collectBig(d.i); SND.big(); S.flash = Math.max(S.flash, 0.25); judge('Großer Stern!', 'big'); burst(p.x, p.y + 1.2, p.z - 0.5, 34, ['#FFE08A', '#FFFFFF', '#FFC94F'], 6, { up: 1.5, grav: 5, life: 0.9 }); S.moodT = 0.8; S.mood = 'happy'; S.emote = { kind: 'spin', t: 0, dur: 0.6 }; break;
        case 'perfect': SND.perfect(); judge('Perfekt!', 'perfect'); burst(p.x, p.y + 0.2, p.z, 10, ['#FFFFFF', '#FFF2B5'], 2.6, { up: 0.6, grav: 2, life: 0.5 }); break;
        case 'jump': SND.jump(); S.sq = 0.18; break;
        case 'mush': SND.jump(); world.squashMush(run.S.beat); S.mushK = 1; burst(p.x, p.y + 0.4, p.z, 18, ['#FFB5CB', '#FFFFFF'], 4, { up: 1.5, grav: 3, life: 0.7 }); judge('Huiii!', 'mush'); break;
        case 'land': SND.land(); S.sq = -0.25; S.jigV = -0.6; break;
        case 'lane': SND.lane(); break;
        case 'stumble':
          if (d.kind === 'wall') { SND.bonk(); world.bumpWall(run.S.beat, Math.round(run.S.x)); } else if (host.sfx) { host.sfx.hurt(); }
          dipMusic(); S.shake = 0.5; S.tumble = 1; S.mood = 'scared'; S.moodT = 0.9; burst(p.x, p.y + 0.5, p.z, 14, [PAL.thorn, '#FFFFFF'], 3.5, { up: 1, grav: 8, life: 0.6 });
          if (host.onEvent) host.onEvent('runHit'); break;
        case 'bump': SND.bonk(); break;
        case 'fall': SND.fall(); dipMusic(); S.mood = 'scared'; S.moodT = 1.5; if (host.onEvent) host.onEvent('runFall'); break;
        case 'rescued': break;
        case 'mult': if (d.mult > 1) { SND.mult(d.mult); if (d.mult < 4) judge('×' + d.mult, 'mult'); } break;
        case 'fever': if (d.on) { SND.fever(); judge('Sternschnuppe!', 'fever'); S.flash = Math.max(S.flash, 0.35); if (host.onEvent) host.onEvent('runFever'); } break;
        case 'gate': SND.gate(); S.flash = 0.8; for (let i = 0; i < 4; i++) world.firework(Math.random()); burst(0, 2.5, p.z, 60, ['#FFF1C2', '#FFFFFF', '#FFD873'], 8, { up: 1, grav: 3, life: 1.2 }); break;
        case 'done': break;
      }
    }

    // ---------- Tutorial prompts (first visit) ----------
    const touch = () => !!(host.isTouch && host.isTouch());
    const PROMPTS = [
      [-COUNT_BEATS, 0, () => 'Gleich geht es los. Jeder <b>Notenstern</b> spielt einen Ton der Melodie.'],
      [0.5, 3.6, () => 'Sammle die Notensterne. Mimo läuft von allein.'],
      [3.6, 7.2, () => (touch() ? 'Tippe ins <b>zweite Viertel</b> links: Spur nach rechts.' : '<b>→</b> oder <b>D</b>: Spur nach rechts.')],
      [7.2, 11, () => (touch() ? 'Tippe ganz <b>links</b>: Spur nach links.' : '<b>←</b> oder <b>A</b>: Spur nach links.')],
      [11, 14.6, () => (touch() ? 'Tippe auf die <b>rechte Hälfte</b>: Springen!' : '<b>Leertaste</b> oder <b>↑</b>: Springen!')],
    ];
    function updatePrompt() {
      let html = null;
      if (host.tutorial && S.state !== 'intro') for (const [a, b, f] of PROMPTS) if (S.beat >= a && S.beat < b) html = f();
      if (S.state === 'intro') html = host.tutorial ? 'Die Sternenbahn: ein Lauf zur Musik.' : null;
      if (html !== S.prompt) { S.prompt = html; if (host.onPrompt) host.onPrompt(html); }
    }

    // ---------- Flow ----------
    function restart() {
      newRun(); world.reset();
      S.state = 'intro'; S.introT = 0; S.t = -COUNT_BEATS * spb - 0.25; S.beat = -COUNT_BEATS; S.endT = 0; S.reported = false; S.section = -1; S.flash = 0; S.count = null;
      S.emote = null; S.tumble = 0; S.mushK = 0;
      A.start = null; A.nextStep = null; A.done = -1e9;
      if (host.onCount) host.onCount(null);
      if (host.onPrompt) host.onPrompt(null); S.prompt = null;
      prevIn.left = input.left; prevIn.right = input.right; input.jumpQueued = false;
      hud(true);
    }
    function startCount() { S.state = 'count'; S.t = -COUNT_BEATS * spb - 0.25; A.start = null; }
    function enterResume() { if (S.state !== 'play' && S.state !== 'count') return; S.resumeFrom = S.state; S.state = 'resume'; S.resumeT = 0; A.start = null; }
    function update(dtIn) {
      const now = performance.now();
      const dt = Math.min(0.05, dtIn);
      S.flash = Math.max(0, S.flash - dt * 1.6); S.shake = Math.max(0, S.shake - dt * 2); S.mushK = Math.max(0, S.mushK - dt * 0.9);
      if (S.state === 'intro') {
        S.introT += dt;
        if (input.jumpQueued) { input.jumpQueued = false; S.introT = Math.max(S.introT, INTRO_TIME); }
        if (S.introT >= INTRO_TIME) startCount();
      } else if (S.state === 'resume') {
        S.resumeT += dt; const left = RESUME_BEATS - Math.floor(S.resumeT / spb);
        if (host.onCount) host.onCount(left > 0 ? String(left) : null);
        if (S.resumeT >= RESUME_BEATS * spb) { S.state = S.resumeFrom || 'play'; A.start = null; if (host.onCount) host.onCount(null); }
        input.jumpQueued = false;
      } else {
        const t0 = S.t;
        S.t += Math.min(0.25, dtIn); syncClock(dt); schedule();
        if (S.state === 'play') stepRun(t0, S.t);
      }
      S.beat = S.t / spb;
      if (S.state === 'count') {
        const n = Math.ceil(-S.beat);
        if (host.onCount) host.onCount(S.beat < -COUNT_BEATS + 0.02 ? null : n > 0 ? String(n) : null);
        if (S.beat >= 0) { S.state = 'play'; if (host.onCount) host.onCount('Los!'); setTimeout(() => { if (host.onCount && S.state === 'play') host.onCount(null); }, spb * 1000); }
        input.jumpQueued = false;
      }
      if (S.state === 'end') { prevIn.left = input.left; prevIn.right = input.right; input.jumpQueued = false; }
      if (S.state === 'end') {
        S.endT += dt;
        if (S.endT > 0.4 && Math.random() < dt * 3) world.firework(Math.random());
        if (S.beat > chart.total + END_BEATS - 1 && !S.reported) { S.reported = true; report(); }
      }
      // section changes: portal flash and the name
      const si = S.beat >= 0 ? world.sectionOf(Math.min(chart.total - 1, S.beat)) : -1;
      if (si !== S.section) { if (si > 0) { S.flash = Math.max(S.flash, reduced() ? 0.15 : 0.45); judge(chart.sections[si].name, 'section'); } S.section = si; }
      // beat effects: kick pulse, shooting stars and fireworks on the big parts
      const sec = sectionAt(Math.max(0, S.beat)), pos8 = Math.floor(S.beat * 2), kickPat = (chart.DRUMS[sec.drums] || {}).kick || '';
      if (S.beat >= 0 && pos8 !== S.lastPos8) {
        S.lastPos8 = pos8;
        if (kickPat[((pos8 % 8) + 8) % 8] === 'x') S.kick = 1;
        if (pos8 % 2 === 0 && (sec.id === 'finale' || sec.id === 'chorus') && Math.random() < (sec.id === 'finale' ? 0.5 : 0.18)) world.shoot(sec.id === 'finale');
        if (pos8 % 8 === 0 && sec.id === 'finale' && !reduced()) world.firework(Math.random());
        if (pos8 % 2 === 0 && sec.id === 'bridge' && Math.random() < 0.25) world.shoot(false);
      }
      S.kick = Math.max(0, S.kick - dt * 5);
      if (run.S.fever && Math.random() < dt * 40) { const p = mimoPos(); tmpC.setHSL(Math.random(), 0.85, 0.78); burst(p.x + (Math.random() - 0.5) * 0.4, p.y + 0.4, p.z + 0.4, 1, ['#' + tmpC.getHexString()], 1.2, { grav: 0, life: 0.7, vz: 2.5 }); }
      updatePrompt();
      stepParticles(dt);
      syncMimo(dt);
      stepCamera(dt);
      world.update({ beat: S.beat, t: now / 1000, dt, cam, mimoX: run.S.x, mimoLane: Math.round(run.S.x), flash: S.flash, fever: run.S.fever || !!fun.disco, pulse: S.kick });
      hud(false);
    }
    // the rules run in small steps between two frames, so a slow frame cannot skip a note or a thorn
    const NO_INPUT = { left: false, right: false, jump: false };
    function stepRun(t0, t1) {
      let inp = NO_INPUT;
      if (!S.auto) { inp = { left: input.left && !prevIn.left, right: input.right && !prevIn.right, jump: input.jumpQueued }; input.jumpQueued = false; }
      prevIn.left = input.left; prevIn.right = input.right;
      const n = Math.max(1, Math.ceil((t1 - t0) * 120));
      for (let i = 1; i <= n; i++) {
        const b = (t0 + (t1 - t0) * i / n) / spb;
        run.step(b, S.auto ? pilot(b) : i === 1 ? inp : NO_INPUT);
        if (run.S.done) { S.state = 'end'; S.endT = 0; break; }
      }
    }
    function report() {
      const R = run.S, total = chart.notes.length;
      if (host.onWin) host.onWin({ assisted, score: R.score, notes: R.notesGot, total, pct: Math.round(R.notesGot / total * 100), big: R.bigGot, bigTotal: chart.bigCount, maxCombo: R.maxCombo, perfects: R.perfects, stumbles: R.stumbles, falls: R.falls });
    }
    function hud(force) {
      const R = run.S, prog = clamp(S.beat / chart.total, 0, 1);
      const key = R.score + '|' + R.combo + '|' + R.mult + '|' + R.fever + '|' + R.bigGot + '|' + Math.round(prog * 200);
      if (!force && key === S.hudKey) return; S.hudKey = key;
      if (host.onHud) host.onHud({ score: R.score, combo: R.combo, mult: R.mult, fever: R.fever, prog, big: R.bigGot, bigTotal: chart.bigCount, notes: R.notesGot, total: chart.notes.length, marks: chart.sections.slice(1).map((s) => s.b0 / chart.total) });
    }

    // ---------- Mimo ----------
    const UPV = new THREE.Vector3(0, 1, 0);
    function syncMimo(dt) {
      const R = run.S, r = mimo.root, LEG = mimo.LEG, BS = mimo.BS;
      const playing = S.state === 'play' || S.state === 'end';
      const x = (R.x - 1) * LW, z = -travel() * D;
      r.position.set(x, R.y, z);
      // facing: towards the camera in the intro, along the track while running, back to the camera at the end
      const faceYaw = S.state === 'intro' ? 0 : S.state === 'end' && S.endT > 1.2 ? 0 : Math.PI;
      S.yaw = damp(S.yaw || 0, faceYaw, S.state === 'count' ? 3 : 6, dt);
      // lean into the slide while Mimo is between lanes, then settle softly
      S.lean = damp(S.lean, clamp((R.lane - R.x) * 1.7, -1, 1), 12, dt);
      const air = !R.ground, running = playing && R.ground && R.mode !== 'rescue' && (S.state === 'play' || S.endT < 1.1);
      // squash and stretch, landing jiggle
      S.sq = damp(S.sq || 0, 0, 9, dt);
      S.jigV += (-S.jig * 190 - S.jigV * 9) * dt; S.jig += S.jigV * dt;
      const stretch = air ? clamp(R.vy * 0.02, -0.12, 0.16) : 0, sq = S.sq + stretch + S.jig;
      mimo.body.scale.set((1 - sq * 0.5) * BS, (1 + sq) * BS, (1 - sq * 0.5) * BS);
      // run cycle on the beat: two steps per beat
      const w = running ? Math.sin(S.beat * Math.PI * 2) : Math.sin(S.walk);
      if (!running) S.walk = damp(S.walk, Math.round(S.walk / Math.PI) * Math.PI, 8, dt); else S.walk = S.beat * Math.PI * 2;
      const runK = running ? 1 : 0;
      mimo.body.position.y = LEG + (running ? Math.abs(w) * 0.06 : Math.sin(now() * 3) * 0.008) - Math.max(0, -sq) * 0.06;
      mimo.body.rotation.z = running ? w * 0.07 : 0;
      mimo.body.rotation.x = air ? clamp(-R.vy * 0.01, -0.15, 0.15) : runK * 0.14;
      mimo.legs[0].rotation.set(air ? -0.6 : w * 0.8 * runK, 0, 0); mimo.legs[1].rotation.set(air ? 0.4 : -w * 0.8 * runK, 0, 0);
      const legSq = 1 - Math.max(0, -sq) * 0.7; for (const lg of mimo.legs) lg.scale.y = legSq;
      S.armUp = damp(S.armUp, air ? 1 : 0, 10, dt);
      const swing = w * 0.9 * runK, floaty = R.mode === 'mush' ? 1 : 0;
      mimo.arms.forEach((a, i) => a.position.copy(mimo.armBase[i]));
      mimo.arms[0].rotation.set(swing, 0, -0.15 - S.armUp * (1.7 - floaty * 0.4) - Math.sin(now() * 9) * 0.25 * floaty);
      mimo.arms[1].rotation.set(-swing, 0, 0.15 + S.armUp * (1.7 - floaty * 0.4) + Math.sin(now() * 9) * 0.25 * floaty);
      // tumble after a stumble, spin for a big star, cheer at the end
      let extraYaw = 0, tumbleX = 0, face = null;
      if (S.tumble > 0) { S.tumble = Math.max(0, S.tumble - dt * 2.2); tumbleX = (1 - S.tumble) * Math.PI * 2; }
      if (S.emote) { const e = S.emote; e.t += dt; const k = e.t / e.dur; if (e.kind === 'spin') { extraYaw = smooth(Math.min(1, k)) * Math.PI * 2; face = 'happy'; } else if (e.kind === 'hop') { mimo.body.position.y += Math.abs(Math.sin(e.t * Math.PI * 3)) * 0.18; face = 'happy'; } if (k >= 1) S.emote = null; }
      if (S.state === 'end' && S.endT > 1.2) { const b = Math.sin(now() * 7); mimo.body.rotation.z = b * 0.16; mimo.body.position.y = LEG + Math.abs(b) * 0.08; mimo.arms[0].rotation.set(0, 0, -(1.6 + b * 0.8)); mimo.arms[1].rotation.set(0, 0, 1.6 - b * 0.8); face = 'happy'; }
      if (S.state === 'intro' && S.introT > 0.5 && S.introT < 2.2) { mimo.arms[1].rotation.set(0, 0, 2.4 + Math.sin(S.introT * 12) * 0.35); face = 'happy'; }
      r.rotation.set(tumbleX, S.yaw + extraYaw + S.lean * -0.25, -S.lean * 0.12);
      // face
      S.moodT = Math.max(0, S.moodT - dt); if (S.moodT <= 0) S.mood = null;
      S.piepT = Math.max(0, S.piepT - dt);
      S.blink -= dt; if (S.blink < 0) S.blink = 2.2 + Math.random() * 2.8;
      const blinkK = S.blink < 0.12 ? 0.1 : 1;
      const happy = face === 'happy' || S.mood === 'happy' || S.piepT > 0 || (R.fever && !air);
      const scared = S.mood === 'scared' || R.mode === 'rescue' || (air && R.vy < -6 && R.airKind === 'drop');
      for (const e of mimo.eyes) { e.visible = !happy; e.scale.set(scared ? 1.12 : 1, blinkK * (scared ? 1.18 : 1), 1); }
      for (const e of mimo.happyEyes) e.visible = happy;
      for (const e of mimo.closedEyes) e.visible = false;
      const open = scared || happy || (air && R.vy > 2);
      mimo.mouthOpen.visible = open; mimo.smile.visible = !open;
      mimo.mouthOpen.scale.set(1, scared ? 1.4 : S.piepT > 0 ? 1.6 : 1, 1);
      // sprout on a spring
      const tgt = -runK * 0.4 + clamp(R.vy * 0.03, -0.3, 0.4);
      S.sprV += ((tgt - S.sprX) * 70 - S.sprV * 6) * dt; S.sprX += S.sprV * dt;
      if (mimo.sprout) { mimo.sprout.rotation.x = S.sprX; mimo.sprout.rotation.z = S.lean * 0.3; }
      if (mimo.wings) { const f = Math.sin(now() * (air ? 22 : 6)) * (air ? 0.7 : 0.2); mimo.wings[0].rotation.y = f; mimo.wings[1].rotation.y = -f; }
      if (mimo.rainbow || R.fever || fun.disco) mimo.skin.color.setHSL((now() * (R.fever ? 0.5 : 0.15)) % 1, 0.6, 0.78); else mimo.skin.color.set(okHex(host.outfit && host.outfit.color, '#A8C8EC'));
      r.scale.setScalar(fun.big ? 1.45 : fun.mini ? 0.7 : 1);
      r.visible = !(R.inv > 0 && R.mode !== 'rescue' && Math.floor(now() * 14) % 2 && S.state === 'play' && !host.invincible);
      // blob shadow on the track, or nothing over open sky
      const lane = Math.round(R.x), onTrack = chart.hasFloor(lane, Math.max(0, S.beat)) || S.beat < 0;
      mimo.shadow.visible = onTrack && R.y > -0.4;
      mimo.shadow.position.set(x, 0.02, z); const hk = clamp(1 - R.y / 5, 0.3, 1); mimo.shadow.scale.setScalar(hk); mimo.shadow.material.opacity = 0.3 * hk;
      stepTrail(dt, !!R.fever && S.state === 'play', x, R.y, z);
      rescue.visible = R.mode === 'rescue'; if (rescue.visible) { rescue.position.set(x, R.y, z); rescue.rotation.y = now() * 0.6; }
      UPV.set(0, 1, 0);
    }
    const now = () => performance.now() / 1000;

    // ---------- Camera ----------
    const CAM = { h: 3.15, back: 6.3, lookY: 0.35, ahead: 9.5, fov: 60 };
    const camPos = new THREE.Vector3(0, 2.6, 6), camLook = new THREE.Vector3(0, 0.8, -7), tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
    function stepCamera(dt) {
      const R = run.S, mx = (R.x - 1) * LW, mz = -travel() * D, my = Math.max(-1.5, R.y);
      const endK = S.state === 'end' ? smooth(clamp(S.endT / 2.5, 0, 1)) : 0;
      tmpV.set(mx * 0.5, CAM.h + my * 0.4 + S.mushK * 0.7 + endK * 0.8, mz + CAM.back - S.mushK * 0.8 - endK * 1.5);
      tmpL.set(mx * 0.7, CAM.lookY + my * 0.5 + endK * 0.8, mz - CAM.ahead + endK * 5);
      if (S.state === 'intro' || S.state === 'count') {
        // start close in front of Mimo's face, then swing up and back to the running view while Mimo turns round
        const k = S.state === 'intro' ? smooth(clamp(S.introT / INTRO_TIME, 0, 1)) * 0.3 : 0.3 + 0.7 * smooth(clamp((S.beat + COUNT_BEATS) / COUNT_BEATS, 0, 1));
        const ang = lerp(0.55, 0, k), rad = lerp(2.7, CAM.back, k);
        tmpV.set(Math.sin(ang) * rad, lerp(0.95, CAM.h, k), Math.cos(ang) * rad);
        tmpL.set(0, lerp(0.55, CAM.lookY, k), lerp(0, -CAM.ahead, k));
        camPos.copy(tmpV); camLook.copy(tmpL);
      } else {
        camPos.x = damp(camPos.x, tmpV.x, 9, dt); camPos.y = damp(camPos.y, tmpV.y, 7, dt); camPos.z = damp(camPos.z, tmpV.z, 30, dt);
        camLook.x = damp(camLook.x, tmpL.x, 9, dt); camLook.y = damp(camLook.y, tmpL.y, 7, dt); camLook.z = damp(camLook.z, tmpL.z, 30, dt);
      }
      cam.position.copy(camPos);
      if (S.shake > 0 && !reduced()) cam.position.add(tmpV.set(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(S.shake * 0.25));
      cam.up.set(Math.sin(-S.lean * 0.035), 1, 0).normalize();
      cam.lookAt(camLook);
      const fov = CAM.fov + (reduced() ? 0 : S.kick * 1.4) + S.mushK * 7 + (R.fever ? 3 : 0);
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = damp(cam.fov, fov, 12, dt); cam.updateProjectionMatrix(); }
      // the world bends a little left and right with the music
      world.bendU.value.x = Math.sin(S.beat / 16 * Math.PI) * 0.0011 * (reduced() ? 0.4 : 1);
      // light follows the look of the section
      const L = world.lookAt(S.beat);
      hemi.color.copy(L.hemi); sun.color.copy(L.sun);
      sun.position.set(cam.position.x + 6, 14, cam.position.z + 4); sun.target.position.set(mx, 0, mz - 4);
    }

    // ---------- Render, resize, dispose ----------
    // resolution steps down on its own when frames take too long (weaker phones)
    const perf = { pr: Math.min(2, window.devicePixelRatio || 1), last: 0, sum: 0, n: 0 };
    function watchFrames() {
      const t = performance.now(), d = perf.last ? t - perf.last : 0; perf.last = t;
      if (!d || d > 250 || S.state === 'intro') return;
      perf.sum += d; perf.n++;
      if (perf.n < 90) return;
      const avg = perf.sum / perf.n; perf.sum = 0; perf.n = 0;
      if (avg > 21 && perf.pr > 1) { perf.pr = Math.max(1, perf.pr - 0.25); renderer.setPixelRatio(perf.pr); }
    }
    function resize() {
      const w = canvas.clientWidth || host.anchor.clientWidth, h = canvas.clientHeight || host.anchor.clientHeight;
      if (!w || !h) return;
      const pr = perf.pr;
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) { renderer.setPixelRatio(pr); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      world.starU.uPx.value = pr * Math.max(0.7, h / 500);
    }
    function render() { watchFrames(); resize(); renderer.render(scene, cam); }
    function dispose() {
      scene.traverse((ob) => { if (ob.geometry) ob.geometry.dispose(); if (ob.material) { const ms = Array.isArray(ob.material) ? ob.material : [ob.material]; for (const m of ms) { if (m.map && m.map !== kit.haloTex) m.map.dispose(); m.dispose(); } } });
      world.dispose(); kit.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      if (host.onPrompt) host.onPrompt(null); if (host.onCount) host.onCount(null);
      try { if (A.inp) A.inp.disconnect(); } catch (_) { /* already gone */ }
    }

    host.anchor.after(canvas);
    restart();
    return {
      update, render, dispose, resize, restart,
      setFun(f) { fun = Object.assign({}, f || {}); },
      // the game paused: after it continues, a short count-in brings the player back into the beat
      hold() { enterResume(); },
      piep() { if (S.state !== 'play') return; S.piepT = 0.3; S.sq = -0.25; S.emote = { kind: 'hop', t: 0, dur: 0.5 }; const p = mimoPos(); burst(p.x, p.y + 0.9, p.z, 10, ['#FFF2B5', '#FFFFFF'], 2.4, { up: 1.5, grav: 4, life: 0.6 }); },
      get state() { return S.state; },
      get beat() { return S.beat; },
      dbg: { S, chart, get run() { return run; }, world, setAuto(v) { S.auto = !!v; }, skipIntro() { S.introT = INTRO_TIME; }, seek(b) { if (host.onCount) host.onCount(null); A.done = -1e9; S.t = b * spb; S.beat = b; A.start = null; if (S.state === 'intro' || S.state === 'count') S.state = 'play'; run.S.beat = b; run.S.noteIdx = chart.notes.findIndex((n) => n.b >= b - 0.2); if (run.S.noteIdx < 0) run.S.noteIdx = chart.notes.length; }, cam },
    };
  }

  window.Starway3D = { create };
})();
