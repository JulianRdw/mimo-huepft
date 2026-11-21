// Checks level maps for things that make no sense (thorns buried in the ground, floating flags, missing door ...)
// and prints an overview (size, mechanics, stars) to judge the difficulty curve.
// Usage: node tools/levellint.mjs [--from candidate.js] [--level name|index]
import { loadLevels, pickLevel, parseArgs, srcWorlds, worldChars } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const all = await loadLevels(args.from);
const { worlds, coreChars } = srcWorlds();
const list = args.level ? [pickLevel(all, args.level)] : all.map((def, index) => ({ def, index }));

const BASE_GROUND = new Set(['#', 'i', 'c', 'L', 'a', 'b', 'g']); // blocks you stand on and cannot pass
const BASE_STANDABLE = new Set([...BASE_GROUND, '-', 'T']);
const BASE_MECH = { '-': 'Bretter', '^': 'Dornen', v: 'Deckendornen', c: 'Bröselsteine', s: 'Schalter', a: 'Schaltblöcke', b: 'Schaltblöcke', k: 'Schlüssel', L: 'Schloss', '>': 'Wind', '<': 'Wind', A: 'Aufwind', 8: 'Aufwind', i: 'Eis', T: 'Taktdornen', g: 'Glühwürmchen', e: 'Schnecken', u: 'Pilze', f: 'Fahnen', h: 'Geheimstern' };
const NAMES = { P: 'Start', D: 'Tür', f: 'Fahne', s: 'Schalter', u: 'Pilz', e: 'Schnecke' }; // a key may float, it is picked up in the air
const TOGGLE = new Set(['a', 'b']);

let problems = 0;
for (const { def, index } of list) {
  // map characters of a world module: what counts as ground, and their names for the overview
  const own = worldChars(worlds, def.world || 1), GROUND = new Set(BASE_GROUND), STANDABLE = new Set(BASE_STANDABLE), MECH = { ...BASE_MECH };
  // a world may let some things float (jellyfish in the water of world 4): lint: { floating: 'u' }
  const wmod = worlds.find((x) => x.world === (def.world || 1)), floating = (wmod && wmod.lint && wmod.lint.floating) || '';
  for (const [ch, c] of Object.entries(own)) { if (c.kind === 'ground') GROUND.add(ch); if (c.kind === 'ground' || c.kind === 'standable') STANDABLE.add(ch); if (c.name) MECH[ch] = c.name; }
  const rows = def.map, h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const at = (x, y) => (y < 0 || y >= h || x < 0 ? ' ' : rows[y][x] || ' ');
  const out = [], count = {}, mech = new Set(), notes = new Set();
  const moverAt = (x, y) => (def.movers || []).some((m) => y === m.y && x >= m.x && x < m.x + m.w);
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) out.push('Zeile ' + y + ' ist ' + rows[y].length + ' statt ' + w + ' Zeichen lang');
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      count[c] = (count[c] || 0) + 1;
      if (MECH[c]) mech.add(MECH[c]);
      if (!coreChars.includes(c) && !own[c]) out.push('Unbekanntes Kartenzeichen "' + c + '" bei ' + x + ',' + y);
      if ((c === '^' || c === 'T') && GROUND.has(at(x, y - 1)) && !TOGGLE.has(at(x, y - 1))) out.push('Dorn bei ' + x + ',' + y + ' liegt unter Boden (darüber "' + at(x, y - 1) + '")');
      if ((c === '^' || c === 'T') && TOGGLE.has(at(x, y - 1))) notes.add('Dornen unter Schaltblöcken (Falle, nur sinnvoll wenn der Schalter sie öffnet)');
      if (c === 'v' && GROUND.has(at(x, y + 1))) out.push('Deckendorn bei ' + x + ',' + y + ' steckt im Boden (darunter "' + at(x, y + 1) + '")');
      if (NAMES[c] && !floating.includes(c) && !STANDABLE.has(at(x, y + 1)) && !moverAt(x, y + 1)) out.push(NAMES[c] + ' bei ' + x + ',' + y + ' schwebt (darunter "' + at(x, y + 1) + '")');
      if ((c === '*' || c === 'h') && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].every((n) => GROUND.has(n))) out.push('Stern bei ' + x + ',' + y + ' ist rundum eingemauert');
    }
  }
  const stars = (count['*'] || 0) + (count['8'] || 0);
  if ((count.P || 0) !== 1) out.push('Start (P) ' + (count.P || 0) + '× statt 1×');
  if ((count.D || 0) !== 1) out.push('Tür (D) ' + (count.D || 0) + '× statt 1×');
  if (stars !== 3) out.push(stars + ' Sterne statt 3');
  if ((count.h || 0) > 1) out.push('mehr als ein Geheimstern');
  if (count.L && !count.k) out.push('Schloss ohne Schlüssel');
  if (!!count.s !== !!(count.a || count.b)) out.push('Schalter und Schaltblöcke gehören zusammen');
  if (h < 12) out.push('nur ' + h + ' Zeilen hoch (mindestens 12)');
  problems += out.length;
  const flags = count.f || 0;
  console.log((out.length ? '✗ ' : '✓ ') + String(index + 1).padStart(2) + ' ' + def.name + ' (Welt ' + (def.world || 1) + (def.night ? ', Nacht' : def.bonus ? ', Bonus' : '') + ') · ' + w + '×' + h + ' · Fahnen ' + flags +
    ' · Beweger ' + (def.movers || []).length + (def.chase ? ' · Verfolgung ' + def.chase.speed : '') + ' · ' + ([...mech].filter((m) => m !== 'Fahnen').join(', ') || 'nur Springen'));
  for (const o of out) console.log('     ' + o);
  for (const n of notes) console.log('     Hinweis: ' + n);
}
console.log(problems ? problems + ' Auffälligkeit(en)' : 'keine Auffälligkeiten');
process.exit(problems ? 1 : 0);
