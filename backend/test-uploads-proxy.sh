#!/bin/bash
# FR-008 / AD-003 — verificação automatizada da imagem via Edge (stack nginx :80):
# GET /uploads/<arquivo> devolve 200 + image/*, nunca o index.html do SPA.
set -u

EDGE="${EDGE_BASE:-http://localhost}"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
UPLOADS_DIR="$BASE_DIR/uploads"
STAMP="$(date +%s)-$$"
NAME="fr008-$STAMP.png"
FAIL=0

check() { # label expected actual
  if [ "$3" = "$2" ]; then
    printf 'PASS  %-52s %s\n' "$1" "$3"
  else
    printf 'FAIL  %-52s esperado %s, obtido %s\n' "$1" "$2" "${3:-<vazio>}"
    FAIL=1
  fi
}

HEALTH="$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$EDGE/api/health" 2>/dev/null)"
if [ "$HEALTH" != "200" ]; then
  echo "FAIL  Edge/backend indisponível (GET $EDGE/api/health -> ${HEALTH:-erro})"
  exit 1
fi

# seed no bind mount ./backend/uploads (mesma visão do container)
mkdir -p "$UPLOADS_DIR"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' \
  | base64 -d > "$UPLOADS_DIR/$NAME"

HDR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$HDR" "$BODY" "$UPLOADS_DIR/$NAME"' EXIT INT TERM

CODE="$(curl -s -m 5 -D "$HDR" -o "$BODY" -w '%{http_code}' "$EDGE/uploads/$NAME")"
check "FR-008 GET /uploads/<arquivo> -> 200" "200" "$CODE"
CTYPE="$(grep -i '^content-type:' "$HDR" | tr -d '\r' | awk '{print $2}')"
case "$CTYPE" in
  image/*)
    printf 'PASS  %-52s %s\n' "FR-008 content-type image/*" "$CTYPE"
    ;;
  *) check "FR-008 content-type image/*" "image/*" "${CTYPE:-<ausente>}" ;;
esac
# SPA marker: flutter_bootstrap.js (o 404 do Express também é HTML, então
# <!doctype> sozinho não distingue o fallback do SPA).
if grep -qi 'flutter_bootstrap.js' "$BODY"; then
  check "FR-008 resposta nao e index.html" "sem html do SPA" "index.html do SPA"
else
  printf 'PASS  %-52s %s\n' "FR-008 resposta nao e index.html" "sem html do SPA"
fi

MISSING_CODE="$(curl -s -m 5 -o "$BODY" -w '%{http_code}' "$EDGE/uploads/nao-existe-$STAMP.png")"
check "FR-008 arquivo inexistente nao devolve o SPA" "404" "$MISSING_CODE"
if grep -qi 'flutter_bootstrap.js' "$BODY"; then
  check "FR-008 fallback do SPA eliminado" "sem html do SPA" "index.html do SPA"
else
  printf 'PASS  %-52s %s\n' "FR-008 fallback do SPA eliminado" "sem html do SPA"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "FR-008 OK — imagem servida pelo Edge (200 + image/*)"
  exit 0
fi
echo "FR-008 FALHOU"
exit 1
