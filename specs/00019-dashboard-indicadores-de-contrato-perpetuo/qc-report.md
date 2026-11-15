# QC Report: Indicadores de perpétuo, conclusão e tarefas atrasadas (E017 / 00019)

**Date**: 2026-11-15T12:10:45Z
**Feature Directory**: specs/00019-dashboard-indicadores-de-contrato-perpetuo
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: bf546b09b95a08cd4fe386d52a57f36b337892df
- Mode: Full
- Prior Baseline: N/A (first QC run for this feature)
- Changed Files: N/A (full run)
- Test Selection: Full suite (`npm test`, `bash backend/test.sh`, `flutter test`, `flutter analyze`, `npm audit`)
- Scope Safety: first QC run without prior `qc-report.md` → every category executed in full; no scoped selection needed.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Compilation | PASSED | `flutter analyze` exit 0; backend é JS puro (sem build step), `node --test` prova parse/execução |
| Lint / Static Analysis | PASSED | `flutter analyze` — 0 issues (62 issues pré-existentes de bf546b0 corrigidos nesta sessão) |
| Security | PASSED | `npm audit` (backend) — 0 vulnerabilities |
| Unit Tests (backend) | PASSED | `node --test` — 173/173 |
| E2E (backend) | PASSED | `bash backend/test.sh` — 182/182 PASS |
| Unit Tests (frontend) | PASSED | `flutter test` — 83/83 |
| Requirements Traceability | PASSED | 3/3 work items, 7/7 SC |
| Checklist Fulfillment | PASSED | 102/102 itens completos; spot-check Testability |
| Accessibility | PASSED | contraste AA nos dois temas + rótulos Semantics (automatizado) |
| Performance | SKIPPED | sem NFR de performance no spec (fora de escopo) |
| Browser Runtime | SKIPPED | sem tool de browser; nenhum SC depende de navegador real (6b: coberto por `flutter test`) |
| Coverage | SKIPPED | threshold não configurado no sddp-config |

## Test Results — PASSED
- Runner: `node --test` (backend), Total: 173, Passed: 173, Failed: 0
- Runner: `bash backend/test.sh` (E2E API), Total: 182, Passed: 182, Failed: 0
- Runner: `flutter test` (frontend), Total: 83, Passed: 83, Failed: 0
- Execução real nesta sessão; `npm test` exigiu `docker compose stop backend` (porta 3001 do stack) e o stack foi reiniciado em seguida (`docker ps` confirmou Up).

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | nenhum falha | — |

## Code Coverage — SKIPPED
- Threshold: Not configured (`sddp-config.md` Coverage Target vazio)
- Status: SKIPPED (não exigida; nenhum tool de coverage configurado no plano — não instalado por regra de não instalar dependências novas)
- Uncovered files: N/A

## Static Analysis — PASSED
- Tool: `flutter analyze` (Flutter/Dart)
- Critical issues: 0, Warnings: 0
- Limpeza pré-existente aplicada nesta sessão: 45 `unused_*` + 17 `annotate_overrides` de `suggestion_panel*`/`workflow_sheet` (refactor de bf546b0) — refundir de campos para `SuggestionPanelLogic`, contratos abstratos removidos.

## Security Audit — PASSED
- Tool: `npm audit` (backend)
- Vulnerabilities found: 0

## Project Instructions Compliance — PASSED
- No violations

## Requirements Traceability — 3/3 work items verified, 7/7 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 (P1) | Work Item | PASSED | FR-069..073 implementados; cenários 1-2: switch "Contrato perpétuo" (T014), payload `perpetual` (T004), card "Perpétuo" sem "Incompleto" (T007/T015) |
| US2 (P1) | Work Item | PASSED | FR-074/075 implementados; cenários 1-2: `_ConcludedTag` adicional ao chip (T018), testes FR-074/FR-075 |
| US3 (P2) | Work Item | PASSED | FR-076..079 implementados; cenários: marcador com ícone+texto (T021), KPI oculto quando 0 (T022), contraste (T023) |
| SC-014 | Success Criteria | PASSED | teste `FR-071 card perpétuo sem Incompleto` — "Perpétuo" presente, "Incompleto"/"Sem previsão" só no comum |
| SC-015 | Success Criteria | PASSED | backend `FR-070/FR-073 perpetual ignores incomplete and overdue windows` + `FR-072 sem previsão exclui perpétuo` |
| SC-016 | Success Criteria | PASSED | teste `FR-074 Concluído sem tarefa aberta` — 3/3 exibe, 2/3 e 0 tarefas não exibem |
| SC-017 | Success Criteria | PASSED | teste `FR-077` — "2 tarefas atrasadas" com ícone e Semantics label; 0 → nenhum marcador; perpétuo mantém `tasks_overdue` (backend) |
| SC-018 | Success Criteria | PASSED | teste `FR-078` — bloco `kpi-tarefas-atrasadas` mostra valor do backend; 0 → bloco ausente |
| SC-019 | Success Criteria | PASSED | teste `FR-075 Concluído distinto de Encerrado` — ambos coexistem |
| SC-020 | Success Criteria | PASSED | teste `FR-079 contraste AA dos marcadores` — 4,5:1 nos dois temas (chip + 4 tags) |

## Traceability Gaps
- Nenhum: 11/11 FRs (FR-069..079) com task(s) em `tasks.md`; 24/24 tasks `[X]`; Requirement Coverage Map do plano com 11 rows.

## Implementation Review Findings — SKIPPED
- Sem `.review-findings` no Feature Workspace.

## Checklist Fulfillment — spot-check PASSED
- `checklist-state.mjs`: overall PASS, 3/3 arquivos VALID, 102 itens, 0 incomplete, queue COMPLETE.
- Spot-check [Testing] (itens Testability): CHK027 (P1 com teste independente + SC), CHK028 (par "Perpétuo" presente/"Incompleto" ausente), CHK029 (fronteira "Concluído" nas duas direções) — todos implementados e cobertos pelos testes de aceitação listados acima.
- Spot-check [Security]: sem itens de categoria security no checklist; cobertura equivalente via `npm audit` (0 vulns) + testes de autorização existentes (403 scopes) na suíte 173/173.

## Performance — SKIPPED
- Sem NFR de performance no `spec.md` — "Escala e latência do payload do dashboard — fora do escopo" (Spec §Scope); STF-005 registrado e resolvido sem exigir benchmark.

## Accessibility — PASSED
- Automatizado: `frontend/test/a11y_labels_test.dart` → `FR-079 contraste AA dos marcadores do card nos dois modos` (chip de status + Incompleto/Concluído/atraso/Perpétuo ≥ 4,5:1 em claro e escuro) e `FR-005/FR-068` pré-existentes.
- Semantics: marcador de atraso usa `Semantics(label: ...)` igual ao texto visível (SC-017); testes de widget encontram `find.bySemanticsLabel`.

## Browser Runtime Validation — SKIPPED
- Mode: probe 6.0 executado — sem tool nativa de navegador no harness e MCP vazio (`list_mcp_resources` → `resources: []`, `templates: []`) → `BROWSER_RUNTIME_AVAILABLE = false`.
- `BROWSER_RUNTIME_REQUIRED = false`: nenhum SC/AC do E017 depende de comportamento exclusivo de navegador real — os cenários são renderização de card/KPI (widget tests renderizam os widgets reais), payload de API (supertest) e contraste (matemática de cor no tema).
- Cross-check 6b: cenários de UI cobertos headless por `flutter test` (11 do redesign + 4 do a11y + suíte completa 83/83); API por supertest 173/173 e E2E 182/182 → nenhum gap → fallback manual 6c não acionado.

## Manual Testing — Not Required
- `manual-test.md` não gerado (nenhuma verificação manual pendente).
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | dc85a5e5010cd61a52659a7867ff2df8d41d9efe856dba4b2d3385916a977565 |
| backend/src/config/database.test.js | 3b231f4bdb4e2fafead3de760c00ff475a288ac5f1481e1827d4068aee2dd4c4 |
| backend/src/models/Contract.js | 9b0464b73d66b307a4f6fc784a984ebe5dc3ef029cf7badcd8a6eafee657b816 |
| backend/src/models/Contract.test.js | 5dcf5335e5915e324973d601cc572b738802de0395259367f0d1849461081315 |
| backend/src/routes/alerts.js | 388184c8abfcb0ee5faf4fa61e75dc3019a546e384841f871b01498bb90ae267 |
| backend/src/routes/alerts.test.js | a67a22ee9a5299bb70fb48e1cbd22c53d9a5aac35ef8baa594b103ade8b4b1cb |
| backend/src/routes/contracts.js | 845ee5c4fceda804a90ecace962ea1ac94f1e3afd3ffda79263ea291aec71360 |
| backend/src/routes/contracts.test.js | c25562f69e123da13dcd81c0ec83c1d733e1751088052d62d6794a9b474f65ad |
| backend/src/routes/dashboard.js | df7a791c65ade89e2ebd966795d30ca1207dce03f2a82f4149848b0fa6082d1f |
| backend/src/routes/dashboard.test.js | 6d811d534fe795b03b66f5b4da61de6047eded0dde84301521141d96ca6513c5 |
| backend/test.sh | 1f99699407dee572eef2906f9d804c8433b63fdf15c0b2900dbe9457a73d38d7 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/lib/models/contract.dart | 6433454b0e9dadeae6adf6857562a72f741657976a6e0b06970ec78fabfe051d |
| frontend/lib/screens/contract_detail_screen_workflow_sheet.dart | 88a4ceace6f67154136a5a7acb51d73446d4b8153317bec55044bf34a0cbd886 |
| frontend/lib/screens/dashboard_screen.dart | 6a4dba524bb96d235a4e47442cb7bb0829e8554a9f6de411a26c5e1f521b102d |
| frontend/lib/screens/dashboard_screen_kpis.dart | 26be75965f7638ef59cd644d85931785c67795aad174c1e3aa116e576cbffbf5 |
| frontend/lib/screens/dashboard_screen_queue.dart | b70ae5c6d6a8cc59fd809f8b07dbd109f67e03eb7affb829b1478def0c18af6e |
| frontend/lib/screens/dashboard_screen_tags.dart | f66876ab85c55c74ffb99e697ebd7a00439d9f1c78200cd399c68a32d9ab0945 |
| frontend/lib/screens/projects_screen.dart | 81712519a696b081af981583582f8b29b9a3c42837522d09e893d30a31205906 |
| frontend/lib/widgets/suggestion_panel.dart | f79efb4de61ed432a182893d35a4579bed15b1fb1ce212cc0624fcb683d8b40c |
| frontend/lib/widgets/suggestion_panel_logic.dart | db54d5a52d544e7c116cbbb4c23155bb4b79e887899496ffaa0018d2536d66ef |
| frontend/lib/widgets/suggestion_panel_support.dart | 12aa8ca28002c6e3adcdc1dbb7094e21d721cd40df238340daeda72a62f60d2e |
| frontend/lib/widgets/suggestion_panel_ui.dart | 28eabad86e507f7b05edc0ba8407323243fe6dacfdc27e1d5748b0ca9e72e13d |
| frontend/test/a11y_labels_test.dart | 00a02a9c576cf7635de39b896a4c231a80d1469f6e16bbbb9b3b660fc811e723 |
| frontend/test/dashboard_redesign_test.dart | ff977bbc2cc72963815a5661ca81238c683ea7d11af1aa84f025be8969aab3c1 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/checklists/CHL001-data-integrity.md | 2b47c466cc2601ca9f4acf6f196cdeb1cae5e53f30f001d423555ca57fbd2b3d |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/checklists/CHL002-api-quality.md | 1f481265d7c65ed9c3d1d19d34d13c7856af232840753317a4900c57622bdddf |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/checklists/CHL003-ux.md | 8d2ac101c3e08ed0f1469a1cef550de6ccebde3ca182f07467a39c38092560e9 |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/plan.md | bcc67e88f3d676e0522a24e4e363d67b2e42e9cf39d5cae77d815b88d151be68 |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/spec.md | b8053500ae0e6265e7da4311331efef770b4349af6890702844d923b4654a387 |
| specs/00019-dashboard-indicadores-de-contrato-perpetuo/tasks.md | 5229e3d2c83ac5e1e6a4aa780d399ba083d0874e88a49631310e919412c5416f |

## Tool Recommendations
- Coverage: nenhum tool configurado no plano; se desejado, `node --experimental-test-coverage` (backend) e `flutter test --coverage` (frontend) são opções sem dependência nova.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|
| — | — | — | — |

## Bug Tasks Generated
- None
