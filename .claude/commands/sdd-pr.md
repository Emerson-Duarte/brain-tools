---
description: Fase 3 passos 11+12 — cria PR no GitHub + move card "Em revisão".
argument-hint: "[--slug=<slug>]"
---

# /sdd-pr — Criar PR + mover card

Responsabilidade única: **abrir PR conforme convenções do projeto e atualizar Jira pra "Em revisão"**.

> **Multi-project:** N PRs (um por projeto em `state.projects[]`). Body de cada PR inclui cross-links pros outros + ordem de merge. Após criar todos, edita cada PR body pra completar links (depende dos números dos outros). Veja `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-multi-project.md`.

> **Tools usadas:** referencie `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/sdd-tools.md` pra catálogo (built-in, MCP brain/Atlassian/github, sub-agents Explore/Plan/general-purpose, slash commands).

## 🛂 Pré-requisitos

- `_state.md` existe
- `state.gates.review` = `passed` (ou `skipped` com aprovador)
- `state.gates.verify` ∈ {`passed`, `skipped`} (se task mudou UI — caso contrário pode pular)
- `state.branch` aponta pra branch atual
- Branch já pushed (`git ls-remote --heads origin <branch>`)

Se branch não pushed → `git push -u origin <branch>` antes (perguntar primeiro).

## 📥 Carregamento de contexto

Siga `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/_load-project-context.md`. Carregue **PR profile**:

- `pr-conventions.md` (template, labels, reviewers default)
- `commands.md` (gates → checklist do PR)
- `observability.md` (se task tocou telemetria)

Se `pr-conventions.md` não existe → **lacuna**. Pergunte ao usuário e ofereça salvar.

## ⚙️ Execução

### 1. Carregue skill base

Carregue `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/pr-create-sdd.md` (Read) — define o protocolo.

**Contrato rígido (NUNCA burle):**
- Template PR vem de `pr-conventions.md` do projeto — não invente
- Linkar SDD no body: `state.spec_path`
- AC do `state.ac` viram checklist no body
- Reviewers default vêm de `pr-conventions.md`

### 2. Construir título e body

Título: extrair do SDD seção 1 + prefixo de tipo (feat/fix/refactor) + jira key se houver.
Ex: `feat(VKAP-1234): login com Apple ID`

Body conforme template do `pr-conventions.md`. Incluir:
- Link pro SDD
- Lista de AC como checklist
- Resumo de mudanças (extraído do `git diff --stat`)
- Test plan (extraído da seção 7 do SDD)
- Link pro card Jira

### 3. Criar PR via gh CLI

```bash
gh pr create \
  --title "<titulo>" \
  --body-file <tmp-body.md> \
  --base main \
  --head <state.branch> \
  --reviewer <reviewers>
```

Confirme com usuário antes de submeter.

### 4. Mover card Jira → "Em revisão"

Carregue `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/jira-card-move.md`. Use destino `in_review`. Adicione PR url como comentário no card via `mcp__claude_ai_Atlassian__addCommentToJiraIssue`.

## 💾 Persistência

```yaml
artifacts:
  pr_url: https://github.com/<owner>/<repo>/pull/N
  pr_number: N
steps:
  - id: pr
    status: completed
    timestamp: <iso now>
last_step: pr
last_run: <iso now>
```

## 🚦 Saída

```
✅ /sdd-pr concluído

PR: <url>
Card Jira: <key> → Em revisão
Reviewers: <list>

📍 Próximo: /sdd-watch --slug=<slug>
```

## 🚫 Fora de escopo

- ❌ Mergear (= `/sdd-merge`)
- ❌ Babysit CI/feedback (= `/sdd-watch`)
- ❌ Codar / re-revisar
