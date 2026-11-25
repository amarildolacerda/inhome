# QC Report: Convite temporário e papel visitante (00016)

**Date**: 2026-11-22T00:06:00Z
**Feature Directory**: specs/00016-convite-visitante
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 6d4984ebf6315fd42d08398fcd507522a997eda0
- Mode: Full
- Prior Baseline: fd336796a6eb888f90859a21de1cdf4345ed9659 (QC original de E015, reexecutado no HEAD atual após E016)
- Changed Files: N/A (full run)
- Test Selection: suíte completa (unit, smoke, flutter, analyze, audit) + revalidação dos gates de tasks
- Scope Safety: reexecução completa da feature no HEAD atual — E016 alterou superfície compartilhada; nenhum escopo herdado a validar. Policy Auditor, QC Auditor e Story Verifier executados inline: delegação de subagentes indisponível no harness.

## Changes from Prior Run
- Reexecução full em 2026-11-21 após E016: 7 digests de evidência atualizados (`database.js`, `database.test.js`, `server.js`, `main.dart`, `api_service.dart`, `roles_nav_test.dart`, `project-plan.md`); a lógica funcional de E015 não mudou.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | `npm test` 194/194, 0 fail (dev server parado durante a execução) |
| Smoke suite | PASSED | `backend/test.sh` 183/183 (PORT=3199, DATA_DIR descartável) |
| Flutter analyze | PASSED | `flutter analyze lib test` → "No issues found!" |
| Flutter tests | PASSED | `flutter test` 90/90, incluindo 3 testWidgets de convite/cadastro/escopo |
| node --check | PASSED | sintaxe dos arquivos backend novos e alterados |
| Security audit | PASSED | `npm audit --audit-level=high` → 0 vulnerabilidades |
| Policy audit | PASS | spec/plan/tasks vs `project-instructions.md` — 0 violações |
| Tasks gate | PASS | 26/26 `[X]`, parser válido, provenance válida, 6041 B ≤ 6144 B |
| Story verification | PASSED | 7/7 FR P1, 3/3 US, 5/5 SC, T001–T026 26/26 |
| Checklist spot-check | PASSED | CHL001/002/003 87/87 `[X]`, 0 gaps nas categorias Security/Testing |
| Browser probe (6.0) | SKIPPED | sem tool nativa de navegador nem servidor MCP browser no harness |
| Manual testing | SKIPPED | fallback 6c não acionado — ver seção Manual Testing |

## Test Results — PASSED
- Runner: `npm test` em `backend/`. Total 194, Passed 194, Failed 0.
- Runner: `bash backend/test.sh`. Total 183, Passed 183, Failed 0.
- Runner: `flutter test` em `frontend/`. Total 90, Passed 90, Failed 0.
- Cobertura por requisito: FR-044/045 em `backend/src/routes/invites.test.js`; FR-046 no fluxo de cadastro público; FR-047 em `auth.test.js`, `tasks.test.js` e `frontend/test/invites_flow_test.dart`; FR-048/049 em `auth.test.js` e `users.test.js`; FR-050 no histórico de acesso em `users.test.js`.
- UI: `frontend/test/invites_flow_test.dart` cobre emissão sem vazamento de token na listagem, cadastro com token da URL e filtro de escopo do visitante; `roles_nav_test.dart` cobre a navegação restrita do visitante.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | nenhum | — |

## Code Coverage — SKIPPED
- Threshold: não configurado (`Coverage Target` vazio em `.github/sddp-config.md`).

## Static Analysis — PASSED
- Tools: `flutter analyze lib test` (Dart/Flutter) e `node --check` (backend).
- Critical issues: 0; Warnings: 0.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` em `backend/` → 0 vulnerabilidades.
- Revisão das rotas novas: token opaco de 16 bytes em base64url exposto só no 201; listagem, erros e logs sem token; recusa uniforme para token inválido, expirado ou revogado; rate limit por IP no cadastro público; dedup por e-mail no domínio; `visitorScope` por request; histórico append-only sem token.

## Requirements Traceability — 26/26 work items, 7/7 FR, 5/5 SC
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T026 | Work Items | PASSED | todos `[X]` em `tasks.md`, 0 pendentes |
| FR-044..FR-050 | Requirements | PASSED | 7/7 com implementação e teste |
| US1–US3 | User Stories | PASSED | 3/3 independentemente testáveis |
| SC-001..SC-005 | Success Criteria | PASSED | 5/5 observáveis nos testes |

## Traceability Gaps
- Nenhum.

## Checklist Fulfillment — PASSED
- `checklists/CHL001-security.md` 31/31, `CHL002-data-integrity.md` 28/28, `CHL003-api-quality.md` 28/28 — todos `[X]`.
- Spot-check das categorias Security e Testing: sem gaps.

## Performance — SKIPPED
- Nenhum NFR de performance no `spec.md` além do escopo derivado por request e do rate limit em memória, ambos exercitados pelos testes.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade novo na feature; cobertura existente de `a11y_labels_test.dart` permanece verde na suíte.

## Browser Runtime Validation — SKIPPED
- Probe 6.0 executado: nenhuma tool nativa de navegador exposta e nenhum servidor MCP browser descoberto → `BROWSER_RUNTIME_AVAILABLE = false`.
- Cross-check 6b: os cenários de aceitação são observáveis por API e por widget tests (token, cadastro, escopo, reavaliação, histórico), sem gap que exija navegador real.

## Manual Testing — SKIPPED
- Racional: fallback 6c não acionado — 6b cobriu os cenários com API e widget tests. Nenhum `manual-test.md` gerado e nenhuma atestação humana pendente.

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| .github/sddp-config.md | 643a1aeeb889417f72050009a807a4869e4b526517262428997377203c47753d |
| backend/package-lock.json | 62cd176aee0d760254c3acdfa712466602b26b625958a440a8c23a02a71c4ec1 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 7299afa5fe1887ded3c4f6a27c7c3ab9d99a875dbe2a6c44574c11ede8152b9a |
| backend/src/config/database.test.js | 915786fc58c7c498e374537eba158897ca49966e04843cbdf64f31e331f5dd84 |
| backend/src/middleware/auth.js | a2411a35fb7139d9e63a4af2da22de00fed1ecbef833dd6156886411baadf1c8 |
| backend/src/middleware/auth.test.js | 7de83ccd845452f80dbb4ea71578bf53fe595b992a2a2620eab2c95a4e66b52c |
| backend/src/models/AccessHistory.js | e2db845bfc54cc3be9d44479b1d5fbe055a465ac06b74ab4498e0a9425dfa077 |
| backend/src/models/Invite.js | e6694294f5c73ad0d28a26811294c8cd4b77bf8a4436d14266e68099ead58db1 |
| backend/src/models/User.js | 8543fb1d21d1c03eb09f360fc0cb5f605257f53aea1a2c2c2b5202d60b0dfb61 |
| backend/src/routes/invites.js | 3b0a241239404ef2254fdcd42bb4c2937204103f044ec49453733b4cbd46480d |
| backend/src/routes/invites.test.js | ebe3e65c1f6bb4d8a81999fa2b4418019b12fded194cb78c6d6e94f6ef76af39 |
| backend/src/routes/tasks.js | 2173bb08b70e46893fb5c736fd40fd1ae60ee7fd8b83100ece37b838e44eecd3 |
| backend/src/routes/tasks.test.js | 8692dceebd63efde7eb35f42137fdb6f42b60ff00352d72424c8d32cde565cfc |
| backend/src/routes/users.js | 112700155c60f6298b321d0725a0001628c63ead63ec4fc4cb56106caf1a20b0 |
| backend/src/routes/users.test.js | e11fd81202f700843dba63b9c285a15bbc9ee75086e9a2850b33f76d7cd9c429 |
| backend/src/server.js | 694b486bb0ba63cf6434e8e535684def34bb6134ae9b7daa1f9e3a02e1d90f7c |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| frontend/lib/main.dart | e520ce6c0ff6c4743441b74c241fca6cda988bb5143171c2a414e27715c09857 |
| frontend/lib/screens/invite_register_screen.dart | e578ff8002ddddd4e4abfb7432c52f34344d760d6e95f72b7e5aabf79ec34610 |
| frontend/lib/screens/invites_screen.dart | ea1ec53493a877294ab75df93a7a23929d6fe4bb49b16f1ae88a565c62a6b716 |
| frontend/lib/screens/tasks_screen.dart | 656a3fd36f1d49efe85b1d2c80c01e82fa63c7ebb8e80b1ba87411f0631d70d4 |
| frontend/lib/screens/users_screen.dart | 5ef4a4a1a2ea6ed3bc7bc87832b491ed2c302eb98d4500a6f97cfe468ab5d377 |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/pubspec.yaml | 17af3440c6623b96ac344573777cda42c0e5a3fee029f77ca0b0c0dcd3ed1cd2 |
| frontend/test/invites_flow_test.dart | c07209989bc52650c3f3cad60f4f33372b39f994144ec94ec4ff27248a7b0dac |
| frontend/test/roles_nav_test.dart | 36f561086b7e437c2a3d11827991f2b1f32f59fc49dff28b7a94103492b1490a |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| scripts/derive-completion-state.mjs | 655dfd712b0a2e7a0656a08e26821d5f2dd86492ad666af6011bb3d9282edcb6 |
| scripts/parse-tasks.mjs | 3e550e85cdcbbf26533d527cd71bb59c38927bc239fbe555e4885969196daef5 |
| scripts/phase-gates.mjs | 546a924e4169b00e9db550f7e785725077706a5b1223d86026c8601bf98d455c |
| scripts/runtime-preflight.mjs | 1464723ce1705934f85273163f88437f8c4dd9d66499b69da89e5b3188d16c30 |
| scripts/validate-prd.mjs | d723649e71d0fc923a727c737d68b73f8913a738b954c394e9c5642c34fe1cee |
| scripts/validate-sad.mjs | 3127bd132df33ad807f90d8d8ef9dade218a3331c34b54cdc807b60853724885 |
| specs/00016-convite-visitante/analysis-report.md | bd9cca057c052db09f107188e5a93f4b5232e76f1e0c270213ca5160a49192a2 |
| specs/00016-convite-visitante/checklists/CHL001-security.md | 8ae3b98170b8b82fb4b0a703ed976478472f87849d2071ac236bbac2a8e680df |
| specs/00016-convite-visitante/checklists/CHL002-data-integrity.md | 3fd3b4334fc67e1b3386cbc5d2044b4e1342c0ed2e6c53eb92725b74ba64cc50 |
| specs/00016-convite-visitante/checklists/CHL003-api-quality.md | 28519b9cc1ec0df2b0fff0e6cc4b17f1861ab1e8b4d50e995b6e849271b3dea2 |
| specs/00016-convite-visitante/contracts/openapi.yaml | 421fc8f04a5cce67fde606f192cb60253cddc224e45e2c28c87a6d7138ad57c5 |
| specs/00016-convite-visitante/plan.md | aa28171c1325f04e64b5f022d4b350ee9875e3269c60fd6ed6b11e0e796c57f4 |
| specs/00016-convite-visitante/spec.md | 1f98001d2b8c4c8c24e4725ac1144a3a3b1bb03a46f096a7426028234a615eef |
| specs/00016-convite-visitante/tasks.md | 37681076265f3945ef99e2fef23efdb287588c5e836e133f2101279e6c05a69c |
| specs/project-plan.md | 302156a83e49eb3ee5b87c9235ef9654442788dec69f5a3da10f30f170f53f77 |
## Tool Recommendations
- None

## Bug Tasks Generated
- None
