---
name: grounded-answers
description: Write the final answer to a data question strictly from executed query results — two-phase generate/execute/elaborate, honest row counts and truncation, explicit failure messages, schema-validated follow-up questions, transparent queries and a stable response contract. Use when turning query results into a natural-language answer, when designing the answer step of a data assistant, or when answers contain numbers that are not in the data.
---

# Grounded answers

The model that writes the query has not seen the data. Anything it says before the query runs is a guess.
Ground the answer in a second step that only sees the question, the schema and the actual rows.

## Workflow

1. **Generate** — LLM call 1 returns the query (and optionally a short plan). Do not show its prose to the user.
2. **Execute** — validated, read-only, capped (`text-to-sql`). Record: executed query, `row_count` (true total if
   you can get it cheaply, e.g. a `COUNT(*)` or the driver's count), rows returned, cap, duration.
3. **Elaborate** — LLM call 2 gets: the question, the schema, the rows (≤ 50 in the prompt, serialized with
   `json.dumps(default=str)`), and a line like
   `Rows: showing 50 of 1,240 returned (query capped at 1,000; total matching rows: 18,532).`
   Rules for this call:
   - use only numbers that appear in the rows or are computed from them, and say which;
   - if rows are truncated, do not present partial lists as complete ("top 50 shown");
   - interpret, do not dump: summarize, rank, compare, and explain what a count or aggregate means;
   - answer in the user's language (pass it explicitly: "Answer in Brazilian Portuguese");
   - apply the domain context (KPI definitions, clarifications such as "amounts are in cents").
4. **Follow-ups** — ask for at most 3 candidates in the same call, then validate them against the schema (see below).
5. **Return** a stable contract (below), with the executed query attached.

## Failure and empty results

| Situation | Say this, not that |
|---|---|
| Query failed after retries | "I couldn't run the query (column `x` doesn't exist). Here is what I tried." — never the speculative first-pass answer with an error appended |
| No query produced | "This data doesn't contain what's needed to answer (no refunds table)." |
| 0 rows | "No orders match status = 'cancelled' in March 2024." Then suggest a likely cause (filter value casing, date range). Still run the elaboration step, with `0 rows returned` stated |
| Rejected by the guard | "The generated query tried to modify data and was blocked." |

Keep user-facing errors in the user's language and free of hostnames, connection strings or stack traces.

## Follow-up questions

- Candidates must be answerable with the available tables and columns; rewrite unanswerable ones into the closest
  answerable question or drop them. Validate with a small LLM call or by checking referenced columns.
- Clean deterministically: collapse whitespace, end with `?`, dedupe case-insensitively, keep ≤ 3.
- If parsing fails, return none rather than lines scraped from prose.
- Skip the validation call when the schema is empty, and do not refine the same list twice (a common duplicated
  LLM call).

## Response contract

Keep one shape for every source type and every channel (UI, API, chat bots):

```json
{
  "answer": "Revenue grew 12% in March to R$ 1.2M ...",
  "followUpQuestions": ["Which products drove the growth in March?"],
  "query": "SELECT date_trunc('month', created_at) AS month, SUM(amount)/100.0 AS revenue ...",
  "queryLanguage": "sql",
  "rowCount": 3,
  "truncated": false,
  "chartInput": {"rows": [...first 30 rows...], "rowCount": 3, "schemaText": "..."}
}
```

Normalize field names in one place (`sql`, `sqlQuery`, `pandasCode` → `query` + `queryLanguage`); when scripts
drift, the "show query" panel silently goes empty for some sources. Store `chartInput` with the turn so a chart can
be generated later on demand (`chart-spec`).

## Conversation history

- Replay the last N turns as question, answer AND executed query, so follow-ups ("only for Brazil", "by month") can
  modify the previous query. Prose-only history forces the model to re-derive everything.
- Bound history by turns and tokens; do not replay raw result rows.
- Filters applied as a `Constraints:` prefix (see `dataset-onboarding`) become part of the stored question; strip
  them for display, keep them for the model.

## Building this into an application

- Log each LLM stage separately (`generate`, `elaborate`, `followups`) with model, tokens and latency; costs and
  failures are per stage.
- Do not hold database write transactions open while waiting for the LLM.
- Let the user see the query (collapsed by default, copyable). Offer a "SQL only" mode that returns the query
  without running it — and make it behave the same for every source.
- Treat the answer text as untrusted when rendering (HTML-escape or render Markdown safely); it can echo data.
