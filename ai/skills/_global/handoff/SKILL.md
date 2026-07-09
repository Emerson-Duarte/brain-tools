---
name: brain-handoff
description: Worklog handoff between machines. Scans Vakinha repos for uncommitted/unpushed work, records the handoff point in the brain worklog, mirrors to Notion, and alerts about work stuck locally. Use 'resume' argument to pick up where you left off on another machine.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: handoff, end of day, switch machine, resume work, worklog, work stuck locally, handoff resume
  role: coordinator
  scope: workflow
  output-format: interactive
---

# Brain Handoff (Copilot CLI)

This skill executes the `/handoff` brain command inside GitHub Copilot CLI.

## How to Execute

1. Read the full command instructions from `$BRAIN_TOOLS_PATH/.claude/commands/handoff.md`.
2. Apply the tool mapping below.
3. Two modes: no argument → **RECORD** (end of day); `resume` → **RESUME** (other machine).

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from `~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Copilot CLI Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `Read(path)` | `view` tool |
| `Write(path, content)` | `create` tool (new file) |
| `Edit(path, old, new)` | `edit` tool (append block to existing worklog) |
| `Bash(cmd)` | `bash` tool |
| `mcp__claude_ai_Notion__*` | Notion MCP if available; else skip silently and note "Notion: indisponível" |

Project roots must be resolved via `$BRAIN_DATA_PATH/projects/projects.conf` — do not hardcode paths.

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/handoff.md
```

Pass the user's argument (`resume` or empty).

## Safety

- Only commits to the brain worklog repo — never to project repos.
- Best-effort on all network calls (`gh`, `git push`, Notion): failure of one must not block the rest.
- **Never commit** with AI identity.
