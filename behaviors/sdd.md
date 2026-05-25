---
title: "Comportamento: SDD workflow"
tags: [sdd, workflow, planning, engineering, multi-project]
---

## Quando aplicar

Sempre que rodar qualquer `/sdd-*` ou orquestrar o workflow inteiro via `/sdd-workflow`. Aplica também quando o usuário pede "spec dessa task", "vamos planejar isso direito", "rodar SDD nessa feature".

## Princípios

### 1. Fluxo rígido, não negociável

Sub-commands têm **dependências obrigatórias** entre si. Gates ⚠️ (`spec-validate`, `review`, `verify`) BLOQUEIAM avanço se não estiverem `passed` ou `skipped` com aprovador registrado. Não invente bypass — use `--skip-gate=<name>` com nome de quem aprovou.

### 2. State é fonte da verdade

Todo passo lê e escreve `<primary>/docs/sdd-<slug>/_state.md` conforme `ai/skills/_global/sdd-state.md`. Nunca opere com info "lembrada da sessão" — sempre releia o state. Slug ambíguo? Aborte pedindo `--slug=<X>`.

### 3. Multi-project nativo

Toda task pode envolver N projetos. `state.projects[]` é lista. Sub-commands iteram. Regras em `ai/skills/_global/sdd-multi-project.md`. Nunca assuma 1 projeto.

### 4. Contexto via brain, não invenção

Antes de qualquer passo: `get_project_context` pra cada projeto envolvido. Tópicos, agents, skills extras — tudo vem do índice. Se algo esperado falta = **lacuna registrada**, oferece criar antes de prosseguir.

### 5. Agents project-specific tem prioridade

Se `CLAUDE.md` do projeto declara `planner-task.agent.md` / `implementer-task.agent.md` na seção **Project Agents**, USE — não caia no template genérico como atalho. Sem agent declarado = lacuna, ofereça criar.

### 6. Confirmação antes de destrutivo/externo

Criar issues Jira, mover cards, abrir PR, merge, deploy — sempre pergunta primeiro. Confirmação humana é parte do contrato.

### 7. Sub-agents recebem contrato no prompt

Ao delegar via Agent tool, **inclua estas regras no prompt** — sub-agent não sabe SDD por padrão. Cite: contratos rígidos, path do state, projeto onde operar.

## Contratos rígidos (válidos em TODO passo)

- **git identity**: NUNCA commitar com `user.email == noreply@anthropic.com` ou `user.name == Claude`. Pare e instrua usuário.
- **Skills/PRs**: nunca abrir PR sem carregar `pr-create-sdd.md` (do brain-tools) ou agent equivalente do projeto.
- **Commits/PRs**: mensagem sempre via skill `commit-message.md` — nunca template genérico.
- **Spec única, projects[] dentro**: 1 SDD multi-project, não 1 SDD por projeto.

## Anti-padrões

- ❌ Pular `/sdd-discover` e ir direto pra `/sdd-implement` (sem state, sem AC, sem grooming)
- ❌ Marcar gate como `passed` sem evidência (review precisa rodar, verify precisa exercitar)
- ❌ Forçar 1 projeto quando claramente toca múltiplos
- ❌ Mergear frontend antes do backend que ele consome (siga `merge_order`)
- ❌ Sub-agent rodar sem cwd correto (`state.projects[i].root`)
- ❌ Inventar regras de stack — sempre consulte tópicos do projeto

## Quando o behavior NÃO se aplica

- Sessões puramente exploratórias ("me mostra como X funciona")
- Bugs triviais resolvidos em < 1 commit (vá direto, não precisa SDD)
- Refactor mecânico (rename, formatação, lint fix)

Se usuário pediu `/sdd-*` mesmo pra task simples, respeite — mas avise que pode ser overkill.
