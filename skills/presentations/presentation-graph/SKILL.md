---
name: presentation-graph
description: Build or change graph slides (nodes and edges drawn with D3) in an HTML presentation — data model, deterministic layout, labels that stay legible, tooltips, communities and centrality, and graphs built from real data. Use when a slide shows a network, knowledge graph, ontology or any node-link drawing.
---

# Graph slides

Reference implementation: `presentations/knowledge-management-with-graphs/index.html` in the `Empreiteiro/skills`
repository (from an installed plugin: `${CLAUDE_SKILL_DIR}/../../../presentations/knowledge-management-with-graphs/`).
Look for `CURSO`, `FACOM`, `layout`, `class GrafoCurso`, `louvain`, `intermediacao`.

## Data

- Keep each dataset in one place at the top of the script: `nodes [{id, tipo|type, nome|name, rot|label, props}]`,
  `links [{source, target, tipo|type, props}]`. Edge properties carry facts that change over time
  (`{from: 2021, until: 2024}`) or context (`{semester: 3}`).
- Real data comes from files under `presentations/<slug>/data/<dataset>/` (raw JSON with sources + a generator).
  The generator prints the block that goes into `index.html` and has a `--check` mode that fails when the HTML
  no longer contains exactly that block.
- Entity identity is a modelling decision: say it explicitly in the data README. Example: the same discipline in
  several courses of one university is one node (same code, or same name and same offering unit); the same name at
  two universities is two nodes.

## Layout

- d3-force is deterministic for the same input: compute the layout once per dataset, cache it, and reuse it on
  every slide that shows the same graph, so the drawing does not jump between slides.
- Any change to the data changes communities, bridges and the layout of every slide using it. Re-render those
  slides and compare before/after (`presentation-check-visual`).
- Small graphs (< ~80 nodes): one simulation with link, charge, collide (radius from the label width) and a weak
  pull towards a per-community anchor.
- Large graphs (hundreds of nodes): lay out each cluster separately, place the clusters on a grid that fits 16:9,
  put bridge nodes in the gaps between the clusters they join, and separate label boxes on every tick
  (rectangle overlap, preferring horizontal moves on a wide slide). Draw labelled nodes above the others.

## Legibility

- When the user asks for a graph *on a slide*, it must be readable: a faded background graph does not count.
- Label structural nodes always; leaves (students, disciplines, documents) show their name on hover. Labels at
  least ~18px at 1920 width, with a halo (`paint-order: stroke`) in the background color.
- Size by degree, color by node type (or by community when that is the point of the slide). Tooltips show the
  type and the properties. Nodes can be dragged.
- Check every graph slide with a 1920×1080 render; narrow preview panes hide overlap problems.

## Algorithms already in the reference deck

Louvain with resolution (communities), Brandes betweenness (bridges), degree, "what breaks if this node leaves"
(impact), grouping nodes by community with non-crossing hulls. Reuse them instead of rewriting.
