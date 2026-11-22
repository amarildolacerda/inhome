# Security Checklist: Previsibilidade financeira por contrato (00020)
**Created**: 2026-11-22 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as rotas financeiras declaram autenticação e papéis admin/gestor? [Completeness, Spec §FR-070] <!-- Evaluator: Covered by spec §FR-070 e plan.md §API Surface -->
- [X] CHK002 Visitante e prestador são recusados antes de qualquer consulta de valor? [Completeness, Spec §FR-070] <!-- Evaluator: Covered by spec §Excluded e plan.md §Error Handling -->
- [X] CHK003 Divergência de domínio é bloqueada por scopeDomain em toda a superfície? [Completeness, Spec §FR-070] <!-- Evaluator: Covered by research.md §API e plan.md §Error Handling -->
- [X] CHK004 Contrato inexistente devolve 404 sem expor existência de outro domínio? [Completeness, Spec §FR-064] <!-- Evaluator: Covered by plan.md §API Surface -->
- [X] CHK005 O comprovante fica em categoria separada de evidência e chat? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by spec §FR-065 e STF-005 -->

## Clarity

- [X] CHK006 Fica claro que nenhum dado financeiro sai do domínio? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec §Excluded (0 integração externa) -->
- [X] CHK007 A imutabilidade do pagamento está declarada sem ambiguidade? [Clarity, Spec §Key Entities] <!-- Evaluator: Covered by spec §Key Entities e Edge Cases -->
- [X] CHK008 O upload inválido está definido como 400 sem pagamento parcial? [Clarity, Spec §FR-066] <!-- Evaluator: Covered by spec §FR-066 e STF-001 -->

## Consistency

- [X] CHK009 As rotas repetem authenticateToken → scopeDomain → requireRole das rotas existentes? [Consistency, Spec §FR-070] <!-- Evaluator: Covered by research.md §API e plan.md §Project Structure -->
- [X] CHK010 O agregado do dashboard usa o mesmo guard das rotas financeiras? [Consistency, Spec §FR-067] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->

## Testability

- [X] CHK011 Casos negativos de papel e domínio têm asserção 403 observável? [Testability, Spec §SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-070 -->
- [X] CHK012 A ausência de vazamento no agregado é verificável por chave ausente? [Testability, Spec §SC-003] <!-- Evaluator: Covered by spec §STF-002 e plan.md §AD-004 -->
