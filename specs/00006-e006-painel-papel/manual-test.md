# Manual Test Plan: E006 — Painel por papel

**Generated**: 2026-10-09
**Reason**: SC-002 requires keyboard-only navigation with visible focus and readable labels on the main screens, plus the theme loading without unstyled content flash. Autopilot must not attest this itself.

## Startup and Readiness

1. `docker compose up -d` from the repository root (Edge on `:80`, API on `:3001`).
2. Readiness: `curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health` → `200`.
3. Credentials: `backend/.env` → `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.
4. Three user accounts in the same domain: admin, gestor, prestador (seeded or created via UI).

## Target

- SPA: `http://localhost/` (Flutter Web behind nginx)
- Screens under review: Dashboard (painel), Minhas Tarefas, Projetos
- Scope: keyboard navigation, accessible labels, theme bootstrap, role-based dashboard view; no other epic's UI

## Scenarios Needing Human Review

| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Keyboard-only navigation | With no mouse, press Tab/Shift+Tab through the NavigationRail and each main screen; every interactive element receives visible focus and has a readable label |
| 2 | Accessible labels | Enable a screen reader (or inspect the accessibility tree) and confirm the NavigationRail is announced as "Navegação principal", the dashboard as "Painel do domínio", tasks as "Minhas Tarefas", and projects as "Projetos" |
| 3 | Theme bootstrap without flash | Reload the page and confirm the theme applies from the first paint — no unstyled content flash before the Flutter bundle renders |
| 4 | Role-based dashboard comparison | Log in as admin, gestor, and prestador in the same domain; confirm admin/gestor see domain-wide totals and prestador sees only their own tasks — compare side by side |
| 5 | system_admin denied | Log in as system_admin and confirm `/api/dashboard/stats` returns 403 (no dashboard access) |

Automated evidence already green: unit 107/107, smoke 118/118, `flutter analyze` clean, widget tests 16/16, `npm audit --audit-level=high` 0 vulnerabilities.

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
| Keyboard-only navigation with visible focus | PENDING |
| Accessible labels on main screens | PENDING |
| Theme bootstrap without unstyled flash | PENDING |
| Role-based dashboard comparison (3 roles) | PENDING |
| system_admin denied with 403 | PENDING |
