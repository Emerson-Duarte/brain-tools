---
name: brain-codex-adapter
description: Execute workflows, commands and skills originally written for Claude Code inside Codex by mapping paths, tool names, prompts and safety contracts.
tags: [codex, brain, compatibility, workflow]
stack: [all]
category: meta
---

# Brain Codex Adapter

Use this skill whenever a brain command, skill, behavior or project instruction was written for Claude Code but is being executed by Codex.

## Purpose

The brain repositories keep most reusable workflow knowledge in Claude-compatible files:

- `brain-tools/.claude/commands/*.md`
- `brain-tools/ai/skills/_global/*.md`
- `brain-data/ai/settings/CLAUDE.md`
- `brain-data/projects/<project>/CLAUDE.md`

Codex can use the same source of truth, but it must translate Claude-specific tool names and legacy paths instead of following them literally.

## Path Resolution

Prefer paths from the active MCP configuration:

- `BRAIN_TOOLS_PATH`: public tools repo
- `BRAIN_DATA_PATH`: private data repo

If these env vars are not directly available to the shell, read them from `~/.codex/config.toml` under `[mcp_servers.brain.env]`.

Treat hardcoded examples such as `/Users/dev/www/vakinha/brain-tools` and `/Users/dev/www/vakinha/brain-data` as legacy placeholders. Resolve them to:

- `$BRAIN_TOOLS_PATH`
- `$BRAIN_DATA_PATH`

For project roots, prefer `$BRAIN_DATA_PATH/projects/projects.conf`. Do not trust illustrative paths inside old docs when `projects.conf` exists.

## File Conventions

`CLAUDE.md` remains the canonical brain index filename because the data repo was created for Claude Code first. In Codex:

- Global entrypoint: `~/.codex/AGENTS.md`
- Project entrypoint: `<project>/AGENTS.md`
- Canonical project knowledge index: `<project>/CLAUDE.md` or `$BRAIN_DATA_PATH/projects/<project>/CLAUDE.md`

If only `CLAUDE.md` exists for a project, read it as the project index.

## Slash Commands

Codex does not need Claude's slash-command loader. When the user invokes or mentions a brain command such as `/sdd-workflow`, `/review-task`, or `/brain-capture`:

1. Resolve the command file in `$BRAIN_TOOLS_PATH/.claude/commands/<command>.md`.
2. Read the command file completely.
3. Apply this adapter before executing its instructions.
4. Follow the command's workflow and gates as written unless it conflicts with Codex tool availability or current user instructions.

## Tool Mapping

Map Claude-oriented tool names to Codex capabilities:

| Claude-oriented instruction | Codex equivalent |
| --- | --- |
| `Read(path)` | Read with shell tools such as `sed`, `rg`, `nl`, or MCP resources when available |
| `Write` / `Edit` | Use `apply_patch` for manual file edits |
| `Bash` | Use `exec_command`; request escalation when sandbox policy requires it |
| `AskUserQuestion` | Ask a concise question; use structured user input only when that tool is available |
| `TodoWrite` | Use `update_plan` |
| `Agent` / sub-agent | Use available multi-agent tools when present; otherwise do the work directly and preserve the same contracts |
| `Glob` / `Grep` | Prefer `rg --files` and `rg` |

When a command says "call slash command X", read `$BRAIN_TOOLS_PATH/.claude/commands/X.md` and execute the instructions; do not assume native slash-command dispatch.

## MCP Tool Names

Brain MCP tools may appear with different prefixes depending on the host:

- Claude examples: `mcp__brain__get_project_context`
- Codex exposed namespace: `mcp__brain.get_project_context` or equivalent tool surface

Use the available brain MCP tool with the same semantic name. Do not fail solely because the prefix differs.

For Jira/Atlassian and GitHub tools, prefer available MCP tools. If a command references a Claude-specific Atlassian namespace that is not available in Codex, use the installed connector if present; otherwise fall back to `gh`/Jira CLI only when configured, or ask for the missing integration.

## Safety Contracts

Contracts still apply in Codex:

- Never commit with `git config user.email == noreply@anthropic.com`.
- Never commit with an AI placeholder name such as `Claude` or `Codex`.
- Never open a PR without loading the corresponding brain PR skill first.
- Never use generic commit/PR templates when a brain skill applies.
- Pass these contracts explicitly to any delegated sub-agent.

If a Claude command mentions only `user.name == Claude`, treat `Codex` as prohibited too.
