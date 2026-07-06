#!/usr/bin/env bash
# worktree.sh — create/remove git worktrees with gitignored files symlinked
# from the main checkout, so the new worktree is immediately usable
# (.env*, node_modules, config/master.key, storage/, uploads/, etc).
#
# Usage:
#   worktree.sh add <branch> [base]     create worktree (+ symlinks)
#   worktree.sh remove <branch|path>    drop symlinks, then git worktree remove
#   worktree.sh relink [path]           (re)create symlinks in existing worktree
#   worktree.sh list                    git worktree list
#
# Run from anywhere inside the repo (main checkout or a worktree).
# Worktrees are created at: <repo-parent>/.worktrees/<repo-name>/<branch-slug>
#
# Build caches and logs are never shared between worktrees. Default skip set:
#   tmp log logs coverage dist build out .next .turbo .expo .cache
#   .parcel-cache .gradle DerivedData Pods .worktrees .DS_Store *.log *.pid
# Extra per-repo skips: one glob per line in .git/info/worktree-skip
# (matched against the full relative path and the basename).

set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) \
  || die "not inside a git repository"
REPO_ROOT=$(dirname "$GIT_COMMON")
REPO_NAME=$(basename "$REPO_ROOT")
WT_BASE_DIR="$(dirname "$REPO_ROOT")/.worktrees/$REPO_NAME"
SKIP_FILE="$GIT_COMMON/info/worktree-skip"

SKIP_SEGMENTS=(tmp log logs coverage dist build out .next .turbo .expo
  .cache .parcel-cache .gradle DerivedData Pods .worktrees .DS_Store)
# generated dirs whose contents are only ignored by an inner .gitignore;
# symlinking them pollutes the worktree's git status
SKIP_GLOBS=('.husky/_' '.husky/_/*' '.yarn/*')

should_skip() {
  local rel="$1" seg pat parts
  IFS='/' read -ra parts <<<"$rel"
  for seg in "${parts[@]}"; do
    for pat in "${SKIP_SEGMENTS[@]}"; do
      [[ "$seg" == "$pat" ]] && return 0
    done
    [[ "$seg" == *.log || "$seg" == *.pid ]] && return 0
  done
  for pat in "${SKIP_GLOBS[@]}"; do
    # shellcheck disable=SC2053
    [[ "$rel" == $pat ]] && return 0
  done
  if [[ -f "$SKIP_FILE" ]]; then
    while IFS= read -r pat; do
      [[ -z "$pat" || "$pat" == \#* ]] && continue
      # shellcheck disable=SC2053  # unquoted RHS is intentional (glob match)
      [[ "$rel" == $pat || "$(basename "$rel")" == $pat ]] && return 0
    done <"$SKIP_FILE"
  fi
  return 1
}

link_ignored() {
  local wt="$1" rel link child linked=0 skipped=0
  while IFS= read -r -d '' rel; do
    rel="${rel%/}"
    [[ -e "$REPO_ROOT/$rel" ]] || continue
    if should_skip "$rel"; then
      skipped=$((skipped + 1))
      continue
    fi
    link="$wt/$rel"
    if [[ -e "$link" || -L "$link" ]]; then
      echo "  keep  $rel (already present in worktree)"
      continue
    fi
    mkdir -p "$(dirname "$link")"
    ln -s "$REPO_ROOT/$rel" "$link"
    if git -C "$wt" check-ignore -q "$rel"; then
      echo "  link  $rel"
      linked=$((linked + 1))
      continue
    fi
    # dir-only ignore pattern (trailing slash) doesn't match a symlink;
    # use a real directory with its children symlinked instead
    rm "$link"
    if [[ -d "$REPO_ROOT/$rel" ]]; then
      mkdir "$link"
      for child in "$REPO_ROOT/$rel"/* "$REPO_ROOT/$rel"/.[!.]*; do
        [[ -e "$child" || -L "$child" ]] || continue
        ln -s "$child" "$link/$(basename "$child")"
      done
      echo "  link  $rel/* (dir-only ignore pattern)"
      linked=$((linked + 1))
    else
      echo "  skip  $rel (would show up as untracked)"
      skipped=$((skipped + 1))
    fi
  done < <(git -C "$REPO_ROOT" ls-files --others --ignored --exclude-standard --directory -z |
    { git -C "$REPO_ROOT" check-ignore -z --stdin || true; })
  echo "symlinked $linked ignored path(s), skipped $skipped (caches/logs)"
}

warn_untracked() {
  local f any=0
  while IFS= read -r f; do
    [[ "$(basename "$f")" == ".DS_Store" ]] && continue
    should_skip "${f%/}" && continue
    if [[ $any -eq 0 ]]; then
      echo
      echo "note: untracked (not gitignored) in the main checkout, NOT linked:"
      any=1
    fi
    echo "  $f"
  done < <(git -C "$REPO_ROOT" ls-files --others --exclude-standard --directory)
  [[ $any -eq 1 ]] && echo "  copy manually if the app needs any of them (e.g. config files)"
  return 0
}

cmd_add() {
  local branch="${1:-}" base="${2:-}" cand slug wt
  [[ -n "$branch" ]] || die "usage: worktree.sh add <branch> [base]"
  slug="${branch//\//-}"
  wt="$WT_BASE_DIR/$slug"
  [[ -e "$wt" ]] && die "worktree path already exists: $wt"
  mkdir -p "$WT_BASE_DIR"

  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$REPO_ROOT" worktree add "$wt" "$branch"
  else
    if [[ -z "$base" ]]; then
      for cand in develop main master; do
        if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$cand"; then
          base="$cand"
          break
        fi
      done
      base="${base:-HEAD}"
    fi
    git -C "$REPO_ROOT" worktree add -b "$branch" "$wt" "$base"
  fi

  echo
  echo "symlinking gitignored files from $REPO_ROOT:"
  link_ignored "$wt"
  warn_untracked
  echo
  echo "worktree ready: $wt"
  echo "  cd $wt"
}

cmd_remove() {
  local target="${1:-}" wt
  [[ -n "$target" ]] || die "usage: worktree.sh remove <branch-or-path>"
  if [[ -d "$target" ]]; then
    wt=$(cd "$target" && pwd)
  else
    wt="$WT_BASE_DIR/${target//\//-}"
  fi
  [[ -d "$wt" ]] || die "worktree not found: $wt"
  [[ "$wt" != "$REPO_ROOT" ]] || die "refusing to remove the main checkout"

  # drop only symlinks that point into the main checkout; anything else stays
  # so `git worktree remove` can still refuse on real uncommitted work
  find "$wt" -name .git -prune -o -type l -print0 | while IFS= read -r -d '' l; do
    case "$(readlink "$l")" in
      "$REPO_ROOT"/*) rm "$l" ;;
    esac
  done
  git -C "$REPO_ROOT" worktree remove "$wt"
  echo "removed: $wt"
}

cmd_relink() {
  local wt="${1:-}"
  if [[ -z "$wt" ]]; then
    wt=$(git rev-parse --show-toplevel)
  fi
  wt=$(cd "$wt" && pwd)
  [[ "$wt" != "$REPO_ROOT" ]] || die "relink targets a worktree, not the main checkout"
  link_ignored "$wt"
}

case "${1:-}" in
  add)       shift; cmd_add "$@" ;;
  remove|rm) shift; cmd_remove "$@" ;;
  relink)    shift; cmd_relink "$@" ;;
  list|ls)   git -C "$REPO_ROOT" worktree list ;;
  *)         sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
