# QC Report: E007 Busca e Filtros (00007)

**Date**: 2026-10-11T14:30:00Z  
**Feature Directory**: specs/00007-e007-busca-filtros  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full
- Prior Baseline: N/A (prior report BLOCKED at attestation; evidence digest stale after human edit of manual-test.md — full re-run required)
- Changed Files: N/A (full run)
- Test Selection: Full suites (unit, smoke, flutter, audit, syntax)
- Scope Safety: Prior manifest's manual-test.md digest no longer matched exact bytes after attestation; prior rows were also unsorted — full run re-seals with sorted rows.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Unit (backend node --test) | 111/111 | 115/115 | +4 (E009 socket suites; no regression) |
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

## Requirements Traceability — 9/9 work items verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T009 | Work Items | PASSED | all `[X]` in tasks.md, 0 unchecked |
| Manual scenarios | Scenario Results | PASSED | all rows PASS in manual-test.md |

## Traceability Gaps
- None

## Checklist Fulfillment — 42/42 spot-checked
- CHL001-security (14/14), CHL002-api-quality (14/14), CHL003-performance (14/14) — all `[X]` at implement time; intent satisfied by delivered search route + indexes + tests

## Performance — PASSED
- Automated p95 latency assertion in the E007 search suite (2000-row seed) is green in the 115/115 unit run; browser-timed p95 validated by human attestation

## Accessibility — SKIPPED
- No accessibility NFRs in spec.md

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED
- Mode: Manual fallback (human attestation)
- Browser tool: N/A (no browser tool exposed in this harness)
- Target: http://localhost/ via docker compose
- Scenarios validated by human verifier: see manual-test.md

## Manual Testing — Required
- See [specs/00007-e007-busca-filtros/manual-test.md](manual-test.md)
- Attestation: ATTESTED — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-11T13:49:41Z; every Scenario Results row PASS

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/config/database.js | f3853c151fecb800f2b2c3b1dd3d51cc8cbba9d450104f2245f3163f542b869c |
| backend/src/routes/search.js | b885d119786395edace5cefd983f7749aaa54ff54360686f9cf84b4ec4768fa1 |
| backend/src/routes/search.test.js | 81785276addf1b9742e9ed54ad4f9240918213d6ddceead78bd2d978c47ff53c |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| specs/00007-e007-busca-filtros/checklists/CHL001-security.md | 353b822ddcbdc6dd47526cb587c6aa1d2503c3a6104afb4c114e97ec0b9113f8 |
| specs/00007-e007-busca-filtros/checklists/CHL002-api-quality.md | bd9173147c69ae01f39eb257c434deb1a2ea5e8079d1cfaebcd243b0823851df |
| specs/00007-e007-busca-filtros/checklists/CHL003-performance.md | b5d9f7164de5b8464672a65e10adb03ee7def59f9f8f473b666a8eebdbbaccae |
| specs/00007-e007-busca-filtros/manual-test.md | 61662ff7b85eb615c81adf60821df9245f8894d014ef3e7901651c6ba7e5b8c7 |
| specs/00007-e007-busca-filtros/plan.md | 6e4dc2fb5bd4fe78189c9029c10aff70de6ad2dc4a56f2884bf19e8a617bdcd7 |
| specs/00007-e007-busca-filtros/spec.md | 960826466786eef25fe7ba9a3c580c506acd2c1503750b875fba2b4cf24970a2 |
| specs/00007-e007-busca-filtros/tasks.md | 139cd7f736819300e0b0848af24a2ba2eaa2cf82a20484f0a73ac4de27ede6ec |

## Tool Recommendations
- None

## Bug Tasks Generated
- None
