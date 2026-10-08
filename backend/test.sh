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
  code="$(curl -s -m 1 -o /dev/null -w '%{http_code}' "$BASE/api/health" 2>/dev/null)"
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
api GET /api/health
check_http "GET /api/health" 200

# --- 2. platform admin login (no domainId) ---------------------------------
echo ""
echo "=== 2. Platform Admin Login ==="
api POST /api/auth/login "{\"email\":\"$SYS_EMAIL\",\"password\":\"$SYS_PASSWORD\"}"
check_http "POST /api/auth/login (platform)" 200
SYS_TOKEN="$(jget token)"
check_val "platform session domainId is null" "null" "$(jget domainId)"

# --- 3. enable a domain -----------------------------------------------------
echo ""
echo "=== 3. Enable Domain ==="
api POST /api/domains/enable '{"name":"Smoke Test Domain","adminName":"Smoke Admin","adminEmail":"smoke-admin@example.com","adminPassword":"Secret1!"}' "$SYS_TOKEN"
check_http "POST /api/domains/enable" 201
DOMAIN_ID="$(jget domain.id)"

# --- 4. domain admin login, auto-resolution (no domainId) -------------------
echo ""
echo "=== 4. Domain Admin Login (auto-resolution) ==="
api POST /api/auth/login '{"email":"smoke-admin@example.com","password":"Secret1!"}'
check_http "POST /api/auth/login (domain admin, no domainId)" 200
ADMIN_TOKEN="$(jget token)"
check_nonempty "domain admin domainId set" "$(jget domainId)"
check_val "domain admin role" "admin" "$(jget user.role)"
check_val "resolved to created domain" "$DOMAIN_ID" "$(jget domainId)"

# --- 5. create a user -------------------------------------------------------
echo ""
echo "=== 5. Create User ==="
api POST /api/users '{"name":"Smoke User","username":"smoke.user","email":"smoke-user@example.com","password":"Secret2!","role":"gestor"}' "$ADMIN_TOKEN"
check_http "POST /api/users" 201
USER_USERNAME="smoke.user"

# --- 6. login by USERNAME (no domainId) -------------------------------------
echo ""
echo "=== 6. Login by Username ==="
api POST /api/auth/login "{\"email\":\"$USER_USERNAME\",\"password\":\"Secret2!\"}"
check_http "POST /api/auth/login (username)" 200
check_val "username login resolves same domain" "$DOMAIN_ID" "$(jget domainId)"
USER_TOKEN="$(jget token)"

# --- 7. duplicate username -> 409 -------------------------------------------
echo ""
echo "=== 7. Duplicate Username ==="
api POST /api/users '{"name":"Impostor","username":"smoke.user","email":"impostor@example.com","password":"Secret3!","role":"gestor"}' "$ADMIN_TOKEN"
check_http "POST /api/users (duplicate username)" 409

# --- 8. create a contract ---------------------------------------------------
echo ""
echo "=== 8. Create Contract ==="
api POST /api/contracts '{"name":"Smoke Contract","object":"E2E smoke","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN_TOKEN"
check_http "POST /api/contracts" 201
CONTRACT_ID="$(jget contract.id)"

# --- 9. create a task -------------------------------------------------------
echo ""
echo "=== 9. Create Task ==="
api POST "/api/contracts/$CONTRACT_ID/tasks" '{"title":"Smoke Task","description":"Created by test.sh","priority":"high"}' "$ADMIN_TOKEN"
check_http "POST /api/contracts/:id/tasks" 201

# --- 10. dashboard stats ----------------------------------------------------
echo ""
echo "=== 10. Dashboard Stats ==="
api GET /api/dashboard/stats "" "$ADMIN_TOKEN"
check_http "GET /api/dashboard/stats" 200

# --- 11. wrong password -> 401 ---------------------------------------------
echo ""
echo "=== 11. Wrong Password ==="
api POST /api/auth/login "{\"email\":\"$SYS_EMAIL\",\"password\":\"definitely-wrong\"}"
check_http "POST /api/auth/login (wrong password)" 401

# --- 12. two active domains (AD-003) -----------------------------------------
echo ""
echo "=== 12. Two Active Domains ==="
api POST /api/domains/enable '{"name":"Smoke Domain Two","adminName":"Second Admin","adminEmail":"second-admin@example.com","adminPassword":"Secret1!"}' "$SYS_TOKEN"
check_http "POST /api/domains/enable (second domain)" 201
DOMAIN2_ID="$(jget domain.id)"

api POST /api/auth/login '{"email":"second-admin@example.com","password":"Secret1!"}'
check_http "POST /api/auth/login (second domain admin)" 200
ADMIN2_TOKEN="$(jget token)"
check_val "second domain auto-resolved" "$DOMAIN2_ID" "$(jget domainId)"

api POST /api/contracts '{"name":"Second Domain Contract","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN2_TOKEN"
check_http "POST /api/contracts (domain 2)" 201

# domain 1 never sees domain 2 rows (separate physical databases)
api GET /api/contracts "" "$ADMIN_TOKEN"
check_val "domain 1 does not see domain 2 contract" "0" "$(jcount contracts 'Second Domain Contract')"
api GET /api/contracts "" "$ADMIN2_TOKEN"
check_val "domain 2 sees its own contract" "1" "$(jcount contracts 'Second Domain Contract')"

# cross-domain read: ids are per-database, so domain 1 writes a second row
# (id 2) that domain 2 does not have — 404 without any domain 1 content.
api POST /api/contracts '{"name":"Smoke Contract Two","start_date":"2026-01-01","forecast_date":"2026-12-31"}' "$ADMIN_TOKEN"
check_http "POST /api/contracts (domain 1, second row)" 201
CONTRACT1_B_ID="$(jget contract.id)"

api GET "/api/contracts/$CONTRACT1_B_ID" "" "$ADMIN2_TOKEN"
check_http "domain 2 reads a domain 1 id" 404
check_val "no domain 1 content leaked" "" "$(jget contract)"
api GET "/api/contracts/$CONTRACT1_B_ID" "" "$ADMIN_TOKEN"
check_http "domain 1 reads its own id" 200
check_val "domain 1 sees its own contract" "Smoke Contract Two" "$(jget contract.name)"

# --- 13. suspension cycle (FR-003) -------------------------------------------
echo ""
echo "=== 13. Suspension Cycle ==="
api POST "/api/domains/$DOMAIN2_ID/suspend" "" "$SYS_TOKEN"
check_http "POST /api/domains/:id/suspend" 200
check_val "domain 2 status suspended" "suspended" "$(jget domain.status)"

api POST /api/auth/login "{\"email\":\"second-admin@example.com\",\"password\":\"Secret1!\",\"domainId\":$DOMAIN2_ID}"
check_http "login on suspended domain" 403

# session opened before the suspension is refused without reading data
api GET /api/contracts "" "$ADMIN2_TOKEN"
check_http "live session after suspension" 403
check_val "no contract payload while suspended" "" "$(jget contracts)"

api POST "/api/domains/$DOMAIN2_ID/reactivate" "" "$SYS_TOKEN"
check_http "POST /api/domains/:id/reactivate" 200
check_val "domain 2 status active again" "active" "$(jget domain.status)"

api POST /api/auth/login "{\"email\":\"second-admin@example.com\",\"password\":\"Secret1!\",\"domainId\":$DOMAIN2_ID}"
check_http "login after reactivation" 200
ADMIN2_TOKEN="$(jget token)"
api GET /api/contracts "" "$ADMIN2_TOKEN"
check_http "contracts after reactivation" 200
check_val "domain 2 data intact after cycle" "1" "$(jcount contracts 'Second Domain Contract')"

# --- 14. 401/403 per route (FR-005 / FR-006) ---------------------------------
echo ""
echo "=== 14. 401/403 per route ==="
NO_TOKEN_ROUTES=(
  "GET /api/contracts"
  "POST /api/contracts"
  "GET /api/users"
  "POST /api/users"
  "GET /api/tasks"
  "GET /api/finalidades"
  "POST /api/finalidades"
  "GET /api/dashboard/stats"
  "GET /api/search/contracts?q=smoke"
  "GET /api/domains"
  "POST /api/domains/enable"
)
for route in "${NO_TOKEN_ROUTES[@]}"; do
  method="${route%% *}"
  path="${route#* }"
  api "$method" "$path" '{}'
  check_http "$method $path (sem token)" 401
done

# malformed / wrong-key token → 403
api GET /api/contracts "" "not-a-jwt"
check_http "GET /api/contracts (token malformado)" 403

# wrong role → 403 (USER_TOKEN is a gestor of domain 1)
api POST /api/users '{"name":"Nope","username":"nope.gestor","email":"nope.gestor@example.com","password":"Secret9!","role":"gestor"}' "$USER_TOKEN"
check_http "POST /api/users (gestor)" 403
api POST /api/finalidades '{"name":"Gestor Finalidade"}' "$USER_TOKEN"
check_http "POST /api/finalidades (gestor)" 403
api GET /api/domains "" "$USER_TOKEN"
check_http "GET /api/domains (gestor)" 403
api POST /api/domains/enable '{"name":"Rogue","adminName":"R","adminEmail":"r@rogue.example.com","adminPassword":"Secret1!"}' "$USER_TOKEN"
check_http "POST /api/domains/enable (gestor)" 403
api DELETE "/api/contracts/$CONTRACT_ID" "" "$USER_TOKEN"
check_http "DELETE /api/contracts/:id (gestor)" 403

# system_admin stays out of business data (deny by default)
api GET /api/contracts "" "$SYS_TOKEN"
check_http "GET /api/contracts (system_admin)" 403
api POST /api/users '{"name":"Sys","username":"sys.leak","email":"sys.leak@example.com","password":"Secret9!","role":"gestor"}' "$SYS_TOKEN"
check_http "POST /api/users (system_admin)" 403
api GET /api/tasks "" "$SYS_TOKEN"
check_http "GET /api/tasks (system_admin)" 403
check_val "no user payload for system_admin" "" "$(jget users)"

# domain admin cannot run the cycle (FR-004)
api POST "/api/domains/$DOMAIN_ID/suspend" "" "$ADMIN_TOKEN"
check_http "POST /api/domains/:id/suspend (domain admin)" 403

# --- 15. unknown domainId stays a plain credential failure (spec §Edge Cases)
echo ""
echo "=== 15. Unknown DomainId ==="
api POST /api/auth/login '{"email":"ghost@example.com","password":"Nope@123","domainId":999999}'
check_http "login com domainId inexistente" 401
check_val "corpo idêntico ao de credenciais erradas" "Invalid credentials" "$(jget error)"

# --- 16. workflow assistido: análise → aprovação → evento (T030) -----------
echo ""
echo "=== 16. Workflow Assistido (análise → aprovação → evento) ==="

# definições obrigatórias antes de qualquer análise (FR-003 gate)
api PUT "/api/contracts/$CONTRACT_ID/definitions" '{"finalidade":"Executar a reforma da cobertura","limitacoes":"Sem acesso ao telhado durante chuva","alvo":"Cobertura do bloco B","escopo":"Impermeabilização e calhas","premissas":"Material em estoque na obra","entregaveis":"RGA assinada e fotos finais"}' "$ADMIN_TOKEN"
check_http "PUT /contracts/:id/definitions" 200
check_val "primeira versão das definições" "1" "$(jget definitions.versao)"

# corpo incompleto → 400 com a lista missing[]
api PUT "/api/contracts/$CONTRACT_ID/definitions" '{"finalidade":"so uma"}' "$ADMIN_TOKEN"
check_http "PUT definitions incompletas" 400
check_val "campo ausente listado" "limitacoes" "$(jget missing.0)"

# NEW-CONFIG: integração desabilitada recusa o disparo da análise
api PUT /api/opencode/config '{"enabled":false}' "$USER_TOKEN"
check_http "PUT /api/opencode/config (disable)" 200
api POST "/api/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
check_http "POST analysis (integração desabilitada)" 400
check_val "erro de integração desabilitada" "OpenCode integration disabled" "$(jget error)"
api PUT /api/opencode/config '{"enabled":true}' "$USER_TOKEN"
check_http "PUT /api/opencode/config (enable)" 200

# análise assíncrona com a CLI fake → estado sugerido (FR-005/FR-021)
api POST "/api/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
check_http "POST /contracts/:id/analysis" 202
check_val "análise nasce pendente" "pendente" "$(jget analysis.status)"
SUGGESTION_ID="$(jget analysis.suggestion_id)"

i=0
while [ "$i" -lt 40 ]; do
  api GET "/api/contracts/$CONTRACT_ID/analysis" "" "$USER_TOKEN"
  if [ "$STATUS" = "200" ] && [ "$(jget analysis.status)" = "sugerido" ]; then break; fi
  if [ "$STATUS" = "200" ] && [ "$(jget analysis.status)" = "falha" ]; then break; fi
  sleep 0.3
  i=$((i + 1))
done
check_val "análise concluída (sugerido)" "sugerido" "$(jget analysis.status)"

api GET "/api/suggestions/$SUGGESTION_ID" "" "$USER_TOKEN"
check_http "GET /api/suggestions/:sid" 200
check_val "sugestão no estado sugerido" "sugerido" "$(jget suggestion.status)"
check_val "itens propostos pela CLI fake" "2" "$(jget suggestion.items.length)"

# aprovação materializa o workflow ativo e dispara workflow_activated (evento)
api POST "/api/suggestions/$SUGGESTION_ID/approve" "" "$USER_TOKEN"
check_http "POST /api/suggestions/:sid/approve" 201
check_val "workflow ativo após aprovação" "ativo" "$(jget workflow.status)"
check_val "tarefas materializadas na ativação" "2" "$(jget tasks.length)"

api GET "/api/contracts/$CONTRACT_ID/workflow" "" "$USER_TOKEN"
check_http "GET /contracts/:id/workflow" 200
check_val "workflow segue ativo" "ativo" "$(jget workflow.status)"
check_val "tarefas no workflow ativo" "2" "$(jcount_true tasks in_workflow)"
check_val "tarefas do contrato no total" "3" "$(jget tasks.length)"

# aprovação é única: repetição cai em 409 e a sugestão fica aprovada
api POST "/api/suggestions/$SUGGESTION_ID/approve" "" "$USER_TOKEN"
check_http "aprovação repetida" 409
api GET "/api/suggestions/$SUGGESTION_ID" "" "$USER_TOKEN"
check_val "sugestão aprovada" "aprovada" "$(jget suggestion.status)"

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
