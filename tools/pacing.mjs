// Finds the dull stretches of a level: route commands that hold one unchanged input for a long time.
// A route is a recording of what a player does, so a long "W" (hands off) or a long single hold means
// the player waits or does one thing for that long.
//
// Usage: node tools/pacing.mjs [--from candidate.mjs] [--routes dir] [--world n] [--idle 4] [--hold 6]
//   --from    candidate file (default: the levels in src/)
//   --routes  folder with NN-fast.txt / NN-full.txt (default: tools/levels/routes/world<n>)
//   --idle    longest allowed stretch without any key, seconds (default 4)
//   --hold    longest allowed stretch of one unchanged input, seconds (default 6)
// Exit code 1 when a fast route breaks a limit (the full route only reports).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadLevels, parseArgs, ROOT } from './levels-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const world = Number(args.world) || 4, IDLE = Number(args.idle) || 4, HOLD = Number(args.hold) || 6;
const dir = path.resolve(String(args.routes || path.join(ROOT, 'tools/levels/routes/world' + world)));
const levels = (await loadLevels(args.from)).filter((l) => (l.world || 1) === world && !l.night && !l.bonus);
const first = Number(args.first) || 1;
let bad = 0;
for (const [i, lv] of levels.entries()) {
  const nn = String(i + first).padStart(2, '0');
  for (const kind of ['fast', 'full']) {
    const file = path.join(dir, nn + '-' + kind + '.txt');
    if (!fs.existsSync(file)) continue;
    const cmd = ['tools/levelbot.mjs', '--level', lv.name, '--route', file, '--json', ...(args.from ? ['--from', String(args.from)] : [])];
    let res; try { res = JSON.parse(execFileSync('node', cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch (e) { res = JSON.parse(e.stdout || '{}'); }
    const cmds = res.cmds || [], total = res.won ? res.won.t : 0;
    const long = cmds.map(([line, a, b]) => ({ line, a, d: +(b - a).toFixed(1), idle: /^[W-]\b/i.test(line) }))
      .filter((c) => (c.idle ? c.d > IDLE : c.d > HOLD));
    const idleSum = cmds.filter(([line]) => /^[W-]\b/i.test(line)).reduce((s, [, a, b]) => s + (b - a), 0);
    const flag = long.length ? 'LANG' : 'ok  ';
    if (long.length && kind === 'fast') bad++;
    console.log(`${flag} ${nn} ${lv.name.padEnd(18)} ${kind}  ${res.won ? total.toFixed(1) + ' s' : 'NICHT GEWONNEN'} · ohne Eingabe ${idleSum.toFixed(1)} s (${total ? Math.round(idleSum / total * 100) : 0} %)`);
    for (const c of long) console.log(`       ${c.d} s ab ${c.a} s: ${c.line}`);
  }
}
process.exit(bad ? 1 : 0);
