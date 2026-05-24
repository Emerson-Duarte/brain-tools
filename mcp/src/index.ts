#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { searchSkills } from "./tools/search-skills.js";
import { searchKnowledge } from "./tools/search-knowledge.js";
import { getBehavior } from "./tools/get-behavior.js";
import { searchProjects } from "./tools/search-projects.js";
import { addNote } from "./tools/add-note.js";
import {
  searchPRDs,
  createPRD,
  getProjectContext,
  searchPrompts,
} from "./tools/prd-skills-prompts.js";

const server = new Server(
  { name: "brain-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_project_context",
      description:
        "Carrega o contexto completo de um projeto: skills, PRDs ativos, referências históricas, comportamentos esperados e prompts. Chame no início de qualquer sessão de trabalho num projeto específico.",
      inputSchema: {
        type: "object",
        required: ["project"],
        properties: {
          project: { type: "string", description: "Nome do projeto" },
        },
      },
    },
    {
      name: "get_behavior",
      description:
        "Carrega os comportamentos e regras de como agir em um contexto específico (ex: code review, escrita de PRD, debugging). Chame antes de iniciar tarefas recorrentes para garantir consistência.",
      inputSchema: {
        type: "object",
        properties: {
          context: { type: "string", description: "Contexto. Ex: 'code review', 'prd writing', 'debugging'" },
          tags: { type: "array", items: { type: "string" }, description: "Tags para filtrar comportamentos" },
        },
      },
    },
    {
      name: "search_skills",
      description:
        "Busca skills disponíveis no brain por projeto, stack ou texto livre. Chame quando precisar executar uma skill ou descobrir quais existem.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Nome do projeto" },
          stack: { type: "string", description: "Tecnologia. Ex: 'nextjs', 'python'" },
          query: { type: "string", description: "Busca por texto livre" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "search_prds",
      description:
        "Busca PRDs por projeto, status ou texto. Chame para entender o contexto de features planejadas ou em andamento.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string" },
          query: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["todo", "in-progress", "done", "all"] },
        },
      },
    },
    {
      name: "create_prd",
      description:
        "Cria um PRD no brain para um projeto e faz commit automático. Chame quando o usuário pedir para documentar uma feature ou task.",
      inputSchema: {
        type: "object",
        required: ["project", "title", "content"],
        properties: {
          project: { type: "string" },
          title: { type: "string" },
          content: { type: "string", description: "Conteúdo completo em Markdown" },
          status: { type: "string", enum: ["todo", "in-progress", "done"] },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "search_knowledge",
      description:
        "Busca na base de conhecimento do brain: boas práticas de engenharia, arquitetura, notas pessoais, referências e recursos curados. Chame quando precisar de contexto técnico ou referências anteriores.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Busca por texto" },
          tags: { type: "array", items: { type: "string" } },
          category: {
            type: "string",
            enum: ["engineering", "architecture", "references", "notes", "resources", "all"],
            description: "Categoria do conhecimento",
          },
          project: { type: "string", description: "Filtrar por projeto associado" },
        },
      },
    },
    {
      name: "search_projects",
      description:
        "Busca referências de projetos anteriores: decisões técnicas, post-mortems, aprendizados. Chame para não repetir erros ou reutilizar soluções já validadas.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Nome do projeto" },
          query: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          type: {
            type: "string",
            enum: ["decision", "postmortem", "learnings", "reference", "all"],
          },
        },
      },
    },
    {
      name: "add_note",
      description:
        "Salva uma nota, insight, boa prática, recurso ou referência no brain com commit automático. Chame quando o usuário quiser registrar algo aprendido durante a sessão. Escolha a categoria conforme o critério: 'engineering' para padrões de código, boas práticas, como tratar erros, como estruturar testes, convenções de implementação; 'architecture' para decisões de design de sistema, escolhas de stack, estrutura de serviços, tradeoffs arquiteturais; 'references' para documentações técnicas, specs de APIs externas, guias de bibliotecas que serão consultados novamente; 'notes' para insights pessoais, aprendizados livres, reflexões e observações que não se encaixam nas outras categorias; 'resources' para links externos úteis — artigos, repos, ferramentas, videos — sempre com url preenchida.",
      inputSchema: {
        type: "object",
        required: ["title", "content", "category"],
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "Conteúdo da nota em Markdown" },
          category: {
            type: "string",
            enum: ["engineering", "architecture", "references", "notes", "resources"],
            description: [
              "engineering: padrões de código, boas práticas, tratamento de erros, testes, convenções de implementação.",
              "architecture: decisões de design de sistema, escolhas de stack, estrutura de serviços, tradeoffs arquiteturais.",
              "references: documentações técnicas, specs de APIs externas, guias de bibliotecas para consulta futura.",
              "notes: insights pessoais, aprendizados livres, reflexões que não se encaixam nas outras categorias.",
              "resources: links externos úteis (artigos, repos, ferramentas, vídeos) — sempre preencha o campo url.",
            ].join(" | "),
          },
          tags: { type: "array", items: { type: "string" } },
          project: { type: "string", description: "Associar a um projeto específico (opcional)" },
          url: { type: "string", description: "URL obrigatória quando category='resources'" },
        },
      },
    },
    {
      name: "search_prompts",
      description:
        "Busca prompts reutilizáveis no brain. Chame quando precisar de um prompt específico para tarefas recorrentes.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          category: { type: "string", description: "Ex: 'engineering', 'product', 'writing'" },
        },
      },
    },
  ],
}));

// ─── Tool handlers ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_project_context": return await getProjectContext(args as any);
      case "get_behavior":        return await getBehavior(args as any);
      case "search_skills":       return await searchSkills(args as any);
      case "search_prds":         return await searchPRDs(args as any);
      case "create_prd":          return await createPRD(args as any);
      case "search_knowledge":    return await searchKnowledge(args as any);
      case "search_projects":     return await searchProjects(args as any);
      case "add_note":            return await addNote(args as any);
      case "search_prompts":      return await searchPrompts(args as any);
      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Erro: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
