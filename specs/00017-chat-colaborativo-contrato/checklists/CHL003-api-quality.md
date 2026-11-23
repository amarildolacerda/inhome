# API Quality Checklist: Chat colaborativo por contrato (00017)
**Created**: 2026-11-21 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK026 Os 8 endpoints do chat declaram método, caminho e finalidade? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by plan.md §API Surface Summary (8 operações) -->
- [X] CHK027 Payload de mensagem, de análise e de ação do card estão definidos? [Completeness, Spec §FR-051; FR-057; FR-059] <!-- Evaluator: Covered by plan.md §API Surface Summary (Req/Res) -->
- [X] CHK028 Os códigos 400/401/403/404 estão declarados por categoria de erro? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->
- [X] CHK029 As três opções do menu têm endpoint próprio e resposta de cards? [Completeness, Spec §FR-056] <!-- Evaluator: Covered by plan.md §API Surface (menu/alerts, upcoming, completed) -->
- [X] CHK030 O retry manual da análise tem rota declarada? [Completeness, Spec §FR-061] <!-- Evaluator: Covered by plan.md §API Surface (POST analysis/retry) -->

## Clarity

- [X] CHK031 A entrega em tempo real é melhor esforço, sem falhar o POST? [Clarity, Spec §FR-052] <!-- Evaluator: Covered by spec §FR-052 e plan.md §HINT-003 -->
- [X] CHK032 O filtro por contrato no cliente está explícito? [Clarity, Spec §FR-052] <!-- Evaluator: Covered by spec §FR-052 e STF-003 -->
- [X] CHK033 O formato do erro de ação de terceiro é inequívoco (403 sem escrita)? [Clarity, Spec §FR-057] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->

## Consistency

- [X] CHK034 Os caminhos usam o prefixo `/api/v2` e o parâmetro `contractId`? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Covered by plan.md §API Surface e server.js (rotas aninhadas) -->
- [X] CHK035 A convenção EN em payload e PT em mensagens de erro é mantida? [Consistency, Spec §FR-053] <!-- Evaluator: Covered by plan.md §Project Structure (Naming) -->
- [X] CHK036 "Ver alertas" usa o mesmo motor E004 do painel, sem segundo caminho? [Consistency, Spec §FR-060] <!-- Evaluator: Covered by spec §FR-060 e plan.md §API Surface (menu/alerts) -->

## Testability

- [X] CHK037 Histórico paginado tem limite verificável por `limit`/`offset`? [Testability, Spec §FR-051] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-051 -->
- [X] CHK038 A extração ligada à mensagem é verificável na resposta do chat? [Testability, Spec §SC-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-059 -->
