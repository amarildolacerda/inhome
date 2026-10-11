# Tasks: Execução de tarefas com evidência (E003 / 00005)

**Input**: `spec.md`, `plan.md`, `research.md` em `specs/00005-e003-execucao-tarefas-evidencia/`
**Mode**: Brownfield — backend Express + `frontend/nginx.conf`; sem Setup nem Foundational.

## Epic / Capability Map

- [US1] Conclusão documentada com fotos — FR-001..FR-004
- [US2] Reabertura justificada — FR-005, FR-006
- [US3] Evidência same-origin via Edge — FR-007, FR-008
- [US4] Recusa limpa e domínio isolado — FR-009..FR-011

## Brownfield Notes

- Touched: `backend/src/routes/{tasks,comments,attachments}.js`, `backend/src/middleware/upload.js`, `frontend/nginx.conf`, `backend/test.sh`
- Sem migração (HINT-004): `tasks`, `task_photos`, `task_history`, `attachments` inalterados
- Regression: conclusão/reabertura existentes; unit 94+, smoke 97+, flutter, `npm audit`

## Phase 1: Delivery [US1] Conclusão documentada visível (P1) 🎯 MVP

- [X] T001 [US1] {FR-001,FR-002,FR-003} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "fluxo e conclusão só do prestador" backend/src/routes/tasks.test.js]
- [X] T002 [P] [US1] {FR-004} Create acceptance test stub in backend/src/routes/comments.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "comentário e anexo com autor e data" backend/src/routes/comments.test.js]
- [X] T003 [US1] {FR-001} Fluxo até `Concluída` e conclusão só do prestador vinculado em backend/src/routes/tasks.js → exports: updateTaskStatus(), completeTask() [VERIFY: node --test backend/src/routes/tasks.test.js]
- [X] T004 [US1] {FR-002} 400 da conclusão sem texto sem alterar status, evidência ou histórico em backend/src/routes/tasks.js [VERIFY: node --test backend/src/routes/tasks.test.js]
- [X] T005 [US1] {FR-003} Até 10 fotos gravadas antes da referência e registro no histórico em backend/src/routes/tasks.js [VERIFY: node --test backend/src/routes/tasks.test.js]
- [X] T006 [US1] {FR-004} Comentário e anexo com autor e data em backend/src/routes/comments.js e backend/src/routes/attachments.js → exports: addComment(), uploadAttachment() [VERIFY: node --test backend/src/routes/comments.test.js]

## Phase 2: Delivery [US2] Reabertura justificada (P1) 🎯 MVP

- [X] T007 [US2] {FR-005,FR-006} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "reabertura sem motivo responde 400" backend/src/routes/tasks.test.js]
- [X] T008 [US2] {FR-005} 400 de reabertura sem motivo antes de qualquer escrita em backend/src/routes/tasks.js after:T005 [VERIFY: node --test backend/src/routes/tasks.test.js]
- [X] T009 [US2] {FR-006} Reabertura por admin/gestor grava ação, autor, motivo e data em backend/src/routes/tasks.js → exports: reopenTask() [VERIFY: node --test backend/src/routes/tasks.test.js]

## Phase 3: Delivery [US3] Evidência acessível same-origin (P1) 🎯 MVP

- [X] T010 [US3] {FR-007} Create acceptance test stub in backend/src/routes/uploads.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "bloco location" backend/src/routes/uploads.test.js]
- [X] T011 [P] [US3] {FR-008} Create acceptance test stub in backend/test-uploads-proxy.sh ← plan:AcceptanceTestStubs [VERIFY: bash -n backend/test-uploads-proxy.sh]
- [X] T012 [US3] {FR-007} Bloco `location ^~ /uploads/` com headers `Host`/`X-Real-IP` em frontend/nginx.conf + rebuild do Edge [VERIFY: grep -A4 "location ^~ /uploads/" frontend/nginx.conf | grep "X-Real-IP"]
- [X] T013 [US3] {FR-008} backend/test-uploads-proxy.sh asserindo 200 + `image/*` no stack nginx after:T012 [VERIFY: bash backend/test-uploads-proxy.sh]

## Phase 4: Delivery [US4] Recusa limpa e domínio isolado (P1) 🎯 MVP

- [X] T014 [P] [US4] {FR-009} Create acceptance test stub in backend/src/middleware/upload.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "upload inválido 400 sem gravação" backend/src/middleware/upload.test.js]
- [X] T015 [P] [US4] {FR-010,FR-011} Create acceptance test stub in backend/src/routes/tasks.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "domainId estrangeiro 403 nos três" backend/src/routes/tasks.test.js]
- [X] T016 [US4] {FR-009} Validação de tipo e tamanho em backend/src/middleware/upload.js antes de mkdirSync/writeFileSync → exports: saveToUploads() [VERIFY: node --test backend/src/middleware/upload.test.js]
- [X] T017 [US4] {FR-010} `router.use(scopeDomain())` em tasks.js, comments.js e attachments.js (AD-002) after:T006 [VERIFY: node --test backend/src/routes/tasks.test.js]
- [X] T018 [US4] {FR-011} `prestador` restrito às próprias tarefas na leitura em backend/src/routes/tasks.js → exports: canSeeTask() [VERIFY: node --test backend/src/routes/tasks.test.js]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T021 [P] Estender backend/test.sh com o fluxo de evidência fim a fim (conclusão com fotos e renderização) e executá-lo after:T018 [VERIFY: bash backend/test.sh]
- [X] T019 [P] Rebuild do backend (`docker compose build backend && docker compose up -d backend`) e bateria completa: unit, smoke, flutter, lint (`node --check backend/src/**/*.js`), audit after:T018 [VERIFY: npm --prefix backend audit --audit-level=high]
- [X] T020 [P] Criar specs/00005-e003-execucao-tarefas-evidencia/manual-test.md com verificação visual de `/uploads` e revisão de 2026-12-26 after:T013 [VERIFY: grep "2026-12-26" specs/00005-e003-execucao-tarefas-evidencia/manual-test.md]

## Dependencies

Sem Setup/Foundational; fases de entrega em ordem US1 → US2 → US3 → US4; Polish por último. Stub sempre antes da impl do mesmo requisito na mesma fase. `after:` explícito: T008←T005 (mesmo arquivo), T013←T012 (Edge reconstruído), T017←T006 (mesmo arquivo), T019←T018, T020←T013, T021←T018 (test.sh antes da bateria). `[P]` sem `after:`/`←` na mesma leva.
