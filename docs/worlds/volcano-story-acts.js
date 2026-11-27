// World 5 figure acts and poses for the climb ("Gipfelsturm"), on top of the shared figure engine (coast-rig*.js, coast-cast*.js).
// New poses (cast `pose:`, and what the acts below hold): eyes (a hand shades the eyes, looking up), fanface (fanning the face,
// sweating), duck (crouched, arms over the head), grill (an arm held out with the sausage stick), read (both hands hold the map).
// New acts (cast `act:`): each is a figure standing in one of those poses with its extras:
//   sweat   fanning the face, drops run down            duck    ducking, hunched shoulders (e.g. under the glow rain)
//   cheer   both arms up, bouncing                       eyes    hand to the eyes looking up (e.lookDx, default a little up)
//   grill   sausage on a stick over the lava: sausage: 'fresh' (default) | 'coal' (charcoal, smoking) | 'good' (golden)
//   read    reads the walking map, held UPSIDE DOWN (upside: false turns it right)
//   wet     drops run off the head (a geyser got her)
//   thumbs  the thumb up (the clear one)                 bench   sleeps on a bench (lying, the pack under the head, Z's); bench: false = no bench
// Fields every human cast entry may carry (also find.owners via find.ownerPack / ownerScarf):
//   pack: 0..4   a backpack on the back that grows by stage (0 small .. 4 towering with things sticking out); packBurst: 0..1 shakes
//   scarf: true  a scarf that stays on (the side parting's red and white one), a tail swinging at the back
//   prop swaps   holds: { sausage: 'sausageCoal' } etc. work as at the coast (the figure's hand shows another picture)
// Hand things are pictures of the figure itself (rig props): map (filmer), sausage / sausageCoal / sausageGood and thermos (redbeard);
// ground things are props (volcano-story-draw.js). Every motion depends only on api.time, so the level bots replay exactly.
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2;
  const C = () => window.MimoCoast, S = () => C().sdraw, ENV = () => C().storyEnv, V = () => window.MimoVolcano;
  const { track } = window.MimoCoast.RigMath;
  const A = window.MimoCoast.FamilyActions;
  const env = (w, a, b, c, e) => track(w, [[a, 0], [b, 1, 'out'], [c, 1], [e, 0]]);
  const fwd = (k, d, a) => (k === 'l' ? 1 : -1) * d * a;
  const nearArm = (d) => (d > 0 ? 'r' : 'l');

  // ---------- poses ----------
  A.eyes = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), b = s.arm[k], r = track(w, [[0, 0], [0.45, 1, 'out']]), sw = Math.sin(w * TAU * 0.35) * 2.5;
    const out = {}; out[k] = { upper: b.upper + (fwd(k, d, 132) - b.upper) * r, fore: b.fore + (fwd(k, d, 196 + sw) - b.fore) * r };
    return { arms: out, headTilt: -9 * r * d, torsoRot: s.torsoRot - 2 * r * d, brow: 1, done: w > 99 };
  };
  A.fanface = (w, s) => {
    const r = track(w, [[0, 0], [0.3, 1, 'out']]), f = Math.sin(w * TAU * 3.2), b = s.arm.r;
    return { arms: { r: { upper: b.upper + (74 + 3 * f - b.upper) * r, fore: b.fore + (170 + 18 * f - b.fore) * r } }, headTilt: -5 * r + 2 * f * r, torsoRot: s.torsoRot - 1.5 * r, shrug: 0.7 * r, bounce: 0.3 * r * Math.abs(f), brow: 1, done: w > 99 };
  };
  A.duck = (w, s) => {
    const r = track(w, [[0, 0], [0.22, 1, 'out']]), b = s.arm, tr = Math.sin(w * TAU * 1.6) * 0.8;
    const arm = (k) => ({ upper: b[k].upper + (150 - b[k].upper) * r, fore: b[k].fore + (222 + tr * 4 - b[k].fore) * r });
    return { arms: { l: arm('l'), r: arm('r') }, bounce: -3.2 * r, shrug: r, headTilt: 7 * r, torsoRot: s.torsoRot + 4 * r * Math.sin(w * TAU * 0.6), brow: 1, done: w > 99 };
  };
  A.grill = (w, s) => {
    const d = (s.act && s.act.dir) || 1, k = nearArm(d), o = k === 'r' ? 'l' : 'r', b = s.arm[k], ob = s.arm[o], r = track(w, [[0, 0], [0.4, 1, 'out']]), tw = Math.sin(w * TAU * 0.9) * 3;
    const out = {};
    out[k] = { upper: b.upper + (fwd(k, d, 62 + tw) - b.upper) * r, fore: b.fore + (fwd(k, d, 74 + tw) - b.fore) * r };
    out[o] = { upper: ob.upper + (fwd(o, d, 26) - ob.upper) * r, fore: ob.fore + (fwd(o, d, 44) - ob.fore) * r };
    return { arms: out, headTilt: 3 * r * d, torsoRot: s.torsoRot + 4 * r * d, brow: 0, prop: r > 0.4 ? { name: 'sausage', hand: k } : null, done: w > 99 };
  };
  A.read = (w, s) => {
    const r = track(w, [[0, 0], [0.4, 1, 'out']]), b = s.arm, sw = Math.sin(w * TAU * 0.5);
    const hold = (k) => ({ upper: b[k].upper + (34 - b[k].upper) * r, fore: b[k].fore + (-96 + 3 * sw - b[k].fore) * r });
    return { arms: { l: hold('l'), r: hold('r') }, headTilt: (6 + 3 * sw) * r, torsoRot: s.torsoRot, bounce: -0.4 * r, brow: sw > 0.4 ? 1 : 0, prop: r > 0.5 ? { name: 'map', hand: 'both', offset: [0, -3] } : null, done: w > 99 };
  };
  Object.assign(C().castPoses, {
    eyes: { act: 'eyes', loop: [0.5, 2.8571], sided: true },
    fanface: { act: 'fanface', loop: [0.3, 0.625] },
    duck: { act: 'duck', loop: [0.3, 1.25] },
    grill: { act: 'grill', loop: [0.5, 1.1111], sided: true },
    read: { act: 'read', loop: [0.5, 2] },
  });

  // ---------- hand things (pictures of the rig, same box and orientation rules as coast-rig-props.js) ----------
  const R = C().FAMILY_RIGS;
  const add = (who, name, box, body) => { if (R[who]) R[who].props = Object.assign({}, R[who].props, { [name]: { box, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box.join(' ') + '" width="' + box[2] + '" height="' + box[3] + '">' + body + '</svg>' } }); };
  const stick = '<path d="M0 3.4 L0 -22" stroke="#9A6E45" stroke-width="1" stroke-linecap="round"/>';
  const wurst = (fill, edge, extra) => '<g>' + stick + '<path d="M-2.3 -21 C-3.6 -17 -3.4 -9 -2.2 -5.4 C-1.2 -3.6 1.2 -3.6 2.2 -5.4 C3.4 -9 3.6 -17 2.3 -21 C1.4 -23.2 -1.4 -23.2 -2.3 -21 Z" fill="' + fill + '" stroke="' + edge + '" stroke-width="0.55" stroke-linejoin="round"/>' + extra + '</g>';
  add('redbeard', 'sausage', [-14, -28, 28, 32], wurst('#F2A5A0', '#C57872', '<path d="M-1 -19 C-1.6 -15 -1.5 -10 -1 -7" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="0.7" fill="none" stroke-linecap="round"/>'));
  add('redbeard', 'sausageCoal', [-14, -28, 28, 32], wurst('#35303A', '#1E1A22', '<path d="M-1.2 -19 C-1.6 -15 -1.5 -10 -1 -7" stroke="#6C6672" stroke-width="0.7" fill="none" stroke-linecap="round"/><circle cx="1.2" cy="-12" r="0.7" fill="#FF9A55"/><circle cx="-0.8" cy="-17" r="0.6" fill="#FF9A55"/>'));
  add('redbeard', 'sausageGood', [-14, -28, 28, 32], wurst('#D98C4A', '#9A5E2E', '<path d="M-2.6 -17 L2.6 -17 M-2.9 -13 L2.9 -13 M-2.8 -9 L2.8 -9" stroke="#7A4421" stroke-width="0.8" stroke-linecap="round"/><path d="M-1.2 -20 C-1.8 -16 -1.6 -11 -1.2 -7" stroke="#FFE3B0" stroke-opacity="0.6" stroke-width="0.7" fill="none" stroke-linecap="round"/>'));
  add('redbeard', 'thermos', [-12, -18, 24, 26], '<g><path d="M-4.6 6 L-4.6 -9 C-4.6 -11 -3.2 -12 -1.5 -12 L1.5 -12 C3.2 -12 4.6 -11 4.6 -9 L4.6 6 C4.6 7.4 -4.6 7.4 -4.6 6 Z" fill="#F28C82" stroke="#B5584F" stroke-width="0.55"/><rect x="-4.6" y="-3.5" width="9.2" height="3" fill="#FFF3DC"/><rect x="-3.6" y="-15.4" width="7.2" height="4.2" rx="1.6" fill="#FFF3DC" stroke="#C9B58F" stroke-width="0.5"/><path d="M-1.6 -17 Q0 -19 -1.6 -21 M1.6 -17 Q3.2 -19 1.6 -21" stroke="#FFFFFF" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-opacity="0.8"/></g>');
  // the walking map, unfolded: held upside down the compass arrow points down and the little house and fir tree stand on their heads
  add('filmer', 'map', [-13, -10, 26, 20], '<g transform="rotate(180)"><path d="M-12 -8 L-4 -9.4 L4 -8 L12 -9.4 L12 8.4 L4 9.8 L-4 8.4 L-12 9.8 Z" fill="#FFF3DC" stroke="#B59C74" stroke-width="0.6" stroke-linejoin="round"/><path d="M-4 -9.4 L-4 8.4 M4 -8 L4 9.8" stroke="#D9C7A0" stroke-width="0.5"/><path d="M-10 4 Q-5 -2 -1 2 Q3 6 9 -1" stroke="#E26A5C" stroke-width="0.9" stroke-dasharray="1.6 1.4" fill="none"/><path d="M5 -6 L8 -2 L2 -2 Z" fill="#7CC49A"/><rect x="-9" y="-6" width="3.4" height="2.6" fill="#F2A98B"/><path d="M-9.4 -6 L-7.3 -8 L-5.2 -6 Z" fill="#B5584F"/><circle cx="8.6" cy="5.6" r="2.2" fill="#FFFFFF" stroke="#8E8CA3" stroke-width="0.4"/><path d="M8.6 7.4 L8.6 3.8 L9.6 5.4 Z" fill="#E24A5A"/></g>');

  // ---------- extras on the figure: the pack on the back, the scarf round the neck (called from the rig's draw, rig space) ----------
  function torsoFrame(fig, ctx, fn) { const m = fig.frame.torso; ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); fn(); ctx.restore(); }
  function drawPack(e, ctx, fig) {
    const stage = Math.max(0, Math.min(4, e.pack | 0)), st = V().draw.STAGE[stage], p = fig.pose, r = fig.rig, b = Math.min(1, Math.abs(p.bodyTurn || 0));
    const cx = r.neck[0] - (p.d || 1) * (2.2 + 5.4 * b), cy = Math.min(r.neck[1] + 7, r.hip[1] + 3 - st.h / 2);
    torsoFrame(fig, ctx, () => { ctx.translate(cx, cy); V().draw.backpack(ctx, stage, { t: ENV().api.time + (e.phase || 0), burst: e.packBurst || 0 }); });
  }
  function drawScarf(e, ctx, fig) {
    const r = fig.rig, p = fig.pose, cols = (r.colors && r.colors.scarf) || ['#F28C82', '#FFFFFF'], d = p.d || 1, b = Math.min(1, Math.abs(p.bodyTurn || 0)), t = ENV().api.time + (e.phase || 0);
    torsoFrame(fig, ctx, () => {
      const x = r.neck[0], y = r.neck[1] + 1.8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // the tail first (behind the neck band), flapping a little
      const sw = Math.sin(t * 2.4) * 1.2, tx = x - d * (3 + 3 * b), ty = y + 1;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - d * (5 + sw), ty + 4, tx - d * (4 + sw * 1.4), ty + 11); ctx.lineTo(tx - d * (0.2 + sw * 1.2), ty + 11.4); ctx.quadraticCurveTo(tx - d * 0.2, ty + 5, tx + d * 1.4, ty + 1.2); ctx.closePath();
      ctx.fillStyle = cols[0]; ctx.fill(); ctx.strokeStyle = 'rgba(58,46,72,0.4)'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(tx - d * (4 + sw * 1.4), ty + 8.6); ctx.lineTo(tx - d * (0.4 + sw * 1.2), ty + 9); ctx.lineTo(tx - d * (0.2 + sw * 1.2), ty + 11.4); ctx.lineTo(tx - d * (4 + sw * 1.4), ty + 11) ; ctx.closePath(); ctx.fill();
      // the band round the neck: two stripes
      ctx.beginPath(); ctx.ellipse(x, y, 7.2, 2.7, 0, 0, TAU); ctx.fillStyle = cols[0]; ctx.fill(); ctx.strokeStyle = 'rgba(58,46,72,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y + 0.2, 7.2, 2.7, 0, 0.15 * TAU, 0.45 * TAU); ctx.strokeStyle = cols[1]; ctx.lineWidth = 1.1; ctx.stroke();
    });
  }
  const extraFor = (e) => ({ behind: e.pack != null ? (ctx, fig) => drawPack(e, ctx, fig) : null, neck: e.scarf ? (ctx, fig) => drawScarf(e, ctx, fig) : null });
  // after the engine has built the cast of a level: figures with a pack or a scarf get their extras
  function attachExtras(L) {
    const st = L && L.story; if (!st) return;
    const list = [...st.cast, ...(st.find ? st.find.owners : [])];
    for (const e of list) {
      if (e.pack == null && !e.scarf) continue;
      e.extra = extraFor(e);
    }
  }

  // ---------- acts ----------
  const drops = (ctx, e, pos, n, spread) => {
    const t = ENV().api.time, h = C().cast.head(e), sd = S(); ctx.save(); ctx.fillStyle = '#BFE6F2'; ctx.strokeStyle = 'rgba(58,46,72,0.25)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < n; i++) { const q = (t * 1.1 + i / n + e.phase) % 1, x = pos.x + h[0] + (i - (n - 1) / 2) * spread, y = pos.foot + h[1] - 8 + q * 20; ctx.globalAlpha = 0.95 * (1 - q * q); ctx.beginPath(); ctx.moveTo(x, y - 3.4); ctx.quadraticCurveTo(x + 2.4, y + 0.6, x, y + 2); ctx.quadraticCurveTo(x - 2.4, y + 0.6, x, y - 3.4); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };
  const SAUSAGE = { fresh: null, coal: 'sausageCoal', good: 'sausageGood' };
  const poseAct = (pose, o) => ({
    update(e, dt, env) { if (!e.pose) e.pose = pose; if (o && o.update) o.update(e, dt, env); },
    draw(ctx, e, pos, env) { env.drawFigure(ctx, e, pos); if (o && o.after) o.after(ctx, e, pos, env); },
  });
  const sweat = poseAct('fanface', { after(ctx, e, pos) { if (e.pp) drops(ctx, e, pos, 3, 7); } });
  const duck = poseAct('duck');
  const cheer = poseAct('hooray');
  const thumbs = poseAct('thumb');
  const eyes = poseAct('eyes', { update(e) { if (e.lookDx == null) e.lookDx = (e.face || 1) * 24; if (e.pp) e.pp.fig.eyeY = -1.4; } });
  const read = poseAct('read');
  // wet through: the figure stands with drops running off the head, shaking now and then
  const wet = poseAct(null, { after(ctx, e, pos) { if (e.pp) drops(ctx, e, pos, 4, 5); } });
  const grill = poseAct('grill', {
    update(e) { const s = SAUSAGE[e.sausage || 'fresh']; e.propSwap = s ? { sausage: s } : null; },
    after(ctx, e, pos, env) {
      if (e.sausage !== 'coal' || !e.pp) return;
      const t = env.api.time, h = C().cast.hand(e, (e.face || 1) > 0 ? 'r' : 'l'); ctx.save(); ctx.fillStyle = '#6C6A80';
      for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; ctx.globalAlpha = 0.55 * (1 - q); ctx.beginPath(); ctx.arc(pos.x + h[0] + (e.face || 1) * 14 + Math.sin(q * 7 + i) * 2.5, pos.foot + h[1] - 14 - q * 26, 2 + q * 3.4, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
  });
  // sleeping on a bench: in a sleeping bag, only the head (on a pillow, eyes shut) shows, Z's now and then;
  // a flinch (scene op ['play', tag, 'flinch']) jerks head and chest up out of the bag, eyes open
  const WAKE_SECS = 0.28;
  const flinching = (e) => { const p = e.pp; return !!p && ((p.fig.act && p.fig.act.name === 'flinch') || (p.pending && p.pending[0] === 'flinch')); };
  const bench = {
    update(e, dt, env) {
      const api = env.api, n = Math.floor((api.time + e.phase) / 2.6);
      if (e.wakeT == null && flinching(e)) e.wakeT = api.time;
      if (n !== e.zN) { if (e.zN != null && e.wakeT == null && env.onScreen(e.x0, e.foot, 80)) api.floater(e.x0 - 30 * (e.face || 1), e.foot - 52, n % 2 ? 'Z' : 'Zz', '#8E8CA3'); e.zN = n; }
      e.top = 40; if (e.pp) e.pp.fig.asleep = e.wakeT == null;
    },
  };
  // the bench is drawn at the feet and the sleeper lies on it
  bench.draw = function (ctx, e, pos, env) {
    const t = env.api.time, f = e.face || 1;
    ctx.save(); ctx.translate(pos.x, pos.foot);
    if (e.bench !== false) S().PROPS.bench(ctx, t, e);
    if (e.pack != null && S().PROPS.backpack) { ctx.save(); ctx.translate(f * 62, 3); S().PROPS.backpack(ctx, t, { stage: e.pack }); ctx.restore(); }   // the rucksack stands beside the bench
    if (e.pp && C().sleeper) {
      ctx.save(); ctx.translate(0, -21);   // the bench top
      C().sleeper.drawBag(ctx, e, env.rigAt, { t, f, wake: e.wakeT == null ? 0 : (t - e.wakeT) / WAKE_SECS });
      ctx.restore();
    }
    ctx.restore();
  };
  C().acts = Object.assign(C().acts || {}, { sweat, duck, cheer, thumbs, eyes, read, grill, bench, wet });
  window.MimoVolcano.attachExtras = attachExtras;
  window.MimoVolcano.extraFor = extraFor;
  window.MimoWorlds.register({ world: 5, setup() {} });
})();
