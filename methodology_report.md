# SupeRR Selector Season 2
## Round 1 methodology: pressure performance index

**Analysis window:** supplied IPL and T20I data, seasons 2022–2026. The 2026 season may be incomplete.

## Executive result

This analysis defines pressure from the live innings state before a delivery, then compares each player's pressured performance with their ordinary performance. Scores are standardized within format-season pools, include match-to-match consistency, and are shrunk toward the field midpoint when evidence is limited. The dashboard recalculates these lists from the same shared scoring module.

### Top 10 batters

| Rank | Player | Pressure index | Pressure SR | Usual SR | Pressure balls | Pressure matches | Positive-match share | Sample reliability |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Rishabh Pant | 59.3 | 194.9 | 123.5 | 217 | 17 | 82% | 76% |
| 2 | Fakhar Zaman | 59.3 | 183.6 | 134.1 | 116 | 8 | 100% | 61% |
| 3 | Sanju Samson | 57.8 | 188.5 | 136.5 | 113 | 8 | 75% | 61% |
| 4 | Ryan Burl | 57.1 | 174.2 | 101.8 | 120 | 9 | 67% | 63% |
| 5 | Suryakumar Yadav | 55.3 | 188.7 | 157.1 | 688 | 37 | 70% | 89% |
| 6 | Mark Chapman | 55.0 | 166.9 | 106.5 | 236 | 12 | 100% | 73% |
| 7 | David Miller | 54.4 | 161.5 | 104.5 | 226 | 14 | 71% | 74% |
| 8 | Mohammad Nabi | 54.1 | 158.7 | 111.8 | 126 | 9 | 89% | 64% |
| 9 | Sai Sudharsan | 53.8 | 183.5 | 147.6 | 249 | 17 | 71% | 77% |
| 10 | Nitish Reddy | 53.6 | 194.4 | 135.3 | 108 | 11 | 55% | 64% |

### Top 10 bowlers

| Rank | Player | Pressure index | Pressure econ/6 | Usual econ/6 | Pressure balls | Pressure matches | Positive-match share | Sample reliability |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Akash Madhwal | 61.9 | 7.16 | 10.52 | 93 | 8 | 63% | 59% |
| 2 | Umran Malik | 61.7 | 6.18 | 9.98 | 99 | 9 | 56% | 61% |
| 3 | Sunil Narine | 61.6 | 6.23 | 7.36 | 684 | 53 | 62% | 91% |
| 4 | Mohammad Nawaz | 61.3 | 5.39 | 7.40 | 186 | 15 | 73% | 73% |
| 5 | Abrar Ahmed | 60.8 | 5.17 | 7.81 | 232 | 18 | 67% | 77% |
| 6 | Sakib Hussain | 59.3 | 8.23 | 10.88 | 151 | 11 | 82% | 68% |
| 7 | Washington Sundar | 58.6 | 5.56 | 6.23 | 135 | 12 | 58% | 68% |
| 8 | Kuldeep Yadav | 58.2 | 7.21 | 8.33 | 634 | 51 | 51% | 90% |
| 9 | Mohit Sharma | 57.9 | 9.26 | 9.78 | 346 | 23 | 78% | 82% |
| 10 | Kagiso Rabada | 57.3 | 8.52 | 9.52 | 276 | 27 | 59% | 82% |

## Data and scope

The calculation joins `ball_by_ball.csv` to `matches.csv` and `competitions.csv`. IPL is identified by the competition name; T20I is identified by the competition format. Other competitions carrying a generic T20 label and records with unknown seasons are excluded. The in-scope data contains **819 matches** and **189,683 deliveries**: **79,974 pressure** and **109,709 ordinary**. The supplied ball-by-ball file has 200,999 raw rows; the difference is excluded competitions or out-of-scope records, not missing rows.

Deliveries are processed in file order. The current delivery is classified first; only then are its score, wicket, and legal-ball effects applied to the innings state. Revised-overs fields greater than 20 are interpreted as legal-ball counts (for example, 114 means 19 overs); smaller nonzero values are treated as overs. Revised targets are used when present; otherwise the innings limit is 20 overs and the second-innings target is one more than the first-innings total. Wides and no-balls do not count as legal balls, and wides do not count as balls faced. Batter runs come from `runs`.

The extras columns are inconsistent: `extras1_runs` is 6 on ordinary deliveries and takes categorical-looking values on tagged extras. It is not treated as a run amount. For innings-state reconstruction and bowler conceded runs, the analyzer adds the known one-run penalty for identified wides and no-balls; these are tagged `wide` and `Overstep` in this dataset. Byes and leg-byes are not charged to bowlers. Because reliable run amounts for these extras are not present in the supplied fields, their runs are omitted from reconstructed chase totals. This makes chase required-rate pressure an approximation.

## Pressure definition

A delivery is pressure if **any** of these pre-delivery conditions is true. Overlaps count once.

1. **Finish phase:** at most 30 legal balls remain in the scheduled or revised innings.
2. **Wicket squeeze:** at least five wickets have fallen, at least 48 legal balls have elapsed, and at most 72 legal balls remain.
3. **Chase squeeze:** in the second innings, after at least 18 legal balls, the required rate is at least 9.5 runs per over; or it is at least 7.5 and exceeds the current rate by at least 2.5 runs per over.

The finish phase captures high-leverage deliveries in either innings. The wicket squeeze adds batting-resource scarcity. The chase squeeze responds to both target difficulty and progress instead of labelling every chase as pressured. These are explicit proxies, not direct measurements of psychological pressure. A first-innings closeness proxy is not inferred from the final result.

## Performance and ranking

Players are analyzed by format and season. A player-format-season segment must have at least **60 pressure balls**, **8 matches containing pressure batting/bowling**, and **60 ordinary balls**. After format-season roll-up, 61 batter profiles and 134 bowler profiles qualify in the all-format/all-season view. The dashboard also offers 36-ball/5-match and 90-ball/10-match sensitivity settings.

For batters the inputs are pressure strike rate, strike-rate change from the player's ordinary baseline, improvement in outs per 100 balls, and positive-match share. For bowlers they are lower pressure economy rate, economy improvement from the player's ordinary baseline, pressure wickets per 100 legal balls, and positive-match share. Inputs are direction-aligned and standardized as z-scores against eligible players in the same format-season pool. The weighted blend is:

`0.35 × output level + 0.30 × change vs own baseline + 0.20 × outcome + 0.15 × positive-match share`

Segment scores are combined for a player using pressure-ball volume as the weight. Sample reliability is:

`sqrt((pressure balls / (pressure balls + 60)) × (pressure matches / (pressure matches + 6)))`

The displayed index is `clip(50 + 10 × weighted raw rating × reliability, 0, 100)`. The unshrunk field midpoint is 50. Reliability is a heuristic shrinkage factor, not a statistical confidence interval.

For positive-match share, a batter's pressure segment is compared with their pooled ordinary rates. A match counts positive when `(pressure SR − usual SR) − 2 × (pressure outs/ball − usual outs/ball) > 0`. A bowler's match counts positive when `(usual economy − pressure economy) + 1.5 × (pressure wickets/100 balls − usual wickets/100 balls) > 0`. The share is the fraction of that player's pressure-exposed matches passing the test.

Bowler wicket credit excludes run-outs, retired hurt/out, timed out, handled-the-ball, and obstructing-the-field dismissals. Labels are normalized for spaces and spelling variations, including `RunOut` and the source typo `Obstracting the field`. A non-striker run-out is charged to that batter's dismissal rate but not given a faced ball.

## Evidence and interpretation

Rishabh Pant and Fakhar Zaman are effectively tied at a displayed 59.3; Pant ranks first on the unrounded index. Pant recorded 217 pressure balls in 17 matches, with a 194.9 pressure strike rate versus 123.5 ordinarily and a positive result in 82% of pressure matches. Fakhar's 183.6 versus 134.1 comes from 116 balls in eight matches, with a positive result in all eight. Their different sample sizes appear in reliability (76% and 61%). Suryakumar Yadav has the largest pressure sample in the batter top ten: 688 balls and 89% reliability.

Akash Madhwal leads the bowling index at 61.9, with a 7.16 pressure economy against 10.52 ordinarily over 93 balls in eight matches. Umran Malik follows closely with 6.18 against 9.98 over 99 balls in nine matches. Sunil Narine offers the strongest repeat-volume evidence in the top ten (684 pressure balls, 91% reliability), while his overall rating is lower than the two leaders. The index therefore distinguishes rate performance from sample certainty.

## Reliability and limitations

- Sample filters and shrinkage reduce, but do not eliminate, small-sample and selection effects. The displayed reliability is not a confidence interval.
- Format-season standardization helps separate scoring environments, but IPL and T20I roles and opposition quality are not fully interchangeable. Only strata meeting eligibility contribute to a player's roll-up.
- The pressure rules can miss rivalry, knockout stakes, crowd conditions, or a close first-innings contest. Rankings are not causal estimates of a psychological trait.
- Run-outs are not credited as bowler wickets. Batter runs use `runs`; boundary flags disagree with that value on 23 deliveries, so flags are not used. Missing bye/leg-bye run amounts make chase totals approximate.
- Revised targets/overs are used when present, but supplied fields do not support full Duckworth-Lewis par scores or ball-level win probability.
- Scores are rounded for display, so adjacent players can be very close. Exact ties use unrounded index, pressure balls, then player name.

## Reproduction

From the data folder, run `node analyze.mjs` to regenerate `analysis_data.json`. The dashboard and ranked lists use `scoring.mjs`. Run `node server.mjs` and open `http://127.0.0.1:4173`. Filters recalculate rankings; **Export rankings** downloads both top tens as CSV.