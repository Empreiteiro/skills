#!/usr/bin/env python3
"""Check that generated SQL is ONE read-only query, list the tables it reads, and optionally cap its rows.

Usage:
    python sql_guard.py "SELECT * FROM orders" --dialect postgres --limit 500
    echo "$SQL" | python sql_guard.py - --dialect sqlite
    python sql_guard.py "$SQL" --dialect bigquery --allowed-tables orders,customers
    python sql_guard.py "$SQL" --no-sqlglot          # force the built-in tokenizer

Accepts plain SQL or text containing a ```sql fenced block (the first block is used). A trailing ";" is dropped.

Rejects:
    * more than one statement;
    * anything whose root is not SELECT / WITH ... SELECT / UNION|INTERSECT|EXCEPT / (SELECT ...);
    * DML/DDL anywhere, including data-modifying CTEs (INSERT, UPDATE, DELETE, MERGE, CREATE, DROP, ALTER,
      TRUNCATE, GRANT, REVOKE, ATTACH, PRAGMA, VACUUM, ...), SELECT ... INTO, locking clauses (FOR UPDATE/SHARE);
    * side-effect or file-access functions (pg_sleep, pg_read_file, lo_import, dblink, load_file, sleep,
      benchmark, xp_cmdshell, openrowset, read_csv, load_extension, nextval, ...);
    * with --allowed-tables, any table outside the list (CTE names are not tables).
Keywords are matched as whole words after removing comments, string literals and quoted identifiers, so
`updated_at`, `is_deleted`, a column called "drop", leading comments and CTEs are fine.

--limit N caps the result: it appends LIMIT N (or lowers a larger top-level LIMIT), inserts TOP N for T-SQL, and
wraps the query in `SELECT * FROM (...) AS _guard LIMIT N` only when it cannot be applied inline.

Output (stdout, JSON): {ok, reason, statement_type, tables, sql, dialect, parser, limit_mode, warnings}
Exit codes: 0 accepted, 1 rejected, 2 usage error.

Uses sqlglot (pip install sqlglot) when it is installed, for parsing and table extraction; otherwise a built-in
tokenizer does the checks and extracts tables heuristically. This is a guard, not a sandbox: also execute with
read-only credentials, a statement timeout and a row cap.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

DIALECTS = ("postgres", "mysql", "sqlite", "bigquery", "snowflake", "tsql", "duckdb")

FORBIDDEN_KEYWORDS = {
    "insert", "update", "delete", "merge", "upsert", "create", "drop", "alter", "truncate", "rename",
    "grant", "revoke", "attach", "detach", "pragma", "vacuum", "into",
}
LOCK_SEQUENCES = (("for", "share"), ("for", "key", "share"), ("lock", "in", "share", "mode"))
FORBIDDEN_FUNCTIONS = {
    "pg_sleep", "pg_sleep_for", "pg_sleep_until", "pg_read_file", "pg_read_binary_file", "pg_ls_dir",
    "pg_stat_file", "pg_terminate_backend", "pg_cancel_backend", "pg_reload_conf", "set_config",
    "lo_import", "lo_export", "dblink", "dblink_exec", "nextval", "setval",
    "load_file", "sleep", "benchmark", "get_lock",
    "xp_cmdshell", "openrowset", "opendatasource", "openquery",
    "load_extension", "readfile", "writefile",
    "read_csv", "read_csv_auto", "read_parquet", "read_json", "read_json_auto", "read_text", "read_blob", "glob",
}
ALLOWED_ROOTS = ("select", "with")
SET_OPERATIONS = ("union", "intersect", "except", "minus")


class Reject(Exception):
    pass


# --------------------------------------------------------------------------- input handling


def extract_sql(text: str) -> str:
    fence = re.search(r"```[ \t]*(?:sql|postgresql|mysql|sqlite|bigquery|snowflake|tsql)?[ \t]*\n?(.*?)```",
                      text, re.DOTALL | re.IGNORECASE)
    sql = fence.group(1) if fence else text
    sql = sql.strip()
    while sql.endswith(";"):
        sql = sql[:-1].rstrip()
    return sql


# --------------------------------------------------------------------------- tokenizer


class Token:
    __slots__ = ("kind", "text", "start", "end", "depth")

    def __init__(self, kind: str, text: str, start: int, end: int, depth: int):
        self.kind, self.text, self.start, self.end, self.depth = kind, text, start, end, depth

    @property
    def low(self) -> str:
        return self.text.lower()


def tokenize(sql: str, dialect: str) -> list[Token]:
    """Split SQL into words, numbers, strings, quoted identifiers and punctuation; drop comments."""
    tokens: list[Token] = []
    i, n, depth = 0, len(sql), 0
    dq_is_string = dialect in ("mysql", "bigquery")
    backslash_escapes = dialect in ("mysql", "bigquery")
    while i < n:
        ch = sql[i]
        if ch.isspace():
            i += 1
            continue
        if sql.startswith("--", i) or (ch == "#" and dialect == "mysql"):
            j = sql.find("\n", i)
            i = n if j < 0 else j + 1
            continue
        if sql.startswith("/*", i):
            level, j = 1, i + 2
            while j < n and level:
                if sql.startswith("/*", j):
                    level, j = level + 1, j + 2
                elif sql.startswith("*/", j):
                    level, j = level - 1, j + 2
                else:
                    j += 1
            if level:
                raise Reject("unterminated block comment")
            i = j
            continue
        # string prefixes: E'..', N'..', B'..', X'..', R'..' (BigQuery raw), b'..'
        if ch in "eEnNbBxXrR" and i + 1 < n and sql[i + 1] == "'" and (i == 0 or not _is_word_char(sql[i - 1])):
            i += 1
            ch = sql[i]
        if dialect == "bigquery" and (sql.startswith("'''", i) or sql.startswith('"""', i)):
            quote = sql[i:i + 3]
            j = sql.find(quote, i + 3)
            if j < 0:
                raise Reject("unterminated string literal")
            tokens.append(Token("string", sql[i:j + 3], i, j + 3, depth))
            i = j + 3
            continue
        if ch == "'" or (ch == '"' and dq_is_string):
            j = _scan_quoted(sql, i, ch, backslash_escapes)
            tokens.append(Token("string", sql[i:j], i, j, depth))
            i = j
            continue
        if ch == "$" and dialect in ("postgres", "duckdb", "snowflake"):
            m = re.match(r"\$([A-Za-z_][A-Za-z0-9_]*)?\$", sql[i:])
            if m:
                tag = m.group(0)
                j = sql.find(tag, i + len(tag))
                if j < 0:
                    raise Reject("unterminated dollar-quoted string")
                tokens.append(Token("string", sql[i:j + len(tag)], i, j + len(tag), depth))
                i = j + len(tag)
                continue
        if ch == '"' or ch == "`":
            j = _scan_quoted(sql, i, ch, False)
            tokens.append(Token("ident", sql[i + 1:j - 1].replace(ch * 2, ch), i, j, depth))
            i = j
            continue
        if ch == "[" and dialect in ("tsql", "sqlite"):
            j = i + 1
            while j < n:
                if sql[j] == "]":
                    if j + 1 < n and sql[j + 1] == "]":
                        j += 2
                        continue
                    break
                j += 1
            if j >= n:
                raise Reject("unterminated [identifier]")
            tokens.append(Token("ident", sql[i + 1:j].replace("]]", "]"), i, j + 1, depth))
            i = j + 1
            continue
        if _is_word_start(ch):
            j = i + 1
            while j < n and (_is_word_char(sql[j]) or sql[j] == "$"):
                j += 1
            tokens.append(Token("word", sql[i:j], i, j, depth))
            i = j
            continue
        if ch.isdigit() or (ch == "." and i + 1 < n and sql[i + 1].isdigit()):
            m = re.match(r"\d*\.?\d+(?:[eE][+-]?\d+)?|\d+\.", sql[i:])
            j = i + (m.end() if m else 1)
            tokens.append(Token("number", sql[i:j], i, j, depth))
            i = j
            continue
        if ch in "@:?":
            m = re.match(r"(@@?|:)[A-Za-z_][A-Za-z0-9_]*|\?", sql[i:])
            if m:
                tokens.append(Token("param", m.group(0), i, i + m.end(), depth))
                i += m.end()
                continue
        if ch == "(":
            tokens.append(Token("punct", ch, i, i + 1, depth))
            depth += 1
            i += 1
            continue
        if ch == ")":
            depth -= 1
            if depth < 0:
                raise Reject("unbalanced parentheses")
            tokens.append(Token("punct", ch, i, i + 1, depth))
            i += 1
            continue
        tokens.append(Token("punct", ch, i, i + 1, depth))
        i += 1
    if depth != 0:
        raise Reject("unbalanced parentheses")
    return tokens


def _is_word_start(ch: str) -> bool:
    return ch.isalpha() or ch == "_"


def _is_word_char(ch: str) -> bool:
    return ch.isalnum() or ch == "_"


def _scan_quoted(sql: str, i: int, quote: str, backslash: bool) -> int:
    j, n = i + 1, len(sql)
    while j < n:
        c = sql[j]
        if backslash and c == "\\":
            j += 2
            continue
        if c == quote:
            if j + 1 < n and sql[j + 1] == quote:
                j += 2
                continue
            return j + 1
        j += 1
    raise Reject("unterminated quoted text")


# --------------------------------------------------------------------------- checks (tokenizer)


def check_tokens(tokens: list[Token]) -> str:
    statements, current = [], []
    for t in tokens:
        if t.kind == "punct" and t.text == ";":
            if current:
                statements.append(current)
            current = []
        else:
            current.append(t)
    if current:
        statements.append(current)
    if not statements:
        raise Reject("empty query")
    if len(statements) > 1:
        raise Reject(f"{len(statements)} statements found; only one query is allowed")
    first = next((t for t in tokens if not (t.kind == "punct" and t.text == "(")), None)
    if first is None or first.kind != "word" or first.low not in ALLOWED_ROOTS:
        shown = first.text.upper() if first is not None else "nothing"
        raise Reject(f"query must start with SELECT or WITH, found {shown}")
    words = [t.low if t.kind == "word" else None for t in tokens]
    for idx, t in enumerate(tokens):
        if t.kind != "word":
            continue
        if t.low in FORBIDDEN_KEYWORDS:
            raise Reject(f"forbidden keyword: {t.text.upper()}")
        if (t.low in FORBIDDEN_FUNCTIONS and idx + 1 < len(tokens)
                and tokens[idx + 1].kind == "punct" and tokens[idx + 1].text == "("):
            raise Reject(f"forbidden function: {t.text}")
        for seq in LOCK_SEQUENCES:
            if tuple(words[idx:idx + len(seq)]) == seq:
                raise Reject(f"locking clause not allowed: {' '.join(seq).upper()}")
    if first.low == "with":
        return "with"
    if any(t.kind == "word" and t.depth == 0 and t.low in SET_OPERATIONS for t in tokens):
        return "set_operation"
    return "select"


def heuristic_tables(tokens: list[Token]) -> list[str]:
    """Names after FROM/JOIN (comma lists included), minus CTE names and table functions."""
    ctes = set()
    for idx, t in enumerate(tokens):
        if t.kind == "word" and t.low == "as" and idx + 1 < len(tokens) and tokens[idx + 1].text == "(":
            prev = idx - 1
            if prev >= 0 and tokens[prev].text == ")":
                depth = tokens[prev].depth
                while prev >= 0 and not (tokens[prev].text == "(" and tokens[prev].depth == depth):
                    prev -= 1
                prev -= 1
            if prev >= 0 and tokens[prev].kind in ("word", "ident"):
                ctes.add(tokens[prev].text.lower())
    found: list[str] = []
    stop = {"where", "group", "order", "having", "limit", "join", "inner", "left", "right", "full", "cross",
            "outer", "on", "using", "union", "intersect", "except", "window", "qualify", "fetch", "offset",
            "natural", "lateral", "pivot", "unpivot", "tablesample", "for", "minus"}
    idx = 0
    while idx < len(tokens):
        t = tokens[idx]
        if t.kind == "word" and t.low in ("from", "join"):
            idx += 1
            while idx < len(tokens):
                name, idx = _read_dotted(tokens, idx)
                if name is None:
                    break
                if idx < len(tokens) and tokens[idx].text == "(":
                    name = None  # table function, e.g. generate_series(...)
                if name and name.lower() not in ctes:
                    found.append(name)
                if t.low == "join":
                    break
                # skip alias, then continue on comma
                if idx < len(tokens) and tokens[idx].kind == "word" and tokens[idx].low == "as":
                    idx += 1
                if (idx < len(tokens) and tokens[idx].kind in ("word", "ident")
                        and tokens[idx].low not in stop and tokens[idx].text != ","):
                    idx += 1
                if idx < len(tokens) and tokens[idx].text == ",":
                    idx += 1
                    continue
                break
            continue
        idx += 1
    seen, out = set(), []
    for name in found:
        if name.lower() not in seen:
            seen.add(name.lower())
            out.append(name)
    return out


def _read_dotted(tokens: list[Token], idx: int) -> tuple[str | None, int]:
    parts = []
    while idx < len(tokens) and tokens[idx].kind in ("word", "ident"):
        parts.append(tokens[idx].text)
        idx += 1
        if idx < len(tokens) and tokens[idx].text == ".":
            idx += 1
            continue
        break
    return (".".join(parts) if parts else None), idx


# --------------------------------------------------------------------------- checks (sqlglot)


def check_sqlglot(sql: str, dialect: str) -> tuple[str, list[str]]:
    import sqlglot
    from sqlglot import exp

    try:
        parsed = [p for p in sqlglot.parse(sql, read=dialect) if p is not None]
    except sqlglot.errors.ParseError as exc:
        first_line = str(exc).splitlines()[0] if str(exc) else "parse error"
        raise Reject(f"could not parse as {dialect}: {first_line}")
    if not parsed:
        raise Reject("empty query")
    if len(parsed) > 1:
        raise Reject(f"{len(parsed)} statements found; only one query is allowed")
    root = parsed[0]
    while isinstance(root, (exp.Subquery, exp.Paren)):
        root = root.this
    set_ops = tuple(c for c in (getattr(exp, n, None) for n in ("SetOperation", "Union", "Intersect", "Except")) if c)
    if not isinstance(root, (exp.Select,) + set_ops):
        raise Reject(f"query must be a SELECT, found {type(root).__name__.upper()}")
    forbidden_names = ("Insert", "Update", "Delete", "Merge", "Create", "Drop", "Alter", "AlterTable",
                       "TruncateTable", "Command", "Copy", "Set", "Pragma", "Attach", "Detach", "Grant",
                       "Revoke", "Into", "Lock", "Use", "Transaction", "Commit", "Rollback", "LoadData", "Kill")
    forbidden = tuple(c for c in (getattr(exp, n, None) for n in forbidden_names) if c)
    bad = next(iter(root.find_all(*forbidden)), None)
    if bad is not None:
        label = {"Into": "SELECT ... INTO", "Lock": "locking clause"}.get(type(bad).__name__, type(bad).__name__.upper())
        raise Reject(f"forbidden construct: {label}")
    for fn in root.find_all(exp.Func):
        name = fn.name if isinstance(fn, exp.Anonymous) else fn.sql_name()
        if str(name).lower() in FORBIDDEN_FUNCTIONS:
            raise Reject(f"forbidden function: {name}")
    ctes = {c.alias_or_name.lower() for c in root.find_all(exp.CTE)}
    tables, seen = [], set()
    for t in root.find_all(exp.Table):
        if not t.name:
            continue
        name = ".".join(p for p in (t.catalog, t.db, t.name) if p)
        if t.name.lower() in ctes and not (t.db or t.catalog):
            continue
        if name.lower() not in seen:
            seen.add(name.lower())
            tables.append(name)
    if any(isinstance(v, exp.With) for v in root.args.values()):
        kind = "with"
    elif isinstance(root, exp.Select):
        kind = "select"
    else:
        kind = "set_operation"
    return kind, tables


# --------------------------------------------------------------------------- limit


def apply_limit(sql: str, tokens: list[Token], dialect: str, limit: int, warnings_out: list) -> tuple[str, str]:
    top_words = [t for t in tokens if t.depth == 0 and t.kind == "word"]
    has_set_op = any(t.low in SET_OPERATIONS for t in top_words)
    has_order = any(t.low == "order" for t in top_words)
    if dialect == "tsql":
        if any(t.low == "top" for t in top_words) or any(t.low in ("offset", "fetch") for t in top_words):
            return sql, "existing"
        if not has_set_op:
            main_select = next(t for t in top_words if t.low == "select")
            pos = tokens.index(main_select)
            anchor = main_select
            if pos + 1 < len(tokens) and tokens[pos + 1].kind == "word" and tokens[pos + 1].low in ("distinct", "all"):
                anchor = tokens[pos + 1]
            return sql[:anchor.end] + f" TOP {limit}" + sql[anchor.end:], "inline"
        if has_order:
            warnings_out.append("T-SQL does not allow ORDER BY inside the wrapping subquery; move the cap into the query")
        return f"SELECT TOP {limit} * FROM (\n{sql}\n) AS _guard", "wrapped"
    for idx, t in enumerate(tokens):
        if t.depth == 0 and t.kind == "word" and t.low == "limit":
            nxt = tokens[idx + 1] if idx + 1 < len(tokens) else None
            after = tokens[idx + 2] if idx + 2 < len(tokens) else None
            if nxt is not None and nxt.kind == "number" and nxt.text.isdigit() and not (after is not None and after.text == ","):
                if int(nxt.text) <= limit:
                    return sql, "existing"
                return sql[:nxt.start] + str(limit) + sql[nxt.end:], "inline-reduced"
            break
    else:
        if not any(t.low in ("fetch", "offset") for t in top_words):
            return sql + f"\nLIMIT {limit}", "inline"
    if has_order:
        warnings_out.append("ORDER BY inside the wrapping subquery: most engines keep it, but it is not guaranteed")
    return f"SELECT * FROM (\n{sql}\n) AS _guard LIMIT {limit}", "wrapped"


# --------------------------------------------------------------------------- main


def guard(text: str, dialect: str, limit: int | None, allowed: list[str] | None, use_sqlglot: bool) -> dict[str, Any]:
    result: dict[str, Any] = {"ok": False, "reason": None, "statement_type": None, "tables": [], "sql": None,
                              "dialect": dialect, "parser": None, "limit_mode": None, "warnings": []}
    sql = extract_sql(text)
    result["sql"] = sql
    parser_name = "fallback"
    if use_sqlglot:
        try:
            import sqlglot  # noqa: F401
            parser_name = "sqlglot"
        except ImportError:
            result["warnings"].append("sqlglot not installed; using the built-in tokenizer (pip install sqlglot)")
    result["parser"] = parser_name
    try:
        if not sql:
            raise Reject("empty query")
        tokens = tokenize(sql, dialect)
        kind = check_tokens(tokens)  # always run: cheap, and catches what a lenient parser might accept
        if parser_name == "sqlglot":
            kind, tables = check_sqlglot(sql, dialect)
        else:
            tables = heuristic_tables(tokens)
        result["statement_type"], result["tables"] = kind, tables
        if allowed is not None:
            if parser_name != "sqlglot":
                result["warnings"].append("table allow-list checked heuristically; install sqlglot for a parser-based check")
            allowed_low = {a.lower() for a in allowed} | {a.lower().split(".")[-1] for a in allowed}
            outside = [t for t in tables if t.lower() not in allowed_low and t.lower().split(".")[-1] not in allowed_low]
            if outside:
                raise Reject(f"table(s) not allowed: {', '.join(outside)}")
        if limit is not None:
            result["sql"], result["limit_mode"] = apply_limit(sql, tokens, dialect, limit, result["warnings"])
        result["ok"] = True
    except Reject as exc:
        result["reason"] = str(exc)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sql", nargs="?", default="-", help='SQL text, or "-" / omitted to read stdin')
    parser.add_argument("--dialect", choices=DIALECTS, default="postgres", help="SQL dialect (default postgres)")
    parser.add_argument("--limit", type=int, help="cap the number of rows returned")
    parser.add_argument("--allowed-tables", help="comma-separated tables the query may read")
    parser.add_argument("--no-sqlglot", action="store_true", help="use the built-in tokenizer even if sqlglot is installed")
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit <= 0:
        parser.error("--limit must be a positive integer")
    text = sys.stdin.read() if args.sql == "-" else args.sql
    if not text.strip():
        parser.error("no SQL given (pass it as an argument or on stdin)")
    allowed = [a.strip() for a in args.allowed_tables.split(",") if a.strip()] if args.allowed_tables else None
    result = guard(text, args.dialect, args.limit, allowed, not args.no_sqlglot)
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
