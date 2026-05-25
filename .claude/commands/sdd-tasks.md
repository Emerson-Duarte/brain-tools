---
description: Fase 1 passo 6 — decompõe SDD em issues Jira. Requer spec_validate passed/skipped.
argument-hint: "[--slug=<slug>]"
---

# /sdd-tasks — Breakdown em Jira

Responsabilidade única: **transformar SDD em N issues no Jira**, agrupadas pelas camadas declaradas em `architecture.md`, com dependências vinculadas.

> **Multi-project:** itera sobre `state.projects[]`. Pra cada projeto, cria issues no `project key` do `jira-workflow.md` correspondente. Linka issues cross-project via `createIssueLink` (tipo "relates to"). Atualiza `state.projects[i].jira_keys`. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.spec_path` aponta pra arquivo existente
- `state.gates.spec_validate` ∈ {`passed`, `skipped`}

Se gate pendente → ABORT pedindo `/sdd-spec-validate`.

## 📥 Carregamento de contexto

Siga `_load-project-context.md`. Carregue **tasks profile**:

- `jira-workflow.md` (project key, issue types, labels, parent default)
- `architecture.md` (camadas pra tag do título)
- `commands.md` (gates pro template de descrição)

Se algum desses não existe ou está raso → **lacuna**. Pergunte ao usuário e ofereça salvar via feedback loop antes de continuar (o que ele responder vira parte do brain).

## ⚙️ Execução

Carregue `ai/skills/_global/sdd-tasks-breakdown.md` (Read) e siga literalmente:

1. Leitura do SDD (`state.spec_path`)
2. Confirmar metadados Jira (project key, parent, tipo)
3. **Proposta de breakdown** ao usuário (lista antes de criar nada)
4. Aguardar confirmação
5. Criar issues via `mcp__claude_ai_Atlassian__createJiraIssue`
6. Vincular dependências via `mcp__claude_ai_Atlassian__createIssueLink`
7. Resumo final

## 💾 Persistência

```yaml
jira_keys:
  - VKAP-1234
  - VKAP-1235
  - ...
jira_main_key: VKAP-1234   # card "principal" pra mover em /sdd-implement
artifacts:
  tasks_breakdown: docs/sdd-<slug>/tasks.md   # opcional, se gerou doc
steps:
  - id: tasks
    status: completed
    timestamp: <iso now>
    issues_created: N
last_step: tasks
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-tasks concluído

N issues criadas:
  VKAP-1234 — [layer] título → url
  ...

Dependências: M links criados
Card principal: VKAP-1234

📍 Próximo: /sdd-implement --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Não mover cards de status (= `/sdd-implement` faz isso no início)
- ❌ Não codar
- ❌ Não criar issues sem confirmar proposta com usuário
