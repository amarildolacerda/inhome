# Security Checklist: Busca e filtros (00007)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O resultado da busca é restrito ao domínio do token em ambas as rotas? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("Todo resultado é restrito ao domínio do token") + search.js getDomainDb(req.user.domainId) nas duas rotas -->
- [X] CHK002 O alcance do papel (prestador vê só as próprias tarefas) está declarado como requisito? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 + US2 cenário 1 + search.js prestador branch (t.assignee_id = req.user.id) -->
- [X] CHK003 A ausência de parâmetro `domainId` na rota de busca está declarada como decisão, não como omissão? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Edge Cases ("rota não recebe domainId") + plan.md AD-001 -->
- [X] CHK004 O token isolation (sem `scopeDomain`) está declarado como controle de segurança da busca? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("não aceito — a rota não recebe domainId") + FR-004 -->
- [X] CHK005 A política de escape de curinga do usuário no LIKE está coberta? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by search.js likeParam() com ESCAPE '\\'; FR-001 exige filtro correto; plan.md §Error Handling Strategy -->

## Clarity

- [X] CHK006 A fronteira entre filtro do papel (prestador) e filtro explícito (`prestador_id`) está definida sem ambiguidade? [Clarity, Spec §Clarifications Q1] <!-- Evaluator: Covered by spec.md FR-001/FR-004; search.js: prestador role força assignee_id próprio, admin/gestor podem passar prestador_id explícito -->
- [X] CHK007 A semântica de janela de prazo (aberta vs fechada) está clara? [Clarity, Spec §Clarifications Q1] <!-- Evaluator: Covered by spec.md §Clarifications Q1 ("janela aberta com só um, fechada com os dois") -->
- [X] CHK008 A diferença entre domínio (token) e papel (requireRole) está clara nos artefatos? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases + plan.md AD-001 + §Error Handling Strategy (token isolation vs requireRole) -->

## Consistency

- [X] CHK009 Os nomes de papel (admin, gestor, prestador) aparecem iguais entre spec e plano? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US1/US2/FR-004 e plan.md AD-001 (mesmos papéis) -->
- [X] CHK010 A decisão de não ligar `scopeDomain()` é coerente entre spec, plano e código existente? [Consistency, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases, plan.md AD-001 e search.js (sem scopeDomain; usa req.user.domainId) -->

## Measurability

- [X] CHK011 O escopo de domínio/papel tem teste nomeado para o requisito que o declara? [Measurability, Spec §Requirements FR-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-004 → search.test.js) + §Requirement Coverage Map -->
- [X] CHK012 Os seis filtros isolados/ combinados têm teste nomeado? [Measurability, Spec §Requirements FR-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001 → search.test.js) -->
- [X] CHK013 O resultado vazio com paginação consistente tem teste nomeado? [Measurability, Spec §Requirements FR-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-002 → search.test.js) -->

## Traceability

- [X] CHK014 Cada requisito de segurança da spec aponta para símbolo no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-004 → getDomainDb/requireRole; FR-001 → searchContracts/searchTasks/likeParam/paging) -->
