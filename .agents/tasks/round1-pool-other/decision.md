# Decision: the `other` extras type and the thin T20I pools

## Lists: no change

Both decisions are "keep current". The submitted lists are the same as at 450bd1a: batters, bowlers and all-rounders, all ranks, all indexes, and every other field of every ranked player (the full `ratePlayers` output is byte-identical to 450bd1a's). Nobody entered or left a list, so nothing needs to be re-entered on Unstop. The side-by-side below is produced by `old_vs_new.mjs` (old = `scoring.mjs` and `analysis_data.json` at 450bd1a, new = the working tree).

### batters: identical (entered: none; left: none)
| Rank | Old list (450bd1a) | Index | New list | Index |
|---:|---|---:|---|---:|
| 1 | Rishabh Pant | 58.4 | Rishabh Pant | 58.4 |
| 2 | Sanju Samson | 58.3 | Sanju Samson | 58.3 |
| 3 | Cooper Connolly | 58.2 | Cooper Connolly | 58.2 |
| 4 | Fakhar Zaman | 57.7 | Fakhar Zaman | 57.7 |
| 5 | Ryan Burl | 57 | Ryan Burl | 57 |
| 6 | Suryakumar Yadav | 56.4 | Suryakumar Yadav | 56.4 |
| 7 | Mark Chapman | 56 | Mark Chapman | 56 |
| 8 | Glenn Phillips | 54.5 | Glenn Phillips | 54.5 |
| 9 | David Miller | 54.4 | David Miller | 54.4 |
| 10 | Namboori Tilak Varma | 53.1 | Namboori Tilak Varma | 53.1 |

### bowlers: identical (entered: none; left: none)
| Rank | Old list (450bd1a) | Index | New list | Index |
|---:|---|---:|---|---:|
| 1 | Umran Malik | 61.4 | Umran Malik | 61.4 |
| 2 | Sunil Narine | 61.3 | Sunil Narine | 61.3 |
| 3 | Mohammad Nawaz | 61.2 | Mohammad Nawaz | 61.2 |
| 4 | Akash Madhwal | 60.9 | Akash Madhwal | 60.9 |
| 5 | Abrar Ahmed | 60.6 | Abrar Ahmed | 60.6 |
| 6 | Washington Sundar | 59.7 | Washington Sundar | 59.7 |
| 7 | Sakib Hussain | 58.9 | Sakib Hussain | 58.9 |
| 8 | Kuldeep Yadav | 58.2 | Kuldeep Yadav | 58.2 |
| 9 | Mohit Sharma | 58 | Mohit Sharma | 58 |
| 10 | Mohammad Saifuddin | 57.1 | Mohammad Saifuddin | 57.1 |

### allrounders: identical (entered: none; left: none)
| Rank | Old list (450bd1a) | Index | New list | Index |
|---:|---|---:|---|---:|
| 1 | Washington Sundar | 53.6 | Washington Sundar | 53.6 |
| 2 | Sikandar Raza | 51.9 | Sikandar Raza | 51.9 |
| 3 | Ravindra Jadeja | 51.5 | Ravindra Jadeja | 51.5 |
| 4 | Ravichandran Ashwin | 51.1 | Ravichandran Ashwin | 51.1 |
| 5 | Moeen Ali | 50.7 | Moeen Ali | 50.7 |
| 6 | Nitish Reddy | 49.9 | Nitish Reddy | 49.9 |
| 7 | Cameron Green | 49.1 | Cameron Green | 49.1 |
| 8 | Axar Patel | 48.3 | Axar Patel | 48.3 |
| 9 | Sam Curran | 47.9 | Sam Curran | 47.9 |
| 10 | Shivam Dube | 47.3 | Shivam Dube | 47.3 |

eligible old 66/136/12, new 66/136/12
full ratePlayers output (all ranked players, all fields) byte-identical: true

Not changed: `analyze.mjs`, `analysis_data.json` (diff against 450bd1a is empty), `APPLY_PLAYER_EXCLUSIONS` (false), the default of `scoring.mjs`.
Real `node analyze.mjs` (Node 20.20.2) reproduces the committed `analysis_data.json` apart from `generatedAt`: `check_analyze.mjs` prints true.

## Part A: the `other` extras type

**Question.** Is an `other` delivery a legal ball, and does it carry a penalty run? Readings: a = illegal ball, +1 run (submitted), b = illegal ball, no run, c = legal ball, no run.

**Tests** (`other_evidence.mjs`, output `other_evidence_data.json`, decision rule fixed in the plan before the committed run but after a scouting regression had shown the direction; the rule was not committed beforehand, so this test is not pre-registered).
- T0 field audit: no totals, scores or cumulative fields exist. `innings_ball_num` is a row counter (200,999 of 200,999 rows). Byes, leg-byes and overthrow runs are not stored, so exact reconstruction is impossible.
- T1 free hit: non-run-out wicket on the ball after the row. Normal 5.12%. After `other` 0 of 261 (13.4 expected, P = 1.1e-6). After `Overstep` 0 of 574 (P = 8e-14).
- T2 wickets on `other` rows: 3 of 3 run-outs (P = 0.00015 if normal).
- T3 over length: of 216 overs with an `other` row (not the last over), 216 have six legal balls if `other` is illegal and 0 if legal (209 have 7, 6 have 8, 1 has 9). 137 of 139 full innings have exactly 120 legal balls if illegal; 0 if legal.
- T4 exact margins: 6 of 12 (a), 5 of 12 (b, c). Chases: 12 of 16 (a), 11 of 16 (b, c). One match with an `other` row (India by 61): difference 61 with the penalty, 60 without.
- T4 regression (394 run-won matches, 107 with `other`): `other` coefficient 1.11, HC1 95% CI 0.66 to 1.56 (contains 1, excludes 0; z = 4.8 against 0, 0.5 against 1). Overstep control 0.90 (0.56 to 1.23), valid. Same verdict (a) without the extras_2_runs regressor, with the 5 largest residuals dropped, and in scope only.

**Result.** c is rejected (T1 to T3). a is preferred to b by the regression alone (the exact T4 checks have almost no power).

**Decision.** Keep a. The penalty stays at one run. The remaining uncertainty is the run value, not legality. If the penalty were zero, Cooper Connolly (3rd) drops out of the batter list (65 eligible batters; Sai Sudharsan and Nitish Reddy enter). That alternative stays in the report.

## Part B: the thin T20I pools

**Question.** Does a different pool standardisation make the index materially more stable without implausible side effects? Thin pools: T20I batters 2023 (5) and 2026 (6) in the submitted setting; five pools of 5 to 10 batters with exclusions on.

**Tests** (`node sensitivity.mjs --pool-methods`, run once, no rerun, no parameter change; output `pool_methods_data.json`). The criterion is `pool_preregistration.md`, committed in bcbf2ee before the code (c83ff91) and the results (1a98041); the file is unchanged since. Candidates: C1 format-fallback, C2 shrunk (pseudo-count 5), C3 adjacent-fallback, against own-pool (primary). Settings: S1 submitted, S2 exclusions on; batters and bowlers separately. Primary measure M1 (pool-thinning error: keep 8 players per pool, 500 runs). Also top-10 retention, rank displacement, leave-one-out exits, season-to-season correlation and side-effect rules. Seven rules, all must hold.

**Results.** M1 relative to own-pool (S1 batters, S1 bowlers, S2 batters, S2 bowlers): C1 1.022, 0.822, 0.669, 0.736; C2 0.684, 0.695, 0.682, 0.681; C3 1.000, 0.868, 0.699, 0.828.
- C1 fails rules 1 and 3. C2 fails rules 2, 3 and 5 (Brian Bennett's index moves 1.6, Mujeeb Ur Rahman's rank 8). C3 fails rules 1 and 3. Nobody passes.
- In S1, C1 and C2 would swap Jos Buttler in for Namboori Tilak Varma at 10th; C3 changes no name. No bowler or all-rounder name changes.
- The effect is not confined to the tail: C1 and C3 would move Mark Chapman from 7th (56.0) to 1st (58.9 and 58.5); C2 to 4th (57.2). Chapman gets 76% of his pressure balls from the pool of five. The report says so.
- In S2 (exclusions on, the alternative setting; T20I batter pools of 10/5/10/10/6) the rejected candidates would change the top 10 as follows. Source: `pool_methods_data.json`, `methods[].top10.S2`, same as the report's `pool_effects` table. Index in brackets, "was" = own-pool rank.
  - C1 batters: Jos Buttler 9th (53.0, was 12th) and Nitish Reddy 10th (53.0, was 13th) enter; Mohammad Nabi (was 9th, 54.0) and Rinku Singh (was 10th, 53.3) leave. Order: Mark Chapman 5th to 1st, Pant, Samson, Connolly each down one place, Suryakumar Yadav 6th to 5th, Ryan Burl 4th to 6th; Glenn Phillips and David Miller stay 7th and 8th. Bowlers and all-rounders: no name changes (Sam Curran and Axar Patel swap 7th and 8th among all-rounders).
  - C2 batters: Jos Buttler 10th (53.2, was 12th) enters; Rinku Singh (was 10th, 53.3) leaves. Order: Cooper Connolly 3rd to 1st, Mark Chapman 5th to 4th, Ryan Burl 4th to 6th. Bowlers: Varun Chakravarthy enters in 10th (55.9); Benjamin Lister leaves (was 10th, 56.3). Order of the other nine bowlers: Umran Malik 3rd to 2nd, Sunil Narine 2nd to 3rd. All-rounders: no change.
  - C3 batters: Namboori Tilak Varma 9th (53.2, was 11th) and Jos Buttler 10th (53.0, was 12th) enter; Mohammad Nabi (was 9th, 54.0) and Rinku Singh (was 10th, 53.3) leave. Order: Mark Chapman 5th to 4th, Ryan Burl 4th to 5th, David Miller 8th to 7th, Glenn Phillips 7th to 8th. Bowlers and all-rounders: no name changes (Sam Curran and Axar Patel swap 7th and 8th among all-rounders).
  - Nabi and Rinku Singh, the two players the task names as pool-dependent, leave the S2 top ten under C1 and C3; under C2 Rinku Singh leaves and Nabi stays 9th. The harness rejects all three, so none of these changes is adopted.
- Season-to-season correlation is near zero for every method, own-pool included; all intervals span zero.

**Decision.** KEEP_CURRENT, computed by the harness from the pre-registered rules. `own-pool` stays the default. Limits: M1 measures dependence on pool membership, not accuracy against true skill; other thresholds could change the decision (not tested).

**Open point for you.** `scoring.mjs` keeps a `poolMethod` option (default `own-pool`, output identical to before). The plan said to leave `scoring.mjs` untouched on KEEP_CURRENT; the option is what lets `node sensitivity.mjs --pool-methods` reproduce the comparison. Reverting `scoring.mjs` to 0008ad5 removes the option and breaks that command. It changes no list.

## Deliverables and checks (branch `round1-pool-other`)

Commits since 450bd1a: 0008ad5 (other_evidence.mjs), bcbf2ee (pre-registration), c83ff91 (pool-method code), 1a98041 (pool results), 40f868d (charts and sensitivity labels), 4b6e90f (report md), 52604cf (report html and PDF), 2a0570b (index.html and README), then the verification-script commit; `git log --oneline 450bd1a..HEAD` lists them all. Report md, html and PDF (16 pages), index.html, README, `charts.mjs` and `sensitivity.mjs` are updated; figures and lists are unchanged. Check outputs are in the commit messages and in `verify_*_output.txt` next to this file.

Nothing was pushed, merged or sent to a remote. To adopt the branch (your call; nothing in it changes the submitted lists):

```
git checkout main && git merge --no-ff round1-pool-other && git push origin main
```
