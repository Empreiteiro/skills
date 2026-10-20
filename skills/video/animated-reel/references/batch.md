# Several reels at once

A request for more than one reel ("a few more like this", "one per character") becomes a batch.

## The shape: one producer and one art director per reel, in a pipeline

```
setup.sh → brief in <workspace>/_brief/batch-N.md → workflow:
  pipeline(reels,
    r => producer(r)         // script, voice, art, animation, 2 rounds of stills, motion preview, render, cover, caption
    (p, r) => director(r, p) // adversarial art director: checks the FINAL MP4, the motion, the claims and the caption; fixes and re-renders
  )
→ the main session checks the sheets, rebuilds the gallery and reports.
```

- **Pipeline, not a barrier:** the first reel to finish goes into review while the others are still in production.
- **The brief lives in `<workspace>/_brief/`, not in a scratch folder.** Scratch space can vanish on a restart, and a
  resumed workflow whose prompts point there runs with instructions that no longer exist.
- **One engine, several agents: own files only.** Each agent writes only `src/reels/<id>.*`, `assets/reels/<id>/` and
  `out/<id>/`. Kit, scene, libraries, tools and cast are shared: agents do not edit them; if a piece is missing they
  compose it in their own reel file or report it. Kit fixes belong to the main session, afterwards.
- **The brief says, per reel:** the character, the concept, their real pain (from the profile), the product mechanic
  that proves the concept and which kit piece shows it, the existing art that fits, a suggested new pose and a
  suggested signature line not used in the series yet. The final wording is the agent's, through the project's copy rules.
- **Agents and command guards:** tell them to use literal absolute paths, one command per call, logic in scripts.
- **The director checks the final MP4**, not the producer's stills, and compares it with an approved reel of the same
  character.

## Cost and limits

- A batch of 3 reels on a ready kit (3 producers + 3 directors) took ~2.6 M tokens, ~860 tool calls and ~80 minutes.
  The directors found and fixed real problems every time (a mirrored vignette showing its cut edge, text past x 940,
  a gesture stacked on the speech hop, a sweep washing a whole line, a chat scrolling out of the safe area) and
  re-rendered: the adversarial director pays for itself.
- Building kits and reels from scratch in one batch can cost several times that: ask for economy in the prompts
  (review on contact sheets, generate only the art that is used).
- Images: up to 3 poses per reel, `--n 2` each (~25 s and a few cents per image).
- Rendering: several reels share one GPU; count on a queue.

## After the workflow (the main session)

1. A 1 fps sheet of every delivered MP4, looked at by you (an agent's report does not replace it).
2. `python3 "${CLAUDE_SKILL_DIR}/tools/check.py" <workspace>` and `python3 "${CLAUDE_SKILL_DIR}/tools/gallery.py" <workspace>`.
3. Keep the reusable parts: each reel's `src/reels/<id>.*` and `assets/reels/<id>/*.png` (no `raw/`), a line per reel
   in the series log, new poses into `cast.json`.
4. Clean `engine/out/<id>/` (segments and `video.mkv` pass 1 GB per reel).
5. Report in terms of what the viewer sees: what each video tells, where it is, what is left for the user to decide.
