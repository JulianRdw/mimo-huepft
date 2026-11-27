// World 5 "Gipfelsturm": the level list as a climb (hook levelPath of the game core, see README.md).
// - the 13 levels hang on a winding mountain path with small height marks (0 m ... 2.000 m, the numbers of volcano-ascent.js);
//   the start is at the bottom, the crater with the boss at the top, the colours follow the height bands of the world
// - a Polaroid with four gaps shows the pieces of the summit photo: found ones as a small picture, missing ones as a dashed
//   outline (the store is volcano-story.js: MimoVolcano.foundParts()); it replaces the text "Gipfelfoto n/4"
// - the wardrobe calls the pieces "Gipfelfoto-Teile" (world field finds)
// The cards themselves are the cards of the core (same size, same buttons); only their surroundings are new. Nothing here
// measures the page: rows have a fixed structure and the path is a stretched SVG, so nothing jumps when the list opens.
(function () {
  'use strict';
  const V = () => window.MimoVolcano || {};
  const SVGNS = 'http://www.w3.org/2000/svg';
  const ORDER = ['flag', 'book', 'thermos', 'tripod'];
  const NAMES = { flag: 'Fahne', book: 'Gipfelbuch', thermos: 'Thermoskanne', tripod: 'Stativ' };
  const X_LEFT = 8, X_RIGHT = 92;        // % of the row width where the path touches the left / right side
  const GAP = 18, CARD_H = 56;           // px: space under a card (the path swings across here), height of a card
  const MARK_H = 22;                     // px: the strip above each card that holds the height mark

  // small pictures of the four pieces, 24 x 24: [path, fill]
  const ICONS = {
    flag: [['M6 3h2v19H6z', '#A9805F'], ['M8 4h12l-3 4.2 3 4.2H8z', '#E2654F'], ['M8 8.2h9.2l-.9 1.2H8z', '#FFF8F0']],
    book: [['M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z', '#8A4E5A'], ['M8 17h10v3H8z', '#FFF2D8'], ['M13.5 4h2.2v7.4l-1.1-1-1.1 1z', '#F2C260']],
    thermos: [['M8 8h8v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z', '#6FA8A0'], ['M9 3.5h6V8H9z', '#E2654F'], ['M8 13h8v2H8z', '#FFF8F0']],
    tripod: [['M11 10h2l5 12h-2l-4-9-4 9H6z', '#5E4438'], ['M6.5 3.5h11V10h-11z', '#4A3A52'], ['M12 4.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z', '#FFD98E']],
  };

  const CSS = `
.vmap{--vm-ink:#4A2F45;--vm-trail:#B38A68;--vm-dot:#E2654F;--vm-dot-off:#B6AEC4;--vm-paper:#FFFDF8;--vm-paper-ink:#5B4A58;
  --vm-sand:#F6CF9E;--vm-forest:#9DBB92;--vm-rock:#9A7894;--vm-crater:#3A2352;--vm-slot:#EFE3D6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .vmap{--vm-ink:#ECE7F3;--vm-trail:#9A7C66;--vm-dot:#E07A64;--vm-dot-off:#6E6585;--vm-paper:#E8DED2;--vm-paper-ink:#3A2A36;--vm-slot:#CFC2B4}}
:root[data-theme="dark"] .vmap{--vm-ink:#ECE7F3;--vm-trail:#9A7C66;--vm-dot:#E07A64;--vm-dot-off:#6E6585;--vm-paper:#E8DED2;--vm-paper-ink:#3A2A36;--vm-slot:#CFC2B4}
.vmap{grid-column:1/-1;display:block;isolation:isolate}
.vmap-trail{position:relative;margin:0 -9px;display:flex;flex-direction:column-reverse;padding:2px 0 8px;border-radius:18px;border:1px solid var(--line);
  background:linear-gradient(to top,color-mix(in srgb,var(--vm-sand) 40%,var(--bg)) 0,color-mix(in srgb,var(--vm-forest) 30%,var(--bg)) 30%,color-mix(in srgb,var(--vm-rock) 30%,var(--bg)) 64%,color-mix(in srgb,var(--vm-crater) 34%,var(--bg)) 100%)}
.vmap-row{position:relative;padding:0 8px ${GAP}px}
.vmap-row:first-child{padding-bottom:0}
.vmap-row .lvl-card{position:relative;z-index:1;width:100%;box-sizing:border-box}
.vmap-path{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;z-index:0;pointer-events:none}
.vmap-path path{fill:none;stroke:var(--vm-trail);stroke-width:3.5;stroke-linecap:round;stroke-dasharray:0.1 8;vector-effect:non-scaling-stroke}
.vmap-mark{position:relative;height:${MARK_H}px;z-index:2}
.vmap-dot{position:absolute;top:${MARK_H / 2}px;width:12px;height:12px;border-radius:50%;background:var(--vm-dot);border:2px solid #FFF8F0;box-sizing:border-box;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(40,30,60,.3)}
.vmap-row.off .vmap-dot{background:var(--vm-dot-off)}
.vmap-row.cur .vmap-dot{width:16px;height:16px;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 55%,transparent)}
.vmap-pill{position:absolute;top:3px;height:16px;line-height:16px;padding:0 7px;border-radius:8px;background:var(--card);border:1px solid var(--line);font:700 11px var(--font-body);color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
.vmap-row.L .vmap-dot{left:${X_LEFT}%}.vmap-row.L .vmap-pill{left:calc(${X_LEFT}% + 12px)}
.vmap-row.R .vmap-dot{left:${X_RIGHT}%}.vmap-row.R .vmap-pill{right:calc(${100 - X_RIGHT}% + 12px)}
.vmap-frame{width:min(236px,100%);margin:6px auto 14px;box-sizing:border-box;padding:9px 9px 8px;background:var(--vm-paper);border-radius:4px;box-shadow:0 6px 16px rgba(40,30,60,.22),0 1px 2px rgba(40,30,60,.2);transform:rotate(-1.6deg);color:var(--vm-paper-ink);text-align:center}
.vmap-photo{position:relative;height:112px;border-radius:2px;overflow:hidden;background:#3A2352}
.vmap-photo>svg{display:block;position:absolute;inset:0;width:100%;height:100%}
.vmap-slots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:7px}
.vmap-slot{width:41px;height:41px;box-sizing:border-box;border-radius:8px;background:color-mix(in srgb,var(--vm-slot) 86%,transparent);box-shadow:inset 0 2px 4px rgba(40,30,60,.28);display:flex;align-items:center;justify-content:center}
.vmap-slot svg{width:31px;height:31px;display:block;overflow:visible}
.vmap-slot.miss path{fill:none;stroke:#7D6E8A;stroke-width:1.1;stroke-dasharray:2 1.7;stroke-linejoin:round}
.vmap-slot.got path{stroke:#4A2F45;stroke-width:.7;stroke-linejoin:round}
.vmap-cap{margin-top:7px;font:700 13px var(--font-body);display:flex;justify-content:space-between;align-items:baseline;padding:0 3px;min-height:18px}
.vmap-cap span{font-weight:600;font-size:12px;opacity:.75;font-variant-numeric:tabular-nums}
@media (orientation: landscape) and (max-height: 540px){
  .vmap{display:grid;grid-template-columns:216px 1fr;gap:16px;align-items:start}
  .vmap-frame{position:sticky;top:62px;margin:14px 0 0}
}
`;
  function injectCss() {
    if (document.getElementById('vmapCss')) return;
    const st = document.createElement('style'); st.id = 'vmapCss'; st.textContent = CSS; document.head.appendChild(st);
  }

  const svg = (tag, attrs, kids) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    for (const k of kids || []) e.appendChild(k);
    return e;
  };
  const heightLabel = (m) => String(Math.round(m)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' m';

  // the photo behind the gaps: sky, a sun, the cone with its crater glow
  function scene() {
    const grad = svg('linearGradient', { id: 'vmapSky', x1: 0, y1: 0, x2: 0, y2: 1 }, [
      svg('stop', { offset: 0, 'stop-color': '#3A2352' }), svg('stop', { offset: 0.7, 'stop-color': '#C98FA8' }), svg('stop', { offset: 1, 'stop-color': '#FDE0CF' })]);
    return svg('svg', { viewBox: '0 0 200 112', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' }, [
      svg('defs', {}, [grad]), svg('rect', { width: 200, height: 112, fill: 'url(#vmapSky)' }),
      svg('circle', { cx: 160, cy: 34, r: 12, fill: '#FFE3A6', opacity: 0.9 }),
      svg('path', { d: 'M0 112V84l34-14 26 10 40-46 12 0 44 52 22-10 22 14v22z', fill: '#6E5076' }),
      svg('path', { d: 'M96 34l10 0 6 8-22 0z', fill: '#E2654F', opacity: 0.85 }),
      svg('path', { d: 'M0 112V96l40-8 50 8 50-10 60 10v16z', fill: '#4C3050' })]);
  }
  function slot(item, found) {
    const d = document.createElement('div'); d.className = 'vmap-slot ' + (found ? 'got' : 'miss');
    d.setAttribute('role', 'img'); d.title = NAMES[item]; d.setAttribute('aria-label', NAMES[item] + (found ? ' gefunden' : ' fehlt noch'));
    d.appendChild(svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, ICONS[item].map(([p, fill]) => svg('path', found ? { d: p, fill } : { d: p }))));
    return d;
  }
  function frame() {
    const got = V().foundParts ? V().foundParts() : {}, n = ORDER.filter((k) => got[k]).length;
    const f = document.createElement('div'); f.className = 'vmap-frame';
    f.setAttribute('role', 'group'); f.setAttribute('aria-label', 'Gipfelfoto: ' + n + ' von ' + ORDER.length + ' Teilen gefunden');
    const photo = document.createElement('div'); photo.className = 'vmap-photo'; photo.appendChild(scene());
    const slots = document.createElement('div'); slots.className = 'vmap-slots';
    ORDER.forEach((k) => slots.appendChild(slot(k, !!got[k])));
    photo.appendChild(slots);
    const cap = document.createElement('div'); cap.className = 'vmap-cap';
    cap.innerHTML = 'Gipfelfoto<span>' + n + ' von ' + ORDER.length + '</span>';
    f.append(photo, cap);
    return f;
  }

  // one row: the mark strip with dot and height, the card, and the piece of path down to the dot of the row below
  function row(item, k, rows) {
    const r = document.createElement('div'), side = k % 2 ? 'R' : 'L', el = item.el;
    r.className = 'vmap-row ' + side + (el.disabled ? ' off' : '') + (el.classList.contains('current') ? ' cur' : '');
    if (k > 0) {
      // from this dot (centre of the mark strip) to the dot of the row below: the row is MARK_H + card + gap tall, stretched to 100 units
      const x0 = side === 'L' ? X_LEFT : X_RIGHT, x1 = side === 'L' ? X_RIGHT : X_LEFT;
      const H = MARK_H + CARD_H + GAP, pc = (px) => (px / H * 100).toFixed(1), yTop = pc(MARK_H / 2), yCard = pc(MARK_H + CARD_H - 3), yNext = pc(H + MARK_H / 2);
      const xa = (x0 + (x1 - x0) * 0.3).toFixed(1), xb = (x0 + (x1 - x0) * 0.7).toFixed(1);
      const path = svg('path', { d: `M${x0} ${yTop} L${x0} ${yCard} C${xa} ${yCard} ${xb} ${yNext} ${x1} ${yNext}` });
      const sv = svg('svg', { class: 'vmap-path', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, [path]);
      r.appendChild(sv);
    }
    const mark = document.createElement('div'); mark.className = 'vmap-mark';
    let text = 'Krater';
    if (!item.boss) { const asc = V().ascent; text = heightLabel(asc && item.level ? asc.resolve(item.level).height : 0); }
    mark.innerHTML = '<i class="vmap-dot"></i><span class="vmap-pill"></span>';
    mark.querySelector('.vmap-pill').textContent = text;
    r.append(mark, el);
    return r;
  }

  function levelPath(box, items) {
    if (!items || !items.length) return false;
    injectCss();
    box.className = 'vmap';
    const trail = document.createElement('div'); trail.className = 'vmap-trail';
    items.forEach((it, k) => trail.appendChild(row(it, k, items.length)));
    box.append(frame(), trail);
    return true;
  }

  window.MimoWorlds.register({ world: 5, levelPath, finds: { label: 'Gipfelfoto-Teile' } });
})();
