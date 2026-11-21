// Serves src/ for playing the current state on a phone in the same Wi-Fi (no build, no offline cache).
// Usage: node tools/serve.mjs [--port 8650] [--lan]
//   --lan   listen on all network interfaces and print the addresses the iPhone can open; without it only this computer
// Tip: append ?offen to the address to open every level, boss and bonus for this visit (the save stays as it is).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { SRC, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port) || 8650;
const host = args.lan ? '0.0.0.0' : '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.md': 'text/plain; charset=utf-8' };
// vendor/ holds Three.js for the 3D level; the page asks for it under the CDN address, so locally only src/ is needed
const ROOTS = [SRC];

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  for (const root of ROOTS) {
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) && file !== root) continue;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    // never cached, so a reload on the phone always shows the newest state
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('nicht gefunden');
});

server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? 'Port ' + port + ' ist belegt, nimm --port <andere Zahl>.' : e.message); process.exit(1); });
server.listen(port, host, () => {
  const urls = ['http://localhost:' + port + '/'];
  if (args.lan) for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) urls.push('http://' + a.address + ':' + port + '/');
  process.stdout.write('Mimo läuft aus src/ unter:\n' + urls.map((u) => '  ' + u + '   (alles offen: ' + u + '?offen)').join('\n') + '\n' +
    (args.lan ? 'Das iPhone muss im selben WLAN sein.\n' : 'Nur auf diesem Rechner. Fürs iPhone: --lan\n') + 'Beenden mit Ctrl+C.\n');
});
