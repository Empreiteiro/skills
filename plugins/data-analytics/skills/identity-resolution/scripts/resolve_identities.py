#!/usr/bin/env python3
"""Deterministic identity resolution across customer files: normalize keys, link records with union-find.

Examples:
    python resolve_identities.py --source crm=crm.csv --source shop=orders.csv
    python resolve_identities.py --source crm=crm.csv --source shop=orders.csv \\
        --map crm:email=Email,phone=Mobile,pk=CustomerID --map shop:email=buyer_email,phone=buyer_phone \\
        --default-country-code 55 --gmail --out unified.csv
    python resolve_identities.py --source a=a.csv --source b=b.csv --map a:id=ext_id --map b:id=external_id

Inputs:
    --source NAME=PATH    CSV/TSV (encoding and delimiter sniffed), .xlsx or .parquet; repeatable.
    --map NAME:TYPE=COL[,TYPE=COL...]
                          Key columns per source. TYPE is email, phone, id (an identifier shared across
                          sources, e.g. an external customer id) or pk (the record's own key, copied to the
                          output, never used for matching). A TYPE may repeat (phone=Mobile,phone=Home).
                          Without --map, email and phone columns are detected by name; ids never are.

Normalization:
    email  trim, lowercase, strip "mailto:" and <>; must look like local@domain.tld;
           --gmail also drops dots and +tags for gmail.com/googlemail.com.
    phone  digits only; "+" or "00" prefix = already international; otherwise trunk zeros are stripped and
           --default-country-code is prepended when the number has at most --max-national-digits digits.
           Numbers shorter than --min-phone-digits, all-same-digit and 0123456789-style runs are dropped.
    id     trimmed text.
    Junk values (empty, n/a, null, test@test.com, ...; extend with --junk) are skipped. A cell may hold several
    values separated by ";" or "|".

Matching: records sharing any normalized (type, value) key end up in one cluster (union-find, transitive).
A key shared by more than --max-records-per-key records is reported as a hub key (shared office phone,
family email); --drop-hub-keys excludes such keys from linking.

Output:
    stdout  JSON summary (sorted keys): counts, cluster size histogram, largest clusters, warnings.
    --out   per-record mapping (.csv or .json): source, row, pk, unified_id, emails, phones, ids.
unified_id = "u_" + sha1(smallest key in the cluster)[:12] — stable while the cluster's smallest key is stable.

Exit codes: 0 = done, 1 = done but warnings were found and --strict was given, 2 = usage or input error.
Requires pandas (and openpyxl / pyarrow for .xlsx / .parquet).
"""
import argparse
import csv
import hashlib
import io
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    sys.stderr.write("resolve_identities.py needs pandas: pip install pandas\n")
    sys.exit(2)

DEFAULT_JUNK = {
    "", "-", "--", "0", "n/a", "na", "nan", "none", "null", "nil", "unknown", "undefined", "not provided",
    "test@test.com", "test@example.com", "email@email.com", "no@email.com", "noemail@noemail.com",
    "none@none.com", "a@a.com", "x@x.com",
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
EMAIL_HINTS = ("email", "e-mail", "e_mail", "mail")
PHONE_HINTS = ("phone", "mobile", "cell", "celular", "telefone", "tel", "whatsapp", "fone")
KEY_TYPES = ("email", "phone", "id")


class UnionFind:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        self.parent.setdefault(x, x)
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            if rb < ra:
                ra, rb = rb, ra
            self.parent[rb] = ra


def read_table(path):
    p = Path(path)
    if not p.exists():
        raise ValueError(f"file not found: {path}")
    ext = p.suffix.lower()
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(p, dtype=str, keep_default_na=False)
    if ext == ".parquet":
        return pd.read_parquet(p).astype(str)
    raw = p.read_bytes()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    sample = text[:65536]
    try:
        sep = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        sep = "\t" if ext == ".tsv" else ","
    return pd.read_csv(io.StringIO(text), sep=sep, dtype=str, keep_default_na=False)


def _share(values, test):
    values = [v for v in values if v.strip() and v.strip().lower() not in DEFAULT_JUNK]
    return sum(1 for v in values if test(v)) / len(values) if values else 0.0


def detect_keys(df):
    """Email/phone columns by name hint, confirmed by values (>= 50% of a 200-row sample look right)."""
    keys = defaultdict(list)
    for col in df.columns:
        low = str(col).lower()
        sample = [str(v) for v in df[col].head(200).tolist()]
        if any(h in low for h in EMAIL_HINTS) and _share(sample, lambda v: "@" in v) >= 0.5:
            keys["email"].append(col)
        elif any(re.search(rf"(^|[^a-z]){h}", low) for h in PHONE_HINTS) and \
                _share(sample, lambda v: len(re.sub(r"\D", "", v)) >= 8) >= 0.5:
            keys["phone"].append(col)
    return dict(keys)


def norm_email(value, gmail):
    v = value.strip().lower()
    if v.startswith("mailto:"):
        v = v[7:]
    v = v.strip("<> ")
    if not EMAIL_RE.match(v):
        return None
    local, domain = v.rsplit("@", 1)
    if gmail and domain in ("gmail.com", "googlemail.com"):
        local = local.split("+", 1)[0].replace(".", "")
        domain = "gmail.com"
    return f"{local}@{domain}"


def norm_phone(value, cc, max_national, min_digits):
    v = value.strip()
    international = v.startswith("+") or re.sub(r"\D", "", v).startswith("00")
    digits = re.sub(r"\D", "", v)
    if digits.startswith("00"):
        digits = digits[2:]
    elif not international:
        digits = digits.lstrip("0")
        if cc and len(digits) <= max_national:
            digits = cc + digits
        elif cc is None:
            pass
        else:
            international = True
    national = digits[len(cc):] if cc and digits.startswith(cc) else digits
    if len(national) < min_digits or len(set(national)) == 1:
        return None
    if national in "01234567890123456789" or national in "98765432109876543210":
        return None
    return "+" + digits if (international or cc) else digits


def parse_maps(items, sources):
    maps = {}
    for item in items:
        if ":" not in item:
            raise ValueError(f"--map must look like NAME:TYPE=COL[,TYPE=COL]: {item}")
        name, spec = item.split(":", 1)
        if name not in sources:
            raise ValueError(f"--map refers to unknown source '{name}'")
        for pair in filter(None, spec.split(",")):
            if "=" not in pair:
                raise ValueError(f"bad mapping '{pair}' in --map {item}")
            ktype, col = (s.strip() for s in pair.split("=", 1))
            if ktype not in KEY_TYPES + ("pk",):
                raise ValueError(f"unknown key type '{ktype}' (use email, phone, id or pk)")
            maps.setdefault(name, {}).setdefault(ktype, []).append(col)
    return maps


def main(argv=None):
    ap = argparse.ArgumentParser(description="Deterministic identity resolution (see module docstring).",
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", action="append", required=True, metavar="NAME=PATH")
    ap.add_argument("--map", action="append", default=[], metavar="NAME:TYPE=COL[,TYPE=COL]")
    ap.add_argument("--default-country-code", metavar="DIGITS", help="e.g. 55 (Brazil), 1 (US/Canada)")
    ap.add_argument("--max-national-digits", type=int, default=11,
                    help="longest national number; longer numbers are assumed to include the country code (default 11)")
    ap.add_argument("--min-phone-digits", type=int, default=8, help="shortest valid national number (default 8)")
    ap.add_argument("--gmail", action="store_true", help="drop dots and +tags in gmail.com/googlemail.com addresses")
    ap.add_argument("--junk", action="append", default=[], metavar="VALUE", help="extra junk value to ignore")
    ap.add_argument("--max-records-per-key", type=int, default=20, help="flag keys linking more records (default 20)")
    ap.add_argument("--drop-hub-keys", action="store_true", help="do not link through flagged hub keys")
    ap.add_argument("--max-emails-per-cluster", type=int, default=3, help="flag clusters with more emails (default 3)")
    ap.add_argument("--max-cluster-size", type=int, default=50, help="flag clusters with more records (default 50)")
    ap.add_argument("--out", help="write the per-record mapping to this .csv or .json file")
    ap.add_argument("--strict", action="store_true", help="exit 1 when warnings are found")
    args = ap.parse_args(argv)

    cc = re.sub(r"\D", "", args.default_country_code) if args.default_country_code else None
    junk = DEFAULT_JUNK | {j.strip().lower() for j in args.junk}
    try:
        sources = {}
        for item in args.source:
            if "=" not in item:
                raise ValueError(f"--source must look like NAME=PATH: {item}")
            name, path = item.split("=", 1)
            if name in sources:
                raise ValueError(f"duplicate source name '{name}'")
            sources[name] = read_table(path)
        maps = parse_maps(args.map, sources)
    except (ValueError, OSError) as exc:
        sys.stderr.write(f"error: {exc}\n")
        return 2

    summary = {"sources": {}, "invalid_values": Counter(), "junk_values": Counter()}
    records = []  # dicts: source, row, pk, keys {type: [values]}
    no_key_sources = []
    for name, df in sources.items():
        keymap = maps.get(name) or detect_keys(df)
        missing = [c for cols in keymap.values() for c in cols if c not in df.columns]
        if missing:
            sys.stderr.write(f"error: source '{name}' has no column(s) {missing}; columns: {list(df.columns)}\n")
            return 2
        summary["sources"][name] = {"rows": int(len(df)), "keys": {k: v for k, v in sorted(keymap.items())}}
        if not any(keymap.get(t) for t in KEY_TYPES):
            no_key_sources.append(name)
        for idx, row in enumerate(df.to_dict("records")):
            keys = {t: set() for t in KEY_TYPES}
            for ktype in KEY_TYPES:
                for col in keymap.get(ktype, []):
                    raw = str(row.get(col, "") or "")
                    if raw.strip().lower() in junk:
                        if raw.strip():
                            summary["junk_values"][ktype] += 1
                        continue
                    for part in re.split(r"[;|]", raw) if ktype != "id" else [raw]:
                        if part.strip().lower() in junk:
                            if part.strip():
                                summary["junk_values"][ktype] += 1
                            continue
                        if ktype == "email":
                            val = norm_email(part, args.gmail)
                        elif ktype == "phone":
                            val = norm_phone(part, cc, args.max_national_digits, args.min_phone_digits)
                        else:
                            val = part.strip() or None
                        if val is None:
                            summary["invalid_values"][ktype] += 1
                        elif val.lower() not in junk:
                            keys[ktype].add(val)
            pk = " | ".join(str(row.get(c, "")) for c in keymap.get("pk", [])) or None
            records.append({"source": name, "row": idx, "pk": pk, "keys": keys})

    key_records = defaultdict(set)
    for i, rec in enumerate(records):
        for ktype, values in rec["keys"].items():
            for v in values:
                key_records[f"{ktype}:{v}"].add(i)
    hub_keys = {k: len(v) for k, v in key_records.items() if len(v) > args.max_records_per_key}

    uf = UnionFind()
    for i in range(len(records)):
        uf.find(i)
    for key, members in key_records.items():
        if args.drop_hub_keys and key in hub_keys:
            continue
        members = sorted(members)
        for other in members[1:]:
            uf.union(members[0], other)

    clusters = defaultdict(list)
    for i in range(len(records)):
        clusters[uf.find(i)].append(i)

    out_rows, cluster_info, warnings = [], [], []
    for members in clusters.values():
        cluster_keys = sorted({f"{t}:{v}" for i in members for t, vals in records[i]["keys"].items() for v in vals})
        seed = cluster_keys[0] if cluster_keys else f"record:{records[members[0]]['source']}:{records[members[0]]['row']}"
        uid = "u_" + hashlib.sha1(seed.encode("utf-8")).hexdigest()[:12]
        emails = sorted({v for i in members for v in records[i]["keys"]["email"]})
        phones = sorted({v for i in members for v in records[i]["keys"]["phone"]})
        src_count = Counter(records[i]["source"] for i in members)
        cluster_info.append({"unified_id": uid, "size": len(members), "sources": dict(sorted(src_count.items())),
                             "emails": emails, "phones": phones, "has_keys": bool(cluster_keys)})
        if len(emails) > args.max_emails_per_cluster:
            warnings.append({"type": "too_many_emails", "unified_id": uid, "emails": len(emails),
                             "hint": "probably chained through a shared phone or id; review or use --drop-hub-keys"})
        if len(members) > args.max_cluster_size:
            warnings.append({"type": "large_cluster", "unified_id": uid, "records": len(members)})
        for i in members:
            rec = records[i]
            out_rows.append({"source": rec["source"], "row": rec["row"], "pk": rec["pk"], "unified_id": uid,
                             "emails": ";".join(sorted(rec["keys"]["email"])),
                             "phones": ";".join(sorted(rec["keys"]["phone"])),
                             "ids": ";".join(sorted(rec["keys"]["id"]))})
    for name in no_key_sources:
        warnings.append({"type": "no_key_columns", "key": name,
                         "hint": "no email/phone column detected; pass --map NAME:email=COL,phone=COL,id=COL"})
    for key, n in sorted(hub_keys.items()):
        warnings.append({"type": "hub_key", "key": key, "records": n,
                         "dropped": bool(args.drop_hub_keys)})

    out_rows.sort(key=lambda r: (r["source"], r["row"]))
    cluster_info.sort(key=lambda c: (-c["size"], c["unified_id"]))
    warnings.sort(key=lambda w: (w["type"], w.get("unified_id", w.get("key", ""))))
    sizes = Counter(c["size"] for c in cluster_info)
    summary.update({
        "records": len(records),
        "records_without_keys": sum(1 for r in records if not any(r["keys"].values())),
        "clusters": len(cluster_info),
        "multi_record_clusters": sum(1 for c in cluster_info if c["size"] > 1),
        "multi_source_clusters": sum(1 for c in cluster_info if len(c["sources"]) > 1),
        "cluster_sizes": {str(k): sizes[k] for k in sorted(sizes)},
        "largest_clusters": [c for c in cluster_info if c["size"] > 1][:5],
        "warnings": warnings,
        "invalid_values": dict(sorted(summary["invalid_values"].items())),
        "junk_values": dict(sorted(summary["junk_values"].items())),
    })

    if args.out:
        out = Path(args.out)
        if out.suffix.lower() == ".json":
            out.write_text(json.dumps(out_rows, indent=2, ensure_ascii=False), encoding="utf-8")
        else:
            pd.DataFrame(out_rows, columns=["source", "row", "pk", "unified_id", "emails", "phones", "ids"]) \
                .to_csv(out, index=False)
        summary["out"] = str(out)
    print(json.dumps(summary, indent=2, sort_keys=True, ensure_ascii=False))
    return 1 if (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
