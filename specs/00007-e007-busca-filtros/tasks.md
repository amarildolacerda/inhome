# Tasks: Busca e filtros (E007 / 00007)

**Input**: `spec.md`, `plan.md` em `specs/00007-e007-busca-filtros/`
**Mode**: Brownfield — backend Express; sem Setup nem Foundational.

## Epic / Capability Map

- [US1] Achar em segundos — FR-001, FR-002, FR-003
- [US2] Busca respeita o escopo do papel — FR-004, FR-005

## Brownfield Notes

- Touched: `backend/src/routes/search.test.js`, `backend/src/routes/search.js`, `backend/src/config/database.js`
- Sem migração (HINT-004): `contracts`, `tasks`, `contract_providers` inalterados; índices aditivos condicionais via `ensureIndexes()`
- Regression: `FR-016 filters` (search.test.js), listagens de contrato/tarefa de E002/E003; unit 107+, smoke 118+, flutter 16+, `npm audit`

## Phase 1: Delivery [US1] Achar em segundos (P1) 🎯 MVP

- [X] T001 [US1] {FR-001,FR-002,FR-003,FR-004} Create acceptance test stub in backend/src/routes/search.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-001 seis filtros" backend/src/routes/search.test.js]
- [X] T002 [US1] {FR-001} Contract_id filter test in backend/src/routes/search.test.js (missing from FR-016); confirm six filters isolated + combined after:T001 [VERIFY: node --test backend/src/routes/search.test.js]
- [X] T003 [US1] {FR-002} Empty-result pagination consistency + page-beyond-total tests in backend/src/routes/search.test.js after:T002 [VERIFY: node --test backend/src/routes/search.test.js]
- [X] T004 [US1] {FR-003} p95 latency test with fixtures + ensureIndexes coverage assertion in backend/src/routes/search.test.js after:T003 [VERIFY: node --test backend/src/routes/search.test.js]

## Phase 2: Delivery [US2] Escopo do papel (P1) 🎯 MVP

- [X] T005 [US2] {FR-004} Domain + role scope tests in backend/src/routes/search.test.js (prestador own-only, domainId param ignored, cross-domain isolation) after:T004 [VERIFY: node --test backend/src/routes/search.test.js]
- [X] T006 [US2] {FR-003,FR-005} Conditional index in backend/src/config/database.js ensureIndexes() (tasks.priority, tasks.due_date) if p95 gap found; never cache after:T004 [VERIFY: grep "idx_tasks_priority\|idx_tasks_due" backend/src/config/database.js]
- [X] T007 [US2] {FR-005} Regression: full battery green after any index/query change after:T005,T006 [VERIFY: bash backend/test.sh]

## Phase 3: Polish (P1)

- [X] T008 [P] Rebuild backend (`docker compose build backend && docker compose up -d backend`) e bateria completa: unit, smoke, flutter, lint (`node --check backend/src/**/*.js`), audit after:T007 [VERIFY: npm --prefix backend audit --audit-level=high]
- [X] T009 [P] Criar specs/00007-e007-busca-filtros/manual-test.md com cenários de teclado/p95 no navegador e comparação por papel after:T007 [VERIFY: grep "PENDING" specs/00007-e007-busca-filtros/manual-test.md]

## Dependencies

Sem Setup/Foundational; fases de entrega em ordem US1 → US2 → Polish. Stub sempre antes da impl do mesmo requisito na mesma fase. `after:` explícito: T002←T001, T003←T002, T004←T003, T005←T004, T006←T004, T007←T005,T006, T008←T007, T009←T007. `[P]` sem `after:`/`←` na mesma leva.
