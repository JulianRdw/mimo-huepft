// Silent end-to-end check of world 5: three parts of the summit photo keep the Wanderhut closed, all four unlock it in the wardrobe
// and Mimo wears it (the same pattern as tools/shades-test.mjs for world 4). The level list shows "Gipfelfoto n/4".
// Usage: node tools/hat-test.mjs
import { chromium } from './pw.mjs';
import { serveSrc } from './levels-lib.mjs';
const srv = await serveSrc(); const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 896, height: 414 } });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const check = async (n) => {
  await page.goto(srv.url);
  await page.evaluate((n) => { const first = window.__mimo.WORLDS[5].firstLevel, o = {}; [2, 5, 8, 11].slice(0, n).forEach((k) => { o[first + k] = 1; }); localStorage.setItem('mimo.volcano.parts', JSON.stringify(o)); }, n);
  await page.reload(); await page.waitForFunction(() => window.__mimo && window.__mimo.COSTUMES);
  await page.click('#btnWardrobe'); await page.click('#shopTabs [data-kind="hat"]');
  return page.evaluate(() => { const b = [...document.querySelectorAll('#shopItems .item')].find((x) => x.querySelector('span').textContent === 'Wanderhut'); if (!b) return { found: false };
    const st = b.querySelector('small').textContent, closed = b.classList.contains('closed'); b.click();
    const after = [...document.querySelectorAll('#shopItems .item')].find((x) => x.querySelector('span').textContent === 'Wanderhut');
    return { found: true, st, closed, worn: after.classList.contains('worn'), outfit: window.__mimo.progress.outfit.hat, bar: document.getElementById('shopBarText').textContent, note: window.__mimo.WORLDS[5].headNote() }; });
};
const r3 = await check(3), r4 = await check(4);
console.log('3 parts', JSON.stringify(r3)); console.log('4 parts', JSON.stringify(r4)); console.log('errors', errors.length ? errors : 'none');

await browser.close(); srv.close();
const ok = r3.found && r3.closed && !r3.worn && r3.note === 'Gipfelfoto 3/4' && r4.found && !r4.closed && r4.worn && r4.outfit === 'h_wander' && r4.note === 'Gipfelfoto 4/4' && !errors.length;
console.log(ok ? 'wanderhut: OK' : 'wanderhut: FAIL'); process.exit(ok ? 0 : 1);
