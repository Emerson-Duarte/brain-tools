---
description: Orquestrador SDD — encadeia /sdd-discover → /sdd-capture. Para rodar parte isolada, use o sub-command diretamente.
argument-hint: "[--slug=<slug>] [descrição inicial]"
---

# /sdd-workflow — Orquestrador SDD

**Este comando é só um menu + encadeamento.** Toda a lógica vive nos 12 sub-commands (`/sdd-discover`, `/sdd-spec`, ..., `/sdd-capture`). Para rodar uma fase isolada, **invoque o sub-command diretamente** — não precisa passar pelo orquestrador.

> **Multi-project nativo:** task pode envolver N projetos. State único (`projects[]`) é descoberto em `/sdd-discover`, e cada sub-command itera. Veja `ai/skills/_global/sdd-multi-project.md` pra regras de iteração, paralelismo, ordem de merge e cross-linking de PRs.

## 🧭 Mapa do workflow

```
FASE 1 — Discovery & Spec
  1. /sdd-discover         → captura + grooming + AC
  2. /sdd-spec             → redação do SDD (delega ao planner agent)
  3. /sdd-spec-validate ⚠️ → gate humano (bloqueante)
  4. /sdd-tasks            → breakdown em issues Jira

FASE 2 — Implementação
  5. /sdd-implement        → mover card "Em dev" + delega ao implementer agent
  6. /sdd-review ⚠️        → code-review + security-review + gates do projeto
  7. /sdd-verify ⚠️        → rodar app + checar AC

FASE 3 — Entrega
  8. /sdd-pr               → criar PR + mover card "Em revisão"
  9. /sdd-watch            → babysit CI + responder review
 10. /sdd-merge            → merge + mover card "Done"

FASE 4 — Pós-entrega
 11. /sdd-postdeploy       → smoke test + métricas
 12. /sdd-capture          → destilar aprendizados → brain
```

**⚠️ Gates bloqueantes:** sub-commands seguintes recusam rodar se gate anterior não estiver `passed` (ou `skipped` com aprovador registrado). Bypass = `--skip-gate=<name>` no sub-command que abre o gate.

## 🔒 Contratos rígidos (válidos em todos os passos)

- **git identity**: NUNCA commitar com `user.email == noreply@anthropic.com` ou `user.name == Claude`. Pare e instrua usuário.
- **Brain on demand**: sempre `get_project_context` antes do trabalho. Não invente regras do projeto.
- **Agents project-specific**: se índice do projeto declara `planner-task.agent.md` ou `implementer-task.agent.md`, USE — não use template genérico como atalho. Se não declara → **lacuna** registrada + ofereça criar.
- **Skills do projeto**: tópicos referenciados pelo índice são **fonte da verdade**. Sub-command recusa rodar se tópico esperado faltar e usuário não preencher via feedback loop.
- **Sub-agents**: receba contratos no prompt — não assuma que sub-agent "sabe".
- **Confirmação antes de destrutivo/externo**: criar issues Jira, mover cards, abrir PR, merge, deploy.

## ⚙️ Modos de uso

### Modo A — fluxo completo via menu (este comando)

1. Identifica projeto e carrega contexto (siga `ai/skills/_global/_load-project-context.md`).
2. Apresenta **menu por fase** via `AskUserQuestion` (`multiSelect: true`, 4 opções por pergunta).
3. Para cada sub-command selecionado, **encadeia em ordem**:
   - Resolve dependências (ex.: sem `/sdd-spec`, recusa `/sdd-spec-validate`)
   - Para cada gate ⚠️ desmarcado, pergunta confirmação explícita
   - Executa um por vez. Entre cada, mostra checklist atualizado.
4. Persiste estado em `<project>/docs/sdd-<slug>/_state.md` (siga `ai/skills/_global/sdd-state.md`).

#### Apresentação do menu

Use `AskUserQuestion` com 4 perguntas (uma por fase), `multiSelect: true`:

**P1 — Fase 1 (Spec):** discover / spec / spec-validate ⚠️ / tasks
**P2 — Fase 2 (Implementação):** implement / review ⚠️ / verify ⚠️
**P3 — Fase 3 (Entrega):** pr / watch / merge
**P4 — Fase 4 (Pós-entrega):** postdeploy / capture

Após receber respostas, mostre **checklist consolidado** + valide dependências (ver tabela abaixo).

### Modo B — fase isolada (usar sub-command direto)

Não precisa deste arquivo. Direto:

```
/sdd-discover --slug=login-apple "Login com Apple ID no app"
/sdd-spec --slug=login-apple
/sdd-implement --slug=login-apple --task=VKAP-1234
...
```

Cada sub-command verifica state e gates → falha rígido se pré-req faltando.

### Modo C — retomar task pausada

```
# Sem --slug, busca docs/sdd-*/_state.md mais recente
/sdd-implement
```

Se múltiplas tasks ativas → ABORTA pedindo `--slug=<X>` explícito.

## 📐 Tabela de dependências (validação antes de executar)

| Sub-command | Depende de | Aviso se faltar |
|-------------|-----------|-----------------|
| sdd-spec | discover | "Sem grooming/AC. Rode /sdd-discover." |
| sdd-spec-validate | spec | "Sem SDD pra validar." |
| sdd-tasks | spec-validate (passed/skipped) | "SDD não aprovado ainda." |
| sdd-implement | spec-validate (passed/skipped) | "Implementar sem SDD aprovado = código sem norte." |
| sdd-review | implement (com commits) | "Nada pra revisar." |
| sdd-verify | review (passed/skipped) | "Verifique após self-review." |
| sdd-pr | review (passed) + verify (passed/skipped) | "Sem gates verdes, sem PR." |
| sdd-watch | pr | "Sem PR pra babysit." |
| sdd-merge | watch (CI green, approvals OK) | "PR não aprovado." |
| sdd-postdeploy | merge | "Sem merge, sem deploy." |
| sdd-capture | merge | "Captura precisa de task fechada." |

Para cada **gate de qualidade desmarcado** (spec-validate, review, verify), pergunte:

```
⚠️ Você desmarcou /sdd-<X>. Este é gate bloqueante. Confirmar pulo?

Próximos passos vão exigir --skip-gate=<X> com nome de aprovador.

  [s] Pular  [n] Manter selecionado
```

## 🚦 Saída do orquestrador

```
✅ Workflow SDD orquestrado

Slug: <slug>
Sub-commands executados: X/12
  ✅ discover  — <timestamp>
  ✅ spec      — <timestamp>
  ⚠️ spec-validate (skipped — aprovador: <nome>)
  ...

Estado final: <in_progress | done | aborted>
State path: <project>/docs/sdd-<slug>/_state.md

Próximo sugerido: /sdd-<next>  (ou — se done)
```

## 🚫 O que este orquestrador NÃO faz

- ❌ Não implementa lógica de nenhum passo — só encadeia
- ❌ Não substitui sub-commands isolados — eles são autossuficientes
- ❌ Não inventa regras de projeto — tudo vem do brain via `_load-project-context.md`
- ❌ Não pula gates ⚠️ sem confirmação explícita
