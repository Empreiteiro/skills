---
name: kinetic-film
description: "Cria um brand film de kinetic typography nível Apple 'Don't Blink' para um SaaS — engine GSAP + render frame-exact (Playwright+ffmpeg), processo de versões paralelas + seleção de momentos por frame + montagem final por porte de código. Use para: brand videos, ads tipográficos, product films. Baseado no processo que produziu o filme do Remark."
argument-hint: "[produto] [script ou brief]"
---

# Kinetic Film — brand film tipográfico para SaaS

Processo completo validado na produção do filme Remark (ago/2026). Leia
`references/GUIDELINE.md` ANTES de escrever qualquer choreografia — ele contém o
catálogo de ~45 devices, as regras de animação semântica, a gramática de
transições e o checklist banido. `references/prompt-templates.md` tem os prompts
reais das 3 fases. `references/reveal-recipes.md` tem as receitas base de reveal.

## O que este skill NÃO é

Não é o kinetic-video-creator (TTS + música gerada + Remotion). Aquele perdeu o
head-to-head. Este usa o engine GSAP frame-exact e música REAL escolhida pelo dono.
Se o pedido envolver narração/voz, aí sim considere o kinetic-video-creator para a
trilha de voz — o visual continua sendo deste engine.

## Inputs obrigatórios (e nada além deles)

1. **O site do produto** — tokens de design, fontes, logo animado. O filme deve
   parecer "o site que levantou e começou a falar".
2. **O repo/app real** — features ATUAIS, vocabulário real de UI. Nunca inventar.
3. **O script** — o dono escreve ou aprova; `[palavra]` = tratamento de marker.
   Alteração mínima permitida, nunca o sentido.
4. **A música** — track real com BPM conhecido. Todo o filme corta no grid do BPM.

## O engine (engine/)

Template pronto: `index.html` (stage 1920×1080, GSAP+SplitText em `vendor/`,
fontes variáveis em `fonts/` — TROCAR pelas da marca), `film.js` (a choreografia
de referência do Remark — substituir inteira, PORTAR os helpers: stamp, marker,
medição de tinta, ground), `export/render.mjs` (Playwright pisa `__seek(ms)`
frame a frame → PNGs → ffmpeg H.264; `--stills-only`, `--range`, `--audio`).

Setup por build: `cp -R "${CLAUDE_SKILL_DIR}/engine/." <dir>/ && cd <dir> && npm install`.
Contrato inegociável: todo estado visual é função pura de t; `__ready` só após
`document.fonts.ready`; aleatoriedade só com seed fixa; medições em build time.

## O processo (6 fases)

1. **Brief**: produto + script + música + barra ("se não sobreviveria num keynote
   da Apple, refaz"). Definir a fonte-herói e o papel do accent AGORA (são as
   correções mais caras de fazer depois).
2. **Build do zero** (Template 1): 1–2 agentes, inputs limpos, PROIBIDO ver
   qualquer versão anterior. Mostrar ao dono, colher feedback.
3. **Exploração paralela** (Template 2): N versões (o Remark usou 10), cada uma
   forkando o engine com UM conceito de física/câmera diferente. Agentes cegos
   entre si. Feedback acumulado do dono entra em TODOS os prompts.
4. **Seleção**: renderizar frames, gerar o picker com
   `node "${CLAUDE_SKILL_DIR}/tools/contact-sheet.mjs" sheet.html v01=<frames> ...`, abrir no Safari.
   O dono seleciona MOMENTOS (`versão @ timestamp`) — o agente NUNCA declara
   vencedor. Conflitos de timeline: perguntar qual usar.
5. **Montagem final** (Template 3): 2 partes em agentes paralelos que PORTAM o
   código dos momentos aprovados (nunca reescrever de memória). Junção verificada
   byte a byte. Rounds de QA por screenshot até zerar — cada correção aplicada
   GLOBALMENTE.
6. **Música e entrega**: concat das partes, mux com `--audio`, `AUDIO_OFFSET_MS`,
   `music-brief.json`. Abrir o resultado pro dono (Safari/QuickTime), nunca só
   dizer que está pronto.

## QA antes de mostrar qualquer coisa (obrigatório)

- Ler de volta 12+ stills nomeados por beat COMO IMAGEM.
- Extrair frames do MP4 ENCODADO (não só os PNGs) nos trechos críticos.
- Checar: overlaps de caixas, frames duplicados em holds (motion morto), o
  checklist banido do GUIDELINE §12 (re-stamp zoom, bold+highlight, "!",
  all-caps, painel de demo repetido, colisão de transição...).
- Tempo de leitura: nenhum texto que não dê pra ler. Na dúvida, mais tempo.
