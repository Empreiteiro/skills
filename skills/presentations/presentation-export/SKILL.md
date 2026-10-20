---
name: presentation-export
description: Export an HTML presentation to PDF, to one image per slide, or screenshot a single slide at 1920x1080 with headless Chrome. Use to share a deck as PDF, to produce slide images for review, or to look at a slide exactly as it will be projected.
---

# Export a presentation

Script: `${CLAUDE_SKILL_DIR}/scripts/export.py` (Python 3.9+, Chrome/Chromium/Edge; PyMuPDF for images).

```bash
# PDF, one slide per page, every slide in its final state (hidden slides skipped)
python "${CLAUDE_SKILL_DIR}/scripts/export.py" presentations/<slug>/index.html --pdf exports/<slug>.pdf

# one JPG per slide, hidden slides included so that image N = slide N
python "${CLAUDE_SKILL_DIR}/scripts/export.py" presentations/<slug>/index.html --images exports/<slug>/slides --all

# one slide as it looks live (N or N.step), 1920x1080
python "${CLAUDE_SKILL_DIR}/scripts/export.py" presentations/<slug>/index.html --slide 12.2 --png exports/s12.png

# any of the above plus the page's console messages (exit code 1 on errors)
python "${CLAUDE_SKILL_DIR}/scripts/export.py" presentations/<slug>/index.html --pdf exports/<slug>.pdf --console
```

## Notes

- Fonts and CDN libraries load from the internet; without it the render falls back to system fonts and
  D3 slides show a "D3 did not load" box.
- Without `--all`, hidden slides are skipped and page numbers no longer match slide numbers.
- Animations that never stop (floating background graphs) are captured at an arbitrary moment; compare renders
  with the tolerance of `presentation-check-visual`.
- `exports/` is git-ignored: share PDFs as release assets or through the user's own channel.
- Install what is missing with `pip install pymupdf pillow`; set `CHROME_PATH` if Chrome is not found.
