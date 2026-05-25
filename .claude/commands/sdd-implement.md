---
description: Fase 2 passos 7+8 — move card "Em dev" + delega implementação ao implementer agent do projeto.
argument-hint: "[--slug=<slug>] [--task=<jira-key>]"
---

# /sdd-implement — Implementação incremental

Responsabilidade única: **mover card pra "Em desenvolvimento" + executar implementação** delegando ao implementer agent project-specific se existir.

> **Multi-project:** itera sobre `state.projects[]` em ordem inversa ao `merge_order` (deps primeiro — geralmente backend antes do frontend que consome). Pra cada projeto: cwd=root, branch, agent específico, commits. Atualiza `state.projects[i].{branch, artifacts.commits}`. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.gates.spec_validate` ∈ {`passed`, `skipped`}
- `state.spec_path` aponta pra arquivo existente

`state.jira_main_key` é opcional (se omitido, pula passo de mover card). `--task=<key>` override.

## 📥 Carregamento de contexto

Siga `_load-project-context.md`. Carregue **implementation profile**:

- `architecture.md` (padrões obrigatórios)
- `commands.md` (gates — serão validados no `/sdd-review` mas implementação já segue)
- `styleguide.md` (se existe — UI)
- `hooks.md` (se existe — convenções de hooks/helpers)
- `ai-guidelines.md` (se existe — regras pra agents)

**Identifique implementer agent project-specific:**

```
No índice (CLAUDE.md do projeto), procure pointer tipo:
  "Implementer agent | ai/skills/<project>/agents/implementer-task.agent.md"
  ou qualquer linha cujo path termine em "implementer*.agent.md"
```

- **Se existe** → use como prompt do sub-agent
- **Se não existe** → lacuna:
  ```
  ⚠️ Lacuna: projeto não declara implementer agent project-specific.

  Sem ele, vou delegar a sub-agent general-purpose com o SDD como contexto.
  Pode produzir código que não segue padrões do stack.

  Quer:
    [c] Criar implementer agent agora
    [g] Prosseguir com general-purpose (fallback)
    [a] Abortar
  ```

## ⚙️ Execução

### 1. Mover card Jira → "Em desenvolvimento"

Se `state.jira_main_key` ou `--task` presente:

Carregue `ai/skills/_global/jira-card-move.md` (Read). Use destino `in_progress`. Para sub-tasks (se `state.jira_keys` lista mais que 1), pergunte se mover só principal ou todas.

Se nenhum key disponível, pule esta etapa silenciosamente.

### 2. Validar branch + identity

**Contratos rígidos** (não burle):

```
git config user.email   → NUNCA "noreply@anthropic.com"
git config user.name    → NUNCA "Claude"
```

Se inválido, ABORTE e instrua usuário a corrigir.

Se `state.branch` é null, sugira nome (`feat/<slug>` ou `fix/<slug>` conforme tipo no SDD). Crie/checkout via `git checkout -b`. Atualize state.

### 3. Delegar implementação

Monte prompt do sub-agent:

```
Você é o Implementer SDD pro projeto <project>.

SDD:    <state.spec_path>
AC:     <lista do state>
Branch: <state.branch>

Tópicos do brain carregados:
- Architecture: ...
- Commands/Gates: ...
- Styleguide: ...
- ...

{Se implementer-task.agent.md do projeto existe, anexe inline aqui — sobrescreve genérico.}

Regras:
- Commits incrementais por seção do checklist do SDD (seção 6)
- Use a skill `commit-message.md` pra mensagens padronizadas
- NÃO abra PR (será passo /sdd-pr)
- NÃO rode self-review aqui (será /sdd-review)
- Pare ao fim do checklist OU ao primeiro bloqueador. Reporte estado.
```

Tipo de sub-agent:
- Se implementer agent do projeto existe e nomeia tipo específico (Plan/Explore/general-purpose), use
- Default: `general-purpose`

### 4. Pós-implementação

Liste commits criados (`git log <branch> ^main --oneline`). Confirme com usuário antes de marcar passo como completed.

## 💾 Persistência

```yaml
branch: feat/<slug>
artifacts:
  commits: [<sha>, <sha>, ...]
steps:
  - id: implement
    status: completed | in_progress | failed
    timestamp: <iso now>
last_step: implement
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-implement concluído

Branch: feat/<slug>
Commits: N
  <sha> <subject>
  ...

Checklist SDD: X/Y itens completados

📍 Próximo: /sdd-review --slug=<slug>
```

Se bloqueador encontrado:
```
⚠️ Implementação pausada

Bloqueador: <descrição>
Commits feitos até aqui: <list>

Próximas opções:
  - /sdd-implement --slug=<slug>  (retomar após resolver)
  - editar SDD e voltar /sdd-spec-validate
```

## 🚫 Fora de escopo

- ❌ Abrir PR (= `/sdd-pr`)
- ❌ Rodar self-review/security (= `/sdd-review`)
- ❌ Validar app manualmente (= `/sdd-verify`)
- ❌ Mergear (= `/sdd-merge`)
