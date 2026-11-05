# Queryable sales pitch

A commercial presentation of Queryable (app.queryable.digital) by Lucas Democh, for companies evaluating the product.
The slides are in English.

The pitch is built on three scenarios of the same company: how it works today (information spread across channels,
meetings, documents and isolated systems, with people doing the linking by hand), how it works with Queryable (every
source feeds one organizational memory with internal agents on top of it) and where the product is going, Queryable 2.0
(meetings, conversations, documents and systems happen inside Queryable, around one block of agents and memory).

| | |
|---|---|
| Language | en |
| Audience | decision makers at prospective customers |
| Slides | 11 (10 shown, 1 hidden backup: 10) |
| Duration | about 15 minutes plus questions |
| Libraries | Martian Mono (Google Fonts); no scripts from a CDN |

## Outline

1. **Opening** — title, the problem in one sentence
2. **Without Queryable** — scenario 1: silos, people linking them by hand, stand-alone agents, the outside world,
   three consequences
3. **With Queryable** — scenario 2, what each source becomes, who sees what
4. **Queryable 2.0** — scenario 3 (where the product is going), the three scenarios side by side
5. **Next step** — three steps to start, integrations backup, contact

## Presenting

Open `index.html` in Chrome. Arrows/space advance, `S` opens the presenter window with notes and timer,
`O` the overview, `F` fullscreen. `?all` in the URL includes the hidden slide. Every slide shows all of its content at
once; there are no click-by-click builds. Slides have no titles: the section label at the top names the scenario, and
the content sits centered below it.

## Facts

Product claims come from the Queryable repository (README, INTEGRATIONS.md, CLAUDE.md) as of 2026-11-04.
Scenario 3 (Queryable 2.0) is the product direction, not the current product: today the native parts are channels, DMs
and projects with tasks; in-app calls, a document editor and ERP/accounting modules do not exist yet. The presenter
explanation of slide 7 says so. ERP and accounting have no dedicated connector in scenario 2 either; they come in
through API, webhook or MCP.
