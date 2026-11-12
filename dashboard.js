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
  showAll: document.querySelector('#showAllButton'),
  tabs: [...document.querySelectorAll('.list-tab')],
  sortButtons: [...document.querySelectorAll('.sort-button')],
  compare: document.querySelector('#compareSelect'),
  profileName: document.querySelector('#profileName'),
  profileTeam: document.querySelector('#profileTeam'),
  profileRank: document.querySelector('#profileRank'),
  profileScore: document.querySelector('#profileScore'),
  profileReliability: document.querySelector('#profileReliability'),
  profileChart: document.querySelector('#profileChart'),
  profileChartLabel: document.querySelector('#profileChartLabel'),
  metricUnit: document.querySelector('#profileMetricUnit'),
  pressureLabel: document.querySelector('#metricPressureLabel'),
  usualLabel: document.querySelector('#metricUsualLabel'),
  pressureMetric: document.querySelector('#metricPressure'),
  usualMetric: document.querySelector('#metricUsual'),
  matches: document.querySelector('#metricMatches'),
  balls: document.querySelector('#metricBalls'),
  outcomeLabel: document.querySelector('#metricOutcomeLabel'),
  outcome: document.querySelector('#metricOutcome'),
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
  rankings: { batters: [], bowlers: [] },
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
  return kind === 'batters' ? player.pressureRate : player.pressureEconomy;
}

function metricText(player, kind = state.kind) {
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
    performance.textContent = metricText(player);

    row.append(rank, name, score, performance);
    row.style.animationDelay = `${Math.min(index, 9) * 22}ms`;
    row.addEventListener('click', () => selectProfile(player.playerId));
    return row;
  }));
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
  figure.textContent = state.kind === 'batters' ? value.toFixed(1) : value.toFixed(2);
  row.append(name, track, figure);
  return row;
}

function renderProfile(list) {
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
    elements.profileName.textContent = 'No eligible players';
    elements.profileTeam.textContent = 'Adjust the filters to see a ranking.';
    elements.profileRank.textContent = '—';
    elements.profileScore.textContent = '—';
    elements.profileReliability.textContent = 'NO SAMPLE';
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

  const isBatter = state.kind === 'batters';
  const metric = isBatter ? player.pressureRate : player.pressureEconomy;
  const usual = isBatter ? player.usualRate : player.usualEconomy;
  const values = compared ? [metric, usual, displayMetric(compared), isBatter ? compared.usualRate : compared.usualEconomy] : [metric, usual];
  const max = Math.max(...values, 1) * 1.08;

  elements.profileName.textContent = player.player;
  elements.profileTeam.textContent = player.teams.join(' · ') || 'Team not listed';
  elements.profileRank.textContent = `RANK ${String(player.rank).padStart(2, '0')}`;
  elements.profileScore.textContent = player.score.toFixed(1);
  elements.profileReliability.textContent = `${player.reliability}% RELIABLE`;
  elements.profileChartLabel.textContent = compared ? 'PRESSURE / USUAL COMPARISON' : 'PRESSURE VS USUAL';
  elements.metricUnit.textContent = isBatter ? 'SR' : 'ECON / 6';
  elements.pressureLabel.textContent = isBatter ? 'PRESSURE SR' : 'PRESSURE ECONOMY';
  elements.usualLabel.textContent = isBatter ? 'USUAL SR' : 'USUAL ECONOMY';
  elements.pressureMetric.textContent = isBatter ? player.pressureRate.toFixed(1) : player.pressureEconomy.toFixed(2);
  elements.usualMetric.textContent = isBatter ? player.usualRate.toFixed(1) : player.usualEconomy.toFixed(2);
  elements.matches.textContent = String(player.pressureMatches);
  elements.balls.textContent = formatInt(player.pressureBalls);
  elements.outcomeLabel.textContent = isBatter ? 'PRESSURE OUTS / 100' : 'PRESSURE WICKETS';
  elements.outcome.textContent = isBatter ? player.pressureDismissalRate.toFixed(1) : String(player.pressureWickets);
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
  elements.metricLabel.textContent = isBatter ? 'PRESSURE STRIKE RATE' : 'PRESSURE ECONOMY / 6';
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.kind === state.kind;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  renderRows(list);
  renderProfile(list);

  const selectedTab = state.kind === 'batters' ? 'Batting index' : 'Bowling index';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const active = link.dataset.view === state.view;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#analysis-title').textContent = selectedTab === 'Batting index' ? 'Who holds their nerve?' : 'Who owns the tight overs?';
  if (!batters.length && !bowlers.length) elements.count.textContent = '0 eligible';
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
  ];
  const rows = [['category', 'rank', 'player', 'team', 'pressure_index', 'pressure_balls', 'pressure_matches', 'pressure_performance', 'usual_performance', 'positive_match_share', 'sample_reliability']];
  for (const [category, players] of allRanks) {
    for (const player of players.slice(0, 10)) {
      const isBatter = category === 'Batters';
      rows.push([
        category,
        player.rank,
        player.player,
        player.teams.join(' / '),
        player.score,
        player.pressureBalls,
        player.pressureMatches,
        isBatter ? player.pressureRate : player.pressureEconomy,
        isBatter ? player.usualRate : player.usualEconomy,
        `${player.consistency}%`,
        `${player.reliability}%`,
      ]);
    }
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'supeRR-pressure-rankings.csv';
  link.click();
  URL.revokeObjectURL(url);
  announce('Top-ten rankings exported as CSV.');
}

function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      const view = link.dataset.view;
      if (view === 'batters' || view === 'bowlers') {
        state.view = view;
        state.kind = view;
        state.selectedId = null;
        render();
        document.querySelector('#analysis').scrollIntoView({ behavior: 'smooth' });
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