# Pre-registration: thin T20I pools (Part B)

Written and committed before any candidate was run and before any rise or fall in a list was looked at. Repo copy: `pool_preregistration.md` (same text). Code base: `scoring.mjs` at 0008ad5 (method `own-pool`, the current one). Data: `analysis_data.json` as left by Part A (unchanged).

## Question

Each player is standardised (z-scores of four metrics) only against the other eligible players of the same format and season. Some T20I pools hold 5 to 12 players. Does a different pool rule make the index more stable without side effects that make it implausible?

## Settings and seeds

- S1 = submitted: no exclusions. S2 = the same data with `APPLY_PLAYER_EXCLUSIONS` true (batter T20I pools 10/5/10/10/6).
- Kinds: batters and bowlers separately. All-rounders only in the side-effect rules.
- PRNG mulberry32. Bootstrap seed 20261116 (1000 runs), pool deletion seed 20261117 (1000 runs), pool thinning seed 20261118 (500 runs), CI over season pairs seed 20261119 (1000 draws).
- Thin stratum = a format-season stratum with 10 or fewer eligible profiles in that setting (`THIN_POOL_MAX`).

## Candidates (parameters fixed)

For stratum P (kind k, format f, season s) with n eligible profiles, metric j, population mean/SD of the stratum mu_P, sigma_P. U = all eligible profiles of (k, f) over all seasons (mu_U, sigma_U, population, one value per profile). A z-score with SD 0 is 0 in every method.

- BASE (`own-pool`, current): z = (v - mu_P) / sigma_P.
- C1 (`format-fallback`): if n <= 10, standardise against mu_U, sigma_U; otherwise BASE.
- C2 (`shrunk`): for every stratum, mu = (n mu_P + 5 mu_U) / (n + 5), sigma^2 = (n sigma_P^2 + 5 sigma_U^2) / (n + 5).
- C3 (`adjacent-fallback`): if n <= 10, standardise against the union of the existing strata (k, f, s-1), (k, f, s), (k, f, s+1); if that union has 10 or fewer profiles use U; otherwise BASE.

Eligibility (60 pressure balls, 8 matches, 60 ordinary balls), the four metric definitions, weights 0.35/0.30/0.20/0.15, reliability, clipping and the all-rounder average are untouched in every candidate.

## Metrics (each method against its own full-data reference)

Stratum composite = 0.35 z_level + 0.30 z_change + 0.20 z_outcome + 0.15 z_consistency, per (kind, player, format, season) profile, before the roll-up.

- M1 pool-thinning error (primary). 500 runs. In each run, every stratum with more than 8 eligible profiles (full-data BASE strata, both kinds) keeps exactly 8 randomly chosen profiles; the records of the others are removed. Each surviving profile's composite is compared with the same profile's composite in the method's full data. M1 = RMSE of the differences (all runs, all profiles of the kind) divided by the SD of that method's full-data composites of the kind.
- M2 top-10 retention: mean share of the method's own full-data top 10 that is back in the top 10; M2a under pool deletion (20% of the eligible non-top-10 players of the kind removed, as in `sensitivity.mjs`), M2b under the match-level cluster bootstrap (as in `sensitivity.mjs`).
- M3 rank displacement of the method's top 10: mean over members and runs of |rank in run - full-data rank|; a member not eligible in a run counts as (eligible count in that run + 1). M3a pool deletion, M3b bootstrap.
- M4 leave-one-out exit rate: top-10 exits (rank above 10 or not eligible) summed over every drop run, divided by (10 x number of drop runs). Every eligible player of the kind is dropped in turn.
- M5 between-season consistency: Pearson r of the stratum composite of the same player in consecutive seasons of the same format and kind. M5-all uses all pairs; M5-thin uses pairs in which either stratum is thin in BASE. n pairs and a bootstrap 95% CI over pairs are reported; M5 is used only in the no-harm rule 3 (all pairs).
- Reproduction check: BASE bootstrap and pool-deletion top-10 shares in S1 must equal `rankStability` in the committed `sensitivity_data.json`. If not, the harness is wrong.

## Improves stability materially (all must hold)

1. M1 candidate <= 0.85 x M1 BASE in all four cells (S1, S2 x batters, bowlers).
2. In S2 for batters, at least one of: mean(M2a, M2b) rises by 0.02 or more; mean(M3a, M3b) falls by 10% or more (relative).
3. No harm in S1 and S2, batters and bowlers: M2a and M2b each >= BASE - 0.01; M3a and M3b each <= BASE + 0.5 ranks; M4 <= BASE + 0.005; M5-all >= BASE - 0.02.

## No implausible side effects (all must hold, S1 and S2)

4. Eligible counts (batters, bowlers, all-rounders) identical to BASE.
5. Players with no profile in a thin stratum ("large-pool players"): largest absolute index change <= 1.0 and largest absolute rank change <= 5. C1 and C3 must give exactly 0 index change for them (asserted).
6. Players with a profile in a thin stratum: largest absolute index change <= 5.0.
7. In S1, at most 3 of the top-10 names change versus BASE in each of batters, bowlers and all-rounders.

Index change = candidate index minus BASE index (as rated, 1 decimal); rank change = candidate rank minus BASE rank in the same kind's list.

## Decision rule (applied mechanically by the harness)

A candidate failing any of 1-7 is rejected. If exactly one passes, adopt it. If several pass, adopt the one with the larger mean relative M1 reduction over the four cells; if they are within 2 percentage points, adopt the one that changes fewer indexes in S1 (count of batter and bowler indexes that differ from BASE), then the simpler (C1, C3, C2). If none passes: KEEP_CURRENT, `scoring.mjs` default unchanged. The coder does not override the decision. Parameters (10, 5, 8, 0.85, thresholds, seeds) are not changed after results are seen.

## Implementation

`scoring.mjs` gets a `POOL_METHOD` constant (default `own-pool`) and a `poolMethod` option of `ratePlayers`, with the four methods. `node sensitivity.mjs --pool-methods` runs the tests for BASE and every candidate, labels BASE as the primary and C1-C3 as alternatives, and writes `pool_methods_data.json`, including the decision. The old method stays available whatever the decision.
