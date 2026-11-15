# compact.MD — contexto compactado da sessão

> Atualizado em [15/11 11:40] para restauração de contexto. Repo `/mnt/windows/git/inhome`, branch `dev`.
> Estado atual: `run.sh` criado e testado nos dois modos; stack Docker `inhome` up (backend:3001, frontend:80).

## Objetivo

- Criar `run.sh` que prepara o ambiente local, baia o que falta e sobe backend + frontend, com auto-detecção Docker/local (escolha do usuário: ambos, `--local` força modo npm + flutter).

## Entregas

- `run.sh` (raiz, executável): `--local` | `--docker` | auto (padrão), `--status`, `--down`, `--help`.
  - Prepara `backend/.env` (JWT_SECRET gerado via openssl) + dirs `data/`, `backend/uploads/`, `.run/`.
  - Baixa só o que falta: `npm ci` quando `package-lock.json` > `node_modules/.package-lock.json`; `flutter pub get` quando `pubspec.*` > `package_config.json` (com `touch` no package_config, senão o mtime de checkout re-dispara); `flutter build web --release --no-web-resources-cdn` quando fontes > `build/web/main.dart.js`; Docker: `docker compose up --build -d`.
  - Health-checks: backend `/api/v2/health` (:3001), frontend `:80` (Docker) / `:8080` (local); logs e pids em `.run/` (gitignored).
- `scripts/local-serve.mjs`: servidor Node zero-dep do `frontend/build/web` + proxy de `/api`, `/uploads`, `/socket.io` (HTTP + upgrade WebSocket) para `127.0.0.1:3001`, espelhando `frontend/nginx.conf` (SPA fallback, regras de cache).
- Docs: `README.md` seção "Rodar o projeto"; `TECHNICAL.md` Setup → "Rápido (recomendado)".

## Evidências

- Modo local: `./run.sh --local` verde (npm ci, pub get, build 204s, backend+frontend health OK); idempotente na 2ª execução; proxy validado (health via :8080, index 200, `main.dart.js` 200, WS upgrade `HTTP/1.1 101` + open packet do engine.io).
- Modo Docker: `./run.sh --docker` verde (build com cache, containers up, health :3001/:80, proxy nginx OK); `./run.sh` auto detectou docker; `--down` derruba pids locais e containers; `--bogus` exit 1.
- Bateria: backend `npm test` 173/173 (com `docker compose stop backend` — `server.test.js` fixa 3001), E2E `bash backend/test.sh` 183/183, `flutter test` 84/84.

## Decisões técnicas relevantes

- Frontend local não pode usar `flutter run -d web-server`: o app fala `/api/v2` relativo e `Uri.base.origin` no socket.io → precisa do proxy (mesmo motivo do nginx no compose).
- Modo local serve `build/web` (release) em vez de dev-server: mesmo bundle de produção, sem porta extra de debug.
- Portas: backend 3001, frontend local 8080, frontend Docker 80 (allowlist CORS do backend já cobre 8080).

## Pendências / próximos passos

- Commit + push em `dev` deste change-set (`run.sh`, `scripts/local-serve.mjs`, `.gitignore`, `README.md`, `TECHNICAL.md`, `compact.MD`).
- Obs.: commit alheio `72f4973 fix(manutenção): registra histórico sem trocar de estado` estava local não-push no momento do commit desta sessão; push leva os dois.
- Nada bloqueia promoção futura `dev` → `main` (suíte verde no momento do push).
