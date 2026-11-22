# Tasks: Previsibilidade financeira por contrato (00020)

**Input**: `specs/00020-previsibilidade-financeira/` · **Epic**: E018

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 0 dependência nova.

## Epic / Capability Map

- `[US1]` parcelas, pagamentos e guards (FR-064..066, FR-070)
- `[US2]` indicadores e alerta de atraso (FR-067, FR-068)
- `[US3]` exportação CSV/PDF (FR-069)

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 [P] {FR-064} Add finance tables and payment attachment rebuild in backend/src/config/database.js → exports: CONTRACT_INSTALLMENTS_DDL [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T002 [P] {FR-064,FR-065,FR-066,FR-070} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T003 {FR-066} Add finance guards and atomic validation in backend/src/routes/finance.js → exports: assertFinanceAccess, assertInstallmentScope, validatePayment [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T004 [P] {FR-064} Add installment CRUD and 500 limit in backend/src/routes/finance.js → exports: listInstallments, createInstallment, deleteInstallment [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T005 [P] {FR-065} Add payment with optional receipt in backend/src/routes/finance.js → exports: postPayment [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T006 [P] {FR-067} Add finance aggregation service in backend/src/services/finance.js → exports: getContractFinance, getDomainFinance [VERIFY: cd backend && node --test src/services/finance.test.js]
- [X] T007 [P] {FR-068} Add overdue installment sweep in backend/src/services/financeAlerts.js → exports: runInstallmentSweep [VERIFY: cd backend && node --test src/services/financeAlerts.test.js]
- [X] T008 [P] {FR-069} Add finance CSV and PDF helpers in backend/src/services/financeReport.js → exports: generateFinancePdf, exportFinanceCsv [VERIFY: cd backend && node --test src/services/financeReport.test.js]
- [X] T009 [P] {FR-067} Add finance key to dashboard metrics in backend/src/routes/dashboard.js → exports: getDomainMetrics [VERIFY: cd backend && node --test src/routes/dashboard.test.js]

## Phase 2: Delivery [US1] - Parcelas e pagamentos (Priority: P1) 🎯 MVP

- [X] T010 [P] [US1] {FR-064,FR-065,FR-066,FR-070} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T011 [US1] {FR-064} Add installment CRUD tests after:T004 [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T012 [US1] {FR-065} Add payment and receipt tests after:T003,T005 [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T013 [US1] {FR-066} [COMPLETES FR-066] Add overpay and invalid upload tests after:T003 [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T014 [US1] {FR-070} Add role and domain negative tests after:T003 [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T015 [US1] {FR-064} [COMPLETES FR-064] Build finance section UI after:T011 [VERIFY: cd frontend && flutter analyze lib/screens/contract_detail_screen_finance.dart]
- [X] T016 [US1] {FR-065} [COMPLETES FR-065] Wire payment form and receipt picker after:T012,T015 [VERIFY: cd frontend && flutter analyze lib/screens/contract_detail_screen_finance.dart]

## Phase 3: Delivery [US2] - Indicadores e alertas (Priority: P1)

- [X] T017 [P] [US2] {FR-067,FR-068} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T018 [US2] {FR-068} [COMPLETES FR-068] Integrate overdue sweep into backend/src/services/alerts.js after:T007 → exports: runExpirySweep [VERIFY: cd backend && node --test src/routes/alerts.test.js]
- [X] T019 [US2] {FR-068} [COMPLETES FR-068] Expose extracted alerts on E005 panel in backend/src/routes/alerts.js after:T018 → exports: listPanel [VERIFY: cd backend && node --test src/routes/alerts.test.js]
- [X] T020 [US2] {FR-067} [COMPLETES FR-067] Add finance summary to backend/src/routes/dashboard.js after:T006,T009 → exports: getDomainMetrics [VERIFY: cd backend && node --test src/routes/dashboard.test.js]
- [X] T021 [US2] {FR-067} [COMPLETES FR-067] Build dashboard finance card after:T020 [VERIFY: cd frontend && flutter analyze lib/screens/dashboard_screen_finance.dart]
- [X] T022 [US2] {FR-070} [COMPLETES FR-070] Hide finance card for prestador after:T020,T021 [VERIFY: cd frontend && flutter test]

## Phase 4: Delivery [US3] - Exportação (Priority: P1)

- [X] T023 [P] [US3] {FR-069} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T024 [US3] [COMPLETES FR-069] Wire export routes in backend/src/routes/finance.js after:T008 → exports: exportFinance [VERIFY: cd backend && node --test src/routes/finance.test.js]
- [X] T025 [US3] [COMPLETES FR-069] Add export buttons to finance section after:T024,T016 [VERIFY: cd frontend && flutter analyze lib/screens/contract_detail_screen_finance.dart]
- [X] T026 [US3] [COMPLETES FR-069] Add CSV/PDF parity test after:T024 [VERIFY: cd backend && node --test src/services/financeReport.test.js]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T027 [P] Run backend unit suite [VERIFY: cd backend && npm test]
- [X] T028 [P] Run integration smoke [VERIFY: bash backend/test.sh]
- [X] T029 [P] Run Flutter tests and analyzer [VERIFY: cd frontend && flutter test] [VERIFY: cd frontend && flutter analyze]
- [X] T030 [P] Run dependency security scan [VERIFY: cd backend && npm audit --audit-level=high]
- [X] T031 Final regression and QC evidence after:T027,T028,T029,T030 [VERIFY: node scripts/derive-completion-state.mjs specs/00020-previsibilidade-financeira]

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

- `after:T###` exige conclusão prévia; `← T###:Symbol` consome `→ exports:`.
- Stubs RED precedem a implementação; verificações rodam antes da conclusão.
- Migração preguiçosa; guards antes de leitura; alerta com UPSERT; pagamento imutável.
