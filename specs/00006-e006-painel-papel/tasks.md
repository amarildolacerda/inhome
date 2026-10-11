# Tasks: Painel por papel (E006 / 00006)

**Input**: `spec.md`, `plan.md` em `specs/00006-e006-painel-papel/`
**Mode**: Brownfield — backend Express + `frontend/lib/`; sem Setup nem Foundational.

## Epic / Capability Map

- [US1] Visão do domínio por papel — FR-001, FR-002, FR-003
- [US2] Interface acessível no básico — FR-004, FR-005, FR-006

## Brownfield Notes

- Touched: `backend/src/routes/dashboard.test.js`, `frontend/lib/main.dart`, `frontend/lib/theme/app_theme.dart`, `frontend/lib/screens/{dashboard,tasks,projects}_screen.dart`, `frontend/test/`
- Sem migração (HINT-004): `contracts`, `tasks`, `users` inalterados; `GET /api/dashboard/stats` inalterado em contrato
- Regression: dashboard existente; unit 104+, smoke 118+, flutter 13+, `npm audit`

## Phase 1: Delivery [US1] Visão do domínio por papel (P1) 🎯 MVP

- [X] T001 [US1] {FR-001,FR-002,FR-003} Create acceptance test stub in backend/src/routes/dashboard.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-001 admin/gestor veem totais" backend/src/routes/dashboard.test.js]
- [X] T002 [US1] {FR-001} admin/gestor recebem totais do domínio em backend/src/routes/dashboard.test.js after:T001 [VERIFY: node --test backend/src/routes/dashboard.test.js]
- [X] T003 [US1] {FR-002} prestador recebe só tarefas próprias (scope own) em backend/src/routes/dashboard.test.js after:T001 [VERIFY: node --test backend/src/routes/dashboard.test.js]
- [X] T004 [US1] {FR-003} 403 para system_admin em backend/src/routes/dashboard.test.js after:T001 [VERIFY: node --test backend/src/routes/dashboard.test.js]

## Phase 2: Delivery [US2] Interface acessível no básico (P1) 🎯 MVP

- [X] T005 [US2] {FR-004,FR-006} Create acceptance test stub in frontend/test/web_browsers_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-004 bootstrap web" frontend/test/web_browsers_test.dart]
- [X] T006 [US2] {FR-005} Create acceptance test stub in frontend/test/a11y_labels_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-005 rótulos" frontend/test/a11y_labels_test.dart]
- [X] T007 [US2] {FR-004} Bootstrap web aplicado em frontend/lib/main.dart (verificar ProjecManagerApp/theme load) after:T005 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/web_browsers_test.dart"]
- [X] T008 [P] [US2] {FR-005} Semantics label em dashboard/tasks/projects screens (frontend/lib/screens/) after:T006 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/a11y_labels_test.dart"]
- [X] T009 [US2] {FR-006} Regressão fim a fim verde após main.dart (flutter test + backend/test.sh) after:T007,T008 [VERIFY: bash backend/test.sh]

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T010 [P] Rebuild backend (`docker compose build backend && docker compose up -d backend`) e bateria completa: unit, smoke, flutter, lint (`node --check backend/src/**/*.js`), audit after:T004,T009 [VERIFY: npm --prefix backend audit --audit-level=high]
- [X] T011 [P] Criar specs/00006-e006-painel-papel/manual-test.md com verificação de teclado/rótulos e comparação lado a lado dos três papéis after:T009 [VERIFY: grep "PENDING" specs/00006-e006-painel-papel/manual-test.md]

## Dependencies

Sem Setup/Foundational; fases de entrega em ordem US1 → US2; Polish por último. Stub sempre antes da impl do mesmo requisito na mesma fase. `after:` explícito: T002←T001, T003←T001, T004←T001, T007←T005, T008←T006, T009←T007,T008, T010←T004,T009, T011←T009. `[P]` sem `after:`/`←` na mesma leva.
