# Caption: <short title of the reel>

- **Video**: `YYYY-MM-DD-reel-NN-<slug>.mp4` (<duration> s)
- **Format**: animated story with a fictional character, not a testimonial (character voice, brand voice on the close, music, animation and text)
- **Style**: editorial (`editorial`): a magazine page in paper, ink and slate blue; green only when the AI suggests, red only on the diff's strike, the accent only on the end card
- **Series**: <series name or "no">
- **Character**: <role from cast.json> (fictional, no name)
- **Focus**: <the one concept this reel proves>
- **Keyword**: <the word the first line and the cover share>
- **First line**: “<l1 of the .vo.js>”
- **Cover text**: “<the COVER title, without tags>”
- **Cover**: `YYYY-MM-DD-reel-NN-<slug>-cover.png` (1080x1920)
- **Voices**: the character in edge-tts `<voice>` at <rate>; the brand (signature and CTA) in `<voice>` at <rate>; every line checked with Whisper (`base.en`), N of N.
- **Forbidden terms**: <comma-separated terms the project never uses, or delete this line>

## Caption

```text
<Hook: 14 to 18 words, up to 125 characters, keyword, number/name/contrast in the first 7, no I/my/me at the start, repeats neither the first line nor the cover.>

<Body: 1 to 3 sentences that complete the video without giving away the ending; link with because, so, but, then. What the product does, never an invented result.>

Tap the link in the first comment to <action>.

#<tag> #<tag> #<tag> #<tag>
```

## Alternative hooks

1. <another hook, same rules>
2. <another hook, same rules>

## First comment

```text
<the exact offer line from the product's site, or delete this line>

https://<your-site>/<landing>?utm_source=instagram_organic&utm_medium=social&utm_campaign=<series>&utm_content=reel-NN
```

## Alt text

```text
<The video described for someone who cannot see it: style, character (no name), each scene in order, every on-screen text in quotes, and the close: the lockup, the signature, the button and "Link in the first comment".>
```

## CTA and link

- **CTA**: link, "Tap the link in the first comment to <action>."
- **Link (first comment)**: https://<your-site>/<landing>?utm_source=instagram_organic&utm_medium=social&utm_campaign=<series>&utm_content=reel-NN
- **Funnel stage**: <e.g. bottom (leads to signup)>. Post and pin the comment right after the reel.

## Suggested cover

<Light (editorial paper): label, title with the marked word and the circled passage, the character and the pen arrow, the lockup at the bottom. Confirm everything fits the 3:4 grid crop (y 240–1680) and that the title shares a term with the hook without repeating it.>

## Score

| id | Criterion | Max | Score |
|---|---|---|---|
| G1 | First line has 14 to 18 words | 6 | |
| G2 | Number, name or contrast in the first 7 words, with tension | 8 | |
| G3 | Does not open with discover, learn, here’s or "N tips" | 6 | |
| G4 | Does not open with I, my or me; no emoji in the hook | 4 | |
| G5 | Fits in 125 characters and does not repeat the first line | 6 | |
| R1 | Body of 1 to 3 sentences that adds what the video did not say | 10 | |
| R2 | No three short sentences in a row | 4 | |
| R3 | No "swipe", "there’s more", "come with me" | 4 | |
| R4 | Every number matches the video | 8 | |
| R5 | Natural connectives, ends on the last concrete fact | 4 | |
| A1 | Keyword in the first line | 8 | |
| A2 | First line and cover share a term | 4 | |
| A3 | "You" at least as often as "I" | 4 | |
| A4 | No forbidden word | 4 | |
| C1 | One CTA only, on the last line | 6 | |
| C2 | CTA opens with an imperative verb | 6 | |
| C3 | CTA names what you get or reuses a term from the video | 4 | |
| C4 | No thanks and no generic ask | 4 | |
| | **Total** | 100 | |

## Checklist

- [ ] The first line has the keyword, fits 125 characters and does not repeat the video's first line.
- [ ] The body has 1 to 3 sentences, completes the video and does not give away the ending.
- [ ] One CTA, imperative, on the last line, with "link in the first comment".
- [ ] 3 to 5 niche hashtags at the end, no generic ones.
- [ ] Every number is in the video or in the product's own copy (the character's routine numbers are not results).
- [ ] No dashes, no exclamation marks, no emoji, no URL in the caption.
- [ ] Price and offers only in the product's exact current wording.
- [ ] First comment with the link and its own UTM (`utm_content=reel-NN`).
- [ ] Alt text describes the video.
- [ ] The cover sits next to the MP4 and was checked in the grid crop.
- [ ] `node validate-caption.mjs <this .md>` with no blocker.
- [ ] Fictional character: the caption never presents them as a real user or a testimonial, and never names them.
