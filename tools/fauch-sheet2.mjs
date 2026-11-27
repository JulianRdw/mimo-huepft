// Draws the new Fauch poses (brood, wave, thumb, startled, curled, peek, tiny) on a sheet: node tools/fauch-sheet2.mjs --out file.png
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
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 700; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:1200px;height:700px';
    document.body.appendChild(c); const ctx = c.getContext('2d'), F = window.MimoVolcano.fauchDraw, tiny = window.MimoVolcano.fauchTiny;
    ctx.fillStyle = '#F6E7DA'; ctx.fillRect(0, 0, 1200, 700);
    const at = (x, y, fn) => { ctx.save(); ctx.translate(x, y); fn(); ctx.restore(); };
    at(110, 240, () => F.sit(ctx, 0.3, { scale: 1.4, egg: true, cover: 0.55, lean: 0.8, sleepy: 0.6 }));
    at(330, 240, () => F.sit(ctx, 0.3, { scale: 1.4, egg: true, cover: 0.0, lean: 0.8 }));
    at(550, 240, () => F.sit(ctx, 0.3, { scale: 1.4, egg: true, cover: 1, lookUp: 1, look: -1 }));
    at(780, 240, () => F.sit(ctx, 0.3, { scale: 1.4, wave: 1, waveAmp: 1 }));
    at(990, 240, () => F.sit(ctx, 0.3, { scale: 1.4, thumb: 1 }));
    at(120, 500, () => F.curl(ctx, 0.0, { scale: 1.3, puff: 1 }));
    at(380, 500, () => F.curl(ctx, 1.3, { scale: 1.3 }));
    at(620, 500, () => F.sit(ctx, 0.3, { scale: 1.4, wide: 1, wings: 1 }));
    at(830, 500, () => F.peek(ctx, 0.3, { scale: 1.4 }));
    tiny(ctx, 960, 440, 36, 'fly', 0.2); tiny(ctx, 1030, 440, 36, 'peek', 0.2); tiny(ctx, 1100, 440, 36, 'thumb', 0.2); tiny(ctx, 1160, 440, 28, 'sit', 0.2, { face: -1 });
    ctx.save(); ctx.translate(900, 600); ctx.scale(5, 5); tiny(ctx, 0, 0, 36, 'fly', 0.2); tiny(ctx, 14, 0, 36, 'peek', 0.2); tiny(ctx, 28, 0, 36, 'thumb', 0.2); ctx.restore();
  });
  await page.screenshot({ path: String(args.out) });
  if (errors.length) console.log(errors.join('\n'));
} finally { await browser.close(); srv.close(); }
