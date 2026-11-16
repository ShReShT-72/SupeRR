// Pool-method comparison for scoring.mjs (thin T20I pools). Called by `node sensitivity.mjs --pool-methods`;
// it is not meant to be run on its own. The criterion, the candidates and their parameters are fixed in
// pool_preregistration.md (committed before any candidate was run) and repeated in PREREGISTERED below.
// Primary method = own-pool (the method of the submitted lists). The other three are alternatives under test.
// Output: pool_methods_data.json (no timestamps).

export const PREREGISTERED = {
  document: 'pool_preregistration.md',
  settings: { S1: 'submitted: no exclusions', S2: 'APPLY_PLAYER_EXCLUSIONS true' },
  seeds: { bootstrap: 20261116, poolDeletion: 20261117, poolThinning: 20261118, pairCi: 20261119 },
  runs: { bootstrap: 1000, poolDeletion: 1000, poolThinning: 500, pairCiDraws: 1000 },
  poolDeletionFraction: 0.2,
  thinPoolMax: 10,
  thinningKeep: 8,
  pseudoCount: 5,
  rules: {
    1: 'M1 candidate <= 0.85 x M1 BASE in all four cells (S1, S2 x batters, bowlers)',
    2: 'S2 batters: mean(M2a, M2b) rises by >= 0.02, or mean(M3a, M3b) falls by >= 10% relative',
    3: 'no harm in all four cells: M2a, M2b >= BASE - 0.01; M3a, M3b <= BASE + 0.5; M4 <= BASE + 0.005; M5-all >= BASE - 0.02',
    4: 'eligible counts (batters, bowlers, all-rounders) identical to BASE, S1 and S2',
    5: 'large-pool players (no profile in a thin stratum): max |index change| <= 1.0 and max |rank change| <= 5, S1 and S2',
    6: 'players with a profile in a thin stratum: max |index change| <= 5.0, S1 and S2',
    7: 'S1: at most 3 top-10 names change per list (batters, bowlers, all-rounders)',
  },
  thresholds: { m1Ratio: 0.85, m2Rise: 0.02, m3Fall: 0.10, m2Harm: 0.01, m3Harm: 0.5, m4Harm: 0.005, m5Harm: 0.02, largePoolIndex: 1.0, largePoolRank: 5, thinPoolIndex: 5.0, s1NamesChanged: 3, tieMargin: 0.02 },
  decision: 'Candidates failing any rule are rejected. One passer: adopt. Several: larger mean relative M1 reduction over the four cells; within 2 percentage points: fewer S1 indexes changed, then simpler (C1, C3, C2). None: KEEP_CURRENT.',
};

const METHODS = [
  { method: 'own-pool', code: 'BASE', role: 'primary', label: 'current method: each stratum standardised against its own pool' },
  { method: 'format-fallback', code: 'C1', role: 'alternative', label: 'a stratum with 10 or fewer eligible profiles uses all seasons of the same format' },
  { method: 'shrunk', code: 'C2', role: 'alternative', label: 'every stratum: mean and variance shrunk toward all seasons of the format, pseudo-count 5' },
  { method: 'adjacent-fallback', code: 'C3', role: 'alternative', label: 'a stratum with 10 or fewer eligible profiles uses the adjacent seasons, then all seasons if still thin' },
];
const KINDS = [['batter', 'batters'], ['bowler', 'bowlers']];
const CELLS = [['S1', 'batters'], ['S1', 'bowlers'], ['S2', 'batters'], ['S2', 'bowlers']];
const TOP = 10;
const round = (value, digits = 3) => (Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : null);
const id = (player) => String(player.playerId);
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const profileKey = (kind, playerId, format, season) => `${kind}:${playerId}:${format}:${season}`;

function pearson(xs, ys) {
  if (xs.length < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let index = 0; index < xs.length; index += 1) {
    sxy += (xs[index] - mx) * (ys[index] - my);
    sxx += (xs[index] - mx) ** 2;
    syy += (ys[index] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

function once(source, text, label) {
  if (source.split(text).length !== 2) throw new Error(`scoring.mjs changed shape: ${label} not found exactly once.`);
}

export async function runPoolMethods({ scoringSource, records, committed, mulberry32, loadModule, exclusionSwitch, exclusionSwitchOn, log }) {
  const HOOK_ANCHOR = '    const rollups = new Map();';
  const COMPOSITE_ANCHOR = '        const key = `${kind}:${player.playerId}`;';
  once(scoringSource, HOOK_ANCHOR, 'the rollups line');
  once(scoringSource, COMPOSITE_ANCHOR, 'the roll-up key line');
  once(scoringSource, exclusionSwitch, 'the exclusion switch');
  const instrumented = scoringSource
    .replace(HOOK_ANCHOR, `    globalThis.__poolHook?.(kind, strata);\n${HOOK_ANCHOR}`)
    .replace(COMPOSITE_ANCHOR, `        globalThis.__poolComposite?.(kind, player, rawScore);\n${COMPOSITE_ANCHOR}`);
  const shipped = (await import(new URL('./scoring.mjs', import.meta.url).href)).ratePlayers;
  const raters = {
    S1: (await loadModule(instrumented)).ratePlayers,
    S2: (await loadModule(instrumented.replace(exclusionSwitch, exclusionSwitchOn))).ratePlayers,
  };

  // One rating with the pools and the stratum composites recorded.
  function rate(setting, input, method) {
    const pools = {};
    const composites = { batter: new Map(), bowler: new Map() };
    globalThis.__poolHook = (kind, strata) => {
      pools[kind] = [...strata].map(([key, players]) => ({
        key, format: players[0].format, season: players[0].season, players: players.map((p) => ({ playerId: id(p), playerName: p.player })),
      })).sort((a, b) => (a.format === b.format ? Number(a.season) - Number(b.season) : a.format.localeCompare(b.format)));
    };
    globalThis.__poolComposite = (kind, player, raw) => composites[kind].set(profileKey(kind, player.playerId, player.format, player.season), raw);
    try {
      return { rated: raters[setting](input, { poolMethod: method }), pools, composites };
    } finally {
      delete globalThis.__poolHook;
      delete globalThis.__poolComposite;
    }
  }

  // Record groups for the bootstrap (same grouping and sampling order as sensitivity.mjs).
  const groups = (() => {
    const map = new Map();
    for (const record of records) {
      const key = `${record.kind}:${record.playerId}:${record.format}:${record.season}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(record);
    }
    return [...map.values()];
  })();

  // POOL_METHODS_SMOKE=1: three runs per test, only to check the code path; never used for results.
  const smoke = Boolean(process.env.POOL_METHODS_SMOKE);
  const P = smoke ? { ...PREREGISTERED, runs: { bootstrap: 3, poolDeletion: 3, poolThinning: 3, pairCiDraws: 20 } } : PREREGISTERED;
  const results = {};

  for (const setting of ['S1', 'S2']) {
    const full = Object.fromEntries(METHODS.map(({ method }) => [method, rate(setting, records, method)]));
    const basePools = full['own-pool'].pools;
    const eligibleIds = Object.fromEntries(KINDS.map(([kind]) => [kind, [...new Set(basePools[kind].flatMap((pool) => pool.players.map((p) => p.playerId)))]]));
    const stratumSize = new Map(KINDS.flatMap(([kind]) => basePools[kind].map((pool) => [`${kind}:${pool.format}:${pool.season}`, pool.players.length])));
    const isThin = (kind, format, season) => stratumSize.get(`${kind}:${format}:${season}`) <= P.thinPoolMax;
    const thinPlayers = Object.fromEntries(KINDS.map(([kind]) => [kind, new Set(basePools[kind].filter((pool) => pool.players.length <= P.thinPoolMax).flatMap((pool) => pool.players.map((p) => p.playerId)))]));

    // M1 thinning draws, shared by all methods of this setting.
    const thinningRemovals = (() => {
      const random = mulberry32(P.seeds.poolThinning);
      const runs = [];
      for (let run = 0; run < P.runs.poolThinning; run += 1) {
        const removed = new Set();
        for (const [kind] of KINDS) {
          for (const pool of basePools[kind]) {
            if (pool.players.length <= P.thinningKeep) continue;
            const ids = pool.players.map((p) => p.playerId);
            for (let index = 0; index < P.thinningKeep; index += 1) {
              const pick = index + Math.floor(random() * (ids.length - index));
              [ids[index], ids[pick]] = [ids[pick], ids[index]];
            }
            for (const dropped of ids.slice(P.thinningKeep)) removed.add(profileKey(kind, dropped, pool.format, pool.season));
          }
        }
        runs.push(removed);
      }
      return runs;
    })();
    const thinnedRecords = thinningRemovals.map((removed) => records.filter((r) => !removed.has(profileKey(r.kind, r.playerId, r.format, r.season))));

    results[setting] = { full, eligibleIds, thinPlayers, stratumSize, methods: {} };

    for (const { method, code } of METHODS) {
      log?.(`${setting} ${code} (${method})`);
      const ref = full[method];
      const top = Object.fromEntries(KINDS.map(([, key]) => [key, ref.rated[key].slice(0, TOP)]));
      const topIds = Object.fromEntries(KINDS.map(([, key]) => [key, new Set(top[key].map(id))]));
      const refRank = Object.fromEntries(KINDS.map(([, key]) => [key, new Map(ref.rated[key].map((p) => [id(p), p.rank]))]));
      const cell = Object.fromEntries(KINDS.map(([, key]) => [key, {}]));

      // M2b / M3b: cluster bootstrap.
      {
        const random = mulberry32(P.seeds.bootstrap);
        const share = Object.fromEntries(KINDS.map(([, key]) => [key, []]));
        const disp = Object.fromEntries(KINDS.map(([, key]) => [key, []]));
        const perPlayer = Object.fromEntries(KINDS.map(([, key]) => [key, new Map(top[key].map((p) => [id(p), 0]))]));
        for (let run = 0; run < P.runs.bootstrap; run += 1) {
          const sample = [];
          for (const group of groups) for (let index = 0; index < group.length; index += 1) sample.push(group[Math.floor(random() * group.length)]);
          const rated = raters[setting](sample, { poolMethod: method });
          for (const [, key] of KINDS) {
            const ranks = new Map(rated[key].map((p) => [id(p), p.rank]));
            let inTop = 0;
            for (const p of top[key]) {
              const rank = ranks.get(id(p));
              if (rank !== undefined && rank <= TOP) { inTop += 1; perPlayer[key].set(id(p), perPlayer[key].get(id(p)) + 1); }
              disp[key].push(Math.abs((rank ?? (rated[key].length + 1)) - p.rank));
            }
            share[key].push(inTop / TOP);
          }
        }
        for (const [, key] of KINDS) {
          cell[key].M2b = mean(share[key]);
          cell[key].M3b = mean(disp[key]);
          cell[key].bootstrapShares = top[key].map((p) => ({ player: p.player, playerId: p.playerId, rank: p.rank, shareInTop10: round(perPlayer[key].get(id(p)) / P.runs.bootstrap) }));
        }
      }

      // M2a / M3a: random pool deletion.
      {
        const random = mulberry32(P.seeds.poolDeletion);
        const share = Object.fromEntries(KINDS.map(([, key]) => [key, []]));
        const disp = Object.fromEntries(KINDS.map(([, key]) => [key, []]));
        const perPlayer = Object.fromEntries(KINDS.map(([, key]) => [key, new Map(top[key].map((p) => [id(p), 0]))]));
        for (let run = 0; run < P.runs.poolDeletion; run += 1) {
          const dropped = {};
          for (const [kind, key] of KINDS) {
            const candidates = eligibleIds[kind].filter((playerId) => !topIds[key].has(playerId));
            const count = Math.round(P.poolDeletionFraction * candidates.length);
            for (let index = 0; index < count; index += 1) {
              const pick = index + Math.floor(random() * (candidates.length - index));
              [candidates[index], candidates[pick]] = [candidates[pick], candidates[index]];
            }
            dropped[kind] = new Set(candidates.slice(0, count));
          }
          const rated = raters[setting](records.filter((r) => !dropped[r.kind]?.has(String(r.playerId))), { poolMethod: method });
          for (const [, key] of KINDS) {
            const ranks = new Map(rated[key].map((p) => [id(p), p.rank]));
            let inTop = 0;
            for (const p of top[key]) {
              const rank = ranks.get(id(p));
              if (rank !== undefined && rank <= TOP) { inTop += 1; perPlayer[key].set(id(p), perPlayer[key].get(id(p)) + 1); }
              disp[key].push(Math.abs((rank ?? (rated[key].length + 1)) - p.rank));
            }
            share[key].push(inTop / TOP);
          }
        }
        for (const [, key] of KINDS) {
          cell[key].M2a = mean(share[key]);
          cell[key].M3a = mean(disp[key]);
          cell[key].poolDeletionShares = top[key].map((p) => ({ player: p.player, playerId: p.playerId, rank: p.rank, shareInTop10: round(perPlayer[key].get(id(p)) / P.runs.poolDeletion) }));
        }
      }

      // M4: leave-one-out exits.
      for (const [kind, key] of KINDS) {
        let exits = 0;
        let runs = 0;
        for (const dropped of eligibleIds[kind]) {
          const rated = raters[setting](records.filter((r) => !(r.kind === kind && String(r.playerId) === dropped)), { poolMethod: method });
          const ranks = new Map(rated[key].map((p) => [id(p), p.rank]));
          runs += 1;
          for (const p of top[key]) {
            if (id(p) === dropped) continue;
            if ((ranks.get(id(p)) ?? Infinity) > TOP) exits += 1;
          }
        }
        cell[key].M4 = exits / (TOP * runs);
        cell[key].M4detail = { exits, dropRuns: runs };
      }

      // M1: pool-thinning error.
      {
        const sq = { batter: 0, bowler: 0 };
        const count = { batter: 0, bowler: 0 };
        for (let run = 0; run < thinnedRecords.length; run += 1) {
          const { composites } = rate(setting, thinnedRecords[run], method);
          for (const [kind] of KINDS) {
            for (const [key, value] of composites[kind]) {
              const reference = ref.composites[kind].get(key);
              if (reference === undefined) throw new Error(`thinned profile ${key} missing in the full data`);
              sq[kind] += (value - reference) ** 2;
              count[kind] += 1;
            }
          }
        }
        for (const [kind, key] of KINDS) {
          const values = [...ref.composites[kind].values()];
          const m = mean(values);
          const sd = Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
          cell[key].M1 = Math.sqrt(sq[kind] / count[kind]) / sd;
          cell[key].M1detail = { rmse: round(Math.sqrt(sq[kind] / count[kind]), 4), fullDataCompositeSd: round(sd, 4), profileComparisons: count[kind] };
        }
      }

      // M5: consecutive-season consistency of the composite.
      for (const [kind, key] of KINDS) {
        const byPlayerFormat = new Map();
        for (const [profile, value] of ref.composites[kind]) {
          const [, playerId, format, season] = profile.split(':');
          const groupKey = `${playerId}:${format}`;
          if (!byPlayerFormat.has(groupKey)) byPlayerFormat.set(groupKey, new Map());
          byPlayerFormat.get(groupKey).set(Number(season), { value, format, season: Number(season) });
        }
        const pairs = [];
        for (const seasons of byPlayerFormat.values()) {
          for (const [season, a] of seasons) {
            const b = seasons.get(season + 1);
            if (b) pairs.push({ x: a.value, y: b.value, thin: isThin(kind, a.format, a.season) || isThin(kind, b.format, b.season) });
          }
        }
        const summarise = (list, seed) => {
          const r = pearson(list.map((p) => p.x), list.map((p) => p.y));
          const random = mulberry32(seed);
          const draws = [];
          for (let draw = 0; draw < P.runs.pairCiDraws && list.length >= 3; draw += 1) {
            const sample = list.map(() => list[Math.floor(random() * list.length)]);
            const rr = pearson(sample.map((p) => p.x), sample.map((p) => p.y));
            if (rr !== null) draws.push(rr);
          }
          draws.sort((a, b) => a - b);
          return { r: round(r, 4), pairs: list.length, ci95: draws.length ? [round(draws[Math.floor(0.025 * draws.length)], 3), round(draws[Math.min(draws.length - 1, Math.ceil(0.975 * draws.length) - 1)], 3)] : null };
        };
        cell[key].M5all = summarise(pairs, P.seeds.pairCi);
        cell[key].M5thin = summarise(pairs.filter((p) => p.thin), P.seeds.pairCi);
      }

      results[setting].methods[method] = { cell, top };
      if (setting === 'S1' && method === 'own-pool') {
        // The harness must reproduce the committed sensitivity_data.json (same seeds, same sampling order).
        const mismatches = [];
        for (const [, key] of KINDS) {
          committed.rankStability[key].forEach((row, index) => {
            const boot = cell[key].bootstrapShares[index];
            const del = cell[key].poolDeletionShares[index];
            if (boot.playerId !== row.playerId || boot.shareInTop10 !== row.bootstrap.shareInTop10) mismatches.push(`${key} ${row.player} bootstrap ${boot.shareInTop10} vs ${row.bootstrap.shareInTop10}`);
            if (del.playerId !== row.playerId || del.shareInTop10 !== row.poolDeletion.shareInTop10) mismatches.push(`${key} ${row.player} poolDeletion ${del.shareInTop10} vs ${row.poolDeletion.shareInTop10}`);
          });
        }
        results.reproduction = { baseS1MatchesCommittedSensitivityData: mismatches.length === 0, mismatches };
        if (mismatches.length && !smoke) throw new Error(`BASE S1 does not reproduce sensitivity_data.json rankStability:\n${mismatches.join('\n')}`);
        const shippedSame = JSON.stringify(shipped(records)) === JSON.stringify(ref.rated);
        if (!shippedSame) throw new Error('instrumented BASE differs from scoring.mjs default');
      }
    }
  }

  // ---------- side effects against BASE ----------
  const sideEffects = {};
  for (const setting of ['S1', 'S2']) {
    const baseRef = results[setting].full['own-pool'];
    sideEffects[setting] = {};
    for (const { method } of METHODS.slice(1)) {
      const ref = results[setting].full[method];
      const entry = { eligible: { batters: ref.rated.batters.length, bowlers: ref.rated.bowlers.length, allrounders: ref.rated.allrounders.length } };
      entry.eligibleIdentical = ['batters', 'bowlers', 'allrounders'].every((key) => ref.rated[key].length === baseRef.rated[key].length);
      let largeIndex = { max: 0, player: null }; let largeRank = { max: 0, player: null }; let thinIndex = { max: 0, player: null };
      let changedIndexes = 0; let largeNonZero = 0;
      for (const [kind, key] of KINDS) {
        const baseById = new Map(baseRef.rated[key].map((p) => [id(p), p]));
        for (const p of ref.rated[key]) {
          const b = baseById.get(id(p));
          if (!b) throw new Error('eligible sets differ');
          const indexChange = round(p.score - b.score, 1);
          const rankChange = p.rank - b.rank;
          if (indexChange !== 0) changedIndexes += 1;
          const label = `${p.player} (${kind})`;
          if (results[setting].thinPlayers[kind].has(id(p))) {
            if (Math.abs(indexChange) > thinIndex.max) thinIndex = { max: Math.abs(indexChange), player: label };
          } else {
            if (indexChange !== 0) largeNonZero += 1;
            if (Math.abs(indexChange) > largeIndex.max) largeIndex = { max: Math.abs(indexChange), player: label };
            if (Math.abs(rankChange) > largeRank.max) largeRank = { max: Math.abs(rankChange), player: label };
          }
        }
      }
      if ((method === 'format-fallback' || method === 'adjacent-fallback') && largeNonZero !== 0) throw new Error(`${method} changed ${largeNonZero} large-pool indexes (must be 0)`);
      const namesChanged = {};
      for (const key of ['batters', 'bowlers', 'allrounders']) {
        const baseTop = new Set(baseRef.rated[key].slice(0, TOP).map(id));
        namesChanged[key] = ref.rated[key].slice(0, TOP).filter((p) => !baseTop.has(id(p))).length;
      }
      sideEffects[setting][method] = { ...entry, largePoolMaxIndexChange: largeIndex, largePoolMaxRankChange: largeRank, thinPoolMaxIndexChange: thinIndex, indexesChangedBatterAndBowler: changedIndexes, largePoolIndexesChanged: largeNonZero, top10NamesChanged: namesChanged };
    }
  }

  // ---------- rules 1-7 and the decision ----------
  const T = P.thresholds;
  const m = (setting, method, key) => results[setting].methods[method].cell[key];
  const evaluation = {};
  for (const { method, code } of METHODS.slice(1)) {
    const failed = [];
    const reductions = [];
    for (const [setting, key] of CELLS) {
      const b = m(setting, 'own-pool', key);
      const c = m(setting, method, key);
      reductions.push(1 - (c.M1 / b.M1));
      if (!(c.M1 <= T.m1Ratio * b.M1)) failed.push(`1: M1 ${setting} ${key} ${round(c.M1)} vs ${round(b.M1)} (ratio ${round(c.M1 / b.M1)})`);
      if (c.M2a < b.M2a - T.m2Harm) failed.push(`3: M2a ${setting} ${key}`);
      if (c.M2b < b.M2b - T.m2Harm) failed.push(`3: M2b ${setting} ${key}`);
      if (c.M3a > b.M3a + T.m3Harm) failed.push(`3: M3a ${setting} ${key}`);
      if (c.M3b > b.M3b + T.m3Harm) failed.push(`3: M3b ${setting} ${key}`);
      if (c.M4 > b.M4 + T.m4Harm) failed.push(`3: M4 ${setting} ${key}`);
      if (c.M5all.r !== null && b.M5all.r !== null && c.M5all.r < b.M5all.r - T.m5Harm) failed.push(`3: M5-all ${setting} ${key}`);
    }
    {
      const b = m('S2', 'own-pool', 'batters');
      const c = m('S2', method, 'batters');
      const rise = mean([c.M2a, c.M2b]) - mean([b.M2a, b.M2b]);
      const fall = 1 - (mean([c.M3a, c.M3b]) / mean([b.M3a, b.M3b]));
      if (!(rise >= T.m2Rise || fall >= T.m3Fall)) failed.push(`2: S2 batters M2 rise ${round(rise)}, M3 relative fall ${round(fall)}`);
    }
    for (const setting of ['S1', 'S2']) {
      const s = sideEffects[setting][method];
      if (!s.eligibleIdentical) failed.push(`4: eligible counts differ in ${setting}`);
      if (s.largePoolMaxIndexChange.max > T.largePoolIndex) failed.push(`5: large-pool index change ${s.largePoolMaxIndexChange.max} (${s.largePoolMaxIndexChange.player}) ${setting}`);
      if (s.largePoolMaxRankChange.max > T.largePoolRank) failed.push(`5: large-pool rank change ${s.largePoolMaxRankChange.max} (${s.largePoolMaxRankChange.player}) ${setting}`);
      if (s.thinPoolMaxIndexChange.max > T.thinPoolIndex) failed.push(`6: thin-pool index change ${s.thinPoolMaxIndexChange.max} (${s.thinPoolMaxIndexChange.player}) ${setting}`);
    }
    for (const key of ['batters', 'bowlers', 'allrounders']) {
      const changed = sideEffects.S1[method].top10NamesChanged[key];
      if (changed > T.s1NamesChanged) failed.push(`7: S1 ${key} top-10 names changed ${changed}`);
    }
    evaluation[method] = { code, passes: failed.length === 0, failedRules: failed, meanRelativeM1Reduction: round(mean(reductions), 4), m1RelativeReductionByCell: Object.fromEntries(CELLS.map(([s, k], i) => [`${s}.${k}`, round(reductions[i], 4)])), s1IndexesChanged: sideEffects.S1[method].indexesChangedBatterAndBowler };
  }
  const passers = METHODS.slice(1).filter(({ method }) => evaluation[method].passes);
  const simplicity = ['format-fallback', 'adjacent-fallback', 'shrunk'];
  let decision = 'KEEP_CURRENT';
  let reasoning = 'No candidate meets every pre-registered rule; scoring.mjs keeps own-pool as the default.';
  if (passers.length) {
    const best = Math.max(...passers.map(({ method }) => evaluation[method].meanRelativeM1Reduction));
    const near = passers.filter(({ method }) => best - evaluation[method].meanRelativeM1Reduction <= T.tieMargin);
    near.sort((a, b) => (evaluation[a.method].s1IndexesChanged - evaluation[b.method].s1IndexesChanged) || (simplicity.indexOf(a.method) - simplicity.indexOf(b.method)));
    const chosen = passers.length === 1 ? passers[0] : (near.length === 1 ? near[0] : near[0]);
    decision = `ADOPT:${chosen.code}`;
    reasoning = `${passers.length === 1 ? 'Only passer' : `Passers: ${passers.map((p) => p.code).join(', ')}; ${near.length > 1 ? 'within 2 percentage points on M1, fewer S1 indexes changed then simpler' : 'largest mean relative M1 reduction'}`}: ${chosen.code} (${chosen.method}).`;
  }

  // ---------- output ----------
  const listRows = (setting, method, key) => {
    const rated = results[setting].full[method].rated[key].slice(0, TOP);
    return rated.map((p) => (key === 'allrounders'
      ? { rank: p.rank, player: p.player, playerId: p.playerId, index: p.score, battingIndex: p.batting.index, bowlingIndex: p.bowling.index }
      : { rank: p.rank, player: p.player, playerId: p.playerId, index: p.score, pressureBalls: p.pressureBalls, pressureMatches: p.pressureMatches }));
  };
  const movementVsBase = (setting, method, key) => {
    const base = results[setting].full['own-pool'].rated[key];
    const cand = results[setting].full[method].rated[key];
    const baseById = new Map(base.map((p) => [id(p), p]));
    const candById = new Map(cand.map((p) => [id(p), p]));
    const baseTop = new Set(base.slice(0, TOP).map(id));
    const candTop = new Set(cand.slice(0, TOP).map(id));
    const row = (p, other) => ({ player: p.player, playerId: p.playerId, rank: p.rank, index: p.score, rankInOtherList: other.get(id(p))?.rank ?? null, indexInOtherList: other.get(id(p))?.score ?? null });
    return {
      entered: cand.slice(0, TOP).filter((p) => !baseTop.has(id(p))).map((p) => row(p, baseById)),
      left: base.slice(0, TOP).filter((p) => !candTop.has(id(p))).map((p) => row(p, candById)),
      ranksOfBaseTop10: base.slice(0, TOP).map((p) => ({ player: p.player, baseRank: p.rank, baseIndex: p.score, rank: candById.get(id(p))?.rank ?? null, index: candById.get(id(p))?.score ?? null })),
    };
  };
  const out = {
    about: 'Pool-method comparison for the thin T20I pools, produced by `node sensitivity.mjs --pool-methods`. Primary = own-pool (the method used for the submitted lists). Alternatives = format-fallback (C1), shrunk (C2), adjacent-fallback (C3). The criterion in `preregistered` was fixed before any candidate was run (pool_preregistration.md). No timestamps.',
    preregistered: P,
    reproduction: results.reproduction,
    poolSizes: Object.fromEntries(['S1', 'S2'].map((setting) => [setting, Object.fromEntries(KINDS.map(([kind, key]) => [key, results[setting].full['own-pool'].pools[kind].map((pool) => ({ pool: pool.key, eligiblePlayers: pool.players.length, thin: pool.players.length <= P.thinPoolMax }))]))])),
    methods: METHODS.map(({ method, code, role, label }) => ({
      method, code, role, label,
      metrics: Object.fromEntries(['S1', 'S2'].map((setting) => [setting, Object.fromEntries(KINDS.map(([, key]) => {
        const c = results[setting].methods[method].cell[key];
        return [key, {
          M1_poolThinningError: round(c.M1, 4), M1detail: c.M1detail,
          M2a_top10RetentionPoolDeletion: round(c.M2a, 4), M2b_top10RetentionBootstrap: round(c.M2b, 4),
          M3a_rankDisplacementPoolDeletion: round(c.M3a, 3), M3b_rankDisplacementBootstrap: round(c.M3b, 3),
          M4_leaveOneOutExitRate: round(c.M4, 4), M4detail: c.M4detail,
          M5_allPairs: c.M5all, M5_thinPairs: c.M5thin,
          bootstrapSharesTop10: c.bootstrapShares, poolDeletionSharesTop10: c.poolDeletionShares,
        }];
      }))])),
      sideEffectsVersusBase: method === 'own-pool' ? null : sideEffects,
      evaluation: method === 'own-pool' ? null : evaluation[method],
      top10: Object.fromEntries(['S1', 'S2'].map((setting) => [setting, Object.fromEntries(['batters', 'bowlers', 'allrounders'].map((key) => [key, listRows(setting, method, key)]))])),
      top10VersusBase: method === 'own-pool' ? null : Object.fromEntries(['S1', 'S2'].map((setting) => [setting, Object.fromEntries(['batters', 'bowlers', 'allrounders'].map((key) => [key, movementVsBase(setting, method, key)]))])),
    })),
    decision: { result: decision, reasoning, passers: passers.map((p) => p.code), evaluation },
  };
  // keep the full side-effect block once, not once per method
  for (const entry of out.methods) if (entry.sideEffectsVersusBase) entry.sideEffectsVersusBase = Object.fromEntries(['S1', 'S2'].map((setting) => [setting, sideEffects[setting][entry.method]]));
  return out;
}
