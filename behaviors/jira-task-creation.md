---
title: "Comportamento: criação de tasks no Jira"
tags: [jira, task, atlassian, workflow]
---

## Como criar tasks no Jira

### Regras obrigatórias

1. **Labels — usar apenas os já existentes no projeto.**
   - Antes de criar a task, listar os labels disponíveis no projeto Jira de destino (via `searchJiraIssuesUsingJql` ou recurso equivalente que retorne labels usados).
   - Selecionar somente labels que já existam.
   - **Nunca criar label novo.** Se nenhum label existente se encaixar, perguntar ao usuário qual usar (oferecendo a lista) em vez de inventar um.

2. **Assignee — perguntar antes de atribuir.**
   - Sempre perguntar: "Quer que eu já associe a task a você (Emerson) ou deixar sem assignee?"
   - Usar `AskUserQuestion` com 2 opções: "Atribuir a mim" / "Deixar sem assignee".
   - Só atribuir após resposta explícita. Se o usuário já indicar o dono na própria mensagem inicial, pular a pergunta.

### Fluxo recomendado

1. Confirmar projeto Jira de destino (se ambíguo, perguntar).
2. Listar labels existentes no projeto.
3. Coletar título, descrição, tipo e prioridade da task.
4. Perguntar sobre assignee (regra 2).
5. Criar a issue com `createJiraIssue` usando somente labels permitidos.
6. Retornar o link da issue criada.

### O que NÃO fazer

- Não criar labels novos sob nenhuma circunstância.
- Não assumir que o usuário é o assignee sem perguntar.
- Não criar a task antes de ter confirmação do assignee.
