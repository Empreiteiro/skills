#!/usr/bin/env python3
"""An example scene: it rains paper bills, and the reel ends on the post.

    python3 example_reel.py rain.mp4                  # with the defaults below
    python3 example_reel.py rain.mp4 spec.json        # your page: brand, handle, logo, theme, text

The spec is card.py's (meme-post skill) plus `name` (seeds the randomness), `caption` and `duration`. Copy this
file to start a new scene: the frame loop, the timing marks at the top and the closing on the card stay the same.
"""
import json, math, os, random, sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stage import (FPS, H, W, Film, Rotator, colors, ease_out, frame, post, seed, segment,  # noqa: E402
                   smooth, still_matches_card)

SPEC = {
    'name': 'rain',
    'type': 'text',
    'text': 'They said it would rain money.\nIt rained bills.',
    'caption': 'and i left without an umbrella. how much rained on you today?',
    'brand': 'Your Page',
    'handle': '@your.page',
    'theme': 'light',
    'duration': 8.0,
}

# when each thing happens, in seconds
T_HEADER = (0.15, 0.95)        # the header prints
T_NAME = (0.55, 1.15)          # the page name appears
T_LINES = ((1.0, 1.8), (5.5, 6.2))   # the setup, then the punchline
T_RAIN = (0.6, 3.4)            # sheets start falling in this window
FALL = (750, 1150)             # px per second: every sheet is gone before the last second
SHEETS = 36


def bill(width, rnd, ink, bg):
    """A small bill: border, two scribbled fields, a value box and a barcode. Drawn at 3x and reduced."""
    s = 3
    w, h = width * s, round(width / 1.55) * s
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], fill=bg, outline=ink, width=2 * s)
    m, grey = round(w * 0.07), ink + (95,)
    d.rectangle([m, round(h * 0.17), round(w * 0.52), round(h * 0.25)], fill=grey)
    d.rectangle([m, round(h * 0.32), round(w * 0.40), round(h * 0.39)], fill=grey)
    d.rectangle([round(w * 0.62), round(h * 0.17), w - m, round(h * 0.39)], fill=ink + (170,))
    x = m
    while x < w - m:
        bw = rnd.randint(2, 5) * s
        if x + bw > w - m:
            break
        d.rectangle([x, round(h * 0.60), x + bw - 1, round(h * 0.88)], fill=ink)
        x += bw + rnd.randint(1, 3) * s
    return img.resize((width, h // s), Image.LANCZOS)


def scene(film, spec):
    bg, ink = colors(spec)
    rnd = random.Random(seed(spec['name']))        # seeded: two renders give the same bytes
    sprites = [bill(rnd.randint(110, 170), rnd, ink, bg) for _ in range(6)]
    drops = [dict(sprite=rnd.randrange(len(sprites)), x=rnd.uniform(0, W),
                  t0=rnd.uniform(*T_RAIN), speed=rnd.uniform(*FALL), sway=rnd.uniform(10, 45),
                  phase=rnd.uniform(0, 6.3), spin=rnd.uniform(-120, 120), angle=rnd.uniform(0, 360))
             for _ in range(SHEETS)]
    rot = Rotator()
    for f in range(round(spec['duration'] * FPS)):
        t = f / FPS
        img = frame(spec)
        for i, p in enumerate(drops):                # the rain goes behind the post
            dt = t - p['t0']
            if dt < 0:
                continue
            y = -200 + p['speed'] * dt
            if y > H:
                continue
            sp = rot.rotate(p['sprite'], sprites[p['sprite']], p['angle'] + p['spin'] * dt)
            x = p['x'] + p['sway'] * math.sin(p['phase'] + dt * 2.2)
            img.alpha_composite(sp, (round(x - sp.width / 2), round(y)))
        post(img, spec,
             header_reveal=ease_out(segment(f, *T_HEADER)),
             header_alpha=smooth(segment(f, *T_NAME)),
             line_alphas=[smooth(segment(f, *T_LINES[0])), smooth(segment(f, *T_LINES[1]))])
        film.add(img)


def last_motion(spec):
    """When the last moving thing stops: the latest sheet to leave the frame, or the punchline's fade."""
    return max(T_LINES[-1][1], T_RAIN[1] + (H + 200) / FALL[0])


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    spec = dict(SPEC)
    if len(sys.argv) > 2:
        spec.update(json.load(open(sys.argv[2], encoding='utf-8')))
    still = spec['duration'] - last_motion(spec)
    if still < 1.0:
        print('warning: only %.2fs of still art at the end; make `duration` longer' % still, file=sys.stderr)
    with Film(sys.argv[1]) as film:
        scene(film, spec)
    print('%s: %d frames, %.1fs, ends on the card: %s'
          % (sys.argv[1], film.frames, film.frames / FPS, still_matches_card(film, spec)))


if __name__ == '__main__':
    main()
