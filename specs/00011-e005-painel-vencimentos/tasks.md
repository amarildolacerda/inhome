# Task List: Painel de próximos vencimentos E005 (00011)

Generated: 2026-10-11 | Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | P1: FR-001..FR-007

## Setup

- [X] T001 [P] {FR-001} RED: sete test.todo (FR-001..FR-007) anexados a alerts.test.js marcando os blocos de aceitação pendentes — backend/src/routes/alerts.test.js [VERIFY: node --test backend/src/routes/alerts.test.js]

## Foundational

- [X] T002 {FR-001} Exportar daysUntil de services/alerts.js e acrescentar parseWindowsStrict (400 em inválido, null vira reset) ao lado de readWindows — backend/src/services/alerts.js [VERIFY: node --check backend/src/services/alerts.js]
- [X] T003 {FR-004} listPanel: SELECT único com EXISTS em alert_events (contrato × janela atribuída), CASE de atribuição por daysUntil, ORDER BY forecast_date, id com limit (1–200) e offset — backend/src/routes/alerts.js ← T002:daysUntil [VERIFY: node --check backend/src/routes/alerts.js]
- [X] T004 {FR-001} listPanel: seções do payload: blocos derivados dos itens (campo window), fora das janelas, incompletos com contagem, catch 500 — backend/src/routes/alerts.js ← T003:listPanel [VERIFY: node --test backend/src/routes/alerts.test.js]
- [X] T005 {FR-005, FR-006} GET e PUT /api/alerts/windows sob requireRole('admin','gestor') + scopeDomain: GET via readWindows, PUT grava domains.alert_windows via parseWindowsStrict (400 inválido, null reset) — backend/src/routes/alerts.js ← T002:parseWindowsStrict [VERIFY: node --check backend/src/routes/alerts.js]
- [X] T006 {FR-004} Índice idx_contracts_forecast em DOMAIN_INDEXES (ensureIndexes, idempotente, após applySchema) — backend/src/config/database.js [VERIFY: node --check backend/src/config/database.js]

## Delivery [US1]

- [X] T007 {FR-003} [COMPLETES FR-003] US1 Escopo fim a fim: prestador 403 em painel e janelas, domínio divergente 403, nenhuma leitura antes do 403 — backend/src/routes/alerts.test.js [VERIFY: npm --prefix backend test]
- [X] T008 {FR-001} US1 Agrupamento e ordenação: contratos a 10/25/45/120 dias nos blocos 15/30/60 com o mais urgente no topo, 120 fora das janelas, incompletos com contagem — backend/src/routes/alerts.test.js ← T004:listPanel [VERIFY: npm --prefix backend test]
- [X] T009 {FR-002} [COMPLETES FR-002] US1 Alertado: linha em alert_events da janela atribuída marca true, sem linha false, inclusão janela ≥ dias na virada do dia — backend/src/routes/alerts.test.js ← T003:listPanel [VERIFY: npm --prefix backend test]
- [X] T010 {FR-004} [COMPLETES FR-004] US1 Paginação limit/offset estável entre páginas com desempate por id, incompletos primeiro, leitura única por requisição — backend/src/routes/alerts.test.js ← T003:listPanel [VERIFY: npm --prefix backend test]
- [X] T011 [US1] {FR-001} [COMPLETES FR-001] Tela VencimentosScreen (blocos, marcação, lista incompleta) com _NavEntry de admin|gestor em main.dart e ApiService.getPanel — frontend/lib/screens/vencimentos_screen.dart ← T004:listPanel [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"]

## Delivery [US2]

- [X] T012 {FR-005} US2 GET windows devolve default 90/60/30/15 sem setup e o valor custom do domínio após gravação — backend/src/routes/alerts.test.js ← T005:getWindows [VERIFY: npm --prefix backend test]
- [X] T013 {FR-006} [COMPLETES FR-006] US2 PUT windows: gravação válida persiste, inválida 400 sem efeito, restauração null devolve o default — backend/src/routes/alerts.test.js ← T005:putWindows [VERIFY: npm --prefix backend test]
- [X] T014 {FR-007} [COMPLETES FR-007] US2 Releitura e varredura: config nova reflete no painel e é observada pela varredura seguinte sem reinício, sem regravar alert_events — backend/src/routes/alerts.test.js ← T005:putWindows [VERIFY: npm --prefix backend test]
- [X] T015 [US2] {FR-005} [COMPLETES FR-005] Configuração de janelas na tela (ler, editar, restaurar padrão) via ApiService.put com erro 400 visível — frontend/lib/screens/vencimentos_screen.dart ← T005:getWindows,putWindows [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"]

## Polish

- [X] T016 Bateria zero-regressão: rebuild do backend, unit ≥129, smoke 118/118 em 3199, flutter 16/16, analyze limpo, audit 0 — backend/ [VERIFY: bash backend/test.sh]
- [X] T017 Higiene final: node --check em todo backend/src, TODO.md verificado, marcador .completed escrito — specs/00011-e005-painel-vencimentos/ [VERIFY: find backend/src -name '*.js' -print0 | xargs -0 -n1 node --check]

## Dependencies

- T002 é a base de T003/T005: mesma aritmética e validação do motor (STF-001/002).
- T003–T004 compõem listPanel; guards requireRole/scopeDomain já ligados em routes/alerts.js (E004) — consumo.
- T006 entra antes da bateria (índice preguiçoso idempotente, padrão do E004).
- T007–T010 dependem de T003–T004; T011 do contrato de T004; T012–T014 de T005; T015 de T005.
- T016 depende de todas as tasks de Delivery; rebuild obrigatório (backend sem bind mount). T017 depende de T016.
- readWindows, runExpirySweep, DEFAULT_WINDOWS (E004) e escopo de domínio (E001) são consumo, sem entrega nova.
