"""Build the GitHub Pages site: every presentation, plus an index page that lists them.

Usage:
    python presentations/build_site.py _site

Each presentations/<slug>/ with an index.html (except _template) is copied as is to <out>/<slug>/, so the deck
is served at <site>/<slug>/ with its assets/ next to it. The index lists the decks with their <title>, language
and date of the last commit that touched the folder. .github/workflows/pages.yml runs this on every push to main.
"""
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TITLE = re.compile(r'<title>(.*?)</title>', re.S)
LANG = re.compile(r'<html[^>]*\slang="([^"]+)"')

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentations</title>
<style>
  :root {{ --bg: #F6F7F9; --fg: #0E1115; --muted: #5B6673; --line: #DDE2E8; --accent: #2A7FD4; }}
  @media (prefers-color-scheme: dark) {{
    :root {{ --bg: #0E1115; --fg: #E8ECF1; --muted: #A7B3C0; --line: #262C34; --accent: #4C9BE8; }}
  }}
  body {{ margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }}
  main {{ max-width: 760px; margin: 0 auto; padding: 48px 16px; }}
  h1 {{ font-size: 28px; margin: 0 0 4px; }}
  p {{ color: var(--muted); margin: 0 0 32px; }}
  ul {{ list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }}
  li {{ padding: 16px 0; border-bottom: 1px solid var(--line); }}
  a {{ color: var(--accent); font-size: 19px; font-weight: 600; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  small {{ display: block; color: var(--muted); }}
</style>
</head>
<body>
<main>
<h1>Presentations</h1>
<p>Arrows or space to advance, <kbd>F</kbd> fullscreen, <kbd>O</kbd> overview, <kbd>S</kbd> presenter window.
Source: <a href="https://github.com/Empreiteiro/skills/tree/main/presentations" style="font-size:inherit;font-weight:inherit">Empreiteiro/skills</a>.</p>
<ul>
{items}
</ul>
</main>
</body>
</html>
"""


def last_change(folder):
    try:
        return subprocess.run(['git', 'log', '-1', '--format=%cs', '--', str(folder)], cwd=HERE,
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ''


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve()
    if out == HERE or HERE in out.parents:
        sys.exit('the output folder must be outside presentations/')
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)

    items = []
    decks = sorted(p for p in HERE.iterdir()
                   if p.is_dir() and not p.name.startswith(('_', '.')) and (p / 'index.html').is_file())
    for deck in decks:
        shutil.copytree(deck, out / deck.name, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        source = (deck / 'index.html').read_text(encoding='utf-8')
        title = TITLE.search(source)
        title = html.unescape(title.group(1).strip()) if title else deck.name
        lang = LANG.search(source)
        changed = last_change(deck)
        meta = ' · '.join(m for m in (lang and lang.group(1), changed and 'updated ' + changed) if m)
        items.append(f'<li><a href="{html.escape(deck.name)}/">{html.escape(title)}</a>'
                     f'<small>{html.escape(meta)}</small></li>')
        print(f'{deck.name}/  {title}')

    (out / 'index.html').write_text(PAGE.format(items='\n'.join(items)), encoding='utf-8')
    print(f'{len(decks)} presentation(s) in {out}')


if __name__ == '__main__':
    main()
