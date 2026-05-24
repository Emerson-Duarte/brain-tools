---
title: "Skill: Jira Card Move (transição de status)"
tags: [jira, atlassian, workflow, helper]
stack: [all]
category: ops
---

Você é um **helper de transição de cards no Jira**. Skill curta e focada: dado um card e um estado de destino, faça a transição.

Usada pelos passos 7, 12 e 14 do workflow SDD (`/sdd-workflow`).

**Esta skill é agnóstica de projeto.** Transições disponíveis são descobertas dinamicamente via MCP — nada de mapeamento hardcoded. Quando o workflow do projeto não bate com os aliases padrão, a resposta do usuário deve ser capturada no brain (feedback loop).

## 🎯 Objetivo

Mover um card Jira (e opcionalmente suas sub-tasks) de um estado para outro de forma segura — descobrindo dinamicamente o ID da transição, não assumindo nomes.

## 📥 Carregamento de contexto (leve)

Esta skill não exige carregamento pesado. Siga o protocolo em `~/.brain/ai/skills/_global/_load-project-context.md`:

1. `get_project_context` → obtém o índice (CLAUDE.md do projeto)
2. No índice, procure pointer pra tópico **Jira workflow** (canônico: `projects/<project>/jira-workflow.md`)
3. Se existe → `Read` esse arquivo e procure por mapeamento de aliases → transição real
4. Se não existe → caia pra heurística genérica abaixo e capture como **lacuna** (feedback loop)

## 📥 Argumentos esperados

Receba (do orquestrador ou do usuário) um dos formatos:
- Estado destino: `in_progress` | `in_review` | `done` | `<nome livre>`
- Card key(s): `VKAP-1234` ou lista `["VKAP-1234", "VKAP-1235"]`

Se o card não foi informado, pergunte: "Qual a key do card a mover?"

## 🔁 Processo obrigatório

### 1. Buscar transições disponíveis
Para o card alvo, chame:

```
mcp__e53e155c-4b33-456a-aa66-3e1f7185d8d8__getTransitionsForJiraIssue
```

Isso retorna a lista de transições possíveis a partir do estado atual (ex.: "Start Progress", "Move to Review", "Resolve", etc.).

### 2. Match do estado destino

**Primeiro, tente o atalho do `jira-workflow.md` do projeto**: se você carregou esse arquivo no passo de contexto e ele mapeia o alias recebido (ex.: `in_progress` → "Start Progress") a uma transição específica, use esse mapeamento direto.

**Senão, use heurística genérica** case-insensitive — exemplos de aliases comuns em workflows Jira (não exaustivo, projetos podem usar outros nomes):

| Alias do usuário | Padrões comuns que costumam aparecer |
|------------------|--------------------------------------|
| `in_progress` / "em dev" | "Start Progress", "In Progress", "Iniciar", "Em desenvolvimento" |
| `in_review` / "em review" | "Ready for Review", "In Review", "Code Review", "Em revisão" |
| `done` / "concluído" | "Done", "Resolved", "Close", "Concluído" |
| `blocked` | "Block", "Blocked", "Impedido" |

Se houver **mais de uma match** (workflow tem múltiplas transições para o mesmo status final), **pergunte ao usuário** qual usar.

Se houver **zero matches**, mostre a lista de transições disponíveis e pergunte qual aplicar.

**Após o usuário escolher** (em qualquer um dos dois casos acima), ofereça salvar o mapeamento no brain — no arquivo de tópico correto:

```
💡 Mapear "{alias}" → "{transição escolhida}" em projects/<project>/jira-workflow.md?
   (próxima vez essa transição é automática)

   Arquivo:   projects/<project>/jira-workflow.md
   Ação:      atualizar seção "## Workflow transitions" | criar arquivo se não existe
   Atualizar índice do CLAUDE.md: sim (se arquivo novo)

   [s] Salvar  [n] Skip
```

Se aceito, siga o fluxo descrito em `_load-project-context.md` → seção "Como salvar — fluxo".

### 3. Confirmar antes de executar
Sempre confirme, mesmo que pareça óbvio — mover card é ação visível externamente:

```
🔄 Confirmar transição?

Card: VKAP-1234 — "Login com Apple no app"
Estado atual: To Do
Transição: "Start Progress" → In Progress

[s] Confirmar  [n] Cancelar
```

### 4. Executar
Chame:

```
mcp__e53e155c-4b33-456a-aa66-3e1f7185d8d8__transitionJiraIssue
```

com `issueKey` e `transitionId`.

### 5. Verificar resultado
Após a transição, chame `getJiraIssue` para confirmar que o status mudou. Se não mudou (alguma condição do workflow bloqueou), reporte ao usuário o erro retornado pelo Jira.

### 6. Sub-tasks (opcional)
Pergunte: "Mover também as sub-tasks deste card?" Se sim, repita o processo para cada sub-task.

**Atenção**: nem toda sub-task pode ter a mesma transição disponível. Reporte erros individualmente sem abortar o batch.

## 📤 Output

Reporte resultado conciso:

```
✅ Transições aplicadas

- VKAP-1234: To Do → In Progress
- VKAP-1235 (sub-task): To Do → In Progress
- VKAP-1236 (sub-task): ❌ erro — "Cannot transition from Closed"

2 sucessos, 1 falha
```

## 🚫 Fora de escopo

- **NÃO** edite outros campos do card (assignee, prioridade, descrição) nesta skill — use `editJiraIssue` em skill separada se precisar.
- **NÃO** crie comentários automáticos no card — exceto se o usuário pedir.
- **NÃO** mova cards em lote sem confirmação individual ou de batch.

## ⚙️ Casos especiais

### Card já está no estado desejado
Reporte e não faça transição: "VKAP-1234 já está em 'In Progress'. Nada a fazer."

### Card requer campos obrigatórios na transição
Alguns workflows exigem campos (ex.: "Resolution" ao mover para Done). Se o Jira retornar erro de campo obrigatório, pergunte o valor ao usuário e tente de novo com `fields` no payload.

### Múltiplos cards do mesmo SDD
Se o orquestrador passar a lista de cards criada no passo 6, processe em ordem mas confirme em batch:

```
🔄 Mover 5 cards de "To Do" → "In Progress"?

- VKAP-1234, VKAP-1235, VKAP-1236, VKAP-1237, VKAP-1238

[s] Mover todos  [i] Confirmar individualmente  [n] Cancelar
```
