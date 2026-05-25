---
description: Fase 2 passo 10 — validação manual (roda app + checa AC). Bloqueante.
argument-hint: "[--slug=<slug>] [--skip-gate=verify]"
---

# /sdd-verify — Validação manual ⚠️

Responsabilidade única: **subir o app, exercitar a feature, marcar cada AC como verified ou rejected**.

> **Multi-project:** AC têm campo `covered_by: [projeto1, projeto2]`. Pra cada AC, exercita os projetos listados. Multi-app pode exigir subir N processos. Gate `verify` é **global** (todos AC verified), mas roda exercícios em cada projeto. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.ac` não vazio
- `state.gates.review` ∈ {`passed`, `skipped`}

## 📥 Carregamento de contexto

Siga `_load-project-context.md`. Carregue:

- `commands.md` (como subir app)
- `platforms.md` (se existe — UI multi-plataforma)
- `architecture.md` (entender o fluxo)

## ⚙️ Execução

### 1. Subir o app

Invoque `/run` skill (built-in) — ela detecta automaticamente como subir o projeto.

Se `commands.md` lista comando específico (ex.: `yarn dev`, `yarn ios`, `bin/rails s`), use.

### 2. Roteiro de validação

Para cada `state.ac[i]`:

```
🧪 Verificando CA<i>: <texto>

Passos sugeridos:
  1. <passo manual derivado do SDD seção 6 ou do AC>
  2. ...

Resultado: [✅ verified] [❌ rejected] [⏸ pular]
```

Pergunte ao usuário (`AskUserQuestion`) o resultado de cada AC.

Se mudou UI:
- **Multi-plataforma**: tire screenshot por plataforma listada em `platforms.md` ou `CLAUDE.md`.
- **Web**: rodar em viewports listados (mobile, desktop).
- **Mobile RN**: rodar em iOS + Android se ambos suportados.

### 3. Reportar regressões fora de escopo

Se durante o roteiro o usuário descobrir regressão em outra área (não na task atual), **pergunte se quer registrar como nova task** (`mcp__claude_ai_Atlassian__createJiraIssue`).

## 💾 Persistência

```yaml
ac:
  - id: CA1
    text: "..."
    verified: true | false
    notes: "..."  # opcional
  - ...
gates:
  verify: passed | failed | skipped
steps:
  - id: verify
    status: completed | failed
    timestamp: <iso now>
    verified_ac: N
    rejected_ac: M
last_step: verify
last_run: <iso now>
```

- **Todos AC verified** → gate = passed
- **Qualquer AC rejected** → gate = failed (volte pra `/sdd-implement` ou ajuste SDD)

## 🚦 Saída

Pass:
```
✅ /sdd-verify = passed
AC: N/N verified
📍 Próximo: /sdd-pr --slug=<slug>
```

Fail:
```
❌ /sdd-verify = failed
AC rejected:
  - CA<i>: <texto> | nota: <user input>

Volte pra /sdd-implement com os ajustes.
```

## 🚫 Fora de escopo

- ❌ Não abrir PR (= `/sdd-pr`)
- ❌ Não codar — só validar
- ❌ Não mover card Jira ainda
