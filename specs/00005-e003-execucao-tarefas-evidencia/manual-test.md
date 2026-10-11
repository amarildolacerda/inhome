# Manual Test Plan: E003 — Execução de tarefas com evidência

**Generated**: 2026-10-09
**Reason**: SC-003 requires the evidence photo to render in a real browser at `http://localhost/` (same-origin `/uploads` through the Edge), and the accepted `/uploads`-without-token restriction carries a mandatory human security review dated 2026-12-26 (`specs/sad.md`). Autopilot must not attest this itself.

## Startup and Readiness

1. `docker compose up -d` from the repository root (Edge on `:80`, API on `:3001`).
2. Readiness: `curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health` → `200`.
3. Credentials: `backend/.env` → `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

## Target

- SPA: `http://localhost/` (Flutter Web behind nginx)
- Task under review: any task completed with text and photos in domain 1
- Scope: evidence rendering (`/uploads` same-origin) and the accepted tokenless surface; no other epic's UI

## Scenarios Needing Human Review

| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Visual rendering of evidence | Open a concluded task in the browser and confirm each completion photo renders inline (no broken image, no download prompt); the image URL stays on `http://localhost/uploads/…` |
| 2 | `/uploads` without token — security review | Confirm the accepted restriction still holds: opaque filenames, local-host surface only; schedule/record the deferred review for **2026-12-26** (owner: project) |
| 3 | Reopening with justification | Reopen a concluded task as gestor and confirm the motivo and author appear in the task history on screen |

Automated evidence already green: unit 104/104, smoke 118/118 (§18 evidence flow), Edge proxy check 5/5 (`backend/test-uploads-proxy.sh`), `npm audit --audit-level=high` 0 vulnerabilities, `flutter analyze` clean, widget tests 13/13.

## Cleanup

- `docker compose stop backend frontend` only if this review started the stack; otherwise leave it running.

## Attestation

Status: PENDING
Verifier: <identity>
Verified At (UTC): <ISO-8601 UTC timestamp>
Evidence: <reference>

## Scenario Results

| Scenario | Result |
|----------|--------|
| Visual rendering of evidence (same-origin `/uploads`) | PENDING |
| `/uploads` without token — security review (2026-12-26) | PENDING |
| Reopening with justification visible in history | PENDING |
