---
description: Revisão de Pull Request do GitHub (org vakinha) a partir de URL. Auto-trigger quando o usuário cola link `github.com/vakinha/<repo>/pull/N` pedindo (ou implicando) review. Três camadas — (1) brechas de implementação: segurança, fraude, dinheiro, edge cases, race conditions, idempotência, janela de deploy; (2) aderência aos padrões via skill `review_vk_<repo>` do projeto; (3) coerência cross-project: task Jira, PRs irmãos, contratos de API, ordem de merge. CI (`gh pr checks`) é input obrigatório do veredito. Não aplica correções. Publica comentários no PR somente com `--post` + confirmação.
argument-hint: "<PR_URL | repo#N> [--post] [--quick] [--no-cross]"
---

# /review-pr — Revisão de PR Vakinha por URL

Responsabilidade única: **revisar um PR do GitHub da org `vakinha` em profundidade e relatar** — brechas, violações de padrão e riscos cross-repo. Não edita arquivos, não faz checkout, não aprova/rejeita o PR. Publicação de comentários é opt-in.

> Complementa (não substitui):
> - `/review-task` — revisão multi-repo por TASK_ID sobre branches locais (pré-PR)
> - `/review_vk_<repo>` — checklist de padrões por projeto (reusado internamente aqui)
> - `/god-review` — batch de PRs abertos que pedem sua atenção

## 🛂 Pré-requisitos

- `gh` CLI autenticado na org `vakinha` (`gh auth status`)
- MCP Atlassian autenticado (opcional — sem ele, segue sem contexto Jira e avisa)
- Clone local do repo é **opcional** (enriquece a análise mas não é exigido — `vakinha-engine` e `vakinha-widget` podem não estar clonados como git)

## ⚙️ Fluxo

### 1. Resolver o PR

Aceite qualquer formato: URL completa (`https://github.com/vakinha/<repo>/pull/<N>`), `vakinha/<repo>#<N>`, `<repo>#<N>`.

- Extraia `REPO` e `PR_NUMBER`
- Se org ≠ `vakinha`: ABORT — "Esta skill cobre apenas repos da org vakinha."
- Se argumento omitido e o CWD é um repo Vakinha em branch com PR aberto: `gh pr view --json number` para descobrir. Senão ABORT pedindo a URL.

Mapa repo → recursos:

| repo | path local | skill de padrões |
|------|-----------|------------------|
| vakinha-api | `/Users/dev/www/vakinha/vakinha-api` | `review_vk_api` |
| vakinha-admin-api | `.../vakinha-admin-api` | `review_vk_admin_api` |
| vakinha-engine | `.../vakinha-engine` | `review_vk_engine` |
| vakinha-web | `.../vakinha-web` | `review_vk_web` |
| vakinha-admin-web | `.../vakinha-admin-web` | `review_vk_admin_web` |
| vakinha-bio-next | `.../vakinha-bio-next` | `review_vk_bio_next` |
| vakinha-widget | `.../vakinha-widget` | `review_vk_widget` |
| vakinha-manager-web | `.../vakinha-manager-web` | `review_vk_manager_web` |
| vakinha-app | `.../vakinha-app` | `review_vk_app` |
| vakinha-da-sorte | `.../vakinha-da-sorte` | `review_vk_da_sorte` |
| vakinha-client-kit | `.../vakinha-client-kit` | `review_vk_client_kit` |

**Resolução da skill de padrões** (primeira que existir):
1. `<path local>/.claude/skills/<skill>/SKILL.md`
2. `/Users/dev/www/vakinha/brain-data/ai/skills/<repo>/<skill>.md`
3. Nenhuma → checklist genérico (regras do `CLAUDE.md` do workspace) e anotar lacuna no relatório

### 2. Coletar o PR

```bash
gh pr view <N> -R vakinha/<repo> --json title,body,author,state,isDraft,baseRefName,headRefName,headRefOid,additions,deletions,changedFiles,labels,reviews,mergeable,url
gh pr checks <N> -R vakinha/<repo>
gh pr diff <N> -R vakinha/<repo>
gh api "repos/vakinha/<repo>/pulls/<N>/comments" --paginate --jq '.[] | {user: .user.login, path, line, body}'
```

- **CI é input obrigatório do veredito** — check falhando entra no relatório; nunca dar 🟢 com CI vermelho (exceção: falha comprovadamente flaky/infra, anotada)
- `mergeable == CONFLICTING` → anotar conflito de merge no relatório
- `state == MERGED`: avisar ("PR já mergeado — review vira auditoria post-merge") e continuar
- `isDraft`: anotar (autor pode ainda estar trabalhando)
- Comentários inline existentes (último comando) + reviews: **não repetir achado que outro revisor já apontou** — referencie ("já apontado por X")
- Se `gh pr diff` falhar (diff muito grande) ou `changedFiles > 100`: fallback `gh api "repos/vakinha/<repo>/pulls/<N>/files" --paginate` (patch por arquivo)

**Extrair TASK_ID**: procurar `VK\d+-\d+` no título (`[VK25-XXXX] ...`), no branch (`task/VK25-XXXX/...`) ou no body. Sem TASK_ID → seguir sem Jira e sem expansão cross-task (avisar).

**Contexto local (se `<path local>/.git` existe):**
```bash
git -C <path> fetch --quiet origin "+refs/pull/<N>/head:refs/remotes/origin/pr-<N>" "+refs/heads/<baseRef>:refs/remotes/origin/<baseRef>"
git -C <path> diff "origin/<baseRef>...origin/pr-<N>"
```
Refspec explícita — **nunca usar FETCH_HEAD** (fetch concorrente clobbera e o diff sai vazio/errado). Three-dot = só o que o PR introduz. Leia arquivos completos via `git -C <path> show origin/pr-<N>:<file>` quando precisar de contexto ao redor do diff. **Nunca checkout, nunca tocar no working tree.**

**Sem clone local**: `gh pr diff` + `gh api "repos/vakinha/<repo>/contents/<path>?ref=<headRefOid>"` para arquivos inteiros (usar o **SHA** `headRefOid`, não o nome do branch — PR de fork não tem o branch no repo base).

### 3. Contexto Jira (se TASK_ID existe)

Como em `/review-task` passo 2: `getJiraIssue` com `fields: ["summary", "status", "description", "issuetype", "priority", "subtasks", "issuelinks", "parent"]`.

- **AC**: extrair critérios de aceite **somente se houver seção explícita** ("Critérios de Aceite"/"Acceptance Criteria"/similar). Sem seção formal → `AC = none`, e o relatório diz "sem AC formal no Jira" (não inventar critérios)
- Coletar keys de subtasks + issuelinks `Blocks`/`Relates` para a busca de PRs irmãos
- Guarde `JIRA_CTX` (4-6 linhas). Issue não encontrada → seguir sem, avisar

### 4. Descoberta cross-project (pular se `--no-cross`)

Objetivo: este PR conversa com as mudanças dos outros repos da mesma feature?

**4a. PRs irmãos** — para cada task_id do escopo (principal + subtasks + links):
```bash
gh search prs "<TASK_ID>" --owner vakinha --state open --json repository,number,title,url
gh search prs --owner vakinha --head "task/<TASK_ID>" --state open --json repository,number,title,url
gh search prs "<TASK_ID>" --owner vakinha --merged --json repository,number,title,url
```
(busca por texto + por branch — título sem o ID escapa da primeira; Search API tem rate limit 30 req/min, agrupe as queries. Distinguir **merged** de fechado-abandonado; abandonado não conta como irmão ativo.)

**4b. Consumidores impactados** (deriva do conteúdo do diff, mesmo sem PR irmão):

- `vakinha-engine` no PR → impacta `vakinha-api` **e** `vakinha-admin-api`. Existe PR de bump (`Gemfile.lock`) em cada um? Senão ⚠️
- `vakinha-client-kit` no PR → impacta `vakinha-web`, `vakinha-admin-web`, `vakinha-bio-next`, `vakinha-widget`. Componente/export alterado é usado por consumidor sem PR irmão? ⚠️ (grep no clone local do consumidor)
- Endpoint novo/alterado em `vakinha-api`/`vakinha-admin-api` (diff em `config/routes.rb` + `app/controllers/`) → qual frontend consome? Tem PR irmão com a chamada em `src/actions/`/equivalente? Senão ⚠️
- Response shape: ⚠️ **somente** se campo foi removido, renomeado ou mudou de tipo — campo adicionado não é breaking. Nesses casos, listar consumidores do endpoint (grep nos clones locais)
- Migration no PR → banco compartilhado: avaliar impacto em `vakinha-admin-api` mesmo sem código lá

**4c. PRs irmãos abertos**: NÃO fazer full-review deles (scope creep). Checar apenas **contrato**: o que este PR expõe/consome bate com o que o irmão consome/expõe (nome de campo, casing, rota, header de auth)? + ordem de merge: engine/client-kit → APIs → frontends. Sinalizar se este PR depende de outro ainda aberto.

### 5. Revisão em duas passadas

Leia primeiro (nesta ordem, o que existir):
1. Behavior de code review do brain: `mcp__brain__get_behavior` com `context="code review"` — define tom e prioridades
2. Skill de padrões resolvida no passo 1
3. `<path local>/CLAUDE.md` — regras do projeto

#### Passada A — Padrões (checklist do projeto)

Aplique a skill `review_vk_<repo>` sobre o diff do PR, com adaptações:
- Onde a skill manda `git diff --name-only HEAD` → use a lista de arquivos do PR
- Verificações automáticas (rubocop/lint/type-check): **pular por padrão** — CI do PR já cobre; reporte via `gh pr checks`. Rodar localmente só se o usuário pedir
- **Escopo = arquivos do PR.** Não cobrar problema pré-existente em código não tocado — compare com o base ref na dúvida
- Não executar o passo final da skill ("quer que eu aplique correções?") — esta skill só relata

#### Passada B — Brechas (caça adversarial)

Passada independente da A, com chapéu de atacante/QA. Para cada item: "como isso quebra em produção?". Plataforma de **pagamentos e doações** — priorize:

**Segurança e fraude**
- Autorização: endpoint novo verifica ownership (`current_user.id == resource.user_id`)? `authenticate_user!`/`authenticate_customer` presente? IDOR em params de id?
- Endpoint que cria pagamento/contribution/purchase sem rate-limit (Rack::Attack), captcha ou limite de valor = vetor de *card testing*
- Mass assignment (`permit!`, `Model.create(params)`), SQL injection (interpolação em `where`), XSS em conteúdo user-generated
- Secrets/tokens hardcoded
- Webhook/callback de acquirer (MercadoPago, Openpix, Transfeera): valida assinatura/origem? Aceita replay? Trata evento **fora de ordem** (`approved` antes de `pending`)? Retorno 200 vs 5xx controla retry do acquirer — status errado engole ou duplica evento
- `vakinha-widget`: roda em iframe de terceiro — `postMessage` valida `origin`? Headers CSP/`X-Frame-Options` coerentes?

**Privacidade (LGPD)**
- Campo pessoal novo (CPF, email, telefone, endereço) em response de endpoint público?
- Doação anônima respeitada em todo lugar que exibe doador?
- Dado sensível (CPF, cartão, JWT, senha) indo pra log/Sentry/PostHog?

**Dinheiro**
- Valores em centavos (integer) vs float; arredondamento; soma de parcelas == total
- Race condition em saldo/saque/contribuição (duas requests simultâneas) — lock ou constraint de unicidade onde precisa
- Estado de pagamento: transições inválidas possíveis? Status vem do acquirer (padrão do workspace), não inventado local

**Robustez e deploy**
- Nil/empty/zero em input novo; `find_by` nil não tratado; timezone em comparação de datas; paginação em coleção que cresce
- Worker Sidekiq: idempotente (roda 2x sem duplicar efeito)? Recebe ID, não objeto AR? **Mudou assinatura de `perform`?** Jobs já enfileirados pelo código antigo quebram no deploy
- Janela de deploy: código lê coluna/tabela que a migration deste (ou de outro) PR ainda não criou em produção?
- Migration: reversível? Lock em tabela grande (`algorithm: :concurrently`)? `null: false` sem default/backfill?
- Timeout/erro de serviço externo tratado? Retry causa efeito duplicado?

**Compatibilidade**
- `vakinha-app` nas lojas roda `master` e usuários não atualizam — mudança na API quebra versão antiga do app? Campo removido/renomeado em response?
- `vakinha-app`: mudança é OTA-safe (só JS) ou exige binário novo (código nativo, `app.json`/plugins Expo)? Deep links alterados?
- Response shape alterado sem versionamento (`v2`)?
- Query param novo é snake_case (não há conversão automática)?

**Cobertura**
- Se `AC` existe: cada critério tem código correspondente no diff? AC sem cobertura = achado. Sem AC formal → omitir análise
- Caminho alternativo/erro tem teste, ou só happy path?
- Código do diff nunca executado (dead code, feature flag sem toggle)?

**Convenção de linguagem**: identificador/comentário/teste em português no código = 🔵 nit (subir pra 🟡 apenas em mensagem de erro/log que vai pra observabilidade).

#### PRs grandes (fan-out)

Se `changedFiles > 30` ou `additions + deletions > 1500`: agrupe arquivos por área (controllers, models, workers, specs, frontend...) e lance 1 Agent (`general-purpose`) por área **em um único turno**. Prompt de cada agent (literal, adaptando placeholders):

> Você é revisor especializado em `<repo>` revisando parte do PR vakinha/<repo>#<N> (`<título>`).
>
> **Contexto da task (Jira):**
> ```
> <JIRA_CTX ou "sem contexto Jira">
> ```
>
> **Sua área: <área> — arquivos:** `<lista>`
>
> **Como obter o código (não rode `git fetch` — a ref `origin/pr-<N>` já existe):**
> - Diff da sua área: `git -C <path> diff "origin/<baseRef>...origin/pr-<N>" -- <arquivos>`
> - Arquivo completo na versão do PR: `git -C <path> show origin/pr-<N>:<arquivo>`
> - (sem clone local: `gh pr diff <N> -R vakinha/<repo>` e filtre; arquivo completo via `gh api "repos/vakinha/<repo>/contents/<path>?ref=<headRefOid>"`)
>
> **Checklists:** leia `<path da skill de padrões>` (Passada A) e aplique também a caça de brechas descrita a seguir (Passada B): <colar a Passada B desta skill>.
>
> **Regras:** escopo = somente seus arquivos; não cobrar problema pré-existente em linha não tocada pelo PR; não edite nada; não pergunte nada. Classifique cada achado como 🔴 bloqueador / 🟡 corrigir antes do merge / 🔵 nit, marcando [padrão] ou [brecha]. Retorne SOMENTE tabela markdown: `| severidade | arquivo:linha | problema | sugestão |`.

Agregue e deduplique. Com `--quick`: sem fan-out — só Passada B nos arquivos de maior risco (controllers, workers, migrations, pagamentos) e anote o que ficou de fora.

### 6. Relatório

```markdown
# /review-pr vakinha/<repo>#<N>

**<título do PR>** — @<autor> | <estado> | `<head>` → `<base>` | +<add>/-<del> em <N> arquivos
Task: <TASK_ID> — <jira summary> (<status Jira>) | sem task identificada
CI: ✅ verde | ❌ <checks falhando> | ⏳ pendente     Merge: <ok | conflito>

## Veredito
🟢 sem bloqueadores | 🟡 corrigir antes do merge | 🔴 bloqueado
<1-2 linhas de justificativa>

## Achados

### 🔴 Bloqueadores
| # | Arquivo:linha | Problema | Sugestão |
### 🟡 Corrigir antes do merge
| # | Arquivo:linha | Problema | Sugestão |
### 🔵 Nitpicks / melhorias
| # | Arquivo:linha | Problema | Sugestão |

(omitir seção vazia; marcar achado da Passada A com [padrão] e da B com [brecha])

## Cobertura dos critérios de aceite
<tabela | AC | Coberto? | Evidência> — somente se AC formal existe; senão "Sem AC formal no Jira."

## Cross-project
- PRs irmãos: <lista com estado> | nenhum encontrado
- Consumidores impactados sem PR: <lista ou ✅>
- Contrato de API: <endpoints novos/alterados + quem consome + divergências com PRs irmãos>
- Ordem de merge recomendada: <apenas se aplicável>

## O que está bom
<2-4 pontos genuínos — behavior do brain: revisão não é só apontar problema>

## Não coberto nesta revisão
<áreas fora do fan-out em --quick, repos sem clone, Jira indisponível, diff truncado, etc. — nunca omitir>
```

**Rubrica do veredito** (determinística, não vibes):
- 🔴 **bloqueado**: ≥1 achado 🔴 (segurança explorável, perda/duplicação de dinheiro, quebra de compatibilidade com app em produção, migration destrutiva, dado pessoal exposto) **ou** CI vermelho sem justificativa
- 🟡 **corrigir antes do merge**: sem 🔴, mas ≥1 achado 🟡 (bug em caminho alternativo, AC sem cobertura, contrato cross-repo divergente, teste faltando em código crítico, dependência de merge não resolvida)
- 🟢 **sem bloqueadores**: só nits ou nada; CI verde ou pendente-não-crítico

### 7. Publicar comentários (somente com `--post`)

Sem `--post`: encerre no relatório e ofereça "quer que eu publique como comentários no PR? (`--post`)".

Com `--post`:
1. Converta achados 🔴/🟡 (e 🔵 relevantes) em comentários inline. Tom do behavior do brain: **pergunta > afirmação**, prefixos `[blocker]`/`[nit]`/`[question]`, em português, curtos
2. **Dedupe contra re-run**: busque `gh api "repos/vakinha/<repo>/pulls/<N>/comments" --paginate` filtrando seus próprios comentários; achado equivalente já postado → pular
3. **Valide cada comentário contra os hunks do diff** — `path` + `line` fora do diff faz a API rejeitar a review **inteira** (422). Linha em código deletado → `side: LEFT`. Achado sem linha válida no diff → mover pro body da review
4. Apresente o batch completo em bloco pro usuário revisar (formato `/god-review`)
5. **Aguarde confirmação explícita** — publicação é externa e visível pro time
6. Monte `payload.json` (body = resumo do veredito; `event: "COMMENT"`; `comments[]` com `path`, `line`, `side`, `body`) e publique:
   ```bash
   gh api "repos/vakinha/<repo>/pulls/<N>/reviews" --input payload.json
   ```
   Nunca `APPROVE`/`REQUEST_CHANGES` — veredito formal é do humano

## 🚫 Fora de escopo

- ❌ Editar arquivos, checkout, rebase, mexer em working tree (leitura apenas)
- ❌ Aprovar/rejeitar PR formalmente ou mergear
- ❌ Rodar testes/lint locais (CI do PR cobre; ver `gh pr checks`)
- ❌ Rever arquivos que o PR não tocou
- ❌ Full-review de PRs irmãos (só checagem de contrato)
- ❌ Publicar qualquer coisa sem confirmação explícita

## 💡 Quando NÃO usar

- Branches locais sem PR → `/review-task` (por TASK_ID) ou `/review_vk_<repo>`
- Batch dos seus PRs pendentes → `/god-review`
- Self-review pré-PR dentro do SDD → `/sdd-review`
