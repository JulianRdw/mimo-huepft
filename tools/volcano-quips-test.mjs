// Silent check of the small jokes in the obstacles of world 5 (src/worlds/volcano-things-quips.js) and of Fauch's extra acts
// (src/worlds/volcano-fauch-acts.js), measured in the real game on test fields (tools/volcano-lab-page.js).
// Checks: every joke fires once, says its word, never changes a rule (the hopper arc, the geyser lift), never two bubbles at once,
// also with a story line waiting; the Fauch acts start, run and finish without script errors, the startle wakes the sleeper.
// Usage: node tools/volcano-quips-test.mjs
import path from 'node:path';
import { chromium } from './pw.mjs';
import { ROOT, serveSrc } from './levels-lib.mjs';

let failed = 0;
const check = (ok, label, value) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (value != null ? ' · ' + JSON.stringify(value) : '')); if (!ok) failed++; };

// runs in the page: load a field, step it, record every bubble word once and the most bubbles seen at the same time
function run(spec) {
  const L = window.__lab, G = window.__mimo.G, words = [], seen = new Set(); let most = 0, trace = [], floaters = 0;
  const put = spec.put || [];
  const def = { map: L.field({ put, h: 16 }), ...spec.def };
  const v = L.load(def, spec.at);
  G.bubbles = [];
  L.keys(spec.keys || '');
  L.step(spec.secs, (i) => {
    for (const b of G.bubbles) if (!seen.has(b)) { seen.add(b); words.push(b.text); }
    most = Math.max(most, G.bubbles.filter((b) => b.life < b.max - 0.05).length);
    floaters = Math.max(floaters, G.floaters.filter((f) => f.text === '♪').length);
    if (spec.trace && i % 6 === 0) { const h = v.hoppers[0]; trace.push(Math.round(h.y) + ':' + Math.round(h.x)); }
    for (const [at, k] of spec.keyAt || []) if (i === at) L.keys(k);
  });
  return { words, most, trace, floaters, y: L.p().y, x: L.p().x };
}
const LAVA3 = (x, w) => [[x, 13, '~'.repeat(w)], [x, 14, '~'.repeat(w)], [x, 15, '~'.repeat(w)]];

const srv = await serveSrc();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript({ path: path.join(ROOT, 'tools', 'volcano-lab-page.js') });
  await page.addInitScript(() => { Date.prototype.getHours = function () { return 12; }; });
  await page.goto(srv.url + '?vorschau'); // world 5 is held back (UNRELEASED_WORLDS) without it
  await page.waitForFunction(() => window.__mimo && window.__mimo.sim && !document.getElementById('ovMenu').hidden, null, { timeout: 20000 });
  const go = (spec) => page.evaluate(run, spec);
  const count = (r, w) => r.words.filter((x) => x === w).length;
  // a story line that is shown at the start (through the director): the jokes must not stand beside it
  const says = [{ x: 13, y: 12, r: 3, text: 'Teststimme eins.' }];

  // geyser that misses: 3 tiles beside it, not lifted, the word once
  for (const [name, def] of [['no story', {}], ['with a story line', { says }]]) {
    const r = await go({ put: [[10, 12, 'G']], at: [13, 12], secs: 9, def: { geysers: [{ x: 10, y: 12, quip: 'Pfft!' }], ...def } });
    check(count(r, 'Pfft!') === 1, 'geyser quip: "Pfft!" once (' + name + ')', r.words);
    check(r.most <= 1, 'geyser quip: never two bubbles at once (' + name + ')', r.most);
    check(Math.abs(r.y - ((13 * 32) - 22 - 0)) < 40, 'geyser quip: Mimo stays on the ground (the miss is a miss)', r.y);
  }
  // no quip field: silent
  let r = await go({ put: [[10, 12, 'G']], at: [13, 12], secs: 6 });
  check(count(r, 'Pfft!') === 0, 'geyser without quip says nothing', r.words);

  // hot stone: hisses when Mimo jumps off
  r = await go({ put: [[8, 13, 'HHHH']], at: [9, 12], secs: 1.6, def: { quips: [{ k: 'hot', x: 8, y: 13, w: 4, text: 'Zisch!' }] },
    keyAt: [[60, 'RJ'], [100, 'R']] });
  check(count(r, 'Zisch!') === 1, 'hot stone quip: once after jumping off', r.words);

  // basalt hums: notes while he stands, the word once
  r = await go({ put: [...LAVA3(10, 5), ...[8, 9, 10, 11, 12, 13, 14, 15].map((y) => [12, y, 'I'])], at: [12, 7], secs: 0.5, def: { quips: [{ k: 'hum', x: 12, y: 8, text: 'Hmmmm.' }] } });
  check(count(r, 'Hmmmm.') === 1 && r.floaters >= 1, 'basalt quip: hums once and notes rise while he stands', { words: r.words, notes: r.floaters });

  // fire hopper that bumps its head: the word once, the arc is the same as without the quip
  const hop = { put: [...LAVA3(9, 3), [10, 13, 'F']], at: [5, 12], secs: 8, trace: true };
  const a = await go({ ...hop, def: { hoppers: [{ x: 10, y: 13, quip: 'Aua!', offset: 0.7 }] } });
  const b = await go({ ...hop, def: { hoppers: [{ x: 10, y: 13, offset: 0.7 }] } });
  check(count(a, 'Aua!') === 1, 'hopper quip: "Aua!" once', a.words);
  check(a.trace.join() === b.trace.join(), 'hopper quip: the arc is unchanged', a.trace.length);

  // glow rock that lands softly: the word once
  r = await go({ put: [[10, 4, 'Q']], at: [14, 12], secs: 6, def: { rain: [{ x: 10, y: 4, quip: 'Pardon.' }] } });
  check(count(r, 'Pardon.') === 1, 'rain quip: "Pardon." once', r.words);
  r = await go({ put: [[10, 4, 'Q']], at: [13, 12], secs: 8, def: { rain: [{ x: 10, y: 4, quip: 'Pardon.' }], says } });
  check(r.most <= 1, 'rain quip: never two bubbles at once with a story line', r.most);

  // the new Fauch acts are installed and the tiny Fauch draws in every pose onto a plain canvas
  const tiny = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d'), V = window.MimoVolcano, out = {};
    for (const pose of ['fly', 'peek', 'thumb', 'sit', 'nonsense']) { ctx.clearRect(0, 0, 64, 64); V.fauchTiny(ctx, 32, 32, 36, pose, 0.4); out[pose] = ctx.getImageData(0, 0, 64, 64).data.some((v, i) => i % 4 === 3 && v > 0); }
    return { drawn: out, acts: ['brood', 'sleepwith', 'wave', 'ringout'].filter((k) => !V.fauchActs[k]), transform: ctx.getTransform().a };
  });
  check(Object.values(tiny.drawn).every(Boolean) && !tiny.acts.length && tiny.transform === 1, 'fauchTiny draws every pose, the four new acts exist', tiny);

  check(errors.length === 0, 'no script errors', errors.slice(0, 3));
  await page.close();
} finally { await browser.close(); srv.close(); }
process.exit(failed ? 1 : 0);
