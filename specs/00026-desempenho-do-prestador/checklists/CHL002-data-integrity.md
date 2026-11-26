# Data Integrity Checklist: Desempenho do prestador (00026)
**Created**: 2026-11-25 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK009 Nota, componente, período e ocorrência têm definição e limites explícitos? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities -->
- [X] CHK010 A base das ocorrências e o motivo de cada tipo estão definidos? [Completeness, Spec §FR-005] <!-- Evaluator: Covered by spec §FR-005 -->
- [X] CHK011 A regra de não duplicar reabertura após reconclusão está definida? [Completeness, Spec §FR-007] <!-- Evaluator: Covered by spec §FR-007 -->
- [X] CHK012 O estado "sem dados" e o caso de uma única tarefa estão definidos? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec §Clarifications -->

## Clarity

- [X] CHK013 Fica claro que nenhuma tabela ou avaliação manual é criada? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec §Scope -->
- [X] CHK014 A data de referência e a janela padrão estão especificadas sem ambiguidade? [Clarity, Spec §Clarifications] <!-- Evaluator: Covered by spec §Clarifications -->

## Consistency

- [X] CHK015 A determinismo da nota está alinhado ao mesmo conjunto de tarefas e data? [Consistency, Spec §FR-008] <!-- Evaluator: Covered by spec §FR-008 -->
- [X] CHK016 A rastreabilidade da ocorrência até a tarefa de origem está alinhada ao contrato? [Consistency, Spec §FR-006] <!-- Evaluator: Covered by contracts/provider-performance.yaml -->
