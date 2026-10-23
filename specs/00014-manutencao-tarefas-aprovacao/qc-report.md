# QC Report: Manutenção de tarefas com aprovação do gestor (00014)

**Date**: 2026-10-19T00:18:49Z
**Feature Directory**: specs/00014-manutencao-tarefas-aprovacao
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 828b458505d8990f746971b631616598fbbb5612
- Mode: Full
- Prior Baseline: N/A (primeiro QC da feature; nenhum qc-report.md anterior)
- Changed Files: N/A (full run)
- Test Selection: bateria T018 registrada em `.completed` na mesma tree + re-run alvo `node --test` dos 3 arquivos que cobrem FR-030..037
- Scope Safety: primeira execução completa — nenhum escopo herdado a validar. Delegação de subagentes indisponível no harness (subagent depth limit 1); Policy Auditor, QC Auditor e Story Verifier executados inline, com os insumos e validações previstos no workflow.
- Evidence de bateria: 165/165 unit, 178/178 smoke, 37/37 flutter + analyze 0, audit 0 — gravadas em `.completed` pelo ciclo T018 neste mesmo tree; QC reexecutou 34/34 dos testes de FR e `node --check`.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | 165/165 (T018, mesma tree); re-run alvo QC: 34/34, 0 fail |
| Smoke suite | PASSED | 178/178 (T018, PORT=3199, backend/test.sh) |
| Flutter analyze | PASSED | 0 issues (T018, Docker ghcr.io/cirruslabs/flutter:stable) |
| Flutter tests | PASSED | 37/37 (T018), incl. 12 testWidgets do task_detail_sheet |
| node --check | PASSED | 6 arquivos backend inspecionados, todos OK (re-executado no QC) |
| Security audit | PASSED | npm audit --audit-level=high → 0 (T018) + suíte 403 re-executada + revisão manual OWASP das rotas novas |
| Story verification | PASSED | FR-030..037 8/8; US 3/3; SC 3/3; T001–T018 18/18 [X] |
| Policy audit | PASS | inline: spec/plan/tasks vs project-instructions.md — 0 violações |
| Browser probe (6.0) | SKIPPED | sem tool nativa nem servidor MCP de navegador no harness |
| Manual testing | SKIPPED | fallback 6c não acionado — ver seção Manual Testing |

## Test Results — PASSED
- Re-executado neste QC (probe alvo, não a bateria completa): `node --test src/routes/tasks.test.js src/routes/comments.test.js src/config/database.test.js` → 34/34, 0 fail (~9.7s).
- Evidência da bateria T018 na mesma tree (commit 828b458, gravada em `.completed`): `npm --prefix backend test` → 165/165; `bash backend/test.sh` (PORT=3199) → 178/178; `flutter analyze` → 0 issues; `flutter test` → 37/37; `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities.
- Re-executado neste QC (sintaxe): `node --check` em routes/tasks.js, routes/attachments.js, config/database.js, models/Task.js, middleware/auth.js, middleware/upload.js → todos OK.
- Cobertura dos testes por requisito: FR-030..035 em `backend/src/routes/tasks.test.js:948/980/1017/1081/1152/1200`; FR-036/037 em `backend/src/routes/comments.test.js:233`; migração em `backend/src/config/database.test.js:803`; smoke em `backend/test.sh:635-718`; UI em `frontend/test/task_detail_sheet_test.dart` (12 testWidgets, T004/T007/T010/T014).
- Regressão de 00005: auto-conclusão do prestador coberta em `tasks.test.js:971`; suítes 00005 verdes dentro do total 165/165.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | nenhum | — |

## Code Coverage — SKIPPED
- Threshold: none (Coverage Target vazio em `.github/sddp-config.md`; policy v2.1.0 sem gate numérico)

## Static Analysis — PASSED
- Tool: `flutter analyze` (frontend, T018), `node --check` (backend, re-executado no QC)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities (T018)
- Suíte 403 re-executada no QC (papel, domínio, suspensão) — todos os caminhos recusam antes de escrever
- Revisão manual OWASP das rotas novas (auth, uploads, isolamento por domínio) — 0 achados

## Security & Consistency Checks — PASSED
- Decisão gestor-only: `requireRole('gestor')` em `backend/src/routes/tasks.js:537-538`; 403 de prestador, admin e system_admin verificado em `tasks.test.js:1043-1057` — admin não decide (FR-032/FR-033).
- Manutenção admin+gestor: `tasks.js:539`; 403 de prestador e system_admin com status preservado em `tasks.test.js:1093-1110`.
- Gate de anexo: prestador bloqueado em Concluída com 403 `TASK_ATTACHMENT_STATUS_FORBIDDEN` antes de disco/banco (`routes/attachments.js:57-62`) e ocultação correspondente na UI (`task_detail_sheet.dart:130-135`).
- Isolamento de domínio e suspensão: handlers usam `getDomainDb(req.user.domainId)`; `router.use(scopeDomain())` em `tasks.js:525-527` e `attachments.js:101-103`; suspensão 403 em `middleware/auth.js:51-59` (`assertDomainActive`, definição em `:18-30`). Teste FR-035 (`tasks.test.js:1200+`) confirma 403 de domínio estrangeiro e suspenso sem nenhuma escrita.
- Payloads de erro com `code`: `TASK_DECISION_STATUS_REQUIRED`, `TASK_REJECT_REASON_REQUIRED`, `TASK_MAINTENANCE_STATUS_REQUIRED`, `TASK_MAINTENANCE_REASON_REQUIRED`, `TASK_MAINTENANCE_NOOP`, `TASK_ATTACHMENT_CATEGORY_INVALID`, `TASK_ATTACHMENT_STATUS_FORBIDDEN` — todos exercitados por teste e smoke. O 403 de `requireRole` segue o contrato `{ error: 'Forbidden' }` do plano.
- Nenhum caminho de escrita sem motivo: rejeição valida motivo antes do UPDATE (`tasks.js:405-408`), manutenção valida status/motivo/noop antes do UPDATE (`tasks.js:435-449`), upload valida categoria (`attachments.js:44-53`) e tipo/tamanho (`middleware/upload.js:35-59`, chamado antes de gravar em `attachments.js:64`) antes de disco e banco. Aprovação não exige motivo por definição do FR-031 (motivo só na rejeição).
- Decisão fora de Revisão: 400 sem escrita (`tasks.js:368-373`, `:399-404`) — cobre o edge case "tarefa saiu de Revisão antes da ação" (`tasks.test.js:1061-1073`).

## Compliance Check — PASS
- `project-instructions.md`: linting (flutter analyze 0 issues, node --check OK), security (audit 0 + revisão manual OWASP), unit tests antes de promoção (165/165), Coverage Target vazio — 0 violações.
- PRESERVE_EXISTING_LAYOUT: rotas e coluna `category` aditivas; enum `tasks.status`, PATCH/complete/reopen e evidência de 00005 intocados.
- Artifact conventions: IDs FR/T/SC imutáveis preservados; transições de checkbox apenas `[ ]` → `[X]`; `tasks.md` 6017 bytes (limite 6144) e 18 tasks (limite 40); `spec.md` 9905 e `plan.md` 10239 bytes (limite 10240).

## Requirements Traceability — 18/18 work items verified, 8/8 FR, 3/3 SC
### FR → file:line
| Req | Status | Evidence (file:line) |
|-----|--------|----------------------|
| FR-030 | PASSED | `backend/src/routes/tasks.js:364` (approveTask, gate Revisão→Concluída em `:368-377`), `:395` (rejectTask, →Em Progresso em `:409-412`), `:537-538` (rotas `requireRole('gestor')`); UI `frontend/lib/widgets/task_detail_sheet.dart:122` (`_canDecide`), `:165-181` (`_approve`/`_reject`), `:292`, `:315-320`, `:566` (diálogo de rejeição); cliente `frontend/lib/services/api_service.dart:531-547`; teste `backend/src/routes/tasks.test.js:948` |
| FR-031 | PASSED | `backend/src/routes/tasks.js:380` (approve), `:413` (reject com motivo), `:188` (GET /:id expõe history); `backend/src/models/Task.js:74-81` (`addHistory` com `user_id`), `:83-90` (`history` com `created_at` e `user_name`); teste `tasks.test.js:980-1014` (autor, tipo, motivo, data); smoke `backend/test.sh:639,673-674` |
| FR-032 | PASSED | `backend/src/routes/tasks.js:399-408` (400 sem escrita), `:537-538` (403 papel diverso do gestor); teste `tasks.test.js:1017-1074` (400 + status/histórico intactos; 403 prestador/admin/system_admin; 400 fora de Revisão); smoke `test.sh:649-667` |
| FR-033 | PASSED | `backend/src/routes/tasks.js:429-480` (FLOW em `:435`, motivo em `:441-444`, noop em `:445-449`), `:539` (`requireRole('admin','gestor')`); UI `task_detail_sheet.dart:126` (`_canMaintain`), `:187-193`, `:293`, `:329-367`; cliente `api_service.dart:552-562`; teste `tasks.test.js:1081-1147` (prestador/system_admin 403; admin e gestor mudam fora da sequência) |
| FR-034 | PASSED | `backend/src/routes/tasks.js:463-469` (`maintain` com `old → new: motivo`), `:451-456` (saída de Concluída limpa `completed_*`); `Task.js:74-81`; teste `tasks.test.js:1152-1197` (autor, estados, motivo; regressão de `completed_*`) |
| FR-035 | PASSED | `backend/src/routes/tasks.js:525-527,535-539` (`scopeDomain()` registrado antes das rotas novas); `backend/src/middleware/auth.js:51-59` (suspenso 403), `:92-105` (`scopeDomain`); teste `tasks.test.js:1200-1260+` (estrangeiro 403 sem escrita; suspenso 403 na autenticação) |
| FR-036 | PASSED | `backend/src/routes/attachments.js:12` (CATEGORIES), `:44-53` (validação antes de disco), `:57-62` (gate prestador/Concluída), `:64` (`saveToUploads` → `middleware/upload.js:35-59` tipo/tamanho), `:65-77` (INSERT com `category`); migração `backend/src/config/database.js:272` (DDL fresh com CHECK) e `:527-539` (ADD COLUMN preguiça idempotente); UI `task_detail_sheet.dart:68-69`, `:130-135` (`_canUpload`), `:212`, `:446-457` (seletor de categoria); cliente `api_service.dart:571-586`; testes `comments.test.js:233-337`, `database.test.js:803-897`, smoke `test.sh:694-718` |
| FR-037 | PASSED | `backend/src/routes/attachments.js:29-32` (`decorate` com autor), `:87-99` (GET), `:105` (rota); UI `task_detail_sheet.dart:382-423` (anexo com categoria/autor/data), `:474-499` (histórico com autor/ação/motivo/data); cliente `api_service.dart:589-592`; teste `comments.test.js:322-337`; widget test `frontend/test/task_detail_sheet_test.dart:103` |

### User Stories e Success Criteria
| ID | Status | Notes |
|----|--------|-------|
| US1 (P1) aprovação/rejeição | PASSED | Cenários 1-3: `tasks.test.js:948` (aprovação→Concluída+histórico), `:1017` (400 sem motivo, 403 não-gestor), `:980` (rejeição→Em Progresso com motivo/autor); T005–T007 `[X]` |
| US2 (P1) manutenção | PASSED | Cenários 1-3: `tasks.test.js:1081` (mudança com motivo+histórico), `:1093-1110` (prestador 403 sem alteração), `:1122-1130` (400 sem motivo antes de escrita); T008–T010 `[X]` |
| US3 (P2) anexos | PASSED | Cenários 1-2: `comments.test.js:233` (documentação em execução aparece no detalhe com autor/data — `:322`), `:265-284` (upload inválido 400 sem resíduo em disco nem banco); T011–T015 `[X]` |
| SC-001 | PASSED | Histórico de aprovação/rejeição com autor/data (`tasks.test.js:980-1014`); rejeição sem motivo nunca passa (`:1017-1030`, `test.sh:663`) |
| SC-002 | PASSED | Manutenção no histórico com autor/motivo/data (`tasks.test.js:1152-1177`); papel sem permissão 403 sem alteração (`:1093-1110`) |
| SC-003 | PASSED | Anexos com autor/data no detalhe (`comments.test.js:322-337`, widget `task_detail_sheet_test.dart:103`); upload inválido sem resíduo (`comments.test.js:265-284`) |
| T001–T018 | PASSED | 18/18 `[X]`, 0 unchecked; `.completed` presente |

## Traceability Gaps
- None

## Checklist Fulfillment — SKIPPED
- No checklists found (`specs/00014-manutencao-tarefas-aprovacao/checklists/` não existe)

## Performance — SKIPPED
- No performance NFRs in spec.md

## Accessibility — SKIPPED
- No accessibility NFRs in spec.md

## Browser Runtime Validation — SKIPPED
- Probe 6.0 executado: tool nativa de navegador ausente no harness; MCP ausente (`list_mcp_resource_templates` vazio, sem servidor browser) → `BROWSER_RUNTIME_AVAILABLE = false`
- `BROWSER_RUNTIME_REQUIRED = false`: nenhum SC/AC do spec depende de comportamento exclusivo de navegador real (todos são observáveis via API: estado, histórico, códigos 400/403, anexos)
- Cross-check 6b: cenários de UI cobertos headless por `flutter test` (12 testWidgets do sheet, 37 totais) e API por unit/smoke → nenhum gap → fallback manual 6c não acionado

## Manual Testing — SKIPPED
- Racional: sem `manual-test.md` — o fallback 6c só aciona quando 6b deixa gaps; aqui os cenários de aceitação de US1/US2/US3 são todos executáveis por API e widget tests (ver cross-check acima)
- Categoria não mandatória (`Required Categories`: linting, security) — SKIPPED vira WARNING, não bloqueia PASS

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/config/database.js | 3a512b503312e7b487a5430f7c3e76f3ef64a342c3fd4c815590e1b6f57abbcf |
| backend/src/config/database.test.js | d60def5adba046bafb65744b630783f46ad48c322a9a13f595e4be7b5f9c0733 |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/models/Task.js | 7811b4b87161ce85ac4c5d7e40407384a79c4cc0175af983c679e82b221551d8 |
| backend/src/routes/attachments.js | 07afcf5a7606f8c44d012108571d1da6a7fc30e2a6c44146d2971bcc1bf56441 |
| backend/src/routes/comments.test.js | a70c0154823b62de8d34e15c2931482313e122c51adb8c0a9338ff80376dd81d |
| backend/src/routes/tasks.js | e194c4919a5df5db15e5d4e16597b521ff589b35c7a59f93409f53fb27bd7f3e |
| backend/src/routes/tasks.test.js | c719a699ea89b0464541a16b05d58f486744d0ed0b5dea32e5fd4db22e2fb64c |
| backend/test.sh | e24235e13668608788b1111ee530e936223a2da04a4676e094a1015771c9f5f0 |
| frontend/lib/services/api_service.dart | 0d353f0f6e902fa1dc9ee16d8349665a91b4cec2431509549565f3054f95c15c |
| frontend/lib/widgets/task_detail_sheet.dart | d86e1094ba8b255e71f5e65fd6954b882066c5a5421e224a9e8fb5e8a18f78fa |
| frontend/test/task_detail_sheet_test.dart | 74f52331f13645c91eddba8e41852c0e2634b852f223ea031d42a358cf629333 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00014-manutencao-tarefas-aprovacao/plan.md | 1cc375921599c6c14b3844467a870b25ba243b92b93fb8b4bbe18ca295eeea6e |
| specs/00014-manutencao-tarefas-aprovacao/spec.md | b4ea768f100a9ed1ab7c3ad603e919e77dc757dbbea0b11b49faa1d877177d50 |
| specs/00014-manutencao-tarefas-aprovacao/tasks.md | 4490667f8e05377591f1675683904210b3d0b560ec3fb90e15de9650ec869821 |

## Tool Recommendations
- None

## Bug Tasks Generated
- None

## Attestation
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- QC Baseline Commit: 828b458505d8990f746971b631616598fbbb5612
- Evidence: bateria T018 em `.completed`, re-run alvo 34/34 neste QC, QC Evidence Manifest acima
