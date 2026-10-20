# Opinion DNA — <brand>

> Status: template. Replace this line with `Status: filled from <sources>, <date>` once the sections
> below describe the brand.

How the brand forms an angle, what it accepts as proof and what it refuses to claim. The voice DNA
decides how the text sounds; this file decides **what may be said**.

## How to fill this file

1. **Gather the sources** (section 0) before anything else: where prices and plans are defined, where
   features can be verified, what is already published, who decides when something is undefined.
2. **Ask the owner** the questions under each section and write down their answer, not your guess. A
   section the owner has not answered stays empty, and empty means "ask", never "decide".
3. **Read the brand's best published copy** and write down the beliefs it already implies: what it
   compares, what it never promises, which words it avoids. Quote the line.
4. **Keep the defaults** (marked **Default**) unless the owner overrides them.

Lines marked *Example* describe a fictional invoicing app. Delete them when you fill the file.

---

## 0. Sources of truth

The claim check in `SKILL.md` (step 5) reads this table. Every price, plan, limit, feature and date in
copy must trace back to a row.

| Fact | Where it is defined | Notes |
|---|---|---|
| Prices and plans | <pricing config, billing code, pricing page> | when the code and a doc disagree, the code is what customers get |
| What the product does | <the code, the changelog> | live means shipped to users, not merged or planned |
| What is already public | <site, docs, help center> | |
| Brief: facts, vocabulary, taglines | <brief document> | |
| Who decides when something is undefined | <name or role> | |

## 1. The thesis

Questions: What does the brand argue against? Is the enemy a technology, a habit, a category, an
interface? What does every piece of copy end up comparing?

One sentence, then its consequence for copy.

*Example:* "The enemy is chasing payments by hand, not the client who pays late. Copy compares a month
with reminders and a month without; it never blames clients."

## 2. What the brand believes

| Belief | What it forbids in copy |
|---|---|
| <belief> | <the sentence it rules out> |
| *Example:* "The user decides." The app suggests; the last word is the user's. | "Let the app handle it for you", "it decides for you" |
| *Example:* "A guarantee is a contract." | paraphrasing an exact guarantee into "almost" or "practically" |
| *Example:* "We use our own product." | saying it anywhere it is not true |

## 3. What counts as evidence

**Default**, in this order and nothing else:

1. What the product does today, verifiable in its code or configuration.
2. The brand brief: facts, vocabulary, taglines.
3. What is already published.

**Not evidence:** a round number without a source, a comparison with a competitor nobody measured,
"studies show", "users report", a model benchmark, an AI's opinion about the product.

When a sentence needs data that isn't there, **cut the sentence**. Don't invent it, round it, or borrow
it from a competitor.

## 4. Skepticism

**Defaults**; extend them.

- **An adjective in place of a mechanism.** If a sentence does not survive "how, exactly?", it does not
  ship.
- **The category's promises.** <the promise competitors make that the brand rejects>
  *Example:* "Get paid 3× faster". The brand sells fewer chases, not speed.
- **Fake social proof.** No testimonial, user counter or rating that is not real, sourced and approved.
- **AI-detector scores.** Detectors guess. Proof that a text does not read as AI is the list of named
  patterns in `ai-tells.md`, not a percentage.

## 5. What changes the brand's mind

**Default:** one thing only, the product changing. When the product changes, copy changes the same day.
Copy never anticipates a feature: what is live may be said, what is on the roadmap may not.

## 6. Compliance lines

⚠️ These are not style. Breaking one is an incident, not a weak sentence.

1. **Price is only what the product charges today.** Current plans and prices: <list them, each with its
   row from section 0>. When one changes, every piece of copy that cites it changes the same day. Never:
   a discount, "founding member pricing", "lock in your price", "free forever", or a plan the product
   does not sell.
   **Retired claims** (once true or planned, now false; never again, in any format): <list>.
   **Allowed phrasings:** <list>.
2. **No rating and no invented number.** Default: the prices in item 1 are the only money figures copy
   states.
3. **<Brand-specific forbidden framing.>** *Example:* never "the app chases your clients for you"; the
   user approves every reminder.

## 7. How to form a new angle

When asked for new copy and none exists:

1. Pick **one** concrete pain the status quo causes.
2. Find the **one** product mechanism that answers exactly that pain. One, not three.
3. The headline **names** the pain or the thing; the subhead **explains** the mechanism.
4. Check it against section 6. If the sentence needs a promise that is not cleared, it dies there.
5. Check the brief: if a tagline already exists for this angle, use it instead of coining a weaker
   sibling.

## 8. Opinions the AI never invents for the brand

**Default:**

- Price, plan, launch date, usage limit.
- Suppliers, vendors or models behind the product that the brand does not disclose.
- A named comparison with a competitor ("better than X").
- Anything about the roadmap.
- Privacy or data-use commitments beyond what is already written.

Missing a definition? **Ask <owner>.** Do not decide it for them inside a piece of copy.

## 9. Per surface

Where the opinion shows up, and how loudly. *Example:*

- **In the product:** the reader is already a user. The opinion shows in micro-copy (an error that does
  not apologize, an empty state that teaches the next step), never as a manifesto.
- **On the site:** the whole thesis lives here. The comparison with the status quo can be explicit, even
  a table. It still compares approaches, never makes claims nobody measured.
