# QC Report: Contratos MVP (00001)

**Date**: 2026-10-11T14:05:00Z  
**Feature Directory**: specs/00001-contratos-mvp  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 26ff3f99008ee2e0b665e6f4376108aa1d0d5049
- Mode: Full
- Prior Baseline: N/A (prior report BLOCKED at attestation; digests stale after human edit of manual-test.md — full re-run required)
- Changed Files: N/A (full run)
- Test Selection: Full suite (unit, smoke, flutter, audit, syntax)
- Scope Safety: Prior evidence manifest no longer matched exact-byte digests (manual-test.md attested, backend files advanced by later epics E002–E009); only a full run can re-seal evidence.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Unit (backend node --test) | 79/79 | 115/115 | +36 (later-epic suites; no regression) |
| Smoke (backend/test.sh) | 84/84 | 118/118 | +34 (later-epic sections; no regression) |
| Flutter widget tests | 13/13 | 16/16 | +3 (later-epic tests; no regression) |
| Security audit (high) | 0 vulns | 0 vulns | 0 |
| Manual attestation | PENDING | ATTESTED | cleared by human verifier |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | 115/115, 0 fail (Node v24.18.1, backend stopped during run) |
| Smoke suite | PASSED | 118/118 (PORT=3199, backend/test.sh) |
| Flutter analyze | PASSED | "No issues found!" (SDK Docker ghcr.io/cirruslabs/flutter:stable, pub get in same invocation) |
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

## Requirements Traceability — 34/34 work items verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| T001–T034 | Work Items | PASSED | all `[X]` in tasks.md, 0 unchecked |
| Manual scenarios | Scenario Results | PASSED | all rows PASS in manual-test.md |

## Traceability Gaps
- None

## Checklist Fulfillment — SKIPPED
- No checklists directory in this Feature Workspace

## Performance — SKIPPED
- No performance NFRs in spec.md

## Accessibility — PASSED
- Covered by automated FR-027/FR-028 widget tests (web_browsers, a11y_labels) in the flutter suite

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED
- Mode: Manual fallback (human attestation)
- Browser tool: N/A (no browser tool exposed in this harness)
- Target: local app via docker compose
- Scenarios validated by human verifier: see manual-test.md

## Manual Testing — Required
- See [specs/00001-contratos-mvp/manual-test.md](manual-test.md)
- Attestation: ATTESTED — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-11T13:49:41Z; every Scenario Results row PASS

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| .github/sddp-config.md | 643a1aeeb889417f72050009a807a4869e4b526517262428997377203c47753d |
| backend/package-lock.json | f4806de0cbadddea7583bb1fd46dfdfa2a2e2188c50a15ccfe77e61c4d034962 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | f3853c151fecb800f2b2c3b1dd3d51cc8cbba9d450104f2245f3163f542b869c |
| backend/src/config/database.test.js | e73d448073479b8512e5b0ff28940c5143ab36c5850e9c84f94a8dec5acae134 |
| backend/src/config/opencode.js | e04b68cece645a75057bbf43307e77aee236f460c8f72b65a255c40023af8bac |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | ef73381f5457cbb0b339ad652522389bd24160e3ee2ab453a1010beb2fab5bae |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/middleware/upload.test.js | b691a831deb9208d404fa2fe6724dfce4c2fc31e4778d0b7bd28f1b1c0f08810 |
| backend/src/middleware/validate.js | 57afd3f9eac30f12fcc67f8ea67b3be3ac15b9199265495bd3b810a03dc80496 |
| backend/src/middleware/validate.test.js | 319e50b0badf4e8236aaedac61372455609a3b6b54e3c12d383656cef493dcef |
| backend/src/models/Contract.js | 3db01de874b8eda28749f0113d868dbc47de10d41698dbf1f380340f465d53ed |
| backend/src/models/Contract.test.js | 6db636d09582521eac546743fcd33efd2796e937e43718bef1a9757d94340497 |
| backend/src/models/ContractDefinition.js | 66226df76c435955e27d25391a65f245b047115571f8fddb0c0e2a01d0f27e50 |
| backend/src/models/ContractDefinition.test.js | 4bad5d63fdb3110751eb2d51579c2643b5ed51364dd0057ac69334f296236960 |
| backend/src/models/ExecutionPlan.js | 46892bfcf61b4fe10f50c8d4fb3bde7803e64e73da98605852b06a98c51761c6 |
| backend/src/models/ExecutionPlan.test.js | 3913ba7d76606842c5ff5ce0590b6f1d6c3538b88cdf57039a43f192caa1e958 |
| backend/src/models/History.js | 247b461cd1a6af92b13f7621e86f740f4c85ab49711cdd8b94755601927d2ed6 |
| backend/src/models/History.test.js | 97d794ba86211454764015a7b8c3ec2405c0e478f616c56264e50e45b699627f |
| backend/src/models/Task.js | 68c510d4312d86f77400b802641df0f2ad1ca373c0a81e80549917f6cb5bd6ee |
| backend/src/models/TaskSuggestion.js | 11c70bc315e44decb70f74984ff27670a94a7c683e7a21f3b6a14d38a7efd2c8 |
| backend/src/models/User.js | a2be454ee6bd6246a752ae02706637e16abefb5e05b7d64c5d66528c90d32023 |
| backend/src/routes/attachments.js | 857e945a6dab3a753c2127e9db112b1eed0d5c5d1cea183def43f47e8cd88428 |
| backend/src/routes/auth.js | 377eacc0f80ceb6e3e963b6f651c41b13afab928b260c5006dfe65c02ab1659b |
| backend/src/routes/auth.test.js | 9376b29fc9e77d2794210f4c1f4d9b9be36db1437b5aa73f85b863de79a1db62 |
| backend/src/routes/comments.js | cbdb7042aebe9347b24db52930fa639d43f1758cde00d494630523891fd37372 |
| backend/src/routes/comments.test.js | 3ae139b07a435e05554394e6c75e35508ccb43d00cdb10c99bb444c48ba4f1e5 |
| backend/src/routes/contracts.js | c3c4f032f9d63cac561a758b1ac14d3f341f80c6d467ca239df8e605888d87d6 |
| backend/src/routes/contracts.test.js | 04ea6dfffee5e55c7caf5b7ed1f9ce12024f978b94e7975c46cf1c55162dbb6a |
| backend/src/routes/dashboard.js | 4f32b24fab149566c515a7dea7d16c9f9ab1627c21d978b93bf9b44b4a61edbf |
| backend/src/routes/dashboard.test.js | b655fe514b627a785155d4bb72ab574ac28ca9af5e741279f856dea032b3df8b |
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
| backend/src/routes/search.test.js | 81785276addf1b9742e9ed54ad4f9240918213d6ddceead78bd2d978c47ff53c |
| backend/src/routes/suggestions.js | 00a561142e8a9d4078f7e4fd3370059c6d90a05b12cad7393483e01dab6d7b75 |
| backend/src/routes/suggestions.test.js | d851604c30584883101ba6aa95fdba198673fa80b5755998b2302c86245c8dcd |
| backend/src/routes/tasks.js | adfb8826f4f4051e85ed021f2b07dc31c5aa392466f1a1a29955242f13fa2592 |
| backend/src/routes/tasks.test.js | 63d333ff3bf80910b0a291eb665de784c5553d2df0f4ada63bb54c44295e73ce |
| backend/src/routes/uploads.test.js | 7d0552d9e75d9b771bfaf9f9d590e5b74fa966c97d9c756f69aa1b85b442a44d |
| backend/src/routes/users.js | 13cbbeea285897db9d7ef5f3845a21bbe25540033a357a92910d92dc909e96f5 |
| backend/src/routes/users.test.js | 5eb74f0ceb2c72feab6675c50c94b06cbc4433f705ffc1623b0727f222bddb34 |
| backend/src/routes/workflow.js | d2873e822bad195546a254eefa3e668586c5ba32bad382c28caa79788679f5ce |
| backend/src/routes/workflow.test.js | a50479f2771139267ea6e7994312027025f815757e265e11f2225ec4c0392407 |
| backend/src/server.js | 19e118041850d831e77125d01ff7ba65bab3ecbdadc673c7a39a3ae341bf089d |
| backend/src/server.socket.test.js | 345bfc4cb759cb6ef06413266a8f5738e55e707a9b3c703708c35be3c179efee |
| backend/src/server.test.js | da2e252498bf01ffa86679e2aa67e306ae44431fa746622c345be344805f58f2 |
| backend/src/services/email.js | 8355b554aca21163dcc618127c13c00d5a1d82fb8ff93cc941cd64e2cc25d1ae |
| backend/src/services/email.test.js | 11718095dc5d6d33f2ed38b63d141d50e1ae8d4080c089c4fc9bdb309af9c768 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/src/services/opencode.js | c9f39ae0ef9dc758e0715bc4dd8e232cb3e52d0fb0139d0884c95ccdfaa6e0e3 |
| backend/src/services/opencode.test.js | 01bf3ab27ec83d5104c7b21b4e0ba3cd32745e85f2f72b70448698a68915079a |
| backend/src/services/report.js | 5dcce20833d309ceccdf005187e1f5a4fc02b1830378d83f8d53a4d2985c59a4 |
| backend/src/services/report.test.js | ffb9cc8ed09de42cd4ff2886c0b9140bacca160dce2beae1f91607f8fad62229 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | cb252c287dbab4a8add5e4480726e57b1db575100f855de59cdb1d3689b62911 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/lib/main.dart | 1b4b5876ad8a36a271bfac4812ddd41b75e28801a28076dc50b592e9bc3d1397 |
| frontend/lib/models/contract.dart | 16ce202147aee5d1dfea40e993983fafb42b7f0423ac025c03ca7114389c9ae8 |
| frontend/lib/models/finalidade.dart | 372229ba59bd2439e1d8facb640ab22dfb3255e0ec26882bb74a2bd70c1a8e6d |
| frontend/lib/models/project.dart | 9568f3033c682b1704dd046dc675ae5885058321edf90a9c3aef0c476af756a8 |
| frontend/lib/models/task.dart | 209670535d0d5611254fc7deb3d16aa906a08a173c83b5cbb522e847d482035a |
| frontend/lib/models/user.dart | b9619602c4f770ddd082116917735d225b33bca1783e93cd462a4ca82b079ad5 |
| frontend/lib/screens/contract_detail_screen.dart | d4956f44a88f6cbf6c3b8815bcef185ee338f9f2039a8a73a85864dd8d72f22d |
| frontend/lib/screens/dashboard_screen.dart | 536782455544479e096dc600188f3aafae248294e32cc7557ce9673e8e32ac76 |
| frontend/lib/screens/domains_screen.dart | 84187efce1a3886888ac57de3489132426353c6ceeca1dad191958c1f67268d4 |
| frontend/lib/screens/finalidades_screen.dart | d90c5104e5cb3c623384a142b2480bd1aba7b8cd86442e9f0414bbb6ab8414c4 |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 920a2f61992f1a48f13ff2a18ebf2660eb790a9fcdf7eaa52a8f544f2f8076fd |
| frontend/lib/screens/tasks_screen.dart | 5a7f3004f1a83779f457b020ce6083664e57bebdcd330ce3a8c11edc0c784a14 |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 4c35294623378efa3d0949881a04e995841c1ed886ede1a904ed691782f504e0 |
| frontend/lib/theme/app_theme.dart | ba9a7a048a7f732d7285f575a1c60089a1092e36f6889695c8b44df089147dc9 |
| frontend/lib/widgets/suggestion_panel.dart | 20da4924981b5c3e5d5583d07c6abe664e505bd7d1456f4ce27335c1b8df06c8 |
| frontend/lib/widgets/task_list_tile.dart | b38cef95af9fbb9b182c45d647d40fe21d446ccedbe8bf9f4e5d3b60ea301bf7 |
| frontend/nginx.conf | 21e96e61d7a49ae0645a95b1b04ca9497b8e57559e6a82064c5f4809ff888853 |
| frontend/pubspec.yaml | 15495b09cdbf0286f2f1bdef52652e2f4246f254f6394f881e7515e4a3e843b8 |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/roles_nav_test.dart | b323627cc130fca86e9c1a7cdae5cbcab3826d20c940550ec517765ea8c8bafc |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| scripts/checklist-state.mjs | 872b76fcd87f2e03c98883fffb56f81c4bf1a20b3d0706922a480db0acc75f38 |
| scripts/derive-completion-state.mjs | 655dfd712b0a2e7a0656a08e26821d5f2dd86492ad666af6011bb3d9282edcb6 |
| scripts/parse-requirement-ownership.mjs | 10877e3b138e6f2ef53d6d2c91875dae7f8f9f89255c0f7131f1350d2c487f68 |
| scripts/parse-tasks.mjs | 3e550e85cdcbbf26533d527cd71bb59c38927bc239fbe555e4885969196daef5 |
| scripts/phase-gates.mjs | 546a924e4169b00e9db550f7e785725077706a5b1223d86026c8601bf98d455c |
| scripts/resolve-feature-dir.mjs | 2e5978f32281b85ec3fe07afa446aa4961457e161bf997ee3f1921f6e0db0e36 |
| scripts/validate-prd.mjs | d723649e71d0fc923a727c737d68b73f8913a738b954c394e9c5642c34fe1cee |
| scripts/validate-sad.mjs | 3127bd132df33ad807f90d8d8ef9dade218a3331c34b54cdc807b60853724885 |
| specs/00001-contratos-mvp/manual-test.md | 69e971501ff8a12ae7defd67c5fded1e434800178272f57fd1ad05bdb1d5f9e7 |
| specs/00001-contratos-mvp/plan.md | c62ceeec155974afb229ddbf3e5f663a9b97d77d88a929e13767196defae1b98 |
| specs/00001-contratos-mvp/spec.md | 3a4c3449eafb019a9c4d7afd247dcf4c5b42e4ff3b107a9cadf95814e075e4e8 |
| specs/00001-contratos-mvp/tasks.md | d33422b2243ebc7ff3b6d0e448b79874bd009079c253948f592be652f0ea0c19 |

## Tool Recommendations
- None

## Bug Tasks Generated
- None
