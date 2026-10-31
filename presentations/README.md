# Presentations

| Presentation | Language | Slides | Folder |
|---|---|---|---|
| Augmented-Generation e Gestão de Conhecimento com Grafos (augmented generation and knowledge management with graphs) | pt-BR | 29 (21 shown, 8 hidden backups) | [knowledge-management-with-graphs](knowledge-management-with-graphs/) |

## Adding a presentation

Use the `presentation-create` skill, or by hand:

1. Copy `_template/` to a new folder named with a short English kebab-case slug.
2. Edit `index.html` (title, author, slides). Keep everything in that one file; put images in `assets/`
   and raw data plus generator scripts in `data/`.
3. Write the folder's `README.md`: title, language, audience, duration, outline, sources.
4. Add a row to the table above.
5. Check it: `presentation-check-structure`, then render it with `presentation-export` and look at the slides.

## Reviewing a presentation

[`review-editor-prompt.md`](review-editor-prompt.md) has the prompts to build a review editor for a deck (an
Artifact on claude.ai where you pin comments to the slides) and to resolve the open comments afterwards.

## Folder layout

```
<slug>/
  index.html     the whole deck: slides, styles and the presentation engine
  assets/        images and other files referenced by index.html
  data/          raw data behind data-driven slides, with sources and the scripts that turn it into slides
  README.md      what the talk is, how to present it, where the data comes from
```

## Conventions

- One `<section class="slide">` per slide on a 1920×1080 stage; the engine scales it to the screen.
- Each slide has speaker notes (`aside.notes`, shown in the presenter window) and an explanation for whoever
  presents (`aside.explain`, never shown). Older decks use `aside.explica` and `data-oculto`.
- Hidden backup slides stay in the file (`data-hidden`); the presentation and the PDF skip them.
- External libraries come from a CDN with an exact version. No build step.
