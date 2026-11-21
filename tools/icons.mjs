// Renders the app icons from the game itself: Mimo in front of the beach family, the gull on his leaf
// (drawAppIcon in src/index.html, the start screen's group photo as a square).
// Usage: node tools/icons.mjs   (needs Playwright, see tools/pw.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
// name: [size, safe] (safe: everything inside the safe circle of a maskable icon)
const SIZES = { 'icon-180.png': [180, false], 'icon-192.png': [192, false], 'icon-512.png': [512, false], 'icon-maskable-512.png': [512, true] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
await page.goto('file://' + path.join(ROOT, 'src', 'index.html'));
await page.waitForFunction(() => window.__mimo && window.__mimo.appIcon);
// the family's pictures load in the background: ask until all figures are there and posed
await page.waitForFunction(() => window.__mimo.appIcon.prepare(), null, { polling: 200, timeout: 20000 });
await page.evaluate(() => document.fonts && document.fonts.ready);
fs.mkdirSync(OUT, { recursive: true });
for (const [name, [size, safe]] of Object.entries(SIZES)) {
  const data = await page.evaluate(([N, safe]) => {
    const out = document.createElement('canvas'); out.width = out.height = N;
    const g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
    window.__mimo.appIcon.draw(g, N, safe);
    return out.toDataURL('image/png');
  }, [size, safe]);
  fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64'));
  console.log('icon', name);
}
await browser.close();
