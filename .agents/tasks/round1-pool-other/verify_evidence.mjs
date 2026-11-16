// Checks the numbers of the two decisions (the `other` extras type and the thin T20I pools) in md, html and, if given, the PDF text,
// against other_evidence_data.json, pool_methods_data.json and live scoring.mjs runs on the committed analysis_data.json.
// Run from the repo root: node .agents/tasks/round1-pool-other/verify_evidence.mjs [pdf_text.txt]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = 'c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/';
const read = (f) => fs.readFileSync(root + f, 'utf8').replace(/\r\n/g, '\n');
const oeFull = JSON.parse(read('other_evidence_data.json'));
const oe = oeFull.allMatches;
const oeScope = JSON.parse(read('other_evidence_data.json')).inScopeMatches;
const pm = JSON.parse(read('pool_methods_data.json'));
const data = JSON.parse(read('analysis_data.json'));
const sens = JSON.parse(read('sensitivity_data.json'));
const src = read('scoring.mjs');
const md = read('methodology_report.md');
const html = read('methodology_report.html');
const readme = read('README.md');
const mk = async (value) => (await import(`data:text/javascript;base64,${Buffer.from(src.replace(/const APPLY_PLAYER_EXCLUSIONS = \w+;/, `const APPLY_PLAYER_EXCLUSIONS = ${value};`)).toString('base64')}`)).ratePlayers;
const rateS1 = await mk(false);
const rateS2 = await mk(true);

const out = [];
let fails = 0;
const say = (s) => { out.push(s); console.log(s); };
const check = (label, ok, detail = '') => { if (!ok) fails += 1; say(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` (${detail})` : ''}`); };

// ---------- text normalisation ----------
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x2013;/g, '–').replace(/&#x2014;/g, '—').replace(/&amp;/g, '&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const mdText = squash(md.replace(/`/g, '').replace(/\*\*/g, '').replace(/(^|[^\w])\*([^*\n]+)\*/g, '$1$2').replace(/\\\|/g, '|'));
const htmlText = squash(decode(html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')));
let pdfText = null;
if (process.argv[2]) pdfText = squash(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '').replace(/=== PAGE \d+ ===/g, ' '));
const surfaces = [['md', mdText], ['html', htmlText], ...(pdfText ? [['pdf', pdfText]] : [])];

const phrases = [];
const P = (text) => phrases.push(text);

// ---------- numbers from the data ----------
const hit = oe.T1_freeHit.byTypeOfPreviousBall;
const flt = (x) => Number(x).toExponential(1);
const m = pm.methods;
const base = m[0].metrics;
const [c1, c2, c3] = [m[1], m[2], m[3]];
const f3 = (x) => x.toFixed(3);
const f4 = (x) => x.toFixed(4);
const reg = oe.T4c_regression;
const o = reg.main.coefficients.other;
const ov = reg.main.coefficients.Overstep;
const fr = (c) => `${c.robustHC1CI95[0].toFixed(2)} to ${c.robustHC1CI95[1].toFixed(2)}`;

// other: free hit, own-row dismissals, over length, innings length
P(`it happened ${hit.other.nonRunOutWicketOnNextBall} times in ${hit.other.n} (about ${hit.other.expectedAtNoneRate} expected, P = ${flt(hit.other.exactBinomialProbabilityOfThisFewOrFewer)})`);
P(`after an Overstep row ${hit.Overstep.nonRunOutWicketOnNextBall} times in ${hit.Overstep.n}`);
P(`After a normal ball that happens ${(oe.T1_freeHit.baseRate * 100).toFixed(2)}% of the time`);
P(`All three wickets on other rows are run-outs, as are all five on Overstep rows`);
const per = oe.T3_overLength.legalBallsPerOver_ifOtherIsLegal_notLastOvers;
P(`${per[7]} of the ${oe.T3_overLength.oversWithAnOtherRow_excludingLastOverOfInnings} overs that contain one and are not the last over of an innings would have seven legal balls, ${per[8]} would have eight and ${per[9]} would have nine`);
P(`every one of the ${oe.T3_overLength.interpretationAB_otherIsIllegal.oversWithExactlySixLegalBalls} has six`);
P(`Of the ${oe.T3b_inningsBallCount.withOtherRow.innings} innings with an other row that must have used all 20 overs`);
P(`${oe.T3b_inningsBallCount.withOtherRow.legal120_AB} have exactly 120 legal balls under a and b and none do under c`);
P(`it equals the row number within the innings on ${oeFull.T0_fieldAudit.inningsBallNumEqualsRowIndexInInnings.replace(/\d+/g, (d) => Number(d).toLocaleString('en-US'))} rows`);
// other: regression
P(`Matches are the ${reg.main.n} won by runs`);
P(`${reg.main.ofWhichWithAnOtherRow} contain an other row`);
P(`The other coefficient in the main fit is ${o.estimate.toFixed(2)}, with a 95% interval of ${fr(o)} (z = ${o.robustZvs0.toFixed(1)} against 0 and ${o.robustZvs1.toFixed(1)} against 1)`);
P(`the Overstep control, ${ov.estimate.toFixed(2)} (${fr(ov)}), contains 1`);
P(`(${reg.main.coefficients.wide.estimate.toFixed(2)}, ${reg.main.coefficients.legbyes.estimate.toFixed(2)} and ${reg.main.coefficients.byes.estimate.toFixed(2)})`);
P(`the residual standard deviation is ${reg.main.residualSD.toFixed(1)} runs`);
const ex = oe.T4a_T4b_marginReconstruction;
P(`reproduced exactly in ${ex.exactMargin.a.all} of ${ex.counts.runWonMatches} matches under a and ${ex.exactMargin.b.all} of ${ex.counts.runWonMatches} under b and c`);
const mWith = ex.runWonMatchesWithOtherRow[0];
P(`India won by 61 runs) gives a difference of ${mWith.marginDiff.a} with the penalty run and ${mWith.marginDiff.b} without it`);
P(`fit the target in ${ex.wicketChaseEndConsistency.a.ok} of ${ex.counts.chaseWonMatches} under a and ${ex.wicketChaseEndConsistency.b.ok} of ${ex.counts.chaseWonMatches} under b and c`);
P(`which is ${o.robustZvs0.toFixed(1)} standard errors away`);
P(`coefficient 1.11, 95% interval 0.66 to 1.56`);
P(`puts the value of an other extra at ${o.estimate.toFixed(2)} runs (95% interval ${fr(o)}), against ${ov.estimate.toFixed(2)} for the Overstep control`);
check('prose 1.11 / 0.66 / 1.56 / 0.90 equal the regression data', o.estimate.toFixed(2) === '1.11' && fr(o) === '0.66 to 1.56' && ov.estimate.toFixed(2) === '0.90');
check('rule verdicts are a in all four fits', [reg.ruleOnMain.verdict, reg.ruleWithoutExtras2.verdict, reg.ruleDropFive.verdict, oeScope.T4c_regression.ruleOnMain.verdict].every((v) => v === 'a'));
check('control valid in all four fits', [reg.ruleOnMain.controlValid, reg.ruleWithoutExtras2.controlValid, reg.ruleDropFive.controlValid, oeScope.T4c_regression.ruleOnMain.controlValid].every(Boolean));

// pool: results
const ev = pm.decision.evaluation;
const mv = (c, cell) => c.metrics[cell[0]][cell[1]];
const ratio = (c, cell) => mv(c, cell).M1_poolThinningError / mv(m[0], cell).M1_poolThinningError;
const cells = [['S1', 'batters'], ['S1', 'bowlers'], ['S2', 'batters'], ['S2', 'bowlers']];
P(`for S1 batters (ratio ${f3(ratio(c1, cells[0]))})`);
P(`falls from ${f3(mv(m[0], cells[3]).M2a_top10RetentionPoolDeletion)} to ${f3(mv(c1, cells[3]).M2a_top10RetentionPoolDeletion)} and the leave-one-out exit rate for batters doubles from ${f4(mv(m[0], cells[2]).M4_leaveOneOutExitRate)} to ${f4(mv(c1, cells[2]).M4_leaveOneOutExitRate)}`);
const c2r = cells.map((cell) => ratio(c2, cell));
P(`(ratios ${f3(Math.min(...c2r))} to ${f3(Math.max(...c2r))})`);
const rise = ev['shrunk'].failedRules.find((r) => r.startsWith('2:')).match(/M2 rise ([\d.]+), M3 relative fall ([\d.]+)/);
P(`S2 batter retention rises by only ${rise[1]} and rank displacement falls by ${(Number(rise[2]) * 100).toFixed(1)}%`);
P(`S2 bowler retention falls from ${f3(mv(m[0], cells[3]).M2a_top10RetentionPoolDeletion)} to ${f3(mv(c2, cells[3]).M2a_top10RetentionPoolDeletion)} and the exit rate rises from ${f4(mv(m[0], cells[3]).M4_leaveOneOutExitRate)} to ${f4(mv(c2, cells[3]).M4_leaveOneOutExitRate)}`);
const r5i = ev['shrunk'].failedRules.find((r) => r.startsWith('5: large-pool index')).match(/index change ([\d.]+) \(([^)]+?) \(batter\)\)/);
const r5r = ev['shrunk'].failedRules.find((r) => r.startsWith('5: large-pool rank')).match(/rank change (\d+) \(([^)]+?) \(bowler\)\)/);
P(`in S1 ${r5i[2]}'s index changes by ${r5i[1]} points and ${r5r[2]}'s rank by ${r5r[1]} places`);
P(`gives no gain for S1 batters (${f3(ratio(c3, cells[0]))}) and only ${f3(ratio(c3, cells[1]))} for S1 bowlers`);
P(`batter retention falls from ${f3(mv(m[0], cells[2]).M2a_top10RetentionPoolDeletion)} to ${f3(mv(c3, cells[2]).M2a_top10RetentionPoolDeletion)} and the exit rate rises from ${f4(mv(m[0], cells[2]).M4_leaveOneOutExitRate)} to ${f4(mv(c3, cells[2]).M4_leaveOneOutExitRate)}`);
P(`(for example r = ${f3(base.S1.batters.M5_allPairs.r)} for S1 batters over ${base.S1.batters.M5_allPairs.pairs} season pairs)`);
check('pool decision is KEEP_CURRENT and nobody passes', pm.decision.result === 'KEEP_CURRENT' && pm.decision.passers.length === 0);
check('failed rules by candidate (C1: 1,3; C2: 2,3,5; C3: 1,3)', ['format-fallback', 'shrunk', 'adjacent-fallback'].map((k) => [...new Set(ev[k].failedRules.map((r) => r.split(':')[0]))].sort().join(',')).join(' / ') === '1,3 / 2,3,5 / 1,3');
check('M5 intervals span zero for batters', [m[0], c1, c2, c3].every((c) => ['S1', 'S2'].every((s) => c.metrics[s].batters.M5_allPairs.ci95[0] < 0 && c.metrics[s].batters.M5_allPairs.ci95[1] > 0)));
check('M5 intervals span zero for bowlers', [m[0], c1, c2, c3].every((c) => ['S1', 'S2'].every((s) => c.metrics[s].bowlers.M5_allPairs.ci95[0] < 0 && c.metrics[s].bowlers.M5_allPairs.ci95[1] > 0)));

// pool: live scoring.mjs runs with every pool method (lists in pool_methods_data.json must be what scoring.mjs gives)
const key = (p) => `${p.rank}|${p.player}|${p.score}`;
for (const method of m) {
  for (const [setting, rate] of [['S1', rateS1], ['S2', rateS2]]) {
    const live = rate(data.records, { poolMethod: method.method });
    for (const kind of ['batters', 'bowlers', 'allrounders']) {
      const want = live[kind].slice(0, 10).map(key).join(';');
      const got = method.top10[setting][kind].map((p) => `${p.rank}|${p.player}|${p.index ?? p.score}`).join(';');
      check(`pool_methods_data.json ${method.method} ${setting} ${kind} top 10 equals scoring.mjs poolMethod run`, want === got, `want ${want} got ${got}`);
    }
  }
}
const defaultRun = rateS1(data.records);
const ownRun = rateS1(data.records, { poolMethod: 'own-pool' });
check('scoring.mjs default equals own-pool, and POOL_METHOD is own-pool', JSON.stringify(defaultRun) === JSON.stringify(ownRun) && /const POOL_METHOD = 'own-pool';/.test(src));
check('eligible counts equal for every pool method (S1 66/136/12, S2 60/122/11)', m.every((x) => {
  const a = rateS1(data.records, { poolMethod: x.method });
  const b = rateS2(data.records, { poolMethod: x.method });
  return [a.batters.length, a.bowlers.length, a.allrounders.length, b.batters.length, b.bowlers.length, b.allrounders.length].join() === '66,136,12,60,122,11';
}));
// pool_effects recomputed from live runs: entering and leaving names, Chapman's place
const base1 = rateS1(data.records);
const ownTop = new Set(base1.batters.slice(0, 10).map((p) => p.playerId));
for (const [code, method] of [['C1', 'format-fallback'], ['C2', 'shrunk'], ['C3', 'adjacent-fallback']]) {
  const live = rateS1(data.records, { poolMethod: method });
  const liveTop = live.batters.slice(0, 10);
  const entered = liveTop.filter((p) => !ownTop.has(p.playerId)).map((p) => `${p.player} (${p.rank}, was ${base1.batters.find((q) => q.playerId === p.playerId).rank})`).join('; ') || 'none';
  const left = base1.batters.slice(0, 10).filter((p) => !liveTop.some((q) => q.playerId === p.playerId)).map((p) => `${p.player} (was ${p.rank}, now ${live.batters.find((q) => q.playerId === p.playerId)?.rank ?? 'not eligible'})`).join('; ') || 'none';
  const chapman = live.batters.find((p) => p.player === 'Mark Chapman');
  const row = `${code} ${method} | S1 submitted | ${entered} | ${left} |`;
  const inMd = md.includes(`| ${code} ${method} | S1 submitted | ${entered} | ${left} | Mark Chapman: 7 to ${chapman.rank} |`) || md.includes(`| ${code} ${method} | S1 submitted | ${entered} | ${left} |`);
  check(`pool_effects md row ${code} S1 equals live scoring.mjs (${entered} / ${left}; Chapman ${chapman.rank}, ${chapman.score})`, inMd);
  const inHtml = htmlText.includes(`${code} ${method} S1 submitted ${entered} ${left}`);
  check(`pool_effects html row ${code} S1 equals live scoring.mjs`, inHtml);
  if (method !== 'adjacent-fallback') { /* nothing extra */ }
  if (code === 'C1') P(`C1 and C3 would put him first in S1 (${chapman.score.toFixed(1)} and ${rateS1(data.records, { poolMethod: 'adjacent-fallback' }).batters.find((p) => p.player === 'Mark Chapman').score.toFixed(1)} against ${base1.batters.find((p) => p.player === 'Mark Chapman').score.toFixed(1)} and seventh) and C2 fourth (${rateS1(data.records, { poolMethod: 'shrunk' }).batters.find((p) => p.player === 'Mark Chapman').score.toFixed(1)})`);
  check(`Chapman rank under ${code}: ${chapman.rank}`, chapman.rank === (code === 'C2' ? 4 : 1));
}
check('Chapman 76% of pressure balls in the pool of five', Math.round(sens.rankStability.batters.find((p) => p.player === 'Mark Chapman').poolExposure.shareOfPressureBallsInThinPools * 100) === 76);
P('KEEP_CURRENT: no candidate meets the pre-registered criterion');
P('Keep a. The tests reject c firmly');

// decision commits exist in the order bcbf2ee (pre-registration) < c83ff91 (code) < 1a98041 (results)
const logOrder = execFileSync('git', ['-C', root, 'log', '--format=%h', '--reverse'], { encoding: 'utf8' }).split('\n');
const idx = (h) => logOrder.findIndex((x) => x.startsWith(h));
check('commit order: bcbf2ee < c83ff91 < 1a98041', idx('bcbf2ee') >= 0 && idx('bcbf2ee') < idx('c83ff91') && idx('c83ff91') < idx('1a98041'));
P('(commit bcbf2ee)');
P('before the candidate code (c83ff91)');
const prereg = fs.readFileSync(root + 'pool_preregistration.md', 'utf8').replace(/\r\n/g, '\n');
const preregAtCommit = execFileSync('git', ['-C', root, 'show', 'bcbf2ee:pool_preregistration.md'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
check('pool_preregistration.md is unchanged since the pre-registration commit', prereg === preregAtCommit);

// md-only sentences (the html report keeps its own shorter data-scope paragraph)
{
  const bad = [`never has a bowled, caught, lbw, stumped or hit-wicket dismissal (${hit.other.nonRunOutWicketOnNextBall} of ${hit.other.n}, about 13 expected)`, 'puts the value of the extra at about one run', 'Under two of them Mark Chapman (7th) would be first'].filter((p) => !mdText.includes(p));
  check('md data-scope and limitations sentences present', bad.length === 0, bad.join('; '));
}
// ---------- phrases on every surface ----------
for (const [name, text] of surfaces) {
  let bad = 0;
  for (const phrase of phrases) {
    const want = squash(phrase.replace(/`/g, ''));
    if (!text.includes(want)) { bad += 1; say(`  MISSING in ${name}: ${want}`); }
  }
  check(`${name}: ${phrases.length} evidence phrases present`, bad === 0, `${bad} missing`);
}

// ---------- tables ----------
const decodeCell = decode;
const mdBlock = (name) => {
  const a = md.indexOf(`<!-- table:${name} -->`); const b = md.indexOf(`<!-- /table:${name} -->`);
  return md.slice(a, b).split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')));
};
const htmlBlock = (name) => {
  const a = html.indexOf(`<!-- table:${name} -->`); const b = html.indexOf(`<!-- /table:${name} -->`);
  return [...html.slice(a, b).matchAll(/<tr>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td>(.*?)<\/td>/g)].map((c) => decodeCell(c[1]))).filter((r) => r.length);
};
const compare = (label, expected, got) => {
  const bad = expected.filter((row, i) => JSON.stringify(row.map(String)) !== JSON.stringify((got[i] ?? []).map(String))).length + Math.abs(expected.length - got.length);
  check(`${label}: ${expected.length} rows compared`, bad === 0, `${bad} mismatches`);
};
const regRows = [
  ['All matches, main fit', oe.T4c_regression.main],
  ['Without the extras_2_runs regressor', oe.T4c_regression.withoutExtras2Regressor],
  ['Five largest residuals dropped', oe.T4c_regression.dropFiveLargestResiduals],
  ['In-scope matches only (837)', oeScope.T4c_regression.main],
].map(([label, r]) => [label, `${r.n} (${r.ofWhichWithAnOtherRow})`, r.coefficients.other.estimate.toFixed(2), fr(r.coefficients.other), r.coefficients.Overstep.estimate.toFixed(2), fr(r.coefficients.Overstep), 'a']);
const poolRows = m.map((x) => [x.role === 'primary' ? `${x.method} (primary, submitted)` : `${x.code} ${x.method} (alternative)`,
  ...cells.map((cell) => `${f3(ratio(x, cell))} (${f3(mv(x, cell).M1_poolThinningError)})`),
  x.role === 'primary' ? '-' : [...new Set(ev[x.method].failedRules.map((r) => r.split(':')[0]))].sort().join(', '),
  x.role === 'primary' ? 'kept' : 'rejected']);
for (const [label, rows, name] of [['other_regression', regRows, 'other_regression'], ['pool_methods', poolRows, 'pool_methods']]) {
  compare(`md table ${label}`, rows, mdBlock(name));
  compare(`html table ${label}`, rows, htmlBlock(name));
}
// regression rows, other_tests key cells
for (const [name, cellsWanted] of [['other_tests', [`0 of ${hit.other.n}`, `0 of ${hit.Overstep.n}`, '3 of 3', '216 of 216', '137 of 139', `${ex.exactMargin.a.all} of ${ex.counts.runWonMatches}`, `${ex.wicketChaseEndConsistency.a.ok} of ${ex.counts.chaseWonMatches}`]]]) {
  for (const [fmt, rows] of [['md', mdBlock(name)], ['html', htmlBlock(name)]]) {
    const flat = rows.map((r) => r.join(' | ')).join('\n');
    const bad = cellsWanted.filter((c) => !flat.includes(c));
    check(`${fmt} table ${name} holds ${cellsWanted.length} key cells`, bad.length === 0, bad.join('; '));
  }
}
if (pdfText) {
  const cellsPdf = [...regRows.flat(), ...poolRows.flat()].filter((c) => c !== '-');
  const bad = [...new Set(cellsPdf)].filter((c) => !pdfText.includes(c));
  check(`pdf: ${new Set(cellsPdf).size} distinct cells of the regression and pool-method tables present`, bad.length === 0, bad.join('; '));
}
// README and index.html mention the new files and decisions
for (const word of ['other_evidence.mjs', 'other_evidence_data.json', 'pool_methods.mjs', 'pool_methods_data.json', 'pool_preregistration.md', '--pool-methods', 'POOL_METHOD']) {
  check(`README mentions ${word}`, readme.includes(word));
}
const index = read('index.html');
check('index.html method step 01 names the own-pool standardisation', /Compare like with like[\s\S]{0,400}own pool/.test(index));
check('index.html method step 07 names both tested decisions and that the method was kept', /Test how stable the lists are[\s\S]{0,900}(kept|unchanged)/.test(index));
say(`\nEVIDENCE CHECK FAILS: ${fails}`);
fs.writeFileSync(new URL('./verify_evidence_output.txt', import.meta.url), out.join('\n') + '\n');
process.exit(fails ? 1 : 0);
