# Tasks: Manutenção de tarefas com aprovação do gestor (00014)

**Input**: `spec.md`/`plan.md` em `specs/00014-manutencao-tarefas-aprovacao/` | **Mode**: Brownfield (Express/sql.js + Flutter Web)

## Brownfield Notes

- AD-004 coluna preguiça `category` (default `evidence`); enum `tasks.status`, PATCH/complete/reopen e evidência 00005 intactos; guards E001 reusados
- HINT-002 escrita de status via `code('tasks.status', ...)`; HINT-003 saída de Concluída limpa `completed_*`
- Regression: unit `npm --prefix backend test`, smoke `backend/test.sh` (3199), flutter analyze + test, `npm audit`

## Phase 1: Setup (Acceptance Test Stubs RED)

- [ ] T001 {FR-030,FR-031,FR-032} Create acceptance test stub for backend/src/routes/tasks.js in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs [VERIFY: grep FR-030 backend/src/routes/tasks.test.js]
- [ ] T002 {FR-033,FR-034,FR-035} Create acceptance test stub for backend/src/routes/tasks.js in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs [VERIFY: grep FR-033 backend/src/routes/tasks.test.js]

## Phase 2: Foundational (Cross-Work-Item Blockers)

- [ ] T003 [P] Métodos approveTask, rejectTask, maintainTask e uploadAttachment(category) em frontend/lib/services/api_service.dart → exports: approveTask, rejectTask, maintainTask, uploadAttachment [VERIFY: grep approveTask frontend/lib/services/api_service.dart]
- [ ] T004 [P] {FR-037} Widget novo frontend/lib/widgets/task_detail_sheet.dart com dados, histórico e lista de anexos → exports: _TaskDetailSheetState [VERIFY: grep _TaskDetailSheetState frontend/lib/widgets/task_detail_sheet.dart]

## Phase 3: Delivery [US1] - Aprovação ou rejeição na Revisão (P1) MVP

- [ ] T005 [US1] {FR-030,FR-031} POST /:id/approve e /:id/reject em backend/src/routes/tasks.js só para gestor e só em Revisão, escrita via code('tasks.status', ...) e linha approve/reject com autor e motivo (AD-001/AD-003) [VERIFY: npm --prefix backend test]
- [ ] T006 [US1] {FR-032} Rejeição sem motivo e decisão fora de Revisão respondem 400 sem escrita e papel diverso do gestor 403, em backend/src/routes/tasks.js after:T005 [VERIFY: node --test backend/src/routes/tasks.test.js]
- [ ] T007 [US1] {FR-030} [COMPLETES FR-030] Botões aprovar/rejeitar com motivo para o gestor no detalhe em frontend/lib/widgets/task_detail_sheet.dart after:T004 ← T003:approveTask [VERIFY: grep approveTask frontend/lib/widgets/task_detail_sheet.dart]

## Phase 4: Delivery [US2] - Manutenção do estado com permissão (P1) MVP

- [ ] T008 [US2] {FR-033,FR-034} Endpoint POST /:id/maintenance {status, motivo} para admin e gestor em backend/src/routes/tasks.js valida Task.FLOW, responde 400 sem motivo ou repetido e grava maintain com estados anterior e novo (AD-002/AD-003) after:T005 [VERIFY: npm --prefix backend test]
- [ ] T009 [US2] {FR-035} Rotas de decisão e manutenção sob router.use(scopeDomain()) herdado, 403 de domínio estrangeiro e suspenso antes da consulta, em backend/src/routes/tasks.js after:T008 [VERIFY: node --test backend/src/routes/tasks.test.js]
- [ ] T010 [US2] {FR-033} [COMPLETES FR-033] Manutenção no detalhe: seletor dos quatro estados e motivo, oculta para papel sem permissão, em frontend/lib/widgets/task_detail_sheet.dart after:T004 ← T003:maintainTask [VERIFY: grep maintainTask frontend/lib/widgets/task_detail_sheet.dart]

## Phase 5: Delivery [US3] - Documentação e fotos em qualquer etapa (P2)

- [ ] T011 [US3] {FR-036} Migração preguiça ADD COLUMN category TEXT NOT NULL DEFAULT 'evidence' com CHECK ('evidence','documentation') em backend/src/config/database.js, idempotente → exports: migrateSchema [VERIFY: grep category backend/src/config/database.js]
- [ ] T012 [US3] {FR-036} Regressão da migração em backend/src/config/database.js via backend/src/config/database.test.js: reabertura não duplica a coluna e contagens de attachments ficam preservadas ← T011:migrateSchema [VERIFY: npm --prefix backend test]
- [ ] T013 [US3] {FR-036} Upload aceita category evidence ou documentation e bloqueia prestador em Concluída com 403 TASK_ATTACHMENT_STATUS_FORBIDDEN antes de gravar em backend/src/routes/attachments.js → exports: uploadAttachment [VERIFY: npm --prefix backend test]
- [ ] T014 [US3] {FR-036} [COMPLETES FR-036] Seletor de categoria no upload e anexos por papel no detalhe em frontend/lib/widgets/task_detail_sheet.dart ← T003:uploadAttachment [VERIFY: grep documentation frontend/lib/widgets/task_detail_sheet.dart]
- [ ] T015 [US3] {FR-037} Anexos com categoria, autor e data no detalhe e abertura do detalhe no tap da tarefa em frontend/lib/widgets/task_detail_sheet.dart e frontend/lib/screens/tasks_screen.dart after:T004 [VERIFY: grep uploaded frontend/lib/widgets/task_detail_sheet.dart]

## Phase 6: Polish

- [ ] T016 [P] Estender backend/test.sh com smoke de aprovação, rejeição, manutenção e anexo com category, mantendo a regressão de 00005 after:T015 [VERIFY: bash backend/test.sh]
- [ ] T017 [P] Teste flutter do detalhe por papel em frontend/test/task_detail_sheet_test.dart ← T004:_TaskDetailSheetState [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter analyze && flutter test"]
- [ ] T018 Bateria zero-regressão: rebuild do backend, unit, smoke 3199, flutter analyze + test e audit 0 after:T016,T017 [VERIFY: npm --prefix backend audit --audit-level=high]

## Dependencies

Fluxo: Setup (stubs RED) -> Foundational (cliente de API e sheet) -> Delivery US1 -> US2 -> US3 -> Polish; stub sempre antes da implementação do mesmo requisito.

- T005 e T008 escrevem em backend/src/routes/tasks.js; T006 e T009 nascem depois deles no mesmo arquivo.
- T007, T010, T014 e T015 dependem do sheet T004 e do cliente T003; T012 depende da migração T011.
- T016 e T017 são paralelos; T018 (rebuild e bateria) fecha a fase depois dos dois.
- requireRole, scopeDomain, Task.addHistory, Task.FLOW, canSee e emitDomainEvent são consumo de 00001/00005.
