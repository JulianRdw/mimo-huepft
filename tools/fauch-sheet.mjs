// Draws a sheet of the Fauch pictures (volcano-fauch-draw.js) for a look: node tools/fauch-sheet.mjs --out file.png [--dark]
import { chromium } from './pw.mjs';
import { serveSrc, parseArgs } from './levels-lib.mjs';
const args = parseArgs(process.argv.slice(2));
const srv = await serveSrc();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1.5 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(srv.url + '?offen');
  await page.waitForFunction(() => window.__mimo && window.MimoVolcano && window.MimoVolcano.fauchDraw);
  await page.evaluate((dark) => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 700; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:1200px;height:700px';
    document.body.appendChild(c); const ctx = c.getContext('2d'), F = window.MimoVolcano.fauchDraw;
    ctx.fillStyle = dark ? '#2B2840' : '#F6E7DA'; ctx.fillRect(0, 0, 1200, 700);
    const at = (x, y, fn) => { ctx.save(); ctx.translate(x, y); fn(); ctx.restore(); };
    at(160, 140, () => F.fly(ctx, 0.0, { scale: 1 }));
    at(470, 140, () => F.fly(ctx, 0.18, { scale: 1, open: 1 }));
    at(800, 140, () => F.fly(ctx, 0.36, { scale: 1, face: -1, legs: 1, puff: 1 }));
    at(1050, 160, () => F.fly(ctx, 0.1, { scale: 0.7, mono: 'rgba(40,30,60,0.35)' }));
    at(120, 450, () => F.sit(ctx, 0, { scale: 1.2 }));
    at(330, 450, () => F.sit(ctx, 0.5, { scale: 1.2, look: -1, blink: 1, face: -1 }));
    at(520, 450, () => F.sit(ctx, 1, { scale: 1.2, open: 1, wings: 1, puff: 1 }));
    at(730, 450, () => F.sit(ctx, 1, { scale: 1.2, drink: 1 }));
    at(950, 400, () => F.eye(ctx, 1, { open: 1, look: [0.6, 0.3], glow: 1 }));
    at(1100, 560, () => F.ring(ctx, 30, 0.9, 1));
    at(950, 600, () => F.sit(ctx, 0, { scale: 0.5, sleepy: 1 }));
  }, !!args.dark);
  await page.screenshot({ path: String(args.out) });
  if (errors.length) console.log(errors.join('\n'));
} finally { await browser.close(); srv.close(); }
