---
name: presentation-check-structure
description: Check the structure of an HTML presentation — slide list, hidden slides, clicks, controllers, speaker notes, presenter explanations, cross-slide references, pinned CDN versions, missing assets and JavaScript console errors. Use after editing a deck, before presenting or exporting, or when asked to check or lint a presentation.
---

# Structure check

```bash
python "${CLAUDE_SKILL_DIR}/scripts/check_structure.py" presentations/<slug>/index.html --console
```

`--console` loads the deck in headless Chrome while printing it (which runs every controller in its final
step) and reports JavaScript errors; it uses `../presentation-export/scripts/export.py`.
`--json` gives a machine-readable report. Exit code 1 means there are errors.

## What it reports

| Level | Finding | Usual fix |
|---|---|---|
| error | `data-ctrl` without `CTRL.<name>` | add the controller or remove the attribute |
| error | local file referenced but missing | add the file under `assets/` or fix the path |
| error | CDN script without an exact version | pin it (`…/d3/7.9.0/d3.min.js`) |
| error | fragment with `data-until` lower than `data-f` | fix the click numbers |
| error | console error | open the slide, read the stack, fix the controller |
| warning | slide without notes / without explanation | write them (see `presentation-slide`) |
| warning | "slide N" points past the end or to a hidden slide | renumber, or say the slide is a backup |
| warning | duplicated title, unused controller | rename / delete |

## How to report

Show the slide table only if the user asked for an overview; otherwise list errors first, then warnings,
each with the slide number and a one-line fix. Do not fix content issues silently: propose the fix,
apply it when the user agrees (or when the request was to fix them).
