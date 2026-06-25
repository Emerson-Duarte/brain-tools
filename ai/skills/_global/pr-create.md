---
title: "Skill: Criação de PR (padrão Vakinha)"
tags: [github, pr, delivery]
stack: [all]
category: delivery
---

Atue como um **Especialista em Documentação Técnica e Assistente de Pull Request**.

Sua missão é gerar mensagens de PR impecáveis seguindo um padrão rígido. Você **não deve inventar** funcionalidades, bugs ou contextos. Toda a informação vem da branch, do card Jira e dos commits — **não pergunte nada ao usuário**.

> Skill de PR **genérica** (não-SDD). Use quando o usuário pedir um PR fora do fluxo `/sdd-workflow`. Para PR dentro do SDD, use `pr-create-sdd.md`.

## 🛡️ Regras de ouro (anti-delírio)

- **Fidelidade aos dados:** use apenas o que vem do card Jira e dos commits. Não adicione "melhorias de performance" ou "refatoração" que não esteja nos commits/card.
- **Sem perguntas:** derive tudo automaticamente (ver abaixo). Só pare e reporte se uma fonte obrigatória faltar (ex.: branch sem número de task).
- **Formatação estrita:** o output final segue rigorosamente o template Markdown abaixo.

## 📋 Coleta automática (não perguntar)

1. **Número da task:** extraia da branch `task/VK25-XXXX/...` → `VK25-XXXX`. Se a branch não tiver o padrão, pare e reporte.
2. **Contexto/resumo:** busque o card no Jira (`getJiraIssue`) — use título e descrição como o "porquê".
3. **Commits:** `git log {base}..HEAD` (base = branch default do projeto, do `jira-workflow.md`) → base do "como foi feito".

## 🏗️ Estrutura do output final

Título (**em pt-BR**):

```
[VK25-NUMERO] Título Conciso
```

Use português no título (ex.: "Pesquisas", não "Surveys"). Termos técnicos consagrados (endpoints, models, specs, UI, migrations) podem ficar como são.

Corpo:

```markdown
### Descrição
<Resumo técnico e direto mesclando o contexto e a ação realizada>

### Contexto
<Explicação do problema ou da necessidade de negócio baseada no resumo da task>

### Como foi feito
- <bullet de alteração técnica baseada nos commits>
- <bullet>
- <bullet>
```

## ⚙️ Operacional

- Crie via `gh pr create` (ou GitHub MCP) com `base` = branch default do projeto (`develop`/`master`/`main` conforme `jira-workflow.md`). Sem confirmação prévia — o usuário já autorizou ao pedir o PR.
- **Sempre passe `--repo owner/nome`** em `gh pr create`/`gh pr edit` (ou `cd` explícito no diretório certo antes de cada comando). O `cwd` persiste entre comandos — `gh pr edit <n>` sem `--repo` pode editar o PR `#<n>` do repo errado. Número de PR é por repo; nunca reutilize cwd de outro repo.
- **Reviewers (sempre marcar os 5):** `marcelogborges`, `davidsgoncalves`, `zekisan`, `VictorMiwa29`, `FabricioBernardes`. Em `gh`: `--reviewer marcelogborges,davidsgoncalves,zekisan,VictorMiwa29,FabricioBernardes`.
- **Mover o card pra Code Review:** após criar o PR, transicione o card Jira para **Code Review** (`getTransitionsForJiraIssue` → `transitionJiraIssue`). Opcional: comentar no card com o link do PR.
- **Nunca** atribua autoria ao Claude no corpo nem como co-author (`noreply@anthropic.com`). Identidade real do dev.
- Cross-repo: um PR por repo, vinculando-os entre si na descrição; o card Jira recebe todos os links.
- Não faça merge — fora do escopo.
