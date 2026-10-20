#!/usr/bin/env python3
"""Build or validate a small, renderer-agnostic chart spec from query results.

Usage:
    python chart_spec.py suggest rows.json [--question "Revenue by month"]   # heuristic spec from result rows
    python chart_spec.py validate spec.json                                  # check/normalize an LLM-proposed spec
    cat rows.json | python chart_spec.py suggest -

rows.json: a JSON list of row objects ([{"month": "2024-01", "revenue": 10}, ...]) or {"rows": [...]}.

Spec shape (the only thing a renderer needs):
    {"suitable": true, "chartType": "bar|horizontal_bar|line|pie", "title": str, "subtitle": str?,
     "xLabel": str, "yLabel": str, "categories": [str], "series": [{"name": str, "values": [number|null]}],
     "insight": str?, "notes": [str]}

Rules enforced by `validate` (and respected by `suggest`):
    * chartType in bar | horizontal_bar | line | pie (common aliases are mapped: column -> bar, area -> line, ...);
    * bar/horizontal_bar/pie: at most --max-categories categories (default 12); line: at most --max-points (default 100);
    * 1 to 4 series, each with exactly one value per category, numbers only (null allowed except in pie);
    * pie: exactly one series, non-negative values, positive total;
    * categories are unique strings;
    * a spec with "suitable": false is passed through as not chartable (never overridden).

`suggest` heuristics: time-like label -> line (sorted by time); otherwise bar, or horizontal_bar when any label is
longer than 18 characters; pie only when the question asks for a share/breakdown and there are <= 6 non-negative
parts; one row with several numeric columns -> bar of those metrics; long tables (label, group, value) are pivoted
when the group has <= 4 values; too many categories -> top N-1 + "Other" for additive measures (sum, count, revenue,
...), plain top N otherwise, with a note.

Output: JSON on stdout. Exit codes: 0 chartable/valid, 1 not suitable/invalid, 2 usage or input error.
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from typing import Any

CHART_TYPES = ("bar", "horizontal_bar", "line", "pie")
ALIASES = {
    "column": "bar", "columns": "bar", "vertical_bar": "bar", "bar_chart": "bar",
    "barh": "horizontal_bar", "hbar": "horizontal_bar", "horizontal bar": "horizontal_bar", "horizontal-bar": "horizontal_bar",
    "area": "line", "line_chart": "line", "timeseries": "line", "time_series": "line",
    "donut": "pie", "doughnut": "pie", "pie_chart": "pie",
}
MAX_SERIES = 4
LONG_LABEL = 18
TEMPORAL_NAME = re.compile(r"(^|_)(date|day|week|month|year|quarter|period|time|dt|ts)($|_)|_at$|_on$", re.IGNORECASE)
TEMPORAL_VALUE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2})?.*)?)?$|^\d{4}-Q[1-4]$|^\d{4}-W\d{2}$")
ID_NAME = re.compile(r"((^|_)(id|uuid|key|code|sku)$|^id_|[a-z0-9]Id$)")
ADDITIVE = re.compile(r"(count|total|sum|revenue|sales|amount|qty|quantity|orders|units|volume|cost|spend|users|sessions|visits)",
                      re.IGNORECASE)
NON_ADDITIVE = re.compile(r"(avg|average|mean|median|rate|ratio|pct|percent|share|margin|score|min|max)", re.IGNORECASE)
SHARE_WORDS = re.compile(r"(share|proportion|percentage|percent|distribution|breakdown|composition|split|mix|part)",
                         re.IGNORECASE)


class InputError(Exception):
    pass


# --------------------------------------------------------------------------- helpers


def _number(v: Any) -> float | int | None:
    """Return a finite number, None for null, raise ValueError for anything else."""
    if v is None:
        return None
    if isinstance(v, bool):
        raise ValueError("boolean is not a number")
    if isinstance(v, (int, float)):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v
    if isinstance(v, str):
        t = v.strip()
        if t == "":
            return None
        f = float(t)
        if math.isnan(f) or math.isinf(f):
            return None
        return int(f) if f.is_integer() and re.fullmatch(r"-?\d+", t) else f
    raise ValueError(f"not a number: {v!r}")


def _is_numeric_column(values: list) -> bool:
    nonnull = [v for v in values if v is not None and v != ""]
    if not nonnull:
        return False
    try:
        for v in nonnull:
            _number(v)
        return True
    except ValueError:
        return False


def _is_temporal_column(name: str, values: list) -> bool:
    nonnull = [v for v in values if v is not None]
    if TEMPORAL_NAME.search(name):
        return True
    return bool(nonnull) and all(isinstance(v, str) and TEMPORAL_VALUE.match(v.strip()) for v in nonnull)


def _label(v: Any) -> str:
    if v is None:
        return "(blank)"
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)


def _sort_key(v: Any):
    try:
        return (0, float(v), "")
    except (TypeError, ValueError):
        return (1, 0.0, str(v))


# --------------------------------------------------------------------------- suggest


def suggest(rows: list[dict], question: str = "", max_categories: int = 12, max_points: int = 100) -> dict:
    if not rows:
        return {"suitable": False, "reason": "no rows to chart"}
    if not all(isinstance(r, dict) for r in rows):
        raise InputError("rows must be JSON objects")
    columns: list[str] = []
    for r in rows:
        for k in r:
            if k not in columns:
                columns.append(k)
    values = {c: [r.get(c) for r in rows] for c in columns}
    temporal = [c for c in columns if _is_temporal_column(c, values[c])]
    numeric = [c for c in columns if _is_numeric_column(values[c]) and c not in temporal and not ID_NAME.search(c)]
    text = [c for c in columns if c not in numeric and c not in temporal]
    notes: list[str] = []

    if len(rows) == 1:
        if len(numeric) >= 2:
            cats = numeric[:max_categories]
            return _finish({"chartType": "bar", "categories": cats,
                            "series": [{"name": "value", "values": [_number(rows[0][c]) for c in cats]}],
                            "xLabel": "", "yLabel": ""}, question, notes)
        return {"suitable": False, "reason": "a single value is clearer as text than as a chart"}

    label = temporal[0] if temporal else (text[0] if text else None)
    if label is None:
        return {"suitable": False, "reason": "no category or time column to plot against"}
    if not numeric:
        return {"suitable": False, "reason": "no numeric column to plot"}

    labels = [_label(v) for v in values[label]]
    group_cols = [c for c in text + temporal if c != label]
    if len(set(labels)) < len(labels):
        group = next((g for g in group_cols if len({_label(v) for v in values[g]}) <= MAX_SERIES), None)
        if group is None or len(numeric) != 1:
            return {"suitable": False, "reason": f"{label} repeats; aggregate the rows or pick one grouping column"}
        measure = numeric[0]
        groups = sorted({_label(v) for v in values[group]}, key=_sort_key)
        cats = sorted(set(labels), key=_sort_key) if label in temporal else list(dict.fromkeys(labels))
        table = {(lab, _label(g)): _number(m) for lab, g, m in zip(labels, values[group], values[measure])}
        series = [{"name": g, "values": [table.get((c, g)) for c in cats]} for g in groups]
        notes.append(f"pivoted {measure} by {group}")
        spec = {"categories": cats, "series": series, "xLabel": label, "yLabel": measure,
                "title": f"{measure} by {label} and {group}"}
    else:
        measures = numeric[:MAX_SERIES]
        if len(numeric) > MAX_SERIES:
            notes.append(f"kept the first {MAX_SERIES} numeric columns: {', '.join(measures)}")
        order = list(range(len(rows)))
        if label in temporal:
            order.sort(key=lambda i: _sort_key(values[label][i]))
        spec = {"categories": [labels[i] for i in order],
                "series": [{"name": m, "values": [_number(values[m][i]) for i in order]} for m in measures],
                "xLabel": label, "yLabel": measures[0] if len(measures) == 1 else ""}

    if label in temporal:
        spec["chartType"] = "line"
        if len(spec["categories"]) > max_points:
            n = len(spec["categories"])
            spec["categories"] = spec["categories"][-max_points:]
            for s in spec["series"]:
                s["values"] = s["values"][-max_points:]
            notes.append(f"showing the last {max_points} of {n} points")
        return _finish(spec, question, notes)

    one = spec["series"][0]["values"] if len(spec["series"]) == 1 else None
    wants_share = bool(question and SHARE_WORDS.search(question))
    if (wants_share and one is not None and len(spec["categories"]) <= 6
            and all(v is not None and v >= 0 for v in one) and sum(one) > 0):
        spec["chartType"] = "pie"
        return _finish(spec, question, notes)

    if len(spec["categories"]) > max_categories:
        spec = _reduce_categories(spec, max_categories, notes)
    spec["chartType"] = "horizontal_bar" if any(len(c) > LONG_LABEL for c in spec["categories"]) else "bar"
    return _finish(spec, question, notes)


def _reduce_categories(spec: dict, limit: int, notes: list) -> dict:
    n = len(spec["categories"])
    first = spec["series"][0]
    order = sorted(range(n), key=lambda i: (-(first["values"][i] if first["values"][i] is not None else -math.inf), i))
    additive = (len(spec["series"]) == 1 and ADDITIVE.search(first["name"] or "")
                and not NON_ADDITIVE.search(first["name"] or "")
                and all(v is None or v >= 0 for v in first["values"]))
    if additive:
        keep, rest = order[: limit - 1], order[limit - 1:]
        other = sum(first["values"][i] or 0 for i in rest)
        spec["categories"] = [spec["categories"][i] for i in keep] + ["Other"]
        first["values"] = [first["values"][i] for i in keep] + [other]
        notes.append(f"top {limit - 1} of {n} categories; the remaining {len(rest)} are summed into Other")
    else:
        keep = order[:limit]
        spec["categories"] = [spec["categories"][i] for i in keep]
        for s in spec["series"]:
            s["values"] = [s["values"][i] for i in keep]
        notes.append(f"showing the top {limit} of {n} categories by {first['name']}")
    return spec


def _finish(spec: dict, question: str, notes: list) -> dict:
    names = [s["name"] for s in spec["series"]]
    title = question.strip() if question else spec.get("title") or (
        f"{', '.join(names)} by {spec['xLabel']}" if spec.get("xLabel") else ", ".join(spec["categories"][:4]))
    out = {"suitable": True, "chartType": spec["chartType"], "title": title, "xLabel": spec.get("xLabel", ""),
           "yLabel": spec.get("yLabel", ""), "categories": spec["categories"], "series": spec["series"], "notes": notes}
    return out


# --------------------------------------------------------------------------- validate


def validate(raw: dict, max_categories: int = 12, max_points: int = 100) -> dict:
    if not isinstance(raw, dict):
        raise InputError("spec must be a JSON object")
    spec = raw.get("spec", raw) if isinstance(raw.get("spec"), dict) else raw
    if spec.get("suitable") is False:
        return {"valid": False, "suitable": False,
                "reason": spec.get("reason") or "the spec says the data is not suitable for a chart"}
    for a, b in (("chart_type", "chartType"), ("type", "chartType"), ("x_label", "xLabel"), ("y_label", "yLabel")):
        if a in spec and b not in spec:
            spec[b] = spec[a]
    errors, notes = [], []
    ctype = str(spec.get("chartType", "")).strip().lower()
    ctype = ALIASES.get(ctype, ctype)
    if ctype not in CHART_TYPES:
        errors.append(f"chartType must be one of {', '.join(CHART_TYPES)} (got {spec.get('chartType')!r})")
    cats = spec.get("categories")
    if not isinstance(cats, list) or not cats:
        errors.append("categories must be a non-empty list")
        cats = []
    cats = [_label(c) for c in cats]
    if len(set(cats)) != len(cats):
        errors.append("categories must be unique")
    limit = max_points if ctype == "line" else max_categories
    if len(cats) > limit:
        errors.append(f"{len(cats)} categories; at most {limit} for {ctype or 'this chart'} (aggregate or use top N + Other)")
    series_in = spec.get("series")
    if not isinstance(series_in, list) or not series_in:
        errors.append("series must be a non-empty list")
        series_in = []
    if len(series_in) > MAX_SERIES:
        errors.append(f"{len(series_in)} series; at most {MAX_SERIES}")
    series = []
    for idx, s in enumerate(series_in):
        if not isinstance(s, dict) or not isinstance(s.get("values"), list):
            errors.append(f"series[{idx}] must be an object with a values list")
            continue
        vals = []
        for v in s["values"]:
            try:
                n = _number(v)
            except ValueError:
                errors.append(f"series[{idx}] has a non-numeric value {v!r}")
                break
            if isinstance(v, str):
                notes.append(f"series[{idx}]: numeric strings converted to numbers")
            vals.append(n)
        else:
            if len(vals) != len(cats):
                errors.append(f"series[{idx}] has {len(vals)} values for {len(cats)} categories")
            series.append({"name": str(s.get("name") or f"series {idx + 1}"), "values": vals})
    if ctype == "pie":
        if len(series_in) != 1:
            errors.append("pie charts take exactly one series")
        elif series:
            vals = series[0]["values"]
            if any(v is None or v < 0 for v in vals):
                errors.append("pie values must be non-negative numbers without nulls")
            elif sum(vals) <= 0:
                errors.append("pie values must have a positive total")
    if errors:
        return {"valid": False, "errors": errors}
    out = {"suitable": True, "chartType": ctype, "title": str(spec.get("title") or ""), "xLabel": str(spec.get("xLabel") or ""),
           "yLabel": str(spec.get("yLabel") or ""), "categories": cats, "series": series}
    for optional in ("subtitle", "insight"):
        if spec.get(optional):
            out[optional] = str(spec[optional])
    return {"valid": True, "spec": out, "notes": sorted(set(notes))}


# --------------------------------------------------------------------------- main


def _read_json(path: str) -> Any:
    try:
        if path == "-":
            return json.load(sys.stdin)
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise InputError(f"{path}: file not found")
    except json.JSONDecodeError as exc:
        raise InputError(f"{path}: invalid JSON ({exc})")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p_s = sub.add_parser("suggest", help="heuristic spec from result rows")
    p_s.add_argument("rows", help='rows JSON file, or "-" for stdin')
    p_s.add_argument("--question", default="", help="the user question (used for the title and pie detection)")
    p_v = sub.add_parser("validate", help="validate and normalize a proposed spec")
    p_v.add_argument("spec", help='spec JSON file, or "-" for stdin')
    for p in (p_s, p_v):
        p.add_argument("--max-categories", type=int, default=12, help="bar/pie category limit (default 12)")
        p.add_argument("--max-points", type=int, default=100, help="line point limit (default 100)")
    args = parser.parse_args(argv)
    try:
        if args.command == "suggest":
            data = _read_json(args.rows)
            rows = data.get("rows") if isinstance(data, dict) else data
            if not isinstance(rows, list):
                raise InputError("expected a list of row objects or {\"rows\": [...]}")
            result = suggest(rows, args.question, args.max_categories, args.max_points)
            ok = result.get("suitable", False)
        else:
            result = validate(_read_json(args.spec), args.max_categories, args.max_points)
            ok = result["valid"]
    except InputError as exc:
        sys.stderr.write(f"{exc}\n")
        return 2
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
