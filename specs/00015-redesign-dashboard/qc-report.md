# QC Report: Redesign visual do dashboard (00015)

**Date**: 2026-10-28T19:56:28Z
**Feature Directory**: specs/00015-redesign-dashboard
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: dd52e5846090e8d40b4c51c522633a3d6a4c994e
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A (full run)
- Test Selection: Full suite (`node --test`, `backend/test.sh`, `flutter analyze`, `flutter test`, `npm audit --audit-level=high`)
- Scope Safety: Full QC because the prior verdict was FAIL and the fix touched implementation, tests, the dependency lockfile, plan.md, tasks.md, and the manual attestation. Scoped selection would not be conservative.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | FAIL | PASS | fixed |
| Backend unit tests | 165 pass / 0 fail | 167 pass / 0 fail | +2 |
| Backend smoke | 178/178 | 182/182 | +4 |
| Flutter tests | 63 pass / 2 fail / 2 skip | 70 pass / 0 fail | fixed |
| Security audit | 1 high, 1 moderate | 0 vulnerabilities | fixed |
| Open BUG tasks | 5 ERROR + 1 WARNING | 0 | resolved |
| Manual attestation | PENDING/invalid | ATTESTED | fixed (8/8 scenarios PASS) |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Compilation | PASSED | `node --check` on dashboard route; `flutter analyze` clean |
| Static analysis | PASSED | `flutter analyze`: no issues |
| Security | PASSED | `npm audit --audit-level=high`: 0 vulnerabilities |
| Backend unit tests | PASSED | 167 pass, 0 fail, 0 todo |
| Backend smoke | PASSED | 182/182 |
| Flutter tests | PASSED | 70 pass, 0 fail |
| Coverage | SKIPPED | no threshold configured |
| Requirements | PASSED | US1–US3, FR-038–FR-043, SC-001–SC-006 |
| Manual attestation | ATTESTED | canonical fields present; all 8 scenarios PASS |
| PI compliance | PASSED | no violations |

## Test Results — PASSED
- Runner: `node --test 'src/**/*.test.js'` (backend), Total: 167, Passed: 167, Failed: 0, Todo: 0
- Runner: `bash backend/test.sh` (smoke, port 3199), Total: 182, Passed: 182, Failed: 0
- Runner: `flutter test` (Docker `ghcr.io/cirruslabs/flutter:stable`), Total: 70, Passed: 70, Failed: 0
- New E013 assertions: `FR-038`, `FR-039`, `FR-040`, `FR-041`, `FR-042`, `FR-043` are active (no `test.todo`, no `skip: 'RED'`).
- `npm --prefix backend audit --audit-level=high` exits 0 after upgrading express 4.22.3 / body-parser 1.20.9 / qs 6.16.2.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| None | — | — | — | No active failures | — |

## Code Coverage — SKIPPED
- Threshold: Not configured (project instructions set no numeric coverage gate)
- Status: SKIPPED
- Uncovered files: not measured

## Static Analysis — PASSED
- Tool: `flutter analyze` (Docker), `node --check`
- Critical issues: 0, Warnings: 0
- `flutter analyze`: No issues found
- `node --check backend/src/routes/dashboard.js`: PASS

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high`
- Vulnerabilities found: 0
- The high `body-parser` advisory (GHSA-27r3-jxmh-p828) and the moderate `qs` advisory are no longer present in `backend/package-lock.json`.

## Project Instructions Compliance — PASSED
- No violations.
- Changes stay on `dev`; no new frontend dependencies; `pubspec.yaml` unchanged.
- Backend dependency audit gate passes; unit and smoke suites pass before any promotion.

## Requirements Traceability — 3/3 work items verified, 6/6 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (2/2 criteria) | KPIs by status with `ColorScheme` tokens; "a vencer" uses domain windows |
| US2 | Work Item | PASSED (2/2 criteria) | Cards show vencimento, responsável, chip, incomplete marker; urgency order |
| US3 | Work Item | PASSED (2/2 criteria) | Responsive reflow without overflow; filters/search reflect in KPIs and cards |
| FR-038 | Requirement | PASSED | Status KPIs use distinct tokens with text labels |
| FR-039 | Requirement | PASSED | `contractsAVencer` and per-contract `a_vencer` follow `readWindows`/`daysUntil` |
| FR-040 | Requirement | PASSED | Cards include forecast, responsável, status chip, and incomplete marker |
| FR-041 | Requirement | PASSED | Prestador contracts come from `contract_providers`; domain KPIs hidden |
| FR-042 | Requirement | PASSED | `LayoutBuilder` reflow; narrow filter Column no longer forces flex |
| FR-043 | Requirement | PASSED | Client-side filters/search update KPIs and cards with no new request |
| SC-001 | Success Criteria | PASSED | Correct counts, distinct tokens, no new hardcoded hex |
| SC-002 | Success Criteria | PASSED | Window membership verified for default `[90,60,30,15]` and configured `[30,15]` |
| SC-003 | Success Criteria | PASSED | Nearest forecast first; incomplete card visible with marker |
| SC-004 | Success Criteria | PASSED | Prestador sees only linked contracts and no domain KPI row |
| SC-005 | Success Criteria | PASSED | 390px viewport renders without overflow; filters affect KPIs and cards |
| SC-006 | Success Criteria | PASSED | `flutter analyze` clean, no new dependency, Flutter suite green |

## Traceability Gaps
- None. P1 acceptance tests are active; smoke asserts `contracts[]`, `responsavel`, `a_vencer`, and `stats.contractsAVencer`; README placeholders are filled.

## Checklist Fulfillment — 30/30 spot-checked PASSED
- CHK015–CHK019, CHK021, CHK023–CHK030 — PASSED (spec/plan evidence valid and now backed by active tests)
- CHK020 — PASSED: `backend/test.sh` asserts the new payload fields
- CHK022 — PASSED: unit + smoke + Flutter + audit are all green
- Queue: 3/3 checklist files complete

## Performance — SKIPPED
- No performance NFR in `spec.md`. Plan goal holds: `_applyFilters` runs locally, so filters add no request.

## Accessibility — PASSED
- `frontend/test/a11y_labels_test.dart`, `web_browsers_test.dart`, and the two keyboard-scroll tests pass.
- Manual attestation records keyboard navigation PASS.

## Browser Runtime Validation — PASSED
- Mode: Manual fallback (no native browser or MCP browser tool exposed in this harness)
- Browser tool: N/A
- App start: Docker Compose stack (`inhome-frontend-1`, `inhome-backend-1`); stack left running
- Target: `http://localhost`
- Scenarios: dashboard gestor/prestador UI covered by the human attestation in `manual-test.md` (all 8 scenarios PASS)

## Manual Testing — Required
- `manual-test.md` attestation: ATTESTED.
- Verifier: Amarildo de Lacerda; Verified At (UTC): 2026-10-28T19:13:45Z; Evidence: docker stack and dashboard UI review.
- The attestation records `178/178` smoke at attestation time. Current smoke is `182/182` after the 4 dashboard smoke assertions added in this fix.
- Canonical `Status`, `Verifier`, `Verified At (UTC)`, `Evidence`, and all `## Scenario Results` rows validated with `scripts/lib/qc-evidence.mjs`. Legacy pre-check boxes and the `Notes: Tests in progress` line were preserved verbatim.

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | 817a989fa83065629c893977170621dce6dac461a00eb5fd7c06abbe98331f4f |
| TECHNICAL.md | 5b97147a50ea2b70a66ffa71a05c76a48536ddbeb76e79928aac719ee16ba31b |
| backend/package-lock.json | 62cd176aee0d760254c3acdfa712466602b26b625958a440a8c23a02a71c4ec1 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 3a512b503312e7b487a5430f7c3e76f3ef64a342c3fd4c815590e1b6f57abbcf |
| backend/src/routes/dashboard.js | 2179d85e91495fa1356324b0bc267ccef0795d2792ec94091167e938a4a4c5b3 |
| backend/src/routes/dashboard.test.js | a2281ff5873e610cbc2fc3ab3f5f65d6bd75b36b4cbb52dddbae3b687d37a5d8 |
| backend/src/services/alerts.js | 29fcbcf52a5b68c480613898fe095ef266d674dcde667738bb202422e2000127 |
| backend/test.sh | 1f99699407dee572eef2906f9d804c8433b63fdf15c0b2900dbe9457a73d38d7 |
| frontend/analysis_options.yaml | cc88073dea00345c800bf1f94021d3295cdd7fbd8b45a595a502a893304a5244 |
| frontend/lib/screens/dashboard_screen.dart | 3743e7f0d4c73091b67fed8700d72ea0277108b2592703c8fb34202dd8de65f4 |
| frontend/lib/services/api_service.dart | 0d353f0f6e902fa1dc9ee16d8349665a91b4cec2431509549565f3054f95c15c |
| frontend/lib/theme/app_theme.dart | c84fa77d8c87455c856190c6f9bf303441e2a6075d935a3c914d5247b2cbd1e8 |
| frontend/pubspec.lock | 3afc2469bbef98229b7cf2f6b29b9b4d25894905d2a4c82386b05b6d2e4030b7 |
| frontend/pubspec.yaml | 1861f0d113a1a660f4a0ccabe88777d1df9b4f8925defa35b4e14e88800290d4 |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/audit_nav_test.dart | 6aa8375f0447fd0d8ff651281ce09820edf70912e80c3a53f642e3d28eb5d5db |
| frontend/test/contract_providers_test.dart | bad71a1b784779b52f9a28046eacd024b95cb374df21e2526204a697bde494bc |
| frontend/test/dashboard_projects_nav_test.dart | 93a765980b448a94a07556ed5d7b1aa6554bf74cf60d359fcafcad1cd036ca7f |
| frontend/test/dashboard_redesign_test.dart | 48094b7d5b9d4941d9b70a65d0580bd769b7880e684842bbf78e270574dcab05 |
| frontend/test/login_screen_test.dart | 9f13bd284003744d1879b52fcfa99149b58424731621bb55d6af8762bc1a5676 |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| frontend/test/shell_toolbar_test.dart | 5b457eff1dca615cce9583a9eed41f7f68ec2c11b95d0a616cabb6810d17a0d5 |
| frontend/test/task_create_assign_test.dart | 65faa09780fee852ccd6861f0f1201470db35431fae5c62cd062f3a7288a20db |
| frontend/test/task_detail_sheet_test.dart | 74f52331f13645c91eddba8e41852c0e2634b852f223ea031d42a358cf629333 |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| frontend/test/vencimentos_screen_test.dart | d66485b65e2a5a340a0728d33d45b8d0840d3be71909e040ff6071f3ad25bef6 |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00015-redesign-dashboard/checklists/CHL001-ux.md | c66dc7113f89193d8bcd0b0e68c1849175f5fea0a66c1d8a0356c1d212b7a7f4 |
| specs/00015-redesign-dashboard/checklists/CHL002-testing.md | d2daf542907536a54d7b91f6267be8b8f1d3b2b06671d91dcaca7066323279a8 |
| specs/00015-redesign-dashboard/checklists/CHL003-api-quality.md | 5e7f2636ec4f41498006526ceb24d5f3bac0ea2dcf48abc30bd4c1ea3e7384a4 |
| specs/00015-redesign-dashboard/manual-test.md | 7b4254f3ad646680ed4274a6f389e7af7a33b755199cc3c6bfee5dcac945479a |
| specs/00015-redesign-dashboard/plan.md | c85b5a8994793bd741208b85ba4a9dda3af46aedbaabe23fb9ede6e816110fe4 |
| specs/00015-redesign-dashboard/spec.md | a4437cb5509c4c1a0110d6b42d9afde048bf1b41cef32ce4f64d2b82319f75d8 |
| specs/00015-redesign-dashboard/tasks.md | 83c10de137c5b21cc53f685760e4e88c77f5bbfcd0256c9569b59df59df11f5d |

## Tool Recommendations
- None required. No browser runtime is exposed; manual attestation covers the UI scenarios.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|
| T015–T020 | Resolved in this run; no active failure remains | — | FR-038–FR-043 suites |

## Bug Tasks Generated
- None. Prior T015–T020 are fixed and checked.
