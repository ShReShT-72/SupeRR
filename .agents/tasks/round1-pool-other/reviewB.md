# reviewB: consistency across formats (round1-pool-other, HEAD 08bebc4, base 450bd1a), second pass
Verdict: APPROVED. I reran the checks myself (Node 20.20.2, repo root). No number is stale in any format, and the earlier blocker is fixed.

## Prior blocker (docs, part A): fixed
The earlier pass found that the report, README and index.html said the `other` test used a rule "written down before the result was known". The plan shows a scouting run before the rule, and the rule was never committed beforehand.
Commit e998764 rewrote this everywhere. md lines 12, 144, 459 and 481, the html copies, README line 9, index.html method step 07 and the PDF now say the pool criterion was committed before any candidate ran (bcbf2ee), and the `other` rule was fixed in the plan after a scouting run and was not committed beforehand. "Committed before" now appears only for the pool test. The word "beforehand" in the PDF at the pool-limits sentence refers to the pool thresholds, which is correct. The wide, leg-bye and bye coefficients explanation is now marked "probable cause ... not tested", and the wide interval (1.09 to 1.23, data: HC1 1.088 to 1.23, estimate 1.159) is stated to exclude 1. The decision.md S2 changes for C1, C2 and C3 were added in 08bebc4.

## Reruns
| Check | Result |
|---|---|
| `git diff 450bd1a..HEAD -- analyze.mjs analysis_data.json dashboard.js server.mjs` | empty: analyze.mjs, analysis_data.json and dashboard.js are untouched |
| `node analyze.mjs --out=<temp>` vs committed analysis_data.json | identical apart from `generatedAt` (my comparison; check_analyze.mjs also prints true) |
| scoring.mjs on committed analysis_data.json (old_vs_new.mjs, 450bd1a vs now) | top 10 of batters, bowlers and all-rounders identical, 66/136/12 eligible, full ratePlayers output byte-identical |
| `node charts.mjs --check` | ok: 6 chart files and 22 chart/table blocks match |
| `node sensitivity.mjs` | "primary lists match scoring.mjs: true; analyze.mjs regenerates analysis_data.json identically: true". sensitivity_data.json byte-identical (git status clean). Labels read "primary (submitted): no exclusions, `other` = illegal ball + 1 penalty run" and "alternative ..." |
| `node sensitivity.mjs --print-top10` | prints the submitted top 10 (Pant 58.4 first) |
| `node other_evidence.mjs --write` | other_evidence_data.json byte-identical |
| verify_all.mjs, verify_claims.mjs | TOTAL MISMATCHES 0, FAILS 0 |
| PDF text re-extracted by me from the committed PDF (pdfx_edge.py) | equals committed pdf_text.txt (16 pages) |
| verify_pdf.mjs on my extraction | 16 pages, missing/failed 0 |
| verify_evidence.mjs md, html, my PDF text | EVIDENCE CHECK FAILS 0 |
| verify_index.mjs on a fresh headless Edge DOM dump of `node server.mjs` | INDEX/README FAILS 0 (default view = scoring.mjs top-10 batters; 837 matches, 193,988 deliveries, 81,806 pressure balls, 66 eligible; 10 static radar rows; README files exist) |
| tag_balance on methodology_report.html, index.html, dashboard.js | ok, ok, ok |
The earlier round1-fixes verify_tables.mjs, verify_report.mjs and verify_pdf.mjs are superseded by verify_all, verify_claims and verify_pdf in this task. I did not run the old copies.
The sentence-level check of html against the PDF text: 94 paragraphs, 0 sentences missing from the PDF. PDF and html were last committed together in e998764, so the PDF was rebuilt from the final html.

## Independent spot checks (well over 15)
- 30 top-10 rows (batters, bowlers, all-rounders) from my own `ratePlayers` run: names and indexes found in md, html and PDF (180 of 180 checks). Examples: Pant 58.4, Samson 58.3, Connolly 58.2 (batters); Umran Malik 61.4, Narine 61.3, Nawaz 61.2 (bowlers); Sundar 53.6, Raza 51.9, Jadeja 51.5 (all-rounders). The dashboard DOM shows the same top ten batters.
- Robust-core cells: Pant 1/1/1/1, Burl 5/4/4/3, Chapman 7/6/5/4, Umran Malik 1/2/3/3, Washington Sundar 6/6/4/4 present in md and html, PDF contiguous.
- Evidence figures, 34 values times three formats (102 checks, 0 missing): 0 of 261, 13.4, 1.1e-6, 8.0e-14, 0.00015, 0 of 574, 3 of 3, 137 of 139, 394, 107, 1.11, 0.66 to 1.56, 0.90, 0.56 to 1.23, z = 4.8, 1.09 to 1.23, 2.9 runs, M1 ratios 1.022/0.822/0.669/0.736/0.684/0.695/0.682/0.681/0.868/0.699/0.828, Brian Bennett, Mujeeb Ur Rahman, 76%, bcbf2ee, c83ff91.
- decision.md S2 statements checked against pool_methods_data.json: C1 batters (Buttler 9th and Nitish Reddy 10th in, Nabi and Rinku Singh out, Chapman 1st, Burl 6th, Surya 5th), C2 (Buttler 10th in, Rinku out, Connolly 1st, Varun Chakravarthy in and Lister out among bowlers), C3 (Tilak Varma 9th, Buttler 10th in; Chapman 4th, Burl 5th, Miller 7th, Phillips 8th) and the Curran/Axar swap all agree. The C2 order line omits Pant, Samson and Surya moving one place; the report's pool_effects table has them. Not a blocker.
- Pages 1, 3 and 14 viewed as images (all 16 pages rendered): the layout is clean, with no clipped table and no stranded heading. Page 1 shows the exclusion policy, the corrected "Two assumptions tested" callout, the Outside Round 1 callout and the top-10 batters. Page 3 has the bowler chart and the all-rounder table. Page 14 has the regression table and text, the pool criterion, the rule table and the results table.

## Other requirements
- Obsolete caveats: no "inconclusive" run-margin text in md, html or README. The still-valid ones stay (pressure cutoffs not varied, small T20I pools, run value of `other`, Connolly dropping out if the penalty were zero).
- Radar and Raw Talent appears only on the dashboard with its outside-Round-1 notice, and in md, html and PDF only as the "Outside Round 1" callout. README carries the same notice. verify_index confirms the notice in index.html.
- decision.md opens with "Lists: no change" and the old/new side-by-side. Old = 450bd1a, matching my old_vs_new run (identical, so there are no entering or leaving players).
- Git: `git status` clean. `main` and `origin/main` = 450bd1a. The reflog shows only commits and one checkout, with no push, merge or fetch. Remotes origin and upstream, no remote-tracking change. The branch has 12 commits, each with a logical scope and the results recorded in the message (the pre-registration commit bcbf2ee precedes c83ff91 and 1a98041).
- `scoring.mjs` keeps a `poolMethod` option (default own-pool, output byte-identical to 450bd1a). decision.md discloses it as an open point.

## Findings
None blocking.
