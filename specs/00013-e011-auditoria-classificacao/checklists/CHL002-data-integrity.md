# Data Integrity Checklist: Acesso de auditoria e classificação de tarefas executadas (00013)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O dado novo está declarado como registro único por tarefa com todos os campos obrigatórios (estado, autor, data) e a nota opcional? [Completeness, Spec §FR-003; Key Entities] <!-- Evaluator: Covered by spec.md FR-003 ("no máximo um registro de classificação corrente") + Key Entities ("estado, nota opcional, autor e data da última mudança") -->
- [X] CHK002 A regra de substituição está declarada — reclassificação troca o registro corrente mantendo autor e data da última mudança, sem preservar versões anteriores? [Completeness, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("substituir o registro mantendo autor e data da última mudança, sem versões anteriores preservadas") -->
- [X] CHK003 A migração está declarada como aditiva e preguiçosa, sem alterar `tasks`/`task_history` nem reescrever dados existentes? [Completeness, Spec §Scope; Risks] <!-- Evaluator: Covered by spec.md Scope ("Migração aditiva preguiçosa em inglês ... sem alterar tasks/task_history") + Risks ("migração aditiva preguiçosa no precedente alert_events") + Signals [MIGRATION] -->
- [X] CHK004 O comportamento de domínio sem tarefas executadas está declarado (lista vazia com 200, sem erro)? [Completeness, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("Domínio sem executadas: lista vazia com 200") -->
- [X] CHK005 A permanência do registro após reabertura da tarefa está declarada como requisito de persistência? [Completeness, Spec §FR-004; Assumptions] <!-- Evaluator: Covered by spec.md FR-004 ("tarefa reaberta sai da visão de executadas e o registro permanece") + Assumptions ("registros permanecem legíveis após reabertura") -->
- [X] CHK006 O destino da gravação concorrente está declarado (última gravação vence, nunca dois registros)? [Completeness, Spec §Edge Cases; STF-004] <!-- Evaluator: Covered by spec.md Edge Cases ("última gravação vence, sem trava otimista ... nunca dois registros") + STF-004 resolution making last-write-wins explicit -->

## Clarity

- [X] CHK007 O que conta como "tarefa executada" está definido sem ambiguidade (Revisão ou Concluída)? [Clarity, Spec §Glossary; FR-001] <!-- Evaluator: Covered by spec.md Glossary ("Revisão ou Concluída — o que o auditor lê") + FR-001 (same two states) -->
- [X] CHK008 A fronteira de dado adjunto está clara: classificação não gera evento novo em `task_history` nem altera fluxo ou evidência? [Clarity, Spec §Assumptions; Excluded] <!-- Evaluator: Covered by spec.md Assumptions ("classificação é dado adjunto, sem novo evento") + Excluded ("Mudança no fluxo de tarefa ou em conclusão/reabertura de E003") -->

## Consistency

- [X] CHK009 Os três estados da classificação aparecem com os mesmos literais em requisito, contrato e regra de validação, sem variação? [Consistency, Spec §FR-002; plan.md AD-003] <!-- Evaluator: Covered by spec.md FR-002 literals identical to contracts/openapi.yaml enum and plan.md AD-003 (literais PT) -->
- [X] CHK010 O limite de 500 caracteres é idêntico em requisito, caso de borda e registro de clarificação? [Consistency, Spec §FR-002; Edge Cases; Clarifications] <!-- Evaluator: Covered by spec.md FR-002 ("até 500 caracteres") = Edge Cases ("acima de 500") = Clarifications Q2 ("500 caracteres; acima, 400 sem escrita") -->
- [X] CHK011 A convenção de identificadores em inglês com literais de estado em português é consistente com o precedente da base e a decisão de design? [Consistency, Spec §Scope; Signals; plan.md AD-003] <!-- Evaluator: Covered by spec.md Scope ("em inglês, precedente alert_events") + Signals [MIGRATION] + plan.md AD-003 (literais PT, precedente tasks.status) -->

## Testability

- [X] CHK012 A garantia de registro único é verificável — reclassificar N vezes mantém exatamente uma linha com autor e data correntes? [Testability, Spec §SC-002; FR-003] <!-- Evaluator: Covered by spec.md SC-002 ("substitui a anterior sem duplicar registro") + FR-003 ("no máximo um registro") -->
