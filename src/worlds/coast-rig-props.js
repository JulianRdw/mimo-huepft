// World 4 extra hand props for the family rigs (loaded right after coast-rig-data.js, before the pictures load):
//   reporter  banana and shell: after the microphone is stolen (level 31) she goes on reporting into a banana, later a shell
//   kid       the small spade he carries in the opening scene
// A scene swaps what a hand holds with MimoCoast.cast.propAs(e, 'mic', 'banana') (null = the hand is empty); the gesture
// itself (the reporter's 'mic') stays the same. Same box and orientation as the microphone: the hand at 0,0, the tip up.
(function () {
  'use strict';
  const R = window.MimoCoast && window.MimoCoast.FAMILY_RIGS;
  if (!R) return;
  const svg = (body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24" width="24" height="24">' + body + '</svg>';
  const add = (who, name, body) => { if (R[who]) R[who].props = Object.assign({}, R[who].props, { [name]: { box: [-12, -12, 24, 24], svg: svg(body) } }); };

  // a ripe banana, the stalk in the fist, the curve towards the mouth
  add('reporter', 'banana',
    '<g transform="rotate(10 0 0)"><path d="M-0.6 3.2 C-2.6 0.4 -2.6 -4.6 0.4 -8.2 C1.2 -8.9 2.1 -8.6 1.7 -7.7 C-0.4 -4.2 -0.2 0.2 1.6 3.0 Z" fill="#FFD84A" stroke="#B88A1E" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M0.2 -6.6 C-1.0 -3.6 -0.9 -0.4 0.6 2.2" fill="none" stroke="#F2B630" stroke-width="0.45" stroke-linecap="round"/>'
    + '<path d="M-0.7 3.0 L1.5 2.9 L1.2 4.3 L-0.5 4.4 Z" fill="#8A6A2A"/><circle cx="1.2" cy="-8.1" r="0.55" fill="#5A4420"/></g>');
  // a pink scallop shell held like a microphone
  add('reporter', 'shell',
    '<g transform="rotate(8 0 0)"><path d="M0 3.4 L-0.9 0.6 L0.9 0.6 Z" fill="#E59AA8" stroke="#B5687A" stroke-width="0.4"/>'
    + '<path d="M0 0.8 C-4.6 0.2 -5.0 -5.4 -2.2 -7.4 C-0.8 -8.2 0.8 -8.2 2.2 -7.4 C5.0 -5.4 4.6 0.2 0 0.8 Z" fill="#FFC7D2" stroke="#C97186" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M0 0.4 L0 -7.6 M0 0.4 L-2.2 -7.0 M0 0.4 L2.2 -7.0 M0 0.4 L-3.8 -4.8 M0 0.4 L3.8 -4.8" fill="none" stroke="#E293A5" stroke-width="0.45" stroke-linecap="round"/></g>');
  // a blue flip-flop held up by the heel like a microphone (level 38: "Hier spricht die Latsche.")
  add('reporter', 'flipflop',
    '<g transform="rotate(-6 0 0)"><path d="M0 4.2 C-3.2 4.2 -3.6 -1.0 -3.2 -4.6 C-2.8 -8.0 -1.4 -9.4 0.2 -9.4 C1.8 -9.4 3.0 -8.0 3.2 -4.6 C3.4 -1.0 3.0 4.2 0 4.2 Z" fill="#9ED3EE" stroke="#5E8FB0" stroke-width="0.5"/>'
    + '<path d="M0 -6.2 L-2.6 -2.2 M0 -6.2 L2.6 -2.2" stroke="#F6A9BF" stroke-width="1.1" stroke-linecap="round"/><circle cx="0" cy="-6.2" r="0.8" fill="#F6A9BF"/></g>');
  // the professor's magnifying glass, held by the handle, the lens up (the hand-over at the door: is the pen genuine?)
  add('professor', 'lens',
    '<g><path d="M0 4.2 L0 -1.6" stroke="#8A6A4A" stroke-width="1.5" stroke-linecap="round"/>'
    + '<circle cx="0" cy="-6.4" r="4.6" fill="#DDF1F6" fill-opacity="0.75" stroke="#4A4F6E" stroke-width="1.1"/>'
    + '<path d="M-2.2 -8.2 Q-1.2 -9.6 0.6 -9.8" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-linecap="round"/></g>');
  // the side parting's scarf is the found one of level 35 (red and white like its icon), so it is the one he waves from then on
  if (R.sidepart && R.sidepart.colors) R.sidepart.colors = { ...R.sidepart.colors, scarf: ['#F28C82', '#FFFFFF'] };
  // a small red spade (the kid's), held by the handle
  add('kid', 'spade',
    '<g><path d="M0 3.4 L0 -5.2" stroke="#B98B61" stroke-width="0.9" stroke-linecap="round"/><path d="M-1.2 3.4 L1.2 3.4" stroke="#B98B61" stroke-width="0.9" stroke-linecap="round"/>'
    + '<path d="M-2.4 -4.6 C-2.8 -7.6 -1.2 -9.4 0 -9.6 C1.2 -9.4 2.8 -7.6 2.4 -4.6 Z" fill="#F28C82" stroke="#B5584F" stroke-width="0.5" stroke-linejoin="round"/></g>');
})();
