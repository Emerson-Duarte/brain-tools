---
description: Fase 2 passo 9 — self-review obrigatório (code-review + security-review + gates). Bloqueante.
argument-hint: "[--slug=<slug>] [--skip-gate=review]"
---

# /sdd-review — Self-review pré-PR ⚠️

Responsabilidade única: **bloquear avanço se code-review, security-review ou gates do projeto falharem**. Roda os 3 em paralelo.

> **Multi-project:** itera sobre `state.projects[]`. Gate é por-projeto (`state.projects[i].gates.review`). Falha num projeto não bloqueia outros — mas bloqueia o `/sdd-pr` daquele projeto. Veja `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-multi-project.md`.

> **Tools usadas:** referencie `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-tools.md` pra catálogo (built-in, MCP brain/Atlassian/github, sub-agents Explore/Plan/general-purpose, slash commands).

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.branch` aponta pra branch atual (`git rev-parse --abbrev-ref HEAD`)
- Diff vs main não vazio (`git diff main..HEAD --stat`)

Se diff vazio → ABORT: "Sem mudanças pra revisar. Rode /sdd-implement primeiro."

## 📥 Carregamento de contexto

Siga `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/_load-project-context.md`. Carregue **review profile**:

- `commands.md` (lista de gates obrigatórios — fonte da verdade)
- `architecture.md` (padrões obrigatórios)
- `ai-guidelines.md` (se existe — regras específicas)

Se `commands.md` não lista gates → **lacuna crítica**. Pergunte ao usuário quais gates rodar e ofereça salvar.

## ⚙️ Execução

### 1. Rodar os 3 reviews em paralelo

**Use múltiplos sub-agents em uma única chamada** (paralelizável):

a. **Code review** — invoque `/code-review` skill (built-in)
b. **Security review** — invoque `/security-review` skill (built-in)
c. **Gates do projeto** — execute cada comando listado em `commands.md` via Bash:
   - `<lint command>`
   - `<type-check command>`
   - `<test command>`
   - `<build command>`
   - ... conforme `commands.md`

### 2. Agregar resultados

```
📊 Resultado do self-review

Code review:    [✅ pass | ⚠️ findings: N | ❌ blocking: M]
Security:       [✅ pass | ⚠️ findings: N | ❌ blocking: M]
Gates do projeto:
  lint:         [✅ | ❌]
  type-check:   [✅ | ❌]
  test:         [✅ | ❌]
  build:        [✅ | ❌]
  ...
```

### 3. Decisão

- **Todos ✅** → gate = passed
- **Findings warning only** (code/security) → gate = passed, mas mostre findings + pergunte se quer endereçar antes de PR
- **Qualquer ❌ blocking** → gate = failed, ABORTE com lista do que corrigir
- **`--skip-gate=review`** → mesma regra do spec-validate (pede aprovador, marca skipped)

### 4. Persistir achados

Se houver findings (warning ou blocking), salve em `docs/sdd-<slug>/review.md`:

```markdown
# Review — <slug>

**Data:** <iso>
**Resultado:** passed | failed | skipped

## Code review findings
- ...

## Security review findings
- ...

## Gates
- lint: pass | fail (<output>)
- ...
```

## 💾 Persistência

```yaml
gates:
  review: passed | failed | skipped
artifacts:
  review: docs/sdd-<slug>/review.md  # se houver findings
steps:
  - id: review
    status: completed | failed
    timestamp: <iso now>
    blocking_findings: N
    warning_findings: M
last_step: review
last_run: <iso now>
```

## 🚦 Saída

Pass:
```
✅ /sdd-review = passed
N warnings, 0 blocking
📍 Próximo: /sdd-verify --slug=<slug>
```

Fail:
```
❌ /sdd-review = failed

Blocking findings:
  1. ...
  2. ...

Corrija e rode /sdd-review --slug=<slug> novamente.
```

## 🚫 Fora de escopo

- ❌ Não rodar app / UI manual (= `/sdd-verify`)
- ❌ Não abrir PR (= `/sdd-pr`)
- ❌ Não mergear
