# QC Report: E002 — Contrato e Vigência

**Date**: 2026-10-09T00:26:54Z  
**Feature Directory**: specs/00004-e002-contrato-vigencia/  
**Overall Verdict**: BLOCKED

## QC Scope Baseline
- Baseline Commit: 26ff3f99008ee2e0b665e6f4376108aa1d0d5049
- Mode: Full
- Prior Baseline: N/A (first QC run for this feature)
- Changed Files: N/A (full run)
- Test Selection: Full suite (backend unit, smoke, Flutter analyze + widget tests)
- Scope Safety: No prior report or usable baseline; spec/plan/tasks finalized this run — full QC required.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Build/startup | PASSED | `node src/server.js` serves `/api/health` 200 during smoke (PORT 3199, isolated DATA_DIR) |
| Linting (required) | PASSED | `node --check` over `backend/src/**/*.js` (non-test) — all files OK |
| Security (required) | PASSED | `npm --prefix backend audit --audit-level=high` — 0 vulnerabilities |
| Unit tests | PASSED | `node --test` — 94/94, 0 failed (backend container stopped for port 3001, restarted after) |
| Integration smoke | PASSED | `bash backend/test.sh` — 97/97, incl. §17 status partition (new this epic) |
| Flutter analyze | PASSED | `flutter analyze` — no issues found (Docker SDK) |
| Flutter widget tests | PASSED | `flutter test` — 13/13, all tests passed |
| Story verification | PASSED | 4/4 work items, 15/15 FR; SC 4/4 |
| Policy audit | PASSED | No CRITICAL `project-instructions.md` violations |
| Checklist spot-check | PASSED | Security/API/Performance items re-evidenced by this battery |
| Manual OWASP review | BLOCKED | PI-mandated human review pending → `manual-test.md` (Status: PENDING) |

## Test Results — PASSED
- Runner: `node --test` (backend), Total: 94, Passed: 94, Failed: 0
- Runner: `bash backend/test.sh` (supertest + live server smoke), Total: 97, Passed: 97, Failed: 0
- Runner: `flutter test`, Total: 13, Passed: 13, Failed: 0

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|

## Code Coverage — SKIPPED
- Threshold: Not configured (`**Coverage Target`:` empty in `.github/sddp-config.md`)
- Status: SKIPPED (report-only; no coverage tool in plan Testing Strategy)

## Static Analysis — PASSED
- Tool: `node --check` (backend JS), `flutter analyze` (frontend)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED (automated portion)
- Tool: `npm audit --audit-level=high`
- Vulnerabilities found: 0
- Note: PI-mandated manual OWASP Top 10 dependency/route review not automatable → `manual-test.md`

## Project Instructions Compliance — PASSED
- No violations with CRITICAL severity. Stack, `backend/src/` layout, QC categories (linting + security), size budgets, and ID immutability respected.

## Requirements Traceability — 4/4 work items verified, 4/4 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | FR-001..004 green in `contracts.test.js` (transitions, 403 sem efeito) + smoke §8/§9/§14 |
| US2 | Work Item | PASSED | FR-005..006 in `Contract.test.js`; FR-007/008 in `contracts.test.js`; FR-009 in `tasks.test.js` |
| US3 | Work Item | PASSED | FR-010 (401/403 sem payload), FR-011 (domainId estrangeiro 403), FR-012 (escopo prestador/gestor) |
| US4 | Work Item | PASSED | FR-013 (partição SQL, soma das fatias = total), FR-014 (100% vigentes com previsão), FR-015 (p95 < 2 s com 5.000) |
| SC-001 | Success Criteria | PASSED | Transições + 403 para papel indevido (FR-010/004 tests, smoke §14) |
| SC-002 | Success Criteria | PASSED | Atrasado derivado, tarefas aceitas, prorrogação devolve vigente (FR-007/008/009) |
| SC-003 | Success Criteria | PASSED | 401/403 antes de qualquer linha; sem vazamento entre domínios (FR-010/011/012, smoke §13) |
| SC-004 | Success Criteria | PASSED | p95 < 2 s com 5.000; previsão 100%; filtro exato (FR-013/014/015) |

## Traceability Gaps
- None: 15/15 FR covered by `tasks.md` (Plan → Tasks gate), `provenance valid` for 22 checked tasks.

## Checklist Fulfillment — 55/55 previously evaluated; security subset re-spot-checked
- CHK001 (CHL001) — PASSED — domainId estrangeiro 403 antes de consulta: evidenced by FR-011 test + smoke
- CHK002 (CHL001) — PASSED — fronteira 401/403: evidenced by FR-010 test + smoke §14 (sem token 401, malformado 403)
- CHK004 (CHL001) — PASSED — prestador só vê vinculados: FR-012 test (total = vínculos; detalhe não vinculado 404)
- CHK003 (CHL002) — PASSED — filtro é partição sem sobreposição: FR-013 test (soma das fatias = total) + smoke §17
- CHK001 (CHL003) — PASSED — alvo 5.000/p95/listagem: FR-015 test (p95 < 2000 ms)

## Performance — PASSED
- Automated: FR-015 asserts p95 < 2 s over 20 repetitions with 5.000 seeded contracts (`contracts.test.js`); `ensureIndexes` before measured queries (HINT-005).

## Accessibility — SKIPPED
- No accessibility NFRs in spec (backend API epic; no UI changes).

## Browser Runtime Validation — SKIPPED
- Mode: Manual fallback not triggered — no UI in scope for E002.
- Browser tool: N/A (no native/MCP browser tool exposed; probe returned none)
- App start: smoke already exercised the live API (`http://localhost:3001`, health 200)
- Reason skipped: work items and SCs are API-level and covered by supertest + curl smoke.

## Manual Testing — Required
- `manual-test.md` generated: PI-mandated manual OWASP Top 10 dependency + route review (`project-instructions.md` Security Scanning line: frontend has no maintained Dart scanner; route review is manual).
- Attestation: PENDING

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 043bf80eeb13b8b641d6d52b488fa8ebcd3b875755585f1b89343f34c22399cd |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/models/Contract.js | 3db01de874b8eda28749f0113d868dbc47de10d41698dbf1f380340f465d53ed |
| backend/src/models/Contract.test.js | 6db636d09582521eac546743fcd33efd2796e937e43718bef1a9757d94340497 |
| backend/src/routes/contracts.js | c3c4f032f9d63cac561a758b1ac14d3f341f80c6d467ca239df8e605888d87d6 |
| backend/src/routes/contracts.test.js | 04ea6dfffee5e55c7caf5b7ed1f9ce12024f978b94e7975c46cf1c55162dbb6a |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/tasks.js | 1dc9da91e124530e4834e36ea735d29199b22ea66d725b02794053ed45e9a326 |
| backend/src/routes/tasks.test.js | 5a742d4358b4184bb73e0062c1af364b0e34a582cae043dcf7d89833ef427b98 |
| backend/test.sh | 433a03bcd7da8672b457d7bfa40108eabd505d6826c5e4073bbffb73f256460d |
| frontend/pubspec.yaml | 15495b09cdbf0286f2f1bdef52652e2f4246f254f6394f881e7515e4a3e843b8 |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| specs/00004-e002-contrato-vigencia/checklists/CHL001-security.md | 391ca2a1b210d7d70af01d2dd2d4a2d1d327dd0fa2a70f756f9839be4bb89745 |
| specs/00004-e002-contrato-vigencia/checklists/CHL002-api-quality.md | 0af7811b7f03cf43ce0cb8381a12104c6ccb154f2a4c4a7ac5e68b89ca36f265 |
| specs/00004-e002-contrato-vigencia/checklists/CHL003-performance.md | e2adf47e83e7ad74fae2bd11949d717f711690022feeddd2b58f99f2b4e18075 |
| specs/00004-e002-contrato-vigencia/contracts/openapi.yaml | edbf4cf1e66e5e8bd761388701735889cf8e7c7d278fabc07e862ba0c6380ec3 |
| specs/00004-e002-contrato-vigencia/manual-test.md | e78bedd64b6424194a527a0d9fe277846a1faf1ed2884cf8bf89475bd2f61768 |
| specs/00004-e002-contrato-vigencia/plan.md | bea294e79ca2ffcf07d39ce07e6ea86252ebf4b67ed8105b6e640594f9ca2424 |
| specs/00004-e002-contrato-vigencia/spec.md | 53a3ffd5a7d4579cb463abf1a850f68b4217e77b6d2d1c6fde52be3022e8942d |
| specs/00004-e002-contrato-vigencia/tasks.md | 93b1beef0f2c6ab6bda9a711c9a1b747cf30442c5d4ace7d04b2fd150f51c551 |

## Tool Recommendations
- None (all configured tools present: node --check, npm audit, node --test, flutter SDK via Docker).

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|-----------|-------------|-------------|--------------|

## Bug Tasks Generated
- None
