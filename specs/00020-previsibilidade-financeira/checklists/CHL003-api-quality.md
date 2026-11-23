# API Quality Checklist: Previsibilidade financeira por contrato (00020)
**Created**: 2026-11-22 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK027 Os seis endpoints declaram método, caminho e finalidade? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by plan.md §API Surface Summary -->
- [X] CHK028 Os payloads de parcela e pagamento estão definidos? [Completeness, Spec §FR-064; FR-065] <!-- Evaluator: Covered by contracts/finance.yaml -->
- [X] CHK029 Os códigos 400/401/403/404 estão declarados por categoria de erro? [Completeness, Spec §Edge Cases] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK030 A exportação CSV e PDF tem endpoint próprio? [Completeness, Spec §FR-069] <!-- Evaluator: Covered by plan.md §API Surface Summary -->

## Clarity

- [X] CHK031 A chave `finance` no dashboard é opcional por papel? [Clarity, Spec §FR-067] <!-- Evaluator: Covered by research.md §Painel e plan.md §AD-004 -->
- [X] CHK032 A moeda e a conversão para centavos estão explícitas? [Clarity, Spec §Assumptions] <!-- Evaluator: Covered by spec §Assumptions e plan.md §AD-001 -->
- [X] CHK033 A resposta de pagamento descreve comprovante sem devolver bytes? [Clarity, Spec §FR-065] <!-- Evaluator: Covered by research.md §Upload e data-model.md -->

## Consistency

- [X] CHK034 Os caminhos usam o prefixo `/api/v2` e `contractId`? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Covered by contracts/finance.yaml e plan.md §API Surface -->
- [X] CHK035 Payload em inglês e mensagens de erro em português são mantidos? [Consistency, Spec §Assumptions] <!-- Evaluator: Covered by spec §Assumptions e plan.md §Project Structure -->
- [X] CHK036 O alerta usa o motor E004 existente, sem segundo caminho? [Consistency, Spec §FR-068] <!-- Evaluator: Covered by research.md §Alertas e plan.md §Requirement Coverage Map -->

## Testability

- [X] CHK037 O limite de parcelas é verificável por contagem após 501 POSTs? [Testability, Spec §STF-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-064 -->
- [X] CHK038 A recusa de pagamento acima do saldo é verificável por ausência de linha? [Testability, Spec §SC-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-066 -->
