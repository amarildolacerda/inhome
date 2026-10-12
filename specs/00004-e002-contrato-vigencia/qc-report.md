# QC Report: E002 Contrato Vigência (00004)

**Date**: 2026-10-11T14:12:00Z  
**Feature Directory**: specs/00004-e002-contrato-vigencia  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full
- Prior Baseline: N/A (prior report BLOCKED at attestation; evidence digests stale after human edit of manual-test.md — full re-run required)
- Changed Files: N/A (full run)
- Test Selection: Full suite (backend unit, smoke, Flutter analyze + widget tests, audit, syntax)
- Scope Safety: Prior manifest digests no longer matched exact bytes (manual-test.md attested; backend files advanced by later epics); only a full run can re-seal evidence.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Unit (backend node --test) | 94/94 | 115/115 | +21 (later-epic suites; no regression) |
| Smoke (backend/test.sh) | 97/97 | 118/118 | +21 (later-epic sections; no regression) |
| Flutter widget tests | 13/13 | 16/16 | +3 (later-epic tests; no regression) |
| Security audit (high) | 0 vulns | 0 vulns | 0 |
| Manual attestation | PENDING | ATTESTED | cleared by human verifier |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | 115/115, 0 fail (Node v24.18.1, backend stopped during run) |
| Smoke suite | PASSED | 118/118 (PORT=3199, backend/test.sh) |
| Flutter analyze | PASSED | "No issues found!" (SDK Docker ghcr.io/cirruslabs/flutter:stable) |
| Flutter tests | PASSED | 16/16 |
| node --check | PASSED | all backend/src/*.js |
| Security audit | PASSED | npm --prefix backend audit --audit-level=high → 0 vulnerabilities |
| Policy Auditor | PASS | inline audit of spec/plan/tasks vs project-instructions.md: 0 violations |
| Manual attestation | PASS | ATTESTED by Amarildo de Lacerda, 2026-10-11T13:49:41Z, all scenarios PASS |

## Test Results — PASSED
- Runner: `npm --prefix backend test`. Total 115, Passed 115, Failed 0.
- Runner: `bash backend/test.sh` (PORT=3199). Total 118, Passed 118, Failed 0.
- Runner: `docker run ghcr.io/cirruslabs/flutter:stable` → `flutter pub get && flutter analyze && flutter test`. 16 passed, 0 failed.
- Runner: `find backend/src -name '*.js' -exec node --check`. All pass.
- Runner: `npm --prefix backend audit --audit-level=high`. 0 vulnerabilities.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | none | — |

## Code Coverage — SKIPPED
- Threshold: Not configured (Coverage Target empty in .github/sddp-config.md)

## Static Analysis — PASSED
- Tool: `flutter analyze` (frontend), `node --check` (backend syntax)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high`
- Vulnerabilities found: 0

## Project Instructions Compliance — PASSED
- No violations

## Requirements Traceability — 22/22 work items verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T022 | Work Items | PASSED | all `[X]` in tasks.md, 0 unchecked |
| Manual scenarios | Scenario Results | PASSED | all rows PASS in manual-test.md |

## Traceability Gaps
- None

## Checklist Fulfillment — 42/42 spot-checked
- CHL001-security (14/14), CHL002-api-quality (14/14), CHL003-performance (14/14) — all `[X]` at implement time; intent satisfied by delivered routes + tests

## Performance — PASSED
- CHL003-performance items were verified at implement time (status-partition queries under §17 smoke); no MANUAL VERIFICATION NEEDED remainder

## Accessibility — SKIPPED
- No accessibility NFRs in spec.md

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED
- Mode: Manual fallback (human attestation)
- Browser tool: N/A (no browser tool exposed in this harness)
- Target: local app via docker compose
- Scenarios validated by human verifier: see manual-test.md

## Manual Testing — Required
- See [specs/00004-e002-contrato-vigencia/manual-test.md](manual-test.md)
- Attestation: ATTESTED — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-11T13:49:41Z; every Scenario Results row PASS

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | c12d4ad124229ab399b75432b3a58b6b38e5be7673b3e24fa99ed27e7ee80a2c |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/models/Contract.js | 502c98e20fa5e6f739f7d1b174e66db820a4eaa6881fc9777d7acf01d6aa28f2 |
| backend/src/models/Contract.test.js | 6db636d09582521eac546743fcd33efd2796e937e43718bef1a9757d94340497 |
| backend/src/routes/contracts.js | 3ff9b980bd2ef72df8726b7a0ae817386a20283e143dcaa80908287374a3239a |
| backend/src/routes/contracts.test.js | 96b65ba5ef4bdb0d08c1f6155a037ed972bbb7ab57aa992eeb388c0f23294518 |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/tasks.js | adfb8826f4f4051e85ed021f2b07dc31c5aa392466f1a1a29955242f13fa2592 |
| backend/src/routes/tasks.test.js | 816e1a167ad1f347badafe90dffa230b8fc52335cbbb288375a0e3fb6638a92a |
| backend/test.sh | cb252c287dbab4a8add5e4480726e57b1db575100f855de59cdb1d3689b62911 |
| frontend/pubspec.yaml | 15495b09cdbf0286f2f1bdef52652e2f4246f254f6394f881e7515e4a3e843b8 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00004-e002-contrato-vigencia/checklists/CHL001-security.md | 391ca2a1b210d7d70af01d2dd2d4a2d1d327dd0fa2a70f756f9839be4bb89745 |
| specs/00004-e002-contrato-vigencia/checklists/CHL002-api-quality.md | 0af7811b7f03cf43ce0cb8381a12104c6ccb154f2a4c4a7ac5e68b89ca36f265 |
| specs/00004-e002-contrato-vigencia/checklists/CHL003-performance.md | e2adf47e83e7ad74fae2bd11949d717f711690022feeddd2b58f99f2b4e18075 |
| specs/00004-e002-contrato-vigencia/contracts/openapi.yaml | 565218e9a7bd63a2ea3995b417eb3c5fb39874f213e39fee29abd368f7f51d42 |
| specs/00004-e002-contrato-vigencia/manual-test.md | c1d15315e4bb6ddb88df1693561ac66aadb65b3527b7b7551ebf11d6c6576290 |
| specs/00004-e002-contrato-vigencia/plan.md | bea294e79ca2ffcf07d39ce07e6ea86252ebf4b67ed8105b6e640594f9ca2424 |
| specs/00004-e002-contrato-vigencia/spec.md | 53a3ffd5a7d4579cb463abf1a850f68b4217e77b6d2d1c6fde52be3022e8942d |
| specs/00004-e002-contrato-vigencia/tasks.md | 93b1beef0f2c6ab6bda9a711c9a1b747cf30442c5d4ace7d04b2fd150f51c551 |

## Tool Recommendations
- None

## Bug Tasks Generated
- None
