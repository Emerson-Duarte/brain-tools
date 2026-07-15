import { join } from "path";
import {
  BRAIN_DATA_PATH,
  readMarkdownFiles,
  hybridSearch,
  scoreAndSort,
  formatFileList,
  formatPointerList,
} from "../brain.js";

interface SearchKnowledgeArgs {
  query?: string;
  tags?: string[];
  category?: "engineering" | "architecture" | "references" | "notes" | "resources" | "all";
  project?: string;
  verbose?: boolean; // true = conteúdo inline (600 chars); default = ponteiros (econômico)
}

const CATEGORY_DIRS: Record<string, string> = {
  engineering:  "knowledge/engineering",
  architecture: "knowledge/architecture",
  references:   "knowledge/references",
  notes:        "knowledge/notes",
  resources:    "knowledge/resources",
};

export async function searchKnowledge(args: SearchKnowledgeArgs) {
  const { query, tags, category = "all", project, verbose = false } = args;

  const dirs =
    category === "all"
      ? Object.values(CATEGORY_DIRS).map((d) => join(BRAIN_DATA_PATH, d))
      : [join(BRAIN_DATA_PATH, CATEGORY_DIRS[category] ?? "knowledge")];

  let files = dirs.flatMap((d) => readMarkdownFiles(d, BRAIN_DATA_PATH));

  files = hybridSearch(files, { query, tags, project });
  files = scoreAndSort(files, query);

  const count = files.length;
  if (count === 0) {
    return {
      content: [
        {
          type: "text",
          text: `Nenhum resultado na base de conhecimento para: ${query ?? "(sem query)"}${tags ? ` [tags: ${tags.join(", ")}]` : ""}`,
        },
      ],
    };
  }

  const header = `Encontrei ${count} item(s) na base de conhecimento:\n\n`;
  const body = verbose
    ? formatFileList(files, { showContent: true })
    : formatPointerList(files);
  return {
    content: [{ type: "text", text: header + body }],
  };
}
