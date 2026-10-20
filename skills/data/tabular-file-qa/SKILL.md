---
name: tabular-file-qa
description: Answer natural-language questions over CSV, TSV, Excel, JSON/JSONL or Parquet files by loading them into SQLite with clean types and querying them with guarded SQL instead of ad-hoc pandas code. Use when a user shares one or more data files and asks questions about them, or when building file-upload Q&A into an application.
---

# Questions over tabular files

The reliable path is: load once with clean types → profile → query with SQL → answer from the rows.
SQL over a typed table is easier to validate, explain and reuse than generated pandas code.

## Workflow

1. **Load and profile** every file into one SQLite database:
   ```bash
   P=${CLAUDE_SKILL_DIR}/../dataset-profiling/scripts/profile_dataset.py
   python $P orders.csv customers.xlsx --all-sheets events.jsonl --to-sqlite /tmp/qa.db > /tmp/qa_profile.json
   ```
   The output gives each table name (`sqlite.table`), the true row count, coerced types and warnings. Read the
   `notes`/`warnings` and tell the user about anything that changes the answer (truncation, unparsed dates).
2. **Write the SQL** against the table names printed by the loader (sanitized file stems such as `orders`,
   `customers_sheet1`). Put those exact names in the prompt or in your own reasoning; a prompt that says
   "the table is called `data`" while the schema lists `orders` produces broken queries.
3. **Guard and cap** the query:
   ```bash
   G=${CLAUDE_SKILL_DIR}/../text-to-sql/scripts/sql_guard.py
   python $G "$SQL" --dialect sqlite --limit 1000 --allowed-tables orders,customers_sheet1
   ```
4. **Run it read-only**: `sqlite3.connect("file:/tmp/qa.db?mode=ro", uri=True)`; fetch with a cap
   (`cursor.fetchmany(1000)`); for long queries set a progress handler that aborts after a time budget.
5. **Answer from the rows** (`grounded-answers`), stating the row count, and offer the SQL.
6. For follow-up questions reuse the same database; reload only when the file changes.

## Types: where file answers go wrong

- Spreadsheet exports and Google Sheets give every cell as text: `MAX` becomes lexicographic and `SUM` of
  `'1,234.50'` or `'R$ 10,00'` silently returns garbage in SQLite. Coerce before loading (the loader does).
- Decimal comma (`1.234,56`) with `;` delimiters is the norm in pt-BR/es/de exports.
- Excel dates may arrive as serial numbers (45291 = 2023-12-31): convert with origin 1899-12-30.
- Leading-zero codes (ZIP, CPF, SKU) must stay text.
- JSON lists inside records break `DataFrame.to_sql`; store them as JSON text or explode them into a child table
  with a foreign key (`order_id`) when the question needs them.
- Show the model flattened column names (`customer.id`), not the top-level document keys.
- Dates are stored as ISO text in SQLite: compare with ISO literals and group with `strftime('%Y-%m', col)`.

## Size and honesty

- Use the true row count from the loader. If you loaded a subset (`--max-rows`), say "analysed the first N of M
  rows" in the answer; a head is not a random sample (files are often sorted by date).
- Parse at ingest and fail cleanly: an upload that is stored before it is parsed and then fails leaves orphaned
  files. Enforce a byte limit on uploads.
- Load once and cache the database per file version; reloading and re-profiling the file on every question is slow
  and blocks request handlers.

## When pandas code is unavoidable

Some questions (pivoting nested JSON, fuzzy text work) are easier in pandas. Then:
- run the generated code in a separate process (subprocess or container) with a time limit and a memory limit;
  never `exec` it inside the server process — exposing `pd` alone gives filesystem access (`pd.read_csv('/etc/...')`)
  and restricted `__builtins__` is not a sandbox;
- require the code to assign the answer to a variable named `result` (say so in the prompt) instead of guessing
  which line is the "last expression";
- convert results before serializing: DataFrame → `head(N).to_dict("records")`, Series → `reset_index()`,
  numpy scalars → `.item()`, NaN/inf → null, timestamps → ISO strings;
- do not run the code twice on failure.
For document stores (MongoDB, Firestore), fetch lazily only when needed, push filters and projections down to the
store, cap the number of documents, and flatten before analysis.

## Building this into an application

- One loader and one profiler shared by upload, question answering, summaries, reports and any API/MCP entry
  point; duplicated loaders drift (one handles duplicate headers, another does not).
- Treat every file source the same way regardless of where it comes from (upload, S3, URL, Sheets, Excel
  Online): fetch → coerce → load → profile → SQL.
- Return the executed SQL (`queryLanguage: "sql"`) with each answer for transparency.
- Keep the dependency manifest complete (`openpyxl`, `xlrd`, `pyarrow`, connector SDKs); lazily imported optional
  libraries otherwise fail only in production.
