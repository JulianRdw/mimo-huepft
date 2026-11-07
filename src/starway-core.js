/* Mimo hüpft · Sternenbahn, song, course and rules
   One piece of music and the run that is built from it. The melody is not played by the band:
   every melody note lies on the track as a note-star, and Mimo plays it by collecting it.
   Pure data, a builder and the run rules (no drawing, no sound), so the same file runs in the game
   and in node, where an autopilot checks that every note can be reached. */
(function (root) {
  'use strict';

  const BPM = 112;
  const BAR = 4; // beats per bar
  const STEPS = 2; // grid steps per beat (eighth notes)
  // Physics in beats: one beat of running is one tile length on the track
  const JUMP_BEATS = 1.5; // air time of a normal jump
  const JUMP_H = 1.45; // apex in world units
  const MUSH_BEATS = 4; // air time after a mushroom
  const MUSH_H = 3.6;
  const IDEAL_LEAD = 0.3; // ideal take-off, in beats before a gap

  // chords as [bass, ...pad]
  const CH = {
    D: [50, 62, 66, 69], Bm: [47, 59, 62, 66], G: [43, 55, 59, 62], A: [45, 57, 61, 64], Fsm: [42, 57, 61, 66],
    Em: [40, 55, 59, 64], Gmaj7: [43, 55, 59, 66], Asus: [45, 57, 62, 64], Dsus: [50, 62, 64, 69],
  };

  // Sections of the song. mel: one bar per string, eight steps, '.' holds or rests.
  // lanes: one letter per melody note (L, M, R), '-' keeps the previous lane.
  // obst: [beat in section, lanes, kind, length in beats]. kinds: gap, thorn, wall, takt, mush, big
  const SECTIONS = [
    { id: 'intro', name: 'Abendrot', bars: 4, chords: ['D', 'Bm', 'G', 'A'], drums: 'intro', bass: 'soft', arp: 0, pad: 1,
      mel: ['D5 . F#5 . A5 . F#5 .', 'B5 . A5 . B5 . D6 .', 'G5 . E5 . D5 . B4 .', 'C#5 . . . E5 . . .'],
      lanes: 'MMMM RRRM LLLL MM',
      obst: [[14, 'LMR', 'gap', 1]],
      sky: 0 },
    { id: 'verse', name: 'Blaue Stunde', bars: 8, chords: ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A'], drums: 'verse', bass: 'bounce', arp: 0.5, pad: 1,
      mel: ['A4 . D5 . F#5 . E5 D5', 'F#5 . . . B4 . D5 .', 'G5 . F#5 . E5 . D5 .', 'E5 . . . C#5 . A4 .',
        'A4 . D5 . F#5 . A5 .', 'B5 . A5 . F#5 . D5 .', 'E5 . G5 . F#5 E5 D5 .', 'E5 . . . . . . .'],
      lanes: 'LLMMM MLL MMLL MLL LMMR RRML MRRRR M',
      obst: [
        [2, 'R', 'thorn', 0.5], [6, 'LMR', 'gap', 1], [10, 'L', 'thorn', 0.5], [12, 'R', 'thorn', 0.5],
        [14, 'LMR', 'gap', 1], [18, 'L', 'wall', 0.5], [20, 'L', 'thorn', 0.5], [22, 'LMR', 'gap', 1],
        [24, 'L', 'thorn', 0.5], [26, 'M', 'big', 0], [26, 'M', 'thorn', 0.5], [30, 'LMR', 'gap', 1], [9, 'L', 'big', 0]],
      sky: 1 },
    { id: 'rise', name: 'Sternenaufgang', bars: 8, chords: ['G', 'A', 'Fsm', 'Bm', 'G', 'A', 'Bm', 'A'], drums: 'rise', bass: 'pulse', arp: 1, pad: 1,
      mel: ['B4 D5 G5 . B4 D5 G5 .', 'C#5 E5 A5 . C#5 E5 A5 .', 'C#5 F#5 A5 . C#5 F#5 A5 .', 'D5 F#5 B5 . D5 F#5 B5 .',
        'D6 . B5 . G5 . B5 .', 'C#6 . A5 . E5 . A5 .', 'D6 . C#6 . B5 . F#5 .', 'A5 . . . C#5 E5 A5 C#6'],
      lanes: 'LLLMMM MMMRRR RRRMMM MMMLLL MRRR RRMM RRRM MRRRR',
      obst: [
        [3, 'LMR', 'takt', 0.5], [7, 'LMR', 'takt', 0.5], [11, 'LMR', 'takt', 0.5], [15, 'LMR', 'takt', 0.5],
        [16, 'L', 'wall', 0.5], [18, 'L', 'wall', 0.5], [17, 'M', 'gap', 1], [20, 'L', 'wall', 0.5], [20, 'M', 'gap', 1],
        [24, 'L', 'wall', 0.5], [25, 'M', 'thorn', 0.5], [26, 'L', 'wall', 0.5], [27, 'R', 'big', 0], [27, 'M', 'thorn', 0.5],
        [28, 'R', 'thorn', 0.5], [29, 'L', 'thorn', 0.5], [30, 'R', 'mush', 0], [10, 'L', 'big', 0]],
      sky: 2 },
    { id: 'chorus', name: 'Polarlicht', bars: 8, chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], drums: 'chorus', bass: 'bounce', arp: 1, pad: 1, counter: 1,
      mel: ['A5 . A5 . B5 A5 F#5 .', 'E5 . . . C#5 . E5 .', 'F#5 . F#5 . A5 F#5 D5 .', 'B4 . . . D5 . E5 .',
        'A5 . A5 . B5 A5 D6 .', 'C#6 . . . A5 . E5 .', 'G5 . F#5 . E5 . D5 .', 'E5 . F#5 . E5 . . .'],
      lanes: 'RRRRR MLM MMRRR MLM LLLLL MMM MMLL MMM',
      obst: [
        [3, 'L', 'thorn', 0.5], [6, 'LMR', 'gap', 1], [10, 'LMR', 'gap', 1], [13, 'R', 'wall', 0.5], [14, 'LMR', 'gap', 1],
        [16, 'L', 'mush', 0], [17, 'LM', 'gap', 3], [18, 'L', 'big', 0], [21, 'L', 'thorn', 0.5], [22, 'LMR', 'gap', 1],
        [25, 'R', 'wall', 0.5], [26, 'LMR', 'gap', 1], [29, 'L', 'wall', 0.5], [29, 'R', 'thorn', 0.5], [30, 'LMR', 'gap', 1]],
      sky: 3 },
    { id: 'bridge', name: 'Kometenflug', bars: 8, chords: ['Em', 'G', 'D', 'A', 'Em', 'G', 'A', 'A'], drums: 'bridge', bass: 'long', arp: 0.6, pad: 1, stones: true,
      mel: ['B4 . . . E5 . . .', 'D5 . . . B4 . . .', 'A4 . . . D5 . F#5 .', 'E5 . . . . . . .',
        'G5 . . . E5 . . .', 'B5 . . . G5 . . .', 'A5 . . . C#6 . . .', 'A5 B5 C#6 D6 E6 . . .'],
      lanes: 'LM ML LMM M RM RR MR RRRRR',
      obst: [[2, 'R', 'big', 0], [22, 'L', 'big', 0]],
      sky: 4 },
    { id: 'finale', name: 'Sternenregen', bars: 8, chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], drums: 'finale', bass: 'bounce', arp: 1, pad: 1, counter: 1, shift: 2,
      mel: ['A5 . A5 . B5 A5 F#5 .', 'E5 . . . C#5 . E5 .', 'F#5 . F#5 . A5 F#5 D5 .', 'B4 . . . D5 . E5 .',
        'A5 . A5 . B5 A5 D6 .', 'C#6 . . . A5 . E5 .', 'G5 . F#5 . E5 . D5 .', 'D5 . . . . . . .'],
      lanes: 'RRRRR MLM LLMMM MLM RRRRR RRM MMML L',
      obst: [
        [1, 'LM', 'takt', 0.5], [2, 'LMR', 'gap', 1], [5, 'R', 'wall', 0.5], [6, 'LMR', 'gap', 1], [8, 'L', 'mush', 0], [9, 'LMR', 'gap', 3],
        [10, 'M', 'big', 0], [13, 'R', 'wall', 0.5], [14, 'LMR', 'gap', 1], [17, 'LM', 'thorn', 0.5], [18, 'LMR', 'gap', 1],
        [20, 'M', 'takt', 0.5], [21, 'L', 'wall', 0.5], [22, 'LMR', 'gap', 1], [24, 'R', 'thorn', 0.5], [25, 'L', 'wall', 0.5], [26, 'LMR', 'gap', 1],
        [28, 'R', 'wall', 0.5], [29, 'M', 'takt', 0.5], [30, 'R', 'big', 0], [22, 'L', 'big', 0]],
      sky: 5 },
    { id: 'outro', name: 'Mondtor', bars: 4, chords: ['D', 'G', 'A', 'D'], drums: 'outro', bass: 'long', arp: 0.4, pad: 1, shift: 2,
      mel: ['F#5 . . . A5 . . .', 'B5 . . . D6 . . .', 'E6 . . . C#6 . . .', 'D6 . . . . . . .'],
      lanes: 'MR RR RM M',
      obst: [[12, 'M', 'gate', 0]],
      sky: 6 },
  ];

  // Drum patterns per bar (eight steps). fill: the last bar of a section rolls into the next one.
  const DRUMS = {
    intro: { kick: 'x.......', sh: '....x...' },
    verse: { kick: 'x...x...', clap: '..x...x.', hat: '.x.x.x.x' },
    rise: { kick: 'x..x..x.', clap: '..x...x.', hat: 'xxxxxxxx' },
    chorus: { kick: 'x.x.x.x.', clap: '..x...x.', hat: '.x.x.x.x', bell: 'x.......' },
    bridge: { kick: 'x.......', snare: '....x...', sh: '.x.x.x.x' },
    finale: { kick: 'x.x.x.x.', clap: '..x...x.', hat: 'xxxxxxxx', bell: 'x...x...' },
    outro: { tri: 'x.......' },
  };

  const NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function noteNum(s) {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(s);
    if (!m) throw new Error('bad note ' + s);
    return 12 * (Number(m[2]) + 1) + NAMES[m[1]];
  }
  const LANE = { L: 0, M: 1, R: 2 };

  // height of a jump at time tau (beats) after take-off
  function arcY(tau, beats, h) { const k = tau / beats; return k <= 0 || k >= 1 ? 0 : 4 * h * k * (1 - k); }

  function build() {
    const sections = [], notes = [], items = [], events = [];
    let beat0 = 0;
    for (const sec of SECTIONS) {
      const beats = sec.bars * BAR, shift = sec.shift || 0;
      sections.push({ id: sec.id, name: sec.name, b0: beat0, b1: beat0 + beats, sky: sec.sky, drums: sec.drums, bass: sec.bass, arp: sec.arp, pad: sec.pad, counter: !!sec.counter, shift, stones: !!sec.stones,
        chords: sec.chords.map((c) => CH[c].map((n) => n + shift)) });
      // melody notes, in order, with lanes
      const laneBars = sec.lanes.trim().split(/\s+/);
      if (laneBars.length !== sec.mel.length) throw new Error(sec.id + ': ' + laneBars.length + ' lane groups for ' + sec.mel.length + ' bars');
      let lane = 1;
      sec.mel.forEach((bar, bi) => {
        const steps = bar.trim().split(/\s+/), lanes = laneBars[bi];
        if (steps.length !== BAR * STEPS) throw new Error(sec.id + ' bar ' + (bi + 1) + ' has ' + steps.length + ' steps');
        const count = steps.filter((t) => t !== '.').length;
        if (count !== lanes.length) throw new Error(sec.id + ' bar ' + (bi + 1) + ': ' + lanes.length + ' lanes for ' + count + ' notes');
        let li = 0;
        steps.forEach((tok, si) => {
          if (tok === '.') return;
          const ch = lanes[li++];
          if (ch !== '-') lane = LANE[ch];
          // length until the next note, for the sound
          let len = 1; while (si + len < steps.length && steps[si + len] === '.' && len < 6) len++;
          notes.push({ b: beat0 + bi * BAR + si / STEPS, lane, pitch: noteNum(tok) + shift, len: len / STEPS, y: 0, sec: sec.id });
        });
      });
      for (const [b, lanes, kind, len] of sec.obst) for (const ch of lanes) items.push({ b: beat0 + b, lane: LANE[ch], kind, len: len || 0, sec: sec.id });
      // bridge: stepping stones, every odd beat is open sky
      if (sec.stones) for (let b = 1; b < beats; b += 2) for (let l = 0; l < 3; l++) items.push({ b: beat0 + b, lane: l, kind: 'gap', len: 1, sec: sec.id, stone: true });
      beat0 += beats;
    }
    const total = beat0;
    // floor, per grid step and lane
    const cells = total * STEPS;
    const floor = [0, 1, 2].map(() => new Uint8Array(cells).fill(1));
    for (const it of items) if (it.kind === 'gap') for (let s = Math.round(it.b * STEPS); s < Math.round((it.b + it.len) * STEPS); s++) floor[it.lane][s] = 0;
    const hasFloor = (lane, b) => { const s = Math.floor(b * STEPS); return s < 0 || s >= cells || floor[lane][s] === 1; };
    // notes over open sky float on the jump arc (ideal take-off before the gap); after a mushroom on the mushroom arc
    const mushes = items.filter((it) => it.kind === 'mush').sort((a, b) => a.b - b.b);
    const bigs = items.filter((it) => it.kind === 'big');
    for (const n of notes.concat(bigs)) {
      const m = mushes.find((mu) => n.b > mu.b && n.b < mu.b + MUSH_BEATS);
      if (m) { n.y = Math.max(0.5, arcY(n.b - m.b, MUSH_BEATS, MUSH_H)); n.air = 'mush'; continue; }
      if (hasFloor(n.lane, n.b)) { if (n.kind === 'big') n.y = 0.95; continue; }
      // find the start of this gap
      let g = Math.floor(n.b * STEPS); while (g > 0 && floor[n.lane][g - 1] === 0) g--;
      const take = g / STEPS - IDEAL_LEAD;
      n.y = Math.max(0.5, arcY(n.b - take, JUMP_BEATS, JUMP_H)); n.air = 'jump';
    }
    // notes on thorns float above them
    for (const n of notes.concat(bigs)) for (const it of items) if ((it.kind === 'thorn' || it.kind === 'takt') && it.lane === n.lane && n.b >= it.b - 0.01 && n.b < it.b + it.len + 0.01 && !n.air) {
      const take = it.b - 0.5; n.y = arcY(n.b - take, JUMP_BEATS, JUMP_H); n.air = 'jump';
    }
    items.sort((a, b) => a.b - b.b);
    return { BPM, BAR, STEPS, JUMP_BEATS, JUMP_H, MUSH_BEATS, MUSH_H, IDEAL_LEAD, total, sections, notes, items, floor, hasFloor, DRUMS, arcY, bigCount: items.filter((i) => i.kind === 'big').length };
  }

  // ---------- Run rules ----------
  // Time is the song position in beats, handed in from outside (the audio clock in the game, a counter in tests).
  // x is the lane as a float (0 left, 1 middle, 2 right), y the height in world units.
  const RULE = {
    LANE_BEATS: 0.3, // one lane change takes this long: quick start, soft landing (ease out)
    COYOTE: 0.12, BUFFER: 0.22, // in beats
    NOTE_WIN: 0.2, NOTE_X: 0.55, NOTE_Y: 0.85, BIG_Y: 1.0,
    THORN_Y: 0.55, WALL_Y: 2.3, FALL_Y: -2.4,
    STUMBLE_INV: 1.5, RESCUE_BEATS: 1.0, RESCUE_INV: 1.5,
    PERFECT: 0.15, COMBO_STEP: 8, MAX_MULT: 4,
    NOTE_PTS: 100, BIG_PTS: 500, PERFECT_PTS: 50,
  };
  const BIG_FLOAT = 0.95;

  function createRun(chart, opts) {
    const o = opts || {};
    const emit = o.onEvent || (() => {});
    const JB = chart.JUMP_BEATS, JH = chart.JUMP_H * (o.jumpScale || 1), MB = chart.MUSH_BEATS, MH = chart.MUSH_H;
    const S = {
      beat: o.startBeat != null ? o.startBeat : -4, x: 1, lane: 1, y: 0, vy: 0, ground: true, mode: 'run', airKind: null, leftGround: -9,
      jumpBuf: -9, inv: 0, combo: 0, maxCombo: 0, score: 0, notesGot: 0, bigGot: 0, perfects: 0, stumbles: 0, falls: 0,
      fever: false, rescueT: 0, done: false, gotNote: new Uint8Array(chart.notes.length), gotItem: new Uint8Array(chart.items.length),
      noteIdx: 0, lastJumpTake: null, mult: 1, laneFrom: 1, laneT: 9,
    };
    // per-arc gravity and launch speed, in units per beat
    const arc = (beats, h) => ({ g: 8 * h / (beats * beats), v: 4 * h / beats });
    const JUMP = arc(JB, JH), MUSH = arc(MB, MH);
    const laneAt = () => Math.round(S.x);
    const mult = () => 1 + Math.min(RULE.MAX_MULT - 1, Math.floor(S.combo / RULE.COMBO_STEP));
    function addCombo() {
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
      const m = mult(); if (m !== S.mult) { S.mult = m; emit('mult', { mult: m }); }
      const f = m >= RULE.MAX_MULT; if (f !== S.fever) { S.fever = f; emit('fever', { on: f }); }
    }
    function breakCombo() {
      if (S.combo > 0) emit('comboLost', { combo: S.combo });
      S.combo = 0; if (S.mult !== 1) { S.mult = 1; emit('mult', { mult: 1 }); }
      if (S.fever) { S.fever = false; emit('fever', { on: false }); }
    }
    function launch(kind) {
      const a = kind === 'mush' ? MUSH : JUMP;
      S.vy = a.v; S.ground = false; S.mode = kind === 'mush' ? 'mush' : 'jump'; S.airKind = kind; S.g = a.g; S.jumpBuf = -9;
      if (kind === 'jump') judgeJump();
      emit(kind === 'mush' ? 'mush' : 'jump', { beat: S.beat });
    }
    // a jump right on the ideal take-off before a gap or thorn in this lane counts as perfect
    function judgeJump() {
      const l = laneAt(); let best = null;
      for (const it of chart.items) {
        if (it.lane !== l || it.b < S.beat - 0.2 || it.b > S.beat + 1.2) continue;
        let ideal = null;
        if (it.kind === 'gap' && chart.hasFloor(l, it.b - 0.25)) ideal = it.b - chart.IDEAL_LEAD;
        else if (it.kind === 'thorn' || it.kind === 'takt') ideal = it.b - 0.5;
        if (ideal != null && (best == null || Math.abs(S.beat - ideal) < Math.abs(S.beat - best))) best = ideal;
      }
      if (best != null && Math.abs(S.beat - best) <= RULE.PERFECT) {
        S.perfects++; S.score += RULE.PERFECT_PTS * mult(); emit('perfect', { beat: S.beat });
      }
    }
    function hurt(kind) {
      if (S.inv > 0 || o.invincible) { if (o.invincible && S.inv <= 0) { S.inv = 0.6; emit('bump', { kind }); } return; }
      S.stumbles++; S.inv = RULE.STUMBLE_INV; breakCombo();
      if (S.ground) { S.vy = JUMP.v * 0.45; S.g = JUMP.g; S.ground = false; S.mode = 'jump'; S.airKind = 'stumble'; }
      emit('stumble', { kind, beat: S.beat });
    }
    function takt(it, beat) { return Math.floor(beat) % 2 === Math.floor(it.b) % 2; }
    function step(beat, input) {
      if (S.done) return S;
      const db = Math.max(0, Math.min(0.25, beat - S.beat)); S.beat = beat;
      const inp = input || {};
      if (beat < 0) return S;
      // lanes
      const was = S.lane;
      if (inp.left) S.lane = Math.max(0, S.lane - 1);
      if (inp.right) S.lane = Math.min(2, S.lane + 1);
      if (S.lane !== was) { S.laneFrom = S.x; S.laneT = 0; emit('lane', { lane: S.lane, dir: S.lane > was ? 1 : -1 }); }
      S.laneT += db;
      const lk = Math.min(1, S.laneT / RULE.LANE_BEATS); S.x = S.laneFrom + (S.lane - S.laneFrom) * (1 - Math.pow(1 - lk, 3));
      if (inp.jump) S.jumpBuf = beat;
      S.inv = Math.max(0, S.inv - db);
      const l = laneAt();
      // rescue cloud: carries Mimo up and along until there is track below
      if (S.mode === 'rescue') {
        S.rescueT += db; S.y = Math.min(0, S.y + db * 4.2); S.vy = 0; S.ground = S.y >= -0.01;
        if (S.ground && S.rescueT >= RULE.RESCUE_BEATS && chart.hasFloor(l, beat) && chart.hasFloor(l, beat + 0.3)) { S.mode = 'run'; emit('rescued', {}); }
        if (beat - S.jumpBuf <= RULE.BUFFER && S.y > -0.6) { S.mode = 'run'; launch('jump'); }
      } else if (S.ground) {
        if (!chart.hasFloor(l, beat) && !chart.hasFloor(l, beat + 0.15)) { S.ground = false; S.vy = 0; S.g = JUMP.g; S.leftGround = beat; S.mode = 'jump'; S.airKind = 'drop'; }
        else if (beat - S.jumpBuf <= RULE.BUFFER) launch('jump');
      } else if (S.airKind === 'drop' && beat - S.leftGround <= RULE.COYOTE && beat - S.jumpBuf <= RULE.BUFFER && S.y > -0.3) launch('jump');
      // flight
      if (!S.ground && S.mode !== 'rescue') {
        S.vy -= S.g * db; S.y += S.vy * db;
        if (S.y <= 0 && S.vy < 0 && S.y > -0.6 && chart.hasFloor(l, beat)) {
          S.y = 0; S.vy = 0; S.ground = true; S.mode = 'run'; S.airKind = null; emit('land', { beat });
          if (beat - S.jumpBuf <= RULE.BUFFER) launch('jump');
        } else if (S.y < RULE.FALL_Y) {
          S.falls++; breakCombo(); S.mode = 'rescue'; S.rescueT = 0; S.inv = RULE.RESCUE_INV + RULE.RESCUE_BEATS; emit('fall', { beat });
        }
      }
      // items in this lane
      for (let i = 0; i < chart.items.length; i++) {
        const it = chart.items[i];
        if (it.b > beat + 0.6) break;
        if (it.b + Math.max(it.len, 0.5) < beat - 0.6) continue;
        if (it.kind === 'mush' && S.ground && S.mode === 'run' && it.lane === l && beat >= it.b && beat - it.b < 0.3 && !S.gotItem[i]) { S.gotItem[i] = 1; launch('mush'); continue; }
        if (it.kind === 'big' && !S.gotItem[i] && Math.abs(beat - it.b) < RULE.NOTE_WIN + 0.05 && Math.abs(S.x - it.lane) < RULE.NOTE_X && Math.abs(S.y - (it.y || BIG_FLOAT)) < RULE.BIG_Y) {
          S.gotItem[i] = 1; S.bigGot++; addCombo(); S.score += RULE.BIG_PTS * mult(); emit('big', { item: it, i }); continue;
        }
        if (it.kind === 'gate' && beat >= it.b && !S.gotItem[i]) { S.gotItem[i] = 1; emit('gate', { item: it }); continue; }
        if (it.lane !== l) continue;
        if ((it.kind === 'thorn' || (it.kind === 'takt' && takt(it, beat))) && beat > it.b + 0.08 && beat < it.b + Math.max(0.5, it.len) - 0.08 && S.y < RULE.THORN_Y) hurt(it.kind);
        if (it.kind === 'wall' && beat > it.b - 0.05 && beat < it.b + it.len && S.y < RULE.WALL_Y) hurt('wall');
      }
      // notes: collected inside a small window around their time, sound is played at the exact note time
      while (S.noteIdx < chart.notes.length && chart.notes[S.noteIdx].b < beat - RULE.NOTE_WIN) {
        if (!S.gotNote[S.noteIdx]) { emit('miss', { note: chart.notes[S.noteIdx], i: S.noteIdx }); breakComboSoft(); }
        S.noteIdx++;
      }
      for (let i = S.noteIdx; i < chart.notes.length; i++) {
        const n = chart.notes[i]; if (n.b > beat + RULE.NOTE_WIN) break;
        if (S.gotNote[i]) continue;
        if (Math.abs(S.x - n.lane) < RULE.NOTE_X && Math.abs(S.y - n.y) < RULE.NOTE_Y) {
          S.gotNote[i] = 1; S.notesGot++; addCombo(); S.score += RULE.NOTE_PTS * mult(); emit('note', { note: n, i, mult: mult() });
        }
      }
      if (beat >= chart.total) { S.done = true; emit('done', {}); }
      return S;
    }
    // a missed note does not break the combo, only stumbles and falls do. Keeps it relaxed.
    function breakComboSoft() {}
    return { S, step, RULE, mult, takt: (it, b) => takt(it, b), JUMP, MUSH };
  }

  // ---------- Autopilot: follows the notes, avoids trouble, jumps on the ideal beat ----------
  // Used by the tests and the attract mode. Returns edge inputs for the current beat.
  function createPilot(chart, run, opts) {
    const skipBigs = !!(opts && opts.notesOnly);
    let lastSwitch = -9, lastJump = -9;
    const blocked = (lane, b0, b1) => chart.items.some((it) => it.lane === lane && it.b < b1 && it.b + Math.max(0.5, it.len) > b0 && (it.kind === 'wall'));
    const danger = (lane, b0, b1) => chart.items.some((it) => it.lane === lane && it.b < b1 && it.b + Math.max(0.5, it.len) > b0 && (it.kind === 'wall' || it.kind === 'thorn' || it.kind === 'takt' || it.kind === 'gap'));
    return function pilot(beat) {
      const S = run.S, out = { left: false, right: false, jump: false };
      if (beat < 0) return out;
      // target lane: the next note or big star soon, else the safest lane
      // stay on a note until its time has passed, then head for the next one
      let target = S.lane;
      const now = chart.notes.find((n) => n.b >= beat - 0.06 && n.b < beat + 0.12);
      const nxt = now || chart.notes.find((n) => n.b >= beat + 0.12 && n.b < beat + 1.6);
      const big = chart.items.find((it, i) => it.kind === 'big' && it.b > beat - 0.06 && it.b < beat + 1.6 && (!S.gotItem[i] || it.b > beat - 0.06 && it.b < beat + 0.12));
      const want = big && !skipBigs && (!nxt || big.b <= nxt.b + 0.6) ? big.lane : nxt ? nxt.lane : null;
      if (want != null) target = want;
      else if (danger(S.lane, beat, beat + 1.2)) { for (const l of [1, 0, 2]) if (!danger(l, beat, beat + 1.2)) { target = l; break; } }
      if (blocked(target, beat, beat + 0.8)) for (const l of [S.lane, 1, 0, 2]) if (!blocked(l, beat, beat + 0.8)) { target = l; break; }
      if (target !== S.lane && beat - lastSwitch > 0.12) { if (target < S.lane) out.left = true; else out.right = true; lastSwitch = beat; }
      // jump on the ideal take-off before gaps and thorns in the lane we are heading to
      const l = target;
      if (S.ground && beat - lastJump > 0.4) {
        for (const it of chart.items) {
          if (it.lane !== l || it.b < beat - 0.1 || it.b > beat + 1) continue;
          let ideal = null, latest = null;
          if (it.kind === 'gap' && chart.hasFloor(l, it.b - 0.25)) { ideal = it.b - chart.IDEAL_LEAD; latest = it.b + 0.05; }
          else if (it.kind === 'thorn' || it.kind === 'takt') { ideal = it.b - 0.5; latest = it.b - 0.16; }
          if (ideal != null && beat >= ideal - 0.02 && beat < latest) { out.jump = true; lastJump = beat; break; }
        }
      }
      if (S.mode === 'rescue' && S.y > -0.5 && beat - lastJump > 0.4 && !chart.hasFloor(l, beat + 0.6)) { out.jump = true; lastJump = beat; }
      return out;
    };
  }

  const api = { build, createRun, createPilot, RULE, BPM, noteNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StarwayCore = api;
})(typeof window !== 'undefined' ? window : this);
