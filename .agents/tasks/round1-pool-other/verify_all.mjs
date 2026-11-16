// Compares scoring.mjs output (switch false = submitted, switch true = alternative) with the tables in the md and html.
// Run from the repo root: node .agents/tasks/round1-fixes3/verify_all.mjs
import fs from 'node:fs';
const root = 'c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/';
const src = fs.readFileSync(root + 'scoring.mjs', 'utf8');
const data = JSON.parse(fs.readFileSync(root + 'analysis_data.json', 'utf8'));
const sens = JSON.parse(fs.readFileSync(root + 'sensitivity_data.json', 'utf8'));
const mk = async (value) => (await import(`data:text/javascript;base64,${Buffer.from(src.replace(/const APPLY_PLAYER_EXCLUSIONS = \w+;/, `const APPLY_PLAYER_EXCLUSIONS = ${value};`)).toString('base64')}`)).ratePlayers;
const shipped = (await import(new URL('file:///' + root + 'scoring.mjs').href)).ratePlayers;
const submitted = shipped(data.records);
const alternative = (await mk(true))(data.records);
const swFalse = (await mk(false))(data.records);
const md = fs.readFileSync(root + 'methodology_report.md', 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(root + 'methodology_report.html', 'utf8').replace(/\r\n/g, '\n');

const n1 = (v) => v.toFixed(1);
const n2 = (v) => v.toFixed(2);
const out = [];
let mismatches = 0;
const say = (s) => { out.push(s); console.log(s); };

const expBat = (p, other) => [p.rank, p.player, n1(p.score), n1(p.pressureRate), n1(p.usualRate), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`, ...(other ? [other.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])];
const expBowl = (p, other) => [p.rank, p.player, n1(p.score), n2(p.pressureEconomy), n2(p.usualEconomy), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`, ...(other ? [other.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])];
const expAr = (p, other) => [p.rank, p.player, n1(p.score), n1(p.batting.index), n1(p.bowling.index), p.batting.pressureBalls, p.bowling.pressureBalls, p.batting.pressureMatches, p.bowling.pressureMatches, ...(other ? [other.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])];

function mdRowsAfter(startMarker) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => l.startsWith(startMarker));
  if (i < 0) throw new Error('md marker ' + startMarker);
  const rows = [];
  for (let k = i + 2; k < lines.length && lines[k].startsWith('|'); k += 1) rows.push(lines[k].slice(1, -1).split('|').map((c) => c.trim()));
  return rows;
}
function mdRowsBetween(marker) {
  const a = md.indexOf(`<!-- table:${marker} -->`); const b = md.indexOf(`<!-- /table:${marker} -->`);
  if (a < 0 || b < 0) throw new Error('md block ' + marker);
  return md.slice(a, b).split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const htmlCells = (chunk) => [...chunk.matchAll(/<tr>(.*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td>(.*?)<\/td>/g)].map((c) => decode(c[1]))).filter((r) => r.length);
function htmlRowsAfter(heading) {
  const i = html.indexOf(heading); if (i < 0) throw new Error('html heading ' + heading);
  const j = html.indexOf('</tbody>', i);
  return htmlCells(html.slice(i, j));
}
function htmlRowsBetween(marker) {
  const a = html.indexOf(`<!-- table:${marker} -->`); const b = html.indexOf(`<!-- /table:${marker} -->`);
  return htmlCells(html.slice(a, b));
}
function compare(label, expected, actual, { padRank = false } = {}) {
  let bad = 0;
  if (actual.length !== expected.length) { bad += 1; say(`  MISMATCH ${label}: ${actual.length} rows, expected ${expected.length}`); }
  expected.forEach((row, i) => {
    const want = row.map(String);
    if (padRank) want[0] = want[0].padStart(2, '0');
    const got = (actual[i] ?? []).map(String);
    if (JSON.stringify(want) !== JSON.stringify(got)) { bad += 1; say(`  MISMATCH ${label} row ${i + 1}: expected ${want.join(' | ')} / got ${got.join(' | ')}`); }
  });
  mismatches += bad;
  say(`${bad ? 'FAIL' : 'ok  '} ${label}: ${expected.length} rows compared, ${bad} mismatches`);
}

say('# Table check: scoring.mjs vs md and html');
say(`scoring.mjs switch as shipped: ${/const APPLY_PLAYER_EXCLUSIONS = (\w+);/.exec(src)[1]}`);
say(`shipped ratePlayers equals switch=false run: ${JSON.stringify(submitted) === JSON.stringify(swFalse)}`);
if (JSON.stringify(submitted) !== JSON.stringify(swFalse)) mismatches += 1;
say('');
say('## Submitted (no exclusions) top-10 lists');
for (const [key, label, exp, mdStart, htmlHead] of [
  ['batters', 'batters', (p) => expBat(p).slice(0, 9), '| Rank | Player | Pressure index | Pressure SR |', '<h2>Top 10 batters</h2>'],
  ['bowlers', 'bowlers', (p) => expBowl(p).slice(0, 9), '| Rank | Player | Pressure index | Pressure econ/6 |', '<h2>Top 10 bowlers</h2>'],
  ['allrounders', 'all-rounders', (p) => expAr(p), '| Rank | Player | Composite index |', '<h2>Top 10 all-rounders</h2>'],
]) {
  const expected = submitted[key].slice(0, 10).map((p) => exp(p));
  compare(`md ${label}`, expected, mdRowsAfter(mdStart));
  compare(`html ${label}`, expected, htmlRowsAfter(htmlHead), { padRank: true });
}
// the md row for the sensitivity-section alternative uses the same first header, so the first hit must be the top-10 section
say('');
say('## Alternative (exclusions on) top-10 lists with full metrics');
for (const [key, marker, exp, label] of [
  ['batters', 'exclusions_batters', expBat, 'batters'],
  ['bowlers', 'exclusions_bowlers', expBowl, 'bowlers'],
  ['allrounders', 'exclusions_allrounders', expAr, 'all-rounders'],
]) {
  const expected = alternative[key].slice(0, 10).map((p) => exp(p, submitted[key]));
  compare(`md alternative ${label}`, expected, mdRowsBetween(marker));
  compare(`html alternative ${label}`, expected, htmlRowsBetween(marker), { padRank: true });
}
say('');
say('## sensitivity_data.json');
for (const key of ['batters', 'bowlers']) {
  const a = sens.primaryCheck[key].map((p) => `${p.rank}|${p.player}|${p.index}`).join(';');
  const b = submitted[key].slice(0, 10).map((p) => `${p.rank}|${p.player}|${p.score}`).join(';');
  const c = sens.exclusionAlternative[key].top10.map((p) => `${p.rank}|${p.player}|${p.index}`).join(';');
  const d = alternative[key].slice(0, 10).map((p) => `${p.rank}|${p.player}|${p.score}`).join(';');
  say(`${a === b ? 'ok  ' : 'FAIL'} primaryCheck.${key} equals scoring.mjs (switch false)`);
  say(`${c === d ? 'ok  ' : 'FAIL'} exclusionAlternative.${key}.top10 equals scoring.mjs with the switch set to true`);
  if (a !== b) mismatches += 1; if (c !== d) mismatches += 1;
}
{
  const a = sens.exclusionAlternative.allrounders.top10.map((p) => `${p.rank}|${p.player}|${p.index}`).join(';');
  const b = alternative.allrounders.slice(0, 10).map((p) => `${p.rank}|${p.player}|${p.score}`).join(';');
  say(`${a === b ? 'ok  ' : 'FAIL'} exclusionAlternative.allrounders.top10 equals scoring.mjs with the switch set to true`);
  if (a !== b) mismatches += 1;
}
say(`flip edit flag in json: ${sens.exclusionFlip.editCheckedBySensitivityScript}`);
say('');
// side-by-side tables
say('## Side-by-side table (submitted vs alternative)');
for (const key of ['batters', 'bowlers']) {
  const expected = submitted[key].slice(0, 10).map((p, i) => [i + 1, p.player, n1(p.score), alternative[key][i].player, n1(alternative[key][i].score)]);
  compare(`md side-by-side ${key}`, expected, mdRowsAfter(`| Rank | Submitted ${key} (no exclusions)`));
  const hi = html.indexOf(`SUBMITTED ${key.toUpperCase()} (NO EXCLUSIONS)`);
  const hj = html.indexOf('</tbody>', hi);
  compare(`html side-by-side ${key}`, expected, htmlCells(html.slice(hi, hj)), { padRank: true });
}
say('');
say(`TOTAL MISMATCHES: ${mismatches}`);
fs.writeFileSync(new URL('./verify_all_output.txt', import.meta.url), out.join('\n') + '\n');
process.exit(mismatches ? 1 : 0);
