---
title: "Skill: SDD Tools Reference (shared)"
tags: [meta, sdd, tools, shared]
stack: [all]
category: meta
---

# Tools usadas pelos `/sdd-*` slash commands

Bloco compartilhado. Documenta **quais tools cada sub-command usa**, sintaxe correta e armadilhas comuns. Sub-commands referenciam este arquivo em vez de duplicar instruções.

## 🧰 Catálogo de tools

### Tools built-in do Claude Code

| Tool | Quando usar | Sintaxe / nota |
|------|-------------|----------------|
| `Read` | Carregar `.md` de skills, agents, tópicos do brain | Sempre path absoluto. Brain tools: `/Users/dev/www/vakinha/brain-tools/...`. Brain data: `/Users/dev/www/vakinha/brain-data/...` |
| `Edit` | Atualizar `_state.md`, fixar gaps em tópicos do projeto | Exige Read antes. `old_string` único no arquivo |
| `Write` | Criar `_state.md` inicial, `grooming.md`, `ac.md`, `plan.md`, etc. | Sobrescreve — pra existentes, prefira Edit |
| `Bash` | git, gh CLI, npm/yarn/expo, deploys | Quote paths com espaço. Cuidado com destrutivos (`rm`, `git push --force`) |
| `AskUserQuestion` | Pedir confirmações estruturadas, escolher projetos/AC | `multiSelect: true` quando aplicável. Máx 4 opções por pergunta |
| `Agent` | Delegar trabalho pesado a sub-agent | Veja seção "Sub-agents" abaixo |
| `Glob` | Achar `docs/sdd-*/_state.md`, agents em projects | Pattern globs do shell |
| `Grep` | Buscar palavras em código durante grooming | Prefira sub-agent `Explore` pra research pesado |

### Tools MCP — brain

| Tool | Quando usar |
|------|-------------|
| `mcp__brain__get_project_context` | Início de qualquer sub-command. Retorna índice + skills + PRDs + behaviors |
| `mcp__brain__search_skills` | Achar skill por nome/tag/projeto |
| `mcp__brain__get_behavior` | Carregar regras (`context="sdd" \| "grooming" \| "task breakdown" \| "code review" \| "prd writing"`) |
| `mcp__brain__search_knowledge` | Buscar referência técnica antes de inventar |
| `mcp__brain__search_projects` | "Como resolvemos isso antes?" |
| `mcp__brain__create_prd` | Salvar SDD em `brain-data/prds/` após `/sdd-spec` |
| `mcp__brain__add_note` | Salvar aprendizado em `/sdd-capture` |

### Tools MCP — Atlassian (Jira/Confluence)

| Tool | Quando usar |
|------|-------------|
| `mcp__claude_ai_Atlassian__createJiraIssue` | `/sdd-tasks` (criar issues do breakdown) |
| `mcp__claude_ai_Atlassian__createIssueLink` | `/sdd-tasks` (linkar deps cross-project) |
| `mcp__claude_ai_Atlassian__getIssueLinkTypes` | Consultar link types disponíveis antes de linkar |
| `mcp__claude_ai_Atlassian__transitionJiraIssue` | `/sdd-implement`, `/sdd-pr`, `/sdd-merge` (mover cards) |
| `mcp__claude_ai_Atlassian__getJiraIssue` | Carregar contexto de card existente |
| `mcp__claude_ai_Atlassian__addCommentToJiraIssue` | Anexar PR url ao card |

### Tools MCP — GitHub

| Tool | Quando usar |
|------|-------------|
| `mcp__github__subscribe_pr_activity` | `/sdd-watch` (eventos do PR) — fallback: `gh pr checks/view` via Bash |
| `mcp__github__merge_pull_request` | `/sdd-merge` |

Se MCP github não disponível, use `gh` CLI via Bash.

### Skills built-in (slash commands)

| Skill | Quando usar |
|-------|-------------|
| `/code-review` | Em `/sdd-review` |
| `/security-review` | Em `/sdd-review` |
| `/run` | Em `/sdd-verify` (subir app) |
| `/verify` | Em `/sdd-verify` (exercitar AC) |

Slash commands invocam-se via texto literal (`/code-review`) ou referenciando o arquivo `~/.claude/commands/<nome>.md` via Read + seguir.

## 🤖 Sub-agents (Agent tool)

Tipos disponíveis (passe como `subagent_type:`):

| Tipo | Use em | Exemplo de prompt |
|------|--------|-------------------|
| `Explore` | Research no código durante grooming (read-only, leve) | "Procure callsites de função X no projeto Y" |
| `Plan` | Redação do SDD em `/sdd-spec` | "Produza SDD multi-project conforme template implementation-planner.md" |
| `general-purpose` | Implementação em `/sdd-implement`, endereçar feedback em `/sdd-watch` | Fallback quando não há agent project-specific |
| `code-reviewer` | Override do `/code-review` se precisar de second opinion | "Revise migration X — verifique safety sob writes concorrentes" |

**Sempre** passe contratos rígidos no prompt do sub-agent — ele não tem contexto da conversa SDD:

```
Você opera no contexto SDD. Regras obrigatórias:
- git identity: nunca user.email == noreply@anthropic.com
- Carregue contexto via mcp__brain__get_project_context
- Cwd: <state.projects[i].root>
- State path: <primary>/docs/sdd-<slug>/_state.md
- {contratos específicos do passo}
```

## 🚫 Anti-padrões

- ❌ Chamar `Explore` direto (não existe como tool) — é `Agent(subagent_type="Explore", ...)`
- ❌ Esquecer de passar contratos pro sub-agent — ele vai improvisar
- ❌ Usar `Read` sem path absoluto pra arquivos do brain
- ❌ Assumir MCP github disponível — sempre tenha fallback gh CLI
- ❌ Slash commands invocando slash commands diretamente — invoque via Read do `~/.claude/commands/<nome>.md` e siga
- ❌ AskUserQuestion com >4 opções por pergunta (limite do tool)
- ❌ Bash com `sleep` em loop pra esperar CI — use `/sdd-watch` com encerramento de turno
