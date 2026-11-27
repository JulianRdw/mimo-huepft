// World 5 "Gipfelsturm": the world song. The 13 levels live in volcano-levels-a.js (43 to 46), volcano-levels-b.js (47 to 51)
// and volcano-levels-c.js (52 to 55), loaded in that order before this file (drafts in tools/levels/draft5/, routes in tools/levels/routes/world5/).
// Map characters and level fields of this world: tools/levels/world5-kit.md.
(function () {
  'use strict';
  // chords as [bass, ...pad] (MIDI numbers): E minor with a Phrygian F, warm and a little exotic; the drums drive
  const Em = [40, 55, 59, 64], F = [41, 57, 60, 65], Dm = [38, 57, 62, 65], E = [40, 56, 59, 64], Am = [45, 57, 60, 64], G = [43, 55, 59, 62], C = [36, 55, 60, 64];

  window.MimoWorlds.register({
    world: 5,
    songs: {
      volcano: { bpm: 108, beats: 4, swing: 0.08, lead: 'kalimba', counter: 'clar', arp: 'pluck', pad: 'warm', bass: 'pulse', density: 0.6, mod: 2,
        scale: [64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
        kits: { a: { timp: 'x.....x.', wood: '..x...x.', sh: '.x.x.x.x' }, b: { kick: 'x..x..x.', snare: '....x...', sh: 'xxxxxxxx', timp: 'x.......' } },
        form: ['A', 'A', 'B', 'A', 'C'],
        sec: { A: { ch: [Em, F, Dm, E], cpb: 2, bars: 8, mel: 'fixed', kit: 'a', counter: 0.25 },
          B: { ch: [Am, F, G, E], cpb: 2, bars: 8, mel: 'gen', lead: 'clar', kit: 'b', arp: 0.5, counter: 0.2 },
          C: { ch: [C, G, F, E], cpb: 2, bars: 8, mel: 'gen', dens: 0.3, arp: 1 } } },
    },
  });
})();
