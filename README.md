# SupeRR Selector Dashboard

Round 1 entry for SupeRR Selector Season 2. The project ranks batters and bowlers by how they perform under pressure compared with their usual level, using the supplied IPL and T20I ball-by-ball data from 2022 to 2026.

- `analyze.mjs` classifies every delivery as pressure or ordinary and writes `analysis_data.json`.
- `scoring.mjs` turns those records into the batter, bowler and all-rounder rankings.
- `index.html`, `dashboard.js` and `styles.css` are a static dashboard that loads `analysis_data.json` and ranks players in the browser.
- `sensitivity.mjs` writes `sensitivity_data.json` (small-pool, `other`-extras, no-exclusion and robust-core checks). `charts.mjs` draws `charts/*.svg` and the sensitivity tables in the methodology report from the two JSON files.

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

The PDF is the html printed with headless Edge (adjust the path to `msedge.exe` if needed):

```bash
msedge --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=methodology_report.pdf file:///<folder>/methodology_report.html
```

The report text around the charts and tables is written by hand; `charts.mjs` only replaces what sits between the `<!-- chart:NAME -->` and `<!-- table:NAME -->` marker comments.

## Flip the exclusions (optional, not part of the submitted ranking)

The submitted lists exclude the 53 Pakistan T20I players, five IPL retirees (Pollard, Bravo, Rayudu, Karthik, Ashwin) and Mohit Sharma. To rank without them, change one line in `scoring.mjs` (line 6):

```js
const APPLY_PLAYER_EXCLUSIONS = false;   // submitted lists: true
```

- `analysis_data.json` is not regenerated; the dashboard shows the no-exclusion lists at once.
- `node sensitivity.mjs --print-top10` prints the lists `scoring.mjs` now gives. They equal the no-exclusion tables in the report (section "No-exclusion top 10 lists with full metrics") and `noExclusion` in `sensitivity_data.json`.
- While the line says `false`, `node sensitivity.mjs` and `node charts.mjs` stop with an error because they describe the submitted lists. Set it back to `true` first.
- The report, `README.md`, `index.html` (method step 06) and the Unstop entries are written by hand. The report section "Flip the exclusions" lists the no-exclusion names and the steps.

## Run the dashboard locally

```bash
npm install
npm start
```

Then open:

- http://127.0.0.1:4173

## Files

| File | Purpose |
|---|---|
| `analyze.mjs` | Builds `analysis_data.json` from the CSV files. |
| `analysis_data.json` | Generated player-match records and data-quality counts. |
| `sensitivity.mjs`, `sensitivity_data.json` | Sensitivity checks and their output (no timestamps). |
| `charts.mjs`, `charts/` | Report charts (SVG) and the code that places charts and sensitivity tables in the report. |
| `scoring.mjs` | Ratings, eligibility rules and player exclusions (`APPLY_PLAYER_EXCLUSIONS` switch on line 6). |
| `index.html`, `dashboard.js`, `styles.css` | Dashboard. |
| `server.mjs` | Small local static server for `npm start`. |
| `ball_by_ball.csv`, `matches.csv`, `competitions.csv` | Inputs read by `analyze.mjs`. |
| `competition_team_player_mapping.csv`, `playing_eleven.csv`, `teams.csv` | Supplied data pack files that `analyze.mjs` does not read. |
| `methodology_report.md`, `.html`, `.pdf` | Methodology report in three formats. |
| `Round 1 Problem Statement _ SupeRR Selector Season 2.docx.pdf` | The problem statement. |

## Reports

- [Methodology report (HTML)](methodology_report.html)
- [Methodology report (Markdown)](methodology_report.md)
- [Methodology report (PDF)](methodology_report.pdf)

The live site is published with GitHub Pages: https://shresht-72.github.io/SupeRR/

## Deploy publicly

This app is ready for deployment to a public web host such as Vercel or Netlify.

### Option A: Vercel

1. Push the project to a GitHub repository.
2. Import the repo in Vercel.
3. Deploy the project.
4. Use the generated public URL.

### Option B: Netlify

1. Push the project to GitHub.
2. Import it in Netlify.
3. Set the build command to: npm install
4. Set the publish directory to: .
5. Deploy.

> A local machine address like http://127.0.0.1:4173 is not public. To open the app from any machine at any time, it must be hosted on a public server.
