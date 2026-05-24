FROM node:22-alpine

WORKDIR /brain-tools/mcp

# Instala dependências de produção
COPY mcp/package*.json ./
RUN npm ci --omit=dev

# Copia o código compilado
COPY mcp/dist ./dist

# Dois volumes são esperados em runtime:
#   /brain-tools (este repo)   → skills/behaviors/prompts agnósticos
#   /brain-data  (repo privado) → projects/prds/knowledge/settings
ENV BRAIN_TOOLS_PATH=/brain-tools
ENV BRAIN_DATA_PATH=/brain-data

# MCP usa stdio — sem porta exposta
CMD ["node", "dist/index.js"]
