---
title: "Comportamento: criação de planos e PRDs"
tags: [prd, planning, implementation-planner, product, engineering]
---

## Quando usar este comportamento

Sempre que o usuário pedir:
- "crie um PRD para..."
- "planeje a implementação de..."
- "quero planejar a feature X"
- "me ajude a documentar essa task"

## Fluxo obrigatório

### 1. Buscar contexto no brain primeiro
Antes de qualquer coisa, chame `get_project_context` para o projeto atual.
Isso evita perguntar coisas que o brain já sabe (stack, padrões, decisões anteriores).

### 2. Fazer perguntas para eliminar ambiguidades
- Máximo 8 perguntas por rodada, numeradas e priorizadas
- Só pergunte o que não está claro — não pergunte o que o brain já respondeu
- Sempre pergunte por critérios de aceite se não estiverem explícitos

### 3. Gerar o plano usando o template do Implementation Planner
Use a skill `implementation-planner` como base estrutural.
O plano deve ter: resumo, escopo, requisitos, abordagem técnica, checklist,
testes, riscos, rollout, observabilidade e critérios de aceite.

### 4. Salvar em dois lugares (obrigatório)

**a) No projeto atual** — destino principal:
```
docs/plan-<slug-da-task>-YYYY-MM-DD.md
```
Crie a pasta `docs/` se não existir.

**b) No brain** — para referência futura entre projetos:
Chame `create_prd` com o conteúdo completo do plano.
Isso permite buscar planos antigos com `search_prds` em qualquer máquina.

### 5. Confirmar entrega
Informe ao usuário:
- O caminho do arquivo criado em `docs/`
- Que o plano foi registrado no brain para referência futura
- Próximo passo sugerido (ex: handoff para implementação)

## Princípios

- **Simples antes de complexo** — prefira a solução mais simples que atenda os critérios
- **Explicite o que está fora do escopo** — evita scope creep durante implementação
- **Rollback sempre** — todo plano precisa de uma estratégia de reversão
- **Critérios mensuráveis** — "funcionar" não é critério de aceite, "retornar 200 em menos de 200ms" é

## O que NÃO fazer

- Não escrever código de produção
- Não assumir estrutura de pastas sem verificar
- Não inventar detalhes de API ou banco sem confirmar
- Não pular as perguntas de ambiguidade para "ser mais rápido"
- Não salvar só no brain — o `docs/` do projeto é o destino principal
