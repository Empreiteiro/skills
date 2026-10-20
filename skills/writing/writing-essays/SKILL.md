---
name: writing-essays
description: >
  The craft of essays: prose that thinks one question through in one voice, in personal essays, idea and
  argument essays, critical essays, columns and op-eds.
  Use when writing, editing or reviewing a personal essay, an argumentative or idea essay, a review-essay, a
  column, an op-ed or a long Substack-style essay.
  Triggers include "essay", "personal essay", "op-ed", "column", "thesis", "argument", "counterargument",
  "hedging", "opening line", "ending". For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Essays

An essay's reader came to watch a mind work: to follow one person through a question to an answer neither of
them had at the start, in a voice they trust, with the specifics that make it believable. What goes wrong most
often is the school essay in adult clothes — the conclusion stated in paragraph one and defended for the rest —
or its mirror, the personal essay that tells what happened and never says what it meant.

> Built from [pg-writer](https://github.com/jaredpalmer/skills/tree/main/pg-writer), [riff](https://github.com/benjaroy/riff), [claude-writing-skills](https://github.com/nadiem99/claude-writing-skills), [essay-skills](https://github.com/clyderankin/essay-skills) and [op-ed-writer](https://github.com/SkillMedev/skills/tree/main/skills/op-ed-writer), plus Paul Graham, Orwell, Zinsser, Williams, Pinker, Lopate, Gornick and McPhee. Synthesized, not copied — sources at the end.

## The standards

1–4 are the core standards, the short list to hand a writer or a model. 5 onward extend them: they are
what a reviewer checks.

1. **Follow the argument, not the outline.** Each paragraph earns the next turn instead of announcing it. An essay
   is a search; of the places to go next, go to the most interesting one (Graham: "flow interesting"), and let the
   logic carry the transition rather than "Moreover".
2. **Cut hedges before adjectives** — "perhaps", "arguably", "somewhat" go first. Keep a hedge only where the writer
   is actually unsure, and then say it once, plainly ("I suspect", "I don't know yet"): Graham's warning is that
   "it's easy to make a statement correct by making it vague", and a vague claim teaches nothing.
3. **Keep the writer's own examples; never trade a specific one for a general one.** The particular case is the
   evidence and the voice at once.
4. **Never open with a question, and never close on one.** Open on a claim, a fact or a moment; close on a step.
5. **Work from a question and end somewhere the first paragraph didn't predict.** The question drives the essay
   but stays off the first line (standard 4). If the last paragraph could have been written before the first, the
   essay elaborated instead of thinking. A real turn changes the conclusion: it narrows a claim after an
   objection, or finds the case that flips the advice.
6. **Give every paragraph one new job.** Name each paragraph's job in five words; two paragraphs with the same job
   mean the essay is circling. One point made three times with three examples is the most common flaw in
   generated essays.
7. **Put a concrete case within two sentences of every general claim**, and the smallest case that shows it.
   - Before: "Institutions tend to resist change even when change is in their interest."
   - After: "The school kept the overhead projector for six years after every room had a screen. The projector was
     in the budget; the screen wasn't."
8. **Meet the strongest objection in the words a skeptic would actually use.** Concede what's true in it and come
   out with a narrower, sharper claim. An essay that never meets resistance reads as a sales pitch.
9. **Show, then tell.** After a scene, say what the writer makes of it; the reader came for the interpretation, not
   only the footage. In a personal essay keep Lopate's double perspective: the self who lived it, confused at the
   time, and the self who understands it now — both visible, never merged.
10. **Know the situation from the story.** Gornick: the situation is the circumstance; the story is "the insight,
    the wisdom, the thing one has come to say." Every paragraph of situation must serve the story, or it is
    travelogue.
11. **Hold the register.** A personal reckoning that slides into advice ("We all need to slow down") or into a
    pitch breaks the contract with the reader. If the register shifts, it shifts once and on purpose.
12. **Write sentences you could say out loud to a smart friend.** Short, common words ("use", not "utilize";
    "show", not "demonstrate"); Orwell's rule is to "let the meaning choose the word, and not the other way about."
13. **Make the characters the subjects and their actions the verbs** (Williams).
    - Before: "The implementation of the new policy resulted in a reduction in attendance."
    - After: "When the school enforced the policy, fewer students came."
14. **End each sentence on its new information.** Begin with what the reader already holds and finish on what's
    new; the end of a sentence is where the stress lands, so don't spend it on "in many cases".
15. **Keep an aphorism only if it predicts something.** A line that fits on a poster and claims nothing ("The tools
    don't create the gap. They reveal it.") gets cut. Most paragraphs should end on their reasoning, not a zinger.
16. **End by taking one more step.** A consequence, a narrower claim, what the writer will now do differently, or
    what is still unknown — never a recap and never a moral. Zinsser: "When you're ready to stop, stop."

## How a piece is built

**Before drafting.** Write the question in one sentence and the hunch in another; if you can't say what is
surprising about the topic, you aren't ready (pg-writer's test). Gather the writer's own material first (scenes,
cases, numbers, quotes they actually have), because the essay is built from those, never from invented ones.
Expect the plan to break: Graham's rule of thumb is that 80% of an essay's ideas arrive after you start writing,
and half of the ones you started with turn out wrong. Then decide which kind of essay this is; each opens and
ends differently.

| Kind | What it's for | How it moves | How it ends | What kills it |
|---|---|---|---|---|
| Idea or argument essay | Working out something most readers get wrong | question → hunch → cases → objection → revised claim | the consequence of the revised claim | thesis in sentence one, then defense |
| Personal essay | Making sense of an experience | scene → reflection → widening → the scene again, seen differently | what the writer understands now that they didn't then | situation without story; the lesson ending |
| Critical essay, review-essay | Reading a book, place, film or idea closely | the object → what it does → why that matters beyond it | the claim the reading earned | plot summary; adjectives standing in for evidence |
| Op-ed, column | Moving a reader on a live question in 600–800 words | news peg and thesis early → three or four reasons with evidence → strongest objection answered | what should change, and who should change it | equivocation; arguing three things at once |

**Two arcs cover most essays.** *Concrete → mechanism → implications*: a specific case, the system that explains
it, what it means for the reader's own decisions. *Question → attempt → resistance → better answer*: Montaigne's
shape and Graham's. Both end somewhere the opening only pointed toward.

**Openings.** McPhee: a lead is a promise, "a flashlight that shines down into the story" — if the essay won't be
like the lead, don't use the lead.

| Opens well | Shape |
|---|---|
| A specific moment | "The week my father sold the shop, he kept the scale." |
| A fact that doesn't fit | a number, a date or an anomaly the essay will spend itself explaining |
| A claim strong enough to be wrong | "Most advice about focus is advice about guilt." |

| Opens badly | Why |
|---|---|
| "Webster's defines nostalgia as…" | borrows authority instead of thinking |
| "Since the dawn of time…", "In today's world…" | fits any essay, so it says nothing about this one |
| "In this essay I will argue that…" | metadiscourse (Pinker): the reader wants the argument, not its table of contents |
| A rhetorical question | ruled out by standard 4 |

**Endings.** Zinsser's test: the ending takes the reader slightly by surprise and yet seems exactly right. Return to
the opening image only if the essay has changed how it looks. No "Ultimately", no "In the end, what matters is…",
no question.

**Length and title.** No fixed length (an op-ed runs 600–800 words, an online essay 800–3,000), and the essay stops
when the turn is made. Titles are short and plain and name the subject or the claim; a clever title that hides the
subject costs the reader a decision before they've read a word.

## The editing pass

- [ ] Write the essay's question and its answer in one sentence each. The answer is not sitting in paragraph one.
- [ ] List every paragraph's job in five words. No two match, and each leads to the next.
- [ ] Every general claim has a concrete case within two sentences.
- [ ] The strongest objection appears in a real skeptic's words, and the claim is sharper after it.
- [ ] Every "I think", "probably" or "I suspect" marks real uncertainty; "perhaps", "arguably", "somewhat" and
      "in many ways" are gone.
- [ ] Read the first and last sentences alone: the first places the reader or makes a claim; the last is not a
      question, a recap or a moral.
- [ ] Count the "not X but Y" reframes and the paragraph-closing zingers; keep only the one that earns its place.
- [ ] Every scene is followed by what the writer makes of it, and the then-self and now-self stay distinct.
- [ ] The register holds: no slide into advice, sermon or marketing.
- [ ] Nominalizations hiding an actor ("the implementation of", "a reduction in") are verbs again.
- [ ] Every quote and fact is checked and attributed in the sentence that uses it.
- [ ] Delete the first paragraph as a test. If the essay starts better at the second, keep it deleted.
- [ ] Read it aloud. Rewrite any sentence you wouldn't say.

## What goes wrong

| Pattern | Looks like | Fix |
|---|---|---|
| The school essay | "In this essay, I will argue…", three reasons, "In conclusion" | Start from the question; let the conclusion arrive late, and changed. |
| The survey | "There are many perspectives on remote work." | Pick the claim the writer would defend at dinner. |
| Both-sides balance | "On one hand… on the other hand…" | Take the side; say what would change the writer's mind. |
| Repetition as depth | One point, three examples, three paragraphs | One example, then what follows from it. |
| The fake turn | "But there's something deeper going on." | A turn changes the conclusion. If it doesn't, delete the announcement. |
| Straw negation | "It isn't a cost. It's a moat." — and nobody called it a cost | Negate only what real people believe; otherwise state the positive half. |
| Poster aphorism | "The map was never the territory. The territory was us." | Cut it, or replace it with what it predicts. |
| Staccato run | "Payroll. Compliance. Procurement." | One sentence that carries the logic. |
| The lesson ending | "So next time you rush, remember to breathe." | End on the last fact or the narrowed claim. |
| Coinage pile-up | Three newly named concepts in 1,500 words | Name one at most, and only after the idea has a shape. |
| Literary costume | "One might argue", stacked semicolons, "liminal", "palimpsest" | Say it the way the writer talks. |
| Diary, not essay | Events in order, no understanding | Find the story under the situation and tell it. |
| AI vocabulary | "delve", "tapestry", "a testament to", "navigating the complexities of", "in a world where" | The plain word, or nothing. |

## When the AI edits someone else's draft

- **Keep the stance.** Cutting a hedge or sharpening a verb is allowed; flipping, softening or widening the
  writer's claim is not. The essay's position belongs to the writer.
- **Supporting detail yes, new arguments no.** Take details only from the rest of the draft. Never invent an
  anecdote, a person, a quote, a number or a date to make a point land; if the passage needs a case the draft
  doesn't have, keep the writer's general sentence rather than fabricate a specific one.
- **Match the voice and the density around the passage.** Keep the writer's sentence lengths, odd words, dashes,
  semicolons, and any word from an AI-tells list that was theirs; those lists police the model, not the writer.
  A dense paragraph stays dense; a loose one stays loose.
- **Quotes are untouchable.** Text inside quotation marks, epigraphs, citations and footnote markers come back
  verbatim, spelling and punctuation included.
- **Keep tense and perspective.** A scene stays in the tense the writer chose, and the then-self is never
  rewritten with the now-self's knowledge.
- **Keep the paragraphing.** Don't split a long reasoning paragraph into one-liners or merge separate beats unless
  the note asks for it.
- **Fit the seams.** The rewrite's first sentence picks up from the sentence before the passage and its last
  hands off to the one after; no "Moreover" or summary line to stitch it in.
- **Add no ending.** A passage that closes a section gets no moral, recap or question it didn't have.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Follow every general claim with a concrete case within two sentences.
- Answer the strongest objection in the words a real skeptic would use.
- After a scene, say what it meant; never leave the reader to guess.
- Give each paragraph one job; if two share a job, cut one.
- Cut any line that would fit on a poster but predicts nothing.
- Let the conclusion be something the first paragraph didn't already say.
- End on one more step forward, never a recap or a moral.
- Never invent an anecdote or a number I didn't give you.

## Sources

Agent skills:

- [pg-writer](https://github.com/jaredpalmer/skills/tree/main/pg-writer) (jaredpalmer/skills) — the essay as a
  search, one new job per paragraph, the objection taken seriously, hedging as precision, and the sharpest list of
  how strong models fail now (paragraph-ending zingers, staccato runs, straw negation, poster aphorisms, thesis in
  sentence one). No license stated in the repo; paraphrased, short quotes only.
- [riff](https://github.com/benjaroy/riff) — `critique` (register breaks, structural fluff), `revise` ("supporting
  material yes, new thesis territory no"; the commonest revision failure is sanding down the best parts) and
  `base.md` (keep the writer's own words even when they are on the banned list). MIT.
- [claude-writing-skills](https://github.com/nadiem99/claude-writing-skills) — `coach` (structure before prose),
  `context/writing-principles.md` (concrete → mechanism → implications, close the loop) and the AI-tells checklist
  (repetition disguised as depth, both-sides balance). MIT. Not followed where it calls a sentence-initial "But" a
  grammatical error or bans every dash.
- [essay-skills](https://github.com/clyderankin/essay-skills) — the `revise` step: surgical edits to a pasted
  passage with the author's note, "match density", clearer without simpler. No license stated.
- [op-ed-writer](https://github.com/SkillMedev/skills/tree/main/skills/op-ed-writer) — the op-ed's shape: news
  peg, one contestable thesis, the counterargument paragraph. MIT.

Craft references:

- Paul Graham, [The Age of the Essay](https://paulgraham.com/essay.html) — the essay as an attempt; "flow
  interesting"; a real essay doesn't take a position and then defend it.
- Paul Graham, [Writing, Briefly](https://paulgraham.com/writing44.html) — 80% of the ideas arrive after you start;
  cut; write in a conversational tone.
- Paul Graham, [How to Write Usefully](https://paulgraham.com/useful.html) and
  [Write Simply](https://paulgraham.com/simply.html) — correct, important, new, and stated as strongly as it can be
  without becoming false; plain words.
- George Orwell, [Politics and the English Language](https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/)
  (1946) — the six rules; "let the meaning choose the word".
- William Zinsser, *On Writing Well* ([notes](https://sive.rs/book/OnWritingWell)) — clutter; the lead and the
  ending; "When you're ready to stop, stop." Book, quoted briefly.
- Joseph M. Williams and Joseph Bizup, [*Style: Lessons in Clarity and Grace*](https://goodreads.com/book/show/6966800.Style_Lessons_in_Clarity_and_Grace)
  — characters as subjects, actions as verbs, old before new, the stress position. Book.
- Steven Pinker, [*The Sense of Style*](https://www.goodreads.com/en/book/show/20821371-the-sense-of-style) —
  classic style, the curse of knowledge, metadiscourse. Book.
- Phillip Lopate, [*The Art of the Personal Essay*](https://www.goodreads.com/book/show/27432.The_Art_of_the_Personal_Essay),
  introduction — intimacy, conversation, honesty as the form's ethos. Book.
- Phillip Lopate, "Reflection and Retrospection" in *To Show and to Tell*, as discussed by
  [Rolf Potts](https://rolfpotts.com/reflection-and-retrospection-lopate/) — the double perspective; telling as
  thinking on the page.
- Vivian Gornick, [*The Situation and the Story*](https://www.goodreads.com/book/show/222070.The_Situation_and_the_Story)
  — situation versus story. Book, quoted briefly.
- John McPhee, [*Draft No. 4*](https://www.goodreads.com/work/quotes/25602290-draft-no-4-on-the-writing-process) —
  the lead as a promise and a flashlight. Book, quoted briefly.
