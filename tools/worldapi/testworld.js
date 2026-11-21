// A tiny world that exists only for tools/worldapi-test.mjs. It never ships: the test serves it next to the game.
// __WORLD__ and __FIRST__ are filled in by the test (world 9, clear of the worlds being built, and the next level index).
// It uses every kind of hook once: an own solid tile (Q), a decor tile that marks a region (z), an object made from a
// map character (K, a raft that carries Mimo), a physics change inside the region (low gravity), a song, a palette,
// a piep reaction, a boss with a wardrobe reward.
(function () {
  'use strict';
  const WORLD = __WORLD__;
  let api = null, pieps = 0;
  // the raft goes from column 10 to 16 and back in 6 seconds, starting on the left
  const RAFT_SPAN = 6, RAFT_PERIOD = 6;
  const raftX = (b) => { const ph = (api.time % RAFT_PERIOD) / RAFT_PERIOD, tri = ph < 0.5 ? ph * 2 : 2 - ph * 2; return b.x0 + RAFT_SPAN * api.T * tri; };

  window.MimoWorlds.register({
    world: WORLD,
    name: 'Testwelt',
    firstLevel: __FIRST__,
    song: 'testsong',
    lines: ['Hier wird nur getestet.'],
    palette: {
      light: { skyTop: '#CFE9F3', skyBot: '#FFF6E5', ground: '#E8D7B0', groundEdge: '#F6EAD0', groundDot: '#D9C28F' },
      dark: { skyTop: '#1E3D4C', skyBot: '#2F3A46', ground: '#6B5D45', groundEdge: '#8C7B5C', groundDot: '#5A4D38' },
    },
    levels: [{
      name: 'Testlauf', medals: [9, 14, 20],
      hint: 'Ein Testlevel.',
      map: [
        '                                        ',
        '                                        ',
        '                          zzzz          ',
        '                          zzzz          ',
        '                          zzzz          ',
        '                          zzzz   *   D  ',
        '                          zzzz QQQQQQQQQ',
        '                          zzzz          ',
        '                          zzzz          ',
        '                          zzzz          ',
        '                          zzzz          ',
        '  P                       zzzz          ',
        '##########K       ######################',
        '##########        ######################',
      ],
    }],
    tiles: {
      Q: { solid: true, lint: { name: 'Testblock', color: '#C9A0DC' }, draw(tx, ty, x, y, ctx) { ctx.fillStyle = api.P.toggleA; api.rr(x + 1, y + 1, api.T - 2, api.T - 2, 6); ctx.fill(); } },
      z: { solid: false, lint: { name: 'Leichtzone', color: 'rgba(120,200,255,.25)' }, draw(tx, ty, x, y, ctx) { ctx.fillStyle = api.P.dust; ctx.globalAlpha = 0.25; ctx.fillRect(x, y, api.T, api.T); ctx.globalAlpha = 1; } },
    },
    spawns: {
      K: { lint: { name: 'Floß' }, spawn(L, x, y) { L.bodies.push({ raft: true, x0: x * api.T, x: x * api.T, y: y * api.T, w: 2 * api.T }); } },
    },
    setup(a) { api = a; },
    init(L, info) { if (info.reason === 'load') pieps = 0; },
    update() { for (const b of api.L.bodies) if (b.raft) b.x = raftX(b); },
    physics(p) {
      const tx = Math.floor((p.x + p.w / 2) / api.T), ty = Math.floor((p.y + p.h / 2) / api.T);
      return api.tileAt(tx, ty) === api.tileId(WORLD, 'z') ? { gravity: 500, maxFall: 150 } : null;
    },
    draw(layer, ctx) {
      if (layer !== 'mid') return;
      for (const b of api.L.bodies) { ctx.fillStyle = api.P.oneway; api.rr(b.x, b.y, b.w, 12, 6); ctx.fill(); }
    },
    piep() { pieps++; return 0; },
    songs: {
      testsong: { bpm: 90, beats: 4, lead: 'bell', pad: 'soft', bass: 'soft', density: 0.5, scale: [69, 71, 74, 76, 78, 81], kits: {}, form: ['A'],
        sec: { A: { ch: [[50, 62, 66, 69], [43, 55, 59, 62]], cpb: 2, bars: 4, mel: 'fixed' } } },
    },
    costumes: [{ id: 'h_testhut', kind: 'hat', name: 'Testhut', boss: WORLD, draw(ctx, o) { ctx.translate(0, o.top + 2); ctx.fillStyle = api.P.mush; api.rr(-8, -8, 16, 8, 3); ctx.fill(); } }],
    boss: {
      name: 'Testmonster', kicker: 'Nur zum Prüfen', song: 'testsong', hp: 2, phases: [2, 1],
      hint: 'Spring dem Testmonster auf den Kopf, wenn es schläft.',
      lines: { intro: ['Ich teste dich!', 'Piep!', 'Los geht es!'], again: 'Nochmal?', tickle: ['Hihi.'], hit: ['Aua.'], phase: ['Jetzt aber!'], stun: ['Müde.'], beaten: 'Bestanden.', piep: ['Piep?'] },
      map: [...Array(9).fill('#                  #'), '# P                #', '####################', '####################'],
      make(B) { B.x = 12 * api.T; B.y = 10 * api.T; B.floor = 10 * api.T; },
      enter(B) { B.y = B.floor; },
      respawn(B) { B.x = 12 * api.T; B.y = B.floor; },
      // awake for 0.8 s, then asleep (soft) for 3 s; after a hit it wakes up again
      ai(B) {
        if (B.state === 'idle' && B.t > 0.8) api.boss.set(B, 'nap');
        else if (B.state === 'nap' && B.t > 3) api.boss.set(B, 'idle');
        else if (B.state === 'hurt' && B.t > 0.6) api.boss.set(B, 'idle');
      },
      box(B) { return { l: B.x - 28, r: B.x + 28, top: B.y - 50, bottom: B.y, soft: B.state === 'nap', harmless: true }; },
      draw(B, ctx) { api.boss.shadow(B, 30); ctx.fillStyle = api.boss.col(B, api.P.toggleB); api.rr(B.x - 28, B.y - 50 * B.sq, 56, 50 * B.sq, 14); ctx.fill(); },
      door() { return { x: 4, y: 9 }; },
    },
  });
  // what the test reads back
  window.__testWorld = { pieps: () => pieps };
})();
