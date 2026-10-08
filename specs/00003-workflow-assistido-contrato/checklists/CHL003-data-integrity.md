# Data Integrity Checklist: Workflow Assistido por OpenCode (00003)
**Created**: 2026-10-06 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A migração aditiva preguiçosa por arquivo de domínio está declarada, sem varredura no boot? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by data-model.md §Migration (adiativa preguiçosa na abertura de cada `data/domains/<id>.db`, sem varredura no boot; precedente Q5/E004) + plan.md §Technical Context ("migração aditiva") + spec.md §Implementation Signals (MIGRATION: tabelas novas por domínio) -->
- [X] CHK002 A reexecução da migração é definida como idempotente, com guarda para o `ALTER TABLE` das colunas novas? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by data-model.md §Migration (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE tasks ADD COLUMN` em `migrateSchema()`, mesmo padrão do `username`) + docs/naming-conventions.md §Padrão de migração (guarda idempotente, segunda abertura no-op, teste de regressão) -->
- [X] CHK003 A aprovação está exigida como operação tudo-ou-nada (materialização, ativação e substituição do workflow anterior na mesma transação)? [Completeness, Spec §Requirements FR-010] <!-- Evaluator: Resolved — data-model.md §Validation rules (+ bullet FR-009/FR-010: aprovação atômica, falha devolve o banco ao estado anterior) -->
- [X] CHK004 A regra de conflito cobre os três lados: quais status viram conflito, o que permanece intacto e qual status a aplicação devolve? [Completeness, Spec §Requirements FR-023] <!-- Evaluator: Covered by spec.md FR-023 + data-model.md §Validation rules FR-023 (só `A Fazer`; outro status gera `revision_conflicts` e deixa a tarefa intacta) + plan.md §Error Handling Strategy (conflito → 200) + openapi.yaml §applyReview (200 com `conflicts` e `applied`) -->
- [X] CHK005 Os caminhos de perda de dados estão declarados como seguros (falha preserva definições, refino não atualiza a versão anterior, migração não reescreve, revisão não remove)? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries + FR-006/FR-008/FR-023 + data-model.md §Migration ("nada é reescrito ou apagado") e §Validation rules FR-008 (versão anterior nunca recebe UPDATE) + openapi.yaml §getReview (falha nunca altera definições e tarefas) -->
- [X] CHK006 O histórico é declarado como append-only, sem edição ou remoção de entradas? [Completeness, Spec §Requirements FR-017] <!-- Evaluator: Covered by data-model.md §Entities (`entity_history` ... Transições: append-only) + FR-017 (versões com autor e data) + UNIQUE(entity_type, entity_id, version) -->

## Clarity

- [X] CHK007 O conflito deixa explícito o que NÃO acontece (a tarefa-alvo permanece intacta) e não só o que é sinalizado? [Clarity, Spec §Glossary] <!-- Evaluator: Covered by spec.md §Glossary ("Mudança de revisão não aplicada... sinalizada ao gestor") + data-model.md §State Machines ("conflito sinaliza, não fila") e §Validation rules FR-023 ("deixa a tarefa intacta") -->
- [X] CHK008 A elegibilidade da aplicação é uma única regra de status ("A Fazer", inclusive reaberta)? [Clarity, Spec §Requirements FR-023] <!-- Evaluator: Covered by spec.md FR-023 ("elegível por status; reabertura cai fora de A Fazer e vira conflito") + §Assumptions (reabertura devolve a tarefa a Em Progresso, que fica fora de A Fazer e vira conflito) + data-model.md §Entities Task ("elegível de revisão = 'A Fazer'") -->
- [X] CHK009 A garantia de um único workflow ativo por contrato está escrita como invariante? [Clarity, Spec §Requirements FR-010] <!-- Evaluator: Covered by spec.md FR-010 + data-model.md §Validation rules FR-010 (UNIQUE parcial em `workflow_versions(contract_id) WHERE status='ativo'` mantém 1 workflow oficial por contrato) -->
- [X] CHK010 A regra de revisão aguardar a análise em andamento está declarada como caso de borda? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases & Boundaries ("Revisão durante análise aguarda a anterior") + data-model.md §State Machines (índice parcial UNIQUE `WHERE status='analisando'`) + openapi.yaml §startReview (pendente na fila, 409 com revisão em andamento) -->

## Consistency

- [X] CHK011 Os valores de status de revisão do contrato pertencem ao CHECK da coluna `status` de `task_suggestions`? [Consistency, Spec §Requirements FR-023] <!-- Evaluator: Resolved — contracts/openapi.yaml: enum `aplicada` → `aprovada` em §getReview, §ReviewSummary e §Review, alinhado ao CHECK ('pendente','analisando','sugerido','falha','aprovada') de data-model.md e à lista de enums da fase 3 de docs/naming-conventions.md -->
- [X] CHK012 O modelo de remoção de item no contrato corresponde ao modelo de dados vigente (`removed`)? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Resolved — contracts/openapi.yaml: `status_revisao` (enum de 4 estados) → `removed` boolean em §SuggestionItem, §SuggestionItemInput e descrição de §updateSuggestionItem, alinhado a data-model.md (`removed INT NOT NULL DEFAULT 0` e nota "status_revisao → removed + target_task_id") -->
- [X] CHK013 A tabela de entidades do plano cobre as 7 tabelas novas do modelo de dados? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Resolved — plan.md §Data Model Summary (+ linha History / `entity_history`, ausente antes; as outras 6 já constavam) -->
- [X] CHK014 As duas regras de UNIQUE parcial aparecem idênticas na narrativa de estados e nas regras de validação? [Consistency, Spec §Requirements FR-010] <!-- Evaluator: Covered by data-model.md §State Machines (parcial em `task_suggestions(contract_id) WHERE status='analisando'`) e §Validation rules FR-010 (parcial em `workflow_versions(contract_id) WHERE status='ativo'`), mesma formulação nas duas seções -->
- [X] CHK015 Os nomes das 7 tabelas novas seguem a convenção de identificador em inglês? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Covered by docs/naming-conventions.md (lista as 7 tabelas da 00003 como conformes) + data-model.md (contract_definitions, task_suggestions, suggestion_items, workflow_versions, execution_plans, revision_conflicts, entity_history) -->

## Measurability

- [X] CHK016 O resultado da aplicação de revisão é contável em edições, criações e conflitos separados? [Measurability, Spec §Success Criteria SC-008] <!-- Evaluator: Covered by openapi.yaml §ReviewApplyResult (`applied.edited`, `applied.created`, `conflicts[]`) + spec.md SC-008 -->
- [X] CHK017 A preservação das tarefas pré-existentes é verificável pela coluna nova nula, fora do workflow? [Measurability, Spec §Requirements FR-011] <!-- Evaluator: Covered by data-model.md §Migration (tarefas pré-00003 ficam com `workflow_version_id IS NULL`, fora do workflow; nada é reescrito ou apagado) + spec.md FR-011 -->
- [X] CHK018 A recusa de aprovação vazia é contável sobre itens não removidos? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by data-model.md §Validation rules FR-009 (aprovação conta itens com `removed = 0`) + openapi.yaml §approveSuggestion (lista vazia → 400) + spec.md SC-004 -->
- [X] CHK019 A garantia de workflow único é imposta por índice nomeado, e não só pela aplicação? [Measurability, Spec §Requirements FR-010] <!-- Evaluator: Covered by data-model.md §Validation rules FR-010 (UNIQUE parcial `WHERE status='ativo'`) e §Migration ("índices ... incluindo os dois UNIQUE parciais") -->

## Coverage

- [X] CHK020 Toda chave estrangeira nova aponta para tabela dentro do mesmo arquivo de domínio? [Coverage, Spec §Requirements FR-019] <!-- Evaluator: Covered by data-model.md §Isolamento multi-tenant (tabela nova nasce no arquivo do domínio; escopo alcançado por FK até `contracts`/`tasks`; leitura e escrita só via `getDomainDb(domainId)`) -->
- [X] CHK021 As 7 tabelas novas e as 4 colunas aditivas de `tasks` estão declaradas no plano de migração? [Coverage, Spec §Implementation Signals] <!-- Evaluator: Covered by data-model.md §Início ("7 tabelas novas + 4 colunas aditivas em `tasks`") + §Migration (T001) + plan.md §Project Structure (`~ backend/src/config/database.js`) + spec.md NEW-ENTITY/MIGRATION -->
- [X] CHK022 Os caminhos de órfão estão cobertos (tarefas antigas fora do workflow e entrada por opt-in)? [Coverage, Spec §Requirements FR-010] <!-- Evaluator: Covered by data-model.md §Migration (tarefas pré-00003 com `workflow_version_id IS NULL`) + §Validation rules FR-010 (`NULL` = fora do workflow; opt-in preenche `opt_in_by`/`opt_in_at`) + spec.md FR-010 -->
- [X] CHK023 O caminho destrutivo está limitado: o contrato não possui operação DELETE sobre sugestões, itens ou workflow? [Coverage, Spec §Requirements FR-007] <!-- Evaluator: Covered by contracts/openapi.yaml (23 operações, todas GET/POST/PUT/PATCH, nenhuma DELETE) + data-model.md §Validation rules FR-007 (remoção é estado do item) + spec.md FR-023 (revisão não remove) -->
- [X] CHK024 A concorrência está coberta: uma única análise em andamento por contrato? [Coverage, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by data-model.md §State Machines (UNIQUE parcial em `task_suggestions(contract_id) WHERE status='analisando'`) + spec.md §Edge Cases & Boundaries + openapi.yaml §startAnalysis/§startReview (409 com job em andamento) -->

## Traceability

- [X] CHK025 Cada tabela nova rastreia ao menos um requisito? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by data-model.md §Entities (coluna FR de cada uma das 7 tabelas: FR-001..FR-024) -->
- [X] CHK026 Cada regra de validação cita o FR que ela impõe? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by data-model.md §Validation rules (todos os bullets prefixados por FR-003, FR-004/FR-020, FR-007, FR-009, FR-010, FR-014/FR-015, FR-016, FR-023) -->
- [X] CHK027 Os FRs de integridade do P1 têm bloco de aceitação nomeado, e a ausência dos P2/P3 está declarada como escopo? [Traceability, Spec §User Scenarios & Testing] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-010, FR-016 e demais P1 com arquivo e `test.todo` nomeado; bloco declara "P1 = US1–US5 (20 FR)", deixando FR-017 e FR-022..FR-024 fora por prioridade, não por omissão) -->
- [X] CHK028 O critério SC-008 remete ao mecanismo de FR-023 que o produz? [Traceability, Spec §Success Criteria SC-008] <!-- Evaluator: Covered by spec.md SC-008 [US7] (edita/cria só A Fazer, iniciadas e concluídas intactas, conflitos sinalizados) ← FR-023 -->

## Evaluation Summary

| Verdict | Count |
|---|---|
| PASS | 24 |
| RESOLVED | 4 |
| ASK | 0 |
| **Total** | **28** |

- **PASS**: CHK001, CHK002, CHK004–CHK010, CHK014–CHK028
- **RESOLVED**: CHK003, CHK011, CHK012, CHK013
- **ASK**: nenhum
- **Artefatos amendados**: `data-model.md` (bullet de aprovação atômica em §Validation rules), `contracts/openapi.yaml` (enum de revisão `aplicada` → `aprovada` em três pontos; `status_revisao` → `removed` em §SuggestionItem, §SuggestionItemInput e descrição de §updateSuggestionItem), `plan.md` (linha History / `entity_history` em §Data Model Summary)
