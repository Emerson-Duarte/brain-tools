---
name: worktree
description: |
  Cria git worktrees com symlinks dos arquivos/pastas ignorados pelo gitignore
  (node_modules, .env*, config/master.key, storage/, uploads/) apontando pro
  checkout principal — worktree nasce pronta pra usar, sem reinstalar nada.
  Caches de build e logs (tmp, log, .next, dist, coverage...) NÃO são
  compartilhados. Use quando o usuário mencionar: "nova worktree", "criar
  worktree", "worktree pra task", "worktree com symlink", "remover worktree",
  "relink worktree", ou pedir pra trabalhar numa task em worktree separada.
tools: Bash, Read
---

# worktree — worktrees prontas pra usar

Script: `~/.claude/skills/worktree/scripts/worktree.sh` (rodar de dentro do repo alvo).

## Comandos

```bash
# criar (branch nova ou existente)
cd /Users/dev/www/vakinha/<repo>
~/.claude/skills/worktree/scripts/worktree.sh add <branch> [base]

# remover (desfaz symlinks, depois git worktree remove)
~/.claude/skills/worktree/scripts/worktree.sh remove <branch|path>

# recriar symlinks numa worktree existente (ex.: .env novo no checkout principal)
~/.claude/skills/worktree/scripts/worktree.sh relink [path]

# listar
~/.claude/skills/worktree/scripts/worktree.sh list
```

## Comportamento

- **Localização:** `<pai-do-repo>/.worktrees/<repo>/<branch-slug>` — ex.:
  `worktree.sh add task/VK25-1234/fix-pix` no vakinha-api cria
  `/Users/dev/www/vakinha/.worktrees/vakinha-api/task-VK25-1234-fix-pix`.
- **Base default** (branch nova, sem base explícita): `develop` → `main` → `master` → HEAD.
- **Symlinks:** tudo que o gitignore ignora e existe no checkout principal,
  EXCETO caches/artefatos que não podem ser compartilhados entre worktrees:
  `tmp log logs coverage dist build out .next .turbo .expo .cache
  .parcel-cache .gradle DerivedData Pods *.log *.pid .DS_Store`.
- **Skip extra por repo:** globs (um por linha) em `.git/info/worktree-skip`.
- **Pattern dir-only** (ex.: `/public/uploads/`): symlink não casa com o pattern,
  então o script cria dir real e linka os filhos. Filhos novos criados depois no
  checkout principal não aparecem — rodar `relink` se precisar.
- **Untracked não-ignorado** (ex.: `config/application.yml` no vakinha-api que
  ficou fora do gitignore): NÃO é linkado — o script lista no fim como warning.
  Se o app precisar, copiar manualmente (ou corrigir o gitignore no main).
- Branch já existente → só faz checkout na worktree (não recria).
- `remove` sem `--force`: se sobrar trabalho não commitado real, o git recusa —
  é proteção, não bug. Só sugerir `git worktree remove --force` com confirmação
  explícita do usuário.

## Fluxo quando o usuário pedir worktree nova

1. `cd` no repo alvo (nunca no workspace raiz — ele não é repo git).
2. Se a branch é nova e baseada em develop/master, conferir se a base local
   está atualizada (`git fetch` + comparar com origin); avisar se estiver atrás.
3. Rodar `worktree.sh add <branch> [base]`.
4. Reportar o path final e o resumo dos symlinks. Nada mais — worktree sai pronta.

## Caveats (avisar quando relevante)

- `node_modules` é **compartilhado** via symlink. Se a branch mudar
  `package.json`/lockfile, trocar o link por instalação real na worktree:
  `rm node_modules && npm install` (ou yarn). Mesmo raciocínio pra
  `Gemfile` + `vendor/bundle` em Rails.
- Dois dev servers simultâneos (main + worktree) funcionam porque caches de
  build ficam fora do compartilhamento — mas portas colidem (3000/3001),
  então subir com porta alternativa.
- React Native/Metro pode reclamar de `node_modules` symlinkado
  (resolução via realpath). No vakinha-app, se o Metro falhar, usar
  instalação real em vez do link.
- iOS `Pods/` fica no skip (Xcode + symlink = problema); rodar
  `pod install` na worktree se for buildar iOS.
