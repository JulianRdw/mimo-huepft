// Garden party (see garden-base.js): Caspar's story, and his revenge at the end of the loop.
//   32-56   Julian fetches Caspar for digging: two spades out of the sand, a hole dug in turns (the pile grows with every
//           spadeful), Caspar hops in, Julian shovels the pile back in up to his neck, lifts the towel off the corner of
//           the sandbox, lets it sink over Caspar's whole head ("Gute Nacht, Caspar!") and tiptoes off. A muffled "Mmmh …".
//           Then nothing: the party goes on without Caspar (his bubbles only show while he is in the picture).
//   80-103  Naike: "Sagt mal … wo ist eigentlich Caspar?" Heads turn, Julian whistles, a faint "Hilfe …" from off the
//           picture; Mimo hops over, finds the trembling towel and raises the alarm, Ole runs over, whips the towel off,
//           digs Caspar out; Caspar spits sand, climbs out, shakes himself, high five: "Danke, Ole!"
//   146-160 Revenge: Caspar lures Julian ("Ein Schatz!"), Mimo bumps him into the open hole, Caspar and Ole shovel him in,
//           Caspar lays the towel over him ("Jetzt bist du dran, Julian!"); Ole: "Die Würstchen sind fertig!", everyone
//           cheers and runs to the grill; Julian bursts out in a cloud of sand and runs after them, so at the loop's start
//           everything is back: Julian free at home, the hole closed, the towel and the spades in their places.
// Everything is a function of the loop time t; the spades, the towel, the hole, the pile and the sand in flight are drawn
// here (back / after / front), the sunk figures by `person`.
(function () {
  'use strict';
  const G = window.Garden; if (!G) { if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} }); return; }
  const { HOME: H, GD } = G;
  const HX = GD.HOLE, SY = GD.SAND, PILE = HX + 32;            // the hole, the sand line, the pile on the right of the hole
  const TOWEL_HOME = [HX + 56, SY - 3];                         // folded on the right corner of the sandbox
  const SPADE_HOME = { blue: [HX - 42, SY - 8], orange: [HX + 27, SY + 2] };
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const io = G.ease.io, out = G.ease.out;
  const SINK = { sidepart: 21, striped: 23 };                   // how deep each one stands in the hole (sand up to the neck)
  const FULL = { sidepart: 12, striped: 12 };                   // how high the sand is filled in around the neck

  // ---------- spadefuls: who digs when (each cycle: scoop, lift, toss; the sand lands and the hole / pile / fill step) ----------
  //   kind 'dig': out of the hole onto the pile, 'fill': from the pile into the hole, 'free': from around the neck onto the pile
  const DIGS = [
    { who: 'striped', t0: 39.0, n: 5, P: 0.96, kind: 'dig' },
    { who: 'sidepart', t0: 39.48, n: 5, P: 0.96, kind: 'dig' },
    { who: 'striped', t0: 47.1, n: 4, P: 0.66, kind: 'fill' },
    { who: 'redbeard', t0: 95.5, n: 4, P: 0.6, kind: 'free' },
    { who: 'sidepart', t0: 150.5, n: 4, P: 0.6, kind: 'fill' },
    { who: 'redbeard', t0: 150.95, n: 4, P: 0.6, kind: 'fill' },
  ];
  const REL = 0.58, FLY = 0.4;                                  // the sand leaves the blade at REL of a cycle, flies FLY s
  // how many spadefuls of the given sessions have landed by t (each one eases in over 0.16 s: steps, not a slide)
  const landed = (list, t) => {
    let v = 0;
    for (const d of list) for (let i = 0; i < d.n; i++) v += seg(t, d.t0 + i * d.P + REL * d.P + FLY - 0.04, d.t0 + i * d.P + REL * d.P + FLY + 0.12);
    return v;
  };
  const S_DIG = DIGS.slice(0, 2), S_FILL = [DIGS[2]], S_FREE = [DIGS[3]], S_REV = DIGS.slice(4);
  // the burst at the end: Julian jumps out of the sand, everything settles back to the start
  const BURST = 157.4;
  const hole = (t) => t >= BURST + 0.3 ? 0 : t >= BURST ? 1 - seg(t, BURST, BURST + 0.3) : t < 45 ? landed(S_DIG, t) / 10 : 1;
  const pile = (t) => {
    if (t >= BURST) return lerp(0.2, 0.15, seg(t, BURST, BURST + 0.4));
    return 0.15 + 0.85 * landed(S_DIG, t) / 10 - 0.8 * landed(S_FILL, t) / 4 + 0.8 * landed(S_FREE, t) / 4 - 0.8 * landed(S_REV, t) / 8;
  };
  const fill = (t) => {
    if (t < 90) return FULL.sidepart * landed(S_FILL, t) / 4;
    if (t < 120) return FULL.sidepart * (1 - landed(S_FREE, t) / 4);
    if (t < BURST) return FULL.striped * landed(S_REV, t) / 8;
    return FULL.striped * (1 - seg(t, BURST, BURST + 0.25));
  };

  // the top of the sand mound round the neck at x (the same curve the mound is drawn with)
  const moundW = (f) => 10 + f * 0.7;
  const moundY = (x, f) => { const d = Math.abs(x - HX); if (f < 0.05) return SY; return d < 5 ? SY - f : SY - f + (f + 3) * Math.pow(Math.min(1, (d - 5) / moundW(f)), 1.7); };

  // ---------- who stands in the hole: how deep (feet below the sand), where, a hop, a wobble ----------
  function sunk(who, t) {
    if (who === 'sidepart') {
      if (G.inn(t, 44.9, 46.6)) {   // a little hop over the rim and down into the hole, a wobble when he lands
        const k = seg(t, 44.9, 45.35), d = t < 45.35 ? -Math.sin(k * Math.PI) * 7 + k * k * 4 : lerp(4, SINK.sidepart, G.ease.back(seg(t, 45.35, 45.7)));
        return { x: lerp(HX + 23, HX, io(k)), d, wob: t > 45.6 ? Math.sin((t - 45.6) * 18) * 0.06 * Math.exp(-(t - 45.6) * 3.5) : 0 };
      }
      if (G.inn(t, 46.6, 98.6)) return { x: HX, d: SINK.sidepart, wob: 0 };
      if (G.inn(t, 98.6, 99.4)) {   // climbs out: up, over the rim to the left
        const k = seg(t, 98.6, 99.4);
        return { x: lerp(HX, HX - 14, io(seg(t, 98.9, 99.4))), d: lerp(SINK.sidepart, 0, out(k)) - Math.sin(seg(t, 98.9, 99.4) * Math.PI) * 4, wob: 0 };
      }
      return null;
    }
    if (who === 'striped') {
      if (G.inn(t, 149.95, 150.8)) {   // bumped in: a stumble forward, falls, a wobble
        const k = seg(t, 149.95, 150.3), d = t < 150.3 ? -Math.sin(k * Math.PI) * 4 + k * k * 8 : lerp(8, SINK.striped, G.ease.back(seg(t, 150.3, 150.6)));
        return { x: lerp(HX - 16, HX, io(k)), d, wob: t > 150.5 ? Math.sin((t - 150.5) * 18) * 0.07 * Math.exp(-(t - 150.5) * 3.5) : 0 };
      }
      if (G.inn(t, 150.8, BURST)) return { x: HX, d: SINK.striped, wob: 0 };
      if (G.inn(t, BURST, BURST + 0.45)) { const k = seg(t, BURST, BURST + 0.45); return { x: lerp(HX, HX - 12, k), d: lerp(SINK.striped, 0, out(k)) - Math.sin(k * Math.PI) * 9, wob: 0 }; }
      return null;
    }
    return null;
  }

  // ---------- the spades: stuck in the sand, or in a hand ----------
  // [t, 'stuck', x, y] or [t, who]: from t on (a 0.3 s move from the state before)
  const SPADES = {
    blue: { col: ['#8FB7D9', '#4E7598'], keys: [[0, 'stuck', ...SPADE_HOME.blue], [37.5, 'striped'], [49.7, 'stuck', PILE + 6, SY - 4], [150.62, 'redbeard'], [157.65, 'stuck', ...SPADE_HOME.blue]] },
    orange: { col: ['#F2B36E', '#B5763A'], keys: [[0, 'stuck', ...SPADE_HOME.orange], [38.75, 'sidepart'], [44.45, 'stuck', ...SPADE_HOME.orange], [95.2, 'redbeard'], [98.0, 'stuck', ...SPADE_HOME.orange], [147.35, 'sidepart'], [153.0, 'stuck', ...SPADE_HOME.orange]] },
  };
  const LEN = 23;
  const digOf = (who, t) => DIGS.find((d) => d.who === who && t >= d.t0 - 0.2 && t < d.t0 + d.n * d.P + 0.1);
  // where the blade goes and where the sand of a session goes
  function digPoints(d, x, t) {
    const side = Math.sign(x - HX) || 1;
    if (d.kind === 'dig') return { from: [HX + side * 6, SY + 1], to: [PILE + (side < 0 ? -3 : 3), SY - 2 - 10 * pile(t)] };
    if (d.kind === 'free') return { from: [HX + side * 9, SY - fill(t) + 1], to: [PILE + 2, SY - 2 - 10 * pile(t)] };
    return { from: [PILE + Math.sign(x - PILE) * 4, SY - 1 - 6 * pile(t)], to: [HX + (Math.sign(x - HX) || 1) * 7, SY - fill(t) - 2] };
  }
  // the spade in a hand: grip at the hand, the blade's angle (radians, 0 = right, PI/2 = down) and whether sand is on it
  function heldSpade(A, who, t) {
    const k = A.who(who); if (!k || !k.p) return null;
    const lh = A.hand(k, 'l'), rh = A.hand(k, 'r'), d = digOf(who, t);
    const near = (x) => (Math.abs(lh[0] - x) < Math.abs(rh[0] - x) ? lh : rh);
    if (!d) { const g = near(k.x + 6); return { g, a: Math.PI / 2 - 0.25, sand: false }; }
    const P = digPoints(d, k.x, t), g = near(P.from[0]);
    const u = ((t - d.t0) / d.P) % 1, inCycle = t >= d.t0 && t < d.t0 + d.n * d.P;
    const aim = Math.atan2(P.from[1] - g[1], P.from[0] - g[0]);
    const tossDir = Math.sign(P.to[0] - k.x) || 1, toss = Math.atan2(-0.95, tossDir * 0.45);
    const turn = (a, b, f) => { let dA = b - a; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI; return a + dA * f; };
    if (!inCycle) return { g, a: aim, sand: false };
    let a;
    if (u < 0.42) a = aim + Math.sin(u / 0.42 * Math.PI) * 0.12 * tossDir;                 // the push into the sand
    else if (u < REL) a = turn(aim, toss, io(seg(u, 0.42, REL)));                           // the lift, the swing
    else if (u < 0.78) a = toss;                                                            // the toss: the sand flies
    else a = turn(toss, aim, io(seg(u, 0.78, 1)));                                          // and back down
    return { g, a, sand: u > 0.3 && u < REL + 0.02 };
  }
  function spadeState(A, name, t) {
    const S = SPADES[name], K = S.keys;
    let i = 0; for (let j = 0; j < K.length; j++) if (t >= K[j][0]) i = j;
    const one = (key) => (key[1] === 'stuck' ? { g: [key[2], key[3] - LEN + 7], a: Math.PI / 2 + 0.08, stuck: [key[2], key[3]] } : heldSpade(A, key[1], t));
    const now = one(K[i]); if (!now) return null;
    const k = seg(t, K[i][0], K[i][0] + 0.3);
    if (k >= 1 || i === 0) return { ...now, who: K[i][1] === 'stuck' ? null : K[i][1] };
    const was = one(K[i - 1]); if (!was) return now;
    const e = io(k);
    return { g: [lerp(was.g[0], now.g[0], e), lerp(was.g[1], now.g[1], e)], a: lerp(was.a, now.a, e), sand: false, who: K[i][1] === 'stuck' ? K[i - 1][1] : K[i][1] };
  }
  function drawSpade(c, s, col, pal) {
    const ca = Math.cos(s.a), sa = Math.sin(s.a), [gx, gy] = s.g;
    const p = (u, v) => [gx + ca * u - sa * v, gy + sa * u + ca * v];   // u along the spade, v across
    c.save();
    if (s.stuck) { c.beginPath(); c.rect(s.stuck[0] - 20, s.stuck[1] - 40, 40, 40); c.clip(); }
    c.lineCap = 'round'; c.strokeStyle = '#8A6440'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(...p(0, 0)); c.lineTo(...p(LEN - 8, 0)); c.stroke();
    c.strokeStyle = '#C99A6E'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(...p(0, 0)); c.lineTo(...p(LEN - 8, 0)); c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = '#8A6440'; c.beginPath(); c.moveTo(...p(0, -2.4)); c.lineTo(...p(0, 2.4)); c.stroke();
    c.fillStyle = col[0]; c.strokeStyle = col[1]; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(...p(LEN - 8.5, -3.3)); c.lineTo(...p(LEN - 8.5, 3.3)); c.quadraticCurveTo(...p(LEN - 1.8, 4), ...p(LEN, 0)); c.quadraticCurveTo(...p(LEN - 1.8, -4), ...p(LEN - 8.5, -3.3)); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(...p(LEN - 7.5, -2)); c.lineTo(...p(LEN - 3, -1.6)); c.lineTo(...p(LEN - 7.5, -0.8)); c.closePath(); c.fill();
    if (s.sand) { c.fillStyle = pal.sand; c.strokeStyle = pal.sandInk; c.lineWidth = 0.5; const m = p(LEN - 4, 0); c.beginPath(); c.ellipse(m[0], m[1] - 1.4, 4.2, 2.6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.restore();
    if (s.stuck) { c.fillStyle = pal.sandInk; c.beginPath(); c.ellipse(s.stuck[0], s.stuck[1] + 0.3, 3.2, 0.9, 0, 0, Math.PI * 2); c.fill(); }
  }

  // ---------- the towel ----------
  // where it is: 'home' (folded on the corner), 'lift' (from the corner up to the hands of who), 'held', 'drop' (sinks onto
  // the head of under), 'drape', 'fly' (thrown off: from the head or the hand back to the corner)
  function towelAt(t) {
    if (t < 50.0) return { m: 'home' };
    if (t < 50.4) return { m: 'lift', who: 'striped', k: seg(t, 50.0, 50.4) };
    if (t < 51.5) return { m: 'held', who: 'striped' };
    if (t < 52.9) return { m: 'drop', who: 'striped', under: 'sidepart', k: seg(t, 51.5, 52.9) };
    if (t < 94.1) return { m: 'drape', under: 'sidepart' };
    if (t < 94.4) return { m: 'grab', who: 'redbeard', under: 'sidepart', k: seg(t, 94.1, 94.4) };
    if (t < 95.1) return { m: 'fly', who: 'redbeard', k: seg(t, 94.4, 95.1) };
    if (t < 153.9) return { m: 'home' };
    if (t < 154.3) return { m: 'lift', who: 'sidepart', k: seg(t, 153.9, 154.3) };
    if (t < 155.0) return { m: 'held', who: 'sidepart' };
    if (t < 156.2) return { m: 'drop', who: 'sidepart', under: 'striped', k: seg(t, 155.0, 156.2) };
    if (t < BURST) return { m: 'drape', under: 'striped' };
    if (t < BURST + 0.8) return { m: 'fly', under: 'striped', k: seg(t, BURST, BURST + 0.8) };
    return { m: 'home' };
  }
  const W = 30, HT = 27, HELD = 15;   // the towel hanging: width, height (held up: the lower half folded over the hands)
  // the outline of a hanging sheet (top centre cx, top) and of the drape over a head (h = head centre, r = head radius),
  // as 9 points from the bottom left round the top to the bottom right; k blends sheet -> drape
  function towelShape(cx, top, ground, h, k, sway, nose, ht) {
    const HT_ = ht || HT;
    const bottom = typeof ground === 'number' ? () => ground : ground;
    const sheet = [[cx - W / 2 + sway, top + HT_], [cx - W / 2 + sway * 0.6, top + HT_ * 0.55], [cx - W / 2 + 0.5, top + 2], [cx - W / 4, top + 1.2], [cx, top + 1.8], [cx + W / 4, top + 1.2], [cx + W / 2 - 0.5, top + 2], [cx + W / 2 + sway * 0.6, top + HT_ * 0.55], [cx + W / 2 + sway, top + HT_]];
    if (!h) return sheet.map(([x, y]) => [x, Math.min(y, bottom(x))]);
    const [hx, hy] = h, r = 14, tp = hy - r - 1.5;
    const drape = [[hx - r - 3, bottom(hx - r - 3)], [hx - r - 1.2, hy + 5], [hx - r + 0.4, hy - 5], [hx - r * 0.55, tp + 2.2], [hx, tp], [hx + r * 0.55, tp + 2.2], [hx + r - 0.4, hy - 5], [hx + r + 1.2, hy + 5], [hx + r + 3, bottom(hx + r + 3)]];
    if (nose) { const i = nose < 0 ? 1 : 7; drape[i] = [drape[i][0] + nose * 2.4, drape[i][1] - 4]; }
    return sheet.map(([x, y], i) => { const ny = Math.min(y, bottom(x)); return [lerp(x, drape[i][0], k), lerp(ny, drape[i][1], k)]; });
  }
  function drawTowelShape(c, pts, pal, wob, now) {
    const P = pts.map(([x, y], i) => [x + (wob ? Math.sin(now * 23 + i * 1.7) * wob : 0), y + (wob ? Math.cos(now * 19 + i * 2.3) * wob * 0.6 : 0)]);
    const bl = P[0], br = P[8], path = new Path2D();
    path.moveTo(...bl);
    for (let i = 1; i < 8; i++) { const m = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; path.quadraticCurveTo(P[i][0], P[i][1], ...(i === 7 ? br : m)); }
    // the hem: a soft wave along the bottom
    const n = 6; for (let i = 1; i <= n; i++) { const x = lerp(br[0], bl[0], i / n), y = lerp(br[1], bl[1], i / n), mx = lerp(br[0], bl[0], (i - 0.5) / n), my = lerp(br[1], bl[1], (i - 0.5) / n); path.quadraticCurveTo(mx, my + (i % 2 ? 1.4 : -0.4), x, y); }
    path.closePath();
    c.save();
    c.save(); c.clip(path);
    const x0 = Math.min(...P.map((p) => p[0])) - 2, x1 = Math.max(...P.map((p) => p[0])) + 2, y0 = Math.min(...P.map((p) => p[1])) - 3, y1 = Math.max(...P.map((p) => p[1])) + 3;
    const sw = (x1 - x0) / 7;
    for (let i = 0; i < 7; i++) { c.fillStyle = pal.towel[i % 2]; c.fillRect(x0 + i * sw, y0, sw + 0.3, y1 - y0); }
    c.fillStyle = 'rgba(40,40,80,0.10)'; c.fillRect(x0, y0, 4, y1 - y0); c.fillRect(x1 - 4, y0, 4, y1 - y0);
    c.fillStyle = 'rgba(40,40,80,0.08)'; c.fillRect(x0, y1 - 6, x1 - x0, 6);
    c.restore();
    c.strokeStyle = pal.ink; c.globalAlpha = 0.4; c.lineWidth = 0.7; c.stroke(path);
    // two soft folds from the shoulders down
    c.globalAlpha = 0.16; c.lineWidth = 0.6; c.beginPath();
    c.moveTo(lerp(P[2][0], P[3][0], 0.5) + 1, lerp(P[2][1], P[3][1], 0.5) + 4); c.quadraticCurveTo(P[1][0] + 4, P[1][1], bl[0] + 6, bl[1] - 1);
    c.moveTo(lerp(P[6][0], P[5][0], 0.5) - 1, lerp(P[6][1], P[5][1], 0.5) + 4); c.quadraticCurveTo(P[7][0] - 4, P[7][1], br[0] - 6, br[1] - 1);
    c.stroke();
    c.restore();
  }
  function towelFolded(c, x, y, pal) {   // folded in three, lying on the corner of the sandbox
    c.save(); c.translate(x, y);
    for (let i = 0; i < 6; i++) { c.fillStyle = pal.towel[i % 2]; c.fillRect(-11 + i * 22 / 6, -3.2, 22 / 6 + 0.3, 6.4); }
    c.strokeStyle = pal.ink; c.globalAlpha = 0.3; c.lineWidth = 0.6; c.strokeRect(-11, -3.2, 22, 6.4);
    c.beginPath(); c.moveTo(-11, -1); c.lineTo(11, -1); c.moveTo(-11, 1.2); c.lineTo(11, 1.2); c.stroke();
    c.restore();
  }
  const handsMid = (A, who) => { const k = A.who(who); if (!k || !k.p) return null; const l = A.hand(k, 'l'), r = A.hand(k, 'r'); return [(l[0] + r[0]) / 2, Math.min(l[1], r[1]) - 1]; };
  function headOf(A, who) { const k = A.who(who); return k && k.p ? A.head(k) : null; }
  const calling = (A, who, t) => A.lines.some(([a, w, , d]) => w === who && t >= a && t < a + d) || A.tapped(who);

  function drawTowel(c, t, A) {
    const pal = A.pal, s = towelAt(t), now = A.now;
    if (s.m === 'home') { towelFolded(c, TOWEL_HOME[0], TOWEL_HOME[1], pal); return; }
    if (s.m === 'lift') {   // unfolds while it comes up to the hands
      const m = handsMid(A, s.who); if (!m) return;
      const e = io(s.k), cx = lerp(TOWEL_HOME[0], m[0], e), top = lerp(TOWEL_HOME[1] - 3, m[1], e);
      const pts = towelShape(cx, top, 999, null, 0, Math.sin(now * 3) * 0.6, 0, lerp(6, HELD, e)).map(([x, y]) => [lerp(cx + (x - cx) * 0.75, x, e), y]);
      drawTowelShape(c, pts, pal, 0, now); return;
    }
    if (s.m === 'held') { const m = handsMid(A, s.who); if (!m) return; drawTowelShape(c, towelShape(m[0], m[1], 999, null, 0, Math.sin(now * 2.4) * 1.2, 0, HELD), pal, 0, now); return; }
    const hk = s.under && A.who(s.under), h = s.under && headOf(A, s.under), f = fill(t), base = (x) => moundY(x, f) + 0.6;
    const nose = s.under === 'sidepart' ? -1 : 1;
    if (s.m === 'drop') {   // flicked up from the hands: it sails over, unfolds, floats down (a slow sway) and settles round the head
      const m = handsMid(A, s.who) || [h[0] + 14, h[1] - 10], tp = h[1] - 14 - 1.5, f = s.k;
      const top = G.at([[0, m[1]], [0.3, Math.min(m[1], tp) - 16, 'out'], [0.74, tp, 'io']], f);
      const cx = lerp(m[0], h[0], io(seg(f, 0.04, 0.62))), k = io(seg(f, 0.64, 1));
      drawTowelShape(c, towelShape(cx, top, base, h, k, Math.sin(f * 9) * 2.4 * (1 - k), k > 0.5 ? nose : 0, lerp(HELD, HT, io(seg(f, 0.18, 0.7)))), pal, 0, now); return;
    }
    if (s.m === 'drape') {
      const wob = calling(A, s.under, t) ? 0.7 : (s.under === 'striped' && G.inn(t, 156.4, 157.4)) ? 0.9 : 0.08;
      drawTowelShape(c, towelShape(h[0], 0, base, h, 1, 0, nose), pal, wob, now); return;
    }
    if (s.m === 'grab') {   // Ole's hand takes the top: it comes up off the head
      const m = handsMid(A, s.who) || [h[0], h[1] - 20], e = io(s.k);
      drawTowelShape(c, towelShape(lerp(h[0], m[0], e), lerp(h[1] - 15.5, m[1], e), base, h, 1 - e, 0, 0), pal, 0, now); return;
    }
    if (s.m === 'fly') {    // a big swing in an arc, spinning, onto the corner of the sandbox; it lands folded
      const from = s.who ? (handsMid(A, s.who) || [HX, SY - 40]) : [h ? h[0] : HX, h ? h[1] - 14 : SY - 30];
      const e = s.k, x = lerp(from[0], TOWEL_HOME[0], io(e)), y = lerp(from[1], TOWEL_HOME[1], e) - Math.sin(e * Math.PI) * (s.who ? 26 : 34);
      if (e > 0.85) { towelFolded(c, x, y, pal); return; }
      A.towel(c, x, y, lerp(26, 22, e), lerp(16, 6.4, e), (s.who ? 1 : -1) * e * Math.PI * 2);
    }
  }

  // ---------- sand in the air ----------
  function drawFlyingSand(c, t, A) {
    const pal = A.pal;
    for (const d of DIGS) {
      const k0 = A.who(d.who); if (!k0) continue;
      for (let i = 0; i < d.n; i++) {
        const r = d.t0 + i * d.P + REL * d.P, k = (t - r) / FLY;
        if (k < 0 || k > 1.25) continue;
        const P = digPoints(d, k0.x, r + FLY), dir = Math.sign(P.to[0] - k0.x) || 1;
        const a = [k0.x + dir * 5, k0.y - 30], b = P.to;
        if (k <= 1) for (let j = 0; j < 6; j++) {   // a clump that spreads a little in flight
          const kk = clamp01(k - j * 0.035), sp = (j - 2.5) * 1.1 * kk;
          const x = lerp(a[0], b[0], kk) + sp, y = lerp(a[1], b[1], kk) - Math.sin(kk * Math.PI) * 16 + Math.abs(sp) * 0.4;
          c.fillStyle = j % 2 ? pal.sand : pal.sandInk; c.beginPath(); c.arc(x, y, j === 0 ? 2.8 : 1.4, 0, Math.PI * 2); c.fill();
        } else {                                     // a little puff where it lands
          const q = (k - 1) / 0.25; c.globalAlpha = 1 - q; c.fillStyle = pal.sandInk;
          for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(b[0] + (j - 1.5) * 3 * (0.5 + q), b[1] - 1 - Math.sin(j * 1.3) * 3 * q, 0.9, 0, Math.PI * 2); c.fill(); }
          c.globalAlpha = 1;
        }
      }
    }
    // Caspar spits sand, shakes it off; the burst out of the sand at the end
    for (const spit of [seg(t, 95.6, 96.1), seg(t, 96.6, 97.1)]) {
      if (spit > 0 && spit < 1) { const h = headOf(A, 'sidepart'); if (h) { c.fillStyle = pal.sandInk; for (let j = 0; j < 5; j++) { c.globalAlpha = 1 - spit; c.beginPath(); c.arc(h[0] - 6 - spit * (10 + j * 3), h[1] + 4 - spit * 4 + j * 1.2 + spit * spit * 8, 0.9, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; } }
    }
    const shake = seg(t, 99.5, 100.5), C = A.who('sidepart');
    if (shake > 0 && shake < 1 && C) { c.globalAlpha = 1 - shake; for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2 + 0.3, rr = 9 + out(shake) * 18; c.fillStyle = j % 2 ? pal.sand : pal.sandInk; c.beginPath(); c.arc(C.x + Math.cos(a) * rr * 1.1, C.y - 24 + Math.sin(a) * rr * 0.9 + shake * shake * 12, 1.4, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; }
    const bu = seg(t, BURST - 0.05, BURST + 1.0);
    if (bu > 0 && bu < 1) {   // a cloud of sand: soft round puffs, grains flying out
      c.fillStyle = pal.sand; c.globalAlpha = (1 - bu) * 0.95;
      for (let j = 0; j < 7; j++) { const a = -Math.PI + j / 6 * Math.PI, rr = 6 + out(bu) * 16; c.beginPath(); c.arc(HX + Math.cos(a) * rr * 1.3, SY - 6 + Math.sin(a) * rr * 0.8, 5 + out(bu) * 5, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = pal.sandInk;
      for (let j = 0; j < 14; j++) { const a = -Math.PI * (0.1 + 0.8 * j / 13), rr = 8 + out(bu) * 34; c.beginPath(); c.arc(HX + Math.cos(a) * rr, SY - 8 + Math.sin(a) * rr + bu * bu * 26, 1, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    }
  }

  // ---------- poses: the digging rhythm (bend and scoop, straighten and toss) ----------
  function digPoses(d, dir, face) {
    const keys = [];
    for (let i = 0; i < d.n; i++) { const c0 = d.t0 + i * d.P; keys.push([c0, 'pat', dir, face], [c0 + 0.46 * d.P, null, 0, face]); }
    return keys;
  }
  const mix = (...lists) => lists.flat().sort((a, b) => a[0] - b[0]);

  // ---------- 32-56: the burying ----------
  const JD = HX - 23, CD = HX + 23, JF = PILE + 12, OF = PILE + 21;   // where Julian digs, Caspar digs, Julian fills from (behind the pile), Ole fills from
  G.act({
    name: 'bury', span: [32, 56],
    x: {
      striped: [[32.0, H.striped], [34.4, HX - 36], [37.4, HX - 36], [37.9, HX - 34], [38.9, JD], [45.6, JD], [46.9, JF], [49.9, JF], [50.4, JF + 2], [51.1, HX + 34],
        [53.0, HX + 34], [53.9, HX - 4, 'lin'], [54.3, HX - 4], [56.0, H.striped, 'in']],
      sidepart: [[37.6, H.sidepart], [38.7, CD], [44.9, CD], [45.35, HX]],
    },
    pose: {
      striped: mix([[34.4, null, 0, 1], [37.25, 'pat', -1, -1], [37.7, null, 0, 1]], digPoses(DIGS[0], 1, 1), [[44.0, null, 0, 1]], digPoses(DIGS[2], -1, -1),
        [[49.7, 'pat', -1, -1], [49.95, 'pat', 1, 1], [50.35, 'take', -1, 0], [51.0, 'take', -1, -1], [51.45, 'hooray'], [52.3, null, 0, -1], [52.9, null, 0, 0], [53.9, null, 0, -1]]),
      sidepart: mix([[33.0, null, 0, 0], [35.3, null, 0, 1], [37.0, 'hooray'], [37.6, null, 0, 1]], digPoses(DIGS[1], -1, -1), [[44.3, 'pat', -1, 1], [44.7, null, 0, -1],
        [45.9, null, 0, 0], [48.0, null, 0, 1, 'daze'], [51.6, null, 0, -1, null]]),
    },
    lines: [[34.6, 'striped', 'Caspar! Komm, wir buddeln!', 2.7], [37.35, 'sidepart', 'Au ja!', 1.7], [41.1, 'sidepart', 'Noch tiefer?', 2.0], [43.2, 'striped', 'Viel tiefer!', 2.0],
      [45.9, 'sidepart', 'Passt genau!', 2.0], [48.0, 'sidepart', 'Äh … Julian?', 2.0], [51.2, 'striped', 'Gute Nacht, Caspar!', 2.35], [53.65, 'sidepart', 'Mmmh …', 1.7, true]],
    focus: [[33.0, 398], [38.0, 420], [45.0, 424], [47.0, 438], [52.6, 438], [53.9, 425], [55.8, 330]],
    sounds: [[39.4, 'buddel'], [41.3, 'buddel'], [45.4, 'plumps'], [47.5, 'buddel'], [48.8, 'buddel'], [51.6, 'whoosh'], [52.5, 'plopp']],
    figure(k, t, A) {
      if (k.who === 'striped') {
        const o = { look: t < 37.3 ? 60 : t < 53.0 ? HX - k.x : t < 53.95 ? -60 : t < 54.35 ? 90 : -80 };
        if (G.inn(t, 34.4, 39)) o.y = G.at([[34.4, G.Y.striped], [37.9, G.Y.striped], [38.9, SY - 6]], t);
        else if (G.inn(t, 39, 56)) o.y = G.at([[45.6, SY - 6], [46.9, SY - 10], [50.4, SY - 10], [51.1, SY - 5], [53.0, SY - 5], [53.9, SY - 7], [54.3, SY - 7], [55.2, G.Y.striped]], t);
        if (G.inn(t, 53.0, 53.9)) o.hop = Math.abs(Math.sin((t - 53.0) * Math.PI * 2.2)) * 3;   // on tiptoe
        return o;
      }
      if (k.who === 'sidepart' && G.inn(t, 32, 56)) {
        const o = { look: t < 37.6 ? A.who('striped').x - k.x : t < 44.9 ? HX - k.x : t < 51.6 ? A.who('striped').x - k.x : -80 };
        if (G.inn(t, 37.0, 37.5)) o.hop = Math.sin(seg(t, 37.0, 37.5) * Math.PI) * 5;
        if (t < 44.9) o.y = G.at([[37.6, G.Y.sidepart], [38.7, SY - 1]], t);
        return o;
      }
      return null;
    },
        talk(c, t, A) {
      A.pop(c, 'Buddel buddel!', HX - 2, SY - 74, (t - 39.4) / 1.6, -0.08, 12);
      A.pop(c, 'Schipp, schipp!', HX + 30, SY - 98, (t - 47.4) / 1.5, 0.06, 11);
      A.pop(c, 'Plumps!', HX - 22, SY - 38, (t - 45.4) / 0.9, -0.1, 11);
      // tiptoe notes over Julian's head
      if (G.inn(t, 53.0, 54.3)) { const J = A.who('striped'), h = J && A.head(J); if (h) { c.fillStyle = A.pal.ink; c.font = "600 8px 'Fredoka', 'Nunito', system-ui, sans-serif"; for (let i = 0; i < 2; i++) { const k = ((t - 53.0) * 0.9 + i / 2) % 1; c.globalAlpha = Math.sin(k * Math.PI) * 0.8; c.fillText('♪', h[0] - 8 - k * 6 - i * 3, h[1] - 14 - k * 12); } c.globalAlpha = 1; } }
    },
  });

  // ---------- 80-103: the rescue ----------
  // the heads turning: each one looks left, right, then (after the "Hilfe") all to the sandbox; a calm, staggered rhythm
  const LOOKS = {
    kid: [[83.7, 60], [84.0, -140], [84.9, -140], [85.2, 140], [86.0, 140], [86.3, 30]],
    reporter: [[83.6, -60], [84.2, -60], [84.5, 140], [85.4, 140], [85.7, -140], [86.3, -40]],
    filmer: [[83.6, -60], [84.4, -60], [84.7, 140], [85.6, 140], [85.9, -60]],
    professor: [[83.6, -80], [84.1, -80], [84.4, 140], [85.3, 140], [85.6, -120], [86.4, -120]],
    redbeard: [[83.6, 100], [84.3, 100], [84.6, -100], [85.6, -100], [85.9, 120]],
  };
  G.act({
    name: 'rescue', span: [80, 103],
    x: {
      mimo: [[86.9, H.mimo], [89.2, HX - 30], [89.9, HX - 30], [90.15, HX - 38, 'out'], [101.0, HX - 38], [103.0, H.mimo]],
      redbeard: [[91.7, H.redbeard], [92.2, 130, 'in'], [93.4, HX - 10, 'lin'], [93.9, HX + 22, 'out'], [100.1, HX + 22], [102.9, H.redbeard]],
      sidepart: [[98.9, HX], [99.4, HX - 14], [100.9, HX - 14], [102.7, H.sidepart]],
    },
    pose: {
      // the look round: bodies turn left and right in a staggered rhythm, after the "Hilfe …" all towards the sandbox
      reporter: [[80.3, null, 0, 0], [83.6, null, 0, -1], [84.5, null, 0, 1], [85.7, null, 0, -1], [86.8, null, 0, 1], [89.0, 'mic', 0, 1]],
      kid: [[83.9, null, 0, -1], [85.2, null, 0, 1], [86.2, null, 0, 0], [86.85, null, 0, 1], [90.0, null, 0, 0]],
      professor: [[84.4, null, 0, 1], [85.6, null, 0, -1], [86.9, null, 0, 1], [90.0, null, 0, 0]],
      filmer: [[84.7, 'cam', 0, 1], [85.9, 'cam', 0, -1], [86.95, 'cam', 0, 1], [90.0, 'cam', 0, -1]],
      striped: [[84.3, null, 0, -1], [86.9, null, 0, 1], [87.5, null, 0, -1], [90.0, null, 0, 0]],
      redbeard: [[93.9, null, 0, -1], [94.0, 'take', -1, -1], [94.35, 'throw'], [95.0, null, 0, -1],
        ...digPoses(DIGS[3], -1, -1), [97.95, 'pat', -1, -1], [98.3, null, 0, -1], [99.45, 'hooray'], [100.1, null, 0, 0]],
      sidepart: [[94.4, null, 0, 0, 'daze'], [95.6, null, 0, 1, null], [98.6, 'hooray'], [99.2, null, 0, 1], [99.45, 'hooray'], [100.6, null, 0, 0]],
    },
    lines: [[80.5, 'reporter', 'Sagt mal … wo ist eigentlich Caspar?', 3.2], [84.1, 'striped', 'Keine Ahnung …', 2.1], [86.6, 'sidepart', 'Hilfe …', 1.75, true], [89.55, 'sidepart', 'Hilfe …', 1.75, true],
      [91.4, 'mimo', 'Piep! Piep! Piep!', 2.25], [93.7, 'redbeard', 'Caspar?!', 1.8], [95.55, 'sidepart', 'Pfft! Pfft!', 1.95], [99.5, 'sidepart', 'Danke, Ole!', 1.95]],
    focus: [[80.0, 228], [86.6, 228], [89.6, 412], [100.6, 418], [103.2, 250]],
    sounds: [[86.6, 'piep'], [89.95, 'boing'], [91.5, 'piep'], [91.8, 'piep'], [92.1, 'piep'], [94.4, 'whoosh'], [95.6, 'buddel'], [96.8, 'buddel'], [99.6, 'pop']],
    figure(k, t, A) {
      if (!G.inn(t, 83.5, 103)) return null;
      if (k.who === 'sidepart') return G.inn(t, 99.4, 102.7) ? { look: t < 100.9 ? 60 : -60, y: G.at([[100.9, SY - 1], [102.7, G.Y.sidepart]], t) } : null;
      if (k.who === 'redbeard' && t >= 91.7) return { look: HX - k.x, y: G.at([[92.8, G.Y.redbeard], [93.9, SY - 6], [100.1, SY - 6], [101.4, G.Y.redbeard]], t) };
      if (k.who === 'striped') {   // the culprit: looks away, whistles, then glances at the sandbox and quickly away
        if (t < 86.6) return { look: G.at([[84.2, -40], [84.5, -120]], t) };
        if (t < 91.5) return { look: G.at([[86.7, -120], [86.9, 160], [87.4, 160], [87.6, -140]], t) };
        return { look: 200 };
      }
      if (t < 86.5) return LOOKS[k.who] ? { look: G.at(LOOKS[k.who], t) } : null;
      if (t < 89.5) return { look: G.at([[86.5, 0], [86.75 + (k.seed % 5) * 0.06, HX - k.x]], t) };   // the "Hilfe …": all heads to the right
      return { look: HX - k.x };
    },
    mimo(t, A) {
      if (G.inn(t, 86.5, 86.9)) return { face: 1 };   // he heard it
      if (G.inn(t, 89.2, 89.9)) return { face: 1 };
      if (G.inn(t, 89.9, 90.5)) return { hop: Math.sin(seg(t, 89.9, 90.5) * Math.PI) * 16, mood: 'scared', face: 1 };   // the towel moves!
      if (G.inn(t, 90.5, 91.4)) return { mood: 'scared', face: -1 };
      if (G.inn(t, 91.4, 93.5)) return { hop: Math.abs(Math.sin((t - 91.4) * Math.PI / 0.3)) * 9, mood: 'scared', face: -1 };   // the alarm
      if (G.inn(t, 93.5, 99.5)) return { face: 1 };
      if (G.inn(t, 99.5, 101)) return { hop: Math.abs(Math.sin((t - 99.5) * Math.PI / 0.45)) * 8, mood: 'happy', face: 1 };
      return null;
    },
    dog(t) { return G.inn(t, 91.4, 94) ? { pose: 'stand', lookAt: 200 } : null; },
    talk(c, t, A) {
      // the first "Hilfe …" comes from off the picture: a faint little bubble at its right edge
      // (the same line as a quiet bubble over the towel whenever the sandbox is in the picture, as on a wide screen)
      const k = (t - 86.6) / 1.75, C = A.who('sidepart');
      if (k > 0 && k < 1 && C && C.p && A.head(C)[0] > A.view[1] + 6) {
        const pal = A.pal, x = A.view[1] - 24, y = SY - 98, a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
        c.save(); c.globalAlpha = a * 0.85; c.font = "italic 600 7px 'Nunito', system-ui, sans-serif";
        const w = c.measureText('Hilfe …').width + 8;
        c.fillStyle = pal.bubble; c.strokeStyle = pal.ink; c.lineWidth = 0.5; c.setLineDash([1.5, 1.2]);
        c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - 5, w, 10, 5) : c.rect(x - w / 2, y - 5, w, 10); c.fill(); c.stroke();
        c.setLineDash([]); c.beginPath(); c.moveTo(x + w / 2 - 1, y - 2); c.lineTo(x + w / 2 + 6, y + 1); c.lineTo(x + w / 2 - 1, y + 2); c.fill();
        c.fillStyle = pal.z; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Hilfe …', x, y + 0.5);
        c.restore();
      }
      // Julian whistles innocently
      if (G.inn(t, 84.3, 87.0)) { const J = A.who('striped'), h = J && A.head(J); if (h) { c.fillStyle = A.pal.ink; c.font = "600 8px 'Fredoka', 'Nunito', system-ui, sans-serif"; for (let i = 0; i < 2; i++) { const q = ((t - 84.3) * 0.8 + i / 2) % 1; c.globalAlpha = Math.sin(q * Math.PI) * 0.8; c.fillText('♪', h[0] - 10 - q * 6, h[1] - 10 - q * 12 - i * 2); } c.globalAlpha = 1; } }
      A.pop(c, 'Wusch!', HX + 34, SY - 84, (t - 94.5) / 1.0, 0.1, 12);
      A.pop(c, 'Klatsch!', HX + 6, SY - 62, (t - 99.6) / 0.9, -0.06, 11);
    },
  });

  // ---------- the sandbox all through the loop: hole, pile, spades, the sunk ones, the towel, flying sand ----------
  G.act({
    name: 'sandbox', span: [0, G.LOOP],
    figure(k, t) {
      const s = sunk(k.who, t);
      return s ? { y: SY - 1 + Math.max(0, s.d) } : null;
    },
    person(c, k, t, A) {
      const s = sunk(k.who, t);
      if (!s && k.who === 'sidepart' && G.inn(t, 99.45, 100.35)) {   // shakes the sand off like a wet dog
        const a = Math.sin((t - 99.45) * 42) * 0.07 * Math.sin(seg(t, 99.45, 100.35) * Math.PI);
        c.save(); c.translate(k.x, k.y); c.rotate(a); c.translate(-k.x, -k.y); k.p.draw(c, k.x, k.y, { scale: 1 }); c.restore();
        return true;
      }
      if (!s) return false;
      const f = fill(t), cut = SY - f + 0.5;   // only what is above the sand (or the sand filled in around him) shows
      const y = SY - 1 + s.d;
      c.save(); c.beginPath(); c.rect(k.x - 80, cut - 200, 160, 200); c.clip();
      c.translate(k.x, y); c.rotate(s.wob); c.translate(-k.x, -y);
      k.p.draw(c, k.x, y + Math.sin(A.now * 2) * 0.3, { scale: 1, noShadow: true });
      c.restore();
      return true;
    },
    after(c, k, t, A) {
      for (const name of Object.keys(SPADES)) { const s = spadeState(A, name, t); if (s && !s.stuck && s.who === k.who) drawSpade(c, s, SPADES[name].col, A.pal); }
    },
    back(c, t, A) {
      const pal = A.pal, X = HX, Y = SY, h = hole(t), p = pile(t);
      if (h > 0.02) { // a dark oval with a lighter rim, deeper and wider with every spadeful
        c.fillStyle = pal.sandInk; c.beginPath(); c.ellipse(X, Y, 6 + 12 * h, 1.6 + 3.4 * h, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(80,58,30,0.35)'; c.beginPath(); c.ellipse(X, Y + 0.6 * h, 4 + 10 * h, 1 + 2.6 * h, 0, 0, Math.PI * 2); c.fill();
      }
      const px = PILE, pw = 6 + 13 * p, ph = 2 + 13 * p;   // the pile on the right of the hole
      c.fillStyle = pal.sand; c.strokeStyle = pal.sandInk; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(px - pw, Y + 2); c.quadraticCurveTo(px - pw * 0.5, Y + 2 - ph * 1.3, px, Y + 2 - ph); c.quadraticCurveTo(px + pw * 0.5, Y + 2 - ph * 1.3, px + pw, Y + 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = pal.sandInk; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(px - pw * 0.5 + i * pw * 0.33, Y + 1 - ph * 0.45 + (i % 2), 0.8, 0, Math.PI * 2); c.fill(); }
      for (const name of Object.keys(SPADES)) { const s = spadeState(A, name, t); if (s && s.stuck) drawSpade(c, s, SPADES[name].col, pal); }
      // a spade on its way from the sand to a hand (or back): drawn here only while nobody holds it
      for (const name of Object.keys(SPADES)) { const s = spadeState(A, name, t); if (s && !s.stuck && !s.who) drawSpade(c, s, SPADES[name].col, pal); }
      if (towelAt(t).m === 'home') drawTowel(c, t, A);
    },
    front(c, t, A) {
      const pal = A.pal, X = HX, Y = SY, f = fill(t);
      if (f > 0.05) { // the sand filled in around him: a mound up to his neck
        c.fillStyle = pal.sand; c.strokeStyle = pal.sandInk; c.lineWidth = 0.8;
        const w = moundW(f);
        c.beginPath(); c.moveTo(X - w - 5, Y + 3); c.quadraticCurveTo(X - w + 1, Y - f, X - 5, Y - f - 0.5); c.quadraticCurveTo(X, Y - f + 0.8, X + 5, Y - f - 0.5); c.quadraticCurveTo(X + w - 1, Y - f, X + w + 5, Y + 3); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = pal.sandInk; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(X - w + 3 + i * (w * 2 - 6) / 5, Y - f * (0.25 + 0.25 * (i % 2)) + 1, 0.8, 0, Math.PI * 2); c.fill(); }
      }
      if (towelAt(t).m !== 'home') drawTowel(c, t, A);
      drawFlyingSand(c, t, A);
    },
  });

  // ---------- 146-160: Caspar's revenge, and back to the start ----------
  G.act({
    name: 'revenge', span: [146, 160],
    x: {
      sidepart: [[146.0, H.sidepart], [147.3, CD], [153.3, CD], [153.8, TOWEL_HOME[0] - 6], [154.3, TOWEL_HOME[0] - 6], [154.8, HX + 34], [156.9, HX + 34], [158.6, H.sidepart]],
      striped: [[146.0, H.striped], [149.0, HX - 16], [149.95, HX - 16], [150.3, HX], [BURST, HX], [BURST + 0.45, HX - 12], [BURST + 0.55, HX - 12], [160, H.striped]],
      redbeard: [[147.7, H.redbeard], [148.3, 140, 'in'], [150.0, OF - 34, 'lin'], [150.6, OF, 'out'], [156.8, OF], [160, H.redbeard]],
      mimo: [[146.8, H.mimo], [149.4, HX - 34], [149.75, HX - 34], [149.95, HX - 24, 'out'], [150.4, HX - 27], [156.9, HX - 27], [159.4, H.mimo]],
    },
    pose: {
      sidepart: mix([[146.0, null, 0, 1], [147.2, 'pat', 1, 1], [147.5, null, 0, -1], [148.0, 'take', -1, -1], [149.1, null, 0, -1]], digPoses(DIGS[4], 1, 1),
        [[152.9, 'pat', 1, 1], [153.25, null, 0, 1], [153.8, 'pat', 1, 1], [154.25, 'take', -1, -1], [154.95, 'hooray'], [156.9, null, 0, -1]]),
      striped: [[146.0, null, 0, 1], [149.05, 'pat', 1, 1], [149.95, 'flail', 0, 0, 'ouch'], [152.4, null, 0, 0, 'ouch'], [155.6, null, 0, 0, null], [BURST, 'flail', 0, 0], [BURST + 0.6, null, 0, -1]],
      redbeard: mix([[150.5, null, 0, -1], [150.55, 'pat', 1, 1], [150.85, null, 0, -1]], digPoses(DIGS[5], -1, -1), [[153.3, null, 0, 0], [156.0, 'hooray'], [156.8, null, 0, -1]]),
      kid: [[158.3, 'hooray']], reporter: [[158.5, 'hooray']], professor: [[158.6, 'applaud']],
    },
    lines: [[146.3, 'sidepart', 'Julian! Guck mal, ein Schatz!', 2.85], [149.2, 'striped', 'Wo?', 1.55], [150.8, 'striped', 'He! Mimo!', 1.85],
      [153.0, 'sidepart', 'Jetzt bist du dran, Julian!', 2.75], [155.75, 'redbeard', 'Die Würstchen sind fertig!', 2.7], [158.45, 'striped', 'He!', 1.55]],
    focus: [[145.4, 422], [152.8, 422], [153.6, 434], [155.2, 428], [156.6, 425]],
    sounds: [[149.9, 'boing'], [150.3, 'plumps'], [151.2, 'buddel'], [152.4, 'buddel'], [155.3, 'whoosh'], [156.0, 'tada'], [BURST, 'pop']],
    figure(k, t, A) {
      if (!G.inn(t, 146, 160)) return null;
      if (k.who === 'sidepart') return { look: t < 149.9 ? A.who('striped').x - k.x : t < 156 ? HX - k.x : -100, y: G.at([[146.0, G.Y.sidepart], [147.3, SY - 1], [153.3, SY - 1], [153.8, SY - 4], [154.3, SY - 4], [154.8, SY - 2], [156.9, SY - 2], [158.6, G.Y.sidepart]], t) };
      if (k.who === 'striped') {
        if (sunk('striped', t)) return { look: t < BURST ? 120 : -100 };
        return { look: t < 149 ? 100 : t > BURST ? -100 : 20, y: t < BURST ? G.at([[147.6, G.Y.striped], [149.0, SY - 6]], t) : G.at([[BURST + 0.5, SY - 1], [159.0, G.Y.striped]], t) };
      }
      if (k.who === 'redbeard') return { look: t < 156.8 ? HX - k.x : -100, y: G.at([[149.4, G.Y.redbeard], [150.6, SY - 12], [156.8, SY - 12], [157.6, G.Y.redbeard]], t) };
      if (G.inn(t, 155.75, 158)) return { look: GD.GRILL.x - k.x };
      return null;
    },
    mimo(t) {
      if (G.inn(t, 149.4, 149.75)) return { face: 1 };
      if (G.inn(t, 149.75, 150.0)) return { hop: Math.sin(seg(t, 149.75, 150.0) * Math.PI) * 6, face: 1, mood: 'happy' };   // the bump
      if (G.inn(t, 150.0, 155.6)) return { face: 1 };
      if (G.inn(t, 155.6, 156.9)) return { hop: Math.abs(Math.sin((t - 155.6) * Math.PI / 0.42)) * 10, mood: 'happy', face: 1 };
      return null;
    },
    talk(c, t, A) {
      A.pop(c, 'Schubs!', HX - 38, SY - 62, (t - 149.85) / 0.9, -0.1, 11);
      A.pop(c, 'Schipp schipp!', HX + 36, SY - 98, (t - 151.6) / 1.5, 0.06, 11);
      A.pop(c, 'Puff!', HX, SY - 40, (t - BURST) / 0.9, -0.06, 13);
    },
  });
  // shipped with world 4 (the build ships a world's files together; the garden needs the coast's family figures)
  if (window.MimoWorlds) window.MimoWorlds.register({ world: 4, setup() {} });
})();
