---
description: Fase 3 passo 14 — merge PR + move card "Done". Exige confirmação humana (irreversível).
argument-hint: "[--slug=<slug>]"
---

# /sdd-merge — Merge & Done

Responsabilidade única: **mergear o PR e mover card Jira pra Done**. Ação irreversível → confirmação explícita.

> **Multi-project:** segue `state.merge_order` (default: backend → engine → frontends). Mergeia projeto por projeto, esperando deploy/release de deps antes (se aplicável). NUNCA mergeia frontend antes de backend que ele consome. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.artifacts.pr_url` aponta pra PR válido
- CI green (`gh pr checks <num>`)
- Approvals satisfeitos conforme `pr-conventions.md`
- Sem "request changes" pendente

Se qualquer faltar → ABORTE pedindo `/sdd-watch`.

## ⚙️ Execução

### 1. Confirmar com usuário

```
⚠️ Vai mergear PR <url>?

Branch: <state.branch> → main
Commits: N
Card Jira: <key> → Done

Estratégia: [squash | merge | rebase]  ← conforme pr-conventions.md

  [s] Mergear  [n] Cancelar
```

NUNCA mergear sem confirmação explícita.

### 2. Mergear

Use `gh pr merge <num> --<estrategia> --delete-branch`.

Estratégia vem de `pr-conventions.md`. Default sugerido: `--squash`.

### 3. Mover card Jira → Done

Carregue `ai/skills/_global/jira-card-move.md`. Destino `done`. Comentário com link do commit principal de merge.

### 4. Sub-tasks (se houver)

Se `state.jira_keys` tem mais que 1 e PR cobriu tudo, mover todas as sub-tasks pra Done também — pergunte primeiro.

## 💾 Persistência

```yaml
artifacts:
  merge_sha: <sha do merge commit>
steps:
  - id: merge
    status: completed
    timestamp: <iso now>
last_step: merge
last_run: <iso now>
status: in_progress  # ainda não é done — falta postdeploy + capture
```

## 🚦 Saída

```
✅ /sdd-merge concluído

PR: merged (<sha>)
Branch deletada: <branch>
Card Jira: <key> → Done

📍 Próximo: /sdd-postdeploy --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Validação pós-deploy (= `/sdd-postdeploy`)
- ❌ Captura aprendizados (= `/sdd-capture`)
- ❌ Force-merge — sem CI green, ABORTE
