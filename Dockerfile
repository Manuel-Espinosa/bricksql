# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --fetch-retries 5 --fetch-retry-mintimeout 10000 --fetch-retry-maxtimeout 60000
COPY client/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --fetch-retries 5 --fetch-retry-mintimeout 10000 --fetch-retry-maxtimeout 60000
COPY . .
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --fetch-retries 5 --fetch-retry-mintimeout 10000 --fetch-retry-maxtimeout 60000

# Copy compiled backend
COPY --from=backend-builder /app/dist ./dist

# Copy compiled frontend into the path NestJS serves
COPY --from=frontend-builder /app/dist/public ./dist/public

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "dist/main"]
