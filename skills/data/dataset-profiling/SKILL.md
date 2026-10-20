---
name: dataset-profiling
description: Profile a tabular dataset once (true row count, clean types, missing values, cardinality, top values, ranges, candidate keys, filter candidates) and turn it into compact LLM context; includes a loader that fixes encodings, delimiters, decimal commas, currency strings and nested JSON. Use when a CSV/XLSX/JSON/Parquet file or a table is connected, before writing SQL or prompts against it, or when answers look wrong because of types.
---

# Dataset profiling

A profile is the cheapest, most reused artifact in a data assistant: it feeds the SQL prompt, the onboarding
questions, KPI suggestions, filter menus and data-quality warnings. Compute it once when the data arrives, store
it with the dataset, and refresh it only when the data changes. Do not recompute it on every question.

## Workflow

1. Load the data with clean types. For files use the script:
   ```bash
   python ${CLAUDE_SKILL_DIR}/scripts/profile_dataset.py data.csv                  # JSON profile on stdout
   python ${CLAUDE_SKILL_DIR}/scripts/profile_dataset.py book.xlsx --all-sheets    # one table per sheet
   python ${CLAUDE_SKILL_DIR}/scripts/profile_dataset.py big.csv --max-rows 200000 # cap rows loaded, exact count kept
   python ${CLAUDE_SKILL_DIR}/scripts/profile_dataset.py a.csv b.json --to-sqlite /tmp/work.db  # queryable copy
   ```
   For database tables, compute the same fields with SQL (`COUNT(*)`, `COUNT(DISTINCT c)`, `SUM(c IS NULL)`,
   `MIN/MAX`, `GROUP BY c ORDER BY COUNT(*) DESC LIMIT k` for low-cardinality columns) on a sample if the table is big.
2. Read `notes` (what was coerced) and `warnings` (what may mislead) before trusting any number.
3. Store the profile with the dataset (it is JSON) and build the LLM context from it (below).
4. Re-profile when the schema or data changes; keep the old one if you need to detect drift.

## What the script handles (and why each matters)

| Problem | Symptom if ignored | Handling |
|---|---|---|
| Latin-1 / cp1252 files | crash on upload, or mojibake | encoding fallback utf-8-sig → utf-8 → cp1252 → latin-1 |
| `;` delimiter | the whole row becomes one column | `csv.Sniffer` over a sample, candidates `, ; tab |` |
| Decimal comma `1.234,56` | 1.234 read as 1.234 or as text | detected per column, file-level hint when the delimiter is `;` |
| Currency / `%` / `(12.00)` | numbers stored as text | stripped and parsed; recorded in `notes` |
| Numbers stored as text (Sheets, Excel blanks) | `MAX` is lexicographic (`'9' > '100'`), `SUM` silently wrong | coerced when ≥95% of values parse |
| Leading-zero codes (`01001`) | ZIP codes/IDs lose zeros | kept as text, warned |
| Dates as text, day-first | wrong month/day, string sorting | parsed when ≥80% look like dates; day-first inferred from values |
| Excel serial dates (`45291`) | dates shown as numbers | warned when a date-named column holds 20000–60000 |
| Nested JSON | `to_sql` fails on lists, hidden fields | dicts flattened to `a.b` columns; lists/objects stored as JSON text |
| Blank / duplicate headers | silent `a.1`, `Unnamed: 3` | renamed to `column_N` / `a_2`, warned |
| Truncated loads | "how many rows?" answers the sample size | `rows` is always the true count; `sampled_rows` is what was analysed |

## Profile fields

`rows`, `sampled_rows`, per column: `dtype`, `semantic_type` (integer, float, boolean, datetime, categorical, text,
identifier), `missing`, `missing_pct`, `nunique`, `unique_ratio`, `top_values` (only for low-cardinality columns,
with counts), `min/max/mean/median/p25/p75` for numbers, `min/max` for dates, one `example`; plus `candidate_keys`,
`filter_candidates` (date columns and low-cardinality categories with their values), `notes`, `warnings`.

## Turning a profile into LLM context

Put this in the prompt, per table, in this order:
- table name, true row count, and whether statistics come from a sample;
- each column: name, type, semantic type, missing %, and either the range (numbers, dates) or the top values with
  exact spelling and case — the model needs `'Cancelled'` vs `'canceled'` to write a correct `WHERE`;
- candidate keys and known relationships (see `join-discovery`);
- 3–5 sample rows serialized with `json.dumps(..., default=str)`, never Python `str()` (NaN, Timestamp reprs leak).

Budget: for wide schemas, send every table name but full column detail only for tables relevant to the question
(name/description similarity), and cap top values (5–10) and sample rows. Say what was omitted.

## Pitfalls seen in production code

- Storing the sample size as `row_count` (a 1M-row file reported as 1,000 rows).
- Top-3 values only, no `nunique`: the model cannot tell a status column from free text.
- Profiling a 1,000-row head and presenting it as the dataset; heads are often sorted by date or id.
- Re-reading and re-profiling the full file on every question (slow, blocks the server).
- Profiling with one loader and answering with another that parses types differently.
- Dropping duplicate column names silently; the model then references a column that does not exist.

## Scripts

`scripts/profile_dataset.py` — needs pandas; openpyxl for .xlsx, xlrd for .xls, pyarrow for .parquet.
Output: one JSON object (one table) or a list (several). Exit 0 ok, 1 a file failed to load, 2 usage error.
`--to-sqlite` writes datetimes as ISO text and booleans as 0/1 so SQLite comparisons and sorting work.
