import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const root = process.cwd();

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value);
  return cells;
}

async function readCsvMap(file, key) {
  const text = await readFile(resolve(root, file), 'utf8');
  const lines = text.trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const result = new Map();
  for (const line of lines) {
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    result.set(row[key], row);
  }
  return result;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function seasonYear(season) {
  const match = /^\s*(\d{4})/.exec(String(season ?? ''));
  return match ? Number(match[1]) : 0;
}

function truthy(value) {
  return value === 'true' || value === '1';
}

// Extra deliveries that are re-bowled: not a legal ball, and one penalty run is charged to the bowler.
// 'other' (extras1_runs code 5) is a no-ball variant: batters score off it, and counting it as legal
// puts 7 or more legal balls in 244 overs.
const ILLEGAL_EXTRA_TYPES = ['wide', 'overstep', 'noballs', 'no-ball', 'other'];

function isLegalBall(extraType) {
  return !ILLEGAL_EXTRA_TYPES.includes(extraType);
}

function bowlerPenalty(extraType) {
  return ILLEGAL_EXTRA_TYPES.includes(extraType) ? 1 : 0;
}

function getCompetitionFormat(competition) {
  const name = competition?.comp_name ?? '';
  if (/indian premier league|\bipl\b/i.test(name)) return 'IPL';
  if (competition?.match_format === 'T20I') return 'T20I';
  return 'OTHER';
}

function matchOvers(match, innings) {
  const revised = number(innings === 1 ? match.first_inn_revised_overs : match.second_inn_revised_overs);
  if (revised <= 0) return 20;
  return revised > 20 ? revised / 6 : revised;
}

function createSideStats() {
  return { balls: 0, runs: 0, outs: 0, conceded: 0, wickets: 0, pressureBalls: 0 };
}

function createRecord(playerId, playerName, kind, match, competition) {
  return {
    playerId,
    playerName,
    kind,
    matchId: match.match_id,
    date: match.match_date,
    season: seasonYear(competition.season),
    format: getCompetitionFormat(competition),
    competition: competition.comp_name,
    opposition: '',
    pressure: createSideStats(),
    usual: createSideStats(),
  };
}

function creditedWicket(row) {
  const dismissal = (row.dismissal_type ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
  return truthy(row.is_wicket) && ![
    'runout', 'retiredhurt', 'retiredout', 'retireout', 'obstructingthefield', 'obstractingthefield', 'timedout', 'handledtheball',
  ].includes(dismissal);
}

function addBattingDelivery(record, pressure, row) {
  const side = pressure ? record.pressure : record.usual;
  const faced = row.extras_type !== 'wide';
  if (faced) side.balls += 1;
  side.runs += number(row.runs);
  if (truthy(row.is_wicket) && String(row.dismissed_player_id) === String(row.striker_id)) side.outs += 1;
  if (pressure && faced) side.pressureBalls += 1;
}

function addBowlingDelivery(record, pressure, row, legal) {
  const side = pressure ? record.pressure : record.usual;
  if (legal) side.balls += 1;
  const extraType = (row.extras_type ?? '').toLowerCase();
  side.conceded += number(row.runs) + bowlerPenalty(extraType);
  if (creditedWicket(row)) side.wickets += 1;
  if (pressure && legal) side.pressureBalls += 1;
}

function appendMatchRecord(records, recordMap, record) {
  const key = `${record.kind}:${record.playerId}:${record.matchId}`;
  if (!recordMap.has(key)) {
    recordMap.set(key, record);
    records.push(record);
  }
  return recordMap.get(key);
}

const competitions = await readCsvMap('competitions.csv', 'comp_id');
const matches = await readCsvMap('matches.csv', 'match_id');
const records = [];
const recordMap = new Map();
const dataQuality = {
  ballRows: 0,
  matches: new Set(),
  pressureDeliveries: 0,
  ordinaryDeliveries: 0,
  fourFlagMismatches: 0,
  sixFlagMismatches: 0,
  missingMatchMetadata: 0,
};

let headers;
let currentMatchId = null;
let currentInnings = null;
let inningsRows = [];
let firstInningsRuns = 0;

function processInnings() {
  if (!inningsRows.length) return;
  const first = inningsRows[0];
  const match = matches.get(first.match_id);
  const competition = competitions.get(match?.comp_id);
  if (!match || !competition) {
    dataQuality.missingMatchMetadata += inningsRows.length;
    inningsRows = [];
    return;
  }

  const format = getCompetitionFormat(competition);
  if (!['IPL', 'T20I'].includes(format) || seasonYear(competition.season) < 2022) {
    inningsRows = [];
    return;
  }
  // Super-over innings (3 and 4) are skipped: the 20-over clock, wicket squeeze and chase target
  // used below do not describe a 6-ball tiebreak, and they are only 26 in-scope deliveries.
  if (number(first.innings) > 2) {
    inningsRows = [];
    return;
  }
  dataQuality.matches.add(first.match_id);

  const innings = number(first.innings);
  const maxLegalBalls = Math.round(matchOvers(match, innings) * 6);
  const target = number(match.revised_target) || (innings === 2 ? firstInningsRuns + 1 : 0);
  let score = 0;
  let legalBalls = 0;
  let wickets = 0;

  for (const row of inningsRows) {
    const extraType = (row.extras_type ?? '').toLowerCase();
    const legal = isLegalBall(extraType);
    const ballsRemaining = Math.max(0, maxLegalBalls - legalBalls);
    const currentRate = legalBalls > 0 ? (score * 6) / legalBalls : 0;
    const requiredRate = innings === 2 && target > score && ballsRemaining > 0
      ? ((target - score) * 6) / ballsRemaining
      : 0;
    const inFinish = ballsRemaining > 0 && ballsRemaining <= 30;
    const wicketSqueeze = wickets >= 5 && legalBalls >= 48 && ballsRemaining <= 72;
    const chaseSqueeze = innings === 2 && legalBalls >= 18 && ballsRemaining > 0 && (
      requiredRate >= 9.5 || (requiredRate >= 7.5 && requiredRate - currentRate >= 2.5)
    );
    const pressure = inFinish || wicketSqueeze || chaseSqueeze;

    if (pressure) dataQuality.pressureDeliveries += 1;
    else dataQuality.ordinaryDeliveries += 1;

    const batterRuns = number(row.runs);
    if (batterRuns === 4 && !truthy(row.is_four)) dataQuality.fourFlagMismatches += 1;
    if (batterRuns === 6 && !truthy(row.is_six)) dataQuality.sixFlagMismatches += 1;

    const battingRecord = appendMatchRecord(records, recordMap, createRecord(
      row.striker_id, row.striker_name, 'batter', match, competition,
    ));
    const battingAtHome = String(row.batting_team_id) === String(match.home_team_id);
    battingRecord.team = battingAtHome ? match.home_team : match.away_team;
    battingRecord.opposition = battingAtHome ? match.away_team : match.home_team;
    addBattingDelivery(battingRecord, pressure, row);

    if (truthy(row.is_wicket) && row.dismissed_player_id && String(row.dismissed_player_id) !== String(row.striker_id)) {
      const dismissedName = String(row.dismissed_player_id) === String(row.non_striker_id)
        ? row.non_striker_name
        : row.striker_name;
      const dismissedRecord = appendMatchRecord(records, recordMap, createRecord(
        row.dismissed_player_id, dismissedName, 'batter', match, competition,
      ));
      const dismissedAtHome = String(row.batting_team_id) === String(match.home_team_id);
      dismissedRecord.team = dismissedAtHome ? match.home_team : match.away_team;
      dismissedRecord.opposition = dismissedAtHome ? match.away_team : match.home_team;
      const dismissedSide = pressure ? dismissedRecord.pressure : dismissedRecord.usual;
      dismissedSide.outs += 1;
    }

    const bowlingRecord = appendMatchRecord(records, recordMap, createRecord(
      row.bowler_id, row.bowler_name, 'bowler', match, competition,
    ));
    bowlingRecord.team = battingAtHome ? match.away_team : match.home_team;
    bowlingRecord.opposition = battingAtHome ? match.home_team : match.away_team;
    addBowlingDelivery(bowlingRecord, pressure, row, legal);

    score += batterRuns + bowlerPenalty(extraType);
    if (truthy(row.is_wicket)) wickets += 1;
    if (legal) legalBalls += 1;
  }

  if (innings === 1) firstInningsRuns = score;
  inningsRows = [];
}

const reader = createInterface({ input: createReadStream(resolve(root, 'ball_by_ball.csv'), 'utf8'), crlfDelay: Infinity });
for await (const line of reader) {
  if (!headers) {
    headers = parseCsvLine(line);
    continue;
  }
  if (!line) continue;
  const cells = parseCsvLine(line);
  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  dataQuality.ballRows += 1;
  if (row.match_id !== currentMatchId || row.innings !== currentInnings) {
    processInnings();
    if (row.match_id !== currentMatchId) firstInningsRuns = 0;
    currentMatchId = row.match_id;
    currentInnings = row.innings;
  }
  inningsRows.push(row);
}
processInnings();

const output = {
  generatedAt: new Date().toISOString(),
  source: 'Supplied ball_by_ball.csv, matches.csv, competitions.csv',
  pressureDefinition: {
    finish: 'Last 30 legal balls of the scheduled or revised innings.',
    wicketSqueeze: 'At least five wickets lost, after 8 overs, with no more than 12 overs remaining.',
    chaseSqueeze: 'Second innings after 3 overs: required rate >= 9.5, or >= 7.5 and at least 2.5 above the current rate.',
  },
  dataQuality: { ...dataQuality, matches: dataQuality.matches.size },
  records,
};

await writeFile(resolve(root, 'analysis_data.json'), `${JSON.stringify(output)}\n`);
console.log(`Wrote ${records.length.toLocaleString()} player-match records from ${dataQuality.ballRows.toLocaleString()} deliveries.`);
console.log(JSON.stringify(output.dataQuality, null, 2));