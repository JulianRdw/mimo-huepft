// World 4 rig drawing: the layers, limbs, head, props and scarf of a jointed family figure (the drawing half of
// coast-rig.js, ported from the Bad Nenndorf branch). Added for the coast: layer pictures are shared by all figures of one
// person and cached per tint. Sunburn recolours only the skin (SVG colours swapped, limb skin mixed); the night/dark wash is
// a source-atop fill on a canvas copy (iOS 15 has no ctx.filter), and the limb colours are mixed towards the same wash.
// No document and no Image at load time; canvases are made on first draw.
(function () {
  'use strict';
  const { TAU, DEG, M, clamp, lerp, lerpP, armCurve, curveNormal, offsetPoint, tube } = window.MimoCoast.RigMath;
  const FamilyFigure = window.MimoCoast.FamilyFigure, P = FamilyFigure.prototype;
  const SCARF_LINKS = 7, FAR = new WeakMap();
  const FEAT = 1.6, HAIR_TURN = 0.55;
  const DUSK = [30, 40, 96, 0.075];   // night wash colour and strength per step
  // sunburn: only the skin colours turn pink and then red, step by step (clothes, hair, eyes and mouth keep theirs)
  const BURN = { fill: [238, 112, 98], shade: [214, 88, 80], line: [168, 66, 64] }, BURN_STEP = 0.2, BURN_MAX = 4;
  const burnLevel = (red) => Math.max(0, Math.min(BURN_MAX, red | 0));
  const burnSkin = (skin, k) => ({ ...skin, fill: mixHex(skin.fill, BURN.fill, k), shade: mixHex(skin.shade, BURN.shade, k), line: mixHex(skin.line, BURN.line, k) });

  // colour towards a wash: '#rrggbb' or 'rgb(...)' in, same format out
  function mixHex(hex, wash, k) {
    if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16 & 255, n >> 8 & 255, n & 255];
    return '#' + ch.map((v, i) => Math.round(v + (wash[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
  const mixAll = (o, wash, k) => (typeof o === 'string' ? mixHex(o, wash, k) : Array.isArray(o) ? o.map((v) => mixAll(v, wash, k)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([n, v]) => [n, mixAll(v, wash, k)])) : o);
  // the rig colours under the figure's current tint (cached per person and tint)
  P.col = function () {
    const t = this.tint, key = t ? t.red + '|' + t.night : '';
    if (!key || key === '0|0') return this.rig.colors;
    const cache = this.shared.colors;
    if (!cache[key]) {
      let c = this.rig.colors;
      if (t.red) c = { ...c, skin: burnSkin(c.skin, BURN_STEP * burnLevel(t.red)) };
      if (t.night) c = mixAll(c, DUSK, DUSK[3] * t.night);
      cache[key] = c;
    }
    return cache[key];
  };
  // the picture of one layer at a raster scale, in the figure's current tint (made once, shared by all figures of the person)
  P.layerCanvas = function (name, scale) {
    const t = this.tint, tk = t && (t.red || t.night) ? t.red + '|' + t.night : '', ck = scale + '|' + tk;
    let byScale = this.cache.get(ck);
    if (!byScale) { byScale = {}; this.cache.set(ck, byScale); }
    if (byScale[name]) return byScale[name];
    const img = this.images[name];
    if (!img) return null;
    // the sunburnt pictures of the person load on first use; until then the plain one is shown (and not cached)
    const lvl = t && !name.startsWith('prop_') ? burnLevel(t.red) : 0;
    const burnt = lvl ? burnImages(this.shared, this.rig, lvl) : null;
    if (lvl && !burnt) return this.layerCanvasPlain(name, scale, null);
    let c;
    if (t && t.night) {
      const base = this.layerCanvasPlain(name, scale, burnt, lvl);
      c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
      const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(' + DUSK[0] + ',' + DUSK[1] + ',' + DUSK[2] + ',' + (DUSK[3] * t.night) + ')'; g.fillRect(0, 0, c.width, c.height);
    } else c = this.layerCanvasPlain(name, scale, burnt, lvl);
    byScale[name] = c;
    return c;
  };
  P.layerCanvasPlain = function (name, scale, burnt, lvl) {
    const key = scale + '|b' + (burnt ? lvl : 0), cache = this.cache;
    let byScale = cache.get(key);
    if (!byScale) { byScale = {}; cache.set(key, byScale); }
    if (byScale[name]) return byScale[name];
    const box = this.propBox(name);
    const [w, h] = box ? [box[2], box[3]] : this.rig.size;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    c.getContext('2d').drawImage((burnt && burnt[name]) || this.images[name], 0, 0, c.width, c.height);
    byScale[name] = c;
    return c;
  };

  // the layer pictures of a person with only the skin colours burnt to a step (SVG text recoloured, so no pixel reads:
  // iOS 15 safe). Returns the images once loaded, null while loading; FamilyFigure.warmBurn starts it early.
  function burnImages(shared, rig, lvl) {
    const sets = shared.burn || (shared.burn = {});
    const s = sets[lvl];
    if (s && s.images) return s.images;
    if (s || typeof Image === 'undefined') return null;
    const skin = rig.colors.skin, hot = burnSkin(skin, BURN_STEP * lvl), swap = [['fill', skin.fill], ['shade', skin.shade], ['line', skin.line]];
    const entry = sets[lvl] = { images: null };
    const jobs = Object.entries(rig.layers).map(([name, svg]) => new Promise((resolve) => {
      let out = svg;
      for (const [k, hex] of swap) out = out.split(hex).join(hot[k]).split(hex.toLowerCase()).join(hot[k]);
      const img = new Image();
      img.onload = () => resolve([name, img]);
      img.onerror = () => { console.error('Welt: Sonnenbrand-Bild ' + rig.key + '/' + name + ' nicht ladbar'); resolve([name, null]); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out);
    }));
    Promise.all(jobs).then((list) => { entry.images = Object.fromEntries(list.filter(([, img]) => img)); });
    return null;
  }
  FamilyFigure.warmBurn = (shared, rig, levels) => { for (const l of levels) burnImages(shared, rig, burnLevel(l)); };

  P.propBox = function (name) {
    const p = name.startsWith('prop_') && this.rig.props && this.rig.props[name.slice(5)];
    return p ? p.box : null;
  };

  P.drawLayer = function (ctx, name, m, dx, dy, scale, alpha) {
    const c = this.layerCanvas(name, scale);
    if (!c) return;
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    ctx.drawImage(c, dx || 0, dy || 0, this.rig.size[0], this.rig.size[1]);
    ctx.restore();
  };

    // colours for a limb; the far side in the three-quarter view sits in shade
  P.palette = function (far) {
    const c = this.col();
    if (!far) return c;
    return FAR.get(c) || (FAR.set(c, {
      ...c,
      skin: { ...c.skin, fill: c.skin.shade },
      white: { ...c.white, fill: c.white.shade },
      trousers: { ...c.trousers, fill: c.trousers.shade },
    }), FAR.get(c));
  };

    // x, y: canvas point of the figure's ground position (posX is added); zoom: canvas px per figure px
  P.draw = function (ctx, x, y, zoom, opts = {}) {
    const r = this.rig, F = this.frame, p = this.pose;
    const scale = Math.round(zoom * (opts.dpr || 1) * 2) / 2;
    ctx.save();
    ctx.translate(x + this.posX * zoom, y);
    ctx.scale(zoom, zoom);
    ctx.translate(-r.center, -r.ground);

    // contact shadow, smaller while in the air (a scene that lies or tilts the figure draws its own)
    const shrink = clamp(1 - this.air / 40, 0.5, 1);
    if (!opts.noShadow && !opts.onlyArm) {
      ctx.fillStyle = `rgba(58,56,80,${0.12 * shrink})`;
      ctx.beginPath();
      ctx.ellipse(r.center + p.pelvisX * 0.6, r.ground - 0.9, 11.8 * shrink, 1.3 * shrink, 0, 0, TAU);
      ctx.fill();
    }

    // at the moment of turning between the front and the back view the figure is a little narrower
    if (this.yawNow !== undefined) ctx.scale(1 - 0.14 * clamp(1 - Math.abs(Math.abs(this.yawNow) - 90) / 28, 0, 1), 1);

    const far = F.farSide, near = far ? (far === 'left' ? 'right' : 'left') : null;
    // a second pass for one arm only, e.g. a hand that reaches over someone lying in front of this figure
    if (opts.onlyArm) { this.drawArm(ctx, opts.onlyArm, false); if (opts.withProp) this.drawProp(ctx, scale); ctx.restore(); return; }
    if (p.back && this.images.torsoBack) return this.drawBack(ctx, scale, far, near, opts);
    if (far) this.drawArm(ctx, far, true);
    // both hair layers move together (otherwise a second hair edge shows behind the head);
    // long hair at the back trails a little further in the same direction
    const turn = p.headTurn, trail = r.longHair ? 1.5 : 1;
    this.drawLayer(ctx, 'hairBack', F.head, HAIR_TURN * turn + F.hair[0] * trail, F.hair[1], scale);
    if (far) { this.drawLeg(ctx, far, true); this.drawLeg(ctx, near, false); } else { this.drawLeg(ctx, 'right', false); this.drawLeg(ctx, 'left', false); }
    if (this.extra && this.extra.behind) this.extra.behind(ctx, this);   // a pack on the back
    this.drawLayer(ctx, 'torso', F.torso, 0, 0, scale);
    if (this.extra && this.extra.neck) this.extra.neck(ctx, this);   // a scarf round the neck
    this.drawHead(ctx, scale);
    if (far) this.drawArm(ctx, near, false); else { this.drawArm(ctx, 'left', false); this.drawArm(ctx, 'right', false); }
    this.drawProp(ctx, scale);
    if (opts.skeleton) this.drawSkeleton(ctx);
    ctx.restore();
  };

    // seen from behind: back of the shirt and of the head, no face; the far arm and leg stay in shade
  P.drawBack = function (ctx, scale, far, near, opts) {
    const F = this.frame, turn = this.pose.headTurn;
    if (far) this.drawArm(ctx, far, true);
    if (far) { this.drawLeg(ctx, far, true); this.drawLeg(ctx, near, false); } else { this.drawLeg(ctx, 'right', false); this.drawLeg(ctx, 'left', false); }
    this.drawLayer(ctx, 'torsoBack', F.torso, 0, 0, scale);
    this.drawLayer(ctx, 'headBack', F.head, -0.5 * turn + F.hair[0] * 0.5, F.hair[1] * 0.5, scale);
    if (far) this.drawArm(ctx, near, false); else { this.drawArm(ctx, 'left', false); this.drawArm(ctx, 'right', false); }
    if (opts.skeleton) this.drawSkeleton(ctx);
    ctx.restore();
  };

    // joint positions of the rig, mirrored in the back view (the figure's left is then on the viewer's left)
  P.mirror = function (pt) { return this.pose && this.pose.back ? [2 * this.rig.center - pt[0], pt[1]] : pt; };

  P.drawHead = function (ctx, scale) {
    const F = this.frame, p = this.pose, turn = p.headTurn, b = p.beam;
    const eyeShift = turn * FEAT + (p.eyeTurn - turn) * 0.9;
    const ex = this.expr && this.images['eyes_' + this.expr] ? this.expr : null;
    this.drawLayer(ctx, 'ears', F.head, -0.9 * turn, 0, scale);
    this.drawLayer(ctx, 'face', F.head, 0, 0, scale);
    this.drawLayer(ctx, 'rest', F.head, turn * FEAT, 0, scale);
    const eyeY = this.eyeY || 0; // looking up (-) or down (+), set by a scene
    // asleep (the sleeper on the mattress): eyes shut, a small snoring mouth; a scene face still wins
    const zz = !ex && this.asleep;
    if (ex) this.drawLayer(ctx, 'eyes_' + ex, F.head, eyeShift, eyeY, scale);
    else if (zz) this.drawLayer(ctx, 'eyes_blink', F.head, turn * FEAT, 0, scale);
    else if (p.blink && b < 0.5) this.drawLayer(ctx, 'eyes_blink', F.head, eyeShift, 0, scale);
    else {
      if (b < 1) this.drawLayer(ctx, 'eyes_idle', F.head, eyeShift, eyeY, scale, 1 - b);
      if (b > 0) this.drawLayer(ctx, 'eyes_beam', F.head, turn * FEAT, 0, scale, b);
    }
    this.drawLayer(ctx, 'brows', F.head, turn * FEAT * 1.05, -0.95 * p.brow, scale);
    if (ex && this.images['mouth_' + ex]) this.drawLayer(ctx, 'mouth_' + ex, F.head, turn * FEAT * 0.95, 0, scale);
    else if (zz && this.images.mouth_daze) this.drawLayer(ctx, 'mouth_daze', F.head, turn * FEAT * 0.95, 0, scale);
    else {
      if (b < 1) this.drawLayer(ctx, 'mouth_idle', F.head, turn * FEAT * 0.95, 0, scale, 1 - b);
      if (b > 0) this.drawLayer(ctx, 'mouth_beam', F.head, turn * FEAT * 0.95, 0, scale, b);
    }
    this.drawLayer(ctx, 'extras', F.head, turn * FEAT, 0, scale);
    this.drawLayer(ctx, 'hairFront', F.head, HAIR_TURN * turn + F.hair[0], F.hair[1], scale);
  };

    // A leg is one smooth curve hip -> knee -> ankle, tapering, with a flat end hidden in the shoe.
  P.drawLeg = function (ctx, side, far) {
    const r = this.rig, c = this.palette(far), L = this.frame.legs[side], p = this.pose;
    const top = [L.Hj[0], L.Hj[1] - 0.8];
    const curve = armCurve(top, L.K, L.A, 0.7);
    const pts = Array.from({ length: 15 }, (_, i) => curve(i / 14));
    const w = r.legs.width;
    tube(ctx, pts, pts.map((_, i) => lerp(w + 0.7, w - 0.1, i / 14)), c.trousers.fill, c.trousers.line, r.outline, [true, false]);
    // shade along the right edge (light from the top left)
    ctx.strokeStyle = c.trousers.shade; ctx.lineWidth = w * 0.24; ctx.lineCap = 'round';
    const shade = pts.slice(2, 14).map((_, i, arr) => offsetPoint(arr, i, -w * 0.28));
    ctx.beginPath(); shade.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();

    // shoe: points into the direction of travel in the three-quarter view, toe dips while the foot swings
    const sgn = (side === 'left' ? 1 : -1) * (p.back ? -1 : 1);
    const threeQ = Math.abs(p.bodyTurn) > 0.3;
    ctx.save();
    ctx.translate(L.A[0] + (threeQ ? p.d * 0.5 : sgn * 0.5), L.A[1] - 0.6);
    if (threeQ) { ctx.rotate(p.d * 0.32 * L.lift); ctx.scale(p.d * 1.08, 1); }
    const shoe = this.shared.shoe || (this.shared.shoe = new Path2D(r.shoe));
    ctx.fillStyle = c.white.fill; ctx.strokeStyle = c.white.line; ctx.lineWidth = 1.0;
    ctx.fill(shoe); ctx.stroke(shoe);
    ctx.strokeStyle = '#D9D0DF'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-2.6, 1.3); ctx.lineTo(2.7, 1.3); ctx.stroke();
    ctx.restore();
  };

    // The arm is one smooth curve from shoulder to wrist (rounded elbow), drawn as a tapering tube with a
    // single outline. The sleeve follows the same curve and ends in a rolled cuff.
  P.drawArm = function (ctx, side, far) {
    const r = this.rig, c = this.palette(far), A = this.frame.arms[side];
    const aw = r.arm.width;
    const curve = armCurve(A.S, A.E, A.W);
    const sample = (t0, t1, n = 14) => Array.from({ length: n + 1 }, (_, i) => curve(lerp(t0, t1, i / n)));
    const sleeveEnd = { rolled: 0.6, long: 1, short: 0.32, cap: 0.16, bare: 0 }[r.arm.sleeve] || 0;

    if (sleeveEnd < 1) {
      const pts = sample(Math.max(0, sleeveEnd - 0.1), 1);
      tube(ctx, pts, pts.map((_, i) => lerp(aw - 0.15, aw - 0.85, i / (pts.length - 1))), c.skin.fill, c.skin.line, r.outline);
    }
    if (c.watch && c.watch.side === side && sleeveEnd < 0.8) {
      const band = sample(0.8, 0.9, 4);
      tube(ctx, band, band.map(() => aw - 0.35), c.watch.band, c.watch.band, 0.25, false);
      const m = curve(0.85);
      ctx.fillStyle = '#E2DEEA'; ctx.strokeStyle = '#5E5A6A'; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.arc(m[0], m[1], 0.72, 0, TAU); ctx.fill(); ctx.stroke();
    }
    if (sleeveEnd > 0) {
      const pts = sample(0, sleeveEnd);
      tube(ctx, pts, pts.map((_, i) => lerp(aw + 0.75, aw + 0.35, i / (pts.length - 1))), c.white.fill, c.white.line, r.outline, [true, sleeveEnd >= 1]);
      if (c.stripes) {
        ctx.strokeStyle = c.stripes; ctx.lineWidth = 0.45; ctx.lineCap = 'round';
        for (const o of [-1.05, 0, 1.05]) {
          const ln = sample(0.05, sleeveEnd - 0.07, 10).map((q, i, arr) => offsetPoint(arr, i, o));
          ctx.beginPath(); ln.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
        }
      }
      if (sleeveEnd < 1) {
        // rolled cuff: a slightly wider band with a fold line
        const cuff = sample(sleeveEnd - 0.08, sleeveEnd, 4);
        tube(ctx, cuff, cuff.map(() => aw + 0.95), c.white.fill, c.white.line, r.outline * 0.8, false);
        const mid = curve(sleeveEnd - 0.035), nrm = curveNormal(curve, sleeveEnd - 0.035), h = (aw + 0.5) / 2;
        ctx.strokeStyle = c.white.shade; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mid[0] - nrm[0] * h, mid[1] - nrm[1] * h); ctx.lineTo(mid[0] + nrm[0] * h, mid[1] + nrm[1] * h); ctx.stroke();
      }
    }
    // the hand lags a little behind the forearm (loose wrist)
    const wrist = curve(1);
    const sgn = A.sgn;
    const dir = [sgn * Math.sin(A.hand), Math.cos(A.hand)];
    const H = [wrist[0] + dir[0] * r.arm.handReach, wrist[1] + dir[1] * r.arm.handReach];
    this.drawHand(ctx, side, [wrist[0] - dir[0], wrist[1] - dir[1]], wrist, H, c);
  };

    // A fist-like round hand when the arm hangs; an open palm with a thumb once the forearm points upward.
  P.drawHand = function (ctx, side, E, W, H, c) {
    const r = this.rig, hr = r.arm.hand;
    const sgn = this.frame.arms[side].sgn;
    const ang = Math.atan2(W[0] - E[0], W[1] - E[1]) * sgn; // 0 = down, PI = up
    const open = clamp((Math.abs(ang) / DEG - 95) / 40, 0, 1);
    const dir = Math.atan2(W[1] - E[1], W[0] - E[0]);
    if (this.handShape && this.handShape[side === 'left' ? 'l' : 'r'] === 'thumb') return this.drawThumbsUp(ctx, side, H, dir, c);
    ctx.save();
    ctx.translate(H[0], H[1]);
    ctx.rotate(dir - Math.PI / 2);
    ctx.fillStyle = c.skin.fill; ctx.strokeStyle = c.skin.line; ctx.lineWidth = r.outline;
    if (open > 0) {
      // thumb on the side facing the head
      ctx.beginPath(); ctx.ellipse(sgn * -hr * 0.95, -hr * 0.1, hr * 0.42 * open, hr * 0.62, sgn * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, hr * 0.15 * open, hr * (1 + 0.05 * open), hr * (1 + 0.28 * open), 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (open > 0.5) {
      ctx.strokeStyle = c.skin.shade; ctx.lineWidth = 0.35; ctx.globalAlpha = (open - 0.5) * 2;
      for (const fx of [-0.42, 0, 0.42]) { ctx.beginPath(); ctx.moveTo(fx * hr, hr * 0.85); ctx.lineTo(fx * hr * 1.05, hr * 1.25); ctx.stroke(); }
    }
    ctx.restore();
  };

    // A thumbs up that reads as one even on a phone: a closed fist about twice the size of the ordinary hand, seen from the front
    // (the fingers curl across it), with a thick thumb standing straight up on it, everything outlined. It always points up on
    // the screen, whatever the forearm does, and sits a little further out than the wrist so the arm does not hide it.
  P.drawThumbsUp = function (ctx, side, H, dir, c) {
    const r = this.rig, hr = r.arm.hand, sgn = this.frame.arms[side].sgn, k = hr * 1.5;
    const rx = hr * 2.25, ry = hr * 2.0, tw = hr * 1.75, th = hr * 3.6;
    ctx.save();
    ctx.translate(H[0] + Math.cos(dir) * k, H[1] + Math.sin(dir) * k - hr * 0.6);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = c.skin.fill; ctx.strokeStyle = c.skin.line; ctx.lineWidth = r.outline * 1.15;
    // the thumb: a capsule standing up on the fist, tilted a little away from the head
    ctx.save(); ctx.translate(sgn * -rx * 0.12, -ry * 0.55); ctx.rotate(sgn * 0.1);
    ctx.beginPath(); ctx.moveTo(-tw / 2, 0); ctx.lineTo(-tw / 2, -th + tw / 2); ctx.arc(0, -th + tw / 2, tw / 2, Math.PI, 0); ctx.lineTo(tw / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // the fist over its foot
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // merge the thumb's foot into the fist (no outline across the join), then the nail, the curled fingers and a highlight
    ctx.save(); ctx.translate(sgn * -rx * 0.12, -ry * 0.55); ctx.rotate(sgn * 0.1); ctx.fillRect(-tw / 2 + r.outline * 0.6, -0.4, tw - r.outline * 1.2, ry * 0.9); ctx.restore();
    ctx.save(); ctx.translate(sgn * -rx * 0.12, -ry * 0.55); ctx.rotate(sgn * 0.1);
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(tw * 0.04, -th + tw * 0.62, tw * 0.28, tw * 0.36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = c.skin.shade; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(-tw * 0.18, -th * 0.34); ctx.lineTo(tw * 0.22, -th * 0.34); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.skin.line; ctx.lineWidth = 0.65; ctx.globalAlpha = 1;
    for (const fy of [-0.1, 0.33, 0.7]) { ctx.beginPath(); ctx.moveTo(rx * 0.95, ry * fy); ctx.quadraticCurveTo(rx * 0.35, ry * (fy + 0.12), -rx * 0.62, ry * (fy + 0.05)); ctx.stroke(); }
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(-rx * 0.42, -ry * 0.1, rx * 0.2, ry * 0.3, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  };

    // ------------------------------------------------------------ props
  P.drawProp = function (ctx, scale) {
    // a scene may swap what a hand holds (propSwap: { mic: 'banana' | null }) or give a hand a prop to carry (holdProp)
    let pr = this.prop || this.holdProp;
    if (pr && this.propSwap && pr.name in this.propSwap) pr = this.propSwap[pr.name] ? { ...pr, name: this.propSwap[pr.name] } : null;
    if (!pr) return;
    const F = this.frame;
    if (pr.name === 'scarf') return this.drawScarf(ctx);
    let at, rot = 0;
    if (pr.hand === 'both') {
      at = lerpP(F.arms.left.H, F.arms.right.H, 0.5);
    } else {
      const a = F.arms[pr.hand === 'l' ? 'left' : 'right'];
      at = a.H;
      rot = Math.atan2(a.dir[1], a.dir[0]) + Math.PI / 2;
      if (pr.upright) rot = clamp(rot, -0.6, 0.6);
    }
    const off = pr.offset || [0, 0];
    const name = 'prop_' + pr.name, box = this.propBox(name);
    const c = this.layerCanvas(name, scale);
    if (!c || !box) return;
    ctx.save();
    ctx.translate(at[0], at[1]);
    ctx.rotate(rot);
    ctx.translate(off[0], off[1]);
    ctx.drawImage(c, box[0], box[1], box[2], box[3]);
    if (pr.rec && Math.floor(this.t * 2.2) % 2 === 0) {
      ctx.fillStyle = '#FF4D5E';
      ctx.beginPath(); ctx.arc(3.4, -3.5, 0.62, 0, TAU); ctx.fill();
    }
    if (pr.flash) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6.5, -2 + Math.sin(a) * 6.5); ctx.lineTo(Math.cos(a) * 8.5, -2 + Math.sin(a) * 8.5); ctx.stroke();
      }
    }
    ctx.restore();
  };

    // scarf hanging from the fist: a short verlet chain that swings with the arm
  P.stepScarf = function (dt) {
    if (!this.prop || this.prop.name !== 'scarf' || dt <= 0) { if (!this.prop) this.scarf = null; return; }
    const hand = this.frame.arms[this.prop.hand === 'l' ? 'left' : 'right'].H;
    if (!this.scarf) {
      const pts = Array.from({ length: SCARF_LINKS + 1 }, (_, i) => [hand[0], hand[1] + i * this.scarfLink]);
      this.scarf = { pts, prev: pts.map((q) => q.slice()) };
    }
    const { pts, prev } = this.scarf;
    const h = Math.min(dt, 1 / 30);
    pts[0] = hand.slice(); prev[0] = hand.slice();
    for (let i = 1; i < pts.length; i++) {
      const vx = (pts[i][0] - prev[i][0]) * 0.95, vy = (pts[i][1] - prev[i][1]) * 0.95;
      prev[i] = pts[i].slice();
      pts[i] = [pts[i][0] + vx, pts[i][1] + vy + 260 * h * h];
    }
    for (let it = 0; it < 6; it++) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const corr = (d - this.scarfLink) / d;
        if (i === 1) { b[0] -= dx * corr; b[1] -= dy * corr; } else { a[0] += dx * corr * 0.5; a[1] += dy * corr * 0.5; b[0] -= dx * corr * 0.5; b[1] -= dy * corr * 0.5; }
      }
    }
  };

  P.drawScarf = function (ctx) {
    if (!this.scarf) return;
    const pts = this.scarf.pts, [yellow, black] = this.col().scarf;
    const w = 2.8;
    tube(ctx, pts, pts.map(() => w), black, '#2A2733', 0.45, false);
    ctx.lineCap = 'butt';
    for (let i = 1; i < pts.length; i++) {
      ctx.strokeStyle = i % 2 ? yellow : black; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    const end = pts[pts.length - 1], prev = pts[pts.length - 2];
    const nx = -(end[1] - prev[1]) / this.scarfLink, ny = (end[0] - prev[0]) / this.scarfLink;
    ctx.strokeStyle = yellow; ctx.lineWidth = 0.45; ctx.lineCap = 'round';
    for (let f = -1; f <= 1; f += 0.5) {
      const sx = end[0] + nx * f * 1.2, sy = end[1] + ny * f * 1.2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (end[0] - prev[0]) * 0.55, sy + (end[1] - prev[1]) * 0.55); ctx.stroke();
    }
    // the fist closes over the scarf
    const hand = pts[0], c = this.col().skin;
    ctx.fillStyle = c.fill; ctx.strokeStyle = c.line; ctx.lineWidth = this.rig.outline;
    ctx.beginPath(); ctx.arc(hand[0], hand[1], this.rig.arm.hand, 0, TAU); ctx.fill(); ctx.stroke();
  };

  P.drawSkeleton = function (ctx) {
    const F = this.frame;
    ctx.save();
    ctx.lineWidth = 0.35; ctx.strokeStyle = '#E2445C'; ctx.fillStyle = '#E2445C';
    const bone = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const joint = (a) => { ctx.beginPath(); ctx.arc(a[0], a[1], 0.55, 0, TAU); ctx.fill(); };
    const hip = M.apply(F.pelvis, this.rig.hip), neck = M.apply(F.torso, this.rig.neck), head = M.apply(F.head, this.rig.headCenter);
    bone(hip, neck); bone(neck, head); joint(hip); joint(neck); joint(head);
    for (const side of ['left', 'right']) {
      const a = F.arms[side], l = F.legs[side];
      bone(neck, a.S); bone(a.S, a.E); bone(a.E, a.W); bone(hip, l.Hj); bone(l.Hj, l.K); bone(l.K, l.A);
      [a.S, a.E, a.W, l.Hj, l.K, l.A].forEach(joint);
    }
    ctx.restore();
  };  window.MimoWorlds.register({ world: 4, setup() {} });
})();
