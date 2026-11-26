# API Quality Checklist: Desempenho do prestador (00026)
**Created**: 2026-11-25 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK017 O endpoint declara método, caminho, parâmetros e resposta? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by plan.md §API Surface Summary -->
- [X] CHK018 Filtro por prestador, período, ordenação e página estão definidos? [Completeness, Spec §FR-010] <!-- Evaluator: Covered by spec §FR-010 -->
- [X] CHK019 Os limites de página e de janela estão definidos no contrato? [Completeness, Spec §FR-012] <!-- Evaluator: Covered by contracts/provider-performance.yaml -->
- [X] CHK020 Os erros de autenticação, papel e parâmetro inválido estão declarados? [Completeness, Spec §Error Handling Strategy] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->

## Clarity

- [X] CHK021 O significado de `score` nulo com `hasData=false` está claro? [Clarity, Spec §FR-003] <!-- Evaluator: Covered by contracts/provider-performance.yaml -->
- [X] CHK022 A ordem padrão da lista está definida sem ambiguidade? [Clarity, Spec §FR-011] <!-- Evaluator: Covered by spec §FR-011 -->

## Consistency

- [X] CHK023 O contrato e a tela usam os mesmos nomes de componentes e ocorrências? [Consistency, Spec §FR-002] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
- [X] CHK024 Cada requisito P1 tem um stub de aceite rastreável? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
