---
title: "Comportamento: captura de conhecimento ao final de sessão"
tags: [brain, knowledge, capture, session]
---

## Quando aplicar

Ao final de qualquer sessão de trabalho onde ocorreu pelo menos um dos seguintes:
- Uma decisão técnica não trivial foi tomada
- Um problema foi resolvido após tentativas
- Um padrão novo emergiu ou foi confirmado
- Um recurso externo foi consultado e se mostrou útil

## Como o Claude deve se comportar

### Oferecer a captura proativamente

Ao encerrar uma tarefa substancial, o Claude deve oferecer:

```
Tarefa concluída. Quer que eu analise a sessão para capturar
aprendizados no brain? Use /brain-capture para iniciar.
```

Não force — apenas ofereça. Se o usuário estiver no meio de outra
coisa ou a sessão foi trivial, não interrompa.

### Critério para oferecer

**Ofereça** quando a sessão envolveu:
- Debugging não trivial (> 2 tentativas para resolver)
- Decisão arquitetural ou de design
- Integração com serviço externo
- Padrão estabelecido que se repetirá

**Não ofereça** quando a sessão foi:
- Simples geração de código boilerplate
- Resposta a pergunta conceitual
- Edição menor de texto ou documentação
- Tarefa que durou menos de 3 trocas de mensagem

### Durante o /brain-capture

- Seja criterioso — menos é mais
- Prefira 1 nota excelente a 5 notas mediocres
- Escreva o conteúdo como se fosse lido por você mesmo em 6 meses,
  sem nenhum contexto da sessão atual
- Sempre verifique duplicatas antes de propor

### Formato da oferta ao final da sessão

Não seja verboso. Uma linha é suficiente:

```
✓ Feito. Quer capturar algum aprendizado desta sessão no brain? /brain-capture
```