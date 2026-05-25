---
description: Fase 4 passo 15 — smoke test pós-deploy + checagem de métricas.
argument-hint: "[--slug=<slug>] [--env=staging|prod]"
---

# /sdd-postdeploy — Validação pós-deploy

Responsabilidade única: **confirmar que a mudança está saudável em produção (ou staging)** via smoke test + métricas.

> **Multi-project:** itera sobre `state.projects[]`. Cada projeto pode ter deploy independente (frontend deploy ≠ backend deploy ≠ engine release). Smoke test é do **fluxo end-to-end** (que atravessa projetos). Métricas em cada provider listado por projeto. Veja `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-multi-project.md`.

> **Tools usadas:** referencie `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-tools.md` pra catálogo (built-in, MCP brain/Atlassian/github, sub-agents Explore/Plan/general-purpose, slash commands).

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.steps[merge].status` = `completed`

## 📥 Carregamento de contexto

Siga `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/_load-project-context.md`. Carregue:

- `observability.md` (providers — Sentry, PostHog, etc.)
- `rollout.md` (feature flag, deploy stages)
- `environments.md` (se existe — staging/prod URLs)

Se nenhum desses existe → **lacuna grande**. Pergunte ao usuário:
- "Tem ambientes deploy (staging/prod)? Que URLs?"
- "Onde olhar métricas? (provider + dashboard URL)"
- Ofereça salvar em `environments.md` / `observability.md` (feedback loop).

## ⚙️ Execução

### 1. Aguardar deploy

Verifique como deploy é triggado (CI, manual, push to tag, etc. — vem de `rollout.md`). Se manual, pergunte se já foi feito.

### 2. Smoke test

Roteiro derivado dos AC + seção 7 do SDD:
- Fluxo crítico end-to-end
- Verificar feature flag está ON (se aplicável)
- Conferir nenhum 5xx novo no provider de erro

### 3. Métricas

Pra cada provider listado em `observability.md`:
- Sentry → checar issue rate
- PostHog → checar evento de feature aparecendo
- Firebase / DataDog → idem

Apresente comparativo antes/depois (se possível):
```
📊 Métricas pós-deploy

Sentry:
  Issue rate (last 1h): X (era Y antes — Δ%)
  Novos issues taggeados com <feature>: N

PostHog:
  Evento <event_name>: Z impressões (Z > 0 = feature funcionando)
```

### 4. Decidir

```
Resultado: [✅ saudável] [⚠️ atenção] [❌ rollback necessário]
```

Se rollback necessário → carregue `rollout.md` pra plano de reversão. NÃO execute rollback automático — sempre confirmação humana.

## 💾 Persistência

```yaml
artifacts:
  postdeploy_report: docs/sdd-<slug>/postdeploy.md  # se gerou doc
steps:
  - id: postdeploy
    status: completed | warning | failed
    timestamp: <iso now>
    env: staging | prod
last_step: postdeploy
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-postdeploy = saudável

Env: prod
Smoke test: pass
Métricas: <resumo>

📍 Próximo: /sdd-capture --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Captura de aprendizados (= `/sdd-capture`)
- ❌ Executar rollback automaticamente
