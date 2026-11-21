// Shared helpers for the level tools: read the levels from src/index.html or from a candidate file, serve src/ locally.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');

// The LEVELS array in src/index.html is plain data (no code), so it can be evaluated on its own.
function coreLevels(html) {
  const a = html.indexOf('const LEVELS = ['), b = html.indexOf('\n];', a);
  if (a < 0 || b < 0) throw new Error('LEVELS not found in src/index.html');
  return vm.runInNewContext('(' + html.slice(a + 'const LEVELS = '.length, b + 2) + ')', {});
}

// The world files in game order: the <script src="worlds/..."> lines of src/index.html (the registry comes first).
export function worldFiles(html) {
  return [...(html || fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')).matchAll(/<script src="(worlds\/[\w./-]+\.js)"><\/script>/g)].map((m) => m[1]);
}

// The worlds that are built but not released yet: const UNRELEASED_WORLDS in src/index.html (the game leaves them
// out unless it runs with ?vorschau, the app build leaves their files out)
export function unreleasedWorlds(html) {
  const m = (html || fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')).match(/const UNRELEASED_WORLDS = \[([\d,\s]*)\];/);
  if (!m) throw new Error('const UNRELEASED_WORLDS = [...] not found in src/index.html');
  return m[1].split(',').map((x) => x.trim()).filter(Boolean).map(Number);
}

// runs the registry and the given world files in a sandbox, like the page does; returns the sandbox's MimoWorlds and,
// per file, the world numbers it registered (fileWorlds: { 'worlds/x.js': [5] })
function runWorldFiles(files) {
  const box = { console }, fileWorlds = {};
  box.window = box;
  vm.createContext(box);
  for (const file of files) {
    const src = 'worlds/' + path.relative(path.join(SRC, 'worlds'), file).split(path.sep).join('/');
    box.document = { currentScript: { src } };
    const before = box.MimoWorlds ? box.MimoWorlds.parts.length : 0;
    vm.runInContext(fs.readFileSync(file, 'utf8'), box, { filename: file });
    fileWorlds[src] = box.MimoWorlds ? [...new Set(box.MimoWorlds.parts.slice(before).map((x) => x.part && x.part.world))] : [];
  }
  return { reg: box.MimoWorlds, fileWorlds };
}

// which world each listed world file belongs to: { 'worlds/volcano.js': 5, 'worlds/registry.js': null }.
// A file belongs to the world it registers. A helper file that registers nothing (a shape, a bot) belongs to the world
// of the files around it (the list is in world order); between two worlds that is unclear, so it must say it itself
// with an empty part ({ world: N }). Files before the first world (the registry) belong to no world.
export function worldFileWorlds(html) {
  const raw = runWorldFiles(worldFiles(html).map((f) => path.join(SRC, f))).fileWorlds, names = Object.keys(raw), out = {};
  for (const [i, f] of names.entries()) {
    if (raw[f].length > 1) throw new Error(f + ' registers parts of several worlds (' + raw[f].join(', ') + ')');
    if (raw[f].length) { out[f] = raw[f][0]; continue; }
    const prev = names.slice(0, i).reverse().find((g) => raw[g].length), next = names.slice(i + 1).find((g) => raw[g].length);
    const a = prev ? raw[prev][0] : null, b = next ? raw[next][0] : null;
    if (a == null) { out[f] = null; continue; }
    if (b != null && a !== b) throw new Error(f + ' registers nothing and sits between world ' + a + ' and world ' + b + ': give it window.MimoWorlds.register({ world: N })');
    out[f] = a;
  }
  return out;
}

// the world files the released game loads (worlds in UNRELEASED_WORLDS left out), and the ones left out
export function releaseWorldFiles(html) {
  const held = new Set(unreleasedWorlds(html)), map = worldFileWorlds(html), files = Object.keys(map);
  return { ship: files.filter((f) => !held.has(map[f])), held: files.filter((f) => held.has(map[f])) };
}

// Worlds 4 and up: runs src/worlds/registry.js and the world files in a sandbox and puts them together exactly like the
// game does. Returns { levels (all, in game order = the save index), worlds (as assembled), core (number of levels in
// index.html), coreChars (map characters of the game itself), held (worlds left out) }. extraFiles: more world files
// (absolute paths) loaded after the game's own, e.g. a test world. The level tools see every world that is built
// (the game with ?vorschau); opts.release: true gives what the released game has (UNRELEASED_WORLDS held back).
export function srcWorlds(extraFiles = [], opts = {}) {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), core = coreLevels(html);
  const { reg } = runWorldFiles([...worldFiles(html).map((f) => path.join(SRC, f)), ...extraFiles]);
  if (!reg) throw new Error('src/worlds/registry.js is not loaded by src/index.html');
  const { worlds, errors, held } = reg.assemble(core.length, { hold: opts.release ? unreleasedWorlds(html) : [] });
  if (errors.length) throw new Error('world modules:\n  ' + errors.join('\n  '));
  return { levels: [...core, ...worlds.flatMap((w) => w.levels)], worlds, core: core.length, coreChars: reg.CORE_CHARS, held };
}

// every level of the game in game order (index = save slot), worlds 4 and up included
export function srcLevels() { return srcWorlds().levels; }

// what the level tools need to know about the map characters of a world module: { char: { kind, name, color } }
// kind: ground (stand on it, it blocks), standable (stand on it from above), decor, item (an object, not a tile)
export function worldChars(worlds, world) {
  const w = worlds.find((x) => x.world === world), out = {};
  if (!w) return out;
  for (const [ch, def] of Object.entries(w.tiles)) out[ch] = { kind: def.solid === true ? 'ground' : def.oneway ? 'standable' : 'decor', ...(def.lint || {}) };
  for (const [ch, def] of Object.entries(w.spawns)) out[ch] = { kind: 'item', ...(def.lint || {}) };
  return out;
}

// A candidate file is an ES module whose default export is an array of level objects (same shape as in LEVELS).
export async function fileLevels(file) {
  const mod = await import(pathToFileURL(path.resolve(file)).href + '?t=' + Date.now());
  if (!Array.isArray(mod.default)) throw new Error(file + ': default export must be an array of levels');
  return mod.default;
}

export async function loadLevels(from) { return from ? fileLevels(from) : srcLevels(); }

// pick one level by index (number) or by name (case-insensitive)
export function pickLevel(levels, key) {
  const i = /^\d+$/.test(String(key)) ? Number(key) : levels.findIndex((l) => l.name.toLowerCase() === String(key).toLowerCase());
  if (i < 0 || i >= levels.length) throw new Error('level not found: ' + key + ' (have: ' + levels.map((l) => l.name).join(', ') + ')');
  return { def: levels[i], index: i };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
export async function serveSrc() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(SRC, rel);
    if (!file.startsWith(SRC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + server.address().port + '/', close: () => server.close() };
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v; }
    else out._.push(a);
  }
  return out;
}
