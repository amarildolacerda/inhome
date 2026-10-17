# QC Report: Workflow Assistido por OpenCode (E0003)

**Date**: 2026-10-08T20:18:12Z (re-sigilo pós-PASS; selo original 2026-10-08T19:46:59Z)  
**Feature Directory**: specs/00003-workflow-assistido-contrato  
**Overall Verdict**: PASS

> Supersedes the prior verdicts **BLOCKED** (2026-10-08T14:05:24Z — único bloqueador: attestation) and **FAIL** (2026-10-07T22:31:22Z — T039/T040): attestation humana completa (`Status: ATTESTED`, verifier, UTC 2026-10-08T19:41:47Z, evidence, 6/6 cenários PASS), 0 findings CRITICAL/ERROR, parser da evidência 0 issues, manifesto 104 rows 100% digest-valid. Re-sigilo de 2026-10-08T20:18Z: housekeeping pós-PASS (deltas orquestrador abaixo) — veredito permanece PASS, 0 blockers abertos.

## QC Scope Baseline
- Baseline Commit: aa4b80e2579a6152298e2835f5da84b4b877933d
- Mode: Full (re-run final após attestation)
- Prior Baseline: aa4b80e2579a6152298e2835f5da84b4b877933d (runs anteriores de 2026-10-07T22:31:22Z FAIL e 2026-10-08T14:05:24Z BLOCKED — mesmo HEAD, nenhum commit novo)
- Changed Files (corrido da run PASS e do re-sigilo): na run PASS apenas `manual-test.md` (attestation humano em 2026-10-08T19:41:47Z; verificado por `find -newermt` + `git status` estável em 70 linhas/95–96 tokens). Após o selo PASS (19:49:37Z) o orquestrador alterou 5 caminhos (mtimes confirmados): `frontend/test/web_browsers_test.dart` (20:07:37Z), `frontend/test/a11y_labels_test.dart` (20:09:33Z) — unskip/fortalecimento dos stubs FR-027/FR-028; `specs/00001-contratos-mvp/tasks.md` (20:11:51Z, T031 `[ ]`→`[X]`); `specs/00001-contratos-mvp/.completed` (20:11:51Z, `Completed: 2026-10-08T20:11:33Z`, path novo `??`); `TODO.md` (20:12:09Z, item movido para Done). `backend/` intocado desde o PASS (varredura `find -newermt` vazia) — 79/79 e 84/84 seguem válidos. Flutter re-executado pelo QC após os edits: analyze 0 issues, 13/13 passed.
- Test Selection: Full suite (bateria de 2026-10-08 mantida para backend; flutter re-executado no re-sigilo)
- Scope Safety: QC não alterou implementação; alterações de QC: este relatório e `.qc-passed` (re-gravado no re-sigilo). `manual-test.md` alterado apenas pelo verificador humano.
- Digests: Evidence SHA-256 `f966414b1bef9ef142b5cd4db19aa7ba38f0b6a48b310dcf766f79f022c092f3` (104 rows) | Repository State SHA-256 `bdc810b271fd3d8cdd0627464b1ef44c87784988180e3538aff3e926dd8829b2` (`git status --porcelain=v1 -z --untracked-files=all`, 100 tokens, 97 kept, excluindo `.completed`/`.qc-passed`/`qc-report.md` deste recurso) | Digests superados: `030382f694a62da88d24c7e35da929950246fb6d22bc6ecd29def1b1cabff340` + `9779f8f3826ed2954b5a6523274ef924e968a5107d84c9f4d1a74e16fec846ba` (PASS 19:49Z), `a2549340cc82d96143b553d38f77e5c672b987657a135b7d5987f768759759f0` (BLOCKED), `395b104b40838e28edc66203eda04ab56207abab3c5cf21092397fba78552284` (FAIL)

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED | PASS | attestation humana registrada; 0 issues no parser |
| Attestation | PENDING (3 issues: ATTESTED, UTC, resultados) | ATTESTED 6/6 PASS (0 issues) | verificador humano em 2026-10-08T19:41:47Z |
| Manual scenarios | 6 PENDING | 6 PASS | todos executados no navegador em http://localhost/ |
| Requirements traceability | 7/7 items, 24/24 FR, 7/8 SC | 7/7 items, 24/24 FR, 8/8 SC | SC-002 → PASSED (cenário 3 ATTESTED PASS) |
| Evidence SHA-256 | a2549340cc82d961…59f0 | f966414b1bef9ef1…92f3 | `manual-test.md` na run PASS; 2 shas de teste no re-sigilo (via `030382f6…`) |
| Repository State SHA-256 | 9779f8f3826ed295…846ba | bdc810b271fd3d8c…29b2 | +4 paths no conjunto (97/100 kept): `00001/.completed` novo + deltas pós-PASS |
| Evidence manifest rows | 104 | 104 | = |
| Unit/smoke/flutter/audit/syntax | 79/79, 84/84, 0 issues + 11 passed, 0 vulns, 60/0 | 79/79, 84/84, 0 issues + 13 passed, 0 vulns, 60/0 | backend mantido (intocado pós-PASS); flutter re-executado |
| Unchecked tasks / checklists | 0 / 87 PASS | 0 / 87 PASS | = |
| `.qc-passed` | ausente | escrito nesta run (após validação) | caminho PASS do workflow |

Nenhuma regressão (todos os metrics = ou melhor).

## Seal Re-sign (housekeeping pós-PASS — não é novo ciclo de veredito)
Selo PASS original: 2026-10-08T19:49:37Z. Deltas orquestrador verificados pelo QC antes de re-selar:
| # | Delta | Verificação | Disposição |
|---|-------|-------------|------------|
| 1 | `frontend/test/web_browsers_test.dart` + `frontend/test/a11y_labels_test.dart` (unskip/strengthen, FR-027/FR-028) | shas do manifesto PASS `1c958d2b…`/`5cd9d5f7…` ≠ disco (`beb920e1…`/`ce9fb98f…`), mtimes 20:07/20:09Z pós-selo | 2 rows re-assinados no manifesto (104 → 104); flutter re-executado pelo QC: analyze 0 issues, **13/13 passed, 0 skipped** (antes 11+2 skip) |
| 2 | `specs/00001-contratos-mvp/tasks.md` T031 `[ ]`→`[X]` | `parse-tasks` 00001: valid, 34 tasks, 0 erros, 34/34 `[X]`; linha T031 confere | delta auditado, não bug; fora do manifesto 00003 (não adicionado) |
| 3 | `specs/00001-contratos-mvp/.completed` novo (`Completed: 2026-10-08T20:11:33Z`) | `??` em `git status`; sem `.qc-passed` | entra no repo-state (+1 path kept); **`specs/00001-contratos-mvp` está FORA do escopo deste QC** (decisão separada; `.completed` fresco, sem `.qc-passed`) |
| 4 | `TODO.md` item movido para Done | mtime 20:12:09Z pós-selo; arquivo tracked, fora do manifesto | delta auditado, não bug; fora do manifesto 00003 |

Efeitos: Evidence `030382f6…`→`f966414b…` (2 rows), Repo-state `9779f8f3…`→`bdc810b2…` (kept 93→97 de 100 tokens), baseline commit inalterado (`aa4b80e…`, HEAD verificado), `.qc-passed` re-gravado atomicamente com timestamp novo. Veredito permanece **PASS**; nenhum blocker aberto; nenhum finding novo; nenhuma task gerada.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| `.completed` gate | PASSED | presente à entrada e na saída (`Completed: 2026-10-08T13:04:59Z`); PASS não o remove |
| Tasks gate | PASSED | `parse-tasks` valid, 40 tasks, 0 errors; 40/40 `[X]`, 0 unchecked; `tasks.md` 6142/6144 B; `checklist-state.mjs` PASS (3/3 filas, 87/87 itens) |
| Policy Auditor (inline) | PASS | sem subagentes neste harness; auditoria inline: gramática, tamanhos, seções obrigatórias, fases; 0 violação CRITICAL |
| Unit tests backend | PASSED | 79/79, 0 fail (Node v24.18.1; log `/tmp/opencode/battery-unit-2.log`) |
| Smoke `backend/test.sh` | PASSED | 84/84, §§1–16 |
| Flutter static analysis | PASSED | `flutter analyze` → 0 issues, re-executado no re-sigilo (SDK Docker `ghcr.io/cirruslabs/flutter:stable`) |
| Flutter widget tests | PASSED | 13 passed, 0 skipped, 0 failed (re-executado no re-sigilo após unskip FR-027/FR-028; antes 11+2 skip pré-existentes de 00001) |
| Security dependency audit | PASSED | `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities |
| Syntax check backend | PASSED | `node --check` nos 60 arquivos de `backend/src` → 0 erros |
| Story verification | PASSED | 7/7: US2/US3 verificados contra a nova UI; US6 completo; cenários 5/6 agora PASS humanos |
| OpenAPI conformance | PASSED | `GET /api/contracts/:id/suggestions` ao vivo: 200/401/403/404/404 cross-domain + controles positivos |
| Security review (OWASP manual) | PASSED | rota nova com `requireRole('gestor')` + domínio do token + 404-first + SQL parametrizado; frontend allowlist-only; achados novos: 0 |
| Requirements traceability | PASSED | 7/7 work items, 24/24 FR, 8/8 SC (SC-002 fechado pela attestation do cenário 3) |
| Browser probe (6.0) | PASSED (manual fallback) | sem tool de browser; 6 cenários executados pelo humano em http://localhost/ e atestados PASS |
| Manual attestation | PASSED | `Status: ATTESTED`, verifier, `2026-10-08T19:41:47Z`, evidence; 6/6 PASS; parser 0 issues |
| Code coverage | SKIPPED | Coverage Target vazio em `.github/sddp-config.md` |
| BUG task migration | N/A | nenhum finding novo; nenhum bug task gerado; `tasks.md` inalterado |

## Test Results — PASSED
- Backend: bateria mantida da run PASS (nenhuma alteração em `backend/` desde 19:49:37Z — varredura `find -newermt` vazia):
- Runner: `node --test` via `npm --prefix backend test` (Node v24.18.1). Total 79, Passed 79, Failed 0. Log `/tmp/opencode/battery-unit-2.log`. `server.test.js:197` espera `EADDRINUSE :::3001` com stack ativa — dependência de ambiente conhecida, não defeito.
- Runner: `docker compose build backend` + `up -d`; `GET /api/health` → `{"status":"ok"}`; `http://localhost/` → 200.
- Runner: `bash backend/test.sh`. Total 84, Passed 84, Failed 0 (§§1–16).
- Runner: full `flutter test` no SDK Docker, re-executado pelo QC no re-sigilo (2026-10-08T20:17Z). 13 passed, 0 skipped, 0 failed (FR-027 `web_browsers_test` e FR-028 `a11y_labels_test` unskipped). `flutter analyze` → "No issues found!".
- Runner: `npm --prefix backend audit --audit-level=high`. 0 vulnerabilities.
- Runner: `node --check` em todos os `backend/src/**/*.js` (60 arquivos). 0 erros.
- Sondas HTTP ao vivo: sem token → 401; system_admin → 403; admin de domínio → 403; gestor → 200 com `{"suggestions":[]}`; fantasma → 404; cross-domain → 404 com controles positivos 200.
- Execução humana no navegador (attestation): 6 cenários PASS em `http://localhost/` (2026-10-08T19:41:47Z).

## Failure Index
Nenhuma falha nova. Correções das runs anteriores permanecem verificadas:
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| F4 (2026-10-07) | requirement-gap | ERROR — RESOLVED | frontend/lib/screens/contract_detail_screen.dart | US2/US3 sem UI: resolvido por `suggestion_panel.dart` (1322 linhas) + gate `role == 'gestor'` (`:402`); agora também atestado nos cenários 5 e 6 | T039 `[X]` |
| N1 (2026-10-07) | requirement-gap | WARNING — RESOLVED | contracts/openapi.yaml:309 | `listSuggestions` sem rota: rota em `suggestions.js:352`, teste FR-017, prova ao vivo 200 | T040 `[X]` |
| OBS1 (2026-10-07) | stale-evidence | WARNING — RESOLVED | checklists/CHL003-data-integrity.md CHK008 | comentário pré-F1 atualizado; `[X]` e IDs intactos | None — fechado em QC |

### Recusar (US3/FR-009) — disposition: CORRECT, sem finding
- Especificação não exige estado de rejeição: FR-007 cobre remoção de itens, FR-009/SC-004 exigem só que lista vazia bloqueie aprovação; contrato não declara endpoint de rejeição nem status de rejeição no enum de `task_suggestions` (`pendente|analisando|sugerido|falha|aprovada`).
- Implementação usa a primitiva permitida: `Recusar` = PATCH `removed: true` em cada item ativo, com diálogo de consequências (`suggestion_panel.dart:384-440`); depois `_keptCount == 0` → `_showBlockedApproval()` — o mecanismo exato do SC-004. Reversível por item; versões/histórico intactos.
- Ressalva operacional (não é finding): N PATCHes sem transação; falha parcial é contada e recarregável (idempotente), sem corrupção; atomicidade em lote não existe no contrato e a spec não a exige.

### Observations (NIT — sem bug task)
1. `frontend/lib/widgets/suggestion_panel.dart:151-153` — comentário do fallback ainda menciona "Enquanto a listagem não existe no backend (T040)" (concluído). Só o texto está obsoleto; o código permanece defensável. Manutenção futura, sem task.
2. `specs/00003-workflow-assistido-contrato/plan.md:158` — linha de cobertura FR-017 cita só `History.js`; a facet de sugestões agora é `routes/suggestions.js:listSuggestions()` + teste FR-017. Linha parcial (não errada); sem edição por orçamento de bytes (10206/10240 B). Evidência completa no traceability.

## Code Coverage — SKIPPED
- Threshold: Not configured (`.github/sddp-config.md` Coverage Target vazio).
- Status: SKIPPED; o gate é a suíte verde (79 unit, 84 smoke, 11 widget).

## Static Analysis — PASSED
- Tool: `node --check` (backend), `flutter analyze` (frontend), `parse-tasks.mjs`, `checklist-state.mjs`.
- Critical issues: 0, Warnings: 0, Infos: 0 ("No issues found!").

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities.
- Tool: revisão OWASP manual (exigida por `project-instructions.md`).
- Rota nova (`GET /api/contracts/:id/suggestions`): `authenticateToken` antes do handler, `requireRole('gestor')`, `getDomainDb(req.user.domainId)` sem canal `domainId`, `contractOr404` 404-first, SQL parametrizado (`WHERE s.contract_id = ? AND s.kind = ?`).
- Frontend: `updateSuggestionItem` só `titulo/descricao/justificativa/removed` (nulos omitidos), `refineSuggestion` só `instrucoes`, demais chamadas sem corpo; `buildItemUpdate` itera mapa estático (sem mass-assignment); `validate(REFINE_SCHEMA)` lê só `instrucoes` (1..5000).
- Fronteira 401/403/404 verificada ao vivo. Achados novos: 0.

## Project Instructions Compliance — PASSED
- Linting (obrigatório): `flutter analyze` → 0 issues; backend `node --check` → 0 erros.
- Security scanning (obrigatório): `npm audit --audit-level=high` → 0 vulnerabilities; OWASP manual sem achados.
- Unit tests antes de promoção (obrigatório): 79/79; nenhuma promoção `dev` → `main` foi feita.
- Branch atual: `dev`; nenhum commit realizado pelo QC.
- Gramatura: `tasks.md` 6142/6144 B, `spec.md` 10172/10240 B, `plan.md` 10206/10240 B; IDs intactos; checkboxes 40/40 `[X]`.
- Nenhuma violação de `project-instructions.md` em nenhuma severidade.

## Requirements Traceability — 7/7 work items verified, 24/24 requirements, 8/8 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | definições persistem com histórico autor/data; cenário 1 ATTESTED PASS |
| US2 | Work Item | PASSED | chip de estado + listener `analysis_state` + polling 1 s (`suggestion_panel.dart:89-100,241-259,697-714`); retry em falha; cenário 5 ATTESTED PASS |
| US3 | Work Item | PASSED | editar/remover com Desfazer, refinar 1–5000, recusar, aprovar com bloqueio em zero; gate gestor (`contract_detail_screen.dart:402`); cenário 5 ATTESTED PASS |
| US4 | Work Item | PASSED | `activateWorkflow()/optInManualTask()`; `workflow_activated` pós-commit; cenário 2 ATTESTED PASS |
| US5 | Work Item | PASSED | plano consultável sem bloquear ativação; cenário 3 ATTESTED PASS (CLI real) |
| US6 | Work Item | PASSED | FR-017 completo: `History.js` + rota ao vivo 200 + seletor de versões; cenário 6 ATTESTED PASS |
| US7 | Work Item | PASSED | revisão assíncrona, só `A Fazer`, reabertura vira conflito; cenário 4 ATTESTED PASS |
| FR-001 | Requirement | PASSED | `getDefinitions()/saveDefinitions()` em `routes/definitions.js` |
| FR-002 | Requirement | PASSED | `listVersions()` em `models/ContractDefinition.js` |
| FR-003 | Requirement | PASSED | `assertDefinitionsComplete()` → 400 sem definição |
| FR-004 | Requirement | PASSED | `requestAnalysis()` assíncrono em `services/opencode.js` |
| FR-005 | Requirement | PASSED | `parseSuggestion()/createSuggestion()` em `models/TaskSuggestion.js` |
| FR-006 | Requirement | PASSED | `runAnalysisJob()/markFailed()` — falha preserva definições e libera retry |
| FR-007 | Requirement | PASSED | `updateItem()/removeItem()` + UI `_editItem/_removeItem/_restoreItem` com Desfazer |
| FR-008 | Requirement | PASSED | `refineSuggestion()` nova versão + `refine_instructions`; UI exige `instrucoes` 1–5000 |
| FR-009 | Requirement | PASSED | `approveSuggestion()` recusa lista vazia; UI bloqueia com diálogo (`_keptCount == 0`) |
| FR-010 | Requirement | PASSED | `activateWorkflow()/optInManualTask()`; um workflow ativo por contrato |
| FR-011 | Requirement | PASSED | `listTasks()/updateTaskStatus()` em `routes/tasks.js` |
| FR-012 | Requirement | PASSED | `emitDomainEvent('workflow_activated')` pós-commit em `services/events.js:24` |
| FR-013 | Requirement | PASSED | `getActiveWorkflow()` por papel |
| FR-014 | Requirement | PASSED | `requestExecutionPlan()/parsePlan()` em `services/opencode.js` |
| FR-015 | Requirement | PASSED | `getPlan()/regeneratePlan()` em `routes/executionPlan.js` |
| FR-016 | Requirement | PASSED | `upsertPlan()` sem escrita de execução em `models/ExecutionPlan.js` |
| FR-017 | Requirement | PASSED | `recordVersion()/listVersions()` + `listSuggestions()` (`suggestions.js:334/:352`) + teste FR-017 + cenário 6 ATTESTED PASS |
| FR-018 | Requirement | PASSED | 60 s default sem retry automático; botão "Tentar novamente" só em `falha` (`suggestion_panel.dart:702-707`) |
| FR-019 | Requirement | PASSED | `requireRole()/scopeDomain()` por rota; 401/403 ao vivo |
| FR-020 | Requirement | PASSED | `buildContext()` restrito a `CONTEXT_ALLOWLIST` (`config/opencode.js:17`) |
| FR-021 | Requirement | PASSED | chip + socket `analysis_state` + polling 1 s, só gestor; cenário 5 ATTESTED PASS |
| FR-022 | Requirement | PASSED | `loadReviewContext()/submitRevision()` assíncrono |
| FR-023 | Requirement | PASSED | `applyApprovedRevision()` só `A Fazer`; conflito intacto; texto do spec correto (F1) |
| FR-024 | Requirement | PASSED | `startManualReview()` gatilho manual, sem reanálise |
| SC-001 | Success Criteria | PASSED | definições persistem ao recarregar (cenário 1 ATTESTED PASS) |
| SC-002 | Success Criteria | PASSED | estado visível (código+testes) e execução com CLI real observada no navegador — cenário 3 ATTESTED PASS (2026-10-08T19:41:47Z) |
| SC-003 | Success Criteria | PASSED | falha preserva definições + retry na tela |
| SC-004 | Success Criteria | PASSED | remover/editar/refinar/aprovar na UI; lista vazia recusa aprovação — cenário 5 ATTESTED PASS |
| SC-005 | Success Criteria | PASSED | prestador vê tarefas e sessões recebem evento — cenários 2/4 ATTESTED PASS |
| SC-006 | Success Criteria | PASSED | plano sem bloquear ativação e regeneração — cenário 3 ATTESTED PASS |
| SC-007 | Success Criteria | PASSED | histórico autor/data + listagem ao vivo + seletor — cenário 6 ATTESTED PASS |
| SC-008 | Success Criteria | PASSED | revisão edita/cria `A Fazer` e conflitos — cenário 4 ATTESTED PASS |

## Traceability Gaps
- Gaps fechados: UI de análise/sugestão (T039) e rota `listSuggestions` (T040); attestation dos 6 cenários humana em 2026-10-08.
- E2E do E001 (28 checks): script original não recuperável (AD-002); nenhuma execução inventada. Cobertura **COVERED-BY-PROXY**: `backend/test.sh` §§1–16 + `finalidades/comments/search/report/tasks/workflow.test.js` + `server.socket.test.js` + `roles_nav_test.dart`/`task_list_tile_test.dart`; timing real → cenário 3 (PASS humano).
- Observações NIT: comentário obsoleto `suggestion_panel.dart:151-153`; linha de cobertura FR-017 parcial em `plan.md:158`.
- Exclusões por design: `backend/.env` git-ignored (sem row); logs de bateria fora do repositório.

## Implementation Review Findings — SKIPPED
- Nenhum artefato `.review-findings` presente; seção sem dados.

## Checklist Fulfillment — 10 spot-checked, 10 PASSED
- CHL001 CHK001 — PASSED — `scopeDomain` só em `definitions.js`; demais rotas (incluindo `listSuggestions`) usam `req.user.domainId` exclusivamente.
- CHL001 CHK004 — PASSED — `requireRole('gestor')` em análise/aprovação/listagem; 403 ao vivo para system_admin e admin de domínio.
- CHL001 CHK005 — PASSED — `CONTEXT_ALLOWLIST` intacta em `buildContext()`.
- CHL001 CHK008 — PASSED — `refine_instructions` persiste e chega ao OpenCode; allowlist intacta.
- CHL001 CHK009 — PASSED — só `instrucoes` (1..5000) compõe o prompt; payload do frontend confirma.
- CHL001 CHK026 — PASSED — consultas parametrizadas em todas as entradas livres.
- CHL002 CHK001 — PASSED — 23 operações com auth/`x-roles`/`x-fr`; `x-roles` de `listSuggestions` = `requireRole('gestor')`.
- CHL002 CHK015 — PASSED — papéis do plano coincidem com `x-roles`.
- CHL003 CHK004 — PASSED — conflito cobre spec, código e `revision_conflicts`.
- CHL003 CHK008 — PASSED — comentário atualizado para FR-023 vigente; `[X]` e IDs intactos; `checklist-state.mjs` PASS.
- Listas 100% checadas: 87 itens (29 + 30 + 28), 0 pendentes.

## Performance — SKIPPED
- `spec.md` não declara NFR de performance; nenhum tool de benchmark. (SC-002 observado no cenário 3 atestado com CLI real.)

## Accessibility — SKIPPED
- `spec.md` não declara NFR de acessibilidade; nenhum tool solicitado.

## Browser Runtime Validation — PASSED (manual fallback)
- Mode: Manual fallback (sem tool de browser: `BROWSER_RUNTIME_AVAILABLE = false`; sonda 6.0 sem tool nativa e `list_mcp_resources` vazio)
- App start: `docker compose build backend` + `up -d`; health ok; `http://localhost/` → 200
- Target: http://localhost/
- Scenarios: 6/6 executados pelo verificador humano no navegador e registrados PASS em `manual-test.md` (2026-10-08T19:41:47Z)

## Manual Testing — Required — ATTESTED
- `manual-test.md`: `Status: ATTESTED`, `Verifier: usuário do projeto (confirmação humana "feito" nesta sessão)`, `Verified At (UTC): 2026-10-08T19:41:47Z`, Evidence preenchida; 6/6 cenários `PASS`.
- Validação: `scripts/lib/qc-evidence.mjs` → 0 issues (as 3 issues da run BLOCKED sumiram); manifesto 104 rows com digests conferidos byte a byte.
- `.qc-passed` escrito ao final desta run no formato do precedente E001.

## QC Evidence Manifest

| Path | SHA-256 |
|------|---------|
| .github/sddp-config.md | 643a1aeeb889417f72050009a807a4869e4b526517262428997377203c47753d |
| backend/package-lock.json | f4806de0cbadddea7583bb1fd46dfdfa2a2e2188c50a15ccfe77e61c4d034962 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | dd8eb160af618f6ee17247a92f8cd3db4041825599c1dd7e3ff235a8e99e20e3 |
| backend/src/config/database.test.js | 849a804f0f4168fa33d412272bbebcf9a4a9e1d400493b3ec15abf517f07ead0 |
| backend/src/config/opencode.js | e04b68cece645a75057bbf43307e77aee236f460c8f72b65a255c40023af8bac |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | ef73381f5457cbb0b339ad652522389bd24160e3ee2ab453a1010beb2fab5bae |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/middleware/upload.test.js | b691a831deb9208d404fa2fe6724dfce4c2fc31e4778d0b7bd28f1b1c0f08810 |
| backend/src/middleware/validate.js | 57afd3f9eac30f12fcc67f8ea67b3be3ac15b9199265495bd3b810a03dc80496 |
| backend/src/middleware/validate.test.js | a23f4ad7783ff07c95ba218517a13271cdc836a345e082f1e2ba76ba4eaf46fa |
| backend/src/models/Contract.js | 3a1d41203c218de9950c1d0161eb73cee671b84507b02ed545400a07364be17c |
| backend/src/models/ContractDefinition.js | 66226df76c435955e27d25391a65f245b047115571f8fddb0c0e2a01d0f27e50 |
| backend/src/models/ContractDefinition.test.js | 4bad5d63fdb3110751eb2d51579c2643b5ed51364dd0057ac69334f296236960 |
| backend/src/models/ExecutionPlan.js | ee6f2fdb410e0be07eafacc90d9bda5769c6aafb39286cb159a3cde417e7465b |
| backend/src/models/ExecutionPlan.test.js | e57227da3128f89c9ed7da37f0e33a305329b20c0cea7a1097fd39221c6f1875 |
| backend/src/models/History.js | 247b461cd1a6af92b13f7621e86f740f4c85ab49711cdd8b94755601927d2ed6 |
| backend/src/models/History.test.js | 97d794ba86211454764015a7b8c3ec2405c0e478f616c56264e50e45b699627f |
| backend/src/models/Task.js | 7811b4b87161ce85ac4c5d7e40407384a79c4cc0175af983c679e82b221551d8 |
| backend/src/models/TaskSuggestion.js | 00af7d79432eb005d0704d884b636b8e34cfaa9bd9665183f4184d0479e85828 |
| backend/src/models/User.js | a2be454ee6bd6246a752ae02706637e16abefb5e05b7d64c5d66528c90d32023 |
| backend/src/routes/attachments.js | 857e945a6dab3a753c2127e9db112b1eed0d5c5d1cea183def43f47e8cd88428 |
| backend/src/routes/auth.js | 377eacc0f80ceb6e3e963b6f651c41b13afab928b260c5006dfe65c02ab1659b |
| backend/src/routes/auth.test.js | 9376b29fc9e77d2794210f4c1f4d9b9be36db1437b5aa73f85b863de79a1db62 |
| backend/src/routes/comments.js | cbdb7042aebe9347b24db52930fa639d43f1758cde00d494630523891fd37372 |
| backend/src/routes/comments.test.js | 3ae139b07a435e05554394e6c75e35508ccb43d00cdb10c99bb444c48ba4f1e5 |
| backend/src/routes/contracts.js | aef99e4e897d83be1e72eda31abf322cc4bba65b74e3d7dd6b2c1b22f721bbb5 |
| backend/src/routes/contracts.test.js | d3dc735f2b19d42b882c20c99a15bb3d29ec69d9308fd8d6fcbdf90ef19ddb44 |
| backend/src/routes/dashboard.js | d970452dbbaee48fc42aa9eb42b210b4fa6053ac2e1d51d98f0454ca1be5bacb |
| backend/src/routes/dashboard.test.js | b655fe514b627a785155d4bb72ab574ac28ca9af5e741279f856dea032b3df8b |
| backend/src/routes/definitions.js | 1fdf7475f5db3f6186d0948a7fa0a39e296c8bf36351afaecca34c372288d23e |
| backend/src/routes/definitions.test.js | 3be1cdb1f40976d91678cd4c130d789642db0eac237c5a07fe54b0a737da68fb |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/domains.test.js | 16ae3265b0ceb7fd9df5b22647e7e211c311eee928a3a0a1654da9091bb0cb60 |
| backend/src/routes/executionPlan.js | beed7db447b83fbe1ef00f5255c9c248f8e7ca4bf373c6be4e675f0804456a7c |
| backend/src/routes/executionPlan.test.js | 3e46d814390b2da4cd9339f9836560a1dd57822a6cec1f6646604ae03ace2ac5 |
| backend/src/routes/finalidades.js | 0211a4d952203894f4e5baa6b6c669e6cb3948eff772f7fa59626e028d9c861d |
| backend/src/routes/finalidades.test.js | 64639620829bdd6a0eb32cf302d48bc5b29171362454385966da96174bc29cda |
| backend/src/routes/opencodeConfig.js | 46591a7e1b7228d1a82b73aa80418f01af77f60b6006f6ffb6dfc701206659f8 |
| backend/src/routes/review.js | da3b821d3512868fd337fd890973e3bee4366a5168a0570d0ff71ba549ab6646 |
| backend/src/routes/review.test.js | 7693f5e09c21a8455f637807b512a6fa6e6d72c372dce8ac32c271f7ec63ebcc |
| backend/src/routes/search.js | 8ee8dc248ddfdec0c611702e0931f55cc98c8b54b2cfa2e888e40dbbcd7b7f09 |
| backend/src/routes/search.test.js | e10118c6e026e630ba2c2611c53dd2de98bd647c1cb7f4c305872e405a0016f9 |
| backend/src/routes/suggestions.js | 00a561142e8a9d4078f7e4fd3370059c6d90a05b12cad7393483e01dab6d7b75 |
| backend/src/routes/suggestions.test.js | 802fc9779d3348f8f453fb5c72ba21d792972b040fd8f707a97d2253eb0f59b3 |
| backend/src/routes/tasks.js | a78e7b6ec2b03ca0be443ca4dfcb9c23828ba59f1494ee18cb33278685d0d665 |
| backend/src/routes/tasks.test.js | 909891037b533bd5ca9b581fad9f7d0f1cee37a8a6f3df3aaad15d13a8ec7e51 |
| backend/src/routes/users.js | c876001662f18f280c4eafb6ffb839d852cb1656fe4ce963d51aedea85fa205b |
| backend/src/routes/users.test.js | d4656587eb3267e9cf10e798612dfd12a006dba4b16d6631c1973fdad742e257 |
| backend/src/routes/workflow.js | 0676489e5137ea02a918d4af2755d39cedf71bafac16f9e312ebfce0ec939e6d |
| backend/src/routes/workflow.test.js | 896b1fd1aabce202d72056034bc82fcaea0847b3dc548872008c9859c7dba684 |
| backend/src/server.js | aef98350b0e901b95fa62e4681e26c695e7d234c9f29e561875e436a512b360e |
| backend/src/server.socket.test.js | 345bfc4cb759cb6ef06413266a8f5738e55e707a9b3c703708c35be3c179efee |
| backend/src/server.test.js | da2e252498bf01ffa86679e2aa67e306ae44431fa746622c345be344805f58f2 |
| backend/src/services/email.js | 488dae58d5d7d58cdfa72a221aef2a1c1ca5b11c060d3317043e03f7fd47f2e9 |
| backend/src/services/email.test.js | ad17d2f9a3175a672a7c036969612e831bf5fbd592656f92544d4b3a66bde155 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/src/services/opencode.js | c9f39ae0ef9dc758e0715bc4dd8e232cb3e52d0fb0139d0884c95ccdfaa6e0e3 |
| backend/src/services/opencode.test.js | 01bf3ab27ec83d5104c7b21b4e0ba3cd32745e85f2f72b70448698a68915079a |
| backend/src/services/report.js | 524e561728a086fd66b1019ace16340ccbf7ae7d3611bcb89f80c653dd82003b |
| backend/src/services/report.test.js | cdcdc434d840108a63b862800171ee4c60fac9a00a8ca1d60a990642b22f4da9 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | 30d89c1c21992a50ccac56586936dca70a617be69e3cbb58ce1d6b9e22d929ac |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/analysis_options.yaml | cc88073dea00345c800bf1f94021d3295cdd7fbd8b45a595a502a893304a5244 |
| frontend/lib/main.dart | f4c6481f669d33f0119ebc98a3572a1cf68046ce0ee9c667cf42dbbc8663a263 |
| frontend/lib/models/contract.dart | 7da8ce63968754bcb15ed334a699bf697f50d7e81136eed6f497299e5b05d702 |
| frontend/lib/models/finalidade.dart | bc43d42fcc9538fa780f5fb8943106f6816521622ecbc1f68ca07666ab444b4f |
| frontend/lib/models/project.dart | 9568f3033c682b1704dd046dc675ae5885058321edf90a9c3aef0c476af756a8 |
| frontend/lib/models/task.dart | 209670535d0d5611254fc7deb3d16aa906a08a173c83b5cbb522e847d482035a |
| frontend/lib/models/user.dart | dbfc8d897f31bb375b17124f8cff8b575b2d176d1098f43adbd1a20ba9933719 |
| frontend/lib/screens/contract_detail_screen.dart | 231b90584a19ae8e0df43506e44cb61b60483b652ef0538a4a225eabf3235d8e |
| frontend/lib/screens/dashboard_screen.dart | 536782455544479e096dc600188f3aafae248294e32cc7557ce9673e8e32ac76 |
| frontend/lib/screens/domains_screen.dart | 84187efce1a3886888ac57de3489132426353c6ceeca1dad191958c1f67268d4 |
| frontend/lib/screens/finalidades_screen.dart | 4dec9e410c2425e901b4ae0303cea920c57698c043ee6e0ae5e96e094bbf1a8c |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 5d5c18113324992ccef5ed2f5cd39c0e997152ddd12487b4e79a203290831ef6 |
| frontend/lib/screens/tasks_screen.dart | 5a7f3004f1a83779f457b020ce6083664e57bebdcd330ce3a8c11edc0c784a14 |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 7fb65869ec8eb2746da21bd9faa8f2989719cfd838b30ab4605c8939a7d900c7 |
| frontend/lib/theme/app_theme.dart | ba9a7a048a7f732d7285f575a1c60089a1092e36f6889695c8b44df089147dc9 |
| frontend/lib/widgets/suggestion_panel.dart | 20da4924981b5c3e5d5583d07c6abe664e505bd7d1456f4ce27335c1b8df06c8 |
| frontend/lib/widgets/task_list_tile.dart | 03c810c3d1d63d40116d6834a040102a18d91c35f2ddcd57e84861234539b920 |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| scripts/checklist-state.mjs | 872b76fcd87f2e03c98883fffb56f81c4bf1a20b3d0706922a480db0acc75f38 |
| scripts/lib/qc-bug-tasks.mjs | 66031f8489fc49b1255237bf653a41bb27d2612749367a3c124584c16725db81 |
| scripts/lib/qc-evidence.mjs | 391ec36cb4ee38997a2ed14486cb6b3c778e7e13aad62be41e9df33676523a86 |
| scripts/parse-tasks.mjs | 3e550e85cdcbbf26533d527cd71bb59c38927bc239fbe555e4885969196daef5 |
| scripts/runtime-preflight.mjs | 1464723ce1705934f85273163f88437f8c4dd9d66499b69da89e5b3188d16c30 |
| specs/00003-workflow-assistido-contrato/checklists/CHL001-security.md | 090a632ee31c9178e0487250a68ea3298c7deb7a51009884f6bf649d8b7c149c |
| specs/00003-workflow-assistido-contrato/checklists/CHL002-api-quality.md | b51bb86b166f7a8a790661f37a6025509d2b31fb8b1aaa0d9c52d26de5b7bf9b |
| specs/00003-workflow-assistido-contrato/checklists/CHL003-data-integrity.md | ad88a1ab45422011f804623e6f42570ba272d094e1d59541a08d6508992ecb17 |
| specs/00003-workflow-assistido-contrato/contracts/openapi.yaml | 13c23043cd03f3934e750ba3f3e6cdd5a9d697acd33e0dfc673a5db99fc10358 |
| specs/00003-workflow-assistido-contrato/data-model.md | 9f95b97ca7c2ff2c40f882f0d59a87186524d647c5ff07918cd24e3e2008c99c |
| specs/00003-workflow-assistido-contrato/manual-test.md | 88deb5ec2e37f3d3ec945525e933c067d582b02e13d3b34ba13feb1bbd79b0da |
| specs/00003-workflow-assistido-contrato/plan.md | b26852fe8f7352a5871acf995d903d029f9352da7a5cb26d5b5eb6170c0e8b87 |
| specs/00003-workflow-assistido-contrato/research.md | 3f3094a1134167ceedaedfa81a47f7a3e371c91f61c9e40ac437d088f2f3e6ca |
| specs/00003-workflow-assistido-contrato/spec.md | 4ee88726795f41e429e5251a319b8b78287e41b4496d9bf627831e823a154570 |
| specs/00003-workflow-assistido-contrato/tasks.md | 54897e71fca024ed70a91da8d9c9769fc132220914b20d0566373b3b244b202b |

## Tool Recommendations
- Browser tool para sondas 6.0 futuras: tool web nativa do harness ou servidor MCP de browser (ex.: `npm i -D @playwright/test && npx playwright install chromium`), para rodar os cenários de `manual-test.md` dentro do QC.
- Cobertura de código: preencher Coverage Target em `.github/sddp-config.md` e instrumentar com `npx c8` sobre `npm test` quando o projeto quiser o gate.

## Bug Context
Nenhum bug novo. Bugs das runs anteriores verificados como resolvidos:
| Bug Task | Verificação |
|----------|-------------|
| T039 | `suggestion_panel.dart` (1322 linhas) implementa estado/retry/editar/refinar/recusar/aprovar; gate gestor (`contract_detail_screen.dart:402`); analyze 0 issues; test 11 passed; cenários 5/6 PASS humanos |
| T040 | rota `listSuggestions` (`suggestions.js:352`), teste FR-017 verde (79/79), prova ao vivo 200 + 401/403/404/404 cross-domain; cenário 6 PASS humano |

## Bug Tasks Generated
- None — nenhum finding novo em nenhuma das runs finais; nenhuma task gerada.
- `tasks.md` inalterado nesta run: 40/40 `[X]`, 6142/6144 B, `parse-tasks` 0 erros.
