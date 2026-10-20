#!/usr/bin/env python3
"""Export an HTML presentation (presentations/<slug>/index.html) with headless Chrome.

Examples:
    python export.py deck/index.html --pdf out/deck.pdf                 # PDF, one slide per page (hidden slides skipped)
    python export.py deck/index.html --pdf out/deck.pdf --all           # include hidden slides (page N = slide N)
    python export.py deck/index.html --images out/slides --all          # PDF + one JPG per slide (needs PyMuPDF)
    python export.py deck/index.html --slide 12 --png out/s12.png       # one slide, live state, 1920x1080
    python export.py deck/index.html --slide 12.2 --png out/s12.png     # slide 12 after 2 clicks
    python export.py deck/index.html --pdf out/deck.pdf --console       # also print the page's console messages

Notes:
- The PDF shows every slide in its final state (all fragments and steps), via the deck's print CSS.
- The URL parameter that shows hidden slides is detected from the file: ?all (template) or ?todos (older decks).
- Set CHROME_PATH or pass --chrome if Chrome/Chromium/Edge is not found automatically.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CANDIDATES = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]


def find_chrome(explicit=None):
    for c in [explicit, os.environ.get('CHROME_PATH')]:
        if c and Path(c).exists():
            return c
    for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge'):
        p = shutil.which(name)
        if p:
            return p
    for c in CANDIDATES:
        if Path(c).exists():
            return c
    sys.exit('Chrome/Chromium/Edge not found: set CHROME_PATH or pass --chrome')


def hidden_param(html_path):
    text = Path(html_path).read_text(encoding='utf-8', errors='ignore')
    return 'todos' if 'data-oculto' in text else 'all'


def run_chrome(chrome, args, url, budget, console):
    profile = tempfile.mkdtemp(prefix='deck-export-')
    cmd = [chrome, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
           f'--user-data-dir={profile}', f'--virtual-time-budget={budget}', *args]
    if console:
        cmd += ['--enable-logging=stderr', '--v=0']
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    shutil.rmtree(profile, ignore_errors=True)
    msgs = [line.split('] ', 1)[-1] for line in r.stderr.splitlines() if ':CONSOLE' in line] if console else []
    return r.returncode, msgs


def to_images(pdf, out_dir, width, fmt):
    try:
        import fitz  # PyMuPDF
    except ImportError:
        sys.exit('PyMuPDF is needed for --images: pip install pymupdf')
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf)
    for i, page in enumerate(doc, 1):
        zoom = width / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        target = out / f'{i:02d}.{fmt}'
        if fmt == 'jpg':
            pix.save(str(target), jpg_quality=88)
        else:
            pix.save(str(target))
    return doc.page_count


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', help='path to the presentation index.html')
    ap.add_argument('--pdf', help='write the PDF here')
    ap.add_argument('--images', help='write one image per page into this folder (implies a PDF)')
    ap.add_argument('--format', choices=['jpg', 'png'], default='jpg')
    ap.add_argument('--width', type=int, default=1600, help='image width in pixels (default 1600)')
    ap.add_argument('--slide', help='screenshot one slide: N or N.step (1-based)')
    ap.add_argument('--png', help='output file for --slide')
    ap.add_argument('--all', action='store_true', help='include hidden slides')
    ap.add_argument('--console', action='store_true', help="print the page's console messages")
    ap.add_argument('--budget', type=int, default=20000, help='virtual time budget in ms (default 20000)')
    ap.add_argument('--chrome', help='path to the Chrome/Chromium/Edge executable')
    a = ap.parse_args()

    html = Path(a.html).resolve()
    if not html.exists():
        sys.exit(f'not found: {html}')
    chrome = find_chrome(a.chrome)
    query = f'?{hidden_param(html)}' if a.all else ''
    url = html.as_uri() + query
    messages = []

    if a.slide:
        if not a.png:
            sys.exit('--slide needs --png')
        Path(a.png).parent.mkdir(parents=True, exist_ok=True)
        code, msgs = run_chrome(chrome, ['--window-size=1920,1080', f'--screenshot={Path(a.png).resolve()}'],
                                url + '#' + a.slide, a.budget, a.console)
        messages += msgs
        print(f'slide {a.slide} -> {a.png}' if code == 0 else f'chrome exited with {code}')

    if a.pdf or a.images:
        pdf = Path(a.pdf).resolve() if a.pdf else Path(tempfile.mkdtemp()) / 'deck.pdf'
        pdf.parent.mkdir(parents=True, exist_ok=True)
        code, msgs = run_chrome(chrome, ['--no-pdf-header-footer', f'--print-to-pdf={pdf}'], url, a.budget, a.console)
        messages += msgs
        if code != 0 or not pdf.exists():
            sys.exit(f'chrome exited with {code} and no PDF was written')
        print(f'PDF -> {pdf}')
        if a.images:
            n = to_images(pdf, a.images, a.width, a.format)
            print(f'{n} images -> {a.images}' + ('' if a.all else '  (hidden slides skipped: page numbers may differ from slide numbers)'))

    if a.console:
        print(f'console messages: {len(messages)}')
        for m in messages:
            print('  ' + m)
        if any('Uncaught' in m or 'Error' in m for m in messages):
            sys.exit(1)


if __name__ == '__main__':
    main()
