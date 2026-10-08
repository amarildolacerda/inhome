# Tasks: Workflow Assistido por OpenCode (E0003)

## Phase 1: Foundational

- [X] T001 Tabelas novas em backend/src/config/database.js [VERIFY: grep "contract_definitions" backend/src/config/database.js]

## Phase 2: Delivery [US1] Definições (P1)

- [X] T002 [US1] {FR-001,FR-019} Create acceptance test stub in backend/src/routes/definitions.test.js ← plan:AcceptanceTestStubs
- [X] T003 [US1] {FR-002} Create acceptance test stub in backend/src/models/ContractDefinition.test.js ← plan:AcceptanceTestStubs
- [X] T004 [US1] {FR-003} Create acceptance test stub in backend/src/routes/suggestions.test.js ← plan:AcceptanceTestStubs
- [X] T005 [US1] {FR-001} getDefinitions()/saveDefinitions() em backend/src/routes/definitions.js [VERIFY: node --test backend/src/routes/definitions.test.js]
- [X] T006 [P] [US1] {FR-002} listVersions()/requireRole() em backend/src/models/ContractDefinition.js [VERIFY: node --test backend/src/models/ContractDefinition.test.js]
- [X] T007 [US1] {FR-003} assertDefinitionsComplete() 400 em backend/src/routes/suggestions.js [VERIFY: node --test backend/src/routes/suggestions.test.js]
- [X] T008 [US1] {FR-019} requireRole()/scopeDomain() em backend/src/routes/definitions.js

## Phase 3: Delivery [US2] Sugestão OpenCode (P1)

- [X] T009 [US2] {FR-004,FR-005,FR-006,FR-018,FR-020} Create acceptance test stub in backend/src/services/opencode.test.js ← plan:AcceptanceTestStubs
- [X] T010 [P] [US2] {FR-018} isEnabled() e run({timeoutMs}) sem retry em backend/src/config/opencode.js
- [X] T011 [US2] {FR-020} buildContext() por allowlist em backend/src/services/opencode.js
- [X] T012 [US2] {FR-004} requestAnalysis() em backend/src/services/opencode.js [VERIFY: node --test backend/src/services/opencode.test.js]
- [X] T013 [US2] {FR-005} parseSuggestion()/createSuggestion() em backend/src/models/TaskSuggestion.js
- [X] T014 [US2] {FR-006} runAnalysisJob()/markFailed() em backend/src/services/opencode.js
- [X] T031 [US2] {FR-021} Create acceptance test stub in backend/src/server.socket.test.js ← plan:AcceptanceTestStubs
- [X] T032 [US2] {FR-021} getAnalysisStatus()/emitDomainEvent('analysis_state') em backend/src/server.js [VERIFY: node --test backend/src/server.socket.test.js]

## Phase 4: Delivery [US3] Aprovação (P1)

- [X] T015 [US3] {FR-007,FR-008,FR-009} Create acceptance test stub in backend/src/routes/suggestions.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-007" backend/src/routes/suggestions.test.js]
- [X] T016 [US3] {FR-007} updateItem()/removeItem() em backend/src/routes/suggestions.js
- [X] T017 [US3] {FR-008} refineSuggestion() nova versão em backend/src/routes/suggestions.js
- [X] T018 [US3] {FR-009} approveSuggestion() recusa lista vazia em backend/src/routes/suggestions.js

## Phase 5: Delivery [US4] Workflow (P1)

- [X] T019 [US4] {FR-010,FR-011,FR-013} Create acceptance test stub in backend/src/routes/workflow.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-010" backend/src/routes/workflow.test.js]
- [X] T020 [US4] {FR-012} Create acceptance test stub in backend/src/server.socket.test.js ← plan:AcceptanceTestStubs
- [X] T021 [US4] {FR-010} activateWorkflow()/optInManualTask() em backend/src/routes/workflow.js after:T013 [VERIFY: node --test backend/src/routes/workflow.test.js]
- [X] T022 [US4] {FR-011} listTasks()/updateTaskStatus() em backend/src/routes/tasks.js [VERIFY: node --test backend/src/routes/workflow.test.js]
- [X] T023 [US4] {FR-012} emitDomainEvent('workflow_activated') em backend/src/services/events.js [VERIFY: node --test backend/src/server.socket.test.js]
- [X] T024 [US4] {FR-013} getActiveWorkflow() por papel em backend/src/routes/workflow.js

## Phase 6: Delivery [US5] Plano de execução (P1)

- [X] T036 [US5] {FR-014} Create acceptance test stub in backend/src/services/opencode.test.js ← plan:AcceptanceTestStubs
- [X] T025 [US5] {FR-014} requestExecutionPlan()/parsePlan() em backend/src/services/opencode.js [VERIFY: grep "requestExecutionPlan" backend/src/services/opencode.js]
- [X] T037 [US5] {FR-015} Create acceptance test stub in backend/src/routes/executionPlan.test.js ← plan:AcceptanceTestStubs
- [X] T026 [US5] {FR-015} getPlan()/regeneratePlan() em backend/src/routes/executionPlan.js [VERIFY: grep "regeneratePlan" backend/src/routes/executionPlan.js]
- [X] T038 [US5] {FR-016} Create acceptance test stub in backend/src/models/ExecutionPlan.test.js ← plan:AcceptanceTestStubs
- [X] T027 [US5] {FR-016} upsertPlan() sem escrita de execução em backend/src/models/ExecutionPlan.js [VERIFY: grep "upsertPlan" backend/src/models/ExecutionPlan.js]

## Phase 7: Delivery [US6] Histórico (P3)

- [X] T028 [US6] {FR-017} recordVersion()/listVersions() em backend/src/models/History.js [VERIFY: grep "recordVersion" backend/src/models/History.js]

## Phase 8: Delivery [US7] Revisão na vigência (P2)

- [X] T033 [US7] {FR-022} loadReviewContext()/submitRevision() assíncrono em backend/src/routes/review.js [VERIFY: grep "submitRevision" backend/src/routes/review.js]
- [X] T034 [US7] {FR-023} applyApprovedRevision() só A Fazer, conflito em backend/src/routes/review.js [VERIFY: grep "applyApprovedRevision" backend/src/routes/review.js]
- [X] T035 [US7] {FR-024} startManualReview() gatilho manual, sem reanálise em backend/src/routes/review.js [VERIFY: grep "startManualReview" backend/src/routes/review.js]

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T029 Definições, revisão e plano em frontend/lib (api_service.dart) [VERIFY: grep "definitions" frontend/lib/services/api_service.dart]
- [X] T030 backend/test.sh: fluxo análise-aprovação-evento com CLI fake [VERIFY: bash backend/test.sh]

## Dependencies

Phase 1; US1-US7; Polish por último; stub antes da impl; T021 after:T013; [P] sem after:/←; T031-T038 na fase do requisito.

## Phase: Bug Fixes
- [X] T039 [BUG:ERROR] {FR-021} [requirement-gap] Análise/sugestão sem UI (US2/US3) — frontend/lib/screens/contract_detail_screen.dart:360
  > NEW-UI ausente (FR-021/SC-002/SC-004)
- [X] T040 [BUG:WARNING] {FR-017} [requirement-gap] listSuggestions declarado sem rota — contracts/openapi.yaml:309
