# Task List: Acesso de auditoria e classificação de tarefas executadas E011 (00013)

Generated: 2026-10-11 | Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | P1: US1, US2

## Project Mode

`Brownfield` — extensão de backend Express/sql.js e Flutter Web, sem bootstrap.

## Brownfield Notes

- Guards E001 (`requireRole`, `scopeDomain`) e migração `alert_events` são consumo.
- Rotas `/api/tasks` de E003 intactas; backend sem bind mount → rebuild antes dos testes.

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 {FR-005} Estender ROLES com `auditor` em backend/src/routes/users.js (createUser e PUT validam; desconhecido segue 400) → exports: ROLES [VERIFY: grep "'auditor'" backend/src/routes/users.js]

## Phase 2: Delivery [US1] — Auditoria e classificação das executadas (P1) 🎯 MVP

- [X] T002 [P] [US1] {FR-001,FR-002,FR-004} Create acceptance test stub in backend/src/routes/audits.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-001 executed-only" backend/src/routes/audits.test.js]
- [X] T003 [P] [US1] {FR-003} Create acceptance test stub in backend/src/models/TaskClassification.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-003 single current" backend/src/models/TaskClassification.test.js]
- [X] T004 [US1] {FR-003} Criar TaskClassification em backend/src/models/TaskClassification.js — upsert ON CONFLICT(task_id) e getByTask → exports: upsert, getByTask [VERIFY: grep "function upsert" backend/src/models/TaskClassification.js]
- [X] T005 [US1] {FR-001} listAuditTasks e getAuditTask em backend/src/routes/audits.js (lista Revisão/Concluída do domínio; detalhe agrega histórico e anexos) ← T004:getByTask [VERIFY: node --check backend/src/routes/audits.js]
- [X] T006 [US1] {FR-002,FR-004} [COMPLETES FR-004] putClassification (valida estado/nota, gate Revisão/Concluída) em backend/src/routes/audits.js e montagem em backend/src/server.js ← T004:upsert → exports: putClassification [VERIFY: node --check backend/src/routes/audits.js]

## Phase 3: Delivery [US2] — Papel controlado e isolado (P1) 🎯 MVP

- [X] T007 [US2] {FR-005} Create acceptance test stub in backend/src/routes/users.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-005 auditor in role enum" backend/src/routes/users.test.js]
- [X] T008 [US2] {FR-006} Create acceptance test stub in backend/src/routes/audits.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-006 role and domain guards" backend/src/routes/audits.test.js]
- [X] T009 [US2] {FR-007} Create acceptance test stub in frontend/test/audit_nav_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-007 shows Auditoria" frontend/test/audit_nav_test.dart]
- [X] T010 [US2] {FR-005} [COMPLETES FR-005] Green FR-005: role auditor aceito no CRUD, desconhecido segue 400 — backend/src/routes/users.test.js ← T001:ROLES [VERIFY: node --test backend/src/routes/users.test.js]
- [X] T011 [US2] {FR-006} requireRole/scopeDomain em backend/src/routes/audits.js e suíte 403 em backend/src/routes/audits.test.js (prestador, system_admin, domínio cruzado) after:T006 [VERIFY: node --test backend/src/routes/audits.test.js]
- [X] T012 [P] [US2] {FR-007} Cliente em frontend/lib/services/api_service.dart, helper em frontend/lib/models/user.dart, gate em frontend/lib/main.dart → exports: hasAuditAccess, listAuditTasks, putClassification [VERIFY: grep "hasAuditAccess" frontend/lib/models/user.dart]
- [X] T013 [US2] {FR-007} [COMPLETES FR-007] Tela frontend/lib/screens/audit_screen.dart e teste verde em frontend/test/audit_nav_test.dart ← T012:hasAuditAccess [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter analyze && flutter test"]

## Phase 4: Polish

- [X] T014 Bateria zero-regressão: rebuild do backend, unit ≥145, smoke ≥118, flutter ≥24 + analyze, audit 0 [VERIFY: bash backend/test.sh]
- [X] T015 Higiene final: node --check em backend/src, TODO.md conferido, marcador .completed escrito [VERIFY: find backend/src -name '*.js' -print0 | xargs -0 -n1 node --check]

## Dependencies

- T001 (Foundational) desbloqueia T010 e os testes de US1 que criam usuário `auditor`.
- T002/T003 criam os stubs RED; T004 modelo, T005 leitura, T006 escrita deixam cada bloco verde em ordem.
- T005 consome `getByTask` de T004; T006 consome `upsert` de T004 e monta o router.
- T011 depende de T006 (rotas montadas); T012 é frontend independente; T013 consome `hasAuditAccess` de T012.
- T014 exige todas as Delivery; rebuild obrigatório (backend sem bind mount). T015 depende de T014.
- Guards E001, tabelas e fluxo de E003 são consumo, sem entrega nova.
