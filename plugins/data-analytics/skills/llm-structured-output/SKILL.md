---
name: llm-structured-output
description: Get reliable JSON out of LLM calls across providers (OpenAI-compatible, Anthropic, Gemini, Ollama, CLI-based models) and wire LLM calls into a data product safely — prompt-level JSON contracts, a defensive parser, schema and per-item validation, raise-vs-degrade decisions, config fallback chains, call logging and transaction hygiene. Use when writing a prompt that must return JSON, adding an LLM-backed endpoint, supporting several model providers, or debugging "the model returned garbage" failures.
---

# LLM structured output

When one code path must work on many providers, you cannot rely on a provider's JSON mode or tool calling. Use a
prompt-level contract, parse defensively, validate strictly, and decide per feature what a failure means.

## The contract (in the prompt)

- End the system prompt with the exact shape: `Return ONLY valid JSON with keys: answer (string),
  followUpQuestions (array of 0-3 strings), sqlQuery (string or null). No text outside the JSON.`
- For lists of objects, show one complete example object with every key and the allowed enum values.
- Give limits in the contract ("2 to 6 items", "reason under 120 characters") — they bound cost and parsing work.
- Ask for the output language explicitly (`Write all text in Brazilian Portuguese.`); "same language as the
  question" works for chat but not for generated artifacts (reports, onboarding questions).
- Keep the persona neutral. "You are a connectivity probe, reply OK" can trip injection guards; a plain task
  ("Reply with the digit 4 only. What is 2+2?") makes a better connection test.

## The parser

```python
import json
import re

_FENCE = re.compile(r"^\s*```[a-zA-Z0-9_-]*\s*\n?|\n?\s*```\s*$")


def parse_llm_json(text, expect=dict):
    """Parse a model reply that should be JSON. Returns the object or raises ValueError."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("empty model reply")
    cleaned = _FENCE.sub("", text.strip())
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        open_ch, close_ch = ("{", "}") if expect is dict else ("[", "]")
        start, end = cleaned.find(open_ch), cleaned.rfind(close_ch)
        if start == -1 or end <= start:
            raise ValueError("no JSON found in model reply") from None
        try:
            value = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON in model reply: {exc}") from None
    if not isinstance(value, expect):
        raise ValueError(f"expected {expect.__name__}, got {type(value).__name__}")
    return value
```

Keep exactly one copy of it. Ten copies drift: one forgets fence stripping, one reads `sql` instead of `sqlQuery`.
Code fields can also arrive fenced *inside* a JSON string (`"sqlQuery": "```sql\nSELECT …```"`) — strip fences from
those fields too before checking `startswith("SELECT")`.

## Validate, then decide

1. **Schema**: types, required keys, enums, lengths (Pydantic / a dataclass validator). Coerce what is safe
   (`"3"` → 3), reject the rest.
2. **Per item**: in lists, drop invalid items and keep the valid ones; do not fail the batch because one item is
   bad. When re-validating against your own data (columns, tables), validate items one at a time so one
   hallucinated column does not discard nine good suggestions.
3. **Against reality**: every column, table, metric or enum the model names must exist. The prompt saying "do not
   invent columns" is a hint, not a check.
4. **Failure policy per feature** — write it down:
   - *Raise* (user sees an error, can retry) when the output is the product: onboarding questions, generated
     reports. Never fabricate a fallback that looks like model output.
   - *Degrade* (empty list, heuristic, raw text) when the output is an extra: follow-up suggestions, relationship
     hints, a chart.
   - *Never* show an answer the model wrote before seeing data as if it were grounded (see `grounded-answers`).

## Calling the model

- One client function: `chat(messages, max_tokens, overrides) -> (content, usage, trace)`. No provider SDK calls
  outside it. Set `max_tokens` per call site (main answer ~2k, follow-ups ~300, chart plan ~900).
- One config mapper from your settings rows to client overrides. Duplicated mappers drop fields (a new provider's
  token silently falls back to an old one → 401s).
- Explicit fallback chain: workspace's model config → user's default config → environment defaults → a clear
  "no model configured" error. An opaque provider 401 is not an error message.
- Providers with one system string (Anthropic `system=`): concatenate system messages in one place.
- CLI-backed models: pipe the prompt through stdin (argument lists hit ARG_MAX), parse structured stream output for
  errors (stderr may be empty), strip conflicting credentials from the child environment, and mark token counts as
  estimates.
- Rate limits: honour `retry-after`; tell the user "try again in ~N s" instead of a stack trace.

## Logging

Log every call — including the small ones (chart plans, suggestions, onboarding): provider, model, input/output
tokens, latency, `stage` (`main`, `elaborate`, `refine_followups`, …), `channel` (ui, api, bot, scheduler),
tenant id, and a truncated trace (cap each message, e.g. 30k chars). Traces contain prompts and sample rows: scope
reads by tenant. Use POST for endpoints that spend tokens so caches never hide cost.

## Transactions

Never hold a database write transaction open across an LLM call. On SQLite, a `flush()` before a 20-second model
call locks the database for every other session ("database is locked"), including your own log writer. Read what
you need, close or commit, call the model, then write.

Related: `grounded-answers`, `text-to-sql`, `chart-spec`, `secure-data-platform`.
