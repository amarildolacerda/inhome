# Tasks: Agenda de manutenção preventiva recorrente (00024)

**Input**: `specs/00024-agenda-de-manutencao-preventiva-recorrente/` · **Epic**: E022

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 2 tabelas novas, 0 deps.

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 [P] {FR-092,FR-093,FR-094,FR-103} Create rule route acceptance stubs ← plan:AcceptanceTestStubs
- [X] T002 [P] {FR-095,FR-096,FR-098,FR-099} Create generation acceptance stubs ← plan:AcceptanceTestStubs
- [X] T003 [P] {FR-097,FR-100,FR-101,FR-104} Create task alert sweep acceptance stubs ← plan:AcceptanceTestStubs

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T004 {FR-095,FR-096} Add maintenance DDL to backend/src/config/database.js after:T002 [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T005 {FR-092,FR-103} Add auth, scope and role guards to backend/src/routes/maintenanceSchedules.js after:T001
- [X] T006 {FR-092,FR-093} Add validateScheduleInput in backend/src/services/maintenanceSchedules.js after:T005 → exports: validateScheduleInput [VERIFY: cd backend && node --test src/services/maintenanceSchedules.test.js]
- [X] T007 {FR-097} Add createTaskForOccurrence in backend/src/services/maintenanceSchedules.js after:T006 → exports: createTaskForOccurrence
- [X] T008 {FR-100,FR-101} Add syncMaintenanceAlerts in backend/src/services/maintenanceSchedules.js after:T006 → exports: syncMaintenanceAlerts
- [X] T009 {FR-095,FR-096,FR-098} Add calculateDueDates in backend/src/services/maintenanceSchedules.js after:T004 → exports: calculateDueDates

## Phase 3: Delivery [US1] - Configurar agenda (P1)

- [X] T010 [US1] {FR-092} [COMPLETES FR-092] Implement createRule in backend/src/routes/maintenanceSchedules.js after:T004 after:T005 after:T006
- [X] T011 [US1] {FR-093} [COMPLETES FR-093] Validate interval, start date, lead and assignee after:T010
- [X] T012 [US1] {FR-094} [COMPLETES FR-094] Add updateMaintenanceRule in backend/src/services/maintenanceSchedules.js after:T010 → exports: updateMaintenanceRule
- [X] T013 [US1] {FR-103} [COMPLETES FR-103] Mount maintenance router in backend/src/server.js after:T011 after:T012 [VERIFY: grep -q /api/v2/maintenance backend/src/server.js]

## Phase 4: Delivery [US2] - Gerar ocorrências (P1)

- [X] T014 [US2] {FR-095} [COMPLETES FR-095] Implement generateOccurrences with UNIQUE key after:T009 after:T013 → exports: generateOccurrences
- [X] T015 [US2] {FR-096} [COMPLETES FR-096] Make runMaintenanceSweep idempotent per domain after:T014 → exports: runMaintenanceSweep
- [X] T016 [US2] {FR-098} [COMPLETES FR-098] Apply 90-day horizon and skip past dates after:T009
- [X] T017 [US2] {FR-097} [COMPLETES FR-097] Create task with due date and default assignee after:T007 after:T014 ← T007:createTaskForOccurrence
- [X] T018 [US2] {FR-099} [COMPLETES FR-099] Preserve tasks and history on rule edit or deactivation after:T012 after:T014
- [X] T019 [US2] {FR-104} Implement manual sweep route in backend/src/routes/maintenanceSchedules.js after:T015 → exports: runSweep
- [X] T020 [US2] {FR-104} [COMPLETES FR-104] Wire boot and hourly sweep in backend/src/server.js after:T019

## Phase 5: Delivery [US3] - Alertas (P1)

- [X] T021 [US3] {FR-100} Upsert maintenance_schedule alerts with domain and rule windows after:T008 after:T015 ← T008:syncMaintenanceAlerts
- [X] T022 [US3] {FR-101} [COMPLETES FR-101] Remove alerts on completion, deactivation or closed contract after:T008 after:T021 ← T008:syncMaintenanceAlerts
- [X] T023 [US3] {FR-100} [COMPLETES FR-100] Verify dedup and cleanup in backend/src/services/maintenanceSchedules.test.js after:T021 after:T022 [VERIFY: cd backend && node --test src/services/maintenanceSchedules.test.js]

## Phase 6: Delivery [US4] - Agenda no contrato (P2)

- [X] T024 [US4] {FR-102} Add maintenance API client in frontend/lib/services/maintenance_schedules_api.dart after:T013 → exports: fetchMaintenanceSchedules
- [X] T025 [US4] {FR-102} Add MaintenanceScheduleSection in frontend/lib/widgets/maintenance_schedule_section.dart after:T024 ← T024:fetchMaintenanceSchedules
- [X] T026 [US4] {FR-102} [COMPLETES FR-102] Embed section in frontend/lib/screens/contract_detail_screen.dart after:T025

## Phase 7: Polish

- [X] T027 {FR-103} [COMPLETES FR-103] Verify role-scoped access in backend/src/routes/maintenanceSchedules.test.js after:T013
- [X] T028 Run full battery after:T020 after:T023 after:T026 after:T027 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test] [VERIFY: cd backend && npm audit --audit-level=high]

## Dependencies

Setup → Foundational → Delivery [US1] → [US2] → [US3] → [US4] → Polish. `after:` is hard order; `←` consumes the producer export.
