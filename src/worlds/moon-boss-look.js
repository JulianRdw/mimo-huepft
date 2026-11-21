// World 6 boss "Mondwurm Käsebert": the fight song, the reward costume and the ending card of the whole game.
// Song "bossMoon": D lydian like the moon song, but driving: a glockenspiel lead over pulsing bass and a heartbeat of
// kick and claps; phase 2 adds the harp arpeggios, phase 3 the shakers and a little more tempo (the core's layers).
(function () {
  'use strict';
  let api = null;
  const K = () => window.MimoKaese;

  const D = [38, 57, 62, 66], E = [40, 56, 59, 64], Bm = [35, 54, 59, 62], G = [43, 55, 59, 62], A = [45, 57, 61, 64], Fsm = [42, 57, 61, 64], Em = [40, 55, 59, 64];
  const songs = {
    bossMoon: { bpm: 126, beats: 4, boss: true, live: true, lead: 'glock', counter: 'flute', arp: 'harp', pad: 'soft', bass: 'pulse', density: 0.62,
      scale: [74, 76, 78, 80, 81, 83, 85, 86, 88, 90],
      kits: { a: { kick: 'x...x...', tri: '......x.' }, b: { kick: 'x..x..x.', snare: '....x...', clap: '....x..x', sh: '..x...x.' } },
      form: ['A', 'B', 'A', 'C'],
      sec: { A: { ch: [D, E, D, E], cpb: 1, bars: 8, mel: 'fixed', kit: 'a' },
        B: { ch: [Bm, G, D, A], cpb: 2, bars: 8, mel: 'gen', kit: 'b', counter: 0.5 },
        C: { ch: [G, A, Fsm, Em], cpb: 2, bars: 8, mel: 'gen', kit: 'b', dens: 0.5, arp: 1 } } },
  };

  // ---------- wardrobe: the glass helmet Käsebert had swallowed ----------
  const costumes = [{ id: 'h_glass', kind: 'hat', name: 'Glashelm', price: 0, boss: 6,
    // Mimo is never tinted by the clock, so his helmet is not either
    draw(ctx, o) { ctx.translate(0, o.top + 11); ctx.rotate(o.tilt * 0.3); K().drawGlassHelm(ctx, api.dark ? K().DARK : K().LIGHT, 0); } }];

  // ---------- the ending card of the game: after the last boss, Mimo flies home ----------
  const ending = { title: 'Mimo fliegt nach Hause',
    text: 'Vom Berg ans Meer, über den Vulkan bis auf den Mond und wieder heim. Danke fürs Spielen! Die Level bleiben offen, falls du noch Sterne, Medaillen oder Kostüme holen möchtest.' };

  window.MimoWorlds.register({ world: 6, songs, costumes, ending, setup(a) { api = a; } });
})();
