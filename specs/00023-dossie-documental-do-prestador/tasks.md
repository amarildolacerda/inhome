# Tasks: Dossiê documental do prestador (00023)

**Input**: `specs/00023-dossie-documental-do-prestador/` · **Epic**: E021

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 3 tabelas novas, 0 deps.

## Epic / Capability Map

`[US1]` dossiê + checklist · `[US2]` guardas · `[US3]` alertas (FR-080..091)

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 [P] {FR-080,FR-081,FR-082,FR-083,FR-090,FR-091} Create dossier acceptance stubs from plan rows ← plan:AcceptanceTestStubs
- [X] T002 [P] {FR-084,FR-087} Create compliance acceptance stubs from plan rows ← plan:AcceptanceTestStubs
- [X] T003 [P] {FR-088,FR-089} Create alert acceptance stubs from plan rows ← plan:AcceptanceTestStubs
- [X] T004 {FR-085} Create contract-link guard stub from plan rows ← plan:AcceptanceTestStubs
- [X] T005 {FR-086} Create task-assignment guard stub from plan rows ← plan:AcceptanceTestStubs

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T006 {FR-080,FR-081,FR-083} Add DDLs to backend/src/config/database.js [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T007 {FR-081,FR-083} Add document type and scope codes to the shared enum registry
- [X] T008 {FR-084} [COMPLETES FR-084] Implement checklist fallback in backend/src/services/providerCompliance.js → exports: resolveChecklist() [VERIFY: cd backend && node --test src/services/providerCompliance.test.js]
- [X] T009 {FR-085,FR-086,FR-087} Add evaluateProviderCompliance and assertProviderCompliant to backend/src/services/providerCompliance.js ← T008:resolveChecklist [VERIFY: cd backend && node --test src/services/providerCompliance.test.js]
- [X] T010 {FR-088,FR-089} Add syncProviderDocumentAlerts to backend/src/services/providerDocumentAlerts.js → exports: syncProviderDocumentAlerts() [VERIFY: cd backend && node --test src/services/providerDocumentAlerts.test.js]
- [X] T011 {FR-091} Add JWT, domain scope and role guards in backend/src/routes/providerDocuments.js

## Phase 3: Delivery [US1] - Dossiê e checklist (P1)

- [X] T012 [US1] {FR-080} [COMPLETES FR-080] Worker CRUD in backend/src/routes/providerDocuments.js after:T006 [VERIFY: cd backend && node --test src/routes/providerDocuments.test.js]
- [X] T013 [US1] {FR-081} [COMPLETES FR-081] Document upload in backend/src/routes/providerDocuments.js after:T006 [VERIFY: cd backend && node --test src/routes/providerDocuments.test.js]
- [X] T014 [US1] {FR-082} [COMPLETES FR-082] Edit and review in backend/src/routes/providerDocuments.js after:T013 [VERIFY: cd backend && node --test src/routes/providerDocuments.test.js]
- [X] T015 [US1] {FR-083} Checklist CRUD in backend/src/routes/providerDocuments.js after:T006 [VERIFY: cd backend && node --test src/routes/providerDocuments.test.js]
- [X] T016 [US1] {FR-090} Dossier query in backend/src/routes/providerDocuments.js after:T009 after:T012 after:T014 [VERIFY: cd backend && node --test src/routes/providerDocuments.test.js]
- [X] T017 [US1] {FR-091} Mount provider router in the v2 bootstrap after:T016 [VERIFY: grep -q '/api/v2/providers' backend/src/server.js]
- [X] T018 [US1] {FR-090} Fill dossier route acceptance stubs after:T017
- [X] T019 [US1] {FR-090} Add dossier API client methods fetchDossier and fetchRequirements after:T017
- [X] T020 [US1] {FR-090} [COMPLETES FR-090] Add dossier screen in frontend/lib/screens/dossier_screen.dart → exports: DossierScreen after:T019 [VERIFY: cd frontend && flutter test]
- [X] T021 [US1] {FR-083} [COMPLETES FR-083] Add checklist screen with purpose and scope selection after:T015

## Phase 4: Delivery [US2] - Bloqueio sem documentação (P1)

- [X] T022 [US2] {FR-085} Add compliance guard to linkPrestador in backend/src/routes/contracts.js after:T009 [VERIFY: cd backend && node --test src/routes/contracts.test.js]
- [X] T023 [US2] {FR-086} Add compliance guard to assignment in backend/src/routes/tasks.js after:T009 [VERIFY: cd backend && node --test src/routes/tasks.test.js]
- [X] T024 [US2] {FR-085} [COMPLETES FR-085] Fill link refusal stub with missing reason after:T022
- [X] T025 [US2] {FR-086} [COMPLETES FR-086] Fill assignment refusal stub with missing reason after:T023
- [X] T026 [US2] {FR-087} Verify no retroactive unlink in backend/src/services/providerCompliance.test.js after:T009 [VERIFY: cd backend && node --test src/services/providerCompliance.test.js]
- [X] T027 [US2] {FR-087} [COMPLETES FR-087] Add guard flow to the smoke script after:T024 after:T025

## Phase 5: Delivery [US3] - Alertas (P1)

- [X] T028 [US3] {FR-088} Wire alert sync into backend/src/services/alerts.js ← T010:syncProviderDocumentAlerts after:T010 [VERIFY: cd backend && node --test src/services/providerDocumentAlerts.test.js]
- [X] T029 [US3] {FR-088} [COMPLETES FR-088] Fill alert dedup stub after:T028
- [X] T030 [US3] {FR-089} Verify alert cleanup in backend/src/services/providerDocumentAlerts.test.js after:T010 [VERIFY: cd backend && node --test src/services/providerDocumentAlerts.test.js]
- [X] T031 [US3] {FR-089} [COMPLETES FR-089] Add alert flow to the smoke script after:T029 after:T030

## Phase 6: Polish

- [X] T032 {FR-091} [COMPLETES FR-091] Add dossier rail entry for admin and gestor after:T020 [VERIFY: cd frontend && flutter analyze lib test]
- [X] T033 Document provider endpoints in TECHNICAL.md after:T017
- [X] T034 Run full battery after:T027 after:T031 after:T032 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test] [VERIFY: cd backend && npm audit --audit-level=high]

## Dependencies

Setup → Foundational → Delivery [US1] → [US2] → [US3] → Polish. `after:` is a hard order; `←` consumes the producer's export.
