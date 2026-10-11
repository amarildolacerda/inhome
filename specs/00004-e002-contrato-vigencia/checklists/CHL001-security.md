# Security Checklist: Contrato e vigência (E002)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A recusa para `domainId` estrangeiro está declarada para toda a superfície de contrato, antes de qualquer consulta? [Completeness, Spec §Requirements FR-011] <!-- Evaluator: Covered by spec.md FR-011 ("antes de qualquer consulta, guarda de escopo ligado ao roteador") + §Clarifications Q2 + plan.md AD-003 + contracts/openapi.yaml §parameters.DomainId ("Explícito apenas para recusa... 403") -->
- [X] CHK002 A fronteira entre 401 (token ausente) e 403 (token inválido, domínio suspenso, papel sem permissão) está definida para as rotas de contrato? [Completeness, Spec §Requirements FR-010] <!-- Evaluator: Covered by spec.md FR-010 (403 sem token ou domínio suspenso) + US3 AS2 (401 ou 403) + plan.md §Error Handling Strategy + contracts/openapi.yaml §components.responses Unauthorized/Forbidden -->
- [X] CHK003 A autoridade de escrita por operação (criar, vincular, prorrogar e encerrar só admin e gestor; excluir só admin) está declarada? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001/FR-002/FR-003 (admin e gestor) + FR-004 (exclusão só admin) + contracts/openapi.yaml descrições de POST/PUT/prorrogar/encerrar/DELETE -->
- [X] CHK004 A visibilidade do prestador está limitada aos contratos vinculados, inclusive no detalhe? [Completeness, Spec §Requirements FR-012] <!-- Evaluator: Covered by spec.md FR-012 ("apenas os contratos vinculados a ele") + contracts/openapi.yaml §/api/contracts/{id} ("id não vinculado responde 404 sem revelar existência") -->
- [X] CHK005 O caso de domínio suspenso aparece como requisito de borda e não só como exclusão de escopo? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("Domínio suspenso... 403 antes de qualquer leitura ou escrita") + US3 AS2 + FR-010 -->
- [X] CHK006 A exigência de recusa antes de qualquer leitura ou escrita está escrita como ordem verificável, não como efeito colateral? [Completeness, Spec §Requirements FR-010] <!-- Evaluator: Covered by spec.md FR-010 ("403, antes de qualquer leitura ou escrita") + FR-011 ("antes de qualquer consulta") + plan.md HINT-001 (guarda antes do filtro) -->

## Clarity

- [X] CHK007 O parâmetro `domainId` é descrito como recusa explícita, sem criar aceitação nova de domínio? [Clarity, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q2 ("liga o guarda no roteador e recusa o estrangeiro com 403, sem novo parâmetro") + contracts/openapi.yaml §parameters.DomainId -->
- [X] CHK008 O destino de um contrato não vinculado ao prestador está distinto do destino de papel não habilitado? [Clarity, Spec §Requirements FR-012] <!-- Evaluator: Covered by spec.md FR-012 (não vinculado fica de fora) vs FR-010 (papel → 403) + plan.md §Error Handling (404 esconde existência, 403 papel) + contracts/openapi.yaml §NotFound vs §Forbidden -->
- [X] CHK009 A garantia de que nenhuma linha é lida aparece na exigência de recusa prévia e nos cenários de aceitação? [Clarity, Spec §User Scenarios US3] <!-- Evaluator: Covered by spec.md US3 AS1 ("403 e nenhuma linha é lida") + FR-011 ("antes de qualquer consulta") -->

## Consistency

- [X] CHK010 O significado de 401, 403 e 404 é o mesmo na tabela de erros do plano e nas respostas do contrato? [Consistency, Spec §Requirements FR-010] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (401/403 antes da consulta; 404 esconde existência) + contracts/openapi.yaml §components.responses (Unauthorized, Forbidden, NotFound com as mesmas semânticas) -->
- [X] CHK011 Os papéis (admin, gestor, prestador, system_admin) aparecem iguais entre spec, plano e contrato? [Consistency, Spec §Scope] <!-- Evaluator: Covered by spec.md §Scope Excluded ("matriz fechada por E001") + FR-001/FR-004/FR-010 + plan.md §API Surface Summary + contracts/openapi.yaml (mesmos papéis por operação) -->
- [X] CHK012 A semântica do status derivado (`vigente`, `atrasado`, `encerrado`) é idêntica entre spec, contrato e decisão de arquitetura? [Consistency, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (derivado; banco só vigente/encerrado) + plan.md AD-001 + contracts/openapi.yaml §Contract.status/db_status -->

## Measurability

- [X] CHK013 SC-003 é conferível sem instrumentação adicional: 403/401 observáveis e nenhum contrato de outro domínio listado? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 (403/401 antes de qualquer linha lida, sem contrato de outro domínio listado) -->
- [X] CHK014 Os requisitos de segurança têm teste nomeado exigido (stubs FR-010, FR-011 e FR-012)? [Measurability, Spec §Requirements FR-010] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-010/FR-011/FR-012 → backend/src/routes/contracts.test.js com test.todo nomeado pelo reqID) -->
- [X] CHK015 O conflito interno entre FR-010 e FR-012 está registrado como achado resolvido e não aberto? [Measurability, Spec §Stress-Test Findings] <!-- Evaluator: Covered by spec.md §Stress-Test Findings STF-001 (HIGH, resolvido: FR-010 restrito a escrita por papel indevido e a requisições sem token ou domínio suspenso; parser de achados sem marcador aberto) -->

## Coverage

- [X] CHK016 Todo caminho de escrita por papel não habilitado tem negação definida em cenário de aceitação? [Coverage, Spec §User Scenarios US1] <!-- Evaluator: Covered by spec.md US1 AS2 (criar, vincular, prorrogar ou encerrar → 403 sem efeito no banco) + FR-010 -->
- [X] CHK017 O caso de borda `domainId` estrangeiro tem requisito, cenário e teste de aceitação? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases + US3 AS1 + FR-011 + plan.md §Acceptance Test Stubs FR-011 -->
- [X] CHK018 A suspensão de domínio tem cenário de aceitação com status esperado? [Coverage, Spec §User Scenarios US3] <!-- Evaluator: Covered by spec.md US3 AS2 ("401 ou 403 e a listagem do outro domínio não aparece") + FR-010 -->
