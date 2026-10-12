# Performance Checklist: Painel de próximos vencimentos (00011)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A meta de latência está declarada com contexto (p95 de 2 s local com milhares de contratos)? [Completeness, Spec §SC-003; CLAR Q8] <!-- Evaluator: Covered by spec.md SC-003 ("p95 de 2 s local") + CLAR Q8 ("p95 de 2 s (percepção 3 s coberta pela margem)") -->
- [X] CHK002 A paginação está declarada como mecanismo contra a latência no risco "Listagem lenta em domínio grande"? [Completeness, Spec §Risks] <!-- Evaluator: Covered by spec.md Risks ("sem paginação estoura 2 s. Mitigação: paginação e índice na rota quente") + FR-004 -->
- [X] CHK003 O índice idempotente em `contracts.forecast_date` está declarado como sinal de implementação (MIGRATION)? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by spec.md Signals ("índice idempotente em contracts.forecast_date") + plan.md AD-005/HINT-002 -->
- [X] CHK004 A ausência de cache compartilhado está declarada como restrição, não apenas omitida? [Completeness, Spec §FR-004; Included] <!-- Evaluator: Covered by spec.md FR-004 ("sem cache compartilhado") + Included ("leitura única por requisição, sem cache") -->

## Clarity

- [X] CHK005 "Leitura única" está definida de forma verificável (uma query por requisição, sem agregação entre requisições)? [Clarity, Spec §FR-004; plan.md HINT-005] <!-- Evaluator: Covered by plan.md HINT-005 ("1 SELECT por requisição (EXISTS+CASE); sem cache") + spec FR-004 -->
- [X] CHK006 A métrica de aceitação é objetiva e mensurável (gestor lê dentro do p95, sem filtro manual, com milhares de contratos)? [Clarity, Spec §SC-003] <!-- Evaluator: Covered by spec.md SC-003 (condições mensuráveis: milhares, p95, sem filtro manual) -->
- [X] CHK007 O escopo de consulta está limitado aos vigentes com previsão e à página atual, excluindo encerrados da leitura quente? [Clarity, Spec §Included; Edge Cases] <!-- Evaluator: Covered by spec.md Included (vigentes agrupados) + Edge Cases ("Encerrado: fora do painel") + FR-004 (página) -->

## Consistency

- [X] CHK008 A mitigação do risco de latência no plan.md (paginação + índice, sem cache) reflete exatamente o risco do spec? [Consistency, Spec §Risks; plan.md Risk Mitigation] <!-- Evaluator: Covered by spec.md Risks linha 1 ↔ plan.md Risk Mitigation ("AD-003 paginação + AD-005 índice; sem cache") -->
- [X] CHK009 O nome e a coluna do índice são idênticos entre spec (MIGRATION), plan.md (AD-005) e a tarefa de migração (forecast_date)? [Consistency, Spec §Implementation Signals; plan.md AD-005] <!-- Evaluator: Covered por spec.md Signals + plan.md AD-005 (`idx_contracts_forecast ON contracts(forecast_date)`) -->
- [X] CHK010 O contrato de ordenação estável (desempate por id) evita reprocessamento entre páginas, coerente com a meta de leitura única? [Consistency, Spec §FR-004; STF-003] <!-- Evaluator: Covered by spec.md FR-004 + STF-003 (paginação estável) + plan.md AD-003 (ORDER BY forecast_date, id) -->
