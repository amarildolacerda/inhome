# Data Integrity Checklist: Régua de notificação configurável (00025)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK009 As quatro entidades têm chaves, campos e relacionamentos definidos? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities -->
- [X] CHK010 A identidade por alerta, etapa e canal e sua unicidade estão definidas? [Completeness, Spec §FR-108] <!-- Evaluator: Covered by spec §FR-108 -->
- [X] CHK011 A preservação de eventos após edição ou desativação está explícita? [Completeness, Spec §FR-113] <!-- Evaluator: Covered by spec §FR-113 -->
- [X] CHK012 O limite de cinco lembretes e a recusa de janelas insuficientes estão definidos? [Completeness, Spec §FR-107] <!-- Evaluator: Covered by spec §FR-107 -->

## Clarity

- [X] CHK013 Fica claro que o snapshot da régua vale até o fim da verificação? [Clarity, Spec §Clarifications] <!-- Evaluator: Covered by spec §Clarifications -->
- [X] CHK014 A seleção da menor janela para a maior com intervalo está livre de ambiguidade? [Clarity, Spec §Stress-Test Findings] <!-- Evaluator: Covered by spec §Stress-Test Findings -->

## Consistency

- [X] CHK015 O dedup de lembretes usa a mesma chave do motor E004? [Consistency, Spec §FR-110] <!-- Evaluator: Covered by spec §FR-110 -->
- [X] CHK016 O backfill de `alert_events` legados está definido sem perda de histórico? [Consistency, Spec §FR-113] <!-- Evaluator: Covered by plan.md §Data Model Summary -->
