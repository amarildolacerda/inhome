# Tasks: Gestão documental do contrato (00021)

**Input**: `specs/00021-gestao-documental-contrato/` · **Epic**: E019

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 0 tabela nova, 0 dependência nova.

## Epic / Capability Map

- `[US1]` biblioteca e filtros (FR-064..067)
- `[US2]` categoria e conferência (FR-068..070)

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 [P] {FR-064,FR-065,FR-066,FR-067,FR-068,FR-069,FR-070} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T002 [P] {FR-069} Add reviewed_by/reviewed_at to attachments DDL and guarded rebuild in backend/src/config/database.js → exports: ATTACHMENTS_DDL [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T003 [P] {FR-064} Add document query helpers in backend/src/routes/documents.js → exports: listDocuments [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T004 [P] {FR-065} Add analysis and alert attach in backend/src/routes/documents.js → exports: attachAnalysis [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T005 [P] {FR-066} Add category and source filters in backend/src/routes/documents.js → exports: parseDocumentFilters [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T006 [P] {FR-067,FR-070} Add guards and domain assertion in backend/src/routes/documents.js → exports: assertDocumentDomain [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T007 [P] {FR-068} Add category update in backend/src/routes/documents.js → exports: updateCategory [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T008 [P] {FR-069} Add idempotent review in backend/src/routes/documents.js → exports: reviewDocument [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T009 {FR-064} Register documents router under /api/v2/contracts in backend/src/server.js after:T003 [VERIFY: cd backend && node --test src/routes/documents.test.js]

## Phase 2: Delivery [US1] - Biblioteca documental (Priority: P2)

- [X] T010 [US1] {FR-064} Add list documents test after:T003 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T011 [US1] {FR-065} Add analysis and alert display test after:T004 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T012 [US1] {FR-066} Add filter scoping test after:T005 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T013 [US1] {FR-067} Add role denial test after:T006 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T014 [US1] {FR-064,FR-065,FR-066,FR-067} Extract documents UI in frontend/lib/screens/contract_detail_documents.dart → exports: _DocumentsSection after:T009 [VERIFY: cd frontend && flutter test test/documents_section_test.dart]
- [X] T015 [US1] {FR-064,FR-066} Add library widget test after:T014 [VERIFY: cd frontend && flutter test test/documents_section_test.dart]
- [X] T016 [US1] {FR-064,FR-067} Wire library into contract detail screen in frontend/lib/screens/contract_detail_screen.dart after:T014 [VERIFY: cd frontend && flutter analyze lib test]
- [X] T017 [US1] {FR-064,FR-065,FR-066,FR-067} [COMPLETES FR-064] Add end-to-end library flow to backend/test.sh after:T015 [VERIFY: bash backend/test.sh]

## Phase 3: Delivery [US2] - Categoria e conferência (Priority: P2)

- [X] T018 [US2] {FR-068} Add category update test after:T007 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T019 [US2] {FR-069} Add review idempotence test after:T008 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T020 [US2] {FR-070} Add cross-domain mutation test after:T006 [VERIFY: cd backend && node --test src/routes/documents.test.js]
- [X] T021 [US2] {FR-068} Add category dialog in frontend/lib/screens/contract_detail_documents.dart after:T014 [VERIFY: cd frontend && flutter analyze lib test]
- [X] T022 [US2] {FR-069} Add review action in frontend/lib/screens/contract_detail_documents.dart after:T014 [VERIFY: cd frontend && flutter test test/documents_section_test.dart]
- [X] T023 [US2] {FR-068,FR-069,FR-070} [COMPLETES FR-068] Add end-to-end category and review flow to backend/test.sh after:T018 [VERIFY: bash backend/test.sh]

## Phase 4: Polish

- [X] T024 {FR-064,FR-067} Add API documentation to TECHNICAL.md after:T017 [VERIFY: grep -q '/documents' TECHNICAL.md]
- [X] T025 {FR-064,FR-065,FR-066,FR-067,FR-068,FR-069,FR-070} [COMPLETES FR-070] Run full battery and record evidence after:T023 [VERIFY: cd backend && npm test]
