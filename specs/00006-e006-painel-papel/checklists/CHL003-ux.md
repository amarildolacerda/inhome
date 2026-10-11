# UX Checklist: Painel por papel (00006)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O perímetro de acessibilidade (rótulos, contraste, teclado) está declarado sem meta AA? [Completeness, Spec §Scope Excluded] <!-- Evaluator: Covered by spec.md §Excluded ("Acessibilidade formal nível AA — meta explícita fora desta release") + FR-005 -->
- [X] CHK002 A necessidade de foco visível em toda ação está declarada como requisito? [Completeness, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 ("visible keyboard focus on the main screens") + US2 cenário 1 -->
- [X] CHK003 O bootstrap web (tema sem conteúdo sem estilo) está declarado como requisito? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("theme renders from the first paint without unstyled content") + US2 cenário 2 -->
- [X] CHK004 A regressão fim a fim após alteração em `main.dart` está declarada como requisito? [Completeness, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("end-to-end regression suite green after shared-surface changes") -->
- [X] CHK005 O estado de erro do painel (falha de rede) está declarado? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy ("mensagem de erro + retry manual") + frontend/lib/screens/dashboard_screen.dart:27-33 (catch → _loading=false) -->

## Clarity

- [X] CHK006 As telas principais de US2 estão nomeadas sem ambiguidade? [Clarity, Spec §Clarifications Q3] <!-- Evaluator: Covered by spec.md §Clarifications Q3 ("Dashboard + tarefas + projetos (destinos do NavigationRail)") + plan.md AD-004 -->
- [X] CHK007 A distinção entre verificação (T031 fechada) e extensão (novos rótulos) está clara? [Clarity, Spec §Clarifications Q1] <!-- Evaluator: Covered by spec.md §Clarifications Q1 ("T031 fechada; US2 vira verificação + extensão de rótulos") + §Problem Statement (T031 como contexto histórico) -->
- [X] CHK008 O nível de acessibilidade exigido (básico, sem AA) é distinto do que está excluído? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec.md §Included ("nível básico que o PRD mantém") + §Excluded ("formal nível AA") -->

## Consistency

- [X] CHK009 Os rótulos de acessibilidade são consistentes entre spec, plano e código existente? [Consistency, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005, plan.md AD-002/AD-004 + frontend/lib/main.dart:307 (Semantics container label 'Navegação principal') -->
- [X] CHK010 O traversal de teclado do NavigationRail é consistente entre spec e código existente? [Consistency, Spec §User Scenarios & Testing US2] <!-- Evaluator: Covered by spec.md US2 + frontend/lib/main.dart:310-315 (NavigationRail selectedIndex, onDestinationSelected, labelType all) -->

## Measurability

- [X] CHK011 O bootstrap web tem teste nomeado para o requisito que o declara? [Measurability, Spec §Requirements FR-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-004 → frontend/test/web_browsers_test.dart) -->
- [X] CHK012 Os rótulos de acessibilidade têm teste nomeado? [Measurability, Spec §Requirements FR-005] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-005 → frontend/test/a11y_labels_test.dart) -->
- [X] CHK013 A regressão após `main.dart` tem mecanismo nomeado (suíte de teste)? [Measurability, Spec §Requirements FR-006] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-006 → frontend/test/web_browsers_test.dart) + §Testing Strategy (flutter test) -->

## Traceability

- [X] CHK014 Cada requisito de UX da spec aponta para símbolo no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-004 → ProjectManagerApp/main(); FR-005 → AppTheme.light/Semantics/NavigationRail; FR-006 → flutter test suite) -->
- [X] CHK015 As telas de US2 (dashboard, tasks, projects) são mapeadas no plano? [Traceability, Spec §Clarifications Q3] <!-- Evaluator: Covered by plan.md AD-004 + §Project Structure (dashboard_screen.dart, tasks_screen.dart, projects_screen.dart) -->
