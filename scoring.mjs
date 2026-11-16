const MIN_PRESSURE_BALLS = 60;
const MIN_PRESSURE_MATCHES = 8;
const MIN_USUAL_BALLS = 60;
// false: the submitted lists, which use only the supplied data with no availability or nationality filter.
// true: the alternative lists, without the 53 Pakistan T20I players, five IPL retirees and Mohit Sharma (see "Switch the exclusions on" in methodology_report.md and README.md).
const APPLY_PLAYER_EXCLUSIONS = false;
const IPL_RETIRED_PLAYERS = [
  { playerId: '494', player: 'Kieron Pollard' },
  { playerId: '161', player: 'Dwayne Bravo' },
  { playerId: '535', player: 'Ambati Rayudu' },
  { playerId: '143', player: 'Dinesh Karthik' },
  { playerId: '305', player: 'Ravichandran Ashwin' },
];
const IPL_RETIRED_PLAYER_IDS = new Set(IPL_RETIRED_PLAYERS.map((player) => player.playerId));
const IPL_2027_NONPLAYER_IDS = new Set(['2878']);

function emptyTotals() {
  return { balls: 0, runs: 0, outs: 0, conceded: 0, wickets: 0 };
}

function accumulate(totals, side) {
  for (const key of Object.keys(totals)) totals[key] += Number(side[key] ?? 0);
}

function zScores(players, value) {
  const values = players.map(value).filter(Number.isFinite);
  const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + ((item - mean) ** 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  return (item) => standardDeviation === 0 ? 0 : (value(item) - mean) / standardDeviation;
}

// Pool standardisation. Each player is z-scored in a stratum (one format and season). The pool methods differ only in
// which mean and SD that z-score uses. Evidence and the pre-registered comparison: pool_preregistration.md, pool_methods_data.json,
// "Small T20I pools" in methodology_report.md. Run `node sensitivity.mjs --pool-methods` to repeat the comparison.
//   own-pool          the stratum's own mean and SD (the method used for the lists; documented alternative if another method is the default)
//   format-fallback   a stratum with THIN_POOL_MAX or fewer eligible profiles uses all seasons of the same format and kind
//   shrunk            every stratum: mean and variance mixed with the all-seasons values, POOL_PSEUDO_COUNT pseudo-profiles
//   adjacent-fallback a thin stratum uses the seasons before, same and after; if that is still thin, all seasons of the format
const POOL_METHOD = 'own-pool';
const POOL_METHODS = ['own-pool', 'format-fallback', 'shrunk', 'adjacent-fallback'];
const THIN_POOL_MAX = 10;
const POOL_PSEUDO_COUNT = 5;

function momentsOf(players, metrics) {
  return metrics.map((value) => {
    const values = players.map(value).filter(Number.isFinite);
    const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
    const variance = values.reduce((sum, item) => sum + ((item - mean) ** 2), 0) / values.length;
    return { mean, variance };
  });
}

function zFromMoments(metrics, moments) {
  return metrics.map((value, index) => {
    const { mean, variance } = moments[index];
    const standardDeviation = Math.sqrt(variance);
    return (item) => standardDeviation === 0 ? 0 : (value(item) - mean) / standardDeviation;
  });
}

// Returns the four z-score functions (level, change, outcome, consistency) for one stratum.
function standardiseStratum(poolMethod, measured, measuredStrata, metrics) {
  if (poolMethod === 'own-pool') return metrics.map((value) => zScores(measured, value));
  const thin = measured.length <= THIN_POOL_MAX;
  const own = momentsOf(measured, metrics);
  const sameFormat = [...measuredStrata.values()].flat().filter((player) => player.format === measured[0].format);
  if (poolMethod === 'format-fallback') {
    return thin ? zFromMoments(metrics, momentsOf(sameFormat, metrics)) : metrics.map((value) => zScores(measured, value));
  }
  if (poolMethod === 'shrunk') {
    const all = momentsOf(sameFormat, metrics);
    const n = measured.length;
    return zFromMoments(metrics, own.map((moment, index) => ({
      mean: ((n * moment.mean) + (POOL_PSEUDO_COUNT * all[index].mean)) / (n + POOL_PSEUDO_COUNT),
      variance: ((n * moment.variance) + (POOL_PSEUDO_COUNT * all[index].variance)) / (n + POOL_PSEUDO_COUNT),
    })));
  }
  // adjacent-fallback
  if (!thin) return metrics.map((value) => zScores(measured, value));
  const season = Number(measured[0].season);
  const adjacent = sameFormat.filter((player) => Math.abs(Number(player.season) - season) <= 1);
  return zFromMoments(metrics, momentsOf(adjacent.length > THIN_POOL_MAX ? adjacent : sameFormat, metrics));
}

function rounded(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function makeProfile(record) {
  return {
    playerId: record.playerId,
    player: record.playerName,
    kind: record.kind,
    teams: new Set(),
    pressure: emptyTotals(),
    usual: emptyTotals(),
    pressureMatches: 0,
    matchRows: [],
  };
}

export function ratePlayers(records, { format = 'All', season = 'All', minBalls = MIN_PRESSURE_BALLS, minMatches = MIN_PRESSURE_MATCHES, poolMethod = POOL_METHOD } = {}) {
  if (!POOL_METHODS.includes(poolMethod)) throw new Error(`Unknown poolMethod "${poolMethod}"; use one of ${POOL_METHODS.join(', ')}`);
  const grouped = new Map();
  const pakistanPlayers = new Set(records
    .filter((record) => record.format === 'T20I' && record.team === 'Pakistan')
    .map((record) => String(record.playerId)));
  const isExcluded = (record) => APPLY_PLAYER_EXCLUSIONS && (
    pakistanPlayers.has(String(record.playerId))
    || IPL_RETIRED_PLAYER_IDS.has(String(record.playerId))
    || IPL_2027_NONPLAYER_IDS.has(String(record.playerId))
  );
  const selected = records.filter((record) => (
    !isExcluded(record)
    && (format === 'All' || record.format === format)
    && (season === 'All' || String(record.season) === String(season))
  ));

  for (const record of selected) {
    const key = `${record.kind}:${record.playerId}:${record.format}:${record.season}`;
    if (!grouped.has(key)) {
      const profile = makeProfile(record);
      profile.format = record.format;
      profile.season = record.season;
      grouped.set(key, profile);
    }
    const player = grouped.get(key);
    player.teams.add(record.team);
    accumulate(player.pressure, record.pressure);
    accumulate(player.usual, record.usual);
    if (record.pressure.balls > 0) {
      player.pressureMatches += 1;
      player.matchRows.push(record);
    }
  }

  const allPlayers = [...grouped.values()];
  const categories = ['batter', 'bowler'];
  const rankings = Object.fromEntries(categories.map((kind) => {
    const eligible = allPlayers.filter((player) => (
      player.kind === kind
      && player.pressure.balls >= Number(minBalls)
      && player.pressureMatches >= Number(minMatches)
      && player.usual.balls >= MIN_USUAL_BALLS
    ));

    const strata = new Map();
    for (const player of eligible) {
      const benchmark = `${player.format}:${player.season}`;
      if (!strata.has(benchmark)) strata.set(benchmark, []);
      strata.get(benchmark).push(player);
    }

    const rollups = new Map();
    const levelMetric = kind === 'batter' ? (player) => player.pressureRate * 100 : (player) => -player.pressureEconomy;
    const changeMetric = kind === 'batter'
      ? (player) => (player.pressureRate - player.usualRate) * 100
      : (player) => player.usualEconomy - player.pressureEconomy;
    const outcomeMetric = kind === 'batter'
      ? (player) => (player.usualDismissal - player.pressureDismissal) * 100
      : (player) => player.pressureWicketRate;
    const consistencyMetric = (player) => player.consistency * 100;
    const measuredStrata = new Map([...strata].map(([stratumKey, pool]) => [stratumKey, pool.map((player) => {
      const pressureRate = player.pressure.balls ? player.pressure.runs / player.pressure.balls : 0;
      const usualRate = player.usual.balls ? player.usual.runs / player.usual.balls : 0;
      const pressureDismissal = player.pressure.balls ? player.pressure.outs / player.pressure.balls : 0;
      const usualDismissal = player.usual.balls ? player.usual.outs / player.usual.balls : 0;
      const pressureEconomy = player.pressure.balls ? (player.pressure.conceded * 6) / player.pressure.balls : 0;
      const usualEconomy = player.usual.balls ? (player.usual.conceded * 6) / player.usual.balls : 0;
      const pressureWicketRate = player.pressure.balls ? (player.pressure.wickets * 100) / player.pressure.balls : 0;
      let positiveMatches = 0;

      for (const match of player.matchRows) {
        const pressure = match.pressure;
        const usual = match.usual;
        if (kind === 'batter') {
          const matchDelta = (pressure.runs / pressure.balls) - usualRate
            - 2 * ((pressure.outs / pressure.balls) - usualDismissal);
          if (matchDelta > 0) positiveMatches += 1;
        } else {
          const matchEconomy = pressure.balls ? (pressure.conceded * 6) / pressure.balls : 0;
          const matchWicketRate = pressure.balls ? (pressure.wickets * 100) / pressure.balls : 0;
          const usualWicketRate = player.usual.balls ? (player.usual.wickets * 100) / player.usual.balls : 0;
          if ((usualEconomy - matchEconomy) + (1.5 * (matchWicketRate - usualWicketRate)) > 0) positiveMatches += 1;
        }
      }

      return {
        ...player,
        teams: [...player.teams].filter(Boolean),
        pressureRate,
        usualRate,
        pressureDismissal,
        usualDismissal,
        pressureEconomy,
        usualEconomy,
        pressureWicketRate,
        consistency: player.pressureMatches ? positiveMatches / player.pressureMatches : 0,
      };
    })]));

    for (const measured of measuredStrata.values()) {
      const [zLevel, zChange, zOutcome, zConsistency] = standardiseStratum(
        poolMethod,
        measured,
        measuredStrata,
        [levelMetric, changeMetric, outcomeMetric, consistencyMetric],
      );

      for (const player of measured) {
        const rawScore = (0.35 * zLevel(player))
          + (0.30 * zChange(player))
          + (0.20 * zOutcome(player))
          + (0.15 * zConsistency(player));
        const key = `${kind}:${player.playerId}`;
        if (!rollups.has(key)) {
          rollups.set(key, {
            playerId: player.playerId,
            player: player.player,
            teams: new Set(),
            pressure: emptyTotals(),
            usual: emptyTotals(),
            pressureMatches: 0,
            weightedRawScore: 0,
            scoreWeight: 0,
            consistencyMatches: 0,
            positiveMatches: 0,
          });
        }
        const rollup = rollups.get(key);
        for (const team of player.teams) rollup.teams.add(team);
        accumulate(rollup.pressure, player.pressure);
        accumulate(rollup.usual, player.usual);
        rollup.pressureMatches += player.pressureMatches;
        rollup.weightedRawScore += rawScore * player.pressure.balls;
        rollup.scoreWeight += player.pressure.balls;
        rollup.consistencyMatches += player.pressureMatches;
        rollup.positiveMatches += Math.round(player.consistency * player.pressureMatches);
      }
    }

    const ranked = [...rollups.values()].map((player) => {
      const pressureRate = player.pressure.balls ? player.pressure.runs / player.pressure.balls : 0;
      const usualRate = player.usual.balls ? player.usual.runs / player.usual.balls : 0;
      const pressureDismissal = player.pressure.balls ? player.pressure.outs / player.pressure.balls : 0;
      const pressureEconomy = player.pressure.balls ? (player.pressure.conceded * 6) / player.pressure.balls : 0;
      const usualEconomy = player.usual.balls ? (player.usual.conceded * 6) / player.usual.balls : 0;
      const reliability = Math.sqrt(
        (player.pressure.balls / (player.pressure.balls + 60))
        * (player.pressureMatches / (player.pressureMatches + 6)),
      );
      const rating = Math.max(0, Math.min(100, 50 + (10 * (player.weightedRawScore / player.scoreWeight) * reliability)));
      return {
        rank: 0,
        playerId: player.playerId,
        player: player.player,
        teams: [...player.teams].filter(Boolean),
        score: rounded(rating, 1),
        pressureBalls: player.pressure.balls,
        pressureMatches: player.pressureMatches,
        pressureRate: rounded(pressureRate * 100, 1),
        usualRate: rounded(usualRate * 100, 1),
        pressureEconomy: rounded(pressureEconomy, 2),
        usualEconomy: rounded(usualEconomy, 2),
        pressureWickets: player.pressure.wickets,
        pressureDismissalRate: rounded(pressureDismissal * 100, 1),
        consistency: rounded(player.consistencyMatches ? (player.positiveMatches * 100) / player.consistencyMatches : 0, 0),
        reliability: rounded(reliability * 100, 0),
      };
    }).sort((left, right) => right.score - left.score || right.pressureBalls - left.pressureBalls || left.player.localeCompare(right.player));

    ranked.forEach((player, index) => { player.rank = index + 1; });
    return [kind === 'batter' ? 'batters' : 'bowlers', ranked];
  }));

  const bowlersById = new Map(rankings.bowlers.map((player) => [String(player.playerId), player]));
  const allrounders = rankings.batters.flatMap((batter) => {
    const bowler = bowlersById.get(String(batter.playerId));
    if (!bowler) return [];

    return [{
      rank: 0,
      playerId: batter.playerId,
      player: batter.player,
      teams: [...new Set([...batter.teams, ...bowler.teams])],
      score: rounded((batter.score + bowler.score) / 2),
      batting: {
        index: batter.score,
        pressureRate: batter.pressureRate,
        usualRate: batter.usualRate,
        pressureBalls: batter.pressureBalls,
        pressureMatches: batter.pressureMatches,
        consistency: batter.consistency,
        reliability: batter.reliability,
      },
      bowling: {
        index: bowler.score,
        pressureEconomy: bowler.pressureEconomy,
        usualEconomy: bowler.usualEconomy,
        pressureBalls: bowler.pressureBalls,
        pressureMatches: bowler.pressureMatches,
        consistency: bowler.consistency,
        reliability: bowler.reliability,
      },
    }];
  }).sort((left, right) => right.score - left.score
    || Math.min(right.batting.index, right.bowling.index) - Math.min(left.batting.index, left.bowling.index)
    || left.player.localeCompare(right.player));

  allrounders.forEach((player, index) => { player.rank = index + 1; });
  return { ...rankings, allrounders };
}
