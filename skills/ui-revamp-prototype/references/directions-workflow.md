# Fan-out workflow for Phase 0 and Phase 2

For the Workflow tool, when SKILL.md's threshold applies (4+ directions, or a surface with many consumers or
states). Drop the anchoring agents that do not apply (no AI on the surface, no cost agent; no analytics, no
tracking agent), and size `AXES` to the number of directions.

```js
// FACT / DIRECTION / CRITIQUE are JSON Schemas you define at the top of the script: they make each agent
// return a validated object instead of prose. DIRECTION matters most:
// { thesis, axis, solves: [pin numbers], components: [], behavior: [], cost, risk, dependencies }.
export const meta = {
  name: 'revamp-prototype-directions',
  description: 'Anchor in the code and generate N revamp directions with independent theses',
  phases: [
    { title: 'Anchor',     detail: 'what the code and the data allow' },
    { title: 'Directions', detail: 'one thesis per agent, blind to each other' },
    { title: 'Critique',   detail: 'do the theses really disagree?' }
  ]
}

// Put `phase:` on EACH agent inside parallel: a global phase() races when agents finish out of order,
// and progress shows up under the wrong group.
const A = { phase: 'Anchor', schema: FACT }
const facts = (await parallel([
  () => agent('Which component renders "<text from the screenshot>"? String key and file.', { ...A, label: 'component' }),
  () => agent('Which tables and columns does this surface read and write, in every schema variant? Which are derived, nullable or gatekeepers?', { ...A, label: 'data' }),
  () => agent('Who consumes the component, and how many paths already perform this same act today?', { ...A, label: 'consumers' }),
  () => agent('Which tracking events does this surface fire, from where, and which dashboard number do they feed?', { ...A, label: 'tracking' }),
  () => agent('Which AI calls does this surface start, under which usage or billing name, and how many per gesture?', { ...A, label: 'cost' })
])).filter(Boolean)

const AXES = ['hierarchy', 'edit mode', 'reframing', 'temporal structure', 'density']
const directions = (await parallel(AXES.map((axis, i) => () => agent(
  `Direction ${i + 1}, axis "${axis}". Facts from the code: ${JSON.stringify(facts)}.
   Propose ONE thesis about what the problem with this surface is, and the design that follows from it.
   Declare the behavior contract of every new affordance.
   You cannot see the other directions: diverge instead of trying to cover everything.`,
  { phase: 'Directions', label: `thesis:${axis}`, schema: DIRECTION, effort: 'high' }
)))).filter(Boolean)

// Deliberate barrier: the critic compares the theses WITH EACH OTHER, so it needs all of them.
const critique = await agent(
  `Do these directions disagree about WHAT THE PROBLEM IS, or are they skins of one idea?
   ${JSON.stringify(directions)}
   Name pairs that fix the same pins by the same mechanism: one of each pair should not exist.
   Also name every affordance without a declared behavior contract, and every direction that
   multiplies AI calls per gesture without saying so.`,
  { phase: 'Critique', schema: CRITIQUE, effort: 'high' }
)

return { facts, directions, critique }
```
