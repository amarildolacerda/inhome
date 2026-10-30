# Tasks: Tema escuro por padrão e alternância persistida (00018)

**Input**: `spec.md`/`plan.md` em `specs/00018-tema-escuro-por-padrao-alternancia/` | **Mode**: Brownfield (Flutter Web, 0 dependência nova)

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 {FR-065} Store local load/decode com chave theme_mode e fallback dark em frontend/lib/services/theme_preference_store.dart → exports: ThemePreferenceStore, ThemePreferenceStore.decode [VERIFY: grep "class ThemePreferenceStore" frontend/lib/services/theme_preference_store.dart]
- [X] T002 {FR-067} Implementar save silencioso da escolha em ThemePreferenceStore em frontend/lib/services/theme_preference_store.dart → exports: ThemePreferenceStore.save [VERIFY: grep "save(" frontend/lib/services/theme_preference_store.dart]

## Phase 2: Delivery [US1] - Default escuro antes da primeira renderização (P1) 🎯 MVP

- [X] T003 [US1] {FR-064} Create acceptance test stub in frontend/test/theme_preference_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-064 primeira execução abre escuro" frontend/test/theme_preference_test.dart]
- [X] T004 [US1] {FR-065} Create acceptance test stub in frontend/test/theme_preference_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-065 ausente ou inválida cai no escuro" frontend/test/theme_preference_test.dart]
- [X] T005 [US1] {FR-064,FR-065} main() assíncrono lê preferência antes do runApp e passa initialThemeMode em frontend/lib/main.dart after:T001 ← T001:ThemePreferenceStore [VERIFY: grep "initialThemeMode" frontend/lib/main.dart]
- [X] T006 [US1] {FR-064} [COMPLETES FR-064] ProjectManagerApp stateful com initialThemeMode padrão dark e themeMode do estado em frontend/lib/main.dart after:T005 [VERIFY: grep "initialThemeMode = ThemeMode.dark" frontend/lib/main.dart]
- [X] T007 [US1] {FR-065} [COMPLETES FR-065] Guard fallback: try/catch no load e decode inválido para ThemeMode.dark em frontend/lib/main.dart after:T006 [VERIFY: grep "ThemeMode.dark" frontend/lib/main.dart]

## Phase 3: Delivery [US2] - Alternância persistida na toolbar (P1) 🎯 MVP

- [X] T008 [P] [US2] {FR-066} Create acceptance test stub in frontend/test/shell_toolbar_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-066 toggle alterna o tema na toolbar" frontend/test/shell_toolbar_test.dart]
- [X] T009 [US2] {FR-066} Adicionar callback onToggleTheme e IconButton com Tooltip/Semantics em _SessionToolbar em frontend/lib/main.dart after:T006 [VERIFY: grep "onToggleTheme" frontend/lib/main.dart]
- [X] T010 [US2] {FR-066} [COMPLETES FR-066] Ligar _toggleTheme ao MainShell e rebuild imediato em frontend/lib/main.dart after:T009 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/shell_toolbar_test.dart"]
- [X] T011 [P] [US2] {FR-067} Create acceptance test stub in frontend/test/theme_preference_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-067 escolha persiste e restaura" frontend/test/theme_preference_test.dart]
- [X] T012 [US2] {FR-067} [COMPLETES FR-067] Persistir escolha via save no toggle com falha silenciosa em frontend/lib/main.dart after:T010,T002 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/theme_preference_test.dart"]
- [X] T013 [P] [US2] {FR-068} Create acceptance test stub in frontend/test/a11y_labels_test.dart ← plan:AcceptanceTestStubs [VERIFY: grep "FR-068 contraste AA nos dois modos" frontend/test/a11y_labels_test.dart]
- [X] T014 [US2] {FR-068} Ajustar contraste AA nos dois modos reusando AppTheme.light/dark em frontend/lib/theme/app_theme.dart [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/a11y_labels_test.dart"]
- [X] T015 [US2] {FR-068} [COMPLETES FR-068] Validar dashboard E013 e rótulos no claro; estender statusColor só se falhar em frontend/lib/theme/app_theme.dart after:T014 [VERIFY: grep "statusColor" frontend/lib/theme/app_theme.dart]

## Phase 4: Polish

- [X] T016 Atualizar web_browsers_test para esperar ThemeMode.dark em frontend/test/web_browsers_test.dart after:T006 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter test test/web_browsers_test.dart"]
- [X] T017 Bateria zero-regressão: flutter analyze + suíte completa after:T007,T012,T015,T016 [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"]
- [X] T018 Marcar E014 concluído em TECHNICAL.md after:T017 [VERIFY: grep "E014" TECHNICAL.md]
- [X] T019 Atualizar README.md com o tema escuro padrão e a alternância persistida, conforme a governança after:T018 [VERIFY: grep -i "tema escuro" README.md]

## Dependencies

Foundational (store) → US1 (default escuro) → US2 (toggle e persistência) → Polish.

- T001/T002: store local; T002 completa o mesmo arquivo depois de T001.
- T005→T007: boot assíncrono e fallback em main.dart; T007 depende de T006.
- T009 depende de T006; T010 de T009; T012 de T010 e T002.
- T008/T011/T013: stubs RED paralelos, cada um antes da implementação do seu requisito.
- T017 fecha analyze + suíte completa; T018 publica em TECHNICAL.md; T019 atualiza o README após a conclusão.
