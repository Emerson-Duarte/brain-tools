import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { simpleGit } from "simple-git";
import { BRAIN_DATA_PATH } from "../brain.js";

type NoteCategory = "engineering" | "architecture" | "references" | "notes" | "resources";

interface AddNoteArgs {
  title: string;
  content: string;
  category: NoteCategory;
  tags?: string[];
  project?: string;      // associar a um projeto específico
  url?: string;          // para recursos/links
  commit?: boolean;      // padrão: true
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const CATEGORY_DIRS: Record<NoteCategory, string> = {
  engineering:  "knowledge/engineering",
  architecture: "knowledge/architecture",
  references:   "knowledge/references",
  notes:        "knowledge/notes",
  resources:    "knowledge/resources",
};

export async function addNote(args: AddNoteArgs) {
  const { title, content, category, tags = [], project, url, commit = true } = args;

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(title);
  const filename = `${date}-${slug}.md`;

  const dir = join(BRAIN_DATA_PATH, CATEGORY_DIRS[category]);
  mkdirSync(dir, { recursive: true });

  const filepath = join(dir, filename);

  if (existsSync(filepath)) {
    return {
      content: [
        { type: "text", text: `Já existe uma nota com esse nome: ${CATEGORY_DIRS[category]}/${filename}` },
      ],
      isError: true,
    };
  }

  // Monta frontmatter
  const fm: Record<string, any> = {
    title,
    category,
    created_at: date,
  };
  if (tags.length > 0) fm.tags = tags;
  if (project) fm.project = project;
  if (url) fm.url = url;

  const fmLines = ["---", ...Object.entries(fm).map(([k, v]) =>
    Array.isArray(v)
      ? `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`
      : `${k}: "${v}"`
  ), "---", ""].join("\n");

  writeFileSync(filepath, fmLines + content, "utf-8");

  const relativePath = `${CATEGORY_DIRS[category]}/${filename}`;

  if (!commit) {
    return {
      content: [{ type: "text", text: `Nota criada: ${relativePath}` }],
    };
  }

  try {
    const git = simpleGit(BRAIN_DATA_PATH);
    await git.add(filepath);
    await git.commit(`note(${category}): ${title}`);

    return {
      content: [
        {
          type: "text",
          text: [
            `Nota criada e commitada!`,
            ``,
            `Arquivo: ${relativePath}`,
            `Tags: ${tags.join(", ") || "nenhuma"}`,
            project ? `Projeto: ${project}` : "",
            ``,
            `Lembre de \`git push\` no repo de dados para sincronizar.`,
          ]
            .filter((l) => l !== undefined)
            .join("\n"),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: [
            `Nota criada: ${relativePath}`,
            ``,
            `Commit automático falhou. Faça manualmente:`,
            `  cd "${BRAIN_DATA_PATH}" && git add . && git commit -m "note(${category}): ${title}"`,
            ``,
            `Erro: ${err.message}`,
          ].join("\n"),
        },
      ],
    };
  }
}
