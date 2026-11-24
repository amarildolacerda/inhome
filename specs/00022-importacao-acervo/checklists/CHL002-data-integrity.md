# Data Integrity Checklist: Importação de acervo (00022)
**Created**: 2026-11-23 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Nenhuma linha ou arquivo e gravado na previa? [Completeness, Spec §FR-074] <!-- Evaluator: Covered by spec §FR-074 e plan.md §AD-002 -->
- [X] CHK002 A confirmacao grava todas as linhas validas em uma unica transacao? [Completeness, Spec §FR-076] <!-- Evaluator: Covered by spec §FR-076 e plan.md §AD-006 -->
- [X] CHK003 Falha em uma linha reverte contratos, vinculos e arquivos? [Completeness, Spec §FR-076] <!-- Evaluator: Covered by spec §Edge Cases e plan.md §Error Handling -->
- [X] CHK004 O rebuild de attachments preserva ids, categorias e pais existentes? [Completeness, Spec §FR-077] <!-- Evaluator: Covered by spec §Assumptions e plan.md §AD-005 -->

## Clarity

- [X] CHK005 PDF sem linha correspondente e definido como pulado, sem gravacao? [Clarity, Spec §FR-078] <!-- Evaluator: Covered by spec §FR-078 -->
- [X] CHK006 Duplo envio da mesma previa esta definido sem deduplicacao? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec §Edge Cases -->

## Consistency

- [X] CHK007 A coluna de nome mapeada e a mesma chave na previa e na associacao de PDFs? [Consistency, Spec §FR-077] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
- [X] CHK008 O limite de linhas e aplicado antes da transacao, com 400 e zero escrita? [Consistency, Spec §STF-001] <!-- Evaluator: Covered by spec §STF-001 -->
