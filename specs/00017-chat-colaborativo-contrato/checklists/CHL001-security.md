# Security Checklist: Chat colaborativo por contrato (00017)
**Created**: 2026-11-21 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 As rotas do chat declaram autenticação e papéis permitidos, com visitante fora? [Completeness, Spec §FR-053] <!-- Evaluator: Covered by spec §FR-053 e plan.md §API Surface (JWT admin/gestor/prestador; visitante 403) -->
- [X] CHK002 O vínculo ativo do prestador ao contrato é verificado antes de mensagens e cards? [Completeness, Spec §FR-053; FR-058] <!-- Evaluator: Covered by spec §FR-053 e research.md §Vínculo de prestador (contract_providers) -->
- [X] CHK003 A divergência de domínio é recusada por scopeDomain em toda a superfície nova? [Completeness, Spec §FR-053] <!-- Evaluator: Covered by plan.md §API Surface guard de contrato e §Error Handling -->
- [X] CHK004 A ação no card por terceiro tem resposta 403 declarada, sem escrita? [Completeness, Spec §FR-057] <!-- Evaluator: Covered by spec §FR-057 e STF-005 -->
- [X] CHK005 A validação de tipo/tamanho do anexo ocorre antes de disco e banco? [Completeness, Spec §FR-054] <!-- Evaluator: Covered by spec §FR-054 e research.md §Upload -->

## Clarity

- [X] CHK006 Fica claro que nenhum dado contratual sai do domínio na análise? [Clarity, Spec §FR-061] <!-- Evaluator: Covered by Clarifications Q1 e spec §Assumptions (extrator local) -->
- [X] CHK007 Fica claro que não há push externo nem chave nova? [Clarity, Spec §FR-063] <!-- Evaluator: Covered by Clarifications Q3 e spec §Excluded -->
- [X] CHK008 A diferença entre "ver cards" e "agir no card" está explícita por papel? [Clarity, Spec §FR-057; FR-058] <!-- Evaluator: Covered by Clarifications Q5 e spec §FR-058 -->

## Consistency

- [X] CHK009 O padrão de guards repete auth → requireRole → scopeDomain das rotas existentes? [Consistency, Spec §FR-053; research.md] <!-- Evaluator: Covered by research.md §Guardas e plan.md §API Surface -->
- [X] CHK010 A categoria `chat` não reaproveita `evidence`/`documentation` em nenhuma rota? [Consistency, Spec §FR-055] <!-- Evaluator: Covered by spec §FR-055 e STF-002 -->

## Testability

- [X] CHK011 Casos negativos de papel e domínio têm asserção observável (401/403/404)? [Testability, Spec §SC-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-053 -->
- [X] CHK012 A recusa de ação em tarefa alheia é mensurável por histórico intacto? [Testability, Spec §SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-057 -->
