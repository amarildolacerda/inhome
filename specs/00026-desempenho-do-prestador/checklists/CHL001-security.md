# Security Checklist: Desempenho do prestador (00026)
**Created**: 2026-11-25 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A leitura da nota está restrita a admin e gestor em todos os cenários? [Completeness, Spec §FR-004] <!-- Evaluator: Covered by spec §FR-004 -->
- [X] CHK002 O isolamento por domínio está definido para listagem e cálculo? [Completeness, Spec §FR-009] <!-- Evaluator: Covered by spec §FR-009 -->
- [X] CHK003 A negativa de acesso impede vazamento da nota por mensagem de erro? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec §Edge Cases & Boundaries -->
- [X] CHK004 A entrada na navegação não aparece para prestador nem visitante? [Completeness, Spec §FR-004] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->

## Clarity

- [X] CHK005 Fica claro que o prestador não acessa a própria nota nesta entrega? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec §Scope -->
- [X] CHK006 A ausência de escrita manual da nota está explícita? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec §Scope -->

## Consistency

- [X] CHK007 Os guards de papel seguem o padrão JWT, `requireRole` e domínio da sessão? [Consistency, Spec §FR-004] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
- [X] CHK008 Os testes de aceite cobrem papel e domínio com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
