# Consolidated review: round1-pool-other (HEAD 08bebc4, base 450bd1a), second pass

**Verdict: APPROVED.** reviewA and reviewB both have approved true. No finding is blocking.

Sources: reviewA.md (decision logic, Part A and Part B reruns, list equivalence) and reviewB.md (consistency across md, html, PDF, README, index and dashboard).

## Summary

- The `other` extras reading (a) and `own-pool` rating are kept. The submitted lists are byte-identical to 450bd1a.
- reviewA reran `other_evidence.mjs --write` and `sensitivity.mjs --pool-methods` in a clean clone. Both data files show zero differing paths. The pre-registration commit bcbf2ee precedes the code (c83ff91) and the results (1a98041). No candidate passed, so KEEP_CURRENT is the mechanical outcome.
- reviewB reran the whole verification suite (verify_all, verify_claims, verify_pdf, verify_evidence, verify_index, charts check, sensitivity, analyze). All gave 0 failures. The earlier blocker (the `other` rule wrongly described as written before the result was known) is fixed in e998764 everywhere.

## Findings (all non-blocking)

1. **partB / docs (minor, confirmed):** `decision.md` omits some top-10 order changes for rejected candidates. These are the C2 shifts in S2 (Pant 1st to 2nd, Samson 2nd to 3rd, Suryakumar Yadav 6th to 5th), the S1 order shifts under C1, C2 and C3, and the S1 C2 bowler swap (Mohammad Nawaz 3rd to 2nd, Sunil Narine 2nd to 3rd). Add them, or point to the report's `pool_effects` table. No candidate was adopted, so no submitted list is affected. Raised by reviewA, and reviewB agrees that the C2 order line omits Pant, Samson and Surya.
2. **partA (informational, confirmed, disclosed):** The `other` rule was fixed after a scouting run and was not committed beforehand, so that test is not pre-registered. The report, README and index say so. Keep that wording, and do not describe the `other` test as pre-registered anywhere. Only the pool criterion was committed before it ran.
3. **partB / docs (informational, confirmed, disclosed):** `scoring.mjs` keeps the `poolMethod` option (default own-pool, output byte-identical to 450bd1a). The plan said to leave `scoring.mjs` untouched on KEEP_CURRENT. The option is needed for `node sensitivity.mjs --pool-methods`. `decision.md` discloses it, and the user decides whether to merge it.

## Residual caveats (already stated in the report)

- Run value of `other` is uncertain. If the penalty were zero, Connolly drops out of the batter list.
- Season-to-season correlation is near zero for every pool method, so M5 cannot separate them.
- Pressure cutoffs were not varied, and the T20I pools are small.
