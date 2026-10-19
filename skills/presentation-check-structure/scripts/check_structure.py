#!/usr/bin/env python3
"""Structural check of an HTML presentation (one <section class="slide"> per slide).

Usage:
    python check_structure.py presentations/<slug>/index.html            # report + exit 1 on errors
    python check_structure.py presentations/<slug>/index.html --console  # also load it in headless Chrome
    python check_structure.py presentations/<slug>/index.html --json     # machine-readable report

Checks:
  errors   data-ctrl without a CTRL.<name> controller; missing local files (src/href);
           external scripts without an exact pinned version; data-until lower than data-f;
           console errors (with --console)
  warnings slides without speaker notes or without the presenter explanation (when the deck uses them);
           "slide N" references that point past the end or to a hidden slide; duplicated titles;
           controllers defined but never used
  info     slide table: number, hidden, steps, fragments, controller, title
Both naming conventions are understood: data-hidden / aside.explain (template) and
data-oculto / aside.explica (older Portuguese decks).
"""
import argparse
import html as htmllib
import json
import re
import subprocess
import sys
from pathlib import Path

SECTION = re.compile(r'<section\s+class="slide[^"]*"[^>]*>.*?</section>', re.S)
EXPLAIN = re.compile(r'<aside class="(?:explain|explica)">(.*?)</aside>', re.S)
NOTES = re.compile(r'<aside class="notes">(.*?)</aside>', re.S)
SLIDE_REF = re.compile(r'\bslides?\s+(\d+)(?:\s*(?:a|to|-|–|e|and)\s*(\d+))?', re.I)


def text(fragment):
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', fragment))).strip()


def parse(path):
    src = Path(path).read_text(encoding='utf-8')
    slides = []
    for n, m in enumerate(SECTION.finditer(src), 1):
        sec = m.group(0)
        tag = re.match(r'<section[^>]*>', sec).group(0)
        title = re.search(r'<h[12][^>]*>(.*?)</h[12]>', sec, re.S)
        notes = NOTES.search(sec)
        expl = EXPLAIN.search(sec)
        body = NOTES.sub('', EXPLAIN.sub('', sec))
        frags = re.findall(r'<[^>]*class="[^"]*\bfragment\b[^"]*"[^>]*>', body)
        slides.append({
            'n': n,
            'title': text(title.group(1)) if title else '',
            'hidden': bool(re.search(r'\sdata-(hidden|oculto)\b', tag)),
            'steps': int((re.search(r'data-steps="(\d+)"', tag) or [0, 0])[1]),
            'ctrl': (re.search(r'data-ctrl="([\w-]+)"', tag) or [None, None])[1],
            'fragments': len(frags),
            'frag_tags': frags,
            'notes': text(notes.group(1)) if notes else '',
            'explain': text(expl.group(1)) if expl else '',
            'line': src.count('\n', 0, m.start()) + 1,
        })
    return src, slides


def check(path):
    src, slides = parse(path)
    base = Path(path).parent
    errors, warnings = [], []
    total = len(slides)
    hidden = {s['n'] for s in slides if s['hidden']}
    uses_explain = any(s['explain'] for s in slides)

    defined = set(re.findall(r'\bCTRL\.([A-Za-z_]\w*)\s*=', src)) | set(re.findall(r"\bCTRL\[['\"]([\w-]+)['\"]\]\s*=", src))
    used = {s['ctrl'] for s in slides if s['ctrl']}
    for s in slides:
        where = f"slide {s['n']} (line {s['line']})"
        if s['ctrl'] and s['ctrl'] not in defined:
            errors.append(f"{where}: data-ctrl=\"{s['ctrl']}\" has no CTRL.{s['ctrl']} controller")
        for t in s['frag_tags']:
            f, u = re.search(r'data-f="(\d+)"', t), re.search(r'data-until="(\d+)"', t)
            if f and u and int(u[1]) < int(f[1]):
                errors.append(f'{where}: fragment with data-until={u[1]} lower than data-f={f[1]}')
        if not s['notes']:
            warnings.append(f'{where}: no speaker notes (aside.notes)')
        if uses_explain and not s['explain']:
            warnings.append(f'{where}: no presenter explanation (aside.explain)')
        for m in SLIDE_REF.finditer(s['notes'] + ' ' + s['explain']):
            for num in filter(None, m.groups()):
                k = int(num)
                if k > total or k < 1:
                    warnings.append(f'{where}: mentions "slide {k}" but the deck has {total} slides')
                elif k in hidden and not s['hidden']:
                    warnings.append(f'{where}: mentions slide {k}, which is hidden')
    for name in sorted(defined - used):
        warnings.append(f'controller CTRL.{name} is defined but no slide uses data-ctrl="{name}"')

    titles = {}
    for s in slides:
        if s['title']:
            titles.setdefault(s['title'], []).append(s['n'])
    for t, ns in titles.items():
        if len(ns) > 1:
            warnings.append(f'duplicated title "{t}" on slides {ns}')

    live = re.sub(r'<!--.*?-->|/\*.*?\*/', '', src, flags=re.S)  # commented-out code does not count
    for url in re.findall(r'<script[^>]+src="(https?://[^"]+)"', live):
        if not re.search(r'[@/]v?\d+\.\d+\.\d+', url):
            errors.append(f'external script without an exact version: {url}')
    for ref in sorted(set(re.findall(r'(?:src|href)="([^"#?:]+)"', live))):
        if ref.startswith(('data', '//')) or ref.endswith('/'):
            continue
        if not (base / ref).exists():
            errors.append(f'missing local file: {ref}')
    for ref in sorted(set(re.findall(r"url\(['\"]?((?:\./)?assets/[^'\")]+)['\"]?\)", live))):
        if not (base / ref).exists():
            errors.append(f'missing local file in CSS: {ref}')
    return slides, errors, list(dict.fromkeys(warnings))


def console_errors(path):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'presentation-export' / 'scripts'))
    try:
        from export import find_chrome, hidden_param, run_chrome  # sibling skill
    except ImportError:
        return ['console check skipped: presentation-export/scripts/export.py not found next to this skill']
    url = Path(path).resolve().as_uri() + '?' + hidden_param(path)
    import tempfile
    pdf = Path(tempfile.mkdtemp()) / 'check.pdf'
    # printing runs every controller in its final step, so lazy slides are exercised too
    _, msgs = run_chrome(find_chrome(), ['--no-pdf-header-footer', f'--print-to-pdf={pdf}'], url, 20000, True)
    return [m for m in msgs if 'Uncaught' in m or 'Error' in m]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html')
    ap.add_argument('--console', action='store_true', help='load the deck in headless Chrome and report console errors')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    slides, errors, warnings = check(a.html)
    if a.console:
        errors += [f'console: {m}' for m in console_errors(a.html)]
    if a.json:
        out = {'slides': [{k: v for k, v in s.items() if k not in ('frag_tags', 'notes', 'explain')} |
                          {'has_notes': bool(s['notes']), 'has_explain': bool(s['explain'])} for s in slides],
               'errors': errors, 'warnings': warnings}
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        vis = sum(1 for s in slides if not s['hidden'])
        print(f'# Structure check: {a.html}\n')
        print(f'{len(slides)} slides ({vis} shown, {len(slides) - vis} hidden), '
              f'{sum(s["steps"] + s["fragments"] for s in slides)} clicks in total\n')
        print('| # | shown | steps | fragments | controller | notes | explain | title |')
        print('|---|---|---|---|---|---|---|---|')
        for s in slides:
            print(f"| {s['n']} | {'no' if s['hidden'] else 'yes'} | {s['steps']} | {s['fragments']} | {s['ctrl'] or ''} | "
                  f"{'yes' if s['notes'] else '**no**'} | {'yes' if s['explain'] else '-'} | {s['title'][:60]} |")
        print(f'\n## Errors ({len(errors)})')
        print('\n'.join(f'- {e}' for e in errors) or '- none')
        print(f'\n## Warnings ({len(warnings)})')
        print('\n'.join(f'- {w}' for w in warnings) or '- none')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
