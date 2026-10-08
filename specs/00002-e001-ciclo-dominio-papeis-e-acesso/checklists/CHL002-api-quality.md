# API Quality Checklist: Ciclo de domínio, papéis e acesso (E001)
**Created**: 2026-09-27 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A spec define um status para cada falha da operação de habilitação de domínio? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (domínio já existente 409) + FR-001 (falha de gravação 500) + backend/src/routes/domains.js:47 -->
- [X] CHK002 O contrato de resposta para requisições negadas com 401 ou 403 está definido para toda rota de negócio, inclusive as que ainda não existem? [Completeness, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (toda rota de negócio + negar por padrão) -->
- [X] CHK003 As respostas de falha de validação estão especificadas na spec e não apenas no plano? [Completeness, Spec §Requirements] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (validação 400 + details) + backend/src/middleware/validate.js:56; plan.md §Error Handling Strategy só reutiliza o mesmo status -->
- [X] CHK004 A resposta de conflito por username repetido define o que muda e o que permanece intacto? [Completeness, Spec §Requirements FR-008] <!-- Evaluator: Covered by spec.md FR-008 + §Edge Cases & Boundaries (409 sem alterar o usuário existente) -->
- [X] CHK005 Está exigido que listagens e consultas devolvam apenas registros do domínio do chamador? [Completeness, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 (banco selecionado pelo domainId do token) + SC-004 -->
- [X] CHK006 O identificador aceito no login é descrito como um único contrato de e-mail ou username? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 (aceita e-mail ou username como identificador) -->
- [X] CHK007 A forma do corpo de erro é exigida de modo uniforme entre 401, 403, 404, 409 e 500? [Completeness, Spec §Requirements] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (corpo {error: string} em 401, 403, 404, 409 e 500) -->

## Clarity

- [X] CHK008 A escolha entre 403 e 404 para recurso de outro domínio está decidida ou declarada como alternativa aceita? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md FR-007 + §Edge Cases & Boundaries (403/404 declarado como alternativa) -->
- [X] CHK009 A expressão toda rota de negócio é delimitada por uma regra que não admite dúvida? [Clarity, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (negar por padrão tudo fora da lista) + §Scope Excluded (/uploads) -->
- [X] CHK010 O papel aceito por rota é escrito como lista de permitidos explícita? [Clarity, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (lista da rota) + FR-006 (matriz por papel) -->
- [X] CHK011 A atomicidade da habilitação está expressa como contrato observável de fora do sistema? [Clarity, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 (operação única; 500 e registro não reaproveitado) -->

## Consistency

- [X] CHK012 Os status usados para domínio suspenso coincidem entre o caminho de login e o caminho autenticado? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (403 no login e na requisição autenticada) -->
- [X] CHK013 Os códigos 401 e 403 têm o mesmo significado em todos os artefatos da épica? [Consistency, Spec §Requirements] <!-- Evaluator: Covered by spec.md FR-005/SC-003 + plan.md §Error Handling Strategy (401 sem token; 403 errado) -->
- [X] CHK014 A tabela de tratamento de erros do plano corresponde aos status escritos nos cenários da spec? [Consistency, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (400/401/403/404/409/500) conferindo com plan.md §Error Handling Strategy (400, 401, 403, 404, 409, 500) -->
- [X] CHK015 A alternativa de 403 ou 404 aparece igual no requisito, no caso de borda e no cenário de aceitação? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 + §Edge Cases & Boundaries + US2 AS2 (403 ou 404) -->

## Measurability

- [X] CHK016 A exigência de 401 antes de qualquer leitura é redigida como asserção de ordem observável pela suíte? [Measurability, Spec §User Scenarios & Testing US2] <!-- Evaluator: Covered by spec.md US2 AS3 (401 antes de qualquer leitura) + §Glossary -->
- [X] CHK017 A ausência de conteúdo do domínio B está reduzida a campos que a resposta não pode trazer? [Measurability, Spec §User Scenarios & Testing US2] <!-- Evaluator: Covered by spec.md US2 AS2 (403/404 sem expor conteúdo do domínio B) -->
- [X] CHK018 O critério de zero vazamento delimita as superfícies mensuráveis, quais sejam API, tela e relatório? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 (API, tela e relatório) -->
- [X] CHK019 A duração do JWT é conferível a partir dos próprios campos do token? [Measurability, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 (24 h) + backend/src/middleware/auth.js:13 (exp/iat no token) -->

## Coverage

- [X] CHK020 Os cinco casos de borda da spec têm um status de API correspondente? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (403, 500, 403/404, 401/403, 409) -->
- [X] CHK021 Existe resposta definida para token malformado ou assinado com chave errada? [Coverage, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (malformado ou de chave errada: 403; 401 só para token ausente) + backend/src/middleware/auth.js:46-48 -->
- [X] CHK022 Existe resposta definida para token válido sem a afirmação de papel? [Coverage, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-005 (negar por padrão → 403) + FR-006; backend/src/middleware/auth.js:68-78 -->
- [X] CHK023 As operações do ciclo de domínio têm casos negativos exigidos para os outros três papéis? [Coverage, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 + FR-005 + US2 Independent Test (todos os casos negativos) -->
- [X] CHK024 A exceção aceita da rota de uploads está documentada onde o consumidor da API procura? [Coverage, Spec §Scope] <!-- Evaluator: Covered by spec.md §Scope Excluded + §Assumptions (/uploads sem token) -->

## Traceability

- [X] CHK025 Cada requisito de FR-001 a FR-009 nomeia a superfície de API que restringe? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by spec.md FR-001..FR-009 nomeiam operação/recurso; mapeamento concreto em plan.md §Requirement Coverage Map -->
- [X] CHK026 Os critérios de sucesso ligados à API remetem ao requisito que o produz? [Traceability, Spec §Success Criteria] <!-- Evaluator: Covered by spec.md SC-001..SC-005 com tag [US#] ligada ao FR que a produz -->
