# Tasks: Chat colaborativo por contrato (00017)

**Input**: `specs/00017-chat-colaborativo-contrato/` · **Epic**: E016

## Project Mode

`Brownfield`: Node/Express + sql.js + Flutter Web; 0 dependência nova.

## Epic / Capability Map

- `[US1]` canal, anexos, guards (FR-051..055)
- `[US2]` menu e cards (FR-056..058)
- `[US3]` extração e alertas (FR-059..061)

## Phase 1: Foundational (Cross-Work-Item Blockers)

- [X] T001 [P] {FR-051} Add chat tables and attachments rebuild in backend/src/config/database.js → exports: CHAT_MESSAGES_DDL [VERIFY: cd backend && node --test src/config/database.test.js]
- [X] T002 {FR-059,FR-060,FR-061} Create local extractor, dedup and retry in backend/src/services/documentAnalysis.js after:T001 [VERIFY: cd backend && node --test src/services/documentAnalysis.test.js]

## Phase 2: Delivery [US1] - Canal e anexos (Priority: P1) 🎯 MVP

- [X] T003 [P] [US1] {FR-051,FR-052,FR-053,FR-054,FR-055} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T004 [US1] {FR-051} Add paginated history and body limit in backend/src/routes/chat.js → exports: listMessages [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T005 [US1] {FR-052} Emit eligible-recipient event in backend/src/routes/chat.js → exports: emitChatMessage [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T006 [US1] {FR-053} Add contract guard in backend/src/routes/chat.js → exports: assertChatAccess [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T007 [US1] {FR-054} Add chat upload in backend/src/routes/chat.js → exports: postMessage [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T008 [US1] {FR-055} [COMPLETES FR-055] Exclude chat category in backend/src/routes/attachments.js → exports: listAttachments [VERIFY: cd backend && node --test src/routes/attachments.test.js]
- [X] T009 [US1] {FR-051} [COMPLETES FR-051] Build chat screen and composer in Flutter frontend after:T004 [VERIFY: cd frontend && flutter analyze lib/screens/chat_screen.dart]

## Phase 3: Delivery [US2] - Menu e cards (Priority: P1)

- [X] T010 [P] [US2] {FR-056,FR-057,FR-058} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T011 [US2] {FR-056} Add three menu endpoints in backend/src/routes/chat.js → exports: menuAlerts, menuUpcoming, menuCompleted [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T012 [US2] {FR-057} Add card action with Task.FLOW in backend/src/routes/chat.js → exports: cardAction [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T013 [US2] {FR-058} [COMPLETES FR-058] Restrict cards and menu by role in backend/src/routes/chat.js → exports: visibleTasks [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T014 [US2] {FR-056} [COMPLETES FR-056] Render menu and cards in Flutter chat screen after:T011 [VERIFY: cd frontend && flutter analyze lib/screens/chat_screen.dart]
- [X] T015 [US2] {FR-057} [COMPLETES FR-057] Wire card action in Flutter chat screen after:T012 [VERIFY: cd frontend && flutter analyze lib/screens/chat_screen.dart]

## Phase 4: Delivery [US3] - Extração e alertas (Priority: P1)

- [X] T016 [P] [US3] {FR-059,FR-060,FR-061} Create acceptance stubs ← plan:AcceptanceTestStubs
- [X] T017 [US3] {FR-059} Wire analysis into message list in backend/src/routes/chat.js after:T002 [VERIFY: cd backend && node --test src/routes/chat.test.js]
- [X] T018 [US3] {FR-060} Expose extracted alerts on E005 panel after:T002 [VERIFY: cd backend && node --test src/routes/alerts.test.js]
- [X] T019 [US3] {FR-061} [COMPLETES FR-061] Add failure state and retry in Flutter chat screen after:T002 [VERIFY: cd frontend && flutter analyze lib/screens/chat_screen.dart]

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T020 [P] Keep chat attachments out of evidence and audit logs [VERIFY: cd backend && npm test]
- [X] T021 [P] Check backend dependencies [VERIFY: cd backend && npm audit]
- [X] T022 Regressão final: suítes verdes after:T019 [VERIFY: cd backend && npm test] [VERIFY: bash backend/test.sh] [VERIFY: cd frontend && flutter test]

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

- `after:T###` exige conclusão prévia; `← T###:Symbol` consome `→ exports:`.
- Stubs RED precedem a implementação; verificações rodam antes da conclusão.
- Migração preguiçosa; emissão de evento nunca falha o envio; visitante 403.
