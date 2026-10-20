# Voice DNA — <brand>

> Status: template. Replace this line with `Status: filled from <samples>, <date>` once the sections
> below describe the brand.

Reverse-engineered patterns, not a description of tone. "Direct", "confident" and "conversational"
reproduce nothing; a pattern backed by a quoted line does.

## How to fill this file

1. **Collect samples** (section 0): 3–5 pieces of published copy the brand stands behind, written or
   edited by a person. One per format if possible: UI, email, site or ad, PR or changelog, social.
   Unreviewed AI output is not a sample.
2. **Count, then describe.** Sentence length, dashes per paragraph, semicolons, exclamation marks, emoji,
   bold. A count survives a rewrite; an adjective does not.
3. **One quoted line per rule.** Every rule cites a line from the samples. A rule with no line is a guess:
   mark it `(default)` or delete it.
4. **Keep or override the defaults.** Lines marked **Default** hold for most brands that want to sound
   like a person. Keep them unless the samples contradict them; when they do, the samples win and you
   write down the new rule.
5. **Missing format?** Use the nearest sample and say which one you used.

Lines marked *Example* show the shape of an answer for a fictional invoicing app. Delete them when you
fill the file.

---

## 0. Samples

| Format | Where it lives | Why it counts |
|---|---|---|
| <UI strings> | <path or URL> | <written by a person, shipped> |
| <email> | | |
| <site / ad> | | |
| <PR / changelog> | | |

## 1. Sentence and rhythm

Questions: How long is a typical sentence? Is a short one followed by a longer one? Who is the
grammatical subject? Are semicolons used?

- **Default: short, then one that explains.** A 5–12 word declarative followed by a 15–30 word sentence
  that carries the mechanism.
  *Example:* "Reminders go out by themselves. If a client has not paid three days after the due date,
  they get one short email with the invoice attached."
- **Default: never three short sentences stacked for tension.** `no-ai-slop` calls this dramatic
  fragmentation, and it is a defect here too.
- **Default: active voice, human subject.** The reader, or the product by name, does the acting. Not
  "the decision is made", "the file is processed".
- **Semicolons:** <used or not, with a sample line>. A semicolon that joins two halves of one thought is
  rare in product copy, so if the samples use it, it is part of the voice.

## 2. Vocabulary

Questions: What are the product's own terms, and where is the glossary for each locale? How is the brand
name written? Which words does the brand refuse?

- **Product terms come from the locale's glossary or dictionary.** Before writing a product term, open
  that language's dictionary and use the word already there. Leaving it in English undoes what shipped;
  translating from memory creates a second word for the same thing. Glossary: <path>.
- **Brand name:** <how it is written; italics or quotes; whether it may ever become a common noun>.
- **Default: simple verbs beat fake strong verbs.** `is`, `has`; not "serves as", "boasts".
- **Default: concrete words of the trade** over "content", "material", "solution".
  *Example:* invoice, due date, client, reminder.
- **Never (default starter list; extend it):** vibrant, seamless, robust, powerful, revolutionary,
  game-changing, unlock, supercharge, elevate, delve, leverage. For other languages see `ai-tells.md`.

## 3. Openings and closings

- **Default: open by naming the thing**, not by announcing you are about to talk about it.
  *Example:* "Invoices go out on the 1st." Not: "In today's fast-paced world, getting paid on time…"
- **Default: close on the most concrete fact or on the action.** No conclusion paragraph, no "in short",
  no closing metaphor.
- **Taglines:** <list the coined ones>. At most one per piece, and only from this list. Do not coin
  siblings.

## 4. Punctuation and formatting

Questions: Do the samples use the em dash, and how often? Curly or straight quotes? Exclamation marks?
Emoji, and where?

- **Em dash (—):** <brand decision>. If the samples use it as a joint between two parts of one thought,
  keep their rate (for example about one per long paragraph). This overrides `humanizer`, which allows
  it: a writer's sample beats its dash rule. What goes in every case is the decorative dash and the
  cluster (two in a short paragraph).
- **Quotes:** <curly or straight>. Default: curly quotes in text for people.
- **Ellipsis:** default `…`, one character, never three periods.
- **Default: bold only for real hierarchy.** Never mid-sentence for emphasis; that is a chatbot tell.
- **Default: no emoji in UI.** In email at most one, and only when the message is truly celebratory.
  Never in a headline, never as a section marker.
- **Default: no exclamation marks**, not in errors, success messages or onboarding. Override only if the
  samples use them.

## 5. How the brand explains

- **Default: the mechanism goes in the subhead, never in the headline.** The headline names the thing;
  the line below explains how it works.
  *Example:* "Get paid on the 1st." / "Invoices go out on the day you pick, and a reminder follows three
  days later if nobody paid."
- **Default: contract before adjective.** When there is an exact guarantee, the guarantee is the
  sentence. "Identical" never becomes "practically identical".
- **Default: an error says what happened and what to do, in the same sentence, without apologizing.**
  *Example:* "Couldn't save the invoice — the connection dropped. Your changes are still here; try
  again." / "Too many requests. Wait a minute and try again."
  Never "Oops!", "Something went wrong 😕", "Sorry for the inconvenience".

## 6. Patterns the generic skills remove that the brand may use

⚠️ The precedence rule in `SKILL.md` points here. A pattern that `no-ai-slop` or `humanizer` removes is
allowed only if this table allows it, and only within its budget. Over budget is real slop.

| Pattern | Status here | Budget | Sample line |
|---|---|---|---|
| Binary contrast ("not X, Y") | <signature / allowed / banned> | default: banned; if it states the brand's positioning, 1 per piece | |
| Colon reveal | <…> | default: 1 per piece, only when what follows is a fact, not drama | |
| Two-word imperative ("Do this. Not that.") | <…> | default: only lines already coined in section 3; no new siblings | |
| Rule of three | banned (default) | 0; if three appear, cut to two or go to four | — |
| Em dash | <…> | the samples' rate | |
| Throat-clearing opener ("Here's the thing", "I'll be honest") | banned (default) | 0 | — |
| Fake-profound closer, closing metaphor | banned (default) | 0 | — |

## 7. What the brand never does

Defaults; add the brand's own rules below them.

- Use a number that doesn't exist. No metric, named testimonial or rating unless it is real and sourced.
- Speak for the reader ("you know how frustrating it is when…").
- Ask a rhetorical question and then answer it.
- Cite "experts", "studies" or "the market" without naming them.
- Lean on "simply", "basically" or "actually" as crutches.
- <brand rule> *Example:* "Never says the app decides. It suggests; the user approves."

## 8. Differences by format

| Format | What changes (defaults; edit them) |
|---|---|
| UI strings | shorter still; no dash in buttons or labels; an error always carries the way out |
| Email | first person allowed; at most one emoji; the CTA is verb + object ("Create my account"), never "Click here" |
| Site / ad | the headline names, the subhead explains; a tagline is allowed |
| PR / changelog | engineering prose, dense and long is fine; it still goes through the skill |

## 9. Language

- **Which language for what:** <for example, public copy in English; transactional email in the
  reader's language when it is known>.
- **Each locale is rewritten, not translated.** Each language has its own rhythm; note it per language.
  *Example:* "Portuguese runs slightly longer sentences with fewer ellipses; a construction that only
  exists in English is rewritten, not carried over."
- New strings enter in <source locale> first.

## 10. Per surface

Where the reader's situation changes the voice. *Example:*

- **App:** the reader is signed in and in the middle of a task. Every string competes with their work
  for attention, so cut harder than on the site.
- **Site:** the reader does not know what the product is yet. This is where a tagline and the binary
  contrast earn their space, because here they are the argument, not decoration.
