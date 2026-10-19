---
name: writing-business-legal
description: >
  The craft of business and legal writing, for documents read in order to decide, sign or fund: contracts,
  business documents (memos, reports, proposals, e-mails) and grant proposals.
  Use when writing, editing or reviewing a contract or clause, a legal memo or brief, a decision memo, report,
  status update, commercial proposal, business e-mail or grant application.
  Triggers include contract, clause, defined term, shall, legalese, memo, executive summary, pyramid principle,
  six-pager, proposal, RFP, grant, specific aims. For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Business & Legal

Readers of these documents are busy and some of them are adversarial: an executive deciding in a sentence
whether to keep reading, a review panel scoring fifteen proposals, a judge, a client, and the lawyer on the
other side reading to find the gap. They need the decision, the obligation and its conditions to be findable
and to mean one thing. What goes wrong most often is order and drift: the answer arrives on page two, behind
process narration and hedges, and a synonym somewhere makes one promise read as two.

> Built from [millwright-labs/minto-pyramid-skill](https://github.com/millwright-labs/minto-pyramid-skill), [kemalcanyapali/business-writing](https://github.com/kemalcanyapali/business-writing), [ngmeyer six-pager](https://github.com/ngmeyer/skills/blob/main/skills/productivity/six-pager/SKILL.md), [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal), legal skills from [Lawvable's list](https://github.com/lawve-ai/awesome-legal-skills), grant skills, and Adams, Garner, Minto, the Plain Language guidelines, Amazon's memo practice and NIH/NSF structure. Synthesized, not copied — sources at the end.

## The standards

1. **Answer first, with only the context that raises the question.** Minto's Situation–Complication–Question–
   Answer: one clause of what the reader already accepts, the thing that changed, then the answer. Before:
   *"We reviewed four suppliers, ran the pricing and called references... on balance we think Kestrel."*
   After: *"We should sign Kestrel: 18% cheaper, live in October instead of Q1, and both references praised
   the same thing."* Nothing added; the decision moved to word four.
2. **Reasons are the same kind of idea, and as many as the logic needs.** Two real reasons beat three where
   one is a detail in a reason's clothes. Order them on purpose: by time, by structure, or by importance.
   "There are three issues" says nothing; say what the issues mean together.
3. **Headings state findings.** "Churn doubled after the March price change," not "Churn analysis." A
   reader who skims only the headings should get the argument.
4. **Data replaces adjectives.** "Customers love the feature" → "41% of active accounts used it weekly in
   Q2." Weasel quantities ("significant", "nearly all", "various") either become a number or go.
5. **One word, one meaning.** Once a thing has a name, use that name every time; a variation invites the
   argument that a different word meant a different thing. Elegant variation is a fiction virtue and a
   contract defect (Adams).
6. **Each verb of obligation does one job.** In drafting: *shall* (or *must*) for a duty of the sentence's
   subject, *must* for a condition ("To exercise the option, the Buyer must give notice"), *may* for
   discretion, *shall not* for prohibition, plain present tense for facts and policy ("This Agreement
   terminates on..."). Never *shall* for a future event, and never *and/or*.
7. **The actor is the subject.** "Payment shall be made within 30 days" hides who pays; "The Customer shall
   pay each invoice within 30 days" does not. Verbs, not nominalizations: *pay*, not *make payment of*;
   *decide*, not *make a determination*.
8. **Conditions sit where the reader looks for them.** Put a short condition before its consequence ("If the
   Supplier misses two deliveries, the Customer may terminate"). A *provided that* tail that reverses the
   clause it closes is a hidden condition; make it its own sentence. Three or more conditions get a list.
9. **Short sentences, one obligation each.** Aim for an average near twenty words (Garner). A sentence
   carrying two duties, an exception and a deadline is four sentences, or a tabulated list.
10. **Legalese goes when it does no legal work.** *Herein*, *hereinafter*, *witnesseth*, *said* and
    *aforesaid* used as "the", doublets like *null and void* or *any and all*, *in the event that* for *if*.
    Terms of art stay (*force majeure*, *indemnify*, *without prejudice*): they carry settled meaning.
11. **Paragraphs for reasoning, lists for parallel items.** Bullets let a writer skip the "because" between
    claims; a narrative memo makes the logic show. Use a list when items are truly parallel, and a table
    when the comparison is the point.
12. **Name the source or cut the claim.** "Studies show", "courts have generally held", "it is widely
    accepted" pretend to authority. Cite the study, the case or the clause, or state it as your view.
13. **Hedge once, at the strength the evidence supports.** "Likely, on current data" is a position; "may
    potentially help to" is fog. A risk severe enough to change the decision belongs beside the answer, not
    in a footnote.
14. **Every e-mail and update ends on an owner and a date.** Subject line names the decision or the ask; the
    last line says who does what by when. A message that informs without asking is a memo nobody filed.
15. **A proposal answers the reader's criteria in the reader's words.** For a grant, mirror the funder's
    review criteria and headings in their order; for a client proposal, restate their problem as they put it
    before offering the fix. Reviewers score against a rubric; make the rubric easy to find.
16. **Quote the whole condition or paraphrase.** "Renewal resets to list price" is not the clause if the
    clause says "Except as provided in the Order Form, promotional renewals reset to list price." Truncating a
    conditional promotes the exception to the rule.

## How a piece is built

Before drafting, write four lines: the reader and the decision they face; what they already know; the one
sentence you want them to act on; the hard frame (template, page or word limit, required headings, house
style, governing law).

| Document | Shape | Opens with | Closes with |
|---|---|---|---|
| E-mail | Subject = the ask; answer; reasons; under ~150 words unless a decision, owner, date or caveat would be lost | The answer or the ask | Who does what by when |
| Decision memo / executive summary | SCQA → answer → grouped reasons → evidence → risks and next steps | The recommendation | Risks, decision needed, deadline |
| Narrative memo (Amazon six-pager) | Introduction and ask, goals, tenets, state of the business, lessons learned, priorities; data in an appendix; prose, not bullets | What the reader is asked to decide | The plan, with owners and a premortem: the three likeliest ways it fails |
| Status update (3P) | Progress, Plans, Problems, one to three sentences each | Team and period | The blocker and what would unblock it |
| Report | A standalone executive summary; findings as headings; method and raw data at the back | The finding | What to do about it |
| Commercial proposal / SOW | Their problem in their words → recommended approach → scope and exclusions → timeline → price and terms → next step | Their problem | One next step with a date |
| Grant (NIH-style aims page) | Hook, the gap and why it matters, long-term goal and objective, central hypothesis and rationale, two or three aims, payoff | Why the problem matters now | What will be true if it works |
| Grant (NSF-style summary) | Overview, Intellectual Merit, Broader Impacts, each under its required heading | The project in two sentences | Who benefits beyond the lab |
| Contract | Title and parties → recitals (background, no obligations) → definitions → the deal (what each party does) → term and termination → remedies and liability → boilerplate → signatures | Who the parties are | Signature blocks |
| Legal memo / brief | Deep issue in 75 words or fewer, ending in a question (Garner) → short answer → facts → discussion by issue → conclusion | The issue, framed | The answer at its highest level |

**Contract language by job** (after Adams): *performance* ("Acme hereby grants"), *obligation* ("Acme shall
deliver"), *discretion* ("Acme may assign"), *prohibition* ("Acme shall not disclose"), *condition* ("to be
reimbursed, Acme must submit receipts"), *policy* ("This Agreement is governed by..."), *declaration* ("Acme
states that it holds the licences"). Picking the category first chooses the verb.

**Grant aims** are each a deliverable that stands even if another aim fails; aims that depend on each other
read to a panel as one aim with a single point of failure. Specific aims are written first and revised last.

**Persuasive legal writing** frames rather than summarizes in the first paragraph, leads with the argument
that wins outright, places the second as independent confirmation, and ends on the consequence of ruling the
other way. Short sentences for conclusions, longer ones for reasoning.

**Reader test before sending.** Hand the draft cold to someone without the context (or a fresh session) and
ask what the document asks of them, what is ambiguous, and what it assumes they already know.

## The editing pass

- [ ] The answer, recommendation or ask is in the first paragraph, and the subject line names it.
- [ ] Each heading is a finding; reading only the headings gives the argument.
- [ ] Reasons are the same kind of idea, ordered on purpose, with no forced third.
- [ ] Every adjective of size or quality is a number, or is gone; every number has a source and a period.
- [ ] Each defined term and party name is spelled, capitalized and used the same way throughout.
- [ ] Obligation verbs match their job; no *shall* for facts or the future; no *and/or*.
- [ ] Every obligation names its actor as the subject; nominalizations are turned back into verbs.
- [ ] No condition hides in a *provided that* tail; exceptions are visible near the rule they limit.
- [ ] Cross-references point to sections that exist, with the numbering unchanged.
- [ ] Sentences average near twenty words; none carries two obligations.
- [ ] Every "studies show" or "courts have held" has a citation, or is restated as the writer's view.
- [ ] Page, word and character limits are met and required headings are present, in the required order.
- [ ] The close names an owner and a date, or the decision needed.

## What goes wrong

- **Throat-clearing e-mail.** "I hope this finds you well. I wanted to reach out regarding..." → start with
  the ask. "Let me know if you have any questions" → ask the one question you need answered.
- **Process before finding.** Three paragraphs of what the team did, then the result → the result, then the
  evidence that earns it.
- **Corporate filler (an AI tell).** "In today's rapidly evolving landscape", "leverage", "robust",
  "seamless", "best-in-class", "drive value", "comprehensive solution" → the specific claim, or nothing.
- **Narrating the document (an AI tell).** "This memo will explore", "It is important to note that", "The
  argument is limited in four respects. First..." → make the point; the reader does not need a tour.
- **The negation scaffold (an AI tell).** "This does not prove X. Nor does it establish Y. It does, however,
  support Z" → "This supports Z, though not X."
- **Mirrored conclusions.** A "Challenges and opportunities" section whose last line is "the outcome will
  depend on various factors" → name the factor that decides it, and which way you expect it to go.
- **Copula dodges.** "serves as", "stands as", "plays a key role in" → *is*, *does*, or the actual verb.
- **Bold-label bullets everywhere.** "**Scalability:** The solution scales" → a sentence that says how far
  and at what cost, inside a paragraph.
- **Synonym drift in a contract.** "Products" in clause 2, "Goods" in clause 7, "deliverables" in clause 9 →
  one defined term.
- **Shall for the future.** "This Agreement shall terminate on 31 December" → "This Agreement terminates on
  31 December."
- **The buried reversal.** "The Supplier shall refund all fees, provided that no refund is due after
  installation" → two sentences; the second is the rule most readers need.
- **Adjective grants.** "This innovative, transformative, first-of-its-kind approach" → the one thing it does
  that nobody has done, and the evidence that it can.
- **Answering the solicitation by restating it.** Copying the call's language back without saying what you
  will do → each criterion gets a concrete answer under its own heading.

## When the AI edits someone else's draft

- **Operative words are frozen.** Defined terms, party names, dates, amounts, currencies, percentages,
  deadlines ("30 days" is not "30 business days"), cross-references, citations, and the small words that
  carry the deal: *and*/*or*, *including*, *material*, *promptly*, *best* versus *reasonable* efforts.
- **Never turn a condition into an obligation, or the reverse.** Keep *if*, *unless*, *subject to*,
  *notwithstanding* and *provided that* doing exactly the work they did; a shorter clause that drops an
  exception is a different clause.
- **Invent nothing.** No new number, source, case name, deadline, commitment, budget line or computed total,
  not even arithmetic on the writer's own figures. Where a source is missing, mark it (`[source?]`) rather
  than supply one.
- **Keep the register and the template.** A contract keeps its formality and numbering; a client e-mail does
  not become a brief. Do not renumber clauses, re-letter sub-items or flatten tabulated conditions.
- **Respect hard limits.** If the passage sits at a word, character or page limit, the rewrite may not
  be longer; when the note cannot be met inside the limit, say so.
- **Tone notes change the words around the operative language, not the operative language.** "Make this
  friendlier" on an indemnity softens the framing sentence, not who indemnifies whom for what.
- **No new disclaimers or hedges.** Do not add "this is not legal advice", "may potentially" or caveats the
  writer did not write; preserve the ones they did, at the strength they wrote them.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Use one word for one thing: never swap a synonym for a term already in use.
- Make every heading a finding, not a topic.
- Replace each adjective of size or quality with the number behind it.
- Write in paragraphs; keep bullets for items that are truly parallel.
- End every e-mail with who does what by when.
- Cut "herein", "aforesaid" and "said" used as "the".
- Back every "studies show" with the study, or cut the claim.
- Never write "it is important to note"; just say the thing.

## Sources

- [millwright-labs/minto-pyramid-skill](https://github.com/millwright-labs/minto-pyramid-skill) (agent
  skill) — SCQA, Minto's three rules, "do not force three", invent nothing including arithmetic, the
  supplier worked example, offer a restructure rather than impose it. MIT.
- [kemalcanyapali/business-writing](https://github.com/kemalcanyapali/business-writing) (agent skill) —
  key line, vertical and horizontal logic, the three logical orders, "there are three issues" as a blank
  assertion, preserve qualifiers and commitments. MIT.
- [ngmeyer/skills, `six-pager`](https://github.com/ngmeyer/skills/blob/main/skills/productivity/six-pager/SKILL.md)
  and [Amey-Thakur/AI-SKILLS, `six-pager-narrative`](https://github.com/Amey-Thakur/AI-SKILLS/blob/main/skills/big-tech-processes/six-pager-narrative/SKILL.md)
  (agent skills) — six-pager sections, premortem, prose over bullets, every number traceable to an appendix.
  MIT.
- [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) (agent skills
  `commercial-legal/stakeholder-summary`, `law-student/legal-writing`) — quote the full conditional sentence,
  business translation of legal findings, structure-first feedback. Apache-2.0.
- [anthropics/skills](https://github.com/anthropics/skills) (agent skills `internal-comms`, `doc-coauthoring`)
  — the 3P update format; reader testing with a context-free reader. Apache-2.0.
- [Larissa Meredith-Flister, `persuasive-legal-writing`](https://github.com/lawve-ai/awesome-legal-skills/tree/main/skills/persuasive-legal-writing-larissa-meredith-flister)
  (agent skill) — frame-not-summary openings, sequencing by force, and the best catalogue found of AI tells in
  legal prose (meta-commentary, negation scaffold, tidy limitation lists). AGPL-3.0.
- [Mirza Chiragov, `legal-design-assessment`](https://github.com/lawve-ai/awesome-legal-skills/tree/main/skills/legal-design-assessment-mirza-chiragov)
  (agent skill) — legalese, nominalization and passive density, hidden conditions and *provided that* tails.
  CC BY 4.0.
- [Legalfab, `humaniseur-juridique`](https://github.com/lawve-ai/awesome-legal-skills/tree/main/skills/humaniseur-juridique-gary-haas)
  (agent skill, French law) — vague attribution to doctrine, filler formulas, copula dodges. MIT. Weak spot:
  its fixes add specific citations, which an editor must never invent.
- [`client-explanation-translator`](https://github.com/lawve-ai/awesome-legal-skills/tree/main/skills/client-explanation-translator-larissa-meredith-flister)
  (agent skill) — keep uncertainty at its real strength; never invent facts, law or deadlines. AGPL-3.0.
- [K-Dense-AI research-grants](https://github.com/K-Dense-AI/claude-scientific-writer) and
  [wanshuiyin grant-proposal](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/blob/main/skills/grant-proposal/SKILL.md)
  (agent skills) — agency structures, gap statement, independent aims, no fabricated budgets or credentials.
  MIT. K-Dense's prose advice is generic ("strong verbs such as elucidate").
- Craft references: Kenneth Adams, *A Manual of Style for Contract Drafting* and
  [adamsdrafting.com](https://www.adamsdrafting.com/category/contract-language-categories/) (categories of
  contract language, elegant variation); Bryan Garner, *Legal Writing in Plain English* (deep issue, sentence
  length); Bryan Wydick, *Plain English for Lawyers*; the Federal Plain Language Guidelines
  ([archived "Use must"](https://cybercemetery.unt.edu/oilspill/20121007091305mp_/http:/www.plainlanguage.gov/howto/guidelines/bigdoc/writeMust.cfm): *must*, *must not*, *may*, *should*); Barbara Minto, *The Pyramid Principle*; Amazon's narrative-memo
  practice ([The Amazon Writing Culture](https://www.theprfaq.com/articles/amazon-writing-culture): data over
  adjectives, no weasel words); NIH Specific Aims anatomy (university grant-office guides) and NSF's Project
  Summary headings (PAPPG).
