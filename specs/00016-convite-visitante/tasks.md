# Tasks: Convite temporário e papel visitante (00016)

**Input**: `specs/00016-convite-visitante/` · **Epic**: E015

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; sem bootstrap.

## Epic / Capability Map

- `[US1]` emissão/lista/revogação (FR-044, FR-045)
- `[US2]` cadastro e escopo (FR-046, FR-047)
- `[US3]` reavaliação e histórico (FR-048..050)

## Brownfield Notes

- `migrateSchema` aditivo (E011); estado derivado, sem job. Token ≥128 bits fora de logs.

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 [P] Add invites/invite_emails/access_history + CHECK visitante in backend/src/config/database.js → exports: migrateSchema(db,domainId) [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T002 [P] Create append-only model in backend/src/models/AccessHistory.js → exports: recordAccess(db,event,payload) [VERIFY: cd backend && node --test src/models/AccessHistory.test.js]

## Phase 2: Delivery [US1] - Emissão e convites (Priority: P1) 🎯 MVP

- [X] T003 [P] [US1] {FR-044} Create acceptance test stub for invites API in existing backend suite ← plan:AcceptanceTestStubs
- [X] T004 [P] [US1] {FR-045} Create acceptance test stub for invites listing in existing backend suite ← plan:AcceptanceTestStubs
- [X] T005 [US1] {FR-045} Create Invite model in backend/src/models/Invite.js → exports: deriveState(row,now), suspendInviteVisitors(db,inviteId,cause,authorId) [VERIFY: cd backend && node --test src/routes/invites.test.js]
- [X] T006 [US1] {FR-044} Emit invite: token só no 201, 409 encerrado in backend/src/routes/invites.js ← T002:recordAccess → exports: createInvite(req,res) [VERIFY: cd backend && node --test src/routes/invites.test.js]
- [X] T007 [US1] {FR-045} [COMPLETES FR-045] List/revoke with derived state in backend/src/routes/invites.js after:T005 ← T005:deriveState → exports: listInvites(req,res), revokeInvite(req,res) [VERIFY: cd backend && node --test src/routes/invites.test.js]
- [X] T008 [US1] {FR-044} [COMPLETES FR-044] Add _emitDialog and token-free listing in frontend/lib/screens/invites_screen.dart after:T007 → exports: _emitDialog() [VERIFY: cd frontend && flutter analyze lib/screens/invites_screen.dart]

## Phase 3: Delivery [US2] - Cadastro e escopo (Priority: P1)

- [X] T009 [P] [US2] {FR-046} Create acceptance test stub for public registration in existing backend suite ← plan:AcceptanceTestStubs
- [X] T010 [P] [US2] {FR-047} Create acceptance test stub for visitor scope in existing backend suite ← plan:AcceptanceTestStubs
- [X] T011 [US2] {FR-046} Add deriveUsername and User.create helpers in backend/src/models/User.js → exports: deriveUsername(email), User.create(fields) [VERIFY: cd backend && node --test src/routes/auth.test.js]
- [X] T012 [US2] {FR-046} Register by token: rate limit and uniform 409 in backend/src/routes/invites.js after:T011 ← T011:deriveUsername ← T002:recordAccess → exports: registerByToken(req,res) [VERIFY: cd backend && node --test src/routes/invites.test.js]
- [X] T013 [US2] {FR-047} Derive visitorScope per request in backend/src/middleware/auth.js → exports: visitorScope(db,userId) [VERIFY: cd backend && node --test src/middleware/auth.test.js]
- [X] T014 [US2] {FR-047} Scope list/detail to invite contract in backend/src/routes/tasks.js after:T013 ← T013:visitorScope → exports: canSeeTask(task,scope) [VERIFY: cd backend && node --test src/routes/tasks.test.js]
- [X] T015 [US2] {FR-047} [COMPLETES FR-047] Filter list by visitor scope in frontend/lib/screens/tasks_screen.dart after:T014 [VERIFY: cd frontend && flutter analyze lib/screens/tasks_screen.dart]
- [X] T016 [US2] {FR-046} [COMPLETES FR-046] Build public registration form for invite token in Flutter frontend after:T012 [VERIFY: cd frontend && flutter analyze lib/screens/invite_register_screen.dart]

## Phase 4: Delivery [US3] - Reavaliação e histórico (Priority: P1)

- [X] T017 [P] [US3] {FR-048} Create acceptance test stub for role matrix in existing backend suite ← plan:AcceptanceTestStubs
- [X] T018 [P] [US3] {FR-049} Create acceptance test stub for reevaluation in existing backend suite ← plan:AcceptanceTestStubs
- [X] T019 [P] [US3] {FR-050} Create acceptance test stub for access history in existing backend suite ← plan:AcceptanceTestStubs
- [X] T020 [US3] {FR-048} Accept visitante in requireRole matrix in backend/src/middleware/auth.js → exports: requireRole(roles) [VERIFY: cd backend && node --test src/middleware/auth.test.js]
- [X] T021 [US3] {FR-049} Reevaluate with commit revalidation and precedence in backend/src/routes/users.js after:T005 ← T005:deriveState ← T002:recordAccess → exports: reevaluateVisitor(req,res), assertActiveVisitor(db,userId) [VERIFY: cd backend && node --test src/routes/users.test.js]
- [X] T022 [US3] {FR-049} [COMPLETES FR-049] Add _reavaliarDialog in frontend/lib/screens/users_screen.dart after:T021 → exports: _reavaliarDialog() [VERIFY: cd frontend && flutter analyze lib/screens/users_screen.dart]
- [X] T023 [US3] {FR-050} [COMPLETES FR-050] Add _historicoList audit view in frontend/lib/screens/users_screen.dart after:T021 → exports: _historicoList() [VERIFY: cd frontend && flutter analyze lib/screens/users_screen.dart]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T024 [P] Audit token out of app/access logs in backend/src/routes/invites.js after:T012 [VERIFY: cd backend && node --test src/routes/invites.test.js]
- [X] T025 [P] Check backend dependencies [VERIFY: cd backend && npm audit]
- [X] T026 Regressão final: suítes verdes after:T023 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test]

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

- `after:T###` exige conclusão prévia; `← T###:Symbol` consome o `→ exports:` do produtor.
- Lotes `[P]` paralelos nunca misturam tarefa e dependência.
- Stubs RED precedem a implementação do mesmo reqID; verificações rodam antes da conclusão.
