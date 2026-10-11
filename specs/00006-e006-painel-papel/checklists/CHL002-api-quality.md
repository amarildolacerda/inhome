# API Quality Checklist: Painel por papel (00006)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A superfície de API existente (`GET /api/dashboard/stats`) está declarada como inalterada em contrato? [Completeness, Spec §Scope Excluded] <!-- Evaluator: Covered by spec.md §Excluded ("Novos cartões ou métricas no dashboard além dos que já existem") + plan.md §API Surface Summary ("nenhum endpoint novo") -->
- [X] CHK002 O comportamento de 403 para system_admin está declarado antes de qualquer consulta? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 + plan.md §Error Handling Strategy ("403 antes de qualquer consulta") -->
- [X] CHK003 A forma de resposta do dashboard (escopo próprio vs domínio) está declarada nos artefatos? [Completeness, Spec §Requirements FR-001, FR-002] <!-- Evaluator: Covered by spec.md FR-001/FR-002 + backend/src/routes/dashboard.js:57,84 (scope: 'own' vs 'domain') -->
- [X] CHK004 O tratamento de domínio sem dados (painel zera sem erro) está declarado? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("Domínio sem dados: painel zera sem erro e sem cartões quebrados") -->

## Clarity

- [X] CHK005 A distinção entre 401 (sem token) e 403 (papel/domínio) está clara nos artefatos? [Clarity, Spec §Requirements FR-003] <!-- Evaluator: Covered by plan.md §Error Handling Strategy ("401/403") + backend/src/middleware/auth.js (authenticateToken 401, requireRole 403) -->
- [X] CHK006 O campo `scope` na resposta é nomeado de forma consistente? [Clarity, Spec §Requirements FR-001, FR-002] <!-- Evaluator: Covered by backend/src/routes/dashboard.js:76,133 (scope: 'domain' vs 'own') + spec.md FR-001/FR-002 -->

## Consistency

- [X] CHK007 O contrato de resposta do dashboard é consistente entre spec, plano e código existente? [Consistency, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001, plan.md §API SurfaceSummary ("GET /api/dashboard/stats já existe") + backend/src/routes/dashboard.js:134-145 -->
- [X] CHK008 Os campos de resposta (stats, tasksByPriority, tasksByStatus, recentProjects) são consistentes entre os testes existentes e o plano? [Consistency, Spec §Requirements FR-001] <!-- Evaluator: Covered by backend/src/routes/dashboard.test.js:127 (FR-019 metrics) + backend/src/routes/dashboard.js:76-127 -->

## Measurability

- [X] CHK009 A resposta do dashboard tem teste nomeado para o requisito que a declara? [Measurability, Spec §Requirements FR-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001 → backend/src/routes/dashboard.test.js) -->
- [X] CHK010 O tratamento de system_admin tem teste nomeado? [Measurability, Spec §Requirements FR-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-003 → backend/src/routes/dashboard.test.js) -->

## Traceability

- [X] CHK011 Cada requisito de API da spec aponta para símbolo no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-001 → getDomainMetrics; FR-002 → prestador branch; FR-003 → requireRole) -->
- [X] CHK012 O endpoint `/api/dashboard/stats` é mapeado no plano como superfície existente inalterada? [Traceability, Spec §Scope] <!-- Evaluator: Covered by plan.md §API SurfaceSummary ("nenhum endpoint novo; GET /api/dashboard/stats já existe") -->
