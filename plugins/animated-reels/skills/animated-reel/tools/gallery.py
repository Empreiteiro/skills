#!/usr/bin/env python3
"""Builds the workspace index from the reel-NN-<slug>/ folders: README.md (a table), index.html (a gallery to watch
every video together) and _grid-preview.jpg (the covers as the profile's 3:4 grid shows them, newest first).
Reads only the disk: the table comes from the folders and their caption .md, not from any plan.
   python3 gallery.py [workspace=./reels-out] [prefix=reel]
Needs ffprobe (durations) and magick (the grid preview; skipped with a warning if missing).
"""
import html, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path('reels-out')
PREFIX = sys.argv[2] if len(sys.argv) > 2 else 'reel'


def field(md, name):
    m = re.search(r'^- \*\*' + re.escape(name) + r'\*\*: (.+)$', md, re.M)
    return m.group(1).strip().strip('“”"') if m else ''


def reels():
    out = []
    for d in sorted(ROOT.glob(f'{PREFIX}-[0-9][0-9]-*')):
        if not d.is_dir():
            continue
        mp4 = next(iter(sorted(d.glob('*.mp4'))), None)
        cover = next(iter(sorted(d.glob('*-cover.png'))), None)
        mdf = next(iter(sorted(d.glob('*.md'))), None)
        md = mdf.read_text(encoding='utf-8') if mdf else ''
        cap = re.search(r'##\s*Caption[\s\S]*?```(?:text)?\n([\s\S]*?)```', md)
        dur = ''
        if mp4:
            r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp4)], capture_output=True, text=True)
            dur = f'{float(r.stdout.strip() or 0):.1f}'
        num = d.name[len(PREFIX) + 1:len(PREFIX) + 3]
        out.append(dict(num=num, folder=d.name, mp4=mp4, cover=cover, md=mdf, dur=dur, character=field(md, 'Character').split(' (')[0],
                        focus=field(md, 'Focus'), line=field(md, 'First line'), cover_txt=field(md, 'Cover text'),
                        hook=(cap.group(1).strip().splitlines()[0] if cap else '')))
    return out


def readme(rs):
    L = ['# Animated reels', '',
         'Made with the `animated-reel` skill. Open `index.html` to watch them together. In each folder: the MP4, the',
         'cover and the ready caption (`.md`, with the first-comment link). `engine/` is the working copy of the engine.', '',
         '| # | character | focus | folder | s | first line | cover | caption hook |', '|---|---|---|---|---|---|---|---|']
    for r in rs:
        L.append(f"| {r['num']} | {r['character']} | {r['focus']} | {r['folder']} | {r['dur']} | {r['line']} | {r['cover_txt']} | {r['hook']} |")
    L += ['', 'Nothing here has been published.', '']
    (ROOT / 'README.md').write_text('\n'.join(L), encoding='utf-8')


def page(rs):
    e = html.escape
    cards = ''
    for r in reversed(rs):
        if not r['mp4']:
            continue
        poster = f' poster="{e(r["folder"])}/{e(r["cover"].name)}"' if r['cover'] else ''
        cards += (f'<figure><video controls preload="metadata" playsinline{poster} src="{e(r["folder"])}/{e(r["mp4"].name)}"></video>'
                  f'<figcaption><p class="line">“{e(r["line"])}”</p><p class="meta">{PREFIX}-{r["num"]} · {e(r["character"])} · {e(r["dur"])} s</p>'
                  f'<p class="focus">{e(r["focus"])}</p></figcaption></figure>')
    doc = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Animated reels</title><style>
:root{{--paper:#f4eee4;--ink:#2b2a28;--muted:#57534e}}
@media (prefers-color-scheme:dark){{:root{{--paper:#161413;--ink:#ede9e3;--muted:#a9a49e}}}}
body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 Georgia,serif}}
main{{max-width:1180px;margin:0 auto;padding:32px 16px 64px}}
h1{{font:700 30px/1.1 -apple-system,Helvetica,sans-serif;letter-spacing:-.02em;margin:0 0 6px}}
.sub{{color:var(--muted);margin:0 0 28px}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}}
figure{{margin:0}} video{{width:100%;aspect-ratio:9/16;background:#000;display:block}}
.line{{margin:8px 0 2px;font-size:15px}} .meta,.focus{{margin:0;color:var(--muted);font:12px/1.4 ui-monospace,Menlo,monospace}}
</style></head><body><main>
<h1>Animated reels</h1>
<p class="sub">Newest first.</p>
<div class="g">{cards}</div>
</main></body></html>'''
    (ROOT / 'index.html').write_text(doc, encoding='utf-8')


def preview(rs):
    covers = [str(r['cover']) for r in reversed(rs) if r['cover']]
    if not covers:
        return
    if not shutil.which('magick'):
        print('warning: magick not found, _grid-preview.jpg skipped')
        return
    with tempfile.TemporaryDirectory() as tmp:
        tiles = []
        for i, c in enumerate(covers):
            t = Path(tmp) / f'{i:03d}.png'
            subprocess.run(['magick', c, '-crop', '1080x1440+0+240', '+repage', '-resize', '360x480', str(t)], check=True)
            tiles.append(str(t))
        # rows of 3 with +append and the stack with -append: `magick montage` needs Ghostscript on many builds
        args = ['magick']
        for i in range(0, len(tiles), 3):
            args += ['(', *tiles[i:i + 3], '-bordercolor', '#222222', '-border', '4', '+append', ')']
        subprocess.run([*args, '-background', '#222222', '-gravity', 'NorthWest', '-append', '+repage', '-quality', '85',
                        str(ROOT / '_grid-preview.jpg')], check=True)


if __name__ == '__main__':
    rs = reels()
    readme(rs); page(rs); preview(rs)
    print(f'{len(rs)} reels in {ROOT}')
    for r in rs:
        print(f"  {PREFIX}-{r['num']} {r['character']:<24} {r['dur']:>5} s  mp4={'ok' if r['mp4'] else '-'} cover={'ok' if r['cover'] else '-'} md={'ok' if r['md'] else '-'}")
