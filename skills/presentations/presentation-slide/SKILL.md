---
name: presentation-slide
description: Add, edit, reorder, hide or remove slides in an HTML presentation of this repository, including speaker notes, the presenter explanation, click-by-click fragments and controller steps. Use for any change to slide content or animation.
---

# Work on slides

## Anatomy of a slide

```html
<section class="slide" data-ctrl="name" data-steps="2">   <!-- data-ctrl / data-steps / data-hidden are optional -->
  <div class="kicker"><b>02</b> · Section</div>
  <h2>The title states the point</h2>
  <div class="body">…</div>
  <aside class="notes">…</aside>     <!-- what to say, click by click (presenter window) -->
  <aside class="explain">…</aside>   <!-- the concept explained for whoever presents (never shown) -->
</section>
```

Older decks in this repo use Portuguese names for the same things: `data-oculto` (hidden),
`aside.explica` (explanation), `?todos` (show hidden). Keep each deck's own convention.

## Clicks

- **Fragments**: `class="fragment"` appears on the next click, in document order. `data-f="n"` pins it to
  click n (several elements can share a click); `data-until="n"` hides it after click n (for replacing text).
- **Controller steps**: `data-steps="N"` adds N clicks handled in JavaScript by `CTRL.<name>.step(s, step)`.
  The engine also writes `data-step` on the section, so pure-CSS changes can use `[data-step="1"] .x {…}`.
  Controllers: `init(s)` once (lazily), `enter(s)`, `leave(s)`, `step(s, step, dir)`.
- The PDF shows every slide in its final step; make sure the final state reads well on its own.

## Notes and explanation

- **Notes**: short paragraphs in the order they are said; mark clicks (`Click 1: …`). Timing hints are welcome (`⏱ 2 minutes`).
- **Explanation**: labelled paragraphs — `The idea.` (the concept in plain words), `On screen.` (what appears
  and on which click), `Links to.` (earlier/later slides). Optional: `If asked.`, `Detail.`.
- When slides move, are inserted or hidden, update every "slide N" reference in notes and explanations
  (the structure check lists references that point to hidden or missing slides).

## Rules that keep reviews short

- Apply exactly what was requested. Do not add notes, captions, badges, labels or extra elements that were
  not asked for; suggest them in the reply instead.
- If the request is a question, answer it (and in the explanation, if useful) without changing the slide.
- Keep the deck's visual language (spacing, fonts, color tokens, vector drawings). A visual reference from the
  user gives the structure (what appears, where, how it connects), not a new drawing style.
- If a deck is maintained with a generator or an external review tool (see its README), edit the source the
  generator reads, not only the generated HTML.

## After every change

1. Run the `presentation-check-structure` skill.
2. Render the changed slides at 1920×1080 (`presentation-export --slide N --png …` or `--images`) and look at them.
3. If many slides could be affected (shared CSS, shared data, layout code), compare before/after renders with the
   `presentation-check-visual` skill and expect changes only where you meant them.
