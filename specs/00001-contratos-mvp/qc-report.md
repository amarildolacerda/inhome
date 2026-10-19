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
| backend/src/config/database.js | 3a512b503312e7b487a5430f7c3e76f3ef64a342c3fd4c815590e1b6f57abbcf |
| backend/src/config/database.test.js | d60def5adba046bafb65744b630783f46ad48c322a9a13f595e4be7b5f9c0733 |
| backend/src/config/opencode.js | e04b68cece645a75057bbf43307e77aee236f460c8f72b65a255c40023af8bac |
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/auth.test.js | 0b846abe632750370727fcf4ded7dc960f7309c956a6b9b53e0b7603fa6517f1 |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/middleware/upload.test.js | b691a831deb9208d404fa2fe6724dfce4c2fc31e4778d0b7bd28f1b1c0f08810 |
| backend/src/middleware/validate.js | 57afd3f9eac30f12fcc67f8ea67b3be3ac15b9199265495bd3b810a03dc80496 |
| backend/src/middleware/validate.test.js | 8c54a3f83317334e1f9c5a8b959c605542e263ddd4da377825c850d6755130ad |
| backend/src/models/Contract.js | 3a1d41203c218de9950c1d0161eb73cee671b84507b02ed545400a07364be17c |
| backend/src/models/Contract.test.js | 6db636d09582521eac546743fcd33efd2796e937e43718bef1a9757d94340497 |
| backend/src/models/ContractDefinition.js | 66226df76c435955e27d25391a65f245b047115571f8fddb0c0e2a01d0f27e50 |
| backend/src/models/ContractDefinition.test.js | aee0e83175bc25b6ebaddfcb0e534303cd5c66eea1adcd719e7dbc81de91543f |
| backend/src/models/ExecutionPlan.js | ee6f2fdb410e0be07eafacc90d9bda5769c6aafb39286cb159a3cde417e7465b |
| backend/src/models/ExecutionPlan.test.js | e57227da3128f89c9ed7da37f0e33a305329b20c0cea7a1097fd39221c6f1875 |
| backend/src/models/History.js | 247b461cd1a6af92b13f7621e86f740f4c85ab49711cdd8b94755601927d2ed6 |
| backend/src/models/History.test.js | 6b98be5eb1a2af5e09b3e4ffbdbb5504436d859be83ea00f17ee11dc15656a61 |
| backend/src/models/Task.js | 7811b4b87161ce85ac4c5d7e40407384a79c4cc0175af983c679e82b221551d8 |
| backend/src/models/TaskSuggestion.js | 00af7d79432eb005d0704d884b636b8e34cfaa9bd9665183f4184d0479e85828 |
| backend/src/models/User.js | a2be454ee6bd6246a752ae02706637e16abefb5e05b7d64c5d66528c90d32023 |
| backend/src/routes/attachments.js | 07afcf5a7606f8c44d012108571d1da6a7fc30e2a6c44146d2971bcc1bf56441 |
| backend/src/routes/auth.js | 5074d09de75b4edd24e4fe84a312a18803d8a2a6ea9db266f343569a89190abb |
| backend/src/routes/auth.test.js | a0c7b75de67050fe81c953dab40beb3b16ed63edec154dfa6df4d49a3128144c |
| backend/src/routes/comments.js | 5bf836b7b471e63eb0b909eab25584969e31a75ee2d3befa927f2591c53bdb6e |
| backend/src/routes/comments.test.js | a70c0154823b62de8d34e15c2931482313e122c51adb8c0a9338ff80376dd81d |
| backend/src/routes/contracts.js | 8402af134728216e79f89d0e293c5afb07d42425d686f623ce4356db895538d2 |
| backend/src/routes/contracts.test.js | 96a7c15ab8f3987478ea8837140444d2a8d60c9fb39b9732dd4fdc060d8a8f7f |
| backend/src/routes/dashboard.js | b55e171d0758828762518efd492627dee36b4ba8f895ef2cc2a3bd817c7989f8 |
| backend/src/routes/dashboard.test.js | c42fa0efc8ffd1258d0c59875e9b980a2a74c6ae2e3014073116025ab4c9175a |
| backend/src/routes/definitions.js | f62541fc3660326f010d994b39ce624ce664d79d642af78678bddfb8443003a5 |
| backend/src/routes/definitions.test.js | a97365517e5d67eea498f293a0a9e1954836663844bf279f8785d6185183b9bd |
| backend/src/routes/domains.js | 212b3de98afcbdc5eb32fdd12da67729ce07dcebecefea278c040dd2c203f334 |
| backend/src/routes/domains.test.js | 1900091211adfd881f22955bb632e3200be4a097d5d16048590de9f87c39899a |
| backend/src/routes/executionPlan.js | d5e9cadf08ea3252903b768e5a61ee8c4ab29a3726f5ef738b09764abf876d3f |
| backend/src/routes/executionPlan.test.js | b71b88075cd4dd8edb11d2a27f36166a98d62f099c0d0d48a5883cdc8d453973 |
| backend/src/routes/finalidades.js | 0211a4d952203894f4e5baa6b6c669e6cb3948eff772f7fa59626e028d9c861d |
| backend/src/routes/finalidades.test.js | b3b06c512cf13ad41110319213cde375b9f7c575e84110d3ed5dd72ecaa6c46e |
| backend/src/routes/opencodeConfig.js | 46591a7e1b7228d1a82b73aa80418f01af77f60b6006f6ffb6dfc701206659f8 |
| backend/src/routes/review.js | a27eda56139d87b3c43b739cc13544cd5dcc8f4ac990b90c918113a9c591ed1b |
| backend/src/routes/review.test.js | 49772069fa53b6d16f6aff10be3f6e792dd2202834fd9a542c7dfc0da241fcd2 |
| backend/src/routes/search.js | 8ee8dc248ddfdec0c611702e0931f55cc98c8b54b2cfa2e888e40dbbcd7b7f09 |
| backend/src/routes/search.test.js | 7e8f5e6e40b1389af316f00f876ebe39553f687048d783ffb50a4e0ee747abb1 |
| backend/src/routes/suggestions.js | 4ca936e209581f0412dec5b3476c11b244f3288025df01de4f477ebc6f3e48e3 |
| backend/src/routes/suggestions.test.js | 5605823184ca30ff212570310ed1d7ae9c29a73b8551231805febe26fa1fa885 |
| backend/src/routes/tasks.js | e194c4919a5df5db15e5d4e16597b521ff589b35c7a59f93409f53fb27bd7f3e |
| backend/src/routes/tasks.test.js | c719a699ea89b0464541a16b05d58f486744d0ed0b5dea32e5fd4db22e2fb64c |
| backend/src/routes/uploads.test.js | 7d0552d9e75d9b771bfaf9f9d590e5b74fa966c97d9c756f69aa1b85b442a44d |
| backend/src/routes/users.js | c876001662f18f280c4eafb6ffb839d852cb1656fe4ce963d51aedea85fa205b |
| backend/src/routes/users.test.js | 805f337700e508e44a89d215094856dd577cf6887368746da659ac4d9e81578a |
| backend/src/routes/workflow.js | 4294822dced59d77d617b4cc360d5fdabf7b29e61151105f4a29f13ef4a37306 |
| backend/src/routes/workflow.test.js | 595a534bcd7ad69c4af0bb05b1f9ce66aead07b52a05a5c895c47e4da18aba9a |
| backend/src/server.js | c3d963494f21ba84ec433f513f2230d36d245b4e4b5833003b58248d0a55d6ce |
| backend/src/server.socket.test.js | ec1d61fa2f7d1e89c382d24e376a13d3848e8fb29b5257c9588aab4be1132478 |
| backend/src/server.test.js | 362fca1777f92aa76c9b206ca88921b42527d5627ecff022253b9ab5f9cc4582 |
| backend/src/services/email.js | 488dae58d5d7d58cdfa72a221aef2a1c1ca5b11c060d3317043e03f7fd47f2e9 |
| backend/src/services/email.test.js | 79303466e5ccf1b02e1c202b841ba5340e1358f3423ecfcfa20bd8d4185624c1 |
| backend/src/services/events.js | 4b816bbc42df57f274a21b6aab0671ad091a4ee69475af35fb34c9fcbb992edc |
| backend/src/services/opencode.js | c9f39ae0ef9dc758e0715bc4dd8e232cb3e52d0fb0139d0884c95ccdfaa6e0e3 |
| backend/src/services/opencode.test.js | bc46fc1d4ded74becfcce828b4c16b0cc9dab9952e5ad28fd97832e7b6307fe1 |
| backend/src/services/report.js | 524e561728a086fd66b1019ace16340ccbf7ae7d3611bcb89f80c653dd82003b |
| backend/src/services/report.test.js | acc4768c40918bdd541646c1c5484ea3c48ae9e0446598c660aac1c95b5ad316 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | e24235e13668608788b1111ee530e936223a2da04a4676e094a1015771c9f5f0 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/lib/main.dart | 396fa7a21cd1aedbe1bae19a01dda2eec76d1c0f4b126da1292f06b927cc223b |
| frontend/lib/models/contract.dart | 7da8ce63968754bcb15ed334a699bf697f50d7e81136eed6f497299e5b05d702 |
| frontend/lib/models/finalidade.dart | bc43d42fcc9538fa780f5fb8943106f6816521622ecbc1f68ca07666ab444b4f |
| frontend/lib/models/project.dart | 9568f3033c682b1704dd046dc675ae5885058321edf90a9c3aef0c476af756a8 |
| frontend/lib/models/task.dart | 808d230aa47c53227825f7dd6eae5128bf4fcedb45892514a8956aa6ea1583a7 |
| frontend/lib/models/user.dart | dbfc8d897f31bb375b17124f8cff8b575b2d176d1098f43adbd1a20ba9933719 |
| frontend/lib/screens/contract_detail_screen.dart | 231b90584a19ae8e0df43506e44cb61b60483b652ef0538a4a225eabf3235d8e |
| frontend/lib/screens/dashboard_screen.dart | 5d1a74658b716b186f8d206e2994abfa50abf425b4407ea85e5a765493ad0689 |
| frontend/lib/screens/domains_screen.dart | 84187efce1a3886888ac57de3489132426353c6ceeca1dad191958c1f67268d4 |
| frontend/lib/screens/finalidades_screen.dart | 4dec9e410c2425e901b4ae0303cea920c57698c043ee6e0ae5e96e094bbf1a8c |
| frontend/lib/screens/login_screen.dart | 6249ee56b1aea6565c1eaa1f593ab1a044b27fb8d286c17769f5fe85baeef2ec |
| frontend/lib/screens/projects_screen.dart | 5d5c18113324992ccef5ed2f5cd39c0e997152ddd12487b4e79a203290831ef6 |
| frontend/lib/screens/tasks_screen.dart | 4dfcdc63264e2fd7c66b2afa6b4289f0b4bd39c5598f6a244299b180c72b3f5c |
| frontend/lib/screens/users_screen.dart | b6cbe8a2bf38f6799bad3352bdc37c928ec8b664787abeabd82731dc71b6498b |
| frontend/lib/services/api_service.dart | 0ba38be669983573d26af1cd874c464dee2368f4f71e8acc9d8722076aa64bf9 |
| frontend/lib/theme/app_theme.dart | ba9a7a048a7f732d7285f575a1c60089a1092e36f6889695c8b44df089147dc9 |
| frontend/lib/widgets/suggestion_panel.dart | 20da4924981b5c3e5d5583d07c6abe664e505bd7d1456f4ce27335c1b8df06c8 |
| frontend/lib/widgets/task_list_tile.dart | fbd5318d1ab87022e3492a0779e3d303db3f258ae7d0d9cd44772d39f9da6992 |
| frontend/nginx.conf | 21e96e61d7a49ae0645a95b1b04ca9497b8e57559e6a82064c5f4809ff888853 |
| frontend/pubspec.yaml | 15495b09cdbf0286f2f1bdef52652e2f4246f254f6394f881e7515e4a3e843b8 |
| frontend/test/a11y_labels_test.dart | 14fb00a05e93deb256e3d749c831b9efc316be9c93bf4c1351724acfe77d793b |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| frontend/test/task_list_tile_test.dart | bb899f7c55674daad252c4b42ab3f70027d5c45df0f1130d5454db78e19a35a5 |
| frontend/test/web_browsers_test.dart | e850291f82c407e81a6c04b96ac293579199133f6fcf22d372ae2cdcb9743890 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
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
| specs/00001-contratos-mvp/spec.md | de9c3170b69bff062408eac6d79f4100cef4f66a53635a7e74dc1275df963290 |
| specs/00001-contratos-mvp/tasks.md | d33422b2243ebc7ff3b6d0e448b79874bd009079c253948f592be652f0ea0c19 |

## Tool Recommendations
- None

## Bug Tasks Generated
- None
