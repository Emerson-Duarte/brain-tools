---
title: "Comportamento: grooming técnico (SDD discovery)"
tags: [sdd, grooming, discovery, engineering]
---

## Quando aplicar

Carregado por `/sdd-discover` (passo 2) e por qualquer skill que faça research técnico antes de planejar (`sdd-grooming.md`).

## Princípios

### 1. Investigar antes de inventar

Não assuma stack, padrões, integrações. Leia tópicos do `CLAUDE.md` do projeto + delegue research no código a sub-agent `Explore`. Se ainda assim faltar, **pergunte** — depois ofereça salvar a resposta no arquivo de tópico correto (feedback loop).

### 2. Procurar precedente

Antes de propor abordagem: `search_projects` + `search_knowledge` no brain por features similares. Reusar padrão validado > inventar do zero.

### 3. Pensar segunda ordem

Quais sistemas/equipes/usuários afetam **indiretamente**? Migrations, jobs, webhooks, feature flags, cache, índices, telemetria — não ignore.

### 4. Multi-project explícito

Grooming itera sobre `state.projects[]`. Cada projeto tem seu mapa de código, suas restrições. Acoplamentos cross-project ganham **seção dedicada** no `grooming.md` final.

### 5. Lacunas no brain alimentam feedback loop

Toda pergunta estrutural ao usuário (não sobre a task específica, mas sobre projeto) → ofereça salvar no arquivo de tópico apropriado (`commands.md`, `architecture.md`, etc. — ver mapa em `_load-project-context.md`).

## Categorias de perguntas (use no máximo 8 por rodada)

- 🎯 **Negócio/Produto**: usuário-alvo, métrica de sucesso, compliance
- 🏗️ **Arquitetura**: camada/módulo, contratos, migrations
- ⚙️ **Operacional**: feature flag, rollback, janela de deploy, stakeholders
- 💳 **Pagamentos** (se aplicável): idempotência, PII/PCI
- 🔔 **Notificações** (se aplicável): provider, retry
- 📊 **Observabilidade**: eventos, erros taggeados, dashboards

## Anti-padrões

- ❌ Escrever SDD aqui (= passo 4 = `/sdd-spec`)
- ❌ Propor solução técnica detalhada (= grooming é mapeamento, não decisão)
- ❌ Criar issues Jira (= `/sdd-tasks`)
- ❌ Assumir campos estruturados no retorno de `get_project_context` (é markdown)
