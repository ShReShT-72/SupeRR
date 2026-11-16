# SupeRR Selector Season 2
## Round 1 methodology: pressure performance index

**Analysis window:** supplied IPL and T20I data, seasons 2022–2026. The 2026 season may be incomplete.

## Executive result

This analysis defines pressure from the live innings state before a delivery, then compares each player's pressured performance with their ordinary performance. Scores are standardized within format-season pools, include match-to-match consistency, and are shrunk toward the field midpoint when evidence is limited. The dashboard recalculates these lists from the same shared scoring module.

**Exclusion policy.** The primary lists below exclude three groups of players before scoring: 53 players who appear for Pakistan in the supplied T20I data (Pakistan T20I team representation is the nationality proxy), five players with confirmed IPL playing retirements (Kieron Pollard, Dwayne Bravo, Ambati Rayudu, Dinesh Karthik, Ravichandran Ashwin), and Mohit Sharma. The cited IPL.com article says Mohit Sharma announced his retirement from all forms of cricket in December 2025 and is expected to become CSK's bowling coach for IPL 2027. The problem statement does not ask for any of these exclusions. The ranking with no exclusions is shown next to the primary lists in "Sensitivity and exclusions"; it replaces 2 of the ten batters and 3 of the ten bowlers.

### Top 10 batters

| Rank | Player | Pressure index | Pressure SR | Usual SR | Pressure balls | Pressure matches | Positive-match share | Sample reliability |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Rishabh Pant | 58.4 | 194.9 | 123.5 | 217 | 17 | 82% | 76% |
| 2 | Sanju Samson | 58.3 | 188.5 | 136.5 | 113 | 8 | 75% | 61% |
| 3 | Cooper Connolly | 58.2 | 194.2 | 142.5 | 120 | 8 | 100% | 62% |
| 4 | Ryan Burl | 56.5 | 174.2 | 101.8 | 120 | 9 | 67% | 63% |
| 5 | Mark Chapman | 56.3 | 167.8 | 109.7 | 311 | 20 | 85% | 80% |
| 6 | Suryakumar Yadav | 56.1 | 193.2 | 157.8 | 724 | 41 | 71% | 90% |
| 7 | Glenn Phillips | 54.8 | 170.0 | 126.5 | 237 | 17 | 76% | 77% |
| 8 | David Miller | 54.5 | 164.5 | 101.7 | 220 | 14 | 79% | 74% |
| 9 | Mohammad Nabi | 54.0 | 158.7 | 111.8 | 126 | 9 | 89% | 64% |
| 10 | Rinku Singh | 53.3 | 172.8 | 118.3 | 367 | 34 | 53% | 85% |

### Top 10 bowlers

| Rank | Player | Pressure index | Pressure econ/6 | Usual econ/6 | Pressure balls | Pressure matches | Positive-match share | Sample reliability |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Akash Madhwal | 61.8 | 7.35 | 10.50 | 93 | 8 | 63% | 59% |
| 2 | Sunil Narine | 61.3 | 6.28 | 7.33 | 684 | 53 | 60% | 91% |
| 3 | Umran Malik | 61.3 | 6.43 | 10.06 | 97 | 9 | 56% | 61% |
| 4 | Washington Sundar | 60.6 | 5.56 | 6.32 | 136 | 12 | 67% | 68% |
| 5 | Sakib Hussain | 58.9 | 8.36 | 10.82 | 150 | 11 | 82% | 68% |
| 6 | Kuldeep Yadav | 58.3 | 7.21 | 8.33 | 634 | 51 | 51% | 90% |
| 7 | Mohammad Saifuddin | 57.8 | 6.85 | 8.44 | 71 | 8 | 88% | 56% |
| 8 | Adam Zampa | 57.7 | 7.85 | 8.89 | 418 | 30 | 67% | 85% |
| 9 | Rasikh Salam | 56.3 | 9.20 | 9.75 | 137 | 11 | 73% | 67% |
| 10 | Benjamin Lister | 56.3 | 8.23 | 9.07 | 78 | 9 | 78% | 58% |

### Top 10 all-rounders

Players must independently meet the selected eligibility threshold as both a batter and a bowler. The composite index is the equal-weight mean of their two final indexes, each of which already includes its own sample-reliability adjustment.

| Rank | Player | Composite index | Batting index | Bowling index | Batting pressure balls | Bowling pressure balls | Batting matches | Bowling matches |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Washington Sundar | 54.0 | 47.4 | 60.6 | 141 | 136 | 14 | 12 |
| 2 | Sikandar Raza | 52.5 | 50.5 | 54.5 | 119 | 96 | 12 | 9 |
| 3 | Ravindra Jadeja | 51.5 | 52.6 | 50.4 | 255 | 369 | 18 | 28 |
| 4 | Moeen Ali | 50.4 | 50.6 | 50.2 | 164 | 102 | 13 | 8 |
| 5 | Nitish Reddy | 49.9 | 53.0 | 46.8 | 108 | 173 | 11 | 18 |
| 6 | Cameron Green | 49.0 | 51.0 | 47.0 | 163 | 160 | 12 | 19 |
| 7 | Axar Patel | 48.4 | 42.8 | 54.0 | 197 | 681 | 19 | 55 |
| 8 | Sam Curran | 48.0 | 50.5 | 45.5 | 200 | 453 | 18 | 44 |
| 9 | Shivam Dube | 47.5 | 48.6 | 46.3 | 684 | 151 | 59 | 16 |
| 10 | Roston Chase | 46.1 | 40.2 | 52.0 | 186 | 62 | 19 | 8 |

## Data and scope

The calculation joins `ball_by_ball.csv` to `matches.csv` and `competitions.csv`. IPL is identified by the competition name; T20I is identified by the competition format. Other competitions carrying a generic T20 label and records with no readable season are excluded. A season label is read as its leading four-digit year, so a competition labelled `2022/23` belongs to season 2022. Super-over innings (innings 3 and 4) are skipped. The in-scope data contains **837 matches** and **193,988 deliveries**: **81,806 pressure** (42.2%) and **112,182 ordinary**. The supplied ball-by-ball file has 200,999 raw rows; the difference is excluded competitions, skipped super-over innings, or out-of-scope records, not missing rows.

Deliveries are processed in file order. The current delivery is classified first; only then are its score, wicket, and legal-ball effects applied to the innings state. Revised-overs fields greater than 20 are interpreted as legal-ball counts (for example, 114 means 19 overs); smaller nonzero values are treated as overs. Revised targets are used when present; otherwise the innings limit is 20 overs and the second-innings target is one more than the first-innings total. Wides, no-balls and the `other` extras type do not count as legal balls, and wides do not count as balls faced. Batter runs come from `runs`.

The extras columns are inconsistent: `extras1_runs` is 6 on ordinary deliveries and takes categorical-looking values on tagged extras. It is not treated as a run amount. For innings-state reconstruction and bowler conceded runs, the analyzer adds the known one-run penalty for identified wides and no-balls; these are tagged `wide`, `Overstep` and `other` in this dataset. The `other` type (264 rows) is not documented. It is treated as a no-ball because `extras1_runs` has the same code (5) on every one of its rows, batters score off it, and counting it as a legal ball would put seven or more legal balls in 244 overs. Byes and leg-byes are not charged to bowlers. Because reliable run amounts for these extras are not present in the supplied fields, their runs are omitted from reconstructed chase totals. This makes chase required-rate pressure an approximation.

## Pressure definition

A delivery is pressure if **any** of these pre-delivery conditions is true. Overlaps count once.

1. **Finish phase:** at most 30 legal balls remain in the scheduled or revised innings.
2. **Wicket squeeze:** at least five wickets have fallen, at least 48 legal balls have elapsed, and at most 72 legal balls remain.
3. **Chase squeeze:** in the second innings, after at least 18 legal balls, the required rate is at least 9.5 runs per over; or it is at least 7.5 and exceeds the current rate by at least 2.5 runs per over.

The finish phase captures high-leverage deliveries in either innings. The wicket squeeze adds batting-resource scarcity. The chase squeeze responds to both target difficulty and progress instead of labelling every chase as pressured. These are explicit proxies, not direct measurements of psychological pressure. A first-innings closeness proxy is not inferred from the final result.

## Performance and ranking

Players who represented Pakistan in T20Is in the supplied data are excluded from the primary lists. The source has no dedicated nationality field, so Pakistan T20I team representation is used as the nationality proxy; 53 player IDs are excluded. Five players with confirmed IPL playing retirements are also excluded: Kieron Pollard, Dwayne Bravo, Ambati Rayudu, Dinesh Karthik, and Ravichandran Ashwin. Mohit Sharma is separately excluded: the cited IPL.com article reports that he announced his retirement from all forms of cricket in December 2025 and is expected to become CSK's bowling coach for IPL 2027. International-only retirements and unconfirmed rumors are not used. The problem statement does not require any of these exclusions, so the lists without them are reported under "Sensitivity and exclusions". These exclusions are applied before scoring and format-season standardization. Players are analyzed by format and season. A player-format-season segment must have at least **60 pressure balls**, **8 matches containing pressure batting/bowling**, and **60 ordinary balls**. After format-season roll-up, 60 batter profiles and 122 bowler profiles qualify; 11 players qualify in both disciplines for the all-rounder list. The dashboard also offers 36-ball/5-match and 90-ball/10-match sensitivity settings; their results are in "Sensitivity and exclusions".

Mohit Sharma's retirement and expected CSK coaching role: [IPL.com](https://www.ipl.com/cricket/news/mohit-sharma-to-join-csk-as-bowling-coach-for-ipl-2027-replaces-eric-simons/).

IPL retirement sources: [Mumbai Indians on Kieron Pollard](https://www.mumbaiindians.com/news/kieron-pollard-announces-retirement-from-playing-ipl-appointed-as-batting-coach-for-mumbai-indians); [ESPNcricinfo on Dwayne Bravo](https://www.espncricinfo.com/story/ipl-2023-csk-news-dwayne-bravo-retires-from-ipl-takes-over-as-chennai-super-kings-bowling-coach-1348125); [Cricbuzz on Ambati Rayudu](https://www.cricbuzz.com/cricket-news/126676/ambati-rayudu-to-retire-from-ipl-after-the-final); [ESPNcricinfo on Dinesh Karthik's last IPL season](https://www.espncricinfo.com/story/dinesh-karthik-retires-from-all-representative-cricket-1434318); [News18 on Ravichandran Ashwin](https://www.news18.com/cricket/ravichandran-ashwin-announces-retirement-from-ipl-9530890.html).

For batters the inputs are pressure strike rate, strike-rate change from the player's ordinary baseline, improvement in outs per 100 balls, and positive-match share. For bowlers they are lower pressure economy rate, economy improvement from the player's ordinary baseline, pressure wickets per 100 legal balls, and positive-match share. Inputs are direction-aligned and standardized as z-scores against eligible players in the same format-season pool. The weighted blend is:

`0.35 × output level + 0.30 × change vs own baseline + 0.20 × outcome + 0.15 × positive-match share`

Segment scores are combined for a player using pressure-ball volume as the weight. Sample reliability is:

`sqrt((pressure balls / (pressure balls + 60)) × (pressure matches / (pressure matches + 6)))`

The displayed index is `clip(50 + 10 × weighted raw rating × reliability, 0, 100)`. The unshrunk field midpoint is 50. Reliability is a heuristic shrinkage factor, not a statistical confidence interval.

All-rounders must qualify for both the batter and bowler lists under the same format, season, and sample filters. Their composite index is `0.50 × batting index + 0.50 × bowling index`. Since each component index is already reliability-adjusted, this averages the two final discipline indexes without giving either discipline extra weight. The dashboard displays both component indexes and sample sizes alongside the composite. This is a data-based dual-discipline ranking, not an official player-role classification.

For positive-match share, a batter's pressure segment is compared with their pooled ordinary rates. A match counts positive when `(pressure SR − usual SR) − 2 × (pressure outs/ball − usual outs/ball) > 0`. A bowler's match counts positive when `(usual economy − pressure economy) + 1.5 × (pressure wickets/100 balls − usual wickets/100 balls) > 0`. The share is the fraction of that player's pressure-exposed matches passing the test.

Bowler wicket credit excludes run-outs, retired hurt/out (including the source spelling `Retire Out`), timed out, handled-the-ball, and obstructing-the-field dismissals. Labels are normalized for spaces and spelling variations, including `RunOut` and the source typo `Obstracting the field`. A non-striker run-out is charged to that batter's dismissal rate but not given a faced ball.

## Evidence and interpretation

Rishabh Pant leads the batter list at 58.4, with 217 pressure balls in 17 matches, a 194.9 pressure strike rate versus 123.5 ordinarily, and a positive result in 82% of pressure matches. Sanju Samson and Cooper Connolly are within 0.2 index points of him. Suryakumar Yadav has the largest pressure sample in the batter top ten: 724 balls and 90% reliability.

Akash Madhwal leads the bowling index at 61.8, with a 7.35 pressure economy against 10.50 ordinarily over 93 balls in eight matches. Sunil Narine and Umran Malik follow at 61.3 each, and Narine ranks higher on pressure balls. Umran Malik's 6.43 pressure economy against 10.06 ordinarily comes from 97 balls in nine matches. Narine offers the strongest repeat-volume evidence in the top ten (684 pressure balls, 91% reliability), while his rating is 0.5 points below Madhwal's. The index therefore distinguishes rate performance from sample certainty.

### League-wide: pressure versus ordinary deliveries

The table sums every in-scope player-match record, including players who are excluded from the rankings or below the eligibility thresholds. Batting counts balls faced (wides excluded). Bowling counts legal balls. Economy is runs per six balls.

| Measure | All, pressure | All, ordinary | IPL, pressure | IPL, ordinary | T20I, pressure | T20I, ordinary |
|---|---:|---:|---:|---:|---:|---:|
| Batting strike rate | 148.1 | 134.2 | 156.7 | 139.5 | 140.6 | 129.9 |
| Batting outs per 100 balls | 7.06 | 4.58 | 6.61 | 4.30 | 7.45 | 4.80 |
| Bowling economy (runs per 6 balls) | 9.26 | 8.31 | 9.80 | 8.64 | 8.79 | 8.04 |
| Bowling wickets per 100 balls | 6.56 | 4.45 | 6.13 | 4.18 | 6.94 | 4.65 |
| Balls faced (batting records) | 78,112 | 108,404 | 36,115 | 48,006 | 41,997 | 60,398 |
| Balls bowled (bowling records) | 77,653 | 108,039 | 35,907 | 47,835 | 41,746 | 60,204 |

Across the in-scope data, batters score 148.1 runs per 100 balls under pressure against 134.2 otherwise, and are dismissed 7.06 times per 100 balls against 4.58. Bowlers concede 9.26 runs per over under pressure against 8.31, and take 6.56 wickets per 100 balls against 4.45. The direction is the same in IPL and T20I. These are raw league aggregates, not matched by player, opposition, or innings stage. The finish phase is part of the pressure definition, so faster scoring and more wickets late in an innings are expected. The table shows that the pressure rules select deliveries with different outcomes; it does not by itself validate the player index.

## Sensitivity and exclusions

The lists depend on two choices that the problem statement leaves open: the sample thresholds and the player exclusions. This section shows how much each one changes the result.

### Primary lists versus no exclusions

Default thresholds (60 pressure balls, 8 matches), after the pipeline fixes. The primary list excludes the players described in "Performance and ranking". The unfiltered list uses the same method with no player excluded. Eligible profiles (batters / bowlers / all-rounders) are 60 / 122 / 11 with exclusions and 66 / 136 / 12 without.

| Rank | Primary batters (exclusions on) | Index | Unfiltered batters (no exclusions) | Index |
|---:|---|---:|---|---:|
| 1 | Rishabh Pant | 58.4 | Rishabh Pant | 58.4 |
| 2 | Sanju Samson | 58.3 | Sanju Samson | 58.3 |
| 3 | Cooper Connolly | 58.2 | Cooper Connolly | 58.2 |
| 4 | Ryan Burl | 56.5 | Fakhar Zaman | 57.7 |
| 5 | Mark Chapman | 56.3 | Ryan Burl | 57.0 |
| 6 | Suryakumar Yadav | 56.1 | Suryakumar Yadav | 56.4 |
| 7 | Glenn Phillips | 54.8 | Mark Chapman | 56.0 |
| 8 | David Miller | 54.5 | Glenn Phillips | 54.5 |
| 9 | Mohammad Nabi | 54.0 | David Miller | 54.4 |
| 10 | Rinku Singh | 53.3 | Namboori Tilak Varma | 53.1 |

| Rank | Primary bowlers (exclusions on) | Index | Unfiltered bowlers (no exclusions) | Index |
|---:|---|---:|---|---:|
| 1 | Akash Madhwal | 61.8 | Umran Malik | 61.4 |
| 2 | Sunil Narine | 61.3 | Sunil Narine | 61.3 |
| 3 | Umran Malik | 61.3 | Mohammad Nawaz | 61.2 |
| 4 | Washington Sundar | 60.6 | Akash Madhwal | 60.9 |
| 5 | Sakib Hussain | 58.9 | Abrar Ahmed | 60.6 |
| 6 | Kuldeep Yadav | 58.3 | Washington Sundar | 59.7 |
| 7 | Mohammad Saifuddin | 57.8 | Sakib Hussain | 58.9 |
| 8 | Adam Zampa | 57.7 | Kuldeep Yadav | 58.2 |
| 9 | Rasikh Salam | 56.3 | Mohit Sharma | 58.0 |
| 10 | Benjamin Lister | 56.3 | Mohammad Saifuddin | 57.1 |

Without exclusions, Fakhar Zaman and Namboori Tilak Varma enter the batter top ten in place of Mohammad Nabi and Rinku Singh. In the bowler top ten, Mohammad Nawaz, Abrar Ahmed and Mohit Sharma enter in place of Adam Zampa, Rasikh Salam and Benjamin Lister.

### Thresholds, exclusions, and the pipeline fixes

Each row applies the same scoring to the analysis data before the pipeline fixes (819 matches: season labels such as `2022/23` were dropped, `other` extras counted as legal balls, `Retire Out` credited to bowlers) and after them (this report, 837 matches). The last column counts how many of a row's top ten names also appear in the 60/8 top ten of the same data version and exclusion setting.

| Setting | Exclusions | Data | Eligible bat / bowl / AR | Top 3 batters (index) | Top 3 bowlers (index) | Top-10 names shared with default list, bat / bowl |
|---|---|---|---:|---|---|---:|
| 60 balls / 8 matches (default) | On | Before fixes | 57 / 122 / 11 | Rishabh Pant 59.3; Sanju Samson 57.8; Ryan Burl 56.5 | Akash Madhwal 62.8; Sunil Narine 61.7; Umran Malik 61.6 | 10 / 10 |
| 60 balls / 8 matches (default) | On | After fixes | 60 / 122 / 11 | Rishabh Pant 58.4; Sanju Samson 58.3; Cooper Connolly 58.2 | Akash Madhwal 61.8; Sunil Narine 61.3; Umran Malik 61.3 | 10 / 10 |
| 60 balls / 8 matches (default) | Off | Before fixes | 61 / 134 / 12 | Rishabh Pant 59.3; Fakhar Zaman 59.3; Sanju Samson 57.8 | Akash Madhwal 61.9; Umran Malik 61.7; Sunil Narine 61.6 | 10 / 10 |
| 60 balls / 8 matches (default) | Off | After fixes | 66 / 136 / 12 | Rishabh Pant 58.4; Sanju Samson 58.3; Cooper Connolly 58.2 | Umran Malik 61.4; Sunil Narine 61.3; Mohammad Nawaz 61.2 | 10 / 10 |
| 36 balls / 5 matches | On | Before fixes | 109 / 178 / 16 | Najibullah Zadran 60.9; Vijay Shankar 60.6; Liam Livingstone 59.0 | Akash Madhwal 62.2; Sunil Narine 61.7; Sakib Hussain 58.8 | 3 / 6 |
| 36 balls / 5 matches | On | After fixes | 108 / 181 / 16 | Najibullah Zadran 60.5; Vijay Shankar 60.4; Liam Livingstone 58.9 | Akash Madhwal 61.4; Sunil Narine 61.2; Sakib Hussain 58.5 | 5 / 6 |
| 36 balls / 5 matches | Off | Before fixes | 118 / 194 / 17 | Najibullah Zadran 61.2; Vijay Shankar 60.6; Liam Livingstone 59.2 | Sunil Narine 61.7; Akash Madhwal 61.7; Mohammad Nawaz 61.2 | 4 / 6 |
| 36 balls / 5 matches | Off | After fixes | 118 / 198 / 17 | Najibullah Zadran 60.5; Vijay Shankar 60.4; Fakhar Zaman 59.3 | Mohammad Nawaz 61.4; Sunil Narine 61.3; Akash Madhwal 60.8 | 6 / 7 |
| 90 balls / 10 matches | On | Before fixes | 33 / 81 / 5 | Suryakumar Yadav 58.4; David Miller 57.5; Mark Chapman 57.3 | Sunil Narine 61.8; Sakib Hussain 58.6; Washington Sundar 58.5 | 4 / 4 |
| 90 balls / 10 matches | On | After fixes | 35 / 81 / 4 | Suryakumar Yadav 62.0; David Miller 58.6; Mark Chapman 57.3 | Sunil Narine 61.4; Washington Sundar 60.0; Sakib Hussain 58.3 | 3 / 3 |
| 90 balls / 10 matches | Off | Before fixes | 34 / 91 / 5 | Suryakumar Yadav 58.4; David Miller 57.5; Mark Chapman 57.3 | Mohammad Nawaz 62.5; Sunil Narine 61.9; Abrar Ahmed 61.0 | 4 / 7 |
| 90 balls / 10 matches | Off | After fixes | 37 / 91 / 4 | Suryakumar Yadav 62.5; David Miller 58.6; Mark Chapman 57.3 | Mohammad Nawaz 62.5; Sunil Narine 61.4; Abrar Ahmed 61.0 | 4 / 6 |

- With exclusions on and the fixes applied, 5 of the default top ten batters and 6 of the default top ten bowlers remain in the top ten at 36 balls / 5 matches. At 90 balls / 10 matches the counts are 3 and 3.
- Sunil Narine is in the top three bowlers and Sakib Hussain in the top five at all three threshold settings. Akash Madhwal leads at 60/8 and 36/5 but cannot qualify at 90/10, because he has 8 pressure matches and that setting requires 10.
- At the default setting the fixes bring Cooper Connolly and Glenn Phillips into the batter list and Rasikh Salam into the bowler list, and remove Sai Sudharsan and Nitish Reddy from the batter list and Kagiso Rabada from the bowler list.

## Reliability and limitations

- Sample filters and shrinkage reduce, but do not eliminate, small-sample and selection effects. The displayed reliability is not a confidence interval.
- Format-season standardization helps separate scoring environments, but IPL and T20I roles and opposition quality are not fully interchangeable. Only strata meeting eligibility contribute to a player's roll-up.
- The pressure rules can miss rivalry, knockout stakes, crowd conditions, or a close first-innings contest. Rankings are not causal estimates of a psychological trait.
- Run-outs are not credited as bowler wickets. Batter runs use `runs`; boundary flags disagree with that value on 23 deliveries, so flags are not used. Missing bye/leg-bye run amounts make chase totals approximate.
- Revised targets/overs are used when present, but supplied fields do not support full Duckworth-Lewis par scores or ball-level win probability.
- Scores are rounded for display, so adjacent players can be very close. Exact ties use unrounded index, pressure balls, then player name.
- Small T20I pools: with exclusions on and the default thresholds, T20I format-season pools hold 5 to 10 eligible batters and 12 to 36 eligible bowlers, against 12 to 17 batters and 31 to 36 bowlers in IPL seasons. A z-score inside a pool of five to ten players moves a lot when one player is added or removed. A plausible consequence is that players whose ranking rests mainly on T20I seasons are ranked higher or lower than a larger pool would give them. This is a hypothesis; its size has not been measured.
- Season labels: competitions labelled `2022/23`, `2023/24` and `2024/25` (18 matches) are assigned to their first calendar year. Series that run across two calendar years are pooled with that year's other competitions in the format-season z-scores. An earlier version of this analysis dropped these 18 matches; the "Before fixes" rows in the sensitivity table show the effect.
- The `other` extras type (264 rows) is undocumented. Treating it as a no-ball, with a one-run penalty charged to the bowler, is an inference from the data, not from documentation. The penalty run matters for the batter list: it adds 70 pressure deliveries, which lifts Cooper Connolly over the 60-ball / 8-match threshold. A separate Python re-implementation (not the shipped code) that treated `other` as an illegal ball without the penalty run kept Sai Sudharsan and Nitish Reddy in the batter top ten and left Connolly out.
- Super overs: innings 3 and 4 (38 rows in six matches, 26 rows in the four matches that are in scope) are skipped. Their balls are neither pressure nor ordinary. Treating every super-over ball as pressure would be a defensible alternative and was not applied.
- The player exclusions are a selection decision, not a feature of the method. Every list that shows the effect of removing them is in "Sensitivity and exclusions".

## Reproduction

Use Node.js 20 LTS (`package.json` declares Node 18 or newer; the committed `analysis_data.json` was generated with Node 20). From the data folder, with `ball_by_ball.csv`, `matches.csv` and `competitions.csv` present, run `node analyze.mjs` to regenerate `analysis_data.json`. The dashboard and ranked lists use `scoring.mjs`. Run `node server.mjs` and open `http://127.0.0.1:4173`. Filters recalculate rankings. **Export rankings** downloads one CSV with the current top ten batters, bowlers, and all-rounders for the selected filters.
