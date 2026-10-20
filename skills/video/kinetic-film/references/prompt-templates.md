# Templates de prompt — os que funcionaram na produção do filme Remark

Três templates, um por fase. Placeholders em `{{...}}`. Estes são os prompts REAIS (adaptados) que produziram o resultado aprovado — a densidade de detalhe é intencional: "pensa você mesmo no prompt, porque se não for nível Apple não vai passar nem perto".

---

## Template 1 — Build DO ZERO (fase 3: head-to-head / base engine)

```
You are a motion director making a kinetic-typography brand film FROM SCRATCH for
{{PRODUTO}} ({{URL}}), {{DESCRIÇÃO-DE-1-LINHA}}. Work ONLY inside {{DIR}} (create it).
The bar is an Apple keynote title sequence — think "Don't Blink" (2016). If a frame
wouldn't survive in an Apple keynote, redo it.

STRICTLY FORBIDDEN — do not open, read, or reference: {{PASTAS-DE-VERSÕES-ANTERIORES}}.
Prior films exist; you must NOT imitate them. Fresh choreography, fresh layout system,
fresh demo mock — from zero.

YOUR THREE INPUTS (nothing else):
1. THE SITE — {{PASTA-DO-SITE}} — this is the visual world of the film. Study the
   design tokens (palette, radius), the fonts (load display face as a TRUE VARIABLE
   font, full wght axis), the official logo animation (your end sting must be THE
   official mark, animated in its spirit), and the site's motion language. The film
   must feel like the site got up and started talking.
2. THE PRODUCT — {{REPO-DO-PRODUTO}} — the real app, WITH ITS NEWEST FEATURES. Read
   README, ROADMAP, git log, the screenshots, and skim components/ to learn what the
   product ACTUALLY does today. Every demo beat must depict a REAL current feature
   with the product's real UI vocabulary (tab names, labels, toggles). Do not invent
   features. If a script beat doesn't match the product exactly, adapt the visual to
   the nearest real feature.
3. THE SCRIPT (verbatim; [word] = the accent-marker treatment; you may alter it
   MINIMALLY if rhythm truly demands, never the meaning):

{{SCRIPT}}

THE CRAFT RULES — obey all (full list in references/GUIDELINE.md; the core):
- Type is the ONLY actor. Every held frame must work as a standalone poster: optical
  alignment, ~140px safe margins, one idea per frame, max two of the three brand
  colors per frame.
- Binary presence. Arrival = stamp: ≤3 frames of settle (outQuint/outExpo), NEVER a
  watchable fade or slide-in. Exit = hard cut or full-frame takeover.
- Tempo is the emotion. Entire film on a BPM grid where one beat is a whole number of
  frames at 30fps. Repetition sections accelerate by musical subdivision. A downbeat
  followed by genuine dead stillness (a full bar) — the stillness IS the punctuation.
- Scale courage. Hero words ~1700px edge-to-edge vs quiet 80–100px lines. Never
  mid-size mush.
- Inversions as percussion. Full-frame accent color only when the marker itself lands
  (2–3 times in the whole film).
- The accent is the protagonist: ONE continuous character across the film (caret →
  marker → selection → highlight → toggle → the mark's stem). Never decorative.
- Reading speed: ≥200ms/word; hero statements 1.2–2s; demo beats 3.0–4.5s,
  locked-camera, ONE action per beat.
- Ending breathes: official logo animation, url in mono, ~2s of quiet ground.
  Total {{DURAÇÃO}}s.

IMPLEMENTATION: copy the engine template from {{SKILL_DIR}}/engine/ (GSAP+SplitText
vendored, variable fonts, export/render.mjs Playwright+ffmpeg, __seek/__duration/
__ready frame-exact contract — all visual state a pure function of t). Replace the
choreography (film.js) entirely; port the helper functions (stamp, marker, measure).
Swap fonts/tokens for the brand's.

DELIVERABLES (verify ALL): out/ad.mp4 1920×1080 30fps H.264; out/stills/ 12+ named
beats incl. 4+ demo beats; READ EVERY STILL BACK as an image; extract encoded-mp4
frames and check them; confirm zero banned patterns (re-stamp zooms, "!", all-caps
shouts, fixed same-size demo panels, bold+highlight). out/music-brief.json (bpm,
bars, hits, silences). Ship SILENT.
```

---

## Template 2 — Exploração em N versões paralelas (fase 4)

Mande N agentes em paralelo, cada um com este prompt + UM conceito diferente.
Conceitos que funcionaram: pushcut (mundo empurrado), camera-world (tela gigante,
só a câmera viaja), word-physics (cada palavra age seu significado), split-ground
(costura papel/tinta), build-break (montar/desmontar), marker-journey (o accent
nunca sai de cena), zoom-chain (dolly contínuo por dentro das letras),
gray-symphony (hierarquia tonal), editorial-grid (spread impresso), stomp (grid
BPM estrito + polish).

```
You are a motion director building VERSION {{NN}} ("{{CONCEITO}}") of a
{{N}}-version exploration of the {{PRODUTO}} brand film. Work ONLY inside
{{DIR}}/v{{NN}}-{{conceito}}. The bar is an Apple keynote title sequence.

BASE ENGINE: copy the winning build first: cp -R {{BASE}}/. {{DIR}}/ — KEEP the
engine, export contract, brand system and QA discipline. REPLACE the choreography
entirely per this version's concept. Delete the copied out/ before rendering.

REFERENCES allowed: {{SITE}}, {{REPO-DO-PRODUTO}}.
FORBIDDEN: every other version directory, all prior tests.

THE SCRIPT — Apple Don't Blink typographic voice: sentence case, periods, NO
exclamation marks, no all-caps shouts. [word] = accent marker treatment.
{{SCRIPT}}

USER FEEDBACK SO FAR — MANDATORY (update a cada rodada com o feedback acumulado):
{{LISTA-DE-CORREÇÕES-DO-DONO}}

TEMPO: cut for "{{MÚSICA}}" ({{BPM}} BPM). Grid in ms (beat {{MS}}ms), each event
rounded to nearest frame at 30fps; expose AUDIO_OFFSET_MS. Ship SILENT.

CONCEPT v{{NN}} — {{CONCEITO EM CAPS}}: {{DESCRIÇÃO DENSA DO CONCEITO — a física,
a câmera, como as transições funcionam NESTE conceito, como o ciclo/repetição
funciona, como o accent se comporta, como a demo entra}}.

DELIVERABLES: out/ad.mp4; out/stills/ 12+ beats; read every still back; extract
encoded frames; confirm zero banned patterns.
```

---

## Template 3 — Montagem final por PORTE (fase 5)

Depois que o dono selecionou momentos no contact sheet (lista `versão @ timestamp`):

```
You are assembling PART {{K}} of the FINAL {{PRODUTO}} brand film by porting the
user's hand-picked moments from {{N}} existing builds into one continuous cut.
Work ONLY inside {{DIR}}/final/part{{K}}. The bar is Apple keynote quality — these
source moments were individually approved by the user; your job is faithful
porting + seamless joining, NOT reinvention.

ENGINE: copy the shared base {{BASE}}. All source versions fork this same engine,
so their film.js code ports almost directly — PORT the actual implementations
(CSS + timeline segments), don't rewrite from memory.

SOURCES you must read and port from:
{{LISTA: versão — momento aprovado (~timestamps) — o device}}

THE CUT (target ~{{X}}s, 1920×1080, 30fps, grid {{BPM}} BPM):
{{SEQUÊNCIA BEAT A BEAT: o que acontece, de qual versão porta, como junta}}

CRAFT RULES: stamps ≤3 frames settle, never fades; ≥200ms/word; centered/optically
balanced; no re-stamp zooms; sentence case, no exclamation, no all-caps; accent
frames only on the biggest hits; marker height derived from computed line-height;
linear ease on any hold ≥2s; the accent must read as one continuous character.
NOTHING EVER SHARES THE FRAME WITH WHAT IT REPLACES.

DELIVERABLES: out/part{{K}}.mp4 (silent); out/stills/ 12+ beats read back; encoded-
frame extraction across the joins; out/music-brief.json; part boundaries: expose
the final state values in a comment so the next part continues from this exact
state (verify the junction frame byte-for-byte).
```

---

## Notas de uso

- **Rodadas de feedback:** o dono responde com screenshots + frases curtas. Cada
  item vira uma linha em `USER FEEDBACK SO FAR` de TODOS os prompts seguintes —
  correção é global.
- **Nunca** mostrar aos agentes as versões antigas na fase do-zero, e **nunca**
  deixar um agente de versão ver as outras versões.
- O agente não declara vencedor. Gera o contact sheet e espera a seleção.
