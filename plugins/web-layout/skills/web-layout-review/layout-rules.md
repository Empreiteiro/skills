# Layout rules

A default rule set for an app shell with a sidebar, a content area and an
optional right panel on desktop, and a top bar, a bottom tab bar and drawers on
phones. Each rule came out of a real regression. Adopt them as they are, or
adapt them to your design system, and make them load on their own: copy this
file to `.claude/rules/layout.md` with a `paths:` front matter listing the
screen, component and CSS files, or point to it from the project's
`CLAUDE.md`. Replace the role names below (header text, frame, right panel)
with your project's classes and components.

## Width and alignment

- **Text under the title uses the full width of the content column.** The
  intro, the subtitle and the section hints get no `max-width` in `ch` (nor
  in px) on desktop. A 58ch column leaves a few lines pushed to the left and
  half the screen empty, under a title and a table that use the whole width.
  On phones the screen itself limits the line. A reading measure only applies
  INSIDE a block (the body of a card, of a finding), never in the screen
  header.
- **Every screen sits on the same margin.** The content starts at one fixed
  distance from the frame's left edge (a single spacing token), at any window
  width and with the right panel open or closed. Do not center screens in a
  fixed-width column — the title then moves from one screen to the next — do
  not create "wide" variants, and do not add per-screen side margins. If the
  content has a maximum width, it only shows in a very wide window, and on the
  right side.
- **A single vertical for text.** Title, subtitle, tags, section titles, the
  text of list rows and the first number of each stats row start on the
  title's vertical. Whatever has a highlight (a hovered row, a row header)
  extends out by its padding on each side and gives it back inside (a negative
  margin equal to the padding); a bordered card aligns its border. No ad hoc
  inline padding under the title, and no phone gutter set inline and
  inherited by desktop — use the shared stack component or class that knows
  both.
- **The same vertical rhythm.** From the header to the first block, only the
  header's own spacing (no margin added on top); from a stats strip to the
  next block, one fixed gap; between panels, one fixed gap. Three tokens, used
  everywhere.

## The frame

- **The frame belongs to the shell.** The content area's corners, borders and
  the right rail that mirrors the sidebar are drawn once, by the shell. Do not
  push anything against the window's right edge, do not recreate borders or
  corners per screen, and do not change the shell's grid without keeping all
  of its columns.

## Filters and parameters

- **Filters and parameters live in the right panel.** Every screen with
  filters uses the same panel component, drawn next to the title, and the
  shell opens the rail for it. On phones the panel becomes a drawer, opened by
  a filter button at the top, next to the avatar. The panel's title says what
  it holds — "Filters", "Parameters", "Filters and parameters". A filter bar
  at the top is only for a screen that answers ONE question.
- **The panel has one default, and keyboard shortcuts do not steal focus
  keys.** Pick the default (collapsed or open) once, in one place, and do not
  persist a per-visit state that makes screenshots and users disagree. A
  single-key shortcut never fires while the user is typing in a field or
  moving focus with the keyboard (focus left by a mouse click does not count;
  `:focus-visible` is not a reliable signal for this, some browsers turn it on
  with any key). While collapsed, tags under the title say what is being
  filtered.
- **A category is a selection list.** Type, status, group, people: one option
  per row, a round mark for a single choice and a square one for several,
  built from the panel's shared list pieces. Chips only for short sets of
  windows (period, theme, unit). Do not hand-build groups, lists or footers
  inside the panel.
- **Value ranges are two-handle sliders**, with the domain taken from the
  user's own data (from the 1st to the 99th percentile), and a handle at the
  end meaning "no limit". No pair of "from/to" text fields for a number.

## Phones

- **No visible screen title when the tab bar already names the screen.** The
  title stays for screen readers only, and the content starts right below the
  top bar. CONTENT titles stay (the name of the record, of the person).
- **One URL, two layouts, both checked.** When the same address renders a
  different screen on phones and on desktop (a home screen against a feed),
  both come in the same HTML and CSS picks; a change to either is checked at
  both widths.
- **Nothing scrolls sideways.** A wide table scrolls inside its own container;
  the bottom tab bar never covers the last block.

## Always

- **Every changed screen is seen at 1440px and 390px, in every theme**, before
  it goes to the PR. Screenshots read, not assumed.
