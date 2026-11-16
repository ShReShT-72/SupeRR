# Implementation Plan: round1-pool-other (Part A `other` extras, Part B thin T20I pools)

Branch `round1-pool-other` at 450bd1a. Node: `C:/Users/shreshtb/AppData/Local/Temp/node20/node.exe` (v20.20.2), always run from the repo root by absolute path. Nothing is pushed, merged or sent to a remote. `.agents/` is git-ignored (`.git/info/exclude`), so scratch scripts and notes there are never committed.

Workflow shape: not restructured into FEAT files. The existing loop (partA, partB, docs, reviewA, reviewB, gate, final) already splits the work in the only order it can run (B depends on A's data, docs depend on both). Each section below is the brief for the step of the same name.

## 1. What the repo contains (read, not assumed)

**Data columns.**
- `matches.csv`: `match_id, comp_id, match_number, match_date, stage, venue_*, home/away team ids and names, captains, toss_*, man_of_the_match, first_inn_revised_overs, second_inn_revised_overs, revised_target, knock_out, win_team_id, result`. `result` is text only ("X Won by 61 runs", "Won by 4 Wkts", "No Result", "Tied (... Super Over)"). There is no innings total, final score, wickets or balls-left column.
- `ball_by_ball.csv`: `match_id, innings, overid, over_ball_num, innings_ball_num, ..., runs, is_four, is_six, is_wicket, dismissal_type, dismissed_player_id, extras_type, extras1_runs, extras_2_runs, ..., delivery_ist_time`. There is no cumulative-score field. `over_ball_num` and `innings_ball_num` are plain row counters: a wide row advances them (13511 inn 1: wide at 40, next ball 41; one over has `over_ball_num` 7 and 8). So they carry no legal-ball information. `runs` is the batter's runs only.
- `extras_type` counts (all competitions): None 189,167; wide 7,714; legbyes 2,748; byes 529; Overstep 576; other 264; Penalty 1. `extras1_runs` is a type code: None 6, wide 2, Overstep 1, legbyes 3, byes 4, **other 5**, Penalty 7. `extras_2_runs` is a small extra-run field (on `other` rows: 7 rows with 4, 7 with 1). Wide, legbyes and byes rows have `runs` = 0 and `extras_2_runs` = 0, so wide overthrows, bye and leg-bye runs are not stored. This is why an exact innings-total reconstruction fails: only 34 of 867 matches have no byes/legbyes/penalty/revised/super-over rows, 11 of them decided by runs, and the existing exact-margin check reproduces the margin in only 5 of those 11 (`.agents/tasks/round1-fixes2/margin2.mjs`).
- 215 matches contain an `other` row; 4 of them have revised overs or target.

**`analyze.mjs`** (lines 62-78): `ILLEGAL_EXTRA_TYPES = ['wide','overstep','noballs','no-ball','other']` drives `isLegalBall`; `bowlerPenalty()` returns 1 for any of them, and 0 for `other` when `--other-no-penalty` is passed (`OTHER_PENALTY`, line 68). `--out=PATH` redirects the output. The penalty run feeds both the bowler's `conceded` and the innings `score` used for the chase required rate, so it decides which deliveries are "pressure" (81,806 with, 81,736 without). Batters' `faced` = not a wide, so an `other` ball counts as faced. Super-over innings are skipped. Default output reproduces the committed `analysis_data.json` except `generatedAt` (sensitivity.mjs already checks this).

**`scoring.mjs`**: profiles per `kind:player:format:season`; eligible = 60 pressure balls, 8 pressure matches, 60 usual balls. Strata = `format:season` (line 97). In each stratum (line 104 loop) four metrics are z-scored with `zScores()` (lines 25-33: population mean and SD of that pool, SD 0 gives 0): level, change vs usual, outcome, consistency (lines 150-153). Raw = 0.35 level + 0.30 change + 0.20 outcome + 0.15 consistency; roll-up weights raw by pressure balls; index = 50 + 10 x raw x sqrt(ball and match reliability), clipped 0-100. `APPLY_PLAYER_EXCLUSIONS = false` at line 6 (submitted lists have no exclusions). `dashboard.js` imports `scoring.mjs` in the browser, so it must stay free of Node imports and keep `ratePlayers(records, options)` compatible.

**Pool sizes today (no exclusions, from `sensitivity_data.json`).** Batters IPL 17/13/12/17/12, T20I 12/**5**/11/12/**6** (2022 to 2026). Bowlers IPL 35/35/33/36/32, T20I 40/12/25/40/12. Thin (<=10) = 2 batter pools, 0 bowler pools. With exclusions on the T20I batter pools are 10/5/10/10/6 (the case the task cites: Rinku Singh, Nabi). Eligible 66 / 136 / 12 (batters, bowlers, all-rounders).

**`sensitivity.mjs`** (`node sensitivity.mjs`, about 3 minutes, deterministic, seed 20261116 mulberry32):
- Builds instrumented copies of `scoring.mjs` by text replacement. It throws unless these strings occur exactly once: `const APPLY_PLAYER_EXCLUSIONS = false;` (line 145), `    const rollups = new Map();` (line 147, adds `__sensitivityPoolHook`), and the `const benchmark = ...` line (line 148, adds `__sensitivityBenchmark`). Any change to `scoring.mjs` must keep these three anchors or update `sensitivity.mjs` in the same commit.
- `rankStability`: for the primary top 10, leave-one-out (every eligible player of the kind dropped in turn: 65 batters, 135 bowlers; exits and worst rank), match-level cluster bootstrap (1000 runs, resample records within each player-format-season group, re-rate with the 60/8 gate), random pool deletion (1000 runs, 20% of eligible non-top-10 players removed). Share in top 10 is labelled fragile <50%, moderate 50-80%, stable >=80%. Today's batter bootstrap shares: Pant 59%, Samson 30%, Connolly 49%, Fakhar 51%, Burl 48%, Surya 59%, Chapman 63%, Phillips 42%, Miller 35%, Tilak Varma 14%. Pool-deletion shares are >=92% except Tilak Varma 25% and Saifuddin 41%.
- `minimumPoolSize` (K = 8, 12, 13, drops the pools, no fallback) and `poolingSeasons` (T20I seasons pooled; all seasons pooled; career-pooled). These are sensitivity variants. They are not a fix and have no stability score.
- `otherAlternative`, `exclusionAlternative`, `robustCore`, `otherEvidence` (profiles of `other`/Overstep/wide rows, over-length counts: 243 of 243 non-final overs with an `other` row would have >6 legal balls if `other` were legal, exactly 6 if illegal; `runMarginCheck` marked "inconclusive": 5 of 11 calibration matches), `exclusionFlip`. `--print-top10` prints the lists.

**`charts.mjs`**: reads `analysis_data.json` through `scoring.mjs` and `sensitivity_data.json`; throws if the live top 10 differs from `sensitivity.primaryCheck`; writes `charts/*.svg` (6 charts) and replaces `<!-- chart:NAME -->` / `<!-- table:NAME -->` blocks in `methodology_report.md` and `.html`; `--check` compares without writing.

**Report structure** (`methodology_report.md`): Executive result (top 10 batters line 14, bowlers 35, all-rounders 56), Data and scope 73, Pressure definition 81, Performance and ranking 93, Evidence 113, Sensitivity and exclusions 140 (sub-sections: exclusion alternative 144/176, **`other` extras 243**, robust core 295, **Small T20I pools 360**, thresholds 455), Switch the exclusions on 478, Reliability and limitations 488, Reproduction 503. The html is a hand-written parallel of the md. The PDF is the html printed by headless Edge: `msedge.exe --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=<abs path> file:///c:/Users/shreshtb/Documents/6af3166e7b922_data_pack/methodology_report.html` (currently 14 pages).

**Earlier verification scripts** (all under git-ignored `.agents/tasks/`, hard-code old numbers, so copy and update, do not edit in place):
- `round1-fixes3/verify_all.mjs`: `scoring.mjs` (exclusions flipped by regex on the switch line) vs md/html top-10 tables, alternative tables, side-by-side tables and `sensitivity_data.json`; prints `TOTAL MISMATCHES`.
- `round1-fixes3/verify_claims.mjs`: about 45 hard-coded prose claims (eligible counts, shared names, `other` alternative lists, pool sizes, bootstrap/pool-deletion percentages, fragile count 12).
- `round1-fixes3/verify_pdf.mjs <pdf_text>`: every expected table row appears in order in the PDF text, plus required and absent phrases. Text comes from `python -X utf8 .agents/tasks/round1-fixes/pdfx_edge.py methodology_report.pdf > <file>` (system Python `C:/Python314/python.exe`).
- `round1-fixes3/tag_balance.mjs <html...>`: html tag balance.
- `round1-fixes3/radar_check.mjs`: IPL 2026 radar/raw-talent values on the dashboard (index.html rows such as Tilak Varma 51.3 are static and come from `scoring.mjs`).
- `round1-fixes2/pdf_to_png.ps1 -Pdf <pdf> -OutDir <dir>`: renders PDF pages to PNG with the Windows PDF API. Use it to view page 1, the top-10 pages and the new evidence pages.
- `round1-fixes/pdfx_edge.py`, `round1-fixes2/phase*.mjs`, `chk_report.mjs`: md/html/PDF cross-checks.

## 2. Scouting results (planning only, not decisions)

These came from throw-away scripts in `.agents/tasks/round1-pool-other/scratch/`. The implementer must recompute them in committed code and the reviewer must recompute them from scratch. They show the tests below are feasible and what to expect.
- Free-hit test: the ball after a no-ball cannot produce a non-run-out dismissal. Next-ball non-run-out wicket rate: after normal balls 5.12% (9,596 of 187,499), after wides 5.44%, after leg-byes 6.09%, **after Overstep 0 of 574, after `other` 0 of 261** (about 13.4 expected at 5.12%). All 3 wickets on `other` rows are run-outs (Overstep: 5 of 5 run-outs; wide rows: 25 stumped, 15 run-out).
- Run-margin regression: over 394 run-won, non-DLS, no-super-over matches (107 with an `other` row), margin minus the batter-run difference regressed on innings-1 minus innings-2 counts gives coefficients: wide 1.16 +/- 0.08, Overstep 0.90 +/- 0.28, extras_2 1.04 +/- 0.42, legbye 1.30, bye 2.06, **other 1.11 +/- 0.47** (95%, classical SE), residual SD 2.9. The no-ball control (Overstep) lands near 1, and `other` lands near 1, with 0 outside the interval.
- Expected reading: `other` is a no-ball variant (not legal) and carries a +1 run, so the current behaviour (a) is kept. That would leave `analyze.mjs` and `analysis_data.json` untouched. The workflow must still run the tests and apply the pre-registered rule below.
- Pool facts: one `ratePlayers` call is about 0.1 s. In the submitted setting only 3 batters have >=50% of their pressure balls in a thin pool (Mark Chapman, Daryl Mitchell, Shimron Hetmyer), and there are 10 T20I and 22 IPL consecutive-season batter pairs. So list-level top-10 stability alone has little power to separate pool methods in the submitted setting. The pre-registered criterion below therefore adds a direct pool-thinning test.

## 3. Part A: the `other` extras type (step `partA`)

### 3.1 Pre-registered decision rule (fixed now)
Interpretations: (a) illegal ball, +1 penalty run (current); (b) illegal ball, no penalty run; (c) legal ball, no penalty.
1. Reject (c) if the free-hit test, the own-row dismissal test and the over-length test all point to a no-ball variant (listed below).
2. Choose between (a) and (b) only with the run-margin regression. (a) if the 95% HC1-robust CI of the `other` coefficient contains 1 and excludes 0. (b) if it contains 0 and excludes 1. Otherwise undecided, and the rule is: keep (a) and say no test decided.
3. Positive control: the Overstep coefficient CI must contain 1. If it does not, the regression is invalid and counts as undecided.
4. Change `analyze.mjs` only if the rule picks (b) or rejects (a) in favour of (c). Otherwise `analyze.mjs` and `analysis_data.json` are not modified (state this in `decision.md`).

### 3.2 Tests, in the order to run
Implement them in `sensitivity.mjs` (extends `otherEvidence`, so they are reproducible and reach `sensitivity_data.json`), with a new flag `--other-evidence` that runs only this block, prints the numbers and exits without rewriting `sensitivity_data.json` (like `--print-top10`). Use `ball_by_ball.csv` rows of all competitions unless stated; then repeat on the in-scope 837 matches.
- **T0 Field audit.** Confirm no cumulative or total field exists (`matches.csv` columns listed above; `over_ball_num` and `innings_ball_num` equal the row counter, check that they advance on every wide/Overstep/other row). Result: exact reconstruction against official totals is impossible. Report this plainly.
- **T1 Free-hit test.** For each row of type None / wide / legbyes / byes / Overstep / other (innings 1-2 only, next row in the same innings) record whether the next ball has a non-run-out dismissal (exclude run out, retired, obstructing, timed out, handled). Report n, count and rate per type and the exact binomial probability of the observed `other` count (and Overstep count) at the None-ball rate. Favours: a or b (no-ball) if `other` is near 0 like Overstep; c (legal) if `other` is near the 5% base rate.
- **T2 Own-row dismissals.** Dismissal types on `other` rows versus Overstep, wide and normal rows. Favours a or b if only run-outs occur (3 of 3 now); c if bowled/caught/lbw appear at the normal share.
- **T3 Over length** (existing counts, recompute): legal balls per over containing an `other` row, excluding each innings' last over, under "other legal" and "other illegal". Favours a or b if "illegal" gives exactly 6 (243 of 243 expected) and "legal" gives more than 6; c if the reverse.
- **T4 Run-margin regression (the only test that can separate a from b).** Sample: matches whose `result` ends "Won by N run(s)" (trim, case-insensitive), no innings above 2, no `revised_target`/revised overs, no "DLS" or "D/L" in `result`, no Penalty row. Response y = margin minus (sum of batter `runs` in innings 1 minus innings 2). Regressors, each as (innings 1 count minus innings 2 count): wide, Overstep, legbyes, byes, other, plus the (innings 1 minus 2) sum of `extras_2_runs`. No intercept. OLS with classical and HC1 SEs, 95% CI, n, residual SD. Variants: in-scope matches only; without the `extras_2_runs` regressor; leave-one-influential-match checks (drop the 5 largest absolute residuals). Favours a if the `other` CI contains 1 and excludes 0, b if it contains 0 and excludes 1. Also report the exact-reconstruction checks (the clean-match count of 34 and the 1 clean run-decided `other` match, India won by 61 runs, difference 61 with and 60 without the run) as supporting only.
- **T5 Rules prior.** Record that a no-ball carries a one-run penalty in T20 playing conditions and that the provider's Overstep rows follow it in T4 (control coefficient near 1). This is context, not a test.
- **T6 Effect size.** Already known and recomputed by `analyze.mjs`: 70 deliveries move from pressure to ordinary (81,806 vs 81,736); Connolly's 3rd place and the 60/8 gate depend on it (65 vs 66 eligible batters).

### 3.3 If the rule picks (b) or (c) (contingency only)
- `analyze.mjs`: make the chosen reading the default and keep the old one behind a switch. (b): `OTHER_PENALTY` default false, new switch `--other-penalty` restores the old behaviour. (c): remove `'other'` from `ILLEGAL_EXTRA_TYPES` by default and add `--other-illegal` to restore it. Update the comment at lines 60-63 and 66-68.
- Regenerate `analysis_data.json` with `node analyze.mjs` (real JS, Node 20); then `node analyze.mjs --out=<tmp>` and diff (ignore `generatedAt`) to prove it reproduces.
- `sensitivity.mjs`: the `--other-no-penalty` calls (`runAnalyze`, line near 256), `SCENARIOS` labels, `otherAlternative`, `robustCore` scenario keys and `charts.mjs` `COLUMNS` (lines 196-204) must treat the new reading as primary and the old one as the labelled alternative. Update all labels so they say which is primary.
- Lists change: record old vs new top 10 for batters, bowlers and all-rounders with indexes (see 6.1) and carry them to every output.
- Commit order: analyze.mjs + data first, then sensitivity/charts.

### 3.4 Part A output
- `.agents/tasks/round1-pool-other/partA_result.md`: the numbers of T0-T6, the rule outcome, and "analyze.mjs changed: yes/no". This is the input to Part B and `decision.md`.
- Commit `feat(sensitivity): decisive tests for the other extras type` (script only; `sensitivity_data.json` is regenerated once at the end, see 5).
- If analysis changed: commit `fix(analyze): ...` and `chore: regenerate analysis_data.json` separately.

## 4. Part B: thin T20I pools (step `partB`)

### 4.1 Pre-registered criterion (written before any candidate run; do not change after)

**Setting.** S1 = submitted (no exclusions, `analysis_data.json` as left by Part A). S2 = same data with `APPLY_PLAYER_EXCLUSIONS` true (the alternative, where thin T20I pools are common: batters 10/5/10/10/6). Both are evaluated; kinds are batters and bowlers separately. Resampling seeds: bootstrap 20261116, pool deletion 20261117, thinning 20261118 (same mulberry32 as `sensitivity.mjs`), 1000 / 1000 / 500 runs. Thin stratum = a baseline stratum with 10 or fewer eligible profiles (same as `THIN_POOL_MAX`).

**Baseline and candidates (parameters fixed).** For stratum P of kind k, format f, season s with n eligible profiles, metric j, population mean mu_P and SD sigma_P (as `zScores`): U = all eligible profiles of (k, f) across all seasons, with mu_U and sigma_U (population, unweighted per profile).
- **BASE** current method: z = (v - mu_P) / sigma_P.
- **C1 minimum pool, same-format fallback**: if n <= 10, z-score against mu_U, sigma_U; otherwise BASE.
- **C2 shrinkage with pseudo-count**: for every stratum, mu = (n mu_P + 5 mu_U) / (n + 5) and sigma^2 = (n sigma_P^2 + 5 sigma_U^2) / (n + 5). Pseudo-count 5 = the smallest pool seen.
- **C3 minimum pool, adjacent-season fallback**: if n <= 10, z-score against the union of strata (k, f, s-1), (k, f, s), (k, f, s+1) that exist; if that union still has 10 or fewer profiles, use U; otherwise BASE.
Eligibility, the four metric definitions, weights, reliability and the all-rounder composite are untouched in every candidate. The sigma = 0 rule (z = 0) is kept.

**Stability metrics** (computed for BASE and each candidate, each against that method's own full-data reference):
- **M1 Pool-thinning error (primary, direct).** Each run keeps exactly 8 randomly chosen eligible profiles in every stratum that has more than 8 (all strata thinned together, other fields untouched, 500 runs). For each retained profile compare its stratum composite raw score (0.35 level + 0.30 change + 0.20 outcome + 0.15 consistency, the pre-roll-up value) with the same profile's composite in the full data under the same method. M1 = RMSE of that difference divided by the SD of the method's full-data composites (so methods with different scales compare). Large strata are the truth reference, 8 is inside the thin range.
- **M2 Top-10 retention.** Mean share of the method's own full-data top 10 that is back in the top 10: M2a under pool deletion, M2b under bootstrap.
- **M3 Rank displacement.** For the method's top 10: mean over members and runs of |rank in run - full-data rank| (a member that is not eligible in a run counts as that run's eligible count + 1). M3a pool deletion, M3b bootstrap.
- **M4 Leave-one-out exit rate.** Total top-10 exits divided by (10 x number of drop runs).
- **M5 Between-season consistency.** Pearson r of the stratum composite for the same player in consecutive seasons of the same format and kind (n pairs reported; bootstrap 95% CI over pairs, 1000 draws, seed 20261119, reported only). M5-all uses all pairs; M5-thin uses pairs where either stratum is thin in the baseline.
- Baseline reproduction: the harness's BASE bootstrap and pool-deletion top-10 shares in S1 must equal `rankStability` in the committed `sensitivity_data.json` (same seeds and sampling order). If not, the harness is wrong, not the data.

**"Improves stability materially" (all must hold):**
1. M1 falls by at least 15% relative to BASE (M1_candidate <= 0.85 x M1_BASE) in all four cells (S1 and S2, batters and bowlers).
2. In S2 for batters, at least one of: mean(M2a, M2b) rises by 0.02 or more; mean(M3a, M3b) falls by 10% or more.
3. No harm in S1 and S2, batters and bowlers: M2a and M2b each no lower than BASE minus 0.01; M3a and M3b each no more than BASE plus 0.5 ranks; M4 no more than BASE plus 0.005; M5-all no lower than BASE minus 0.02.

**"No implausible side effects" (all must hold, S1 and S2):**
4. The eligible counts (batters, bowlers, all-rounders) are identical to BASE.
5. For players with no pressure balls in a thin stratum ("large-pool players"), the largest absolute index change is at most 1.0 and the largest absolute rank change is at most 5. (C1 and C3 must give exactly 0 index change for them; the harness asserts it.)
6. For players with pressure balls in a thin stratum, the largest absolute index change is at most 5.0.
7. In S1, at most 3 of the top-10 names change per kind (batters, bowlers) and at most 3 for all-rounders.

**Decision rule.** Candidates failing any of 1-7 are rejected. If exactly one passes, adopt it. If several pass, adopt the one with the larger mean relative M1 reduction across the four cells; if within 2 percentage points of each other, adopt the one that changes fewer indexes in S1 (then the simpler: C1, C3, C2). If none passes, the decision is KEEP_CURRENT: `scoring.mjs` is not changed. The harness computes this decision and writes it into its output; the coder does not override it.

### 4.2 Harness and procedure
1. **Write `poolsize_candidates.mjs`** (repo root, Node built-ins only, header says it is evidence for `scoring.mjs` at 450bd1a). Contents: a `PREREGISTERED` constant that holds all numbers above, the candidate definitions, the metrics, the decision rule, and a `--selftest` mode. It builds an instrumented copy of `scoring.mjs` by text replacement with the same style as `sensitivity.mjs` and asserts each anchor occurs exactly once: the exclusion switch line, `    const rollups = new Map();`, the `const benchmark` line, and the four consecutive `const zLevel/zChange/zOutcome/zConsistency = zScores(measured, ...)` lines (150-153), which become one call to `globalThis.__poolStandardise?.(measured, metrics, kind) ?? [original four]`. The hook records, per stratum, the values of the four metrics and returns z functions built from the method's (mu, sigma); a first "collect" pass over the same records gives the moments the second "apply" pass needs (U and adjacent unions), so each evaluation of a candidate costs two calls and BASE shares the first. The hook also records each stratum composite per (kind, player, format, season) for M1 and M5. Output: `poolsize_candidates_data.json` (no timestamps) with PREREGISTERED echoed back, every metric for BASE and C1-C3 in S1 and S2, the full top-10 lists and index differences versus BASE (batters, bowlers, all-rounders), the side-effect maxima with the player named, and the computed decision.
2. **Self-test** (`--selftest`, prints no candidate results): BASE hook output equals shipped `ratePlayers` exactly; C1 with K=0, C3 with K=0 and C2 with pseudo-count 0 equal BASE exactly; two runs with the same seed give identical numbers; S1 BASE bootstrap/pool-deletion shares equal `sensitivity_data.json`. Fix code bugs only.
3. **Commit the harness before running it for results:** `test: pre-register the pool-size criterion and candidates`. Record that commit hash in `partB_result.md`; reviewers confirm via `git log` that it precedes the data commit.
4. **Run once:** `node poolsize_candidates.mjs` (about 25-35 minutes; run in the background with `timeout` 1800000 ms and poll). If it crashes, fix the bug and rerun, and say so; do not touch PREREGISTERED values, the criterion or parameters. Commit `poolsize_candidates_data.json` as `data: pool-size candidate results (pre-registered criterion)`.
5. **If the decision is KEEP_CURRENT:** `scoring.mjs` is untouched. Lists, charts and the dashboard do not change from Part B. State the pre-registered numbers and every candidate's results in the report and `decision.md`.
6. **If the decision is ADOPT:Cx:**
   - `scoring.mjs`: add one constant `POOL_METHOD` (`'own-pool'` = old method, kept and documented as the alternative; the adopted name is the default), and implement the adopted rule with the formulas above, with a comment pointing to the report section. The `ratePlayers(records, options)` signature, the exclusion switch line (including exact text), the `rollups` anchor and the `benchmark` line must survive unchanged, or `sensitivity.mjs` anchors are updated in the same commit. The code must stay browser-safe. Verify: the new `scoring.mjs` output equals the harness candidate output for S1 and S2 exactly (all three lists), and `POOL_METHOD = 'own-pool'` reproduces the pre-change lists exactly.
   - `sensitivity.mjs`: primary = adopted method; add an `ownPoolAlternative` block (lists via a text-flipped copy, same mechanism as `exclusionFlip`) with `movement()` vs primary; keep the `minimumPoolSize` and `poolingSeasons` blocks (they use the benchmark hook, so confirm they still run against the new code and are labelled "sensitivity only").
   - `charts.mjs`: label primary vs alternatives (chart 4/5 columns, chart 6 sources) and add a table block for the candidate comparison.
   - The lists, the dashboard defaults and the index.html static rows (radar values) must be refreshed from the new `scoring.mjs` (`radar_check.mjs` shows which).

### 4.3 How Part A's outcome changes Part B
- Part A keeps (a): the baseline is the committed `analysis_data.json`; `sensitivity_data.json` baseline numbers (bootstrap shares above) are the harness check.
- Part A switches to (b) or (c): `analysis_data.json` is regenerated first and the harness runs on it. Pool sizes can change by one profile (for example 66 vs 65 eligible batters through the 60/8 gate), so the thin-pool list, the baseline reproduction target (regenerate `sensitivity_data.json` after Part A and before the harness self-test, or compare against a fresh in-harness BASE run instead of the old file) and every Part B number must come from the new data. The PREREGISTERED values do not change.

## 5. Docs step (`docs`) and regeneration order
Order matters, run after A and B are final.
1. `node sensitivity.mjs` (3-5 minutes) to rewrite `sensitivity_data.json` with the Part A tests (and the adopted method if any). `node charts.mjs` to rewrite charts and table blocks, then `node charts.mjs --check` (must pass).
2. `methodology_report.md` and `.html` (same content, hand-written; keep tables between `charts.mjs` markers): 
   - Update the method text (Performance and ranking, about line 93) to name the pool method (BASE or adopted) and the old method as the documented alternative.
   - Rewrite the `other` section (line 243): replace "the run-margin check was inconclusive; the penalty is an assumption" with the T0-T6 numbers and the rule outcome. Remove caveats that no longer apply, keep those that still do.
   - Rewrite the Small T20I pools section (line 360): the pre-registered criterion, the candidate definitions, the results for every candidate including the rejected, the decision, and (if adopted) every change in top-10 membership and order.
   - Add one short new section "Evidence for the two decisions" placed in Sensitivity and exclusions, with the tables above. Update the sensitivity and robust-core tables and all Figures through `charts.mjs`. Keep the Radar/Raw Talent notice outside Round 1 (dashboard only).
3. `index.html` (method steps 01 and 07 text; static radar rows if scores changed), `dashboard.js` (only if defaults or labels change), `README.md` (new files `poolsize_candidates.mjs`/data in the Files table and the regeneration commands, any new switch, `--other-evidence`, and line number of the exclusion switch if `scoring.mjs` shifts: README says line 6).
4. Copy `verify_all.mjs`, `verify_claims.mjs`, `verify_pdf.mjs`, `tag_balance.mjs`, `radar_check.mjs` to `.agents/tasks/round1-pool-other/`, update their hard-coded numbers for the final results, add new checks for the new numbers (the `other` tests, the criterion results, the candidate table, the final lists).
5. PDF: rebuild from the final html with the Edge command in section 1; extract text with `pdfx_edge.py`; render with `pdf_to_png.ps1`; view page 1, the top-10 pages (batters, bowlers, all-rounders) and the new evidence pages; confirm no heading is left stranded and no table is clipped.
6. Commits (logical, one concern each): `docs: report evidence for the other-extras and pool-size decisions`, `docs: index, dashboard, README follow the final lists`, `docs: regenerate methodology_report.pdf from the final html`.

## 6. Deliverables and checks

### 6.1 `decision.md` (`.agents/tasks/round1-pool-other/decision.md`)
If any list changed, the first thing in the file is the exact side-by-side: old submitted list (450bd1a) vs new list for batters, bowlers and all-rounders with indexes, who entered and who left, and a warning that Unstop entries must be re-entered. If nothing changed, the first line says so. Then, for each part: question, tests run, results, decision, and the open point (whether to adopt the branch's lists as the submission). Include the commit hashes, the harness pre-registration commit and the merge/push commands for the user (`git checkout main && git merge --no-ff round1-pool-other && git push origin main`; the workflow runs none of them).

### 6.2 Checks that must be run and shown
- If `analyze.mjs` was changed: `node analyze.mjs --out=<tmp>` equals the committed `analysis_data.json` except `generatedAt`. If not changed, say "analyze.mjs untouched" and still run it once to confirm it reproduces the committed file.
- `node sensitivity.mjs` completes; `primaryCheck` equals `scoring.mjs`; `node charts.mjs --check` passes.
- Updated `verify_all`, `verify_claims`, `verify_pdf`: 0 mismatches; `tag_balance.mjs methodology_report.html index.html` passes; PDF page images viewed.
- Every figure in md, html, PDF text, index.html and README equals `scoring.mjs` run on the committed `analysis_data.json` (0 mismatches).
- `git status` clean on `round1-pool-other`, `git log --oneline 450bd1a..HEAD` listed, `git rev-parse main origin/main` both 450bd1a, `git log origin/round1-pool-other` does not exist, nothing pushed.

### 6.3 Independent review (steps reviewA, reviewB, gate)
- **reviewA** (different agent from partA/partB): writes its own scratch script, does not import the implementer's code, and recomputes from the CSVs the free-hit rates, the own-row dismissal types, the over-length counts and the run-margin regression (T1-T4), and checks the rule outcome follows. For Part B it reads the pre-registration commit, confirms it precedes the data commit and that PREREGISTERED did not change between them (`git diff <prereg>..HEAD -- poolsize_candidates.mjs` shows no change to the constants), reruns `node poolsize_candidates.mjs --selftest`, and reruns at least one full cell (S1 batters, BASE and the winning/best candidate, reduced runs are not acceptable for the verdict: use the full 500/1000/1000) or reproduces M1 for S1 batters independently from scratch. Confirms the decision follows from the numbers and the written rule.
- **reviewB**: reruns the output-consistency checks (verify scripts, `charts.mjs --check`, tag balance, PDF text and images, README/index/dashboard numbers) and greps all formats for stale numbers (old counts, old index values, old eligible counts, "inconclusive" wording that no longer holds).
- **gate**: reads `review.json` / `reviewA.json` / `reviewB.json`; `APPROVED` only when both reviewers approve.

## 7. Risks
- **Power in S1.** Only 3 batters are thin-exposed. M1 (thinning) is the high-power measure and the list-level metrics act as no-harm checks. A KEEP_CURRENT outcome is a legitimate result.
- **Anchors.** `sensitivity.mjs` and the harness patch `scoring.mjs` by text. Any adopted edit that moves the exclusion line, the `rollups` line or the `benchmark` line breaks `sensitivity.mjs`; update the anchors in the same commit and run `node sensitivity.mjs`.
- **Hard-coded verifiers.** Earlier verify scripts hard-code old values and absolute paths; copy and update them or they will report false failures.
- **Regression assumptions.** Unrecorded bye, leg-bye and wide-overthrow runs add noise (residual SD 2.9). The regression absorbs average run value per row type but not variation; the CI is wide (+/- 0.47 on `other`). If the CI contains both 0 and 1 the rule keeps (a).
- **Run time.** Harness 25-35 minutes; `sensitivity.mjs` 3-5 minutes. Use background runs with an explicit timeout.
- **Lists changed means Unstop re-entry.** If any list changes, the user must be warned; nothing is pushed and the user decides.
- **Browser compatibility.** `scoring.mjs` is imported by `dashboard.js`: no `node:` imports and no top-level `await`.
- **Scoring change radius.** C1 and C3 touch only profiles in thin strata (T20I batters 2023 and 2026 in S1). C2 shifts every index slightly and is the most likely to fail side-effect bound 5.

## Digest

Verified by reading: build and test commands are `node <script>.mjs` with Node 20.20.2 (no npm dependencies; `package.json` scripts `analyze`, `sensitivity`, `charts`). There is no unit-test framework; verification is the repo scripts and the copied `verify_*` scripts. Before any change, `node sensitivity.mjs --print-top10` and `node charts.mjs --check` pass on 450bd1a (the committed `sensitivity_data.json` says `analyzeMjsRegeneratesAnalysisDataIdentically: true`, and the earlier round recorded 0 mismatches). I did not run those two commands in this planning step; the implementer runs `node charts.mjs --check` first as a baseline.

| File | Block to change | Covered by | Notes |
|---|---|---|---|
| `analyze.mjs` | lines 60-78: `ILLEGAL_EXTRA_TYPES`, `OTHER_PENALTY` (line 68), `bowlerPenalty()` (line 75). Only if the Part A rule picks (b) or (c). | `node analyze.mjs --out=<tmp>` vs committed `analysis_data.json` | Expected untouched. |
| `analysis_data.json` | whole file, only if `analyze.mjs` changed | same | 22,988 records, 837 matches, SHA256 without `generatedAt` is `0a2efef1...ed2` in `sensitivity_data.json`. |
| `sensitivity.mjs` | `otherEvidence` block (lines 564-720, `runMarginCheck` at 667, `calibration` at 613); add `--other-evidence` flag near line 154; `SCENARIOS`/`runAnalyze` only if Part A flips; `ownPoolAlternative` only if Part B adopts | `node sensitivity.mjs --other-evidence`, then full `node sensitivity.mjs` | anchors at lines 145-148 must stay valid. |
| `poolsize_candidates.mjs` (new) | whole file; `PREREGISTERED`, candidates C1-C3, M1-M5, decision rule, `--selftest` | `node poolsize_candidates.mjs --selftest`, then the full run | Anchors on `scoring.mjs` lines 6, 102 (`rollups`), 97 (`benchmark`), 150-153 (z-score lines). |
| `poolsize_candidates_data.json` (new) | output | read by `charts.mjs`, docs | no timestamps. |
| `scoring.mjs` | only if ADOPT: `zScores` (25-33) and the strata loop (95-153), new `POOL_METHOD` constant after line 6 | exact equality with harness candidate output in S1 and S2; `POOL_METHOD = 'own-pool'` reproduces old lists | `ratePlayers` signature (line 51) unchanged. |
| `charts.mjs` | `COLUMNS` (196-204) and label strings; new table block for the candidate comparison; `sameList` guard at 27-32 stays | `node charts.mjs --check` | writes `charts/*.svg`, md and html marker blocks. |
| `methodology_report.md`, `.html` | headings listed in section 1 (lines 93, 243, 360, plus a new evidence section) | updated `verify_all`, `verify_claims`, `tag_balance` | md and html are parallel hand-written copies. |
| `methodology_report.pdf` | rebuilt from html | `verify_pdf.mjs` on extracted text, page images | 14 pages today. |
| `index.html`, `dashboard.js`, `README.md` | `index.html` method steps 01 and 07 (lines 184-190) and static radar rows; `dashboard.js` only if defaults change; README Files table (line 62 on), regeneration section (22-37), README line 6 reference | `radar_check.mjs`, number greps in `verify_claims` | |
| `.agents/tasks/round1-pool-other/` | `partA_result.md`, `partB_result.md`, `decision.md`, copied and updated `verify_*.mjs`, `scratch/` | reviewers | git-ignored. |

Facts verified from files: eligible 66/136/12 (submitted), batter pools T20I 12/5/11/12/6, IPL 17/13/12/17/12, bowler pools min 12 (T20I 2023 and 2026), `ratePlayers` takes about 98 ms on the committed data (5 calls), bootstrap shares per top-10 batter as listed in section 1, Node 20.20.2 at the portable path, Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` and `C:/Python314/python.exe` both exist.
