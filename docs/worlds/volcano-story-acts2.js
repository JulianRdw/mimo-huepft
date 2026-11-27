// World 5 figure poses and acts, second batch (the family of the second round of the climb), on top of volcano-story-acts.js.
// Everything is a pure function of game time (api.time) and of fields of the cast entry, so the level bots replay exactly.
// Timed sequences start at the entry's `t0` (game time): the scene op ['go', tag, { fields }] sets t0 = now (and merges the fields);
// ['act', tag, 'name', { fields }] switches a figure to another act (volcano-skit.js). Without t0 a looping pose runs from level start,
// a sequence waits in its first picture. Aim fields are tile cells like cast x, y: aim: [x, y].
// Every pose below is also a scene pose: ['pose', tag, 'name', dir]. Overlays (pointer, microphone, items) are drawn for the pose
// name or the act name, whichever way the figure got it.
//
// POSES (castPoses; sided = faces dir, e.face for acts):
//   teach      the professor shows with a pointer stick to aim: [x, y] (tablet, stone). talk: true = speech marks at his mouth
//   pickup     bends down, lifts a shiny dragon scale (4.8 s: bend 0.5, lift 1.4, look 2.2 to 4, pocket 4.4); sparkle. Then stands proud
//   sleepwalk  asleep, arms stretched forward, head hanging, Z's (used by act 'sleepwalk')
//   rummage    pulls things out of the pack one after the other and throws them behind him: items: ['umbrella', 'ring', 'plaster']
//              (2.6 s each, the things stay on the ground behind him, the pack gets smaller: shrink: false keeps it)
//   stuck      stuck with the pack: legs paddle, arms flail, the pack shakes; at plop (default 4 s): 'Plopp!', a hop, relief
//   count      the filmer points her finger through a group, her head follows: targets: [x, x, x] (tiles; [x, y] pairs allowed), every: 0.9 s
//   interview  the near arm holds the microphone to aim: [x, y] (a crack, a mouth)
//   weather    one arm shows the weather with a big gesture (stage 0..2 by itself every 2.4 s or set stage), microphone in the other hand
//   live       excited commentary: little hops, the microphone at her mouth
//   roof       the side parting spreads his scarf wide over his head (span: px, default 150) so three or four can duck beside him
//   give       holds out both hands to hand something over (the scarf share), sided
//   wavebig    the kid waves with a big arm to aim: [x, y]
//   proud      hands on the hips, chin up
// ACTS (cast `act:`):
//   sleepwalk  from tile x to x2 in dur seconds (or speed tiles/s, default 0.9), feet on the ground under him, asleep, Z's; t0 starts it
//   kick       (redbeard) kicks a stone and cheers: cheerAt seconds after t0 (default 2.4). Pair it with a rollstone (volcano-story-draw2.js)
//   grill2     stick: 'plain' | 'double' (two sausages, both turn to charcoal) | 'tele' (telescope stick, the sausage drops off: fallY = tile row)
//              | 'shield' (little heat shield, the sausage turns golden); snatch: seconds after t0 where the sausage is snatched away
//              (it vanishes, the hand stays out, then he grabs at the air). Stays in the last picture.
//   tryhop     (kid) a small jump like Mimo's, lands on his bottom and slides back a little; dx: tiles forward (default 0.6)
//   hop        (kid) a clean real hop, lands on both feet, proud afterwards
//   stuck, rummage, count, interview, weather, live, roof, wavebig, teach, pickup  as the poses of the same name (act = pose + t0)
(function () {
  'use strict';
  const T = 32, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const C = () => window.MimoCoast, ENV = () => C().storyEnv, API = () => ENV().api, V = () => window.MimoVolcano;
  const { track } = window.MimoCoast.RigMath;
  const A = window.MimoCoast.FamilyActions;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const fwd = (k, d, a) => (k === 'l' ? 1 : -1) * d * a;
  const nearArm = (d) => (d > 0 ? 'r' : 'l');
  const farArm = (d) => (d > 0 ? 'l' : 'r');
  const D2 = () => V().draw2;

  // ---------- helpers ----------
  const aimPx = (a) => [(a[0] + 0.5) * T, (a[1] + 0.5) * T];
  const posOf = (e) => e.pos || { x: e.x0, foot: e.foot, face: e.face || 1 };
  // the arm angle (degrees from straight down) that points arm k from the shoulder of entry e at the pixel point
  function angleTo(e, k, pt, fallback) {
    if (!pt) return fallback;
    const p = posOf(e), sx = p.x, sy = p.foot - (e.top || 52) * 0.62 * (e.scale || 1), sgn = k === 'l' ? 1 : -1;
    return Math.atan2(sgn * (pt[0] - sx), pt[1] - sy) / DEG;
  }
  const dirVec = (e, k, pt) => { const p = posOf(e), sx = p.x, sy = p.foot - (e.top || 52) * 0.62 * (e.scale || 1), l = Math.hypot(pt[0] - sx, pt[1] - sy) || 1; return [(pt[0] - sx) / l, (pt[1] - sy) / l]; };
  const timeOf = (e) => { const t = API().time; return e && e.t0 != null ? t - e.t0 : t; };

  // a pose: fn(c) -> clip result; c = { e, k (seconds since t0), d, s, b (base arms), near, far }
  function pose(name, fn, opts) {
    A[name] = (w, s) => {
      const e = (s.act && s.act.e) || {}, d = (s.act && s.act.dir) || e.face || 1;
      const out = fn({ e, k: timeOf(e), d, s, b: s.arm, near: nearArm(d), far: farArm(d), t: API().time });
      out.done = false; return out;
    };
    C().castPoses[name] = { act: name, loop: [1e5, 1], sided: !(opts && opts.front) };
  }
  const arms = (c, nearA, nearF, farA, farF) => { const o = {}; o[c.near] = { upper: nearA, fore: nearF }; if (farA != null) o[c.far] = { upper: farA, fore: farF }; return o; };
  const idleArm = (c, kk) => c.b[kk];

  // ---------- professor ----------
  pose('teach', (c) => {
    const e = c.e, a = angleTo(e, c.near, e.aim && aimPx(e.aim), fwd(c.near, c.d, 64)), sway = Math.sin(c.t * 1.6) * 2.5, talk = e.talk ? Math.sin(c.t * 8) : 0;
    return { arms: arms(c, a + sway, a + sway + 6, fwd(c.far, c.d, 22), fwd(c.far, c.d, 64)), headTilt: (-3 + talk * 1.2) * c.d, torsoRot: c.s.torsoRot + 3 * c.d, brow: talk > 0.7 ? 1 : 0, bounce: e.talk ? 0.3 * Math.abs(talk) : 0 };
  });
  // the scale: bend (0.5 - 1.4), up (1.4 - 2.2), look (2.2 - 4.0), pocket (4.0 - 4.9)
  const PK = { bend: 0.5, up: 1.4, look: 2.2, pocket: 4.0, end: 4.9 };
  pose('pickup', (c) => {
    const k = c.k, d = c.d, n = c.near, b = c.b[n];
    const bend = track(k, [[0, 0], [PK.bend, 0], [PK.up, 1, 'inOut'], [PK.up + 0.8, 0, 'inOut'], [99, 0]]);
    const raise = track(k, [[0, 0], [PK.up, 0], [PK.up + 0.8, 1, 'inOut'], [PK.pocket, 1], [PK.end - 0.3, 0, 'inOut']]);
    const ua = lerp(lerp(b.upper, fwd(n, d, 36), bend), fwd(n, d, 66), raise) * (1 - 0) , fa = lerp(lerp(b.fore, fwd(n, d, 16), bend), fwd(n, d, 168), raise);
    const pocket = track(k, [[PK.pocket, 0], [PK.end - 0.4, 1, 'inOut']]);
    return { arms: arms(c, lerp(ua, fwd(n, d, 14), pocket * (1 - 0)), lerp(fa, fwd(n, d, 30), pocket)), torsoRot: c.s.torsoRot + d * (30 * bend + 7 * raise * (k < PK.pocket ? 1 : 0)), headTilt: d * 6 * raise, dip: 5 * bend, brow: raise > 0.5 && k < PK.pocket ? 1 : 0, beam: k > PK.end - 0.3 };
  });
  const PICK_POINT = (e, d) => [posOf(e).x + d * 18 * (e.scale || 1), posOf(e).foot - 4];

  // ---------- the pack carrier ----------
  pose('sleepwalk', (c) => {
    const f = (kk) => fwd(kk, c.d, 86), sway = Math.sin(c.t * 1.2) * 1.2;
    return { arms: { l: { upper: f('l') + sway, fore: f('l') + 4 }, r: { upper: f('r') - sway, fore: f('r') - 4 } }, headTilt: 11 * c.d + sway, torsoRot: c.s.torsoRot + 3 * c.d, shiftX: sway * 0.5, bounce: 0 };
  });
  const ITEM_SECS = 2.6;
  const itemPhase = (k) => ((k % ITEM_SECS) + ITEM_SECS) % ITEM_SECS;
  pose('rummage', (c) => {
    const e = c.e, items = e.items || ['umbrella', 'ring', 'plaster'], k = c.k, d = c.d, r = c.far, n = items.length, idx = Math.floor(k / ITEM_SECS), ph = itemPhase(k);
    if (k < 0) return {};
    if (idx >= n) { const t2 = k - n * ITEM_SECS; return { arms: arms(c, fwd(c.near, d, 40), fwd(c.near, d, 60), fwd(r, d, 34), fwd(r, d, 56)), shrug: 1, brow: 1, beam: t2 > 0.6, headTilt: -4 * d }; }
    const sa = track(ph, [[0, 20], [0.6, -150, 'out'], [0.9, -150], [1.3, 70, 'inOut'], [1.9, 70], [2.35, -150, 'out'], [ITEM_SECS, 20, 'inOut']]), fa = sa + (sa < 0 ? -40 : 50);
    return { arms: arms(c, fwd(c.near, d, 22), fwd(c.near, d, 40), fwd(r, d, sa), fwd(r, d, fa)), torsoRot: c.s.torsoRot + d * track(ph, [[0, 0], [0.6, -8, 'out'], [1.3, 0], [2.15, 10, 'inOut'], [ITEM_SECS, 0]]), headTilt: d * track(ph, [[0, 0], [1.3, 6, 'inOut'], [1.9, 6], [ITEM_SECS, 0]]), brow: ph > 1.3 && ph < 1.9 ? 1 : 0 };
  });
  pose('stuck', (c) => {
    const e = c.e, k = c.k, plop = e.plop || 4, f = Math.sin(c.t * 11), g = Math.sin(c.t * 7.3 + 1);
    if (k >= plop) { const r = ease((k - plop) / 0.6); return { arms: { l: { upper: lerp(150, 40, r), fore: lerp(168, 20, r) }, r: { upper: lerp(150, 40, r), fore: lerp(168, 20, r) } }, shrug: 1 - r * 0.4, beam: true, headTilt: 5, bounce: k < plop + 0.5 ? 3 * Math.sin((k - plop) / 0.5 * Math.PI) : 0 }; }
    const arm = (o) => ({ upper: 136 + 26 * f * o, fore: 160 + 30 * Math.sin(c.t * 11 + 1.2) * o });
    return { arms: { l: arm(1), r: arm(-1) }, torsoRot: 5 * g, shiftX: 1.4 * f, headTilt: 7 * g, brow: 1, shrug: 1, feet: { l: 0, r: 0, ly: 5 + 4 * f, ry: 5 - 4 * f } };
  });

  // ---------- the filmer ----------
  const countTarget = (e, k) => { const list = e.targets || [], every = e.every || 0.9; if (!list.length) return null; const i = Math.min(list.length - 1, Math.max(0, Math.floor(k / every))), t = list[i]; return Array.isArray(t) ? t : [t, Math.round(posOf(e).foot / T) - 1]; };
  pose('count', (c) => {
    const e = c.e, t = countTarget(e, c.k), pt = t && aimPx(t), n = c.near, bob = Math.sin(c.t * 7) * 2;
    if (!pt) return { arms: arms(c, fwd(n, c.d, 60), fwd(n, c.d, 60)) };
    const dd = Math.sign(pt[0] - posOf(e).x) || c.d, nn = nearArm(dd), a = angleTo(e, nn, pt, 70);
    const o = {}; o[nn] = { upper: a + bob * 0.4, fore: a + bob }; return { arms: o, headTilt: dd * -4, torsoRot: c.s.torsoRot + dd * 3, brow: c.k % (e.every || 0.9) < 0.3 ? 1 : 0 };
  });

  // ---------- the reporter ----------
  pose('interview', (c) => {
    const e = c.e, a = angleTo(e, c.near, e.aim && aimPx(e.aim), fwd(c.near, c.d, 80)), bob = Math.sin(c.t * 2.2) * 2;
    return { arms: arms(c, a + bob, a + bob + 4, fwd(c.far, c.d, 20), fwd(c.far, c.d, 56)), headTilt: -3 * c.d, torsoRot: c.s.torsoRot + 4 * c.d, beam: true };
  });
  const WEATHER = [58, 100, 158];
  pose('weather', (c) => {
    const e = c.e, st = e.stage != null ? e.stage : Math.min(2, Math.max(0, Math.floor(c.k / 2.4))), a = WEATHER[st] + Math.sin(c.t * 2.4) * 9, n = c.near;
    return { arms: arms(c, fwd(n, c.d, a), fwd(n, c.d, a + 8), fwd(c.far, c.d, 30), fwd(c.far, c.d, 150)), headTilt: -4 * c.d, torsoRot: c.s.torsoRot + 2 * c.d, brow: st > 0 ? 1 : 0, beam: st === 0, shrug: st === 2 ? 0.5 : 0 };
  });
  pose('live', (c) => {
    const hop = Math.abs(Math.sin(c.t * TAU * 1.2)), sw = Math.sin(c.t * TAU * 1.8);
    return { arms: arms(c, fwd(c.near, c.d, 30), fwd(c.near, c.d, 158), fwd(c.far, c.d, 60 + 22 * sw), fwd(c.far, c.d, 90 + 26 * sw)), bounce: 1.8 * hop, feet: { l: 0, r: 0, ly: 3.5 * hop, ry: 3.5 * hop }, headTilt: 4 * sw, brow: 1, beam: true };
  });

  // ---------- the side parting ----------
  pose('roof', (c) => {
    const r = ease(c.e.t0 == null ? 1 : c.k / 0.5), sw = Math.sin(c.t * 1.3) * 3;
    const arm = (kk, o) => ({ upper: lerp(c.b[kk].upper, 138 + sw * o, r), fore: lerp(c.b[kk].fore, 152 + sw * o, r) });
    return { arms: { l: arm('l', 1), r: arm('r', -1) }, shrug: r, brow: 1, headTilt: -2 };
  });
  pose('give', (c) => {
    const bob = Math.sin(c.t * 2.6) * 3;
    return { arms: { l: { upper: fwd('l', c.d, 58 + bob), fore: fwd('l', c.d, 86 + bob) }, r: { upper: fwd('r', c.d, 58 - bob), fore: fwd('r', c.d, 86 - bob) } }, torsoRot: c.s.torsoRot + 5 * c.d, headTilt: 4 * c.d, beam: true };
  });
  pose('proud', (c) => {
    const arm = (kk) => ({ upper: fwd(kk, c.d, 38) * 0 + (kk === 'l' ? 44 : -44), fore: kk === 'l' ? -22 : 22 });
    return { arms: { l: arm('l'), r: arm('r') }, headTilt: -7 * c.d, torsoRot: c.s.torsoRot - 2 * c.d, beam: true, shrug: 0.4 };
  });
  pose('wavebig', (c) => {
    const e = c.e, a = angleTo(e, c.near, e.aim && aimPx(e.aim), fwd(c.near, c.d, 150)), osc = Math.sin(c.t * TAU * 2.3), n = c.near;
    const o = {}; o[n] = { upper: a + 4 * osc, fore: a + 24 * osc }; return { arms: o, shrug: 0.5, beam: true, headTilt: -4 * c.d, bounce: 0.4 * Math.abs(osc) };
  });

  // ---------- the redbeard: kick, grill inventions ----------
  const KICK_AT = 0.55;
  pose('kickst', (c) => {
    const k = c.k, d = c.d, kl = c.near, e = c.e, cheerAt = e.cheerAt == null ? 2.4 : e.cheerAt;
    if (k >= cheerAt) { const j = Math.sin(c.t * TAU * 1.5), amp = k < cheerAt + 2.2 ? 1 : 0; return amp ? { arms: { l: { upper: 142 + 8 * j, fore: 168 }, r: { upper: 142 - 8 * j, fore: 168 } }, bounce: 1.6 * Math.abs(j), shrug: 1, beam: true, brow: 1 } : { beam: true }; }
    const wind = track(k, [[0, 0], [KICK_AT - 0.05, 1, 'inOut'], [KICK_AT + 0.12, -0.8, 'out'], [KICK_AT + 0.7, 0, 'inOut']]);
    const o = {}; o.feet = {}; o.feet[kl] = d * 7 * -wind; o.feet[kl + 'y'] = 4 + 4 * Math.abs(wind);
    return { arms: { l: { upper: 38 + 20 * wind, fore: 50 }, r: { upper: 38 - 20 * wind, fore: 50 } }, torsoRot: c.s.torsoRot + d * -9 * wind, feet: { l: kl === 'l' ? -d * 7 * wind : 0, r: kl === 'r' ? -d * 7 * wind : 0, ly: kl === 'l' ? 6 * Math.abs(wind) : 0, ry: kl === 'r' ? 6 * Math.abs(wind) : 0 }, brow: k > KICK_AT && k < KICK_AT + 0.8 ? 1 : 0 };
  });
  // sausage stick: grill2. The stick leans forward over the lava; the hand holds it near the lower end.
  const COALS = ['#F2A5A0', '#35303A'], GOLD = '#D98C4A';
  const mixc = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], k)).toString(16).padStart(2, '0')).join(''); };
  pose('grill2', (c) => {
    const e = c.e, k = c.k, d = c.d, n = c.near, o = c.far, sn = e.snatch, after = sn != null ? k - sn : -1;
    let up = 62, fo = 74;
    if (e.stick === 'tele' && k > 2.6) { up = lerp(62, 28, ease((k - 2.6) / 0.6)); fo = lerp(74, 40, ease((k - 2.6) / 0.6)); }
    if (after >= 0.25 && after < 2.2) { const q = Math.sin((after - 0.25) * TAU * 2.6); up = 96 + 8 * q; fo = 110 + 34 * q; }
    if (after >= 2.2) { up = 50; fo = 26; }
    const res = { arms: {}, headTilt: 3 * d, torsoRot: c.s.torsoRot + 4 * d, brow: after >= 0 && after < 2.4 || (e.stick === 'tele' && k > 2.6) ? 1 : 0 };
    res.arms[n] = { upper: fwd(n, d, up), fore: fwd(n, d, fo) };
    res.arms[o] = after >= 2.2 ? { upper: fwd(o, d, 50), fore: fwd(o, d, 26) } : { upper: fwd(o, d, 26), fore: fwd(o, d, 44) };
    if (after >= 2.2 || (e.stick === 'tele' && k > 3.2)) res.shrug = 1;
    return res;
  });

  C().castPoses.kickst.sided = true;

  // ---------- overlays: things drawn in the world next to a figure (the pointer, microphones, the stick, items) ----------
  const handAt = (e, k) => { const pp = e.pp; if (!pp) return null; const h = C().cast.hand(e, k), p = posOf(e); return [p.x + h[0], p.foot + h[1]]; };
  const skin = (e) => (e.pp && e.pp.rig.colors && e.pp.rig.colors.skin && (e.pp.rig.colors.skin.fill || e.pp.rig.colors.skin.base)) || '#F6CDB0';
  function stickLine(ctx, x, y, ang, len, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke(); }
  function mic(ctx, x, y, ang) { // handle from the hand along ang, a grey ball at the end
    const hx = x + Math.cos(ang) * 10, hy = y + Math.sin(ang) * 10;
    stickLine(ctx, x, y, ang, 10, 2.6, '#3A3550'); ctx.fillStyle = '#B9B7C9'; ctx.strokeStyle = '#3A3550'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * 2.4, hy + Math.sin(ang) * 2.4, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6C6A80'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * 2.4 + 1, hy + Math.sin(ang) * 2.4, 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function talkMarks(ctx, e, p) {
    const h = C().cast.head(e), d = e.face || 1, t = API().time, k = (Math.sin(t * 9) + 1) / 2;
    ctx.save(); ctx.strokeStyle = '#6C6A80'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5 + 0.4 * k;
    for (const r of [4, 7]) { ctx.beginPath(); ctx.arc(p.x + h[0] + d * 9, p.foot + h[1] + 4, r, -0.6 + (d < 0 ? Math.PI : 0), 0.6 + (d < 0 ? Math.PI : 0)); ctx.stroke(); }
    ctx.restore();
  }
  function stickAngle(e, d) { return -Math.PI / 2 + d * 0.62; }
  function grillOverlay(ctx, e, p) {
    const k = timeOf(e), d = e.face || 1, h = handAt(e, nearArm(d)); if (!h) return;
    const kind = e.stick || 'plain', sn = e.snatch, snatched = sn != null && k >= sn, ang = stickAngle(e, d), I = D2();
    let len = 26; if (kind === 'tele') len = lerp(26, 80, ease((k - 0.8) / 1.2));
    const tx = h[0] + Math.cos(ang) * len, ty = h[1] + Math.sin(ang) * len, c1 = '#9A6E45';
    ctx.save(); ctx.lineCap = 'round';
    if (kind === 'tele') { const segs = 3; for (let i = 0; i < segs; i++) { const a0 = i / segs, a1 = (i + 1) / segs, w = 2.6 - i * 0.7; stickLine(ctx, h[0] + Math.cos(ang) * len * a0 * 0.9, h[1] + Math.sin(ang) * len * a0 * 0.9, ang, len * (a1 - a0) * 1.05, w, i % 2 ? '#C9C0D8' : '#8E8CA3'); } }
    else stickLine(ctx, h[0], h[1], ang, len, 1.6, c1);
    const at = (u) => [h[0] + Math.cos(ang) * len * u, h[1] + Math.sin(ang) * len * u];
    if (kind === 'shield') { const s = at(0.46); ctx.fillStyle = '#C9C0D8'; ctx.strokeStyle = '#6C6A80'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(s[0], s[1], 2.6, 7, ang + Math.PI / 2 - Math.PI / 2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(s[0] - 0.6, s[1] - 2, 0.9, 3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    const sausage = (x, y, a, color) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = color; ctx.strokeStyle = 'rgba(58,46,72,0.4)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-2.6, -12, 5.2, 12, 2.6) : ctx.rect(-2.6, -12, 5.2, 12); ctx.fill(); ctx.stroke(); ctx.restore(); };
    const charK = clamp01((k - 0.8) / 3), ptime = API().time;
    if (!snatched) {
      const sp = at(0.8), px2 = -Math.sin(ang), py2 = Math.cos(ang);
      if (kind === 'double') { const f = at(0.5); ctx.strokeStyle = c1; ctx.lineWidth = 1.4; for (const q of [-1, 1]) { ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(sp[0] + q * px2 * 4.5, sp[1] + q * py2 * 4.5); ctx.stroke(); sausage(sp[0] + q * px2 * 4.5, sp[1] + q * py2 * 4.5, ang, mixc(COALS[0], COALS[1], clamp01(charK + (q > 0 ? 0.1 : 0)))); } }
      else if (kind === 'tele') {
        if (k < 2.6) sausage(sp[0], sp[1], ang, COALS[0]);
        else { const q = k - 2.6, y0 = sp[1], fy = e.fallY != null ? (e.fallY + 1) * T - 4 : p.foot - 4, tl = Math.sqrt(2 * Math.max(1, fy - y0) / 420), yy = Math.min(fy, y0 + 0.5 * 420 * q * q); sausage(sp[0] + d * 10 * Math.min(q, tl), yy, ang + Math.min(q, tl) * d * 3, COALS[0]);
          if (q > tl) for (let i = 0; i < 3; i++) { const z = clamp01((q - tl) / 0.8 + i * 0.1); ctx.globalAlpha = 0.5 * (1 - z); ctx.fillStyle = '#B9B3C9'; ctx.beginPath(); ctx.arc(sp[0] + d * 10 * tl + (i - 1) * 4, fy - 6 - z * 20, 2 + z * 3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      }
      else if (kind === 'shield') sausage(sp[0], sp[1], ang, mixc(COALS[0], GOLD, clamp01((k - 0.8) / 2.2)));
      else sausage(sp[0], sp[1], ang, mixc(COALS[0], COALS[1], charK));
      if (charK > 0.6 && kind !== 'shield' && kind !== 'tele') { ctx.fillStyle = '#6C6A80'; for (let i = 0; i < 3; i++) { const q = (ptime * 0.7 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - q); ctx.beginPath(); ctx.arc(tx + Math.sin(q * 7 + i) * 2.5, ty - 4 - q * 24, 2 + q * 3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    } else if (k - sn < 0.35) { const q = (k - sn) / 0.35; ctx.strokeStyle = '#FFE08F'; ctx.lineWidth = 1.4; ctx.globalAlpha = 1 - q; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * (4 + q * 5), ty + 6 + Math.sin(a) * (4 + q * 5)); ctx.lineTo(tx + Math.cos(a) * (8 + q * 9), ty + 6 + Math.sin(a) * (8 + q * 9)); ctx.stroke(); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  // things thrown out of the pack: they fly behind him and stay on the ground
  function rummageOverlay(ctx, e, p) {
    const items = e.items || ['umbrella', 'ring', 'plaster'], k = timeOf(e), d = e.face || 1, I = D2(), t = API().time; if (k < 0) return;
    const far = farArm(d), h = handAt(e, far), ground = p.foot - 7;
    items.forEach((what, i) => {
      const k0 = k - i * ITEM_SECS; if (k0 < 0.7) return;
      const throwT = 2.15, rest = [p.x - d * (26 + i * 17), ground];
      if (k0 < throwT && h) { ctx.save(); ctx.translate(h[0] - d * 0, h[1] - 6); ctx.rotate(Math.sin(k0 * 5) * 0.2); ctx.scale(1.3, 1.3); I.drawItem(ctx, what, t); ctx.restore(); return; }
      const q = clamp01((k0 - throwT) / 0.7), x = lerp(p.x - d * 8, rest[0], q), y = lerp(p.foot - 40, rest[1], q * q) - Math.sin(q * Math.PI) * 26;
      ctx.save(); ctx.translate(x, y); ctx.rotate(q * 9 * -d); ctx.scale(1.15, 1.15); I.drawItem(ctx, what, t); ctx.restore();
    });
  }
  function pickupOverlay(ctx, e, p) {
    const k = timeOf(e); if (k < 0 || k > PK.end) return;
    const d = e.face || 1, h = handAt(e, nearArm(d)), g = PICK_POINT(e, d), I = D2(), t = API().time;
    let x = g[0], y = g[1] - 5, sc = 1.1;
    if (h && k >= PK.up - 0.2) { const r = ease((k - (PK.up - 0.2)) / 0.9); x = lerp(g[0], h[0] + d * 2, r); y = lerp(g[1] - 5, h[1] - 5, r); sc = lerp(1.1, 1.7, r); }
    if (k > PK.pocket) { const r = ease((k - PK.pocket) / 0.9); sc *= 1 - r * 0.6; if (k > PK.end - 0.05) return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); I.drawItem(ctx, 'scale', t); ctx.restore();
    if (k < PK.up && k > 0.2) { ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); ctx.beginPath(); ctx.moveTo(g[0] + 6, g[1] - 14); ctx.lineTo(g[0] + 6, g[1] - 9); ctx.moveTo(g[0] + 3.5, g[1] - 11.5); ctx.lineTo(g[0] + 8.5, g[1] - 11.5); ctx.stroke(); ctx.restore(); }
  }
  function pointerOverlay(ctx, e, p) {
    const d = e.face || 1, h = handAt(e, nearArm(d)); if (!h || !e.aim) return;
    const v = dirVec(e, nearArm(d), aimPx(e.aim)), ang = Math.atan2(v[1], v[0]), sw = Math.sin(API().time * 1.6) * 0.03;
    stickLine(ctx, h[0] - Math.cos(ang) * 4, h[1] - Math.sin(ang) * 4, ang + sw, 36, 1.6, '#7A5A3A'); ctx.fillStyle = '#F28C82'; ctx.beginPath(); ctx.arc(h[0] + Math.cos(ang + sw) * 32, h[1] + Math.sin(ang + sw) * 32, 1.7, 0, TAU); ctx.fill();
  }
  function aimMic(ctx, e) { const d = e.face || 1, h = handAt(e, nearArm(d)); if (!h || !e.aim) return; const v = dirVec(e, nearArm(d), aimPx(e.aim)); mic(ctx, h[0], h[1], Math.atan2(v[1], v[0])); }
  function weatherOverlay(ctx, e, p) {
    const d = e.face || 1, o = handAt(e, farArm(d)), t = API().time; if (o) mic(ctx, o[0], o[1], -Math.PI / 2 + d * 0.9);
    const st = e.stage != null ? e.stage : Math.min(2, Math.max(0, Math.floor(timeOf(e) / 2.4))), h = C().cast.head(e), x = p.x + h[0] - d * 2, y = p.foot + h[1] - 22;
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    if (st < 2) { const r = st ? 6.5 : 5; ctx.fillStyle = '#FFD86A'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#FFB84A'; ctx.lineWidth = 1.3; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); ctx.lineTo(Math.cos(a) * (r + (st ? 6 : 4)), Math.sin(a) * (r + (st ? 6 : 4))); ctx.stroke(); } if (st) { ctx.fillStyle = '#5B2A3A'; ctx.fillRect(-3, 0.5, 6, 0.9); } }
    else { ctx.fillStyle = '#FF8A4C'; for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.beginPath(); ctx.arc((i - 1) * 7, -4 + q * 14, 3, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function liveOverlay(ctx, e, p) { const d = e.face || 1, h = handAt(e, nearArm(d)); if (h) mic(ctx, h[0], h[1], -Math.PI / 2 - d * 0.2 + 0.3 * d); talkMarks(ctx, e, p); }
  function countOverlay(ctx, e, p) {
    const k = timeOf(e), t = countTarget(e, k); if (!t) return; const pt = aimPx(t), dd = Math.sign(pt[0] - p.x) || 1, h = handAt(e, nearArm(dd)); if (!h) return;
    const v = dirVec(e, nearArm(dd), pt), ang = Math.atan2(v[1], v[0]); stickLine(ctx, h[0], h[1], ang, 8, 3.4, '#6C5038'); stickLine(ctx, h[0], h[1], ang, 8, 2.4, skin(e));
  }
  function roofOverlay(ctx, e, p) {
    const hl = handAt(e, 'l'), hr = handAt(e, 'r'); if (!hl || !hr) return;
    const span = e.span || 150, cx = (hl[0] + hr[0]) / 2, y = Math.min(hl[1], hr[1]) - 1, t = API().time, n = 30, top = [], bot = [], sc = (e.pp && e.pp.rig.colors && e.pp.rig.colors.scarf) || D2().SCARF;
    for (let i = 0; i <= n; i++) { const u = i / n, x = cx + (u - 0.5) * span, sag = Math.pow(Math.abs(u - 0.5) * 2, 2.2) * 24; top.push([x, y + sag + Math.sin(t * 1.7 + u * 6) * 0.8]); }
    ctx.save(); ctx.globalAlpha = 1;
    // the cloth hangs from the two hands in a gentle tent: a filled stripe band, wide at the middle
    ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); for (let i = n; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] + 9 + Math.sin(i * 0.9 + t * 1.2) * 0.8); ctx.closePath(); ctx.fillStyle = sc[0]; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = sc[1]; for (let i = 1; i < n; i += 4) { ctx.beginPath(); ctx.moveTo(top[i][0], top[i][1] - 2); ctx.lineTo(top[i + 1][0], top[i + 1][1] - 2); ctx.lineTo(top[i + 1][0], top[i + 1][1] + 14); ctx.lineTo(top[i][0], top[i][1] + 14); ctx.closePath(); ctx.fill(); } ctx.restore();
    ctx.strokeStyle = 'rgba(58,46,72,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.beginPath(); for (let i = 0; i <= n; i++) ctx.lineTo(top[i][0], top[i][1] + 9 + Math.sin(i * 0.9 + t * 1.2) * 0.8); ctx.stroke();
    ctx.strokeStyle = sc[0]; ctx.lineWidth = 1; ctx.lineCap = 'round'; for (const s of [-1, 1]) for (let j = -1; j <= 1; j++) { const q = s < 0 ? top[0] : top[n]; ctx.beginPath(); ctx.moveTo(q[0] + j * 1.5, q[1] + 8); ctx.lineTo(q[0] + j * 2 + s * 1, q[1] + 13); ctx.stroke(); }
    ctx.restore();
  }
  const OVERLAY = { teach: (c, e, p) => { pointerOverlay(c, e, p); if (e.talk) talkMarks(c, e, p); }, pickup: pickupOverlay, rummage: rummageOverlay, grill2: grillOverlay, interview: aimMic, weather: weatherOverlay, live: liveOverlay, count: countOverlay, roof: roofOverlay, sleepwalk: () => {} };
  const nameOf = (e) => (e.over && e.over.pose) || e.pose || e.act;
  function drawOverlays(layer, ctx) {
    const st = API().L && API().L.story; if (!st) return;
    for (const e of st.cast) {
      if (!e.pos || e.gone || (layer === 'front') !== !!e.front || !e.pp) continue;
      const f = OVERLAY[nameOf(e)]; if (!f) { if (e.talk && FAM.includes(e.who)) talkMarks(ctx, e, e.pos); continue; }
      if (!ENV().onScreen(e.pos.x, e.pos.foot, 140)) continue;
      ctx.save(); f(ctx, e, e.pos); ctx.restore();
    }
  }
  const FAM = ['striped', 'sidepart', 'redbeard', 'reporter', 'filmer', 'kid', 'professor'];

  // ---------- acts ----------
  const groundAt = (x, y) => { const tx = Math.floor(x / T); for (let ty = Math.floor((y - 12) / T); ty < Math.floor(y / T) + 5; ty++) if (API().isSolid(tx, ty)) return ty * T; return y; };
  const snore = (e, env, dx, secs) => {
    const api = env.api, n = Math.floor((api.time + e.phase) / (secs || 2.6));
    if (n !== e.zN) { if (e.zN != null && env.onScreen(e.pos ? e.pos.x : e.x0, e.foot, 80)) api.floater((e.pos ? e.pos.x : e.x0) + dx * (e.face || 1), (e.pos ? e.pos.foot : e.foot) - (e.top || 52) - 4, n % 2 ? 'Z' : 'Zz', '#8E8CA3'); e.zN = n; }
  };
  const link = (e) => { const a = e.pp && e.pp.fig.act; if (a) a.e = e; };
  const act = (poseName, o) => ({
    pos: o && o.pos,
    update(e, dt, env) { link(e); e.pose = poseName; e.poseOpts = { dir: e.face || 1 }; if (o && o.update) o.update(e, dt, env); },
  });
  const baseAct = (name) => act(name);
  const acts = {};
  for (const n of ['teach', 'pickup', 'rummage', 'stuck', 'count', 'interview', 'weather', 'live', 'roof', 'wavebig', 'give', 'proud']) acts[n] = baseAct(n);
  // the sleepwalk: x to x2 on the ground, slowly, asleep
  acts.count = act('count', { update(e) { const t = countTarget(e, timeOf(e)); if (t && e.pos) e.lookDx = aimPx(t)[0] - e.pos.x; } });
  acts.sleepwalk = act('sleepwalk', {
    pos(e, time, env) {
      const out = env.position(e, time), xe = (e.x2 + 0.5) * T, dist = Math.abs(xe - e.x0), dur = e.dur || dist / (T * (e.speed || 0.9)), u = e.t0 == null ? 0 : clamp01((time - e.t0) / dur);
      out.x = e.x0 + (xe - e.x0) * u; out.foot = groundAt(out.x, e.foot); out.face = Math.sign(xe - e.x0) || e.face || 1; e.face = out.face; return out;
    },
    update(e, dt, env) { if (e.pp) e.pp.fig.asleep = true; snore(e, env, 26, 2.4); },
  });
  acts.rummage = act('rummage', {
    update(e) {
      if (e.shrink === false || e.pack == null) return;
      e._pack0 = e._pack0 == null ? e.pack : e._pack0; const n = (e.items || ['a', 'b', 'c']).length, done = e.t0 == null ? 0 : Math.max(0, Math.min(n, Math.floor((timeOf(e) - 1.9) / ITEM_SECS) + 1));
      e.pack = Math.max(1, e._pack0 - done);
    },
  });
  acts.stuck = act('stuck', {
    pos(e, time, env) {
      const out = env.position(e, time), k = e.t0 == null ? 0 : time - e.t0, plop = e.plop || 4;
      out.hop = k >= plop ? (k < plop + 0.5 ? 12 * Math.sin((k - plop) / 0.5 * Math.PI) : 0) : (e.hang == null ? 6 : e.hang) + 1.2 * Math.sin(time * 11); return out;
    },
    update(e, dt, env) {
      const k = e.t0 == null ? 0 : API().time - e.t0, plop = e.plop || 4; e.packBurst = k < plop ? 0.35 + 0.35 * Math.sin(API().time * 11) : 0;
      if (k >= plop && !e._plop && e.t0 != null) { e._plop = true; C().pop(e.pos.x, e.pos.foot - 70, 'Plopp!', { size: 22, fill: '#F28C82' }); env.api.burst(e.pos.x, e.pos.foot - 20, 12, ['#FFFFFF', '#D2B27A', '#B9B3C9'], 140, { grav: 200, life: 0.5, r: 2 }); }
      if (k < plop) e._plop = false;
    },
  });
  acts.kick = act('kickst', {});
  acts.grill2 = act('grill2', { update(e) { e.poseOpts = { dir: e.face || 1 }; } });
  // the kid: tryhop reuses the copycat picture of the cast layer (jump, sit down, get up), hop is a clean jump with proud arms after
  acts.tryhop = {
    pos(e, time, env) {
      const out = env.position(e, time), k = e.t0 == null ? -1 : time - e.t0, d = e.face || 1, dx = (e.dx == null ? 0.6 : e.dx) * T;
      if (k >= 0) out.x = e.x0 + d * (dx * ease(k / 0.48) - (dx + 10) * ease((k - 0.55) / 0.8));
      return out;
    },
    update(e, dt, env) {
      link(e); const k = e.t0 == null ? -1 : API().time - e.t0;
      e.copyT = e.t0 == null ? null : e.t0; e.copyFx = 2;
      e.pose = k >= 0 && k < 0.48 ? 'hooray' : null; e.poseOpts = null;
      if (e.pp) e.pp.fig.expr = k >= 0.48 && k < 1.5 ? 'wow' : null;
      if (k >= 0.48 && !e._sit) { e._sit = true; C().pop(e.pos.x, e.foot - 40, 'Plumps!', { size: 15, fill: '#F2C79B' }); env.api.burst(e.pos.x, e.foot - 2, 8, ['#E8CF9C', '#D2B27A'], 90, { grav: 300, vy: -60, life: 0.4, r: 1.8 }); }
      if (k < 0) e._sit = false;
    },
  };
  acts.hop = {
    pos(e, time, env) {
      const out = env.position(e, time), k = e.t0 == null ? -1 : time - e.t0, d = e.face || 1;
      if (k >= 0.4 && k < 1.2) { const u = (k - 0.4) / 0.8; out.hop = 30 * 4 * u * (1 - u); out.x = e.x0 + d * (e.dx || 0) * T * u; } else if (k >= 1.2) out.x = e.x0 + d * (e.dx || 0) * T;
      return out;
    },
    update(e, dt, env) {
      link(e); const k = e.t0 == null ? -1 : API().time - e.t0, air = k >= 0.4 && k < 1.2;
      e.pose = k < 0 ? null : k < 0.4 ? null : air ? 'hooray' : k < 1.4 ? null : 'proud'; e.poseOpts = { dir: e.face || 1 };
      if (e.pp) e.pp.fig.expr = null;
      if (k >= 1.2 && !e._land) { e._land = true; env.api.burst(e.pos.x, e.foot - 2, 8, ['#E8CF9C', '#D2B27A'], 90, { grav: 300, vy: -60, life: 0.4, r: 1.8 }); }
      if (k < 0) e._land = false;
    },
  };
  C().acts = Object.assign(C().acts || {}, acts);

  // the scarf of the side parting: hidden while it is the roof
  function neckSwitch() {
    const st = API().L && API().L.story; if (!st) return;
    for (const e of st.cast) { if (!e.extra || !e.extra.neck && !e._neck) continue; if (e._neck == null) e._neck = e.extra.neck; const hide = nameOf(e) === 'roof'; if (hide !== !e.extra.neck) e.extra = { ...e.extra, neck: hide ? null : e._neck }; }
  }
  window.MimoWorlds.register({
    world: 5,
    update() { const st = API().L && API().L.story; if (st) { for (const e of st.cast) link(e); neckSwitch(); } },
    draw(layer, ctx) { if (layer === 'mid' || layer === 'front') drawOverlays(layer, ctx); },
    setup() {},
  });
  V().acts2 = { angleTo, groundAt, talkMarks, mic, OVERLAY };
})();
