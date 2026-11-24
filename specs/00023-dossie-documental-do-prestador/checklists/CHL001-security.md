# Security Checklist: Dossiê documental do prestador (00023)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as rotas declaram autenticacao e papeis admin/gestor? [Completeness, Spec §FR-091] <!-- Evaluator: Covered by spec §FR-091 -->
- [X] CHK002 O prestador ve somente o proprio dossie e os demais papeis sao recusados? [Completeness, Spec §FR-090] <!-- Evaluator: Covered by spec §FR-090 -->
- [X] CHK003 O escopo por dominio bloqueia acesso alheio antes de qualquer leitura? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK004 O limite de 2 MB e a extensao permitida estao definidos antes de gravar? [Completeness, Spec §FR-091] <!-- Evaluator: Covered by spec §FR-091 -->

## Clarity

- [X] CHK005 Fica claro que a conferencia e declaracao do gestor, sem validar autenticidade? [Clarity, Spec §Excluded] <!-- Evaluator: Covered by spec §Excluded -->
- [X] CHK006 A recusa por documento ausente ou vencido tem codigo estavel e motivo? [Clarity, Spec §FR-085] <!-- Evaluator: Covered by spec §FR-085 -->

## Consistency

- [X] CHK007 As rotas repetem authenticateToken → scopeDomain → requireRole do padrao v2? [Consistency, Spec §FR-091] <!-- Evaluator: Covered by plan.md §AD-004 -->
- [X] CHK008 A entrada de navegacao segue a mesma regra de papeis das rotas? [Consistency, Spec §SC-001] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
