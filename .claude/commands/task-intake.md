---
description: Playbook do MODO DIRETO — instiga o entendimento, reproduz o baseline, cria a task no Jira, executa e verifica por simulação de usuário (Maestro/Playwright/RSpec) antes do PR. NÃO é SDD.
argument-hint: "[descrição inicial da task / bug / ideia] — pode começar sem card no Jira"
---

# /task-intake — Modo Direto: intake → discovery → Jira → execução → verificação → PR

Orquestrador **linear e leve** do trabalho direto (o default do CLAUDE.md). Instiga clareza total
antes de codar, amarra **reprodução baseline** e **verificação por simulação de usuário** a toda
task, e nasce muitas vezes **sem card no Jira**.

> **Isto NÃO é SDD.** Nunca invoque/ofereça `/sdd-*`, `pr-create-sdd.md`, `/sdd-capture` ou
> `/brain-capture`. Use `commit-message.md` + `pr-create.md`; aprendizados via `add_note`.

## 🔒 Contratos rígidos (todas as fases)
- **git identity**: NUNCA commitar com `user.email == noreply@anthropic.com` ou `user.name == Claude`. Pare e instrua o usuário.
- **Brain on demand**: `get_project_context` antes do trabalho; `get_behavior` no contexto de cada fase. Não invente regras do projeto.
- **Confirmação antes de externo/destrutivo**: criar issue Jira, abrir PR — sempre pergunta antes.
- **Sub-agents recebem os contratos no prompt** — não assumem que "sabem".

## Descoberta de caminhos (não hardcode)
Workspace root = diretório que contém os repos `vakinha-*` + `brain/` + `brain-tools/`. Derive do
cwd (suba até achar). Fallback comum nesta máquina: `/Users/emersonduarte/www/vakinha` para os
projetos, e os repos de brain em `/Users/emersonduarte/www/{brain,brain-tools}`. O caminho muda entre
PCs — sempre derive.

---

## Fase 0 — Bootstrap
1. Identificar o(s) projeto(s) alvo pelo mapa do CLAUDE.md (marcar se é **cross-project**).
2. `get_project_context` para **cada** projeto envolvido.
3. `get_behavior(context="task intake")` — carrega os princípios do modo direto.

## Fase 1 — Intake
Capturar o problema bruto em 1–3 frases (motivação, dor, resultado esperado) — **sem** propor
solução. Classificar: tipo (bug/feature/refactor/chore), projeto(s), já existe card? (quase sempre
não).

## Fase 2 — Discovery + Reprodução baseline (o "me instiga")
- **Investigar antes de inventar**: sub-agent `Explore` no código + tópicos do `CLAUDE.md` do projeto.
- **Precedente**: `search_projects` + `search_knowledge` (inclui a *Matriz de Rodagem & Verificação*).
- **Segunda ordem + cross-project**: migrations, jobs/Sidekiq, webhooks, flags, cache, índices,
  telemetria; engine → `vakinha-api` E `admin-api`; endpoint novo → `src/actions/` dos frontends;
  `client-kit` → `vakinha-web` + `bio-next`.
- **Interrogatório** via `AskUserQuestion`, ≤8 perguntas/rodada por categoria (🎯 Negócio · 🏗️
  Arquitetura · ⚙️ Operacional · 💳 Pagamentos · 🔔 Notificações · 📊 Observabilidade). Só pergunte o
  que o brain não respondeu.
- **⚠️ Reprodução baseline obrigatória**: subir o projeto pela Matriz e **reproduzir o estado atual**
  como usuário — Maestro (app) / Playwright (web) / request+RSpec (API). Registrar o "antes". Bug sem
  repro = não avança. Harness inexistente → bootstrap vira pré-requisito (template-ouro:
  `vakinha-web/e2e/`).

## Fase 3 — Objetivo + AC + Plano de verificação  ⚠️ GATE
Escrever e o usuário **aprova antes de codar**:
- **Objetivo** (mensurável) · **Escopo / Fora de escopo**
- **Critérios de aceite** mensuráveis ("retorna 200 em <200ms", não "funcionar")
- **Plano de verificação**: ferramenta + cenário de usuário + comando/flow exato por AC — formato
  "antes X → depois Y, provado por `yarn e2e tests/…` / `maestro test .maestro/…` / `rspec …`"
- **Impactos cross-project** · **Riscos + rollback**

Não avance sem aprovação explícita deste bloco.

## Fase 4 — Card no Jira (fim do discovery)
`get_behavior(context="jira task creation")`. **Criar** (task nova) OU **enriquecer** (card já
existe — comum quando UX/PM abriu com só Figma + uma frase):
1. Confirmar projeto Jira de destino (default: VK25).
2. **Labels: usar só os existentes — nunca criar label** (se nenhum encaixa, perguntar).
3. Descrição a partir da Fase 3 (objetivo + AC + plano de verificação). Card existente →
   **acrescentar/atualizar sem apagar** o que a UX/PM escreveu.
4. **Assignee: sempre atribuir ao Emerson** — decisão fixa, **não perguntar**.
5. **Mover o card para "Development"** (transição "Start development"; resolver o id/nome exato em
   runtime via `getTransitionsForJiraIssue`, pois varia por status atual).
6. Multi-project → uma issue por projeto + `createIssueLink`.
7. `createJiraIssue` (nova) ou `editJiraIssue` + `transitionJiraIssue` (existente); retornar o link.
   Daqui pra frente o código nasce rastreável.

> ⚠️ Ações externas (editar/mover/atribuir card) — confirmar antes de executar.

## Fase 5 — Execução (em git worktree isolada)
- **Worktree** (skill `worktree`): do repo alvo, rodar
  `~/.claude/skills/worktree/scripts/worktree.sh add task/<KEY>/<slug> develop`. Nasce com
  `node_modules`/`.env`/segredos symlinkados — pronta pra rodar, sem reinstalar. Com **pnpm**, se o
  lockfile mudar na branch, `rm node_modules && pnpm install` na worktree (store global reaproveita).
- Subir o(s) projeto(s) pela Matriz de Rodagem **dentro da worktree** (atenção à colisão de porta com
  o checkout principal — usar porta alternativa).
- Implementar seguindo padrões do projeto. Se o índice declara agents `planner-task` /
  `implementer-task`, **use-os** (sem SDD); senão, direto.
- Rodar gates do projeto (lint / type-check / rspec / rake). Commit via `commit-message.md`.

## Fase 6 — Verificação por simulação de usuário  ⚠️ GATE
Rodar o cenário do plano da Fase 3 na ferramenta certa e **provar que os AC passam**, comparando com
o baseline da Fase 2: Maestro dirige o app / Playwright abre o navegador / RSpec/rake para lógica.
Falhou → volta pra Fase 5. Guardar a evidência (comando/flow que passou).

## Fase 7 — PR + mover card
`pr-create.md` (**fluxo direto — nunca `pr-create-sdd.md`**): checar hard gates (git identity,
upstream, working tree), vincular a key do Jira + a evidência de verificação no corpo, abrir só após
confirmação. **Depois do PR aberto (pós-revisões/análises), mover o card para "Code Review"**
(`transitionJiraIssue`; resolver o id em runtime — só aparece a partir de "Development").

## Fase 8 — Captura (opcional)
Oferecer `add_note` para aprendizados e lacunas de contexto do projeto (feedback loop). **Não**
oferecer `/brain-capture` nem `/sdd-capture`.

## Fase 9 — Pós-merge (quando o PR for mergeado)
- Card → "Done" se o board exigir (`transitionJiraIssue`).
- **Encerrar a worktree**: `~/.claude/skills/worktree/scripts/worktree.sh remove task/<KEY>/<slug>`
  (desfaz symlinks + `git worktree remove`). Se sobrar trabalho não commitado, o git recusa — só
  `--force` com confirmação explícita.

---

## 🚫 O que este comando NÃO faz
- ❌ Não entra no fluxo SDD nem sugere skills `/sdd-*`
- ❌ Não coda antes de reproduzir o baseline
- ❌ Não abre PR sem provar os AC na ferramenta de simulação
- ❌ Não cria card no Jira antes de objetivo+AC aprovados
- ❌ Não cria label novo no Jira nem atribui assignee sem perguntar
