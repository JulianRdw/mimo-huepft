// World registry for worlds 4 and up (see README.md in this folder).
// Loaded before the game script, in the browser and in the level tools (tools/levels-lib.mjs runs it in a sandbox),
// so both put the worlds together the same way. A world file only calls MimoWorlds.register(part) at load time;
// everything else happens inside its hooks, once the game is running.
(function (root) {
  'use strict';
  // map characters the game itself already uses (a world may not give them a new meaning)
  const CORE_CHARS = ' #-^vabcL><A8iTgePD*hksfu';
  // fields a world has once; any part of the world may give them, but only one part
  const SINGLE = ['name', 'firstLevel', 'draft', 'palette', 'nightBlend', 'song', 'lines', 'particles', 'boss', 'drawBackground', 'drawAmbient', 'drawThorn', 'drawMushroom', 'drawChase', 'lint', 'ending', 'headNote', 'levelPath', 'finds'];
  // hooks every part may give; the game calls all of them in file order
  const MULTI = ['setup', 'init', 'update', 'physics', 'draw', 'drawTile', 'piep'];
  const parts = [];

  // a part of a world: { world: 4, ...fields, ...hooks, levels, tiles, spawns, songs, costumes }
  function register(part) {
    const src = root.document && root.document.currentScript ? root.document.currentScript.src.replace(/^.*\/worlds\//, '') : '';
    parts.push({ part, src });
  }

  const isInt = (n) => typeof n === 'number' && Math.floor(n) === n;
  const isMap = (m) => Array.isArray(m) && m.length > 0 && m.every((r) => typeof r === 'string');

  function mergeWorld(n, list, errors) {
    const w = { world: n, levels: [], tiles: {}, spawns: {}, songs: {}, costumes: [], hooks: {}, files: list.map((x) => x.src) };
    for (const k of MULTI) w.hooks[k] = [];
    for (const { part, src } of list) {
      const at = 'Welt ' + n + (src ? ' (' + src + ')' : '');
      for (const k of SINGLE) {
        if (part[k] == null) continue;
        if (w[k] != null) errors.push(at + ': "' + k + '" ist schon in einem anderen Teil der Welt gesetzt');
        else w[k] = part[k];
      }
      for (const k of MULTI) if (typeof part[k] === 'function') w.hooks[k].push(part[k]);
      for (const lv of part.levels || []) {
        if (!lv || typeof lv.name !== 'string' || !isMap(lv.map)) { errors.push(at + ': ein Level ohne Namen oder Karte'); continue; }
        if (lv.world != null && lv.world !== n) errors.push(at + ': Level ' + lv.name + ' gehört zu Welt ' + lv.world);
        // "night" belongs to the night path alone (the game finds it by that flag); a world's extra level is "bonus"
        if (lv.night) errors.push(at + ': Level ' + lv.name + ' hat night, für Zusatzlevel gibt es bonus');
        w.levels.push({ ...lv, world: n });
      }
      mergeChars(w, part, at, errors);
      for (const [id, song] of Object.entries(part.songs || {})) {
        if (w.songs[id]) errors.push(at + ': Musikstück ' + id + ' doppelt');
        else if (!song || !Array.isArray(song.form) || !song.sec || !song.bpm) errors.push(at + ': Musikstück ' + id + ' ist unvollständig (bpm, form, sec)');
        else w.songs[id] = song;
      }
      for (const c of part.costumes || []) w.costumes.push(c);
    }
    return w;
  }

  // tiles: a map character that becomes a tile; spawns: a map character that makes an object (the tile stays empty)
  function mergeChars(w, part, at, errors) {
    for (const kind of ['tiles', 'spawns']) {
      for (const [ch, def] of Object.entries(part[kind] || {})) {
        if (ch.length !== 1 || CORE_CHARS.includes(ch)) { errors.push(at + ': Kartenzeichen "' + ch + '" ist vergeben oder kein einzelnes Zeichen'); continue; }
        if (w.tiles[ch] || w.spawns[ch]) { errors.push(at + ': Kartenzeichen "' + ch + '" doppelt'); continue; }
        if (kind === 'spawns' && typeof def !== 'function' && !(def && typeof def.spawn === 'function')) { errors.push(at + ': spawn für "' + ch + '" ist keine Funktion'); continue; }
        w[kind][ch] = kind === 'spawns' && typeof def === 'function' ? { spawn: def } : def;
      }
    }
  }

  function checkWorld(w, next, errors) {
    const at = 'Welt ' + w.world;
    if (typeof w.name !== 'string' || !w.name) errors.push(at + ': "name" fehlt');
    if (!w.levels.length) errors.push(at + ': keine Level');
    if (!isInt(w.firstLevel)) errors.push(at + ': "firstLevel" fehlt (der Index des ersten Levels im Spiel, hier ' + next + ')');
    // a world that is not released yet (draft: true) declares the index it will have once the worlds before it are
    // complete; until then it follows right behind them, and w.plannedFirst keeps the declared value for the tools
    else if (w.draft === true && w.firstLevel !== next) { w.plannedFirst = w.firstLevel; w.firstLevel = next; }
    else if (w.firstLevel !== next) errors.push(at + ': "firstLevel" ist ' + w.firstLevel + ', das erste freie Level ist aber ' + next + ' (eine Welt davor hat sich verändert)');
    if (w.boss) {
      const b = w.boss;
      if (typeof b.name !== 'string' || !isInt(b.hp) || !Array.isArray(b.phases) || !isMap(b.map) || typeof b.ai !== 'function' || typeof b.draw !== 'function' || typeof b.box !== 'function')
        errors.push(at + ': Endgegner unvollständig (name, hp, phases, map, ai, box, draw)');
    }
    for (const c of w.costumes) {
      if (!c || typeof c.id !== 'string' || !['color', 'hat', 'acc'].includes(c.kind) || typeof c.name !== 'string') errors.push(at + ': Kostüm unvollständig (id, kind, name)');
      else if (c.boss != null && (c.boss !== w.world || !w.boss)) errors.push(at + ': Kostüm ' + c.id + ' ist Belohnung für einen Endgegner, den es nicht gibt');
      else if (c.kind !== 'color' && typeof c.draw !== 'function') errors.push(at + ': Kostüm ' + c.id + ' braucht draw()');
    }
  }

  // Puts all registered parts together. coreLevels = number of levels in the game itself (worlds 1-3 and the night path).
  // A world is only taken when its first level lands exactly on its declared index, so saved progress never moves.
  // opts.hold: world numbers that are built but not released yet. They are left out completely (levels, boss,
  // costumes, songs); they all come after the released worlds, so leaving them out moves no index, and releasing one
  // later appends it exactly where its firstLevel says. Returned as held (numbers that were registered and held back).
  function assemble(coreLevels, opts) {
    const hold = new Set((opts && opts.hold) || []);
    const errors = [], byWorld = new Map(), held = [];
    for (const x of parts) {
      const n = x.part && x.part.world;
      if (!isInt(n) || n < 4) { errors.push('Ein Teil ohne gültige Weltnummer (ab 4)' + (x.src ? ' in ' + x.src : '')); continue; }
      if (!byWorld.has(n)) byWorld.set(n, []);
      byWorld.get(n).push(x);
    }
    const worlds = [];
    let next = coreLevels;
    for (const n of [...byWorld.keys()].sort((a, b) => a - b)) {
      if (hold.has(n)) { held.push(n); continue; }
      const w = mergeWorld(n, byWorld.get(n), errors), before = errors.length;
      checkWorld(w, next, errors);
      if (errors.length > before) continue;
      worlds.push(w);
      next += w.levels.length;
    }
    return { worlds, errors, held };
  }

  const api = root.MimoWorlds || {};
  api.register = register;
  api.assemble = assemble;
  api.parts = parts;
  api.CORE_CHARS = CORE_CHARS;
  root.MimoWorlds = api;
})(typeof window !== 'undefined' ? window : globalThis);
