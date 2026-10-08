# Tasks: Ciclo de domínio, papéis e acesso (E001)

## Phase 1: Delivery [US1] Ciclo de domínio verificado (P1) 🎯 MVP

- [X] T001 [US1] {FR-001,FR-004} Create acceptance test stub for backend/src/routes/domains.js in backend/src/routes/domains.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-001 habilitação atômica" backend/src/routes/domains.test.js && grep "FR-004 ciclo só system_admin" backend/src/routes/domains.test.js]
- [X] T002 [US1] {FR-002} Create acceptance test stub for backend/src/routes/auth.js in backend/src/routes/auth.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-002 JWT 24h e login" backend/src/routes/auth.test.js]
- [X] T003 [US1] {FR-003} Create acceptance test stub for backend/src/middleware/auth.js in backend/src/middleware/auth.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-003 suspensão bloqueia sessão" backend/src/middleware/auth.test.js]
- [X] T004 [P] [US1] {FR-001} Verde do stub: habilitação em operação única em backend/src/routes/domains.js + backend/src/config/database.js; 500 sem reaproveitar registro → exports: enableDomain(), createDomainDb() [VERIFY: node --test backend/src/routes/domains.test.js]
- [X] T005 [P] [US1] {FR-002} Verde do stub: login por e-mail ou username, JWT 24 h e papel automático em backend/src/routes/auth.js + backend/src/middleware/auth.js → exports: domainSession(), signJwt() [VERIFY: node --test backend/src/routes/auth.test.js]
- [X] T006 [US1] {FR-003} Verde do stub: suspensão devolve 403 sem apagar nada; reativação restaura o acesso em backend/src/middleware/auth.js + backend/src/routes/domains.js → exports: assertDomainActive() [VERIFY: node --test backend/src/middleware/auth.test.js]
- [X] T007 [US1] {FR-004} Verde do stub: ciclo restrito ao system_admin em backend/src/routes/domains.js → exports: requireSystemAdmin [VERIFY: node --test backend/src/routes/domains.test.js]

## Phase 2: Delivery [US2] Permissão mínima por papel (P1) 🎯 MVP

- [X] T008 [US2] {FR-005,FR-007} Create acceptance test stub for backend/src/middleware/auth.js in backend/src/middleware/auth.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-005 401/403 deny by default" backend/src/middleware/auth.test.js && grep "FR-007 escopo de domínio" backend/src/middleware/auth.test.js]
- [X] T009 [US2] {FR-006} Create acceptance test stub for backend/src/routes/contracts.js in backend/src/routes/contracts.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-006 matriz dos quatro papéis" backend/src/routes/contracts.test.js]
- [X] T010 [US2] {FR-008} Create acceptance test stub for backend/src/routes/users.js in backend/src/routes/users.test.js ← plan:AcceptanceTestStubs [VERIFY: grep "FR-008 CRUD usuários e 409" backend/src/routes/users.test.js]
- [X] T011 [US2] {FR-005} Verde do stub: 401 sem token, 403 com papel errado e deny by default em backend/src/middleware/auth.js + backend/src/server.js → exports: authenticateToken(), requireRole() [VERIFY: node --test backend/src/middleware/auth.test.js]
- [X] T012 [US2] {FR-006} Verde do stub: matriz dos quatro papéis nas rotas de negócio em backend/src/routes/contracts.js ← T011:requireRole [VERIFY: node --test backend/src/routes/contracts.test.js]
- [X] T013 [US2] {FR-007} Verde do stub: recusa parâmetro ou recurso de outro domínio antes da consulta em backend/src/middleware/auth.js + backend/src/config/database.js → exports: scopeDomain(), getDomainDb() [VERIFY: node --test backend/src/middleware/auth.test.js]
- [X] T014 [US2] {FR-008} Verde do stub: CRUD de usuários do domínio e 409 com username repetido em backend/src/routes/users.js + backend/src/models/User.js → exports: createUser(), User.findByUsername() [VERIFY: node --test backend/src/routes/users.test.js]

## Phase 3: Delivery [US3] Superfície da interface por papel (P2)

- [X] T015 [P] [US3] {FR-009} Verde do cenário: navegação só com entradas do papel em frontend/lib/main.dart → exports: _entriesForRole(), _resolveRole() [VERIFY: grep "_entriesForRole" frontend/lib/main.dart]
- [X] T016 [P] [US3] {FR-009} Verde do cenário: papel no login e ações ocultas quando o backend nega em frontend/lib/screens/login_screen.dart → exports: LoginScreen._submit(), ApiService.login() [VERIFY: grep "_submit" frontend/lib/screens/login_screen.dart]

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T017 [P] Estende backend/test.sh com dois domínios, suspensão e 401/403 por rota (AD-003); corrige rota sem guarda se a regressão abrir gap [VERIFY: bash backend/test.sh]
- [X] T018 [P] Segurança: npm audit e JWT_SECRET em backend/.env.example; /uploads fora da verificação de suspensão [VERIFY: npm --prefix backend audit --audit-level=high]
- [X] T019 Suíte unitária completa verde com a porta 3001 livre (HINT-003) antes do roteiro fim a fim [VERIFY: npm --prefix backend test]
- [X] T020 Roteiro fim a fim de 28 checks no stack Docker com dois domínios: ciclo do domínio completo, 401/403 por rota e navegação por papel (SC-001..SC-005)

## Dependencies

Delivery (US1 → US2 → US3) → Polish; ordem de fase vale, sem `after:`. Stubs precedem a implementação do mesmo requisito (HINT-001). Tasks `[P]` são paralelas; `[VERIFY: cmd]` roda da raiz antes de `[X]`.

## Phase: Bug Fixes
- [X] T021 [BUG:ERROR] {FR-005} [security-vuln] join_domain aceita cliente sem token e entrega eventos de qualquer domínio — backend/src/server.js:77
- [X] T022 [BUG:ERROR] {FR-002} [requirement-gap] Login com domainId inexistente devolve 404; spec §Edge Cases exige 401/403 — backend/src/routes/auth.js:91
- [X] T023 [BUG:ERROR] {FR-009} [requirement-gap] Botão de avanço de status visível a admin/gestor termina em 403 — frontend/lib/widgets/task_list_tile.dart:103
- [X] T024 [BUG:ERROR] {FR-006} [requirement-gap] Matriz README 'atualizar status' e 'concluir' (admin/gestor ✅) não aplicada no backend — backend/src/routes/tasks.js:52
- [X] T025 [BUG:WARNING] {FR-009} [requirement-gap] Prestador sem caminho de conclusão com texto: avanço para Concluída devolve 400 — frontend/lib/widgets/task_list_tile.dart:103