# Data Integrity Checklist: Chat colaborativo por contrato (00017)
**Created**: 2026-11-21 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK013 O modelo de dados declara mensagens, análises e alertas extraídos? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by plan.md §Data Model Summary (3 tabelas) -->
- [X] CHK014 A migração de `attachments` preserva ids, linhas e foreign keys? [Completeness, Spec §FR-054] <!-- Evaluator: Covered by research.md §Migração e plan.md §HINT-005 -->
- [X] CHK015 O dedup de alertas tem chave única declarada por contrato e origem? [Completeness, Spec §FR-060] <!-- Evaluator: Covered by plan.md §Data Model Summary (UNIQUE tripla) -->
- [X] CHK016 O reprocessamento atualiza o alerta existente em vez de inserir outro? [Completeness, Spec §FR-060] <!-- Evaluator: Covered by spec §FR-060 e STF-001 -->
- [X] CHK017 Anexo de chat fica fora de evidências e relatórios por construção? [Completeness, Spec §FR-055] <!-- Evaluator: Covered by spec §FR-055 e STF-002 -->

## Clarity

- [X] CHK018 O estado da análise (`pending`/`completed`/`failed`) está definido? [Clarity, Spec §FR-059; FR-061] <!-- Evaluator: Covered by plan.md §Data Model Summary -->
- [X] CHK019 A imutabilidade do histórico de mensagens está declarada? [Clarity, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities e §Excluded -->
- [X] CHK020 O limite de 4.000 caracteres e a paginação 50/100 estão definidos? [Clarity, Spec §FR-051] <!-- Evaluator: Covered by spec §FR-051 e STF-004 -->

## Consistency

- [X] CHK021 As chaves estrangeiras apontam para contratos e mensagens do mesmo domínio? [Consistency, Spec §FR-051; FR-059] <!-- Evaluator: Covered by research.md §Padrões locais (db por domínio) -->
- [X] CHK022 O fallback de timeout não grava análise parcial com alerta órfão? [Consistency, Spec §FR-061] <!-- Evaluator: Covered by plan.md §Error Handling (falha sem escrita de alerta) -->
- [X] CHK023 Índices do rebuild são recriados depois da migração? [Consistency, Spec §FR-054; research.md §Migração] <!-- Evaluator: Covered by research.md §Migração e plan.md §HINT-005 -->

## Testability

- [X] CHK024 Reprocessar o mesmo documento é verificável por contagem de alertas? [Testability, Spec §SC-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-060 -->
- [X] CHK025 A ausência de anexo de chat em evidências é verificável por consulta? [Testability, Spec §SC-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-055 -->
