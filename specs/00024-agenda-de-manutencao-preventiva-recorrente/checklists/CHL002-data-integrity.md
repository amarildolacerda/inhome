# Data Integrity Checklist: Agenda de manutenção preventiva recorrente (00024)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK009 As duas entidades têm chaves, campos e relacionamentos definidos? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities -->
- [X] CHK010 A chave estável por regra/data e sua unicidade estão definidas? [Completeness, Spec §FR-095] <!-- Evaluator: Covered by spec §FR-095 -->
- [X] CHK011 A preservação de tarefas e histórico após edição ou inativação está explícita? [Completeness, Spec §FR-099] <!-- Evaluator: Covered by spec §FR-099 -->
- [X] CHK012 O horizonte de 90 dias e a exclusão de datas passadas estão definidos? [Completeness, Spec §FR-098] <!-- Evaluator: Covered by spec §FR-098 -->

## Clarity

- [X] CHK013 Fica claro que a conclusão não reancora a grade? [Clarity, Spec §Clarifications] <!-- Evaluator: Covered by spec §Clarifications -->
- [X] CHK014 A janela efetiva em domínio com janelas customizadas está livre de ambiguidade? [Clarity, Spec §Stress-Test Findings] <!-- Evaluator: Covered by spec §Stress-Test Findings -->

## Consistency

- [X] CHK015 O dedup de alertas usa a mesma tripla do motor E004? [Consistency, Spec §FR-100] <!-- Evaluator: Covered by spec §FR-100 -->
- [X] CHK016 A atomicidade entre geração e sincronização de alertas está definida? [Consistency, Spec §FR-101] <!-- Evaluator: Covered by spec §FR-101 -->
