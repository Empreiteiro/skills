---
name: writing-academic-research
description: >
  The craft of academic and research writing: scholarly prose that argues from evidence for readers who will
  check it.
  Use when writing, editing or reviewing journal articles, conference papers, abstracts, literature reviews,
  methods, results and discussion sections, theses, specific-aims pages and responses to reviewers.
  Triggers include research paper, abstract, IMRaD, literature review, thesis, citation, hedging, claim
  strength, peer review, rebuttal. For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Academic & Research

Academic readers are specialists who read skeptically and in a hurry: title, abstract, figures, introduction, and
the rest only if those earned it. They need the contribution stated early, every claim tied to evidence of matching
strength, and terms that mean the same thing on page twenty as on page two. What goes wrong most often is polish
that changes the science: a "suggests" promoted to "shows", a hedge cut as filler, a synonym that quietly turns one
variable into two.

> Built from [K-Dense's scientific-writing](https://github.com/K-Dense-AI/scientific-agent-skills/tree/main/skills/scientific-writing), [econ-write](https://github.com/hanlulong/econ-writing-skill), [Orchestra's ml-paper-writing](https://github.com/Orchestra-Research/AI-Research-SKILLs/tree/main/20-ml-paper-writing/ml-paper-writing), [academic-research-skills](https://github.com/Imbad0202/academic-research-skills), [writing-in-the-sciences](https://github.com/jingkarqi/writing-in-the-sciences-skill), Gopen & Swan, Williams & Bizup and Helen Sword. Synthesized, not copied — sources at the end.

## The standards

1–4 are the core standards, the short list to hand a writer or a model. 5 onward extend them: they are
what a reviewer checks.

1. **A claim is as strong as its evidence, and no stronger.** Verbs form a ladder: "demonstrates"
   (a design that tests it) > "indicates" > "suggests" > "is consistent with". Association is not causation, and a
   non-significant result is not evidence of no effect. "Screen time causes poor sleep" from survey data →
   "Screen time is associated with poor sleep".
2. **Citations, figure references and numbers are fixed points.** That includes where a citation sits: it
   supports the clause it is attached to, and moving it to the end of the sentence widens what it vouches for.
3. **One concept, one term.** "Participants", "subjects" and "respondents" in one paragraph read as three
   groups. Define an abbreviation at first use, and again in the abstract, which is read on its own.
4. **Hedging is calibration.** Keep one hedge per uncertain claim; cut only stacks ("may possibly
   suggest" → "suggests"). Removing every hedge overclaims; hedging everything says nothing.
5. **State the contribution in one sentence, and put it where a skimmer finds it**: the end of the introduction at
   the latest. A paper whose contribution cannot fit in one sentence has a problem prose will not fix.
6. **Say what was found, not what was looked at.** "This paper examines the relationship between rainfall and
   yield" → "Yield falls once rainfall exceeds 900 mm a season." Topic sentences that announce a topic are
   placeholders for the finding.
7. **Characters as subjects, actions as verbs.** Nominalizations hide who did what (Williams; Sword calls them zombie
   nouns). "The measurement of absorption was carried out by the team" → "The team measured absorption". Tables
   and figures can be subjects: "Table 2 shows".
8. **Old information first, new information last.** Open a sentence with what the reader already has, end on the
   new or emphatic point, and keep subject and verb close together (Gopen & Swan). A twenty-word clause between a
   subject and its verb makes the reader hold the subject in the air.
9. **A paragraph makes one claim and states it first.** Evidence and reasoning follow; the last sentence lands the
   point or hands off to the next. Read in sequence, the first sentences of a section should outline its argument.
10. **Synthesize the literature by question, not by author.** "Smith (2019) found... Jones (2020) found..." →
    group studies by what they show and where they disagree. A gap is a specific question existing work fails to
    answer, and why; "no one has studied X" is not one.
11. **Results report; the discussion interprets.** Lead a results paragraph with its take-home message, then cite
    the table or figure; never narrate a table cell by cell. The discussion opens by answering the question the
    introduction asked.
12. **A number travels with what is needed to judge it.** Effect size with its interval, n, units, and the
    comparison that gives it scale. "Significant" means statistically significant and nothing else; for the other
    sense, write "large" or "important" and say why.
13. **Limitations are specific.** Name the bias, the population or measure it affects, and the direction it pushes
    the estimate. "This study has several limitations" says nothing; neither does closing on "more research is
    needed" without naming the study.
14. **Figures and tables stand alone.** A caption says what to see, defines abbreviations and states n and what the
    error bars are; a reader who skips the text should still get the point.
15. **Tense follows the claim.** Past for what was done and found in this study; present for established knowledge
    and for what a table or figure shows.
16. **Signpost only where it helps.** A roadmap sentence closing the introduction is standard; "In this section, we
    will discuss" anywhere else is a sentence about the paper instead of the paper.

## How a piece is built

**Before drafting.** Write the contribution sentence. Map claims to evidence: every claim, the result or source that
supports it, and how strong that support is. Unsupported claims go on a list of open questions, not into prose.
Check the venue: word limit, abstract format, citation style, and the reporting guideline for the design (CONSORT for
trials, PRISMA for systematic reviews, STROBE for observational studies; see the EQUATOR Network).

**Writing order for empirical work** (Sainani): figures and tables, results, methods, introduction, discussion,
abstract last, because the abstract must match a finished paper.

| Kind | Shape | Opens with | Closes with |
|---|---|---|---|
| Empirical paper (IMRaD) | Introduction, methods, results, discussion | The specific problem and why current answers fail | The answer and its consequence, bounded by the design |
| Humanities / theory article | Problem, the conversation it enters, the claim, sections that each advance it, strongest counterargument | The puzzle or tension in the material | What the claim changes in how the field reads its object |
| Literature review | Question, how sources were chosen, synthesis by theme or tension, gaps, agenda | The question the review answers | A research agenda specific enough to act on |
| Abstract | What was achieved; why it is hard or matters; how; the evidence; the key result (Farquhar), or the venue's structured headings | The finding, not the field's importance | The implication, within the evidence |
| Thesis / dissertation | Framing chapter, chapters that work as papers, a conclusion that synthesizes across them | The question the whole thesis answers | What the chapters establish together that none does alone |
| Specific aims (grant) | Gap, long-term goal, objective, hypothesis, two or three aims, expected payoff | The problem and the cost of not solving it | What will be known when the aims are met |
| Response to reviewers | Each comment quoted, then the response, then the change with its location | Thanks once, then point one | A summary of substantive changes |

**The introduction** moves from known to unknown to question: what the field knows (and), what it cannot yet
explain (but), what this study does about it (therefore). Two to five paragraphs in most empirical venues; results
and broad implications stay out.

**The discussion** answers the question first, then places the answer against prior work (agreement and conflict),
offers the interpretation or mechanism, gives specific limitations, and ends on the main finding and what it
implies. It does not open with limitations.

**First and last sentences.** If an opening sentence could open any paper in the field ("X has attracted increasing
attention in recent years"), delete it and start with the next one. If a closing sentence could close any paper,
replace it with this paper's result.

## The editing pass

- [ ] Can the contribution be found in one sentence by the end of the introduction, and does the abstract say the
      same thing, with the same numbers, as the body?
- [ ] Does each claim's verb match the design behind it, with causal language only where the design is causal?
- [ ] Does every citation still sit on the clause it supports, and has none been added, dropped or reformatted?
- [ ] Is every number, unit, symbol, p-value, interval and n identical to the source text?
- [ ] Is each key term used in a single form, with abbreviations defined at first use in body and abstract?
- [ ] Have nominalizations been turned into verbs wherever the actor is known?
- [ ] Does each paragraph open with its claim, and do the opening sentences outline the section?
- [ ] Does the literature review group work by finding rather than list it by author?
- [ ] Is the results section free of interpretation, and does the discussion open with the answer?
- [ ] Are limitations specific, with the direction of their bias?
- [ ] Is there one hedge per uncertain claim: none stacked, none removed from a claim that needs it?
- [ ] Do figure and table captions stand alone?
- [ ] Is "significant" used only in its statistical sense?

## What goes wrong

| Pattern | Fix |
|---|---|
| "In recent years, X has attracted increasing attention" | Open on the specific problem this paper addresses |
| "This study delves into / sheds light on / paves the way for" | Say what the study found |
| "plays a crucial / pivotal / key role in" | Name the role and its size |
| "Furthermore... Moreover... Additionally..." opening every sentence | Let the logic carry the link; repeat the key term instead |
| "a novel, comprehensive, robust framework" | Describe what it does; keep "robust" for its statistical meaning |
| A citation produced to support a sentence ("(Smith et al., 2021)") | Never; flag the unsupported claim for the author |
| Every claim hedged, or none | One calibrated hedge where the evidence is uncertain |
| Synonyms rotated for elegance ("learners", "students", "pupils") | One term per construct |
| Every section built as topic sentence, three points, synthesis | Let content set the shape; two points are fine |
| "Author (2019) argued... Author (2020) argued..." | Group by finding; show the disagreement |
| "No previous study has examined X" as the gap | Say why existing answers fail for this question |
| "significant" meaning important | "statistically significant", or "large" with the comparison |
| Results paragraphs that read the table aloud | The pattern first, then the table reference |
| "In conclusion, this study highlights the importance of..." | End on this paper's result and its consequence |
| "This shows that..." with no noun after "this" | "This difference shows..." |

## When the AI edits someone else's draft

- Never add, remove, reorder, reformat or move a citation, and keep markup intact byte for byte: `\cite{}`,
  `\ref{}`, footnote markers, cross-references, equations, reference-manager fields.
- Never change a number, unit, symbol or statistic, and never round or convert one. If a note asks for a claim the
  numbers do not support, keep the numbers and flag the claim.
- Keep each claim's strength. Tightening a verb is how "is associated with" becomes "drives"; a stronger verb needs
  the writer's decision, not an edit.
- Keep defined terms and abbreviations exactly as the draft defines them, including terms of art that look like
  jargon ("statistically significant", "robust standard errors", "hegemony"): do not swap in a plainer word.
- Keep quoted sources verbatim, with their spelling and emphasis.
- Do not add transitions that assert a relation the draft did not ("therefore" where the original only placed two
  findings side by side), and do not add limitations, implications or literature.
- Keep the writer's conventions for person and voice, citation style, spelling variety and section tense; those are
  the writer's or the venue's, not the editor's.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- State the contribution in one sentence by the end of the introduction.
- Open each paragraph with its claim; the evidence follows.
- Organize the literature by question, not by author.
- Say "significant" only for statistical significance.
- Name each limitation and the direction it biases the result.
- Keep interpretation out of Results; open the Discussion with the answer.
- Prefer verbs to nominalizations: "X reduces Y", not "a reduction in Y by X".
- Delete any opening sentence that could start a paper in another field.

## Sources

Agent skills:

- [K-Dense-AI/scientific-agent-skills — scientific-writing](https://github.com/K-Dense-AI/scientific-agent-skills/tree/main/skills/scientific-writing)
  (formerly claude-scientific-skills) — the no-fabrication list, scientific fidelity (association vs causation,
  non-significance vs equivalence), observation vs interpretation, concrete limitations. MIT.
- [hanlulong/econ-writing-skill (econ-write)](https://github.com/hanlulong/econ-writing-skill) — "say what you find,
  not what you look for", phrases to delete, economic vs statistical significance, null results, the naked "this".
  The best-sourced single-discipline skill found. MIT.
- [Orchestra-Research/AI-Research-SKILLs — ml-paper-writing](https://github.com/Orchestra-Research/AI-Research-SKILLs/tree/main/20-ml-paper-writing/ml-paper-writing)
  — the one-sentence contribution (Nanda), Farquhar's abstract, Gopen & Swan in table form, deleting a generic first
  sentence, self-contained captions. MIT.
- [Imbad0202/academic-research-skills — academic-paper](https://github.com/Imbad0202/academic-research-skills/tree/main/academic-paper)
  — synonym cycling, the roadmap-sentence exception, mirror structure, abbreviations defined per scope, scope creep
  in revision. CC BY-NC 4.0; ideas paraphrased, no text reused.
- [jingkarqi/writing-in-the-sciences-skill](https://github.com/jingkarqi/writing-in-the-sciences-skill) — Sainani's
  writing order, results and discussion rules, "significant" reserved for statistics, tense by section. MIT.
- [jamditis/claude-skills-journalism — academic-writing](https://github.com/jamditis/claude-skills-journalism/tree/master/research-toolkit/skills/academic-writing)
  — tense by section, introduction and discussion funnels, the reviewer-response format. MIT. (Its transition-word
  list encourages the "Furthermore/Moreover" pattern; not used.)
- [bethww/lit-review](https://github.com/bethww/lit-review) — the literature review as an argument, and "nobody has
  studied X" as a false gap. MIT.
- [kangning-huang/science_narrative_skills](https://github.com/kangning-huang/science_narrative_skills) — the
  And-But-Therefore frame for introductions (from Randy Olson). No license stated; only the framework is used.

Craft references:

- [Gopen & Swan, "The Science of Scientific Writing"](https://www.usenix.org/sites/default/files/gopen_and_swan_science_of_scientific_writing.pdf)
  (American Scientist, 1990) — topic and stress positions, old before new, subject close to verb.
- [Williams & Bizup, Style: Lessons in Clarity and Grace](https://en.wikipedia.org/wiki/Style:_Lessons_in_Clarity_and_Grace)
  — characters as subjects, actions as verbs; old-to-new cohesion.
- [Helen Sword, "Zombie Nouns"](https://archive.nytimes.com/opinionator.blogs.nytimes.com/2012/07/23/zombie-nouns/)
  and *Stylish Academic Writing* (Harvard, 2012) — nominalizations, concrete language, humanities prose.
- [Kristin Sainani, Writing in the Sciences (Stanford)](https://online.stanford.edu/courses/som-y0010-writing-sciences)
  — writing order, one idea per paragraph, the manuscript sections.
- [Sebastian Farquhar, "How to write ML papers"](https://sebastianfarquhar.com/on-research/2024/11/04/how_to_write_ml_papers/)
  and [Neel Nanda's paper-writing advice](https://www.alignmentforum.org/posts/eJGptPbbFPZGLpjsp/highly-opinionated-advice-on-how-to-write-ml-papers)
  — the five-part abstract, the narrative a paper owes its reader.
- Graff & Birkenstein, *They Say / I Say* — stating the view a humanities argument answers before answering it.
- [EQUATOR Network](https://www.equator-network.org/) — reporting guidelines by study design (CONSORT, PRISMA,
  STROBE and others).
