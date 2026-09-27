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

# --- start server -----------------------------------------------------------
export DATA_DIR
export PORT
if [ -n "$(env_get JWT_SECRET)" ]; then
  export JWT_SECRET="$(env_get JWT_SECRET)"
fi

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
