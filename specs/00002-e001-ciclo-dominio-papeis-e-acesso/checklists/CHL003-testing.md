# Testing Checklist: Ciclo de domínio, papéis e acesso (E001)
**Created**: 2026-09-27 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Cada requisito P1 tem uma obrigação de teste declarada, e não apenas uma contagem de testes? [Completeness, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (test.todo por FR-001..FR-008) + §Testing Strategy -->
- [X] CHK002 O cenário de isolamento com dois domínios é exigido no roteiro fim a fim e não opcional? [Completeness, Spec §Assumptions & Risks] <!-- Evaluator: Covered by plan.md AD-003 + §Testing Strategy (dois domínios) + spec.md §Risks -->
- [X] CHK003 A spec exige casos negativos para cada um dos quatro papéis na seção de testes? [Completeness, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US2 Independent Test (matriz nos quatro papéis, todos os casos negativos) -->
- [X] CHK004 A terceira história, embora P2, tem conjunto completo de cenários de aceitação? [Completeness, Spec §User Scenarios & Testing US3] <!-- Evaluator: Covered by spec.md US3 (Independent Test + 2 cenários de aceitação) -->
- [X] CHK005 O caminho de falha da habilitação, com 500 e registro não reaproveitado, tem teste exigido? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs FR-001 (habilitação atômica) + HINT-005 (o teste fixa o comportamento) -->

## Clarity

- [X] CHK006 A suíte automatizada citada no critério de sucesso está identificada pelo nome e pelo comando? [Clarity, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 + plan.md §Testing Strategy (backend/test.sh; npm test em backend/package.json:9) -->
- [X] CHK007 A marcação de 28 de 28 nas premissas deixa claro o que essa contagem mede? [Clarity, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Assumptions (validação fim a fim 28/28, EVD-005) + plan.md §Technical Context (fim a fim 28) -->
- [X] CHK008 A correção pontual prevista nos sinais de implementação tem gatilho que um resultado de regressão satisfaz? [Clarity, Spec §Implementation Signals] <!-- Evaluator: Covered by spec.md §Implementation Signals (gatilho: regressão achar rota sem guarda) -->
- [X] CHK009 O teste independente de cada história pode ser executado pelo leitor sem contexto adicional? [Clarity, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md §User Scenarios (Independent Test de US1, US2 e US3) -->

## Consistency

- [X] CHK010 A contagem de 28 verificações fim a fim é a mesma na spec e no plano? [Consistency, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Assumptions (28/28) + plan.md §Technical Context (fim a fim 28) -->
- [X] CHK011 Os identificadores de requisito usados em nomes de teste estão desdobrados da numeração da épica anterior? [Consistency, Spec §Requirements] <!-- Evaluator: Covered by plan.md HINT-002 (FR-### em testes segue a numeração de specs/00001) -->
- [X] CHK012 Os blocos de aceitação do plano cobrem exatamente o conjunto P1 declarado na spec? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001..FR-008 = P1) + spec.md tags [US1]/[US2] -->
- [X] CHK013 As prioridades das três histórias são coerentes com quais requisitos estão marcados como P1? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by spec.md US1/US2 P1 e US3 P2; FR-001..FR-008 P1 e FR-009 P2 -->

## Testability

- [X] CHK014 O cem por cento do critério SC-003 é mensurável contra uma execução nomeada e reproduzível? [Testability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by spec.md SC-003 + plan.md §Testing Strategy (backend/test.sh; npm test) -->
- [X] CHK015 A ausência de ação visível que termine em 403 é observável por papel sem apreciação manual? [Testability, Spec §Success Criteria SC-005] <!-- Evaluator: Covered by spec.md SC-005 (avaliação por papel, resultado binário) + frontend/lib/main.dart:208 _entriesForRole -->
- [X] CHK016 O critério de zero dados de um domínio está reduzido a asserções de resposta? [Testability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 (zero dados nas respostas) -->
- [X] CHK017 A exigência de suíte verde antes de qualquer promoção aparece como condição de aceitação da spec? [Testability, Spec §Assumptions & Risks] <!-- Evaluator: Herdado, sem duplicar na spec — plan.md:9 Key Constraint (suíte verde antes de qualquer promoção) + project-instructions.md §Testing & Quality Policy (unit tests before every dev → main promotion) + specs/prd.md:159/168 -->

## Coverage

- [X] CHK018 A recuperação na reativação é coberta por um teste distinto da suspensão? [Coverage, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by spec.md SC-002 (distinto de SC-001) + backend/src/routes/domains.test.js:91,137-155 -->
- [X] CHK019 O risco do guarda de parâmetro de domínio sem uso é coberto por um teste que falha enquanto o guarda seguir desligado? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks + plan.md §Risk Mitigation (unit scopeDomain + caso divergente na suíte) + auth.test.js:198-207 -->
- [X] CHK020 O risco de rota nova sem guarda é coberto por uma checagem que roda a cada rota adicionada? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by plan.md §Risk Mitigation (401/403 por rota em backend/test.sh e no fim a fim, roda a cada execução) -->
- [X] CHK021 O risco de teste em domínio único é contrariado por um passo obrigatório com dois domínios? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks (dois domínios no roteiro fim a fim) + plan.md AD-003 -->
- [X] CHK022 As categorias de verificação mandadas pelas instruções do projeto aparecem como obrigações desta épica? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by project-instructions.md §Derived QC Policy (linting, security, unit tests) + plan.md §Testing Strategy -->
- [X] CHK023 Os casos negativos de 401 e 403 estão cobertos tanto na suíte unitária quanto na fim a fim? [Coverage, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by plan.md §Testing Strategy (unit guards; fim a fim 401/403) + research.md §Matriz de quatro papéis -->

## Traceability

- [X] CHK024 Cada critério de sucesso aponta para ao menos um cenário de aceitação ou requisito? [Traceability, Spec §Success Criteria] <!-- Evaluator: Covered by spec.md SC-001..SC-005 com tag [US#] ligada aos cenários da história -->
- [X] CHK025 Os blocos de aceitação referenciam os identificadores de requisito que cobrem, um para um? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (Req ID FR-001..FR-008 por arquivo, um para um) -->
- [X] CHK026 Cada risco está pareado com a mitigação nomeada no plano? [Traceability, Spec §Assumptions & Risks] <!-- Evaluator: Covered by plan.md §Risk Mitigation (4 riscos da spec com mitigação nomeada) -->
