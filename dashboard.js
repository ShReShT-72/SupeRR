import { ratePlayers } from './scoring.mjs';

const elements = {
  format: document.querySelector('#formatFilter'),
  season: document.querySelector('#seasonFilter'),
  sample: document.querySelector('#sampleFilter'),
  search: document.querySelector('#searchInput'),
  rows: document.querySelector('#rankingRows'),
  empty: document.querySelector('#emptyState'),
  count: document.querySelector('#eligibleCount'),
  metricLabel: document.querySelector('#rankMetricLabel'),
  metricSort: document.querySelector('.metric-sort'),
  rankingMethodLabel: document.querySelector('#rankingMethodLabel'),
  showAll: document.querySelector('#showAllButton'),
  tabs: [...document.querySelectorAll('.list-tab')],
  sortButtons: [...document.querySelectorAll('.sort-button')],
  compare: document.querySelector('#compareSelect'),
  profileName: document.querySelector('#profileName'),
  profileTeam: document.querySelector('#profileTeam'),
  profileRank: document.querySelector('#profileRank'),
  profileScore: document.querySelector('#profileScore'),
  scoreLabel: document.querySelector('#scoreLabel'),
  profileReliability: document.querySelector('#profileReliability'),
  profilePanel: document.querySelector('.profile-panel'),
  profileChart: document.querySelector('#profileChart'),
  profileChartLabel: document.querySelector('#profileChartLabel'),
  metricUnit: document.querySelector('#profileMetricUnit'),
  pressureLabel: document.querySelector('#metricPressureLabel'),
  usualLabel: document.querySelector('#metricUsualLabel'),
  pressureMetric: document.querySelector('#metricPressure'),
  usualMetric: document.querySelector('#metricUsual'),
  matchesLabel: document.querySelector('#metricMatchesLabel'),
  matches: document.querySelector('#metricMatches'),
  ballsLabel: document.querySelector('#metricBallsLabel'),
  balls: document.querySelector('#metricBalls'),
  outcomeLabel: document.querySelector('#metricOutcomeLabel'),
  outcome: document.querySelector('#metricOutcome'),
  consistencyLabel: document.querySelector('#metricConsistencyLabel'),
  consistency: document.querySelector('#metricConsistency'),
  compareNote: document.querySelector('#compareNote'),
  status: document.querySelector('#statusMessage'),
};

const state = {
  data: null,
  kind: 'batters',
  view: 'overview',
  selectedId: null,
  compareId: '',
  showAll: false,
  sort: 'score',
  direction: -1,
  rankings: { batters: [], bowlers: [], allrounders: [] },
};

function number(value) {
  return Number(value) || 0;
}

function formatInt(value) {
  return Math.round(number(value)).toLocaleString('en-US');
}

function ratingOptions() {
  const [minBalls, minMatches] = elements.sample.value.split(':').map(Number);
  return {
    format: elements.format.value,
    season: elements.season.value,
    minBalls,
    minMatches,
  };
}

function displayMetric(player, kind = state.kind) {
  if (kind === 'allrounders') return Math.min(player.batting.index, player.bowling.index);
  return kind === 'batters' ? player.pressureRate : player.pressureEconomy;
}

function metricText(player, kind = state.kind) {
  if (kind === 'allrounders') return `Batting ${player.batting.index.toFixed(1)}; bowling ${player.bowling.index.toFixed(1)}`;
  return kind === 'batters' ? `${player.pressureRate.toFixed(1)}` : `${player.pressureEconomy.toFixed(2)}`;
}

function announce(message) {
  elements.status.textContent = message;
  elements.status.classList.add('is-visible');
  window.clearTimeout(announce.timeout);
  announce.timeout = window.setTimeout(() => elements.status.classList.remove('is-visible'), 2600);
}

function selectProfile(playerId) {
  state.selectedId = playerId;
  const player = state.rankings[state.kind].find((item) => String(item.playerId) === String(playerId));
  if (player && state.compareId === String(player.playerId)) state.compareId = '';
  render();
}

function renderRows(list) {
  const search = elements.search.value.trim().toLocaleLowerCase();
  const filtered = list.filter((player) => (
    !search || player.player.toLocaleLowerCase().includes(search)
    || player.teams.join(' ').toLocaleLowerCase().includes(search)
  ));
  let sorted = [...filtered];

  if (state.sort === 'metric') {
    sorted.sort((left, right) => {
      const difference = displayMetric(left) - displayMetric(right);
      const preferredDirection = state.kind === 'bowlers' ? -1 : 1;
      return difference * preferredDirection * state.direction || left.rank - right.rank;
    });
  } else if (state.sort === 'balls') {
    sorted.sort((left, right) => (left.pressureBalls - right.pressureBalls) * state.direction || left.rank - right.rank);
  } else {
    sorted.sort((left, right) => (left.score - right.score) * state.direction || left.rank - right.rank);
  }

  const visible = state.showAll || search ? sorted : sorted.slice(0, 10);
  elements.rows.replaceChildren(...visible.map((player, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `ranking-row${String(player.playerId) === String(state.selectedId) ? ' is-selected' : ''}`;
    row.setAttribute('role', 'row');
    row.setAttribute('aria-pressed', String(String(player.playerId) === String(state.selectedId)));
    row.setAttribute('aria-label', `Rank ${player.rank}, ${player.player}, pressure index ${player.score}`);

    const rank = document.createElement('span');
    rank.className = `rank-number${player.rank <= 3 ? ' top-rank' : ''}`;
    rank.setAttribute('role', 'cell');
    rank.textContent = String(player.rank).padStart(2, '0');

    const name = document.createElement('span');
    name.className = 'rank-player';
    name.setAttribute('role', 'cell');
    name.append(document.createTextNode(player.player));
    const team = document.createElement('span');
    team.className = 'rank-team';
    team.textContent = player.teams.slice(0, 2).join(' · ') || 'Team not listed';
    name.append(team);

    const score = document.createElement('span');
    score.className = 'rank-score';
    score.setAttribute('role', 'cell');
    score.textContent = player.score.toFixed(1);

    const performance = document.createElement('span');
    performance.className = 'rank-performance';
    performance.setAttribute('role', 'cell');
    if (state.kind === 'allrounders') {
      performance.classList.add('rank-allrounder-pair');
      performance.setAttribute('aria-label', metricText(player));
      for (const [label, value] of [['BAT', player.batting.index], ['BOWL', player.bowling.index]]) {
        const component = document.createElement('span');
        component.className = 'rank-allrounder-part';
        const componentLabel = document.createElement('small');
        componentLabel.textContent = label;
        const componentScore = document.createElement('strong');
        componentScore.textContent = value.toFixed(1);
        component.append(componentLabel, componentScore);
        performance.append(component);
      }
    } else {
      performance.textContent = metricText(player);
    }

    row.append(rank, name, score, performance);
    row.style.animationDelay = `${Math.min(index, 9) * 22}ms`;
    row.addEventListener('click', () => selectProfile(player.playerId));
    return row;
  }));
  elements.empty.textContent = state.kind === 'allrounders'
    ? 'No players qualify in both disciplines with this sample threshold.'
    : 'No players meet this sample threshold. Try a wider season or a smaller minimum sample.';
  elements.empty.hidden = visible.length > 0;
  elements.count.textContent = `${list.length} eligible`;
  elements.showAll.setAttribute('aria-pressed', String(state.showAll));
  elements.showAll.innerHTML = state.showAll ? 'Top 10 only <span aria-hidden="true">−</span>' : 'Show all eligible <span aria-hidden="true">+</span>';
}

function createChartRow(label, value, max, type) {
  const row = document.createElement('div');
  row.className = `chart-line ${type}`;
  const name = document.createElement('span');
  name.textContent = label;
  const track = document.createElement('div');
  track.className = 'bar-track';
  const bar = document.createElement('i');
  bar.style.width = `${Math.max(3, Math.min(100, (value / max) * 100))}%`;
  track.append(bar);
  const figure = document.createElement('strong');
  figure.textContent = state.kind === 'bowlers' ? value.toFixed(2) : value.toFixed(1);
  row.append(name, track, figure);
  return row;
}

function renderProfile(list) {
  const isAllrounder = state.kind === 'allrounders';
  elements.profilePanel.classList.toggle('is-allrounder', isAllrounder);
  elements.scoreLabel.textContent = isAllrounder ? 'ALL-ROUNDER\nINDEX' : 'PRESSURE\nINDEX';
  elements.profileChart.setAttribute('aria-label', isAllrounder ? 'Batting and bowling index comparison' : 'Pressure and usual performance comparison');
  let player = list.find((item) => String(item.playerId) === String(state.selectedId));
  if (!player) {
    player = list[0] ?? null;
    state.selectedId = player ? String(player.playerId) : null;
  }

  const compared = list.find((item) => String(item.playerId) === String(state.compareId));
  const options = [new Option('Choose player', '')];
  for (const candidate of list) {
    if (player && String(candidate.playerId) === String(player.playerId)) continue;
    options.push(new Option(`${candidate.player} · ${candidate.score.toFixed(1)}`, String(candidate.playerId)));
  }
  elements.compare.replaceChildren(...options);
  elements.compare.value = compared ? String(compared.playerId) : '';

  if (!player) {
    const isBatter = state.kind === 'batters';
    elements.profileName.textContent = 'No eligible players';
    elements.profileTeam.textContent = 'Adjust the filters to see a ranking.';
    elements.profileRank.textContent = '—';
    elements.profileScore.textContent = '—';
    elements.profileReliability.textContent = 'NO SAMPLE';
    elements.profileChartLabel.textContent = isAllrounder ? 'BATTING / BOWLING INDEX' : 'PRESSURE VS USUAL';
    elements.metricUnit.textContent = isAllrounder ? '0–100' : isBatter ? 'SR' : 'ECON / 6';
    elements.pressureLabel.textContent = isAllrounder ? 'BATTING INDEX' : isBatter ? 'PRESSURE SR' : 'PRESSURE ECONOMY';
    elements.usualLabel.textContent = isAllrounder ? 'BOWLING INDEX' : isBatter ? 'USUAL SR' : 'USUAL ECONOMY';
    elements.matchesLabel.textContent = isAllrounder ? 'PRESSURE MATCHES · BAT / BOWL' : 'PRESSURE MATCHES';
    elements.ballsLabel.textContent = isAllrounder ? 'PRESSURE BALLS · BAT / BOWL' : 'PRESSURE BALLS';
    elements.outcomeLabel.textContent = isAllrounder ? 'PRESSURE SR / ECON / 6' : isBatter ? 'PRESSURE OUTS / 100' : 'PRESSURE WICKETS';
    elements.consistencyLabel.textContent = isAllrounder ? 'Positive-match share · bat / bowl' : 'Positive pressure matches';
    elements.profileChart.replaceChildren();
    elements.pressureMetric.textContent = '—';
    elements.usualMetric.textContent = '—';
    elements.matches.textContent = '—';
    elements.balls.textContent = '—';
    elements.outcome.textContent = '—';
    elements.consistency.textContent = '—';
    elements.compareNote.textContent = 'No player meets the current sample threshold.';
    return;
  }

  elements.profileName.textContent = player.player;
  elements.profileTeam.textContent = player.teams.join(' · ') || 'Team not listed';
  elements.profileRank.textContent = `RANK ${String(player.rank).padStart(2, '0')}`;
  elements.profileScore.textContent = player.score.toFixed(1);
  if (isAllrounder) {
    const { batting, bowling } = player;
    elements.profileReliability.textContent = `BAT ${batting.reliability}% · BOWL ${bowling.reliability}%`;
    elements.profileChartLabel.textContent = 'BATTING / BOWLING INDEX';
    elements.metricUnit.textContent = '0–100';
    elements.pressureLabel.textContent = 'BATTING INDEX';
    elements.usualLabel.textContent = 'BOWLING INDEX';
    elements.pressureMetric.textContent = batting.index.toFixed(1);
    elements.usualMetric.textContent = bowling.index.toFixed(1);
    elements.matchesLabel.textContent = 'PRESSURE MATCHES · BAT / BOWL';
    elements.matches.textContent = `${batting.pressureMatches} / ${bowling.pressureMatches}`;
    elements.ballsLabel.textContent = 'PRESSURE BALLS · BAT / BOWL';
    elements.balls.textContent = `${formatInt(batting.pressureBalls)} / ${formatInt(bowling.pressureBalls)}`;
    elements.outcomeLabel.textContent = 'PRESSURE SR / ECON / 6';
    elements.outcome.textContent = `${batting.pressureRate.toFixed(1)} / ${bowling.pressureEconomy.toFixed(2)}`;
    elements.consistencyLabel.textContent = 'Positive-match share · bat / bowl';
    elements.consistency.textContent = `${batting.consistency}% / ${bowling.consistency}%`;

    const chartRows = [
      createChartRow('BATTING', batting.index, 100, 'pressure'),
      createChartRow('BOWLING', bowling.index, 100, 'usual'),
    ];
    if (compared) {
      chartRows.push(createChartRow(`${compared.player.split(' ')[0]} BAT`, compared.batting.index, 100, 'pressure'));
      chartRows.push(createChartRow(`${compared.player.split(' ')[0]} BOWL`, compared.bowling.index, 100, 'usual'));
      elements.compareNote.textContent = `${compared.player}: composite ${compared.score.toFixed(1)} from batting ${compared.batting.index.toFixed(1)} and bowling ${compared.bowling.index.toFixed(1)}.`;
    } else {
      elements.compareNote.textContent = 'Composite index is the equal-weight mean of the batting and bowling indexes. Both components must meet the selected sample threshold.';
    }
    elements.profileChart.replaceChildren(...chartRows);
    return;
  }

  const isBatter = state.kind === 'batters';
  const metric = isBatter ? player.pressureRate : player.pressureEconomy;
  const usual = isBatter ? player.usualRate : player.usualEconomy;
  const values = compared ? [metric, usual, displayMetric(compared), isBatter ? compared.usualRate : compared.usualEconomy] : [metric, usual];
  const max = Math.max(...values, 1) * 1.08;
  elements.profileReliability.textContent = `${player.reliability}% RELIABLE`;
  elements.profileChartLabel.textContent = compared ? 'PRESSURE / USUAL COMPARISON' : 'PRESSURE VS USUAL';
  elements.metricUnit.textContent = isBatter ? 'SR' : 'ECON / 6';
  elements.pressureLabel.textContent = isBatter ? 'PRESSURE SR' : 'PRESSURE ECONOMY';
  elements.usualLabel.textContent = isBatter ? 'USUAL SR' : 'USUAL ECONOMY';
  elements.pressureMetric.textContent = isBatter ? player.pressureRate.toFixed(1) : player.pressureEconomy.toFixed(2);
  elements.usualMetric.textContent = isBatter ? player.usualRate.toFixed(1) : player.usualEconomy.toFixed(2);
  elements.matchesLabel.textContent = 'PRESSURE MATCHES';
  elements.matches.textContent = String(player.pressureMatches);
  elements.ballsLabel.textContent = 'PRESSURE BALLS';
  elements.balls.textContent = formatInt(player.pressureBalls);
  elements.outcomeLabel.textContent = isBatter ? 'PRESSURE OUTS / 100' : 'PRESSURE WICKETS';
  elements.outcome.textContent = isBatter ? player.pressureDismissalRate.toFixed(1) : String(player.pressureWickets);
  elements.consistencyLabel.textContent = 'Positive pressure matches';
  elements.consistency.textContent = `${player.consistency}%`;

  const chartRows = [
    createChartRow('PRESSURE', metric, max, 'pressure'),
    createChartRow('USUAL', usual, max, 'usual'),
  ];
  if (compared) {
    chartRows.push(createChartRow(`${compared.player.split(' ')[0]} P`, displayMetric(compared), max, 'pressure'));
    chartRows.push(createChartRow(`${compared.player.split(' ')[0]} U`, isBatter ? compared.usualRate : compared.usualEconomy, max, 'usual'));
    const difference = metric - displayMetric(compared);
    const better = isBatter ? difference >= 0 : difference <= 0;
    elements.compareNote.textContent = `${compared.player}: ${metricText(compared)} pressure ${isBatter ? 'SR' : 'economy'}. ${better ? 'Selected player leads' : 'Comparison player leads'} on this measure.`;
  } else {
    elements.compareNote.textContent = 'The score compares format-season performance and each player’s own usual level.';
  }
  elements.profileChart.replaceChildren(...chartRows);
}

function render() {
  const { batters, bowlers } = state.rankings;
  const list = state.rankings[state.kind];
  const isBatter = state.kind === 'batters';
  const isAllrounder = state.kind === 'allrounders';
  elements.metricLabel.textContent = isAllrounder ? 'EQUAL-WEIGHT COMPOSITE' : isBatter ? 'PRESSURE STRIKE RATE' : 'PRESSURE ECONOMY / 6';
  elements.metricSort.firstChild.textContent = isAllrounder ? 'WEAKER INDEX ' : 'PERFORMANCE ';
  elements.metricSort.setAttribute('aria-label', isAllrounder ? 'Sort by weaker component index' : 'Sort by pressure performance');
  elements.rows.closest('.ranking-table').classList.toggle('is-allrounder', isAllrounder);
  elements.rankingMethodLabel.textContent = isAllrounder ? 'COMPOSITE = 50% BATTING + 50% BOWLING' : 'INDEX IS NORMALIZED WITHIN FORMAT + SEASON';
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.kind === state.kind;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  renderRows(list);
  renderProfile(list);

  document.querySelectorAll('.nav-link').forEach((link) => {
    const active = link.dataset.view === state.view;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const analysisTitles = {
    batters: 'Who holds their nerve?',
    bowlers: 'Who owns the tight overs?',
    allrounders: 'Who contributes in both disciplines?',
  };
  document.querySelector('#analysis-title').textContent = analysisTitles[state.kind];
  if (!batters.length && !bowlers.length && !state.rankings.allrounders.length) elements.count.textContent = '0 eligible';
}

function updateRankings() {
  const [minBalls, minMatches] = elements.sample.value.split(':').map(Number);
  state.rankings = ratePlayers(state.data.records, {
    format: elements.format.value,
    season: elements.season.value,
    minBalls,
    minMatches,
  });
  state.selectedId = null;
  state.compareId = '';
  render();
}

function populateSeasons(records) {
  const seasons = [...new Set(records.map((record) => record.season))].sort((a, b) => b - a);
  for (const season of seasons) elements.season.add(new Option(String(season), String(season)));
}

function setupOverview(data) {
  const quality = data.dataQuality;
  const pressureTotal = quality.pressureDeliveries + quality.ordinaryDeliveries;
  document.querySelector('#matchCount').textContent = formatInt(quality.matches);
  document.querySelector('#deliveryCount').textContent = formatInt(pressureTotal);
  document.querySelector('#rawDeliveryCount').textContent = `${formatInt(quality.ballRows)} raw file rows`;
  document.querySelector('#pressureShare').textContent = `${((quality.pressureDeliveries / pressureTotal) * 100).toFixed(1)}%`;
  document.querySelector('#pressureCount').textContent = `${formatInt(quality.pressureDeliveries)} classified balls`;
  document.querySelector('#pressureSummary').textContent = `${formatInt(quality.pressureDeliveries)} of ${formatInt(pressureTotal)} deliveries met at least one pressure rule. Overlapping conditions are counted once.`;
  populateSeasons(data.records);
}

function exportCsv() {
  const allRanks = [
    ['Batters', state.rankings.batters],
    ['Bowlers', state.rankings.bowlers],
    ['All-rounders', state.rankings.allrounders],
  ];
  const rows = [['category', 'rank', 'player', 'team', 'pressure_index', 'batting_index', 'bowling_index', 'pressure_balls', 'pressure_matches', 'pressure_performance', 'usual_performance', 'positive_match_share', 'sample_reliability']];
  for (const [category, players] of allRanks) {
    for (const player of players.slice(0, 10)) {
      if (category === 'All-rounders') {
        rows.push([
          category, player.rank, player.player, player.teams.join(' / '), player.score,
          player.batting.index, player.bowling.index,
          `${player.batting.pressureBalls} batting / ${player.bowling.pressureBalls} bowling`,
          `${player.batting.pressureMatches} batting / ${player.bowling.pressureMatches} bowling`,
          `${player.batting.pressureRate} SR / ${player.bowling.pressureEconomy} economy/6`,
          `${player.batting.usualRate} usual SR / ${player.bowling.usualEconomy} usual economy/6`,
          `${player.batting.consistency}% / ${player.bowling.consistency}%`,
          `${player.batting.reliability}% / ${player.bowling.reliability}%`,
        ]);
      } else {
        const isBatter = category === 'Batters';
        rows.push([
          category, player.rank, player.player, player.teams.join(' / '), player.score,
          isBatter ? player.score : '', isBatter ? '' : player.score,
          player.pressureBalls, player.pressureMatches,
          isBatter ? player.pressureRate : player.pressureEconomy,
          isBatter ? player.usualRate : player.usualEconomy,
          `${player.consistency}%`, `${player.reliability}%`,
        ]);
      }
    }
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'supeRR-pressure-rankings.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Top-ten batter, bowler, and all-rounder rankings exported as CSV.');
}

function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      const view = link.dataset.view;
      if (view === 'batters' || view === 'bowlers' || view === 'allrounders') {
        state.view = view;
        state.kind = view;
        state.selectedId = null;
        render();
        document.querySelector('#analysis').scrollIntoView({ behavior: 'smooth' });
      } else if (view === 'targets') {
        state.view = view;
        render();
        document.querySelector('#rr-targets').scrollIntoView({ behavior: 'smooth' });
      } else if (view === 'methodology') {
        state.view = view;
        render();
        document.querySelector('#methodology').scrollIntoView({ behavior: 'smooth' });
      } else {
        state.view = 'overview';
        state.kind = 'batters';
        state.selectedId = null;
        render();
        document.querySelector('#top').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  elements.tabs.forEach((tab) => tab.addEventListener('click', () => {
    state.kind = tab.dataset.kind;
    state.view = state.kind;
    state.selectedId = null;
    render();
  }));
}

try {
  const response = await fetch('./analysis_data.json');
  if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`);
  state.data = await response.json();
  setupOverview(state.data);
  setupNavigation();
  elements.format.addEventListener('change', updateRankings);
  elements.season.addEventListener('change', updateRankings);
  elements.sample.addEventListener('change', updateRankings);
  elements.search.addEventListener('input', () => renderRows(state.rankings[state.kind]));
  elements.showAll.addEventListener('click', () => {
    state.showAll = !state.showAll;
    renderRows(state.rankings[state.kind]);
  });
  elements.compare.addEventListener('change', () => {
    state.compareId = elements.compare.value;
    renderProfile(state.rankings[state.kind]);
  });
  elements.sortButtons.forEach((button) => button.addEventListener('click', () => {
    if (state.sort === button.dataset.sort) state.direction *= -1;
    else {
      state.sort = button.dataset.sort;
      state.direction = -1;
    }
    renderRows(state.rankings[state.kind]);
  }));
  document.querySelector('#exportButton').addEventListener('click', exportCsv);
  elements.sample.value = '60:8';
  updateRankings();
} catch (error) {
  console.error(error);
  document.querySelector('#analysis-title').textContent = 'Dataset unavailable';
  elements.empty.hidden = false;
  elements.empty.textContent = 'The dashboard could not load analysis_data.json. Start the local server from this folder and refresh.';
  announce('Could not load the generated analysis data.');
}