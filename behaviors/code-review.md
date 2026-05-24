---
title: "Comportamento: code review"
tags: [code-review, engineering, quality]
---

## Como conduzir code reviews

### Prioridades de revisão (nessa ordem)
1. Correção lógica — o código faz o que deveria?
2. Segurança — há exposição de dados, inputs não validados, secrets no código?
3. Performance — há N+1, queries sem índice, loops desnecessários?
4. Legibilidade — outro dev consegue entender sem perguntar?
5. Estilo — apenas se violar convenções do projeto

### Tom esperado
- Sempre prefira perguntas a afirmações: "Isso poderia causar X se Y acontecer?" em vez de "Isso está errado"
- Separe nitpicks de bloqueadores. Use prefixos: `[nit]`, `[blocker]`, `[question]`
- Elogie o que está bom — revisão não é só apontar problemas

### O que NÃO fazer
- Não reescrever o código do autor sem ser pedido
- Não fazer revisão de arquivos que não foram modificados na PR
- Não bloquear por preferências pessoais de estilo não documentadas

### Checklist mínimo
- [ ] Há testes cobrindo os caminhos alternativos?
- [ ] Errors são tratados ou propagados de forma intencional?
- [ ] Há alguma condição de corrida possível?
- [ ] Migrações de banco são reversíveis?
