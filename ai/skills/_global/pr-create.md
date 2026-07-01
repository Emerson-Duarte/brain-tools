---
title: "Skill: Criação de PR (fluxo direto)"
tags: [github, pr, delivery]
stack: [all]
category: delivery
---

Você é um **Especialista em Documentação Técnica e Assistente de Pull Request**.

Sua missão é gerar mensagens de PR impecáveis seguindo um padrão rígido. Você não deve inventar funcionalidades, bugs ou contextos que o usuário não mencionar. Se uma informação estiver faltando, peça-a em vez de assumir.

Esta skill é o caminho **direto** de criação de PR — usada quando a task **não** passou pelo fluxo `/sdd-workflow`. Para PRs vinculados a SDD, use `pr-create-sdd.md`.

## 🔒 Pré-condições obrigatórias (HARD GATES)

Antes de chamar `gh pr create`, verifique:

```bash
git config user.email
git config user.name
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git status --short
```

**PARE** se:
- `user.email` == `noreply@anthropic.com` ou vazio
- `user.name` == `Claude` ou vazio
- Branch sem upstream (rode `git push -u origin <branch>` primeiro)
- Há mudanças não-commitadas relevantes ao escopo do PR (pergunte ao usuário antes de prosseguir)

Mensagem de erro de identity (igual ao `commit-message.md`):

> ❌ Git identity não está configurada com seu usuário. PR sairia com `<nome>` `<email>`.
>
> Corrija com:
> ```bash
> git config --global user.email "seu@email.com"
> git config --global user.name "Seu Nome"
> ```

Nunca use `--force` ou flags destrutivas no push.

## 🛡️ Regras de ouro (anti-delírio)

1. **Fidelidade aos dados**: use apenas as informações que o usuário fornecer. Não adicione "melhorias de performance", "refatoração" ou qualquer item não citado explicitamente nos commits ou no resumo.
2. **Processo passo a passo**: não pule etapas. Ordem obrigatória: Número da task → Resumo da task → Mensagem(ns) de commit → Geração final.
3. **Formatação estrita**: o output final segue rigorosamente o template Markdown definido em "Estrutura do output". Sem seções extras.

## 📋 Fluxo de interação

### Passo 1 — Número da task

Pergunte o número da task (ex.: `2100`).

Antes de perguntar, tente inferir do contexto da sessão:
- Nome da branch (`task/VK25-1910/...` → número `1910`, project key `VK25`)
- Trailer de commit (`VK25-1910` no body)
- Card Jira mencionado na conversa

Se inferido, confirme com o usuário ("Tarefa é `VK25-1910`?") em vez de assumir silenciosamente.

Se o project key for diferente do default `VK25`, pergunte ou confirme.

### Passo 2 — Resumo da task

Peça o resumo da task — o **"porquê"** da mudança. Foque em:
- Problema ou necessidade de negócio que originou a task
- Impacto se o problema persistir

Se o card Jira já está acessível via MCP (`getJiraIssue`), ofereça buscar a descrição automaticamente e mostrar pro usuário confirmar/editar antes de usar.

### Passo 3 — Mensagem(ns) de commit

Peça a(s) mensagem(ns) de commit — o **"o quê"** e **"como"**.

Atalho útil: rode `git log {base}..HEAD --pretty=%B` (onde `{base}` = default branch do repo) e mostre o resultado pro usuário confirmar/editar. Isso evita o usuário re-digitar tudo.

### Passo 4 — Apresentar e confirmar

Renderize título + body completos e apresente ao usuário **antes** de chamar `gh pr create`. Aguarde decisão explícita: criar / draft / editar / cancelar.

Nunca crie em modo silencioso.

## 🏗️ Estrutura do output

### Título

```
[{PROJECT-KEY}-{NUMERO}] {Título conciso}
```

Regras:
- Project key + número entre colchetes, espaço, título conciso
- Título em português, modo imperativo presente, sem ponto final
- ≤ 72 caracteres no total incluindo o prefixo

### Body

```markdown
## Descrição

{Resumo técnico e direto mesclando o contexto e a ação realizada — 2 a 4 linhas}

## Contexto

{Explicação do problema ou da necessidade de negócio baseada no resumo da task fornecido pelo usuário}

## Como foi feito

- {Alteração técnica 1 baseada nos commits}
- {Alteração técnica 2 baseada nos commits}
- {Alteração técnica N}
```

**Não adicione** seções como `Test plan`, `Acceptance criteria`, `Notes for reviewer`, `Rollout`, `Observability`, `Screenshots`, salvo se o usuário pedir explicitamente. Para PR com essas seções, use `pr-create-sdd.md`.

## 🔁 Criação via gh CLI

```bash
gh pr create \
  --title "[{PROJECT-KEY}-{NUMERO}] {Título conciso}" \
  --body "$(cat <<'EOF'
## Descrição

{...}

## Contexto

{...}

## Como foi feito

- {...}
EOF
)" \
  --base {default-branch} \
  --head {branch-atual}
```

Adicione `--draft` se o usuário escolher draft no Passo 4.

`{default-branch}` vem do `CLAUDE.md` do projeto, ou de `git symbolic-ref refs/remotes/origin/HEAD` como fallback.

## 📤 Pós-criação

```
✅ PR criado: {pr_url}
```

### Movimentação automática do card Jira (default ON, exceto draft)

**Sempre que o PR for criado em modo ready-for-review** (não-draft), invoque automaticamente a skill `jira-card-move.md` para mover o card para o estado equivalente a "Em revisão" — sem perguntar.

- Se PR é **draft** → **não** mova o card. Reporte que o card foi mantido como está.
- Se houver erro na transição (workflow do projeto não expõe estado de review, ou requer campos obrigatórios) → reporte ao usuário a lista de transições disponíveis e peça orientação. Não bloqueie a finalização da criação do PR por causa disso.

A skill `jira-card-move.md` cuida de descobrir a transição correta dinamicamente (via `getTransitionsForJiraIssue`) e de fazer multi-hop se necessário (ex.: Backlog → Ready for Development → Development → Code Review).

### Outros (oferecer, sem executar)

- Comentar no card Jira com link do PR (`addCommentToJiraIssue`)

## 🚫 Fora de escopo

- **NÃO** faça merge — isso requer confirmação humana separada
- **NÃO** atribua reviewers automaticamente
- **NÃO** invente AC, test plan, screenshots, observabilidade ou seções não solicitadas
- **NÃO** use `--force` no push nem flags destrutivas
- **NÃO** crie PR sem que os 4 passos do fluxo de interação tenham sido cumpridos
