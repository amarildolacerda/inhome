# Testing Checklist: Tema escuro por padrão e alternância persistida (00018)
**Created**: 2026-10-28 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Cada requisito P1 tem stub de aceitação mapeado para um arquivo de teste? [Completeness, Spec §FR-064; FR-065; FR-066; FR-067; FR-068] <!-- Evaluator: Covered by plan.md Acceptance Test Stubs (5 linhas FR-064..FR-068) -->
- [X] CHK002 O teste de primeira execução cobre SO claro e preferência vazia? [Completeness, Spec §SC-001] <!-- Evaluator: Covered by plan.md stub FR-064 + Testing Strategy (default escuro) -->
- [X] CHK003 O teste de fallback cobre ausência e invalidez com a allowlist declarada? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by spec.md FR-065 + plan.md AD-003 (allowlist) + stub FR-065 -->
- [X] CHK004 O teste de persistência cobre restauração nos dois sentidos após recarga? [Completeness, Spec §SC-004] <!-- Evaluator: Covered by spec.md SC-004 + plan.md stub FR-067 -->
- [X] CHK005 O teste do toggle declara o limite do shell e o callback de tema? [Completeness, Spec §FR-066] <!-- Evaluator: Covered by plan.md AD-004 (callback opcional) + stub FR-066 -->
- [X] CHK006 O teste de contraste cobre os dois modos? [Completeness, Spec §FR-068; SC-005] <!-- Evaluator: Covered by spec.md SC-005 + plan.md stub FR-068 (a11y_labels_test) -->
- [X] CHK007 O gate estático `flutter analyze` está declarado na estratégia? [Completeness, Spec §SC-005] <!-- Evaluator: Covered by spec.md SC-005 + plan.md Testing Strategy (Static flutter analyze) -->
- [X] CHK008 O duplo de teste de SharedPreferences está declarado para isolar a persistência? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by plan.md Testing Strategy (Mock Boundary SharedPreferences.setMockInitialValues) -->
- [X] CHK009 O teste de boot usa o entrypoint real para observar o tema restaurado? [Completeness, Spec §SC-002] <!-- Evaluator: Covered by plan.md Testing Strategy (web_browsers_test, entrypoint real) -->
- [X] CHK010 A estratégia declara que não há teste de backend ou de sincronização por ser UI-only? [Completeness, Spec §Scope] <!-- Evaluator: Covered by spec.md Scope Excluded + plan.md API Surface Summary (N/A) + Technical Context (sem teste de backend novo) -->

## Clarity

- [X] CHK011 Os nomes dos stubs incluem o ID do FR para rastreabilidade? [Clarity, Spec §FR-064; FR-065; FR-066; FR-067; FR-068] <!-- Evaluator: Covered by plan.md Acceptance Test Stubs (nomes com FR-064..FR-068) -->
- [X] CHK012 O valor esperado do teste de boot está explícito como escuro, não sistema? [Clarity, Spec §FR-064] <!-- Evaluator: Covered by plan.md AD-006 (expectativa system → dark) -->
- [X] CHK013 O limiar de contraste está quantificado na estratégia de teste? [Clarity, Spec §SC-005] <!-- Evaluator: Covered by plan.md Risk Mitigation (contraste AA) + stub FR-068 -->

## Consistency

- [X] CHK014 Cada FR P1 tem um único arquivo dono de teste, sem requisito órfão? [Consistency, Spec §FR-064; FR-065; FR-066; FR-067; FR-068] <!-- Evaluator: Covered by plan.md Requirement Coverage Map (FR-064..FR-068 com arquivo e símbolo) -->
- [X] CHK015 A bateria declarada é consistente com o escopo UI-only e sem teste de backend novo? [Consistency, Spec §Scope] <!-- Evaluator: Covered by spec.md Scope (UI-only) + plan.md Technical Context (sem teste de backend novo) -->
- [X] CHK016 A atualização da expectativa de E006 é consistente com o novo default escuro? [Consistency, Spec §FR-064] <!-- Evaluator: Covered by plan.md AD-006 (atualizar web_browsers_test) -->
- [X] CHK017 A estratégia de teste é consistente com a restrição de zero dependência nova? [Consistency, Spec §SC-005] <!-- Evaluator: Covered by spec.md SC-005 ("nenhuma dependência nova") + plan.md Instructions Check -->
- [X] CHK018 SC-005 é verificável por `flutter analyze` limpo e suíte verde? [Consistency, Spec §SC-005] <!-- Evaluator: Covered by spec.md SC-005 + plan.md Testing Strategy (analyze limpo e suíte verde) -->
