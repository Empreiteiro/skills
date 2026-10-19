# Presentation template

Starter deck for new presentations. Copy this folder to `presentations/<slug>/` (or use the
`presentation-create` skill) and replace the example slides.

## What the engine does

- 16:9 stage of 1920×1080 scaled to the window; taller or wider screens get extra breathing room (up to 4:3 and 21:9).
- Click by click: `.fragment` elements (`data-f="n"` to pin to a click, `data-until="n"` to hide after a click)
  and controller steps (`data-steps="N"` + `CTRL.<name>.step`).
- Hidden slides: `data-hidden` keeps a slide in the file but skips it; `?all` in the URL shows everything.
- Keys: arrows, space, PageUp/PageDown, Home/End; `F` fullscreen; `O` overview; `S` presenter window.
- Presenter window: timer (turns red after `TALK_MINUTES`), clock, current and next slide, notes; the main window
  follows it (same browser, via BroadcastChannel/postMessage).
- Print / PDF: one slide per page at 1920×1080, every slide in its final state, hidden slides skipped.
- The URL keeps the current slide (`#12`); `#12.2` opens slide 12 after two clicks.

## Example slides

1. Title · 2. Bullet points by click · 3. Two columns · 4. Slide with a controller · 5. Hidden backup · 6. Questions

## Customizing

- Colors, fonts and spacing are CSS variables in `:root`.
- Logo in the bottom-right corner of every slide: set `--logo: url("assets/logo.svg")`.
- Add a library (for example D3 for graph slides) with an exact version from cdnjs, in `<head>`.
