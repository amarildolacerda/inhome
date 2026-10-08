# Security Checklist: Ciclo de domínio, papéis e acesso (E001)
**Created**: 2026-09-27 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A spec define um status para cada modo de falha do login, cobrindo domínio inexistente, senha errada e domínio suspenso? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (401/403 sem revelar qual falhou) + FR-003 (403) -->
- [X] CHK002 O comportamento de um token emitido antes da suspensão que chega depois dela está descrito como requisito? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries + US1 AS3 + FR-003 -->
- [X] CHK003 As consequências de falha na criação do arquivo do domínio estão especificadas em termos de status e de reaproveitamento do registro? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 + §Edge Cases & Boundaries (500, registro não reaproveitado) -->
- [X] CHK004 A regra de negar por padrão cobre explicitamente toda rota de negócio que não esteja na lista do papel? [Completeness, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (negando por padrão tudo que não esteja na lista da rota) -->
- [X] CHK005 A restrição do ciclo de domínio ao system_admin está registrada como requisito e não apenas como exclusão de escopo? [Completeness, Spec §Scope] <!-- Evaluator: Covered by spec.md FR-004 (ciclo restrito ao system_admin) -->
- [X] CHK006 A revalidação do status do domínio em toda requisição autenticada está escrita como exigência própria? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md FR-003 + §Edge Cases & Boundaries (requisição seguinte recebe 403) + research.md §Isolamento -->

## Clarity

- [X] CHK007 A resolução automática do papel no login diz de onde o papel vem, sem depender de interpretação do leitor? [Clarity, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 + FR-008 + §Key Entities (Usuário.papel); origem em backend/src/routes/auth.js:13 -->
- [X] CHK008 A fronteira entre 401 para token ausente e 403 para papel ou domínio errado é definida uma única vez e reutilizada em todos os requisitos? [Clarity, Spec §Requirements] <!-- Evaluator: Covered by spec.md FR-005 (401 sem token / 403 papel errado), reutilizado em SC-003 e US2 AS3 -->
- [X] CHK009 A exigência de negar por padrão produz resultado determinístico para uma rota não listada, em vez de implícito? [Clarity, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (negar por padrão tudo que não esteja na lista da rota) -->
- [X] CHK010 O termo dados intactos aparece como lista concreta de registros que precisam sobreviver à suspensão? [Clarity, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by spec.md SC-002 (contratos, usuários e histórico) -->
- [X] CHK011 O que significa não expor conteúdo de outro domínio está descrito pelo que a resposta não pode conter? [Clarity, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md US2 AS2 + §Edge Cases & Boundaries (403/404 sem expor conteúdo do domínio B) -->

## Consistency

- [X] CHK012 Os quatro nomes de papel aparecem iguais entre a spec, a plano e a matriz citada do README? [Consistency, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 + README.md §Quem pode o quê (system_admin/admin/gestor/prestador) + plan.md -->
- [X] CHK013 A exceção da rota de uploads sem token é a mesma nas exclusões de escopo e nas premissas de verificação? [Consistency, Spec §Scope] <!-- Evaluator: Covered by spec.md §Scope Excluded + §Assumptions (mesma exceção de /uploads) -->
- [X] CHK014 O status de domínio suspenso é o mesmo no caminho de login e no caminho de requisição autenticada? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (403 no login e nas requisições) -->
- [X] CHK015 A resposta para recurso de outro domínio é formulada de modo idêntico no requisito, no caso de borda e no cenário de aceitação? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Covered by spec.md FR-007 + §Edge Cases & Boundaries + US2 AS2 (403 ou 404) -->

## Measurability

- [X] CHK016 A validade de 24 horas do JWT é expressa como valor conferível a partir do próprio token? [Measurability, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 (JWT 24 h) + backend/src/middleware/auth.js:13 (expiresIn 24h) -->
- [X] CHK017 A ordem de responder 401 ou 403 antes de qualquer leitura é afirmada como condição observável? [Measurability, Spec §User Scenarios & Testing US2] <!-- Evaluator: Covered by spec.md US2 AS3 + §Glossary Guard (antes de qualquer leitura) -->
- [X] CHK018 O critério de cem por cento da matriz está ligado a uma execução automatizada nomeada e reproduzível? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 + plan.md §Testing Strategy (backend/test.sh; npm test em backend/package.json) -->
- [X] CHK019 O critério de zero vazamento entre domínios está reduzido a asserções de resposta? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 (zero dados nas respostas) -->

## Coverage

- [X] CHK020 Cada um dos quatro papéis tem ao menos um caso negativo exigido pela spec? [Coverage, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 + US2 Independent Test (todos os casos negativos) + SC-003 -->
- [X] CHK021 Os cenários de isolamento exigem dois domínios ativos e não apenas um? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md SC-001/SC-004 + §Risks (dois domínios no roteiro fim a fim) -->
- [X] CHK022 O risco do guarda de parâmetro de domínio sem uso é coberto por um cenário que falharia se o guarda continuasse desligado? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries (recusa antes de consultar) + §Risks + backend/src/middleware/auth.test.js:198-207 -->
- [X] CHK023 A dependência do segredo do JWT está registrada como premissa junto do efeito quando ele falta? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Assumptions (JWT_SECRET ausente: login 500, requisições 403) + backend/src/middleware/auth.js:48 e routes/auth.js:94 -->
- [X] CHK024 Cada requisito P1 de FR-001 a FR-008 aponta para ao menos um cenário de aceitação? [Traceability, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md tags [US1]/[US2] de FR-001..FR-008 ligadas aos cenários de US1 e US2 -->
- [X] CHK025 Cada premissa de segurança da spec tem a mitigação correspondente entre os riscos? [Traceability, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Assumptions + §Risks — matriz README ↔ Guard ausente em rota nova; JWT_SECRET e /uploads ↔ risco novo (.env.example + 401/403 por rota na suíte); 28/28 ↔ domínio único e guarda sem uso -->
- [X] CHK026 Os critérios de sucesso de segurança remetem ao requisito que o produz? [Traceability, Spec §Success Criteria] <!-- Evaluator: Covered by spec.md SC-001..SC-005 com tag [US#] que remete aos FR da história -->
