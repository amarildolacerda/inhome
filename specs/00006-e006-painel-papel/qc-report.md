# QC Report: E006 — Painel por papel

**Generated**: 2026-10-09
**Mode**: Full (no prior report)
**Overall Verdict**: BLOCKED

## QC Scope Baseline

| Field | Value |
|-------|-------|
| Baseline Commit | 26ff3f99008ee2e0b665e6f4376108aa1d0d5049 |
| Mode | Full |
| Prior baseline | N/A |
| Changed files | 17 (see Evidence Manifest) |
| Test selection | Full suites |
| Safety explanation | First QC run for E006; no prior baseline. Full suites are the conservative choice. |

## Test Results

| Suite | Runner | Count | Failures |
|-------|--------|-------|----------|
| Backend unit | `npm --prefix backend test` | 107 | 0 |
| Backend smoke | `bash backend/test.sh` | 118/118 | 0 |
| Flutter widget | `flutter analyze && flutter test` | 16/16 | 0 |

## Static Analysis

| Tool | Issues |
|------|--------|
| `flutter analyze` | 0 (clean) |
| `node --check` on modified backend files | 0 (all pass) |

## Security Audit

| Tool | Vulns |
|------|-------|
| `npm audit --audit-level=high` | 0 |

## PI Compliance

**No violations.**

## Requirements Traceability

| Requirement | Task | Code | Status |
|-------------|------|------|--------|
| FR-001 (admin/gestor veem totais do domínio) | T002 | `backend/src/routes/dashboard.test.js:192` | PASS |
| FR-002 (prestador vê só tarefas próprias) | T003 | `backend/src/routes/dashboard.test.js:206` | PASS |
| FR-003 (system_admin 403) | T004 | `backend/src/routes/dashboard.test.js:217`, `backend/src/routes/dashboard.js:134` | PASS |
| FR-004 (bootstrap web aplicado) | T007 | `frontend/lib/main.dart:309`, `frontend/test/web_browsers_test.dart` | PASS |
| FR-005 (rótulos e foco nas telas) | T008 | `frontend/lib/screens/dashboard_screen.dart:45`, `frontend/lib/screens/tasks_screen.dart:111`, `frontend/lib/screens/projects_screen.dart:147` | PASS |
| FR-006 (regressão fim a fim) | T009 | full battery green | PASS |
| SC-001 | T001–T004 | unit + smoke green | PASS |
| SC-002 | T007, T008, T011 | a11y labels automated PASS; keyboard/focus/theme-flash requires human review | MANUAL |
| SC-003 | T009 | flutter 16/16 + backend 118/118 | PASS |

## Traceability Gaps

None. FR-004..006 and SC-001..003 fully mapped.

## Checklist Fulfillment

| Checklist | Items | Status |
|-----------|-------|--------|
| CHL001-security | 14/14 | PASS |
| CHL002-api-quality | 12/12 | PASS |
| CHL003-ux | 15/15 | PASS |

Spot-checked: `[Security]` items (auth middleware role checks, system_admin 403) verified in implementation. `[UX]` items (labels, keyboard navigation) verified via Semantics additions; interactive keyboard/focus test deferred to human.

## Performance

No explicit performance NFRs detected. `getDomainMetrics` is a lightweight DB query; smoke suite exercises the full stack.

## Accessibility (MANUAL VERIFICATION NEEDED)

**Detected**: SC-002 requires keyboard-only navigation, visible focus, readable labels, and theme without unstyled flash. No browser runtime available (no native or MCP browser tool) → manual path.

**Automated evidence**: Semantics labels added to NavigationRail (`main.dart:309`), dashboard (`dashboard_screen.dart:45`), tasks (`tasks_screen.dart:111`), projects (`projects_screen.dart:147`). `flutter test` covers label presence; interactive keyboard/focus traversal requires a human in a real browser.

## Browser Runtime Validation

**Mode**: Manual fallback (`BROWSER_RUNTIME_AVAILABLE = false`)
**Target**: `http://localhost/` (Flutter Web behind Edge `:80`)
**Scenarios**: keyboard navigation, screen-reader labels, theme bootstrap, role-based dashboard comparison, system_admin 403.

## Manual Testing

See [`manual-test.md`](manual-test.md). **Attestation: PENDING** — 5 scenarios need human review (keyboard focus, screen-reader labels, theme flash, three-role dashboard comparison, system_admin 403). Autopilot cannot attest this itself; `.qc-passed` is not created.

## QC Evidence Manifest

| Path | SHA-256 |
|------|---------|
| specs/00006-e006-painel-papel/spec.md | 280cd0c9c9aad4e179a2a20c3c8c338050c16f87cbb0fe78afdb0bb62e79f5cb |
| specs/00006-e006-painel-papel/plan.md | b177ee59a5cd94d45cabbd5baac2ce6c63515974f40b48d221ab3d182a742ffa |
| specs/00006-e006-painel-papel/tasks.md | 2cba3791f3867b6cec53a7d2eb5ce67154ba1241605378f360b55dcb352ee45f |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| specs/00006-e006-painel-papel/checklists/CHL001-security.md | 0f3320fd0ce7c77cb59cefcf5b4df74712f04abadcabfba9bb351f203b475673 |
| specs/00006-e006-painel-papel/checklists/CHL002-api-quality.md | 2796a046782a5ed9a9ffc0d0c225063fbf6379e75b6bf74ad7d587470ef7c96f |
| specs/00006-e006-painel-papel/checklists/CHL003-ux.md | 73e35aa6311cbb1776acd9f9484b4ec3ad47ddeedb8a59669aa815757fc56e23 |
| specs/00006-e006-painel-papel/manual-test.md | dbbc9fd4e254fb423db8fad3cac6b40c36d29c815877c84338381737b9edd67b |
| backend/src/routes/dashboard.js | 4f32b24fab149566c515a7dea7d16c9f9ab1627c21d978b93bf9b44b4a61edbf |
| backend/src/routes/dashboard.test.js | b655fe514b627a785155d4bb72ab574ac28ca9af5e741279f856dea032b3df8b |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| frontend/lib/main.dart | 1b4b5876ad8a36a271bfac4812ddd41b75e28801a28076dc50b592e9bc3d1397 |
| frontend/lib/screens/dashboard_screen.dart | 536782455544479e096dc600188f3aafae248294e32cc7557ce9673e8e32ac76 |
| frontend/lib/screens/tasks_screen.dart | 5a7f3004f1a83779f457b020ce6083664e57bebdcd330ce3a8c11edc0c784a14 |
| frontend/lib/screens/projects_screen.dart | 920a2f61992f1a48f13ff2a18ebf2660eb790a9fcdf7eaa52a8f544f2f8076fd |
| frontend/test/a11y_labels_test.dart | 58cfde5460796676ce89d6741b4475e6032912ad5bebb93e2d2085131f00695b |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |

## Tool Recommendations

None. All planned tools ran successfully.

## Bug Tasks Generated

None. No automated failures.

## Next Action

A human must open `http://localhost/`, run through the 5 scenarios in [`manual-test.md`](manual-test.md), and change the attestation to `Status: ATTESTED` with all scenarios `PASS`. Only then can QC be re-run to produce `.qc-passed`.
