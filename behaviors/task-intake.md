---
title: "Comportamento: intake, discovery e verificação (modo direto)"
tags: [task, intake, discovery, direct, reproduction, verification, maestro, playwright, grooming, workflow, engineering]
---

## Quando aplicar

Carregado por `/task-intake` e sempre que uma task Vakinha começa no **modo direto** (o default do
CLAUDE.md — fix/feature/refactor comum), **muitas vezes sem card no Jira ainda**. Também vale quando
o usuário diz "vamos começar uma task", "me ajuda a entender isso direito", "quero fazer X".

**Isto NÃO é SDD.** Não invoque nem ofereça `/sdd-*`, `pr-create-sdd.md`, `/sdd-capture` ou
`/brain-capture`. Use as skills comuns do brain (`commit-message.md`, `pr-create.md`) e, para
aprendizados, a ferramenta MCP `add_note`.

## Princípios

### 1. Instigar antes de aceitar a task

Não comece a codar com um pedido vago. Puxe o **objetivo** e o **porquê** até ambos terem clareza
total. A meta do discovery é mapear o "o quê + porquê", **não** decidir a solução detalhada (isso é
execução).

### 2. Investigar antes de inventar

Não assuma stack, padrões ou integrações. Delegue research no código a sub-agent `Explore`, leia os
tópicos do `CLAUDE.md` do projeto e rode `get_project_context` para cada projeto envolvido. Faltou →
**pergunte**, depois ofereça salvar a resposta (feedback loop via `add_note`).

### 3. Procurar precedente

Antes de propor abordagem: `search_projects` + `search_knowledge`. Reusar padrão validado > inventar
do zero. A **Matriz de Rodagem & Verificação** (knowledge, `search_knowledge` por "matriz de
rodagem") diz como subir e verificar cada projeto.

### 4. Pensar segunda ordem + contratos cross-project

Quais sistemas/usuários são afetados **indiretamente**? Migrations, jobs/Sidekiq, webhooks, feature
flags, cache, índices, telemetria. E os acoplamentos do mapa Vakinha: bug no `vakinha_api_engine`
impacta `vakinha-api` **E** `vakinha-admin-api`; endpoint novo → atualizar `src/actions/` dos
frontends afetados; `vakinha-client-kit` → `vakinha-web` + `vakinha-bio-next`.

### 5. Reprodução baseline é obrigatória

Antes de tocar no código, **reproduza o estado atual** dirigindo o produto como um usuário na
ferramenta certa e registre o "antes" concreto:
- **app** (`vakinha-app`) → **Maestro**
- **web** (`vakinha-web`, `admin-web`, `manager-web`) → **Playwright**
- **API** (`vakinha-api`, `admin-api`) → request + **RSpec**; **engine** → **Minitest** (`rake test`)

Bug sem repro = não avança. Se o harness necessário não existe (ex: Maestro no app, Playwright no
admin/manager), o **bootstrap do harness vira pré-requisito** — trate como task própria, usando o
`vakinha-web/e2e/` como template-ouro.

### 6. Objetivo + AC + plano de verificação são um gate

Antes de codar, escreva e o usuário **aprova**: Objetivo mensurável · Escopo / Fora de escopo ·
Critérios de aceite mensuráveis ("retorna 200 em <200ms", não "funcionar") · **Plano de verificação**
(qual ferramenta + qual cenário de usuário + comando/flow exato que prova cada AC, no formato "antes
X → depois Y, provado por `<comando>`") · Impactos cross-project · Riscos + rollback.

### 7. Verificar por simulação de usuário antes do PR

Só vira PR depois de **provar os AC** dirigindo o produto na ferramenta certa e comparando contra o
baseline. Falhou → volta pra execução. A evidência (comando/flow que passou) entra no corpo do PR.

## Categorias de perguntas (use no máximo 8 por rodada, via `AskUserQuestion`)

- 🎯 **Negócio/Produto**: usuário-alvo, métrica de sucesso, compliance
- 🏗️ **Arquitetura**: camada/módulo, contratos, migrations
- ⚙️ **Operacional**: feature flag, rollback, janela de deploy, stakeholders
- 💳 **Pagamentos** (se aplicável): idempotência, PII/PCI
- 🔔 **Notificações** (se aplicável): provider, retry
- 📊 **Observabilidade**: eventos, erros taggeados, dashboards

Só pergunte o que o brain **não** respondeu.

## Contratos rígidos

- **git identity**: NUNCA commitar com `user.email == noreply@anthropic.com` ou `user.name == Claude`.
  Pare e instrua o usuário.
- **Jira**: criado/enriquecido no **fim do discovery** (antes de codar). Labels só **existentes**
  (nunca criar). **Sempre atribuir ao Emerson** e **mover o card para "Development"** ao assumir;
  **mover para "Code Review"** ao abrir o PR. Card já existente (UX/PM abriu com só Figma) →
  enriquecer **sem apagar** o texto original. Ver `get_behavior(context="jira task creation")`.
- **Worktree**: executar em **git worktree isolada** (skill `worktree`), criada a partir de
  `develop`, e **encerrá-la quando o PR mergear** (`worktree.sh remove`). pnpm torna o
  `node_modules` compartilhado barato de recriar se o lockfile mudar.
- **PR/commit**: sempre via `pr-create.md` + `commit-message.md`. Nunca template genérico, nunca
  `pr-create-sdd.md`.
- **Sub-agents**: recebem os contratos no prompt — não assumem que "sabem".

## Anti-padrões

- ❌ Codar antes de reproduzir o baseline
- ❌ Abrir PR sem provar os AC na ferramenta de simulação
- ❌ Criar card no Jira antes de objetivo+AC aprovados
- ❌ Propor solução detalhada no discovery (discovery é mapeamento, não decisão)
- ❌ Invocar/oferecer qualquer `/sdd-*`, `pr-create-sdd.md` ou `/brain-capture`
