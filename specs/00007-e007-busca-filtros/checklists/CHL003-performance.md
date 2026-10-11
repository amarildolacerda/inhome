# Performance Checklist: Busca e filtros (00007)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A meta de p95 < 2 s está declarada como requisito? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("p95 abaixo de 2 s em ambiente local com volume representativo") -->
- [X] CHK002 A ausência de camada de cache está declarada como restrição? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("nenhuma camada de cache") + §Excluded + plan.md AD-004 -->
- [X] CHK003 A leitura única por requisição está declarada? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("leitura única por requisição") + §Excluded -->
- [X] CHK004 `ensureIndexes()` cobrindo os campos filtrados está declarado? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 + plan.md AD-002 (índice condicional em ensureIndexes()) -->
- [X] CHK005 A lacuna conhecida (tasks.priority, tasks.due_date sem índice) está registrada como risco? [Completeness, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks ("faltam índices em tasks.priority e tasks.due_date") -->

## Clarity

- [X] CHK006 O método de medição de p95 (fixtures + N requisições sequenciais) está claro? [Clarity, Spec §Clarifications Q2] <!-- Evaluator: Covered by spec.md §Clarifications Q2 + plan.md AD-003 -->
- [X] CHK007 A proibição de cache está clara e sem ambiguidade? [Clarity, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 ("com ensureIndexes() ativo e sem cache") + §Excluded -->
- [X] CHK008 A resposta a p95 > 2 s (atacar por índice, nunca cache) está clara? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("P95 acima de 2 s: regressão, atacada por índice e nunca por cache") + plan.md AD-004 -->

## Consistency

- [X] CHK009 O valor do threshold (2 s) é idêntico entre spec, plano e critérios de sucesso? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003/SC-003 e plan.md Technical Context (p95 < 2 s) -->
- [X] CHK010 A proibição de cache é coerente entre spec, plano e decisões? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003/§Excluded, plan.md AD-004 e Technical Context (sem cache) -->

## Measurability

- [X] CHK011 O p95 tem teste nomeado para o requisito que o declara? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-003 → search.test.js latência) + SC-003 -->
- [X] CHK012 A regressão de índice (listagens E002/E003) tem verificação nomeada? [Measurability, Spec §Success Criteria SC-005] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-005 → backend/test.sh) + SC-005 -->
- [X] CHK013 A bateria completa como prova de não-regressão está mapeada? [Measurability, Spec §Success Criteria SC-005] <!-- Evaluator: Covered by plan.md §Testing Strategy (unit 107+, smoke 118+, flutter 16+) + SC-005 -->

## Traceability

- [X] CHK014 Cada requisito de performance da spec aponta para símbolo no mapa de cobertura? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-003 → ensureIndexes/DOMAIN_INDEXES; FR-005 → smoke suite/ensureIndexes idempotente) -->
