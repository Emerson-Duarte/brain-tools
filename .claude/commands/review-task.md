---
description: Revisão multi-projeto por TASK_ID. Expande para subtasks + issuelinks "Blocks"/"Relates" do Jira. Descobre branches `task/<ID>/*` em cada repo Vakinha, executa skill review_vk_<repo> em paralelo (Agents), sintetiza relatório cross-repo com riscos de integração. Não aplica correções.
argument-hint: "<TASK_ID> [--no-links] [--no-subtasks]. Omitido → deriva do branch atual `task/VK25-XXXX/...`."
---

# /review-task — Revisão multi-projeto por Task ID

Responsabilidade única: **revisar todos os repos Vakinha envolvidos em uma única task, em paralelo, e relatar riscos cross-repo**. Não aplica correções (multi-repo = alto risco). Para correção, chamar `/review_vk_<repo>` individual depois.

> Diferente de `/sdd-review` (gates pre-PR de uma task SDD em andamento), este command roda contra branches já existentes, sem precisar de `state.yml`.

## 🛂 Pré-requisitos

- Branches `task/<TASK_ID>/*` em pelo menos 1 repo Vakinha
- Skills `review_vk_<repo>` instaladas (todas já estão em `brain-data/ai/skills/`)
- MCP Atlassian autenticado (`mcp__claude_ai_Atlassian__getJiraIssue`)

## ⚙️ Fluxo

### 1. Resolver TASK_ID

- Se `$ARGUMENTS` veio: usar como `TASK_ID`
- Senão: ler branch do CWD (`git rev-parse --abbrev-ref HEAD`); extrair `VK\d+-\d+` do padrão `task/<ID>/...`
- Se nenhum dos dois: ABORT — "Forneça TASK_ID ou rode em branch `task/VK25-XXXX/*`"

Normalize formato (uppercase, hífen único): `VK25-1885`.

### 2. Contexto Jira + expansão de escopo

#### 2a. Issue principal

Chame `mcp__claude_ai_Atlassian__getJiraIssue` com:
- `cloudId`: descoberto via `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources` (cache: cloudId do site vakinha)
- `issueIdOrKey: <TASK_ID>`
- `fields`: `["summary", "status", "assignee", "description", "issuetype", "priority", "subtasks", "issuelinks", "parent"]`
- `responseContentFormat: "markdown"`

Capture do retorno:
- `summary` (título)
- `status.name`
- `assignee.displayName`
- `description` (extrair AC se houver seção "Critérios de Aceite" / "Acceptance Criteria" / similar)
- `issuetype.name`
- `priority.name`
- `subtasks[*].key` → IDs de subtasks
- `issuelinks[*]` → filtrar por `type.name` ∈ {`Blocks`, `Relates`} → coletar `inwardIssue.key` ou `outwardIssue.key` (o que estiver presente, exceto a própria issue)

Se issue não encontrada → seguir sem contexto Jira (avisar no relatório). Pular passo 2b. Usar SÓ `<TASK_ID>` no scan.

Salve em `JIRA_CTX` (resumo 4-6 linhas do conteúdo principal).

#### 2b. Construir lista de TASK_IDs a escanear

```
task_ids = [<TASK_ID>]   # sempre inclui o principal

se NÃO --no-subtasks:
  task_ids += subtasks[*].key

se NÃO --no-links:
  task_ids += issuelinks filtrados (Blocks + Relates)
```

Deduplique. Reportar ao usuário o escopo expandido:

```
🔗 Escopo expandido a partir de <TASK_ID>:
  - <TASK_ID> (principal): <summary>
  - VK25-XXXX (is blocked by): <summary>
  - VK25-YYYY (subtask): <summary>
  ...
Total: N task IDs no escopo.
```

Se nenhum ID extra: seguir só com `<TASK_ID>` sem fanfarra.

#### 2c. Buscar contexto das tasks linkadas (opcional, leve)

Para cada ID extra, chame `getJiraIssue` apenas com `fields: ["summary", "status"]` — só pra ter título no relatório. Não precisa descrição completa.

### 3. Scan repos

Repos Vakinha (caminho fixo `/Users/dev/www/vakinha/<repo>/`):

```
vakinha-api            vakinha-admin-api      vakinha-engine
vakinha-web            vakinha-admin-web      vakinha-bio-next
vakinha-widget         vakinha-manager-web    vakinha-app
vakinha-da-sorte       vakinha-client-kit
```

Itere sobre **cada `task_id` em `task_ids[]`** (construído em 2b):

```bash
# Para cada repo:
git -C /Users/dev/www/vakinha/<repo> fetch --quiet origin 2>/dev/null || true

# Para cada task_id em task_ids:
git -C /Users/dev/www/vakinha/<repo> branch -a 2>/dev/null \
  | grep -E "task/${task_id}/" \
  | head -3
```

Otimização: rode `fetch` uma vez por repo, depois reuse para escanear todos os task_ids.

Para cada match registre:
- `repo_name`
- `task_id` (qual ID gerou esse match)
- `branch_name` (preferir local; remoto `remotes/origin/task/...` → strip `remotes/origin/`)
- `base_branch` (default: `develop`. Se branch é `release/X` ou diff vs `develop` vazio mas vs `main` não, ajustar)

**Se um repo aparece em múltiplos task_ids:** trate cada combinação `(repo, task_id, branch)` como entrada separada. Em geral isso significa que o mesmo repo tem 2 branches relacionadas — relatório agrupa por repo e mostra as duas.

Mapeie pro skill correspondente:

| repo | skill |
|------|-------|
| vakinha-api | review_vk_api |
| vakinha-admin-api | review_vk_admin_api |
| vakinha-engine | review_vk_engine |
| vakinha-web | review_vk_web |
| vakinha-admin-web | review_vk_admin_web |
| vakinha-bio-next | review_vk_bio_next |
| vakinha-widget | review_vk_widget |
| vakinha-manager-web | review_vk_manager_web |
| vakinha-app | review_vk_app |
| vakinha-da-sorte | review_vk_da_sorte |
| vakinha-client-kit | review_vk_client_kit |

Se **0 matches em qualquer task_id**: ABORT — "Nenhum branch `task/<ID>/*` encontrado pra nenhum dos IDs no escopo (`${task_ids}`). Confirma TASK_ID?"

Se algum `task_id` extra (linkado/subtask) **não tem branch em nenhum repo**: anotar pro relatório ("VK25-XXXX no escopo Jira mas sem branch local — provavelmente ainda não iniciada"). Não aborta.

### 4. Spawn paralelo (1 Agent por repo)

**Em um único turno**, lance N Agents (subagent_type: `general-purpose`, foreground) — paralelismo real. Cada um recebe:

> Você é revisor especializado em `<repo_name>` para a task `<task_id_dessa_branch>`.
>
> **Contexto Jira da task principal (`<TASK_ID>`):**
> ```
> <JIRA_CTX>
> ```
>
> **Esta branch implementa task `<task_id_dessa_branch>`** (`<summary curta>`). Se `<task_id_dessa_branch>` == `<TASK_ID>`, é a task principal. Senão, é uma task linkada (blocks/relates/subtask) — revise no contexto da task principal.
>
> **Sua missão:**
> 1. `cd /Users/dev/www/vakinha/<repo_name>`
> 2. Verifique branch atual; se não for `<branch_name>`, NÃO troque — apenas revise via `git diff origin/<base_branch>...<branch_name>` ou `git log origin/<base_branch>..<branch_name>`. Evite alterar working tree.
> 3. Liste arquivos alterados: `git diff --name-only origin/<base_branch>...<branch_name>`
> 4. Leia a skill `/Users/dev/www/vakinha/<repo_name>/.claude/skills/<skill_name>/SKILL.md` e siga o checklist passo a passo, mas:
>    - Substitua `git diff --name-only HEAD` por `git diff --name-only origin/<base_branch>...<branch_name>` quando a skill mandar listar arquivos
>    - Em verificações automáticas (rubocop/yarn lint/type-check) — rode somente se conseguir sem efeito colateral; se requer install, marque "skipped (install needed)"
>    - Não pergunte ao usuário no final — APENAS retorne o relatório
> 5. **Acrescente uma seção `## Sinais cross-repo`** ao final:
>    - Se repo é `vakinha-api` ou `vakinha-admin-api`:
>      - Liste novos endpoints (controllers + routes): `git diff origin/<base_branch>...<branch_name> -- config/routes.rb app/controllers/`
>      - Liste mudanças em mailer/decorator/model que potencialmente afetam engine
>    - Se repo é `vakinha-engine`: TODA mudança é cross-repo. Liste métodos públicos modificados.
>    - Se repo é `vakinha-client-kit`: TODA mudança é cross-repo. Liste componentes/exports alterados.
>    - Se repo é frontend (web/admin-web/bio-next/widget/manager-web/app/da-sorte):
>      - Liste novas chamadas a endpoints que parecem novos (`POST /v1/...`, `GET /...`, etc.) em `src/actions/`/`app/actions/`/equivalente
>      - Sinalize se há `Customer-Api-Key` ou `API_HOST` env nova exigida
>
> **Não edite arquivos. Não pergunte se quer aplicar correções.** Apenas relate.
>
> Retorne o relatório completo em Markdown.

### 5. Coletar e analisar cross-repo

Quando todos Agents responderem, agregue.

**Regras cross-repo (gere alertas se condição bate):**

- `vakinha-engine` no escopo → revisar uso em `vakinha-api` E `vakinha-admin-api`:
  - Se `vakinha-api` está no escopo: OK, verifique se `Gemfile.lock` foi atualizado
  - Se `vakinha-api` **NÃO** está no escopo: ⚠️ alerta — provável que api precise PR de bump também
  - Mesma checagem para `vakinha-admin-api`
- `vakinha-client-kit` no escopo → revisar consumidores (web, admin-web, bio-next, widget):
  - Se algum consumidor está no escopo: verificar `package.json` da lib (versão usada bate?)
  - Consumidor que NÃO está no escopo mas usa componente alterado: ⚠️ alerta
- Endpoints novos em `vakinha-api`/`vakinha-admin-api` → cada frontend no escopo:
  - Deve ter chamada nova em `src/actions/`/`app/actions/`/equivalente
  - Se frontend está no escopo mas não tem chamada: ⚠️ alerta (endpoint criado mas frontend não consome?)
- Header de auth: `Customer-Api-Key` (var diferente em `vakinha-da-sorte`: `NEXT_PUBLIC_CUSTOMER_KEY`)
- Migrations: SOMENTE em `vakinha-api/db/migrate/`. Migration em `vakinha-admin-api/db/migrate/` = ❌ blocking

**Merge order recomendada (canônica, ver `_global/sdd-multi-project.md`):**

1. Engine/lib: `vakinha-engine`, `vakinha-client-kit`
2. Backends: `vakinha-api`, `vakinha-admin-api`
3. Frontends: `vakinha-app`, `vakinha-web`, `vakinha-bio-next`, `vakinha-admin-web`, `vakinha-da-sorte`, `vakinha-widget`, `vakinha-manager-web`

Liste a ordem aplicável (só repos no escopo).

### 6. Relatório final

Imprima em Markdown:

```markdown
# /review-task <TASK_ID>

## Task principal
- **Título:** <jira summary>
- **Status:** <status>
- **Assignee:** <name>
- **Tipo:** <issuetype> | **Prioridade:** <priority>

**Descrição:**
<resumo 3-4 linhas>

**Critérios de aceite:**
- <AC se identificado>

## Escopo expandido (<N> tasks)

| Task ID | Tipo | Summary | Status | Branch encontrada |
|---------|------|---------|--------|-------------------|
| `<TASK_ID>` | principal | <summary> | <status> | sim/não |
| `VK25-XXXX` | is blocked by | <summary> | <status> | sim (<repo>) |
| `VK25-YYYY` | subtask | <summary> | <status> | não — sem branch local |

> Tasks sem branch local são listadas pra contexto mas não geram revisão.

## Repos no escopo (<N>)

| Repo | Task ID | Branch | Base | Δ arquivos | Skill aplicada |
|------|---------|--------|------|------------|----------------|
| <repo> | `<task_id>` | `<branch>` | `<base>` | <N> | `review_vk_<x>` |

## Achados por repo

### <repo 1>
<relatório completo do Agent 1>

### <repo 2>
<relatório completo do Agent 2>

...

## Análise cross-repo

### Riscos
- ⚠️/❌/✅ <item>
- ...

### Contrato de API
- Novos endpoints: <lista de routes:method>
- Frontends consumidores no escopo: <list>
- Frontends consumidores **fora** do escopo (mas dependem): <list — alerta se houver>

### Lib/Engine
- vakinha-engine alterado: sim/não
- vakinha-client-kit alterado: sim/não
- Bumps necessários nos consumidores: <list>

### Merge order recomendada
1. <ordem aplicável>

## Próximas ações
- [ ] item 1 (<repo>) — severidade
- [ ] item 2 (cross-repo) — severidade
- ...

## Observações
- <qualquer coisa fora do padrão — ex: AC sem cobertura aparente, repo esperado mas sem branch, etc.>
```

## 🚫 Fora de escopo

- ❌ Aplicar correções (multi-repo arriscado — usar skill individual depois)
- ❌ Rodar testes pesados (a skill individual orienta sobre lint/type-check; testes longos ficam pro CI)
- ❌ Mexer no working tree dos repos (checkout, rebase, etc. — só leitura via `git diff`)
- ❌ Abrir/comentar PR (não é responsabilidade deste command)

## 💡 Quando NÃO usar

- Task de 1 único repo → `cd <repo>` e use `/review_vk_<repo>` direto (mais rápido)
- Você ainda não implementou (use `/sdd-implement` antes)
- Quer revisar PR aberto no GitHub → use `/review` builtin ou `/god-review`

## 🔗 Skills relacionadas

- `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-multi-project.md` — regras de iteração multi-project
- `review_vk_<repo>` — skills per-repo invocadas por cada Agent
- `/sdd-review` — self-review pré-PR (single ou multi via state.projects[])
