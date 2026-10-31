# ── Stage 1: Build (frontend + backend) ──────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile
COPY . .
# Backend first: nest build cleans dist/, the client then writes dist/public
RUN pnpm run build
RUN pnpm --filter ./client run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Install only the backend's production deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --prod --filter bricksql

# Copy compiled backend and frontend (client builds into dist/public)
COPY --from=builder /app/dist ./dist

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "dist/main"]
