# Tasks: Gestão de Contratos de Terceiros (MVP)

**Input**: `specs/00001-contratos-mvp/` · **Prerequisites**: `plan.md`, `spec.md`
**Tests**: Plan Acceptance Test Stubs → mandatory RED stub tasks; no separate TDD phase.
**Organization**: One phase per `US#`; shared blockers in Foundational; stub precedes impl.

## Project Mode

Brownfield — in-place remodel `projects`→`contratos` (AD-003); no generic bootstrap.

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 Add supertest devDependency and test script in backend/package.json

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T002 {FR-003,FR-014,FR-022,FR-024,FR-025} Create acceptance test stubs per plan in backend/src/middleware/auth.test.js ← plan:AcceptanceTestStubs
- [X] T003 {FR-024,FR-025} Implement sql.js DB factory in backend/src/config/database.js → exports: getDomainDb(),getPlatformDb(),initSqlDriver() [VERIFY: grep getDomainDb backend/src/config/database.js]
- [X] T004 {FR-003,FR-022,FR-002,FR-014} Implement JWT/role/domain guards in backend/src/middleware/auth.js → exports: requireRole(),signJwt(),scopeDomain() [VERIFY: grep requireRole backend/src/middleware/auth.js]

## Phase 3: Delivery [US1] Domínio (P1) 🎯 MVP

- [X] T005 [US1] {FR-001,FR-002} Create acceptance test stub in backend/src/routes/domains.test.js ← plan:AcceptanceTestStubs
- [X] T006 [US1] {FR-001,FR-002} Implement enable/suspend/reactivate in backend/src/routes/domains.js + frontend/lib/screens/domains_screen.dart → exports: enableDomain(),suspendDomain()

## Phase 4: Delivery [US2] Preparação (P1) 🎯 MVP

- [X] T007 [US2] {FR-004,FR-005} Create acceptance test stub in backend/src/routes/users.test.js ← plan:AcceptanceTestStubs
- [X] T008 [US2] {FR-004} Implement user CRUD in backend/src/routes/users.js → exports: create(),listUser()
- [X] T009 [US2] {FR-005} Implement finalidade dictionary in backend/src/routes/finalidades.js → exports: create(),listFinalidade()

## Phase 5: Delivery [US3] Contrato (P1) 🎯 MVP

- [X] T010 [US3] {FR-006,FR-007,FR-008,FR-009} Create acceptance test stub in backend/src/routes/contracts.test.js ← plan:AcceptanceTestStubs
- [X] T011 [US3] {FR-006,FR-007,FR-008,FR-009} Remodel projects to contratos; CRUD, link, prorrogação, encerramento, delete in backend/src/routes/contracts.js → exports: createContract(),linkPrestador()

## Phase 6: Delivery [US4] Tarefas (P1) 🎯 MVP

- [X] T012 [US4] {FR-010} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs
- [X] T013 [US4] {FR-010} Implement task status flow and linked-prestador check in backend/src/routes/tasks.js → exports: updateTaskStatus(),assertLinkedPrestador()

## Phase 7: Delivery [US5] Execução (P1) 🎯 MVP

- [X] T014 [US5] {FR-011,FR-013,FR-015,FR-023} Create acceptance test stub per plan in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs
- [X] T015 [US5] {FR-011,FR-013} Implement completeTask (text+photos) and role-scoped listTasks in backend/src/routes/tasks.js → exports: completeTask(),listTasks()
- [X] T016 [US5] {FR-015} Implement comments/attachments in backend/src/routes/comments.js → exports: addComment()
- [X] T017 [US5] {FR-023} Implement disk upload middleware in backend/src/middleware/upload.js → exports: saveToUploads()

## Phase 8: Delivery [US6] Reabertura (P1) 🎯 MVP

- [X] T018 [US6] {FR-012} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs
- [X] T019 [US6] {FR-012} Implement reopenTask with motivo in history in backend/src/routes/tasks.js → exports: reopenTask()

## Phase 9: Delivery [US7] Relatório (P1) 🎯 MVP

- [X] T020 [US7] {FR-018} Create acceptance test stub in backend/src/services/report.test.js ← plan:AcceptanceTestStubs
- [X] T021 [US7] {FR-018} Implement PDF/CSV per contract in backend/src/services/report.js → exports: generateContractPdf(),exportContractCsv()

## Phase 10: Delivery [US8] Isolamento (P1) 🎯 MVP

- [X] T022 [US8] {FR-014,FR-024} Create acceptance test stub in backend/src/middleware/auth.test.js ← plan:AcceptanceTestStubs
- [X] T023 [US8] {FR-014} Enforce cross-domain 403/404 in backend/src/middleware/auth.js → exports: scopeDomain()

## Phase 11: Delivery [US9] Busca (P1) 🎯 MVP

- [X] T024 [US9] {FR-016,FR-026} Create acceptance test stub in backend/src/routes/search.test.js ← plan:AcceptanceTestStubs
- [X] T025 [US9] {FR-016} Implement search/filters in backend/src/routes/search.js → exports: searchContracts(),searchTasks()
- [X] T026 [US9] {FR-026} Add indexes and paged listContracts in backend/src/config/database.js → exports: ensureIndexes()

## Phase 12: Delivery [US10] E-mail (P1) 🎯 MVP

- [X] T027 [US10] {FR-017} Create acceptance test stub in backend/src/services/email.test.js ← plan:AcceptanceTestStubs
- [X] T028 [US10] {FR-017} Implement SMTP-gated notifier in backend/src/services/email.js → exports: notify(),smtpConfigured()

## Phase 13: Delivery [US11] Dashboard (P1) 🎯 MVP

- [X] T029 [US11] {FR-019,FR-027,FR-028} Create acceptance test stub per plan in backend/src/routes/dashboard.test.js ← plan:AcceptanceTestStubs
- [X] T030 [US11] {FR-019} Implement domain metrics in backend/src/routes/dashboard.js → exports: getDomainMetrics()
- [ ] T031 [US11] {FR-027,FR-028} Wire web bootstrap and a11y labels in frontend/lib/main.dart + frontend/lib/theme/app_theme.dart → exports: main(),AppTheme.light

## Phase 14: Delivery [US12] Realtime (P1) 🎯 MVP

- [X] T032 [US12] {FR-020,FR-021,FR-029} Create acceptance test stub per plan in backend/src/server.test.js ← plan:AcceptanceTestStubs
- [X] T033 [US12] {FR-020,FR-029} Emit domain events and bind ports 3001/8080 in backend/src/server.js → exports: emitDomainEvent()
- [X] T034 [US12] {FR-021} Implement backend validation middleware in backend/src/middleware/validate.js → exports: validate()

## Dependencies

Setup → Foundational → Delivery (US1–US12). Stubs precede impl; Delivery starts after Foundational; phase order applies (no `after:` edges). `[VERIFY: cmd]` runs from repo root before `[X]`.
