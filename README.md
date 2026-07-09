# brain-tools

Servidor MCP + skills/behaviors/prompts agnósticos para Claude Code, Codex e **GitHub Copilot CLI**. Pode ser usado por qualquer pessoa — todo o conteúdo daqui é **independente de domínio**.

> 🧩 Este é o repo **público de tools**. Seu conhecimento privado (projetos, PRDs, notas) vive num repo separado de dados (`brain-data`), que pode permanecer privado. O MCP server lê ambos via `BRAIN_TOOLS_PATH` e `BRAIN_DATA_PATH`.

## O que tem aqui

```
.claude/commands/        ← slash commands globais: /sdd-workflow, /brain-capture
ai/skills/_global/       ← skills agnósticas (SDD, PR, commit, planner, adapters, etc.)
ai/prompts/              ← prompts agnósticos (vazio até você adicionar)
behaviors/               ← code-review, prd-writing, brain-capture
mcp/                     ← servidor MCP (TypeScript)
scripts/                 ← bootstraps locais/remotos
docs/                    ← guias
prds/templates/          ← template genérico de PRD
setup.sh                 ← bootstrap local (Mac/Linux)
Dockerfile + docker-compose.yml
```

## Setup rápido — local

```bash
git clone https://github.com/Emerson-Duarte/brain-tools.git ~/brain-tools
bash ~/brain-tools/setup.sh \
  --data-repo git@github.com:SEU_USUARIO/brain-data.git
```

O script configura os três clientes automaticamente:

| Cliente | Config gerada |
|---------|---------------|
| Claude Code | `~/.claude.json` (MCP) · `~/.claude/CLAUDE.md` · `~/.claude/commands/` |
| Codex | `~/.codex/config.toml` (MCP) · `~/.codex/AGENTS.md` · `~/.codex/skills/brain-*` |
| Copilot CLI | `~/.copilot/mcp-config.json` (MCP) · `~/.agents/skills/brain-*` |

## Setup rápido — Claude Code web (claude.ai/code)

Crie um environment, adicione as env vars (`TOOLS_REPO_URL`, `DATA_REPO_URL`, `GIT_EMAIL`, `GIT_NAME`) e cole no campo Setup script:

```bash
#!/bin/bash
set -e
curl -fsSL https://raw.githubusercontent.com/Emerson-Duarte/brain-tools/main/scripts/environment-bootstrap.sh -o /tmp/brain-bootstrap.sh
bash /tmp/brain-bootstrap.sh
```

Detalhes em [`docs/environment-setup.md`](docs/environment-setup.md).

## Compatibilidade de clientes

| Recurso | Claude Code | Codex | Copilot CLI |
|---------|:-----------:|:-----:|:-----------:|
| MCP brain | ✅ | ✅ | ✅ |
| Skills globais | ✅ `~/.claude/skills/` | ✅ `~/.codex/skills/` | ✅ `~/.agents/skills/` |
| Slash commands | ✅ nativo | via adapter | via skill wrappers |
| Instruções globais | `CLAUDE.md` | `AGENTS.md` (gerado) | custom_instruction (manual) |
| Adapter | — | `codex-adapter` skill | `copilot-adapter` skill |

### Skills disponíveis (Copilot CLI)

Após o setup, as skills aparecem em `~/.agents/skills/brain-*` e ficam disponíveis no Copilot CLI:

| Skill | Descrição |
|-------|-----------|
| `brain-copilot-adapter` | Camada de tradução Claude Code → Copilot CLI |
| `brain-review-pr` | Revisão profunda de PR por URL |
| `brain-review-task` | Revisão multi-repo por task ID do Jira |
| `brain-capture` | Captura aprendizados da sessão no brain |
| `brain-sdd-workflow` | Orquestrador SDD completo |
| `brain-handoff` | Worklog de handoff entre máquinas |
| `brain-commit-message` | Mensagem de commit seguindo convenções do brain |
| `brain-pr-create` | Abertura de PR seguindo convenções do brain |

## Tools do MCP

| Tool | Fonte | Propósito |
|------|-------|-----------|
| `search_skills` | tools + data | Busca skills agnósticas (`_global`) e por projeto |
| `search_prompts` | tools | Busca prompts agnósticos |
| `get_behavior` | tools (+ overrides do data) | Carrega regras de comportamento por contexto |
| `get_project_context` | data | Carrega contexto completo de um projeto |
| `search_projects` | data | Busca referências de projeto |
| `search_prds` / `create_prd` | data | Lê/cria PRDs |
| `search_knowledge` / `add_note` | data | Lê/cria notas na base de conhecimento |

## Variáveis de ambiente

| Var | Default | Significado |
|-----|---------|-------------|
| `BRAIN_TOOLS_PATH` | `$HOME/.brain-tools` | Onde está este repo |
| `BRAIN_DATA_PATH` | `$HOME/.brain-data` | Onde está o repo privado de dados |
| `BRAIN_PATH` *(legado)* | — | Backward-compat: se setado e os novos não, usa pra ambos |

## Licença

MIT.
