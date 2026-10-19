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
| backend/src/config/database.js | 3a512b503312e7b487a5430f7c3e76f3ef64a342c3fd4c815590e1b6f57abbcf |
| backend/src/config/database.test.js | d60def5adba046bafb65744b630783f46ad48c322a9a13f595e4be7b5f9c0733 |
| backend/src/config/opencode.js | e04b68cece645a75057bbf43307e77aee236f460c8f72b65a255c40023af8bac |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | 0b846abe632750370727fcf4ded7dc960f7309c956a6b9b53e0b7603fa6517f1 |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/middleware/upload.test.js | b691a831deb9208d404fa2fe6724dfce4c2fc31e4778d0b7bd28f1b1c0f08810 |
| backend/src/middleware/validate.js | 57afd3f9eac30f12fcc67f8ea67b3be3ac15b9199265495bd3b810a03dc80496 |
| backend/src/middleware/validate.test.js | 8c54a3f83317334e1f9c5a8b959c605542e263ddd4da377825c850d6755130ad |
| backend/src/models/Contract.js | 3a1d41203c218de9950c1d0161eb73cee671b84507b02ed545400a07364be17c |
| backend/src/models/ContractDefinition.js | 66226df76c435955e27d25391a65f245b047115571f8fddb0c0e2a01d0f27e50 |
| backend/src/models/ContractDefinition.test.js | aee0e83175bc25b6ebaddfcb0e534303cd5c66eea1adcd719e7dbc81de91543f |
| backend/src/models/ExecutionPlan.js | ee6f2fdb410e0be07eafacc90d9bda5769c6aafb39286cb159a3cde417e7465b |
| backend/src/models/ExecutionPlan.test.js | e57227da3128f89c9ed7da37f0e33a305329b20c0cea7a1097fd39221c6f1875 |
| backend/src/models/History.js | 247b461cd1a6af92b13f7621e86f740f4c85ab49711cdd8b94755601927d2ed6 |
| backend/src/models/History.test.js | 6b98be5eb1a2af5e09b3e4ffbdbb5504436d859be83ea00f17ee11dc15656a61 |
| backend/src/models/Task.js | 7811b4b87161ce85ac4c5d7e40407384a79c4cc0175af983c679e82b221551d8 |
| backend/src/models/TaskSuggestion.js | 00af7d79432eb005d0704d884b636b8e34cfaa9bd9665183f4184d0479e85828 |
| backend/src/models/User.js | a2be454ee6bd6246a752ae02706637e16abefb5e05b7d64c5d66528c90d32023 |
| backend/src/routes/attachments.js | 07afcf5a7606f8c44d012108571d1da6a7fc30e2a6c44146d2971bcc1bf56441 |
| backend/src/routes/auth.js | 5074d09de75b4edd24e4fe84a312a18803d8a2a6ea9db266f343569a89190abb |
| backend/src/routes/auth.test.js | a0c7b75de67050fe81c953dab40beb3b16ed63edec154dfa6df4d49a3128144c |
| backend/src/routes/comments.js | 5bf836b7b471e63eb0b909eab25584969e31a75ee2d3befa927f2591c53bdb6e |
| backend/src/routes/comments.test.js | a70c0154823b62de8d34e15c2931482313e122c51adb8c0a9338ff80376dd81d |
| backend/src/routes/contracts.js | 8402af134728216e79f89d0e293c5afb07d42425d686f623ce4356db895538d2 |
| backend/src/routes/contracts.test.js | 96a7c15ab8f3987478ea8837140444d2a8d60c9fb39b9732dd4fdc060d8a8f7f |
| backend/src/routes/dashboard.js | b55e171d0758828762518efd492627dee36b4ba8f895ef2cc2a3bd817c7989f8 |
| backend/src/routes/dashboard.test.js | c42fa0efc8ffd1258d0c59875e9b980a2a74c6ae2e3014073116025ab4c9175a |
| backend/src/routes/definitions.js | f62541fc3660326f010d994b39ce624ce664d79d642af78678bddfb8443003a5 |
| backend/src/routes/definitions.test.js | a97365517e5d67eea498f293a0a9e1954836663844bf279f8785d6185183b9bd |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/domains.test.js | 1900091211adfd881f22955bb632e3200be4a097d5d16048590de9f87c39899a |
| backend/src/routes/executionPlan.js | d5e9cadf08ea3252903b768e5a61ee8c4ab29a3726f5ef738b09764abf876d3f |
| backend/src/routes/executionPlan.test.js | b71b88075cd4dd8edb11d2a27f36166a98d62f099c0d0d48a5883cdc8d453973 |
| backend/src/routes/finalidades.js | 0211a4d952203894f4e5baa6b6c669e6cb3948eff772f7fa59626e028d9c861d |
| backend/src/routes/finalidades.test.js | b3b06c512cf13ad41110319213cde375b9f7c575e84110d3ed5dd72ecaa6c46e |
| backend/src/routes/opencodeConfig.js | 46591a7e1b7228d1a82b73aa80418f01af77f60b6006f6ffb6dfc701206659f8 |
| backend/src/routes/review.js | a27eda56139d87b3c43b739cc13544cd5dcc8f4ac990b90c918113a9c591ed1b |
| backend/src/routes/review.test.js | 49772069fa53b6d16f6aff10be3f6e792dd2202834fd9a542c7dfc0da241fcd2 |
| backend/src/routes/search.js | 8ee8dc248ddfdec0c611702e0931f55cc98c8b54b2cfa2e888e40dbbcd7b7f09 |
| backend/src/routes/search.test.js | 7e8f5e6e40b1389af316f00f876ebe39553f687048d783ffb50a4e0ee747abb1 |
| backend/src/routes/suggestions.js | 4ca936e209581f0412dec5b3476c11b244f3288025df01de4f477ebc6f3e48e3 |
| backend/src/routes/suggestions.test.js | 5605823184ca30ff212570310ed1d7ae9c29a73b8551231805febe26fa1fa885 |
| backend/src/routes/tasks.js | e194c4919a5df5db15e5d4e16597b521ff589b35c7a59f93409f53fb27bd7f3e |
| backend/src/routes/tasks.test.js | c719a699ea89b0464541a16b05d58f486744d0ed0b5dea32e5fd4db22e2fb64c |
| backend/src/routes/users.js | c876001662f18f280c4eafb6ffb839d852cb1656fe4ce963d51aedea85fa205b |
| backend/src/routes/users.test.js | 805f337700e508e44a89d215094856dd577cf6887368746da659ac4d9e81578a |
| backend/src/routes/workflow.js | 4294822dced59d77d617b4cc360d5fdabf7b29e61151105f4a29f13ef4a37306 |
| backend/src/routes/workflow.test.js | 595a534bcd7ad69c4af0bb05b1f9ce66aead07b52a05a5c895c47e4da18aba9a |
| backend/src/server.js | c3d963494f21ba84ec433f513f2230d36d245b4e4b5833003b58248d0a55d6ce |
| backend/src/server.socket.test.js | ec1d61fa2f7d1e89c382d24e376a13d3848e8fb29b5257c9588aab4be1132478 |
| backend/src/server.test.js | 362fca1777f92aa76c9b206ca88921b42527d5627ecff022253b9ab5f9cc4582 |
| backend/src/services/email.js | 488dae58d5d7d58cdfa72a221aef2a1c1ca5b11c060d3317043e03f7fd47f2e9 |
| backend/src/services/email.test.js | 79303466e5ccf1b02e1c202b841ba5340e1358f3423ecfcfa20bd8d4185624c1 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/src/services/opencode.js | c9f39ae0ef9dc758e0715bc4dd8e232cb3e52d0fb0139d0884c95ccdfaa6e0e3 |
| backend/src/services/opencode.test.js | bc46fc1d4ded74becfcce828b4c16b0cc9dab9952e5ad28fd97832e7b6307fe1 |
| backend/src/services/report.js | 524e561728a086fd66b1019ace16340ccbf7ae7d3611bcb89f80c653dd82003b |
| backend/src/services/report.test.js | acc4768c40918bdd541646c1c5484ea3c48ae9e0446598c660aac1c95b5ad316 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | e24235e13668608788b1111ee530e936223a2da04a4676e094a1015771c9f5f0 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/analysis_options.yaml | cc88073dea00345c800bf1f94021d3295cdd7fbd8b45a595a502a893304a5244 |
| frontend/lib/main.dart | 396fa7a21cd1aedbe1bae19a01dda2eec76d1c0f4b126da1292f06b927cc223b |
| frontend/lib/models/contract.dart | 7da8ce63968754bcb15ed334a699bf697f50d7e81136eed6f497299e5b05d702 |
| frontend/lib/models/finalidade.dart | bc43d42fcc9538fa780f5fb8943106f6816521622ecbc1f68ca07666ab444b4f |
| frontend/lib/models/project.dart | 9568f3033c682b1704dd046dc675ae5885058321edf90a9c3aef0c476af756a8 |
| frontend/lib/models/task.dart | 808d230aa47c53227825f7dd6eae5128bf4fcedb45892514a8956aa6ea1583a7 |
| frontend/lib/models/user.dart | dbfc8d897f31bb375b17124f8cff8b575b2d176d1098f43adbd1a20ba9933719 |
| frontend/lib/screens/contract_detail_screen.dart | 231b90584a19ae8e0df43506e44cb61b60483b652ef0538a4a225eabf3235d8e |
| frontend/lib/screens/dashboard_screen.dart | 5d1a74658b716b186f8d206e2994abfa50abf425b4407ea85e5a765493ad0689 |
| frontend/lib/screens/domains_screen.dart | 84187efce1a3886888ac57de3489132426353c6ceeca1dad191958c1f67268d4 |
| frontend/lib/screens/finalidades_screen.dart | 4dec9e410c2425e901b4ae0303cea920c57698c043ee6e0ae5e96e094bbf1a8c |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 5d5c18113324992ccef5ed2f5cd39c0e997152ddd12487b4e79a203290831ef6 |
| frontend/lib/screens/tasks_screen.dart | 4dfcdc63264e2fd7c66b2afa6b4289f0b4bd39c5598f6a244299b180c72b3f5c |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 0ba38be669983573d26af1cd874c464dee2368f4f71e8acc9d8722076aa64bf9 |
| frontend/lib/theme/app_theme.dart | ba9a7a048a7f732d7285f575a1c60089a1092e36f6889695c8b44df089147dc9 |
| frontend/lib/widgets/suggestion_panel.dart | 20da4924981b5c3e5d5583d07c6abe664e505bd7d1456f4ce27335c1b8df06c8 |
| frontend/lib/widgets/task_list_tile.dart | fbd5318d1ab87022e3492a0779e3d303db3f258ae7d0d9cd44772d39f9da6992 |
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
| specs/00003-workflow-assistido-contrato/contracts/openapi.yaml | 5b678789e70ea1441c0054a8e7dd44e0949fd7f25c711ccdbbe061e5f932887c |
| specs/00003-workflow-assistido-contrato/data-model.md | 9f95b97ca7c2ff2c40f882f0d59a87186524d647c5ff07918cd24e3e2008c99c |
| specs/00003-workflow-assistido-contrato/manual-test.md | 88deb5ec2e37f3d3ec945525e933c067d582b02e13d3b34ba13feb1bbd79b0da |
| specs/00003-workflow-assistido-contrato/plan.md | b26852fe8f7352a5871acf995d903d029f9352da7a5cb26d5b5eb6170c0e8b87 |
| specs/00003-workflow-assistido-contrato/research.md | 3f3094a1134167ceedaedfa81a47f7a3e371c91f61c9e40ac437d088f2f3e6ca |
| specs/00003-workflow-assistido-contrato/spec.md | 90be24eafe9cae7fbff7bb94efb0f000a47076a5469ed58a52807e4c1df1ec6d |
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
