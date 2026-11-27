// Picture series for the geyser column: Mimo runs into a standing column, a shot every 0.1 s.
// Usage: node tools/geyser-series.mjs <outDir> <walk|jump|out>
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from './pw.mjs';
import { ROOT, serveSrc } from './levels-lib.mjs';

const [outDir, mode = 'walk'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const srv = await serveSrc();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, colorScheme: 'light' });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript({ path: path.join(ROOT, 'tools', 'volcano-lab-page.js') });
  await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
  await page.goto(srv.url);
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate((m) => window.__lab.seriesInit(m === 'out' ? 'walk' : m), mode);
  const log = [];
  for (let i = 0; i < 24; i++) {
    const input = mode !== 'jump' && i === 3 ? '' : mode === 'out' && i === 6 ? 'RJ' : mode === 'out' && i === 7 ? 'R' : null;
    const s = await page.evaluate(([dt, inp]) => window.__lab.seriesStep(dt, inp), [0.1, input]);
    await frames();
    await page.screenshot({ path: path.join(outDir, String(i).padStart(2, '0') + '.png'), clip: { x: 200, y: 20, width: 440, height: 340 } });
    log.push(`${String(i).padStart(2, '0')} t=${s.t} ${s.phase} top=${s.top} feet=${s.feet} vy=${s.vy} carried=${s.carried}`);
  }
  console.log(log.join('\n'));
} finally { await browser.close(); srv.close && srv.close(); }
