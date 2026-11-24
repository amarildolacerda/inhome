# Security Checklist: Importação de acervo (00022)
**Created**: 2026-11-23 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as tres rotas declaram autenticacao e papeis admin/gestor? [Completeness, Spec §FR-079] <!-- Evaluator: Covered by spec §FR-079 e plan.md §API Surface -->
- [X] CHK002 Prestador, visitante, auditor e system_admin sao recusados antes de qualquer leitura? [Completeness, Spec §FR-079] <!-- Evaluator: Covered by spec §Excluded e plan.md §AD-007 -->
- [X] CHK003 Divergencia de dominio e bloqueada por scopeDomain nas tres rotas? [Completeness, Spec §FR-079] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK004 O download do template exige JWT do dominio, sem arquivo publico? [Completeness, Spec §FR-071] <!-- Evaluator: Covered by spec §FR-071 -->

## Clarity

- [X] CHK005 Fica claro que nenhum PDF sai do storage local de E003? [Clarity, Spec §Excluded] <!-- Evaluator: Covered by spec §Excluded -->
- [X] CHK006 A negacao por papel esta definida sem ambiguidade para cada etapa? [Clarity, Spec §FR-079] <!-- Evaluator: Covered by spec §FR-079 -->

## Consistency

- [X] CHK007 As rotas repetem authenticateToken → scopeDomain → requireRole de finance.js? [Consistency, Spec §FR-079] <!-- Evaluator: Covered by plan.md §AD-007 -->
- [X] CHK008 A entrada de navegacao segue a mesma regra de papeis das rotas? [Consistency, Spec §SC-002] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
