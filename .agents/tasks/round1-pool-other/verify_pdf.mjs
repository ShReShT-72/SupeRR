// Checks that every expected table row (from scoring.mjs, both switch settings) appears in the PDF text as consecutive cells.
// Run from the repo root after: python -X utf8 .agents/tasks/round1-fixes/pdfx_edge.py methodology_report.pdf > .agents/tasks/round1-fixes3/pdf_text.txt
import fs from 'node:fs';
const root = 'c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/';
const textFile = process.argv[2] ?? root + '.agents/tasks/round1-fixes3/pdf_text.txt';
const raw = fs.readFileSync(textFile, 'utf8').replace(/^\uFEFF/, '');
const pages = raw.split(/=== PAGE (\d+) ===/);
// pages = ['', '1', text1, '2', text2, ...]
const pageText = new Map();
for (let i = 1; i < pages.length; i += 2) pageText.set(Number(pages[i]), pages[i + 1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
const all = [...pageText.entries()].flatMap(([page, lines]) => lines.map((line) => ({ page, line })));
const lines = all.map((x) => x.line);

const src = fs.readFileSync(root + 'scoring.mjs', 'utf8');
const data = JSON.parse(fs.readFileSync(root + 'analysis_data.json', 'utf8'));
const mk = async (value) => (await import(`data:text/javascript;base64,${Buffer.from(src.replace(/const APPLY_PLAYER_EXCLUSIONS = \w+;/, `const APPLY_PLAYER_EXCLUSIONS = ${value};`)).toString('base64')}`)).ratePlayers;
const submitted = (await mk(false))(data.records);
const alternative = (await mk(true))(data.records);
const n1 = (v) => v.toFixed(1);
const n2 = (v) => v.toFixed(2);
const pad = (r) => String(r).padStart(2, '0');
const bat = (p, o) => [pad(p.rank), p.player, n1(p.score), n1(p.pressureRate), n1(p.usualRate), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`, ...(o ? [o.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])].map(String);
const bowl = (p, o) => [pad(p.rank), p.player, n1(p.score), n2(p.pressureEconomy), n2(p.usualEconomy), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`, ...(o ? [o.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])].map(String);
const ar = (p, o) => [pad(p.rank), p.player, n1(p.score), n1(p.batting.index), n1(p.bowling.index), p.batting.pressureBalls, p.bowling.pressureBalls, p.batting.pressureMatches, p.bowling.pressureMatches, ...(o ? [o.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'] : [])].map(String);

function findSeq(seq, from = 0) {
  for (let i = from; i <= lines.length - seq.length; i += 1) if (seq.every((cell, k) => lines[i + k] === cell)) return i;
  return -1;
}
const out = [];
let missing = 0;
const say = (s) => { out.push(s); console.log(s); };
function checkTable(label, rows) {
  let bad = 0;
  let cursor = 0;
  const pagesUsed = new Set();
  for (const row of rows) {
    const at = findSeq(row, cursor);
    if (at < 0) { bad += 1; say(`  MISSING in order: ${row.join(' | ')}`); continue; }
    cursor = at + row.length;
    pagesUsed.add(all[at].page);
  }
  missing += bad;
  say(`${bad ? 'FAIL' : 'ok  '} PDF ${label}: ${rows.length} rows, ${bad} missing, page(s) ${[...pagesUsed].join(',')}`);
}
// Table order in the PDF: top-10 batters, bowlers, all-rounders, ... side-by-side, alternative tables. The in-order search is per table.
checkTable('top 10 batters (submitted)', submitted.batters.slice(0, 10).map((p) => bat(p).slice(0, 9)));
checkTable('top 10 bowlers (submitted)', submitted.bowlers.slice(0, 10).map((p) => bowl(p).slice(0, 9)));
checkTable('top 10 all-rounders (submitted)', submitted.allrounders.slice(0, 10).map((p) => ar(p)));
checkTable('alternative batters (exclusions on)', alternative.batters.slice(0, 10).map((p) => bat(p, submitted.batters)));
checkTable('alternative bowlers (exclusions on)', alternative.bowlers.slice(0, 10).map((p) => bowl(p, submitted.bowlers)));
checkTable('alternative all-rounders (exclusions on)', alternative.allrounders.slice(0, 10).map((p) => ar(p, submitted.allrounders)));
for (const key of ['batters', 'bowlers']) {
  checkTable(`side-by-side ${key}`, submitted[key].slice(0, 10).map((p, i) => [pad(i + 1), p.player, n1(p.score), alternative[key][i].player, n1(alternative[key][i].score)]));
}
const joined = lines.join(' ');
for (const phrase of ['The submitted ranking uses only the supplied data', 'kept only on the dashboard and is outside the Round 1 submission', 'Switch the exclusions on']) {
  const ok = joined.replace(/\s+/g, ' ').includes(phrase);
  say(`${ok ? 'ok  ' : 'FAIL'} PDF contains: "${phrase}"`);
  if (!ok) missing += 1;
}
for (const phrase of ['Flip the exclusions', 'primary lists below exclude', 'No-exclusion top 10 lists', '60 / 122 / 11']) {
  const present = joined.replace(/\s+/g, ' ').includes(phrase);
  const expected = phrase === '60 / 122 / 11' ? 'only in the before-fixes row' : 'absent';
  say(`${present ? (phrase === '60 / 122 / 11' ? 'info' : 'FAIL') : 'ok  '} PDF ${expected}: "${phrase}" present=${present}`);
  if (present && phrase !== '60 / 122 / 11') missing += 1;
}
say(`PDF pages: ${pageText.size}; total missing/failed: ${missing}`);
fs.writeFileSync(new URL('./verify_pdf_output.txt', import.meta.url), out.join('\n') + '\n');
process.exit(missing ? 1 : 0);
