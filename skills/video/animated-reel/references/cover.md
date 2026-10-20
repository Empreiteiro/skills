# Cover

Every reel has one: a 1080x1920 PNG next to the MP4 (`<date>-reel-NN-<slug>-cover.png`), drawn by the engine from the
reel's `export const COVER = E.cover({ … })` and delivered by `reel.sh`. It is uploaded in the app's "Edit cover →
Add from gallery".

## The template

```js
export const COVER = E.cover({
  label: 'Recipes · the margin', y: 380,
  title: 'Only <span id="c">one line</span> <em>changes.</em>',
  character: { src: E.CAST.example.point, feet: [720, 1880], height: 1200 },
  arrow: { from: [470, 800], to: [360, 600] },
});
```

Paper; a slate mono label (`<category> · <where the concept lives>`); an Archivo 104 headline with ONE word in a slate
block (`<em>`) and a passage circled in pen (`<span id="c">`); the big character on the right, bleeding off the bottom;
the arrow from their pen to the passage; the brand lockup at the bottom left (y 1560; `brand` or `E.BRAND`).

## Rules

- **What matters stays inside the central 3:4 (y 240–1680)**: that is what the profile grid shows. Ideally it also fits
  the central 1:1 (y 420–1500). Check:
  `magick out/<id>/cover.png -crop 1080x1440+0+240 +repage -resize 360x480 out/<id>/cover-grid.png`.
- **Title:** concrete, present tense, one anchor (a name, a number, an object of the story), 2–3 lines of ≤ 17
  characters, no ellipsis. It passes the project's copy rules.
- **It does not repeat** the caption's hook or the first line, but **shares one term** with the hook (ideally the
  keyword).
- The character's whole face inside the 3:4, with no headline over the head.
- A series of covers should read as one grid: `tools/gallery.py` writes `_grid-preview.jpg` with the covers in order,
  cropped the way the profile shows them.
