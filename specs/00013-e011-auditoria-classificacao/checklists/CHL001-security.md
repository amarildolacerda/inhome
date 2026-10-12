# Security Checklist: Acesso de auditoria e classificação de tarefas executadas (00013)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A habilitação do papel `auditor` está declarada como dependente do CRUD de usuários existente, sem tela nova de papéis? [Completeness, Spec §Scope; Assumptions] <!-- Evaluator: Covered by spec.md Scope ("habilitável pelo admin no CRUD de usuários de E001") + Assumptions ("nenhuma tela nova de papéis") -->
- [X] CHK002 O escopo de leitura e escrita está declarado para os três papéis aceitos, com 403 explícito para `prestador`, `system_admin` e sessão sem papel? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("auditor, admin ou gestor (403 para prestador, system_admin e sessões sem papel)") + Scope Included -->
- [X] CHK003 O isolamento de domínio de E001 está declarado como obrigatório antes de qualquer consulta, cobrindo também domínio suspenso? [Completeness, Spec §FR-001; Edge Cases] <!-- Evaluator: Covered by spec.md FR-001 ("excluindo tarefas de outros domínios ou de domínio suspenso") + FR-006 ("isolamento de domínio de E001 antes de qualquer consulta") + Edge Cases ("403/404 antes de qualquer leitura") -->
- [X] CHK004 A invisibilidade da classificação para `prestador` está declarada como requisito, e não só como efeito de tela? [Completeness, Spec §FR-006; Clarifications] <!-- Evaluator: Covered by spec.md FR-006 ("classificação fica invisível para prestador") + Clarifications Q6 ("campo restrito a auditor, admin e gestor") -->
- [X] CHK005 A recusa de entrada inválida (estado fora dos três ou nota acima do limite) está declarada como 400 sem escrita, fechando abuso de payload? [Completeness, Spec §FR-002; Edge Cases] <!-- Evaluator: Covered by spec.md FR-002 ("400 sem escrita") + Edge Cases ("estado fora dos três ou nota acima de 500 caracteres: 400") -->
- [X] CHK006 O risco de permissão inflada está declarado com mitigação por `requireRole()` por rota e teste 403 por papel? [Completeness, Spec §Risks] <!-- Evaluator: Covered by spec.md Risks ("Papel com permissão inflada ... requireRole() por rota e teste 403 por papel") -->

## Clarity

- [X] CHK007 A distinção entre 403 (papel ou domínio), 404 (tarefa de outro domínio) e 400 (estado ou nota) é inequívoca sem sobreposição? [Clarity, Spec §Edge Cases; FR-002; FR-006] <!-- Evaluator: Covered by spec.md Edge Cases ("Outro domínio ou suspenso: 403/404"; "400") + FR-002 + FR-006 + plan.md Error Handling (404 outro domínio; 400 estado; 401/403 papel/domínio) -->
- [X] CHK008 Quem pode reclassificar (auditor ou gestor) está declarado de forma consistente com os papéis que leem a visão? [Clarity, Spec §US1; FR-006] <!-- Evaluator: Covered by spec.md US1 Acceptance Scenario 3 ("o auditor ou o gestor reclassificam") + FR-006 (papéis de leitura e escrita) -->

## Consistency

- [X] CHK009 Os papéis da navegação (auditor, admin, gestor) são os mesmos papéis aceitos pela API após a correção do conflito STF-001? [Consistency, Spec §FR-006; FR-007; STF-001] <!-- Evaluator: Covered by spec.md FR-007 ("auditor, admin e gestor, nunca para prestador ou system_admin") = FR-006 list; STF-001 records the contradiction found and resolved -->
- [X] CHK010 O caso "sessão sem papel" em SC-003 distingue `prestador` (403) dos papéis aceitos, sem contradição com FR-006? [Consistency, Spec §SC-003; STF-002] <!-- Evaluator: Covered by spec.md SC-003 ("prestador, system_admin ou sessão sem permissão ... 403") + STF-002 resolution normalizing US2/SC-003 -->
- [X] CHK011 A regra de não expor ação a papéis sem permissão na tela é consistente com o 403 da rota, sem barreira só visual? [Consistency, Spec §FR-007; SC-003] <!-- Evaluator: Covered by spec.md FR-007 ("sem expor ação a papéis sem permissão") + SC-003 ("nenhuma rota de auditoria responde além de 403 e nenhuma entrada aparece") — API guard declared independent of UI -->

## Testability

- [X] CHK012 O critério de isolamento é verificável com dois domínios populados e zero tarefas cruzadas na resposta? [Testability, Spec §SC-001] <!-- Evaluator: Covered by spec.md SC-001 ("zero de outros domínios com dois domínios populados") -->
