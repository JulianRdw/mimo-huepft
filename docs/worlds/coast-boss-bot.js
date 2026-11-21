// World 4 boss "Käpt’n Krake": what tools/bosscheck.mjs needs. A bot that plays the fight the way it is meant to be
// played (dodge the shadow, climb the suckers, jump on the hat, get out of the water quickly), the moments to take
// pictures of, and a spot in the water for the idle run. Never used by the game itself.
(function () {
  'use strict';
  const M = () => window.MimoKrake, C = () => window.MimoCoast;

  // how the bot plays: where it waits for a strike, how far it keeps from a shadow, when it still starts a climb
  const W = 3 * 32;                     // the open water left of the raft (K.WEST)
  const HOME = [W + 250, W + 210, W + 210], DODGE = 34, CLIMB_LEFT = 1.6, REACH_UP = 86, NEAR_STEP = 44, HAT_AIM = 34;
  const SWEEP_JUMP = 74, BELOW_KEEP = 56, LEAP_NEAR = 30, EDGE_IN = 26;

  let mem = { B: null, aim: null };
  const memFor = (B) => { if (mem.B !== B) mem = { B, aim: null }; return mem; };

  function shadowSpan(B, a) {
    const Mk = M(), deck = Mk.deckY(B), ps = Mk.slamStuck(a.tx, deck, Mk.root(Mk.head({ lean: 1, rise: 1, bob: B.bob, sink: 0 })), 0);
    return Mk.lowSpan(ps, deck, 34, Mk.peakK(ps));
  }
  // a spot on the raft (with a margin), the nearest of the candidates
  function onWood(B, xs) { return xs.filter((x) => M().raftAt(B, x, 14)).sort((a, b) => Math.abs(a - mem.px) - Math.abs(b - mem.px))[0]; }

  function bot(B, h) {
    const m = memFor(B), p = h.G.p, px = p.x + p.w / 2, feet = p.y + p.h, Mk = M(), ph = phaseOf(B);
    m.px = px;
    if (B.done) { toDoor(B, h, p, px); return; }
    if (B.state === 'enter' || B.state === 'scene') { h.go(0); return; }
    if (B.state === 'hurt') m.aim = null;
    // in the air on the way to a step or the hat: steer there
    if (!p.grounded && !p.swim && m.aim != null) { h.moveTo(m.aim, 2); return; }
    if (p.grounded) m.aim = null;
    const below = B.arms.filter((a) => a.kind === 'below' && Math.abs(a.bx - px) < BELOW_KEEP);
    if (p.swim) { swim(B, h, p, px, below); return; }
    if (below.length) { h.go(px < below[0].bx ? -1 : 1); return; }
    // the sweeping arm: jump over its tip
    const sw = B.arms.find((a) => a.kind === 'sweep');
    if (sw && sw.st === 'go' && sw.sx < px && px - sw.sx < SWEEP_JUMP) { h.jump(44); h.go(0); return; }
    if (sw && sw.st === 'wind' && px < W + 140) { h.go(1); return; }
    // a shadow on the deck: let it come to the waiting spot, and once it stays put step out of it (to the head's side if
    // there is wood there, so the steps are near)
    const slam = B.arms.find((a) => a.kind === 'slam');
    if (slam && (slam.st === 'rise' || slam.st === 'aim' || slam.st === 'down')) {
      if (B.state === 'aim' && B.t < Mk.TEMPO[ph].track) { h.moveTo(HOME[ph], 6); return; }
      const span = shadowSpan(B, slam);
      if (span && px > span.x0 - DODGE + 6 && px < span.x1 + DODGE - 6) { const to = onWood(B, [span.x1 + DODGE + 4, span.x0 - DODGE - 4]); if (to != null) { h.moveTo(to, 3); return; } }
      h.go(0); return;
    }
    // a stuck arm: up the suckers and onto the hat
    if (B.state === 'stuck' && Mk.TEMPO[ph].stuck - B.t > CLIMB_LEFT * (p.carried && p.carried.krake === 'step' ? 0.4 : 1)) { climb(B, h, p, px, feet); return; }
    h.moveTo(HOME[ph], 6);
  }
  const phaseOf = (B) => { const P = B.def.phases; let i = 0; while (i + 1 < P.length && B.hp <= P[i + 1]) i++; return i; };

  function climb(B, h, p, px, feet) {
    const K = M().K, steps = B.steps.map((s) => ({ x: s.x + K.STEP_W / 2, y: s.y })), onStep = p.carried && p.carried.krake === 'step';
    // the next step up: the lowest one that is higher than the feet and within a jump, nearest first
    const up = steps.filter((s) => s.y < feet - 8 && s.y > feet - REACH_UP).sort((a, b) => b.y - a.y || Math.abs(a.x - px) - Math.abs(b.x - px))[0];
    if (onStep && !steps.some((s) => s.y < feet - 8)) { const hb = M().hatBox(B), to = hb.l + HAT_AIM; mem.aim = to; h.jump(44); h.moveTo(to, 2); return; }
    if (!up) { const low = steps.slice().sort((a, b) => b.y - a.y)[0]; if (low) h.moveTo(low.x - 30, 6); else h.go(0); return; }
    if (!onStep && Math.abs(up.x - px) > NEAR_STEP) { h.moveTo(up.x - Math.sign(up.x - px) * 10, 4); return; }
    mem.aim = up.x; h.jump(44); h.moveTo(up.x, 2);
  }
  // after the win: to the door, out of the water first if need be
  function toDoor(B, h, p, px) {
    const d = h.G.L.door; if (!d) { h.go(0); return; }
    const x = d.x * h.T + h.T / 2;
    // a player watches the hat come down first
    if (!p.swim) { h.moveTo(B.hatOn ? x : x + (p.x + p.w / 2 < x ? -40 : 40), 3); return; }
    const piece = B.rafts.slice().sort((a, b) => Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x))[0], edge = px < piece.x ? piece.x + EDGE_IN : piece.x + piece.w - EDGE_IN;
    h.moveTo(edge, 4);
    if (Math.abs(edge - px) < LEAP_NEAR && p.atSurface) h.press(10); else if (p.y + 4 > C().surface()) h.press(24);
  }
  // in the water: keep away from bubbles, swim under the nearest raft edge, float up and leap onto the deck
  function swim(B, h, p, px, below) {
    const s = C().surface();
    if (below.length) { h.go(px < below[0].bx ? -1 : 1); if (p.y > s) h.press(20); return; }
    const deckWet = M().deckY(B) > s - 6;
    const spots = B.rafts.flatMap((r) => [r.x + EDGE_IN, r.x + r.w - EDGE_IN]);
    const to = deckWet ? HOME[phaseOf(B)] : spots.sort((a, b) => Math.abs(a - px) - Math.abs(b - px))[0];
    h.moveTo(to, 4);
    if (deckWet) return;
    if (Math.abs(to - px) < LEAP_NEAR && p.atSurface) { h.press(10); return; }
    if (p.y + 4 > s) h.press(24);
  }

  // pictures for tools/bosscheck.mjs --shots (conditions on B, G, ph); "scene-" ones are taken during the phase scenes
  const checkShots = {
    'p1-aim': 'ph===0&&B.state==="aim"&&B.t>1.3',
    'p1-slam': 'ph===0&&B.state==="stuck"&&B.t>0.03&&B.t<0.12',
    'p1-climb': 'ph===0&&B.state==="stuck"&&G.p.carried&&G.p.carried.krake==="step"&&G.p.y<260',
    'p1-hit': 'ph===0&&B.state==="hurt"&&B.t>0.06',
    'scene-break': 'B.scene&&B.scene.ph===1&&B.scene.t>1.55',
    'p2-sweep-warn': 'ph===1&&B.arms.some(a=>a.kind==="sweep"&&a.st==="wind"&&a.t>0.55)',
    'p2-sweep-jump': 'ph===1&&B.arms.some(a=>a.kind==="sweep"&&a.st==="go"&&Math.abs(a.sx-G.p.x)<40)&&!G.p.grounded',
    'p2-ink': 'ph===1&&B.inks.length>=2&&B.state!=="ink"',
    'p2-climb': 'ph===1&&B.state==="stuck"&&G.p.carried&&G.p.carried.krake==="step"&&G.p.y<230',
    'scene-storm': 'B.scene&&B.scene.ph===2&&B.scene.t>2.1',
    'p3-aim': 'ph===2&&B.state==="aim"&&B.t>0.9',
    'p3-flood': 'ph===2&&B.state==="stuck"&&window.MimoCoast.tide()&&window.MimoCoast.tide().state==="rising"&&window.MimoCoast.surface()<330',
    'p3-below-warn': 'ph===2&&B.arms.some(a=>a.kind==="below"&&a.st==="warn"&&a.t>a.warn*0.6)',
    'p3-below-up': 'ph===2&&B.arms.some(a=>a.kind==="below"&&a.st==="hold")',
    'win-slowmo': 'B.done&&B.t>0.12&&B.t<0.2',
    'win-hatfly': 'B.done&&B.t>1.0&&B.t<1.08',
    'win-sink': 'B.done&&B.t>1.9&&B.t<1.98',
    'win-hat': 'B.done&&B.hatOn&&B.t>2.85',
  };
  // the idle run in the water: Mimo floats beside the raft and does nothing
  const idleSpots = [{ name: 'im Wasser', x: W + 626, y: 340, shots: { 'water-warn': 'B.arms.some(a=>a.kind==="below"&&a.st==="warn"&&a.t>0.6)', 'water-arm': 'B.arms.some(a=>a.kind==="below"&&a.st==="hold")' } },
    // the open water left of the raft is no hiding place either
    { name: 'links im Wasser', x: 70, y: 340, shots: { 'water-left-arm': 'B.arms.some(a=>a.kind==="below"&&a.st==="hold")' } }];

  Object.assign(window.MimoKrake = window.MimoKrake || {}, { bot, checkShots, idleSpots });
})();
