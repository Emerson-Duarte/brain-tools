import { join } from "path";
import { existsSync } from "fs";
import {
  BRAIN_TOOLS_PATH,
  BRAIN_DATA_PATH,
  readMarkdownFiles,
  hybridSearch,
  formatFileList,
} from "../brain.js";

interface GetBehaviorArgs {
  context?: string;   // ex: "code review", "prd writing", "debugging"
  tags?: string[];
}

export async function getBehavior(args: GetBehaviorArgs) {
  const { context, tags } = args;

  // Behaviors agnósticos do repo público + overrides/extras opcionais do repo de dados.
  let files = readMarkdownFiles(join(BRAIN_TOOLS_PATH, "behaviors"), BRAIN_TOOLS_PATH);
  const dataBehaviorsDir = join(BRAIN_DATA_PATH, "behaviors");
  if (existsSync(dataBehaviorsDir)) {
    files = [...files, ...readMarkdownFiles(dataBehaviorsDir, BRAIN_DATA_PATH)];
  }

  files = hybridSearch(files, { query: context, tags });

  if (files.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: [
            `Nenhum comportamento definido para o contexto: "${context ?? "geral"}"`,
            ``,
            `Dica: adicione arquivos .md em behaviors/ (público) ou no repo de dados com o frontmatter:`,
            `---`,
            `title: "Como agir em code reviews"`,
            `tags: [code-review, engineering]`,
            `---`,
          ].join("\n"),
        },
      ],
    };
  }

  const intro = [
    `## Comportamentos esperados para: "${context ?? "contexto geral"}"`,
    ``,
    `Os seguintes comportamentos foram definidos para este contexto.`,
    `Siga-os durante toda esta sessão de trabalho.`,
    ``,
  ].join("\n");

  return {
    content: [
      {
        type: "text",
        text: intro + formatFileList(files, { showContent: true, contentLimit: 2000 }),
      },
    ],
  };
}
