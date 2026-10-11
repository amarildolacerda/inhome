# Manual Test Plan: E007 — Busca e filtros

**Generated**: 2026-10-09
**Reason**: SC-003 requires the p95 of the search/listing to be measured below 2 s in the browser with representative volume, and the demo scenario (gestor combining filters, prestador seeing only own) needs a human to confirm the UI narrows the list in real time. Autopilot must not attest this itself.

## Startup and Readiness

1. `docker compose up -d` from the repository root (Edge on `:80`, API on `:3001`).
2. Readiness: `curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health` → `200`.
3. Credentials: `backend/.env` → `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.
4. Three user accounts in the same domain: admin, gestor, prestador (seeded or created via UI).
5. Seed representative volume: the automated FR-003 test seeds 2000 tasks; for the browser measurement, confirm the domain has at least a few hundred contracts/tasks (the test fixture volume is acceptable).

## Target

- SPA: `http://localhost/` (Flutter Web behind nginx)
- Endpoints under review: `GET /api/search/contracts`, `GET /api/search/tasks`
- Scope: combined filters, token-domain scoping, browser-timed p95; no other epic's UI

## Scenarios Needing Human Review

| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Browser-timed p95 | Open the browser dev tools network tab, run a search with combined filters (status + finalidade + prestador) over the seeded volume, and confirm the response time stays below 2 s. Repeat 5 times and note the slowest. |
| 2 | Gestor combines filters | Log in as gestor, search for a supplier name, then apply status `atrasado` (or a known status) plus finalidade and prazo; confirm the list narrows to exactly the matching contracts in real time. |
| 3 | Prestador sees only own | Log in as prestador, run the same search; confirm only the prestador's own tasks appear — no contracts or tasks of another prestador or another domain. |
| 4 | Empty result is readable | Apply a filter combination that matches nothing; confirm an empty list appears with no error and the pagination stays consistent (no crash, no spinner hang). |
| 5 | Page beyond total | If the UI exposes pagination, jump to a page beyond the last; confirm an empty page with no error. |

Automated evidence already green: unit 111/111, smoke 118/118 (zero regression on E002/E003/E006), `flutter analyze` clean, widget tests 16/16, `npm audit --audit-level=high` 0 vulnerabilities, `node --check` clean.

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
| Browser-timed p95 < 2 s | PENDING |
| Gestor combines filters, list narrows | PENDING |
| Prestador sees only own tasks | PENDING |
| Empty result readable, pagination consistent | PENDING |
| Page beyond total returns empty without error | PENDING |
