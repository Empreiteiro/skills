#!/usr/bin/env python3
"""Compare two folders of card renders (before / after) and list the images that really changed.

Usage:
    python compare_renders.py before/ after/                        # table + exit 1 if anything changed
    python compare_renders.py before/ after/ --expect "07-*,weekly-*"  # changes allowed only on these files
    python compare_renders.py before/ after/ --diff diffs/          # also write a highlighted diff per changed image

Images are matched by file name. --expect takes comma-separated shell patterns (fnmatch) matched against
the file name. Card renders are deterministic PNGs, so by default a single pixel that differs at all counts
as a change; raise --threshold (0-255) and --min-pixels for sources with noise, such as JPEG or animations.
Exit code 1 when an image changed outside --expect (or when anything changed and --expect is not given).
"""
import argparse
import fnmatch
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit('Pillow is needed: pip install pillow')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('before')
    ap.add_argument('after')
    ap.add_argument('--threshold', type=int, default=0, help='per-pixel difference that is ignored (default 0)')
    ap.add_argument('--min-pixels', type=int, default=1, help='changed pixels needed to flag an image (default 1)')
    ap.add_argument('--diff', help='folder for diff images of the changed files')
    ap.add_argument('--expect', default='', help='comma-separated file name patterns expected to change')
    a = ap.parse_args()

    before, after = Path(a.before), Path(a.after)
    exts = {'.png', '.jpg', '.jpeg', '.webp'}
    names_b = {p.name for p in before.iterdir() if p.suffix.lower() in exts}
    names_a = {p.name for p in after.iterdir() if p.suffix.lower() in exts}
    patterns = [x.strip() for x in a.expect.split(',') if x.strip()]
    changed, unexpected = [], []

    def flag(name):
        changed.append(name)
        if patterns and not any(fnmatch.fnmatch(name, p) for p in patterns):
            unexpected.append(name)

    print('| image | changed pixels | where (x0, y0, x1, y1) | result |')
    print('|---|---|---|---|')
    for name in sorted(names_b | names_a):
        if name not in names_a or name not in names_b:
            print(f"| {name} | - | - | {'removed' if name not in names_a else 'new'} |")
            flag(name)
            continue
        ia = Image.open(after / name).convert('RGBA')
        ib = Image.open(before / name).convert('RGBA')
        if ia.size != ib.size:
            print(f'| {name} | - | - | **size {ib.size[0]}x{ib.size[1]} -> {ia.size[0]}x{ia.size[1]}** |')
            flag(name)
            continue
        # The largest difference in any channel, alpha included: a gray conversion would hide a
        # one-step change in a single channel.
        bands = ImageChops.difference(ia, ib).split()
        d = bands[0]
        for band in bands[1:]:
            d = ImageChops.lighter(d, band)
        mask = d.point(lambda v: 255 if v > a.threshold else 0)
        count = mask.histogram()[255]
        if count < a.min_pixels:
            print(f'| {name} | {count} | - | same |')
            continue
        print(f'| {name} | {count} | {mask.getbbox()} | **changed** |')
        flag(name)
        if a.diff:
            out = Path(a.diff)
            out.mkdir(parents=True, exist_ok=True)
            red = Image.new('RGB', ia.size, (240, 60, 60))
            base = ia.convert('RGB').point(lambda v: v // 2)
            Image.composite(red, base, mask).save(out / f'{Path(name).stem}-diff.png')

    total = len(names_a | names_b)
    summary = f'\nchanged: {len(changed)} of {total}'
    if patterns:
        summary += f' · unexpected: {", ".join(unexpected) or "none"}'
    print(summary)
    sys.exit(1 if (unexpected if patterns else changed) else 0)


if __name__ == '__main__':
    main()
