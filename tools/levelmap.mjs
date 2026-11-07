// Draws whole level maps as PNG (one picture per level, grid with tile numbers), to look at a level at a glance.
// Usage: node tools/levelmap.mjs --out dir [--from candidate.js] [--level name|index]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './pw.mjs';
import { loadLevels, pickLevel, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.out) { console.error('usage: node tools/levelmap.mjs --out dir [--from file.js] [--level name|index]'); process.exit(2); }
const all = await loadLevels(args.from);
const list = args.level ? [pickLevel(all, args.level)] : all.map((def, index) => ({ def, index }));
const out = path.resolve(String(args.out));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  for (const { def, index } of list) {
    const url = await page.evaluate((def) => {
      const S = 20, PAD = 22, rows = def.map, h = rows.length, w = Math.max(...rows.map((r) => r.length));
      const c = document.createElement('canvas'); c.width = w * S + PAD; c.height = h * S + PAD + 18;
      const g = c.getContext('2d');
      g.fillStyle = '#EEF0FA'; g.fillRect(0, 0, c.width, c.height);
      g.font = 'bold 12px sans-serif'; g.fillStyle = '#333'; g.fillText((def.name || '') + ' · Welt ' + (def.world || 1) + (def.chase ? ' · Lawine ' + def.chase.speed : '') + (def.night ? ' · Nacht' : ''), PAD, 13);
      g.translate(PAD, 18 + PAD);
      const FILL = { '#': '#7FB08E', i: '#BFE3F2', c: '#E3CDA8', L: '#5B4F7A', a: '#B9A6E8', b: '#F4B6A0', g: '#F2E07A', A: 'rgba(120,210,230,.45)', 8: 'rgba(120,210,230,.45)', '>': 'rgba(170,190,255,.35)', '<': 'rgba(170,190,255,.35)' };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = rows[y][x] || ' ', X = x * S, Y = y * S;
        if (FILL[ch]) { g.fillStyle = FILL[ch]; g.fillRect(X, Y, S, S); }
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const mid = (txt, col, size) => { g.fillStyle = col; g.font = 'bold ' + (size || 13) + 'px sans-serif'; g.fillText(txt, X + S / 2, Y + S / 2 + 1); };
        if (ch === '-') { g.fillStyle = '#B98B5A'; g.fillRect(X, Y, S, 5); }
        else if (ch === '^') { g.fillStyle = '#D9467A'; g.beginPath(); g.moveTo(X + 2, Y + S); g.lineTo(X + S / 2, Y + 4); g.lineTo(X + S - 2, Y + S); g.fill(); }
        else if (ch === 'v') { g.fillStyle = '#D9467A'; g.beginPath(); g.moveTo(X + 2, Y); g.lineTo(X + S / 2, Y + S - 4); g.lineTo(X + S - 2, Y); g.fill(); }
        else if (ch === 'T') { g.fillStyle = '#F08A3C'; g.beginPath(); g.moveTo(X + 2, Y + S); g.lineTo(X + S / 2, Y + 6); g.lineTo(X + S - 2, Y + S); g.fill(); }
        else if (ch === '*' || ch === '8') mid('★', '#E2A400', 17);
        else if (ch === 'h') mid('★', '#E0579A', 17);
        else if (ch === 'P') mid('P', '#2F6FD6');
        else if (ch === 'D') { g.fillStyle = '#9B7FD0'; g.fillRect(X + 3, Y - S + 4, S - 6, 2 * S - 4); mid('D', '#fff'); }
        else if (ch === 'f') mid('⚑', '#2E9E62', 15);
        else if (ch === 'k') mid('⚷', '#C99400', 16);
        else if (ch === 's') mid('S', '#C2410C');
        else if (ch === 'u') mid('U', '#E05A86');
        else if (ch === 'e') mid('@', '#8A5A2B', 15);
        else if (ch === '>') mid('→', '#4A5AB8');
        else if (ch === '<') mid('←', '#4A5AB8');
        else if (ch === 'A') mid('↑', '#2A8EA6');
        else if (ch === 'c') mid('·', '#8A6A3A');
      }
      for (const m of def.movers || []) {
        g.strokeStyle = '#1F6FEB'; g.lineWidth = 2; g.strokeRect(m.x * S, m.y * S, m.w * S, 6);
        const tx = m.axis === 'x' ? m.x + m.dist : m.x, ty = m.axis === 'y' ? m.y + m.dist : m.y;
        g.setLineDash([4, 3]); g.strokeRect(tx * S, ty * S, m.w * S, 6); g.setLineDash([]);
      }
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
      for (let x = 0; x <= w; x++) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, h * S); g.stroke(); }
      for (let y = 0; y <= h; y++) { g.beginPath(); g.moveTo(0, y * S); g.lineTo(w * S, y * S); g.stroke(); }
      g.fillStyle = '#555'; g.font = '10px sans-serif'; g.textAlign = 'center';
      for (let x = 0; x < w; x += 5) g.fillText(String(x), x * S + S / 2, -8);
      g.textAlign = 'right'; for (let y = 0; y < h; y += 2) g.fillText(String(y), -4, y * S + S / 2);
      return c.toDataURL('image/png');
    }, def);
    const file = path.join(out, String(index + 1).padStart(2, '0') + '-' + def.name.replace(/[^\wäöüÄÖÜß-]+/g, '_') + '.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
  }
} finally { await browser.close(); }
