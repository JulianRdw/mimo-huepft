// Plays every level of the game (src/) with its stored routes and checks that each one is solved cleanly.
// Routes live in tools/levels/routes/world<W>/<NN>-full.txt and <NN>-fast.txt (NN = place within the world, 01 ...;
// the night level uses night-full.txt / night-fast.txt, a bonus level of a world module bonus-full.txt / bonus-fast.txt).
// "full" must collect all 3 stars (and the secret star if the level has one), "fast" is the quickest clean way to the door
// and sets the medal times. Worlds 4 and up (src/worlds/) are checked the same way, routes in routes/world4/ ...
// Usage: node tools/levelcheck.mjs [--medals] [--world n]
//   --medals prints the MEDALS line for src/index.html and, per world module, the medals for its level definitions
//   --world only checks the levels of that world
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, srcWorlds, parseArgs } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const { levels, core } = srcWorlds();
const ROUTES = path.join(ROOT, 'tools', 'levels', 'routes');
const perWorld = {};
let failed = 0;
const medals = [];
const roundGold = (t) => Math.ceil(t * 2) / 2;

for (let i = 0; i < levels.length; i++) {
  const def = levels[i], w = def.world || 1;
  const nn = def.night ? 'night' : def.bonus ? 'bonus' : String((perWorld[w] = (perWorld[w] || 0) + 1)).padStart(2, '0');
  if (args.world && Number(args.world) !== w) { medals.push(null); continue; }
  const hasSecret = def.map.some((r) => r.includes('h'));
  const result = {};
  for (const kind of ['full', 'fast']) {
    const file = path.join(ROUTES, 'world' + w, nn + '-' + kind + '.txt');
    if (!fs.existsSync(file)) { result[kind] = { ok: false, line: 'route missing: ' + path.relative(ROOT, file) }; continue; }
    const out = execFileSync('node', [path.join(ROOT, 'tools', 'levelbot.mjs'), '--level', String(i), '--route', file, '--json'], { encoding: 'utf8' });
    const r = JSON.parse(out);
    const stars = r.stars.got.length === r.stars.total, secret = !hasSecret || r.secret === 'got';
    const ok = !!r.won && r.deaths.length === 0 && r.errors.length === 0 && (kind === 'fast' || (stars && secret));
    result[kind] = { ok, clock: r.won ? r.won.clock : null, line: (r.won ? r.won.clock + ' s' : 'not won') + ' · deaths ' + r.deaths.length + ' · stars ' + r.stars.got.length + '/' + r.stars.total + (hasSecret ? ' · secret ' + r.secret : '') + (r.errors.length ? ' · errors ' + r.errors.join(' | ') : '') };
  }
  const ok = result.full.ok && result.fast.ok;
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + String(i + 1).padStart(2) + ' ' + def.name.padEnd(18) + ' full ' + result.full.line + ' | fast ' + result.fast.line);
  const t = result.fast.clock;
  medals.push(t ? [roundGold(t * 1.3), Math.round(t * 2), Math.round(t * 3)] : [0, 0, 0]);
}
const fmt = (m) => JSON.stringify(m).replace(/],\[/g, '], [').replace(/,(?=\d)/g, ', ');
if (args.medals && medals.slice(0, core).every(Boolean)) console.log('const MEDALS = ' + fmt(medals.slice(0, core)) + ';');
if (args.medals) for (let i = core; i < levels.length; i++) if (medals[i]) console.log('Welt ' + levels[i].world + ' · ' + levels[i].name + ': medals: ' + fmt(medals[i]) + ',');
console.log(failed ? failed + ' level(s) failed' : 'all levels pass');
process.exit(failed ? 1 : 0);
