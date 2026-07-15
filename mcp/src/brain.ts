import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, extname, relative } from "path";
import { homedir } from "os";
import matter from "gray-matter";

// O brain-mcp lê de DOIS repos:
//   - BRAIN_TOOLS_PATH: repo público com skills/behaviors/prompts agnósticos + o próprio servidor MCP
//   - BRAIN_DATA_PATH:  repo privado com projects/prds/knowledge/skills específicos de domínio
//
// Backward-compat: se BRAIN_PATH (legado) estiver setado e os novos não, usa pra ambos.
// Default em dev: assume que o MCP roda dentro de BRAIN_TOOLS_PATH (../..) e que o privado fica
// em ~/.brain-data.
const LEGACY_BRAIN_PATH = process.env.BRAIN_PATH;
const SELF_REPO_ROOT = join(new URL(import.meta.url).pathname, "..", "..", "..");

export const BRAIN_TOOLS_PATH =
  process.env.BRAIN_TOOLS_PATH ?? LEGACY_BRAIN_PATH ?? SELF_REPO_ROOT;

export const BRAIN_DATA_PATH =
  process.env.BRAIN_DATA_PATH ?? LEGACY_BRAIN_PATH ?? join(homedir(), ".brain-data");

export interface BrainFile {
  path: string;
  relativePath: string;       // relativo ao root passado em readMarkdownFiles
  filename: string;           // sem extensão
  title: string;
  content: string;
  frontmatter: Record<string, any>;
  section: string;            // ex: "knowledge/engineering", "prds/projeto-x"
}

/** Lê todos os .md recursivamente a partir de um diretório.
 *  `root` controla a raiz usada para computar `relativePath` e `section` (default: o próprio baseDir).
 */
export function readMarkdownFiles(baseDir: string, root?: string): BrainFile[] {
  if (!existsSync(baseDir)) return [];
  const results: BrainFile[] = [];
  const relRoot = root ?? baseDir;

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        try {
          const raw = readFileSync(full, "utf-8");
          const parsed = matter(raw);
          const filename = basename(entry.name, ".md");
          const rel = relative(relRoot, full);
          const section = relative(relRoot, dir);

          results.push({
            path: full,
            relativePath: rel,
            filename,
            title: parsed.data.title ?? filename.replace(/-/g, " "),
            content: parsed.content.trim(),
            frontmatter: parsed.data,
            section,
          });
        } catch {
          // ignora arquivos ilegíveis
        }
      }
    }
  }

  walk(baseDir);
  return results;
}

/** Monta o haystack de busca de um arquivo: título, filename, tags e demais
 *  valores de frontmatter (achatados) + conteúdo. Tudo em lowercase.
 *  Tags/frontmatter entravam de fora antes — notas só achavam por corpo/título. */
function buildHaystack(f: BrainFile): string {
  const fmValues = Object.entries(f.frontmatter)
    .filter(([k]) => k !== "title") // título já entra separado
    .map(([, v]) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
    .join(" ");
  return `${f.title} ${f.filename} ${fmValues} ${f.content}`.toLowerCase();
}

// Score computado no hybridSearch (que enxerga o corpus inteiro p/ IDF) e
// consumido no scoreAndSort. WeakMap keyed pelo objeto BrainFile — os mesmos
// refs fluem de um p/ o outro. Callers que só chamam scoreAndSort (sem passar
// pelo hybridSearch novo) caem no fallback legado.
const SCORE_CACHE = new WeakMap<BrainFile, number>();

// Stopwords PT/EN: termos vazios de sinal que, no OR-substring antigo, casavam
// quase todo doc e poluíam o ranking. Removê-los é pré-requisito do coverage.
export const STOPWORDS = new Set(
  ("a o os as um uma uns umas de do da dos das em no na nos nas por para pra pro com sem sob sobre " +
    "e ou mas que qual quais como quando onde quanto quanta quê porque porquê se ao aos à às " +
    "meu minha seu sua nosso nossa isso isto esse essa este esta aquele aquela é ser tem ter foi era " +
    "nao não sim ja já the of to in on for and or is are how what when where do does my our this that")
    .split(/\s+/)
);

/** Tokeniza preservando termos técnicos com ponto/hífen (ex.: vakinha-api,
 *  10.0.2.2, storekit2). Bem mais robusto que split(/\s+/). */
export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}_][\p{L}\p{N}_.\-]*/gu) || [];
}

/** Termos "de conteúdo" da query: tokenizados, sem stopwords nem 1-char.
 *  Fallback: se sobrar vazio (query só de stopwords), usa os tokens crus. */
function contentTerms(query: string): string[] {
  const all = tokenize(query);
  const kept = all.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  return kept.length ? kept : all;
}

/** Busca híbrida: texto livre no título/conteúdo + filtros de frontmatter */
export function hybridSearch(
  files: BrainFile[],
  opts: {
    query?: string;
    tags?: string[];
    type?: string;
    status?: string;
    project?: string;
  }
): BrainFile[] {
  let results = files;

  // Filtro por texto livre com IDF + coverage (substitui o OR-substring puro).
  // Ganhos medidos no bench (48 queries gold): MRR 0.752→0.842, recall@10
  // 79%→93%, e mata o "termo comum casa tudo" (ex.: tag `iap` em 27% dos docs).
  // - stopwords + tokenização robusta (contentTerms)
  // - IDF: termo raro pesa mais que termo comum
  // - coverage: query com >=3 termos exige casar >=2 (menos ruído)
  // - bônus de frase e de cobertura total
  // O score fica cacheado p/ o scoreAndSort ordenar.
  if (opts.query) {
    const qterms = contentTerms(opts.query);
    const N = files.length;
    const hays = new Map<BrainFile, string>();
    for (const f of files) hays.set(f, buildHaystack(f));
    const df = new Map<string, number>();
    const idf = (t: string): number => {
      if (!df.has(t)) {
        let c = 0;
        for (const f of files) if (hays.get(f)!.includes(t)) c++;
        df.set(t, c);
      }
      return Math.log((N + 1) / (df.get(t)! + 1)) + 1;
    };
    const need = qterms.length >= 3 ? 2 : 1;
    const phrase = qterms.join(" ");
    const filtered: BrainFile[] = [];
    for (const f of files) {
      const titleHay = `${f.title} ${f.filename}`.toLowerCase();
      const tagsHay = Object.entries(f.frontmatter)
        .filter(([k]) => k !== "title")
        .map(([, v]) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
        .join(" ")
        .toLowerCase();
      const contentHay = f.content.toLowerCase();
      let matched = 0;
      let score = 0;
      for (const t of qterms) {
        const inT = titleHay.includes(t);
        const inTag = tagsHay.includes(t);
        const inC = contentHay.includes(t);
        if (!(inT || inTag || inC)) continue;
        matched++;
        const field = inT ? 3 : inTag ? 2 : 1;
        score += field * idf(t);
      }
      if (matched < Math.min(need, qterms.length)) continue;
      if (qterms.length > 1 && (titleHay.includes(phrase) || contentHay.includes(phrase))) {
        score *= 1.5;
      }
      score *= 1 + 0.15 * (matched - 1);
      SCORE_CACHE.set(f, score);
      filtered.push(f);
    }
    results = filtered;
  }

  // Filtro por tags (frontmatter.tags: string[])
  if (opts.tags && opts.tags.length > 0) {
    const wantedTags = opts.tags.map((t) => t.toLowerCase());
    results = results.filter((f) => {
      const fileTags: string[] = (f.frontmatter.tags ?? []).map((t: string) =>
        t.toLowerCase()
      );
      return wantedTags.some((t) => fileTags.includes(t));
    });
  }

  // Filtro por tipo (frontmatter.type)
  if (opts.type) {
    const t = opts.type.toLowerCase();
    results = results.filter(
      (f) => (f.frontmatter.type ?? "").toLowerCase() === t
    );
  }

  // Filtro por status
  if (opts.status && opts.status !== "all") {
    results = results.filter(
      (f) => (f.frontmatter.status ?? "todo") === opts.status
    );
  }

  // Filtro por projeto
  if (opts.project) {
    const p = opts.project.toLowerCase();
    results = results.filter(
      (f) =>
        (f.frontmatter.project ?? "").toLowerCase() === p ||
        f.relativePath.toLowerCase().includes(p)
    );
  }

  return results;
}

/** Relevância: termos no título/filename (3) > tags+frontmatter (2) > conteúdo (1).
 *  Com OR-filter no hybridSearch, este score é o que separa "casou tudo" de
 *  "casou um termo solto". Docs com score 0 são descartados. */
export function scoreAndSort(
  files: BrainFile[],
  query?: string,
  limit = 25
): BrainFile[] {
  if (!query) return files;

  // Caminho novo: se o hybridSearch já pontuou (IDF+coverage), só ordena.
  if (files.length > 0 && files.every((f) => SCORE_CACHE.has(f))) {
    return [...files]
      .sort((a, b) => SCORE_CACHE.get(b)! - SCORE_CACHE.get(a)!)
      .slice(0, limit);
  }

  // Fallback legado (callers que não passaram pelo hybridSearch novo).
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return files
    .map((f) => {
      const titleHay = `${f.title} ${f.filename}`.toLowerCase();
      const tagsHay = Object.entries(f.frontmatter)
        .filter(([k]) => k !== "title")
        .map(([, v]) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
        .join(" ")
        .toLowerCase();
      const contentHay = f.content.toLowerCase();
      const score =
        terms.reduce((acc, t) => acc + (titleHay.includes(t) ? 3 : 0), 0) +
        terms.reduce((acc, t) => acc + (tagsHay.includes(t) ? 2 : 0), 0) +
        terms.reduce((acc, t) => acc + (contentHay.includes(t) ? 1 : 0), 0);
      return { file: f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.file);
}

/** Formata lista de arquivos para resposta do MCP */
export function formatFileList(
  files: BrainFile[],
  opts: { showContent?: boolean; contentLimit?: number } = {}
): string {
  const { showContent = false, contentLimit = 600 } = opts;
  if (files.length === 0) return "Nenhum resultado encontrado.";

  return files
    .map((f) => {
      const meta = Object.entries(f.frontmatter)
        .filter(([k]) => !["title"].includes(k))
        .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");

      const preview =
        showContent && f.content
          ? `\n\n${f.content.slice(0, contentLimit)}${
              f.content.length > contentLimit ? "\n\n[conteúdo truncado]" : ""
            }`
          : "";

      return [`### ${f.title}`, `Arquivo: ${f.relativePath}`, meta, preview]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

/** Resumo de 1 linha p/ o modo ponteiro: usa frontmatter.summary se existir,
 *  senão a primeira linha não-vazia e não-heading do conteúdo. */
export function summarize(f: BrainFile, max = 160): string {
  const s = typeof f.frontmatter.summary === "string" ? f.frontmatter.summary.trim() : "";
  if (s) return s.length > max ? s.slice(0, max) + "…" : s;
  const line =
    f.content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith(">")) ?? "";
  return line.length > max ? line.slice(0, max) + "…" : line;
}

/** PROGRESSIVE DISCLOSURE (Fase 1): devolve PONTEIROS (título + caminho + resumo
 *  de 1 linha), não o conteúdo. Corta ~78% dos tokens/busca vs. o preview de 600
 *  chars × 25 resultados. O agente abre a nota completa com Read no caminho. */
export function formatPointerList(files: BrainFile[]): string {
  if (files.length === 0) return "Nenhum resultado encontrado.";
  const body = files
    .map((f, i) => {
      const proj = f.frontmatter.project ? ` · ${f.frontmatter.project}` : "";
      const tags =
        Array.isArray(f.frontmatter.tags) && f.frontmatter.tags.length
          ? ` · tags: ${f.frontmatter.tags.slice(0, 6).join(", ")}`
          : "";
      return `${i + 1}. ${f.title}\n   ${f.relativePath}${proj}${tags}\n   ${summarize(f)}`;
    })
    .join("\n\n");
  return (
    body +
    "\n\n— Ponteiros (modo econômico). Abra a nota completa com Read no caminho; " +
    "ou repita a busca com verbose=true p/ inline."
  );
}
