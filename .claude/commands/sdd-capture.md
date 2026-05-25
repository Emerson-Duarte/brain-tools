---
description: Fase 4 passo 16 — destila aprendizados da task e captura no brain. Fecha a task.
argument-hint: "[--slug=<slug>]"
---

# /sdd-capture — Captura no brain

Responsabilidade única: **destilar aprendizados gerais da sessão e salvar no brain via `/brain-capture`**. Marca a task como `done`.

> **Multi-project:** considera aprendizados cross-project (contratos entre projetos, deps que não estavam óbvias, lacunas em CLAUDE.md de qualquer projeto envolvido). Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.steps[merge].status` = `completed`

(Postdeploy é opcional — algumas tasks não vão pra prod imediatamente.)

## ⚙️ Execução

### 1. Carregue artefatos da task

- `state.artifacts.grooming`
- `state.artifacts.spec`
- `state.artifacts.review` (se existe)
- `state.artifacts.postdeploy_report` (se existe)
- Diff final do PR (`gh pr diff <num>`)

### 2. Invocar `/brain-capture`

Carregue `.claude/commands/brain-capture.md` (Read) e siga literalmente, com **input pré-formatado** desta task:

```
Material pra destilar:
- SDD: <state.spec_path>
- Achados de review: <state.artifacts.review>
- Decisões de implementação tomadas (extraia do PR diff/commits)
- Lacunas no brain que ainda não foram preenchidas (consulte body do state)
- Métricas pós-deploy interessantes

Tipos esperados:
- knowledge/engineering/* — se achou padrão técnico reutilizável
- knowledge/architecture/* — se descobriu arquitetura sub-documentada
- knowledge/notes/* — para incidentes/decisões pontuais
- behavior update — se descobriu que regra existente precisa ajuste
- arquivo de tópico do projeto — se acumulou lacunas durante a task

Confirme cada item antes de salvar.
```

### 3. Resumo final do workflow

Mostre ao usuário:

```
🎯 Task SDD concluída

Slug: <slug>
Jira: <main_key> → Done
PR: <url> → Merged
Branch: <branch> → deletada

Artefatos:
  grooming: <path>
  spec: <path>
  review: <path se houver>
  postdeploy: <path se houver>

Aprendizados salvos no brain: Y itens
Lacunas preenchidas (tópicos do projeto): Z itens

Próximas tasks sugeridas: <opcional, baseado em "Perguntas em aberto" do SDD>
```

## 💾 Persistência

```yaml
steps:
  - id: capture
    status: completed
    timestamp: <iso now>
    items_saved: N
last_step: capture
last_run: <iso now>
status: done
```

## 🚫 Fora de escopo

- ❌ Implementar nada
- ❌ Reabrir o card Jira
- ❌ Alterar o PR
