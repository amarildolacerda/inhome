# API Quality Checklist: Régua de notificação configurável (00025)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK017 Os quatro endpoints declaram método, caminho e resposta? [Completeness, Spec §FR-105] <!-- Evaluator: Covered by plan.md §API Surface Summary -->
- [X] CHK018 O payload define limites de lembretes, intervalo e ativação? [Completeness, Spec §FR-107] <!-- Evaluator: Covered by spec §FR-107 -->
- [X] CHK019 Os erros 400 e 403 e a gravação sem alteração parcial estão definidos? [Completeness, Spec §FR-107] <!-- Evaluator: Covered by spec §FR-107 -->
- [X] CHK020 A leitura do painel com `rules` e `reminders` está especificada? [Completeness, Spec §FR-112] <!-- Evaluator: Covered by spec §FR-112 -->

## Clarity

- [X] CHK021 Fica claro que desativar não apaga evento nem reenvia histórico? [Clarity, Spec §FR-111] <!-- Evaluator: Covered by spec §FR-111 -->
- [X] CHK022 A autoria e a data da alteração ficam visíveis na próxima leitura? [Clarity, Spec §FR-115] <!-- Evaluator: Covered by spec §FR-115 -->

## Consistency

- [X] CHK023 Os erros seguem o padrão `{ error }` das rotas v2 existentes? [Consistency, Spec §Error Handling Strategy] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK024 Os testes de aceite cobrem os 10 requisitos P1 com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
