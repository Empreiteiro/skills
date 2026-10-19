---
name: write
description: Brand writing system — drafts and reviews any text a person will read in the brand's own voice, checks every claim against what the product actually does, and strips AI tells by chaining the no-ai-slop and humanizer skills. Use before writing or reviewing UI copy, locale strings, emails, ads, captions, scripts, landing pages, PR descriptions, changelogs, support replies or text inside an artifact, and when asked to "make it less AI", "humanize" a text or check whether it "sounds like a robot". Not for model prompts, code comments, agent docs, commit messages or identifiers.
---

# Write

Code has gates; prose usually has none. This skill is the manual gate for text a person reads. It stops
the three failures that cost the most: copy that reads like a chatbot, claims the product does not back
(a price, plan or feature from an earlier or imagined version), and locales translated line by line
instead of rewritten.

## The four pieces

| Piece | File | Decides |
|---|---|---|
| Voice DNA | `references/voice-dna.md` | how the brand **sounds**: rhythm, openings, punctuation, what it never does |
| Opinion DNA | `references/opinion-dna.md` | what the brand **believes**, refuses to claim and never promises; where the source of truth lives |
| AI tells | `references/ai-tells.md` | what must **never** survive in the final text, English and Portuguese |
| The two generic skills | `no-ai-slop`, `humanizer` | technique: flag and cut, then rewrite |

The generic skills know nothing about the brand, on purpose. Do not run them alone on brand copy: on
their own they remove patterns a brand may use deliberately (the em dash, a binary contrast). The voice
DNA says where the brand wins.

## Fill the DNA first

`voice-dna.md` and `opinion-dna.md` ship as templates (`Status: template` on their first line). Before writing:

1. Use the project's filled copies if it has them (search the repo for `voice-dna.md` and `opinion-dna.md`).
2. If there are none, ask the user for 2–3 samples of published copy they like and stand behind (one per
   format if possible, and per language if the brand writes in more than one), plus where prices, plans
   and features are defined.
3. Draft both files from the samples following the templates, show the draft, and once confirmed save it
   in the project (for example `.claude/brand/`), not in an installed plugin folder that updates overwrite.
4. If the user wants to skip this, write with the defaults the templates state and say so.

Repos that publish for the same brand share one copy of the DNA. A voice that differs between the site
and the app is a voice nobody wrote.

## The order

Each step assumes the previous one.

1. **Know the job.** Who reads it, where it is published, what they should think, feel or do afterwards.
2. **Read the voice DNA** and copy its concrete patterns, not its tone adjectives.
3. **Read the opinion DNA** before forming any angle, judgment or promise.
4. **Draft.**
5. **Check every claim against the source of truth** listed in the opinion DNA (§0): prices, plans,
   limits, features, dates and names match what the product does today, never an earlier version, the
   roadmap or a guess. No source, no sentence: cut it or ask.
6. **Run `no-ai-slop`** to flag the patterns and make the minimum cut.
7. **Run `humanizer`** on what is still flagged. Flagging first is cheaper than rewriting.
8. **Apply the voice DNA.** Put back a pattern the generic skills removed only where voice DNA §6
   explicitly allows it, and only within its budget.
9. **Final pass against `references/ai-tells.md`**, in the language of the text. A tell left means
   rewrite. This pass is never skipped.

**The language picks the list.** Portuguese AI tells are not translations of English ones; use the half
that matches the text.

**Locales are rewritten, not translated.** Write each one for its reader, in that language's own rhythm.
Product terms come from that locale's glossary or dictionary: use the word already shipped, never a
second word for the same thing.

## When the sources disagree

Strongest first:

1. The user's request in this conversation.
2. A format-specific skill or brief (a carousel skill, a compliance brief).
3. Opinion DNA: what may be said.
4. Voice DNA: how it sounds. It beats the generic style rules of `no-ai-slop` and `humanizer`, but only
   where it explicitly allows a pattern they remove. `humanizer` itself lets a writer's sample override
   its rules, dashes included.
5. AI tells: the last check, never waived.

## In scope

**Yes:** UI strings and locale dictionaries, transactional and marketing emails, site and landing pages,
ads, captions, scripts, PR descriptions, changelogs, text inside artifacts, canned support replies.

**No**, because the reader and the standard are different:

- Model prompts and instructions. Humanizing a prompt makes it a worse prompt.
- Code comments, agent docs (`AGENTS.md`, `CLAUDE.md`) and commit messages: engineering docs with their
  own voice, dense on purpose.
- Identifiers: keys, event names, columns, flags.
- Strings a parser matches. Changing them breaks code.

## Mistakes that cost the most

- **Stripping the brand's em dash** because `humanizer` says so. If the voice DNA keeps it, keep the
  samples' rate; cut only decorative and clustered dashes.
- **A price the product does not charge.** Copy states only what the source of truth says today, and
  copy that cites a price changes the same day the price does. A retired claim ("free during the beta")
  stays retired, in every format.
- **Translating instead of rewriting.** A type checker proves the keys match; nothing in the build hears
  an accent.
