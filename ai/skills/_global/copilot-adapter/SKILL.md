---
name: brain-copilot-adapter
description: Execute workflows, commands and skills originally written for Claude Code inside GitHub Copilot CLI by mapping paths, tool names, prompts and safety contracts. Invoke this skill whenever a brain command, skill, behavior or project instruction was written for Claude Code and needs to run through Copilot CLI.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: brain command, brain skill, sdd-workflow, review-pr, review-task, brain-capture, handoff, Claude Code skill, brain adapter
  role: meta
  scope: compatibility
---

# Brain Copilot CLI Adapter

Use this skill whenever a brain command, skill, behavior or project instruction was written for Claude Code but is being executed by GitHub Copilot CLI.

## Purpose

The brain repositories keep reusable workflow knowledge in Claude-compatible files:

- `brain-tools/.claude/commands/*.md`
- `brain-tools/ai/skills/_global/*.md`
- `brain-data/ai/settings/CLAUDE.md`
- `brain-data/projects/<project>/CLAUDE.md`

Copilot CLI can use the same source of truth, but it must translate Claude-specific tool names and legacy paths instead of following them literally.

## Path Resolution

Prefer paths from the active MCP configuration. Read them from `~/.copilot/mcp-config.json` under `mcpServers.brain.env`, or resolve from known defaults:

- `BRAIN_TOOLS_PATH` → public tools repo (default: `~/brain-tools`)
- `BRAIN_DATA_PATH` → private data repo (default: `~/brain-data`)

Treat hardcoded examples such as `/Users/dev/www/vakinha/brain-tools` and `/Users/dev/www/vakinha/brain-data` as legacy placeholders. Resolve them via the paths above.

For project roots, prefer `$BRAIN_DATA_PATH/projects/projects.conf`. Do not trust illustrative paths inside old docs when `projects.conf` exists.

## File Conventions

`CLAUDE.md` is the canonical brain index filename (created for Claude Code). In Copilot CLI:

- Global entrypoint: custom_instruction in system prompt (managed by Copilot CLI)
- Project entrypoint: `<project>/CLAUDE.md` or `$BRAIN_DATA_PATH/projects/<project>/CLAUDE.md`

If only `CLAUDE.md` exists for a project, read it as the project index.

## Slash Commands → Copilot CLI Skills

Copilot CLI invokes skills via the `skill` tool, not slash commands. When the user invokes or mentions a brain command such as `sdd-workflow`, `review-task`, `review-pr`, or `brain-capture`:

1. If a matching brain skill (`brain-sdd-workflow`, `brain-review-pr`, etc.) is available in `available_skills`, invoke it using the `skill` tool.
2. Otherwise, read the command file at `$BRAIN_TOOLS_PATH/.claude/commands/<command>.md`.
3. Apply this adapter before executing its instructions.
4. Follow the command's workflow and gates as written, translating tools per the mapping below.

## Tool Mapping

Map Claude-oriented tool names to Copilot CLI tools:

| Claude instruction | Copilot CLI equivalent |
|--------------------|------------------------|
| `Read(path)` | `view` tool or `bash` with `cat`/`sed`/`rg` |
| `Write(path, content)` | `create` tool (new files) |
| `Edit(path, old, new)` | `edit` tool |
| `Bash(cmd)` | `bash` tool |
| `Glob(pattern)` | `glob` tool |
| `Grep(pattern)` | `grep` tool |
| `AskUserQuestion(q, choices)` | `ask_user` tool with `choices` array |
| `TodoWrite(todos)` | `sql` tool → INSERT/UPDATE `todos` table |
| `TodoRead()` | `sql` tool → SELECT from `todos` |
| `WebFetch(url)` | `web_fetch` tool |
| `Agent(type, prompt)` | `task` tool with matching `agent_type` |
| `mcp__brain__*` | brain MCP tools (same names, directly callable) |
| `mcp__claude_ai_Atlassian__*` | Atlassian MCP if configured; otherwise use `gh`/Jira CLI or skip with warning |
| `mcp__claude_ai_Notion__*` | Notion MCP if configured; otherwise skip with warning |

### Agent Type Mapping

| Claude agent type | Copilot CLI task agent_type |
|-------------------|-----------------------------|
| `general-purpose` | `general-purpose` |
| Explore / research | `explore` |
| Code review | `code-review` |
| Plan | `general-purpose` |

## MCP Tool Names

Brain MCP tools appear with different prefixes depending on the host. In Copilot CLI they are available as:

- `get_project_context`
- `get_behavior`
- `search_skills`
- `search_knowledge`
- `add_note`
- `search_prds` / `create_prd`
- `search_projects`
- `search_prompts`

Do not fail solely because a prefix differs from Claude Code examples.

## Safety Contracts

These contracts apply in Copilot CLI exactly as in Claude Code:

- **Never commit** with `git config user.email == noreply@anthropic.com`, `user.name == Claude`, or any AI placeholder name.
- **Never open a PR** without loading the brain `pr-create.md` skill first.
- **Never use generic commit/PR templates** — always load the brain `commit-message.md` skill.
- **Pass these contracts explicitly** to any delegated sub-agent via the `task` tool prompt.

## Skills Available in Copilot CLI

Brain global skills are linked under `~/.agents/skills/brain-*`. You can invoke them via the `skill` tool:

| Skill name | Purpose |
|------------|---------|
| `brain-copilot-adapter` | This adapter (meta) |
| `brain-review-pr` | Deep PR review by GitHub URL |
| `brain-review-task` | Multi-repo review by Jira task ID |
| `brain-capture` | Capture session learnings to brain |
| `brain-sdd-workflow` | Full SDD workflow orchestrator |
| `brain-handoff` | Worklog handoff between machines |
| `brain-commit-message` | Commit message following brain conventions |
| `brain-pr-create` | Open PR following brain conventions |
