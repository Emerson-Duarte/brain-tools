import { join } from "path";
import {
  BRAIN_DATA_PATH,
  readMarkdownFiles,
  hybridSearch,
  scoreAndSort,
  formatFileList,
} from "../brain.js";

interface SearchProjectsArgs {
  project?: string;
  query?: string;
  tags?: string[];
  type?: "decision" | "postmortem" | "learnings" | "reference" | "all";
}

export async function searchProjects(args: SearchProjectsArgs) {
  const { project, query, tags, type = "all" } = args;

  let files = readMarkdownFiles(join(BRAIN_DATA_PATH, "projects"), BRAIN_DATA_PATH);

  // Filtro por projeto específico
  if (project) {
    files = files.filter((f) =>
      f.relativePath.toLowerCase().includes(project.toLowerCase()) ||
      (f.frontmatter.project ?? "").toLowerCase() === project.toLowerCase()
    );
  }

  // Filtro por tipo de documento
  if (type !== "all") {
    files = hybridSearch(files, { query, tags, type });
  } else {
    files = hybridSearch(files, { query, tags });
  }

  files = scoreAndSort(files, query);

  if (files.length === 0) {
    const ctx = [
      project ? `projeto "${project}"` : null,
      type !== "all" ? `tipo "${type}"` : null,
      query ? `"${query}"` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      content: [
        {
          type: "text",
          text: [
            `Nenhuma referência de projeto encontrada${ctx ? ` para ${ctx}` : ""}.`,
            ``,
            `Dica: adicione documentos em <repo-de-dados>/projects/NOME-DO-PROJETO/ com frontmatter:`,
            `---`,
            `title: "Decisão: migrar para PostgreSQL"`,
            `project: "nome-do-projeto"`,
            `type: decision   # decision | postmortem | learnings | reference`,
            `tags: [database, migration]`,
            `---`,
          ].join("\n"),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text:
          `Encontrei ${files.length} referência(s) de projetos:\n\n` +
          formatFileList(files, { showContent: true }),
      },
    ],
  };
}
