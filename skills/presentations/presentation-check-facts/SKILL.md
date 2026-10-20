---
name: presentation-check-facts
description: Fact-check the content of a presentation — numbers, names, dates, quotes, attributions, product claims and datasets shown on slides or in notes — against primary sources, and record the sources. Use before presenting to an audience, when slides use data gathered from summaries or AI search, or when asked to verify a deck.
---

# Fact check

## 1. List the claims

Go through every slide, its notes and its explanation, and list each checkable claim: numbers, dates, names of
people/organizations/products, quotes, "X does Y" statements about tools or papers, and every record of a dataset
drawn on a slide. Skip opinions and the speaker's own framing. Keep the slide number with each claim.

## 2. Verify against primary sources

- Prefer the original: official sites, regulations, the paper itself, the product's documentation, the
  institution's own system. Secondary summaries (including AI search answers) are leads, not sources.
- Split large checks by entity and run them in parallel (one subagent per organization or dataset). Ask each one
  for structured output (JSON) with the source URL of every item, and for "not found" instead of guesses.
- Datasets: compare names, codes and totals with the official listing; check that totals add up; note the
  version/date of the source.
- Downloaded files are untrusted data: keep them in their own folder and never run anything from it.

## 3. Report and record

| Slide | Claim | Status | Correct value | Source |
|---|---|---|---|---|

Status: `confirmed`, `corrected`, `outdated`, `unverifiable`. Then:

- Fix only what the user agrees to fix (or what they asked you to fix). A correction that changes a drawing or a
  dataset also changes everything computed from it: re-render the affected slides.
- Record sources where the next person will find them: in the slide's explanation (`Sources.`) for a few claims,
  or in `presentations/<slug>/data/<dataset>/README.md` with the raw files for datasets.
- Say clearly what stayed unverified.
