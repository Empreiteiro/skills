# Augmented-Generation e Gestão de Conhecimento com Grafos

*Augmented generation and knowledge management with graphs* — a talk by Lucas Democh (Data Scientist, Orion) for students and professors
of a computing faculty. The slides are in Brazilian Portuguese.

The talk builds a knowledge graph of the audience's own course (students, professors, disciplines, final
projects, topics) slide by slide, reads it (centrality, communities), shows how GraphRAG and Text2Cypher use
graphs with LLMs, and closes with a real graph of the FACOM faculties built from public curricula.

| | |
|---|---|
| Language | pt-BR |
| Slides | 28 (20 shown, 8 hidden backups: 6, 7, 12, 18, 19, 21, 23, 24) |
| Duration | about 40 minutes plus questions |
| Libraries | D3 7.9.0 (cdnjs), Martian Mono (Google Fonts) |

## Outline

1. **Abertura** (opening) — title, are graphs still useful, the one-sentence rule
2. **O que é um grafo** (what a graph is) — nodes, edges, labels, properties; graphs in everyday apps; ontology; time in edge properties
3. **Lendo o grafo** (reading the graph) — degree and betweenness, communities, Leiden, live community detection
4. **Grafos e IA** (graphs and AI) — augmented generation, RAG vs GraphRAG, how GraphRAG builds and stores the graph, the prompt, local and global search, three ways for an AI to query a graph database
5. **Cypher** — anatomy, four questions about the course, the same question in Cypher and SQL
6. **Fechamento** (closing) — graphs inside AI agents, the FACOM graph, questions

## Presenting

Open `index.html` in Chrome. Arrows/space advance, `S` opens the presenter window with notes and timer,
`O` the overview, `F` fullscreen. `?todos` in the URL includes the hidden slides. This deck uses the older
Portuguese names of the template conventions: `data-oculto` for hidden slides and `aside.explica` for the
presenter explanation.

The text for the sign-up page of a remote session of the talk (title, summary, description and event details, in
Portuguese) is in [`event-description.md`](event-description.md), and a LinkedIn post announcing it is in
[`linkedin-post.md`](linkedin-post.md).

## Data

- The course graph (slides 1–25 and the background of slide 28) is fictional, written in `CURSO` inside `index.html`.
- Slide 27 is real: the mandatory disciplines of the 14 courses of the four faculties called FACOM
  (UFU, UFMS, UFBA, UFJF), taken from the official curricula. Sources, rules and the generator are in
  [`data/facom-curricula/`](data/facom-curricula/).

## Known issues

- The explanations of slides 9, 10 and 16 mention slides 7 and 24, which are hidden.
