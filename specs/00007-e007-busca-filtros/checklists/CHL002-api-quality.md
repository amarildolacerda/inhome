# API Quality Checklist: Busca e filtros (00007)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Os seis filtros do PRD (contrato, status, prioridade, prestador, finalidade, prazo) estão mapeados aos parâmetros implementados? [Completeness, Spec §Clarifications Q3] <!-- Evaluator: Covered by spec.md §Clarifications Q3 + search.js (q, status, priority, prestador_id, finalidade_id, contract_id, due_after, due_before) -->
- [X] CHK002 O resultado vazio sem erro está declarado como comportamento esperado? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("lista vazia sem erro") + plan.md §Error Handling Strategy -->
- [X] CHK003 A paginação consistente (total correto, arrays vazios) está declarada? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 + US1 cenário 2/3 + plan.md §Error Handling Strategy -->
- [X] CHK004 A página além do total retornando vazia com total correto está declarada? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 + US1 cenário 3 + §Edge Cases -->
- [X] CHK005 O limite de página (1–200, default 50) está coerente com o código? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by search.js paging() (limit 1..200, default 50; offset ≥ 0); FR-001 exige filtro/paginação corretos -->

## Clarity

- [X] CHK006 A semântica de combinação de filtros (AND) está clara? [Clarity, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 ("isolados e combinados") + search.js (where.join(' AND ')) -->
- [X] CHK007 O contrato de resposta (`{contracts|tasks, total, limit, offset}`) está claro nos artefatos? [Clarity, Spec §Requirements FR-001/FR-002] <!-- Evaluator: Covered by search.js res.json({contracts|tasks: rows, total, limit, offset}) + FR-001/FR-002 -->
- [X] CHK008 A diferença entre busca de contrato (por nome/objeto via `q`) e filtro por contrato (`contract_id`) está clara? [Clarity, Spec §Clarifications Q3] <!-- Evaluator: Covered by spec.md §Clarifications Q3 ("contract_id em /api/search/tasks; q em /api/search/contracts") -->

## Consistency

- [X] CHK009 Os nomes de parâmetro aparecem iguais entre spec, plano e código? [Consistency, Spec §Clarifications Q1/Q3] <!-- Evaluator: Covered by spec.md §Clarifications Q1/Q3 e search.js (due_after, due_before, contract_id, finalidade_id, prestador_id) -->
- [X] CHK010 O contrato de resposta é idêntico entre as duas rotas (contracts vs tasks)? [Consistency, Spec §Requirements FR-001/FR-002] <!-- Evaluator: Covered by search.js (ambas retornam {rows, total, limit, offset}) -->

## Measurability

- [X] CHK011 Cada filtro tem asserção de conjunto exato no teste? [Measurability, Spec §Success Criteria SC-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001 → search.test.js) + SC-001 ("conjunto exato") -->
- [X] CHK012 O resultado vazio tem asserção de `total: 0` e arrays vazios? [Measurability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-002 → search.test.js) + SC-002 -->
- [X] CHK013 A página além do total tem asserção de vazio + total correto? [Measurability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-002 → search.test.js) + SC-002 -->

## Traceability

- [X] CHK014 Cada requisito de qualidade de API da spec aponta para símbolo no mapa de cobertura? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-001 → searchContracts/searchTasks/likeParam/paging; FR-002 → paging/total COUNT) -->
