// World 5 story hookup: the story engine of world 4 (coast-story.js, coast-director.js, coast-handover.js, the figures of
// coast-rig*.js / coast-cast*.js) runs in world 5 too, with its own settings. No file of world 4 is copied; this part registers
// the same hooks for world 5 and brings the settings: the four parts of the summit photo instead of 13 finds, their owners,
// the storage key, the wardrobe hat.
//
// Level fields of world 5 (the same as at the coast, see coast-story.js; the new acts, props and fields: volcano-story-acts.js,
// volcano-story-draw.js, volcano-gags.js):
//   cast: [{ who, x, y, act, ... }]   who: striped sidepart redbeard reporter filmer kid professor | 'dog' | 'goat' (Gerda) | 'egg'
//                                     (Fünkchen; crack 0..3) | 'baby' (the baby dragon) | 'prop' (kind ...)
//   says: [{ x, y, r, text }]         Mimo's own lines at places (through the story director, one beat at a time)
//   part: { x, y, item, owner?, ownerAt?, ownerSide?, thanks?, missing?, gag?, after?, ... }
//         the one part of the summit photo in this level (cell like cast; the same fields as find at the coast, `find` works too)
//         item   flag | book | thermos | tripod
//         owner  default by item: flag kid | book professor | thermos redbeard | tripod filmer
//         gag    default by item: flagPlant | bookWrite | cocoa | selfie (volcano-gags.js)
//   opening: true / closing: true     (volcano-scenes.js) the opening before the level / the scene after the last fight
// Parts are stored in localStorage "mimo.volcano.parts" ({ levelIndex: 1 }), never in the core save. Four parts give the hat
// "Wanderhut" (wardrobe, kind hat); the level list shows "Gipfelfoto n/4" (headNote).
(function () {
  'use strict';
  const C = () => window.MimoCoast, V = () => window.MimoVolcano;
  const KEY = 'mimo.volcano.parts', TOTAL = 4;
  const NAMES = { flag: 'die Gipfelfahne', book: 'das Gipfelbuch', thermos: 'die Thermoskanne', tripod: 'das Stativ' };
  const OWNER = { flag: 'kid', book: 'professor', thermos: 'redbeard', tripod: 'filmer' };
  const GAG = { flag: 'flagPlant', book: 'bookWrite', thermos: 'cocoa', tripod: 'selfie' };
  let api = null;

  const store = C().makeFindStore(KEY, TOTAL);
  C().storyCfg = Object.assign(C().storyCfg || {}, {
    5: { store, total: TOTAL, names: NAMES, peek: false, allText: 'Alle vier! Der Wanderhut wartet im Kleiderschrank.' },
  });

  // the part of a level becomes the find of the engine, with the defaults of the item
  function withPart(info) {
    const def = info && info.def, part = def && (def.part || def.find);
    if (!part || typeof part.item !== 'string') return info;
    const find = { owner: OWNER[part.item], gag: GAG[part.item], peek: false, ...part };
    return { ...info, def: { ...def, find } };
  }
  const H = () => C().storyHooks;
  function init(L, info) { H().init(L, withPart(info)); if (V().attachExtras) V().attachExtras(L); }
  function update(dt) { H().update(dt); C().directorHooks.update(dt); }
  function draw(layer, ctx) { H().draw(layer, ctx); C().handoverHooks.draw(layer, ctx); }

  // ---------- the wardrobe: the Wanderhut for all four parts ----------
  const hat = {
    id: 'h_wander', kind: 'hat', name: 'Wanderhut', price: 0,
    own: () => store.count() >= TOTAL,
    how: () => 'Finde alle vier Teile des Gipfelfotos (' + store.count() + ' von ' + TOTAL + ').',
    // Mimo is never tinted by the clock, so his hat is not either; the origin is the top of his head
    draw(ctx, o) { ctx.translate(0, o.top + 1); ctx.rotate(o.tilt * 0.4 - 0.05); ctx.scale(0.92, 0.92); V().draw.drawHat(ctx, api.dark); },
  };

  // which of the four parts this browser has found: { flag, book, thermos, tripod } (by the part of each level of the world)
  function foundParts() {
    const out = { flag: false, book: false, thermos: false, tripod: false };
    (api ? api.levels : []).forEach((l, i) => { const p = l.world === 5 && (l.part || l.find); if (p && p.item in out && store.has(i)) out[p.item] = true; });
    return out;
  }

  window.MimoVolcano = window.MimoVolcano || {};
  Object.assign(window.MimoVolcano, { parts: store, PARTS_TOTAL: TOTAL, PART_OWNER: OWNER, foundParts });
  window.MimoWorlds.register({
    world: 5,
    costumes: [hat],
    headNote: () => 'Gipfelfoto ' + store.count() + '/' + TOTAL,
    setup(a) { api = a; },
    init, update, draw,
  });
})();
