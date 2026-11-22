# Data Integrity Checklist: Previsibilidade financeira por contrato (00020)
**Created**: 2026-11-22 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK013 O modelo declara parcelas, pagamentos e comprovantes? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by plan.md §Data Model Summary -->
- [X] CHK014 Valores monetários usam centavos inteiros e BRL fixo? [Completeness, Spec §FR-064] <!-- Evaluator: Covered by plan.md §AD-001 e research.md §Persistência -->
- [X] CHK015 A soma de pagamentos não pode exceder o valor da parcela? [Completeness, Spec §FR-066] <!-- Evaluator: Covered by spec §FR-066 e STF-001 -->
- [X] CHK016 A exclusão de parcela com pagamento está bloqueada? [Completeness, Spec §FR-064] <!-- Evaluator: Covered by spec §Edge Cases e STF-004 -->
- [X] CHK017 O rebuild de attachments preserva ids e categoria chat? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by research.md §Persistência e plan.md §HINT-005 -->

## Clarity

- [X] CHK018 O limite de 500 parcelas por contrato está definido? [Clarity, Spec §STF-003] <!-- Evaluator: Covered by spec §STF-003 e plan.md §AD-008 -->
- [X] CHK019 O estado de atraso é derivado de vencimento sem pagamento total? [Clarity, Spec §FR-067] <!-- Evaluator: Covered by spec §FR-067 e data-model.md -->
- [X] CHK020 A chave de dedup do alerta está declarada por contrato e origem? [Clarity, Spec §FR-068] <!-- Evaluator: Covered by spec §FR-068 e plan.md §AD-005 -->

## Consistency

- [X] CHK021 A varredura repetida atualiza o alerta em vez de duplicá-lo? [Consistency, Spec §FR-068] <!-- Evaluator: Covered by research.md §Alertas e plan.md §Error Handling -->
- [X] CHK022 Contrato encerrado não gera alerta novo, mas mantém histórico? [Consistency, Spec §FR-068] <!-- Evaluator: Covered by spec §FR-068 e SC-002 -->
- [X] CHK023 CSV e PDF usam a mesma origem de dados do painel? [Consistency, Spec §FR-069] <!-- Evaluator: Covered by spec §FR-069 e plan.md §AD-006 -->

## Testability

- [X] CHK024 O saldo previsto/pago/resultante é verificável por asserção numérica? [Testability, Spec §SC-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-064 -->
- [X] CHK025 A dedup é verificável por contagem após três varreduras? [Testability, Spec §SC-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-068 -->
- [X] CHK026 A paridade de exportação é verificável por comparação de valores? [Testability, Spec §SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-069 -->
