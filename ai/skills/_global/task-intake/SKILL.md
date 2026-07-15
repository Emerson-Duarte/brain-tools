---
name: brain-task-intake
description: Direct-mode task playbook (NOT SDD). Chains 8 phases — intake, discovery + baseline reproduction, objective+AC gate, Jira creation, execution, user-simulation verification (Maestro/Playwright/RSpec), PR, capture. Invoke when starting a normal fix/feature/refactor, often without a Jira card yet.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: task intake, começar task, trabalho direto, direct mode, /task-intake, reproduzir bug, discovery, verificar task
  role: orchestrator
  scope: full-cycle
  output-format: interactive
---

# Brain Task Intake — Modo Direto (Copilot/Codex CLI)

Executa o comando brain `/task-intake` fora do Claude Code. **NÃO é SDD** — nunca sugira `/sdd-*`,
`pr-create-sdd.md` ou `/brain-capture`.

## How to Execute

1. Read the full orchestrator from `$BRAIN_TOOLS_PATH/.claude/commands/task-intake.md`.
2. Apply the tool mapping below.
3. Follow the 8 phases in order; respect the hard gates (Phase 3 = objective+AC approval, Phase 6 =
   verification passes).

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from
`~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `Read(path)` | `view` tool |
| `Bash(cmd)` | `bash` tool |
| `Edit` / `Write` | `edit` / `create` tools |
| `Glob` / `Grep` | `glob` / `grep` tools |
| `AskUserQuestion(q, multiSelect, choices)` | `ask_user` tool; ask one category at a time |
| `Agent(explore, prompt)` | `task` tool with `agent_type: "explore"` |
| `mcp__brain__get_project_context` | call `get_project_context` directly |
| `mcp__brain__get_behavior` | call `get_behavior` directly (context="task intake") |
| `mcp__brain__search_knowledge` | call `search_knowledge` directly (find "matriz de rodagem") |
| `mcp__brain__add_note` | call `add_note` directly (Phase 8) |
| `mcp__claude_ai_Atlassian__*` | Atlassian MCP if available; else warn and skip Jira steps |

## Verification drivers (Phase 2 baseline & Phase 6 proof)
- **app** (`vakinha-app`) → Maestro (`maestro test .maestro/…`)
- **web** (`vakinha-web`/`admin-web`/`manager-web`) → Playwright (`yarn e2e …`)
- **API** (`vakinha-api`/`admin-api`) → RSpec; **engine** → Minitest (`rake test`)

Details in brain knowledge: `search_knowledge(query="matriz de rodagem e verificação vakinha")`.

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/task-intake.md
```

## Safety Contracts

- **Never commit** with AI identity (`user.name == Claude`/`Copilot`, `noreply@anthropic.com`).
- **Never open a PR** without loading `$BRAIN_TOOLS_PATH/ai/skills/_global/pr-create.md` first (never `pr-create-sdd.md`).
- **Never use generic commit messages** — load `$BRAIN_TOOLS_PATH/ai/skills/_global/commit-message.md`.
- **Jira**: only existing labels (never create one); ask before assigning.
- **Confirm before external actions**: create Jira issue, open PR.
- **Pass these contracts** to sub-agents.
