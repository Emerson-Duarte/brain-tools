---
name: brain-review-pr
description: Deep code review of a GitHub PR by URL. Analyzes implementation gaps, security issues, money/fraud risks, cross-project contract mismatches, and Jira AC coverage. Invoke when the user provides a PR URL or asks to review a pull request. Vakinha org only.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: review PR, review pull request, PR URL, github.com/vakinha pull, code review PR
  role: reviewer
  scope: review
  output-format: markdown
---

# Brain Review PR (Copilot CLI)

This skill executes the `/review-pr` brain command inside GitHub Copilot CLI.

## How to Execute

1. Read the full command instructions from `$BRAIN_TOOLS_PATH/.claude/commands/review-pr.md`.
2. Apply the tool mapping from the `brain-copilot-adapter` skill (or inline below).
3. Follow the workflow exactly as written — three review layers (implementation gaps, project standards, cross-repo contracts).

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from `~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Copilot CLI Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `Read(path)` | `view` or `bash` with `cat`/`sed` |
| `Bash(cmd)` | `bash` tool |
| `AskUserQuestion(q, choices)` | `ask_user` tool |
| `Agent(general-purpose, prompt)` | `task` tool with `agent_type: "general-purpose"` |
| `mcp__brain__get_behavior` | call `get_behavior` brain MCP tool directly |
| `mcp__claude_ai_Atlassian__getJiraIssue` | Atlassian MCP if available; else skip Jira context and warn |

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/review-pr.md
```

Apply the command with the argument(s) the user provided (PR URL, `--post`, `--quick`, `--no-cross`).

## Safety

- Read-only: never checkout, never edit files, never approve/reject PR.
- Publish comments only with `--post` flag + explicit user confirmation.
- Use `gh` CLI for all GitHub API calls.
