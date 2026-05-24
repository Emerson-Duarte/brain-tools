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

  // Filtro por texto livre (título + conteúdo + filename)
  if (opts.query) {
    const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
    results = results.filter((f) => {
      const hay = `${f.title} ${f.filename} ${f.content}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
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

/** Relevância simples: quantos termos da query aparecem no título (mais peso) vs conteúdo */
export function scoreAndSort(files: BrainFile[], query?: string): BrainFile[] {
  if (!query) return files;
  const terms = query.toLowerCase().split(/\s+/);

  return files
    .map((f) => {
      const titleHay = `${f.title} ${f.filename}`.toLowerCase();
      const contentHay = f.content.toLowerCase();
      const score =
        terms.reduce((acc, t) => acc + (titleHay.includes(t) ? 3 : 0), 0) +
        terms.reduce((acc, t) => acc + (contentHay.includes(t) ? 1 : 0), 0);
      return { file: f, score };
    })
    .sort((a, b) => b.score - a.score)
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
