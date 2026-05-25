---
description: Fase 1 — captura + grooming técnico + critérios de aceite. Multi-project. Inicializa state.
argument-hint: "[--slug=<slug>] [--primary=<proj>] [--with=<proj1,proj2>] [--task=<jira-key>] [descrição]"
---

# /sdd-discover — Fase 1: Discovery (multi-project)

Responsabilidade única: **transformar task crua em entendimento + AC mensuráveis**, mapeando **todos os projetos envolvidos**. Saída é input do `/sdd-spec`.

Combina passos 1 (captura), 2 (grooming), 3 (critérios de aceite) do SDD.

## 🛂 Pré-requisitos

- `cwd` dentro de um projeto válido (com `CLAUDE.md` ou registrado em `projects.conf`) OU `--primary=<proj>` passado.
- Brain MCP conectado.

**Sem pré-requisitos de gate** — este é o primeiro passo.

## 📥 Carregamento de contexto

Siga `ai/skills/_global/_load-project-context.md`.

### 1. Determinar projeto primário

- `--primary=<proj>` → use
- Senão, infira do `cwd` (procura `CLAUDE.md` ascendente)
- Senão, pergunte ao usuário

### 2. Sugerir projetos vizinhos

Carregue `CLAUDE.md` do primário. Leia seção `🔗 Cross-project deps`.

Também leia o **mapa global** em `~/.claude/CLAUDE.md` (Mapa de Projetos Vakinha) — regras cross-project lá têm precedência (ex.: "Bug no engine impacta vakinha-api E vakinha-admin-api").

**Heurística por palavras-chave** na descrição da task:

| Termo no título/descrição | Projetos sugeridos |
|---------------------------|--------------------|
| endpoint, API, backend, controller | vakinha-api, vakinha-admin-api |
| model, migration, engine, domain | vakinha-engine + ambas APIs |
| tela, screen, página, componente | frontend do contexto (app/web/etc.) |
| client-kit, styleguide compartilhado | vakinha-client-kit + vakinha-web + vakinha-bio-next |
| admin, painel admin | vakinha-admin-web + vakinha-admin-api |
| push, e-mail, notificação | engine + projeto que dispara |

### 3. Apresentar lista pra usuário escolher

Use `AskUserQuestion` (`multiSelect: true`):

```
🔗 Quais projetos esta task envolve?

  [✓] <primary>           (primário, role inferido: <X>)
  [ ] vakinha-api         (sugerido por: cross-project deps)
  [ ] vakinha-engine      (sugerido por: regras cross-project no mapa global)
  [ ] outros...
```

Pra cada selecionado: identifique **role** lendo o `CLAUDE.md` do projeto (overview) — se ambíguo, pergunte (`frontend | backend | lib | mobile | api | infra`).

### 4. Carregar contexto de cada projeto envolvido

Pra cada projeto em `state.projects`:

1. `mcp__brain__get_project_context` (já carregado pro primário; pros adicionais, carregar agora)
2. Carregue tópicos do **discovery profile** de cada um:
   - `architecture.md`
   - `glossary.md`
   - `observability.md` (se relevante)
   - `payments.md` / `notifications.md` (se aplicável)
3. Carregue **agents project-specific** se índice declara (passo 4b do `_load-project-context.md`)
4. `get_behavior` com `context="sdd"` + `context="grooming"`
5. `search_projects` + `search_knowledge` por precedentes (incluir cross-project)

## ⚙️ Execução

### 1. Resolução de slug e state

Siga `ai/skills/_global/sdd-state.md`:

- Slug: pergunte se omitido (sugira a partir da descrição em kebab-case).
- Crie `<primary>/docs/sdd-<slug>/_state.md` com schema multi-project (lista `projects[]`).

### 2. Captura inicial (passo 1)

`AskUserQuestion` (1 pergunta por dimensão, limite 4 opções):

- Problema/oportunidade e usuário-alvo
- Card Jira em qual projeto? (pode ter um por projeto envolvido; passe `--task=<key>` pra primário e pergunte pros demais)
- Stakeholders / equipes envolvidas
- Escopo aproximado por projeto (cite **camadas descritas em `architecture.md` de cada projeto** — não invente)

Persiste no body do `_state.md` como seção `# Captura inicial`.

### 3. Grooming técnico (passo 2) — por projeto

Carregue `ai/skills/_global/sdd-grooming.md` (Read). **Itere sobre projects[]** — pra cada projeto:

- Research no brain já feito acima
- Research no código: **delegue a sub-agent `Explore` com cwd = `projects[i].root`**. Prompt moldado pelo índice daquele projeto.

Acumule findings num único `grooming.md` com seções por projeto:

```markdown
# Grooming — <task>

## Projeto: vakinha-app
<output do grooming desse projeto>

## Projeto: vakinha-api
<output do grooming desse projeto>

## Acoplamentos cross-project
- App chama endpoint X → backend retorna Y
- ...
```

### 4. Critérios de aceite (passo 3)

AC são **globais à task**, não por projeto. Mas cada AC deve indicar **quais projetos o cobrem** (`covered_by:`).

Pergunte focado em "como saberemos que está pronto?". Liste 3-8 critérios mensuráveis. Pra cada, identifique `covered_by: [<projetos>]`.

Output em `<primary>/docs/sdd-<slug>/ac.md`:

```markdown
# Critérios de Aceite — <título>

- **CA1:** <texto> — coberto por: vakinha-app, vakinha-api
- **CA2:** <texto> — coberto por: vakinha-api
```

## 💾 Persistência

Atualize `_state.md`:

```yaml
primary_project: <X>
projects:
  - name: <X>
    root: <path>
    role: <role>
    branch: null
    jira_keys: [<key se passado>]
    jira_main_key: <key>
    artifacts: {pr_url: null, commits: []}
    gates: {review: pending, verify: pending}
  - name: <Y>
    ...

ac:
  - id: CA1
    text: "..."
    verified: false
    covered_by: [X, Y]

merge_order: [<api primeiro, depois frontend; ou perguntar usuário>]

artifacts:
  grooming: docs/sdd-<slug>/grooming.md
  ac: docs/sdd-<slug>/ac.md
steps:
  - id: discover
    status: completed
    timestamp: <iso now>
last_step: discover
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-discover concluído

Slug: <slug>
Primário: <X>
Projetos envolvidos: <X, Y, Z>
AC: <N> critérios (cobertura por projeto registrada)
Grooming: <primary>/docs/sdd-<slug>/grooming.md

📍 Próximo: /sdd-spec --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Escrever SDD (= `/sdd-spec`)
- ❌ Criar issues Jira (= `/sdd-tasks`)
- ❌ Implementar nada
