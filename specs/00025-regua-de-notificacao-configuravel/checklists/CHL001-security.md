# Security Checklist: Régua de notificação configurável (00025)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as rotas declaram autenticação e papéis admin/gestor para escrita? [Completeness, Spec §FR-105] <!-- Evaluator: Covered by spec §FR-105 -->
- [X] CHK002 O escopo por domínio bloqueia acesso à régua de outro domínio antes de gravar? [Completeness, Spec §FR-105] <!-- Evaluator: Covered by spec §FR-105 -->
- [X] CHK003 A recusa para prestador e visitante é definida sem gravação parcial? [Completeness, Spec §FR-107] <!-- Evaluator: Covered by spec §FR-107 -->
- [X] CHK004 A consulta do painel restringe `rules` e `reminders` a admin/gestor? [Completeness, Spec §FR-112] <!-- Evaluator: Covered by spec §FR-112 -->

## Clarity

- [X] CHK005 Fica claro que nenhum canal novo entra na entrega? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec §Scope -->
- [X] CHK006 A ausência de nova dependência de segurança está declarada? [Clarity, Spec §Implementation Signals] <!-- Evaluator: Covered by spec §Implementation Signals -->

## Consistency

- [X] CHK007 As rotas repetem authenticateToken → scopeDomain → requireRole do padrão v2? [Consistency, Spec §FR-105] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map -->
- [X] CHK008 Os testes de aceite cobrem autenticação e papel com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
