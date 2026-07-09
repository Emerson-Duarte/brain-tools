---
name: brain-review-task
description: Multi-repo code review by Jira task ID. Discovers branches task/<ID>/* across all Vakinha repos, runs review skills in parallel per repo (via sub-agents), and synthesizes a cross-repo risk report. Invoke when the user provides a Jira task ID or asks to review a task branch. Vakinha org only.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: review task, review by task ID, Jira task review, VK task, multi-repo review, review-task
  role: reviewer
  scope: review
  output-format: markdown
---

# Brain Review Task (Copilot CLI)

This skill executes the `/review-task` brain command inside GitHub Copilot CLI.

## How to Execute

1. Read the full command instructions from `$BRAIN_TOOLS_PATH/.claude/commands/review-task.md`.
2. Apply the tool mapping from the `brain-copilot-adapter` skill (or inline below).
3. Follow the workflow: resolve TASK_ID → expand via Jira links → scan repos → launch parallel sub-agents → synthesize cross-repo report.

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from `~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Copilot CLI Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `Read(path)` | `view` or `bash` with `cat`/`sed` |
| `Bash(cmd)` | `bash` tool |
| `AskUserQuestion(q, choices)` | `ask_user` tool |
| `Agent(general-purpose, prompt)` | `task` tool with `agent_type: "general-purpose"` — launch all agents in a **single response** for parallelism |
| `mcp__claude_ai_Atlassian__getJiraIssue` | Atlassian MCP if available; else skip Jira context and warn |
| `mcp__claude_ai_Atlassian__getAccessibleAtlassianResources` | Atlassian MCP if available |

Project roots must be resolved via `$BRAIN_DATA_PATH/projects/projects.conf` — do not use hardcoded `/Users/dev/www/vakinha/...` paths.

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/review-task.md
```

Apply the command with the argument(s) the user provided (TASK_ID, `--no-links`, `--no-subtasks`).

## Safety

- Read-only: never checkout, never edit files.
- Sub-agents launched via `task` tool must also receive the read-only constraint in their prompt.
