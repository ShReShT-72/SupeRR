// index.html default view (rendered by headless Edge from the live dashboard.js + scoring.mjs: dump saved by the caller), static radar rows and README
// against scoring.mjs run on the committed analysis_data.json.
// Run from the repo root: node .agents/tasks/round1-pool-other/verify_index.mjs <dom_dump.html>
import fs from 'node:fs';
const root = 'c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/';
const read = (f) => fs.readFileSync(root + f, 'utf8').replace(/\r\n/g, '\n');
const data = JSON.parse(read('analysis_data.json'));
const { ratePlayers } = await import(new URL('file:///' + root + 'scoring.mjs').href);
const defaults = ratePlayers(data.records);
const ipl = ratePlayers(data.records, { format: 'IPL', season: 'All' });
const ipl26 = ratePlayers(data.records, { format: 'IPL', season: '2026' });
const out = [];
let fails = 0;
const check = (label, ok, detail = '') => { if (!ok) fails += 1; const l = `${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` (${detail})` : ''}`; out.push(l); console.log(l); };

// 1. default dashboard view (rendered DOM)
const dom = fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '');
const rows = [...dom.matchAll(/aria-label="Rank (\d+), ([^,]+), pressure index ([\d.]+)"/g)].map((m) => `${m[1]}|${m[2]}|${Number(m[3])}`);
const want = defaults.batters.slice(0, 10).map((p) => `${p.rank}|${p.player}|${p.score}`);
check(`default view: ${rows.length} ranking rows equal scoring.mjs top-10 batters`, JSON.stringify(rows) === JSON.stringify(want), `${rows.join(';')} vs ${want.join(';')}`);
const txt = (id) => new RegExp(`id="${id}"[^>]*>([^<]*)<`).exec(dom)?.[1];
check('default view: matches 837', txt('matchCount') === String(data.dataQuality.matches).replace(/\B(?=(\d{3})+(?!\d))/g, ','), txt('matchCount'));
const total = data.dataQuality.pressureDeliveries + data.dataQuality.ordinaryDeliveries;
check('default view: deliveries 193,988', txt('deliveryCount') === total.toLocaleString('en-US'), txt('deliveryCount'));
check('default view: pressure balls 81,806', txt('pressureCount').startsWith(data.dataQuality.pressureDeliveries.toLocaleString('en-US')), txt('pressureCount'));
check('default view: 66 eligible', txt('eligibleCount').startsWith(String(defaults.batters.length)), txt('eligibleCount'));
check('default view: profile panel shows rank 1 player', new RegExp(`id="profileName">${defaults.batters[0].player}<`).test(dom));

// 2. static rows of the Royal Radar table (dashboard only, outside Round 1): IPL index, sample and 2026 values
const index = read('index.html');
const radarRows = [...index.matchAll(/<tr><td><strong class="fit-[a-z]+">[^<]*<\/strong><\/td><td><strong>([^<]+)<\/strong>.*?<\/td><td>[^<]*<\/td><td>([\d.]+)<\/td><td>(\d+) balls · (\d+) matches<\/td><td>([^<]*)<\/td>/g)];
let radarBad = 0;
for (const r of radarRows) {
  const [, name, idx, balls, matches, output] = r;
  const found = [...ipl.batters, ...ipl.bowlers, ...defaults.batters, ...defaults.bowlers].filter((p) => p.player.includes(name) || name.includes(p.player.split(' ').slice(-1)[0]) && p.player.includes(name.split(' ')[0]));
  const ok = found.some((p) => p.score === Number(idx) && p.pressureBalls === Number(balls) && p.pressureMatches === Number(matches));
  const m26 = /IPL index ([\d.]+) \((\d{4}), (\d+) balls\)/.exec(output);
  const ok26 = !m26 || [...ipl26.batters, ...ipl26.bowlers].some((p) => (p.player.includes(name) || name.includes(p.player)) && p.score === Number(m26[1]) && p.pressureBalls === Number(m26[3]));
  if (!ok || !ok26) { radarBad += 1; console.log(`  radar row ${name}: index ${idx} ${balls}b ${matches}m output "${output}" -> ${ok ? '' : 'index/sample'} ${ok26 ? '' : '2026'} mismatch`); }
}
check(`static radar rows: ${radarRows.length} rows equal scoring.mjs (IPL or all-format index, sample, 2026 values)`, radarRows.length === 10 && radarBad === 0, `${radarBad} bad`);
const nitish = ipl26.allrounders.find((p) => p.player.includes('Nitish Reddy'));
check('static note: Nitish Reddy IPL-2026 all-rounder composite 51.5, batting 53.0, bowling 50.0', !!nitish && nitish.score === 51.5 && nitish.batting.index === 53 && nitish.bowling.index === 50 && index.includes('composite 51.5, batting 53.0, bowling 50.0'));
check('index.html: Outside Round 1 notice kept', index.includes('OUTSIDE ROUND 1'));

// 3. README figures
const readme = read('README.md');
check('README: switch on line 6 of scoring.mjs', /APPLY_PLAYER_EXCLUSIONS = false;/.test(read('scoring.mjs').split('\n')[5]) && readme.includes('(line 6)') && readme.includes('switch on line 6'));
check('README: 53 Pakistan T20I players, five IPL retirees', readme.includes('53 Pakistan T20I players') && readme.includes('five IPL retirees'));
for (const word of ['other_evidence.mjs', 'other_evidence_data.json', 'pool_methods.mjs', 'pool_methods_data.json', 'pool_preregistration.md', '--pool-methods', 'POOL_METHOD', '--write']) check(`README mentions ${word}`, readme.includes(word));
for (const f of ['other_evidence.mjs', 'other_evidence_data.json', 'pool_methods.mjs', 'pool_methods_data.json', 'pool_preregistration.md']) check(`file listed in README exists: ${f}`, fs.existsSync(root + f));
const readmeText = readme.toLowerCase();
check('README names no top-10 list that differs from scoring.mjs (it holds no player lists)', !/rishabh pant|sanju samson/.test(readmeText));
check('index.html step 01 and 07 name the tested decisions', /Compare like with like[\s\S]{0,400}own pool/.test(index) && /Test how stable the lists are[\s\S]{0,900}kept the submitted method/.test(index));
out.push(`\nINDEX/README FAILS: ${fails}`);
console.log(`INDEX/README FAILS: ${fails}`);
fs.writeFileSync(new URL('./verify_index_output.txt', import.meta.url), out.join('\n') + '\n');
process.exit(fails ? 1 : 0);
