# Security Checklist: Gestão documental do contrato (00021)
**Created**: 2026-11-23 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as tres rotas declaram autenticacao e papéis admin/gestor? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by spec §FR-067 e plan.md §API Surface -->
- [X] CHK002 Prestador, visitante e auditor sao recusados antes de qualquer consulta? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by spec §Excluded e plan.md §Error Handling -->
- [X] CHK003 Divergencia de dominio e bloqueada por scopeDomain em toda a superficie? [Completeness, Spec §FR-070] <!-- Evaluator: Covered by spec §FR-070 e plan.md §Error Handling -->
- [X] CHK004 Documento de outro contrato no mesmo dominio nao aparece na listagem? [Completeness, Spec §FR-066] <!-- Evaluator: Covered by spec §FR-066 e plan.md §Requirement Coverage Map -->

## Clarity

- [X] CHK005 Fica claro que nenhum arquivo sai do storage local de E003? [Clarity, Spec §Excluded] <!-- Evaluator: Covered by spec §Excluded -->
- [X] CHK006 A negacao por papel esta definida sem ambiguidade? [Clarity, Spec §FR-067] <!-- Evaluator: Covered by spec §FR-067 -->

## Consistency

- [X] CHK007 As rotas repetem authenticateToken → scopeDomain → requireRole de finance.js? [Consistency, Spec §FR-067] <!-- Evaluator: Covered by plan.md §Project Structure -->
- [X] CHK008 A entrada de navegacao segue a mesma regra de papéis das rotas? [Consistency, Spec §SC-004] <!-- Evaluator: Covered by spec §SC-004 -->
