#!/usr/bin/env python3
"""Profile a tabular file and optionally load it into SQLite with clean types.

Supported inputs: CSV/TSV/TXT, XLSX/XLS, JSON, JSONL/NDJSON, Parquet.

Usage:
    python profile_dataset.py data.csv                      # profile JSON to stdout
    python profile_dataset.py sales.xlsx --sheet Orders     # pick a sheet (name or 0-based index)
    python profile_dataset.py sales.xlsx --all-sheets       # one table per sheet
    python profile_dataset.py data.csv --max-rows 100000    # load at most N rows (true row count still reported)
    python profile_dataset.py a.csv b.json --to-sqlite /tmp/work.db
    python profile_dataset.py orders.csv --to-sqlite /tmp/work.db --table orders

What it does:
    * CSV: encoding fallback (utf-8-sig, utf-8, cp1252, latin-1), delimiter sniffing (, ; tab |),
      decimal-comma detection ("1.234,56").
    * JSON: top-level list, or the first list under data/results/items/records, or the first list value;
      nested objects are flattened to dotted columns; list/object cells are JSON-encoded strings.
    * Type coercion of text columns: numbers (currency symbols, thousand separators, %, (negatives)),
      dates, booleans. Every coercion is recorded in "notes".
    * Profile: true row count, per-column type, semantic type, missing, cardinality, top values,
      numeric/date ranges, candidate keys, filter candidates, warnings.
    * --to-sqlite writes the coerced table(s); datetimes become ISO text, booleans 0/1.

Output: one JSON object for one table, a JSON array for several tables.
Exit codes: 0 ok, 1 a file could not be loaded, 2 usage error.

Requires pandas. openpyxl for .xlsx, xlrd for .xls, pyarrow (or fastparquet) for .parquet.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import os
import re
import sqlite3
import sys
import warnings
from typing import Any

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    sys.stderr.write("profile_dataset.py needs pandas: pip install pandas\n")
    sys.exit(2)

ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
DELIMITERS = ",;\t|"
JSON_LIST_KEYS = ("data", "results", "items", "records")
BOOL_TRUE = {"true", "t", "yes", "y", "sim", "si", "1"}
BOOL_FALSE = {"false", "f", "no", "n", "nao", "não", "0"}
CURRENCY_RE = re.compile(r"(?:R\$|US\$|\$|€|£|¥|₹|BRL|USD|EUR|GBP)", re.IGNORECASE)
ID_NAME_RE = re.compile(r"((^|[_.])(id|uuid|key|code|sku)$|^id_|[a-z0-9]Id$)")
DATEISH_RE = re.compile(r"\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{4}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2}|T\d{2}:\d{2}")
DMY_RE = re.compile(r"^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})")
DATE_NAME_RE = re.compile(r"(date|data|dt|time|day|month|year|created|updated|_at$|_on$)", re.IGNORECASE)


class LoadError(Exception):
    pass


# --------------------------------------------------------------------------- loading


def _detect_encoding(raw: bytes) -> str:
    for enc in ENCODINGS:
        try:
            raw.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin-1"


def _sniff_delimiter(sample: str, path: str) -> str:
    if path.lower().endswith(".tsv"):
        return "\t"
    try:
        return csv.Sniffer().sniff(sample, delimiters=DELIMITERS).delimiter
    except csv.Error:
        lines = [ln for ln in sample.splitlines()[:20] if ln.strip()]
        best, best_score = ",", -1.0
        for d in DELIMITERS:
            counts = [ln.count(d) for ln in lines]
            if not counts or max(counts) == 0:
                continue
            # prefer delimiters that appear the same number of times on every line
            score = min(counts) - (max(counts) - min(counts))
            if score > best_score:
                best, best_score = d, score
        return best


def _read_text_table(path: str, max_rows: int | None, notes: list) -> tuple[pd.DataFrame, int, dict]:
    with open(path, "rb") as fh:
        raw_sample = fh.read(256 * 1024)
    if not raw_sample.strip():
        raise LoadError("file is empty")
    encodings = [_detect_encoding(raw_sample)] + [e for e in ENCODINGS if e != _detect_encoding(raw_sample)]
    last_err: Exception | None = None
    for enc in encodings:
        try:
            sample = raw_sample.decode(enc, errors="ignore")
            sep = _sniff_delimiter(sample, path)
            df = pd.read_csv(
                path, sep=sep, encoding=enc, dtype=str, keep_default_na=True, na_values=[""],
                nrows=max_rows, skipinitialspace=True,
            )
            header = next(csv.reader(io.StringIO(sample), delimiter=sep), [])
            if len(header) == len(df.columns):
                df.columns = header  # keep raw names; pandas would rename duplicates to "a.1" silently
            total = _count_csv_rows(path, enc, sep)
            decimal_comma = sep == ";" and bool(re.search(r"\d,\d", sample))
            if enc not in ("utf-8-sig", "utf-8"):
                notes.append(f"file decoded as {enc}")
            if sep != ",":
                notes.append(f"delimiter detected: {sep!r}")
            return df, total, {"encoding": enc, "delimiter": sep, "decimal_comma_hint": decimal_comma}
        except UnicodeDecodeError as exc:
            last_err = exc
            continue
    raise LoadError(f"could not decode file: {last_err}")


def _count_csv_rows(path: str, enc: str, sep: str) -> int:
    with open(path, "r", encoding=enc, newline="") as fh:
        reader = csv.reader(fh, delimiter=sep)
        n = sum(1 for row in reader if any(cell.strip() for cell in row))
    return max(n - 1, 0)  # minus header


def _json_records(obj: Any) -> list:
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for key in JSON_LIST_KEYS:
            if isinstance(obj.get(key), list):
                return obj[key]
        for value in obj.values():
            if isinstance(value, list):
                return value
        return [obj]
    return [{"value": obj}]


def _read_json(path: str, max_rows: int | None) -> tuple[pd.DataFrame, int]:
    lower = path.lower()
    records: list
    with open(path, "r", encoding="utf-8-sig") as fh:
        if lower.endswith((".jsonl", ".ndjson")):
            records = [json.loads(line) for line in fh if line.strip()]
        else:
            try:
                records = _json_records(json.load(fh))
            except json.JSONDecodeError:
                fh.seek(0)  # a .json file that is really JSON Lines
                records = [json.loads(line) for line in fh if line.strip()]
    total = len(records)
    records = [r if isinstance(r, dict) else {"value": r} for r in records[: max_rows or None]]
    df = pd.json_normalize(records, sep=".") if records else pd.DataFrame()
    return df, total


def _read_excel(path: str, sheet: str | None, all_sheets: bool, max_rows: int | None):
    try:
        book = pd.ExcelFile(path)
    except ImportError:
        engine = "xlrd" if path.lower().endswith(".xls") else "openpyxl"
        raise LoadError(f"reading this file needs {engine}: pip install {engine}")
    names = list(book.sheet_names)
    if all_sheets:
        chosen = names
    elif sheet is None:
        chosen = names[:1]
    elif sheet in names:
        chosen = [sheet]
    elif sheet.isdigit() and int(sheet) < len(names):
        chosen = [names[int(sheet)]]
    else:
        raise LoadError(f"sheet {sheet!r} not found; sheets: {names}")
    out = []
    for name in chosen:
        df = book.parse(name, nrows=max_rows)
        total = len(df)
        estimated = False
        if max_rows is not None and len(df) >= max_rows:
            total, estimated = _excel_row_estimate(path, name, len(df))
        out.append((name, df, total, estimated))
    return names, out


def _excel_row_estimate(path: str, sheet: str, fallback: int) -> tuple[int, bool]:
    try:
        import openpyxl  # noqa: F401

        wb = openpyxl.load_workbook(path, read_only=True)
        return max(wb[sheet].max_row - 1, fallback), True
    except Exception:
        return fallback, True


def _read_parquet(path: str, max_rows: int | None) -> tuple[pd.DataFrame, int]:
    try:
        df = pd.read_parquet(path)
    except ImportError:
        raise LoadError("reading parquet needs pyarrow: pip install pyarrow")
    total = len(df)
    return (df.head(max_rows) if max_rows else df), total


# --------------------------------------------------------------------------- cleaning


def _clean_columns(df: pd.DataFrame, warn: list) -> pd.DataFrame:
    new, seen = [], {}
    for i, col in enumerate(df.columns):
        name = str(col).strip()
        if not name or name.startswith("Unnamed:"):
            name = f"column_{i + 1}"
            warn.append(f"blank header at position {i + 1} renamed to {name}")
        base = name
        if name in seen:
            seen[base] += 1
            name = f"{base}_{seen[base]}"
            warn.append(f"duplicate column {base!r} renamed to {name!r}")
        else:
            seen[name] = 1
        new.append(name)
    df.columns = new
    return df


def _encode_nested(df: pd.DataFrame, notes: list) -> pd.DataFrame:
    for col in df.columns:
        s = df[col]
        if not (pd.api.types.is_object_dtype(s) or pd.api.types.is_string_dtype(s)):
            continue
        mask = s.map(lambda v: isinstance(v, (list, dict, tuple)))
        if mask.any():
            df[col] = s.map(
                lambda v: json.dumps(v, ensure_ascii=False, sort_keys=True, default=str)
                if isinstance(v, (list, dict, tuple)) else v
            )
            notes.append(f"{col}: list/object values stored as JSON text")
    return df


def _parse_number(text: str, decimal_comma: bool) -> float | None:
    t = CURRENCY_RE.sub("", text).replace(" ", "").replace(" ", "").strip()
    negative = False
    if t.startswith("(") and t.endswith(")"):
        negative, t = True, t[1:-1]
    t = t.rstrip("%")
    if not t:
        return None
    if "," in t and "." in t:
        if t.rfind(",") > t.rfind("."):  # 1.234,56
            t = t.replace(".", "").replace(",", ".")
        else:  # 1,234.56
            t = t.replace(",", "")
    elif "," in t:
        if decimal_comma or not re.fullmatch(r"-?\d{1,3}(,\d{3})+", t):
            t = t.replace(",", ".") if t.count(",") == 1 else t.replace(",", "")
        else:
            t = t.replace(",", "")
    elif decimal_comma and re.fullmatch(r"-?\d{1,3}(\.\d{3})+", t):
        t = t.replace(".", "")  # "1.234" under the decimal-comma convention means 1234
    try:
        value = float(t)
    except ValueError:
        return None
    if math.isinf(value) or math.isnan(value):
        return None
    return -value if negative else value


def _dayfirst(values: list[str], hint: bool) -> bool:
    first_gt, second_gt = False, False
    for v in values[:500]:
        m = DMY_RE.match(v)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            first_gt |= a > 12
            second_gt |= b > 12
    if first_gt and not second_gt:
        return True
    if second_gt and not first_gt:
        return False
    return hint


def _to_datetime(values: pd.Series, dayfirst: bool) -> pd.Series:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            return pd.to_datetime(values, errors="coerce", dayfirst=dayfirst, format="mixed")
        except (TypeError, ValueError):
            return pd.to_datetime(values, errors="coerce", dayfirst=dayfirst)


def _coerce_column(s: pd.Series, name: str, decimal_comma: bool, notes: list, warn: list) -> pd.Series:
    nonnull = s.dropna()
    if nonnull.empty:
        return s
    if not all(isinstance(v, str) for v in nonnull):
        # mixed python scalars (e.g. from JSON): try a plain numeric conversion
        num = pd.to_numeric(nonnull, errors="coerce")
        if num.notna().mean() >= 0.95 and not any(isinstance(v, bool) for v in nonnull):
            notes.append(f"{name}: mixed values converted to numbers")
            return pd.to_numeric(s, errors="coerce")
        return s.map(lambda v: v if v is None or (isinstance(v, float) and math.isnan(v)) else str(v))
    text = nonnull.map(str.strip)
    text = text[text != ""]
    if text.empty:
        return s.where(s.map(lambda v: isinstance(v, str) and v.strip() != ""), None)
    lowered = set(text.str.lower().unique())

    # booleans: only when at least one word token is present (pure 0/1 stays numeric)
    if lowered <= (BOOL_TRUE | BOOL_FALSE) and lowered - {"0", "1"}:
        notes.append(f"{name}: text {sorted(lowered)} converted to boolean")
        return s.map(lambda v: None if not isinstance(v, str) or not v.strip()
                     else v.strip().lower() in BOOL_TRUE).astype("boolean")

    leading_zero = text.str.fullmatch(r"0\d+").mean()
    if leading_zero >= 0.05:
        warn.append(f"{name}: kept as text because values have leading zeros (codes/ZIPs/IDs)")
        return s

    numbers = text.map(lambda v: _parse_number(v, decimal_comma))
    if numbers.notna().mean() >= 0.95:
        parsed = s.map(lambda v: _parse_number(v, decimal_comma) if isinstance(v, str) and v.strip() else None)
        parsed = pd.to_numeric(parsed, errors="coerce")
        stripped = []
        if text.str.contains(CURRENCY_RE).any():
            stripped.append("currency symbols")
        if text.str.contains("%", regex=False).any():
            stripped.append("percent signs (value kept as written, not divided by 100)")
        if text.str.contains(r"\d[.,]\d{3}(?:[.,]|$)").any():
            stripped.append("thousand separators")
        if decimal_comma and text.str.contains(r"\d,\d").any():
            stripped.append("decimal comma")
        detail = f" ({', '.join(stripped)})" if stripped else ""
        if (parsed.dropna() % 1 == 0).all():
            parsed = parsed.astype("Int64")
        notes.append(f"{name}: text converted to number{detail}")
        return parsed

    dateish = text.str.contains(DATEISH_RE).mean()
    if dateish >= 0.8:
        dayfirst = _dayfirst(list(text), decimal_comma)
        parsed = _to_datetime(s.where(s.map(lambda v: isinstance(v, str) and v.strip() != ""), None), dayfirst)
        if parsed.notna().sum() >= 0.8 * len(text):
            notes.append(f"{name}: text converted to datetime (dayfirst={dayfirst})")
            return parsed
    return s.where(s.map(lambda v: isinstance(v, str) and v.strip() != ""), None)


def _coerce(df: pd.DataFrame, decimal_comma: bool, notes: list, warn: list) -> pd.DataFrame:
    for col in df.columns:
        s = df[col]
        if pd.api.types.is_bool_dtype(s) or pd.api.types.is_numeric_dtype(s) or pd.api.types.is_datetime64_any_dtype(s):
            continue
        df[col] = _coerce_column(s, col, decimal_comma, notes, warn)
    return df


# --------------------------------------------------------------------------- profiling


def _py(value: Any) -> Any:
    """Make numpy/pandas scalars JSON-safe and deterministic."""
    if value is None:
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            value = value.item()
        except (ValueError, AttributeError):
            pass
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return round(value, 6)
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def _semantic_type(name: str, s: pd.Series, nunique: int, nonnull: int, max_categories: int) -> str:
    if pd.api.types.is_bool_dtype(s):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(s):
        return "datetime"
    name_is_id = bool(ID_NAME_RE.search(name)) or name.lower() == "id"
    ratio = nunique / nonnull if nonnull else 0.0
    if pd.api.types.is_numeric_dtype(s):
        if name_is_id:
            return "identifier"
        values = set(s.dropna().unique().tolist())
        if values and values <= {0, 1}:
            return "boolean"
        if pd.api.types.is_integer_dtype(s) or (s.dropna() % 1 == 0).all():
            return "integer"
        return "float"
    if name_is_id or (ratio >= 0.95 and nonnull >= 20 and s.dropna().astype(str).str.contains(r"\s").mean() < 0.05):
        return "identifier"
    if (nunique <= max_categories and ratio <= 0.5) or (ratio <= 0.05 and nunique <= 1000):
        return "categorical"
    return "text"


def _profile_column(name: str, s: pd.Series, max_categories: int) -> dict:
    total = len(s)
    nonnull_s = s.dropna()
    nonnull = len(nonnull_s)
    try:
        nunique = int(nonnull_s.nunique())
    except TypeError:
        nunique = int(nonnull_s.astype(str).nunique())
    col: dict[str, Any] = {
        "dtype": str(s.dtype),
        "semantic_type": _semantic_type(name, s, nunique, nonnull, max_categories),
        "missing": int(total - nonnull),
        "missing_pct": round(100.0 * (total - nonnull) / total, 2) if total else 0.0,
        "nunique": nunique,
        "unique_ratio": round(nunique / nonnull, 4) if nonnull else 0.0,
    }
    if nonnull and not pd.api.types.is_datetime64_any_dtype(s) and nunique <= max_categories:
        counts = nonnull_s.astype(str).value_counts()
        items = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        col["top_values"] = [{"value": k, "count": int(v)} for k, v in items[:max_categories]]
    if nonnull and pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
        f = nonnull_s.astype(float)
        col.update({
            "min": _py(f.min()), "max": _py(f.max()), "mean": _py(f.mean()),
            "median": _py(f.median()), "p25": _py(f.quantile(0.25)), "p75": _py(f.quantile(0.75)),
        })
    if nonnull and pd.api.types.is_datetime64_any_dtype(s):
        col["min"] = _py(nonnull_s.min())
        col["max"] = _py(nonnull_s.max())
    if nonnull:
        example = _py(nonnull_s.iloc[0])
        col["example"] = example[:80] if isinstance(example, str) else example
    return col


def profile_frame(df: pd.DataFrame, *, source: str, table: str, total_rows: int, rows_estimated: bool,
                  notes: list, warn: list, max_categories: int, extra: dict | None = None) -> dict:
    columns = {name: _profile_column(name, df[name], max_categories) for name in df.columns}
    sampled = len(df)
    if sampled < total_rows:
        warn.append(f"statistics use the first {sampled} of {total_rows} rows (head of file, not a random sample)")
    candidate_keys = [
        c for c, p in columns.items()
        if p["missing"] == 0 and sampled > 1 and p["nunique"] == sampled
        and p["semantic_type"] in ("identifier", "integer", "categorical", "text")
    ]
    filters = []
    for c, p in columns.items():
        if p["semantic_type"] == "datetime":
            filters.append({"column": c, "kind": "date", "min": p.get("min"), "max": p.get("max")})
    for c, p in sorted(columns.items(), key=lambda kv: (kv[1]["nunique"], kv[0])):
        if p["semantic_type"] in ("categorical", "boolean") and 2 <= p["nunique"] <= max_categories:
            filters.append({"column": c, "kind": "category", "values": sorted(v["value"] for v in p.get("top_values", []))})
    for c, p in columns.items():
        if sampled and p["missing_pct"] >= 50:
            warn.append(f"{c}: {p['missing_pct']}% missing")
        if p["nunique"] == 1 and sampled > 1:
            warn.append(f"{c}: constant column")
        if (p["semantic_type"] in ("integer", "float") and DATE_NAME_RE.search(c)
                and p.get("min") is not None and 20000 <= p["min"] and p["max"] <= 60000):
            warn.append(f"{c}: numbers between 20000 and 60000 in a date-like column; may be Excel serial dates")
    out: dict[str, Any] = {
        "source": source,
        "table": table,
        "rows": total_rows,
        "sampled_rows": sampled,
    }
    if rows_estimated:
        out["rows_estimated"] = True
    if extra:
        out.update(extra)
    out.update({
        "columns": columns,
        "candidate_keys": candidate_keys,
        "filter_candidates": filters,
        "notes": notes,
        "warnings": warn,
    })
    return out


# --------------------------------------------------------------------------- sqlite


def sanitize_table_name(name: str) -> str:
    t = re.sub(r"[^0-9a-zA-Z]+", "_", name).strip("_").lower()
    if not t:
        t = "data"
    if t[0].isdigit():
        t = f"t_{t}"
    return t


def _for_sqlite(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    for col in df.columns:
        s = df[col]
        if pd.api.types.is_datetime64_any_dtype(s):
            s_nonnull = s.dropna()
            midnight = bool(len(s_nonnull)) and bool((s_nonnull.dt.normalize() == s_nonnull).all())
            fmt = "%Y-%m-%d" if midnight else "%Y-%m-%dT%H:%M:%S"
            out[col] = s.map(lambda v: None if pd.isna(v) else v.strftime(fmt)).astype(object)
        elif pd.api.types.is_bool_dtype(s):
            out[col] = s.map(lambda v: None if pd.isna(v) else int(bool(v))).astype(object)
        else:
            out[col] = s.astype(object).where(s.notna(), None)
    return out


def write_sqlite(df: pd.DataFrame, path: str, table: str) -> None:
    conn = sqlite3.connect(path)
    try:
        _for_sqlite(df).to_sql(table, conn, index=False, if_exists="replace")
        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------- main


def load_tables(path: str, args) -> list[dict]:
    """Return [{table, df, total, estimated, notes, warnings, extra}] for one input file."""
    lower = path.lower()
    stem = os.path.splitext(os.path.basename(path))[0]
    results = []
    if lower.endswith((".xlsx", ".xlsm", ".xls")):
        names, sheets = _read_excel(path, args.sheet, args.all_sheets, args.max_rows)
        for sheet_name, df, total, estimated in sheets:
            notes: list = []
            warn: list = []
            df = _coerce(_encode_nested(_clean_columns(df, warn), notes), False, notes, warn)
            table = f"{stem}_{sheet_name}" if args.all_sheets else stem
            results.append({"table": table, "df": df, "total": total, "estimated": estimated, "notes": notes,
                            "warnings": warn, "extra": {"sheet": sheet_name, "sheets": names}})
        return results
    notes, warn = [], []
    extra: dict = {}
    if lower.endswith((".json", ".jsonl", ".ndjson")):
        df, total = _read_json(path, args.max_rows)
        decimal_comma = False
    elif lower.endswith(".parquet"):
        df, total = _read_parquet(path, args.max_rows)
        decimal_comma = False
    else:
        df, total, info = _read_text_table(path, args.max_rows, notes)
        decimal_comma = bool(info["decimal_comma_hint"])
        extra = {"encoding": info["encoding"], "delimiter": info["delimiter"]}
    df = _coerce(_encode_nested(_clean_columns(df, warn), notes), decimal_comma, notes, warn)
    results.append({"table": stem, "df": df, "total": total, "estimated": False, "notes": notes,
                    "warnings": warn, "extra": extra})
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="+", help="input files")
    parser.add_argument("--sheet", help="Excel sheet name or 0-based index (default: first sheet)")
    parser.add_argument("--all-sheets", action="store_true", help="load every Excel sheet as its own table")
    parser.add_argument("--max-rows", type=int, help="load at most N rows per table (row count stays exact)")
    parser.add_argument("--max-categories", type=int, default=20,
                        help="report top_values / category filters when distinct values <= N (default 20)")
    parser.add_argument("--to-sqlite", metavar="PATH", help="write the coerced table(s) into this SQLite file")
    parser.add_argument("--table", help="table name for --to-sqlite (single table only)")
    parser.add_argument("--compact", action="store_true", help="print JSON on one line")
    args = parser.parse_intermixed_args(argv)
    if args.max_rows is not None and args.max_rows <= 0:
        parser.error("--max-rows must be positive")
    if args.table and (len(args.files) > 1 or args.all_sheets):
        parser.error("--table only works with a single input table")

    profiles, failed, used_names = [], False, set()
    for path in args.files:
        if not os.path.isfile(path):
            sys.stderr.write(f"{path}: file not found\n")
            failed = True
            continue
        try:
            tables = load_tables(path, args)
        except (LoadError, ValueError, json.JSONDecodeError, pd.errors.ParserError) as exc:
            sys.stderr.write(f"{path}: {exc}\n")
            failed = True
            continue
        for t in tables:
            prof = profile_frame(
                t["df"], source=path, table=t["table"], total_rows=t["total"], rows_estimated=t["estimated"],
                notes=t["notes"], warn=t["warnings"], max_categories=args.max_categories, extra=t["extra"],
            )
            if args.to_sqlite:
                name = sanitize_table_name(args.table or t["table"])
                base, n = name, 2
                while name in used_names:
                    name, n = f"{base}_{n}", n + 1
                used_names.add(name)
                write_sqlite(t["df"], args.to_sqlite, name)
                prof["sqlite"] = {"path": args.to_sqlite, "table": name}
                if t["df"].shape[0] < t["total"]:
                    prof["warnings"].append(f"SQLite table {name} holds only the first {t['df'].shape[0]} rows")
            profiles.append(prof)

    if profiles:
        payload: Any = profiles[0] if len(profiles) == 1 else profiles
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=None if args.compact else 2, default=str)
        sys.stdout.write("\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
