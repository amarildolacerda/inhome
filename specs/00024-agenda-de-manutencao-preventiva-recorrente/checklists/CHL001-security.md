# Security Checklist: Agenda de manutenção preventiva recorrente (00024)
**Created**: 2026-11-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todas as rotas declaram autenticação e papéis admin/gestor para escrita? [Completeness, Spec §FR-092] <!-- Evaluator: Covered by spec §FR-092 -->
- [X] CHK002 O escopo por domínio bloqueia acesso a contrato alheio antes de qualquer gravação? [Completeness, Spec §FR-103] <!-- Evaluator: Covered by spec §FR-103 -->
- [X] CHK003 A recusa para prestador e visitante é definida sem gravar? [Completeness, Spec §US1] <!-- Evaluator: Covered by spec §US1 -->
- [X] CHK004 A autenticação do acionamento manual da varredura é explícita? [Completeness, Spec §FR-104] <!-- Evaluator: Covered by spec §FR-104 -->

## Clarity

- [X] CHK005 Fica claro que responsável opcional não amplia permissão de escrita? [Clarity, Spec §Clarifications] <!-- Evaluator: Covered by spec §Clarifications -->
- [X] CHK006 A ausência de nova dependência de segurança está declarada? [Clarity, Spec §Implementation Signals] <!-- Evaluator: Covered by spec §Implementation Signals -->

## Consistency

- [X] CHK007 As rotas repetem authenticateToken → scopeDomain → requireRole do padrão v2? [Consistency, Spec §FR-103] <!-- Evaluator: Covered by spec §FR-103 -->
- [X] CHK008 Os testes de aceite cobrem autenticação e papel com stubs nomeados? [Consistency, Spec §Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs -->
