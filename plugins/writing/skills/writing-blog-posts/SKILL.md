---
name: writing-blog-posts
description: >
  The craft of blog posts, written for readers on the open web who arrive from search, links and feeds:
  how-tos, tutorials, explainers, opinion posts, case studies, postmortems and announcements.
  Use when writing, editing or reviewing a blog post, a tutorial or how-to guide, a technical write-up, a
  postmortem or "how we built it" post, a listicle, a release or announcement post or a company blog article.
  Triggers include "blog post", "article", "tutorial", "how-to", "headline", "title", "subheadings", "intro",
  "code sample", "SEO", "listicle". For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Blog Posts

A blog post is read by someone who arrived with a question — from a search box, a link, a feed — and who scans
before committing: in Nielsen's study 79% of users scanned a new page and 16% read it word by word. They want the
answer, a reason to trust it, and the exact details they came for. What goes wrong most often is the walk to the
point: a paragraph on why the topic matters, a background section, a definition, and the payoff three screens down.

> Built from [claude-blog](https://github.com/AgriciDaniel/claude-blog), the [Karpathy article skill](https://github.com/IrtezaAsadRizvi/article-writing-skills/tree/main/andrej-karpathy), [technical-blog-engine](https://github.com/SkillMedev/skills/tree/main/skills/technical-blog-engine), [marketingskills](https://github.com/coreyhaines31/marketingskills) and [blog-post](https://github.com/AlemTuzlak/skills/tree/main/skills/blog-post), plus Google's people-first guidance, Nielsen Norman Group, Julia Evans, Pinker, Ann Handley and the Mailchimp style guide. Synthesized, not copied — sources at the end.

## The standards

1–4 are the core standards, the short list to hand a writer or a model. 5 onward extend them: they are
what a reviewer checks.

1. **Front-load: the reader decides in two sentences whether to stay.** Those two sentences say what the reader
   gets and start giving it.
2. **One idea per section, and a heading that says what the section claims rather than naming its topic.** Read
   alone, in order, the headings make the post's argument.
   - Before: "## Caching" → After: "## A 60-second cache took most of the load off the database"
3. **Keep code, commands and numbers exactly as written** — they are the reason someone found the post.
4. **Cut throat-clearing openers ("In this post, we will…") entirely.** The same goes for "Have you ever
   wondered…", "In today's fast-paced world" and the "Why this matters" section that comes before the thing.
5. **Make the title a promise the post keeps.** A specific payoff and nothing it doesn't deliver; Google's own
   checklist asks whether a title avoids "exaggerating or being shocking in nature".
   - Before: "The Ultimate Guide to Postgres Indexes" → After: "Why our new Postgres index made writes 4x slower"
6. **Open every section with its answer, then the support.** Readers land mid-post from a heading, a link or a
   search snippet, so each section has to pay off on its own.
7. **Put the information-carrying words first** in headings, list items and link text: scanners often take in
   only the first two words (NN/g).
   - Before: "- In order to avoid charging a customer twice, use an idempotency key"
   - After: "- Idempotency keys stop double charges"
8. **Write from what the writer did, built, measured or saw, and say so with the specifics** — version, date,
   setup. First-hand detail is the part a search summary can't replace, and it is what Google's people-first
   questions ask for.
9. **Lead with a realistic example, then the rule.** Toy examples (`foo`, `bar`, "Alice sends Bob a message") hide
   the case the reader actually has, and abstract-first explanations lose them before the example arrives
   (Julia Evans).
10. **Every code block runs as shown or says what it leaves out, and its output sits right under it.** Name the
    versions: tools change, and a how-to without versions rots without telling anyone.
11. **Name the source and date of every number that isn't the writer's own, in the sentence that uses it.** A number
    that can't be traced gets dropped, not softened into "studies show".
12. **Give the why with each what.** A step without its reason can't be adapted to the reader's case — "what"
    without "why" is one of Evans' patterns of confusing explanations.
13. **Pick one reader and hold their level.** Don't define "variable" and then use "idempotent" bare; when a term is
    needed, define it once, where it first appears (Pinker's curse of knowledge).
14. **Use lists for steps, options and parallel items, and paragraphs for reasoning.** A post that's all bullets has
    deleted every "because".
15. **Link text names the destination** ("the Postgres docs on partial indexes"), never "here", "this post" or
    "read more".
16. **Stop when the reader has what they came for:** the result, its caveats, one next step. No "In conclusion"
    recap, no "Thanks for reading!", no "Happy coding!".

## How a piece is built

**Before drafting.** Write down who arrives, from where, wanting what — the search query, or the question a
colleague would ask in chat. If that can't be written, the post has no reader yet. Name the one payoff in a
sentence, then write ten titles and keep the most specific (Corey Haines' rule; choosing usually sharpens the post
itself). Decide whether it is meant to be found or to be shared: a searchable post answers an existing question in
the searcher's words; a shareable one carries a claim or a finding people don't have yet. A post that is neither
shouldn't be written.

| Kind | Opens with | Body | Ends with | The trap |
|---|---|---|---|---|
| How-to, tutorial | the outcome and what you need (versions, prerequisites) | numbered steps, each with the command, its output and why | the working result, then the common failures | steps that only work on the author's machine |
| Explainer ("how X works") | the one-sentence answer | a realistic example, then the mechanism, then edge cases | where the explanation stops holding | starting with theory |
| Opinion, argument | the claim | reasons with evidence, the strongest objection (see `writing-essays`) | what the reader should do differently | a survey that decides nothing |
| Case study, postmortem, "how we built it" | the result or the failure, with numbers | context → what we tried → what happened → what we'd keep | lessons specific enough to copy | a victory lap with the dead ends cut out |
| Announcement, release post | what changed for the reader | how to use it, what breaks, how to migrate | where to start | "We're excited to announce" and features without consequences |
| List, roundup | the selection criterion | each item with a take | the one the author would pick | padding to a round number |

**Shape.** Title → two sentences (what you get, why trust this) → sections, each opening with its answer → result
and caveats → one next step. Flag breaking changes, deprecations and security fixes near the top of any release or
how-to post; they are the part readers most need and most often miss.

**Openings.**

| Opens well | Example |
|---|---|
| The result first | "Our CI went from 14 minutes to 3, and most of the gain was one cache key." |
| The reader's problem, then the answer | "If `npm install` hangs at `idealTree`, check the registry line in `.npmrc` first." |
| A finding | "Of 400 support tickets last quarter, 61 were the same error message." |

Opens badly: "In this post, we'll explore…", "Have you ever wondered…?", "X is a hot topic these days", or a
dictionary definition — each delays the answer and fits any post on any subject.

**Length, search and updates.** No target word count; Google says so outright ("No, we don't" have a preferred one).
For search, use the reader's own phrase in the title and first paragraph and a meta description that summarizes the
actual post; never stuff keywords or add an FAQ of questions nobody asked. When a post is updated, say what changed
and when, at the top, and never move the date without changing the content — Google lists that as a warning sign.

## The editing pass

- [ ] Read the title and the first two sentences alone: is the payoff clear, and does the text start delivering it?
- [ ] Read the headings alone, in order: do they make the argument? Is any "Introduction", "Background",
      "Overview" or "Conclusion" left?
- [ ] Each section's first sentence is its answer.
- [ ] Every code block and command comes from a run that worked, shows its output and names versions; nothing was
      retyped from memory.
- [ ] Every number is the writer's own measurement (and says so) or is sourced and dated in the same sentence.
- [ ] Each abstract claim has a realistic example close by.
- [ ] Terms above the chosen reader's level are defined once, at first use.
- [ ] "Simply", "just", "easily" and "obviously" are gone from instructions.
- [ ] Link text names destinations.
- [ ] Bullets hold parallel items; reasoning sits in paragraphs.
- [ ] The ending gives the result, the caveats, at most one next step and at most one call to action.
- [ ] The title promises nothing the post doesn't deliver.

## What goes wrong

| Pattern | Looks like | Fix |
|---|---|---|
| Throat-clearing | "In this post, we'll dive into…", "Have you ever wondered…?", "In today's fast-paced digital landscape…" | Delete down to the first sentence with information in it. |
| The detour | A "Why X matters" or history section before X | One sentence of why, inside the first section. |
| Topic headings | "Overview", "Key considerations", "Final thoughts" | A claim the section proves. |
| Double summary | A "Key Takeaways" box and a bulleted conclusion saying the same things | One summary at most, and only on long reference posts. |
| Weasel numbers | "Studies show 73% of developers…" | Name the study and the year, or drop the number. |
| Padded list | "15 tips" where five are real | Keep the real ones and retitle. |
| Toy example | `foo()`, `bar`, "Alice sends Bob a message" | The case from the writer's actual work. |
| Unrunnable code | A screenshot of code, a retyped command, a paraphrased error | Paste the exact text and its output. |
| Shame words | "Simply run…", "just add…" before the step that broke for someone | Delete the adverb. |
| FAQ for robots | "What is a database?" on a post about index tuning | Only questions real readers asked. |
| CTA sprawl | Subscribe, follow, share and book a demo | One ask, matched to the post. |
| AI tells | "unlock", "seamless", "robust", "game-changer", "leverage"; "The result? 3x faster."; "Happy coding!" and a rocket emoji | The plain word, a normal sentence, and stop at the last fact. |

## When the AI edits someone else's draft

- **Code is not prose.** Code blocks, inline code, commands, flags, file paths, config keys, error messages and URLs
  come back byte for byte — no renamed variables, no "fixed" commands, no reformatting, no translated comments —
  unless the note is about that code, and then only the change it asks for.
- **Numbers stay as measured.** Don't round, convert units or recompute; don't turn "in our tests" into "always",
  or a range into a single figure.
- **The Markdown stays.** Heading levels, list type and numbering, code-fence language tags, link targets, image
  alt text, tables and frontmatter keep their form. A rewritten heading keeps its level.
- **No new facts.** No links, sources, statistics, product names, version numbers or calls to action that the
  draft didn't already have.
- **Keep the writer's names for things.** One name per product, feature or command, the writer's, used every time;
  no synonym cycling for variety.
- **Keep the writer's examples and anecdotes.** A case from their own work beats anything the model can supply.
- **Add no scaffolding.** No lead-in ("Let's look at…"), no section summary, no emoji, no sign-off inside a
  rewritten passage.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Show the output under every code block.
- Name the source and year of every number that isn't mine.
- Give a real example before the general rule.
- State the version of every tool I mention.
- Never call a step simple or easy; let the reader judge.
- Link text says where it goes; never "here" or "this post".
- Define each term once, the first time it appears.
- End with the result and one next step, never a recap.

## Sources

Agent skills:

- [claude-blog](https://github.com/AgriciDaniel/claude-blog), `skills/blog-write` — answer-first sections, a source
  record for every public statistic (date, publisher, retrievable link), drop what can't be verified, descriptive
  anchor text. MIT. Weak where it turns SEO into quotas: 2–4 charts and 3–5 images per post, a Key Takeaways box
  and a bulleted conclusion by default.
- [Karpathy article skill](https://github.com/IrtezaAsadRizvi/article-writing-skills/tree/main/andrej-karpathy)
  (IrtezaAsadRizvi/article-writing-skills) — a real artifact at the center, exact numbers instead of adjectives,
  results embedded where they happen, no recap and no "Thanks for reading!". MIT.
- [technical-blog-engine](https://github.com/SkillMedev/skills/tree/main/skills/technical-blog-engine) — every
  snippet runs as shown or states what's elided, show the output, reproducible from the post alone. MIT.
- [content-strategy](https://github.com/coreyhaines31/marketingskills/tree/main/skills/content-strategy) and
  [copy-editing](https://github.com/coreyhaines31/marketingskills/tree/main/skills/copy-editing)
  (coreyhaines31/marketingskills) — searchable versus shareable, ten titles before drafting, the "prove it" and
  "specificity" sweeps. MIT.
- [blog-post](https://github.com/AlemTuzlak/skills/tree/main/skills/blog-post) (AlemTuzlak/skills) — post types
  (announcement, deep dive, problem and solution), flagging breaking changes before writing. No license stated.

Craft references:

- Google Search Central, [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
  — title questions, first-hand expertise, no preferred word count, don't fake freshness. CC BY 4.0.
- Nielsen Norman Group, [How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/)
  (1997) and [First 2 Words: A Signal for the Scanning Eye](https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/)
  — scanning, and front-loading headings, list items and links.
- Julia Evans, [Patterns in confusing explanations](https://jvns.ca/blog/confusing-explanations/) — unrealistic
  examples, starting abstract, inconsistent expectations of the reader, "what" without "why".
- Julia Evans, [Some blogging myths](https://jvns.ca/blog/2023/06/05/some-blogging-myths/) — details and versions
  change, so current specifics are worth writing; personal stories are valuable.
- Steven Pinker, [*The Sense of Style*](https://www.goodreads.com/en/book/show/20821371-the-sense-of-style) —
  metadiscourse and the curse of knowledge. Book.
- Ann Handley, [*Everybody Writes*](https://annhandley.com/everybodywrites/) — the point first, one reader, the ugly
  first draft. Book.
- Mailchimp Content Style Guide, [How to Write Educational Content](https://github.com/mailchimp/content-style-guide/blob/master/08-writing-educational-content.html.md)
  — stay on the topic the title promised; short, descriptive, parallel headlines. CC BY-NC 4.0.
