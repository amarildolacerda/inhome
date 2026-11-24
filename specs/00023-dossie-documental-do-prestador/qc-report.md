# QC Report: Dossiê documental do prestador (00023)

**Date**: 2026-11-24T02:02:00Z
**Feature Directory**: `specs/00023-dossie-documental-do-prestador`
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 71e8fc47fbe501592210ea85e58591ca60d24f64
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A (first QC run)
- Test Selection: Full suite
- Scope Safety: primeira execução de QC da feature; todas as suítes e todos os checks executados do zero sobre o estado atual do branch `dev`.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Testes unitários backend | PASSED | `npm test` 244/244 |
| Smoke HTTP | PASSED | `bash backend/test.sh` 253/253 |
| Testes Flutter | PASSED | `flutter test` 110/110 |
| Análise estática | PASSED | `flutter analyze lib test` — No issues found |
| Auditoria de segurança | PASSED | `npm audit --audit-level=high` em `backend/` — 0 vulnerabilidades |
| Conformidade com PI | PASSED | Nenhuma violação; branch `dev`, `main` em `49bb566` intocada, tests verdes, saída concisa |
| Rastreabilidade | PASSED | 3/3 user stories, 4/4 SC, 12/12 FR P1 com task e caminho |
| Checklists | PASSED | 3/3 arquivos, 24/24 itens verificados |
| Gates SDD | PASSED | spec/plan/tasks/provenance válidos; 34/34 tasks `[X]`; 0 issues de proveniência |
| Limites de manutenibilidade | PASSED | `dossier_screen.dart` 492 linhas; `dossier_checklist_screen.dart` 250; `providerDocuments.js` 322; nenhum arquivo de implementação acima de 500 linhas |

## Test Results — PASSED
- Runner: `node:test` (`npm test`), Total: 244, Passed: 244, Failed: 0
- Runner: `bash backend/test.sh`, Total: 253, Passed: 253, Failed: 0
- Runner: `flutter test`, Total: 110, Passed: 110, Failed: 0
- Inclui 3 serviços de dossiê, 7 rotas de dossiê, extensões em contracts/tasks/alerts e 5 testes de widget do fluxo E021.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | Nenhuma falha | — |

## Code Coverage — SKIPPED
- Threshold: not configured
- Status: SKIPPED — o projeto não define meta numérica; a barra obrigatória é a suíte unitária verde.

## Static Analysis — PASSED
- Tool: `flutter analyze lib test`
- Critical issues: 0, Warnings: 0, Infos: 0
- Backend: sintaxe validada pela execução das suítes `node:test`.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` (em `backend/`, onde existe `package-lock.json`)
- Vulnerabilities found: 0
- Revisão OWASP: `authenticateToken` → `scopeDomain()` → `requireRole` antes de qualquer leitura; `decodeAndValidate` rejeita arquivo inválido antes de `saveToUploads`; guarda de conformidade é leitura pura e roda antes de vínculo/atribuição; nenhuma dependência nova.

## Project Instructions Compliance — PASSED
- Nenhuma violação. Branch `dev` preservada; `main` não promovida; `TODO.md`, `TECHNICAL.md` e `specs/project-plan.md` atualizados; artefatos dentro dos limites (spec 10239 B, plan 10226 B, tasks 5708 B).

## Requirements Traceability — 3/3 work items verified, 4/4 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | dossiê com trabalhadores, documentos, conferência e checklist por finalidade com fallback ASO global |
| US2 | Work Item | PASSED | vínculo e atribuição recusados com `PROVIDER_DOCUMENTS_MISSING` e `missing[]`; regularização libera a operação |
| US3 | Work Item | PASSED | alertas `provider_document` deduplicados por janela, removidos na regularização e no fim do vínculo |
| SC-001 | Success Criteria | PASSED | dossiê lista trabalhadores e documentos com vigência e conferência |
| SC-002 | Success Criteria | PASSED | guarda bloqueia vínculo e atribuição com motivo explícito e não grava na recusa |
| SC-003 | Success Criteria | PASSED | varredura publica alertas antes do vencimento sem duplicar |
| SC-004 | Success Criteria | PASSED | regularização e remoção limpam os alertas do documento |

## Traceability Gaps
- Nenhum. FR-080..FR-091 têm task, arquivo e símbolo no coverage map.

## Checklist Fulfillment — 24/24 spot-checked
- CHL001/CHK001–CHK008 — PASSED
- CHL002/CHK001–CHK008 — PASSED
- CHL003/CHK001–CHK008 — PASSED

## Performance — SKIPPED
- Nenhum NFR de desempenho declarado em `spec.md`; índices criados para as consultas de dossiê e alertas.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade declarado em `spec.md`.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa ou MCP exposta neste harness.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente executada por `flutter test` (5 testes de widget) e `backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | e4f7a08969ac5f71e49cc8f095cd32d394617e47f2765d84b4122b08304d09c8 |
| TECHNICAL.md | 37ffb200e44efd8c8fb05a75dfac366c52716f434388fe336f6cf7d0146c00d6 |
| TODO.md | 3a7ae3e39e9467af12cda70b446b25e5faed7397139bb7ba9436e9ca82236186 |
| backend/src/config/database.js | 7299afa5fe1887ded3c4f6a27c7c3ab9d99a875dbe2a6c44574c11ede8152b9a |
| backend/src/config/database.test.js | 915786fc58c7c498e374537eba158897ca49966e04843cbdf64f31e331f5dd84 |
| backend/src/config/enums.js | 3d0155b8d505389c52163d6425b8bf9b8049eaa98bd15f900c9f3ca44194f283 |
| backend/src/config/enums.test.js | 0582cfa5b83b3d5225ed20c25f0fe4fc31e6a782956aa99200c069ba31ab1984 |
| backend/src/routes/contracts.js | 4efe27c78883b3740445b468678a4fa647e193176b079434bf995ab54eda1e7a |
| backend/src/routes/contracts.test.js | 4fecb004dc90d933cdc43e2ff745f3b2d2f92ff356ca1029d49931daa0f7ac1d |
| backend/src/routes/providerDocuments.js | 77b0eaf0534ba3eb8782ca82d918210cdc18e3add3938c8b481d5c98355329ac |
| backend/src/routes/providerDocuments.test.js | cb33e0e4a3bb722cf281dbeeacf391afb754ebeaab34701c0052616bbb26a4d5 |
| backend/src/routes/tasks.js | 2173bb08b70e46893fb5c736fd40fd1ae60ee7fd8b83100ece37b838e44eecd3 |
| backend/src/routes/tasks.test.js | 8692dceebd63efde7eb35f42137fdb6f42b60ff00352d72424c8d32cde565cfc |
| backend/src/server.js | 694b486bb0ba63cf6434e8e535684def34bb6134ae9b7daa1f9e3a02e1d90f7c |
| backend/src/services/alerts.js | 128e37512f03ab2119ed3d58685a50dd36f64e6ffbe3ffb06f18aa9b5319ffd1 |
| backend/src/services/providerCompliance.js | c83eb695d400cc27c02ba542df5947bca6828b91146a6aae72c8475c0e513fd2 |
| backend/src/services/providerCompliance.test.js | 088e5dbe9ad3208eb04e4b94be3f4f5635296320a1fdfc583826b7e9e7918380 |
| backend/src/services/providerDocumentAlerts.js | d514042002c6a6da9db0e261e531f2af0ab95c293335680ab8b288366facc84c |
| backend/src/services/providerDocumentAlerts.test.js | 7eff1c0385a9a0d80a6a8d9abdb2993b30b81ea7cedd5cd8500f0b9747e59bbe |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| frontend/lib/main.dart | e520ce6c0ff6c4743441b74c241fca6cda988bb5143171c2a414e27715c09857 |
| frontend/lib/screens/dossier_checklist_screen.dart | 69aa43f01121efe323fccae65fd1264def817ceca80fa2a1cbaea168fc99f69f |
| frontend/lib/screens/dossier_screen.dart | faa8a2f00aafeb27ffa0fcb260f7a23c8a1f8f73ccfe2cdd12ec43b6aad1fce3 |
| frontend/lib/services/provider_documents_api.dart | 6b22a74b9bf7c72325cd3e40e1e8864a40ba1ee6e32ffaf6821e0ef7f275e4a7 |
| frontend/test/dossier_screen_test.dart | 386b23eaf47059d1e71931aeb4888ae9c6e090e9472f79a61d5310c2c4e101c2 |
| frontend/test/roles_nav_test.dart | 36f561086b7e437c2a3d11827991f2b1f32f59fc49dff28b7a94103492b1490a |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00023-dossie-documental-do-prestador/analysis-report.md | b64bf8753010d0a0046dd1a050e13cf47aed5954472d26711c069bb52b661181 |
| specs/00023-dossie-documental-do-prestador/autopilot-log.md | 3df9ae18cfbec9985c8c7f4bcdbb67b6d30ba4437a4caac359699608e4b1a2a4 |
| specs/00023-dossie-documental-do-prestador/checklists/CHL001-security.md | 1af820b45edabcda5bb727ccee38801d7228eea007adee760fc314e770f78f9f |
| specs/00023-dossie-documental-do-prestador/checklists/CHL002-data-integrity.md | 599d0da010f331aab26918160b519dafc917cf70e3eedfdb615ca8d7b386fbbd |
| specs/00023-dossie-documental-do-prestador/checklists/CHL003-api-quality.md | bb17f612f4a9f845ae6a61c004b15b2e309e501776661fa104e45b050068c856 |
| specs/00023-dossie-documental-do-prestador/plan.md | 149182909f2cd959dded10f3baa86358fc0bb3279535f74e385acfe52f10fd97 |
| specs/00023-dossie-documental-do-prestador/research.md | 5cc064a1f27b1e85a8fd216e620db07b06c7b66584e41aa4a8e89bb1d152517b |
| specs/00023-dossie-documental-do-prestador/spec.md | 965bb83fd8d48a6a69b4c3d936e4348197dfbbcd499fb2eea251136e27a85eb7 |
| specs/00023-dossie-documental-do-prestador/tasks.md | 180120f456a77ee7583e5d8e730b0d653b0f0d43e529dbc09fd78e703122bdd2 |
| specs/project-plan.md | 302156a83e49eb3ee5b87c9235ef9654442788dec69f5a3da10f30f170f53f77 |

## Tool Recommendations
- Nenhuma ferramenta obrigatória ausente. `npm audit` só roda em `backend/`, onde existe `package-lock.json`.

## Bug Tasks Generated
- None.
