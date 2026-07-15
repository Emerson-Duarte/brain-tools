// Benchmark de recuperação do brain (search_knowledge).
// Compara o algoritmo ATUAL-baseline (OR-substring congelado) contra o
// PROPOSTO REAL (funções compiladas de ../../mcp/dist/brain.js) sobre um
// gold set de queries com resposta conhecida. Mede qualidade e custo/tokens.
//
// Uso:
//   npm run build   (em mcp/, p/ atualizar dist antes)
//   BRAIN_DATA_PATH=/caminho/do/brain node scripts/bench/bench.mjs
//   (default de BRAIN_DATA_PATH: ~/www/brain)
//
// O baseline `atual` é um PORTE CONGELADO do algoritmo antigo (mantido aqui de
// propósito p/ ser a régua estável). O `proposto` chama o código REAL que roda
// em produção — então este bench também vira teste de regressão do MCP.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import {
  readMarkdownFiles,
  hybridSearch,
  scoreAndSort,
} from "../../mcp/dist/brain.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAIN = process.env.BRAIN_DATA_PATH || join(homedir(), "www", "brain");
const KDIR = join(BRAIN, "knowledge");

if (!existsSync(KDIR)) {
  console.error(`knowledge/ não encontrado em ${KDIR}. Defina BRAIN_DATA_PATH.`);
  process.exit(1);
}

// carrega com relativePath "knowledge/..." p/ bater com os caminhos do gold
const FILES = readMarkdownFiles(KDIR, BRAIN);
const N = FILES.length;

// ---------- baseline CONGELADO: algoritmo antigo (OR-substring, score 3/2/1) ----------
function haystack(f) {
  const fm = Object.entries(f.frontmatter)
    .filter(([k]) => k !== "title")
    .map(([, v]) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
    .join(" ");
  return `${f.title} ${f.filename} ${fm} ${f.content}`.toLowerCase();
}
const HAY = new Map(FILES.map((f) => [f, haystack(f)]));
function atualSearch(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const cand = FILES.filter((f) => terms.some((t) => HAY.get(f).includes(t)));
  return cand
    .map((f) => {
      const titleHay = `${f.title} ${f.filename}`.toLowerCase();
      const tagsHay = Object.entries(f.frontmatter)
        .filter(([k]) => k !== "title")
        .map(([, v]) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
        .join(" ")
        .toLowerCase();
      const c = f.content.toLowerCase();
      const s =
        terms.reduce((a, t) => a + (titleHay.includes(t) ? 3 : 0), 0) +
        terms.reduce((a, t) => a + (tagsHay.includes(t) ? 2 : 0), 0) +
        terms.reduce((a, t) => a + (c.includes(t) ? 1 : 0), 0);
      return { f, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 25)
    .map((x) => x.f);
}

// ---------- PROPOSTO: código REAL compilado (IDF + stopwords + coverage) ----------
function propostoSearch(query) {
  return scoreAndSort(hybridSearch(FILES, { query }), query);
}

// ---------- FASE 3 (opcional): expansão por [[wikilinks]] sobre o proposto ----------
const deDate = (fn) => fn.replace(/^\d{4}-\d{2}-\d{2}-/, "");
const byDedated = new Map(FILES.map((f) => [deDate(f.filename).toLowerCase(), f]));
const byFilename = new Map(FILES.map((f) => [f.filename.toLowerCase(), f]));
const byTitle = new Map(FILES.map((f) => [f.title.toLowerCase().trim(), f]));
let linkTotal = 0, linkResolved = 0;
function linksOf(f) {
  const out = [];
  for (const m of f.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const raw = m[1].split("|")[0].trim().toLowerCase();
    linkTotal++;
    const hit = byDedated.get(raw) || byFilename.get(raw) || byTitle.get(raw);
    if (hit && hit !== f) { linkResolved++; out.push(hit); }
  }
  return out;
}
function fase3Search(query) {
  const base = propostoSearch(query);
  const seen = new Set(base.map((f) => f.relativePath));
  const out = [...base];
  for (const f of base.slice(0, 5))
    for (const nb of linksOf(f))
      if (!seen.has(nb.relativePath)) { seen.add(nb.relativePath); out.push(nb); }
  return out.slice(0, 25);
}

// ---------- métricas ----------
const rankOf = (res, gold) => {
  const g = new Set(gold);
  for (let i = 0; i < res.length; i++) if (g.has(res[i].relativePath)) return i + 1;
  return Infinity;
};
const recallK = (res, gold, k) => {
  const g = new Set(gold), top = new Set(res.slice(0, k).map((r) => r.relativePath));
  let h = 0; for (const x of g) if (top.has(x)) h++; return h / g.size;
};
const tok = (chars) => Math.round(chars / 4);
function costVerbose(res) {
  let c = 0;
  for (const f of res) {
    const meta = Object.entries(f.frontmatter).filter(([k]) => k !== "title")
      .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
    c += (`### ${f.title}\nArquivo: ${f.relativePath}\n${meta}\n\n${f.content.slice(0, 600)}`).length + 8;
  }
  return tok(c);
}
function costPointer(res) {
  let c = 0;
  for (const f of res) {
    const fl = (f.content.split("\n").find((l) => l.trim()) || "").slice(0, 160);
    c += (`- ${f.title} — ${f.relativePath} — ${fl}`).length;
  }
  return tok(c);
}

// ---------- gold ----------
let GOLD = [];
for (const n of [1, 2, 3, 4]) {
  const p = join(HERE, `gold-${n}.json`);
  if (existsSync(p)) GOLD.push(...JSON.parse(readFileSync(p, "utf-8")));
}
const PATHS = new Set(FILES.map((f) => f.relativePath));
let bad = 0;
for (const q of GOLD) {
  q.gold = (q.gold || []).filter((p) => PATHS.has(p) || (bad++, false));
}
GOLD = GOLD.filter((q) => q.gold.length);

console.log(`\n=== CORPUS ${N} notas | GOLD ${GOLD.length} queries${bad ? ` (${bad} paths ruins)` : ""} ===\n`);

const SYS = { atual: atualSearch, proposto: propostoSearch, fase3: fase3Search };
const agg = {}, perType = {};
for (const k of Object.keys(SYS)) agg[k] = { mrr: 0, r5: 0, r10: 0, h1: 0, cost: 0, n: 0 };
const regr = [], gains = [];

for (const q of GOLD) {
  const rank = {};
  for (const [name, fn] of Object.entries(SYS)) {
    const res = fn(q.query), r = rankOf(res, q.gold), a = agg[name];
    rank[name] = r;
    a.mrr += r === Infinity ? 0 : 1 / r; a.r5 += recallK(res, q.gold, 5);
    a.r10 += recallK(res, q.gold, 10); a.h1 += r === 1 ? 1 : 0; a.n++;
    (perType[q.type] ||= {})[name] ||= { mrr: 0, n: 0 };
    perType[q.type][name].mrr += r === Infinity ? 0 : 1 / r; perType[q.type][name].n++;
  }
  agg.atual.cost += costVerbose(atualSearch(q.query));
  agg.proposto.cost += costPointer(propostoSearch(q.query));
  agg.fase3.cost += costPointer(fase3Search(q.query));
  if (rank.proposto > rank.atual) regr.push({ q: q.query, t: q.type, a: rank.atual, p: rank.proposto, g: q.gold[0] });
  if (rank.atual === Infinity && rank.fase3 !== Infinity) gains.push({ q: q.query, t: q.type, r: rank.fase3, g: q.gold[0] });
}

const pct = (x, n) => ((x / n) * 100).toFixed(1) + "%";
const f3 = (x, n) => (x / n).toFixed(3);
console.log("=== AGREGADO ===");
console.log("sistema  |  MRR  | Recall@5 | Recall@10 | Hit@1  | tokens/busca");
for (const k of ["atual", "proposto", "fase3"]) {
  const a = agg[k];
  console.log(`${k.padEnd(8)} | ${f3(a.mrr, a.n)} |  ${pct(a.r5, a.n).padStart(6)}  |  ${pct(a.r10, a.n).padStart(6)}   | ${pct(a.h1, a.n).padStart(5)} | ${Math.round(a.cost / a.n)}`);
}
console.log("\n=== MRR POR TIPO ===\ntipo".padEnd(13) + "| " + ["atual", "proposto", "fase3"].map((s) => s.padStart(8)).join(" | ") + " | n");
for (const t of Object.keys(perType)) {
  const row = ["atual", "proposto", "fase3"].map((s) => { const d = perType[t][s]; return d ? (d.mrr / d.n).toFixed(3).padStart(8) : "   -    "; });
  console.log(t.padEnd(12) + " | " + row.join(" | ") + " | " + perType[t].atual.n);
}
console.log(`\n=== REGRESSÕES (proposto pior que atual): ${regr.length}/${GOLD.length} ===`);
for (const r of regr) console.log(`  [${r.t}] "${r.q}"  atual=${r.a === Infinity ? "∞" : "#" + r.a} proposto=${r.p === Infinity ? "∞" : "#" + r.p}`);
console.log(`\n=== GANHOS (atual não achou, fase3 achou): ${gains.length} ===`);
for (const g of gains) console.log(`  [${g.t}] "${g.q}" -> #${g.r}`);
console.log(`\n=== LINKS (fase3) ===\n  ${linkResolved}/${linkTotal} wikilinks resolvidos no top-5 (${linkTotal ? ((linkResolved / linkTotal) * 100).toFixed(0) : 0}%), ${linkTotal - linkResolved} quebrados`);
