---
name: writing-poetry
description: >
  The craft of poetry: verse in any shape (lyric free verse, prose poems, sonnets and other inherited forms,
  spoken word, song-like verse, and poems gathered into sequences or collections).
  Use when writing, editing or reviewing a poem, a stanza, a single line, a refrain, a fixed form or a
  manuscript of poems. Triggers include poem, poetry, verse, stanza, line break, enjambment, meter, rhyme,
  free verse, sonnet, haiku, villanelle, ghazal, prose poem, spoken word.
  For a brand's own copy (site, ads, e-mails, UI strings), use the `write` skill.
---

# Poetry

Poetry is read slowly and more than once, so every choice on the page is something the reader is meant to
notice: where a line ends, a comma that is not there, a word said twice. The reader needs the poem's music and
its open edges left intact. What goes wrong most often is normalization: an edit that makes the poem read more
like prose, or more like "a poem" in general, with tidied punctuation, an added rhyme, an abstraction where the
image was, or a last line that explains.

> Built from [danjdewhurst/story-skills](https://github.com/danjdewhurst/story-skills) (verse-craft), [ehartye/agent-prose](https://github.com/ehartye/agent-prose) (prose-poetry and its verse guide), [sm9sh/poetry-skill](https://github.com/sm9sh/poetry-skill), plus Mary Oliver, Longenbach, Fry, Hugo, Pound and the Poetry Foundation glossary. Synthesized, not copied — sources at the end.

## The standards

Items marked *(core)* are the short list to hand a writer or a model; the rest are the wider craft.

1. **The layout is the form** *(core)*. Line endings, stanza breaks, indentation, gaps inside a line,
   punctuation and its absence, capitals and their absence (a lowercase *i* included) are all deliberate.
2. **Every line ending does work.** It lands a sound, makes a pause, delivers a surprise or sets the speed.
   Longenbach's terms: a line ending either *parses* the syntax (breaks where a phrase ends) or *annotates* it
   (cuts against the phrase to put weight on a word). A rewritten line ends on a word that carries weight, not on
   *the*, *of* or *and*, unless the poem already breaks that way on purpose.
3. **Sound is meaning** *(core)*. Rhythm, repetition, alliteration, assonance and internal rhyme carry
   as much as the words' sense. Read a changed line aloud next to its neighbors; if the stresses or the breath no
   longer match, the edit is wrong however clear it is.
4. **The image does the feeling's work.** Write what causes the reaction, not the reaction's name: a porch, a
   pair of boots by the door, a kettle (agent-prose's worked example), not *I felt so alone*. Pound: "Go in fear
   of abstractions."
5. **Do not explain an image or resolve an ambiguity** *(core)*. That includes the ending: no closing line
   that tells the reader what the poem meant, and no gloss on a metaphor the poem leaves to work alone.
6. **Never add rhyme; never bend a sentence to keep one.** Models rhyme by default: in Walsh et al. (2024)
   GPT's poems leaned hard on rhyme, quatrains and iambic meter, and in Porter & Machery's study 89% of the AI
   poems rhymed every line against 40% of the human ones. Inversion (*the sea so blue I wade into*) and filler
   (*did go*, *so very*) to reach a rhyme or a beat are faults (Fry argues against wrenched syntax; story-skills
   lists both). Fix a forced rhyme by changing the other rhyme word or rebuilding the sentence. Rhyme and meter
   never excuse a line that makes no sense.
7. **Keep the poem's diction and its era.** No *o'er*, *thee* or *ere* in a modern poem; no slang in a poem
   written in an older register. The stock poetic shelf (*whisper*, *echo*, *embrace*, *tapestry*, *soul*,
   *ethereal*) comes in only if the poet put it there.
8. **A fixed form is a contract, and it is counted, not assumed.** A sonnet keeps fourteen lines and its turn; a
   villanelle's refrains repeat word for word; a sestina's end words keep their rotation; a ghazal keeps its
   repeated end word in every couplet; a haiku keeps its cut. Never claim a line scans without counting its
   stresses or syllables (agent-prose and story-skills both require the count).
9. **Fewer, exacter words.** One concrete noun beats an adjective pair; *the dark, black night* says
   *night* three times. When a note asks to tighten, the adverb and the second
   adjective go first, and the cut must not break the meter.
10. **Free verse is measured too.** It has cadence, usually speech-based, and a profile of line lengths. A rewrite
    keeps that profile: a short-lined poem does not get a long line, and a long-breathed poem does not get chopped.
11. **The speaker is not the poet.** Edit what the speaker says on the speaker's terms. Never soften a speaker's
    cruelty, desire or despair, and never bring the poet's biography into the poem.
12. **A poem owes reality nothing.** Hugo's line: "you owe reality nothing and the truth about your feelings
    everything." A yellow grain elevator can be black in the poem. Never correct a fact, a name, a spelling or a
    grammar the poem bends.
13. **The title, epigraph and dedication belong to the poem.** A title often does work the poem leaves undone;
    never add one, drop one or change one unless asked.
14. **Suggest, never impose** *(core)*. The change is as small as the note allows: a word before a line,
    a line before a stanza. Poems are mostly taste, and the taste is the poet's.

## How a piece is built

**Describe before you prescribe.** Before changing anything, name what the poem is doing: its form, its speaker
and who is addressed, where it turns, its sound pattern (rhyme scheme, meter, or the cadence of its free verse)
and its line-ending habit (mostly end-stopped, mostly enjambed). Workshop practice puts description first for a
reason: an edit made before the poem's intention is understood fixes the wrong thing.

**The shapes this craft covers.**

| Form | What holds it together | What an edit must keep |
|---|---|---|
| Lyric free verse | Image, cadence, line endings | The line-length profile, the breaks, the white space |
| Prose poem | Sentence rhythm inside a block, compression | The block itself (never add line breaks), the sentence music |
| Sonnet, strict or loose | Fourteen lines and a turn (after line 8, or before the closing couplet) | The line count, where the turn falls, the meter if there is one |
| Villanelle, pantoum, triolet | Lines that return by rule | Every returning line verbatim, in its position |
| Sestina | Six end words in rotation | The end-word order in every stanza and the envoi |
| Ghazal | Autonomous couplets, a repeated end word or phrase (radif) | The radif in each couplet; each couplet standing alone |
| Haiku, tanka | An image, a cut, brevity | The cut and the brevity; 5-7-5 is optional in English |
| Ballad, song-like verse | Story, refrain, a steady beat | Stanza shape, the refrain, what can be sung |
| Spoken word | Breath, repetition, direct address | The repetitions and the address; lines built for the voice |
| Sequence or collection | Images and words that recur across poems | The recurring wording, spelled the same everywhere |

**Meter depends on the language.** English verse counts stresses. Portuguese counts poetic syllables up to the
last stressed one, with elision between vowels (a *redondilha maior* has seven, a *decassílabo* ten); Spanish
counts one syllable past it, so the same line is a Spanish *endecasílabo*. French alternates masculine and
feminine rhymes; Spanish allows assonant rhyme. Scan a poem in its own tradition
and say so when it cannot be scanned reliably (story-skills' verse-in-other-languages note).

**Openings and endings.** The title and the first line work together; the first line enters the poem's music
rather than announcing its subject. The last line lands on an image, an act or a turn, and may stay open. A
closing line that summarizes, consoles or moralizes is the most common way a good poem is made worse.

**Revising, in order** (adapted from agent-prose's verse guide): find the turn, and if nothing turns, look at
structure before words; check each line ending for a reason; replace each named feeling with the thing that
causes it; read aloud; count, if the form or the poet set a count. What the poem does comes before how it sounds,
and both come before polish.

## The editing pass

- [ ] Line count, stanza breaks, indentation and white space match the original unless the note asked otherwise.
- [ ] Punctuation and capitalization outside the changed words are identical; no period added to an
      unpunctuated poem, no capitals added to a lowercase one.
- [ ] Each rewritten line ends on a word that does work.
- [ ] Read aloud: the changed line keeps the stress count and breath of its neighbors.
- [ ] Repetitions, refrains, anaphora and internal rhymes in the passage are all still there, word for word.
- [ ] No rhyme was added; no word order was inverted and no filler was added to reach a rhyme or a beat.
- [ ] No abstraction replaced an image, and no image was explained.
- [ ] No closing line was added that sums up, consoles or teaches.
- [ ] A fixed form still holds: lines counted, refrains verbatim, end words in rotation, syllables or stresses
      counted where the form or the poet declared them.
- [ ] Diction matches the poem: no archaism, no stock poetic word, no register the poem does not use.
- [ ] Title, epigraph, dedication, facts and deliberate "errors" are untouched.
- [ ] The poem still sounds like this poet, not like a competent average of poems.

## What goes wrong

| Pattern | What it looks like | Fix |
|---|---|---|
| Normalized layout | Commas and capitals added to a lowercase, unpunctuated poem; lines rejoined at the syntax | Restore the original exactly. |
| Prose with line breaks | Lines broken at random, or on *the*, *of*, *and* for no reason | Break where the sound, the pause or the surprise is. |
| The default quatrain | Four-line stanzas in AABB rhyme, iambic, when the draft was free verse | Never impose form or rhyme the poet did not choose. |
| Rhyme driving sense | *The storm did rage, the waves were high; / to shore the boat could not come nigh* | Change the rhyme word in the other line, or rebuild the sentence. |
| Predictable pairs | *heart / apart*, *fire / desire*, *night / light*, *tears / years* | Only if the poet chose them; never offer them. |
| Grammatical rhyme | Verb rhyming with verb in the same ending (in Portuguese, *rima pobre*: *amar / chorar*) when the poem avoids it | Keep the poet's rhyme habits; do not introduce easier ones. |
| The stock shelf | *whispers*, *echoes*, *embrace*, *tapestry*, *soul*, *ethereal*, *symphony* | Replace with the thing itself, or leave the poet's word. |
| Abstraction for image | *sorrow*, *hope*, *beauty*, *time* standing where a thing could stand | The concrete thing that causes the feeling. |
| The explaining closer | *And so I learned that love endures.* | Cut it; the poem ended a line earlier. |
| The universal *we* | A personal poem drifting into *we*, *us*, *our* (Walsh et al. found GPT poems lean on the first-person plural) | Keep the speaker's person exactly. |
| Over-controlled beauty | Every line balanced and polished, nothing plain or rough | Keep the poet's rough line; one plain line can carry the poem. |
| Simile stacking | *like a moth, like a match, like a last breath* | One figure, the exact one. |
| Corrected on purpose | An invented word "fixed", a lowercase *i* capitalized, a fact "corrected" | Leave it; the poem owes reality nothing. |
| Asserted scansion | "This is iambic pentameter" with no count shown | Count stresses or syllables line by line, or say it was not counted. |

## When the AI edits someone else's draft

- Return the marked passage with the same number of lines and stanza breaks unless the note asks for a change in
  length. Never join lines into sentences, and never break a prose poem into lines.
- Preserve leading spaces, indentation, gaps inside a line, and the exact punctuation and capitalization of
  every word the note did not ask to change. A missing period is not a mistake.
- Change only what the note names: a word if the note is about a word, a line if it is about a line. If the
  change cannot be made without breaking the meter, a rhyme or a refrain, make the smallest version that keeps
  the form.
- Never add a rhyme, a title, an epigraph, a closing line or an explanation.
- A refrain or a repeated line may recur outside the marked passage; changing one occurrence breaks the others,
  so keep it verbatim unless the note asks to change the refrain itself.
- Do not correct grammar, spelling, dialect, invented words or facts that the poem bends.
- Keep the speaker's person, tense and addressee, and the poem's language: a poem is edited in its own
  tradition and counted by its own language's rules (stresses or syllables), never by English rules.

## Standing instructions

Short lines a writer can keep in their own brief or style notes, so that an assistant applies them every
time. Each one is a habit drawn from the standards above, phrased in the writer's voice; keep the few that
fit the project.

- Never add rhyme the poem does not already have.
- Never invert word order to land a rhyme or a beat.
- Prefer the concrete noun to the abstract one: a kettle, not sorrow.
- In lines you rewrite, end on a strong word, not on "the", "of" or "and".
- Cut filler that only pads a beat: "did go", "so very", "oh".
- No archaic words like "o'er", "thee" or "ere" unless the poem already uses them.
- Never bring in "whisper", "echo", "embrace" or "tapestry" on your own.
- One adjective per noun at most; an exact noun needs none.

## Sources

Agent skills (SKILL.md and key references read; ideas rewritten, nothing pasted):
- [danjdewhurst/story-skills, `verse-craft`](https://github.com/danjdewhurst/story-skills) — never claim a line scans
  without showing it; never pad, never invert for a rhyme; propose line-level fixes with a reason instead of
  rewriting; a clumsy character's verse stays clumsy; forced-rhyme tells and over-used rhyme pairs; free-verse
  faults; rhyme and meter in other languages. MIT.
- [ehartye/agent-prose, `prose-poetry`](https://github.com/ehartye/agent-prose) and its
  [verse craft guide](https://github.com/ehartye/agent-prose/blob/main/craft/guides/verse.md) — a line break must do
  something; concrete before abstract; stock closers; the revision order; the evidence on rhyme (Porter & Machery);
  "every line rhymes" as a sameness signal in free verse; "poems are mostly taste". MIT.
- [sm9sh/poetry-skill, `ukrainian-poetry`](https://github.com/sm9sh/poetry-skill) — rhyme and meter never justify a
  meaningless line; banal grammatical rhymes; no invented words or broken stresses for a rhyme; living vocabulary
  over archaism; endings without moralizing. No license stated; ideas only.
- Checked and set aside: [aelena/claude-poetry-skill](https://github.com/aelena/claude-poetry-skill) (haiku commit
  messages, a novelty); a "poetry-critique" skill from jeremyyuAWS/poet-agent and the "Poet Analyst" skill on
  mcpmarket.com were found in search, but their files could not be reached from this environment.

Craft references:
- Mary Oliver, *A Poetry Handbook* (1994) — sound, the line ("verse" from the Latin for turning), imagery, revision
  as patient appraisal.
- James Longenbach, *The Art of the Poetic Line* (2008) — end-stopped and enjambed lines; parsing and annotating
  line endings.
- Stephen Fry, *The Ode Less Travelled* (2005) — meter, rhyme and form; modern diction; against wrenched syntax.
- Richard Hugo, *The Triggering Town* (1979) — "you owe reality nothing and the truth about your feelings
  everything".
- Ezra Pound, "A Few Don'ts by an Imagiste" (*Poetry*, 1913) — "Go in fear of abstractions."
- [Poetry Foundation glossary, "Enjambment"](https://www.poetryfoundation.org/education/glossary/enjambment) — "the
  running-over of a sentence or phrase from one poetic line to the next, without terminal punctuation; the
  opposite of end-stopped"; also its entries for caesura, volta, ghazal and villanelle.
- Workshop practice: [Guidelines for approaching a poem in workshop](https://cwcircle.poetry.blog/2026/03/02/guidelines-for-approaching-a-poem-in-workshop-settings/)
  — describe before prescribing; the speaker is not the poet.

Research:
- Porter & Machery, ["AI-generated poetry is indistinguishable from human-written poetry and is rated more
  favorably"](https://www.nature.com/articles/s41598-024-76900-1), *Scientific Reports* (2024).
- Walsh, Preus & Gronski, ["Does ChatGPT Have a Poetic Style?"](https://arxiv.org/abs/2410.15299), CHR 2024 —
  default rhymed quatrains, iambic meter, first-person plural, and a recurring vocabulary.
