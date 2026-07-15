# Benchmark de recuperação do brain (`search_knowledge`)

Teste de regressão + comparação de qualidade/custo do motor de busca do brain.
Compara o algoritmo **baseline congelado** (OR-substring antigo) contra o
**código real compilado** (`mcp/dist/brain.js`) sobre um gold set de queries com
resposta conhecida.

## Rodar

```bash
cd mcp && npm run build          # atualiza dist/ com o código atual
cd ..
BRAIN_DATA_PATH=/caminho/do/brain node scripts/bench/bench.mjs
# default de BRAIN_DATA_PATH: ~/www/brain
```

## Métricas

- **MRR** — o doc certo aparece no topo? (1/posição do 1º acerto)
- **Recall@5 / @10** — fração dos docs-gold no top-k
- **Hit@1** — % de queries com gold em 1º
- **tokens/busca** — custo estimado da resposta (baseline usa preview 600×25;
  proposto usa ponteiros)

## Resultado de referência (2026-07-15, 128 notas, 48 queries)

| sistema  | MRR   | Recall@5 | Recall@10 | Hit@1 | tokens/busca |
|----------|-------|----------|-----------|-------|--------------|
| atual    | 0.752 | 71.0%    | 79.2%     | 70.8% | 5995         |
| proposto | 0.842 | 85.9%    | 93.4%     | 75.0% | 1280         |
| fase3    | 0.842 | 85.9%    | 93.4%     | 75.0% | 1303         |

Proposto = **IDF + stopwords + coverage** (Fase 2) com saída em **ponteiros**
(Fase 1). Fase 3 (expansão por `[[wikilinks]]`) é neutra hoje (~80% dos links
resolvem; corpus pouco linkado) — ROI cresce quando o linking adensar.

## Gold set

`gold-1..4.json` — 48 queries geradas por agentes que leram o corpus **sem
conhecer os algoritmos** (evita viés). Tipos: `exact`, `paraphrase`, `broad`,
`howdid`, `multi`. Cada item: `{ query, type, gold: [caminhos], note }`.

## Caveats

- Gold sintético (LLM), 48 queries, uma máquina — não é verdade absoluta, mas é
  **idêntico p/ os dois sistemas**, então o *delta* é confiável.
- `paraphrase` é o ponto fraco persistente (limite do léxico puro). Só embeddings
  (Fase 4) fecham esse gap.
- Ao editar o motor em `mcp/src/brain.ts`, rode este bench e compare com a tabela
  acima antes de commitar.
