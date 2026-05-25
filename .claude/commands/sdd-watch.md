---
description: Fase 3 passo 13 — babysit CI + endereçar feedback de review do PR.
argument-hint: "[--slug=<slug>]"
---

# /sdd-watch — Babysit PR

Responsabilidade única: **monitorar CI e responder a comentários de review** até o PR estar pronto pra merge.

> **Multi-project:** observa N PRs. Status agregado por projeto. Endereçamento de feedback usa cwd=root do projeto correspondente. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.artifacts.pr_url` aponta pra PR válido (`gh pr view <number>`)

## ⚙️ Execução

### 1. Subscrever a eventos do PR

```
mcp__github__subscribe_pr_activity   # se MCP github disponível
```

Senão, **polling manual**: use `gh pr checks <number>` e `gh pr view <number> --json comments,reviews`.

### 2. Loop de eventos

Para cada evento:

| Evento | Ação |
|--------|------|
| CI step failed | Investigar log (`gh run view <id> --log`), corrigir, commit, push |
| Review comment (não-blocker) | Responder ou marcar como will-fix |
| Review comment (request changes) | Endereçar, commit, push, request re-review |
| Approve | Aguardar CI green, marcar pronto pra merge |
| Merge conflict | Rebase com main, resolver, force-push |

Use **sub-agent** dedicado pra cada round de feedback, com prompt:

```
Endereça os comentários abaixo no PR <url>. Não introduza scope não-pedido.

Comentários:
<list>

Branch: <state.branch>
SDD: <state.spec_path>

Após corrigir, commit + push, e me reporte:
- O que foi corrigido
- O que NÃO foi feito e por quê
```

### 3. Quando parar

Quando:
- CI ✅ verde
- N approvals conforme `pr-conventions.md` (ou 1 default)
- Nenhum "request changes" pendente

→ Marque pronto pra merge.

### 4. Encerrar turno (não fazer sleep)

Se ainda há eventos pendentes (CI rodando, review aguardando), **encerre o turno do agente** e instrua usuário a rodar `/sdd-watch --slug=<slug>` de novo quando houver atualização. NÃO use `sleep` ou loop bloqueante.

Alternativa: oferecer `/loop /sdd-watch --slug=<slug>` com interval razoável (ex.: 10min).

## 💾 Persistência

```yaml
steps:
  - id: watch
    status: in_progress | completed
    timestamp: <iso now>
    ci_status: pending | passed | failed
    approvals: N
    pending_comments: M
last_step: watch
last_run: <iso now>
```

## 🚦 Saída

Em progresso:
```
⏳ /sdd-watch em progresso

PR: <url>
CI: <status>
Approvals: N
Comentários pendentes: M

Continue manualmente ou: /loop 10m /sdd-watch --slug=<slug>
```

Pronto:
```
✅ PR pronto pra merge

CI: passed
Approvals: N
Sem comentários pendentes.

📍 Próximo: /sdd-merge --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Mergear (= `/sdd-merge`)
- ❌ Mudar AC ou SDD aqui — se review pede mudança grande, volte pro `/sdd-spec`
