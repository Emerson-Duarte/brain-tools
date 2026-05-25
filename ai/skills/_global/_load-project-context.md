---
title: "Skill: Load Project Context (shared)"
tags: [meta, context, brain, shared]
stack: [all]
category: meta
---

# Carregamento de Contexto de Projeto

**Este arquivo é um bloco compartilhado**, referenciado por outras skills do `_global/`. Não é um slash command. Centraliza o protocolo de carregar contexto do brain via **índice + lazy load** antes de executar qualquer skill agnóstica.

## 📍 Convenção de paths

Todas as referências entre skills usam path absoluto `~/.brain/...` (expandido pra `$HOME/.brain/...`). Isso garante que as skills funcionem **quando o cwd é um projeto-alvo** (vakinha-app, vakinha-api, etc.) — onde `ai/skills/_global/` relativo não existe.

O bootstrap do environment (`brain/scripts/environment-bootstrap.sh`) clona o brain em `$HOME/.brain` e symlinka os slash commands em `~/.claude/commands/`. As skills carregadas via `~/.claude/commands/sdd-workflow.md` continuam vendo o brain no path `~/.brain/`.

Ao desenvolver dentro do próprio repo brain, paths como `~/.brain/...` ainda funcionam se você symlinkou o `~/.brain` pro cwd do brain (ou use o arquivo diretamente via path relativo).

## 🎯 Princípio

Skills em `_global/` são **agnósticas** — não conhecem nenhum projeto específico. Todo conhecimento de projeto vem do brain via MCP, mas o retorno **não é objeto estruturado**: é **markdown bruto** (o `CLAUDE.md` do projeto + behaviors + PRDs relevantes).

A arquitetura adotada é **lazy load via índice**:

- `CLAUDE.md` do projeto é um **índice curto** (≤ 50 linhas): visão geral + tabela de pointers para arquivos de tópico
- Arquivos de tópico (`projects/<project>/<topic>.md`) carregam conhecimento detalhado por área (commands, architecture, observability, payments, jira-workflow, glossary, pr-conventions, etc.)
- Skills leem o índice, identificam quais tópicos importam pro passo atual, e fazem `Read` **só nesses arquivos**

A convenção completa está documentada em `projects/README.md`.

## 📥 Protocolo de carregamento

### 1. Identificar o projeto atual
- Se o usuário disse explicitamente, use isso
- Se há card Jira, infira do prefixo da key (ex.: `VKAP-` → vakinha-app) — mas confirme antes de assumir
- Se há cwd óbvio (ex.: `/Users/dev/www/vakinha/vakinha-app`), use
- Caso contrário, pergunte: "Qual projeto?"

### 2. Carregar o índice (uma vez por sessão)

```
mcp__brain__get_project_context  →  { project_name }
```

Retorna um **blob markdown** contendo (entre outras coisas) o `CLAUDE.md` do projeto. **Trate como índice**, não como dicionário estruturado.

### 3. Ler o índice — procurar a tabela "Knowledge Index"

Dentro do `CLAUDE.md` do projeto, procure uma seção com tabela de pointers. O formato canônico (definido em `projects/README.md`) é:

```markdown
## 📚 Knowledge Index

| Tópico | Path | Carregar quando |
|--------|------|-----------------|
| Commands & Gates | `projects/<project>/commands.md` | self-review, criar PR |
| Architecture | `projects/<project>/architecture.md` | grooming, planejamento, implementação |
| Observability | `projects/<project>/observability.md` | criar PR, pós-deploy |
| Jira workflow | `projects/<project>/jira-workflow.md` | mover cards, criar tasks |
| ...
```

**Variações que ainda contam como índice válido:**
- Lista markdown em vez de tabela
- Heading `### Knowledge Index` ou `### Índice de conhecimento` ou similar
- Pointers como link markdown `[Commands](./commands.md)`

**Se o `CLAUDE.md` do projeto NÃO tem índice** (é monolítico/legado), trate o `CLAUDE.md` inteiro como conteúdo do tópico solicitado e **registre como lacuna** (índice ausente → projeto não migrado ainda).

### 4. Lazy load — carregar tópicos relevantes ao passo

Para cada passo da skill, determine quais **tópicos** importam. Exemplos de mapeamento típico:

| Passo / operação | Tópicos relevantes |
|------------------|--------------------|
| Grooming técnico | Architecture, Glossary, Observability, Payments (se aplicável) |
| Redação do SDD | Architecture, Commands, Observability, Rollout, Payments/Notifications |
| Breakdown em tasks Jira | Jira workflow, Architecture (camadas), Commands (gates pro template) |
| Implementação | Architecture, Commands, Styleguide, Hooks, AI guidelines |
| Self-review | Commands (gates), Architecture (padrões obrigatórios), AI guidelines |
| Validação manual | Commands (como subir), Platforms, Architecture (fluxo) |
| Criar PR | Commands (gates), PR conventions, Observability, Platforms |
| Mover card Jira | Jira workflow |
| Pós-deploy | Observability, Environments, Rollout |

Para cada tópico relevante listado no índice:

```
Read(path do tópico no índice)
```

**Se um tópico esperado pro passo não está no índice** → lacuna (próxima seção).

### 4b. Lazy load — agents project-specific

Além dos arquivos `.md` de tópico, o índice pode declarar **agents project-specific** — prompts especializados pra delegação (ex.: planner-task, implementer-task, reviewer-task).

Formato canônico no índice:

```markdown
## 🤖 Project Agents

| Agent | Path | Use em |
|-------|------|--------|
| Planner | `ai/skills/<project>/agents/planner-task.agent.md` | /sdd-spec |
| Implementer | `ai/skills/<project>/agents/implementer-task.agent.md` | /sdd-implement |
| Reviewer | `ai/skills/<project>/agents/reviewer-task.agent.md` | /sdd-review (opcional) |
```

Variações ainda válidas:
- Seção misturada à Knowledge Index (linha cujo path termina em `*.agent.md`)
- Lista markdown em vez de tabela

**Para qualquer sub-command que delega a sub-agent:**

1. Procure no índice por pointer pro agent específico daquele passo
2. **Se existe** → `Read` o `.agent.md` e use como prompt do sub-agent (sobrescreve genérico)
3. **Se não existe** → lacuna obrigatória:
   - Registre no body do `_state.md` da task (se em fluxo SDD)
   - Pergunte ao usuário se quer criar antes de prosseguir
   - Bypass = `[g] prosseguir com genérico` registra a decisão e segue

**Skills extras do projeto** (não-agent, ex.: `new-feature.md`, `split-prs.md`) também podem ser listadas no índice. Pegue paths e mantenha em memória pra usar quando passo correspondente surgir.

### 4c. Multi-project — repetir pra CADA projeto envolvido

Quando rodando dentro de um `/sdd-*` cujo state tem `projects:` com mais de 1 entrada, **repita os passos 2, 4 e 4b pra cada projeto**:

```
Para cada proj em state.projects:
  mcp__brain__get_project_context(proj.name)
  Identificar tópicos relevantes pro passo atual
  Read dos tópicos no índice de proj
  Carregar agents project-specific de proj
```

Acumule contexto **rotulado por projeto** — não misture (ex.: `architecture.md` do vakinha-app ≠ `architecture.md` do vakinha-api). Sub-command opera com escopo claro:

```
Contexto carregado:
├── vakinha-app (primário, role: mobile)
│   ├── architecture: <...>
│   ├── commands: <...>
│   └── planner-agent: <...>
└── vakinha-api (role: backend)
    ├── architecture: <...>
    ├── commands: <...>
    └── planner-agent: <...>
```

Quando delegar a sub-agent num passo multi-project, **passe só o contexto do projeto que o sub-agent vai operar** (não confunda padrões de stacks diferentes no mesmo prompt).

Regras adicionais de iteração (paralelismo, ordem de merge, falha parcial): `ai/skills/_global/sdd-multi-project.md`.

### 5. Cache por sessão

Já carregou um arquivo de tópico nesta sessão? **Não recarregue**. Mantenha em memória de conversa pro resto dos passos. Refresh só se o usuário explicitar que o conteúdo mudou.

### 6. Carregar behavior + buscar precedentes (opcional por passo)

Além dos arquivos de tópico:

```
mcp__brain__get_behavior   →  { context: "<grooming|sdd|review|pr|tasks|...>" }
mcp__brain__search_projects →  { query: "<keywords da task>" }
mcp__brain__search_knowledge →  { query: "<keywords técnicas>" }
```

Use APENAS o que voltou — não invente regras que não estão no behavior nem no índice.

## 🚨 Detecção de lacunas

Marque como **lacuna** quando:

1. **Índice ausente** — `CLAUDE.md` do projeto não tem tabela/seção "Knowledge Index" (projeto não migrado ainda)
2. **Tópico esperado não listado** — passo precisa de tópico X, mas índice não tem pointer pra ele
3. **Arquivo de tópico vazio ou raso** — pointer existe, mas o `.md` apontado tem ≤ 5 linhas úteis
4. **Resposta estrutural perguntada ao usuário** — qualquer pergunta sobre stack/padrão/convenção que deveria estar num arquivo de tópico

Cada lacuna detectada **alimenta o feedback loop** (próxima seção).

## 🔄 Feedback loop — enriquecer o brain

Toda vez que você **precisar perguntar ao usuário algo estrutural do projeto** (não da task específica), **ofereça salvar a resposta no brain — no arquivo de tópico certo**, não inflando o `CLAUDE.md`.

### O que conta como "estrutural"?

**SIM, ofereça salvar:**
- Comandos de gate (lint, type-check, test, build, format)
- Test runner / framework usado
- Sistema de feature flags
- Provedores de observabilidade
- Convenções de nomenclatura (branch, commit, PR)
- Estrutura de pastas obrigatória
- Padrões arquiteturais (state management, navigation, styling)
- Sistemas de pagamento / notificação
- Reviewers preferidos / labels / templates de PR
- Domínio de negócio (glossário)
- Cross-project dependencies
- Mapeamento de aliases de transição Jira → transição real do workflow

**NÃO ofereça salvar:**
- Detalhes da task específica (esses vão pro SDD/card, não pro contexto)
- Decisões de uma feature isolada
- Preferências do momento (ex.: "hoje quero usar X mas é exceção")

### Em qual arquivo de tópico salvar?

Use o mapeamento abaixo (a convenção completa está em `projects/README.md`):

| Tipo de resposta estrutural | Arquivo de tópico sugerido |
|-----------------------------|----------------------------|
| Gates de qualidade, comandos, test runner | `commands.md` |
| Padrões arquiteturais, camadas, state, nav | `architecture.md` |
| Sentry/PostHog/Firebase/DataDog | `observability.md` |
| Stripe/PIX/MP/IAP | `payments.md` |
| Push/email/in-app providers | `notifications.md` |
| Aliases de transição, project key, labels | `jira-workflow.md` |
| Reviewers, template, labels, convenção | `pr-conventions.md` |
| Termos do domínio | `glossary.md` |
| Feature flags, deploy, rollback | `rollout.md` |
| Cross-project deps, repos relacionados | `CLAUDE.md` (no próprio índice, seção curta) |

### Formato da oferta (após cada resposta estrutural)

```
💡 Lacuna no contexto do projeto detectada

Pergunta: "<o que perguntei>"
Resposta: "<o que o usuário disse>"

Salvar como? 

  Arquivo:   projects/<project>/<topic>.md
  Ação:      criar arquivo novo | atualizar seção "<header>" | adicionar entrada
  Atualizar índice do CLAUDE.md: sim/não (se arquivo novo)

  Preview:
  ─────────────────────────
  <conteúdo formatado em Markdown, 3-5 linhas>
  ─────────────────────────

  [s] Salvar  [n] Skip  [e] Editar antes
```

### Como salvar — fluxo

1. **Se o arquivo de tópico já existe** → use `Edit` pra adicionar/atualizar a seção apropriada
2. **Se não existe** → use `Write` pra criar com o frontmatter padrão (ver `projects/README.md`)
3. **Se criou arquivo novo** → atualize a tabela "Knowledge Index" do `CLAUDE.md` adicionando o pointer
4. Se for conhecimento genérico aplicável a vários projetos → use `mcp__brain__add_note` no `knowledge/` apropriado em vez de arquivo de tópico do projeto
5. PRDs continuam indo por `mcp__brain__create_prd`

Use `search_knowledge` antes pra **evitar duplicatas** — se já existe nota similar, ofereça **atualizar** em vez de criar nova.

### Acúmulo opcional
Se a skill faz **várias perguntas estruturais** numa única sessão (ex.: grooming inicial num projeto novo, ou projeto sem índice), pode acumular e oferecer **uma confirmação batch** ao fim:

```
💡 Acumulei 4 lacunas durante a sessão. Salvar agora?

1. commands.md       → adicionar gates (yarn lint, yarn type-check)
2. observability.md  → criar arquivo (Sentry + PostHog + Firebase)
3. jira-workflow.md  → criar arquivo (project key VKAP, aliases de transição)
4. CLAUDE.md         → atualizar índice (3 pointers novos)

[s] Salvar todas  [i] Confirmar individualmente  [n] Skip  [e] Editar
```

## 🚫 Anti-padrões

**NÃO faça:**
- ❌ Assumir que `get_project_context` retorna campos estruturados (`project.gates`, `jira.project_key`, etc.) — ele retorna markdown
- ❌ Hardcodar regras de projeto específico em skill `_global/` (ex.: "se vakinha-app, use styleguide")
- ❌ Assumir gates (ex.: "yarn lint" sem verificar no `commands.md` do projeto)
- ❌ Inventar providers de observabilidade que não vieram do brain
- ❌ Pular o `get_project_context` "pra economizar tempo"
- ❌ Carregar TODOS os arquivos de tópico de uma vez — viola lazy load
- ❌ Salvar lacunas inchando o `CLAUDE.md` — use o arquivo de tópico apropriado
- ❌ Salvar no brain sem confirmar com o usuário

**FAÇA:**
- ✅ Trate `_global/` skills como funções puras: input via índice + arquivos de tópico, output explícito
- ✅ Quando faltar info, pergunte → confirme → ofereça salvar no arquivo certo
- ✅ Cite o que veio do brain explicitamente ("Conforme `projects/<project>/commands.md`, o gate é `X`")
- ✅ Se o projeto não tem índice ainda, declare isso ao usuário, trabalhe com o `CLAUDE.md` monolítico, e capture lacunas pra ajudar a migrar

## 🧩 Como referenciar este bloco em outras skills

No corpo da skill, basta:

```markdown
## Carregamento de contexto

Siga o protocolo em `~/.brain/ai/skills/_global/_load-project-context.md`:
1. `get_project_context` → trate o retorno como índice (markdown), não objeto
2. Identifique os tópicos relevantes pro passo atual
3. Carregue via `Read` apenas os arquivos de tópico apontados pelo índice
4. (opcional) `get_behavior` + `search_projects` + `search_knowledge`
5. Toda pergunta estrutural ao usuário → feedback loop (salvar no arquivo de tópico certo)
```

Não duplique as instruções completas — referencie e mantenha este arquivo como fonte única.
