// Evidence for how the undocumented extras_type = 'other' should be treated (Part A, round1-pool-other).
// Reproduces every number in .agents/tasks/round1-pool-other/partA_evidence.md from the supplied CSV files.
//   node other_evidence.mjs            prints the numbers as markdown
//   node other_evidence.mjs --json     prints the same numbers as JSON
//   node other_evidence.mjs --write    writes the same numbers to other_evidence_data.json (read by sensitivity.mjs and charts.mjs)
// Node built-ins only. Without --write it writes no file; it never changes analyze.mjs or analysis_data.json.
//
// Interpretations of an `other` row:
//   a  illegal ball (not one of the 6 in an over) and one penalty run, like a no-ball (the submitted behaviour)
//   b  illegal ball, no penalty run
//   c  legal ball, no penalty run
// The data holds no innings totals, final scores or cumulative fields (test T0), so the only official figures to
// compare with are the winning margins in matches.csv `result` ("Won by 61 runs", "Won by 4 Wkts").
// Runs of byes, leg-byes and penalties are not stored on those rows and wide overthrows are not stored either,
// so exact reconstruction is only possible in matches without them (tests T4a, T4b).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { cells.push(value); value = ''; } else value += character;
  }
  cells.push(value);
  return cells;
}
function readCsv(file) {
  const lines = readFileSync(resolve(root, file), 'utf8').trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const rows = lines.filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
  return { headers, rows };
}

const ball = readCsv('ball_by_ball.csv');
const matchCsv = readCsv('matches.csv');
const competitions = new Map(readCsv('competitions.csv').rows.map((row) => [row.comp_id, row]));
const matches = new Map(matchCsv.rows.map((row) => [row.match_id, row]));
const rows = ball.rows;
const num = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const round = (value, digits = 3) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : value);

function inScope(match) {
  const competition = competitions.get(match?.comp_id);
  if (!competition) return false;
  const format = /indian premier league|\bipl\b/i.test(competition.comp_name) ? 'IPL' : competition.match_format === 'T20I' ? 'T20I' : 'OTHER';
  const season = /^\s*(\d{4})/.exec(competition.season ?? '');
  return ['IPL', 'T20I'].includes(format) && season && Number(season[1]) >= 2022;
}
const inScopeMatchIds = new Set([...matches.values()].filter(inScope).map((match) => match.match_id));

// Group rows by match and innings in file order.
const innings = [];
{
  let current = null;
  for (const row of rows) {
    if (!current || current.matchId !== row.match_id || current.innings !== num(row.innings)) {
      current = { matchId: row.match_id, innings: num(row.innings), rows: [] };
      innings.push(current);
    }
    current.rows.push(row);
  }
}
const inningsByMatch = new Map();
for (const inn of innings) {
  if (!inningsByMatch.has(inn.matchId)) inningsByMatch.set(inn.matchId, []);
  inningsByMatch.get(inn.matchId).push(inn);
}

// ---------- helpers ----------
const NON_CREDITED = /run ?out|retire|obstruct|timed|handled/i;
const isNonRunOutWicket = (row) => row.is_wicket === 'true' && !NON_CREDITED.test(row.dismissal_type ?? '');
function logFactorials(n) {
  const table = [0];
  for (let i = 1; i <= n; i += 1) table[i] = table[i - 1] + Math.log(i);
  return table;
}
// P(X <= k) for X ~ Binomial(n, p), exact.
function binomialLowerTail(n, k, p) {
  const lf = logFactorials(n);
  let total = 0;
  for (let i = 0; i <= k; i += 1) {
    total += Math.exp(lf[n] - lf[i] - lf[n - i] + i * Math.log(p) + (n - i) * Math.log(1 - p));
  }
  return total;
}
function invert(matrix) {
  const n = matrix.length;
  const m = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let r = i + 1; r < n; r += 1) if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) pivot = r;
    [m[i], m[pivot]] = [m[pivot], m[i]];
    const d = m[i][i];
    for (let j = 0; j < 2 * n; j += 1) m[i][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const f = m[r][i];
      for (let j = 0; j < 2 * n; j += 1) m[r][j] -= f * m[i][j];
    }
  }
  return m.map((row) => row.slice(n));
}
// OLS without intercept, classical and HC1 standard errors, 95% intervals with 1.96.
function ols(X, y, names) {
  const n = X.length;
  const k = X[0].length;
  const xtx = Array.from({ length: k }, () => Array(k).fill(0));
  const xty = Array(k).fill(0);
  X.forEach((x, i) => {
    for (let a = 0; a < k; a += 1) {
      xty[a] += x[a] * y[i];
      for (let b = 0; b < k; b += 1) xtx[a][b] += x[a] * x[b];
    }
  });
  const inv = invert(xtx);
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  const residuals = X.map((x, i) => y[i] - x.reduce((s, v, j) => s + v * beta[j], 0));
  const rss = residuals.reduce((s, e) => s + e * e, 0);
  const s2 = rss / (n - k);
  const meat = Array.from({ length: k }, () => Array(k).fill(0));
  X.forEach((x, i) => {
    for (let a = 0; a < k; a += 1) for (let b = 0; b < k; b += 1) meat[a][b] += residuals[i] ** 2 * x[a] * x[b];
  });
  const sandwich = inv.map((_, a) => inv[a].map((__, b) => {
    let total = 0;
    for (let c = 0; c < k; c += 1) for (let d = 0; d < k; d += 1) total += inv[a][c] * meat[c][d] * inv[d][b];
    return total * (n / (n - k));
  }));
  const coefficients = {};
  names.forEach((name, i) => {
    const seClassic = Math.sqrt(s2 * inv[i][i]);
    const seRobust = Math.sqrt(sandwich[i][i]);
    coefficients[name] = {
      estimate: round(beta[i]),
      robustSE: round(seRobust),
      robustZvs0: round(beta[i] / seRobust, 2),
      robustZvs1: round((beta[i] - 1) / seRobust, 2),
      classicalCI95: [round(beta[i] - 1.96 * seClassic), round(beta[i] + 1.96 * seClassic)],
      robustHC1CI95: [round(beta[i] - 1.96 * seRobust), round(beta[i] + 1.96 * seRobust)],
    };
  });
  return { n, residualSD: round(Math.sqrt(s2), 2), coefficients, residuals };
}
const contains = (interval, value) => interval[0] <= value && value <= interval[1];

// ---------- T0: field audit ----------
const idLikeColumns = ball.headers.filter((h) => /total|score|cumul|target|balls_left|remaining|wickets_fallen/i.test(h));
const matchIdLikeColumns = matchCsv.headers.filter((h) => /total|score|cumul|target|balls_left|remaining/i.test(h));
function fieldAudit() {
  let ballCounterEqualsRowIndex = 0;
  let ballCounterTotal = 0;
  let overBallEqualsRowIndexInOver = 0;
  let overBallTotal = 0;
  for (const inn of innings) {
    const byOver = new Map();
    inn.rows.forEach((row, index) => {
      ballCounterTotal += 1;
      if (num(row.innings_ball_num) === index + 1) ballCounterEqualsRowIndex += 1;
      const key = row.overid;
      byOver.set(key, (byOver.get(key) ?? 0) + 1);
      overBallTotal += 1;
      if (num(row.over_ball_num) === byOver.get(key)) overBallEqualsRowIndexInOver += 1;
    });
  }
  const typeAdvance = {};
  for (const type of ['wide', 'Overstep', 'other']) {
    let n = 0;
    let advanced = 0;
    for (const inn of innings) {
      for (let i = 0; i < inn.rows.length - 1; i += 1) {
        if (inn.rows[i].extras_type !== type) continue;
        if (inn.rows[i].overid !== inn.rows[i + 1].overid) continue;
        n += 1;
        if (num(inn.rows[i + 1].over_ball_num) === num(inn.rows[i].over_ball_num) + 1) advanced += 1;
      }
    }
    typeAdvance[type] = { rowsFollowedBySameOverRow: n, nextOverBallNumIsPlusOne: advanced };
  }
  return {
    ballByBallColumnsLookingLikeTotals: idLikeColumns,
    matchesColumnsLookingLikeTotals: matchIdLikeColumns,
    inningsBallNumEqualsRowIndexInInnings: `${ballCounterEqualsRowIndex} of ${ballCounterTotal}`,
    overBallNumEqualsRowIndexInOver: `${overBallEqualsRowIndexInOver} of ${overBallTotal}`,
    overBallNumAdvancesOnRowsOfType: typeAdvance,
    note: 'Both counters are plain row counters (they advance on wide, Overstep and other rows), so they carry no legal-ball information. matches.csv holds only the result text.',
  };
}

// ---------- T1 free hit, T2 own-row dismissals ----------
function freeHitTest(scopeFilter) {
  const types = ['None', 'wide', 'legbyes', 'byes', 'Overstep', 'other'];
  const res = Object.fromEntries(types.map((t) => [t, { n: 0, nonRunOutWicketOnNextBall: 0 }]));
  for (const inn of innings) {
    if (inn.innings > 2 || !scopeFilter(inn.matchId)) continue;
    for (let i = 0; i < inn.rows.length - 1; i += 1) {
      const type = inn.rows[i].extras_type;
      if (!res[type]) continue;
      res[type].n += 1;
      if (isNonRunOutWicket(inn.rows[i + 1])) res[type].nonRunOutWicketOnNextBall += 1;
    }
  }
  const baseRate = res.None.nonRunOutWicketOnNextBall / res.None.n;
  const out = {};
  for (const type of types) {
    out[type] = { ...res[type], rate: round(res[type].nonRunOutWicketOnNextBall / res[type].n, 4) };
  }
  for (const type of ['Overstep', 'other']) {
    out[type].expectedAtNoneRate = round(res[type].n * baseRate, 1);
    out[type].exactBinomialProbabilityOfThisFewOrFewer = binomialLowerTail(res[type].n, res[type].nonRunOutWicketOnNextBall, baseRate);
  }
  // Same, restricted to the next ball being a plain, leg-bye or bye row (not itself a wide or no-ball).
  const strict = Object.fromEntries(['None', 'wide', 'Overstep', 'other'].map((t) => [t, { n: 0, nonRunOutWicketOnNextBall: 0 }]));
  for (const inn of innings) {
    if (inn.innings > 2 || !scopeFilter(inn.matchId)) continue;
    for (let i = 0; i < inn.rows.length - 1; i += 1) {
      const type = inn.rows[i].extras_type;
      if (!strict[type] || !['None', 'legbyes', 'byes'].includes(inn.rows[i + 1].extras_type)) continue;
      strict[type].n += 1;
      if (isNonRunOutWicket(inn.rows[i + 1])) strict[type].nonRunOutWicketOnNextBall += 1;
    }
  }
  return { baseRate: round(baseRate, 4), byTypeOfPreviousBall: out, nextBallIsPlainLegbyeOrBye: strict };
}
function ownRowDismissals(scopeFilter) {
  const out = {};
  for (const type of ['None', 'wide', 'Overstep', 'other']) {
    const wickets = rows.filter((r) => r.extras_type === type && r.is_wicket === 'true' && scopeFilter(r.match_id));
    const kinds = {};
    for (const w of wickets) kinds[w.dismissal_type] = (kinds[w.dismissal_type] ?? 0) + 1;
    out[type] = { rows: rows.filter((r) => r.extras_type === type && scopeFilter(r.match_id)).length, wicketRows: wickets.length, dismissalTypes: kinds };
  }
  // Probability that all wicket rows of `other` are run-outs if they dismissed like a normal ball.
  const normal = out.None.dismissalTypes;
  const normalTotal = Object.values(normal).reduce((s, v) => s + v, 0);
  const runOutShare = (normal['run out'] ?? normal['Run Out'] ?? Object.entries(normal).filter(([k]) => /run ?out/i.test(k)).reduce((s, [, v]) => s + v, 0)) / normalTotal;
  out.runOutShareOfNormalDismissals = round(runOutShare, 4);
  out.probabilityAllOtherWicketsAreRunOutsIfNormal = round(runOutShare ** out.other.wicketRows, 5);
  return out;
}

// ---------- T3 over lengths ----------
function overLengthTest(scopeFilter) {
  const overs = new Map();
  const lastOver = new Map();
  for (const inn of innings) {
    if (!scopeFilter(inn.matchId)) continue;
    const key = `${inn.matchId}|${inn.innings}`;
    for (const row of inn.rows) {
      const overKey = `${key}|${row.overid}`;
      if (!overs.has(overKey)) overs.set(overKey, { inningsKey: key, over: num(row.overid), rows: 0, wides: 0, overstep: 0, other: 0, superOver: inn.innings > 2 });
      const over = overs.get(overKey);
      over.rows += 1;
      if (row.extras_type === 'wide') over.wides += 1;
      if (row.extras_type === 'Overstep') over.overstep += 1;
      if (row.extras_type === 'other') over.other += 1;
      lastOver.set(key, Math.max(lastOver.get(key) ?? 0, num(row.overid)));
    }
  }
  const all = [...overs.values()].filter((o) => !o.superOver);
  const notLast = all.filter((o) => o.over !== lastOver.get(o.inningsKey));
  const withOther = notLast.filter((o) => o.other > 0);
  const without = notLast.filter((o) => o.other === 0);
  const legalIfIllegal = (o) => o.rows - o.wides - o.overstep - o.other;
  const legalIfLegal = (o) => o.rows - o.wides - o.overstep;
  const withOtherIncludingLast = all.filter((o) => o.other > 0);
  return {
    oversWithAnOtherRow_includingLastOverOfInnings: withOtherIncludingLast.length,
    includingLastOvers: {
      exactlySixLegalBalls_ifOtherIsIllegal: withOtherIncludingLast.filter((o) => legalIfIllegal(o) === 6).length,
      moreThanSixLegalBalls_ifOtherIsLegal: withOtherIncludingLast.filter((o) => legalIfLegal(o) > 6).length,
    },
    legalBallsPerOver_ifOtherIsLegal_notLastOvers: withOther.reduce((t, o) => ((t[legalIfLegal(o)] = (t[legalIfLegal(o)] ?? 0) + 1), t), {}),
    oversWithAnOtherRow_excludingLastOverOfInnings: withOther.length,
    interpretationAB_otherIsIllegal: { oversWithExactlySixLegalBalls: withOther.filter((o) => legalIfIllegal(o) === 6).length, oversWithMoreThanSix: withOther.filter((o) => legalIfIllegal(o) > 6).length, oversWithFewerThanSix: withOther.filter((o) => legalIfIllegal(o) < 6).length },
    interpretationC_otherIsLegal: { oversWithExactlySixLegalBalls: withOther.filter((o) => legalIfLegal(o) === 6).length, oversWithMoreThanSix: withOther.filter((o) => legalIfLegal(o) > 6).length, oversWithFewerThanSix: withOther.filter((o) => legalIfLegal(o) < 6).length },
    baselineOversWithoutOtherRow: { finishedOvers: without.length, exactlySixLegalBalls: without.filter((o) => legalIfIllegal(o) === 6).length },
  };
}

// ---------- T3b innings ball counts ----------
function inningsBallCountTest(scopeFilter) {
  // Innings that must have used all 120 legal balls: scheduled 20 overs, fewer than 10 wickets,
  // and either the first innings or a second innings that did not win (so it was not stopped by the target).
  const out = { withOtherRow: { innings: 0, legal120_AB: 0, legal120_C: 0, moreThan120_C: 0 }, withoutOtherRow: { innings: 0, legal120_AB: 0 } };
  const reproducedMatches = { a: 0, b: 0, c: 0, matchesChecked: 0 };
  const matchOk = new Map();
  for (const inn of innings) {
    if (!scopeFilter(inn.matchId) || inn.innings > 2) continue;
    const match = matches.get(inn.matchId);
    if (!match || match.revised_target || match.first_inn_revised_overs || match.second_inn_revised_overs || /DLS|D\/L/i.test(match.result ?? '')) continue;
    const result = (match.result ?? '').trim();
    if (!/ Won by /i.test(result)) continue;
    const wickets = inn.rows.filter((r) => r.is_wicket === 'true').length;
    if (wickets >= 10) continue;
    const battingTeamWon = String(inn.rows[0].batting_team_id) === String(match.win_team_id);
    if (inn.innings === 2 && battingTeamWon) continue;
    const hasOther = inn.rows.some((r) => r.extras_type === 'other');
    const legalAB = inn.rows.filter((r) => !['wide', 'Overstep', 'other'].includes(r.extras_type)).length;
    const legalC = inn.rows.filter((r) => !['wide', 'Overstep'].includes(r.extras_type)).length;
    if (hasOther) {
      out.withOtherRow.innings += 1;
      if (legalAB === 120) out.withOtherRow.legal120_AB += 1;
      if (legalC === 120) out.withOtherRow.legal120_C += 1;
      if (legalC > 120) out.withOtherRow.moreThan120_C += 1;
      const entry = matchOk.get(inn.matchId) ?? { ab: true, c: true };
      if (legalAB !== 120) entry.ab = false;
      if (legalC !== 120) entry.c = false;
      matchOk.set(inn.matchId, entry);
    } else {
      out.withoutOtherRow.innings += 1;
      if (legalAB === 120) out.withoutOtherRow.legal120_AB += 1;
    }
  }
  reproducedMatches.matchesChecked = matchOk.size;
  for (const entry of matchOk.values()) {
    if (entry.ab) { reproducedMatches.a += 1; reproducedMatches.b += 1; }
    if (entry.c) reproducedMatches.c += 1;
  }
  out.matchesWhereEveryCheckedInningsWithAnOtherRowHasExactly120LegalBalls = reproducedMatches;
  return out;
}

// ---------- T4 run margin ----------
const INTERPRETATIONS = {
  a: { penalty: 1, legal: false },
  b: { penalty: 0, legal: false },
  c: { penalty: 0, legal: true },
};
function inningsRuns(inn, interpretation, upTo = inn.rows.length) {
  let total = 0;
  for (let i = 0; i < upTo; i += 1) {
    const row = inn.rows[i];
    total += num(row.runs);
    if (row.extras_type === 'wide' || row.extras_type === 'Overstep') total += 1;
    if (row.extras_type === 'other') total += INTERPRETATIONS[interpretation].penalty;
  }
  return total;
}
function matchQualifies(match, innList, { allowByes = false } = {}) {
  if (!match || innList.some((i) => i.innings > 2)) return false;
  if (match.revised_target || match.first_inn_revised_overs || match.second_inn_revised_overs || /DLS|D\/L/i.test(match.result ?? '')) return false;
  const types = new Set(innList.flatMap((i) => i.rows.map((r) => r.extras_type)));
  if (types.has('Penalty')) return false;
  if (!allowByes && (types.has('byes') || types.has('legbyes'))) return false;
  return true;
}
function marginTests(scopeFilter) {
  const runMatches = [];
  const chaseMatches = [];
  for (const [matchId, innList] of inningsByMatch) {
    if (!scopeFilter(matchId)) continue;
    const match = matches.get(matchId);
    if (!matchQualifies(match, innList)) continue;
    const first = innList.find((i) => i.innings === 1);
    const second = innList.find((i) => i.innings === 2);
    if (!first || !second) continue;
    const result = (match.result ?? '').trim();
    const hasOther = innList.some((i) => i.rows.some((r) => r.extras_type === 'other'));
    const runs = /Won by (\d+) Runs?$/i.exec(result);
    if (runs) runMatches.push({ matchId, margin: Number(runs[1]), first, second, hasOther, result });
    if (/Won by \d+ (Wickets?|Wkts)$/i.test(result) && String(second.rows[0].batting_team_id) === String(match.win_team_id)) {
      chaseMatches.push({ matchId, first, second, hasOther, result });
    }
  }
  const exact = { a: { all: 0, withOther: 0, withoutOther: 0 }, b: { all: 0, withOther: 0, withoutOther: 0 }, c: { all: 0, withOther: 0, withoutOther: 0 } };
  const diffsForOtherMatches = [];
  for (const m of runMatches) {
    const row = { matchId: m.matchId, result: m.result, marginDiff: {} };
    for (const key of ['a', 'b', 'c']) {
      const diff = inningsRuns(m.first, key) - inningsRuns(m.second, key);
      row.marginDiff[key] = diff;
      if (diff === m.margin) {
        exact[key].all += 1;
        exact[key][m.hasOther ? 'withOther' : 'withoutOther'] += 1;
      }
    }
    if (m.hasOther) diffsForOtherMatches.push(row);
  }
  // Wicket-won chases: the last ball of innings 2 must be the one that reaches the target, so the score before it
  // is below target and the score after it is at least the target. Target = innings 1 total + 1.
  const chase = { a: { ok: 0, okWithOther: 0 }, b: { ok: 0, okWithOther: 0 }, c: { ok: 0, okWithOther: 0 } };
  for (const m of chaseMatches) {
    for (const key of ['a', 'b', 'c']) {
      const target = inningsRuns(m.first, key) + 1;
      const before = inningsRuns(m.second, key, m.second.rows.length - 1);
      const after = inningsRuns(m.second, key);
      if (before < target && after >= target) {
        chase[key].ok += 1;
        if (m.hasOther) chase[key].okWithOther += 1;
      }
    }
  }
  const sharesOther = {
    runWonMatches: runMatches.length,
    runWonMatchesWithOther: runMatches.filter((m) => m.hasOther).length,
    chaseWonMatches: chaseMatches.length,
    chaseWonMatchesWithOther: chaseMatches.filter((m) => m.hasOther).length,
  };
  return { exactMargin: exact, wicketChaseEndConsistency: chase, counts: sharesOther, runWonMatchesWithOtherRow: diffsForOtherMatches };
}
function regression(scopeFilter, { withE2 = true, dropLargest = 0 } = {}) {
  const names = ['wide', 'Overstep', ...(withE2 ? ['extras_2_runs'] : []), 'legbyes', 'byes', 'other'];
  const data = [];
  for (const [matchId, innList] of inningsByMatch) {
    if (!scopeFilter(matchId)) continue;
    const match = matches.get(matchId);
    if (!matchQualifies(match, innList, { allowByes: true })) continue;
    const runs = /Won by (\d+) Runs?$/i.exec((match.result ?? '').trim());
    if (!runs) continue;
    const sign = { 1: 1, 2: -1 };
    const counts = { wide: 0, Overstep: 0, extras_2_runs: 0, legbyes: 0, byes: 0, other: 0 };
    let bat = 0;
    for (const inn of innList) {
      for (const row of inn.rows) {
        bat += sign[inn.innings] * num(row.runs);
        counts.extras_2_runs += sign[inn.innings] * num(row.extras_2_runs);
        if (counts[row.extras_type] !== undefined) counts[row.extras_type] += sign[inn.innings];
      }
    }
    data.push({ matchId, x: names.map((n) => counts[n]), y: Number(runs[1]) - bat, hasOther: innList.some((i) => i.rows.some((r) => r.extras_type === 'other')) });
  }
  let fit = ols(data.map((d) => d.x), data.map((d) => d.y), names);
  let used = data;
  if (dropLargest > 0) {
    const order = fit.residuals.map((e, i) => [Math.abs(e), i]).sort((p, q) => q[0] - p[0]).slice(0, dropLargest).map((p) => p[1]);
    const drop = new Set(order);
    used = data.filter((_, i) => !drop.has(i));
    fit = ols(used.map((d) => d.x), used.map((d) => d.y), names);
  }
  const { residuals, ...rest } = fit;
  return { runWonMatchesUsed: used.length, ofWhichWithAnOtherRow: used.filter((d) => d.hasOther).length, ...rest };
}
function applyRule(fit) {
  const other = fit.coefficients.other.robustHC1CI95;
  const control = fit.coefficients.Overstep.robustHC1CI95;
  const controlValid = contains(control, 1);
  let verdict = 'undecided';
  if (controlValid) {
    if (contains(other, 1) && !contains(other, 0)) verdict = 'a';
    else if (contains(other, 0) && !contains(other, 1)) verdict = 'b';
  } else verdict = 'invalid (control Overstep interval excludes 1)';
  return { otherRobustCI95: other, overstepControlRobustCI95: control, controlValid, verdict };
}

// ---------- run everything ----------
function runAll(label, scopeFilter) {
  const free = freeHitTest(scopeFilter);
  const own = ownRowDismissals(scopeFilter);
  const over = overLengthTest(scopeFilter);
  const innCount = inningsBallCountTest(scopeFilter);
  const margins = marginTests(scopeFilter);
  const regMain = regression(scopeFilter);
  const regNoE2 = regression(scopeFilter, { withE2: false });
  const regDrop5 = regression(scopeFilter, { dropLargest: 5 });
  return {
    label,
    T1_freeHit: free,
    T2_ownRowDismissals: own,
    T3_overLength: over,
    T3b_inningsBallCount: innCount,
    T4a_T4b_marginReconstruction: margins,
    T4c_regression: {
      main: regMain,
      withoutExtras2Regressor: regNoE2,
      dropFiveLargestResiduals: regDrop5,
      ruleOnMain: applyRule(regMain),
      ruleWithoutExtras2: applyRule(regNoE2),
      ruleDropFive: applyRule(regDrop5),
    },
  };
}
const extrasCounts = {};
for (const row of rows) extrasCounts[row.extras_type] = (extrasCounts[row.extras_type] ?? 0) + 1;
const profile = {};
for (const type of ['wide', 'Overstep', 'other']) {
  const subset = rows.filter((r) => r.extras_type === type);
  const tally = (key) => subset.reduce((o, r) => ((o[r[key]] = (o[r[key]] ?? 0) + 1), o), {});
  profile[type] = { rows: subset.length, extras1_runs: tally('extras1_runs'), extras_2_runs: tally('extras_2_runs'), rowsWithBatterRuns: subset.filter((r) => num(r.runs) > 0).length, sixes: subset.filter((r) => r.is_six === 'true').length, fours: subset.filter((r) => r.is_four === 'true').length };
}
const result = {
  scope: { ballRows: rows.length, matchesInBallByBall: inningsByMatch.size, inScopeMatches: [...inScopeMatchIds].filter((id) => inningsByMatch.has(id)).length, matchesWithAnOtherRow: new Set(rows.filter((r) => r.extras_type === 'other').map((r) => r.match_id)).size },
  extrasTypeCounts: extrasCounts,
  otherWideOverstepRowProfile: profile,
  T0_fieldAudit: fieldAudit(),
  allMatches: runAll('all matches in ball_by_ball.csv', () => true),
  inScopeMatches: runAll('in-scope matches (IPL and T20I, 2022 to 2026)', (id) => inScopeMatchIds.has(id)),
};

if (process.argv.includes('--write')) {
  writeFileSync(resolve(root, 'other_evidence_data.json'), `${JSON.stringify(result, null, 1)}\n`);
  console.log('Wrote other_evidence_data.json');
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 1));
} else {
  const fmt = (label, value) => `${label}\n\n\`\`\`json\n${JSON.stringify(value, null, 1)}\n\`\`\`\n`;
  console.log('# other_evidence.mjs output\n');
  console.log(fmt('## Scope and row profiles', { scope: result.scope, extrasTypeCounts: result.extrasTypeCounts, rowProfile: result.otherWideOverstepRowProfile }));
  console.log(fmt('## T0 field audit', result.T0_fieldAudit));
  for (const key of ['allMatches', 'inScopeMatches']) {
    const block = result[key];
    console.log(`## ${block.label}\n`);
    for (const test of ['T1_freeHit', 'T2_ownRowDismissals', 'T3_overLength', 'T3b_inningsBallCount', 'T4a_T4b_marginReconstruction', 'T4c_regression']) {
      console.log(fmt(`### ${test}`, block[test]));
    }
  }
}
