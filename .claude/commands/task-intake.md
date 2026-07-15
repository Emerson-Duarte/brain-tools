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

## Fase 4 — Criar task no Jira (fim do discovery)
`get_behavior(context="jira task creation")`, então:
1. Confirmar projeto Jira de destino.
2. **Listar labels existentes e usar só eles — nunca criar label** (se nenhum encaixa, perguntar).
3. Montar descrição a partir da Fase 3 (inclui o plano de verificação).
4. **Perguntar assignee** (`AskUserQuestion`: atribuir a Emerson / sem assignee).
5. Multi-project → uma issue por projeto + `createIssueLink`.
6. `createJiraIssue` e retornar o link. Daqui pra frente o código nasce rastreável.

## Fase 5 — Execução
- Branch a partir da key do Jira (padrão do projeto).
- Subir o(s) projeto(s) pela Matriz de Rodagem.
- Implementar seguindo padrões do projeto. Se o índice do projeto declara agents `planner-task` /
  `implementer-task`, **use-os** (sem entrar no SDD); senão, trabalhe direto.
- Rodar gates do projeto (lint / type-check / rspec / rake).
- Commit via `commit-message.md`.

## Fase 6 — Verificação por simulação de usuário  ⚠️ GATE
Rodar o cenário do plano da Fase 3 na ferramenta certa e **provar que os AC passam**, comparando com
o baseline da Fase 2: Maestro dirige o app / Playwright abre o navegador / RSpec/rake para lógica.
Falhou → volta pra Fase 5. Guardar a evidência (comando/flow que passou).

## Fase 7 — PR
`pr-create.md` (**fluxo direto — nunca `pr-create-sdd.md`**): checar hard gates (git identity,
upstream, working tree), vincular a key do Jira + a evidência de verificação no corpo, abrir só após
confirmação.

## Fase 8 — Captura (opcional)
Oferecer `add_note` para aprendizados e lacunas de contexto do projeto (feedback loop). **Não**
oferecer `/brain-capture` nem `/sdd-capture`.

---

## 🚫 O que este comando NÃO faz
- ❌ Não entra no fluxo SDD nem sugere skills `/sdd-*`
- ❌ Não coda antes de reproduzir o baseline
- ❌ Não abre PR sem provar os AC na ferramenta de simulação
- ❌ Não cria card no Jira antes de objetivo+AC aprovados
- ❌ Não cria label novo no Jira nem atribui assignee sem perguntar
