# Tasks: Redesign visual do dashboard (00015)

**Input**: `spec.md`/`plan.md` em `specs/00015-redesign-dashboard/` | **Mode**: Brownfield (Express/sql.js + Flutter Web)

## Brownfield Notes

- AD-001 payload aditivo (`contracts[]`, `responsavel`) — `recentProjects` e consumidores E006 intactos (HINT-003)
- AD-002 janelas via `readWindows`/`daysUntil` de `services/alerts.js`; platform db, não domain db (HINT-002)
- AD-005 prestador: `contracts` do join `contract_providers`, sem KPIs de domínio (HINT-004)
- Regression: unit `npm --prefix backend test`, smoke `backend/test.sh` (3199), flutter analyze + test, `npm audit`

## Phase 1: Setup (Acceptance Test Stubs RED)

- [X] T001 {FR-038,FR-040} Create acceptance test stub in frontend/test/dashboard_redesign_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep FR-038 frontend/test/dashboard_redesign_test.dart]
- [X] T002 {FR-039,FR-041} Create acceptance test stub in backend/src/routes/dashboard.test.js ← plan:AcceptanceTestStubs [VERIFY: grep FR-039 backend/src/routes/dashboard.test.js]

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [X] T003 [P] {FR-039,FR-040,FR-041} Payload aditivo em backend/src/routes/dashboard.js: contracts[] com responsavel e stats.contractsAVencer (AD-001/002/005) → exports: getDomainMetrics [VERIFY: node --test backend/src/routes/dashboard.test.js]
- [X] T004 [P] {FR-038,FR-040} Helper AppTheme.statusColor em frontend/lib/theme/app_theme.dart → exports: AppTheme.statusColor [VERIFY: grep statusColor frontend/lib/theme/app_theme.dart]

## Phase 3: Delivery [US1] - KPIs coloridos por status (P1) MVP

- [X] T005 [US1] {FR-038} [COMPLETES FR-038] Faixa _KpiRow no topo de frontend/lib/screens/dashboard_screen.dart com contagens por status via tokens ← T004:statusColor ← T003:getDomainMetrics [VERIFY: grep _KpiRow frontend/lib/screens/dashboard_screen.dart]
- [X] T006 [US1] {FR-039} [COMPLETES FR-039] KPIs ativos e a vencer (activeProjects/contractsAVencer) na faixa em frontend/lib/screens/dashboard_screen.dart ← T003:getDomainMetrics [VERIFY: grep contractsAVencer frontend/lib/screens/dashboard_screen.dart]

## Phase 4: Delivery [US2] - Cards com vencimento e responsável (P1) MVP

- [X] T007 [US2] {FR-040} [COMPLETES FR-040] Grade _ContractCards em frontend/lib/screens/dashboard_screen.dart: urgência, chip de status, vencimento e responsável ← T003:getDomainMetrics ← T004:statusColor [VERIFY: grep _ContractCards frontend/lib/screens/dashboard_screen.dart]
- [X] T008 [US2] {FR-041} [COMPLETES FR-041] Escopo por papel na tela: scope own oculta KPIs de domínio e mostra só vinculados, em frontend/lib/screens/dashboard_screen.dart ← T003:getDomainMetrics [VERIFY: grep scope frontend/lib/screens/dashboard_screen.dart]

## Phase 5: Delivery [US3] - Colunas e filtros no corpo (P2)

- [X] T009 [US3] {FR-042} Colunas responsivas com LayoutBuilder e reflow em frontend/lib/screens/dashboard_screen.dart [VERIFY: grep LayoutBuilder frontend/lib/screens/dashboard_screen.dart]
- [X] T010 [US3] {FR-043} [COMPLETES FR-042] Filtros status/responsável e busca no corpo (_DashboardFilters, _applyFilters), sem AppBar e persistentes em frontend/lib/screens/dashboard_screen.dart after:T009 [VERIFY: grep _DashboardFilters frontend/lib/screens/dashboard_screen.dart]

## Phase 6: Polish

- [X] T011 [P] Ajustar testes a11y/teclado (a11y_labels, web_browsers, dashboard_projects_nav) em frontend/test aos widgets novos after:T010 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter analyze && flutter test"]
- [X] T012 [P] Estender backend/test.sh com smoke de contracts, responsavel e contractsAVencer after:T003 [VERIFY: bash backend/test.sh]
- [X] T013 Bateria zero-regressão: unit (parar compose backend), smoke 3199, flutter analyze+test, audit 0 after:T011,T012 [VERIFY: npm --prefix backend audit --audit-level=high]
- [X] T014 Atualizar README.md (docs pós-implementação) e marcar versão em TECHNICAL.md após testes OK after:T013 [VERIFY: grep 00015 README.md && grep 00015 TECHNICAL.md]

## Dependencies

Fluxo: Setup (stubs RED) -> Foundational (payload + token helper) -> Delivery US1 -> US2 -> US3 -> Polish; stub sempre antes da implementação do mesmo requisito.

- T003 é bloqueador transversal: alimenta KPIs (T005/T006), cards (T007) e escopo por papel (T008).
- T004 alimenta o mapeamento de cor de KPIs (T005) e chips dos cards (T007).
- T007/T008 escrevem na mesma tela após T005/T006; T010 depende da coluna T009.
- T011 e T012 são paralelos; T013 fecha a bateria depois dos dois.
- `getDomainMetrics`, `readWindows`, `daysUntil`, guards E001 e semântica `effectiveStatus` são consumo de 00006/00011.

## Phase: Bug Fixes

- [X] T015 [BUG:ERROR] {FR-040} [requirement-gap] Cards omit vencimento/responsavel/incompleto — frontend/lib/screens/dashboard_screen.dart:665
  > FR-040/SC-003 require forecast_date, responsavel and incomplete marker
- [X] T016 [BUG:ERROR] {FR-042} [runtime-error] Narrow viewport crashes on Expanded — frontend/lib/screens/dashboard_screen.dart:481
  > RenderFlex children have non-zero flex but incoming height constraints are unbounded
- [X] T017 [BUG:ERROR] {FR-043} [requirement-gap] KPIs ignore filters — frontend/lib/screens/dashboard_screen.dart:177
  > _KpiRow receives raw stats while cards use filteredContracts
- [X] T018 [BUG:ERROR] {FR-042} [test-failure] Flutter suite red: 2 keyboard tests — frontend/test/dashboard_projects_nav_test.dart:313
  > Expected pixels > 0, actual 0.0 (also line 381); fixture fits viewport
- [X] T019 [BUG:ERROR] {FR-038} [security-vuln] npm audit high: body-parser DoS — backend/package-lock.json
  > body-parser <1.20.9 GHSA-27r3-jxmh-p828; npm audit --audit-level=high must pass
- [X] T020 [BUG:WARNING] {FR-038} [requirement-gap] P1 acceptance tests stale — frontend/test/dashboard_redesign_test.dart:17
  > FR-038/040 skip; FR-039/041 todo; T012 smoke asserts no new fields; README T014 placeholders