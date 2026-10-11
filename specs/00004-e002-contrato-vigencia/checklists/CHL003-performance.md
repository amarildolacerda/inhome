# Performance Checklist: Contrato e vigência (E002)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O alvo de latência cobre carga, métrica e cenário (5.000 contratos, p95, listagem)? [Completeness, Spec §Requirements FR-015] <!-- Evaluator: Covered by spec.md FR-015 (listagem, p95, 5.000 contratos, ambiente local) + SC-004 -->
- [X] CHK002 A pré-condição de qualidade dos dados para alertas (100% dos vigentes com previsão) está declarada? [Completeness, Spec §Requirements FR-014] <!-- Evaluator: Covered by spec.md FR-014 + §Risks ("previsão ausente em vigente deixa o motor sem o que varrer; mitigado pela métrica de 100%") -->
- [X] CHK003 O volume de referência de "milhares" está fixado como valor, não como aproximação? [Completeness, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q4 ("5.000 contratos no domínio") + US4 Independent Test -->
- [X] CHK004 A estratégia de consulta do filtro particionado está definida sem exigir pós-filtro em memória? [Completeness, Spec §Requirements FR-013] <!-- Evaluator: Covered by plan.md AD-002 (partição no SQL `forecast_date < date('now')`) + HINT-002 (nunca pós-filtrar a página — `total` e paginação quebram) + §Coverage FR-013 -->
- [X] CHK005 A resposta de listagem é definida mesmo sem correspondências (lista vazia com total)? [Completeness, Spec §Requirements FR-013] <!-- Evaluator: Covered by contracts/openapi.yaml §ContractList (contracts como array, total, limit, offset sempre presentes) + spec.md FR-013 (paginação sempre responde estrutura) -->

## Clarity

- [X] CHK006 O que "ambiente local" significa para a medição está explícito no requisito? [Clarity, Spec §Requirements FR-015] <!-- Evaluator: Covered by spec.md FR-015 ("no ambiente local com 5.000 contratos no domínio") + plan.md §Testing Strategy (Unit `node --test` no processo local) -->
- [X] CHK007 A métrica é o percentil (p95) e não uma média ou melhor caso? [Clarity, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 ("abaixo de 2 s no p95") + FR-015 (p95) + plan.md stub FR-015 -->
- [X] CHK008 "Sem escrita de rotina" é distinguível de proibição absoluta de escrita de status? [Clarity, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("de rotina ou de job") vs FR-004 (encerramento grava `encerrado` de propósito) + plan.md AD-001 -->

## Consistency

- [X] CHK009 O volume de 5.000 contratos é idêntico entre clarificação, requisito e critério de sucesso? [Consistency, Spec §Clarifications] <!-- Evaluator: Covered by spec.md §Clarifications Q4 = FR-015 = SC-004 (5.000) + plan.md §Technical Context Performance Goals -->
- [X] CHK010 O prazo de 2 s é idêntico entre requisito e critério de sucesso? [Consistency, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md FR-015 ("abaixo de 2 s") = SC-004 ("abaixo de 2 s") = plan.md Performance Goals -->
- [X] CHK011 A partição do filtro é a mesma no cenário de aceitação e no requisito? [Consistency, Spec §User Scenarios US4] <!-- Evaluator: Covered by spec.md US4 AS1 (atrasado retornado, encerrado sai) + FR-013 (vigente/atrasado/encerrado sem sobreposição) -->

## Measurability

- [X] CHK012 O teste de desempenho tem evidência nomeada (medição de p95 sobre repetições)? [Measurability, Spec §Requirements FR-015] <!-- Evaluator: Covered by plan.md AD-004 (seed 5.000 + p95 em `node:test`) + stub FR-015 + HINT-005 (p95 sobre repetições com `ensureIndexes`) -->
- [X] CHK013 A métrica de 100% tem método de verificação sobre a resposta da API? [Measurability, Spec §Requirements FR-014] <!-- Evaluator: Covered by spec.md FR-014 ("devolver em 100% dos contratos vigentes da API") + plan.md stub FR-014 + §Risk Mitigation (asserção FR-014) -->
- [X] CHK014 O teste independente da user story é executável sem infraestrutura externa? [Measurability, Spec §User Scenarios US4] <!-- Evaluator: Covered by spec.md US4 Independent Test ("carregar 5.000 contratos, filtrar por status e medir o tempo") + plan.md §Testing Strategy (Unit `node --test` com sql.js temporário, sem serviços externos) -->

## Coverage

- [X] CHK015 O risco de fonte de dados instável tem mitigação técnica com dono nomeado? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks (fonte de dados instável, likelihood low, impact high) + plan.md §Risk Mitigation (asserção FR-014, owner routes/contracts.js) -->
- [X] CHK016 A regressão em prorrogação tem mitigação técnica com dono nomeado? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks (regressão em prorrogação, medium/medium) + plan.md §Risk Mitigation (cenário FR-003/FR-008, owner models/Contract.js) -->
- [X] CHK017 A fronteira "conta do dia seguinte" para previsão vencida tem cobertura de teste? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("conta do dia seguinte") + §Clarifications Q3 + plan.md stubs FR-007 (previsão passada é aceita) e FR-013 (filtro particiona os status) -->
