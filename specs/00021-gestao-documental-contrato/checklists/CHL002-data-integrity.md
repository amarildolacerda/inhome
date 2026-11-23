# Data Integrity Checklist: Gestão documental do contrato (00021)
**Created**: 2026-11-23 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Cada anexo do contrato aparece uma unica vez na listagem? [Completeness, Spec §FR-064] <!-- Evaluator: Covered by spec §FR-064 e plan.md §AD-001 -->
- [X] CHK002 A origem e derivada de message_id/payment_id sem coluna nova? [Completeness, Spec §Assumptions] <!-- Evaluator: Covered by spec §Assumptions e plan.md §AD-002 -->
- [X] CHK003 A analise exibida vem de document_analyses sem reextracao? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by spec §FR-065 e plan.md §AD-003 -->
- [X] CHK004 A conferencia grava autor e data uma unica vez por documento? [Completeness, Spec §FR-069] <!-- Evaluator: Covered by spec §FR-069 e plan.md §AD-004 -->

## Clarity

- [X] CHK005 Categoria desconhecida esta definida como 400 sem escrita? [Clarity, Spec §FR-068] <!-- Evaluator: Covered by spec §FR-068 -->
- [X] CHK006 Contrato encerrado continua consultavel sem nova extracao? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec §Edge Cases -->

## Consistency

- [X] CHK007 Alteracao de categoria usa UPDATE na linha existente, nunca INSERT? [Consistency, Spec §FR-068] <!-- Evaluator: Covered by spec §FR-068 e plan.md §AD-001 -->
- [X] CHK008 Os alertas exibidos respeitam o dedup existente de extracted_alerts? [Consistency, Spec §FR-065] <!-- Evaluator: Covered by plan.md §AD-003 e HINT-003 -->
