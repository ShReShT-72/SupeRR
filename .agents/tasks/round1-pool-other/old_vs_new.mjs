// Old submitted lists (scoring.mjs and analysis_data.json at 450bd1a) against the lists scoring.mjs gives now.
// Run from the repo root: node .agents/tasks/round1-pool-other/old_vs_new.mjs   (prints markdown, exits 1 on any difference)
import { execFileSync } from 'node:child_process';
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1e9 });
const oldSource = git(['show', '450bd1a:scoring.mjs']);
const oldData = JSON.parse(git(['show', '450bd1a:analysis_data.json']));
const oldRate = (await import(`data:text/javascript;base64,${Buffer.from(oldSource).toString('base64')}`)).ratePlayers;
const { ratePlayers } = await import(new URL('../../../scoring.mjs', import.meta.url).href);
const newData = JSON.parse(execFileSync(process.execPath, ['-e', "process.stdout.write(require('fs').readFileSync('analysis_data.json','utf8'))"], { encoding: 'utf8', maxBuffer: 1e9 }));
const before = oldRate(oldData.records);
const after = ratePlayers(newData.records);
let differences = 0;
const lines = [];
for (const kind of ['batters', 'bowlers', 'allrounders']) {
  const a = before[kind].slice(0, 10);
  const b = after[kind].slice(0, 10);
  const same = JSON.stringify(a) === JSON.stringify(b);
  const entered = b.filter((p) => !a.some((q) => q.playerId === p.playerId));
  const left = a.filter((p) => !b.some((q) => q.playerId === p.playerId));
  if (!same || entered.length || left.length) differences += 1;
  lines.push(`### ${kind}: ${same ? 'identical' : 'DIFFERENT'} (entered: ${entered.map((p) => p.player).join(', ') || 'none'}; left: ${left.map((p) => p.player).join(', ') || 'none'})`);
  lines.push('| Rank | Old list (450bd1a) | Index | New list | Index |', '|---:|---|---:|---|---:|');
  a.forEach((p, i) => lines.push(`| ${i + 1} | ${p.player} | ${p.score} | ${b[i].player} | ${b[i].score} |`));
  lines.push('');
}
lines.push(`eligible old ${before.batters.length}/${before.bowlers.length}/${before.allrounders.length}, new ${after.batters.length}/${after.bowlers.length}/${after.allrounders.length}`);
lines.push(`full ratePlayers output (all ranked players, all fields) byte-identical: ${JSON.stringify(before) === JSON.stringify(after)}`);
console.log(lines.join('\n'));
process.exit(differences || JSON.stringify(before) !== JSON.stringify(after) ? 1 : 0);
