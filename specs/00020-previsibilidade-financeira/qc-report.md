# QC Report: Previsibilidade financeira por contrato (00020)

**Date**: 2026-11-22T00:58:00Z
**Feature Directory**: specs/00020-previsibilidade-financeira
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 5aeb2dbd640d7002ddd7f726c7001176bf2212a4
- Mode: Full
- Prior Baseline: N/A (primeiro QC da feature; nenhum `qc-report.md` anterior)
- Changed Files: N/A (full run)
- Test Selection: suíte completa (unit, smoke, flutter, analyze, audit) + revalidação de todos os gates, checklists e proveniência das tarefas
- Scope Safety: primeira execução completa de `00020`. Policy Auditor, QC Auditor e Story Verifier executados inline: delegação de subagentes indisponível no harness. Nenhuma modificação de artefato após a coleta de evidências além de `autopilot-log.md` e dos markers, fora do manifesto.

## Changes from Prior Run
- N/A — primeiro QC de `00020`.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | `npm test` 207/207, 0 fail |
| Smoke suite | PASSED | `backend/test.sh` 183/183 (PORT=3199, DATA_DIR descartável) |
| Flutter analyze | PASSED | `flutter analyze` → "No issues found!" |
| Flutter tests | PASSED | `flutter test` 98/98, incluindo 8 testes de financeiro (seção e painel) |
| node --check | PASSED | sintaxe dos arquivos backend novos e alterados |
| Security audit | PASSED | `npm audit --audit-level=high` → 0 vulnerabilidades |
| Policy audit | PASS | spec/plan/tasks vs `project-instructions.md` — 0 violações CRITICAL |
| Spec gate | PASS | `evaluateSpecGate` válido; 0 issues |
| Plan gate | PASS | `evaluatePlanGate` válido; 7/7 P1 com paths/símbolos |
| Tasks gate | PASS | 31/31 `[X]`, parser válido, proveniência válida, 5.943 B ≤ 6.144 B |
| Checklist spot-check | PASSED | CHL001/002/003 38/38 `[X]`, 0 gaps nas categorias Security/Data Integrity/API Quality |
| Browser probe (6.0) | SKIPPED | sem tool nativa de navegador nem servidor MCP browser no harness |
| Manual testing | SKIPPED | fallback 6c não acionado — ver seção Manual Testing |

## Test Results — PASSED
- Runner: `npm test` em `backend/`. Total 207, Passed 207, Failed 0. Inclui `finance.test.js` (serviços), `financeAlerts.test.js`, `financeReport.test.js`, `routes/finance.test.js`, mais extensões em `database.test.js`, `routes/dashboard.test.js` e `routes/alerts.test.js`.
- Runner: `bash backend/test.sh`. Total 183, Passed 183, Failed 0.
- Runner: `flutter test` em `frontend/`. Total 98, Passed 98, Failed 0.
- Cobertura por requisito: FR-064/067 em `services/finance.test.js`, `routes/finance.test.js` e `test/dashboard_finance_test.dart`; FR-065/066 em `routes/finance.test.js` e `test/finance_section_test.dart`; FR-068 em `services/financeAlerts.test.js` e `routes/alerts.test.js`; FR-069 em `services/financeReport.test.js` e `routes/finance.test.js`; FR-070 (guards) em `routes/finance.test.js` e `test/finance_section_test.dart`.
- UI: resumo e parcelas no detalhe, card no painel, criação de parcela em centavos, pagamento parcial com comprovante opcional, bloqueio local de valor acima do saldo e downloads autenticados, todos exercitados por seams sem rede; nenhuma dependência nova.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | nenhum | — |

## Code Coverage — SKIPPED
- Threshold: não configurado (`Coverage Target` vazio em `.github/sddp-config.md`).

## Static Analysis — PASSED
- Tools: `flutter analyze` (Dart/Flutter) e `node --check` (arquivos backend novos e alterados).
- Critical issues: 0; Warnings: 0.
- Maintainability: nehnum arquivo novo da feature passa de 500 linhas. `contract_detail_screen_finance.dart` 307 linhas, `contract_detail_screen_finance_dialogs.dart` 208, `dashboard_screen_finance.dart` 87, `routes/finance.js` e `services/finance*.js` todos abaixo do limite.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` em `backend/` → 0 vulnerabilidades.
- Revisão das rotas novas: `assertFinanceAccess` exige papel admin/gestor e escopo de domínio da sessão; prestador, visitante e token de outro domínio recebem 403/404. Pagamento acima do saldo é 400 sem escrita, validado dentro de `db.transaction`; pagamento é imutável (sem rota de PATCH/DELETE). Comprovante usa a mesma whitelist de extensão e o teto de 2 MB do upload, e a categoria `payment` é distinta de `evidence`, `documentation` e `chat`. Exportação exige o mesmo token.Alertas de parcela reutilizam `extracted_alerts` com dedup por `(contract_id, source_kind, source_id)`; contrato encerrado não gera alerta novo e o histórico permanece.

## Requirements Traceability — 31/31 work items, 7/7 FR, 3/3 US, 11/11 SC
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T031 | Work Items | PASSED | todos `[X]` em `tasks.md`, 0 pendentes |
| FR-064..FR-070 | Requirements | PASSED | 7/7 com implementação e teste |
| US1–US3 | User Stories | PASSED | 3/3 independentemente testáveis |
| SC-001..SC-011 | Success Criteria | PASSED | 11/11 observáveis nos testes e na suíte |

## Traceability Gaps
- Nenhum.

## Implementation Review Findings
- N/A — nenhum `.review-findings` carregado nesta execução. Os 2 achados LOW de `analysis-report.md` (AN-001 e AN-002) foram fechados nesta entrega: `TECHNICAL.md` e `README.md` atualizados.

## Checklist Fulfillment — PASSED
- `checklists/CHL001-security.md` 12/12, `CHL002-data-integrity.md` 14/14, `CHL003-api-quality.md` 12/12 — todos `[X]`.
- Spot-check das categorias Security, Data Integrity e API Quality: sem gaps.

## Performance — SKIPPED
- Nenhum NFR de performance no `spec.md`. Limite de 500 parcelas por contrato exercitado em `routes/finance.test.js`.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade novo na feature; rótulos semânticos nos cards e métricas, cobertura existente de `a11y_labels_test.dart` permanece verde na suíte.

## Browser Runtime Validation — SKIPPED
- Probe 6.0 executado: nenhuma tool nativa de navegador exposta e nenhum servidor MCP browser descoberto → `BROWSER_RUNTIME_AVAILABLE = false`.
- Cross-check 6b: os cenários de aceitação são observáveis por API e por widget tests (resumo, parcelas, pagamentos, guards, alertas, exportação), sem gap que exija navegador real.

## Manual Testing — SKIPPED
- Racional: fallback 6c não acionado — 6b cobriu os cenários com API e widget tests. Nenhum `manual-test.md` gerado e nenhuma atestação humana pendente.

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| .github/sddp-config.md | 643a1aeeb889417f72050009a807a4869e4b526517262428997377203c47753d |
| README.md | e4f7a08969ac5f71e49cc8f095cd32d394617e47f2765d84b4122b08304d09c8 |
| TECHNICAL.md | 37ffb200e44efd8c8fb05a75dfac366c52716f434388fe336f6cf7d0146c00d6 |
| TODO.md | 3a7ae3e39e9467af12cda70b446b25e5faed7397139bb7ba9436e9ca82236186 |
| backend/src/config/database.js | 7299afa5fe1887ded3c4f6a27c7c3ab9d99a875dbe2a6c44574c11ede8152b9a |
| backend/src/config/database.test.js | 915786fc58c7c498e374537eba158897ca49966e04843cbdf64f31e331f5dd84 |
| backend/src/routes/alerts.js | 1cd7aa575b869966419bf51fcf76e7ee4ed3d1fadfd91c9b7318f252f54b8387 |
| backend/src/routes/alerts.test.js | ad74822ed133578611afc8d0c4dfd31452a264364e081e7048f37f40eba832fc |
| backend/src/routes/dashboard.js | a70d413b0af4914ab5f0337bc887bff5c8b7aad3002b8fe2a148947968720e8f |
| backend/src/routes/dashboard.test.js | f7927fbe742c1bcfff1310f7f7a52e9f90c6b43d37eb7ec9b51f3738d5b5b728 |
| backend/src/routes/finance.js | 3dcccbdcae357ef724f0c411c25543f9dc4977f6525602e178385f6ef309963b |
| backend/src/routes/finance.test.js | 9314563f681b5c434994c6bc1eb130ac9c99c68de67ed3a13a44fa2fc1e70f4c |
| backend/src/server.js | 694b486bb0ba63cf6434e8e535684def34bb6134ae9b7daa1f9e3a02e1d90f7c |
| backend/src/services/alerts.js | 128e37512f03ab2119ed3d58685a50dd36f64e6ffbe3ffb06f18aa9b5319ffd1 |
| backend/src/services/finance.js | a10b5c5da9431c18b0a05a06086dedea58e09847c6a1618bec3ecbdd0f2d47c0 |
| backend/src/services/finance.test.js | e0b5ad7bc255f22d6cfaa4ed007c9b5df7af4c960dddc1efbb7981a9532861c8 |
| backend/src/services/financeAlerts.js | 3b1231ac68f5bfd1dbfdbd59e5d0e4ffaafe73196e51785538697b735ad6d416 |
| backend/src/services/financeAlerts.test.js | 65b0f563c259d8e13daaeb76814c01541f127a8d909b1adfedfc653ea64ecfa2 |
| backend/src/services/financeReport.js | 9b33d8c28616a63733fa79d167b3e283f8a9b295d020fba8aac6b0ca58f47768 |
| backend/src/services/financeReport.test.js | 1a972e4633612204acc5ab09f3a308a52563d34e3133ae3518bc2df57c50bb0b |
| backend/src/services/report.js | 43a9df777866ad2eb16caeba9c29661fbbee5c7b21eccebed622dc8986523b12 |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| frontend/lib/screens/contract_detail_screen.dart | 24848ca8d8e182b53822722492cddaee2e51f7cc12e05c906a66148394212342 |
| frontend/lib/screens/contract_detail_screen_finance.dart | f77b911ccc730e250271691305f666d01116a2241f09365383e720327066e61b |
| frontend/lib/screens/contract_detail_screen_finance_dialogs.dart | 34c32f1908d7aea4da31a12e0c9e72ebe1360be6f2cd9388e5e850506a3264c5 |
| frontend/lib/screens/dashboard_screen.dart | 8d0ac4232a782560cd79c274c904e1de6df12bf4a9a0a57a7120332c9909b83b |
| frontend/lib/screens/dashboard_screen_finance.dart | 1bdf734df682d4a690969ce5a3c96a70c246514c9da14fa092f062ebc8fe588e |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/lib/utils/download_file.dart | 98512e3f23cb4d760589306758a465f6d4c13be82369b4a8317b564600c9da9f |
| frontend/lib/utils/download_file_stub.dart | ed18c6064045b9b82db5ab0cf83c664eedca74a3295a3d7a71dcf746b22f9525 |
| frontend/lib/utils/download_file_web.dart | f611cf5e6b3806097fe696007d8ed552331e3a6826dd88b76891dd6cf93bab25 |
| frontend/test/contract_providers_test.dart | 8cbd58257d7bf8dc37fcd7302d16a87c94fd2f15fa614a04f8049b758487f88a |
| frontend/test/dashboard_finance_test.dart | 258b0a24b67b81438c3984890fb137860b76a9d32bc80bcc43e7ee4a5bb7d9b7 |
| frontend/test/finance_section_test.dart | 7a0b7160973b6568ebbdbf70012a0dcd6618d2fa6d68aebaa8366f563b9ed99c |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| scripts/derive-completion-state.mjs | 655dfd712b0a2e7a0656a08e26821d5f2dd86492ad666af6011bb3d9282edcb6 |
| scripts/lib/qc-evidence.mjs | 391ec36cb4ee38997a2ed14486cb6b3c778e7e13aad62be41e9df33676523a86 |
| scripts/parse-tasks.mjs | 3e550e85cdcbbf26533d527cd71bb59c38927bc239fbe555e4885969196daef5 |
| scripts/phase-gates.mjs | 546a924e4169b00e9db550f7e785725077706a5b1223d86026c8601bf98d455c |
| specs/00020-previsibilidade-financeira/analysis-report.md | 662400d6d8abdf385e2152e72b0fdc2e0b6aeeb88405c4cd8c018d65369d10b2 |
| specs/00020-previsibilidade-financeira/autopilot-log.md | 8ea7a8420589b8ee4e0a3d65726d179e0291b06968bb82b64b03f5e17d7fd6a3 |
| specs/00020-previsibilidade-financeira/checklists/CHL001-security.md | 3c3a8d17edadfe2dbc23ce22f9c0a04f896deffcfc97d585b9e13359225bcf90 |
| specs/00020-previsibilidade-financeira/checklists/CHL002-data-integrity.md | 2be47fc93a0e2f86d2b84a752e663e43dda90a0e5a8105c8117c42ae680f3a70 |
| specs/00020-previsibilidade-financeira/checklists/CHL003-api-quality.md | 2030d928544edaed6ac77e65eb5f12b5967a798118dcc46bda531f8f04559dbf |
| specs/00020-previsibilidade-financeira/contracts/finance.yaml | 7bcfc4fc2110f8475d938f9e33a31102f64c22996904f1774df67b09e1f8cd09 |
| specs/00020-previsibilidade-financeira/data-model.md | a98cd4a48e3c9b2f7c895dc86fdce3bd704ed3d63f7e7a3deaeadf46aaef1320 |
| specs/00020-previsibilidade-financeira/plan.md | b880b67a530547d7bce4b9ffd5146dc9ae85402f7fc6cdad5a0db99b297c93ac |
| specs/00020-previsibilidade-financeira/research.md | 34eb323e4bce9fb53000c2ec10e426058cf7e9cf30f652f26091b433ecaecad1 |
| specs/00020-previsibilidade-financeira/spec.md | 23ce23e6a955b8cd67df0537361259f3197ca0933d2e8b146229060d3b3d5269 |
| specs/00020-previsibilidade-financeira/tasks.md | bed565f942f2d6b1553fc3d8753a8038d66593c08d3750bc98109bbec7facd86 |
| specs/plan/E018.md | 16968793a9fd326c993f681d8b035a9930afcf7f1c9f0075ab2e8b2b7a6b530b |
| specs/project-plan.md | 302156a83e49eb3ee5b87c9235ef9654442788dec69f5a3da10f30f170f53f77 |
## Tool Recommendations
- None

## Bug Tasks Generated
- None
