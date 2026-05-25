---
description: Fase 1 passo 5 — gate humano sobre o SDD antes de codar. Bloqueante.
argument-hint: "[--slug=<slug>] [--skip-gate=spec_validate]"
---

# /sdd-spec-validate — Gate humano do SDD ⚠️

Responsabilidade única: **forçar revisão humana do SDD antes de qualquer trabalho de implementação**. Sem este passo (ou skip explícito registrado), `/sdd-tasks` e `/sdd-implement` recusam executar.

> **Multi-project:** gate único global. Usuário aprova/rejeita SDD inteiro (todas as seções por-projeto de uma vez). Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe.
- `state.spec_path` aponta pra arquivo existente.
- `state.gates.spec_validate` ≠ `passed` (idempotência: se já passed, só imprime status).

Se faltar SDD → ABORT pedindo `/sdd-spec`.

## ⚙️ Execução

### 1. Mostrar SDD ao usuário

Imprima o conteúdo de `state.spec_path` no chat (ou trechos-chave se for muito grande — seções 1, 2, 5, 6, 8, 11).

### 2. Identificar canais de review

Procure em `pr-conventions.md` ou `CLAUDE.md` do projeto por:
- Canal Slack / Discord de review
- Reviewers default

Se encontrar, **ofereça gerar post/comentário** pedindo review humano antes de aprovar:

```
💬 Quer que eu prepare uma mensagem pra <canal> pedindo review do SDD?
  [s] Gerar  [n] Aprovar agora sem broadcast
```

### 3. Perguntar aprovação

Use `AskUserQuestion`:

```
Pergunta: SDD está alinhado? Algum ajuste antes de codar?
  [Aprovar] gate=passed, prossegue
  [Ajustar] gate=pending, volta pro /sdd-spec com feedback
  [Rejeitar] gate=failed, registra motivo, status=aborted
```

### 4. Se `--skip-gate=spec_validate` foi passado

Aceite, mas **exija registro de aprovador**:
```
Pergunta: Quem está aprovando o skip? (nome ou handle)
```
Marque gate como `skipped` e logue no body do state quem aprovou.

## 💾 Persistência

```yaml
gates:
  spec_validate: passed | failed | skipped
steps:
  - id: spec-validate
    status: completed | failed
    approver: <nome ou null>
    timestamp: <iso now>
last_step: spec-validate
last_run: <iso now>
```

Se `failed` ou `skipped`, anexe ao body:
```
## spec-validate
- gate: <state>
- approver: <quem>
- razão: <texto livre se rejeitado>
```

## 🚦 Saída

Passed:
```
✅ Gate spec_validate = passed
📍 Próximo: /sdd-tasks --slug=<slug>  (ou /sdd-implement se solo)
```

Failed:
```
❌ Gate spec_validate = failed
Motivo: <razão>
Volte pra /sdd-spec --slug=<slug> com os ajustes.
```

Skipped:
```
⚠️ Gate spec_validate = skipped (aprovado por <nome>)
📍 Próximo: /sdd-tasks --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Não modifique o SDD aqui — usuário ajusta via `/sdd-spec` se preciso
- ❌ Não decida ajustes técnicos — usuário decide
