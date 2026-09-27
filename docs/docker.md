# Docker

Run the full stack (backend + frontend) with Docker Compose. No local Node or Flutter SDK required — the frontend is built inside the Flutter SDK image.

## Requirements

- Docker 24+ with Compose v2 (tested with Docker 29.8.1 / Compose v5.5.1)

## Quick start

```sh
cp backend/.env.example backend/.env   # JWT_SECRET etc. (optional but recommended)
docker compose up --build -d
```

Open http://localhost:80 — login with the seeded platform admin (`admin@platform.local` / `Admin@123` unless overridden in `.env`).

First build downloads the Flutter SDK image (`ghcr.io/cirruslabs/flutter:stable`, ~2 GB) and compiles Flutter Web — expect several minutes. Subsequent builds reuse the layer cache.

## Ports

| Service  | Container | Host  | Purpose                          |
|----------|-----------|-------|----------------------------------|
| backend  | 3001      | 3001  | REST API + Socket.io             |
| frontend | 80        | 8080  | Flutter Web app (nginx, SPA)     |

The browser stays same-origin: nginx proxies `/api/` and `/socket.io/` to the backend on 3001 (see `frontend/nginx.conf`), so no CORS headers are needed. The backend allowlist (`http://localhost`, `:80`, `:8080`, `:3000`) only matters when opening port 3001 directly.

## Volumes

| Host path           | Container path | Contents                          |
|---------------------|----------------|-----------------------------------|
| `./data`            | `/app/data`    | `platform.db` + `domains/<id>.db` (AD-002) |
| `./backend/uploads` | `/app/uploads` | completion photos/attachments (AD-005) |

Both paths are set explicitly via `DATA_DIR` / `UPLOAD_DIR`; the defaults in code resolve relative to `__dirname` and would land outside `/app` in the container. Deleting the host directories recreates them (admin user re-seeded; uploads are lost).

## Configuration

`backend/.env` is loaded through Compose `env_file` (`required: false` — the stack starts without it, but `JWT_SECRET` is required for login; see `backend/src/middleware/auth.js`). Keys: `PORT`, `JWT_SECRET`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, optional `SMTP_*`.

`.env` is not baked into images (`.dockerignore`) and must not be committed.

## Common commands

```sh
docker compose up --build -d          # build + start detached
docker compose logs -f backend        # follow API logs
docker compose ps                     # service status
docker compose down                   # stop (volumes on host persist)
docker compose build --no-cache       # force full rebuild
```

## Backend tests

`npm test` needs devDependencies (`supertest`, `socket.io-client`), which the image omits (`npm ci --omit=dev`). Run tests on the host instead:

```sh
cd backend && npm ci && npm test      # expected: 28/28 pass
```
