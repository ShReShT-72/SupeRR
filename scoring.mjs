const MIN_PRESSURE_BALLS = 60;
const MIN_PRESSURE_MATCHES = 8;
const MIN_USUAL_BALLS = 60;

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

export function ratePlayers(records, { format = 'All', season = 'All', minBalls = MIN_PRESSURE_BALLS, minMatches = MIN_PRESSURE_MATCHES } = {}) {
  const grouped = new Map();
  const pakistanPlayers = new Set(records
    .filter((record) => record.format === 'T20I' && record.team === 'Pakistan')
    .map((record) => String(record.playerId)));
  const selected = records.filter((record) => (
    !pakistanPlayers.has(String(record.playerId))
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
    for (const pool of strata.values()) {
      const measured = pool.map((player) => {
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
      });

      const levelMetric = kind === 'batter' ? (player) => player.pressureRate * 100 : (player) => -player.pressureEconomy;
      const changeMetric = kind === 'batter'
        ? (player) => (player.pressureRate - player.usualRate) * 100
        : (player) => player.usualEconomy - player.pressureEconomy;
      const outcomeMetric = kind === 'batter'
        ? (player) => (player.usualDismissal - player.pressureDismissal) * 100
        : (player) => player.pressureWicketRate;
      const zLevel = zScores(measured, levelMetric);
      const zChange = zScores(measured, changeMetric);
      const zOutcome = zScores(measured, outcomeMetric);
      const zConsistency = zScores(measured, (player) => player.consistency * 100);

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

export const ratingRules = {
  minPressureBalls: MIN_PRESSURE_BALLS,
  minPressureMatches: MIN_PRESSURE_MATCHES,
  minUsualBalls: MIN_USUAL_BALLS,
  battingWeights: '35% pressure strike rate, 30% strike-rate change vs own usual rate, 20% dismissal-rate improvement, 15% positive-match share.',
  bowlingWeights: '35% pressure economy, 30% economy change vs own usual economy, 20% pressure wickets per 100 legal balls, 15% positive-match share.',
  shrinkage: 'Weighted z-score is shrunk toward the pool mean using pressure-ball and pressure-match sample reliability.',
};