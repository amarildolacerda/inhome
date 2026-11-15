# Tasks: Indicadores de perpétuo, conclusão e tarefas atrasadas (00019)

**Input**: `specs/00019-dashboard-indicadores-de-contrato-perpetuo/` · **Epic**: E017

## Project Mode

`Brownfield`: backend Node/Express + sql.js + Flutter Web; sem bootstrap.

## Epic / Capability Map

- `[US1]` perpétuo: marcação, payload e marcador (FR-069..073, P1)
- `[US2]` conclusão: "Concluído" distinto do chip (FR-074..075, P1)
- `[US3]` atraso: contagens e KPI (FR-076..079, P2)

## Brownfield Notes

- Migração aditiva idempotente (`PRAGMA table_info`), sem backfill; `platform.db`/`tasks` intocados.
- Regressão: `cd backend && npm test`, `backend/test.sh`, `flutter test`, `flutter analyze`.

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 Add `perpetual INTEGER NOT NULL DEFAULT 0` guard in `backend/src/config/database.js` (`migrateSchema` + `CONTRACTS_DDL`) [VERIFY: grep "perpetual" backend/src/config/database.js]
- [X] T002 Idempotency test for `perpetual` in `backend/src/config/database.test.js` after:T001 [VERIFY: cd backend && node --test src/config/database.test.js]

## Phase 2: Delivery [US1] - Contrato perpétuo (Priority: P1) 🎯 MVP

- [X] T003 [P] [US1] {FR-069} Create acceptance test stub in `backend/src/routes/contracts.test.js` ← plan:AcceptanceTestStubs
- [X] T004 [P] [US1] {FR-070} Create acceptance test stub in `backend/src/routes/dashboard.test.js` ← plan:AcceptanceTestStubs
- [X] T005 [P] [US1] {FR-072} Create acceptance test stub in `backend/src/routes/alerts.test.js` ← plan:AcceptanceTestStubs
- [X] T006 [P] [US1] {FR-073} Create acceptance test stub in `backend/src/models/Contract.test.js` ← plan:AcceptanceTestStubs
- [X] T007 [P] [US1] {FR-071} Create acceptance test stub in `frontend/test/dashboard_redesign_test.dart` ← plan:AcceptanceTestStubs
- [X] T008 [US1] {FR-069} Validação de `perpetual` em POST/PUT em `backend/src/routes/contracts.js` (booleano; data exigida só sem marcador) after:T001 [VERIFY: cd backend && node --test src/routes/contracts.test.js]
- [X] T009 [US1] {FR-072,FR-073} Predicado único em `backend/src/models/Contract.js`: `isIncomplete` + guarda perpétuo em `isOverdue` → exports: Contract.isIncomplete(row), Contract.isOverdue(row,now) [VERIFY: cd backend && node --test src/models/Contract.test.js]
- [X] T010 [US1] {FR-072} [COMPLETES FR-072] Aplica `isIncomplete` nos 3 spots de `backend/src/routes/alerts.js` ← T009:isIncomplete [VERIFY: cd backend && node --test src/routes/alerts.test.js]
- [X] T011 [US1] {FR-070,FR-073} Expõe `perpetual` e exclui perpétuo de `a_vencer`/`atrasado` em `backend/src/routes/dashboard.js` ← T009:isOverdue → exports: summarizeContracts(rows), getDomainMetrics(db,user) [VERIFY: cd backend && node --test src/routes/dashboard.test.js]
- [X] T012 [US1] {FR-073} [COMPLETES FR-073] Recorte `?status=atrasado` exclui perpétuo em `backend/src/routes/contracts.js` after:T009 [VERIFY: cd backend && node --test src/routes/contracts.test.js]
- [X] T013 [US1] {FR-070} [COMPLETES FR-070] Lê `perpetual` em `frontend/lib/models/contract.dart` ← T011:summarizeContracts → exports: Contract.fromJson(json) [VERIFY: grep perpetual frontend/lib/models/contract.dart]
- [X] T014 [US1] {FR-069} [COMPLETES FR-069] Switch "Contrato perpétuo" com previsão opcional em `frontend/lib/screens/projects_screen.dart` [VERIFY: grep perpetual frontend/lib/screens/projects_screen.dart]
- [X] T015 [US1] {FR-071} Marcador "Perpétuo" sem "Incompleto" em `frontend/lib/screens/dashboard_screen.dart` [VERIFY: cd frontend && flutter test test/dashboard_redesign_test.dart]

## Phase 3: Delivery [US2] - Conclusão do trabalho (Priority: P1) 🎯 MVP

- [X] T016 [US2] {FR-074,FR-075} Create acceptance test stub in `frontend/test/dashboard_redesign_test.dart` ← plan:AcceptanceTestStubs
- [X] T017 [US2] {FR-074} Getters `tasksTotal`/`tasksDone` em `frontend/lib/models/contract.dart` after:T013 → exports: Contract.tasksTotal, Contract.tasksDone [VERIFY: grep tasksTotal frontend/lib/models/contract.dart]
- [X] T018 [US2] {FR-074,FR-075} [COMPLETES FR-074] Marcador "Concluído" sem mexer em `_StatusChip` em `frontend/lib/screens/dashboard_screen.dart` ← T017:tasksTotal [VERIFY: cd frontend && flutter test test/dashboard_redesign_test.dart]

## Phase 4: Delivery [US3] - Tarefas atrasadas (Priority: P2)

- [X] T019 [US3] {FR-076} `COUNT` UTC de `tasks_total`/`tasks_done`/`tasks_overdue` por `contract_id` em `backend/src/routes/dashboard.js` after:T011 → exports: getDomainMetrics(db,user) [VERIFY: cd backend && node --test src/routes/dashboard.test.js]
- [X] T020 [US3] {FR-076} Campos `tasks_total`/`tasks_done`/`tasks_overdue` em `frontend/lib/models/contract.dart` after:T017 [VERIFY: grep tasksOverdue frontend/lib/models/contract.dart]
- [X] T021 [US3] {FR-077} Marcador "N tarefa(s) atrasada(s)" com ícone e texto em `frontend/lib/screens/dashboard_screen.dart` after:T018 [VERIFY: cd frontend && flutter test test/dashboard_redesign_test.dart]
- [X] T022 [US3] {FR-078} Bloco `tasksOverdue` em `_KpiBand`, oculto quando 0, em `frontend/lib/screens/dashboard_screen.dart` after:T021 [VERIFY: cd frontend && flutter test test/dashboard_redesign_test.dart]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T023 {FR-079} Texto além de cor com contraste nos dois temas nos marcadores em `frontend/lib/screens/dashboard_screen.dart` e teste em `frontend/test/a11y_labels_test.dart` after:T022 [VERIFY: cd frontend && flutter test test/a11y_labels_test.dart]
- [X] T024 Regressão E017: suítes backend/E2E/frontend verdes after:T023 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test]

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

- `after:T###` exige `[X]` prévio; `← T###:Symbol` consome `→ exports:` da tarefa referenciada.
- Lotes `[P]` são paralelos; nenhum lote mistura tarefa e dependência `after:`/`←`.
- Stubs RED precedem a implementação do mesmo `{FR-###}`; `[VERIFY: ...]` roda antes de `[X]`.
