# Task List: Motor de alertas de vigência E004 (00009)

Generated: 2026-10-11 | Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | P1: FR-001..FR-006

## Setup

- [X] T001 [P] Scaffold dos módulos novos com cabeçalho e export vazio; imports de email.js, events.js e database.js ligados — backend/src/services/alerts.js [VERIFY: node --check backend/src/services/alerts.js]
- [X] T002 [P] {FR-001} [COMPLETES FR-001] Migração preguiçosa de alert_events em migrateSchema com guarda tableExists idempotente — backend/src/config/database.js → exports: migrateSchema [VERIFY: node --check backend/src/config/database.js]
- [X] T003 [P] {FR-005} [COMPLETES FR-005] Branch platform em migrateSchema com guarda PRAGMA table_info(domains) para coluna aditiva alert_windows TEXT — backend/src/config/database.js [VERIFY: node --check backend/src/config/database.js]

## Foundational

- [X] T004 {FR-005} readWindows(domínio): parse de alert_windows com default [90,60,30,15] em NULL e validação de array de inteiros — backend/src/services/alerts.js [→ exports: readWindows] [VERIFY: node --test backend/src/routes/alerts.test.js]
- [X] T005 {FR-002} [COMPLETES FR-002] runExpirySweep: itera domínios ativos, calcula janelas sobre forecast_date e retorna contadores; exporta runExpirySweep — backend/src/services/alerts.js [→ exports: runExpirySweep] ← T004:readWindows [VERIFY: node --check backend/src/services/alerts.js]

## Delivery [US1]

- [X] T006 {FR-003} [COMPLETES FR-003] US1 Dedup: INSERT idempotente com UNIQUE(contract_id, window_days) gravado antes do envio — backend/src/services/alerts.js [VERIFY: node --test backend/src/routes/alerts.test.js]
- [X] T007 {FR-004} [COMPLETES FR-004] US1 Aviso em aplicativo: emitDomainEvent na sala domain_<id> na emissão — backend/src/services/alerts.js [VERIFY: node --test backend/src/routes/alerts.test.js]
- [X] T008 {FR-002} US1 Varredura agendada: boot + setInterval 60 min em start() com catch, fora do caminho de requisição; suspenso pulado; erro por domínio engolido — backend/src/server.js ← T005:runExpirySweep [VERIFY: node --check backend/src/server.js]

## Delivery [US2]

- [X] T009 {FR-005} [COMPLETES FR-005] US2 Janelas observadas: default sem setup e janelas alteradas mudam a passagem seguinte — backend/src/services/alerts.js ← T004:readWindows [VERIFY: node --test backend/src/routes/alerts.test.js]

## Delivery [US3]

- [X] T010 {FR-006} US3 E-mail opt-in: notifyFn injetável com default notify(); Promise.race timeout 5 s; email_status sent/failed/skipped — backend/src/services/alerts.js [→ exports: runExpirySweep] [VERIFY: node --test backend/src/routes/alerts.test.js]
- [X] T011 {FR-006} US3 Endpoint manual: POST /api/alerts/sweep com requireRole admin + scopeDomain, dispara uma passagem e retorna contadores parciais — backend/src/routes/alerts.js [→ exports: mountAlertsRouter] ← T010:runExpirySweep [VERIFY: node --check backend/src/routes/alerts.js]
- [X] T012 {FR-006} [COMPLETES FR-006] US3 Wire-up: montagem do router em server.js com guarda de domínio — backend/src/server.js ← T011:mountAlertsRouter [VERIFY: node --check backend/src/server.js]

## Polish

- [X] T013 Testes de aceite: stubs RED viram testes verdes para as seis exigências P1 (migração, janelas, dedup, sala, SMTP on/off/timeout) — backend/src/routes/alerts.test.js [VERIFY: npm --prefix backend test]
- [X] T014 Testes de migração: guards de alert_events e alert_windows idempotentes em database.test.js — backend/src/config/database.test.js [VERIFY: npm --prefix backend test]
- [X] T015 Bateria zero-regressão: rebuild backend, test.sh 118/118, flutter 16/16, audit 0 — backend/ [VERIFY: bash backend/test.sh]
- [X] T016 Higiene final: node --check em todo backend/src, TODO.md verificado, marcadores .completed — specs/00009-e004-motor-alertas/ [VERIFY: find backend/src -name '*.js' -print0 | xargs -0 -n1 node --check]

## Dependencies

- T002, T003 dependem do schema atual (E001–E002 entregues em database.js).
- T004–T007, T009, T010 dependem das migrações (T002, T003).
- T008 e T012 dependem de runExpirySweep exportado (T005).
- T011 depende de notifyFn e contadores (T010).
- T013–T016 dependem de todas as tasks de Delivery.
- emitDomainEvent (E009), notify()/smtpConfigured() (email.js), scopeDomain (auth.js), forecast_date (E002) são consumo, sem entrega nova.
