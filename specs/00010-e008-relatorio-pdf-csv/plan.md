# Implementation Plan: Relatório de serviços executados E008 (00010)

**Branch**: `dev` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md) | **Mode**: LIGHTWEIGHT (hint `lightweight`)

## Technical Context

| Campo | Valor |
|---|---|
| Language/Version | Node.js 22+ (zlib nativo); Dart 3 (Flutter Web, regressão) |
| Primary Dependencies | Express, sql.js — **nenhuma dependência nova** (PDF writer próprio) |
| Storage | leitura: `contracts`/`tasks`/`task_photos` (db do domínio) + `backend/uploads/` (loja de fotos); nenhuma escrita |
| Testing | `node --test` + supertest (3001), `backend/test.sh` (3199), `flutter test` Docker, `flutter analyze` Docker |
| Primary Ext | `backend/src/services/report.js` (gap de embedding), testes em `backend/src/services/report.test.js` |
| Performance Goals | geração sob demanda sob 2 s para contrato do tamanho da suíte; p95 das listagens inalterado |
| Constraints | PDF sem dependência externa; geração transitória (nunca persiste); recusa antes de gerar; suíte verde |
| Scale/Scope | 2 US, 6 FR, 0 novas tabelas/rotas, 1 módulo de serviço alterado, ~1 arquivo de teste |

## Instructions Check

| Regra | Status |
|---|---|
| I–III (`dev`, testes, `TODO.md`), IV concisão | PASS |
| Stack, layout, QC (`flutter analyze`, `node --check`, `npm audit --audit-level=high`) | PASS |
| Complexity Tracking | ausente — sem violação |

## Architecture

```mermaid
C4Container
  title 00010 E008 verificação + embedding
  Person(gestor, "Gestor/Admin")
  Container(route, "GET /:id/report.pdf|.csv", "routes/contracts.js (entregue)")
  Container(report, "generateContractPdf / exportContractCsv", "services/report.js")
  Container(embed, "embedImage (novo)", "JPEG DCTDecode + PNG Flate/SMask + fallback textual")
  ContainerDb(db, "domain db", "contracts/tasks/task_photos (leitura)")
  ContainerFs(up, "backend/uploads/", "loja same-origin (E003)")
  Rel(gestor, route, "papel admin|gestor + scopeDomain")
  Rel(route, report, "gera sob demanda")
  Rel(report, db, "loadReportData")
  Rel(report, embed, "FR-001 fotos por task")
  Rel(embed, up, "lê bytes; ausente → textual")
```

## Architecture Decisions

| ID | Questão (opções) | Escolha | Rationale |
|----|------------------|---------|-----------|
| AD-001 | Embedding por formato: converter tudo / JPEG-only / por-formato com fallback | JPEG `DCTDecode` cru; PNG concat IDAT → `FlateDecode`+preditor (alpha via unfilter + SMask); `webp`/`gif`/ilegível → linha textual | zero dependência (zlib nativo); fixture real da loja é PNG; fallback cumpre "documento segue" |
| AD-002 | Escopo de mudança: rota nova / serviço | só `services/report.js` + testes; rotas e guards entregues intactos | leitura pura (project-plan:71); guards `requireRole`+`scopeDomain` já ligados (contracts.js:342,345,354,355) |
| AD-003 | Passagem de dados das fotos | `loadReportData` devolve `photo_paths` por tarefa (uma leitura) | evita re-query por imagem; PDF e CSV compartilham a mesma fonte (SC-004) |
| AD-004 | Testabilidade de foto ausente | fixture PNG temporário criado no `before` do teste; cenário de ausência apaga SÓ a cópia temporária e restaura | nunca destrói fixture real; 200 + textual assertável |

## Data Model Summary

Sem mudança de esquema. Leitura de `contracts`, `tasks`, `task_photos(path)`; bytes de `backend/uploads/<path>`.

## API Surface Summary

Sem rota nova. Superfície existente verificada: `GET /api/contracts/:id/report.pdf` e `GET /api/contracts/:id/report.csv` (`requireRole('admin','gestor')` + `scopeDomain()`).

## Testing Strategy

| Tier | Tool | Escopo | Mock Boundary | Install |
|---|---|---|---|---|
| Unit | `node --test`+supertest | FR-001..006 fim a fim (PDF container+embedding, CSV paridade, 403/404, vazio, 500) | fixtures temporários em uploads/ | configured |
| Integration | `backend/test.sh` (3199) | smoke 118/118 baseline | backend no ar | configured |
| Integration | `flutter test` (Docker) | regressão 16/16 baseline | ApiService mock | configured |
| Lint | `node --check` + `flutter analyze` (Docker) | sintaxe | — | configured |
| Security | `npm audit --audit-level=high` + 403/404 na suíte | dependências, escopo | — | configured |

## Acceptance Test Stubs

P1 = FR-001..FR-006 (6); testes em `backend/src/services/report.test.js`; RED `pending`.

| Req ID | Test File | Stub Blocks (framework-native) | RED Status |
|--------|-----------|--------------------------------|------------|
| FR-001 | backend/src/services/report.test.js | test.todo('FR-001 PDF embute imagem PNG da loja; ausente → textual e 200') | pending |
| FR-002 | backend/src/services/report.test.js | test.todo('FR-002 conteúdo contrato/tarefa/executor/datas/evidência') | pending |
| FR-003 | backend/src/services/report.test.js | test.todo('FR-003 contrato sem tarefas → documento vazio legível') | pending |
| FR-004 | backend/src/services/report.test.js | test.todo('FR-004 CSV paridade de linhas com PDF') | pending |
| FR-005 | backend/src/services/report.test.js | test.todo('FR-005 prestador 403; domínio divergente 403; desconhecido 404') | pending |
| FR-006 | backend/src/services/report.test.js | test.todo('FR-006 falha de leitura → 500 sem persistência') | pending |

## Error Handling Strategy

| Categoria | Padrão | Resposta | Retry |
|---|---|---|---|
| Papel/domínio sem permissão | guards já ligados | 403 antes de gerar | não |
| Contrato desconhecido/estrangeiro | `getContractOr404` no db do domínio | 404 antes de gerar | não |
| Foto ausente/corrompida/formato não suportado | try/catch por imagem em `embedImage` | linha textual preservada, geração segue | não |
| Falha de leitura do banco | catch do handler | 500 com mensagem; nada persistido | não |
| Contrato sem tarefas | lista vazia | cabeçalho + `(vazio)` / CSV só cabeçalho | não |

## Risk Mitigation

| Risk (from spec) | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| PNG alpha mal embutido | medium | medium | unfilter + SMask testado com fixture PNG real | `services/report.js` |
| Escopo vazando no download | low | high | 403/404 na suíte fim a fim (FR-005) | `services/report.test.js` |

## Requirement Coverage Map

| Req ID | File Path(s) | Function(s)/Symbol(s) | Decision |
|--------|--------------|------------------------|----------|
| FR-001 | backend/src/services/report.js | embedImage (novo), generateContractPdf | AD-001, AD-004 (cenário de foto ausente na suíte) |
| FR-002 | backend/src/services/report.js | generateContractPdf, loadReportData | AD-003 |
| FR-003 | backend/src/services/report.js | generateContractPdf, exportContractCsv | AD-002 |
| FR-004 | backend/src/services/report.js | exportContractCsv (paridade com linhas do PDF) | AD-003 |
| FR-005 | backend/src/routes/contracts.js | requireRole, scopeDomain, getContractOr404 (já entregues) | AD-002 |
| FR-006 | backend/src/routes/contracts.js | reportPdf/reportCsv catch → 500 (entregue) | AD-002 |

## Error Handling Notes

Nenhum caminho propaga exceção de embedding para o handler: a geração só falha por erro de leitura do banco (500).

## Project Structure

### Source Code

```text
M backend/src/services/report.js (FR-001/AD-001: embedImage + photo_paths em loadReportData)
M backend/src/services/report.test.js (FR-001..006 acceptance)
A specs/00010-e008-relatorio-pdf-csv/research.md (minimal research: embedding JPEG/PNG zero-dep)
```

## Dependencies

- `services/report.js`, rotas e guards entregues pela base (E001/E002/E003) — consumo.
- `backend/uploads/` (E003) — leitura da loja; nenhuma escrita.
- `zlib` do Node — única ferramenta nova de embedding; nenhuma dependência npm nova.
