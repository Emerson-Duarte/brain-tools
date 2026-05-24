import { join } from "path";
import { existsSync } from "fs";
import {
  BRAIN_TOOLS_PATH,
  BRAIN_DATA_PATH,
  readMarkdownFiles,
  hybridSearch,
  scoreAndSort,
  formatFileList,
} from "../brain.js";

interface SearchSkillsArgs {
  project?: string;
  stack?: string;
  query?: string;
  tags?: string[];
}

export async function searchSkills(args: SearchSkillsArgs) {
  const { project, stack, query, tags } = args;

  // Skills globais (agnósticas) vivem no repo público; skills por projeto vivem no repo de dados.
  const globalDir = join(BRAIN_TOOLS_PATH, "ai", "skills", "_global");
  let files = readMarkdownFiles(globalDir, BRAIN_TOOLS_PATH);

  if (project) {
    const projectDir = join(BRAIN_DATA_PATH, "ai", "skills", project);
    if (existsSync(projectDir)) {
      files = [...files, ...readMarkdownFiles(projectDir, BRAIN_DATA_PATH)];
    }
  } else {
    // Sem projeto: agrega globais + todas as skills de projetos do repo de dados
    const dataSkillsDir = join(BRAIN_DATA_PATH, "ai", "skills");
    if (existsSync(dataSkillsDir)) {
      files = [...files, ...readMarkdownFiles(dataSkillsDir, BRAIN_DATA_PATH)];
    }
  }

  // Filtro por stack (frontmatter.stack ou frontmatter.tags ou conteúdo)
  if (stack) {
    const s = stack.toLowerCase();
    files = files.filter(
      (f) =>
        (f.frontmatter.stack ?? []).some((st: string) => st.toLowerCase().includes(s)) ||
        (f.frontmatter.tags ?? []).some((t: string) => t.toLowerCase().includes(s)) ||
        f.content.toLowerCase().includes(s)
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
            ? "Nenhuma skill encontrada."
            : `${files.length} skill(s) encontrada(s):\n\n${formatFileList(files)}`,
      },
    ],
  };
}
