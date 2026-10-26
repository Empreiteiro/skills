# Review editor prompt

Prompts that build a review editor for a deck as a private Artifact on claude.ai: slide images, a live view,
comments pinned to a point of the slide, and a button to hide slides. The first prompt creates the editor; the
second resolves the open comments. Replace `<slug>` with the deck folder and `<tema>` with its name. The prompts
are in Portuguese, the language the reviews are written in.

The editor for the graphs deck was built this way:
[Revisão dos Slides de Grafos](https://claude.ai/artifact/MJHciWHH51G6L8fuWrpmpn) (private).

## 1. Create the editor

```text
Crie um editor de revisão para a apresentação `presentations/<slug>/index.html`, como um Artifact privado no claude.ai chamado "Revisão dos Slides de <tema>". A ideia: eu reviso o deck clicando nos slides e deixando comentários presos ao ponto exato, e depois peço para você resolver os ajustes abertos.

Arquivos do artifact:
- `slides/NN.jpg`: imagem final de cada slide em 1920×1080, incluindo os ocultos (use `skills/presentations/presentation-export/scripts/export.py --images ... --all`). `thumbs/NN.jpg`: as mesmas imagens em tamanho de miniatura.
- `deck.html` + os `assets/` que ele usa: cópia do deck para a vista ao vivo, carregada como `deck.html?embed#N.passo` e controlada pelo modo embed do próprio deck (veja no código o formato da mensagem postMessage). Se o deck não tiver modo embed, deixe só a vista de imagem.
- Na página, um `const SLIDES = [...]` gerado do deck: número, título, kicker (bloco), quantidade de passos/cliques, notas (`aside.notes`), explicação (`aside.explain` ou `aside.explica`, em pares rótulo/texto) e se o slide está oculto.

Layout (mesa de trabalho em 3 colunas):
- Topo: nome do deck e total de slides; ferramentas "Selecionar" (V) e "Marcar ajuste" (C); contagem de abertos e resolvidos; indicador de salvo; botão Exportar; avatar de quem está vendo.
- Esquerda: miniaturas numeradas, agrupadas pelo kicker, com selo de ajustes abertos e marca de oculto.
- Centro: palco 16:9 com o slide; alternância "Imagem final" / "Ao vivo"; navegação entre passos quando o slide tem cliques; botão de olho no canto para ocultar ou mostrar o slide.
- Direita: abas "Este slide", "Todos" (agrupado por slide) e "Explicação" (explicação + roteiro de fala); filtro "Mostrar resolvidos"; botão "+ Ajuste geral deste slide".

Comentários:
- Em "Marcar ajuste", clicar no slide cria um pino com x/y relativos (0 a 1) e o passo atual. Ajuste geral fica sem x/y.
- Balão com tipo (texto, design, conteúdo, animação, remover, outro, cada um com uma cor) e campo de texto; Ctrl/Cmd+Enter salva, Esc cancela.
- Pinos numerados, arrastáveis, destacados ao selecionar; os resolvidos ficam esmaecidos com ✓.
- Cada card mostra tipo, slide/passo, data, autor, texto e a "Resposta" quando houver, com editar, resolver/reabrir e apagar (com confirmação).
- Exportar: os ajustes abertos em Markdown, agrupados por slide, com copiar e baixar .md.

Dados (capacidades db, user e downloads):
- Coleção `observacoes`: { slide, passo, x, y, tipo, texto, status: "aberta" | "resolvida", resposta, autor, criadoEm, atualizadoEm }.
- Coleção `ocultos`: doc `sNN` { slide, oculto, autor, atualizadoEm }.
- Comentários compartilhados entre todos que abrem o editor; localStorage só para preferências (aba e vista).

Visual: tema claro e escuro, fonte de interface sóbria, cores dos tipos tiradas da paleta do deck. Em tela estreita, as colunas se empilham.

No fim, abra o artifact e me passe o link.
```

## 2. Resolve the open comments

```text
Resolva os ajustes abertos do editor <link do artifact>: leia `observacoes` com status "aberta", aplique cada um em `presentations/<slug>/index.html`, preencha `resposta` com o que mudou e marque como "resolvida". Depois gere de novo as imagens e o deck.html do editor e republique no mesmo link. Se algum slide entrar, sair ou mudar de posição, renumere os comentários e os ocultos.
```

## Notes

- Slide numbers count every slide in the file, hidden ones included, the same numbering as `#N` in the deck URL.
- The editor keeps its own copy of the deck and of the slide images. After changing the deck outside the editor,
  ask for the editor to be updated too, or it keeps showing the old version.
