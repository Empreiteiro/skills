---
name: presentation-create
description: Create a new HTML presentation in this repository from the template in presentations/_template (16:9 stage, fragments, presenter mode, PDF export). Use when the user asks for a new deck, talk, slides or presentation, or wants to start one from an outline.
---

# Create a presentation

Every presentation is one self-contained `index.html` (no build step) inside `presentations/<slug>/`,
started from `presentations/_template/`. Read `presentations/_template/README.md` once if you have not.

The template lives in the `Empreiteiro/skills` repository. When these skills are installed as a plugin and you
are working in another project, copy it from `${CLAUDE_SKILL_DIR}/../../presentations/_template/` and create the
same `presentations/` layout (with its own `README.md` index) in that project.

## Steps

1. **Agree on the basics** before writing slides: title, audience, language of the slides, duration,
   and the 3–6 sections of the talk. If the user gave an outline, use it as is.
2. **Pick the slug**: short, English, kebab-case, describing the topic (`knowledge-management-with-graphs`).
   Never reuse an existing folder.
3. **Copy the template**: `presentations/_template/` → `presentations/<slug>/` (keep `index.html`; add `assets/` only if needed).
4. **Set the identity**: `<html lang>`, `<title>`, title slide (name, role), closing slide (contact),
   `TALK_MINUTES` (presenter timer), optional `--logo` in `:root`.
5. **Outline as slides**: one `<section class="slide">` per idea, each with a kicker (`<b>NN</b> · Section`),
   a title that says the point, and both asides (see the `presentation-slide` skill).
   Remove the template's example slides and the `CTRL.demo` controller if unused.
6. **Write `presentations/<slug>/README.md`**: title, language, audience, duration, author, section outline,
   how to present, and where any data comes from (`data/` folder for raw sources and generators).
7. **Register it** in the table of `presentations/README.md`.
8. **Check before handing over**: run the `presentation-check-structure` skill and render the deck with
   `presentation-export` (`--images`), then look at the images.

## Conventions

- Stage is 1920×1080; the engine scales it. Design for 1920×1080 and check at that size,
  never only in a narrow preview pane.
- Slide text in the audience's language; code, comments, ids and file names in English.
- External libraries only from a CDN with an exact version (`d3/7.9.0`), declared in `<head>`.
- Keep the visual language of the template: dark background, Martian Mono, the color tokens in `:root`,
  clean vector drawings (inline SVG). Do not imitate hand-drawn styles.
- Backup material goes in slides with `data-hidden` (skipped by the presentation and the PDF, visible with `?all`).
- Keys while presenting: arrows/space/PageUp/PageDown, `F` fullscreen, `O` overview, `S` presenter window
  (timer, current and next slide, notes).
