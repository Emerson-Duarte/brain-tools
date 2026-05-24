---
title: "Skill: escrever commit messages"
tags: [git, engineering, communication]
stack: [all]
---

## 🔒 Pré-condições obrigatórias (verifique a CADA commit)

Antes de gerar a mensagem **e** antes de executar `git commit`, verifique:

```bash
git config user.email
git config user.name
```

**PARE** e instrua o usuário a corrigir se voltar:
- `noreply@anthropic.com`
- `Claude`
- vazio

Mensagem de erro:
> ❌ Git identity não está configurada com seu usuário. Commit sairia com `<nome>` `<email>`.
>
> Corrija com:
> ```bash
> git config --global user.email "seu@email.com"
> git config --global user.name "Seu Nome"
> ```
> Ou rode o bootstrap do brain environment se ainda não rodou (`~/.brain/scripts/environment-bootstrap.sh`).

Não tente "consertar" silenciosamente nem prosseguir com identidade errada.

## Como escrever uma boa commit message

Use o formato Conventional Commits:

```
<type>(<scope>): <descrição curta>

[corpo opcional — o quê e por quê, não o como]

[footer opcional — breaking changes, issue refs]
```

### Tipos
- `feat` — nova funcionalidade
- `fix` — correção de bug
- `refactor` — mudança que não adiciona feature nem corrige bug
- `docs` — só documentação
- `test` — adição ou correção de testes
- `chore` — build, deps, configs
- `perf` — melhoria de performance

### Regras
1. Primeira linha: máximo 72 caracteres, imperativo presente ("add" não "added")
2. Deixe uma linha em branco entre o título e o corpo
3. O corpo explica **o quê e por quê**, não o como
4. Referencie issues quando relevante: `Closes #123`

### Exemplos

```
feat(auth): add OAuth2 login with Google

Users can now sign in with their Google account instead of
creating a separate password. Reduces friction on signup.

Closes #45
```

```
fix(api): handle null response from payment gateway

The gateway returns null instead of an error object when
rate limited. This caused an unhandled exception in production.
```
