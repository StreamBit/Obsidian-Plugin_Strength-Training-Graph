# Strength Training Graphs

Strength Training Graphs is an Obsidian plugin that reads workout data from note frontmatter and gives you a dedicated chart screen for strength progression.

You can compare exercises over time, switch metrics, apply trendlines, view e1RM estimates, and open the source notes directly from chart points.

## Install

1. Download this project from GitHub.
2. Put these files in your vault at:
   `.obsidian/plugins/strength-training-graphs/`
   - `manifest.json`
   - `main.js`
   - `styles.css`
3. In Obsidian, open `Settings` -> `Community plugins` -> `Refresh Plugins`, then enable **Strength Training Graphs**.

## Release Package

- If you download from **GitHub Releases**, use the attached plugin files directly (`manifest.json`, `main.js`, `styles.css`).
- If you download the **source code ZIP** from the repo page, you may need to build first to generate `main.js`.

Build commands (only needed for source code checkout/ZIP):

```bash
npm install
npm run build
```

## Open the Graph Screen

- Click the ribbon icon (left sidebar), or
- Open Command Palette and run: `Open Strength Charts`

The chart opens as its own main tab-style screen.

## Required Note Format

Each workout note needs a date plus exercise fields in frontmatter.

```yaml
---
Date: 2026-03-05
Note Type: Training Entry

Bench Press Weight (lbs): 185
Bench Press Sets: 4
Bench Press Reps (per set): 6
Bench Press Modifier: 1
---
```

Supported weight units in field names:
- `Weight (lb)` / `Weight (lbs)`
- `Weight (kg)` / `Weight (kgs)`

Supported Property formats:
- `{exercise name} Weight (lbs):`
- `{exercise name} Sets:`
- `{exercise name} Reps (per set):`
- `{exercise name} Modifier:`

## Setup (First Run)

In plugin settings:
1. Choose note source:
   - Folder mode, or
   - Frontmatter match mode (property + value)
2. Set the date key (default: `Date`).
3. Optional: enable colorblind mode.

## What You Can Do

- Select multiple exercises (up to 16, or 8 in colorblind mode)
- Plot `Reps`, `Sets`, `Weight`, or `Volume`
- Switch volume units on-screen: `lbs`, `kg`, `US short tons`, `Metric tonnes`
- Filter by timeframe (presets or custom range)
- Toggle trendlines (`Moving average` or `Linear regression`)
- Hover points for full detail tooltip
- Click points to open the source note
- See summary stats (`Average`, `Max`, `Total`)
- See e1RM table for all selected exercises:
  - Epley Latest / Max
  - Brzycki Latest / Max
- Refresh data manually
- Copy chart as PNG
- Export visible chart data as CSV
- Use the `Modifier` property to multiply the volume by a given amount (I use this for tracking bilateral movements like dumbbell curls)
  - E.g. a value of `2` multiplies the volume by 2 for that day
  - default value is `1`

## Troubleshooting

- No data on chart:
  - confirm notes match source mode settings
  - confirm each included note has a valid date key
  - confirm exercise field suffixes match expected format *exactly*
- Use the diagnostics section at the bottom of the chart screen for indexing and parse issues.