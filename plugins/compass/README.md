# Compass skills

Skills for working on [Compass](https://github.com/Empreiteiro/training-analysis), the training-analysis app
(Next.js, Strava data, shareable training cards). They are specific to that code base: they quote its files,
components and CSS classes and run its own modules, so they are only useful inside a checkout of it.

| Skill | What it does |
|---|---|
| `compass-card-design` | The design system of the training cards and Instagram posts (sheet, typefaces, color roles, textures, mark vocabulary, copy voice) and a script that renders the real PNGs without starting the app |
| `compass-layout-review` | Seeds a demo database, starts the app and screenshots a screen at 1440px and 390px, in the paper and dark themes, then goes through the layout checklist |

```
skills/
  compass-card-design/
    SKILL.md            the rules, condensed
    reference.md        every theme, body shape, type size and geometry constant
    scripts/render.tsx      renders cards and posts to PNG with fixed data
    scripts/race-posts.tsx  renders the race-analysis posts to PNG
  compass-layout-review/
    SKILL.md            how to start the app, capture and check
    layout-rules.md     the layout rules (English version of the project's .claude/rules/layout-web.md)
    scripts/seed.ts     demo SQLite database and an encrypted session cookie
    scripts/capture.mjs one Playwright screenshot of a logged-in screen
```

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install compass@empreiteiro-skills
```

The skills are then available as `/compass:compass-card-design` and `/compass:compass-layout-review`; their
descriptions also let Claude pick them up on its own when a task touches `src/lib/cards` or a screen in
`src/app/compass`. Without the plugin system, copy the folders from `skills/` to the project's `.claude/skills/`.

## Requirements

- A checkout of `Empreiteiro/training-analysis` with `npm ci` done. Every command runs from its root: the scripts
  load the app's modules through its `tests/register.mjs` loader and resolve `@/` and the npm packages from the
  working directory, so they work wherever the plugin is installed.
- Node 22.18 or later (TypeScript type stripping on by default, `node:sqlite`).
- For the screenshots: Playwright (`playwright` or `playwright-core`, in the project or installed globally) and a
  Chromium (`PLAYWRIGHT_BROWSERS_PATH`, or `CHROMIUM_PATH`).
- Optional: ImageMagick's `montage`, to put many card PNGs on one contact sheet.

## Naming

The text is in English. Identifiers that come from the code base are quoted exactly as the code spells them,
and the code is largely written in Portuguese: theme ids (`noite`, `papel`), query parameters (`?tema=`,
`?mostrar=`), card ids (`semanal`, `quadrados`), routes (`/compass/comparar`), CSS classes (`.pm-deck`) and
components (`PainelLateral`). The scripts take English option names (`--theme`, `--show`, `--route`) and pass the
app's ids through as values.
