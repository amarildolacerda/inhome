# Tasks: Contrato e vigência (E002)

**Input**: `specs/00004-e002-contrato-vigencia/` · **Prerequisites**: `plan.md`, `spec.md`
**Tests**: Plan Acceptance Test Stubs → mandatory RED stub tasks; no separate TDD phase.
**Organization**: One phase per `US#`; stub antes da impl; regressão e correção do que a bateria apontar.

## Project Mode

Brownfield — só backend (`routes/contracts.js`, `models/Contract.js`); sem migração de esquema.

## Phase 1: Delivery [US1] Contrato do início ao fim (P1) 🎯 MVP

- [X] T001 [US1] {FR-001,FR-002,FR-003,FR-004} Create acceptance test stub in backend/src/routes/contracts.test.js ← plan:AcceptanceTestStubs
- [X] T002 [US1] {FR-001} createContract()/parseBodyDates() validação em backend/src/routes/contracts.js → exports: createContract(req,res) [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T003 [US1] {FR-002} linkPrestador()/unlinkPrestador() em backend/src/routes/contracts.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T004 [US1] {FR-003} extendContract() recusa contrato encerrado com 400 em backend/src/routes/contracts.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T005 [US1] {FR-004} closeContract() idempotente e deleteContract() só admin em backend/src/routes/contracts.js [VERIFY: node --test backend/src/routes/contracts.test.js]

## Phase 2: Delivery [US2] Atraso sinalizado sem travar (P1) 🎯 MVP

- [X] T006 [US2] {FR-005,FR-006,FR-007,FR-008} Create acceptance test stub in backend/src/models/Contract.test.js ← plan:AcceptanceTestStubs
- [X] T007 [US2] {FR-009} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs
- [X] T008 [US2] {FR-005} effectiveStatus()/isOverdue() em backend/src/models/Contract.js → exports: effectiveStatus(row,now) [VERIFY: node --test backend/src/models/Contract.test.js]
- [X] T009 [US2] {FR-006} Asserção de gravação apenas vigente/encerrado em backend/src/models/Contract.test.js [VERIFY: node --test backend/src/models/Contract.test.js]
- [X] T010 [US2] {FR-007} Cenário de cadastro com previsão vencida em backend/src/routes/contracts.test.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T011 [US2] {FR-008} Prorrogação devolve vigente sem escrita manual em backend/src/routes/contracts.test.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T012 [US2] {FR-009} Tarefas criadas e movidas sobre contrato atrasado em backend/src/routes/tasks.test.js [VERIFY: node --test backend/src/routes/tasks.test.js]

## Phase 3: Delivery [US3] Contrato só do meu domínio (P1) 🎯 MVP

- [X] T013 [US3] {FR-010,FR-011,FR-012} Create acceptance test stub in backend/src/routes/contracts.test.js ← plan:AcceptanceTestStubs
- [X] T014 [US3] {FR-011} router.use(scopeDomain()) ligado ao roteador de contrato em backend/src/routes/contracts.js [VERIFY: grep scopeDomain backend/src/routes/contracts.js]
- [X] T015 [US3] {FR-010} Regressão de 401/403 antes de qualquer linha lida em backend/src/routes/contracts.test.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T016 [US3] {FR-012} Consulta restrita ao domínio e ao vínculo do prestador em backend/src/routes/contracts.test.js [VERIFY: node --test backend/src/routes/contracts.test.js]

## Phase 4: Delivery [US4] Listagem com volume, filtro e previsão (P1) 🎯 MVP

- [X] T017 [US4] {FR-013,FR-014,FR-015} Create acceptance test stub in backend/src/routes/contracts.test.js ← plan:AcceptanceTestStubs
- [X] T018 [US4] {FR-013} Filtro de status particionado em SQL em listContracts() em backend/src/routes/contracts.js → exports: listContracts(req,res) [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T019 [US4] {FR-014} Asserção de 100% dos vigentes com previsão em backend/src/routes/contracts.test.js [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T020 [US4] {FR-015} Seed de 5.000 contratos e p95 abaixo de 2 s em backend/src/routes/contracts.test.js after:T018 [VERIFY: node --test backend/src/routes/contracts.test.js]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T021 {FR-013} [COMPLETES FR-013] backend/test.sh: smoke do filtro `atrasado` e da partição de status [VERIFY: grep "atrasado" backend/test.sh]
- [X] T022 Suíte unitária verde antes de fechar a épica; corrigir só o que a regressão apontar [VERIFY: npm --prefix backend test]

## Dependencies

Phase 1–4 por user story (independentes); Polish por último; stub antes da impl; T020 after:T018; `[VERIFY: cmd]` roda da raiz antes de `[X]`.
