# Part B results: thin T20I pools

Decision (computed by the harness, not overridden): **KEEP_CURRENT**. No candidate meets every pre-registered rule. `scoring.mjs` default stays `own-pool`; no list, chart or dashboard value changes. `partB_lists.md` was not written because no default changed.

- Pre-registration: `pool_preregistration.md` (repo) = `.agents/tasks/round1-pool-other/preregistration.md`, commit bcbf2ee, before any candidate code or run.
- Code: commit c83ff91 (scoring.mjs switch `poolMethod`, `sensitivity.mjs --pool-methods`, `pool_methods.mjs`).
- Run: `node sensitivity.mjs --pool-methods`, once, 1000 bootstrap / 1000 pool-deletion / 500 thinning runs, leave-one-out over every eligible player, about 11 minutes. No crash, no rerun, no parameter or rule change.
- Data: `pool_methods_data.json` (all metrics, top-10 lists and movements for BASE and C1-C3 in S1 and S2, rule failures, decision). `sensitivity_data.json` is not touched.
- Harness check passed: BASE in S1 reproduces every top-10 bootstrap and pool-deletion share in the committed `sensitivity_data.json` (`rankStability`, 20 players x 2 tests). The instrumented BASE equals the shipped `ratePlayers`.
- Default and `poolMethod: 'own-pool'` give output byte-identical to the previous `scoring.mjs`.

## Setting

S1 = submitted (no exclusions). Thin pools (<=10 eligible): T20I batters 2023 (5) and 2026 (6). No thin bowler pool.
S2 = exclusions on. Thin pools: T20I batters 2022 (10), 2023 (5), 2024 (10), 2025 (10), 2026 (6). No thin bowler pool.
Candidates: C1 `format-fallback`, C2 `shrunk` (pseudo-count 5), C3 `adjacent-fallback`. Primary/BASE = `own-pool`. Eligible counts are identical for all methods (S1 66 batters / 136 bowlers / 12 all-rounders; S2 60 / 122 / 11).

## Metrics per cell (BASE, C1, C2, C3)

M1 = pool-thinning error (lower is better; primary). M2a/M2b = top-10 retention under pool deletion / bootstrap. M3a/M3b = mean rank displacement of the own top 10. M4 = leave-one-out exit rate. M5 = r between consecutive seasons, all pairs (n), 95% CI over pairs.

| cell | method | M1 | M1 / BASE | M2a | M2b | M3a | M3b | M4 | M5-all r (n) [95% CI] |
|---|---|---|---|---|---|---|---|---|---|
| S1 batters | BASE | 0.2396 | 1 | 0.916 | 0.449 | 0.89 | 16.76 | 0.0258 | -0.136 (32) [-0.483, 0.259] |
| | C1 | 0.2448 | 1.022 | 0.942 | 0.470 | 1.11 | 16.45 | 0.0303 | -0.114 (32) [-0.482, 0.271] |
| | C2 | 0.1640 | 0.685 | 0.956 | 0.466 | 0.58 | 16.44 | 0.0061 | -0.134 (32) [-0.476, 0.242] |
| | C3 | 0.2397 | 1.000 | 0.927 | 0.463 | 1.18 | 16.30 | 0.0015 | -0.119 (32) [-0.474, 0.266] |
| S1 bowlers | BASE | 0.3411 | 1 | 0.940 | 0.538 | 0.63 | 22.34 | 0.0118 | 0.094 (96) [-0.121, 0.282] |
| | C1 | 0.2803 | 0.822 | 0.949 | 0.538 | 0.60 | 22.34 | 0.0118 | 0.094 (96) [-0.121, 0.282] |
| | C2 | 0.2372 | 0.695 | 0.974 | 0.543 | 0.48 | 22.20 | 0.0007 | 0.102 (96) [-0.119, 0.288] |
| | C3 | 0.2961 | 0.868 | 0.949 | 0.538 | 0.60 | 22.35 | 0.0118 | 0.094 (96) [-0.121, 0.282] |
| S2 batters | BASE | 0.2261 | 1 | 0.920 | 0.444 | 1.01 | 16.33 | 0.0133 | -0.121 (32) [-0.468, 0.268] |
| | C1 | 0.1513 | 0.669 | 0.957 | 0.455 | 0.95 | 16.09 | 0.0267 | -0.124 (32) [-0.465, 0.204] |
| | C2 | 0.1541 | 0.682 | 0.934 | 0.455 | 0.50 | 15.59 | 0.0117 | -0.130 (32) [-0.468, 0.244] |
| | C3 | 0.1580 | 0.699 | 0.896 | 0.454 | 0.99 | 14.54 | 0.0350 | -0.134 (32) [-0.450, 0.205] |
| S2 bowlers | BASE | 0.3419 | 1 | 0.963 | 0.490 | 0.64 | 22.35 | 0.0008 | 0.119 (91) [-0.094, 0.331] |
| | C1 | 0.2516 | 0.736 | 0.923 | 0.490 | 0.67 | 22.32 | 0.0008 | 0.119 (91) [-0.094, 0.331] |
| | C2 | 0.2327 | 0.681 | 0.937 | 0.489 | 0.45 | 20.35 | 0.0123 | 0.124 (91) [-0.085, 0.336] |
| | C3 | 0.2832 | 0.828 | 0.973 | 0.491 | 0.57 | 22.28 | 0.0008 | 0.119 (91) [-0.094, 0.331] |

M5 (reported only, thin pairs): S1 batters thin pairs n=7, r BASE -0.350, C1 -0.423, C2 -0.416, C3 -0.411; S2 batters n=10, r BASE 0.098, C1 0.085, C2 0.077, C3 0.042. No thin bowler pairs. Every M5 CI spans zero for batters, so between-season consistency of the composite cannot separate the methods (it is near zero for all of them, including BASE).

## Rules, candidate by candidate

| rule | C1 format-fallback | C2 shrunk | C3 adjacent-fallback |
|---|---|---|---|
| 1 M1 <= 0.85 x BASE in all four cells | **fail** (S1 batters 1.022) | pass (0.68 to 0.70) | **fail** (S1 batters 1.000, S1 bowlers 0.868) |
| 2 S2 batters M2 +0.02 or M3 -10% | pass (M2 mean +0.024) | **fail** (+0.012; M3 -7.2%) | pass (M3 -10.4%) |
| 3 no harm | **fail**: M2a S2 bowlers 0.923 vs 0.963; M4 S2 batters 0.0267 vs 0.0133 | **fail**: M2a S2 bowlers 0.937 vs 0.963; M4 S2 bowlers 0.0123 vs 0.0008 | **fail**: M2a S2 batters 0.896 vs 0.920; M4 S2 batters 0.0350 vs 0.0133 |
| 4 eligible counts identical | pass | pass | pass |
| 5 large-pool players: index <= 1.0, rank <= 5 | pass (0 index change, max rank change 2 S1 / 3 S2) | **fail** (S1: Brian Bennett index 1.6; Mujeeb Ur Rahman rank 8) | pass (0 index change, rank change 2 / 3) |
| 6 thin-pool players: index <= 5.0 | pass (max 2.9 S1, 3.0 S2) | pass (1.2, 1.6) | pass (2.5, 3.1) |
| 7 S1 top-10 names changed <= 3 per list | pass (1 / 0 / 0) | pass (1 / 0 / 0) | pass (0 / 0 / 0) |
| **Result** | rejected | rejected | rejected |

Mean relative M1 reduction over the four cells (information only, used only if several passed): C1 18.8%, C2 31.5%, C3 15.1%.

Reading: pooling into a larger reference always lowers the pool-thinning error in S2 and, for bowlers, in S1, but the thin-pool fallbacks do not improve S1 batters (the setting that was submitted: only two thin pools, 5 and 6 players, and 3 batters with half their pressure balls there). C2 lowers M1 everywhere, but it moves 137 large-pool indexes in S1 (up to 1.6 points, rank up to 8) and loses retention in S2 bowlers. Leave-one-out exits and pool-deletion retention get worse in S2 for every candidate in at least one kind. So the pre-registered "no harm" rule is what blocks adoption. The criterion's primary metric (M1) shows a gain for some cells; the list-level metrics do not agree.

## What the candidates would have changed (information, nothing adopted)

Top-10 membership versus BASE; the default lists are unchanged.
- S1 (submitted): C1 batters Jos Buttler in (10th, 53.1, was 11th) and Namboori Tilak Varma out (10th 53.1 to 13th 52.9). C2 batters the same swap (Buttler 10th 53.2; Tilak Varma to 12th 53.0). C3 no name change. No bowler or all-rounder name changes under any candidate. Rinku Singh, Mohammad Nabi, Rasikh Salam and Benjamin Lister are not in the S1 top 10 in any method. In S2 BASE they are batters 10th (Rinku Singh) and 9th (Nabi), bowlers 9th (Rasikh Salam) and 10th (Lister); Rasikh Salam stays 9th under all candidates (no thin bowler pool), Lister stays 10th under C1 and C3.
- S2 (exclusions on): C1 batters Buttler 9th and Nitish Reddy 10th in, Nabi (9th to 11th) and Rinku Singh (10th to 12th) out. C2 batters Buttler in, Rinku Singh out (10th to 13th); bowlers Varun Chakravarthy in (10th), Benjamin Lister out (10th to 11th, 56.3 to 55.9). C3 batters Tilak Varma 9th and Buttler 10th in, Nabi (9th to 14th) and Rinku Singh (10th to 13th) out. Full rows: `pool_methods_data.json`, `methods[].top10VersusBase`.
- Every entry and exit is at places 9 to 13 and the index differences are small (for example Buttler 53.1 vs Tilak Varma 53.1 in S1 BASE), so the candidates reorder the tail of the list and do not correct a systematic error.

## Recommendation

Keep the current method (`own-pool`) as the default. The small-pool section of the report should say: the thin-pool concern is real in S2 (five T20I batter pools of 5 to 10), pooled standardisations reduce the pool-thinning error by about a third in that setting, but none improves list-level stability without a harm rule being broken, and in the submitted setting one swap at the tenth place is the whole effect.

## Limits

- M1 uses 8 retained profiles per stratum, which is inside the thin range by construction, and a stratum's full-data composite is the reference; it measures sensitivity to thinning, not accuracy against a true skill value.
- M2b/M3b (bootstrap) are close for all methods and dominated by the players' own sampling noise (top-10 retention about 0.45 to 0.54), which pool method cannot change.
- M5 pairs are few (32 batter pairs, 7 to 10 thin); all CIs span zero.
- The thresholds were fixed before the run and were not changed. A different threshold set could give a different decision; this was not tested.

## Decision point for the caller

`scoring.mjs` keeps the `poolMethod` switch (default `own-pool`) so that `node sensitivity.mjs --pool-methods` can reproduce this result. The plan's step 5 for KEEP_CURRENT said to leave `scoring.mjs` untouched; the task text for this step asked for the switch. The default behaviour is byte-identical. Reverting `scoring.mjs` to 0008ad5 would remove the switch and make `--pool-methods` fail its anchor check.
