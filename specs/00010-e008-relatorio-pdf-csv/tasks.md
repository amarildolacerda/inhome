# Task List: Relatório de serviços executados E008 (00010)

Generated: 2026-10-11 | Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | P1: FR-001..FR-006

## Setup

- [X] T001 [P] {FR-001} RED: seis test.todo (FR-001..FR-006) em report.test.js marcando os blocos de aceitação pendentes — backend/src/services/report.test.js [VERIFY: node --test backend/src/services/report.test.js]

## Foundational

- [X] T002 {FR-001} loadReportData devolve photo_paths por tarefa na mesma leitura da contagem — backend/src/services/report.js [VERIFY: node --check backend/src/services/report.js]
- [X] T003 {FR-001} embedImage: detecção de magic bytes, JPEG DCTDecode cru com dimensões via parse do SOF — backend/src/services/report.js ← T002:loadReportData [VERIFY: node --check backend/src/services/report.js]
- [X] T004 {FR-001} embedImage PNG: concat de IDAT em stream FlateDecode com DecodeParms preditor 15; alpha (4/6) via unfilter de scanlines e SMask DeviceGray — backend/src/services/report.js ← T003:embedImage [VERIFY: node --test backend/src/services/report.test.js]
- [X] T005 {FR-001} Fallback textual para webp/gif/ausente/ilegível com try/catch por imagem ligado em generateContractPdf — backend/src/services/report.js ← T004:embedImage [VERIFY: node --test backend/src/services/report.test.js]

## Delivery [US1]

- [X] T006 {FR-002} [COMPLETES FR-002] US1 GREEN: conteúdo do PDF assertado fim a fim (contrato, tarefa, executor, datas, status, evidência, contagem) — backend/src/services/report.test.js [VERIFY: npm --prefix backend test]
- [X] T007 {FR-003} [COMPLETES FR-003] US1 Documento vazio: contrato sem tarefas gera PDF com cabeçalho e `(vazio)` e CSV só cabeçalho, sem erro; corrige a geração se necessário — backend/src/services/report.test.js [VERIFY: npm --prefix backend test]
- [X] T008 {FR-001} [COMPLETES FR-001] US1 Cenário de foto ausente: fixture PNG temporário apagado responde 200 com linha textual preservada, restaurado após — backend/src/services/report.test.js ← T005:embedImage [VERIFY: npm --prefix backend test]

## Delivery [US2]

- [X] T009 {FR-004} [COMPLETES FR-004] US2 Paridade PDF↔CSV: mesmo contrato produz o mesmo conjunto de linhas de dados com cabeçalho `contract_id,...` — backend/src/services/report.test.js ← T002:loadReportData [VERIFY: npm --prefix backend test]
- [X] T010 {FR-005} [COMPLETES FR-005] US2 Escopo fim a fim: prestador 403, domainId explícito divergente 403, id desconhecido/estrangeiro 404, 0 relatórios gerados — backend/src/services/report.test.js [VERIFY: npm --prefix backend test]
- [X] T011 {FR-006} [COMPLETES FR-006] US2 Falha de leitura responde 500 com mensagem, nada persistido, repetição manual como única via — backend/src/services/report.test.js [VERIFY: npm --prefix backend test]

## Polish

- [X] T012 Bateria zero-regressão: rebuild do backend, unit 123/123, smoke 118/118 em 3199, flutter 16/16 + analyze limpo, audit 0 — backend/ [VERIFY: bash backend/test.sh]
- [X] T013 Higiene final: node --check em todo backend/src, TODO.md verificado, marcador .completed escrito — specs/00010-e008-relatorio-pdf-csv/ [VERIFY: find backend/src -name '*.js' -print0 | xargs -0 -n1 node --check]

## Dependencies

- T002–T005 dependem só de `services/report.js` entregue (E002/E003), sem esquema novo.
- T006–T011 dependem do embedding (T005) e dos guards já ligados em `routes/contracts.js` (E001).
- T012 depende de todas as tasks de Delivery; rebuild obrigatório (backend sem bind mount).
- T013 depende de T012.
- `loadReportData`, `buildPdf`, `pdfEscape`, `requireRole`, `scopeDomain`, `getDomainDb` (E001–E003) são consumo, sem entrega nova.
