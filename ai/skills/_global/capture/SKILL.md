---
name: brain-capture
description: Analyze the current session and capture valuable learnings, decisions, patterns and references to the brain knowledge base. Confirms each item before saving. Invoke when the user asks to capture learnings, save notes from the session, or update the brain.
metadata:
  author: brain-tools
  version: "1.0.0"
  triggers: capture learnings, save to brain, brain capture, capture session, update brain, save notes, knowledge capture
  role: curator
  scope: knowledge-management
  output-format: interactive
---

# Brain Capture (Copilot CLI)

This skill executes the `/brain-capture` brain command inside GitHub Copilot CLI.

## How to Execute

1. Read the full command instructions from `$BRAIN_TOOLS_PATH/.claude/commands/brain-capture.md`.
2. Apply the tool mapping below.
3. Follow the workflow: analyze session → filter valuable items → confirm each → save confirmed items.

If `$BRAIN_TOOLS_PATH` is not available as a shell variable, resolve it from `~/.copilot/mcp-config.json` → `mcpServers.brain.env.BRAIN_TOOLS_PATH`.

## Copilot CLI Tool Mapping (inline)

| Claude instruction | Use instead |
|--------------------|-------------|
| `AskUserQuestion(q, choices)` | `ask_user` tool with `choices: ["Salvar", "Pular", "Editar antes de salvar"]` |
| `mcp__brain__search_knowledge` | call `search_knowledge` brain MCP tool directly |
| `mcp__brain__add_note` | call `add_note` brain MCP tool directly |
| `mcp__brain__create_prd` | call `create_prd` brain MCP tool directly |
| `mcp__brain__search_prds` | call `search_prds` brain MCP tool directly |

## Invocation

Read and execute:

```
$BRAIN_TOOLS_PATH/.claude/commands/brain-capture.md
```

The session history in this Copilot CLI conversation is the input to analyze.
