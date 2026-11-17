# SupeRR Selector Dashboard

Round 1 entry for SupeRR Selector Season 2. The project ranks batters and bowlers by how they perform under pressure compared with their usual level, using the supplied ball-by-ball data from 2022 to 2026. The methodology report is IPL-only: it covers the top 10 batters and the top 10 bowlers in the IPL and leaves T20I data out of its rankings and analysis. The dashboard still offers the All, IPL and T20I formats and opens on IPL, so its default lists are the ones in the report.
The submitted IPL lists exclude six confirmed IPL retirees (`APPLY_PLAYER_EXCLUSIONS = true` in `scoring.mjs`); the ranking with no exclusions is a labelled alternative with full metrics in the report (see below). The same switch also excludes the Pakistan T20I players, which only matters for the dashboard's All and T20I views. The report states that the index measures improvement over a player's own usual level under pressure, not absolute pressure quality, and explains in general terms why a high usual level can rank lower, with Cooper Connolly and Suryakumar Yadav as the worked example. The Royal Radar and Raw Talent section of the dashboard is outside the Round 1 submission.
A static dashboard (`index.html`) loads `analysis_data.json` and ranks the players in the browser; the method is written up in the methodology report.

- Live dashboard: https://shresht-72.github.io/SupeRR/
- Methodology report: [HTML](methodology_report.html), [Markdown](methodology_report.md), [PDF](methodology_report.pdf)
- Screenshots: [`screenshots/`](screenshots/) (see "Screenshots" below)
- Quick start: `npm start`, then open http://127.0.0.1:4173. Regenerate the analysis with `node analyze.mjs`.


- `analyze.mjs` classifies every delivery as pressure or ordinary and writes `analysis_data.json`.
- `scoring.mjs` turns those records into the batter, bowler and all-rounder rankings.
- `index.html`, `dashboard.js` and `styles.css` are a static dashboard that loads `analysis_data.json` and ranks players in the browser.
- `sensitivity.mjs` writes `sensitivity_data.json` (IPL-only `other`-extras, no-exclusion-alternative, threshold and robust-core checks, and re-sampling stability). `charts.mjs` draws `charts/*.svg` and the tables in the IPL methodology report from three JSON files (`analysis_data.json` through `scoring.mjs`, `sensitivity_data.json`, `other_evidence_data.json`).
- One assumption is tested in the report: how to read the undocumented `other` extras type. `other_evidence.mjs` runs the tests on IPL matches (its `iplMatches` scope); decision: illegal ball with a one-run penalty, as submitted. The decision rule was fixed in the plan after a scouting run and was not committed beforehand.

## Requirements

Node.js 18 or newer (`package.json` declares `engines.node >=18`). The project uses ES modules (`.mjs`), top-level `await` and `node:` imports. It has no npm dependencies.

## Regenerate the analysis

```bash
npm run analyze
```

This runs `node analyze.mjs`. It reads `ball_by_ball.csv`, `matches.csv` and `competitions.csv` from this folder and rewrites `analysis_data.json` (about 9 MB), then prints the data-quality counts. Run it again only if the CSV files or the pressure rules in `analyze.mjs` change.

## Regenerate the sensitivity numbers, charts and PDF

```bash
node sensitivity.mjs    # about 5 minutes, deterministic: rewrites sensitivity_data.json
node charts.mjs         # rewrites charts/*.svg and the chart and table blocks in methodology_report.md and .html
node charts.mjs --check # compares without writing; exits with an error on any difference
```
The two evidence files that `sensitivity.mjs` and `charts.mjs` read are rewritten separately:
```bash
node other_evidence.mjs --write       # tests of the `other` extras type -> other_evidence_data.json (a few seconds)
```
`pool_methods.mjs`, `pool_methods_data.json` and `pool_preregistration.md` are earlier all-format work on pooling the small T20I seasons. The IPL report does not use them. `node sensitivity.mjs --pool-methods` stops with an error by design; do not run it.
`node other_evidence.mjs` without `--write` prints the numbers as markdown. `ratePlayers(records, { poolMethod })` in `scoring.mjs` takes `own-pool` (default, submitted), `format-fallback`, `shrunk` or `adjacent-fallback`.

The PDF is the html printed with headless Edge (adjust the path to `msedge.exe` if needed):

```bash
msedge --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=methodology_report.pdf file:///<folder>/methodology_report.html
```

The report text around the charts and tables is written by hand; `charts.mjs` only replaces what sits between the `<!-- chart:NAME -->` and `<!-- table:NAME -->` marker comments.

## Switch the exclusions off (optional alternative, not the submitted ranking)

The submitted lists exclude six IPL retirees (Pollard, Bravo, Rayudu, Karthik, Ashwin, Mohit Sharma) (`APPLY_PLAYER_EXCLUSIONS = true`); the same switch also covers the Pakistan T20I players, which has no effect on the IPL lists. The alternative lists add back the first five retirees (Mohit Sharma stays excluded in every list). To rank without them, change one line in `scoring.mjs` (line 6):

```js
const APPLY_PLAYER_EXCLUSIONS = false;   // submitted lists: true
```

- `analysis_data.json` is not regenerated; the dashboard shows the no-exclusion lists at once.
- `node sensitivity.mjs --print-top10` prints the lists `scoring.mjs` now gives. They equal the alternative tables in the report (section "Submitted lists versus the no-exclusion alternative") and `noExclusionAlternative` in `sensitivity_data.json`.
- While the line says `false`, `node sensitivity.mjs` and `node charts.mjs` stop with an error because they describe the submitted lists. Set it back to `true` first.
- The report, `README.md`, `index.html` (method step 06) and the Unstop entries are written by hand. The report section "Switch the exclusions off" lists the no-exclusion names and the steps.

## Run the dashboard locally

```bash
npm start
```

There is nothing to install: the project has no npm dependencies. `npm start` runs `node server.mjs`, which serves this folder on http://127.0.0.1:4173 and listens on the local machine only. Set `PORT` to change the port, or `HOST=0.0.0.0` to let other machines on the network open it. The server answers `GET` and `HEAD` only, returns 403 for `..` paths and 404 for dotfiles such as `/.git/config`.

Then open:

- http://127.0.0.1:4173

`npm test` runs `node charts.mjs --check`, which compares the charts and tables in the report with what the data and `scoring.mjs` produce.

## Files

| File | Purpose |
|---|---|
| `analyze.mjs` | Builds `analysis_data.json` from the CSV files. |
| `analysis_data.json` | Generated player-match records and data-quality counts. |
| `sensitivity.mjs`, `sensitivity_data.json` | IPL-only sensitivity checks and their output (no timestamps). |
| `other_evidence.mjs`, `other_evidence_data.json` | Tests of how to read the `other` extras type (free hit, over length, run-margin regression) and their output; the report uses the `iplMatches` scope. |
| `pool_methods.mjs`, `pool_methods_data.json`, `pool_preregistration.md` | Earlier all-format pool-rule comparison for the small T20I pools. Not used by the IPL report; see above. |
| `charts.mjs`, `charts/` | Report charts (SVG) and the code that places charts and tables in the IPL report. |
| `scoring.mjs` | Ratings, eligibility rules, pool standardisation (`POOL_METHOD`, default `own-pool`) and player exclusions (`APPLY_PLAYER_EXCLUSIONS` switch on line 6). |
| `index.html`, `dashboard.js`, `styles.css`, `favicon.svg` | Dashboard and its icon. |
| `server.mjs` | Small local static server for `npm start`. |
| `vercel.json`, `.vercelignore` | Vercel static deployment settings and the files Vercel does not need. |
| `.github/workflows/deploy-pages.yml` | GitHub Pages deployment (publishes the whole folder). |
| `.github/deploy-pages-dashboard-only.yml.example` | Optional, not active: Pages workflow that publishes only the dashboard files. |
| `screenshots/` | Four PNG screenshots (dashboard default view, top batters, top bowlers, report page one). |
| `LICENSE`, `package.json`, `.gitignore` | MIT licence, scripts and metadata, ignore rules. |
| `ball_by_ball.csv`, `matches.csv`, `competitions.csv` | Inputs read by `analyze.mjs`. |
| `competition_team_player_mapping.csv`, `playing_eleven.csv`, `teams.csv` | Supplied data pack files that `analyze.mjs` does not read. |
| `methodology_report.md`, `.html`, `.pdf` | Methodology report in three formats. |
| `Round 1 Problem Statement _ SupeRR Selector Season 2.docx.pdf` | The problem statement. |

## Reports

- [Methodology report (HTML)](methodology_report.html)
- [Methodology report (Markdown)](methodology_report.md)
- [Methodology report (PDF)](methodology_report.pdf)

The live site is published with GitHub Pages: https://shresht-72.github.io/SupeRR/

## Screenshots

`screenshots/` holds four 1440 px wide PNG images taken with headless Edge from the dashboard files in this repository: `01-dashboard-default.png` (default view), `02-top-batters.png`, `03-top-bowlers.png` and `04-report-page-one.png` (first screen of the HTML report). The batters and bowlers images show the dashboard after the Batters or Bowlers tab is selected. They show the top ten of each list (the all-rounders tab is not pictured).

## Deploy the dashboard

The dashboard is a static site. It needs only these files, all in the repository root:

- `index.html`, `dashboard.js`, `styles.css`, `scoring.mjs` and `analysis_data.json` (the page loads `analysis_data.json` and `scoring.mjs` in the browser and calculates the rankings there).
- Optional extras: `favicon.svg` (browser tab icon), `methodology_report.html`, `.md` and `.pdf` with the `charts/` folder (the "Open report" links).

The raw CSV files (`ball_by_ball.csv`, `matches.csv`, `competitions.csv`, `playing_eleven.csv`, `teams.csv`, `competition_team_player_mapping.csv`) are not needed to run the dashboard. Only `node analyze.mjs` reads some of them. `styles.css` loads its fonts from Google Fonts; without internet access the page falls back to system fonts.

### A. GitHub Pages (already set up)

The workflow `.github/workflows/deploy-pages.yml` publishes the repository on every push to `main`, and it can be started by hand from the Actions tab.

1. On GitHub open the repository, then **Settings**, then **Pages** (under "Code, planning, and automation").
2. Under "Build and deployment", set **Source** to **GitHub Actions**. ([GitHub docs: configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site))
3. Push to `main`, or open the **Actions** tab, choose "Deploy static dashboard to GitHub Pages" and click **Run workflow**.
4. When the run is green, the URL is shown in the `deploy` job (environment `github-pages`) and on the Settings > Pages page. For this repository it is https://shresht-72.github.io/SupeRR/ (pattern: `https://<user>.github.io/<repository>/`).

### B. Vercel

This repository deploys to Vercel as static files with no serverless function: `vercel.json` sets no framework, no build command and the output directory `.`, and `.vercelignore` keeps the six raw CSVs and the `.agents`, `.git` and `.github` folders out of the upload ([Vercel docs on .vercelignore](https://vercel.com/docs/deployments/vercel-ignore)).

From the Vercel dashboard:

1. Sign in at https://vercel.com, choose **Add New > Project** and import the GitHub repository `ShReShT-72/SupeRR`.
2. Set **Framework Preset** to **Other**. Leave **Build Command** empty (no override) and set **Output Directory** to `.`. `vercel.json` already contains these values.
3. Click **Deploy**. Vercel shows the project URL (`https://<project>.vercel.app`) when the deployment finishes.

From the command line:

```bash
npm install -g vercel   # once
vercel login            # once
vercel --prod           # run in this folder; accept the defaults, answer "no" to any build or framework override
```

Check after deploying: open `/` (dashboard on IPL with 41 batters in the default list) and `/analysis_data.json`. If `/matches.csv` also opens, the CSVs were uploaded; the CLI honours `.vercelignore`, and for deployments from a Git import you can delete the CSVs from the repository or use the dashboard-only approach in section "Data terms" below.

### C. Netlify or Cloudflare Pages

- Netlify: make a folder that holds only the files listed above (plus `charts/` and the report files if you want them), then drag it onto https://app.netlify.com/drop.
- Cloudflare Pages: **Workers & Pages > Create > Pages > Connect to Git**, pick the repository, leave the build command empty and set the build output directory to the repository root (`/`).

### What was and was not tested

Tested here: the exact Vercel file set (all tracked files minus what `.vercelignore` excludes, 32 files) was served from a temporary folder with a plain static server and loaded in headless Edge. The page fetched `analysis_data.json` and `scoring.mjs` with status 200, ran the scoring in the browser and showed the same top-10 batters and bowlers as `scoring.mjs`, and every relative link in `index.html`, the report and the Markdown report resolved. `node server.mjs` was tested separately.
Not tested: a real deployment on Vercel, GitHub Pages (the live site predates this change), Netlify or Cloudflare Pages, and how Vercel treats `.vercelignore` for Git imports.

### Data terms: raw CSVs on GitHub Pages

`deploy-pages.yml` uploads the whole repository folder, so the raw CSV files from the data pack are public on the Pages site (for example `/matches.csv`), as well as in the repository itself. If the competition terms do not allow redistributing them, switch to the dashboard-only workflow that is prepared but **not applied**: `.github/deploy-pages-dashboard-only.yml.example`. It is a copy of the current workflow whose only change is that it copies the dashboard, report and chart files into a `_site` folder and publishes that. It sits outside `.github/workflows/`, so GitHub does not run it. The header of the file lists the steps. The file list it copies was checked against the repository; the workflow itself has not been run on GitHub. Removing files from the site does not remove them from the repository or its git history.

## Licence

The code and the methodology report are released under the MIT licence (see `LICENSE`, copyright 2026 ShReShT-72).

NOTICE: the licence covers the code and the report only. The supplied competition data files (the CSV files, and `analysis_data.json` derived from them) are not covered by it and stay under the competition's own terms.