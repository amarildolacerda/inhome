# API Quality Checklist: Agenda de manutenção preventiva recorrente (00024)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK017 Os quatro endpoints declaram método, caminho e resposta? [Completeness, Spec §FR-102] <!-- Evaluator: Covered by spec §FR-102 -->
- [X] CHK018 O payload de criação define limites de intervalo e antecedência? [Completeness, Spec §FR-093] <!-- Evaluator: Covered by spec §FR-093 -->
- [X] CHK019 Os erros 400, 403 e 404 e a resposta do sweep estão definidos? [Completeness, Spec §FR-103] <!-- Evaluator: Covered by spec §FR-103 -->
- [X] CHK020 A idempotência do acionamento manual está especificada? [Completeness, Spec §FR-104] <!-- Evaluator: Covered by spec §FR-104 -->

## Clarity

- [X] CHK021 Fica claro que inativar não apaga tarefa, ocorrência nem histórico? [Clarity, Spec §FR-099] <!-- Evaluator: Covered by spec §FR-099 -->
- [X] CHK022 A listagem no detalhe do contrato mantém escrita restrita a admin e gestor? [Clarity, Spec §FR-102] <!-- Evaluator: Covered by spec §FR-102 -->

## Consistency

- [X] CHK023 Os erros seguem o padrão `{ error, code }` das rotas v2 existentes? [Consistency, Spec §Error Handling Strategy] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK024 Os testes de aceite cobrem os 12 requisitos P1 com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
