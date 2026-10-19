#!/usr/bin/env python3
"""Compare two folders of slide renders (before / after) and list the slides that really changed.

Usage:
    python compare_renders.py before/ after/                     # table + exit 1 if anything changed
    python compare_renders.py before/ after/ --diff diffs/       # also write a highlighted diff image per changed slide
    python compare_renders.py before/ after/ --expect 28,29      # changes allowed only on these slides

Images are matched by file name (01.jpg, 02.jpg ... as written by presentation-export).
A slide counts as changed when more than --min-pixels pixels differ by more than --threshold (0-255).
The defaults ignore film grain or JPEG noise (mean difference around 4) and tiny shifts from
floating animations, while any moved block, new text or recolored node shows up as thousands of pixels.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageStat
except ImportError:
    sys.exit('Pillow is needed: pip install pillow')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('before')
    ap.add_argument('after')
    ap.add_argument('--threshold', type=int, default=40, help='per-pixel difference that counts (default 40)')
    ap.add_argument('--min-pixels', type=int, default=500, help='changed pixels needed to flag a slide (default 500)')
    ap.add_argument('--diff', help='folder for diff images of the changed slides')
    ap.add_argument('--expect', default='', help='comma-separated slide numbers that are expected to change')
    a = ap.parse_args()

    before, after = Path(a.before), Path(a.after)
    exts = {'.jpg', '.jpeg', '.png'}
    names_b = {p.name for p in before.iterdir() if p.suffix.lower() in exts}
    names_a = {p.name for p in after.iterdir() if p.suffix.lower() in exts}
    expected = {int(x) for x in a.expect.split(',') if x.strip()}
    changed, unexpected = [], []

    print('| image | mean diff | changed pixels | result |')
    print('|---|---|---|---|')
    for name in sorted(names_b | names_a):
        if name not in names_a or name not in names_b:
            print(f"| {name} | - | - | {'removed' if name not in names_a else 'new'} |")
            changed.append(name)
            continue
        ia = Image.open(after / name).convert('RGB')
        ib = Image.open(before / name).convert('RGB')
        if ia.size != ib.size:
            ib = ib.resize(ia.size)
        d = ImageChops.difference(ia, ib).convert('L')
        mean = ImageStat.Stat(d).mean[0]
        count = sum(d.histogram()[a.threshold + 1:])
        is_changed = count >= a.min_pixels
        print(f"| {name} | {mean:.2f} | {count} | {'**changed**' if is_changed else 'same'} |")
        if is_changed:
            changed.append(name)
            num = int(''.join(ch for ch in Path(name).stem if ch.isdigit()) or 0)
            if expected and num not in expected:
                unexpected.append(name)
            if a.diff:
                out = Path(a.diff)
                out.mkdir(parents=True, exist_ok=True)
                mask = d.point(lambda v: 255 if v > a.threshold else 0)
                red = Image.new('RGB', ia.size, (240, 60, 60))
                Image.composite(red, ia.point(lambda v: v // 2), mask).save(out / f'{Path(name).stem}-diff.png')

    print(f'\nchanged: {len(changed)} of {len(names_a | names_b)}' + (f' · unexpected: {", ".join(unexpected) or "none"}' if expected else ''))
    sys.exit(1 if (unexpected if expected else changed) else 0)


if __name__ == '__main__':
    main()
