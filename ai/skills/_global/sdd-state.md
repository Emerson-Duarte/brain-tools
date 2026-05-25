---
title: "Skill: SDD Workflow State (shared, multi-project)"
tags: [meta, sdd, state, shared, multi-project]
stack: [all]
category: meta
---

# Estado do Workflow SDD — Multi-Project

Bloco compartilhado por todos os `/sdd-*` slash commands. Persiste o progresso de uma task **que pode envolver múltiplos projetos** entre invocações isoladas.

## 📁 Layout

Estado vive **no projeto primário** (escolhido em `/sdd-discover`). Sub-commands rodam de qualquer cwd — usam `state.primary_project.root` pra reabrir.

```
<primary-project-root>/docs/sdd-<slug>/
├── _state.md          ← arquivo de estado (YAML frontmatter + log body)
├── grooming.md        ← output do /sdd-discover
├── ac.md              ← critérios de aceite
├── plan.md            ← SDD (uma seção por projeto envolvido)
└── review.md          ← achados do /sdd-review (opcional)
```

**Não conflita com `vakinha-specs/`** — `vakinha-specs/tasks/` é canônico de produto (populado pelo framework GOD). `docs/sdd-<slug>/` é workspace operacional do SDD (interno).

## 📐 Schema do `_state.md` — multi-project

```markdown
---
slug: login-apple
created: 2026-05-25T14:00:00Z

# Projeto primário — onde state vive, e fallback pra context loading
primary_project: vakinha-app

# Lista completa de projetos envolvidos na task (pode ser 1+)
projects:
  - name: vakinha-app
    root: /Users/dev/www/vakinha/vakinha-app
    role: frontend                    # frontend | backend | lib | infra | mobile | web | api
    branch: feat/login-apple
    jira_keys: [VKAP-1234]
    jira_main_key: VKAP-1234
    artifacts:
      pr_url: null
      pr_number: null
      commits: []
    gates:                            # gates por projeto (cada um tem commands.md próprio)
      review: pending
      verify: pending
  - name: vakinha-api
    root: /Users/dev/www/vakinha/vakinha-api
    role: backend
    branch: feat/oauth-apple
    jira_keys: [VKAPI-567]
    jira_main_key: VKAPI-567
    artifacts:
      pr_url: null
      pr_number: null
      commits: []
    gates:
      review: pending
      verify: pending

# Acceptance Criteria — globais à task (não por projeto)
ac:
  - id: CA1
    text: "Usuário consegue logar com Apple ID no app"
    verified: false
    covered_by: [vakinha-app, vakinha-api]   # quais projetos cobrem o AC
  - id: CA2
    text: "Token Apple validado no backend"
    verified: false
    covered_by: [vakinha-api]

# Gates GLOBAIS (não por projeto) — bloqueiam progressão do workflow
gates:
  spec_validate: pending     # único SDD aprovado humanamente
  # review e verify por-projeto vivem dentro de projects[].gates

artifacts:
  grooming: docs/sdd-login-apple/grooming.md
  spec: docs/sdd-login-apple/plan.md

steps:
  - id: discover
    status: completed
    timestamp: 2026-05-25T14:05:00Z
  - id: spec
    status: completed
    timestamp: 2026-05-25T14:30:00Z

merge_order: [vakinha-api, vakinha-app]   # backend antes de frontend (default)

last_step: spec
last_run: 2026-05-25T14:30:00Z
status: in_progress         # in_progress | done | aborted
---

# SDD Log — login-apple

Sessão iniciada em 2026-05-25T14:00Z.
Projetos envolvidos: vakinha-app (primário) + vakinha-api.
```

## 🔍 Resolução do state em cada `/sdd-*`

**Fonte de paths de projetos:** `~/.claude/CLAUDE.md` (Mapa de Projetos). Esse arquivo lista todos os projetos da família + diretório raiz comum. NÃO hardcode paths neste arquivo — sempre derive do mapa global.

```
0. Carregue paths do mapa global:
   Read ~/.claude/CLAUDE.md → seção "Mapa de Projetos Vakinha"
   Parse a tabela e a linha "Todos em <dir>/<projeto>/"
   Resultado: dict { project_name: project_root_path }

1. Se --slug=<X> e --primary=<proj> passados:
   state_path = "<paths[proj]>/docs/sdd-<X>/_state.md"
   (paths[proj] vem do mapa global)

2. Se --slug=<X> apenas:
   Procure state em <cwd>/docs/sdd-<X>/_state.md PRIMEIRO.
   Se ausente, itere paths do mapa global:
     for proj, root in paths.items():
       if exists(f"{root}/docs/sdd-<X>/_state.md"): candidates.append(proj)
   - 1 encontrado → use, imprima "📌 primary=<proj>, slug=<X>"
   - 2+ encontrados → ABORTAR pedindo --primary=<proj>

3. Sem --slug:
   Procure docs/sdd-*/_state.md mais recente no cwd.
   Se cwd não tem nenhum → itere paths do mapa global procurando states ativos.
   - 0 ativos E este passo ≠ "discover" → ABORTAR
   - 1 ativo → use
   - 2+ ativos → ABORTAR pedindo --slug=<X>
```

**Por quê via mapa global:** evita hardcode no skill (não-portável entre usuários), permite adicionar projeto novo editando só o `~/.claude/CLAUDE.md` global, e respeita a fonte única de verdade da família de projetos.

## 🛂 Validação de gates antes de executar

Gates **globais** (`state.gates.*`) bloqueiam o workflow inteiro:
- `spec_validate` — aplica a TODOS os projetos (SDD é único, gate é único)

Gates **por-projeto** (`state.projects[i].gates.*`) bloqueiam só aquele projeto:
- `review`, `verify` — cada projeto tem seu commands.md, seus AC cobertos, sua app a rodar

Sub-command itera sobre projects relevantes e verifica gates respectivos. Se algum projeto tem gate pending → ABORT pra esse projeto (não pra task inteira, a menos que TODOS estejam pending).

**Skip explícito:** `--skip-gate=<name>` (global) ou `--skip-gate=<proj>:<name>` (por-projeto). Sempre exige aprovador, registrado no body.

## 🪧 Body schema (após o `---` final)

Body é log human-readable. Convenção:

```markdown
# SDD Log — <slug>

Sessão iniciada em <iso>. Projetos envolvidos: <lista>.

## Captura inicial
<output do passo `/sdd-discover` cap. inicial — problema, stakeholders, escopo>

## Grooming acumulado
<síntese curta — detalhe completo em artifacts.grooming>

## Decisões durante o workflow
- <decisão 1, com timestamp>
- <decisão 2>

## Skips registrados
- gate=<X> por <aprovador> em <timestamp> — razão: <texto>

## Aprendizados pra capturar
- <item 1>
```

Seções podem ser adicionadas conforme o workflow avança. Não é YAML — é prosa estruturada.

## 🔄 Status de cada passo durante execução

Estado de cada entry em `steps[]`:

| status | Quando |
|--------|--------|
| `in_progress` | Sub-command começou mas não terminou (escreva ANTES de executar o trabalho) |
| `completed` | Sub-command terminou com sucesso (escreva DEPOIS) |
| `failed` | Sub-command abortou por erro/lacuna não resolvida |
| `skipped` | Bypass via `--skip-gate=<name>` (anote `approver:` junto) |

**Padrão de invocação:**
1. Read state, append `steps: [{id: <X>, status: in_progress, timestamp: <now>}]`
2. Faça o trabalho
3. Edit a entry: `status: completed | failed`, atualize `last_step`, `last_run`

## ✍️ Escrita do state

Sempre via `Edit` no frontmatter YAML. Operações típicas:

**Globais:**
- Marcar passo: `steps:` append
- Atualizar `last_step`, `last_run`, `status`, `gates.spec_validate`
- Adicionar artefato global: `artifacts.<key>`
- Adicionar AC: append em `ac:`

**Por-projeto:**
- Atualizar `projects[<name>].branch`, `.jira_keys`, `.gates.<name>`
- Adicionar PR: `projects[<name>].artifacts.pr_url`
- Adicionar commit: append em `projects[<name>].artifacts.commits`

## 🧬 Criação inicial (apenas `/sdd-discover`)

```
1. Slug determinado (--slug passado ou perguntado).
2. Projeto primário determinado (cwd, ou perguntado).
3. Projetos adicionais perguntados ao usuário (com sugestões de cross-project deps).
4. mkdir -p <primary.root>/docs/sdd-<slug>/
5. Write _state.md com schema vazio: projects=[primário + adicionais], ac=[], gates pending.
```

## 🔁 Detecção de projetos adicionais

`/sdd-discover` deve **sugerir projetos vizinhos** baseado em:

1. **Cross-project deps** declaradas no índice do projeto primário (seção `🔗 Cross-project deps`).
2. **Heurística de palavras-chave** no título da task:
   - "endpoint", "API", "backend" → sugerir api/admin-api
   - "tela", "screen", "componente" → sugerir frontend correspondente
   - "engine", "model", "domínio" → sugerir vakinha-engine + ambas APIs
   - "componente compartilhado", "styleguide" → sugerir vakinha-client-kit
3. **Mapa global** em `~/.claude/CLAUDE.md` (regras cross-project) — fonte de verdade pra deps.

Apresentação ao usuário (use `AskUserQuestion` com `multiSelect: true`):

```
🔗 Quais projetos esta task envolve? (primário: <X> já incluído)

  [✓] <primary>     (já marcado, role: <inferido>)
  [ ] vakinha-api   (backend — sugerido por menção "endpoint")
  [ ] vakinha-engine (compartilhado entre apis)
  [ ] outro...
```

Para cada projeto marcado, inferir **role** do `CLAUDE.md` do projeto (campo principal) ou perguntar se ambíguo.

## ⛔ Anti-padrões

- ❌ Forçar 1 projeto quando task claramente toca N — registre todos no state
- ❌ Criar N states (um por projeto) — state é único, projects[] dentro
- ❌ Carregar contexto só do projeto primário — todo passo iterа sobre projects[]
- ❌ Mergear todos os PRs ao mesmo tempo — siga `state.merge_order`
- ❌ Inicializar state fora do `/sdd-discover`

## 🧭 Próximo passo (mapeamento)

| last_step | Próximo recomendado |
|-----------|---------------------|
| discover | /sdd-spec |
| spec | /sdd-spec-validate |
| spec-validate (passed) | /sdd-tasks |
| tasks | /sdd-implement |
| implement | /sdd-review |
| review (todos os projetos passed) | /sdd-verify |
| verify (todos passed) | /sdd-pr |
| pr (todos PRs abertos) | /sdd-watch |
| watch (todos PRs aprovados) | /sdd-merge |
| merge (todos mergeados) | /sdd-postdeploy |
| postdeploy | /sdd-capture |
| capture | (fim) |

## 🔄 Manutenção manual

- **Listar tasks ativas:** `find ~/www/vakinha/*/docs/sdd-*/_state.md -type f` + grep `status: in_progress`
- **Adicionar projeto a task ativa:** edite `projects:` no `_state.md`, adicione entrada com gates pending — sub-commands seguintes vão incluí-lo automaticamente
- **Remover projeto:** edite, mas confirme que ele não tem PR aberto ainda
