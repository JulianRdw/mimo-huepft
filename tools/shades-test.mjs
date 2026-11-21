// Silent end-to-end check of world 4: 12 finds keep the sunglasses closed, all 13 unlock them in the wardrobe and Mimo wears them.
// Usage: node tools/shades-test.mjs
// all 13 finds in the browser's storage -> the sunglasses are owned in the wardrobe and can be worn
import { chromium } from './pw.mjs';
import { serveSrc } from './levels-lib.mjs';
const srv = await serveSrc(); const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 896, height: 414 } });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const check = async (n) => {
  await page.goto(srv.url); await page.evaluate((n) => { const o = {}; for (let i = 29; i < 29 + n; i++) o[i] = 1; localStorage.setItem('mimo.coast.finds', JSON.stringify(o)); }, n);
  await page.reload(); await page.waitForFunction(() => window.__mimo && window.__mimo.COSTUMES);
  await page.click('#btnWardrobe'); await page.click('#shopTabs [data-kind="acc"]');
  return page.evaluate(() => { const b = [...document.querySelectorAll('#shopItems .item')].find((x) => x.querySelector('span').textContent === 'Sonnenbrille'); if (!b) return { found: false };
    const st = b.querySelector('small').textContent, closed = b.classList.contains('closed'); b.click();
    const after = [...document.querySelectorAll('#shopItems .item')].find((x) => x.querySelector('span').textContent === 'Sonnenbrille');
    return { found: true, st, closed, worn: after.classList.contains('worn'), outfit: window.__mimo.progress.outfit.acc, bar: document.getElementById('shopBarText').textContent }; });
};
const r12 = await check(12), r13 = await check(13);
console.log('12 finds', JSON.stringify(r12)); console.log('13 finds', JSON.stringify(r13)); console.log('errors', errors.length ? errors : 'none');

await browser.close(); srv.close();
const ok = r12.found && r12.closed && !r12.worn && r13.found && !r13.closed && r13.worn && r13.outfit === 'a_shades' && !errors.length;
console.log(ok ? 'sunglasses: OK' : 'sunglasses: FAIL'); process.exit(ok ? 0 : 1);
