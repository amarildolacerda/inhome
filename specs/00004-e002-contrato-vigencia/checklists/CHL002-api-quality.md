# API Quality Checklist: Contrato e vigência (E002)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Os modos de falha do cadastro (nome ausente, data inválida, finalidade inexistente ou aposentada) estão cobertos com status e efeito? [Completeness, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001 (400 para nome ou datas inválidos e finalidade inexistente ou aposentada) + contracts/openapi.yaml §/api/contracts.post -->
- [X] CHK002 Os conflitos de estado (prorrogação de contrato encerrado, encerramento repetido) têm status definido? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (400) + FR-004 (encerramento repetido 400) + plan.md §Error Handling Strategy -->
- [X] CHK003 A regra do filtro de status é uma partição sem sobreposição e não um rótulo livre? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec.md FR-013 ("particiona os contratos... sem sobreposição") + §Clarifications Q1 -->
- [X] CHK004 A exigência de resposta com previsão preenchida em 100% dos vigentes está declarada como requisito de API? [Completeness, Spec §Requirements FR-014] <!-- Evaluator: Covered by spec.md FR-014 + US4 AS2 + contracts/openapi.yaml §Contract.forecast_date ("Presente em 100% dos vigentes") -->
- [X] CHK005 O alvo de desempenho está totalmente quantificado (p95, 5.000 contratos, 2 s, ambiente local)? [Completeness, Spec §Requirements FR-015] <!-- Evaluator: Covered by spec.md FR-015 (p95, 5.000, ambiente local) + SC-004 + §Clarifications Q4 -->
- [X] CHK006 A fronteira temporal do filtro (`atrasado` só com previsão estritamente anterior à data atual) está declarada? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q3 ("data estritamente anterior à atual; no dia da previsão segue vigente") + FR-013 -->

## Clarity

- [X] CHK007 Os limites operacionais da paginação estão definidos em artefato consultável pelo consumidor da API? [Clarity, Spec §Requirements FR-013] <!-- Evaluator: Covered by contracts/openapi.yaml §parameters.Limit (1..200, padrão 50) e §Offset (≥0) + plan.md §API Surface Summary; spec.md FR-013 exige paginação -->
- [X] CHK008 O efeito combinado de `limit`, `offset` e filtro sobre a resposta (incluindo `total`) é distinguível? [Clarity, Spec §Requirements FR-013] <!-- Evaluator: Covered by contracts/openapi.yaml §ContractList (contracts, total, limit, offset) + descrição do GET (total particionado) -->
- [X] CHK009 O efeito de salvar com previsão no passado (nasce `atrasado`, sem impedir a gravação) é descrito sem ambiguidade? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("nasce atrasado sem impedir a gravação; conta do dia seguinte") + FR-007 + US2 Independent Test -->
- [X] CHK010 A opcionalidade da finalidade no cadastro está declarada, evitando leitura de que ela é obrigatória? [Clarity, Spec §Requirements FR-001] <!-- Evaluator: RESOLVED 2026-10-08 — spec.md FR-001 reescrito: "quando informada, exatamente uma finalidade ativa do dicionário"; alinha a spec ao comportamento entregue (contrato criado sem finalidade responde 201 em backend/test.sh) e a contracts/openapi.yaml §ContractWrite.finalidade_id nullable; compensação de tamanho aplicada em §Edge Cases e §Clarifications mantendo 10236 B ≤ 10 KB -->

## Consistency

- [X] CHK011 Os valores de status do filtro são idênticos entre spec, contrato e status derivado do modelo? [Consistency, Spec §Requirements FR-013] <!-- Evaluator: Covered by spec.md FR-013 (vigente/atrasado/encerrado) + contracts/openapi.yaml §StatusFilter enum + plan.md AD-001 -->
- [X] CHK012 O alvo de 5.000 contratos e 2 s aparece igual em SC-004, no requisito e no plano? [Consistency, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 + FR-015 + plan.md §Technical Context (Performance Goals) e stub FR-015 ("5000") -->
- [X] CHK013 O significado de `vigente` no filtro coincide com a partição esclarecida (previsão futura)? [Consistency, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q1 + FR-013 ("vigente (previsão não vencida)") + plan.md AD-002 -->
- [X] CHK014 O status exibido e o status persistido não conflitam entre spec e contrato? [Consistency, Spec §Requirements FR-005] <!-- Evaluator: Covered by spec.md FR-005 (banco só vigente/encerrado) + contracts/openapi.yaml §Contract.status vs §Contract.db_status -->

## Measurability

- [X] CHK015 SC-004 é conferível com valores fixos (5.000 contratos, p95 abaixo de 2 s)? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 (abaixo de 2 s no p95 com 5.000 contratos) -->
- [X] CHK016 A meta de 100% dos vigentes com previsão é uma métrica percentual verificável? [Measurability, Spec §Requirements FR-014] <!-- Evaluator: Covered by spec.md FR-014 ("em 100% dos contratos vigentes da API") + SC-004 + plan.md §Risk Mitigation (asserção FR-014) -->
- [X] CHK017 Cada requisito da listagem tem teste de aceitação nomeado? [Measurability, Spec §Requirements FR-013] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs: FR-013 ("filtro particiona os status"), FR-014 ("100% dos vigentes com previsão"), FR-015 ("p95 abaixo de 2s com 5000") -->

## Coverage

- [X] CHK018 A exclusão de contrato tem requisito e cobertura de teste com a restrição a admin? [Coverage, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("restringir exclusão a admin") + plan.md stub FR-004 + contracts/openapi.yaml §/api/contracts/{id}.delete -->
- [X] CHK019 O vínculo por id cobre o caso de contrato criado sem prestadores? [Coverage, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("aceitando contrato sem prestadores no cadastro") + §Edge Cases + plan.md stub FR-002 -->
- [X] CHK020 O retorno de contrato `atrasado` no filtro, com gravado `vigente`, tem cenário de aceitação? [Coverage, Spec §User Scenarios US4] <!-- Evaluator: Covered by spec.md US4 AS1 ("gravado vigente... ele é retornado; encerrado, sai") + US2 AS1 -->
