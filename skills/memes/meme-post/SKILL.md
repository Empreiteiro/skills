---
name: meme-post
description: Writes posts for a humor/meme page — the short line that goes on the image, the caption under it and the hashtag block — in the page's own voice and language, and renders the square art as a PNG. Use when asked to write, create or brainstorm a meme, post, one-liner or caption for a page; to adapt a theme (a holiday, a news story, a shared pain) to a page's format; to learn a page's voice from its post archive; or to turn a line into a post image.
---

# Meme post

Writes text posts for a humor page: a short line on a plain image (the **art**) and a **caption** under it.
Works for any page in any language; what makes a page sound like itself lives in its profile, `PAGE.md`.

These pages run on one tension: **a line that sounds like one thing until halfway through, when the second half
delivers the reality the audience lives in** — the bill, the boss, the kids, the diet. The guidance below comes
from analyzing a 664-post archive of a money-humor page (1.29 million likes). Use its numbers as defaults and
replace them with your page's own as soon as you have them.

## Start from the page profile

Read `PAGE.md` at the project root (or wherever the user keeps it): name and handle, language, the shared
condition the page jokes about, the voice, the formats that work there, hashtag blocks, the look, and what the page
never jokes about. Write every post in the page's language.

If there is no profile, build one before writing, from `references/page-template.md`:

1. Ask for the page's name and handle, its language, and the shared condition it jokes about.
2. If there is an archive export (CSV or JSON: Meta Business Suite, the Instagram API, a scraper), analyze it:
   ```bash
   python3 ${CLAUDE_SKILL_DIR}/scripts/analyze_posts.py posts.csv --out voice/
   ```
   It writes `examples.md` (top posts by likes, art + caption), `top-comments.md` (the comment champions) and
   `stats.md` (caption length, lowercase share, the question effect per year, the hashtag blocks the page
   repeats). Columns are matched by name; pass `--caption`, `--likes`, `--text` and so on when they differ.
   Read the examples for voice, and fill the profile from the stats.
3. With no archive, ask for 5–10 posts the user considers the page's best and infer the voice from them.

Save `PAGE.md` so the next post starts from it.

## A post has two layers

The art and the caption never say the same thing.

| | ART (on the image) | CAPTION (under the post) |
|---|---|---|
| Role | the joke | the second beat of the joke |
| Voice | universal: third person, or "we" | first person, talking to the follower |
| Case | a normal sentence | often **lowercase** (43% of posts in the analyzed archive) |
| Length | 1 to 4 short lines, ~65 characters | ~24 characters (median), rarely over 60 |
| Tone | dry, assertive, no emoji | loose, intimate, emoji when it fits |

The classic mistake is a caption that repeats the art. It never repeats: **it comments, confesses or asks.**

```
ART:     The sun is for everyone.
         Beach holidays are for people with money.
CAPTION: some days i don't even get the sun 😂
```

```
ART:     Everyone has that one debt that was worth it.
CAPTION: what was yours?
```

The first was the archive's strongest post by far; the second drew 142 comments — the question is the engine.

## The formats that work

Pick one and say which. Ordered by how often they appeared in the analyzed archive; the examples are money humor,
and every format carries over to any other condition.

1. **Inverted proverb.** Take a motivational line and turn it against the audience in the second half.
   > "You should be proud of the bills you created yourself."
2. **Mathematical self-deception.** The audience's bad logic, taken seriously.
   > "Paying upfront is expensive, but in 12 installments it's almost free."
3. **Short pun.** Two mirrored sentences; one turns into the other.
   > "I don't go without. I swipe the card."
4. **Absurd confession.** Says out loud what nobody admits.
   > "Spent because I was sad. Now I'm sad because I have no money."
5. **Solemn reframe.** Defines an everyday misery as if it were a virtue.
   > "Taking on bills you can't pay is the ultimate act of faith."
6. **Named concept.** Names a phenomenon with a borrowed term.
   > "Schrödinger's bill: you confirm the payment, the page goes down, and you don't know if it's paid."
7. **Anticlimax.** Builds a reflection and knocks it down in the last line.
   > "Sometimes I wonder if I'm living or just paying bills. Then I remember I'm not even paying the bills."
8. **Rhetorical question.** The doubt is already the joke.
   > "Is there a way to pay the card with another card?"

## The center of gravity

A page has one condition, and most posts should sit on it. In the analyzed archive 57% of the posts were about the
core subject (bills); the rest were its close neighbors — cards and installments, salary and the boss, debt
collectors, the dream of getting rich, relationships, holidays. Do not stray from the center without a reason.

A holiday is the best door into a new theme: take the holiday's cliché and cross it with the condition
("I wanted a truce, but my bills don't respect holidays"). Christmas, Carnival and Black Friday did well.

## If the goal is comments, ask

The clearest finding in the archive: captions **with a question had a median of 13 comments; without one, 2.** It
held inside each year, so it was not an effect of the period, and likes went up too (median 1,906 against 718).
`stats.md` has the same table for your page.

The question is direct, short and personal: "what was yours?", "anyone else have this problem?", "is your boss a
pain, or are you the boss? 😂".

## Process

1. **Profile.** Read `PAGE.md`, or build it (above).
2. **Theme.** If the user gave one, use it. If they asked for ideas, offer 3 to 5 angles before writing.
3. **Format.** Pick one of the eight. Say which.
4. **Art.** Write the line. Cut everything that is not essential — the best archives are brutally lean. Break it
   into 1–4 short lines, the way it will sit on the image.
5. **Caption.** The second beat: short, usually lowercase. If the goal is comments, end with a question.
6. **Hashtags.** Instagram allows **5 per post** — never more. Paste one of the page's fixed blocks from `PAGE.md`,
   chosen by theme; do not assemble tags case by case. A page that has none yet gets 2 or 3 blocks of five.
7. **Deliver** in the format below, with 2 or 3 variations of the same idea.
8. **Render**, if the user wants the image (below).

```
ART
First line of the joke.
Second line that turns the tables.

CAPTION
the second beat, with a question if it fits 😂

#five #tags #from #one #block
```

## Rendering the art

`scripts/card.py` draws the square post: 1080×1080 PNG, the page's header (logo, name, handle) and the line below
it, in the page's font. The chart posts (meme-chart) and the reels (meme-reel, meme-game) draw through the same
code, so a post looks the same wherever it appears.

```bash
echo '{"text": "The sun is for everyone.\nBeach holidays are for people with money.",
       "brand": "Page Name", "handle": "@page.name", "theme": "light"}' \
  | python3 ${CLAUDE_SKILL_DIR}/scripts/card.py - post.png
```

| Field | Values |
|---|---|
| `text` | the line; `\n` breaks it, and the break is respected |
| `theme` | `light` (white background, black ink; default) or `dark` |
| `brand`, `handle` | the header; both optional |
| `logo` | optional PNG, drawn at the header's height left of the name; use one that shows on the theme's background |
| `font` | a `.ttf`/`.otf`; default `$MEME_FONT`, then Roboto Mono if installed, then the system's bold monospace |
| `type` | `text` here; the drawings are in meme-chart |

The text has a **fixed size** — 35px at 1080, the same in every post: that is how the page is recognized. In a
monospace font about **34 characters fit per line**; longer lines wrap, they never shrink. So **write the line
breaks where you want them**, and check with `--lines`, which prints the breaks the image will use. Then open the
PNG and look at it. Needs `pip install pillow`.

## Finishing touches

- **Numbering.** If the page numbers its posts, take the next number from `PAGE.md` and update it there; never
  invent one out of sequence.
- **The header is in the template.** The page's name and handle are already on the art — do not write them again in
  the line.
- **Invisible padding.** Many pages end the caption with repeated blank Braille characters (`⠀`, U+2800) to push
  the hashtags below "more" (45% of the analyzed archive). Reproduce it if the user is going to post directly.
- **No full stop** in a short caption.

## What not to do

- Do not let the caption repeat the art in other words.
- Do not write genuinely motivational lines. Any line that ends in hope without irony is off tone.
- No cruel humor aimed at a specific person, and no jokes about people in a genuinely serious situation (eviction,
  hunger, illness, grief). The target is the shared **condition**, and the narrator is always inside it, never
  looking down on it.
- Do not pad the caption. The median is about two dozen characters; long text is the rare exception.
- Do not copy lines from the examples: they are for voice and structure.
