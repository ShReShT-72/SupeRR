# Independent review of the `other` extras and thin T20I pool decisions (second pass, HEAD 08bebc4)

Both decisions (keep the `other` reading a, keep `own-pool`) follow from numbers that I reproduced from scratch in a clean clone of 08bebc4 with Node 20.20.2. The submitted lists are unchanged from 450bd1a. The three provenance and documentation findings of the first pass are fixed in 58e0510, e998764 and 08bebc4. One minor completeness gap remains in decision.md for rejected candidates and does not block.

Watch for: (1) decision.md lists the S2 order changes for C1 and C3 fully but omits three shifts under C2 (Pant 1st to 2nd, Samson 2nd to 3rd, Suryakumar Yadav 6th to 5th) and does not itemise S1 order changes or the S1 C2 bowler swap (Nawaz and Narine); the figures it does give are correct (confirmed). (2) The `other` rule was fixed after a scouting run and not committed beforehand; this is now disclosed everywhere, so the `other` test is a consistency check and not a pre-registered test (confirmed). (3) The `scoring.mjs` `poolMethod` option stays in the branch although the plan said to leave `scoring.mjs` untouched on KEEP_CURRENT; decision.md discloses it and it changes no output (confirmed).

**Verdict**: APPROVED

## High-level view

Part A. I reran `node other_evidence.mjs --write` in the clone. `other_evidence_data.json` equals the committed file in every field (0 differing paths). I also recomputed the key counts from `ball_by_ball.csv` with a separate script: 264 `other` rows (extras1_runs is the constant 5 on all of them, so it is a type code), 3 wicket rows all run-outs, 216 overs with an `other` row that is not the last over, 216 with exactly six legal balls if `other` is illegal and 216 with seven to nine if legal (209, 6, 1). The free-hit counts (0 of 261, 0 of 574), the 137 of 139 innings, the margin checks (6 of 12 for a, 5 of 12 for b and c; chases 12, 11, 11 of 16) and the regression (other 1.108, HC1 0.656 to 1.559; Overstep control 0.897, 0.561 to 1.233) all equal decision.md. The data has no totals or cumulative fields (T0 audit: `innings_ball_num` is a row counter on 200,999 of 200,999 rows), so "exact match against official totals" can only be the low-power margin check, and the documents say so. The decision follows from the numbers: c is rejected by T1 to T3, and only the regression separates a from b. Strength is stated honestly as "c rejected, a preferred to b by one regression, run value uncertain", and a is kept. The decision does not overclaim.

Part B. I reran `node sensitivity.mjs --pool-methods` in the clone (about 12 minutes). `pool_methods_data.json` and `sensitivity_data.json` have zero differing paths against the committed files, the baseline reproduction check against `rankStability` reports true with no mismatches, and the decision is KEEP_CURRENT with no passers. The pre-registration bcbf2ee (18:29:50) precedes the code c83ff91 (18:33:55) and the results 1a98041 (18:46:44) by commit author and committer time, and `pool_preregistration.md` has no later change (`git diff bcbf2ee HEAD` on it is empty). Seeds, run counts, thin limit 10, keep 8, pseudo-count 5 and all thresholds in `pool_methods.mjs` equal the pre-registered text. C1, C2 and C3 are reported in decision.md, the report and both data files with their failed rules: C1 rules 1 and 3, C2 rules 2, 3 and 5, C3 rules 1 and 3. Since nobody passed, KEEP_CURRENT is the mechanical outcome and was not overridden.

Lists. Calling `ratePlayers` from 450bd1a's `scoring.mjs` and the new `scoring.mjs` on the same `analysis_data.json` gives byte-identical JSON for the default, `format: T20I` and `season: 2025`, with and without an explicit `poolMethod: 'own-pool'`. `analysis_data.json` and `analyze.mjs` have an empty diff against 450bd1a. The three top-10 tables in decision.md equal what I printed.

<details>
<summary>Issues (3)</summary>

1. **S2 and S1 order changes incomplete for rejected candidates (docs, partB, minor, confirmed)** — decision.md omits the C2 S2 shifts Pant 1st to 2nd, Samson 2nd to 3rd and Suryakumar Yadav 6th to 5th, the S1 order shifts under C1, C2 and C3, and the S1 C2 bowler swap (Mohammad Nawaz 3rd to 2nd, Sunil Narine 2nd to 3rd). Add them or point to the report's `pool_effects` table. Not blocking, because no candidate was adopted and no submitted list changes.
2. **`other` rule not pre-registered (partA, confirmed, disclosed)** — keep the current wording ("fixed in the plan after a scouting run, not committed beforehand") in the report, README and index; do not describe the `other` test as pre-registered anywhere else.
3. **`poolMethod` option kept in `scoring.mjs` (docs, partB, confirmed, disclosed)** — the plan said to leave `scoring.mjs` untouched on KEEP_CURRENT. The option is needed for `--pool-methods` and the default output is unchanged; the user decides whether to merge it.

</details>

<details>
<summary>Details</summary>

## Strength of the Part A decision

The regression is the only test that separates a from b. Its `other` coefficient (1.11) has a wide interval, and the wide, leg-bye and bye coefficients sit above 1 (1.16, 1.30, 2.06), with the wide interval (1.09 to 1.23) excluding 1. The report now calls the overthrow explanation for this untested and says only the Overstep control counts as valid. An upward bias of the size seen for wide would not bring the `other` interval to zero, since its lower bound is 0.66 and z against 0 is 4.8, so b stays rejected under that caveat. The undecided part is the run value, which is why the report keeps the no-penalty alternative (Connolly drops out of the batter list in that case). The rule picked a in all four fits (main, without the extras_2_runs regressor, five largest residuals dropped, in-scope only), and a is the status-quo default.

## Mechanical application of the Part B criterion

C2 meets the 0.85 M1 target in all four cells (0.684, 0.695, 0.682, 0.681) and has the largest mean M1 reduction (31.5%), but fails on S2 batter retention rise (0.012 against 0.02) and displacement fall (7.2% against 10%), on S2 bowler no-harm checks, and on rule 5 (Brian Bennett's index moves 1.6 in S1 against a limit of 1.0, Mujeeb Ur Rahman's rank moves 8 against 5). Some of these fail by small margins and rule 3 uses single-run estimates with a 0.01 tolerance. decision.md says that M1 measures dependence on pool membership, not accuracy, and that other thresholds could change the decision. Season-to-season correlation is near zero for every method including own-pool, so M5 cannot separate them and the index shows no between-season persistence; the report says so.

## Side effects in large pools and the effect on the top 10

I recomputed index and rank changes against own-pool with my own script for S1 and S2. C1 and C3 give identical indexes for every bowler (0 changes in all 136 and 122) and change batter indexes only where the player has a profile in a thin pool (11 and 10 batters in S1). C2 changes 61 batter, 87 bowler and 10 all-rounder indexes in S1 by at most 1.6, which is what rule 5 rejects. Rank moves are large only in the dense middle of the list (for example Daryl Mitchell 33rd to 17th under C1 in S1; likely a thin-pool player, since C1 only alters those). The all-rounder indexes also move slightly under C1 and C3 (Shivam Dube 47.3 to 47.0 and 47.1) because the all-rounder average reads the batter and bowler composites; no all-rounder name or rank changes in S1. Mark Chapman moves from 7th (56.0) to 1st under C1 (58.9) and C3 (58.5) and to 4th under C2 (57.2); decision.md and the report state this and the 76% pressure-ball share from the pool of five.

Membership and order under S2, recomputed with `APPLY_PLAYER_EXCLUSIONS` switched on in a copy of `scoring.mjs`: every entry and exit named in decision.md matches (C1: Buttler 9th at 53.0 and Nitish Reddy 10th at 53.0 in, Nabi and Rinku Singh out; C2: Buttler 10th at 53.2 in, Rinku Singh out, Varun Chakravarthy 10th at 55.9 in and Benjamin Lister out for bowlers; C3: Tilak Varma 9th at 53.2 and Buttler 10th at 53.0 in, Nabi and Rinku Singh out). The order lines match too, except the C2 shifts listed in the issues.

</details>

<details>
<summary>File map</summary>

Reproduced: `other_evidence.mjs` and `other_evidence_data.json`, `pool_methods.mjs` and `pool_methods_data.json`, `sensitivity_data.json`, `scoring.mjs` against 450bd1a. Read: `pool_preregistration.md`, `decision.md`, `methodology_report.md`, README and index wording. Reruns were done in a clone at `%TEMP%\rvA2`; no repo file was modified. Full diff: `git diff 450bd1a689cf186859f67c029b5366afcf6b09d9...HEAD`.

</details>
