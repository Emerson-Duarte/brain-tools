# Setup do brain pro Claude Code remote environment

Este guia explica como configurar **1 environment compartilhado** no Claude Code web (claude.ai/code) que serve todos seus projetos sem precisar tocar nos repos-alvo.

## 🧠 Arquitetura: dois repos

O `brain` é composto por **dois repos separados**:

| Repo | Visibilidade | Conteúdo |
|------|--------------|----------|
| `brain-tools` | **Público** | Servidor MCP + skills/behaviors/prompts **agnósticos** (qualquer dev pode reutilizar) |
| `brain-data` | **Privado** | Seus `projects/`, `prds/`, `knowledge/`, `ai/settings/CLAUDE.md` (privado por padrão) |

O MCP server lê ambos via `BRAIN_TOOLS_PATH` e `BRAIN_DATA_PATH`.

## ⚙️ Como o bootstrap funciona

O Claude Code **remote** roda em containers ephemeral — nascem do zero a cada sessão. Mas os **environments** persistem e podem executar scripts de setup ao iniciar. Aproveitamos isso pra:

1. Clonar **brain-tools** (público) em `~/.brain-tools`
2. Clonar **brain-data** (privado) em `~/.brain-data` *(precisa de auth)*
3. Buildar o MCP server (no brain-tools)
4. Registrar o MCP em `~/.claude.json` com **ambos os paths**
5. Symlinkar slash commands (`/sdd-workflow`, `/brain-capture`) em `~/.claude/commands/`
6. Symlinkar `CLAUDE.md` global → `~/.claude/CLAUDE.md` (vem do brain-data)
7. Configurar git identity global

**Nenhum arquivo é adicionado aos repos-alvo.**

## 📋 Setup (uma vez)

### 1. Crie o environment no claude.ai/code

Acesse https://claude.ai/code, clique no **ícone de nuvem** → **"Add environment"**:

- **Name:** `dev`
- **Network access:** `Trusted` (default). Já inclui `github.com`, `registry.npmjs.org`. Suficiente pro nosso caso.
- **Environment variables** (formato `KEY=value` por linha, **sem aspas**):
  ```
  TOOLS_REPO_URL=https://github.com/Emerson-Duarte/brain-tools.git
  DATA_REPO_URL=https://github.com/Emerson-Duarte/brain.git
  GIT_EMAIL=pduarte.emerson@gmail.com
  GIT_NAME=Emerson Duarte
  ```
  *(opcional)* `TOOLS_BRANCH`, `DATA_BRANCH` (default `main`), `TOOLS_DIR`, `DATA_DIR`.

### 2. Cole o setup script (inline bash)

Como o `brain-tools` é público, o `curl` direto funciona:

```bash
#!/bin/bash
set -e
curl -fsSL https://raw.githubusercontent.com/Emerson-Duarte/brain-tools/main/scripts/environment-bootstrap.sh \
  -o /tmp/brain-bootstrap.sh
chmod +x /tmp/brain-bootstrap.sh
bash /tmp/brain-bootstrap.sh
```

**Para o repo privado** (`brain-data`), o `git clone` precisa de auth. O Claude Code web já injeta credenciais do GitHub quando o environment tem a integração ativa — o `git clone https://github.com/...` autentica automaticamente.

**Limites do Setup script:**
- ⏱️ Timeout: ~5 minutos
- 💾 Cacheado por ~7 dias — só re-roda se você mudar o script ou network policy
- 👤 Executado como `root` em Ubuntu 24.04
- 🚫 Se o script sair com código não-zero, a sessão falha

### 3. Selecione o environment ao iniciar sessão

Toda vez que você iniciar uma sessão Claude Code, **escolha `dev`** no seletor de environment. O setup roda (ou puxa do cache) e a sessão inicia com `/sdd-workflow` disponível.

## ✅ Verificação

Quando a primeira sessão iniciar, o setup roda automaticamente. Pra confirmar:

1. **Slash commands aparecem:** digite `/` e você deve ver `/sdd-workflow` e `/brain-capture`
2. **MCP brain conectado:** as ferramentas `mcp__brain__get_project_context`, `search_skills` etc. devem estar disponíveis (peça pra Claude listar os MCP servers ativos)
3. **Git identity correta:**
   ```bash
   git config --global user.email   # → pduarte.emerson@gmail.com
   git config --global user.name    # → Emerson Duarte
   ```
4. **Ambos os repos clonados:**
   ```bash
   ls ~/.brain-tools   # → ai/ behaviors/ mcp/ scripts/ ...
   ls ~/.brain-data    # → ai/ knowledge/ prds/ projects/ ...
   ```

## 🔄 Atualização

Sempre que você fizer push em qualquer dos repos:

- Próxima sessão Claude Code → bootstrap detecta mudança → `git pull` automático em ambos → MCP rebuild se TypeScript mudou → symlinks reatualizados
- Sessões já em andamento **não atualizam** (precisa reiniciar a sessão)

## 🚫 O que NÃO acontece

- Nenhum arquivo é adicionado aos repos do seu dia-a-dia
- Nenhuma config é alterada nos repos-alvo
- Git config dos repos-alvo continua intocado (só o `--global` muda)

## 🐛 Troubleshooting

| Sintoma | Causa provável | Resolução |
|---------|----------------|-----------|
| `/sdd-workflow` não aparece | Setup script não rodou ou falhou | Veja logs do environment; rode `bash ~/.brain-tools/scripts/environment-bootstrap.sh` manualmente |
| MCP `brain` não conecta | `~/.claude.json` não tem o servidor registrado, ou Claude Code não foi reiniciado | Reinicie a sessão; confira `~/.claude.json` |
| `git clone` do `brain-data` falha | Repo privado sem auth no environment | Habilite integração GitHub no environment ou use URL com token |
| `npm ci` falha | Network restrita a `registry.npmjs.org` | Adicione à allowlist do environment |
| Commits ainda saem com user "CLAUDE" | Claude Code cacheou config local | `git config --local --unset user.email` no repo problemático |

## 📦 Arquivos relevantes

No `brain-tools` (público, este repo):
- **Bootstrap:** `scripts/environment-bootstrap.sh`
- **MCP server:** `mcp/` (TypeScript, build pra `mcp/dist/`)
- **Slash commands:** `.claude/commands/*.md`

No `brain-data` (privado):
- **CLAUDE.md global:** `ai/settings/CLAUDE.md`
- **Projetos, PRDs, knowledge**: `projects/`, `prds/`, `knowledge/`

## 🔮 Migração futura pra plugin

Quando outros devs quiserem reutilizar **só as tools agnósticas**, o caminho recomendado é empacotar o `brain-tools` como **Claude Code Plugin** (já é praticamente um — `.claude/commands/`, `ai/skills/_global/`, `mcp/`). Aí a instalação vira `/plugin install Emerson-Duarte/brain-tools` e o `brain-data` continua privado e específico de cada pessoa.
