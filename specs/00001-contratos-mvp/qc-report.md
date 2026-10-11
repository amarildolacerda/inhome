# QC Report: Gestão de Contratos de Terceiros (MVP)

**Date**: 2026-10-08T22:10:29Z
**Feature Directory**: specs/00001-contratos-mvp
**Overall Verdict**: BLOCKED

> Blocker: human-only manual attestation is pending. `manual-test.md` was generated this run with `Status: PENDING` and 14 `PENDING` scenarios; autopilot must never attest. All automated batteries are green — no CRITICAL/ERROR findings, no bug tasks.

## QC Scope Baseline
- Baseline Commit: 26ff3f99008ee2e0b665e6f4376108aa1d0d5049
- Mode: Full (no prior `qc-report.md` for this feature)
- Prior Baseline: N/A
- Changed Files: 3 uncommitted paths at entry (`specs/sad.md` modified by the gate repair; `autopilot-log.md` and `manual-test.md` untracked; the latter created by QC) — `spec.md`/`plan.md`/`tasks.md` byte-identical to baseline, so full QC was required and executed
- Test Selection: Full suite (unit, smoke, flutter, audit, syntax)
- Scope Safety: QC changed no implementation code; QC outputs are this report, `manual-test.md`, and `autopilot-log.md` rows. `.qc-passed` is absent by design (BLOCKED)

## Summary
| Check | Status | Details |
|-------|--------|---------|
| `.completed` gate | PASSED | present at entry (`Completed: 2026-10-08T20:11:33Z`); BLOCKED does not remove it |
| Tasks gate | PASSED | `parse-tasks` valid, 34 tasks, 0 errors; 34/34 `[X]`, 0 unchecked; `tasks.md` 6141/6144 B |
| Policy Auditor (inline) | PASS | subagent lanes blocked (`subagent_depth`); inline audit of spec/plan/tasks vs `project-instructions.md`: 0 violations, 0 CRITICAL |
| Unit tests backend (full) | PASSED | 79/79, 0 fail (Node v24.18.1; log `/tmp/opencode/battery-unit-00001.log`) |
| Unit tests — 00001-owned files | PASSED | 56/56 across 17 files (`database`, `auth`, `upload`, `validate`, 10 route suites, `email`, `report`, `server`, `server.socket`); the other 23 belong to 00003-era suites |
| Smoke `backend/test.sh` | PASSED | 84/84 total; 00001-era §§1–15 = 61/61, 00003-era §16 = 23/23 |
| Flutter static analysis | PASSED | `flutter analyze` → "No issues found!" (SDK Docker `ghcr.io/cirruslabs/flutter:stable`) |
| Flutter widget tests | PASSED | 13 passed, 0 failed; 00001-owned FR-027 `web_browsers_test` + FR-028 `a11y_labels_test` included |
| Security dependency audit | PASSED | `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities |
| Syntax check backend | PASSED | `node --check` on 60 `backend/src` files → 0 errors |
| OWASP manual review (PI) | PASSED | parametrized SQL (`?` + `stmt.bind`), bcrypt + JWT 24h, `scopeDomain`/`getDomainDb(req.user.domainId)` isolation, upload random-name + extension allowlist (disk ref only, AD-005), role matrix tested; findings: 0 |
| Story verification | PASSED | 12/12 work items, 29/29 FR verified against tests + code; SC 12/13 (SC-013 human-timing pending manual) |
| Browser probe (6.0) | manual fallback | no native browser tool; `list_mcp_resources` → 0 resources → `BROWSER_RUNTIME_AVAILABLE = false` |
| Manual attestation | BLOCKED | `manual-test.md` `Status: PENDING`, 14/14 scenarios `PENDING` |
| Code coverage | SKIPPED | Coverage Target empty in `.github/sddp-config.md` |
| BUG task migration | N/A | no CRITICAL/ERROR/WARNING bug task generated; `tasks.md` unchanged (6141/6144 B) |

## Test Results — PASSED
- Runner: `node --test` via `npm --prefix backend test` (Node v24.18.1). Total 79, Passed 79, Failed 0. Log `/tmp/opencode/battery-unit-00001.log`.
- Runner: 00001-owned subset (`node --test` with 17 explicit files). Total 56, Passed 56, Failed 0. Log `/tmp/opencode/battery-unit-00001-own2.log`.
- Runner: `bash backend/test.sh` (PORT=3199). Total 84, Passed 84, Failed 0 (§§1–16). Log `/tmp/opencode/battery-smoke-00001.log`.
- Runner: `docker run ghcr.io/cirruslabs/flutter:stable` → `flutter pub get && flutter analyze && flutter test`. 13 passed, 0 failed, 0 skipped. Log `/tmp/opencode/battery-flutter-00001.log`.
- Runner: `npm --prefix backend audit --audit-level=high`. 0 vulnerabilities.
- Runner: `node --check` on all `backend/src/**/*.js` (60 files). 0 errors.
- FR-tagged coverage: all 29 plan stub names (`FR-001 enable` … `FR-029 ports`, FR-027/FR-028 in Flutter) found executed and green.

## Failure Index
No failures. Observations (report items — no bug task, per precedent `specs/00003-workflow-assistido-contrato/qc-report.md`):

| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| O1 | traceability | WARNING | specs/00001-contratos-mvp/plan.md:31-59 | `evaluateCheckedTaskProvenance` reports 69 stale-checked-task issues (31 test-path: coverage rows omit `*.test.js` paths listed in the Acceptance Test Stubs table; 38 symbol-attribution: multi-requirement tasks export symbols not repeated in every tagged row, e.g. `FR-003` row lists `requireSystemAdmin()` while T004 exports `requireRole()`/`signJwt()`/`scopeDomain()`). Documentation drift only — all batteries green. Provenance also fails for QC-passed features 00002 (3 issues) and 00003 (25 issues) with checked tasks | None — report item |
| O2 | stale-doc | NIT | specs/00001-contratos-mvp/plan.md:21 | "flutter test blocked (no SDK)" is stale — the Docker SDK runs `flutter analyze` + `flutter test` (13/13 this run) | None — report item |
| O3 | stale-doc | NIT | specs/00001-contratos-mvp/plan.md:65-95 | Acceptance Test Stubs `Status` column still reads `pending`; stubs now execute and pass | None — report item |

Bug-task migration was not attempted: `tasks.md` is 6141/6144 bytes (3 B headroom), so any BUG line + `## Phase: Bug Fixes` heading would exceed the 6 KB gate; findings are recorded as report items instead (decision logged in `autopilot-log.md`).

## Code Coverage — SKIPPED
- Threshold: Not configured (`.github/sddp-config.md` Coverage Target empty; `project-instructions.md` sets no numeric gate).
- Status: SKIPPED; the enforced bar is the green suite (79 unit + 84 smoke + 13 widget).

## Static Analysis — PASSED
- Tool: `flutter analyze` (frontend), `node --check` (backend), `scripts/parse-tasks.mjs`, `scripts/checklist-state.mjs` (artifact grammar).
- Critical issues: 0, Warnings: 0 ("No issues found!"; 60/60 syntax clean).

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities.
- Tool: manual OWASP Top 10 review (required by `project-instructions.md` §Testing & Quality Policy):
  - Injection: all queries use `?` placeholders bound via `stmt.bind` (`backend/src/config/database.js:45`); no string-built SQL over user input.
  - Broken auth: bcrypt compare (`routes/auth.js`), JWT `expiresIn: '24h'` with required `JWT_SECRET`, deny-by-default role matrix (`requireRole`, FR-022 unit + smoke §14 401/403).
  - Broken access / tenant isolation: `scopeDomain` + `getDomainDb(req.user.domainId)`; cross-domain 403/404 tested (`FR-014`, `SC-008`, smoke §§12/15); `domains.js` platform routes are system_admin-gated.
  - File upload (AD-005): server-generated name (`crypto.randomBytes`), extension allowlist `/^\.[a-z0-9]{1,8}$/`, bytes on disk, DB stores reference only.
  - Mass assignment: `validate()` schema allowlists typed fields; handlers bind explicit column lists.
- Findings: 0.

## Project Instructions Compliance — PASSED
- Linting (required): `flutter analyze` 0 issues; backend `node --check` 60/0.
- Security scanning (required): `npm audit --audit-level=high` 0 vulns; OWASP manual review 0 findings.
- Unit tests before promotion (required): 79/79 executed; no `dev` → `main` promotion performed; no commit made by QC.
- Branch: `dev` (matches PI §I). Sizes: `spec.md` 6102/10240 B, `plan.md` 10077/10240 B, `tasks.md` 6141/6144 B; IDs intact; checkboxes 34/34 `[X]`.
- Session TODO intake: `TODO.md` read at start; 2 pending custom TODOs surfaced (bootstrap commit; naming phases 2–5).
- No violations at any severity.

## Requirements Traceability — 12/12 work items verified, 29/29 requirements, 12/13 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | FR-001/002/003: `enable`, `suspend/reactivate`, `sysadmin gate`, `habilitação atômica`; smoke §§3/13; UI cycle → manual scenario 1 |
| US2 | Work Item | PASSED | FR-004/005/022: user CRUD, finalidade CRUD, role matrix; smoke §§5–7; SC-013 human timing → manual scenario 2 |
| US3 | Work Item | PASSED | FR-006/007/008/009: create, unlink block, overdue/extend, admin delete; smoke §8 |
| US4 | Work Item | PASSED | FR-010: `flow+link`; smoke §9 |
| US5 | Work Item | PASSED | FR-011/013/015/023: complete, visibility, comments/attach, disk ref |
| US6 | Work Item | PASSED | FR-012: reopen with motivo |
| US7 | Work Item | PASSED | FR-018: PDF/CSV |
| US8 | Work Item | PASSED | FR-014/024: cross-domain, per-domain DB; `SC-008` unit; smoke §§12/15 |
| US9 | Work Item | PASSED | FR-016/026: filters; 1000 rows in 804 ms (<2 s) |
| US10 | Work Item | PASSED | FR-017: SMTP gate |
| US11 | Work Item | PASSED | FR-019/027/028: metrics; FR-027/FR-028 Flutter tests; smoke §10 |
| US12 | Work Item | PASSED | FR-020/021/029: socket, validation, ports; domain-room isolation tests |
| SC-001 | Success Criteria | PASSED | smoke §§3–4 (enable → admin login) |
| SC-002 | Success Criteria | PASSED | smoke §13 + `FR-002 suspend/reactivate` |
| SC-003 | Success Criteria | PASSED | `FR-008 overdue/extend` (backend); UI leg → scenario 3 |
| SC-004 | Success Criteria | PASSED | `FR-010 flow+link` (API denies non-linked) |
| SC-005 | Success Criteria | PASSED | `FR-011 complete` text+photo persisted; UI visibility → scenario 5 |
| SC-006 | Success Criteria | PASSED | `FR-012 reopen` motivo + history |
| SC-007 | Success Criteria | PASSED | `FR-018 PDF/CSV` |
| SC-008 | Success Criteria | PASSED | unit `SC-008 two domains zero cross` + smoke §§12/15 |
| SC-009 | Success Criteria | PASSED | `FR-026 1000 rows` 804 ms <2 s (backend); UI timing → scenario 9 |
| SC-010 | Success Criteria | PASSED | `FR-017 SMTP gate` (zero sends without `SMTP_*`) |
| SC-011 | Success Criteria | PASSED | `FR-019 metrics` (backend); UI <2 s → scenario 11 |
| SC-012 | Success Criteria | PASSED | `FR-020 socket` + `FR-021 validation`; browser reflection → scenario 12 |
| SC-013 | Success Criteria | PARTIAL (pending manual) | gestor+finalidade <5 min is human-timing — manual scenario 2, attestation pending |

## Traceability Gaps
- SC-013 human-only timing → `manual-test.md` scenario 2 (attestation pending).
- E2E script `/tmp/opencode/e2e-e001.sh` is absent (host cleanup, AD-002 precedent): **COVERED-BY-PROXY** — `backend/test.sh` §§1–15 (61 checks) + FR-tagged unit suites (56 tests) + Flutter FR-027/FR-028; no execution invented.
- Plan coverage drift O1 (69 provenance issues) — documentation-level, report item.
- Exclusions by design: `backend/.env` git-ignored (no manifest row); battery logs live under `/tmp/opencode/` (outside the repository).

## Implementation Review Findings — SKIPPED
- No `.review-findings` artifact present; section has no data.

## Checklist Fulfillment — SKIPPED
- `checklists/` does not exist for this feature; `scripts/checklist-state.mjs` → `overallStatus: N/A`, queue `null`.

## Performance — MANUAL VERIFICATION NEEDED
- Automated: `FR-026 1000 rows` measured at 804 ms (<2 s) and smoke dashboard checks pass.
- Manual: UI timing for SC-009 (filters) and SC-011 (dashboard) → `manual-test.md` scenarios 9 and 11.

## Accessibility — MANUAL VERIFICATION NEEDED
- Automated: `a11y_labels_test.dart` (FR-028) passes; `flutter analyze` 0 issues.
- Manual: keyboard navigation + contrast → `manual-test.md` scenario 14.

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED (manual fallback)
- Mode: Manual fallback — `BROWSER_RUNTIME_AVAILABLE = false` (no native browser tool exposed; `list_mcp_resources` → 0 resources)
- App start: `docker compose up -d` (backend health ok, frontend 200)
- Target: `http://localhost/`
- Scenarios: 14 scenarios written to `manual-test.md`, all `PENDING` human execution

## Manual Testing — Required
- `manual-test.md` generated this run: 14 scenarios, `Status: PENDING`, `Verifier`/`Verified At (UTC)`/`Evidence` pending.
- Attestation: PENDING — BLOCKED. Autopilot must not create or infer the attestation; `qc-evidence.mjs` currently reports `Status: ATTESTED` missing, UTC timestamp invalid, and non-PASS scenario rows (expected while pending).

## QC Evidence Manifest

| Path | SHA-256 |
|------|---------|
| .github/sddp-config.md | 643a1aeeb889417f72050009a807a4869e4b526517262428997377203c47753d |
| backend/package-lock.json | f4806de0cbadddea7583bb1fd46dfdfa2a2e2188c50a15ccfe77e61c4d034962 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 043bf80eeb13b8b641d6d52b488fa8ebcd3b875755585f1b89343f34c22399cd |
| backend/src/config/database.test.js | e73d448073479b8512e5b0ff28940c5143ab36c5850e9c84f94a8dec5acae134 |
| backend/src/config/opencode.js | e04b68cece645a75057bbf43307e77aee236f460c8f72b65a255c40023af8bac |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | ef73381f5457cbb0b339ad652522389bd24160e3ee2ab453a1010beb2fab5bae |
| backend/src/middleware/upload.js | d783b1b4303103fce97e9d2d76bbc91c0cc0d8f474054956df0506b68b2e9c7e |
| backend/src/middleware/upload.test.js | e5b1870b5f3c877de7b8e2773498c364492d3d84fa9931e8cc5f0a53d5651225 |
| backend/src/middleware/validate.js | 57afd3f9eac30f12fcc67f8ea67b3be3ac15b9199265495bd3b810a03dc80496 |
| backend/src/middleware/validate.test.js | 319e50b0badf4e8236aaedac61372455609a3b6b54e3c12d383656cef493dcef |
| backend/src/models/Contract.js | 3db01de874b8eda28749f0113d868dbc47de10d41698dbf1f380340f465d53ed |
| backend/src/models/ContractDefinition.js | 66226df76c435955e27d25391a65f245b047115571f8fddb0c0e2a01d0f27e50 |
| backend/src/models/ContractDefinition.test.js | 4bad5d63fdb3110751eb2d51579c2643b5ed51364dd0057ac69334f296236960 |
| backend/src/models/ExecutionPlan.js | 46892bfcf61b4fe10f50c8d4fb3bde7803e64e73da98605852b06a98c51761c6 |
| backend/src/models/ExecutionPlan.test.js | 3913ba7d76606842c5ff5ce0590b6f1d6c3538b88cdf57039a43f192caa1e958 |
| backend/src/models/History.js | 247b461cd1a6af92b13f7621e86f740f4c85ab49711cdd8b94755601927d2ed6 |
| backend/src/models/History.test.js | 97d794ba86211454764015a7b8c3ec2405c0e478f616c56264e50e45b699627f |
| backend/src/models/Task.js | 68c510d4312d86f77400b802641df0f2ad1ca373c0a81e80549917f6cb5bd6ee |
| backend/src/models/TaskSuggestion.js | 11c70bc315e44decb70f74984ff27670a94a7c683e7a21f3b6a14d38a7efd2c8 |
| backend/src/models/User.js | a2be454ee6bd6246a752ae02706637e16abefb5e05b7d64c5d66528c90d32023 |
| backend/src/routes/attachments.js | 7cfe1a2610c10c4660f985b2f1640d3cdfe104e5d4225ebeead4a4a3843224f4 |
| backend/src/routes/auth.js | 377eacc0f80ceb6e3e963b6f651c41b13afab928b260c5006dfe65c02ab1659b |
| backend/src/routes/auth.test.js | 9376b29fc9e77d2794210f4c1f4d9b9be36db1437b5aa73f85b863de79a1db62 |
| backend/src/routes/comments.js | a4890f1cb6a037c7a519c5e444c979a71aa0a8b0535af044942092c4569dcb33 |
| backend/src/routes/comments.test.js | 7821070d66851c9a3fca55ec7a6ad8c62771c38228d7ac4104f709431bd79608 |
| backend/src/routes/contracts.js | 0254e87d802ba94e44af35d5c02e9638321bbb27d013f0be4e1745b7f1985f64 |
| backend/src/routes/contracts.test.js | e2e580018817d38bc64254252a2c87671896021cbe3569aa789c8fde67c7b17e |
| backend/src/routes/dashboard.js | 4f32b24fab149566c515a7dea7d16c9f9ab1627c21d978b93bf9b44b4a61edbf |
| backend/src/routes/dashboard.test.js | 3b4112c7c8749d8fb4d051ce1eb35329094f1537c21355519e9a1e082f197598 |
| backend/src/routes/definitions.js | 1fdf7475f5db3f6186d0948a7fa0a39e296c8bf36351afaecca34c372288d23e |
| backend/src/routes/definitions.test.js | 3be1cdb1f40976d91678cd4c130d789642db0eac237c5a07fe54b0a737da68fb |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/domains.test.js | 16ae3265b0ceb7fd9df5b22647e7e211c311eee928a3a0a1654da9091bb0cb60 |
| backend/src/routes/executionPlan.js | beed7db447b83fbe1ef00f5255c9c248f8e7ca4bf373c6be4e675f0804456a7c |
| backend/src/routes/executionPlan.test.js | 832e1ad1ca6bdaa3af2d20c15806db00bba2af699da60844e93c67c786557210 |
| backend/src/routes/finalidades.js | acc5fcdea795211e48779028c712658948161afd0d3e763e91ecce8fe28a29b0 |
| backend/src/routes/finalidades.test.js | 8d2167f630a48d4a4d5fc0c5426c19fcbcbd96ec6be7c5e6f1c0e06fbcc154bf |
| backend/src/routes/opencodeConfig.js | 46591a7e1b7228d1a82b73aa80418f01af77f60b6006f6ffb6dfc701206659f8 |
| backend/src/routes/review.js | 1e8cb4e6e284c2eca69567e3ce47577a26d7c117f8975ada5302ebf9ff5977dc |
| backend/src/routes/review.test.js | 88e76e1c4023e1c15865bf4113e054ea9e01c8f84bcd79ef1299c4cfab8d052d |
| backend/src/routes/search.js | b885d119786395edace5cefd983f7749aaa54ff54360686f9cf84b4ec4768fa1 |
| backend/src/routes/search.test.js | 75ef9e87a0f49b8195f48044b7e69953b844b1dda00bbc753a143318fc205fea |
| backend/src/routes/suggestions.js | 00a561142e8a9d4078f7e4fd3370059c6d90a05b12cad7393483e01dab6d7b75 |
| backend/src/routes/suggestions.test.js | d851604c30584883101ba6aa95fdba198673fa80b5755998b2302c86245c8dcd |
| backend/src/routes/tasks.js | 1dc9da91e124530e4834e36ea735d29199b22ea66d725b02794053ed45e9a326 |
| backend/src/routes/tasks.test.js | 07543f554da437e89f1e2964020de3b566be48be6f565aabddd1b2d4a3b7ec98 |
| backend/src/routes/users.js | 13cbbeea285897db9d7ef5f3845a21bbe25540033a357a92910d92dc909e96f5 |
| backend/src/routes/users.test.js | 5eb74f0ceb2c72feab6675c50c94b06cbc4433f705ffc1623b0727f222bddb34 |
| backend/src/routes/workflow.js | d2873e822bad195546a254eefa3e668586c5ba32bad382c28caa79788679f5ce |
| backend/src/routes/workflow.test.js | a50479f2771139267ea6e7994312027025f815757e265e11f2225ec4c0392407 |
| backend/src/server.js | 19e118041850d831e77125d01ff7ba65bab3ecbdadc673c7a39a3ae341bf089d |
| backend/src/server.socket.test.js | 6440d0c50508c364ddf6c7f29a311c41e761c74038c8603906bc0b85cd316a59 |
| backend/src/server.test.js | da2e252498bf01ffa86679e2aa67e306ae44431fa746622c345be344805f58f2 |
| backend/src/services/email.js | 8355b554aca21163dcc618127c13c00d5a1d82fb8ff93cc941cd64e2cc25d1ae |
| backend/src/services/email.test.js | 11718095dc5d6d33f2ed38b63d141d50e1ae8d4080c089c4fc9bdb309af9c768 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/src/services/opencode.js | c9f39ae0ef9dc758e0715bc4dd8e232cb3e52d0fb0139d0884c95ccdfaa6e0e3 |
| backend/src/services/opencode.test.js | 01bf3ab27ec83d5104c7b21b4e0ba3cd32745e85f2f72b70448698a68915079a |
| backend/src/services/report.js | 5dcce20833d309ceccdf005187e1f5a4fc02b1830378d83f8d53a4d2985c59a4 |
| backend/src/services/report.test.js | ffb9cc8ed09de42cd4ff2886c0b9140bacca160dce2beae1f91607f8fad62229 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | 42664c8685cd5b71852ec90a77054d408cd8b5404870b0df2b22b7c5210d98a8 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/lib/main.dart | 1b4b5876ad8a36a271bfac4812ddd41b75e28801a28076dc50b592e9bc3d1397 |
| frontend/lib/models/contract.dart | 16ce202147aee5d1dfea40e993983fafb42b7f0423ac025c03ca7114389c9ae8 |
| frontend/lib/models/finalidade.dart | 372229ba59bd2439e1d8facb640ab22dfb3255e0ec26882bb74a2bd70c1a8e6d |
| frontend/lib/models/project.dart | 9568f3033c682b1704dd046dc675ae5885058321edf90a9c3aef0c476af756a8 |
| frontend/lib/models/task.dart | 209670535d0d5611254fc7deb3d16aa906a08a173c83b5cbb522e847d482035a |
| frontend/lib/models/user.dart | b9619602c4f770ddd082116917735d225b33bca1783e93cd462a4ca82b079ad5 |
| frontend/lib/screens/contract_detail_screen.dart | d4956f44a88f6cbf6c3b8815bcef185ee338f9f2039a8a73a85864dd8d72f22d |
| frontend/lib/screens/dashboard_screen.dart | 215c6ea7792c1d8a4bd16bd28e35aa455a5d6116a8e9e3a081ec4a6b5b1efc60 |
| frontend/lib/screens/domains_screen.dart | 84187efce1a3886888ac57de3489132426353c6ceeca1dad191958c1f67268d4 |
| frontend/lib/screens/finalidades_screen.dart | d90c5104e5cb3c623384a142b2480bd1aba7b8cd86442e9f0414bbb6ab8414c4 |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 136c2cf8f2319df6215ebbda0de99f9ba3a2a448ab42203c3520694c96e0449f |
| frontend/lib/screens/tasks_screen.dart | 8e265cff74ecfae5efe65e4576a52e4147a201de32b3384a3a869149c38e856d |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 4c35294623378efa3d0949881a04e995841c1ed886ede1a904ed691782f504e0 |
| frontend/lib/theme/app_theme.dart | ba9a7a048a7f732d7285f575a1c60089a1092e36f6889695c8b44df089147dc9 |
| frontend/lib/widgets/suggestion_panel.dart | 20da4924981b5c3e5d5583d07c6abe664e505bd7d1456f4ce27335c1b8df06c8 |
| frontend/lib/widgets/task_list_tile.dart | b38cef95af9fbb9b182c45d647d40fe21d446ccedbe8bf9f4e5d3b60ea301bf7 |
| frontend/pubspec.yaml | 15495b09cdbf0286f2f1bdef52652e2f4246f254f6394f881e7515e4a3e843b8 |
| frontend/test/a11y_labels_test.dart | ce9fb98fe7011136e80c245c1083168f5a9d7c4afc68207b8ab07b5680aae2b0 |
| frontend/test/roles_nav_test.dart | b323627cc130fca86e9c1a7cdae5cbcab3826d20c940550ec517765ea8c8bafc |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| frontend/test/web_browsers_test.dart | beb920e18984dec8be1a6658387cfca466c5da9877afd1c6eb731d49aa64231c |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| scripts/checklist-state.mjs | 872b76fcd87f2e03c98883fffb56f81c4bf1a20b3d0706922a480db0acc75f38 |
| scripts/derive-completion-state.mjs | 6be9461695cb6547ffd567f92e9de6cfff12e6dd32ab4ca49010e7f3e567f46b |
| scripts/parse-requirement-ownership.mjs | 10877e3b138e6f2ef53d6d2c91875dae7f8f9f89255c0f7131f1350d2c487f68 |
| scripts/parse-tasks.mjs | 3e550e85cdcbbf26533d527cd71bb59c38927bc239fbe555e4885969196daef5 |
| scripts/phase-gates.mjs | 546a924e4169b00e9db550f7e785725077706a5b1223d86026c8601bf98d455c |
| scripts/resolve-feature-dir.mjs | 2e5978f32281b85ec3fe07afa446aa4961457e161bf997ee3f1921f6e0db0e36 |
| scripts/validate-prd.mjs | d723649e71d0fc923a727c737d68b73f8913a738b954c394e9c5642c34fe1cee |
| scripts/validate-sad.mjs | 3127bd132df33ad807f90d8d8ef9dade218a3331c34b54cdc807b60853724885 |
| specs/00001-contratos-mvp/manual-test.md | be6244c5eb9137c65fc5d53ea4c538f2b519580ee8936b029a1667798b0e2c9b |
| specs/00001-contratos-mvp/plan.md | c62ceeec155974afb229ddbf3e5f663a9b97d77d88a929e13767196defae1b98 |
| specs/00001-contratos-mvp/spec.md | 3a4c3449eafb019a9c4d7afd247dcf4c5b42e4ff3b107a9cadf95814e075e4e8 |
| specs/00001-contratos-mvp/tasks.md | d33422b2243ebc7ff3b6d0e448b79874bd009079c253948f592be652f0ea0c19 |

## Tool Recommendations
- Coverage instrumentation: fill `**Coverage Target**` in `.github/sddp-config.md` and run `npx c8 -- npm --prefix backend test` when the project wants a numeric gate (configured in plan `Testing Strategy`, not installed).
- Browser tool for future 6.0 probes: harness-native web tool or MCP browser server (e.g. `npm i -D @playwright/test && npx playwright install chromium`) so `manual-test.md` scenarios can run inside QC.

## Bug Context
No failing check, so no bug context. Escalated gate finding O1 (checked-task provenance, 69 issues) is recorded in Failure Index as a report item — bug-task migration infeasible at 6141/6144 bytes.

## Bug Tasks Generated
- None — no CRITICAL/ERROR/WARNING bug task; `tasks.md` unchanged: 34/34 `[X]`, 6141/6144 B, `parse-tasks` 0 errors.
