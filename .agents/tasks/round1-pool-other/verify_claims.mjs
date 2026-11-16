// Checks the hand-written numbers in the report prose against sensitivity_data.json and scoring.mjs.
import fs from 'node:fs';
const root = 'c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/';
const s = JSON.parse(fs.readFileSync(root + 'sensitivity_data.json', 'utf8'));
const data = JSON.parse(fs.readFileSync(root + 'analysis_data.json', 'utf8'));
const src = fs.readFileSync(root + 'scoring.mjs', 'utf8');
const mk = async (value, rawScore) => {
  let code = src.replace(/const APPLY_PLAYER_EXCLUSIONS = \w+;/, `const APPLY_PLAYER_EXCLUSIONS = ${value};`);
  if (rawScore) code = code.replace('score: rounded(rating, 1),', 'score: rounded(rating, 1), rawScore: rating,');
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).ratePlayers;
};
const out = [];
let fails = 0;
const check = (label, ok, detail = '') => { if (!ok) fails += 1; const line = `${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`; out.push(line); console.log(line); };
const eq = (label, got, want) => check(label, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const names = (l) => l.map((p) => p.player);

const sub = (await mk(false))(data.records);
const alt = (await mk(true))(data.records);
const pct = (x) => Math.round(x * 100);

eq('eligible submitted', [sub.batters.length, sub.bowlers.length, sub.allrounders.length], [66, 136, 12]);
eq('eligible alternative', [alt.batters.length, alt.bowlers.length, alt.allrounders.length], [60, 122, 11]);
const shared = (a, b) => a.slice(0, 10).filter((p) => b.slice(0, 10).some((q) => q.playerId === p.playerId)).length;
eq('shared names alt vs submitted (bat, bowl, ar)', [shared(sub.batters, alt.batters), shared(sub.bowlers, alt.bowlers), shared(sub.allrounders, alt.allrounders)], [8, 7, 9]);
eq('batters in alt', names(alt.batters.slice(0, 10)).filter((n) => !names(sub.batters.slice(0, 10)).includes(n)), ['Mohammad Nabi', 'Rinku Singh']);
eq('batters out of alt', names(sub.batters.slice(0, 10)).filter((n) => !names(alt.batters.slice(0, 10)).includes(n)), ['Fakhar Zaman', 'Namboori Tilak Varma']);
eq('bowlers in alt', names(alt.bowlers.slice(0, 10)).filter((n) => !names(sub.bowlers.slice(0, 10)).includes(n)), ['Adam Zampa', 'Rasikh Salam', 'Benjamin Lister']);
eq('bowlers out of alt', names(sub.bowlers.slice(0, 10)).filter((n) => !names(alt.bowlers.slice(0, 10)).includes(n)), ['Mohammad Nawaz', 'Abrar Ahmed', 'Mohit Sharma']);
eq('allrounders in alt', names(alt.allrounders.slice(0, 10)).filter((n) => !names(sub.allrounders.slice(0, 10)).includes(n)), ['Roston Chase']);
eq('allrounders out of alt', names(sub.allrounders.slice(0, 10)).filter((n) => !names(alt.allrounders.slice(0, 10)).includes(n)), ['Ravichandran Ashwin']);
const rk = (l, n) => l.find((p) => p.player === n)?.rank ?? null;
check('Ryan Burl 57.0 submitted, 56.5 alternative', sub.batters.find((p) => p.player === 'Ryan Burl').score === 57 && alt.batters.find((p) => p.player === 'Ryan Burl').score === 56.5);

// other (no penalty run) alternative, no exclusions
const oa = s.otherAlternative.exclusionsOff;
eq('other: eligible', oa.eligible, { batters: 65, bowlers: 136, allrounders: 12 });
eq('other: batter top 10', oa.batters.top10.map((p) => `${p.rank} ${p.player} ${p.index}`), ['1 Rishabh Pant 59.2', '2 Fakhar Zaman 57.9', '3 Sanju Samson 57.8', '4 Ryan Burl 57.1', '5 Suryakumar Yadav 56.3', '6 Mark Chapman 56', '7 David Miller 55.3', '8 Glenn Phillips 54.5', '9 Sai Sudharsan 53.8', '10 Nitish Reddy 53.6']);
check('other: Tilak Varma 12th, 53.1', oa.batters.versusPrimary.movedOut.some((p) => p.player === 'Namboori Tilak Varma' && p.rankInOtherList === 12 && p.indexInOtherList === 53.1));
check('other: Connolly not eligible', oa.batters.versusPrimary.movedOut.some((p) => p.player === 'Cooper Connolly' && p.rankInOtherList === null));
check('other: Sudharsan was 25th, Reddy was 13th', oa.batters.versusPrimary.movedIn.some((p) => p.player === 'Sai Sudharsan' && p.rankInOtherList === 25) && oa.batters.versusPrimary.movedIn.some((p) => p.player === 'Nitish Reddy' && p.rankInOtherList === 13));
eq('other: eight batter names shared', oa.batters.versusPrimary.sharedNames, 8);
eq('other: bowlers the same ten names', [oa.bowlers.versusPrimary.sharedNames, oa.bowlers.top10.map((p) => p.player).sort()], [10, names(sub.bowlers.slice(0, 10)).sort()]);
eq('other: bowler order starts Narine 61.6, Umran 61.6', oa.bowlers.top10.slice(0, 2).map((p) => `${p.player} ${p.index}`), ['Sunil Narine 61.6', 'Umran Malik 61.6']);
const primBow = new Map(sub.bowlers.map((p) => [p.player, p.score]));
const maxChange = Math.max(...oa.bowlers.top10.map((p) => Math.abs(p.index - primBow.get(p.player))));
check('other: max bowler index change 0.4', Math.abs(maxChange - 0.4) < 1e-9, String(maxChange));
check('other: Sundar 59.7 -> 60.1; Narine 61.3 -> 61.6', primBow.get('Washington Sundar') === 59.7 && oa.bowlers.top10.find((p) => p.player === 'Washington Sundar').index === 60.1 && primBow.get('Sunil Narine') === 61.3);
const oo = s.otherAlternative.exclusionsOn;
check('other, exclusions on: Connolly out, Sudharsan and Reddy in, Rinku Singh out, bowlers unchanged',
  oo.batters.versusPrimary.movedOut.map((p) => p.player).sort().join() === 'Cooper Connolly,Rinku Singh' && oo.batters.versusPrimary.movedIn.map((p) => p.player).sort().join() === 'Nitish Reddy,Sai Sudharsan' && oo.bowlers.versusPrimary.sharedNames === 10);
eq('pressure deliveries 81,806 -> 81,736 and ordinary 112,182 -> 112,252', [s.otherAlternative.datasetQuality.primaryPressureDeliveries, s.otherAlternative.datasetQuality.alternativePressureDeliveries, s.otherAlternative.datasetQuality.primaryOrdinaryDeliveries, s.otherAlternative.datasetQuality.alternativeOrdinaryDeliveries], [81806, 81736, 112182, 112252]);

// robust core
eq('core batters', s.robustCore.batters.core.map((e) => e.player).sort(), ['David Miller', 'Glenn Phillips', 'Mark Chapman', 'Rishabh Pant', 'Ryan Burl', 'Sanju Samson', 'Suryakumar Yadav']);
eq('core bowlers', s.robustCore.bowlers.core.map((e) => e.player).sort(), ['Akash Madhwal', 'Kuldeep Yadav', 'Mohammad Saifuddin', 'Sakib Hussain', 'Sunil Narine', 'Umran Malik', 'Washington Sundar']);
eq('batters in submitted top 10 not in core', s.robustCore.batters.primaryTop10NotInCore.map((e) => e.player), ['Cooper Connolly', 'Fakhar Zaman', 'Namboori Tilak Varma']);
eq('bowlers in submitted top 10 not in core', s.robustCore.bowlers.primaryTop10NotInCore.map((e) => e.player), ['Mohammad Nawaz', 'Abrar Ahmed', 'Mohit Sharma']);
eq('bowlers only with exclusions on', s.robustCore.bowlers.otherNamesInSomeScenario.map((e) => e.player).sort(), ['Adam Zampa', 'Benjamin Lister', 'Rasikh Salam']);

// pools
eq('pool summary', [s.poolSizes.summary.t20iBatterPoolRange, s.poolSizes.summary.iplBatterPoolRange, s.poolSizes.summary.t20iBowlerPoolRange, s.poolSizes.summary.iplBowlerPoolRange, s.poolSizes.summary.thinBatterPools, s.poolSizes.summary.thinBowlerPools], [[5, 12], [12, 17], [12, 40], [32, 36], 2, 0]);
eq('thin batter pools', s.poolSizes.batters.filter((p) => p.thin).map((p) => `${p.pool}:${p.eligiblePlayers}`), ['T20I:2023:5', 'T20I:2026:6']);
eq('T20I 2024 / 2022 / 2025 batter pools', ['T20I:2022', 'T20I:2024', 'T20I:2025'].map((k) => s.poolSizes.batters.find((p) => p.pool === k).eligiblePlayers), [12, 11, 12]);
const st = (kind, n) => s.rankStability[kind].find((p) => p.player === n);
const poolBalls = (p, pool) => p.poolExposure.pools.find((x) => x.pool === pool)?.pressureBalls;
eq('Chapman 235 of 311 in T20I:2023 (76%)', [poolBalls(st('batters', 'Mark Chapman'), 'T20I:2023'), sub.batters.find((p) => p.player === 'Mark Chapman').pressureBalls, pct(st('batters', 'Mark Chapman').poolExposure.shareOfPressureBallsInThinPools)], [235, 311, 76]);
eq('SKY 176 of 724 (24%)', [poolBalls(st('batters', 'Suryakumar Yadav'), 'T20I:2023'), sub.batters.find((p) => p.player === 'Suryakumar Yadav').pressureBalls, pct(st('batters', 'Suryakumar Yadav').poolExposure.shareOfPressureBallsInThinPools)], [176, 724, 24]);
eq('Tilak Varma 231 of 1048 (22%) in T20I:2026', [poolBalls(st('batters', 'Namboori Tilak Varma'), 'T20I:2026'), sub.batters.find((p) => p.player === 'Namboori Tilak Varma').pressureBalls, pct(st('batters', 'Namboori Tilak Varma').poolExposure.shareOfPressureBallsInThinPools)], [231, 1048, 22]);
eq('T20I share 100% and smallest pool: Fakhar, Burl, Phillips', ['Fakhar Zaman', 'Ryan Burl', 'Glenn Phillips'].map((n) => [pct(st('batters', n).poolExposure.shareOfPressureBallsInT20IPools), st('batters', n).poolExposure.smallestPoolSize]), [[100, 11], [100, 12], [100, 11]]);
eq('no T20I pool balls: Pant, Samson, Connolly, Miller', ['Rishabh Pant', 'Sanju Samson', 'Cooper Connolly', 'David Miller'].map((n) => st('batters', n).poolExposure.shareOfPressureBallsInT20IPools), [0, 0, 0, 0]);
eq('bowlers all T20I: Nawaz, Abrar, Sundar, Saifuddin; smallest pools 40/40/25/40', ['Mohammad Nawaz', 'Abrar Ahmed', 'Washington Sundar', 'Mohammad Saifuddin'].map((n) => [pct(st('bowlers', n).poolExposure.shareOfPressureBallsInT20IPools), st('bowlers', n).poolExposure.smallestPoolSize]), [[100, 40], [100, 40], [100, 25], [100, 40]]);

// stability
const tv = st('batters', 'Namboori Tilak Varma');
eq('Tilak Varma: pool deletion 25%, bootstrap 14%, LOO out 17 of 65, worst 13', [pct(tv.poolDeletion.shareInTop10), pct(tv.bootstrap.shareInTop10), tv.leaveOneOut.timesOutOfTop10, tv.leaveOneOut.runs, tv.leaveOneOut.worstRank], [25, 14, 17, 65, 13]);
const sf = st('bowlers', 'Mohammad Saifuddin');
eq('Saifuddin: bootstrap 32%, pool deletion 41%, LOO out 16 of 135, worst 11, 71 balls all T20I:2025', [pct(sf.bootstrap.shareInTop10), pct(sf.poolDeletion.shareInTop10), sf.leaveOneOut.timesOutOfTop10, sf.leaveOneOut.runs, sf.leaveOneOut.worstRank, poolBalls(sf, 'T20I:2025')], [32, 41, 16, 135, 11, 71]);
const ms = st('bowlers', 'Mohit Sharma');
eq('Mohit Sharma: bootstrap 23%, pool deletion 99%', [pct(ms.bootstrap.shareInTop10), pct(ms.poolDeletion.shareInTop10)], [23, 99]);
const everyone = [...s.rankStability.batters, ...s.rankStability.bowlers];
const others = everyone.filter((p) => !['Namboori Tilak Varma', 'Mohammad Saifuddin'].includes(p.player));
check('all other 18 players >= 92% under pool deletion', others.every((p) => pct(p.poolDeletion.shareInTop10) >= 92), `min ${Math.min(...others.map((p) => pct(p.poolDeletion.shareInTop10)))}`);
eq('stable by bootstrap', everyone.filter((p) => p.fragility === 'stable').map((p) => `${p.player} ${pct(p.bootstrap.shareInTop10)}`), ['Sunil Narine 94', 'Mohammad Nawaz 88']);
eq('fragile count 12; names', everyone.filter((p) => p.fragility === 'fragile').map((p) => p.player).sort(), ['Akash Madhwal', 'Cooper Connolly', 'David Miller', 'Glenn Phillips', 'Kuldeep Yadav', 'Mohammad Saifuddin', 'Mohit Sharma', 'Namboori Tilak Varma', 'Ryan Burl', 'Sakib Hussain', 'Sanju Samson', 'Washington Sundar']);
eq('pressure balls range 71 to 1048', [Math.min(...[...sub.batters, ...sub.bowlers].slice(0, 0).concat(sub.batters.slice(0, 10), sub.bowlers.slice(0, 10)).map((p) => p.pressureBalls)), Math.max(...sub.batters.slice(0, 10).concat(sub.bowlers.slice(0, 10)).map((p) => p.pressureBalls))], [71, 1048]);
check('bootstrap method text uses 71 to 1048', /71 to 1048 pressure balls/.test(s.rankStability.method.bootstrap));
check('Kuldeep Yadav bootstrap share is not a rounding edge (49.5 to 50.5)', !(st('bowlers', 'Kuldeep Yadav').bootstrap.shareInTop10 > 0.495 && st('bowlers', 'Kuldeep Yadav').bootstrap.shareInTop10 < 0.505));

// min pool and pooling
const mp = Object.fromEntries(s.minimumPoolSize.variants.map((v) => [v.minimumPoolSize, v]));
eq('min pool 8: dropped, shared, in, out', [mp[8].poolsDropped, mp[8].batters.versusPrimary.sharedNames, mp[8].batters.versusPrimary.movedIn.map((p) => `${p.player} ${p.rank} ${p.index}`), mp[8].batters.versusPrimary.movedOut.map((p) => `${p.player} ${p.rankInOtherList} ${p.indexInOtherList}`), mp[8].bowlers.versusPrimary.sharedNames], [['batter:T20I:2023', 'batter:T20I:2026'], 9, ['Shreyas Iyer 9 54.4'], ['Namboori Tilak Varma 15 52.6'], 10]);
eq('min pool 12: shared, in, out', [mp[12].poolsDropped.length, mp[12].batters.versusPrimary.sharedNames, mp[12].batters.versusPrimary.movedIn.map((p) => `${p.player} ${p.rank} ${p.index}`), mp[12].batters.versusPrimary.movedOut.map((p) => `${p.player} ${p.rankInOtherList}`)], [3, 7, ['Shreyas Iyer 7 54.4', 'Jos Buttler 9 53.1', 'Nitish Reddy 10 53'], ['Fakhar Zaman null', 'Mark Chapman null', 'Namboori Tilak Varma 12']]);
eq('min pool 13: batter pools dropped, eligible, shared', [mp[13].poolsDropped.filter((x) => x.startsWith('batter')).length, mp[13].eligible.batters, mp[13].batters.versusPrimary.sharedNames], [7, 35, 3]);
const sp = s.poolingSeasons.standardisationPooled;
eq('T20I pooled: shared 9, Buttler 10th 53.1 in, Tilak 15th 52.5 out, bowlers same', [sp[0].batters.versusPrimary.sharedNames, sp[0].batters.versusPrimary.movedIn.map((p) => `${p.player} ${p.rank} ${p.index}`), sp[0].batters.versusPrimary.movedOut.map((p) => `${p.player} ${p.rankInOtherList} ${p.indexInOtherList}`), sp[0].bowlers.versusPrimary.sharedNames], [9, ['Jos Buttler 10 53.1'], ['Namboori Tilak Varma 15 52.5'], 10]);
eq('all seasons pooled: Tilak 14th 52.4, Buttler 10th 53.9, Mohit 12th 57.4 out, Muqeem 10th 57.9 in', [sp[1].batters.versusPrimary.movedOut.map((p) => `${p.player} ${p.rankInOtherList} ${p.indexInOtherList}`), sp[1].batters.versusPrimary.movedIn.map((p) => `${p.player} ${p.rank} ${p.index}`), sp[1].bowlers.versusPrimary.movedOut.map((p) => `${p.player} ${p.rankInOtherList} ${p.indexInOtherList}`), sp[1].bowlers.versusPrimary.movedIn.map((p) => `${p.player} ${p.rank} ${p.index}`)], [['Namboori Tilak Varma 14 52.4'], ['Jos Buttler 10 53.9'], ['Mohit Sharma 12 57.4'], ['Sufiyan Muqeem 10 57.9']]);
const cp = s.poolingSeasons.careerPooled;
eq('career pooled: eligible and shared', [cp[0].eligible, cp[0].batters.versusPrimary.sharedNames, cp[0].bowlers.versusPrimary.sharedNames, cp[1].eligible, cp[1].batters.versusPrimary.sharedNames, cp[1].bowlers.versusPrimary.sharedNames], [{ batters: 126, bowlers: 197 }, 4, 7, { batters: 158, bowlers: 214 }, 2, 5]);

// ties and unrounded order
for (const [label, sw] of [['submitted', false], ['alternative', true]]) {
  const r = (await mk(sw, true))(data.records);
  for (const key of ['batters', 'bowlers']) {
    const top = r[key].slice(0, 12);
    const sorted = [...top].sort((a, b) => b.rawScore - a.rawScore).map((p) => p.player);
    check(`${label} ${key}: unrounded order equals ranked order (top 12)`, sorted.every((n, i) => n === top[i].player));
  }
}
const ties = (l) => l.slice(0, 11).filter((p, i, a) => i > 0 && a[i - 1].score === p.score).map((p, i, a) => p.player);
eq('submitted tie at edge: Tilak Varma 10th and Buttler 11th, 53.1 each, balls 1048 vs 344', [sub.batters[9].player, sub.batters[10].player, sub.batters[9].score, sub.batters[10].score, sub.batters[9].pressureBalls, sub.batters[10].pressureBalls], ['Namboori Tilak Varma', 'Jos Buttler', 53.1, 53.1, 1048, 344]);
const sameScoreInTop10 = (l) => l.slice(0, 10).some((p, i, a) => i > 0 && a[i - 1].score === p.score);
eq('submitted batters/bowlers: no tie inside the top ten', [sameScoreInTop10(sub.batters), sameScoreInTop10(sub.bowlers)], [false, false]);
check('alternative ties: Narine/Umran 61.3, Salam/Lister 56.3', alt.bowlers[1].score === 61.3 && alt.bowlers[2].score === 61.3 && alt.bowlers[8].score === 56.3 && alt.bowlers[9].score === 56.3 && alt.bowlers[1].pressureBalls === 684 && alt.bowlers[2].pressureBalls === 97 && alt.bowlers[8].pressureBalls === 137 && alt.bowlers[9].pressureBalls === 78);

// threshold bullets
for (const [mb, mm, bat, bowl, label] of [[36, 5, 6, 7, '36/5'], [90, 10, 4, 6, '90/10']]) {
  const r = (await mk(false))(data.records, { minBalls: mb, minMatches: mm });
  const d = (await mk(false))(data.records);
  const a2 = (await mk(true))(data.records, { minBalls: mb, minMatches: mm });
  const d2 = (await mk(true))(data.records);
  eq(`shared with default, exclusions off, ${label}`, [shared(r.batters, d.batters), shared(r.bowlers, d.bowlers)], [bat, bowl]);
  eq(`shared with default, exclusions on, ${label}`, [shared(a2.batters, d2.batters), shared(a2.bowlers, d2.bowlers)], mb === 36 ? [5, 6] : [3, 3]);
}
{
  const rp = await mk(false);
  const r36 = rp(data.records, { minBalls: 36, minMatches: 5 });
  const r90 = rp(data.records, { minBalls: 90, minMatches: 10 });
  const d = rp(data.records);
  const R = (r, n) => rk(r.bowlers, n);
  eq('Narine 2/2/2, Nawaz 3/1/1, Sakib 7/5/5, Madhwal 4/3/-, Umran 1/32/-', [['Sunil Narine', 'Mohammad Nawaz', 'Sakib Hussain', 'Akash Madhwal', 'Umran Malik'].map((n) => [R(d, n), R(r36, n), R(r90, n)])][0], [[2, 2, 2], [3, 1, 1], [7, 5, 5], [4, 3, null], [1, 32, null]]);
}
out.push(`\nFAILS: ${fails}`);
console.log(`FAILS: ${fails}`);
fs.writeFileSync(new URL('./verify_claims_output.txt', import.meta.url), out.join('\n') + '\n');
process.exit(fails ? 1 : 0);
