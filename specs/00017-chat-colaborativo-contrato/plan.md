# Implementation Plan: Chat colaborativo por contrato (00017)

**Branch**: dev · **Date**: 2026-11-21 · **Spec**: `spec.md` · **Epic**: E016

## Summary

**Goal**: canal por contrato com mensagens, cards e extração local em alertas.
**Approach**: 3 tabelas + rebuild de `attachments`; rotas em `/api/v2/contracts/:id/chat`; evento `domain_<id>`; cards reusam `Task.FLOW`.
**Key Constraint**: 0 provedor externo, 0 push, visitante negado, dedup pela tripla de origem.

## Instructions Check

| Regra | Status |
|---|---|
| I — `dev`, `main` intocada | PASS |
| II — suíte verde antes de promoção | PASS |
| III — TODO intake | PASS |
| IV — saída concisa | PASS |
| Stack / layout | PASS — brownfield, 0 dependência nova |
| QC mínimo | PASS — lint, segurança, unit |

**Instructions Check (2026-11-21): PASS** — 0 violações.

## Technical Context

| Campo | Valor |
|---|---|
| Language / Version | Dart 3 (Flutter Web) + Node.js ≥22 (Express, sql.js) |
| Primary Dependencies | Flutter/Material 3, express/sql.js, socket.io — 0 novas |
| Storage | SQLite: `chat_messages`, `document_analyses`, `extracted_alerts` + rebuild de `attachments` |
| Testing | `npm test`, `backend/test.sh`, `flutter test`, `flutter analyze` |
| Project Type | web multi-tenant, brownfield |
| Perf. Goals | histórico 50/página (máx. 100); análise assíncrona, timeout 5 s |
| Constraints | API em PT; tokens do ColorScheme; visitante 403; 0 saída de dados |
| Scale / Scope | 3 US P1 · 11 FR P1 · 8 endpoints · 3 tabelas + 1 rebuild |

## Architecture

`Flutter Web (chat + cards) → API /api/v2 (guards, chat, menu, análise) → SQLite por domínio (chat_messages, document_analyses, extracted_alerts)`. Eventos de domínio usam a sala `domain_<id>` já existente.

## Architecture Decisions

| ID | Decisão | Opções | Escolhida | Racional |
|----|---------|--------|-----------|----------|
| AD-001 | Histórico do canal | tabela nova / reuso `comments` | `chat_messages` com lazy CREATE | comentários são de tarefa e imutáveis; canal é por contrato |
| AD-002 | Anexo de mensagem | tabela paralela / rebuild de `attachments` | rebuild com `message_id` + `category='chat'` | mantém uma única tabela de anexos; STF-002 |
| AD-003 | Entrega em tempo real | sala por contrato / sala de domínio | sala `domain_<id>` com `contractId` + `allowedUserIds` no payload | infra E009 existente; STF-003 |
| AD-004 | Cards do menu | nova máquina / reuso do fluxo | leitura por endpoints + `Task.FLOW`/`markCompleted` | mesmas validações e histórico; STF-005 |
| AD-005 | Extração de documento | API externa / extrator local | serviço local determinístico, timeout 5 s, retry manual | Clarify: 0 custo, 0 saída de dados |
| AD-006 | Alertas extraídos | reuso `alert_events` / tabela própria | `extracted_alerts` com UNIQUE(contract_id, source_kind, source_id) | `alert_events` já usa UNIQUE por janela; STF-001 |
| AD-007 | Aviso de msg/alerta | push / evento in-app | evento `domain_<id>`, sem push | Clarify FR-063 |

## Data Model Summary

| Entity | Key Fields | Relationships | Notes |
|--------|------------|---------------|-------|
| `chat_messages` | contract_id, author_id, body, created_at | N:1 contracts, users; 1:N attachments, analyses | body ≤ 4000, imutável |
| `attachments` (rebuild) | task_id NULL, message_id NULL, category + `chat` | N:1 tasks ou chat_messages | CHECK garante exatamente um pai |
| `document_analyses` | message_id, contract_id, status, extracted_json, error | N:1 chat_messages | status `pending`/`completed`/`failed` |
| `extracted_alerts` | contract_id, source_kind, source_id, due_date | N:1 contracts | UNIQUE tripla; UPSERT no reprocessamento |

## API Surface Summary

| Method | Path | Purpose | Auth | Req/Res |
|--------|------|---------|------|---------|
| GET | `/api/v2/contracts/:id/chat/messages` | histórico paginado + análise resumida | JWT · admin/gestor/prestador | → `{messages,total,limit,offset}` |
| POST | `/api/v2/contracts/:id/chat/messages` | mensagem + anexo opcional | mesmo | `{body,filename,dataBase64}` → 201 `{message,attachment}` |
| GET | `/api/v2/contracts/:id/chat/messages/:mid/analysis` | detalhe da análise | mesmo | → `{analysis}` |
| POST | `/api/v2/contracts/:id/chat/messages/:mid/analysis/retry` | reprocessar | mesmo | → `{analysis}` |
| GET | `/api/v2/contracts/:id/chat/menu/alerts` | alertas E004 + extraídos | mesmo | → `{alerts,extracted}` |
| GET | `/api/v2/contracts/:id/chat/menu/upcoming` | tarefas com prazo, abertas | mesmo | → `{tasks}` |
| GET | `/api/v2/contracts/:id/chat/menu/completed` | tarefas concluídas | mesmo | → `{tasks}` |
| POST | `/api/v2/contracts/:id/chat/tasks/:tid/action` | mover tarefa pelo card | 同上, só própria | `{status,text}` → `{task}` |

Guard de contrato: gestor/admin em qualquer contrato do domínio; prestador só com vínculo em `contract_providers`; demais → 403/404. Visitante → 403.

## Testing Strategy

| Tier | Tool | Scope | Mock Boundary | Install |
|------|------|-------|---------------|---------|
| Unit backend | `node --test` + supertest | rotas, guards, migração, extrator | `DATA_DIR`/`UPLOAD_DIR` temp | configured |
| Unit frontend | `flutter test` | tela de chat, cards, filtro | `ApiService` stub | configured |
| Integration | `backend/test.sh` | E2E servidor real | `DATA_DIR`/`PORT` descartáveis | configured |
| Lint / Security | `flutter analyze` / `npm audit` | frontend / deps | — | configured |

## Acceptance Test Stubs

| Req ID | Test File | Stub Blocks | RED Status |
|--------|-----------|-------------|------------|
| FR-051 | `backend/src/routes/chat.test.js` | `test('FR-051 histórico paginado e texto ≤ 4000')` | failing-assertion |
| FR-052 | `backend/src/routes/chat.test.js` | `test('FR-052 evento só para participantes elegíveis')` | failing-assertion |
| FR-053 | `backend/src/routes/chat.test.js` | `test('FR-053 guards de papel e domínio')` | failing-assertion |
| FR-054 | `backend/src/routes/chat.test.js` | `test('FR-054 anexo chat 2 MB e tipo')` | failing-assertion |
| FR-055 | `backend/src/routes/chat.test.js` | `test('FR-055 anexo chat fora de evidências')` | failing-assertion |
| FR-056 | `backend/src/routes/chat.test.js` | `test('FR-056 menu com três cards')` | failing-assertion |
| FR-057 | `backend/src/routes/chat.test.js` | `test('FR-057 ação no card própria e 403')` | failing-assertion |
| FR-058 | `backend/src/routes/chat.test.js` | `test('FR-058 card por papel')` | failing-assertion |
| FR-059 | `backend/src/services/documentAnalysis.test.js` | `test('FR-059 extrai campos e liga à mensagem')` | failing-assertion |
| FR-060 | `backend/src/services/documentAnalysis.test.js` | `test('FR-060 dedup e reprocessamento')` | failing-assertion |
| FR-061 | `backend/src/services/documentAnalysis.test.js` | `test('FR-061 falha com retry sem bloquear mensagem')` | failing-assertion |

## Error Handling Strategy

| Error Category | Pattern | Response | Retry |
|----------------|---------|----------|-------|
| Texto > 4000 / sem corpo e anexo | validação antes de disco | 400 | não |
| Arquivo inválido ou > 2 MB | `decodeAndValidate` antes de disco | 400 | não |
| Contrato fora do escopo | guard por papel + vínculo | 403/404 | não |
| Ação em tarefa de terceiro | `assertMover` antes de escrita | 403, histórico intacto | não |
| Extração falha/timeout | status `failed` + `error` | análise falha; mensagem intacta | manual |
| Emissão de evento | melhor esforço | não falha o envio | — |

## Requirement Coverage Map

| Req ID | File Path(s) | Function(s)/Symbol(s) | Notes |
|--------|--------------|-----------------------|-------|
| FR-051 | backend/src/routes/chat.js, backend/src/config/database.js | `listMessages`, `CHAT_MESSAGES_DDL` | AD-001; paginação 50/100 |
| FR-052 | backend/src/routes/chat.js, backend/src/services/events.js | `emitChatMessage`, `emitDomainEvent` | AD-003, AD-007; STF-003 |
| FR-053 | backend/src/routes/chat.js, backend/src/middleware/auth.js | `assertChatAccess`, `requireRole` | AD-003; visitante 403 |
| FR-054 | backend/src/routes/chat.js, backend/src/middleware/upload.js | `postMessage`, `saveToUploads` | AD-002 |
| FR-055 | backend/src/routes/chat.js, backend/src/routes/attachments.js | `listAttachments`, `CHAT_CATEGORY` | AD-002; STF-002 |
| FR-056 | backend/src/routes/chat.js | `menuAlerts`, `menuUpcoming`, `menuCompleted` | AD-004 |
| FR-057 | backend/src/routes/chat.js, backend/src/models/Task.js | `cardAction`, `markCompleted`, `flowIndex` | AD-004; STF-005 |
| FR-058 | backend/src/routes/chat.js | `visibleTasks`, `assertChatAccess` | AD-004 |
| FR-059 | backend/src/services/documentAnalysis.js, backend/src/routes/chat.js | `analyzeDocument`, `extractFields` | AD-005 |
| FR-060 | backend/src/services/documentAnalysis.js, backend/src/config/database.js | `upsertExtractedAlert`, `EXTRACTED_ALERTS_DDL` | AD-006; STF-001 |
| FR-061 | backend/src/services/documentAnalysis.js | `withTimeout`, `markFailed`, `retryAnalysis` | AD-005; timeout 5 s |

## Project Structure

### Source Code

```text
+ backend/src/routes/chat.js (+ chat.test.js)
+ backend/src/services/documentAnalysis.js (+ documentAnalysis.test.js)
~ backend/src/config/database.js (3 tabelas + rebuild de attachments — AD-001/002/006)
~ backend/src/routes/alerts.js (extracted no painel — AD-006)
+ frontend/lib/screens/chat_screen.dart
~ frontend/lib/services/api_service.dart (métodos de chat)
~ backend src/**/*.test.js (stubs FR-051..061)
```

**Patterns**: `migrateSchema`, `requireRole`+`scopeDomain`, `emitDomainEvent`, `Task.FLOW`.
**Naming**: EN em DDL/payload, PT em telas e mensagens de erro.

## Implementation Hints

- **[HINT-001]** Ordem: stubs RED → migração → serviço de análise → rotas → events → painel → tela → suítes.
- **[HINT-002]** `db.transaction(fn)` já executa `fn`; nunca chamar `db.transaction(fn)()`.
- **[HINT-003]** Emissão nunca falha o POST; `emitDomainEvent` engole erros.
- **[HINT-004]** Extrator lê do disco por `path`; falha marca status e mantém mensagem.
- **[HINT-005]** Rebuild preserva ids e colunas; `ensureIndexes` recria índices.
