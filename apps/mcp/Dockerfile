# CMMS HTTP MCP (Streamable HTTP on WORKORDER_SYSTEMS_MCP_PATH, default /mcp).
# Build from repository root:
#   docker build -f apps/mcp/Dockerfile -t workorder-systems-mcp:latest .
#
# Default listen port is 3000 (common for Railway, Fly, etc.). Platform may override via PORT.
# Run (set Supabase URL + anon key; set public origin behind HTTPS):
#   docker run --rm -p 3000:3000 \
#     -e SUPABASE_URL=https://xxx.supabase.co \
#     -e SUPABASE_ANON_KEY=eyJ... \
#     -e WORKORDER_SYSTEMS_PUBLIC_ORIGIN=https://mcp.example.com \
#     -e WORKORDER_SYSTEMS_TRUST_PROXY=true \
#     workorder-systems-mcp:latest
#
# Health: GET /health (no auth). MCP: POST /mcp with Bearer JWT.

# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY patches ./patches
COPY apps ./apps
COPY packages ./packages
COPY plugins ./plugins

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workorder-systems/sdk build && pnpm --filter mcp build

# Drop devDependencies for all workspace packages after artifacts exist in dist/.
ENV CI=true
RUN pnpm install --prod --frozen-lockfile

FROM node:20-bookworm-slim AS runner

WORKDIR /app/apps/mcp

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/
COPY --from=builder --chown=node:node /app/patches /app/patches
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/apps /app/apps
COPY --from=builder --chown=node:node /app/packages /app/packages
COPY --from=builder --chown=node:node /app/plugins /app/plugins

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http.js"]
