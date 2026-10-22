# Presentations

Published at <https://empreiteiro.github.io/skills/>, always the version on `main`.

| Presentation | Language | Slides | Folder |
|---|---|---|---|
| Gestão de Conhecimento com Grafos (knowledge management with graphs) | pt-BR | 29 (23 shown, 6 hidden backups) | [knowledge-management-with-graphs](knowledge-management-with-graphs/) |

## Adding a presentation

Use the `presentation-create` skill, or by hand:

1. Copy `_template/` to a new folder named with a short English kebab-case slug.
2. Edit `index.html` (title, author, slides). Keep everything in that one file; put images in `assets/`
   and raw data plus generator scripts in `data/`.
3. Write the folder's `README.md`: title, language, audience, duration, outline, sources.
4. Add a row to the table above.
5. Check it: `presentation-check-structure`, then render it with `presentation-export` and look at the slides.
6. Merge to `main`: the deck goes live at `https://empreiteiro.github.io/skills/<slug>/`.

## Website

`.github/workflows/pages.yml` runs on every push to `main` that changes `presentations/`: it runs
`check_structure.py` on each deck (an error stops the publish, the site keeps the previous version), then
`build_site.py` copies every `<slug>/` to the site and writes an index page with the decks, and GitHub Pages serves
it. To see the site before pushing: `python presentations/build_site.py _site` and serve `_site/` with any static
server. Decks whose folder starts with `_` (the template) are not published.

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
