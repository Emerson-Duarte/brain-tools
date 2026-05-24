import { join } from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { simpleGit } from "simple-git";
import {
  BRAIN_TOOLS_PATH,
  BRAIN_DATA_PATH,
  readMarkdownFiles,
  hybridSearch,
  scoreAndSort,
  formatFileList,
} from "../brain.js";

// ─── search_prds ────────────────────────────────────────────────────────────

interface SearchPRDsArgs {
  project?: string;
  query?: string;
  tags?: string[];
  status?: "todo" | "in-progress" | "done" | "all";
}

export async function searchPRDs(args: SearchPRDsArgs) {
  const { project, query, tags, status = "all" } = args;

  const baseDir = project
    ? join(BRAIN_DATA_PATH, "prds", project)
    : join(BRAIN_DATA_PATH, "prds");

  let files = readMarkdownFiles(baseDir, BRAIN_DATA_PATH).filter(
    (f) => !f.relativePath.includes("templates")
  );

  files = hybridSearch(files, { query, tags, status, project });
  files = scoreAndSort(files, query);

  // Ordena por data desc se não houver query
  if (!query) {
    files.sort((a, b) =>
      (b.frontmatter.created_at ?? b.filename).localeCompare(
        a.frontmatter.created_at ?? a.filename
      )
    );
  }

  return {
    content: [
      {
        type: "text",
        text:
          files.length === 0
            ? `Nenhum PRD encontrado${project ? ` para "${project}"` : ""}.`
            : `${files.length} PRD(s) encontrado(s):\n\n${formatFileList(files, { showContent: true })}`,
      },
    ],
  };
}

// ─── create_prd ─────────────────────────────────────────────────────────────

interface CreatePRDArgs {
  project: string;
  title: string;
  content: string;
  status?: "todo" | "in-progress" | "done";
  tags?: string[];
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createPRD(args: CreatePRDArgs) {
  const { project, title, content, status = "todo", tags = [] } = args;

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-${slugify(title)}.md`;
  const dir = join(BRAIN_DATA_PATH, "prds", project);
  mkdirSync(dir, { recursive: true });

  const filepath = join(dir, filename);
  if (existsSync(filepath)) {
    return {
      content: [{ type: "text", text: `Já existe: prds/${project}/${filename}` }],
      isError: true,
    };
  }

  const fm = [
    "---",
    `title: "${title}"`,
    `project: "${project}"`,
    `status: "${status}"`,
    `created_at: "${date}"`,
    tags.length > 0 ? `tags: [${tags.map((t) => `"${t}"`).join(", ")}]` : "",
    "---",
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  writeFileSync(filepath, fm + content, "utf-8");

  try {
    const git = simpleGit(BRAIN_DATA_PATH);
    await git.add(filepath);
    await git.commit(`feat(prd): ${project} — ${title}`);
    return {
      content: [
        {
          type: "text",
          text: `PRD criado e commitado!\n\nArquivo: prds/${project}/${filename}\nStatus: ${status}\n\nFaça \`git push\` no repo de dados para sincronizar.`,
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `PRD criado em prds/${project}/${filename}\n\nCommit falhou — faça manualmente:\n  cd "${BRAIN_DATA_PATH}" && git add . && git commit -m "feat(prd): ${project} — ${title}"\n\nErro: ${err.message}`,
        },
      ],
    };
  }
}

// ─── get_project_context ─────────────────────────────────────────────────────

interface GetProjectContextArgs {
  project: string;
}

export async function getProjectContext(args: GetProjectContextArgs) {
  const { project } = args;

  // Skills agnósticas vêm do repo público; específicas do projeto, do privado.
  const globalSkills = readMarkdownFiles(
    join(BRAIN_TOOLS_PATH, "ai", "skills", "_global"),
    BRAIN_TOOLS_PATH
  );
  const projectSkills = readMarkdownFiles(
    join(BRAIN_DATA_PATH, "ai", "skills", project),
    BRAIN_DATA_PATH
  );
  const allSkills = [...globalSkills, ...projectSkills];

  const allPRDs = readMarkdownFiles(join(BRAIN_DATA_PATH, "prds", project), BRAIN_DATA_PATH);
  const activePRDs = allPRDs.filter(
    (f) =>
      !f.relativePath.includes("templates") &&
      ["todo", "in-progress"].includes(f.frontmatter.status ?? "todo")
  );

  const projectRefs = readMarkdownFiles(
    join(BRAIN_DATA_PATH, "projects", project),
    BRAIN_DATA_PATH
  );
  const prompts = readMarkdownFiles(join(BRAIN_TOOLS_PATH, "ai", "prompts"), BRAIN_TOOLS_PATH);

  // Behaviors: público é base, repo de dados pode sobrescrever/adicionar.
  const baseBehaviors = readMarkdownFiles(
    join(BRAIN_TOOLS_PATH, "behaviors"),
    BRAIN_TOOLS_PATH
  );
  const extraBehaviors = readMarkdownFiles(
    join(BRAIN_DATA_PATH, "behaviors"),
    BRAIN_DATA_PATH
  );
  const behaviors = [...baseBehaviors, ...extraBehaviors];

  const out: string[] = [
    `# Contexto: ${project}`,
    `_Gerado em ${new Date().toLocaleDateString("pt-BR")}_`,
    "",
  ];

  out.push(`## Skills (${allSkills.length})`);
  out.push(allSkills.length > 0 ? formatFileList(allSkills) : "_Nenhuma skill encontrada._");

  out.push(`\n## PRDs ativos (${activePRDs.length})`);
  out.push(
    activePRDs.length > 0
      ? formatFileList(activePRDs, { showContent: true })
      : "_Nenhum PRD ativo._"
  );

  out.push(`\n## Referências do projeto (${projectRefs.length})`);
  out.push(
    projectRefs.length > 0
      ? formatFileList(projectRefs, { showContent: true })
      : "_Nenhuma referência registrada._"
  );

  out.push(`\n## Comportamentos (${behaviors.length})`);
  out.push(
    behaviors.length > 0
      ? formatFileList(behaviors, { showContent: true, contentLimit: 1000 })
      : "_Nenhum comportamento definido._"
  );

  out.push(`\n## Prompts disponíveis (${prompts.length})`);
  out.push(prompts.length > 0 ? formatFileList(prompts) : "_Nenhum prompt salvo._");

  return { content: [{ type: "text", text: out.join("\n") }] };
}

// ─── search_prompts ──────────────────────────────────────────────────────────

interface SearchPromptsArgs {
  query?: string;
  tags?: string[];
  category?: string;
}

export async function searchPrompts(args: SearchPromptsArgs) {
  const { query, tags, category } = args;

  let files = readMarkdownFiles(join(BRAIN_TOOLS_PATH, "ai", "prompts"), BRAIN_TOOLS_PATH);

  if (category) {
    files = files.filter((f) =>
      f.relativePath.toLowerCase().includes(category.toLowerCase()) ||
      (f.frontmatter.category ?? "").toLowerCase().includes(category.toLowerCase())
    );
  }

  files = hybridSearch(files, { query, tags });
  files = scoreAndSort(files, query);

  return {
    content: [
      {
        type: "text",
        text:
          files.length === 0
            ? `Nenhum prompt encontrado${query ? ` para "${query}"` : ""}.`
            : `${files.length} prompt(s) encontrado(s):\n\n${formatFileList(files, { showContent: true })}`,
      },
    ],
  };
}
