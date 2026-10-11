# API Quality Checklist: Execução de tarefas com evidência (00005)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Cada modo de falha listado nos casos-limite tem status de resposta declarado na estratégia de erros? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (6 linhas: 400 validação, 400 upload, 401/403 autoridade, 404 existência, 500 parcial, 200 image/*) pareadas aos 5 casos-limite de spec.md -->
- [X] CHK002 A recusa de conclusão sem texto está declarada sem efeito colateral algum? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("400 sem alterar status, evidência ou histórico") + US1 cenário 2 ("400 e nada muda no banco") -->
- [X] CHK003 A recusa de reabertura sem motivo está declarada antes de qualquer escrita? [Completeness, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 + §Edge Cases "Reabertura sem motivo: 400 antes de qualquer escrita" + US2 cenário 2 -->
- [X] CHK004 A pré-condição de status da conclusão está declarada? [Completeness, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US1 cenário 1 ("Given tarefa em `Revisão`") + FR-001 (fluxo até `Concluída`) -->
- [X] CHK005 A pré-condição de status da reabertura está declarada? [Completeness, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US2 cenário 1 ("Given tarefa concluída") + FR-006 -->
- [X] CHK006 A resposta para tarefa inexistente ou alheia está declarada nos artefatos de planejamento? [Completeness, Spec §Requirements FR-011] <!-- Evaluator: Covered by plan.md §Error Handling Strategy ("Tarefa inexistente ou alheia ao prestador → 404") + spec.md FR-011 ("sem expor tarefas de terceiros") -->
- [X] CHK007 O limite de fotos por conclusão está declarado como regra da API? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("até 10 fotos opcionais na conclusão") -->
- [X] CHK008 Os papéis por operação de tarefa estão declarados (conclusão, reabertura, comentários e anexos)? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 (só prestador vinculado conclui), FR-006 (admin ou gestor reabre, amendado em CHL001-CHK005) e FR-004 (comentário/anexo com autor) -->

## Clarity

- [X] CHK009 A fronteira entre 400 (validação), 403 (autoridade ou escopo) e 404 (existência) é distinta nos artefatos? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (quatro linhas separadas) + spec.md FR-002/FR-005 (400), FR-010/FR-001 (403), FR-011 (404 implícito em "sem expor") -->
- [X] CHK010 O corpo de erro é uniforme para as recusas declaradas? [Clarity, Spec §Requirements FR-002] <!-- Evaluator: Covered by plan.md §Error Handling Strategy (coluna Resposta: `400/401/403/404/500 + {error}`) -->
- [X] CHK011 O escopo do prefixo de proxy está declarado com a barra final? [Clarity, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 (`location ^~ /uploads/`) e §Implementation Signals, ambos com `/uploads/` -->
- [X] CHK012 O que a conclusão exige e o que é opcional está distinto sem ambiguidade? [Clarity, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("texto não vazio" obrigatório) vs FR-003 ("fotos opcionais") + §Problem Statement -->

## Consistency

- [X] CHK013 Os caminhos citados na spec batem com as linhas de cobertura do plano? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007/FR-008 = plan.md §Requirement Coverage Map (frontend/nginx.conf, backend/src/server.js, backend/test-uploads-proxy.sh) -->
- [X] CHK014 O destino da reabertura é coerente entre spec e implementação sem contradição? [Consistency, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("devolver a tarefa ao fluxo") + backend/src/routes/tasks.js:351 (status 'Em Progresso', sem contradição) -->
- [X] CHK015 Os status do fluxo listados na spec são os mesmos do modelo de tarefa? [Consistency, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 = backend/src/models/Task.js:3 (FLOW = A Fazer, Em Progresso, Revisão, Concluída) -->

## Measurability

- [X] CHK016 Todo requisito P1 tem stub de aceitação com bloco que nomeia o reqID? [Measurability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (11 linhas FR-001..FR-011, test.todo com reqID) -->
- [X] CHK017 O critério de que nenhuma conclusão sem texto passa é conferível por teste nomeado? [Measurability, Spec §Success Criteria SC-001] <!-- Evaluator: Covered by spec.md SC-001 + stub FR-002 (backend/src/routes/tasks.test.js) -->
- [X] CHK018 O proxy tem asserção de que a resposta nunca é HTML de página? [Measurability, Spec §Requirements FR-008] <!-- Evaluator: Covered by spec.md FR-008 ("nunca o `index.html` do SPA") + plan.md AD-003 e stub FR-008 (check_http_image) -->

## Coverage

- [X] CHK019 A recusa de upload inválido cobre os dois critérios declarados, tipo e tamanho? [Coverage, Spec §Requirements FR-009] <!-- Evaluator: Covered by spec.md FR-009 ("tipo ou tamanho fora do padrão") + §Edge Cases + plan.md §Error Handling Strategy (validação antes da gravação) -->

## Traceability

- [X] CHK020 Cada requisito da spec tem linha de cobertura com caminho e símbolo no plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (11 de 11 FR com File Path(s) e Function(s)/Symbol(s); gate `evaluatePlanGate` PASS) -->
