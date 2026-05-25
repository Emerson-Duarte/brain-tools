---
description: Fase 1 passo 4 — redação do SDD/plano técnico. Delega ao planner-task agent do projeto se existir.
argument-hint: "[--slug=<slug>]"
---

# /sdd-spec — Redação do SDD

Responsabilidade única: **produzir o SDD (Spec-Driven Document)** a partir do grooming + AC. Saída é input do `/sdd-spec-validate` (gate humano) e do `/sdd-tasks`.

> **Multi-project:** SDD único com **uma seção por projeto** em `state.projects[]`. Cada seção pode ser produzida pelo planner agent do projeto correspondente (sub-agents em paralelo). Inclui seção "Acoplamentos cross-project" amarrando contratos entre projetos. Veja `ai/skills/_global/sdd-multi-project.md`.

## 🛂 Pré-requisitos

Siga `ai/skills/_global/sdd-state.md` pra resolver `--slug`.

- `_state.md` existe (rode `/sdd-discover` primeiro se não).
- `state.artifacts.grooming` aponta pra arquivo existente.
- `state.ac` não vazio.

Se faltar qualquer um → ABORT com instrução de voltar ao `/sdd-discover`.

## 📥 Carregamento de contexto

Siga `_load-project-context.md`. Carregue **planning profile**:

- `architecture.md`
- `commands.md` (gates → entram na seção "Estratégia de testes")
- `observability.md` (seção 10 do template)
- `rollout.md` (seção 9: feature flag, rollback)
- `payments.md` / `notifications.md` (se aplicável)

**Identifique agent project-specific:**

```
Procure no índice do projeto (CLAUDE.md) por pointer tipo:
  "Planner agent | ai/skills/<project>/agents/planner-task.agent.md"
  ou em qualquer linha cujo path termine em "planner*.agent.md"
```

- **Se existe** → carregue (Read) e use ele como base do prompt. Seguir as regras específicas dele.
- **Se não existe** → registre **lacuna** e ofereça criar antes de prosseguir:
  ```
  ⚠️ Lacuna: projeto não declara planner agent project-specific.

  Sem ele, vou usar o template genérico de implementation-planner. Isso geralmente
  produz SDD sem regras de stack (testing framework, padrões de PR, gates).

  Quer:
    [c] Criar planner agent agora (te ajudo a estruturar)
    [g] Prosseguir com genérico (fallback)
    [a] Abortar
  ```

## ⚙️ Execução

### 1. Carregue skill base

Sempre `Read` em `ai/skills/_global/implementation-planner.md` — é a base agnóstica.

### 2. Delegue ao sub-agent `Plan`

Monte prompt com:
- Conteúdo do `grooming.md`
- Lista de AC do `_state.md`
- Tópicos relevantes do brain (já carregados)
- Conteúdo do **planner agent project-specific** se existir (sobrescreve genérico)
- Path final esperado: `docs/sdd-<slug>/plan.md`

Prompt do sub-agent:

```
Você é o Planner SDD. Produza o SDD completo em <path>.

Contexto carregado:
- Grooming: <grooming.md>
- AC: <lista>
- Architecture: <topics>
- Commands/Gates: <topics>
- Observability: <topics>
- Rollout: <topics>
{Se planner-task.agent.md do projeto existe, anexe aqui inline.}

Use o template do implementation-planner. Não invente regras de stack — tudo
deve sair dos tópicos carregados. Se faltar info, marque "QUESTION:" na seção
12 (Perguntas em aberto).

Salve em <path>. Retorne um resumo de 5-7 linhas.
```

### 3. Pós-processo

- `create_prd` no brain com conteúdo do `plan.md` (referência futura).
- Mostre o SDD ao usuário no chat.

## 💾 Persistência

Atualize `_state.md`:

```yaml
spec_path: docs/sdd-<slug>/plan.md
artifacts:
  spec: docs/sdd-<slug>/plan.md
steps:
  - id: spec
    status: completed
    timestamp: <iso now>
last_step: spec
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-spec concluído

SDD: docs/sdd-<slug>/plan.md
Tamanho: <N> linhas | <N> sections | <N> perguntas em aberto

⚠️ Não prossiga sem validação humana.
📍 Próximo: /sdd-spec-validate --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Não decompor em tasks Jira (= `/sdd-tasks`)
- ❌ Não implementar (= `/sdd-implement`)
- ❌ Não confirmar AC como verified — isso é `/sdd-verify`
