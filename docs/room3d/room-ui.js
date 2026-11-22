/* Mimo hüpft · Kinderzimmer (3D) · story and HUD overlay
   Everything the player reads, drawn like a comic: in a scene cinema bars slide in and the speaker talks in a
   speech bubble that points at his head, with a round portrait, a name tag and a babbling voice while the
   words type themselves. A new mission is stamped onto the screen, then a small badge keeps the running step
   with an icon and pips. An arrow at the screen's edge points at a goal that is out of the picture. Figures
   call out short lines in small bubbles while the game goes on. A finished mission gets a "Geschafft!" stamp.
   The host creates it once: const ui = Room3D.makeStoryUI({ tone, touch }) and calls ui.frame(room) every
   animation frame. tone(freq, seconds, wave, loudness) plays one short beep (may be missing). */
(function () {
  'use strict';
  const Room3D = (window.Room3D = window.Room3D || {});

  const REVEAL_TIME = 1700, REVEAL_GAP = 380;        // ms a new sticker or medal stays in the middle, and the pause before the next one
  const TYPE_CPS = 40, SAY_CPS = 60;                 // letters per second in a scene and in a short call-out
  const CARD_TIME = 2300, STAMP_TIME = 1700;         // ms the mission card and the "done" stamp stay
  const SAY_BASE = 2600, SAY_PER_CHAR = 35, SAY_MAX = 2;   // ms a call-out stays (plus per letter), how many at once
  const EDGE_TOP = 110;                              // px kept free at the top for the badges
  const EDGE = 46;                                   // px from the screen edge for the goal arrow
  const RADIO_TOP = window.innerHeight < 460 ? 78 : 96;                              // px from the top for call-outs of figures out of the picture
  const TAIL_MIN = 170;                              // a scene bubble's tail stays right of the portrait and the name tag
  const FOLLOW = 0.3;                                // how quickly a bubble follows its speaker on screen (per frame)
  const DETAIL_TIME = 4200;                          // ms the full step text stays open after a tap on the badge
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap';

  // ---------- Who speaks: portrait colour and voice (base pitch, wave) ----------
  const VOICES = {
    teddy: { color: '#A86B3C', pitch: 165, wave: 'triangle' }, driver: { color: '#2F5FA8', pitch: 128, wave: 'square' },
    lamp: { color: '#3E9461', pitch: 540, wave: 'sine' }, granny: { color: '#7E5CC0', pitch: 300, wave: 'sine' },
    gentleman: { color: '#3E9461', pitch: 190, wave: 'triangle' }, girl: { color: '#E07B2E', pitch: 640, wave: 'sine' },
    passengers: { color: '#E07B2E', pitch: 380, wave: 'triangle' }, toys: { color: '#D2483A', pitch: 450, wave: 'square' },
    robot: { color: '#3A3850', pitch: 95, wave: 'sawtooth' },
    kicker: { color: '#3E9461', pitch: 470, wave: 'triangle' }, builder: { color: '#E07B2E', pitch: 150, wave: 'square' }, racer: { color: '#D2483A', pitch: 560, wave: 'triangle' },
    bowler: { color: '#2F5FA8', pitch: 140, wave: 'triangle' }, seamstress: { color: '#D2483A', pitch: 420, wave: 'sine' }, duster: { color: '#3E9461', pitch: 600, wave: 'sine' },
    musician: { color: '#3A3850', pitch: 175, wave: 'sine' }, seller: { color: '#E0A92A', pitch: 520, wave: 'triangle' },
  };
  const INK = '#3A3850', SKIN = '#F2D2AE', CHEEK = '#F29A9A';
  const eyes = (y, dx) => `<circle cx="${32 - dx}" cy="${y}" r="2.6" fill="${INK}"/><circle cx="${32 + dx}" cy="${y}" r="2.6" fill="${INK}"/>`;
  const smile = (y, w) => `<path d="M${32 - w} ${y}q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  const cheeks = (y, dx) => `<circle cx="${32 - dx}" cy="${y}" r="3.4" fill="${CHEEK}" opacity=".8"/><circle cx="${32 + dx}" cy="${y}" r="3.4" fill="${CHEEK}" opacity=".8"/>`;
  const face = (bg, body) => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${bg}"/>${body}</svg>`;
  const FACES = {
    teddy: face('#F6DDB0', `<circle cx="15" cy="19" r="9" fill="#A86B3C"/><circle cx="49" cy="19" r="9" fill="#A86B3C"/><circle cx="15" cy="19" r="4.5" fill="#E8C49A"/><circle cx="49" cy="19" r="4.5" fill="#E8C49A"/>
      <circle cx="32" cy="36" r="20" fill="#A86B3C"/><ellipse cx="32" cy="44" rx="10" ry="7.5" fill="#E8C49A"/><ellipse cx="32" cy="40" rx="4" ry="3" fill="${INK}"/>${eyes(31, 8)}${smile(46, 4)}
      <path d="M12 58h40v6H12z" fill="#F4BF3A"/><path d="M20 58h6v6h-6zM34 58h6v6h-6z" fill="${INK}"/>`),
    driver: face('#CFE0F5', `<path d="M10 64c2-12 10-16 22-16s20 4 22 16z" fill="#4686D2"/><path d="M26 50l6 7 6-7z" fill="#E25B45"/><circle cx="32" cy="36" r="16" fill="${SKIN}"/>
      <rect x="13" y="12" width="38" height="13" rx="4" fill="#2F3550"/><rect x="13" y="22" width="38" height="4" fill="#E25B45"/><ellipse cx="32" cy="27" rx="17" ry="3.4" fill="${INK}"/><circle cx="32" cy="17" r="2.6" fill="#FBF7EF"/>
      ${eyes(34, 6)}${cheeks(40, 10)}<ellipse cx="27" cy="42" rx="5.5" ry="2.6" fill="#7A4E2D"/><ellipse cx="37" cy="42" rx="5.5" ry="2.6" fill="#7A4E2D"/>`),
    lamp: face('#D9F0DF', `<ellipse cx="32" cy="50" rx="18" ry="6" fill="#FFE9A6"/><path d="M14 44h36l-8-28H22z" fill="#52AE75"/><path d="M14 44h36" stroke="#3E9461" stroke-width="3"/>
      <circle cx="26" cy="31" r="4.5" fill="#fff"/><circle cx="38" cy="31" r="4.5" fill="#fff"/><circle cx="26.5" cy="32" r="2.2" fill="${INK}"/><circle cx="38.5" cy="32" r="2.2" fill="${INK}"/>
      <path d="M28 38q4 3 8 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M32 16V8" stroke="#3E9461" stroke-width="4" stroke-linecap="round"/>`),
    granny: face('#E8DDF5', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#9474CE"/><path d="M24 50q8 5 16 0" fill="none" stroke="#FBF7EF" stroke-width="3"/>
      <circle cx="32" cy="12" r="7" fill="#D8D4CE"/><circle cx="32" cy="31" r="19" fill="#D8D4CE"/><circle cx="32" cy="37" r="15" fill="${SKIN}"/>
      <circle cx="26" cy="35" r="5" fill="none" stroke="${INK}" stroke-width="1.8"/><circle cx="38" cy="35" r="5" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M31 35h2" stroke="${INK}" stroke-width="1.8"/>
      ${eyes(35, 6)}${cheeks(42, 10)}${smile(44, 3.5)}`),
    gentleman: face('#DDF0E3', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#52AE75"/><circle cx="29" cy="55" r="1.8" fill="#FBF7EF"/><circle cx="35" cy="55" r="1.8" fill="#FBF7EF"/>
      <circle cx="32" cy="37" r="15" fill="#7A4E2D"/><circle cx="32" cy="38" r="13.5" fill="${SKIN}"/><rect x="21" y="4" width="22" height="20" rx="2" fill="${INK}"/><rect x="21" y="18" width="22" height="4" fill="#E25B45"/><rect x="14" y="22" width="36" height="4" rx="2" fill="${INK}"/>
      ${eyes(37, 5.5)}${cheeks(42, 9)}${smile(44, 3.5)}`),
    girl: face('#FDE3CF', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#EE8A38"/><circle cx="13" cy="38" r="7" fill="#B5542B"/><circle cx="51" cy="38" r="7" fill="#B5542B"/>
      <circle cx="32" cy="32" r="17" fill="#B5542B"/><circle cx="32" cy="38" r="14" fill="${SKIN}"/><path d="M24 12l8 4 8-4v8l-8-4-8 4z" fill="#E25B45"/>
      ${eyes(37, 5.5)}${cheeks(42, 9)}${smile(44, 3.5)}`),
    passengers: face('#FDE3CF', `<circle cx="18" cy="40" r="10" fill="${SKIN}"/><rect x="11" y="20" width="14" height="12" rx="2" fill="${INK}"/><rect x="7" y="30" width="22" height="3" rx="1.5" fill="${INK}"/>
      <circle cx="46" cy="40" r="10" fill="${SKIN}"/><circle cx="46" cy="30" r="7" fill="#D8D4CE"/><circle cx="32" cy="46" r="11" fill="${SKIN}"/><path d="M25 34l7 3 7-3v6l-7-3-7 3z" fill="#E25B45"/>
      <circle cx="15" cy="40" r="1.6" fill="${INK}"/><circle cx="21" cy="40" r="1.6" fill="${INK}"/><circle cx="43" cy="41" r="1.6" fill="${INK}"/><circle cx="49" cy="41" r="1.6" fill="${INK}"/><circle cx="28.5" cy="46" r="1.8" fill="${INK}"/><circle cx="35.5" cy="46" r="1.8" fill="${INK}"/>`),
    toys: face('#FBE0DA', `<rect x="8" y="26" width="26" height="26" rx="4" fill="#E25B45"/><circle cx="46" cy="42" r="12" fill="#4686D2"/><path d="M34 42h24" stroke="#F4BF3A" stroke-width="3"/><rect x="24" y="12" width="16" height="16" rx="3" fill="#F4BF3A"/>
      <circle cx="16" cy="37" r="2.4" fill="${INK}"/><circle cx="26" cy="37" r="2.4" fill="${INK}"/><path d="M16 43q5 4 10 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`),
    kicker: face('#DDF0E3', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#52AE75"/><text x="32" y="62" font-size="10" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial">10</text>
      <circle cx="32" cy="34" r="16" fill="#7A4E2D"/><circle cx="32" cy="37" r="14" fill="${SKIN}"/><rect x="17" y="24" width="30" height="5" rx="2.5" fill="#E25B45"/>${eyes(37, 5.5)}${cheeks(42, 9)}${smile(44, 4)}`),
    builder: face('#FDE3CF', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#EE8A38"/><circle cx="32" cy="38" r="14" fill="${SKIN}"/>
      <path d="M15 30a17 15 0 0 1 34 0z" fill="#F4BF3A"/><rect x="12" y="28" width="40" height="4" rx="2" fill="#E0A92A"/><rect x="30" y="15" width="4" height="13" rx="2" fill="#E0A92A"/>
      ${eyes(38, 5.5)}${cheeks(43, 9)}<ellipse cx="27.5" cy="44" rx="5" ry="2.4" fill="${INK}"/><ellipse cx="36.5" cy="44" rx="5" ry="2.4" fill="${INK}"/>`),
    racer: face('#FBE0DA', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#E25B45"/><circle cx="13" cy="40" r="6" fill="#B5542B"/><circle cx="51" cy="40" r="6" fill="#B5542B"/>
      <circle cx="32" cy="34" r="19" fill="#FBF7EF"/><rect x="14" y="26" width="36" height="5" rx="2" fill="${INK}"/><circle cx="32" cy="39" r="13" fill="${SKIN}"/>${eyes(38, 5)}${cheeks(43, 8.5)}${smile(45, 3.5)}`),
    bowler: face('#CFE0F5', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#4686D2"/><circle cx="32" cy="34" r="16" fill="${INK}"/><circle cx="32" cy="37" r="14" fill="${SKIN}"/>
      <circle cx="26" cy="36" r="5" fill="none" stroke="${INK}" stroke-width="1.8"/><circle cx="38" cy="36" r="5" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M31 36h2" stroke="${INK}" stroke-width="1.8"/>
      ${eyes(36, 6)}${cheeks(42, 10)}<ellipse cx="27.5" cy="44" rx="5" ry="2.4" fill="${INK}"/><ellipse cx="36.5" cy="44" rx="5" ry="2.4" fill="${INK}"/>`),
    seamstress: face('#FBE0DA', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#E25B45"/><circle cx="32" cy="13" r="7" fill="${INK}"/><circle cx="32" cy="31" r="18" fill="${INK}"/><circle cx="32" cy="37" r="14" fill="${SKIN}"/>
      <path d="M23 17l9 4 9-4v8l-9-4-9 4z" fill="#F4BF3A"/>${eyes(37, 5.5)}${cheeks(42, 9)}${smile(44, 3.5)}`),
    duster: face('#DDF0E3', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#52AE75"/><path d="M20 52q12 7 24 0v5q-12 6-24 0z" fill="#F4BF3A"/><circle cx="13" cy="40" r="6" fill="#B5542B"/><circle cx="51" cy="40" r="6" fill="#B5542B"/>
      <circle cx="32" cy="33" r="17" fill="#B5542B"/><circle cx="32" cy="38" r="14" fill="${SKIN}"/><rect x="16" y="24" width="32" height="5" rx="2.5" fill="#FBF7EF"/>${eyes(38, 5.5)}${cheeks(43, 9)}${smile(45, 3.5)}`),
    musician: face('#E3E1EA', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="${INK}"/><path d="M27 51l5 5 5-5z" fill="#F4BF3A"/><circle cx="32" cy="37" r="15" fill="#D8D4CE"/><circle cx="32" cy="38" r="13.5" fill="${SKIN}"/>
      <rect x="21" y="4" width="22" height="20" rx="2" fill="${INK}"/><rect x="21" y="18" width="22" height="4" fill="#F4BF3A"/><rect x="14" y="22" width="36" height="4" rx="2" fill="${INK}"/>
      ${eyes(36, 5.5)}${cheeks(42, 9)}<ellipse cx="27.5" cy="44" rx="5" ry="2.4" fill="#D8D4CE"/><ellipse cx="36.5" cy="44" rx="5" ry="2.4" fill="#D8D4CE"/>`),
    seller: face('#FFF1C9', `<path d="M12 64c2-11 9-15 20-15s18 4 20 15z" fill="#F4BF3A"/><circle cx="13" cy="38" r="7" fill="#EE8A38"/><circle cx="51" cy="38" r="7" fill="#EE8A38"/>
      <circle cx="32" cy="32" r="17" fill="#EE8A38"/><circle cx="32" cy="38" r="14" fill="${SKIN}"/><path d="M24 12l8 4 8-4v8l-8-4-8 4z" fill="#52AE75"/>${eyes(37, 5.5)}${cheeks(42, 9)}${smile(44, 3.5)}`),
    robot: face('#E6E9EF', `<path d="M10 40a22 16 0 0 1 44 0v6H10z" fill="#FBFBFD"/><path d="M8 46h48v5a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="${INK}"/><circle cx="32" cy="28" r="7" fill="#E2E5EC"/><circle cx="32" cy="28" r="4" fill="#52AE75"/>
      <path d="M20 38q3 2 6 0M38 38q3 2 6 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`),
  };

  // ---------- Small icons (24 by 24) ----------
  const ic = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    look: ic('<circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M9 9l1-3h4l1 3M11 15h2"/>'),
    train: ic('<rect x="4" y="7" width="10" height="9" rx="1.5"/><path d="M14 10h4l2 6H14M7 4h3v3"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>'),
    lamp: ic('<path d="M6 11l4-7 6 3-3 6z"/><path d="M13 13l3 5M8 20h10M9 14l-1 2"/>'),
    lights: ic('<path d="M2 6q10 6 20 0"/><path d="M6 8v3M12 9v3M18 8v3"/><circle cx="6" cy="14" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="18" cy="14" r="2"/>'),
    robot: ic('<path d="M4 15a8 7 0 0 1 16 0v3H4z"/><circle cx="12" cy="11" r="2"/>'),
    person: ic('<circle cx="12" cy="7" r="3.5"/><path d="M7 21c0-6 2-9 5-9s5 3 5 9z"/>'),
    sheet: ic('<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M5 9h14M5 14h14M10 4v16M15 4v16"/>'),
    bulb: ic('<path d="M9 17h6M10 20h4M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z"/>'),
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" fill="#F6C83C" stroke="#C99A1C" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    secret: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="#C99A1C" stroke-width="2"/><path d="M12 6.5l1.7 3.4 3.8.5-2.8 2.6.7 3.7L12 14.9l-3.4 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="#F6C83C"/></svg>',
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    flag: ic('<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>'),
    restart: ic('<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    ball: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.6 2.6-1.4 4.2H9.8l-1.4-4.2z"/><path d="M12 3v4.5M20.5 9.5l-4.9.6M17 19.5l-2.8-5.2M7 19.5l2.8-5.2M3.5 9.5l4.9.6"/>'),
    brick: ic('<rect x="3" y="9" width="18" height="10" rx="1.5"/><path d="M6 9V6h4v3M14 9V6h4v3"/>'),
    race: ic('<path d="M5 21V4M5 4h13v9H5"/><path d="M5 4h4v3H5zM13 4h5v3h-5zM9 7h4v3H9zM5 10h4v3H5zM13 10h5v3h-5z" fill="currentColor"/>'),
    album: ic('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="11" r="3.5"/><path d="M8 3v18"/>'),
    pin: ic('<path d="M10 3h4l.6 4.5-1 2c2.6 2.4 2.9 7 .9 11.5h-5c-2-4.5-1.7-9.1.9-11.5l-1-2z"/><path d="M9.8 9.5h4.4"/>'),
    button: ic('<circle cx="12" cy="12" r="9"/><circle cx="9.5" cy="9.5" r=".9" fill="currentColor"/><circle cx="14.5" cy="9.5" r=".9" fill="currentColor"/><circle cx="9.5" cy="14.5" r=".9" fill="currentColor"/><circle cx="14.5" cy="14.5" r=".9" fill="currentColor"/>'),
    dust: ic('<path d="M6 17a4 4 0 0 1-1-7.5 5 5 0 0 1 9-3 4.5 4.5 0 0 1 5.5 6.5A3.5 3.5 0 0 1 17 19H8a3 3 0 0 1-2-2z"/><circle cx="10" cy="12.5" r=".9" fill="currentColor"/><circle cx="14.5" cy="12.5" r=".9" fill="currentColor"/>'),
    domino: ic('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M7 12h10"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="10" cy="15" r="1" fill="currentColor"/><circle cx="14" cy="18" r="1" fill="currentColor"/>'),
    note: ic('<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
    balloon: ic('<path d="M12 3a6 7 0 0 1 6 7c0 4-3 7-6 7s-6-3-6-7a6 7 0 0 1 6-7z"/><path d="M12 17v1.5M12 18.5q-2 1.5 0 3"/>'),
    find: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7l1.5 3.1 3.4.4-2.5 2.3.6 3.4L12 14.6l-3 1.6.6-3.4-2.5-2.3 3.4-.4z" fill="currentColor" stroke="none"/>'),
    medal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.500l2.300 4.700 5.200.7-3.800 3.600.9 5.100L12 16.200l-4.600 2.400.9-5.100-3.800-3.600 5.200-.7z" fill="#fff" opacity=".92"/></svg>',
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h13M11 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const CSS = `
  .rui, .rui * { box-sizing: border-box; }
  .rui { --ink: #3A3850; --paper: #FFFCF4; --gold: #F6C83C; --bar: clamp(30px, 9vh, 84px); position: fixed; inset: 0; pointer-events: none; z-index: 5;
    font-family: 'Fredoka', 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
  .rui svg { display: block; width: 100%; height: 100%; }
  .rui-bars i { position: fixed; left: 0; right: 0; height: var(--bar); background: #17141F; transition: transform .5s cubic-bezier(.2,.8,.2,1); }
  .rui-bars i:first-child { top: 0; transform: translateY(-101%); } .rui-bars i:last-child { bottom: 0; transform: translateY(101%); }
  .rui.cinema .rui-bars i { transform: none; }
  body.rui-cinema .hud, body.rui-cinema .jump { opacity: 0; transition: opacity .3s; }
  /* speech bubble */
  .rui-bubble { position: fixed; left: 0; top: 0; max-width: min(88vw, 470px); min-width: 200px; padding: 14px 20px 14px 20px; background: var(--paper); border: 3px solid var(--ink); border-radius: 24px;
    box-shadow: 0 5px 0 rgba(23,20,31,.28); pointer-events: auto; cursor: pointer; opacity: 0; transform: scale(.6); transform-origin: var(--ox, 30%) 100%; transition: opacity .18s, transform .28s cubic-bezier(.3,1.6,.5,1); }
  .rui-bubble.on { opacity: 1; transform: none; }
  .rui-bubble.docked { transform-origin: 50% 100%; }
  .rui-face { position: absolute; left: -22px; top: -30px; width: 62px; height: 62px; border-radius: 50%; border: 3px solid var(--ink); background: #fff; overflow: hidden; box-shadow: 0 3px 0 rgba(23,20,31,.25); }
  .rui-face.talk { animation: rui-bob .32s ease-in-out infinite alternate; }
  .rui-name { position: absolute; left: 46px; top: -15px; padding: 3px 13px 4px; border-radius: 999px; background: var(--c, #E25B45); color: #fff; font-weight: 700; font-size: 15px; letter-spacing: .02em;
    border: 2.5px solid var(--ink); transform: rotate(-3deg); white-space: nowrap; }
  .rui-text { margin: 8px 0 0; font-size: 19px; line-height: 1.38; font-weight: 500; min-height: 1.38em; }
  .rui-text .ghost { visibility: hidden; }
  .rui-next { position: absolute; right: 14px; bottom: -14px; width: 28px; height: 28px; border-radius: 50%; background: var(--gold); border: 2.5px solid var(--ink); display: grid; place-items: center; opacity: 0; transition: opacity .2s; }
  .rui-next::before { content: ''; border: 6px solid transparent; border-top: 8px solid var(--ink); border-bottom: 0; transform: translateY(2px); }
  .rui-bubble.done .rui-next { opacity: 1; animation: rui-bob .5s ease-in-out infinite alternate; }
  .rui-tail { position: absolute; width: 26px; height: 22px; left: var(--tx, 40px); margin-left: -13px; }
  .rui-tail::before, .rui-tail::after { content: ''; position: absolute; left: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; }
  .rui-tail.down { top: 100%; } .rui-tail.down::before { top: 0; border-top: 22px solid var(--ink); } .rui-tail.down::after { top: -4px; left: 4px; border-width: 18px 9px 0; border-top: 18px solid var(--paper); border-left: 9px solid transparent; border-right: 9px solid transparent; }
  .rui-tail.up { bottom: 100%; } .rui-tail.up::before { bottom: 0; border-bottom: 22px solid var(--ink); } .rui-tail.up::after { bottom: -4px; left: 4px; border-bottom: 18px solid var(--paper); border-left: 9px solid transparent; border-right: 9px solid transparent; }
  .rui-bubble.docked .rui-tail { display: none; }
  .rui-say .rui-next { display: none; }
  .rui-say { min-width: 190px; max-width: min(70vw, 300px); padding: 9px 14px 10px 30px; border-radius: 18px; border-width: 2.5px; pointer-events: none; }
  .rui-say .rui-face { width: 40px; height: 40px; left: -18px; top: -16px; border-width: 2.5px; }
  .rui-say .rui-text { margin: 0; font-size: 15px; line-height: 1.3; }
  .rui-say .rui-tail { transform: scale(.75); transform-origin: 50% 0; }
  .rui-say.out { opacity: 0; transform: scale(.8) translateY(-8px); transition: opacity .35s, transform .35s; }
  /* mission card, done stamp */
  .rui-card { position: fixed; left: 50%; top: 42%; transform: translate(-50%, -50%) rotate(-3deg) scale(.4); opacity: 0; display: flex; align-items: center; gap: 16px; padding: 16px 28px 18px 18px;
    background: var(--paper); border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 7px 0 rgba(23,20,31,.3); transition: transform .45s cubic-bezier(.3,1.7,.5,1), opacity .2s; }
  .rui-card.on { transform: translate(-50%, -50%) rotate(-3deg); opacity: 1; }
  .rui-card.off { transform: translate(-50%, -160%) rotate(-3deg) scale(.5); opacity: 0; transition: transform .45s ease-in, opacity .45s; }
  .rui-card .disc { width: 70px; height: 70px; flex: none; border-radius: 50%; background: var(--c, #E25B45); color: #fff; padding: 14px; border: 3.5px solid var(--ink); }
  .rui-card small { display: block; font-size: 14px; font-weight: 700; letter-spacing: .14em; color: #9A7A3E; }
  .rui-card b { display: block; font-size: clamp(26px, 5.4vw, 44px); line-height: 1.05; font-weight: 700; white-space: nowrap; }
  .rui-stamp { position: fixed; left: 50%; top: 34%; padding: 10px 30px 12px; border: 5px solid #3E9461; border-radius: 18px; color: #3E9461; font-size: clamp(34px, 8vw, 58px); font-weight: 700;
    background: rgba(255,252,244,.92); transform: translate(-50%, -50%) rotate(-8deg) scale(2.4); opacity: 0; transition: transform .3s cubic-bezier(.5,1.6,.6,1), opacity .15s; letter-spacing: .03em; }
  .rui-stamp.on { transform: translate(-50%, -50%) rotate(-8deg); opacity: 1; }
  .rui-stamp small { display: block; font-size: 15px; letter-spacing: .12em; text-align: center; color: var(--ink); margin-top: -2px; }
  /* goal badge */
  .rui-goal { position: fixed; top: calc(10px + env(safe-area-inset-top, 0px)); left: max(12px, env(safe-area-inset-left, 0px)); display: flex; align-items: center; gap: 10px; max-width: min(64vw, 380px);
    padding: 6px 14px 6px 6px; background: var(--paper); border: 3px solid var(--ink); border-radius: 999px; box-shadow: 0 4px 0 rgba(23,20,31,.25); pointer-events: auto; cursor: pointer;
    transform: translateY(-140%); transition: transform .45s cubic-bezier(.3,1.5,.5,1); }
  .rui-goal.on { transform: none; } body.rui-cinema .rui-goal { transform: translateY(-140%); }
  .rui-goal .disc { width: 40px; height: 40px; flex: none; border-radius: 50%; background: var(--c, #E25B45); color: #fff; padding: 8px; border: 2.5px solid var(--ink); transition: transform .3s; }
  .rui-goal .disc.ok { background: #3E9461; transform: scale(1.15) rotate(-8deg); }
  .rui-goal .lbl { font-weight: 600; font-size: 16px; line-height: 1.15; }
  .rui-goal .lbl small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #9A7A3E; }
  .rui-goal .pips { display: flex; gap: 3px; margin-left: 2px; }
  .rui-goal .pips i { width: 22px; height: 22px; color: #C8C3D3; transition: color .2s, transform .3s cubic-bezier(.3,1.8,.5,1); }
  .rui-goal .pips i.on { color: var(--c, #E25B45); transform: scale(1.12); }
  .rui-goal.pop .lbl { animation: rui-pop .4s; }
  .rui-detail { position: fixed; top: calc(70px + env(safe-area-inset-top, 0px)); left: max(16px, env(safe-area-inset-left, 0px)); max-width: min(80vw, 360px); padding: 9px 14px; background: var(--paper);
    border: 2.5px solid var(--ink); border-radius: 14px; font-size: 15px; line-height: 1.35; opacity: 0; transform: translateY(-6px); transition: opacity .2s, transform .2s; }
  .rui-detail.on { opacity: 1; transform: none; }
  /* arrow towards an off-screen goal */
  .rui-arrow { position: fixed; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: var(--gold); border: 3px solid var(--ink); color: var(--ink); padding: 7px;
    box-shadow: 0 3px 0 rgba(23,20,31,.25); opacity: 0; transition: opacity .3s; }
  .rui-arrow.on { opacity: .95; }
  /* hint, boss, win */
  .rui-hint { position: fixed; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translate(-50%, 20px); max-width: min(90vw, 540px); display: flex; gap: 10px; align-items: center;
    padding: 8px 16px 9px 9px; background: var(--paper); border: 2.5px solid var(--ink); border-radius: 18px; box-shadow: 0 4px 0 rgba(23,20,31,.22); font-size: 15px; line-height: 1.32; opacity: 0; transition: opacity .3s, transform .3s; }
  .rui-hint.on { opacity: 1; transform: translate(-50%, 0); }
  .rui-hint .disc { width: 30px; height: 30px; flex: none; border-radius: 50%; background: var(--gold); padding: 5px; border: 2px solid var(--ink); }
  body.touch .rui-hint { bottom: calc(112px + env(safe-area-inset-bottom, 0px)); }
  body.rui-cinema .rui-hint { opacity: 0; }
  .rui-boss { position: fixed; left: 50%; top: calc(12px + env(safe-area-inset-top, 0px)); transform: translate(-50%, -150%); display: flex; align-items: center; gap: 10px; padding: 5px 16px 5px 5px;
    background: var(--paper); border: 3px solid var(--ink); border-radius: 999px; box-shadow: 0 4px 0 rgba(23,20,31,.25); transition: transform .4s cubic-bezier(.3,1.5,.5,1); }
  .rui-boss.on { transform: translate(-50%, 0); }
  .rui-boss .rui-face { position: static; width: 40px; height: 40px; border-width: 2.5px; box-shadow: none; }
  .rui-boss b { font-size: 15px; font-weight: 700; }
  .rui-boss .bar { width: min(34vw, 200px); height: 14px; border-radius: 999px; background: #E2DEEA; border: 2.5px solid var(--ink); overflow: hidden; }
  .rui-boss .bar i { display: block; height: 100%; background: linear-gradient(#F0708F, #D8386A); transform-origin: left; transition: transform .35s; }
  .rui-win { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(23,20,31,.35); opacity: 0; transition: opacity .4s; }
  .rui-win.on { opacity: 1; pointer-events: auto; }
  .rui-win .card { width: min(90vw, 440px); padding: 26px 24px 22px; text-align: center; background: var(--paper); border: 4px solid var(--ink); border-radius: 28px; box-shadow: 0 8px 0 rgba(23,20,31,.3);
    transform: scale(.6) rotate(-4deg); transition: transform .5s cubic-bezier(.3,1.7,.5,1); }
  .rui-win.on .card { transform: rotate(-1.5deg); }
  .rui-win small { font-size: 14px; font-weight: 700; letter-spacing: .14em; color: #3E9461; }
  .rui-win h2 { margin: 2px 0 14px; font-size: clamp(26px, 6vw, 36px); line-height: 1.1; }
  .rui-win .stats { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
  .rui-win .stats span { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #F3EBDA; font-size: 17px; font-weight: 600; }
  .rui-win .stats svg { width: 22px; height: 22px; }
  .rui-win button { font: inherit; font-size: 19px; font-weight: 700; padding: 11px 30px; border-radius: 999px; border: 3px solid var(--ink); background: var(--gold); color: var(--ink); cursor: pointer; box-shadow: 0 4px 0 rgba(23,20,31,.3); }
  .rui-confetti i { position: fixed; top: -20px; width: 10px; height: 14px; border-radius: 2px; animation: rui-fall linear forwards; }
  @keyframes rui-bob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
  @keyframes rui-pop { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
  @keyframes rui-fall { to { transform: translate(var(--dx), 110vh) rotate(var(--r)); } }
  @media (max-width: 600px) { .rui-text { font-size: 17px; } .rui-bubble { padding: 12px 16px; } .rui-face { width: 52px; height: 52px; left: -16px; top: -26px; } .rui-name { left: 40px; font-size: 14px; } }
  /* stickers and album */
  .rui-st { display: block; width: 100%; aspect-ratio: 1; border-radius: 50%; background: var(--c); border: 5px solid #fff; box-shadow: 0 0 0 3px var(--ink), 0 6px 0 rgba(23,20,31,.25); color: #fff; padding: 22%; position: relative; }
  .rui-st::after { content: ''; position: absolute; left: 18%; top: 12%; width: 30%; height: 16%; border-radius: 50%; background: rgba(255,255,255,.35); transform: rotate(-25deg); }
  .rui-reveal { position: fixed; left: 50%; top: 38%; width: min(22vw, 96px); transform: translate(-50%, -50%) scale(.2) rotate(-30deg); opacity: 0; text-align: center; transition: transform .5s cubic-bezier(.3,1.8,.5,1), opacity .2s; }
  .rui-reveal .rui-st { border-width: 3px; box-shadow: 0 0 0 2.5px var(--ink), 0 4px 0 rgba(23,20,31,.25); }
  .rui-reveal.on { transform: translate(-50%, -50%) rotate(-6deg); opacity: 1; }
  .rui-reveal.fly { transform: translate(calc(50vw - 120px), calc(-45vh + 60px)) scale(.15) rotate(20deg); opacity: 0; transition: transform .7s ease-in, opacity .7s ease-in; }
  .rui-reveal small { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; background: var(--gold); border: 2.5px solid var(--ink); font-weight: 700; font-size: 11px; white-space: nowrap; letter-spacing: .06em; }
  .rui-reveal b { display: block; margin-top: 6px; font-size: 15px; white-space: nowrap; font-weight: 700; color: #fff; text-shadow: 0 2px 0 var(--ink), 2px 0 0 var(--ink), -2px 0 0 var(--ink), 0 -2px 0 var(--ink), 0 4px 6px rgba(0,0,0,.4); }
  .rui-albumbtn { position: fixed; right: max(14px, env(safe-area-inset-right, 0px)); top: calc(56px + env(safe-area-inset-top, 0px)); display: flex; align-items: center; gap: 6px; padding: 4px 12px 4px 6px;
    background: var(--paper); border: 2.5px solid var(--ink); border-radius: 999px; box-shadow: 0 3px 0 rgba(23,20,31,.22); font-weight: 600; font-size: 15px; pointer-events: auto; cursor: pointer; font-family: inherit; color: var(--ink); }
  .rui-albumbtn svg { width: 24px; height: 24px; padding: 3px; border-radius: 50%; background: var(--gold); }
  .rui-albumbtn.pop { animation: rui-pop .5s 2; }
  body.rui-cinema .rui-albumbtn { opacity: 0; }
  .rui-album { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(23,20,31,.45); opacity: 0; pointer-events: none; transition: opacity .25s; }
  .rui-album.on { opacity: 1; pointer-events: auto; }
  .rui-album .book { position: relative; width: min(92vw, 620px); max-height: 88vh; overflow: auto; padding: 22px 22px 18px; background: #FFF6E2; border: 4px solid var(--ink); border-radius: 26px; box-shadow: 0 8px 0 rgba(23,20,31,.3);
    background-image: radial-gradient(rgba(58,56,80,.07) 1.5px, transparent 1.5px); background-size: 16px 16px; }
  .rui-album h2 { margin: 0 0 14px; font-size: 26px; } .rui-album h2 small { font-size: 16px; color: #9A7A3E; margin-left: 8px; }
  .rui-album .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 12px; }
  .rui-album .slot { text-align: center; font-size: 14px; font-weight: 600; line-height: 1.2; }
  .rui-album .slot .art { position: relative; width: 60%; margin: 0 auto 6px; } .rui-album .slot .art .rui-st { width: 100%; }
  .rui-album .slot .art .rui-md { position: absolute; right: -8%; bottom: -6%; width: 42%; }
  .rui-album .slot .best { display: block; margin-top: 1px; font-size: 12px; font-weight: 600; color: #9A7A3E; } .rui-album .slot .best.none { font-weight: 500; color: #A59C8E; }
  .rui-md { display: block; aspect-ratio: 1; border-radius: 50%; background: var(--c); border: 3px solid var(--ink); box-shadow: inset 0 0 0 3px rgba(255,255,255,.45), 0 3px 0 rgba(23,20,31,.25); padding: 12%; }
  .rui-reveal .rui-md { width: 100%; border-width: 4px; padding: 16%; }
  .rui-collect { position: fixed; right: max(14px, env(safe-area-inset-right, 0px)); top: calc(96px + env(safe-area-inset-top, 0px)); display: flex; align-items: center; gap: 6px; padding: 4px 12px 4px 6px;
    background: var(--paper); border: 2.5px solid var(--ink); border-radius: 999px; box-shadow: 0 3px 0 rgba(23,20,31,.22); font-weight: 600; font-size: 15px; opacity: 0; transform: translateX(20px); transition: opacity .3s, transform .3s; }
  .rui-collect.on { opacity: 1; transform: none; } .rui-collect svg { width: 24px; height: 24px; padding: 3px; border-radius: 50%; background: var(--gold); color: #8A6410; }
  .rui-collect.pop { animation: rui-pop .4s; } body.rui-cinema .rui-collect { opacity: 0; }
  .rui-album .slot.locked .hole { width: 60%; aspect-ratio: 1; margin: 0 auto 6px; border-radius: 50%; border: 3px dashed #B9B0A0; display: grid; place-items: center; font-size: 28px; font-weight: 700; color: #B9B0A0; }
  .rui-album .slot.locked span.h { font-weight: 500; font-size: 12px; color: #8C8375; }
  .rui-album .x { position: absolute; right: 12px; top: 12px; width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid var(--ink); background: var(--paper); padding: 7px; cursor: pointer; color: var(--ink); }
  @media (max-width: 520px) { .rui-album .grid { grid-template-columns: repeat(3, 1fr); } }
  /* race timer */
  .rui-race { position: fixed; left: 50%; top: calc(12px + env(safe-area-inset-top, 0px)); transform: translate(-50%, -160%); display: flex; align-items: center; gap: 10px; padding: 5px 16px 5px 6px;
    background: var(--paper); border: 3px solid var(--ink); border-radius: 999px; box-shadow: 0 4px 0 rgba(23,20,31,.25); font-weight: 700; font-size: 18px; opacity: 0; transition: transform .35s cubic-bezier(.3,1.5,.5,1), opacity .2s; font-variant-numeric: tabular-nums; }
  .rui-race.on { transform: translate(-50%, 0); opacity: 1; }
  .rui-race .disc { width: 34px; height: 34px; border-radius: 50%; background: #E25B45; color: #fff; padding: 6px; border: 2.5px solid var(--ink); }
  .rui-race small { font-size: 13px; font-weight: 600; color: #9A7A3E; }
  .rui-race.hurry { color: #D8386A; }
  @media (max-width: 900px) { .rui-race { top: calc(62px + env(safe-area-inset-top, 0px)); font-size: 16px; padding: 3px 12px 3px 4px; } .rui-race .disc { width: 28px; height: 28px; padding: 5px; } .rui-race small { font-size: 11px; } }
  .rui-album { z-index: 3; }
  @media (max-height: 460px) { .rui-album .book { padding: 12px 16px 10px; width: min(94vw, 640px); } .rui-album h2 { font-size: 18px; margin-bottom: 6px; } .rui-album .grid { gap: 6px 4px; grid-template-columns: repeat(6, 1fr); }
    .rui-album .slot .art, .rui-album .slot.locked .hole { width: 46%; margin-bottom: 3px; } .rui-album .slot.locked .hole { font-size: 18px; border-width: 2px; } .rui-album .slot .rui-st { border-width: 2.5px; box-shadow: 0 0 0 2px var(--ink); } .rui-album .slot .best { font-size: 10px; }
    .rui-album .slot .art .rui-md { border-width: 2px; box-shadow: none; }
    .rui-collect { top: calc(88px + env(safe-area-inset-top, 0px)); font-size: 13px; padding: 3px 10px 3px 5px; } .rui-collect svg { width: 20px; height: 20px; } .rui-album .slot { font-size: 11px; } .rui-album .slot.locked span.h { font-size: 9.5px; } .rui-album .x { width: 32px; height: 32px; padding: 5px; } }
  @media (max-height: 460px) { .rui-goal { padding: 4px 12px 4px 4px; gap: 8px; } .rui-goal .disc { width: 32px; height: 32px; padding: 6px; } .rui-goal .lbl { font-size: 14px; } .rui-goal .lbl small { font-size: 9.5px; }
    .rui-goal .pips i { width: 18px; height: 18px; } .rui-card { padding: 12px 22px 14px 14px; } .rui-card .disc { width: 54px; height: 54px; padding: 11px; } .rui-text { font-size: 16px; } .rui-detail { top: 58px; } }
  @media (prefers-reduced-motion: reduce) { .rui * { animation: none !important; transition-duration: .01s !important; } }`;

  // ---------- Stickers for the album: the five missions, the side missions, and two for finding everything ----------
  const STICKERS = [
    { id: 'm1', title: 'Ausguck', icon: 'look', color: '#A86B3C', hint: 'Auftrag 1' },
    { id: 'm2', title: 'Der letzte Zug', icon: 'train', color: '#4686D2', hint: 'Auftrag 2' },
    { id: 'm3', title: 'Licht an', icon: 'lamp', color: '#3E9461', hint: 'Auftrag 3' },
    { id: 'm4', title: 'Die Kissenburg', icon: 'lights', color: '#9474CE', hint: 'Auftrag 4' },
    { id: 'm5', title: 'Schlürfi gezähmt', icon: 'robot', color: '#D8386A', hint: 'Auftrag 5' },
    { id: 'ball', title: 'Toooor!', icon: 'ball', color: '#52AE75', hint: 'Jemand mit Stirnband sucht einen Torschützen.' },
    { id: 'bricks', title: 'Baumeister', icon: 'brick', color: '#EE8A38', hint: 'Ein Baumeister mit gelbem Helm braucht Hilfe.' },
    { id: 'race', title: 'Rennprofi', icon: 'race', color: '#E25B45', hint: 'Am Spielteppich wartet eine Rennfahrerin.' },
    { id: 'pins', title: 'Gut Holz!', icon: 'pin', color: '#4686D2', hint: 'Mitten in der Eisenbahnrunde steht eine Kegelbahn.' },
    { id: 'balloons', title: 'Ballonjagd', icon: 'balloon', color: '#EE8A38', hint: 'Vor dem Bett verkauft jemand Luftballons.' },
    { id: 'piano', title: 'Musiktalent', icon: 'note', color: '#9474CE', hint: 'Hinter dem Spielteppich liegt ein Bodenklavier.' },
    { id: 'dust', title: 'Staubmausjagd', icon: 'dust', color: '#8E88A0', hint: 'Unter dem Bett flitzt etwas herum.' },
    { id: 'domino', title: 'Kettenreaktion', icon: 'domino', color: '#3FA7A0', hint: 'Am Fenster steht eine lange Reihe Dominosteine.' },
    { id: 'buttons', title: 'Knopfsammler', icon: 'button', color: '#E0A92A', hint: 'Sammle 20 goldene Knöpfe.' },
    { id: 'buttonsAll', title: 'Alle Knöpfe', icon: 'button', color: '#B5542B', hint: 'Sammle alle 40 goldenen Knöpfe.' },
    { id: 'secrets', title: 'Geheimnisjäger', icon: 'find', color: '#3A3850', hint: 'Finde alle neun Geheimnisse.' },
  ];
  // The small games keep a best result with a medal (1 bronze, 2 silver, 3 gold): how the result reads
  const secs = (v) => v.toFixed(1).replace('.', ',') + ' s';
  const RECORDS = {
    ball: (v) => v + (v === 1 ? ' Tor' : ' Tore'), race: secs, balloons: secs, pins: (v) => v + ' Kegel', piano: (v) => (v === 1 ? '1 Runde' : v + ' Runden'),
  };
  const MEDALS = [null, { name: 'Bronze', color: '#C98A4B' }, { name: 'Silber', color: '#AEB6C4' }, { name: 'Gold', color: '#F0B92A' }];
  const stickerArt = (st) => `<span class="rui-st" style="--c:${st.color}">${ICONS[st.icon] || ''}</span>`;

  function el(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MISSION_COLORS = { look: '#A86B3C', train: '#4686D2', lamp: '#3E9461', lights: '#9474CE', robot: '#D8386A' };

  function makeStoryUI(opts) {
    const o = opts || {}, tone = o.tone || (() => {});
    if (!document.querySelector('link[data-rui]')) { const l = el('link'); l.rel = 'stylesheet'; l.href = FONT_URL; l.dataset.rui = '1'; document.head.appendChild(l); }
    el('style', null, CSS, document.head);
    const root = el('div', 'rui', null, document.body);
    el('div', 'rui-bars', '<i></i><i></i>', root);
    const goalEl = el('div', 'rui-goal', '<span class="disc"></span><span class="lbl"></span><span class="pips"></span>', root);
    const detailEl = el('div', 'rui-detail', null, root);
    const arrowEl = el('div', 'rui-arrow', ICONS.arrow, root);
    const card = el('div', 'rui-card', '<span class="disc"></span><span><small></small><b></b></span>', root);
    const stamp = el('div', 'rui-stamp', 'Geschafft!<small></small>', root);
    const hintEl = el('div', 'rui-hint', `<span class="disc">${ICONS.bulb}</span><span class="t"></span>`, root);
    const bossEl = el('div', 'rui-boss', `<span class="rui-face">${FACES.robot}</span><b></b><span class="bar"><i></i></span>`, root);
    const winEl = el('div', 'rui-win', '<div class="card"><small>GESCHAFFT</small><h2>Das Kinderzimmer ist gerettet!</h2><div class="stats"></div><button type="button">Nochmal spielen</button></div>', root);
    const confetti = el('div', 'rui-confetti', null, root);
    const reveal = el('div', 'rui-reveal', null, root);
    const albumBtn = el('button', 'rui-albumbtn', ICONS.album + '<span></span>', root); albumBtn.type = 'button';
    const albumEl = el('div', 'rui-album', '<div class="book"><button type="button" class="x" aria-label="Schließen">' + ICONS.close + '</button><h2>Sticker-Album<small></small></h2><div class="grid"></div></div>', root);
    const collectEl = el('div', 'rui-collect', ICONS.button + '<span></span>', root);
    const raceEl = el('div', 'rui-race', `<span class="disc">${ICONS.clock}</span><span class="t"></span><small></small>`, root);

    // ---------- Speech bubbles (a scene line, or a short call-out) ----------
    function makeBubble(cls) {
      const b = el('div', 'rui-bubble ' + (cls || ''), '<span class="rui-face"></span><span class="rui-name"></span><p class="rui-text"></p><span class="rui-next"></span><span class="rui-tail down"></span>', root);
      return { el: b, face: b.querySelector('.rui-face'), name: b.querySelector('.rui-name'), text: b.querySelector('.rui-text'), tail: b.querySelector('.rui-tail'), x: 0, y: 0, placed: false };
    }
    function fill(b, line) {
      const v = VOICES[line.face] || { color: '#E25B45' };
      b.face.innerHTML = FACES[line.face] || ''; b.face.style.display = FACES[line.face] ? '' : 'none';
      b.name.textContent = line.who || ''; b.name.style.setProperty('--c', v.color); b.name.style.display = line.who ? '' : 'none';
      b.full = line.text || ''; b.shown = 0; b.voice = v; b.line = line; b.babble = 0;
      b.text.innerHTML = '<span class="seen"></span><span class="ghost"></span>';
      b.seen = b.text.firstChild; b.ghost = b.text.lastChild; b.ghost.textContent = b.full;   // the ghost keeps the size, so the bubble does not grow while typing
      b.el.classList.remove('done', 'out'); b.placed = false;
    }
    function type(b, dt, cps, loud) {
      if (b.shown >= b.full.length) return false;
      const before = Math.floor(b.shown);
      b.shown = Math.min(b.full.length, b.shown + dt * cps);
      const now = Math.floor(b.shown);
      if (now === before) return true;
      b.seen.textContent = b.full.slice(0, now); b.ghost.textContent = b.full.slice(now);
      for (let i = before; i < now; i++) {
        if (/[A-Za-zÄÖÜäöüß]/.test(b.full[i]) && (b.babble++ % 2 === 0)) tone(b.voice.pitch * (0.85 + Math.random() * 0.35), 0.055, b.voice.wave || 'sine', loud);
      }
      if (b.shown >= b.full.length) b.el.classList.add('done');
      return true;
    }
    // A call-out sits above its speaker's head with the tail pointing down at it. A scene line sits low above the
    // cinema bar, moved sideways towards the speaker, its tail pointing up at him; so it never hides his face.
    function place(b, room, docked) {
      const W = window.innerWidth, H = window.innerHeight, bar = root.classList.contains('cinema') ? Math.min(84, Math.max(30, H * 0.09)) : 0;
      const bw = b.el.offsetWidth, bh = b.el.offsetHeight, at = b.line && (b.line.follow ? b.line.follow() : b.line.at);
      const pr = !docked && at && room ? room.project(at) : null;
      let x, y, tail = 'none', tx = 0;
      if (pr && pr.inside && b.low) {
        x = clamp(pr.x - bw * 0.6, 14, W - bw - 14); y = H - bar - bh - 22;
        if (pr.y < y - 40) { tail = 'up'; tx = pr.x - x; if (tx < TAIL_MIN || tx > bw - 26) tail = 'none'; }
      } else if (pr && pr.inside) {
        x = clamp(pr.x - bw * 0.3, 14, W - bw - 14);
        y = pr.y - bh - 30;
        tail = 'down';
        if (y < bar + 34) { y = Math.min(pr.y + 34, H - bar - bh - 12); tail = 'up'; }
        y = clamp(y, bar + 34, H - bar - bh - 16);
        tx = clamp(pr.x - x, 26, bw - 26);
      } else if (!b.low) {                       // a call-out from someone out of the picture: like a radio call under the badge
        const i = Math.max(0, says.indexOf(b)), top = goalEl.classList.contains('on') ? RADIO_TOP : 22;
        x = 36; y = top + says.slice(0, i).reduce((h, o) => h + o.el.offsetHeight + 22, 0);
      } else { x = (W - bw) / 2; y = H - bar - bh - 26; }
      if (!b.placed) { b.x = x; b.y = y; b.placed = true; } else { b.x += (x - b.x) * FOLLOW; b.y += (y - b.y) * FOLLOW; }
      b.el.style.left = b.x.toFixed(1) + 'px'; b.el.style.top = b.y.toFixed(1) + 'px';
      b.el.classList.toggle('docked', tail === 'none');
      b.tail.className = 'rui-tail ' + (tail === 'up' ? 'up' : 'down'); b.tail.style.setProperty('--tx', tx + 'px');
      b.el.style.setProperty('--ox', tail === 'none' ? '50%' : tx + 'px');
    }

    const talk = makeBubble('rui-talk'); talk.low = true;
    talk.el.addEventListener('click', () => { if (o.onTap) o.onTap(); });
    let talkLine = null, cardUntil = 0, pendingLine = null;
    function setCinema(on) { root.classList.toggle('cinema', on); document.body.classList.toggle('rui-cinema', on); }
    function showTalk(line) {
      talkLine = line;
      if (!line) { talk.el.classList.remove('on'); talk.face.classList.remove('talk'); setCinema(false); pendingLine = null; return; }
      setCinema(true);
      if (performance.now() < cardUntil) { pendingLine = line; return; }   // the mission card goes first
      fill(talk, line); talk.el.classList.add('on'); talk.face.classList.add('talk');
      talk.el.querySelector('.rui-next').style.display = '';
    }
    // a tap in a scene: first it shows the whole line, then the host may go on (returns true if the tap was used here)
    function tap() {
      if (performance.now() < cardUntil) { cardUntil = 0; hideCard(); return true; }
      if (talkLine && talk.shown < talk.full.length) { talk.shown = talk.full.length; talk.seen.textContent = talk.full; talk.ghost.textContent = ''; talk.el.classList.add('done'); return true; }
      return false;
    }

    const says = [];
    function say(line) {
      if (!line || !line.text) return;
      says.filter((x) => x.line && x.line.who === line.who).forEach(drop);   // a figure speaks with one bubble: the new line replaces its old one
      while (says.length >= SAY_MAX) drop(says[0]);
      const b = makeBubble('rui-say'); fill(b, line);
      b.until = performance.now() + SAY_BASE + line.text.length * SAY_PER_CHAR;
      requestAnimationFrame(() => b.el.classList.add('on'));
      says.push(b);
    }
    function drop(b) { const i = says.indexOf(b); if (i >= 0) says.splice(i, 1); b.el.classList.add('out'); setTimeout(() => b.el.remove(), 400); }

    // ---------- Mission: start card, running step badge, done stamp ----------
    let lastMission = null, cardTimer = 0, stampTimer = 0, detailTimer = 0, applyTimer = 0;
    function hideCard() { card.classList.remove('on'); card.classList.add('off'); clearTimeout(cardTimer); if (pendingLine) { const l = pendingLine; pendingLine = null; cardUntil = 0; showTalk(l); } }
    function mission(m) {
      if (!m) { goalEl.classList.remove('on'); lastMission = null; return; }
      const color = MISSION_COLORS[m.icon] || '#E25B45';
      goalEl.style.setProperty('--c', color); card.style.setProperty('--c', color);
      if (m.phase === 'start') {
        card.querySelector('.disc').innerHTML = ICONS[m.icon] || '';
        card.querySelector('small').textContent = 'AUFTRAG ' + m.n + ' VON ' + m.of; card.querySelector('b').textContent = m.title;
        card.classList.remove('off'); void card.offsetWidth; card.classList.add('on');
        cardUntil = performance.now() + CARD_TIME; clearTimeout(cardTimer); cardTimer = setTimeout(hideCard, CARD_TIME);
        tone(392, 0.12, 'triangle', 0.12); tone(523, 0.18, 'triangle', 0.12, 0.1);
      }
      if (m.phase === 'done') {
        stamp.querySelector('small').textContent = m.title.toUpperCase();
        stamp.classList.add('on'); clearTimeout(stampTimer); stampTimer = setTimeout(() => stamp.classList.remove('on'), STAMP_TIME);
        clearTimeout(applyTimer); goalEl.querySelector('.disc').classList.add('ok'); goalEl.querySelector('.disc').innerHTML = ICONS.check;
        burst(26); lastMission = m; return;
      }
      const changed = !lastMission || lastMission.n !== m.n || lastMission.step !== m.step;
      const disc = goalEl.querySelector('.disc');
      const apply = () => {
        disc.classList.remove('ok'); disc.innerHTML = ICONS[m.countIcon] || ICONS[m.icon] || '';
        goalEl.querySelector('.lbl').innerHTML = `<small>AUFTRAG ${m.n} · ${m.title.toUpperCase()}</small>`;
        goalEl.querySelector('.lbl').appendChild(document.createTextNode(m.short || m.text));
        const pips = goalEl.querySelector('.pips');
        if (m.count) pips.innerHTML = Array.from({ length: m.count[1] }, (_, i) => `<i class="${i < m.count[0] ? 'on' : ''}">${ICONS[m.countIcon] || ICONS.star}</i>`).join('');
        else pips.innerHTML = '';
        detailEl.textContent = m.text;
        goalEl.classList.remove('pop'); void goalEl.offsetWidth; goalEl.classList.add('pop');
      };
      if (changed && lastMission && lastMission.n === m.n && m.phase !== 'start') {   // a step done: a tick first, then the next step
        disc.classList.add('ok'); disc.innerHTML = ICONS.check; tone(660, 0.08, 'sine', 0.1); tone(990, 0.12, 'sine', 0.1, 0.08);
        clearTimeout(applyTimer); applyTimer = setTimeout(apply, 650);
      } else apply();
      if (lastMission && lastMission.count && m.count && m.count[0] > lastMission.count[0]) tone(880, 0.09, 'sine', 0.1);
      goalEl.classList.add('on'); lastMission = m;
    }
    goalEl.addEventListener('click', () => { detailEl.classList.add('on'); clearTimeout(detailTimer); detailTimer = setTimeout(() => detailEl.classList.remove('on'), DETAIL_TIME); });

    // ---------- Hints, boss, win, confetti ----------
    let hintTimer = 0;
    function hint(html, ms) { hintEl.querySelector('.t').innerHTML = html; hintEl.classList.add('on'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hintEl.classList.remove('on'), ms || 5200); }
    function boss(b) {
      bossEl.classList.toggle('on', !!b); if (!b) return;
      bossEl.querySelector('b').textContent = b.name; bossEl.querySelector('.bar i').style.transform = 'scaleX(' + Math.max(0, b.hp / b.max) + ')';
    }
    const CONFETTI = ['#E25B45', '#F4BF3A', '#4686D2', '#52AE75', '#9474CE', '#EE8A38'];
    function burst(n) {
      for (let i = 0; i < n; i++) {
        const c = el('i', null, null, confetti);
        c.style.left = (Math.random() * 100) + 'vw'; c.style.background = CONFETTI[i % CONFETTI.length];
        c.style.setProperty('--dx', ((Math.random() - 0.5) * 30) + 'vw'); c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
        c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * 0.4) + 's';
        setTimeout(() => c.remove(), 3600);
      }
    }
    const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' + String(Math.floor(s)).padStart(2, '0') : s.toFixed(1).replace('.', ',') + ' s'); };
    function win(r, onAgain) {
      winEl.querySelector('.stats').innerHTML = `<span>${ICONS.clock}${fmt(r.time)}</span><span>${ICONS.star}${r.stars} von ${r.total}</span><span>${ICONS.secret}${r.secrets} von ${r.secretTotal}</span><span>${ICONS.album}${owned.filter((id) => STICKERS.some((st) => st.id === id)).length} von ${STICKERS.length}</span>`;
      winEl.classList.add('on'); goalEl.classList.remove('on'); burst(70);
      winEl.querySelector('button').onclick = () => { winEl.classList.remove('on'); if (onAgain) onAgain(); };
    }

    // ---------- Stickers, medals and the album ----------
    let owned = Array.isArray(o.stickers) ? o.stickers.slice() : [];
    // records come from storage: only entries of the right shape are shown
    const cleanRecs = (all) => { const out = {}; if (all && typeof all === 'object') for (const [id, r] of Object.entries(all)) if (r && Number.isFinite(r.v) && [0, 1, 2, 3].includes(r.m) && RECORDS[id]) out[id] = { v: r.v, m: r.m }; return out; };
    let recs = cleanRecs(o.records);
    const countLabel = () => { albumBtn.querySelector('span').textContent = owned.filter((id) => STICKERS.some((st) => st.id === id)).length + '/' + STICKERS.length; };
    // New stickers and new bests are shown one after the other in the middle of the screen, then fly to the album
    const shows = []; let showing = false;
    function showNext() {
      if (showing || !shows.length) return;
      const item = shows.shift(); showing = true;
      reveal.innerHTML = item.html; reveal.classList.remove('fly'); void reveal.offsetWidth; reveal.classList.add('on');
      try { item.sound(); burst(item.confetti); } catch (_) { /* a failed jingle must not hold up the queue */ }
      setTimeout(() => {
        reveal.classList.add('fly'); reveal.classList.remove('on'); albumBtn.classList.remove('pop'); void albumBtn.offsetWidth; albumBtn.classList.add('pop');
        setTimeout(() => { showing = false; showNext(); }, REVEAL_GAP);
      }, REVEAL_TIME);
    }
    function sticker(id, list) {
      if (list) owned = list.slice(); else if (!owned.includes(id)) owned = owned.concat(id);
      countLabel();
      const st = STICKERS.find((x) => x.id === id); if (!st) return;
      shows.push({ html: '<small>NEUER STICKER</small>' + stickerArt(st) + '<b>' + st.title + '</b>', confetti: 24,
        sound: () => { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 0.1); tone(784, 0.1, 'triangle', 0.12, 0.2); tone(1047, 0.25, 'triangle', 0.12, 0.3); } });
      // the last sticker fills the album
      if (STICKERS.every((x) => owned.includes(x.id))) shows.push({ html: '<small>ALBUM VOLL</small>' + medalArt(3) + '<b>Alle ' + STICKERS.length + ' Sticker!</b>', confetti: 90,
        sound: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.11)); } });
      showNext();
    }
    function medalArt(m) { return `<span class="rui-md" style="--c:${MEDALS[m].color}">${ICONS.medal}</span>`; }
    const bestText = (id) => { const r = recs[id]; return r && RECORDS[id] ? (MEDALS[r.m] ? MEDALS[r.m].name + ' · ' : '') + RECORDS[id](r.v) : ''; };
    // a new best in one of the small games: { id, medal (1 to 3), value }
    function medal(info) {
      if (!info || !MEDALS[info.medal] || !RECORDS[info.id]) return;
      recs = Object.assign({}, recs, { [info.id]: { v: info.value, m: info.medal } });
      shows.push({ html: '<small>NEUE BESTLEISTUNG</small>' + medalArt(info.medal) + '<b>' + MEDALS[info.medal].name + ' · ' + RECORDS[info.id](info.value) + '</b>', confetti: info.medal * 10,
        sound: () => { tone(659, 0.09, 'triangle', 0.12); tone(988, 0.2, 'triangle', 0.12, 0.09); } });
      showNext();
    }
    function openAlbum(on) {
      if (on) {
        countLabel(); albumEl.querySelector('h2 small').textContent = albumBtn.querySelector('span').textContent;
        albumEl.querySelector('.grid').innerHTML = STICKERS.map((st) => {
          if (!owned.includes(st.id)) return `<div class="slot locked"><div class="hole">?</div><span class="h">${st.hint}</span></div>`;
          const r = recs[st.id], best = bestText(st.id);
          return `<div class="slot"><div class="art">${stickerArt(st)}${best && MEDALS[r.m] ? medalArt(r.m) : ''}</div>${st.title}${best ? `<span class="best">${best}</span>` : RECORDS[st.id] ? '<span class="best none">Noch kein Rekord</span>' : ''}</div>`;
        }).join('');
      }
      albumEl.classList.toggle('on', !!on);
      if (o.onAlbum) o.onAlbum(!!on);
    }
    albumBtn.addEventListener('click', () => openAlbum(true));
    albumEl.addEventListener('click', (e) => { if (e.target === albumEl || e.target.closest('.x')) openAlbum(false); });
    countLabel();

    // ---------- The clock of a timed side game: { big, small, hurry }, or null ----------
    let raceKey = '';
    function race(info) {
      raceEl.classList.toggle('on', !!info); if (!info) { raceKey = ''; return; }
      const key = info.big + '|' + info.small + '|' + !!info.hurry; if (key === raceKey) return;
      raceKey = key;
      raceEl.querySelector('.t').textContent = info.big; raceEl.querySelector('small').textContent = info.small || '';
      raceEl.classList.toggle('hurry', !!info.hurry);
    }
    // ---------- A counter of things found all over the room: { id, n, of } ----------
    function collect(info) {
      const show = !!info && info.n > 0;
      collectEl.classList.toggle('on', show); if (!show) return;
      const text = info.n + '/' + info.of, span = collectEl.querySelector('span');
      if (span.textContent !== text) { span.textContent = text; collectEl.classList.remove('pop'); void collectEl.offsetWidth; collectEl.classList.add('pop'); }
    }

    // ---------- Every animation frame ----------
    let lastT = performance.now();
    function frame(room) {
      const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (talkLine && talk.el.classList.contains('on')) {
        type(talk, dt, TYPE_CPS, 0.07); place(talk, room, false);
        talk.face.classList.toggle('talk', talk.shown < talk.full.length);
      }
      for (const b of says.slice()) { type(b, dt, SAY_CPS, 0.04); place(b, room, false); if (now > b.until) drop(b); }
      // goal arrow at the screen's edge when the goal is out of the picture
      const g = room && !talkLine && !raceEl.classList.contains('on') && room.goal ? room.goal() : null;
      let showArrow = false;
      if (g) {
        const pr = room.project(g);
        if (!pr.inside) {
          // the arrow runs along a frame inside the screen that keeps clear of the badges at the top
          const W = window.innerWidth, H = window.innerHeight, x0 = EDGE, x1 = W - EDGE, y0 = EDGE_TOP, y1 = H - EDGE;
          const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
          let dx = pr.x - cx, dy = pr.y - cy; if (!pr.front) { dx = -dx; dy = -dy; }
          if (Math.abs(dy) < 1e-3 && Math.abs(dx) < 1e-3) dy = 1;
          const k = Math.min((x1 - cx) / Math.abs(dx || 1e-6), (y1 - cy) / Math.abs(dy || 1e-6));
          arrowEl.style.transform = `translate(${(cx + dx * k).toFixed(1)}px, ${(cy + dy * k).toFixed(1)}px) rotate(${Math.atan2(dy, dx)}rad)`;
          showArrow = true;
        }
      }
      arrowEl.classList.toggle('on', showArrow);
    }

    return { talk: showTalk, say, mission, hint, boss, win, tap, frame, burst, sticker, medal, collect, records: (all) => { recs = cleanRecs(all); }, album: openAlbum, race, talking: () => !!talkLine, hideWin: () => winEl.classList.remove('on') };
  }

  Room3D.makeStoryUI = makeStoryUI;
  Room3D.UI_FACES = FACES;
  Room3D.UI_ICONS = ICONS;
  Room3D.UI_STICKERS = STICKERS;
})();
