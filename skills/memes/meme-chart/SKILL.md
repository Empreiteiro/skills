---
name: meme-chart
description: Creates meme posts whose art is a drawing — a zigzag line, a staircase, bars or a pie — instead of text alone, and renders them as PNG. Use when the joke depends on showing a curve, a proportion, a scale or a progression; when the request mentions a graph, chart, diagram, staircase, pie or bars for a meme or humor post; or when an existing line would work better visualized. For text-only posts, use the meme-post skill.
---

# Chart meme

A humor page's art is usually **text only** — that is the [meme-post](../meme-post/SKILL.md) skill, which also
holds the page profile (`PAGE.md`) and the voice. This one covers the minority where **the drawing is the joke**:
a curve that keeps climbing, a staircase that never ends, a pie with no slice left for you.

In the 664-post archive these skills were distilled from there were only about 20 of them. They are the exception,
and should stay one.

## The rule that separates the two kinds

**Make a chart only when the drawing says something the line alone would not.**

| Becomes a chart | Works better as text |
|---|---|
| an absurd proportion (95% bills, 5% you) | a pun |
| a progression that never ends (a staircase of debts) | a confession |
| a curve that contradicts its label | an inverted proverb |
| a comparison between quantities | a rhetorical question |

If you can tell the whole joke in two lines, it is **not** a chart joke. A drawing that merely illustrates the line
weakens both.

## The look

Two colors, no exceptions: ink on paper.

- **light**: white background, black ink — the default
- **dark**: black background, white ink — suits a heavier or more fatalistic joke

What does **not** go into the drawing: axes, grid, legend, written percentages, axis titles, arrows, color. The
chart is a thick stroke plus labels in the same font as the rest of the page. It is a meme drawing, not a report —
if it looks like a quarterly presentation, it is wrong.

## The four drawings

**`line`** — a zigzag. Each label marks a **valley**, and the line ends going up. It is the way to say "every time
it gets better, another one comes".
> *"My motivation to work:"* with `Bill` at every rock bottom.

**`staircase`** — steps climbing, one label per step, the first label on the bottom step. A progression that only
gets worse, or the "what people don't see" underneath what they do see.
> *"What people don't see."* — Bills, Card, Bill, Taxes, Bills.

**`bars`** — a direct comparison. The fun is usually the last bar, absurdly smaller than the rest.
> *"Where my salary goes:"* — Rent, Food, Bills, and **Me** with a sliver.

**`pie`** — a proportion. Works with two slices, one of them almost invisible. Slices alternate filled and empty.
> *"My monthly budget:"* — Bills 95, Dreams 5.

## How to render

The drawings are made by meme-post's `card.py`, so the header, margins and font match the page's text posts.

```bash
echo '{"type": "line", "text": "My motivation to work:",
       "labels": ["Bill", "Bill", "Bill", "Bill"],
       "brand": "Page Name", "handle": "@page.name"}' \
  | python3 ${CLAUDE_SKILL_DIR}/../meme-post/scripts/card.py - chart.png
```

| Field | Values |
|---|---|
| `type` | `line`, `staircase`, `bars`, `pie` (`text` is the plain post) |
| `text` | the title at the top; `\n` breaks the line and the break is respected |
| `labels` | the drawing's labels |
| `values` | `bars` and `pie` only, one per label |
| `theme` | `light` (default) or `dark` |
| `brand`, `handle`, `logo`, `font` | the page's header and font, from `PAGE.md` (see meme-post) |

The title has the page's **fixed text size** — 35px at 1080 — and wraps at about 34 characters per line in a
monospace font. Keep it to one or two lines: every extra line comes out of the drawing's height. The script warns
when the label count is outside the ranges below or the values do not match the labels.

## How many labels

- `line`: 3 to 5 valleys. With 2 there is no rhythm; with 6 it gets cramped.
- `staircase`: 4 to 6 steps.
- `bars`: 3 to 5 bars, with the joke in the last one.
- `pie`: 2 slices, 3 at most.

A label is one short word — `Bill`, `Rent`, `Me`. A sentence does not fit in a label and is not funny there.

## The caption

Everything in [meme-post](../meme-post/SKILL.md) applies: the second beat, short, never repeating the art.

In a chart post it has an extra job — **do not describe the drawing.** Whoever is looking has already seen it.
The caption comments or asks.

```
ART:     My motivation to work:  [line, valleys labeled "Bill"]
CAPTION: anyone else? 😂                                   ✅
CAPTION: my motivation only goes up because of the bills   ❌ describes the drawing
```

## Process

1. Confirm the joke is a chart joke, with the table at the top. If it is not, use `meme-post`.
2. Pick the drawing and the theme.
3. Write the title — it sets up the expectation the drawing is going to break.
4. Pick the labels (and values).
5. Render the PNG and **look at it**. Squeezed labels or a stroke near the edge happen; change the number of
   labels instead of shortening the joke.
6. Write the caption and pick the hashtag block, as in meme-post.
