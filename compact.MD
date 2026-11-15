# compact.MD — contexto compactado da sessão

> Atualizado em [15/11 11:45] para restauração de contexto. Repo `/mnt/windows/git/inhome`, branch `dev`.
> Estado atual: HEAD `cdc0969` = `origin/dev` (em sincronia). Stack Docker `inhome` up (backend:3001, frontend:80). Duas sessões paralelas em 15/11: (A) `run.sh`, (B) fix de manutenção no mesmo estado — resumo das duas abaixo.

## Sessão A — `run.sh` (preparar e subir o ambiente)

### Objetivo

- Criar `run.sh` que prepara o ambiente local, baixa o que falta e sobe backend + frontend, com auto-detecção Docker/local (escolha do usuário: ambos, `--local` força modo npm + flutter).

### Entregas

- `run.sh` (raiz, executável): `--local` | `--docker` | auto (padrão), `--status`, `--down`, `--help`.
  - Prepara `backend/.env` (JWT_SECRET gerado via openssl) + dirs `data/`, `backend/uploads/`, `.run/`.
  - Baixa só o que falta: `npm ci` quando `package-lock.json` > `node_modules/.package-lock.json`; `flutter pub get` quando `pubspec.*` > `package_config.json` (com `touch` no package_config, senão o mtime de checkout re-dispara); `flutter build web --release --no-web-resources-cdn` quando fontes > `build/web/main.dart.js`; Docker: `docker compose up --build -d`.
  - Health-checks: backend `/api/v2/health` (:3001), frontend `:80` (Docker) / `:8080` (local); logs e pids em `.run/` (gitignored).
- `scripts/local-serve.mjs`: servidor Node zero-dep do `frontend/build/web` + proxy de `/api`, `/uploads`, `/socket.io` (HTTP + upgrade WebSocket) para `127.0.0.1:3001`, espelhando `frontend/nginx.conf` (SPA fallback, regras de cache).
- Docs: `README.md` seção "Rodar o projeto"; `TECHNICAL.md` Setup → "Rápido (recomendado)".

### Evidências

- Modo local: `./run.sh --local` verde (npm ci, pub get, build 204s, backend+frontend health OK); idempotente na 2ª execução; proxy validado (health via :8080, index 200, `main.dart.js` 200, WS upgrade `HTTP/1.1 101` + open packet do engine.io).
- Modo Docker: `./run.sh --docker` verde (build com cache, containers up, health :3001/:80, proxy nginx OK); `./run.sh` auto detectou docker; `--down` derruba pids locais e containers; `--bogus` exit 1.
- Bateria: backend `npm test` 173/173 (com `docker compose stop backend` — `server.test.js` fixa 3001), E2E `bash backend/test.sh` 183/183, `flutter test` 84/84.

### Decisões técnicas relevantes

- Frontend local não pode usar `flutter run -d web-server`: o app fala `/api/v2` relativo e `Uri.base.origin` no socket.io → precisa do proxy (mesmo motivo do nginx no compose).
- Modo local serve `build/web` (release) em vez de dev-server: mesmo bundle de produção, sem porta extra de debug.
- Portas: backend 3001, frontend local 8080, frontend Docker 80 (allowlist CORS do backend já cobre 8080).

## Sessão B — Fix: manutenção registrava histórico no mesmo estado

### Objetivo

- Bug relatado: no sheet de detalhe da tarefa, o botão **Aplicar manutenção** ficava inerte quando a escolha era o mesmo estado da tarefa, impedindo anotar informação nova no histórico.

### Causa (duas camadas)

- `frontend/lib/widgets/task_detail_sheet.dart`: `canApply` exigia `_maintenanceStatus != _task?.status` e `_maintain()` descartava a chamada com estado igual.
- `backend/src/routes/tasks.js` (`maintainTaskStatus`): mesmo estado respondia 400 `TASK_MAINTENANCE_NOOP`.

### Entregas (`72f4973`)

- Backend: 400 NOOP removido; `sameState` protege o `UPDATE` (linha da tarefa intocada, `completed_*` de Concluída preservado); nota no histórico vira `<estado>: <motivo>` no mesmo estado e continua `<old> → <new>: <motivo>` em troca real; `motivo` continua obrigatório.
- Frontend: `canApply` só exige escolha preenchida + motivo não vazio + sem requisição em voo; snackbar "Manutenção registrada"; caso `TASK_MAINTENANCE_NOOP` removido do `_errorText`; doc comments de `_maintain`/`_buildMaintenanceSection`/`ApiService.maintainTask` atualizados.
- Testes: `tasks.test.js` (mesmo estado → 200, status inalterado, nota `Revisão: mesmo estado`), `backend/test.sh` (200 + estado mantido + nota `A Fazer: estado repetido`), `task_detail_sheet_test.dart` (mesmo estado habilita o botão + teste novo de POST/fechamento no mesmo estado).
- Docs: `specs/plan/E012.md` amendado (edge case e Independent Test); `specs/00014-*` **não** alterado — `qc-report.md`/`.qc-passed` são selados por SHA-256; `TODO.md` Done com a entrada do bug.

### Evidências

- `npm --prefix backend test` 173/173; `bash backend/test.sh` 183/183; `flutter test` 84/84; `flutter analyze` 0 issues.

### Pendências / próximos passos

- ~~Commit + push em `dev`~~ concluído: `72f4973` (fix) e `cdc0969` (`run.sh`) em `origin/dev`. O `git push` direto falha neste ambiente (sem `credential.helper`/`gh`/SSH); a autenticação sai do `.git_token` da raiz — usar `git -c credential.helper='!f() { echo username=x-access-token; echo "password=$(cat .git_token)"; }; f' push origin dev`.
- `compact.MD` commitado em seguida (docs).
- Nada bloqueia promoção futura `dev` → `main` (suíte verde no momento do push).
