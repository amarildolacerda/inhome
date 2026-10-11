# Security Checklist: Execução de tarefas com evidência (00005)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A aceitação de `/uploads` sem token está declarada com a data de revisão fixada? [Completeness, Spec §Excluded] <!-- Evaluator: Covered by spec.md §Excluded "decisão Q4 aceita nesta release, revisão em 2026-12-26" + §Edge Cases (URL sem token acessível; revisão em 2026-12-26) -->
- [X] CHK002 A recusa 403 para `domainId` estrangeiro está declarada para tarefa, comentário e anexo? [Completeness, Spec §Requirements FR-010] <!-- Evaluator: Covered by spec.md FR-010 ("tarefa, comentário ou anexo de outro domínio ... com o guarda de escopo ligado nos três roteadores") + plan.md AD-002/Requirement Coverage Map (router.use(scopeDomain())) -->
- [X] CHK003 O estado de domínio suspenso tem recusa declarada antes de qualquer leitura ou escrita? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases "Evidência em domínio suspenso ou de outro domínio: 403" + FR-010 ("antes de qualquer leitura ou escrita") -->
- [X] CHK004 A autoridade de conclusão (somente o prestador vinculado) está declarada como requisito? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 ("aceitando a conclusão só do prestador vinculado (admin e gestor recebem 403)") -->
- [X] CHK005 A autoridade de reabertura está declarada com o papel que pode executá-la? [Completeness, Spec §Requirements FR-005] <!-- Evaluator: Resolved — spec.md FR-006 amendada para "quando reaberta por admin ou gestor"; a autoridade existia só na User Story 2 e não no requisito -->
- [X] CHK006 A restrição do prestador às próprias tarefas está declarada, inclusive na leitura? [Completeness, Spec §Requirements FR-011] <!-- Evaluator: Covered by spec.md FR-011 ("restrito às próprias tarefas na leitura, sem expor tarefas de terceiros") + US4 cenário 2 -->
- [X] CHK007 A recusa de upload inválido sem gravação de arquivo nem registro está declarada? [Completeness, Spec §Requirements FR-009] <!-- Evaluator: Covered by spec.md FR-009 + §Edge Cases "400 e nada é gravado, nem arquivo nem registro" -->
- [X] CHK008 A ausência de autenticação em `/uploads` e a ausência de proteção por token estão declaradas como decisão aceita, não como omissão? [Completeness, Spec §Scope] <!-- Evaluator: Covered by spec.md §Excluded ("Proteção de `/uploads` por token — decisão Q4 aceita nesta release") + §Assumptions (nomes opacos impedem enumeração) -->

## Clarity

- [X] CHK009 A fronteira entre recusa por token (401) e recusa por papel ou domínio (403) está definida nos artefatos? [Clarity, Spec §Requirements FR-010] <!-- Evaluator: Covered by plan.md §Error Handling Strategy ("401/403 antes da consulta") + spec.md FR-010/FR-001; 401 sem token vem do guarda de E001 citado na baseline do specs/sad.md -->
- [X] CHK010 O nome opaco de arquivo aparece como controle de enumeração declarado e não como detalhe de implementação? [Clarity, Spec §Assumptions] <!-- Evaluator: Covered by spec.md §Assumptions ("Nomes opacos gerados no upload seguem impedindo enumeração enquanto `/uploads` ficar sem token") -->
- [X] CHK011 O prazo de revisão da superfície sem token aparece datado em todos os lugares em que é citado? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Excluded e §Edge Cases, ambos com "revisão em 2026-12-26"; plan.md §Risk Mitigation repete a data -->
- [X] CHK012 A autoridade de conclusão distingue o prestador vinculado dos papéis admin e gestor sem ambiguidade? [Clarity, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 (parêntese explícito de 403 para admin e gestor) + US1 cenário 1 -->

## Consistency

- [X] CHK013 O bloco de encaminhamento citado na spec é literalmente o mesmo do plano e do SAD? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007, plan.md AD-001/Project Structure e §Implementation Signals — mesmo literal `location ^~ /uploads/ { proxy_pass http://backend:3001; }` -->
- [X] CHK014 Os nomes de papel (admin, gestor, prestador) aparecem iguais entre spec e plano? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US1/US2/US4 e plan.md §Requirement Coverage Map + HINT-001 (mesmos três papéis) -->
- [X] CHK015 O limite de fotos por conclusão é o mesmo na spec e na regra de recusa já existente? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("até 10 fotos") = backend/src/routes/tasks.js:303 (photos.length > 10 → 400) -->

## Measurability

- [X] CHK016 A recusa de upload inválido tem teste nomeado para o requisito que a declara? [Measurability, Spec §Requirements FR-009] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-009 → backend/src/middleware/upload.test.js) -->
- [X] CHK017 A recusa de escopo tem teste nomeado para os três roteadores? [Measurability, Spec §Requirements FR-010] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-010 → backend/src/routes/tasks.test.js) + §Requirement Coverage Map (tasks, comments, attachments, auth) -->
- [X] CHK018 A verificação do proxy tem mecanismo nomeado com status e content-type esperados? [Measurability, Spec §Requirements FR-008] <!-- Evaluator: Covered by spec.md FR-008 (200 e content-type de imagem) + plan.md AD-003 e stub FR-008 → backend/test-uploads-proxy.sh -->

## Coverage

- [X] CHK019 A falha de banco depois de gravar arquivo tem política declarada (estado aceito, sem retrial)? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("500 e arquivo órfão permanece, sem retrial automático") + STF-001 + plan.md AD-004 -->

## Traceability

- [X] CHK020 Cada requisito de segurança da spec aponta para símbolo no mapa de cobertura do plano? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-001 → completeTask(); FR-009 → saveToUploads(); FR-010 → router.use(scopeDomain()); FR-011 → canSeeTask()) -->
