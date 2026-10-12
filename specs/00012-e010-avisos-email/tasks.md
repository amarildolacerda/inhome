# Task List: Avisos por e-mail — envio opt-in por evento E010 (00012)

Generated: 2026-10-11 | Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | P1: nenhum (épica P2)

## Setup

- [X] T001 {FR-002} Setup: servidor fake SMTP local no padrão de email.test.js (220/250 EHLO, porta efêmera) com helper `fakeSmtp` exportado para os e2e de varredura e painel — backend/src/routes/alerts.test.js → exports: fakeSmtp [VERIFY: node --test backend/src/routes/alerts.test.js]

## Foundational

- [X] T002 {FR-003} listPanel: expor email_status da linha da janela atribuída (LEFT JOIN no mesmo EXISTS do CASE, null sem linha), demais seções do payload intactas — backend/src/routes/alerts.js → exports: listPanel [VERIFY: node --check backend/src/routes/alerts.js]
- [X] T003 {FR-004} Hygiene de env nos testes: SMTP_HOST/SMTP_PORT setados por teste e removidos no teardown, sem vazar para o modo inerte dos demais (HINT-002) — backend/src/services/email.test.js [VERIFY: node --test backend/src/services/email.test.js]

## Delivery [US1]

- [X] T004 [US1] {FR-001} [COMPLETES FR-001] US1 Quatro gatilhos com caminho real: atribuição, conclusão e reabertura enviam ao destinatário correto (atribuído; gestão) com resposta 200/201 preservada — backend/src/services/email.test.js, backend/src/routes/tasks.test.js [VERIFY: npm --prefix backend test]
- [X] T005 [US1] {FR-002} [COMPLETES FR-002] US1 Varredura e2e com notify padrão: contrato na janela gera um e-mail para creator_email, registro sent; segunda varredura não reenvia (SC-002) — backend/src/routes/alerts.test.js ← T001:fakeSmtp [VERIFY: npm --prefix backend test]
- [X] T006 [US1] {FR-003} US1 Painel expõe email_status (sent após e2e real; null sem evento na janela) sem alterar demais seções — backend/src/routes/alerts.test.js ← T002:listPanel [VERIFY: npm --prefix backend test]
- [X] T007 [US1] {FR-003} [COMPLETES FR-003] US1 Consumidor tolera campo aditivo: fixture do painel com email_status renderiza idêntico (blocos, marcação, incompletos) — frontend/test/vencimentos_screen_test.dart [VERIFY: docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"]

## Delivery [US2]

- [X] T008 [US2] {FR-004} [COMPLETES FR-004] US2 Modo inerte: quatro eventos sem SMTP_* não conectam no servidor fake, respostas 200/201, nenhum erro visível — backend/src/services/email.test.js, backend/src/routes/tasks.test.js [VERIFY: npm --prefix backend test]
- [X] T009 [US2] {FR-005} [COMPLETES FR-005] US2 Host morto (porta fechada): notify vira sent:false, painel expõe failed, resposta 200/201 e varredura completa com swept ≥ emailed+failed — backend/src/services/email.test.js, backend/src/routes/alerts.test.js ← T002:listPanel [VERIFY: npm --prefix backend test]
- [X] T010 [US2] {FR-006} [COMPLETES FR-006] US2 notify() nunca propaga exceção: rejeição interna capturada nos quatro gatilhos, nenhuma exceção sobe ao chamador — backend/src/services/email.test.js [VERIFY: node --test backend/src/services/email.test.js]

## Polish

- [X] T011 Bateria zero-regressão: rebuild do backend, unit ≥136, smoke 118/118 em 3199, flutter 23/23, analyze limpo, audit 0 — backend/ [VERIFY: bash backend/test.sh]
- [X] T012 Higiene final: node --check em todo backend/src, TODO.md verificado, marcador .completed escrito — specs/00012-e010-avisos-email/ [VERIFY: find backend/src -name '*.js' -print0 | xargs -0 -n1 node --check]

## Dependencies

- T001 fornece o fake SMTP usado por T005 e T009 em alerts.test.js.
- T002 é a base de T006 e T009 (leitura do campo); guards do painel já ligados (E005) — consumo.
- T003 garante que T004/T008 não se contaminam por env vazado entre testes.
- T004 depende de T003; T005/T006 de T001/T002; T008 de T003; T009 de T002; T010 herda o gate de T003.
- T011 depende de todas as tasks de Delivery; rebuild obrigatório (backend sem bind mount). T012 depende de T011.
- notify, smtpConfigured, runExpirySweep, alert_events.email_status e guards do painel (E001/E004/E005) são consumo, sem entrega nova.
