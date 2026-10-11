# Manual Test Plan: E002 — Contrato e Vigência

**Generated**: 2026-10-09T00:25:05Z
**Reason**: `project-instructions.md` (Security Scanning) mandates a manual OWASP Top 10 dependency and route review — the frontend has no maintained Dart scanner and route review (auth, per-domain data isolation) is human-only. Autopilot must not attest this itself.

## Startup and Readiness

1. `docker compose up -d backend` from the repository root.
2. Readiness: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health` → `200`.
3. Credentials: `backend/.env` → `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

## Target

- API base: `http://localhost:3001/api`
- Contract under review: `specs/00004-e002-contrato-vigencia/contracts/openapi.yaml`
- Scope: contract routes only (E002); no UI changes in this epic.

## Scenarios Needing Human Review

| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Backend dependency review | `npm --prefix backend audit --audit-level=high` output reviewed by a human against OWASP Top 10 dependency risks (scanner reports 0 vulnerabilities; human confirms no advisory drift) |
| 2 | Route review — auth ordering | Contract routes return 401 (no/invalid token) and 403 (wrong role, suspended domain) before any data is read or written — walk `GET/POST /api/contracts`, prorrogar, encerrar |
| 3 | Route review — per-domain isolation | A session from domain A never reads or writes domain B data on contract routes; `?domainId=` of another domain is refused with 403 |
| 4 | Frontend dependency review | `frontend/pubspec.yaml` dependencies reviewed manually (no maintained Dart scanner) before any `dev` → `main` promotion |

Automated evidence already green: unit 94/94, smoke 97/97, `npm audit` 0 vulnerabilities, `flutter analyze` clean, widget tests 13/13.

## Cleanup

- `docker compose stop backend` if this review started it; leave the stack in its prior state.

## Attestation

Status: PENDING
Verifier: <identity>
Verified At (UTC): <ISO-8601 UTC timestamp>
Evidence: <reference>

## Scenario Results

| Scenario | Result |
|----------|--------|
| Backend dependency review (OWASP Top 10) | PENDING |
| Route review — auth 401/403 before data | PENDING |
| Route review — per-domain data isolation | PENDING |
| Frontend pubspec dependency review | PENDING |
