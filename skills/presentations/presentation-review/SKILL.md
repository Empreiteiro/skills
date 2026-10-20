---
name: presentation-review
description: Full pre-presentation review of an HTML deck — runs the structure, visual and fact checks and returns one prioritized report with concrete fixes. Use when the user asks to review, audit or "check everything" in a presentation, or before a talk.
---

# Presentation review

Run the three checks in this order and merge the results into one report. Do not change the deck while
reviewing; fixes come after the user picks them (unless they asked to fix as you go).

1. **Structure** — `presentation-check-structure` with `--console`.
2. **Visual** — `presentation-check-visual`: render every slide (`--all`) and look at each image.
3. **Facts** — `presentation-check-facts`: claims and datasets against primary sources. Skip or narrow this
   step only if the user says the content was already verified.
4. **Flow** (read the notes end to end): does each slide make one point, do the sections follow the outline in the
   deck README, do notes match what is on screen click by click, is the timing realistic for the slot
   (the presenter timer is `TALK_MINUTES`)?

## Report

```
## Must fix (wrong information, broken slides, unreadable content)
- Slide N — problem — fix
## Should fix (inconsistencies, stale references, weak slides)
## Nice to have
## Checked and fine
```

Keep each item to one line with the slide number. End with the next step you propose (for example: "fix the 3
must-fix items now?").
