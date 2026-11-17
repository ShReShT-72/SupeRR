// Charts and tables for the IPL-only methodology report (IPL 2022 to 2026, top 10 batters and top 10 bowlers).
// Hand-written inline SVG, no dependencies, no timestamps.
//
//   node charts.mjs           writes charts/*.svg and refreshes the chart and table blocks in methodology_report.md and .html
//   node charts.mjs --check   changes nothing; exits with an error if any chart file or report block differs from what this script generates
//
// Inputs: analysis_data.json (through scoring.mjs with { format: 'IPL' }, exactly as the dashboard ranks its IPL view),
// sensitivity_data.json (written by sensitivity.mjs) and other_evidence_data.json (node other_evidence.mjs --write, IPL scope).
// The primary (submitted) method is labelled as such in every table; the rest are
// alternatives that were tested and not adopted. Run from the data folder. Node 18 or newer. Two runs give identical output.
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

const iplRecords = records.filter((r) => r.format === 'IPL');
const iplQuality = analysis.dataQuality.byFormat.IPL;
const rated = ratePlayers(records, { format: 'IPL' });
const primaryTop = { batters: rated.batters.slice(0, 10), bowlers: rated.bowlers.slice(0, 10) };

// The sensitivity chart mixes sensitivity_data.json with live scoring.mjs runs, so both must describe the same lists.
const sameList = (live, saved) => live.length === saved.length && live.every((p, i) => String(p.playerId) === String(saved[i].playerId) && p.score === saved[i].index);
if (!sameList(primaryTop.batters, sensitivity.primaryCheck.batters) || !sameList(primaryTop.bowlers, sensitivity.primaryCheck.bowlers)) {
  throw new Error('scoring.mjs gives different top-10 lists from sensitivity_data.json (primaryCheck). '
    + 'If scoring.mjs has APPLY_PLAYER_EXCLUSIONS = false, set it back to true; otherwise rerun `node sensitivity.mjs` (IPL only).');
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
      ballsFaced: { pressure: bat.pressure.balls, usual: bat.usual.balls },
      ballsBowled: { pressure: bowl.pressure.balls, usual: bowl.usual.balls },
      battingSR: { pressure: (bat.pressure.runs * 100) / bat.pressure.balls, usual: (bat.usual.runs * 100) / bat.usual.balls },
      battingOuts: { pressure: (bat.pressure.outs * 100) / bat.pressure.balls, usual: (bat.usual.outs * 100) / bat.usual.balls },
      bowlingEconomy: { pressure: (bowl.pressure.conceded * 6) / bowl.pressure.balls, usual: (bowl.usual.conceded * 6) / bowl.usual.balls },
      bowlingWickets: { pressure: (bowl.pressure.wickets * 100) / bowl.pressure.balls, usual: (bowl.usual.wickets * 100) / bowl.usual.balls },
    };
  };
  return [['IPL', build(iplRecords)]];
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
      const centre = ox + panelWidth / 2;
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
    title: 'IPL league-wide results on pressure and ordinary deliveries',
    desc: 'Four panels (batting strike rate, batting dismissals, bowling economy, bowling wickets), each with pressure and ordinary bars for IPL 2022 to 2026. Every value is printed above its bar.',
  };
}

// ---------- chart 4 and 5: top-10 membership across settings ----------
const ids = (list) => new Map(list.slice(0, 10).map((p) => [String(p.playerId), p.rank]));
const thresholds = [[36, 5], [90, 10]].map(([minBalls, minMatches]) => ratePlayers(records, { format: 'IPL', minBalls, minMatches }));
const COLUMNS = [
  { key: 'primary', head: ['Submitted', 'exclusions on', 'other +1 run'], scenario: true },
  { key: 'otherNoPenalty', head: ['Excl. on,', 'other:', 'no penalty run'], scenario: true },
  { key: 'exclusionsOff', head: ['Alternative', 'no exclusions', 'other +1 run'], scenario: true },
  { key: 'exclusionsOffNoPenalty', head: ['No excl.,', 'other:', 'no penalty run'], scenario: true },
  { key: 'balls36', head: ['36 balls', '5 matches', 'excl. on'], scenario: false },
  { key: 'balls90', head: ['90 balls', '10 matches', 'excl. on'], scenario: false },
];

function membershipChart(kind, key, label) {
  const lists = {
    primary: ids(rated[key]),
    otherNoPenalty: ids(sensitivity.otherAlternative.exclusionsOn[key].top10),
    exclusionsOff: ids(sensitivity.noExclusionAlternative[key].top10),
    exclusionsOffNoPenalty: ids(sensitivity.otherAlternative.exclusionsOff[key].top10),
    balls36: ids(thresholds[0][key]),
    balls90: ids(thresholds[1][key]),
  };
  const names = new Map();
  for (const list of [rated[key], ...thresholds.map((t) => t[key]), sensitivity.otherAlternative.exclusionsOn[key].top10, sensitivity.noExclusionAlternative[key].top10, sensitivity.otherAlternative.exclusionsOff[key].top10]) {
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
    caption: 'Figure 3. IPL league-wide results on pressure and ordinary deliveries for every IPL player-match record, 2022 to 2026. Values are printed above the bars and equal the league-wide table.',
  },
  {
    ...membershipChart('batter', 'batters', 'batters'),
    alt: 'Top-10 membership of batters across settings',
    caption: 'Figure 4. Top-10 batters across six settings. The first four columns are the robust-core test (player exclusions on or off, and the "other" extras type with or without the penalty run). The last two columns change the sample thresholds with the exclusions on.',
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
const fullRows = (kind, list, key, missing = 'not eligible') => list.map((p) => (kind === 'batter'
  ? [p.rank, p.player, n1(p.index), n1(p.pressureSR), n1(p.usualSR), p.pressureBalls, p.pressureMatches, `${p.positiveMatchSharePct}%`, `${p.reliabilityPct}%`, primaryRankOf(key, p.playerId) ?? missing]
  : [p.rank, p.player, n1(p.index), n2(p.pressureEconomy), n2(p.usualEconomy), p.pressureBalls, p.pressureMatches, `${p.positiveMatchSharePct}%`, `${p.reliabilityPct}%`, primaryRankOf(key, p.playerId) ?? missing]));

function poolTableRows() {
  const bowlers = new Map(sensitivity.poolSizes.bowlers.map((pool) => [pool.pool, pool]));
  return sensitivity.poolSizes.batters.map((pool) => {
    const bowl = bowlers.get(pool.pool);
    return [pool.pool, pool.eligiblePlayers, pool.medianPressureBallsPerPlayer, pool.thin ? 'thin (10 or fewer)' : 'no', bowl.eligiblePlayers, bowl.medianPressureBallsPerPlayer];
  });
}

function fragilityRows(key) {
  return sensitivity.rankStability[key].map((s) => [
    s.rank, s.player, n1(s.index), s.poolExposure.smallestPoolSize,
    `${s.leaveOneOut.worstRank}${s.leaveOneOut.timesOutOfTop10 ? ` (out in ${s.leaveOneOut.timesOutOfTop10} of ${s.leaveOneOut.runs})` : ''}`,
    pct(s.bootstrap.shareInTop10), pct(s.poolDeletion.shareInTop10), `${s.fragility} / ${s.poolCompositionFragility}`,
  ]);
}
const FRAGILITY_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Index', 'r'], ['Smallest pool (players)', 'r'], ['Worst rank, one other player removed', 'r'], ['In top 10, bootstrap', 'r'], ['In top 10, pool deletion', 'r'], ['Class: bootstrap / pool deletion', 'r']];

function robustRows(key) {
  const core = sensitivity.robustCore[key];
  const everyone = [...core.core, ...core.primaryTop10NotInCore, ...core.otherNamesInSomeScenario];
  const order = ['exclusionsOn_otherPenalty', 'exclusionsOn_otherNoPenalty', 'exclusionsOff_otherPenalty', 'exclusionsOff_otherNoPenalty'];
  const best = (entry) => Math.min(...order.map((scenario) => entry.ranks[scenario] ?? 99));
  return everyone
    .sort((a, b) => b.scenariosInTop10 - a.scenariosInTop10 || (a.ranks.exclusionsOn_otherPenalty ?? 99) - (b.ranks.exclusionsOn_otherPenalty ?? 99) || best(a) - best(b) || a.player.localeCompare(b.player))
    .map((entry) => [entry.player, ...order.map((scenario) => entry.ranks[scenario] ?? '-'), `${entry.scenariosInTop10} of 4`, entry.scenariosInTop10 === 4 ? 'core' : '']);
}
const ROBUST_COLUMNS = [['Player', 'l'], ['Submitted list (exclusions on)', 'r'], ['Exclusions on, no penalty run', 'r'], ['Alternative: no exclusions', 'r'], ['No exclusions, no penalty run', 'r'], ['Top 10 in', 'r'], ['Robust core', 'r']];

// ---------- evidence tables: the `other` extras decision (other_evidence_data.json, IPL matches only) ----------
// Primary (submitted) = `other` is an illegal ball with a +1 penalty run (a); each format-season pool is standardised against its own players.
// Everything else in these tables is an alternative that was tested and not adopted.
const otherEvidence = JSON.parse(await readFile(resolve(root, 'other_evidence_data.json'), 'utf8'));

function otherTestRows() {
  const e = otherEvidence.iplMatches;
  const hit = e.T1_freeHit.byTypeOfPreviousBall;
  const flt = (value) => Number(value).toExponential(1);
  const base = e.T1_freeHit;
  const ownRow = e.T2_ownRowDismissals;
  const over = e.T3_overLength;
  const per = over.legalBallsPerOver_ifOtherIsLegal_notLastOvers;
  const inn = e.T3b_inningsBallCount;
  const exact = e.T4a_T4b_marginReconstruction;
  const counts = exact.counts;
  const otherRows = ownRow.other;
  const same = (value) => [value, value];
  return [
    ['T1 Free hit', `Non-run-out wicket on the ball after the row (${(base.baseRate * 100).toFixed(2)}% after a normal ball)`, ...same(`${hit.other.nonRunOutWicketOnNextBall} of ${hit.other.n}`), `about ${hit.other.expectedAtNoneRate} expected (P = ${flt(hit.other.exactBinomialProbabilityOfThisFewOrFewer)})`],
    ['T1 control', `Same count after an Overstep (no-ball) row`, ...same(`${hit.Overstep.nonRunOutWicketOnNextBall} of ${hit.Overstep.n}`), `about ${hit.Overstep.expectedAtNoneRate} expected (P = ${flt(hit.Overstep.exactBinomialProbabilityOfThisFewOrFewer)})`],
    ['T2 Wickets on the row', 'Dismissals on other rows that are run-outs', ...same(`${otherRows.dismissalTypes.RunOut ?? 0} of ${otherRows.wicketRows}`), `P = ${ownRow.probabilityAllOtherWicketsAreRunOutsIfNormal} if dismissals were as on normal balls`],
    ['T3 Over length', `Overs with an other row that are not the last over of an innings (${over.oversWithAnOtherRow_excludingLastOverOfInnings}): exactly six legal balls`, ...same(`${over.interpretationAB_otherIsIllegal.oversWithExactlySixLegalBalls} of ${over.oversWithAnOtherRow_excludingLastOverOfInnings}`), `${over.interpretationC_otherIsLegal.oversWithExactlySixLegalBalls} of ${over.oversWithAnOtherRow_excludingLastOverOfInnings} (${Object.entries(per).map(([legal, count]) => `${count} ${count === 1 ? 'has' : 'have'} ${legal}`).join(', ')})`],
    ['T3 Innings length', `Innings that must have used all 20 overs and contain an other row (${inn.withOtherRow.innings}): exactly 120 legal balls`, ...same(`${inn.withOtherRow.legal120_AB} of ${inn.withOtherRow.innings}`), `${inn.withOtherRow.legal120_C} of ${inn.withOtherRow.innings}`],
    ['T4 Run margin (exact)', `Winning margin equals innings 1 minus innings 2 (${counts.runWonMatches} usable matches, ${counts.runWonMatchesWithOther} with an other row)`, `${exact.exactMargin.a.all} of ${counts.runWonMatches}`, `${exact.exactMargin.b.all} of ${counts.runWonMatches}`, `${exact.exactMargin.c.all} of ${counts.runWonMatches}`],
    ['T4 Chase end (exact)', `Wicket-won chases (${counts.chaseWonMatches}) whose last ball is consistent with the target (${counts.chaseWonMatchesWithOther} with an other row)`, `${exact.wicketChaseEndConsistency.a.ok} of ${counts.chaseWonMatches}`, `${exact.wicketChaseEndConsistency.b.ok} of ${counts.chaseWonMatches}`, `${exact.wicketChaseEndConsistency.c.ok} of ${counts.chaseWonMatches}`],
  ];
}
const OTHER_TEST_COLUMNS = [['Test', 'l'], ['What is counted', 'l'], ['a: illegal ball, +1 run (submitted)', 'r'], ['b: illegal ball, no run (alternative)', 'r'], ['c: legal ball (rejected)', 'r']];

function otherRegressionRows() {
  const fit = (label, scope, key, ruleKey) => {
    const t = otherEvidence[scope].T4c_regression;
    const other = t[key].coefficients.other;
    const control = t[key].coefficients.Overstep;
    const ci = (c) => `${c.robustHC1CI95[0].toFixed(2)} to ${c.robustHC1CI95[1].toFixed(2)}`;
    return [label, `${t[key].n} (${t[key].ofWhichWithAnOtherRow})`, other.estimate.toFixed(2), ci(other), control.estimate.toFixed(2), ci(control), t[ruleKey].verdict === 'a' ? 'a' : t[ruleKey].verdict];
  };
  return [
    fit('IPL matches, main fit', 'iplMatches', 'main', 'ruleOnMain'),
    fit('Without the extras_2_runs regressor', 'iplMatches', 'withoutExtras2Regressor', 'ruleWithoutExtras2'),
    fit('Five largest residuals dropped', 'iplMatches', 'dropFiveLargestResiduals', 'ruleDropFive'),
  ];
}
const OTHER_REGRESSION_COLUMNS = [['Fit', 'l'], ['Matches (with an other row)', 'r'], ['other coefficient', 'r'], ['other 95% CI (HC1)', 'r'], ['Overstep control', 'r'], ['Overstep 95% CI (HC1)', 'r'], ['Rule picks', 'r']];

// ---------- IPL report tables built from scoring.mjs output and analysis_data.json (no hand-typed numbers) ----------
const thousands = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const TOP_BATTER_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Pressure index', 'r'], ['Pressure SR', 'r'], ['Usual SR', 'r'], ['Pressure balls', 'r'], ['Pressure matches', 'r'], ['Positive-match share', 'r'], ['Sample reliability', 'r']];
const TOP_BOWLER_COLUMNS = [['Rank', 'l'], ['Player', 'l'], ['Pressure index', 'r'], ['Pressure econ/6', 'r'], ['Usual econ/6', 'r'], ['Pressure balls', 'r'], ['Pressure matches', 'r'], ['Positive-match share', 'r'], ['Sample reliability', 'r']];
const topRows = (kind, list) => list.map((p) => (kind === 'batter'
  ? [p.rank, p.player, n1(p.score), n1(p.pressureRate), n1(p.usualRate), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`]
  : [p.rank, p.player, n1(p.score), n2(p.pressureEconomy), n2(p.usualEconomy), p.pressureBalls, p.pressureMatches, `${p.consistency}%`, `${p.reliability}%`]));

function leagueTotalsRows() {
  const g = leagueTotals()[0][1];
  return [
    ['Batting strike rate (runs per 100 balls faced)', n1(g.battingSR.pressure), n1(g.battingSR.usual)],
    ['Batting dismissals (outs per 100 balls faced)', n2(g.battingOuts.pressure), n2(g.battingOuts.usual)],
    ['Bowling economy (runs per 6 legal balls)', n2(g.bowlingEconomy.pressure), n2(g.bowlingEconomy.usual)],
    ['Bowling wickets (per 100 legal balls)', n2(g.bowlingWickets.pressure), n2(g.bowlingWickets.usual)],
    ['Balls faced in player-match records', thousands(g.ballsFaced.pressure), thousands(g.ballsFaced.usual)],
    ['Balls bowled in player-match records', thousands(g.ballsBowled.pressure), thousands(g.ballsBowled.usual)],
  ];
}

function scopeRows() {
  const deliveries = iplQuality.pressureDeliveries + iplQuality.ordinaryDeliveries;
  const seasons = iplRecords.map((r) => Number(r.season));
  return [
    ['Competition and seasons', `IPL, ${Math.min(...seasons)} to ${Math.max(...seasons)}`],
    ['IPL matches scored', thousands(iplQuality.matches)],
    ['IPL deliveries scored (innings 1 and 2)', thousands(deliveries)],
    ['Pressure deliveries', `${thousands(iplQuality.pressureDeliveries)} (${n1((iplQuality.pressureDeliveries * 100) / deliveries)}%)`],
    ['Ordinary deliveries', `${thousands(iplQuality.ordinaryDeliveries)} (${n1((iplQuality.ordinaryDeliveries * 100) / deliveries)}%)`],
    ['IPL player-match records', thousands(iplRecords.length)],
    ['Eligible batters (60 pressure balls, 8 pressure matches, exclusions on)', rated.batters.length],
    ['Eligible bowlers (60 pressure balls, 8 pressure matches, exclusions on)', rated.bowlers.length],
  ];
}

function thresholdRows() {
  const settings = [['60 balls / 8 matches (submitted)', rated], ['36 balls / 5 matches', thresholds[0]], ['90 balls / 10 matches', thresholds[1]]];
  const topNames = (list) => list.slice(0, 3).map((p) => `${p.rank} ${p.player} ${n1(p.score)}`).join('; ');
  const shared = (list, base) => {
    const baseIds = new Set(base.slice(0, 10).map((p) => String(p.playerId)));
    return list.slice(0, 10).filter((p) => baseIds.has(String(p.playerId))).length;
  };
  return settings.map(([label, result]) => [label, result.batters.length, result.bowlers.length, topNames(result.batters), topNames(result.bowlers), shared(result.batters, rated.batters), shared(result.bowlers, rated.bowlers)]);
}
const THRESHOLD_COLUMNS = [['Setting (exclusions on)', 'l'], ['Eligible batters', 'r'], ['Eligible bowlers', 'r'], ['Top 3 batters (rank, name, index)', 'l'], ['Top 3 bowlers (rank, name, index)', 'l'], ['Top-10 batters shared with submitted', 'r'], ['Top-10 bowlers shared with submitted', 'r']];

// Rating example: why a high usual level can rank lower. Reliability is sqrt(b / (b + 60) * m / (m + 6)) as in scoring.mjs; the implied rating is
// back-solved from the rounded index, (index - 50) / (10 x reliability), so it is exact only to the rounding of the index.
const EXAMPLE_PAIRS = {
  batters: ['Cooper Connolly', 'Suryakumar Yadav'],
};
function ratingExampleRows(kind, key) {
  return EXAMPLE_PAIRS[key].map((name) => {
    const p = primaryTop[key].find((entry) => entry.player === name);
    if (!p) throw new Error(`rating example: ${name} is not in the IPL top 10 ${key}`);
    const reliability = Math.sqrt((p.pressureBalls / (p.pressureBalls + 60)) * (p.pressureMatches / (p.pressureMatches + 6)));
    const rating = (p.score - 50) / (10 * reliability);
    const positive = Math.round((p.consistency * p.pressureMatches) / 100);
    const atStricter = thresholds[1][key].find((entry) => String(entry.playerId) === String(p.playerId))?.rank ?? 'not eligible';
    const level = kind === 'batter'
      ? [n1(p.usualRate), n1(p.pressureRate), n1(p.pressureRate - p.usualRate)]
      : [n2(p.usualEconomy), n2(p.pressureEconomy), n2(p.usualEconomy - p.pressureEconomy)];
    return [p.player, p.rank, n1(p.score), ...level, `${positive} of ${p.pressureMatches} (${p.consistency}%)`, p.pressureBalls, p.pressureMatches,
      reliability.toFixed(3), rating.toFixed(2), n1(50 + 10 * rating), atStricter];
  });
}
const exampleColumns = (usual, pressure, change) => [['Player', 'l'], ['Rank', 'r'], ['Index', 'r'], [usual, 'r'], [pressure, 'r'], [change, 'r'], ['Positive matches', 'r'], ['Pressure balls', 'r'], ['Pressure matches', 'r'], ['Reliability', 'r'], ['Implied rating', 'r'], ['Index before shrinkage', 'r'], ['Rank at 90 balls / 10 matches', 'r']];

const tables = [
  { name: 'top_batters', columns: TOP_BATTER_COLUMNS, rows: topRows('batter', primaryTop.batters), rankFirst: true },
  { name: 'top_bowlers', columns: TOP_BOWLER_COLUMNS, rows: topRows('bowler', primaryTop.bowlers), rankFirst: true },
  { name: 'league_totals', columns: [['Measure', 'l'], ['Pressure deliveries', 'r'], ['Ordinary deliveries', 'r']], rows: leagueTotalsRows(), plain: true },
  { name: 'scope', columns: [['Item', 'l'], ['Value', 'r']], rows: scopeRows(), plain: true },
  { name: 'thresholds', columns: THRESHOLD_COLUMNS, rows: thresholdRows(), text: true },
  { name: 'rating_example_batters', columns: exampleColumns('Usual SR', 'Pressure SR', 'Change (pressure SR minus usual SR)'), rows: ratingExampleRows('batter', 'batters'), plain: true },
  { name: 'other_tests', columns: OTHER_TEST_COLUMNS, rows: otherTestRows(), text: true },
  { name: 'other_regression', columns: OTHER_REGRESSION_COLUMNS, rows: otherRegressionRows(), plain: true },
  { name: 'noexcl_batters', columns: BATTER_COLUMNS, rows: fullRows('batter', sensitivity.noExclusionAlternative.batters.top10, 'batters', 'excluded'), rankFirst: true },
  { name: 'noexcl_bowlers', columns: BOWLER_COLUMNS, rows: fullRows('bowler', sensitivity.noExclusionAlternative.bowlers.top10, 'bowlers', 'excluded'), rankFirst: true },
  { name: 'other_batters', columns: BATTER_COLUMNS, rows: fullRows('batter', sensitivity.otherAlternative.exclusionsOn.batters.top10, 'batters'), rankFirst: true },
  { name: 'other_bowlers', columns: BOWLER_COLUMNS, rows: fullRows('bowler', sensitivity.otherAlternative.exclusionsOn.bowlers.top10, 'bowlers'), rankFirst: true },
  { name: 'robust_batters', columns: ROBUST_COLUMNS, rows: robustRows('batters'), plain: true },
  { name: 'robust_bowlers', columns: ROBUST_COLUMNS, rows: robustRows('bowlers'), plain: true },
  { name: 'pool_sizes', columns: [['Pool', 'l'], ['Eligible batters', 'r'], ['Median pressure balls per batter', 'r'], ['Batter pool thin', 'r'], ['Eligible bowlers', 'r'], ['Median pressure balls per bowler', 'r']], rows: poolTableRows(), plain: true },
  { name: 'fragility_batters', columns: FRAGILITY_COLUMNS, rows: fragilityRows('batters'), rankFirst: true },
  { name: 'fragility_bowlers', columns: FRAGILITY_COLUMNS, rows: fragilityRows('bowlers'), rankFirst: true },
];

const mdTable = (table) => {
  const head = `| ${table.columns.map(([label]) => label).join(' | ')} |`;
  const rule = `|${table.columns.map(([, align]) => (align === 'r' ? '---:' : '---')).join('|')}|`;
  const body = table.rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`);
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
