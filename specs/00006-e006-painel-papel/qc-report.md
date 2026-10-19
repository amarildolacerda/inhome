# QC Report: E006 Painel por Papel (00006)

**Date**: 2026-10-11T14:24:00Z  
**Feature Directory**: specs/00006-e006-painel-papel  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full
- Prior Baseline: N/A (prior report BLOCKED at attestation; evidence digest stale after human edit of manual-test.md — full re-run required)
- Changed Files: N/A (full run)
- Test Selection: Full suites (unit, smoke, flutter, audit, syntax)
- Scope Safety: Prior manifest's manual-test.md digest no longer matched exact bytes after attestation; only a full run can re-seal evidence.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Unit (backend node --test) | 107/107 | 115/115 | +8 (later-epic suites; no regression) |
| Smoke (backend/test.sh) | 118/118 | 118/118 | 0 |
| Flutter widget tests | 16/16 | 16/16 | 0 |
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

## Requirements Traceability — 11/11 work items verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T011 | Work Items | PASSED | all `[X]` in tasks.md, 0 unchecked |
| Manual scenarios | Scenario Results | PASSED | all rows PASS in manual-test.md |

## Traceability Gaps
- None

## Checklist Fulfillment — 42/42 spot-checked
- CHL001-security (14/14), CHL002-api-quality (14/14), CHL003-ux (14/14) — all `[X]` at implement time; intent satisfied by delivered dashboard routes + semantics labels + tests

## Performance — SKIPPED
- No performance NFRs in spec.md; getDomainMetrics is a lightweight DB query exercised by smoke

## Accessibility — PASSED
- Semantics labels on NavigationRail, dashboard, tasks, projects covered by flutter widget tests; keyboard/focus traversal validated by human attestation (MT scenarios PASS)

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED
- Mode: Manual fallback (human attestation)
- Browser tool: N/A (no browser tool exposed in this harness)
- Target: http://localhost/ via docker compose
- Scenarios validated by human verifier: see manual-test.md

## Manual Testing — Required
- See [specs/00006-e006-painel-papel/manual-test.md](manual-test.md)
- Attestation: ATTESTED — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-11T13:49:41Z; every Scenario Results row PASS

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/routes/dashboard.js | b55e171d0758828762518efd492627dee36b4ba8f895ef2cc2a3bd817c7989f8 |
| backend/src/routes/dashboard.test.js | c42fa0efc8ffd1258d0c59875e9b980a2a74c6ae2e3014073116025ab4c9175a |
| frontend/lib/main.dart | 396fa7a21cd1aedbe1bae19a01dda2eec76d1c0f4b126da1292f06b927cc223b |
| frontend/lib/screens/dashboard_screen.dart | 5d1a74658b716b186f8d206e2994abfa50abf425b4407ea85e5a765493ad0689 |
| frontend/lib/screens/projects_screen.dart | 5d5c18113324992ccef5ed2f5cd39c0e997152ddd12487b4e79a203290831ef6 |
| frontend/lib/screens/tasks_screen.dart | 4dfcdc63264e2fd7c66b2afa6b4289f0b4bd39c5598f6a244299b180c72b3f5c |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00006-e006-painel-papel/checklists/CHL001-security.md | 0f3320fd0ce7c77cb59cefcf5b4df74712f04abadcabfba9bb351f203b475673 |
| specs/00006-e006-painel-papel/checklists/CHL002-api-quality.md | 2796a046782a5ed9a9ffc0d0c225063fbf6379e75b6bf74ad7d587470ef7c96f |
| specs/00006-e006-painel-papel/checklists/CHL003-ux.md | 73e35aa6311cbb1776acd9f9484b4ec3ad47ddeedb8a59669aa815757fc56e23 |
| specs/00006-e006-painel-papel/manual-test.md | 5b16d1b7c4e28453e54c7dfc592ef94137e01127a6b833dc65318772b287c865 |
| specs/00006-e006-painel-papel/plan.md | b177ee59a5cd94d45cabbd5baac2ce6c63515974f40b48d221ab3d182a742ffa |
| specs/00006-e006-painel-papel/spec.md | 91d5d1fbe68f818911066ff648238aed6af73ac151489e7f6486ba7c222172d4 |
| specs/00006-e006-painel-papel/tasks.md | 2cba3791f3867b6cec53a7d2eb5ce67154ba1241605378f360b55dcb352ee45f |

## Tool Recommendations
- None

## Bug Tasks Generated
- None
