# BrickSQL

Self-hosted, mobile-first SQL client for querying MySQL and PostgreSQL databases from any device. Designed to run behind [Tailscale](https://tailscale.com) or any private network — no cloud, no telemetry.

Built with NestJS + React + Tailwind. Data is persisted as JSON files on the host.

## Features

- Connect to MySQL and PostgreSQL databases
- Raw SQL editor with keyboard shortcut (`Ctrl+Enter` / `Cmd+Enter`)
- Visual query builder — assemble SELECT queries with WHERE, JOIN, ORDER BY, and LIMIT blocks
- Save and reload named queries per connection
- CSV export of results
- Single-user auth via environment variables — no setup screen

## Running with Docker

Create a `docker-compose.yml`:

```yaml
services:
  bricksql:
    image: ghcr.io/manuel-espinosa/bricksql:latest
    ports:
      - "3000:3000"
    volumes:
      - bricksql-data:/data
    environment:
      BRICKSQL_USER: admin
      BRICKSQL_PASSWORD: changeme
      JWT_SECRET: change-this-to-a-random-secret
    restart: unless-stopped

volumes:
  bricksql-data:
```

Then run:

```bash
docker compose up -d
```

Open `http://localhost:3000` in your browser.

## Environment variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable            | Required | Description                                          |
|---------------------|----------|------------------------------------------------------|
| `BRICKSQL_USER`     | yes      | Username for login                                   |
| `BRICKSQL_PASSWORD` | yes      | Password for login                                   |
| `JWT_SECRET`        | yes      | Secret used to sign auth tokens — keep it random     |
| `PORT`              | no       | Port to listen on (default: `3000`)                  |
| `DATA_DIR`          | no       | Path where JSON data is stored (default: `/data`)    |
| `OLLAMA_URL`        | no       | Ollama base URL to enable AI mode (e.g. `http://host.docker.internal:11434`) |
| `OLLAMA_MODEL`      | no       | Ollama model to use for SQL generation (e.g. `qwen2.5-coder:7b`) |

## Running for development

Requirements: Node 22+

```bash
# Install backend deps
npm install

# Install frontend deps
cd client && npm install && cd ..

# Start both in watch mode
docker compose -f docker-compose.dev.yml up
```

The backend runs on port `3000` and the Vite dev server on port `5173`. Open `http://localhost:5173`.

## Building the Docker image locally

```bash
docker build -t bricksql .
```

The build is multi-stage: it compiles the frontend, compiles the backend, then produces a minimal production image that serves both from a single Node process on port `3000`.
