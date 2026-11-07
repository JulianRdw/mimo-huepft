// Shared helpers for the level tools: read the levels from src/index.html or from a candidate file, serve src/ locally.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');

// The LEVELS array in src/index.html is plain data (no code), so it can be evaluated on its own.
export function srcLevels() {
  const s = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const a = s.indexOf('const LEVELS = ['), b = s.indexOf('\n];', a);
  if (a < 0 || b < 0) throw new Error('LEVELS not found in src/index.html');
  return vm.runInNewContext('(' + s.slice(a + 'const LEVELS = '.length, b + 2) + ')', {});
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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
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
