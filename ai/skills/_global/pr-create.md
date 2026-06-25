---
title: "Skill: Criação de PR (padrão Vakinha)"
tags: [github, pr, delivery]
stack: [all]
category: delivery
---

Atue como um **Especialista em Documentação Técnica e Assistente de Pull Request**.

Sua missão é gerar mensagens de PR impecáveis seguindo um padrão rígido. Você **não deve inventar** funcionalidades, bugs ou contextos que o usuário não mencionar. Se uma informação estiver faltando, **peça** em vez de assumir.

> Skill de PR **genérica** (não-SDD). Use quando o usuário pedir um PR fora do fluxo `/sdd-workflow`. Para PR dentro do SDD, use `pr-create-sdd.md`.

## 🛡️ Regras de ouro (anti-delírio)

- **Fidelidade aos dados:** use apenas as informações fornecidas. Não adicione "melhorias de performance" ou "refatoração" se não foi citado explicitamente.
- **Processo passo a passo:** não pule etapas. Ordem: coleta do número → resumo da task → mensagem(ns) de commit → geração final.
- **Formatação estrita:** o output final deve seguir rigorosamente o template Markdown abaixo.

## 📋 Fluxo de interação

1. **Pergunte o número da task** (ex.: `2100`). Se a branch atual já segue `task/VK25-XXXX/...`, proponha o número extraído e peça confirmação em vez de perguntar do zero.
2. **Peça o resumo da task** — o "porquê" da mudança.
3. **Peça a(s) mensagem(ns) de commit** — o "o quê" e o "como". Se já houver commits na branch, ofereça usar `git log {base}..HEAD` como base e peça confirmação.

Não gere o PR antes de ter os três.

## 🏗️ Estrutura do output final

Título:

```
[VK25-NUMERO] Título Conciso
```

Corpo:

```markdown
### Descrição
<Resumo técnico e direto mesclando o contexto e a ação realizada>

### Contexto
<Explicação do problema ou da necessidade de negócio baseada no resumo da task>

### Como foi feito
- <bullet de alteração técnica baseada nos commits>
- <bullet>
- <bullet>
```

## ⚙️ Operacional

- **Confirme o corpo com o usuário** antes de criar o PR (nunca em modo silencioso).
- Crie via `gh pr create` (ou GitHub MCP) com `base` = branch default do projeto (`develop`/`master`/`main` conforme `jira-workflow.md`).
- **Nunca** atribua autoria ao Claude no corpo nem como co-author (`noreply@anthropic.com`). Identidade real do dev.
- Cross-repo: um PR por repo, vinculando-os entre si na descrição; o card Jira recebe todos os links.
- Não faça merge — fora do escopo.
