# Tasks: Régua de notificação configurável (00025)

**Input**: `specs/00025-regua-de-notificacao-configuravel/` · **Epic**: E023

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 2 tabelas, colunas aditivas, 0 deps.

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 [P] {FR-105,FR-107,FR-115} Create rule route acceptance stubs ← plan:AcceptanceTestStubs
- [X] T002 [P] {FR-106,FR-108,FR-109,FR-110,FR-111,FR-113,FR-114} Create rule service acceptance stubs ← plan:AcceptanceTestStubs
- [X] T003 [P] {FR-112} Create panel acceptance stubs ← plan:AcceptanceTestStubs

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T004 {FR-105,FR-108,FR-113} Add rule DDL and additive alert_events columns in backend/src/config/database.js after:T002 [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T005 {FR-105} Add auth, scope and role guards in backend/src/routes/notificationRules.js after:T001
- [X] T006 {FR-105,FR-107} Add validateRuleInput in backend/src/services/notificationRules.js after:T005 → exports: validateRuleInput [VERIFY: cd backend && node --test src/services/notificationRules.test.js]
- [X] T007 {FR-106} Add deriveSteps from domain windows in backend/src/services/notificationRules.js after:T004 after:T006 → exports: deriveSteps
- [X] T008 {FR-105,FR-113,FR-115} Add saveRule and setRuleActive with audit in backend/src/services/notificationRules.js after:T007 → exports: saveRule, setRuleActive
- [X] T009 {FR-111} Add loadRuleSnapshot in backend/src/services/notificationRules.js after:T008 → exports: loadRuleSnapshot

## Phase 3: Delivery [US1] - Configurar a régua (P1)

- [X] T010 [US1] {FR-105} Implement PUT rule route in backend/src/routes/notificationRules.js after:T006 after:T008
- [X] T011 [US1] {FR-106} [COMPLETES FR-106] Derive steps from smallest window respecting interval after:T007 after:T010
- [X] T012 [US1] {FR-107} [COMPLETES FR-107] Reject bad payload without partial write after:T006 after:T010
- [X] T013 [US1] {FR-105} [COMPLETES FR-105] Mount rules router in backend/src/server.js after:T010 after:T012 [VERIFY: grep -q '/api/v2/alerts/rules' backend/src/server.js]

## Phase 4: Delivery [US2] - Emitir lembretes deduplicados (P1)

- [X] T014 [US2] {FR-111} [COMPLETES FR-111] Freeze rule snapshot for the whole sweep after:T009
- [X] T015 [US2] {FR-108} [COMPLETES FR-108] Insert distinct reminder rows by alert, step and channel in backend/src/services/notificationRules.js after:T004 after:T014 → exports: insertReminder [VERIFY: cd backend && node --test src/services/notificationRules.test.js]
- [X] T016 [US2] {FR-110} [COMPLETES FR-110] Guard duplicate emission with UNIQUE and OR IGNORE after:T015
- [X] T017 [US2] {FR-109} Deliver in_app via emitDomainEvent before email after:T015
- [X] T018 [US2] {FR-109} [COMPLETES FR-109] Deliver email via notify with failed status on SMTP error after:T017
- [X] T019 [US2] {FR-110} [COMPLETES FR-110] Verify dedup across repeated sweeps in backend/src/services/notificationRules.test.js after:T016 after:T018 [VERIFY: cd backend && node --test src/services/notificationRules.test.js]

## Phase 5: Delivery [US3] - Acompanhar e preservar eventos (P1)

- [X] T020 [US3] {FR-112} Enrich GET panel with rules and reminders in backend/src/routes/alerts.js after:T003 after:T008
- [X] T021 [US3] {FR-113} [COMPLETES FR-113] Preserve emitted events on rule edit or deactivation after:T008 after:T015
- [X] T022 [US3] {FR-114} [COMPLETES FR-114] Keep E004 and E010 behavior for domains without rule after:T014
- [X] T023 [US3] {FR-112} [COMPLETES FR-112] Render rules and reminders in frontend/lib/screens/vencimentos_screen.dart after:T020

## Phase 6: Delivery [US4] - Registrar autoria (P2)

- [X] T024 [US4] {FR-115} Add rules API client in frontend/lib/services/notification_rules_api.dart after:T013 → exports: fetchRules
- [X] T025 [US4] {FR-115} Add NotificationRuleSection in frontend/lib/widgets/notification_rule_section.dart after:T024 ← T024:fetchRules
- [X] T026 [US4] {FR-115} [COMPLETES FR-115] Show author and date in rule form after:T008 after:T025

## Phase 7: Polish

- [X] T027 Verify role-scoped access in backend/src/routes/notificationRules.test.js after:T013 after:T020 [VERIFY: cd backend && node --test src/routes/notificationRules.test.js]
- [X] T028 Run full battery after:T019 after:T022 after:T023 after:T026 after:T027 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test] [VERIFY: cd backend && npm audit --audit-level=high]

## Dependencies

Setup → Foundational → Delivery [US1] → [US2] → [US3] → [US4] → Polish. `after:` is hard order; `←` consumes the producer export.
