# Plan — Gestão de Contratos de Terceiros (MVP)

## Instructions Check

| Rule | Status |
|------|--------|
| I–II. Work on `dev`; unit tests gate `dev`→`main` | PASS |
| III. Read `TODO.md` at session start | PASS |
| IV. Concise, table/kv artifacts | PASS |
| Storage sql.js per-domain; layout preserved | PASS |

No Complexity Tracking — no principle violations.

## Technical Context

| Field | Value |
|-------|-------|
| Language/Version | Dart 3 (Flutter Web); Node.js 22+ |
| Primary Dependencies | Express, Socket.io, jsonwebtoken, bcryptjs, sql.js |
| Storage | sql.js — `data/domains/<id>.db` + `data/platform.db` |
| Testing | `node:test`+supertest; `flutter test` blocked (no SDK) |
| Target Platform | Chrome, Edge, Firefox, Safari (current) |
| Project Type / Mode | web / brownfield (`projects`→`contratos`) |
| Performance / Scale | <2s localhost; thousands of contracts; 29 P1 FRs |
| Constraints | No native build unless better-sqlite3 succeeds |

## Requirement Coverage Map

| Req ID | File Path(s) | Function(s)/Symbol(s) | Decision |
|--------|--------------|------------------------|----------|
| FR-001 | `backend/src/routes/domains.js`<br/>`backend/src/config/database.js` | `enableDomain()` `createDomainDb()` | |
| FR-002 | `backend/src/routes/domains.js`<br/>`backend/src/middleware/auth.js` | `suspend/reactivateDomain()` `assertDomainActive()` | |
| FR-003 | `backend/src/middleware/auth.js` | `requireSystemAdmin()` | |
| FR-004 | `backend/src/routes/users.js` | `create/update/delete/listUser()` | |
| FR-005 | `backend/src/routes/finalidades.js` | `create/update/delete/listFinalidade()` | |
| FR-006 | `backend/src/routes/contracts.js` | `createContract()` `getContract()` | AD-003 |
| FR-007 | `backend/src/routes/contracts.js` | `link/unlinkPrestador()` | |
| FR-008 | `backend/src/routes/contracts.js`<br/>`backend/src/models/Contract.js` | `extend/closeContract()` `isOverdue()` | |
| FR-009 | `backend/src/routes/contracts.js` | `deleteContract()` | |
| FR-010 | `backend/src/routes/tasks.js`<br/>`backend/src/models/Task.js` | `updateTaskStatus()` `assertLinkedPrestador()` | |
| FR-011 | `backend/src/routes/tasks.js`<br/>`backend/src/middleware/upload.js` | `completeTask()` | |
| FR-012 | `backend/src/routes/tasks.js` | `reopenTask()` | |
| FR-013 | `backend/src/routes/tasks.js`<br/>`backend/src/middleware/auth.js` | `listTasks()` `scopeByRole()` | |
| FR-014 | `backend/src/config/database.js`<br/>`backend/src/middleware/auth.js` | `getDomainDb()` `scopeDomain()` | AD-002 |
| FR-015 | `backend/src/routes/comments.js`<br/>`backend/src/routes/attachments.js` | `addComment()` `uploadAttachment()` | |
| FR-016 | `backend/src/routes/search.js`<br/>`frontend/lib/services/api_service.dart` | `searchContracts/Tasks()` `fetchFiltered()` | |
| FR-017 | `backend/src/services/email.js` | `notify()` `smtpConfigured()` | AD-004 |
| FR-018 | `backend/src/services/report.js` | `generateContractPdf()` `exportContractCsv()` | |
| FR-019 | `backend/src/routes/dashboard.js`<br/>`frontend/lib/screens/dashboard_screen.dart` | `getDomainMetrics()` `DashboardScreen.load()` | |
| FR-020 | `backend/src/server.js`<br/>`frontend/lib/services/api_service.dart` | `emitDomainEvent()` `ApiService.socket` | |
| FR-021 | `backend/src/middleware/validate.js`<br/>`frontend/lib/screens/*_screen.dart` | `validate()` form validators | |
| FR-022 | `backend/src/middleware/auth.js` | `requireRole()` `signJwt()` | |
| FR-023 | `backend/src/middleware/upload.js`<br/>`backend/src/routes/attachments.js` | `saveToUploads()` | AD-005 |
| FR-024 | `backend/src/config/database.js` | `getDomainDb()` `getPlatformDb()` | AD-002 |
| FR-025 | `backend/src/config/database.js`<br/>`backend/package.json` | `initSqlDriver()` | AD-001 |
| FR-026 | `backend/src/config/database.js`<br/>`backend/src/routes/contracts.js` | `ensureIndexes()` paged `listContracts()` | |
| FR-027 | `frontend/lib/main.dart`<br/>`frontend/web/index.html` | `main()` web bootstrap | |
| FR-028 | `frontend/lib/theme/app_theme.dart`<br/>`frontend/lib/screens/*_screen.dart` | `AppTheme.light` labeled fields / focus | |
| FR-029 | `backend/src/server.js`<br/>`frontend/lib/services/api_service.dart` | `server.listen(3001)` `ApiService.baseUrl` | |

## Acceptance Test Stubs

Co-located `*.test.js`; `node:test`. RED via `test.todo` until implemented. Paths under `backend/src/` unless noted.

| Req ID | Test File | Stub Block | Status |
|--------|-----------|------------|--------|
| FR-001 | `routes/domains.test.js` | `test.todo('FR-001 enable')` | pending |
| FR-002 | `routes/domains.test.js` | `test.todo('FR-002 suspend/reactivate')` | pending |
| FR-003 | `middleware/auth.test.js` | `test.todo('FR-003 sysadmin gate')` | pending |
| FR-004 | `routes/users.test.js` | `test.todo('FR-004 user CRUD')` | pending |
| FR-005 | `routes/finalidades.test.js` | `test.todo('FR-005 finalidade CRUD')` | pending |
| FR-006 | `routes/contracts.test.js` | `test.todo('FR-006 create')` | pending |
| FR-007 | `routes/contracts.test.js` | `test.todo('FR-007 unlink block')` | pending |
| FR-008 | `routes/contracts.test.js` | `test.todo('FR-008 overdue/extend')` | pending |
| FR-009 | `routes/contracts.test.js` | `test.todo('FR-009 admin delete')` | pending |
| FR-010 | `routes/tasks.test.js` | `test.todo('FR-010 flow+link')` | pending |
| FR-011 | `routes/tasks.test.js` | `test.todo('FR-011 complete')` | pending |
| FR-012 | `routes/tasks.test.js` | `test.todo('FR-012 reopen')` | pending |
| FR-013 | `routes/tasks.test.js` | `test.todo('FR-013 visibility')` | pending |
| FR-014 | `middleware/auth.test.js` | `test.todo('FR-014 cross-domain')` | pending |
| FR-015 | `routes/comments.test.js` | `test.todo('FR-015 comments/attach')` | pending |
| FR-016 | `routes/search.test.js` | `test.todo('FR-016 filters')` | pending |
| FR-017 | `services/email.test.js` | `test.todo('FR-017 SMTP gate')` | pending |
| FR-018 | `services/report.test.js` | `test.todo('FR-018 PDF/CSV')` | pending |
| FR-019 | `routes/dashboard.test.js` | `test.todo('FR-019 metrics')` | pending |
| FR-020 | `server.test.js` | `test.todo('FR-020 socket')` | pending |
| FR-021 | `middleware/validate.test.js` | `test.todo('FR-021 validation')` | pending |
| FR-022 | `middleware/auth.test.js` | `test.todo('FR-022 role matrix')` | pending |
| FR-023 | `middleware/upload.test.js` | `test.todo('FR-023 disk ref')` | pending |
| FR-024 | `config/database.test.js` | `test.todo('FR-024 db/domain')` | pending |
| FR-025 | `config/database.test.js` | `test.todo('FR-025 sql.js')` | pending |
| FR-026 | `routes/contracts.test.js` | `test.todo('FR-026 1000 rows')` | pending |
| FR-027 | `frontend/test/web_browsers_test.dart` | `testWidgets('FR-027 boots')` | pending |
| FR-028 | `frontend/test/a11y_labels_test.dart` | `testWidgets('FR-028 a11y')` | pending |
| FR-029 | `server.test.js` | `test.todo('FR-029 ports')` | pending |

## Architecture Decisions

| AD | Question | Choice | Rationale |
|----|----------|--------|-----------|
| AD-001 | SQLite driver | sql.js; better-sqlite3 if build OK | Native build failed; sql.js present |
| AD-002 | Multi-tenant isolation | DB per domain + platform.db | Physical isolation; suspend keeps file |
| AD-003 | Scaffold rename | In-place projects→contratos | Brownfield; keeps auth/tasks wiring |
| AD-004 | Email delivery | Opt-in SMTP_*; inert unset | Zero sends without SMTP_*; 4 triggers |
| AD-005 | Upload storage | Disk uploads/ + path ref | Governance v2: no BLOBs in SQLite |

## Project Structure

| Path | Change | Notes |
|------|--------|-------|
| `backend/src/routes/domains.js` `users.js` `finalidades.js` | + | domain cycle/CRUD (AD-002) |
| `backend/src/routes/contracts.js` `models/Contract.js` | ~ | from projects (AD-003) |
| `backend/src/routes/comments.js` `attachments.js` `search.js` | + | filters (AD-005) |
| `backend/src/services/email.js` `report.js` | + | SMTP, PDF/CSV (AD-004) |
| `backend/src/middleware/upload.js` `validate.js` | + | disk, schema (AD-005) |
| `backend/src/config/database.js` | ~ | sql.js factory (AD-001, AD-002) |
| `frontend/lib/screens/domains_screen.dart` | + | system_admin |
| `frontend/lib/screens/projects_screen.dart` | ~ | → contratos (AD-003) |
| `frontend/lib/theme/app_theme.dart` `services/api_service.dart` | +~ | FR-028; filters/socket |
| `data/` `backend/uploads/` | + | gitignored runtime |

## Testing Strategy

| Tier | Tool | Scope | Mock | Install |
|------|------|-------|------|---------|
| Unit | `node:test`+supertest | routes/middleware | sql.js; no SMTP | `npm i -D supertest` |
| Unit (UI) | `flutter test` | widgets/validators | mock ApiService | blocked — no SDK |
| Integration | supertest+server | auth/CRUD | local sqlite | same |
| Security | `npm audit` | CVEs | n/a | preinstalled |
| Coverage | `c8` | `backend/src/**` | n/a | `npm i -D c8` |

## Error Handling Strategy

| Category | Pattern | Response | Retry |
|----------|---------|----------|-------|
| Validation | fail-fast | 400 + fields | no |
| Auth/Role | deny default | 401/403 | no |
| Cross-domain | no leak | 403/404 | no |
| SMTP unset | skip | 200 queued=false | no |
| Internal | catch-all | 500 + req id | no |

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Remodel breaks routes | Keep auth/tasks; regression FR-022 | `routes/` |
| better-sqlite3 build failed | sql.js `initSqlDriver()`; native try/catch | `config/database.js` |
| SMTP unset | `smtpConfigured()`; tests FR-017 | `services/email.js` |
| No Flutter SDK | Backend first; widget tests pending | `frontend/lib/` |
| PDF lib unresolved | Spike in Delivery; CSV fallback | `services/report.js` |

## Implementation Hints

- **[HINT-001]** Order: domain db factory (AD-002) before business routes.
- **[HINT-002]** Gotcha: `assertDomainActive` in `signIn` and every JWT route.
- **[HINT-003]** Constraint: tasks tag `{FR-###}` only.
- **[HINT-004]** Order: remodel `projects`→`contratos` (AD-003) first.
- **[HINT-005]** Perf: indexes `(domain_id,status)`, `(contract_id)` before FR-026.
