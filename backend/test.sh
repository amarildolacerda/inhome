#!/bin/bash
# End-to-end smoke test for the backend API.
#
# Isolation (same mechanism as src/support/testenv.js): DATA_DIR points at a
# throwaway temp directory, so backend/data/ is never read or written, and the
# server binds PORT 3199 — port 3001 belongs to the running Docker stack.
set -u

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3199
BASE="http://localhost:${PORT}"

DATA_DIR="$(mktemp -d)"
SERVER_LOG="$(mktemp)"
RESP_FILE="$(mktemp)"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -f "$RESP_FILE" "$SERVER_LOG"
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT INT TERM

# --- credentials ------------------------------------------------------------
# database.js seeds the platform admin from PLATFORM_ADMIN_* on first open of
# platform.db; read them from .env instead of hardcoding. dotenv does not
# override exported variables, so PORT and DATA_DIR survive the load.
env_get() {
  sed -n "s/^$1=//p" "$BASE_DIR/.env" | sed -n '1p'
}
if [ ! -f "$BASE_DIR/.env" ]; then
  echo "FAIL  .env not found at $BASE_DIR/.env"
  exit 1
fi
SYS_EMAIL="$(env_get PLATFORM_ADMIN_EMAIL)"
SYS_PASSWORD="$(env_get PLATFORM_ADMIN_PASSWORD)"
if [ -z "$SYS_EMAIL" ] || [ -z "$SYS_PASSWORD" ]; then
  echo "FAIL  .env must define PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD"
  exit 1
fi

# --- helpers ----------------------------------------------------------------
STATUS=""
BODY=""

api() { # method path [json_body] [token]
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-s -o "$RESP_FILE" -w '%{http_code}' -X "$method" "$BASE$path"
    -H 'Content-Type: application/json')
  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [ -n "$data" ]; then
    args+=(-d "$data")
  fi
  STATUS="$(curl "${args[@]}")"
  BODY="$(cat "$RESP_FILE")"
}

jget() { # dotted key -> value ("null" for JSON null, "" when absent)
  printf '%s' "$BODY" | node -e '
    let d = "";
    process.stdin.on("data", c => d += c);
    process.stdin.on("end", () => {
      let v = JSON.parse(d);
      for (const k of process.argv[1].split(".")) {
        if (v === null || v === undefined) { v = undefined; break; }
        v = v[k];
      }
      process.stdout.write(v === undefined ? "" : v === null ? "null" : String(v));
    });' "$1"
}

PASS=0
FAIL=0
TOTAL=0

fail_detail() {
  printf '      expected %s — got %s | body: %s\n' "$1" "$2" "${BODY:-<empty>}"
}

check_http() { # label expected_status
  TOTAL=$((TOTAL + 1))
  if [ "$STATUS" = "$2" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-52s HTTP %s\n' "$1" "$STATUS"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-52s expected HTTP %s, got %s\n' "$1" "$2" "$STATUS"
    fail_detail "HTTP $2" "$STATUS"
  fi
}

check_val() { # label expected actual
  TOTAL=$((TOTAL + 1))
  if [ "$3" = "$2" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-52s %s\n' "$1" "$2"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-52s expected %s, got %s\n' "$1" "$2" "${3:-<empty>}"
    fail_detail "$2" "${3:-<empty>}"
  fi
}

check_nonempty() { # label actual
  TOTAL=$((TOTAL + 1))
  if [ -n "$2" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-52s %s\n' "$1" "$2"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-52s empty\n' "$1"
    fail_detail "non-empty" "empty"
  fi
}

jcount() { # array_key name -> number of rows with that name in $RESP_FILE
  node -e '
    const fs = require("fs");
    let rows = [];
    try {
      const doc = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      rows = doc[process.argv[2]] || [];
    } catch (_) { rows = []; }
    process.stdout.write(String(rows.filter((r) => r && r.name === process.argv[3]).length));
  ' "$RESP_FILE" "$1" "$2"
}

jcount_true() { # array_key bool_key -> rows where the key is strictly true
  node -e '
    const fs = require("fs");
    let rows = [];
    try {
      const doc = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      rows = doc[process.argv[2]] || [];
    } catch (_) { rows = []; }
    const key = process.argv[3];
    process.stdout.write(String(rows.filter((r) => r && r[key] === true).length));
  ' "$RESP_FILE" "$1" "$2"
}

# --- start server -----------------------------------------------------------
export DATA_DIR
export PORT
# E003: isolates evidence files the same way DATA_DIR isolates the database.
export UPLOAD_DIR="$DATA_DIR/uploads"
if [ -n "$(env_get JWT_SECRET)" ]; then
  export JWT_SECRET="$(env_get JWT_SECRET)"
fi

# --- fake OpenCode CLI (T030) ----------------------------------------------
# The analysis job spawns `OPENCODE_BIN OPENCODE_ARGS run <prompt>`; pointing
# both at a node script that prints a valid analysis payload keeps the whole
# análise → aprovação → evento flow deterministic without the real OpenCode.
FAKE_CLI="$DATA_DIR/fake-opencode.js"
cat > "$FAKE_CLI" << 'FAKE'
process.stdout.write(JSON.stringify({
  tasks: [
    {
      title: 'Inspecionar telhado',
      description: 'Vistoria completa antes da impermeabilização',
      justificativa: 'Base precisa estar ímpar para aderência',
    },
    {
      title: 'Aplicar impermeabilizante',
      description: 'Duas demãos cruzadas',
      justificativa: 'Cobertura exposta a chuva forte',
    },
  ],
}));
FAKE
export OPENCODE_BIN=node
export OPENCODE_ARGS="$FAKE_CLI"

echo "Starting server on $BASE (DATA_DIR=$DATA_DIR)..."
(cd "$BASE_DIR" && exec node src/server.js >"$SERVER_LOG" 2>&1) &
SERVER_PID=$!

READY=0
i=0
while [ "$i" -lt 60 ]; do
  code="$(curl -s -m 1 -o /dev/null -w '%{http_code}' "$BASE/api/v2/health" 2>/dev/null)"
  if [ "$code" = "200" ]; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.5
  i=$((i + 1))
done

if [ "$READY" -ne 1 ]; then
  echo "FAIL  server did not become ready on $BASE"
  echo "--- server log ---"
  cat "$SERVER_LOG"
  exit 1
fi

# --- 1. health --------------------------------------------------------------
echo ""
echo "=== 1. Health Check ==="
api GET /api/v2/health
check_http "GET /api/v2/health" 200

# --- 2. platform admin login (no domainId) ---------------------------------
echo ""
echo "=== 2. Platform Admin Login ==="
api POST /api/v2/auth/login "{\"email\":\"$SYS_EMAIL\",\"password\":\"$SYS_PASSWORD\"}"
check_http "POST /api/v2/auth/login (platform)" 200
SYS_TOKEN="$(jget token)"
check_val "platform session domainId is null" "null" "$(jget domainId)"

# --- 3. enable a domain -----------------------------------------------------
echo ""
echo "=== 3. Enable Domain ==="
api POST /api/v2/domains/enable '{"name":"Smoke Test Domain","adminName":"Smoke Admin","adminEmail":"smoke-admin@example.com","adminPassword":"Secret1!"}' "$SYS_TOKEN"
check_http "POST /api/v2/domains/enable" 201
DOMAIN_ID="$(jget domain.id)"

# --- 4. domain admin login, auto-resolution (no domainId) -------------------
echo ""
echo "=== 4. Domain Admin Login (auto-resolution) ==="
api POST /api/v2/auth/login '{"email":"smoke-admin@example.com","password":"Secret1!"}'
check_http "POST /api/v2/auth/login (domain admin, no domainId)" 200
ADMIN_TOKEN="$(jget token)"
check_nonempty "domain admin domainId set" "$(jget domainId)"
check_val "domain admin role" "admin" "$(jget user.role)"
check_val "resolved to created domain" "$DOMAIN_ID" "$(jget domainId)"

# --- 5. create a user -------------------------------------------------------
echo ""
echo "=== 5. Create User ==="
api POST /api/v2/users '{"name":"Smoke User","username":"smoke.user","email":"smoke-user@example.com","password":"Secret2!","role":"gestor"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/users" 201
USER_USERNAME="smoke.user"

# --- 6. login by USERNAME (no domainId) -------------------------------------
echo ""
echo "=== 6. Login by Username ==="
api POST /api/v2/auth/login "{\"email\":\"$USER_USERNAME\",\"password\":\"Secret2!\"}"
check_http "POST /api/v2/auth/login (username)" 200
check_val "username login resolves same domain" "$DOMAIN_ID" "$(jget domainId)"
USER_TOKEN="$(jget token)"

# --- 7. duplicate username -> 409 -------------------------------------------
echo ""
echo "=== 7. Duplicate Username ==="
api POST /api/v2/users '{"name":"Impostor","username":"smoke.user","email":"impostor@example.com","password":"Secret3!","role":"gestor"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/users (duplicate username)" 409

# --- 8. create a contract ---------------------------------------------------
echo ""
echo "=== 8. Create Contract ==="
api POST /api/v2/contracts '{"name":"Smoke Contract","object":"E2E smoke","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts" 201
CONTRACT_ID="$(jget contract.id)"

# --- 9. create a task -------------------------------------------------------
echo ""
echo "=== 9. Create Task ==="
api POST "/api/v2/contracts/$CONTRACT_ID/tasks" '{"title":"Smoke Task","description":"Created by test.sh","priority":"high"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/tasks" 201

# --- 10. dashboard stats ----------------------------------------------------
echo ""
echo "=== 10. Dashboard Stats ==="
api GET /api/v2/dashboard/stats "" "$ADMIN_TOKEN"
check_http "GET /api/v2/dashboard/stats" 200
# E013/FR-040: additive payload keeps recentProjects intact and exposes the
# full contract set, the responsavel join, and the window-based flag.
check_val "dashboard contracts inclui Smoke Contract" "1" "$(jcount contracts 'Smoke Contract')"
check_val "dashboard expõe responsavel" "Smoke Admin" "$(jget contracts.0.responsavel)"
check_val "dashboard expõe a_vencer por contrato" "1" "$(jcount_true contracts a_vencer)"
check_val "dashboard expõe stats.contractsAVencer" "1" "$(jget stats.contractsAVencer)"

# --- 11. wrong password -> 401 ---------------------------------------------
echo ""
echo "=== 11. Wrong Password ==="
api POST /api/v2/auth/login "{\"email\":\"$SYS_EMAIL\",\"password\":\"definitely-wrong\"}"
check_http "POST /api/v2/auth/login (wrong password)" 401

# --- 12. two active domains (AD-003) -----------------------------------------
echo ""
echo "=== 12. Two Active Domains ==="
api POST /api/v2/domains/enable '{"name":"Smoke Domain Two","adminName":"Second Admin","adminEmail":"second-admin@example.com","adminPassword":"Secret1!"}' "$SYS_TOKEN"
check_http "POST /api/v2/domains/enable (second domain)" 201
DOMAIN2_ID="$(jget domain.id)"

api POST /api/v2/auth/login '{"email":"second-admin@example.com","password":"Secret1!"}'
check_http "POST /api/v2/auth/login (second domain admin)" 200
ADMIN2_TOKEN="$(jget token)"
check_val "second domain auto-resolved" "$DOMAIN2_ID" "$(jget domainId)"

api POST /api/v2/contracts '{"name":"Second Domain Contract","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN2_TOKEN"
check_http "POST /api/v2/contracts (domain 2)" 201

# domain 1 never sees domain 2 rows (separate physical databases)
api GET /api/v2/contracts "" "$ADMIN_TOKEN"
check_val "domain 1 does not see domain 2 contract" "0" "$(jcount contracts 'Second Domain Contract')"
api GET /api/v2/contracts "" "$ADMIN2_TOKEN"
check_val "domain 2 sees its own contract" "1" "$(jcount contracts 'Second Domain Contract')"

# cross-domain read: ids are per-database, so domain 1 writes a second row
# (id 2) that domain 2 does not have — 404 without any domain 1 content.
api POST /api/v2/contracts '{"name":"Smoke Contract Two","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts (domain 1, second row)" 201
CONTRACT1_B_ID="$(jget contract.id)"

api GET "/api/v2/contracts/$CONTRACT1_B_ID" "" "$ADMIN2_TOKEN"
check_http "domain 2 reads a domain 1 id" 404
check_val "no domain 1 content leaked" "" "$(jget contract)"
api GET "/api/v2/contracts/$CONTRACT1_B_ID" "" "$ADMIN_TOKEN"
check_http "domain 1 reads its own id" 200
check_val "domain 1 sees its own contract" "Smoke Contract Two" "$(jget contract.name)"

# --- 13. suspension cycle (FR-003) -------------------------------------------
echo ""
echo "=== 13. Suspension Cycle ==="
api POST "/api/v2/domains/$DOMAIN2_ID/suspend" "" "$SYS_TOKEN"
check_http "POST /api/v2/domains/:id/suspend" 200
check_val "domain 2 status suspended" "suspended" "$(jget domain.status)"

api POST /api/v2/auth/login "{\"email\":\"second-admin@example.com\",\"password\":\"Secret1!\",\"domainId\":$DOMAIN2_ID}"
check_http "login on suspended domain" 403

# session opened before the suspension is refused without reading data
api GET /api/v2/contracts "" "$ADMIN2_TOKEN"
check_http "live session after suspension" 403
check_val "no contract payload while suspended" "" "$(jget contracts)"

api POST "/api/v2/domains/$DOMAIN2_ID/reactivate" "" "$SYS_TOKEN"
check_http "POST /api/v2/domains/:id/reactivate" 200
check_val "domain 2 status active again" "active" "$(jget domain.status)"

api POST /api/v2/auth/login "{\"email\":\"second-admin@example.com\",\"password\":\"Secret1!\",\"domainId\":$DOMAIN2_ID}"
check_http "login after reactivation" 200
ADMIN2_TOKEN="$(jget token)"
api GET /api/v2/contracts "" "$ADMIN2_TOKEN"
check_http "contracts after reactivation" 200
check_val "domain 2 data intact after cycle" "1" "$(jcount contracts 'Second Domain Contract')"

# --- 14. 401/403 per route (FR-005 / FR-006) ---------------------------------
echo ""
echo "=== 14. 401/403 per route ==="
NO_TOKEN_ROUTES=(
  "GET /api/v2/contracts"
  "POST /api/v2/contracts"
  "GET /api/v2/users"
  "POST /api/v2/users"
  "GET /api/v2/tasks"
  "GET /api/v2/purposes"
  "POST /api/v2/purposes"
  "GET /api/v2/dashboard/stats"
  "GET /api/v2/search/contracts?q=smoke"
  "GET /api/v2/domains"
  "POST /api/v2/domains/enable"
)
for route in "${NO_TOKEN_ROUTES[@]}"; do
  method="${route%% *}"
  path="${route#* }"
  api "$method" "$path" '{}'
  check_http "$method $path (sem token)" 401
done

# malformed / wrong-key token → 403
api GET /api/v2/contracts "" "not-a-jwt"
check_http "GET /api/v2/contracts (token malformado)" 403

# wrong role → 403 (USER_TOKEN is a gestor of domain 1)
api POST /api/v2/users '{"name":"Nope","username":"nope.gestor","email":"nope.gestor@example.com","password":"Secret9!","role":"gestor"}' "$USER_TOKEN"
check_http "POST /api/v2/users (gestor)" 403
api POST /api/v2/purposes '{"name":"Gestor Finalidade"}' "$USER_TOKEN"
check_http "POST /api/v2/purposes (gestor)" 403
api GET /api/v2/domains "" "$USER_TOKEN"
check_http "GET /api/v2/domains (gestor)" 403
api POST /api/v2/domains/enable '{"name":"Rogue","adminName":"R","adminEmail":"r@rogue.example.com","adminPassword":"Secret1!"}' "$USER_TOKEN"
check_http "POST /api/v2/domains/enable (gestor)" 403
api DELETE "/api/v2/contracts/$CONTRACT_ID" "" "$USER_TOKEN"
check_http "DELETE /api/v2/contracts/:id (gestor)" 403

# system_admin stays out of business data (deny by default)
api GET /api/v2/contracts "" "$SYS_TOKEN"
check_http "GET /api/v2/contracts (system_admin)" 403
api POST /api/v2/users '{"name":"Sys","username":"sys.leak","email":"sys.leak@example.com","password":"Secret9!","role":"gestor"}' "$SYS_TOKEN"
check_http "POST /api/v2/users (system_admin)" 403
api GET /api/v2/tasks "" "$SYS_TOKEN"
check_http "GET /api/v2/tasks (system_admin)" 403
check_val "no user payload for system_admin" "" "$(jget users)"

# domain admin cannot run the cycle (FR-004)
api POST "/api/v2/domains/$DOMAIN_ID/suspend" "" "$ADMIN_TOKEN"
check_http "POST /api/v2/domains/:id/suspend (domain admin)" 403

# --- 15. unknown domainId stays a plain credential failure (spec §Edge Cases)
echo ""
echo "=== 15. Unknown DomainId ==="
api POST /api/v2/auth/login '{"email":"ghost@example.com","password":"Nope@123","domainId":999999}'
check_http "login com domainId inexistente" 401
check_val "corpo idêntico ao de credenciais erradas" "Invalid credentials" "$(jget error)"

# --- 16. workflow assistido: análise → aprovação → evento (T030) -----------
echo ""
echo "=== 16. Workflow Assistido (análise → aprovação → evento) ==="

# definições obrigatórias antes de qualquer análise (FR-003 gate)
api PUT "/api/v2/contracts/$CONTRACT_ID/definitions" '{"finalidade":"Executar a reforma da cobertura","limitacoes":"Sem acesso ao telhado durante chuva","alvo":"Cobertura do bloco B","escopo":"Impermeabilização e calhas","premissas":"Material em estoque na obra","entregaveis":"RGA assinada e fotos finais"}' "$ADMIN_TOKEN"
check_http "PUT /api/v2/contracts/:id/definitions" 200
check_val "primeira versão das definições" "1" "$(jget definitions.versao)"

# corpo incompleto → 400 com a lista missing[]
api PUT "/api/v2/contracts/$CONTRACT_ID/definitions" '{"finalidade":"so uma"}' "$ADMIN_TOKEN"
check_http "PUT definitions incompletas" 400
check_val "campo ausente listado" "limitacoes" "$(jget missing.0)"

# NEW-CONFIG: integração desabilitada recusa o disparo da análise
api PUT /api/v2/opencode/config '{"enabled":false}' "$USER_TOKEN"
check_http "PUT /api/v2/opencode/config (disable)" 200
api POST "/api/v2/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
check_http "POST analysis (integração desabilitada)" 400
check_val "erro de integração desabilitada" "OpenCode integration disabled" "$(jget error)"
api PUT /api/v2/opencode/config '{"enabled":true}' "$USER_TOKEN"
check_http "PUT /api/v2/opencode/config (enable)" 200

# análise assíncrona com a CLI fake → estado sugerido (FR-005/FR-021)
api POST "/api/v2/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
check_http "POST /api/v2/contracts/:id/analysis" 202
check_val "análise nasce pendente" "pendente" "$(jget analysis.status)"
SUGGESTION_ID="$(jget analysis.suggestion_id)"

i=0
while [ "$i" -lt 40 ]; do
  api GET "/api/v2/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
  if [ "$STATUS" = "200" ] && [ "$(jget analysis.status)" = "sugerido" ]; then break; fi
  if [ "$STATUS" = "200" ] && [ "$(jget analysis.status)" = "falha" ]; then break; fi
  sleep 0.3
  i=$((i + 1))
done
check_val "análise concluída (sugerido)" "sugerido" "$(jget analysis.status)"

api GET "/api/v2/suggestions/$SUGGESTION_ID" "" "$USER_TOKEN"
check_http "GET /api/v2/suggestions/:sid" 200
check_val "sugestão no estado sugerido" "sugerido" "$(jget suggestion.status)"
check_val "itens propostos pela CLI fake" "2" "$(jget suggestion.items.length)"

# aprovação materializa o workflow ativo e dispara workflow_activated (evento)
api POST "/api/v2/suggestions/$SUGGESTION_ID/approve" "" "$USER_TOKEN"
check_http "POST /api/v2/suggestions/:sid/approve" 201
check_val "workflow ativo após aprovação" "ativo" "$(jget workflow.status)"
check_val "tarefas materializadas na ativação" "2" "$(jget tasks.length)"

api GET "/api/v2/contracts/$CONTRACT_ID/workflow" "" "$USER_TOKEN"
check_http "GET /api/v2/contracts/:id/workflow" 200
check_val "workflow segue ativo" "ativo" "$(jget workflow.status)"
check_val "tarefas no workflow ativo" "2" "$(jcount_true tasks in_workflow)"
check_val "tarefas do contrato no total" "3" "$(jget tasks.length)"

# aprovação é única: repetição cai em 409 e a sugestão fica aprovada
api POST "/api/v2/suggestions/$SUGGESTION_ID/approve" "" "$USER_TOKEN"
check_http "aprovação repetida" 409
api GET "/api/v2/suggestions/$SUGGESTION_ID" "" "$USER_TOKEN"
check_val "sugestão aprovada" "aprovada" "$(jget suggestion.status)"

# --- 17. partição de status: vigente/atrasado/encerrado (FR-013) ------------
echo ""
echo "=== 17. Status Partition ==="

# contrato com previsão já vencida expõe atrasado sem gravá-lo
api POST /api/v2/contracts '{"name":"Smoke Atrasado","start_date":"2020-01-01","forecast_date":"2020-06-01"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts (previsão vencida)" 201
check_val "previsão vencida exposta como atrasado" "atrasado" "$(jget contract.status)"

api GET "/api/v2/contracts?status=atrasado" "" "$ADMIN_TOKEN"
check_http "GET /api/v2/contracts?status=atrasado" 200
check_val "contrato vencido na fatia atrasado" "1" "$(jcount contracts 'Smoke Atrasado')"
check_val "fatia atrasado grava como vigente" "vigente" "$(jget contracts.0.db_status)"

api GET "/api/v2/contracts?status=vigente" "" "$ADMIN_TOKEN"
check_http "GET /api/v2/contracts?status=vigente" 200
check_val "vigente não vaza para atrasado" "0" "$(jcount contracts 'Smoke Atrasado')"
check_val "Smoke Contract segue na fatia vigente" "1" "$(jcount contracts 'Smoke Contract')"

# encerra um contrato e confere a fatia encerrado
api POST "/api/v2/contracts/$CONTRACT1_B_ID/close" "" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/close" 200
api GET "/api/v2/contracts?status=encerrado" "" "$ADMIN_TOKEN"
check_http "GET /api/v2/contracts?status=encerrado" 200
check_val "contrato encerrado na fatia encerrado" "1" "$(jcount contracts 'Smoke Contract Two')"

# partição sem sobreposição: vigente + atrasado + encerrado = total
api GET "/api/v2/contracts?limit=1" "" "$ADMIN_TOKEN"
TOTAL_ALL="$(jget total)"
api GET "/api/v2/contracts?status=vigente&limit=1" "" "$ADMIN_TOKEN"
TOTAL_VIG="$(jget total)"
api GET "/api/v2/contracts?status=atrasado&limit=1" "" "$ADMIN_TOKEN"
TOTAL_ATR="$(jget total)"
api GET "/api/v2/contracts?status=encerrado&limit=1" "" "$ADMIN_TOKEN"
TOTAL_ENC="$(jget total)"
check_val "soma das fatias = total" "$TOTAL_ALL" "$((TOTAL_VIG + TOTAL_ATR + TOTAL_ENC))"

# status fora da partição → 400
api GET "/api/v2/contracts?status=qualquer" "" "$ADMIN_TOKEN"
check_http "GET /api/v2/contracts?status=qualquer" 400

# --- 18. Evidência de execução fim a fim (E003) ------------------------------
echo ""
echo "=== 18. Evidência fim a fim ==="

TINY_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

# prestador vinculado ao contrato move a tarefa até a conclusão documentada
api POST /api/v2/users '{"name":"Sol","username":"smoke.sol","email":"smoke.sol@example.com","password":"Secret3!","role":"prestador"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/users (prestador de evidência)" 201
PRESTADOR_ID="$(jget user.id)"
api POST /api/v2/auth/login '{"email":"smoke.sol@example.com","password":"Secret3!"}'
check_http "POST /api/v2/auth/login (prestador)" 200
PRESTADOR_TOKEN="$(jget token)"

api POST "/api/v2/contracts/$CONTRACT_ID/providers" "{\"user_id\":$PRESTADOR_ID}" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/providers" 201

api POST "/api/v2/contracts/$CONTRACT_ID/tasks" "{\"title\":\"Smoke Evidência\",\"assignee_id\":$PRESTADOR_ID}" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/tasks (com prestador)" 201
EVID_ID="$(jget task.id)"

for ST in "Em Progresso" "Revisão"; do
  api PATCH "/api/v2/tasks/$EVID_ID/status" "{\"status\":\"$ST\"}" "$PRESTADOR_TOKEN"
  check_http "PATCH /api/v2/tasks/:id/status ($ST)" 200
done

# conclusão sem texto → 400 e nada muda (FR-002)
api POST "/api/v2/tasks/$EVID_ID/complete" '{"text":"   "}' "$PRESTADOR_TOKEN"
check_http "conclusão sem texto" 400
api GET "/api/v2/tasks/$EVID_ID" "" "$PRESTADOR_TOKEN"
check_val "status preservado no 400" "Revisão" "$(jget task.status)"

# upload de tipo inválido na conclusão → 400 sem gravação (FR-009)
BEFORE_FILES="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
api POST "/api/v2/tasks/$EVID_ID/complete" "{\"text\":\"deveria falhar\",\"photos\":[{\"filename\":\"virus.exe\",\"dataBase64\":\"$TINY_PNG\"}]}" "$PRESTADOR_TOKEN"
check_http "conclusão com foto de tipo inválido" 400
AFTER_FILES="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
check_val "recusa sem arquivo residual" "$BEFORE_FILES" "$AFTER_FILES"

# conclusão documentada com 2 fotos → tarefa Concluída, fotos no disco (FR-001/FR-003)
api POST "/api/v2/tasks/$EVID_ID/complete" "{\"text\":\"Cobertura impermeabilizada\",\"photos\":[{\"filename\":\"antes.png\",\"dataBase64\":\"$TINY_PNG\"},{\"filename\":\"depois.png\",\"dataBase64\":\"$TINY_PNG\"}]}" "$PRESTADOR_TOKEN"
check_http "conclusão documentada com fotos" 200
check_val "tarefa Concluída" "Concluída" "$(jget task.status)"
check_val "duas fotos na evidência" "2" "$(jget task.photo_count)"
STORED="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
check_val "arquivos gravados no disco" "2" "$STORED"

# renderização da evidência: GET /uploads/<arquivo> devolve 200 image/png
PHOTO_NAME="$(ls -1 "$UPLOAD_DIR" | head -1)"
STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/uploads/$PHOTO_NAME")"
BODY=""
check_http "GET /uploads/<arquivo> (backend)" 200
CTYPE="$(curl -s -m 5 -o /dev/null -w '%{content_type}' "$BASE/uploads/$PHOTO_NAME")"
check_val "content-type image/png" "image/png" "$CTYPE"

# reabertura justificada: sem motivo → 400, com motivo → histórico (FR-005/FR-006)
api POST "/api/v2/tasks/$EVID_ID/reopen" '{"motivo":"  "}' "$ADMIN_TOKEN"
check_http "reabertura sem motivo" 400
api POST "/api/v2/tasks/$EVID_ID/reopen" '{"motivo":"inspeção reprovou a impermeabilização"}' "$ADMIN_TOKEN"
check_http "reabertura com motivo" 200
check_val "tarefa reaberta" "Em Progresso" "$(jget task.status)"
api GET "/api/v2/tasks/$EVID_ID" "" "$ADMIN_TOKEN"
check_val "histórico registra reabertura" "1" "$(printf '%s' "$BODY" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const h=JSON.parse(d).history||[];process.stdout.write(String(h.filter(x=>x.action==="reopen").length));})')"

# escopo de domínio: domainId estrangeiro → 403 (FR-010)
api GET "/api/v2/tasks?domainId=9999" "" "$ADMIN_TOKEN"
check_http "domainId estrangeiro 403" 403

# --- 19. Rotas EN sob /api/v2 (purposes, extend/close, providers) ------------
# Cobertura única: purposes CRUD+shape, extend/close+code e providers repetido.
# Health, tarefas aninhadas e o primeiro vínculo de providers já foram
# verificados nas seções 1, 9 e 18 — o espelho v1 foi removido junto com o alias.
echo ""
echo "=== 19. Rotas EN sob /api/v2 ==="

# purposes sob o segmento EN — mesmo router, shape de resposta inalterado
api POST /api/v2/purposes '{"name":"Smoke Purpose V2"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/purposes" 201
PURPOSE_V2_ID="$(jget finalidade.id)"
check_nonempty "v2 purpose id" "$PURPOSE_V2_ID"
api GET /api/v2/purposes "" "$ADMIN_TOKEN"
check_http "GET /api/v2/purposes" 200
check_val "listing carrega a chave finalidades" "1" "$(jcount finalidades 'Smoke Purpose V2')"

# aliases em ingles nos mesmos handlers de prorrogar/close
api POST "/api/v2/contracts/$CONTRACT_ID/extend" '{"forecast_date":"2027-12-31"}' "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/extend" 200
api POST "/api/v2/contracts/$CONTRACT_ID/close" "" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/close" 200
api POST "/api/v2/contracts/$CONTRACT_ID/close" "" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/close (repetido)" 400
check_val "code estavel no reencerramento" "CONTRACT_ALREADY_CLOSED" "$(jget code)"

# rota aninhada sob /api/v2/contracts — vínculo repetido recusado com 409
api POST "/api/v2/contracts/$CONTRACT_ID/providers" "{\"user_id\":$PRESTADOR_ID}" "$ADMIN_TOKEN"
check_http "POST /api/v2/contracts/:id/providers (repetido)" 409

# --- 20. v1 removido (superfície única /api/v2) ------------------------------
# Nenhum mount v1 responde: a rota cai no 404 do Express antes de auth/dados.
echo ""
echo "=== 20. v1 removida ==="
api GET /api/health "" "$ADMIN_TOKEN"
check_http "GET /api/health (v1)" 404
api GET /api/contracts "" "$ADMIN_TOKEN"
check_http "GET /api/contracts (v1)" 404
api GET /api/finalidades "" "$ADMIN_TOKEN"
check_http "GET /api/finalidades (v1)" 404
api GET /api/tasks "" "$ADMIN_TOKEN"
check_http "GET /api/tasks (v1)" 404
api POST "/api/contracts/$CONTRACT_ID/extend" "" "$ADMIN_TOKEN"
check_http "POST /api/contracts/:id/extend (v1)" 404
api POST "/api/contracts/$CONTRACT_ID/prorrogar" "" "$ADMIN_TOKEN"
check_http "POST /api/contracts/:id/prorrogar (PT removida)" 404
api POST "/api/contracts/$CONTRACT_ID/providers" "" "$ADMIN_TOKEN"
check_http "POST /api/contracts/:id/providers (v1)" 404

# --- 21. Manutenção e aprovação do gestor (00014) ----------------------------
echo ""
echo "=== 21. Manutenção e Aprovação do Gestor (00014) ==="

# setup: prestador já vinculado ao contrato (seção 18), USER_TOKEN = gestor
api POST "/api/v2/contracts/$CONTRACT_ID/tasks" "{\"title\":\"Smoke Aprovação\",\"assignee_id\":$PRESTADOR_ID}" "$ADMIN_TOKEN"
check_http "POST tasks (aprovação)" 201
APPROVE_ID="$(jget task.id)"
for ST in "Em Progresso" "Revisão"; do
  api PATCH "/api/v2/tasks/$APPROVE_ID/status" "{\"status\":\"$ST\"}" "$PRESTADOR_TOKEN"
  check_http "PATCH /api/v2/tasks/:id/status ($ST)" 200
done

# aprovação do gestor: Revisão → Concluída, registrada no histórico
api POST "/api/v2/tasks/$APPROVE_ID/approve" "" "$USER_TOKEN"
check_http "POST /api/v2/tasks/:id/approve (gestor)" 200
check_val "aprovação fecha em Concluída" "Concluída" "$(jget task.status)"
api GET "/api/v2/tasks/$APPROVE_ID" "" "$USER_TOKEN"
check_val "histórico registra approve" "1" "$(printf '%s' "$BODY" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const h=JSON.parse(d).history||[];process.stdout.write(String(h.filter(x=>x.action==="approve").length));})')"

# decisão fora de Revisão → 400 sem escrita
api POST "/api/v2/tasks/$APPROVE_ID/approve" "" "$USER_TOKEN"
check_http "aprovação fora de Revisão" 400
check_val "code estável da decisão" "TASK_DECISION_STATUS_REQUIRED" "$(jget code)"
api GET "/api/v2/tasks/$APPROVE_ID" "" "$USER_TOKEN"
check_val "segunda aprovação não reescreve" "Concluída" "$(jget task.status)"

# papel diverso do gestor → 403 (prestador e admin decidem nada)
api POST "/api/v2/tasks/$APPROVE_ID/approve" "" "$PRESTADOR_TOKEN"
check_http "aprovação pelo prestador" 403
api POST "/api/v2/tasks/$APPROVE_ID/reject" '{"motivo":"não decide"}' "$ADMIN_TOKEN"
check_http "rejeição pelo admin" 403

# rejeição: sem motivo → 400 sem escrita; com motivo → Em Progresso
api POST "/api/v2/contracts/$CONTRACT_ID/tasks" "{\"title\":\"Smoke Rejeição\",\"assignee_id\":$PRESTADOR_ID}" "$ADMIN_TOKEN"
check_http "POST tasks (rejeição)" 201
REJECT_ID="$(jget task.id)"
for ST in "Em Progresso" "Revisão"; do
  api PATCH "/api/v2/tasks/$REJECT_ID/status" "{\"status\":\"$ST\"}" "$PRESTADOR_TOKEN"
  check_http "PATCH /api/v2/tasks/:id/status ($ST)" 200
done

api POST "/api/v2/tasks/$REJECT_ID/reject" '{"motivo":"  "}' "$USER_TOKEN"
check_http "rejeição sem motivo" 400
check_val "code estável do motivo da rejeição" "TASK_REJECT_REASON_REQUIRED" "$(jget code)"
api GET "/api/v2/tasks/$REJECT_ID" "" "$USER_TOKEN"
check_val "rejeição sem motivo não escreve" "Revisão" "$(jget task.status)"

api POST "/api/v2/tasks/$REJECT_ID/reject" '{"motivo":"acabamento abaixo do padrão"}' "$USER_TOKEN"
check_http "rejeição com motivo" 200
check_val "rejeição volta a Em Progresso" "Em Progresso" "$(jget task.status)"
api GET "/api/v2/tasks/$REJECT_ID" "" "$USER_TOKEN"
check_val "histórico registra reject" "1" "$(printf '%s' "$BODY" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const h=JSON.parse(d).history||[];process.stdout.write(String(h.filter(x=>x.action==="reject").length));})')"
check_val "motivo da rejeição no histórico" "acabamento abaixo do padrão" "$(printf '%s' "$BODY" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const h=JSON.parse(d).history||[];const r=h.find(x=>x.action==="reject");process.stdout.write(r&&r.note?String(r.note):"");})')"

# manutenção: admin/gestor mudam fora da sequência; papéis sem permissão 403
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"Concluída","motivo":"correção de estado pelo admin"}' "$ADMIN_TOKEN"
check_http "manutenção (admin)" 200
check_val "manutenção admin fora do fluxo" "Concluída" "$(jget task.status)"
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"A Fazer","motivo":"devolvida ao planejamento"}' "$USER_TOKEN"
check_http "manutenção (gestor)" 200
check_val "manutenção gestor salta estado" "A Fazer" "$(jget task.status)"
api GET "/api/v2/tasks/$REJECT_ID" "" "$USER_TOKEN"
check_val "histórico registra maintain" "2" "$(printf '%s' "$BODY" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const h=JSON.parse(d).history||[];process.stdout.write(String(h.filter(x=>x.action==="maintain").length));})')"
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"Em Progresso","motivo":"prestador não mantém estado"}' "$PRESTADOR_TOKEN"
check_http "manutenção (prestador)" 403
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"Em Progresso"}' "$ADMIN_TOKEN"
check_http "manutenção sem motivo" 400
check_val "code estável do motivo de manutenção" "TASK_MAINTENANCE_REASON_REQUIRED" "$(jget code)"
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"A Fazer","motivo":"estado repetido"}' "$ADMIN_TOKEN"
check_http "manutenção repetida" 400
check_val "code estável do no-op" "TASK_MAINTENANCE_NOOP" "$(jget code)"

# anexo com category: gestor/grava documentation, default segue evidence
api POST "/api/v2/tasks/$REJECT_ID/attachments" "{\"filename\":\"como-fazer.pdf\",\"dataBase64\":\"$TINY_PNG\",\"kind\":\"file\",\"category\":\"documentation\"}" "$USER_TOKEN"
check_http "anexo category documentation (gestor)" 201
check_val "categoria documentation persistida" "documentation" "$(jget attachment.category)"
api POST "/api/v2/tasks/$REJECT_ID/attachments" "{\"filename\":\"foto-execucao.png\",\"dataBase64\":\"$TINY_PNG\"}" "$PRESTADOR_TOKEN"
check_http "anexo sem category (prestador, A Fazer)" 201
check_val "categoria default evidence" "evidence" "$(jget attachment.category)"
api POST "/api/v2/tasks/$REJECT_ID/attachments" "{\"filename\":\"x.png\",\"dataBase64\":\"$TINY_PNG\",\"category\":\"obra\"}" "$USER_TOKEN"
check_http "anexo com category inválida" 400
check_val "code estável da categoria" "TASK_ATTACHMENT_CATEGORY_INVALID" "$(jget code)"

# gate: prestador bloqueado em Concluída, gestor livre em qualquer estado
api POST "/api/v2/tasks/$REJECT_ID/maintenance" '{"status":"Revisão","motivo":"reabrir para conclusão"}' "$ADMIN_TOKEN"
check_http "manutenção de volta a Revisão" 200
api POST "/api/v2/tasks/$REJECT_ID/complete" '{"text":"concluída pelo prestador"}' "$PRESTADOR_TOKEN"
check_http "conclusão do prestador (00005)" 200
BEFORE_GATE="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
api POST "/api/v2/tasks/$REJECT_ID/attachments" "{\"filename\":\"tarja.png\",\"dataBase64\":\"$TINY_PNG\",\"category\":\"documentation\"}" "$PRESTADOR_TOKEN"
check_http "anexo do prestador em Concluída" 403
check_val "code estável do gate" "TASK_ATTACHMENT_STATUS_FORBIDDEN" "$(jget code)"
AFTER_GATE="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
check_val "403 do gate sem arquivo residual" "$BEFORE_GATE" "$AFTER_GATE"
api POST "/api/v2/tasks/$REJECT_ID/attachments" "{\"filename\":\"manual-final.pdf\",\"dataBase64\":\"$TINY_PNG\",\"category\":\"documentation\"}" "$USER_TOKEN"
check_http "anexo do gestor em Concluída" 201
check_val "documentação do gestor em Concluída" "documentation" "$(jget attachment.category)"

# --- summary ----------------------------------------------------------------
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "$TOTAL/$TOTAL passed"
  echo "=== ALL TESTS COMPLETE ==="
  exit 0
fi
echo "$PASS/$TOTAL passed"
echo "=== $FAIL CHECK(S) FAILED ==="
exit 1
