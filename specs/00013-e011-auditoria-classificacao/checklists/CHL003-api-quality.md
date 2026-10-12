# API Quality Checklist: Acesso de auditoria e classificação de tarefas executadas (00013)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Cada endpoint novo está declarado com método, caminho e propósito, sem superfície órfã fora do contrato? [Completeness, Spec §Signals; plan.md API Surface] <!-- Evaluator: Covered by spec.md Signals [NEW-API] + plan.md API Surface (GET/GET/PUT com propósito) + contracts/openapi.yaml (3 paths) -->
- [X] CHK002 Os modos de falha da escrita estão declarados para os quatro códigos esperados — 400 (estado ou nota), 401 (sem sessão), 403 (papel ou domínio) e 404 (tarefa de outro domínio)? [Completeness, Spec §Edge Cases; FR-002; FR-006] <!-- Evaluator: Covered by spec.md Edge Cases ("400"; "403/404 antes de qualquer leitura") + FR-002 + FR-006 ("sessões sem papel" → 403) + plan.md Error Handling ("401/403 antes de consulta") + contracts/openapi.yaml 401 "Sem token" -->
- [X] CHK003 O conteúdo da resposta de classificação está declarado (estado, nota, autor e data legíveis na visão)? [Completeness, Spec §US1; Key Entities] <!-- Evaluator: Covered by spec.md US1 Acceptance Scenario 2 ("estado, nota, autor e data ficam registrados e legíveis") + Key Entities -->
- [X] CHK004 O escopo da listagem está declarado como tarefas executadas do domínio, sem filtro, busca ou paginação nesta release? [Completeness, Spec §FR-001; Excluded] <!-- Evaluator: Covered by spec.md FR-001 (executadas do domínio do token) + Excluded ("Relatório e filtros de classificação — E008 e E007 inalterados") -->
- [X] CHK005 A semântica da escrita está declarada como gravação imediata e idempotente por tarefa, sem estado pendente ou aprovação? [Completeness, Spec §FR-004; Clarifications] <!-- Evaluator: Covered by spec.md FR-004 ("de forma imediata e sem aprovação") + Clarifications Q4 ("gravação imediata, sem estado pendente") + FR-003 (registro único por tarefa) -->
- [X] CHK006 A não alteração das rotas de tarefa existentes está declarada — leitura e escrita novas sob caminho próprio? [Completeness, Spec §Scope; plan.md AD-001] <!-- Evaluator: Covered by spec.md Scope ("sem alterar tasks/task_history") + plan.md AD-001 (namespace novo /api/audits/*, rotas E003 intactas) -->

## Clarity

- [X] CHK007 Os papéis permitidos estão declarados por rota, sem herança implícita de outra rota? [Clarity, Spec §FR-006; plan.md API Surface] <!-- Evaluator: Covered by spec.md FR-006 (papéis exigidos por leitura e escrita) + plan.md API Surface (coluna Auth por linha de endpoint) -->
- [X] CHK008 A semântica do detalhe está clara — agrega histórico e anexos de E003 na leitura, sem gerar novo evento? [Clarity, Spec §FR-001; Assumptions] <!-- Evaluator: Covered by spec.md FR-001 ("com histórico e anexos") + Assumptions ("classificação é dado adjunto, sem novo evento") + plan.md AD-004 (agregação na rota de auditoria) -->

## Consistency

- [X] CHK009 Contrato e requisito concordam nos três literais de estado e no limite de 500 caracteres, sem divergência de enum? [Consistency, Spec §FR-002; plan.md AD-003] <!-- Evaluator: Covered by spec.md FR-002 (três literais, 500) = contracts/openapi.yaml enum + maxLength 500 = plan.md AD-003 -->
- [X] CHK010 O formato de erro é o mesmo `{ error }` usado pelas demais rotas do produto? [Consistency, Spec §Edge Cases; plan.md Error Handling] <!-- Evaluator: Covered by plan.md Error Handling (corpo `{error}`) + contracts/openapi.yaml ("Erros: corpo { \"error\": \"...\" } em todos os códigos") + spec.md Edge Cases (códigos por modo) -->
- [X] CHK011 A separação de namespace nova é consistente com a decisão de não estender as rotas de tarefa de E003? [Consistency, Spec §Signals; plan.md AD-001; AD-004] <!-- Evaluator: Covered by spec.md Signals [NEW-API] + plan.md AD-001 and AD-004 (namespace próprio, agregação própria, guards de E003 intactos) -->

## Testability

- [X] CHK012 Cada requisito P1 de API tem um stub de teste distinto com arquivo e cenário declarados? [Testability, Spec §FR-001; plan.md Acceptance Test Stubs] <!-- Evaluator: Covered by plan.md Acceptance Test Stubs (7 linhas FR-001..FR-007 com arquivo e cenário) + spec.md FR-001 (P1) -->
