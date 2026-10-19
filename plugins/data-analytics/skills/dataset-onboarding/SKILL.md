---
name: dataset-onboarding
description: Capture the domain knowledge a data assistant needs after a dataset is connected — clarifying questions, starter questions, KPI definitions, filter suggestions and scoped instructions — store it with an explicit scope, and inject it into every later question. Use when connecting a new data source or several sources together, when answers keep misreading columns or business terms, or when designing an onboarding flow for an analytics product.
---

# Dataset onboarding

Schemas say what columns exist, not what they mean. One short onboarding round after connecting a dataset
("Is `mrr` in cents?", "Which timezone are timestamps in?", "What counts as an active customer?") fixes most
wrong answers later. The output is a small, durable semantic layer that travels with every question.

## Workflow

1. Profile the data first (`dataset-profiling`). The onboarding prompt reads the stored profile; do not
   re-introspect a large warehouse synchronously inside an onboarding step.
2. Make ONE LLM call that returns four lists (schema below). Ask for:
   - **clarifications** (3–6): ambiguous names, units and currency, timezones, identifiers, status meanings,
     what "active", "paid", "churned" mean here. Each must be answerable by a person in one line.
   - **warm-up questions** (4–8): realistic starter questions this data can answer.
   - **KPIs** (2–6): name, one-line definition, and the tables/columns it reads. Only KPIs the data supports.
   - **filters** (0–5): `date` columns for range filters; `category` columns with a small set of real values
     taken from the profile's top values.
   Give an explicit language instruction ("Write all questions in Brazilian Portuguese").
3. Validate before showing: drop KPIs and filters whose columns are not in the schema; drop filter values not in
   the profile; dedupe questions case-insensitively. If the response cannot be parsed, fail visibly
   ("could not generate suggestions, retry") — never fall back to invented content.
4. Show everything as editable suggestions. The user answers clarifications, accepts/edits KPIs and filters, and can
   add free-text instructions for this dataset.
5. Save the assets with a scope (below) and stamp the dataset `onboarded_at`.
6. Inject the assets into every question (context block below), and show the same assets in the UI as chips.

## Output schema for the onboarding call

```json
{
  "clarifications": [{"question": "Is `amount` in cents or in reais?"}],
  "warmup_questions": [{"text": "What was the revenue by month in 2024?"}],
  "kpis": [{"name": "Monthly recurring revenue",
            "definition": "Sum of amount/100 for active subscriptions in the month",
            "dependencies": {"tables": ["subscriptions"], "columns": ["amount", "status", "period_start"]}}],
  "filters": [{"name": "Order date", "column": "created_at", "kind": "date", "config": {}},
              {"name": "Status", "column": "status", "kind": "category", "config": {"values": ["paid", "refunded"]}}]
}
```

## Several datasets at once

When the user connects or selects several datasets together, onboard them as a group:
- the profile becomes `{"kind": "multi_source", "sources": [...]}`;
- the prompt must probe relationships and conflicts explicitly: "Is `users.id` the same identifier as
  `orders.user_id`?", "Do both sources use the same timezone and currency?";
- KPIs and warm-ups should combine the sources where that is the point;
- store the group with its canonical (sorted, deduped) set of dataset ids, upserted idempotently.

## Storage and the one inclusion rule

Store every asset with `dataset_ids` (a set). Use ONE rule everywhere:

> an asset applies when `dataset_ids` is empty (global) or overlaps the datasets active in the current question.

Use the same rule for the prompt context and for the UI chips, so users see exactly what the model sees.
Pitfalls from real code: warm-ups stored on the workspace leaked into workspaces without that dataset;
group-level clarifications pinned to the first member only appeared when that member was active; group
instructions were saved but never read by the question path. Test that each saved asset reaches the prompt.

Edit vs first run: decide with the per-dataset `onboarded_at` stamp, not by counting existing assets
(global assets make a brand-new dataset look onboarded). Re-running onboarding replaces that dataset's assets.

## Context block (prepend to the system prompt of every question)

Plain text, one block, in this order, built best-effort (a failure here must never block answering):

```
Instructions for dataset `orders`:
<free-text instructions>

Known clarifications about the data:
- Q: Is `amount` in cents?
  A: Yes, divide by 100.

KPIs defined in this workspace:
- Monthly recurring revenue: Sum of amount/100 for active subscriptions in the month

<workspace / agent instructions>
```

A single system string behaves the same across LLM providers; structured multi-block system prompts do not.

## Filters across heterogeneous backends

When one filter must work for SQL databases, warehouses, spreadsheets and files, send it as a prose line in front
of the question instead of rewriting each backend's query:

```
Constraints: created_at BETWEEN 2024-01-01 AND 2024-03-31; status = "paid".

<user question>
```

Models follow this reliably. Keep the prefix out of the chat bubble, but remember it is part of the stored question
(history), and that the model may still ignore it — verify the executed query contains the filter when it matters.
KPI chips can insert just the KPI name into the question; the definition reaches the model through the context block.
