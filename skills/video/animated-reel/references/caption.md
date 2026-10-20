# Post caption

Next to each MP4, a `.md` with the same name (`<date>-reel-NN-<slug>.md`), copied from `templates/caption-template.md`.
It holds the ready-to-paste caption, two alternative hooks, the first comment with the link, the alt text, the CTA,
the suggested cover, the score and the checklist. Write it with the FINAL text of the lines, in the project's voice.

It is done only when `node "${CLAUDE_SKILL_DIR}/tools/validate-caption.mjs" <file.md>` exits with no blocker.

## The technique

1. **Hook** (1st line): 14 to 18 words, up to 125 characters (the "…more" fold). A number, a name or a contrast in the
   first 7 words, with tension already. It has the keyword. It works without the video. It does not open with "I",
   "my", "me", "discover", "learn", "here's" or "N tips"; it repeats neither the first spoken line nor the cover; a
   question only if specific, with a number or a name.
2. **Body:** 1 to 3 sentences that complete the video without giving away the ending, linked by because, so, but,
   then. Only what the product does; a number only if it is in the video or in the product's own copy.
3. **CTA, one, on the last line:** e.g. `Tap the link in the first comment to <action>.` No other action verb in the
   body (it counts as a 2nd CTA). Never "link in bio" in a video post.
4. **Hashtags:** 3 to 5 from the niche, no generic ones (#reels, #viral, #fyp, #explore…). One about the reel's topic,
   the rest about the character's niche.

Blockers: a URL or domain in the caption, more than 2,200 characters, empty hook, invalid hashtag, a CTA that does not
open with a verb (comment, save, send, tap, click, open, reply, book, download, try, call, join), "link in bio", any
term the project forbids (`--forbid "a,b"` or a `- **Forbidden terms**: a, b` line in the `.md`). Warnings: dashes,
emoji, more than one "!", AI lexicon (delve, unlock, elevate, seamless, game-changer…), "it's not X, it's Y".

## The first comment (the link)

```text
<the exact offer line from the product's site, if any>

https://<your-site>/<landing>?utm_source=instagram_organic&utm_medium=social&utm_campaign=<series>&utm_content=reel-NN
```

`utm_content` says which reel converted: that is why reel numbers never repeat. Post and pin the comment right after
the reel.

⚠️ **Check how your analytics maps `utm_source` before choosing it.** Many setups treat `instagram`, `ig`, `facebook`
or `fb` as aliases of the PAID Meta channel: organic signups would be counted as ads and would quietly lower the ads'
cost per signup. A value like `instagram_organic` that matches no alias lands in its own bucket.

## Alt text

The video described for someone who cannot see it: the style, the character without a name, each scene in order, every
on-screen text in quotes, and the close (the lockup, the signature, the button, "Link in the first comment"). It is
where the whole scene fits into words; the caption does not.

## The score (100 points, in the `.md`)

The template's table: hook (G1–G5, 30), body (R1–R5, 30), reach (A1–A4, 20), CTA (C1–C4, 20). Explain each lost point
in one line.
