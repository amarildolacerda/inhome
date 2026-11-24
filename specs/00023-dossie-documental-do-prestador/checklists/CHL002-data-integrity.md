# Data Integrity Checklist: Dossiê documental do prestador (00023)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK009 As tres entidades tem chaves, campos e relacionamentos definidos? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities -->
- [X] CHK010 Vigencia, conferencia e situacao ativa do trabalhador estao modeladas? [Completeness, Spec §FR-081] <!-- Evaluator: Covered by spec §FR-080 e FR-082 -->
- [X] CHK011 O fallback do checklist global esta definido para contrato sem finalidade? [Completeness, Spec §FR-084] <!-- Evaluator: Covered by spec §FR-084 -->
- [X] CHK012 A limpeza de alertas esta definida para regularizacao e desvinculo? [Completeness, Spec §FR-089] <!-- Evaluator: Covered by spec §FR-089 -->

## Clarity

- [X] CHK013 Fica claro que nenhuma tabela existente muda de formato? [Clarity, Spec §Implementation Signals] <!-- Evaluator: Covered by spec §Implementation Signals -->
- [X] CHK014 A ausencia de efeito retroativo sobre vinculo e tarefa esta explicita? [Clarity, Spec §FR-087] <!-- Evaluator: Covered by spec §FR-087 -->

## Consistency

- [X] CHK015 O dedup de alertas usa a mesma chave tripla de E018? [Consistency, Spec §FR-088] <!-- Evaluator: Covered by plan.md §AD-002 -->
- [X] CHK016 Os tipos de documento seguem o enum INTEGER do repositorio? [Consistency, Spec §AD-007] <!-- Evaluator: Covered by plan.md §AD-007 -->
