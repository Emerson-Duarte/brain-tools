#!/usr/bin/env bash
# =============================================================================
# brain setup — bootstrap de nova máquina (local dev)
#
# Arquitetura: dois repos separados
#   - brain-tools (público, este)  → MCP server + skills/behaviors agnósticos
#   - brain-data  (privado)        → projects, prds, knowledge, settings
#
# Uso:
#   bash setup.sh \
#     [--tools-repo git@github.com:Emerson-Duarte/brain-tools.git] \
#     [--data-repo  git@github.com:Emerson-Duarte/brain.git] \
#     [--tools-dir  $HOME/brain-tools] \
#     [--data-dir   $HOME/brain-data] \
#     [--docker]
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[brain]${NC} $*"; }
warn()  { echo -e "${YELLOW}[brain]${NC} $*"; }
error() { echo -e "${RED}[brain]${NC} $*" >&2; exit 1; }

# ── Argumentos ───────────────────────────────────────────────────────────────
TOOLS_DIR="${TOOLS_DIR:-$HOME/brain-tools}"
DATA_DIR="${DATA_DIR:-$HOME/brain-data}"
TOOLS_REPO_URL="${TOOLS_REPO_URL:-https://github.com/Emerson-Duarte/brain-tools.git}"
DATA_REPO_URL="${DATA_REPO_URL:-}"
USE_DOCKER=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tools-repo) TOOLS_REPO_URL="$2"; shift 2 ;;
    --data-repo)  DATA_REPO_URL="$2";  shift 2 ;;
    --tools-dir)  TOOLS_DIR="$2";       shift 2 ;;
    --data-dir)   DATA_DIR="$2";        shift 2 ;;
    --docker)     USE_DOCKER=true;      shift ;;
    --no-docker)  USE_DOCKER=false;     shift ;;
    *) error "Argumento desconhecido: $1" ;;
  esac
done

# ── Detecta OS ───────────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="mac" ;;
  Linux)  PLATFORM="linux" ;;
  *)      error "OS não suportado: $OS" ;;
esac
info "Plataforma: $PLATFORM"

# ── Verifica dependências ─────────────────────────────────────────────────────
check_dep() { command -v "$1" &>/dev/null || error "'$1' não encontrado."; }
check_dep git
check_dep node
check_dep python3
[[ "$USE_DOCKER" == true ]] && check_dep docker

# ── Clona/atualiza um repo ─────────────────────────────────────────────────────
sync_repo() {
  local name="$1" dir="$2" url="$3"
  if [[ -d "$dir/.git" ]]; then
    info "$name já existe em $dir — atualizando..."
    git -C "$dir" pull --ff-only || warn "git pull em $name falhou — continuando com versão local"
  else
    if [[ -z "$url" ]]; then
      echo ""
      read -r -p "URL do repositório $name: " url
      [[ -z "$url" ]] && error "URL obrigatória"
    fi
    info "Clonando $name em $dir..."
    git clone "$url" "$dir"
  fi
}

sync_repo "brain-tools" "$TOOLS_DIR" "$TOOLS_REPO_URL"
sync_repo "brain-data"  "$DATA_DIR"  "$DATA_REPO_URL"

MCP_DIR="$TOOLS_DIR/mcp"

# ── Build do MCP ──────────────────────────────────────────────────────────────
info "Instalando dependências do MCP..."
npm --prefix "$MCP_DIR" ci --silent

info "Compilando TypeScript..."
npm --prefix "$MCP_DIR" run build

# ── Docker (opcional) ─────────────────────────────────────────────────────────
if [[ "$USE_DOCKER" == true ]]; then
  docker info &>/dev/null || error "Docker não está rodando."
  info "Construindo imagem Docker..."
  docker build -t brain-mcp:latest "$TOOLS_DIR"
fi

# ── Configura Claude Code (~/.claude.json) ────────────────────────────────────
configure_claude_code() {
  local CLAUDE_JSON="$HOME/.claude.json"

  if [[ ! -f "$CLAUDE_JSON" ]]; then
    warn "~/.claude.json não encontrado — configure manualmente após instalar o Claude Code"
    return
  fi

  if grep -q '"brain"' "$CLAUDE_JSON"; then
    warn "brain já está em ~/.claude.json — pulando"
    return
  fi

  cp "$CLAUDE_JSON" "$CLAUDE_JSON.bak"

  if [[ "$USE_DOCKER" == true ]]; then
    python3 - <<PYEOF
import json
with open('$CLAUDE_JSON') as f:
    cfg = json.load(f)
cfg.setdefault('mcpServers', {})['brain'] = {
    'command': 'docker',
    'args': [
        'run','--rm','-i',
        '-v','$TOOLS_DIR:/brain-tools',
        '-v','$DATA_DIR:/brain-data',
        '--env','BRAIN_TOOLS_PATH=/brain-tools',
        '--env','BRAIN_DATA_PATH=/brain-data',
        'brain-mcp:latest',
    ],
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
PYEOF
  else
    python3 - <<PYEOF
import json
with open('$CLAUDE_JSON') as f:
    cfg = json.load(f)
cfg.setdefault('mcpServers', {})['brain'] = {
    'command': 'node',
    'args': ['$MCP_DIR/dist/index.js'],
    'env': {
        'BRAIN_TOOLS_PATH': '$TOOLS_DIR',
        'BRAIN_DATA_PATH':  '$DATA_DIR',
    },
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
PYEOF
  fi

  info "~/.claude.json atualizado com o brain MCP (dois paths)"
}

# ── Configura Codex (~/.codex/config.toml) ────────────────────────────────────
configure_codex() {
  local CODEX_CONFIG="$HOME/.codex/config.toml"

  if [[ ! -d "$HOME/.codex" ]]; then
    warn "~/.codex não encontrado — Codex não está instalado, pulando"
    return
  fi

  if [[ -f "$CODEX_CONFIG" ]] && grep -q '\[mcp_servers\.brain\]' "$CODEX_CONFIG"; then
    warn "brain já está em ~/.codex/config.toml — pulando"
    return
  fi

  cat >> "$CODEX_CONFIG" << TOML

[mcp_servers.brain]
command = "node"
args = ["$MCP_DIR/dist/index.js"]

[mcp_servers.brain.env]
BRAIN_TOOLS_PATH = "$TOOLS_DIR"
BRAIN_DATA_PATH  = "$DATA_DIR"
TOML

  info "~/.codex/config.toml atualizado com o brain MCP"
}

# ── Symlink CLAUDE.md global (vem do repo de dados) ───────────────────────────
configure_global_claude_md() {
  local GLOBAL_MD="$DATA_DIR/ai/settings/CLAUDE.md"
  local TARGET="$HOME/.claude/CLAUDE.md"

  [[ ! -f "$GLOBAL_MD" ]] && { warn "CLAUDE.md global não encontrado em $GLOBAL_MD — pulando"; return; }

  mkdir -p "$HOME/.claude"

  if [[ -L "$TARGET" && "$(readlink "$TARGET")" == "$GLOBAL_MD" ]]; then
    warn "Symlink ~/.claude/CLAUDE.md já existe — pulando"
    return
  fi

  [[ -f "$TARGET" && ! -L "$TARGET" ]] && cp "$TARGET" "$TARGET.bak" && warn "Backup: $TARGET.bak"
  ln -sf "$GLOBAL_MD" "$TARGET"
  info "Symlink: ~/.claude/CLAUDE.md → brain-data/ai/settings/CLAUDE.md"
}

# ── Symlinks de slash commands globais (vêm do repo público) ─────────────────
configure_global_commands() {
  local COMMANDS_SRC="$TOOLS_DIR/.claude/commands"
  local COMMANDS_DST="$HOME/.claude/commands"

  if [[ ! -d "$COMMANDS_SRC" ]]; then
    warn "$COMMANDS_SRC não encontrado — pulando"
    return
  fi

  mkdir -p "$COMMANDS_DST"

  for src_file in "$COMMANDS_SRC"/*.md; do
    [[ -f "$src_file" ]] || continue
    local filename target
    filename="$(basename "$src_file")"
    target="$COMMANDS_DST/$filename"

    if [[ -L "$target" && "$(readlink "$target")" == "$src_file" ]]; then
      warn "Slash command já linkado: /${filename%.md} — pulando"
      continue
    fi

    [[ -f "$target" && ! -L "$target" ]] && cp "$target" "$target.bak" && warn "Backup: $target.bak"
    ln -sf "$src_file" "$target"
    info "Slash command global: /${filename%.md} → brain-tools"
  done
}

# ── Symlinks por projeto (CLAUDE.md, AGENTS.md, skills) ──────────────────────
# Tudo aqui vem do repo de dados (privado).
configure_projects() {
  local CONF="$DATA_DIR/projects/projects.conf"
  local EXAMPLE="$DATA_DIR/projects/projects.conf.example"

  if [[ ! -f "$CONF" ]]; then
    warn "$CONF não encontrado — symlinks de projeto pulados"
    [[ -f "$EXAMPLE" ]] && warn "Copie o exemplo: cp $EXAMPLE $CONF && nano $CONF"
    return
  fi

  while IFS='=' read -r project local_path || [[ -n "$project" ]]; do
    [[ -z "$project" || "$project" == \#* ]] && continue
    [[ ! -d "$local_path" ]] && { warn "$local_path não existe — pulando $project"; continue; }

    # ── CLAUDE.md ──
    local brain_claude="$DATA_DIR/projects/$project/CLAUDE.md"
    local target_claude="$local_path/CLAUDE.md"
    if [[ -f "$brain_claude" ]]; then
      if [[ ! ( -L "$target_claude" && "$(readlink "$target_claude")" == "$brain_claude" ) ]]; then
        [[ -f "$target_claude" && ! -L "$target_claude" ]] && cp "$target_claude" "$target_claude.bak"
        ln -sf "$brain_claude" "$target_claude"
        info "Symlink: $project/CLAUDE.md → brain-data"
      else
        warn "$project/CLAUDE.md já linkado — pulando"
      fi
    fi

    # ── AGENTS.md ──
    local brain_agents="$DATA_DIR/projects/$project/AGENTS.md"
    local target_agents="$local_path/AGENTS.md"
    if [[ -f "$brain_agents" ]]; then
      if [[ ! ( -L "$target_agents" && "$(readlink "$target_agents")" == "$brain_agents" ) ]]; then
        [[ -f "$target_agents" && ! -L "$target_agents" ]] && cp "$target_agents" "$target_agents.bak"
        ln -sf "$brain_agents" "$target_agents"
        info "Symlink: $project/AGENTS.md → brain-data"
      else
        warn "$project/AGENTS.md já linkado — pulando"
      fi
    fi

    # ── Skills (.claude/skills/) ──
    local brain_skills_dir="$DATA_DIR/ai/skills/$project"
    local project_skills_dir="$local_path/.claude/skills"
    if [[ -d "$brain_skills_dir" && -d "$project_skills_dir" ]]; then
      for brain_skill in "$brain_skills_dir"/*.md; do
        [[ -f "$brain_skill" ]] || continue
        local skillname skill_dir target_skill
        skillname="$(basename "$brain_skill" .md)"
        skill_dir="$project_skills_dir/$skillname"
        target_skill="$skill_dir/SKILL.md"
        [[ ! -d "$skill_dir" ]] && continue
        if [[ ! ( -L "$target_skill" && "$(readlink "$target_skill")" == "$brain_skill" ) ]]; then
          [[ -f "$target_skill" && ! -L "$target_skill" ]] && cp "$target_skill" "$target_skill.bak"
          ln -sf "$brain_skill" "$target_skill"
          info "Skill: $project/$skillname → brain-data"
        fi
      done
    fi

  done < "$CONF"
}

# ── Shell alias (sincroniza os dois repos) ────────────────────────────────────
setup_alias() {
  local ALIAS_LINE="alias brain-sync=\"for d in $TOOLS_DIR $DATA_DIR; do (cd \\\"\$d\\\" && git pull && git add -A && (git diff --cached --quiet || git commit -m \\\"sync: \$(date +%Y-%m-%d)\\\") && git push); done && echo 'brain sincronizado'\""

  local SHELL_RC=""
  case "$SHELL" in
    */zsh)  SHELL_RC="$HOME/.zshrc" ;;
    */bash) SHELL_RC="$HOME/.bashrc" ;;
    *) warn "Shell não detectado — adicione o alias manualmente"; return ;;
  esac

  grep -q "brain-sync" "$SHELL_RC" 2>/dev/null && { warn "Alias brain-sync já existe"; return; }
  { echo ""; echo "# brain sync (tools + data)"; echo "$ALIAS_LINE"; } >> "$SHELL_RC"
  info "Alias brain-sync adicionado em $SHELL_RC"
  info "Rode: source $SHELL_RC"
}

# ── Executa tudo ──────────────────────────────────────────────────────────────
info "Configurando Claude Code..."
configure_claude_code

info "Configurando Codex..."
configure_codex

info "Configurando CLAUDE.md global..."
configure_global_claude_md

info "Configurando slash commands globais..."
configure_global_commands

info "Configurando projetos (CLAUDE.md + AGENTS.md + skills)..."
configure_projects

info "Configurando alias..."
setup_alias

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  brain configurado!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  brain-tools (público): $TOOLS_DIR"
echo "  brain-data  (privado): $DATA_DIR"
echo "  MCP:                   $([ "$USE_DOCKER" == true ] && echo "Docker" || echo "Node direto")"
echo ""
echo "  Configurado:"
echo "  ✓ Claude Code MCP (~/.claude.json)"
echo "  ✓ Codex MCP (~/.codex/config.toml)"
echo "  ✓ ~/.claude/CLAUDE.md (global, do data)"
echo "  ✓ ~/.claude/commands/ (slash commands globais, do tools)"
echo "  ✓ CLAUDE.md + AGENTS.md + skills por projeto (do data)"
echo "  ✓ Alias brain-sync (atualiza ambos os repos)"
echo ""
echo "  Próximos passos:"
echo "  1. source ~/.zshrc"
echo "  2. Reinicie Claude Code e Codex"
echo "  3. Teste: 'qual o contexto do projeto X?'"
echo ""
