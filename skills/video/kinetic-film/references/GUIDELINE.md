# Guideline — Vídeo Kinetic Typography para SaaS
Destilado da produção do filme Remark (ago/2026): 2 sessões, ~190 mensagens de direção, 10 versões paralelas, 7 rounds de QA, filme final de 76.9s. Fontes: as mensagens de correção do dono, o código do corte final (com os comentários de direção), as 10 versões exploratórias e os skills de motion.

---

## 1. Stack vencedora

- **Engine: kinetic-typography-skills** (repo GitHub → skill) — venceu o head-to-head contra o MCP kinetic-video-creator:
  - Um único `index.html` auto-contido, stage fixo 1920×1080.
  - **GSAP + SplitText vendorizados** (sem CDN), fontes variáveis locais, split só depois de `document.fonts.ready`.
  - **Uma master timeline pausada** — todo estado visual é função pura de `t`. Um driver só (nunca CSS keyframes + GSAP juntos).
  - Contrato de export: `window.__seek(ms)` / `__duration` / `__ready`.
- **Render frame-exact:** Playwright pisa a timeline frame a frame → PNGs → ffmpeg H.264 yuv420p 30fps. Nada em tempo real. Flags: `--stills-only`, `--range`, `--audio`.
- **Ruído determinístico:** qualquer aleatoriedade (crumble, explosão) usa seed fixa — render idêntico em toda run.
- **Medição em build time, nunca número mágico:** altura do marker vem do line-height computado + canvas measureText; distâncias de saída são *resolvidas* pra limpar o quadro; alvos de câmera são medidos no estado exato do DOM em que serão filmados.
- **QA automatizado no engine:** `__overlaps` (pares de caixas que colidem), checagem de frames duplicados no encode (motion morto), verificação byte-a-byte do frame de junção entre partes.
- O MCP kinetic-video-creator perdeu; sobreviveram dele: variação tonal de cinza e frases inteiras na tela. Do Remotion (creativly) sobreviveu só o red-edge wipe.

## 2. O processo que funcionou

1. **Nomear o gênero e a barra.** "Kinetic typography", referência Apple **Don't Blink (2016)**. No prompt: "se um frame não sobreviveria num keynote da Apple, refaz".
2. **Melhorar vídeo existente NÃO funciona** — agentes só refazem o mesmo. **Do zero**, com 3 inputs limpos: (a) o site (tokens, fontes, logo animado); (b) o produto real (repo, screenshots, features atuais); (c) o script verbatim. Proibição explícita de ver versões anteriores.
3. **Head-to-head de 2 engines do zero** → vencedor vira base → **10 versões paralelas**, cada uma com UM conceito de física/câmera, todas forkando o mesmo engine (o código dos momentos portáveis entre elas).
4. **Contact sheet interativo:** frames a cada ~0.3s, tabs por versão, clique-seleciona, exporta lista `versão @ timestamp`. O dono escolhe MOMENTOS, não versões. O agente nunca declara vencedor.
5. **Montagem por PORTE de código** (CSS + segmentos de timeline dos momentos escolhidos), nunca reescrita de memória. Em 2 partes paralelas, com frame de junção verificado.
6. **Rounds de QA por screenshot** até zerar; cada correção aplicada globalmente.

---

## 3. Catálogo de devices (o vocabulário completo)

### Chegada e saída de texto
- **stamp** — chegada binária: `display none→block` + squash de ≤3 frames (`scaleY .98→1`, expo.out, origem na baseline). "A letra é ASSENTADA, não jogada." Nunca um fade assistível.
- **arrive** — variante com `visibility` (não `display`) quando a linha esperando a vez precisa ocupar seu slot — a composição nunca se re-centraliza sob si mesma.
- **push / pushcut** — um elemento entra empurrando o outro pra fora pela borda oposta; o que sai vai MAIS rápido do que o que entra assenta (é assim que o impacto lê).
- **nudge / displacement pair** — a linha nova entra E desloca a vizinha NO MESMO tween (mesmo timing, mesma ease). É o que faz parecer que uma empurrou a outra em vez do bloco "crescer".
- **strike-up** — a cena inteira é golpeada pra cima e pra fora (`power2.in`, ~10 frames) antes da próxima entrar.
- **crumble** — as letras se soltam uma a uma, tombam com rotação e afundam abaixo da baseline (ruído com seed).
- **blast** — todas as letras explodem do centro: ângulo real de cada glifo a partir do centro, magnitude proporcional à distância (o campo não abre buraco no meio), viés de gravidade no spray, velocidade constante, sem volta e sem pouso.
- **echo (repetição em profundidade)** — a palavra re-entra N vezes em offsets crescentes e tons descendo em direção ao fundo — lê como "a mesma palavra acontecendo de novo", não como drop shadow. (O tom vai no elemento interno, nunca no wrapper.)
- **type-on por palavra** — cada palavra um set de duração zero, passos uniformes ao longo do hold — a frase está sempre CHEGANDO, nunca pronta e parada.
- **type-on por letra** — reservado (ver semântica §4): no filme inteiro, só o wordmark é digitado letra a letra.
- **clip em degraus** — um único text run revelado palavra a palavra por `clip-path inset` em sets de duração zero (medido por Range sobre o nó de texto). Sem spans = shaping e centralização idênticos aos de uma linha normal.
- **concertina** — letras entram em sanfona atrás da primeira, durações crescentes.
- **lens exit** — a headline sai PELA lente (`scale 3+`, power2.in) enquanto o que vem toma o quadro no mesmo beat.

### Ênfase
- **marker de dois estágios** — (1) o caret cruza a palavra desenhando um filete fino (~0.09em) rente à baseline; (2) o filete SOBE e vira bloco cheio, borda inferior imóvel; a cópia em papel é desclipada DE BAIXO PRA CIMA, na mesma ease — "porque é dessa direção que o vermelho chega". Regra absoluta: **o marker DESCOBRE, não troca** — a palavra é composta 2×, tinta e papel por cima, e cada frame mostra metade coberta/metade não alcançada.
- **tonal lift** — a palavra-chave sobe a escada de cinza até tinta cheia ENQUANTO a linha de apoio recua — a ênfase se faz também apagando o resto. (Usar com parcimônia; no corte final virou "um cinza só", ver §6.)
- **re-assentar letra a letra** — os chars da palavra caem de `y:-10` a 0 em 3 frames escalonados: destaque por MOVIMENTO quando cor e bloco já estão ocupados.
- **ritmo como ênfase** — a punchline chega em duas peças com um beat de nada no meio ("not — pausa — reviewing."): quebra o padrão das linhas que chegam inteiras, sem device novo.
- **weight punch (variável 300→900)** — existe no vocabulário mas foi REJEITADO no corte final: "em tamanho grande, mudança de peso não lê como a mesma palavra mais alta — lê como outra fonte chegando no meio da frase". Usar só em tamanho pequeno/médio, se usar.

### O accent como personagem (a cadeia do vermelho)
- **caret vivo** — pisca no beat, nunca some sem motivo; SALTA (set, nunca tween) pra depois da letra recém-escrita — "um tween aqui é um highlight se movendo, não um cursor digitando"; desliga poucos frames após a última letra — "senão a marca vira um campo de texto onde alguém parou de digitar".
- **hop / metrônomo** — o ponto vermelho pula palavra a palavra: X linear, Y parabólico (power2.out subindo, power2.in caindo); o tempo de voo é a subdivisão, a aterrissagem é a batida; sempre NA FRENTE do tipo (z-index); conta sempre PRA FRENTE; sai caindo do quadro com distância resolvida — não é "desligado".
- **flood / takeover** — o bloco do marker abre por `clip-path` da caixa medida da palavra até o quadro inteiro: "o bloco não para — ele VIRA o quadro".
- **strike desenhado** — uma barra por line box, `width 0→real` da esquerda pra direita (line-through não anima; "um risco que simplesmente ESTÁ lá é estado, não gesto — o vermelho deste filme chega sendo DESENHADO").
- **accent bar itinerante** — UMA barra vermelha desce a lista de cards: transit de 8 frames entre itens + track linear soldado à câmera em movimento. E FICA no último item — voltar ao topo é "um movimento sem nada por trás: o olho segue esperando um motivo e não há".
- **wipe de aresta** — linha vermelha fina varre e limpa o quadro pro ground oposto.
- **sting final** — o flood colapsa por clip-path EXATAMENTE na caixa do stem do logo → as barras se desenham escalonadas (scaleX, origem esquerda) → wordmark por último → url em mono ("o último movimento do filme, e é quase nada") → ~2s de papel quieto. O vermelho nunca corta: ele VIRA o logo.

### Câmera e ground
- **inversão de ground (papel↔tinta) como percussão** — amarrada ao beat; seca (1 frame) nos hits, ou cruzada em ~9 frames sob movimento rápido (nunca lenta: no meio de uma inversão lenta, fundo e tipo se encontram no mesmo cinza e as letras somem — "a transição apagando o próprio sujeito").
- **drift / sustain LINEAR** — creep contínuo (`ease:'none'`) sob todo hold longo de produto: um ease-out gasta o movimento no primeiro terço e congela exatamente a metade em que se está lendo. MAS: em cenas tipográficas curtas o creep subpixel foi REMOVIDO no corte final — "um hold tem permissão de ficar parado. Cinema segura parado."
- **zoom-through** — mergulho contínuo pra dentro da prosa/palavra (`power2.inOut`), nunca re-stamp em outro tamanho; o chrome do app faz fade DURANTE o mergulho ("ele era a prova de que isso é um app, e esse trabalho termina no momento em que estamos dentro da prosa").
- **drop-on** — a câmera CAI sobre a folha (scale 0.84→1) em vez de a folha subir — usado justamente pra NÃO repetir o gesto de entrada da cena anterior.
- **punch-zoom** — macro entra de scale ~0.2→1 no detalhe (bracket, toggle, card).
- **band wipe** — o app entra no quadro banda a banda por clip-path (head, toolbar, doc, rail) — nunca por escala (escalar um painel espreme o tipo dentro dele).
- **dock** — peças do chrome assentam em cadência fixa, sempre uma travando.
- **demote** — a headline faz UMA transform contínua até virar caption pequena no topo — e é ISSO que tira ela de cena quando o produto entra.
- **dead stop** — um compasso inteiro (ou dois) de imobilidade genuína. Constrói-se pela AUSÊNCIA do device dominante do filme (o dolly para, o vermelho para, a costura congela). Só um caret bate no fim.

### Conceitos de câmera inteiros (pra variar entre filmes)
- **camera-world**: o filme é UMA tela gigante montada no espaço; nada entra nem sai — só a câmera viaja (o caminho da câmera É a montagem).
- **zoom-chain**: um dolly contínuo; cada cena termina mergulhando num detalhe com geometria interior (o buraco de uma letra, um bloco, um knob) que ABRE na cena seguinte — mirar no ponto mais gordo do contra-forma, não no centróide.
- **split-ground**: uma costura de semiplano divide papel/tinta e dirige tudo — palavras a cavalo da costura, produto que sai de dentro dela.
- **editorial-grid**: o filme é um spread impresso — réguas que se escrevem, capítulos numerados em mono, a figura re-recortada a cada beat (nunca 2 beats com a figura no mesmo tamanho).

---

## 4. Animação semântica — a forma imita o que está sendo dito

A regra-mãe: **cada palavra-chave ganha o device do seu próprio significado, executado UMA vez.** Exemplos reais do filme, como receita:

1. **"copy"** → a palavra se CLONA no beat (cópias deslocadas, cada vez mais apagadas, contador ⌘V ⌘V…).
2. **"paste"** → mais uma tacada POR CIMA, com squash forte.
3. **"explain"** → se DIGITA com passos irregulares e cansados, caret esperando piscando; nos ciclos seguintes digita cada vez mais rápido (a explicação virando mecânica).
4. **"again"** → acontece DE NOVO: eco ×7 em profundidade, ou o quadro leva um chute e o ciclo re-roda.
5. **"obvious"** → marcar a palavra é o que a torna óbvia (o marker é a prova).
6. **"lost"** → as letras se SOLTAM e caem (crumble) — a frase perde as próprias partes.
7. **"scroll"** → a tela SCROLLA: coluna de 15 "scroll" subindo, zoom contínuo pra dentro de uma, o resto se perdendo por fade ("the rest of it is lost"), os dois "l" virando rastros de tinta escorrendo.
8. **"suddenly"** → aparece DO NADA, palavra inteira, com um frame vazio antes ("o frame vazio na frente é o que dá o drop").
9. **"prompting"** → re-batida letra a letra, como teclas.
10. **explosão antes da solução** → o mundo do problema é DESTRUÍDO (blast + compasso de silêncio) pra abrir espaço pra marca. Atenção à lição do corte final: a marca montando DOS DESTROÇOS foi rejeitada — "é um quebra-cabeça se resolvendo, não uma afirmação sendo feita". Destrói-se o problema; a marca chega LIMPA.
11. **REMARK** → é ESCRITO, letra a letra, pelo caret — o único type-on por letra do filme: "em qualquer outro lugar, digitar seria uma máquina soletrando; aqui é a marca sendo escrita".
12. **"auto-completes"** → a própria frase se auto-completa: "It auto-" + caret piscando + a palavra "completes." chega sozinha. O período do blink é calculado pra última fase ACESA coincidir com o frame da chegada (senão os dois eventos lêem como não relacionados).
13. **"only that"** → só aquela frase carrega marca; as vizinhas NÃO são tocadas (escurecer o resto "diz a mesma coisa uma quarta vez, na única língua que o espectador lê como defeito").
14. **"inline"** → o card abre INLINE, com a frase ainda na tela — o único beat de produto cuja frase permanece, "porque o mecanismo É uma frase sendo respondida".
15. **"remarkable"** → o gesto de marcar (re-mark) escala até engolir o filme: marker → flood → stem do logo. A marcação VIRA a marca.
16. **O filme rima consigo mesmo** — o eco do "again" (problema, sobre tinta, tons descendo pro escuro) é RESPONDIDO pelo eco do "you" (payoff, sobre papel, tons subindo pro claro): mesmo device, direção tonal oposta, uma vez de cada lado. E o sting verbal repete a forma exata do cold open (linha forte + linha muda com uma palavra subindo).

---

## 5. Gramática de transições

1. **Hard cut é o default absoluto** (21 dos cortes do filme final). Qualquer outra transição precisa de motivo.
2. **NADA divide o quadro com o que substitui.** A regra de ouro, escrita em caps no código. Duas coisas se cruzando em direções opostas "não é transição, é colisão". Sequência correta: saída sozinha → 2–3 frames de quadro VAZIO → entrada. O beat que isso custa vale a pena.
3. **Exceção única e proposital:** UM cruzamento sobreposto no filme inteiro (a linha nova subindo por baixo enquanto a composição antiga sai por cima) — "pro quadro nunca estar vazio E parado" no momento da virada de ato. Um por filme.
4. **Nunca a mesma transição em cenas consecutivas** — exceto quando a repetição É o conteúdo (o ciclo copy/paste/explain/again: 7 hard cuts seguidos acelerando; a repetição da transição é a mensagem). Fora isso, alternar: se a cena passada subiu por baixo, a próxima a câmera CAI sobre ela (drop-on) — "duas entradas iguais seguidas lêem como um loop, não como dois eventos".
5. **Transição contextualizada:** o gesto de saída pertence ao conteúdo. A explosão fecha a seção do problema; o zoom entra pela palavra que fala de entrar; o strike-up leva a frase que acabou de cumprir seu papel; a coluna de scroll SAI scrollando.
6. **O corte pertence ao que VEM.** "O fim de cena é um JOIN, não um evento" — puxar o corte um beat mais cedo se a próxima cena precisa dele.
7. **Padrão da parte de demo:** frase entra por corte/stamp → produto entra por GESTO (strike-up + enter, drop-on, band wipe, punch-zoom) → e o gesto nunca se repete entre beats.
8. **Inversão de ground é transição E percussão:** seca no hit, junto do corte. Contando o filme final: 25 inversões, quase todas em 1 frame.
9. **Saídas caem com física coerente:** o que é tinta escorre pra BAIXO ("tinta sai do jeito que tinta sai"); o que foi empurrado sai pela borda oposta à entrada; distâncias resolvidas pra estar FORA no último frame visível — nada "quase sai e volta".
10. **Takeover como clímax:** os dois últimos beats do filme não cortam — são takeovers contínuos (flood → tela → stem). Guardar o takeover pro fim.
11. **Match cut / a emenda invisível:** o frame de saída e o de entrada compartilham os mesmos pixels (o interior da letra é o ground da próxima cena; a régua vermelha vira a linha entre as duas frases seguintes). É a transição mais forte que existe — cara de fazer, usar nos momentos-chave.
12. **Elementos ao redor participam da transição:** quando o controle sobe, a frase é CARREGADA pra cima no mesmo ease ("um movimento só, pra lerem como um pensamento e não dois slides").

---

## 6. Economia e restrição (o que separa profissional de enfeitado)

1. **Um device de ênfase por palavra.** Cor em força total OU bloco vermelho OU movimento — nunca dois. (A correção mais repetida do dono: "bold + highlight DE NOVO?!")
2. **Um device por significado, usado UMA vez.** O blast acontece 1×. O crumble 1×. O eco 2× porque é uma rima deliberada. Repetir um device forte o desvaloriza.
3. **Orçamento de vermelho declarado:** marker nas palavras-chave + 3 floods de tela cheia no filme INTEIRO (o slam do ciclo, "human"/turn, "remarkable"/fim). O vermelho nunca decorativo.
4. **Vermelho = a mão, verde = a máquina.** O vermelho faz o que o humano faz (selecionar, riscar, marcar); o verde responde (reescrita, ticks, toggle). O único beat sem NENHUM vermelho é o beat em que a máquina trabalha sozinha.
5. **Um cinza só.** O corte final abandonou a escada tonal: uma palavra é muda ou é tinta. Sem extremidades pálidas (o dono rejeitou o "cinza clarinho" em toda aparição).
6. **O eixo de peso não se move** em tipo grande (weight punch rejeitado — "lê como outra fonte chegando").
7. **Uma coisa pulsa no filme inteiro:** o ponto verde da máquina trabalhando — "porque uma máquina trabalhando é a única coisa em tela que DEVE parecer que se repete".
8. **Hold parado é permitido.** O creep subpixel "abaixo do limiar onde movimento lê como movimento e acima do limiar onde arredondamento lê como ruído" foi removido. Ou o movimento é legível, ou é zero.
9. **Exatamente um momento "wow" por peça** — o segundo cancela o primeiro. Um dead stop por filme. Uma detonação.
10. **Máximo 2 eases na peça:** um "in" (saídas), um "out" (entradas). Linear reservado a drifts/sustains contínuos. A terceira curva "precisa justificar a existência".
11. **Consistência é confiança:** reusar o vocabulário estabelecido; a variedade permitida é de RITMO e densidade de corte ao longo do arco, não de vocabulário novo a cada cena.
12. **Cortar o esperto em favor do claro:** a remontagem da marca a partir dos destroços era engenhosa e foi deletada. "Clever" que compete com a mensagem perde.

## 7. Timing e leitura

1. **Grid de BPM:** beat = número inteiro de frames a 30fps (111 BPM = 16.22 frames/beat; arredondar CUMULATIVO por evento, senão acumula drift). Cortar em frases musicais (2/4/8 beats), não em cada beat.
2. **Aceleração por subdivisão:** semínima → colcheia → semicolcheia → o estrobo final de 2 frames/palavra só é permitido porque as palavras "já foram lidas quatro vezes e agora estão apenas sendo contadas".
3. **Pisos de leitura:** ≥200ms/palavra; heroes 1.2–2s; beats de demo 3.0–4.5s (tem prosa pra ler). Na dúvida, mais tempo — "muito pouco a mais já ajuda".
4. **Inserts de leitura como estrutura:** o corte final tem uma tabela de 9 pausas (~8.8s no total) inseridas nos pontos onde há o que ler — a maior (3.7 beats) na resposta da AI, "a coisa mais longa que alguém tem que ler". Tweens escritos em beats ESTICAM através do insert (o dolly continua rastejando); tweens em frames crus mantêm velocidade.
5. **Nada anima o que está sendo lido:** número faz ease até o valor e SEGURA; a legenda entra depois que o count termina; texto em leitura não loopa.
6. **Micro-timing importa e é calculado:** o período do caret escolhido pra fase acesa coincidir com o evento; o clique PRESSIONA por 2 frames antes do efeito ("um clique que é só mudança de estado não é um clique — o botão leva o aperto ANTES de algo acontecer por causa dele"); duas passagens resolvem EM TURNO, não juntas ("duas coisas resolvendo juntas é mudança de estado; em turno é trabalho sendo feito").
7. **O arco obrigatório:** Establish (respira) → Develop (encurtando) → Climax (1–2 beats por corte) → Resolve (um hold longo). Ritmo uniforme do começo ao fim = filme plano.

## 8. Tipografia

1. **UMA fonte-herói definida cedo e usada no filme inteiro** — a mesma fonte errada foi corrigida "30 vezes". Consistência de fonte+tamanho+cor entre cenas equivalentes é a correção nº 1 de toda a produção.
2. **Voz Apple:** sentence case, ponto final, zero exclamação, zero all-caps fora do wordmark.
3. **Coragem de escala:** heroes ~1700px de tinta, linhas quietas 80–100px, nada no meio. Banido o "sanduíche" (gigante no meio esmagando as linhas da própria frase). Frases inteiras na tela são bem-vindas (com hierarquia interna).
4. **Centralizado ótico por padrão** (alinhar à tinta dos glifos, não às caixas); deslocamentos derivados das composições medidas, não chutados; padding simétrico título/texto/bottom; checks centralizados entre os vizinhos.
5. **Tudo que parece poster tem que funcionar parado:** um frame segurado = um poster (uma ideia, 2 das 3 cores no máximo, margens ~140px).
6. **Sem tipo capilar** e sem elemento decorativo que não veio do script.

## 9. Demo do produto

1. **Typography primeiro, produto depois** — cada beat abre como frase full-screen na voz do filme; o elemento de UI entra em seguida por um mecanismo que NUNCA se repete entre beats.
2. **BANIDO: painel de screenshot fixo do mesmo tamanho repetido** ("quebrou total o clima" — o erro nº 1).
3. **Disciplina de foco:** quando um elemento importa, o resto sai/esmaece/desmonta — mas SÓ com motivo diegético. Não escurecer texto "comum" sem razão ("lê como defeito de render, não como foco"). O chrome do app some quando seu papel acabou.
4. **Mostrar a AÇÃO com causa:** press de 2 frames no botão → depois o efeito; progresso linear + ponto pulsando; resolves em turno; toggle flip no frame exato em que assenta; toggle empurrando o texto ao subir.
5. **Só feature real** — ler o repo, screenshots, roadmap; adaptar o visual à feature real mais próxima, nunca inventar.
6. **Nenhum beat de demo é parado:** cursor viajando, caret piscando, ghost se escrevendo, ticks estampando, barras enchendo, creep linear da câmera.
7. **O cursor nunca atravessa o que está sendo lido** — entra pelo papel vazio abaixo/ao lado do alvo.
8. **Copy do mock é escrita de verdade** (uma prosa coerente que evolui pelos beats) — o espectador lê; lorem ipsum ou frases desconexas quebram.
9. **Card dark se o fundo é dark.** Elementos que perderam a função (chrome, barras, cursor) fazem fade discreto ao final do próprio beat, não permanecem.

## 10. Música

- Track real escolhida pelo dono (Stony Pony — Banana, ~111 BPM). O filme é cortado NO grid do BPM antes de a música existir no arquivo.
- Render sempre SILENCIOSO + mux via `--audio`; `AUDIO_OFFSET_MS` exposto; `music-brief.json` com bpm, compassos, hits e o compasso de silêncio.
- O dead stop é silêncio na música também. Slow-mo sincronizado com efeito musical.

## 11. Como receber e aplicar correção (meta)

1. **Feedback vem como screenshot + frase curta.** Corrigir exatamente aquilo, sem justificar.
2. **Toda correção é global:** feedback numa cena = regra do filme inteiro; nunca reaplicar estilo já rejeitado em outra cena.
3. **Não pedir permissão toda hora** pra operações no próprio workspace.
4. **QA antes de mostrar:** ler de volta 12+ stills como imagem, extrair frames do MP4 ENCODADO (não só os PNGs), rodar os checks automatizados (overlaps, frames duplicados, junção byte-a-byte), checar a lista banida.
5. **Conflitos na lista de momentos escolhidos:** perguntar qual usar — decisão do dono; o resto executa.
6. **Documentar a intenção no código:** os comentários de direção ("por que este device e não aquele", "o que foi testado e rejeitado") foram o que permitiu portar, juntar e corrigir sem regressão. Comentários obsoletos (descrevendo código removido) causaram confusão — apagar junto com o código.

## 12. Checklist banido (reprovação automática)

1. Fade/slide assistível em entrada de palavra.
2. Re-stamp zoom (sumir e voltar maior) ou micro-zoom imperceptível.
3. Bold + highlight juntos; dois devices de ênfase na mesma palavra; bold em mais de 1 palavra por frase.
4. Exclamação; all-caps fora do wordmark; capitalização errada.
5. Painel de demo fixo repetido; feature inventada; fade sem motivo diegético.
6. Duas coisas dividindo o quadro na troca (colisão); mesma transição em cenas consecutivas sem intenção.
7. Elemento sobrepondo outro; highlight regredindo; "quase sai e volta"; piscada extra; freeze no meio de slow-mo; caret atrás da letra escrita ou vivo depois do fim.
8. Movimento sem motivo (barra que volta ao topo, ponto que retorna ao início, zoom que ninguém percebe).
9. Texto principal em cinza claro; fonte/tamanho inconsistente entre cenas equivalentes.
10. Cena de demo que não dá tempo de ler; número/texto animando enquanto é lido.
