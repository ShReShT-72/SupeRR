// Real `node analyze.mjs` (Node 20) must reproduce the committed analysis_data.json apart from generatedAt.
// Run from the repo root: node .agents/tasks/round1-pool-other/check_analyze.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(tmpdir(), 'analysis_regen.json');
execFileSync(process.execPath, ['analyze.mjs', `--out=${out}`], { stdio: 'ignore' });
const strip = (file) => readFileSync(file, 'utf8').replace(/"generatedAt":"[^"]*"/, '"generatedAt":""').replace(/\r\n/g, '\n').trim();
const same = strip(out) === strip('analysis_data.json');
console.log(`node ${process.version}: analyze.mjs output equals committed analysis_data.json apart from generatedAt: ${same}`);
process.exit(same ? 0 : 1);
