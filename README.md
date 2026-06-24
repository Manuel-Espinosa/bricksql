# BrickSQL

Self-hosted, mobile-first SQL client for querying MySQL and PostgreSQL databases from any device. Designed to run behind [Tailscale](https://tailscale.com) or any private network — no cloud, no telemetry.

Built with NestJS + React + Tailwind. Data is persisted as JSON files on the host.

> **Early release.** Core features work today: raw SQL, SELECT queries with JOINs, Builder Mode, and AI-assisted querying via a local Ollama model. Save and reload named queries per connection. Not yet ready for multi-user or production-critical use.

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

## Connecting to databases

BrickSQL runs inside Docker but can reach databases in most common setups:

- **Databases on the internet** — work out of the box.
- **Databases running directly on your host** — use `host.docker.internal` as the hostname (e.g. `host.docker.internal:5432`). This is pre-configured in the included `docker-compose.yml`.
- **Databases in another Docker container with a port exposed to the host** — same as above, connect via `host.docker.internal:<port>`.
- **Databases in another Docker container without an exposed port** — BrickSQL won't be able to reach them by default. You'll need to attach BrickSQL to that container's network manually using the `networks` key in your compose file.

## Environment variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable            | Required | Description                                          |
|---------------------|----------|------------------------------------------------------|
| `BRICKSQL_USER`     | yes      | Username for login                                   |
| `BRICKSQL_PASSWORD` | yes      | Password for login                                   |
| `JWT_SECRET`        | yes      | Secret used to sign auth tokens — keep it random     |
| `PORT`              | no       | Host port for the container (default: `3000`) — production only; dev mode uses `PORT_BACK` / `PORT_FRONT` / `PORT_DB` |
| `DATA_DIR`          | no       | Path where JSON data is stored (default: `/data`)    |
| `OLLAMA_URL`        | no       | Ollama base URL to enable AI mode (e.g. `http://host.docker.internal:11434`) |

## Running for development

Requirements: Docker

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

By default: backend on `PORT_BACK` (5050), frontend on `PORT_FRONT` (5172), demo MySQL on `PORT_DB` (3001). Open `http://localhost:5172`.

The dev stack includes a seeded MySQL demo database (`demo-db`) with `users` and `countries` tables — useful for testing JOINs right away. Connect to it from the app with host `demo-db`, port `3306`, user `demo`, password `demo`, database `demo`.

## Building the Docker image locally

```bash
docker build -t bricksql .
```

The build is multi-stage: it compiles the frontend, compiles the backend, then produces a minimal production image that serves both from a single Node process on port `3000`.

## License

BrickSQL is licensed under the [Business Source License 1.1](LICENSE).

**Personal, non-commercial self-hosted use is permitted for free.** On 2030-06-23, the license converts to Apache 2.0.
