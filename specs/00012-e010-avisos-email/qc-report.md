# QC Report: Avisos por e-mail — envio opt-in por evento E010 (00012)

**Date**: 2026-10-11T22:26:12Z  
**Feature Directory**: specs/00012-e010-avisos-email  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full
- Prior Baseline: 9aaaf32c865adad44b69562a1f38122bd10dafb1 (re-sell pós-atestação; mesma baseline, bateria re-executada ao vivo)
- Changed Files: 1 (`specs/00012-e010-avisos-email/manual-test.md`, atestado humano)
- Test Selection: Full suite (unit, smoke e flutter inteiros)
- Scope Safety: re-sell single-workspace: atestado é o único delta, mas bateria e manifesto foram re-executados/recomputados por completo — nenhum escopo é inferido.

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED | **PASS** | atestado humano concluído (5/5 PASS) |
| Manual attestation | PENDING | **ATTESTED** (Amarildo de Lacerda, 2026-10-11T22:19:33Z) | MT-001..MT-005 todos PASS |
| unit (node --test) | 145/145 | 145/145 | 0 |
| smoke (test.sh) | 118/118 | 118/118 | 0 |
| flutter test | 24/24 | 24/24 | 0 |
| flutter analyze | 0 issues | 0 issues | 0 |
| npm audit (high) | 0 | 0 | 0 |
| node --check | 65/65 | 65/65 | 0 |
| Manifest digest manual-test.md | 05d1648ada5bdd9da376fabb90eb412bce41c4617078149b89300c0db07cf904 | 0da03ac586eb401ab7c1b4f485ddd9ef91e617a4c6d485e59c2c26976b2adef0 | atestado gravado |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Build check | PASSED | `docker compose config --quiet` OK; backend em execução |
| Unit tests | PASSED | `node --test` 145/145 (baseline ≥136; +9 da épica) |
| Smoke tests | PASSED | `backend/test.sh` 118/118 na porta 3199 |
| Flutter tests | PASSED | `flutter test` 24/24 (baseline 23 + 1 novo widget test) |
| Linting (required) | PASSED | `node --check` 65/65; `flutter analyze` 0 issues |
| Security (required) | PASSED | `npm audit --audit-level=high` 0 vulnerabilidades |
| Policy/PI compliance | PASSED | nenhum artefato viola project-instructions.md (CRITICAL = 0) |
| Requirements traceability | PASSED | 2/2 work items, 5/5 SC |
| Checklist spot-check | PASSED | 20/20 itens [Security]+[Testing] |
| Performance | PASSED | latência limitada ao timeout de 5 s assercionada (<4500 ms, T009) |
| Accessibility | SKIPPED | nenhum NFR de acessibilidade na spec |
| Browser runtime validation | PASSED (manual, atestado) | fallback manual validado por atestado humano 5/5 |
| Manual testing | PASSED — Attestation ATTESTED | [manual-test.md](manual-test.md): Amarildo de Lacerda, 2026-10-11T22:19:33Z, 5/5 PASS |

## Test Results — PASSED
- Runner 1: `node --test` (backend), Total: 145, Passed: 145, Failed: 0
- Runner 2: `bash backend/test.sh` (smoke HTTP), Total: 118, Passed: 118, Failed: 0
- Runner 3: `flutter test` (Docker), Total: 24, Passed: 24, Failed: 0

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|

## Code Coverage — SKIPPED
- Threshold: Not configured (`**Coverage Target**` vazio em `.github/sddp-config.md`)
- Status: SKIPPED (sem limiar — reportado, não bloqueia)

## Static Analysis — PASSED
- Tool: `node --check` (65 arquivos) + `flutter analyze` (Docker)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high`
- Vulnerabilities found: 0

## Project Instructions Compliance — PASSED
- No violations (gramáticas, tamanhos: spec 10135/10240 B, plan 8820/10240 B, tasks 4141/6144 B; IDs imutáveis; transição de checkbox apenas [ ]→[X]; 12 tarefas ≤40; 3 checklists ≤3).

## Requirements Traceability — 2/2 work items verified, 5/5 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (3/3 FR) | FR-001→T004, FR-002→T005, FR-003→T002/T006/T007 |
| US2 | Work Item | PASSED (3/3 FR) | FR-004→T003/T008, FR-005→T009, FR-006→T010 |
| SC-001 | Success Criteria | PASSED | 4 eventos com SMTP real: mensagens exatas + respostas 200/201 (email.test, tasks.test) + MT-001 atestado |
| SC-002 | Success Criteria | PASSED | 2ª varredura: `{swept:0,emitted:0,emailed:0,failed:0}` e mensagens inalteradas + MT-002 atestado |
| SC-003 | Success Criteria | PASSED | painel expõe sent/skipped/failed da janela atribuída; demais seções intactas + MT-003 atestado |
| SC-004 | Success Criteria | PASSED | modo inerte: 0 sessões TCP, rotas 200/201, sem erro + MT-004 atestado |
| SC-005 | Success Criteria | PASSED | host morto: sent:false <4500 ms, failed no painel, `swept ≥ emailed+failed` + MT-005 atestado |

## Traceability Gaps
- Nenhuma: FR-001..006 e SC-001..005 todos com task, evidência automatizada e (onde aplicável) atestado humano.

## Checklist Fulfillment — 20/20 spot-checked
- [CHL001 Security CHK001..CHK010 — PASSED — gate opt-in, guards admin/gestor, recipients já cadastrados, env-only config, notify sem propagação, inerte×falha distintos, escopo sem marketing, dedup, guards E005, sem dependências novas]
- [CHL003 Testing CHK001..CHK010 — PASSED — SC mensuráveis, RCM completo, SMTP fake real (`net.createServer`), porta fechada sem esperar 5 s, teardown de env, sequência de dedup, limiares numéricos 118/23/0, três estados testados, stubs N/A coerente com P2, US2 independente]
- CHL002 (API Quality): verificado na fase Checklist (10/10 [X]); superfície sem endpoint novo — consumo.

## Performance — PASSED (automated)
- FR-005/SC-005: latência adicional limitada ao timeout de 5 s — T009 asserciona falha em <4500 ms com host morto (ECONNREFUSED), sem esperar o timeout.

## Accessibility — SKIPPED
- Sem NFRs de acessibilidade na spec (nenhuma ocorrência de WCAG/aria/a11y).

## Browser Runtime Validation — PASSED (manual fallback attested)
- Mode: Manual fallback
- Browser tool: N/A (nenhuma ferramenta de navegador nativa nem servidor MCP de navegador exposto)
- App start: `docker compose up -d` (stack em execução)
- Target: `http://localhost/`
- Cenários: MT-001..MT-005 executados e atestado humano em [manual-test.md](manual-test.md) (5/5 PASS).

## Manual Testing — Required
- Plano: [manual-test.md](manual-test.md) — MT-001..MT-005
- Attestation: **ATTESTED** — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-11T22:19:33Z; 5/5 cenários PASS (parser `qc-evidence` OK).

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/routes/alerts.js | 0bd126ebced5da06e3ea1d8e902b6f5edc3aa0a8ab30b1b7fd1faa0120ed1d8d |
| backend/src/routes/alerts.test.js | 7cbb94324076fc409e0a34248b8db8fce82a05f042fb16da0f62a06c52a4fde6 |
| backend/src/routes/tasks.js | 2bd797870279ee96b6a9b67509066506ad845c53573398e7cc0e2f4e3d1cf01c |
| backend/src/routes/tasks.test.js | e9e2bd4f22b4b0f0872b362d08cf8fa49d5c6fcb56cccbd60a5a90c9c9160780 |
| backend/src/services/alerts.js | 29fcbcf52a5b68c480613898fe095ef266d674dcde667738bb202422e2000127 |
| backend/src/services/email.js | 488dae58d5d7d58cdfa72a221aef2a1c1ca5b11c060d3317043e03f7fd47f2e9 |
| backend/src/services/email.test.js | 79303466e5ccf1b02e1c202b841ba5340e1358f3423ecfcfa20bd8d4185624c1 |
| backend/test.sh | e5928ae8afcda22d3fc632339ddff56e33367c819e4bc908d81ce7b5734878b1 |
| frontend/lib/screens/vencimentos_screen.dart | 3c5bb4e88da901d945c6a4ecff6092183083214bb6f9b63d9362268ed1db2d8e |
| frontend/test/vencimentos_screen_test.dart | d66485b65e2a5a340a0728d33d45b8d0840d3be71909e040ff6071f3ad25bef6 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00012-e010-avisos-email/checklists/CHL001-security.md | 03d8091ae40f98925ec8ce726bafba79eec225fd2c9417ff8bd66c02cba9cf4b |
| specs/00012-e010-avisos-email/checklists/CHL002-api-quality.md | 96ac57d2a2a1d67c2ebc0ca6a6e46ae8dcc6db831445eb5138354e1fda624096 |
| specs/00012-e010-avisos-email/checklists/CHL003-testing.md | 1a1a4dc61a11560ab4602538d6ca879f938fe545e7bd21f8cd7e936c7acf4bb8 |
| specs/00012-e010-avisos-email/manual-test.md | 0da03ac586eb401ab7c1b4f485ddd9ef91e617a4c6d485e59c2c26976b2adef0 |
| specs/00012-e010-avisos-email/plan.md | d52ce3b89c0d9b0e73752775ee880de7236db35fd52238ea8e428dc0e73e680d |
| specs/00012-e010-avisos-email/spec.md | 23cb5af33bfeb5b056730cce07dc99da7c69b236a7e0cfc2699fed5705a9c5f9 |
| specs/00012-e010-avisos-email/tasks.md | 5ff57fc3d04225151311e49a0d7035f5dd5291f3ed4d8c442b33d77f85b257f9 |

## Tool Recommendations
- Coverage: configurar `**Coverage Target**` em `.github/sddp-config.md` se a política mudar (atual: vazio, não bloqueia).

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|

## Bug Tasks Generated
- None (nenhuma regressão; bateria completa nos valores de baseline pós-E010).

## Next Actions
- Quality Control passed — feature verified and ready for release or merge (E010 fecha as 10/10 épicas do release com QC-PASS).
- Commit quando o usuário pedir (nenhum commit nesta execução); rollup de release em `specs/project-plan.md` na onda 3/épicas concluídas.
