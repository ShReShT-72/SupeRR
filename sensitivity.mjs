// Sensitivity checks for the Round 1 pressure index. Sensitivity only: the primary method and lists
// come from scoring.mjs and analysis_data.json and are not changed here.
//
//   node sensitivity.mjs              writes sensitivity_data.json (about 3 minutes, deterministic)
//   node sensitivity.mjs --print-top10  prints the top ten lists that scoring.mjs gives right now
//
// Run from the data folder (the one holding ball_by_ball.csv, matches.csv, analysis_data.json).
// Node 18 or newer, no npm dependencies. The output has no timestamps: two runs give identical files.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const codeDir = dirname(fileURLToPath(import.meta.url));

const SEED = 20261116; // fixed PRNG seed (mulberry32). Change it and every resampling number changes.
const BOOTSTRAP_RUNS = 1000;
const POOL_DELETE_RUNS = 1000;
const POOL_DELETE_FRACTION = 0.2;
const MIN_POOL_SIZES = [8, 11, 13];
const THIN_POOL_MAX = 10; // a format-season pool with this many eligible players or fewer is called thin
const TOP = 10;
const KINDS = [['batter', 'batters'], ['bowler', 'bowlers']];
const SCENARIOS = [
  ['exclusionsOn_otherPenalty', 'primary: exclusions on, `other` = illegal ball + 1 penalty run'],
  ['exclusionsOn_otherNoPenalty', 'exclusions on, `other` = illegal ball, no penalty run'],
  ['exclusionsOff_otherPenalty', 'no exclusions, `other` = illegal ball + 1 penalty run'],
  ['exclusionsOff_otherNoPenalty', 'no exclusions, `other` = illegal ball, no penalty run'],
];

// ---------- helpers ----------
const round = (value, digits = 3) => (Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : null);
const id = (player) => String(player.playerId);

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];
}

function rankSummary(ranks, runs) {
  const sorted = [...ranks].sort((a, b) => a - b);
  const median = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  return {
    runs,
    shareInTop10: round(ranks.filter((rank) => rank <= TOP).length / runs),
    notEligibleShare: round((runs - ranks.length) / runs),
    medianRank: sorted.length ? median : null,
    rank5thPercentile: percentile(sorted, 0.05),
    rank95thPercentile: percentile(sorted, 0.95),
    bestRank: sorted.length ? sorted[0] : null,
    worstRank: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

function fullRow(kind, p) {
  const common = { rank: p.rank, playerId: p.playerId, player: p.player, teams: p.teams, index: p.score };
  if (kind === 'batter') {
    return {
      ...common,
      pressureSR: p.pressureRate,
      usualSR: p.usualRate,
      pressureBalls: p.pressureBalls,
      pressureMatches: p.pressureMatches,
      pressureDismissalsPer100Balls: p.pressureDismissalRate,
      positiveMatchSharePct: p.consistency,
      reliabilityPct: p.reliability,
    };
  }
  return {
    ...common,
    pressureEconomy: p.pressureEconomy,
    usualEconomy: p.usualEconomy,
    pressureBalls: p.pressureBalls,
    pressureMatches: p.pressureMatches,
    pressureWickets: p.pressureWickets,
    positiveMatchSharePct: p.consistency,
    reliabilityPct: p.reliability,
  };
}

const leanRow = (p) => ({
  rank: p.rank, playerId: p.playerId, player: p.player, index: p.score, pressureBalls: p.pressureBalls, pressureMatches: p.pressureMatches,
});

function movement(primary, alternative) {
  const primaryTop = primary.slice(0, TOP);
  const alternativeTop = alternative.slice(0, TOP);
  const primaryById = new Map(primary.map((p) => [id(p), p]));
  const alternativeById = new Map(alternative.map((p) => [id(p), p]));
  const primaryIds = new Set(primaryTop.map(id));
  const alternativeIds = new Set(alternativeTop.map(id));
  const detail = (p, other) => ({
    player: p.player,
    playerId: p.playerId,
    rank: p.rank,
    index: p.score,
    rankInOtherList: other.get(id(p))?.rank ?? null,
    indexInOtherList: other.get(id(p))?.score ?? null,
  });
  return {
    sharedNames: primaryTop.filter((p) => alternativeIds.has(id(p))).length,
    movedIn: alternativeTop.filter((p) => !primaryIds.has(id(p))).map((p) => detail(p, primaryById)),
    movedOut: primaryTop.filter((p) => !alternativeIds.has(id(p))).map((p) => detail(p, alternativeById)),
    ranksOfPrimaryTop10: primaryTop.map((p) => ({
      player: p.player,
      primaryRank: p.rank,
      primaryIndex: p.score,
      rank: alternativeById.get(id(p))?.rank ?? null,
      index: alternativeById.get(id(p))?.score ?? null,
    })),
  };
}

// ---------- scoring variants built from scoring.mjs text ----------
const scoringSource = await readFile(resolve(codeDir, 'scoring.mjs'), 'utf8');
const EXCLUSION_CONDITION = /!(?:pakistanPlayers|IPL_RETIRED_PLAYER_IDS|IPL_2027_NONPLAYER_IDS)\.has\(String\(record\.playerId\)\)\s*&&\s*/g;
const HOOK_ANCHOR = '    const rollups = new Map();';
const BENCHMARK_LINE = '      const benchmark = `${player.format}:${player.season}`;';

async function loadModule(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

if (process.argv.includes('--print-top10')) {
  const { ratePlayers } = await import(new URL('./scoring.mjs', import.meta.url).href);
  const data = JSON.parse(await readFile(resolve(root, 'analysis_data.json'), 'utf8'));
  const rated = ratePlayers(data.records);
  for (const [kind, key] of KINDS) {
    console.log(`\nTop 10 ${key} (scoring.mjs as it is now, 60 balls / 8 matches)`);
    for (const p of rated[key].slice(0, TOP).map((row) => fullRow(kind, row))) {
      console.log(Object.values({ ...p, teams: p.teams.join('/') }).join(' | '));
    }
  }
  process.exit(0);
}

if ((scoringSource.match(EXCLUSION_CONDITION) ?? []).length !== 3) {
  throw new Error('scoring.mjs no longer has the three player-exclusion conditions. '
    + 'sensitivity.mjs describes the primary list with exclusions on; restore scoring.mjs or use --print-top10.');
}
if (scoringSource.split(HOOK_ANCHOR).length !== 2 || scoringSource.split(BENCHMARK_LINE).length !== 2) {
  throw new Error('scoring.mjs changed shape: the pool (strata) lines that sensitivity.mjs hooks into were not found exactly once.');
}
// Two hooks that are inert unless sensitivity.mjs sets them: one reports the pools, one lets a variant choose the pool a profile is standardised in.
const instrumentedSource = scoringSource
  .replace(HOOK_ANCHOR, `    globalThis.__sensitivityPoolHook?.(kind, strata);\n${HOOK_ANCHOR}`)
  .replace(BENCHMARK_LINE, '      const benchmark = globalThis.__sensitivityBenchmark?.(player) ?? `${player.format}:${player.season}`;');
const ratePlayersOn = (await loadModule(instrumentedSource)).ratePlayers;
const ratePlayersOff = (await loadModule(instrumentedSource.replace(EXCLUSION_CONDITION, ''))).ratePlayers;
const { ratePlayers: ratePlayersShipped } = await import(new URL('./scoring.mjs', import.meta.url).href);

// ---------- inputs ----------
const analysisFile = await readFile(resolve(root, 'analysis_data.json'), 'utf8');
const analysis = JSON.parse(analysisFile);
const records = analysis.records;

const scratch = await mkdtemp(join(tmpdir(), 'sensitivity-'));
function runAnalyze(extraArguments, name) {
  const file = join(scratch, name);
  execFileSync(process.execPath, [resolve(codeDir, 'analyze.mjs'), ...extraArguments, `--out=${file}`], {
    cwd: root, stdio: ['ignore', 'ignore', 'inherit'],
  });
  return file;
}
let recordsNoPenalty;
let noPenaltyQuality;
let regeneratesIdentically;
try {
  const defaultFile = runAnalyze([], 'default.json');
  const strip = (text) => text.replace(/"generatedAt":"[^"]*"/, '"generatedAt":""').replace(/\r\n/g, '\n');
  regeneratesIdentically = strip(await readFile(defaultFile, 'utf8')) === strip(analysisFile);
  const variant = JSON.parse(await readFile(runAnalyze(['--other-no-penalty'], 'other_no_penalty.json'), 'utf8'));
  recordsNoPenalty = variant.records;
  noPenaltyQuality = variant.dataQuality;
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// ---------- rating helpers ----------
function rate(ratePlayers, input, options) {
  return ratePlayers(input, options);
}

function ratedWithPools(ratePlayers, input, benchmark) {
  const pools = {};
  if (benchmark) globalThis.__sensitivityBenchmark = benchmark;
  globalThis.__sensitivityPoolHook = (kind, strata) => {
    pools[kind] = [...strata].map(([key, players]) => ({
      key,
      format: players[0].format,
      season: players[0].season,
      players: players.map((player) => ({ playerId: id(player), pressureBalls: player.pressure.balls })),
    })).sort((a, b) => (a.format === b.format ? Number(a.season) - Number(b.season) : a.format.localeCompare(b.format)));
  };
  try {
    return { rated: ratePlayers(input), pools };
  } finally {
    delete globalThis.__sensitivityPoolHook;
    delete globalThis.__sensitivityBenchmark;
  }
}

const primary = ratedWithPools(ratePlayersOn, records);
const primaryRated = primary.rated;
const primaryPools = primary.pools;

// ---------- primary reproduction check ----------
const shippedRated = rate(ratePlayersShipped, records);
const primaryMatchesScoringModule = JSON.stringify({ b: shippedRated.batters, w: shippedRated.bowlers, a: shippedRated.allrounders })
  === JSON.stringify({ b: primaryRated.batters, w: primaryRated.bowlers, a: primaryRated.allrounders });
if (!primaryMatchesScoringModule) throw new Error('instrumented scoring copy differs from scoring.mjs');

const primaryTop = {
  batters: primaryRated.batters.slice(0, TOP),
  bowlers: primaryRated.bowlers.slice(0, TOP),
};

// ---------- pool sizes ----------
function poolTable(kind) {
  return primaryPools[kind].map((pool) => {
    const balls = pool.players.map((player) => player.pressureBalls).sort((a, b) => a - b);
    return {
      pool: pool.key,
      format: pool.format,
      season: pool.season,
      eligiblePlayers: pool.players.length,
      thin: pool.players.length <= THIN_POOL_MAX,
      pressureBallsInPool: balls.reduce((sum, value) => sum + value, 0),
      medianPressureBallsPerPlayer: balls.length % 2 ? balls[(balls.length - 1) / 2] : (balls[balls.length / 2 - 1] + balls[balls.length / 2]) / 2,
    };
  });
}
const poolSizes = {
  note: `Eligible players per format-season pool, exclusions on, 60 pressure balls / 8 matches / 60 ordinary balls. A pool with ${THIN_POOL_MAX} or fewer players is flagged thin. Each player is standardised (z-scores) only against the others in the same pool.`,
  batters: poolTable('batter'),
  bowlers: poolTable('bowler'),
};
poolSizes.summary = {
  t20iBatterPoolsOf5To10: poolSizes.batters.filter((pool) => pool.format === 'T20I' && pool.eligiblePlayers >= 5 && pool.eligiblePlayers <= 10).map((pool) => `${pool.pool}: ${pool.eligiblePlayers}`),
  t20iBatterPoolRange: [Math.min(...poolSizes.batters.filter((p) => p.format === 'T20I').map((p) => p.eligiblePlayers)), Math.max(...poolSizes.batters.filter((p) => p.format === 'T20I').map((p) => p.eligiblePlayers))],
  iplBatterPoolRange: [Math.min(...poolSizes.batters.filter((p) => p.format === 'IPL').map((p) => p.eligiblePlayers)), Math.max(...poolSizes.batters.filter((p) => p.format === 'IPL').map((p) => p.eligiblePlayers))],
  t20iBowlerPoolRange: [Math.min(...poolSizes.bowlers.filter((p) => p.format === 'T20I').map((p) => p.eligiblePlayers)), Math.max(...poolSizes.bowlers.filter((p) => p.format === 'T20I').map((p) => p.eligiblePlayers))],
  iplBowlerPoolRange: [Math.min(...poolSizes.bowlers.filter((p) => p.format === 'IPL').map((p) => p.eligiblePlayers)), Math.max(...poolSizes.bowlers.filter((p) => p.format === 'IPL').map((p) => p.eligiblePlayers))],
  thinBatterPools: poolSizes.batters.filter((pool) => pool.thin).length,
  thinBowlerPools: poolSizes.bowlers.filter((pool) => pool.thin).length,
};

// Where each primary top-10 player's pressure balls come from.
function poolExposure(kind, player) {
  const sizes = new Map(primaryPools[kind].map((pool) => [pool.key, pool.players.length]));
  const rows = [];
  for (const pool of primaryPools[kind]) {
    const entry = pool.players.find((item) => item.playerId === id(player));
    if (entry) rows.push({ pool: pool.key, poolSize: sizes.get(pool.key), pressureBalls: entry.pressureBalls });
  }
  const total = rows.reduce((sum, row) => sum + row.pressureBalls, 0);
  const inThin = rows.filter((row) => row.poolSize <= THIN_POOL_MAX).reduce((sum, row) => sum + row.pressureBalls, 0);
  const inT20I = rows.filter((row) => row.pool.startsWith('T20I')).reduce((sum, row) => sum + row.pressureBalls, 0);
  return {
    pools: rows.map((row) => ({ ...row, shareOfPlayersPressureBalls: round(row.pressureBalls / total) })),
    smallestPoolSize: Math.min(...rows.map((row) => row.poolSize)),
    shareOfPressureBallsInThinPools: round(inThin / total),
    shareOfPressureBallsInT20IPools: round(inT20I / total),
  };
}

// ---------- rank stability: leave-one-out, bootstrap, random pool deletion ----------
const eligibleIds = Object.fromEntries(KINDS.map(([kind]) => [kind, [...new Set(primaryPools[kind].flatMap((pool) => pool.players.map((player) => player.playerId)))]]));
const rankLookup = (list) => new Map(list.map((p) => [id(p), p.rank]));

function leaveOneOut(kind, key) {
  const top = primaryTop[key];
  const results = new Map(top.map((p) => [id(p), { ranks: [], exits: 0, worst: { rank: 0, dropped: null } }]));
  const droppedOrder = primaryRated[key].map(id).filter((playerId) => eligibleIds[kind].includes(playerId));
  let runs = 0;
  for (const dropped of droppedOrder) {
    const rated = ratePlayersOn(records.filter((record) => !(record.kind === kind && String(record.playerId) === dropped)));
    const ranks = rankLookup(rated[key]);
    runs += 1;
    for (const p of top) {
      if (id(p) === dropped) continue;
      const entry = results.get(id(p));
      const rank = ranks.get(id(p)) ?? Infinity;
      entry.ranks.push(rank);
      if (rank > TOP) entry.exits += 1;
      if (rank > entry.worst.rank) entry.worst = { rank, dropped: primaryRated[key].find((q) => id(q) === dropped).player };
    }
  }
  return { runs, results };
}

function groupRecords() {
  const groups = new Map();
  for (const record of records) {
    const groupKey = `${record.kind}:${record.playerId}:${record.format}:${record.season}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(record);
  }
  return [...groups.values()];
}

const pakistanIds = (list) => new Set(list.filter((record) => record.format === 'T20I' && record.team === 'Pakistan').map((record) => String(record.playerId)));
const baselinePakistan = pakistanIds(records);

function bootstrap() {
  const groups = groupRecords();
  const random = mulberry32(SEED);
  const tracked = Object.fromEntries(KINDS.map(([, key]) => [key, new Map(primaryTop[key].map((p) => [id(p), []]))]));
  const entries = Object.fromEntries(KINDS.map(([, key]) => [key, new Map()]));
  let pakistanChanged = 0;
  for (let run = 0; run < BOOTSTRAP_RUNS; run += 1) {
    const sample = [];
    for (const group of groups) {
      for (let index = 0; index < group.length; index += 1) sample.push(group[Math.floor(random() * group.length)]);
    }
    const pakistan = pakistanIds(sample);
    if (pakistan.size !== baselinePakistan.size || [...pakistan].some((playerId) => !baselinePakistan.has(playerId))) pakistanChanged += 1;
    const rated = ratePlayersOn(sample);
    for (const [, key] of KINDS) {
      const ranks = rankLookup(rated[key]);
      for (const [playerId, list] of tracked[key]) if (ranks.has(playerId)) list.push(ranks.get(playerId));
      for (const p of rated[key].slice(0, TOP)) entries[key].set(id(p), (entries[key].get(id(p)) ?? 0) + 1);
    }
  }
  return { tracked, entries, pakistanChanged };
}

function poolDeletion() {
  const random = mulberry32(SEED + 1);
  const tracked = Object.fromEntries(KINDS.map(([, key]) => [key, new Map(primaryTop[key].map((p) => [id(p), []]))]));
  const dropCounts = {};
  for (let run = 0; run < POOL_DELETE_RUNS; run += 1) {
    const dropped = {};
    for (const [kind, key] of KINDS) {
      const topIds = new Set(primaryTop[key].map(id));
      const candidates = eligibleIds[kind].filter((playerId) => !topIds.has(playerId));
      const count = Math.round(POOL_DELETE_FRACTION * candidates.length);
      for (let index = 0; index < count; index += 1) {
        const pick = index + Math.floor(random() * (candidates.length - index));
        [candidates[index], candidates[pick]] = [candidates[pick], candidates[index]];
      }
      dropped[kind] = new Set(candidates.slice(0, count));
      dropCounts[kind] = count;
    }
    const rated = ratePlayersOn(records.filter((record) => !dropped[record.kind]?.has(String(record.playerId))));
    for (const [, key] of KINDS) {
      const ranks = rankLookup(rated[key]);
      for (const [playerId, list] of tracked[key]) if (ranks.has(playerId)) list.push(ranks.get(playerId));
    }
  }
  return { tracked, dropCounts };
}

const looResults = Object.fromEntries(KINDS.map(([kind, key]) => [key, leaveOneOut(kind, key)]));
const bootstrapResults = bootstrap();
const deletionResults = poolDeletion();

const FRAGILITY_RULE = 'Share of runs with the player in the top 10: fragile below 50%, moderate 50% to under 80%, stable 80% or more. `fragility` uses the bootstrap share (a player\'s own sampling noise and the pools together); `poolCompositionFragility` uses the random pool-deletion share (only who else is in the pools changes).';
const fragilityLabel = (share) => (share < 0.5 ? 'fragile' : share < 0.8 ? 'moderate' : 'stable');

const stability = {
  method: {
    seed: SEED,
    prng: 'mulberry32',
    leaveOneOut: 'Drop one eligible player of the same kind (all his records as a batter, or as a bowler), re-rate everyone with scoring.mjs, record the rank of every primary top-10 player other than the dropped one. A dropped player ranked above a top-10 player lifts that rank by one, so the best rank here is mechanical; the worst rank and the exit count carry the information.',
    bootstrap: `${BOOTSTRAP_RUNS} resamples. Within each player-format-season group, the player-match records are drawn with replacement to the same count (a match-level cluster bootstrap), then everything is re-rated with scoring.mjs including the 60-ball / 8-match gate. This measures sampling noise in a player's own results (the primary top-10 players have 71 to 724 pressure balls) together with its effect on the pool z-scores, so it is a wider test than pool size alone; poolDeletion is the pool-only test.`,
    poolDeletion: `${POOL_DELETE_RUNS} runs. In each run a random ${POOL_DELETE_FRACTION * 100}% of the eligible players who are not in the primary top 10 are removed (${deletionResults.dropCounts.batter} batters, ${deletionResults.dropCounts.bowler} bowlers), then everything is re-rated. The top-10 players' own data is untouched, so this isolates how much the make-up of the pools matters.`,
    fragilityRule: FRAGILITY_RULE,
    pakistanExclusionSetChangedInBootstrapRuns: bootstrapResults.pakistanChanged,
  },
};
for (const [kind, key] of KINDS) {
  stability[key] = primaryTop[key].map((p) => {
    const loo = looResults[key].results.get(id(p));
    const looRanks = loo.ranks.filter(Number.isFinite);
    const boot = rankSummary(bootstrapResults.tracked[key].get(id(p)), BOOTSTRAP_RUNS);
    const del = rankSummary(deletionResults.tracked[key].get(id(p)), POOL_DELETE_RUNS);
    return {
      rank: p.rank,
      player: p.player,
      playerId: p.playerId,
      index: p.score,
      poolExposure: poolExposure(kind, p),
      leaveOneOut: {
        runs: loo.ranks.length,
        bestRank: Math.min(...loo.ranks),
        worstRank: Number.isFinite(Math.max(...loo.ranks)) ? Math.max(...loo.ranks) : null,
        timesOutOfTop10: loo.exits,
        timesNotEligible: loo.ranks.length - looRanks.length,
        worstCaseDroppedPlayer: loo.worst.dropped,
      },
      bootstrap: boot,
      poolDeletion: del,
      fragility: fragilityLabel(boot.shareInTop10),
      poolCompositionFragility: fragilityLabel(del.shareInTop10),
    };
  });
  const topIds = new Set(primaryTop[key].map(id));
  const names = new Map(records.filter((record) => record.kind === kind).map((record) => [String(record.playerId), record.playerName]));
  stability[`${key}OutsidersMostOftenInBootstrapTop10`] = [...bootstrapResults.entries[key]]
    .filter(([playerId]) => !topIds.has(playerId))
    .map(([playerId, count]) => ({ player: names.get(playerId) ?? playerId, playerId, primaryRank: primaryRated[key].find((p) => id(p) === playerId)?.rank ?? null, shareInTop10: round(count / BOOTSTRAP_RUNS) }))
    .sort((a, b) => b.shareInTop10 - a.shareInTop10 || a.player.localeCompare(b.player))
    .slice(0, 6);
}

// ---------- minimum pool size and pooling seasons (sensitivity only) ----------
function variantSummary(rated, pools) {
  const out = {
    eligible: { batters: rated.batters.length, bowlers: rated.bowlers.length },
  };
  for (const [kind, key] of KINDS) {
    out[key] = {
      top10: rated[key].slice(0, TOP).map(leanRow),
      versusPrimary: movement(primaryRated[key], rated[key]),
    };
  }
  if (pools) out.poolSizes = Object.fromEntries(KINDS.map(([kind, key]) => [key, pools[kind].map((pool) => ({ pool: pool.key, eligiblePlayers: pool.players.length }))]));
  return out;
}

const minimumPoolSize = {
  note: 'Sensitivity only. A pool is dropped for one kind (batters or bowlers) when it has fewer eligible players than K; the players\' records in that pool then contribute nothing (their reliability is also computed without them). The primary lists are unchanged.',
  variants: MIN_POOL_SIZES.map((minimum) => {
    const small = new Set(KINDS.flatMap(([kind]) => primaryPools[kind].filter((pool) => pool.players.length < minimum).map((pool) => `${kind}:${pool.key}`)));
    const kept = records.filter((record) => !small.has(`${record.kind}:${record.format}:${record.season}`));
    return {
      minimumPoolSize: minimum,
      poolsDropped: [...small].sort(),
      ...variantSummary(ratedWithPools(ratePlayersOn, kept).rated),
    };
  }),
};

const POOLINGS = [
  ['T20I seasons pooled, IPL seasons kept apart', (format) => format === 'T20I'],
  ['all seasons pooled within each format', () => true],
];
const poolingSeasons = {
  note: 'Sensitivity only. Two ways of pooling seasons. standardisationPooled keeps every player-format-season profile and the same eligible players, and only changes the pool the z-scores are taken against (several seasons share one pool), so it isolates the pool-size effect; it ignores differences in scoring environment between seasons. careerPooled merges a player\'s seasons into one profile per format, so the 60-ball / 8-match gate applies to the merged career and many more players qualify; it mixes the pool-size effect with an eligibility change.',
  standardisationPooled: POOLINGS.map(([label, pooled]) => {
    const result = ratedWithPools(ratePlayersOn, records, (player) => (pooled(player.format) ? `${player.format}:all-seasons` : `${player.format}:${player.season}`));
    return { label, ...variantSummary(result.rated, result.pools) };
  }),
  careerPooled: POOLINGS.map(([label, pooled]) => {
    const merged = records.map((record) => (pooled(record.format) ? { ...record, season: 0 } : record));
    const result = ratedWithPools(ratePlayersOn, merged);
    return { label, ...variantSummary(result.rated, result.pools) };
  }),
};

// ---------- `other` alternative and no-exclusion scenarios ----------
const scenarioRated = {
  exclusionsOn_otherPenalty: primaryRated,
  exclusionsOn_otherNoPenalty: rate(ratePlayersOn, recordsNoPenalty),
  exclusionsOff_otherPenalty: rate(ratePlayersOff, records),
  exclusionsOff_otherNoPenalty: rate(ratePlayersOff, recordsNoPenalty),
};

function scenarioBlock(name, comparedWith = 'exclusionsOn_otherPenalty') {
  const rated = scenarioRated[name];
  const base = scenarioRated[comparedWith];
  const block = {
    scenario: SCENARIOS.find(([key]) => key === name)[1],
    comparedWith,
    eligible: { batters: rated.batters.length, bowlers: rated.bowlers.length, allrounders: rated.allrounders.length },
  };
  for (const [kind, key] of KINDS) {
    block[key] = { top10: rated[key].slice(0, TOP).map((p) => fullRow(kind, p)), versusPrimary: movement(base[key], rated[key]) };
  }
  return block;
}

const otherAlternative = {
  assumption: 'Primary: an `other` delivery is an illegal ball (not one of the six legal balls) and the bowler is charged one penalty run, as for a no-ball; the run also counts in the innings score used for the required rate. Alternative shown here: still an illegal ball, but no penalty run is charged to the bowler or added to the innings score.',
  datasetQuality: {
    primaryPressureDeliveries: analysis.dataQuality.pressureDeliveries,
    alternativePressureDeliveries: noPenaltyQuality.pressureDeliveries,
    primaryOrdinaryDeliveries: analysis.dataQuality.ordinaryDeliveries,
    alternativeOrdinaryDeliveries: noPenaltyQuality.ordinaryDeliveries,
    matches: noPenaltyQuality.matches,
  },
  exclusionsOn: scenarioBlock('exclusionsOn_otherNoPenalty'),
  exclusionsOff: scenarioBlock('exclusionsOff_otherNoPenalty', 'exclusionsOff_otherPenalty'),
};

const noExclusion = {
  note: 'Same method and thresholds as the primary lists, with none of the player exclusions applied (the 53 Pakistan T20I players, the five IPL retirees, Mohit Sharma). Columns are the same as the primary tables.',
  ...scenarioBlock('exclusionsOff_otherPenalty'),
};

// ---------- robust core ----------
const robustCore = { scenarios: SCENARIOS.map(([key, label]) => ({ key, label })) };
for (const [kind, key] of KINDS) {
  const tops = SCENARIOS.map(([name]) => [name, scenarioRated[name][key].slice(0, TOP)]);
  const union = new Map();
  for (const [name, list] of tops) for (const p of list) if (!union.has(id(p))) union.set(id(p), p.player);
  const describe = (playerId) => {
    const ranks = Object.fromEntries(tops.map(([name, list]) => [name, list.find((p) => id(p) === playerId)?.rank ?? null]));
    return { player: union.get(playerId), playerId, ranks, scenariosInTop10: Object.values(ranks).filter((rank) => rank !== null).length };
  };
  const all = [...union.keys()].map(describe);
  robustCore[key] = {
    core: all.filter((entry) => entry.scenariosInTop10 === SCENARIOS.length)
      .sort((a, b) => (a.ranks.exclusionsOn_otherPenalty ?? 99) - (b.ranks.exclusionsOn_otherPenalty ?? 99)),
    primaryTop10NotInCore: primaryTop[key].map((p) => describe(id(p))).filter((entry) => entry.scenariosInTop10 < SCENARIOS.length)
      .map((entry) => ({ ...entry, missingFrom: SCENARIOS.filter(([name]) => entry.ranks[name] === null).map(([name]) => name) })),
    otherNamesInSomeScenario: all.filter((entry) => entry.ranks.exclusionsOn_otherPenalty === null)
      .sort((a, b) => b.scenariosInTop10 - a.scenariosInTop10 || a.player.localeCompare(b.player)),
  };
}

// ---------- evidence for the `other` interpretation, from ball_by_ball.csv ----------
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

async function readRows(file) {
  const lines = (await readFile(resolve(root, file), 'utf8')).trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  return lines.filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

const ballRows = await readRows('ball_by_ball.csv');
const matchRows = new Map((await readRows('matches.csv')).map((row) => [row.match_id, row]));
const tally = (rows, pick) => {
  const counts = {};
  for (const row of rows) counts[pick(row)] = (counts[pick(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
};
const typeOf = (row) => row.extras_type.toLowerCase();
const profile = (rows) => ({
  rows: rows.length,
  batterRuns: tally(rows, (row) => row.runs),
  extras1Runs: tally(rows, (row) => row.extras1_runs),
  extras2Runs: tally(rows, (row) => row.extras_2_runs),
  isFour: tally(rows, (row) => row.is_four),
  isSix: tally(rows, (row) => row.is_six),
  wicketRows: rows.filter((row) => row.is_wicket === 'true').length,
  dismissalTypesOnWicketRows: tally(rows.filter((row) => row.is_wicket === 'true'), (row) => row.dismissal_type || '(blank)'),
  rowsWithBatterRuns: rows.filter((row) => Number(row.runs) > 0).length,
});
const otherRows = ballRows.filter((row) => typeOf(row) === 'other');
const ILLEGAL_KNOWN = new Set(['wide', 'overstep', 'noballs', 'no-ball']);

const overs = new Map();
const lastOver = new Map();
for (const row of ballRows) {
  const inningsKey = `${row.match_id}|${row.innings}`;
  lastOver.set(inningsKey, Math.max(lastOver.get(inningsKey) ?? 0, Number(row.overid)));
  const key = `${inningsKey}|${row.overid}`;
  if (!overs.has(key)) overs.set(key, { inningsKey, over: Number(row.overid), rows: 0, known: 0, other: 0 });
  const entry = overs.get(key);
  entry.rows += 1;
  if (ILLEGAL_KNOWN.has(typeOf(row))) entry.known += 1;
  if (typeOf(row) === 'other') entry.other += 1;
}
const allOvers = [...overs.values()];
const finishedOvers = allOvers.filter((entry) => entry.over < lastOver.get(entry.inningsKey));
const withOther = allOvers.filter((entry) => entry.other > 0);
const withOtherFinished = withOther.filter((entry) => entry.over < lastOver.get(entry.inningsKey));
const legalIfOtherIsLegal = (entry) => entry.rows - entry.known;
const legalIfOtherIsIllegal = (entry) => entry.rows - entry.known - entry.other;
const withoutOtherFinished = finishedOvers.filter((entry) => entry.other === 0);

// Run-margin test: in matches decided by runs, with no byes/leg-byes/penalty runs, no revised overs or target and no
// super over, the margin should equal innings 1 total minus innings 2 total.
const byMatch = new Map();
for (const row of ballRows) {
  if (!byMatch.has(row.match_id)) byMatch.set(row.match_id, []);
  byMatch.get(row.match_id).push(row);
}
const calibration = { matches: 0, margin_equals_total_difference: 0 };
const otherMatches = [];
for (const [matchId, rows] of byMatch) {
  const match = matchRows.get(matchId);
  const parsed = /^(.*) Won by (\d+) Runs?$/i.exec(match?.result ?? '');
  if (!parsed || match.revised_target || match.first_inn_revised_overs || match.second_inn_revised_overs) continue;
  if (rows.some((row) => Number(row.innings) > 2 || ['byes', 'legbyes', 'penalty'].includes(typeOf(row)))) continue;
  const totals = (otherPenalty) => {
    const sums = { 1: 0, 2: 0 };
    for (const row of rows) {
      const extra = typeOf(row);
      sums[Number(row.innings)] += (Number(row.runs) || 0) + (['wide', 'overstep'].includes(extra) ? 1 : 0) + (extra === 'other' ? otherPenalty : 0);
    }
    return sums[1] - sums[2];
  };
  const margin = Number(parsed[2]);
  if (rows.some((row) => typeOf(row) === 'other')) {
    otherMatches.push({ matchId, result: match.result, otherRows: rows.filter((row) => typeOf(row) === 'other').length, differenceWithPenalty: totals(1), differenceWithoutPenalty: totals(0), margin });
  } else {
    calibration.matches += 1;
    if (totals(1) === margin) calibration.margin_equals_total_difference += 1;
  }
}

const profiles = {
  other: profile(otherRows),
  overstep: profile(ballRows.filter((row) => typeOf(row) === 'overstep')),
  wide: profile(ballRows.filter((row) => typeOf(row) === 'wide')),
  penalty: profile(ballRows.filter((row) => typeOf(row) === 'penalty')),
};
const countIn = (list, test) => list.filter(test).length;
const otherEvidence = {
  source: 'ball_by_ball.csv, all rows (the file also holds competitions outside the IPL / T20I scope)',
  extrasTypeCounts: tally(ballRows, (row) => row.extras_type),
  profiles,
  otherRowsShareWithBatterRuns: round(profiles.other.rowsWithBatterRuns / profiles.other.rows),
  overstepRowsShareWithBatterRuns: round(profiles.overstep.rowsWithBatterRuns / profiles.overstep.rows),
  overLength: {
    note: 'Legal balls in an over = rows in that over minus the rows known to be illegal (wide, Overstep), and minus the `other` rows in the "illegal" case. The last over of each innings is excluded because it can be cut short.',
    oversWithAnOtherRow: withOther.length,
    oversWithAnOtherRow_excludingLastOverOfInnings: withOtherFinished.length,
    legalBallsPerOver_ifOtherIsLegal: tally(withOtherFinished, legalIfOtherIsLegal),
    legalBallsPerOver_ifOtherIsIllegal: tally(withOtherFinished, legalIfOtherIsIllegal),
    oversWithMoreThanSixLegalBalls_ifOtherIsLegal: countIn(withOtherFinished, (entry) => legalIfOtherIsLegal(entry) > 6),
    oversWithExactlySixLegalBalls_ifOtherIsIllegal: countIn(withOtherFinished, (entry) => legalIfOtherIsIllegal(entry) === 6),
    oversWithMoreThanSixLegalBalls_ifOtherIsLegal_includingLastOvers: countIn(withOther, (entry) => legalIfOtherIsLegal(entry) > 6),
    oversWithExactlySixLegalBalls_ifOtherIsIllegal_includingLastOvers: countIn(withOther, (entry) => legalIfOtherIsIllegal(entry) === 6),
    earlierReportFigure: 'methodology_report.md says seven or more legal balls in 244 overs; this recount gives 243 (of the 254 overs with an `other` row, the other 11 are shortened last overs of an innings).',
    baselineOversWithoutOtherRow: {
      finishedOvers: withoutOtherFinished.length,
      exactlySixLegalBalls: countIn(withoutOtherFinished, (entry) => legalIfOtherIsLegal(entry) === 6),
      shareWithExactlySixLegalBalls: round(countIn(withoutOtherFinished, (entry) => legalIfOtherIsLegal(entry) === 6) / withoutOtherFinished.length),
    },
  },
  runMarginCheck: {
    note: 'Matches decided by runs, with no byes, leg-byes, penalty rows, super over or revised overs, where the winning margin should equal innings 1 total minus innings 2 total (bat runs + 1 per wide and Overstep). The method is first checked on matches that have no `other` row.',
    calibrationMatchesWithoutOther: calibration.matches,
    calibrationMatchesWhereMarginEqualsDifference: calibration.margin_equals_total_difference,
    matchesWithOther: otherMatches,
    verdict: calibration.margin_equals_total_difference / calibration.matches >= 0.9
      ? 'usable'
      : 'inconclusive: the check does not reproduce the margin in many matches that have no `other` row, so it cannot decide the penalty question',
  },
  inScopeEffect: {
    note: 'Pressure deliveries in the 837 in-scope matches with the penalty run (primary) and without it.',
    pressureDeliveriesWithPenalty: analysis.dataQuality.pressureDeliveries,
    pressureDeliveriesWithoutPenalty: noPenaltyQuality.pressureDeliveries,
    difference: analysis.dataQuality.pressureDeliveries - noPenaltyQuality.pressureDeliveries,
  },
};
const ov = otherEvidence.overLength;
otherEvidence.summary = [
  `${profiles.other.rows} rows have extras_type 'other'. extras1_runs is ${Object.entries(profiles.other.extras1Runs).map(([k, v]) => `${k} on ${v}`).join(', ')} rows; for wide it is ${Object.keys(profiles.wide.extras1Runs).join('/')}, for Overstep ${Object.keys(profiles.overstep.extras1Runs).join('/')}, for ordinary balls 6.`,
  `Batter runs are recorded on ${profiles.other.rowsWithBatterRuns} of the ${profiles.other.rows} 'other' rows (${profiles.other.isSix['true'] ?? 0} sixes, ${profiles.other.isFour['true'] ?? 0} fours); on Overstep rows ${profiles.overstep.rowsWithBatterRuns} of ${profiles.overstep.rows}; wides never carry batter runs (${profiles.wide.rowsWithBatterRuns} of ${profiles.wide.rows}).`,
  `${profiles.other.wicketRows} 'other' rows carry a wicket: ${Object.entries(profiles.other.dismissalTypesOnWicketRows).map(([k, v]) => `${v} ${k}`).join(', ')}. For Overstep rows: ${Object.entries(profiles.overstep.dismissalTypesOnWicketRows).map(([k, v]) => `${v} ${k}`).join(', ')}.`,
  `${ov.oversWithAnOtherRow} overs contain an 'other' row. If 'other' were a legal ball, ${ov.oversWithMoreThanSixLegalBalls_ifOtherIsLegal_includingLastOvers} of them would have more than six legal balls (${ov.oversWithMoreThanSixLegalBalls_ifOtherIsLegal} of the ${ov.oversWithAnOtherRow_excludingLastOverOfInnings} that are not the last over of an innings); treated as illegal, ${ov.oversWithExactlySixLegalBalls_ifOtherIsIllegal_includingLastOvers} have exactly six (${ov.oversWithExactlySixLegalBalls_ifOtherIsIllegal} of ${ov.oversWithAnOtherRow_excludingLastOverOfInnings} not-last overs). Overs with no 'other' row have exactly six in ${(ov.baselineOversWithoutOtherRow.shareWithExactlySixLegalBalls * 100).toFixed(1)}% of ${ov.baselineOversWithoutOtherRow.finishedOvers} finished overs.`,
  `No row says how many runs the 'other' extra is worth: 'runs' is the batter's runs on every extras type, so the +1 penalty is a rule-based assumption (a no-ball costs the bowler one run), not something read from a column. Run-margin check: ${otherEvidence.runMarginCheck.verdict.startsWith('usable') ? 'usable' : 'inconclusive'} (${calibration.margin_equals_total_difference} of ${calibration.matches} calibration matches reproduce the margin; ${otherMatches.length} match with an 'other' row qualifies${otherMatches.length === 1 ? `, and its margin ${otherMatches[0].margin} equals the difference ${otherMatches[0].differenceWithPenalty} with the penalty run and ${otherMatches[0].differenceWithoutPenalty} without it` : ''}).`,
  `In the in-scope data the penalty run adds ${otherEvidence.inScopeEffect.difference} pressure deliveries (${otherEvidence.inScopeEffect.pressureDeliveriesWithoutPenalty} to ${otherEvidence.inScopeEffect.pressureDeliveriesWithPenalty}).`,
];

// ---------- exclusion flip ----------
const sourceLines = scoringSource.split(/\r?\n/);
const conditionTexts = [
  '!pakistanPlayers.has(String(record.playerId))',
  '&& !IPL_RETIRED_PLAYER_IDS.has(String(record.playerId))',
  '&& !IPL_2027_NONPLAYER_IDS.has(String(record.playerId))',
];
const firstLine = sourceLines.findIndex((line) => line.trim() === conditionTexts[0]);
if (firstLine < 0 || conditionTexts.some((text, offset) => sourceLines[firstLine + offset]?.trim() !== text)) throw new Error('exclusion lines in scoring.mjs are not the expected three consecutive lines');
const flippedLines = [...sourceLines.slice(0, firstLine), '    true', ...sourceLines.slice(firstLine + 3)];
const flippedRated = (await loadModule(flippedLines.join('\n'))).ratePlayers(records);
const flipMatchesNoExclusionLists = JSON.stringify([flippedRated.batters, flippedRated.bowlers, flippedRated.allrounders])
  === JSON.stringify([scenarioRated.exclusionsOff_otherPenalty.batters, scenarioRated.exclusionsOff_otherPenalty.bowlers, scenarioRated.exclusionsOff_otherPenalty.allrounders]);

const exclusionFlip = {
  summary: 'The exclusions are three adjacent conditions in scoring.mjs, not one line. The smallest edit replaces those three lines by the single line `true`.',
  file: 'scoring.mjs',
  linesToReplace: conditionTexts.map((text, offset) => ({ line: firstLine + 1 + offset, text: sourceLines[firstLine + offset] })),
  within: sourceLines[firstLine - 1],
  replacementForTheThreeLines: '    true',
  resultingCode: [sourceLines[firstLine - 1], '    true', sourceLines[firstLine + 3]],
  editCheckedBySensitivityScript: flipMatchesNoExclusionLists,
  checkDescription: 'sensitivity.mjs applies this exact edit to a copy of scoring.mjs in memory and confirms the batter, bowler and all-rounder lists equal the noExclusion lists in this file.',
  whatTheEditDoes: 'Keeps the format and season filters, drops the Pakistan T20I, IPL retiree and Mohit Sharma filters. The constants and the ratingRules text that mention the exclusions become unused; they are harmless.',
  analysisDataNeedsRegenerating: 'No. The exclusions are applied in scoring.mjs after analysis_data.json is built, so do not run analyze.mjs for this change.',
  commands: [
    '1. Edit scoring.mjs as above (the dashboard, which imports scoring.mjs, then shows the no-exclusion lists at once).',
    '2. node sensitivity.mjs --print-top10   (prints the top-10 batters and bowlers that scoring.mjs now gives; they must equal noExclusion.batters.top10 and noExclusion.bowlers.top10 in sensitivity_data.json)',
    '3. Do not re-run `node sensitivity.mjs` without arguments after the edit: it describes the exclusions-on primary list and stops with an error if the three conditions are missing. To rebuild sensitivity_data.json, restore scoring.mjs first (git checkout -- scoring.mjs).',
    '4. Refresh the report: methodology_report.md, methodology_report.html and methodology_report.pdf are written by hand (the PDF is the html printed to PDF). Copy the tables from noExclusion in sensitivity_data.json, make the no-exclusion lists the primary tables, and make the exclusion list the sensitivity table.',
    '5. Static text that also mentions the exclusions: README.md, index.html (method step 06) and the executive summary and limitations text in the report. The Unstop dropdown entries must be changed to the no-exclusion names.',
  ],
};

// ---------- write ----------
const output = {
  about: 'Sensitivity checks for the Round 1 pressure index. Nothing here changes the primary method or the primary lists. Regenerate with `node sensitivity.mjs` from the data folder.',
  reproducibility: {
    command: 'node sensitivity.mjs',
    seed: SEED,
    prng: 'mulberry32',
    bootstrapRuns: BOOTSTRAP_RUNS,
    poolDeletionRuns: POOL_DELETE_RUNS,
    poolDeletionFraction: POOL_DELETE_FRACTION,
    thinPoolMaxPlayers: THIN_POOL_MAX,
    noTimestamps: true,
    inputs: {
      analysisDataRecords: records.length,
      analysisDataMatches: analysis.dataQuality.matches,
      analysisDataDeliveriesInScope: analysis.dataQuality.pressureDeliveries + analysis.dataQuality.ordinaryDeliveries,
      analysisDataSha256WithoutGeneratedAt: createHash('sha256').update(analysisFile.replace(/"generatedAt":"[^"]*"/, '"generatedAt":""').replace(/\r\n/g, '\n')).digest('hex'),
      analyzeMjsRegeneratesAnalysisDataIdentically: regeneratesIdentically,
    },
  },
  primaryCheck: {
    description: 'Primary lists as computed here (scoring.mjs on analysis_data.json, exclusions on, 60 balls / 8 matches).',
    matchesScoringModule: primaryMatchesScoringModule,
    eligible: { batters: primaryRated.batters.length, bowlers: primaryRated.bowlers.length, allrounders: primaryRated.allrounders.length },
    batters: primaryTop.batters.map((p) => fullRow('batter', p)),
    bowlers: primaryTop.bowlers.map((p) => fullRow('bowler', p)),
  },
  poolSizes,
  rankStability: stability,
  minimumPoolSize,
  poolingSeasons,
  otherAlternative,
  noExclusion,
  robustCore,
  otherEvidence,
  exclusionFlip,
};

await writeFile(resolve(root, 'sensitivity_data.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log('Wrote sensitivity_data.json');
console.log(`primary lists match scoring.mjs: ${primaryMatchesScoringModule}; analyze.mjs regenerates analysis_data.json identically: ${regeneratesIdentically}`);
