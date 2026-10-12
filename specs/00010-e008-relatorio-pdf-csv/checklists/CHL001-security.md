# Security Checklist: Relatório de serviços executados (00010)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A recusa de papel (prestador 403) está declarada como requisito antes de qualquer geração? [Completeness, Spec §FR-005] <!-- Evaluator: Covered by spec.md FR-005 + SC-005; contracts.js:354-355 requireRole('admin','gestor') -->
- [X] CHK002 O guarda de domínio (scopeDomain) está declarado para domainId explícito divergente? [Completeness, Spec §FR-005] <!-- Evaluator: Covered by spec.md FR-005; grounding contracts.js:345 router.use(scopeDomain()) -->
- [X] CHK003 A recusa de contrato desconhecido/estrangeiro (404 no banco do domínio) está documentada por caminho, sem ambiguidade com 403? [Completeness, Spec §Confirmados Q2] <!-- Evaluator: Covered by spec.md Q2 (404 por banco por domínio; 403 = papel/domainId) + Edge Cases -->
- [X] CHK004 A geração é transitória (nenhum arquivo persistido) está declarada, fechando vazamento em disco? [Completeness, Spec §FR-006; Excluded] <!-- Evaluator: Covered by spec.md FR-006 ("nenhuma persistência") + Edge Cases ("conteúdo transitório") -->

## Clarity

- [X] CHK005 A fronteira entre evidência no documento (task_photos) e anexos de comentário (fora) está explícita? [Clarity, Spec §Confirmados Q3] <!-- Evaluator: Covered by spec.md Q3 + Excluded ("anexos de comentário ... ficam fora do documento") -->
- [X] CHK006 O comportamento de "recusa antes de gerar" distingue 403 (papel/domínio) de 404 (id) sem ambiguidade? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("recusa (403/404) antes de gerar arquivo") + Q2 -->

## Consistency

- [X] CHK007 Os guards citados no spec são exatamente os ligados no código entregue (requireRole, scopeDomain, authenticateToken)? [Consistency, Spec §Included; plan.md AD-002] <!-- Evaluator: Covered by plan.md AD-002 (contracts.js:342,345,354,355) + grounding router middleware -->
- [X] CHK008 O escopo de fotos do spec (task_photos) bate com a fonte da contagem entregue em report.js? [Consistency, Spec §FR-001; plan.md AD-003] <!-- Evaluator: Covered by spec.md FR-001 + plan.md AD-003; report.js:82 COUNT de task_photos -->
- [X] CHK009 Nenhuma rota nova é prometida — o plano declara leitura pura sobre a superfície existente? [Consistency, Spec §Included; plan.md API Surface] <!-- Evaluator: Covered by plan.md API Surface ("sem rota nova") + project-plan:71 leitura pura -->
