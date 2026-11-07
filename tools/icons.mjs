// Renders the app icons from the game itself: the menu Mimo drawn large on a pastel sky with a hill.
// Usage: node tools/icons.mjs   (needs Playwright, see tools/pw.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
const SIZES = { 'icon-180.png': [180, 0.6], 'icon-192.png': [192, 0.6], 'icon-512.png': [512, 0.6], 'icon-maskable-512.png': [512, 0.5] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
await page.goto('file://' + path.join(ROOT, 'src', 'index.html'));
await page.waitForFunction(() => window.__mimo && !document.getElementById('ovMenu').hidden);
// the menu preview redraws every frame at its canvas size, so a big canvas gives a sharp Mimo
await page.evaluate(() => { const cv = document.getElementById('menuMimo'); cv.width = cv.height = 1024; });
await page.waitForTimeout(400);
fs.mkdirSync(OUT, { recursive: true });
for (const [name, [size, fill]] of Object.entries(SIZES)) {
  const data = await page.evaluate(([N, fill]) => {
    const src = document.getElementById('menuMimo');
    const out = document.createElement('canvas'); out.width = out.height = N;
    const g = out.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, N); sky.addColorStop(0, '#E6DCF6'); sky.addColorStop(1, '#FCEFE8');
    g.fillStyle = sky; g.fillRect(0, 0, N, N);
    // soft sun
    const sun = g.createRadialGradient(N * 0.8, N * 0.2, 2, N * 0.8, N * 0.2, N * 0.22); sun.addColorStop(0, 'rgba(251,235,182,.95)'); sun.addColorStop(1, 'rgba(251,235,182,0)');
    g.fillStyle = sun; g.fillRect(0, 0, N, N);
    // Mimo's bounding box in the 1024 preview: x 300..724, y 200..790 (feet at 778)
    const bx0 = 300, by0 = 200, bh = 590, k = (fill * N) / bh, cx = N * 0.5, top = N * (0.5 - fill / 2) + N * 0.02;
    const feet = top + (778 - by0) * k;
    g.fillStyle = '#C2E1CE'; g.beginPath(); g.ellipse(N * 0.5, feet + N * 0.36, N * 0.78, N * 0.38, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#A4D0B6'; g.beginPath(); g.ellipse(N * 0.5, feet + N * 0.36, N * 0.78, N * 0.38, 0, Math.PI * 1.08, Math.PI * 1.92); g.lineWidth = N * 0.018; g.strokeStyle = '#A4D0B6'; g.stroke();
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, 1024, 1024, cx - 512 * k, top - by0 * k, 1024 * k, 1024 * k);
    return out.toDataURL('image/png');
  }, [size, fill]);
  fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64'));
  console.log('icon', name);
}
await browser.close();
