// Charts and sensitivity tables for the methodology report. Hand-written inline SVG, no dependencies, no timestamps.
//
//   node charts.mjs           writes charts/*.svg and refreshes the chart and table blocks in methodology_report.md and .html
//   node charts.mjs --check   changes nothing; exits with an error if any chart file or report block differs from what this script generates
//
// Inputs: analysis_data.json (through scoring.mjs, exactly as the dashboard ranks) and sensitivity_data.json
// (written by sensitivity.mjs). Run from the data folder. Node 18 or newer. Two runs give identical output.
//
// A block in the report sits between two marker comments, `<!-- chart:NAME -->` and `<!-- /chart:NAME -->`
// (or `table:NAME` for the data tables built from sensitivity_data.json).
// The script replaces everything between the markers and leaves the rest of the file alone. Every number drawn in a
// chart is also written as a text label, and each row or bar group carries its values as data-* attributes.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const check = process.argv.includes('--check');
const { ratePlayers } = await import(new URL('./scoring.mjs', import.meta.url).href);
const analysis = JSON.parse(await readFile(resolve(root, 'analysis_data.json'), 'utf8'));
const sensitivity = JSON.parse(await readFile(resolve(root, 'sensitivity_data.json'), 'utf8'));
const records = analysis.records;

const rated = ratePlayers(records);
const primaryTop = { batters: rated.batters.slice(0, 10), bowlers: rated.bowlers.slice(0, 10) };

// The sensitivity chart mixes sensitivity_data.json with live scoring.mjs runs, so both must describe the same lists.
const sameList = (live, saved) => live.length === saved.length && live.every((p, i) => String(p.playerId) === String(saved[i].playerId) && p.score === saved[i].index);
if (!sameList(primaryTop.batters, sensitivity.primaryCheck.batters) || !sameList(primaryTop.bowlers, sensitivity.primaryCheck.bowlers)) {
  throw new Error('scoring.mjs gives different top-10 lists from sensitivity_data.json (primaryCheck). '
    + 'If scoring.mjs has APPLY_PLAYER_EXCLUSIONS = true, set it back to false; otherwise rerun `node sensitivity.mjs`.');
}

// ---------- drawing helpers ----------
const SANS = 'Segoe UI, Arial, sans-serif';
const MONO = 'Consolas, Courier New, monospace';
const INK = '#1b2920';
const MUTED = '#647168';
const LINE = '#dce4d9';
const GRID = '#edf0ea';
const ORANGE = '#e9684b';
const GREEN = '#294332';
const LIME = '#d8f45d';
const GREY = '#8d998f';

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n1 = (value) => (Math.round(value * 10) / 10).toFixed(1);
const n2 = (value) => (Math.round(value * 100) / 100).toFixed(2);
const px = (value) => String(Math.round(value * 100) / 100);
const attrs = (object) => Object.entries(object).map(([key, value]) => ` ${key}="${esc(value)}"`).join('');

function text(x, y, content, { size = 12, fill = INK, anchor = 'start', weight = 'normal', family = SANS, extra = {} } = {}) {
  return `<text x="${px(x)}" y="${px(y)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${attrs(extra)}>${esc(content)}</text>`;
}
const line = (x1, y1, x2, y2, stroke = LINE, width = 1) => `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${stroke}" stroke-width="${width}"/>`;
const rect = (x, y, width, height, fill, extra = '') => `<rect x="${px(x)}" y="${px(y)}" width="${px(width)}" height="${px(height)}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, stroke = 'none', strokeWidth = 0) => `<circle cx="${px(cx)}" cy="${px(cy)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

function svgDocument({ width, height, title, desc, body, inline }) {
  const size = inline ? ' style="width:100%;height:auto;display:block"' : ` width="${width}" height="${height}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${size} role="img" aria-label="${esc(title)}">`
    + `<title>${esc(title)}</title><desc>${esc(desc)}</desc>`
    + rect(0, 0, width, height, '#ffffff')
    + body
    + '</svg>';
}

function niceScale(minimum, maximum) {
  const span = maximum - minimum;
  const step = [0.5, 1, 2, 5, 10, 20, 25, 50].find((candidate) => span / candidate <= 7);
  const low = Math.floor((minimum - span * 0.05) / step) * step;
  const high = Math.ceil((maximum + span * 0.05) / step) * step;
  const ticks = [];
  for (let value = low; value <= high + 1e-9; value += step) ticks.push(Math.round(value * 100) / 100);
  return { low, high, ticks };
}

// ---------- chart 1 and 2: pressure versus usual, top 10 ----------
function dumbbell({ name, rows, valueKey, usualKey, decimals, axisTitle, note, title, desc }) {
  const width = 760;
  const top = 64;
  const rowHeight = 32;
  const plotLeft = 200;
  const plotRight = 640;
  const height = top + rows.length * rowHeight + 46;
  const values = rows.flatMap((row) => [row[valueKey], row[usualKey]]);
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const x = (value) => plotLeft + ((value - scale.low) / (scale.high - scale.low)) * (plotRight - plotLeft);
  const fmt = decimals === 1 ? n1 : n2;
  const parts = [];
  parts.push(text(14, 22, note, { size: 11, fill: MUTED }));
  parts.push(circle(20, 42, 6, ORANGE), text(32, 46, 'Under pressure', { size: 11 }));
  parts.push(circle(150, 42, 6, '#ffffff', GREY, 2), text(162, 46, 'Usual (ordinary balls)', { size: 11 }));
  parts.push(text(745, top - 8, 'INDEX', { size: 9, fill: MUTED, anchor: 'end', family: MONO }));
  for (const tick of scale.ticks) {
    parts.push(line(x(tick), top - 4, x(tick), top + rows.length * rowHeight, GRID));
    parts.push(text(x(tick), top + rows.length * rowHeight + 16, decimals === 1 ? String(tick) : tick.toFixed(1), { size: 10, fill: MUTED, anchor: 'middle' }));
  }
  parts.push(text((plotLeft + plotRight) / 2, top + rows.length * rowHeight + 36, axisTitle, { size: 11, fill: MUTED, anchor: 'middle' }));
  rows.forEach((row, index) => {
    const y = top + index * rowHeight + rowHeight / 2;
    const pressureX = x(row[valueKey]);
    const usualX = x(row[usualKey]);
    const leftIsPressure = pressureX < usualX;
    const group = [];
    group.push(index % 2 === 0 ? rect(8, y - rowHeight / 2, width - 16, rowHeight, '#f8faf5') : '');
    group.push(text(14, y + 4, String(row.rank).padStart(2, '0'), { size: 10, fill: ORANGE, family: MONO }));
    group.push(text(40, y + 4, row.player, { size: 12, weight: '600' }));
    group.push(line(Math.min(pressureX, usualX), y, Math.max(pressureX, usualX), y, '#c7d0c5', 3));
    group.push(circle(usualX, y, 6, '#ffffff', GREY, 2));
    group.push(circle(pressureX, y, 6, ORANGE));
    group.push(text(leftIsPressure ? pressureX - 11 : usualX - 11, y + 4, fmt(leftIsPressure ? row[valueKey] : row[usualKey]), {
      size: 11, anchor: 'end', fill: leftIsPressure ? ORANGE : MUTED, weight: leftIsPressure ? '700' : 'normal', extra: { class: leftIsPressure ? 'v-pressure' : 'v-usual' },
    }));
    group.push(text(leftIsPressure ? usualX + 11 : pressureX + 11, y + 4, fmt(leftIsPressure ? row[usualKey] : row[valueKey]), {
      size: 11, anchor: 'start', fill: leftIsPressure ? MUTED : ORANGE, weight: leftIsPressure ? 'normal' : '700', extra: { class: leftIsPressure ? 'v-usual' : 'v-pressure' },
    }));
    group.push(text(745, y + 4, n1(row.score), { size: 12, anchor: 'end', weight: '700', fill: GREEN, family: MONO, extra: { class: 'v-index' } }));
    parts.push(`<g class="row" data-rank="${row.rank}" data-player="${esc(row.player)}" data-index="${n1(row.score)}" data-pressure="${fmt(row[valueKey])}" data-usual="${fmt(row[usualKey])}">${group.join('')}</g>`);
  });
  return { name, width, height, body: parts.join(''), title, desc };
}

// ---------- chart 3: league-wide pressure versus ordinary ----------
function leagueTotals() {
  const build = (subset) => {
    const bat = { pressure: { balls: 0, runs: 0, outs: 0 }, usual: { balls: 0, runs: 0, outs: 0 } };
    const bowl = { pressure: { balls: 0, conceded: 0, wickets: 0 }, usual: { balls: 0, conceded: 0, wickets: 0 } };
    for (const record of subset) {
      for (const side of ['pressure', 'usual']) {
        const target = record.kind === 'batter' ? bat[side] : bowl[side];
        for (const key of Object.keys(target)) target[key] += Number(record[side][key] ?? 0);
      }
    }
    return {
      battingSR: { pressure: (bat.pressure.runs * 100) / bat.pressure.balls, usual: (bat.usual.runs * 100) / bat.usual.balls },
      battingOuts: { pressure: (bat.pressure.outs * 100) / bat.pressure.balls, usual: (bat.usual.outs * 100) / bat.usual.balls },
      bowlingEconomy: { pressure: (bowl.pressure.conceded * 6) / bowl.pressure.balls, usual: (bowl.usual.conceded * 6) / bowl.usual.balls },
      bowlingWickets: { pressure: (bowl.pressure.wickets * 100) / bowl.pressure.balls, usual: (bowl.usual.wickets * 100) / bowl.usual.balls },
    };
  };
  return [['All', build(records)], ['IPL', build(records.filter((r) => r.format === 'IPL'))], ['T20I', build(records.filter((r) => r.format === 'T20I'))]];
}

function leagueChart() {
  const groups = leagueTotals();
  const panels = [
    ['battingSR', 'Batting strike rate', 'runs per 100 balls faced', 1],
    ['battingOuts', 'Batting dismissals', 'outs per 100 balls faced', 2],
    ['bowlingEconomy', 'Bowling economy', 'runs per 6 legal balls', 2],
    ['bowlingWickets', 'Bowling wickets', 'wickets per 100 legal balls', 2],
  ];
  const width = 760;
  const panelWidth = 360;
  const panelHeight = 236;
  const height = 50 + 2 * panelHeight + 8;
  const parts = [];
  parts.push(rect(14, 16, 12, 12, ORANGE), text(32, 27, 'Pressure deliveries', { size: 11 }));
  parts.push(rect(170, 16, 12, 12, GREY), text(188, 27, 'Ordinary deliveries', { size: 11 }));
  panels.forEach(([key, heading, unit, decimals], index) => {
    const ox = 14 + (index % 2) * (panelWidth + 18);
    const oy = 46 + Math.floor(index / 2) * panelHeight;
    const fmt = decimals === 1 ? n1 : n2;
    const maximum = Math.max(...groups.flatMap(([, g]) => [g[key].pressure, g[key].usual]));
    const baseline = oy + panelHeight - 44;
    const plotTop = oy + 46;
    const scale = (baseline - plotTop) / (maximum * 1.0);
    parts.push(rect(ox, oy, panelWidth, panelHeight - 10, '#fbfcf9', ` stroke="${LINE}"`));
    parts.push(text(ox + 12, oy + 20, heading, { size: 13, weight: '700' }));
    parts.push(text(ox + 12, oy + 35, unit, { size: 10, fill: MUTED }));
    parts.push(line(ox + 10, baseline, ox + panelWidth - 10, baseline, '#aeb9af'));
    groups.forEach(([label, g], gi) => {
      const centre = ox + 62 + gi * 118;
      const bars = [['pressure', centre - 41, ORANGE, '700'], ['usual', centre + 3, GREY, 'normal']];
      const entries = bars.map(([side, bx, fill, weight]) => {
        const value = g[key][side];
        const barHeight = value * scale;
        return rect(bx, baseline - barHeight, 38, barHeight, fill)
          + text(bx + 19, baseline - barHeight - 5, fmt(value), { size: 11, anchor: 'middle', weight, fill: side === 'pressure' ? ORANGE : MUTED, extra: { class: `v-${side}` } });
      });
      parts.push(`<g class="group" data-panel="${key}" data-scope="${label}" data-pressure="${fmt(g[key].pressure)}" data-ordinary="${fmt(g[key].usual)}">${entries.join('')}${text(centre, baseline + 16, label, { size: 11, anchor: 'middle', weight: '600' })}</g>`);
    });
  });
  return {
    name: 'league_pressure_vs_ordinary',
    width,
    height,
    body: parts.join(''),
    title: 'League-wide results on pressure and ordinary deliveries',
    desc: 'Four panels (batting strike rate, batting dismissals, bowling economy, bowling wickets), each with pressure and ordinary bars for all in-scope data, IPL and T20I. Every value is printed above its bar.',
  };
}

// ---------- chart 4 and 5: top-10 membership across settings ----------
const ids = (list) => new Map(list.slice(0, 10).map((p) => [String(p.playerId), p.rank]));
const thresholds = [[36, 5], [90, 10]].map(([minBalls, minMatches]) => ratePlayers(records, { minBalls, minMatches }));
const COLUMNS = [
  { key: 'primary', head: ['Submitted', 'no exclusions', 'other +1 run'], scenario: true },
  { key: 'otherNoPenalty', head: ['No excl.,', 'other:', 'no penalty run'], scenario: true },
  { key: 'exclusionsOn', head: ['Alternative', 'exclusions on', 'other +1 run'], scenario: true },
  { key: 'exclusionsOnNoPenalty', head: ['Excl. on,', 'other:', 'no penalty run'], scenario: true },
  { key: 'balls36', head: ['36 balls', '5 matches', 'no excl.'], scenario: false },
  { key: 'balls90', head: ['90 balls', '10 matches', 'no excl.'], scenario: false },
];

function membershipChart(kind, key, label) {
  const lists = {
    primary: ids(rated[key]),
    otherNoPenalty: ids(sensitivity.otherAlternative.exclusionsOff[key].top10),
    exclusionsOn: ids(sensitivity.exclusionAlternative[key].top10),
    exclusionsOnNoPenalty: ids(sensitivity.otherAlternative.exclusionsOn[key].top10),
    balls36: ids(thresholds[0][key]),
    balls90: ids(thresholds[1][key]),
  };
  const names = new Map();
  for (const list of [rated[key], ...thresholds.map((t) => t[key]), sensitivity.otherAlternative.exclusionsOff[key].top10, sensitivity.exclusionAlternative[key].top10, sensitivity.otherAlternative.exclusionsOn[key].top10]) {
    for (const p of list) names.set(String(p.playerId), p.player);
  }
  const everyone = new Set(COLUMNS.flatMap((column) => [...lists[column.key].keys()]));
  const describe = (id) => {
    const ranks = COLUMNS.map((column) => lists[column.key].get(id) ?? null);
    return {
      id,
      player: names.get(id),
      ranks,
      count: ranks.filter((rank) => rank !== null).length,
      core: ranks.slice(0, 4).every((rank) => rank !== null),
      best: Math.min(...ranks.filter((rank) => rank !== null)),
    };
  };
  const entries = [...everyone].map(describe).sort((a, b) => (a.ranks[0] ?? 99) - (b.ranks[0] ?? 99) || b.count - a.count || a.best - b.best || a.player.localeCompare(b.player));

  const width = 760;
  const top = 92;
  const rowHeight = 22;
  const height = top + entries.length * rowHeight + 52;
  const centre = (index) => 236 + index * 72;
  const parts = [];
  parts.push(text(14, 20, `Top 10 ${label}: rank in each setting. Blank means outside the top 10 or not eligible.`, { size: 11, fill: MUTED }));
  parts.push(text(centre(0) - 38, 40, 'Scenarios (60 balls / 8 matches)', { size: 10, fill: GREEN, weight: '700' }));
  parts.push(line(centre(0) - 38, 44, centre(3) + 38, 44, GREEN, 2));
  parts.push(text(centre(4) - 38, 40, 'Other thresholds', { size: 10, fill: GREEN, weight: '700' }));
  parts.push(line(centre(4) - 38, 44, centre(5) + 38, 44, GREEN, 2));
  COLUMNS.forEach((column, index) => {
    column.head.forEach((piece, lineIndex) => parts.push(text(centre(index), 58 + lineIndex * 12, piece, { size: 10, anchor: 'middle', fill: lineIndex === 0 ? INK : MUTED, weight: lineIndex === 0 ? '700' : 'normal' })));
  });
  parts.push(text(676, 58, 'In top 10', { size: 10, anchor: 'middle', weight: '700' }));
  parts.push(text(676, 70, 'of 6 settings', { size: 10, anchor: 'middle', fill: MUTED }));
  parts.push(text(736, 58, 'Robust', { size: 10, anchor: 'middle', weight: '700' }));
  parts.push(text(736, 70, 'core', { size: 10, anchor: 'middle', fill: MUTED }));
  entries.forEach((entry, index) => {
    const y = top + index * rowHeight;
    const cells = entry.ranks.map((rank, column) => (rank === null ? '' : rect(centre(column) - 17, y + 2, 34, rowHeight - 4, column === 0 ? GREEN : LIME, ' rx="3"')
      + text(centre(column), y + 15, String(rank), { size: 11, anchor: 'middle', weight: '700', fill: column === 0 ? '#ffffff' : GREEN, extra: { class: 'v-rank' } }))).join('');
    parts.push(`<g class="row" data-player="${esc(entry.player)}" data-ranks="${entry.ranks.map((rank) => rank ?? '-').join(',')}" data-count="${entry.count}" data-core="${entry.core ? 'yes' : 'no'}">`
      + (index % 2 === 0 ? rect(8, y, width - 16, rowHeight, '#f8faf5') : '')
      + text(14, y + 15, entry.player, { size: 12, weight: entry.core ? '700' : 'normal' })
      + cells
      + text(676, y + 15, String(entry.count), { size: 11, anchor: 'middle', family: MONO })
      + (entry.core ? text(736, y + 15, 'core', { size: 10, anchor: 'middle', weight: '700', fill: GREEN }) : '')
      + '</g>');
  });
  parts.push(text(14, top + entries.length * rowHeight + 22, 'Robust core: top 10 in all four scenario columns (exclusions on or off, other = illegal ball with or without the penalty run).', { size: 10, fill: MUTED }));
  parts.push(text(14, top + entries.length * rowHeight + 38, 'Dark green: the submitted list. Light green: top 10 in that setting. Number = rank in that setting.', { size: 10, fill: MUTED }));
  return {
    name: `sensitivity_top10_${key}`,
    width,
    height,
    body: parts.join(''),
    title: `Top-10 membership of ${label} across settings`,
    desc: `A grid with one row per player who reaches the top 10 of ${label} in at least one of six settings and one column per setting. Each filled cell shows the player's rank in that setting.`,
    kind,
  };
}

// ---------- chart 6: stability of the primary top 10 ----------
function stabilityChart() {
  const width = 760;
  const top = 74;
  const rowHeight = 30;
  const sections = [['Batters', sensitivity.rankStability.batters], ['Bowlers', sensitivity.rankStability.bowlers]];
  const height = top + sections.length * (rowHeight * 10 + 34) + 14;
  const barLeft = 216;
  const barWidth = 400;
  const parts = [];
  parts.push(text(14, 20, 'Share of 1,000 re-rating runs in which the submitted top-10 player is still in the top 10.', { size: 11, fill: MUTED }));
  parts.push(rect(14, 34, 12, 8, ORANGE), text(32, 42, 'Bootstrap: matches resampled, so a player\'s own results vary', { size: 10 }));
  parts.push(rect(14, 48, 12, 8, GREEN), text(32, 56, 'Pool deletion: a random 20% of the other eligible players removed', { size: 10 }));
  let y = top;
  for (const [label, list] of sections) {
    parts.push(text(14, y + 16, label.toUpperCase(), { size: 10, fill: MUTED, family: MONO }));
    for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
      parts.push(line(barLeft + tick * barWidth, y + 22, barLeft + tick * barWidth, y + 22 + rowHeight * 10, GRID));
      parts.push(text(barLeft + tick * barWidth, y + 32 + rowHeight * 10, `${tick * 100}%`, { size: 9, anchor: 'middle', fill: MUTED }));
    }
    parts.push(line(barLeft + 0.5 * barWidth, y + 22, barLeft + 0.5 * barWidth, y + 22 + rowHeight * 10, '#c7d0c5', 1.5));
    list.forEach((player, index) => {
      const ry = y + 22 + index * rowHeight;
      const boot = player.bootstrap.shareInTop10;
      const pool = player.poolDeletion.shareInTop10;
      const pct = (share) => `${Math.round(share * 100)}%`;
      parts.push(`<g class="row" data-rank="${player.rank}" data-player="${esc(player.player)}" data-bootstrap="${pct(boot)}" data-pooldeletion="${pct(pool)}">`
        + (index % 2 === 0 ? rect(8, ry, width - 16, rowHeight, '#f8faf5') : '')
        + text(14, ry + 19, String(player.rank).padStart(2, '0'), { size: 10, fill: ORANGE, family: MONO })
        + text(38, ry + 19, player.player, { size: 12, weight: '600' })
        + rect(barLeft, ry + 5, boot * barWidth, 9, ORANGE)
        + text(barLeft + boot * barWidth + 6, ry + 14, pct(boot), { size: 10, weight: '700', fill: ORANGE, extra: { class: 'v-bootstrap' } })
        + rect(barLeft, ry + 16, pool * barWidth, 9, GREEN)
        + text(barLeft + pool * barWidth + 6, ry + 25, pct(pool), { size: 10, fill: GREEN, extra: { class: 'v-pooldeletion' } })
        + text(745, ry + 19, player.fragility, { size: 10, anchor: 'end', fill: player.fragility === 'fragile' ? ORANGE : MUTED, weight: player.fragility === 'fragile' ? '700' : 'normal' })
        + '</g>');
    });
    y += rowHeight * 10 + 34;
  }
  parts.push(text(745, 56, 'bootstrap class', { size: 9, anchor: 'end', fill: MUTED, family: MONO }));
  return {
    name: 'rank_stability',
    width,
    height,
    body: parts.join(''),
    title: 'How often each submitted top-10 player stays in the top 10 when the data is re-sampled',
    desc: 'Horizontal bars for the ten batters and ten bowlers: the share of 1,000 bootstrap runs and of 1,000 pool-deletion runs in which the player is still in the top 10, with the fragility label from the bootstrap share.',
  };
}

// ---------- chart list, captions, files ----------
const batterRows = primaryTop.batters.map((p) => ({ rank: p.rank, player: p.player, score: p.score, pressure: p.pressureRate, usual: p.usualRate }));
const bowlerRows = primaryTop.bowlers.map((p) => ({ rank: p.rank, player: p.player, score: p.score, pressure: p.pressureEconomy, usual: p.usualEconomy }));

const charts = [
  {
    ...dumbbell({
      name: 'batters_pressure_vs_usual_sr',
      rows: batterRows,
      valueKey: 'pressure',
      usualKey: 'usual',
      decimals: 1,
      axisTitle: 'Strike rate (runs per 100 balls faced)',
      note: 'Top 10 batters: strike rate under pressure against usual. Higher is better.',
      title: 'Top 10 batters: pressure strike rate against usual strike rate',
      desc: 'For each of the ten ranked batters, the strike rate on pressure deliveries and on ordinary deliveries, with the pressure index at the right.',
    }),
    alt: 'Top 10 batters: pressure strike rate against usual strike rate',
    caption: 'Figure 1. Top 10 batters, strike rate under pressure (orange) against usual strike rate (grey ring). Every value is printed; the same numbers are in the top 10 batters table.',
  },
  {
    ...dumbbell({
      name: 'bowlers_pressure_vs_usual_economy',
      rows: bowlerRows,
      valueKey: 'pressure',
      usualKey: 'usual',
      decimals: 2,
      axisTitle: 'Economy (runs per 6 legal balls)',
      note: 'Top 10 bowlers: economy under pressure against usual. Lower is better.',
      title: 'Top 10 bowlers: pressure economy against usual economy',
      desc: 'For each of the ten ranked bowlers, the economy rate on pressure deliveries and on ordinary deliveries, with the pressure index at the right.',
    }),
    alt: 'Top 10 bowlers: pressure economy against usual economy',
    caption: 'Figure 2. Top 10 bowlers, economy under pressure (orange) against usual economy (grey ring). Lower is better, so a dot to the left of its ring is an improvement. Every value is printed; the same numbers are in the top 10 bowlers table.',
  },
  {
    ...leagueChart(),
    alt: 'League-wide pressure against ordinary deliveries',
    caption: 'Figure 3. League-wide results on pressure and ordinary deliveries for every in-scope player-match record, all data and split by IPL and T20I. Values are printed above the bars and equal the league-wide table.',
  },
  {
    ...membershipChart('batter', 'batters', 'batters'),
    alt: 'Top-10 membership of batters across settings',
    caption: 'Figure 4. Top-10 batters across six settings. The first four columns are the robust-core test (player exclusions on or off, and the "other" extras type with or without the penalty run). The last two columns change the sample thresholds with no exclusions.',
  },
  {
    ...membershipChart('bowler', 'bowlers', 'bowlers'),
    alt: 'Top-10 membership of bowlers across settings',
    caption: 'Figure 5. Top-10 bowlers across the same six settings as Figure 4.',
  },
  {
    ...stabilityChart(),
    alt: 'Stability of the submitted top 10 under re-sampling',
    caption: 'Figure 6. Share of 1,000 bootstrap runs and 1,000 pool-deletion runs in which each submitted top-10 player stays in the top 10 (sensitivity_data.json, rankStability). The label at the right is the bootstrap fragility class: below 50% fragile, 50% to under 80% moderate, 80% or more stable.',
  },
];

const plainAscii = (value) => !/[^\x00-\x7F]/.test(value);
const files = new Map();
for (const chart of charts) {
  const standalone = svgDocument({ ...chart, inline: false });
  if (!plainAscii(standalone)) throw new Error(`chart ${chart.name} contains a non-ASCII character`);
  files.set(`charts/${chart.name}.svg`, `${standalone}\n`);
}

// ---------- data tables (same numbers as the sensitivity data, written to the md and the html) ----------
const primaryRankOf = (key, playerId) => rated[key].find((p) => String(p.playerId) === String(playerId))?.rank ?? null;
const pct = (share) => `${Math.round(share * 100)}%`;
const BATTER_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Index', 'r'], ['Pressure SR', 'r'], ['Usual SR', 'r'], ['Pressure balls', 'r'], ['Pressure matches', 'r'], ['Positive-match share', 'r'], ['Sample reliability', 'r'], ['Rank in submitted list', 'r']];
const BOWLER_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Index', 'r'], ['Pressure econ/6', 'r'], ['Usual econ/6', 'r'], ['Pressure balls', 'r'], ['Pressure matches', 'r'], ['Positive-match share', 'r'], ['Sample reliability', 'r'], ['Rank in submitted list', 'r']];
const ALLROUNDER_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Composite index', 'r'], ['Batting index', 'r'], ['Bowling index', 'r'], ['Batting pressure balls', 'r'], ['Bowling pressure balls', 'r'], ['Batting matches', 'r'], ['Bowling matches', 'r'], ['Rank in submitted list', 'r']];
const allrounderRows = (list) => list.map((p) => [p.rank, p.player, n1(p.index), n1(p.battingIndex), n1(p.bowlingIndex), p.battingPressureBalls, p.bowlingPressureBalls, p.battingMatches, p.bowlingMatches, primaryRankOf('allrounders', p.playerId) ?? 'not eligible']);
const fullRows = (kind, list, key) => list.map((p) => (kind === 'batter'
  ? [p.rank, p.player, n1(p.index), n1(p.pressureSR), n1(p.usualSR), p.pressureBalls, p.pressureMatches, `${p.positiveMatchSharePct}%`, `${p.reliabilityPct}%`, primaryRankOf(key, p.playerId) ?? 'not eligible']
  : [p.rank, p.player, n1(p.index), n2(p.pressureEconomy), n2(p.usualEconomy), p.pressureBalls, p.pressureMatches, `${p.positiveMatchSharePct}%`, `${p.reliabilityPct}%`, primaryRankOf(key, p.playerId) ?? 'not eligible']));

function poolTableRows() {
  const bowlers = new Map(sensitivity.poolSizes.bowlers.map((pool) => [pool.pool, pool]));
  return sensitivity.poolSizes.batters.map((pool) => {
    const bowl = bowlers.get(pool.pool);
    return [pool.pool, pool.eligiblePlayers, pool.medianPressureBallsPerPlayer, pool.thin ? 'thin (10 or fewer)' : 'no', bowl.eligiblePlayers, bowl.medianPressureBallsPerPlayer];
  });
}

function fragilityRows(key) {
  return sensitivity.rankStability[key].map((s) => [
    s.rank, s.player, n1(s.index), pct(s.poolExposure.shareOfPressureBallsInT20IPools), s.poolExposure.smallestPoolSize,
    `${s.leaveOneOut.worstRank}${s.leaveOneOut.timesOutOfTop10 ? ` (out in ${s.leaveOneOut.timesOutOfTop10} of ${s.leaveOneOut.runs})` : ''}`,
    pct(s.bootstrap.shareInTop10), pct(s.poolDeletion.shareInTop10), `${s.fragility} / ${s.poolCompositionFragility}`,
  ]);
}
const FRAGILITY_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Index', 'r'], ['Pressure balls in T20I pools', 'r'], ['Smallest pool (players)', 'r'], ['Worst rank, one other player removed', 'r'], ['In top 10, bootstrap', 'r'], ['In top 10, pool deletion', 'r'], ['Class: bootstrap / pool deletion', 'r']];

function variantRows() {
  const ordinal = (n) => `${n}`;
  const names = (list, withRank) => (list.length ? list.map((p) => (withRank(p))).join('; ') : 'none');
  const inText = (p) => `${p.player} (${ordinal(p.rank)}, was ${p.rankInOtherList ?? 'unranked'})`;
  const outText = (p) => `${p.player} (was ${ordinal(p.rank)}, now ${p.rankInOtherList ?? 'not eligible'})`;
  const make = (label, v) => [label, `${v.eligible.batters} / ${v.eligible.bowlers}`, `${v.batters.versusPrimary.sharedNames} / ${v.bowlers.versusPrimary.sharedNames}`,
    names(v.batters.versusPrimary.movedIn, inText), names(v.batters.versusPrimary.movedOut, outText), names(v.bowlers.versusPrimary.movedIn, inText), names(v.bowlers.versusPrimary.movedOut, outText)];
  return [
    ...sensitivity.minimumPoolSize.variants.map((v) => make(`Drop pools with fewer than ${v.minimumPoolSize} eligible players (${v.poolsDropped.length} pools dropped)`, v)),
    ...sensitivity.poolingSeasons.standardisationPooled.map((v) => make(`Standardise against a shared pool: ${v.label}`, v)),
  ];
}
const VARIANT_COLUMNS = [['Setting', 'l'], ['Eligible bat / bowl', 'r'], ['Top-10 names shared, bat / bowl', 'r'], ['Batters in', 'l'], ['Batters out', 'l'], ['Bowlers in', 'l'], ['Bowlers out', 'l']];

function robustRows(key) {
  const core = sensitivity.robustCore[key];
  const everyone = [...core.core, ...core.primaryTop10NotInCore, ...core.otherNamesInSomeScenario];
  const order = ['exclusionsOff_otherPenalty', 'exclusionsOff_otherNoPenalty', 'exclusionsOn_otherPenalty', 'exclusionsOn_otherNoPenalty'];
  const best = (entry) => Math.min(...order.map((scenario) => entry.ranks[scenario] ?? 99));
  return everyone
    .sort((a, b) => b.scenariosInTop10 - a.scenariosInTop10 || (a.ranks.exclusionsOff_otherPenalty ?? 99) - (b.ranks.exclusionsOff_otherPenalty ?? 99) || best(a) - best(b) || a.player.localeCompare(b.player))
    .map((entry) => [entry.player, ...order.map((scenario) => entry.ranks[scenario] ?? '-'), `${entry.scenariosInTop10} of 4`, entry.scenariosInTop10 === 4 ? 'core' : '']);
}
const ROBUST_COLUMNS = [['Player', 'l'], ['Submitted list (no exclusions)', 'r'], ['No exclusions, no penalty run', 'r'], ['Alternative: exclusions on', 'r'], ['Exclusions on, no penalty run', 'r'], ['Top 10 in', 'r'], ['Robust core', 'r']];

const tables = [
  { name: 'exclusions_batters', columns: BATTER_COLUMNS, rows: fullRows('batter', sensitivity.exclusionAlternative.batters.top10, 'batters'), rankFirst: true },
  { name: 'exclusions_bowlers', columns: BOWLER_COLUMNS, rows: fullRows('bowler', sensitivity.exclusionAlternative.bowlers.top10, 'bowlers'), rankFirst: true },
  { name: 'exclusions_allrounders', columns: ALLROUNDER_COLUMNS, rows: allrounderRows(sensitivity.exclusionAlternative.allrounders.top10), rankFirst: true },
  { name: 'other_batters', columns: BATTER_COLUMNS, rows: fullRows('batter', sensitivity.otherAlternative.exclusionsOff.batters.top10, 'batters'), rankFirst: true },
  { name: 'other_bowlers', columns: BOWLER_COLUMNS, rows: fullRows('bowler', sensitivity.otherAlternative.exclusionsOff.bowlers.top10, 'bowlers'), rankFirst: true },
  { name: 'robust_batters', columns: ROBUST_COLUMNS, rows: robustRows('batters'), plain: true },
  { name: 'robust_bowlers', columns: ROBUST_COLUMNS, rows: robustRows('bowlers'), plain: true },
  { name: 'pool_sizes', columns: [['Pool', 'l'], ['Eligible batters', 'r'], ['Median pressure balls per batter', 'r'], ['Batter pool thin', 'r'], ['Eligible bowlers', 'r'], ['Median pressure balls per bowler', 'r']], rows: poolTableRows(), plain: true },
  { name: 'fragility_batters', columns: FRAGILITY_COLUMNS, rows: fragilityRows('batters'), rankFirst: true },
  { name: 'fragility_bowlers', columns: FRAGILITY_COLUMNS, rows: fragilityRows('bowlers'), rankFirst: true },
  { name: 'pool_variants', columns: VARIANT_COLUMNS, rows: variantRows(), text: true },
];

const mdTable = (table) => {
  const head = `| ${table.columns.map(([label]) => label).join(' | ')} |`;
  const rule = `|${table.columns.map(([, align]) => (align === 'r' ? '---:' : '---')).join('|')}|`;
  const body = table.rows.map((row) => `| ${row.join(' | ')} |`);
  return [head, rule, ...body].join('\n');
};
const htmlTable = (table) => {
  const head = `<tr>${table.columns.map(([label]) => `<th>${esc(label.toUpperCase())}</th>`).join('')}</tr>`;
  const body = table.rows.map((row) => `      <tr>${row.map((cell, index) => `<td>${esc(index === 0 && table.rankFirst ? String(cell).padStart(2, '0') : cell)}</td>`).join('')}</tr>`);
  return `<div class="table-wrap${table.text ? ' text' : table.plain ? ' plain' : ''}"><table><thead>${head}</thead><tbody>\n${body.join('\n')}\n    </tbody></table></div>`;
};

const blocks = [
  ...charts.map((chart) => ({
    id: `chart:${chart.name}`,
    md: `![${chart.alt}](charts/${chart.name}.svg)\n\n*${chart.caption}*`,
    html: `<figure class="chart">${svgDocument({ ...chart, inline: true })}<figcaption>${esc(chart.caption)}</figcaption></figure>`,
  })),
  ...tables.map((table) => ({ id: `table:${table.name}`, md: `\n${mdTable(table)}\n`, html: htmlTable(table) })),
];

async function refresh(file, format) {
  const original = await readFile(resolve(root, file), 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let next = original.replace(/\r\n/g, '\n');
  for (const block of blocks) {
    const pattern = new RegExp(`<!-- ${block.id} -->[\\s\\S]*?<!-- /${block.id} -->`);
    if (!pattern.test(next)) throw new Error(`${file} has no <!-- ${block.id} --> marker pair`);
    next = next.replace(pattern, () => `<!-- ${block.id} -->\n${block[format]}\n<!-- /${block.id} -->`);
  }
  return { file, original: original.replace(/\r\n/g, '\n'), next, eol };
}

const reports = [await refresh('methodology_report.md', 'md'), await refresh('methodology_report.html', 'html')];

let differences = 0;
for (const [file, content] of files) {
  let current = null;
  try { current = (await readFile(resolve(root, file), 'utf8')).replace(/\r\n/g, '\n'); } catch { /* missing */ }
  if (current !== content) {
    differences += 1;
    if (!check) {
      await mkdir(resolve(root, 'charts'), { recursive: true });
      await writeFile(resolve(root, file), content);
    } else console.log(`differs: ${file}`);
  }
}
for (const report of reports) {
  if (report.original !== report.next) {
    differences += 1;
    if (!check) await writeFile(resolve(root, report.file), report.next.replace(/\n/g, report.eol));
    else console.log(`differs: ${report.file}`);
  }
}
if (check) {
  if (differences) { console.log(`${differences} file(s) differ from the generated charts`); process.exit(1); }
  console.log(`ok: ${files.size} chart files and ${blocks.length} chart/table blocks in the md and html match the script output`);
} else {
  console.log(`${files.size} charts and ${tables.length} tables generated; ${differences} file(s) changed`);
}
