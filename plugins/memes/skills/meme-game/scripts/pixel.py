#!/usr/bin/env python3
"""A 1-bit platform-game engine for meme reels, and its first level as an example.

    python3 pixel.py level.mp4                 # level 1-1 with the defaults below
    python3 pixel.py level.mp4 spec.json       # your page: brand, handle, logo, text, level

**The screen is 90x160 and scales to 1080x1920 by nearest neighbor.** Scale 12, exact: each game pixel becomes a
12px square, with no half-tone at the edges. Drawing straight at 1080 with "little squares" would give the same
picture and none of the guarantees — one wrong sum and a square comes out 11px on one side and 13 on the other.
At scale 8 the character was 9% of the frame's height and an ant on a phone; at 12 it is 13%.

**The font is the page's, rasterized tiny** and thresholded to black and white: real pixel lettering, in the
page's own typeface.

**Sprites are text.** `#` is ink, `o` is paper (erases what is behind), `.` is empty (lets it through).

What this does **not** do: collision, camera, game state. Each level is a hand-timed animation — a film that
looks like a game. Needs Pillow; the encoder, the timing and the closing post come from meme-reel's `stage.py`.
"""
import json, os, sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'meme-reel', 'scripts'))
from stage import (FPS, H, W, Film, clamp, colors, font, post, segment, smooth,  # noqa: E402
                   still_matches_card)

SCALE = 12
SW, SH = W // SCALE, H // SCALE                  # 90 x 160
INK, PAPER = 0, 255

# The band the Reels interface leaves alone, in game pixels: 220px on top and 420 at the bottom become 19 and 35.
# The floor and the HUD live inside it.
SAFE_TOP, SAFE_BOTTOM = 19, SH - 35              # 19 .. 125
FLOOR = 112                                      # the floor line, at 70% of the screen
HUD_Y = 24
BRICK_W, BRICK_H = 12, 7


class Screen:
    """A 1-bit screen: draw at 90x160, then scale up to the reel's frame."""

    def __init__(self, bg=PAPER, font_path=None):
        self.img = Image.new('L', (SW, SH), bg)
        self.d = ImageDraw.Draw(self.img)
        self.font_path = font_path

    def rect(self, x0, y0, x1, y1, color=INK):
        if x1 >= x0 and y1 >= y0:
            self.d.rectangle([round(x0), round(y0), round(x1), round(y1)], fill=color)

    def sprite(self, rows, x, y, mirrored=False, color=INK):
        """Stamp a sprite with its top-left corner at (x, y)."""
        x, y = round(x), round(y)
        for j, row in enumerate(rows):
            for i, c in enumerate(row):
                if c == '.':
                    continue
                px, py = x + (len(row) - 1 - i if mirrored else i), y + j
                if 0 <= px < SW and 0 <= py < SH:
                    self.img.putpixel((px, py), color if c == '#' else PAPER)

    def text(self, s, x, y, size=9, color=INK, right=False):
        """Write in the page's font, cut to black and white.

        The cut has to be low (96 of 255): at 9px most of the font comes out grey, and cutting at the middle turns
        the letters into crumbs.
        """
        fnt = font(size, self.font_path)
        box = self.d.textbbox((0, 0), s, font=fnt)
        w = box[2] - box[0]
        tile = Image.new('L', (w + 4, size * 2 + 4), 255)
        ImageDraw.Draw(tile).text((2 - box[0], 2 - box[1]), s, font=fnt, fill=0)
        mask = tile.point(lambda v: 255 if v < 96 else 0)
        self.img.paste(color, (round(x - (w if right else 0)) - 2, round(y) - 2), mask)

    def upscale(self):
        """The reel's frame: every pixel becomes a 12px square, never a blur."""
        return self.img.resize((W, H), Image.NEAREST).convert('RGBA')


def sprite(txt):
    """Read a sprite written as text, checking it is rectangular.

    A row shorter than the others shifts everything after it, and the mistake would only show in the video,
    crooked. Checking here costs nothing.
    """
    rows = txt.strip('\n').split('\n')
    widths = {len(r) for r in rows}
    if len(widths) != 1:
        raise ValueError('crooked sprite: rows of %s' % sorted(widths))
    return rows


# The character: a person, 16x23. The silhouette is solid — a thin stroke turns into a stick figure at this
# scale — and the detail comes from *removing* pixels: eyes, the line between arm and torso, the belt and the gap
# between the legs. None of the holes touches the edge: a silhouette with a hole in its border stops standing out.
WALK_A = sprite("""
....########....
...##########...
...##########...
...##o####o##...
...##########...
...##########...
...##########...
.....######.....
..############..
.##############.
.##############.
.###o######o###.
.###o######o###.
..##o######o##..
....########....
....##oooo##....
....########....
...###oooo###...
...###oooo###...
..###oooooo###..
..###oooooo###..
.####oooooo####.
.####oooooo####.
""")

WALK_B = sprite("""
....########....
...##########...
...##########...
...##o####o##...
...##########...
...##########...
...##########...
.....######.....
..############..
.##############.
..############..
..###o####o###..
..###o####o###..
...##o####o##...
....########....
....##oooo##....
....########....
....########....
....########....
....###oo###....
....###oo###....
...####oo####...
...####oo####...
""")

# Startled, at the moment of impact: arms up, mouth open, legs apart. The frame that freezes before the death jump.
STARTLED = sprite("""
.##..........##.
.###........###.
..###......###..
...###....###...
....########....
...##########...
...##o####o##...
...##########...
...###oooo###...
...###oooo###...
...##########...
.....######.....
...##########...
..############..
....########....
....##oooo##....
....########....
...###oooo###...
..###oooooo###..
.####oooooo####.
.###oooooooo###.
###oooooooooo###
###oooooooooo###
""")

# The enemy: a bill, 22x19, standing still. It has a face because game enemies have faces, and a barcode because
# without one it would be a box with eyes. For a new enemy, copy it, change the middle, and keep the frame, the
# barcode and the two feet.
BILL = sprite("""
######################
#oooooooooooooooooooo#
#o##o#o##o#o##o#o##oo#
#o##o#o##o#o##o#o##oo#
#oooooooooooooooooooo#
#oo#####oooooo#####oo#
#ooo#####oooo#####ooo#
#oooooooooooooooooooo#
#ooo####oooooo####ooo#
#ooo####oooooo####ooo#
#ooo####oooooo####ooo#
#oooooooooooooooooooo#
#oo##############oooo#
#oooooooooooooooooooo#
#oo##########oooooooo#
#oooooooooooooooooooo#
######################
....####......####....
....####......####....
""")

# A block in the sky: the money nobody reaches. The `$` is drawn pixel by pixel — the font at 9px does not fit in
# a 12px block, and the dollar sign came out as a blur.
BLOCK = sprite("""
##############
#o##########o#
##oooooooooo##
##oooo#ooooo##
##ooo###oooo##
##oo#o#ooooo##
##ooo###oooo##
##oooo#o#ooo##
##ooo###oooo##
##oooo#ooooo##
#o##########o#
##############
""")

# The HUD coin: a ring with a highlight, which is how a coin is drawn in 1 bit without becoming a dot.
COIN = sprite("""
..####..
.##oo##.
##o##o##
#o####o#
#o####o#
##o##o##
.##oo##.
..####..
""")


def hud(screen, coins=0, level='1-1', y=HUD_Y, margin=9):
    """Coins on the left, the level on the right. The zeroed counter is the running joke: it stays on screen."""
    screen.sprite(COIN, margin, y)
    screen.text('x%02d' % coins, margin + 12, y)
    if level:
        screen.text(level, SW - margin, y, right=True)


def floor(screen, y=FLOOR):
    """Hollow bricks — black joints, white middles — not a solid mass.

    The floor is 30% of the frame's height; solid black would make it the heaviest thing on a page that is white.
    Every other course is shifted half a brick, which is what makes it read as a wall and not a grid.
    """
    screen.rect(0, y, SW - 1, y + 1)
    for i, base in enumerate(range(y + 2, SH, BRICK_H + 1)):
        screen.rect(0, base + BRICK_H, SW - 1, base + BRICK_H)
        for x in range(0 if i % 2 == 0 else BRICK_W // 2, SW, BRICK_W):
            screen.rect(x, base, x, base + BRICK_H - 1)


# ------------------------------------------------------------------- level 1-1
SPEC = {
    'name': 'level-1-1',
    'level': '1-1',
    'type': 'text',
    'text': 'I started with zero coins.\nThe first enemy was a bill.',
    'caption': 'i thought it was the tutorial. what was your first bill?',
    'brand': 'Your Page',
    'handle': '@your.page',
    'duration': 8.5,
}

# The plumber-style death: freeze, jump, fall off the screen. Three numbers — the pause, the impulse and the
# gravity — and the pause is what makes it read as a game death and not a stumble.
DEATH_PAUSE = 0.34
DEATH_IMPULSE, GRAVITY = -120.0, 260.0

# when each thing happens, in seconds: all the marks together, so the rhythm can be tuned in one place
T_WALK = (0.35, 2.80)          # the character enters from the left
T_HIT = 2.80                   # touches the enemy
T_WASH = (5.60, 5.95)          # the screen washes to the background color
T_HEADER = (6.05, 6.85)        # the post's header prints
T_LINES = ((6.50, 7.25), (7.30, 8.00))

ENEMY_X = 52                   # the enemy stands here from the first frame to the last
MEET_X = ENEMY_X - 18          # where the character stops, touching it
BLOCKS = ((16, 58), (62, 46))  # the two blocks in the sky


def level_1_1(film, spec):
    """The character walks in, touches a bill, and loses. The bill does nothing — before, during or after."""
    bg, _ = colors(spec)
    for f in range(round(spec['duration'] * FPS)):
        t = f / FPS
        s = Screen(font_path=spec.get('font'))
        for bx, by in BLOCKS:
            s.sprite(BLOCK, bx, by)
        floor(s)
        hud(s, 0, spec.get('level', '1-1'))      # zero for the whole film: that is the point
        s.sprite(BILL, ENEMY_X, FLOOR - len(BILL))

        if t < T_HIT:
            walk = clamp((t - T_WALK[0]) / (T_WALK[1] - T_WALK[0]))
            pose = WALK_A if int(t / 0.15) % 2 == 0 else WALK_B
            s.sprite(pose, -18 + (MEET_X + 18) * walk, FLOOR - 23)
        else:
            y, dt = FLOOR - 23, t - T_HIT
            if dt >= DEATH_PAUSE:
                k = dt - DEATH_PAUSE
                y += DEATH_IMPULSE * k + 0.5 * GRAVITY * k * k
            if y < SH:                           # gone through the bottom edge
                s.sprite(STARTLED, MEET_X, y)

        img = s.upscale()
        # the screen washes out and the page's art comes in: the last second is the post, still
        wash = smooth(segment(f, *T_WASH))
        if wash > 0:
            img.alpha_composite(Image.new('RGBA', (W, H), bg + (round(255 * wash),)))
        post(img, spec,
             header_reveal=smooth(segment(f, *T_HEADER)),
             header_alpha=smooth(segment(f, T_HEADER[0] + 0.25, T_HEADER[1] + 0.2)),
             line_alphas=[smooth(segment(f, *T_LINES[0])), smooth(segment(f, *T_LINES[1]))])
        film.add(img)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    spec = dict(SPEC)
    if len(sys.argv) > 2:
        spec.update(json.load(open(sys.argv[2], encoding='utf-8')))
    with Film(sys.argv[1]) as film:
        level_1_1(film, spec)
    print('%s: %d frames, %.1fs, ends on the card: %s'
          % (sys.argv[1], film.frames, film.frames / FPS, still_matches_card(film, spec)))


if __name__ == '__main__':
    main()
