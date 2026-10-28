# Descrição do evento

Texto para a página de inscrição de uma apresentação remota da palestra. Os campos entre colchetes ficam para
preencher com a data, o horário e o link da transmissão.

## Título

Augmented-Generation e Gestão de Conhecimento com Grafos

## Resumo

Palestra online sobre grafos de conhecimento e IA. Vamos montar o grafo de um curso de computação, slide a slide, e
ver como RAG, GraphRAG e Text2Cypher usam esse grafo para responder perguntas.

## Descrição

Os modelos de hoje leem contextos enormes, e agentes de código acham o que precisam nos arquivos sem índice nenhum.
Então grafos ainda são úteis? A palestra começa por essa pergunta, separando o que perdeu força do que continua
valendo, e chega a uma regra de uma frase: se a pergunta é sobre conteúdo, provavelmente não precisa de grafo; se é
sobre relações, histórico ou controle, precisa.

Para mostrar isso, vamos montar, slide a slide, o grafo de conhecimento de um curso de computação fictício, com
estudantes, professores, disciplinas, TCCs e temas. Você entra nele como um dos estudantes. Com o grafo pronto, a
gente lê o que ele mostra (quem faz a ponte entre os grupos, o que fica descoberto se uma professora sai, que
comunidades aparecem sem que ninguém tenha cadastrado) e depois coloca uma IA para responder perguntas com ele.

O que você vai ver

- Nó, aresta, rótulo, propriedade e ontologia, e por que guardar datas nas arestas muda a resposta para "quem é o
  professor de Algoritmos?".
- Centralidade de grau e de intermediação, e detecção de comunidades com uma demonstração no navegador.
- RAG, CAG, Agentic RAG e GraphRAG, com a mesma pergunta ("quem orienta TCC sobre grafos?") respondida por RAG e por
  GraphRAG.
- Como o GraphRAG usa um LLM para montar o grafo a partir de PDFs, e o erro mais comum dele, a mesma professora
  virando três nós porque cada documento escreve o nome de um jeito.
- Local search e global search no mesmo grafo.
- Três jeitos de uma IA consultar um banco de grafos: vetor com travessia, Text2Cypher e o grafo como ferramenta MCP
  de um agente.
- A mesma pergunta escrita em Cypher e em SQL, lado a lado.
- O grafo dentro do próprio agente, como no LangGraph e no Langflow.
- Para fechar, o grafo real das quatro faculdades chamadas FACOM (UFU, UFMS, UFBA e UFJF), com as 350 disciplinas
  obrigatórias dos 14 cursos, montado só com as matrizes curriculares públicas.

Para quem é

Estudantes e professores de computação, e quem trabalha com dados ou IA e quer saber quando um grafo compensa o custo
de montar e manter. A palestra começa do zero, então não precisa conhecer grafos nem Cypher antes.

Palestrante

Lucas Democh, Data Scientist na Orion, consultoria de tecnologia e IA de São Paulo.

## Serviço

- Formato: online e ao vivo, com perguntas no final
- Data: [dia de mês de ano]
- Horário: [hh:mm] (horário de Brasília)
- Duração: cerca de 40 minutos de apresentação, mais perguntas
- Transmissão: [plataforma e link]
- Inscrição: [gratuita ou paga, e link]
