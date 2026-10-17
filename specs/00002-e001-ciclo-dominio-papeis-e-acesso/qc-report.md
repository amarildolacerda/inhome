# QC Report: Ciclo de domínio, papéis e acesso (E001)

**Date**: 2026-10-06T20:15:05Z  
**Feature Directory**: specs/00002-e001-ciclo-dominio-papeis-e-acesso  
**Overall Verdict**: PASS

QC check outcome: PASS. The human browser attestation landed (`manual-test.md`, `Status: ATTESTED`, 7/7 scenarios PASS), closing the only blocker from the previous run. All suites were re-executed fresh for this verdict, findings F-01..F-05 remain closed, and no new findings exist.

## QC Scope Baseline
- Baseline Commit: aa4b80e2579a6152298e2835f5da84b4b877933d
- Mode: Full
- Prior Baseline: aa4b80e2579a6152298e2835f5da84b4b877933d (previous QC run of 2026-10-06T11:10:01Z was itself a full run; only `manual-test.md` changed since, but the verdict requires fresh evidence, so every battery re-ran in full)
- Changed Files: 1 evidence file changed since the prior run (`specs/00002-e001-ciclo-dominio-papeis-e-acesso/manual-test.md`); repository background unchanged for this feature (28 tracked modifications from implementation remain; a new unrelated Feature Workspace `specs/00003-workflow-assistido-contrato/` appeared untracked and does not touch this feature's evidence)
- Test Selection: full suites (`npm --prefix backend test`, `bash backend/test.sh`, `/tmp/opencode/e2e-e001.sh`, `flutter analyze`, full `flutter test`) plus the 44-probe live battery
- Scope Safety: full re-run; no scoped selection was used for the final verdict.

## Changes from Prior Run
| Metric | Previous (2026-10-06T11:10:01Z) | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED (attestation pending) | PASS | blocker cleared |
| Browser attestation | PENDING | ATTESTED, 7/7 PASS | +7 |
| State-check issues | 5 (attestation only) | 0 | -5 |
| Unit tests | 51/51 | 51/51 (re-run) | — |
| Smoke `backend/test.sh` | 61/61 | 61/61 (re-run) | — |
| E2E checks | 28/28 | 28/28 (re-run) | — |
| Live probe battery | 44/44 | 44/44 (re-run) | — |
| `flutter analyze` | 0 issues | 0 issues (re-run) | — |
| `flutter test` | 11 passed, 2 skipped | 11 passed, 2 skipped (re-run) | — |
| npm audit (high) | 0 vulns | 0 vulns (re-run) | — |
| Evidence manifest | 45 rows, 1 stale (manual-test.md) | 45 rows, all current | fixed |
| Requirements verified | 9/9 FR, 5/5 SC (code) | 9/9 FR, 5/5 SC + human UI attestation | attestation added |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| `.completed` gate | PASSED at entry | `Completed: 2026-10-04T20:01:48Z` |
| Tasks gate | PASSED | 25/25 `[X]`, 0 unchecked, `tasks.md` 6126/6144 B, `parse-tasks` valid |
| Policy Auditor | PASS (inline) | subagent depth limit reached in this harness; auditor ran inline: sizes, grammar, required sections, phase structure conform; no CRITICAL violation |
| Unit tests | PASSED | 51/51, 0 fail, duration 52.4 s (Node 24.18.1; `docker compose stop backend` freed port 3001, restarted after, health 200) |
| Smoke `backend/test.sh` | PASSED | 61/61, incl. §15 unknown `domainId` → 401 |
| End-to-end 28 checks | PASSED | 28/28, incl. check 11 anonymous socket REFUSED and check 18 unknown domainId 401 |
| Flutter widget tests | PASSED | full `flutter test` in Docker: 11 passed, 2 skipped (pre-existing todos), 0 failed |
| Flutter static analysis | PASSED | `flutter analyze` → "No issues found!" |
| Live probe battery | PASSED | 44/44 (F-01 socket, F-02 login, F-04/FR-006 matrix, FR-005/FR-007 guards, F-05 conclusion) |
| Security dependency audit | PASSED | `npm audit --audit-level=high` → 0 vulnerabilities |
| Static analysis backend | PASSED | `node --check` on every non-test `backend/src/**/*.js` → 0 errors |
| Policy / PI compliance | PASSED | required categories (linting, security, unit tests) all executed; no violations |
| Requirements traceability | PASSED | 3/3 work items, 9/9 FR, 5/5 SC |
| Findings F-01..F-05 | CLOSED 5/5 | closure evidence per finding below |
| Browser attestation | ATTESTED | human verifier, 2026-10-06T20:07:45Z, 7/7 scenarios PASS |
| BUG task migration | N/A | no failures this run; `tasks.md` untouched |

## Test Results — PASSED
- Runner: `node --test 'src/**/*.test.js'` via `npm --prefix backend test` (Node 24.18.1). Total 51, Passed 51, Failed 0, duration 52.4 s. Includes the 5 socket-handshake tests (`backend/src/server.socket.test.js`) and the unknown-`domainId` login test. Port 3001 freed with `docker compose stop backend`, container started again after the run; health 200.
- Runner: `bash backend/test.sh`. Total 61, Passed 61, Failed 0.
- Runner: `/tmp/opencode/e2e-e001.sh` (outside the repository by AD-002, so it has no manifest row; its results are recorded here). Total 28, Passed 28, Failed 0, run fresh against the live stack. Checks 25-28 run `frontend/test/roles_nav_test.dart` in `ghcr.io/cirruslabs/flutter:stable`.
- Runner: full `flutter test` inside the Docker SDK image. 11 passed (4 `roles_nav`, 5 T023, 2 T025), 2 skipped pre-existing todos, 0 failed.
- Runner: live probe battery `/tmp/opencode/qc-probe-e001.cjs` against the running stack (API :3001, nginx :80). Total 44, Passed 44, Failed 0.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| F-01 | security-vuln | ERROR | backend/src/server.js:77 | anonymous `join_domain` received any domain's `task:updated` | T021 — CLOSED |
| F-02 | requirement-gap | ERROR | backend/src/routes/auth.js:91 | unknown `domainId` login answered 404 | T022 — CLOSED |
| F-03 | requirement-gap | ERROR | frontend/lib/widgets/task_list_tile.dart:103 | status-advance button shown to admin/gestor ended in 403 | T023 — CLOSED |
| F-04 | requirement-gap | ERROR | backend/src/routes/tasks.js:52 | README/draft matrix cells for status, prazo, concluir not applied | T024 — CLOSED (resolved as documentation alignment by user decision) |
| F-05 | requirement-gap | WARNING | frontend/lib/widgets/task_list_tile.dart:103 | prestador had no conclude-with-text path (400) | T025 — CLOSED |

### Closure evidence (re-confirmed this run)
- **F-01 / T021 — CLOSED.** Handshake `io.use` at `backend/src/server.js:76-100` verifies the JWT and derives the room from the token only. Live probe: anonymous connect → `connect_error: unauthorized`, 0 `task:updated` events while a task was created; domain B token `join_domain(domainA)` → `{"ok":false,"error":"Forbidden"}`; domain B socket received 0 of domain A's events while domain A's own socket received 1 (positive control). Regression tests: `backend/src/server.socket.test.js` (in 51/51), E2E check 11 (`REFUSED:unauthorized`).
- **F-02 / T022 — CLOSED.** `backend/src/routes/auth.js:92-95` maps `DOMAIN_NOT_FOUND` to 401 `Invalid credentials`. Probe rows `F-02 unknown domainId login status` = 401, body identical to wrong-password body; test.sh §15; unit test `auth.test.js:98`; E2E check 18. Matches spec.md §Edge Cases line 42.
- **F-03 / T023 — CLOSED.** `_canAdvance` (`task_list_tile.dart:66-70`) requires role `prestador` and assignee match; widget tests `T023 admin/gestor não recebe botão de avanço` plus linked/unlinked/unresolved cases green. Direct admin/gestor status PATCH still answers 403 in the probe, and the human attestation confirms no visible action reaches it (scenario 6 PASS).
- **F-04 / T024 — CLOSED (documentation alignment, user decision).** Evaluated against the CURRENT matrices: README.md:51 concluir ❌/❌/❌/só as suas; draft:73-74 status ❌/❌/❌/só suas, prazo ❌/✅/✅/❌, concluir ❌/❌/❌/só suas. Probe: status admin 403 / gestor 403 / linked prestador 200; prazo admin 200 / gestor 200 / prestador 403 / system_admin 403; concluir admin 403 / gestor 403 / linked prestador with text 200 / without text 400; reabrir prestador 403 / admin 200. All 16 matrix probe rows match the code.
- **F-05 / T025 — CLOSED.** `_cycleStatus` (`task_list_tile.dart:88-99`) collects text via `_askConclusionText()` before the PATCH and sends `body['text']`. Widget tests T025 (2 cases) green; live: conclude without text → 400, with text → 200. Human attestation confirms the dialog path in the browser (scenario 7 PASS).

## Code Coverage — SKIPPED
- Threshold: Not configured (`project-instructions.md` v2.1.0 leaves the coverage target empty; `.github/sddp-config.md` Coverage Target empty).
- Status: SKIPPED; the gate is the green suites (51 unit, 61 smoke, 28 E2E, 11 widget, 44 probes).

## Static Analysis — PASSED
- Tool: `node --check` (backend non-test sources), `flutter analyze` (frontend, Docker SDK).
- Critical issues: 0. Warnings: 0. Infos: 0 ("No issues found!").

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high` → 0 vulnerabilities.
- Tool: manual OWASP review of routes, guards, socket handshake and session handling (required by `project-instructions.md` for this repo).
- Prior findings F-01 (socket cross-domain push) and F-02 (login oracle via 404) are fixed; no new findings this run.
- `JWT_SECRET`: present in `backend/.env` (git-ignored), documented in `backend/.env.example:4`; no default fallback in code, so a missing secret gives login 500 and 403 on protected routes, as spec §Assumptions states. Observation: the value is a development-style secret; rotate before any non-local deployment. The plan restricts the stack to local use.
- `/uploads`: served without token at `backend/src/server.js:55` under the documented E001 exception; matches spec §Scope Excluded and §Assumptions. The accepted risk covers the API only.
- Deny by default: every business router opens with `authenticateToken` and lists roles per route. Verified live: no token → 401, malformed token → 403, system_admin on business routes → 403.
- Cross-domain isolation verified live in REST (domain B reads domain A contract → 404, no payload) and over the socket (0 leaked events).

## Project Instructions Compliance — PASSED
- Linting (required): `flutter analyze` executed → 0 issues; backend syntax via `node --check` → 0 errors.
- Security scanning (required): `npm audit --audit-level=high` executed → 0 vulnerabilities; manual OWASP review executed, prior findings closed, none new.
- Unit tests before promotion (required): 51/51 pass.
- Branching: work is on `dev`; no `main` promotion attempted.
- No `project-instructions.md` violation at any severity.

## Requirements Traceability — 3/3 work items, 9/9 requirements, 5/5 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (3/3 criteria) | login issues 24 h JWT with `role`/`domainId` (`middleware/auth.js:13`, `expiresIn: '24h'`); cycle preserves rows (test.sh §13, E2E 19-24); suspended session refused 403 with no data read (E2E 20-21, probe) |
| US2 | Work Item | PASSED (4/4 criteria) | prestador denied management routes (unit + smoke §14); domain B resource → 404 without content (E2E 8-9, probe); no token → 401 before any read (smoke §14, probe); admin on other-domain/cycle ops → 403 (smoke §14, probe) |
| US3 | Work Item | PASSED (2/2 criteria, human-attested) | nav per role proven by 4 widget checks (E2E 25-28); action gating proven by T023/T025 widget tests; browser scenarios 1-7 confirmed by the human attestation (2026-10-06T20:07:45Z) |
| FR-001 | Requirement | PASSED | `domains.js` single-operation enable; write failure → 500 and the record is never reused, asserted at `domains.test.js:161-186` |
| FR-002 | Requirement | PASSED | 24 h JWT with `role`+`domainId`; e-mail or username identifier; automatic role; unit `FR-002 JWT 24h e login` |
| FR-003 | Requirement | PASSED | `assertDomainActive` on login and every authenticated request; suspension flips status only; reactivation restores access with data intact (test.sh §13, E2E 19-24) |
| FR-004 | Requirement | PASSED | `requireSystemAdmin` on the cycle; system_admin refused on business routes (smoke §14, E2E 17, probe `prazo system_admin -> 403`) |
| FR-005 | Requirement | PASSED | 401 without token, 403 malformed/wrong key/wrong role, explicit role lists per route, deny by default; socket surface inside the same JWT boundary (probe + `server.socket.test.js`) |
| FR-006 | Requirement | PASSED | full four-role matrix matches the CURRENT README and draft (F-04 closure); `contracts.test.js:357` matrix test, smoke §14, and 16 live matrix probe rows |
| FR-007 | Requirement | PASSED | tenant always from token `domainId`; no route reads `domainId` from params/query/body; cross-domain id → 404 with no content (probe, E2E 8-9) |
| FR-008 | Requirement | PASSED | users CRUD admin-only writes with admin+gestor roster read; duplicate username → 409 without touching the existing row (`users.test.js:196`) |
| FR-009 | Requirement | PASSED | role resolved at login; nav and actions filtered per role; no visible action ends in 403 (`_canAdvance`, T023 tests; conclude dialog T025; human scenarios 1-3, 6-7 PASS) |
| SC-001 | Success Criteria | PASSED | two domains, enable → login → suspend → reactivate, live session refused: E2E checks 2-7, 19-24 |
| SC-002 | Success Criteria | PASSED | contracts, users and history intact after the cycle: test.sh §13, E2E 24 |
| SC-003 | Success Criteria | PASSED | 51/51 unit, 61/61 smoke, 28/28 E2E, 44/44 probes, incl. 401 without token and 403 for wrong role, wrong domain, invalid token |
| SC-004 | Success Criteria | PASSED | zero cross-domain data in REST (404, empty payload) and over sockets (0 leaked events, positive control received its own); human scenario 5 confirms no crossed data on screen |
| SC-005 | Success Criteria | PASSED (human-attested) | four roles open only their own navigation (4 widget checks + human scenarios 1-3) and no visible action ends in 403 (T023/T025 widget tests + human scenarios 6-7) |

## Traceability Gaps
- None. Prior gaps are closed: FR-009 action visibility has automated coverage (`frontend/test/task_list_tile_test.dart`); the WebSocket surface has task, guard and test (`server.socket.test.js`, E2E 11); matrix cells for status/prazo/concluir are probed live (16 rows).
- Recorded exclusions: `/tmp/opencode/e2e-e001.sh` lives outside the repository by AD-002, so it has no manifest row; its 28/28 result is recorded under Test Results. `backend/.env` is git-ignored and holds a secret; excluded by design.

## Checklist Fulfillment — 6 spot-checked, 6 PASSED
- CHL001 CHK001 — PASSED — spec states 401/403 for unknown domain, wrong password and suspended domain; implementation answers 401 (F-02 closed).
- CHL001 CHK006 — PASSED — domain status revalidated on every authenticated request and at login.
- CHL001 CHK023 — PASSED — `JWT_SECRET` assumption matches the code path and `.env.example`.
- CHL003 CHK015 — PASSED — "no visible action ending in 403" holds per role (T023 widget tests; human scenarios 6-7 PASS; F-03 closed).
- CHL003 CHK020 — PASSED — route-guard regression check covers the socket surface (`server.socket.test.js`, E2E 11); prior GAP resolved (F-01 closed).
- CHL003 CHK023 — PASSED — 401/403 negatives exist in unit, smoke and E2E suites.
- All three checklists are 100% checked (78 items, 0 unchecked).

## Performance — SKIPPED
- `spec.md` declares no performance NFR; no benchmark tooling was prompted.

## Accessibility — SKIPPED
- `spec.md` declares no accessibility NFR; no tooling was prompted.

## Browser Runtime Validation — PASSED
- Mode: Headless CLI supplement + human manual validation (attested)
- Browser tool: none. Probe 6.0 found no integration-native browser tool and no discoverable MCP browser tools; `BROWSER_RUNTIME_AVAILABLE = false`.
- App start: already running (`inhome-backend-1`, `inhome-frontend-1`; health 200; `http://localhost/` → 200)
- Target: http://localhost/
- Headless coverage: SPA served (E2E 1), navigation per role (E2E 25-28), action gating and conclude dialog (`task_list_tile_test.dart`), full HTTP flows (E2E 2-24), live probe battery (44 checks).
- Human browser coverage: 7 scenarios executed at `http://localhost/` against the rebuilt stack, attested 2026-10-06T20:07:45Z, all PASS (see Manual Testing).

## Manual Testing — Required
- `manual-test.md` attested by the human verifier: `- Status: ATTESTED`, `- Verifier: usuário do projeto (confirmação humana "passou" nesta sessão)`, `- Verified At (UTC): 2026-10-06T20:07:45Z`, `- Evidence: 7 cenários executados no navegador em http://localhost/ ...`. All 7 Scenario Results rows: PASS. The block matches every `scripts/lib/qc-evidence.mjs` attestation pattern (bullet form, parseable UTC timestamp, non-empty verifier and evidence).
- Attestation: ATTESTED — verified against the parser in this run; the previous run's five attestation issues are cleared.
- Observation (non-blocking): the "How to check" column of scenario 7 still narrates the pre-fix expectation ("Hoje (bug T025)"); the Scenario Results row records PASS for the corrected behavior, consistent with T025 being closed. The attestation block was left untouched.

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | 0efdfee5adc8a4f12fa855aa425021e9de9c31f843c1b89a43215e1e3f3ec43f |
| backend/.env.example | d713c0c89ce01f9ff5e34aebcf1f0f8c5d3e1b828ca8daa68f3d77d31f7cd752 |
| backend/package-lock.json | f4806de0cbadddea7583bb1fd46dfdfa2a2e2188c50a15ccfe77e61c4d034962 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | ef73381f5457cbb0b339ad652522389bd24160e3ee2ab453a1010beb2fab5bae |
| backend/src/routes/auth.js | 377eacc0f80ceb6e3e963b6f651c41b13afab928b260c5006dfe65c02ab1659b |
| backend/src/routes/auth.test.js | 9376b29fc9e77d2794210f4c1f4d9b9be36db1437b5aa73f85b863de79a1db62 |
| backend/src/routes/contracts.js | aef99e4e897d83be1e72eda31abf322cc4bba65b74e3d7dd6b2c1b22f721bbb5 |
| backend/src/routes/contracts.test.js | d3dc735f2b19d42b882c20c99a15bb3d29ec69d9308fd8d6fcbdf90ef19ddb44 |
| backend/src/routes/dashboard.js | d970452dbbaee48fc42aa9eb42b210b4fa6053ac2e1d51d98f0454ca1be5bacb |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/domains.test.js | 16ae3265b0ceb7fd9df5b22647e7e211c311eee928a3a0a1654da9091bb0cb60 |
| backend/src/routes/finalidades.js | 0211a4d952203894f4e5baa6b6c669e6cb3948eff772f7fa59626e028d9c861d |
| backend/src/routes/tasks.js | a78e7b6ec2b03ca0be443ca4dfcb9c23828ba59f1494ee18cb33278685d0d665 |
| backend/src/routes/users.js | c876001662f18f280c4eafb6ffb839d852cb1656fe4ce963d51aedea85fa205b |
| backend/src/routes/users.test.js | d4656587eb3267e9cf10e798612dfd12a006dba4b16d6631c1973fdad742e257 |
| backend/src/server.js | aef98350b0e901b95fa62e4681e26c695e7d234c9f29e561875e436a512b360e |
| backend/src/server.socket.test.js | 345bfc4cb759cb6ef06413266a8f5738e55e707a9b3c703708c35be3c179efee |
| backend/src/server.test.js | da2e252498bf01ffa86679e2aa67e306ae44431fa746622c345be344805f58f2 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/test.sh | 30d89c1c21992a50ccac56586936dca70a617be69e3cbb58ce1d6b9e22d929ac |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| docs/approved-scope-draft.md | beba604f22eb78e0a1afbd47ff2b8b6f6e552371051a01a7be68c210dfe321a2 |
| frontend/analysis_options.yaml | cc88073dea00345c800bf1f94021d3295cdd7fbd8b45a595a502a893304a5244 |
| frontend/lib/main.dart | f4c6481f669d33f0119ebc98a3572a1cf68046ce0ee9c667cf42dbbc8663a263 |
| frontend/lib/screens/contract_detail_screen.dart | 231b90584a19ae8e0df43506e44cb61b60483b652ef0538a4a225eabf3235d8e |
| frontend/lib/screens/finalidades_screen.dart | 4dec9e410c2425e901b4ae0303cea920c57698c043ee6e0ae5e96e094bbf1a8c |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 5d5c18113324992ccef5ed2f5cd39c0e997152ddd12487b4e79a203290831ef6 |
| frontend/lib/screens/tasks_screen.dart | 5a7f3004f1a83779f457b020ce6083664e57bebdcd330ce3a8c11edc0c784a14 |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 7fb65869ec8eb2746da21bd9faa8f2989719cfd838b30ab4605c8939a7d900c7 |
| frontend/lib/widgets/task_list_tile.dart | 03c810c3d1d63d40116d6834a040102a18d91c35f2ddcd57e84861234539b920 |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/checklists/CHL001-security.md | cb90f6319e7902385659d046085656491419696cd441d3fa2913257cfbc455bf |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/checklists/CHL002-api-quality.md | 121b487ef195c98da90c5ab161e1f51d7b5614b46b92c38b397f9f0d8ce0a54c |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/checklists/CHL003-testing.md | 6f0122a25096060f6378494d8b2a0e42eb4b028df28ea6ff3d5ad5a18ecd7ab4 |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/manual-test.md | 3320db5bf4ba54df7cc86605f698f23bace07d89202a5e2a925160827a1fa581 |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/plan.md | 8cc00b65f45c6545b15b1942c548756bc1f9a8516feca8ffd78d58dadba2e027 |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/spec.md | 8e53f45f7f2301433d7ea7aedb362522a71692cae2b5246c76bbc806be7e962b |
| specs/00002-e001-ciclo-dominio-papeis-e-acesso/tasks.md | 4315edc94865b6fcfcf8c401e8d62f37050b8db314d8aec6219e2c73ee8edfa1 |

## Tool Recommendations
- None. All required categories ran; the Flutter SDK is used from `ghcr.io/cirruslabs/flutter:stable` because no local SDK is installed (planned setup, not a skipped check).

## Bug Context
- None this run. Prior findings F-01..F-05 were converted to T021-T025; all five are `[X]` with closure evidence under Failure Index.

## Bug Tasks Generated
- None.
