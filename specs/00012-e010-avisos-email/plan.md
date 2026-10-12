# Implementation Plan: Avisos por e-mail — envio opt-in por evento E010 (00012)

**Branch**: `dev` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

## Technical Context

| Campo | Valor |
|---|---|
| Language/Version | Node.js 22+ (backend); Dart 3 (Flutter Web) |
| Primary Dependencies | Express, sql.js — **nenhuma dependência nova** |
| Storage | leitura `alert_events.email_status` (E004); sem migração |
| Testing | `node --test` + fake SMTP (`net.createServer`), `test.sh` (118), `flutter test`/`analyze` (Docker) |
| Primary Ext | `routes/alerts.js` (campo `email_status`), testes em `services/email.test.js`, `routes/alerts.test.js`, `routes/tasks.test.js` |
| Performance Goals | e2e ≤ 5 s por envio (timeout fixo); e2e de falha sem esperar timeout (porta fechada) |
| Constraints | 403 papel/domínio; `notify()` nunca propaga exceção; sem retry; suíte verde |
| Scale/Scope | 2 US, 6 FR, 0 endpoint novo, 0 migração, 1 campo de payload, 0 dependências novas |
| Project Type / Mode | web / brownfield |

## Instructions Check

| Regra | Status |
|---|---|
| I–III (`dev`, testes, `TODO.md`), IV concisão | PASS |
| Stack, layout PRESERVE_EXISTING_LAYOUT, QC (`flutter analyze`, `node --check`, `npm audit`) | PASS |
| Complexity Tracking | ausente — sem violação |

## Architecture

```mermaid
C4Container
  title 00012 E010 avisos por e-mail
  Person(gestor, "Gestor/Admin")
  Container(tasks, "routes/tasks.js", "gatilhos entregues")
  Container(sweep, "runExpirySweep", "varredura E004 entregue")
  Container(panel, "GET /api/alerts/panel", "+ campo email_status")
  Container(email, "notify (E001)", "gate SMTP_* entregue")
  ContainerSmtp(smtp, "host SMTP", "real | fake de teste")
  ContainerDb(db, "domain db", "alert_events + contracts")
  Rel(tasks, email, "atribui/conclui/reabre")
  Rel(sweep, email, "contract_alert p/ creator_email")
  Rel(email, smtp, "envia ≤ 5 s")
  Rel(sweep, db, "grava antes de enviar")
  Rel(panel, db, "lê status da janela")
  Rel(gestor, panel, "lê estado")
```

## Architecture Decisions

| ID | Questão (opções) | Escolha | Rationale |
|----|------------------|---------|-----------|
| AD-001 | estado: payload do item / endpoint novo / só resposta da varredura | payload de `GET /api/alerts/panel` | Clarif. Q1; leitura natural de E005; sem endpoint (STF-002: linha da janela atribuída) |
| AD-002 | e2e real: servidor SMTP fake `net.createServer` / injetar `notifyFn` | servidor fake de teste nos 4 eventos + sweep; `notifyFn` só no que já existe | AD da E001 (`email.test.js`); prova o caminho real (não injetado) |
| AD-003 | sweep e2e: chamar `runExpirySweep()` direto / só via HTTP | direto com `notify` padrão; HTTP cobre o painel | dedup + `email_status` são de serviço; SC-002 (2º passe não reenvia) |
| AD-004 | host morto: porta fechada (ECONNREFUSED) / esperar timeout 5 s | porta fechada no e2e de falha | SC-005 sem teste de 5 s; caminho de timeout já coberto por `emailTimeoutMs:100` injetado (E004) |
| AD-005 | `email_status` na UI: exibir no card / só payload API | só payload API, sem mudança de tela | FR-003 define leitura no registro; E006 dona das telas; `NEW-API` explícito na spec |

## Data Model Summary

| Entity | Key Fields | Relationships | Notes |
|--------|------------|---------------|-------|
| `alert_events` (domínio, E004) | `email_status` `sent\|failed\|skipped` | UNIQUE(contrato, janela) | transições entregues; leitura + payload novo |
| `contracts` (domínio, E002) | `creator_email` | 1-N `alert_events` | destinatário do vencimento (entregue) |

## API Surface Summary

| Method | Path | Purpose | Auth | Req/Res Types |
|--------|------|---------|------|---------------|
| GET | `/api/alerts/panel` | item ganha `email_status` (`sent\|failed\|skipped\|null`) da janela atribuída | admin, gestor + scopeDomain | inalterado além do campo; demais seções preservadas |

## Testing Strategy

| Tier | Tool | Escopo | Mock Boundary | Install |
|---|---|---|---|---|
| Unit | `node --test` + supertest | FR-001..006 (4 eventos, dedup, inerte, falha, payload) | fake SMTP local, porta fechada | configured |
| Integration | `backend/test.sh` (118) | smoke baseline 118/118 | backend no ar | configured |
| Integration | `flutter test` (Docker) | regressão 23/23 (telas intactas) | ApiService mock | configured |
| Lint | `node --check` + `flutter analyze` (Docker) | sintaxe/análise | — | configured |
| Security | `npm audit --audit-level=high` + 403 na suíte | dependências, papel/domínio | — | configured |

## Acceptance Test Stubs

N/A — no P1 requirements

## Error Handling Strategy

| Categoria | Padrão | Resposta | Retry |
|---|---|---|---|
| Host inoperante (ECONNREFUSED) | catch em `notify()` → `email_status='failed'` | 200/201 preservadas; sweep segue | não |
| Timeout de envio | `EMAIL_TIMEOUT_MS` 5 s → `failed` | latência ≤ 5 s aceita (FR-005) | não |
| Sem `SMTP_*` | `smtpConfigured()` false → `skipped` | zero tentativa, zero erro visível | não |
| Sem `creator_email` | sem chamar `notify()` | registro fica `skipped` | não |
| Painel sem evento na janela | `email_status` ausente (`null`) | 200 inalterado | — |

## Risk Mitigation

| Risk (from spec) | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Canal indisponível silenciando aviso | medium | medium | `email_status` no payload + suíte de aviso em aplicativo verde | `routes/alerts.js`, `services/email.js` |
| E-mail dependente do motor | low | medium | aresta E010→E004 satisfeita; sweep chamado direto (AD-003) | `services/alerts.js` |
| Spam por reenvio | low | high | SC-002: 2º passe não reenvia (UNIQUE antes do envio) | `services/alerts.js` |

## Requirement Coverage Map

| Req ID | File Path(s) | Function(s)/Symbol(s) | Decision |
|--------|--------------|------------------------|----------|
| FR-001 | backend/src/services/email.test.js, backend/src/routes/tasks.test.js | `notify()`, `smtpConfigured()` (entregues) + asserções 4 gatilhos | AD-002 |
| FR-002 | backend/src/services/alerts.js, backend/src/routes/alerts.test.js | `runExpirySweep({notifyFn})` (entregue) + e2e com `notify` padrão | AD-003 |
| FR-003 | backend/src/routes/alerts.js | `listPanel(req,res)` (SELECT `email_status` da janela atribuída) | AD-001, AD-005 |
| FR-004 | backend/src/services/email.test.js | `smtpConfigured()` — zero tentativa, saída inerte | AD-004 |
| FR-005 | backend/src/services/email.test.js, backend/src/routes/alerts.test.js | `notify()` → `{sent:false}`; sweep `failed` + 200/201 preservadas | AD-004 |
| FR-006 | backend/src/services/email.test.js | `notify()` — lança rejeitada → capturada, nunca propaga | AD-002 |

## Project Structure

### Source Code

```text
~ backend/src/routes/alerts.js (FR-003: email_status em listPanel)
~ backend/src/routes/alerts.test.js (FR-002/FR-003/FR-005 e2e varredura + painel)
~ backend/src/services/email.test.js (FR-001/FR-004/FR-005/FR-006 quatro eventos + inerte + falha)
~ backend/src/routes/tasks.test.js (FR-001/FR-005: rotas com SMTP morto preservam 200/201)
```

**Patterns to reuse**: fake SMTP `services/email.test.js` (E001); `notifyFn`/`emailTimeoutMs` de `routes/alerts.test.js` (E004); CASE de janela atribuída de `listPanel` (E005).
**Tests to extend**: `email.test.js` (FR-017 já cobre 4 gatilhos — estender recipient/conteúdo), `alerts.test.js` (6 E004 + painel), `tasks.test.js`.
**Naming**: inglês em DDL/código/rotas; UI em português.

## Implementation Hints

- **[HINT-001]** Constraint: `email_status` vem da linha da janela atualmente atribuída (mesmo `EXISTS`/CASE do painel); sem linha → `null` — nunca histórico (STF-002).
- **[HINT-002]** Order/test: fake SMTP por teste com porta efêmera; `SMTP_HOST`/`SMTP_PORT` setados no teste e removidos no teardown — vazar variável quebra o modo inerte dos demais testes.
- **[HINT-003]** Gotcha: varredura duas vezes no mesmo contrato → UNIQUE impede a 2ª linha; o 2º passe observa `sent`, não reenvia (SC-002).
- **[HINT-004]** Compatibility: rotas de tarefa respondem 200/201 mesmo com `notify` falho — teste não pode esperar erro (FR-006: `notify()` nunca lança).
- **[HINT-005]** Test speed: falha e2e via porta fechada (ECONNREFUSED imediato); caminho de timeout de 5 s já coberto por `emailTimeoutMs:100` (E004) — não esperar 5 s no teste.

## Dependencies

- E001: `notify()`, `smtpConfigured()`, gate `SMTP_*`, servidor fake de teste — consumo e extensão de asserções.
- E004: `runExpirySweep`, `alert_events.email_status`, ordem gravação→envio, `EMAIL_TIMEOUT_MS` — consumo sem refactor.
- E005: `listPanel` e guards do painel — extensão de payload sem alterar seções.
- E002: `contracts.creator_email` — destinatário do vencimento (entregue).
