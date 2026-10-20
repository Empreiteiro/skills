---
name: presentation-check-visual
description: Visually check an HTML presentation by rendering every slide at 1920x1080 and inspecting the images for overflow, overlap, unreadable text and inconsistencies, and catch unintended changes by comparing before/after renders. Use before presenting, after layout or style changes, or when asked to review how slides look.
---

# Visual check

## 1. Render

```bash
python "${CLAUDE_SKILL_DIR}/../presentation-export/scripts/export.py" presentations/<slug>/index.html --images exports/<slug>/after --all
```

Look at every image (open them one by one, or paste them into a contact sheet first to spot outliers).
Judge at 1920×1080; a narrow preview pane hides most problems.

## 2. What to look for

- **Overflow**: text or drawings cut at the slide edges or under the bottom bar/logo; content taller than the slide.
- **Collisions**: labels on top of labels, text over nodes or lines, the logo over content.
- **Legibility from the back of the room**: body text under ~24px, graph labels under ~18px, low contrast
  (dim gray on dark), long lines of text.
- **Consistency**: the title and kicker at the same position on every slide, same gap from the title to the
  content, same colors for the same kind of thing, cards in a row with equal height.
- **Final state**: the PDF shows the last click; check that intermediate texts replaced with `data-until`
  do not leave holes.
- **Empty space**: content crammed in a corner with half the slide empty usually means a layout bug.

Report each finding with the slide number, what is wrong and a concrete fix.

## 3. Regression check after a change

Render before the change (`--images exports/<slug>/before --all`), make the change, render again, then:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/compare_renders.py" exports/<slug>/before exports/<slug>/after --expect 12,13 --diff exports/<slug>/diffs
```

Every slide outside `--expect` that changed is a regression until explained. The default thresholds ignore
film grain and JPEG noise (mean difference ≈ 4) and small shifts from floating animations; a real change
is thousands of pixels. Open the `-diff.png` images to see where.
