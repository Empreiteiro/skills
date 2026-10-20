---
name: writing-technical
description: >
  The craft of technical writing: writing that gets a reader to do something with a product, from
  documentation to UX writing (interface copy, errors).
  Use when writing, editing or reviewing READMEs, tutorials, how-to guides, API references, runbooks,
  troubleshooting and migration guides, release notes, and interface copy. Triggers include documentation,
  README, tutorial, API reference, Diátaxis, runbook, UX writing, microcopy, error message.
  For the brand's own voice and the AI-tell checks, load the `write` skill alongside this one.
---

# Technical Writing

A technical reader is in the middle of a task: they skim for the step, run it, and come back only when it fails.
They need the right action in the right order, names that match the screen character for character, and errors that
say how to recover. What goes wrong most often is an edit that reads better and works worse: a setting renamed for
variety, a "should" where the product means "must", a command tidied until it no longer runs.

> Built from [google-dev-style](https://github.com/AdityaUmale/google-dev-style), [technical-writing-skill](https://github.com/SeverinAlexB/technical-writing-skill), [Gemini CLI's docs-writer](https://github.com/google-gemini/gemini-cli/tree/main/.gemini/skills/docs-writer), [diataxis-agent-skill](https://github.com/keithpatton/diataxis-agent-skill), [humbleteam/ux-writing](https://github.com/humbleteam/ux-writing), [ill-communication](https://github.com/alexconner-79/ill-communication), the [Google developer documentation style guide](https://developers.google.com/style), [Diátaxis](https://diataxis.fr) and the [GOV.UK Design System](https://design-system.service.gov.uk/components/error-message/). Synthesized, not copied — sources at the end.

## The standards

Items marked *(core)* are the short list to hand a writer or a model; the rest extend them.

1. **Anything the reader does is an imperative.** *(core)* "Run", "Set", "Open". Anything the system does is
   present tense: "The API returns a token", not "will return".
2. **Code and literals are exact.** *(core)* Commands, paths, flags, identifiers, config keys, output strings,
   error codes, placeholders and version numbers are copied, never paraphrased, down to whitespace.
3. **One action per step.** *(core)* "Open Settings and then turn on Sync" is two steps. Sequential menu picks
   are the one exception: "Click File > Export > PDF".
4. **A name in the product is a name in the docs.** *(core)* Write the label as it appears on screen, in bold,
   same case and spelling; one term per concept across the page. "Labels are verbs" means action labels (buttons,
   links, menu items) name the outcome, and a confirm button repeats the verb of its action: "Delete project", not
   "OK". A form field's label still names what goes in it ("Phone number"). Never use one verb for two different
   actions on the same screen.
5. **An error says what happened and what to do.** *(core)* "Payment failed. Your card was declined. Try another
   card." No "please", "sorry", "oops", "invalid" or "illegal", no blame ("You entered..."), no bare code: the code
   goes after the message, for support. A field's error reuses the field's label: label "Date of birth" → error
   "Enter your date of birth".
6. **Know which page you are writing.** A tutorial teaches by doing; a how-to gets a competent reader through one
   task; a reference describes the machinery for lookup; an explanation says why (Diátaxis). A page that mixes
   them makes every reader wade through the parts meant for someone else; link out instead of digressing.
7. **Lead with the outcome.** The first sentence says what the page, section or message lets the reader do.
   "This comprehensive guide will walk you through setting up..." → "Set up single sign-on for your workspace."
8. **Condition before instruction.** "To delete the whole document, click **Delete**", not "Click **Delete** if you
   want to delete the whole document"; "On the **Billing** page, select..." The reader skips what does not apply
   before acting on it.
9. **"Must" for requirements, "can" for options, and say when something is a recommendation.** "Should" leaves the
   reader guessing whether it is required. Exception: in a spec that defines MUST and SHOULD (RFC 2119), they are
   terms of art.
10. **Qualifiers are behavior.** "By default", "only", "at least", "up to", "may" each change what the product does.
    A shorter sentence that drops one is a wrong sentence.
11. **Show what success looks like.** After any step that changes state, say what the reader sees: the output, the
    new screen, the status. Troubleshooting runs from symptom to cause to fix, and an unconfirmed cause is
    stated as likely, not as fact.
12. **Prerequisites before step one; placeholders before first use.** Permissions, versions, accounts and files the
    task needs go first. Every placeholder (`PROJECT_ID`) is explained before the command that uses it, and the same
    value is spelled the same way in prose and code.
13. **No condescension, no hype.** "Simply", "just", "easy", "obviously" tell a stuck reader the problem is them.
    "Seamless", "powerful", "blazing-fast" are claims nobody can check. If a step is easy, the reader will notice.
14. **Name things, not positions.** "Select **Save**", not "click the button at the top right"; "the following
    table", not "below"; link text names its destination, never "click here" or "learn more" alone.
15. **Interface copy matches the moment.** A destructive confirmation names what is lost and whether it can be
    undone; anything reversible gets an undo instead of a dialog. An empty state says what goes here and the one
    action that fills it. A success message is past tense and specific ("Project deleted"). No jokes near money,
    data loss or security.
16. **Write timelessly.** "Currently", "new", "soon" and "now supports" go stale on publication. Anchor change to a
    version or a date; time words belong in release notes and changelogs, which are dated by nature.

## How a piece is built

**Before drafting.** Name the reader, their starting state, the task and the observable end state. Check every fact
against the product, the code or the source of truth: defaults, limits, supported versions, exact labels. Pick the
page type. For UI copy, list the moments the user meets the text (before, during, after, on failure).

| Page | Reader's question | Shape | Closes with |
|---|---|---|---|
| Tutorial | "Teach me by doing" | Goal, prerequisites, steps that each produce a visible result, one path, no alternatives | What they built and where to go next |
| How-to guide | "How do I do X?" | Goal, assumptions, numbered steps, verification | How to confirm it worked; related tasks |
| Reference | "What exactly is X?" | Mirrors the thing described: per entry name, type, default, accepted values, effect, example | Nothing; reference is consulted, not read |
| Explanation | "Why does X work this way?" | Context, the concept, trade-offs and alternatives | The design decision and its consequence |
| README | "What is this and how do I start?" | What it does, who it is for, shortest path to a working setup, links out | Where to read more and how to contribute |
| Release notes / changelog | "What changed for me?" | Grouped by impact: breaking changes first, then new, fixed, deprecated | Upgrade or migration link |
| Runbook / troubleshooting | "It is broken; what now?" | Symptom, scope, read-only diagnostics, action chosen by what the checks show, recovery check, escalation | How to confirm recovery |
| Migration guide | "How do I move from A to B?" | Source and target versions, who is affected, preparation, steps, checks, rollback | Post-migration checks |

**A procedure.** One introductory sentence that is complete on its own ("To rotate the key, do the following:"),
then numbered steps. Inside a step: where, the action, the command, what its placeholders mean, then the result in
its own sentence. Mark optional steps "Optional:" at the start. A single step is a sentence, not a list of one.

**Interface copy.**

| Element | Shape | Example |
|---|---|---|
| Button / link | Verb + object, sentence case | "Save changes", "Invite teammate" |
| Inline validation | What the field needs, in the label's words | "Enter a date in the past" |
| System error | What failed, likely cause if actionable, next step | "Couldn't upload. File is over 10 MB. Choose a smaller file." |
| Destructive confirmation | Action and object as a question, consequence, reversibility; buttons repeat the verb | "Delete 'Q3 report'? Its 12 comments go with it. This can't be undone." / "Delete report" · "Cancel" |
| Empty state | What belongs here, the action that fills it | "No invoices yet. Create your first invoice." |
| Success toast | Object + past-tense result | "Invoice sent." |
| Tooltip | What the control does, or why it is disabled; never its own label again | "Publishing needs a title." |
| Permission request | The benefit, then the permission | "Get notified when orders ship. Turn on notifications." |
| Field label / hint | Noun phrase; the hint answers "why do you need this?" | "Phone number" / "For delivery updates only." |

**Openings and endings.** Pages open on the outcome; headings are sentence case, task headings are verbs ("Create an
instance"), concept headings are nouns ("Instance lifecycle"). Pages end on verification or next steps, never on a
"Conclusion" that repeats the page.

**Reader test.** Before handing a page back, read it as someone with only the stated prerequisites. Every place that
reader would stop and ask a question is a gap.

## The editing pass

- [ ] Is the page one type, with the other types linked rather than mixed in?
- [ ] Does the first sentence say what the reader can do after reading?
- [ ] Are prerequisites listed before step one, and placeholders explained before first use?
- [ ] Is every step one action, imperative, with its condition first and its result stated?
- [ ] Do commands, paths, flags, config keys and output match the source exactly, and can each code block be
      copied and run as is?
- [ ] Does every UI label match the product in case and spelling, with one term per concept?
- [ ] Are "must", "can" and recommendations used deliberately, and are qualifiers ("by default", "only") intact?
- [ ] Are "simply", "just", "easy", "please" and hype adjectives gone?
- [ ] Do links name their destination, and do anchors still resolve after any heading change?
- [ ] Does every error say what happened and what to do, without apology or blame?
- [ ] Do confirmations name the consequence and reversibility, with buttons that repeat the verb?
- [ ] Do UI strings keep their interpolation tokens and plural forms, and fit their space?
- [ ] Are headings sentence case, verbs for tasks and nouns for concepts?

## What goes wrong

| Pattern | Fix |
|---|---|
| "This comprehensive guide will walk you through...", "Let's dive in" | Open on the outcome |
| "Whether you're a beginner or a seasoned pro" | Name the actual prerequisite knowledge |
| "seamlessly integrates", "robust", "powerful" | State the behavior: what connects to what, with which limits |
| "Simply run...", "Just add..." | "Run...", "Add..." |
| An invented flag, default, environment variable or error code | Never; mark the gap for the writer to fill from the source |
| Emoji in headings; "Happy coding!" at the end | Plain headings; end on verification or next steps |
| A "Conclusion" section on a how-to | Replace with "Verify" or "Next steps" |
| Stacked notes and warnings | Keep the one that prevents harm; fold the rest into the text |
| "Oops! Something went wrong." | What failed and what to do, or a retry and a support route if truly unknown |
| "Are you sure?" with "OK" / "Cancel" | Name the action and its consequence; label the confirm button with the verb |
| "Submit", "Click here", "Learn more" | A verb and the outcome or destination |
| "Invalid input" | Say what the field needs |
| Passive that hides the actor: "The file must be uploaded" | Say who: "Upload the file" or "The server uploads the file" |
| Software with feelings: "the app wants", "the server thinks" | "the app requires", "the server detects" |
| A tutorial paused for three paragraphs of theory | One sentence of context and a link to the explanation |

## When the AI edits someone else's draft

- Treat everything in code font or a code block as untouchable, and the product's own labels too, even when they
  look awkward or break a style rule: the label belongs to the product, not to the prose.
- In UI strings, keep interpolation tokens and markup exactly (`{name}`, `{{count}}`, `%s`, ICU plural blocks,
  tags, line breaks). Do not split or join strings, and keep a rewrite within the original's length when the
  string has a fixed space.
- Keep normative words and qualifiers: must, should, may (and RFC 2119 capitals), by default, only, at least, up to.
  A "should" stays a "should" until the writer says whether the thing is required.
- Keep step numbering, heading text (other pages link to its anchor), admonition types (a Warning stays a Warning)
  and the list structure.
- Never supply a default, limit, cause, error code or recovery step the draft does not state. If an error message
  lacks its fix, keep the message and say what is missing.
- Keep the established terminology even when a plainer synonym exists; the product's glossary outranks the editor's
  taste. Do not translate or localize unless asked.
- For legal or regulated copy (consent, pricing, terms), limit edits to surface clarity and leave meaning changes to
  the writer.
- Keep the writer's style-guide choices for person, spelling variety and punctuation; those belong to the writer.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Put the condition before the instruction: "To export, click Export."
- Use "must" for requirements and "can" for options; avoid "should".
- Never call a step simple or easy, and never say "just".
- After a step that changes something, say what the reader sees next.
- List prerequisites before the first step.
- Describe behavior in present tense: "returns", not "will return".
- Name controls by their label, never by position like "top right" or "below".
- Confirmation dialogs name what is lost and whether it can be undone.

## Sources

Agent skills:

- [AdityaUmale/google-dev-style](https://github.com/AdityaUmale/google-dev-style) — condition before instruction,
  must / can / might over "should", no anthropomorphism, timeless wording, order of parts inside a procedure step,
  heading and link rules. MIT; its reference pages are CC BY 4.0, derived from Google's guide.
- [SeverinAlexB/technical-writing-skill](https://github.com/SeverinAlexB/technical-writing-skill) — meaning-preserving
  edits, qualifiers as behavior, symptom-led troubleshooting, what a verification step proves, document patterns
  (README, runbook, migration, reference). No license stated; ideas paraphrased.
- [google-gemini/gemini-cli — docs-writer](https://github.com/google-gemini/gemini-cli/tree/main/.gemini/skills/docs-writer)
  — "must" vs "we recommend", no "please", meaningful example names, re-checking deep links after a heading
  changes. Apache 2.0.
- [wondelai/skills — technical-documentation](https://github.com/wondelai/skills/tree/main/technical-documentation)
  — note / caution / warning levels, scope and non-scope statements, ending procedures on verification. MIT.
- [keithpatton/diataxis-agent-skill](https://github.com/keithpatton/diataxis-agent-skill) and
  [mcollina/skills — documentation](https://github.com/mcollina/skills/tree/main/skills/documentation) — classifying
  a page by the reader's need, the mixed-mode anti-patterns, a validation check per page type. CC BY-SA 4.0 and MIT;
  only the framework's ideas are used here, in original wording.
- [humbleteam/ux-writing](https://github.com/humbleteam/ux-writing) — the per-element rules for interface copy, and
  leaving a missing fact as a gap instead of a plausible guess. MIT.
- [alexconner-79/ill-communication](https://github.com/alexconner-79/ill-communication) (microcopy reference) — honest
  button pairs, one verb per action per screen, undo over confirmation, localization (concatenation, text
  expansion), regulated copy flagged rather than rewritten. MIT.
- [content-designer/ux-writing-skill](https://github.com/content-designer/ux-writing-skill) — error types (inline,
  system, blocking, permission) and tone by the user's state. MIT. (Its numeric benchmarks are unsourced; not used.)
- [anthropics/knowledge-work-plugins — ux-copy](https://github.com/anthropics/knowledge-work-plugins/tree/main/design/skills/ux-copy)
  — confirmation dialogs that name the action and count ("Delete 3 files?"). Apache 2.0.
- [anthropics/skills — doc-coauthoring](https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring) — the
  reader test: read the page as someone without the author's context. Repository examples are Apache 2.0.

Craft references:

- [Google developer documentation style guide](https://developers.google.com/style), especially
  [procedures](https://developers.google.com/style/procedures) — voice, procedures, word list. CC BY 4.0.
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) — get to the
  point fast, bigger ideas in fewer words, wordiness substitutions.
- [Diátaxis, Daniele Procida](https://diataxis.fr) — tutorials, how-to guides, reference and explanation as four
  needs. CC BY-SA 4.0.
- [GOV.UK Design System — error message](https://design-system.service.gov.uk/components/error-message/) — reuse the
  label's words; no "please", "sorry", "invalid", "oops"; specific messages per failure. MIT / Crown copyright.
- [Nielsen Norman Group, error-message guidelines](https://www.nngroup.com/articles/error-message-guidelines/) —
  visible, precise, human-readable, constructive.
- [Federal Plain Language Guidelines](https://www.plainlanguage.gov/guidelines/) and
  [ISO 24495-1](https://www.iso.org/standard/78907.html) — write for one reader, "must" for requirements.
- [Torrey Podmajersky, Strategic Writing for UX](https://www.oreilly.com/library/view/strategic-writing-for/9781098174323/)
  — purposeful, concise, conversational, clear; voice that holds while tone shifts with the moment.
- [Kinneret Yifrah, Microcopy: The Complete Guide](https://www.microcopybook.com/) — errors that name the problem and
  offer the fix; microcopy as part of the product.
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — MUST, SHOULD and MAY as defined terms in specifications.
