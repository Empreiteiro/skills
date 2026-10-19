# Data cards

A skill for designing and checking **data cards**: the PNG images an app draws on the server for people to
share — a chart with a headline, a period summary, a social-media post. It targets cards rendered by
[Satori](https://github.com/vercel/satori), directly or through `ImageResponse` from `next/og` or `@vercel/og`,
but most of it (the contract, color roles, chart marks, copy) applies to any server-rendered chart image.

| Skill | What it does |
|---|---|
| `data-card-design` | The rules for the sheet, a three-role type system, color tokens by role with a single highlight, textures, a vocabulary of chart marks, the copy of each part, editable parts and derived social formats; and how to render fixtures and compare before/after |

```
skills/data-card-design/
  SKILL.md                     the rules
  reference.md                 a complete default spec: sheet, type scale, ten palettes, textures,
                               a catalog of 24 chart bodies, social formats, a module layout
  scripts/compare_renders.py   before/after comparison of two folders of renders
```

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install data-cards@empreiteiro-skills
```

The skill is then available as `/data-cards:data-card-design`; its description also lets Claude pick it up on
its own when a task touches a share card. Without the plugin system, copy `skills/data-card-design/` to
`~/.claude/skills/` or to a project's `.claude/skills/`.

## Requirements

- Python 3.9+ and Pillow (`pip install pillow`) for `compare_renders.py`.
- Optional: ImageMagick's `montage`, to put many renders on one contact sheet.
