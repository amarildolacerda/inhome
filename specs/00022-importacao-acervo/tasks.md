# Tasks: Importação de acervo (00022)

**Input**: `specs/00022-importacao-acervo/` · **Epic**: E020

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 0 tabela nova, 0 dependência nova.

## Epic / Capability Map

- `[US1]` template, mapeamento e prévia (FR-071..075)
- `[US2]` confirmação, PDFs e relatório (FR-076..079)

## Phase 1: Setup (Repository / Workspace Delta)

- [X] T001 [P] {FR-071} Create template acceptance stub ← plan:AcceptanceTestStubs
- [X] T002 [P] {FR-072} Create parser acceptance stubs ← plan:AcceptanceTestStubs
- [X] T003 [P] {FR-073,FR-074,FR-075,FR-076,FR-077,FR-078,FR-079} Create preview and confirm acceptance stubs ← plan:AcceptanceTestStubs
- [X] T004 {FR-071} Add versioned CSV template in backend/assets/contract-import-template.csv
- [X] T005 {FR-071} Register imports router under /api/v2/contracts in backend/src/server.js after:T004 [VERIFY: cd backend && node --test src/routes/imports.test.js]

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T006 [P] {FR-072} Implement parseCsv in backend/src/utils/spreadsheet.js → exports: parseCsv() [VERIFY: cd backend && node --test src/utils/spreadsheet.test.js]
- [X] T007 [P] {FR-072} Implement parseXlsx via zlib in backend/src/utils/spreadsheet.js → exports: parseXlsx() [VERIFY: cd backend && node --test src/utils/spreadsheet.test.js]
- [X] T008 {FR-072} Implement parseSpreadsheet and MAX_IMPORT_ROWS in backend/src/utils/spreadsheet.js ← T006:parseCsv ← T007:parseXlsx → exports: parseSpreadsheet(), MAX_IMPORT_ROWS
- [X] T009 {FR-077} Add contract_id to attachments DDL and guarded rebuild in backend/src/config/database.js → exports: ATTACHMENTS_DDL [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T010 [P] {FR-079} Define IMPORT_ROLES and guards in backend/src/routes/imports.js → exports: IMPORT_ROLES

## Phase 3: Delivery [US1] - Preparar e revisar a importação (Priority: P1)

- [X] T011 [US1] {FR-071} Add template endpoint test after:T001 [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T012 [US1] {FR-072} Add CSV delimiter and quote test after:T002 [VERIFY: cd backend && node --test src/utils/spreadsheet.test.js]
- [X] T013 [US1] {FR-072} Add XLSX shared string test after:T002 [VERIFY: cd backend && node --test src/utils/spreadsheet.test.js]
- [X] T014 [US1] {FR-073} Implement mapColumns in backend/src/routes/imports.js ← T008:parseSpreadsheet → exports: mapColumns() [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T015 [US1] {FR-074} Implement buildPreview in backend/src/routes/imports.js ← T014:mapColumns → exports: buildPreview() [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T016 [US1] {FR-075} Implement validateImportRow and validDate in backend/src/routes/imports.js → exports: validateImportRow(), validDate() [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T017 [US1] {FR-071} Add template download method in frontend/lib/services/imports_api.dart → exports: downloadImportTemplate() [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T018 [US1] {FR-074} Add preview method in frontend/lib/services/imports_api.dart → exports: previewImport() [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T019 [US1] {FR-073} Add mapping step in frontend/lib/screens/imports_screen.dart → exports: _buildMappingStep() [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T020 [US1] {FR-074,FR-075} Add preview screen test after:T019 [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T021 [US1] {FR-071,FR-072,FR-073,FR-074,FR-075} [COMPLETES FR-071] Add end-to-end template and preview flow to backend/test.sh after:T011 [VERIFY: bash backend/test.sh]

## Phase 4: Delivery [US2] - Confirmar e anexar PDFs (Priority: P1)

- [X] T022 [US2] {FR-076} Add atomic transaction test after:T003 [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T023 [US2] {FR-077} Add PDF attachment test after:T009 [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T024 [US2] {FR-078} Add skipped PDF report test after:T003 [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T025 [US2] {FR-076} Implement confirmImport in backend/src/routes/imports.js ← T015:buildPreview → exports: confirmImport() [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T026 [US2] {FR-077} Implement attachImportedPdfs in backend/src/routes/imports.js ← T009:ATTACHMENTS_DDL → exports: attachImportedPdfs() [VERIFY: cd backend && node --test src/routes/imports.test.js]
- [X] T027 [US2] {FR-076} Add confirm method in frontend/lib/services/imports_api.dart ← T018:previewImport → exports: confirmImport() [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T028 [US2] {FR-078} Add report step in frontend/lib/screens/imports_screen.dart → exports: buildReportStep() [VERIFY: cd frontend && flutter test test/imports_screen_test.dart]
- [X] T029 [US2] {FR-079} Add rail entry for admin and gestor in frontend/lib/main.dart ← T010:IMPORT_ROLES → exports: _entriesForRole() [VERIFY: cd frontend && flutter analyze lib test]
- [X] T030 [US2] {FR-076,FR-077,FR-078,FR-079} [COMPLETES FR-076] Add end-to-end confirm and PDF flow to backend/test.sh after:T025 [VERIFY: bash backend/test.sh]

## Phase 5: Polish

- [X] T031 [P] {FR-079} Add API documentation to TECHNICAL.md after:T030 [VERIFY: grep -q '/contracts/import' TECHNICAL.md]
- [X] T032 {FR-071,FR-072,FR-073,FR-074,FR-075,FR-076,FR-077,FR-078,FR-079} [COMPLETES FR-079] Run full battery and record evidence after:T030 [VERIFY: cd backend && npm test]

## Dependencies

Setup → Foundational → Delivery [US1] → Delivery [US2] → Polish. Tasks with `←` consume symbols from the referenced task; the Developer verifies the prerequisite is `[X]`.
