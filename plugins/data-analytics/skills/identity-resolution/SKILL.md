---
name: identity-resolution
description: Unify customer records from several sources (CRM, orders, events, support) into one profile per person — key normalization, deterministic matching with union-find, hub-key detection, optional probabilistic matching, golden-record survivorship and segments. Use when building a customer data platform or "single customer view", deduplicating contacts, joining sources that share no clean id, or reviewing an LLM-proposed identity join.
---

# Identity resolution

Do not let an LLM "resolve identities" by writing a `JOIN … ON email`. That handles neither formatting differences
nor transitive links, and a single shared value (a call-center phone, a family email) silently merges strangers.
Use code: normalize → exact keys → union-find → review warnings → (optionally) fuzzy matching with thresholds.

## Workflow

1. **Inventory keys per source.** Which columns identify a person: email, phone, an external id shared across
   systems, document number. Ask the user when a column's meaning is unclear (is `customer_id` in orders the same
   id as `id` in the CRM?). Record the mapping explicitly.
2. **Normalize.**
   - Email: trim, lowercase, strip `mailto:` and `<>`, validate shape. Gmail only: dots and `+tag` are ignored by
     the provider, so `Joao.Silva+promo@googlemail.com` = `joaosilva@gmail.com`. Do not apply that to other domains.
   - Phone: digits only, then E.164 (`+<country><national>`): `+`/`00` means already international; otherwise strip
     trunk zeros and prepend the default country code. Use the `phonenumbers` library in production; the heuristic
     in the script is for exploration.
   - Ids: trim; decide case sensitivity explicitly.
   - Drop junk: empty, `n/a`, `null`, `test@test.com`, `00000000`, `12345678`, placeholder domains your data uses.
3. **Match deterministically.** Each record links to its normalized keys; records sharing any key are one cluster
   (union-find, transitive). Unified id = hash of the cluster's smallest key, so it is stable across runs while that
   key stays in the cluster.
4. **Review warnings before trusting clusters.**
   - Hub keys: one value linking many records (support line `0800…`, shared family or office email). Exclude them
     from linking or link only when a second key agrees.
   - Clusters with many distinct emails or very large clusters are almost always chain merges.
   - Records with no usable key stay singletons; report how many.
5. **Optional probabilistic pass** for leftovers (name + city + birth date, typo'd emails): score pairs within
   blocks (same postcode, same email domain), set explicit accept/review thresholds, and send the review band to a
   human. Never auto-merge on a single fuzzy attribute.
6. **Golden record (survivorship).** Per attribute choose a rule and record it: source priority (CRM > orders >
   events for name), most recent non-null (address, phone), most frequent (city), or union (all emails). Keep
   lineage: which source and record supplied each value.
7. **Persist the mapping** `(source, source_record_id) → unified_id` with the run id. When a later run merges two
   clusters, keep an alias table so old unified ids still resolve.

## Enrichment and segments

- Compute metrics from the unified mapping with plain SQL: lifetime value, order count, first/last purchase,
  recency in days, average ticket, channel mix.
- Express segments as validated rule specs, not free SQL fragments:
  `{"name": "VIP", "all": [{"metric": "lifetime_value", "op": ">", "value": 10000}, {"metric": "orders", "op": ">=", "value": 5}]}`.
  Check every metric name against the enriched table, every operator against an allowlist, then compile to SQL with
  bound values. An LLM can propose segments in this shape; code validates and compiles them.
- If SQL must run on loaded files, tell the generator the exact runtime table names (`crm_customers`, not
  `crm_customers.csv`) and return "available tables: …" on errors.

## Testing

Demo data that links only by one clean email proves nothing. Test with deliberately messy fixtures: mixed-case and
padded emails, Gmail dot/plus variants, the same phone in four formats, a shared family email, a call-center phone
on many orders, junk placeholders, a record with no keys, a third source joined only by an external id. Assert the
expected clusters and warnings.

## Script

`${CLAUDE_SKILL_DIR}/scripts/resolve_identities.py` (pandas) — deterministic resolution over CSV/TSV/XLSX/Parquet:

```bash
python resolve_identities.py --source crm=crm.csv --source shop=orders.csv \
  --map crm:email=Email,phone=Mobile,pk=CustomerID --map shop:email=buyer_email,phone=buyer_phone,pk=order_id \
  --default-country-code 55 --gmail --max-records-per-key 20 --out unified.csv
```

- Without `--map`, email/phone columns are detected by name and confirmed by their values; shared ids must be
  mapped (`id=COL`). `pk=COL` only copies the record's own key to the output.
- stdout: JSON summary (cluster size histogram, multi-source clusters, largest clusters, invalid/junk counts,
  warnings: `hub_key`, `too_many_emails`, `large_cluster`, `no_key_columns`). `--out` writes one row per source
  record with its `unified_id`.
- `--drop-hub-keys` stops linking through flagged keys; `--strict` exits 1 when warnings exist (use in CI);
  exit 2 on usage or input errors.

Related: `join-discovery` (which columns relate the sources), `dataset-profiling`, `lineage-and-versioning`.
