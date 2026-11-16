# Part A: the `other` extras type, evidence and decision

Reproduce with `C:/Users/shreshtb/AppData/Local/Temp/node20/node.exe other_evidence.mjs` from the repo root (Node 20.20.2, deterministic, two runs gave identical output). Full numeric output is appended below the summary. Interpretations: (a) illegal ball with +1 penalty run (submitted), (b) illegal ball, no penalty run, (c) legal ball, no penalty.

## Summary (all 867 matches in the file; the 837 in-scope matches give the same picture, figures in brackets)

| Test | What it checks | a | b | c | Strength |
|---|---|---|---|---|---|
| T0 field audit | cumulative or total fields | none exist | | | `ball_by_ball.csv` has no score, total or balls-left column; `matches.csv` has only result text. `innings_ball_num` equals the row index on 200,999 of 200,999 rows and advances on wide, Overstep and `other` rows. Exact comparison with official innings totals is impossible. |
| T1 free hit | non-run-out wicket on the next ball, normal rate 5.12% | 0 of 261 (257) | same | 261 expected 13.4 | Rejects c: P = 1.1e-6 (1.4e-6). Overstep control: 0 of 574, P = 8e-14. Cannot separate a from b. |
| T2 own-row dismissals | wickets on the row itself | 3 of 3 run-outs (2 of 2) | same | normal balls are 5.3% run-outs | Rejects c weakly: P(3 of 3 run-outs) = 0.00015 (0.0028). Overstep rows 5 of 5 run-outs. |
| T3 over length, 216 not-last overs with an `other` row (212) | legal balls in the over | 216 of 216 have exactly 6 | 216 of 216 | 0 of 216 have 6, 209 have 7, 6 have 8, 1 has 9 | Rejects c decisively. Overs without an `other` row: 30,406 of 30,410 have 6. Incl. last overs: 243 of 254 (239 of 249). |
| T3b innings with an `other` row that used the whole 20 overs | 120 legal balls | 137 of 139 (135 of 137) | 137 of 139 | 0 of 139 (all 137 have more than 120) | Rejects c decisively. Innings without `other`: 794 of 804. Matches with every checked `other` innings at 120: a 134 of 136, b 134, c 0 (132 of 134, 132, 0). |
| T4a exact run margin | innings 1 minus innings 2 equals the "Won by N runs" margin | 6 of 12 matches (6 of 11) | 5 of 12 | 5 of 12 | Almost no power. Only 1 match with an `other` row: India won by 61 runs, difference 61 under a, 60 under b and c. Matches without `other`: 5 of 11 reproduce, so exactness fails in 6 for reasons unrelated to `other` (probably unstored wide overthrows and bye or leg-bye runs; not tested). One match favours a. |
| T4b chase end | score before the last ball < target <= score after it, wicket-won chases, target = innings 1 + 1 | 12 of 16 (12) | 11 of 16 | 11 of 16 | Almost no power. 3 chases with an `other` row: a fits 2, b and c fit 1. |
| T4c run-margin regression | margin minus batter-run difference on (innings 1 minus innings 2) counts, 394 run-won matches, 107 with `other` (in scope 382 and 105) | `other` coefficient 1.108, HC1 95% CI [0.656, 1.559]; z vs 1 = 0.47, z vs 0 = 4.8 | b needs 0 | c needs 0 | Moderate. The interval contains 1 and excludes 0. Control: Overstep 0.897, CI [0.561, 1.233] contains 1. Without the extras_2_runs regressor `other` is 1.31 [0.84, 1.78]. Dropping the 5 largest residuals: 1.108 [0.661, 1.555]. In scope: 1.084 [0.630, 1.538]. Wide = 1.16, leg-bye 1.30, bye 2.06 (probably unstored overthrows; untested). |

b and c produce the same score, so the margin tests (T4) cannot tell them apart. T1 to T3b reject c. Only T4c separates a from b.

## Decision rule (plan section 3.1) applied
Provenance: the rule was fixed in the working plan before the committed run (0008ad5), but after a scouting regression had shown the direction (`other` 1.11, Overstep 0.90, expected reading "keep a"). It was not committed beforehand, so this is not a pre-registered test; only the pool test (bcbf2ee) is.

1. c rejected: T1 (0 of 261 at a 5.1% base), T2 (3 of 3 run-outs) and T3/T3b (0 of 216 overs and 0 of 139 innings reach the right length) all say no-ball variant.
2. a vs b: robust CI of `other` contains 1 and excludes 0 in the main fit, without extras_2_runs, with the 5 largest residuals dropped, and in scope only: verdict a in all four.
3. Control valid: Overstep CI contains 1 in all four fits.
4. Decision: keep (a). The evidence supports a, rejects c strongly, and separates a from b only moderately (one regression, whose `other` coefficient has SE 0.23; b is excluded at z = 4.8, but the exact reconstructions have almost no power). `analyze.mjs` and `analysis_data.json` are not changed, so the lists, charts and report numbers do not change from Part A.

## Evidence strength, stated plainly

- c (legal ball): ruled out. Over lengths and 120-ball innings are decisive, and the free-hit pattern matches Overstep.
- b (illegal, no penalty run): disfavoured by the regression only. The data cannot give an exact official total to check against; one clean match (India 61 runs) fits a and not b, and 2 of 3 chases fit a against 1 of 3 for b. These last two are anecdotes. The regression coefficient is near 1 with SE 0.23, so a is not proven, but b is about 4.8 SE away.
- The wide, leg-bye and bye coefficients are above 1 (1.16, 1.30, 2.06) and their intervals exclude 1 (wide 1.09 to 1.23, leg-bye 1.15 to 1.45, bye 1.71 to 2.42). Unstored overthrow and extra runs are a probable explanation. It was not tested, so it is not established that the regression has no bias for `other`. Only the Overstep control (0.90, interval contains 1) shows the regression can return a known one-run value.

---

# other_evidence.mjs output

## Scope and row profiles

```json
{
 "scope": {
  "ballRows": 200999,
  "matchesInBallByBall": 867,
  "inScopeMatches": 837,
  "matchesWithAnOtherRow": 215
 },
 "extrasTypeCounts": {
  "None": 189167,
  "wide": 7714,
  "legbyes": 2748,
  "byes": 529,
  "Overstep": 576,
  "other": 264,
  "Penalty": 1
 },
 "rowProfile": {
  "wide": {
   "rows": 7714,
   "extras1_runs": {
    "2": 7714
   },
   "extras_2_runs": {
    "0": 7714
   },
   "rowsWithBatterRuns": 0,
   "sixes": 0,
   "fours": 0
  },
  "Overstep": {
   "rows": 576,
   "extras1_runs": {
    "1": 576
   },
   "extras_2_runs": {
    "0": 555,
    "1": 12,
    "4": 9
   },
   "rowsWithBatterRuns": 337,
   "sixes": 47,
   "fours": 81
  },
  "other": {
   "rows": 264,
   "extras1_runs": {
    "5": 264
   },
   "extras_2_runs": {
    "0": 250,
    "1": 7,
    "4": 7
   },
   "rowsWithBatterRuns": 136,
   "sixes": 26,
   "fours": 42
  }
 }
}
```

## T0 field audit

```json
{
 "ballByBallColumnsLookingLikeTotals": [],
 "matchesColumnsLookingLikeTotals": [
  "revised_target"
 ],
 "inningsBallNumEqualsRowIndexInInnings": "200999 of 200999",
 "overBallNumEqualsRowIndexInOver": "200999 of 200999",
 "overBallNumAdvancesOnRowsOfType": {
  "wide": {
   "rowsFollowedBySameOverRow": 7703,
   "nextOverBallNumIsPlusOne": 7703
  },
  "Overstep": {
   "rowsFollowedBySameOverRow": 574,
   "nextOverBallNumIsPlusOne": 574
  },
  "other": {
   "rowsFollowedBySameOverRow": 262,
   "nextOverBallNumIsPlusOne": 262
  }
 },
 "note": "Both counters are plain row counters (they advance on wide, Overstep and other rows), so they carry no legal-ball information. matches.csv holds only the result text."
}
```

## all matches in ball_by_ball.csv

### T1_freeHit

```json
{
 "baseRate": 0.0512,
 "byTypeOfPreviousBall": {
  "None": {
   "n": 187499,
   "nonRunOutWicketOnNextBall": 9596,
   "rate": 0.0512
  },
  "wide": {
   "n": 7700,
   "nonRunOutWicketOnNextBall": 419,
   "rate": 0.0544
  },
  "legbyes": {
   "n": 2728,
   "nonRunOutWicketOnNextBall": 166,
   "rate": 0.0609
  },
  "byes": {
   "n": 486,
   "nonRunOutWicketOnNextBall": 29,
   "rate": 0.0597
  },
  "Overstep": {
   "n": 574,
   "nonRunOutWicketOnNextBall": 0,
   "rate": 0,
   "expectedAtNoneRate": 29.4,
   "exactBinomialProbabilityOfThisFewOrFewer": 8.013040147484515e-14
  },
  "other": {
   "n": 261,
   "nonRunOutWicketOnNextBall": 0,
   "rate": 0,
   "expectedAtNoneRate": 13.4,
   "exactBinomialProbabilityOfThisFewOrFewer": 0.0000011094467091694016
  }
 },
 "nextBallIsPlainLegbyeOrBye": {
  "None": {
   "n": 179824,
   "nonRunOutWicketOnNextBall": 9572
  },
  "wide": {
   "n": 7167,
   "nonRunOutWicketOnNextBall": 418
  },
  "Overstep": {
   "n": 517,
   "nonRunOutWicketOnNextBall": 0
  },
  "other": {
   "n": 232,
   "nonRunOutWicketOnNextBall": 0
  }
 }
}
```

### T2_ownRowDismissals

```json
{
 "None": {
  "rows": 189167,
  "wicketRows": 10832,
  "dismissalTypes": {
   "Bowled": 1775,
   "Caught": 7557,
   "Stump": 189,
   "RunOut": 576,
   "LBW": 709,
   "Retire Out": 6,
   "Hit Wicket": 17,
   "Obstracting the field": 2,
   "Obstructing the field": 1
  }
 },
 "wide": {
  "rows": 7714,
  "wicketRows": 40,
  "dismissalTypes": {
   "Stump": 25,
   "RunOut": 15
  }
 },
 "Overstep": {
  "rows": 576,
  "wicketRows": 5,
  "dismissalTypes": {
   "RunOut": 5
  }
 },
 "other": {
  "rows": 264,
  "wicketRows": 3,
  "dismissalTypes": {
   "RunOut": 3
  }
 },
 "runOutShareOfNormalDismissals": 0.0532,
 "probabilityAllOtherWicketsAreRunOutsIfNormal": 0.00015
}
```

### T3_overLength

```json
{
 "oversWithAnOtherRow_includingLastOverOfInnings": 253,
 "includingLastOvers": {
  "exactlySixLegalBalls_ifOtherIsIllegal": 243,
  "moreThanSixLegalBalls_ifOtherIsLegal": 243
 },
 "legalBallsPerOver_ifOtherIsLegal_notLastOvers": {
  "7": 209,
  "8": 6,
  "9": 1
 },
 "oversWithAnOtherRow_excludingLastOverOfInnings": 216,
 "interpretationAB_otherIsIllegal": {
  "oversWithExactlySixLegalBalls": 216,
  "oversWithMoreThanSix": 0,
  "oversWithFewerThanSix": 0
 },
 "interpretationC_otherIsLegal": {
  "oversWithExactlySixLegalBalls": 0,
  "oversWithMoreThanSix": 216,
  "oversWithFewerThanSix": 0
 },
 "baselineOversWithoutOtherRow": {
  "finishedOvers": 30410,
  "exactlySixLegalBalls": 30406
 }
}
```

### T3b_inningsBallCount

```json
{
 "withOtherRow": {
  "innings": 139,
  "legal120_AB": 137,
  "legal120_C": 0,
  "moreThan120_C": 137
 },
 "withoutOtherRow": {
  "innings": 804,
  "legal120_AB": 794
 },
 "matchesWhereEveryCheckedInningsWithAnOtherRowHasExactly120LegalBalls": {
  "a": 134,
  "b": 134,
  "c": 0,
  "matchesChecked": 136
 }
}
```

### T4a_T4b_marginReconstruction

```json
{
 "exactMargin": {
  "a": {
   "all": 6,
   "withOther": 1,
   "withoutOther": 5
  },
  "b": {
   "all": 5,
   "withOther": 0,
   "withoutOther": 5
  },
  "c": {
   "all": 5,
   "withOther": 0,
   "withoutOther": 5
  }
 },
 "wicketChaseEndConsistency": {
  "a": {
   "ok": 12,
   "okWithOther": 2
  },
  "b": {
   "ok": 11,
   "okWithOther": 1
  },
  "c": {
   "ok": 11,
   "okWithOther": 1
  }
 },
 "counts": {
  "runWonMatches": 12,
  "runWonMatchesWithOther": 1,
  "chaseWonMatches": 16,
  "chaseWonMatchesWithOther": 3
 },
 "runWonMatchesWithOtherRow": [
  {
   "matchId": "37940",
   "result": "India Won by 61 runs",
   "marginDiff": {
    "a": 61,
    "b": 60,
    "c": 60
   }
  }
 ]
}
```

### T4c_regression

```json
{
 "main": {
  "runWonMatchesUsed": 394,
  "ofWhichWithAnOtherRow": 107,
  "n": 394,
  "residualSD": 2.88,
  "coefficients": {
   "wide": {
    "estimate": 1.159,
    "robustSE": 0.036,
    "robustZvs0": 32.02,
    "robustZvs1": 4.39,
    "classicalCI95": [
     1.083,
     1.235
    ],
    "robustHC1CI95": [
     1.088,
     1.23
    ]
   },
   "Overstep": {
    "estimate": 0.897,
    "robustSE": 0.171,
    "robustZvs0": 5.23,
    "robustZvs1": -0.6,
    "classicalCI95": [
     0.615,
     1.179
    ],
    "robustHC1CI95": [
     0.561,
     1.233
    ]
   },
   "extras_2_runs": {
    "estimate": 1.042,
    "robustSE": 0.23,
    "robustZvs0": 4.53,
    "robustZvs1": 0.18,
    "classicalCI95": [
     0.618,
     1.466
    ],
    "robustHC1CI95": [
     0.591,
     1.492
    ]
   },
   "legbyes": {
    "estimate": 1.299,
    "robustSE": 0.077,
    "robustZvs0": 16.85,
    "robustZvs1": 3.88,
    "classicalCI95": [
     1.164,
     1.435
    ],
    "robustHC1CI95": [
     1.148,
     1.451
    ]
   },
   "byes": {
    "estimate": 2.064,
    "robustSE": 0.181,
    "robustZvs0": 11.42,
    "robustZvs1": 5.89,
    "classicalCI95": [
     1.709,
     2.418
    ],
    "robustHC1CI95": [
     1.71,
     2.418
    ]
   },
   "other": {
    "estimate": 1.108,
    "robustSE": 0.231,
    "robustZvs0": 4.81,
    "robustZvs1": 0.47,
    "classicalCI95": [
     0.638,
     1.577
    ],
    "robustHC1CI95": [
     0.656,
     1.559
    ]
   }
  }
 },
 "withoutExtras2Regressor": {
  "runWonMatchesUsed": 394,
  "ofWhichWithAnOtherRow": 107,
  "n": 394,
  "residualSD": 2.96,
  "coefficients": {
   "wide": {
    "estimate": 1.15,
    "robustSE": 0.038,
    "robustZvs0": 30.5,
    "robustZvs1": 3.98,
    "classicalCI95": [
     1.072,
     1.228
    ],
    "robustHC1CI95": [
     1.076,
     1.224
    ]
   },
   "Overstep": {
    "estimate": 1.044,
    "robustSE": 0.191,
    "robustZvs0": 5.48,
    "robustZvs1": 0.23,
    "classicalCI95": [
     0.761,
     1.328
    ],
    "robustHC1CI95": [
     0.671,
     1.418
    ]
   },
   "legbyes": {
    "estimate": 1.31,
    "robustSE": 0.079,
    "robustZvs0": 16.64,
    "robustZvs1": 3.94,
    "classicalCI95": [
     1.171,
     1.449
    ],
    "robustHC1CI95": [
     1.156,
     1.464
    ]
   },
   "byes": {
    "estimate": 2.089,
    "robustSE": 0.182,
    "robustZvs0": 11.45,
    "robustZvs1": 5.97,
    "classicalCI95": [
     1.725,
     2.454
    ],
    "robustHC1CI95": [
     1.732,
     2.447
    ]
   },
   "other": {
    "estimate": 1.31,
    "robustSE": 0.24,
    "robustZvs0": 5.46,
    "robustZvs1": 1.29,
    "classicalCI95": [
     0.835,
     1.785
    ],
    "robustHC1CI95": [
     0.84,
     1.781
    ]
   }
  }
 },
 "dropFiveLargestResiduals": {
  "runWonMatchesUsed": 389,
  "ofWhichWithAnOtherRow": 107,
  "n": 389,
  "residualSD": 2.72,
  "coefficients": {
   "wide": {
    "estimate": 1.165,
    "robustSE": 0.035,
    "robustZvs0": 32.88,
    "robustZvs1": 4.67,
    "classicalCI95": [
     1.093,
     1.238
    ],
    "robustHC1CI95": [
     1.096,
     1.235
    ]
   },
   "Overstep": {
    "estimate": 0.932,
    "robustSE": 0.173,
    "robustZvs0": 5.39,
    "robustZvs1": -0.39,
    "classicalCI95": [
     0.665,
     1.199
    ],
    "robustHC1CI95": [
     0.593,
     1.271
    ]
   },
   "extras_2_runs": {
    "estimate": 1.037,
    "robustSE": 0.231,
    "robustZvs0": 4.5,
    "robustZvs1": 0.16,
    "classicalCI95": [
     0.637,
     1.438
    ],
    "robustHC1CI95": [
     0.586,
     1.489
    ]
   },
   "legbyes": {
    "estimate": 1.228,
    "robustSE": 0.068,
    "robustZvs0": 18.11,
    "robustZvs1": 3.36,
    "classicalCI95": [
     1.098,
     1.358
    ],
    "robustHC1CI95": [
     1.095,
     1.361
    ]
   },
   "byes": {
    "estimate": 2.08,
    "robustSE": 0.18,
    "robustZvs0": 11.54,
    "robustZvs1": 5.99,
    "classicalCI95": [
     1.746,
     2.415
    ],
    "robustHC1CI95": [
     1.727,
     2.434
    ]
   },
   "other": {
    "estimate": 1.108,
    "robustSE": 0.228,
    "robustZvs0": 4.86,
    "robustZvs1": 0.47,
    "classicalCI95": [
     0.665,
     1.551
    ],
    "robustHC1CI95": [
     0.661,
     1.555
    ]
   }
  }
 },
 "ruleOnMain": {
  "otherRobustCI95": [
   0.656,
   1.559
  ],
  "overstepControlRobustCI95": [
   0.561,
   1.233
  ],
  "controlValid": true,
  "verdict": "a"
 },
 "ruleWithoutExtras2": {
  "otherRobustCI95": [
   0.84,
   1.781
  ],
  "overstepControlRobustCI95": [
   0.671,
   1.418
  ],
  "controlValid": true,
  "verdict": "a"
 },
 "ruleDropFive": {
  "otherRobustCI95": [
   0.661,
   1.555
  ],
  "overstepControlRobustCI95": [
   0.593,
   1.271
  ],
  "controlValid": true,
  "verdict": "a"
 }
}
```

## in-scope matches (IPL and T20I, 2022 to 2026)

### T1_freeHit

```json
{
 "baseRate": 0.0511,
 "byTypeOfPreviousBall": {
  "None": {
   "n": 180944,
   "nonRunOutWicketOnNextBall": 9253,
   "rate": 0.0511
  },
  "wide": {
   "n": 7464,
   "nonRunOutWicketOnNextBall": 409,
   "rate": 0.0548
  },
  "legbyes": {
   "n": 2643,
   "nonRunOutWicketOnNextBall": 159,
   "rate": 0.0602
  },
  "byes": {
   "n": 464,
   "nonRunOutWicketOnNextBall": 27,
   "rate": 0.0582
  },
  "Overstep": {
   "n": 563,
   "nonRunOutWicketOnNextBall": 0,
   "rate": 0,
   "expectedAtNoneRate": 28.8,
   "exactBinomialProbabilityOfThisFewOrFewer": 1.4638020356944635e-13
  },
  "other": {
   "n": 257,
   "nonRunOutWicketOnNextBall": 0,
   "rate": 0,
   "expectedAtNoneRate": 13.1,
   "exactBinomialProbabilityOfThisFewOrFewer": 0.0000013843925692571872
  }
 },
 "nextBallIsPlainLegbyeOrBye": {
  "None": {
   "n": 173505,
   "nonRunOutWicketOnNextBall": 9229
  },
  "wide": {
   "n": 6940,
   "nonRunOutWicketOnNextBall": 408
  },
  "Overstep": {
   "n": 507,
   "nonRunOutWicketOnNextBall": 0
  },
  "other": {
   "n": 229,
   "nonRunOutWicketOnNextBall": 0
  }
 }
}
```

### T2_ownRowDismissals

```json
{
 "None": {
  "rows": 182548,
  "wicketRows": 10439,
  "dismissalTypes": {
   "Bowled": 1690,
   "Caught": 7332,
   "Stump": 175,
   "RunOut": 551,
   "LBW": 666,
   "Retire Out": 6,
   "Hit Wicket": 17,
   "Obstracting the field": 1,
   "Obstructing the field": 1
  }
 },
 "wide": {
  "rows": 7474,
  "wicketRows": 39,
  "dismissalTypes": {
   "Stump": 25,
   "RunOut": 14
  }
 },
 "Overstep": {
  "rows": 565,
  "wicketRows": 5,
  "dismissalTypes": {
   "RunOut": 5
  }
 },
 "other": {
  "rows": 260,
  "wicketRows": 2,
  "dismissalTypes": {
   "RunOut": 2
  }
 },
 "runOutShareOfNormalDismissals": 0.0528,
 "probabilityAllOtherWicketsAreRunOutsIfNormal": 0.00279
}
```

### T3_overLength

```json
{
 "oversWithAnOtherRow_includingLastOverOfInnings": 249,
 "includingLastOvers": {
  "exactlySixLegalBalls_ifOtherIsIllegal": 239,
  "moreThanSixLegalBalls_ifOtherIsLegal": 239
 },
 "legalBallsPerOver_ifOtherIsLegal_notLastOvers": {
  "7": 205,
  "8": 6,
  "9": 1
 },
 "oversWithAnOtherRow_excludingLastOverOfInnings": 212,
 "interpretationAB_otherIsIllegal": {
  "oversWithExactlySixLegalBalls": 212,
  "oversWithMoreThanSix": 0,
  "oversWithFewerThanSix": 0
 },
 "interpretationC_otherIsLegal": {
  "oversWithExactlySixLegalBalls": 0,
  "oversWithMoreThanSix": 212,
  "oversWithFewerThanSix": 0
 },
 "baselineOversWithoutOtherRow": {
  "finishedOvers": 29345,
  "exactlySixLegalBalls": 29341
 }
}
```

### T3b_inningsBallCount

```json
{
 "withOtherRow": {
  "innings": 137,
  "legal120_AB": 135,
  "legal120_C": 0,
  "moreThan120_C": 135
 },
 "withoutOtherRow": {
  "innings": 773,
  "legal120_AB": 763
 },
 "matchesWhereEveryCheckedInningsWithAnOtherRowHasExactly120LegalBalls": {
  "a": 132,
  "b": 132,
  "c": 0,
  "matchesChecked": 134
 }
}
```

### T4a_T4b_marginReconstruction

```json
{
 "exactMargin": {
  "a": {
   "all": 6,
   "withOther": 1,
   "withoutOther": 5
  },
  "b": {
   "all": 5,
   "withOther": 0,
   "withoutOther": 5
  },
  "c": {
   "all": 5,
   "withOther": 0,
   "withoutOther": 5
  }
 },
 "wicketChaseEndConsistency": {
  "a": {
   "ok": 12,
   "okWithOther": 2
  },
  "b": {
   "ok": 11,
   "okWithOther": 1
  },
  "c": {
   "ok": 11,
   "okWithOther": 1
  }
 },
 "counts": {
  "runWonMatches": 11,
  "runWonMatchesWithOther": 1,
  "chaseWonMatches": 16,
  "chaseWonMatchesWithOther": 3
 },
 "runWonMatchesWithOtherRow": [
  {
   "matchId": "37940",
   "result": "India Won by 61 runs",
   "marginDiff": {
    "a": 61,
    "b": 60,
    "c": 60
   }
  }
 ]
}
```

### T4c_regression

```json
{
 "main": {
  "runWonMatchesUsed": 382,
  "ofWhichWithAnOtherRow": 105,
  "n": 382,
  "residualSD": 2.87,
  "coefficients": {
   "wide": {
    "estimate": 1.146,
    "robustSE": 0.037,
    "robustZvs0": 31.17,
    "robustZvs1": 3.97,
    "classicalCI95": [
     1.068,
     1.224
    ],
    "robustHC1CI95": [
     1.074,
     1.218
    ]
   },
   "Overstep": {
    "estimate": 0.882,
    "robustSE": 0.172,
    "robustZvs0": 5.11,
    "robustZvs1": -0.69,
    "classicalCI95": [
     0.598,
     1.165
    ],
    "robustHC1CI95": [
     0.543,
     1.22
    ]
   },
   "extras_2_runs": {
    "estimate": 1.048,
    "robustSE": 0.229,
    "robustZvs0": 4.58,
    "robustZvs1": 0.21,
    "classicalCI95": [
     0.625,
     1.47
    ],
    "robustHC1CI95": [
     0.6,
     1.496
    ]
   },
   "legbyes": {
    "estimate": 1.3,
    "robustSE": 0.078,
    "robustZvs0": 16.67,
    "robustZvs1": 3.85,
    "classicalCI95": [
     1.163,
     1.438
    ],
    "robustHC1CI95": [
     1.148,
     1.453
    ]
   },
   "byes": {
    "estimate": 2.038,
    "robustSE": 0.184,
    "robustZvs0": 11.1,
    "robustZvs1": 5.66,
    "classicalCI95": [
     1.681,
     2.396
    ],
    "robustHC1CI95": [
     1.678,
     2.398
    ]
   },
   "other": {
    "estimate": 1.084,
    "robustSE": 0.232,
    "robustZvs0": 4.68,
    "robustZvs1": 0.36,
    "classicalCI95": [
     0.614,
     1.555
    ],
    "robustHC1CI95": [
     0.63,
     1.538
    ]
   }
  }
 },
 "withoutExtras2Regressor": {
  "runWonMatchesUsed": 382,
  "ofWhichWithAnOtherRow": 105,
  "n": 382,
  "residualSD": 2.96,
  "coefficients": {
   "wide": {
    "estimate": 1.137,
    "robustSE": 0.038,
    "robustZvs0": 29.66,
    "robustZvs1": 3.56,
    "classicalCI95": [
     1.057,
     1.216
    ],
    "robustHC1CI95": [
     1.062,
     1.212
    ]
   },
   "Overstep": {
    "estimate": 1.032,
    "robustSE": 0.192,
    "robustZvs0": 5.36,
    "robustZvs1": 0.17,
    "classicalCI95": [
     0.746,
     1.317
    ],
    "robustHC1CI95": [
     0.655,
     1.409
    ]
   },
   "legbyes": {
    "estimate": 1.312,
    "robustSE": 0.08,
    "robustZvs0": 16.46,
    "robustZvs1": 3.91,
    "classicalCI95": [
     1.171,
     1.453
    ],
    "robustHC1CI95": [
     1.156,
     1.468
    ]
   },
   "byes": {
    "estimate": 2.062,
    "robustSE": 0.185,
    "robustZvs0": 11.13,
    "robustZvs1": 5.73,
    "classicalCI95": [
     1.694,
     2.431
    ],
    "robustHC1CI95": [
     1.699,
     2.426
    ]
   },
   "other": {
    "estimate": 1.29,
    "robustSE": 0.241,
    "robustZvs0": 5.34,
    "robustZvs1": 1.2,
    "classicalCI95": [
     0.813,
     1.766
    ],
    "robustHC1CI95": [
     0.817,
     1.763
    ]
   }
  }
 },
 "dropFiveLargestResiduals": {
  "runWonMatchesUsed": 377,
  "ofWhichWithAnOtherRow": 105,
  "n": 377,
  "residualSD": 2.71,
  "coefficients": {
   "wide": {
    "estimate": 1.153,
    "robustSE": 0.036,
    "robustZvs0": 32.07,
    "robustZvs1": 4.26,
    "classicalCI95": [
     1.08,
     1.226
    ],
    "robustHC1CI95": [
     1.083,
     1.223
    ]
   },
   "Overstep": {
    "estimate": 0.916,
    "robustSE": 0.174,
    "robustZvs0": 5.27,
    "robustZvs1": -0.48,
    "classicalCI95": [
     0.648,
     1.184
    ],
    "robustHC1CI95": [
     0.575,
     1.257
    ]
   },
   "extras_2_runs": {
    "estimate": 1.044,
    "robustSE": 0.229,
    "robustZvs0": 4.56,
    "robustZvs1": 0.19,
    "classicalCI95": [
     0.646,
     1.442
    ],
    "robustHC1CI95": [
     0.595,
     1.493
    ]
   },
   "legbyes": {
    "estimate": 1.227,
    "robustSE": 0.068,
    "robustZvs0": 17.93,
    "robustZvs1": 3.32,
    "classicalCI95": [
     1.095,
     1.358
    ],
    "robustHC1CI95": [
     1.093,
     1.361
    ]
   },
   "byes": {
    "estimate": 2.056,
    "robustSE": 0.183,
    "robustZvs0": 11.23,
    "robustZvs1": 5.77,
    "classicalCI95": [
     1.719,
     2.393
    ],
    "robustHC1CI95": [
     1.698,
     2.415
    ]
   },
   "other": {
    "estimate": 1.084,
    "robustSE": 0.229,
    "robustZvs0": 4.73,
    "robustZvs1": 0.37,
    "classicalCI95": [
     0.641,
     1.528
    ],
    "robustHC1CI95": [
     0.635,
     1.534
    ]
   }
  }
 },
 "ruleOnMain": {
  "otherRobustCI95": [
   0.63,
   1.538
  ],
  "overstepControlRobustCI95": [
   0.543,
   1.22
  ],
  "controlValid": true,
  "verdict": "a"
 },
 "ruleWithoutExtras2": {
  "otherRobustCI95": [
   0.817,
   1.763
  ],
  "overstepControlRobustCI95": [
   0.655,
   1.409
  ],
  "controlValid": true,
  "verdict": "a"
 },
 "ruleDropFive": {
  "otherRobustCI95": [
   0.635,
   1.534
  ],
  "overstepControlRobustCI95": [
   0.575,
   1.257
  ],
  "controlValid": true,
  "verdict": "a"
 }
}
```


