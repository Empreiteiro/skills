---
name: ui-revamp-prototype
description: Throwaway UI/UX prototype of ONE surface of an app, published as an Artifact instead of code in the repo. It reproduces the current state with a numbered diagnosis, then proposes N directions, each a different thesis about the problem, for the stakeholder to pick from before anything is implemented. The Cases tab is always a live, clickable prototype running logic ported from the codebase, never a screenshot. Use when someone wants to rethink the look or flow of a specific screen, panel, card, dialog or onboarding step and see options first ("revamp this screen", "make a few versions of this", a pasted screenshot with "what can we do here"), and for the second round, combining pieces picked from different directions. Not for implementing a chosen direction (`implement`), gating and shipping (`test-and-ship`), auditing UI already written, explaining something already decided, or ops.
---

# UI revamp prototype

A prototype is throwaway code that answers one question. Here the question is always "how should this
surface be?", and the deliverable is a **published Artifact**, not a throwaway route in the app: nothing to
clean up or leak to production, a link the decision-maker can open, it outlives the session, and it forces
the side-by-side comparison that a `?variant=` route only simulates. The prototype HTML never enters the repo.

Needs: the Artifact tool, the `artifact-design` skill, git and grep on the project, and a headless browser
(Playwright) to drive the prototype before publishing. No app build.

> **The rule over everything:** a prototype counts only if it is implementable. A beautiful mockup that
> ignores what the data allows costs a full round of rework when coding starts. Half of this skill happens
> before anything is drawn.

> **The reader is the stakeholder, who thinks in product.** The page's own prose (theses, pins, comparison,
> recommendation) talks about app behavior: what the user marks, presses and gets back. Table, route, file
> and flag names go in the cost/dependency column. Mockups use the app's real strings in the locale the app
> actually ships: a translated mockup lies about every label's width. New copy a direction proposes, and the
> page's own prose, go through `write`; existing strings are copied verbatim.

## Effort

- **Thinking.** Phase 0 fails from lack of diligence (the search nobody ran), which fan-out fixes. Phase 2
  fails from shallow reasoning: N directions that truly disagree is divergent work, and the easy path
  converges on five versions of one idea. Spend thought there.
- **Fan-out** (Workflow tool, if available). Phases 0 and 2 parallelize naturally. Invoking this skill counts
  as opting in to orchestration, not as a reason to always do it: **4+ directions, or a surface with many
  consumers or states → workflow; below that, inline**, same phase order.
- **Plan mode.** Not in Phase 2: the Artifact is the decision document, and asking for approval twice (the
  second time in a worse format) only delays. It pays in Phase 3.

## Phase 0 — Anchor in the code (do not skip)

Before writing any HTML, answer with the code in hand. Find where the project keeps its strings, schema,
analytics events, feature flags, component library and design tokens in CLAUDE.md/AGENTS.md, or by searching.

```bash
grep -rn "<visible text from the screenshot>" <string dictionaries / copy files>   # the key...
grep -rn "<key>" <source dirs> | grep -v test                    # ...and who renders it
grep -rn "<ComponentName>" <source dirs> | grep -v test          # consumers, and in which states
grep -n  "<table|column>" <schema / migrations>                  # data that really exists, in every DB variant
grep -rn "<column|event>" <analytics, admin, dashboard code>     # where the value ends up
grep -n  "<area>" <feature flag registry>                        # can it be switched off?
```

| Question | Why it decides the design |
|---|---|
| Which value is **derived**, not editable? | A derived number gets no edit pencil; drawing one designs an affordance that cannot exist. (A count parsed from a text blob prints `? / 40` when the parser fails.) |
| What data does the front end **not have**? | If items are stored without a position, "how many" is drawable and "a minimap of where they are" is not. |
| Which value **gates** something downstream? | A product invariant can forbid showing it (which vendor backs a default, say). A direction that shows it is ruled out by invariant, not by taste. |
| **Which number on another screen does this control feed?** | Nothing in the repo links the two: no type, no test. The product's key metric may fire on the user's response (accept, undo), not on the write; each AI call may be billed; there may be no quota or spend cap. A direction that multiplies calls per session changes the bill, and that is the stakeholder's call, not yours. |
| **How many paths already do this?** | A new surface is rarely the only door. A new door must match the others' label, scope and event, or the product ends up with two names for one act. |
| Which **tracking event** fires today? | A new path over an existing feature inherits its event. A genuinely new name goes into the event registry first, or the funnel splits into two halves. A property value that names a control is renamed with the label, cheaply only while the series is new. |
| Does the **string key** exist, in every locale? | Reproducing the current state with the real keys proves you are looking at the right component. |
| Should it be **switchable**? | Probably a feature flag, not an `if`. A direction drawn on a surface a flag currently removes is one nobody sees; on a flag that is on, the risk is building on a surface an operator can remove. |

Record the findings: they become each direction's cost/blocker notes and turn opinion into a defensible
recommendation.

## The Artifact: two tabs, always

1. **Explanation** (opens by default): the current state with pins (Phase 1), the directions with thesis,
   contract and notes (Phase 2), the comparison table and the recommendation. Where the decision is made.
2. **Cases**: the same prototypes, live, and nothing else. No thesis, pin, cost note or table; each frame
   carries only its label (direction · case or state) and a "↺ Restart". The current state comes first in
   each group, unpinned, as the ruler for form and behavior. Where the surface gets used.

Reasoning and compared drawings fight for the same space; together, the mockup sinks in the prose. Keep the
tabs coupled:

- **One prototype, one source.** Both tabs mount the same live component per direction, never two copies of
  the HTML: the copy nobody fixed starts showing a decision that no longer exists. Pins enter by context, in
  Explanation only.
- **Group by the question.** Default: by case or state, every direction side by side. If another comparison
  is more natural, offer **one** "group by case · by direction" toggle, not a control panel. Every frame is
  live in both groupings.
- **Real width.** Grid `repeat(auto-fill, minmax(<real width>, 1fr))`, one column on a phone, no horizontal
  page scroll.
- **Tab in the URL** (`#cases`), so a link can point straight at it; no hash opens Explanation. The theme
  switcher sits in the chrome both tabs share.

### Cases is a live prototype, never a screenshot

Every frame is the screen working: the stakeholder clicks, types, switches tabs inside the frame, opens the
panel, gets the toast, and **tests** the behavior contract instead of reading it. A screenshot proves form
and hides what costs the most rework: the second click, the cancel, the derived state, the focus that never
arrives after a navigation.

As close to the real system as possible, in this order:

1. **Real logic, ported, not reimagined.** Copy every pure module the surface uses. Dependency-free modules
   can be run with Node and pasted as functions or emitted as JSON; extract the rest by script (regex over
   the source), never type it from memory: the "similar" version is wrong in exactly the case the direction
   exists for. Small hooks are ported with their real timings; text the server assembles is assembled with
   the same functions, in the same order.
2. **Real data and copy, fictional user content.** Catalogs, lists and labels come from the repo (the
   source-locale strings, seeded demo data).
3. **Real timings.** Autosave with the code's debounce, the save badge's real durations, network simulated
   at ~400 ms. Nothing instant that is slow in the app, nothing slow that is instant.
4. **Real navigation inside the frame.** Tabs, breadcrumbs and links the direction uses lead to simplified,
   clickable neighbor screens. A direction that changes a door is only tested by walking through it.
5. **Today's defects are real too.** If porting shows the current component is broken, the current state
   reproduces it and Explanation flags it. Fixing it silently makes today look better than it is.

What does not run, and how it shows:

- **AI calls never return an invented result**, including what the AI does on its own (automatic names,
  suggestions while typing). The control answers with a prototype notice (dashed toast, `PROTOTYPE` label,
  visibly outside the app) saying what it would do. Fabricated AI text is a quality promise nobody measured.
- **Persistence is in memory, per frame.** Two instances of one direction do not see each other; "↺ Restart",
  outside the screen, remounts. `localStorage` only for page preferences (theme). Add "⟳ Reload" when the
  contract says "until reload" or "next visit": it closes what is ephemeral and applies next-visit rules
  without losing work.
- **Surfaces outside the request** are clickable enough not to be a dead end (a notice saying they are out of
  scope), never a dead button.

Each case is a **starting point** (onboarding just finished, a draft open, 3 of 5 done) from which the
stakeholder can cross the whole app; one state model serves every direction. A case that can only be looked
at is a screenshot by another name.

The contract written in Explanation is what the prototype does. Write it while looking at the prototype
running, and when building exposes a hole (focus that never arrives, an edit one click wipes out), fix the
contract in the same step. In Explanation, give each direction one "Try it" line saying what to click.

Build mechanics (framework, device frames, focus across screens, lazy mounting, CSS traps):
[references/live-cases.md](references/live-cases.md).

**Before publishing, drive it by script.** A headless browser (the project's Playwright, if installed) opens
the local file, runs a click path per direction (main gesture, second click, cancel), checks the resulting
state, and fails on any console error and on horizontal scroll at 390 px. What breaks here is behavior, and
a screenshot does not show it. The script is throwaway and stays out of the repo.

## Phase 1 — Reproduce today, with pins

The first board in Explanation is the **current state**: faithful (same strings, same labels, same empty
state) and live, like the directions. Without it there is no ruler, and no proof that you understood.

Anchor a **numbered diagnosis** on it: a pin on the element, a matching item below. Aim for 4–8; at 15 you are
listing taste alongside problems. Each item says what is wrong and why, never "could be better", and names
the principle it breaks.

Use the project's own UX principles and past audit findings if it has any (CLAUDE.md/AGENTS.md, docs, a QA
folder; read the latest cycle too, since findings grow and principles do not). A pin that repeats a fixed
finding is a regression: say so. No direction may undo a fixed finding. Otherwise cite established
heuristics. The right kind of pin:

- a destructive control with the visual weight of a grey link (a "Skip setup" that silently discards every
  answer): destructive actions look destructive and say what they discard;
- a decision asked before the reader has the word the question uses ("this project" on a screen that has not
  shown a project yet): introduce before you ask;
- a claim that is not true yet ("your workspace is ready" with nothing created): honest status;
- an overlay that dims the very target the sentence describes: never hide what you point at;
- a feature that ships off and nobody finds: a default is a recommendation, not a neutral position;
- an animation that fires on an element the pointer merely crosses: motion answers intent;
- a raw color where a token exists: consistency.

## Phase 2 — N directions, each a thesis

**What kills the round is N skins of one idea.** Each direction disagrees with the others about **what the
problem is**:

| Axis | The question it asks | For example |
|---|---|---|
| Hierarchy | what if what matters moved to the top? | the bulk action leaves the footer for the section header |
| Edit mode | what if answering did not need a form mode? | a note box with one button, applied one press later |
| Reframing | what if the section were about something else? | the footer becomes "subject on the left, one verb on the right" |
| Temporal structure | what if the process stage organized it? | a passive tour becomes the core loop, performed |
| Density | what if it fit on one screen, the rest folded? | five onboarding screens become one |

Each board carries a **name**, a **one-sentence thesis**, the mockup **in the state that proves the thesis**
(labelled empty or filled), the **behavior contract** of every affordance it introduces, and three short
notes: **what it solves** (by pin number), the **components** from the project's library it would use, and
**cost + risk**. All of that lives in Explanation; Cases shows the mockup and the name.

Close with a **comparison table** (solves / cost / dependency) and an **explicit recommendation**, including
what you would **not** do now and why. The recommendation is the deliverable: five options without a verdict
push the decision back with no new information.

### The behavior contract

A static mockup proves form and hierarchy, not what happens on click, and that gap is the costliest rework
because everyone leaves believing it was decided. Declare the behavior in text, one line per new affordance,
in Explanation, **and** execute it in Cases. Text without the prototype leaves holes nobody sees; a prototype
without text leaves the decision implicit in whatever somebody happened to click.

| If the direction introduces… | …write down |
|---|---|
| an inline-edit field | what opens editing · where the caret lands · what confirms · what cancels **and what cancelling must not drop with it** · masking while typing vs formatting on blur |
| an invitation in an empty field | does it open the **same** editor as the filled field? If not, why |
| a destructive action | does it confirm? what does the confirmation say? what does it **not** discard ("Do this later" keeps what was answered; "Skip setup" threw it all away) |
| **a control that starts an AI pass** | calls per press · what a double press does, or this plus its neighbor, with a pass in flight (a server that cancels one after spending tokens needs a client latch from function entry to the busy flag) · append or replace (replace erases unanswered suggestions) · what the pass must not touch |
| **a control that resolves or archives items** | exactly WHICH ones: those the pass handled, or the whole list? Archiving the whole list once emptied a demo on the user's first press, with no card, toast or history entry |
| **a control that is the product's metric** | does the event fire on the user's response (accept, undo) or on the write? On the write it records every rejection and no acceptance. And how: an item accepted one by one is a stronger yes than the accept-all shortcut |
| a derived value | where it comes from, and what makes it stale |
| a default, on or off | which, and **why**: a default is a recommendation. If on, the guards that make it bearable |
| **a tour step or coach mark** | which gesture releases it, and **what stays clickable**: the target, any extras, and what is only evidence (dashed ring, presses die on it). A step with no exit is a dead end |
| **N triggers opening the same destination** | does repeating a trigger close it or do nothing? · does the neighbor trigger switch directly, or ask first if the current one is filled? · where does the destination appear relative to the trigger? |

One line per item. It separates "approved the drawing" from "approved the behavior", which look the same
until implementation starts.

### Fan-out of theses

Independent theses need independent authors: one context writing five variants pulls toward the average,
while N agents blind to each other diverge. The barrier before the critique is deliberate, since the critic
compares the theses with each other and needs all of them. Script:
[references/directions-workflow.md](references/directions-workflow.md). Its result feeds the boards; **you**
write the Artifact (visual composition, not fan-out work). A direction the critique rejects becomes one line
in the comparison saying why, which is usually more useful than a sixth option.

### Second round: fixed kit, vary the arrangement

The usual answer is not "I want 3" but "the numbers from 1, the contracts from 1, the trail from 4 and the
table from 3". Now the **kit is decided** and the new question is **how to arrange it**.

Name the pieces (A, B, C…), list them in a "The kit" block at the top, and have each board declare the
**order or grouping it used** (`C → A → D → E → B`). What varies now is height on screen, density and what
needs a click, not content. Pull shared material (the new rule, the field table) into sections of its own
before the boards, or you repeat it five times. The kit and each board's declared order live in Explanation;
Cases shows only the arrangements. No fan-out here: with the kit closed there are no theses to diverge.

## Artifact rules

1. **Real tokens, not an invented palette.** Read the project's theme file (CSS variables, a Tailwind
   `@theme`, a tokens file) and mirror both themes. A raw hex where a token exists is a consistency finding.
2. **Translate dark mode; do not copy it.** If the app's dark theme is a class that a theme library stamps
   (`.dark`), nothing adds that class inside an Artifact: the block never applies, and you review a light
   mockup believing you covered both. Put the full light palette on plain `:root`; redefine only the tokens
   that change in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` **and** again
   in `:root[data-theme="dark"] { … }`, so the switcher wins both ways. Give `body` an explicit token
   background.
3. **Light · dark · system switcher in the chrome, always, opening on system**: no forced `data-theme` on
   first paint. A board that only holds up in one theme goes back; half of contrast bugs show only in the
   theme you were not looking at.
4. **Fidelity over beauty.** Reproduce the app's real classes in a handful of reused mock classes. The page
   chrome (the spec sheet around the mockups) may have its own identity; the mockups may not.
5. **The project's type scale, and only that.** If the project limits font sizes to a scale (above all if a
   test enforces it), a mockup at an off-scale size proposes something the repo refuses. If no step fits, the
   direction proposes a named new step and says so.
6. **Font families keep their roles** (UI, content, mono, as the app assigns them). Swapping the content face
   lies about the density of the whole screen.
7. **A new color is an unverified color.** If the project measures contrast pairs (4.5:1 for text, 3:1 for
   borders that carry information), a direction that adds a pair takes on the debt of adding it there; say so
   in the cost note. If it **animates** between two states, both ends passing is not enough: the midpoint is
   what nobody measures.
8. **Real, tight measurements.** Use the surface's real column widths and grid, and check overflow with
   `scrollWidth` (two labels in a footer sized for one overflow). A board that gives a region more width is
   proposing to change the grid, not tidying a footer: say which.
9. **One state per board, labelled**: "empty (the real case)" vs "filled". Empty is common and is where most
   directions fail.
10. **Nobody's real content.** Seeded demo data or fiction: the Artifact gets shared.
11. **Load `artifact-design` before writing the page**, and keep the same `file_path` (so the same URL) and
    icon across redeploys of one investigation.
12. **Cases is live** (see above), and driving it by script before publishing is part of the rule.

## Phase 3 — After the choice: fold into the real code

Once a direction is picked, the prototype has done its job. The stakeholder approved **form**; what remains
are implementation decisions that look too small to ask about and too big to get wrong. **Plan before
editing the first file**, in about ten lines:

- which existing component covers each piece, and what must be created (where new components live:
  `atomic-design`);
- which **logic already exists** and will be reused: reinventing an existing module is the most common
  mistake here, and no gate catches it;
- the behavior contract translated into real function and prop names;
- new strings in the source locale first, then every other locale;
- a new module whose failure is a plausible wrong value rather than an exception gets its own direct test,
  following the project's convention for such modules;
- what the dark theme gains along with it.

The normal path is `implement <direction>`, whose planning step supplies this plan: do not ask for approval
twice. That holds only when Phase 2 produced the full contract per affordance. Then:

- **Implement against the repo's gate, not the mockup**: `implement`, then `test-and-ship`.
- **Keep the Artifact as the primary source.** Its URL goes in the PR body with the chosen direction and the
  **reason**. If the decision reverses something the project's agent docs assert, write the reversal there. A
  large investigation gets a folder, in the project's QA or docs convention, with the URL and screenshots.

## Don't

- Draw before Phase 0, or promise what the data cannot deliver: draw what is implementable today and list
  the rest as an explicit dependency.
- Ship N skins of one thesis, or an interactive affordance without its behavior contract.
- Show in a mockup what a product invariant hides, or multiply AI calls per gesture without stating the cost.
- Omit the recommendation, or recommend without saying what you would drop.
- Put prose, a screenshot or an invented AI result in Cases.
- Orchestrate by reflex, or host the variants in a throwaway route in the app.
- Implement before the stakeholder chooses.

---

Adapted from [mattpocock/skills · engineering/prototype](https://github.com/mattpocock/skills/tree/main/skills/engineering/prototype)
(MIT License, Copyright (c) 2026 Matt Pocock): the prototype as throwaway code that answers one question, and
folding the validated decision into real code with the prototype kept as the primary source.
