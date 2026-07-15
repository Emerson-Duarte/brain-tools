#!/usr/bin/env bash
# =============================================================================
# environment-bootstrap.sh
#
# Setup do brain pro Claude Code remote execution environment (claude.ai/code).
# Roda no container ephemeral toda vez que uma sessão inicia.
#
# Arquitetura: dois repos separados
#   - brain-tools  (público) — servidor MCP + skills/behaviors/prompts agnósticos
#   - brain-data   (privado) — projects, prds, knowledge, settings/CLAUDE.md (seu)
#
# Foca em:
#   - Clonar ambos os repos (idempotente)
#   - Build do MCP server (no brain-tools)
#   - Registrar MCP em ~/.claude.json com os dois paths
#   - Symlinks globais (~/.claude/CLAUDE.md vindo do data, ~/.claude/commands/ vindo do tools)
#   - Git config global (email + nome)
#
# Uso (one-liner pro setup script do environment):
#   curl -fsSL https://raw.githubusercontent.com/Emerson-Duarte/brain-tools/main/scripts/environment-bootstrap.sh \
#     | TOOLS_REPO_URL="https://github.com/Emerson-Duarte/brain-tools.git" \
#       DATA_REPO_URL="https://github.com/Emerson-Duarte/brain.git" \
#       GIT_EMAIL="pduarte.emerson@gmail.com" \
#       GIT_NAME="Emerson Duarte" \
#       bash
#
# Variáveis de ambiente (todas opcionais com defaults):
#   TOOLS_REPO_URL  URL do repo público (default: https://github.com/Emerson-Duarte/brain-tools.git)
#   DATA_REPO_URL   URL do repo privado (default: https://github.com/Emerson-Duarte/brain.git)
#   TOOLS_DIR       Onde clonar o público (default: $HOME/.brain-tools)
#   DATA_DIR        Onde clonar o privado (default: $HOME/.brain-data)
#   TOOLS_BRANCH    Branch do público (default: main)
#   DATA_BRANCH     Branch do privado (default: main)
#   GIT_EMAIL       Email global pro git config (default: pduarte.emerson@gmail.com)
#   GIT_NAME        Nome global pro git config (default: Emerson Duarte)
# =============================================================================
set -euo pipefail

# ── Configuração ─────────────────────────────────────────────────────────────
TOOLS_REPO_URL="${TOOLS_REPO_URL:-https://github.com/Emerson-Duarte/brain-tools.git}"
DATA_REPO_URL="${DATA_REPO_URL:-https://github.com/Emerson-Duarte/brain.git}"
TOOLS_DIR="${TOOLS_DIR:-$HOME/.brain-tools}"
DATA_DIR="${DATA_DIR:-$HOME/.brain-data}"
TOOLS_BRANCH="${TOOLS_BRANCH:-main}"
DATA_BRANCH="${DATA_BRANCH:-main}"
GIT_EMAIL="${GIT_EMAIL:-pduarte.emerson@gmail.com}"
GIT_NAME="${GIT_NAME:-Emerson Duarte}"

# ── Logging ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[brain-bootstrap]${NC} $*"; }
warn()  { echo -e "${YELLOW}[brain-bootstrap]${NC} $*"; }
error() { echo -e "${RED}[brain-bootstrap]${NC} $*" >&2; exit 1; }

info "TOOLS_DIR=$TOOLS_DIR  DATA_DIR=$DATA_DIR"

# ── Checagem de dependências ──────────────────────────────────────────────────
check_dep() { command -v "$1" >/dev/null 2>&1 || error "'$1' não encontrado no PATH"; }
check_dep git
check_dep node
check_dep npm
check_dep python3

# ── Clone / pull idempotente ──────────────────────────────────────────────────
sync_repo() {
  local name="$1" dir="$2" url="$3" branch="$4"
  if [[ -d "$dir/.git" ]]; then
    info "$name já existe em $dir — atualizando (branch=$branch)..."
    git -C "$dir" fetch origin "$branch" --quiet
    git -C "$dir" checkout "$branch" --quiet
    git -C "$dir" pull --ff-only --quiet || warn "pull falhou em $name — seguindo com versão local"
  else
    info "Clonando $name de $url → $dir..."
    git clone --branch "$branch" --depth 50 "$url" "$dir" --quiet
  fi
}

sync_repo "brain-tools" "$TOOLS_DIR" "$TOOLS_REPO_URL" "$TOOLS_BRANCH"
sync_repo "brain-data"  "$DATA_DIR"  "$DATA_REPO_URL"  "$DATA_BRANCH"

MCP_DIR="$TOOLS_DIR/mcp"
[[ -d "$MCP_DIR" ]] || error "MCP dir não encontrado em $MCP_DIR"

# ── Build do MCP (idempotente — só rebuilda se dist/ é mais velho que src/) ──
needs_build=true
if [[ -d "$MCP_DIR/dist" && -f "$MCP_DIR/dist/index.js" ]]; then
  newest_src=$(find "$MCP_DIR/src" -type f -newer "$MCP_DIR/dist/index.js" 2>/dev/null | head -1 || true)
  if [[ -z "$newest_src" ]]; then
    needs_build=false
    info "MCP build atualizado — pulando rebuild"
  fi
fi

if [[ "$needs_build" == true ]]; then
  info "Instalando dependências do MCP..."
  npm --prefix "$MCP_DIR" ci --silent
  info "Compilando TypeScript..."
  npm --prefix "$MCP_DIR" run build --silent
fi

# ── Registra brain MCP em ~/.claude.json ──────────────────────────────────────
register_mcp() {
  local CLAUDE_JSON="$HOME/.claude.json"

  if [[ ! -f "$CLAUDE_JSON" ]]; then
    echo '{}' > "$CLAUDE_JSON"
    info "Criado ~/.claude.json (esqueleto)"
  fi

  python3 - <<PYEOF
import json, sys
path = "$CLAUDE_JSON"
mcp_dir = "$MCP_DIR"
tools_dir = "$TOOLS_DIR"
data_dir = "$DATA_DIR"

with open(path) as f:
    try:
        cfg = json.load(f)
    except json.JSONDecodeError:
        cfg = {}

cfg.setdefault("mcpServers", {})
existing = cfg["mcpServers"].get("brain")
expected = {
    "command": "node",
    "args": [f"{mcp_dir}/dist/index.js"],
    "env": {
        "BRAIN_TOOLS_PATH": tools_dir,
        "BRAIN_DATA_PATH":  data_dir,
    },
}
if existing == expected:
    print("[brain-bootstrap] brain MCP já registrado em ~/.claude.json — sem mudança")
    sys.exit(0)

cfg["mcpServers"]["brain"] = expected
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("[brain-bootstrap] brain MCP registrado em ~/.claude.json")
PYEOF
}
register_mcp

# ── Symlink ~/.claude/CLAUDE.md → brain-data (privado, contém o mapa do usuário) ──
GLOBAL_MD_SRC="$DATA_DIR/ai/settings/CLAUDE.md"
GLOBAL_MD_DST="$HOME/.claude/CLAUDE.md"

if [[ -f "$GLOBAL_MD_SRC" ]]; then
  mkdir -p "$HOME/.claude"
  if [[ -L "$GLOBAL_MD_DST" && "$(readlink "$GLOBAL_MD_DST")" == "$GLOBAL_MD_SRC" ]]; then
    info "Symlink ~/.claude/CLAUDE.md já correto — pulando"
  else
    [[ -f "$GLOBAL_MD_DST" && ! -L "$GLOBAL_MD_DST" ]] && \
      cp "$GLOBAL_MD_DST" "$GLOBAL_MD_DST.bak" && \
      warn "Backup: $GLOBAL_MD_DST.bak"
    ln -sf "$GLOBAL_MD_SRC" "$GLOBAL_MD_DST"
    info "Symlink criado: ~/.claude/CLAUDE.md → brain-data/ai/settings/CLAUDE.md"
  fi
else
  warn "CLAUDE.md global não encontrado em $GLOBAL_MD_SRC — pulando"
fi

# ── Symlinks de slash commands globais (vêm do repo público) ─────────────────
COMMANDS_SRC_DIR="$TOOLS_DIR/.claude/commands"
COMMANDS_DST_DIR="$HOME/.claude/commands"

if [[ -d "$COMMANDS_SRC_DIR" ]]; then
  mkdir -p "$COMMANDS_DST_DIR"
  for src_file in "$COMMANDS_SRC_DIR"/*.md; do
    [[ -f "$src_file" ]] || continue
    filename="$(basename "$src_file")"
    dst_file="$COMMANDS_DST_DIR/$filename"

    if [[ -L "$dst_file" && "$(readlink "$dst_file")" == "$src_file" ]]; then
      continue
    fi

    [[ -f "$dst_file" && ! -L "$dst_file" ]] && \
      cp "$dst_file" "$dst_file.bak" && \
      warn "Backup: $dst_file.bak"
    ln -sf "$src_file" "$dst_file"
    info "Slash command global: /${filename%.md} → brain-tools"
  done
else
  warn "$COMMANDS_SRC_DIR não encontrado — pulando slash commands"
fi

# ── Symlink de skills locais que exigem path fixo em ~/.claude/skills ─────────
# Ex.: worktree — a SKILL.md referencia ~/.claude/skills/worktree/scripts/worktree.sh.
SKILLS_DST_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DST_DIR"
for skill in worktree; do
  skill_src="$TOOLS_DIR/ai/skills/_global/$skill"
  skill_dst="$SKILLS_DST_DIR/$skill"
  [[ -d "$skill_src" ]] || continue
  if [[ -L "$skill_dst" && "$(readlink "$skill_dst")" == "$skill_src" ]]; then
    continue
  fi
  if [[ -e "$skill_dst" && ! -L "$skill_dst" ]]; then
    warn "~/.claude/skills/$skill existe e não é symlink — pulando"
    continue
  fi
  ln -sfn "$skill_src" "$skill_dst"
  info "Skill local: ~/.claude/skills/$skill → brain-tools"
done

# ── Symlinks CLAUDE.md/AGENTS.md por projeto (vêm do brain-data/projects) ─────
# Mapeamento projeto→path local em brain-data/projects/projects.conf (por-máquina,
# não versionado). Cada máquina tem o seu — por isso estes symlinks são recriados
# no bootstrap em vez de commitados.
PROJECTS_CONF="$DATA_DIR/projects/projects.conf"
if [[ -f "$PROJECTS_CONF" ]]; then
  while IFS='=' read -r _proj _ppath; do
    _proj="${_proj:-}"; _ppath="${_ppath:-}"
    # trim whitespace (pure bash, sem depender de xargs)
    _proj="${_proj#"${_proj%%[![:space:]]*}"}"; _proj="${_proj%"${_proj##*[![:space:]]}"}"
    _ppath="${_ppath#"${_ppath%%[![:space:]]*}"}"; _ppath="${_ppath%"${_ppath##*[![:space:]]}"}"
    [[ -z "$_proj" || "$_proj" == \#* ]] && continue
    [[ -d "$_ppath" ]] || { warn "projeto $_proj: $_ppath não existe — pulando"; continue; }
    for pf in CLAUDE.md AGENTS.md; do
      pf_src="$DATA_DIR/projects/$_proj/$pf"
      pf_dst="$_ppath/$pf"
      [[ -f "$pf_src" ]] || continue
      if [[ -L "$pf_dst" && "$(readlink "$pf_dst")" == "$pf_src" ]]; then
        continue
      fi
      if [[ -e "$pf_dst" && ! -L "$pf_dst" ]]; then
        warn "$pf_dst existe e não é symlink — pulando"
        continue
      fi
      ln -sf "$pf_src" "$pf_dst"
      info "Projeto $_proj: $pf → brain-data/projects/$_proj/$pf"
    done
  done < "$PROJECTS_CONF"
else
  warn "projects.conf não encontrado ($PROJECTS_CONF) — pulando symlinks de projeto (copie projects.conf.example e ajuste os paths)"
fi

# ── Git config global ─────────────────────────────────────────────────────────
current_email="$(git config --global user.email || echo '')"
current_name="$(git config --global user.name || echo '')"

if [[ "$current_email" != "$GIT_EMAIL" ]]; then
  git config --global user.email "$GIT_EMAIL"
  info "git user.email global: $GIT_EMAIL"
else
  info "git user.email já correto: $GIT_EMAIL"
fi

if [[ "$current_name" != "$GIT_NAME" ]]; then
  git config --global user.name "$GIT_NAME"
  info "git user.name global: $GIT_NAME"
else
  info "git user.name já correto: $GIT_NAME"
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  brain bootstrap concluído${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  brain-tools (público): $TOOLS_DIR (branch: $TOOLS_BRANCH)"
echo "  brain-data  (privado): $DATA_DIR (branch: $DATA_BRANCH)"
echo "  MCP dist:              $MCP_DIR/dist/index.js"
echo ""
echo "  Configurado nesta sessão:"
echo "  ✓ Brain MCP registrado em ~/.claude.json (2 paths)"
echo "  ✓ ~/.claude/CLAUDE.md (global, do repo de dados)"
echo "  ✓ ~/.claude/commands/ (slash commands globais, do repo público)"
echo "  ✓ ~/.claude/skills/worktree (skill worktree, do repo público)"
echo "  ✓ CLAUDE.md/AGENTS.md por projeto (do brain-data, via projects.conf)"
echo "  ✓ Git identity global: $GIT_NAME <$GIT_EMAIL>"
echo ""
echo "  Slash commands disponíveis:"
for f in "$COMMANDS_DST_DIR"/*.md; do
  [[ -f "$f" ]] && echo "    /$(basename "$f" .md)"
done
echo ""
echo "  Pronto pra rodar /sdd-workflow"
echo ""
