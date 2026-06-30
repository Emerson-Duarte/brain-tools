---
description: Handoff entre máquinas — escaneia os repos Vakinha, grava o ponto de retomada no brain (worklog), espelha no Notion e alerta sobre trabalho preso localmente. Use "resume" pra retomar no outro PC.
argument-hint: "[resume] — sem argumento grava o handoff do dia; 'resume' retoma de onde parou no outro PC"
tools:
  - Bash
  - Read
  - Write
  - Edit
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-create-pages
  - mcp__claude_ai_Notion__notion-update-page
---

Você gerencia o **handoff de trabalho entre máquinas** do Emerson, que trabalha em mais de um PC.
Objetivo: consolidar "o que fiz / o que ficou pendente" num lugar sincronizado, pra ele retomar de qualquer lugar.

Modo de operação depende de `$ARGUMENTS`:
- vazio → **MODO GRAVAR** (fim do dia, na máquina atual)
- `resume` → **MODO RETOMAR** (início do dia, no outro PC)

---

## Descoberta de caminhos (vale pros dois modos)

1. **Workspace root** = diretório que contém os repos Vakinha. Descubra assim, em ordem:
   - Se o cwd está dentro de um repo, suba até o diretório que contém vários repos `vakinha-*`.
   - Caso não ache, use o `pwd` e procure por um diretório que tenha `brain/` + `vakinha-api/` como filhos.
   - Fallback comum nesta máquina: `/Users/emersonduarte/www/vakinha`. **Não hardcode** — sempre derive; o caminho muda entre PCs.
2. **Repo brain** = `<workspace_root>/brain` (repo git com remote `Emerson-Duarte/brain`). Confirme com `git -C <brain> remote get-url origin`.
3. **Worklog dir** = `<brain>/worklog/`. Crie se não existir.
4. **Data de hoje**: use a data corrente fornecida no contexto da sessão (campo currentDate). Não invente; se não tiver, rode `date +%F`.

---

## MODO GRAVAR (`/handoff` sem argumento)

### 1. Escanear todos os repos
Liste os subdiretórios imediatos do workspace root que sejam reppositórios git (inclua **git worktrees** — diretórios cujo `.git` é um arquivo apontando pra `gitdir:`). Para cada repo, colete via `git -C <dir>`:
- branch atual (`rev-parse --abbrev-ref HEAD`)
- commits **de hoje** nessa branch: `log --since=<hoje>T00:00 --format='%h %s' --author=<email-ou-todos>` (use a data de hoje; se a branch não tiver commit hoje, marque "sem atividade hoje")
- working tree sujo: `status --porcelain` (conte arquivos; liste os caminhos se ≤ 10)
- não-pushado: `rev-list --count @{u}..HEAD` (se sem upstream, marque "sem upstream — nunca pushado")
- estado do PR da branch atual: descubra o slug `owner/repo` via `git config --get remote.origin.url` e rode
  `gh pr list --repo <slug> --head <branch> --state all --json number,state,url` (se `gh` falhar, marque "PR: desconhecido")

Rode em paralelo quando possível. Não trave se um repo der erro — registre e siga.

### 2. Classificar cada repo
- **🔴 Pendente de PR**: tem commit hoje (ou commits não-pushados/branch não-master) e **nenhuma PR aberta/merged** pra branch.
- **🟡 Trabalho preso**: working tree sujo (não-commitado) **ou** commits locais não-pushados. Risco real de não chegar no outro PC.
- **🟢 OK**: tem PR aberta/merged e nada preso localmente.
- **⚪ Sem atividade hoje**: ignore no resumo principal (liste só em uma linha agregada).

### 3. Gravar o worklog
Arquivo `<brain>/worklog/<YYYY-MM-DD>.md`. Se **não existe**, crie com este cabeçalho e conteúdo. Se **já existe**, **acrescente** um novo bloco `## Handoff <HH:MM>` ao final (não sobrescreva o trabalho anterior do dia).

Template do conteúdo:

```markdown
# Worklog — <YYYY-MM-DD>

> Máquina: <hostname> · gerado por /handoff

## 🔴 Pendente de PR
- **<projeto>** `<branch>` — <resumo do que foi feito (subjects de hoje)>. Ação: abrir PR.

## 🟡 Trabalho preso localmente
- **<projeto>** `<branch>` — <N arquivos não-commitados> / <M commits não-pushados>. Ação: commitar+pushar antes de trocar de máquina.

## 🟢 Com PR (em andamento)
- **<projeto>** `<branch>` — PR #<n> (<state>): <url>. <resumo>.

## Próximos passos / notas
- <bullets livres: o que estava no meio, decisões pendentes, em que arquivo parei, etc.>

## Repos sem atividade hoje
<lista compacta>
```

Para a seção "Próximos passos / notas", **incorpore o contexto desta conversa** se houver (o que estávamos fazendo, onde paramos). Se não houver contexto de trabalho na sessão, deixe um bullet pedindo pro Emerson completar.

### 4. Commitar + pushar o brain
```
git -C <brain> add worklog/
git -C <brain> commit -m "worklog: handoff <YYYY-MM-DD>"
git -C <brain> push
```
Respeite os contratos de commit globais (nunca commitar como Claude/anthropic). Se o push falhar (sem rede/sem auth), **avise claramente** que o handoff não chegou na nuvem.

### 5. Espelhar no Notion (best-effort)
- Procure uma página chamada **"Worklog Vakinha"** (`notion-search`). Se não existir, crie uma página com esse título no workspace do usuário.
- Sob ela, crie/atualize uma subpágina com título `<YYYY-MM-DD>` contendo o mesmo conteúdo do markdown.
- Se o Notion MCP não estiver disponível/autenticado (comum em execução agendada/headless), **pule silenciosamente** e registre "Notion: indisponível, só brain". Não trave o handoff por causa do Notion.

### 6. Resumo final pro Emerson
Imprima um resumo curto destacando **em negrito** as ações pendentes (🔴 e 🟡), com os comandos prontos pra copiar (ex.: `cd <repo> && git add -A && git commit && git push`). Termine confirmando: worklog gravado em `<brain>/worklog/<data>.md`, pushado? (sim/não), Notion? (sim/não).

---

## MODO RETOMAR (`/handoff resume`)

1. `git -C <brain> pull --rebase` pra trazer o worklog mais recente.
2. Leia o **arquivo de worklog mais recente** em `<brain>/worklog/` (maior data; se houver vários blocos, o último).
3. Para cada item 🔴/🟡, rode `git -C <repo> fetch` (se o repo existir nesta máquina) pra deixar a branch disponível localmente. Se o repo **não existe** nesta máquina, avise que precisa cloná-lo.
4. Apresente um resumo claro: **"Você parou aqui:"** + as pendências priorizadas (primeiro 🔴 abrir PR, depois 🟡 trabalho preso), com comandos prontos pra retomar (ex.: `git checkout <branch>`).
5. Não grave nada nem commite no modo resume — é só leitura/orientação.

---

## Regras
- Nunca hardcode caminhos de máquina — sempre derive do workspace root.
- Best-effort em tudo que é rede (gh, push, Notion): um falhando não pode travar o resto.
- Seja conciso no output final; o valor está em destacar o que está em risco de se perder.
