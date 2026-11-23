#!/usr/bin/env bash
# run.sh — prepara o ambiente local, baixa o que falta e sobe backend + frontend.
#
#   ./run.sh           auto: Docker se disponível, senão modo local
#   ./run.sh --local   backend (npm) + frontend build/web servido com proxy em :8080
#   ./run.sh --docker  docker compose up --build -d (backend :3001, frontend :80)
#   ./run.sh --down    para serviços iniciados por este script
#   ./run.sh --status  saúde de backend e frontend
#   ./run.sh --help    esta ajuda
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUN_DIR="$ROOT/.run"
BACKEND_PORT="${BACKEND_PORT:-3001}"
LOCAL_FRONTEND_PORT="${LOCAL_FRONTEND_PORT:-8080}"
DOCKER_FRONTEND_PORT=80

MODE="auto"
ACTION="up"

log() { printf '[run] %s\n' "$*"; }
die() { printf '[run] ERRO: %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    --local) MODE="local" ;;
    --docker) MODE="docker" ;;
    --down) ACTION="down" ;;
    --status) ACTION="status" ;;
    --help | -h) usage; exit 0 ;;
    *) die "argumento desconhecido: $arg (use --help)" ;;
  esac
done

# ---------------------------------------------------------------- utilidades

http_ok() { curl -sf -o /dev/null --max-time 2 "$1" 2>/dev/null; }

backend_healthy() { http_ok "http://127.0.0.1:${BACKEND_PORT}/api/v2/health"; }

port_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3>&- && return 0
  return 1
}

wait_http() { # url, tentativas (1s cada)
  local url="$1" tries="${2:-30}" i=0
  while [ "$i" -lt "$tries" ]; do
    http_ok "$url" && return 0
    sleep 1
    i=$((i + 1))
  done
  return 1
}

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# ------------------------------------------------------------ preparação

ensure_env() {
  if [ ! -f backend/.env ]; then
    local secret
    secret="$(gen_secret)"
    sed "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" backend/.env.example >backend/.env
    chmod 600 backend/.env
    log "backend/.env criado a partir de .env.example (JWT_SECRET gerado)"
  fi
  mkdir -p data backend/uploads "$RUN_DIR"
}

require_local_tools() {
  command -v node >/dev/null 2>&1 || die "node não encontrado — instale Node 22+ ou use ./run.sh --docker"
  command -v npm >/dev/null 2>&1 || die "npm não encontrado — instale Node 22+ ou use ./run.sh --docker"
  command -v flutter >/dev/null 2>&1 || die "flutter não encontrado — instale o Flutter SDK ou use ./run.sh --docker"
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 22 ] || die "Node 22+ necessário (detectado $(node -v))"
}

install_backend_deps() {
  if [ ! -d backend/node_modules ] || [ backend/package-lock.json -nt backend/node_modules/.package-lock.json ]; then
    log "backend: npm ci"
    (cd backend && npm ci --no-audit --no-fund)
  else
    log "backend: dependências OK"
  fi
}

install_frontend_deps() {
  if [ ! -f frontend/.dart_tool/package_config.json ] ||
    [ frontend/pubspec.yaml -nt frontend/.dart_tool/package_config.json ] ||
    { [ -f frontend/pubspec.lock ] && [ frontend/pubspec.lock -nt frontend/.dart_tool/package_config.json ]; }; then
    log "frontend: flutter pub get"
    (cd frontend && flutter pub get)
    # pub get só regrava package_config.json quando a resolução muda; sem o
    # touch o pubspec.yaml (mtime de checkout) re dispara o get em todo run.
    touch frontend/.dart_tool/package_config.json
  else
    log "frontend: dependências OK"
  fi
}

build_frontend_web() {
  local stamp="frontend/build/web/main.dart.js"
  local srcs=() p
  for p in frontend/lib frontend/web frontend/assets frontend/pubspec.yaml frontend/pubspec.lock; do
    [ -e "$p" ] && srcs+=("$p")
  done
  if [ -f "$stamp" ] && ! find "${srcs[@]}" -newer "$stamp" -print -quit 2>/dev/null | grep -q .; then
    log "frontend: build web atualizado"
    return 0
  fi
  log "frontend: flutter build web --release (pode levar minutos na primeira vez)"
  (cd frontend && flutter build web --release --no-web-resources-cdn)
}

# ------------------------------------------------------------ modo local

start_backend_local() {
  if backend_healthy; then
    log "backend: já responde em :${BACKEND_PORT}"
    return 0
  fi
  port_open "$BACKEND_PORT" && die "porta ${BACKEND_PORT} em uso por outro processo (não é o backend)"
  log "backend: iniciando em :${BACKEND_PORT} (log em .run/backend.log)"
  (cd backend && exec nohup node src/server.js >>"$RUN_DIR/backend.log" 2>&1) &
  echo $! >"$RUN_DIR/backend.pid"
  if ! wait_http "http://127.0.0.1:${BACKEND_PORT}/api/v2/health" 30; then
    tail -20 "$RUN_DIR/backend.log" >&2 || true
    die "backend não respondeu em 30s"
  fi
  log "backend: saudável em :${BACKEND_PORT}"
}

start_frontend_local() {
  local url="http://127.0.0.1:${LOCAL_FRONTEND_PORT}/"
  if http_ok "$url"; then
    log "frontend: já responde em :${LOCAL_FRONTEND_PORT}"
    return 0
  fi
  port_open "$LOCAL_FRONTEND_PORT" && die "porta ${LOCAL_FRONTEND_PORT} em uso por outro processo"
  [ -f frontend/build/web/index.html ] || die "frontend/build/web ausente — rode ./run.sh sem --down antes"
  log "frontend: servindo build/web + proxy em :${LOCAL_FRONTEND_PORT} (log em .run/frontend.log)"
  (exec nohup node "$ROOT/scripts/local-serve.mjs" >>"$RUN_DIR/frontend.log" 2>&1) &
  echo $! >"$RUN_DIR/frontend.pid"
  if ! wait_http "$url" 15; then
    tail -20 "$RUN_DIR/frontend.log" >&2 || true
    die "frontend não respondeu em 15s"
  fi
  log "frontend: saudável em :${LOCAL_FRONTEND_PORT}"
}

up_local() {
  require_local_tools
  ensure_env
  install_backend_deps
  install_frontend_deps
  build_frontend_web
  start_backend_local
  start_frontend_local
}

# ------------------------------------------------------------ modo docker

up_docker() {
  command -v docker >/dev/null 2>&1 || die "docker não encontrado"
  docker info >/dev/null 2>&1 || die "daemon Docker indisponível — suba o Docker ou use ./run.sh --local"
  docker compose version >/dev/null 2>&1 || die "docker compose v2 indisponível"
  ensure_env
  log "docker: compose up --build -d (primeira vez baixa imagens e compila)"
  docker compose up --build -d
  if ! wait_http "http://127.0.0.1:${BACKEND_PORT}/api/v2/health" 120; then
    docker compose logs --tail 40 backend >&2 || true
    die "backend (container) não ficou saudável em 120s"
  fi
  if ! wait_http "http://127.0.0.1:${DOCKER_FRONTEND_PORT}/" 60; then
    docker compose logs --tail 40 frontend >&2 || true
    die "frontend (container) não ficou saudável em 60s"
  fi
  log "stack Docker saudável (backend :${BACKEND_PORT}, frontend :${DOCKER_FRONTEND_PORT})"
}

# ------------------------------------------------------------ down / status

down_all() {
  local stopped=0 name pidfile pid
  for name in backend frontend; do
    pidfile="$RUN_DIR/$name.pid"
    [ -f "$pidfile" ] || continue
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      log "$name local (pid $pid) parado"
      stopped=1
    fi
    rm -f "$pidfile"
  done
  if command -v docker >/dev/null 2>&1 && docker compose ps -q 2>/dev/null | grep -q .; then
    docker compose down
    stopped=1
  fi
  [ "$stopped" -eq 1 ] || log "nada em execução"
}

show_status() {
  if backend_healthy; then
    log "backend : OK (http://127.0.0.1:${BACKEND_PORT}/api/v2/health)"
  else
    log "backend : fora do ar (:${BACKEND_PORT})"
  fi
  if http_ok "http://127.0.0.1:${DOCKER_FRONTEND_PORT}/"; then
    log "frontend: OK em :${DOCKER_FRONTEND_PORT} (Docker/nginx)"
  elif http_ok "http://127.0.0.1:${LOCAL_FRONTEND_PORT}/"; then
    log "frontend: OK em :${LOCAL_FRONTEND_PORT} (local)"
  else
    log "frontend: fora do ar (:${DOCKER_FRONTEND_PORT}/:${LOCAL_FRONTEND_PORT})"
  fi
  if command -v docker >/dev/null 2>&1 && docker compose ps -q 2>/dev/null | grep -q .; then
    docker compose ps
  fi
}

print_summary() {
  local port="$DOCKER_FRONTEND_PORT"
  [ "$MODE" = "local" ] && port="$LOCAL_FRONTEND_PORT"
  printf '\n'
  log "Backend : http://localhost:${BACKEND_PORT}/api/v2/health"
  log "Frontend: http://localhost:${port}"
  log "Login   : admin@platform.local / Admin@123 (ou valores de backend/.env)"
  if [ "$MODE" = "local" ]; then
    log "Logs    : .run/backend.log .run/frontend.log"
    log "Parar   : ./run.sh --down"
  else
    log "Logs    : docker compose logs -f"
    log "Parar   : ./run.sh --down"
  fi
}

# ---------------------------------------------------------------- main

case "$ACTION" in
  down) down_all ;;
  status) show_status ;;
  up)
    if [ "$MODE" = "auto" ]; then
      if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 &&
        docker compose version >/dev/null 2>&1; then
        MODE="docker"
      else
        MODE="local"
      fi
      log "modo detectado: $MODE"
    fi
    if [ "$MODE" = "docker" ]; then up_docker; else up_local; fi
    print_summary
    ;;
esac
