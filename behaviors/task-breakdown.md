---
title: "Comportamento: decomposição de SDD em tasks Jira"
tags: [sdd, jira, planning, atlassian, multi-project]
---

## Quando aplicar

Carregado por `/sdd-tasks` ao decompor o SDD em issues Jira (passo 6 do workflow).

## Princípios

### 1. Uma task = uma entrega revisável

Se uma task vira PR de 1000 linhas, divida. Use camadas declaradas em `architecture.md` do projeto pra agrupar (não invente).

### 2. Camadas separadas quando possível

Backend, frontend, infra em issues separadas — permite paralelismo de revisão.

### 3. Migrations/schema changes sempre isoladas

Nunca misture migration com lógica de negócio na mesma issue/PR.

### 4. Setup/scaffolding primeiro

Feature flag, tabela nova, contexto novo, módulo vazio — tudo isso é primeira task da fila.

### 5. Multi-project: issues por projeto + cross-links

Pra cada projeto em `state.projects[]`, cria issues no `project key` do `jira-workflow.md` daquele projeto. Linka cross-project via `createIssueLink` (tipo "relates to" ou "blocks").

### 6. Confirmação antes de criar

**Sempre** apresente proposta de breakdown ao usuário antes de criar nada no Jira. Use formato:

```
📦 Proposta de breakdown (N tasks)

1. [vakinha-api][backend] {título} | tipo: Story | est: 4h | depende de: -
2. [vakinha-app][frontend] {título} | tipo: Story | est: 2h | depende de: 1
...

[s] Criar todas  [e] Editar lista  [c] Criar uma por vez  [n] Cancelar
```

### 7. Template de descrição vem do projeto

Use `commands.md` + `jira-workflow.md` + `pr-conventions.md` do projeto pra montar template (gates, labels, reviewers). Nunca hardcode.

## Anti-padrões

- ❌ Criar issues sem confirmar proposta
- ❌ Assumir issue types/labels — venha do `jira-workflow.md` ou pergunte
- ❌ Decompor sem ler seção 6 (Checklist) e 11 (AC) do SDD
- ❌ Misturar projetos numa única issue
- ❌ Sub-tasks com escopo > 1 dia sem subdividir
