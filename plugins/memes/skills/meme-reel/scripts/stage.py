#!/usr/bin/env python3
"""The stage for meme reels: the 9:16 frame, the timing curves, the post and the encoder.

A reel is 1080x1920 at 30 fps and **ends on the post's still art**. The square card is drawn by `card.py`
(meme-post skill), centered in the frame (`Y0 = 420`); the movement happens in the bands above and below it.
Since the frame's background is the card's background there is no seam, and the middle of the frame is exactly
what the Reels interface never covers.

Layout, fonts and themes come from `card.py`, imported: the video must not become another copy of the post's
numbers. Needs Pillow and an ffmpeg (on the PATH, or `pip install imageio-ffmpeg`).
"""
import hashlib, os, shutil, subprocess, sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'meme-post', 'scripts'))
from card import SIDE, body_lines, clamp, colors, draw_card, font, write  # noqa: E402,F401

W, H = 1080, 1920
FPS = 30
Y0 = (H - SIDE) // 2               # 420: where the square card starts
# The Reels interface covers the ends: the account name on top; caption, audio and buttons at the bottom.
# The centered card (420..1500) is born inside. These numbers matter for what a scene puts *outside* the card.
SAFE_TOP, SAFE_BOTTOM = 220, H - 420


def seed(name):
    """A stable integer from a scene's name, for seeding its randomness: same name, same video, forever."""
    return int(hashlib.sha1(name.encode('utf-8')).hexdigest()[:8], 16)


# ------------------------------------------------------------------- time
def segment(f, start, end):
    """Where frame `f` is inside a stretch of time given in seconds, from 0 to 1."""
    a, b = start * FPS, end * FPS
    return clamp((f - a) / (b - a)) if b > a else 1.0


def smooth(t):
    """Eases in and out: the default, for things that appear and disappear."""
    return t * t * (3 - 2 * t)


def ease_out(t):
    """Comes in fast and brakes: gives weight to something that arrives."""
    return 1 - (1 - t) ** 3


def spring(t, k=1.7):
    """Overshoots and comes back: a stamp, a token settling into place."""
    return 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2


# ------------------------------------------------------------------- drawing
def frame(spec):
    """A new frame, the size of a reel, in the post's background color."""
    bg, _ = colors(spec)
    return Image.new('RGBA', (W, H), bg + (255,))


def post(img, spec, header_reveal=1.0, header_alpha=1.0, line_alphas=None, drawing=1.0, dy=0):
    """The post, where it sits in the still art. With the defaults it is the finished card."""
    draw_card(img, spec, Y0 + dy, header_reveal, header_alpha, line_alphas, drawing)


class Rotator:
    """Keeps the rotations already made.

    Rotating a sprite is expensive and a scene asks for thousands. Rounding the angle to steps of 4 degrees is
    invisible at 30 fps, and takes a render from minutes to seconds.
    """

    def __init__(self, step=4):
        self.step, self.cache = step, {}

    def rotate(self, key, sprite, angle):
        a = round(angle / self.step) * self.step % 360
        if (key, a) not in self.cache:
            self.cache[key, a] = sprite.rotate(a, expand=True, resample=Image.BICUBIC)
        return self.cache[key, a]


# ------------------------------------------------------------------- encoder
def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found: install it, or `pip install imageio-ffmpeg`')


class Film:
    """Pipes frames straight into ffmpeg.

    The MP4 is what Instagram wants: H.264 in yuv420p, `faststart` so playback starts before the download ends,
    and a silent audio track — without any audio track some apps refuse the file on upload.
    """

    def __init__(self, path, fps=FPS, crf=18):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.path, self.frames, self.last = path, 0, None
        self.proc = subprocess.Popen([
            ffmpeg(), '-y', '-loglevel', 'error',
            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(fps), '-i', '-',
            '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
            '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path,
        ], stdin=subprocess.PIPE)

    def add(self, img):
        self.last = img
        self.proc.stdin.write(img.convert('RGB').tobytes())
        self.frames += 1

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise RuntimeError('ffmpeg failed on %s' % self.path)
        return self.path

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        if exc[0] is None:
            self.close()
        else:
            self.proc.kill()


def still_matches_card(film, spec):
    """True when the last frame, cropped to the card, is pixel-identical to the post rendered by card.py."""
    from card import render
    last = film.last.convert('RGB').crop((0, Y0, SIDE, Y0 + SIDE))
    return list(last.getdata()) == list(render(spec).getdata())
