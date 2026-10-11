# Implementation Tasks: Comunicação em tempo real E009 (00008)

**Branch**: `dev` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Mode**: lightweight verification (transporte entregue; só provas)

**Note**: épica P2 — sem requisito P1. AD-001..004 conforme [plan.md](plan.md).

## Dependencies

- `socket.io-client` (já em `backend/node_modules` via Socket.io server) — cliente para testes ponta a ponta
- `supertest` (já em `backend/node_modules`) — mutações HTTP nos testes
- `docker compose build backend && docker compose up -d backend` — backend image sem bind mount
- Baseline bateria: unit **111/111**, smoke **118/118**, flutter **16/16**, analyze limpo, audit 0

## Phase 1: Setup [baseline]

- [X] T001 Capture baseline da bateria antes das provas e construa a imagem do backend: `docker compose stop backend` e `npm --prefix backend test` (esperado 111/111); `bash backend/test.sh` (esperado 118/118); depois `docker compose build backend && docker compose up -d backend`. [VERIFY: docker compose ps]

## Phase 2: Delivery [US1] [US2]

- [X] T002 {FR-001} [COMPLETES FR-001] Teste ponta a ponta em server.socket.test.js: mutação de tarefa via HTTP (supertest) publica `task:updated` na sala `domain_<id>`; segundo cliente socket.io do mesmo domínio recebe o evento sem recarregar; asserta payload mínimo e sala correta. [after:T001] [VERIFY: node --test --test-name-pattern FR-001 backend/src/server.socket.test.js]

- [X] T003 {FR-002} [COMPLETES FR-002] Teste de isolamento em server.socket.test.js: sessão de outro domínio não recebe o evento da mutação; asserta não-recebimento com timeout curto (600 ms, precedente `leaked=false`). [after:T002] [VERIFY: node --test --test-name-pattern FR-002 backend/src/server.socket.test.js]

- [X] T004 {FR-003} [COMPLETES FR-003] Teste de inércia da falha em server.socket.test.js: `setEmitter(fn)` com fn que lança exceção; executar mutação de tarefa; asserta resposta HTTP 2xx e que a emissão retornou `false`; restaura emitter original em `finally`. [after:T003] [VERIFY: node --test --test-name-pattern FR-003 backend/src/server.socket.test.js]

- [X] T005 {FR-004} [COMPLETES FR-004] Teste de emitter ausente em server.socket.test.js: remover emitter registrado; `emitDomainEvent('task:updated', domainId, payload)` retorna `false` sem lançar; sem replay — asserção de sem-fila via timeout sem evento na reconexão. [after:T004] [VERIFY: node --test --test-name-pattern FR-004 backend/src/server.socket.test.js]

## Phase 3: Polish [battery]

- [X] T006 Bateria completa pós-provas: `npm --prefix backend test` (≥111/111, inclui os 4 novos); `bash backend/test.sh` (118/118 sem regressão); `docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"` (analyze limpo, 16/16); `node --check backend/src/server.js`; `npm --prefix backend audit --audit-level=high` (0). [after:T005] [VERIFY: npm --prefix backend test]

- [X] T007 Marca `.completed`; grava `manual-test.md` (5 cenários humanos: 2-janela task:updated sem reload; token expirado na reconexão; domínio suspenso não conecta; emitter caindo com mutação ainda confirmando; reconexão relendo do banco sem replay); grava `qc-report.md` BLOCKED com manifesto SHA-256; Run Summary no autopilot-log. Sem commit. [after:T006] [→ exports: none]
