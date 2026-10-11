# Implementation Plan: Execução de tarefas com evidência E003 (00005)

**Branch**: `dev` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Technical Context

| Campo | Valor |
|---|---|
| Language/Version | Dart 3 (Flutter Web); Node.js 22+ |
| Primary Dependencies | Express, Socket.io, sql.js, jsonwebtoken, Docker Compose |
| Storage | `data/domains/<id>.db` + `platform.db` (sql.js); arquivos em `backend/uploads/` (bind mount); sem migração |
| Testing | `node --test` (3001), `backend/test.sh` (3199), proxy check no stack nginx (:80), `flutter analyze` Docker |
| Project Type / Mode | web multi-tenante / brownfield; backend + `frontend/nginx.conf` |
| Performance Goals | evidência renderiza same-origin; 400/403 antes de qualquer escrita |
| Constraints | arquivo antes da referência no banco; `/uploads` sem token (revisão 2026-12-26); suíte verde p/ `dev`→`main` |
| Scale/Scope | 4 US, 11 FR, 0 nova tabela |

## Instructions Check

| Regra | Status |
|---|---|
| I–III (`dev`, testes, `TODO.md`), IV concisão | PASS |
| Stack, layout, QC (`node --check`, `npm audit --audit-level=high`, sem meta) | PASS |
| Complexity Tracking | ausente — sem violação |

## Architecture

```mermaid
C4Container
  title 00005 E003
  Person(gestor, "Gestor")
  Person(prestador, "Prestador")
  System_Boundary(inhome, "InHome") {
    Container(spa, "SPA", "Flutter Web")
    Container(edge, "Edge", "nginx :80")
    Container(api, "API", "Express :3001")
    Container(guards, "Guards", "auth.js")
    ContainerFs(uploads, "Uploads", "backend/uploads")
    ContainerDb(db, "Domínio", "sql.js")
  }
  Rel(gestor, spa, "Usa")
  Rel(prestador, spa, "Usa")
  Rel(spa, edge, "/api, /uploads")
  Rel(edge, api, "proxy")
  Rel(api, guards, "scopeDomain, requireRole")
  Rel(guards, db, "getDomainDb")
  Rel(api, uploads, "saveToUploads")
```

## Architecture Decisions

| ID | Questão (opções) | Escolha | Rationale |
|----|------------------|---------|-----------|
| AD-001 | Onde encaminhar `/uploads`: Edge vs porta dedicada do backend | `location ^~ /uploads/` em `frontend/nginx.conf` | FR-007/008; diff do SAD; `^~` vence o regex de cache e o fallback do SPA |
| AD-002 | Escopo: checagem por handler vs guarda no roteador | `router.use(scopeDomain())` em tasks/comments/attachments | FR-010; precedente em `contracts.js` e `definitions.js` |
| AD-003 | Verificação da imagem: manual vs automática | script de proxy no stack nginx (200 + `image/*`) + item visual no manual-test | FR-008; `test.sh` fala com o backend na 3199, não com o Edge |
| AD-004 | Falha parcial na gravação das fotos (STF-001): rollback vs aceitar | aceitar o parcial e documentar, sem retrial | FR-003/FR-009; coerente com o arquivo órfão já aceito |

## Data Model Summary

N/A — sem nova entidade (spec sem `NEW-ENTITY`/`MIGRATION`); `tasks`, `task_photos`, `task_history` e `attachments` inalterados — superfície compartilhada com E007/E008.

## API Surface Summary

N/A — nenhum endpoint novo; a superfície existente (`POST /api/tasks/:id/complete`, `/:id/reopen`, `/:id/comments`, `/:id/attachments`) muda só em guarda de escopo e validação de upload.

## Testing Strategy

| Tier | Tool | Escopo | Mock Boundary | Install |
|---|---|---|---|---|
| Unit | `node --test`+supertest | conclusão, reabertura, upload, guards, bloco nginx | sql.js temporário (`DATA_DIR`) | configured |
| Integration | `backend/test.sh` (3199) + `backend/test-uploads-proxy.sh` (:80) | fluxo fim a fim e renderização via Edge | backend e stack nginx no ar | configured / script novo |
| Lint | `node --check` em `backend/src/**/*.js` | sintaxe | — | configured |
| Security | `npm audit --audit-level=high` + recusa 400/403 e revisão de `/uploads` sem token | dependências, tipo/tamanho, isolamento | — | configured |

## Acceptance Test Stubs

P1 = FR-001..FR-011 (11); `node --test` co-localizado; RED `pending`.

| Req ID | Test File | Stub Blocks (framework-native) | RED Status |
|--------|-----------|--------------------------------|------------|
| FR-001 | backend/src/routes/tasks.test.js | test.todo('FR-001 fluxo e conclusão só do prestador vinculado') | pending |
| FR-002 | backend/src/routes/tasks.test.js | test.todo('FR-002 conclusão sem texto responde 400') | pending |
| FR-003 | backend/src/routes/tasks.test.js | test.todo('FR-003 fotos opcionais gravadas antes da referência') | pending |
| FR-004 | backend/src/routes/comments.test.js | test.todo('FR-004 comentário e anexo com autor e data') | pending |
| FR-005 | backend/src/routes/tasks.test.js | test.todo('FR-005 reabertura sem motivo responde 400') | pending |
| FR-006 | backend/src/routes/tasks.test.js | test.todo('FR-006 histórico de reabertura com autor e motivo') | pending |
| FR-007 | backend/src/routes/uploads.test.js | test.todo('FR-007 bloco location ^~ /uploads/ no nginx.conf') | pending |
| FR-008 | backend/test-uploads-proxy.sh | check_http_image "FR-008 imagem via Edge" 200 | pending |
| FR-009 | backend/src/middleware/upload.test.js | test.todo('FR-009 upload inválido 400 sem gravação') | pending |
| FR-010 | backend/src/routes/tasks.test.js | test.todo('FR-010 domainId estrangeiro 403 nos três roteadores') | pending |
| FR-011 | backend/src/routes/tasks.test.js | test.todo('FR-011 prestador só enxerga as próprias tarefas') | pending |

## Error Handling Strategy

| Categoria | Padrão | Resposta | Retry |
|---|---|---|---|
| Texto ou motivo ausente, status fora do fluxo | fail-fast | 400 + `{error}` antes de qualquer escrita | não |
| Upload com payload, tipo ou tamanho inválido | validação antes da gravação | 400 + `{error}`, nada em disco nem no banco | não |
| Papel, domínio suspenso ou `domainId` estrangeiro | deny by default | 401/403 antes da consulta | não |
| Tarefa inexistente ou alheia ao prestador | esconde existência | 404 + `{error}` | não |
| Banco falha depois de gravar arquivo | estado parcial aceito (STF-001) | 500 + `{error}`; órfão documentado | não |
| `GET /uploads/<arquivo>` | proxy do Edge (AD-001) | 200 + `image/*`, nunca `index.html` | — |

## Risk Mitigation

| Risk (from spec) | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Evidência fora da sessão | medium | medium | nome opaco já gerado no upload; revisão de `/uploads` fixada em 2026-12-26 registrada no manual-test | `frontend/nginx.conf` |
| Fallback mascarando erro | low | high | asserção de status e content-type em `backend/test-uploads-proxy.sh` (FR-008) | `backend/test-uploads-proxy.sh` |
| Arquivo órfão acumulando | low | low | aceito e documentado (AD-004); sem coleta automática nesta release | `backend/src/middleware/upload.js` |

## Requirement Coverage Map

| Req ID | File Path(s) | Function(s)/Symbol(s) | Decision |
|---|---|---|---|
| FR-001 | backend/src/routes/tasks.js, backend/src/routes/tasks.test.js | updateTaskStatus(), completeTask() | |
| FR-002 | backend/src/routes/tasks.js, backend/src/routes/tasks.test.js | markCompleted() | |
| FR-003 | backend/src/routes/tasks.js, backend/src/middleware/upload.js, backend/src/routes/tasks.test.js | saveToUploads(), completeTask() | AD-004 |
| FR-004 | backend/src/routes/comments.js, backend/src/routes/attachments.js, backend/src/routes/comments.test.js | addComment(), uploadAttachment() | |
| FR-005 | backend/src/routes/tasks.js, backend/src/routes/tasks.test.js | reopenTask() | |
| FR-006 | backend/src/models/Task.js, backend/src/routes/tasks.js, backend/src/routes/tasks.test.js | Task.addHistory() | |
| FR-007 | frontend/nginx.conf, backend/src/routes/uploads.test.js | `location ^~ /uploads/` | AD-001 |
| FR-008 | frontend/nginx.conf, backend/src/server.js, backend/test-uploads-proxy.sh | express.static(UPLOAD_DIR), `app.use('/uploads', …)` | AD-001, AD-003 |
| FR-009 | backend/src/middleware/upload.js, backend/src/middleware/upload.test.js | saveToUploads(), fail() | AD-004 |
| FR-010 | backend/src/routes/tasks.js, backend/src/routes/comments.js, backend/src/routes/attachments.js, backend/src/middleware/auth.js | router.use(scopeDomain()) | AD-002 |
| FR-011 | backend/src/routes/tasks.js, backend/src/routes/tasks.test.js | canSeeTask(), listTasks() | |

## Project Structure

```text
~ frontend/nginx.conf (location ^~ /uploads/ para backend:3001)
~ backend/src/middleware/upload.js (validação de tipo e tamanho antes de gravar)
~ backend/src/middleware/upload.test.js (recusa 400 sem gravação)
~ backend/src/routes/tasks.js (scopeDomain + regressão de conclusão/reabertura)
~ backend/src/routes/tasks.test.js (stubs e regressão FR-001/002/003/005/006/010/011)
~ backend/src/routes/comments.js, backend/src/routes/attachments.js (scopeDomain)
~ backend/test.sh (fluxo de evidência fim a fim)
+ backend/test-uploads-proxy.sh (FR-008 no stack nginx)
+ backend/src/routes/uploads.test.js (FR-007, bloco de configuração)
```

**Reuse**: `saveToUploads`, `scopeDomain`, `requireRole`, `canSeeTask`, `Task.addHistory`, `check_http` do smoke.

## Implementation Hints

- **[HINT-001]** Order: stubs RED → validação de upload → `scopeDomain` nos três roteadores → bloco nginx → rebuild do Edge.
- **[HINT-002]** Gotcha: validar tipo/tamanho antes de `mkdirSync`/`writeFileSync` — 400 não pode deixar arquivo em disco (FR-009).
- **[HINT-003]** Gotcha: `^~` é obrigatório no prefixo `/uploads/`, senão o regex de cache (`try_files … =404`) e o fallback `location /` engolem a requisição.
- **[HINT-004]** Constraint: `tasks`/`task_history` não mudam de esquema (superfície de E007/E008); corrigir só o que a verificação apontar.
- **[HINT-005]** Order: `docker compose build frontend && docker compose up -d frontend` antes do proxy check; backend não tem bind mount — `docker compose build backend && docker compose up -d backend` após mudança de código.
