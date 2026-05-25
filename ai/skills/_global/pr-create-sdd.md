---
title: "Skill: Criação de PR vinculado ao SDD"
tags: [github, pr, sdd, delivery]
stack: [all]
category: delivery
---

Você é um **Specialist em criação de PRs** vinculados ao SDD da task.

Esta skill alimenta o passo 11 do workflow SDD (`/sdd-workflow`). Roda **depois** do self-review (passo 9) e validação manual (passo 10).

**Esta skill é agnóstica de projeto.** Gates, plataformas, providers de observabilidade e convenções de PR vêm do brain.

## 🔒 Pré-condições obrigatórias (HARD GATES)

**Não chame `mcp__github__create_pull_request` sem TODAS estas verificações verdes:**

- [ ] **SDD existe** em `docs/plan-<slug>-YYYY-MM-DD.md` (se não existe → pare e instrua o usuário a rodar passo 4 antes)
- [ ] **AC do SDD** estão identificados (passos 3 + 4) — sem AC = PR sem checklist
- [ ] **Card Jira** linkado (se a task tem card — passo 6)
- [ ] **Self-review (passo 9) passou** — gates do `commands.md` verdes
- [ ] **Validação manual (passo 10)** confirmada pelo usuário se a task mudou UI
- [ ] **Branch pushed** pro remote (`git push -u origin <branch>`)
- [ ] **Git identity correta** (`git config user.email` ≠ `noreply@anthropic.com`)
- [ ] **Template do repo lido** (`.github/pull_request_template.md`) se existir, ou `pr-conventions.md` do projeto
- [ ] **Body do PR confirmado** com o usuário antes do create (não crie em modo silencioso)

Se qualquer item falhar, **pare e reporte qual** — não tente "aproximar" criando PR genérico. PRs genéricos sem link pro SDD e AC foram observados em sessões anteriores e devem ser bloqueados aqui.

## 🎯 Objetivo

Criar um PR no GitHub que:
1. Reflete fielmente o escopo do SDD
2. Linka pro SDD em `docs/` e pro card Jira
3. Tem AC do SDD como checklist no body
4. Tem plano de teste claro pro reviewer
5. Segue convenção do brain (`/Users/dev/www/vakinha/brain-tools/ai/skills/_global/commit-message.md`)

## 📥 Carregamento de contexto

Siga o protocolo em `$BRAIN_TOOLS_PATH/ai/skills/_global/_load-project-context.md` (default: `/Users/dev/www/vakinha/brain-tools/...`):
1. `get_project_context` → trate como índice (markdown)
2. Carregue via `Read` os tópicos relevantes pra criar PR:
   - `commands.md` → gates de qualidade (seção "Gates automáticos" do body)
   - `pr-conventions.md` → template path, reviewers default, labels convention
   - `observability.md` → providers (seção condicional de observabilidade)
   - `rollout.md` → feature flags / deploy strategy (seção condicional de rollout)
   - `CLAUDE.md` (índice) → repo url, default branch, plataformas suportadas
3. Verifique se o repo tem template físico: `.github/pull_request_template.md` (use Bash `ls`)
4. `get_behavior` com context="pr creation"
5. `search_skills` com query="commit message" — pra título

Tópicos críticos ausentes do índice? Pergunte e ofereça salvar no arquivo de tópico correto (feedback loop).

## 📋 Pré-requisitos

Antes de criar o PR, valide:
- [ ] Branch local tem commits (não está vazia)
- [ ] Self-review (passo 9) passou — gates do `commands.md` todos verdes
- [ ] Validação manual (passo 10) passou — AC checados
- [ ] Há um SDD em `docs/plan-<slug>-YYYY-MM-DD.md`
- [ ] Branch foi pushed pro remote

Se algum item falhar, **pare e reporte** antes de criar o PR.

## 🔁 Processo obrigatório

### 1. Coletar metadados

```bash
git branch --show-current
git log {base}..HEAD --oneline
git diff {base}...HEAD --stat
```

Onde `{base}` = default branch do projeto (informado no `CLAUDE.md` ou via `git symbolic-ref refs/remotes/origin/HEAD`).

Do contexto do workflow: path do SDD, card Jira (key + URL), AC definidos.

### 2. Push do branch (se necessário)
```bash
git push -u origin <branch-name>
```

Em falha de rede, retry com backoff exponencial (2s, 4s, 8s, 16s — máximo 4 tentativas).

### 3. Gerar título do PR
Use a skill `/Users/dev/www/vakinha/brain-tools/ai/skills/_global/commit-message.md` — formato Conventional Commits:

```
<type>(<scope>): <descrição curta>
```

Regras: ≤ 72 chars, imperativo presente, sem ponto final, scope opcional.

### 4. Gerar body do PR

**Estratégia**:
- Se `.github/pull_request_template.md` existe no repo → leia o template e preencha com os dados coletados
- Senão, se `pr-conventions.md` do projeto descreve um template alternativo → use esse
- Senão → use o esqueleto abaixo, omitindo seções vazias

**Esqueleto agnóstico** (renderize seções condicionalmente):

```markdown
## Contexto

[2-4 linhas explicando o "por quê" da mudança — não o "o quê"]

## Referências

- **SDD:** [`docs/plan-<slug>-YYYY-MM-DD.md`](link relativo)
- **Card Jira:** [{KEY}](url) — "<título do card>"
- **Épico (se houver):** [{KEY}](url)

## Mudanças principais

- [Mudança 1]
- [Mudança 2]
- [Mudança 3]

## Critérios de aceite (do SDD)

- [x] CA1: ...
- [x] CA2: ...
- [x] CA3: ...

## Plano de teste

### Gates automáticos
[Render condicional: para cada gate listado em `commands.md` do projeto:]
- [x] {gate.name}: passa

### Validação manual
- [ ] **Fluxo feliz:** [passos]
- [ ] **Edge case 1:** [descrição]
- [ ] **Edge case 2:** [descrição]

[SEÇÃO CONDICIONAL — só se o `CLAUDE.md`/`architecture.md` declara múltiplas plataformas (iOS+Android, web+mobile, etc.):]
### Plataformas testadas
- [x] {platform.name} — versão {version}

[SEÇÃO CONDICIONAL — só se a task mudou UI:]
## Screenshots / vídeos
[Anexar]

[SEÇÃO CONDICIONAL — só se o projeto tem `rollout.md` declarando feature flags:]
## Rollout

- **Feature flag:** `{ff.key}` ({sistema descrito em rollout.md}) — default: {default}
- **Plano de ativação:** {strategy}
- **Rollback:** {rollback_plan}

[SEÇÃO CONDICIONAL — só se `observability.md` do projeto lista providers:]
## Observabilidade

[Para cada provider listado em observability.md:]
- **{provider.name}:** {eventos/erros/métricas a monitorar}

## Notas para reviewer

[Pontos onde quero atenção específica]
```

**Importante**: não invente seções (rollout, observabilidade, plataformas) se o índice do projeto não aponta pra arquivos de tópico declarando essas capacidades. Melhor PR enxuto que PR com seções vazias ou inventadas.

### 5. Confirmar com usuário
```
📝 PR pronto para criação

Título: {tipo}({scope}): {descrição}
Branch: {head} → {base}
Repo: {repo url do CLAUDE.md ou `git config remote.origin.url`}

Reviewers sugeridos: {do `pr-conventions.md` se existir, senão deixe vazio}
Labels: {labels propostos conforme `pr-conventions.md`}

[Body preview com seções renderizadas]

[s] Criar PR  [e] Editar antes  [d] Criar como draft  [n] Cancelar
```

### 6. Criar PR via GitHub MCP
```
mcp__github__create_pull_request
```

com: `owner`, `repo`, `title`, `body`, `head`, `base`, `draft`.

### 7. Pós-criação
1. Reporte URL do PR
2. Pergunte: "Subscrever em eventos de CI/review pra autofix? (`subscribe_pr_activity`)"
3. Pergunte: "Adicionar comentário no card Jira com link pro PR? (`addCommentToJiraIssue`)"

## 📤 Output

```
✅ PR criado

URL: {pr_url}
Título: {title}
Linhas: +X -Y em N arquivos
Reviewers: {reviewers}

Card Jira atualizado: {jira_url}

Próximo passo do workflow: mover card → "Em revisão" (passo 12)
Babysit ativado: aguardando eventos de CI/review (passo 13)
```

## 🚫 Fora de escopo

- **NÃO** faça merge — isso é o passo 14, e requer confirmação humana explícita
- **NÃO** crie PR sem SDD vinculado — se não há, alerte o usuário
- **NÃO** invente AC ou plano de teste — extraia do SDD e do passo 10
- **NÃO** use `--force` ou flags destrutivas no push
- **NÃO** atribua reviewers automaticamente sem confirmar — mesmo com defaults do `pr-conventions.md`
- **NÃO** hardcode gates/plataformas/providers — venha dos arquivos de tópico do projeto

## ⚙️ Casos especiais

### Mudança trivial (typo, comment)
Pergunte se vale o template completo ou um PR enxuto.

### PR em draft
Se ainda não está pronto, `draft: true` + TODO no body marcando o que falta.

### Conflitos com base branch
Se `git merge-base` mostra branch muito atrás, sugira rebase/merge da base antes.

### PR cross-repo
Se a mudança envolveu múltiplos repos (consulte seção de cross-project deps no `CLAUDE.md` do projeto):
- Crie **um PR por repo**
- Vincule entre si nas descrições
- O card Jira recebe ambos os links

### Índice do projeto raso ou ausente
Se você teve que perguntar muita coisa estrutural (gates, reviewers, template), no fim ofereça **batch save** das respostas — cada uma no arquivo de tópico correto, atualizando o índice se criar arquivo novo.
