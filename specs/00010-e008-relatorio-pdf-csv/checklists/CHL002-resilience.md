# Resilience Checklist: Relatório de serviços executados (00010)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O caso "foto ausente em disco" tem comportamento declarado (texto preservado, documento conclui)? [Completeness, Spec §FR-001] <!-- Evaluator: Covered by spec.md FR-001 ("arquivo ausente ou ilegível preserva a linha textual sem falhar") + SC-002 -->
- [X] CHK002 O caso "formato sem suporte nativo (webp/gif)" tem comportamento declarado? [Completeness, Spec §Confirmados Q1] <!-- Evaluator: Covered by spec.md Q1 + Included ("webp/gif ... referência textual") + plan.md AD-001 -->
- [X] CHK003 A falha de leitura do banco (500, sem retry, sem persistência) está declarada? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 + Edge Cases + plan.md Error Handling -->
- [X] CHK004 O contrato sem tarefas (documento vazio legível, sem erro) está declarado nos dois formatos? [Completeness, Spec §FR-003; SC-003] <!-- Evaluator: Covered by spec.md FR-003 + SC-003 + spec.md Edge Cases -->
- [X] CHK005 A isolação por imagem (try/catch por foto) está no plano, de modo que uma imagem ruim não derruba o lote? [Completeness, Spec §FR-001] <!-- Evaluator: Covered by plan.md Error Handling ("nenhum caminho propaga exceção de embedding") + research.md §Fallbacks -->

## Clarity

- [X] CHK006 A semântica do documento vazio (PDF com cabeçalho/(vazio), CSV só cabeçalho) é inequívoca? [Clarity, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 + US1 cenário 2 -->
- [X] CHK007 O caminho de recuperação do usuário (repetir a ação manualmente) está claro? [Clarity, Spec §FR-006; Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("usuário repete a ação, sem retry automático") -->

## Consistency

- [X] CHK008 O fallback textual do embedding é o mesmo entre spec, plano e research? [Consistency, Spec §FR-001; plan.md AD-001; research.md] <!-- Evaluator: Covered por spec.md Q1, plan.md AD-001 e research.md §Fallbacks com o mesmo contrato -->
- [X] CHK009 A paridade PDF/CSV usa a mesma fonte de dados (loadReportData) declarada no plano? [Consistency, Spec §FR-004] <!-- Evaluator: Covered by plan.md AD-003 ("PDF e CSV compartilham a mesma fonte") + FR-004 -->
- [X] CHK010 Os cenários de ausência usam fixture temporário (AD-004) sem destruir dados reais da loja? [Consistency, Spec §FR-001] <!-- Evaluator: Covered by plan.md AD-004 ("apaga SÓ a cópia temporária e restaura") + Coverage Map FR-001 -->
