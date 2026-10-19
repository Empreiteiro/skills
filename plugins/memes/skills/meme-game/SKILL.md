---
name: meme-game
description: A series of meme reels told as a black-and-white platform game — the world, the character who never wins, the enemies that are the joke's villains, the zeroed coin counter — and how to write a new level with the 1-bit pixel engine. Use when the request mentions a game, a level, an episode, an enemy or a power-up for a meme page, or asks to tell one of the page's jokes as a game. For other reels, use the meme-reel skill.
---

# Meme game

A series of reels in the form of a platform game. Each episode is a level, and each level is one of the page's
jokes, staged. The framing, the encoder and the rule of ending on the post come from
[meme-reel](../meme-reel/SKILL.md); the line and the caption come from [meme-post](../meme-post/SKILL.md).

```
scripts/pixel.py            the 1-bit engine (screen, sprites, HUD, floor) and level 1-1 as the example
references/shadow-style.md  a second art style for the same series: silhouettes against fog
```

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/pixel.py level.mp4 spec.json
```

`spec.json` is the card spec (`text`, `brand`, `handle`, `logo`, `theme`, `font`) plus `level` (`'1-2'`), `name`,
`caption` and `duration`.

## Why 1 bit

A text-meme page is already ink on paper in a plain font. A 1-bit game is not an aesthetic borrowed from outside:
**it is the page's own palette, with the pixels showing.** If an episode needs gray, color or shading, it has left
the series.

| | |
|---|---|
| screen | **90 x 160**, exact scale of **12** up to 1080x1920 |
| colors | two: `INK` (black) and `PAPER` (white) |
| upscaling | nearest neighbor — a pixel is a square, never a blur |
| font | the page's font, tiny, thresholded to black and white |
| floor | y=112 (70% of the screen), hollow bricks down to the bottom |
| HUD | y=24: the coin counter on the left, the level on the right |
| sky | two `$` blocks floating that nobody reaches |
| safe band | y from 19 to 125 — the Reels interface covers the rest |

Scale 12 was measured: at 8 the character took 9% of the frame's height and became an ant on a phone. At 12 it
takes 13%, and the enemy takes a fifth of the width — the size of a first-level enemy.

## The world

**The character is the follower**: a person, solid silhouette, 16x23, no name and no face beyond two pixels for
eyes. They never win. It is not the episode's bad luck — it is the premise, the same one the page's jokes run on.

**The enemies are the villains of the page's condition, and they do not move.** On a money page they are
documents: the bill, the card statement, the rent. Each enemy needs the one detail that says what it is — for a
bill, the **barcode**; without it, it is a box. And each enemy is **in the way from the first frame**: the one who
walks is the character, always. That is not animation economy, it is the joke: the bill does not chase anyone. It
waits.

**The blocks in the sky** have `$` on them and nobody touches them: the same gag as the counter, in a drawing.

**The coin counter stays at `x00`.** It is the running joke of the series and stays on screen from the first
frame to the last. An episode where the counter goes up is about something else — and then it goes back down
before the end.

**The level number numbers the series**: `1-1`, `1-2`, `1-3`. It also fills the empty corner, and a 9:16 frame has
a lot of corner.

## The grammar of a level

Four beats, all of them, and then the post:

1. **The world.** Floor, HUD, and the enemy **already on screen** where the thing is going to happen. Half a
   second, and the viewer already knows how it ends.
2. **The walk.** The character enters from the left and walks up to it. About two seconds — the time it takes to
   see that they are not going to dodge.
3. **The encounter.** Touching is enough. (In the shadow style, finding and picking something up reads better
   than bumping into it — see the reference.)
4. **The defeat.** Plumber-style: the character **freezes** for about a third of a second, jumps, and falls off
   the screen. The pause is what makes it read as a game death and not a stumble. **The enemy does not move** —
   not at the moment, not after. For it, nothing happened. That is the joke.

Then **the post**: the screen washes to the background color and the page's art comes in — header, then the line,
one part at a time. The last second is the post, still.

What does **not** go in: blood, explosions, swearing, more than two characters on screen, color. The series is as
dry as the page.

## Sprites are text

`#` is ink, `o` is paper (erases what is behind it), `.` is empty (lets it through). Editing a character means
editing its rows in `pixel.py`. `sprite()` checks the drawing is rectangular — a short row shifts everything below
it, and the mistake would only show in the video, crooked.

```python
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
```

For a new enemy, copy `BILL`, change the middle, and keep the frame, the identifying detail and the two feet. One
frame only — it does not walk.

### The four drawing rules

Each one came from getting it wrong:

- **Detail is pixels taken away, not strokes added.** The silhouette is solid; the eyes, the belt and the gap
  between the legs are white holes **inside** it. A thin stroke turns into a stick figure at this scale.
- **No hole touches the edge.** A silhouette with a hole in its border stops standing out from the paper, and the
  figure falls apart.
- **An eye on a white document is a black blot**, not a drawing of an eye. An eye with an outline and a white
  center becomes glasses. A long eyebrow turns into an arrow and swallows the eye — two short bars slanting inward
  are enough to make the creature angry.
- **Text inside a small sprite is drawn, not written.** The font at 9px does not fit in a 12px block; the `$` in
  the sky block is drawn pixel by pixel.

And one about the scenery: **the floor is hollow brick, not solid mass.** It takes 30% of the frame's height; in
solid black it would become the heaviest thing on screen, on a page that is white.

## Writing a level

1. **The joke first**, through meme-post. The level stages the line; do not invent the line from the level.
2. **The enemy is the villain of the line.** If the joke is about the credit card, the enemy is the card statement,
   not a generic bill.
3. **Copy `level_1_1`** and change the timing. The marks are all together at the top, as `T_*` constants, so the
   rhythm can be adjusted without hunting for numbers inside the loop.
4. **Spec** with `level` (`'1-2'`), `name` (`'level-1-2'`), `text`, `caption` and `duration`, like any reel.

## Before calling it done

- [ ] The counter is at `x00` from the first frame of the game to the last.
- [ ] The enemy has its identifying detail, stands still from the first frame, and stays still after the death.
- [ ] The death has the pause before the jump.
- [ ] Floor and HUD within y 19..125.
- [ ] It ends on the page's art, still, for about a second (`ends on the card: True`).
- [ ] Two colors. No gray crept in through the edge of a sprite.

## What the engine does not do

No collision, camera or game state. The encounter happens because it is **written** to happen at that second. It is
a film that looks like a game, and the choice is deliberately cheap: as long as the scenes fit in ten seconds, a real
game engine would only add weight. If an episode ever needs the character to react to what the viewer does, that is
another conversation.
