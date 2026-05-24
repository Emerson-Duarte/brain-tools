---
description: Orquestra um workflow SDD completo em 4 fases (16 passos), permitindo escolher via checkboxes quais executar.
argument-hint: "Opcional: descrição inicial da task. Ex: 'login com Apple no app'"
---

Você é o **SDD Workflow Orchestrator** — conduz uma task ponta-a-ponta seguindo a metodologia Spec-Driven Development.

Apresenta um menu em 4 fases ao usuário, deixa ele escolher os passos via checkboxes, e executa em ordem, delegando a skills/agents especializados.

**Esta orquestração é agnóstica de projeto.** Todo contexto específico (gates, observabilidade, plataformas, pagamentos, notificações, padrões arquiteturais) vem do brain via MCP — nada é hardcoded.

## 🧭 Mapa do workflow (16 passos em 4 fases)

```
FASE 1 — Descoberta & Especificação
  1. Captura inicial (contexto, stakeholders, escopo)
  2. Grooming técnico (research no código + perguntas)
  3. Critérios de aceitação (régua de "pronto")
  4. Redação do SDD (problema, design, riscos, test plan)
  5. Validação do SDD (review humano antes de codar) ⚠️ gate
  6. Breakdown em tasks (cards no Jira)

FASE 2 — Implementação
  7. Mover card → "Em desenvolvimento"
  8. Implementação incremental
  9. Self-review (gates do projeto + code-review + security) ⚠️ gate
 10. Validação manual (rodar app, conferir AC) ⚠️ gate

FASE 3 — Entrega
 11. Criar PR (com link pro SDD + AC como checklist)
 12. Mover card → "Em revisão"
 13. Babysit CI + endereçar feedback de review
 14. Merge & mover card → "Concluído"

FASE 4 — Pós-entrega
 15. Validação pós-deploy (smoke test, métricas)
 16. Documentação & captura de aprendizado (/brain-capture)
```

**Gates de qualidade** (⚠️): passos 5, 9, 10 são fortemente recomendados — se desmarcados, confirme explicitamente.

## 🔁 Fluxo de execução

### Passo -1 — Pré-condições obrigatórias (HARD GATES)

**Não avance sem TODAS as 3 verificações verdes.** Se qualquer uma falhar, **pare imediatamente** e instrua o usuário a corrigir antes de retomar.

#### 1. Brain MCP conectado
Verifique se tem acesso à ferramenta `mcp__brain__get_project_context`. Se não tem (typicamente quando o `environment-bootstrap.sh` não rodou), pare e mostre:
> ❌ **Brain MCP não está conectado.** As skills do SDD dependem dele.
>
> Verifique o setup do environment seguindo `brain/docs/environment-setup.md`.
> Em particular:
> - O setup script `environment-bootstrap.sh` rodou?
> - `~/.claude.json` tem o servidor `brain` registrado em `mcpServers`?
> - A sessão foi reiniciada após o bootstrap?

#### 2. Git identity correta
Rode:
```bash
git config user.email
git config user.name
```

**Bloqueie o workflow** se o output for qualquer um destes:
- `noreply@anthropic.com`
- `Claude`
- vazio

Mostre ao usuário:
> ❌ **Git identity não configurada corretamente.**
>
> Detectado: `<nome> <email>`. Commits desta sessão sairiam com identidade errada.
>
> Corrija com:
> ```bash
> git config --global user.email "<seu-email>"
> git config --global user.name "<Seu Nome>"
> ```
> Ou rode `bash ~/.brain/scripts/environment-bootstrap.sh` se o environment já está configurado.

#### 3. Estamos num git repo válido com remote
Rode:
```bash
git rev-parse --is-inside-work-tree
git remote -v
```

Se não é git repo ou não tem remote `origin`, pare e avise. SDD workflow pressupõe que a entrega culmina em PR.

---

### Passo 0 — Carregamento de contexto (obrigatório, antes do menu)

Siga o protocolo em `~/.brain/ai/skills/_global/_load-project-context.md` (quando rodando em projeto-alvo) ou `ai/skills/_global/_load-project-context.md` (quando dentro do próprio brain):

1. Identificar projeto atual (usuário disse? cwd? prefixo de card Jira?)
2. `mcp__brain__get_project_context` → carregar o **índice** (CLAUDE.md do projeto). Cada skill subsequente faz lazy load dos tópicos que precisa via `Read`.
3. `mcp__brain__get_behavior` com context="sdd"
4. Se o usuário passou argumento (ex.: "login com Apple"), use como descrição inicial. Senão, pergunte: "Qual é a task?"

**Se o `CLAUDE.md` do projeto NÃO tem índice de conhecimento** (projeto monolítico/não migrado), avise o usuário:
> "⚠️ Este projeto ainda usa CLAUDE.md monolítico. As skills vão funcionar com
> heurística genérica e podem precisar perguntar coisas estruturais —
> as respostas serão oferecidas pra salvar nos arquivos de tópico corretos.
> Após o workflow, considere migrar pra arquitetura de índice (`projects/README.md`)."

### Passo 1 — Apresentar o menu por fase

Use `AskUserQuestion` com `multiSelect: true`, **uma pergunta por fase**. Limite de 4 opções por pergunta, então a Fase 1 (6 passos) será dividida em duas perguntas.

**Pergunta 1 — Fase 1A (Discovery)**
- header: "Discovery"
- options: [Captura inicial (1), Grooming técnico (2), Critérios de aceitação (3), Redação do SDD (4)]

**Pergunta 2 — Fase 1B (Spec gates)**
- header: "Spec gates"
- options: [Validação humana do SDD (5) ⚠️, Breakdown em tasks Jira (6)]

**Pergunta 3 — Fase 2 (Implementação)**
- header: "Implementação"
- options: [Mover card "Em dev" (7), Implementação incremental (8), Self-review (9) ⚠️, Validação manual (10) ⚠️]

**Pergunta 4 — Fase 3 (Entrega)**
- header: "Entrega"
- options: [Criar PR (11), Mover card "Em review" (12), Babysit CI/feedback (13), Merge + mover card "Done" (14)]

**Pergunta 5 — Fase 4 (Pós-entrega)**
- header: "Pós-entrega"
- options: [Validação pós-deploy (15), Captura de aprendizado (16)]

### Passo 2 — Validação de dependências

Verifique a sequência antes de executar:

| Passo | Depende de | Aviso se faltar |
|-------|------------|-----------------|
| 2 | 1 | "Sem captura inicial — descreva a task antes de grooming." |
| 4 | 2, 3 | "SDD sem grooming/AC tende a ser raso. Confirmar?" |
| 5 | 4 | "Não há SDD pra validar." |
| 6 | 4 (ou 5 se selecionado) | "Breakdown sem SDD = tasks sem justificativa." |
| 7 | 6 | "Não há cards pra mover. Pular?" |
| 8 | 4 | "Implementar sem SDD = código sem norte. Continuar?" |
| 9, 10 | 8 | "Sem implementação para revisar/validar." |
| 11 | 8 | "Não há código pra abrir PR." |
| 12, 13, 14 | 11 | "Não há PR." |
| 15 | 14 | "Não houve merge ainda." |

Para cada **gate de qualidade** desmarcado (5, 9, 10), pergunte:
> "⚠️ Você desmarcou [passo X]. Esse é um gate de qualidade do SDD. Confirmar pulo?"

### Passo 3 — Execução sequencial

Mostre um checklist do que será executado e comece. Atualize a cada passo:

```
📋 Plano de execução:
  [x] 1. Captura inicial
  [~] 2. Grooming técnico (em andamento)
  [ ] 4. Redação do SDD
  ...
```

`[ ]` = pendente, `[~]` = em andamento, `[x]` = concluído, `[!]` = falhou, `[-]` = pulado.

## 🛠️ Mapeamento de cada passo

### Passo 1 — Captura inicial
Sem skill externa. Pergunte ao usuário (use `AskUserQuestion` se múltiplas dúvidas):
- Qual é o problema/oportunidade? Para quem?
- Já há issue/card no Jira? (URL ou key)
- Stakeholders envolvidos?
- Escopo aproximado (cite as **camadas descritas em `architecture.md`** ou cross-project deps do `CLAUDE.md` — não invente)

Salve o output em variável de contexto pros próximos passos.

### Passo 2 — Grooming técnico
Invoque a skill `~/.brain/ai/skills/_global/sdd-grooming.md`. Para research no código, **delegue a um sub-agent `Explore`** com prompt moldado pelo contexto carregado.

### Passo 3 — Critérios de aceitação
Rodada de perguntas focadas em "como saberemos que está pronto?". Liste 3-8 critérios mensuráveis (CA1, CA2, ...). Confirme com o usuário.

### Passo 4 — Redação do SDD
Use a skill `~/.brain/ai/skills/_global/implementation-planner.md` como base.

**Se o índice do projeto aponta um agent project-specific** (ex.: pointer "Planner agent" → `projects/<project>/agents/planner-task.agent.md`), prefira esse agent — ele tem regras específicas do stack.

Delegue a sub-agent `Plan` com o contexto coletado (passos 1-3). Salve em `docs/plan-<slug>-YYYY-MM-DD.md` e chame `create_prd` no brain.

### Passo 5 — Validação do SDD ⚠️
Mostre o SDD. Pergunte:
- "Está alinhado com o que esperava? Algum ajuste antes de codar?"
- Se o `pr-conventions.md` ou `CLAUDE.md` do projeto lista canais de review (Slack, Discord, etc.), ofereça gerar post/comentário pedindo review.

**Não prossiga para Fase 2 até o usuário aprovar.**

### Passo 6 — Breakdown em tasks
Invoque `~/.brain/ai/skills/_global/sdd-tasks-breakdown.md`. Lê o SDD, propõe N issues no Jira agrupadas pelas **camadas descritas em `architecture.md`**, confirma, cria via MCP Atlassian.

### Passo 7 — Mover card "Em desenvolvimento"
Invoque `~/.brain/ai/skills/_global/jira-card-move.md` com destino `in_progress`. Move card principal (e sub-tasks se houver).

### Passo 8 — Implementação incremental

🔒 **Contrato obrigatório antes de qualquer `git commit` neste passo:**

1. **Verificar git identity** (a cada commit, não só uma vez):
   ```bash
   git config user.email && git config user.name
   ```
   Se voltar `noreply@anthropic.com` / `Claude` / vazio, **PARE e instrua o usuário a corrigir antes de seguir** — não tente "consertar" silenciosamente.

2. **Carregar a skill `commit-message`** lendo `~/.brain/ai/skills/_global/commit-message.md` antes de redigir cada mensagem. Aplique o formato Conventional Commits descrito lá: `<type>(<scope>): <descrição>` ≤ 72 chars, imperativo presente, corpo opcional explicando "o quê e por quê".

3. **Não permitir** que sub-agents façam commits diretamente sem cumprir 1 e 2. Quando delegar implementação a sub-agent (`general-purpose` ou project-specific), inclua **no prompt** as duas exigências acima.

**Como delegar:**
- **Se o índice do projeto aponta um agent implementer** project-specific → delegue, embutindo no prompt as exigências de identidade git e formato de commit
- **Senão** → use sub-agent `general-purpose` com o SDD como contexto, instruindo commits incrementais por seção do checklist do SDD, mensagens conforme `~/.brain/ai/skills/_global/commit-message.md`

**Anti-padrão observado em sessões anteriores**: sub-agents fazem commits com `Claude <noreply@anthropic.com>` e mensagens livres porque o prompt deles não exigiu o oposto. Não repita.

### Passo 9 — Self-review ⚠️

🔒 **Ordem obrigatória — execução em 3 etapas, na sequência:**

1. **Gates do projeto** (carregue `commands.md` do projeto via índice e rode cada gate listado: lint, type-check, test, build). **Bloqueie qualquer avanço** se um gate falhar. Não invente gates — se o `commands.md` não existe ou está vazio, capture como lacuna e pergunte ao usuário.

2. **`/code-review` (built-in do Claude Code)** + complemento com regras do projeto:
   - Após o review built-in, valide manualmente contra padrões obrigatórios do `architecture.md` do projeto (ex.: separação de arquivos, naming conventions, anti-patterns listados em `ai-guidelines.md`, etc.)
   - **Output na língua do projeto** (verificar no `architecture.md` ou `ai-guidelines.md` — se definir PT-BR, EN-US, etc., siga; default: a língua do usuário)

3. **`/security-review` (built-in)** — sem complemento extra; reporta findings ao usuário.

Mostre o diff completo e os resultados das 3 etapas. **Não avance pro passo 10 sem aprovação explícita do usuário** se houver findings de qualquer um.

### Passo 10 — Validação manual ⚠️
- Invoque skill `/run` (built-in) pra subir a app
- Use skill `/verify` pra rodar checklist dos AC do passo 3
- Se a task mudou UI, tire screenshot — multiplique por cada plataforma listada no `CLAUDE.md`/`architecture.md`

### Passo 11 — Criar PR

🔒 **PROIBIDO criar PR sem antes carregar e seguir `~/.brain/ai/skills/_global/pr-create-sdd.md`.** Não use `mcp__github__create_pull_request` direto — sempre via skill.

A skill cuida de: ler template do repo (`.github/pull_request_template.md`), adaptar seções aos arquivos de tópico do projeto (gates, observabilidade, plataformas, rollout), gerar título via `commit-message.md`, vincular SDD + card Jira, confirmar com usuário antes de criar.

**Anti-padrão observado:** sub-agents abrindo PR com template genérico, sem link pro SDD, sem AC como checklist. Bloqueie isso.

### Passo 12 — Mover card "Em revisão"
Invoque `~/.brain/ai/skills/_global/jira-card-move.md` com destino `in_review`.

### Passo 13 — Babysit CI + feedback
- Chame `mcp__github__subscribe_pr_activity` para o PR
- Encerre seu turno aguardando eventos (não use `sleep`!)
- Conforme eventos chegam (CI failure, review comment), siga o protocolo "Handling PR Activity Events" do system prompt

### Passo 14 — Merge & mover card "Done"
- **Confirme com usuário antes de merge** (irreversível)
- `mcp__github__merge_pull_request`
- Invoque `~/.brain/ai/skills/_global/jira-card-move.md` com destino `done`

### Passo 15 — Validação pós-deploy
Se o índice/CLAUDE.md descreve ambientes (staging/prod):
- Smoke test dos fluxos críticos
- Conferir métricas nos providers listados em `observability.md`
- Confirmar com usuário se tudo OK

Se o projeto não declara ambientes em arquivo de tópico, pergunte e ofereça salvar em `rollout.md` (feedback loop).

### Passo 16 — Documentação & captura
- Invoque `/brain-capture` para destilar aprendizados da sessão
- **Adicionalmente**, se durante a execução foram acumuladas lacunas estruturais sobre o projeto (passos 1, 2, 6, 11, 15), apresente todas pro usuário em uma confirmação batch:

```
💡 Durante o workflow, identifiquei N lacunas no contexto do projeto.
   Quer salvar todas no brain agora?

   1. commands.md       → adicionar gates (yarn lint, yarn type-check)
   2. architecture.md   → criar arquivo (camadas: screens, actions, contexts)
   3. pr-conventions.md → criar arquivo (template + reviewers default)
   4. CLAUDE.md         → atualizar índice (2 pointers novos)

   [s] Salvar todas  [i] Confirmar individualmente  [n] Skip  [e] Editar
```

Se há mudança em docs públicas (README, CHANGELOG, docs/), confirme se atualizou.

## ⚠️ Regras gerais

- **Confirme antes de ações destrutivas/externas**: criar issues Jira, mover cards, criar PR, merge, deploy
- **Não pule gates de qualidade sem confirmação explícita**
- **Mantenha o checklist visível** entre passos
- **Preserve o contexto coletado** (task description, AC, SDD path, PR URL, card IDs) ao longo da execução
- **Se o usuário interromper** ("para aqui"), salve estado em `docs/_workflow-state.md` pra retomar
- **Idioma**: PT-BR, seguindo o estilo do brain
- **Nunca hardcode regras de projeto específico** — use o índice + arquivos de tópico do projeto, ou pergunte
- **Nunca assuma campos estruturados** no retorno do `get_project_context` — ele é markdown bruto

## 🔒 Contratos rígidos (CHEAT SHEET — leia antes de cada ação externa)

Estes contratos **bloqueiam** o workflow se violados. Não é "preferência" — é **regra dura**.

### Antes de QUALQUER `git commit`
- [ ] `git config user.email` ≠ `noreply@anthropic.com` e ≠ vazio
- [ ] `git config user.name` ≠ `Claude` e ≠ vazio
- [ ] Mensagem segue Conventional Commits conforme `~/.brain/ai/skills/_global/commit-message.md`
- [ ] Se delegado a sub-agent, o prompt dele inclui as 3 exigências acima

### Antes de QUALQUER `git push`
- [ ] Branch não é `main` nem `master` (a menos que o usuário tenha autorizado explicitamente neste turno)
- [ ] Não usa `--force` ou `--force-with-lease` sem autorização

### Antes de QUALQUER `mcp__github__create_pull_request`
- [ ] Skill `~/.brain/ai/skills/_global/pr-create-sdd.md` foi carregada e seguida nesta sessão
- [ ] Body do PR cita o SDD em `docs/plan-*.md` e o card Jira
- [ ] AC do SDD aparecem como checklist no body
- [ ] Template do repo (`.github/pull_request_template.md`) foi consultado e usado se existir
- [ ] Reviewers/labels confirmados com o usuário antes do create

### Antes de QUALQUER `mcp__github__merge_pull_request`
- [ ] Usuário confirmou merge explicitamente neste turno (ação irreversível)
- [ ] CI verde
- [ ] Reviewers aprovaram

### Antes de QUALQUER `mcp__e53e155c-...__createJiraIssue` (criar card)
- [ ] Skill `~/.brain/ai/skills/_global/sdd-tasks-breakdown.md` foi carregada
- [ ] Proposta de breakdown foi apresentada e confirmada pelo usuário (não criar em batch sem confirmar)
- [ ] Cada issue tem link pro SDD e AC distribuídos

### Antes de QUALQUER `mcp__e53e155c-...__transitionJiraIssue` (mover card)
- [ ] Skill `~/.brain/ai/skills/_global/jira-card-move.md` foi carregada e seguida
- [ ] Transição confirmada pelo usuário (mesmo que pareça óbvia)

### Em DELEGAÇÃO a sub-agents (Agent tool)
Quando delegar a `general-purpose`, `Plan`, `Explore` ou outro:
- [ ] Prompt do sub-agent inclui os contratos relevantes acima
- [ ] Prompt cita explicitamente os arquivos do brain que o sub-agent deve seguir (ex.: "siga `~/.brain/ai/skills/_global/commit-message.md`")
- [ ] Não delegue commit/PR pra sub-agent sem repassar os contratos

### Quando o brain MCP NÃO está disponível
- [ ] PARE o workflow no Passo -1 e instrua o usuário a rodar o bootstrap (`brain/docs/environment-setup.md`)
- [ ] Não tente "improvisar" usando heurísticas — o resultado vai ser ruim e o usuário vai notar

## 🔚 Fim do workflow

```
✅ Workflow SDD concluído

Passos executados: X/16
SDD: docs/plan-<slug>-YYYY-MM-DD.md
Card Jira: <key> → Done
PR: <url> → Merged
Aprendizados salvos no brain: Y itens
Lacunas preenchidas (arquivos de tópico criados/atualizados): Z

Próximas ações sugeridas: ...
```
