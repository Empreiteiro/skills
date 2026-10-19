# Script

## The structure that works (29–36 s)

| beat | time | what happens | skin |
|---|---|---|---|
| A · hook | 0–3 s | the big character + the headline with ONE marked word and a passage circled in pen; readable in 0.5 s | `SKIN` |
| B1 · the day | ~2.5 s | a magazine panel (`panel`) with their craft, proofreader's marks live | `SKIN` |
| B2 · the problem arrives | ~4 s | the hour and the place ("11 p.m.", the kitchen), a proofreader's reaction around the head | `SKIN` |
| C · the usual way | ~5 s | ink panel, the generic tool or habit failing (e.g. chat bubbles); the pen circles INSIDE the bubble what it got wrong | `SKIN_INK` |
| C2 · hold | ~1 s | the character's face, no line; the slate marker block covers the frame | `SKIN` |
| D · the product | ~6 s | the product page; the gesture of the concept (a comment pinned to a passage, a suggestion, a key press…) | `SKIN` or `SKIN_AI` |
| E · the proof | ~6 s | the action, the sweep only over the passage, strike and insertion, "✓ Unchanged" (or the new rule, the version that comes back) | `SKIN` or `SKIN_AI` |
| end | ~6 s | editorial end card: signature line + CTA in the brand voice | `editorial` |

- 9 to 10 character lines + 2 brand lines. One line = one beat or half of one; a shot starts ~0.1 s before the first
  word of its line. Cut on frame-aligned times (`q()`).
- **Hook → Obstacle → Loop → Deliver:** a reason to stop (specific and personal) → the usual way breaking something
  concrete → the character's face, no answer yet → the product doing what it does, with the proof on screen.
- The problem → product turn is the marker block. The product always appears as proof, never as a promise.
- One concept per reel. Pick it from the product's real features and the character's real pain (`cast.json`
  `profile.pains`), and do not tell the same story twice in a series.

## The lines (rules that already cost rework)

- First person of the character, present tense, short sentences; ≤ ~60 characters per line (two caption lines).
- `text` = what appears; `speech` = what is said, when different ("character for character" said, hyphenated on screen).
- "did not", never "didn't" (Whisper heard "did mark" for "didn't mark": the meaning flipped). A sentence never ends
  on a short loose word ("…and hope" was heard as "…and help").
- A number said = the number on screen. Numbers of the character's routine (11 p.m., 6 a.m.) are setting, not results.
- The hook never repeats the formula of another reel in the series.
- Every line, on-screen text and cover title passes the project's copy rules (voice, banned words, no AI tells).

## Claims (keep the story honest)

1. Fictional character: an animated story, never a testimonial; no name; no result metric ("saved hours", "2x").
2. Price and offers: only the exact wording the product's own site uses today. Never "free for now", "lock in",
   "early access" unless that is literally true.
3. Show only what the product does today, with the labels it really uses (check the live product before writing).
   If the product's button says "Fix all", the reel does not show "Rewrite".
4. Absolutes are a contract: if the product promises "identical", never say "nearly" or "almost"; if it does not,
   never say "identical".
5. No comparison naming another product unless the user asks for it.

## Signature lines

One per reel, never repeated inside a series, written in the brand's voice (two short sentences work best on the end
card: `'Small fixes.<br><i>Nothing else moves.</i>'`). Keep the used ones in the series log.
