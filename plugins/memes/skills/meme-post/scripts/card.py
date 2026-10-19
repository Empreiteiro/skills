#!/usr/bin/env python3
"""Render the square art of a meme post as a 1080x1080 PNG: a line of text, or a title over a drawing.

    python3 card.py spec.json post.png
    echo '{"text": "..."}' | python3 card.py - post.png
    python3 card.py spec.json --lines        # print the line breaks the art will use

The spec is JSON:

    {
      "type": "text",                         text | line | staircase | bars | pie
      "text": "First line.\\nSecond line.",    the whole post for `text`; the title above a drawing otherwise
      "labels": ["Rent", "Food", "Me"],       drawings only
      "values": [60, 35, 5],                  bars and pie only
      "theme": "light",                       light (default) | dark
      "brand": "Page Name",                   header, optional
      "handle": "@page.name",                 header, optional
      "logo": "logo.png",                     header, optional: a PNG drawn at the header's height
      "font": "RobotoMono-Bold.ttf"           optional; default: $MEME_FONT, Roboto Mono, or the system's bold monospace
    }

The reel and game scripts draw through `draw_card()` as well, so the last frame of a video is this same image.
Needs Pillow (`pip install pillow`).
"""
import json, math, os, subprocess, sys

from PIL import Image, ImageDraw, ImageFont

SIDE = 1080
# Instagram's profile grid shows a square post cropped to 4:5, losing 10% on each side. Fitting inside that crop
# is not enough: at 0.13 the text touched both edges of the crop; at 0.16 it keeps ~65px of air on each side.
MARGIN = round(SIDE * 0.16)
HEADER_TOP = round(SIDE * 0.375)
HEADER_H = round(SIDE * 0.079)
BODY = round(SIDE * 0.032)       # 35px: the same in every post. A long line wraps; it never shrinks
LEADING = 1.42
SS = 3                           # drawings are made at 3x and reduced, for smooth edges

THEMES = {'light': ((255, 255, 255), (0, 0, 0)), 'dark': ((0, 0, 0), (255, 255, 255))}
TYPES = ('text', 'line', 'staircase', 'bars', 'pie')
# how many labels each drawing holds before it loses its rhythm or gets cramped
LABELS = {'line': (3, 5), 'staircase': (4, 6), 'bars': (3, 5), 'pie': (2, 3)}


def clamp(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


# ------------------------------------------------------------------- fonts
_font_path = {}
_fonts = {}


def find_font(path=None):
    """The font file: the spec's, $MEME_FONT, Roboto Mono if installed, else the system's bold monospace."""
    key = path or ''
    if key in _font_path:
        return _font_path[key]
    found = path or os.environ.get('MEME_FONT')
    if not found:
        for pattern in ('Roboto Mono:bold', 'monospace:bold'):
            try:
                out = subprocess.run(['fc-match', '-f', '%{file}', pattern], capture_output=True,
                                     text=True, timeout=10).stdout.strip()
            except (OSError, subprocess.SubprocessError):
                out = ''
            # fc-match always answers with something; only take Roboto Mono if it is really Roboto Mono
            if out and os.path.exists(out) and ('roboto' in out.lower() or pattern == 'monospace:bold'):
                found = out
                break
    if not found:
        for p in ('/Library/Fonts/RobotoMono-Bold.ttf', 'C:/Windows/Fonts/consolab.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'):
            if os.path.exists(p):
                found = p
                break
    if not found or not os.path.exists(found):
        sys.exit('no font found: pass "font" in the spec or set MEME_FONT to a .ttf/.otf file')
    _font_path[key] = found
    return found


def font(size, path=None):
    path = find_font(path)
    if (size, path) not in _fonts:
        _fonts[size, path] = ImageFont.truetype(path, size)
    return _fonts[size, path]


# ------------------------------------------------------------------- writing
def write(img, xy, text, fnt, color, alpha=1.0, anchor='ls'):
    """Write with opacity without lying about what is behind.

    Fading the ink towards the background color only works on a flat background; over a falling sheet of paper
    the letters would punch a hole. So a translucent line goes on its own RGBA tile, composited on top.
    """
    if alpha <= 0.003 or not text:
        return
    if alpha >= 0.997:
        ImageDraw.Draw(img).text(xy, text, font=fnt, fill=color, anchor=anchor)
        return
    box = ImageDraw.Draw(img).textbbox(xy, text, font=fnt, anchor=anchor)
    x0, y0 = int(box[0]) - 4, int(box[1]) - 4
    w, h = int(box[2]) - x0 + 8, int(box[3]) - y0 + 8
    tile = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((xy[0] - x0, xy[1] - y0), text, font=fnt,
                              fill=tuple(color) + (round(255 * alpha),), anchor=anchor)
    img.alpha_composite(tile, (x0, y0))


def wrap(text, fnt, width):
    """Break into lines that fit `width`, keeping the author's own line breaks."""
    lines = []
    for para in str(text).split('\n'):
        if not para.strip():
            lines.append('')
            continue
        line = ''
        for word in para.split():
            attempt = (line + ' ' + word).strip()
            if line and fnt.getlength(attempt) > width:
                lines.append(line)
                line = word
            else:
                line = attempt
        lines.append(line)
    return lines


def body_lines(spec):
    """The lines exactly as the art breaks them."""
    return wrap(spec.get('text', ''), font(BODY, spec.get('font')), SIDE - 2 * MARGIN)


def colors(spec):
    theme = spec.get('theme', 'light')
    if theme not in THEMES:
        raise ValueError('theme must be one of: %s' % ', '.join(THEMES))
    return THEMES[theme]


# ------------------------------------------------------------------- header
_logos = {}


def _logo(path):
    if path not in _logos:
        im = Image.open(path).convert('RGBA')
        _logos[path] = im.resize((max(1, round(im.width * HEADER_H / im.height)), HEADER_H), Image.LANCZOS)
    return _logos[path]


def draw_header(img, spec, ink, y0=0, reveal=1.0, alpha=1.0):
    """Logo, page name and handle. Returns where the header ends, in card coordinates.

    `reveal` uncovers the logo from left to right and `alpha` fades the two lines of text: that is how a reel
    prints the header. Without a header the body stays where it would be — its position is part of the look.
    """
    x = MARGIN
    if spec.get('logo'):
        logo = _logo(spec['logo'])
        w = round(logo.width * clamp(reveal))
        if w > 0:
            img.alpha_composite(logo.crop((0, 0, w, logo.height)), (MARGIN, y0 + HEADER_TOP))
        x += logo.width + round(SIDE * 0.028)
    if spec.get('brand'):
        write(img, (x, y0 + HEADER_TOP + round(SIDE * 0.035)), spec['brand'],
              font(round(SIDE * 0.0365), spec.get('font')), ink, alpha)
    if spec.get('handle'):
        write(img, (x, y0 + HEADER_TOP + round(SIDE * 0.0645)), spec['handle'],
              font(round(SIDE * 0.0225), spec.get('font')), ink, alpha)
    return HEADER_TOP + HEADER_H


def draw_body(img, spec, ink, top, y0=0, alphas=None):
    """The text of the post. `alphas` is one opacity per line: it lets the punchline arrive after the setup."""
    fnt = font(BODY, spec.get('font'))
    step = round(BODY * LEADING)
    lines = body_lines(spec)
    for i, line in enumerate(lines):
        a = 1.0 if alphas is None else (alphas[i] if i < len(alphas) else 0.0)
        write(img, (MARGIN, y0 + top + i * step + BODY), line, fnt, ink, a)
    return top + len(lines) * step


# ------------------------------------------------------------------- drawings
# No axes, grid, legend, percentages, arrows or color: a thick stroke and labels in the same font as the text.
# A meme drawing, not a report.

def _line(d, labels, y, ink):
    """Zigzag: each label marks a valley, and the line ends going up."""
    n = max(2, len(labels))
    left, right = MARGIN * 1.2, SIDE - MARGIN
    high, low = y + SIDE * 0.06, SIDE * 0.87
    step = (right - left) / (n * 2 - 1)
    pts = []
    for i in range(n * 2):
        x = left + i * step
        if i % 2 == 0:                               # a valley
            pts.append((x, low - (SIDE * 0.03 if i == 0 else 0)))
        else:                                        # a peak; the last one climbs higher than the others
            pts.append((x, high if i == n * 2 - 1 else high + (low - high) * 0.32))
    w = round(SIDE * 0.015) * SS
    d.line([(x * SS, y_ * SS) for x, y_ in pts], fill=ink, width=w, joint='curve')
    for x, y_ in (pts[0], pts[-1]):
        d.ellipse([x * SS - w / 2, y_ * SS - w / 2, x * SS + w / 2, y_ * SS + w / 2], fill=ink)
    size = round(SIDE * 0.030)
    fnt_labels = []
    for i, label in enumerate(labels):
        x, y_ = pts[min(i * 2, len(pts) - 1)]
        fnt_labels.append((x, y_ + size * 1.5, label, size, 'ms'))
    return fnt_labels


def _staircase(d, labels, y, ink):
    """Steps climbing left to right, one label per step, the first label on the bottom step."""
    n = max(1, len(labels))
    left, right = MARGIN, SIDE - MARGIN
    base, top = SIDE * 0.94, y + SIDE * 0.03
    sw, sh = (right - left) / n, (base - top) / n
    w = round(SIDE * 0.006) * SS / 2
    prev = base
    for i in range(n):
        x, yi = (left + i * sw) * SS, (base - (i + 1) * sh) * SS
        d.rectangle([x - w, yi - w, x + w, prev * SS + w], fill=ink)                 # the riser
        d.rectangle([x - w, yi - w, (left + (i + 1) * sw) * SS + w, yi + w], fill=ink)  # the tread
        prev = base - (i + 1) * sh
    size = round(SIDE * 0.034)
    return [(left + i * sw + sw * 0.14, base - (i + 1) * sh + sh * 0.62, label, size, 'ls')
            for i, label in enumerate(labels)]


def _bars(d, labels, values, y, ink):
    """Side-by-side bars. The joke is usually the last one, absurdly small."""
    n = max(1, len(labels))
    values = list(values or [])[:n] + [50] * (n - len(values or []))
    peak = max(values) or 1
    left, right = MARGIN, SIDE - MARGIN
    base, top = SIDE * 0.86, y + SIDE * 0.04
    lane = (right - left) / n
    bw = lane * 0.62
    size = round(SIDE * 0.026)
    out = []
    for i, (label, v) in enumerate(zip(labels, values)):
        h = (base - top) * (v / peak)
        x = left + i * lane + (lane - bw) / 2
        d.rectangle([x * SS, (base - h) * SS, (x + bw) * SS, base * SS], fill=ink)
        out.append((x + bw / 2, base + size * 1.6, label, size, 'ms'))
    return out


def _pie(d, labels, values, y, ink, bg):
    """Slices alternate filled and empty: two colors only. Works best with one slice almost invisible."""
    values = list(values or [1] * len(labels))
    total = sum(values) or 1
    top, bottom = y + SIDE * 0.075, SIDE * 0.90
    cx, cy = SIDE / 2, (top + bottom) / 2
    r = min(SIDE * 0.25, (bottom - top) / 2 * 0.74)
    size = round(SIDE * 0.026)
    ang, out = -90.0, []
    for i, (label, v) in enumerate(zip(labels, values)):
        sweep = 360.0 * v / total
        d.pieslice([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], ang, ang + sweep,
                   fill=ink if i % 2 == 0 else bg, outline=ink, width=round(SIDE * 0.006) * SS)
        mid = math.radians(ang + sweep / 2)
        c, s = math.cos(mid), math.sin(mid)
        # near the vertical the label is centered; otherwise it leans away from the slice
        anchor = 'ms' if abs(c) < 0.30 else ('ls' if c > 0 else 'rs')
        out.append((cx + r * 1.22 * c, cy + r * 1.22 * s + size * 0.35, label, size, anchor))
        ang += sweep
    return out


_drawings = {}


def drawing_layer(spec, y):
    """The drawing on a transparent square layer. Cached: a reel asks for it on every frame."""
    key = (json.dumps(spec, sort_keys=True), y)
    if key in _drawings:
        return _drawings[key]
    bg, ink = colors(spec)
    kind, labels, values = spec.get('type'), spec.get('labels') or [], spec.get('values') or []
    big = Image.new('RGBA', (SIDE * SS, SIDE * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    if kind == 'line':
        placed = _line(d, labels, y, ink)
    elif kind == 'staircase':
        placed = _staircase(d, labels, y, ink)
    elif kind == 'bars':
        placed = _bars(d, labels, values, y, ink)
    elif kind == 'pie':
        placed = _pie(d, labels, values, y, ink, bg)
    else:
        raise ValueError('type must be one of: %s' % ', '.join(TYPES))
    layer = big.resize((SIDE, SIDE), Image.LANCZOS)
    for x, y_, label, size, anchor in placed:
        fnt = font(size, spec.get('font'))
        if anchor == 'ms':                           # keep centered labels inside the margins
            half = fnt.getlength(label) / 2
            x = min(max(x, MARGIN + half), SIDE - MARGIN - half)
        write(layer, (x, y_), label, fnt, ink, 1.0, anchor)
    _drawings[key] = layer
    return layer


# ------------------------------------------------------------------- the card
def draw_card(img, spec, y0=0, header_reveal=1.0, header_alpha=1.0, line_alphas=None, drawing=1.0):
    """Draw the post onto `img` with its top at `y0`. The defaults draw it finished; a reel animates the rest."""
    bg, ink = colors(spec)
    kind = spec.get('type', 'text')
    if kind not in TYPES:
        raise ValueError('type must be one of: %s' % ', '.join(TYPES))
    end = draw_header(img, spec, ink, y0, header_reveal, header_alpha)
    if kind == 'text':
        draw_body(img, spec, ink, max(round(SIDE * 0.545), end + round(SIDE * 0.05)), y0, line_alphas)
        return
    y = draw_body(img, spec, ink, max(round(SIDE * 0.50), end + round(SIDE * 0.032)), y0, line_alphas)
    if drawing > 0.003:
        layer = drawing_layer(spec, y)
        if drawing < 0.997:
            layer = layer.copy()
            layer.putalpha(layer.getchannel('A').point(lambda a: round(a * drawing)))
        img.alpha_composite(layer, (0, y0))


def render(spec):
    bg, _ = colors(spec)
    img = Image.new('RGBA', (SIDE, SIDE), bg + (255,))
    draw_card(img, spec)
    return img.convert('RGB')


def check(spec):
    """Warnings about things that render but read badly."""
    notes = []
    kind = spec.get('type', 'text')
    if kind in LABELS:
        lo, hi = LABELS[kind]
        n = len(spec.get('labels') or [])
        if not lo <= n <= hi:
            notes.append('%s reads best with %d to %d labels (got %d)' % (kind, lo, hi, n))
        if kind in ('bars', 'pie') and len(spec.get('values') or []) != n:
            notes.append('%s needs one value per label' % kind)
    lines = body_lines(spec)
    if kind != 'text' and len(lines) > 2:
        notes.append('the title takes %d lines; the drawing gets squeezed below it' % len(lines))
    if kind == 'text' and len(lines) > 6:
        notes.append('%d lines of text; the page reads best at 1 to 4 short lines' % len(lines))
    return notes


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    src = args[0]
    spec = json.load(sys.stdin if src == '-' else open(src, encoding='utf-8'))
    if '--lines' in args:
        for line in body_lines(spec):
            print('%-40s %d chars' % (line, len(line)))
        return
    for note in check(spec):
        print('warning: ' + note, file=sys.stderr)
    out = args[1] if len(args) > 1 else 'post.png'
    render(spec).save(out)
    print(out)


if __name__ == '__main__':
    main()
