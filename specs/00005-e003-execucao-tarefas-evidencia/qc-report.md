# QC Report: Execução de tarefas com evidência (E003 / 00005)

**Date**: 2026-10-09T22:35:00Z  
**Feature Directory**: specs/00005-e003-execucao-tarefas-evidencia  
**Overall Verdict**: BLOCKED

## QC Scope Baseline
- Baseline Commit: 26ff3f99008ee2e0b665e6f4376108aa1d0d5049
- Mode: Full
- Prior Baseline: N/A (no prior qc-report.md)
- Changed Files: N/A (full run; working tree carries E003 plus pre-existing uncommitted 00001/00004 work — untouched by this feature)
- Test Selection: Full suites (unit, smoke, Edge proxy, flutter, lint, audit)
- Scope Safety: first QC run for this workspace; only a full run can bind evidence digests.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit tests | PASSED | node --test, 104/104 (baseline 94 + 10 E003) |
| Smoke (backend/test.sh) | PASSED | 118/118 incl. §18 evidence flow |
| Edge proxy (test-uploads-proxy.sh) | PASSED | 5/5 — 200 + image/* via nginx :80 |
| Flutter analyze + tests | PASSED | analyze clean, 13/13 |
| Lint (node --check) | PASSED | all backend/src/**/*.js |
| Security audit | PASSED | npm audit --audit-level=high: 0 vulnerabilities |
| Policy Auditor | PASS | 0 CRITICAL violations vs project-instructions v2.1.0 |
| Story Verifier | PASSED | US1–US4 + SC-001..SC-004 traced |
| Checklist spot-check | PASSED | Security/Testing items from 3 checklists |
| Browser runtime / manual | BLOCKED | visual `/uploads` rendering needs human attestation |

## Test Results — PASSED
- Runner: node --test (unit), Total: 104, Passed: 104, Failed: 0
- Runner: backend/test.sh (smoke, PORT 3199), Total: 118, Passed: 118, Failed: 0
- Runner: backend/test-uploads-proxy.sh (Edge :80), Total: 5, Passed: 5, Failed: 0
- Runner: flutter test (Docker stable), Total: 13, Passed: 13, Failed: 0

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|

## Code Coverage — SKIPPED
- Threshold: Not configured (project instructions: coverage target empty)
- Status: SKIPPED — mandatory suites green serve as the quality bar.

## Static Analysis — PASSED
- Tool: node --check (backend), flutter analyze (frontend)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: npm audit --audit-level=high
- Vulnerabilities found: 0
- Route/isolation review (manual, mandated): pending human pass — recorded in manual-test.md scenarios 1–2.

## Project Instructions Compliance — PASSED
- No violations. dev branch, test-gated promotion, TODO.md read at session start, layout PRESERVE_EXISTING_LAYOUT (only plan-declared files added), stack unchanged, no new dependencies.

## Requirements Traceability — 4/4 work items verified, 3/4 SC verified (SC-003 automated part only)
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | FR-001..FR-004: flow/complete (updateTaskStatus, completeTask, markCompleted), 400 sem texto sem escrita, até 10 fotos antes da referência, comentário/anexo com autor e data |
| US2 | Work Item | PASSED | FR-005/FR-006: reabertura sem motivo → 400 sem escrita; admin/gravam autor/motivo/data no histórico |
| US3 | Work Item | PASSED | FR-007/FR-008: bloco `location ^~ /uploads/` Host+X-Real-IP no Edge; GET /uploads/<arquivo> → 200 image/* comprovado no stack nginx |
| US4 | Work Item | PASSED | FR-009..FR-011: validação tipo/tamanho antes do disco; `scopeDomain()` nos 3 roteadores → 403; `canSeeTask()` exportado e restrito |
| SC-001 | Success Criteria | PASSED | smoke §18: conclusão com texto+fotos, 400 sem texto sem rastro |
| SC-002 | Success Criteria | PASSED | smoke §18 + unit: reabertura grava autor/motivo/data; sem motivo não escreve |
| SC-003 | Success Criteria | PARTIAL | proxy Edge 5/5 automatizado; renderização visual no navegador exige attestation humana (manual-test.md cenário 1) |
| SC-004 | Success Criteria | PASSED | unit FR-009/FR-010/FR-011 + smoke §18: 400 sem resíduo, 403 de domínio cruzado |

## Traceability Gaps
- None: FR-001..FR-011 each have ≥1 completed task and a green per-requirement test or Edge check.

## Checklist Fulfillment — 3 checklists spot-checked
- CHL001 Security: guard de escopo antes de qualquer consulta (FR-010 403 read+write) — PASSED
- CHL001 Security: `/uploads` sem token com revisão fixada em 2026-12-26 e nomes opacos — PASSED (revisão humana pendente no manual-test)
- CHL002 API Quality: 400/403 fail-fast antes de escrita; asserções por requisito — PASSED
- CHL003 Data Integrity: arquivo gravado antes da referência (FR-003 assert em disco); recusa 400 sem resíduo (FR-009) — PASSED

## Performance — SKIPPED
- No performance NFRs in spec.

## Accessibility — SKIPPED
- No accessibility NFRs in this epic; existing a11y suite untouched (13/13).

## Browser Runtime Validation — MANUAL VERIFICATION NEEDED
- Mode: Manual fallback (no native or MCP browser tool exposed in this harness)
- Browser tool: N/A
- App start: docker compose up -d (Edge :80 already serving the rebuilt frontend image)
- Target: http://localhost/
- Automated substitutes executed: backend/test-uploads-proxy.sh (5/5) and smoke §18 /uploads static check (200 image/png). Visual inline rendering of a completed task's photos remains human-only.

## Manual Testing — Required
- Reference: [manual-test.md](manual-test.md)
- Attestation: PENDING (visual rendering, `/uploads` security review dated 2026-12-26, reopening history on screen)

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/middleware/auth.js | 34f61d0cd063ce68d69d2559299fe740f8175ee8fb166a0247f3f9156f46a561 |
| backend/src/middleware/upload.js | 7fd4ccd098e22eb9b33eae4b8903243546a4a548f71e0335bc5b1f5b34462f58 |
| backend/src/middleware/upload.test.js | b691a831deb9208d404fa2fe6724dfce4c2fc31e4778d0b7bd28f1b1c0f08810 |
| backend/src/routes/attachments.js | 857e945a6dab3a753c2127e9db112b1eed0d5c5d1cea183def43f47e8cd88428 |
| backend/src/routes/comments.js | cbdb7042aebe9347b24db52930fa639d43f1758cde00d494630523891fd37372 |
| backend/src/routes/comments.test.js | 3ae139b07a435e05554394e6c75e35508ccb43d00cdb10c99bb444c48ba4f1e5 |
| backend/src/routes/tasks.js | adfb8826f4f4051e85ed021f2b07dc31c5aa392466f1a1a29955242f13fa2592 |
| backend/src/routes/tasks.test.js | 63d333ff3bf80910b0a291eb665de784c5553d2df0f4ada63bb54c44295e73ce |
| backend/src/routes/uploads.test.js | 7d0552d9e75d9b771bfaf9f9d590e5b74fa966c97d9c756f69aa1b85b442a44d |
| backend/src/server.js | 19e118041850d831e77125d01ff7ba65bab3ecbdadc673c7a39a3ae341bf089d |
| backend/test-uploads-proxy.sh | b67e823c8c02b283e97c502c380c33cc0297172cec708f731eb8b11663330a59 |
| backend/test.sh | cb252c287dbab4a8add5e4480726e57b1db575100f855de59cdb1d3689b62911 |
| frontend/nginx.conf | 21e96e61d7a49ae0645a95b1b04ca9497b8e57559e6a82064c5f4809ff888853 |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| specs/00005-e003-execucao-tarefas-evidencia/checklists/CHL001-security.md | f9f076a73d346ba164e33c805bceef4b44c054bd40d8d28de589713b1d19c3a3 |
| specs/00005-e003-execucao-tarefas-evidencia/checklists/CHL002-api-quality.md | 9df4deb589ef0d5960c573b66fbaa76bb0fddb34e0fea268566fbc8e5224a7bc |
| specs/00005-e003-execucao-tarefas-evidencia/checklists/CHL003-data-integrity.md | 66dc1b89fdc238b018dcf92f534b5b30a556f397eda4546c54c910217b115682 |
| specs/00005-e003-execucao-tarefas-evidencia/manual-test.md | b1300ea246c4745e46cefba1b149e2f7d76c4377ec780b10eafdafa5a20f6000 |
| specs/00005-e003-execucao-tarefas-evidencia/plan.md | b92dd565dd8fd2c9a0db9e169a64d2943937891f45b5aa64fed99a378d46cb8f |
| specs/00005-e003-execucao-tarefas-evidencia/spec.md | 32fe089319f126f76851ab757941b9c12dda8f23d4bc66e1c2bc8e3453626481 |
| specs/00005-e003-execucao-tarefas-evidencia/tasks.md | 263b347d385e2c9967fc9bb9d91631aaea8ce6f8ba55d3488da7c0fe5214651f |

## Tool Recommendations
- None: all plan-configured tools (node --test, test.sh, proxy script, flutter analyze/test, node --check, npm audit) ran successfully.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|

## Bug Tasks Generated
- None. BLOCKED is solely the pending human attestation in [manual-test.md](manual-test.md); no bug task is added for that state.
