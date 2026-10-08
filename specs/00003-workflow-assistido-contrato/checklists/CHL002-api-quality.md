# API Quality Checklist: Workflow Assistido por OpenCode (00003)
**Created**: 2026-10-06 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Toda operação declara autenticação, papéis aceitos (x-roles) e os requisitos que satisfaz (x-fr)? [Completeness, Spec §Requirements FR-019] <!-- Evaluator: Covered by openapi.yaml (23 operationId, 23 x-roles, 23 x-fr; `security: bearerAuth` global) conferido por contagem no contrato -->
- [X] CHK002 As operações assíncronas (análise, retry, revisão, retry de revisão, plano e regeneração) declaram 202 com header Location para polling? [Completeness, Spec §Requirements FR-018] <!-- Evaluator: Covered by openapi.yaml §startAnalysis, §retryAnalysis, §startReview, §retryReview, §requestExecutionPlan, §regenerateExecutionPlan (todas 202 + Location) -->
- [X] CHK003 Cada modo de falha da spec está mapeado para um status de resposta no contrato? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (400, falha, conflito 200, 403/404) + openapi.yaml respostas 400/403/404/409/500 por operação; timeout/crash vira `falha` consultável via GET -->
- [X] CHK004 O corpo de erro é definido para todo código de erro, com `missing`/`details` onde a spec exige informar o que falta? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 + openapi.yaml §components.responses (Error/BadRequestError com `missing` e `details`) + §info "Erros: corpo { error } em todos os códigos" -->
- [X] CHK005 Consultas feitas antes de o recurso existir têm resposta definida (404, lista vazia ou null)? [Completeness, Spec §Requirements FR-021] <!-- Evaluator: Covered by openapi.yaml §getAnalysisState (404 sem análise), §getWorkflow (`workflow: null`), §getExecutionPlan (`plan: null`), §listSuggestions/§listReviews/§getDefinitionHistory (lista vazia) -->
- [X] CHK006 Toda operação dependente de estado declara 409 para execução repetida ou estado incompatível? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by openapi.yaml 409 em §startAnalysis (job em andamento), §retryAnalysis, §updateSuggestionItem, §refineSuggestion, §approveSuggestion, §optInManualTask, §startReview, §retryReview, §applyReview, §requestExecutionPlan, §regenerateExecutionPlan -->
- [X] CHK007 Os endpoints de listagem declaram ordenação e escopo por contrato? [Completeness, Spec §Requirements FR-017] <!-- Evaluator: Covered by openapi.yaml §getDefinitionHistory, §listSuggestions, §listReviews ("mais recente primeiro", escopo do contrato do caminho) -->
- [X] CHK008 O contrato declara paginação ou o limite deliberado das listagens desta release? [Completeness, Spec §Scope] <!-- Evaluator: Resolved — contracts/openapi.yaml §info (+ parágrafo: listagens completas por contrato, ordenadas, sem paginação nesta release) -->

## Clarity

- [X] CHK009 O fluxo de acompanhamento (202 → Location → GET em polling, com evento de domínio complementando) está descrito sem ambiguidade? [Clarity, Spec §Requirements FR-021] <!-- Evaluator: Covered by openapi.yaml §info ("POST responde 202 com header Location... cliente faz polling no GET indicado... anunciadas na sala Socket.io") + spec.md FR-021 -->
- [X] CHK010 A distinção entre 400 (payload ou regra de negócio) e 409 (estado atual incompatível) está explícita? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by openapi.yaml §components.responses BadRequest (payload inválido ou regra de negócio) vs Conflict (estado atual não permite a operação) + plan.md §Error Handling Strategy -->
- [X] CHK011 A flag `in_workflow` tem significado definido, inclusive como marcador do opt-in do gestor? [Clarity, Spec §Requirements FR-010] <!-- Evaluator: Covered by openapi.yaml §WorkflowTask.in_workflow ("true quando a tarefa está na lista aprovada (ou após opt-in)") + §optInManualTask -->
- [X] CHK012 Em `sugerido` o contrato garante os itens com justificativa por item, e não só a contagem? [Clarity, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 + openapi.yaml §getAnalysisState ("Em `sugerido` devolve os itens com justificativa por item") -->
- [X] CHK013 O caminho de nível superior `/api/suggestions/{sid}` tem justificativa declarada em vez de exceção silenciosa? [Clarity, Spec §Requirements FR-007] <!-- Evaluator: Covered by openapi.yaml §getSuggestion ("O caminho é top-level conforme o plano (/api/suggestions/:sid); o contrato do item é resolvido pelo domínio do token") -->

## Consistency

- [X] CHK014 Os caminhos da superfície de API do plano coincidem com os caminhos do contrato? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Resolved — plan.md §API Surface Summary (+ linha GET/PUT /api/opencode/config, ausente antes; contrato tem 23 operações nos grupos já listados) -->
- [X] CHK015 Os papéis declarados por endpoint no plano coincidem com o x-roles do contrato? [Consistency, Spec §Clarifications] <!-- Evaluator: Resolved — plan.md §API Surface Summary (linha execution-plan: "GET gestor,prestador; POST gestor"; linha config: "GET admin,gestor; PUT gestor") alinhada ao x-roles de openapi.yaml e à clarificação Q1 -->
- [X] CHK016 A máquina de estados da análise é idêntica no contrato, no AD-002 e no modelo de dados? [Consistency, Spec §Requirements FR-006] <!-- Evaluator: Covered by openapi.yaml §info (`pendente → analisando → sugerido | falha`, `aprovada` após aprovação) = plan.md AD-002 = data-model.md §State Machines -->
- [X] CHK017 O refino síncrono (201) está distinguido das operações assíncronas da integração (202), sem contradição com FR-018? [Consistency, Spec §Requirements FR-018] <!-- Evaluator: Covered by openapi.yaml §refineSuggestion (201) vs operações de geração (202 + Location); FR-018 é [US2] (análise) e data-model.md mostra o refino como nova linha direta, fora do job -->
- [X] CHK018 O plano deixa de marcar `data-model.md` e `contracts/` como desatualizados quando já cobrem sugestões, versões, planos e job? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Resolved — plan.md linha de nota técnica reescrita para "`data-model.md`/`contracts/` atualizados pós-Plan (sugestões, versões, planos, job)" -->

## Measurability

- [X] CHK019 A meta de 30 s e o timeout de 60 s aparecem como valores distintos no contrato? [Measurability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by openapi.yaml §OpencodeConfig.timeout_ms (padrão 60000; 30000 ms é meta de UX, não configurável) + spec.md SC-002/FR-018 -->
- [X] CHK020 O resultado da aplicação de revisão é contável (edições, criações e conflitos separados)? [Measurability, Spec §Success Criteria SC-008] <!-- Evaluator: Covered by openapi.yaml §ReviewApplyResult (`applied.edited`, `applied.created`, `conflicts[]`) + spec.md SC-008 -->
- [X] CHK021 A aceitação da geração é observável por um nome de header concreto? [Measurability, Spec §Requirements FR-021] <!-- Evaluator: Covered by openapi.yaml headers Location declaradas nas seis operações 202 -->
- [X] CHK022 A observabilidade do evento está presa a nome de evento e sala concretos? [Measurability, Spec §Success Criteria SC-005] <!-- Evaluator: Covered by openapi.yaml §x-socket-events (`workflow_activated`, `analysis_state` na sala `domain_<domainId>`) + spec.md SC-005/FR-012 -->

## Coverage

- [X] CHK023 Os eventos realtime declaram payload, sala e operações emissoras? [Coverage, Spec §Requirements FR-012] <!-- Evaluator: Covered by openapi.yaml §x-socket-events (3 eventos com schema, room, emittedBy e fr) + §WorkflowEvent/§AnalysisStateEvent/§TaskUpdatedEvent -->
- [X] CHK024 Os 24 requisitos funcionais aparecem em pelo menos uma operação via x-fr? [Coverage, Spec §Requirements] <!-- Evaluator: Covered by openapi.yaml: FR-001..FR-024 todos presentes nas listas x-fr das 23 operações (contagem conferida no contrato) -->
- [X] CHK025 O comportamento para chamada repetida de POST (409, um único workflow ativo) está declarado? [Coverage, Spec §Requirements FR-010] <!-- Evaluator: Covered by openapi.yaml §approveSuggestion (estado ≠ sugerido → 409), §startAnalysis (job em andamento → 409), §optInManualTask (já optada → 409) + data-model.md (UNIQUE parcial `ativo` por contrato) -->
- [X] CHK026 Os campos de texto livre do contrato têm limites de tamanho declarados? [Coverage, Spec §Requirements FR-001] <!-- Evaluator: Covered by openapi.yaml §DefinitionInput (minLength 1, maxLength 5000), §RefineInput, §SuggestionItemInput (maxLength 5000) e Description dos campos -->
- [X] CHK027 As operações sensíveis declaram a negação 403 para papéis fora de x-roles? [Coverage, Spec §Requirements FR-007] <!-- Evaluator: Covered by openapi.yaml resposta 403 em §approveSuggestion, §updateSuggestionItem, §refineSuggestion, §startAnalysis, §applyReview, §updateOpencodeConfig, com §components.responses/Forbidden -->

## Traceability

- [X] CHK028 Todo valor de x-fr existe na lista de requisitos da spec? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by openapi.yaml: todos os x-fr ∈ {FR-001..FR-024} de spec.md §Requirements -->
- [X] CHK029 Os blocos de aceitação do plano referenciam os mesmos FRs que as operações do contrato? [Traceability, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001..FR-016, FR-018..FR-021 com arquivo e nome de teste) ⊆ x-fr do contrato -->
- [X] CHK030 As declarações de evento carregam a referência de FR que as produz? [Traceability, Spec §Requirements FR-012] <!-- Evaluator: Covered by openapi.yaml §x-socket-events com `fr: [FR-012]`, `fr: [FR-021]` e `fr: [FR-023]` -->

## Evaluation Summary

| Verdict | Count |
|---|---|
| PASS | 26 |
| RESOLVED | 4 |
| ASK | 0 |
| **Total** | **30** |

- **PASS**: CHK001–CHK007, CHK009–CHK013, CHK016–CHK017, CHK019–CHK030
- **RESOLVED**: CHK008, CHK014, CHK015, CHK018
- **ASK**: nenhum
- **Artefatos amendados**: `contracts/openapi.yaml` (§info com o parágrafo de limites das listagens), `plan.md` (linha GET/PUT `/api/opencode/config` na §API Surface Summary, papéis da linha `execution-plan` corrigidos para GET gestor,prestador / POST gestor, nota de artefatos desatualizados reescrita como atualizados)
