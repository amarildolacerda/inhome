# API Quality Checklist: Dossiê documental do prestador (00023)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK017 Os oito endpoints declaram metodo, caminho e resposta? [Completeness, Spec §FR-090] <!-- Evaluator: Covered by plan.md §API Surface Summary -->
- [X] CHK018 A recusa de vinculo e atribuicao usa o mesmo codigo e payload de motivos? [Completeness, Spec §FR-085] <!-- Evaluator: Covered by spec §FR-085 e FR-086 -->
- [X] CHK019 Os casos de arquivo invalido e payload incompleto estao definidos? [Completeness, Spec §FR-091] <!-- Evaluator: Covered by spec §Edge Cases & Boundaries -->
- [X] CHK020 A idempotencia da varredura e a limpeza de alertas estao especificadas? [Completeness, Spec §FR-088] <!-- Evaluator: Covered by spec §FR-088 e FR-089 -->

## Clarity

- [X] CHK021 Fica claro que documento vencido nao desfaz operacoes passadas? [Clarity, Spec §FR-087] <!-- Evaluator: Covered by spec §FR-087 -->
- [X] CHK022 O fallback ASO para finalidade sem itens esta livre de ambiguidade? [Clarity, Spec §FR-084] <!-- Evaluator: Covered by spec §Clarifications -->

## Consistency

- [X] CHK023 Os erros seguem o padrao `{ error, code }` das rotas v2 existentes? [Consistency, Spec §FR-085] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK024 Os testes de aceite cobrem os 12 requisitos P1 com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
