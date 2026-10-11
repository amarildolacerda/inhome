# Security Checklist: Painel por papel (00006)
**Created**: 2026-10-09 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A recusa 403 para system_admin está declarada como requisito do painel? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("403 for sessions without dashboard permission (system_admin)") + §Edge Cases "Sessão sem permissão de leitura do painel (system_admin): 403" -->
- [X] CHK002 A visão restrita do prestador está declarada sem contadores de domínio expostos? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("exposing no domain-wide counters") + US1 cenário 2 -->
- [X] CHK003 A ausência de parâmetro `domainId` na rota do dashboard está declarada como decisão, não como omissão? [Completeness, Spec §Clarifications Q2] <!-- Evaluator: Covered by spec.md §Clarifications Q2 + plan.md AD-003 ("scopeDomain() é no-op; token já isola") -->
- [X] CHK004 O isolamento de domínio via token é declarado como controle de segurança do painel? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases "Token de outro domínio consultando o dashboard: 403 por escopo de domínio" + FR-003 -->
- [X] CHK005 A política de deny by default para papéis sem permissão está declarada? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases + plan.md §Error Handling Strategy ("system_admin → 403 antes de qualquer consulta") -->

## Clarity

- [X] CHK006 A fronteira entre visão restrita (200 com `scope: 'own'`) e recusa (403) está definida sem ambiguidade? [Clarity, Spec §Clarifications Q2] <!-- Evaluator: Covered by spec.md §Edge Cases ("prestador autenticado pedindo o dashboard completo: 403, com a visão restrita") + FR-002/FR-003; leitura: 200 com payload restrito para prestador, 403 só para system_admin -->
- [X] CHK007 O papel alvo de cada recusa está nomeado (system_admin vs domínio divergente)? [Clarity, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (dois gatilhos nomeados) + plan.md §Error Handling Strategy (linhas separadas) -->
- [X] CHK008 A diferença entre domínio divergente (token) e papel divergente (requireRole) está clara nos artefatos? [Clarity, Spec §Clarifications Q2] <!-- Evaluator: Covered by spec.md §Clarifications Q2 + plan.md AD-003 + §Error Handling Strategy (token isolation vs requireRole) -->

## Consistency

- [X] CHK009 Os nomes de papel (admin, gestor, prestador, system_admin) aparecem iguais entre spec e plano? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US1/FR-003 e plan.md AD-001/AD-003 (mesmos papéis) -->
- [X] CHK010 A decisão de não ligar `scopeDomain()` é coerente entre spec, plano e código existente? [Consistency, Spec §Clarifications Q2] <!-- Evaluator: Covered by spec.md §Clarifications Q2, plan.md AD-003 e backend/src/routes/dashboard.js:134 (sem scopeDomain; usa req.user.domainId) -->

## Measurability

- [X] CHK011 A recusa para system_admin tem teste nomeado para o requisito que a declara? [Measurability, Spec §Requirements FR-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-003 → backend/src/routes/dashboard.test.js) + §Requirement Coverage Map -->
- [X] CHK012 A visão restrita do prestador tem teste nomeado? [Measurability, Spec §Requirements FR-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-002 → backend/src/routes/dashboard.test.js) + §Requirement Coverage Map (getDomainMetrics() prestador branch) -->
- [X] CHK013 A visão completa de admin/gestor tem teste nomeado? [Measurability, Spec §Requirements FR-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001 → backend/src/routes/dashboard.test.js) -->

## Traceability

- [X] CHK014 Cada requisito de segurança da spec aponta para símbolo no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-001 → getDomainMetrics; FR-002 → prestador branch; FR-003 → requireRole/authenticateToken) -->
