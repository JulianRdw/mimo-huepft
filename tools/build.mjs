// Builds the installable web app (PWA) into docs/ for GitHub Pages.
// Source of truth is src/: the same page that runs as the claude.ai artifact.
// The app build swaps the artifact head for an app head, loads Three.js from vendor/ (works offline)
// and adds a service worker that keeps every file on the phone.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { releaseWorldFiles } from './levels-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
// the Sternenbahn files only ship while the game has it switched on (const STARWAY in src/index.html)
const STARWAY_ON = /const STARWAY = true;/.test(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'));
// the world files (src/worlds/, worlds 4 and up) are part of the main game: every build ships them, in the order of
// their <script> lines in src/index.html; a world file that is not listed there would silently be missing, so that stops the build
// worlds that are built but not released yet (const UNRELEASED_WORLDS in src/index.html) stay out of the app: their
// <script> lines are taken out of the page and their files are not copied, so the published game cannot reach them
const RELEASE = releaseWorldFiles();
const WORLD_FILES = worldFiles().filter((f) => !RELEASE.held.includes(f));
const MODULES = ['mimo3d.js', 'sky3d.js', ...(STARWAY_ON ? ['run3d.js', 'starway-core.js', 'starway-world.js', 'starway3d.js'] : []), ...WORLD_FILES];
// the 3D world Kinderzimmer: its own page (src/kinderzimmer.html, opened by the game in a frame) and the room3d/ files it loads
const ROOM_PAGE = 'kinderzimmer.html';
const ROOM_FILES = roomFiles();
const ICONS = ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
const THREE_CDN = "'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js'";

function worldFiles() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const listed = [...html.matchAll(/<script src="(worlds\/[\w./-]+\.js)"><\/script>/g)].map((m) => m[1]);
  const dir = path.join(SRC, 'worlds');
  const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => 'worlds/' + f.split(path.sep).join('/')) : [];
  const missing = listed.filter((f) => !onDisk.includes(f)), unlisted = onDisk.filter((f) => !listed.includes(f));
  if (missing.length) throw new Error('build: src/index.html loads ' + missing.join(', ') + ', but the file is missing');
  if (unlisted.length) throw new Error('build: ' + unlisted.join(', ') + ' is not loaded by src/index.html (add a <script src> line in the world block)');
  return listed;
}

function roomFiles() {
  const html = fs.readFileSync(path.join(SRC, ROOM_PAGE), 'utf8');
  const listed = [...html.matchAll(/<script src="(room3d\/[\w./-]+\.js)"><\/script>/g)].map((m) => m[1]);
  const dir = path.join(SRC, 'room3d');
  const onDisk = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => 'room3d/' + f);
  const missing = listed.filter((f) => !onDisk.includes(f)), unlisted = onDisk.filter((f) => !listed.includes(f));
  if (missing.length) throw new Error('build: ' + ROOM_PAGE + ' loads ' + missing.join(', ') + ', but the file is missing');
  if (unlisted.length) throw new Error('build: ' + unlisted.join(', ') + ' is not loaded by ' + ROOM_PAGE);
  return listed;
}

// the room page as the app ships it: an app head, Three.js from vendor/ (works offline)
function buildRoomPage() {
  let html = fs.readFileSync(path.join(SRC, ROOM_PAGE), 'utf8');
  html = html.replace(/^<!doctype html><html><head>.*?<\/head><body>/s, '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"></head><body>');
  if (!html.startsWith('<!doctype html><html lang="de">')) throw new Error('build: expected the artifact head in ' + ROOM_PAGE);
  return replaceOnce(html, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"></script>', '<script src="vendor/three.min.js"></script>', ROOM_PAGE + ' Three.js address');
}

function replaceOnce(text, from, to, label) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`build: expected one "${label}", found ${n}`);
  return text.replace(from, () => to);
}

const APP_HEAD = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Mimo">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="theme-color" content="#F5F0F9" media="(prefers-color-scheme: light)">',
  '<meta name="theme-color" content="#26232F" media="(prefers-color-scheme: dark)">',
  '<meta name="description" content="Ein ruhiges Hüpfspiel mit Mimo.">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="icons/icon-180.png">',
  '<link rel="icon" type="image/png" href="icons/icon-192.png">',
].join('');

const SW_REGISTER = `<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  // A new version takes over in the background (skipWaiting + claim). Then reload once, so a release shows up on the
  // first start: right away while still on the start screen (first 15 s), otherwise the next time the app comes back.
  const hadOld = !!navigator.serviceWorker.controller, bootAt = Date.now();
  let pending = false;
  const reloadOnce = () => { try { if (sessionStorage.getItem('mimo.swReload')) return; sessionStorage.setItem('mimo.swReload', '1'); } catch (_) { /* storage may be unavailable */ } location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadOld) return; if (Date.now() - bootAt < 15000) reloadOnce(); else pending = true; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (pending) { reloadOnce(); return; }
    navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
  });
  window.addEventListener('load', () => {
    setTimeout(() => { try { sessionStorage.removeItem('mimo.swReload'); } catch (_) { /* storage may be unavailable */ } }, 20000);
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Offline-Speicher nicht verfügbar', e));
  });
}
</script>
`;

function buildPage() {
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  // the artifact page starts with the skeleton the artifact service wraps around it; the app gets its own head
  html = replaceOnce(html, '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<!doctype html><html lang="de"><head>' + APP_HEAD, 'artifact head');
  html = replaceOnce(html, THREE_CDN, "'vendor/three.min.js'", 'Three.js address');
  html = replaceOnce(html, '</body></html>', SW_REGISTER + '</body></html>', 'page end');
  for (const f of RELEASE.held) html = replaceOnce(html, '<script src="' + f + '"></script>\n', '', f + ' script line');
  return html;
}

function manifest() {
  return JSON.stringify({
    name: 'Mimo hüpft',
    short_name: 'Mimo',
    description: 'Ein ruhiges Hüpfspiel mit Mimo.',
    lang: 'de',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: '#F5F0F9',
    theme_color: '#F5F0F9',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2);
}

function serviceWorker(version, files) {
  return `// Mimo hüpft · offline cache. Generated by tools/build.mjs, do not edit.
const VERSION = '${version}';
const SHELL = 'shell-' + VERSION;
const FONTS = 'fonts-v1';
const FILES = ${JSON.stringify(['./', ...files], null, 2)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Own files: from the cache first (they change only with a new version). Google Fonts: kept after the first load.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // a page of the app opened by name (the Kinderzimmer in its frame) is served as itself; any other navigation gets the game
    const page = url.pathname.split('/').pop();
    const key = req.mode === 'navigate' && !(page && page !== 'index.html' && FILES.includes(page)) ? './' : req;
    e.respondWith(caches.match(key, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
  }
});
`;
}

function copy(rel, from) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
}

function main() {
  for (const icon of ICONS) if (!fs.existsSync(path.join(ROOT, icon))) throw new Error('build: missing ' + icon + ' (run tools/icons.mjs first)');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const page = buildPage();
  fs.writeFileSync(path.join(OUT, 'index.html'), page);
  for (const m of MODULES) copy(m, path.join(SRC, m));
  fs.writeFileSync(path.join(OUT, ROOM_PAGE), buildRoomPage());
  for (const f of ROOM_FILES) copy(f, path.join(SRC, f));
  copy('vendor/three.min.js', path.join(ROOT, 'vendor', 'three.min.js'));
  for (const icon of ICONS) copy(icon, path.join(ROOT, icon));
  fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), manifest());
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  const files = ['index.html', 'manifest.webmanifest', ...MODULES, ROOM_PAGE, ...ROOM_FILES, 'vendor/three.min.js', ...ICONS];
  const hash = crypto.createHash('sha256');
  for (const f of files) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
  const version = hash.digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(OUT, 'sw.js'), serviceWorker(version, files));
  console.log('built docs/ · version ' + version + ' · ' + files.length + ' files' + (RELEASE.held.length ? ' · ' + RELEASE.held.length + ' files of unreleased worlds left out' : ''));
}

main();
