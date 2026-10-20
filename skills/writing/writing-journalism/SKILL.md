---
name: writing-journalism
description: >
  The craft of journalism: reported writing that tells readers what happened, who says so and how anyone
  knows, in hard news, features, profiles, explainers, investigations and labeled analysis.
  Use when writing, editing or reviewing news stories, ledes, nut grafs, features, profiles, explainers,
  investigative pieces, analysis and columns, headlines and decks.
  Triggers include news story, lede, lead, nut graf, inverted pyramid, kicker, attribution, sourcing,
  anonymous source, AP style, headline, dek, feature, profile, explainer. For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Journalism

People read journalism to learn what happened, to whom, and how sure anyone can be about it. They need the news
first, the source of every fact within the same sentence, and words that take no side the reporting has not
earned. What goes wrong most often is an edit that makes a sentence smoother by making it less true: a dropped
"police said", a quote tightened inside its marks, an "alleged" cut as filler.

> Built from [jamditis/claude-skills-journalism](https://github.com/jamditis/claude-skills-journalism), [alfadur7's journalism-writing](https://github.com/alfadur7/llm-wiki-newsroom/tree/main/.claude/skills/journalism-writing), the [AP Stylebook](https://www.apstylebook.com/), the [Reuters Handbook](https://www.mediareform.org.uk/wp-content/uploads/2015/12/Reuters_Handbook_of_Journalism.pdf), the [SPJ Code](https://spj.org/spj-code-of-ethics/), Kovach & Rosenstiel and [Poynter's nut-graf teaching](https://www.poynter.org/archive/2003/the-nut-graf-part-i/). Synthesized, not copied — sources at the end.

## The standards

1–4 are the core standards, the short list to hand a writer or a model. 5 onward extend them: they are
what a reviewer checks.

1. **Every claim that is not observed fact carries its source in the sentence that makes it.** A reader
   should never have to guess who is vouching for a sentence. "The plant will close in March, cutting 400 jobs."
   → "The plant will close in March, cutting 400 jobs, the company said in a filing Tuesday."
2. **Quotation marks are a promise of exact words.** Never tighten, merge, correct or paraphrase inside
   them. If a quote rambles, paraphrase outside the marks and keep the attribution. Quote when the words
   themselves matter (a vow, an admission, a turn of phrase); paraphrase information.
3. **The lede says what happened, in one sentence of about 35 words or fewer.** Newest, most
   consequential fact; who, what, when, where up front; why and how as soon as known. "The city council, which
   has debated the issue for months and heard from dozens of residents, voted Tuesday night to approve a zoning
   change allowing high-rise buildings downtown." → "The city council approved high-rise buildings downtown
   Tuesday, ending months of debate."
4. **"Said" is the default verb.** "Announced" fits an announcement. "Claimed", "admitted",
   "conceded", "insisted", "slammed" deliver a verdict the reporter has not shown. Use "according to" for
   documents and data; people "said".
5. **A source's description is its basis for knowing, not its rank.** "A senior source" → "an official who
   attended the meeting". An unnamed source gets a reason for anonymity in the story, and is never promoted:
   one source does not become "sources". Anonymous sources are the weakest kind (Reuters); use them for
   information, never for opinion or speculation (AP).
6. **Keep the levels of certainty apart.** What the reporter saw, what a record shows, what someone said and what
   someone alleges are four different sentences. Legal words are exact: charged is not convicted, accused is not
   guilty, a suspect is not the perpetrator, and "police said" never quietly becomes fact.
7. **Anyone accused or criticized gets a response, or the story says they did not give one.** "Did not respond
   to requests for comment" and "declined to comment" are different facts; never swap one for the other.
8. **A number needs its base and its period.** Give the rate with the count when scale differs, the total behind a
   percentage, and the time span. The gap between two percentages is in percentage points: 10% to 15% is a
   5-point rise, a 50% increase.
9. **Context is part of accuracy.** Say whether 400 jobs is a lot here, what changed since last year, what the
   rule was before. Background goes after the reader knows why it matters, never before the news.
10. **Specific beats general.** Name the agency, the street, the dollar amount, the day. "Officials" → which
    officials. A vague subject is usually a sourcing gap, not a style choice.
11. **Judging adjectives are opinion in disguise.** "Controversial", "shocking", "embattled", "landmark",
    "historic" assert what the facts should show. Replace each with the fact that earned it: "controversial
    bill" → "a bill that drew 2,000 public comments, most opposed".
12. **Short paragraphs, one idea each.** News paragraphs run one to three sentences: readers scan, and editors cut
    from the bottom, so each paragraph must survive without the next one.
13. **Time is exact.** The day of the week within seven days either side of publication, the date beyond that
    (AP); never "recently", "this week" or "yesterday" in copy that publishes later than it was written.
14. **The headline and lede promise only what the body proves.** The SPJ Code holds headlines, teases and
    summaries to the same accuracy as the story; an edit to a lede re-checks it against the body.
15. **Opinion is labeled.** In news copy, interpretation belongs to a named source; in analysis and columns, the
    writer's view is signposted and still built on reported fact.

## How a piece is built

**Before drafting.** Write the news in one sentence: what happened, to whom, what changes. Sort every fact by its
source (observed, document, on record, background) and mark what is unconfirmed. List who must be asked to respond.
If the one sentence will not come, the reporting is not finished, and no structure will fix that.

| Kind | Shape | Opens with | Closes with |
|---|---|---|---|
| Hard news | Inverted pyramid: lede, impact, best quote by graf 3–4, supporting facts in descending importance, background last | Summary lede: the news, attributed | The last useful fact; no summary |
| News feature | Wall Street Journal formula: anecdote, nut graf, body alternating evidence and counter-evidence, kicker | A specific person or scene that stands for the trend | A kicker: a scene, quote or fact that circles back |
| Profile | Scene, the angle on the person, life told through that angle, the person in action | The subject doing something revealing | Character shown, not summarized |
| Explainer | Question, short answer, why it matters, how it works, what is unknown, what to watch | The question readers are asking, answered in two sentences | What would change the answer |
| Investigation | Finding, how we know, stakes, evidence strongest first, responses, methodology | The finding, stated as plainly as the evidence allows | Response or open question; a methods note |
| Analysis / column | Argument built on reported facts, labeled as such | The claim, with the fact that provokes it | The consequence of the argument |

**The nut graf.** In anything that does not open on the news, a paragraph by the third or fourth says what the story
is about, why it matters, and why now. Ken Wells of the Journal called it the paragraph that says what the whole
story is about and why you should read it. A feature without one is a scene in search of a point.

**Ledes to use with care.** A question lede makes the reader do the reporter's work. A quote lede hands the opening
to someone else. A weather or "it was a day like any other" lede delays the news for atmosphere. A lede that stacks
three subordinate clauses before its verb is two ledes; cut to the one that is news.

**Endings.** News ends where the useful facts end, because the bottom will be cut. A feature ends on a kicker that
earns its place with material, not a moral: "As the debate continues, one thing is clear" is never a kicker.

**Headline and dek.** Present tense for past events, active verb, no claim the body does not support; the dek adds
the second fact, not a restatement.

## The editing pass

- [ ] After the lede alone, can a reader repeat the news? Is it under about 35 words?
- [ ] Does every factual sentence name its source, inside the sentence? No "experts say", "critics argue".
- [ ] Does every quote match the notes or recording, with ellipses and brackets used honestly and no two quotes
      merged into one?
- [ ] Are attribution verbs neutral, and does "according to" refer to documents rather than people?
- [ ] Are names, titles, ages, spellings, figures and dates checked against the source material, and the math
      redone (percentages, sums, per-capita rates)?
- [ ] Is each unnamed source described by access, with the reason for anonymity given?
- [ ] Are legal and certainty words exact: alleged, accused, charged, convicted, suspect?
- [ ] Has everyone criticized been given a response, or a sentence saying they did not respond or declined?
- [ ] In a feature, does a nut graf arrive by the fourth paragraph?
- [ ] Has each judging adjective been replaced by the fact behind it?
- [ ] Does the headline promise only what the body proves?
- [ ] Are time elements exact, and is background placed after the news?

## What goes wrong

| Pattern | Fix |
|---|---|
| "In a move that sent shockwaves through the industry..." | State the move and who reacted, with names |
| "sparked outrage", "drew backlash", "amid growing concerns" | Count it or quote it: who objected, how many, where |
| "Critics say", "experts warn", "observers note" | Name the critic and their stake, or cut the claim |
| "raises questions about", "it remains to be seen", "only time will tell" | Say the question and who is asking it, or end on the last fact |
| "slammed", "blasted", "hit back" | "said", "criticized", with the words quoted |
| "The move comes as..." stapled to every story | Give the context as its own attributed fact, after the news |
| A closing moral: "one thing is clear", "the stakes have never been higher" | End on a fact, a scene or a quote |
| A paraphrase followed by a quote that says the same thing | Keep one; the quote only if its wording adds something |
| "landmark", "historic", "unprecedented" in the reporter's voice | Attribute the judgment, or give the record it breaks |
| Three tidy reasons in a row where the reporting found two | Report what was found; lists follow the facts |
| Background paragraphs before the news ("Founded in 1987, the company...") | Move them below the paragraph that explains why they matter |
| A lede that opens with a time, a place or a dependent clause | Open on the actor and the action |
| "Speaking exclusively to...", "In an interview with this outlet" | "said in an interview" once, after the quote |

## When the AI edits someone else's draft

- Never change anything inside quotation marks: not a word, a typo, a bracket or an ellipsis. If the
  passage is mostly quote, edit only the words around it, or leave it and say why.
- Never drop, weaken or move an attribution. "Police said" stays attached to the clause it covers; moving it to
  the next sentence changes what it vouches for.
- Never add a fact, name, title, number, date, context line or response that is not in the draft. When a note
  asks for something the draft does not contain, keep the original wording and say what is missing; a plausible
  invented detail in a news story is a correction waiting to run.
- Keep certainty and legal wording exactly: alleged, accused, charged, suspect, according to, said in a statement,
  did not respond, declined to comment.
- Keep the writer's house style (AP, Chicago or the outlet's own): second references, title capitalization,
  numerals, datelines. Do not convert one style into another unless asked.
- Keep paragraph breaks. In news a paragraph is a unit an editor can cut; merging two to "improve flow" breaks that.
- A shortened lede still carries the who, what and when the original had. Shorter is not better if the news left.
- Add no adjectives and no framing sentences that tell the reader what to think.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Keep the lede to one sentence of 35 words or fewer.
- Put the nut graf by the fourth paragraph: what this is about and why now.
- Say how an unnamed source knows, and why they were not named.
- Give every number its base: a count with its rate, a change with its period.
- Write "charged" or "accused" until a court rules; never imply guilt.
- Anyone criticized gets a response, or the story says they did not reply.
- Replace judging adjectives like "controversial" with the fact behind them.
- Pin every event to a day or a date, never "recently" or "this week".

## Sources

Agent skills:

- [jamditis/claude-skills-journalism — newsroom-style](https://github.com/jamditis/claude-skills-journalism/tree/master/journalism-core/skills/newsroom-style)
  — "said" over "stated", the 35-word lede, short paragraphs, the pre-publication checklist. MIT.
- [jamditis/claude-skills-journalism — fact-check-workflow](https://github.com/jamditis/claude-skills-journalism/tree/master/journalism-core/skills/fact-check-workflow)
  — which claims to check (facts, numbers, quotes, causal claims), primary sources first, right of response. MIT.
- [jamditis/claude-skills-journalism — interview-prep](https://github.com/jamditis/claude-skills-journalism/tree/master/journalism-core/skills/interview-prep)
  — the levels of attribution (on the record, background, deep background, off the record). MIT.
- [jamditis/claude-skills-journalism — data-journalism](https://github.com/jamditis/claude-skills-journalism/tree/master/journalism-core/skills/data-journalism)
  — counts with rates or denominators, comparable periods, language that matches evidence strength. MIT.
- [jamditis/claude-skills-journalism — ai-writing-detox](https://github.com/jamditis/claude-skills-journalism/tree/master/journalism-core/skills/ai-writing-detox)
  — starting list of AI phrasing in news copy, reworked here into journalism-specific pairs. MIT.
- [alfadur7/llm-wiki-newsroom — journalism-writing](https://github.com/alfadur7/llm-wiki-newsroom/tree/main/.claude/skills/journalism-writing)
  — lede / nut graf / kicker roles with good and bad examples, the explainer's how-and-why, due impartiality.
  MIT (license file inherited from SamurAIGPT).

Craft references:

- [AP Stylebook](https://www.apstylebook.com/) and its [2024 guidance on "said"](https://x.com/APStylebook/status/1777683254323085501)
  — neutral attribution verbs; numerals, dates and days of the week.
- [AP Statement of News Values and Principles](https://accountablejournalism.org/ethics-codes/news-values-and-principles)
  — conditions for anonymous material (information, not opinion; vital; unavailable otherwise) and explaining why.
- [Reuters Handbook of Journalism](https://www.mediareform.org.uk/wp-content/uploads/2015/12/Reuters_Handbook_of_Journalism.pdf)
  (copy hosted by the Media Reform Coalition) — anonymous sources as the weakest; describe sources as fully as possible.
- [SPJ Code of Ethics](https://spj.org/spj-code-of-ethics/) — provide context; headlines and teases must not
  misrepresent or oversimplify; label advocacy and commentary.
- [Kovach & Rosenstiel, The Elements of Journalism](https://niemanreports.org/the-essence-of-journalism-is-a-discipline-of-verifications/)
  — the discipline of verification: never add anything that was not there, never deceive the audience.
- [Chip Scanlan, "The nut graf", Poynter](https://www.poynter.org/archive/2003/the-nut-graf-part-i/) and
  [Nieman Storyboard on nut grafs](https://niemanstoryboard.org/stories/nut-grafs-overused-misused-or-merely-misunderstood/)
  — the Wall Street Journal formula and what a nut graf owes the reader.
- [Nielsen Norman Group, "Inverted Pyramid"](https://www.nngroup.com/articles/inverted-pyramid/) — why the
  conclusion goes first for readers who stop early.
- [BBC Editorial Guidelines: accuracy](https://www.bbc.com/editorialguidelines/guidelines/accuracy) — due accuracy,
  honesty about what is not known, due impartiality.
