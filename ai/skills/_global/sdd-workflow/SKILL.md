---
name: brain-sdd-workflow
description: Spec-Driven Development (SDD) workflow orchestrator. Chains 12 steps across 4 phases — Discovery & Spec, Implementation, Delivery, Post-deploy — for one or multiple projects. Invoke when the user starts a new feature, task, or asks for SDD workflow. Use sub-commands (brain-sdd-discover, etc.) for isolated phases.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: SDD workflow, spec driven development, start feature, start task, sdd-workflow, new feature planning, /sdd
  role: orchestrator
  scope: full-cycle
  output-format: interactive
---

# Brain SDD Workflow (Copilot CLI)

This skill executes the `/sdd-workflow` brain command inside GitHub Copilot CLI.

## How to Execute

1. Read the full orchestrator instructions from `$BRAIN_TOOLS_PATH/.claude/commands/sdd-workflow.md`.
2. Apply the tool mapping below.
3. The orchestrator chains sub-commands. Each sub-command file lives at `$BRAIN_TOOLS_PATH/.claude/commands/sdd-<step>.md`.

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from `~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Copilot CLI Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `Read(path)` | `view` tool |
| `Bash(cmd)` | `bash` tool |
| `Edit` / `Write` | `edit` / `create` tools |
| `Glob` / `Grep` | `glob` / `grep` tools |
| `AskUserQuestion(q, multiSelect, choices)` | `ask_user` tool; for multi-select, ask one phase at a time with `choices` array |
| `TodoWrite` / `TodoRead` | `sql` tool → `todos` + `todo_deps` tables |
| `Agent(general-purpose, prompt)` | `task` tool with `agent_type: "general-purpose"` |
| `Agent(explore, prompt)` | `task` tool with `agent_type: "explore"` |
| `mcp__brain__get_project_context` | call `get_project_context` directly |
| `mcp__brain__get_behavior` | call `get_behavior` directly |
| `mcp__brain__search_skills` | call `search_skills` directly |
| `mcp__claude_ai_Atlassian__*` | Atlassian MCP if available; else warn and skip Jira steps |

State files (`_state.md`) are stored under `<project>/docs/sdd-<slug>/` as described in the orchestrator.

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/sdd-workflow.md
```

For isolated phases, read the sub-command directly:

```
$BRAIN_TOOLS_PATH/.claude/commands/sdd-<step>.md
```

## Safety Contracts

- **Never commit** with AI identity (`user.name == Claude`, `user.name == Copilot`, `noreply@anthropic.com`).
- **Never open a PR** without loading `$BRAIN_TOOLS_PATH/ai/skills/_global/pr-create.md` first.
- **Never use generic commit messages** — always load `$BRAIN_TOOLS_PATH/ai/skills/_global/commit-message.md`.
- **Always pass these contracts** to sub-agents spawned via `task` tool.
- **Confirm before external actions**: create Jira issues, move cards, open PR, merge.
