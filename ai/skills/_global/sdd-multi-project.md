---
title: "Skill: SDD Multi-Project Iteration (shared)"
tags: [meta, sdd, multi-project, shared]
stack: [all]
category: meta
---

# Iteração Multi-Project no SDD

Bloco compartilhado por todos os `/sdd-*` slash commands para **iterar corretamente sobre `state.projects[]`** quando a task envolve mais de um repo/serviço.

> **Regra ouro:** task pode tocar N projetos. Toda lógica de sub-command DEVE iterar sobre `state.projects[]` — nunca assumir 1.

## 🧭 Como cada sub-command lida com multi-project

| Sub-command | Estratégia |
|-------------|-----------|
| `/sdd-discover` | Pergunta TODOS os projetos envolvidos. Carrega contexto + grooming pra cada. AC ganha `covered_by:`. |
| `/sdd-spec` | UM `plan.md` com **uma seção por projeto** ("## Projeto: X — Mudanças"). Cada seção pode ser produzida pelo planner agent daquele projeto. |
| `/sdd-spec-validate` | Gate único global — usuário aprova ou rejeita o SDD inteiro. |
| `/sdd-tasks` | Cria issues no Jira project key de **cada projeto** envolvido. Linka entre si (`createIssueLink` com tipo "relates to"). |
| `/sdd-implement` | Itera projetos na ordem do `merge_order` invertido (frontend depende do backend então implementa backend primeiro). Branch + commits + agent por projeto. |
| `/sdd-review` | Gates de cada projeto independente (`commands.md` específico). Falha = falha **só pra aquele projeto**, não pra task inteira. Outros podem prosseguir. |
| `/sdd-verify` | Por AC, exercita cada projeto listado em `covered_by`. Multi-app = subir cada um. |
| `/sdd-pr` | N PRs (um por projeto). Body de cada PR linka pros outros ("Parte de SDD <slug>. Outros PRs: …"). |
| `/sdd-watch` | Babysit N PRs em paralelo (ou loop). Reportar status agregado. |
| `/sdd-merge` | Segue `state.merge_order` (default: backend → engine → frontends). NUNCA mergeia frontend antes do backend que ele consome. |
| `/sdd-postdeploy` | Smoke test do fluxo end-to-end (que passa por N projetos). Métricas em cada um. |
| `/sdd-capture` | Captura aprendizados gerais + cross-project. |

## 🔁 Template de iteração

```
Para cada proj em state.projects:
  cwd_para_operacoes = proj.root
  carregar tópicos relevantes do índice de proj
  carregar agents project-specific de proj se existirem
  executar o passo no contexto de proj
  atualizar state.projects[proj.name].<campos>
```

**Quando passos podem rodar em paralelo** (sub-agents independentes):
- grooming por projeto
- review por projeto (gates independentes)
- babysit de N PRs

**Quando passos DEVEM ser sequenciais:**
- implementação (backend antes de frontend que depende)
- merge (segue `merge_order`)
- postdeploy (idem)

## 📦 Tarefas single-project

Quando `len(state.projects) == 1`:
- Comportamento equivale ao single-project clássico
- Pula a lógica de cross-linking de PRs e merge ordering
- Mas mantém schema com `projects[]` (sempre uma lista)

## 🪜 Regra canônica de `merge_order`

Esta é a **única fonte de verdade**. `/sdd-discover` deriva, `/sdd-merge` segue.

**Default (sem perguntar ao usuário):**

```
1. Engine / lib compartilhada      (vakinha_api_engine, vakinha-client-kit)
2. Backends (APIs)                  (vakinha-api, vakinha-admin-api)
3. Frontends consumidores           (vakinha-app, vakinha-web, vakinha-bio-next, vakinha-admin-web, vakinha-da-sorte, vakinha-widget, vakinha-manager-web)
```

**Por quê essa ordem:**
- Lib/engine release dispara bump em ambas APIs — release primeiro evita versões conflitantes
- Backend deploy precisa estar live antes do frontend chamar endpoint novo
- Frontend chamando endpoint inexistente = produção quebrada

**Quando perguntar ao usuário:**
- Ordem ambígua (ex.: 2 backends sem deps entre si)
- Task envolve só 1 projeto (não há ordem)
- Usuário explicitamente sobrescreveu via flag `--merge-order=<lista>`

**Derivação automática em `/sdd-discover`:** mapeia cada `state.projects[i].role` pras 3 camadas acima. Atribui posição. Ordena. Salva em `state.merge_order` (lista de project names).

Exemplo:
```yaml
projects:
  - {name: vakinha-app, role: mobile}     # camada 3
  - {name: vakinha-api, role: api}        # camada 2
  - {name: vakinha-engine, role: lib}     # camada 1
merge_order: [vakinha-engine, vakinha-api, vakinha-app]
```

## 🚦 Falha parcial — o que fazer

Se review/verify falha em **um projeto** mas passa nos outros:

- Marque `projects[<falho>].gates.<gate>` = `failed`
- Marque task como `status: in_progress` (não aborta)
- Bloqueia `/sdd-pr` daquele projeto até corrigir
- **Outros projetos podem avançar** se sua matéria-prima já está pronta (mas atenção a deps: frontend não abre PR antes do PR do backend estar mergeado, em geral)

## 📜 Cross-linking de PRs

Body do PR de cada projeto inclui:

```markdown
## Parte de SDD <slug>

Esta mudança é parte de um SDD multi-project. PRs relacionados:

- vakinha-api#<N>     ← backend (Apple OAuth endpoint)
- vakinha-app#<N>     ← este PR (UI + chamada do endpoint)

**Ordem de merge:** vakinha-api → vakinha-app

SDD: <link pro plan.md no repo primário ou cópia no body>
```

## 🚫 Anti-padrões

- ❌ Forçar 1 projeto quando claramente toca múltiplos
- ❌ Assumir que `cwd` é o projeto correto pro passo — sempre use `state.projects[i].root`
- ❌ Ignorar `merge_order` no `/sdd-merge`
- ❌ Mergear frontend antes do backend que ele consome
- ❌ Tratar AC como por-projeto (são globais; `covered_by` é a relação)
