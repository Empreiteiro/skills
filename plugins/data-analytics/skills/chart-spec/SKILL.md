---
name: chart-spec
description: Chart query results through a small validated JSON spec (bar, horizontal bar, line, pie) that an LLM or a heuristic proposes and deterministic code renders — never by executing model-written plotting code. Use when a data answer should come with a chart, when building chart generation into a data assistant, or when reviewing code that runs LLM-generated matplotlib/plotting scripts.
---

# Chart specs

Let the model choose *what* to show, never *run code* to draw it. The model (or a heuristic) returns a constrained
JSON spec; code validates it; a deterministic renderer draws it in any library (Recharts, Vega-Lite, matplotlib,
ECharts). This removes code execution risk and makes charts consistent, cacheable and testable.

## Spec

```json
{
  "suitable": true,
  "chartType": "bar | horizontal_bar | line | pie",
  "title": "Revenue by month",
  "subtitle": "2024, paid orders only",
  "xLabel": "month",
  "yLabel": "revenue (R$)",
  "categories": ["2024-01", "2024-02", "2024-03"],
  "series": [{"name": "revenue", "values": [10500.0, 12100.5, 13900.0]}],
  "insight": "March is the best month so far."
}
```

Constraints: ≤ 12 categories for bar/pie (lines can carry more points), ≤ 4 series, every series has exactly one
numeric value per category (null for a gap; no nulls in pie), pie = one series of non-negative parts.
`suitable: false` + `reason` when the answer should not be charted (single number, free text, a list of names).

## Workflow

1. Keep the first rows of every result with the answer (`chartInput`: ≤ 30 rows, JSON-safe values, row count,
   schema text). Generate charts **on demand** (a "chart" button) or only when the question asks for a trend,
   comparison or breakdown; cache the spec on the conversation turn so it is generated once.
2. Ask the LLM for the spec. Prompt essentials: "Return ONLY JSON with keys suitable, chartType (bar|horizontal_bar|
   line|pie), title, subtitle, xLabel, yLabel, categories, series [{name, values}], insight. Choose suitable=true only
   if the answer can be faithfully charted from the provided rows. At most 12 categories and 4 series. Numbers only."
3. Validate and normalize:
   ```bash
   python ${CLAUDE_SKILL_DIR}/scripts/chart_spec.py validate spec.json     # exit 0 valid, 1 invalid/unsuitable
   ```
4. If the LLM call fails or the spec is invalid, fall back to the heuristic:
   ```bash
   python ${CLAUDE_SKILL_DIR}/scripts/chart_spec.py suggest rows.json --question "Revenue by month"
   ```
   **Respect an explicit `suitable: false`** from the model — do not override it with the heuristic.
5. Render deterministically with one palette and theme. For visual design (colors, accessibility, dark mode, axis and
   label rules) use the `dataviz` skill if it is available.

## Choosing the chart (what the heuristic does)

- Time on the x axis (ISO dates, `month`, `year`, `*_at` columns) → `line`, sorted by time.
- Categories → `bar`; any label longer than ~18 characters → `horizontal_bar`.
- Parts of a whole, and the user asked for a share/breakdown, ≤ 6 non-negative parts → `pie`; otherwise bar.
- One row with several metrics → bar of those metrics. One value → no chart.
- Long tables (`month, region, sales`) → pivot to one series per group when there are ≤ 4 groups.
- Too many categories: for additive measures (counts, sums, revenue) keep the top N-1 and sum the rest into
  "Other"; for averages and rates keep the top N and say so. Never truncate silently — put it in a note.
- ID-like columns (`*_id`, `code`, `sku`) are labels, never series.

## Rules

- One shared enum of chart types used by the prompt, the validator, the renderer, and any report templates.
  Types that only one layer knows (`stacked_bar`, `scatter`, `histogram`) silently degrade into something else.
- Series length must equal category count; drop or reject mismatches, never pad.
- Values are numbers. Convert numeric strings, Decimal and numpy types before building the spec; NaN/inf → null.
- The spec is data, not code: never `exec` a plotting script produced by a model, even "just for display".
- Titles and labels come from the question and real column names; keep units in axis labels (`revenue (R$)`).
- Charts in emails or PDFs: render server-side from the same spec (e.g. matplotlib to PNG/base64) so the web and
  the report look the same.

## Scripts

`scripts/chart_spec.py` — standard library only.
- `suggest rows.json [--question Q] [--max-categories 12] [--max-points 100]` → heuristic spec or `suitable:false`.
- `validate spec.json` → `{valid, spec, notes}` or `{valid:false, errors}`; maps aliases (`column`→bar, `donut`→pie).
Exit 0 chartable/valid, 1 unsuitable/invalid, 2 usage or input error. `-` reads JSON from stdin.
