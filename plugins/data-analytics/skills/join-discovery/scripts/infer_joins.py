#!/usr/bin/env python3
"""Suggest join relationships between tables, with a score and the reasons behind it.

Usage:
    python infer_joins.py orders.csv customers.csv products.parquet     # data files (table = file stem)
    python infer_joins.py --sqlite shop.db                              # all tables + declared foreign keys
    python infer_joins.py --schema schema.json                          # names only: {"table": ["col", ...]}
    python infer_joins.py --sqlite shop.db --min-score 0.7

Evidence, strongest first:
    1. declared foreign keys (SQLite PRAGMA foreign_key_list)                        score 1.0
    2. naming: <x>_id / <x>Id / id_<x> / <x>_key / <x>_code -> table x, xs, xes, x(y->ies) with column id or the
       same name; a "<prefix>_<x>_id" column also tries table x (e.g. billing_customer_id -> customers)
    3. the same key-like column name in two tables (generic names such as id, created_at, name are ignored)
    4. values, when data is available: containment = share of distinct child values present in the parent column,
       and whether the parent column is unique (otherwise the join can multiply rows)

Output: JSON list sorted by score, each item
    {key, left_table, left_column, right_table, right_column, cardinality_guess, score, reasons, containment?}
where left = the referencing (child) side and right = the referenced (parent) side.
Exit codes: 0 ok (even with no suggestions), 1 input could not be read, 2 usage error.

Needs pandas for data files; --schema mode uses only the standard library. Suggestions are hypotheses:
confirm them (or ask the user) before using them in queries.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys

GENERIC_COLUMNS = {
    "id", "name", "title", "description", "status", "type", "kind", "category", "created_at", "updated_at",
    "deleted_at", "created", "updated", "date", "timestamp", "value", "amount", "notes", "comment", "email",
}
KEY_SUFFIXES = ("_id", "_key", "_code", "_uuid", "_sku", "_fk", "_sk")
TABLE_PREFIXES = ("dim_", "fact_", "fct_", "tbl_", "t_", "stg_", "raw_", "src_", "vw_", "v_")


class InputError(Exception):
    pass


# --------------------------------------------------------------------------- loading


def load_schema_json(path: str) -> dict[str, list[str]]:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict) or not all(isinstance(v, list) for v in data.values()):
        raise InputError('schema JSON must look like {"table": ["column", ...]}')
    return {str(t): [str(c) for c in cols] for t, cols in data.items()}


def load_sqlite(path: str, sample_rows: int):
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        tables = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        schema, data, fks = {}, {}, []
        for t in tables:
            info = conn.execute(f'PRAGMA table_info("{t.replace(chr(34), chr(34) * 2)}")').fetchall()
            cols = [r[1] for r in info]
            schema[t] = cols
            for row in conn.execute(f'PRAGMA foreign_key_list("{t.replace(chr(34), chr(34) * 2)}")').fetchall():
                parent, child_col, parent_col = row[2], row[3], row[4]
                if parent_col is None:  # FK to the parent's primary key
                    pinfo = conn.execute(f'PRAGMA table_info("{parent}")').fetchall()
                    ppk = [r[1] for r in sorted(pinfo, key=lambda r: r[5]) if r[5]]
                    parent_col = ppk[0] if ppk else "id"
                fks.append((t, child_col, parent, parent_col))
            try:
                import pandas as pd

                data[t] = pd.read_sql_query(
                    f'SELECT * FROM "{t.replace(chr(34), chr(34) * 2)}" LIMIT {int(sample_rows)}', conn)
            except ImportError:
                pass
        return schema, data, fks
    finally:
        conn.close()


def load_files(paths: list[str], sample_rows: int):
    try:
        import pandas as pd
    except ImportError:
        raise InputError("reading data files needs pandas: pip install pandas (or use --schema)")
    schema, data = {}, {}
    for path in paths:
        if not os.path.isfile(path):
            raise InputError(f"{path}: file not found")
        stem = re.sub(r"[^0-9a-zA-Z]+", "_", os.path.splitext(os.path.basename(path))[0]).strip("_").lower()
        lower = path.lower()
        if lower.endswith((".xlsx", ".xlsm", ".xls")):
            df = pd.read_excel(path, nrows=sample_rows)
        elif lower.endswith(".parquet"):
            df = pd.read_parquet(path).head(sample_rows)
        elif lower.endswith((".jsonl", ".ndjson")):
            df = pd.read_json(path, lines=True, nrows=sample_rows)
        elif lower.endswith(".json"):
            with open(path, "r", encoding="utf-8-sig") as fh:
                raw = json.load(fh)
            if isinstance(raw, dict):
                raw = next((v for v in raw.values() if isinstance(v, list)), [raw])
            df = pd.json_normalize(raw[:sample_rows], sep=".")
        else:
            df = _read_csv(pd, path, sample_rows)
        df.columns = [str(c).strip() for c in df.columns]
        schema[stem] = list(df.columns)
        data[stem] = df
    return schema, data, []


def _read_csv(pd, path: str, nrows: int):
    import csv

    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, "r", encoding=enc, newline="") as fh:
                sample = fh.read(64 * 1024)
            try:
                sep = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
            except csv.Error:
                sep = ","
            return pd.read_csv(path, sep=sep, encoding=enc, nrows=nrows, dtype=str)
        except UnicodeDecodeError:
            continue
    raise InputError(f"{path}: could not decode")


# --------------------------------------------------------------------------- candidates


def _norm_table(name: str) -> str:
    low = name.lower()
    for p in TABLE_PREFIXES:
        if low.startswith(p) and len(low) > len(p):
            return low[len(p):]
    return low


def _entity_names(base: str) -> list[str]:
    base = base.lower().strip("_")
    forms = [base, base + "s", base + "es"]
    if base.endswith("y"):
        forms.append(base[:-1] + "ies")
    if base.endswith("s"):
        forms.append(base[:-1])
    return forms


def _key_base(col: str) -> str | None:
    """customer_id -> customer, customerId -> customer, id_customer -> customer."""
    for suffix in KEY_SUFFIXES:
        if col.lower().endswith(suffix) and len(col) > len(suffix):
            return col[: -len(suffix)]
    m = re.fullmatch(r"([a-z][A-Za-z0-9]*?)(Id|ID|Key|Code)", col)
    if m:
        return m.group(1)
    if col.lower().startswith("id_") and len(col) > 3:
        return col[3:]
    return None


def _is_key_like(col: str) -> bool:
    return _key_base(col) is not None or col.lower() in ("uuid", "sku", "code", "key")


def naming_candidates(schema: dict[str, list[str]]) -> list[dict]:
    by_entity: dict[str, list[str]] = {}
    for t in schema:
        by_entity.setdefault(_norm_table(t), []).append(t)
    out = []
    for child, cols in schema.items():
        for col in cols:
            base = _key_base(col)
            if not base:
                continue
            bases = [(base, 0.8)]
            parts = re.split(r"_", base.lower())
            if len(parts) > 1:
                bases.append((parts[-1], 0.65))  # billing_customer_id -> customer
            for b, score in bases:
                for form in _entity_names(b):
                    for parent in by_entity.get(form, []):
                        pcols = {c.lower(): c for c in schema[parent]}
                        suffix = col[len(base):].lstrip("_").lower()  # customer_sku -> sku
                        target = pcols.get("id") or pcols.get(col.lower()) or pcols.get(suffix)
                        if target is None:
                            continue
                        if parent == child and target.lower() == col.lower():
                            continue
                        out.append(_cand(child, col, parent, target, score,
                                         f"name {col} points to table {parent}"))
                if any(c["left_column"] == col and c["left_table"] == child for c in out):
                    break
    return out


def same_name_candidates(schema: dict[str, list[str]], data: dict) -> list[dict]:
    out = []
    tables = sorted(schema)
    for i, a in enumerate(tables):
        for b in tables[i + 1:]:
            a_cols = {c.lower(): c for c in schema[a]}
            for low, b_col in ((c.lower(), c) for c in schema[b]):
                if low not in a_cols or low in GENERIC_COLUMNS or not _is_key_like(b_col):
                    continue
                a_col = a_cols[low]
                child, ccol, parent, pcol = a, a_col, b, b_col
                if a in data and b in data:
                    if _is_unique(data[a][a_col]) and not _is_unique(data[b][b_col]):
                        child, ccol, parent, pcol = b, b_col, a, a_col
                elif _norm_table(a) in _entity_names(_key_base(a_col) or ""):
                    child, ccol, parent, pcol = b, b_col, a, a_col
                out.append(_cand(child, ccol, parent, pcol, 0.6, f"both tables have key-like column {a_col}"))
    return out


def _cand(child, ccol, parent, pcol, score, reason) -> dict:
    return {"left_table": child, "left_column": ccol, "right_table": parent, "right_column": pcol,
            "score": score, "reasons": [reason]}


# --------------------------------------------------------------------------- value checks


def _norm_values(series) -> set:
    vals = set()
    for v in series.dropna().tolist():
        if isinstance(v, float) and v.is_integer():
            v = int(v)
        s = str(v).strip()
        if s:
            vals.add(s)
    return vals


def _is_unique(series) -> bool:
    nonnull = series.dropna()
    return len(nonnull) > 0 and nonnull.nunique() == len(nonnull)


def score_with_values(c: dict, data: dict) -> None:
    child, parent = data.get(c["left_table"]), data.get(c["right_table"])
    if child is None or parent is None:
        c["cardinality_guess"] = "many-to-one (assumed, no data)"
        return
    cvals = _norm_values(child[c["left_column"]])
    pvals = _norm_values(parent[c["right_column"]])
    if not cvals:
        c["reasons"].append("child column is empty in the sample")
        c["score"] -= 0.2
        c["cardinality_guess"] = "unknown"
        return
    containment = len(cvals & pvals) / len(cvals)
    c["containment"] = round(containment, 3)
    if containment >= 0.95:
        c["score"] += 0.15
        c["reasons"].append(f"{containment:.0%} of child values exist in the parent")
    elif containment >= 0.5:
        c["reasons"].append(f"only {containment:.0%} of child values exist in the parent (orphans or partial data)")
    elif containment > 0:
        c["score"] -= 0.3
        c["reasons"].append(f"only {containment:.0%} of child values exist in the parent")
    else:
        c["score"] -= 0.5
        c["reasons"].append("no child value exists in the parent")
    parent_unique = _is_unique(parent[c["right_column"]])
    child_unique = _is_unique(child[c["left_column"]])
    if parent_unique:
        c["score"] += 0.05
        c["cardinality_guess"] = "one-to-one" if child_unique else "many-to-one"
    else:
        c["score"] -= 0.1
        c["cardinality_guess"] = "many-to-many"
        c["reasons"].append("parent column is not unique: joining can duplicate rows")


# --------------------------------------------------------------------------- main


def infer(schema: dict[str, list[str]], data: dict, fks: list) -> list[dict]:
    cands = [_cand(t, c, p, pc, 1.0, "declared foreign key") for t, c, p, pc in fks]
    cands += naming_candidates(schema)
    cands += same_name_candidates(schema, data)
    merged: dict[str, dict] = {}
    for c in cands:
        a = (c["left_table"].lower(), c["left_column"].lower())
        b = (c["right_table"].lower(), c["right_column"].lower())
        canon = "|".join(a + b) if a <= b else "|".join(b + a)
        if canon in merged:
            best = merged[canon]
            for r in c["reasons"]:
                if r not in best["reasons"]:
                    best["reasons"].append(r)
            if c["score"] > best["score"]:
                for k in ("left_table", "left_column", "right_table", "right_column", "score"):
                    best[k] = c[k]
        else:
            merged[canon] = c
    out = []
    for c in merged.values():
        declared = "declared foreign key" in c["reasons"]
        score_with_values(c, data)
        if declared:
            c["score"] = 1.0
        c["score"] = round(max(0.0, min(1.0, c["score"])), 2)
        c["key"] = f"{c['left_table']}.{c['left_column']}->{c['right_table']}.{c['right_column']}"
        ordered = {k: c[k] for k in ("key", "left_table", "left_column", "right_table", "right_column",
                                      "cardinality_guess", "score", "reasons")}
        if "containment" in c:
            ordered["containment"] = c["containment"]
        out.append(ordered)
    out.sort(key=lambda c: (-c["score"], c["left_table"], c["left_column"], c["right_table"], c["right_column"]))
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="*", help="CSV/TSV/XLSX/Parquet/JSON files; table name = file stem")
    parser.add_argument("--sqlite", help="SQLite database (reads declared foreign keys and samples data)")
    parser.add_argument("--schema", help='JSON file {"table": ["column", ...]} (names only, no value checks)')
    parser.add_argument("--min-score", type=float, default=0.5, help="drop suggestions below this score (default 0.5)")
    parser.add_argument("--sample-rows", type=int, default=50000, help="rows per table used for value checks")
    args = parser.parse_args(argv)
    sources = sum(bool(x) for x in (args.files, args.sqlite, args.schema))
    if sources != 1:
        parser.error("give data files, or --sqlite DB, or --schema schema.json (exactly one)")
    try:
        if args.schema:
            schema, data, fks = load_schema_json(args.schema), {}, []
        elif args.sqlite:
            if not os.path.isfile(args.sqlite):
                raise InputError(f"{args.sqlite}: file not found")
            schema, data, fks = load_sqlite(args.sqlite, args.sample_rows)
        else:
            schema, data, fks = load_files(args.files, args.sample_rows)
    except (InputError, OSError, ValueError, sqlite3.Error) as exc:
        sys.stderr.write(f"{exc}\n")
        return 1
    result = [c for c in infer(schema, data, fks) if c["score"] >= args.min_score]
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
