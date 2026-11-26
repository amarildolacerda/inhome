# Tasks: Desempenho do prestador (00026)

**Input**: `specs/00026-desempenho-do-prestador/` · **Epic**: E024

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; cálculo derivado, 0 tabela, 0 dependência.

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 [P] {FR-001,FR-002,FR-003,FR-005,FR-006,FR-007,FR-008} Create service acceptance stubs ← plan:AcceptanceTestStubs [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T002 [P] {FR-004,FR-009} Create route acceptance stubs ← plan:AcceptanceTestStubs [VERIFY: cd backend && node --test src/routes/providerPerformance.test.js]

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T003 {FR-001,FR-009} Add computation skeleton in backend/src/services/providerPerformance.js after:T001 → exports: computeProviderPerformance [VERIFY: grep -q "function computeProviderPerformance" backend/src/services/providerPerformance.js]
- [X] T004 {FR-004,FR-009,FR-010,FR-012} Add guarded GET route and query parser in backend/src/routes/providerPerformance.js after:T002 [VERIFY: cd backend && node --test src/routes/providerPerformance.test.js]
- [X] T005 Mount performance router in backend/src/server.js after:T004 [VERIFY: grep -q '/api/v2/providers/performance' backend/src/server.js]
- [X] T006 {FR-010,FR-012} Add filtered fetch client in frontend/lib/services/provider_performance_api.dart after:T004 → exports: ProviderPerformanceApi.fetchPerformance [VERIFY: cd frontend && flutter analyze lib/services/provider_performance_api.dart]

## Phase 3: Delivery [US1] - Consultar nota e componentes (P1) 🎯 MVP

- [X] T007 [US1] {FR-002} Implement component scoring in backend/src/services/providerPerformance.js after:T003 → exports: scoreComponents [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T008 [US1] {FR-003} Implement no-data state in backend/src/services/providerPerformance.js after:T007 [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T009 [US1] {FR-004} Apply admin/gestor guard in backend/src/routes/providerPerformance.js after:T004 [VERIFY: cd backend && node --test src/routes/providerPerformance.test.js]
- [X] T010 [US1] {FR-001} [COMPLETES FR-001] Render score in frontend/lib/screens/provider_performance_screen.dart after:T006 after:T008 → exports: ProviderPerformanceScreen [VERIFY: cd frontend && flutter test test/provider_performance_screen_test.dart]
- [X] T011 [US1] {FR-002} [COMPLETES FR-002] Render components in frontend/lib/screens/provider_performance_screen.dart after:T010 → exports: ProviderPerformanceScreen [VERIFY: cd frontend && flutter test test/provider_performance_screen_test.dart]
- [X] T012 [US1] {FR-003} [COMPLETES FR-003] Render no-data state in frontend/lib/screens/provider_performance_screen.dart after:T010 → exports: ProviderPerformanceScreen [VERIFY: cd frontend && flutter test test/provider_performance_screen_test.dart]
- [X] T013 [US1] {FR-004} [COMPLETES FR-004] Add role-scoped rail entry in frontend/lib/main.dart after:T009 after:T012 → exports: _baseEntriesForRole [VERIFY: grep -q 'ProviderPerformanceScreen' frontend/lib/main.dart]

## Phase 4: Delivery [US2] - Entender cada ocorrência (P1) 🎯 MVP

- [X] T014 [US2] {FR-005,FR-006} Derive occurrences with source and reason in backend/src/services/providerPerformance.js after:T007 → exports: deriveProviderOccurrences [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T015 [US2] {FR-007} Dedupe reopen in backend/src/services/providerPerformance.js after:T014 → exports: dedupeOccurrences [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]

## Phase 5: Delivery [US3] - Confiar no cálculo (P1) 🎯 MVP

- [X] T016 [US3] {FR-008} [COMPLETES FR-008] Add deterministic regression for backend/src/services/providerPerformance.js after:T015 [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T017 [US3] {FR-009} [COMPLETES FR-009] Add cross-domain isolation regression for backend/src/routes/providerPerformance.js after:T016 [VERIFY: cd backend && node --test src/routes/providerPerformance.test.js]

## Phase 6: Delivery [US4] - Localizar prestador e período (P2)

- [X] T018 [US4] {FR-010} [COMPLETES FR-010] Filter by name and period in frontend/lib/screens/provider_performance_screen.dart after:T012 → exports: ProviderPerformanceScreen [VERIFY: cd frontend && flutter test test/provider_performance_screen_test.dart]
- [X] T019 [US4] {FR-011} Sort by score in backend/src/services/providerPerformance.js after:T015 → exports: sortProviders [VERIFY: cd backend && node --test src/services/providerPerformance.test.js]
- [X] T020 [US4] {FR-012} [COMPLETES FR-012] Paginate 100 items in frontend/lib/screens/provider_performance_screen.dart after:T018 → exports: ProviderPerformanceScreen [VERIFY: cd frontend && flutter test test/provider_performance_screen_test.dart]

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T021 Run full backend, Flutter and audit suites after:T020 [VERIFY: cd backend && npm test] [VERIFY: cd frontend && flutter test] [VERIFY: cd backend && npm audit --audit-level=high]
