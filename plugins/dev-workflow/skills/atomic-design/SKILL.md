---
name: atomic-design
description: Decide where a React component lives and what it may import in a project organized as atomic-design levels (atoms, molecules, organisms, templates) plus feature folders, and what goes stale when a file moves. Use before creating a new component file, before moving one, when asked to "extract this into a component", "split this file" or "where does this go", and when a folder-structure check fails. Not for how a component is written (props, state, styling); that follows the surrounding code.
---

# Atomic design

## Layout

Read the layout from the project's CLAUDE.md / AGENTS.md or architecture doc; if it states none, use this
default and say so:

| Placeholder | Holds | Default |
|---|---|---|
| `<ui>` | shared UI, in four levels | `components/{atoms,molecules,organisms,templates}/` |
| `<features>` | one folder per bounded context, nothing loose at its root | `features/<context>/{components,hooks,lib,api}/` |
| `<lib>` | shared non-UI code | `lib/` |
| `<routes>` | the framework's route folder | `app/` (or `pages/`) |

**The whole rule in one sentence:** every component lives in a `<ui>` level or in
`<features>/<context>/components/`, and `<routes>` holds route files only. A test that enforces positions,
if the project has one, is the gate.

## Classify: five questions, in order

Stop at the first yes.

1. **Does it depend on data, a hook or a rule of ONE context?** → `<features>/<context>/components/`.
   Use the contexts that exist. Do not invent a new one unless a module or a route already names it.
2. **Is it the shell of a page, with no real data?** → `templates/`. If that level is empty, being the
   first is a decision: say why in the PR.
3. **Is it a complete presentational section?** → `organisms/` (page header, hero, a searchable picker
   with its list).
4. **Is it a few atoms with one job?** → `molecules/` (form field, dialog, combobox, theme toggle).
5. **Is it indivisible, containing no other component?** → `atoms/` (button, input, logo, spinner).

**Reuse before creating.** Before writing a component, look through its level and the one above. Two
files drawing the same chip is how a design system stops being one, and no check sees it.

## Import direction

```
<routes>  ──▶  <features>  ──▶  <ui>  ──▶  <lib>
```

The higher level composes the lower, never the reverse. `<ui>` never imports `<features>`; a feature
never imports another feature; an atom does not import a molecule. Generated primitives (e.g. shadcn)
import nothing of the project's beyond its class-name helper. `<lib>` does not draw, except providers the
project lists.

## Where a component's `.ts` companion goes

A position check usually watches only component files. The hook, model or server-actions module beside
a component travels on its own and nothing reminds you.

- Feature component → `<features>/<context>/{hooks,lib,api}/`.
- Shared component → `<lib>`, never inside `<ui>`: lint configs often waive complexity, size and
  strictness rules in `atoms/` and `molecules/` for vendored generated code, and hand-written code put
  there inherits the waiver silently.
- Helper next to a client component: every export of a `'use client'` module is a client reference, so a
  plain function from it called during a server render throws at request time, with the build green. Put
  it in a module without the directive.

## Moving a file: six things that go stale, and nothing reminds you

1. **Relative imports.** `./x` and `../../y` do not break when the file moves; they point somewhere else,
   and the build is what finds out. An alias codemod does not see them. Resolve each specifier to the
   real file **from the original folder**.
2. **The companion `.ts`** (above).
3. **Path-indexed lint baselines or suppression ledgers.** Repoint each entry, with the same count before
   and after. A "suppress all" command does not repoint: it pardons whatever is red at that moment,
   including the debt the move just created. The list may grow only when a file split (same debt, two
   names), and the proof is an equal error count. An entry pointing at a deleted file disables nothing
   and stays green forever: confirm every path still exists.
4. **Docs that cite paths.** If a test checks cited paths, a path cited to say it is gone needs
   "deleted" or "removed" next to it.
5. **Mirrored copies** (skills or config duplicated in another repo) that cite paths: diff them against
   each other.
6. **The `files` / `ignores` globs of lint rules.** The worst of the six because it does not turn red, it
   goes mute: a glob that stops matching switches the rule off in silence (e.g. a rule against raw
   user-facing strings scoped to the old folders stops checking every component that moved). If you
   created a top-level folder or changed `ignores`, confirm each rule still covers what it meant to.

## Prove nothing changed

A move is invisible to users, and that is proven, not asserted: build before and after and compare the
served HTML. Raw bytes do not work, because font loaders and bundlers rename classes and chunks on every
build; compare the tag sequence, the utility classes and the text. Pages behind login need auth enabled
locally and admin pages need their credentials, otherwise you are comparing two sets of 404s.

## Do not, while moving

- Change styling, fix raw colors, pixel sizes or hard-coded strings (separate passes), or change the
  component's API.
- **Move and refactor in the same commit.** A move is mechanical and the HTML proves it; a refactor
  changes behavior and only a browser test proves it. A `git mv` with an edit inside is a diff nobody
  reviews.

## Splitting is not moving

A large component does not become several by moving code. What leaves is a choice of which state and
refs cross a new boundary, and a wrong choice produces a wrong screen, not an error: the type checker
accepts a ref that became a prop and lost its identity between renders. What can leave without a
refactor is what is already module-level: types, constants, pure functions, components that do not read
the closure. Anything else is a refactor and needs its browser test.
