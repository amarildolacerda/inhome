# Security Checklist: Workflow Assistido por OpenCode (00003)
**Created**: 2026-10-06 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O isolamento por domínio está declarado para toda rota nova, com o domínio vindo só do JWT e nunca de params, query ou body? [Completeness, Spec §Requirements FR-019] <!-- Evaluator: Covered by spec.md FR-019 + plan.md §Requirement Coverage Map (requireRole(), scopeDomain(), getDomainDb()) + openapi.yaml §info "O domínio nunca é aceito de params, query ou body" -->
- [X] CHK002 A fronteira entre 401 (token ausente) e 403 (token inválido, domínio suspenso ou papel não autorizado) está definida para toda a superfície? [Completeness, Spec §Requirements FR-019] <!-- Evaluator: Covered by openapi.yaml §info "Erros" + §components.responses Unauthorized/Forbidden + plan.md §Error Handling Strategy (Domínio/papel errado → 403/404 genérico) -->
- [X] CHK003 A resposta para recurso inexistente ou de outro domínio está definida como 404 genérico, sem revelar existência? [Completeness, Spec §Requirements FR-019] <!-- Evaluator: Covered by openapi.yaml §info (404 para inexistente ou de outro domínio) + descrições de GET das seções Definitions/Analysis/Review + plan.md §Error Handling Strategy -->
- [X] CHK004 A autoridade por operação (gestor gera, aprova e aplica; admin e gestor editam definições; prestador só lê) está declarada na spec e reproduzida no contrato? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q1 + FR-002/FR-007/FR-013 + openapi.yaml x-roles (geração, aprovação e revisão = [gestor]; definições = [admin, gestor]; workflow = os três papéis) -->
- [X] CHK005 A lista fechada do contexto enviado ao OpenCode (6 definições, identificação e vigência) está declarada sem partes, CNPJ, valores ou contatos? [Completeness, Spec §Requirements FR-020] <!-- Evaluator: Covered by spec.md FR-020 + FR-004 + data-model.md §Validation rules (payload de cliente não é persistido nem enviado) -->
- [X] CHK006 O risco de definições sensíveis enviadas ao OpenCode está registrado com mitigação nomeada no plano? [Completeness, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks (likelihood medium, impact high → allowlist no servidor) + plan.md §Risk Mitigation (services/opencode.js) -->
- [X] CHK007 A ausência de limite de chamadas da geração está declarada como premissa, em vez de ficar implícita? [Completeness, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Assumptions "OpenCode via CLI local, assíncrono com timeout e retry, sem limite nesta release" -->
- [X] CHK008 O refino de sugestão (FR-008) envia as instruções livres do gestor ao OpenCode, ou elas ficam fora do payload de servidor exigido pela allowlist de FR-004/FR-020? [Completeness, Spec §Requirements FR-008] <!-- Evaluator: RESOLVED 2026-10-06 — decisão do produto: as instruções livres do gestor vão ao OpenCode como instrução do usuário; a allowlist de FR-004/FR-020 continua governando os dados de contexto do contrato (partes, CNPJ e valores seguem bloqueados); persistência em task_suggestions.refine_instructions -->

## Clarity

- [X] CHK009 O corpo do disparo de análise e de revisão é isento de campos livres do cliente, conforme a regra de payload montado no servidor? [Clarity, Spec §Requirements FR-004] <!-- Evaluator: Resolved — removido `instrucoes` de AnalysisInput, ReviewInput e TaskSuggestion em contracts/openapi.yaml (FR-004/FR-020; data-model.md não possui coluna correspondente) -->
- [X] CHK010 O limite do que sai do sistema está escrito como lista fechada e não como exemplos? [Clarity, Spec §Requirements FR-020] <!-- Evaluator: Covered by spec.md FR-020 (6 definições + identificação + vigência, com exclusões explícitas) + openapi.yaml §OpencodeConfig.context_allowlist (example com os 8 campos) -->
- [X] CHK011 A entrada na sala Socket.io está descrita como validada pelo mesmo JWT do handshake, sem regra paralela? [Clarity, Spec §Requirements FR-012] <!-- Evaluator: Covered by openapi.yaml §securitySchemes.bearerAuth ("A sala Socket.io usa o mesmo JWT no handshake e entra em domain_<domainId> validado pelo token") + §x-socket-events -->
- [X] CHK012 O retry é declarado como manual e exclusivo, sem nenhuma retentativa automática? [Clarity, Spec §Requirements FR-018] <!-- Evaluator: Covered by spec.md FR-018 ("sem retry automático") + openapi.yaml §info + data-model.md §State Machines (falha → pendente por retry manual) -->
- [X] CHK013 O estado de falha é descrito pelo efeito observável (definições preservadas, retry liberado) e não só pelo erro interno? [Clarity, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 + openapi.yaml §getAnalysisState (`error` explica, definições preservadas, retry liberado) -->

## Consistency

- [X] CHK014 Os nomes de papel (admin, gestor, prestador) aparecem iguais entre spec, plano e contrato? [Consistency, Spec §Clarifications] <!-- Evaluator: Covered by spec.md FR-002/FR-007/FR-013 + plan.md §API Surface Summary + openapi.yaml x-roles (mesmos três papéis em todos os artefatos) -->
- [X] CHK015 A autoridade para editar a configuração da integração no contrato coincide com a clarificação "admin só edita definições"? [Consistency, Spec §Clarifications] <!-- Evaluator: Resolved — contracts/openapi.yaml: PUT /api/opencode/config x-roles [admin, gestor] → [gestor], com §info e descrição da operação alinhados à clarificação Q1 -->
- [X] CHK016 O significado de 401, 403 e 404 é o mesmo na tabela de erros do plano e nas respostas do contrato? [Consistency, Spec §Requirements FR-019] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (403/404 genérico) + openapi.yaml §info "Erros" e §components.responses (401 token ausente; 403 inválido/suspenso/papel; 404 outro domínio) -->
- [X] CHK017 Os campos da allowlist aparecem idênticos no requisito, no exemplo de configuração e na descrição do disparo? [Consistency, Spec §Requirements FR-020] <!-- Evaluator: Covered by spec.md FR-004/FR-020 + openapi.yaml §OpencodeConfig.context_allowlist (finalidade, limitacoes, alvo, escopo, premissas, entregaveis, identificacao, vigencia) + §startAnalysis -->

## Measurability

- [X] CHK018 O isolamento de domínio tem teste nomeado exigido para FR-019, e não só menção genérica? [Measurability, Spec §Requirements FR-019] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-019 → backend/src/routes/definitions.test.js, test.todo('FR-019 isolamento')) -->
- [X] CHK019 A meta de 30 s (SC-002) e o timeout de 60 s (FR-018) aparecem como valores distintos e conferíveis? [Measurability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by spec.md SC-002 (30 s meta) + FR-018 (60 s padrão) + openapi.yaml §OpencodeConfig.timeout_ms (30000 ms meta de UX, não configurável) -->
- [X] CHK020 A autoridade só gestor é observável como recusa 403 para admin e prestador nas operações sensíveis? [Measurability, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 + openapi.yaml §approveSuggestion e §updateSuggestionItem ("admin e prestador recebem 403") -->
- [X] CHK021 A garantia de que nenhuma falha apaga definições é verificável por recarga do recurso? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 (retry disponível na hora, falha não apaga) + openapi.yaml §retryAnalysis ("definições nunca são apagadas pela falha") -->

## Coverage

- [X] CHK022 Cada papel não autorizado tem caminho de negação definido nas operações de geração e aprovação? [Coverage, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 + FR-013 + openapi.yaml x-roles [gestor] em startAnalysis/approveSuggestion com resposta 403 -->
- [X] CHK023 Os modos de falha da integração (timeout, crash, resposta vazia ou não interpretável) têm estado definido? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (falha do OpenCode, inclusive resposta vazia) + FR-006 + plan.md AD-002 (pendente→analisando→sugerido|falha) -->
- [X] CHK024 O estado de domínio suspenso está coberto para as rotas novas, com recusa declarada? [Coverage, Spec §Requirements FR-019] <!-- Evaluator: Covered by openapi.yaml §components.responses/Forbidden ("Domain suspended") em todas as operações + guarda herdado de E001 (requireRole/scopeDomain, plan.md §Requirement Coverage Map FR-019) -->
- [X] CHK025 As entradas livres de texto têm limite de tamanho declarado e montagem só no servidor? [Coverage, Spec §Requirements FR-001] <!-- Evaluator: Covered by openapi.yaml §DefinitionInput (minLength 1, maxLength 5000 nas 6 definições) + spec.md FR-004 (payload montado no servidor) -->
- [X] CHK026 Exige-se parâmetro vinculado nas consultas sobre entradas livres, sem concatenação de SQL? [Coverage, Spec §Requirements FR-019] <!-- Evaluator: Resolved — data-model.md §Convenções (+ consultas sobre entradas livres por parâmetros vinculados, sem concatenação de SQL) -->

## Traceability

- [X] CHK027 Os requisitos de segurança (FR-004, FR-019, FR-020) apontam para símbolos no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-004 → buildContext(); FR-019 → requireRole(), scopeDomain(), getDomainDb(); FR-020 → buildContext() allowlist) -->
- [X] CHK028 Cada risco de segurança da spec tem mitigação com dono nomeado no plano? [Traceability, Spec §Assumptions & Risks] <!-- Evaluator: Covered by plan.md §Risk Mitigation (allowlist → services/opencode.js; aprovação humana → routes/suggestions.js), pareados aos dois riscos de spec.md §Risks -->
- [X] CHK029 O critério SC-003 remete ao requisito que o produz? [Traceability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 [US2] ligada a FR-006/FR-018 (falha preserva definições, retry manual) -->

## Evaluation Summary

| Verdict | Count |
|---|---|
| PASS | 25 |
| RESOLVED | 4 |
| ASK | 0 |
| **Total** | **29** |

- **PASS**: CHK001–CHK007, CHK010–CHK014, CHK016–CHK025, CHK027–CHK029
- **RESOLVED**: CHK008, CHK009, CHK015, CHK026
- **ASK**: nenhum — CHK008 resolvido pelo produto em 2026-10-06 (instruções do gestor vão ao OpenCode como instrução do usuário; allowlist de FR-004/FR-020 segue valendo para os dados de contexto; coluna `refine_instructions` adicionada a `task_suggestions`)
- **Artefatos amendados**: `contracts/openapi.yaml` (removido `instrucoes` de AnalysisInput, ReviewInput e TaskSuggestion; PUT /api/opencode/config `x-roles` [admin, gestor] → [gestor]; §info sem a cláusula de configuração para admin), `data-model.md` (cláusula de parâmetros vinculados em §Convenções)
