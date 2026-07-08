# Indimi — Local language & accessibility insight tool

Design Track prototype for the **2026 POTRAZ AI for Impact Challenge (AI4I)**.

Indimi ("languages" in isiNdebele) turns the programme-provided dataset
`06_local_language_accessibility_feedback.csv` into a decision-support tool for
digital inclusion teams, service designers, and language technology teams.
Its thesis: **the national average hides the gap** — aggregate success rates look
healthy while minority-language users fail far more queries.

> ⚠️ All figures are synthetic aggregates provided for challenge design practice.
> They are **not official statistics** and the interface says so persistently.

## Run it (VS Code)

The dashboard fetches the CSV at runtime, so it must be served over HTTP
(browsers block `fetch` from `file://`).

**Option A — Live Server extension (recommended)**
1. Open this folder in VS Code.
2. Install the "Live Server" extension if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

**Option B — any static server**
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

No build step, no framework, no install. Plain HTML/CSS/JS.

## Structure

```
indimi/
  index.html          semantic structure, 4-step storytelling flow
  css/styles.css      design tokens, WCAG AA contrast, 44px targets, responsive 320–1920px
  js/i18n.js          EN / chiShona / isiNdebele UI dictionaries
  js/app.js           CSV binding (PapaParse), filters, charts, map, computed insights & actions
  data/06_local_language_accessibility_feedback.csv   programme-provided dataset (unmodified)
```

## How it meets the Design Track ToR

| ToR requirement | Where |
|---|---|
| Dynamic binding to provided dataset (C3, 20%) | `js/app.js` loads the CSV with PapaParse at runtime; every KPI, chart, map marker, insight and action is recomputed on filter change. No mock data. |
| 4-step storytelling flow (C2, 40%) | Sections 1–4: Overview KPIs → Data exploration (filters, charts, map) → Key insights → Recommended actions. Insights and actions are *generated from the filtered data*, not hard-coded. |
| WCAG 2.1 AA contrast ≥ 4.5:1 (C1, 40%) | All text/background pairs in `styles.css` tokens checked ≥ 4.5:1 (ratios noted in comments). |
| Touch targets ≥ 44×44px | All buttons, selects, summaries, and the language switch enforce `min-height: 44px`. |
| Screen-reader support | Skip link, landmarks, `aria-label`s on every canvas (updated with live values), `aria-live` filter status, and a **data-table alternative under every chart and the map**. |
| Responsive 320px–1920px | Fluid grids (`auto-fit/minmax`), clamp() type scale, tested breakpoints at 320/480/768/1160. |
| "Do not present as official statistics" | Persistent amber badge in the hero + footer statement, in all three languages. |
| Robustness & decision take-away | Accessible empty-state notice when filters match no records; hotspot CSV export and one-click trilingual briefing-summary copy so personas can carry findings into reports. |

## Languages

The full UI switches between **English, chiShona and isiNdebele** (EN / SN / ND
toggle, top right). `document.lang` updates with the toggle so screen readers
switch pronunciation.

> **Team to-do before submission:** the Shona and Ndebele strings in
> `js/i18n.js` are working drafts. Have them reviewed by native speakers and
> credit the reviewers in the proposal's asset register.

## Third-party assets (for the licensing register)

| Asset | Version | Licence | Use |
|---|---|---|---|
| PapaParse | 5.4.1 | MIT | CSV parsing / dataset binding |
| Chart.js | 4.4.1 | MIT | Bar & line charts |
| Leaflet | 1.9.4 | BSD-2-Clause | District map |
| OpenStreetMap tiles | — | ODbL (attribution shown on map) | Base map |
| Bricolage Grotesque | Google Fonts | OFL 1.1 | Display type |
| Instrument Sans | Google Fonts | OFL 1.1 | Body type |
| Dataset 06 | — | Programme-provided, challenge use only | All data |

No other third-party code, imagery, or icons are used.
