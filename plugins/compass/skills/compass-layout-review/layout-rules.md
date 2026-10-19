# Compass web layout rules

Rules that have already cost a round of fixes. Before delivering a new or
changed screen, check it with the `compass-layout-review` skill — it starts the
app with demo data and takes the screenshots.

This is the English version of the project's `.claude/rules/layout-web.md`,
which applies to `src/app/**/*.tsx`, `src/components/**/*.tsx` and
`src/lib/design/**/*.css`. Screen names are the English UI labels; classes,
components and files are quoted as the code spells them.

- **Text under the title uses the full width of the screen.** The `.pm-deck`,
  the subtitle and the section hints get no `max-width` in `ch` (nor in px) on
  the web. A 58ch column left five lines pushed to the left and half the
  screen empty, under a title and a table that use the whole width. On mobile
  the screen itself limits the line. A reading measure only applies INSIDE a
  block (the text of a finding, `.pm-finding-text`), never in the screen
  header.
- **Every screen sits on the same margin.** On the web, `.pm-screen` sits
  `--pm-margem` (48px) from the left edge of the board, at any window width
  and with the right panel open or closed. The screen used to be centered in a
  1100px column, and the title moved from one screen to another (54px with the
  panel, 76px without it, 33px on the "wide" ones). Do not center the screen,
  do not create a wide variant and do not add per-screen side margins. The
  1440px ceiling only shows in a very wide window, and on the right side.
- **A single vertical for text.** Title, subtitle, tags, section titles, the
  text of list rows and the first number of each stats row start on the
  title's vertical. Whatever has a highlight (the list row, its header) sticks
  out 14px on each side and gives the 14px back inside; a bordered card
  (`.pm-choice`, a finding) aligns its border. No inline `padding: "0 4px"`
  under the title, nor the mobile margin (`20px`) set in `style` and inherited
  by the web — use `.pm-stack`, which already knows both.
- **The same vertical rhythm.** From the header to the first block, the
  header's own breathing room applies (30px), with no extra margin added; from
  the numbers strip to the next block, 32px to the text; between panels, 24px.
- **The board has both curves.** `.pm-canvas` comes down from the top with a
  rounded corner on both sides, and the right rail (`--pm-trilho`) mirrors the
  sidebar. Do not push anything against the right edge of the window, do not
  recreate borders or corners per screen, and do not touch the `.pm-app` grid
  without keeping its three columns.
- **Filters and parameters live in the right panel.** Feed, Trends, Compare,
  Vectors, Create and Instagram use the `PainelLateral`: the screen draws it
  next to the title (`.pm-head-titulo`), and the shell opens the rail by itself
  (`:has`). On mobile the funnel that opens the drawer moves up to the top,
  next to the avatar. The title says what it holds — "Filters", "Parameters"
  (Vectors), "Filters and parameters" (Create, Instagram). A "Filter" at the top
  is only left for a screen with ONE question (an athlete's overview).
- **The panel starts collapsed, and Tab opens and closes it.** Every visit
  starts collapsed: do not change the default in `trilho.ts` nor go back to
  keeping the state in localStorage. Tab is not captured while it is moving
  focus — in a field, or with focus placed by the keyboard; focus left by a
  click does not count (see `tabNavega` in `PainelLateral` — and do not use
  `:focus-visible` for this, Chrome turns it on with any key). While
  collapsed, the tags under the title (`Etiquetas`) say what is being
  filtered.
- **A category is a selection list.** Activity type, workout type, workout or
  race, athletes: one option per row, with the pieces from `Lateral.tsx`
  (`ListaLinks`, `ListaMarcacao`, `ListaAplicar`), a round mark for single
  choice and a square one for multiple. Chips only for short windows (period,
  theme, unit). Do not build a group, list or footer by hand inside the panel.
- **Value ranges are two-handle sliders** (`FaixaDupla`), with the domain taken
  from the user's own history (from the 1st to the 99th percentile), and a
  handle at the end = no limit. No pair of "from/to" text fields for a number.
- **On mobile the screen has no visible title.** The tab bar already says where
  you are: the `.pm-head-title` stays for screen readers only, and the content
  starts right below the top bar (where the brand lives). CONTENT titles stay —
  the workout's name, the athlete's (`.pm-analysis-title`). Do not recreate a
  visible per-screen title on mobile.
- **On mobile, `/compass` is the home screen, and on the web it is the feed.**
  Both come in the same HTML and the CSS picks (`.pm-so-celular`,
  `.pm-so-web`); the full mobile list lives at `/compass/treinos`. Changed the
  feed? Check both widths at both addresses.
- **Every screen is seen at 1440px and 390px, on paper and on dark**, before it
  goes to the PR. Screenshots read, not assumed.
